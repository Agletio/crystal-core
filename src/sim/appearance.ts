/**
 * What a character looks like: the renderer is handed art keys and nothing else.
 * A hero IS his trade, and what he HOLDS is normally a picture pinned at the
 * hand rather than the body. A BOW is the exception and is a body of its own —
 * a VARIANT of the same man holding one, so the arms are drawn round it.
 */
import { GENERATED } from '../render/generated-art';
import { HELD } from '../render/held';
import { GEAR_BASE_BY_ID } from '../data';
import { TRADE_BY_ID } from '../trades';
import type { Character } from './character';

export const HERO_SPRITE = 'wanderer';

/** Tiles on screen; the gait gauge measures a stride against this too. */
export const HERO_SCALE = 1.5;

/** `HELD` row -> the `<body>_<suffix>` that DRAWS it; absent, it is pinned. */
const HOLDING: Record<string, string> = { bow: 'bow' };

export function heroSpriteFor(character: Character): string {
  const worn = character.trade ? TRADE_BY_ID[character.trade]?.spec.sprite : undefined;
  const body = worn && GENERATED[worn] ? worn : HERO_SPRITE;
  const holding = HOLDING[heldFor(character) ?? ''];
  const variant = holding ? `${body}_${holding}` : '';
  return variant && GENERATED[variant] ? variant : body;
}

/** The `HELD` row a SLOT draws, off the base's `art` — a weapon's is its FAMILY. */
export function heldFor(character: Character, slotId = 'weapon'): string | undefined {
  const worn = character.equipment[slotId];
  const art = worn ? GEAR_BASE_BY_ID[worn.base]?.art : undefined;
  return art && HELD[art] ? art : undefined;
}

/** What is left to PIN once the body has drawn what it already holds. */
export function pinnedFor(character: Character, slotId = 'weapon'): string | undefined {
  const art = heldFor(character, slotId);
  return art && HOLDING[art] && heroSpriteFor(character).endsWith(`_${HOLDING[art]}`)
    ? undefined
    : art;
}
