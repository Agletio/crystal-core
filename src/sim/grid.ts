/**
 * Map geometry. Nothing in src/sim touches the DOM, so the whole sim runs in
 * Node and the harnesses can assert on it. Map shape comes off the crystal's own
 * mods through the same computeStat path the character uses.
 */
import { Rng } from '../rng';
import { computeStat } from '../mods';
import { patchNoise, tileNoise } from '../noise';
import type { MapTheme, RolledMod } from '../types';
import type { ScenePlan } from '../scenes';
import {
  COVER_PROPS,
  COVER_RATE,
  COVER_SET,
  SOLID_PROPS,
  VIGNETTES,
  WALL_PROPS,
  weighted,
} from '../vignettes';
import { ZONES } from '../render/generated-tiles';
import { FACE_FOOT, FOOT } from '../vignettes';
import type { Vignette } from '../vignettes';

export interface Vec2 {
  x: number;
  y: number;
}

export const WALL = 0;
export const FLOOR = 1;
export const LANDMARK_REACH = 4; // how far a LANDMARK moves to find clear floor

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
   *  under an altar is still floor and every renderer keys off `tiles`. */
  readonly solid: Uint8Array;
  /** WHAT THE FLOOR IS MADE OF: 1-based into `GameMap.patches`, 0 for the
   *  zone's own — a layer, since a pool is still floor to the carve. */
  readonly patch: Uint8Array;
  /** Which of those block. On the grid so `walkable` takes no argument. */
  blocking: boolean[] = [];
  /** The TEST LEVEL's rule: every cell of a blocking patch blocks, where a
   *  world's lake blocks only its deep and its wreath walks. */
  wholeLakes = false;


  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.tiles = new Uint8Array(width * height); // all WALL
    this.solid = new Uint8Array(width * height);
    this.patch = new Uint8Array(width * height);
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

  /** Walls block; everything else is walkable, sampled at the rounded tile.
   *  WATER IS NOT WALKABLE and this is the ONE place it is decided — `findPath`
   *  once tested `tiles`, walked the hero onto a brazier, and every repath came
   *  back empty for the rest of a descent that never ended. */
  walkable(x: number, y: number): boolean {
    const tx = Math.round(x);
    const ty = Math.round(y);
    if (!this.inBounds(tx, ty)) return false;
    const at = ty * this.width + tx;
    const tile = this.tiles[at];
    if (tile === WALL || this.solid[at]) return false;
    return this.wholeLakes ? !this.wet(tx, ty) : !this.deep(tx, ty);
  }

  /** A cell of a blocking patch, whether or not it walks. */
  wet(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return false;
    const patch = this.patch[y * this.width + x];
    return patch !== 0 && !!this.blocking[patch - 1];
  }

  /** The DEEP of a blocking patch: a cell of it with the patch on all four
   *  sides. Its ring is the wreath, walked and drawn as the shore, which is
   *  what lets water lie against a wall and still leave a way round. Three
   *  sides broke the ring against a wall and most lakes were refused. */
  deep(x: number, y: number): boolean {
    const patch = this.patch[y * this.width + x];
    if (patch === 0 || !this.blocking[patch - 1]) return false;
    for (const [dx, dy] of N4) {
      if (!this.inBounds(x + dx, y + dy) || this.patch[(y + dy) * this.width + x + dx] !== patch) return false;
    }
    return true;
  }

  /** Whether a BODY of this radius fits, not whether its centre does. Tile n
   *  covers [n-0.5, n+0.5], so a body spans the tiles its extent rounds to. */
  fits(x: number, y: number, radius: number): boolean {
    const r = Math.min(radius, BODY_MAX);
    for (let ty = Math.round(y - r); ty <= Math.round(y + r); ty++) {
      for (let tx = Math.round(x - r); tx <= Math.round(x + r); tx++) {
        if (!this.walkable(tx, ty)) return false;
      }
    }
    // A tile with rock to the NORTH is walkable across its FOOT and not
    // across the face hanging into it: higher, and the feet it draws are in it.
    const ty = Math.round(y);
    const above = this.at(Math.round(x), ty - 1);
    if (y < ty - FACE_LIP && above === WALL) return false;
    return true;
  }
}

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
const N8 = [
  [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1],
] as const;

/** Under half a tile, so a rank-scaled body can still walk a one-tile gap. */
const BODY_MAX = 0.45;

/** How far above its tile's CENTRE a body may stand with rock north of it. A
 *  tile centre always fits, so nothing is made unreachable. */
export const FACE_LIP = FOOT - FACE_FOOT;


/** Sampled along the segment, not Bresenham: entities sit at fractional
 *  positions and the step is well under a tile. */
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
  /** Draw no ground of the zone's own: a scene brings its own surface. */
  bare?: boolean;
  /** The patch sets on this map, in `Grid.patch`'s own 1-based order. */
  patches: string[];
  /** A designed floor: no light drift, no grain — one tile, flat. */
  plain?: boolean;
  /** Which generated tileset that surface is, when there is one. */
  zone?: string;
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

/** Which generated tileset a zone's whole surface is. A theme with one draws
 *  no rock of its own: a tileset IS the surface, and the zone's flagstones
 *  stamped over it is two floors at once. */
export const ZONE: Partial<Record<MapTheme, string>> = {
  fissure: 'lit_round',
  demonic: 'rot2_ragged', // the user's pick; the name records the ask it came from
  prismatic: 'cavern_round',
  seam: 'seam_pro',
};


/** THE TEST LEVEL: a map only the dev menu reaches, on a tileset family of its
 *  own, where a level design is worked out before any world takes it. Its
 *  WATER IS WHOLE — every cell of a lake blocks and it is fished from the bank,
 *  where the worlds' keep a walkable wreath — and a lake keeps `LAKE_SHORE`
 *  cells of plain floor all round it, clear of any rock face. */
export interface LevelDesign {
  zone: string;
  /** Chambers big enough to seat a whole lake with a bank all round: at the
   *  worlds' 5–9 by 4–7, two maps in forty could. */
  room: { w: [number, number]; h: [number, number] };
  /** The map grows with its chambers, or the same packs land in half the
   *  rooms: at the worlds' size the bigger chambers seated 3.9 rooms to 7. */
  scale: number;
  lake: { set: string; blocks: boolean; chance: number; count: [number, number]; least: number; most: number };
}

export const TEST_LEVEL: LevelDesign = {
  zone: 'test_round',
  room: { w: [10, 16], h: [7, 12] },
  scale: 1.7,
  lake: { set: 'test_pool', blocks: true, chance: 0.6, count: [1, 2], least: 20, most: 80 },
};
export const LAKE_SHORE = 1;

/** WHICH WORLDS HAVE TAKEN THE TEST LEVEL'S DESIGN — *"then you can push to
 *  the main fissure levels."* A world here draws no light drift and no grain:
 *  a per-cell tint is a hard line at every cell, and that is what he saw. */
export const DESIGN: Partial<Record<MapTheme, LevelDesign>> = {
  fissure: TEST_LEVEL,
};

let forcedTest = false;
export function testLevel(on: boolean): void {
  forcedTest = on;
}
const designFor = (theme: MapTheme): LevelDesign | undefined => (forcedTest ? TEST_LEVEL : DESIGN[theme]);

/** THREE FLOOR LEVELS: rock 3, walkable floor 2, anything LOWER 1. **LEVEL 1
 *  IS NEVER WALKABLE**, so every entry blocks and a zone gets one or two. */
export interface PatchDef {
  set: string;
  blocks?: boolean;
  most: number; // tiles at most: something to walk round, never a second wall
  count: number;
}

export const PATCHES: Partial<Record<MapTheme, PatchDef[]>> = {
  // A LAKE: its DEEP blocks and its wreath walks, so `most` is the whole blob
  // and a pool of it lies against the wall with a way round still there.
  fissure: [{ set: 'fissure_pool', blocks: true, most: 40, count: 7 }],
  demonic: [{ set: 'rot_blood', blocks: true, most: 36, count: 6 }],
  prismatic: [{ set: 'cavern_pool', blocks: true, most: 40, count: 7 }],
  seam: [
    { set: 'seam_lava', blocks: true, most: 32, count: 4 },
    { set: 'seam_pool', blocks: true, most: 32, count: 4 },
  ],
};

/** LEVEL 2: the walkable floor in another MATERIAL with a real edge. Nothing
 *  here ever blocks. Empty: a region of another grain drew as a hard-edged
 *  rectangle, and the grain is per cell now (`grainAt`). */
export const FLOORS: Partial<Record<MapTheme, PatchDef[]>> = {};

/** Both, level 1 first, in the order `Grid.patch` indexes them. */
export const patchesFor = (theme: MapTheme): PatchDef[] =>
  [...(PATCHES[theme] ?? []), ...(FLOORS[theme] ?? [])];

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
      r: 1.0 + tileNoise(r.x + i, r.y + i, 58) * 0.4, // never under 1: a one-cell island is a barrel
    };
    // Never over what a room was authored around: a hand-placed prop is a fact
    // about the room and an island is the carve being interesting.
    if (spare.some((v) => (v.x - at.x) ** 2 + (v.y - at.y) ** 2 < (at.r + 0.5) ** 2)) continue;
    out.push(at);
  }
  return out;
}

/** A room, cut the way its world cuts. The `Room` RECTANGLE never changes —
 *  every spawn, the entrance and the exit are placed off it. `mark` records
 *  which room a cell was cut for. */
function carveRoom(
  grid: Grid,
  r: Room,
  cut: Cut,
  spare: Vec2[] = [],
  fill = FLOOR,
  mark?: { of: Uint8Array; index: number }
): void {
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
        grid.set(x, y, fill);
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
      // puts a room's authored furniture in the rock.
      const turn = Math.atan2(dy, dx);
      const swell =
        0.11 * (1 + Math.sin(turn * 3 + swellA)) + 0.07 * (1 + Math.sin(turn * 5 + swellB));
      if (d > 0.8 + swell + tileNoise(x, y, 50) * 0.35) continue;
      if (islands.some((i) => (x - i.x) ** 2 + (y - i.y) ** 2 < i.r * i.r)) continue;
      grid.set(x, y, fill);
      if (mark) mark.of[y * grid.width + x] = mark.index;
    }
  }
}

/** One automaton pass over the whole grid, so no run of edge the carve left is
 *  straight: a floor cell with two open neighbours or fewer is a nub and goes,
 *  rock with six or more is a notch and opens. Never the border. */
function erode(grid: Grid): void {
  const next = new Uint8Array(grid.tiles);
  for (let y = 1; y < grid.height - 1; y++) {
    for (let x = 1; x < grid.width - 1; x++) {
      let open = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && grid.at(x + dx, y + dy) !== WALL) open++;
      }
      const at = y * grid.width + x;
      if (grid.tiles[at] !== WALL && open <= 2) next[at] = WALL;
      else if (grid.tiles[at] === WALL && open >= 6) next[at] = FLOOR;
    }
  }
  grid.tiles.set(next);
}

const ground = (tile: number): boolean => tile === FLOOR || tile === TUNNEL;

/** How many of a cell's eight neighbours stand high. */
export const isRock = (tile: number): boolean => tile === WALL;

/** A CORNER's value under a solidity — 1 where all four cells round it are
 *  solid, 2 where the corner one row above is (the FACE hangs into the cell
 *  below, so a wall spans two rows), 0 otherwise. */
export function cornerOf(grid: Grid, cx: number, cy: number, solid: (tile: number) => boolean): number {
  const whole = (px: number, py: number): boolean =>
    solid(grid.at(px - 1, py - 1)) && solid(grid.at(px, py - 1)) &&
    solid(grid.at(px - 1, py)) && solid(grid.at(px, py));
  return whole(cx, cy) ? 1 : whole(cx, cy - 1) ? 2 : 0;
}

/** A cell's four CORNERS in base three — 0 floor, 1 solid, 2 the cut face — the
 *  key a generated tileset is indexed by. Here rather than in a renderer
 *  because the GRID answers it too: what a set cannot draw it must not make. */
export function wangKey(grid: Grid, x: number, y: number, solid: (tile: number) => boolean = isRock): number {
  const one = (cx: number, cy: number): number => cornerOf(grid, cx, cy, solid);
  return ((one(x, y) * 3 + one(x + 1, y)) * 3 + one(x, y + 1)) * 3 + one(x + 1, y + 1);
}

/** A PATCH's own corners, same base three: its set was asked with the terrain
 *  as the LOWER, so a corner inside is 0 — inverted from the rock. */
export function patchKey(grid: Grid, x: number, y: number, index: number): number {
  const on = (cx: number, cy: number): boolean =>
    grid.inBounds(cx, cy) && grid.patch[cy * grid.width + cx] === index;
  const one = (cx: number, cy: number): number =>
    on(cx - 1, cy - 1) && on(cx, cy - 1) && on(cx - 1, cy) && on(cx, cy) ? 0 : 1;
  return ((one(x, y) * 3 + one(x + 1, y)) * 3 + one(x, y + 1)) * 3 + one(x + 1, y + 1);
}

export function patchesAt(grid: Grid, x: number, y: number): number[] {
  const seen = new Set<number>();
  for (let cy = y - 1; cy <= y + 1; cy++) {
    for (let cx = x - 1; cx <= x + 1; cx++) {
      if (!grid.inBounds(cx, cy)) continue;
      const at = grid.patch[cy * grid.width + cx];
      if (at !== 0) seen.add(at);
    }
  }
  return [...seen];
}

/** A ONE-TILE PLUG IS A DOOR THE PICTURE ALREADY DREW: a WALL cell with floor
 *  both sides, stone drawing its own head as pale ground. Measured over 24
 *  maps, all 719 REAL channels are walked straight through, against 1122 plugs
 *  that only look like one; of 540, 454 are dimples, 86 short cuts worth a
 *  median 8 tiles, NONE the only way through. */
function openPlugs(grid: Grid): number {
  let opened = 0;
  // Opening one makes its neighbours' sides floor, so it runs to a fixed point.
  for (let pass = 0; pass < 12; pass++) {
    let cut = 0;
    for (let y = 1; y < grid.height - 1; y++) {
      for (let x = 1; x < grid.width - 1; x++) {
        if (grid.at(x, y) !== WALL) continue;
        const lr = grid.walkable(x - 1, y) && grid.walkable(x + 1, y);
        const ud = grid.walkable(x, y - 1) && grid.walkable(x, y + 1);
        if (lr || ud) { grid.set(x, y, FLOOR); cut++; }
      }
    }
    opened += cut;
    if (cut === 0) break;
  }
  return opened;
}

/** Rock a generated SET cannot draw, opened until none is left: a set answers
 *  21 of the 81 corner keys, and what it lacks is shapes its terrain model
 *  never makes. Only ever OPENS rock, and runs to a fixed point. */
function fitCorners(grid: Grid, zone: string): void {
  const set = ZONES[zone];
  if (!set) return;
  const known = new Set(set.tiles.map((t) => t.key));
  for (let pass = 0; pass < 12; pass++) {
    let opened = 0;
    for (let y = -1; y <= grid.height; y++) {
      for (let x = -1; x <= grid.width; x++) {
        if (known.has(wangKey(grid, x, y))) continue;
        // Only a cell TOUCHING floor is opened, so the hole widens a room
        // rather than appearing in the middle of the stone; measured, nothing
        // needs the other kind. Never the border ring, which is the one wall
        // holding the hero in.
        let done = false;
        for (let dy = -1; dy <= 1 && !done; dy++) {
          for (let dx = -1; dx <= 1 && !done; dx++) {
            const cx = x + dx;
            const cy = y + dy;
            if (cx < 1 || cy < 1 || cx >= grid.width - 1 || cy >= grid.height - 1) continue;
            if (grid.at(cx, cy) !== WALL) continue;
            if (
              grid.at(cx - 1, cy) === WALL && grid.at(cx + 1, cy) === WALL &&
              grid.at(cx, cy - 1) === WALL && grid.at(cx, cy + 1) === WALL
            ) {
              continue;
            }
            grid.set(cx, cy, FLOOR);
            if (known.has(wangKey(grid, x, y))) {
              opened++;
              done = true;
            } else {
              grid.set(cx, cy, WALL);
            }
          }
        }
      }
    }
    if (opened === 0) return;
  }
}

/** The footprint an arrangement has to beat to count as one worth the room. */
const BIG = 12;

/** Furniture, a CLUSTER at a time: dropped one at a time a prop reads as one,
 *  equally far from everything and there for no reason. NOTHING CALLS IT: a
 *  descent is what the rock did, and what a person left is placed by hand in a
 *  scene. It is the only thing that knows how to fit one into a grown room. */
export function dressRooms(
  grid: Grid,
  rooms: Room[],
  rng: Rng,
  per = 2,
  keep: Vec2[] = []
): MapProp[] {
  const out: MapProp[] = [];
  // Over the hole, or over a hand-placed prop, is furniture on furniture.
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

  /** A spot in the room, and then what fits IN it: picking the arrangement first
   *  leaves a chamber bare, since a ragged ellipse holds a four-tile square in
   *  about one spot in fifteen. */
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
 *  the hero stands still in forever, and no altar is worth that. */
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

/** A BLOB grown off a seed, ragged at the edge. A tile the map MUST reach is
 *  never taken. */
function growPatch(
  grid: Grid,
  rng: Rng,
  index: number,
  def: { most: number },
  keep: Set<number>,
  ring: Set<number>,
  from: Vec2,
  fits: (x: number, y: number) => boolean = () => true,
  round = false // nearest the seed first, so the blob is a disc that survives fattening
): number[] {
  const taken: number[] = [];
  const edge: Vec2[] = [from];
  const seen = new Set<number>();
  while (edge.length > 0 && taken.length < def.most) {
    let pick = rng.int(0, edge.length - 1);
    if (round) {
      pick = 0;
      for (let i = 1; i < edge.length; i++) if (dist(edge[i], from) < dist(edge[pick], from)) pick = i;
    }
    const at = edge.splice(pick, 1)[0];
    const key = at.y * grid.width + at.x;
    if (seen.has(key)) continue;
    seen.add(key);
    // The GROUND only: a patch over a landmark hides the way out.
    if (grid.at(at.x, at.y) !== FLOOR || grid.patch[key] !== 0 || !fits(at.x, at.y)) continue;
    // The hole and the way out keep a dry ring — one standing in a pond is a
    // hole in the water. A room's middle keeps only its own cell: the wreath
    // beside a lock walks, so the chest is still reached.
    if (keep.has(key)) continue;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) {
      for (let dx = -1; dx <= 1; dx++) if (ring.has((at.y + dy) * grid.width + at.x + dx)) near = true;
    }
    if (near) continue;
    grid.patch[key] = index;
    taken.push(key);
    for (const [dx, dy] of N4) edge.push({ x: at.x + dx, y: at.y + dy });
  }
  return taken;
}

/** A floor tile to grow a patch from. BIGGEST CHAMBERS FIRST, and a DRY room
 *  before one that already holds water, since a fishing spot needs a pool in
 *  its OWN room. */
function seedFor(
  grid: Grid,
  rng: Rng,
  rooms: Room[],
  fits: (x: number, y: number) => boolean = (x, y) => offRock(grid, x, y) >= 2
): Vec2 | null {
  const roomy = [...rooms].sort((a, b) => b.w * b.h - a.w * a.h);
  const dry = roomy.filter((r) => !holdsPatch(grid, r));
  for (const list of [dry.length > 0 ? dry : roomy, roomy]) {
    for (let tries = 0; tries < 30; tries++) {
      const room = list[rng.int(0, Math.max(0, Math.min(list.length, 5) - 1))];
      if (!room) continue;
      const at = {
        x: room.x + rng.int(0, Math.max(0, room.w - 1)),
        y: room.y + rng.int(0, Math.max(0, room.h - 1)),
      };
      // Seeded a tile in from the rock, so the deep has somewhere to be.
      if (grid.at(at.x, at.y) === FLOOR && fits(at.x, at.y)) return at;
    }
  }
  return null;
}

/** Whether any of this room already carries a patch. */
function holdsPatch(grid: Grid, room: Room): boolean {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (grid.inBounds(x, y) && grid.patch[y * grid.width + x] !== 0) return true;
    }
  }
  return false;
}

/** Laid after the props, undone WHOLE: half a pool is a shape nothing draws. */
function placePatches(
  grid: Grid,
  rng: Rng,
  theme: MapTheme,
  rooms: Room[],
  keep: Vec2[]
): string[] {
  const defs = patchesFor(theme);
  if (defs.length === 0) return [];
  const spared = new Set(keep.map((v) => v.y * grid.width + v.x));
  const ringed = new Set(keep.slice(0, 2).map((v) => v.y * grid.width + v.x));
  grid.blocking = defs.map((d) => !!d.blocks);
  // EVERY REACHABLE TILE, not just the landmarks: a monster stranded in a
  // pocket a pool cut off is a descent that never ends.
  let open = reachable(grid, keep[0]).size;

  const deepAll = (): number => {
    let n = 0;
    for (let y = 0; y < grid.height; y++) for (let x = 0; x < grid.width; x++) if (grid.deep(x, y)) n++;
    return n;
  };
  defs.forEach((def, i) => {
    for (let n = 0; n < def.count; n++) {
      const from = seedFor(grid, rng, rooms);
      if (!from) continue;
      const was = deepAll();
      const taken = growPatch(grid, rng, i + 1, def, spared, ringed, from);
      if (taken.length === 0 || !def.blocks) continue;
      // Exactly its DEEP may go, and nothing behind it — Brogue's rule: a lake
      // that strands a dry cell is refused whole. A blob with no deep is a
      // puddle and goes too. Counted over the WHOLE grid: a blob that meets an
      // older lake of the same set deepens that lake's wreath as well.
      const deep = deepAll() - was;
      const now = reachable(grid, keep[0]).size;
      if (deep < 3 || now !== open - deep) {
        for (const key of taken) grid.patch[key] = 0;
      } else {
        open = now;
      }
    }
  });
  return defs.map((d) => d.set);
}

/** Whether a cell may take a SHORE tile: plain dry ground wearing the zone's
 *  own floor tile, so a lake's edge is the only thing drawn there. The same
 *  question the demo asks of every test lake. */
export function shoreClear(grid: Grid, x: number, y: number): boolean {
  const tile = grid.at(x, y);
  if (tile !== FLOOR && tile !== TUNNEL && tile !== ENTRANCE && tile !== EXIT) return false;
  return wangKey(grid, x, y) === 0;
}

function shoreFits(grid: Grid, x: number, y: number): boolean {
  for (let dy = -LAKE_SHORE; dy <= LAKE_SHORE; dy++) {
    for (let dx = -LAKE_SHORE; dx <= LAKE_SHORE; dx++) if (!shoreClear(grid, x + dx, y + dy)) return false;
  }
  return true;
}

/** THE TEST LEVEL'S LAKES: whole, off the rock, refused if they strand a cell
 *  or come out a puddle. The roll for how many is taken whatever it says, so a
 *  dry map moves no draw the next one reads. */
function placeLakes(grid: Grid, rng: Rng, rooms: Room[], keep: Vec2[], def: LevelDesign['lake']): string[] {
  const spared = new Set(keep.map((v) => v.y * grid.width + v.x));
  const ringed = new Set(keep.slice(0, 2).map((v) => v.y * grid.width + v.x));
  grid.blocking = [def.blocks];
  grid.wholeLakes = true;
  let open = reachable(grid, keep[0]).size;
  const lakes = rng.next() < def.chance ? rng.int(def.count[0], def.count[1]) : 0;
  const fits = (x: number, y: number) => shoreFits(grid, x, y) && !encloses(grid, x, y);
  for (let n = 0; n < lakes; n++) {
    // A seed lands where little fits as often as not, so a lake tries a few.
    for (let tries = 0; tries < 12; tries++) {
      const from = seedFor(grid, rng, rooms, fits);
      if (!from) break;
      const taken = fatten(grid, growPatch(grid, rng, 1, def, spared, ringed, from, fits, true));
      const now = reachable(grid, keep[0]).size;
      if (taken.length >= def.least && now === open - taken.length) {
        open = now;
        break;
      }
      for (const key of taken) grid.patch[key] = 0;
    }
  }
  return [def.set];
}

/** Whether taking this cell for water would split the dry ground round it:
 *  the eight neighbours walked as a ring, and the dry ones in more than one
 *  run means a room's middle or a corridor's mouth about to be cut off. */
/** A LAKE IS DRAWN AT ITS CORNERS: a corner tile shows water only where all
 *  four cells round it are wet, so a run of cells draws one tile narrower
 *  than it is, and a one-cell arm blocks and draws nothing. Every cell kept
 *  sits in a full `LAKE_FAT` square — three, so the water drawn is never
 *  under two tiles wide and a ripple has a cell drawn wholly as water to sit
 *  on. The rest is handed back. */
export const LAKE_FAT = 3;
function fatten(grid: Grid, taken: number[]): number[] {
  const wet = (x: number, y: number) => grid.inBounds(x, y) && grid.patch[y * grid.width + x] !== 0;
  const square = (x: number, y: number) => {
    for (let dy = 0; dy < LAKE_FAT; dy++) for (let dx = 0; dx < LAKE_FAT; dx++) if (!wet(x + dx, y + dy)) return false;
    return true;
  };
  let kept = taken;
  for (let pass = 0; pass < 64; pass++) {
    const thin = kept.filter((key) => {
      const x = key % grid.width;
      const y = Math.floor(key / grid.width);
      for (let dy = 1 - LAKE_FAT; dy <= 0; dy++) for (let dx = 1 - LAKE_FAT; dx <= 0; dx++) if (square(x + dx, y + dy)) return false;
      return true;
    });
    if (thin.length === 0) break;
    for (const key of thin) grid.patch[key] = 0;
    kept = kept.filter((key) => grid.patch[key] !== 0);
  }
  // Thinning can cut a blob in two; the biggest piece is the lake.
  const left = new Set(kept);
  let biggest: number[] = [];
  while (left.size > 0) {
    const piece: number[] = [];
    const edge = [left.values().next().value as number];
    left.delete(edge[0]);
    while (edge.length > 0) {
      const key = edge.pop()!;
      piece.push(key);
      for (const step of [1, -1, grid.width, -grid.width]) {
        const next = key + step;
        if (left.has(next)) {
          left.delete(next);
          edge.push(next);
        }
      }
    }
    if (piece.length > biggest.length) biggest = piece;
  }
  for (const key of kept) if (!biggest.includes(key)) grid.patch[key] = 0;
  return biggest;
}

function encloses(grid: Grid, x: number, y: number): boolean {
  const ring = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]] as const;
  const dry = ring.map(([dx, dy]) => grid.walkable(x + dx, y + dy));
  let runs = 0;
  for (let i = 0; i < 8; i++) if (dry[i] && !dry[(i + 7) % 8]) runs++;
  return runs > 1;
}

/** WHERE A FAMILY GROWS, by rule, within a room's rectangle: ore ON OPEN FLOOR
 *  clear of every wall — *"have it not placed inside walls"*: no rock within
 *  two cells, none within three to the north, where a face hangs down over the
 *  cell a picture grows up into — and herbs on damp floor beside water. A
 *  scan, never a draw, so asking moves nothing else. */
export function openSpots(grid: Grid, room: Room): Vec2[] {
  const out: Vec2[] = [];
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (!grid.walkable(x, y)) continue;
      let clear = true;
      for (let dy = -3; dy <= 2 && clear; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const t = grid.at(x + dx, y + dy);
          if (t !== FLOOR && t !== TUNNEL && t !== ENTRANCE && t !== EXIT) clear = false;
        }
      }
      if (clear) out.push({ x, y });
    }
  }
  return out;
}

export function dampSpots(grid: Grid, room: Room): Vec2[] {
  const out: Vec2[] = [];
  const wet = (x: number, y: number): boolean => {
    if (!grid.inBounds(x, y)) return false;
    const patch = grid.patch[y * grid.width + x];
    return patch !== 0 && !!grid.blocking[patch - 1];
  };
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (!grid.walkable(x, y) || wet(x, y) || !N4.some(([dx, dy]) => wet(x + dx, y + dy))) continue;
      out.push({ x, y });
    }
  }
  return out;
}

/** Tiles to the nearest rock, capped at what `COVER_RATE` indexes. */
function offRock(grid: Grid, x: number, y: number): number {
  for (let r = 1; r < COVER_RATE.length; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r && grid.at(x + dx, y + dy) === WALL) return r;
      }
    }
  }
  return COVER_RATE.length;
}

/** Where cover may land at all: below `cut` of a slow noise, nothing. */
const COVER_MASK = { scale: 5, cut: 0.38 };

/** Loose stone and dust, DRIFTED at the foot of the rock and thinning to almost
 *  nothing in the open. It claims no tile, so nothing is asked. */
export function coverFloor(grid: Grid, rng: Rng): MapProp[] {
  const out: MapProp[] = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (!grid.walkable(x, y) && grid.at(x, y) !== FLOOR) continue;
      const above = grid.at(x, y - 1); // it DRAWS the face: stone would land up the wall
      if (above === WALL) continue;
      // Under a MASK, so what lands lands in clumps: a flat rate is graph paper
      // at a coarser scale. The draw is still made, so the mask moves nothing.
      const roll = rng.chance(COVER_RATE[offRock(grid, x, y) - 1]);
      if (!roll || patchNoise(x, y, COVER_MASK.scale, 64) < COVER_MASK.cut) continue;
      out.push({ id: weighted(COVER_PROPS, rng.next()), x, y });
    }
  }
  return out;
}

/** How often a stretch of cut face grows something — the only thing left
 *  standing on a descent, so it carries the wall alone. */
const FACE_RATE = 0.34;

/**
 * What GROWS on the cut face, and the only thing scattered anywhere. There is
 * no floor pass beside it: a room's worth of objects dropped one tile at a time
 * reads as exactly that however the rates are picked, so what a person left is
 * a `Vignette` or is placed by hand.
 */
export function dressWalls(grid: Grid, rng: Rng, keep: Vec2[] = [], plain: Room[] = []): MapProp[] {
  const out: MapProp[] = [];
  const taken = new Set(keep.map((v) => v.y * grid.width + v.x));
  const authored = (x: number, y: number): boolean =>
    plain.some((r) => x >= r.x - 1 && y >= r.y - 1 && x < r.x + r.w + 1 && y < r.y + r.h + 1);

  for (let y = 2; y < grid.height - 1; y++) {
    for (let x = 1; x < grid.width - 1; x++) {
      if (!grid.walkable(x, y) || authored(x, y)) continue;
      const rock = (dx: number, dy: number) => grid.at(x + dx, y + dy) === WALL;
      // A RUN of wall, never a nub: something hanging off a one-tile island in
      // the middle of a room reads as a light fixture floating in mid air.
      if (!rock(0, -1) || !rock(0, -2) || (!rock(-1, -1) && !rock(1, -1))) continue;
      const key = (y - 1) * grid.width + x;
      if (taken.has(key) || !rng.chance(FACE_RATE)) continue;
      taken.add(key);
      // On the ROCK cell: the deep sets draw a face TWO rows tall, so growth
      // on the floor cell sat at the wall's foot, over the seam with the
      // ground. One tile up it hangs on the face itself.
      out.push({ id: weighted(WALL_PROPS, rng.next()), x, y: y - 1 });
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

export function reachable(grid: Grid, from: Vec2): Set<number> {
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

  const design = designFor(theme);
  const grown = design?.scale ?? 1;
  const width = clamp(Math.round(42 * grown * Math.sqrt(layout)), 26, 104);
  const height = clamp(Math.round(28 * grown * Math.sqrt(layout)), 20, 70);
  const grid = new Grid(width, height);

  const target = clamp(Math.round(7 * layout), 4, 30);
  const rooms: Room[] = [];

  // Attempts scale with the target: a bigger map needs more tries to fill.
  for (let attempt = 0; attempt < 90 * target && rooms.length < target; attempt++) {
    const w = design ? rng.int(...design.room.w) : rng.int(5, 9);
    const h = design ? rng.int(...design.room.h) : rng.int(4, 7);
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
  // Every descent's chamber is GROWN: an ellipse with headlands and a ragged
  // edge, whatever the world, because a rectangle is what read as built. The
  // world's own cut still shapes its authored rooms and its corridors' wander.
  const roomOf = new Uint8Array(width * height);
  rooms.forEach((room, i) => carveRoom(grid, room, 'grown', [], FLOOR, { of: roomOf, index: i + 1 }));
  for (let i = 1; i < rooms.length; i++) {
    carveCorridor(grid, roomCenter(rooms[i - 1]), roomCenter(rooms[i]), rng, WOBBLE[cut]);
  }
  // A loop or two, so the map is not a chain.
  for (let i = 0; i < Math.floor(rooms.length / 3); i++) {
    carveCorridor(grid, roomCenter(rooms[rng.int(0, rooms.length - 1)]), roomCenter(rooms[rng.int(0, rooms.length - 1)]), rng, WOBBLE[cut]);
  }
  erode(grid);
  for (const room of rooms) {
    const c = roomCenter(room);
    if (grid.at(c.x, c.y) === WALL) carveRoom(grid, room, 'grown');
    // A blob leaves the rectangle's corners as rock and a passage may dig
    // them; what is dug inside the rectangle is the chamber's own.
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) if (grid.at(x, y) === TUNNEL) grid.set(x, y, FLOOR);
    }
  }

  const entrance = clearSpot(grid, roomCenter(rooms[0]));

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
  const exit = clearSpot(grid, roomCenter(exitRoom));

  // An unreachable exit is a hero that stands still forever, which is the worst
  // failure in something you sit and watch. Prove it, and carve if it failed.
  const exitKey = Math.round(exit.y) * grid.width + Math.round(exit.x);
  if (!reachable(grid, entrance).has(exitKey)) {
    carveCorridor(grid, entrance, exit, rng, 0); // straight, whatever the world
  }
  for (const room of rooms) {
    const c = roomCenter(room);
    if (!reachable(grid, entrance).has(c.y * grid.width + c.x)) carveCorridor(grid, entrance, c, rng, 0);
  }

  const zone = design ? design.zone : ZONE[theme];
  // The two chase each other, and both only ever open rock.
  for (let pass = 0; pass < 4; pass++) {
    const opened = openPlugs(grid);
    if (zone) fitCorners(grid, zone);
    if (opened === 0) break;
  }
  // Fitted BEFORE the landmarks: a cell opened beside the hole moves it.
  if (zone) fitCorners(grid, zone);

  grid.set(Math.round(entrance.x), Math.round(entrance.y), ENTRANCE);
  grid.set(Math.round(exit.x), Math.round(exit.y), EXIT);

  // A generated surface is DRESSED and one drawing its own rock is not. Cover
  // and growth are the WHOLE of it: a descent is what the rock did, and nothing
  // stands on its floor.
  const props: MapProp[] = [];
  let patches: string[] = [];
  if (zone) {
    // Its own stream, or dressing a map moves which monsters spawn in it.
    const dress = new Rng(rng.int(1, 1e9));
    // The hole, the way out, and every room's MIDDLE — which is where
    // `placeIn` puts a pack that could not find room.
    const keep = [entrance, exit, ...rooms.map(roomCenter)].map((v) => ({
      x: Math.round(v.x),
      y: Math.round(v.y),
    }));
    props.push(...dressWalls(grid, dress, [...keep, ...props]));
    props.unshift(...coverFloor(grid, dress));
    block(grid, props, keep);
    patches = design ? placeLakes(grid, dress, rooms, keep, design.lake) : placePatches(grid, dress, theme, rooms, keep);
    // Cover was laid before the water and a stone in a lake is a stone in a lake.
    for (let i = props.length - 1; i >= 0; i--) {
      if (COVER_SET.has(props[i].id) && grid.wet(props[i].x, props[i].y)) props.splice(i, 1);
    }
  }

  // PLAIN everywhere: a per-cell tint is a hard line at every cell, and the
  // three shipped sets wore it as a mosaic of rectangles once they were seen.
  return { grid, rooms, entrance, exit, props, vein, theme, bare: !!zone, zone, patches, plain: true };
}

/**
 * The map an authored room is: ONE chamber, cut the way its world cuts, with
 * the hole you came up out of and nothing else. Beside `generateMap` rather
 * than a flag on it, sharing `carveRoom`. The plan is absolute tiles and the
 * cut is hashed off the tile it lands on, so a room is the same room always.
 */
/**
 * The nearest tile with a whole tile of FLOOR on every side of it, for a
 * LANDMARK. The way down is drawn two tiles across and centred on its tile, so
 * one stamped a step from the rock has half of it inside the wall — which is
 * the clipping. Nothing else needs this: a body is a circle and clears rock by
 * its own radius.
 */
export function clearSpot(grid: Grid, want: Vec2): Vec2 {
  const clear = (x: number, y: number): boolean => {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) if (grid.at(x + dx, y + dy) === WALL) return false;
    }
    return true;
  };
  const x0 = Math.round(want.x);
  const y0 = Math.round(want.y);
  if (clear(x0, y0)) return { x: x0, y: y0 };
  for (let r = 1; r <= LANDMARK_REACH; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (clear(x0 + dx, y0 + dy)) return { x: x0 + dx, y: y0 + dy };
      }
    }
  }
  return { x: x0, y: y0 };
}

export function sceneMap(plan: ScenePlan, theme: MapTheme, vein = 1): GameMap {
  // THE WORLD'S OWN FLOOR, design included: an arena on the set a world has
  // moved off is *"a grid of grey squares from another set"*.
  const design = designFor(theme);
  const zone = design ? design.zone : ZONE[theme];
  const rooms = [plan.room];
  const grid = new Grid(plan.room.x + plan.room.w + 2, plan.room.y + plan.room.h + 2);
  const spare = [...plan.props, plan.entrance, plan.stands];
  carveRoom(grid, plan.room, CUT[theme] ?? 'dug', spare);
  if (zone) fitCorners(grid, zone); // or the floor runs up into the wall

  const at = plan.entrance; // NOT nudged: an authored tile is the author's
  const entrance = { x: Math.round(at.x), y: Math.round(at.y) };
  grid.set(entrance.x, entrance.y, ENTRANCE);

  const props = [...plan.props]; // the exit IS the entrance: no second hole
  if (zone) {
    // A FIXED stream, so a place is the same twice; `coverFloor` knows no
    // furniture, so hand-placed tiles come out of it.
    const key = (v: Vec2) => Math.round(v.y) * grid.width + Math.round(v.x);
    const taken = new Set([...plan.props.map(key), key(entrance), key(plan.stands)]);
    props.unshift(...coverFloor(grid, new Rng(9001)).filter((p) => !taken.has(key(p))));
  }
  block(grid, props, [entrance, plan.stands]);
  // An AUTHORED room takes none: what is on its floor is the author's, and a
  // pool grown across a boss arena is the carve overruling them.
  return {
    grid, rooms, entrance, exit: entrance, props, vein, theme, bare: !!zone, zone,
    patches: [], plain: true,
  };
}
