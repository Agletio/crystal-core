/**
 * Map geometry. Nothing in src/sim touches the DOM, so the whole sim runs in
 * Node and the harnesses can assert on it. Map shape comes off the crystal's own
 * mods through the same computeStat path the character uses.
 */
import { Rng } from '../rng';
import { computeStat } from '../mods';
import { tileNoise } from '../noise';
import type { MapTheme, RolledMod } from '../types';

export interface Vec2 {
  x: number;
  y: number;
}

export const WALL = 0;
export const FLOOR = 1;
export const ENTRANCE = 2;
export const EXIT = 3;
/** Corridor floor. Walkable exactly like FLOOR — it exists so a renderer can
 *  tell a chamber from a passage without re-deriving it from the rectangles. */
export const TUNNEL = 4;

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Whole-tile: the pathfinder works in whole tiles, and a fractional landmark
 *  leaves the hero half a tile short of a goal forever. */
export function roomCenter(r: Room): Vec2 {
  return { x: r.x + Math.floor((r.w - 1) / 2), y: r.y + Math.floor((r.h - 1) / 2) };
}

export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class Grid {
  readonly width: number;
  readonly height: number;
  readonly tiles: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.tiles = new Uint8Array(width * height); // all WALL
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  at(x: number, y: number): number {
    if (!this.inBounds(x, y)) return WALL;
    return this.tiles[y * this.width + x];
  }

  set(x: number, y: number, tile: number): void {
    if (this.inBounds(x, y)) this.tiles[y * this.width + x] = tile;
  }

  /** Walls block; everything else is walkable. Entities use float positions,
   *  so this is sampled at the rounded tile under them. */
  walkable(x: number, y: number): boolean {
    return this.at(Math.round(x), Math.round(y)) !== WALL;
  }

  /**
   * Whether a BODY of this radius fits, rather than whether its centre does: a
   * centre-only test lets a sprite sit half a tile into the rock. Tile n covers
   * [n-0.5, n+0.5], so the body spans the tiles its extent rounds to.
   */
  fits(x: number, y: number, radius: number): boolean {
    const r = Math.min(radius, BODY_MAX);
    for (let ty = Math.round(y - r); ty <= Math.round(y + r); ty++) {
      for (let tx = Math.round(x - r); tx <= Math.round(x + r); tx++) {
        if (this.at(tx, ty) === WALL) return false;
      }
    }
    return true;
  }
}

/** Under half a tile, so a rank-scaled body can still walk a one-tile gap. */
const BODY_MAX = 0.45;

/**
 * Can a straight line between two points avoid a wall? Sampled along the
 * segment, not Bresenham: entities sit at fractional positions and the line
 * between their real centres is what matters. The step is well under a tile, so
 * a one-tile wall can never be stepped over.
 */
export function hasLineOfSight(grid: Grid, a: Vec2, b: Vec2): boolean {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) return true;

  const steps = Math.ceil(length / 0.2);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (!grid.walkable(a.x + dx * t, a.y + dy * t)) return false;
  }
  return true;
}

export interface GameMap {
  grid: Grid;
  rooms: Room[];
  entrance: Vec2;
  exit: Vec2;
  /**
   * Which mineral runs through this rock. Presentation reads it, the sim never
   * does — but it is a fact about the MAP, so the two renderers cannot invent
   * different seams for the same crystal.
   */
  vein: number;
  /** Which world this rock belongs to. Presentation only, same as the vein. */
  theme: MapTheme;
}

function overlaps(a: Room, b: Room, pad: number): boolean {
  return (
    a.x - pad < b.x + b.w &&
    a.x + a.w + pad > b.x &&
    a.y - pad < b.y + b.h &&
    a.y + a.h + pad > b.y
  );
}

/**
 * How a zone is cut out of the rock. NOTHING is built: the Fissure is a
 * working dug at and given up on, so a square corner exists nowhere in the
 * game. The Seam is grown throughout rather than a room of each — the average
 * of two hard rooms is not the hardest room going.
 */
export type Cut = 'dug' | 'grown' | 'gullet';

const CUT: Record<MapTheme, Cut> = {
  fissure: 'dug',
  demonic: 'gullet',
  prismatic: 'grown',
  seam: 'grown',
};

/** How far a passage wanders off the line between the rooms it joins. */
const WOBBLE: Record<Cut, number> = { dug: 1, gullet: 0, grown: 1 };

/** How much of a dug room's outer ring the rock never gave up. */
const RAG = 0.22;

/** A room, cut the way its world cuts. The `Room` RECTANGLE never changes —
 *  every spawn, the entrance and the exit are placed off it. */
function carveRoom(grid: Grid, r: Room, cut: Cut): void {
  if (cut !== 'grown') {
    // Both of these keep the rectangle's AREA. A fifth smaller with the same
    // pack in it is a pack that arrives all at once, which turned the aura
    // worlds into walls.
    const corner = cut === 'gullet' ? (Math.min(r.w, r.h) >= 6 ? 2 : 1) : 1;
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        const dx = Math.min(x - r.x, r.x + r.w - 1 - x);
        const dy = Math.min(y - r.y, r.y + r.h - 1 - y);
        if (dx + dy < corner) continue;
        // Worried at the edge rather than rounded off: no run of it is straight
        if (cut === 'dug' && Math.min(dx, dy) === 0 && tileNoise(x, y, 53) < RAG) continue;
        grid.set(x, y, FLOOR);
      }
    }
    return;
  }

  const cx = r.x + (r.w - 1) / 2;
  const cy = r.y + (r.h - 1) / 2;
  // INSCRIBED. An ellipse round the OUTSIDE of the rectangle is bigger than
  // the room it replaces, and rooms are packed two tiles apart: they merge and
  // the map loses its walls.
  const rx = r.w / 2;
  const ry = r.h / 2;

  for (let y = r.y - 1; y < r.y + r.h + 1; y++) {
    for (let x = r.x - 1; x < r.x + r.w + 1; x++) {
      if (x < 1 || y < 1 || x >= grid.width - 1 || y >= grid.height - 1) continue;
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = dx * dx + dy * dy;
      if (d > 0.8 + tileNoise(x, y, 50) * 0.35) continue; // ragged by a tile
      // A pillar, never near the edge and never more than one tile, so it is
      // something to walk round rather than something to be caught on.
      if (d < 0.4 && tileNoise(x, y, 51) < 0.08) continue;
      grid.set(x, y, FLOOR);
    }
  }
}

/** One corridor tile, leaving a permanent wall border. Only ever writes into
 *  rock, or a passage would relabel the middle of the chamber it joins. */
function carve(grid: Grid, x: number, y: number): void {
  if (x < 1 || y < 1 || x >= grid.width - 1 || y >= grid.height - 1) return;
  if (grid.at(x, y) === WALL) grid.set(x, y, TUNNEL);
}

/** Offsets that centre a band of the given width on a line. */
function band(width: number): number[] {
  const lo = -Math.floor((width - 1) / 2);
  const out: number[] = [];
  for (let i = 0; i < width; i++) out.push(lo + i);
  return out;
}

/** At most ONE tile per step: any more and consecutive bands stop sharing a
 *  row, leaving the halves diagonally adjacent — connected to the eye, and not
 *  at all to a flood fill. */
function drift(at: number, x: number, y: number, wobble: number): number {
  if (wobble === 0) return 0;
  const roll = tileNoise(x, y, 52);
  const step = roll < 0.3 ? -1 : roll > 0.7 ? 1 : 0;
  return clamp(at + step, -wobble, wobble);
}

function hLine(grid: Grid, x0: number, x1: number, y: number, w: number, wobble = 0): void {
  let off = 0;
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
    off = drift(off, x, y, wobble);
    for (const d of band(w)) carve(grid, x, y + off + d);
  }
}

function vLine(grid: Grid, y0: number, y1: number, x: number, w: number, wobble = 0): void {
  let off = 0;
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
    off = drift(off, x, y, wobble);
    for (const d of band(w)) carve(grid, x + off + d, y);
  }
}

/** L-shaped: both legs always carve, the seed picks their ORDER, and two to
 *  three tiles wide because at one, body collision turns a hallway into a
 *  queue. A wandering world drifts across the legs; it never drops them, since
 *  connectivity is the one thing a passage owes the run. */
function carveCorridor(grid: Grid, a: Vec2, b: Vec2, rng: Rng, wobble: number): void {
  const ax = Math.round(a.x);
  const ay = Math.round(a.y);
  const bx = Math.round(b.x);
  const by = Math.round(b.y);
  const width = rng.int(2, 3);

  if (rng.chance(0.5)) {
    hLine(grid, ax, bx, ay, width, wobble);
    vLine(grid, ay, by, bx, width, wobble);
  } else {
    vLine(grid, ay, by, ax, width, wobble);
    hLine(grid, ax, bx, by, width, wobble);
  }
}

/** 4-way flood fill from a tile. Used to prove the exit is actually reachable. */
function reachable(grid: Grid, from: Vec2): Set<number> {
  const seen = new Set<number>();
  const start = Math.round(from.y) * grid.width + Math.round(from.x);
  const queue = [start];
  seen.add(start);

  while (queue.length > 0) {
    const node = queue.pop()!;
    const x = node % grid.width;
    const y = (node - x) / grid.width;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (!grid.inBounds(nx, ny) || grid.at(nx, ny) === WALL) continue;
      const nk = ny * grid.width + nx;
      if (seen.has(nk)) continue;
      seen.add(nk);
      queue.push(nk);
    }
  }
  return seen;
}

/**
 * Rooms joined by corridors. `layoutComplexity` off the crystal and the tier's
 * own `sizeScale` both drive the map's size and its room count, so "of Winding
 * Ways" and a deeper tier each produce a genuinely longer walk.
 */
export function generateMap(
  mods: RolledMod[],
  rng: Rng,
  sizeScale = 1,
  vein = 1,
  theme: MapTheme = 'fissure'
): GameMap {
  const layout = computeStat(1, mods, 'layoutComplexity') * sizeScale;

  const width = clamp(Math.round(42 * Math.sqrt(layout)), 26, 104);
  const height = clamp(Math.round(28 * Math.sqrt(layout)), 20, 70);
  const grid = new Grid(width, height);

  const target = clamp(Math.round(7 * layout), 4, 30);
  const rooms: Room[] = [];

  // Attempts scale with the target: a fixed budget quietly returned a T6 with
  // a T1's room count once the map was big enough to need more tries.
  for (let attempt = 0; attempt < 90 * target && rooms.length < target; attempt++) {
    const w = rng.int(5, 9);
    const h = rng.int(4, 7);
    const candidate: Room = {
      x: rng.int(1, Math.max(1, width - w - 2)),
      y: rng.int(1, Math.max(1, height - h - 2)),
      w,
      h,
    };
    if (rooms.some((r) => overlaps(r, candidate, 2))) continue;
    rooms.push(candidate);
  }

  const cut = CUT[theme] ?? 'dug';
  for (const room of rooms) carveRoom(grid, room, cut);
  for (let i = 1; i < rooms.length; i++) {
    carveCorridor(grid, roomCenter(rooms[i - 1]), roomCenter(rooms[i]), rng, WOBBLE[cut]);
  }

  const entrance = roomCenter(rooms[0]);

  // Exit goes in whichever room is physically farthest from the entrance, so
  // the hero always has a real distance to cover regardless of room order.
  let exitRoom = rooms[rooms.length - 1];
  let best = -1;
  for (const room of rooms.slice(1)) {
    const d = dist(entrance, roomCenter(room));
    if (d > best) {
      best = d;
      exitRoom = room;
    }
  }
  const exit = roomCenter(exitRoom);

  // The room chain should already connect everything, but an unreachable exit
  // produces a hero that stands still forever — the worst failure mode in
  // something you sit and watch. Prove reachability; carve straight through
  // if the generator somehow failed.
  const exitKey = Math.round(exit.y) * grid.width + Math.round(exit.x);
  if (!reachable(grid, entrance).has(exitKey)) {
    carveCorridor(grid, entrance, exit, rng, 0); // straight, whatever the world
  }

  grid.set(Math.round(entrance.x), Math.round(entrance.y), ENTRANCE);
  grid.set(Math.round(exit.x), Math.round(exit.y), EXIT);

  return { grid, rooms, entrance, exit, vein, theme };
}
