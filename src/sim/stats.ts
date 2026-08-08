/**
 * Turning items into combat numbers.
 *
 * Everything here goes through computeStat, so the flat/increased/more order
 * is exercised for real for the first time. The README calls a subtle bug
 * here the one that "poisons everything downstream and stays invisible for
 * months" — this is where that would show up.
 */
import { computeStat, percentStat } from '../mods';
import {
  DAMAGE_TYPES,
  DEFENCE,
  HERO_BASE,
  LEVELLING,
  TYPELESS,
  MONSTER_BASE,
  MONSTER_TIER_SCALE,
  SKILLS,
  SKILL_BY_ID,
} from '../data';
import { equippedItems } from './character';
import type { Character } from './character';
import { nodeById } from '../skills-tree';
import type { Item, MonsterDef, RolledMod, SkillDef } from '../types';

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
  /** Damage type dealt when attacking without a skill. Monsters only. */
  damageType?: string;
  /** Percent reduction per damage type, already capped. Typeless is absent. */
  resistances: Record<string, number>;
  /** Percent reduction against HITS only, already capped. */
  armourReduction: number;
  /** Extra percent damage on a crit, on top of the base doubling. */
  critMultiplier: number;
  /**
   * Percent increase to the AREA of area effects, not the radius.
   *
   * Behaviours must not use this directly — `areaRadius` on SkillUse converts
   * it, because +100% area is a 1.41x radius, not 2x. Keeping the conversion
   * in one place is what stops two skills disagreeing about what the stat
   * means.
   */
  areaOfEffect: number;
  /** Gear-side reward stats. Added to whatever the crystal already grants. */
  rarity: number;
  currencyFind: number;
}

/**
 * Armour points to a flat percentage.
 *
 * Curved on POINTS, not on the size of the hit. Hit-size scaling made armour
 * impossible to state honestly — its worth changed with every attacker — but
 * a straight linear conversion has no good answer either: pick a small
 * divisor and three mods reach the cap, pick a large one and every mod feels
 * like nothing. This keeps each point useful and still prints as one number.
 */
export function armourReduction(armour: number): number {
  if (armour <= 0) return 0;
  const raw = (100 * armour) / (armour + DEFENCE.armourHalfPoint);
  return Math.min(DEFENCE.armourCap, raw);
}

/**
 * Resistance per type: its own, plus its group's, capped together.
 *
 * Typeless is deliberately missing from the result — nothing resists it.
 */
export function resistancesFrom(mods: RolledMod[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const type of DAMAGE_TYPES) {
    const own = computeStat(0, mods, `${type.id}Res`);
    const group = type.group ? computeStat(0, mods, `${type.group}Res`) : 0;
    out[type.id] = Math.min(DEFENCE.resistanceCap, own + group);
  }
  return out;
}

// Damage types now come from the DAMAGE_TYPES table in data.ts, so adding one
// makes it resolvable, resistable and displayable everywhere at once.

/**
 * Damage types are resolved separately and summed.
 *
 * This is what makes tagged mods work without special-casing: a stat line
 * applies only if all of ITS tags are in the context. So in the fire pass the
 * context is [...skillTags, 'fire'] — "+12 fire damage" (tags ['fire'])
 * applies, "increased Physical Damage" (tags ['physical']) does not, and an
 * untagged "+40% increased damage" applies to every pass because it has no
 * tags to satisfy.
 *
 * The skill's own tags ride along in every pass, which is how "increased
 * Melee Damage" finds a melee skill for free.
 */
export function skillDamage(
  mods: RolledMod[],
  base: number,
  skill: SkillDef,
  grants: Record<string, unknown> = {}
): number {
  let total = 0;

  // Conversion replaces the skill's type outright. It does NOT keep the old
  // type live: a Fireball dealing cold that still scaled off fire modifiers
  // would scale off both, which is not a choice, it is a free second stat.
  //
  // What stops that being a punishment is that conversion rewrites the TREE
  // (see treeMod) — every fire node you walked through to reach the node
  // becomes a cold node. The wedge you paid for keeps working; your gear is
  // what has to change.
  const converted = convertedType(skill, grants);
  const active = converted ? [converted] : skill.damageTypes;

  for (const type of DAMAGE_TYPES) {
    const typeBase = active.includes(type.id) ? base : 0;
    total += computeStat(typeBase, mods, 'damage', [...skill.tags, type.id]);
  }

  // Typeless carries no type tag, so only untagged lines — generic
  // "increased Damage" — can reach it. Nothing type-specific scales it, which
  // is the entire point of having it.
  if (skill.damageTypes.includes(TYPELESS)) {
    total += computeStat(base, mods, 'damage', [...skill.tags, TYPELESS]);
  }

  return total * skill.damageMultiplier;
}

/** Base life and weapon damage before gear, after levelling. */
function baseFor(level: number): { life: number; weaponDamage: number } {
  const steps = Math.max(0, level - 1);
  return {
    life: HERO_BASE.life + steps * LEVELLING.lifePerLevel,
    weaponDamage: HERO_BASE.weaponDamage + steps * LEVELLING.damagePerLevel,
  };
}

export function heroStats(
  mods: RolledMod[],
  level: number,
  skill: SkillDef,
  grants: Record<string, unknown> = {}
): CombatStats {
  const base = baseFor(level);
  const maxLife = computeStat(base.life, mods, 'life');

  return {
    maxLife,
    lifeRegen: computeStat((maxLife * HERO_BASE.lifeRegenPercent) / 100, mods, 'lifeRegen'),
    critMultiplier: computeStat(HERO_BASE.critMultiplier, mods, 'critMultiplier'),
    // Percentages with no base to scale — see percentStat.
    rarity: percentStat(mods, 'rarity'),
    currencyFind: percentStat(mods, 'currencyFind'),
    damage: skillDamage(mods, base.weaponDamage, skill, grants),
    // Spells scale with cast speed, attacks with attack speed. A spell has no
    // business getting faster because you found a sharper sword.
    attacksPerSecond:
      computeStat(
        HERO_BASE.attacksPerSecond,
        mods,
        skill.tags.includes('spell') ? 'castSpeed' : 'attackSpeed'
      ) * skill.rateMultiplier,
    critChance: computeStat(HERO_BASE.critChance, mods, 'critChance'),
    // Tagged by the skill, so a future "increased Area of Effect of Spells"
    // filters exactly like every other tagged line.
    areaOfEffect: percentStat(mods, 'areaOfEffect', skill.tags),
    moveSpeed: computeStat(HERO_BASE.moveSpeed, mods, 'moveSpeed'),
    armour: computeStat(HERO_BASE.armour, mods, 'armour'),
    armourReduction: armourReduction(computeStat(HERO_BASE.armour, mods, 'armour')),
    resistances: resistancesFrom(mods),
    attackRange: computeStat(skill.range, mods, 'attackRange'),
    aggroRange: HERO_BASE.aggroRange,
  };
}

/**
 * Everything the allocated tree nodes contribute, as one synthetic mod.
 *
 * Reusing RolledMod means node stats go through the exact same aggregation as
 * gear — tags, flat/increased/more, all of it — rather than being a second
 * parallel system that drifts.
 */
export function treeMod(character: Character): RolledMod | null {
  const progress = character.skills[character.skillId];
  if (!progress || progress.allocated.length === 0) return null;

  const skill = SKILL_BY_ID[character.skillId] ?? SKILLS[0];
  const grants = treeGrants(character);
  const converted = convertedType(skill, grants);

  const stats = progress.allocated
    .flatMap((id) => nodeById(character.skillId, id)?.stats ?? [])
    .map((s) => ({
      stat: s.stat,
      form: s.form,
      value: s.value,
      // Conversion retags the tree's own lines. A Frostfire build walked
      // through a wedge of "increased Fire Damage" to get there; those nodes
      // become cold nodes rather than dead weight, which is what lets a
      // conversion sit deep in a fire tree without invalidating the path.
      tags: (s.tags ?? []).map((t) =>
        converted && skill.damageTypes.includes(t) ? converted : t
      ),
    }));

  if (stats.length === 0) return null;
  return {
    entryId: 'tree',
    defId: 'tree',
    group: 'tree',
    slot: 'tree',
    name: 'Skill tree',
    tier: 1,
    tags: [],
    stats,
  };
}

/**
 * Grants that STACK rather than replace.
 *
 * Two nodes granting `pierce: 1` must mean two pierces; two nodes granting
 * `explodeRadius: 1.45` must mean 1.45 x 1.45. Plain assignment gets both
 * wrong in the same silent way — the second node does nothing and looks like
 * it worked — so the merge has to know which kind each key is.
 */
const SUMMED_GRANTS = new Set(['extraTargets', 'pierce', 'chains', 'explodeMultiplierAdd']);
const MULTIPLIED_GRANTS = new Set([
  'burnDuration',
  'burnMultiplier',
  'explodeRadius',
]);
/** Tag lists concatenate — Detonation adds Area without removing anything. */
const APPENDED_GRANTS = new Set(['addTags']);

/** Behaviour switches from every allocated node, merged. */
export function treeGrants(character: Character): Record<string, unknown> {
  const progress = character.skills[character.skillId];
  if (!progress) return {};

  const out: Record<string, unknown> = {};
  for (const id of progress.allocated) {
    for (const [key, value] of Object.entries(
      nodeById(character.skillId, id)?.grants ?? {}
    )) {
      if (SUMMED_GRANTS.has(key)) {
        out[key] = ((out[key] as number) ?? 0) + (value as number);
      } else if (MULTIPLIED_GRANTS.has(key)) {
        out[key] = ((out[key] as number) ?? 1) * (value as number);
      } else if (APPENDED_GRANTS.has(key)) {
        out[key] = [...((out[key] as string[]) ?? []), ...(value as string[])];
      } else {
        out[key] = value;
      }
    }
  }
  return out;
}

/** The type a skill ends up dealing, after any conversion node. */
export function convertedType(
  skill: SkillDef,
  grants: Record<string, unknown>
): string | null {
  return (grants.convertTree as string | undefined) ?? null;
}

/**
 * The skill as the tree has made it.
 *
 * Nodes can change a skill's damage type and its tags, and BOTH have to be
 * visible everywhere the skill is — the stat pass that decides which mods
 * apply, and the sim that decides which resistance a hit runs into. Deriving
 * it once, here, is what stops those two from disagreeing: for a while a
 * converted skill scaled off cold modifiers and was still resisted as fire.
 */
export function effectiveSkill(
  skill: SkillDef,
  grants: Record<string, unknown>
): SkillDef {
  const converted = convertedType(skill, grants);
  const added = (grants.addTags as string[] | undefined) ?? [];
  if (!converted && added.length === 0) return skill;

  return {
    ...skill,
    damageTypes: converted ? [converted] : skill.damageTypes,
    tags: added.length ? [...new Set([...skill.tags, ...added])] : skill.tags,
  };
}

/** Stats for a character, resolving its selected skill, gear and tree. */
export function characterStats(character: Character): CombatStats {
  const base = SKILL_BY_ID[character.skillId] ?? SKILLS[0];
  const grants = treeGrants(character);
  const skill = effectiveSkill(base, grants);
  const items = equippedItems(character);
  const extra = treeMod(character);
  // Implicits count exactly like rolled mods — the only difference is that
  // crafting can't reach them.
  const mods = [
    ...items.flatMap((i) => [...i.mods, ...i.implicits]),
    ...(extra ? [extra] : []),
  ];
  return heroStats(mods, character.level, skill, grants);
}

/**
 * Monsters read their stats off the CRYSTAL's mods — same aggregation, other
 * side of the design. The kind's multipliers apply on top, so crystal mods and
 * monster identity compose instead of competing.
 */
export function monsterStats(crystal: Item, tier: number, def: MonsterDef): CombatStats {
  const life = MONSTER_BASE.life * Math.pow(MONSTER_TIER_SCALE.life, tier - 1) * def.life;
  const damage =
    MONSTER_BASE.damage * Math.pow(MONSTER_TIER_SCALE.damage, tier - 1) * def.damage;

  // Crystal danger mods land here: armour blunts your hits, crit spikes
  // theirs, and fire changes what you're actually being killed by.
  const fire = percentStat(crystal.mods, 'monsterFire');

  return {
    maxLife: computeStat(life, crystal.mods, 'monsterLife'),
    damage: computeStat(damage, crystal.mods, 'monsterDamage') * (1 + fire / 100),
    attacksPerSecond: MONSTER_BASE.attacksPerSecond * def.attacksPerSecond,
    critChance: percentStat(crystal.mods, 'monsterCrit'),
    moveSpeed:
      computeStat(MONSTER_BASE.moveSpeed, crystal.mods, 'monsterMoveSpeed') * def.moveSpeed,
    armour: computeStat(0, crystal.mods, 'monsterArmour'),
    armourReduction: armourReduction(computeStat(0, crystal.mods, 'monsterArmour')),
    // Monsters carry no resistances yet — crystal mods that grant them are
    // the obvious next danger family.
    resistances: {},
    attackRange: MONSTER_BASE.attackRange * def.attackRange,
    aggroRange: MONSTER_BASE.aggroRange,
    lifeRegen: 0,
    critMultiplier: 0,
    // No monster has an area skill yet; when one does, this is where its
    // crystal mod would land.
    areaOfEffect: 0,
    rarity: 0,
    currencyFind: 0,
    /** What monsters on this map hurt you with. Shows in the results overlay. */
    damageType: fire > 0 ? 'fire' : 'physical',
  };
}

/** Pack layout off the crystal — the same bases simulateRun() used as a stub. */
export function mapDensity(crystal: Item): { packCount: number; packSize: number } {
  return {
    packCount: Math.max(1, Math.round(computeStat(10, crystal.mods, 'packCount'))),
    packSize: Math.max(1, Math.round(computeStat(5, crystal.mods, 'packSize'))),
  };
}
