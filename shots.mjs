/**
 * Renders the committed page in a real browser and writes PNGs to shots/.
 *
 * The smoke test proves the page BOOTS; jsdom has no layout engine, so it
 * cannot tell you the header is 34px wider than a phone. This is the other
 * half: real Chromium, real CSS, at the sizes people actually hold.
 *
 * It is also a guard, not just a camera. Any element whose right edge lands
 * past the viewport fails the run — that is the one bug class you cannot see
 * on a desktop and cannot feel on a phone except as the page drifting
 * sideways under your thumb.
 *
 * Requires a current bundle: npm run build && npm run shots
 */
import { createServer } from 'node:http';
import { readFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { chromium } from 'playwright';

const root = dirname(fileURLToPath(import.meta.url));
const docs = join(root, 'docs');
const outDir = join(root, 'shots');

if (!existsSync(join(docs, 'app.js'))) {
  console.error('shots: docs/app.js missing — run `npm run build` first');
  process.exit(1);
}

/** The sizes worth having an opinion about. Phone first: it is the one that breaks. */
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
];

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };

// A three-line static server beats a dependency for serving two files.
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

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });

/**
 * Right edge past the viewport, which is what "the page drifts sideways" is.
 *
 * Content inside something that scrolls sideways ON PURPOSE doesn't count.
 * The dock is wider than a phone by design — it holds a whole inventory at a
 * fixed row count — and it carries its own `overflow-x: auto` so only the dock
 * moves. Flagging its contents would report the feature as the bug, and the
 * only way to satisfy it would be to break the thing the container is for.
 */
const overflowProbe = () => {
  const cw = document.documentElement.clientWidth;

  const insideScroller = (el) => {
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const x = getComputedStyle(p).overflowX;
      if (x === 'auto' || x === 'scroll') return true;
    }
    return false;
  };

  let worst = 0;
  let who = '';
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.right > cw + 0.5 && r.right > worst && !insideScroller(el)) {
      worst = r.right;
      who = el.className || el.tagName;
    }
  }
  return worst ? { past: Math.round(worst - cw), who: String(who).split(' ')[0] } : null;
};

/**
 * Does the guide card sit on top of the thing it is telling you to click?
 *
 * This is the failure that made the dock's fourth row a bug: `place()` will
 * sit the card INSIDE a target big enough to hold it, which was fine while the
 * dock was two rows and became "click your wand" printed over the wand. Needs
 * real layout, so it lives here rather than in smoke.
 */
const guideProbe = () => {
  const card = document.getElementById('guide');
  if (!card || card.hidden) return null;
  const target = document.querySelector('.guide-on');
  if (!target) return null;

  const a = card.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  const x = Math.max(0, Math.min(a.right, t.right) - Math.max(a.left, t.left));
  const y = Math.max(0, Math.min(a.bottom, t.bottom) - Math.max(a.top, t.top));
  const covered = Math.round(x * y);
  return covered > 0 ? { covered, who: target.id || target.className } : null;
};

/**
 * With the opening running, is anything but the step reachable by a pointer?
 *
 * The lock is pure CSS — pointer-events off on the app, back on for the
 * target — so nothing in jsdom can see it. elementFromPoint is the honest
 * test: it answers what a real click would actually hit.
 */
const lockProbe = () => {
  if (!document.body.classList.contains('guided')) return null;
  const leaks = [];
  for (const id of ['open-shop', 'open-craft', 'open-stash', 'open-character', 'dev-kit']) {
    const el = document.getElementById(id);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (hit === el || el.contains(hit)) leaks.push(id);
  }
  return leaks.length ? leaks : null;
};

const browser = await chromium.launch();
const problems = [];
const written = [];

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 2,
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    // A headless GPU warns about WebGL, and the webfonts are on a CDN that a
    // sandboxed or offline runner cannot reach. Neither says anything about
    // the app; a same-origin failure (our own bundle) very much does.
    if (/WebGL|GPU/i.test(m.text())) return;
    const from = m.location()?.url ?? '';
    if (from && !from.startsWith(base)) return;
    errors.push(m.text());
  });

  await page.goto(`${base}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(900);

  // Two states worth seeing: what a new player lands on, and the screen they
  // spend the game in. A shot of only the welcome modal hides the whole app.
  const shoot = async (state) => {
    const file = `${vp.name}-${state}.png`;
    await page.screenshot({ path: join(outDir, file) });
    written.push(file);
    const over = await page.evaluate(overflowProbe);
    if (over) problems.push(`${vp.name}/${state}: .${over.who} overflows by ${over.past}px`);
    const leaks = await page.evaluate(lockProbe);
    if (leaks) {
      problems.push(`${vp.name}/${state}: the opening leaks — ${leaks.join(', ')} still clickable`);
    }
    const covering = await page.evaluate(guideProbe);
    if (covering) {
      problems.push(
        `${vp.name}/${state}: the guide covers ${covering.who} by ${covering.covered}px²`
      );
    }
  };

  await shoot('welcome');

  // Choosing a skill dismisses the welcome modal and drops you at the Fissure.
  // Blight, when it's on offer, because its poison field is the effect most
  // worth being able to see in a still.
  await page.evaluate(() => {
    const cards = [...document.querySelectorAll('#welcome-skills .welcomecard')];
    const blight = cards.find((c) => /blight/i.test(c.textContent ?? ''));
    (blight ?? cards[0])?.click();
  });
  await page.waitForTimeout(700);
  await shoot('fissure');

  // And the run itself. A menu screenshot cannot show whether combat reads,
  // which is the half of the UI that actually moves.
  await page.evaluate(() => document.querySelector('#run-launch')?.click());
  await page.waitForTimeout(4500);
  await shoot('descent');

  if (errors.length) problems.push(`${vp.name}: console errors — ${errors.slice(0, 2).join(' | ')}`);
  await page.close();
}

await browser.close();
server.close();

console.log(`shots: wrote ${written.length} to shots/`);
for (const f of written) console.log(`  ${f}`);

if (problems.length) {
  console.error('\nshots: FAILED');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log('\nshots: no overflow, no console errors');
