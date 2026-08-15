/**
 * What a character looks like. The renderer is handed art keys and nothing else.
 *
 * A generated hero is drawn as his TRADE and gear does not change him; the doll
 * underneath layers what is worn and is the fallback. `heroSpriteFor` chooses.
 */
import { GEAR_BASE_BY_ID } from '../data';
import { GENERATED } from '../render/generated-art';
import { hasFamilyArt, hasWeaponArt } from '../render/look';
import { TRADE_BY_ID } from '../trades';
import { equippedItems } from './character';
import type { Character } from './character';
import type { Look, WornPiece } from '../types';

export const HERO_SPRITE = 'wanderer'; // no trade: the base man
export const HERO_DOLL = 'hero'; // the doll, and the only art carrying GEAR

// Tiles on screen; the gait gauge measures a stride against this too.
export const HERO_TILES: Record<string, number> = { [HERO_DOLL]: 1.15 };
export const heroScale = (sprite: string): number => HERO_TILES[sprite] ?? 1.5;

/** Falls through to the doll, so a look nobody has generated yet is a
 *  hand-drawn hero rather than an empty tile. */
export function heroSpriteFor(character: Character): string {
  const worn = character.trade ? TRADE_BY_ID[character.trade]?.spec.sprite : undefined;
  for (const sprite of [worn, HERO_SPRITE]) if (sprite && GENERATED[sprite]) return sprite;
  return HERO_DOLL;
}

/** Rung off the base id: `bulwark_helmet_t2` is the second. */
function tierOf(baseId: string): number {
  const n = Number(/_t(\d+)$/.exec(baseId)?.[1]);
  return Number.isFinite(n) ? n : 1;
}

export function lookOf(character: Character): Look {
  const look: Look = {};

  for (const item of equippedItems(character)) {
    const base = GEAR_BASE_BY_ID[item.base];
    if (!base?.family) continue;

    if (base.kind === 'weapon') { // the BASE: an Ember Maul is not a tinted Cudgel
      if (hasWeaponArt(item.base)) look.weapon = { kind: item.base };
      continue;
    }
    // A family with no art leaves the slot bare rather than borrowing a set.
    if (!hasFamilyArt(base.family)) continue;
    const worn: WornPiece = { family: base.family, tier: tierOf(item.base) };
    if (base.kind === 'helmet') look.helmet = worn;
    else if (base.kind === 'body') look.body = worn;
    else if (base.kind === 'gloves') look.gloves = worn;
    else if (base.kind === 'boots') look.boots = worn;
  }
  return look;
}
