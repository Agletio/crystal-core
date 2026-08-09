/**
 * Procedural placeholder sprite sheets, drawn at runtime onto offscreen canvases
 * so the repo carries no binary assets and a colour change redraws nothing.
 *
 * Two walk frames each — enough for legs to alternate, which is the difference
 * between walking and sliding. Bob, lunge, recoil and death are transforms,
 * because transforms are free and frames are not. Real art replaces makeSheet()
 * with a loader behind the same {sprite, frame} lookup.
 */
import type { Palette } from './renderer';
import { mix, spriteColour } from './renderer';
import { lookRows } from './look';
import { POSE_IDS } from './pose';
import type { PoseId } from './pose';
import type { Look } from '../types';

/** Pixels per sprite cell. Generous so the shapes stay crisp when scaled up. */
export const CELL = 48;
export const WALK_FRAMES = 2;

/**
 * Side of the pixel grid. CELL divides by it exactly, so every logical pixel
 * lands on whole canvas pixels and nothing is ever half-lit.
 */
const GRID = 16;
const PX = CELL / GRID;

/**
 * A sprite authored as text: rows of characters, one per logical pixel, keyed to
 * colours. `.` is transparent. Verbose, and worth it — you can see the
 * silhouette in the source, and changing a shoulder is moving a character.
 */
type PixelArt = { rows: string[]; key: Record<string, string> };

/**
 * Every row of every frame must be exactly GRID characters. A short row silently
 * truncates and a long one silently draws outside the cell — both read as "the
 * art is a bit off" rather than as the typo they are.
 */
export function wellFormed(frames: string[][]): string[] {
  const bad: string[] = [];
  frames.forEach((rows, f) => {
    if (rows.length !== GRID) bad.push(`frame ${f} has ${rows.length} rows`);
    rows.forEach((row, y) => {
      if (row.length !== GRID) bad.push(`frame ${f} row ${y} is ${row.length} wide`);
    });
  });
  return bad;
}

function drawPixels(ctx: CanvasRenderingContext2D, art: PixelArt): void {
  art.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const colour = art.key[row[x]];
      if (!colour) continue;
      // +1 on the size closes the hairline seams that appear between
      // neighbouring rects when the canvas is later scaled by a fraction.
      ctx.fillStyle = colour;
      ctx.fillRect(x * PX, y * PX, PX + 0.5, PX + 0.5);
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
    '................',
    '.....####.......',
    '....#DDDL#..#...',
    '...#DDDLLL#.W...',
    '...#DD####..W...',
    '...#DFEF#...W...',
    '...#DFFF#...W...',
    '..#PPDCCC#..W...',
    '.#PPPPCCCCLLW...',
    '.#PPPP#CCC#.W...',
    '.#PPP#CCCC#.W...',
    '..###DCCCC#.W...',
    '...#DCCCCC#.W...',
    '...#DCC#CC#.W...',
    '...#CC#.#C#.W...',
    '...###..###.#...',
  ],
  // A pixel lower and the legs swapped. The staff does NOT move — it is
  // planted, and the figure sinks onto it. That is what turns a walk cycle
  // into a limp, which is the only thing two frames can say about him.
  [
    '................',
    '................',
    '.....####...#...',
    '....#DDDL#..W...',
    '...#DDDLLL#.W...',
    '...#DD####..W...',
    '...#DFEF#...W...',
    '...#DFFF#...W...',
    '..#PPDCCC#LLW...',
    '.#PPPPCCCC#.W...',
    '.#PPPP#CCC#.W...',
    '.#PPP#CCCC#.W...',
    '..###DCCCC#.W...',
    '...#DCCCCC#.W...',
    '...#DC#CCC#.W...',
    '...##.#CC#..#...',
  ],
];

/**
 * The monsters, on the same grid. Two frames each, differing only in the legs.
 * SHAPE carries the identity — low and wide, thin and hunched, a wedge, a slab —
 * so each reads at three pixels a tile without relying on its colour.
 */
export const MONSTER_FRAMES: Record<string, string[][]> = {
  // Low, wide, segmented. Almost no vertical presence: it is the thing you
  // walk over. Segment ridges down the back and a pair of mandibles are what
  // stop it reading as a bean.
  grub: [
    [
      '................',
      '................',
      '................',
      '.....######.....',
      '...##ssssss##...',
      '..#mMsMMsMMsm#..',
      '.#mMMsMMsMMsMe#.',
      '.#MMMsMMsMMsMMe#',
      '.#mMMsMMsMMsMe#.',
      '..#mMsMMsMMsm#..',
      '...##m##m##m#...',
      '....#..#..#.....',
      '................',
      '................',
      '................',
      '................',
    ],
    [
      '................',
      '................',
      '................',
      '.....######.....',
      '...##ssssss##...',
      '..#mMsMMsMMsm#..',
      '.#mMMsMMsMMsMe#.',
      '.#MMMsMMsMMsMMe#',
      '.#mMMsMMsMMsMe#.',
      '..#mMsMMsMMsm#..',
      '...#m##m##m##...',
      '.....#..#..#....',
      '................',
      '................',
      '................',
      '................',
    ],
  ],

  // Thin and hunched, leaning the way it walks. A person, badly: two sunken
  // eyes, a rib showing through, and arms too long for it.
  husk: [
    [
      '................',
      '................',
      '......####......',
      '.....#mMMM#.....',
      '.....#eMeM#.....',
      '.....#mMMM#.....',
      '......#MM#......',
      '....##mMMm##....',
      '...#MsMMMMsM#...',
      '...#M#MsMM#M#...',
      '...#M#MMsM#M#...',
      '....##MMMM##....',
      '.....#M##M#.....',
      '.....#M##M#.....',
      '.....#M##M#.....',
      '.....##..##.....',
    ],
    [
      '................',
      '................',
      '......####......',
      '.....#mMMM#.....',
      '.....#eMeM#.....',
      '.....#mMMM#.....',
      '......#MM#......',
      '....##mMMm##....',
      '...#MsMMMMsM#...',
      '...#M#MsMM#M#...',
      '...#M#MMsM#M#...',
      '....##MMMM##....',
      '.....#MM#M#.....',
      '....#M#..#M#....',
      '....#M#..#M#....',
      '....##....##....',
    ],
  ],

  // A wedge on long legs. Nothing on it is vertical; it only ever looks like
  // it is already moving. A spine ridge and jointed legs, so the speed reads
  // as anatomy rather than as a triangle.
  stalker: [
    [
      '................',
      '................',
      '.......##.......',
      '.....##sMs##....',
      '..###mMsMsMm##..',
      '.#mMMMMsMsMMMe#.',
      '#mMMMMMMsMMMMMe#',
      '.#mMMMMsMsMMMe#.',
      '..###mMsMsMm##..',
      '.....##sMs##....',
      '......#M#M#.....',
      '.....#M#.#M#....',
      '.....#s#.#s#....',
      '....#M#...#M#...',
      '....#s#...#s#...',
      '....##.....##...',
    ],
    [
      '................',
      '................',
      '.......##.......',
      '.....##sMs##....',
      '..###mMsMsMm##..',
      '.#mMMMMsMsMMMe#.',
      '#mMMMMMMsMMMMMe#',
      '.#mMMMMsMsMMMe#.',
      '..###mMsMsMm##..',
      '.....##sMs##....',
      '......#M#M#.....',
      '......#M#M#.....',
      '.....#s#.#s#....',
      '.....#M#.#M#....',
      '....#s#...#s#...',
      '...##.......##..',
    ],
  ],

  // A slab with shoulders. Plated, strapped, and carrying one arm heavier than
  // the other — the width across the chest is the only thing that has to read
  // at three pixels, everything else is for when you are stood next to it.
  brute: [
    [
      '................',
      '..##########....',
      '.#mmMMMMMMMm#...',
      '.#msMMMMMMsMe#..',
      '.#mMsMMMMsMMM#..',
      '.#MMMsMMsMMMMe#.',
      '.#mMMMssMMMMM#..',
      '.#msMMMMMMsM#...',
      '.#mMsMMMMsMm#...',
      '.#mMMsMMsMMm#...',
      '..##MM##MM##....',
      '..#MMM##MMM#....',
      '..#sMM##MMs#....',
      '..#MMM##MMM#....',
      '..####..####....',
      '................',
    ],
    [
      '................',
      '..##########....',
      '.#mmMMMMMMMm#...',
      '.#msMMMMMMsMe#..',
      '.#mMsMMMMsMMM#..',
      '.#MMMsMMsMMMMe#.',
      '.#mMMMssMMMMM#..',
      '.#msMMMMMMsM#...',
      '.#mMsMMMMsMm#...',
      '.#mMMsMMsMMm#...',
      '..##MM##MM##....',
      '..#MMM##MMM#....',
      '..#sMM##MMs#....',
      '.#MMM####MMM#...',
      '.###......###...',
      '................',
    ],
  ],
};

/** One hue, three tones, one lit eye. Built from spriteColour, the one palette. */
function monsterArt(palette: Palette, sprite: string, frame: number): PixelArt | null {
  const frames = MONSTER_FRAMES[sprite];
  if (!frames) return null;
  const base = spriteColour(palette, sprite);
  return {
    rows: frames[frame] ?? frames[0],
    key: {
      '#': mix(palette.rockDeep, palette.void, 0.6),
      // Pulled toward the rock so a monster sits in the rock rather than on
      // top of it. The old flat fills were brighter than the floor.
      M: mix(base, palette.rockDeep, 0.14),
      m: mix(base, palette.rockDeep, 0.42),
      // Interior shading: segment ridges, plate seams, joints. Between M and
      // m, so it reads as form rather than as an outline drawn inside the
      // outline — a second black line would just make the shape muddy.
      s: mix(base, palette.rockDeep, 0.6),
      e: mix(base, palette.chalk, 0.55),
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

  return { rows: HERO_FRAMES[frame] ?? HERO_FRAMES[0], key };
}

/**
 * The hero's palette, shared by the base figure and everything worn. One key
 * table, so a gauntlet and the hand inside it are lit by the same light.
 */
export function lookKeyColours(palette: Palette): Record<string, string> {
  const ink = mix(palette.rockDeep, palette.void, 0.6);
  return {
    '#': ink,
    s: mix(palette.dust, palette.ember, 0.35),
    e: palette.citrine,
    h: mix(palette.rockDeep, palette.ember, 0.2),
    t: mix(palette.dust, palette.rockDeep, 0.5),
    T: mix(palette.dust, palette.rockDeep, 0.72),
    l: mix(palette.seam, palette.rockDeep, 0.25),
    L: mix(palette.seam, palette.rockDeep, 0.5),
    b: mix(palette.ember, palette.rockDeep, 0.55),
    // Plate reads as cold metal; the lit face is what gives it a shoulder.
    p: mix(palette.quartz, palette.rockDeep, 0.35),
    P: mix(palette.quartz, palette.chalk, 0.35),
    d: mix(palette.quartz, palette.rockDeep, 0.6),
    c: mix(palette.amethyst, palette.rockDeep, 0.45),
    C: mix(palette.amethyst, palette.chalk, 0.25),
    h2: mix(palette.ember, palette.rockDeep, 0.4),
    w: mix(palette.ember, palette.rockDeep, 0.55),
    m: mix(palette.chalk, palette.rockDeep, 0.45),
    M: palette.chalk,
    g: palette.amethyst,
    // The rung, made visible: absent at tier 1, dull at 2, lit at 3.
    x: mix(palette.citrine, palette.rockDeep, 0.45),
    X: palette.citrine,
  };
}

/** One pose of one loadout, painted. */
export function drawLook(
  ctx: CanvasRenderingContext2D,
  palette: Palette,
  look: Look,
  pose: PoseId
): void {
  drawPixels(ctx, { rows: lookRows(look, pose), key: lookKeyColours(palette) });
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

export type SpriteSheet = Record<string, HTMLCanvasElement[]>;

export const SPRITE_KINDS = ['hero', 'grub', 'husk', 'stalker', 'brute'] as const;

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
  palette: Palette
): void {
  const art = sprite === 'hero' ? heroArt(palette, frame) : monsterArt(palette, sprite, frame);
  if (art) drawPixels(ctx, art);
}

/**
 * Builds every sprite for every frame. Returns null when there's no canvas at
 * all (headless), which callers treat as "use a different renderer".
 */
export function makeSheet(palette: Palette): SpriteSheet | null {
  const sheet: SpriteSheet = {};

  for (const sprite of SPRITE_KINDS) {
    const frames: HTMLCanvasElement[] = [];
    for (let frame = 0; frame < WALK_FRAMES; frame++) {
      const made = cell();
      if (!made) return null;
      drawCreature(made.ctx, sprite, frame, palette);
      frames.push(made.canvas);
    }
    sheet[sprite] = frames;
  }
  return sheet;
}
