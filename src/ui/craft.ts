/**
 * THE BENCH, and it SELECTS. Under the item is every line it could still take:
 * the tier, what the level's window would roll, and the shards it costs against
 * the shards you hold. The bench holds exactly one item; putting a second down
 * returns the first.
 *
 * A CRYSTAL is the one thing here that still rolls, and a Shard of Making is
 * what rolls it.
 */
import { Rng } from '../rng';
import {
  ModPool,
  hasOpenSlot,
  modCapacity,
  tierName,
  slotCapacity,
  slotTypes,
  slotUsed,
} from '../mods';
import {
  chooseMod,
  chosenLines,
  choices,
  costOf,
  describeMod,
  linesAllowed,
  rollCrystal,
  whyNotChoose,
  windowRange,
} from '../crafting';
import { ALL_MODS, CURRENCY_BY_ID, PROFESSION_BY_ID, SELECT, SHARD_BY_ID } from '../data';
import { craftLevel, recipeFor } from '../game/forge';
import { professionAt } from '../game/work';
import { statParts } from '../mod-text';
import { balance, spend } from '../economy';
import { craftItem, clearCraft, replaceItem, selectForCraft } from '../game/state';
import type { GameState } from '../game/state';
import { EQUIP_SLOTS } from '../data';
import { currencyIcon, gearIcon, itemIcon } from './icons';
import {
  consumeDrag,
  pressItem,
  renderInventory,
  setCurrencyHandler,
  setInventoryHandler,
} from './inventory';
import { note } from './history';
import { attachTooltip, hideTooltip } from './tooltip';
import { crystalFamily, rewardRows } from '../sim/crystal';
import { grantLines, grantSaid, itemCard, statLines } from './itemcard';
import { crystalProgress } from '../game/crystals';
import { crystalsIn, socketed } from '../game/state';
import { CRYSTAL_SLOTS, FAMILY_BY_ID } from '../data';
import type { CurrencyDef, Item, ModEntry, RolledMod } from '../types';

const pool = new ModPool(ALL_MODS);
let seed = Math.floor(Math.random() * 1e9);
let rng = new Rng(seed);
let game: GameState;
let focused: string | null = null;

/** Facet colour by what the mod actually does. */
const TAG_COLOURS: Array<[string, string]> = [
  ['density', 'amethyst'],
  ['reward', 'citrine'],
  ['danger', 'ember'],
  ['layout', 'quartz'],
  ['damage', 'ember'],
  ['defence', 'quartz'],
  ['speed', 'verdite'],
  ['clear', 'verdite'],
  ['crit', 'citrine'],
  ['utility', 'verdite'],
];

function facetOf(mod: RolledMod): string {
  for (const [tag, colour] of TAG_COLOURS) {
    if (mod.tags.includes(tag)) return colour;
  }
  return 'quartz';
}

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * THE ONE ROLL LEFT. A crystal's rules are its difficulty, so choosing them
 * would let a build take the cheapest danger for the richest payment.
 */
function roll(currency: CurrencyDef): void {
  const item = craftItem(game);
  if (!item) return;

  if (balance(game.wallet, currency.id) < 1) {
    note(`${currency.name} — none in stock`, 'fail');
    render();
    return;
  }

  const result = rollCrystal(item, pool, rng);
  if (!result.ok) {
    // A refused roll costs nothing — the shard is only spent on a change.
    note(`${currency.name} — ${result.error}`, 'fail');
    render();
    return;
  }

  spend(game.wallet, { [currency.id]: 1 });
  note(currency.name, 'note');
  for (const entry of result.log) note(entry, 'add');
  // The item keeps its id, so it swaps back into the same socket and stays
  // selected.
  replaceItem(game, result.item);
  render();
  onChanged?.();
}

/** The profession the bench reads, which is the LOWEST the recipe names: a
 *  hybrid is no better than the profession you neglected. */
function benchProfession(item: Item): { id: string; level: number } | null {
  const recipe = recipeFor(item.base);
  if (!recipe || recipe.parts.length === 0) return null;
  const worst = recipe.parts.reduce((a, b) =>
    professionAt(game, a.profession).level <= professionAt(game, b.profession).level ? a : b
  );
  return { id: worst.profession, level: craftLevel(game, recipe) };
}

/** PUT A CHOSEN LINE ON. Refuses before it spends, and says the number. */
function choose(entry: ModEntry): void {
  const item = craftItem(game);
  if (!item) return;
  const level = benchProfession(item)?.level ?? 0;
  const why = whyNotChoose(item, entry, level, (id) => balance(game.wallet, id), game.character.plans ?? []);
  if (why) {
    note(why, 'fail');
    return;
  }
  const { shard, n } = costOf(entry);
  spend(game.wallet, { [shard!]: n });
  const out = chooseMod(item, entry, level, rng);
  note(`+ ${describeMod(out.mods[out.mods.length - 1])}`, 'add');
  replaceItem(game, out);
  render();
  onChanged?.();
}

function reseed(): void {
  seed = Math.floor(Math.random() * 1e9);
  rng = new Rng(seed);
  note(`Seed ${seed}`);
  render();
}

function renderItem(): void {
  const item = craftItem(game);

  const empty = $('craft-empty');
  const body = $('craft-item');
  empty.hidden = !!item;
  body.hidden = !item;
  $('craft-picks').hidden = !item || item.kind !== 'gear';
  ($('craft-return') as HTMLButtonElement).disabled = !item;

  if (!item) return;

  const worn = EQUIP_SLOTS.find((s) => game.character.equipment[s.id]?.id === item.id);
  $('item-name').textContent = item.name;
  // The ladder first: it is the whole of how much the item can hold, and the
  // only thing that moves it is finding a better base.
  $('item-meta').textContent =
    `${tierName(item)} · ilvl ${item.ilvl} · ` +
    `${item.mods.length}/${modCapacity(item)} modifiers` +
    // A chosen line is live against something you are wearing, and the sheet
    // moves under you when it lands.
    (worn ? ` · worn, ${worn.name.toLowerCase()}` : '');

  // What this crystal is worth, right under its name — the mods below say
  // what makes it dangerous, this says what the danger buys.
  const multipliers = $('item-rewards');
  multipliers.replaceChildren();
  multipliers.hidden = item.kind !== 'crystal';
  if (item.kind === 'crystal') {
    for (const row of rewardRows(item)) {
      const chip = el('span', 'mult');
      chip.append(el('span', 'mult__k', row.label));
      chip.append(el('span', 'mult__v', row.value));
      multipliers.append(chip);
    }
  }

  const host = $('sockets');
  host.replaceChildren();

  // One facet per opening the item actually has. Drawing the base's declared
  // table shows sockets that can never be filled, and the picture is what you
  // look at, not the count. A type with no room is simply not drawn.
  for (const slot of slotTypes(item)) {
    const cap = slotCapacity(item, slot);
    if (cap === 0) continue;

    const group = el('div', 'slotgroup');
    group.append(el('div', 'slotgroup__label', `${slot} ${slotUsed(item, slot)}/${cap}`));

    const row = el('div', 'facets');
    const mods = item.mods.filter((m) => m.slot === slot);

    for (let i = 0; i < cap; i++) {
      const mod = mods[i];
      const facet = el('button', 'facet') as HTMLButtonElement;
      if (mod) {
        facet.classList.add('facet--set', `facet--${facetOf(mod)}`);
        attachTooltip(facet, () => describeMod(mod));
        facet.setAttribute('aria-label', describeMod(mod));
        facet.onclick = () => {
          focused = focused === mod.entryId ? null : mod.entryId;
          render();
        };
        if (focused === mod.entryId) facet.classList.add('facet--focus');
        facet.append(el('span', 'facet__tier', `T${mod.tier}`));
      } else {
        facet.classList.add('facet--empty');
        facet.setAttribute('aria-label', `empty ${slot} slot`);
        facet.disabled = true;
      }
      row.append(facet);
    }
    group.append(row);
    host.append(group);
  }

  const list = $('modlist');
  list.replaceChildren();

  // Implicits first and visibly separate — they're part of the base, not
  // something you rolled, and no craft can touch them.
  for (const imp of item.implicits) {
    const row = el('div', 'mod mod--implicit');
    row.append(el('span', 'dot dot--citrine'));
    const b = el('div', 'mod__body');
    const stats = el('div', 'mod__stats');
    stats.append(...statLines(imp), ...grantLines(imp));
    b.append(stats);
    b.append(
      el(
        'div',
        'mod__name',
        item.meta.grafted !== undefined ? 'grafted — cannot be changed' : 'base — cannot be changed'
      )
    );
    row.append(b);
    list.append(row);
  }

  if (item.mods.length === 0) {
    list.append(
      el(
        'p',
        'empty',
        modCapacity(item) > 0
          ? 'No modifiers.'
          : 'No room until it levels.'
      )
    );
  }
  for (const mod of item.mods) {
    const row = el('div', 'mod');
    if (mod.chosen) row.classList.add('mod--chosen');
    if (focused === mod.entryId) row.classList.add('mod--focus');
    row.append(el('span', `dot dot--${facetOf(mod)}`));
    const b = el('div', 'mod__body');
    // The shared stat row, not a local format. This screen once built its own
    // text out of the raw stat KEY, so the one place you look hardest at an
    // item was the one place printing "+14 coldRes" — the exact leak the mods
    // check exists to catch, in the exact spot it does not look.
    const stats = el('div', 'mod__stats');
    stats.append(...statLines(mod), ...grantLines(mod));
    b.append(stats);
    b.append(
      el('div', 'mod__name', `T${mod.tier} ${mod.name} · ${mod.slot}${mod.chosen ? ' · chosen' : ''}`)
    );
    row.append(b);
    list.append(row);
  }

  renderPicks(item);
}

/**
 * WHAT MAY STILL GO ON IT. One row a line: the tier, what this level's window
 * would roll, and the shards it costs against the shards you hold. A row you
 * cannot take is DIMMED rather than hidden, and carries the number that is
 * short — a list that shrank as you levelled would never say what levelling is
 * for.
 */
function renderPicks(item: Item): void {
  const host = $('craft-pick');
  host.replaceChildren();
  const line = $('craft-level');

  if (item.kind !== 'gear') {
    line.hidden = true;
    return;
  }


  const at = benchProfession(item);
  const level = at?.level ?? 0;
  const allowed = linesAllowed(level);
  const taken = chosenLines(item);
  const who = PROFESSION_BY_ID[at?.id ?? '']?.name ?? 'Crafting';
  line.hidden = false;
  line.textContent =
    allowed === 0
      ? `${who} ${level} · level ${SELECT.linesAt[0]} chooses the first line`
      : `${who} ${level} · ${taken} of ${allowed} chosen lines`;

  // Grouped by the SHARD as well as by the slot, because what you are short of
  // is a shard: the icon and the count belong to the group, and a row is then
  // three spans rather than a whole sprite apiece.
  const entries = [...choices(item, pool)].sort(
    (a, b) =>
      a.slot.localeCompare(b.slot) ||
      (costOf(a).shard ?? '').localeCompare(costOf(b).shard ?? '') ||
      a.defId.localeCompare(b.defId) ||
      a.tier - b.tier
  );
  if (entries.length === 0) {
    host.append(el('p', 'empty', 'No open slot.'));
    return;
  }

  let slot = '';
  let shard = '';
  for (const entry of entries) {
    if (entry.slot !== slot) {
      slot = entry.slot;
      shard = '';
      host.append(el('div', 'slotgroup__label', slot));
    }
    const buys = costOf(entry).shard ?? '';
    if (buys !== shard) {
      shard = buys;
      const head = el('div', 'picklist__shard');
      const def = CURRENCY_BY_ID[shard];
      if (def) head.append(currencyIcon(def, 16));
      head.append(el('span', 'picklist__name', def?.name ?? shard));
      head.append(el('span', 'picklist__held', String(balance(game.wallet, shard))));
      host.append(head);
    }
    host.append(pickRow(item, entry, level));
  }
}

function pickRow(item: Item, entry: ModEntry, level: number): HTMLButtonElement {
  const why = whyNotChoose(item, entry, level, (id) => balance(game.wallet, id), game.character.plans ?? []);
  const { shard, n } = costOf(entry);
  const held = shard ? balance(game.wallet, shard) : 0;

  const row = el('button', 'craftpick') as HTMLButtonElement;
  row.append(el('span', 'craftpick__tier', `T${entry.tier}`));

  // The stat line as the WINDOW would roll it, not the tier's whole range: the
  // number a player acts on is the one they will get. Split rather than
  // string-replaced, or a range whose figure appears twice comes out mangled.
  // A LINE WHOSE WHOLE EFFECT IS A SWITCH has no stat to put a window round —
  // +1 Projectile is a rung, not a range — so it says the switch instead.
  const said = entry.stats.length === 0 ? grantSaid(entry).join(', ') : '';
  if (said) {
    row.append(el('span', 'craftpick__what', said));
  } else {
    const [lo, hi] = windowRange(entry, level);
    const top = statParts({ ...entry.stats[0], value: hi, tags: entry.stats[0]?.tags ?? [] });
    const bottom = statParts({ ...entry.stats[0], value: lo, tags: entry.stats[0]?.tags ?? [] });
    const span = lo === hi ? top.value : `${bottom.value}–${top.value.replace(/^\+/, '')}`;
    row.append(el('span', 'craftpick__what', `${span} ${top.label}`));
  }

  const cost = el('span', 'craftpick__cost');
  cost.append(el('span', 'craftpick__n', `${n}`));
  row.append(cost);

  const name = SHARD_BY_ID[shard ?? '']?.name ?? 'shard';
  attachTooltip(row, () =>
    [
      `${entry.name} · tier ${entry.tier}`,
      ...entry.stats.map((st, i) => {
        const [a, b] = windowRange(entry, level, i);
        const one = statParts({ ...st, value: b, tags: st.tags ?? [] });
        const low = statParts({ ...st, value: a, tags: st.tags ?? [] });
        return `${a === b ? one.value : `${low.value}–${one.value.replace(/^\+/, '')}`} ${one.label}`;
      }),
      `${n} ${name}, you hold ${held}`,
      why ? `— ${why}` : '— click to put it on',
    ].join('\n')
  );

  if (why) {
    row.disabled = true;
    row.classList.add('craftpick--off');
    row.setAttribute('aria-label', `${entry.name} tier ${entry.tier} — ${why}`);
  } else {
    row.onclick = () => choose(entry);
    row.setAttribute('aria-label', `Add ${entry.name} tier ${entry.tier} for ${n} ${name}`);
  }
  return row;
}

/** Id of one crystal's button beside the bench, so the guide can ring it. */
export const crystalSlotId = (itemId: string): string => `bench-${itemId}`;

/** Said in one place, because it is said twice: on a crystal, and under them. */
const WHY_SHUT = `The bench reaches a crystal once you hold all ${CRYSTAL_SLOTS.length}.`;

/**
 * Every crystal you own, beside the bench. They are never carried, so the dock
 * cannot hand one over and this column is the only way one gets worked on.
 * Socketed ones are in here too: a socket is where a crystal LIVES, and taking
 * it out to add a modifier would cost the run it is already set up for.
 */
function renderCrystals(): void {
  const host = $('craft-crystals');
  host.replaceChildren();
  const grid = el('div', 'worn__grid');

  const worn = socketed(game);
  const all = [...worn, ...crystalsIn(game)];
  for (const item of all) {
    const family = FAMILY_BY_ID[crystalFamily(item)];
    const btn = el('button', 'wornslot') as HTMLButtonElement;
    btn.id = crystalSlotId(item.id);
    btn.append(itemIcon(item, 22));
    const body = el('span', 'wornslot__body');
    // The family, not the full name: the level is on the line under it, so
    // "Level 2 Demonic Crystal" spends the whole row saying it twice and then
    // runs out of room to say either.
    body.append(el('span', 'wornslot__name', `${family?.word || 'Normal'} Crystal`));
    body.append(
      el(
        'span',
        'wornslot__slot',
        `lv ${crystalProgress(item).level}${worn.includes(item) ? ' · socketed' : ''}`
      )
    );
    btn.append(body);
    if (item.id === game.craftId) btn.classList.add('wornslot--on');

    attachTooltip(btn, () => itemCard(item, ['click to open on the bench']));
    btn.setAttribute('aria-label', `Open on bench: ${item.name}`);
    btn.onclick = () => {
      if (!consumeDrag()) bench(item);
    };
    grid.append(btn);
  }

  if (all.length === 0) {
    grid.append(el('p', 'worn__hint', 'None yet.'));
  }
  host.append(grid);
}

/** Opens a worn piece on the bench. It never comes off to be worked on. */
function bench(item: Item): void {
  selectForCraft(game, item);
  focused = null;
  note(`Bench: ${item.name}`);
  render();
}

/**
 * What you are wearing, beside the bench. Improving worn gear otherwise meant
 * the sheet to take it off, the dock to bench it, and the sheet again to put
 * it back on — three screens to spend one shard.
 *
 * Empty slots are drawn too: they are where a dragged piece lands.
 */
function renderWorn(): void {
  const host = $('craft-worn');
  host.replaceChildren();
  const grid = el('div', 'worn__grid');

  // A TOOL HOLDS NO MODIFIER SLOT, so its square here would never take a
  // currency: the bench shows what can be crafted on and nothing else.
  for (const slot of EQUIP_SLOTS.filter((s) => s.group !== 'tool')) {
    const item = game.character.equipment[slot.id];
    const btn = el('button', 'wornslot') as HTMLButtonElement;
    btn.dataset.equip = slot.id;

    if (!item) {
      btn.classList.add('wornslot--bare');
      btn.append(el('span', 'wornslot__slot', slot.name));
      btn.disabled = true;
      btn.setAttribute('aria-label', `${slot.name} — empty`);
      grid.append(btn);
      continue;
    }

    btn.append(gearIcon((item.meta.art as string) ?? 'body', 22));
    const body = el('span', 'wornslot__body');
    body.append(el('span', 'wornslot__name', item.name));
    body.append(el('span', 'wornslot__slot', slot.name));
    btn.append(body);
    if (item.id === game.craftId) btn.classList.add('wornslot--on');

    attachTooltip(btn, () => itemCard(item, [`worn, ${slot.name.toLowerCase()}`, 'click to open on the bench']));
    btn.setAttribute('aria-label', `Open on bench: ${item.name}`);
    btn.onclick = () => {
      if (!consumeDrag()) bench(item);
    };
    btn.addEventListener('pointerdown', (e) =>
      pressItem(e as PointerEvent, btn, item, () => bench(item))
    );
    grid.append(btn);
  }
  host.append(grid);
}

export function render(): void {
  // Re-rendering removes whatever the cursor was over; a tooltip bound to a
  // detached element would otherwise sit there forever.
  hideTooltip();
  renderCrystals();
  renderWorn();
  renderItem();
  $('seed').textContent = String(seed);
  // A shard's count is what the pick list is read against, so the dock redraws
  // whenever the bench does.
  renderInventory();
}

/**
 * Clicking an inventory item opens it on the bench. It stays in the list,
 * highlighted — the selection is a reference, not a move.
 */
function itemHandler() {
  return {
    actionFor: (item: Item) => ({ label: 'Open on bench', run: () => bench(item) }),
    highlighted: (item: Item) => item.id === game.craftId,
  };
}

/**
 * What a shard in the dock does when you click it. A shard is a COST rather
 * than a thing you apply, so the click opens the bench where it is spent; the
 * crystal's own shard is the exception, and rolls a benched crystal outright.
 */
function currencyHandler() {
  return {
    actionFor: (currency: CurrencyDef) => {
      const item = craftItem(game);
      if (currency.crystal && item?.kind === 'crystal' && hasOpenSlot(item)) {
        return {
          label: `use on ${item.name}`,
          run: () => {
            openCraft();
            roll(currency);
          },
        };
      }
      return {
        label: 'open the bench',
        run: () => {
          openCraft();
          render();
        },
      };
    },
    blocked: (currency: CurrencyDef) => {
      if (!currency.crystal) return null;
      const item = craftItem(game);
      if (!item) return null;
      if (item.kind !== 'crystal') return 'A Shard of Making only reaches a crystal.';
      return hasOpenSlot(item) ? null : 'No open slot.';
    },
  };
}

/**
 * The bench is a popup over the map, not a page you leave for.
 *
 * A run keeps going behind it, so the crystal you're crafting can be paid for
 * by the map you're still clearing — and the dock stays uncovered, because
 * clicking something in it is how anything gets onto the bench at all, and
 * how every currency gets spent.
 */
let onClosed: (() => void) | null = null;
/** A craft can land on something you are wearing, and stats move when it does. */
let onChanged: (() => void) | null = null;

export function openCraft(): void {
  $('craft').hidden = false;
  setInventoryHandler(itemHandler());
  render();
}

export function closeCraft(): void {
  $('craft').hidden = true;
  hideTooltip();
  onClosed?.();
}

export const isCraftOpen = (): boolean => !$('craft').hidden;

/** Redraws if it is up, for an equip made somewhere else — the worn column moved. */
export function refreshCraft(): void {
  if (isCraftOpen()) render();
}

export function initCraft(state: GameState, closed: () => void, changed?: () => void): void {
  game = state;
  onClosed = closed;
  onChanged = changed ?? null;

  ($('reseed') as HTMLButtonElement).onclick = reseed;
  ($('craft-close') as HTMLButtonElement).onclick = closeCraft;
  ($('craft-return') as HTMLButtonElement).onclick = () => {
    const item = craftItem(game);
    if (!item) return;
    note(`Closed ${item.name}`);
    clearCraft(game);
    render();
  };

  setCurrencyHandler(currencyHandler());
  note(`Seed ${seed}`);
  render();
}
