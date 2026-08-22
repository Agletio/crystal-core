/** Items into combat numbers. A subtle bug here poisons everything downstream. */
import { aggregate, computeStat, dangerScore, percentStat } from '../mods';
import {
  AILMENT,
  AILMENTS,
  AILMENT_BY_ID,
  AILMENT_NAMES,
  AILMENT_OF_TYPE,
  ATTRIBUTES,
  DAMAGE_TYPES,
  ADDED_DAMAGE_TYPES,
  DANGER,
  dangerStep,
  DEFENCE,
  DROP_GROUPS,
  HERO_BASE,
  LEVELLING,
  TYPELESS,
  MONSTER_BASE,
  SKILLS,
  findStat,
  monsterAddedStat,
  monsterResStat,
  SKILL_BY_ID,
  SKILL_SLOTS,
  MAIN_SLOT,
  MOD_BY_ID,
  GEAR_BASE_BY_ID,
  WEAPON_SPECIALITY,
  WEAPON_SLOT,
  OFF_SLOT,
  DUAL,
  UNIQUE_BY_ID,
  CHALLENGE,
  LADDER,
  LADDER_RUNGS,
  rungsBelow,
} from '../data';
import { attributeSteps, equippedItems, equippedSkill, mainSkillId } from './character';
import type { Character } from './character';
import { nodeById } from '../skills-tree';
import { tradeGrants } from '../trades';
import { trialNodeById } from '../trials';
import { critBuff, mergeGrants } from './grants';
import { isTwoHanded } from '../economy';
import { isChallenge } from '../ladder';
import type { Item, MonsterAbilityDef, MonsterDef, RolledMod, SkillDef, StatRoll } from '../types';

export interface CombatStats {
  maxLife: number;
  /** Total damage per hit, summed across damage types. */
  damage: number;
  /** The same damage kept apart by type. Summing before resistance would make
   * a cold ring on a fire spell resist as fire. What the sim delivers. */
  damageByType: Record<string, number>;
  attacksPerSecond: number;
  /** Each hand's SHARE of `attacksPerSecond`, in hand order, when a pair is
   *  held: the sim swings alternately between them. Empty otherwise. */
  handRates: number[];
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
  dodgeChance: number; // a HIT stopped outright, like a Block; armour traded for it
  /** Percent chance a HIT is turned aside outright, already capped. */
  blockChance: number;
  /** Extra percent damage on a crit, on top of the base doubling. */
  critMultiplier: number;
  /** AREA, not radius. Behaviours must go through `areaRadius`, never this. */
  areaOfEffect: number;
  /** Gear-side reward stats. Added to whatever the crystal already grants. */
  rarity: number;
  currencyFind: number;
  ailmentDps: Record<string, number>; // per id, at ONE stack, under its OWN tags
  ailmentChance: Record<string, number>; // per id, percent per hit; over 100 stacks
}

/** Curved on POINTS rather than on the size of the hit, so it prints as one
 *  honest number. A linear conversion has no good divisor. */
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

/** An ailment's damage a second at one stack, under ITS tags — the whole of why
 *  Spell, Attack and Critical never scale a Burn. */
export function ailmentDamage(mods: RolledMod[], skill?: SkillDef): Record<string, number> {
  const out: Record<string, number> = {};
  for (const def of AILMENTS) {
    if (!def.dps) continue;
    // Applied BY a skill rather than by a type, so its tags reach it too.
    const tags = [...(def.tags ?? []), ...(def.bySource ? skill?.tags ?? [] : [])];
    out[def.id] = computeStat(def.dps, mods, 'damage', tags);
  }
  return out;
}

/** Tagged by damage TYPE, so a line aimed at Fire raises the Burn alone. */
export function ailmentChances(mods: RolledMod[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const def of AILMENTS) {
    out[def.id] = def.chance + percentStat(mods, 'ailmentChance', [def.type, def.id]);
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

  // A CONVERSION moves a share of one type into another at the FLAT stage, so
  // the moved half scales as the new type and the rest does not.
  const moved: Record<string, number> = {};
  if (skill.convert) {
    const { from, share } = skill.convert;
    const to = converted ?? skill.convert.to;
    const had = aggregate(mods, 'damage', [...skill.tags, from]).flat * share;
    moved[from] = (moved[from] ?? 0) - had;
    moved[to] = (moved[to] ?? 0) + had;
  }

  const parts: DamagePart[] = [];
  const byType: Record<string, number> = {};
  // Multiplied once at the end: per part is a different order, so a different bit.
  let raw = 0;
  for (const type of passes) {
    const typeBase = type === TYPELESS || active.includes(type) ? base : 0;
    const raw_ = aggregate(mods, 'damage', [...skill.tags, type]);
    const b = { ...raw_, flat: raw_.flat + (moved[type] ?? 0) };
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

/** What a PASSIVE's own damage scales by: increases and mores to Damage that
 *  are untagged or name this TYPE. Never the skill's tags, never flat. */
export function passiveScale(mods: RolledMod[], type: string): number {
  const b = aggregate(mods, 'damage', [type]);
  let m = 1 + b.inc / 100;
  for (const more of b.more) m *= 1 + more / 100;
  return m;
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
    overTime && scale !== 1
      ? [{ label: AILMENT_NAMES[skill.damageTypes[0]] ?? 'Ailment', value: scale }]
      : [];

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
  baseArmour = 0,
  /** What the WEAPON swings at before anything worn scales it; a bare hand is
   *  the hero's own, which is what a harness holding nothing measures. */
  rate = HERO_BASE.attacksPerSecond,
  /** Each hand's own base rate; `rate` above is already their even mean. */
  hands: number[] = [],
  /** What is in your hands. `one` for a harness holding nothing, which is what
   *  every measurement is compared across. */
  grip: Grip = 'one',
  /** Whether a PAIR is two of one family. Only the rogue's web reads it. */
  matched = false
): CombatStats {
  // BOTH HANDS, as a STEP in the workings: the sheet must add up.
  const bothHands = grip === 'both' ? ((grants.twoHandMore as number) ?? 1) : 1;
  // AND A PAIR, which is the other arrangement and the other trade's. Both are
  // STEPS in the workings, so the sheet still adds up to its own total.
  const steps: DamageStep[] = [];
  if (bothHands !== 1) steps.push({ label: 'Both Hands', value: bothHands });
  if (grip === 'pair') {
    const pair = (grants.pairMore as number) ?? 1;
    if (pair !== 1) steps.push({ label: 'Two Weapons', value: pair });
    const suited = (grants[matched ? 'matchedPair' : 'oddPair'] as number) ?? 0;
    if (suited > 0) {
      steps.push({ label: matched ? 'A Matched Pair' : 'An Odd Pair', value: 1 + suited / 100 });
    }
  }
  const breakdown = damageBreakdown(mods, level, skill, grants, steps);
  // Bare to the rock. `characterStats` is what stops counting the rating.
  const bare = typeof grants.bareChest === 'number' ? grants.bareChest : 0;
  const maxLife = computeStat(lifeFor(level), mods, 'life') * (1 + bare);
  // Worn ratings are the BASE armour computes from, not a flat mod, so
  // "Reinforced" scales the plate you wear rather than a number beside it.
  const armour = computeStat(HERO_BASE.armour + baseArmour, mods, 'armour');

  // The Aethermancer's one road to mana: it lands on the BASE, so Intelligence
  // and a ring of the Well scale it like any other. A passive ZEROES it and
  // pays in life instead, which makes every mana line on your gear dead weight
  // — the same shape of choice armour makes below, blunting or dodging.
  const vein = typeof grants.poolFromLife === 'number' ? grants.poolFromLife : 0;
  const maxMana = grants.bloodCost ? 0 : computeStat(HERO_BASE.mana + maxLife * vein, mods, 'mana');
  const shed = typeof grants.armourToDodge === 'number' ? grants.armourToDodge : 0;
  const blunted = armourReduction(armour);

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
    ailmentDps: ailmentDamage(mods, skill),
    ailmentChance: ailmentChances(mods),
    damage: breakdown.total,
    damageByType: breakdown.byType,
    // A spell has no business getting faster for a sharper sword, so it keeps
    // the hero's own rate; an ATTACK swings at the WEAPON's.
    attacksPerSecond:
      computeStat(
        skill.tags.includes('spell') ? HERO_BASE.attacksPerSecond : rate,
        mods,
        skill.tags.includes('spell') ? 'castSpeed' : 'attackSpeed'
      ) *
      skill.rateMultiplier *
      (grip === 'both' ? 1 + ((grants.twoHandRate as number) ?? 0) / 100 : 1) *
      (grip === 'pair' ? 1 + ((grants.pairRate as number) ?? 0) / 100 : 1),
    // Every increase is multiplicative, so the mean scaled by a hand's share of
    // it is the number that hand's own base would have given.
    handRates:
      hands.length > 1 && !skill.tags.includes('spell')
        ? hands.map((r) => r / Math.max(0.01, rate))
        : [],
    // Tagged, so an ATTACK critical chance does nothing for a spell.
    critChance:
      computeStat(HERO_BASE.critChance, mods, 'critChance', skill.tags) +
      (grip === 'pair' ? ((grants.pairCrit as number) ?? 0) : 0),
    // Tagged by the skill, so "…of Spells" would filter like any other line.
    areaOfEffect: percentStat(mods, 'areaOfEffect', skill.tags),
    moveSpeed: computeStat(HERO_BASE.moveSpeed, mods, 'moveSpeed'),
    armour,
    armourReduction: shed > 0 ? 0 : blunted,
    dodgeChance: shed > 0 ? Math.min(DEFENCE.dodgeCap, blunted * shed) : 0,
    blockChance: Math.min(DEFENCE.blockCap, percentStat(mods, 'blockChance')), // a shield, and nothing else
    resistances: resistancesFrom(mods),
    attackRange: computeStat(skill.range, mods, 'attackRange'),
    aggroRange: HERO_BASE.aggroRange,
  };
}

/**
 * The allocated nodes as one synthetic mod, so they go through the same
 * aggregation as gear rather than a second parallel system that drifts.
 */
/** One tag under a conversion: a damage type becomes the converted type, and
 *  the AILMENT of a type becomes that type's ailment — which is what keeps
 *  "+18% chance to Burn" worth its point on a Fireball turned cold. */
export function retag(tag: string, skill: SkillDef, converted: string | null): string {
  if (!converted) return tag;
  if (skill.damageTypes.includes(tag)) return converted;
  const was = AILMENT_BY_ID[tag];
  if (was && skill.damageTypes.includes(was.type)) return AILMENT_OF_TYPE[converted]?.id ?? tag;
  return tag;
}

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
      // through to reach it becomes a cold wedge rather than dead weight —
      // AILMENT tags included, or a tree of Burn chance survives a conversion
      // to cold as a tree of chance to apply something you no longer deal.
      tags: (s.tags ?? []).map((t) => retag(t, skill, converted)),
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

/** The trials web as one synthetic mod, bound for `RunSet.mods` rather than for
 *  `statMods`: every line on it is monster-facing, so it goes where a crystal's
 *  modifiers go and is weighed for danger by the same `crystalRewards`. */
export function trialMod(character: Character): RolledMod | null {
  const stats = (character.trialAllocated ?? []).flatMap((id) => {
    const node = trialNodeById(id);
    const taken = node?.choices?.find((c) => c.id === character.trialChoices?.[id]);
    return [...(node?.stats ?? []), ...(taken?.stats ?? [])];
  });
  if (stats.length === 0) return null;
  return {
    entryId: 'trials',
    defId: 'trials',
    group: 'trials',
    slot: 'trials',
    name: 'Trials',
    tier: 1,
    tags: [],
    stats: stats.map((s) => ({ ...s, tags: s.tags ?? [] })),
  };
}

/** A RUNG as ONE synthetic mod, beside `trialMod` and `treeMod` — the whole of
 *  where difficulty comes from before anything is socketed. It rides the
 *  crystal seam on purpose: `crystalRewards` scores these like any other stats,
 *  so a harder rung pays more and drops better with nothing written twice. */
/** THE SPIKE, as its own mod beside `rungMod` — separate so a readout can name
 *  it and so what a challenge floor costs is one table nobody has to hunt for.
 *  Null on every ordinary rung, which is most of them. */
export function challengeMod(zone: number, rung: number): RolledMod | null {
  if (!isChallenge(zone, rung)) return null;
  return {
    entryId: 'challenge',
    defId: 'challenge',
    group: 'rung',
    slot: 'rung',
    name: 'A challenge floor',
    tier: 1,
    tags: [],
    stats: (
      [['monsterRank', CHALLENGE.rank], ['packSize', CHALLENGE.packSize],
       ['monsterLife', CHALLENGE.life], ['monsterDamage', CHALLENGE.damage]] as const
    ).map(([stat, value]) => ({ stat, form: 'inc' as const, value, tags: [] })),
  };
}

export function rungMod(zone: number, rung: number): RolledMod | null {
  if (rung <= 0) return null;
  const at = LADDER_RUNGS > 1 ? rungsBelow(zone, rung) / (LADDER_RUNGS - 1) : 0;
  const up = Math.pow(at, LADDER.curve);
  const stats: RolledMod['stats'] = (
    [
      ['monsterLife', LADDER.lifeAtTop],
      ['monsterDamage', LADDER.damageAtTop],
      ['packSize', LADDER.packAtTop],
    ] as const
  )
    .map(([stat, top]) => ({ stat, form: 'inc' as const, value: Math.round(top * up), tags: [] }))
    .filter((line) => line.value > 0);
  if (stats.length === 0) return null;
  return {
    entryId: 'rung',
    defId: 'rung',
    group: 'rung',
    slot: 'rung',
    name: 'The climb',
    tier: 1,
    tags: [],
    stats,
  };
}

/** Everything spent on attributes as ONE synthetic mod, the way the tree
 *  arrives. Whole steps only: a part-step is banked and pays nothing. */
/** What a bag of attribute POINTS buys, as one synthetic mod. Points arrive by
 *  two roads — spent on a level, or rolled on a ring — and this is the only
 *  place either turns into stats. An attribute never grants an attribute. */
export function attributePointsMod(points: Record<string, number>): RolledMod | null {
  const stats = ATTRIBUTES.flatMap((attr) => {
    const steps = points[attr.id] ?? 0;
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

/** What WORN mods are worth in attributes, for gear measured with no character. */
export function wornAttributeMod(mods: RolledMod[]): RolledMod | null {
  return attributePointsMod(
    Object.fromEntries(ATTRIBUTES.map((a) => [a.id, aggregate(mods, a.id).flat]))
  );
}

export function attributeMod(character: Character): RolledMod | null {
  const worn = equippedItems(character).flatMap((i) => [...i.mods, ...i.implicits]);
  return attributePointsMod(
    Object.fromEntries(
      ATTRIBUTES.map((a) => [a.id, attributeSteps(character, a.id) + aggregate(worn, a.id).flat])
    )
  );
}

/** What ONE skill's own web has been walked to, whichever slot it is in. */
function walked(character: Character, skillId: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const progress = character.skills?.[skillId];
  for (const id of progress?.allocated ?? []) {
    const node = nodeById(skillId, id);
    const chosen = node?.choices?.find((c) => c.id === progress?.choices?.[id]);
    mergeGrants(out, { ...(node?.grants ?? {}), ...(chosen?.grants ?? {}) });
  }
  return out;
}

/** Every switch the sim is holding: the skill's tree, the TRADE, then what is
 *  WORN — gear merges last, so a unique bought with a downside wins a tie. */
export function treeGrants(character: Character): Record<string, unknown> {
  const out: Record<string, unknown> = { ...walked(character, mainSkillId(character)) };
  // A third SOURCE, not a third concept: a trade node is declared in the same
  // table and merged by the same rules as a tree node and a unique.
  mergeGrants(out, tradeGrants(character.trade, character.tradeAllocated ?? []));
  for (const worn of equippedItems(character)) {
    const def = UNIQUE_BY_ID[String(worn.meta.unique)];
    if (def?.grants) mergeGrants(out, def.grants);
    // A LINE may grant too, by the same path a unique's does. A grafted
    // implicit is the only thing that writes one.
    for (const line of [...worn.mods, ...worn.implicits]) {
      const mod = MOD_BY_ID[line.defId]?.grants;
      if (mod) mergeGrants(out, mod);
    }
  }
  // The other two slots, BOTH halves each: the skill's own static `grants` —
  // a passive never casts, so those ARE the skill — and its own web. Without
  // the second, every node of a mover's web does nothing at all, silently.
  for (const slot of SKILL_SLOTS) {
    if (slot.id === MAIN_SLOT) continue;
    const id = equippedSkill(character, slot.id);
    const held = SKILL_BY_ID[id ?? ''];
    if (held?.grants) mergeGrants(out, held.grants);
    if (id) mergeGrants(out, walked(character, id));
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
/** BOTH HANDS, as one flat line an ATTACK reads. LOCAL: a bow of 100 with 100%
 *  increased Physical ON IT is a bow of 200; the same line on a ring scales YOU.
 *  A PAIR puts `DUAL.main` of one and `DUAL.off` of the other into every hit. */
export function weaponMod(
  character: Character,
  grants: Record<string, unknown> = {}
): RolledMod | null {
  const held = character.equipment?.[WEAPON_SLOT];
  const pair = offWeapon(character);
  if (!held && !pair) return null;
  // The one trade that holds two can buy the off hand a bigger share of the
  // hit. `DUAL.off` is what everybody else's would be, if they could.
  const off = DUAL.off + Math.max(0, (grants.offHandShare as number) ?? 0);
  const swing = held && pair
    ? weaponSwing(held) * DUAL.main + weaponSwing(pair) * off
    : weaponSwing(held ?? pair!);
  if (swing <= 0) return null;

  return {
    entryId: 'weapon',
    defId: 'weapon',
    group: 'weapon',
    slot: 'weapon',
    name: 'Weapon',
    tier: 1,
    tags: [],
    // Tagged ATTACK too, or the sword in your hand would arm a spell.
    stats: [{ stat: 'damage', form: 'flat', value: swing, tags: ['physical', 'attack'] }],
  };
}

/** What ONE weapon swings for: its base scaled by the increases rolled ON it,
 *  untagged or naming Physical. A typed maul's flat fire and a dagger's crit
 *  are global and not in here. The card and the sim both ask this. */
export function weaponSwing(held: Item): number {
  // The ITEM's own, so a PERFECT one swings for more than its table row says.
  const base = held.damage ?? GEAR_BASE_BY_ID[held.base]?.damage ?? 0;
  if (base <= 0) return 0;
  const own = aggregate([...held.mods, ...held.implicits], 'damage', ['physical']);
  let swing = base * (1 + own.inc / 100);
  for (const m of own.more) swing *= 1 + m / 100;
  return swing;
}

/** WHAT IS IN YOUR HANDS, as one word. The warrior's trade turns on it and
 *  nothing else asks, so it is derived rather than stored. */
export type Grip = 'shield' | 'both' | 'pair' | 'one';

export function gripOf(character: Character): Grip {
  const main = character.equipment?.[WEAPON_SLOT];
  const off = character.equipment?.[OFF_SLOT];
  if (main && isTwoHanded(main)) return 'both';
  if (off && offWeapon(character)) return 'pair';
  if (off) return 'shield';
  return 'one';
}

/** The off hand's WEAPON, or null: it also takes a shield, which is not one. */
export function offWeapon(character: Character): Item | null {
  const held = character.equipment?.[OFF_SLOT];
  return held && GEAR_BASE_BY_ID[held.base]?.kind === 'weapon' ? held : null;
}

/** THE RATES a character swings at, in hand order — one entry with a hand free. */
export function weaponRates(character: Character): number[] {
  const main = character.equipment?.[WEAPON_SLOT];
  const off = offWeapon(character);
  if (main && off) return [weaponRate(main), weaponRate(off)];
  return [weaponRate(main ?? off)];
}

/** Two swings take `1/a + 1/b` seconds, so this is the rate, never the mean. */
export const evenRate = (rates: number[]): number =>
  rates.length / rates.reduce((n, r) => n + 1 / Math.max(0.01, r), 0);

/** How often ONE weapon swings: its own base scaled by the increases rolled ON
 *  it. The mirror of `weaponSwing`, and why a dagger is fast and a maul is not. */
export function weaponRate(held: Item | null | undefined): number {
  const base = held ? GEAR_BASE_BY_ID[held.base]?.attackSpeed : undefined;
  if (!held || !base) return HERO_BASE.attacksPerSecond; // a bare hand is the hero's own
  const own = aggregate([...held.mods, ...held.implicits], 'attackSpeed', []);
  let rate = base * (1 + own.inc / 100);
  for (const m of own.more) rate *= 1 + m / 100;
  return rate;
}

/** True for a line the WEAPON keeps to itself, so nothing counts it twice: an
 *  untagged increase to its damage or its rate scales the base it is rolled on
 *  and nothing else. */
const isLocal = (line: StatRoll): boolean =>
  (line.stat === 'damage'
    && line.form !== 'flat'
    && line.tags.every((t: string) => t === 'physical'))
  || (line.stat === 'attackSpeed' && line.form !== 'flat' && line.tags.length === 0);

export function statMods(
  character: Character,
  grants: Record<string, unknown> = {}
): RolledMod[] {
  const extra = [treeMod(character), attributeMod(character), weaponMod(character, grants)];
  return [
    ...equippedItems(character).flatMap((i) =>
      [...i.mods, ...i.implicits].map((m) =>
        // Already in `weaponMod`. Left here they would scale the whole build
        // too, which is the bug local exists to stop.
        (i === character.equipment?.[WEAPON_SLOT] || i === offWeapon(character))
        && m.stats.some(isLocal)
          ? { ...m, stats: m.stats.filter((line) => !isLocal(line)) }
          : m
      )
    ),
    ...extra.filter((m): m is RolledMod => m !== null),
  ];
}

/** Stats for a character, resolving its selected skill, gear and tree. */
/**
 * THE SPECIALIST, as one synthetic mod — the way `treeMod` and `attributeMod`
 * are. Per WEAPON HELD, so a matched pair is its family's line twice, and it
 * goes through the same aggregation as gear rather than a second pipeline.
 */
/** TWO OF ONE FAMILY. A dagger beside a dagger, not a dagger beside a shiv —
 *  the FAMILY is what the Specialist reads, so it is what this reads too. */
export function matchedPair(character: Character): boolean {
  const main = character.equipment?.[WEAPON_SLOT];
  const off = offWeapon(character);
  if (!main || !off) return false;
  const family = (i: Item) => GEAR_BASE_BY_ID[i.base]?.family ?? '';
  return family(main) !== '' && family(main) === family(off);
}

export function specialistMod(
  character: Character,
  grants: Record<string, unknown>
): RolledMod | null {
  const scale = typeof grants.weaponSpecialist === 'number' ? grants.weaponSpecialist : 0;
  if (scale <= 0) return null;
  const held = [character.equipment?.[WEAPON_SLOT], offWeapon(character)]
    .filter((i): i is Item => !!i)
    .map((i) => GEAR_BASE_BY_ID[i.base]?.family ?? '')
    .map((family) => WEAPON_SPECIALITY[family])
    .filter(Boolean);
  if (held.length === 0) return null;

  const stats: RolledMod['stats'] = [];
  for (const speciality of held) {
    stats.push({
      stat: speciality.stat,
      form: speciality.stat === 'critChance' ? 'flat' : 'inc',
      value: speciality.per * scale,
      tags: [],
    });
  }
  return {
    entryId: 'specialist', defId: 'specialist', group: 'trade', slot: 'trade',
    name: 'Weapon Specialist', tier: 1, tags: [], stats,
  };
}

export function characterStats(character: Character): CombatStats {
  const base = SKILL_BY_ID[mainSkillId(character)] ?? SKILLS[0];
  const grants = treeGrants(character);
  const skill = effectiveSkill(base, grants);
  // The CHEST and nothing else: helm, gloves and boots are still worn, so it
  // is one slot given up rather than plate.
  const chest = grants.bareChest ? character.equipment?.body : undefined;
  const baseArmour = equippedItems(character)
    .filter((i) => i !== chest)
    .reduce((n, i) => n + (i.armour ?? 0), 0);
  const rates = weaponRates(character);
  // The Specialist reads what is in your HANDS, so it cannot be part of
  // `statMods` — that is walked webs and worn lines, and neither knows.
  const speciality = specialistMod(character, grants);
  return heroStats(
    [...statMods(character, grants), ...(speciality ? [speciality] : [])],
    character.level, skill, grants, baseArmour,
    evenRate(rates), rates, gripOf(character), matchedPair(character)
  );
}

/**
 * Monsters read their stats off the SOCKETED SET's merged mods, with the kind's
 * multipliers on top, so danger and monster identity compose instead of
 * competing. Nothing else makes a monster stronger: socket count is length.
 */
export function monsterStats(
  mods: RolledMod[],
  def: MonsterDef,
  ability?: MonsterAbilityDef
): CombatStats {
  const step = dangerStep(dangerScore(mods).danger);
  const life = MONSTER_BASE.life * def.life * (1 + step * DANGER.lifeAtTop);
  const damage = MONSTER_BASE.damage * def.damage * (1 + step * DANGER.hitAtTop);

  // What this monster deals is its ABILITY's, never the map's — an element
  // belongs to the thing swinging it.
  const type = ability?.damageType ?? 'physical';
  const own = computeStat(damage, mods, 'monsterDamage');

  // And the crystal ADDS on top of that rather than converting it, so a ward
  // for one element blunts a share of the hit instead of switching a modifier
  // off, and you still have the monster's own element to answer.
  const byType: Record<string, number> = { [type]: own };
  for (const added of ADDED_DAMAGE_TYPES) {
    const share = percentStat(mods, monsterAddedStat(added));
    if (share > 0) byType[added] = (byType[added] ?? 0) + (own * share) / 100;
  }
  const dealt = Object.values(byType).reduce((n, v) => n + v, 0);

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
    damageByType: byType,
    attacksPerSecond: MONSTER_BASE.attacksPerSecond * def.attacksPerSecond,
    handRates: [], // nothing dual wields but the hero

    critChance: percentStat(mods, 'monsterCrit'),
    moveSpeed: computeStat(MONSTER_BASE.moveSpeed, mods, 'monsterMoveSpeed') * def.moveSpeed,
    armour,
    armourReduction: blunted,
    dodgeChance: 0,
    blockChance: 0,
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
    ailmentDps: {},
    ailmentChance: {},
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
