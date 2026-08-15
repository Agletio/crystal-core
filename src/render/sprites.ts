/**
 * Sprite sheets drawn at runtime onto offscreen canvases, so the repo carries
 * no binary assets and a palette change redraws everything.
 *
 * Death and recoil are transforms, because transforms are free and frames are
 * not.
 */
import type { Palette } from './renderer';
import { mix, spriteColour } from './renderer';
import { lookRows, roleChar } from './look';
import { DOLL_GRID, FAMILY_ART } from './gear-art';
import { BEASTIARY } from './bestiary';
import { GENERATED } from './generated-art';
import { PROP_ART } from './generated-props';
import type { MonsterRank } from './bestiary';
import { POSE_IDS } from './pose';
import type { PoseId } from './pose';
import type { Look } from '../types';

/** Pixels per sprite cell: texture, never size on screen. */
export const CELL = 256;
/** A hand-drawn creature's cycle: two is enough for legs to alternate on
 *  something with none, and after it comes the swing. A GENERATED body has
 *  named states instead — see `generatedFrame`. */
export const WALK_FRAMES = 2;
export const ATTACK_FRAME = WALK_FRAMES;
export const CREATURE_FRAMES = WALK_FRAMES + 1;

/** Rows of characters keyed to colours, `.` transparent: the shape is visible. */
type PixelArt = {
  rows: string[];
  key: Record<string, string>;
  grid: number;
  /** What a rank looks like now: light off the body, rather than a band round
   *  it. A solid border is a low-resolution convention and reads as a sticker
   *  once the art under it stops being chunky. */
  glow?: { colour: string; reach: number };
};

/** Every frame must be square and match the grid it declares: a short row
 *  truncates and a long one draws outside the cell, both silently. */
export function wellFormed(frames: string[][], grid: number): string[] {
  const bad: string[] = [];
  frames.forEach((rows, f) => {
    if (rows.length !== grid) bad.push(`frame ${f} has ${rows.length} rows`);
    rows.forEach((row, y) => {
      if (row.length !== grid) bad.push(`frame ${f} row ${y} is ${row.length} wide`);
    });
  });
  return bad;
}

/** Any CSS colour to bytes, through the canvas that already knows how. */
const INK_BYTES = new Map<string, [number, number, number, number]>();
function inkBytes(colour: string): [number, number, number, number] {
  const held = INK_BYTES.get(colour);
  if (held) return held;
  const probe = document.createElement('canvas');
  probe.width = 1;
  probe.height = 1;
  const ctx = probe.getContext('2d');
  let bytes: [number, number, number, number] = [255, 0, 255, 255];
  if (ctx) {
    ctx.fillStyle = colour;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    bytes = [r, g, b, a];
  }
  INK_BYTES.set(colour, bytes);
  return bytes;
}

/** Pixels rather than rects: 65,536 `fillRect` calls is a visible hitch. And
 *  sampling per DESTINATION pixel means the grid need not divide the cell. */
function drawPixels(ctx: CanvasRenderingContext2D, art: PixelArt, size = CELL): void {
  const image = ctx.createImageData(size, size);
  const data = image.data;
  const step = art.grid / size;
  for (let y = 0; y < size; y++) {
    const row = art.rows[Math.floor(y * step)] ?? '';
    for (let x = 0; x < size; x++) {
      const colour = art.key[row[Math.floor(x * step)]];
      if (!colour) continue;
      const [r, g, b, a] = inkBytes(colour);
      const at = (y * size + x) * 4;
      data[at] = r;
      data[at + 1] = g;
      data[at + 2] = b;
      data[at + 3] = a;
    }
  }
  if (art.glow) {
    const [r, g, b] = inkBytes(art.glow.colour);
    glowed(data, [r, g, b], art.glow.reach, size);
  }
  ctx.putImageData(image, 0, 0);
}

/** Light off the body: rings of the rank's ink, each fainter than the last, in
 *  the TEXTURE — so it costs no filter and cannot blur off the grid. */
export function glowed(
  data: Uint8ClampedArray,
  [r, g, b]: [number, number, number],
  reach: number,
  size: number
): void {
  const solid = (i: number): boolean => data[i * 4 + 3] > 0;
  let front: number[] = [];
  for (let i = 0; i < size * size; i++) if (solid(i)) front.push(i);

  for (let ring = 1; ring <= reach; ring++) {
    // Squared, so it falls away quickly and reads as light rather than as a
    // second outline in a lighter colour.
    const alpha = Math.round(190 * (1 - ring / (reach + 1)) ** 2);
    const next: number[] = [];
    for (const at of front) {
      const x = at % size;
      const y = (at - x) / size;
      for (const [nx, ny] of [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ]) {
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
        const to = ny * size + nx;
        if (solid(to)) continue;
        data[to * 4] = r;
        data[to * 4 + 1] = g;
        data[to * 4 + 2] = b;
        data[to * 4 + 3] = alpha;
        next.push(to);
      }
    }
    front = next;
  }
}

/** The hero: hooded, hunched over a walking staff, cloak gone to rags, a
 *  bedroll still strapped on. The eye under the hood is the only bright
 *  thing on him. */
export const HERO_FRAMES: string[][] = [
  // Planted on the staff, trailing leg back.
  [
    '........................',
    '........######..........',
    '.......#DDDDLL#.........',
    '......#DDDDCLLL#..##....',
    '......#DDDDLLLL#..WW....',
    '......#DD######...WW....',
    '......#DFFEEF#....WW....',
    '......#DFFFFF#....WW....',
    '......#DFFFFF#....WW....',
    '.....#PPDCCCC#....WW....',
    '....#PPPPCCCCC#...WW....',
    '....#PPPPCCCC#LLLLWW....',
    '....#PPPP#CCCC#...WW....',
    '....#PPP#CCCCC#...WW....',
    '....#PPP#CCCCC#...WW....',
    '.....###DCCCCC#...WW....',
    '......#DCCCCCC#...WW....',
    '......#DCCCCCC#...WW....',
    '......#DCCCCCC#...WW....',
    '......#DCC##CC#...WW....',
    '......#DCC##CC#...WW....',
    '......#CC#..#C#...WW....',
    '......#CC#..#C#...WW....',
    '......###...###...##....',
  ],
  // A pixel lower and the legs swapped. The staff does NOT move — it is
  // planted, and the figure sinks onto it. That is what turns a walk cycle
  // into a limp, which is the only thing two frames can say about him.
  [
    '........................',
    '........................',
    '........................',
    '........######....##....',
    '.......#DDDDLL#...WW....',
    '......#DDDDCLLL#..WW....',
    '......#DD######...WW....',
    '......#DFFEEF#....WW....',
    '......#DFFFFF#....WW....',
    '......#DFFFFF#....WW....',
    '.....#PPDCCCC#....WW....',
    '....#PPPPCCCC#LLLLWW....',
    '....#PPPPCCCCC#...WW....',
    '....#PPPP#CCCC#...WW....',
    '....#PPP#CCCCC#...WW....',
    '....#PPP#CCCCC#...WW....',
    '.....###DCCCCC#...WW....',
    '......#DCCCCCC#...WW....',
    '......#DCCCCCC#...WW....',
    '......#DCCCCCC#...WW....',
    '......#DC##CCC#...WW....',
    '......#DC##CCC#...WW....',
    '......#CC#.#CC#...WW....',
    '......###...###...##....',
  ],
];

/** White off a magic one and gold off a rare, the rare reaching further. */
export const GLOW: Record<MonsterRank, { colour: (p: Palette) => string; reach: number } | null> = {
  common: null,
  magic: { colour: (p) => p.chalk, reach: 14 },
  rare: { colour: (p) => p.citrine, reach: 26 },
};

/** A generated body: its own grid, key and frames, and the rank's light off the
 *  same table a hand-drawn one gets. `BEASTIARY` is asked FIRST, so an id in
 *  both tables is a generated body that never draws — silent, and it cost a
 *  session's judgement of generated art once. The demo fails a shared id. */
function generatedArt(palette: Palette, sprite: string, frame: number, rank: MonsterRank): PixelArt | null {
  const art = GENERATED[sprite];
  if (!art) return null;
  const glow = GLOW[rank];
  return {
    grid: art.grid,
    rows: art.frames[Math.min(frame, art.frames.length - 1)],
    key: art.key,
    // Reach is in DESTINATION pixels and the numbers are `CELL`'s, so a body
    // drawn at its own smaller grid needs it scaled or the light swallows it.
    glow: glow
      ? { colour: glow.colour(palette), reach: (glow.reach * art.grid) / CELL }
      : undefined,
  };
}

/** How many frames a sprite HAS. Drawing a fixed three left everything past
 *  the second falling back to the first — a body that lunged and never moved. */
export const framesOf = (sprite: string): number =>
  GENERATED[sprite]?.frames.length ?? CREATURE_FRAMES;

/** Which FACING is showing. The art is only the east half of the compass —
 *  anything facing left is a twin flipped — and `dirs` runs north to south,
 *  so the bucket is the angle folded into that half and divided by it. */
export function facingRow(sprite: string, facing: number): number {
  const rows = GENERATED[sprite]?.dirs.length ?? 1;
  if (rows < 2) return 0;
  const east = Math.cos(facing) < 0 ? Math.PI - facing : facing;
  const turn = Math.atan2(Math.sin(east), Math.cos(east));
  const at = Math.round(((turn + Math.PI / 2) / Math.PI) * (rows - 1));
  return Math.min(rows - 1, Math.max(0, at));
}

/**
 * Which frame of a generated body is showing. A state is a RUN of frames in
 * the flat list `frames` is, so a body can have a melee swing AND a cast per
 * skill and a further one is a manifest row. `through` is how far into its own
 * action it is, never elapsed time: off the clock a fast swing and a slow one
 * are one. `skill` is what it is using and names its own state FIRST, so fire,
 * frost and lightning are three animations rather than one cast; `cast` is the
 * fallback for a spell with no animation of its own, and only for a spell — a
 * hero holding one would otherwise play it while swinging a sword.
 *
 * The list is direction-MAJOR and the runs are the first facing's, so a facing
 * is one stride along it and everything that draws a body stays flat.
 */
export interface Cel {
  action: string;
  through: number; // how far into its own swing, 0 to 1
  elapsed: number;
  walked: number; // tiles covered; the WALK reads this, never the clock
  skill: string | null;
  facing: number;
  spell: boolean;
  /** A corpse, and how far through `DEATH_FADE`: `EntityAction` has no death. */
  dead?: boolean;
  dying?: number;
}

/** Played once and HELD on the last frame: a swing, a flinch and a fall all
 *  end where they end rather than looping back round. */
const once = (run: number[], at: number): number =>
  run[Math.min(run.length - 1, Math.max(0, Math.floor(at * run.length)))] ?? 0;

export function generatedFrame(sprite: string, e: Cel): number {
  const art = GENERATED[sprite];
  if (!art) return e.action === 'attack' ? ATTACK_FRAME : 0;
  const states = art.states;
  const stride = art.frames.length / art.dirs.length;
  const row = facingRow(sprite, e.facing) * stride;

  // Falling over outranks whatever it was doing when it was killed.
  if (e.dead && states.death) return row + once(states.death, e.dying ?? 1);
  if (e.action === 'hurt' && states.hurt) return row + once(states.hurt, e.through);

  if (e.action === 'attack') {
    const own = (e.skill ? states[e.skill] : null) ?? (e.spell ? states.cast : null);
    const run = own ?? states.attack ?? states.walk ?? [0];
    return row + once(run, e.through);
  }
  const walk = states.walk ?? [0];
  if (e.action === 'move') return row + walk[Math.floor(e.walked / STRIDE) % walk.length];
  const idle = states.idle;
  if (idle) return row + idle[Math.floor(e.elapsed * IDLE_CYCLE) % idle.length];
  return row + walk[0];
}

/** Whether the body has an animation of its OWN for what it is doing. The
 *  lunge and the bob are TRANSFORMS standing in for frames nobody had drawn;
 *  over frames that exist they are a second motion fighting the first, which
 *  is the shove-the-model-forward look. */
export function animates(
  sprite: string,
  e: Pick<Cel, 'action' | 'skill' | 'spell'> & { dead?: boolean }
): boolean {
  const states = GENERATED[sprite]?.states;
  if (!states) return false;
  if (e.dead) return !!states.death;
  if (e.action === 'move') return !!states.walk;
  if (e.action === 'hurt') return !!states.hurt;
  if (e.action !== 'attack') return false;
  return !!((e.skill ? states[e.skill] : null) ?? (e.spell ? states.cast : null) ?? states.attack);
}

/** An animation of its own for what it THROWS: the pip is then a label doing
 *  a silhouette's job. */
export const castsVisibly = (sprite: string, skill: string | null): boolean => {
  const states = GENERATED[sprite]?.states;
  return !!states && !!((skill ? states[skill] : null) ?? states.cast);
};

/** Tiles per frame of a walk. A stride is a DISTANCE, and reading it off the
 *  clock instead is what makes a body skate over the ground. */
export const STRIDE = 0.42;
/** A hand-drawn creature has no stride, so its two frames run off the clock. */
export const WALK_CYCLE = 7;
/** And how fast a body standing still breathes, which is far slower: an idle
 *  at the walk's rate reads as jogging on the spot. */
export const IDLE_CYCLE = 2.5;

/** Its own inks, plus the rank: the accent brightens and the light comes off. */
export function monsterArt(
  palette: Palette,
  sprite: string,
  frame: number,
  rank: MonsterRank
): PixelArt | null {
  const art = BEASTIARY[sprite];
  if (!art) return generatedArt(palette, sprite, frame, rank);
  const accent: Record<MonsterRank, string> = {
    common: mix(art.tone.shade(palette), art.tone.mass(palette), 0.5),
    magic: art.tone.eye(palette),
    rare: mix(art.tone.eye(palette), palette.chalk, 0.45),
  };
  // Past the walk cycle is the swing, and a creature without one stands still
  // to hit you — which is what every creature did before there was a frame.
  const drawn =
    frame >= ATTACK_FRAME ? (art.attack ?? art.frames[0]) : (art.frames[frame] ?? art.frames[0]);
  return {
    grid: art.grid,
    rows: drawn,
    glow: GLOW[rank] ? { colour: GLOW[rank]!.colour(palette), reach: GLOW[rank]!.reach } : undefined,
    key: {
      '#': mix(palette.rockDeep, palette.void, 0.6),
      M: art.tone.lit(palette),
      m: art.tone.mass(palette),
      s: art.tone.shade(palette),
      e: art.tone.eye(palette),
      x: accent[rank],
      // A generated creature brings its OWN colours: the five below are the
      // hand-drawn table's palette, not a limit of anything that draws.
      ...(art.key ?? {}),
    },
  };
}

function heroArt(palette: Palette, frame: number): PixelArt {
  const key: Record<string, string> = {
    // Ink, not background. rockDeep is what the map is drawn ON; using it as
    // an outline left every figure a shade away from the floor it stood on.
    '#': mix(palette.rockDeep, palette.void, 0.6),
    // Cloth in three tones off one hue, grimy rather than coloured: the eye
    // should be the brightest thing on him. Pulled toward rockDeep rather than
    // void, so he reads as filthy against the stone rather than as blue.
    D: mix(palette.dust, palette.rockDeep, 0.72),
    C: mix(palette.dust, palette.rockDeep, 0.5),
    L: mix(palette.dust, palette.chalk, 0.1),
    // Under the hood. Not empty — darker than the outline, so the face reads
    // as a hollow rather than a hole punched in the sprite.
    F: mix(palette.rockDeep, palette.matrix, 0.3),
    E: palette.citrine,
    // Warm dark wood. One pixel wide: at three it read as a ladder, because
    // an outline down both sides of a 16-grid sprite is most of the staff.
    W: mix(palette.ember, palette.rockDeep, 0.6),
    // The bedroll still strapped to his back. He set out meaning to return.
    P: mix(palette.seam, palette.rockDeep, 0.2),
  };

  return { rows: HERO_FRAMES[frame] ?? HERO_FRAMES[0], key, grid: DOLL_GRID };
}

/** One table, so a gauntlet and the hand inside it are lit by the same light. */
export function lookKeyColours(palette: Palette): Record<string, string> {
  const ink = mix(palette.rockDeep, palette.void, 0.6);
  const out: Record<string, string> = {
    '#': ink,
    s: mix(palette.dust, palette.ember, 0.35),
    e: palette.citrine,
    h: mix(palette.rockDeep, palette.ember, 0.2),
    t: mix(palette.dust, palette.rockDeep, 0.5),
    T: mix(palette.dust, palette.rockDeep, 0.72),
    l: mix(palette.seam, palette.rockDeep, 0.25),
    L: mix(palette.seam, palette.rockDeep, 0.5),
    b: mix(palette.ember, palette.rockDeep, 0.55),
    w: mix(palette.ember, palette.rockDeep, 0.55),
    m: mix(palette.chalk, palette.rockDeep, 0.45),
    M: palette.chalk,
    g: palette.amethyst,
    f: mix(palette.ember, palette.flame, 0.5),
  };

  // One entry per family and ink. Two sets never share a colour, which is the
  // whole reason a family's art is rewritten into its own characters.
  for (const [family, art] of Object.entries(FAMILY_ART)) {
    const t = art.tone;
    out[roleChar(family, 'p')] = t.mass(palette);
    out[roleChar(family, 'P')] = t.lit(palette);
    out[roleChar(family, 'd')] = t.dark(palette);
    out[roleChar(family, 'x')] = t.trim(palette);
    out[roleChar(family, 'X')] = t.trimLit(palette);
  }
  return out;
}

/** One pose of one loadout, painted. */
export function drawLook(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  look: Look,
  pose: PoseId
): void {
  drawPixels(ctx, { rows: lookRows(look, pose), key: lookKeyColours(palette), grid: DOLL_GRID });
}

export function makeLookFrames(palette: Palette, look: Look): HTMLCanvasElement[] | null {
  const frames: HTMLCanvasElement[] = [];
  for (const pose of POSE_IDS) {
    const made = cell();
    if (!made) return null;
    drawLook(made.ctx, palette, look, pose);
    frames.push(made.canvas);
  }
  return frames;
}

export const RANKS: MonsterRank[] = ['common', 'magic', 'rare'];

/** How a creature and its rank name one set of frames. */
export const rankedKey = (sprite: string, rank: MonsterRank): string => `${sprite}:${rank}`;

/** Frames for one creature at one rank, or null when nothing draws that sprite. */
export type SpriteSheet = { frames(sprite: string, rank: MonsterRank): HTMLCanvasElement[] | null };

export const SPRITE_KINDS = ['hero', ...Object.keys(BEASTIARY), ...Object.keys(GENERATED)] as const;

const DRAWABLE = new Set<string>(SPRITE_KINDS);

function cell(size = CELL): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  return ctx ? { canvas, ctx } : null;
}

/** One generated prop, painted at its own grid: a prop is a picture standing
 *  on a tile, so nothing about it belongs in `CELL`. */
export function makeProp(id: string): HTMLCanvasElement | null {
  const art = PROP_ART[id];
  if (!art) return null;
  const made = cell(art.grid);
  if (!made) return null;
  drawPixels(made.ctx, { rows: art.rows, key: art.key, grid: art.grid }, art.grid);
  return made.canvas;
}


function shade(ctx: CanvasRenderingContext2D, colour: string, dark: string): void {
  ctx.fillStyle = colour;
  ctx.strokeStyle = dark;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
}

/** Drawn facing RIGHT (+x). The renderer FLIPS rather than rotates. */
function drawCreature(
  ctx: CanvasRenderingContext2D,
  sprite: string,
  frame: number,
  palette: Palette,
  rank: MonsterRank,
  size = CELL
): void {
  const art = sprite === 'hero' ? heroArt(palette, frame) : monsterArt(palette, sprite, frame, rank);
  if (art) drawPixels(ctx, art, size);
}

/**
 * Null when there is no canvas at all, which callers read as "another renderer".
 *
 * Frames are drawn on FIRST USE and memoised. A descent reaches about 8 of the
 * creatures in the table, so drawing all of them at boot paid for the whole
 * bestiary at every rank to open one map.
 */
export function makeSheet(palette: Palette): SpriteSheet | null {
  if (!cell()) return null;

  // One set of frames per creature AND rank: a halo is pixels, so it belongs
  // in the texture rather than in a filter that would blur off the grid.
  const drawn = new Map<string, HTMLCanvasElement[]>();

  return {
    frames(sprite, rank) {
      if (!DRAWABLE.has(sprite)) return null;
      const key = rankedKey(sprite, rank);
      const already = drawn.get(key);
      if (already) return already;

      // A generated body is drawn at its OWN grid rather than at `CELL`: a
      // cell is already bigger than the tile it lands in, and one facing of a
      // body with five states is a hundred canvases at four bytes a pixel.
      const size = GENERATED[sprite]?.grid ?? CELL;
      const frames: HTMLCanvasElement[] = [];
      for (let frame = 0; frame < framesOf(sprite); frame++) {
        const made = cell(size);
        if (!made) return null;
        drawCreature(made.ctx, sprite, frame, palette, rank, size);
        frames.push(made.canvas);
      }
      drawn.set(key, frames);
      return frames;
    },
  };
}
