/**
 * Stacking the figure, its armour and its weapon into one grid per pose.
 *
 * Pure text in, text out: no canvas, so the demo can check every combination
 * without a browser. The renderer paints whatever comes back exactly as it
 * paints a monster.
 */
import { BODY } from './body';
import { FAMILY_ART, TRIM, TRIM_LIT, WEAPON_ART, WEAPON_SHAPE } from './gear-art';
import { LAYER_ORDER, POSES, shiftFor } from './pose';
import type { LayerSlot, PoseId } from './pose';
import type { Look, WornPiece } from '../types';

const GRID = 16;
const BLANK = '.'.repeat(GRID);

/**
 * A rung is a rule, not a drawing: trim is absent at tier 1, dull at tier 2 and
 * lit at tier 3. One grid per piece, and three rungs that cannot drift apart.
 */
function atTier(rows: string[], tier: number): string[] {
  if (tier >= 3) return rows.map((r) => r.split(TRIM).join(TRIM_LIT));
  if (tier === 2) return rows;
  return rows.map((r) => r.split(TRIM).join('.'));
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
    const shape = look.weapon && WEAPON_SHAPE[look.weapon.kind];
    const art = shape ? WEAPON_ART[shape] : undefined;
    if (!art) return null;
    return POSES[pose].swing ? art.strike : art.rest;
  }
  const worn = look[slot];
  if (!worn) return null;
  const family = FAMILY_ART[worn.family];
  if (!family) return null;
  // Feet are the one thing a shift cannot fake, so boots have a frame each.
  const art = slot === 'boots' ? family.boots[pose === 'walk1' ? 1 : 0] : family[slot];
  return atTier(art, worn.tier);
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
export const hasWeaponArt = (kind: string): boolean => kind in WEAPON_SHAPE;
