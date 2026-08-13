/**
 * A creature's five authored inks, resolved the way `monsterArt` builds them.
 * The palette is read WHOLE out of the stylesheet rather than listed by hand:
 * a partial list is how `tools/model-sheet.mts` died on the first creature
 * mixing an ink nobody had transcribed.
 */
import { readFileSync } from 'node:fs';
import { BEASTIARY } from '../../src/render/bestiary';
import { mix } from '../../src/render/renderer';
import type { Palette } from '../../src/render/renderer';
import type { Inks } from './convert.mts';

const CSS = readFileSync(new URL('../../docs/index.html', import.meta.url), 'utf8');

/** Every `--custom-property` in the sheet, camelCased into a Palette. */
export const PALETTE: Palette = (() => {
  const found: Record<string, string> = {};
  for (const [, name, value] of CSS.matchAll(/--([a-z0-9-]+)\s*:\s*([^;}]+)[;}]/gi)) {
    found[name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = value.trim();
  }
  return found as unknown as Palette;
})();

/** The palette to ASK for: BODY inks only. Offered the outline, the generator
 *  fills with it — 96% of one creature came back near-black. The converter
 *  derives the edge instead. */
export function paletteAsk(tone: string): string[] {
  const inks = inksFor(tone);
  return [...Array<string>(4).fill(inks.m), ...Array<string>(3).fill(inks.M),
    ...Array<string>(3).fill(inks.s), inks.e];
}

export function inksFor(tone: string): Inks {
  const art = BEASTIARY[tone];
  if (!art) throw new Error(`no creature called "${tone}" to take inks from`);
  return {
    '#': mix(PALETTE.rockDeep, PALETTE.void, 0.6),
    M: art.tone.lit(PALETTE),
    m: art.tone.mass(PALETTE),
    s: art.tone.shade(PALETTE),
    e: art.tone.eye(PALETTE),
  };
}
