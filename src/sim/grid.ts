/**
 * Map geometry.
 *
 * Nothing in src/sim touches the DOM — the whole sim runs in Node, which is
 * what lets smoke.mjs and the demo assert on it. The renderer reads this
 * state and draws it; it never writes back.
 *
 * Map shape comes off the crystal's own mods through the same computeStat
 * path the character uses. That's the design promise from the README: a
 * crystal is an item whose mods feed the map generator.
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

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Whole-tile centre, deliberately not fractional.
 *
 * Entrance and exit are derived from this, and the pathfinder works in whole
 * tiles — a fractional landmark leaves the hero permanently half a tile short
 * of a goal it believes it has reached.
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
}

export interface GameMap {
  grid: Grid;
  rooms: Room[];
  entrance: Vec2;
  exit: Vec2;
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

function hLine(grid: Grid, x0: number, x1: number, y: number): void {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) grid.set(x, y, FLOOR);
}

function vLine(grid: Grid, y0: number, y1: number, x: number): void {
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) grid.set(x, y, FLOOR);
}

/** L-shaped corridor. Both legs always get carved; leg ORDER is what the
 *  seed picks, which is what makes layouts differ. */
function carveCorridor(grid: Grid, a: Vec2, b: Vec2, rng: Rng): void {
  const ax = Math.round(a.x);
  const ay = Math.round(a.y);
  const bx = Math.round(b.x);
  const by = Math.round(b.y);

  if (rng.chance(0.5)) {
    hLine(grid, ax, bx, ay);
    vLine(grid, ay, by, bx);
  } else {
    vLine(grid, ay, by, ax);
    hLine(grid, ax, bx, by);
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
 * Rooms joined by corridors. `layoutComplexity` off the crystal drives both
 * the map's size and its room count, so "of Winding Ways" produces a
 * genuinely longer walk rather than a cosmetic label.
 */
export function generateMap(crystal: Item, rng: Rng): GameMap {
  const layout = computeStat(1, crystal.mods, 'layoutComplexity');

  const width = clamp(Math.round(42 * Math.sqrt(layout)), 30, 72);
  const height = clamp(Math.round(28 * Math.sqrt(layout)), 22, 48);
  const grid = new Grid(width, height);

  const target = clamp(Math.round(7 * layout), 5, 16);
  const rooms: Room[] = [];

  for (let attempt = 0; attempt < 500 && rooms.length < target; attempt++) {
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

  return { grid, rooms, entrance, exit };
}
