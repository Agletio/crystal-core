/**
 * THE CAMP IN 3D, shot in real Chromium off the download's committed bundle: a new
 * character made, the camp waited on until its 3D art has landed, then a frame.
 *
 *   node tools/3d/camp-peek.mjs out.png [hover-id]
 *
 * `hover-id` puts the pointer on that hotspot's button first (`camp-<id>`), so
 * a tooltip and a lit body can be judged. SwiftShader, so it takes a while.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';

const docs = new URL('../../3d', import.meta.url).pathname;
const [out = 'camp.png', hover = ''] = process.argv.slice(2);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  const url = (req.url ?? '/').split('?')[0];
  try {
    res.writeHead(200, { 'content-type': TYPES[extname(url)] ?? 'application/octet-stream' }).end(await readFile(join(docs, url === '/' ? 'index.html' : url.slice(1))));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((go) => server.listen(0, '127.0.0.1', go));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(process.env.W ?? 1280), height: Number(process.env.H ?? 800) } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && !/ERR_TUNNEL/.test(m.text()) && errors.push(m.text()));
await page.goto(`http://127.0.0.1:${server.address().port}/index.html?3d`);
await page.waitForTimeout(900);
for (const id of ['title', 'save-play', `pick-${process.env.TRADE ?? 'aethermancer'}`, 'pick-take', 'welcome-go']) {
  await page.evaluate((i) => document.getElementById(i)?.click(), id);
  await page.waitForTimeout(300);
}
if (process.env.KIT) {
  await page.evaluate(() => document.getElementById('open-dev')?.click());
  await page.waitForTimeout(200);
  await page.evaluate(() => document.getElementById('dev-kit')?.click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.getElementById('confirm-yes')?.click());
  await page.waitForTimeout(600);
  for (const id of ['title', 'save-play', `pick-${process.env.TRADE ?? 'aethermancer'}`, 'pick-take', 'welcome-go']) {
    await page.evaluate((i) => document.getElementById(i)?.click(), id);
    await page.waitForTimeout(300);
  }
}
await page.waitForFunction(() => document.body.classList.contains('camp3d'), null, { timeout: 240000 });
for (let i = 0; i < 3; i++) (await page.keyboard.press('Escape'), await page.waitForTimeout(100));
await page.waitForTimeout(Number(process.env.WAIT ?? 4000));
if (hover) {
  const box = await page.evaluate((id) => {
    const r = document.getElementById(`camp-${id}`)?.getBoundingClientRect();
    return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null;
  }, hover);
  if (box) await page.mouse.move(box.x, box.y);
  await page.waitForTimeout(1500);
}
if (process.env.BOXES) {
  await page.addStyleTag({ content: '.camp__hot { outline: 2px solid rgba(255,0,255,0.8) !important; }' });
  await page.waitForTimeout(300);
}
await page.screenshot({ path: out });
console.log(`wrote ${out}${errors.length ? `\nerrors:\n  ${errors.slice(0, 8).join('\n  ')}` : ''}`);
await browser.close();
server.close();
