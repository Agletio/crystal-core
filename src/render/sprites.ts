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
import { BEASTIARY, HALO, haloed } from './bestiary';
import type { MonsterRank } from './bestiary';
import { POSE_IDS } from './pose';
import type { PoseId } from './pose';
import type { Look } from '../types';

/**
 * Pixels per sprite cell. Generous so the shapes stay crisp when scaled up, and
 * divisible by every grid art is authored on: 48/16 is 3, 48/24 is 2.
 */
export const CELL = 48;
/** A CREATURE's cycle, and its own: the doll walks on `WALK_POSES`, which is
 *  longer. Two is enough for legs to alternate on something with none. */
export const WALK_FRAMES = 2;
/** After the walk cycle: the swing. */
export const ATTACK_FRAME = WALK_FRAMES;
export const CREATURE_FRAMES = WALK_FRAMES + 1;

/** Rows of characters keyed to colours, `.` transparent: the shape is visible. */
type PixelArt = { rows: string[]; key: Record<string, string>; grid: number };

/**
 * Every frame must be square and match the grid it declares. A short row
 * silently truncates and a long one silently draws outside the cell — both
 * read as "the art is a bit off" rather than as the typo they are.
 */
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

function drawPixels(ctx: CanvasRenderingContext2D, art: PixelArt): void {
  const px = CELL / art.grid;
  art.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const colour = art.key[row[x]];
      if (!colour) continue;
      // +1 on the size closes the hairline seams that appear between
      // neighbouring rects when the canvas is later scaled by a fraction.
      ctx.fillStyle = colour;
      ctx.fillRect(x * px, y * px, px + 0.5, px + 0.5);
    }
  });
}

/**
 * The hero: a traveller who has been down here far too long. Hooded and hunched
 * over a walking staff, cloak gone to rags at the hem, a bedroll still strapped
 * on because he set out meaning to come home. The only bright thing on him is
 * the eye under the hood.
 */
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

/** Its own inks, plus the rank: the accent brightens and a halo goes round. */
export function monsterArt(
  palette: Palette,
  sprite: string,
  frame: number,
  rank: MonsterRank
): PixelArt | null {
  const art = BEASTIARY[sprite];
  if (!art) return null;
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
    rows: haloed(drawn, HALO[rank]),
    key: {
      '#': mix(palette.rockDeep, palette.void, 0.6),
      M: art.tone.lit(palette),
      m: art.tone.mass(palette),
      s: art.tone.shade(palette),
      e: art.tone.eye(palette),
      x: accent[rank],
      // Blue for magic, gold for rare, as every loot game has said it.
      b: mix(palette.quartz, palette.chalk, 0.3),
      o: palette.citrine,
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

export const SPRITE_KINDS = ['hero', ...Object.keys(BEASTIARY)] as const;

const DRAWABLE = new Set<string>(SPRITE_KINDS);

function cell(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const canvas = document.createElement('canvas');
  canvas.width = CELL;
  canvas.height = CELL;
  const ctx = canvas.getContext('2d');
  return ctx ? { canvas, ctx } : null;
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
  rank: MonsterRank
): void {
  const art = sprite === 'hero' ? heroArt(palette, frame) : monsterArt(palette, sprite, frame, rank);
  if (art) drawPixels(ctx, art);
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

      const frames: HTMLCanvasElement[] = [];
      for (let frame = 0; frame < CREATURE_FRAMES; frame++) {
        const made = cell();
        if (!made) return null;
        drawCreature(made.ctx, sprite, frame, palette, rank);
        frames.push(made.canvas);
      }
      drawn.set(key, frames);
      return frames;
    },
  };
}
