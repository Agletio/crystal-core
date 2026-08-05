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
  /** Release the surface and any GPU resources. */
  destroy(): void;
}

const VARS: Array<[keyof Palette, string]> = [
  ['void', '--void'],
  ['matrix', '--matrix'],
  ['seam', '--seam'],
  ['seamLit', '--seam-lit'],
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
