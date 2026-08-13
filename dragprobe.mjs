/**
 * Does the dock still drag, and does a window still go where you put it? Boots,
 * stocks, reorders one dock slot onto another, then drags a window by its head
 * and checks the stack it landed in.
 *
 * Exists because `npm run guide` answers this in minutes by playing real
 * descents, and a question this small should cost seconds — 20 of them. Run it
 * for any change that moves the dock, a window's position or a z-index; on a
 * failure it prints what `elementFromPoint` actually hits at the drop, which is
 * the question every guess about stacking is really asking.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { chromium } from 'playwright';

const docs = join(dirname(fileURLToPath(import.meta.url)), 'docs');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript' };

const server = createServer(async (req, res) => {
  const asked = (req.url ?? '/').split('?')[0];
  try {
    const body = await readFile(join(docs, asked === '/' ? 'index.html' : asked.slice(1)));
    res.writeHead(200, { 'content-type': TYPES[extname(asked)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const problems = [];
page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));

await page.goto(`${base}/index.html`, { waitUntil: 'load' });
await page.waitForTimeout(700);

// Straight to a stocked game: the dev kit start is the one with gear in it.
await page.evaluate(() => document.getElementById('title')?.click());
await page.evaluate(() => document.getElementById('save-play')?.click());
await page.waitForTimeout(200);
await page.evaluate(() => {
  document.getElementById('welcome-name').value = 'Probe';
  document.querySelectorAll('#welcome-skills .welcomecard')[0]?.click();
});
await page.waitForTimeout(500);
await page.evaluate(() => document.getElementById('dev-kit')?.click());
await page.evaluate(() => document.getElementById('confirm-yes')?.click());
await page.waitForTimeout(600);
await page.evaluate(() => document.getElementById('open-inventory')?.click());
await page.waitForTimeout(300);

const slots = () => page.locator('#inv-gear .slot:not(.slot--empty)');
const labels = () =>
  page.$$eval('#inv-gear .slot:not(.slot--empty)', (ns) =>
    ns.map((n) => n.getAttribute('aria-label') ?? '')
  );

const count = await slots().count();
if (count < 4) problems.push(`only ${count} gear slots — nothing to drag`);
else {
  const before = await labels();
  const a = await slots().nth(0).boundingBox();
  const b = await slots().nth(3).boundingBox();
  if (!a || !b) problems.push('a slot has no box — it is hidden or clipped');
  else {
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + 22, a.y + 2, { steps: 4 });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(200);

    const after = await labels();
    if (!(after[0] === before[3] && after[3] === before[0])) {
      problems.push(`0 and 3 did not swap: ${before.slice(0, 4).join(' | ')} -> ${after.slice(0, 4).join(' | ')}`);
      // What a real click would actually land on, which is the question every
      // z-order and pointer-events guess was trying to answer by eye.
      const hit = await page.evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        const path = [];
        for (let n = el; n && n !== document.body; n = n.parentElement) {
          path.push(n.id ? `#${n.id}` : `.${String(n.className).split(' ')[0]}`);
        }
        return path.join(' < ');
      }, [b.x + b.width / 2, b.y + b.height / 2]);
      problems.push(`the drop point belongs to: ${hit}`);
    }
  }
}

// Again, but with the BENCH open — which is how the guide fails. A screen with
// focus owns the dock (`setInventoryHandler`), so this is a different code path
// from dragging with nothing up.
await page.evaluate(() => document.getElementById('open-craft')?.click());
await page.waitForTimeout(300);
{
  const before = await labels();
  const mode = before[0]?.startsWith('Open on bench') ? 'bench' : 'other';
  if (mode !== 'bench') problems.push(`with the bench open the dock still says "${before[0]}"`);

  const a = await slots().nth(0).boundingBox();
  const b = await slots().nth(3).boundingBox();
  if (a && b) {
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + 22, a.y + 2, { steps: 4 });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(200);
    const after = await labels();
    if (!(after[0] === before[3] && after[3] === before[0])) {
      problems.push(`bench open: 0 and 3 did not swap`);
    }
    // And the click the drag must not have eaten.
    const want = (await labels())[2];
    await slots().nth(2).click();
    const shown = (await page.locator('#item-name').textContent())?.trim();
    const wanted = want.replace(/^Open on bench: /, '');
    if (shown !== wanted) problems.push(`bench open: click showed "${shown}", not "${wanted}"`);
  }
}

// A window goes where you put it, and the map does not come along. The map is
// ALREADY drag-to-look, so the one thing this can get wrong is panning the
// ground under the card you meant to move.
{
  const head = page.locator('#craft .modal__head');
  const box = await head.boundingBox();
  const card = () => page.locator('#craft .modal__card').boundingBox();
  const before = await card();
  if (!box || !before) problems.push('the bench has no head to drag it by');
  else {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 - 120, box.y + box.height / 2 + 60, { steps: 8 });
    const panned = await page.evaluate(() =>
      document.querySelector('.stage')?.classList.contains('stage--drag')
    );
    await page.mouse.up();
    if (panned) problems.push('dragging a window panned the map underneath it');

    const after = await card();
    const moved = Math.round(after.x - before.x);
    if (moved > -100) problems.push(`the bench moved ${moved}px, not about -120`);

    // Double-click the head puts it back: the only way home for a window
    // somebody has dragged into a corner.
    await head.dblclick();
    const home = await card();
    if (Math.abs(home.x - before.x) > 2) problems.push('double-clicking the head did not reset it');
  }
}

// On top is what you touched last, and the rail is over the lot of it.
{
  await page.evaluate(() => document.getElementById('open-stash')?.click());
  await page.waitForTimeout(200);
  const z = (id) =>
    page.evaluate((n) => Number(getComputedStyle(document.getElementById(n)).zIndex), id);
  if ((await z('stash')) <= (await z('craft'))) problems.push('the window opened last is not on top');
  await page.locator('#craft .modal__head').click();
  await page.waitForTimeout(100);
  if ((await z('craft')) <= (await z('stash'))) problems.push('clicking a window did not raise it');
  if ((await z('corner')) <= (await z('craft'))) problems.push('a window can cover the rail');
}

await browser.close();
server.close();

if (problems.length) {
  console.error('drag: FAILED');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log('drag: a dock slot reorders, and a window goes where you put it');
