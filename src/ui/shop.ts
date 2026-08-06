/**
 * The shop.
 *
 * This used to be a panel called "Workshop" sitting under the item inside the
 * crafting popup, and the two were doing unrelated jobs in one window: one
 * turns fragments into stock, the other spends stock on the thing in front of
 * you. Sharing a window meant the item you were crafting scrolled off the
 * screen every time you went to buy something for it — which is exactly the
 * moment you most need to look at it.
 *
 * Split out, crafting is only ever the item, and this is only ever the price
 * list. What you buy lands in the dock, which is where you spend it from.
 */
import { CURRENCY_BY_ID, RECIPES } from '../data';
import { balance, runRecipe } from '../economy';
import { addItem, carryRoom, stashRoom } from '../game/state';
import type { GameState } from '../game/state';
import { note } from './history';
import { crystalIcon, currencyIcon } from './icons';
import { renderInventory } from './inventory';
import { attachTooltip, hideTooltip } from './tooltip';
import { recipeButtonId } from './tutorial';
import type { ItemKind, Recipe } from '../types';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let game: GameState;

/**
 * Is there anywhere to put what this sells?
 *
 * Checked before the sale, not after. runRecipe spends first and hands back
 * the item, so without this you could pay full price for a crystal and be
 * told there was nowhere to put it — which is a refund conversation, not a
 * game mechanic.
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

/**
 * A price, in words rather than in ids.
 *
 * This used to print the raw wallet key and never pluralise — "8 fragment",
 * "5 fragment" — which is the same class of thing as a modifier reading
 * `areaOfEffect`: an internal name leaking onto a button because nobody wrote
 * the one line that turns it into English.
 */
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

  for (const recipe of RECIPES) {
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

  $('shop-purse').textContent = `${balance(game.wallet, 'fragment')} fragments`;
}

export function openShop(): void {
  $('shop').hidden = false;
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
  render();
}
