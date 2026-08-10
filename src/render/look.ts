/**
 * Stacking the figure, its armour and its weapon into one grid per pose.
 *
 * Pure text in, text out: no canvas, so the demo can check every combination
 * without a browser. The renderer paints whatever comes back exactly as it
 * paints a monster.
 */
import { BODY } from './body';
import { DOLL_GRID, FAMILY_ART, TRIM, TRIM_LIT, WEAPON_ART, hasWeapon } from './gear-art';
import { LAYER_ORDER, POSES, shiftFor } from './pose';
import type { LayerSlot, PoseId } from './pose';
import type { Look, WornPiece } from '../types';

const GRID = DOLL_GRID;
const BLANK = '.'.repeat(GRID);

/**
 * The five inks a family's art is drawn in, rewritten per family at
 * composition — twelve sets share one alphabet in the source and none of them
 * share a colour on screen. One cell holds one character, so the family has to
 * live IN the character; `lookKeyColours` builds the matching table.
 */
export const ROLES = ['p', 'P', 'd', 'x', 'X'] as const;

export function roleChar(family: string, role: string): string {
  const f = FAMILY_KEYS.indexOf(family);
  const r = ROLES.indexOf(role as (typeof ROLES)[number]);
  return f < 0 || r < 0 ? role : String.fromCharCode(0xe000 + f * ROLES.length + r);
}

export const FAMILY_KEYS = Object.keys(FAMILY_ART);

function inFamily(rows: string[], family: string): string[] {
  return rows.map((row) =>
    row
      .split('')
      .map((ch) => (ROLES.includes(ch as (typeof ROLES)[number]) ? roleChar(family, ch) : ch))
      .join('')
  );
}

/**
 * A rung is a rule: trim absent at tier 1, dull at 2, lit at 3. BOTH trim inks
 * at every rung — stripping one leaves bright accents burning on a tier 1.
 */
function atTier(rows: string[], tier: number): string[] {
  const swap = (row: string, from: string, to: string) => row.split(from).join(to);
  if (tier >= 3) return rows.map((r) => swap(r, TRIM, TRIM_LIT));
  if (tier === 2) return rows.map((r) => swap(r, TRIM_LIT, TRIM));
  return rows.map((r) => swap(swap(r, TRIM_LIT, '.'), TRIM, '.'));
}

function shift(rows: string[], dx: number, dy: number): string[] {
  const out: string[] = [];
  for (let y = 0; y < GRID; y++) {
    const row = rows[y - dy];
    if (!row) {
      out.push(BLANK);
      continue;
    }
    const moved = dx >= 0 ? BLANK.slice(0, dx) + row.slice(0, GRID - dx) : row.slice(-dx) + BLANK.slice(0, -dx);
    out.push(moved);
  }
  return out;
}

/** Later layers win, but only where they have ink. */
function over(base: string[], top: string[]): string[] {
  return base.map((row, y) =>
    row
      .split('')
      .map((ch, x) => {
        const above = top[y]?.[x];
        return above && above !== '.' ? above : ch;
      })
      .join('')
  );
}

function layerRows(look: Look, slot: LayerSlot, pose: PoseId): string[] | null {
  if (slot === 'weapon') {
    const art = look.weapon ? WEAPON_ART[look.weapon.kind] : undefined;
    if (!art) return null;
    return POSES[pose].swing ? art.strike : art.rest;
  }
  const worn = look[slot];
  if (!worn) return null;
  const family = FAMILY_ART[worn.family];
  if (!family) return null;
  // Feet are the one thing a shift cannot fake, so boots have a frame each.
  const stride = pose === 'walk1' || pose === 'attack';
  const art = slot === 'boots' ? family.boots[stride ? 1 : 0] : family[slot];
  return inFamily(atTier(art, worn.tier), worn.family);
}

/** One pose of one loadout, as a 16-row grid. */
export function lookRows(look: Look, pose: PoseId): string[] {
  // The figure moves with `all` too: a lunge is the whole body going forward,
  // not the armour sliding off it.
  let rows = shift(BODY[pose], POSES[pose].all[0], POSES[pose].all[1]);
  for (const slot of LAYER_ORDER) {
    const art = layerRows(look, slot, pose);
    if (!art) continue;
    const [dx, dy] = shiftFor(POSES[pose], slot);
    rows = over(rows, shift(art, dx, dy));
  }
  return rows;
}

/** Stable, and short enough to key a texture cache on. */
export function lookKey(look: Look): string {
  const part = (p?: WornPiece) => (p ? `${p.family}${p.tier}` : '-');
  return [
    part(look.helmet),
    part(look.body),
    part(look.gloves),
    part(look.boots),
    look.weapon?.kind ?? '-',
  ].join('/');
}

/** Art the layering can actually draw. Anything else falls back to bare skin. */
export const hasFamilyArt = (family: string): boolean => family in FAMILY_ART;
export const hasWeaponArt = (base: string): boolean => hasWeapon(base);
