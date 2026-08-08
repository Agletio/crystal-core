/**
 * The inventory dock, along the bottom of the frame. Not a page: it is the thing
 * every other screen acts on, so every popup stops above it.
 *
 * Icons in slots, with names and modifiers in the tooltip — a stash is something
 * you scan. Clicking does whatever the ACTIVE screen registered; the dock itself
 * has no opinion about what an item is for.
 */
import { currencyIcon, itemIcon } from './icons';
import { modCapacity, qualityName, qualityOf } from '../mods';
import { describeMod } from '../crafting';
import { attachTooltip } from './tooltip';
import { balance } from '../economy';
import { CURRENCIES } from '../data';
import { CARRY } from '../game/state';
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
 * The same seam, for currency. A shard is a thing you own — you find it, count
 * it, run out of it — so it lives in the dock beside the items it acts on.
 */
export interface CurrencyHandler {
  actionFor(currency: CurrencyDef): { label: string; run: () => void } | null;
  /** Why it's greyed out right now. Shown in the tooltip. */
  blocked?(currency: CurrencyDef): string | null;
}

/**
 * Currency slots drawn, held or not. There is no carry limit on currency, so
 * this is only about a fixed shape; for items the slot count IS the limit.
 */
const CURRENCY_SLOTS = 16;

/**
 * Rows in every dock column. The grid states both dimensions — an auto-filled
 * one re-wraps as the window narrows and clips the last row. Columns are derived
 * from CARRY, so the limit is defined once and the layout follows it.
 */
const DOCK_ROWS = 4;

function sizeGrid(host: HTMLElement, slots: number): void {
  host.style.setProperty('--cols', String(Math.ceil(slots / DOCK_ROWS)));
}

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
 * Fragments only — the feedstock every price is quoted in, so what you want is a
 * number to compare against a price. That is a readout, not an inventory slot.
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

/** Only what you own: the empty slots are a container, not a catalogue. */
function renderCurrencies(): void {
  if (!game) return;
  const host = $('inv-currency');
  host.replaceChildren();
  sizeGrid(host, CURRENCY_SLOTS);

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

  for (let i = owned; i < CURRENCY_SLOTS; i++) {
    host.append(el('div', 'slot slot--empty'));
  }
}

function tooltip(item: Item): string {
  const lines = [
    item.name,
    `${qualityName(qualityOf(item))} · ilvl ${item.ilvl} · ` +
      `${item.mods.length}/${modCapacity(item)} modifiers`,
  ];
  if (item.meta.corrupted) lines.push('corrupted — cannot be changed');
  // The rating, not a modifier: it says what the piece IS, and increases scale it.
  if (item.armour) lines.push(`Armour ${item.armour}`);
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
    // On the label, not in a tooltip: this is what you check before deciding
    // whether to go back down.
    const label = $(`${HOSTS[kind]}-label`);
    label.textContent = `${kind === 'crystal' ? 'Crystals' : 'Equipment'} ${items.length}/${CARRY[kind]}`;
    label.classList.toggle('dockcol__label--full', items.length >= CARRY[kind]);
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
  sizeGrid(host, CARRY[kind]);

  for (const item of sorted(items, kind)) {
    const action = handler?.actionFor(item) ?? null;
    // Quality colours the slot; the silhouette says what a piece IS, never how
    // good it is.
    const btn = el(
      'button',
      `slot slot--${kind} slot--q-${qualityOf(item)}`
    ) as HTMLButtonElement;

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

  // The carry limit made visible: the dock never scrolls, so what you see is
  // all you can hold and running out is something you watch approaching.
  for (let i = items.length; i < CARRY[kind]; i++) {
    host.append(el('div', 'slot slot--empty'));
  }
}
