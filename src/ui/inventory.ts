/**
 * The inventory dock, along the bottom of the frame.
 *
 * Deliberately not a page. It's the thing every other screen acts on — you
 * pull a crystal out of it to run, put gear into the bench, and watch it fill
 * up after a clear — so hiding it behind navigation would mean constantly
 * flipping back to check what you have. Every popup stops above it.
 *
 * Items are icons in slots, split crystals from equipment. Names and modifiers
 * live in the hover tooltip: a stash is something you scan, and forty lines of
 * text is something you read past.
 *
 * Clicking an item does whatever the ACTIVE screen wants, which each screen
 * registers here. The dock itself has no opinion about what an item is for.
 */
import { itemIcon } from './icons';
import { fillState } from '../mods';
import { describeMod } from '../crafting';
import { attachTooltip } from './tooltip';
import type { GameState } from '../game/state';
import type { Item, ItemKind } from '../types';

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
  /** Item currently spoken for by the active screen — bench item, chosen map. */
  highlighted?(item: Item): boolean;
}

/** Kept full even when you own less, so the dock is a fixed shape. */
const MIN_SLOTS = 12;

const HOSTS: Record<ItemKind, string> = {
  crystal: 'inv-crystal',
  gear: 'inv-gear',
};

let game: GameState | null = null;
let handler: InventoryHandler | null = null;

export function initInventory(state: GameState): void {
  game = state;
}

/** Screens call this when they take focus, and again when their state moves. */
export function setInventoryHandler(next: InventoryHandler | null): void {
  handler = next;
  renderInventory();
}

/**
 * Fragments only.
 *
 * Every crafting currency also shows its count on its own button in the
 * bench, so listing them all up here was the same information twice and it
 * wrapped to three lines. Fragments stay because they're the thing you spend
 * everywhere, and there's no other place they appear.
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
