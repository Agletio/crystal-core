/**
 * Headless check that the bench actually boots.
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

console.log('smoke: booting the bench headlessly\n');

if (!existsSync(bundlePath)) {
  fail('docs/app.js exists', 'run `npm run build` first');
}

// Any console.error from page code is a failure, not noise.
const pageErrors = [];
const virtualConsole = new VirtualConsole();
virtualConsole.on('error', (msg) => pageErrors.push(String(msg)));
virtualConsole.on('jsdomError', (err) => pageErrors.push(err.message));

const dom = new JSDOM(readFileSync(htmlPath, 'utf8'), {
  runScripts: 'dangerously',
  virtualConsole,
  url: 'http://localhost/',
});
const { window } = dom;
const { document } = window;

// Inject the bundle by hand rather than letting jsdom fetch ./app.js — keeps
// this offline and makes a missing bundle an explicit failure above.
const script = document.createElement('script');
script.textContent = readFileSync(bundlePath, 'utf8');
document.body.appendChild(script);

assert(pageErrors.length === 0, 'boots without errors', pageErrors.join(' | '));

const $ = (id) => document.getElementById(id);
const text = (id) => ($(id)?.textContent ?? '').trim();

// --- the page rendered itself ---------------------------------------------
assert($('bases').querySelectorAll('button').length >= 3, 'base chips rendered');
assert(
  $('currencies').querySelectorAll('button.curr').length >= 10,
  'currency shelf rendered'
);
assert(/^\d+$/.test(text('seed')), 'seed is displayed', `got "${text('seed')}"`);

// --- default item is a blank T3 crystal with three empty facets ------------
assert(text('item-name') === 'Tier 3 Crystal', 'default item loaded', text('item-name'));
assert(
  $('sockets').querySelectorAll('.facet').length === 3,
  'crystal shows 3 facets',
  String($('sockets').querySelectorAll('.facet').length)
);
assert(
  $('sockets').querySelectorAll('.facet--empty').length === 3,
  'all facets start empty'
);
assert(text('item-meta').includes('blank'), 'fill state reads blank', text('item-meta'));

// --- crafting actually mutates the DOM ------------------------------------
const currencyButton = (name) =>
  [...$('currencies').querySelectorAll('button.curr')].find((b) =>
    (b.querySelector('.curr__name')?.textContent ?? '').trim() === name
  );

const awaken = currencyButton('Shard of Awakening');
assert(!!awaken, 'Shard of Awakening is on the shelf');
assert(!awaken.disabled, 'Shard of Awakening is enabled on a blank item');

awaken.click();

assert(
  $('sockets').querySelectorAll('.facet--set').length === 3,
  'filling slots lights all 3 facets',
  String($('sockets').querySelectorAll('.facet--set').length)
);
assert($('modlist').querySelectorAll('.mod').length === 3, 'mod list shows 3 mods');
assert(text('item-meta').includes('full'), 'fill state reads full', text('item-meta'));
assert($('log').querySelectorAll('.logline').length > 0, 'history recorded the craft');

// --- a full item refuses more mods ----------------------------------------
const making = currencyButton('Shard of Making');
assert(!!making && making.disabled, 'Shard of Making blocked when slots are full');

// --- corruption locks the item --------------------------------------------
const finality = currencyButton('Sigil of Finality');
assert(!!finality && !finality.disabled, 'Sigil of Finality available');
finality.click();

const history = [...$('log').querySelectorAll('.logline')]
  .map((l) => l.textContent)
  .join(' | ');
assert(
  /(empowered|diminished) \d+ mod\(s\) by 25%/.test(history),
  'finality scaled every modifier before locking',
  history.slice(0, 160)
);
assert(text('item-meta').includes('locked'), 'item reads as locked', text('item-meta'));
assert(
  [...$('currencies').querySelectorAll('button.curr')].every((b) => b.disabled),
  'every currency is blocked on a corrupted item'
);

// --- reseed and base switching still work ---------------------------------
const seedBefore = text('seed');
$('reseed').click();
assert(text('seed') !== seedBefore, 'reseed changes the seed');

$('bases').querySelectorAll('button')[0].click();
assert(text('item-name') === 'Tier 1 Crystal', 'switching base loads a fresh item', text('item-name'));
assert($('modlist').querySelectorAll('.mod').length === 0, 'fresh item has no mods');

$('clear').click();
assert($('log').querySelectorAll('.logline').length === 0, 'clear empties the history');

assert(pageErrors.length === 0, 'no console errors during interaction', pageErrors.join(' | '));

window.close();
console.log(`\nsmoke: ${checks} checks passed`);
