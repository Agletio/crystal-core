/**
 * Everything you own that opens the Fissure, on one screen, with what each one
 * would do to a run written next to it.
 *
 * A crystal is never consumed, so the collection only grows — and four sockets
 * against a dozen crystals is a comparison, not a bag. Rows rather than icons:
 * what separates two of them is danger, family and how far they have levelled,
 * and none of that is a silhouette.
 */
import { CRYSTAL_LADDER, FAMILY_BY_ID, LADDER, PROVING, RUN_SLOTS } from '../data';
import { climbed } from '../ladder';
import type { CrystalStep } from '../data';
import type { LadderZoneDef } from '../types';
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

/** THE CLIMB, as the one thing standing between you and a crystal. Nothing is
 *  paid out of the wall — the Lampwright pays the whole campaign, once. */
function renderZone(zone: LadderZoneDef, z: number): HTMLElement {
  const done = climbed(game.character, z) >= zone.rungs;
  const card = el('div', `quest${done ? ' quest--done' : ''}`);
  card.append(el('div', 'crystal__name', zone.name));
  card.append(el('div', 'quest__detail', done
    ? 'Cleared, top to bottom.'
    : `${climbed(game.character, z)} of ${zone.rungs} depths cleared.`));
  return card;
}

/** THE CRYSTAL LADDER, once the campaign has paid: twelve steps in order, each
 *  saying what it is waiting on. A step past the one you are on is drawn too —
 *  the whole ladder is the plan, and a plan you cannot see is one nobody makes. */
function renderStep(step: CrystalStep, at: number, now: number): HTMLElement {
  const done = at < now;
  const card = el('div', `quest${done ? ' quest--done' : ''}`);
  const family = FAMILY_BY_ID[step.family];
  card.append(el('div', 'crystal__name', `${family?.name ?? step.family} crystal`));
  const said = step.clears !== undefined
    ? `${Math.min(step.clears, game.provingClears ?? 0)} of ${step.clears} ${PROVING.name} clears.`
    : `${step.hold!.count} ${FAMILY_BY_ID[step.hold!.family]?.name ?? step.hold!.family} ` +
      `${step.hold!.count === 1 ? 'crystal' : 'crystals'} at level ${step.hold!.level}.`;
  card.append(el('div', 'quest__detail', done ? 'Taken.' : said));
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

  // THE CAMPAIGN'S three zones until it is paid for, and the LADDER after —
  // one list, saying the only thing between you and the next crystal.
  const quests = $('crystals-quests');
  quests.replaceChildren();
  if (game.character.paidCampaign) {
    const given = game.given ?? [];
    const now = CRYSTAL_LADDER.findIndex((step) => !given.includes(`crystal:${step.id}`));
    const at = now === -1 ? CRYSTAL_LADDER.length : now;
    CRYSTAL_LADDER.forEach((step, i) => quests.append(renderStep(step, i, at)));
  } else {
    LADDER.zones.forEach((zone, z) => quests.append(renderZone(zone, z)));
  }

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
