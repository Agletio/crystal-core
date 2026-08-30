/**
 * Character select: the first screen of a new game.
 *
 * A trade is not a thing you acquire any more — it is WHO YOU ARE, chosen
 * before anything else, and the body standing here is the body you play. So
 * the screen is the cast standing in the rock rather than a list of cards:
 * you walk up to one, it tells you who it is, and taking it is the game
 * starting.
 *
 * Every figure plays its own idle off `GENERATED`, drawn to a canvas rather
 * than through the icon machinery — an icon is one frame, and a room of
 * statues reads as a menu.
 */
import { ATTRIBUTES, SKILL_BY_ID, TRADE } from '../data';
import { TRADES, TRADE_BY_ID } from '../trades';
import { GENERATED } from '../render/generated-art';
import { HERO_SPRITE } from '../sim/appearance';
import { IDLE_CYCLE } from '../render/sprites';
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
let ticking: ReturnType<typeof setInterval> | undefined;

/** Which body a trade stands as. Neither trade needs one to be pickable, so a
 *  trade with no look of its own stands as the base man rather than as a gap. */
const bodyOf = (trade: BuiltTrade): string => {
  const own = trade.spec.sprite;
  return own && GENERATED[own] ? own : HERO_SPRITE;
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
  const art = GENERATED[sprite];
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (const at of idleRun(sprite)) {
    const rows = art?.frames[Math.min(at, (art?.frames.length ?? 1) - 1)] ?? [];
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (!art?.key[row[x]]) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    });
  }
  const grid = art?.grid ?? 48;
  const box: Bounds =
    x1 < 0 ? { x: 0, y: 0, w: grid, h: grid } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  boxes.set(sprite, box);
  return box;
}

/** One frame of a generated body onto a canvas the size of its ink. The canvas
 *  is those PIXELS and CSS blows it up, so the browser's nearest-neighbour is
 *  what magnifies it and no pixel is resampled twice. */
function paint(canvas: HTMLCanvasElement, sprite: string, frame: number): void {
  const art = GENERATED[sprite];
  if (!art) return;
  const rows = art.frames[Math.min(frame, art.frames.length - 1)];
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

/** The idle run, or the first frame for a body that has no idle of its own. */
const idleRun = (sprite: string): number[] => GENERATED[sprite]?.states.idle ?? [0];

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

/** Every figure breathes off ONE clock, so the room is not a dozen timers. */
function tick(): void {
  const at = performance.now() / 1000;
  for (const canvas of document.querySelectorAll<HTMLCanvasElement>('.pickfig__body')) {
    const sprite = canvas.dataset.sprite ?? '';
    const run = idleRun(sprite);
    paint(canvas, sprite, run[Math.floor(at * IDLE_CYCLE) % run.length]);
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
  const box = $('pick-say');
  box.replaceChildren();
  box.hidden = true;
  tick();
}

export function closePick(): void {
  hideTooltip();
  $('pick').hidden = true;
  globalThis.clearInterval(ticking);
  ticking = undefined;
}

/** Shows on a character that has not been made yet. A save from before the
 *  trade WAS the character has none, so it comes up once for those too — the
 *  points are refunded and re-walked by `heal()` either way. */
export function maybeShowPick(): boolean {
  if (game.character.trade) return false;
  render();
  $('pick').hidden = false;
  globalThis.clearInterval(ticking);
  ticking = globalThis.setInterval(tick, 1000 / 8);
  return true;
}

export function initPick(state: GameState, chosen: () => void): void {
  game = state;
  onChosen = chosen;
}
