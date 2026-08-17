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
const dockItems = () => filled('#inv-gear');
// Crystals are never carried, so they are not in the dock at all. The bench's
// own column is the only place one can be picked up and worked on.
const benchCrystals = () => all('#craft-crystals .wornslot');
const crystalCards = () => all('#crystals-list .crystal');
const currencySlots = () => filled('#inv-currency');
// Its own column, and drawn only while you are holding one. Nothing in it has
// a click: a relic is carried to a person, never spent at the bench.
const relicSlots = () => filled('#inv-relics');
const named = (btn) => btn.getAttribute('aria-label') ?? '';

// --- the way in: title, then a slot, then one question ---------------------
assert($('title').hidden === false, 'a load lands on the title');
$('title').click();
assert($('title').hidden === true, 'which anything dismisses');
assert($('savedata').hidden === false, 'and it opens onto the slots, full screen');
assert(
  $('savedata').classList.contains('modal--full') && $('save-play').hidden === false,
  'with a Play now on it and no Close to leave by',
  $('savedata').className
);
$('save-play').click();
$('save-play').click();
assert($('savedata').hidden === true, 'Play now takes you into the live slot');
// A character is MADE before it is played, and the trade is who you ARE, so
// the cast comes up before the name and the skill do.
assert($('pick').hidden === false, 'and a character with no trade is made first');
assert(all('#pick-cast .pickfig').length === 2, 'both trades stand there');
assert($('pick-say').hidden === true, 'saying nothing until one is clicked');
$('pick-aethermancer').click();
assert($('pick-say').hidden === false, 'clicking one says who he is');
assert($('pick-take') !== null, 'and offers to be him');
$('pick-take').click();
assert($('pick').hidden === true, 'taking him closes the hall');

// A slot can hold a game that was never asked what it swings, so playing one
// still puts the question up rather than assuming a save answered it.
assert($('welcome').hidden === false, 'and a game with no skill still asks for one');
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
assert(text('wallet').startsWith('0'), 'a fresh game has no gold', text('wallet'));
assert(
  currencySlots().length === 0,
  'an empty wallet puts no currency in the dock',
  String(currencySlots().length)
);

// The dock is a fixed shape whether or not you own anything, so it never
// collapses and shoves the Fissure around.
assert(all('#inv-gear .slot--empty').length > 0, 'the dock keeps empty slots');

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
$('dev-kit').click();
$('confirm-yes').click();
await new Promise((r) => setTimeout(r, 0));
assert(dockItems().length > 2, 'the dev kit stocks the dock', String(dockItems().length));
assert($('craft').hidden === false, 'a stocked game opens on the bench');

// --- the flasks --------------------------------------------------------------
// The one thing a player DOES in a fight, and the first input a descent has
// ever had. AFTER the wipe, which is what stocks the dock the flasks read.
{
  $('craft-close').click();
  $('run-launch').click();
  await new Promise((r) => setTimeout(r, 60));

  const flasks = all('#run-flasks .flask');
  assert(flasks.length === 2, 'two flasks under the map', String(flasks.length));
  assert(
    // 1-3 are the crystal's three faces now; the flasks come after them.
    all('#run-flasks .flask__key').map((n) => n.textContent).join(',') === '4,5',
    'on the keys the table binds them to',
    all('#run-flasks .flask__key').map((n) => n.textContent).join(',')
  );
  assert(
    $('run-flasks').closest('.stagebox') !== null,
    'and attached to the map rather than to the side panel'
  );
  // The ART carries the count now, so `data-at` is what a test can read — it is
  // the same value the picture is drawn from rather than a second copy of it.
  const charges = () => all('#run-flasks .flask__use').map((n) => n.dataset.at);
  assert(charges().every((c) => c === '2'), 'each starting the descent full', charges().join(' '));

  // A press is QUEUED and drained on the next TICK, and the sim does not tick
  // while the hero is still climbing out — so this has to outlast the handover
  // before the charge can have gone anywhere.
  const use = all('#run-flasks .flask__use')[0];
  assert(!use.disabled, 'and a flask you can drink is a button you can press');
  use.click();
  await new Promise((r) => setTimeout(r, 1500));
  assert(charges()[0] === '1', 'drinking one spends a charge', charges().join(' '));

  $('run-abandon').click();
  $('run-again').click();
  $('run-launch').click();
  await new Promise((r) => setTimeout(r, 60));
  assert(
    charges().every((c) => c === '2'),
    'and the next descent starts full: a budget, never a stockpile',
    charges().join(' ')
  );
  // Starved reads out. Zero is the honest answer for a dev-kit character with
  // a pool, and the row says what a starved cast is worth so a halved number
  // is never a mystery.
  $('run-launch').click();
  await new Promise((r) => setTimeout(r, 60));
  assert(
    /^\d+ at \d+%$/.test(text('run-starved')),
    'the readout counts starved casts and says what one is worth',
    text('run-starved')
  );
  assert(
    !$('run-starved').classList.contains('readout__v--bad'),
    'and does not shout while nothing has starved',
    $('run-starved').getAttribute('class') ?? ''
  );
  $('run-abandon').click();
  $('run-again').click();
}

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
  all('.dock .slot .icon').length ===
    invItems().length + currencySlots().length + relicSlots().length,
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

// Gear and currency, and nothing else. A crystal is never spent, sold or
// carried, so a dock column for it would be triage with nothing to triage.
assert(filled('#inv-gear').length > 0, 'equipment has its own column');
assert($('inv-crystal') === null, 'and crystals have no dock column at all');
assert(
  filled('#inv-gear').every((b) => b.classList.contains('slot--gear')),
  'the equipment column holds only equipment'
);
// Icons only: the name and every modifier live in the tooltip.
assert(text('inv-gear') === '', 'the dock shows icons, not names', text('inv-gear'));
assert(benchCrystals().length > 0, 'the bench keeps a crystals column instead');

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

// The base's tier colours the slot. A dock is something you scan for "is any
// of this worth looking at", and a silhouette can only say what a piece IS.
assert(
  filled('#inv-gear').every((b) => /slot--t\d/.test(b.className)),
  'every piece carries its base tier on the slot'
);

// --- bench starts empty ---------------------------------------------------
assert($('craft-empty').hidden === false, 'bench starts empty');
assert($('craft-item').hidden === true, 'no item panel until something is placed');
assert($('craft-return').disabled === true, 'return disabled with an empty bench');

// --- putting a crystal on the bench ---------------------------------------
// A level 1 crystal is the blank one: the level IS capacity, so this is the
// crystal with nowhere to put anything, and no craft changes that.
const crystalChip = benchCrystals().find((b) => /Level 1/.test(named(b)));
assert(!!crystalChip, 'a level 1 crystal is in the bench column');

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
  all('#craft-crystals .wornslot--on').length === 1,
  'the selected crystal is highlighted',
  String(all('#craft-crystals .wornslot--on').length)
);
assert($('craft-return').disabled === false, 'return is now available');
// The bench draws openings, not the base's declared table. A level 1 crystal
// has no room for anything, so it draws nothing. Drawing dead sockets under a
// header reading 0/0 was the confusing part.
const facets = () => $('sockets').querySelectorAll('.facet').length;
assert(facets() === 0, 'a level 1 crystal shows no facets at all', String(facets()));

// Derived reward multipliers under the name. A blank crystal must read as
// exactly baseline — no danger, no bonus.
const multRows = () =>
  all('#item-rewards .mult').map(
    (n) =>
      `${n.querySelector('.mult__k').textContent}=${n.querySelector('.mult__v').textContent}`
  );
assert($('item-rewards').hidden === false, 'crystal shows reward multipliers');
assert(
  multRows().join(' ') === 'family=Normal danger=0 rarity=0%',
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

// A crystal's room comes from its LEVEL, so nothing opens a level 1 one.
// The shard still CLICKS — it arms, and lights whatever else would take it —
// but the crystal it is standing on refuses, and says so.
{
  const making = currencyButton('Shard of Making');
  assert(!!making, 'the dock stocks the adding currency');
  making.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
  assert(
    /no open slot/i.test(text('tooltip')),
    'nothing can put a modifier on a level 1 crystal, and the shard says why',
    text('tooltip')
  );
  making.dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: true }));
  making.click();
  assert(facets() === 0, 'and clicking it opens no room either', String(facets()));
  assert($('craft-armed').hidden === false, 'it arms instead, to be pointed somewhere else');
  making.click();
  assert($('craft-armed').hidden === true, 'and clicking it again puts it away');
}
$('craft-return').click();

// --- the base's tier is the whole of what an item can hold ----------------
// Two modifiers on a tier 1 base, and nothing at the bench raises that: a
// bigger item is something you go and find. This is what stops a fresh drop
// being filled and re-rolled to perfection.
const smallGear = filled('#inv-gear').find((b) => /slot--t1\b/.test(b.className));
assert(!!smallGear, 'a tier 1 piece of gear is in the dock');
smallGear.click();

assert(
  /tier 1/i.test(text('item-meta')),
  'and the item says which tier it is',
  text('item-meta')
);
assert(facets() === 2, 'a tier 1 base opens exactly two facets', String(facets()));

const making = currencyButton('Shard of Making');
assert(!!making && !making.disabled, 'Making is what fills them');
assert(heldCount('Shard of Making') > 0, 'currency count shown on the stack');

const rolled = () => all('#modlist .mod').filter((m) => !m.classList.contains('mod--implicit'));
const stockBefore = heldCount('Shard of Making');
making.click();
assert(rolled().length === 1, 'Making lands one modifier', String(rolled().length));
assert(
  heldCount('Shard of Making') === stockBefore - 1,
  'Making was spent',
  `${heldCount('Shard of Making')} vs ${stockBefore}`
);

currencyButton('Shard of Making').click();
assert(rolled().length === 2, 'a second modifier was added', String(rolled().length));

// Two is all a tier 1 base has. A third has nowhere to go, whatever else you
// own — there is no currency in the game that opens one.
{
  const third = currencyButton('Shard of Making');
  third.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
  assert(/no open slot/i.test(text('tooltip')), 'and a tier 1 base stops at two', text('tooltip'));
  third.dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: true }));
  const held = heldCount('Shard of Making');
  third.click();
  assert(rolled().length === 2, 'a third does not go on', String(rolled().length));
  assert(heldCount('Shard of Making') === held, 'and nothing is spent trying');
  third.click();
}

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

// Adding a modifier has to CHANGE the crystal's header. Most raise danger; the
// finding ones carry none at all and state what the run is pointed at instead.
// A level 4 has room for it — levelling is the only thing that grants any.
{
  const roomy = benchCrystals().find((b) => /Level 4/.test(named(b)));
  assert(!!roomy, 'a level 4 crystal is in the bench column');
  $('craft-return').click();
  roomy.click();
  assert(facets() === 3, 'and it has three facets to fill', String(facets()));
  const danger = () =>
    Number(multRows().find((r) => r.startsWith('danger='))?.split('=')[1]);
  assert(danger() === 0, 'a blank one is worth exactly base', String(danger()));
  const headerBefore = multRows().join(' ');
  currencyButton('Shard of Making')?.click();
  assert(
    multRows().join(' ') !== headerBefore,
    'crafting a mod changes what the crystal says it does',
    `${headerBefore} → ${multRows().join(' ')}`
  );
  assert(
    danger() > 0 || multRows().some((r) => /^(weapons|armour|trinkets)=/.test(r)),
    'and it is either more dangerous or pointed at something',
    multRows().join(' ')
  );
  $('craft-return').click();
  smallGear.click();
}
assert(
  currencySlots().length >= 6,
  'the dock holds the whole spread of currency',
  String(currencySlots().length)
);
// Currencies that all looked the same made the icon decoration; the
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

// --- arming the one currency you aim --------------------------------------
// Everything else at the bench fires on the click. Removal asks which one,
// because choosing what LEAVES is the only targeting that does not collapse
// the chase — and a bench that silently changed what a click means would be a
// bug report, so arming has to say so on screen.
{
  const unmaking = currencyButton('Shard of Unmaking');
  assert(!!unmaking, 'the dev kit stocks the removal currency');
  assert(
    /pick what it goes on/i.test(named(unmaking)),
    'which asks you to point it rather than firing',
    named(unmaking)
  );
  const before = rolled().length;
  assert(before > 0, 'the benched item has something to remove', String(before));
  unmaking.click();
  assert($('craft-armed').hidden === false, 'arming it says so on the bench');

  const facet = all('#sockets .facet--set')[0];
  assert(!!facet, 'the item draws its filled facets');
  assert(facet.classList.contains('facet--armed'), 'and every one becomes a target');
  facet.click();
  assert(rolled().length === before - 1, 'clicking one removes it', `${rolled().length} vs ${before}`);
  assert($('craft-armed').hidden === true, 'and puts the shard away afterwards');
}

// --- an armed shard lights what it can go on ------------------------------
// The dock answers "which of these would take this" without a click each. A
// dimmed slot is not hidden, because the whole point is that hovering it says
// why — the refusal belongs on the item you were about to click.
{
  const unmaking = currencyButton('Shard of Unmaking');
  unmaking.click();
  const lit = filled('#inv-gear').filter((b) => b.classList.contains('slot--on'));
  const dim = filled('#inv-gear').filter((b) => b.classList.contains('slot--dim'));
  assert(lit.length > 0, 'arming lights what the shard would take', String(lit.length));
  assert(dim.length > 0, 'and dims what it would not', String(dim.length));
  assert(
    lit.every((b) => !b.classList.contains('slot--dim')),
    'and never both at once'
  );

  dim[0].dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
  assert(
    /modifier|corrupt|slot/i.test(text('tooltip')),
    'a dimmed item says why it is dimmed',
    text('tooltip')
  );
  dim[0].dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: true }));

  // A lit one takes it, which is the point of lighting it. Unmaking is the
  // targeted one, so it benches the piece and waits for a modifier rather
  // than firing at whichever one the engine felt like.
  assert(/pick a modifier/i.test(named(lit[0])), 'and a lit one offers to take it', named(lit[0]));
  unmaking.click();
  assert(
    filled('#inv-gear').every((b) => !b.classList.contains('slot--dim')),
    'putting the shard away clears the dock again'
  );
}

// --- a one-way door says so before you open it ----------------------------
// The two gambles lock the item permanently. Nothing else in the game does,
// and a lock nobody saw coming is the worst thing on the bench.
{
  const gamble = currencySlots().find((b) => /Sigil of/.test(named(b)));
  assert(!!gamble, 'the dev kit stocks a gamble', named(currencySlots()[0]));
  gamble.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
  assert(
    /LOCKS THE ITEM/.test(text('tooltip')),
    'and it says it locks the item before you spend it',
    text('tooltip')
  );
  gamble.dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: true }));
}

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

// Fill it, re-roll every modifier, then re-roll every value. Nothing in that
// sequence may reach the implicit — it is the base's identity, not a modifier.
for (const name of ['Shard of Making', 'Shard of Making', 'Shard of Chaos', 'Shard of Change']) {
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
assert(buys.length >= 1, 'the shop lists recipes', String(buys.length));
const affordable = buys.find((b) => !b.disabled);
assert(!!affordable, 'at least one recipe is affordable');

// --- the shelf is one currency, and the map is the rest -------------------
// A shop that stocks the whole bench is a shop that replaces the map. Adding
// a modifier is the one thing you need enough of that running out is only
// tedious; crystals are not on the shelf at all, because they are given.
const buyNames = () => all('#workshop .buy__name').map((n) => n.textContent);
assert(
  !buyNames().some((n) => /Crystal/.test(n)),
  'the shop never sells a crystal',
  buyNames().join(', ')
);
assert(
  buyNames().length === 1 && /Making/.test(buyNames()[0]),
  'and sells exactly one currency: the one that adds a modifier',
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
  all('#shop-stock .buy__cost').every((n) => /Tier \d/.test(n.textContent)),
  'and its base tier',
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
  slotsIn('#inv-gear').length >= 24,
  'the dock is deeper than the two rows it replaced',
  String(slotsIn('#inv-gear').length)
);
// Currency is the column that gave up the width: a stack is one slot however
// deep it is, and there are only thirteen kinds.
assert(
  slotsIn('#inv-currency').length < slotsIn('#inv-gear').length,
  'currency takes less room than the items it is spent on',
  `${slotsIn('#inv-currency').length} vs ${slotsIn('#inv-gear').length}`
);
// Filling up is something you watch approaching, not something the report
// tells you afterwards.
assert(
  /\d+\/\d+/.test(text('inv-gear-label')),
  'the column says how full it is',
  text('inv-gear-label')
);

// --- the haul -------------------------------------------------------------
// One terminus for the loop: a death and a full haul both land here. Only its
// shape is checked in jsdom — a run takes a minute of real time, so the loop
// itself is walked headlessly in the demo.
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
assert($('haul-sell') === null, 'and no second sell button beside the first');
assert($('haul-sort') !== null, 'a Sort, the same one the dock has');
assert($('haul-sort').disabled === true, 'off while there is nothing to order');
// The way out of a full everything: a sale needs room nowhere, which is what
// stops the one thing that can shut the Fissure from wedging it.
assert($('haul-sellall') !== null, 'and a way to empty the whole thing');
assert($('haul-sellall').disabled === true, 'off while there is nothing in it');
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

assert(crystalCards().length > 0, 'the dev kit fills it', String(crystalCards().length));
assert(
  /\d+ owned · \d+\/\d+ socketed/.test(text('crystals-count')),
  'it counts what you own against what is in use',
  text('crystals-count')
);
// Nothing about a gift is a probability any more, so the screen states a fact.
// A percentage here would be the one thing on it a player cannot act on.
assert(
  /at the mouth of a cleared descent/i.test(text('crystals-npc')),
  'the collection says where whatever is owed gets handed over',
  text('crystals-npc')
);
assert(
  !/\d+%|chance/i.test(text('crystals-npc')),
  'and never as odds',
  text('crystals-npc')
);
assert(
  all('#crystals-quests .quest').length === 7,
  'every rung of both ladders is listed',
  String(all('#crystals-quests .quest').length)
);
assert(
  all('#crystals-quests .quest--done').length === 7,
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
  /to level \d|as far as it goes/.test(socketedCard.textContent),
  'showing how far it has levelled',
  socketedCard.textContent
);
// A crystal has levels and nothing else. Rough / Seamed / Faceted / Brilliant
// describe a crafting ladder it was never on, and Tier is three other things.
assert(
  !/rough|seamed|faceted|brilliant|tier/i.test(text('crystals-list')),
  'and never a quality word or a tier',
  text('crystals-list')
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
  const target = filled('#inv-gear')[0];
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
  !$('craft').contains($('inv-gear')),
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
// The Fissure screen is the sockets and the one button, and nothing else:
// what a character IS is on the sheet, which has its own checks below.
assert($('run-stats') === null, 'and the Fissure carries no character panel');
assert($('run-launch') !== null, 'only the sockets and the way in');

// --- socketing a crystal --------------------------------------------------
// One screen holds every crystal you own, socketed or not, because four
// sockets against a collection is a comparison rather than a bag.
{
  // An empty socket is the question "what goes in here", and the answer is a
  // screen: crystals are compared against each other before one goes in.
  socketButtons()[0].click();
  assert($('crystals').hidden === false, 'an empty socket opens the collection');
  const owned = crystalCards().length;
  assert(owned > 4, 'and lists every crystal you own', String(owned));

  const move = (card) => card.querySelector('button.mini');
  const loose = () => crystalCards().filter((c) => /socket it|swaps/i.test(move(c).textContent));
  const runCrystal = loose()[0];
  assert(!!runCrystal, 'an unsocketed one offers to be socketed');
  move(runCrystal).click();

  const full = () => socketButtons().filter((b) => b.classList.contains('socket--full'));
  assert(full().length === 1, 'the first socket fills', String(full().length));
  assert(/Crystal/.test(full()[0].textContent ?? ''), 'and names the crystal');
  // Socketing is a MOVE, but the collection never loses the crystal — it is
  // the same screen, saying it is somewhere else.
  assert(crystalCards().length === owned, 'and the collection still holds it');
  assert(
    crystalCards().filter((c) => /take it back/i.test(move(c).textContent)).length === 1,
    'now offering to take it back instead'
  );

  const back = crystalCards().find((c) => /take it back/i.test(move(c).textContent));
  move(back).click();
  assert(full().length === 0, 'the socket empties again');
  assert($('run-launch').disabled === false, 'and you can still descend without one');

  // Fill every socket, then one more: four is the whole set, and a fifth
  // crystal swaps into the first rather than being refused — the same thing a
  // second helmet does.
  for (let i = 0; i < 5; i++) move(loose()[0]).click();
  assert(full().length === 4, 'four sockets is the whole set', String(full().length));
  assert(
    crystalCards().length === owned,
    'and the fifth swapped rather than vanishing',
    String(crystalCards().length)
  );
  $('crystals-close').click();
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

// --- one stat per line, and the roll told apart from the name --------------
// Three stats joined by commas wrap into a paragraph, and an item tooltip is
// something you scan rather than read. The rolled NUMBER carries its own
// element so it can be coloured — that split is most of what makes a
// six-modifier piece readable at a glance.
{
  const slot = filled('#inv-gear').find((b) => named(b).length > 0);
  slot.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));

  const card = $('tooltip').querySelector('.tip__card');
  assert(!!card, 'an item tooltip is a built card, not a run of text');
  assert(!!card.querySelector('.tip__name'), 'which names the item');
  assert(/tier \d/i.test($('tooltip').querySelector('.tip__sub').textContent), 'and says its tier',
    $('tooltip').querySelector('.tip__sub').textContent);
  assert(/tip__card--t\d|tip__card--locked/.test(card.className), 'and carries the tier on its edge', card.className);

  const stats = all('#tooltip .rolled');
  assert(stats.length > 0, 'it lists stats one per line', String(stats.length));
  assert(
    stats.every((n) => n.querySelector('.rolled__v') && n.querySelector('.rolled__k')),
    'and every one splits the rolled value from the words around it'
  );
  assert(
    stats.every((n) => /^[+-]?[\d.]+%?$/.test(n.querySelector('.rolled__v').textContent)),
    'the value half is only ever a number',
    stats.map((n) => n.querySelector('.rolled__v').textContent).join(' | ')
  );
  assert(
    stats.every((n) => !/[%\d]\s*,\s*[+-]/.test(n.textContent)),
    'and never two stats on one line',
    stats.map((n) => n.textContent).find((t) => /[%\d]\s*,\s*[+-]/.test(t))
  );
  slot.dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: true }));
}

// A named piece is the same card again, saying what it DOES and why nothing at
// a bench will touch it — a currency that refuses with no reason on the card is
// the item looking broken.
{
  const slots = filled('#inv-gear');
  const one = slots.find((b) => b.className.includes('slot--unique'));
  assert(!!one, 'the dock marks a named piece apart from a rolled one');
  one.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
  const card = $('tooltip').querySelector('.tip__card');
  assert(
    !!card.querySelector('.tip__name--unique'),
    'and its card names it in its own colour'
  );
  assert(all('#tooltip .tip__grant').length > 0, 'and says what it does in words');
  assert(
    /nothing at a bench/i.test($('tooltip').textContent),
    'and that nothing at a bench can change it',
    $('tooltip').textContent
  );
  assert(!!$('tooltip').querySelector('.tip__flavour'), 'and carries its own line');
  one.dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: true }));
}

// A crystal is the same card, saying the things a crystal has instead: which
// world it opens, what the danger buys, and how far it has left to level.
{
  $('open-craft').click();
  const chip = benchCrystals()[0];
  chip.dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
  const sub = $('tooltip').querySelector('.tip__sub')?.textContent ?? '';
  assert(/level \d/i.test(sub), 'a crystal card says its level', sub);
  assert(/normal|demonic|prismatic/i.test(sub), 'and which world it opens', sub);
  assert(all('#tooltip .tip__chips .mult').length > 0, 'and what the danger buys');
  assert(
    /to level \d|as far as it levels/.test($('tooltip').textContent),
    'and how far it has left to go',
    $('tooltip').textContent
  );
  chip.dispatchEvent(new window.MouseEvent('mouseleave', { bubbles: true }));
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


// --- the Lampwright's panel ------------------------------------------------
// A FACE in the corner of the box, at its own grid — a map sprite blown up is
// a silhouette, and this is the only place in the game anyone is looked at.
{
  assert($('met-face') !== null, 'the meeting panel has somewhere to put a face');
  assert(
    $('met-face').compareDocumentPosition($('met-title')) & window.Node.DOCUMENT_POSITION_FOLLOWING,
    'and it comes before the name'
  );
}

// --- the handover between descents ----------------------------------------
// A cleared descent used to swap the map between two frames, which reads as a
// glitch. The hero drops into the hole at the exit, the screen goes dark for
// the moment the swap happens, and they climb out of the next entrance.
{
  assert($('run-fade') !== null, 'the stage has something to fade behind');
  assert(
    window.getComputedStyle($('run-fade')).pointerEvents === 'none',
    'which never takes a click — Leave and Abandon stay live through it',
    window.getComputedStyle($('run-fade')).pointerEvents
  );
  assert(
    !$('run-fade').contains($('run-leave')) && !$('run-fade').contains($('run-abandon')),
    'and the two ways out are not behind it'
  );
}

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

// --- the camera -------------------------------------------------------------
// The wheel is the only zoom now: no buttons, no readout, and one hint saying
// so. A canvas has nothing to assert about scale from out here — the renderer
// owns it — so this checks the controls are gone and the gestures are wired.
assert($('run-zoom-in') === null, 'no zoom buttons');
assert($('run-zoom-label') === null, 'and no zoom readout');
assert(
  /scroll/i.test(text('run-camhint')) && /space/i.test(text('run-camhint')),
  'the bar says how the camera works instead',
  text('run-camhint')
);
{
  // A wheel over the stage must be SWALLOWED, or the page scrolls under the
  // map — which is the whole reason the listener is not passive.
  const wheel = new window.WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true });
  $('run-stage').dispatchEvent(wheel);
  assert(wheel.defaultPrevented, 'and the wheel over the map is taken, not passed to the page');
}

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
assert(all('#sheet-stats .stat').length >= 5, 'sheet lists the character’s own stats');

// --- three sections, one per slot ------------------------------------------
// Everything only true of ONE skill lives with that skill; the general list
// above keeps what is true of the character whatever it is holding.
{
  const secs = all('#sheet-skills .skillsec');
  assert(secs.length === 3, 'a section per skill slot', String(secs.length));
  const main = $('sheet-skill-main');
  assert(
    /Strike/.test(main.textContent ?? ''),
    'the main one names the skill that swings',
    main.textContent?.slice(0, 40)
  );
  const keys = (host) =>
    all(`${host} .stat__k`).map((n) => n.textContent);
  assert(
    ['damage', 'crit chance', 'mana per use', 'reach'].every((k) => keys('#sheet-skill-main').includes(k)),
    'and carries the numbers that would change with it',
    keys('#sheet-skill-main').join(', ')
  );
  assert(
    ['damage', 'crit chance', 'reach'].every((k) => !keys('#sheet-stats').includes(k)),
    'and those rows have LEFT the general stats',
    keys('#sheet-stats').join(', ')
  );
  assert(
    ['life', 'armour', 'mana'].every((k) => keys('#sheet-stats').includes(k)),
    'which keeps what is true of the character',
    keys('#sheet-stats').join(', ')
  );
  // An empty slot says what it is for. A dark square teaches nothing.
  const empty = all('#sheet-skills .skillsec__empty');
  assert(empty.length > 0 && empty.every((n) => (n.textContent ?? '').length > 12),
    'and an empty slot says what it is for', String(empty.length));
}

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
assert(text('sheet-skill-main').length > 0, 'the sheet names the skill it computed for');
assert(
  /on hit|over \d+s/.test(text('sheet-skill-main')),
  'and how that skill delivers its damage',
  text('sheet-skill-main')
);

// --- the damage number comes apart -----------------------------------------
{
  const rowFor = (k) =>
    all('#sheet-skill-main .stat').find((r) => r.querySelector('.stat__k')?.textContent === k);
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
// --- attributes: a level buys points, and the sheet is where they go -------
// Level 1 has none, which is the state the dev kit starts in — so the first
// thing to prove is that nothing is offered before a level pays for one.
const attrRows = all('#sheet-attrs .attr');
assert(attrRows.length === 4, 'four attributes on the sheet', String(attrRows.length));
assert(
  attrRows.every((r) => r.querySelector('.attr__buy')?.disabled === true),
  'a level 1 character is offered nothing to spend'
);
assert($('sheet-attr-left').hidden === true, 'and no unspent count is shown at zero');
assert(
  $('open-character').querySelector('.tabbadge') === null,
  'and the header button carries no badge — a 0 badge is a permanent nag'
);
// Every attribute names what a point in it is worth, in figures.
assert(
  attrRows.every((r) => /\d/.test(r.querySelector('.attr__how')?.textContent ?? '')),
  'every attribute says what it buys, with the number in it'
);

$('sheet-devlevel').click();
assert(text('sheet-level') === '2', 'a level lands on the sheet', text('sheet-level'));
assert(
  $('sheet-attr-left').hidden === false && /^\d+ to spend$/.test(text('sheet-attr-left')),
  'and it hands over points, counted out loud',
  text('sheet-attr-left')
);
assert(
  text('open-character').includes(text('sheet-attr-left').split(' ')[0]),
  'and the header button says how many are waiting',
  text('open-character')
);

// Re-queried, not reused: every spend re-renders the block, so a row held
// from before the level landed is a node no longer on the page.
const granted = Number(text('sheet-attr-left').split(' ')[0]);
all('#sheet-attrs .attr')[0].querySelector('.attr__buy').click();
assert(
  all('#sheet-attrs .attr')[0].querySelector('.attr__v')?.textContent === '1',
  'clicking + puts one point in'
);
assert(
  text('sheet-attr-left') === `${granted - 1} to spend`,
  'and the unspent count comes down by exactly one',
  text('sheet-attr-left')
);

// The pool is the budget: spend it out and every button goes dark, badge with
// it. Nothing else in the game hands out an attribute point.
for (let i = 0; i < granted; i++) all('#sheet-attrs .attr')[0].querySelector('.attr__buy')?.click();
assert(
  all('#sheet-attrs .attr').every((r) => r.querySelector('.attr__buy')?.disabled === true),
  'a spent-out pool offers nothing more'
);
assert($('sheet-attr-left').hidden === true, 'and the count goes away rather than reading 0');
assert(
  $('open-character').querySelector('.tabbadge') === null,
  'and so does the badge'
);

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
// --- three slots, and equipping into one -----------------------------------
// Equipping the passive must not stop you swinging: they are different slots,
// and the button says which one it is talking about.
{
  $('open-skills').click();
  // The three slots are the top of the screen now: what you are holding, over
  // the shelves it came off.
  const slots = all('#skills-slots .slotcard');
  assert(slots.length === 3, 'the top row is the three slots', String(slots.length));
  assert(
    slots.filter((c) => c.classList.contains('slotcard--empty')).length === 2,
    'two of them empty on a fresh character'
  );

  all('#skills-cats .catcard').find((c) => /Passive/.test(c.textContent ?? '')).click();
  const row = all('#skills-list .skillrow')[0];
  assert(!!row, 'the passive shelf has something on it');
  assert(
    /click to equip/i.test(row.textContent ?? ''),
    'and it says clicking equips rather than promising a web',
    row.textContent
  );
  // A webless skill is EQUIPPED by the click, so the row is the only place its
  // description can be read before the decision is made.
  assert(
    /Critical/.test(row.querySelector('.skillrow__how')?.textContent ?? ''),
    'and the row says what it DOES, before you pick it',
    row.querySelector('.skillrow__how')?.textContent
  );
  assert(
    (row.querySelector('.skillrow__how .kw')?.textContent ?? '') !== '',
    'with its keywords marked, like everywhere else they appear'
  );
  assert(
    all('#skills-list .skillrow').every((r) => (r.querySelector('.skillrow__how')?.textContent ?? '').length > 0),
    'every shelf row does, not only the one with no web'
  );
  row.click();
  assert(
    $('skills-detail').hidden === true,
    'a passive never opens a tree — there is not going to be one'
  );
  assert(
    /equipped/i.test(all('#skills-list .skillrow')[0].textContent ?? ''),
    'clicking it equipped it instead',
    all('#skills-list .skillrow')[0].textContent
  );
  $('skills-back').click();
  assert(
    all('#skills-slots .slotcard').filter((c) => c.classList.contains('slotcard--empty')).length === 1,
    'and the slot row says so at the top'
  );
  $('skills-close').click();
  $('open-character').click();
  assert(
    /Strike/.test(text('sheet-skill-main')),
    'and the sheet still computes for the skill that swings',
    text('sheet-skill-main')
  );
  $('sheet-close').click();
}

// The other half of the badge. A level 1 character already has a tree point,
// so the button says so from the first screen you look at.
assert(
  text('open-skills').includes('1'),
  'the Skills button says a point is waiting',
  text('open-skills')
);
assert($('skills').hidden === true, 'skills modal starts closed');
$('open-skills').click();
assert($('skills').hidden === false, 'skills modal opens');

assert($('skills-cats').hidden === false, 'it opens on the categories');
assert($('skills-list').hidden === true, 'not on a skill list');
assert($('skills-detail').hidden === true, 'and not on a web');
assert(all('#skills-cats .catcard').length === 4, 'four categories offered');
assert($('skills-back').hidden === true, 'nothing to go back to from the top');

// A second way to move, and both of them have a web to spend points in — the
// movement slot is a build decision now rather than a fixed convenience.
{
  const movement = all('#skills-cats .catcard').find((c) => /Movement/.test(c.textContent ?? ''));
  movement.click();
  const rows = all('#skills-list .skillrow');
  assert(rows.length === 2, 'the movement shelf holds Blink and Leap', String(rows.length));
  assert(
    rows.every((r) => /spent/.test(r.textContent ?? '')),
    'and each has a web to spend in, rather than "no web yet"',
    rows.map((r) => r.textContent).join(' | ')
  );
  rows.find((r) => /Leap/.test(r.textContent ?? '')).click();
  assert($('skills-detail').hidden === false, 'Leap opens its own web');
  assert(all('#skills-web .web__node').length === 9, 'nine nodes in it',
    String(all('#skills-web .web__node').length));
  assert(
    all('#skills-web .web__node--notable').length === 3,
    'three of them notable, one at the tip of each arm',
    String(all('#skills-web .web__node--notable').length)
  );
  assert(
    /6 at level 6/.test(text('skills-sub')),
    'and six points to spend at most, not thirty',
    text('skills-sub')
  );
  $('skills-close').click();
}

// It opens at the TOP, whatever it was showing when you shut it.
$('open-skills').click();
assert($('skills-cats').hidden === false, 'reopening lands on the categories again');
assert($('skills-detail').hidden === true, 'never three deep where you left it');

// All four shelves have something on them now: a character holds three skills
// at once, one out of each of three slots.
const cats = all('#skills-cats .catcard');
assert(
  cats.filter((c) => c.disabled).length === 0,
  'every shelf has something on it',
  String(cats.filter((c) => c.disabled).length)
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
// box, which for a hundred nodes is a grey smear. The web is BUILT WHOLE and
// one transform aims at part of it, so what is on screen is the camera's
// business rather than the DOM's: Fit pulls that camera back.
const viewScale = () =>
  Number(/scale\(([\d.]+)\)/.exec($('skills-web').style.transform ?? '')?.[1] ?? 0);
const zoomedIn = viewScale();
assert(zoomedIn > 0, 'the web is aimed by one transform', String(zoomedIn));
assert(webNodes().length === 109, 'and built whole, every node once', String(webNodes().length));

$('skills-fit').click();
assert(viewScale() < zoomedIn, 'and Fit pulls back to all of it', `${zoomedIn} -> ${viewScale()}`);
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
assert(all('#skills-web .web__chain').length > 100, 'and it is a web, not a list');

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
// The badge counts the skill you PLAY, not the web you happen to be reading:
// this is Fireball's tree and Strike is what is equipped, so its own point is
// still waiting.
assert(
  text('open-skills').includes('1'),
  'the badge counts the equipped skill, not the web on screen',
  text('open-skills')
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
  ['Strike', 'Attacks', 112, 29],
  ['Fireball', 'Spells', 109, 28],
  ['Creeping Blight', 'Spells', 116, 30],
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

  // Blight is equipped now, so the badge is its spare points — read against
  // the screen's own count rather than against a number written here, and
  // absent rather than zero when there is nothing left.
  {
    const [spent, granted] = (/(\d+)\/(\d+) points spent/.exec(text('skills-sub')) ?? []).slice(1);
    const spare = Number(granted) - Number(spent);
    const shown = $('open-skills').querySelector('.tabbadge')?.textContent ?? null;
    assert(
      spare > 0 ? shown === String(spare) : shown === null,
      'the Skills badge is the equipped skill’s spare points, and nothing at zero',
      `${shown} against ${spare} spare`
    );
  }
  $('skills-close').click();

  $('open-character').click();
  assert(
    /over \d+s/.test(text('sheet-skill-main')),
    'the sheet reports a lasting skill as lasting',
    text('sheet-skill-main')
  );

  // The damage row belongs to the SKILL now, so it is in that slot's section
  // rather than in the general stats.
  const dmg = all('#sheet .stat').find(
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
  assert(!!mace, 'the dev kit carries a mace to test with', filled('#inv-gear').map(named).join(' | '));

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
  'only gear lights up — nothing else is in the dock to light'
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
  // one action here you cannot take back. Not the mace, which a later check
  // needs and which sorting the dock moved to the front.
  const slot = filled('#inv-gear').find((b) => !/cudgel|maul/i.test(named(b)));
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

// Crystals are a standing choice, not stock, so nothing offers to buy or sell
// one — and the screen that holds them has no route to either.
{
  $('open-crystals').click();
  const labels = crystalCards().flatMap((c) =>
    [...c.querySelectorAll('button')].map((b) => b.textContent ?? '')
  );
  assert(labels.length > 0, 'the crystals screen offers something', String(labels.length));
  assert(!labels.some((t) => /sell/i.test(t)), 'and never a sale', labels.join(' | '));
  $('crystals-close').click();
}

// Sell mode: a click in the dock sells, and only while the mode says so. The
// old bulk button could only take the heap nothing had been spent on, so the
// pieces you actually wanted rid of still came out one right-click at a time.
{
  $('open-shop').click();
  const mode = () => $('shop-sell');
  assert(/sell mode/i.test(text('shop-sell')), 'the counter offers a sell mode', text('shop-sell'));
  assert(
    !mode().classList.contains('buy--armed'),
    'which is off until you turn it on'
  );

  mode().click();
  assert(mode().classList.contains('buy--armed'), 'turning it on says so');
  const lit = filled('#inv-gear').filter((b) => b.classList.contains('slot--on'));
  assert(lit.length > 0, 'and lights everything a click would sell', String(lit.length));
  assert(/sell for \d+ gold/i.test(named(lit[0])), 'saying what for', named(lit[0]));

  const asked = Number(named(lit[0]).match(/(\d+) gold/)?.[1] ?? 0);
  const before = purse();
  const carried = filled('#inv-gear').length;
  lit[0].click();
  assert(purse() === before + asked, 'a click sells for what it offered', `${before} -> ${purse()}, asked ${asked}`);
  assert(filled('#inv-gear').length === carried - 1, 'and the piece leaves the dock');

  // What you sold waits on the counter, at the same number in the other
  // direction — so the pair is neutral and the shelf cannot be ground.
  const sold = () => all('#shop-sold button.buy');
  const kept = sold().length;
  assert(kept > 0, 'the counter keeps what you sold', String(kept));
  assert(/buy back/i.test(sold()[0].textContent ?? ''), 'and offers it back', sold()[0].textContent);
  assert(
    Number((sold()[0].textContent ?? '').match(/(\d+) gold/)?.[1]) === asked,
    'newest first, at exactly what it paid',
    sold()[0].textContent
  );

  const owed = purse();
  sold()[0].click();
  assert(purse() === owed - asked, 'buying back costs the same', `${owed} -> ${purse()}`);
  assert(filled('#inv-gear').length === carried, 'and the piece comes home');
  assert(sold().length === kept - 1, 'and leaves the counter', String(sold().length));

  mode().click();
  assert(!mode().classList.contains('buy--armed'), 'turning it off says so too');
  assert(
    filled('#inv-gear').every((b) => !/sell/i.test(named(b))),
    'and a click in the dock stops meaning sell'
  );
}

// Right-click a shelf recipe and it asks how many. Twenty shards twenty
// clicks at a time is what kills an evening; the left click still buys one.
{
  const recipe = all('#workshop button.buy')[0];
  recipe.dispatchEvent(new window.MouseEvent('contextmenu', { bubbles: true, cancelable: true }));
  const counts = all('#itemmenu .itemmenu__item').map((b) => b.textContent ?? '');
  assert(counts.length > 0, 'the shelf asks how many', counts.join(' | '));
  assert(counts.every((t) => /buy \d+/i.test(t)), 'and every answer is a count', counts.join(' | '));

  const five = counts.findIndex((t) => /buy 5\b/i.test(t));
  if (five >= 0) {
    const before = purse();
    all('#itemmenu .itemmenu__item')[five].click();
    assert(purse() < before, 'and picking one spends for the lot', `${before} -> ${purse()}`);
  } else {
    document.body.dispatchEvent(new window.PointerEvent('pointerdown', { bubbles: true }));
  }
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

// --- three slots -----------------------------------------------------------
// The hosted build has no server behind it, so localStorage is the whole save.
// A reload that starts you over is the one bug this feature can have — and now
// that there are three of them, so is writing into the wrong one. The model is
// SELECT then act: a click picks a slot, and Play now, Save here and Delete
// all act on the pick. Left near the end on purpose: the last part of it
// really does wipe everything.
{
  const stored = (slot) => {
    const raw = window.localStorage.getItem(`crystal-core.save.${slot}`);
    return raw === null ? null : JSON.parse(raw);
  };

  assert(stored(1) !== null, 'the game writes a save');
  assert(stored(1).version === 1, 'stamped with the format it was written in');
  assert(stored(2) === null, 'and only into the slot being played', 'slot 2 was written');

  $('open-save').click();
  assert($('savedata').hidden === false, 'the Save & Load screen opens');
  assert(
    /this browser/i.test(text('save-where')),
    'and says which browser your progress is in',
    text('save-where').slice(0, 50)
  );
  assert(all('.saveslot').length === 3, 'three slots', String(all('.saveslot').length));
  assert(
    $('save-row-1').classList.contains('saveslot--live'),
    'the one you are playing says so',
    $('save-row-1').className
  );
  assert(
    $('save-row-1').classList.contains('saveslot--picked'),
    'and starts selected',
    $('save-row-1').className
  );
  // The box is who is in it and nothing else: name, trade and level.
  assert(/level \d+/i.test(text('save-row-1')), 'a held slot says its level', text('save-row-1'));
  assert(
    !/saved|ago/i.test(text('save-row-1')),
    'and no longer narrates when it saved',
    text('save-row-1')
  );
  assert(/empty/i.test(text('save-row-2')), 'an empty slot says so', text('save-row-2'));
  // Deleting the slot you are standing in is a question nobody meant to ask.
  assert($('save-delete').disabled === true, 'Delete refuses the slot you are playing');

  $('save-row-2').click();
  assert($('save-row-2').classList.contains('saveslot--picked'), 'clicking a slot selects it');
  assert(!$('save-row-1').classList.contains('saveslot--picked'), 'one selection at a time');

  // Save here fills the selected slot with the live game.
  const owned = dockItems().length;
  $('save-here').click();
  assert(stored(2) !== null, 'Save here fills the selected slot');
  assert(
    stored(2).character.name === stored(1).character.name,
    'with the game you are playing',
    `${stored(2)?.character?.name} vs ${stored(1)?.character?.name}`
  );
  assert(
    window.localStorage.getItem('crystal-core.slot') !== '2',
    'saving does not move you into it',
    window.localStorage.getItem('crystal-core.slot') ?? '(unset)'
  );

  // Saving over a held game is the one save that destroys one, so it warns.
  $('save-here').click();
  assert($('confirm').hidden === false, 'Save here over a held game asks first');
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert($('confirm').hidden === true, 'Escape answers it no');

  // Playing another game asks first — it puts a different game in front of
  // you, and the answer arrives a microtask after the click.
  $('save-play').click();
  assert($('confirm').hidden === false, 'Play now on another game asks before it switches');
  assert(
    document.activeElement === $('confirm-no'),
    'and focus starts on Cancel',
    document.activeElement?.id ?? '(none)'
  );
  document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await new Promise((r) => setTimeout(r, 0));
  assert(
    window.localStorage.getItem('crystal-core.slot') !== '2',
    'and nothing switched',
    window.localStorage.getItem('crystal-core.slot') ?? '(unset)'
  );

  $('save-play').click();
  $('confirm-yes').click();
  await new Promise((r) => setTimeout(r, 0));
  assert(
    window.localStorage.getItem('crystal-core.slot') === '2',
    'confirming moves you into that slot',
    window.localStorage.getItem('crystal-core.slot') ?? '(unset)'
  );
  assert($('savedata').hidden === true, 'and gets out of the way');
  assert(
    dockItems().length === owned,
    'and the same game is in front of you, since it was a copy of it',
    `${dockItems().length} vs ${owned}`
  );

  // Delete acts on the selection, with a warning of its own.
  $('open-save').click();
  $('save-row-1').click();
  assert($('save-delete').disabled === false, 'a held slot you are not in can be deleted');
  $('save-delete').click();
  assert($('confirm').hidden === false, 'Delete asks first');
  $('confirm-yes').click();
  await new Promise((r) => setTimeout(r, 0));
  assert(stored(1) === null, 'and the slot is gone');
  assert(stored(2) !== null, 'while the others stay');

  // A new game is Play now on an EMPTY slot. Nothing is lost by it: what you
  // were playing is still in the slot you left.
  $('save-row-3').click();
  $('save-play').click();
  await new Promise((r) => setTimeout(r, 0));
  assert(
    window.localStorage.getItem('crystal-core.slot') === '3',
    'Play now on an empty slot starts a new game there',
    window.localStorage.getItem('crystal-core.slot') ?? '(unset)'
  );
  assert(
    dockItems().length < owned,
    'and really is a new game',
    `${dockItems().length} vs ${owned}`
  );
  assert(
    stored(2) !== null && stored(2).onboarded === true,
    'while the one you left is untouched in its own slot',
    JSON.stringify(stored(2)?.onboarded)
  );
  assert(stored(3) !== null && stored(3).onboarded === false, 'and the new one is written');

  $('open-save').click();
  $('save-close').click();
  assert($('savedata').hidden === true, 'and the screen closes');
}

// --- the page itself must not scroll --------------------------------------
assert(
  window.getComputedStyle(document.body).overflow === 'hidden',
  'page does not scroll',
  window.getComputedStyle(document.body).overflow
);

// --- sorting the dock -----------------------------------------------------
// A limit you can see is only useful if you can arrange what is under it, and
// the order is saved, so a sort you liked survives a reload. Last, because it
// moves every slot and half the checks above pick a piece by where it sits.
{
  const order = () => filled('#inv-gear').map((b) => named(b));
  const before = order();
  $('inv-sort').click();
  const after = order();
  assert(after.length === before.length, 'sorting loses nothing', `${before.length} -> ${after.length}`);
  assert(after.join('|') !== before.join('|') || before.length < 2, 'and actually reorders');
  assert(
    [...after].sort().join('|') === [...before].sort().join('|'),
    'and holds exactly what it held'
  );
  $('inv-sort').click();
  assert(order().join('|') === after.join('|'), 'and sorting twice changes nothing');

  // By slot, in the order the character sheet draws them — the dock is what
  // you scan before equipping, so that is the grouping being asked for.
  const kinds = after.map((n) => (n.match(/Wear as ([A-Za-z ]+?)(?: \(|:)/) ?? [])[1] ?? '?');
  const firstAt = kinds.map((k) => kinds.indexOf(k));
  assert(
    firstAt.every((at, i) => i === 0 || at <= firstAt[i - 1] || at === i),
    'and every slot ends up in one run',
    kinds.join(', ')
  );
}

// --- finding one thing in a pile -------------------------------------------
// Last, because it changes what is DRAWN and every check above picks a piece
// by where it sits. The counts must keep reading the real bag: a filter that
// moved the numbers would be a search that looked like it sold your gear.
{
  // The slot tests above ended on a NEW game, so there is nothing in the dock
  // to search. Restock — this is the last check in the file.
  $('dev-kit').click();
  $('confirm-yes').click();
  await new Promise((r) => setTimeout(r, 0));

  const shown = () => filled('#inv-gear').length;
  const label = () => text('inv-gear-label');
  const all = shown();
  const held = label();
  assert(all > 1, 'there is a pile to search', String(all));

  const box = $('inv-find');
  const type = (v) => {
    box.value = v;
    box.dispatchEvent(new window.Event('input', { bubbles: true }));
  };

  const first = named(filled('#inv-gear')[0]).split('\n')[0].trim();
  const word = first.split(' ').pop();
  type(word);
  assert(shown() < all, `typing "${word}" hides what does not match`, `${shown()} of ${all}`);
  assert(shown() > 0, 'and keeps what does', String(shown()));
  assert(label() === held, 'while the count still reads the real bag', `${label()} vs ${held}`);

  type(word.toUpperCase());
  assert(shown() > 0, 'case is not a syntax');

  type('zzzznothing');
  assert(shown() === 0, 'a word nothing has hides everything', String(shown()));
  assert(label() === held, 'and STILL says what you are holding', label());

  type('');
  assert(shown() === all, 'and clearing it puts the pile back', `${shown()} of ${all}`);
}

// --- the tooltip is the top layer -----------------------------------------
// It explains what you are looking at, so it cannot sit under the thing
// telling you to click it. Measured against every layer the app can raise,
// rather than against the number written in the stylesheet.
{
  const layer = (cls) => {
    const probe = document.createElement('div');
    probe.className = cls;
    document.body.append(probe);
    const z = Number(window.getComputedStyle(probe).zIndex);
    probe.remove();
    return z;
  };
  const tip = layer('tip');
  for (const cls of ['modal', 'speech', 'dragghost', 'itemmenu', 'toast']) {
    assert(tip > layer(cls), `the tooltip draws over .${cls}`, `${tip} vs ${layer(cls)}`);
  }
  // A bubble is its own layer, over the windows it has to cover.
  assert(layer('speech') > layer('modal'), 'a bubble draws over a window');
  assert(
    window.getComputedStyle($('tooltip')).pointerEvents === 'none',
    'and is never hit-tested, so nothing can be trapped behind it'
  );
}

// --- the trade: the part of a character that is not the skill -------------
// Last, because it grants character levels to reach the first point and every
// check above reads a character this one has moved.
{
  // A row for a rule you do not have is a row about nothing.
  assert(
    $('run-warded-row').hidden === true && $('run-overcharged-row').hidden === true,
    'the run readout says nothing about a trade rule that is not firing'
  );
  assert($('open-trade') !== null, 'there is a Trade button in the header');
  $('open-trade').click();
  assert($('trade').hidden === false, 'and it opens a screen of its own');
  assert(
    all('#trade-pick .catcard').length === 2,
    'two trades are offered, and neither is picked for you',
    String(all('#trade-pick .catcard').length)
  );
  assert($('trade-swap').hidden === true, 'and nothing offers to change one you do not have');
  assert(
    all('#trade-pick .catcard').every((c) => c.disabled === true),
    'and neither can be taken up before a level has paid for a point'
  );
  assert($('trade-webwrap').hidden === true, 'no web is drawn before one is taken up');
  assert(
    $('open-trade').querySelector('.tabbadge') === null,
    'and nothing is waiting before a level pays for it'
  );
  const before = text('trade-sub');
  assert(/\d/.test(before), 'the screen says which level hands over the first point', before);

  // Five character levels buy the first point. Levelling is the only thing
  // that does, which is what makes a trade the second job a level has.
  $('trade-close').click();
  $('open-character').click();
  for (let i = 0; i < 6; i++) $('sheet-devlevel').click();
  $('sheet-close').click();
  assert(
    $('open-trade').querySelector('.tabbadge')?.textContent === '1',
    'the header says one trade point is waiting',
    $('open-trade').querySelector('.tabbadge')?.textContent ?? 'none'
  );

  $('open-trade').click();
  $('trade-pick-alchemist').click();
  assert($('trade-webwrap').hidden === false, 'taking one up draws its web');
  assert(
    all('#trade-web .web__node').length === 20,
    'twenty nodes, drawn to fit rather than scrolled',
    String(all('#trade-web .web__node').length)
  );
  assert(
    $('trade-web').querySelector('.web--drag') === null &&
      window.getComputedStyle($('trade-web')).cursor === 'default',
    'and it is a picture rather than a map — nothing to drag'
  );

  const open = () => all('#trade-web .web__node--open');
  assert(open().length === 5, 'five ways in, one per spoke', String(open().length));
  open()[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  assert(
    all('#trade-web .web__node--on').length === 1,
    'a point spends on the node you clicked',
    String(all('#trade-web .web__node--on').length)
  );
  assert(
    $('open-trade').querySelector('.tabbadge') === null,
    'and the badge goes away rather than reading 0'
  );
  assert(open().length === 0, 'nothing else lights up with nothing left to spend');

  all('#trade-web .web__node--on')[0].dispatchEvent(
    new window.MouseEvent('click', { bubbles: true })
  );
  assert(
    all('#trade-web .web__node--on').length === 0 &&
      $('open-trade').querySelector('.tabbadge')?.textContent === '1',
    'clicking it again refunds the point',
    String(all('#trade-web .web__node--on').length)
  );

  // Changing trade names its price. Nothing is unforgiving in this game.
  assert(
    /\d+ gold/.test(text('trade-swap')),
    'and swapping says what it costs, in figures',
    text('trade-swap')
  );
  $('trade-swap').click();
  assert(
    $('trade-pick').hidden === false && $('trade-webwrap').hidden === true &&
      all('#trade-pick .catcard').length === 1,
    'asking to change offers the other trade, and only the other one',
    String(all('#trade-pick .catcard').length)
  );
  $('trade-swap').click();
  assert($('trade-webwrap').hidden === false, 'and backing out puts the web back');
  $('trade-close').click();
  assert($('trade').hidden === true, 'and it closes again');
}

// --- keeping going is not a choice ----------------------------------------
// Chaining descents is what this game is; Leave after this run and Abandon are
// the two ways out and there is no third.
assert($('run-repeat') === null, 'no checkbox offers to make the idle game not idle');
assert(
  $('run-leave') !== null && $('run-abandon') !== null,
  'and the two buttons that stop the loop are still there'
);

// --- windows: on top is what you touched last ------------------------------
// Escape used to close by a hand-written order, which with several open answers
// a window you are not looking at. Last in the file, because it opens screens
// over the dock and every check above picks dock items by position.
{
  const z = (id) => Number(window.getComputedStyle($(id)).zIndex);
  // Opening one is noticed by a MutationObserver, delivered on a microtask —
  // prompt in a browser, where it lands before the frame is painted.
  const settled = () => Promise.resolve();

  $('open-stash').click();
  await settled();
  $('open-history').click();
  await settled();
  assert(z('history') > z('stash'), 'the window opened last draws over the one before it');
  assert(z('corner') > z('history'), 'and never over the rail, which is how a screen is shut');

  $('stash')
    .querySelector('.modal__card')
    .dispatchEvent(new window.MouseEvent('pointerdown', { bubbles: true, button: 0 }));
  assert(z('stash') > z('history'), 'touching one puts it back on top');

  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert(
    $('stash').hidden === true && $('history').hidden === false,
    'and Escape answers that one rather than the one opened last'
  );
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  assert($('history').hidden === true, 'then the one under it');

  // A question is above the whole band whatever has been raised into it, or
  // the scrim is a sheet you can read a screen through.
  assert(z('confirm') > z('stash'), 'a scrim covers every window, raised or not');
}

// --- the panels stay away ---------------------------------------------------
// Module state lasted until a reload, which made Hide a thing you did again
// every session.
{
  // The autosave is on a timer, and a tab going away is what it listens for.
  const saved = () => {
    window.dispatchEvent(new window.Event('pagehide'));
    return JSON.parse(window.localStorage.getItem('crystal-core.save.3') ?? '{}');
  };
  $('ui-hide').click();
  assert(document.body.classList.contains('panelsoff'), 'Hide parks the panels');
  assert(saved().parked === true, 'and the save remembers it, like a keybind');
  $('ui-hide').click();
  assert(
    !document.body.classList.contains('panelsoff') && saved().parked === false,
    'pressing it again brings them back'
  );
}

// --- going back for one you have already put down --------------------------
// The dev kit is handed every key and every door, so the FIFTH socket is on
// the Fissure rather than a thing you farm for before you can test it. It is
// NOT clicked here: socketing consumes the key and arms the next entry, and a
// smoke that armed it would fight a boss in every launch below.
{
  const socket = $('run-socket-key');
  assert(socket !== null, 'the Fissure offers a keyhole under the crystal sockets');
  assert(/^Set /.test(socket.textContent), 'it names the key it takes', socket.textContent);
  assert(/\d+ held/.test(socket.textContent), 'and how many are held, in figures', socket.textContent);
  assert(/Spends the key/.test(socket.textContent), 'and says the cost is the socketing itself', socket.textContent);
  assert(!socket.disabled, 'an unarmed keyhole is clickable');
}

// --- he talks in the room, not over a sheet covering it --------------------
// A scene IS a stop — nothing is ticking and the map is not yours to click —
// so it does not need a scrim to prove it.
{
  assert($('speech') !== null, 'there is a bubble to say a line in');
  assert($('speech').hidden === true, 'and nothing is being said before anyone speaks');
  assert(
    $('speech-next') !== null && $('speech-next').tagName === 'BUTTON',
    'and a Next button advances it, rather than the box being secretly clickable'
  );
  assert(
    !$('met').classList.contains('modal--stop'),
    'the Lampwright no longer paints a scrim over his own workshop'
  );
  assert(
    $('met').classList.contains('modal--speech') && $('met-card') !== null,
    'his panel is the last bubble, anchored like every line before it'
  );
  assert($('met-said') === null, 'and his words are beats rather than a block of text');
}

// --- the Osteomancer's bench ----------------------------------------------
// LAST in the file: it adds a dock column and grafts a piece, and roughly a
// dozen assertions above pick a dock item by POSITION.
{
  assert($('graft').hidden === true, 'his bench starts closed');
  assert(
    $('graft').classList.contains('modal--speech') && $('graft-card') !== null,
    'and it is the last bubble of his room rather than a screen'
  );
  assert(
    !$('graft').classList.contains('modal--stop'),
    'so it paints no scrim over the room it is standing in'
  );

  // The dev kit carries one, which is the whole of what schedules him.
  assert(relicSlots().length > 0, 'the dev kit carries a specimen', String(relicSlots().length));
  assert($('inv-relics-col').hidden === false, 'and the column it lives in is up');
  assert(
    relicSlots().every((b) => b.disabled),
    'and nothing in it has a click: it is carried to a person, never spent'
  );
}

assert(pageErrors.length === 0, 'no console errors during interaction', pageErrors.join(' | '));

window.close();
console.log(`\nsmoke: ${checks} checks passed`);
