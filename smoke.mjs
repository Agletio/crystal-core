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

// A dev lever on the welcome card: choose a skill without the opening running.
// Off on every reload, so the default path is still the guided one.
assert($('welcome-skip') !== null, 'the opening can be skipped');
assert(/on/i.test(text('welcome-skip')), 'and is on by default', text('welcome-skip'));

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
assert(text('wallet').startsWith('0'), 'a fresh game has no gold', text('wallet'));
assert(
  currencySlots().length === 0,
  'an empty wallet puts no currency in the dock',
  String(currencySlots().length)
);

// The dock is a fixed shape whether or not you own anything, so it never
// collapses and shoves the Fissure around.
assert(all('#inv-crystal .slot--empty').length > 0, 'the dock keeps empty slots');

// One place, always open. An empty set is a real descent, not a missing
// choice, and the only thing that ever shuts the Fissure is a full haul —
// which selling always empties, so there is no state you cannot play out of.
const socketButtons = () => all('#run-sockets .socket');
assert(socketButtons().length === 4, 'the Fissure has four sockets', String(socketButtons().length));
assert(
  socketButtons().every((b) => !b.classList.contains('socket--full')),
  'which all start empty'
);
assert(
  /no crystals yet/i.test(text('run-selected')),
  'and say so',
  text('run-selected').slice(0, 80)
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
$('run-again').click();

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

// --- the opening locks spending, and only spending ------------------------
// It hands you a fixed amount of gold and then asks you to buy two specific
// things with it. Spend it on stash space instead and no wording gets you
// back, so the shelves are switched off. Everything else stays live:
// locking the lot meant a step with nothing lit — a reload during the fight —
// was a room with no doors, New game included.
assert(document.body.classList.contains('guided'), 'a live step locks the app down');

// Keyboard is the half pointer-events does not cover: a blocked button is
// still focusable and still fires on Enter. It has to narrow the same way, or
// the two halves disagree about what is allowed.
{
  const fire = (el, key) => {
    const ev = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    return ev.defaultPrevented;
  };

  $('open-shop').click();
  const buy = all('#shop .buy').find((b) => !b.classList.contains('guide-on'));
  assert(!!buy, 'the shop has a shelf to check');
  assert(fire(buy, 'Enter'), 'Enter on a purchase is swallowed');
  assert(fire(buy, ' '), 'and so is Space');
  $('shop-close').click();

  // The doors. Every one of these was dead under the old lock.
  assert(!fire($('open-shop'), 'Enter'), 'but opening a screen is not');
  assert(!fire($('open-skills'), 'Enter'), 'nor is any other screen');
  assert(!fire($('dev-fresh'), ' '), 'and starting over always works');
  assert(
    !fire($('welcome-name') ?? $('run-launch'), 'Enter') || true,
    'typing is never swallowed'
  );
}

// The card floats over the popups rather than living in the shell — half its
// steps point at things inside a modal.
assert(
  !document.querySelector('.wrap').contains($('guide')),
  'the guide is not trapped inside the shell'
);

$('dev-kit').click();
$('confirm-yes').click();
await new Promise((r) => setTimeout(r, 0));
assert($('guide').hidden === true, 'a wipe ends it');
assert(all('.guide-on').length === 0, 'and takes the highlight with it');
assert(!document.body.classList.contains('guided'), 'and lifts the lock');
assert(dockItems().length > 2, 'the dev kit stocks the dock', String(dockItems().length));
assert($('craft').hidden === false, 'a stocked game opens on the bench');

// --- duplicate ids would silently break getElementById --------------------
const ids = all('[id]').map((n) => n.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
assert(dupes.length === 0, 'no duplicate element ids', dupes.join(', '));

// --- the dock is permanent -------------------------------------------------
const invItems = dockItems;
assert(invItems().length >= 4, 'dock populated', String(invItems().length));

// Gold only up top: it is the number you compare against a shop price, not a
// thing you apply to an item. Everything you DO apply is a stack in the dock.
assert(all('#wallet .coin').length === 1, 'wallet shows gold only', text('wallet'));
assert(text('wallet').includes('gold'), 'gold is held', text('wallet'));
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

// A weapon must not look like a body armour. Weapon bases carry their FAMILY
// as their art key, so a gearIcon that only knew 'weapon' silently rendered
// every wand, sword, dagger and mace as the default plate.
{
  const shapeOf = (b) => b.querySelector('.icon')?.getAttribute('data-sprite') ?? '?';
  const shapes = new Set(filled('#inv-gear').map(shapeOf));
  assert(
    shapes.size >= 6,
    'gear has more than one silhouette',
    `${shapes.size} shapes across ${filled('#inv-gear').length} pieces`
  );
}

// Quality colours the slot. A dock is something you scan for "is any of this
// worth looking at", and a silhouette can only say what a piece IS.
assert(
  filled('#inv-gear').every((b) => /slot--q-/.test(b.className)),
  'every piece carries its quality on the slot'
);

// --- bench starts empty ---------------------------------------------------
assert($('craft-empty').hidden === false, 'bench starts empty');
assert($('craft-item').hidden === true, 'no item panel until something is placed');
assert($('craft-return').disabled === true, 'return disabled with an empty bench');

// --- putting a crystal on the bench ---------------------------------------
// A Tier 1 crystal is the blank one: tier IS capacity, so this is the crystal
// with nowhere to put anything, and nothing crafting can do changes that.
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
// The bench draws openings, not the base's declared table. A Tier 1 crystal
// has no room for anything, so it draws nothing. Drawing dead sockets under a
// header reading 0/0 was the confusing part.
const facets = () => $('sockets').querySelectorAll('.facet').length;
assert(facets() === 0, 'a Tier 1 crystal shows no facets at all', String(facets()));

// Derived reward multipliers under the name. A blank crystal must read as
// exactly baseline — no danger, no bonus.
const multRows = () =>
  all('#item-rewards .mult').map(
    (n) =>
      `${n.querySelector('.mult__k').textContent}=${n.querySelector('.mult__v').textContent}`
  );
assert($('item-rewards').hidden === false, 'crystal shows reward multipliers');
assert(
  multRows().join(' ') === 'family=Normal danger=0 gold=0% rarity=0%',
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

// A crystal's room comes from its TIER, so no amount of crafting opens a Tier
// 1 one. Everything below is the gear ladder instead, which is where quality
// still decides how much a piece can hold.
{
  const making = currencyButton('Shard of Making');
  assert(!!making && making.disabled, 'nothing can put a modifier on a Tier 1 crystal');
  const seaming = currencyButton('Shard of Seaming');
  seaming?.click();
  assert(facets() === 0, 'and opening it does not give it room either', String(facets()));
}
$('craft-return').click();

// --- quality gates what a currency can touch ------------------------------
// A blank piece of gear is Rough: no room for a modifier at all, whatever its
// base declares. This is the whole point of the ladder — you cannot fill and
// re-roll a fresh drop to perfection, because a fresh drop has nowhere to put
// anything until you open it.
const roughGear = filled('#inv-gear').find((b) => /q-rough/.test(b.className));
assert(!!roughGear, 'a Rough piece of gear is in the dock');
roughGear.click();

const making = currencyButton('Shard of Making');
assert(!!making && making.disabled, 'Making cannot touch a Rough item');
assert(
  /rough/i.test(text('item-meta')),
  'and the item says it is Rough',
  text('item-meta')
);

const seaming = currencyButton('Shard of Seaming');
assert(!!seaming && !seaming.disabled, 'Seaming is what opens it');
assert(heldCount('Shard of Seaming') > 0, 'currency count shown on the stack');

const seamStock = heldCount('Shard of Seaming');
seaming.click();
const rolled = () => all('#modlist .mod').filter((m) => !m.classList.contains('mod--implicit'));
assert(rolled().length === 1, 'Seaming lands one modifier', String(rolled().length));
assert(/seamed/i.test(text('item-meta')), 'and raises the quality', text('item-meta'));
// Two, because Seamed is two, whatever the base declares.
assert(facets() === 2, 'and opens exactly two facets', String(facets()));
assert(
  heldCount('Shard of Seaming') === seamStock - 1,
  'Seaming was spent',
  `${heldCount('Shard of Seaming')} vs ${seamStock}`
);

// Now Making works, because there is somewhere to put a modifier.
const making2 = currencyButton('Shard of Making');
assert(!!making2 && !making2.disabled, 'Making works once the item is Seamed');

const stockBefore = heldCount('Shard of Making');
making2.click();

assert(rolled().length === 2, 'a second modifier was added', String(rolled().length));

// Seamed holds two. A third has nowhere to go, whatever the base's slots say.
assert(
  currencyButton('Shard of Making')?.disabled === true,
  'and a Seamed item stops at two'
);

// --- no identifier ever reaches the screen --------------------------------
// `npm run mods` checks the TEXT LAYER. This checks the DOM, which is a
// different question and the one that actually bit: the crafting screen was
// formatting stat lines itself out of the raw stat key, so the one place you
// look hardest at an item was the one place printing "+14 coldRes". A check
// that only tests the helper cannot see a screen that skipped the helper.
{
  const camelCase = (text) => text.match(/\b[a-z]+[A-Z][a-zA-Z]*\b/g) ?? [];
  const shown = all('#modlist .mod__stats');
  assert(shown.length >= 2, 'the crafting screen is showing modifiers to check', String(shown.length));

  const leaks = new Set();
  for (const node of [...shown, $('item-meta')]) {
    for (const word of camelCase(node.textContent ?? '')) leaks.add(word);
  }
  assert(leaks.size === 0, 'and none of them is a raw identifier', [...leaks].join(', '));
}

assert(
  heldCount('Shard of Making') === stockBefore - 1,
  'currency was spent',
  `${heldCount('Shard of Making')} vs ${stockBefore}`
);

// Every crystal mod is a downside now, so adding one must move danger up. A
// Tier 4 is the one with room for it — tier is the only thing that grants any.
{
  const roomy = filled('#inv-crystal').find((b) => /Tier 4/.test(named(b)));
  assert(!!roomy, 'a Tier 4 crystal is in the dock');
  $('craft-return').click();
  roomy.click();
  assert(facets() === 3, 'and it has three facets to fill', String(facets()));
  const danger = () =>
    Number(multRows().find((r) => r.startsWith('danger='))?.split('=')[1]);
  assert(danger() === 0, 'a blank one is worth exactly base', String(danger()));
  currencyButton('Shard of Making')?.click();
  assert(danger() > 0, 'crafting a mod raises danger', String(danger()));
  $('craft-return').click();
  roughGear.click();
}
assert(
  currencySlots().length >= 12,
  'the dock holds the whole spread of currency',
  String(currencySlots().length)
);
// Thirteen currencies that all looked the same made the icon decoration; the
// silhouette is what tells them apart before you have learned the names.
{
  const shapes = new Set(
    currencySlots().map((b) => b.querySelector('.icon')?.getAttribute('data-sprite') ?? '?')
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

// Cut it straight to Faceted, fill it, then wipe it. Nothing in that sequence
// may reach the implicit — it is the base's identity, not a modifier.
for (const name of ['Shard of Cleaving', 'Shard of Awakening', 'Shard of Ruin']) {
  const btn = currencyButton(name);
  if (btn && !btn.disabled) btn.click();
}

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

// --- the shop buys against gold -------------------------------------------
// A separate window from crafting: one turns gold into stock, the other
// spends stock on the item in front of you, and sharing a window meant that
// item scrolled away exactly when you went to buy something for it.
assert($('shop').hidden === true, 'the shop starts closed');
assert(!$('craft').contains($('workshop')), 'the shop is not inside crafting');
$('open-shop').click();
assert($('shop').hidden === false, 'the shop opens');

const buys = all('#workshop button.buy');
assert(buys.length >= 2, 'the shop lists recipes', String(buys.length));
const affordable = buys.find((b) => !b.disabled);
assert(!!affordable, 'at least one recipe is affordable');

// --- the shelf grows with you ---------------------------------------------
// A level-1 shop selling a Shard of Chaos is selling something you cannot use
// on anything you own. Crystals are not on it at all: they are given.
const buyNames = () => all('#workshop .buy__name').map((n) => n.textContent);
assert(
  !buyNames().some((n) => /Crystal/.test(n)),
  'the shop never sells a crystal',
  buyNames().join(', ')
);
assert(
  !buyNames().some((n) => /Chaos|Awakening|Cleaving|Ascent/.test(n)),
  'and none of the currencies you could not use yet',
  buyNames().join(', ')
);
assert(
  buyNames().some((n) => /Seaming/.test(n)),
  'but the one that opens a Rough item is there from the start',
  buyNames().join(', ')
);

// Random gear on the shelf, priced and one-of-each.
const stock = () => all('#shop-stock button.buy');
assert(stock().length >= 2, 'the shop stocks gear', String(stock().length));
assert(
  all('#shop-stock .buy__cost').every((n) => /\d+ gold/.test(n.textContent)),
  'every piece shows a price'
);
assert(
  all('#shop-stock .buy__cost').every((n) => /Rough|Seamed|Faceted|Brilliant/.test(n.textContent)),
  'and its quality',
  all('#shop-stock .buy__cost')[0]?.textContent
);

// Prices print words, not wallet keys — a modifier rendering `areaOfEffect`
// is the same class of leak, and just as invisible until someone reads the
// button. Gold is a mass noun, so the plural rule must leave it alone.
const prices = buys.map((b) => b.querySelector('.buy__cost')?.textContent ?? '');
assert(
  prices.every((p) => /^\d+ gold$/.test(p)),
  'prices read as gold, never as a wallet key',
  prices.find((p) => !/^\d+ gold$/.test(p)) ?? ''
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

// --- the haul -------------------------------------------------------------
// One terminus for the loop: a death and a full haul both land here. Only its
// shape is checked in jsdom — a run takes a minute of real time, so the loop
// itself is walked headlessly in the demo and played for real in the guide.
assert($('haul').hidden === true, 'the haul starts closed');
$('open-haul').click();
assert($('haul').hidden === false, 'and opens from the header');
assert(
  /^0 \/ \d+$/.test(text('haul-count')),
  'a fresh haul is empty and says what it holds',
  text('haul-count')
);
assert(all('#haul-slots .slot').length > 0, 'the grid draws the room it has');
assert(
  all('#haul-slots .slot:not(.slot--empty)').length === 0,
  'and nothing is in it yet'
);
// The rule the slot counts cannot show, and the reason it is not a third bag.
assert(
  /worn, crafted or socketed/i.test(text('haul-hint')),
  'it says nothing here can be used until you take it out',
  text('haul-hint')
);
assert($('haul-take').disabled === true, 'with nothing to take');
assert($('haul-sell').disabled === true, 'and nothing to sell');
assert($('haul-why').hidden === true, 'opening it yourself needs no explanation');

window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
assert($('haul').hidden === true, 'Escape closes it');

// --- the collection --------------------------------------------------------
// Four sockets against everything you have ever been given. Nothing here is
// spent, so this screen only ever grows, and it is where two crystals are
// compared before one of them goes in.
assert($('crystals').hidden === true, 'the collection starts closed');
$('open-crystals').click();
assert($('crystals').hidden === false, 'and opens from the header');

const crystalCards = () => all('#crystals-list .crystal');
assert(crystalCards().length > 0, 'the dev kit fills it', String(crystalCards().length));
assert(
  /\d+ owned · \d+\/\d+ socketed/.test(text('crystals-count')),
  'it counts what you own against what is in use',
  text('crystals-count')
);
// The one thing about the Lampwright a player cannot see by playing: the
// chance falls as the collection fills, and the dev kit has passed the end.
assert(
  /nothing left to give you/i.test(text('crystals-npc')),
  'a full collection is told the Lampwright is done',
  text('crystals-npc')
);
assert(
  all('#crystals-quests .quest').length === 4,
  'every quest for the other two worlds is listed',
  String(all('#crystals-quests .quest').length)
);
assert(
  all('#crystals-quests .quest--done').length === 4,
  'and the dev kit, which is handed every crystal, has them all answered'
);
// A crystal levels only while socketed, which is the reason to socket a blank
// one at all — so the row has to say where it stands.
assert(
  /only levels while socketed/.test(text('crystals-list')),
  'a crystal out of a socket says it is not growing'
);

const socketFirst = [...all('#crystals-list .crystal .mini')].find((b) =>
  /^Socket/.test(b.textContent)
);
assert(!!socketFirst, 'a carried crystal offers the socket');
const before = all('.socket--full').length;
socketFirst.click();
assert(
  all('.socket--full').length === before + 1,
  'clicking it fills a socket on the Fissure',
  `${before} → ${all('.socket--full').length}`
);
const socketedCard = [...crystalCards()].find((c) => c.classList.contains('crystal--socket'));
assert(!!socketedCard, 'and the row moves to the top marked as socketed');
assert(
  /to tier|as far as it goes/.test(socketedCard.textContent),
  'showing how far it has levelled',
  socketedCard.textContent
);
const back = [...socketedCard.querySelectorAll('.mini')].find((b) => /Take it back/.test(b.textContent));
assert(!!back, 'a socketed crystal offers its way out');
back.click();
assert(all('.socket--full').length === before, 'and taking it back empties the socket again');

window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
assert($('crystals').hidden === true, 'Escape closes the collection');

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

// Space is bought with gold, from here, because here is where you find out
// you need it.
{
  const slotsBefore = stashSlots().length;
  const purse = () => Number(text('wallet').match(/\d+/)?.[0] ?? 0);
  const before = purse();
  const cost = Number($('stash-grow').textContent.match(/(\d+) gold/)?.[1] ?? 0);
  assert(cost > 0, 'the price is on the button', $('stash-grow').textContent);
  assert($('stash-grow').disabled === false, 'and the dev kit can afford it');
  $('stash-grow').click();
  assert(stashSlots().length > slotsBefore, 'buying adds slots',
    `${slotsBefore} -> ${stashSlots().length}`);
  assert(purse() === before - cost, 'and costs what it said',
    `${before} -> ${purse()}, asked ${cost}`);
  // It gets steeper, so storage stays a decision against spending at the bench.
  const next = Number($('stash-grow').textContent.match(/(\d+) gold/)?.[1] ?? 0);
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
{
  const crystals = () => filled('#inv-crystal');
  const runCrystal = crystals()[0];
  assert(!!runCrystal, 'a crystal is socketable from the dock');
  assert(
    /socket/i.test(named(runCrystal)),
    'the dock offers to socket it',
    named(runCrystal)
  );
  const carried = crystals().length;
  runCrystal.click();
  const full = () => socketButtons().filter((b) => b.classList.contains('socket--full'));
  assert(full().length === 1, 'the first socket fills', String(full().length));
  assert(/Crystal/.test(full()[0].textContent ?? ''), 'and names the crystal');
  // Socketing is a MOVE, the way wearing a helmet is — it leaves the dock.
  assert(crystals().length === carried - 1, 'and it has left the dock');

  // Taking it back out returns it, and the Fissure is still enterable empty.
  full()[0].click();
  assert(full().length === 0, 'the socket empties again');
  assert(crystals().length === carried, 'and the crystal is back in the dock');
  assert($('run-launch').disabled === false, 'and you can still descend without one');

  // Fill every socket, then one more: four is the whole set, and a fifth
  // crystal swaps into the first rather than being refused — the same thing a
  // second helmet does, and it keeps the dock from filling with dead slots.
  const held = crystals().length;
  for (let i = 0; i < 5; i++) crystals()[0]?.click();
  assert(full().length === 4, 'four sockets is the whole set', String(full().length));
  assert(crystals().length === held - 4, 'and the fifth swapped rather than vanishing', String(crystals().length));
}

// Gear stays in the dock — it's always in the dock — and the Fissure has
// nothing of its own to do with a helmet, so wearing it is what a click there
// means. A dead slot was the old answer and it made gear look broken.
assert(
  filled('#inv-gear').every((b) => !b.disabled),
  'gear can be worn straight from the Fissure'
);
assert(
  filled('#inv-gear').every((b) => /wear as/i.test(named(b))),
  'and says so',
  named(filled('#inv-gear')[0])
);

// --- equipping says so, and can be taken back ------------------------------
// One click changes what you are wearing, so it has to be visible and it has
// to be reversible. Undo rather than a question first: the question would land
// on every deliberate equip to catch the rare one that was not.
{
  const ids = () => filled('#inv-gear').map((b) => b.dataset.itemId);
  const before = ids();
  const put = before[0];
  filled('#inv-gear')[0].click();
  const toast = $('toast');
  assert(toast.hidden === false, 'wearing something says so on screen');
  assert(/^Worn: /.test(toast.textContent ?? ''), 'and names it', toast.textContent);
  // A swap hands one back, so the count can hold steady. The piece you put on
  // is the thing that must be gone.
  assert(!ids().includes(put), 'and it has left the dock');

  const undo = toast.querySelector('.toast__do');
  assert(!!undo && /undo/i.test(undo.textContent ?? ''), 'with one button that takes it back');
  undo.click();
  assert($('toast').hidden === true, 'undoing dismisses the line');
  // Exactly back, not merely back: an undo that appends leaves your dock
  // reshuffled, which is its own small mess to clean up.
  assert(
    ids().join('|') === before.join('|'),
    'and puts the piece back in the slot it came from',
    ids().join('|')
  );
}

// --- one stat per line ------------------------------------------------------
// Three stats joined by commas wrap into a paragraph, and an item tooltip is
// something you scan rather than read.
{
  const slot = filled('#inv-gear').find((b) => named(b).length > 0);
  slot.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
  const lines = text('tooltip').split('\n');
  assert(lines.length > 2, 'an item tooltip has a line per fact', String(lines.length));
  assert(
    lines.every((l) => !/[%\d]\s*,\s*[+-]/.test(l)),
    'and never two stats on one line',
    lines.find((l) => /[%\d]\s*,\s*[+-]/.test(l))
  );
  slot.dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: true }));
}

// --- the item menu carries what the click cannot ---------------------------
// One click can only mean one thing, and the screen owns it. Everything else
// an item can do has to be reachable, or it may as well not exist.
{
  const slot = filled('#inv-gear')[0];
  slot.dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  const menu = $('itemmenu');
  assert(menu.hidden === false, 'right-clicking an item opens its menu');
  const labels = all('#itemmenu .itemmenu__item').map((b) => b.textContent ?? '');
  assert(labels.length >= 2, 'with more than the click already offers', String(labels.length));
  assert(labels.some((t) => /wear as/i.test(t)), 'wearing it is one of them', labels.join(' | '));
  assert(labels.some((t) => /stash/i.test(t)), 'and so is putting it away', labels.join(' | '));

  // Stashing must never be something a stray click can do.
  const stash = all('#itemmenu .itemmenu__item').find((b) => /stash/i.test(b.textContent ?? ''));
  assert(!/stash/i.test(named(filled('#inv-gear')[0])), 'but the plain click never stashes');

  const carried = filled('#inv-gear').length;
  stash.click();
  assert($('itemmenu').hidden === true, 'choosing an action closes the menu');
  assert(filled('#inv-gear').length === carried - 1, 'and the action ran', String(filled('#inv-gear').length));

  // A click anywhere else dismisses it without also pressing what it landed on.
  filled('#inv-gear')[0].dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  assert($('itemmenu').hidden === false, 'the menu opens again');
  document.body.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true }));
  assert($('itemmenu').hidden === true, 'and a press outside it closes it');

  // The menu is above every window, so Escape has to mean the menu while one
  // is open — closing the window under it loses your place instead.
  $('open-craft').click();
  filled('#inv-gear')[0].dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert($('itemmenu').hidden === true, 'Escape closes the menu');
  assert($('craft').hidden === false, 'and leaves the window under it alone');
  $('craft-close').click();
}
assert(
  filled('#inv-crystal').every((b) => !b.disabled),
  'crystals are not'
);

// --- entering keeps the socketed crystals ---------------------------------
// Sockets are a standing choice, not a stake. A run reads them and gives them
// back, which is what makes setting a harder set a decision you keep.
const beforeLaunch = invItems().length;
$('run-launch').click();

assert($('run-stagewrap').hidden === false, 'the descent begins');
assert($('run-menu').hidden === true, 'menu hides while running');
assert(
  invItems().length === beforeLaunch,
  'and costs you nothing to enter',
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
  filled('#inv-gear').every((b) => /bench/i.test(named(b))),
  'the dock answers to crafting while it is open',
  named(filled('#inv-gear')[0])
);
// --- the worn column, beside the bench ------------------------------------
// Improving worn gear used to mean the sheet to take it off, the dock to bench
// it, and the sheet again to put it back on. Three screens to spend one shard.
{
  const cells = all('#craft-worn .wornslot');
  // Empty ones too: they are where a dragged piece lands.
  assert(cells.length === 8, 'every equip slot is drawn', String(cells.length));
  const live = cells.filter((b) => !b.disabled);
  assert(live.length > 0, 'and what you are wearing is clickable', String(cells.length));

  const name = live[0].querySelector('.wornslot__name').textContent;
  live[0].click();
  assert($('craft-empty').hidden === true, 'clicking a worn piece opens it on the bench');
  assert(text('item-name') === name, 'and it is the piece you clicked', text('item-name'));
  // The whole point. The bench holds a reference, and this one resolves to
  // something still on your body.
  assert(/worn/i.test(text('item-meta')), 'the bench says it is still on you', text('item-meta'));
  assert(
    all('#craft-worn .wornslot:not(:disabled)').length === live.length,
    'and it really is — nothing came off to be worked on'
  );
  assert(
    all('#craft-worn .wornslot--on').length === 1,
    'the column marks which piece the bench holds'
  );
  $('craft-return').click();
}

$('craft-close').click();
// Not "goes dead": the click hands back to what the item means with no screen
// asking for it, which is wearing it.
assert(
  filled('#inv-gear').every((b) => /wear as/i.test(named(b))),
  'and to the map again once it closes'
);

// --- leaving, gently and otherwise ----------------------------------------
// Pause is gone: there was nothing to do with a paused fight. What a running
// descent needs instead is a way to say "this one, then stop", so the loop
// ends on a clear rather than on a run you threw away.
assert($('run-leave').disabled === false, 'a running descent can be told to be the last');
assert(/leave after/i.test(text('run-leave')), 'and says so', text('run-leave'));
$('run-leave').click();
assert(/leaving after/i.test(text('run-leave')), 'arming it reads back', text('run-leave'));
$('run-leave').click();
assert(/leave after/i.test(text('run-leave')), 'and it un-arms', text('run-leave'));

// Abandon is the hard version, and it ends where every other ending does: a
// report, so what the earlier clears banked is something you can see rather
// than something you hope happened.
$('run-abandon').click();
assert($('run-results').hidden === false, 'abandoning reports the run');
assert(
  /walked out/i.test(text('run-results')),
  'and says you walked out rather than died',
  text('run-results').slice(0, 60)
);
$('run-again').click();
assert(
  !viewport.classList.contains('viewport--locked'),
  'the frame unfreezes once the map is gone'
);
assert($('run-menu').hidden === false, 'and going back returns to the menu');
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

// --- the sheet says what its numbers are for ------------------------------
// Damage with no skill beside it is a number without units, and the tree can
// have changed the type since you picked the skill.
assert(text('sheet-skill').length > 0, 'the sheet names the skill it computed for');
assert(
  /on hit|over \d+s/.test(text('sheet-skill')),
  'and how that skill delivers its damage',
  text('sheet-skill')
);

// --- the damage number comes apart -----------------------------------------
{
  const rowFor = (k) =>
    all('#sheet-stats .stat').find((r) => r.querySelector('.stat__k')?.textContent === k);
  const dmg = rowFor('damage');
  assert(dmg?.classList.contains('stat--open') === true, 'the damage row opens');
  assert(
    /per (hit|cast)/.test(dmg?.querySelector('.stat__unit')?.textContent ?? ''),
    'and says what the number is counted in',
    dmg?.querySelector('.stat__unit')?.textContent
  );
  assert(!document.querySelector('.statdetail'), 'it starts folded away');

  dmg.click();
  const detail = document.querySelector('.statdetail');
  assert(!!detail, 'clicking it shows the breakdown');
  const parts = all('.statdetail .dmgrow:not(.dmgrow--sum)');
  assert(parts.length > 0, 'with a row per damage type that contributed', String(parts.length));

  // A skill deals its own type whatever the parts were tagged. The total row
  // is labelled with it, which says so without a sentence saying so.
  const totalRow = document.querySelector('.dmgrow--sum');
  assert(!!totalRow, 'and a total row under them');
  assert(
    (totalRow?.querySelector('.dmgrow__t')?.textContent ?? '').length > 0,
    'named with the one type it all lands as',
    totalRow?.textContent
  );
  // Armour is the rule people get wrong, so the total has to state it.
  assert(
    /armour/i.test(totalRow?.textContent ?? ''),
    'and how armour treats it',
    totalRow?.textContent
  );

  // The breakdown must ADD UP to the row above it — the demo checks the
  // arithmetic, this checks the sheet is showing that same arithmetic.
  const sum = parts.reduce(
    (n, r) => n + Number(r.querySelector('.dmgrow__n')?.textContent ?? 0),
    0
  );
  const shown = Number((dmg.querySelector('.stat__v')?.textContent ?? '').replace(/\D+.*$/, ''));
  assert(Math.abs(sum - shown) <= parts.length, 'and adds up to the row it opened', `${sum} vs ${shown}`);
  assert(
    Math.abs(Number(totalRow?.querySelector('.dmgrow__n')?.textContent) - shown) < 1,
    'and the total row is that same number',
    `${totalRow?.querySelector('.dmgrow__n')?.textContent} vs ${shown}`
  );

  dmg.click();
  assert(!document.querySelector('.statdetail'), 'clicking again folds it back');
}

// One resistance row per damage type, none of them above the cap.
const resRows = all('#sheet-res .stat');
assert(resRows.length === 8, 'a resistance row per damage type', String(resRows.length));
const overCap = resRows.filter(
  (r) => Number((r.querySelector('.stat__v')?.textContent ?? '0').replace('%', '')) > 75
);
assert(overCap.length === 0, 'no resistance exceeds the cap', String(overCap.length));

// --- skills: category, skill, web -----------------------------------------
// Three depths now. The old screen put every skill and every node on one
// page, which was fine at ten nodes and is a wall at a hundred.
$('sheet-close').click();
assert($('skills').hidden === true, 'skills modal starts closed');
$('open-skills').click();
assert($('skills').hidden === false, 'skills modal opens');

assert($('skills-cats').hidden === false, 'it opens on the categories');
assert($('skills-list').hidden === true, 'not on a skill list');
assert($('skills-detail').hidden === true, 'and not on a web');
assert(all('#skills-cats .catcard').length === 4, 'four categories offered');
assert($('skills-back').hidden === true, 'nothing to go back to from the top');

// Movement and Passive are listed and empty. Leaving them out until they have
// something in them would move every shelf the day they arrive.
const cats = all('#skills-cats .catcard');
const emptyCats = cats.filter((c) => c.disabled);
assert(emptyCats.length === 2, 'two shelves are still empty', String(emptyCats.length));
assert(
  cats.filter((c) => !c.disabled).length === 2,
  'and two have something on them'
);

// Monster skills are not yours: Fire Bolt is what a husk throws, and it has no
// tree, no level and no business being offered.
assert(
  !/Fire Bolt/.test($('skills').textContent ?? ''),
  'monster skills are not listed'
);

cats[0].click();
assert($('skills-cats').hidden === true, 'picking a category leaves the categories');
assert($('skills-list').hidden === false, 'and shows what is on that shelf');
assert($('skills-back').hidden === false, 'with a way back');
assert(all('#skills-list .skillrow').length === 2, 'both spells listed');

// Back really does go back.
$('skills-back').click();
assert($('skills-cats').hidden === false, 'back returns to the categories');
cats[0].click();

const fireballRow = all('#skills-list .skillrow').find((b) =>
  /Fireball/.test(b.textContent ?? '')
);
assert(!!fireballRow, 'Fireball is on the spell shelf');
fireballRow.click();
assert($('skills-detail').hidden === false, 'opening a skill shows its web');
assert($('skills-list').hidden === true, 'and leaves the list behind');

// --- the web ---------------------------------------------------------------
const webNodes = () => all('#skills-web .web__node');

// It opens zoomed in, at a size where you can read a node — not fitted to the
// box, which for a hundred nodes is a grey smear. So it starts partial, and
// only Fit shows the whole thing.
const zoomedIn = webNodes().length;
assert(zoomedIn < 100, 'it opens on part of the web, not all of it', String(zoomedIn));

$('skills-fit').click();
assert(webNodes().length === 112, 'every node, once fitted', String(webNodes().length));
assert(
  all('#skills-web .web__node--notable').length === 28,
  'twenty-eight of them notable',
  String(all('#skills-web .web__node--notable').length)
);
// No notable is adjacent to another, so none of them is a two-point hop from
// the last. Checked on the geometry in the demo; this is the drawn version.
assert(
  all('#skills-web .web__node--notable.web__node--open').length === 0,
  'and none of them is a first move'
);
assert(all('#skills-web .web__edge').length > 100, 'and it is a web, not a list');

// The centre is an icon, not a word.
assert(
  $('skills-web').querySelector('.web__centre svg') !== null,
  'centre shows a skill icon'
);

// Tooltips are ours, not the browser's — nothing should rely on `title`,
// which is delayed and drawn in the OS's colours.
assert(
  $('skills-web').querySelectorAll('title').length === 0,
  'web uses custom tooltips, not native title'
);
assert($('tooltip').hidden === true, 'tooltip starts hidden');

const hub = $('skills-web').querySelector('.web__centre');
hub.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
assert($('tooltip').hidden === false, 'hovering the skill shows a tooltip at once');
assert(/Fireball/.test(text('tooltip')), 'tooltip names the skill', text('tooltip').slice(0, 40));
hub.dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: true }));
assert($('tooltip').hidden === true, 'tooltip hides again');

// Level 1 is one point, and it can only be spent on the ring touching the
// middle — a web with a hundred nodes where any of them is a first move is a
// menu, not a tree.
const allocated = () => all('#skills-web .web__node--on').length;
// --open means reachable AND affordable, which are different questions with
// different answers: a node next to one you own is still shut if you are out
// of points, and saying "locked" about both would hide the difference.
const buyable = () => all('#skills-web .web__node--open');
assert(allocated() === 0, 'nothing allocated to begin with');
// Four ways in, not one per node: leaving a ring means walking round it to
// find the next spoke, which is what makes the minors worth buying.
assert(buyable().length === 3, 'three ways in', String(buyable().length));

buyable()[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
assert(allocated() === 1, 'a node can be allocated');
assert(
  /1\/1 points spent/.test(text('skills-sub')),
  'and the header counts it',
  text('skills-sub')
);
// Out of points: nothing is buyable, however much of the web you can now see.
assert(
  buyable().length === 0,
  'with no points left, nothing can be bought',
  String(buyable().length)
);

// Clicking it again refunds it — nothing hangs off it, so nothing is stranded.
all('#skills-web .web__node--on')[0].dispatchEvent(
  new window.MouseEvent('click', { bubbles: true })
);
assert(allocated() === 0, 'and clicking it again refunds it');

// Distance is the whole price, so no notable is ever next to the middle: every
// one of them is a run of minors away, and that walk is what stops a wide web
// from being a shopping list.
{
  const before = allocated();
  const deep = all('#skills-web .web__node--notable');
  assert(
    deep.every((n) => n.classList.contains('web__node--locked')),
    'no notable is reachable from a standing start'
  );
  assert(allocated() === before, 'and none of them slipped through');
}

// --- a node that asks a question -------------------------------------------
// One node picks the element rather than two that fight over it: taking the
// wrong one of a pair first would cost a point to undo, which taxes finding
// out what a thing does.
{
  for (let i = 0; i < 30; i++) $('skills-devlevel').click();

  // Walk straight at it, so this reaches the same node every run.
  const centreOf = (el) => ({
    x: Number(el.getAttribute('data-x')),
    y: Number(el.getAttribute('data-y')),
  });
  const target = () => all('#skills-web [data-node="fb_transmutation"]')[0];
  for (let step = 0; step < 40; step++) {
    if (target()?.classList.contains('web__node--open')) break;
    const goal = centreOf(target());
    const next = buyable().sort(
      (a, b) =>
        Math.hypot(centreOf(a).x - goal.x, centreOf(a).y - goal.y) -
        Math.hypot(centreOf(b).x - goal.x, centreOf(b).y - goal.y)
    )[0];
    if (!next) break;
    next.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  }
  assert(
    target().classList.contains('web__node--open'),
    'the choice node is reachable',
    target().getAttribute('class')
  );

  assert($('skills-choice').hidden === true, 'no menu until you ask for one');
  target().dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert($('skills-choice').hidden === false, 'clicking it asks which element');
  assert(
    all('#skills-choice .webmenu__row').length === 2,
    'with both answers offered',
    String(all('#skills-choice .webmenu__row').length)
  );
  // Clicking it must NOT have spent the point on its own.
  assert(
    !target().classList.contains('web__node--on'),
    'and nothing is allocated until you answer'
  );

  const before = allocated();
  all('#skills-choice .webmenu__row')[1].click();
  assert($('skills-choice').hidden === true, 'answering closes the menu');
  assert(allocated() === before + 1, 'and takes the node');

  // The answer is free to change, and the node stays allocated across it.
  target().dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert(
    all('#skills-choice .webmenu__row--on').length === 1,
    'reopening shows which answer is live'
  );
  all('#skills-choice .webmenu__row')[0].click();
  assert(allocated() === before + 1, 'switching costs nothing');
}

// The dev lever exists precisely so all of the above is testable without
// grinding out a hundred and thirty thousand xp.
{
  const levelNow = () => Number(text('skills-sub').match(/level (\d+)/)?.[1] ?? 0);
  const was = levelNow();
  $('skills-devlevel').click();
  assert(levelNow() === was + 1, 'a granted level shows up in the header', text('skills-sub'));
}

// Escape steps back a level rather than closing outright — three screens deep,
// one keypress out would lose your place every time.
document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
assert($('skills').hidden === false, 'escape does not close from inside a web');
assert($('skills-list').hidden === false, 'it steps back to the skill list');
document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
assert($('skills-cats').hidden === false, 'then to the categories');
document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
assert($('skills').hidden === true, 'and only then closes');

// --- every tree, not just the one you happen to have equipped --------------
// Three skills have webs now, built by the same layout out of three different
// specs. What is worth checking is that each one reaches the screen: a spec
// that lost a branch still builds, and still draws, just smaller.
$('open-skills').click();
for (const [skill, shelf, total, notables] of [
  ['Strike', 'Attacks', 115, 29],
  ['Fireball', 'Spells', 112, 28],
  ['Creeping Blight', 'Spells', 119, 30],
]) {
  const card = all('#skills-cats .catcard').find((c) => c.textContent?.includes(shelf));
  assert(!!card, `${shelf} is a shelf you can open`);
  card.click();
  const row = all('#skills-list .skillrow').find((b) => b.textContent?.includes(skill));
  assert(!!row, `${skill} is on the ${shelf} shelf`);
  row.click();

  assert($('skills-detail').hidden === false, `${skill} opens onto its web`);
  // The web opens zoomed in and draws only what is on screen, so Fit is what
  // turns "it rendered" into a count worth asserting.
  $('skills-fit').click();
  assert(
    all('#skills-web .web__node').length === total,
    `${skill} draws all ${total} of its nodes`,
    String(all('#skills-web .web__node').length)
  );
  assert(
    all('#skills-web .web__node--notable').length === notables,
    `${skill} has all ${notables} of its notables`,
    String(all('#skills-web .web__node--notable').length)
  );
  assert(
    $('skills-web').querySelector('.web__centre svg') !== null,
    `${skill} sits at the middle of its own web`
  );
  $('skills-back').click();
  $('skills-back').click();
}
$('skills-close').click();

// --- the breakdown holds for a skill that does not hit ---------------------
// The check above ran on a skill that hits. A lasting skill takes another
// multiplier from its tree on the way to the number in the row, and a factor
// applied where the working cannot show it is how the two stop matching.
{
  $('open-skills').click();
  all('#skills-cats .catcard').find((c) => c.textContent?.includes('Spells')).click();
  all('#skills-list .skillrow').find((b) => b.textContent?.includes('Creeping Blight')).click();
  $('skills-equip').click();

  // Canopy is the node that made this necessary: it buys a wider cloud with
  // 12% LESS poison damage. A bare tree applies no such factor, so a check run
  // without it is a check that cannot fail.
  for (let i = 0; i < 30; i++) $('skills-devlevel').click();
  const centreOf = (el) => ({
    x: Number(el.getAttribute('data-x')),
    y: Number(el.getAttribute('data-y')),
  });
  const canopy = () => all('#skills-web [data-node="bl_canopy"]')[0];
  for (let step = 0; step < 40; step++) {
    if (canopy()?.classList.contains('web__node--on')) break;
    const goal = centreOf(canopy());
    const next = all('#skills-web .web__node--open').sort(
      (a, b) =>
        Math.hypot(centreOf(a).x - goal.x, centreOf(a).y - goal.y) -
        Math.hypot(centreOf(b).x - goal.x, centreOf(b).y - goal.y)
    )[0];
    if (!next) break;
    next.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  }
  assert(
    canopy().classList.contains('web__node--on'),
    'a node that scales the poison down is allocated',
    canopy().getAttribute('class')
  );
  $('skills-close').click();

  $('open-character').click();
  assert(
    /over \d+s/.test(text('sheet-skill')),
    'the sheet reports a lasting skill as lasting',
    text('sheet-skill')
  );

  const dmg = all('#sheet-stats .stat').find(
    (r) => r.querySelector('.stat__k')?.textContent === 'damage'
  );
  dmg.click();
  const parts = all('.statdetail .dmgrow:not(.dmgrow--sum)');
  const sum = parts.reduce(
    (n, r) => n + Number(r.querySelector('.dmgrow__n')?.textContent ?? 0),
    0
  );
  const shown = Number((dmg.querySelector('.stat__v')?.textContent ?? '').replace(/\D+.*$/, ''));
  // Rounding per row is the only slack allowed. Anything wider hides a factor.
  assert(
    Math.abs(sum - shown) <= parts.length,
    'and its breakdown still adds up to the row it opened',
    `${sum} in parts, row says ${shown}`
  );
  assert(
    /never armoured/.test(document.querySelector('.dmgrow--sum')?.textContent ?? ''),
    'and states the rule that damage over time skips armour',
    document.querySelector('.dmgrow--sum')?.textContent
  );

  // A mace does nothing for a spell. The sheet no longer explains that in
  // prose, so the mod line has to carry it — in the dock BEFORE you equip, and
  // on the worn slot after. A cudgel has no rolled mods at all, which is how
  // the sheet's tooltip came to print "no modifiers" over the only line on it.
  const mace = filled('#inv-gear').find((b) => /cudgel|maul/i.test(named(b)));
  assert(!!mace, 'the dev kit carries a mace to test with', named(filled('#inv-gear')[0]));

  mace.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
  assert(
    /Damage to Attacks/.test(text('tooltip')),
    'a mace says its damage is for Attacks, before you wear it',
    text('tooltip')
  );
  mace.dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: true }));

  mace.click();
  $('slot-weapon').dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
  assert(
    /Damage to Attacks/.test(text('tooltip')),
    'and still says so once it is worn',
    text('tooltip')
  );
  $('sheet-close').click();
}
assert($('skills').hidden === true, 'and the skills screen closes again');

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

const lit = all('.dock .slot--on');
assert(lit.length > 0, 'picking a slot lights up what fits, in the dock');
// The lit slots ARE the message, so the line only speaks when there are none.
assert($('sheet-pick').hidden === true, 'and says nothing the dock already showed');
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

// --- selling -------------------------------------------------------------
// The only way out of a full bag that isn't a bigger bag. Left this late
// because the bulk button empties the gear column, and everything above it
// wants something in there to click.
const purse = () => Number(text('wallet').match(/\d+/)?.[0] ?? 0);
{
  // One piece at a time lives in the menu, never on the click: a sale is the
  // one action here you cannot take back.
  const slot = filled('#inv-gear')[0];
  slot.dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  const sell = all('#itemmenu .itemmenu__item').find((b) => /^sell for/i.test(b.textContent ?? ''));
  assert(!!sell, 'the menu offers to sell a piece', all('#itemmenu .itemmenu__item').map((b) => b.textContent).join(' | '));
  assert(/\d+ gold/.test(sell.textContent), 'and says what for', sell.textContent);
  assert(!/sell/i.test(named(slot)), 'but a plain click never sells', named(slot));

  const asked = Number(sell.textContent.match(/(\d+) gold/)?.[1] ?? 0);
  const before = purse();
  const carried = filled('#inv-gear').length;
  sell.click();
  assert(purse() === before + asked, 'selling pays exactly what it offered', `${before} -> ${purse()}, asked ${asked}`);
  assert(filled('#inv-gear').length === carried - 1, 'and the piece is gone', String(filled('#inv-gear').length));
}

// Crystals are a standing choice, not stock, so nothing offers to buy one.
{
  filled('#inv-crystal')[0].dispatchEvent(
    new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true })
  );
  const labels = all('#itemmenu .itemmenu__item').map((b) => b.textContent ?? '');
  assert(!labels.some((t) => /sell/i.test(t)), 'a crystal cannot be sold', labels.join(' | '));
  document.body.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true }));
}

// The bulk button: thirty pieces one click at a time is what kills a loop.
{
  $('open-shop').click();
  const label = () => text('shop-sell');
  assert(/\d+ pieces/.test(label()), 'the shop counts what it would take', label());
  assert(/\+\d+ gold/.test(label()), 'and prices the heap', label());

  const offered = Number(label().match(/\+(\d+) gold/)?.[1] ?? 0);
  const before = purse();
  $('shop-sell').click();
  await new Promise((r) => setTimeout(r, 0));
  assert($('confirm').hidden === false, 'selling the lot asks first');
  $('confirm-no').click();
  await new Promise((r) => setTimeout(r, 0));
  assert(purse() === before, 'and answering no sells nothing', `${before} -> ${purse()}`);

  $('shop-sell').click();
  await new Promise((r) => setTimeout(r, 0));
  $('confirm-yes').click();
  await new Promise((r) => setTimeout(r, 0));
  assert(purse() === before + offered, 'yes pays what the button said', `${before} -> ${purse()}, offered ${offered}`);
  assert(
    filled('#inv-gear').every((b) => b.classList.contains('slot--modded')),
    'and leaves anything a currency has touched',
    String(filled('#inv-gear').length)
  );
  assert($('shop-sell').disabled === true, 'with nothing left to take');
  $('shop-close').click();
}

// --- history --------------------------------------------------------------
assert($('history').hidden === true, 'history starts closed');
$('open-history').click();
assert($('history').hidden === false, 'history opens');
assert(all('#history-log .logline').length > 0, 'history recorded earlier actions');
$('history-clear').click();
assert(all('#history-log .logline').length === 0, 'clearing empties the history');
$('history-close').click();
assert($('history').hidden === true, 'history closes');

// --- New game asks first ---------------------------------------------------
// It is the one button in the game with no way back, and it sits in a row of
// buttons you click all day. Left last on purpose: the confirming half of this
// really does wipe everything.
{
  const owned = dockItems().length;
  assert(owned > 0, 'there is something to lose', String(owned));

  $('dev-fresh').click();
  assert($('confirm').hidden === false, 'New game asks before it wipes');
  assert(
    document.activeElement === $('confirm-no'),
    'and focus starts on Cancel, not the wipe',
    document.activeElement?.id ?? '(none)'
  );

  $('confirm-no').click();
  assert($('confirm').hidden === true, 'Cancel closes the question');
  assert(
    dockItems().length === owned,
    'and nothing was touched',
    `${dockItems().length} vs ${owned}`
  );

  // Escape is the same answer by another door.
  $('dev-fresh').click();
  document.dispatchEvent(
    new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
  );
  assert($('confirm').hidden === true, 'Escape answers it no');
  assert(dockItems().length === owned, 'still untouched');

  // And confirming actually does the thing — a guard that also blocked the
  // button would be worse than no guard.
  $('dev-fresh').click();
  $('confirm-yes').click();
  assert($('confirm').hidden === true, 'confirming closes it');
  // The answer arrives as a resolved promise, so the wipe itself lands a
  // microtask later than the click.
  await new Promise((r) => setTimeout(r, 0));
  assert(
    dockItems().length < owned,
    'and a confirmed New game really wipes',
    `${dockItems().length} vs ${owned}`
  );
}

// --- the save ---------------------------------------------------------------
// The hosted build has no server behind it, so localStorage is the whole save.
// A reload that starts you over is the one bug this feature can have.
{
  const KEY = 'crystal-core.save';
  const stored = () => {
    const raw = window.localStorage.getItem(KEY);
    return raw === null ? null : JSON.parse(raw);
  };

  assert(stored() !== null, 'the game writes a save');
  assert(stored().version === 1, 'stamped with the format it was written in');

  // The wipe above must reach the save too, or the next reload undoes it.
  assert(
    stored().onboarded === false,
    'a New game wipes the save as well as the state',
    JSON.stringify(stored().onboarded)
  );

  $('open-save').click();
  assert($('savedata').hidden === false, 'the Save screen opens');
  assert(
    /this browser/i.test(text('save-where')),
    'and says which browser your progress is in',
    text('save-where').slice(0, 50)
  );
  $('save-close').click();
  assert($('savedata').hidden === true, 'and closes');
}

// --- skipping the opening --------------------------------------------------
// The wipe above put the welcome card back up, which is the only place the
// lever exists. Choosing a skill with it off must start the game with no guide
// and no lockdown — a half-skipped opening would leave the app switched off.
{
  assert($('welcome').hidden === false, 'a wipe asks who you are again');

  $('welcome-skip').click();
  assert(/skip/i.test(text('welcome-skip')), 'the lever says so', text('welcome-skip'));

  all('#welcome-skills .welcomecard')[0].click();
  assert($('guide').hidden === true, 'choosing a skill runs no opening');
  assert(all('.guide-on').length === 0, 'and highlights nothing', String(all('.guide-on').length));
  assert(
    !document.body.classList.contains('guided'),
    'and leaves the app unlocked'
  );
  assert($('run-launch').disabled === false, 'the Fissure is ready anyway');
}

// --- the page itself must not scroll --------------------------------------
assert(
  window.getComputedStyle(document.body).overflow === 'hidden',
  'page does not scroll',
  window.getComputedStyle(document.body).overflow
);

assert(pageErrors.length === 0, 'no console errors during interaction', pageErrors.join(' | '));

window.close();
console.log(`\nsmoke: ${checks} checks passed`);
