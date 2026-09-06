/**
 * WHERE YOU ARE ON THE CLIMB, and where you may go. Nothing is ever taken away:
 * a depth you have beaten is open for the rest of that character's life.
 */
import { CAMPAIGN_REWARD, LADDER, LAMPWRIGHT, SOULS } from './data';
import type { Character } from './sim/character';
import type { LinkDef, MapTheme, SideRoomDef } from './types';

export interface Rung {
  zone: number; // index into LADDER.zones; `rung` is 1-based within it
  rung: number;
  /** A SIDE ROOM by its id. `rung` is then the DEPTH it sits at, derived from
   *  where it stands on the picture, so everything downstream reads one field
   *  for difficulty whether or not you are off the line. */
  side?: string;
}

/** WHERE A DESCENT GOES. Nothing else picks a fight. */
export type RunWhere = Rung;

export const zoneAt = (zone: number) => LADDER.zones[zone];

/** HOW MANY SOULSTONES ARE IN THE WALL, 0 to `SOULS.max`. Kept on the character
 *  by `heal()` off the wall itself, so nothing has to carry the game around to
 *  ask, and the two cannot disagree. */
export const soulsIn = (character: Character): number =>
  Math.max(0, Math.min(SOULS.max, Math.floor(character.souls ?? 0)));

/** WHAT A ZONE IS RECORDED UNDER. A soulstone puts the map back to the first
 *  depth, so each tier keeps its own sheet — taking one out is not a wipe. */
export const progressKey = (character: Character, zone: number): string => {
  const id = zoneAt(zone)?.id ?? '';
  const souls = soulsIn(character);
  return souls > 0 ? `${id}@${souls}` : id;
};

export const climbed = (character: Character, zone: number): number =>
  character.climbed?.[progressKey(character, zone)] ?? 0;

/** OPEN once the one before it is climbed whole. The first always is. */
export function zoneOpen(character: Character, zone: number): boolean {
  if (zone <= 0) return true;
  const before = zoneAt(zone - 1);
  return !!before && climbed(character, zone - 1) >= before.rungs;
}

/** THE MAP IS THE GATE, not the number. Everything cleared plus the one past
 *  it, AND anything touching something you have cleared — so a run of side
 *  rooms carries you to a depth you never climbed to. *"I want you to be able
 *  to skip zones by going in between others."* */
export function canEnter(character: Character, at: Rung): boolean {
  return canEnterNode(character, at.zone, at.side ?? mainId(at.rung));
}

/** The deepest thing you may enter: where the game puts you by default. */
export function furthest(character: Character): Rung {
  let best: Rung = { zone: 0, rung: 1 };
  LADDER.zones.forEach((zone, z) => {
    if (!zoneOpen(character, z)) return;
    best = { zone: z, rung: Math.min(zone.rungs, climbed(character, z) + 1) };
  });
  return best;
}

/** THE ARENA at the top of a zone: its LAST depth is a boss, so the climb's
 *  one gate is a fight. Never a SIDE ROOM — a boss you could farm is not a
 *  gate, and the network can put you beside one early. */
export function arenaAt(at: Rung): string | null {
  const zone = zoneAt(at.zone);
  if (at.side) return null;
  return zone && at.rung === zone.rungs ? (zone.arena ?? null) : null;
}

/** A NODE'S ID: `d<N>` is the Nth depth, anything else a side room. */
export const mainId = (rung: number): string => `d${rung}`;

/** The depth an id names, or null for a side room. */
export function depthOfId(id: string): number | null {
  const hit = /^d(\d+)$/.exec(id);
  return hit ? Number(hit[1]) : null;
}

export const sideRooms = (zone: number): SideRoomDef[] => zoneAt(zone)?.sides ?? [];

export const sideRoom = (zone: number, id: string): SideRoomDef | null =>
  sideRooms(zone).find((s) => s.id === id) ?? null;

export const sideAt = (at: Rung): SideRoomDef | null =>
  (at.side && sideRoom(at.zone, at.side)) || null;

/** EVERY LINK IN A ZONE: the main chain, which is never authored, and the ways
 *  round it, which are. */
export function linksIn(zone: number): LinkDef[] {
  const def = zoneAt(zone);
  if (!def) return [];
  const chain: LinkDef[] = Array.from({ length: def.rungs - 1 }, (_, i) => ({
    from: mainId(i + 1), to: mainId(i + 2),
  }));
  return [...chain, ...(def.links ?? [])];
}

export function touching(zone: number, id: string): string[] {
  const out: string[] = [];
  for (const link of linksIn(zone)) {
    if (link.from === id) out.push(link.to);
    else if (link.to === id) out.push(link.from);
  }
  return out;
}

/** WHERE A NODE STANDS, in percent of the picture: a depth is spread along the
 *  zone's own course, a side room carries its own point. */
export function nodeSpot(zone: number, id: string): { x: number; y: number } | null {
  const def = zoneAt(zone);
  if (!def) return null;
  const depth = depthOfId(id);
  if (depth === null) {
    const room = sideRoom(zone, id);
    return room ? { x: room.x, y: room.y } : null;
  }
  if (depth < 1 || depth > def.rungs) return null;
  return courseOf(def.path).at(def.rungs === 1 ? 0 : (depth - 1) / (def.rungs - 1));
}

/** WHAT A PORTAL CHANGES: past one, a room's danger is not where it STANDS —
 *  the two mouths are the same hole, so position says nothing. *"The ones you
 *  have to portal to don't consider their actual depth, just consider the
 *  chain that you have to clear to get to them, having it progressively get
 *  harder until r19 where it's equivalent to level 14."* So a room beyond a
 *  portal ramps from the depth on the NEAR side up to the zone's LAST depth at
 *  the end of the chain, and every clear on the way is a step of that ramp.
 *  Cached per zone: the walk is the same every time and a card asks per pip. */
const chains: Record<number, Record<string, number>> = {};

function chainDepths(zone: number): Record<string, number> {
  if (chains[zone]) return chains[zone];
  const def = zoneAt(zone);
  const out: Record<string, number> = {};
  chains[zone] = out;
  if (!def) return out;
  const plain = linksIn(zone).filter((l) => !l.portal);
  // WHAT THE LINE REACHES WITHOUT A PORTAL keeps its own position.
  const near = new Set(Array.from({ length: def.rungs }, (_, i) => mainId(i + 1)));
  for (let pass = 0; pass < def.rungs + sideRooms(zone).length; pass++) {
    let grew = false;
    for (const link of plain) {
      if (near.has(link.from) !== near.has(link.to)) {
        near.add(link.from); near.add(link.to); grew = true;
      }
    }
    if (!grew) break;
  }
  // EVERYTHING ELSE is walked to, counting clears and remembering where it
  // left the near side — that room's own depth is the foot of the ramp.
  const step: Record<string, { steps: number; base: number }> = {};
  let edge = [...near];
  const seen = new Set(near);
  for (let n = 1; edge.length; n++) {
    const next: string[] = [];
    for (const id of edge) {
      for (const to of touching(zone, id)) {
        if (seen.has(to)) continue;
        seen.add(to);
        const from = step[id];
        step[to] = { steps: (from?.steps ?? 0) + 1, base: from?.base ?? depthWhere(zone, id) };
        next.push(to);
      }
    }
    edge = next;
  }
  const far = Object.keys(step);
  const deepest = far.reduce((n, id) => Math.max(n, step[id].steps), 0) || 1;
  for (const id of far) {
    const { steps, base } = step[id];
    out[id] = Math.max(1, Math.min(def.rungs,
      Math.round(base + (def.rungs - base) * (steps / deepest))));
  }
  return out;
}

/** Where a node STANDS, as a depth: a main one is its own, a room the nearest
 *  point of the course to it. */
function depthWhere(zone: number, id: string): number {
  const depth = depthOfId(id);
  return depth ?? standsAt(zone, id);
}

/** A SIDE ROOM'S DEPTH is where it stands: the nearest point of the course,
 *  read as a depth. So a room low on the map is a hard floor without one
 *  number being written down anywhere — unless a PORTAL is what reaches it. */
export function depthOfSide(zone: number, id: string): number {
  return chainDepths(zone)[id] ?? standsAt(zone, id);
}

function standsAt(zone: number, id: string): number {
  const def = zoneAt(zone);
  const room = def && sideRoom(zone, id);
  if (!def || !room) return 1;
  const line = courseOf(def.path);
  let best = 0, near = Infinity;
  for (let step = 0; step <= 200; step++) {
    const t = step / 200;
    const spot = line.at(t);
    const gap = Math.hypot(spot.x - room.x, spot.y - room.y);
    if (gap < near) { near = gap; best = t; }
  }
  return Math.max(1, Math.min(def.rungs, Math.round(best * (def.rungs - 1)) + 1));
}

/** CLEARED: a depth is `climbed`, a side room is its own mark. */
export function isCleared(character: Character, zone: number, id: string): boolean {
  if (!zoneAt(zone)) return false;
  const key = progressKey(character, zone);
  const depth = depthOfId(id);
  if (depth !== null) return climbed(character, zone) >= depth;
  return (character.opened?.[key] ?? []).includes(id);
}

/** OPEN: the first depth, the plain ladder, or anything TOUCHING a clear. */
export function canEnterNode(character: Character, zone: number, id: string): boolean {
  const def = zoneAt(zone);
  if (!def || !zoneOpen(character, zone)) return false;
  const depth = depthOfId(id);
  if (depth !== null) {
    if (depth < 1 || depth > def.rungs) return false;
    if (depth <= climbed(character, zone) + 1) return true;
  } else if (!sideRoom(zone, id)) {
    return false;
  }
  return touching(zone, id).some((next) => isCleared(character, zone, next));
}

/** THE COURSE a zone runs, walked by ARC LENGTH. `at` is the point a fraction
 *  along it and `upTo` the run of it to there. It decides where a depth stands
 *  and how hard a side room is, so it lives beside the ladder rather than in
 *  the screen that draws it. */
const PLAIN: [number, number][] = [[7, 14], [93, 84]];

export function courseOf(path?: [number, number][]) {
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
  const at = (t: number) => {
    const { leg, k } = step(t);
    return {
      x: way[leg][0] + (way[leg + 1][0] - way[leg][0]) * k,
      y: way[leg][1] + (way[leg + 1][1] - way[leg][1]) * k,
    };
  };
  const upTo = (t: number) => {
    const { leg } = step(t);
    return [...way.slice(0, leg + 1).map(([x, y]) => ({ x, y })), at(t)];
  };
  return { way: way.map(([x, y]) => ({ x, y })), at, upTo };
}

/** THE CAMPAIGN IS OVER when every zone is climbed whole, which is the three
 *  bosses. Nothing pays a crystal or a point before it. */
export const campaignDone = (character: Character): boolean =>
  LADDER.zones.every((zone, z) => climbed(character, z) >= zone.rungs);

export const campaignPrize = (): string =>
  `${CAMPAIGN_REWARD.crystals} crystal${CAMPAIGN_REWARD.crystals === 1 ? '' : 's'} ` +
  `and ${CAMPAIGN_REWARD.points} points`;

/** THE FINISH LINE, SAID BEFORE YOU GET THERE: where the last boss is and what
 *  he pays for it, on the screen the climb is picked from. */
export function campaignLine(character: Character): string {
  const last = LADDER.zones[LADDER.zones.length - 1];
  if (character.paidCampaign) return `The climb is finished, and ${LAMPWRIGHT.name} has paid for it.`;
  if (!campaignDone(character)) {
    return (
      `No crystal and no point is paid until the climb is whole. ` +
      `${last.name}, depth ${last.rungs}, is the last of it, and ` +
      `${LAMPWRIGHT.name} hands over ${campaignPrize()} for it.`
    );
  }
  return `The climb is finished. ${LAMPWRIGHT.name} is holding ${campaignPrize()} for you in the camp.`;
}

/** Cleared, and never un-cleared. A DEPTH moves the line; A SIDE ROOM MOVES
 *  NOTHING BUT THE MAP — it is marked open so what it touches can be entered,
 *  and your level is still the deepest DEPTH you have beaten. *"Otherwise
 *  you're still at your current main level even if you cleared higher
 *  difficulty side levels."* */
export function takeRung(character: Character, at: Rung): void {
  if (!zoneAt(at.zone)) return;
  const key = progressKey(character, at.zone);
  if (at.side) {
    if (!sideRoom(at.zone, at.side)) return;
    const had = character.opened?.[key] ?? [];
    if (!had.includes(at.side)) {
      character.opened = { ...(character.opened ?? {}), [key]: [...had, at.side] };
    }
    return;
  }
  if (at.rung < 1) return;
  const was = climbed(character, at.zone);
  if (at.rung > was) character.climbed = { ...(character.climbed ?? {}), [key]: at.rung };
}

