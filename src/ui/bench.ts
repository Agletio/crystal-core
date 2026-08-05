/**
 * The crafting bench.
 *
 * Now works on an item pulled out of the inventory rather than one conjured
 * from a button, and currency is spent from the wallet instead of being
 * infinite. The bench holds exactly one item at a time; putting a second one
 * down returns the first.
 */
import { Rng } from '../rng';
import { ModPool, fillState, slotCapacity, slotTypes, slotUsed } from '../mods';
import { canApply, craft, describeMod } from '../crafting';
import { ALL_MODS, CURRENCIES, RECIPES } from '../data';
import { balance, runRecipe, spend } from '../economy';
import { addItem, benchItem, clearBench, replaceItem, selectForBench } from '../game/state';
import type { GameState } from '../game/state';
import { renderInventory, setInventoryHandler } from './inventory';
import { currencyIcon } from './icons';
import { rewardRows } from '../sim/crystal';
import type { CurrencyDef, Item, RolledMod } from '../types';

const pool = new ModPool(ALL_MODS);
let seed = Math.floor(Math.random() * 1e9);
let rng = new Rng(seed);
let game: GameState;
let log: Array<{ text: string; kind: 'add' | 'remove' | 'note' | 'fail' }> = [];
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

function note(text: string, kind: 'add' | 'remove' | 'note' | 'fail' = 'note'): void {
  log.unshift({ text, kind });
  if (log.length > 60) log.length = 60;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function use(currency: CurrencyDef): void {
  const item = benchItem(game);
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

function buy(recipeId: string): void {
  const result = runRecipe(game.wallet, recipeId);
  if (!result.ok) {
    note(result.error ?? 'cannot afford that', 'fail');
    render();
    return;
  }
  if (result.item) {
    addItem(game, result.item);
    note(`Bought ${result.item.name}`, 'add');
  } else {
    note('Bought currency', 'add');
  }
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
  const item = benchItem(game);

  const empty = $('bench-empty');
  const body = $('bench-item');
  empty.hidden = !!item;
  body.hidden = !item;
  ($('bench-return') as HTMLButtonElement).disabled = !item;

  if (!item) return;

  $('item-name').textContent = item.name;
  $('item-meta').textContent =
    `ilvl ${item.ilvl} · ${fillState(item)}` + (item.meta.corrupted ? ' · locked' : '');
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
        facet.title = describeMod(mod);
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
  if (item.mods.length === 0) {
    list.append(el('p', 'empty', 'No modifiers. Use a currency to fill a slot.'));
  }
  for (const mod of item.mods) {
    const row = el('div', 'mod');
    if (focused === mod.entryId) row.classList.add('mod--focus');
    row.append(el('span', `dot dot--${facetOf(mod)}`));
    const b = el('div', 'mod__body');
    b.append(
      el(
        'div',
        'mod__stats',
        mod.stats
          .map((s) =>
            s.form === 'flat'
              ? `+${s.value} ${s.stat}`
              : `+${s.value}% ${s.form === 'inc' ? 'increased' : 'more'} ${s.stat}`
          )
          .join(', ')
      )
    );
    b.append(el('div', 'mod__name', `T${mod.tier} ${mod.name} · ${mod.slot}`));
    row.append(b);
    list.append(row);
  }
}

function renderCurrencies(): void {
  const host = $('currencies');
  host.replaceChildren();
  const item = benchItem(game);

  const classes = ['basic', 'uncommon', 'rare', 'exotic'] as const;
  for (const cls of classes) {
    const group = CURRENCIES.filter((c) => c.class === cls);
    if (group.length === 0) continue;
    host.append(el('div', 'shelf__label', cls));
    const grid = el('div', 'shelf');

    for (const currency of group) {
      const stock = balance(game.wallet, currency.id);
      const blocked = item ? canApply(item, currency) : 'nothing on the bench';
      const btn = el('button', `curr curr--${cls}`) as HTMLButtonElement;

      btn.append(currencyIcon(currency));
      const body = el('span', 'curr__body');
      body.append(el('span', 'curr__name', currency.name));
      body.append(el('span', 'curr__desc', currency.description));
      body.append(el('span', 'curr__stock', `${stock} held`));
      btn.append(body);

      if (blocked || stock < 1) {
        btn.disabled = true;
        btn.classList.add('curr--off');
        body.append(el('span', 'curr__why', stock < 1 ? 'none in stock' : blocked!));
      }
      btn.onclick = () => use(currency);
      grid.append(btn);
    }
    host.append(grid);
  }
}

/** Fragments are the universal feedstock; this is where they turn into things. */
function renderWorkshop(): void {
  const host = $('workshop');
  host.replaceChildren();

  for (const recipe of RECIPES) {
    const cost = Object.entries(recipe.inputs)
      .map(([id, n]) => `${n} ${id}`)
      .join(', ');
    const affordable = Object.entries(recipe.inputs).every(
      ([id, n]) => balance(game.wallet, id) >= n
    );

    const btn = el('button', 'buy') as HTMLButtonElement;
    btn.append(el('span', 'buy__name', recipe.name));
    btn.append(el('span', 'buy__cost', cost));
    if (!affordable) {
      btn.disabled = true;
      btn.classList.add('buy--off');
    }
    btn.onclick = () => buy(recipe.id);
    host.append(btn);
  }
}

function renderLog(): void {
  const host = $('log');
  host.replaceChildren();
  if (log.length === 0) {
    host.append(el('p', 'empty', 'Craft something and the history shows up here.'));
  }
  for (const entry of log.slice(0, 60)) {
    host.append(el('div', `logline logline--${entry.kind}`, entry.text));
  }
}

function render(): void {
  renderItem();
  renderCurrencies();
  renderWorkshop();
  renderLog();
  $('seed').textContent = String(seed);
  renderInventory();
}

/**
 * Clicking an inventory item opens it on the bench. It stays in the list,
 * highlighted — the selection is a reference, not a move.
 */
function benchHandler() {
  return {
    // Split, because crystals and equipment are worked on for different
    // reasons and one mixed list means hunting for the thing you meant.
    kinds: ['crystal', 'gear'] as const,
    grouped: true,
    actionFor: (item: Item) => ({
      label: 'Open on bench',
      run: () => {
        selectForBench(game, item);
        focused = null;
        note(`Bench: ${item.name}`);
        render();
      },
    }),
    highlighted: (item: Item) => item.id === game.benchId,
  };
}

/** Called when the Bench tab becomes visible. */
export function onBenchShown(): void {
  setInventoryHandler(benchHandler());
  render();
}

export function initBench(state: GameState): void {
  game = state;

  ($('reseed') as HTMLButtonElement).onclick = reseed;
  ($('clear') as HTMLButtonElement).onclick = () => {
    log = [];
    render();
  };
  ($('bench-return') as HTMLButtonElement).onclick = () => {
    const item = benchItem(game);
    if (!item) return;
    note(`Closed ${item.name}`);
    clearBench(game);
    render();
  };

  note(`Seed ${seed}`);
  render();
}
