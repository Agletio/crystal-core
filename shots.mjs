/**
 * Renders the committed page in real Chromium and writes PNGs to shots/. jsdom
 * has no layout engine, so smoke cannot tell you the header is 34px wider than
 * a phone; this can.
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

/** The sizes worth having an opinion about. Phone first: it is the one that breaks. */
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
];

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
 * ON PURPOSE does not count — the dock is wider than a phone by design, and
 * flagging its contents would report the feature as the bug.
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

/**
 * Does the guide card sit on top of what it is telling you to click? `place()`
 * puts the card INSIDE a target big enough to hold it, which is how "click your
 * wand" ends up printed over the wand. Needs real layout.
 */
const guideProbe = () => {
  const card = document.getElementById('guide');
  if (!card || card.hidden) return null;
  const target = document.querySelector('.guide-on');
  if (!target) return null;

  const a = card.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  const x = Math.max(0, Math.min(a.right, t.right) - Math.max(a.left, t.left));
  const y = Math.max(0, Math.min(a.bottom, t.bottom) - Math.max(a.top, t.top));
  const covered = Math.round(x * y);
  return covered > 0 ? { covered, who: target.id || target.className } : null;
};

/**
 * With the opening running, is spending shut and everything else open?
 *
 * The lock is pure CSS, so nothing in jsdom can see it. elementFromPoint is
 * the honest test: it answers what a real click would actually hit.
 *
 * Both directions matter. A purchase that stays live can strand a new player
 * on the opening's gold; a door that does not is worse, because a step with
 * nothing lit then has no way out at all.
 */
const lockProbe = () => {
  if (!document.body.classList.contains('guided')) return null;
  const reaches = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0) return null;
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return hit === el || el.contains(hit);
  };

  const wrong = [];
  for (const el of document.querySelectorAll('.buy, #inv-currency .slot')) {
    if (el.closest('.guide-on')) continue;
    if (reaches(el)) wrong.push(`${el.id || el.className} spends and is live`);
  }
  // Only when the header is not under a popup, which is an ordinary state and
  // not the lock. The guide rings a Close when something is on top.
  if (!document.querySelector('.modal:not([hidden])')) {
    for (const id of ['open-shop', 'open-craft', 'open-character', 'dev-fresh']) {
      const el = document.getElementById(id);
      if (el && reaches(el) === false) wrong.push(`${id} is a door that will not open`);
    }
  }
  return wrong.length ? wrong : null;
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
    const leaks = await page.evaluate(lockProbe);
    if (leaks) {
      problems.push(`${vp.name}/${state}: the opening's lock is wrong — ${leaks.join('; ')}`);
    }
    const covering = await page.evaluate(guideProbe);
    if (covering) {
      problems.push(
        `${vp.name}/${state}: the guide covers ${covering.who} by ${covering.covered}px²`
      );
    }
  };

  await shoot('welcome');

  // Choosing a skill dismisses the welcome modal and drops you at the Fissure.
  // Blight, when it's on offer, because its poison field is the effect most
  // worth being able to see in a still.
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

  // And the run itself. A menu screenshot cannot show whether combat reads,
  // which is the half of the UI that actually moves.
  await page.evaluate(() => document.querySelector('#run-launch')?.click());
  await page.waitForTimeout(4500);
  await shoot('descent');

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
