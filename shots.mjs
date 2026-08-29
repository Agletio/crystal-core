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

/** Desktop only, by decision. */
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

/**
 * Does the window frame's INTERIOR reach its art? A 9-slice's border is
 * transparent wherever the art is thinner than the slice, and the world behind
 * shows through the difference — a 1px line along the top and a 4px one along
 * the bottom of every window, until the border was set to the art's own
 * thickness. Measured off the fixture rather than written down, so a
 * regenerated frame cannot quietly reopen it.
 */
const fitProbe = async () => {
  const card = document.querySelector('.modal:not([hidden]) .modal__card');
  if (!card) return null;
  const cs = getComputedStyle(card);
  const src = getComputedStyle(document.documentElement)
    .getPropertyValue('--fix-win').trim().replace(/^url\(["']?|["']?\)$/g, '');
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const a = (x, y) => d[(y * c.width + x) * 4 + 3];

  // Past the corner slices, which are solid and would swamp the reading.
  const SLICE = parseFloat(cs.borderImageSlice);
  const thinnest = (n, walk) => {
    let least = Infinity;
    for (let i = SLICE; i < n - SLICE; i++) least = Math.min(least, walk(i));
    return least;
  };
  const art = {
    Top: thinnest(c.width, (x) => { let t = 0; while (t < c.height && a(x, t) > 8) t++; return t; }),
    Bottom: thinnest(c.width, (x) => { let b = 0; while (b < c.height && a(x, c.height - 1 - b) > 8) b++; return b; }),
    Left: thinnest(c.height, (y) => { let l = 0; while (l < c.width && a(l, y) > 8) l++; return l; }),
    Right: thinnest(c.height, (y) => { let r = 0; while (r < c.width && a(c.width - 1 - r, y) > 8) r++; return r; }),
  };

  const off = Object.entries(art)
    .filter(([side, reach]) => parseFloat(cs[`border${side}Width`]) !== reach)
    .map(([side, reach]) => `${side.toLowerCase()} border ${cs[`border${side}Width`]} against ${reach}px of art`);
  return off.length ? `the window frame leaves a gap: ${off.join(', ')}` : null;
};

/** Can a drag still reach the map? It sits UNDER the shell, so a wrapper that
 *  forgets `pointer-events: none` kills the whole camera at once — and the page
 *  looks perfectly correct while it does. */
const mapProbe = () => {
  if (!document.body.classList.contains('mapfull')) return null;
  const stage = document.getElementById('run-stage');
  // A layer that deliberately STOPS you is not a wrapper that forgot: the
  // title and the cast stand over the camp, which the game now opens on.
  if (!stage || document.querySelector('.modal:not([hidden]), .title:not([hidden]), .pick:not([hidden])')) return null;
  // The camp is a PICTURE and the map is not drawn under it at all.
  if (document.getElementById('camp')?.hidden === false) return null;
  // The report covers the map on purpose: the descent it belongs to is over.
  if (document.getElementById('run-results')?.hidden === false) return null;
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

/** The HUD is deliberately pointer-TRANSPARENT so a drag over the bars still
 *  moves the map — so every leaf of it that takes a click or raises a hover has
 *  to hand the pointer BACK. One that does not is visible, looks correct, and
 *  does nothing at all. A window sitting over one is not that: what this
 *  catches is a leaf whose own pointer falls through to the map. */
const hudProbe = () => {
  if (!document.body.classList.contains('mapfull')) return null;
  const dead = [];
  for (const el of document.querySelectorAll('.skillslot, .debuff, .flask__use')) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const on = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const through = !on || on.id === 'run-canvas' || !!on.closest?.('#run-stage');
    if (through && !el.contains(on)) dead.push(el.id || el.className.split(' ')[0]);
  }
  return dead.length ? `falls through to the map: ${[...new Set(dead)].join(', ')}` : null;
};

/** EVERY screen the game has, as a CHECKLIST: a state here with no file at the
 *  end fails the run, so one nobody opened cannot quietly keep the old look. */
const STATES = [
  'title', 'slots', 'pick', 'welcome', 'camp', 'camp-hover', 'camp-lit', 'fissure',
  'dock', 'crystals', 'sheet', 'shop', 'stash', 'settings', 'history',
  'toast', 'itemmenu', 'confirm',
  'handover', 'descent', 'results',
  'scene', 'speech', 'lampwright',
  'skills', 'skill-list', 'skill-web', 'move-web', 'trade', 'trials',
  'bench', 'tooltip', 'glossary', 'graft',
];

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
    // A headless GPU warns about WebGL, and the webfonts are on a CDN an
    // offline runner cannot reach. Neither says anything about the app; a
    // same-origin failure (our own bundle) very much does.
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
    const mute = await page.evaluate(hudProbe);
    if (mute) problems.push(`${vp.name}/${state}: ${mute}`);
    const short = await page.evaluate(fitProbe);
    if (short) problems.push(`${vp.name}/${state}: ${short}`);
  };

  // The only screen that is a PICTURE: two worlds meeting on a front.
  await shoot('title');

  // A fresh browser goes title -> slots -> New game, so the slots are shot
  // where they are met rather than only from the rail.
  await page.evaluate(() => document.getElementById('title')?.click());
  await page.waitForTimeout(300);
  await shoot('slots');

  // Choosing a skill dismisses the welcome modal and drops you at the Fissure.
  // Blight, when it's on offer, because its poison field is the effect most
  // worth being able to see in a still.
  await page.evaluate(() => document.getElementById('save-play')?.click());
  await page.waitForTimeout(200);
  // Who you ARE comes before how you fight, so the cast is standing there
  // first — shot with one of them open, since a hall saying nothing is half
  // the screen.
  await page.evaluate(() => document.getElementById('pick-aethermancer')?.click());
  await page.waitForTimeout(250);
  await shoot('pick');
  await page.evaluate(() => document.getElementById('pick-take')?.click());
  await page.waitForTimeout(250);
  await shoot('welcome');
  await page.evaluate(() => document.getElementById('welcome-go')?.click());
  await page.waitForTimeout(700);
  // A trade brings its own skill now, so a shot that wants a particular one
  // swaps it the way a player does — through the shelf, then Equip.
  await page.evaluate(() => {
    document.getElementById('open-skills')?.click();
    for (const shelf of document.querySelectorAll('#skills-cats .catcard')) {
      shelf.click();
      const tile = [...document.querySelectorAll('#skills-list .skilltile')]
        .find((t) => /blight/i.test(t.textContent ?? ''));
      if (tile) return void tile.click();
    }
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('skills-equip')?.click());
  await page.waitForTimeout(200);
  await page.evaluate(() => document.getElementById('skills-close')?.click());
  await page.waitForTimeout(400);

  // THE SCREEN THE GAME OPENS ON, straight off the welcome — *"It should just
  // be you pick character/name/skill and land in the town."* No room in
  // between, and the weapon the skill wants is already in hand.
  await page.waitForFunction(() => document.getElementById('camp')?.hidden === false, null, {
    timeout: 30000,
  }).catch(() => problems.push(`${vp.name}: choosing a skill never landed in the camp`));
  await shoot('camp');
  // CLICKING THE CAMP, which is the whole of what makes it a place. The
  // hotspots are BUTTONS on the picture, so the sweep asks what is under each
  // one's own centre: a hotspot the shell covers hit-tests to something else.
  const buried = await page.evaluate(() => {
    const out = [];
    for (const b of document.querySelectorAll('.camp__hot')) {
      const r = b.getBoundingClientRect();
      const on = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (on !== b) out.push(b.id);
    }
    return out;
  });
  if (buried.length) problems.push(`${vp.name}: buried in the camp: ${buried.join(', ')}`);
  await page.hover('#camp-bench').catch(() => {});
  await page.waitForTimeout(300);
  await shoot('camp-hover');
  await page.evaluate(() => document.getElementById('tooltip')?.setAttribute('hidden', ''));

  // TALKING TO SOMEBODY IN THE CAMP. *"Then they can be in the camp and you
  // can just talk to them."* The gift is a schedule away — level 4 with every
  // point spent — so the dev menu owes one and puts him in the camp, and then
  // it is his body on the picture you click.
  await page.evaluate(() => document.getElementById('open-dev')?.click());
  await page.waitForTimeout(200);
  await page.evaluate(() => document.getElementById('dev-owe')?.click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('open-dev')?.click());
  await page.waitForTimeout(200);
  await page.evaluate(() => document.getElementById('dev-meet-workshop')?.click());
  await page.waitForTimeout(400);
  try {
    await page.click('#camp-who-workshop');
    await page.waitForTimeout(300);
    await page.evaluate(() => document.getElementById('parley-talk')?.click());
    await page.waitForFunction(() => document.getElementById('speech')?.hidden === false, null, {
      timeout: 10000,
    });
    await shoot('speech');
    // The BUTTON advances a beat, so this is the interaction rather than a
    // wait: bounded, because a bubble nobody can advance is the failure.
    for (let i = 0; i < 8; i++) {
      if (await page.evaluate(() => document.getElementById('met')?.hidden === false)) break;
      await page.evaluate(() => document.getElementById('speech-next')?.click());
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
    // Its OWN grid, whatever that is: a portrait is redrawn at whatever size
    // it needs, and pinning the number here fails on a better one.
    const square = /^0 0 (\d+) \1$/.exec(face?.box ?? '');
    if (face?.name !== 'face-lampwright' || !square || Number(square[1]) < 48) {
      problems.push(`${vp.name}: the panel is not showing a portrait — ${JSON.stringify(face)}`);
    }
    await page.evaluate(() => document.getElementById('met-take')?.click());
  } catch {
    problems.push(`${vp.name}: talking to the Lampwright in the camp never got to his panel`);
  }
  await page.waitForTimeout(400);
  await shoot('handover');
  // ON A PERSON. A hotspot draws nothing at all; what lights is the BODY's own
  // silhouette on the canvas under it, so this is the shot that judges it.
  await page.hover('#camp-who-workshop').catch(() => {});
  await page.waitForTimeout(400);
  await shoot('camp-lit');
  await page.evaluate(() => document.getElementById('tooltip')?.setAttribute('hidden', ''));

  // THE ARENA, the one room left, through the dev menu's own door.
  await page.evaluate(() => document.getElementById('open-dev')?.click());
  await page.waitForTimeout(200);
  await page.evaluate(() => document.getElementById('dev-room-answering_hall')?.click());
  try {
    await page.waitForFunction(() => document.body.dataset.runPhase === 'scene', null, {
      timeout: 30000,
    });
    await page.waitForTimeout(600);
    await shoot('scene');
  } catch {
    problems.push(`${vp.name}: the arena never opened`);
    await shoot('scene');
  }
  // 'Go back' is the way out of a room you walked to, and it is the same
  // button that returns you to camp from a descent; the fight itself is the
  // only way out of a room you bought with a key.
  await page.evaluate(() => document.getElementById('run-abandon')?.click());
  await page.waitForTimeout(600);

  // THE DESCENT. Nothing has been cleared yet, so the crack is the way in.
  await page.waitForFunction(() => document.getElementById('camp')?.hidden === false, null, {
    timeout: 60000,
  }).catch(() => problems.push(`${vp.name}: the room never came back to the camp`));
  await page.click('#camp-crack').catch(() => {});
  await page.waitForTimeout(300);
  if (await page.evaluate(() => document.getElementById('run-menu')?.hidden !== false)) {
    problems.push(`${vp.name}: clicking the crack never opened it`);
    await page.evaluate(() => document.getElementById('camp-crack')?.click());
    await page.waitForTimeout(250);
  }
  await shoot('fissure');
  // NOTHING ON THIS SCREEN SCROLLS — *"it needs to be designed in a way that
  // doesn't require you to scroll."* The map is sized off the room LEFT, so
  // anything that outgrows the fold is a layout fault rather than a long list.
  const spill = await page.evaluate(() => {
    const card = document.querySelector('#run-menu .modal__card');
    const body = document.querySelector('#run-menu .modal__body');
    const seam = document.querySelector('#run-menu .climbseam');
    if (!card || !body || !seam) return 'the Fissure has no body to measure';
    const box = card.getBoundingClientRect();
    const under = seam.getBoundingClientRect().bottom - box.bottom;
    const past = Math.max(body.scrollHeight - body.clientHeight, box.bottom - innerHeight, under);
    return past > 2 ? `the Fissure needs ${Math.round(past)}px of scrolling` : null;
  });
  if (spill) problems.push(`${vp.name}: ${spill}`);
  await page.evaluate(() => document.getElementById('run-launch')?.click());
  await page.waitForFunction(() => document.body.dataset.runPhase === 'running', null, {
    timeout: 30000,
  }).catch(() => problems.push(`${vp.name}: the Fissure never started a descent`));
  await page.waitForTimeout(4300);
  await shoot('descent');

  // Abandon lands on the report, the same one every ending uses.
  await page.evaluate(() => document.querySelector('#run-abandon')?.click());
  await page.waitForTimeout(400);
  // The report every ending lands on. Nothing is closed first: the dock is
  // where a descent's loot now lands, so the report standing over an open one
  // IS the state, and the card lays itself out in what is left of the screen.
  await shoot('results');
  await page.evaluate(() => document.getElementById('run-again')?.click());
  await page.waitForTimeout(400);
  // AND BACK TO THE CAMP, which every ending comes home to.
  if (await page.evaluate(() => document.getElementById('camp')?.hidden !== false)) {
    problems.push(`${vp.name}: the report did not come home to the camp`);
  }
  await page.evaluate(() => document.getElementById('camp-crack')?.click());
  await page.waitForTimeout(250);
  await page.evaluate(() => document.getElementById('run-menu-close')?.click());
  await page.waitForTimeout(200);

  // The collection. Nothing is in it yet on a fresh game, but the quest ladder
  // is text at full width, which is where a narrow screen tears.
  await page.evaluate(() => document.getElementById('open-crystals')?.click());
  await page.waitForTimeout(300);
  await shoot('crystals');
  await page.evaluate(() => document.getElementById('crystals-close')?.click());
  await page.waitForTimeout(200);

  // The dock alone: every other screen is a verb applied to it.
  await page.evaluate(() => document.getElementById('open-inventory')?.click());
  await page.waitForTimeout(250);
  await shoot('dock');

  // THE COUNTER IS A PERSON'S: the Lampwright's lines come first and the shelf
  // is what follows the last one, so this walks the beats a player clicks.
  await page.evaluate(() => {
    document.getElementById('camp-who-workshop')?.click();
    document.getElementById('parley-shop')?.click();
  });
  await page.waitForTimeout(400);
  if (await page.evaluate(() => document.getElementById('shop')?.hidden !== false)) {
    problems.push(`${vp.name}: the Lampwright never opened his shelf`);
  }
  await shoot('shop');
  await page.evaluate(() => document.getElementById('shop-close')?.click());
  await page.waitForTimeout(150);

  // The two piles and the ledger, empty — which is how a new player meets
  // them. A rail button only ever OPENS, so each close id is named too.
  for (const [state, shut] of [
    ['stash', 'stash-close'],
    ['settings', 'settings-close'],
    ['history', 'history-close'],
  ]) {
    await page.evaluate((id) => document.getElementById(id)?.click(), `open-${state}`);
    await page.waitForTimeout(250);
    await shoot(state);
    await page.evaluate((id) => document.getElementById(id)?.click(), shut);
    await page.waitForTimeout(150);
  }

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

  // The skill web, at every depth. It is the one screen with a hundred things
  // on it and its own pan/zoom transform, which makes it the likeliest place
  // for something to end up drawn outside the box it lives in.
  await page.evaluate(() => document.getElementById('open-skills')?.click());
  await page.waitForTimeout(300);
  await shoot('skills');

  await page.evaluate(() => {
    document.querySelector('#skills-cats .catcard:not([disabled])')?.click();
  });
  await page.waitForTimeout(250);
  // The middle depth, which Escape steps back to: a state, not a moment.
  await shoot('skill-list');
  await page.evaluate(() => {
    const rows = [...document.querySelectorAll('#skills-list .skilltile')];
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

  // The GLOSSARY is not a screen: a word is defined at the foot of the card it
  // appears on. DISPATCHED rather than hovered — a node sits in a panned SVG
  // under a modal head, so actionability keeps finding something else there.
  const worded = await page.evaluate(() => {
    const node = document.querySelector('#skills-web .web__node--notable');
    if (!node) return false;
    const box = node.getBoundingClientRect();
    node.dispatchEvent(
      new MouseEvent('mouseenter', {
        bubbles: true,
        clientX: box.left + box.width / 2,
        clientY: box.top + box.height / 2,
      })
    );
    return true;
  });
  await page.waitForTimeout(300);
  if (worded && (await page.evaluate(() => document.querySelector('.tip:not([hidden])') !== null))) {
    await shoot('glossary');
  } else {
    problems.push(`${vp.name}: no node card came up, so the glossary has no shot`);
  }
  await page.evaluate(() => {
    document.querySelector('#skills-web .web__node--notable')?.dispatchEvent(
      new MouseEvent('mouseleave', { bubbles: true })
    );
  });
  await page.waitForTimeout(120);

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

  // The trials: a ladder beside a web, which is the only screen putting a list
  // and a web side by side and so the only one where either can crowd the other.
  await page.evaluate(() => {
    document.getElementById('open-dev')?.click();
    document.getElementById('dev-trials')?.click();
    // The web is SHUT until the Fissure is whole, so the kit clears it first —
    // a screenshot of the gate is a screenshot of nothing being judged.
    document.getElementById('open-dev')?.click();
    document.getElementById('dev-climb-0')?.click();
    document.getElementById('open-trials')?.click();
    for (let i = 0; i < 3; i++) {
      const open = document.querySelector('#trials-web .web__node--open');
      if (!open) break;
      open.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });
  await page.waitForTimeout(300);
  await shoot('trials');
  await page.evaluate(() => document.getElementById('trials-close')?.click());

  // The bench, stocked. It is the widest thing in the game — a crystals
  // column, a worn column and the item — and the only screen where three
  // panels have to fit side by side.
  await page.evaluate(() => document.getElementById('open-dev')?.click());
  await page.waitForTimeout(150);
  await page.evaluate(() => document.getElementById('dev-kit')?.click());
  await page.waitForTimeout(250);
  // One of the two things that still stop you, and it paints a scrim.
  await shoot('confirm');
  await page.evaluate(() => document.getElementById('confirm-yes')?.click());
  await page.waitForTimeout(300);
  // A wipe is a new character, so it lands on the hall again — and the hall
  // covers the screen, which is what the real hover below would hit.
  await page.evaluate(() => document.getElementById('pick-aethermancer')?.click());
  await page.evaluate(() => document.getElementById('pick-take')?.click());
  await page.evaluate(() => {
    document.getElementById('welcome-name').value = 'Vespera';
    document.getElementById('welcome-go')?.click();
  });
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

  // The item MENU: the only route to the one thing a piece can do that cannot
  // be undone. Right-click, because a press-and-hold is a timer and a flake.
  await page.evaluate(() => document.getElementById('craft-close')?.click());
  await page.waitForTimeout(150);
  const piece = await page.$('#inv-gear .slot:not(.slot--empty)');
  if (piece) {
    await piece.click({ button: 'right' });
    await page.waitForTimeout(250);
    await shoot('itemmenu');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
  }

  // The TOAST is raised by exactly ONE thing — an equip, the single click that
  // changes what you wear and has to be reversible. `note()` goes to the
  // LEDGER and raises none, which is the trap.
  await page.evaluate(() => {
    document.getElementById('open-character')?.click();
    document.getElementById('slot-helmet')?.click();
    const wearable = [...document.querySelectorAll('#inv-gear .slot:not(.slot--empty)')].find(
      (b) => !b.disabled && !b.classList.contains('slot--off')
    );
    wearable?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  if (await page.evaluate(() => document.getElementById('toast')?.hidden === false)) {
    await shoot('toast');
  } else {
    problems.push(`${vp.name}: nothing said anything, so the toast has no shot`);
  }
  await page.evaluate(() => document.getElementById('sheet-close')?.click());
  await page.waitForTimeout(150);

  // The GRAFT bench, reached the one way there is: by clicking the man
  // standing in the camp and picking it off the list he puts up. The kit has
  // met him and carries what he wants, which is what offers the bench at all.
  await page.evaluate(() => document.getElementById('camp-who-ossuary')?.click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('parley-bench')?.click());
  try {
    await page.waitForFunction(() => document.getElementById('graft')?.hidden === false, null, {
      timeout: 5000,
    });
    await shoot('graft');
    // The bench is a BUBBLE anchored over a head, so it can be near an edge —
    // and it used to hold everything you were carrying, which at a full bag
    // ran off the side and pushed the lines and the button off the bottom.
    // Every control has to be on the card AND on the screen, or the bench can
    // be opened and never used.
    const lost = await page.evaluate(() => {
      const card = document.getElementById('graft-card')?.getBoundingClientRect();
      if (!card) return 'no card';
      const w = document.documentElement.clientWidth;
      const h = document.documentElement.clientHeight;
      const bad = [];
      // The pick LIST scrolls, so a row below its fold legitimately measures
      // past it — the box is what has to be on the card, and the two buttons.
      for (const el of [document.getElementById('graft-pieces'), document.getElementById('graft-do'), document.getElementById('graft-leave')]) {
        if (!el) continue;
        const r = el.getBoundingClientRect();
        const out =
          r.right > card.right + 1 ||
          r.left < card.left - 1 ||
          r.bottom > card.bottom + 1 ||
          r.top < card.top - 1;
        if (out) bad.push(`${el.id} off the card`);
        if (r.right > w || r.left < 0 || r.bottom > h || r.top < 0) bad.push(`${el.id} off the screen`);
      }
      return bad.length ? [...new Set(bad)].join(', ') : null;
    });
    if (lost) problems.push(`${vp.name}/graft: ${lost}`);
    // A kind has ONE line, so picking the PIECE is the whole choice: one click
    // has to arm the button, or the line reads as a list you did not notice.
    const armed = await page.evaluate(() => {
      const piece = [...document.querySelectorAll('#graft-pieces .slotcell__btn')].find((b) => !b.disabled);
      if (!piece) return 'nothing worn that he works on';
      piece.click();
      const go = document.getElementById('graft-do');
      const lines = document.querySelectorAll('#graft-lines .graft__line');
      if (go?.disabled) return 'one click on a piece does not arm the button';
      if (lines.length === 1 && lines[0].tagName !== 'DIV') return 'a line of one still renders as a pick';
      return null;
    });
    if (armed) problems.push(`${vp.name}/graft: ${armed}`);
  } catch {
    problems.push(`${vp.name}: talking to the Osteomancer never reached his bench`);
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

// A state nobody shot is a state nobody looked at.
for (const vp of VIEWPORTS) {
  const missing = STATES.filter((state) => !written.includes(`${vp.name}-${state}.png`));
  if (missing.length) problems.push(`${vp.name}: no shot of ${missing.join(', ')}`);
}

if (problems.length) {
  console.error('\nshots: FAILED');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log('\nshots: no overflow, no console errors');
