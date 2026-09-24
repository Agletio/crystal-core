/**
 * THE LINEUP: every body in one picture, holding a clip at the moments asked —
 * how a retarget, a window's impact or a reshaped body is judged before the
 * renderer is ever in the way.
 *
 *   node tools/3d/lineup.mjs out.png [clip] [at,at,…] [body,body,…]
 *
 * No clip stands them at rest. Reads the built shards in `docs/gl/`, so run
 * `npm run build:gl` after a pack.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const root = new URL('../..', import.meta.url).pathname;
const [out = 'lineup.png', clip = '', at = '0.5', bodies = ''] = process.argv.slice(2);
const bundle = join(root, 'tools/3d/cache/lineup.js');
await build({ entryPoints: [join(root, 'tools/3d/lineup.ts')], bundle: true, format: 'esm', outfile: bundle, logLevel: 'warning' });
const server = createServer(async (req, res) => {
  const url = (req.url ?? '/').split('?')[0];
  try {
    if (url === '/') return res.writeHead(200, { 'content-type': 'text/html' }).end('<!doctype html><body><script type="module" src="/lineup.js"></script>');
    const path = url === '/lineup.js' ? bundle : join(root, 'docs', url.slice(1));
    res.writeHead(200, { 'content-type': extname(path) === '.js' ? 'text/javascript' : 'application/octet-stream' }).end(await readFile(path));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((go) => server.listen(0, '127.0.0.1', go));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(process.env.W ?? 1800), height: Number(process.env.H ?? 700) } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => (m.type() === 'error' ? errors.push(m.text()) : console.log(`  page: ${m.text()}`)));
const q = new URLSearchParams({ clip, at, ...(bodies ? { bodies } : {}), ...(process.env.TURN ? { turn: process.env.TURN } : {}), ...(process.env.DEBUG ? { debug: '1' } : {}) });
await page.goto(`http://127.0.0.1:${server.address().port}/?${q}`);
await page.waitForFunction(() => globalThis.__done === true, null, { timeout: 180000 }).catch(() => undefined);
await page.screenshot({ path: out });
console.log(`wrote ${out}${errors.length ? `\nerrors:\n  ${errors.join('\n  ')}` : ''}`);
await browser.close();
server.close();
