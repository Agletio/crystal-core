/**
 * Plays the guided opening, in a real browser, using only the mouse.
 *
 * The demo already walks the steps headlessly and proves each one's `done`
 * predicate can become true. That is not the same question. The opening also
 * LOCKS THE APP DOWN — the highlighted element is the only thing a pointer can
 * reach — and a step whose highlight is not the thing you have to click is a
 * dead end no predicate can see. Exactly that shipped: the equip step ringed
 * the Weapon slot, clicking it lit up your gear in the dock, and the dock was
 * switched off because the ring was still on the slot. Nothing to click, no way
 * back, tutorial over.
 *
 * So this clicks what a player can click — the ringed element and nothing else
 * — and fails if the guide ever stops advancing. It is the only test that can
 * answer "can a new player finish", because it plays by the same rules they do.
 *
 * Requires a current bundle: npm run build && npm run guide
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
    };
  });

const problems = [];
const trace = [];
let last = '';
let stuck = 0;

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

  // Two minutes of clicking one ring without the step changing is a dead end.
  // The 'watch' step legitimately sits still, so this has to be generous.
  if (stuck > 120) {
    problems.push(`STUCK on ${now.step} — ring was ${now.ring}: ${now.text}`);
    break;
  }

  if (!now.ring) {
    // A step with nothing to click is fine (the descent). Just wait.
    await page.waitForTimeout(500);
    continue;
  }

  // The whole point: click the ring the way a player would, with a real
  // pointer. A programmatic .click() would sail straight through the
  // pointer-events lock and prove nothing.
  //
  // A ring is either a control or a REGION. Clicking the centre of a region
  // lands on whatever happens to be there — for the dock, an empty slot — and
  // succeeds while doing nothing at all, which reads as "stuck" for a reason
  // that is the harness's fault rather than the game's. So: a button gets
  // clicked, and anything else gets the first live control inside it, which is
  // what a player looking at a ringed panel actually does.
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
