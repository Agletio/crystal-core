/**
 * THE 3D HALF, WHEN A BUILD CARRIES ONE. The web build (`src/web.ts`) is the
 * pixel-art game and imports no three.js at all; the download
 * (`src/desktop.ts`) hands this what draws in 3D before the game boots, and
 * everything that could go 3D — the descent, the camp, the dev kit's Abyss —
 * asks here first. Nothing handed over is 2D, whatever the URL says.
 */
import type { Palette, Renderer } from './render/renderer';
import type { CampView, Rect } from './gl/camp';

export interface DeepCamp {
  frame(view: CampView, dt: number): void;
  resize(width: number, height: number, artScale: number): void;
  bounds(id: string, width: number, height: number): Rect | null;
  dispose(): void;
}

export interface Deep {
  /** Whether this page has a GPU of its own. */
  hardware(): boolean;
  descent(host: HTMLElement, palette: Palette): Promise<Renderer | null>;
  camp(host: HTMLElement, spots: Record<string, Rect>): Promise<DeepCamp | null>;
  abyss(name: string, leave: () => void): Promise<void>;
}

let deep: Deep | null = null;
export const provideDeep = (d: Deep): void => void (deep = d);
export const deepOf = (): Deep | null => deep;
