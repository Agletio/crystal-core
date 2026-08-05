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
assert(all('#wallet .coin').length >= 2, 'wallet shows currency');
assert(text('wallet').includes('fragment'), 'fragments are held', text('wallet'));

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

assert($('bench-item').hidden === false, 'bench shows the placed item');
assert(text('item-name').includes('Crystal'), 'placed item is the crystal', text('item-name'));
assert(
  invItems().length === inventoryBefore - 1,
  'item left the inventory',
  `${invItems().length} vs ${inventoryBefore}`
);
assert($('bench-return').disabled === false, 'return is now available');
assert($('sockets').querySelectorAll('.facet').length === 3, 'crystal shows 3 facets');

// --- crafting spends currency ---------------------------------------------
const currencyButton = (name) =>
  all('#currencies button.curr').find(
    (b) => (b.querySelector('.curr__name')?.textContent ?? '').trim() === name
  );

const walletCount = (id) => {
  const coin = all('#wallet .coin').find((c) =>
    (c.querySelector('.coin__id')?.textContent ?? '').includes(id)
  );
  return coin ? Number(coin.querySelector('.coin__n').textContent) : 0;
};

const making = currencyButton('Shard of Making');
assert(!!making && !making.disabled, 'Shard of Making usable on a blank crystal');

const stockBefore = walletCount('shard of making');
making.click();

assert($('modlist').querySelectorAll('.mod').length === 1, 'a modifier was added');
assert(
  walletCount('shard of making') === stockBefore - 1,
  'currency was spent',
  `${walletCount('shard of making')} vs ${stockBefore}`
);

// --- returning it -------------------------------------------------------
$('bench-return').click();
assert($('bench-empty').hidden === false, 'bench is empty again');
assert(invItems().length === inventoryBefore, 'item returned to the inventory');

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

// Gear must NOT be selectable as a map.
const gearChip = invItems().find((b) =>
  /Vest|Band/.test(b.querySelector('.invitem__name')?.textContent ?? '')
);
assert(!!gearChip && gearChip.disabled, 'gear cannot be run as a map');

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

// --- abandoning returns to the menu ---------------------------------------
$('run-abandon').click();
assert($('run-menu').hidden === false, 'abandon returns to the menu');
assert($('run-stagewrap').hidden === true, 'map hidden after abandoning');

$('tab-bench').click();
assert($('view-bench').hidden === false, 'switching back restores the bench');

assert(pageErrors.length === 0, 'no console errors during interaction', pageErrors.join(' | '));

window.close();
console.log(`\nsmoke: ${checks} checks passed`);
