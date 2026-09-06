/**
 * THE CLIMB, inside the Fissure window. *"I want it to be obvious as to your
 * progression and what you've cleared so when you inevitably do fail you can
 * manually go back a level or 2 and grind and then continue later."*
 *
 * ONE ZONE AT A TIME, on a TAB — *"make it where its like actually map art of a
 * caven you're progressing down and do one zone at a time so only show fissure
 * and have different tabs for each zone"*. The zone's own generated cross-
 * section is the ground and the rungs descend across it, so where you are is a
 * place rather than a number. A cleared rung stays clickable for the rest of
 * that character's life, so going back two and grinding is one click.
 *
 * The pick lives HERE and not in the save: it is clamped against `canEnter` on
 * every read, so swapping character or reloading points you at the deepest
 * thing you may enter rather than at somebody else's rung.
 */
import {
  BRANCH_BONUS_BY_ID, CRYSTAL_LEVELS, LADDER, THEME_BY_ID,
} from '../data';
import { folkRooms, hasHeard } from '../game/scenes';
import type { SceneDef } from '../scenes';
import { FOLK_SCALE_DEFAULT, scaleFor } from '../scenes';
import { GENERATED } from '../render/generated-art';
import { heroSpriteFor } from '../sim/appearance';
import { drawBody } from './bodydraw';
import { drawn } from './icons';
import { openTalk, closeParley, syncTalk } from './talk';
import { isTaleUp, playTale } from './tale';
import {
  canEnter, climbed, courseOf, depthOfId, depthOfSide, furthest, isCleared,
  linksIn, nodeSpot, sideAt, sideRooms, zoneAt, zoneOpen,
} from '../ladder';
import type { Rung, RunWhere } from '../ladder';
import type { RunSet } from '../sim/crystal';
import { SCENE_ART } from '../render/generated-scene';
import type { MapTheme } from '../types';
import type { GameState } from '../game/state';

import type { Character } from '../sim/character';
import { attachTooltip } from './tooltip';

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let chosen: Rung | null = null;
/** The tab you are looking at, null until you click one: left alone it follows
 *  the rung you are pointed at, so a clear opens the zone above and shows it. */
let shown: number | null = null;
/** THE BONUS ZONES START HERE: one tab a room, in `folkRooms` order, and they
 *  only exist once you have found the man who lives in one. */
export const ROOM_TAB = LADDER.zones.length;

/** THE ROOM ON SCREEN, if the tab up is a bonus zone. Nothing descends from
 *  one, so the way in is hidden while it is. */
export function roomNow(): SceneDef | null {
  if (!game || shown === null || shown < ROOM_TAB) return null;
  return folkRooms(game)[shown - ROOM_TAB] ?? null;
}

/** WHERE THE NEXT DESCENT GOES. */
export function whereNow(character: Character): RunWhere {
  if (chosen && canEnter(character, chosen)) return chosen;
  return furthest(character);
}

export const rungNow = (character: Character): Rung | null => whereNow(character);

/** ADVANCE: forget the rung you picked, so the next descent takes the deepest
 *  one open. The clear that calls this has just recorded the rung, so
 *  `furthest` has already moved — there is no second idea of "next". */
export function advanceRung(): void {
  chosen = null;
}

export function pickRung(character: Character, at: Rung): boolean {
  if (!canEnter(character, at)) return false;
  chosen = at;
  return true;
}

/** WHERE A DESCENT WENT, named: what it IS rather than what is picked. */
export const rungName = (at: RunWhere): string => {
  const where = zoneAt(at.zone)?.name ?? '?';
  const side = sideAt(at);
  // A SIDE ROOM IS NAMED FOR ITSELF and says the depth it stands at, since
  // that is its danger and a report has to say what it ran at.
  return side
    ? `${where}, ${side.name} — depth ${at.rung} off the line`
    : `${where}, depth ${at.rung}`;
};

/** The report's line about the climb: what a clear opened, or where a death
 *  leaves you. The report is the one screen every descent ends on. */
export function climbLine(
  character: Character,
  at: RunWhere | null,
  cleared: boolean
): string | null {
  const zone = at ? zoneAt(at.zone) : null;
  if (!at || !zone) return null;
  const name = zone.name;
  const done = Math.min(zone.rungs, climbed(character, at.zone));
  if (!cleared) {
    return `${name}, depth ${at.rung}. ${done} of ${zone.rungs} cleared — drop back a depth or two and grind if you need to.`;
  }
  if (at.rung < zone.rungs) return `${name}, depth ${at.rung} cleared. Depth ${at.rung + 1} is open.`;
  const after = zoneAt(at.zone + 1);
  if (!after) return `${name}, depth ${at.rung} cleared. That is the whole climb.`;
  return `${name} is finished. ${after.name} is open.`;
}

/** What a shut zone is waiting on: the one below it, by name. */
const shutBy = (zone: number): string => {
  const before = zoneAt(zone - 1);
  return before?.name ?? 'the zone below';
};

interface Spot {
  x: number; // percent across the picture
  y: number; // percent down it
}

interface Station extends Spot {
  rung: number;
}

/** THE DESCENT FOLLOWS THE PICTURE. `LadderZoneDef.path` is that zone's own
 *  course through its cross-section, traced off the art's own floors; the
 *  depths are spread along it at even ARC LENGTH and THE DRAWN LINE IS THE
 *  COURSE ITSELF, not a curve through the pips — twelve points across a
 *  zigzag cut every corner and ran the seam through solid rock. A zone with no
 *  path falls back to the diagonal, which crosses whatever the picture put
 *  there. */
const PLAIN: [number, number][] = [[7, 14], [93, 84]];

function stations(rungs: number, path?: [number, number][]): Station[] {
  const line = courseOf(path);
  return Array.from({ length: rungs }, (_, i) => ({
    rung: i + 1,
    ...line.at(rungs === 1 ? 0 : i / (rungs - 1)),
  }));
}

/** A LINE, ROUNDED ONLY AT ITS CORNERS. A quadratic through every leg's
 *  midpoint bows a two-leg path into one arc; a fixed radius keeps each leg
 *  straight and turns only where the cave does — *"more straight through the
 *  cavern and arching at the entrances only."* The radius is clamped to half
 *  the shorter leg, so a short jog rounds off rather than overshooting. */
const BEND = 2.4; // percent of the picture

function seamPath(from: Spot[]): string {
  if (from.length === 0) return '';
  const at = (a: Spot, b: Spot, far: number): Spot => {
    const run = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const k = Math.min(far, run / 2) / run;
    return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
  };
  const say = (p: Spot) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  let d = `M ${say(from[0])}`;
  for (let i = 1; i < from.length - 1; i++) {
    const into = at(from[i], from[i - 1], BEND);
    const out = at(from[i], from[i + 1], BEND);
    d += ` L ${say(into)} Q ${say(from[i])} ${say(out)}`;
  }
  d += ` L ${say(from[from.length - 1])}`;
  return d;
}

/** BOTH MOUTHS AT ONCE: a portal's other end is the only thing a player needs
 *  told, and it is not near enough to point at. */
function litPortal(pair: string, on: boolean): void {
  for (const mouth of document.querySelectorAll(`[data-pair="${pair}"]`)) {
    mouth.classList.toggle('portal--on', on);
  }
}

/** A spur is drawn TWICE: a dark casing, then the dash over it. One hairline
 *  on a lit cave floor is the same value as the floor. */
function drawSpur(svg: SVGElement, d: string): void {
  svg.append(svgEl('path', { class: 'climbseam__casing', d }));
  svg.append(svgEl('path', { class: 'climbseam__side', d }));
}

const svgEl = (tag: string, attrs: Record<string, string>): SVGElement => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
};

let game: GameState | null = null;

export function initClimb(state: GameState): void {
  game = state;
}

/** WHAT A NODE IS, IN THREE LINES: what it is called, what it drops, and what
 *  it pays. A shut one says the one thing you can do about it. */
function nodeCard(name: string, at: Rung, open: boolean): string {
  const set = runOf ? runOf(at) : null;
  const pays = BRANCH_BONUS_BY_ID[sideAt(at)?.bonus ?? ''];
  return [
    open ? name : `${name} — Locked, clear a connected area first`,
    set ? `ilvl: ${set.band.ilvl}` : '',
    pays?.say ?? '',
  ].filter(Boolean).join('\n');
}

/** WHAT A DESCENT THERE WOULD BE. `run.ts` knows what is socketed; this only
 *  asks, so the item level a card prints is the one the floor would drop. */
let runOf: ((at: RunWhere) => RunSet) | null = null;

export function setsInClimb(of: (at: RunWhere) => RunSet): void {
  runOf = of;
}

/** A tab per zone, shut ones included: a place you cannot reach yet is worth
 *  knowing about. The bonus rooms follow them. */
function tabs(host: HTMLElement, character: Character, at: number, redraw: () => void): void {
  const row = el('div', 'climbtabs');
  LADDER.zones.forEach((zone, z) => {
    const open = zoneOpen(character, z);
    const done = Math.min(zone.rungs, climbed(character, z));
    const tab = el('button', 'mini climbtab', zone.name) as HTMLButtonElement;
    tab.id = `climb-tab-${z}`;
    tab.classList.toggle('climbtab--on', z === at);
    tab.classList.toggle('climbtab--shut', !open);
    tab.disabled = !open;
    tab.append(el('span', 'climbtab__done', ` ${done}/${zone.rungs}`));
    attachTooltip(tab, () =>
      open ? `${zone.name}. ${zone.blurb}` : `Shut until ${shutBy(z)} is cleared whole.`);
    tab.onclick = () => {
      shown = z;
      closeParley();
      redraw();
    };
    row.append(tab);
  });

  // THE BONUS ZONES, past the climb and off the line: a room apiece, and one
  // only exists once you have found the man who lives in it.
  folkRooms(game!).forEach((def, i) => {
    const bonus = el('button', 'mini climbtab climbtab--room', def.room!.name) as HTMLButtonElement;
    bonus.id = `climb-tab-room-${def.id}`;
    bonus.classList.toggle('climbtab--on', at === ROOM_TAB + i);
    attachTooltip(bonus, () => `${def.room!.name}. ${def.room!.blurb}`);
    bonus.onclick = () => {
      shown = ROOM_TAB + i;
      closeParley();
      redraw();
    };
    row.append(bonus);
  });
  host.append(row);
}

/**
 * A ROOM OFF THE FISSURE SCREEN — his own drawn picture, him standing in it
 * and you a few paces off, and clicking him is the same parley the camp runs.
 * *"Then in there you can talk to him and give him corpses and leave whenever
 * you want."* Leaving is any other tab, or the window's own Close.
 */
function renderRoom(host: HTMLElement, def: SceneDef, character: Character): void {
  const spec = def.room!;
  const art = SCENE_ART[spec.art];
  const floor = el('div', 'climbseam climbroom');
  if (art) floor.style.backgroundImage = `url(${art.png})`;

  const canvas = document.createElement('canvas');
  canvas.className = 'climbroom__live';
  canvas.width = art?.w ?? 688;
  canvas.height = art?.h ?? 384;
  floor.append(canvas);

  // HIS BODY IS THE HOTSPOT, the way it is in the camp: the button is his own
  // grid where his body was drawn, in PERCENT so it cannot drift off him.
  const grid = (GENERATED[def.who]?.grid ?? 32) * scaleFor(def.who);
  const hot = el('button', 'camp__hot') as HTMLButtonElement;
  hot.id = `climb-room-who-${def.id}`;
  hot.setAttribute('aria-label', def.name);
  hot.style.left = `${((spec.stands.x - grid / 2) / canvas.width) * 100}%`;
  hot.style.top = `${((spec.stands.y - grid) / canvas.height) * 100}%`;
  hot.style.width = `${(grid / canvas.width) * 100}%`;
  hot.style.height = `${(grid / canvas.height) * 100}%`;
  attachTooltip(hot, () => `${def.name}. ${def.said}`);
  hot.onclick = () => openTalk(def, hot.getBoundingClientRect());
  floor.append(hot);
  host.append(floor);

  const ctx = canvas.getContext?.('2d') ?? null;
  if (!ctx) return; // jsdom has none: the picture and the hotspot still stand
  const hero = heroSpriteFor(character);
  const started = performance.now();
  const frame = (now: number): void => {
    if (!canvas.isConnected) return;
    const at = (now - started) / 1000;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBody(ctx, def.who, spec.stands.x, spec.stands.y, at, 0, hot.matches(':hover'), scaleFor(def.who));
    drawBody(ctx, hero, spec.you.x, spec.you.y, at, 1.3, false, FOLK_SCALE_DEFAULT);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/**
 * THE CLIMB, drawn as the descent it is: one zone's cross-section, a seam
 * winding down it, and a station on every rung. The seam behind you is LIT and
 * the seam ahead is not, so how far you have come is the picture.
 */
export function renderClimb(host: HTMLElement, character: Character, onPick: () => void): void {
  host.replaceChildren();
  const rooms = game ? folkRooms(game) : [];
  const gone = shown === null
    || (shown >= ROOM_TAB && !rooms[shown - ROOM_TAB])
    || (shown < ROOM_TAB && !zoneOpen(character, shown));
  if (gone) shown = furthest(character).zone;
  const z = shown!;
  const at = whereNow(character);

  // THE MAP IS THE SCREEN AND NOTHING IS WRITTEN OVER IT. The window already
  // says THE FISSURE; a title, a depth count and the campaign's own line under
  // it said the same thing three more times and took the picture's room.
  // A TAB IS A RE-RENDER OF THE WHOLE SCREEN, not of the map alone: the way
  // in is hidden in a room and shown everywhere else, and that is the caller's.
  tabs(host, character, z, () => {
    renderClimb(host, character, onPick);
    onPick();
  });

  // A BONUS ZONE: his room, and his TALE the first time you walk into it.
  const room = z >= ROOM_TAB ? rooms[z - ROOM_TAB] : null;
  if (room) {
    renderRoom(host, room, character);
    if (game && !hasHeard(game, room.id) && !isTaleUp()) playTale(game, room.id, () => {});
    return;
  }

  const zone = LADDER.zones[z];
  const all = stations(zone.rungs, zone.path);
  const cleared = Math.min(zone.rungs, climbed(character, z));
  const trail = el('div', 'climbseam');
  // The zone's own generated cross-section, or the bare panel until one is
  // drawn for it — a missing picture may not take the rungs with it.
  const art = zone.art ? SCENE_ART[zone.art] : null;
  if (art) trail.style.backgroundImage = `url(${art.png})`;

  const svg = svgEl('svg', {
    class: 'climbseam__line',
    viewBox: '0 0 100 100',
    preserveAspectRatio: 'none',
  });
  const line = courseOf(zone.path);
  // THE TRUNK IS THE STRONGEST LINE ON THE SCREEN. It carries the branches'
  // own dark casing so it reads off a lit floor, and it is SOLID where they
  // are dashed — the main way down against the ways round it.
  svg.append(svgEl('path', { class: 'climbseam__casing', d: seamPath(line.way) }));
  svg.append(svgEl('path', { class: 'climbseam__rock', d: seamPath(line.way) }));
  if (cleared > 0) {
    const far = zone.rungs === 1 ? 0 : (cleared - 1) / (zone.rungs - 1);
    svg.append(svgEl('path', { class: 'climbseam__lit', d: seamPath(line.upTo(far)) }));
  }
  trail.append(svg);

  // THE LINKS FIRST, so a pip sits on top of every line that reaches it. A
  // link carries its own traced course where the picture joins two chambers,
  // and is drawn straight where it does not — a hop through the rock.
  for (const link of linksIn(z)) {
    const from = nodeSpot(z, link.from), to = nodeSpot(z, link.to);
    if (!from || !to) continue;
    if (depthOfId(link.from) !== null && depthOfId(link.to) !== null) continue;
    // NOTHING IS DRAWN BETWEEN TWO MOUTHS — the hover lights the pair, and a
    // line across the picture would claim the two chambers touch. Each mouth
    // gets a STUB to its own room instead, so which room it belongs to reads.
    if (link.portal) {
      link.portal.forEach(([x, y], end) => {
        const at = end === 0 ? from : to;
        drawSpur(svg, seamPath([at, { x, y }]));
        const mouth = el('div', 'portal');
        mouth.id = `climb-portal-${z}-${link.from}-${link.to}-${end}`;
        mouth.dataset.pair = `${z}-${link.from}-${link.to}`;
        mouth.style.left = `${x}%`;
        mouth.style.top = `${y}%`;
        const art = drawn(zone.portalArt ?? 'portal_ring', 26);
        if (art) mouth.append(art);
        mouth.onpointerenter = () => litPortal(mouth.dataset.pair!, true);
        mouth.onpointerleave = () => litPortal(mouth.dataset.pair!, false);
        attachTooltip(mouth, () => `A way through ${zone.name}.`);
        trail.append(mouth);
      });
      continue;
    }
    drawSpur(svg, seamPath(link.path ? link.path.map(([x, y]) => ({ x, y })) : [from, to]));
  }

  for (const station of all) {
    const here = { zone: z, rung: station.rung };
    const can = canEnter(character, here);
    const boss = station.rung === zone.rungs;

    const pip = el('button', 'pip', String(station.rung)) as HTMLButtonElement;
    pip.id = `climb-pip-${z}-${station.rung}`;
    pip.style.left = `${station.x}%`;
    pip.style.top = `${station.y}%`;
    pip.classList.toggle('pip--boss', boss);
    pip.classList.toggle('pip--done', station.rung <= cleared);
    pip.classList.toggle('pip--next', can && station.rung > cleared);
    pip.classList.toggle('pip--shut', !can);
    pip.classList.toggle('pip--here',
      at.zone === z && at.rung === station.rung && !at.side);
    pip.disabled = !can;

    attachTooltip(pip, () =>
      nodeCard(`Depth ${station.rung}`, here, can) + (boss ? '\nThe boss.' : ''));
    pip.onclick = () => {
      if (pickRung(character, here)) onPick();
    };
    trail.append(pip);
  }

  // THE SIDE ROOMS. Each is a node on the map rather than a spur off a depth:
  // clearing one opens whatever it touches, so a run of them arrives at a
  // depth you never climbed to — and your LEVEL is still the deepest depth.
  for (const room of sideRooms(z)) {
    const depth = depthOfSide(z, room.id);
    const here = { zone: z, rung: depth, side: room.id };
    const can = canEnter(character, here);
    const pays = BRANCH_BONUS_BY_ID[room.bonus];

    const pip = el('button', 'pip pip--side') as HTMLButtonElement;
    pip.append(drawn(pays?.icon ?? '', 22) ?? document.createTextNode(room.name[4] ?? '?'));
    pip.id = `climb-side-${z}-${room.id}`;
    pip.style.left = `${room.x}%`;
    pip.style.top = `${room.y}%`;
    pip.classList.toggle('pip--done', isCleared(character, z, room.id));
    pip.classList.toggle('pip--shut', !can);
    pip.classList.toggle('pip--here', at.zone === z && at.side === room.id);
    pip.disabled = !can;
    attachTooltip(pip, () => nodeCard(room.name, here, can));
    pip.onclick = () => {
      if (pickRung(character, here)) onPick();
    };
    trail.append(pip);
  }

  host.append(trail);
}
