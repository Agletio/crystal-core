/**
 * Headless check that the app actually boots and its loop is wired up.
 *
 * Not a unit test suite — it's the "did I break the page" tripwire you run
 * before pushing, since Pages serves the committed bundle and a broken
 * docs/app.js is invisible until someone opens the site.
 *
 * Requires a current bundle: npm run build && npm run smoke
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { JSDOM, VirtualConsole } from 'jsdom';

const root = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(root, 'docs', 'index.html');
const bundlePath = join(root, 'docs', 'app.js');

let checks = 0;
const ok = (label) => {
  checks++;
  console.log(`  ok   ${label}`);
};
const fail = (label, detail) => {
  console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  process.exit(1);
};
const assert = (cond, label, detail) => (cond ? ok(label) : fail(label, detail));

console.log('smoke: booting the app headlessly\n');

if (!existsSync(bundlePath)) {
  fail('docs/app.js exists', 'run `npm run build` first');
}

// Any console.error from page code is a failure — except the one thing
// headless Node genuinely cannot do. jsdom has no 2D canvas without a native
// dependency, and the renderer already degrades to a no-op there.
const EXPECTED = [/HTMLCanvasElement.*getContext/];

const pageErrors = [];
const virtualConsole = new VirtualConsole();
const record = (text) => {
  if (!EXPECTED.some((re) => re.test(text))) pageErrors.push(text);
};
virtualConsole.on('error', (msg) => record(String(msg)));
virtualConsole.on('jsdomError', (err) => record(err.message));

const dom = new JSDOM(readFileSync(htmlPath, 'utf8'), {
  runScripts: 'dangerously',
  virtualConsole,
  url: 'http://localhost/',
  // The run view drives itself off requestAnimationFrame.
  pretendToBeVisual: true,
});
const { window } = dom;
const { document } = window;

const script = document.createElement('script');
script.textContent = readFileSync(bundlePath, 'utf8');
document.body.appendChild(script);

assert(pageErrors.length === 0, 'boots without errors', pageErrors.join(' | '));

const $ = (id) => document.getElementById(id);
const text = (id) => ($(id)?.textContent ?? '').trim();
const all = (sel) => [...document.querySelectorAll(sel)];

// --- duplicate ids would silently break getElementById --------------------
const ids = all('[id]').map((n) => n.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
assert(dupes.length === 0, 'no duplicate element ids', dupes.join(', '));

// --- inventory is permanent -----------------------------------------------
const invItems = () => all('#inventory .invitem');
assert(invItems().length >= 4, 'inventory populated', String(invItems().length));

// Fragments only up top; every other currency shows its count on its own
// button in the bench sidebar, so listing them here was the same twice.
assert(all('#wallet .coin').length === 1, 'wallet shows fragments only', text('wallet'));
assert(text('wallet').includes('fragments'), 'fragments are held', text('wallet'));
assert(all('#inventory .invitem .icon').length === invItems().length, 'every item has an icon');

// Bench splits crystals from equipment; the run screen doesn't.
const sectionLabels = () =>
  all('#inventory .invsection__label').map((n) => n.textContent.trim());
assert(
  sectionLabels().join('|') === 'Crystals|Equipment',
  'bench splits crystals and equipment',
  sectionLabels().join('|')
);

// --- bench starts empty ---------------------------------------------------
assert($('bench-empty').hidden === false, 'bench starts empty');
assert($('bench-item').hidden === true, 'no item panel until something is placed');
assert($('bench-return').disabled === true, 'return disabled with an empty bench');

// --- putting a crystal on the bench ---------------------------------------
const crystalChip = invItems().find((b) =>
  (b.querySelector('.invitem__name')?.textContent ?? '').includes('Crystal')
);
assert(!!crystalChip, 'a crystal is in the inventory');

const inventoryBefore = invItems().length;
crystalChip.click();

assert($('bench-item').hidden === false, 'bench shows the selected item');
assert(text('item-name').includes('Crystal'), 'selected item is the crystal', text('item-name'));

// Selecting is a reference, not a move: the item must STAY visible, marked,
// or it looks like crafting ate it.
assert(
  invItems().length === inventoryBefore,
  'item stays in the inventory when selected',
  `${invItems().length} vs ${inventoryBefore}`
);
assert(
  all('#inventory .invitem--on').length === 1,
  'the selected item is highlighted',
  String(all('#inventory .invitem--on').length)
);
assert($('bench-return').disabled === false, 'return is now available');
assert($('sockets').querySelectorAll('.facet').length === 3, 'crystal shows 3 facets');

// Derived reward multipliers under the name. A blank crystal must read as
// exactly baseline — no danger, no bonus.
const multRows = () =>
  all('#item-rewards .mult').map(
    (n) =>
      `${n.querySelector('.mult__k').textContent}=${n.querySelector('.mult__v').textContent}`
  );
assert($('item-rewards').hidden === false, 'crystal shows reward multipliers');
assert(
  multRows().join(' ') === 'danger=0 fragments=0% rarity=0%',
  'a blank crystal is worth exactly base',
  multRows().join(' ')
);

// --- crafting spends currency ---------------------------------------------
const currencyButton = (name) =>
  all('#currencies button.curr').find(
    (b) => (b.querySelector('.curr__name')?.textContent ?? '').trim() === name
  );

// Counts live on the currency buttons now, not in the wallet strip.
const heldCount = (name) => {
  const btn = currencyButton(name);
  const stock = btn?.querySelector('.curr__stock')?.textContent ?? '';
  return Number(stock.replace(/[^\d]/g, '')) || 0;
};

const making = currencyButton('Shard of Making');
assert(!!making && !making.disabled, 'Shard of Making usable on a blank crystal');
assert(heldCount('Shard of Making') > 0, 'currency count shown on the button');

const stockBefore = heldCount('Shard of Making');
making.click();

assert($('modlist').querySelectorAll('.mod').length === 1, 'a modifier was added');

// Every crystal mod is a downside now, so adding one must move danger up.
const danger = () => Number(multRows()[0].split('=')[1]);
assert(danger() > 0, 'crafting a mod raises danger', String(danger()));
assert(
  heldCount('Shard of Making') === stockBefore - 1,
  'currency was spent',
  `${heldCount('Shard of Making')} vs ${stockBefore}`
);
assert(
  all('#currencies .curr .icon').length >= 10,
  'currencies have icons',
  String(all('#currencies .curr .icon').length)
);

// The crafted item keeps its id, so it stays selected in place rather than
// jumping to the end of the list.
assert(
  all('#inventory .invitem--on').length === 1,
  'still selected after crafting',
  String(all('#inventory .invitem--on').length)
);
assert(
  invItems().length === inventoryBefore,
  'crafting did not duplicate the item',
  `${invItems().length} vs ${inventoryBefore}`
);

// --- closing it ---------------------------------------------------------
$('bench-return').click();
assert($('bench-empty').hidden === false, 'bench is empty again');
assert(invItems().length === inventoryBefore, 'item is still in the inventory');
assert(all('#inventory .invitem--on').length === 0, 'nothing highlighted after closing');

// --- workshop buys against fragments --------------------------------------
const buys = all('#workshop button.buy');
assert(buys.length >= 6, 'workshop lists recipes', String(buys.length));
const affordable = buys.find((b) => !b.disabled);
assert(!!affordable, 'at least one recipe is affordable');

// --- run view: menu first, no map ----------------------------------------
$('tab-run').click();
assert($('view-run').hidden === false, 'run view opens');
assert($('run-menu').hidden === false, 'run starts on the map-choosing menu');
assert($('run-stagewrap').hidden === true, 'no map until a run starts');
assert(($('run-launch')).disabled === true, 'cannot launch without choosing');
assert(all('#run-skills .chip').length >= 2, 'skills listed');
assert(all('#run-stats .stat').length >= 6, 'character stats shown');

// --- choosing a crystal ---------------------------------------------------
const runCrystal = invItems().find((b) =>
  (b.querySelector('.invitem__name')?.textContent ?? '').includes('Crystal')
);
assert(!!runCrystal, 'a crystal is selectable on the run screen');
runCrystal.click();
assert($('run-launch').disabled === false, 'launch enabled once chosen');
assert(text('run-selected').includes('Crystal'), 'chosen map is described');

// Gear isn't shown at all here — it's noise you'd look past every time.
const gearOnRun = invItems().filter((b) =>
  /Vest|Band/.test(b.querySelector('.invitem__name')?.textContent ?? '')
);
assert(gearOnRun.length === 0, 'gear is hidden on the run screen', String(gearOnRun.length));
assert(
  all('#inventory .invsection__label').length === 0,
  'run inventory is a single flat list'
);

// --- launching consumes the crystal and shows the map ---------------------
const beforeLaunch = invItems().length;
$('run-launch').click();

assert($('run-stagewrap').hidden === false, 'map view appears');
assert($('run-menu').hidden === true, 'menu hides while running');
assert(
  invItems().length === beforeLaunch - 1,
  'the crystal was consumed',
  `${invItems().length} vs ${beforeLaunch}`
);
assert(/^0\/\d+$/.test(text('run-killed')), 'run readout initialised', text('run-killed'));
assert(Number(text('run-killed').split('/')[1]) > 0, 'the map spawned monsters');
assert($('run-results').hidden === true, 'no results overlay mid-run');

// --- zoom -----------------------------------------------------------------
assert(text('run-zoom-label') === '1.0×', 'zoom starts fitted', text('run-zoom-label'));
assert($('run-zoom-out').disabled === true, 'cannot zoom out past the whole map');
$('run-zoom-in').click();
assert(text('run-zoom-label') === '1.5×', 'zoom in works', text('run-zoom-label'));
assert($('run-zoom-out').disabled === false, 'zoom out enabled once zoomed');
$('run-zoom-fit').click();
assert(text('run-zoom-label') === '1.0×', 'fit returns to the whole map');

// --- abandoning returns to the menu ---------------------------------------
$('run-abandon').click();
assert($('run-menu').hidden === false, 'abandon returns to the menu');
assert($('run-stagewrap').hidden === true, 'map hidden after abandoning');

$('tab-bench').click();
assert($('view-bench').hidden === false, 'switching back restores the bench');

assert(pageErrors.length === 0, 'no console errors during interaction', pageErrors.join(' | '));

window.close();
console.log(`\nsmoke: ${checks} checks passed`);
