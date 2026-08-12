/**
 * The renderer boundary. A renderer only READS RunState, owns its own surface
 * (a WebGL and a 2D context cannot share a canvas), and works in TILE UNITS —
 * scale and camera are its own business.
 */
import { ENTRANCE, EXIT, TUNNEL, WALL } from '../sim/grid';
import type { RunState } from '../sim/run';
import type { Vec2 } from '../sim/grid';
import type { AuraDef, MapTheme } from '../types';
import { tileNoise } from '../noise';

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
  /** A violet so dark it reads as the absence of light. */
  gloom: string;
  /** The Rot's own rock: meat, and the near-black between it. */
  flesh: string;
  fleshLit: string;
  gore: string;
  char: string;
  sinew: string;
  /** The Cavern's, cool and pale where the Rot is dark and red. */
  rose: string;
  blush: string;
  lilac: string;
  orchid: string;
  pearl: string;
}

export interface Renderer {
  /** CSS pixel dimensions. Implementations handle devicePixelRatio. */
  resize(width: number, height: number): void;
  /** `emerge` is how far out of the ground the hero is: 1 standing, 0 gone.
   *  Only the handover moves it, and only the UI knows it exists. */
  draw(state: RunState, emerge?: number): void;
  /** 1 fits the whole map; above that it follows the hero unless panned. `at`
   *  is CSS pixels from the view's middle that must not move: lean in on the
   *  cursor, or what you leaned in on slides out from under it. */
  setZoom(zoom: number, at?: { x: number; y: number }): void;
  /** Drag by a screen-pixel delta. STOPS the follow until `follow()`. */
  panBy(dx: number, dy: number): void;
  /** Where a tile is on the SURFACE, in CSS pixels from its top left — the
   *  same split the camera rides on. */
  screenAt(at: Vec2): { x: number; y: number };
  follow(): void;
  /** Release the surface and any GPU resources. */
  destroy(): void;
}

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 5;

/** One wheel notch, multiplicative: additive steps crawl close and jump far. */
export const ZOOM_STEP = 1.12;

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
/** Slack past a map edge, as a share of the view: enough to centre a corner
 *  fight, but not a half — the grid is PADDED, so that loses the rock. */
export const CAMERA_SLACK = 0.25;

export function clampOffset(want: number, view: number, span: number): number {
  if (span <= view) return (view - span) / 2; // nothing to look around for
  const slack = view * CAMERA_SLACK;
  return Math.min(slack, Math.max(view - span - slack, want));
}

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
  ['gloom', '--gloom'],
  ['flesh', '--flesh'],
  ['fleshLit', '--flesh-lit'],
  ['gore', '--gore'],
  ['char', '--char'],
  ['sinew', '--sinew'],
  ['rose', '--rose'],
  ['blush', '--blush'],
  ['lilac', '--lilac'],
  ['orchid', '--orchid'],
  ['pearl', '--pearl'],
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
  // Neither of these is elemental: a step is a step and a buff is a buff.
  if (kind === 'blink') return palette.quartz;
  if (kind === 'crit_surge') return palette.citrine;
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
  /** How a tile is drawn, which is the part a colour cannot carry. */
  surface: Surface;
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
  /** What an abandoned working left standing, and what is still burning in it.
   *  Fire is fire in every zone, so neither comes off the theme's ink. */
  timber: string;
  flame: string;
  flameCore: string;
  /** How much of this zone's floor carries something that MOVES. A knob per
   *  zone: a cave with a cobweb on every tile is a cobweb factory. */
  motionDensity: number;
}

/**
 * A zone is its own rock, not a tint over the Fissure's. Each entry names the
 * whole surface — ground, wall, the dark between them, what grows and what
 * glints — and `surface` says how the tile is DRAWN, which is the part a
 * palette cannot carry: masonry, meat or crystal.
 */
export type Surface = 'stone' | 'flesh' | 'crystal' | 'seam';

interface ThemeInk {
  ground: keyof Palette;
  groundLit: keyof Palette;
  rock: keyof Palette;
  rockTop: keyof Palette;
  /** The darkest thing in the zone: contact lines, mortar, the gaps. */
  deep: keyof Palette;
  growth: keyof Palette | null;
  growthAlt: keyof Palette | null;
  glint: keyof Palette;
  density: number;
  /** How much of the floor carries something that moves. Turned down where a
   *  zone is quiet rather than dead: the Fissure is occupied, not busy. */
  motion: number;
  surface: Surface;
}

const THEME_INK: Record<MapTheme, ThemeInk> = {
  fissure: {
    ground: 'floor',
    groundLit: 'floorLit',
    rock: 'rock',
    rockTop: 'rockTop',
    deep: 'rockDeep',
    growth: null,
    growthAlt: null,
    glint: 'chalk',
    density: 0,
    motion: 0.5,
    surface: 'stone',
  },
  // Meat. The walls are not stone with something on them, they are the thing.
  demonic: {
    ground: 'gore',
    groundLit: 'flesh',
    rock: 'flesh',
    rockTop: 'fleshLit',
    deep: 'char',
    growth: 'flesh',
    growthAlt: null,
    glint: 'sinew',
    density: 0.5,
    motion: 1,
    surface: 'flesh',
  },
  // The other end of every register: pale where the Rot is dark, cool where it
  // is red, and lit from inside the rock rather than from above it.
  prismatic: {
    ground: 'gloom',
    groundLit: 'orchid',
    rock: 'rose',
    rockTop: 'blush',
    deep: 'void',
    growth: 'blush',
    growthAlt: null,
    glint: 'pearl',
    density: 0.55,
    motion: 1,
    surface: 'crystal',
  },
  // Crystal erupting through demonic rock, tile by tile rather than blended:
  // a join, not the average of two worlds.
  seam: {
    ground: 'gore',
    groundLit: 'flesh',
    rock: 'flesh',
    rockTop: 'fleshLit',
    deep: 'char',
    growth: 'flesh',
    growthAlt: 'blush',
    glint: 'pearl',
    density: 0.6,
    motion: 1,
    surface: 'seam',
  },
};

export function floorPalette(
  palette: Palette,
  vein: number,
  theme: MapTheme = 'fissure'
): FloorPalette {
  const ink = THEME_INK[theme] ?? THEME_INK.fissure;
  const deep = palette[ink.deep];
  const lit = palette[ink.groundLit];

  const ramp = (base: string): string[] => {
    const out: string[] = [];
    for (let i = 0; i < PATCH_STEPS; i++) {
      // -1 at the dark end, +1 at the light end.
      const t = (i / (PATCH_STEPS - 1)) * 2 - 1;
      out.push(mix(base, t > 0 ? lit : palette.void, Math.abs(t) * PATCH_DEPTH));
    }
    return out;
  };

  const floor = palette[ink.ground];
  const rock = palette[ink.rock];

  return {
    surface: ink.surface,
    room: ramp(floor),
    tunnel: ramp(mix(floor, deep, TUNNEL_DEPTH)),
    rock: ramp(rock),
    mortar: mix(floor, deep, 0.5),
    rubble: mix(floor, deep, 0.34),
    chip: mix(floor, lit, 0.75),
    lit: mix(lit, palette.chalk, 0.25),
    shade: mix(floor, deep, 0.85),
    vein: veinColour(palette, vein),
    rockLit: palette[ink.rockTop],
    rockShade: mix(rock, deep, 0.55),
    growth: ink.growth ? palette[ink.growth] : '',
    growthAlt: ink.growthAlt ? palette[ink.growthAlt] : '',
    glint: palette[ink.glint],
    growthDensity: ink.density,
    timber: mix(palette.rust, deep, 0.45),
    flame: palette.flame,
    flameCore: palette.flameCore,
    motionDensity: ink.motion,
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

/** Which of a Seam tile's two worlds this one belongs to. Never a blend. */
const seamSide = (surface: Surface, x: number, y: number): Surface =>
  surface !== 'seam' ? surface : tileNoise(x, y, 82) < 0.5 ? 'flesh' : 'crystal';

/**
 * Where somebody dug. A field far wider than a room, so a working runs THROUGH
 * a level rather than every room carrying the same evidence.
 */
const worked = (x: number, y: number): boolean => patchNoise(x, y, 13, 9) > 0.42;

/**
 * Rock a pick was taken to and then left. A wall needs SOME structure or it is
 * a flat grey band, and every piece of this one is crooked: a crack that steps
 * as it falls, a ledge where a lump came away, and — only where the field says
 * this stretch was worked — a prop rotted in place. Nothing lines up with the
 * tile beside it, which is the whole difference between a cave and a castle.
 */
function dugWall(floor: FloorPalette, x: number, y: number): Decal[] {
  const out: Decal[] = [];

  for (let i = 0; i < 2; i++) {
    if (tileNoise(x, y, 61 + i) > 0.7) continue;
    let at = snap(0.1 + tileNoise(x, y, 63 + i) * 0.7);
    const top = snap(tileNoise(x, y, 65 + i) * 0.4);
    const len = 3 + Math.floor(tileNoise(x, y, 67 + i) * 4);
    for (let s = 0; s < len; s++) {
      out.push({ x: at, y: top + s * U, w: U, h: U, colour: floor.shade, alpha: 0.7 });
      // A step sideways every few pixels: a straight crack is a mortar joint.
      if (tileNoise(x + s, y, 69 + i) < 0.4) {
        at = Math.max(0, Math.min(1 - U, at + (tileNoise(x, y + s, 71 + i) < 0.5 ? -U : U)));
      }
    }
  }

  if (tileNoise(x, y, 73) < 0.55) {
    const left = snap(tileNoise(x, y, 74) * 0.5);
    const top = snap(0.3 + tileNoise(x, y, 75) * 0.4);
    const w = U * (3 + Math.floor(tileNoise(x, y, 76) * 3));
    out.push({ x: left, y: top, w, h: U, colour: floor.rockLit, alpha: 0.55 });
    out.push({ x: left, y: top + U, w, h: U, colour: floor.rockShade, alpha: 0.5 });
  }

  for (let i = 0; i < 2; i++) {
    const roll = tileNoise(x, y, 77 + i);
    if (roll > 0.5) continue;
    out.push({
      x: snap(roll / 0.5),
      y: snap(tileNoise(x, y, 79 + i)),
      w: U,
      h: U,
      colour: i === 0 ? floor.rockLit : floor.rockShade,
      alpha: 0.45,
    });
  }

  if (worked(x, y) && tileNoise(x, y, 86) < 0.22) {
    const left = snap(0.3 + tileNoise(x, y, 87) * 0.35);
    out.push({ x: left, y: 0.12, w: U, h: 0.88, colour: floor.timber, alpha: 0.9 });
    out.push({ x: left - U * 2, y: 0.12, w: U * 5, h: U, colour: floor.timber, alpha: 0.85 });
    out.push({ x: left + U, y: 0.12, w: U, h: 0.88, colour: floor.shade, alpha: 0.5 });
  }
  return out;
}

/**
 * Meat. Lobes bulging off the face with the dark wet between them, a vein
 * running down, and the spines that make a corridor something you would
 * rather not brush against. No seams anywhere: nothing here was built.
 */
function fleshWall(floor: FloorPalette, x: number, y: number): Decal[] {
  const out: Decal[] = [];

  // Two or three big lobes, each a wet crown over a black crevice. Rounded by
  // stepping the width in and out, which is all the grid can say about a curve.
  const lobes = 2 + (tileNoise(x, y, 61) < 0.5 ? 1 : 0);
  for (let i = 0; i < lobes; i++) {
    // Allowed off the left edge: a lobe that stops at every tile boundary is
    // a brick, and the one thing this surface must not read as is masonry.
    const left = snap(tileNoise(x, y, 62 + i) * 0.6) - U * 2;
    const top = snap(tileNoise(x, y, 66 + i) * 0.5);
    const w = U * (4 + Math.floor(tileNoise(x, y, 70 + i) * 3));
    const h = U * 4;
    out.push({ x: left, y: top, w, h, colour: floor.rockLit, alpha: 0.9 });
    out.push({ x: left + U, y: top - U, w: w - U * 2, h: U, colour: floor.rockLit, alpha: 0.7 });
    out.push({ x: left + U, y: top + h, w: w - U * 2, h: U, colour: floor.shade, alpha: 0.9 });
    // The shine. One pixel of tendon-pale, and the whole face turns wet.
    out.push({ x: left + U, y: top + U, w: U * 2, h: U, colour: floor.glint, alpha: 0.45 });
    // The crevice this lobe sits against.
    out.push({ x: left - U, y: top, w: U, h: h + U, colour: floor.shade, alpha: 0.75 });
  }

  // One vein, always vertical, always the darkest thing on the face.
  const vein = snap(0.15 + tileNoise(x, y, 74) * 0.7);
  out.push({ x: vein, y: 0, w: U, h: 1, colour: floor.shade, alpha: 0.7 });

  return out;
}

/**
 * Facets. Long shards leaning off the rock, each narrowing to a lit tip —
 * the opposite construction to a course of masonry, and the reason the Cavern
 * reads as grown rather than built.
 */
function crystalWall(floor: FloorPalette, x: number, y: number): Decal[] {
  const out: Decal[] = [];
  const shards = 2 + (tileNoise(x, y, 61) < 0.5 ? 1 : 0);
  for (let i = 0; i < shards; i++) {
    const left = snap(0.05 + tileNoise(x, y, 62 + i) * 0.65);
    const foot = snap(0.45 + tileNoise(x, y, 66 + i) * 0.5);
    const h = U * (3 + Math.floor(tileNoise(x, y, 70 + i) * 4));
    // Three courses, each a pixel narrower and a step higher: a taper, drawn
    // as steps because the grid has no other way to say one.
    out.push({ x: left, y: foot - h, w: U * 3, h, colour: floor.rockLit, alpha: 0.85 });
    out.push({ x: left + U, y: foot - h - U, w: U * 2, h: U, colour: floor.glint, alpha: 0.8 });
    out.push({ x: left + U, y: foot - h - U * 2, w: U, h: U, colour: floor.glint, alpha: 0.95 });
    out.push({ x: left + U * 2, y: foot - h, w: U, h, colour: floor.rockShade, alpha: 0.7 });
    out.push({ x: left - U, y: foot - h + U, w: U, h: h - U, colour: floor.shade, alpha: 0.5 });
  }
  return out;
}

/**
 * What the world has put on this piece of rock — the Fissure's own spur, kept
 * for the Seam, where one tile in two belongs to the other world entirely.
 */
function wallGrowth(floor: FloorPalette, x: number, y: number): Decal[] {
  if (floor.growthDensity <= 0 || !floor.growth) return [];
  const roll = tileNoise(x, y, 81);
  if (roll > floor.growthDensity) return [];

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
 * What was dropped where the rock was worked, and never picked up: a plank off
 * a prop, or a rope coiled where it was put down. Two things and both rare —
 * an abandoned working is empty, and a floor strewn with tools is a workshop.
 */
function leavings(floor: FloorPalette, x: number, y: number): Decal[] {
  const roll = tileNoise(x, y, 8);
  const out: Decal[] = [];

  if (roll < 0.09) {
    const left = snap(0.05 + tileNoise(x, y, 9) * 0.35);
    const top = snap(0.3 + tileNoise(x, y, 10) * 0.35);
    const len = 4 + Math.floor(tileNoise(x, y, 11) * 3);
    // Stepped every second pixel, so it lies at an angle rather than square to
    // a grid nothing else in the room is square to.
    const rise = tileNoise(x, y, 12) < 0.5 ? -U : U;
    for (let s = 0; s < len; s++) {
      out.push({
        x: left + s * U,
        y: top + Math.floor(s / 2) * rise,
        w: U,
        h: U * 2,
        colour: floor.timber,
        alpha: 0.85,
      });
    }
    return out;
  }

  if (roll < 0.14) {
    const cx = 0.25 + tileNoise(x, y, 9) * 0.4;
    const cy = 0.25 + tileNoise(x, y, 10) * 0.4;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      out.push({
        x: snap(cx + Math.cos(a) * 0.12),
        y: snap(cy + Math.sin(a) * 0.12),
        w: U,
        h: U,
        colour: floor.chip,
        alpha: 0.7,
      });
    }
  }
  return out;
}

/** Pores, and the wet ring round each one. You are standing on something. */
function fleshFloor(floor: FloorPalette, x: number, y: number): Decal[] {
  const out: Decal[] = [];
  // Pores: a hole with a raised rim, drawn as a ring rather than a square,
  // because a square at this size is a tile and the ground is not tiled.
  for (let i = 0; i < 2; i++) {
    const roll = tileNoise(x, y, 20 + i);
    if (roll > 0.4) continue;
    const px = snap((roll / 0.4) * 0.6 + 0.1);
    const py = snap(tileNoise(x, y, 40 + i) * 0.6 + 0.1);
    out.push({ x: px - U, y: py, w: U * 4, h: U * 2, colour: floor.rockLit, alpha: 0.45 });
    out.push({ x: px, y: py - U, w: U * 2, h: U * 4, colour: floor.rockLit, alpha: 0.45 });
    out.push({ x: px, y: py, w: U * 2, h: U * 2, colour: floor.shade, alpha: 0.9 });
    out.push({ x: px, y: py - U, w: U * 2, h: U, colour: floor.glint, alpha: 0.35 });
  }
  return out;
}

/** Growth coming up THROUGH the ground, not only down the walls. */
function crystalFloor(floor: FloorPalette, x: number, y: number): Decal[] {
  const out: Decal[] = [];
  const roll = tileNoise(x, y, 20);
  if (roll < 0.42) {
    const px = snap(0.05 + tileNoise(x, y, 40) * 0.65);
    const foot = snap(0.5 + tileNoise(x, y, 41) * 0.45);
    const h = U * (2 + Math.floor(tileNoise(x, y, 42) * 4));
    out.push({ x: px, y: foot - h, w: U * 2, h, colour: floor.growth || floor.chip, alpha: 0.8 });
    out.push({ x: px, y: foot - h - U, w: U, h: U, colour: floor.glint, alpha: 0.9 });
    out.push({ x: px + U * 2, y: foot - h + U * 2, w: U, h: h - U * 2, colour: floor.shade, alpha: 0.5 });
    // A shorter neighbour in the rock's own colour: a cluster, not a spike.
    if (tileNoise(x, y, 43) < 0.6) {
      const g = U * (1 + Math.floor(tileNoise(x, y, 44) * 3));
      out.push({ x: px - U * 2, y: foot - g, w: U * 2, h: g, colour: floor.rockLit, alpha: 0.7 });
    }
  }
  if (tileNoise(x, y, 21) < 0.12) {
    out.push({
      x: snap(0.1 + tileNoise(x, y, 43) * 0.8),
      y: snap(0.1 + tileNoise(x, y, 44) * 0.8),
      w: U,
      h: U,
      colour: floor.glint,
      alpha: 0.65,
    });
  }
  return out;
}

/** Loose stone, and the mineral fleck in it. Fissure only: nothing crumbles
 *  off meat, and a crystal floor grows rather than sheds. */
function rubble(floor: FloorPalette, x: number, y: number, spoil: boolean): Decal[] {
  const out: Decal[] = [];
  // More of it where a pick was swung: what came off the wall is on the floor.
  const bits = spoil ? 4 : 2;
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
  return out;
}

/**
 * The way down, and the way you came out. Both ends are the same hole: you
 * climbed out of one and you drop into the next, and a descent that ended at
 * something other than what it began at would be two different games.
 *
 * A zone owns its own. The Fissure is a shaft with a ladder in it, the Rot a
 * mouth that has opened, the Cavern a throat of facets. Drawn from the middle
 * out, so the black is the deepest thing on the tile whatever rings it.
 */
export function mouth(floor: FloorPalette, surface: Surface, x: number, y: number): Decal[] {
  // The darkest ink the zone has, and its brightest. A hole reads as a hole
  // from across the room by CONTRAST, not by shape — at one tile across there
  // is no room for shape. `shade` is the dark in every zone; `rock[0]` is not,
  // and a pale one made the Cavern's hole vanish into its own floor.
  const out: Decal[] = [
    { x: 0.08, y: 0.08, w: 0.84, h: 0.84, colour: floor.glint, alpha: 0.9 },
    { x: 0.16, y: 0.16, w: 0.68, h: 0.68, colour: floor.rockShade, alpha: 1 },
    { x: 0.22, y: 0.22, w: 0.56, h: 0.56, colour: floor.shade, alpha: 1 },
  ];

  if (surface === 'flesh') {
    // Teeth around the rim, leaning in. Six, because five reads as a star.
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + tileNoise(x, y, 60) * 2;
      out.push({
        x: snap(0.5 + Math.cos(a) * 0.3 - U),
        y: snap(0.5 + Math.sin(a) * 0.3 - U),
        w: U * 3,
        h: U * 3,
        colour: floor.glint,
        alpha: 1,
      });
    }
    return out;
  }

  if (surface === 'crystal') {
    // Shards standing round a well with no bottom, tall enough to break the
    // square and stop the hole reading as one more facet of floor.
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + tileNoise(x, y, 61) * 2;
      const r = 0.3 + tileNoise(x, y, 62 + i) * 0.06;
      out.push({
        x: snap(0.5 + Math.cos(a) * r - U),
        y: snap(0.5 + Math.sin(a) * r - U * 3),
        w: U * 2,
        h: U * 6,
        colour: i % 2 === 0 ? floor.glint : floor.rockLit,
        alpha: 1,
      });
    }
    return out;
  }

  // A shaft with a ladder down it. Two rails and three rungs is the whole of
  // what says "you can climb this" at one tile across.
  for (const rail of [0.36, 0.6]) {
    out.push({ x: rail, y: 0.26, w: U, h: 0.48, colour: floor.glint, alpha: 1 });
  }
  for (let i = 0; i < 3; i++) {
    out.push({ x: 0.36, y: snap(0.32 + i * 0.16), w: 0.26, h: U, colour: floor.glint, alpha: 0.9 });
  }
  return out;
}

/** Furniture: what somebody PUT in a room, where a decal is what the rock does
 *  on its own. Pure functions in tile units, so both renderers draw them. */
export const PROPS: Record<string, (floor: FloorPalette, x: number, y: number) => Decal[]> = {
  /** A trestle. The top spans the WHOLE tile, so two bench tiles side by side
   *  are one bench rather than two with a gap down the middle. */
  bench: (floor, x, y) => {
    const out: Decal[] = [
      { x: 0, y: 0.42, w: 1, h: U * 2, colour: floor.timber, alpha: 1 },
      { x: 0, y: 0.42 + U * 2, w: 1, h: U, colour: floor.rockShade, alpha: 0.7 },
    ];
    for (const leg of [0.16, 0.76]) {
      out.push({ x: leg, y: 0.45, w: U, h: 0.3, colour: floor.timber, alpha: 0.75 });
    }
    // Half-built: a ring and a pane, never a whole lamp. `chip` and not
    // `glint`, or the parts are the brightest thing in the room.
    for (let i = 0; i < 3; i++) {
      const at = snap(0.16 + i * 0.28);
      const tall = tileNoise(x, y, 70 + i) < 0.5;
      out.push({ x: at, y: snap(0.42 - U * 2), w: U, h: U * 2, colour: floor.chip, alpha: 0.9 });
      if (tall) {
        out.push({ x: snap(at + U), y: snap(0.42 - U), w: U, h: U, colour: floor.chip, alpha: 0.7 });
      }
    }
    return out;
  },

  lantern_dark: (floor) => lantern(floor, false),
  lantern_lit: (floor) => lantern(floor, true),
};

/** A lamp: a foot, two uprights, a handle, and a light in it or not. The dark
 *  ones are why the lit ones read as lit, so nothing on one may be brighter. */
function lantern(floor: FloorPalette, alight: boolean): Decal[] {
  const out: Decal[] = [];
  // The glow under everything, so the flame sits on top of its own light.
  if (alight) {
    out.push({ x: 0.14, y: 0.1, w: 0.72, h: 0.76, colour: floor.flame, alpha: 0.16 });
  }
  out.push(
    { x: 0.3, y: 0.74, w: 0.4, h: U, colour: floor.rockShade, alpha: 0.9 }, // foot
    { x: 0.46, y: 0.6, w: U * 2, h: 0.16, colour: floor.timber, alpha: 1 }, // post
    // The cage, one colour whether it burns or not: what is INSIDE says which.
    { x: 0.28, y: 0.22, w: 0.44, h: U, colour: floor.chip, alpha: 1 },
    { x: 0.28, y: 0.56, w: 0.44, h: U, colour: floor.chip, alpha: 1 },
    { x: 0.28, y: 0.22, w: U, h: 0.38, colour: floor.chip, alpha: 1 },
    { x: 0.68, y: 0.22, w: U, h: 0.38, colour: floor.chip, alpha: 1 },
    { x: 0.4, y: 0.12, w: 0.2, h: U, colour: floor.chip, alpha: 0.9 } // the handle
  );
  if (!alight) {
    out.push({ x: 0.34, y: 0.28, w: 0.32, h: 0.28, colour: floor.shade, alpha: 0.95 });
    return out;
  }
  out.push({ x: 0.34, y: 0.28, w: 0.32, h: 0.28, colour: floor.flame, alpha: 1 });
  out.push({ x: 0.42, y: 0.34, w: 0.16, h: 0.16, colour: floor.flameCore, alpha: 1 });
  return out;
}

/**
 * Everything drawn ON a tile past its base colour. What gets drawn is the
 * zone's `surface`: the Fissure is masonry and rubble, the Rot is meat, the
 * Cavern is growth, and the Seam is one or the other tile by tile. Light comes
 * from above everywhere, so the edge below a wall is lit and the edge above
 * one is shadowed.
 */
export function tileDecals(
  floor: FloorPalette,
  at: (x: number, y: number) => number,
  x: number,
  y: number
): Decal[] {
  const tile = at(x, y);
  const out: Decal[] = [];
  const surface = seamSide(floor.surface, x, y);

  // --- rock ---------------------------------------------------------------
  if (tile === WALL) {
    if (!isWallFace(at, x, y)) return out;

    if (surface === 'flesh') out.push(...fleshWall(floor, x, y));
    else if (surface === 'crystal') out.push(...crystalWall(floor, x, y));
    else out.push(...dugWall(floor, x, y));

    // The top of the wall, which is what an overhead light actually reaches.
    // A wall with floor BELOW it is the face you are looking at.
    if (at(x, y - 1) === WALL || at(x, y - 1) === undefined) {
      out.push({ x: 0, y: 0, w: 1, h: U, colour: floor.rockLit, alpha: 0.45 });
    }
    if (at(x, y + 1) !== WALL) {
      out.push({ x: 0, y: 1 - U * 1.5, w: 1, h: U * 1.5, colour: floor.rockShade, alpha: 0.75 });
    }
    if (floor.surface === 'seam') out.push(...wallGrowth(floor, x, y));
    return out;
  }

  // The two landmarks, over whatever the floor already is: you have to be able
  // to find the way on before you have crossed the room.
  if (tile === ENTRANCE || tile === EXIT) {
    out.push(...mouth(floor, surface, x, y));
    return out;
  }

  if (surface === 'flesh') {
    out.push(...fleshFloor(floor, x, y));
  } else if (surface === 'crystal') {
    out.push(...crystalFloor(floor, x, y));
  } else {
    // Bare rock everywhere, and the evidence only where the field says a pick
    // reached: you cross from a stretch somebody dug at into one nobody ever
    // did, rather than every room carrying the same props.
    const dug = worked(x, y);
    out.push(...rubble(floor, x, y, dug));
    if (dug && tile !== TUNNEL) out.push(...leavings(floor, x, y));
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

/**
 * The part of a zone that MOVES: drawn every frame from the tile's own hash and
 * the clock, never from stored state, so both renderers agree and nothing has
 * to be seeded. Every zone has some — how much is `motionDensity`.
 *
 * Everything here hangs off a FLOOR tile rather than the wall it grows from.
 * A wall's overhang would be painted before the floor under it and disappear.
 * Never over a landmark: the two holes are how you read the room.
 */
export function livingDecals(
  floor: FloorPalette,
  at: (x: number, y: number) => number,
  x: number,
  y: number,
  time: number
): Decal[] {
  const tile = at(x, y);
  if (tile === WALL || tile === ENTRANCE || tile === EXIT) return [];
  const surface = seamSide(floor.surface, x, y);
  const density = floor.motionDensity;
  const out: Decal[] = [];

  if (surface === 'stone') {
    // A web across a corner, and the thing that spun it walking its own
    // threads. Corners only — a web in the open is a net.
    for (const side of [-1, 1]) {
      if (at(x, y - 1) !== WALL || at(x + side, y) !== WALL) continue;
      if (tileNoise(x, y, 90 + side) > 0.55 * density) continue;
      const dir = side < 0 ? 1 : -1;
      const corner = side < 0 ? 0 : 1 - U;
      for (const r of [0.24, 0.44, 0.64]) {
        for (let i = 0; i <= 3; i++) {
          const a = (i / 3) * (Math.PI / 2);
          out.push({
            x: snap(corner + dir * Math.cos(a) * r),
            y: snap(Math.sin(a) * r),
            w: U,
            h: U,
            colour: floor.glint,
            alpha: 0.3,
          });
        }
      }
      // Back and forth along the middle thread rather than round and round: a
      // spider patrols its web, it does not orbit.
      const walk = Math.abs(((time * 0.22 + tileNoise(x, y, 92 + side)) % 2) - 1);
      const a = walk * (Math.PI / 2);
      out.push({
        x: snap(corner + dir * Math.cos(a) * 0.44) - U,
        y: snap(Math.sin(a) * 0.44),
        w: U * 2,
        h: U * 2,
        colour: floor.shade,
        alpha: 0.95,
      });
    }

    // A candle somebody lit and did not come back for. Only where the working
    // was: a light that moves is what makes a dark room read as occupied.
    if (worked(x, y) && at(x, y - 1) === WALL && tileNoise(x, y, 94) < 0.3 * density) {
      const px = snap(0.25 + tileNoise(x, y, 95) * 0.5);
      const foot = 0.75;
      const phase = tileNoise(x, y, 96) * Math.PI * 2;
      // Two rates that share no period, so the gutter never lands on a beat
      // you can count.
      const flick = Math.sin(time * 9.1 + phase) * 0.5 + Math.sin(time * 3.3 + phase * 2) * 0.5;
      const lean = Math.round(flick) * U;
      const tall = U * (flick > 0.35 ? 3 : 2);
      out.push({ x: px - U * 2, y: foot - U * 6, w: U * 6, h: U * 7, colour: floor.flame, alpha: 0.06 + Math.abs(flick) * 0.05 });
      out.push({ x: px, y: foot - U * 2, w: U * 2, h: U * 2, colour: floor.chip, alpha: 0.95 });
      out.push({ x: px + lean, y: foot - U * 2 - tall, w: U, h: tall, colour: floor.flame, alpha: 0.9 });
      out.push({ x: px + lean, y: foot - U * 3, w: U, h: U, colour: floor.flameCore, alpha: 1 });
    }
    return out;
  }

  if (surface === 'flesh') {
    // A tendril hanging off the ceiling edge, swinging from the root down.
    if (at(x, y - 1) === WALL && tileNoise(x, y, 90) < 0.45) {
      const root = snap(0.15 + tileNoise(x, y, 91) * 0.7);
      const len = 3 + Math.floor(tileNoise(x, y, 92) * 4);
      const phase = tileNoise(x, y, 93) * Math.PI * 2;
      for (let i = 1; i <= len; i++) {
        const sway = Math.round(Math.sin(time * 1.7 + phase - i * 0.5) * (i / len) * 2);
        out.push({
          x: Math.max(0, Math.min(1 - U, root + sway * U)),
          y: i * U,
          w: U,
          h: U,
          colour: i === len ? floor.glint : floor.rockLit,
          alpha: i === len ? 0.95 : 0.8,
        });
      }
    }
    // Spines through the side walls, extending and drawing back.
    for (const side of [-1, 1]) {
      if (at(x + side, y) !== WALL || tileNoise(x, y, 94 + side) > 0.3) continue;
      const phase = tileNoise(x, y, 96 + side) * Math.PI * 2;
      const reach = 1 + Math.round((Math.sin(time * 2.3 + phase) * 0.5 + 0.5) * 3);
      const top = snap(0.2 + tileNoise(x, y, 98 + side) * 0.6);
      out.push({
        x: side < 0 ? 0 : 1 - reach * U,
        y: top,
        w: reach * U,
        h: U,
        colour: floor.glint,
        alpha: 0.85,
      });
    }
    return out;
  }

  // Growth that CREEPS: a spur that gains and loses a pixel at a time, so the
  // ground is never quite the shape it was a moment ago.
  if (tileNoise(x, y, 90) < 0.3 * density) {
    const px = snap(0.1 + tileNoise(x, y, 91) * 0.7);
    const foot = snap(0.55 + tileNoise(x, y, 92) * 0.35);
    const phase = tileNoise(x, y, 93) * Math.PI * 2;
    const h = U * (2 + Math.round((Math.sin(time * 0.5 + phase) * 0.5 + 0.5) * 3));
    out.push({ x: px, y: foot - h, w: U, h, colour: floor.growth || floor.glint, alpha: 0.75 });
    out.push({ x: px, y: foot - h, w: U, h: U, colour: floor.glint, alpha: 0.95 });
  }

  // Light TRAVELLING along a facet, with a short trail behind it. The rock
  // carries it from one end of the tile to the other rather than glowing where
  // it stands, which is the difference between a facet and a lamp.
  if (tileNoise(x, y, 94) < 0.22 * density) {
    const down = tileNoise(x, y, 95) < 0.5;
    const across = snap(0.15 + tileNoise(x, y, 96) * 0.7);
    const head = (time * 0.45 + tileNoise(x, y, 97)) % 1;
    for (let i = 0; i < 3; i++) {
      const step = head - i * 0.09;
      if (step < 0 || step > 1) continue;
      const along = snap(0.08 + step * 0.84);
      out.push({
        x: down ? across : along,
        y: down ? along : across,
        w: U,
        h: U,
        colour: floor.glint,
        alpha: 0.85 - i * 0.25,
      });
    }
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
 * The sweep: the circle a swing actually covers, at the radius the sim used. A
 * node widening the reach by a quarter has to READ as a wider ring, which the
 * old fixed-size arc aimed at one target could never do.
 */
export function sweepRing(origin: Vec2, radius: number, t: number): FirePixel[] {
  const pixels: FirePixel[] = [];
  if (radius <= 0) return pixels;
  const grown = radius * (0.55 + 0.45 * Math.min(1, t * 1.6));
  const step = FIRE_PX * 2;
  const count = Math.max(24, Math.round((grown * Math.PI * 2) / step));

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const noise = tileNoise(i, Math.round(grown * 24), 71);
    // Broken rather than solid: a closed hoop reads as a shield.
    if (noise < 0.22) continue;
    pixels.push({
      x: onGrid(origin.x + Math.cos(angle) * grown * (0.97 + noise * 0.06)),
      y: onGrid(origin.y + Math.sin(angle) * grown * (0.97 + noise * 0.06)),
      size: FIRE_PX * (noise > 0.7 ? 2 : 1),
      shade: noise > 0.7 ? 2 : 1,
      alpha: (1 - t) * 0.9,
    });
  }
  return pixels;
}

/**
 * The lightning arc: a jag drawn WHOLE from the first frame and burning out
 * rather than travelling — what separates an arc from a bolt is that it is
 * already there. Each kink is hashed off the two ends, so a leap is the same
 * shape in both renderers and two leaps do not share a silhouette.
 */
export function lightningArc(from: Vec2, to: Vec2, t: number): FirePixel[] {
  const pixels: FirePixel[] = [];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const span = Math.hypot(dx, dy);
  if (span < 1e-3) return fireSparks(to, t);

  // Across the line, for the kink to travel along.
  const nx = -dy / span;
  const ny = dx / span;
  const salt = Math.round(from.x * 13 + from.y * 29 + to.x * 7 + to.y * 3);
  const JOINTS = 5;
  const kink = Math.min(0.7, span * 0.3);

  const at = (i: number): Vec2 => {
    const along = i / JOINTS;
    // Sides ALTERNATE: left to the hash, consecutive joints land the same way
    // half the time and it reads as a wavy rope. The noise only says how far.
    const off =
      i === 0 || i === JOINTS
        ? 0
        : (i % 2 === 0 ? 1 : -1) * (0.4 + tileNoise(i, salt, 53) * 0.6) * kink;
    return { x: from.x + dx * along + nx * off, y: from.y + dy * along + ny * off };
  };

  // Stamped one block at a time, or the line is a row of dots at joint spacing.
  for (let i = 0; i < JOINTS; i++) {
    const a = at(i);
    const b = at(i + 1);
    const steps = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / FIRE_PX));
    for (let s = 0; s <= steps; s++) {
      const x = a.x + (b.x - a.x) * (s / steps);
      const y = a.y + (b.y - a.y) * (s / steps);
      pixels.push({ x: onGrid(x), y: onGrid(y), size: FIRE_PX, shade: 2, alpha: 1 - t });
      // A cooler sheath on one side: a filament with a glow, not a rope.
      const flare = tileNoise(i * 9 + s, salt, 67);
      if (flare > 0.55) {
        pixels.push({
          x: onGrid(x + nx * FIRE_PX * (flare > 0.8 ? 2 : 1)),
          y: onGrid(y + ny * FIRE_PX * (flare > 0.8 ? 2 : 1)),
          size: FIRE_PX,
          shade: flare > 0.8 ? 0 : 1,
          alpha: (1 - t) * 0.7,
        });
      }
    }
  }
  // The ends spit, which is what makes it read as landing on something.
  for (const spark of fireSparks(to, t)) pixels.push(spark);
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
