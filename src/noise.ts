/**
 * A hash of a coordinate. Answerable for one tile without having generated any
 * other — which is what makes it usable from BOTH the generator and the
 * renderer, and what makes it not an `Rng`: nothing here has an order.
 */
export function tileNoise(x: number, y: number, salt: number): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2246822519) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * The same hash, smoothed across a coarse lattice. Per-tile hashing reads as
 * television static; rock varies in PATCHES, and a boundary wanders in lobes.
 */
export function patchNoise(x: number, y: number, scale: number, salt: number): number {
  const fx = x / scale;
  const fy = y / scale;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0; // smoothstepped below, or the lattice shows up as a grid

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
