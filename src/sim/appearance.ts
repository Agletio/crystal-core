/**
 * What a character looks like, from what they are wearing.
 *
 * The renderer is handed art keys and nothing else, the same way it is handed
 * `sprite: 'hero'` — it never learns what a base or a tier is.
 */
import { GEAR_BASE_BY_ID } from '../data';
import { hasFamilyArt, hasWeaponArt } from '../render/look';
import { equippedItems } from './character';
import type { Character } from './character';
import type { Look, WornPiece } from '../types';

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

    if (base.kind === 'weapon') {
      if (hasWeaponArt(base.family)) look.weapon = { kind: base.family };
      continue;
    }
    // A family with no art yet leaves the slot bare rather than drawing
    // something that belongs to a different set.
    if (!hasFamilyArt(base.family)) continue;
    const worn: WornPiece = { family: base.family, tier: tierOf(item.base) };
    if (base.kind === 'helmet') look.helmet = worn;
    else if (base.kind === 'body') look.body = worn;
    else if (base.kind === 'gloves') look.gloves = worn;
    else if (base.kind === 'boots') look.boots = worn;
  }
  return look;
}
