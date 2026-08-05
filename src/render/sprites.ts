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
import { spriteColour } from './renderer';

/** Pixels per sprite cell. Generous so the shapes stay crisp when scaled up. */
export const CELL = 48;
export const WALK_FRAMES = 2;

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
 * Sprites are drawn facing RIGHT (+x). The renderer rotates them to face,
 * which is why nothing here needs a direction.
 */
function drawCreature(
  ctx: CanvasRenderingContext2D,
  sprite: string,
  frame: number,
  palette: Palette
): void {
  const c = CELL / 2;
  const colour = spriteColour(palette, sprite);
  const swing = frame === 0 ? -1 : 1;
  shade(ctx, colour, palette.void);

  const leg = (dx: number, dy: number, len: number) => {
    ctx.beginPath();
    ctx.moveTo(c + dx, c + dy);
    ctx.lineTo(c + dx + len * 0.4, c + dy + len);
    ctx.stroke();
  };

  switch (sprite) {
    case 'hero': {
      // Body, head, and a weapon nub pointing the way it faces.
      ctx.beginPath();
      ctx.ellipse(c - 1, c, 9, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(c + 4, c - 10, 6, 0, Math.PI * 2);
      ctx.fillStyle = palette.chalk;
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = palette.chalk;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(c + 6, c + 1);
      ctx.lineTo(c + 18, c - 5 + swing * 2);
      ctx.stroke();

      ctx.strokeStyle = palette.void;
      ctx.lineWidth = 3;
      leg(-4, 9, 7 * swing === 0 ? 7 : 7);
      leg(3, 9, -7 * swing || 7);
      break;
    }

    case 'grub': {
      // Low and wide, segmented.
      ctx.beginPath();
      ctx.ellipse(c, c + 3, 13, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(c + 8, c + 1, 6, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i++) leg(i * 6, 8, 5 * (i % 2 === 0 ? swing : -swing) || 5);
      break;
    }

    case 'husk': {
      // Thin humanoid, hunched.
      ctx.beginPath();
      ctx.ellipse(c - 1, c, 6, 12, 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(c + 3, c - 11, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.lineWidth = 3;
      leg(-3, 10, 7 * swing || 7);
      leg(3, 10, -7 * swing || 7);
      break;
    }

    case 'stalker': {
      // Narrow wedge, long legs — reads fast.
      ctx.beginPath();
      ctx.moveTo(c + 14, c);
      ctx.lineTo(c - 8, c - 8);
      ctx.lineTo(c - 5, c);
      ctx.lineTo(c - 8, c + 8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.lineWidth = 2;
      leg(-2, 5, 9 * swing || 9);
      leg(4, 5, -9 * swing || 9);
      break;
    }

    case 'brute': {
      // Big blocky mass with shoulders.
      ctx.beginPath();
      ctx.roundRect(c - 12, c - 12, 24, 22, 5);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(c + 9, c - 12, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.lineWidth = 4;
      leg(-6, 10, 8 * swing || 8);
      leg(6, 10, -8 * swing || 8);
      break;
    }
  }
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
