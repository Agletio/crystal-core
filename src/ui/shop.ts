/**
 * The shop: only ever a price list, the way crafting is only ever the item. What
 * you buy lands in the dock, which is where you spend it from.
 */
import { ALL_MODS, CURRENCY_BY_ID, RECIPES, SHOP } from '../data';
import { Rng } from '../rng';
import { ModPool, tierName } from '../mods';
import { itemCard } from './itemcard';
import {
  balance,
  canSell,
  pickGearBase,
  priceOfItem,
  rollGear,
  runRecipe,
  sellPrice,
  spend,
} from '../economy';
import { addItem, buyBack, carryRoom, sellItem, stashRoom } from '../game/state';
import type { Placement } from '../game/state';
import type { GameState } from '../game/state';
import { note } from './history';
import { crystalIcon, currencyIcon, itemIcon } from './icons';
import { openMenu } from './menu';
import { renderInventory, setInventoryOverride } from './inventory';
import { attachTooltip, hideTooltip } from './tooltip';
import type { Item, ItemKind, Recipe } from '../types';

/** Same pool the sim rolls drops from, for the same reason: authored data. */
const POOL = new ModPool(ALL_MODS);

const $ = (id: string) => document.getElementById(id)!;

/** Id of one recipe's buy button, for the same reason as every other. */
export const recipeButtonId = (recipeId: string): string => `buy-${recipeId}`;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let game: GameState;
/**
 * While this is on a left-click in the dock sells. UI state and never saved:
 * a mode that survived a reload would turn the first click of a session into
 * a sale nobody asked for.
 */
let selling = false;

/**
 * Checked BEFORE the sale: runRecipe spends first, so without this you could pay
 * for a crystal and be told there was nowhere to put it.
 */
function hasRoomFor(recipe: Recipe): boolean {
  if (recipe.output.type !== 'item') return true;
  const kind: ItemKind = recipe.output.base.startsWith('crystal_t') ? 'crystal' : 'gear';
  return carryRoom(game, kind) > 0 || stashRoom(game) > 0;
}

/**
 * How many of a recipe the purse could take, ignoring room — currency needs
 * none. Zero when a price is something other than gold, which nothing on the
 * shelf is today and which this must not silently mis-answer if one ever is.
 */
function affordableCount(recipe: Recipe): number {
  let most = Infinity;
  for (const [id, n] of Object.entries(recipe.inputs)) {
    most = Math.min(most, Math.floor(balance(game.wallet, id) / n));
  }
  return Number.isFinite(most) ? Math.max(0, most) : 0;
}

/**
 * Buying twenty shards twenty clicks at a time is what kills an evening. The
 * left click still buys one, so nothing about the opening changed.
 */
function quantityMenu(recipe: Recipe, x: number, y: number): void {
  const most = affordableCount(recipe);
  const counts = [5, 10, 20].filter((n) => n <= most);
  if (most > 0 && !counts.includes(most)) counts.push(most);

  openMenu(
    x,
    y,
    recipe.name,
    counts.length === 0
      ? [{ label: 'Buy 1', run: () => {}, blocked: `${priceOf(recipe)} — you cannot afford one` }]
      : counts.map((n) => ({
          label: n === most ? `Buy ${n} — all you can afford` : `Buy ${n}`,
          run: () => buy(recipe.id, n),
        }))
  );
}

function buy(recipeId: string, count = 1): void {
  const recipe = RECIPES.find((r) => r.id === recipeId);
  if (recipe && !hasRoomFor(recipe)) {
    note(`${recipe.name} — nowhere to put it. Your bag and stash are both full.`, 'fail');
    render();
    return;
  }

  // One at a time, so running out of gold partway through leaves you with
  // what you could afford rather than with nothing.
  let bought = 0;
  let stopped: string | null = null;
  let landed: Placement | null = null;
  let last: Item | null = null;

  for (let i = 0; i < count; i++) {
    const result = runRecipe(game.wallet, recipeId);
    if (!result.ok) {
      stopped = result.error ?? 'cannot afford that';
      break;
    }
    if (result.item) {
      landed = addItem(game, result.item);
      last = result.item;
      if (landed === 'lost') {
        stopped = 'no room to carry it, and the stash is full';
        break;
      }
    }
    bought++;
  }

  if (bought === 0) note(stopped ?? 'nothing bought', 'fail');
  else if (count > 1) note(`Bought ${bought}${stopped ? ` — ${stopped}` : ''}`, 'add');
  else if (last) {
    // Where it landed matters: a full bag routes it to the stash, and a full
    // stash means you just paid for something you cannot have.
    note(landed === 'stashed' ? `Bought ${last.name} — bag full, sent to the stash` : `Bought ${last.name}`, 'add');
  } else {
    note('Bought currency', 'add');
  }

  render();
  // What you bought landed in the dock, not here — a purchase that leaves the
  // dock stale looks like it did nothing.
  renderInventory();
}

/** A price in words, not in wallet keys. Gold is a mass noun and takes no `s`. */
function priceOf(recipe: Recipe): string {
  return Object.entries(recipe.inputs)
    .map(([id, n]) => {
      if (id === 'gold') return `${n} gold`;
      const name = CURRENCY_BY_ID[id]?.name ?? id;
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
  const level = Number(/crystal_t(\d)/.exec(recipe.output.base)?.[1]);
  return Number.isFinite(level) ? crystalIcon(level, 26) : null;
}

/** Gold is the universal feedstock; this is where it turns into things. */
export function render(): void {
  const host = $('workshop');
  host.replaceChildren();

  const level = game.character.level;
  for (const recipe of RECIPES) {
    // A shelf that grows with you. A level-1 shop selling top-end stock is
    // selling a map that kills you.
    if ((recipe.level ?? 1) > level) continue;
    const affordable = Object.entries(recipe.inputs).every(
      ([id, n]) => balance(game.wallet, id) >= n
    );
    const room = hasRoomFor(recipe);

    const btn = el('button', 'buy') as HTMLButtonElement;
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
    // Right-click asks how many. The left click still buys one, so the guided
    // opening's step means exactly what it meant.
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      quantityMenu(recipe, (e as MouseEvent).clientX, (e as MouseEvent).clientY);
    });
    host.append(btn);
  }

  renderStock();
  renderSell();
  renderSold();
  $('shop-purse').textContent = `${balance(game.wallet, 'gold')} gold`;
}

/**
 * The counter you sell across. A MODE rather than a bulk button: the old one
 * could only take the heap nothing had been spent on, so the pieces you
 * actually wanted rid of — the ones with one bad modifier — still had to come
 * out of the dock one right-click at a time.
 *
 * Selling one piece stays a decision, which is why the mode has to be visibly
 * on. Nothing here is unrecoverable now anyway: the counter buys it back.
 */
function renderSell(): void {
  const btn = $('shop-sell') as HTMLButtonElement;
  btn.replaceChildren();
  btn.append(el('span', 'buy__name', selling ? 'Sell mode — on' : 'Sell mode'));
  btn.append(
    el(
      'span',
      'buy__cost',
      selling ? 'click to stop' : 'then click pieces in the dock'
    )
  );
  btn.classList.toggle('buy--armed', selling);

  $('shop-sell-hint').textContent = selling
    ? 'Every piece you click is sold. It stays on the counter below until twelve more are.'
    : 'Any one piece: hold or right-click it in the dock.';
}

function setSelling(on: boolean): void {
  selling = on;
  // The dock answers to the mode while it is up, and to whatever screen is
  // underneath the moment it is not.
  setInventoryOverride(
    on
      ? {
          actionFor: (item: Item) =>
            canSell(item)
              ? {
                  label: `sell for ${sellPrice(item)} gold`,
                  run: () => {
                    const paid = sellItem(game, item);
                    if (paid <= 0) return;
                    note(`Sold ${item.name} for ${paid} gold`, 'add');
                    render();
                    renderInventory();
                  },
                }
              : null,
          highlighted: (item: Item) => canSell(item),
          dimmed: (item: Item) => (canSell(item) ? null : 'a crystal is never sold'),
        }
      : null
  );
  render();
}

/**
 * What you sold, at what it paid. Buying one back is the same number in the
 * other direction, so the pair is neutral and the shelf cannot be ground for
 * gold — which is the only reason a sale can be this cheap to make.
 */
function renderSold(): void {
  const host = $('shop-sold');
  host.replaceChildren();

  const sold = game.sold ?? [];
  if (sold.length === 0) {
    host.append(el('p', 'empty', 'Nothing sold yet. What you sell waits here.'));
    return;
  }

  for (const entry of sold) {
    const btn = el('button', 'buy') as HTMLButtonElement;
    btn.append(itemIcon(entry.item, 26));
    const body = el('span', 'buy__body');
    body.append(el('span', 'buy__name', entry.item.name));
    body.append(el('span', 'buy__cost', `Buy back · ${entry.price} gold`));
    btn.append(body);
    attachTooltip(btn, () => itemCard(entry.item, [`buy back for ${entry.price} gold`]));

    const why =
      balance(game.wallet, 'gold') < entry.price
        ? `costs ${entry.price} gold`
        : carryRoom(game, entry.item.kind) <= 0 && stashRoom(game) <= 0
          ? 'nowhere to put it'
          : null;
    if (why) {
      btn.disabled = true;
      btn.classList.add('buy--off');
      body.append(el('span', 'buy__why', why));
    }
    btn.onclick = () => {
      const result = buyBack(game, entry);
      if (!result.ok) {
        note(`${entry.item.name} — ${result.error}`, 'fail');
        return;
      }
      note(`Bought back ${entry.item.name}`, 'add');
      render();
      renderInventory();
    };
    host.append(btn);
  }
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

  const stock: Item[] = [];
  for (let i = 0; i < count; i++) {
    const base = pickGearBase(ilvl, rng);
    if (!base) continue;
    // Shop pieces arrive FULL for their base. You are paying to skip the
    // rolling, not to gamble a second time at the counter — and what a base
    // holds is the base's own business, so the shelf never sells a tier the
    // item level would not have dropped.
    stock.push(rollGear(base.id, ilvl, 6, POOL, rng));
  }

  game.shopStock = stock;
  game.shopLevel = level;
  if (level > 1) note(`The shop has restocked for level ${level}`);
}

const tooltip = (item: Item): HTMLElement =>
  itemCard(item, [`${priceOfItem(item)} gold — click to buy`]);

function buyItem(item: Item): void {
  const cost = priceOfItem(item);
  if (balance(game.wallet, 'gold') < cost) {
    note(`${item.name} — costs ${cost} gold`, 'fail');
    return;
  }
  if (carryRoom(game, 'gear') <= 0 && stashRoom(game) <= 0) {
    note(`${item.name} — nowhere to put it. Your bag and stash are both full.`, 'fail');
    return;
  }

  spend(game.wallet, { gold: cost });
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
        `${cost} gold · ${tierName(item)} · ilvl ${item.ilvl}`
      )
    );
    btn.append(body);
    attachTooltip(btn, () => tooltip(item));

    if (balance(game.wallet, 'gold') < cost) {
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
  // Leaving the counter ends the mode. Otherwise a click in the dock on some
  // other screen would still be a sale, and nothing would be saying so.
  if (selling) setSelling(false);
  $('shop').hidden = true;
  hideTooltip();
}

export const isShopOpen = (): boolean => !$('shop').hidden;

/** A sale made from the dock changes what the counter is still offering to take. */
export function refreshShop(): void {
  if (isShopOpen()) render();
}

export function initShop(state: GameState): void {
  game = state;
  ($('shop-close') as HTMLButtonElement).onclick = closeShop;
  ($('shop-sell') as HTMLButtonElement).onclick = () => setSelling(!selling);
  restockIfLevelled();
  render();
}
