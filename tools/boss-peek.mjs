/**
 * THE ANSWERING, shot off the committed bundle. A boss fight is the one thing
 * in the game with a picture per PHASE, and a telegraph you cannot look at is
 * a telegraph you are guessing at — so this arms the keyhole, walks into the
 * room and shoots on a timer across a whole cycle of it.
 *
 * Not part of the suite. Requires a current bundle.
 *
 *   node tools/boss-peek.mjs [dir] [shots] [zoom]
 */
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { chromium } from 'playwright';

const [out = '.', shots = 12, zoom = 3] = process.argv.slice(2);
const docs = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
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

async function makeCharacter() {
  await page.evaluate(() => document.getElementById('pick-aethermancer')?.click());
  await page.waitForTimeout(250);
  await page.evaluate(() => document.getElementById('pick-take')?.click());
  await page.waitForTimeout(250);
  await page.evaluate(() => document.querySelector('#welcome-skills .welcomecard')?.click());
  await page.waitForTimeout(700);
}

await page.goto(`${base}/index.html`, { waitUntil: 'load' });
await page.waitForTimeout(900);
await page.evaluate(() => document.getElementById('title')?.click());
await page.evaluate(() => document.getElementById('save-play')?.click());
await page.waitForTimeout(250);
await makeCharacter();
await page.evaluate(() => document.getElementById('dev-kit')?.click());
await page.waitForTimeout(400);
await page.evaluate(() => document.getElementById('confirm-yes')?.click());
await page.waitForTimeout(700);
await makeCharacter();
for (let i = 0; i < 3; i++) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(120);
}
// The keyhole: socketing consumes the key and arms the next entry.
const armed = await page.evaluate(() => {
  const b = document.getElementById('run-socket-key');
  if (!b) return 'no keyhole';
  b.click();
  return b.textContent;
});
console.log('keyhole:', armed);
await page.waitForTimeout(400);
await page.evaluate(() => document.getElementById('run-launch')?.click());
await page.waitForTimeout(2500);
for (let i = 0; i < 4; i++) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
}
// Skip the speech if there is any, then let the fight start.
for (let i = 0; i < 12; i++) {
  const done = await page.evaluate(() => {
    const n = document.getElementById('speech-next');
    if (n && !n.closest('[hidden]')) { n.click(); return false; }
    return true;
  });
  await page.waitForTimeout(300);
  if (done) break;
}
await page.waitForTimeout(1200);
await page.keyboard.press('Space');
for (let i = 0; i < Number(zoom); i++) await page.mouse.wheel(0, 120);
await page.waitForTimeout(400);

for (let i = 0; i < Number(shots); i++) {
  await writeFile(join(out, `boss-${String(i).padStart(2, '0')}.png`), await page.screenshot());
  await page.waitForTimeout(2200);
}
console.log('runPhase', await page.evaluate(() => document.body.dataset.runPhase));

await browser.close();
server.close();
