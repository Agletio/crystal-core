/**
 * Renders the committed page in real Chromium and writes PNGs to shots/. jsdom
 * has no layout engine, so smoke cannot tell you the header is 34px wider than
 * the window; this can.
 *
 * A guard, not just a camera: any element whose right edge lands past the
 * viewport fails the run. Requires a current bundle.
 */
import { createServer } from 'node:http';
import { readFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { chromium } from 'playwright';

const root = dirname(fileURLToPath(import.meta.url));
const docs = join(root, 'docs');
const outDir = join(root, 'shots');

if (!existsSync(join(docs, 'app.js'))) {
  console.error('shots: docs/app.js missing — run `npm run build` first');
  process.exit(1);
}

/** Desktop only, per `RULES.md`. Windows floating on a full-screen map mean
 *  nothing at 390px, so the phone viewport reported a layout nobody maintains;
 *  mobile returns as its own shell, and returns here. */
const VIEWPORTS = [{ name: 'desktop', width: 1280, height: 800 }];

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

// A three-line static server beats a dependency for serving two files.
const server = createServer(async (req, res) => {
  const path = join(docs, (req.url ?? '/').split('?')[0] === '/' ? 'index.html' : (req.url ?? '').slice(1));
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

/**
 * Right edge past the viewport. Content inside something that scrolls sideways
 * ON PURPOSE does not count — the dock scrolls sideways by design, and flagging
 * its contents would report the feature as the bug.
 */
const overflowProbe = () => {
  const cw = document.documentElement.clientWidth;

  const insideScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const x = getComputedStyle(p).overflowX;
      if (x === 'auto' || x === 'scroll') return true;
    }
    return false;
  };

  let worst = 0;
  let who = '';
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.right > cw + 0.5 && r.right > worst && !insideScroller(el)) {
      worst = r.right;
      who = el.className || el.tagName;
    }
  }
  return worst ? { past: Math.round(worst - cw), who: String(who).split(' ')[0] } : null;
};

/** Can a drag still reach the map? It sits UNDER the shell, so a wrapper that
 *  forgets `pointer-events: none` kills the whole camera at once — and the page
 *  looks perfectly correct while it does. */
const mapProbe = () => {
  if (!document.body.classList.contains('mapfull')) return null;
  const stage = document.getElementById('run-stage');
  if (!stage || document.querySelector('.modal:not([hidden])')) return null;
  const w = document.documentElement.clientWidth;
  const h = document.documentElement.clientHeight;
  const spots = [
    [w * 0.5, h * 0.35],
    [w * 0.62, h * 0.55],
    [w * 0.42, h * 0.62],
  ];
  const reached = spots.some(([x, y]) => stage.contains(document.elementFromPoint(x, y)));
  return reached ? null : 'the map takes no pointer — drag, zoom and follow are dead';
};

const browser = await chromium.launch();
const problems = [];
const written = [];

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    // A headless GPU warns about WebGL, and the webfonts are on a CDN that a
    // sandboxed or offline runner cannot reach. Neither says anything about
    // the app; a same-origin failure (our own bundle) very much does.
    if (/WebGL|GPU/i.test(m.text())) return;
    const from = m.location()?.url ?? '';
    if (from && !from.startsWith(base)) return;
    errors.push(m.text());
  });

  await page.goto(`${base}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  // Two states worth seeing: what a new player lands on, and the screen they
  // spend the game in. A shot of only the welcome modal hides the whole app.
  const shoot = async (state) => {
    const file = `${vp.name}-${state}.png`;
    await page.screenshot({ path: join(outDir, file) });
    written.push(file);
    const over = await page.evaluate(overflowProbe);
    if (over) problems.push(`${vp.name}/${state}: .${over.who} overflows by ${over.past}px`);
    const deaf = await page.evaluate(mapProbe);
    if (deaf) problems.push(`${vp.name}/${state}: ${deaf}`);
  };

  await shoot('welcome');

  // Choosing a skill dismisses the welcome modal and drops you at the Fissure.
  // Blight, when it's on offer, because its poison field is the effect most
  // worth being able to see in a still.
  await page.evaluate(() => document.getElementById('title')?.click());
  await page.evaluate(() => document.getElementById('save-play')?.click());
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#welcome-skills .welcomecard')];
    const blight = cards.find((c) => /blight/i.test(c.textContent ?? ''));
    (blight ?? cards[0])?.click();
  });
  await page.waitForTimeout(700);
  await shoot('fissure');

  // The collection. Nothing is in it yet on a fresh game, but the quest ladder
  // is text at full width, which is where a narrow screen tears.
  await page.evaluate(() => document.getElementById('open-crystals')?.click());
  await page.waitForTimeout(300);
  await shoot('crystals');
  await page.evaluate(() => document.getElementById('crystals-close')?.click());
  await page.waitForTimeout(200);

  // The sheet, with points waiting. Four rows of name, count, button and a
  // stat sentence is where a narrow column tears, and the narrow viewport
  // stacks the columns, so they are scrolled to rather than shot blind.
  await page.evaluate(() => {
    document.getElementById('open-character')?.click();
    for (let i = 0; i < 3; i++) document.getElementById('sheet-devlevel')?.click();
    document.getElementById('sheet-attrs')?.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(300);
  await shoot('sheet');
  await page.evaluate(() => document.getElementById('sheet-close')?.click());
  await page.waitForTimeout(200);

  // Three slot rows, each with a name, a level, an age and two buttons. The
  // narrow screen is where a row like that stops fitting on one line.
  await page.evaluate(() => document.getElementById('open-save')?.click());
  await page.waitForTimeout(300);
  await shoot('slots');
  await page.evaluate(() => document.getElementById('save-close')?.click());
  await page.waitForTimeout(200);

  // The sandbox: generated bodies on a generated floor, and the one screen in
  // the game whose whole point is being LOOKED at. Before the descent, because
  // it leaves nothing behind — nothing in it dies and nothing is banked.
  await page.evaluate(() => document.getElementById('dev-sandbox')?.click());
  await page.waitForTimeout(2500);
  for (let i = 0; i < 9; i++) await page.mouse.wheel(0, -120);
  await page.waitForTimeout(600);
  if ((await page.evaluate(() => document.body.dataset.runPhase)) !== 'scene') {
    problems.push(`${vp.name}: the sandbox button did not open a room`);
  }
  await shoot('sandbox');
  await page.evaluate(() => document.getElementById('run-abandon')?.click());
  await page.waitForTimeout(300);

  // And the run itself. A menu screenshot cannot show whether combat reads,
  // which is the half of the UI that actually moves.
  // The handover, caught in the middle: the hero climbing out of the entrance
  // with the dark still receding. It plays on every launch, so the first
  // moments of a descent ARE it.
  await page.evaluate(() => document.querySelector('#run-launch')?.click());
  await page.waitForTimeout(180);
  await shoot('handover');

  await page.waitForTimeout(4300);
  await shoot('descent');

  // The Lampwright, at the END of a cleared descent and after the walk across
  // to him: the wait covers a whole descent, and Blight takes a minute over
  // one. The ROOM first, then a line over his head, then what he is holding.
  try {
    await page.waitForFunction(() => document.body.dataset.runPhase === 'scene', null, {
      timeout: 120000,
    });
    await shoot('scene');
    await page.waitForFunction(() => document.getElementById('speech')?.hidden === false, null, {
      timeout: 30000,
    });
    await shoot('speech');
    // The BUTTON advances a beat, so this is the interaction rather than a
    // wait: bounded, because a bubble nobody can advance is the failure.
    for (let i = 0; i < 8; i++) {
      if (await page.evaluate(() => document.getElementById('met')?.hidden === false)) break;
      await page.locator('#speech-next').click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(250);
    }
    await page.waitForFunction(() => document.getElementById('met')?.hidden === false, null, {
      timeout: 5000,
    });
    await shoot('lampwright');
    // A FACE, at its own grid. A map sprite blown up is a silhouette, and this
    // is the only place in the game anybody is looked at rather than fought.
    const face = await page.evaluate(() => {
      const svg = document.querySelector('#met-face svg');
      return svg ? { name: svg.getAttribute('data-sprite'), box: svg.getAttribute('viewBox') } : null;
    });
    if (face?.name !== 'face-lampwright' || face?.box !== '0 0 48 48') {
      problems.push(`${vp.name}: the panel is not showing a portrait — ${JSON.stringify(face)}`);
    }
    await page.evaluate(() => document.getElementById('met-take')?.click());
  } catch {
    problems.push(`${vp.name}: the first descent never met the Lampwright`);
  }

  // The skill web, at every depth. It is the one screen with a hundred things
  // on it and its own pan/zoom transform, which makes it the likeliest place
  // for something to end up drawn outside the box it lives in.
  // Abandon lands on the report now, so the way back to the menu is one more
  // click — the same one every other ending uses.
  await page.evaluate(() => document.querySelector('#run-abandon')?.click());
  await page.waitForTimeout(200);
  await page.evaluate(() => document.getElementById('run-again')?.click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('open-skills')?.click());
  await page.waitForTimeout(300);
  await shoot('skills');

  await page.evaluate(() => {
    document.querySelector('#skills-cats .catcard:not([disabled])')?.click();
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#skills-list .skillrow')];
    (rows.find((r) => /Fireball/.test(r.textContent ?? '')) ?? rows[0])?.click();
  });
  await page.waitForTimeout(400);
  // Points in it, so the shot shows a build rather than an empty lattice.
  await page.evaluate(() => {
    for (let i = 0; i < 12; i++) document.getElementById('skills-devlevel')?.click();
    for (let i = 0; i < 12; i++) {
      const open = document.querySelector('#skills-web .web__node--open');
      if (!open) break;
      open.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });
  await page.waitForTimeout(300);
  await shoot('skill-web');

  // A MOVEMENT web, walked to its budget. Nine nodes against a hundred and
  // twelve is the case a layout written for the big one gets wrong: a web that
  // fits on screen at the home zoom, with two of its three arms bought.
  await page.evaluate(() => {
    document.getElementById('skills-back')?.click();
    document.getElementById('skills-back')?.click();
    const cats = [...document.querySelectorAll('#skills-cats .catcard')];
    cats.find((c) => /Movement/.test(c.textContent ?? ''))?.click();
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#skills-list .skillrow')];
    (rows.find((r) => /Leap/.test(r.textContent ?? '')) ?? rows[0])?.click();
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    for (let i = 0; i < 8; i++) document.getElementById('skills-devlevel')?.click();
    for (let i = 0; i < 8; i++) {
      const open = document.querySelector('#skills-web .web__node--open');
      if (!open) break;
      open.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    document.getElementById('skills-fit')?.click();
  });
  await page.waitForTimeout(300);
  await shoot('move-web');

  // The trade, walked. Two picker cards over a web drawn to fit is a tall
  // stack, and the web is the part with nothing to scroll it.
  await page.evaluate(() => document.getElementById('skills-close')?.click());
  await page.evaluate(() => {
    document.getElementById('open-character')?.click();
    for (let i = 0; i < 24; i++) document.getElementById('sheet-devlevel')?.click();
    document.getElementById('sheet-close')?.click();
    document.getElementById('open-trade')?.click();
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    document.getElementById('trade-pick-aethermancer')?.click();
    for (let i = 0; i < 10; i++) {
      const open = document.querySelector('#trade-web .web__node--open');
      if (!open) break;
      open.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });
  await page.waitForTimeout(300);
  await shoot('trade');
  await page.evaluate(() => document.getElementById('trade-close')?.click());

  // The bench, stocked. It is the widest thing in the game — a crystals
  // column, a worn column and the item — and the only screen where three
  // panels have to fit side by side.
  await page.evaluate(() => document.getElementById('dev-kit')?.click());
  await page.evaluate(() => document.getElementById('confirm-yes')?.click());
  await page.waitForTimeout(500);
  // The tooltip below is a REAL hover, which a hidden slot refuses.
  await page.evaluate(() => document.getElementById('open-inventory')?.click());
  await page.evaluate(() => {
    document.getElementById('open-craft')?.click();
    const first = document.querySelector('#craft-crystals .wornslot');
    first?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  await shoot('bench');

  // An item tooltip, on a piece with something rolled on it — the densest
  // thing the game draws, and the one most likely to run off the edge. A blank
  // piece would show none of the grouping this shot exists to check.
  await page.evaluate(() => {
    const piece = document.querySelector('#inv-gear .slot:not(.slot--empty)');
    piece?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    for (let i = 0; i < 6; i++) {
      const making = [...document.querySelectorAll('#inv-currency .slot')].find((b) =>
        /Making/.test(b.getAttribute('aria-label') ?? '')
      );
      if (!making || making.disabled) break;
      making.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });
  await page.waitForTimeout(200);
  const modded = await page.$('#inv-gear .slot--modded');
  if (modded) {
    await modded.hover();
    await page.waitForTimeout(200);
    await shoot('tooltip');
  }

  const spilled = await page.evaluate(() => {
    const wrap = document.querySelector('.webwrap')?.getBoundingClientRect();
    const svg = document.getElementById('skills-web')?.getBoundingClientRect();
    if (!wrap || !svg) return 'no web on screen';
    // The transform lives inside the SVG, so nothing it draws may ever change
    // the size of the box around it.
    return svg.width > wrap.width + 1 || svg.height > wrap.height + 1
      ? `web ${Math.round(svg.width)}x${Math.round(svg.height)} in ${Math.round(wrap.width)}x${Math.round(wrap.height)}`
      : null;
  });
  if (spilled) problems.push(`${vp.name}/skill-web: ${spilled}`);

  if (errors.length) problems.push(`${vp.name}: console errors — ${errors.slice(0, 2).join(' | ')}`);
  await page.close();
}

await browser.close();
server.close();

console.log(`shots: wrote ${written.length} to shots/`);
for (const f of written) console.log(`  ${f}`);

if (problems.length) {
  console.error('\nshots: FAILED');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log('\nshots: no overflow, no console errors');
