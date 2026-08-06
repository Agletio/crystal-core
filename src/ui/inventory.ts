/**
 * The inventory dock, along the bottom of the frame.
 *
 * Deliberately not a page. It's the thing every other screen acts on — you
 * pull a crystal out of it to run, put gear into the bench, and watch it fill
 * up after a clear — so hiding it behind navigation would mean constantly
 * flipping back to check what you have. Every popup stops above it.
 *
 * Items are icons in slots — crystals, equipment, and the currency you spend
 * on both. Names and modifiers live in the hover tooltip: a stash is
 * something you scan, and forty lines of text is something you read past.
 *
 * Clicking anything does whatever the ACTIVE screen wants, which each screen
 * registers here. The dock itself has no opinion about what an item is for.
 */
import { currencyIcon, itemIcon } from './icons';
import { fillState } from '../mods';
import { describeMod } from '../crafting';
import { attachTooltip } from './tooltip';
import { balance } from '../economy';
import { CURRENCIES } from '../data';
import type { GameState } from '../game/state';
import type { CurrencyDef, Item, ItemKind } from '../types';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

export interface InventoryHandler {
  /** Null means "this screen can't use that item", and it renders disabled. */
  actionFor(item: Item): { label: string; run: () => void } | null;
  /** Item the active screen has claimed — on the bench, or in the socket. */
  highlighted?(item: Item): boolean;
}

/**
 * The same seam again, for currency.
 *
 * Currency used to be a wall of thirteen labelled buttons inside the crafting
 * popup, which said the quiet part out loud: a Shard of Making was a menu
 * command rather than a thing you own. It is a thing you own — you find it,
 * you count it, you run out of it — so it lives in the dock beside the items
 * it acts on, and crafting is just the screen that gives clicking one a
 * meaning.
 */
export interface CurrencyHandler {
  actionFor(currency: CurrencyDef): { label: string; run: () => void } | null;
  /** Why it's greyed out right now. Shown in the tooltip. */
  blocked?(currency: CurrencyDef): string | null;
}

/** Kept full even when you own less, so the dock is a fixed shape. */
const MIN_SLOTS = 12;

const HOSTS: Record<ItemKind, string> = {
  crystal: 'inv-crystal',
  gear: 'inv-gear',
};

let game: GameState | null = null;
let handler: InventoryHandler | null = null;
let currencyHandler: CurrencyHandler | null = null;

export function initInventory(state: GameState): void {
  game = state;
}

/** Screens call this when they take focus, and again when their state moves. */
export function setInventoryHandler(next: InventoryHandler | null): void {
  handler = next;
  renderInventory();
}

export function setCurrencyHandler(next: CurrencyHandler | null): void {
  currencyHandler = next;
  renderInventory();
}

/**
 * Fragments only.
 *
 * Fragments are not a currency you apply to an item — they are the feedstock
 * every shop price is quoted in, so what you want from them is a number to
 * compare against a price, constantly. That is a readout, not an inventory
 * slot: hunting for a badge on one icon among fourteen would be strictly
 * worse. Everything you actually spend ON an item is down in the dock.
 */
function renderWallet(): void {
  if (!game) return;
  const host = $('wallet');
  host.replaceChildren();

  const chip = el('span', 'coin');
  chip.append(el('span', 'coin__n', String(game.wallet.fragment ?? 0)));
  chip.append(el('span', 'coin__id', 'fragments'));
  host.append(chip);
}

function currencyTooltip(currency: CurrencyDef, stock: number): string {
  const lines = [
    currency.name,
    `${currency.class} · ${stock} held`,
    currency.description,
  ];
  const action = currencyHandler?.actionFor(currency);
  if (action) lines.push(`— click to ${action.label.toLowerCase()}`);
  else {
    const why = currencyHandler?.blocked?.(currency);
    if (why) lines.push(`— ${why}`);
  }
  return lines.join('\n');
}

/**
 * Only what you own.
 *
 * A stack you have none of is not in your inventory, and rendering all
 * thirteen greyed out would rebuild the wall of buttons this replaced. The
 * empties below are the container, not a catalogue — the Shop is the
 * catalogue.
 */
function renderCurrencies(): void {
  if (!game) return;
  const host = $('inv-currency');
  host.replaceChildren();

  let owned = 0;
  for (const currency of CURRENCIES) {
    const stock = balance(game.wallet, currency.id);
    if (stock < 1) continue;
    owned++;

    const action = currencyHandler?.actionFor(currency) ?? null;
    const btn = el('button', `slot slot--currency slot--${currency.class}`) as HTMLButtonElement;
    btn.append(currencyIcon(currency, 30));
    // The count is the whole reason a stack is one slot rather than N, so it
    // is on the icon and not a hover away.
    btn.append(el('span', 'slot__n', String(stock)));
    attachTooltip(btn, () => currencyTooltip(currency, stock));

    if (action) {
      btn.onclick = action.run;
      btn.setAttribute('aria-label', `${action.label}: ${currency.name} (${stock} held)`);
    } else {
      btn.disabled = true;
      btn.classList.add('slot--off');
      btn.setAttribute('aria-label', `${currency.name} (${stock} held)`);
    }
    host.append(btn);
  }

  for (let i = owned; i < MIN_SLOTS; i++) {
    host.append(el('div', 'slot slot--empty'));
  }
}

function tooltip(item: Item): string {
  const lines = [item.name, `ilvl ${item.ilvl} · ${fillState(item)}`];
  if (item.meta.corrupted) lines.push('corrupted — cannot be changed');
  for (const imp of item.implicits) lines.push(`${describeMod(imp)}  (base)`);
  if (item.mods.length === 0 && item.implicits.length === 0) {
    lines.push('no modifiers');
  }
  for (const mod of item.mods) lines.push(describeMod(mod));

  const action = handler?.actionFor(item);
  if (action) lines.push(`— click to ${action.label.toLowerCase()}`);
  return lines.join('\n');
}

export function renderInventory(): void {
  if (!game) return;
  renderWallet();
  renderCurrencies();

  for (const kind of Object.keys(HOSTS) as ItemKind[]) {
    const items = game.inventory.filter((i) => i.kind === kind);
    fill($(HOSTS[kind]), items, kind);
  }
}

/** Crystals sort by tier, gear by name — the orders you'd look for them in. */
function sorted(items: Item[], kind: ItemKind): Item[] {
  return [...items].sort((a, b) => {
    if (kind === 'crystal') {
      const at = (a.meta.tier as number) ?? 0;
      const bt = (b.meta.tier as number) ?? 0;
      if (at !== bt) return bt - at;
    }
    return a.name.localeCompare(b.name);
  });
}

function fill(host: HTMLElement, items: Item[], kind: ItemKind): void {
  host.replaceChildren();

  for (const item of sorted(items, kind)) {
    const action = handler?.actionFor(item) ?? null;
    const btn = el('button', `slot slot--${kind}`) as HTMLButtonElement;

    btn.append(itemIcon(item, 30));
    if (item.mods.length > 0) btn.classList.add('slot--modded');
    attachTooltip(btn, () => tooltip(item));

    if (handler?.highlighted?.(item)) btn.classList.add('slot--on');

    if (action) {
      btn.onclick = action.run;
      btn.setAttribute('aria-label', `${action.label}: ${item.name}`);
    } else {
      btn.disabled = true;
      btn.classList.add('slot--off');
      btn.setAttribute('aria-label', item.name);
    }
    host.append(btn);
  }

  // Empty slots to the minimum, so an empty dock still reads as a container
  // waiting to be filled rather than a blank strip.
  for (let i = items.length; i < MIN_SLOTS; i++) {
    host.append(el('div', 'slot slot--empty'));
  }
}
