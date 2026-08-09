/**
 * Everything you own that opens the Fissure, on one screen, with what each one
 * would do to a run written next to it.
 *
 * A crystal is never consumed, so the collection only grows — and four sockets
 * against a dozen crystals is a comparison, not a bag. Rows rather than icons:
 * what separates two of them is danger, family and how far they have levelled,
 * and none of that is a silhouette.
 */
import { CRYSTAL_QUESTS, FAMILY_BY_ID, LAMPWRIGHT, RUN_SLOTS } from '../data';
import type { CrystalQuest } from '../data';
import {
  carryRoom,
  crystalsIn,
  fromHaul,
  fromStash,
  socketFor,
  socketItem,
  stashRoom,
  toStash,
  unsocket,
} from '../game/state';
import type { GameState } from '../game/state';
import { crystalProgress, giftChance, questDone } from '../game/crystals';
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

/** Where a crystal is standing, which is the whole of what you can do with it. */
type Held = 'socket' | 'bag' | 'stash' | 'haul';

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
  const rest: Row[] = [
    ...crystalsIn(game).map((item): Row => ({ item, held: 'bag' })),
    ...game.stash.filter((i) => i.kind === 'crystal').map((item): Row => ({ item, held: 'stash' })),
    ...game.haul.filter((i) => i.kind === 'crystal').map((item): Row => ({ item, held: 'haul' })),
  ];
  // Socketed first, because that is the set a run is launched with; the rest
  // by what they would add to it, which is the reason to be looking.
  rest.sort((a, b) => crystalRewards(b.item.mods).danger - crystalRewards(a.item.mods).danger);
  return [...out, ...rest];
}

function changed(): void {
  render();
  onChanged?.();
}

/** The one move that row offers, and why it cannot be made. */
function action(row: Row): { label: string; run: () => void; blocked?: string } {
  const { item } = row;
  if (row.held === 'socket') {
    return {
      label: 'Take it back',
      blocked: carryRoom(game, 'crystal') > 0 ? undefined : 'your crystal bag is full',
      run: () => {
        if (!unsocket(game, row.slot!)) return;
        note(`Unsocketed ${item.name}`);
        changed();
      },
    };
  }

  if (row.held === 'bag') {
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

  const room = carryRoom(game, 'crystal') > 0;
  return {
    label: 'Take it',
    blocked: room ? undefined : 'your crystal bag is full',
    run: () => {
      const moved = row.held === 'stash' ? fromStash(game, item) : fromHaul(game, item);
      if (!moved) return;
      note(`Took ${item.name}`);
      changed();
    },
  };
}

const WHERE: Record<Held, string> = {
  socket: 'socketed',
  bag: 'in your bag',
  stash: 'in your stash',
  haul: 'in the haul',
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
        ? 'Tier 4 — as far as it goes'
        : `${Math.floor(grown.xp)} / ${grown.need} to tier ${grown.tier + 1}` +
            (row.held === 'socket' ? '' : ' — only levels while socketed')
    )
  );

  for (const mod of item.mods) card.append(el('div', 'chosen__mod', describeMod(mod)));

  const move = action(row);
  const button = el('button', 'mini', move.blocked ?? move.label) as HTMLButtonElement;
  button.disabled = !!move.blocked;
  button.classList.toggle('mini--off', !!move.blocked);
  if (!move.blocked) button.onclick = move.run;
  card.append(button);

  // Storage is the stash, and this is the only screen that knows a crystal is
  // sitting in a bag it could be out of.
  if (row.held === 'bag') {
    const away = el('button', 'mini', 'Send to stash') as HTMLButtonElement;
    away.disabled = stashRoom(game) <= 0;
    away.classList.toggle('mini--off', stashRoom(game) <= 0);
    away.onclick = () => {
      if (!toStash(game, item)) return;
      note(`Stashed ${item.name}`);
      changed();
    };
    card.append(away);
  }
  return card;
}

function renderQuest(quest: CrystalQuest): HTMLElement {
  const done = questDone(game, quest.id);
  const family = FAMILY_BY_ID[quest.gives.family];
  const card = el('div', `quest${done ? ' quest--done' : ''}`);
  card.append(el('div', 'crystal__name', quest.name));
  card.append(el('div', 'quest__detail', quest.detail));
  card.append(
    el(
      'div',
      `socket__family socket__family--${family.id}`,
      done ? `${family.name} crystal — taken` : `Pays a ${family.name} crystal`
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
  for (const quest of CRYSTAL_QUESTS) quests.append(renderQuest(quest));

  $('crystals-count').textContent = `${all.length} owned · ${
    all.filter((r) => r.held === 'socket').length
  }/${RUN_SLOTS.length} socketed`;

  // The chance is the one thing about the Lampwright a player cannot see by
  // playing: it falls as the collection fills, and silently reaching zero
  // would read as the drop having broken.
  const chance = giftChance(game);
  $('crystals-npc').textContent =
    chance >= 1
      ? `You will meet ${LAMPWRIGHT.name} on your next cleared descent, and come back with a crystal.`
      : chance > 0
        ? `You meet ${LAMPWRIGHT.name} on about ${Math.round(chance * 100)}% of cleared descents, ` +
          'and they hand you a Normal crystal.'
        : `${LAMPWRIGHT.name} has nothing left to give you. The other two worlds are earned below.`;
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
