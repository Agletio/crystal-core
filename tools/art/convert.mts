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

export function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const n = Number.parseInt(full, 16);
  return Number.isNaN(n) ? [255, 255, 255] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Redmean: how far apart two colours LOOK. Plain Euclidean RGB puts a dark
 *  blue nearer a dark red than the eye does, which on a five-ink palette is
 *  the difference between mass and shade. */
export function apart(a: [number, number, number], b: [number, number, number]): number {
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

  // Then what the flood could not REACH: the gap between a pair of legs is
  // enclosed, so the ground stayed as the pale slab seen between them.
  for (let i = 0; i < width * height; i++) {
    if (out[i * 4 + 3] !== 0 && near(i * 4, seed)) out[i * 4 + 3] = 0;
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
  // Air for the glow to fall off into, and NO derived edge: the generator draws
  // its own thin outline and the snap lands those pixels on `#` already, so a
  // second one on top was the slab of black.
  const rings = Math.max(1, Math.round(grid / 24));
  return fitted(rows, rings * 4);
}

/** The body, scaled to fill its grid and stood on a common baseline. A cell is
 *  one tile whatever it was authored at, so a body filling 57% of its frame
 *  renders 40% smaller at the same `scale`. The margin is the rings' room. */
export function fitted(rows: string[], margin: number): string[] {
  const grid = rows.length;
  let top = grid;
  let bottom = -1;
  let left = grid;
  let right = -1;
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === '.') return;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      left = Math.min(left, x);
      right = Math.max(right, x);
    })
  );
  if (bottom < 0) return rows;

  const room = grid - margin * 2;
  const by = Math.min(room / (right - left + 1), room / (bottom - top + 1));
  const wide = Math.round((right - left + 1) * by);
  const tall = Math.round((bottom - top + 1) * by);
  const offX = Math.round((grid - wide) / 2);
  // Stood on the baseline rather than centred, so nothing floats or sinks.
  const offY = grid - margin - tall;

  return Array.from({ length: grid }, (_, y) =>
    Array.from({ length: grid }, (_, x) => {
      const sx = left + Math.floor((x - offX) / by);
      const sy = top + Math.floor((y - offY) / by);
      if (x < offX || x >= offX + wide || y < offY || y >= offY + tall) return '.';
      return rows[sy]?.[sx] ?? '.';
    }).join('')
  );
}

/**
 * Every frame of one animation, fitted ONCE, into a grid of your choosing.
 * `fitted` measures the frame it is given, so run per frame a walk cycle is
 * scaled and re-centred differently on every step and the body jitters against
 * its own feet. The box is the union of all of them and the transform is the
 * same for each — which is also what lets frames off two different canvases
 * keep their sizes relative to one another.
 */
export function fittedTogether(frames: string[][], margin: number, out?: number): string[][] {
  const grid = frames[0]?.length ?? 0;
  const size = out ?? grid;
  let top = grid;
  let bottom = -1;
  let left = grid;
  let right = -1;
  for (const rows of frames) {
    rows.forEach((row, y) =>
      [...row].forEach((c, x) => {
        if (c === '.') return;
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
        left = Math.min(left, x);
        right = Math.max(right, x);
      })
    );
  }
  if (bottom < 0) return frames;

  const room = size - margin * 2;
  const by = Math.min(room / (right - left + 1), room / (bottom - top + 1));
  const wide = Math.round((right - left + 1) * by);
  const tall = Math.round((bottom - top + 1) * by);
  const offX = Math.round((size - wide) / 2);
  const offY = size - margin - tall;

  return frames.map((rows) =>
    Array.from({ length: size }, (_, y) =>
      Array.from({ length: size }, (_, x) => {
        if (x < offX || x >= offX + wide || y < offY || y >= offY + tall) return '.';
        return rows[top + Math.floor((y - offY) / by)]?.[left + Math.floor((x - offX) / by)] ?? '.';
      }).join('')
    )
  );
}

/** The rows as a bestiary entry holds them, ready to paste into the table. */
export function asSource(rows: string[]): string {
  return `[\n${rows.map((r) => `  '${r}',`).join('\n')}\n]`;
}

/**
 * The cast shadow the generator paints under a body, asked away and drawn
 * anyway. It cannot be found by WIDTH — a standing figure's feet are wider
 * than its waist too, which is how the rule that tried took the Gaunt's legs
 * off — but it CAN be found by colour: the ellipse spills out past the body on
 * both sides, and whatever is out there and almost nowhere else is the floor.
 * Those colours are then erased across the whole low band, which is what takes
 * the part UNDER the feet without taking the feet.
 */
export function defloor(image: Decoded): Decoded {
  const { width, height, rgba } = image;
  const at = (x: number, y: number): number => (y * width + x) * 4;
  const solid = (x: number, y: number): boolean => rgba[at(x, y) + 3] > 40;

  let top = height, bottom = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (solid(x, y)) { if (y < top) top = y; bottom = y; break; }
  const tall = bottom - top;
  if (tall < 16) return image;

  // The body's own column span, measured over its MIDDLE where nothing is
  // standing on the ground: chest and waist, never the feet.
  let coreL = width, coreR = -1;
  for (let y = Math.round(top + tall * 0.2); y <= Math.round(top + tall * 0.6); y++)
    for (let x = 0; x < width; x++)
      if (solid(x, y)) { if (x < coreL) coreL = x; if (x > coreR) coreR = x; }
  if (coreR < coreL) return image;

  const band = Math.round(top + tall * 0.7);
  const hex = (i: number) => `${rgba[i]},${rgba[i + 1]},${rgba[i + 2]}`;
  const out = new Map<string, number>();
  const low = new Map<string, number>();
  const inside = new Map<string, number>();
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = at(x, y);
      if (rgba[i + 3] <= 40) continue;
      const c = hex(i);
      if (y < band) { inside.set(c, (inside.get(c) ?? 0) + 1); continue; }
      low.set(c, (low.get(c) ?? 0) + 1);
      if (x < coreL - 1 || x > coreR + 1) out.set(c, (out.get(c) ?? 0) + 1);
    }

  // Two signals, because one body defeats each. Out BESIDE the figure and
  // hardly above it — which a crawler cannot show, being all low band. And
  // present down here and NOWHERE above at all, which is what a shadow under
  // something lying flat looks like. A colour the body shares is left alone:
  // a hole in a boot is worse than a smudge of floor.
  const floor = new Set(
    [...low.keys()].filter((c) => {
      const above = inside.get(c) ?? 0;
      const beside = out.get(c) ?? 0;
      return (beside >= 3 && beside > above * 2) || (above === 0 && (low.get(c) ?? 0) >= 6);
    })
  );
  if (!floor.size) return image;

  const clean = new Uint8Array(rgba);
  for (let y = band; y < height; y++)
    for (let x = 0; x < width; x++) {
      const i = at(x, y);
      if (rgba[i + 3] > 40 && floor.has(hex(i))) clean.set([0, 0, 0, 0], i);
    }
  return { width, height, rgba: clean };
}

/** How far apart two colours may be and still be one region, in redmean. */
const ONE_REGION = 26;
/** Where the low band starts, as a fraction of the body's height. */
const LOW = 0.55;
/** A slab is at least this much wider than it is tall, and this much lighter
 *  than the body standing on it. */
const SLAB_WIDE = 1.6;
const SLAB_LIGHT = 1.25;
/** Fewer pixels than this is a speck, and `loose` is what answers a speck. */
const SLAB_LEAST = 6;

/**
 * The ground as a SLAB, which is what `defloor` cannot see. A colour rule is
 * blind to a shadow the body shares a colour with — the Dragger's and the
 * Shroud's are the same brown as their own bone — and loosening it is how the
 * feet come off. The shape is the signal instead: down in the low band, a
 * REGION of one colour that is wider than it is tall and LIGHTER than the body
 * above it is what the body is standing on. Every foot in the roster fails the
 * light test, since a body is asked for near-black bone and the ground is the
 * pale floor darkened; a body lying flat in its death frames fails it too,
 * which is the case a width rule alone gets wrong.
 */
export function deslab(image: Decoded): Decoded {
  const { width: W, height: H, rgba } = image;
  const at = (x: number, y: number): number => (y * W + x) * 4;
  const solid = (x: number, y: number): boolean => rgba[at(x, y) + 3] > 40;
  const luma = (i: number): number => 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];

  let top = H;
  let bottom = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (solid(x, y)) {
        if (y < top) top = y;
        bottom = y;
        break;
      }
  if (bottom < 0) return image;
  const from = Math.round(top + (bottom - top) * LOW);

  // The body's own brightness, read ABOVE the band: measured over the whole
  // frame a big slab drags the median up to its own level and hides itself.
  const above: number[] = [];
  for (let y = top; y < from; y++)
    for (let x = 0; x < W; x++) if (solid(x, y)) above.push(luma(at(x, y)));
  if (!above.length) return image;
  above.sort((a, b) => a - b);
  const body = above[above.length >> 1];

  const one = (i: number, j: number): boolean =>
    apart([rgba[i], rgba[i + 1], rgba[i + 2]], [rgba[j], rgba[j + 1], rgba[j + 2]]) <
    ONE_REGION * ONE_REGION;

  const mine = new Int8Array(W * H);
  const out = new Uint8Array(rgba);
  for (let y = from; y <= bottom; y++)
    for (let x = 0; x < W; x++) {
      const seed = y * W + x;
      if (!solid(x, y) || mine[seed]) continue;
      const cells: number[] = [];
      const stack = [seed];
      const lit: number[] = [];
      mine[seed] = 1;
      let left = W;
      let right = -1;
      let high = H;
      let low = -1;
      while (stack.length) {
        const a = stack.pop()!;
        cells.push(a);
        lit.push(luma(a * 4));
        const ax = a % W;
        const ay = (a / W) | 0;
        if (ax < left) left = ax;
        if (ax > right) right = ax;
        if (ay < high) high = ay;
        if (ay > low) low = ay;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const nx = ax + dx;
            const ny = ay + dy;
            if (nx < 0 || nx >= W || ny < from || ny > bottom) continue;
            const j = ny * W + nx;
            if (mine[j] || !solid(nx, ny) || !one(at(ax, ay), at(nx, ny))) continue;
            mine[j] = 1;
            stack.push(j);
          }
      }
      lit.sort((a, b) => a - b);
      const slab =
        cells.length >= SLAB_LEAST &&
        right - left + 1 >= (low - high + 1) * SLAB_WIDE &&
        lit[lit.length >> 1] >= body * SLAB_LIGHT;
      if (slab) for (const c of cells) out.set([0, 0, 0, 0], c * 4);
    }
  return { width: W, height: H, rgba: out };
}

/**
 * The SLAB a grounded body's feet are planted in, cut with the feet KEPT. Its
 * core rows are horizontal runs WIDER than the body's own chest span — nothing
 * on a crawling body is — and once those go, everything inside the box they
 * drew goes too, except a column a limb visibly enters: real ink above the box
 * where the slab's own thin top edge has almost none. Death frames are the
 * caller's to skip, since a corpse lies in its ground legitimately.
 */
export function demound(image: Decoded): Decoded {
  const { width: W, height: H, rgba } = image;
  const at = (x: number, y: number): number => (y * W + x) * 4;
  const solid = (x: number, y: number, a: Uint8Array = rgba): boolean => a[at(x, y) + 3] > 40;

  let top = H, bottom = -1;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (solid(x, y)) { if (y < top) top = y; bottom = y; break; }
  if (bottom < 0) return image;
  const tall = bottom - top;
  if (tall < 16) return image;

  let coreL = W, coreR = -1;
  for (let y = Math.round(top + tall * 0.2); y <= Math.round(top + tall * 0.6); y++)
    for (let x = 0; x < W; x++)
      if (solid(x, y)) { if (x < coreL) coreL = x; if (x > coreR) coreR = x; }
  if (coreR < coreL) return image;
  const limit = Math.max(6, (coreR - coreL + 1) * 0.7);

  const from = Math.round(top + tall * 0.6);
  const out = new Uint8Array(rgba);
  let bx0 = W, bx1 = -1, by0 = H, by1 = -1;
  for (let y = from; y <= bottom; y++) {
    let x = 0;
    while (x < W) {
      if (!solid(x, y)) { x++; continue; }
      let e = x;
      while (e < W && solid(e, y)) e++;
      if (e - x > limit) {
        for (let k = x; k < e; k++) out.set([0, 0, 0, 0], at(k, y));
        if (x < bx0) bx0 = x;
        if (e - 1 > bx1) bx1 = e - 1;
        if (y < by0) by0 = y;
        if (y > by1) by1 = y;
      }
      x = e;
    }
  }
  if (bx1 < 0) return image;

  const win = Math.max(4, Math.round(tall * 0.15));
  const need = Math.ceil(win / 2);
  for (let x = bx0; x <= bx1; x++) {
    let above = 0;
    for (let y = Math.max(0, by0 - win); y < by0; y++) if (solid(x, y, out)) above++;
    if (above >= need) continue;
    for (let y = Math.max(from, by0 - 3); y <= bottom; y++)
      if (solid(x, y, out)) out.set([0, 0, 0, 0], at(x, y));
  }
  return { width: W, height: H, rgba: out };
}

/** Everything not JOINED to the body, gone: the scatter of stones the
 *  generator draws around a pair of feet, and whatever a slab leaves stranded
 *  when it goes. It reports what it took, because a genuinely detached scrap
 *  of cloth would go the same way. */
export function loose({ width: W, height: H, rgba }: Decoded): [Decoded, number] {
  const mine = new Int32Array(W * H).fill(-1);
  const sizes: number[] = [];
  for (let seed = 0; seed < W * H; seed++) {
    if (rgba[seed * 4 + 3] < 40 || mine[seed] >= 0) continue;
    const id = sizes.length;
    let n = 0;
    const stack = [seed];
    mine[seed] = id;
    while (stack.length) {
      const at = stack.pop()!;
      n++;
      const x = at % W;
      const y = (at / W) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny * W + nx;
          if (rgba[j * 4 + 3] < 40 || mine[j] >= 0) continue;
          mine[j] = id;
          stack.push(j);
        }
    }
    sizes.push(n);
  }
  const body = sizes.indexOf(Math.max(...sizes, 0));
  const out = new Uint8Array(rgba);
  let dropped = 0;
  for (let i = 0; i < W * H; i++)
    if (mine[i] >= 0 && mine[i] !== body) {
      out.set([0, 0, 0, 0], i * 4);
      dropped++;
    }
  return [{ width: W, height: H, rgba: out }, dropped];
}
