/**
 * The inventory strip, visible on every screen.
 *
 * Deliberately not a tab. It's the thing every other screen acts on — you
 * pull a crystal out of it to run, put gear into the bench, and watch it fill
 * up after a clear — so hiding it behind navigation would mean constantly
 * flipping back to check what you have.
 *
 * Clicking an item does whatever the ACTIVE view wants, which each view
 * registers here. The inventory itself has no opinion about what an item is
 * for.
 */
import { fillState } from '../mods';
import { describeMod } from '../crafting';
import { itemIcon } from './icons';
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
  /** Null means "this view can't use that item", and it renders disabled. */
  actionFor(item: Item): { label: string; run: () => void } | null;
  /** Item currently spoken for by the active view — bench item, chosen map. */
  highlighted?(item: Item): boolean;
  /**
   * Which kinds this view shows at all. Omit for everything.
   *
   * The run screen only takes crystals, so listing gear there is noise you
   * have to look past every time you pick a map.
   */
  kinds?: readonly ItemKind[];
  /** Split into labelled sections instead of one flat grid. */
  grouped?: boolean;
}

const KIND_LABELS: Record<ItemKind, string> = {
  crystal: 'Crystals',
  gear: 'Equipment',
};

let game: GameState | null = null;
let handler: InventoryHandler | null = null;

export function initInventory(state: GameState): void {
  game = state;
}

/** Views call this when they become active, and again when their state moves. */
export function setInventoryHandler(next: InventoryHandler | null): void {
  handler = next;
  renderInventory();
}

/**
 * Fragments only.
 *
 * Every crafting currency also shows its count on its own button in the
 * bench sidebar, so listing them all up here was the same information twice
 * and it wrapped to three lines. Fragments stay because they're the thing you
 * spend everywhere, and there's no other place they appear.
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
  if (item.mods.length === 0) return `${item.name} — no modifiers`;
  return `${item.name}\n${item.mods.map((m) => describeMod(m)).join('\n')}`;
}

export function renderInventory(): void {
  if (!game) return;
  renderWallet();

  const host = $('inventory');
  host.replaceChildren();

  const kinds = handler?.kinds ?? (['crystal', 'gear'] as ItemKind[]);
  const visible = game.inventory.filter((i) => kinds.includes(i.kind));

  if (visible.length === 0) {
    host.append(
      el(
        'p',
        'empty',
        kinds.length === 1 && kinds[0] === 'crystal'
          ? 'No crystals. Buy one on the bench — they cost fragments.'
          : 'Empty. Clear a map or buy something on the bench.'
      )
    );
    return;
  }

  if (handler?.grouped) {
    for (const kind of kinds) {
      const group = visible.filter((i) => i.kind === kind);
      host.append(el('div', 'invsection__label', KIND_LABELS[kind]));
      if (group.length === 0) {
        host.append(el('p', 'empty', `No ${KIND_LABELS[kind].toLowerCase()}.`));
        continue;
      }
      host.append(grid(group));
    }
    return;
  }

  host.append(grid(visible));
}

/** Crystals first within a group: they're what you spend to play. */
function grid(items: Item[]): HTMLElement {
  const host = el('div', 'inv__grid');
  const sorted = [...items].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'crystal' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  for (const item of sorted) {
    const action = handler?.actionFor(item) ?? null;
    const btn = el('button', `invitem invitem--${item.kind}`) as HTMLButtonElement;

    btn.append(itemIcon(item));

    const body = el('span', 'invitem__body');
    body.append(el('span', 'invitem__name', item.name));
    body.append(
      el(
        'span',
        'invitem__meta',
        `${fillState(item)} · ${item.mods.length} mod${item.mods.length === 1 ? '' : 's'}` +
          (item.meta.corrupted ? ' · locked' : '')
      )
    );
    btn.append(body);
    btn.title = tooltip(item);

    if (handler?.highlighted?.(item)) btn.classList.add('invitem--on');

    if (action) {
      btn.onclick = action.run;
      btn.setAttribute('aria-label', `${action.label}: ${item.name}`);
    } else {
      btn.disabled = true;
      btn.classList.add('invitem--off');
    }
    host.append(btn);
  }
  return host;
}
