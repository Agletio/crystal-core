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
import { RELIC_BY_ID } from '../data';
import type { ForgedDef } from '../data';
import type { SceneDef } from '../scenes';
import { forgedFor, graftable, spendRelic } from '../game/graft';
import type { GameState } from '../game/state';
import { baseTier } from '../mods';
import { describeStatLine } from '../mod-text';
import { GRANT_BY_ID } from '../sim/grants';
import type { Item } from '../types';
import { note } from './history';
import { itemIcon, portraitIcon } from './icons';
import { itemCard } from './itemcard';
import { attachTooltip, hideTooltip } from './tooltip';

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

function renderLines(): void {
  const host = $('graft-lines');
  host.replaceChildren();
  $('graft-lineslabel').hidden = piece === null;
  if (!piece) return;

  for (const def of forgedFor(piece, room?.id)) {
    const btn = el('button', `graft__line${def === line ? ' graft__line--on' : ''}`);
    btn.append(el('b', undefined, def.mod.name));
    btn.append(el('span', undefined, forgedSays(def)));
    btn.onclick = () => {
      line = def;
      renderLines();
      sync();
    };
    host.append(btn);
  }
}

function renderPieces(): void {
  const host = $('graft-pieces');
  host.replaceChildren();

  const all = graftable(game, room?.id);
  if (all.length === 0) {
    host.append(el('p', 'empty', 'Nothing you are carrying is any use here.'));
    return;
  }
  for (const item of all) {
    const btn = el(
      'button',
      `slot slot--gear slot--t${baseTier(item)}${item === piece ? ' slot--on' : ''}`
    ) as HTMLButtonElement;
    btn.append(itemIcon(item, 30));
    attachTooltip(btn, () => itemCard(item, ['what the base gave it is what gets written over']));
    btn.onclick = () => {
      piece = item;
      // The lines are per slot, so a pick that no longer fits is a pick that
      // would write a helmet's line onto a pair of boots.
      if (line && !forgedFor(item, room?.id).includes(line)) line = null;
      renderPieces();
      renderLines();
      sync();
    };
    host.append(btn);
  }
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
  ($('graft-do') as HTMLButtonElement).focus();
}

/** Walking out with it. Nothing is spent, so he is owed the same room again. */
export function closeGraft(): void {
  relic = null;
  room = null;
  piece = null;
  line = null;
  $('graft').hidden = true;
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
  };
}
