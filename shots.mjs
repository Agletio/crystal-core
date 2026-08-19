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
  'title', 'slots', 'pick', 'welcome', 'fissure',
  'dock', 'crystals', 'sheet', 'shop', 'stash', 'filter', 'history',
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

  // The dock alone: every other screen is a verb applied to it.
  await page.evaluate(() => document.getElementById('open-inventory')?.click());
  await page.waitForTimeout(250);
  await shoot('dock');

  // The three piles and the ledger, empty — which is how a new player meets
  // them. A rail button only ever OPENS, so each close id is named too.
  for (const [state, shut] of [
    ['shop', 'shop-close'],
    ['stash', 'stash-close'],
    ['filter', 'filter-close'],
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
      // Through the DOM, not the mouse: the box is anchored to a world point
      // and the camera is still easing after the walk across, so it never
      // holds still long enough for an actionability check to pass.
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
    problems.push(`${vp.name}: the first descent never met the Lampwright`);
  }

  // The skill web, at every depth. It is the one screen with a hundred things
  // on it and its own pan/zoom transform, which makes it the likeliest place
  // for something to end up drawn outside the box it lives in.
  // Abandon lands on the report now, so the way back to the menu is one more
  // click — the same one every other ending uses.
  await page.evaluate(() => document.querySelector('#run-abandon')?.click());
  await page.waitForTimeout(400);
  // The report every ending lands on. Nothing is closed first: the dock is
  // where a descent's loot now lands, so the report standing over an open one
  // IS the state, and the card lays itself out in what is left of the screen.
  await page.waitForTimeout(250);
  await shoot('results');
  await page.evaluate(() => document.getElementById('run-again')?.click());
  await page.waitForTimeout(300);
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
    document.querySelector('#welcome-skills .welcomecard')?.click();
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

  // The GRAFT bench, which no click reaches: it is the last beat of a room
  // somebody holds a relic for, so it costs a second cleared descent. The dev
  // kit carries a specimen, which IS the schedule.
  await page.evaluate(() => document.getElementById('open-inventory')?.click());
  await page.evaluate(() => document.querySelector('#run-launch')?.click());
  try {
    await page.waitForFunction(() => document.body.dataset.runPhase === 'scene', null, {
      timeout: 150000,
    });
    await page.waitForFunction(() => document.getElementById('speech')?.hidden === false, null, {
      timeout: 30000,
    });
    // Through the DOM: the bubble is anchored to a world point.
    for (let i = 0; i < 12; i++) {
      if (await page.evaluate(() => document.getElementById('graft')?.hidden === false)) break;
      await page.evaluate(() => document.getElementById('speech-next')?.click());
      await page.waitForTimeout(250);
    }
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
    problems.push(`${vp.name}: the second descent never reached a bench in a room`);
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
