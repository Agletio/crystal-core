/**
 * THE ABYSS, SHOT: into the game, through the dev kit's own door, and a frame
 * written wherever the script says — off the committed bundle, like every peek.
 *
 *   Q='?high' node tools/abyss/peek.mjs out.png [steps…]
 *
 * A step is `wait:<ms>`, `at:<x>,<y>` (put the hero there), `zoom:<metres>`,
 * `slow:<k>` (game time at k), `slowcast:<k>` (the same, from the next cast),
 * `cast:<ms>` (hold a cast at the nearest demon), `walk:<keys>:<ms>`,
 * `blink:<dx>,<dy>`, `quiet` (every body down), `shot:<file>`, `vfx` (what the
 * sim is drawing), `probe` (the stage's clocks and anything non-finite) or
 * `stats`. Headless Chromium draws on SwiftShader, which the Abyss answers with
 * its LOW settings unless `Q` asks for HIGH — the real look, a frame a second.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { chromium } from 'playwright';

const root = new URL('../..', import.meta.url).pathname;
const docs = join(root, 'docs');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  const url = (req.url ?? '/').split('?')[0];
  try {
    const path = join(docs, url === '/' ? 'index.html' : url.slice(1));
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((go) => server.listen(0, '127.0.0.1', go));
const [out, ...steps] = process.argv.slice(2);
const W = Number(process.env.W ?? 1600);
const H = Number(process.env.H ?? 900);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.setDefaultTimeout(300000);
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(`http://127.0.0.1:${server.address().port}/${process.env.Q ?? ''}`);
await page.waitForFunction(() => document.getElementById('title')?.hidden === false, null, { timeout: 60000 });
for (const id of ['title', 'save-play', 'pick-aethermancer', 'pick-take', 'welcome-go']) {
  await page.evaluate((i) => document.getElementById(i)?.click(), id);
  await page.waitForTimeout(350);
}
await page.evaluate(() => document.getElementById('open-dev')?.click());
await page.waitForTimeout(300);
await page.evaluate(() => document.getElementById('dev-abyss')?.click());
const t0 = Date.now();
await page.waitForFunction(() => !!globalThis.__abyss && !document.querySelector('.abyss__load'), null, { timeout: 240000 });
console.log(`abyss up in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

const hero = () => page.evaluate(() => ({ x: globalThis.__abyss.state.hero.x, y: globalThis.__abyss.state.hero.y }));
for (const step of steps) {
  const [verb, a, b] = step.split(':');
  if (verb === 'wait') await page.waitForTimeout(Number(a));
  else if (verb === 'at') {
    const [x, y] = a.split(',').map(Number);
    await page.evaluate(([x, y]) => {
      const h = globalThis.__abyss.state.hero;
      h.x = x;
      h.y = y;
    }, [x, y]);
  } else if (verb === 'zoom') await page.evaluate((d) => (globalThis.__abyss.stage.distance = d), Number(a));
  else if (verb === 'slow') await page.evaluate((k) => globalThis.__abyss.slow(k), Number(a));
  else if (verb === 'slowcast') await page.evaluate((k) => globalThis.__abyss.slowOnCast(k), Number(a));
  else if (verb === 'walk') {
    for (const k of a) await page.keyboard.down(k);
    await page.waitForTimeout(Number(b));
    for (const k of a) await page.keyboard.up(k);
  } else if (verb === 'cast') {
    const until = Date.now() + Number(a);
    while (Date.now() < until) {
      const pt = await page.evaluate(() => {
        const s = globalThis.__abyss.state;
        const live = s.monsters.filter((m) => !m.dead).sort((p, q) => Math.hypot(p.x - s.hero.x, p.y - s.hero.y) - Math.hypot(q.x - s.hero.x, q.y - s.hero.y))[0];
        return live ? globalThis.__abyss.project(live.x, 0.8, live.y) : null;
      });
      if (pt) await page.mouse.move(pt.x, pt.y);
      await page.mouse.down();
      await page.waitForTimeout(250);
      await page.mouse.up();
    }
  } else if (verb === 'blink') {
    const [dx, dy] = a.split(',').map(Number);
    const h = await hero();
    const pt = await page.evaluate(([x, y]) => globalThis.__abyss.project(x, 0, y), [h.x + dx, h.y + dy]);
    await page.mouse.move(pt.x, pt.y);
    await page.keyboard.press(' ');
  } else if (verb === 'shot') {
    await page.screenshot({ path: a });
    console.log(`wrote ${a}`);
  } else if (verb === 'vfx') {
    console.log(JSON.stringify(await page.evaluate(() => {
      const seen = {};
      for (const v of globalThis.__abyss.state.vfx) {
        const k = `${v.kind}:${v.damageType}:${v.cast === globalThis.__abyss.state.hero.id ? 'hero' : 'other'}`;
        seen[k] = (seen[k] ?? 0) + 1;
      }
      return seen;
    })));
  } else if (verb === 'quiet') {
    await page.evaluate(() => {
      for (const m of globalThis.__abyss.state.monsters) (m.life = 0), (m.dead = true);
    });
  } else if (verb === 'probe') {
    console.log(JSON.stringify(await page.evaluate(() => globalThis.__abyss.probe())));
  } else if (verb === 'stats') {
    console.log(JSON.stringify(await page.evaluate(() => globalThis.__abyss.stats())));
  }
}
await page.screenshot({ path: out });
console.log(`wrote ${out} · hero at ${JSON.stringify(await hero())} · phase ${await page.evaluate(() => globalThis.__abyss.phase)}`);
if (errors.length) console.log('errors:\n  ' + [...new Set(errors)].slice(0, 12).join('\n  '));
await browser.close();
server.close();
