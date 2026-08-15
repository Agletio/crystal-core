/** Launches a real descent and shoots it. */
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
const docs = '/home/user/crystal-core/docs';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  const u = (req.url ?? '/').split('?')[0];
  try {
    const b = await readFile(join(docs, u === '/' ? 'index.html' : u.slice(1)));
    res.writeHead(200, { 'content-type': TYPES[extname(u)] ?? 'application/octet-stream' }).end(b);
  } catch { res.writeHead(404).end('no'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (m) => { if (m.type() === 'error' && !/WebGL|GPU/i.test(m.text())) console.log('page:', m.text()); });
await page.goto(`${base}/index.html`, { waitUntil: 'load' });
await page.waitForTimeout(900);
await page.evaluate(() => document.getElementById('title')?.click());
await page.evaluate(() => document.getElementById('save-play')?.click());
await page.waitForTimeout(200);
await page.evaluate(() => document.querySelector('#welcome-skills .welcomecard')?.click());
await page.waitForTimeout(700);
await page.evaluate(() => document.querySelector('#run-launch')?.click());
await page.waitForTimeout(6000);
for (let i = 0; i < Number(process.argv[3] ?? 0); i++) await page.mouse.wheel(0, 120);
await page.waitForTimeout(600);
console.log('phase:', await page.evaluate(() => document.body.dataset.runPhase));
await writeFile(process.argv[2], await page.screenshot());
await browser.close(); server.close();
