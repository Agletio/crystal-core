/**
 * A generated PNG, reduced to the character grid a `BeastArt` frame is. The
 * conversion is LOSSY and the grid is what ships, so the grid is what gets
 * reviewed — never the PNG it came from.
 */
import type { Decoded } from './png.mts';

/** The inks a creature is authored in. `x` is the per-rank accent and `b`/`o`
 *  are the halo, all three applied at RUNTIME — so nothing generated may hold
 *  them, and nothing here may emit them. */
export type Inks = { '#': string; M: string; m: string; s: string; e: string };

export const INK_CHARS = ['#', 'M', 'm', 's', 'e'] as const;

/** Below this an averaged block is floor rather than creature. */
const SOLID = 0.5;

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const n = Number.parseInt(full, 16);
  return Number.isNaN(n) ? [255, 255, 255] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Redmean: how far apart two colours LOOK. Plain Euclidean RGB puts a dark
 *  blue nearer a dark red than the eye does, which on a five-ink palette is
 *  the difference between mass and shade. */
function apart(a: [number, number, number], b: [number, number, number]): number {
  const r = (a[0] + b[0]) / 2;
  const dr = a[0] - b[0];
  const dg = a[1] - b[1];
  const db = a[2] - b[2];
  return (2 + r / 256) * dr * dr + 4 * dg * dg + (2 + (255 - r) / 256) * db * db;
}

/** Block-average, then snap. Integer factors only: a non-integer downscale
 *  resamples across pixel boundaries, which is the blur pixel art exists to
 *  not be — so it REFUSES rather than producing something plausible. */
/** Fraction of the canvas that must already be clear for the ask to have worked. */
const ASSUME_CUT_OUT = 0.02;

/**
 * `no_background` is not always obeyed — at 256 the cat came back on a solid
 * field — so the ground is FLOODED away from the edges rather than replaced
 * globally, or a body pixel of the same colour goes with it.
 */
export function debackground(image: Decoded): Decoded {
  const { width, height, rgba } = image;
  let clear = 0;
  for (let i = 3; i < rgba.length; i += 4) if (rgba[i] < 128) clear++;
  if (clear / (width * height) > ASSUME_CUT_OUT) return image;

  const at = (x: number, y: number): number => (y * width + x) * 4;
  const near = (i: number, j: number): boolean =>
    Math.abs(rgba[i] - rgba[j]) + Math.abs(rgba[i + 1] - rgba[j + 1]) + Math.abs(rgba[i + 2] - rgba[j + 2]) < 24;

  const out = new Uint8Array(rgba);
  const seed = at(0, 0);
  const stack: Array<[number, number]> = [];
  for (let x = 0; x < width; x++) stack.push([x, 0], [x, height - 1]);
  for (let y = 0; y < height; y++) stack.push([0, y], [width - 1, y]);
  const done = new Uint8Array(width * height);

  while (stack.length) {
    const [x, y] = stack.pop()!;
    if (x < 0 || y < 0 || x >= width || y >= height || done[y * width + x]) continue;
    done[y * width + x] = 1;
    if (!near(at(x, y), seed)) continue;
    out[at(x, y) + 3] = 0;
    stack.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
  }
  return { width, height, rgba: out };
}

export function toGrid(image: Decoded, grid: number, inks: Inks): string[] {
  if (image.width !== image.height) {
    throw new Error(`${image.width}x${image.height} is not square`);
  }
  if (image.width % grid !== 0) {
    throw new Error(`${image.width}px does not divide into a ${grid} grid — generate at a multiple`);
  }

  const block = image.width / grid;
  const targets = INK_CHARS.map((c) => ({ char: c, rgb: rgb(inks[c]) }));
  const rows: string[] = [];

  for (let gy = 0; gy < grid; gy++) {
    let row = '';
    for (let gx = 0; gx < grid; gx++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let y = 0; y < block; y++) {
        for (let x = 0; x < block; x++) {
          const at = ((gy * block + y) * image.width + (gx * block + x)) * 4;
          // Weighted by alpha, so a block half off the edge takes the colour
          // of the half that IS creature.
          const w = image.rgba[at + 3] / 255;
          r += image.rgba[at] * w;
          g += image.rgba[at + 1] * w;
          b += image.rgba[at + 2] * w;
          a += w;
        }
      }

      if (a / (block * block) < SOLID) {
        row += '.';
        continue;
      }
      const mean: [number, number, number] = [r / a, g / a, b / a];
      let best = targets[0];
      let bestBy = Infinity;
      for (const target of targets) {
        const by = apart(mean, target.rgb);
        if (by < bestBy) {
          bestBy = by;
          best = target;
        }
      }
      row += best.char;
    }
    rows.push(row);
  }
  return outlined(deshadow(rows));
}

/** How much wider than the body a row has to be to be the ground and not feet.
 *  Measured over three sprites: shadowed ones run 1.55 and 2.03, a clean one
 *  0.77. */
const GROUND = 1.4;

/** The cast shadow the generator paints under a body, asked away twice and
 *  drawn anyway. It travels WITH the sprite, so it reads as a blob to stand on
 *  rather than as light. Found by being far wider than the body above it. */
export function deshadow(rows: string[]): string[] {
  const width = rows.map((r) => [...r].filter((c) => c !== '.').length);
  const body = width.map((n, i) => [i, n] as [number, number]).filter(([, n]) => n > 0);
  if (body.length < 8) return rows;

  const top = body[0][0];
  const tall = body[body.length - 1][0] - top;
  const middle = body
    .filter(([i]) => i >= top + tall * 0.2 && i <= top + tall * 0.75)
    .map(([, n]) => n)
    .sort((a, b) => a - b);
  if (!middle.length) return rows;

  const wide = middle[Math.floor(middle.length / 2)] * GROUND;
  const from = body.find(([i, n]) => i > top + tall * 0.75 && n > wide)?.[0];
  if (from === undefined) return rows;
  return rows.map((row, y) => (y >= from ? '.'.repeat(row.length) : row));
}

/** The dark edge every creature carries, DERIVED rather than asked for: offered
 *  the ink the generator fills bodies with it, denied it there is no edge at
 *  all. Drawn INSIDE the silhouette, so a creature never grows by a pixel. */
function outlined(rows: string[]): string[] {
  const clear = (x: number, y: number): boolean => (rows[y]?.[x] ?? '.') === '.';
  return rows.map((row, y) =>
    [...row]
      .map((c, x) =>
        c !== '.' && (clear(x - 1, y) || clear(x + 1, y) || clear(x, y - 1) || clear(x, y + 1))
          ? '#'
          : c
      )
      .join('')
  );
}

/** The rows as a bestiary entry holds them, ready to paste into the table. */
export function asSource(rows: string[]): string {
  return `[\n${rows.map((r) => `  '${r}',`).join('\n')}\n]`;
}
