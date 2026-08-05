/**
 * Turning items into combat numbers.
 *
 * Everything here goes through computeStat, so the flat/increased/more order
 * is exercised for real for the first time. The README calls a subtle bug
 * here the one that "poisons everything downstream and stays invisible for
 * months" — this is where that would show up.
 */
import { computeStat } from '../mods';
import { HERO_BASE, MONSTER_BASE, MONSTER_TIER_SCALE } from '../data';
import type { Item, RolledMod } from '../types';

export interface CombatStats {
  maxLife: number;
  /** Total damage per hit, summed across damage types. */
  damage: number;
  attacksPerSecond: number;
  critChance: number;
  moveSpeed: number;
  armour: number;
  attackRange: number;
  aggroRange: number;
  /** Life restored per second. Monsters have none. */
  lifeRegen: number;
}

/**
 * Damage types are resolved separately and summed.
 *
 * This is what makes tagged mods work without special-casing: a stat line
 * applies only if all of ITS tags are in the context, so "+12 fire damage"
 * (tags ['fire']) contributes only to the fire pass, while an untagged
 * "+40% increased damage" has no tags and therefore applies to every pass.
 * Only physical carries the weapon's base — the others start at zero, so an
 * unmodded character deals no fire damage rather than a phantom amount.
 */
const DAMAGE_TYPES = ['physical', 'fire', 'cold'] as const;

export function damageFrom(mods: RolledMod[], weaponBase: number): number {
  let total = 0;
  for (const type of DAMAGE_TYPES) {
    const base = type === 'physical' ? weaponBase : 0;
    total += computeStat(base, mods, 'damage', [type]);
  }
  return total;
}

export function heroStats(equipped: Item[]): CombatStats {
  const mods = equipped.flatMap((item) => item.mods);
  const maxLife = computeStat(HERO_BASE.life, mods, 'life');
  return {
    maxLife,
    lifeRegen: (maxLife * HERO_BASE.lifeRegenPercent) / 100,
    damage: damageFrom(mods, HERO_BASE.weaponDamage),
    attacksPerSecond: computeStat(HERO_BASE.attacksPerSecond, mods, 'attackSpeed'),
    critChance: computeStat(HERO_BASE.critChance, mods, 'critChance'),
    moveSpeed: computeStat(HERO_BASE.moveSpeed, mods, 'moveSpeed'),
    armour: computeStat(HERO_BASE.armour, mods, 'armour'),
    attackRange: HERO_BASE.attackRange,
    aggroRange: HERO_BASE.aggroRange,
  };
}

/** Monsters read their stats off the CRYSTAL's mods — same aggregation, other side. */
export function monsterStats(crystal: Item, tier: number): CombatStats {
  const life = MONSTER_BASE.life * Math.pow(MONSTER_TIER_SCALE.life, tier - 1);
  const damage = MONSTER_BASE.damage * Math.pow(MONSTER_TIER_SCALE.damage, tier - 1);

  return {
    maxLife: computeStat(life, crystal.mods, 'monsterLife'),
    damage: computeStat(damage, crystal.mods, 'monsterDamage'),
    attacksPerSecond: MONSTER_BASE.attacksPerSecond,
    critChance: 0,
    moveSpeed: computeStat(MONSTER_BASE.moveSpeed, crystal.mods, 'monsterMoveSpeed'),
    armour: 0,
    attackRange: MONSTER_BASE.attackRange,
    aggroRange: MONSTER_BASE.aggroRange,
    lifeRegen: 0,
  };
}

/** Pack layout off the crystal — the same bases simulateRun() used as a stub. */
export function mapDensity(crystal: Item): { packCount: number; packSize: number } {
  return {
    packCount: Math.max(1, Math.round(computeStat(10, crystal.mods, 'packCount'))),
    packSize: Math.max(1, Math.round(computeStat(5, crystal.mods, 'packSize'))),
  };
}
