/**
 * WHAT THE 3D PICTURE COSTS, as the player chose it: kept per MACHINE in local
 * storage rather than in the save, since a backup carried to another computer
 * should not carry its graphics card with it. The web build never reads it.
 */
export type Quality = 'low' | 'medium' | 'high';
export const QUALITIES: readonly Quality[] = ['low', 'medium', 'high'];

export interface Graphics {
  /** Null until the player picks one: the stage then takes Medium, or Low on a software rasteriser. */
  quality: Quality | null;
  /** The frame-rate readout. */
  frames: boolean;
}

const KEY = 'crystal-core:graphics';
let held: Graphics | null = null; // storage can refuse a write; the page still keeps the choice

export function graphics(): Graphics {
  if (held) return held;
  try {
    const saved = JSON.parse(globalThis.localStorage?.getItem(KEY) ?? '{}') as Partial<Graphics>;
    held = { quality: QUALITIES.includes(saved.quality as Quality) ? (saved.quality as Quality) : null, frames: saved.frames === true };
  } catch {
    held = { quality: null, frames: false };
  }
  return held;
}

export function setGraphics(next: Partial<Graphics>): Graphics {
  held = { ...graphics(), ...next };
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(held));
  } catch {
    // A private window or blocked storage: the choice lasts until the page closes.
  }
  return held;
}
