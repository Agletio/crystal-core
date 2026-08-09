/**
 * Map geometry. Nothing in src/sim touches the DOM, so the whole sim runs in
 * Node and the harnesses can assert on it. Map shape comes off the crystal's own
 * mods through the same computeStat path the character uses.
 */
import { Rng } from '../rng';
import { computeStat } from '../mods';
import type { Item } from '../types';

export interface Vec2 {
  x: number;
  y: number;
}

export const WALL = 0;
export const FLOOR = 1;
export const ENTRANCE = 2;
export const EXIT = 3;
/**
 * Corridor floor. Walkable exactly like FLOOR, since `walkable()` is "not a
 * wall" — it exists so a renderer can tell a chamber from a passage without
 * re-deriving it from the room rectangles every frame.
 */
export const TUNNEL = 4;

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Whole-tile, never fractional: the pathfinder works in whole tiles, and a
 * fractional landmark leaves the hero half a tile short of a goal forever.
 */
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
}

function overlaps(a: Room, b: Room, pad: number): boolean {
  return (
    a.x - pad < b.x + b.w &&
    a.x + a.w + pad > b.x &&
    a.y - pad < b.y + b.h &&
    a.y + a.h + pad > b.y
  );
}

function carveRoom(grid: Grid, r: Room): void {
  for (let y = r.y; y < r.y + r.h; y++) {
    for (let x = r.x; x < r.x + r.w; x++) grid.set(x, y, FLOOR);
  }
}

/**
 * One corridor tile, leaving a permanent wall border. Only ever writes into
 * rock: corridors are carved after the rooms, so without the guard a passage
 * would relabel the middle of the chamber it connects to.
 */
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

function hLine(grid: Grid, x0: number, x1: number, y: number, width: number): void {
  const offsets = band(width);
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
    for (const d of offsets) carve(grid, x, y + d);
  }
}

function vLine(grid: Grid, y0: number, y1: number, x: number, width: number): void {
  const offsets = band(width);
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
    for (const d of offsets) carve(grid, x + d, y);
  }
}

/**
 * L-shaped corridor: both legs always carve, the seed picks their ORDER. Two to
 * three tiles wide, because at one tile body collision turns every hallway into
 * a single-file queue.
 */
function carveCorridor(grid: Grid, a: Vec2, b: Vec2, rng: Rng): void {
  const ax = Math.round(a.x);
  const ay = Math.round(a.y);
  const bx = Math.round(b.x);
  const by = Math.round(b.y);
  const width = rng.int(2, 3);

  if (rng.chance(0.5)) {
    hLine(grid, ax, bx, ay, width);
    vLine(grid, ay, by, bx, width);
  } else {
    vLine(grid, ay, by, ax, width);
    hLine(grid, ax, bx, by, width);
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
export function generateMap(crystal: Item, rng: Rng, sizeScale = 1): GameMap {
  const layout = computeStat(1, crystal.mods, 'layoutComplexity') * sizeScale;

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

  for (const room of rooms) carveRoom(grid, room);
  for (let i = 1; i < rooms.length; i++) {
    carveCorridor(grid, roomCenter(rooms[i - 1]), roomCenter(rooms[i]), rng);
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
    carveCorridor(grid, entrance, exit, rng);
  }

  grid.set(Math.round(entrance.x), Math.round(entrance.y), ENTRANCE);
  grid.set(Math.round(exit.x), Math.round(exit.y), EXIT);

  return { grid, rooms, entrance, exit, vein: (crystal.meta.tier as number) ?? 1 };
}
