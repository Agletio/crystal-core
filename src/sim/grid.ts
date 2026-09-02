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
/** A RAISED chamber: floor a level up, walkable. Never stacked — one shelf
 *  over the ground and rock over both, so a cell has one height. */
export const SHELF = 5;
/** A shelf's edge band, NOT walkable: with a per-cell `walkable` this is the
 *  whole of what keeps the two levels apart, and every mover, the pathfinder,
 *  line of sight and the separation push read it for nothing. */
export const RIM = 6;
/** A rim cell you climb through, walkable both ways. The floor cell beside it
 *  is the stair's foot and stays what it was. */
export const STAIR = 7;

export const raised = (tile: number): boolean => tile === SHELF || tile === RIM || tile === STAIR;
/** What a shelf's edge is read against: rock stands higher still, so a shelf
 *  against a wall has no rim there and its set draws on under the rock. */
export const high = (tile: number): boolean => raised(tile) || tile === WALL;

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
    if (tile === WALL || tile === RIM || this.solid[at]) return false;
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
    // A tile with rock or a rim to the NORTH is walkable across its FOOT and not
    // across the face hanging into it: higher, and the feet it draws are in it.
    const ty = Math.round(y);
    const above = this.at(Math.round(x), ty - 1);
    if (y < ty - FACE_LIP && (above === WALL || above === RIM)) return false;
    return true;
  }
}

const N4 = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

/** Under half a tile, so a rank-scaled body can still walk a one-tile gap. */
const BODY_MAX = 0.45;

/** How far above its tile's CENTRE a body may stand with rock north of it. A
 *  tile centre always fits, so nothing is made unreachable. */
const FACE_LIP = FOOT - FACE_FOOT;


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
  /** Which rooms stand a level up, by index into `rooms`. */
  raised: number[];
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
  demonic: 'rot_round',
  prismatic: 'cavern_round',
  seam: 'seam_pro',
};

/** The set a SHELF is drawn with: the zone's floor as both terrains, the cliff
 *  tool's full-tile face on every south edge. Keyed exactly as the rock is. */
export const SHELF_SET: Partial<Record<MapTheme, string>> = {
  fissure: 'fissure_shelf',
  demonic: 'rot_shelf',
  prismatic: 'cavern_shelf',
  seam: 'seam_shelf',
};

/** The share of a world's chambers that stand a level up. ZERO SHIPS until a
 *  world has a shelf set AND a stair picture — a rim nobody can see is a line
 *  the hero refuses to cross for no reason. `raiseShare` is the override the
 *  dev kit and the demo force it up with. */
export const RAISE: Record<MapTheme, number> = {
  fissure: 0,
  demonic: 0,
  prismatic: 0,
  seam: 0,
};

let forcedRaise: number | null = null;
export function raiseShare(share: number | null): void {
  forcedRaise = share;
}

/**
 * THE TEST LEVEL: a map only the dev menu reaches, on a tileset family of its
 * own, where the level design is worked out before any world takes it.
 * *"Make a whole new tileset and make a new map that's only accessible in the
 * dev menu. We will use that to test until we get a good level design."*
 * Nothing shipped reads it unless the toggle is on: the generator swaps its
 * surface and its water rules and nothing else.
 *
 * ITS WATER IS WHOLE: every cell of a lake blocks and it is fished from the
 * bank, where the worlds' lakes still keep a walkable wreath. A lake keeps
 * `LAKE_SHORE` cells of plain floor all round it, so a shore tile never shares
 * a cell with a rock face or a shelf.
 */
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
export const isTestLevel = (): boolean => forcedTest;
const designFor = (theme: MapTheme): LevelDesign | undefined => (forcedTest ? TEST_LEVEL : DESIGN[theme]);

/** The smallest interior a shelf keeps; under it the chamber comes back down. */
const SHELF_LEAST = 6;

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
 *  every spawn, the entrance and the exit are placed off it. `mark` records
 *  which room a cell was cut for, which is what a shelf is raised by. */
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

/** Which chambers stand a level up: never the hole's, never the way out's, the
 *  rest on a coin. Every cell cut for one becomes SHELF. */
function raiseRooms(grid: Grid, rooms: Room[], roomOf: Uint8Array, rng: Rng, share: number, skip: Set<number>): number[] {
  const raised: number[] = [];
  if (share <= 0) return raised;
  // Only a chamber with room for an interior inside its rim: a small one
  // comes back down in the fitting and cost its coin for nothing.
  rooms.forEach((r, i) => {
    if (!skip.has(i) && r.w * r.h >= 35 && rng.chance(share)) raised.push(i);
  });
  const lift = new Set(raised.map((i) => i + 1));
  for (let k = 0; k < grid.tiles.length; k++) {
    if (grid.tiles[k] === FLOOR && lift.has(roomOf[k])) grid.tiles[k] = SHELF;
  }
  // Everything open inside the RECTANGLE is the room's too: a corridor that
  // drilled an island and an island the erosion opened are holes otherwise.
  for (const i of raised) {
    const r = rooms[i];
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) if (ground(grid.at(x, y))) grid.set(x, y, SHELF);
    }
  }
  return raised;
}

/** A shelf is a MASS, not a fringe: a ragged edge is all rim and holds no
 *  straight run a stair can stand in. Two majority passes over the raised mask
 *  fill its notches and shed its nubs before the rim is read off it. */
function smoothShelves(grid: Grid, keep: Set<number>): void {
  for (let pass = 0; pass < 2; pass++) {
    const next = new Uint8Array(grid.tiles);
    for (let y = 1; y < grid.height - 1; y++) {
      for (let x = 1; x < grid.width - 1; x++) {
        const at = y * grid.width + x;
        const tile = grid.tiles[at];
        if (tile !== FLOOR && tile !== TUNNEL && tile !== SHELF) continue;
        let up = 0;
        let rock = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const near = grid.at(x + dx, y + dy);
            if (raised(near)) up++;
            else if (near === WALL) rock++;
          }
        }
        // Rock counts toward a notch and never toward a corridor: a passage
        // cell has rock on both sides and one shelf cell behind it.
        if (tile === SHELF && up + rock <= 3) next[at] = FLOOR;
        else if (tile !== SHELF && up >= 3 && up + rock >= 7 && !keep.has(at)) next[at] = SHELF;
      }
    }
    grid.tiles.set(next);
  }
}

/** The RIM is every raised cell with a neighbour, diagonals included, that is
 *  neither raised nor rock. Re-derived whole, since a demotion moves it. */
export function rimShelves(grid: Grid): void {
  for (let k = 0; k < grid.tiles.length; k++) if (grid.tiles[k] === RIM) grid.tiles[k] = SHELF;
  const rim: number[] = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.at(x, y) !== SHELF) continue;
      let edge = false;
      for (let dy = -1; dy <= 1 && !edge; dy++) {
        for (let dx = -1; dx <= 1; dx++) if (!high(grid.at(x + dx, y + dy))) edge = true;
      }
      if (edge) rim.push(y * grid.width + x);
    }
  }
  for (const k of rim) grid.tiles[k] = RIM;
}

/** Every raised cell joined to this one, diagonals included, back to ground. */
function lowerShelf(grid: Grid, from: number): void {
  const queue = [from];
  while (queue.length > 0) {
    const k = queue.pop()!;
    if (!raised(grid.tiles[k])) continue;
    grid.tiles[k] = FLOOR;
    const x = k % grid.width;
    const y = (k - x) / grid.width;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (grid.inBounds(x + dx, y + dy) && raised(grid.at(x + dx, y + dy))) queue.push((y + dy) * grid.width + x + dx);
      }
    }
  }
}

/** How many of a cell's eight neighbours stand high. */
function highAround(grid: Grid, x: number, y: number): number {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && high(grid.at(x + dx, y + dy))) n++;
  }
  return n;
}

/** Rim a shelf set cannot draw, mended until none is left — `fitCorners` for a
 *  shelf. What it lacks is a ONE-CELL STEP in an edge, so the notch beside the
 *  cell is FILLED where a floor cell with the shelf nearly round it exists, and
 *  the cell comes down only otherwise: demoting alone moved the step one cell
 *  along and ate a chamber's south half row by row. A shelf too small to keep
 *  an interior comes down whole. */
function fitShelf(grid: Grid, set: string | undefined): void {
  const known = new Set((set && ZONES[set] ? ZONES[set].tiles : []).map((t) => t.key));
  for (let pass = 0; pass < 16; pass++) {
    rimShelves(grid);
    let mended = 0;
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.at(x, y) !== RIM || known.has(wangKey(grid, x, y, high))) continue;
        const notch = N4.map(([dx, dy]) => ({ x: x + dx, y: y + dy }))
          .filter((n) => grid.at(n.x, n.y) === FLOOR && highAround(grid, n.x, n.y) >= 5)
          .sort((a, b) => highAround(grid, b.x, b.y) - highAround(grid, a.x, a.y))[0];
        if (notch) grid.set(notch.x, notch.y, SHELF);
        else grid.set(x, y, FLOOR);
        mended++;
      }
    }
    if (mended === 0) break;
  }
  for (let k = 0; k < grid.tiles.length; k++) {
    if (grid.tiles[k] !== SHELF) continue;
    let interior = 0;
    const seen = new Set<number>();
    const queue = [k];
    while (queue.length > 0) {
      const at = queue.pop()!;
      if (seen.has(at) || !raised(grid.tiles[at])) continue;
      seen.add(at);
      if (grid.tiles[at] === SHELF) interior++;
      const x = at % grid.width;
      const y = (at - x) / grid.width;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) if (grid.inBounds(x + dx, y + dy)) queue.push((y + dy) * grid.width + x + dx);
      }
    }
    if (interior < SHELF_LEAST) lowerShelf(grid, k);
  }
  rimShelves(grid);
}

type Side = 'n' | 's' | 'e' | 'w';
const SIDE: Record<Side, readonly [number, number]> = { n: [0, -1], s: [0, 1], e: [1, 0], w: [-1, 0] };

/** Whether a rim cell can be a stair down this side: shelf behind it, two
 *  cells of ground in front, and a straight run of rim either side. */
function stairFits(grid: Grid, x: number, y: number, side: Side): boolean {
  const [dx, dy] = SIDE[side];
  if (grid.at(x, y) !== RIM || grid.at(x - dx, y - dy) !== SHELF) return false;
  if (!ground(grid.at(x + dx, y + dy))) return false;
  const beside = (tile: number) => tile === RIM || tile === STAIR || tile === WALL;
  return beside(grid.at(x + dy, y + dx)) && beside(grid.at(x - dy, y - dx));
}

/**
 * STAIRS, at the MOUTHS first — where a corridor arrives at a rim — then south
 * faces, then any straight rim, each taken only when it joins two regions not
 * yet joined, plus one in twenty for a second way up. What is still cut off is
 * dug to through rock, and a shelf that cannot be reached comes down.
 */
function placeStairs(grid: Grid, rng: Rng, entrance: Vec2): MapProp[] {
  const props: MapProp[] = [];
  const region = new Map<number, number>();
  {
    const done = new Set<number>();
    let n = 0;
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const k = y * grid.width + x;
        if (!grid.walkable(x, y) || done.has(k)) continue;
        for (const cell of reachable(grid, { x, y })) {
          done.add(cell);
          region.set(cell, n);
        }
        n++;
      }
    }
  }
  const parent = new Map<number, number>();
  const root = (r: number): number => {
    let p = parent.get(r) ?? r;
    while (p !== r) {
      r = p;
      p = parent.get(r) ?? r;
    }
    return r;
  };
  const spots: { x: number; y: number; side: Side; a: number; b: number; rank: number }[] = [];
  for (let y = 1; y < grid.height - 1; y++) {
    for (let x = 1; x < grid.width - 1; x++) {
      for (const side of ['s', 'n', 'e', 'w'] as const) {
        if (!stairFits(grid, x, y, side)) continue;
        const [dx, dy] = SIDE[side];
        const mouth = grid.at(x + dx, y + dy) === TUNNEL;
        const landing = ground(grid.at(x + 2 * dx, y + 2 * dy)) ? 0 : 0.5; // room to stand at its foot
        spots.push({
          x, y, side,
          a: region.get((y - dy) * grid.width + x - dx) ?? -1,
          b: region.get((y + dy) * grid.width + x + dx) ?? -1,
          rank: (mouth ? 0 : side === 's' ? 1 : 2) + landing,
        });
      }
    }
  }
  const order = rng.shuffle(spots).sort((p, q) => p.rank - q.rank);
  const near = (x: number, y: number): boolean => props.some((p) => Math.abs(p.x - x) + Math.abs(p.y - y) <= 2);
  for (const s of order) {
    const joins = root(s.a) !== root(s.b);
    if (!joins && !rng.chance(0.05)) continue;
    if (near(s.x, s.y) || !stairFits(grid, s.x, s.y, s.side)) continue;
    const [dx, dy] = SIDE[s.side];
    // The picture spans the rim cell and its foot: two tall for a south or
    // north stair, two wide for the others. A prop hangs from the FOOT of its
    // own tile and a wide one is centred on it, so the anchor is the lower
    // cell of a south stair and the western cell of a west one.
    const foot = (x: number, y: number): MapProp =>
      ({ id: `stair_${s.side}`, x: s.side === 'w' ? x - 1 : x, y: s.side === 's' ? y + 1 : y });
    grid.set(s.x, s.y, STAIR);
    props.push(foot(s.x, s.y));
    // Two wide along the rim when the next cell fits too, so a pack gets through.
    if (stairFits(grid, s.x + dy, s.y + dx, s.side)) {
      grid.set(s.x + dy, s.y + dx, STAIR);
      props.push(foot(s.x + dy, s.y + dx));
    }
    parent.set(root(s.a), root(s.b));
  }

  for (let round = 0; round < 10; round++) {
    const seen = reachable(grid, entrance);
    let lost: Set<number> | null = null;
    const done = new Set<number>();
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const k = y * grid.width + x;
        if (!grid.walkable(x, y) || seen.has(k) || done.has(k)) continue;
        const pocket = reachable(grid, { x, y });
        pocket.forEach((c) => done.add(c));
        if (!lost || pocket.size > lost.size) lost = pocket;
      }
    }
    if (!lost) break;
    const pocket: Set<number> = lost;
    let dug = false;
    let best: { a: Vec2; b: Vec2; d: number } | null = null;
    for (const k of pocket) {
      if (!ground(grid.tiles[k])) continue;
      const a = { x: k % grid.width, y: Math.floor(k / grid.width) };
      for (const r of seen) {
        if (!ground(grid.tiles[r])) continue;
        const b = { x: r % grid.width, y: Math.floor(r / grid.width) };
        const d = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
        if (d < 16 && (!best || d < best.d)) best = { a, b, d };
      }
    }
    if (best) {
      const keep = new Uint8Array(grid.tiles);
      carveCorridor(grid, best.a, best.b, rng, 0);
      dug = reachable(grid, entrance).has(best.a.y * grid.width + best.a.x);
      if (!dug) grid.tiles.set(keep);
    }
    if (dug) continue;
    // Its neighbouring shelf comes down, stairs and all.
    let lowered = false;
    for (const k of pocket) {
      const x = k % grid.width;
      const y = (k - x) / grid.width;
      for (const [dx, dy] of N4) {
        if (!raised(grid.at(x + dx, y + dy))) continue;
        lowerShelf(grid, (y + dy) * grid.width + x + dx);
        lowered = true;
        break;
      }
      if (lowered) break;
    }
    // A cell or two the mending left inside the rock is rock; anything bigger
    // is a pocket the carve left, older than any of this, and stays.
    if (!lowered && pocket.size <= 8) pocket.forEach((k) => (grid.tiles[k] = WALL));
    else if (!lowered) break;
  }
  return props.filter((p) => {
    const side = p.id.slice(6) as Side;
    return grid.at(side === 'w' ? p.x + 1 : p.x, side === 's' ? p.y - 1 : p.y) === STAIR;
  });
}

export const isRock = (tile: number): boolean => tile === WALL;

/** A CORNER's value under a solidity — 1 where all four cells round it are
 *  solid, 2 where the corner one row above is (the FACE hangs into the cell
 *  below, so a wall spans two rows), 0 otherwise. One rule for the rock and
 *  for a shelf, which is what lets one set of 21 keys draw both. */
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

/**
 * Rock a generated SET cannot draw, opened until none is left. A set answers 21
 * of the 81 corner keys, and what it lacks is not a gap in the art but shapes
 * its terrain model never makes — a diagonal step in a wall is one. Drawn as
 * the nearest key it holds, such a cell puts a cut face where solid rock
 * belongs, so it is GEOMETRY exactly as `thinRock` is: only ever OPEN rock, and
 * run to a fixed point, since opening one cell moves its neighbours.
 */
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
 *  never taken, and neither is a stair's foot. */
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
    // The GROUND only: a patch over a landmark hides the way out, and a shelf
    // is drawn with its own set.
    if (grid.at(at.x, at.y) !== FLOOR || grid.patch[key] !== 0 || !fits(at.x, at.y)) continue;
    if (N4.some(([dx, dy]) => grid.at(at.x + dx, at.y + dy) === STAIR)) continue;
    // The hole and the way out keep a dry ring — one standing in a pond is a
    // hole in the water. A room's middle keeps only its own cell: the wreath
    // beside a lock walks, so the chest is still reached.
    if (keep.has(key)) continue;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) {
      for (let dx = -1; dx <= 1; dx++) if (ring.has((at.y + dy) * grid.width + at.x + dx)) near = true;
    }
    if (near) continue;
    if (grid.at(at.x, at.y - 1) === RIM) continue; // the face hangs into this cell
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
 *  own floor tile and no shelf tile, so a lake's edge is the only thing drawn
 *  there. The same question the demo asks of every test lake. */
export function shoreClear(grid: Grid, x: number, y: number): boolean {
  const tile = grid.at(x, y);
  if (tile !== FLOOR && tile !== TUNNEL && tile !== ENTRANCE && tile !== EXIT) return false;
  return wangKey(grid, x, y) === 0 && wangKey(grid, x, y, high) === 0;
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

/** WHERE A FAMILY GROWS, by rule, within a room's rectangle: ore at the foot of
 *  a wall two deep (it is the rock), herbs on damp floor beside a wreath. A
 *  scan, never a draw, so asking moves nothing else. */
export function wallFootSpots(grid: Grid, room: Room): Vec2[] {
  const out: Vec2[] = [];
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (!grid.walkable(x, y) || grid.at(x, y - 1) !== WALL || grid.at(x, y - 2) !== WALL) continue;
      out.push({ x, y });
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
      if (above === WALL || above === RIM) continue;
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
  // Fitted BEFORE the shelves and the landmarks: a cell opened beside a rim is
  // a pocket nothing reaches, and one opened beside the hole moves it.
  if (zone) fitCorners(grid, zone);

  // A LEVEL UP. The shelves are fitted to their set, then a raised room whose
  // middle did not survive as interior comes down, since a pack and a lock
  // stand there; then the stairs, which are the proof of reachability.
  const share = SHELF_SET[theme] ? (forcedRaise ?? RAISE[theme]) : 0; // no set, no shelf
  const lifted = raiseRooms(grid, rooms, roomOf, rng, share, new Set([0, rooms.indexOf(exitRoom)]));
  smoothShelves(grid, new Set([entrance, exit, ...rooms.map(roomCenter)].map((v) => v.y * grid.width + v.x)));
  fitShelf(grid, SHELF_SET[theme]);
  for (const i of lifted) {
    const c = roomCenter(rooms[i]);
    if (grid.at(c.x, c.y) !== SHELF) {
      for (let k = 0; k < roomOf.length; k++) if (roomOf[k] === i + 1 && raised(grid.tiles[k])) lowerShelf(grid, k);
    }
  }
  rimShelves(grid);
  const stairs = placeStairs(grid, rng, entrance);
  const standing = lifted.filter((i) => {
    const c = roomCenter(rooms[i]);
    return grid.at(c.x, c.y) === SHELF;
  });

  grid.set(Math.round(entrance.x), Math.round(entrance.y), ENTRANCE);
  grid.set(Math.round(exit.x), Math.round(exit.y), EXIT);

  // A generated surface is DRESSED and one drawing its own rock is not. Cover
  // and growth are the WHOLE of it: a descent is what the rock did, and nothing
  // stands on its floor.
  const props: MapProp[] = [...stairs];
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
  }

  return { grid, rooms, entrance, exit, props, vein, theme, bare: !!zone, zone, patches, raised: standing, plain: !!design };
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
 * one stamped a step from the rock has half its rim inside the wall — which is
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
  const zone = ZONE[theme];
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
  return { grid, rooms, entrance, exit: entrance, props, vein, theme, bare: !!zone, zone, patches: [], raised: [] };
}
