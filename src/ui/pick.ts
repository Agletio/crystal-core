/**
 * Character select: the first screen of a new game.
 *
 * A trade is WHO YOU ARE, chosen before anything else, so the screen is the
 * cast standing in the rock rather than a list of cards: you walk up to one, it
 * tells you who it is, and taking it is the game starting.
 *
 * Every figure is ONE PICTURE, `GENERATED_CAST`, drawn at 128 where a body is
 * 48: this is the only screen that shows a man at four times his ship size, so
 * it shows a drawing made for it rather than his floor sprite magnified. The
 * idle breath went with it — *"the idle thing honestly looks bad"*.
 */
import { ATTRIBUTES, SKILL_BY_ID, TRADE } from '../data';
import { TRADES, TRADE_BY_ID } from '../trades';
import { GENERATED_CAST } from '../render/generated-cast';
import { HERO_SPRITE } from '../sim/appearance';
import { equipSkill, takeUpTrade } from '../sim/character';
import { attachTooltip, hideTooltip } from './tooltip';
import { skillCard } from './skills';
import type { BuiltTrade } from '../trades';
import type { GameState } from '../game/state';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let game: GameState;
let onChosen: (() => void) | null = null;
/** Which picture a trade stands as. A trade with no cast art of its own stands
 *  as the base man rather than as a gap. */
const bodyOf = (trade: BuiltTrade): string => {
  const own = trade.spec.sprite;
  return own && GENERATED_CAST[own] ? own : HERO_SPRITE;
};

// ---------------------------------------------------------------------------
// A body, standing and breathing
// ---------------------------------------------------------------------------

interface Bounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The box the body's ink actually fills, over the WHOLE idle run. A generated
 * grid is sized to the widest frame of every state, so a standing body is a
 * third of it and drawing the grid puts a small man in a large empty square.
 *
 * Over the whole run rather than per frame, or the crop moves with the breath
 * and the figure jitters where it stands.
 */
const boxes = new Map<string, Bounds>();
function inkOf(sprite: string): Bounds {
  const held = boxes.get(sprite);
  if (held) return held;
  const art = GENERATED_CAST[sprite];
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  (art?.rows ?? []).forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!art?.key[row[x]]) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  });
  const grid = art?.grid ?? 128;
  const box: Bounds =
    x1 < 0 ? { x: 0, y: 0, w: grid, h: grid } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  boxes.set(sprite, box);
  return box;
}

/** Onto a canvas the size of its own ink, which CSS then blows up — so the
 *  browser's nearest-neighbour magnifies it and nothing resamples twice. */
function paint(canvas: HTMLCanvasElement, sprite: string): void {
  const art = GENERATED_CAST[sprite];
  if (!art) return;
  const rows = art.rows;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const box = inkOf(sprite);
  ctx.clearRect(0, 0, box.w, box.h);
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ink = art.key[row[x]];
      if (!ink) continue;
      ctx.fillStyle = ink;
      ctx.fillRect(x - box.x, y - box.y, 1, 1);
    }
  });
}

const ROOM = { share: 0.34, least: 170, most: 260 }; // how tall a figure may stand, CSS px
/** Magnified by a WHOLE number, never less: a fractional scale draws one row a
 *  step wider than the next. ONE now the art is 128 rather than a 48 body. */
const LEAST_SCALE = 1;

function fit(): void {
  const room = Math.min(ROOM.most, Math.max(ROOM.least, window.innerHeight * ROOM.share));
  for (const canvas of document.querySelectorAll<HTMLCanvasElement>('.pickfig__body')) {
    const scale = Math.max(LEAST_SCALE, Math.floor(room / canvas.height));
    canvas.style.width = `${canvas.width * scale}px`;
    canvas.style.height = `${canvas.height * scale}px`;
  }
}

function figure(trade: BuiltTrade): HTMLElement {
  const sprite = bodyOf(trade);
  const stand = el('button', 'pickfig') as HTMLButtonElement;
  stand.id = `pick-${trade.spec.id}`;
  stand.type = 'button';

  const canvas = document.createElement('canvas');
  canvas.className = 'pickfig__body';
  const box = inkOf(sprite);
  canvas.width = box.w;
  canvas.height = box.h;
  canvas.dataset.sprite = sprite;
  stand.append(canvas);
  stand.append(el('span', 'pickfig__name', trade.spec.name));

  stand.onclick = () => look(trade.spec.id);
  return stand;
}

/** Once, when the room is built: a picture does not need a clock. */
function tick(): void {
  for (const canvas of document.querySelectorAll<HTMLCanvasElement>('.pickfig__body')) {
    paint(canvas, canvas.dataset.sprite ?? '');
  }
}

// ---------------------------------------------------------------------------
// What one of them is
// ---------------------------------------------------------------------------

/** The tree in one line per spoke: five roads, named, which is what a player
 *  reads a trade by before they have walked any of it. */
function roads(trade: BuiltTrade): HTMLElement {
  const list = el('div', 'pickroads');
  for (const spoke of trade.spec.spokes) list.append(el('span', 'pickroads__one', spoke.theme));
  return list;
}

function look(tradeId: string): void {
  const trade = TRADES.find((t) => t.spec.id === tradeId);
  if (!trade) return;

  for (const node of document.querySelectorAll('.pickfig'))
    node.classList.toggle('pickfig--on', node.id === `pick-${tradeId}`);

  const box = $('pick-say');
  box.replaceChildren();
  box.append(el('h3', 'picksay__name', trade.spec.name));
  box.append(el('p', 'picksay__lore', trade.spec.lore));
  box.append(el('p', 'picksay__rule', trade.spec.blurb));
  // WHAT IT GIVES FOR NOTHING, loosely: the figures are the web's middle.
  const free = el('p', 'picksay__free');
  free.append(el('span', 'picksay__freelabel', 'Comes with: '));
  free.append(el('span', 'picksay__freesaid', trade.spec.baseline.short));
  box.append(free);
  // HIS SPREAD, highest first. A trade's attributes are the trade's, so what
  // separates two of them in the first hour is on the card you pick off.
  const spread = el('p', 'picksay__free');
  spread.append(el('span', 'picksay__freelabel', 'Attributes: '));
  spread.append(el('span', 'picksay__freesaid', ATTRIBUTES
    .map((a) => [a, trade.spec.attributes[a.id] ?? 0] as const)
    .sort((x, y) => y[1] - x[1])
    .map(([a, n]) => `${a.name} ${n}`)
    .join(' · ')));
  box.append(spread);
  // What he comes down holding, NAMED — and the card is the same one the
  // Skills screen raises, so the description is written in one place.
  const opens = SKILL_BY_ID[trade.spec.skill];
  if (opens) {
    const line = el('p', 'picksay__arms');
    line.append(el('span', 'picksay__armslabel', 'Starting Skill: '));
    line.append(el('span', 'picksay__armsname', opens.name));
    attachTooltip(line, () => skillCard(opens));
    box.append(line);
  }
  box.append(roads(trade));
  box.append(
    el(
      'p',
      'picksay__cost',
      `${TRADE.maxPoints} points, ${TRADE.pointsPerGrant} at a time from level ` +
        `${TRADE.firstAt} — a notable is always ${TRADE.pointsPerGrant} away, so ` +
        'every pair finishes one and the last pair finishes a branch.'
    )
  );

  const take = el('button', 'mini mini--go', `Play the ${trade.spec.name}`) as HTMLButtonElement;
  take.id = 'pick-take';
  take.onclick = () => choose(tradeId);
  box.append(take);
  box.hidden = false;
}

/** A trade comes with a way to FIGHT. Here rather than in `takeUpTrade`, which
 *  a later trade CHANGE also runs — that must not swap what you are swinging. */
function choose(tradeId: string): void {
  if (!takeUpTrade(game.character, tradeId)) return;
  const skill = TRADE_BY_ID[tradeId]?.spec.skill;
  if (skill) equipSkill(game.character, skill);
  closePick();
  onChosen?.();
}

// ---------------------------------------------------------------------------
// The screen
// ---------------------------------------------------------------------------

function render(): void {
  const host = $('pick-cast');
  host.replaceChildren();
  // Nothing is spent yet, so nothing is greyed out: a level gate on the screen
  // a character is MADE on would be a choice you cannot make.
  for (const trade of TRADES) host.append(figure(trade));
  fit();
  const box = $('pick-say');
  box.replaceChildren();
  box.hidden = true;
  tick();
}

export function closePick(): void {
  hideTooltip();
  $('pick').hidden = true;
}

/** Shows on a character that has not been made yet. A save from before the
 *  trade WAS the character has none, so it comes up once for those too — the
 *  points are refunded and re-walked by `heal()` either way. */
export function maybeShowPick(): boolean {
  if (game.character.trade) return false;
  render();
  $('pick').hidden = false;
  return true;
}

export function initPick(state: GameState, chosen: () => void): void {
  game = state;
  onChosen = chosen;
  window.addEventListener('resize', fit);
}
