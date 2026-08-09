/**
 * The shop: only ever a price list, the way crafting is only ever the item. What
 * you buy lands in the dock, which is where you spend it from.
 */
import {
  ALL_MODS,
  CURRENCY_BY_ID,
  RECIPES,
  SHOP,
  shopQualityFor,
} from '../data';
import { Rng } from '../rng';
import { ModPool, modCapacity, qualityName, qualityOf } from '../mods';
import { balance, pickGearBase, pickQuality, rollGear, runRecipe, spend } from '../economy';
import { addItem, carryRoom, stashRoom } from '../game/state';
import type { GameState } from '../game/state';
import { describeMod } from '../crafting';
import { note } from './history';
import { crystalIcon, currencyIcon, itemIcon } from './icons';
import { renderInventory } from './inventory';
import { attachTooltip, hideTooltip } from './tooltip';
import { recipeButtonId } from './tutorial';
import type { Item, ItemKind, Recipe } from '../types';

/** Same pool the sim rolls drops from, for the same reason: authored data. */
const POOL = new ModPool(ALL_MODS);

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let game: GameState;

/**
 * Checked BEFORE the sale: runRecipe spends first, so without this you could pay
 * for a crystal and be told there was nowhere to put it.
 */
function hasRoomFor(recipe: Recipe): boolean {
  if (recipe.output.type !== 'item') return true;
  const kind: ItemKind = recipe.output.base.startsWith('crystal_t') ? 'crystal' : 'gear';
  return carryRoom(game, kind) > 0 || stashRoom(game) > 0;
}

function buy(recipeId: string): void {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (recipe && !hasRoomFor(recipe)) {
    note(`${recipe.name} — nowhere to put it. Your bag and stash are both full.`, 'fail');
    render();
    return;
  }

  const result = runRecipe(game.wallet, recipeId);
  if (!result.ok) {
    note(result.error ?? 'cannot afford that', 'fail');
    render();
    return;
  }
  if (result.item) {
    // Where it landed matters: a full bag routes it to the stash, and a full
    // stash means you just paid for something you cannot have. Say so.
    const where = addItem(game, result.item);
    if (where === 'lost') {
      note(`${result.item.name} — no room to carry it, and the stash is full`, 'fail');
    } else if (where === 'stashed') {
      note(`Bought ${result.item.name} — bag full, sent to the stash`, 'add');
    } else {
      note(`Bought ${result.item.name}`, 'add');
    }
  } else {
    note('Bought currency', 'add');
  }
  render();
  // What you bought landed in the dock, not here — a purchase that leaves the
  // dock stale looks like it did nothing.
  renderInventory();
}

/** A price in words, not in wallet keys, and pluralised. */
function priceOf(recipe: Recipe): string {
  return Object.entries(recipe.inputs)
    .map(([id, n]) => {
      const name = id === 'fragment' ? 'fragment' : (CURRENCY_BY_ID[id]?.name ?? id);
      return `${n} ${name}${n === 1 ? '' : 's'}`;
    })
    .join(', ');
}

/**
 * What you get, as the icon you'll see it as in the dock.
 *
 * The shop is where the mapping from a name to a silhouette is learned — buy
 * the thing while looking at its shape, then recognise the shape later
 * without reading. A price list of bare names teaches nothing.
 */
function outputIcon(recipe: Recipe): SVGSVGElement | null {
  if (recipe.output.type === 'currency') {
    const def = CURRENCY_BY_ID[recipe.output.id];
    return def ? currencyIcon(def, 26) : null;
  }
  const tier = Number(/crystal_t(\d)/.exec(recipe.output.base)?.[1]);
  return Number.isFinite(tier) ? crystalIcon(tier, 26) : null;
}

/** Fragments are the universal feedstock; this is where they turn into things. */
export function render(): void {
  const host = $('workshop');
  host.replaceChildren();

  const level = game.character.level;
  for (const recipe of RECIPES) {
    // A shelf that grows with you. A level-1 shop selling a Tier 6 crystal is
    // selling a map that kills you.
    if ((recipe.level ?? 1) > level) continue;
    const affordable = Object.entries(recipe.inputs).every(
      ([id, n]) => balance(game.wallet, id) >= n
    );
    const room = hasRoomFor(recipe);

    const btn = el('button', 'buy') as HTMLButtonElement;
    // Stable id so the guided opening can point at one recipe rather than the
    // whole shelf. The demo asserts every step's target exists.
    btn.id = recipeButtonId(recipe.id);

    const icon = outputIcon(recipe);
    if (icon) btn.append(icon);
    const body = el('span', 'buy__body');
    body.append(el('span', 'buy__name', recipe.name));
    body.append(el('span', 'buy__cost', priceOf(recipe)));
    btn.append(body);

    if (recipe.output.type === 'currency') {
      const def = CURRENCY_BY_ID[recipe.output.id];
      if (def) attachTooltip(btn, () => `${def.name}\n${def.description}`);
    }

    if (!affordable || !room) {
      btn.disabled = true;
      btn.classList.add('buy--off');
      if (affordable && !room) {
        body.append(el('span', 'buy__why', 'nowhere to put it'));
      }
    }
    btn.onclick = () => buy(recipe.id);
    host.append(btn);
  }

  renderStock();
  $('shop-purse').textContent = `${balance(game.wallet, 'fragment')} fragments`;
}

/**
 * Priced off item level and quality, never off what rolled. Charging more for a
 * good roll would turn a shelf you can SEE into the gamble maps already are.
 */
export function priceOfItem(item: Item): number {
  const byQuality = SHOP.priceByQuality[qualityOf(item)] ?? 1;
  return Math.max(4, Math.round(item.ilvl * SHOP.pricePerIlvl * byQuality));
}

/**
 * Restocks the shelf, if the level it was stocked for has moved.
 *
 * Level-up is the only trigger. A shelf that re-rolled on every open would not
 * be a shelf — you would reopen the window until the piece you wanted showed
 * up, which is a deterministic shop with extra clicks.
 */
export function restockIfLevelled(): void {
  const level = game.character.level;
  if (level === game.shopLevel) return;

  // Seeded off the level so the same character always sees the same shelf for
  // a given level: reloading is not a re-roll.
  const rng = new Rng(level * 7919 + 13);
  const count = Math.max(
    SHOP.minSlots,
    Math.min(SHOP.maxSlots, Math.floor(level / SHOP.slotsPerLevel) + SHOP.minSlots)
  );
  const ilvl = Math.max(1, Math.round(level * SHOP.ilvlPerLevel));
  const table = shopQualityFor(level);

  const stock: Item[] = [];
  for (let i = 0; i < count; i++) {
    const base = pickGearBase(ilvl, rng);
    if (!base) continue;
    const quality = pickQuality(table, rng);
    // Shop pieces arrive FULL for their quality. You are paying to skip the
    // rolling, not to gamble a second time at the counter.
    stock.push(rollGear(base.id, ilvl, quality, 6, POOL, rng));
  }

  game.shopStock = stock;
  game.shopLevel = level;
  if (level > 1) note(`The shop has restocked for level ${level}`);
}

function tooltip(item: Item): string {
  const lines = [
    item.name,
    `${qualityName(qualityOf(item))} · ilvl ${item.ilvl} · ` +
      `${item.mods.length}/${modCapacity(item)} modifiers`,
  ];
  if (item.armour) lines.push(`Armour ${item.armour}`);
  for (const imp of item.implicits) lines.push(`${describeMod(imp)}  (base)`);
  for (const mod of item.mods) lines.push(describeMod(mod));
  if (item.mods.length === 0) lines.push('no modifiers');
  return lines.join('\n');
}

function buyItem(item: Item): void {
  const cost = priceOfItem(item);
  if (balance(game.wallet, 'fragment') < cost) {
    note(`${item.name} — costs ${cost} fragments`, 'fail');
    return;
  }
  if (carryRoom(game, 'gear') <= 0 && stashRoom(game) <= 0) {
    note(`${item.name} — nowhere to put it. Your bag and stash are both full.`, 'fail');
    return;
  }

  spend(game.wallet, { fragment: cost });
  // Off the shelf. One of each: a level-up is a restock, not a catalogue you
  // can grind for the same piece twice.
  game.shopStock = game.shopStock.filter((i) => i.id !== item.id);
  const where = addItem(game, item);
  note(
    where === 'stashed'
      ? `Bought ${item.name} — bag full, sent to the stash`
      : `Bought ${item.name}`,
    'add'
  );
  render();
  renderInventory();
}

function renderStock(): void {
  const host = $('shop-stock');
  host.replaceChildren();

  if (game.shopStock.length === 0) {
    host.append(el('p', 'empty', 'Sold out. Restocks when you level.'));
    return;
  }

  for (const item of game.shopStock) {
    const cost = priceOfItem(item);
    const btn = el('button', 'buy') as HTMLButtonElement;
    btn.append(itemIcon(item, 26));
    const body = el('span', 'buy__body');
    body.append(el('span', 'buy__name', item.name));
    body.append(
      el(
        'span',
        'buy__cost',
        `${cost} fragments · ${qualityName(qualityOf(item))} · ilvl ${item.ilvl}`
      )
    );
    btn.append(body);
    attachTooltip(btn, () => tooltip(item));

    if (balance(game.wallet, 'fragment') < cost) {
      btn.disabled = true;
      btn.classList.add('buy--off');
    }
    btn.onclick = () => buyItem(item);
    host.append(btn);
  }
}

export function openShop(): void {
  $('shop').hidden = false;
  restockIfLevelled();
  render();
}

export function closeShop(): void {
  $('shop').hidden = true;
  hideTooltip();
}

export const isShopOpen = (): boolean => !$('shop').hidden;

export function initShop(state: GameState): void {
  game = state;
  ($('shop-close') as HTMLButtonElement).onclick = closeShop;
  restockIfLevelled();
  render();
}
