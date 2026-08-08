/**
 * Procedural placeholder sprite sheets.
 *
 * Real art is a folder of PNGs. Until that exists these are drawn at runtime
 * onto offscreen canvases, which keeps the repo free of binary assets and
 * means nothing has to be redrawn when a colour changes.
 *
 * Each creature gets two walk frames — enough for legs to alternate, which is
 * what makes a shape read as "walking" rather than "sliding". Everything else
 * (bob, lunge, recoil, death) is done with transforms by the renderer, since
 * transforms are free and frames are not.
 *
 * To swap in real art: replace makeSheet() with a loader and keep the same
 * {sprite, frame} → texture-source lookup. Nothing else changes.
 */
import type { Palette } from './renderer';
import { mix, spriteColour } from './renderer';

/** Pixels per sprite cell. Generous so the shapes stay crisp when scaled up. */
export const CELL = 48;
export const WALK_FRAMES = 2;

/**
 * Side of the pixel grid a hand-authored sprite is drawn on.
 *
 * CELL divides by this exactly, so every logical pixel lands on a whole number
 * of canvas pixels and nothing is ever half-lit. That is the entire difference
 * between pixel art and a small smooth drawing.
 */
const GRID = 16;
const PX = CELL / GRID;

/**
 * A sprite authored as text.
 *
 * Rows of characters, one per logical pixel, with a key mapping each character
 * to a colour. Verbose next to three ctx.ellipse calls and worth every line:
 * you can see the silhouette in the source, and changing a shoulder is moving
 * a character rather than guessing at a control point. It is also the format
 * real art would arrive in, so replacing this with a PNG loader later changes
 * nothing about how the renderer asks for a frame.
 *
 * `.` is transparent.
 */
type PixelArt = { rows: string[]; key: Record<string, string> };

/**
 * True when every row of every frame is exactly GRID characters.
 *
 * A short row does not fail loudly — it silently truncates the sprite, and a
 * long one silently draws outside the cell. Both look like "the art is a bit
 * off" rather than like a typo, which is the worst kind of bug to have in a
 * hand-authored grid. The demo asserts this headlessly, since building the
 * sheet needs a canvas and the check does not.
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
 * The hero: a traveller who has been down here far too long.
 *
 * Hooded and hunched over a walking staff, cloak gone to rags at the hem, a
 * bedroll still strapped to his back because he set out meaning to come home.
 * The only bright thing on him is the eye under the hood.
 *
 * He was three ellipses and a line before — a snowman holding a stick, which
 * read as a placeholder because it was one. Nothing about the fiction was on
 * screen: this is the one figure you look at for the whole game, and it was
 * the one asset saying nothing.
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
 * The monsters, on the same grid.
 *
 * Converted with the hero rather than after him, because a single figure in a
 * different style does not read as "the hero got better" — it reads as broken.
 * One pixel hero standing next to four smooth vector blobs is a worse screen
 * than five blobs were.
 *
 * Two frames each, differing only in the legs. Shape carries the identity —
 * low and wide, thin and hunched, a wedge, a slab — so each still reads at
 * three pixels a tile without relying on its colour.
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

/**
 * A monster's key: one hue, three tones, one lit eye.
 *
 * Built from spriteColour so the creature palette still lives in one place —
 * the shapes changed, the colour scheme did not.
 */
function monsterArt(palette: Palette, sprite: string, frame: number): PixelArt | null {
  const frames = MONSTER_FRAMES[sprite];
  if (!frames) return null;
  const base = spriteColour(palette, sprite);
  return {
    rows: frames[frame] ?? frames[0],
    key: {
      '#': palette.void,
      // Pulled toward the void so a monster sits in the rock rather than on
      // top of it. The old flat fills were brighter than the floor.
      M: mix(base, palette.void, 0.3),
      m: mix(base, palette.void, 0.55),
      // Interior shading: segment ridges, plate seams, joints. Between M and
      // m, so it reads as form rather than as an outline drawn inside the
      // outline — a second black line would just make the shape muddy.
      s: mix(base, palette.void, 0.68),
      e: mix(base, palette.chalk, 0.55),
    },
  };
}

function heroArt(palette: Palette, frame: number): PixelArt {
  const key: Record<string, string> = {
    '#': palette.void,
    // Cloth, in three tones off one hue. Grimy rather than coloured — the
    // brightest thing on him should be the eye, so everything else stays
    // pulled most of the way to black.
    D: mix(palette.dust, palette.void, 0.68),
    C: mix(palette.dust, palette.void, 0.46),
    L: mix(palette.dust, palette.chalk, 0.1),
    // Under the hood. Not empty — darker than the outline, so the face reads
    // as a hollow rather than a hole punched in the sprite.
    F: mix(palette.void, palette.matrix, 0.35),
    E: palette.citrine,
    // Warm dark wood. One pixel wide: at three it read as a ladder, because
    // an outline down both sides of a 16-grid sprite is most of the staff.
    W: mix(palette.ember, palette.void, 0.6),
    // The bedroll still strapped to his back. He set out meaning to return.
    P: mix(palette.seam, palette.void, 0.15),
  };

  return { rows: HERO_FRAMES[frame] ?? HERO_FRAMES[0], key };
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

/**
 * Sprites are drawn facing RIGHT (+x). The renderer flips them to face the
 * other way rather than rotating, which is why nothing here needs a direction
 * — and is what makes a pixel grid survive being pointed left.
 */
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
