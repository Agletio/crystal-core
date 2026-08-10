/**
 * The haul: where a cleared run's loot lands, and the only place the loop ever
 * stops. Full haul or dead, you come out here — one terminus, so there is one
 * screen that means "the run is over, deal with your things".
 *
 * A grid you can act on rather than a list of names. A click takes a piece,
 * because taking is the move you can undo; the two that need thought are in
 * the menu beside it.
 */
import { HAUL_CAP, carryRoom, fromHaul, haulToStash, plainGear, sellAll, sellItem, stashRoom, takeWhatFits } from '../game/state';
import type { GameState } from '../game/state';
import { canSell, sellPrice } from '../economy';
import { baseTier, modCapacity, tierName } from '../mods';
import { describeMod } from '../crafting';
import { itemIcon } from './icons';
import { openMenu } from './menu';
import type { ItemAction } from './menu';
import { renderInventory } from './inventory';
import { ask } from './confirm';
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
let onChanged: (() => void) | null = null;
/** Why the loop dropped you here, or empty when you opened it yourself. */
let why = '';

function changed(): void {
  render();
  renderInventory();
  onChanged?.();
}

function tooltip(item: Item, action: string): string {
  const lines = [
    item.name,
    `${tierName(item)} · ilvl ${item.ilvl} · ` +
      `${item.mods.length}/${modCapacity(item)} modifiers`,
  ];
  if (item.armour) lines.push(`Armour ${item.armour}`);
  for (const imp of item.implicits) lines.push(`${describeMod(imp)}  (base)`);
  for (const mod of item.mods) lines.push(describeMod(mod));
  lines.push(`— ${action}`);
  lines.push('— hold or right-click for more');
  return lines.join('\n');
}

/** Take, keep, or turn into gold. The whole of triage, per item. */
function actionsFor(item: Item): ItemAction[] {
  const out: ItemAction[] = [
    carryRoom(game, item.kind) > 0
      ? {
          label: 'Take it',
          run: () => {
            if (!fromHaul(game, item)) return;
            note(`Took ${item.name} out of the haul`);
            changed();
          },
        }
      : { label: 'Take it', run: () => {}, blocked: `your ${item.kind} bag is full` },
    stashRoom(game) > 0
      ? {
          label: 'Send to stash',
          menuOnly: true,
          run: () => {
            if (!haulToStash(game, item)) return;
            note(`Stashed ${item.name}`);
            changed();
          },
        }
      : { label: 'Send to stash', menuOnly: true, run: () => {}, blocked: 'the stash is full' },
  ];

  if (canSell(item)) {
    out.push({
      label: `Sell for ${sellPrice(item)} gold`,
      menuOnly: true,
      run: () => {
        const paid = sellItem(game, item);
        if (paid <= 0) return;
        note(`Sold ${item.name} for ${paid} gold`, 'add');
        changed();
      },
    });
  }
  return out;
}

export function render(): void {
  hideTooltip();

  const host = $('haul-slots');
  host.replaceChildren();

  for (const item of game.haul) {
    const take = actionsFor(item)[0];
    const btn = el(
      'button',
      `slot slot--${item.kind} slot--t${baseTier(item)}${item.meta.corrupted ? ' slot--locked' : ''}`
    ) as HTMLButtonElement;
    btn.append(itemIcon(item, 30));
    if (item.mods.length > 0) btn.classList.add('slot--modded');
    attachTooltip(btn, () => tooltip(item, take.blocked ?? 'click to take it'));

    const menu = (x: number, y: number) => {
      hideTooltip();
      openMenu(x, y, item.name, actionsFor(item));
    };
    btn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      menu((e as MouseEvent).clientX, (e as MouseEvent).clientY);
    });

    // Never disabled, even with nowhere to put it: a disabled button eats the
    // right-click too, and selling is the only way out of a full everything.
    if (take.blocked) {
      btn.classList.add('slot--off');
      btn.onclick = (e) => menu((e as MouseEvent).clientX, (e as MouseEvent).clientY);
      btn.setAttribute('aria-label', `${item.name} — ${take.blocked}, click for options`);
    } else {
      btn.onclick = take.run;
      btn.setAttribute('aria-label', `Take: ${item.name}`);
    }
    host.append(btn);
  }

  // Up to what it holds, so the stop condition is something you watch coming.
  // Past that there are no pads to draw: over capacity is a real state.
  for (let i = game.haul.length; i < HAUL_CAP; i++) {
    host.append(el('div', 'slot slot--empty'));
  }

  $('haul-count').textContent = `${game.haul.length} / ${HAUL_CAP}`;
  $('haul-count').classList.toggle('haul__count--full', game.haul.length >= HAUL_CAP);

  const line = $('haul-why');
  line.textContent = why;
  line.hidden = why === '';

  const take = $('haul-take') as HTMLButtonElement;
  const fits = game.haul.filter((i) => carryRoom(game, i.kind) > 0).length;
  take.textContent =
    game.haul.length === 0
      ? 'Nothing to take'
      : fits > 0
        ? `Take what fits (${fits})`
        : 'Your bags are full';
  take.disabled = fits === 0;
  take.classList.toggle('buy--off', fits === 0);

  const junk = plainGear(game.haul);
  const worth = junk.reduce((n, i) => n + sellPrice(i), 0);
  const sell = $('haul-sell') as HTMLButtonElement;
  sell.textContent =
    junk.length > 0 ? `Sell ${junk.length} unmodified for ${worth} gold` : 'Nothing unmodified';
  sell.disabled = junk.length === 0;
  sell.classList.toggle('buy--off', junk.length === 0);

  $('haul-hint').textContent =
    game.haul.length >= HAUL_CAP
      ? 'The Fissure stays shut until this is back under its limit.'
      : 'Nothing here can be worn, crafted or socketed until you take it out.';
}

async function sellJunk(): Promise<void> {
  const junk = plainGear(game.haul);
  if (junk.length === 0) return;
  const worth = junk.reduce((n, i) => n + sellPrice(i), 0);
  const yes = await ask({
    title: `Sell ${junk.length} pieces for ${worth} gold?`,
    text: 'Everything in the haul with no modifier on it. Anything rolled stays.',
    confirm: 'Sell',
  });
  if (!yes) return;

  const sold = sellAll(game, junk);
  note(`Sold ${sold.count} pieces for ${sold.gold} gold`, 'add');
  changed();
}

/** `reason` is what the loop wants said. Opened by hand, it says nothing. */
export function openHaul(reason = ''): void {
  why = reason;
  $('haul').hidden = false;
  render();
}

export function closeHaul(): void {
  $('haul').hidden = true;
  why = '';
  hideTooltip();
  onChanged?.();
}

export const isHaulOpen = (): boolean => !$('haul').hidden;

export function initHaul(state: GameState, refresh: () => void): void {
  game = state;
  onChanged = refresh;
  ($('haul-close') as HTMLButtonElement).onclick = closeHaul;
  ($('haul-take') as HTMLButtonElement).onclick = () => {
    const moved = takeWhatFits(game);
    if (moved > 0) note(`Took ${moved} out of the haul`);
    changed();
  };
  ($('haul-sell') as HTMLButtonElement).onclick = () => void sellJunk();
  render();
}
