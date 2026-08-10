/**
 * The stash.
 *
 * The dock stopped scrolling, which turned "how much can I carry" from a
 * detail into a real question — and a real question needs an answer that
 * isn't "throw it away". This is that answer: somewhere to put the piece you
 * are saving for later without it costing you a slot you need now.
 *
 * A stashed item is INERT. It cannot be crafted, socketed or worn until you
 * carry it again. That's the whole point — storage that also worked as a bag
 * would just be a bigger bag, and the carry limit would mean nothing.
 *
 * Space is bought with gold, from here, because here is where you find out you
 * need it.
 */
import {
  CARRY,
  STASH_MAX,
  buyStashSpace,
  carryRoom,
  fromStash,
  stashRoom,
  stashUpgradeCost,
  toStash,
} from '../game/state';
import type { GameState } from '../game/state';
import { baseTier, modCapacity, tierName } from '../mods';
import { describeMod } from '../crafting';
import { itemIcon } from './icons';
import { renderInventory, setInventoryHandler } from './inventory';
import { note } from './history';
import { attachTooltip, hideTooltip } from './tooltip';
import type { Item } from '../types';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let game: GameState;
/** The dock answers to whatever screen is underneath once this closes. */
let onClosed: (() => void) | null = null;

function tooltip(item: Item, action: string): string {
  const lines = [
    item.name,
    `${tierName(item)} · ilvl ${item.ilvl} · ` +
      `${item.mods.length}/${modCapacity(item)} modifiers`,
  ];
  if (item.meta.corrupted) lines.push('corrupted — cannot be changed');
  for (const imp of item.implicits) lines.push(`${describeMod(imp)}  (base)`);
  for (const mod of item.mods) lines.push(describeMod(mod));
  lines.push(`— ${action}`);
  return lines.join('\n');
}

export function render(): void {
  hideTooltip();

  const host = $('stash-slots');
  host.replaceChildren();

  const items = [...game.stash].sort((a, b) => a.name.localeCompare(b.name));

  for (const item of items) {
    const room = carryRoom(game, item.kind) > 0;
    const btn = el('button', `slot slot--${item.kind}`) as HTMLButtonElement;
    btn.append(itemIcon(item, 30));
    if (item.mods.length > 0) btn.classList.add('slot--modded');
    attachTooltip(btn, () =>
      tooltip(item, room ? 'click to take it out' : `your ${item.kind} bag is full`)
    );

    if (room) {
      btn.setAttribute('aria-label', `Take out: ${item.name}`);
      btn.onclick = () => {
        if (!fromStash(game, item)) return;
        note(`Took ${item.name} out of the stash`);
        render();
        renderInventory();
      };
    } else {
      btn.disabled = true;
      btn.classList.add('slot--off');
      btn.setAttribute('aria-label', `${item.name} — bag full`);
    }
    host.append(btn);
  }

  // Empty slots up to what you've paid for, so the space you bought is
  // something you can see rather than a number in a corner.
  for (let i = items.length; i < game.stashSlots; i++) {
    host.append(el('div', 'slot slot--empty'));
  }

  $('stash-count').textContent = `${game.stash.length} / ${game.stashSlots}`;

  const cost = stashUpgradeCost(game.stashSlots);
  const grow = $('stash-grow') as HTMLButtonElement;
  grow.replaceChildren();
  if (cost === null) {
    grow.append(el('span', 'buy__name', 'Stash is full size'));
    grow.append(el('span', 'buy__cost', `${STASH_MAX} slots`));
    grow.disabled = true;
    grow.classList.add('buy--off');
  } else {
    const affordable = (game.wallet.gold ?? 0) >= cost;
    grow.append(el('span', 'buy__name', 'Buy more space'));
    grow.append(el('span', 'buy__cost', `${cost} gold`));
    grow.disabled = !affordable;
    grow.classList.toggle('buy--off', !affordable);
  }

  // The rule the slot counts cannot show: nothing acts on a stashed item.
  $('stash-hint').textContent = 'Stored, not carried. Take one out to use it.';
}

/**
 * While the stash is open, clicking a carried item puts it away.
 *
 * The same seam every other screen uses. Note that it is the DOCK you click,
 * not a list inside this popup: popups stop above the dock precisely so the
 * two halves of a move are both on screen.
 */
function stashHandler() {
  return {
    actionFor: (item: Item) => {
      if (stashRoom(game) <= 0) return null;
      return {
        label: 'Put in stash',
        run: () => {
          if (!toStash(game, item)) return;
          note(`Stashed ${item.name}`);
          render();
          renderInventory();
        },
      };
    },
  };
}

export function openStash(): void {
  $('stash').hidden = false;
  setInventoryHandler(stashHandler());
  render();
}

export function closeStash(): void {
  $('stash').hidden = true;
  hideTooltip();
  onClosed?.();
}

export const isStashOpen = (): boolean => !$('stash').hidden;

export function initStash(state: GameState, closed: () => void): void {
  game = state;
  onClosed = closed;
  ($('stash-close') as HTMLButtonElement).onclick = closeStash;
  ($('stash-grow') as HTMLButtonElement).onclick = () => {
    const result = buyStashSpace(game);
    note(
      result.ok ? `Stash grown to ${game.stashSlots} slots` : (result.error ?? 'cannot afford that'),
      result.ok ? 'add' : 'fail'
    );
    render();
    renderInventory();
  };
  render();
}
