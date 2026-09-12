/**
 * ONE BODY, standing in a PICTURE. The camp and the rooms off the Fissure
 * screen are both drawn scenes with people on them, so what puts a body on a
 * canvas is one function rather than one per screen.
 */
import { GENERATED } from '../render/generated-art';
import { idleAt } from '../render/sprites';

/** `--citrine`, which the canvas cannot read a token for. */
const RIM = '#fcde6f';
const RIM_FALL: [number, number][] = [[1, 0.55], [2, 0.2]]; // ring out from the body, and its alpha

/** Drawn from its FEET — a body pinned at its middle floats — at its own idle
 *  cadence, `offset` so a row of them is not one animation played four times. */
export function drawBody(
  ctx: CanvasRenderingContext2D,
  sprite: string,
  fx: number,
  fy: number,
  at: number,
  offset: number,
  rim: boolean,
  s: number
): void {
  const art = GENERATED[sprite];
  if (!art) return;
  const idle = art.states.idle ?? art.states.walk ?? [0];
  const which = idle[idleAt(sprite, at + offset)] ?? 0;
  const frames = art.frames[which];
  if (!frames) return;

  const left = Math.round(fx - (art.grid * s) / 2);
  const top = Math.round(fy - art.grid * s);
  const solid = (x: number, y: number): boolean => !!art.key[frames[y]?.[x] ?? 0];
  // THE EDGE, derived the way the import derives an outline: every empty cell
  // touching a filled one. It is the body's own silhouette, so what lights up
  // is the person rather than a box round them.
  if (rim) {
    ctx.fillStyle = RIM;
    const near = (x: number, y: number, d: number): boolean =>
      solid(x - d, y) || solid(x + d, y) || solid(x, y - d) || solid(x, y + d);
    // LIGHT rather than an outline: two rings falling off, so the edge glows
    // instead of being drawn round the body in one opaque stroke.
    for (const [ring, alpha] of RIM_FALL) {
      ctx.globalAlpha = alpha;
      for (let y = -2; y <= art.grid + 1; y++) {
        for (let x = -2; x <= art.grid + 1; x++) {
          if (solid(x, y) || (ring > 1 && near(x, y, 1))) continue;
          if (!near(x, y, ring) && !(ring > 1 && (solid(x - 1, y - 1) || solid(x + 1, y - 1) || solid(x - 1, y + 1) || solid(x + 1, y + 1)))) continue;
          ctx.fillRect(left + x * s, top + y * s, s, s);
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  for (let y = 0; y < art.grid; y++) {
    const row = frames[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x++) {
      const hex = art.key[row[x]];
      if (!hex) continue;
      ctx.fillStyle = hex;
      ctx.fillRect(left + x * s, top + y * s, s, s);
    }
  }
}
