/**
 * WHAT A FLASK ACTUALLY DOES, in this character's numbers. Here rather than in
 * the panel so the demo can hold what the hover says against what `RunSim`
 * pours — the Alchemist moves five of these at once.
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

/** `max` is why this is not a constant: a flask restores a SHARE. */
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
const trim = (n: number) =>
  Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(n < 1 ? 2 : 1);

/** ONE FACT A LINE, and a line only where there is something to say: no
 *  regeneration means no regeneration LINE, not a line saying there is none. */
export function potionWorkings(potion: PotionDef, reading: PotionReading, left: number): string[] {
  const pool = potion.pool === 'life' ? 'life' : 'mana';
  const lines = [
    `${potion.pool === 'life' ? 'Heals' : 'Restores'} ${trim(reading.share)}% of max ${pool} per second`,
    `${round(reading.perSecond)} ${pool} per second`,
    `${round(reading.total)} ${pool} over ${trim(reading.seconds)}s`,
    `${left}/${reading.charges} charges`,
  ];
  if (reading.regain > 0) lines.push(`${trim(reading.regain)} charges per second`);
  if (reading.more > 0) lines.push(`${trim(reading.more)}% more damage while running`);
  if (reading.haste > 0) lines.push(`${trim(reading.haste)}% increased attack and cast speed while running`);
  if (reading.crit > 0) lines.push(`+${trim(reading.crit)}% critical chance while running`);
  return lines;
}
