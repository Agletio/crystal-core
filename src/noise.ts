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
