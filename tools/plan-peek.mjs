/**
 * A PLAN, drawn: the level builder loaded with a plan file and shot off the
 * committed bundle, so a laid floor can be judged at any zoom without waiting
 * for a descent to happen to hold the shape. Not part of the suite.
 *
 *   node tools/plan-peek.mjs plan.json out.png [zoom]
 */
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
const docs = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');
const [planFile, out, zoomWant = '36'] = process.argv.slice(2);
const plan = JSON.parse(await readFile(planFile, 'utf8'));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  const url = (req.url ?? '/').split('?')[0];
  try { const body = await readFile(join(docs, url === '/' ? 'index.html' : url.slice(1))); res.writeHead(200, { 'content-type': TYPES[extname(url)] ?? 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404).end('not found'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error' && !/WebGL|GPU/i.test(m.text())) console.log('page:', m.text()); });
await page.goto(`${base}/index.html`, { waitUntil: 'load' });
await page.waitForTimeout(900);
for (const id of ['title', 'save-play']) { await page.evaluate((i) => document.getElementById(i)?.click(), id); await page.waitForTimeout(250); }
for (const id of ['pick-aethermancer', 'pick-take', 'welcome-go']) { await page.evaluate((i) => document.getElementById(i)?.click(), id); await page.waitForTimeout(400); }
await page.waitForTimeout(600);
await page.evaluate(() => document.getElementById('open-dev')?.click());
await page.waitForTimeout(200);
await page.evaluate(() => document.getElementById('dev-builder')?.click());
await page.waitForTimeout(1500);
await page.evaluate(([plan, zoomWant]) => {
  document.getElementById('builder-plan').value = JSON.stringify(plan);
  document.getElementById('builder-load').click();
  for (const b of document.querySelectorAll('#builder-bar button')) if (b.textContent === zoomWant) b.click();
  for (const b of document.querySelectorAll('#builder-bar button')) if (b.textContent === 'Grid' && b.classList.contains('bldrchip--on')) b.click();
}, [plan, zoomWant]);
await page.waitForTimeout(800);
const canvas = await page.$('#builder-canvas');
await writeFile(out, await canvas.screenshot());
console.log('wrote', out);
await browser.close(); server.close();
