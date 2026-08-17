/**
 * WHAT A FLASK ACTUALLY DOES, in this character's numbers rather than the
 * table's. Here rather than in the panel so the demo can check that what the
 * hover says is what `RunSim` does — the Alchemist moves five of these at once,
 * and a flask that still quotes its printed line is a flask lying to you.
 */
import type { PotionDef } from './data';

export interface PotionReading {
  /** Share of the pool a second, and what that is in points. */
  share: number;
  perSecond: number;
  seconds: number;
  total: number;
  charges: number;
  /** Charges a second, and 0 where none come back. */
  regain: number;
  /** What holding a flask is worth, and each is 0 where nothing grants it. */
  more: number;
  haste: number;
  crit: number;
}

type Grants = Record<string, unknown>;

const num = (grants: Grants, id: string, fallback: number): number => {
  const v = grants[id];
  return typeof v === 'number' ? v : fallback;
};

/** `max` is the pool it pours into, which is the whole reason this is not a
 *  constant: a flask restores a SHARE, so building life builds the flask. */
export function potionReading(potion: PotionDef, max: number, grants: Grants): PotionReading {
  const share = potion.percentPerSecond * num(grants, 'potionPotency', 1);
  const seconds = potion.seconds * num(grants, 'potionDuration', 1);
  const perSecond = (max * share) / 100;
  return {
    share,
    perSecond,
    seconds,
    total: perSecond * seconds,
    charges: potion.charges,
    regain: num(grants, 'chargeRegen', 0),
    more: (num(grants, 'potionMore', 1) - 1) * 100,
    haste: num(grants, 'potionHaste', 0),
    crit: num(grants, 'potionCrit', 0),
  };
}

const round = (n: number) => Math.round(n).toLocaleString();
const trim = (n: number) => (Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1));

/**
 * The hover, a line at a time. The first line is the pour and the rest are
 * only there when something granted them, so a character with no trade reads
 * exactly as short as it did before there were any.
 */
export function potionWorkings(
  potion: PotionDef,
  reading: PotionReading,
  left: number,
  fires: number
): string[] {
  const pool = potion.pool === 'life' ? 'life' : 'mana';
  const lines = [
    `${round(reading.perSecond)} ${pool} a second for ${trim(reading.seconds)}s — ` +
      `${round(reading.total)} in all, at ${trim(reading.share)}% of your pool a second.`,
    `${left} of ${reading.charges} charges` +
      (reading.regain > 0
        ? `, and one comes back every ${(1 / reading.regain).toFixed(1)}s.`
        : `, and none come back until the next descent.`),
    `Fires itself at ${Math.round(fires * 100)}% ${pool}.`,
  ];
  const held: string[] = [];
  if (reading.more > 0) held.push(`${trim(reading.more)}% more damage`);
  if (reading.haste > 0) held.push(`${trim(reading.haste)}% increased attack and cast speed`);
  if (reading.crit > 0) held.push(`+${trim(reading.crit)}% Critical Chance`);
  if (held.length > 0) lines.push(`While ANY flask is running: ${held.join(', ')}.`);
  return lines;
}
