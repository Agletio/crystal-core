/** Items into combat numbers. A subtle bug here poisons everything downstream. */
import { aggregate, computeStat, percentStat } from '../mods';
import {
  AILMENT,
  AILMENT_NAMES,
  ATTRIBUTES,
  DAMAGE_TYPES,
  DEFENCE,
  DROP_GROUPS,
  HERO_BASE,
  LEVELLING,
  TYPELESS,
  MONSTER_BASE,
  SKILLS,
  findStat,
  monsterResStat,
  SKILL_BY_ID,
  SKILL_SLOTS,
  MAIN_SLOT,
  UNIQUE_BY_ID,
} from '../data';
import { attributeSteps, equippedItems, equippedSkill, mainSkillId } from './character';
import type { Character } from './character';
import { nodeById } from '../skills-tree';
import { tradeGrants } from '../trades';
import { critBuff, mergeGrants } from './grants';
import type { Item, MonsterDef, RolledMod, SkillDef } from '../types';

export interface CombatStats {
  maxLife: number;
  /** Total damage per hit, summed across damage types. */
  damage: number;
  /** The same damage kept apart by type. Summing before resistance would make
   * a cold ring on a fire spell resist as fire. What the sim delivers. */
  damageByType: Record<string, number>;
  attacksPerSecond: number;
  critChance: number;
  moveSpeed: number;
  armour: number;
  attackRange: number;
  aggroRange: number;
  /** Life restored per second. Monsters have none. */
  lifeRegen: number;
  /** The pool a skill is paid for out of, and what ONE use of this character's
   *  skill costs after the tree's multipliers. Monsters have neither. */
  maxMana: number;
  manaRegen: number;
  manaCost: number;
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
  base: number; // the skill's own damage, or zero for a type it does not deal
  flat: number; // from gear and the tree, BEFORE `added`
  added: number; // the skill's effectiveness, as a multiplier on `flat` alone
  increased: number; // summed, unlike `more`
  more: number[]; // each compounds
  total: number; // this pass's share, after every step
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
  /** What the skill's OWN damage lands as. Added types keep their own. */
  baseType: string;
  /** What lands, per type. Sums to `total`; this is what the sim delivers. */
  byType: Record<string, number>;
}

/** The skill's own damage at a level. Nothing worn is in here. */
export function skillBase(skill: SkillDef, level: number): number {
  const steps = Math.max(0, level - 1);
  return skill.baseDamage * (1 + (steps * LEVELLING.damagePerLevel) / 100);
}

/**
 * Damage types are resolved separately and STAY separate. In the fire pass the
 * context is [...skillTags, 'fire'], so "+12 fire damage" applies and
 * "increased Physical Damage" does not; an untagged line reaches every pass,
 * and the skill's own tags ride along. `damageTypes` types its OWN damage.
 */
export function damageBreakdown(
  mods: RolledMod[],
  level: number,
  skill: SkillDef,
  grants: Record<string, unknown> = {},
  after: DamageStep[] = []
): DamageBreakdown {
  // Conversion moves the skill's own damage and does NOT keep the old type
  // live: scaling off both is a free second stat. It rewrites the TREE too, so
  // the wedge you walked through is not stranded — see treeMod.
  const converted = convertedType(skill, grants);
  const active = converted ? [converted] : skill.damageTypes;
  const base = skillBase(skill, level);
  const added = skill.addedEffectiveness / 100;

  const passes = [...DAMAGE_TYPES.map((t) => t.id)];
  // Typeless carries no type tag, so only untagged lines can reach it.
  if (skill.damageTypes.includes(TYPELESS)) passes.push(TYPELESS);

  // What every pass gets regardless of type: a zero pass is only worth reporting
  // when something aimed AT that type is going to waste.
  const generic = aggregate(mods, 'damage', skill.tags);

  const steps = [...after];
  const factor = steps.reduce((n, s) => n * s.value, 1);

  const parts: DamagePart[] = [];
  const byType: Record<string, number> = {};
  // Multiplied once at the end: per part is a different order, so a different bit.
  let raw = 0;
  for (const type of passes) {
    const typeBase = type === TYPELESS || active.includes(type) ? base : 0;
    const b = aggregate(mods, 'damage', [...skill.tags, type]);
    // Effectiveness weighs the ADDED half only, so a skill that takes half your
    // flat damage still gets full value from your increases.
    let pass = (typeBase + b.flat * added) * (1 + b.inc / 100);
    for (const m of b.more) pass *= 1 + m / 100;
    raw += pass;
    // "20% increased Fire Damage" doing nothing is the worst thing to hide.
    const aimed = b.inc !== generic.inc || b.more.length !== generic.more.length;
    if (pass !== 0) byType[type] = pass * factor;
    if (pass === 0 && !aimed) continue;
    parts.push({
      type,
      base: typeBase,
      flat: b.flat,
      added,
      increased: b.inc,
      more: b.more,
      total: pass * factor,
    });
  }

  return {
    parts,
    steps,
    total: raw * factor,
    baseType: active[0] ?? skill.damageTypes[0] ?? 'physical',
    byType,
  };
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
  const skill = effectiveSkill(SKILL_BY_ID[mainSkillId(character)] ?? SKILLS[0], grants);

  const overTime = skill.behaviour === 'ailment_burst';
  const seconds = overTime ? ailmentSeconds(skill, grants) : 0;
  const scale = typeof grants.ailmentMultiplier === 'number' ? grants.ailmentMultiplier : 1;
  // A factor applied where the workings cannot show it is a sheet whose parts
  // do not add up to its own total.
  const ailment: DamageStep[] =
    overTime && scale !== 1 ? [{ label: AILMENT_NAMES[skill.damageTypes[0]] ?? 'ailment', value: scale }] : [];

  const breakdown = damageBreakdown(statMods(character), character.level, skill, grants, ailment);
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

/** Base life before gear, after levelling. Damage is per skill — see skillBase. */
const lifeFor = (level: number): number =>
  HERO_BASE.life + Math.max(0, level - 1) * LEVELLING.lifePerLevel;

export function heroStats(
  mods: RolledMod[],
  level: number,
  skill: SkillDef,
  grants: Record<string, unknown> = {},
  baseArmour = 0
): CombatStats {
  const breakdown = damageBreakdown(mods, level, skill, grants);
  const maxLife = computeStat(lifeFor(level), mods, 'life');
  // Worn ratings are the BASE armour computes from, not a flat mod, so
  // "Reinforced" scales the plate you wear rather than a number beside it.
  const armour = computeStat(HERO_BASE.armour + baseArmour, mods, 'armour');

  // The Aethermancer's one road to mana that nothing else offers: it lands on
  // the BASE, so Intelligence and a ring of the Well scale it like any other.
  const vein = typeof grants.poolFromLife === 'number' ? grants.poolFromLife : 0;
  const maxMana = computeStat(HERO_BASE.mana + maxLife * vein, mods, 'mana');

  return {
    maxLife,
    lifeRegen: computeStat((maxLife * HERO_BASE.lifeRegenPercent) / 100, mods, 'lifeRegen'),
    maxMana,
    manaRegen: computeStat((maxMana * HERO_BASE.manaRegenPercent) / 100, mods, 'manaRegen'),
    // The tree's multipliers land LAST, on top of whatever gear did.
    manaCost: Math.max(
      0,
      computeStat(skill.manaCost, mods, 'manaCost') *
        ((grants.manaMultiplier as number) ?? 1)
    ),
    // The passive's half of its own trade: no extra damage on a crit at all.
    critMultiplier: critBuff(grants)
      ? 0
      : computeStat(HERO_BASE.critMultiplier, mods, 'critMultiplier'),
    // Percentages with no base to scale — see percentStat.
    rarity: percentStat(mods, 'rarity'),
    currencyFind: percentStat(mods, 'currencyFind'),
    damage: breakdown.total,
    damageByType: breakdown.byType,
    // A spell has no business getting faster because you found a sharper sword.
    attacksPerSecond:
      computeStat(
        HERO_BASE.attacksPerSecond,
        mods,
        skill.tags.includes('spell') ? 'castSpeed' : 'attackSpeed'
      ) * skill.rateMultiplier,
    // Tagged, so an ATTACK critical chance does nothing for a spell.
    critChance: computeStat(HERO_BASE.critChance, mods, 'critChance', skill.tags),
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
  const skillId = mainSkillId(character);
  const progress = character.skills[skillId];
  if (!progress || progress.allocated.length === 0) return null;

  const skill = SKILL_BY_ID[mainSkillId(character)] ?? SKILLS[0];
  const grants = treeGrants(character);
  const converted = convertedType(skill, grants);

  const stats = progress.allocated
    .flatMap((id) => nodeById(skillId, id)?.stats ?? [])
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

/** Everything spent on attributes as ONE synthetic mod, the way the tree
 *  arrives. Whole steps only: a part-step is banked and pays nothing. */
export function attributeMod(character: Character): RolledMod | null {
  const stats = ATTRIBUTES.flatMap((attr) => {
    const steps = attributeSteps(character, attr.id);
    return steps > 0 ? attr.per.map((s) => ({ ...s, value: s.value * steps })) : [];
  });

  if (stats.length === 0) return null;
  return {
    entryId: 'attributes',
    defId: 'attributes',
    group: 'attributes',
    slot: 'attributes',
    name: 'Attributes',
    tier: 1,
    tags: [],
    stats,
  };
}

/** Every switch the sim is holding: the skill's tree, the TRADE, then what is
 *  WORN — gear merges last, so a unique bought with a downside wins a tie. */
export function treeGrants(character: Character): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const progress = character.skills[mainSkillId(character)];

  for (const id of progress?.allocated ?? []) {
    const node = nodeById(mainSkillId(character), id);
    // A choice node gives the option you picked, and nothing until you pick.
    const chosen = node?.choices?.find((c) => c.id === progress?.choices?.[id]);
    mergeGrants(out, { ...(node?.grants ?? {}), ...(chosen?.grants ?? {}) });
  }
  // A third SOURCE, not a third concept: a trade node is declared in the same
  // table and merged by the same rules as a tree node and a unique.
  mergeGrants(out, tradeGrants(character.trade, character.tradeAllocated ?? []));
  for (const worn of equippedItems(character)) {
    const def = UNIQUE_BY_ID[String(worn.meta.unique)];
    if (def?.grants) mergeGrants(out, def.grants);
  }
  // The other two slots. A passive never casts and has no delivery of its own:
  // its `grants` ARE the skill, and they land on the one that swings.
  for (const slot of SKILL_SLOTS) {
    if (slot.id === MAIN_SLOT) continue;
    const held = SKILL_BY_ID[equippedSkill(character, slot.id) ?? ''];
    if (held?.grants) mergeGrants(out, held.grants);
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
  const extra = [treeMod(character), attributeMod(character)];
  return [
    ...equippedItems(character).flatMap((i) => [...i.mods, ...i.implicits]),
    ...extra.filter((m): m is RolledMod => m !== null),
  ];
}

/** Stats for a character, resolving its selected skill, gear and tree. */
export function characterStats(character: Character): CombatStats {
  const base = SKILL_BY_ID[mainSkillId(character)] ?? SKILLS[0];
  const grants = treeGrants(character);
  const skill = effectiveSkill(base, grants);
  const baseArmour = equippedItems(character).reduce((n, i) => n + (i.armour ?? 0), 0);
  return heroStats(statMods(character), character.level, skill, grants, baseArmour);
}

/**
 * Monsters read their stats off the SOCKETED SET's merged mods, with the kind's
 * multipliers on top, so danger and monster identity compose instead of
 * competing. Nothing else makes a monster stronger: socket count is length.
 */
export function monsterStats(mods: RolledMod[], def: MonsterDef): CombatStats {
  const life = MONSTER_BASE.life * def.life;
  const damage = MONSTER_BASE.damage * def.damage;

  // Socketed danger mods land here: armour blunts your hits, crit spikes
  // theirs, and fire changes what you're actually being killed by.
  const fire = percentStat(mods, 'monsterFire');
  const dealt = computeStat(damage, mods, 'monsterDamage') * (1 + fire / 100);
  const type = fire > 0 ? 'fire' : 'physical';

  // Nothing resists anything until a ward says so, and a ward is ONE type — a
  // reason to carry a second damage type rather than a wall.
  const resistances: Record<string, number> = {};
  for (const t of DAMAGE_TYPES) {
    const ward = percentStat(mods, monsterResStat(t.id));
    resistances[t.id] = Math.min(DEFENCE.resistanceCap, ward);
  }
  // Held back to whatever the wards left room for: the two multiply, and both
  // at their caps is a map that eats nine tenths of every hit.
  const armour = computeStat(0, mods, 'monsterArmour');
  const hardest = Math.max(0, ...Object.values(resistances)) / 100;
  const room = 1 - DEFENCE.monsterHitFloor / Math.max(0.01, 1 - hardest);
  const blunted = Math.max(0, Math.min(armourReduction(armour), room * 100));

  return {
    maxLife: computeStat(life, mods, 'monsterLife'),
    damage: dealt,
    // One type, so the same delivery the hero uses reduces to a single pass.
    damageByType: { [type]: dealt },
    attacksPerSecond: MONSTER_BASE.attacksPerSecond * def.attacksPerSecond,
    critChance: percentStat(mods, 'monsterCrit'),
    moveSpeed: computeStat(MONSTER_BASE.moveSpeed, mods, 'monsterMoveSpeed') * def.moveSpeed,
    armour,
    armourReduction: blunted,
    resistances,
    attackRange: MONSTER_BASE.attackRange * def.attackRange,
    aggroRange: MONSTER_BASE.aggroRange,
    lifeRegen: 0,
    maxMana: 0,
    manaRegen: 0,
    manaCost: 0,
    critMultiplier: 0,
    // No monster has an area skill yet; its crystal mod would land here.
    areaOfEffect: 0,
    rarity: 0,
    currencyFind: 0,
    /** What monsters on this map hurt you with. Shows in the results overlay. */
    damageType: type,
  };
}

/** Pack layout off the socketed set. */
export function mapDensity(mods: RolledMod[]): { packCount: number; packSize: number } {
  return {
    packCount: Math.max(1, Math.round(computeStat(10, mods, 'packCount'))),
    packSize: Math.max(1, Math.round(computeStat(5, mods, 'packSize'))),
  };
}

/** A preference: it moves WHICH piece drops, never how many or how good. */
export type DropBias = Record<string, number>;

export function dropBias(mods: RolledMod[]): DropBias {
  const out: DropBias = {};
  for (const group of DROP_GROUPS) out[group.id] = computeStat(1, mods, findStat(group.id));
  return out;
}
