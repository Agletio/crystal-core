/** The Survey's own routing (`src/cavepath.ts`), reading a shipped PNG. */
import { existsSync, readFileSync } from 'node:fs';
import { decodePng } from './art/png.mts';
import { readCave as fromPixels } from '../src/cavepath';

export { thin, walk, walkFrom, walked } from '../src/cavepath';
export type { Cave } from '../src/cavepath';

const SCENES = new URL('../src/render/generated-scene.ts', import.meta.url).pathname;

/** A SCENE ID reads the shipped picture out of the emitted table. */
export function shippedScene(id: string): Buffer | null {
  if (!existsSync(SCENES)) return null;
  const row = new RegExp(`^  ${id}: \\{ w: \\d+, h: \\d+, png: '([^']+)' \\},$`, 'm')
    .exec(readFileSync(SCENES, 'utf8'));
  return row ? Buffer.from(row[1].split(',', 2)[1], 'base64') : null;
}

export function readCave(png: Buffer) {
  const { width, height, rgba } = decodePng(png);
  return fromPixels(rgba, width, height);
}
