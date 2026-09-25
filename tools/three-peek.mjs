/**
 * PHASE A'S MEASUREMENT, and the only reason the 3D spike exists.
 *
 * Launches a real descent under the three.js renderer in real Chromium and
 * reports the five things a plan cannot answer: draw calls on the floor,
 * triangles, bodies on screen, frame rate, and how many DYNAMIC LIGHTS the
 * frame carries before it falls over. Writes a screenshot beside them.
 *
 *   node tools/three-peek.mjs [band]
 *
 * NOTE ON THE NUMBERS: headless Chromium runs WebGL on SwiftShader, which is
 * software. The frame rate here is a FLOOR and a relative measure between
 * light counts — a GPU is worth many times it — so what this proves is the
 * SHAPE of the curve, never the absolute.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { chromium } from 'playwright';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const docs = join(root, '3d');
if (!existsSync(join(docs, 'app.js'))) {
  console.error('three-peek: 3d/app.js missing — run `npm run build` first');
  process.exit(1);
}

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  const path = join(docs, (req.url ?? '/').split('?')[0] === '/' ? 'index.html' : (req.url ?? '').slice(1));
  try {
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((go) => server.listen(0, '127.0.0.1', go));
const url = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.route(/cloudflareinsights\.com/, (route) => route.abort());
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(url);
await page.waitForFunction(() => document.getElementById('title')?.hidden === false, null, { timeout: 30000 });

// Title -> slots -> cast -> welcome, exactly the way `shots` walks it. A
// hidden button still fires its onclick, so a wrong id here does not fail —
// it silently measures a descent running behind the title screen.
await page.evaluate(() => document.getElementById('title')?.click());
await page.waitForTimeout(400);
await page.evaluate(() => document.getElementById('save-play')?.click());
await page.waitForTimeout(300);
await page.evaluate(() => document.getElementById('pick-aethermancer')?.click());
await page.waitForTimeout(300);
await page.evaluate(() => document.getElementById('pick-take')?.click());
await page.waitForTimeout(300);
await page.evaluate(() => document.getElementById('welcome-go')?.click());
await page.waitForTimeout(900);
const inGame = await page.evaluate(() => document.getElementById('title')?.hidden === true);
if (!inGame) {
  console.error('three-peek: never got past the title — the walk-in ids have moved');
  await browser.close();
  server.close();
  process.exit(1);
}

// The dev kit's own door to the spike, so this measures what a player toggles.
await page.evaluate(() => document.getElementById('open-dev')?.click());
await page.waitForTimeout(250);
const band = Number(process.argv[2] ?? 4);
await page.evaluate((n) => document.getElementById(`dev-gear-${n}`)?.click(), band);
await page.waitForTimeout(400);
await page.evaluate(() => document.getElementById('dev-three')?.click());
await page.waitForTimeout(400);
// SHUT, and checked: the menu is a window over the whole stage, and a
// screenshot of it says nothing about what the renderer drew.
await page.evaluate(() => document.getElementById('dev-close')?.click());
await page.waitForTimeout(300);
const clear = await page.evaluate(() => document.getElementById('dev')?.hidden !== false);
if (!clear) {
  console.error('three-peek: the dev menu stayed up, so the shot would be of the menu');
  await browser.close();
  server.close();
  process.exit(1);
}

await page.evaluate(() => document.getElementById('open-fissure')?.click());
await page.waitForTimeout(400);
await page.evaluate(() => document.getElementById('run-launch')?.click());
await page.waitForTimeout(4000);

const ready = await page.evaluate(() => !!globalThis.__three);
if (!ready) {
  console.error('three-peek: the spike never took the seam — is `dev-three` there?');
  await browser.close();
  server.close();
  process.exit(1);
}

/** Settle, then read. `stats()` is the renderer's own `info.render`. */
const sample = async (lights) => {
  await page.evaluate((n) => globalThis.__three.setLights(n), lights);
  await page.waitForTimeout(2500);
  return page.evaluate(() => globalThis.__three.stats());
};

console.log(`\nband ${band}, 1280x800, headless SwiftShader — a FLOOR, not a GPU\n`);
console.log(' lights   fps   draw calls   triangles   bodies');
const rows = [];
for (const n of [0, 1, 2, 4, 8, 16]) {
  const s = await sample(n);
  rows.push({ n, ...s });
  console.log(
    `   ${String(n).padStart(2)}    ${s.fps.toFixed(1).padStart(5)}   ${String(s.calls).padStart(10)}   ` +
    `${String(s.triangles).padStart(9)}   ${String(s.bodies).padStart(6)}`
  );
}

const base = rows.find((r) => r.n === 0)?.fps ?? 1;
const worst = rows[rows.length - 1];
console.log(
  `\n  ${worst.n} dynamic lights costs ${(100 - (worst.fps / Math.max(0.01, base)) * 100).toFixed(0)}% of the frame rate`
);
console.log(`  the whole floor draws in ${rows[0].calls} calls, so nothing is a mesh per cell`);

// WIDE for the picture: the measurements want a busy frame, the SHOT wants
// to show what a floor looks like. And the hero is asked for by name —
// whether a wall between him and the camera hides him is the one thing a
// fixed angle was supposed to make impossible.
await page.evaluate(() => {
  globalThis.__three.setLights(2);
  globalThis.__three.setZoom(1);
});
await page.waitForTimeout(1200);
const hero = await page.evaluate(() => {
  const s = globalThis.__three;
  const state = globalThis.__runState?.();
  return state ? s.screenAt({ x: state.hero.x, y: state.hero.y }) : null;
});
console.log(`  the hero projects to ${hero ? `${hero.x.toFixed(0)},${hero.y.toFixed(0)}` : 'nowhere the probe can read'}`);

await page.screenshot({ path: join(root, 'shots', 'three-spike.png') });
console.log(`  wrote shots/three-spike.png`);
if (errors.length) console.log(`\n  console errors: ${errors.slice(0, 3).join(' | ')}`);

await browser.close();
server.close();
