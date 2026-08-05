/**
 * The renderer boundary.
 *
 * This interface is the whole reason placeholder graphics are cheap to
 * replace. A renderer only ever READS RunState — it never writes back, and
 * the sim has no idea it exists. Swapping stick figures for sprites means
 * writing a second implementation of this and changing one line of wiring.
 *
 * Positions in RunState are in tile units, not pixels, so a new renderer is
 * free to choose its own scale, camera, or projection.
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
