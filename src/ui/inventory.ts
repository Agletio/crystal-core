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
import { balance, isPerfect } from '../economy';
import { CURRENCIES, MATERIAL_FAMILIES, MATERIALS } from '../data';
import type { MaterialDef } from '../data';
import { CARRY, fitsSlot, relicsIn, sendToEnd, sortInventory, swapItems } from '../game/state';
import { EQUIP_SLOTS } from '../data';
import type { GameState } from '../game/state';
import type { CurrencyClass, CurrencyDef, Item } from '../types';

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

/** How many relic slots the column draws when there is anything in it. */
const RELIC_SLOTS = 4;

/** Rarity, ascending. A RECORD rather than a list, so adding a class fails to
 *  compile here instead of silently dropping its currencies off the column. */
const CLASS_ORDER: Record<CurrencyClass, number> = {
  basic: 0, uncommon: 1, rare: 2, exotic: 3,
};
const CURRENCY_CLASSES = (Object.keys(CLASS_ORDER) as CurrencyClass[]).sort(
  (a, b) => CLASS_ORDER[a] - CLASS_ORDER[b]
);

/**
 * WHICH TAB IS UP. UI state and never saved, and STICKY across opens — the
 * bench does not switch it, because gear is what you pick the NEXT item to
 * craft from and a screen that hid it would cost more than the click it saved.
 */
type DockTab = 'gear' | 'currency' | 'materials';
let tab: DockTab = 'gear';

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
  for (const which of ['gear', 'currency', 'materials'] as DockTab[]) {
    ($(`inv-tab-${which}`) as HTMLButtonElement).onclick = () => {
      tab = which;
      renderInventory();
    };
  }
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

/** ONE ROW: an icon, a name and a count. A group is drawn only if you hold
 *  something in it — the list is what you OWN, never a catalogue of what
 *  exists, which is a shelf and belongs at the counter. */
function ledgerRow(
  icon: SVGSVGElement,
  name: string,
  n: number,
  cls: string
): HTMLButtonElement {
  const row = el('button', `ledgerrow ledgerrow--${cls}`) as HTMLButtonElement;
  row.append(icon);
  row.append(el('span', 'ledgerrow__name', name));
  row.append(el('span', 'ledgerrow__n', String(n)));
  return row;
}

function ledgerGroup(host: HTMLElement, label: string): HTMLElement {
  const group = el('div', 'ledgergroup');
  group.append(el('div', 'dockcol__label', label));
  host.append(group);
  return group;
}

/** Only what you own, grouped by CLASS — the word the counter and the tooltip
 *  already use, so rarity reads down the column without a border to hunt for. */
function renderCurrencies(): void {
  if (!game) return;
  const host = $('inv-currency');
  host.replaceChildren();

  let owned = 0;
  for (const cls of CURRENCY_CLASSES) {
    const held = CURRENCIES.filter(
      (c) => c.class === cls && balance(game!.wallet, c.id) > 0
    );
    if (held.length === 0) continue;
    const group = ledgerGroup(host, cls);

    for (const currency of held) {
      owned++;
      const stock = balance(game.wallet, currency.id);
      const action = currencyHandler?.actionFor(currency) ?? null;
      const row = ledgerRow(currencyIcon(currency, 20), currency.name, stock, cls);
      attachTooltip(row, () => currencyTooltip(currency, stock));

      if (action) {
        row.onclick = action.run;
        row.setAttribute('aria-label', `${action.label}: ${currency.name} (${stock} held)`);
      } else {
        row.disabled = true;
        row.classList.add('ledgerrow--off');
        row.setAttribute('aria-label', `${currency.name} (${stock} held)`);
      }
      group.append(row);
    }
  }
  if (owned === 0) {
    host.append(el('p', 'empty', 'No currency. It comes up out of a descent.'));
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
    return into && game && fitsSlot(item, into, game.character)
      ? { kind: 'equip', slotId }
      : null;
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

/**
 * WHAT A DESCENT DUG UP, grouped by the FAMILY a station works — so the list is
 * read in the same order the camp is walked. Raw before processed within a
 * family, in table order, so a group never reshuffles itself between runs.
 *
 * Every stack is drawn: this is a list rather than a grid precisely because 28
 * materials in two states apiece is 56 stacks, which no dock column could hold.
 */
function renderMaterials(): void {
  if (!game) return;
  const rows = (game.materials ?? []).filter((i) => ((i.meta.n as number) ?? 0) > 0);
  const host = $('inv-materials');
  host.replaceChildren();

  // The families a station works, then whatever belongs to none — a world's
  // UNIQUE, which is used exactly as it came up.
  const groups: Array<{ label: string; of: (def: MaterialDef) => boolean }> = [
    ...MATERIAL_FAMILIES.map((f) => ({ label: f.name, of: (d: MaterialDef) => d.family === f.id })),
    { label: 'Unworked', of: (d: MaterialDef) => d.family === null },
  ];

  let owned = 0;
  for (const group of groups) {
    const held = MATERIALS.filter(group.of).flatMap((def) =>
      rows
        .filter((i) => i.base === def.id)
        .sort((a, b) => (a.meta.done ? 1 : 0) - (b.meta.done ? 1 : 0))
    );
    if (held.length === 0) continue;
    const column = ledgerGroup(host, group.label);

    for (const item of held) {
      owned++;
      const n = (item.meta.n as number) ?? 0;
      const row = ledgerRow(itemIcon(item, 20), item.name, n, item.meta.done ? 'done' : 'raw');
      attachTooltip(row, () => tooltip(item));
      // THE MENU IS THE WHOLE POINT of a row you can click: eating a cooked
      // fish lives here, and a disabled slot is what made it unreachable.
      const actions = actionsFor(item);
      if (actions.length === 0) {
        row.disabled = true;
        row.classList.add('ledgerrow--off');
        row.setAttribute('aria-label', `${item.name} (${n} held)`);
      } else {
        row.onclick = (e) => showMenu(item, (e as MouseEvent).clientX, (e as MouseEvent).clientY);
        row.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          showMenu(item, (e as MouseEvent).clientX, (e as MouseEvent).clientY);
        });
        row.setAttribute('aria-label', `${item.name} (${n} held)`);
      }
      column.append(row);
    }
  }
  if (owned === 0) {
    host.append(el('p', 'empty', 'Nothing gathered. It comes up out of a descent.'));
  }
}

export function renderInventory(): void {
  if (!game) return;
  renderWallet();
  renderCurrencies();
  renderRelics();
  renderMaterials();

  for (const which of ['gear', 'currency', 'materials'] as DockTab[]) {
    $(`inv-tab-${which}`).classList.toggle('mini--on', tab === which);
  }
  $('inv-pane-gear').hidden = tab !== 'gear';
  $('inv-currency').hidden = tab !== 'currency';
  $('inv-materials').hidden = tab !== 'materials';

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
        (item.meta.unique !== undefined ? ' slot--unique' : '') +
        (isPerfect(item) ? ' slot--perfect' : '')
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
