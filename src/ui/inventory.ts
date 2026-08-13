/**
 * The inventory dock, along the bottom of the frame. Not a page: it is the thing
 * every other screen acts on, so every popup stops above it.
 *
 * Icons in slots, with names and modifiers in the tooltip — a stash is something
 * you scan. Clicking does whatever the ACTIVE screen registered; the dock itself
 * has no opinion about what an item is for.
 */
import { currencyIcon, itemIcon } from './icons';
import { baseTier } from '../mods';
import { itemMatches, locksItem } from '../crafting';
import { itemCard } from './itemcard';
import { attachTooltip, hideTooltip } from './tooltip';
import { closeMenu, openMenu } from './menu';
import type { ItemAction } from './menu';
import { balance } from '../economy';
import { CURRENCIES } from '../data';
import { CARRY, fitsSlot, relicsIn, sendToEnd, sortInventory, swapItems } from '../game/state';
import { EQUIP_SLOTS } from '../data';
import type { GameState } from '../game/state';
import type { CurrencyDef, Item } from '../types';

const $ = (id: string) => document.getElementById(id)!;

/** Id of one item's slot in the dock. */
export const dockSlotId = (itemId: string): string => `dock-${itemId}`;

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
  /** Why this item is not a candidate, or null when it is. Dimmed, not
   *  hidden, so the answer is on the item you were about to click. */
  dimmed?(item: Item): string | null;
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
/** How many relic slots the column draws when there is anything in it. */
const RELIC_SLOTS = 4;

/**
 * Rows in every dock column. The grid states both dimensions — an auto-filled
 * one re-wraps as the window narrows and clips the last row. Columns are derived
 * from CARRY, so the limit is defined once and the layout follows it.
 */
const DOCK_ROWS = 4;

function sizeGrid(host: HTMLElement, slots: number): void {
  host.style.setProperty('--cols', String(Math.ceil(slots / DOCK_ROWS)));
}

/** Gear only. Crystals never enter the dock — `src/ui/crystals.ts` holds them. */
const GEAR_HOST = 'inv-gear';

/**
 * Actions an item has no matter which screen is up — wearing it, putting it
 * away. Supplied by the shell, because knowing how to equip means knowing how
 * to redraw the sheet, and the dock is not allowed to know that.
 */
export interface ItemActions {
  extrasFor(item: Item): ItemAction[];
  /** Dropping onto a worn slot. Knowing how to equip means knowing how to redraw. */
  equipTo?(item: Item, slotId: string): void;
}

let game: GameState | null = null;
/** What the Find box holds. Filters what is DRAWN and nothing else. */
let find = '';
let screenHandler: InventoryHandler | null = null;
/** A mode over the screen that owns the dock; off restores what was under. */
let override: InventoryHandler | null = null;
/** The MAP's own, which is the ground rather than a screen: a descent ticking
 *  over must not take the dock off whichever screen is holding it. */
let base: InventoryHandler | null = null;
const handlerFor = (): InventoryHandler | null => override ?? screenHandler ?? base;
let extras: ItemActions | null = null;

export function setItemActions(next: ItemActions | null): void {
  extras = next;
}

/** The screen's own action first, then everything true regardless of screen. */
function actionsFor(item: Item): ItemAction[] {
  const own = handlerFor()?.actionFor(item);
  return [...(own ? [own] : []), ...(extras?.extrasFor(item) ?? [])];
}

/**
 * What a plain click does. The screen gets first say, so the click the guided
 * opening teaches keeps its meaning; where a screen has nothing to say about
 * an item, the first of its own actions is better than a dead slot.
 */
function clickAction(item: Item): ItemAction | null {
  return actionsFor(item).find((a) => !a.blocked && !a.menuOnly) ?? null;
}
let currencyHandler: CurrencyHandler | null = null;

export function initInventory(state: GameState): void {
  game = state;
  // Never saved: a filter surviving a reload is a dock that looks empty.
  const box = $('inv-find') as HTMLInputElement;
  box.value = '';
  box.oninput = () => {
    find = box.value;
    renderInventory();
  };

  ($('inv-sort') as HTMLButtonElement).onclick = () => {
    sortInventory(game!);
    renderInventory();
  };

  ($('inv-close') as HTMLButtonElement).onclick = closeInventory;
}

/** A window, and the only one whose home is a corner. Drawn on the way open:
 *  nothing behind a `hidden` attribute is worth keeping current. */
export function openInventory(): void {
  $('dock').hidden = false;
  renderInventory();
}

export const closeInventory = (): void => {
  $('dock').hidden = true;
};

export const isInventoryOpen = (): boolean => !$('dock').hidden;

/** Screens call this when they take focus, and again when their state moves. */
export function setInventoryHandler(next: InventoryHandler | null): void {
  screenHandler = next;
  renderInventory();
}

/** What the dock does with nothing open — never overwrites a screen's claim. */
export function setInventoryBase(next: InventoryHandler | null): void {
  base = next;
  renderInventory();
}

/** Null puts the dock back in the hands of whatever screen is underneath. */
export function setInventoryOverride(next: InventoryHandler | null): void {
  override = next;
  renderInventory();
}

export function setCurrencyHandler(next: CurrencyHandler | null): void {
  currencyHandler = next;
  renderInventory();
}

/**
 * Gold only — the feedstock every price is quoted in, so what you want is a
 * number to compare against a price. That is a readout, not an inventory slot.
 */
function renderWallet(): void {
  if (!game) return;
  const host = $('wallet');
  host.replaceChildren();

  const chip = el('span', 'coin');
  chip.append(el('span', 'coin__n', String(game.wallet.gold ?? 0)));
  chip.append(el('span', 'coin__id', 'gold'));
  host.append(chip);
}

function currencyTooltip(currency: CurrencyDef, stock: number): string {
  const lines = [
    currency.name,
    `${currency.class} · ${stock} held`,
    currency.description,
  ];
  // On its own line as well as inside the sentence. A one-way door nobody saw
  // is a bug report, and this is the only one in the game.
  if (locksItem(currency)) lines.push('LOCKS THE ITEM — nothing can change it afterwards');
  const why = currencyHandler?.blocked?.(currency);
  if (why) lines.push(`— ${why}`);
  const action = currencyHandler?.actionFor(currency);
  if (action) lines.push(`— click to ${action.label.toLowerCase()}`);
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

function tooltip(item: Item): HTMLElement {
  const notes: string[] = [];
  // First: it is the question you opened the tooltip to answer.
  const why = handlerFor()?.dimmed?.(item);
  if (why) notes.push(why);
  const all = actionsFor(item);
  const click = clickAction(item);
  if (click) notes.push(`click to ${click.label.toLowerCase()}`);
  // Nothing else on screen says the menu is there, and an action nobody can
  // find is an action that does not exist.
  if (all.length > (click ? 1 : 0)) notes.push('hold or right-click for more');
  return itemCard(item, notes);
}

// --- dragging ---------------------------------------------------------------
//
// Pointer events rather than HTML5 drag-and-drop, which does not fire on touch
// at all. A press only becomes a drag once it has travelled far enough to not
// be a click, so every existing click still works and nothing had to change
// about what a click MEANS.

/** Pixels a press must travel before it stops being a click. */
const DRAG_SLOP = 6;
/** How long a still press waits before it means "show me everything". */
const HOLD_MS = 450;

interface Drag {
  item: Item;
  from: HTMLElement;
  startX: number;
  startY: number;
  ghost: HTMLElement | null;
  over: Element | null;
  /** Set when the item is worn rather than carried, and does what a drop does. */
  onBench: (() => void) | null;
}

let drag: Drag | null = null;
/** Set for exactly one click: the one a finished drag is about to fire. */
let dragged = false;
let held: ReturnType<typeof setTimeout> | null = null;
/** A long press opened the menu, so the click that follows is not a choice. */
let heldOpen = false;

/** True for the one click a finished drag fires, and clears itself saying so. */
export function consumeDrag(): boolean {
  if (!dragged) return false;
  dragged = false;
  return true;
}

const itemById = (id: string | undefined): Item | null =>
  (id && game?.inventory.find((i) => i.id === id)) || null;

/** Every action this item has, at a point. Empty menus never open. */
function showMenu(item: Item, x: number, y: number): void {
  const actions = actionsFor(item);
  if (actions.length === 0) return;
  hideTooltip();
  openMenu(x, y, item.name, actions);
}

/**
 * Begins a press that may become a drag. `onBench` marks the item as worn: it
 * is not in the bag, so the bench is the only place it can land, and the menu
 * would offer to put on something already on.
 */
export function pressItem(
  event: PointerEvent,
  from: HTMLElement,
  item: Item,
  onBench?: () => void
): void {
  // Left button or touch only; a right-click is not a drag.
  if (event.button !== 0) return;
  closeMenu();
  // Touch has no right-click. Holding still is the same intent, and it cannot
  // collide with a drag: moving past the slop cancels it.
  if (!onBench) {
    held = globalThis.setTimeout(() => {
      held = null;
      if (!drag || drag.ghost) return;
      heldOpen = true;
      showMenu(item, event.clientX, event.clientY);
      teardown();
    }, HOLD_MS);
  }
  // A drag that ended on some OTHER slot fires no click at all, so the flag it
  // set is still standing. Clearing it here, rather than on the click that may
  // never come, is what stops it eating an honest click later.
  dragged = false;
  drag = {
    item,
    from,
    startX: event.clientX,
    startY: event.clientY,
    ghost: null,
    over: null,
    onBench: onBench ?? null,
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', drop);
  window.addEventListener('pointercancel', cancel);
}

function begin(event: PointerEvent): void {
  if (!drag) return;
  drag.ghost = el('div', 'dragghost');
  drag.ghost.append(itemIcon(drag.item, 40));
  document.body.append(drag.ghost);
  drag.from.classList.add('slot--dragging');
  document.body.classList.add('dragging');
  hideTooltip();
  position(event);
}

function position(event: PointerEvent): void {
  if (!drag?.ghost) return;
  drag.ghost.style.left = `${event.clientX}px`;
  drag.ghost.style.top = `${event.clientY}px`;
}

/** What is under the pointer, ignoring the ghost — it has no pointer events. */
function targetAt(event: PointerEvent): Element | null {
  const under = document.elementFromPoint(event.clientX, event.clientY);
  // Nearest wins, and a worn slot sits inside the panel that is the bench, so
  // the order of these three is what stops every equip reading as a bench drop.
  return under?.closest('.slot, [data-equip], [data-drop]') ?? null;
}

/**
 * What dropping on `target` would do, or null for nothing. One answer for both
 * the highlight and the drop, so the outline never promises a move that the
 * drop then refuses — the stash draws slots of its own that carry no item.
 */
type Landing =
  | { kind: 'bench' }
  | { kind: 'equip'; slotId: string }
  | { kind: 'swap'; onto: Item }
  | { kind: 'end' }
  | null;

function landing(target: Element | null, item: Item): Landing {
  if (!target || target === drag?.from) return null;
  // A worn piece has no place in the bag until you take it off.
  if (drag?.onBench) return target.closest('[data-drop="bench"]') ? { kind: 'bench' } : null;

  const slotId = (target as HTMLElement).dataset?.equip;
  if (slotId) {
    const into = EQUIP_SLOTS.find((s) => s.id === slotId);
    return into && fitsSlot(item, into) ? { kind: 'equip', slotId } : null;
  }
  if (target.closest('[data-drop="bench"]')) return { kind: 'bench' };
  if (!target.classList.contains('slot')) return null;
  const slot = target as HTMLElement;
  const onto = itemById(slot.dataset.itemId);
  if (onto) return onto.kind === item.kind ? { kind: 'swap', onto } : null;
  return slot.dataset.dropKind === item.kind ? { kind: 'end' } : null;
}

function highlight(next: Element | null): void {
  if (!drag || next === drag.over) return;
  drag.over?.classList.remove('slot--over', 'drop--over');
  const where = landing(next, drag.item);
  if (next && where) {
    const inBag = where.kind === 'swap' || where.kind === 'end';
    next.classList.add(inBag ? 'slot--over' : 'drop--over');
  }
  drag.over = next;
}

function move(event: PointerEvent): void {
  if (!drag) return;
  if (!drag.ghost) {
    const far =
      Math.abs(event.clientX - drag.startX) > DRAG_SLOP ||
      Math.abs(event.clientY - drag.startY) > DRAG_SLOP;
    if (!far) return;
    if (held) globalThis.clearTimeout(held);
    held = null;
    begin(event);
  }
  position(event);
  highlight(targetAt(event));
}

function teardown(): void {
  if (held) globalThis.clearTimeout(held);
  held = null;
  window.removeEventListener('pointermove', move);
  window.removeEventListener('pointerup', drop);
  window.removeEventListener('pointercancel', cancel);
  drag?.over?.classList.remove('slot--over', 'drop--over');
  drag?.from.classList.remove('slot--dragging');
  drag?.ghost?.remove();
  document.body.classList.remove('dragging');
  drag = null;
}

function cancel(): void {
  if (drag?.ghost) dragged = true;
  teardown();
}

function drop(event: PointerEvent): void {
  const carried = drag;
  // Never travelled far enough to be a drag, so it is a click — unless a long
  // press already answered for this press, and then it is nothing at all.
  if (!carried?.ghost) {
    if (heldOpen) { heldOpen = false; dragged = true; }
    teardown();
    return;
  }

  const where = landing(targetAt(event), carried.item);
  // Dropping on the bench is the same intent as clicking one, so it runs the
  // same action rather than inventing a second way to say it.
  if (where?.kind === 'bench') (carried.onBench ?? (() => handlerFor()?.actionFor(carried.item)?.run()))();
  else if (where?.kind === 'equip') extras?.equipTo?.(carried.item, where.slotId);
  else if (where?.kind === 'swap' && game) swapItems(game, carried.item, where.onto);
  else if (where?.kind === 'end' && game) sendToEnd(game, carried.item);

  dragged = true;
  teardown();
  renderInventory();
}

/** What you are carrying to a PERSON. Its own column because a corpse that
 *  sorted into the dock beside a pair of boots is a corpse you sell by
 *  accident — and nothing here has a click at all. */
function renderRelics(): void {
  if (!game) return;
  const held = relicsIn(game);
  $('inv-relics-col').hidden = held.length === 0;
  const host = $('inv-relics');
  host.replaceChildren();
  if (held.length === 0) return;
  sizeGrid(host, Math.max(RELIC_SLOTS, held.length));

  for (const item of held) {
    const btn = el('button', 'slot slot--gear slot--off') as HTMLButtonElement;
    btn.disabled = true;
    btn.append(itemIcon(item, 30));
    attachTooltip(btn, () => itemCard(item, ['somebody down here wants this']));
    host.append(btn);
  }
  for (let i = held.length; i < RELIC_SLOTS; i++) {
    host.append(el('div', 'slot slot--empty'));
  }
}

export function renderInventory(): void {
  if (!game) return;
  renderWallet();
  renderCurrencies();
  renderRelics();

  const items = game.inventory.filter((i) => i.kind === 'gear');
  fill($(GEAR_HOST), items.filter((i) => itemMatches(i, find)));
  // On the label, not in a tooltip: what you check before deciding whether to
  // go back down. It counts what you HOLD, never what a filter left on screen.
  const label = $(`${GEAR_HOST}-label`);
  label.textContent = `Equipment ${items.length}/${CARRY.gear}`;
  label.classList.toggle('dockcol__label--full', items.length >= CARRY.gear);
}

function fill(host: HTMLElement, items: Item[]): void {
  host.replaceChildren();
  sizeGrid(host, CARRY.gear);

  for (const item of items) {
    const action = clickAction(item);
    // The base's tier colours the slot; the silhouette says what a piece IS,
    // never how much it can hold.
    const btn = el(
      'button',
      `slot slot--gear slot--t${baseTier(item)}` +
        (item.meta.corrupted ? ' slot--locked' : '') +
        (item.meta.unique !== undefined ? ' slot--unique' : '')
    ) as HTMLButtonElement;

    btn.append(itemIcon(item, 30));
    if (item.mods.length > 0) btn.classList.add('slot--modded');
    attachTooltip(btn, () => tooltip(item));
    btn.dataset.itemId = item.id;
    btn.id = dockSlotId(item.id);
    btn.addEventListener('pointerdown', (e) => pressItem(e as PointerEvent, btn, item));
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showMenu(item, (e as MouseEvent).clientX, (e as MouseEvent).clientY);
    });

    if (handlerFor()?.highlighted?.(item)) btn.classList.add('slot--on');
    if (handlerFor()?.dimmed?.(item)) btn.classList.add('slot--dim');

    if (action) {
      btn.onclick = () => {
        if (!consumeDrag()) action.run();
      };
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
  for (let i = items.length; i < CARRY.gear; i++) {
    const pad = el('div', 'slot slot--empty');
    pad.dataset.dropKind = 'gear';
    host.append(pad);
  }
}
