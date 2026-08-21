/**
 * What a character looks like: the renderer is handed art keys and nothing else.
 * A hero IS his trade, and what he carries is drawn ON the body — a VARIANT of
 * the same man holding it. A picture pinned at the fist is the fallback.
 */
import { GENERATED } from '../render/generated-art';
import { HELD } from '../render/held';
import { GEAR_BASE_BY_ID, OFF_SLOT, WEAPON_SLOT } from '../data';
import { TRADE_BY_ID } from '../trades';
import type { Character } from './character';

export const HERO_SPRITE = 'wanderer';

export const HERO_SCALE = 1.5; // tiles on screen; the gait gauge reads it too

/** `HELD` row -> the `<body>_<suffix>` that DRAWS it; absent, it is pinned. */
const HOLDING: Record<string, string> = {
  sword: 'sword', sword2h: 'sword2h', dagger: 'dagger', mace: 'mace',
  mace2h: 'mace2h', staff: 'staff', wand: 'wand', bow: 'bow', shield: 'shield',
};

/** What BOTH hands hold, falling back to the hand that WAS drawn. A PAIR IS
 *  ORDERLESS — which hand you filled is a stats question, so the two sort into
 *  `HOLDING`'s order, where a shield is last and `sword_shield` reads forwards. */
function variants(character: Character): string[] {
  const main = HOLDING[heldFor(character, WEAPON_SLOT) ?? ''];
  const off = HOLDING[heldFor(character, OFF_SLOT) ?? ''];
  if (!main || !off) return [main || off].filter(Boolean);
  const order = Object.values(HOLDING);
  const [first, second] = [main, off].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  return [`${first}_${second}`, main, off];
}

export function heroSpriteFor(character: Character): string {
  const worn = character.trade ? TRADE_BY_ID[character.trade]?.spec.sprite : undefined;
  const body = worn && GENERATED[worn] ? worn : HERO_SPRITE;
  for (const suffix of variants(character)) {
    if (GENERATED[`${body}_${suffix}`]) return `${body}_${suffix}`;
  }
  return body;
}

/** The `HELD` row a SLOT draws, off the base's `art`. */
export function heldFor(character: Character, slotId = WEAPON_SLOT): string | undefined {
  const worn = character.equipment[slotId];
  const art = worn ? GEAR_BASE_BY_ID[worn.base]?.art : undefined;
  return art && HELD[art] ? art : undefined;
}

/** What is left to PIN once the body has drawn what it already holds. */
export function pinnedFor(character: Character, slotId = WEAPON_SLOT): string | undefined {
  const art = heldFor(character, slotId);
  if (!art || !HOLDING[art]) return art;
  const drawn = heroSpriteFor(character).split('_').slice(1);
  return drawn.includes(HOLDING[art]) ? undefined : art;
}
