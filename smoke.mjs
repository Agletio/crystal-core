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
// Items only. Currency shares the dock now, and a craft that empties a stack
// removes a slot — folding the two together would make every "the item count
// did not change" assertion below quietly depend on what you just spent.
const dockItems = () => [...filled('#inv-crystal'), ...filled('#inv-gear')];
const currencySlots = () => filled('#inv-currency');
const named = (btn) => btn.getAttribute('aria-label') ?? '';

// --- first run asks one question, then plays -------------------------------
assert($('welcome').hidden === false, 'a new game asks you to choose a skill');
assert(all('#welcome-skills .welcomecard').length === 3, 'all skills offered');
assert($('welcome-name') !== null, 'and asks who you are');

$('welcome-name').value = 'Vespera';
all('#welcome-skills .welcomecard')[0].click();
assert(text('run-name') === 'Vespera', 'the chosen name is kept', text('run-name'));
assert($('welcome').hidden === true, 'choosing dismisses the prompt');
assert($('craft').hidden === true, 'and drops you straight at the Fissure, not the bench');
assert($('run-launch').disabled === false, 'ready to enter immediately');

// --- a new game starts with literally nothing ------------------------------
// The app boots fresh on purpose: judging the loop from a stocked inventory
// is judging the endgame at the start. No crystals either — two of them read
// as "spend these now", and a new character who did that died to it.
assert(dockItems().length === 0, 'a fresh game owns nothing at all', String(dockItems().length));
assert(text('wallet').startsWith('0'), 'a fresh game has no fragments', text('wallet'));
assert(
  currencySlots().length === 0,
  'an empty wallet puts no currency in the dock',
  String(currencySlots().length)
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
// It runs from the very first click now, so a new player is never looking at
// a screen full of buttons with no idea which one. Only the plumbing is
// checked here; the step machine itself is walked headlessly in the demo,
// where state can be built directly.
assert($('guide').hidden === false, 'the guide is up from the start');
assert(/step 1 of/i.test(text('guide-step')), 'starting at step one', text('guide-step'));
assert(
  all('.guide-on').length === 1,
  'exactly one thing is highlighted',
  String(all('.guide-on').length)
);
assert(
  $('run-launch').classList.contains('guide-on'),
  'and it is the button that starts the game'
);
// No Skip. It only ever got pressed to dismiss the card during a descent —
// where there is nothing to click — and the guide never came back for the
// part that teaches you the loop.
assert($('guide-skip') === null, 'there is no way to skip it');

// The card floats over the popups rather than living in the shell — half its
// steps point at things inside a modal.
assert(
  !document.querySelector('.wrap').contains($('guide')),
  'the guide is not trapped inside the shell'
);

$('dev-kit').click();
assert($('guide').hidden === true, 'a wipe ends it');
assert(all('.guide-on').length === 0, 'and takes the highlight with it');
assert(dockItems().length > 2, 'the dev kit stocks the dock', String(dockItems().length));
assert($('craft').hidden === false, 'a stocked game opens on the bench');

// --- duplicate ids would silently break getElementById --------------------
const ids = all('[id]').map((n) => n.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
assert(dupes.length === 0, 'no duplicate element ids', dupes.join(', '));

// --- the dock is permanent -------------------------------------------------
const invItems = dockItems;
assert(invItems().length >= 4, 'dock populated', String(invItems().length));

// Fragments only up top: they are the number you compare against a shop
// price, not a thing you apply to an item. Everything you DO apply is a
// stack in the dock.
assert(all('#wallet .coin').length === 1, 'wallet shows fragments only', text('wallet'));
assert(text('wallet').includes('fragments'), 'fragments are held', text('wallet'));
assert(
  all('.dock .slot .icon').length === invItems().length + currencySlots().length,
  'every item and every stack has an icon'
);

// --- currency is inventory ------------------------------------------------
// It used to be thirteen labelled buttons inside the crafting popup, which
// made a Shard of Making a menu command rather than a thing you own.
assert(currencySlots().length > 0, 'the dev kit stocks currency in the dock');
assert(
  currencySlots().every((b) => b.querySelector('.slot__n')),
  'every stack shows its count'
);
assert(
  currencySlots().every((b) => /held/.test(named(b))),
  'and says how many it holds out loud',
  named(currencySlots()[0])
);
assert(text('inv-currency').replace(/[0-9]/g, '') === '', 'currency is icons and counts, not names', text('inv-currency'));

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
assert($('craft-empty').hidden === false, 'bench starts empty');
assert($('craft-item').hidden === true, 'no item panel until something is placed');
assert($('craft-return').disabled === true, 'return disabled with an empty bench');

// --- putting a crystal on the bench ---------------------------------------
const crystalChip = filled('#inv-crystal')[0];
assert(!!crystalChip, 'a crystal is in the dock');

const inventoryBefore = invItems().length;
crystalChip.click();

assert($('craft-item').hidden === false, 'bench shows the selected item');
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
assert($('craft-return').disabled === false, 'return is now available');
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
// Currency is spent from the dock onto whatever is on the bench, so finding
// one means searching the dock — by aria-label, same as any other item.
const currencyButton = (name) =>
  currencySlots().find((b) => named(b).includes(name));

const heldCount = (name) =>
  Number(currencyButton(name)?.querySelector('.slot__n')?.textContent ?? 0) || 0;

const making = currencyButton('Shard of Making');
assert(!!making && !making.disabled, 'Shard of Making usable on a blank crystal');
assert(heldCount('Shard of Making') > 0, 'currency count shown on the stack');

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
  currencySlots().length >= 10,
  'the dock holds the whole spread of currency',
  String(currencySlots().length)
);
// Thirteen currencies that all looked the same made the icon decoration; the
// silhouette is what tells them apart before you have learned the names.
{
  const shapes = new Set(
    currencySlots().map((b) => b.querySelector('.icon path')?.getAttribute('d') ?? '?')
  );
  assert(
    shapes.size === currencySlots().length,
    'every currency has its own silhouette',
    `${shapes.size} shapes for ${currencySlots().length} stacks`
  );
}

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
$('craft-return').click();
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

$('craft-return').click();
crystalChip.click();

// --- closing it ---------------------------------------------------------
$('craft-return').click();
assert($('craft-empty').hidden === false, 'bench is empty again');
assert(invItems().length === inventoryBefore, 'item is still in the dock');
assert(all('.dock .slot--on').length === 0, 'nothing highlighted after closing');

// --- the shop buys against fragments --------------------------------------
// A separate window from crafting: one turns fragments into stock, the other
// spends stock on the item in front of you, and sharing a window meant that
// item scrolled away exactly when you went to buy something for it.
assert($('shop').hidden === true, 'the shop starts closed');
assert(!$('craft').contains($('workshop')), 'the shop is not inside crafting');
$('open-shop').click();
assert($('shop').hidden === false, 'the shop opens');

const buys = all('#workshop button.buy');
assert(buys.length >= 6, 'the shop lists recipes', String(buys.length));
const affordable = buys.find((b) => !b.disabled);
assert(!!affordable, 'at least one recipe is affordable');

// Prices were printing the raw wallet key, unpluralised — "8 fragment". Same
// class of leak as a modifier rendering `areaOfEffect`, and just as invisible
// until someone reads the button.
const prices = buys.map((b) => b.querySelector('.buy__cost')?.textContent ?? '');
assert(
  prices.every((p) => !/\b1?\d+ fragment\b(?!s)/.test(p)),
  'prices are pluralised, not raw ids',
  prices.find((p) => /\b\d+ fragment\b(?!s)/.test(p)) ?? ''
);
assert(
  buys.every((b) => b.querySelector('.icon')),
  'every recipe shows what you are buying'
);

// What you buy lands in the dock, not in the shop.
{
  const before = currencySlots().reduce(
    (n, b) => n + Number(b.querySelector('.slot__n')?.textContent ?? 0),
    0
  );
  affordable.click();
  const after = currencySlots().reduce(
    (n, b) => n + Number(b.querySelector('.slot__n')?.textContent ?? 0),
    0
  );
  assert(after > before || dockItems().length > 0, 'a purchase lands in the dock', `${before} -> ${after}`);
}
$('shop-close').click();
assert($('shop').hidden === true, 'the shop closes');

// --- the dock does not scroll, so capacity is visible ---------------------
// It used to be two rows with overflow-y:auto, which made the limit invisible:
// ninety crystals looked exactly like twelve. Every slot you can fill is now
// drawn, which is only honest if the count of slots IS the capacity.
const slotsIn = (sel) => all(`${sel} .slot`);
assert(
  slotsIn('#inv-crystal').length === slotsIn('#inv-gear').length,
  'crystals and gear get the same room',
  `${slotsIn('#inv-crystal').length} vs ${slotsIn('#inv-gear').length}`
);
assert(
  slotsIn('#inv-crystal').length >= 24,
  'the dock is deeper than the two rows it replaced',
  String(slotsIn('#inv-crystal').length)
);
// Currency is the column that gave up the width: a stack is one slot however
// deep it is, and there are only thirteen kinds.
assert(
  slotsIn('#inv-currency').length < slotsIn('#inv-crystal').length,
  'currency takes less room than the items it is spent on',
  `${slotsIn('#inv-currency').length} vs ${slotsIn('#inv-crystal').length}`
);
// Filling up is something you watch approaching, not something the report
// tells you afterwards.
assert(
  /\d+\/\d+/.test(text('inv-crystal-label')),
  'the column says how full it is',
  text('inv-crystal-label')
);

// --- the stash ------------------------------------------------------------
// A carry limit needs somewhere for the overflow to go that isn't the floor.
assert($('stash').hidden === true, 'the stash starts closed');
$('open-stash').click();
assert($('stash').hidden === false, 'the stash opens');

const stashSlots = () => all('#stash-slots .slot');
const stashed = () => all('#stash-slots .slot:not(.slot--empty)');
assert(stashSlots().length >= 10 && stashSlots().length <= 15,
  'it starts at a usable size', String(stashSlots().length));
assert(stashed().length === 0, 'and starts empty');

// You move things in by clicking the DOCK, not a list inside the popup —
// which only works because every popup stops above the dock.
{
  const before = dockItems().length;
  const target = filled('#inv-crystal')[0];
  assert(/stash/i.test(named(target)), 'the dock offers to stash it', named(target));
  target.click();
  assert(stashed().length === 1, 'the item is in the stash');
  assert(dockItems().length === before - 1, 'and out of the bag', String(dockItems().length));
  assert(text('stash-count').startsWith('1'), 'the count keeps up', text('stash-count'));

  // And back out again. A stash you cannot empty is a bin.
  stashed()[0].click();
  assert(stashed().length === 0, 'it comes back out');
  assert(dockItems().length === before, 'and returns to the bag', String(dockItems().length));
}

// Space is bought with fragments, from here, because here is where you find
// out you need it.
{
  const slotsBefore = stashSlots().length;
  const purse = () => Number(text('wallet').match(/\d+/)?.[0] ?? 0);
  const before = purse();
  const cost = Number($('stash-grow').textContent.match(/(\d+) fragments/)?.[1] ?? 0);
  assert(cost > 0, 'the price is on the button', $('stash-grow').textContent);
  assert($('stash-grow').disabled === false, 'and the dev kit can afford it');
  $('stash-grow').click();
  assert(stashSlots().length > slotsBefore, 'buying adds slots',
    `${slotsBefore} -> ${stashSlots().length}`);
  assert(purse() === before - cost, 'and costs what it said',
    `${before} -> ${purse()}, asked ${cost}`);
  // It gets steeper, so storage stays a decision against buying a crystal.
  const next = Number($('stash-grow').textContent.match(/(\d+) fragments/)?.[1] ?? 0);
  assert(next > cost, 'the next block costs more', `${cost} then ${next}`);
}

$('stash-close').click();
assert($('stash').hidden === true, 'the stash closes');
$('open-craft').click();

// --- the map is the floor, crafting is a popup over it -------------------
// The dock must stay reachable underneath every popup: it holds both the item
// crafting works on AND the currency it is spent with, so covering it would
// break the only way to do either.
assert($('craft').hidden === false, 'crafting is a popup, not a page');
assert(
  !$('craft').contains($('inv-crystal')),
  'the dock lives outside every popup'
);
assert(
  !$('craft').contains($('inv-currency')),
  'and so does the currency you spend from it'
);
$('craft-close').click();
assert($('craft').hidden === true, 'crafting closes');
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
// underneath crafting rather than being left for.
const viewport = document.querySelector('.viewport');
assert(viewport.classList.contains('viewport--locked'), 'a running map fills the frame');
$('open-craft').click();
assert($('craft').hidden === false, 'crafting opens over a live run');
assert($('run-stagewrap').hidden === false, 'and the run is still going underneath');
assert(
  filled('#inv-gear').every((b) => !b.disabled),
  'the dock answers to crafting while it is open'
);
$('craft-close').click();
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

// Picking a slot lights up what fits it — in the DOCK, not in a second copy
// of your inventory inside the window. The gear is already on screen; listing
// it again is something you have to scroll past to reach the real thing.
assert($('sheet-pick').hidden === true, 'no pick hint until you choose a slot');
assert(all('.dock .slot--on').length === 0, 'and nothing is lit');

const emptySlot = all('#sheet-slots .slotcell__btn').find(
  (b) => !b.classList.contains('slotcell__btn--worn')
);
assert(!!emptySlot, 'a slot is empty after unequipping');
emptySlot.click();
assert($('sheet-pick').hidden === false, 'picking a slot says what to do next');

const lit = all('.dock .slot--on');
assert(lit.length > 0, 'and lights up what fits, in the dock');
assert(
  lit.every((b) => b.closest('.dockcol').querySelector('#inv-gear')),
  'only gear lights up — a crystal fits no equipment slot'
);
// Everything else in the dock goes inert: there is nothing to do with a
// crystal on the character sheet.
assert(
  filled('#inv-crystal').every((b) => b.disabled),
  'crystals are inert while equipping'
);
assert(/wear as/i.test(named(lit[0])), 'the lit slot says what clicking does', named(lit[0]));

lit[0].click();
assert(
  all('#sheet-slots .slotcell__btn--worn').length === 8,
  're-equipping fills the slot'
);
assert(invItems().length === invBefore, 'equipped item leaves the inventory');
assert($('sheet-pick').hidden === true, 'and the pick hint clears');
assert(all('.dock .slot--on').length === 0, 'along with the highlight');

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
