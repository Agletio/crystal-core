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

// The dock is icons in slots, so an item is identified by its aria-label —
// which is what a screen reader gets too, and the only name in the markup.
const filled = (sel) => all(`${sel} .slot:not(.slot--empty)`);
const dockItems = () => filled('.dock');
const named = (btn) => btn.getAttribute('aria-label') ?? '';

// --- first run asks one question, then plays -------------------------------
assert($('welcome').hidden === false, 'a new game asks you to choose a skill');
assert(all('#welcome-skills .welcomecard').length === 3, 'all skills offered');
assert($('welcome-name') !== null, 'and asks who you are');

$('welcome-name').value = 'Vespera';
all('#welcome-skills .welcomecard')[0].click();
assert(text('run-name') === 'Vespera', 'the chosen name is kept', text('run-name'));
assert($('welcome').hidden === true, 'choosing dismisses the prompt');
assert($('bench').hidden === true, 'and drops you straight at the Fissure, not the bench');
assert($('run-launch').disabled === false, 'ready to enter immediately');

// --- a new game starts with literally nothing ------------------------------
// The app boots fresh on purpose: judging the loop from a stocked inventory
// is judging the endgame at the start. No crystals either — two of them read
// as "spend these now", and a new character who did that died to it.
assert(dockItems().length === 0, 'a fresh game owns nothing at all', String(dockItems().length));
assert(text('wallet').startsWith('0'), 'a fresh game has no fragments', text('wallet'));
assert(
  all('#currencies button.curr:not(:disabled)').length === 0,
  'nothing is craftable with an empty wallet'
);

// The dock is a fixed shape whether or not you own anything, so it never
// collapses and shoves the Fissure around.
assert(all('#inv-crystal .slot--empty').length > 0, 'the dock keeps empty slots');

// One place, always open. An empty socket is a real descent, not a missing
// choice — that's the anti-stuck guarantee, so Enter must never be disabled.
assert($('run-socket') !== null, 'the Fissure has a socket');
assert(
  !$('run-socket').classList.contains('socket--full'),
  'which starts empty'
);
assert(
  /empty socket/i.test(text('run-selected')),
  'and says so',
  text('run-selected').slice(0, 60)
);
assert($('run-launch').disabled === false, 'the Fissure is enterable with nothing');
const beforeFissure = dockItems().length;
$('run-launch').click();
assert($('run-stagewrap').hidden === false, 'the Fissure starts');
assert(
  dockItems().length === beforeFissure,
  'the Fissure consumes nothing',
  `${dockItems().length} vs ${beforeFissure}`
);
$('run-abandon').click();

// --- the guided opening ----------------------------------------------------
// Only the plumbing is checked here: driving a real clear would take the full
// run in wall-clock time. The step machine itself is exercised headlessly in
// the demo, where state can be built directly.
assert($('guide').hidden === true, 'no guidance before the first clear');
assert($('guide-skip') !== null, 'guidance can be dismissed');
assert(
  all('.guide-on').length === 0,
  'nothing is highlighted before the guide runs',
  String(all('.guide-on').length)
);

$('dev-kit').click();
assert(dockItems().length > 2, 'the dev kit stocks the dock', String(dockItems().length));
assert($('bench').hidden === false, 'a stocked game opens on the bench');

// --- duplicate ids would silently break getElementById --------------------
const ids = all('[id]').map((n) => n.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
assert(dupes.length === 0, 'no duplicate element ids', dupes.join(', '));

// --- the dock is permanent -------------------------------------------------
const invItems = dockItems;
assert(invItems().length >= 4, 'dock populated', String(invItems().length));

// Fragments only up top; every other currency shows its count on its own
// button in the bench, so listing them here was the same information twice.
assert(all('#wallet .coin').length === 1, 'wallet shows fragments only', text('wallet'));
assert(text('wallet').includes('fragments'), 'fragments are held', text('wallet'));
assert(all('.dock .slot .icon').length === invItems().length, 'every item has an icon');

// Crystals left, equipment right — always, on every screen.
assert(filled('#inv-crystal').length > 0, 'crystals have their own column');
assert(filled('#inv-gear').length > 0, 'equipment has its own column');
assert(
  filled('#inv-crystal').every((b) => b.classList.contains('slot--crystal')),
  'the crystal column holds only crystals'
);
assert(
  filled('#inv-gear').every((b) => b.classList.contains('slot--gear')),
  'the equipment column holds only equipment'
);
// Icons only: the name and every modifier live in the tooltip.
assert(text('inv-crystal') === '', 'the dock shows icons, not names', text('inv-crystal'));

// --- bench starts empty ---------------------------------------------------
assert($('bench-empty').hidden === false, 'bench starts empty');
assert($('bench-item').hidden === true, 'no item panel until something is placed');
assert($('bench-return').disabled === true, 'return disabled with an empty bench');

// --- putting a crystal on the bench ---------------------------------------
const crystalChip = filled('#inv-crystal')[0];
assert(!!crystalChip, 'a crystal is in the dock');

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
  all('.dock .slot--on').length === 1,
  'the selected item is highlighted',
  String(all('.dock .slot--on').length)
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
  all('.dock .slot--on').length === 1,
  'still selected after crafting',
  String(all('.dock .slot--on').length)
);
assert(
  invItems().length === inventoryBefore,
  'crafting did not duplicate the item',
  `${invItems().length} vs ${inventoryBefore}`
);

// --- implicits survive everything ----------------------------------------
// A weapon's implicit is its identity. Every effect in the registry operates
// on `mods`, so nothing — including Shard of Ruin, which strips the lot —
// should be able to reach it.
$('bench-return').click();
const weaponChip = filled('#inv-gear').find((b) =>
  /Wand|Sword|Shiv|Stiletto|Fang|Cudgel|Maul/.test(named(b))
);
assert(!!weaponChip, 'a weapon base is in the dock');
weaponChip.click();

const implicitRows = () => all('#modlist .mod--implicit');
assert(implicitRows().length === 1, 'the weapon shows its implicit');
const implicitText = implicitRows()[0].textContent;

const awaken2 = currencyButton('Shard of Awakening');
if (awaken2 && !awaken2.disabled) awaken2.click();
const ruin = currencyButton('Shard of Ruin');
if (ruin && !ruin.disabled) ruin.click();

assert(
  implicitRows().length === 1 && implicitRows()[0].textContent === implicitText,
  'crafting cannot reach an implicit'
);

$('bench-return').click();
crystalChip.click();

// --- closing it ---------------------------------------------------------
$('bench-return').click();
assert($('bench-empty').hidden === false, 'bench is empty again');
assert(invItems().length === inventoryBefore, 'item is still in the dock');
assert(all('.dock .slot--on').length === 0, 'nothing highlighted after closing');

// --- workshop buys against fragments --------------------------------------
const buys = all('#workshop button.buy');
assert(buys.length >= 6, 'workshop lists recipes', String(buys.length));
const affordable = buys.find((b) => !b.disabled);
assert(!!affordable, 'at least one recipe is affordable');

// --- the map is the floor, the bench is a popup over it -------------------
// The dock must stay reachable underneath every popup: it's what the bench
// works on, and covering it would break the only way to load the bench.
assert($('bench').hidden === false, 'the bench is a popup, not a page');
assert(
  !$('bench').contains($('inv-crystal')),
  'the dock lives outside every popup'
);
$('bench-close').click();
assert($('bench').hidden === true, 'the bench closes');
assert($('run-menu').hidden === false, 'and the Fissure is waiting underneath');
assert($('run-stagewrap').hidden === true, 'nothing running until you enter');
assert(all('#run-stats .stat').length >= 6, 'character stats shown');

// --- socketing a crystal --------------------------------------------------
const runCrystal = filled('#inv-crystal')[0];
assert(!!runCrystal, 'a crystal is socketable from the dock');
assert(
  /socket/i.test(named(runCrystal)),
  'the dock offers to socket it',
  named(runCrystal)
);
runCrystal.click();
assert($('run-socket').classList.contains('socket--full'), 'the socket fills');
assert(text('run-selected').includes('Crystal'), 'and describes the crystal');

// Taking it back out costs nothing — socketing is a reference, not a spend.
$('run-socket').click();
assert(!$('run-socket').classList.contains('socket--full'), 'the socket empties again');
assert($('run-launch').disabled === false, 'and you can still descend without one');
runCrystal.click();

// Gear stays in the dock — it's always in the dock — but there's nothing to
// do with a helmet here, so it must render inert rather than look clickable.
assert(
  filled('#inv-gear').every((b) => b.disabled),
  'gear is inert at the Fissure'
);
assert(
  filled('#inv-crystal').every((b) => !b.disabled),
  'crystals are not'
);

// --- entering consumes the socketed crystal -------------------------------
const beforeLaunch = invItems().length;
$('run-launch').click();

assert($('run-stagewrap').hidden === false, 'the descent begins');
assert($('run-menu').hidden === true, 'menu hides while running');
assert(
  invItems().length === beforeLaunch - 1,
  'the crystal was consumed',
  `${invItems().length} vs ${beforeLaunch}`
);
assert(/^0\/\d+$/.test(text('run-killed')), 'run readout initialised', text('run-killed'));
assert(Number(text('run-killed').split('/')[1]) > 0, 'the map spawned monsters');
assert($('run-results').hidden === true, 'no results overlay mid-run');

// Who you are, above the health bar, while the map is on screen. The dev kit
// wiped the game since the name was chosen, so this is the default one.
assert(text('run-name') === 'Wanderer', 'the map screen names you', text('run-name'));
assert(text('run-level') === '1', 'and shows your level', text('run-level'));

// Loot is live: the panel exists from the first frame and says so when empty.
assert($('run-loot') !== null, 'a carrying panel is on screen during a run');
assert(text('run-loot').length > 0, 'the carrying panel says what it holds');

// --- zoom -----------------------------------------------------------------
// Starts close enough to read a fight, not fitted — at 1× a monster is four
// pixels.
assert(text('run-zoom-label') === '2.0×', 'zoom starts close', text('run-zoom-label'));
assert($('run-zoom-out').disabled === false, 'and can be pulled back');
$('run-zoom-in').click();
assert(text('run-zoom-label') === '2.5×', 'zoom in works', text('run-zoom-label'));
$('run-zoom-fit').click();
assert(text('run-zoom-label') === '1.0×', 'fit shows the whole Fissure');
assert($('run-zoom-out').disabled === true, 'and cannot go wider than that');

// The frame only freezes while a map is on screen, and the map keeps running
// underneath the bench rather than being left for.
const viewport = document.querySelector('.viewport');
assert(viewport.classList.contains('viewport--locked'), 'a running map fills the frame');
$('open-bench').click();
assert($('bench').hidden === false, 'the bench opens over a live run');
assert($('run-stagewrap').hidden === false, 'and the run is still going underneath');
assert(
  filled('#inv-gear').every((b) => !b.disabled),
  'the dock answers to the bench while it is open'
);
$('bench-close').click();
assert(
  filled('#inv-gear').every((b) => b.disabled),
  'and to the map again once it closes'
);

// --- abandoning returns to the menu ---------------------------------------
$('run-abandon').click();
assert(
  !viewport.classList.contains('viewport--locked'),
  'the frame unfreezes once the map is gone'
);
assert($('run-menu').hidden === false, 'abandon returns to the menu');
assert($('run-stagewrap').hidden === true, 'map hidden after abandoning');

// --- character sheet ------------------------------------------------------
assert($('sheet').hidden === true, 'character sheet starts closed');
$('open-character').click();
assert($('sheet').hidden === false, 'character sheet opens');

const slots = all('#sheet-slots .slotcell');
assert(slots.length === 8, 'all eight equipment slots shown', String(slots.length));

const worn = all('#sheet-slots .slotcell__btn--worn');
assert(worn.length === 8, 'starter set fills every slot', String(worn.length));
assert(all('#sheet-stats .stat').length >= 8, 'sheet lists derived stats');

// Armour must print points AND what they're worth — the whole reason it
// curves on points rather than hit size is that this can be stated.
const armourRow = all('#sheet-stats .stat').find(
  (r) => r.querySelector('.stat__k')?.textContent === 'armour'
);
assert(
  /^\d+ \(\d+%\)$/.test(armourRow?.querySelector('.stat__v')?.textContent ?? ''),
  'armour shows points and percent',
  armourRow?.querySelector('.stat__v')?.textContent
);

// One resistance row per damage type, none of them above the cap.
const resRows = all('#sheet-res .stat');
assert(resRows.length === 8, 'a resistance row per damage type', String(resRows.length));
const overCap = resRows.filter(
  (r) => Number((r.querySelector('.stat__v')?.textContent ?? '0').replace('%', '')) > 75
);
assert(overCap.length === 0, 'no resistance exceeds the cap', String(overCap.length));

// --- skills modal and tree ------------------------------------------------
$('sheet-close').click();
assert($('skills').hidden === true, 'skills modal starts closed');
$('open-skills').click();
assert($('skills').hidden === false, 'skills modal opens');
assert(all('#skills-list .skillrow').length === 3, 'all skills listed');

// The skill was renamed; nothing should still say Arcane Bolt anywhere.
const pageText = document.body.textContent ?? '';
assert(!/Arcane Bolt/.test(pageText), 'no stale "Arcane Bolt" naming');
assert(/Fire Bolt/.test(pageText), 'Fire Bolt is named');

// Opening a skill draws its web.
all('#skills-list .skillrow')[0].click();
assert($('skills-detail').hidden === false, 'selecting a skill shows its tree');
assert(all('#skills-tree .web__node').length === 10, 'ten nodes drawn');
assert(all('#skills-tree .web__edge').length === 10, 'every node is connected');
assert(all('#skills-tree .web__node--major').length >= 1, 'tree has a major node');

// The centre is an icon now, not a word.
assert(
  $('skills-tree').querySelector('.web__centre svg') !== null,
  'centre shows a skill icon'
);

// Tooltips are ours, not the browser's — nothing should rely on `title`,
// which is delayed and drawn in the OS's colours.
assert(
  $('skills-tree').querySelectorAll('title').length === 0,
  'tree uses custom tooltips, not native title'
);
assert($('tooltip').hidden === true, 'tooltip starts hidden');

const hub = $('skills-tree').querySelector('.web__centre');
hub.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
assert($('tooltip').hidden === false, 'hovering the skill shows a tooltip at once');
assert(
  /Fire Bolt|Strike|Creeping Blight/.test(text('tooltip')),
  'tooltip names the skill',
  text('tooltip').slice(0, 40)
);
assert(/damage per hit/.test(text('tooltip')), 'tooltip shows the damage breakdown');
hub.dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: true }));
assert($('tooltip').hidden === true, 'tooltip hides again');

// Level 1 means one point, and outer nodes must be unreachable until their
// inner one is paid for.
const allocated = () => all('#skills-tree .web__node--on').length;
const locked = () => all('#skills-tree .web__node--locked').length;
assert(allocated() === 0, 'nothing allocated to begin with');
assert(locked() >= 5, 'outer ring starts locked', String(locked()));

const openNodes = all('#skills-tree .web__node').filter(
  (n) => !n.classList.contains('web__node--locked')
);
assert(openNodes.length === 5, 'exactly the inner ring is reachable', String(openNodes.length));

openNodes[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert(allocated() === 1, 'a node can be allocated');
assert(locked() >= 9, 'spending the only point locks the rest', String(locked()));

// The dev lever exists precisely so this is testable without grinding.
$('skills-devlevel').click();
assert(
  all('#skills-tree .web__node').filter((n) => !n.classList.contains('web__node--locked'))
    .length > 0,
  'a granted level frees up another node'
);

$('skills-close').click();
assert($('skills').hidden === true, 'skills modal closes');
$('open-character').click();

// Taking something off must return it to the inventory and free the slot.
const invBefore = invItems().length;
worn[0].click();
assert(
  all('#sheet-slots .slotcell__btn--worn').length === 7,
  'unequipping empties the slot'
);
assert(invItems().length === invBefore + 1, 'unequipped item returns to inventory');

// Picking that slot should offer only things that fit it.
assert($('sheet-picker').hidden === true, 'picker closed by default');
all('#sheet-slots .slotcell__btn')[0].click();
assert($('sheet-picker').hidden === false, 'picking a slot opens the picker');

const offered = all('#sheet-picker .invitem');
assert(offered.length > 0, 'picker offers something that fits');
offered[0].click();
assert(
  all('#sheet-slots .slotcell__btn--worn').length === 8,
  're-equipping fills the slot'
);
assert(invItems().length === invBefore, 'equipped item leaves the inventory');

$('sheet-close').click();
assert($('sheet').hidden === true, 'character sheet closes');

// --- history --------------------------------------------------------------
assert($('history').hidden === true, 'history starts closed');
$('open-history').click();
assert($('history').hidden === false, 'history opens');
assert(all('#history-log .logline').length > 0, 'history recorded earlier actions');
$('history-clear').click();
assert(all('#history-log .logline').length === 0, 'clearing empties the history');
$('history-close').click();
assert($('history').hidden === true, 'history closes');

// --- the page itself must not scroll --------------------------------------
assert(
  window.getComputedStyle(document.body).overflow === 'hidden',
  'page does not scroll',
  window.getComputedStyle(document.body).overflow
);

assert(pageErrors.length === 0, 'no console errors during interaction', pageErrors.join(' | '));

window.close();
console.log(`\nsmoke: ${checks} checks passed`);
