/**
 * Sprite sheets drawn at runtime onto offscreen canvases, so the repo carries
 * no binary assets and a palette change redraws everything. Death and recoil
 * are transforms, because transforms are free and frames are not.
 */
import type { Palette } from './renderer';
import { mix } from './renderer';
import { BEASTIARY } from './bestiary';
import { GENERATED } from './generated-art';
import { PROP_ART } from './generated-props';
import { VFX_ART } from './generated-vfx';
import { GENERATED_ICONS } from './generated-icons';
import { HELD } from './held';
import type { MonsterRank } from './bestiary';

/** Pixels per sprite cell: texture, never size on screen. */
export const CELL = 256;
/** A hand-drawn creature's cycle; after it comes the swing. A GENERATED body
 *  has named states instead — see `generatedFrame`. */
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

/** Pixels rather than rects: 65,536 `fillRect` calls is a visible hitch, and
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

/** Light off the body: rings of the rank's ink in the TEXTURE, so it costs no
 *  filter and cannot blur off the grid. */
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


/** White off a magic one and gold off a rare, the rare reaching further. */
export const GLOW: Record<MonsterRank, { colour: (p: Palette) => string; reach: number } | null> = {
  common: null,
  magic: { colour: (p) => p.chalk, reach: 14 },
  rare: { colour: (p) => p.citrine, reach: 26 },
  risen: { colour: (p) => p.rust, reach: 38 },
};

/** A generated body: its own grid, key and frames. `BEASTIARY` is asked FIRST,
 *  so an id in both tables is a generated body that never draws — silent, and
 *  the demo fails a shared id for it. */
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
 * Which frame of a generated body is showing. `through` is how far into its own
 * action it is, never elapsed time: off the clock a fast swing and a slow one
 * are one. `skill` names its own state FIRST, so fire, frost and lightning are
 * three animations rather than one cast; `cast` is the fallback, and only for a
 * spell — a hero holding one would play it while swinging a sword otherwise.
 * The list is direction-MAJOR, so a facing is one stride along it.
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

/** Which STATE a body is playing and how far into it — the index within that
 *  state's own run, not into `frames`. What is pinned to a hand reads this, so
 *  a weapon and the arm holding it cannot pick different beats. */
export interface Beat {
  state: string;
  at: number;
}

/** Played once and HELD on the last frame: a swing, a flinch and a fall all
 *  end where they end rather than looping back round. */
const holdAt = (run: number[], through: number): number =>
  Math.min(run.length - 1, Math.max(0, Math.floor(through * run.length)));

export function generatedBeat(sprite: string, e: Cel): Beat {
  const states = GENERATED[sprite]?.states;
  if (!states) return { state: 'idle', at: 0 };

  if (e.dead && states.death) return { state: 'death', at: holdAt(states.death, e.dying ?? 1) };
  if (e.action === 'hurt' && states.hurt) return { state: 'hurt', at: holdAt(states.hurt, e.through) };

  if (e.action === 'attack') {
    const named = e.skill && states[e.skill] ? e.skill : e.spell && states.cast ? 'cast' : null;
    const state = named ?? (states.attack ? 'attack' : states.walk ? 'walk' : 'idle');
    return { state, at: holdAt(states[state] ?? [0], e.through) };
  }
  const walk = states.walk ?? [0];
  if (e.action === 'move') {
    return {
      state: 'walk',
      at: Math.floor(e.walked / strideOf(sprite, walk.length)) % walk.length,
    };
  }
  const idle = states.idle;
  if (idle) return { state: 'idle', at: Math.floor(e.elapsed * IDLE_CYCLE) % idle.length };
  return { state: 'walk', at: 0 };
}

export function generatedFrame(sprite: string, e: Cel): number {
  const art = GENERATED[sprite];
  if (!art) return e.action === 'attack' ? ATTACK_FRAME : 0;
  const stride = art.frames.length / art.dirs.length;
  const row = facingRow(sprite, e.facing) * stride;
  const beat = generatedBeat(sprite, e);
  const run = art.states[beat.state] ?? art.states.walk ?? [0];
  return row + (run[beat.at] ?? run[0] ?? 0);
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

/** Tiles one whole GAIT CYCLE covers. Read off the clock a body skates; read
 *  per FRAME the frame COUNT decides the gait, which is the same fault in
 *  another currency — six frames at a per-frame stride carry a body half again
 *  as far per footfall as four. `GeneratedArt.stride` overrides it per body. */
export const STRIDE_CYCLE = 1.68;

/** How far down its own grid a body's ink STARTS and ENDS, as fractions. A
 *  sprite spans `scale` tiles and the drawing does not fill it — every frame is
 *  sized to the widest — so anything hung ABOVE a body wants the top and
 *  standing one ON its tile wants the foot. Measured over EVERY frame: per
 *  frame the band moves with the walk and whatever reads it bounces. */
const bands = new Map<string, { top: number; foot: number }>();
function inkBand(sprite: string): { top: number; foot: number } {
  const held = bands.get(sprite);
  if (held) return held;
  const art = GENERATED[sprite] ?? BEASTIARY[sprite];
  let top = Infinity;
  let foot = -Infinity;
  for (const frame of art?.frames ?? []) {
    for (let y = 0; y < frame.length && y < top; y++)
      if (/[^.]/.test(frame[y])) {
        top = y;
        break;
      }
    for (let y = frame.length - 1; y >= 0 && y + 1 > foot; y--)
      if (/[^.]/.test(frame[y])) {
        foot = y + 1;
        break;
      }
  }
  const band =
    art && Number.isFinite(top) ? { top: top / art.grid, foot: foot / art.grid } : { top: 0, foot: 1 };
  bands.set(sprite, band);
  return band;
}
export const bodyTop = (sprite: string): number => inkBand(sprite).top;
export const bodyFoot = (sprite: string): number => inkBand(sprite).foot;

/** How far off the ground a body hangs, in tiles, and how far it rises and
 *  falls doing it. A thing with no feet is not pinned by them, and standing it
 *  on the floor is what makes it read as an ornament rather than as alive. */
export const hoverOf = (sprite: string): number => GENERATED[sprite]?.hover ?? 0;
export const HOVER_RISE = 0.08;
export const HOVER_CYCLE = 1.6;

export const strideOf = (sprite: string, frames: number): number =>
  (GENERATED[sprite]?.stride ?? STRIDE_CYCLE) / Math.max(1, frames);
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
    risen: mix(art.tone.eye(palette), palette.rust, 0.6),
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

/** What a hand is holding, painted at the icon's own grid. The item's own
 *  picture, so a weapon in a fist costs no generation at all. */
export function makeHeld(art: string): HTMLCanvasElement | null {
  const spec = HELD[art];
  const icon = spec ? GENERATED_ICONS[spec.icon] : undefined;
  if (!icon) return null;
  const made = cell(icon.grid);
  if (!made) return null;
  drawPixels(made.ctx, { rows: icon.rows, key: icon.key, grid: icon.grid }, icon.grid);
  return made.canvas;
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

/** One generated effect, at its own grid. Cropped to its own ink at import, so
 *  the canvas's edges are the effect's edges and the renderer pins it by them. */
export function makeVfx(id: string): HTMLCanvasElement | null {
  const art = VFX_ART[id];
  if (!art) return null;
  const made = cell(art.grid);
  if (!made) return null;
  drawPixels(made.ctx, { rows: art.rows, key: art.key, grid: art.grid }, art.grid);
  return made.canvas;
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
  const art = monsterArt(palette, sprite, frame, rank);
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
