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
import type { GameState } from '../game/state';
import type { Item } from '../types';

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
}

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

/** Currency counts read left to right, fragments first — it's the one you spend. */
function renderWallet(): void {
  if (!game) return;
  const host = $('wallet');
  host.replaceChildren();

  const entries = Object.entries(game.wallet).filter(([, n]) => n > 0);
  if (entries.length === 0) {
    host.append(el('span', 'empty', 'no currency'));
    return;
  }

  entries.sort((a, b) => (a[0] === 'fragment' ? -1 : b[0] === 'fragment' ? 1 : 0));
  for (const [id, n] of entries) {
    const chip = el('span', 'coin');
    chip.append(el('span', 'coin__n', String(n)));
    chip.append(el('span', 'coin__id', id.replace(/_/g, ' ')));
    host.append(chip);
  }
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

  if (game.inventory.length === 0) {
    host.append(el('p', 'empty', 'Empty. Clear a map or buy something on the bench.'));
    return;
  }

  // Crystals first: they're what you spend to play.
  const sorted = [...game.inventory].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'crystal' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  for (const item of sorted) {
    const action = handler?.actionFor(item) ?? null;
    const btn = el('button', `invitem invitem--${item.kind}`) as HTMLButtonElement;

    btn.append(el('span', 'invitem__name', item.name));
    btn.append(
      el(
        'span',
        'invitem__meta',
        `${fillState(item)} · ${item.mods.length} mod${item.mods.length === 1 ? '' : 's'}` +
          (item.meta.corrupted ? ' · locked' : '')
      )
    );
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
}
