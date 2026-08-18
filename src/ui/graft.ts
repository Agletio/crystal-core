/**
 * Somebody's bench, and it is the LAST BEAT of their room rather than a screen:
 * the same bubble their lines came in, anchored over their own head. Whose it
 * is comes in as an argument — the room says who is standing in it, and this
 * module names nobody.
 *
 * Two picks and a button. Nothing is spent until the button, and Keep it walks
 * out still holding the relic — they keep waiting, since carrying one is the
 * whole of what schedules them.
 */
import { EQUIP_SLOTS, RELIC_BY_ID } from '../data';
import type { ForgedDef } from '../data';
import type { SceneDef } from '../scenes';
import { forgedFor, graftRefusal, spendRelic } from '../game/graft';
import type { GameState } from '../game/state';
import { describeStatLine } from '../mod-text';
import { GRANT_BY_ID } from '../sim/grants';
import type { Item } from '../types';
import { note } from './history';
import { itemIcon, portraitIcon } from './icons';
import { itemCard } from './itemcard';
import { attachTooltip, hideTooltip } from './tooltip';
import { renderInventory, setInventoryHandler } from './inventory';
import { refreshCharacter } from './character';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let game: GameState;
let onDone: (() => void) | null = null;
let relic: Item | null = null;
let room: SceneDef | null = null;
let piece: Item | null = null;
let line: ForgedDef | null = null;

export const isGraftOpen = (): boolean => !$('graft').hidden;

/** What a forged line comes to, in one sentence. A switch says its own number
 *  through `GrantDef.say`, so what the panel prints and what the sim does
 *  cannot drift; a stat line says itself. */
export function forgedSays(def: ForgedDef): string {
  const said: string[] = [];
  for (const [id, value] of Object.entries(def.mod.grants ?? {})) {
    const says = GRANT_BY_ID[id]?.say?.(value);
    if (says) said.push(says);
  }
  const tier = def.mod.tiers[def.mod.tiers.length - 1];
  for (const stat of tier.stats) {
    said.push(
      describeStatLine({
        stat: stat.stat,
        form: stat.form,
        value: stat.range[0],
        tags: stat.tags ?? [],
      })
    );
  }
  return said.join('. ');
}

/**
 * What he will write. A kind has exactly ONE line today, so a list of one is a
 * choice you have not made and a button that will not light until you make it
 * — `take` picks it for you and this says it rather than asking. A second line
 * for the same kind turns these back into buttons on their own.
 */
function renderLines(): void {
  const host = $('graft-lines');
  host.replaceChildren();
  $('graft-lineslabel').hidden = piece === null;
  if (!piece) return;

  const all = forgedFor(piece, room?.id);
  for (const def of all) {
    const only = all.length === 1;
    const row = el(only ? 'div' : 'button', `graft__line${def === line ? ' graft__line--on' : ''}`);
    row.append(el('b', undefined, def.mod.name));
    row.append(el('span', undefined, forgedSays(def)));
    if (!only) {
      row.onclick = () => {
        line = def;
        renderLines();
        sync();
      };
    }
    host.append(row);
  }
}

/** Picking a piece, which is the WHOLE of the choice: the line comes with the
 *  slot. Held only while it still fits — a pick that does not is one that would
 *  write a helmet's line onto a pair of boots. */
function take(item: Item): void {
  piece = item;
  const lines = forgedFor(item, room?.id);
  if (!line || !lines.includes(line)) line = lines[0] ?? null;
  renderPieces();
  renderLines();
  sync();
  renderInventory();
}

/**
 * WHAT YOU ARE WEARING, in the sheet's own labelled slots — *the user's call,*
 * so it reads as your gear rather than as a tray of icons. Everything you were
 * CARRYING was in here too, which is an inventory inside a speech bubble: at a
 * full bag it ran off the side of the screen and pushed the lines off the
 * bottom, so the bench could be opened and never used. A carried piece comes
 * in through the DOCK, which is where it already is.
 *
 * Every slot is listed, and one he has no use for says so on its own row.
 */
function renderPieces(): void {
  const host = $('graft-pieces');
  host.replaceChildren();

  for (const slot of EQUIP_SLOTS) {
    const item = game.character.equipment[slot.id];
    const cell = el('div', 'slotcell');
    cell.append(el('div', 'slotcell__label', slot.name));

    const btn = el('button', 'slotcell__btn') as HTMLButtonElement;
    if (!item) {
      btn.append(el('span', 'slotcell__empty', 'empty'));
      btn.disabled = true;
      cell.append(btn);
      host.append(cell);
      continue;
    }
    const why = graftRefusal(item, room?.id);
    btn.classList.add('slotcell__btn--worn');
    if (item === piece) btn.classList.add('slotcell__btn--picking');
    btn.append(itemIcon(item, 26));
    const body = el('span', 'slotcell__body');
    body.append(el('span', 'slotcell__name', item.name));
    body.append(el('span', 'slotcell__meta', why ?? 'he can write on this'));
    btn.append(body);
    attachTooltip(btn, () =>
      itemCard(item, [why ?? 'what the base gave it is what gets written over'])
    );
    btn.disabled = why !== null;
    btn.onclick = () => take(item);
    cell.append(btn);
    host.append(cell);
  }
}

/** And the dock answers the same question for what you are CARRYING, which is
 *  the seam every other screen picks an item through. */
function pieceHandler() {
  return {
    actionFor: (item: Item) =>
      graftRefusal(item, room?.id) === null
        ? { label: `Hand over ${item.name}`, run: () => take(item) }
        : null,
    highlighted: (item: Item) => item === piece,
    dimmed: (item: Item) => graftRefusal(item, room?.id),
  };
}

function sync(): void {
  ($('graft-do') as HTMLButtonElement).disabled = piece === null || line === null;
}

export function openGraft(def: SceneDef, held: Item): void {
  relic = held;
  room = def;
  piece = null;
  line = null;

  const face = $('graft-face');
  face.replaceChildren();
  const portrait = portraitIcon(def.who, 52);
  if (portrait) face.append(portrait);
  $('graft-title').textContent = def.name;

  const row = $('graft-relic');
  row.replaceChildren();
  row.append(itemIcon(held, 34));
  row.append(el('span', 'met__name', held.name));
  const relicDef = RELIC_BY_ID[held.base];
  if (relicDef) attachTooltip(row, () => relicDef.flavour);

  renderPieces();
  renderLines();
  sync();
  $('graft').hidden = false;
  setInventoryHandler(pieceHandler());
  ($('graft-do') as HTMLButtonElement).focus();
}

/** Walking out with it. Nothing is spent, so he is owed the same room again. */
export function closeGraft(): void {
  relic = null;
  room = null;
  piece = null;
  line = null;
  $('graft').hidden = true;
  setInventoryHandler(null);
  hideTooltip();
  onDone?.();
}

export function initGraft(state: GameState, done: () => void): void {
  game = state;
  onDone = done;
  ($('graft-leave') as HTMLButtonElement).onclick = closeGraft;
  ($('graft-do') as HTMLButtonElement).onclick = () => {
    if (!relic || !piece || !line) return;
    const made = spendRelic(game, relic, piece, line.mod.id);
    if (made) note(`${room?.name} wrote ${line.mod.name} into your ${made.name}`, 'add');
    closeGraft();
    // The graft REPLACES the item object, and every card captured the old one:
    // a dock slot nobody redrew keeps showing the line that was written over.
    renderInventory();
    refreshCharacter();
  };
}
