/**
 * The renderer boundary.
 *
 * This interface is the whole reason placeholder graphics are cheap to
 * replace. A renderer only ever READS RunState — it never writes back, and
 * the sim has no idea it exists. There are two implementations now
 * (canvas2d and pixi), which is the practical proof that the seam works.
 *
 * A renderer owns its own drawing surface and appends it to the host element,
 * because a WebGL context and a 2D context cannot share one canvas.
 *
 * Positions in RunState are in tile units, not pixels, so an implementation
 * is free to choose its own scale, camera, or projection.
 */
import type { RunState } from '../sim/run';

export interface Palette {
  void: string;
  matrix: string;
  seam: string;
  seamLit: string;
  /** Map-only, and much brighter than the panel colours. */
  floor: string;
  floorLit: string;
  chalk: string;
  dust: string;
  amethyst: string;
  citrine: string;
  quartz: string;
  verdite: string;
  ember: string;
}

export interface Renderer {
  /** CSS pixel dimensions. Implementations handle devicePixelRatio. */
  resize(width: number, height: number): void;
  draw(state: RunState): void;
  /**
   * 1 fits the whole map on screen. Above that the view zooms in and follows
   * the hero, because a zoomed view that doesn't track the action just shows
   * you an empty corner.
   */
  setZoom(zoom: number): void;
  /** Release the surface and any GPU resources. */
  destroy(): void;
}

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 5;

export const clampZoom = (z: number): number =>
  Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));

const VARS: Array<[keyof Palette, string]> = [
  ['void', '--void'],
  ['matrix', '--matrix'],
  ['seam', '--seam'],
  ['seamLit', '--seam-lit'],
  ['floor', '--floor'],
  ['floorLit', '--floor-lit'],
  ['chalk', '--chalk'],
  ['dust', '--dust'],
  ['amethyst', '--amethyst'],
  ['citrine', '--citrine'],
  ['quartz', '--quartz'],
  ['verdite', '--verdite'],
  ['ember', '--ember'],
];

/** Pulls the palette out of CSS so colours stay defined in one place. */
export function readPalette(el: Element): Palette {
  const style = getComputedStyle(el);
  const out = {} as Palette;
  for (const [key, cssVar] of VARS) {
    out[key] = style.getPropertyValue(cssVar).trim() || '#ffffff';
  }
  return out;
}

/**
 * Art keys → colour. Shared so both renderers agree on what a Brute looks
 * like; a sprite-based renderer replaces this with a texture lookup and
 * nothing else changes.
 */
export function spriteColour(palette: Palette, sprite: string): string {
  switch (sprite) {
    case 'hero':
      return palette.quartz;
    case 'grub':
      return palette.verdite;
    case 'husk':
      return palette.dust;
    case 'stalker':
      return palette.citrine;
    case 'brute':
      return palette.ember;
    default:
      return palette.ember;
  }
}

/**
 * Colour for an effect. Kind wins over damage type, because telling two
 * attacks apart at a glance matters more than colour-coding the element —
 * and this is a presentation call, which is why it lives here and not in
 * the skill data.
 */
export function vfxColour(palette: Palette, kind: string, damageType: string): string {
  if (kind === 'bolt') return palette.amethyst;
  if (kind === 'slash') return palette.chalk;
  return damageColour(palette, damageType);
}

export function damageColour(palette: Palette, type: string): string {
  switch (type) {
    case 'fire':
      return palette.ember;
    case 'cold':
      return palette.quartz;
    case 'lightning':
      return palette.amethyst;
    case 'poison':
      return palette.verdite;
    default:
      return palette.chalk;
  }
}

/** Hex string to a 0xRRGGBB number, for renderers that want numeric colours. */
export function toHexNumber(colour: string): number {
  const hex = colour.replace('#', '').trim();
  const full =
    hex.length === 3
      ? hex
          .split('')
          .map((c) => c + c)
          .join('')
      : hex;
  const n = Number.parseInt(full, 16);
  return Number.isNaN(n) ? 0xffffff : n;
}

// ---------------------------------------------------------------------------
// Poison field
// ---------------------------------------------------------------------------

/**
 * The falling-poison animation, as pure geometry.
 *
 * Both renderers call this so the effect is identical in each, and — more to
 * the point — so the RADIUS drawn is the radius the sim actually used. The
 * skill emits its true radius as a second point; nothing here invents a size.
 * That is what makes the circle a readable statement about what you did and
 * did not catch, and what makes Area of Effect visible as it grows.
 *
 * Everything is in tile units. Time `t` runs 0 to 1 over the effect's life.
 */
export interface PoisonDrop {
  x: number;
  y: number;
  /** Radius of the droplet, in tiles. */
  r: number;
  alpha: number;
}

/** How many droplets fall per field. Enough to read as rain, cheap to draw. */
const DROP_COUNT = 16;
/** How far above the ground a droplet starts, in tiles. */
const DROP_HEIGHT = 1.15;
/** Fraction of the effect's life spent snapping open. */
const OPEN = 0.16;

/**
 * The drawn radius, which snaps open and then holds at the true one.
 *
 * A circle that simply appears at full size and fades reads as an aura that
 * belongs to whatever is standing there. Punching it open says something
 * HAPPENED, at a moment, in a place — which is what a cast is. The hold is the
 * important half: for most of its life the circle is exactly the radius the
 * sim used, so it stays a statement about what got caught.
 */
export function poisonFieldRadius(radius: number, t: number): number {
  if (t >= OPEN) return radius;
  const p = t / OPEN;
  return radius * (1 - (1 - p) * (1 - p));
}

export function poisonDrops(
  centreX: number,
  centreY: number,
  radius: number,
  t: number
): PoisonDrop[] {
  const drops: PoisonDrop[] = [];
  for (let i = 0; i < DROP_COUNT; i++) {
    // Golden-angle placement scatters without clumping, and sqrt keeps the
    // density even rather than piling everything at the centre.
    const angle = i * 2.399963;
    const dist = radius * Math.sqrt(((i * 0.6180339887) % 1));
    // Each droplet runs its own fall on a staggered phase, so the rain is
    // continuous instead of every drop landing on the same frame.
    const fall = (t * 2.1 + ((i * 0.37) % 1)) % 1;

    drops.push({
      x: centreX + Math.cos(angle) * dist,
      y: centreY + Math.sin(angle) * dist - (1 - fall) * DROP_HEIGHT,
      // Swells slightly as it lands, which reads as a splash without needing
      // a second effect.
      r: 0.05 + 0.035 * fall,
      alpha: Math.min(1, fall * 4) * (1 - fall) * 1.5 * (1 - t),
    });
  }
  return drops;
}
