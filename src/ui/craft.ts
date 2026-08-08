/**
 * Crafting.
 *
 * The window is the item and nothing else. It used to also hold a shop and a
 * shelf of thirteen labelled currency buttons, which made it a control panel
 * that happened to have an item in it — and on any window narrow enough to
 * stack, the item scrolled out of sight the moment you reached for a
 * currency, so you were choosing what to apply without being able to see what
 * you were applying it to.
 *
 * Currency now lives in the dock as stacks you own, and this screen is what
 * gives clicking one a meaning: with an item open, a currency applies to it.
 * The bench holds exactly one item at a time; putting a second one down
 * returns the first.
 */
import { Rng } from '../rng';
import {
  ModPool,
  modCapacity,
  qualityName,
  qualityOf,
  slotCapacity,
  slotTypes,
  slotUsed,
} from '../mods';
import { canApply, craft, describeMod } from '../crafting';
import { describeStatLine } from '../mod-text';
import { ALL_MODS } from '../data';
import { balance, spend } from '../economy';
import { craftItem, clearCraft, replaceItem, selectForCraft } from '../game/state';
import type { GameState } from '../game/state';
import { renderInventory, setCurrencyHandler, setInventoryHandler } from './inventory';
import { note } from './history';
import { attachTooltip, hideTooltip } from './tooltip';
import { rewardRows } from '../sim/crystal';
import type { CurrencyDef, Item, RolledMod } from '../types';

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

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function use(currency: CurrencyDef): void {
  const item = craftItem(game);
  if (!item) return;

  if (balance(game.wallet, currency.id) < 1) {
    note(`${currency.name} — none in stock`, 'fail');
    render();
    return;
  }

  const result = craft(item, currency, pool, rng);
  if (!result.ok) {
    // A refused craft costs nothing — the currency is only spent on a change.
    note(`${currency.name} — ${result.error}`, 'fail');
    render();
    return;
  }

  spend(game.wallet, { [currency.id]: 1 });
  note(currency.name, 'note');
  for (const entry of result.log) {
    note(entry, entry.startsWith('-') ? 'remove' : 'add');
  }
  // The crafted item keeps its id, so it swaps back into the same inventory
  // slot and stays selected.
  replaceItem(game, result.item);
  render();
}

function reseed(): void {
  seed = Math.floor(Math.random() * 1e9);
  rng = new Rng(seed);
  note(`Seed ${seed}`);
  render();
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function renderItem(): void {
  const item = craftItem(game);

  const empty = $('craft-empty');
  const body = $('craft-item');
  empty.hidden = !!item;
  body.hidden = !item;
  ($('craft-return') as HTMLButtonElement).disabled = !item;

  if (!item) return;

  $('item-name').textContent = item.name;
  // Quality first, because it is the thing that decides what you can do next.
  // "blank / partial / full" said how far along the item was without ever
  // saying what its ceiling was, so a full Seamed item and a full Brilliant
  // one read identically.
  $('item-meta').textContent =
    `${qualityName(qualityOf(item))} · ilvl ${item.ilvl} · ` +
    `${item.mods.length}/${modCapacity(item)} modifiers` +
    (item.meta.corrupted ? ' · locked' : '');
  $('item-name').classList.toggle('locked', !!item.meta.corrupted);

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

  for (const slot of slotTypes(item)) {
    const group = el('div', 'slotgroup');
    const cap = slotCapacity(item, slot);
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
    b.append(el('div', 'mod__stats', describeMod(imp)));
    b.append(el('div', 'mod__name', 'base — cannot be changed'));
    row.append(b);
    list.append(row);
  }

  if (item.mods.length === 0) {
    list.append(el('p', 'empty', 'No modifiers. Click a currency in the dock below to fill a slot.'));
  }
  for (const mod of item.mods) {
    const row = el('div', 'mod');
    if (focused === mod.entryId) row.classList.add('mod--focus');
    row.append(el('span', `dot dot--${facetOf(mod)}`));
    const b = el('div', 'mod__body');
    // describeStatLine, not a local format. This screen was building its own
    // stat text out of the raw stat KEY, so the one place in the game you look
    // hardest at an item was the one place printing "+14 coldRes" and
    // "+5% increased castSpeed" — the exact identifier leak the mods check
    // exists to catch, in the exact spot the check does not look, because the
    // check tests the text layer and this bypassed it.
    b.append(el('div', 'mod__stats', mod.stats.map(describeStatLine).join(', ')));
    b.append(el('div', 'mod__name', `T${mod.tier} ${mod.name} · ${mod.slot}`));
    row.append(b);
    list.append(row);
  }
}

export function render(): void {
  // Re-rendering removes whatever the cursor was over; a tooltip bound to a
  // detached element would otherwise sit there forever.
  hideTooltip();
  renderItem();
  $('seed').textContent = String(seed);
  // Currency counts and the "can this apply" test both live on dock slots
  // now, so the dock has to redraw whenever the bench item changes.
  renderInventory();
}

/**
 * Clicking an inventory item opens it on the bench. It stays in the list,
 * highlighted — the selection is a reference, not a move.
 */
function itemHandler() {
  return {
    actionFor: (item: Item) => ({
      label: 'Open on bench',
      run: () => {
        selectForCraft(game, item);
        focused = null;
        note(`Bench: ${item.name}`);
        render();
      },
    }),
    highlighted: (item: Item) => item.id === game.craftId,
  };
}

/**
 * What a currency in the dock does when you click it.
 *
 * Registered once and never swapped, because the answer never depends on
 * which screen is open — it depends on whether there is something to apply it
 * TO. With the bench closed the click opens the bench, which is the only
 * useful reading of "use this on nothing"; a dead click there would just be a
 * currency you own that appears broken.
 */
function currencyHandler() {
  return {
    actionFor: (currency: CurrencyDef) => {
      const item = craftItem(game);
      if (!item) {
        return {
          label: 'open the bench',
          run: () => {
            openCraft();
            note(`${currency.name} — put an item on the bench first`);
          },
        };
      }
      if (canApply(item, currency)) return null;
      return {
        label: `use on ${item.name}`,
        run: () => {
          openCraft();
          use(currency);
        },
      };
    },
    blocked: (currency: CurrencyDef) => {
      const item = craftItem(game);
      return item ? canApply(item, currency) : null;
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

export function initCraft(state: GameState, closed: () => void): void {
  game = state;
  onClosed = closed;

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
