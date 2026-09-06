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
  BRANCH_BONUS_BY_ID, CRYSTAL_LEVELS, LADDER, PROVING, PROVING_BRANCH_BY_ID, THEME_BY_ID,
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
  branchAt, branchLabel, branchesAt, canEnter, climbed, furthest, isProving, provingOpen, zoneAt, zoneOpen,
} from '../ladder';
import type { Proving, Rung, RunWhere } from '../ladder';
import { SCENE_ART } from '../render/generated-scene';
import type { MapTheme } from '../types';
import type { GameState } from '../game/state';

/** WHAT THE PROVING GROUND LOOKS LIKE: the influence's own act, since each of
 *  the three cross-sections already IS one of the three worlds. */
const GROUND_ART: Record<string, string> = {
  fissure: 'climb_act1', prismatic: 'climb_act2', demonic: 'climb_act3',
  // THE SEAM has no cross-section of its own yet, so it borrows the deepest
  // one drawn rather than the bare panel: the last world reading as nothing.
  seam: 'climb_act3',
};
import type { Character } from '../sim/character';
import { attachTooltip } from './tooltip';

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let chosen: Rung | null = null;
/** THE PROVING GROUND is picked instead of a depth, so it is its own flag: a
 *  place is not a rung and could never be one. `area` is which SIDE AREA off
 *  it, if any — its own world and one bonus, at the same difficulty. */
let ground = false;
let area: string | null = null;
/** The tab you are looking at, null until you click one: left alone it follows
 *  the rung you are pointed at, so a clear opens the zone above and shows it.
 *  `PROVING_TAB` is the fourth, past every zone. */
let shown: number | null = null;
export const PROVING_TAB = LADDER.zones.length;
/** THE BONUS ZONES START HERE: one tab a room, in `folkRooms` order, and they
 *  only exist once you have found the man who lives in one. */
export const ROOM_TAB = PROVING_TAB + 1;

/** THE ROOM ON SCREEN, if the tab up is a bonus zone. Nothing descends from
 *  one, so the way in is hidden while it is. */
export function roomNow(): SceneDef | null {
  if (!game || shown === null || shown < ROOM_TAB) return null;
  return folkRooms(game)[shown - ROOM_TAB] ?? null;
}

/** WHERE THE NEXT DESCENT GOES: a depth on the climb, or the Proving Ground. */
export function whereNow(character: Character): RunWhere {
  if (ground && provingOpen(character)) {
    return { proving: true, influence: influenceNow(), ...(area ? { branch: area } : {}) };
  }
  if (chosen && canEnter(character, chosen)) return chosen;
  return furthest(character);
}

/** The depth it goes to, or null in the Proving Ground, which is not one. */
export function rungNow(character: Character): Rung | null {
  const at = whereNow(character);
  return isProving(at) ? null : at;
}

/** ADVANCE: forget the rung you picked, so the next descent takes the deepest
 *  one open. The clear that calls this has just recorded the rung, so
 *  `furthest` has already moved — there is no second idea of "next". */
export function advanceRung(): void {
  chosen = null;
}

export function pickRung(character: Character, at: Rung): boolean {
  if (!canEnter(character, at)) return false;
  chosen = at;
  ground = false;
  area = null;
  return true;
}

/** WHERE A DESCENT WENT, named: what it IS rather than what is picked. `theme`
 *  is the world the RUN got, which is not always the influence — THE SEAM
 *  overrides it, and naming the preference there was a heading that lied. */
export const rungName = (at: RunWhere, theme?: MapTheme): string => {
  if (isProving(at)) return `${PROVING.name}, ${provingWorld(at, theme)}`;
  const where = zoneAt(at.zone)?.name ?? '?';
  const side = branchAt(at);
  // A BRANCH IS NAMED FOR ITSELF and says which depth it hangs off, since its
  // danger is that depth's and a report has to say what it ran at.
  return side
    ? `${where}, ${side.name} — off depth ${at.rung}`
    : `${where}, depth ${at.rung}`;
};

export const provingWorld = (at: Proving, theme?: MapTheme): string => {
  const world = theme ?? PROVING_BRANCH_BY_ID[at.branch ?? '']?.world ?? at.influence;
  const said = THEME_BY_ID[world]?.name ?? world;
  const side = PROVING_BRANCH_BY_ID[at.branch ?? ''];
  return side ? `${side.name} — ${said}` : said;
};

/** The report's line about the climb: what a clear opened, or where a death
 *  leaves you. The report is the one screen every descent ends on. */
export function climbLine(
  character: Character,
  at: RunWhere | null,
  cleared: boolean
): string | null {
  if (isProving(at)) {
    return cleared
      ? `${rungName(at)} cleared. It does not end, and nothing about it changes.`
      : `${rungName(at)}. Nothing is lost but the run — take a crystal out if it is too much.`;
  }
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

/** A course walked by arc length: `at` is the point a fraction along it, `upTo`
 *  the run of it up to there. */
function course(path?: [number, number][]) {
  const way = path && path.length >= 2 ? path : PLAIN;
  const legs = way.slice(1).map((to, i) => Math.hypot(to[0] - way[i][0], to[1] - way[i][1]));
  const whole = legs.reduce((n, d) => n + d, 0) || 1;
  const step = (t: number): { leg: number; k: number } => {
    let left = t * whole;
    for (let i = 0; i < legs.length; i++) {
      if (left <= legs[i] || i === legs.length - 1) {
        return { leg: i, k: legs[i] === 0 ? 0 : Math.min(1, left / legs[i]) };
      }
      left -= legs[i];
    }
    return { leg: legs.length - 1, k: 1 };
  };
  const at = (t: number): Spot => {
    const { leg, k } = step(t);
    return {
      x: way[leg][0] + (way[leg + 1][0] - way[leg][0]) * k,
      y: way[leg][1] + (way[leg + 1][1] - way[leg][1]) * k,
    };
  };
  const upTo = (t: number): Spot[] => {
    const { leg } = step(t);
    return [...way.slice(0, leg + 1).map(([x, y]) => ({ x, y })), at(t)];
  };
  return { way: way.map(([x, y]) => ({ x, y })), at, upTo };
}

function stations(rungs: number, path?: [number, number][]): Station[] {
  const line = course(path);
  return Array.from({ length: rungs }, (_, i) => ({
    rung: i + 1,
    ...line.at(rungs === 1 ? 0 : i / (rungs - 1)),
  }));
}

/** A smooth line through them: each pair meets at their midpoint, which is the
 *  cheapest curve that never overshoots a station. */
function seamPath(from: Spot[]): string {
  if (from.length === 0) return '';
  let d = `M ${from[0].x.toFixed(1)} ${from[0].y.toFixed(1)}`;
  for (let i = 1; i < from.length; i++) {
    const mid = { x: (from[i - 1].x + from[i].x) / 2, y: (from[i - 1].y + from[i].y) / 2 };
    d += ` Q ${from[i - 1].x.toFixed(1)} ${from[i - 1].y.toFixed(1)} ${mid.x.toFixed(1)} ${mid.y.toFixed(1)}`;
  }
  const last = from[from.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
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

/** THE INFLUENCE, which is the Proving Ground's alone. *"Have this zone allow
 *  you to select your influence… which will decide what the area looks like and
 *  add that type of mobs to the zone."* A PREFERENCE, so it is SAVED. */
let game: GameState | null = null;

export function initClimb(state: GameState): void {
  game = state;
}

export const influenceNow = (): MapTheme => {
  const held = game?.influence;
  return held && PROVING.influences.includes(held) ? held : PROVING.influences[0];
};

export function setInfluence(theme: MapTheme): void {
  if (game && PROVING.influences.includes(theme)) game.influence = theme;
}

/** Where the sockets are drawn, which is over the Proving Ground's own map and
 *  nowhere else. `run.ts` fills it; this only says where it goes. */
let sockets: ((host: HTMLElement) => void) | null = null;
/** Whether what is in the wall has opened the Seam. `run.ts` knows what is
 *  socketed; this only asks. */
let seamHere: (() => boolean) | null = null;

export function socketsInClimb(
  render: (host: HTMLElement) => void,
  seamOpen: () => boolean
): void {
  sockets = render;
  seamHere = seamOpen;
}

/** A tab per zone, shut ones included, and the Proving Ground past all three:
 *  four tabs is the whole shape of where a descent can go, and a place you
 *  cannot reach yet is worth knowing about. */
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
      open
        ? `${zone.name}. ${done} of ${zone.rungs} depths cleared. ${zone.blurb}`
        : `${zone.name}. Shut until ${shutBy(z)} is cleared whole.`);
    tab.onclick = () => {
      shown = z;
      closeParley();
      redraw();
    };
    row.append(tab);
  });

  const open = provingOpen(character);
  const tab = el('button', 'mini climbtab', PROVING.name) as HTMLButtonElement;
  tab.id = `climb-tab-${PROVING_TAB}`;
  tab.classList.toggle('climbtab--on', at === PROVING_TAB);
  tab.classList.toggle('climbtab--shut', !open);
  tab.disabled = !open;
  attachTooltip(tab, () =>
    open
      ? `${PROVING.name}. ${PROVING.blurb}`
      : `${PROVING.name}. Shut until the climb is finished and paid for.`);
  tab.onclick = () => {
    shown = PROVING_TAB;
    closeParley();
    redraw();
  };
  row.append(tab);

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

/** THE PROVING GROUND: the world you PICKED, drawn as that world's own
 *  cross-section, with the four sockets over it the way the camp's crack lays
 *  them out. There are no stations — it is one area, and it does not end. */
function renderProving(host: HTMLElement, character: Character, onPick: () => void): void {
  // THE SEAM OVERRIDES THE PICK, so the pick has to say so rather than lying
  // about where the next descent goes.
  const seam = seamHere?.() ?? false;
  const row = el('div', 'influences');
  for (const id of PROVING.influences) {
    const def = THEME_BY_ID[id];
    // THE SAME SELECTED TREATMENT AS EVERY OTHER TAB. Its own `influence--on`
    // lit the border and the ink but not the plate, so a hovered button and the
    // chosen one were two different lit states side by side.
    const button = el('button', 'mini climbtab', def?.name ?? id) as HTMLButtonElement;
    button.id = `climb-influence-${id}`;
    button.classList.toggle('climbtab--on', !seam && influenceNow() === id);
    button.classList.toggle('influence--over', seam);
    attachTooltip(button, () => `${def?.name ?? id}. ${def?.blurb ?? ''}`);
    button.onclick = () => {
      setInfluence(id);
      onPick();
    };
    row.append(button);
  }
  host.append(row);
  if (seam) {
    const said = THEME_BY_ID.seam;
    host.append(el('p', 'climb__prize', `${PROVING.seamOf} Prismatic and ` +
      `${PROVING.seamOf} Demonic at level ${CRYSTAL_LEVELS[CRYSTAL_LEVELS.length - 1].level} ` +
      `is ${said?.name ?? 'The Seam'}, and it takes the influence off you. ${said?.blurb ?? ''}`));
  }

  const trail = el('div', 'climbseam climbseam--ground');
  // THE PICTURE IS THE WORLD YOU WILL WALK INTO: a side area's own, since it
  // sets the world; otherwise the influence's, and the Seam beats both.
  const world = seam ? 'seam' : (PROVING_BRANCH_BY_ID[area ?? '']?.world ?? influenceNow());
  const art = SCENE_ART[GROUND_ART[world] ?? ''];
  if (art) trail.style.backgroundImage = `url(${art.png})`;
  const wall = el('div', 'groundsockets');
  sockets?.(wall);
  trail.append(wall);

  // THE SIDE AREAS, all at the Proving Ground's own difficulty and each its
  // own world. The plain area is the one in the middle: no branch, no bonus,
  // the influence you picked. Nothing here is climbed either.
  const svg = svgEl('svg', {
    class: 'climbseam__line', viewBox: '0 0 100 100', preserveAspectRatio: 'none',
  });
  const root = { x: 50, y: 62 };
  for (const side of PROVING.branches) {
    drawSpur(svg, seamPath([root, { x: side.x, y: side.y }]));
  }
  trail.append(svg);
  for (const side of PROVING.branches) {
    const pays = BRANCH_BONUS_BY_ID[side.bonus];
    const world = THEME_BY_ID[side.world];
    const pip = el('button', 'pip pip--side pip--area') as HTMLButtonElement;
    const mark = drawn(BRANCH_BONUS_BY_ID[side.bonus]?.icon ?? '', 18);
    if (mark) pip.append(mark);
    pip.append(el('span', undefined, side.name));
    pip.id = `climb-area-${side.id}`;
    pip.style.left = `${side.x}%`;
    pip.style.top = `${side.y}%`;
    pip.classList.toggle('pip--here', area === side.id);
    attachTooltip(pip, () =>
      `${side.name}. ${world?.name ?? side.world}, at the Proving Ground's own ` +
      `difficulty. ${pays?.say ?? ''} Click it again to go back to the plain area.`);
    pip.onclick = () => {
      area = area === side.id ? null : side.id;
      onPick();
    };
    trail.append(pip);
  }
  host.append(trail);
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
    || (shown === PROVING_TAB && !provingOpen(character))
    || (shown > PROVING_TAB && !rooms[shown - ROOM_TAB])
    || (shown < PROVING_TAB && !zoneOpen(character, shown));
  if (gone) shown = ground && provingOpen(character) ? PROVING_TAB : furthest(character).zone;
  const z = shown!;
  // THE TAB IS THE PICK. Looking at the Proving Ground IS choosing it, the way
  // clicking a station is choosing a depth — so this is set before anything
  // asks where the next descent goes.
  ground = z === PROVING_TAB;
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

  if (ground) {
    return renderProving(host, character, () => {
      renderClimb(host, character, onPick);
      onPick();
    });
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
  const line = course(zone.path);
  svg.append(svgEl('path', { class: 'climbseam__rock', d: seamPath(line.way) }));
  if (cleared > 0) {
    const far = zone.rungs === 1 ? 0 : (cleared - 1) / (zone.rungs - 1);
    svg.append(svgEl('path', { class: 'climbseam__lit', d: seamPath(line.upTo(far)) }));
  }
  trail.append(svg);

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
    pip.classList.toggle('pip--here', !isProving(at) && at.zone === z && at.rung === station.rung);
    pip.disabled = !can;

    const last = boss && z === LADDER.zones.length - 1;
    const what = !boss
      ? ''
      : ` The top of ${zone.name}: a fight in an arena of its own.` +
        (last ? ' It is the end of the climb, and the whole of what pays for it.' : '');
    attachTooltip(pip, () =>
      (!can
        ? `${zone.name}, depth ${station.rung}. Clear depth ${cleared + 1} first.`
        : station.rung <= cleared
          ? `${zone.name}, depth ${station.rung}. Cleared. Go back and grind it any time.`
          : `${zone.name}, depth ${station.rung}. The furthest you may go.`) + what
    );
    pip.onclick = () => {
      if (pickRung(character, here)) onPick();
    };
    trail.append(pip);

    // THE SIDE ROOMS OFF THIS DEPTH, each drawn down its own course from the
    // station — off the line, at the line's own danger, for one bonus.
    for (const side of branchesAt(z, station.rung)) {
      const way: Spot[] = [station, ...side.path.map(([x, y]) => ({ x, y }))];
      drawSpur(svg, seamPath(way));
      const end = way[way.length - 1];
      const label = branchLabel(side);
      const pays = BRANCH_BONUS_BY_ID[side.bonus];
      // WHAT IT PAYS IS THE NAME. `3A` said where it hung off and nothing about
      // why you would go, and it is already said by the spur it sits on.
      const spur = el('button', 'pip pip--side') as HTMLButtonElement;
      spur.append(drawn(pays?.icon ?? '', 22) ?? document.createTextNode(label));
      spur.id = `climb-side-${z}-${label}`;
      spur.style.left = `${end.x}%`;
      spur.style.top = `${end.y}%`;
      spur.classList.toggle('pip--shut', !can);
      spur.classList.toggle('pip--here', !isProving(at) && at.zone === z
        && at.rung === station.rung && at.branch === side.letter);
      spur.disabled = !can;
      attachTooltip(spur, () =>
        can
          ? `${side.name}. Off depth ${station.rung}, at that depth's own danger. ` +
            `${pays?.say ?? ''} Nothing here is climbed: a clear records no depth.`
          : `${side.name}. Off depth ${station.rung}, which is shut.`);
      spur.onclick = () => {
        if (pickRung(character, { ...here, branch: side.letter })) onPick();
      };
      trail.append(spur);
    }
  }

  host.append(trail);
}
