/** Items into combat numbers. A subtle bug here poisons everything downstream. */
import { aggregate, computeStat, percentStat } from '../mods';
import {
  AILMENT,
  AILMENT_NAMES,
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
import { mergeGrants } from './grants';
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
  /** AREA, not radius. Behaviours must go through `areaRadius`, never this. */
  areaOfEffect: number;
  /** Gear-side reward stats. Added to whatever the crystal already grants. */
  rarity: number;
  currencyFind: number;
}

/**
 * Curved on POINTS rather than on the size of the hit, so it prints as one
 * honest number. A linear conversion has no good divisor.
 */
export function armourReduction(armour: number): number {
  if (armour <= 0) return 0;
  const raw = (100 * armour) / (armour + DEFENCE.armourHalfPoint);
  return Math.min(DEFENCE.armourCap, raw);
}

/** Own plus group, capped together. Typeless is absent: nothing resists it. */
export function resistancesFrom(mods: RolledMod[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const type of DAMAGE_TYPES) {
    const own = computeStat(0, mods, `${type.id}Res`);
    const group = type.group ? computeStat(0, mods, `${type.group}Res`) : 0;
    out[type.id] = Math.min(DEFENCE.resistanceCap, own + group);
  }
  return out;
}

/** One damage pass: what a single type contributed, and out of what. */
export interface DamagePart {
  type: string;
  base: number; // the skill's weapon damage, or zero for a type it does not deal
  flat: number;
  increased: number; // summed, unlike `more`
  more: number[]; // each compounds
  total: number; // this pass's share, after the skill's multiplier
}

/** A multiplier applied after the per-type pass, and what to call it. */
export interface DamageStep {
  label: string;
  value: number;
}

export interface DamageBreakdown {
  parts: DamagePart[];
  /** Every factor after the pass. A step missing here is a number that lies. */
  steps: DamageStep[];
  total: number;
  /** All of it lands as this: +5 Fire on a poison skill is five more POISON. */
  dealtAs: string;
}

/**
 * Damage types are resolved separately and summed. In the fire pass the context
 * is [...skillTags, 'fire'], so "+12 fire damage" applies, "increased Physical
 * Damage" does not, and an untagged line applies to every pass. The skill's own
 * tags ride along, which is how "increased Melee Damage" finds a melee skill.
 *
 * The parts are kept rather than accumulated: the sheet has to show where the
 * number came from, and working that out twice is two answers.
 */
export function damageBreakdown(
  mods: RolledMod[],
  base: number,
  skill: SkillDef,
  grants: Record<string, unknown> = {},
  after: DamageStep[] = []
): DamageBreakdown {
  // Conversion replaces the type outright and does NOT keep the old one live:
  // scaling off both is a free second stat, not a choice. What stops that being
  // a punishment is that it rewrites the TREE too — see treeMod.
  const converted = convertedType(skill, grants);
  const active = converted ? [converted] : skill.damageTypes;

  const passes = [...DAMAGE_TYPES.map((t) => t.id)];
  // Typeless carries no type tag, so only untagged lines can reach it.
  if (skill.damageTypes.includes(TYPELESS)) passes.push(TYPELESS);

  // What every pass gets regardless of type, so a zero pass is only reported
  // when something aimed AT that type is going to waste.
  const generic = aggregate(mods, 'damage', skill.tags);

  const steps: DamageStep[] = [
    ...(skill.damageMultiplier !== 1
      ? [{ label: 'skill', value: skill.damageMultiplier }]
      : []),
    ...after,
  ];
  const factor = steps.reduce((n, s) => n * s.value, 1);

  const parts: DamagePart[] = [];
  // Multiplied once at the end, as one accumulator would: doing it per part is
  // the same arithmetic in a different order, and that is a different last bit.
  let raw = 0;
  for (const type of passes) {
    const typeBase = type === TYPELESS || active.includes(type) ? base : 0;
    const tags = [...skill.tags, type];
    const buckets = aggregate(mods, 'damage', tags);
    const pass = computeStat(typeBase, mods, 'damage', tags);
    raw += pass;
    // "20% increased Fire Damage" doing nothing is the most confusing thing a
    // sheet can hide, so a pass it reached is shown even at zero.
    const aimed = buckets.inc !== generic.inc || buckets.more.length !== generic.more.length;
    if (pass === 0 && !aimed) continue;
    parts.push({
      type,
      base: typeBase,
      flat: buckets.flat,
      increased: buckets.inc,
      more: buckets.more,
      total: pass * factor,
    });
  }

  return {
    parts,
    steps,
    total: raw * factor,
    dealtAs: active[0] ?? skill.damageTypes[0] ?? 'physical',
  };
}

export function skillDamage(
  mods: RolledMod[],
  base: number,
  skill: SkillDef,
  grants: Record<string, unknown> = {}
): number {
  return damageBreakdown(mods, base, skill, grants).total;
}

/** How long an ailment this skill applies lasts. Read by the sim and the sheet. */
export function ailmentSeconds(skill: SkillDef, grants: Record<string, unknown>): number {
  const multiplier = typeof grants.ailmentDuration === 'number' ? grants.ailmentDuration : 1;
  return ((skill.params?.duration as number) ?? 10) * multiplier;
}

/** Everything the character sheet needs to explain one number. */
export interface DamageDetail {
  skill: SkillDef;
  breakdown: DamageBreakdown;
  /** Applications per second: casts for a spell, swings for an attack. */
  rate: number;
  /** Zero for a skill that hits. */
  seconds: number;
  maxStacks: number;
  /** What a single application is worth, after the tree's ailment scaling. */
  perApplication: number;
  /** Sustained on ONE target. An area skill is worth more against a pack. */
  perSecond: number;
}

export function damageDetail(character: Character): DamageDetail {
  const stats = characterStats(character);
  const grants = treeGrants(character);
  const skill = effectiveSkill(SKILL_BY_ID[character.skillId] ?? SKILLS[0], grants);

  const overTime = skill.behaviour === 'ailment_burst';
  const seconds = overTime ? ailmentSeconds(skill, grants) : 0;
  const scale = typeof grants.ailmentMultiplier === 'number' ? grants.ailmentMultiplier : 1;
  // A tree that trades poison damage for a wider cloud is a factor like any
  // other, and one applied where the workings cannot show it is a sheet whose
  // parts do not add up to its own total.
  const ailment: DamageStep[] =
    overTime && scale !== 1 ? [{ label: AILMENT_NAMES[skill.damageTypes[0]] ?? 'ailment', value: scale }] : [];

  const breakdown = damageBreakdown(
    statMods(character),
    baseFor(character.level).weaponDamage,
    skill,
    grants,
    ailment
  );
  const perApplication = breakdown.total;

  // A lasting skill stacks until the cap or until the oldest stack expires,
  // whichever comes first: casting faster than that buys nothing on ONE target.
  const stacks = overTime
    ? Math.min(AILMENT.maxStacks, stats.attacksPerSecond * seconds)
    : 0;

  return {
    skill,
    breakdown,
    rate: stats.attacksPerSecond,
    seconds,
    maxStacks: AILMENT.maxStacks,
    perApplication,
    perSecond: overTime
      ? (stacks * perApplication) / seconds
      : perApplication * stats.attacksPerSecond,
  };
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
  grants: Record<string, unknown> = {},
  baseArmour = 0
): CombatStats {
  const base = baseFor(level);
  const maxLife = computeStat(base.life, mods, 'life');
  // Worn ratings are the BASE armour computes from, not a flat mod, so
  // "Reinforced" scales the plate you wear rather than a number beside it.
  const armour = computeStat(HERO_BASE.armour + baseArmour, mods, 'armour');

  return {
    maxLife,
    lifeRegen: computeStat((maxLife * HERO_BASE.lifeRegenPercent) / 100, mods, 'lifeRegen'),
    critMultiplier: computeStat(HERO_BASE.critMultiplier, mods, 'critMultiplier'),
    // Percentages with no base to scale — see percentStat.
    rarity: percentStat(mods, 'rarity'),
    currencyFind: percentStat(mods, 'currencyFind'),
    damage: skillDamage(mods, base.weaponDamage, skill, grants),
    // A spell has no business getting faster because you found a sharper sword.
    attacksPerSecond:
      computeStat(
        HERO_BASE.attacksPerSecond,
        mods,
        skill.tags.includes('spell') ? 'castSpeed' : 'attackSpeed'
      ) * skill.rateMultiplier,
    critChance: computeStat(HERO_BASE.critChance, mods, 'critChance'),
    // Tagged by the skill, so "…of Spells" would filter like any other line.
    areaOfEffect: percentStat(mods, 'areaOfEffect', skill.tags),
    moveSpeed: computeStat(HERO_BASE.moveSpeed, mods, 'moveSpeed'),
    armour,
    armourReduction: armourReduction(armour),
    resistances: resistancesFrom(mods),
    attackRange: computeStat(skill.range, mods, 'attackRange'),
    aggroRange: HERO_BASE.aggroRange,
  };
}

/**
 * The allocated nodes as one synthetic mod, so they go through the same
 * aggregation as gear rather than a second parallel system that drifts.
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
      // Conversion retags the tree's own lines, so the fire wedge you walked
      // through to reach it becomes a cold wedge rather than dead weight.
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

/** Behaviour switches from every allocated node, merged. */
export function treeGrants(character: Character): Record<string, unknown> {
  const progress = character.skills[character.skillId];
  if (!progress) return {};

  const out: Record<string, unknown> = {};
  for (const id of progress.allocated) {
    const node = nodeById(character.skillId, id);
    // A choice node gives the option you picked, and nothing until you pick.
    const chosen = node?.choices?.find((c) => c.id === progress.choices?.[id]);
    const from = { ...(node?.grants ?? {}), ...(chosen?.grants ?? {}) };

    mergeGrants(out, from);
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
 * The skill as the tree has made it. Nodes change damage type and tags, and both
 * must be visible to the stat pass AND to the sim that picks a resistance —
 * derived once here so the two can never disagree.
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

/**
 * Every stat line acting on a character. Implicits count exactly like rolled
 * mods — the only difference is that crafting can't reach them.
 */
export function statMods(character: Character): RolledMod[] {
  const extra = treeMod(character);
  return [
    ...equippedItems(character).flatMap((i) => [...i.mods, ...i.implicits]),
    ...(extra ? [extra] : []),
  ];
}

/** Stats for a character, resolving its selected skill, gear and tree. */
export function characterStats(character: Character): CombatStats {
  const base = SKILL_BY_ID[character.skillId] ?? SKILLS[0];
  const grants = treeGrants(character);
  const skill = effectiveSkill(base, grants);
  const baseArmour = equippedItems(character).reduce((n, i) => n + (i.armour ?? 0), 0);
  return heroStats(statMods(character), character.level, skill, grants, baseArmour);
}

/**
 * Monsters read their stats off the CRYSTAL's mods, with the kind's multipliers
 * on top, so crystal mods and monster identity compose instead of competing.
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
