/**
 * Map geometry. Nothing in src/sim touches the DOM, so the whole sim runs in
 * Node and the harnesses can assert on it. Map shape comes off the crystal's own
 * mods through the same computeStat path the character uses.
 */
import { Rng } from '../rng';
import { computeStat } from '../mods';
import { tileNoise } from '../noise';
import type { MapTheme, RolledMod } from '../types';
import type { ScenePlan } from '../scenes';
import { FRINGE_PROPS, LOOSE_PROPS, SOLID_PROPS, VIGNETTES, WALL_PROPS, weighted } from '../vignettes';
import type { Vignette } from '../vignettes';

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
  /** Furniture standing on a walkable tile. A SECOND layer, because the tile
   *  under an altar is still floor: every renderer keys its ground off `tiles`,
   *  and marking it rock would cut a hole in the floor to draw a table in. */
  readonly solid: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.tiles = new Uint8Array(width * height); // all WALL
    this.solid = new Uint8Array(width * height);
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
    const tx = Math.round(x);
    const ty = Math.round(y);
    if (!this.inBounds(tx, ty)) return false;
    return this.tiles[ty * this.width + tx] !== WALL && !this.solid[ty * this.width + tx];
  }

  /** Whether a BODY of this radius fits, rather than whether its centre does:
   *  a centre-only test lets a sprite sit half a tile into the rock. Tile n
   *  covers [n-0.5, n+0.5], so a body spans the tiles its extent rounds to. */
  fits(x: number, y: number, radius: number): boolean {
    const r = Math.min(radius, BODY_MAX);
    for (let ty = Math.round(y - r); ty <= Math.round(y + r); ty++) {
      for (let tx = Math.round(x - r); tx <= Math.round(x + r); tx++) {
        if (!this.walkable(tx, ty)) return false;
      }
    }
    return true;
  }
}

/** Under half a tile, so a rank-scaled body can still walk a one-tile gap. */
const BODY_MAX = 0.45;

/** Sampled along the segment rather than Bresenham: entities sit at fractional
 *  positions, and the step is well under a tile so nothing steps over a wall. */
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

/** Furniture, in tiles. `id` names an entry in the prop table both renderers
 *  draw from — a prop is decals, never a sprite and never in `BEASTIARY`. */
export interface MapProp {
  id: string;
  x: number;
  y: number;
}

export interface GameMap {
  grid: Grid;
  rooms: Room[];
  entrance: Vec2;
  exit: Vec2;
  /** A prop is a fact about a room somebody built; a decal is what the rock
   *  does on its own, hashed off the tile it lands on. */
  props: MapProp[];
  /** Which mineral runs through this rock — a fact about the MAP, so the two
   *  renderers cannot invent different seams for one crystal. */
  vein: number;
  /** Which world this rock belongs to. Presentation only, same as the vein. */
  theme: MapTheme;
  /** A generated tileset drawn instead of the theme's own rock, by a scene. */
  ground?: string;
}

function overlaps(a: Room, b: Room, pad: number): boolean {
  return (
    a.x - pad < b.x + b.w &&
    a.x + a.w + pad > b.x &&
    a.y - pad < b.y + b.h &&
    a.y + a.h + pad > b.y
  );
}

/** How a zone is cut. NOTHING is built: a square corner exists nowhere in the
 *  game. The Seam is grown throughout rather than a room of each — the average
 *  of two hard rooms is not the hardest room going. */
export type Cut = 'dug' | 'grown' | 'gullet';

const CUT: Record<MapTheme, Cut> = {
  fissure: 'dug',
  demonic: 'gullet',
  prismatic: 'grown',
  seam: 'grown',
};

/** How far a passage wanders off the line between the rooms it joins, and how
 *  much of a dug room's outer ring the rock never gave up. */
const WOBBLE: Record<Cut, number> = { dug: 1, gullet: 0, grown: 3 };
const RAG = 0.22;

const phaseOf = (r: Room, salt: number): number => tileNoise(r.x, r.y, salt) * Math.PI * 2;

/** Rock the carve left STANDING inside a chamber: something to walk round is
 *  what makes a room a cavern rather than a hall, and one tile of it reads as
 *  a snag. Never near the middle, where everything off `roomCenter` goes. */
function islandsIn(r: Room, spare: Vec2[]): { x: number; y: number; r: number }[] {
  const cx = r.x + (r.w - 1) / 2;
  const cy = r.y + (r.h - 1) / 2;
  const out: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < Math.min(2, Math.floor((r.w * r.h) / 30)); i++) {
    const turn = tileNoise(r.x + i, r.y, 56) * Math.PI * 2;
    const from = 0.46 + tileNoise(r.x, r.y + i, 57) * 0.16;
    const at = {
      x: cx + Math.cos(turn) * (r.w / 2) * from,
      y: cy + Math.sin(turn) * (r.h / 2) * from,
      r: 0.9 + tileNoise(r.x + i, r.y + i, 58) * 0.5,
    };
    // Never over what a room was authored around: a hand-placed prop is a fact
    // about the room and an island is the carve being interesting.
    if (spare.some((v) => (v.x - at.x) ** 2 + (v.y - at.y) ** 2 < (at.r + 0.5) ** 2)) continue;
    out.push(at);
  }
  return out;
}

/** A room, cut the way its world cuts. The `Room` RECTANGLE never changes —
 *  every spawn, the entrance and the exit are placed off it. */
function carveRoom(grid: Grid, r: Room, cut: Cut, spare: Vec2[] = []): void {
  if (cut !== 'grown') {
    // Both keep the rectangle's AREA: a fifth smaller with the same pack in
    // it is a pack that arrives all at once.
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
  // INSCRIBED: rooms are packed two tiles apart, so an ellipse round the
  // OUTSIDE of the rectangle merges with its neighbour and the map loses its
  // walls.
  const rx = r.w / 2;
  const ry = r.h / 2;
  const swellA = phaseOf(r, 54);
  const swellB = phaseOf(r, 55);
  const islands = islandsIn(r, spare);

  for (let y = r.y - 1; y < r.y + r.h + 1; y++) {
    for (let x = r.x - 1; x < r.x + r.w + 1; x++) {
      if (x < 1 || y < 1 || x >= grid.width - 1 || y >= grid.height - 1) continue;
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const d = dx * dx + dy * dy;
      // HEADLANDS, at a scale that reads across a whole room where `tileNoise`
      // only roughens one tile. It only ever ADDS: a swell that can pull IN
      // puts a room's authored furniture in the rock, and the bays are already
      // the ragging's job.
      const turn = Math.atan2(dy, dx);
      const swell =
        0.11 * (1 + Math.sin(turn * 3 + swellA)) + 0.07 * (1 + Math.sin(turn * 5 + swellB));
      if (d > 0.8 + swell + tileNoise(x, y, 50) * 0.35) continue;
      if (islands.some((i) => (x - i.x) ** 2 + (y - i.y) ** 2 < i.r * i.r)) continue;
      grid.set(x, y, FLOOR);
    }
  }
}

/** The footprint an arrangement has to beat to count as one worth the room. */
const BIG = 12;

/** Furniture, a CLUSTER at a time: a prop dropped one at a time reads as one,
 *  equally far from everything and there for no reason. The rng is handed in,
 *  so a scene's fixed seed makes the same place every time. */
export function dressRooms(
  grid: Grid,
  rooms: Room[],
  rng: Rng,
  per = 2,
  keep: Vec2[] = []
): MapProp[] {
  const out: MapProp[] = [];
  // Dressing over a hand-placed prop, the hole or the person standing in the
  // room is furniture on top of furniture.
  const taken = new Set(keep.map((v) => v.y * grid.width + v.x));

  const clear = (x: number, y: number, w: number, h: number): boolean => {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (grid.at(x + dx, y + dy) === WALL) return false;
        if (taken.has((y + dy) * grid.width + (x + dx))) return false;
      }
    }
    return true;
  };

  /** A spot in the room, and then what fits IN it. Picking the arrangement
   *  first and hunting for room leaves a chamber bare: a ragged ellipse holds
   *  a four-tile square in about one spot in fifteen. */
  const drop = (room: Room, least: number): boolean => {
    for (let attempt = 0; attempt < 20; attempt++) {
      // Tested against the FLOOR, a tile outside the rectangle each way: a
      // grown room is neither where its rectangle is nor how big it is.
      const x = room.x - 1 + rng.int(0, room.w);
      const y = room.y - 1 + rng.int(0, room.h);
      const fits = VIGNETTES.filter((v) => v.w * v.h >= least && clear(x, y, v.w, v.h));
      if (fits.length === 0) continue;
      const size = (v: Vignette) => v.weight * v.w * v.h;
      let roll = rng.next() * fits.reduce((n, v) => n + size(v), 0);
      const pick = fits.find((v) => (roll -= size(v)) < 0) ?? fits[0];
      for (let dy = 0; dy < pick.h; dy++) {
        for (let dx = 0; dx < pick.w; dx++) taken.add((y + dy) * grid.width + (x + dx));
      }
      for (const p of pick.props) out.push({ id: p.id, x: x + p.x, y: y + p.y });
      return true;
    }
    return false;
  };

  // The biggest first. Taking the first spot where ANYTHING fits puts a small
  // cluster in the one corner that could have held the altar.
  for (const room of rooms) {
    for (let n = 0; n < per; n++) {
      if (n > 0 || !drop(room, BIG)) drop(room, 1);
    }
  }
  return out;
}

/** Furniture you go AROUND rather than over. Blocked one tile at a time and
 *  UNDONE the moment it cuts anything off: a prop that walls a passage is a map
 *  the hero stands still in forever, and no amount of an altar being solid is
 *  worth that. Never in a passage to begin with, which is most of it. */
function block(grid: Grid, props: MapProp[], must: Vec2[]): void {
  const spared = new Set(must.map((v) => v.y * grid.width + v.x));
  for (const p of props) {
    if (!SOLID_PROPS.has(p.id)) continue;
    const key = p.y * grid.width + p.x;
    if (grid.at(p.x, p.y) !== FLOOR || spared.has(key) || grid.solid[key]) continue;
    grid.solid[key] = 1;
    const seen = reachable(grid, must[0]);
    if (must.some((v) => !seen.has(v.y * grid.width + v.x))) grid.solid[key] = 0;
  }
}

/** How often a tile of each kind takes something. What reads as a cavern is
 *  the FOOT of the rock, so open floor stays nearly bare. */
const EDGE_RATE = { face: 0.17, fringe: 0.34, open: 0.07 };

/**
 * The rock's own leavings, a tile at a time — debris and growth against the
 * wall, and what hangs on the face above it. Over the WHOLE grid rather than
 * the rectangles, so a corridor is dressed like a chamber: a bare passage
 * between two furnished rooms reads as the seam between them.
 *
 * A `WALL_PROPS` entry is the one thing placed into rock, deliberately: the
 * cell above a floor tile with rock over IT is the cut face, and that is the
 * only surface in the game seen from the side.
 */
export function dressEdges(
  grid: Grid,
  rng: Rng,
  keep: Vec2[] = [],
  plain: Room[] = []
): MapProp[] {
  const out: MapProp[] = [];
  const taken = new Set(keep.map((v) => v.y * grid.width + v.x));
  const authored = (x: number, y: number): boolean =>
    plain.some((r) => x >= r.x - 1 && y >= r.y - 1 && x < r.x + r.w + 1 && y < r.y + r.h + 1);

  for (let y = 2; y < grid.height - 1; y++) {
    for (let x = 1; x < grid.width - 1; x++) {
      if (grid.at(x, y) === WALL || authored(x, y)) continue;
      const rock = (dx: number, dy: number) => grid.at(x + dx, y + dy) === WALL;
      // A RUN of wall, never a nub: something hanging off a one-tile island in
      // the middle of a room reads as a light fixture floating in mid air.
      const face =
        rock(0, -1) &&
        rock(0, -2) &&
        (rock(-1, -1) || rock(1, -1)) &&
        !taken.has((y - 1) * grid.width + x);
      const against = rock(-1, 0) || rock(1, 0) || rock(0, 1) || rock(0, -1);
      const rate = face ? EDGE_RATE.face + EDGE_RATE.fringe : against ? EDGE_RATE.fringe : EDGE_RATE.open;
      if (!rng.chance(rate)) continue;
      // A face tile can take either, and mostly takes the fringe: a wall with
      // something hanging on every reachable stretch of it is a gallery.
      const onFace = face && rng.chance(EDGE_RATE.face / (EDGE_RATE.face + EDGE_RATE.fringe));
      const table = onFace ? WALL_PROPS : against ? FRINGE_PROPS : LOOSE_PROPS;
      const at = { x, y: onFace ? y - 1 : y };
      const key = at.y * grid.width + at.x;
      if (taken.has(key)) continue;
      taken.add(key);
      out.push({ id: weighted(table, rng.next()), ...at });
    }
  }
  return out;
}

/** One corridor tile, leaving a permanent wall border. Only ever writes into
 *  rock, or a passage would relabel the middle of the chamber it joins. */
function carve(grid: Grid, x: number, y: number): void {
  if (x < 1 || y < 1 || x >= grid.width - 1 || y >= grid.height - 1) return;
  if (grid.at(x, y) === WALL) grid.set(x, y, TUNNEL);
}

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

/** A passage PINCHES along its run. Never below two, for the reason `drift`
 *  steps by one — and because collision turns a one-tile hall into a queue. */
function widthAt(base: number, x: number, y: number): number {
  return Math.max(2, base - (tileNoise(x, y, 60) < 0.4 ? 1 : 0));
}

function hLine(grid: Grid, x0: number, x1: number, y: number, w: number, wobble = 0): void {
  let off = 0;
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
    off = drift(off, x, y, wobble);
    for (const d of band(widthAt(w, x, y))) carve(grid, x, y + off + d);
  }
}

function vLine(grid: Grid, y0: number, y1: number, x: number, w: number, wobble = 0): void {
  let off = 0;
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
    off = drift(off, x, y, wobble);
    for (const d of band(widthAt(w, x, y))) carve(grid, x + off + d, y);
  }
}

/** L-shaped: both legs always carve and the seed picks their ORDER. A wandering
 *  world drifts across them; it never drops one, since connectivity is the one
 *  thing a passage owes the run. */
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
      if (!grid.walkable(nx, ny)) continue;
      const nk = ny * grid.width + nx;
      if (seen.has(nk)) continue;
      seen.add(nk);
      queue.push(nk);
    }
  }
  return seen;
}

/** Rooms joined by corridors. `layoutComplexity` off the crystal and the
 *  tier's own `sizeScale` both drive the map's size and its room count, so "of
 *  Winding Ways" and a deeper tier each produce a genuinely longer walk. */
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

  // Attempts scale with the target: a bigger map needs more tries to fill.
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

  return { grid, rooms, entrance, exit, props: [], vein, theme };
}

/**
 * The map an authored room is: ONE chamber, cut the way its world cuts, with
 * the hole you came up out of and nothing else. Beside `generateMap` rather
 * than a flag on it, and sharing `carveRoom` — the part that makes a scene the
 * same rock as a descent. The plan is absolute tiles and every roll is off a
 * fixed seed, so a room is the same room every time it is entered.
 */
export function sceneMap(
  plan: ScenePlan,
  theme: MapTheme,
  vein = 1,
  ground?: string
): GameMap {
  // `also` is more chambers, cut the same way. Where they do not touch they
  // are JOINED by the same wandering corridor a descent is joined by, so a
  // scene can be a winding cavern rather than one hall — the rng is fixed,
  // because a place you come up in is the same place every time.
  const rooms = [plan.room, ...(plan.also ?? [])];
  const grid = new Grid(
    Math.max(...rooms.map((r) => r.x + r.w)) + 2,
    Math.max(...rooms.map((r) => r.y + r.h)) + 2
  );
  const cut = plan.cut ?? CUT[theme] ?? 'dug';
  const spare = [...plan.props, plan.entrance, plan.stands, ...(plan.patrol ?? [])];
  for (const r of rooms) carveRoom(grid, r, cut, spare);
  if (plan.joins) {
    const rng = new Rng(1);
    for (const [a, b] of plan.joins) {
      if (rooms[a] && rooms[b]) {
        carveCorridor(grid, roomCenter(rooms[a]), roomCenter(rooms[b]), rng, WOBBLE[cut]);
      }
    }
  }

  const entrance = { x: Math.round(plan.entrance.x), y: Math.round(plan.entrance.y) };
  grid.set(entrance.x, entrance.y, ENTRANCE);

  // The exit IS the entrance. `GameMap` requires one, a scene has nothing to
  // walk to, and one tile carrying both means nothing draws a second hole.
  const props = [...plan.props];
  if (plan.dress) {
    const plain = plan.plain ?? [];
    const spare = [...plan.props, entrance, plan.stands, ...(plan.busy ?? [])];
    const loose = rooms.filter((r) => !plain.includes(r));
    props.push(...dressRooms(grid, loose, new Rng(2), plan.dress, spare));
    // After the arrangements, so nothing gathers where one of them stands.
    props.push(...dressEdges(grid, new Rng(3), [...spare, ...props], plain));
  }
  block(grid, props, [entrance, plan.stands, ...(plan.busy ?? []), ...(plan.patrol ?? [])]);
  return { grid, rooms, entrance, exit: entrance, props, vein, theme, ground };
}
