/**
 * A DESCENT, shot in real Chromium off the committed bundle. The only view that
 * judges the floor: Pixi alone draws a generated tileset, so a map cannot be
 * drawn out of the source the way `zone-peek` draws a zone.
 *
 * Not part of the suite. Requires a current bundle.
 *
 *   node tools/descent-peek.mjs out.png [zoom] [panX] [panY] [crop]
 *
 * `zoom` is wheel steps OUT of the default — 0 is close enough to judge a wall,
 * 4 frames a chamber, 9 fits a good deal of the map. `pan` is pixels the map
 * moves under the camera. `crop` is `x,y,w,h,scale`, magnified NEAREST, because
 * a fault half a tile across is invisible at the size it ships at.
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

const [out = 'descent.png', zoom = 4, panX = 0, panY = 0, crop, zone = ''] = process.argv.slice(2);

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

await page.goto(`${base}/index.html`, { waitUntil: 'load' });
await page.waitForTimeout(900);
await page.evaluate(() => document.getElementById('title')?.click());
await page.evaluate(() => document.getElementById('save-play')?.click());
await page.waitForTimeout(200);
await page.evaluate(() => document.querySelector('#welcome-skills .welcomecard')?.click());
await page.waitForTimeout(700);
// The dev kit, so a descent is dressed at a real run power rather than at the
// bare Fissure's, and then down the hole. The wait covers the handover.
await page.evaluate(() => document.getElementById('dev-kit')?.click());
await page.waitForTimeout(400);
await page.evaluate(() => document.getElementById('confirm-yes')?.click());
await page.waitForTimeout(700);
// The zone is the composition, so it is chosen by socketing rather than by a
// setting: the kit is handed every crystal and the collection is where they go.
for (const want of SOCKETS[zone] ?? []) {
  await page.evaluate(() => document.getElementById('open-crystals')?.click());
  await page.waitForTimeout(250);
  const put = await page.evaluate((family) => {
    const cards = [...document.querySelectorAll('#crystals-list .crystal')];
    const card = cards.find(
      (c) => c.textContent?.includes(family) && /unsocketed/i.test(c.textContent ?? '')
    );
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

await page.evaluate(() => document.getElementById('run-launch')?.click());
await page.waitForTimeout(3000);
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
  console.error('descent-peek: nothing launched a descent');
  process.exit(1);
}

const shot = await page.screenshot();
if (crop) {
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
  await writeFile(out, Buffer.from(png, 'base64'));
} else {
  await writeFile(out, shot);
}

await browser.close();
server.close();
console.log(`descent-peek: wrote ${out}`);
