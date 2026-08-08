/**
 * The renderer boundary.
 *
 * This interface is the whole reason placeholder graphics are cheap to
 * replace. A renderer only ever READS RunState — it never writes back, and
 * the sim has no idea it exists. There are two implementations now
 * (canvas2d and pixi), which is the practical proof that the seam works.
 *
 * A renderer owns its own drawing surface and appends it to the host element,
 * because a WebGL context and a 2D context cannot share one canvas.
 *
 * Positions in RunState are in tile units, not pixels, so an implementation
 * is free to choose its own scale, camera, or projection.
 */
import { TUNNEL, WALL } from '../sim/grid';
import type { RunState } from '../sim/run';

export interface Palette {
  void: string;
  matrix: string;
  seam: string;
  seamLit: string;
  /** Map-only. Stone is grey; the panel violet is a different vocabulary. */
  floor: string;
  floorLit: string;
  /**
   * The wall you can see, its lit top, and the solid rock behind everything.
   * `rock` is LIGHTER than `floor` — you are looking slightly down at a
   * chamber, so its walls catch the light and the floor sits in their shadow.
   */
  rock: string;
  rockTop: string;
  rockDeep: string;
  chalk: string;
  dust: string;
  amethyst: string;
  citrine: string;
  quartz: string;
  verdite: string;
  ember: string;
}

export interface Renderer {
  /** CSS pixel dimensions. Implementations handle devicePixelRatio. */
  resize(width: number, height: number): void;
  draw(state: RunState): void;
  /**
   * 1 fits the whole map on screen. Above that the view zooms in and follows
   * the hero, because a zoomed view that doesn't track the action just shows
   * you an empty corner.
   */
  setZoom(zoom: number): void;
  /** Release the surface and any GPU resources. */
  destroy(): void;
}

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 5;

/**
 * Pixels per tile at 1x, once you are past Fit.
 *
 * Zoom used to be a multiple of "whatever fits the whole map", which meant it
 * measured something different on every screen AND on every map: 2x was ~37px
 * a tile on a desktop and ~17px on a phone, so the same label produced a
 * comfortable view on one and a distant one on the other. As an absolute
 * scale, 2x is 2x everywhere and a small screen shows less world rather than
 * smaller world — which is the thing that was actually wrong.
 */
export const TILE_AT_1X = 18;

/**
 * Tiles that must stay visible across the shorter axis.
 *
 * The hero's reach is about six and a half tiles, so a view tighter than this
 * hides things it is already shooting at. Stated as a fact about the GAME
 * rather than about any device, which is what makes it hold on hardware
 * nobody has tested.
 */
export const MIN_TILES_VISIBLE = 16;

/**
 * Where to start on this surface: 2x when there is room for it, tighter only
 * when the surface is too small to keep the hero's reach on screen.
 */
export function defaultZoom(shortAxisPx: number): number {
  // An unmeasured surface says nothing about what fits on it — headless, or
  // a panel that has not been laid out yet. Answering 1x there would mean
  // booting at Fit, which is the one scale a fight is unreadable at.
  if (!(shortAxisPx > 0)) return 2;
  const affordable = shortAxisPx / MIN_TILES_VISIBLE / TILE_AT_1X;
  return clampZoom(Math.min(2, affordable));
}

/** Tile size in CSS px. Fit and below shows the whole map; above is absolute. */
export function tileSize(zoom: number, fit: number): number {
  return zoom <= ZOOM_MIN ? fit * zoom : TILE_AT_1X * zoom;
}

export const clampZoom = (z: number): number =>
  Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));

const VARS: Array<[keyof Palette, string]> = [
  ['void', '--void'],
  ['matrix', '--matrix'],
  ['seam', '--seam'],
  ['seamLit', '--seam-lit'],
  ['floor', '--floor'],
  ['floorLit', '--floor-lit'],
  ['rock', '--rock'],
  ['rockTop', '--rock-lit'],
  ['rockDeep', '--rock-deep'],
  ['chalk', '--chalk'],
  ['dust', '--dust'],
  ['amethyst', '--amethyst'],
  ['citrine', '--citrine'],
  ['quartz', '--quartz'],
  ['verdite', '--verdite'],
  ['ember', '--ember'],
];

/** Pulls the palette out of CSS so colours stay defined in one place. */
export function readPalette(el: Element): Palette {
  const style = getComputedStyle(el);
  const out = {} as Palette;
  for (const [key, cssVar] of VARS) {
    out[key] = style.getPropertyValue(cssVar).trim() || '#ffffff';
  }
  return out;
}

/**
 * Art keys → colour. Shared so both renderers agree on what a Brute looks
 * like; a sprite-based renderer replaces this with a texture lookup and
 * nothing else changes.
 */
export function spriteColour(palette: Palette, sprite: string): string {
  switch (sprite) {
    case 'hero':
      return palette.quartz;
    case 'grub':
      return palette.verdite;
    case 'husk':
      return palette.dust;
    case 'stalker':
      return palette.citrine;
    case 'brute':
      return palette.ember;
    default:
      return palette.ember;
  }
}

/**
 * Colour for an effect. Kind wins over damage type, because telling two
 * attacks apart at a glance matters more than colour-coding the element —
 * and this is a presentation call, which is why it lives here and not in
 * the skill data.
 */
export function vfxColour(palette: Palette, kind: string, damageType: string): string {
  // Only the neutral kinds get a fixed colour. A bolt used to be violet
  // whatever it was made of, which was fine when the one bolt in the game was
  // arcane and wrong the moment a tree could turn a fireball to ice.
  if (kind === 'slash') return palette.chalk;
  return damageColour(palette, damageType);
}

export function damageColour(palette: Palette, type: string): string {
  switch (type) {
    case 'fire':
      return palette.ember;
    case 'cold':
      return palette.quartz;
    case 'lightning':
      return palette.amethyst;
    case 'poison':
      return palette.verdite;
    default:
      return palette.chalk;
  }
}

// ---------------------------------------------------------------------------
// The floor
// ---------------------------------------------------------------------------

/**
 * Rock colour, per tile.
 *
 * The map used to be one flat fill across every walkable tile, which read as
 * a violet slab with a bright outline rather than a place — and it read the
 * same on every descent, so a crystal changed the numbers and nothing you
 * could see.
 *
 * Three things vary here, in rising order of how much they say:
 *
 *  - Grain. A deterministic per-tile wobble, small enough that you never
 *    catch a single tile being different and large enough that the surface
 *    stops looking printed.
 *  - Chambers against passages. A corridor is darker and cooler than a room,
 *    so the shape of the level is legible at Fit instead of having to be
 *    traced. This is the one that is worth more than decoration.
 *  - The vein. The mineral the crystal ran through the rock, as sparse flecks
 *    in that tier's colour. A T5 map is visibly not a T1 map.
 *
 * Everything is a pure function of (x, y, tile, vein) so both renderers agree
 * exactly, and re-drawing a frame can never make the floor shimmer.
 */

/** The seam colour for a crystal tier. Matches the icons' own ladder. */
const VEIN_COLOURS: Array<keyof Palette> = [
  'dust',
  'quartz',
  'verdite',
  'amethyst',
  'citrine',
  'ember',
];

export function veinColour(palette: Palette, vein: number): string {
  const i = Math.max(1, Math.min(VEIN_COLOURS.length, Math.round(vein))) - 1;
  return palette[VEIN_COLOURS[i]];
}

/**
 * A stable 0..1 hash of a tile.
 *
 * Not the seeded Rng: this has to be answerable for one tile without having
 * generated every tile before it, because a renderer draws whatever is on
 * screen and nothing else.
 */
function tileNoise(x: number, y: number, salt: number): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2246822519) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * The same hash, smoothed across a coarse lattice.
 *
 * Hashing each tile independently is the obvious thing and it looks like
 * television static: every tile differs from its neighbour, so the eye reads
 * noise rather than surface. Rock varies in PATCHES. Interpolating between
 * lattice points several tiles apart gives broad soft areas of lighter and
 * darker stone, which is what the flat fill was actually missing.
 */
function patchNoise(x: number, y: number, scale: number, salt: number): number {
  const fx = x / scale;
  const fy = y / scale;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  // Smoothstep, so the lattice itself never shows up as a grid.
  const tx = fx - x0;
  const ty = fy - y0;
  const sx = tx * tx * (3 - 2 * tx);
  const sy = ty * ty * (3 - 2 * ty);

  const top =
    tileNoise(x0, y0, salt) + (tileNoise(x0 + 1, y0, salt) - tileNoise(x0, y0, salt)) * sx;
  const bottom =
    tileNoise(x0, y0 + 1, salt) +
    (tileNoise(x0 + 1, y0 + 1, salt) - tileNoise(x0, y0 + 1, salt)) * sx;
  return top + (bottom - top) * sy;
}

/** Parse `#rgb` / `#rrggbb` into components. */
function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = Number.parseInt(full, 16);
  return Number.isNaN(n) ? [255, 255, 255] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Blend two colours. `t` of 0 is all `a`. */
export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${((1 << 24) | (c(ar, br) << 16) | (c(ag, bg) << 8) | c(ab, bb)).toString(16).slice(1)}`;
}

/** How much darker a corridor is than a chamber. */
const TUNNEL_DEPTH = 0.34;
/** Tiles across one patch of lighter or darker stone. */
const PATCH_SCALE = 5;
/** How far a patch can push the floor colour either way. */
const PATCH_DEPTH = 0.16;
/** Fraction of tiles carrying a fleck of the vein. */
const VEIN_DENSITY = 0.055;

/**
 * Sub-tile pixels. Every decal below is a whole number of these, so the floor
 * is drawn on a grid in the same way the sprites are — a smooth blob on a
 * pixel-art floor is the seam you cannot stop noticing.
 */
const SUB = 8;
const U = 1 / SUB;

/** Distinct shades the grain is quantised to, per surface. */
const PATCH_STEPS = 7;

/** A rectangle inside one tile. Offsets and size are in TILE units. */
export interface Decal {
  x: number;
  y: number;
  w: number;
  h: number;
  colour: string;
  alpha: number;
}

/**
 * Every colour the floor can be, worked out once.
 *
 * This exists for speed and it is not a micro-optimisation. mix() parses two
 * hex strings and builds a third every time it is called, and the floor wanted
 * eight of them PER TILE — which on a full map is tens of thousands of string
 * round-trips on the single frame that starts a descent, and showed up as a
 * third of a second of hitch on the click.
 *
 * Nothing here depends on x or y. Quantising the grain to a handful of steps
 * is what makes that true, and it costs nothing visually: seven shades across
 * a range this narrow is already more than the eye separates, and it collapses
 * a thousand one-rectangle draw batches into a handful.
 */
export interface FloorPalette {
  /** Grain ramp, dark to light. Indexed by a quantised patch value. */
  room: string[];
  tunnel: string[];
  rock: string[];
  mortar: string;
  rubble: string;
  chip: string;
  lit: string;
  shade: string;
  vein: string;
  /** The face of an exposed wall, catching the light from above. */
  rockLit: string;
  rockShade: string;
}

export function floorPalette(palette: Palette, vein: number): FloorPalette {
  const ramp = (base: string): string[] => {
    const out: string[] = [];
    for (let i = 0; i < PATCH_STEPS; i++) {
      // -1 at the dark end, +1 at the light end.
      const t = (i / (PATCH_STEPS - 1)) * 2 - 1;
      out.push(mix(base, t > 0 ? palette.floorLit : palette.void, Math.abs(t) * PATCH_DEPTH));
    }
    return out;
  };

  return {
    room: ramp(palette.floor),
    tunnel: ramp(mix(palette.floor, palette.rockDeep, TUNNEL_DEPTH)),
    rock: ramp(palette.rock),
    mortar: mix(palette.floor, palette.rockDeep, 0.5),
    rubble: mix(palette.floor, palette.rockDeep, 0.34),
    chip: mix(palette.floor, palette.floorLit, 0.75),
    lit: mix(palette.floorLit, palette.chalk, 0.25),
    shade: mix(palette.floor, palette.rockDeep, 0.85),
    vein: veinColour(palette, vein),
    rockLit: palette.rockTop,
    rockShade: mix(palette.rock, palette.rockDeep, 0.55),
  };
}

export function floorColour(floor: FloorPalette, tile: number, x: number, y: number): string {
  const ramp = tile === WALL ? floor.rock : tile === TUNNEL ? floor.tunnel : floor.room;
  const patch = patchNoise(x, y, PATCH_SCALE, 1);
  const step = Math.min(PATCH_STEPS - 1, Math.floor(patch * PATCH_STEPS));
  return ramp[step];
}

/**
 * Is this rock worth drawing?
 *
 * Only the wall you could actually see from a room. The map used to draw
 * nothing at all where the rock was, which left every chamber as a slab of
 * floor floating in the background — you could read where you could walk but
 * the place had no walls, and a room with no walls is a shape rather than a
 * room. Drawing EVERY wall tile is the other extreme: two thousand tiles of
 * solid rock that is the same colour as the background behind it.
 *
 * So: the band next to the floor gets drawn, and everything past it is the
 * background, which is the same rock a shade darker. That is the whole
 * difference and it costs a ring of tiles rather than a grid of them.
 */
export function isWallFace(at: (x: number, y: number) => number, x: number, y: number): boolean {
  if (at(x, y) !== WALL) return false;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (at(x + dx, y + dy) !== WALL) return true;
    }
  }
  return false;
}

/** Snaps a 0..1 roll onto the sub-tile grid. */
const snap = (n: number): number => Math.floor(n * SUB) * U;

/**
 * Everything drawn ON a floor tile, past its base colour.
 *
 * The floor had grain and a tunnel/room split, which said where you could
 * walk but nothing about where you were. This is what makes it a place: rooms
 * are FLAGSTONE — two courses per tile, offset like brickwork — and passages
 * are bare rock, so the map reads as a building the cave got into rather than
 * as two shades of the same slab. Roughly a fifth of the paving is missing,
 * which is the whole difference between a castle and a ruin.
 *
 * Light comes from above: the edge below a wall is lit, the edge above one is
 * in shadow. That single pair does more for depth than the uniform outline it
 * replaces, which lit all four sides equally and so implied no light at all.
 *
 * Pure and deterministic per tile — a renderer can draw one tile without
 * having drawn any other, and re-drawing a frame can never make the floor
 * crawl.
 */
export function tileDecals(
  floor: FloorPalette,
  at: (x: number, y: number) => number,
  x: number,
  y: number
): Decal[] {
  const tile = at(x, y);
  const out: Decal[] = [];

  // --- rock ---------------------------------------------------------------
  if (tile === WALL) {
    if (!isWallFace(at, x, y)) return out;

    // Blocks, but broken ones. The wall needs SOME structure or it is a flat
    // grey band — but coursed masonry on the walls is what tipped the whole
    // map from cave into castle, since a chamber cut out of rock has dressed
    // paving at most and the rock it was cut from is just rock. So: block
    // seams that skip, at three different heights, per tile.
    const seams = tileNoise(x, y, 61);
    if (seams < 0.8) {
      out.push({ x: 0, y: 0.5, w: 1, h: U, colour: floor.rockShade, alpha: 0.55 });
    }
    if (seams < 0.55) {
      out.push({
        x: snap(0.25 + tileNoise(x, y, 62) * 0.4),
        y: 0.5,
        w: U,
        h: 0.5,
        colour: floor.rockShade,
        alpha: 0.55,
      });
    }
    if (tileNoise(x, y, 63) < 0.6) {
      out.push({
        x: snap(0.2 + tileNoise(x, y, 64) * 0.5),
        y: 0,
        w: U,
        h: 0.5,
        colour: floor.rockShade,
        alpha: 0.55,
      });
    }

    // Grit on the face, so the blocks read as rock rather than as brick.
    for (let i = 0; i < 2; i++) {
      const roll = tileNoise(x, y, 66 + i);
      if (roll > 0.5) continue;
      out.push({
        x: snap(roll / 0.5),
        y: snap(tileNoise(x, y, 72 + i)),
        w: U,
        h: U,
        colour: i === 0 ? floor.rockLit : floor.rockShade,
        alpha: 0.45,
      });
    }

    // The top of the wall, which is what an overhead light actually reaches.
    // A wall with floor BELOW it is the face you are looking at.
    if (at(x, y - 1) === WALL || at(x, y - 1) === undefined) {
      out.push({ x: 0, y: 0, w: 1, h: U, colour: floor.rockLit, alpha: 0.45 });
    }
    if (at(x, y + 1) !== WALL) {
      out.push({ x: 0, y: 1 - U * 1.5, w: 1, h: U * 1.5, colour: floor.rockShade, alpha: 0.75 });
    }
    return out;
  }

  // --- floor --------------------------------------------------------------
  //
  // Not every chamber is paved. A coarse noise field — far wider than a room —
  // decides which parts of the level were ever built in, so you cross from
  // flagstone to bare cave floor and back without every room looking like
  // every other one. That variety is most of what "a cave with a ruin in it"
  // looks like, and it costs one extra noise lookup.
  const built = patchNoise(x, y, 13, 9) > 0.42;
  const paved = tile !== TUNNEL && built;

  // A ruin far more than a building. Better than a third of the paving in a
  // chamber is gone, and passages were never paved at all.
  const broken = tileNoise(x, y, 7) < 0.35;

  if (paved && !broken) {
    for (let course = 0; course < 2; course++) {
      const top = course * 0.5;
      out.push({ x: 0, y: top, w: 1, h: U, colour: floor.mortar, alpha: 0.55 });
      // Running bond: every other course is offset by half a stone, which is
      // what stops a grid of squares reading as graph paper.
      const shift = course % 2 === 0 ? 0 : 0.25;
      for (let stone = 0; stone < 2; stone++) {
        out.push({
          x: (shift + stone * 0.5) % 1,
          y: top,
          w: U,
          h: 0.5,
          colour: floor.mortar,
          alpha: 0.55,
        });
      }
    }
  }

  // Rubble. More of it where the paving has gone, and in the raw passages.
  const bits = broken ? 4 : paved ? 1 : 3;
  for (let i = 0; i < bits; i++) {
    const roll = tileNoise(x, y, 20 + i);
    if (roll > 0.6) continue;
    out.push({
      x: snap(roll / 0.6),
      y: snap(tileNoise(x, y, 40 + i)),
      w: U,
      h: U,
      colour: i === 0 ? floor.chip : floor.rubble,
      alpha: 0.5,
    });
  }

  // The vein, as a square rather than a circle now — same reason as the rest.
  const fleck = tileNoise(x, y, 2);
  if (fleck < VEIN_DENSITY) {
    const size = fleck < VEIN_DENSITY * 0.25 ? U * 2 : U;
    out.push({
      x: snap(tileNoise(x, y, 3)) * (1 - size),
      y: snap(tileNoise(x, y, 4)) * (1 - size),
      w: size,
      h: size,
      colour: floor.vein,
      // Quieter than it was. Against violet rock the flecks were a texture;
      // against grey they are the only saturated thing on screen, and at full
      // strength a mineral seam competed with the monsters for attention.
      alpha: 0.5,
    });
  }

  // Where the floor meets rock. The wall itself carries the lit face now, so
  // the floor only needs the contact shadow under it.
  // A hard contact line wherever floor meets rock. This is the single thing
  // that makes a chamber read as enclosed rather than as a patch of lighter
  // ground: without it the wall is just a differently-coloured area, and the
  // eye needs an EDGE to call something a boundary.
  if (at(x, y - 1) === WALL) {
    out.push({ x: 0, y: 0, w: 1, h: U * 1.5, colour: floor.shade, alpha: 0.9 });
  }
  if (at(x, y + 1) === WALL) {
    out.push({ x: 0, y: 1 - U, w: 1, h: U, colour: floor.shade, alpha: 0.8 });
  }
  if (at(x - 1, y) === WALL) {
    out.push({ x: 0, y: 0, w: U, h: 1, colour: floor.shade, alpha: 0.8 });
  }
  if (at(x + 1, y) === WALL) {
    out.push({ x: 1 - U, y: 0, w: U, h: 1, colour: floor.shade, alpha: 0.8 });
  }

  return out;
}

/** Hex string to a 0xRRGGBB number, for renderers that want numeric colours. */
export function toHexNumber(colour: string): number {
  const hex = colour.replace('#', '').trim();
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  const n = Number.parseInt(full, 16);
  return Number.isNaN(n) ? 0xffffff : n;
}

// ---------------------------------------------------------------------------
// Poison field
// ---------------------------------------------------------------------------

/**
 * The falling-poison animation, as pure geometry.
 *
 * Both renderers call this so the effect is identical in each, and — more to
 * the point — so the RADIUS drawn is the radius the sim actually used. The
 * skill emits its true radius as a second point; nothing here invents a size.
 * That is what makes the circle a readable statement about what you did and
 * did not catch, and what makes Area of Effect visible as it grows.
 *
 * Everything is in tile units. Time `t` runs 0 to 1 over the effect's life.
 */
export interface PoisonDrop {
  x: number;
  y: number;
  /** Radius of the droplet, in tiles. */
  r: number;
  alpha: number;
}

/** How many droplets fall per field. Enough to read as rain, cheap to draw. */
const DROP_COUNT = 16;
/** How far above the ground a droplet starts, in tiles. */
const DROP_HEIGHT = 1.15;
/** Fraction of the effect's life spent snapping open. */
const OPEN = 0.16;

/**
 * The drawn radius, which snaps open and then holds at the true one.
 *
 * A circle that simply appears at full size and fades reads as an aura that
 * belongs to whatever is standing there. Punching it open says something
 * HAPPENED, at a moment, in a place — which is what a cast is. The hold is the
 * important half: for most of its life the circle is exactly the radius the
 * sim used, so it stays a statement about what got caught.
 */
export function poisonFieldRadius(radius: number, t: number): number {
  if (t >= OPEN) return radius;
  const p = t / OPEN;
  return radius * (1 - (1 - p) * (1 - p));
}

/**
 * A burst: out fast, then gone.
 *
 * The opposite curve to a poison field, which eases OPEN and then sits there.
 * An explosion that grew the same way would read as a circle being placed
 * rather than something going off, and the whole point of drawing it is that
 * you can tell what the burst caught.
 */
export function burstRadius(radius: number, t: number): number {
  return radius * Math.min(1, Math.sqrt(t * 3.2));
}

export function poisonDrops(
  centreX: number,
  centreY: number,
  radius: number,
  t: number
): PoisonDrop[] {
  const drops: PoisonDrop[] = [];
  for (let i = 0; i < DROP_COUNT; i++) {
    // Golden-angle placement scatters without clumping, and sqrt keeps the
    // density even rather than piling everything at the centre.
    const angle = i * 2.399963;
    const dist = radius * Math.sqrt(((i * 0.6180339887) % 1));
    // Each droplet runs its own fall on a staggered phase, so the rain is
    // continuous instead of every drop landing on the same frame.
    const fall = (t * 2.1 + ((i * 0.37) % 1)) % 1;

    drops.push({
      x: centreX + Math.cos(angle) * dist,
      y: centreY + Math.sin(angle) * dist - (1 - fall) * DROP_HEIGHT,
      // Swells slightly as it lands, which reads as a splash without needing
      // a second effect.
      r: 0.05 + 0.035 * fall,
      alpha: Math.min(1, fall * 4) * (1 - fall) * 1.5 * (1 - t),
    });
  }
  return drops;
}
