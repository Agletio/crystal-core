/**
 * What a character looks like. The renderer is handed art keys and nothing else.
 *
 * A hero IS his trade: the body is `TradeSpec.sprite` and equipped gear does
 * not change it. What the main hand HOLDS is a second answer and is NOT the
 * body — a weapon is one picture pinned at the hand.
 */
import { GENERATED } from '../render/generated-art';
import { HELD } from '../render/held';
import { GEAR_BASE_BY_ID } from '../data';
import { TRADE_BY_ID } from '../trades';
import type { Character } from './character';

export const HERO_SPRITE = 'wanderer';

/** Tiles on screen; the gait gauge measures a stride against this too. */
export const HERO_SCALE = 1.5;

export function heroSpriteFor(character: Character): string {
  const worn = character.trade ? TRADE_BY_ID[character.trade]?.spec.sprite : undefined;
  return worn && GENERATED[worn] ? worn : HERO_SPRITE;
}

/** The `HELD` row the main hand draws, off the base's `art` — a weapon's is
 *  its FAMILY, so every rung of one holds the same picture. */
export function heldFor(character: Character): string | undefined {
  const weapon = character.equipment.weapon;
  const art = weapon ? GEAR_BASE_BY_ID[weapon.base]?.art : undefined;
  return art && HELD[art] ? art : undefined;
}
