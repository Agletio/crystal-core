/**
 * The renderer boundary. A renderer only READS RunState, owns its own surface
 * (a WebGL and a 2D context cannot share a canvas), and works in TILE UNITS —
 * scale and camera are its own business.
 */
import { TUNNEL, WALL } from '../sim/grid';
import type { RunState } from '../sim/run';
import type { Vec2 } from '../sim/grid';
import type { AuraDef, MapTheme } from '../types';

export interface Palette {
  void: string;
  matrix: string;
  seam: string;
  seamLit: string;
  /** Map-only. Stone is grey; the panel violet is a different vocabulary. */
  floor: string;
  floorLit: string;
  /** `rock` is LIGHTER than `floor`: walls catch the light, floors sit in shadow. */
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
  /** Fire's own ramp, hotter and less pink than ember. */
  flame: string;
  flameCore: string;
  /** The three worlds: mundane forge-rust, demonic rot, crystal bone-light. */
  rust: string;
  venom: string;
  bone: string;
}

export interface Renderer {
  /** CSS pixel dimensions. Implementations handle devicePixelRatio. */
  resize(width: number, height: number): void;
  draw(state: RunState): void;
  /** 1 fits the whole map. Above that the view follows the hero. */
  setZoom(zoom: number): void;
  /** Release the surface and any GPU resources. */
  destroy(): void;
}

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 5;

/** Pixels per tile at 1x. Absolute, so a small screen shows less world. */
export const TILE_AT_1X = 18;

/** The hero's reach is ~6.5 tiles; tighter hides what it is already shooting. */
export const MIN_TILES_VISIBLE = 16;

/** 2x when there is room, tighter only to keep the hero's reach on screen. */
export function defaultZoom(shortAxisPx: number): number {
  // Unmeasured: headless, or not laid out yet. 1x here would boot at Fit,
  // which is the one scale a fight is unreadable at.
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
  ['flame', '--flame'],
  ['flameCore', '--flame-core'],
  ['rust', '--rust'],
  ['venom', '--venom'],
  ['bone', '--bone'],
];

/** Custom properties from anywhere: a live element, or stylesheet text. */
export function paletteFrom(lookup: (cssVar: string) => string): Palette {
  const out = {} as Palette;
  for (const [key, cssVar] of VARS) out[key] = lookup(cssVar).trim() || '#ffffff';
  return out;
}

export function readPalette(el: Element): Palette {
  const style = getComputedStyle(el);
  return paletteFrom((cssVar) => style.getPropertyValue(cssVar));
}

/** Art keys → colour, shared so both renderers agree what a Brute looks like. */
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

/** Kind wins over damage type: telling two attacks apart matters more. */
export function vfxColour(palette: Palette, kind: string, damageType: string): string {
  // Only the neutral kinds get a fixed colour; anything elemental follows its
  // damage type, so a converted fireball looks converted.
  if (kind === 'slash') return palette.chalk;
  return damageColour(palette, damageType);
}

/** Damage reads as the world it comes from, not as a slot in a legend. */
export function damageColour(palette: Palette, type: string): string {
  switch (type) {
    case 'fire':
      return palette.ember;
    case 'cold':
      return palette.quartz;
    case 'lightning':
      return palette.citrine;
    case 'poison':
      return palette.venom;
    case 'dark':
      return palette.amethyst;
    case 'light':
      return palette.bone;
    case 'prismatic':
      return palette.quartz;
    default:
      return palette.chalk;
  }
}

/** The seam colour for a run's power. Matches the icons' own ladder. */
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
 * The circle a monster's aura is drawing. A room that is lethal for a reason
 * you cannot see reads as a bug, so the area is on the floor rather than in a
 * tooltip — and the two kinds of aura are told apart by their family's ink.
 */
export function auraLook(palette: Palette, aura: AuraDef): { colour: string; alpha: number } {
  const colour = aura.family === 'demonic' ? palette.venom : palette.bone;
  // A percentage aura is the one that needs the other to be worth much, so it
  // reads as the fainter of the two.
  return { colour, alpha: aura.incDamage || aura.incArmour ? 0.07 : 0.09 };
}

/** Answerable for one tile without having generated any other — not the Rng. */
function tileNoise(x: number, y: number, salt: number): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2246822519) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * The same hash, smoothed across a coarse lattice. Per-tile hashing reads as
 * television static; rock varies in PATCHES, so interpolating between lattice
 * points several tiles apart is what gives broad areas of lighter stone.
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

/** Sub-tile pixels. Every decal is a whole number of these, like the sprites. */
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
 * Every colour the floor can be, worked out once: mix() parses two hex strings
 * per call and the floor wants eight PER TILE. Quantising the grain to a few
 * steps is what makes this independent of x and y.
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
  /** What this world grows on its walls, and how much of the rock carries it. */
  growth: string;
  /** A second growth, for the one zone made of two worlds. Empty otherwise. */
  growthAlt: string;
  glint: string;
  growthDensity: number;
}

/**
 * What each world does to the rock. The ground tint is deliberately small —
 * the map has to stay legible under monsters that are already coloured by
 * family — so what actually says where you are is what grows on the walls.
 */
const THEME_INK: Record<
  MapTheme,
  {
    ground: keyof Palette | null;
    depth: number;
    growth: keyof Palette | null;
    growthAlt: keyof Palette | null;
    glint: keyof Palette;
    density: number;
  }
> = {
  fissure: { ground: null, depth: 0, growth: null, growthAlt: null, glint: 'chalk', density: 0 },
  demonic: { ground: 'venom', depth: 0.13, growth: 'venom', growthAlt: null, glint: 'ember', density: 0.34 },
  prismatic: { ground: 'amethyst', depth: 0.11, growth: 'bone', growthAlt: null, glint: 'quartz', density: 0.38 },
  // Crystal erupting through demonic rock, tile by tile rather than blended:
  // a join, not the average of two worlds.
  seam: {
    ground: 'venom',
    depth: 0.13,
    growth: 'venom',
    growthAlt: 'bone',
    glint: 'ember',
    density: 0.46,
  },
};

export function floorPalette(
  palette: Palette,
  vein: number,
  theme: MapTheme = 'fissure'
): FloorPalette {
  const ink = THEME_INK[theme] ?? THEME_INK.fissure;
  const world = (base: string): string =>
    ink.ground ? mix(base, palette[ink.ground], ink.depth) : base;

  const ramp = (base: string): string[] => {
    const out: string[] = [];
    for (let i = 0; i < PATCH_STEPS; i++) {
      // -1 at the dark end, +1 at the light end.
      const t = (i / (PATCH_STEPS - 1)) * 2 - 1;
      out.push(mix(base, t > 0 ? palette.floorLit : palette.void, Math.abs(t) * PATCH_DEPTH));
    }
    return out;
  };

  const floor = world(palette.floor);
  const rock = world(palette.rock);

  return {
    room: ramp(floor),
    tunnel: ramp(mix(floor, palette.rockDeep, TUNNEL_DEPTH)),
    rock: ramp(rock),
    mortar: mix(floor, palette.rockDeep, 0.5),
    rubble: mix(floor, palette.rockDeep, 0.34),
    chip: mix(floor, palette.floorLit, 0.75),
    lit: mix(palette.floorLit, palette.chalk, 0.25),
    shade: mix(floor, palette.rockDeep, 0.85),
    vein: veinColour(palette, vein),
    rockLit: world(palette.rockTop),
    rockShade: mix(rock, palette.rockDeep, 0.55),
    growth: ink.growth ? palette[ink.growth] : '',
    growthAlt: ink.growthAlt ? palette[ink.growthAlt] : '',
    glint: palette[ink.glint],
    growthDensity: ink.density,
  };
}

export function floorColour(floor: FloorPalette, tile: number, x: number, y: number): string {
  const ramp = tile === WALL ? floor.rock : tile === TUNNEL ? floor.tunnel : floor.room;
  const patch = patchNoise(x, y, PATCH_SCALE, 1);
  const step = Math.min(PATCH_STEPS - 1, Math.floor(patch * PATCH_STEPS));
  return ramp[step];
}

/**
 * Is this rock worth drawing? Only the band next to the floor: past it the
 * background is the same rock a shade darker, so drawing every wall tile is two
 * thousand tiles the colour of what is already behind them.
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
 * What the world has put on this piece of rock: a spur climbing the face, with
 * a lit tip. Nothing at all in the Fissure, whose walls are only ever stone.
 *
 * It grows UP from the bottom of the tile so a run of them along a wall reads
 * as one crust rather than as flecks, and it is drawn per tile from the tile's
 * own hash, so both renderers put the same crystal in the same place.
 */
function wallGrowth(floor: FloorPalette, x: number, y: number): Decal[] {
  if (floor.growthDensity <= 0 || !floor.growth) return [];
  const roll = tileNoise(x, y, 81);
  if (roll > floor.growthDensity) return [];

  // The Seam alternates by tile: one world's growth or the other's, never a
  // colour between them, which is what makes it read as fused.
  const colour =
    floor.growthAlt && tileNoise(x, y, 82) < 0.5 ? floor.growthAlt : floor.growth;
  const height = U * (2 + Math.floor(tileNoise(x, y, 83) * 3));
  const left = snap(0.15 + tileNoise(x, y, 84) * 0.65);

  return [
    { x: left, y: 1 - height, w: U, h: height, colour, alpha: 0.6 },
    { x: left, y: 1 - height, w: U, h: U, colour: floor.glint, alpha: 0.75 },
    // A shorter neighbour, so a spur has some width at its base.
    ...(tileNoise(x, y, 85) < 0.55
      ? [
          {
            x: Math.min(1 - U, left + U),
            y: 1 - height + U,
            w: U,
            h: height - U,
            colour,
            alpha: 0.4,
          },
        ]
      : []),
  ];
}

/**
 * Everything drawn ON a floor tile past its base colour. Rooms are FLAGSTONE,
 * two courses per tile offset like brickwork; passages are bare rock; a fifth
 * of the paving is missing, which is castle against ruin. Light comes from
 * above, so the edge below a wall is lit and the edge above one is shadowed.
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

    // Broken blocks, at three heights. A wall needs SOME structure or it is a
    // flat grey band, but coursed masonry tips the map from cave into castle.
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
    out.push(...wallGrowth(floor, x, y));
    return out;
  }

  // A coarse noise field, far wider than a room, decides which parts of the
  // level were ever built in — so you cross from flagstone to bare cave floor
  // and back rather than every room looking like every other one.
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
      // Quiet: against grey these are the only saturated thing on screen, and
      // at full strength a mineral seam competes with the monsters.
      alpha: 0.5,
    });
  }

  // A hard contact line wherever floor meets rock. Without an EDGE the wall is
  // just a differently-coloured area, and a chamber reads as a patch of ground
  // rather than as somewhere enclosed.
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

/**
 * Fire, on the same pixel grid as the sprites. A smooth line with a round head
 * is a laser; a fireball is a lump of burning stuff with bits coming off it.
 *
 * Three shades off the damage type — outer body, hotter middle, near-white core
 * — so a converted Fireball gets the same shapes in blue for free.
 */
export interface FirePixel {
  x: number;
  y: number;
  size: number;
  /** 0 outer, 1 middle, 2 core. */
  shade: number;
  alpha: number;
}

/** One logical fire pixel, in tiles. Matches the sprite grid at 16 per cell. */
const FIRE_PX = 1 / 16;

const onGrid = (n: number): number => Math.round(n / FIRE_PX) * FIRE_PX;

export function fireShades(palette: Palette, type: string): [string, string, string] {
  // Fire gets a real red → orange → yellow ramp; every other type is the same
  // ramp tinted, so a converted Fireball keeps the shapes and changes colour.
  const outer = type === 'fire' ? palette.flame : damageColour(palette, type);
  return [
    outer,
    mix(outer, palette.flameCore, 0.5),
    mix(outer, palette.flameCore, 0.88),
  ];
}

/**
 * The ball itself, authored the way the sprites are. `.` is nothing, 0 the
 * outer body, 1 the middle, 2 the core.
 */
const BALL = [
  '..0110..',
  '.011110.',
  '01122110',
  '01222210',
  '01222210',
  '01122110',
  '.011110.',
  '..0110..',
];

/**
 * The projectile: a burning ball with a tail that frays behind it. The head
 * travels faster than `t`, so the tail is still burning after it lands. Flicker
 * is hashed off position, never off real time, so both renderers agree.
 */
export function fireBolt(from: Vec2, to: Vec2, t: number): FirePixel[] {
  const travel = Math.min(1, t * 1.8);
  const hx = from.x + (to.x - from.x) * travel;
  const hy = from.y + (to.y - from.y) * travel;
  const pixels: FirePixel[] = [];

  // Trailing embers, thinning and cooling with distance behind the head.
  const TAIL = 9;
  for (let i = TAIL; i >= 1; i--) {
    const back = Math.max(0, travel - i * 0.05);
    const px = from.x + (to.x - from.x) * back;
    const py = from.y + (to.y - from.y) * back;
    const wobble = tileNoise(Math.round(px * 12), Math.round(py * 12), 17 + i) - 0.5;
    const spread = 0.05 + i * 0.022;
    pixels.push({
      x: onGrid(px + wobble * spread),
      y: onGrid(py + wobble * spread - i * 0.01),
      size: FIRE_PX * (i > 6 ? 1 : i > 3 ? 2 : 3),
      shade: i > 6 ? 0 : i > 3 ? 1 : 2,
      alpha: (1.15 - i / (TAIL + 1)) * (1 - t * 0.5),
    });
  }

  // The head, drawn from the grid and centred on where it has got to.
  const half = (BALL.length * FIRE_PX) / 2;
  for (let row = 0; row < BALL.length; row++) {
    for (let col = 0; col < BALL[row].length; col++) {
      const ch = BALL[row][col];
      if (ch === '.') continue;
      pixels.push({
        x: onGrid(hx - half + col * FIRE_PX),
        y: onGrid(hy - half + row * FIRE_PX),
        size: FIRE_PX,
        shade: Number(ch),
        alpha: 1,
      });
    }
  }
  return pixels;
}

/**
 * The burst: a band of flame that punches out and burns down. A band rather
 * than a filled disc — filled, it is a plate over whatever it caught, and the
 * edge is the thing you want to read.
 */
export function fireBurst(centre: Vec2, radius: number, t: number): FirePixel[] {
  const grown = burstRadius(radius, t);
  const pixels: FirePixel[] = [];
  const step = FIRE_PX * 2;
  // Enough that the band closes at the biggest radius anyone reaches.
  const count = Math.max(16, Math.round((grown * Math.PI * 2) / step));

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const noise = tileNoise(i, Math.round(grown * 24), 29);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // Three blocks deep, hottest at the leading edge.
    for (let depth = 0; depth < 3; depth++) {
      const r = grown * (0.99 + noise * 0.1) - depth * step;
      if (r <= 0) continue;
      pixels.push({
        x: onGrid(centre.x + cos * r),
        y: onGrid(centre.y + sin * r),
        size: step,
        shade: depth === 0 ? 2 : depth === 1 ? 1 : 0,
        alpha: (1 - t * 0.85) * (noise > 0.15 ? 1 : 0.4),
      });
    }
  }

  // A hot centre while it is going off, so the burst has an origin.
  if (t < 0.55) {
    for (let row = 0; row < BALL.length; row++) {
      for (let col = 0; col < BALL[row].length; col++) {
        if (BALL[row][col] === '.') continue;
        pixels.push({
          x: onGrid(centre.x - (BALL.length * FIRE_PX) / 2 + col * FIRE_PX),
          y: onGrid(centre.y - (BALL.length * FIRE_PX) / 2 + row * FIRE_PX),
          size: FIRE_PX,
          shade: 2,
          alpha: 1 - t * 1.8,
        });
      }
    }
  }
  return pixels;
}

/** Sparks off a hit: a handful of blocks thrown out and falling. */
export function fireSparks(at: Vec2, t: number): FirePixel[] {
  const pixels: FirePixel[] = [];
  for (let i = 0; i < 9; i++) {
    const noise = tileNoise(i, Math.round(at.x * 16 + at.y * 32), 41);
    const angle = (i / 9) * Math.PI * 2 + noise;
    const reach = 0.2 + noise * 0.34;
    pixels.push({
      x: onGrid(at.x + Math.cos(angle) * reach * t),
      y: onGrid(at.y + Math.sin(angle) * reach * t - t * t * 0.2),
      size: FIRE_PX * (noise > 0.45 ? 3 : 2),
      shade: noise > 0.6 ? 2 : 1,
      alpha: 1 - t * 0.8,
    });
  }
  return pixels;
}

/**
 * The falling-poison animation, as pure geometry, so the radius DRAWN is the
 * radius the sim used — the skill emits it as a second point and nothing here
 * invents a size. Tile units; `t` runs 0 to 1 over the effect's life.
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
 * Snaps open, then HOLDS at the true radius. Appearing at full size reads as an
 * aura; the hold is what keeps it a statement about what got caught.
 */
export function poisonFieldRadius(radius: number, t: number): number {
  if (t >= OPEN) return radius;
  const p = t / OPEN;
  return radius * (1 - (1 - p) * (1 - p));
}

/** Out fast, then gone — the opposite curve to a poison field's ease-and-hold. */
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
