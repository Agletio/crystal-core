/**
 * What a character looks like. The renderer is handed art keys and nothing else.
 *
 * A hero IS his trade: the body is `TradeSpec.sprite` and equipped gear does
 * not change it. `wanderer` is what a trade with no look of its own falls back
 * to, and a character with no trade at all cannot be played — the hall is the
 * first screen of a new game.
 */
import { GENERATED } from '../render/generated-art';
import { TRADE_BY_ID } from '../trades';
import type { Character } from './character';

export const HERO_SPRITE = 'wanderer';

/** Tiles on screen; the gait gauge measures a stride against this too. */
export const HERO_SCALE = 1.5;

export function heroSpriteFor(character: Character): string {
  const worn = character.trade ? TRADE_BY_ID[character.trade]?.spec.sprite : undefined;
  return worn && GENERATED[worn] ? worn : HERO_SPRITE;
}

