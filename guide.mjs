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
    const phaseNow = document.getElementById('run-results')?.hidden === false
      ? 'results'
      : document.getElementById('run-stagewrap')?.hidden === false
        ? 'running'
        : 'menu';
    // Dormant is not finished. The card is down and the lockdown is off while
    // the opening waits for a level or a crystal to grow, and the only thing
    // that says so from out here is the attribute the guide stamps on body.
    const waiting = document.body.dataset.guideWaiting ?? null;
    if (waiting) return { done: false, waiting, phase: phaseNow };

    const card = document.getElementById('guide');
    if (!card || card.hidden) return { done: true };
    const ring = document.querySelector('.guide-on');
    return {
      done: false,
      step: document.getElementById('guide-step')?.textContent ?? '',
      text: document.getElementById('guide-text')?.textContent ?? '',
      hint: document.getElementById('guide-hint')?.textContent ?? '',
      ring: ring ? ring.id || ring.className : null,
      locked: document.body.classList.contains('guided'),
      waiting: null,
      // Nothing lit is only ever legitimate while the sim is doing the work.
      // Any other time it means the step is waiting on something no click can
      // cause — which is what a reload during the fight used to leave behind.
      phase: phaseNow,
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
/** The opening now contains two meetings, and both have to be walked through. */
let met = 0;
let metAt = '';

/** Dormant stretches, once each: the trace says what the opening is asleep on. */
const slept = new Set();

// Generous: the opening now contains a dormant stretch of five or six descents
// while the skill levels towards its first notable, and every one of them is
// played in real time.
for (let turn = 0; turn < 900; turn++) {
  const now = await state();
  if (now.done) break;

  // Asleep. The lockdown is off, so the loop chains descents by itself and the
  // harness is a player waiting — except at a report, where somebody has to
  // press Go again to start the chain back up.
  if (now.waiting) {
    if (!slept.has(now.waiting)) {
      slept.add(now.waiting);
      trace.push(`Dormant     the opening let go, waiting on ${now.waiting}`);
    }
    stuck = 0;
    // A descent that ended while the guide still held the lock left a report
    // and a haul on top of it, so the way back into the loop is out of those
    // and then in through the same button a player uses.
    const open = await page.$$eval('.modal:not([hidden])', (ns) => ns.map((n) => n.id));
    // The meeting is the one modal that is never in the way: `meet_crystal`
    // sleeps on `ctx.top !== 'met'`, so a panel that opened between reading
    // the state and acting on it has already woken the step. Escaping it here
    // dismissed the Lampwright without taking what he held, and the opening
    // recovered on a later descent having taught the step to nobody.
    if (open.includes('met')) {
      await page.waitForTimeout(300);
      continue;
    }
    if (open.length > 0) {
      await page.keyboard.press('Escape');
    } else if (now.phase !== 'running') {
      const button = now.phase === 'results' ? '#run-again' : '#run-launch';
      await page.locator(button).click({ timeout: 1200 }).catch(() => {});
    }
    await page.waitForTimeout(900);
    continue;
  }

  if (now.step !== last) {
    trace.push(`${now.step}  ${now.text.slice(0, 62)}`);
    last = now.step;
    stuck = 0;
  } else {
    stuck++;
  }

  // The Lampwright is at the MOUTH of the cleared descent, handing over in
  // person. The guide clicks that button like any other, so a meeting nobody
  // could dismiss shows up as being stuck rather than as being skipped.
  if (now.ring === 'met-take' && now.step !== metAt) {
    met++;
    metAt = now.step;
    trace.push(`Met         the Lampwright, at the mouth (${met})`);
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
    // A tree node is an SVG group with no button in it, so "contains a button"
    // is not the test — what it CLAIMS to be is.
    return ring instanceof HTMLButtonElement || ring?.getAttribute('role') === 'button';
  });
  // A region's first live control. The skill web's are SVG groups rather than
  // buttons, so both shapes count — a step ringing the web leaves the choice.
  const target = isControl
    ? page.locator('.guide-on').first()
    : page
        .locator('.guide-on button:not([disabled]), .guide-on .web__node--open')
        .first();
  try {
    await target.click({ timeout: 1200 });
  } catch {
    /* nothing reachable this turn; the stuck counter will catch it */
  }
  await page.waitForTimeout(320);
}

// The opening now ends inside the collection, with the crystal just socketed.
// A player closes it; everything below works the header, which a modal covers.
for (let i = 0; i < 3; i++) {
  const open = await page.evaluate(() =>
    [...document.querySelectorAll('.modal:not([hidden])')].map((m) => m.id)
  );
  if (open.length === 0) break;
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
}

const finished = (await state()).done;
if (!finished && problems.length === 0) {
  problems.push('ran out of turns without finishing');
}
// The first meeting is certain — the chance is 1 while you hold none — so an
// opening that did not contain one is the meeting having stopped happening.
if (finished && met < 2) {
  problems.push(`the opening met the Lampwright ${met} times, not twice`);
}
// Both dormant stretches have to actually happen, or the opening is a chain of
// cards again and the whole of "no popup purgatory" went with them.
if (finished && slept.size < 3) {
  problems.push(`the opening went dormant on ${[...slept].join(', ') || 'nothing'}, not on all three`);
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

// --- the dock takes a drag as well as a click ------------------------------
//
// Both, not either: the click is what the guided opening teaches and what a
// screen reader gets, and the drag is what a hand reaches for. A regression in
// one is invisible from the other.
{
  const gearSlots = () => page.locator('#inv-gear .slot:not(.slot--empty)');
  const labels = () =>
    page.$$eval('#inv-gear .slot:not(.slot--empty)', (ns) =>
      ns.map((n) => (n.getAttribute('aria-label') ?? '').replace(/^Open on bench: /, ''))
    );
  const drag = async (from, to) => {
    const a = await gearSlots().nth(from).boundingBox();
    const b = await gearSlots().nth(to).boundingBox();
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    // Past the slop, or the press is a click and nothing moves.
    await page.mouse.move(a.x + 22, a.y + 2, { steps: 4 });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(150);
  };

  // The tree section above leaves the Skills web open, and a modal swallows
  // every click meant for the bar behind it. Unconditionally: this used to sit
  // inside the stocking branch, so a run that happened to drop enough gear
  // skipped it and every click below hit the modal instead.
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(80);
  }

  // The opening leaves you with a wand and little else, so stock the dock. The
  // guide has already made every assertion it is going to by this point.
  if ((await gearSlots().count()) < 4) {
    await page.locator('#dev-kit').click();
    await page.locator('#confirm-yes').click();
    await page.waitForTimeout(300);
  }

  if ((await gearSlots().count()) < 4) {
    problems.push('could not stock the dock, so the drag checks never ran');
  } else {
    const before = await labels();
    await drag(0, 3);
    const after = await labels();
    if (before.join() === after.join()) problems.push('dragging a dock slot did not reorder it');
    if (await page.locator('.dragghost').count()) problems.push('a drag left its ghost behind');

    // A SWAP, and specifically not an insert-before: inserting puts an item
    // back exactly where it started whenever the target is its neighbour, so
    // the first slot read as one nothing could be dragged out of.
    if (!(after[0] === before[3] && after[3] === before[0])) {
      problems.push(`dropping 0 on 3 gave ${after.slice(0, 4).join(' | ')}, not a swap`);
    }
    const adjacent = await labels();
    await drag(0, 1);
    const swapped = await labels();
    if (!(swapped[0] === adjacent[1] && swapped[1] === adjacent[0])) {
      problems.push('dropping an item on its own neighbour did nothing');
    }

    // The click the drag must not have eaten.
    if (await page.locator('#craft').isHidden()) await page.locator('#open-craft').click();
    const want = (await labels())[2];
    await gearSlots().nth(2).click();
    const bench = (await page.locator('#item-name').textContent())?.trim();
    if (bench !== want) problems.push(`a click after a drag opened "${bench}", not "${want}"`);

    // And a drop on the bench says the same thing as that click.
    const wanted = (await labels())[1];
    const src = await gearSlots().nth(1).boundingBox();
    const zone = await page.locator('[data-drop="bench"]').boundingBox();
    await page.mouse.move(src.x + src.width / 2, src.y + src.height / 2);
    await page.mouse.down();
    await page.mouse.move(src.x + 22, src.y - 8, { steps: 4 });
    await page.mouse.move(zone.x + zone.width / 2, zone.y + 40, { steps: 10 });
    await page.mouse.up();
    await page.waitForTimeout(150);
    const dropped = (await page.locator('#item-name').textContent())?.trim();
    if (dropped !== wanted) problems.push(`dropping on the bench opened "${dropped}", not "${wanted}"`);
    trace.push('Dock        a slot reorders by drag, drops on the bench, and still clicks');

    // --- the worn column, both directions ---------------------------------
    const worn = page.locator('#craft-worn .wornslot:not(:disabled)');
    const wornCount = await worn.count();
    if (wornCount === 0) {
      problems.push('nothing is worn, so the worn column checks never ran');
    } else {
      // hover() before measuring: it waits for the element to stop MOVING, and
      // the bench had just gone from empty to holding something, which grows
      // the card and re-centres the whole modal under a box measured a moment
      // earlier. A press 20px off lands between two slots and does nothing.
      const first = worn.first();
      const name = (await first.locator('.wornslot__name').textContent())?.trim();
      await first.hover();
      const w = await first.boundingBox();
      const zone2 = await page.locator('[data-drop="bench"]').boundingBox();
      await page.mouse.move(w.x + w.width / 2, w.y + w.height / 2);
      await page.mouse.down();
      await page.mouse.move(w.x + 40, w.y + 10, { steps: 4 });
      await page.mouse.move(zone2.x + zone2.width - 60, zone2.y + 60, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(200);
      const onBench = (await page.locator('#item-name').textContent())?.trim();
      if (onBench !== name) {
        problems.push(`dragging a worn piece opened "${onBench}", not "${name}"`);
      }
      // The point of the column: it never comes off to be worked on.
      if ((await worn.count()) !== wornCount) problems.push('benching a worn piece took it off');
      if (!/worn/i.test((await page.locator('#item-meta').textContent()) ?? '')) {
        problems.push('the bench does not say the piece is still on you');
      }

      // And back the other way: a drag onto a slot is the one equip nobody
      // does by accident, so it needs no undo to be safe — but it gets one.
      const menuLabel = await (async () => {
        await gearSlots().nth(0).click({ button: 'right' });
        await page.waitForTimeout(120);
        const t = await page.$$eval('#itemmenu .itemmenu__item', (ns) =>
          ns.map((n) => n.textContent ?? '').find((s) => /wear as/i.test(s)) ?? ''
        );
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);
        return t;
      })();
      if (await page.locator('#craft').isHidden()) {
        problems.push('Escape closed the window under the item menu instead of the menu');
      }

      const want2 = menuLabel.replace(/^Wear as /i, '').replace(/ \(swap\)$/i, '').trim();
      const idx = await page.$$eval(
        '#craft-worn .wornslot',
        (ns, s) =>
          ns.findIndex(
            (n) => (n.querySelector('.wornslot__slot')?.textContent ?? '').toLowerCase() === s
          ),
        want2.toLowerCase()
      );
      if (idx < 0) problems.push(`the menu offers "${menuLabel}" but no worn slot is named that`);
      else {
        const ids = () =>
          page.$$eval('#inv-gear .slot:not(.slot--empty)', (ns) => ns.map((n) => n.dataset.itemId));
        const wasIds = await ids();
        await gearSlots().nth(0).hover();
        const s2 = await gearSlots().nth(0).boundingBox();
        const t2 = await page.locator('#craft-worn .wornslot').nth(idx).boundingBox();
        await page.mouse.move(s2.x + s2.width / 2, s2.y + s2.height / 2);
        await page.mouse.down();
        await page.mouse.move(s2.x + 30, s2.y - 20, { steps: 4 });
        await page.mouse.move(t2.x + t2.width / 2, t2.y + t2.height / 2, { steps: 10 });
        if ((await page.locator('#craft-worn .drop--over').count()) !== 1) {
          problems.push('a worn slot that accepts the piece does not light up');
        }
        await page.mouse.up();
        await page.waitForTimeout(200);
        if (await page.locator('#toast').isHidden()) {
          problems.push('equipping by drag said nothing');
        }
        if (JSON.stringify(await ids()) === JSON.stringify(wasIds)) {
          problems.push('dropping on a worn slot did not equip');
        }
        await page.locator('#toast .toast__do').click();
        await page.waitForTimeout(200);
        if (JSON.stringify(await ids()) !== JSON.stringify(wasIds)) {
          problems.push('undo did not put the dock back exactly as it was');
        }
      }
      trace.push('Worn        a worn piece benches by drag, and a drag onto a slot wears one');
    }
  }
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
