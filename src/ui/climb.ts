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
import { CRYSTAL_LEVELS, LADDER, PROVING, THEME_BY_ID } from '../data';
import {
  canEnter, climbed, furthest, isProving, provingOpen, zoneAt, zoneOpen,
} from '../ladder';
import type { Rung, RunWhere } from '../ladder';
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
 *  place is not a rung and could never be one. */
let ground = false;
/** The tab you are looking at, null until you click one: left alone it follows
 *  the rung you are pointed at, so a clear opens the zone above and shows it.
 *  `PROVING_TAB` is the fourth, past every zone. */
let shown: number | null = null;
export const PROVING_TAB = LADDER.zones.length;

/** WHERE THE NEXT DESCENT GOES: a depth on the climb, or the Proving Ground. */
export function whereNow(character: Character): RunWhere {
  if (ground && provingOpen(character)) return { proving: true, influence: influenceNow() };
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
  return true;
}

/** Cleared everywhere, against every rung there is. */
export function climbTotals(character: Character): { done: number; all: number } {
  let done = 0;
  let all = 0;
  LADDER.zones.forEach((zone, z) => {
    done += Math.min(zone.rungs, climbed(character, z));
    all += zone.rungs;
  });
  return { done, all };
}

/** WHERE A DESCENT WENT, named: what it IS rather than what is picked. */
export const rungName = (at: RunWhere): string =>
  isProving(at)
    ? `${PROVING.name}, ${THEME_BY_ID[at.influence]?.name ?? at.influence}`
    : `${zoneAt(at.zone)?.name ?? '?'}, depth ${at.rung}`;

/** What the readout says: where you are about to walk. */
export const rungLabel = (character: Character): string => rungName(whereNow(character));

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

interface Station {
  rung: number;
  x: number; // percent across the picture
  y: number; // percent down it
}

/** One zone's depths, laid down the picture the way the picture itself goes:
 *  top left to bottom right, with a wobble so it reads as a seam rather than a
 *  ruler. BOTH axes are percentages of the art, so a station cannot drift off
 *  the chamber it sits in whatever the card is doing. */
function stations(rungs: number): Station[] {
  const out: Station[] = [];
  for (let i = 0; i < rungs; i++) {
    const t = rungs === 1 ? 0 : i / (rungs - 1);
    out.push({ rung: i + 1, x: 7 + t * 86, y: 14 + t * 70 + Math.sin(i * 1.35) * 5 });
  }
  return out;
}

/** A smooth line through them: each pair meets at their midpoint, which is the
 *  cheapest curve that never overshoots a station. */
function seamPath(from: Station[]): string {
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
    redraw();
  };
  row.append(tab);
  host.append(row);
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
  const art = SCENE_ART[GROUND_ART[seam ? 'seam' : influenceNow()] ?? ''];
  if (art) trail.style.backgroundImage = `url(${art.png})`;
  const wall = el('div', 'groundsockets');
  sockets?.(wall);
  trail.append(wall);
  host.append(trail);
}

/**
 * THE CLIMB, drawn as the descent it is: one zone's cross-section, a seam
 * winding down it, and a station on every rung. The seam behind you is LIT and
 * the seam ahead is not, so how far you have come is the picture.
 */
export function renderClimb(host: HTMLElement, character: Character, onPick: () => void): void {
  host.replaceChildren();
  const shut = shown === PROVING_TAB && !provingOpen(character);
  if (shown === null || shut || (shown !== PROVING_TAB && !zoneOpen(character, shown))) {
    shown = ground && provingOpen(character) ? PROVING_TAB : furthest(character).zone;
  }
  const z = shown;
  // THE TAB IS THE PICK. Looking at the Proving Ground IS choosing it, the way
  // clicking a station is choosing a depth — so this is set before anything
  // asks where the next descent goes.
  ground = z === PROVING_TAB;
  const at = whereNow(character);

  // THE MAP IS THE SCREEN AND NOTHING IS WRITTEN OVER IT. The window already
  // says THE FISSURE; a title, a depth count and the campaign's own line under
  // it said the same thing three more times and took the picture's room.
  tabs(host, character, z, () => renderClimb(host, character, onPick));

  if (ground) {
    return renderProving(host, character, () => {
      renderClimb(host, character, onPick);
      onPick();
    });
  }

  const zone = LADDER.zones[z];
  const all = stations(zone.rungs);
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
  svg.append(svgEl('path', { class: 'climbseam__rock', d: seamPath(all) }));
  const done = all.filter((s) => s.rung <= cleared);
  if (done.length > 0) {
    svg.append(svgEl('path', { class: 'climbseam__lit', d: seamPath(done) }));
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
  }

  host.append(trail);
}
