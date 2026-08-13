/**
 * The title's background: a wall of the Cavern and a wall of the Rot, meeting
 * on a front neither of them holds straight. Painted out of the same pure decal
 * functions both renderers stamp, so the two halves are one generator's stone
 * drawn two ways rather than a picture of it.
 *
 * Two palettes over ONE grid, and the mixing lives here: a `GameMap` carries a
 * single theme and nothing in the sim knows a place can change world across
 * itself. It is a STILL, painted once per size, because a background that ticks
 * is a frame loop running before anything is playable.
 */
import { patchNoise, tileNoise } from '../noise';
import {
  floorColour,
  floorPalette,
  livingDecals,
  readPalette,
  tileDecals,
} from '../render/renderer';
import type { FloorPalette } from '../render/renderer';
import { FLOOR, WALL } from '../sim/grid';

const TILE = 17; // CSS pixels across one tile: a texture, not a set of rooms
const MAX_DPR = 2; // a retina title is four times the fill for no more detail
const MOMENT = 6.3; // one instant of the part that moves; off zero, or nothing has swung

/** How much rock, and how broken its edges are. Two octaves: the second is
 *  what stops a hollow being an oval. */
const CAVE_SCALE = 5;
const CAVE_BREAK = 2.3;
const CAVE_FILL = 0.52;

/** The front. `LOBES` is each world pushing several tiles into the other,
 *  `HOLDOUT` is a whole patch cut off behind the line, and `RAGGED` is the
 *  edge itself, decided tile by tile so no run of it is straight. */
const LOBES = 8;
const LOBE_REACH = 0.62;
const HOLDOUT = 19;
const HOLDOUT_REACH = 0.34;
const RAGGED = 0.1;

/**
 * Which world holds this tile. Zero is the corner-to-corner diagonal and the
 * sign is which side of it; everything added to that is the fight over it.
 */
function rotHolds(x: number, y: number, w: number, h: number): boolean {
  const diagonal = x / w + y / h - 1;
  const lobes = (patchNoise(x, y, LOBES, 41) - 0.5) * LOBE_REACH;
  const holdouts = (patchNoise(x, y, HOLDOUT, 43) - 0.5) * HOLDOUT_REACH;
  const ragged = (tileNoise(x, y, 45) - 0.5) * RAGGED;
  return diagonal + lobes + holdouts + ragged > 0;
}

/** Rock or hollow. The same answer whatever world the tile belongs to: the two
 *  halves are the same stone, which is the whole point of drawing it. */
const rockAt = (x: number, y: number): boolean =>
  patchNoise(x, y, CAVE_SCALE, 5) * 0.72 + patchNoise(x, y, CAVE_BREAK, 6) * 0.28 > CAVE_FILL;

export function clearTitleArt(canvas: HTMLCanvasElement): void {
  canvas.width = 0;
  canvas.height = 0;
}

export function paintTitle(canvas: HTMLCanvasElement, width: number, height: number): void {
  const dpr = Math.min(MAX_DPR, globalThis.devicePixelRatio || 1);
  canvas.width = Math.ceil(width * dpr);
  canvas.height = Math.ceil(height * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  const palette = readPalette(document.documentElement);
  const rot = floorPalette(palette, 1, 'demonic');
  const cavern = floorPalette(palette, 1, 'prismatic');

  const across = Math.ceil(width / TILE) + 1;
  const down = Math.ceil(height / TILE) + 1;
  // Out of bounds is rock: the wall carries on past the edge of the screen.
  const at = (x: number, y: number): number =>
    x < 0 || y < 0 || x >= across || y >= down || rockAt(x, y) ? WALL : FLOOR;
  const ink = (x: number, y: number): FloorPalette => (rotHolds(x, y, across, down) ? rot : cavern);

  for (let y = 0; y < down; y++) {
    for (let x = 0; x < across; x++) {
      ctx.fillStyle = floorColour(ink(x, y), at(x, y), x, y);
      ctx.fillRect(x * TILE, y * TILE, TILE + 1, TILE + 1);
    }
  }

  ctx.globalAlpha = 1;
  for (let y = 0; y < down; y++) {
    for (let x = 0; x < across; x++) {
      const floor = ink(x, y);
      for (const d of tileDecals(floor, at, x, y)) {
        ctx.globalAlpha = d.alpha;
        ctx.fillStyle = d.colour;
        ctx.fillRect(
          (x + d.x) * TILE,
          (y + d.y) * TILE,
          Math.max(1, d.w * TILE),
          Math.max(1, d.h * TILE)
        );
      }
      for (const d of livingDecals(floor, at, x, y, MOMENT)) {
        ctx.globalAlpha = d.alpha;
        ctx.fillStyle = d.colour;
        ctx.fillRect(
          (x + d.x) * TILE,
          (y + d.y) * TILE,
          Math.max(1, d.w * TILE),
          Math.max(1, d.h * TILE)
        );
      }
    }
  }
  ctx.globalAlpha = 1;
}
