/**
 * The renderer boundary. A renderer only READS RunState, owns its own surface
 * (a WebGL and a 2D context cannot share a canvas), and works in TILE UNITS —
 * scale and camera are its own business.
 */
import { ENTRANCE, EXIT, TUNNEL, WALL, cornerOf, isRock, patchKey, wangKey } from '../sim/grid';
import type { RunState } from '../sim/run';
import type { Grid, Vec2 } from '../sim/grid';
import type { ZoneSet } from './generated-tiles';
import type { AuraDef, MapTheme } from '../types';
import { patchNoise, tileNoise } from '../noise';

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
  /** A wound floated over the hero: darker than `ember`, which is fire. */
  hurt: string;
  citrine: string;
  tier1: string;
  tier2: string;
  tier3: string;
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
  lookAt(at: Vec2): void; // point at a TILE, and stop following, as a drag does
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

/**
 * As close as the hero's reach allows. `MIN_TILES_VISIBLE` is the governor —
 * the ceiling is only there so a tall monitor does not fill itself with four
 * tiles — because how big a creature is on screen is what decides how much of
 * its art can be seen at all, and a sprite is one tile.
 */
export const ZOOM_CEILING = 3;

export function defaultZoom(shortAxisPx: number): number {
  // Unmeasured: headless, or not laid out yet. 1x here would boot at Fit,
  // which is the one scale a fight is unreadable at.
  if (!(shortAxisPx > 0)) return 2;
  const affordable = shortAxisPx / MIN_TILES_VISIBLE / TILE_AT_1X;
  return clampZoom(Math.min(ZOOM_CEILING, affordable));
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
  // A tier colour is CONTENT and means the same on a card as on the floor.
  ['tier1', '--tier1'],
  ['tier2', '--tier2'],
  ['tier3', '--tier3'],
  ['quartz', '--quartz'],
  ['verdite', '--verdite'],
  ['ember', '--ember'],
  ['hurt', '--hurt'],
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
  // None of these is elemental: a move is a move and a buff is a buff.
  if (kind === 'blink') return palette.quartz;
  // A jump is drawn in its own ink, or the two movers are indistinguishable.
  if (kind === 'leap') return palette.verdite;
  if (kind === 'crit_surge') return palette.citrine;
  return damageColour(palette, damageType);
}

/** WHAT A FLOATING NUMBER IS INKED IN, and the EDGE under it — *"the white
 *  blends in"* — so it reads over lamplit stone instead of washing out. One
 *  seam, so a colour cannot mean two things: green is life arriving, `hurt` is
 *  life leaving, citrine is coin and a critical, dark is damage dealt. */
export function floaterInk(
  palette: Palette,
  f: { crit: boolean; on: string; tick?: string; kind?: string },
  ailmentColour?: string
): { fill: string; edge: string } {
  const lit = { edge: palette.void };
  if (f.kind === 'loot' || f.kind === 'heal') return { fill: palette.verdite, ...lit };
  if (f.kind === 'gold') return { fill: palette.citrine, ...lit };
  if (f.tick && ailmentColour) return { fill: ailmentColour, ...lit };
  if (f.kind === 'note') return { fill: palette.chalk, ...lit };
  if (f.on === 'hero') return { fill: palette.hurt, edge: palette.chalk };
  if (f.crit) return { fill: palette.citrine, ...lit };
  return { fill: palette.void, edge: palette.chalk };
}

/** HOW BIG A DROP LIES ON THE FLOOR, as its LONGEST side in tiles — the long
 *  side rather than the width, so a sword drawn tall and a shield drawn wide
 *  both land at the size they should look. JEWELLERY IS ONLY SLIGHTLY SMALLER
 *  THAN THE SMALLEST GEAR, the user's call, so a ring is not a speck. */
export const LOOT_SPAN: Record<string, number> = {
  weapon: 0.92,
  weapon2h: 1.2, // a two-hander is the biggest thing that drops
  shield: 0.86,
  body: 0.88,
  helmet: 0.62,
  boots: 0.62,
  gloves: 0.56,
  amulet: 0.52,
  ring: 0.5,
};

/** The span for one base. `weapon` is the fallback for an unsized kind. */
export function lootSpan(kind: string, hands = 1): number {
  if (kind === 'weapon' && hands > 1) return LOOT_SPAN.weapon2h;
  return LOOT_SPAN[kind] ?? LOOT_SPAN.weapon;
}

/** A DROP'S BEAM: colour and reach, off `lootRank` so a card and the floor
 *  cannot disagree. An ordinary piece gets a low dull column rather than none. */
export function lootBeam(palette: Palette, rank: number): { colour: string; tall: number; lit: number } {
  if (rank >= 3) return { colour: palette.tier3, tall: 3.2, lit: 0.85 };
  if (rank === 2) return { colour: palette.amethyst, tall: 2.4, lit: 0.7 };
  if (rank === 1) return { colour: palette.tier2, tall: 1.6, lit: 0.5 };
  return { colour: palette.tier1, tall: 0.9, lit: 0.28 };
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
 * WHAT THE BOSS IS DOING, ON THE BOSS ITSELF. A phase you have to read off a
 * word is one you learn by dying, and a ring on the floor is a Fall circle's
 * vocabulary rather than the body's — so this is the BODY: the Reading turns
 * it red, and the Split leaves it grey with a swirl going round over its head.
 *
 * `tint` is what its own ink is multiplied by; `swirl` is how bright the dazed
 * marks are and 0 is none; `colour` is what they are drawn in. `ran` is the
 * seconds the phase has run, so both can breathe.
 */
export function bossTelegraph(
  palette: Palette,
  phase: string | null,
  ran: number
): { tint: string; swirl: number; colour: string } | null {
  const beat = 0.5 + 0.5 * Math.sin(ran * 4.2);
  // BURNING. The tint MULTIPLIES, so it can only darken — mixing toward chalk
  // is what makes the red throb rather than sit there as one flat wash.
  if (phase === 'reading') {
    return { tint: mix(palette.ember, palette.chalk, 0.1 + 0.3 * beat), swirl: 0, colour: palette.ember };
  }
  // DAZED, and it is not swinging at you: `RunSim.stalled` is the same answer
  // in the sim, so the picture and the rule cannot drift.
  if (phase === 'split') {
    return { tint: palette.dust, swirl: 0.7 + 0.3 * beat, colour: palette.citrine };
  }
  return null;
}

/**
 * Three SWIRLS going round over a dazed head — offsets in TILES from the
 * body's own spot, so a renderer only has to say how tall and how big it is.
 * Each is an open arc rather than a dot, because a dot going round in a
 * flattened ring is a dot and a hook going round is the thing everybody
 * already reads as stunned. The far half is smaller and fainter.
 */
/**
 * What a body CARRYING an ailment looks like: small, over the body, read at a
 * glance, and a pure function so the two renderers cannot disagree. `stacks`
 * only THICKENS it — twelve Burns as twelve times the marks is a body nobody
 * can see, so the count caps into a fraction and size carries the rest.
 */
export function ailmentMarks(
  id: string,
  stacks: number,
  head: number,
  size: number,
  elapsed: number
): { x: number; y: number; r: number; alpha: number }[] {
  if (stacks <= 0) return [];
  const weight = Math.min(1, stacks / 6);
  const many = 2 + Math.round(weight * 2);
  const out: { x: number; y: number; r: number; alpha: number }[] = [];

  for (let i = 0; i < many; i++) {
    // Each mark on its own clock, or they pulse in lockstep and read as one
    // flashing thing rather than as several.
    const seed = i * 2.399;
    const t = (elapsed * RISE[id] + seed) % 1;
    const across = Math.sin(seed * 4.7) * size * 0.22;

    // Held AROUND the body rather than leaving it: frost sits ON a thing.
    if (id === 'chill' || id === 'exposure') {
      const a = seed + elapsed * 0.7;
      out.push({
        x: Math.cos(a) * size * 0.3,
        y: -head * 0.55 + Math.sin(a) * size * 0.14,
        r: size * (0.05 + weight * 0.035),
        alpha: 0.55 + 0.45 * Math.sin(elapsed * 3 + seed),
      });
      continue;
    }

    // Everything else LEAVES the body: flame and poison up, blood down.
    const up = id === 'bleed' ? -1 : 1;
    out.push({
      x: across * (1 - t * 0.4),
      y: -head * 0.35 - up * t * size * 0.5,
      r: size * (0.045 + weight * 0.03) * (1 - t * 0.55),
      alpha: (1 - t) * (0.6 + weight * 0.4),
    });
  }
  return out;
}

/** How fast each one moves off the body. Frost and Exposure orbit instead. */
const RISE: Record<string, number> = {
  burn: 1.5,
  bleed: 1.1,
  poison: 0.9,
  shock: 2.6,
  curse: 1.0,
  chill: 1,
  exposure: 1,
};

/** A damage GROUP's colour, mixed from its own two ends rather than borrowed
 *  from one member: an aura softening Fire, Cold and Lightning alike may not
 *  look like a fire aura. */
export function groupColour(palette: Palette, group: string): string {
  return group === 'elemental'
    ? mix(damageColour(palette, 'fire'), damageColour(palette, 'cold'), 0.5)
    : mix(damageColour(palette, 'poison'), damageColour(palette, 'dark'), 0.5);
}

/** A ward coming apart: three BROKEN arcs around a body's feet, turning off
 *  `elapsed` alone so both renderers draw the same instant. */
export function shredMarks(
  size: number,
  elapsed: number
): { from: number; to: number; r: number; width: number; alpha: number }[] {
  const spin = elapsed * 1.35;
  return [0, 1, 2].map((i) => {
    const a = spin + (i * Math.PI * 2) / 3;
    return {
      from: a,
      to: a + 1.25,
      r: size * 0.44,
      width: size * 0.055,
      alpha: 0.75,
    };
  });
}

export function dazeMarks(
  head: number,
  size: number,
  elapsed: number
): { x: number; y: number; r: number; from: number; to: number; width: number; alpha: number }[] {
  const spin = elapsed * 3.1;
  return [0, 1, 2].map((i) => {
    const a = spin + (i * Math.PI * 2) / 3;
    const near = 0.5 + 0.5 * Math.sin(a);
    const small = 0.65 + 0.35 * near;
    return {
      x: Math.cos(a) * size * 0.26,
      y: -head + size * 0.05 + Math.sin(a) * size * 0.08,
      r: size * 0.07 * small,
      from: a + 0.7,
      to: a + 3.5,
      width: size * 0.035 * small,
      alpha: 0.5 + 0.5 * near,
    };
  });
}

/** Sparse art as full rows: a table keyed by row number, padded to the grid.
 *  Every hand-drawn table is written that way — only the rows with ink in
 *  them are typed out. */
export const gridRows =
  (grid: number) =>
  (from: Record<number, string>): string[] =>
    Array.from({ length: grid }, (_, y) => from[y] ?? '.'.repeat(grid));

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

/** A corner's place in the base-three key, high to low. */
const PLACE = [27, 9, 3, 1];

const NEAREST = new WeakMap<ZoneSet, Map<number, number>>();

/** The nearest key a set holds — it answers 21 of the 81, and a key nothing
 *  draws is a black hole. The cut face is BETWEEN floor and rock, so trading it
 *  for either is one step where floor for rock is three. Synthesising the
 *  missing keys out of QUADRANTS is WRONG and looks right on paper: a
 *  quadrant's picture is not decided by its own corner. */
function nearestKey(set: ZoneSet, key: number): number {
  let seen = NEAREST.get(set);
  if (!seen) NEAREST.set(set, (seen = new Map()));
  const found = seen.get(key);
  if (found !== undefined) return found;
  const mine = PLACE.map((p) => Math.floor(key / p) % 3);
  let best = 0;
  let cost = Infinity;
  for (const tile of set.tiles) {
    let apart = 0;
    for (let c = 0; c < 4; c++) {
      const theirs = Math.floor(tile.key / PLACE[c]) % 3;
      apart += mine[c] === theirs ? 0 : mine[c] === 2 || theirs === 2 ? 1 : 3;
    }
    if (apart < cost) {
      cost = apart;
      best = tile.key;
    }
  }
  seen.set(key, best);
  return best;
}

/** WHICH TILE OF A SET DRAWS A CELL — an index into `set.tiles`, -1 for none.
 *  Here because scoring a key is the one answer every surface has to read.
 *  `over`/`under` are the rows either side of the tile's own two and they are
 *  CORNER values — read as tile type instead, the four wall CONTINUATIONS are
 *  picked at random and the lip repeats down a face as a pale line. */
export function zoneTileAt(
  set: ZoneSet,
  grid: Grid,
  x: number,
  y: number,
  solid: (tile: number) => boolean = isRock
): number {
  const key = nearestKey(set, wangKey(grid, x, y, solid));
  const want = [
    cornerOf(grid, x, y - 1, solid),
    cornerOf(grid, x + 1, y - 1, solid),
    cornerOf(grid, x, y + 2, solid),
    cornerOf(grid, x + 1, y + 2, solid),
  ];
  let best = -1;
  let score = -Infinity;
  set.tiles.forEach((tile, i) => {
    if (tile.key !== key) return;
    let mine = 0;
    [tile.over[1], tile.over[2], tile.under[1], tile.under[2]].forEach((asked, k) => {
      if (asked !== 255) mine += asked === want[k] ? 2 : -3;
    });
    if (mine > score) {
      score = mine;
      best = i;
    }
  });
  return best;
}

/** Every corner OUTSIDE: the set's picture there is the surrounding terrain
 *  drawn again in a tone toned separately — a halo of the wrong floor squaring
 *  every pool off into its bounding box. A patch set is 16 keys of 0 and 1
 *  only, being a blend and not a cliff, so it needs no nearest-key rescue. */
const PATCH_CLEAR = 40;
export function patchTileAt(kit: ZoneSet, grid: Grid, x: number, y: number, index: number): number {
  const key = patchKey(grid, x, y, index);
  if (key === PATCH_CLEAR) return -1;
  return kit.tiles.findIndex((t) => t.key === key);
}

export const ROCK_DEPTH = 2; // tiles of rock drawn past the floor they wall in

/** THE GRAIN a ground cell wears over its floor tile: -1 for none, else an
 *  index into the zone's sheet, light to heavy. A hash, never a draw. */
export const GRAIN = { bare: 0.7, alpha: 0.4, skew: 3 };
export function grainAt(count: number, x: number, y: number): number {
  if (count <= 0 || tileNoise(x, y, 73) < GRAIN.bare) return -1;
  return Math.min(count - 1, Math.floor(Math.pow(tileNoise(x, y, 74), GRAIN.skew) * count));
}

/** How lit a GROUND cell is, 0..1: a slow drift, darker at the rock's foot. */
export const LIGHT = { low: 0.8, foot: 0.78, scale: 7 };
export function groundLight(grid: Grid, x: number, y: number, drifting = true): number {
  // The drift is BLOCKY at the cell and the test level wears none of it: on a
  // floor with less grain to hide it, it read as patches of tiles.
  const drift = drifting ? LIGHT.low + (1 - LIGHT.low) * patchNoise(x, y, LIGHT.scale, 71) : 1;
  let open = 0; // how open the five-by-five is: a slope, never two rings

  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) if (grid.at(x + dx, y + dy) !== WALL) open++;
  }
  return drift * (LIGHT.foot + (1 - LIGHT.foot) * (open / 25));
}

/** How lit a rock tile is, by how far it sits from the nearest thing that is
 *  not rock: 1 at the cut face, 0 past `ROCK_DEPTH`. A generated tileset covers
 *  the whole padded grid, and two thousand rock tiles read as wallpaper. */
export function wallFade(at: (x: number, y: number) => number, x: number, y: number): number {
  if (at(x, y) !== WALL) return 1;
  for (let r = 1; r <= ROCK_DEPTH; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (at(x + dx, y + dy) !== WALL) return 1 - (r - 1) / ROCK_DEPTH;
      }
    }
  }
  return 0;
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

  /** A case of volumes, and the one prop that is TALL. It runs well above its
   *  own tile: height is the whole silhouette, and a room of these cannot be
   *  mistaken for a room of trestles. */
  shelf: (floor, x, y) => {
    const out: Decal[] = [
      { x: 0.1, y: -0.62, w: U, h: 1.5, colour: floor.timber, alpha: 1 },
      { x: 0.84, y: -0.62, w: U, h: 1.5, colour: floor.timber, alpha: 1 },
    ];
    for (let i = 0; i < 4; i++) {
      const at = snap(-0.5 + i * 0.34);
      out.push({ x: 0.1, y: at, w: 0.78, h: U, colour: floor.timber, alpha: 0.9 });
      let cursor = 0.14;
      for (let n = 0; cursor < 0.78; n++) {
        const wide = tileNoise(x, y, 30 + i * 5 + n) < 0.45;
        const w = wide ? U * 2 : U;
        const tall = snap(0.18 + tileNoise(x, y, 51 + i * 5 + n) * 0.1);
        out.push({ x: snap(cursor), y: snap(at - tall), w, h: tall, colour: floor.chip, alpha: 0.85 });
        cursor += w + U;
      }
    }
    return out;
  },

  /** A stone table: WIDE and low, the opposite silhouette to the shelf. Spans
   *  the whole tile like the bench so two side by side are one slab. */
  slab: (floor, x, y) => {
    const out: Decal[] = [
      { x: 0, y: 0.5, w: 1, h: U * 3, colour: floor.rockLit, alpha: 1 },
      { x: 0, y: 0.5 + U * 3, w: 1, h: U * 2, colour: floor.rockShade, alpha: 0.9 },
    ];
    for (const leg of [0.1, 0.78]) {
      out.push({ x: leg, y: 0.5 + U * 5, w: U * 2, h: 0.22, colour: floor.rockShade, alpha: 0.8 });
    }
    // Something part-sorted on top, low and never symmetrical.
    for (let i = 0; i < 3; i++) {
      if (tileNoise(x, y, 80 + i) < 0.4) continue;
      out.push({
        x: snap(0.12 + i * 0.3),
        y: snap(0.5 - U * 2),
        w: U * 2,
        h: U * 2,
        colour: floor.chip,
        alpha: 0.8,
      });
    }
    return out;
  },

  /** A heap: ROUND and low, with no straight edge anywhere on it. */
  bones: (floor, x, y) => {
    const out: Decal[] = [];
    for (let i = 0; i < 7; i++) {
      const n = tileNoise(x, y, 90 + i);
      const w = n < 0.5 ? U * 3 : U * 2;
      out.push({
        x: snap(0.1 + n * 0.6),
        y: snap(0.5 + tileNoise(x, y, 97 + i) * 0.32),
        w,
        h: U,
        colour: i % 3 === 0 ? floor.rockLit : floor.chip,
        alpha: 0.85,
      });
    }
    return out;
  },

  /** The thing he is watching: a RING, hung, and the only curve in the game's
   *  furniture. Drawn as a ring of blocks because a circle at this size is one. */
  orrery: (floor, x, y) => {
    const out: Decal[] = [
      { x: 0.49, y: -0.7, w: U, h: 0.55, colour: floor.timber, alpha: 0.8 },
    ];
    const ring: Array<[number, number]> = [
      [0.38, -0.2], [0.5, -0.24], [0.62, -0.2],
      [0.7, -0.08], [0.72, 0.06], [0.7, 0.2],
      [0.62, 0.3], [0.5, 0.34], [0.38, 0.3],
      [0.3, 0.2], [0.28, 0.06], [0.3, -0.08],
    ];
    for (const [rx, ry] of ring) {
      out.push({ x: snap(rx), y: snap(ry), w: U, h: U, colour: floor.glint, alpha: 0.9 });
    }
    // One bead on it, and the middle it goes round.
    const spin = Math.floor(tileNoise(x, y, 12) * ring.length);
    const [bx, by] = ring[spin];
    out.push({ x: snap(bx), y: snap(by), w: U * 2, h: U * 2, colour: floor.flame, alpha: 0.85 });
    out.push({ x: 0.47, y: 0.02, w: U * 2, h: U * 2, colour: floor.lit, alpha: 0.7 });
    return out;
  },

  /** A pedestal: NARROW and upright, so the orrery room has a vertical that is
   *  not a shelf and not a lamp. */
  plinth: (floor) => [
    { x: 0.3, y: 0.62, w: 0.4, h: U * 2, colour: floor.rockShade, alpha: 0.95 },
    { x: 0.36, y: 0.16, w: 0.28, h: 0.46, colour: floor.rockLit, alpha: 1 },
    { x: 0.28, y: 0.08, w: 0.44, h: U * 2, colour: floor.rockLit, alpha: 1 },
    { x: 0.42, y: -0.02, w: U * 2, h: U * 2, colour: floor.glint, alpha: 0.9 },
  ],

  /** A frame of lamps hung in a row: the workshop's own shape, and the only
   *  prop that is wide AND tall. */
  lamprack: (floor, x, y) => {
    const out: Decal[] = [
      { x: 0.08, y: -0.5, w: U, h: 1.3, colour: floor.timber, alpha: 1 },
      { x: 0.88, y: -0.5, w: U, h: 1.3, colour: floor.timber, alpha: 1 },
      { x: 0.08, y: -0.5, w: 0.82, h: U, colour: floor.timber, alpha: 1 },
    ];
    for (let i = 0; i < 3; i++) {
      const at = snap(0.18 + i * 0.28);
      const drop = snap(0.1 + tileNoise(x, y, 60 + i) * 0.2);
      out.push({ x: at, y: -0.5, w: U, h: drop, colour: floor.timber, alpha: 0.7 });
      const alight = tileNoise(x, y, 68 + i) > 0.55;
      out.push({
        x: snap(at - U),
        y: snap(-0.5 + drop),
        w: U * 3,
        h: U * 3,
        colour: alight ? floor.flame : floor.chip,
        alpha: alight ? 0.9 : 0.65,
      });
    }
    return out;
  },
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
 * Ice driven up THROUGH the ground under a body: blades growing out of the
 * point they landed on, tallest in the middle. Drawn at the TARGET rather than
 * travelling to it — nothing here is in flight, and a bolt crossing the room
 * would say the opposite.
 */
export function iceSpikes(at: Vec2, t: number): FirePixel[] {
  const pixels: FirePixel[] = [];
  const up = Math.min(1, t * 3); // they arrive fast and then stand and fade
  const alpha = 1 - Math.max(0, (t - 0.35) / 0.65);

  for (let i = 0; i < 5; i++) { // a fifth of a tile apart; at an eighth they merge
    const noise = tileNoise(i, Math.round(at.x * 16 + at.y * 32), 29);
    const lean = (i - 2) * 0.2 + (noise - 0.5) * 0.06;
    const tall = (0.8 - Math.abs(i - 2) * 0.17) * (0.7 + noise * 0.5) * up;
    const foot = at.x + lean * 0.9;
    for (let step = 0; step * FIRE_PX < tall; step++) {
      const along = (step * FIRE_PX) / Math.max(tall, 1e-3);
      pixels.push({
        x: onGrid(foot + lean * along * 0.35),
        y: onGrid(at.y - step * FIRE_PX),
        size: FIRE_PX * (along > 0.7 ? 1 : 2), // a blade tapers toward its point
        shade: along > 0.55 ? 2 : 1,
        alpha,
      });
    }
  }
  return pixels;
}

/**
 * The wedge a Cone covers, as a front of broken ground travelling out along it.
 * The two RIM corners are what the sim used, so both things a build buys — how
 * wide it opens and how far it runs — are read off the picture rather than
 * assumed. A ring would say neither.
 */
export function coneWedge(origin: Vec2, left: Vec2, right: Vec2, t: number): FirePixel[] {
  const pixels: FirePixel[] = [];
  const a0 = Math.atan2(left.y - origin.y, left.x - origin.x);
  let a1 = Math.atan2(right.y - origin.y, right.x - origin.x);
  // The rim runs the SHORT way round from left to right, which past half a
  // turn is the reflex side — an Encirclement wedge is nearly a whole circle.
  while (a1 < a0) a1 += Math.PI * 2;
  const reach = Math.hypot(left.x - origin.x, left.y - origin.y);
  if (reach <= 0) return pixels;

  // The front, not the whole wedge: what a wave leaves behind it is the crack,
  // and a filled cone reads as a floor the fight is standing on.
  const front = reach * (0.25 + 0.75 * Math.min(1, t * 1.5));
  const step = FIRE_PX * 2;
  const count = Math.max(10, Math.round(((a1 - a0) * front) / step));

  for (let i = 0; i <= count; i++) {
    const angle = a0 + ((a1 - a0) * i) / count;
    const noise = tileNoise(i, Math.round(front * 24), 53);
    // Ragged, or it reads as an arc somebody drew rather than ground opening.
    const out = front * (0.86 + noise * 0.18);
    pixels.push({
      x: onGrid(origin.x + Math.cos(angle) * out),
      y: onGrid(origin.y + Math.sin(angle) * out),
      size: FIRE_PX * (noise > 0.62 ? 3 : 2),
      shade: noise > 0.72 ? 2 : 1,
      alpha: (1 - t) * 0.95,
    });
  }

  // And the two edges, so the wedge has sides and you can see where it stops.
  for (const angle of [a0, a1]) {
    for (let i = 1; i <= 5; i++) {
      const out = (front * i) / 5;
      pixels.push({
        x: onGrid(origin.x + Math.cos(angle) * out),
        y: onGrid(origin.y + Math.sin(angle) * out),
        size: FIRE_PX,
        shade: 0,
        alpha: (1 - t) * 0.55,
      });
    }
  }
  return pixels;
}

/**
 * The lightning arc: a jag drawn WHOLE from the first frame and burning out
 * rather than travelling — what separates an arc from a bolt is that it is
 * already there. Each kink is hashed off the two ends, so a leap is the same
 * shape in both renderers and two leaps do not share a silhouette.
 */
/**
 * The ice shard: a faceted spike flying point-first, and a scatter of chips
 * where it lands. Built along the direction of travel rather than stamped off
 * a grid like `BALL`, because a shard has to POINT and a rotated grid does
 * not — which is the whole of what tells it apart from a fireball at speed.
 */
export function frostShard(from: Vec2, to: Vec2, t: number): FirePixel[] {
  const travel = Math.min(1, t * 1.9);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const span = Math.hypot(dx, dy) || 1;
  const ux = dx / span;
  const uy = dy / span;
  const nx = -uy;
  const ny = ux;
  const hx = from.x + dx * travel;
  const hy = from.y + dy * travel;
  const salt = Math.round(from.x * 11 + from.y * 23 + to.x * 5);
  const pixels: FirePixel[] = [];

  // The spike. Half-width steps DOWN toward the tip so the silhouette is
  // faceted rather than a smooth cone, and it is as big across as the fireball
  // is — smaller, it reads as a smudge beside one rather than as a shard.
  const wide = [0, 1, 2, 3, 3, 3, 2, 2, 1, 1];
  for (let i = 0; i < wide.length; i++) {
    const bx = hx - ux * i * FIRE_PX;
    const by = hy - uy * i * FIRE_PX;
    for (let j = -wide[i]; j <= wide[i]; j++) {
      // Mostly the OUTER ink, with a thin core: the shared ramp runs toward
      // white at shade 2, and a shard drawn in it stops reading as cold.
      const edge = Math.abs(j) === wide[i];
      pixels.push({
        x: onGrid(bx + nx * j * FIRE_PX),
        y: onGrid(by + ny * j * FIRE_PX),
        size: FIRE_PX,
        shade: i <= 1 ? 2 : edge ? 0 : j === 0 ? 2 : 1,
        alpha: 1,
      });
    }
  }

  // Chips shed behind it, cooling and drifting off the line.
  for (let i = 1; i <= 6; i++) {
    const back = Math.max(0, travel - i * 0.045);
    const noise = tileNoise(i, salt, 41) - 0.5;
    pixels.push({
      x: onGrid(from.x + dx * back + nx * noise * (0.06 + i * 0.03)),
      y: onGrid(from.y + dy * back + ny * noise * (0.06 + i * 0.03)),
      size: FIRE_PX * (i > 4 ? 1 : 2),
      shade: i > 4 ? 0 : 1,
      alpha: (1 - i / 7) * (1 - t * 0.6),
    });
  }

  // And it SHATTERS rather than fading: the arrival is the readable part.
  if (travel >= 1) {
    const burst = Math.max(0, (t - 0.5) * 2);
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 + tileNoise(i, salt, 59);
      const r = burst * (0.18 + tileNoise(i, salt, 71) * 0.3);
      pixels.push({
        x: onGrid(to.x + Math.cos(angle) * r),
        y: onGrid(to.y + Math.sin(angle) * r),
        size: FIRE_PX * 2,
        shade: i % 3 === 0 ? 2 : 1,
        alpha: Math.max(0, 1 - burst * 1.4),
      });
    }
  }
  return pixels;
}

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
  // A FORK off one joint, dying before it arrives. A single jagged line reads
  // as a rope however much it kinks; a branch that goes nowhere is the thing
  // that says lightning, and it is the only part not on the path to a target.
  const split = 1 + (salt % (JOINTS - 1));
  const root = at(split);
  const away = tileNoise(split, salt, 83) > 0.5 ? 1 : -1;
  const reach = Math.min(0.9, span * 0.42);
  const tip = {
    x: root.x + (dx / span) * reach * 0.6 + nx * away * reach,
    y: root.y + (dy / span) * reach * 0.6 + ny * away * reach,
  };
  const legs = Math.max(1, Math.round(Math.hypot(tip.x - root.x, tip.y - root.y) / FIRE_PX));
  for (let s = 0; s <= legs; s++) {
    const along = s / legs;
    const bend = Math.sin(along * Math.PI * 2) * FIRE_PX * 1.5;
    pixels.push({
      x: onGrid(root.x + (tip.x - root.x) * along + nx * bend),
      y: onGrid(root.y + (tip.y - root.y) * along + ny * bend),
      size: FIRE_PX,
      shade: along > 0.6 ? 0 : 1,
      alpha: (1 - t) * (1 - along) * 0.9,
    });
  }

  // The ends spit, which is what makes it read as landing on something.
  for (const spark of fireSparks(to, t)) pixels.push(spark);
  return pixels;
}

/** How long the arrow is DRAWN, in tiles: the sprite is `VFX_ART.arrow`, and
 *  its head sits at the point the flight has reached. */
export const ARROW_SPAN = 0.62;
/** Its share of its own life spent travelling. Slower than `fireBolt`: the
 *  hero fights at the range the monsters close to, so a shot mostly crosses
 *  ONE tile and a fast one is never seen. */
const ARROW_SPEED = 1.25;
const ARROW_LAND = 1 / ARROW_SPEED;

export interface Flight {
  x: number;
  y: number;
  angle: number;
  alpha: number;
}

/**
 * Where the arrow has got to and which way it is pointing. One answer for the
 * sprite Pixi lays down and the shaft canvas2d draws instead, so two drawings
 * of one arrow cannot disagree about where it is.
 */
export function arrowFlight(from: Vec2, to: Vec2, t: number): Flight {
  const travel = Math.min(1, t * ARROW_SPEED);
  const after = Math.max(0, (t - ARROW_LAND) / (1 - ARROW_LAND));
  return {
    x: from.x + (to.x - from.x) * travel,
    y: from.y + (to.y - from.y) * travel,
    angle: Math.atan2(to.y - from.y, to.x - from.x),
    alpha: 1 - after,
  };
}

function along(from: Vec2, to: Vec2): { ux: number; uy: number; nx: number; ny: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const span = Math.hypot(dx, dy) || 1;
  return { ux: dx / span, uy: dy / span, nx: -dy / span, ny: dx / span };
}

/** The arrow ITSELF, for the renderer with no sprites: a gold dart with a
 *  broad head and a split tail, built along the line it flies. */
export function arrowShaft(from: Vec2, to: Vec2, t: number): FirePixel[] {
  const flight = arrowFlight(from, to, t);
  const { ux, uy, nx, ny } = along(from, to);
  const pixels: FirePixel[] = [];
  if (flight.alpha <= 0) return pixels;

  const steps = Math.round(ARROW_SPAN / FIRE_PX);
  for (let i = 0; i <= steps; i++) {
    const back = i * FIRE_PX;
    // The head is three blocks across and the shaft one, so the silhouette
    // POINTS — which is the whole of what tells an arrow from a bolt.
    const wide = i < 2 ? 1 : i < 4 ? 2 : i > steps - 4 ? 2 : 0;
    for (let j = -wide; j <= wide; j++) {
      if (i > steps - 4 && j === 0) continue;
      pixels.push({
        x: onGrid(flight.x - ux * back + nx * j * FIRE_PX),
        y: onGrid(flight.y - uy * back + ny * j * FIRE_PX),
        size: FIRE_PX,
        shade: i < 3 ? 2 : j === 0 ? 1 : 0,
        alpha: flight.alpha,
      });
    }
  }
  return pixels;
}

/** How far ABOVE what it landed on the cloud opens, and how wide it is drawn
 *  there, both in tiles. */
export const STORM_HEIGHT = 3;
export const STORM_SPAN = 1.6;
/** Fraction of the effect's life spent boiling up — the arrow is still in the
 *  air until then — and the point past which it is breaking apart again. */
const STORM_OPEN = 0.3;
const STORM_GONE = 0.7;
/** How many bolts come down, the share of the life each has to fall in, and
 *  how far a joint of one leans off the drop. */
const STORM_BOLTS = 3;
const STORM_FALL = 0.42;
const STORM_KINK = 0.16;

export interface Cloud {
  x: number;
  y: number;
  /** Tiles across, right now: it boils up rather than arriving at full size. */
  span: number;
  alpha: number;
}

/** Where the cloud is and how much of it there is. Pixi lays the generated
 *  picture on this and canvas2d draws `stormPuffs` of it. */
export function stormCloud(at: Vec2, t: number): Cloud {
  const open = Math.min(1, t / STORM_OPEN);
  const gone = Math.max(0, (t - STORM_GONE) / (1 - STORM_GONE));
  return {
    x: at.x,
    y: at.y - STORM_HEIGHT,
    span: STORM_SPAN * (0.55 + 0.45 * (1 - (1 - open) * (1 - open))),
    alpha: Math.min(1, open * 1.4) * (1 - gone),
  };
}

export interface CloudPuff {
  x: number;
  y: number;
  r: number;
}

/** The cloud as lumps, for the renderer with no sprites. Hashed off its own
 *  place, so a cloud is the same cloud every time it opens there. */
export function stormPuffs(cloud: Cloud): CloudPuff[] {
  const salt = Math.round(cloud.x * 17 + cloud.y * 7);
  const puffs: CloudPuff[] = [];
  const COUNT = 7;
  for (let i = 0; i < COUNT; i++) {
    const noise = tileNoise(i, salt, 113);
    const across = (i / (COUNT - 1) - 0.5) * cloud.span * 0.86;
    puffs.push({
      x: cloud.x + across,
      y: cloud.y - (0.5 - Math.abs(across) / cloud.span) * cloud.span * 0.22 + noise * 0.06,
      r: cloud.span * (0.17 + (1 - Math.abs(across) / (cloud.span * 0.5)) * 0.1 + noise * 0.04),
    });
  }
  return puffs;
}

/**
 * The bolts, out of the cloud's underside and down onto what was hit. Each
 * starts on its own beat, so they come down one after another rather than as
 * one three-pronged fork — a storm is a run of strikes.
 *
 * Its own jag rather than `lightningArc`'s: that one kinks by a third of its
 * SPAN, which over a three-tile fall is a lazy zigzag, and it spits at both
 * ends — three of those inside one cloud is a heap of blocks rather than
 * lightning. A fall kinks sideways and lands once.
 */
export function stormBolts(at: Vec2, t: number): FirePixel[] {
  const cloud = stormCloud(at, t);
  const salt = Math.round(at.x * 13 + at.y * 29);
  const pixels: FirePixel[] = [];
  const JOINTS = 5;

  for (let i = 0; i < STORM_BOLTS; i++) {
    const start = STORM_OPEN + (i / STORM_BOLTS) * (1 - STORM_OPEN - STORM_FALL * 0.5);
    if (t < start) continue;
    const life = Math.min(1, (t - start) / STORM_FALL);
    const noise = tileNoise(i, salt, 127);
    const from = {
      x: cloud.x + (noise - 0.5) * cloud.span * 0.5,
      y: cloud.y + cloud.span * 0.16,
    };
    const to = { x: at.x + (noise - 0.5) * 0.34, y: at.y };

    const point = (j: number): Vec2 => {
      const down = j / JOINTS;
      const off =
        j === 0 || j === JOINTS
          ? 0
          : (j % 2 === 0 ? 1 : -1) * (0.4 + tileNoise(j, salt + i, 53) * 0.6) * STORM_KINK;
      return { x: from.x + (to.x - from.x) * down + off, y: from.y + (to.y - from.y) * down };
    };

    for (let j = 0; j < JOINTS; j++) {
      const a = point(j);
      const b = point(j + 1);
      const steps = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / FIRE_PX));
      for (let step = 0; step <= steps; step++) {
        const x = a.x + (b.x - a.x) * (step / steps);
        const y = a.y + (b.y - a.y) * (step / steps);
        pixels.push({ x: onGrid(x), y: onGrid(y), size: FIRE_PX, shade: 2, alpha: 1 - life });
        // A cooler sheath down one side, so it is a filament rather than a wire.
        const flare = tileNoise(j * 9 + step, salt + i, 67);
        if (flare > 0.6) {
          pixels.push({
            x: onGrid(x + FIRE_PX * (flare > 0.85 ? 2 : 1)),
            y: onGrid(y),
            size: FIRE_PX,
            shade: flare > 0.85 ? 0 : 1,
            alpha: (1 - life) * 0.7,
          });
        }
      }
    }
    // One burst where the storm lands: three of them is a pile of blocks.
    if (i === 0) for (const spark of fireSparks(to, life)) pixels.push(spark);
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
  fall: number; // 0 leaving the sky, 1 landing: Pixi stretches the glob by it
}

/** How many droplets fall per field. Enough to read as rain, cheap to draw. */
const DROP_COUNT = 16;
/** How far above the ground a droplet starts, in tiles. */
const DROP_HEIGHT = 2.6;
/** Fraction of the effect's life spent snapping open. */
const OPEN = 0.16;

/**
 * Snaps open, then HOLDS at the true radius: appearing at full size reads as an
 * aura. The POOL picture is drawn to this, so the art and what the sim
 * poisoned cannot disagree.
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
      fall,
    });
  }
  return drops;
}
