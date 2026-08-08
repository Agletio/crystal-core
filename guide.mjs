/**
 * Plays the guided opening in a real browser, using only the mouse.
 *
 * The demo proves each step's `done` predicate CAN become true. This is the
 * other question: the opening locks the app down, so a step whose highlight is
 * not the thing you must click is a dead end no predicate can see. Clicking
 * only the ring, and failing when the guide stops advancing, is the only way to
 * answer "can a new player finish". Requires a current bundle.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { chromium } from 'playwright';

const root = dirname(fileURLToPath(import.meta.url));
const docs = join(root, 'docs');

if (!existsSync(join(docs, 'app.js'))) {
  console.error('guide: docs/app.js missing — run `npm run build` first');
  process.exit(1);
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
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

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });

const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(`${base}/index.html`, { waitUntil: 'load' });
await page.waitForTimeout(600);

// The one thing before the opening starts: choosing who you are.
await page.evaluate(() => {
  document.getElementById('welcome-name').value = 'Vespera';
  document.querySelectorAll('#welcome-skills .welcomecard')[0]?.click();
});
await page.waitForTimeout(700);

/** What the guide is showing and pointing at, right now. */
const state = () =>
  page.evaluate(() => {
    const card = document.getElementById('guide');
    if (!card || card.hidden) return { done: true };
    const ring = document.querySelector('.guide-on');
    return {
      done: false,
      step: document.getElementById('guide-step')?.textContent ?? '',
      text: document.getElementById('guide-text')?.textContent ?? '',
      ring: ring ? ring.id || ring.className : null,
      locked: document.body.classList.contains('guided'),
      // Nothing lit is only ever legitimate while the sim is doing the work.
      // Any other time it means the step is waiting on something no click can
      // cause — which is what a reload during the fight used to leave behind.
      phase: document.getElementById('run-results')?.hidden === false
        ? 'results'
        : document.getElementById('run-stagewrap')?.hidden === false
          ? 'running'
          : 'menu',
      // A modal over the lit control, while the lockdown holds that modal's
      // own Close switched off, is a room with no doors. The dock is never
      // covered — popups stop above it — so an overlap is always a trap.
      trapped: (() => {
        if (!ring) return null;
        const cards = [...document.querySelectorAll('.modal:not([hidden]) .modal__card')];
        for (const card of cards) {
          if (card.contains(ring)) continue;
          const a = ring.getBoundingClientRect();
          const b = card.getBoundingClientRect();
          const wide = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const tall = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (wide > 2 && tall > 2) return card.closest('.modal')?.id ?? 'a popup';
        }
        return null;
      })(),
    };
  });

const problems = [];
const trace = [];
let last = '';
let stuck = 0;
let reloaded = false;
let reloadedMidRun = false;
let dark = 0;
let escaped = false;

// Generous: a descent takes a while, and one step is "watch it happen".
for (let turn = 0; turn < 240; turn++) {
  const now = await state();
  if (now.done) break;

  if (now.step !== last) {
    trace.push(`${now.step}  ${now.text.slice(0, 62)}`);
    last = now.step;
    stuck = 0;
  } else {
    stuck++;
  }

  if (now.trapped) {
    problems.push(`${now.step}: ${now.trapped} covers the one thing you may click`);
    break;
  }
  // Nothing lit is only legitimate while the sim is doing the work. Anywhere
  // else it means the step waits on something no click can cause. The guide
  // repaints on a timer, so a tick or two of it is the phase changing under
  // the card rather than a dead end.
  dark = !now.ring && now.phase !== 'running' ? dark + 1 : 0;
  if (dark > 5) {
    problems.push(`${now.step}: nothing lit at phase ${now.phase} — ${now.text.slice(0, 60)}`);
    break;
  }

  // On the very first step, reload. The opening resumes from the save, and the
  // state it comes back into has to be one you can still play — this is the
  // harshest version of that, with the lit control out on the Fissure panel
  // where a popup would sit right on top of it.
  if (!reloaded && /step 1/i.test(now.step)) {
    reloaded = true;
    await page.reload();
    await page.waitForTimeout(900);
    const back = await state();
    trace.push(`Reload      resumed on ${back.step}, ring ${back.ring ?? 'none'}`);
    if (back.done) problems.push('a reload mid-opening dropped the guide entirely');
    if (back.trapped) problems.push(`a reload left ${back.trapped} over the lit control`);
    continue;
  }

  // And again mid-fight. A reload loses the run in progress, so the step that
  // ends on a clear comes back with nothing to clear — the exact way a player
  // got stuck with every button dead, New game included.
  if (!reloadedMidRun && /step 2/i.test(now.step) && !now.ring) {
    reloadedMidRun = true;
    await page.reload();
    await page.waitForTimeout(900);
    const back = await state();
    trace.push(`Reload      mid-fight, resumed on ${back.step}, ring ${back.ring ?? 'none'}`);
    if (back.done) problems.push('a reload mid-fight dropped the guide entirely');
    if (!back.ring) problems.push('a reload mid-fight left nothing to click');
    continue;
  }

  // Two minutes of clicking one ring without the step changing is a dead end.
  // The 'watch' step legitimately sits still, so this has to be generous.
  if (stuck > 120) {
    problems.push(`STUCK on ${now.step} — ring was ${now.ring}: ${now.text}`);
    break;
  }

  // Escape is the way out of a popup that has landed over the lit control, so
  // pressing it at a step that lives inside one must not end the opening.
  if (!escaped && /step 4/i.test(now.step)) {
    escaped = true;
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const back = await state();
    trace.push(`Escape      still on ${back.step}, ring ${back.ring ?? 'none'}`);
    if (back.done) problems.push('Escape during the opening ended it');
    continue;
  }

  if (!now.ring) {
    // A step with nothing to click is fine (the descent). Just wait.
    await page.waitForTimeout(500);
    continue;
  }

  // A real pointer: a programmatic .click() sails through the pointer-events
  // lock and proves nothing. A ring is either a control or a REGION, and the
  // centre of a region lands on whatever is there — for the dock, an empty
  // slot — so regions get their first live control instead.
  const isControl = await page.evaluate(() => {
    const ring = document.querySelector('.guide-on');
    return ring instanceof HTMLButtonElement;
  });
  const target = isControl
    ? page.locator('.guide-on').first()
    : page.locator('.guide-on button:not([disabled])').first();
  try {
    await target.click({ timeout: 1200 });
  } catch {
    /* nothing reachable this turn; the stuck counter will catch it */
  }
  await page.waitForTimeout(320);
}

const finished = (await state()).done;
if (!finished && problems.length === 0) {
  problems.push('ran out of turns without finishing');
}

// The opening is over, so the app is unlocked and the tree can be worked with
// a real pointer. A synthetic click lands on whatever element it is aimed at;
// only a real one goes through hit-testing, which is the half that broke when
// the map started capturing the pointer on the press.
if (finished) {
  await page.locator('#open-skills').click();
  await page.locator('#skills-cats .catcard:not([disabled])').first().click();
  await page.locator('#skills-list .skillrow').first().click();
  await page.waitForTimeout(300);
  for (let i = 0; i < 6; i++) await page.locator('#skills-devlevel').click();
  await page.waitForTimeout(200);

  const lit = () => page.locator('#skills-web .web__node--on').count();
  const before = await lit();
  const node = page.locator('#skills-web .web__node--open').first();
  const box = await node.boundingBox();
  try {
    await node.click({ timeout: 1500 });
  } catch {
    /* the count check below reports it */
  }
  await page.waitForTimeout(250);
  const after = await lit();
  if (after !== before + 1) {
    problems.push(`a pointer click on a node allocated ${after - before}, not 1`);
  }

  // And the other half: dragging the map is not a click on whatever the drag
  // started over.
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) {
      await page.mouse.move(box.x + box.width / 2 + i * 12, box.y + box.height / 2 + i * 6);
    }
    await page.mouse.up();
    await page.waitForTimeout(250);
    if ((await lit()) !== after) problems.push('dragging the map allocated a node');
  }
  trace.push('Tree        a real pointer allocates a node, and a drag does not');
}
if (errors.length) problems.push(`console errors — ${errors.slice(0, 2).join(' | ')}`);

console.log('guide: played the opening with a real pointer\n');
for (const line of trace) console.log(`  ${line}`);

await browser.close();
server.close();

if (problems.length) {
  console.error('\nguide: FAILED');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

// Report the LAST step reached, not how many were seen. A click can land as
// the guide is already advancing, so two steps occasionally pass between polls
// — the trace misses one while the player sailed through both. Counting
// observations made that read as "finished 8 of 9" on a run that finished.
const reached = trace.at(-1)?.match(/Step (\d+) of (\d+)/);
console.log(
  reached
    ? `\nguide: finished the opening — step ${reached[1]} of ${reached[2]}, clicking only what was lit`
    : '\nguide: finished the opening, clicking only what was lit'
);
