/**
 * Everything you own that opens the Fissure, on one screen, with what each one
 * would do to a run written next to it.
 *
 * A crystal is never consumed, so the collection only grows — and four sockets
 * against a dozen crystals is a comparison, not a bag. Rows rather than icons:
 * what separates two of them is danger, family and how far they have levelled,
 * and none of that is a silhouette.
 */
import { CRYSTAL_DEPTHS, FAMILY_BY_ID, LADDER, RUN_SLOTS } from '../data';
import type { CrystalDepth } from '../data';
import { crystalsIn, socketFor, socketItem, unsocket } from '../game/state';
import type { GameState } from '../game/state';
import { crystalProgress, giftSchedule } from '../game/crystals';
import { crystalFamily, crystalRewards } from '../sim/crystal';
import { modCapacity } from '../mods';
import { describeMod } from '../crafting';
import { itemIcon } from './icons';
import { note } from './history';
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

/** Socketed, or in the collection. There is nowhere else a crystal can be. */
type Held = 'socket' | 'held';

interface Row {
  item: Item;
  held: Held;
  /** Which socket, when it is in one. */
  slot?: string;
}

function rows(): Row[] {
  const out: Row[] = [];
  for (const slot of RUN_SLOTS) {
    const held = game.sockets[slot.id];
    if (held) out.push({ item: held, held: 'socket', slot: slot.id });
  }
  const rest: Row[] = crystalsIn(game).map((item): Row => ({ item, held: 'held' }));
  // Socketed first, because that is the set a run is launched with; the rest
  // by what they would add to it, which is the reason to be looking.
  rest.sort((a, b) => crystalRewards(b.item.mods).danger - crystalRewards(a.item.mods).danger);
  return [...out, ...rest];
}

function changed(): void {
  render();
  onChanged?.();
}

/** The one move that row offers. Neither can ever be refused. */
function action(row: Row): { label: string; run: () => void } {
  const { item } = row;
  if (row.held === 'socket') {
    return {
      label: 'Take it back',
      run: () => {
        if (!unsocket(game, row.slot!)) return;
        note(`Unsocketed ${item.name}`);
        changed();
      },
    };
  }

  const slot = socketFor(game, item);
  const into = RUN_SLOTS.find((s) => s.id === slot);
  return {
    label: game.sockets[slot ?? ''] ? `Socket (swaps ${into?.name})` : 'Socket it',
    run: () => {
      if (!slot || !socketItem(game, item, slot)) return;
      note(`Socketed ${item.name}`);
      changed();
    },
  };
}

/** Id of the one button a crystal's row offers, so the guide can ring it. */
export const crystalMoveId = (itemId: string): string => `crystal-move-${itemId}`;

const WHERE: Record<Held, string> = {
  socket: 'socketed',
  held: 'unsocketed',
};


function renderRow(row: Row): HTMLElement {
  const { item } = row;
  const family = FAMILY_BY_ID[crystalFamily(item)];
  const grown = crystalProgress(item);
  const danger = Math.round(crystalRewards(item.mods).danger);

  const card = el('div', `crystal crystal--${row.held}`);

  const head = el('div', 'crystal__head');
  head.append(itemIcon(item, 26));
  const title = el('div', 'crystal__title');
  title.append(el('div', 'crystal__name', item.name));
  title.append(
    el('div', `socket__family socket__family--${family.id}`, `${family.name} · ${WHERE[row.held]}`)
  );
  head.append(title);
  card.append(head);

  const chips = el('div', 'setrows');
  for (const [k, v] of [
    ['level', String(grown.level)],
    ['danger', String(danger)],
    ['modifiers', `${item.mods.length}/${modCapacity(item)}`],
  ]) {
    const chip = el('span', 'mult');
    chip.append(el('span', 'mult__k', k));
    chip.append(el('span', 'mult__v', v));
    chips.append(chip);
  }
  card.append(chips);

  const bar = el('div', 'grow');
  const fill = el('div', 'grow__fill');
  fill.style.width = `${Math.round(grown.fraction * 100)}%`;
  bar.append(fill);
  card.append(bar);
  card.append(
    el(
      'div',
      'crystal__grow',
      grown.need === null
        ? `Level ${grown.level} — as far as it goes`
        : `${Math.floor(grown.xp)} / ${grown.need} to level ${grown.level + 1}` +
            (row.held === 'socket' ? '' : ' — only levels while socketed')
    )
  );

  for (const mod of item.mods) card.append(el('div', 'chosen__mod', describeMod(mod)));

  const move = action(row);
  const button = el('button', 'mini', move.label) as HTMLButtonElement;
  button.id = crystalMoveId(item.id);
  button.onclick = move.run;
  card.append(button);
  return card;
}

/** WHAT THE CLIMB PAYS, and where. A depth already behind you is marked taken,
 *  so the panel reads as a ladder you are partway up rather than a wishlist. */
function renderDepth(depth: CrystalDepth): HTMLElement {
  const zone = LADDER.zones[depth.zone];
  const cleared = Number(game.character.climbed?.[zone?.id ?? ''] ?? 0) >= depth.rung;
  const family = FAMILY_BY_ID[depth.family];
  const card = el('div', `quest${cleared ? ' quest--done' : ''}`);
  card.append(el('div', 'crystal__name', `${zone?.name ?? '?'}, depth ${depth.rung}`));
  card.append(el('div', 'quest__detail', cleared ? 'Cleared.' : 'Clear it and it is yours.'));
  card.append(
    el(
      'div',
      `socket__family socket__family--${family.id}`,
      cleared ? `${family.name} crystal — taken` : `Pays a ${family.name} crystal`
    )
  );
  return card;
}

export function render(): void {
  const host = $('crystals-list');
  host.replaceChildren();
  const all = rows();
  for (const row of all) host.append(renderRow(row));
  if (all.length === 0) {
    host.append(el('p', 'empty', 'None yet. Clear a descent and the Lampwright will find you.'));
  }

  const quests = $('crystals-quests');
  quests.replaceChildren();
  for (const depth of CRYSTAL_DEPTHS) quests.append(renderDepth(depth));

  $('crystals-count').textContent = `${all.length} owned · ${
    all.filter((r) => r.held === 'socket').length
  }/${RUN_SLOTS.length} socketed`;

  $('crystals-npc').textContent = giftSchedule(game);
}

export function openCrystals(): void {
  $('crystals').hidden = false;
  render();
}

export function closeCrystals(): void {
  $('crystals').hidden = true;
  onChanged?.();
}

export const isCrystalsOpen = (): boolean => !$('crystals').hidden;

export function initCrystals(state: GameState, refresh: () => void): void {
  game = state;
  onChanged = refresh;
  ($('crystals-close') as HTMLButtonElement).onclick = closeCrystals;
}
