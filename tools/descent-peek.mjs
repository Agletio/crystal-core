/**
 * A DESCENT, shot in real Chromium off the committed bundle. The only view that
 * judges the floor: Pixi alone draws a generated tileset, so a map cannot be
 * drawn out of the source the way `zone-peek` draws a zone.
 *
 * Not part of the suite. Requires a current bundle.
 *
 *   node tools/descent-peek.mjs out.png [zoom] [panX] [panY] [crop] [zone]
 *                                [hold] [skill] [shots]
 *
 * `zoom` is wheel steps OUT of the default — 0 is close enough to judge a wall,
 * 4 frames a chamber, 9 fits a good deal of the map. `pan` is pixels the map
 * moves under the camera. `crop` is `x,y,w,h,scale`, magnified NEAREST, because
 * a fault half a tile across is invisible at the size it ships at. `hold` is a
 * weapon base to put in the hand first — the kit carries two of each one-handed
 * family — and `a+b` DUAL WIELDS them: the off hand is emptied of its shield and
 * the second weapon goes there, since `slotFor` fills the empty hand.
 * `skill` is which one to take at the welcome, by name, since an EFFECT is a
 * skill's and cannot be judged behind another one; `shots` is how many frames
 * to take, as fast as they can be taken, because an effect is over in a fifth
 * of a second and one screenshot of a descent will not hold one.
 */
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { chromium } from 'playwright';

const docs = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
if (!existsSync(join(docs, 'app.js'))) {
  console.error('descent-peek: docs/app.js missing — run `npm run build` first');
  process.exit(1);
}

const [
  out = 'descent.png', zoom = 4, panX = 0, panY = 0, crop, zone = '', hold = '',
  skill = '', shots = 1,
] = process.argv.slice(2);

/** Which crystals to socket for each zone. Half of one world takes the rock,
 *  and two halves with no Normal is the Seam. */
const SOCKETS = {
  fissure: [],
  rot: ['Demonic', 'Demonic'],
  cavern: ['Prismatic', 'Prismatic'],
  seam: ['Demonic', 'Demonic', 'Prismatic', 'Prismatic'],
};
if (zone && !SOCKETS[zone]) {
  console.error(`descent-peek: zone must be one of ${Object.keys(SOCKETS).join(', ')}`);
  process.exit(1);
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  const url = (req.url ?? '/').split('?')[0];
  try {
    const body = await readFile(join(docs, url === '/' ? 'index.html' : url.slice(1)));
    res.writeHead(200, { 'content-type': TYPES[extname(url)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (m) => {
  if (m.type() === 'error' && !/WebGL|GPU/i.test(m.text())) console.log('page:', m.text());
});

/** A character is MADE before it is played: the trade, then the name and the
 *  skill. Every new game runs that gate, and the dev kit IS a new game — so
 *  this is walked twice or the second one sits on the hall forever. */
async function makeCharacter() {
  // TRADE=<id> picks another figure in the hall; a trade's own skill needs no swap.
  await page.evaluate((id) => document.getElementById(`pick-${id}`)?.click(), process.env.TRADE ?? 'aethermancer');
  await page.waitForTimeout(250);
  await page.evaluate(() => document.getElementById('pick-take')?.click());
  await page.waitForTimeout(250);
  await page.evaluate(() => document.getElementById('welcome-go')?.click());
  await page.waitForTimeout(700);
  // A trade brings its own skill, so a named one is swapped in the way a
  // player does it: the shelf, the tile, then Equip.
  const took = !skill || (await page.evaluate((want) => {
    document.getElementById('open-skills')?.click();
    for (const shelf of document.querySelectorAll('#skills-cats .catcard')) {
      shelf.click();
      const tile = [...document.querySelectorAll('#skills-list .skilltile')]
        .find((t) => (t.textContent ?? '').toLowerCase().includes(want.toLowerCase()));
      if (tile) { tile.click(); return true; }
    }
    return false;
  }, skill));
  if (!took) {
    console.error(`descent-peek: no skill on any shelf reads as "${skill}"`);
    process.exit(1);
  }
  if (skill) {
    await page.waitForTimeout(300);
    await page.evaluate(() => document.getElementById('skills-equip')?.click());
    await page.waitForTimeout(200);
    await page.evaluate(() => document.getElementById('confirm-yes')?.click()); // displacing the slot's skill asks first
    await page.waitForTimeout(200);
    await page.evaluate(() => document.getElementById('skills-close')?.click());
    await page.waitForTimeout(400);
  }
  await throughOpening();
}

/** A new character opens in the Lampwright's workshop and the stair behind him
 *  runs into a descent by itself, so the way to the DOCK is through him and out
 *  the far side of that descent. */
async function throughOpening() {
  for (let i = 0; i < 40; i++) {
    if (await page.evaluate(() => document.getElementById('met')?.hidden === false)) break;
    await page.evaluate(() => document.getElementById('speech-next')?.click());
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => document.getElementById('met-take')?.click());
  for (let i = 0; i < 40; i++) {
    if (await page.evaluate(() => document.body.dataset.runPhase === 'running')) break;
    await page.waitForTimeout(150);
  }
  await page.evaluate(() => document.getElementById('run-abandon')?.click());
  await page.waitForTimeout(400);
  await page.evaluate(() => document.getElementById('run-again')?.click());
  await page.waitForTimeout(400);
}

await page.goto(`${base}/index.html`, { waitUntil: 'load' });
await page.waitForTimeout(900);
await page.evaluate(() => document.getElementById('title')?.click());
await page.evaluate(() => document.getElementById('save-play')?.click());
await page.waitForTimeout(250);
await makeCharacter();
// The dev kit, so a descent is dressed at a real run power rather than at the
// bare Fissure's, and then down the hole. The wait covers the handover.
await page.evaluate(() => document.getElementById('open-dev')?.click());
await page.waitForTimeout(150);
// SHELVES=1 forces half the chambers a level up, through the kit's own toggle,
// so a floor can be judged before its world ships them. Before the handover,
// since the kit's own opening descent is the one shot.
if (process.env.SHELVES) {
  await page.evaluate(() => document.getElementById('dev-shelves')?.click());
  await page.waitForTimeout(150);
}
// TEST=1 shoots the TEST LEVEL — the dev menu's own family and rules.
if (process.env.TEST) {
  await page.evaluate(() => document.getElementById('dev-test')?.click());
  await page.waitForTimeout(150);
}
await page.evaluate(() => document.getElementById('dev-kit')?.click());
await page.waitForTimeout(400);
await page.evaluate(() => document.getElementById('confirm-yes')?.click());
await page.waitForTimeout(700);
await makeCharacter();
// The zone is the composition, so it is chosen by socketing rather than by a
// setting: the kit is handed every crystal and the collection is where they go.
for (const want of SOCKETS[zone] ?? []) {
  await page.evaluate(() => document.getElementById('camp-socket0')?.click());
  await page.waitForTimeout(250);
  const put = await page.evaluate((family) => {
    const cards = [...document.querySelectorAll('#crystals-list .crystal')].filter(
      (c) => c.textContent?.includes(family) && /unsocketed/i.test(c.textContent ?? '')
    );
    // The TOP level first: the Seam opens only on level-4 crystals of both aura worlds.
    const card = cards.find((c) => /Level 4\b/.test(c.textContent ?? '')) ?? cards[0];
    const button = card?.querySelector('button.mini');
    if (!button) return false;
    button.click();
    return true;
  }, want);
  if (!put) {
    console.error(`descent-peek: nothing left to socket for ${want}`);
    process.exit(1);
  }
  await page.waitForTimeout(200);
  await page.evaluate(() => document.getElementById('crystals-close')?.click());
  await page.waitForTimeout(200);
}

// What the main hand is holding is drawn ON the body, so judging it means
// putting one there: the kit carries one of every family, in the dock.
if (hold) {
  const wanted = String(hold).split('+');
  await page.evaluate(() => document.getElementById('open-inventory')?.click());
  await page.waitForTimeout(250);
  // The kit starts wearing a shield, so a PAIR has to empty that hand first or
  // the second weapon swaps the first out of the main hand instead.
  if (wanted.length > 1) {
    await page.evaluate(() => document.getElementById('open-character')?.click());
    await page.waitForTimeout(250);
    // `slot-offhand` is the sheet's own button for that hand, and clicking a
    // worn one takes it off — the same click a player makes.
    await page.evaluate(() => document.getElementById('slot-offhand')?.click());
    await page.waitForTimeout(250);
    await page.evaluate(() => document.getElementById('sheet-close')?.click());
    await page.waitForTimeout(200);
  }
  for (const [i, want] of wanted.entries()) {
    const took = await page.evaluate(([name, skip]) => {
      const slots = [...document.querySelectorAll('#inv-gear .slot')].filter((b) =>
        (b.getAttribute('aria-label') ?? '').toLowerCase().includes(name.toLowerCase())
      );
      const slot = slots[0];
      if (!slot) return false;
      slot.click();
      return true;
    }, [want, i]);
    if (!took) {
      console.error(`descent-peek: nothing in the dock reads as "${want}"`);
      process.exit(1);
    }
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => document.getElementById('inv-close')?.click());
  await page.waitForTimeout(200);
}

// THE WORLD IS THE PROVING GROUND'S INFLUENCE, not the sockets': a depth runs
// in its zone's own world whatever is socketed, and the kit's climb is shut
// past The Answering, so another world is reached through the Proving Ground
// tab and its influence button; the Seam is the one the sockets open.
const INFLUENCE = { rot: 'The Rot', cavern: 'The Cavern', seam: null };
if (zone in INFLUENCE) {
  await page.evaluate(() => document.getElementById('camp-crack')?.click());
  await page.waitForTimeout(300);
  const found = await page.evaluate((want) => {
    const tab = [...document.querySelectorAll('.climbtab')].find((t) => t.textContent?.startsWith('The Proving Ground'));
    if (!tab || tab.disabled) return 'no Proving Ground tab';
    tab.click();
    if (!want) return true;
    const button = [...document.querySelectorAll('.influence')].find((b) => b.textContent?.trim() === want);
    if (!button) return `no influence reads as "${want}"`;
    button.click();
    return true;
  }, INFLUENCE[zone]);
  if (found !== true) {
    console.error(`descent-peek: ${found}`);
    process.exit(1);
  }
  await page.waitForTimeout(300);
}

await page.evaluate(() => document.getElementById('run-launch')?.click());
// GATHER=1 shoots the first GATHER instead of the eighth second: the page says
// what tool the hero is holding, and the burst starts the moment it is one.
if (process.env.GATHER) {
  for (let i = 0; i < 600; i++) {
    if (await page.evaluate(() => document.body.dataset.heroTool)) break;
    await page.waitForTimeout(100);
  }
} else if (!process.env.CAST) {
  await page.waitForTimeout(8000);
}
// The kit leaves a screen open and the point is the floor. Escape shuts
// whatever is on top, and space puts the camera back on the hero.
for (let i = 0; i < 3; i++) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
}
await page.keyboard.press('Space');
await page.waitForTimeout(200);

for (let i = 0; i < Number(zoom); i++) await page.mouse.wheel(0, 120);
await page.waitForTimeout(400);
// Split across several drags: one is bounded by the window, so a pan across a
// whole map cannot be a single gesture.
const REACH = 400;
const legs = Math.ceil(Math.max(Math.abs(panX), Math.abs(panY)) / REACH);
for (let i = 0; i < legs; i++) {
  await page.mouse.move(640, 400);
  await page.mouse.down();
  await page.mouse.move(640 - Number(panX) / legs, 400 - Number(panY) / legs, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(80);
}
await page.waitForTimeout(800);

if ((await page.evaluate(() => document.body.dataset.runPhase)) !== 'running') {
  const why = await page.evaluate(() => {
    const open = [...document.querySelectorAll('.modal:not([hidden]), .pick:not([hidden])')].map((m) => m.id);
    return `phase ${document.body.dataset.runPhase}, open: ${open.join(' ') || 'nothing'}`;
  });
  console.error(`descent-peek: nothing launched a descent — ${why}`);
  process.exit(1);
}

/** One frame, magnified if a crop was asked for: a fault half a tile across is
 *  invisible at the size it ships at. */
async function frame() {
  const shot = await page.screenshot();
  if (!crop) return shot;
  const [x, y, w, h, scale = 4] = crop.split(',').map(Number);
  const png = await page.evaluate(
    async ({ data, x, y, w, h, scale }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${data}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = w * scale;
      canvas.height = h * scale;
      const ink = canvas.getContext('2d');
      ink.imageSmoothingEnabled = false;
      ink.drawImage(img, x, y, w, h, 0, 0, w * scale, h * scale);
      return canvas.toDataURL('image/png').split(',')[1];
    },
    { data: shot.toString('base64'), x, y, w, h, scale }
  );
  return Buffer.from(png, 'base64');
}

// The last one keeps the name asked for, so a single shot is one file. They are
// SPACED: taken back to back they are all the same instant, which is no use at
// all for the thing `shots` exists for — watching an effect run.
const APART = 220;
// CAST=1: the page HOLDS its own sim on the first effect, and the frames are
// that instant — an effect is over in a fifth of a second and a screenshot
// takes most of that, so a poll from out here would always be a frame late.
if (process.env.CAST) {
  await page.evaluate((after) => {
    document.body.dataset.holdOn = 'cast';
    document.body.dataset.holdDelay = after; // AFTER=<sim seconds> past the first effect, for a flight
  }, process.env.AFTER ?? '0');
  for (let i = 0; i < 1200; i++) {
    if (await page.evaluate(() => document.body.dataset.hold)) break;
    await page.waitForTimeout(40);
  }
  await page.waitForTimeout(60);
}
for (let i = 0; i + 1 < Number(shots); i++) {
  await writeFile(out.replace(/\.png$/, `-${String(i).padStart(2, '0')}.png`), await frame());
  await page.waitForTimeout(APART);
}
await writeFile(out, await frame());

await browser.close();
server.close();
console.log(`descent-peek: wrote ${out}`);
