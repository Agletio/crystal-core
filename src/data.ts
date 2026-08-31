import type {
  AttributeDef,
  SkillSlotDef,
  CurrencyClass,
  CurrencyDef,
  EquipSlotDef,
  GearBase,
  ModDef,
  MonsterDef,
  MonsterAbilityDef,
  MonsterFamily,
  AuraDef,
  DropGate,
  GearKind,
  MapTheme,
  LadderZoneDef,
  MapThemeDef,
  MonsterFamilyDef,
  MonsterRankDef,
  Recipe,
  RelicDef,
  RunSlotDef,
  SkillCategory,
  SkillDef,
  StatSpec,
  UniqueDef,
} from './types';
// Type-only, and it has to stay that way: `src/scenes/*` reads this file back.
import type { SceneBeat } from './scenes';

// --- damage types ----------------------------------------------------------
//
// A table, so adding a type resolves, resists and displays everywhere at once.
// Groups let one mod cover several types at lower value.

export interface DamageTypeDef {
  id: string;
  name: string;
  /** Shared resistance family, or null for a standalone type. */
  group: string | null;
}

export const DAMAGE_TYPES: DamageTypeDef[] = [
  { id: 'physical', name: 'Physical', group: null },
  { id: 'fire', name: 'Fire', group: 'elemental' },
  { id: 'cold', name: 'Cold', group: 'elemental' },
  { id: 'lightning', name: 'Lightning', group: 'elemental' },
  { id: 'poison', name: 'Poison', group: 'occult' },
  { id: 'dark', name: 'Dark', group: 'occult' },
  { id: 'light', name: 'Light', group: 'occult' },
  { id: 'prismatic', name: 'Prismatic', group: null },
];

export const DAMAGE_TYPE_BY_ID: Record<string, DamageTypeDef> = Object.fromEntries(
  DAMAGE_TYPES.map((d) => [d.id, d])
);

/** What a crystal hardens its monsters against one damage type with. */
export const monsterResStat = (type: string): string =>
  `monster${type[0].toUpperCase()}${type.slice(1)}Res`;

/** What a crystal ADDS to a monster's hit, as one type. */
export const monsterAddedStat = (type: string): string =>
  `monster${type[0].toUpperCase()}${type.slice(1)}`;

export const ADDED_DAMAGE_TYPES = ['fire', 'cold', 'lightning'];
export const ADDED_DAMAGE_STATS = ADDED_DAMAGE_TYPES.map(monsterAddedStat);

export const DAMAGE_GROUPS = ['elemental', 'occult'] as const;

/** What a run can be pointed AT. Three groups rather than seven slots: a
 *  crystal that hunts boots is one you socket for a day. */
export const DROP_GROUPS: Array<{ id: string; mod: string; kinds: GearKind[] }> = [
  { id: 'weapons', mod: 'of the Armoury', kinds: ['weapon'] },
  { id: 'armour', mod: 'of the Foundry', kinds: ['helmet', 'body', 'gloves', 'boots', 'shield'] },
  { id: 'trinkets', mod: 'of the Reliquary', kinds: ['amulet', 'ring'] },
];

/** The stat a crystal states its hunting in. Weight on that group's kinds. */
export const findStat = (group: string): string => `find${group[0].toUpperCase()}${group.slice(1)}`;

export const GROUP_OF_KIND: Record<string, string> = Object.fromEntries(
  DROP_GROUPS.flatMap((g) => g.kinds.map((k) => [k, g.id]))
);

/**
 * What a lasting version of each damage type is called. The sim has one ailment
 * and takes its element from the skill, so this is naming rather than mechanics
 * — a converted skill burns, bleeds or withers without any node saying so.
 */
export const AILMENT_NAMES: Record<string, string> = {
  physical: 'Bleed',
  fire: 'Burn',
  cold: 'Chill',
  lightning: 'Shock',
  poison: 'Poison',
  dark: 'Curse',
  light: 'Exposure',
};

/**
 * WHAT A DAMAGE TYPE DOES over time. Dealing the type applies it at `chance`
 * percent, so an ailment is a fact about the damage and not a node somebody
 * bought. A damage ailment scales by its OWN tags and nothing else — Fire,
 * Burn and Damage over Time reach a Burn where Spell, Attack and Critical
 * never do, which falls out of the tag filter `computeStat` already applies.
 * Prismatic has no row on purpose: what it gets instead is that little down
 * here wards against it, which is a `DEFENCE` rule.
 */
export interface AilmentDef {
  id: string;
  name: string;
  type: string; // the damage type that applies it
  /** The name as a VERB, for "Chance to Bleed" — only where it is not one. */
  verb?: string;
  kind: 'damage' | 'chill' | 'shock' | 'curse' | 'exposure';
  /** Percent per HIT before anything raises it, and ZERO for everything a
   *  damage type applies: an Ailment is BOUGHT, never free. A baseline would
   *  be unconditional damage on every build in the game, which measured as the
   *  boss ceasing to be a barrier — a thin-geared runner beat it 4 times in 8.
   *  Over 100% stacks: 250% is two and a 50% roll at a third. */
  chance: number;
  seconds: number;
  tags?: string[]; // what its damage scales by; never the skill's, which is the point
  dps?: number; // per second at ONE stack, before its own scaling
  bySource?: boolean; // only applied by something that SAYS so. Poison alone
  slowPer?: number; // Chill: percent off movement, attack and cast speed per stack
  /** Stacks that Freeze. The hit after one is a Critical. */
  freezeAt?: number;
  freezeSeconds?: number;
  /** Shock: what each tick throws at neighbours, and how far. */
  arcShare?: number;
  arcTargets?: number;
  arcRadius?: number;
  /** Curse: share of the target's MAXIMUM life it bursts for, per stack. */
  burstShare?: number;
  burstRadius?: number;
  /** Exposure: percent increased damage taken, per stack. */
  takenPer?: number;
}

export const AILMENTS: AilmentDef[] = [
  {
    id: 'burn', name: 'Burn', type: 'fire', kind: 'damage', chance: 0, seconds: 4,
    tags: ['fire', 'burn', 'overTime'], dps: 26,
  },
  {
    id: 'bleed', name: 'Bleed', type: 'physical', kind: 'damage', chance: 0, seconds: 5,
    tags: ['physical', 'bleed', 'overTime'], dps: 22,
  },
  {
    id: 'poison', name: 'Poison', type: 'poison', kind: 'damage', chance: 100, seconds: 6,
    tags: ['poison', 'overTime'], dps: 19, bySource: true,
  },
  {
    id: 'chill', name: 'Chill', type: 'cold', kind: 'chill', chance: 0, seconds: 3,
    slowPer: 6, freezeAt: 8, freezeSeconds: 1.4,
  },
  {
    id: 'shock', name: 'Shock', type: 'lightning', kind: 'shock', chance: 0, seconds: 4,
    tags: ['lightning', 'shock', 'overTime'], dps: 7,
    arcShare: 0.8, arcTargets: 3, arcRadius: 2.4,
  },
  {
    id: 'curse', name: 'Curse', type: 'dark', kind: 'curse', chance: 0, seconds: 8,
    burstShare: 4, burstRadius: 2.2,
  },
  {
    id: 'exposure', name: 'Exposure', verb: 'Expose', type: 'light', kind: 'exposure', chance: 0, seconds: 5,
    takenPer: 4,
  },
];

export const AILMENT_BY_ID: Record<string, AilmentDef> = Object.fromEntries(
  AILMENTS.map((a) => [a.id, a])
);

/** The ailment a damage type carries, or undefined for one that carries none. */
export const AILMENT_OF_TYPE: Record<string, AilmentDef> = Object.fromEntries(
  AILMENTS.map((a) => [a.type, a])
);

/** Damage that nothing scales and nothing resists. */
export const TYPELESS = 'typeless';

/** Damage over time. In data so the sheet states the same cap the sim enforces. */
export const AILMENT = {
  maxStacks: 12, // enough that stacking matters, few enough that it cannot run away
  tick: 0.5, // poison lands in half-second lumps, which is also the crit cadence
};

/**
 * Resistance and armour are separate MULTIPLIERS — at both caps you take
 * 0.25 * 0.25 of a hit; adding them would be immunity at 75 + 75. Armour
 * curves with armour POINTS, not with the size of the hit, and applies to HITS
 * only: damage over time goes through resistance alone.
 */
/**
 * What a passive deals on its OWN, and the whole point of the number: it comes
 * off character LEVEL and nothing else. A share of your hit inherits every
 * multiplier a build already stacked, which makes it a rider no build declines;
 * flat and never scaling dies by band 3. Level is the one input that is not a
 * choice, so it can be tuned with one figure and can never become a target.
 */
export const PASSIVE_DAMAGE = {
  sunderPerLevel: 5.5, // Sundering's Burst, physical
  sunderEvery: 4, // seconds between one Burst being armed and the next
  sunderRadius: 2.4,
  frostPerLevel: 0.9, // Hoarfrost's spike, cold, and it goes off far more often
  frostEvery: 0.7,
  frostRange: 7,
};

export const DEFENCE = {
  resistanceCap: 75,
  armourCap: 75,
  /** A Dodge stops a HIT outright like a Block, and caps lower: armour is
   *  traded for it rather than worn beside it. */
  dodgeCap: 50,
  /** A Block stops a HIT outright, so the chance is the whole of it. Short of
   *  certain, or a shield would be the only defence worth wearing. */
  blockCap: 60,
  /** Armour points at which reduction reaches half the cap. */
  armourHalfPoint: 300,
  /**
   * The least of a hit that must still reach a MONSTER. Resistance and armour
   * multiply, and a map you cannot hurt is a wall rather than a hard map.
   * Armour gives way to the wards, so hardening one type costs the other.
   */
  monsterHitFloor: 0.25,
};

/** The fixed halves of the warrior's switches: a grant carries the AMOUNT and
 *  this carries what it is measured against, so two nodes ADD UP. */
export const WARRIOR = {
  corneredBelow: 50, // percent of maximum life
  riposteSeconds: 4, // how long a Block leaves the next hit sharpened
  heavyHandSeconds: 2,
  staggerSeconds: 3,
  paintSeconds: 4, // how long the paint answers a blow, on both of its lines
  shieldLessCap: 0.6,
  secondSkinCap: 1,
  stunPower: 1.5, // above 1, so a graze nearly never Stuns and a heavy blow nearly always does
  stunBurstRadius: 2.6,
};

/** A hit's chance to Stun, off the share of MAXIMUM life it took. ONE
 *  implementation, so the line a card prints is the roll the sim makes. */
export const stunChanceFor = (share: number): number =>
  Math.max(0, Math.min(1, share ** WARRIOR.stunPower));

/**
 * WHAT A TRADE GIVES FOR NOTHING, before a point is spent. Four rows against
 * each other, because a baseline is what tells two trades apart in the first
 * hour rather than at the point cap.
 *
 * The Alchemist's is charged by KILLS and never by a clock: seconds would hand
 * a build grinding down one tanky body permanent regeneration for nothing,
 * where a room full of things to kill is where the flasks should come back.
 */
export const TRADE_BASE = {
  alchemistChargePerKill: 1 / 8,
  warriorStunSeconds: 1.1,
  aethermancerPoolRegen: 2.5, // percent of maximum mana a second, over the base
  aethermancerShield: 0.1,
};

/** Sockets in the Fissure. Count is run LENGTH; what is in them is difficulty. */
export const RUN_SLOTS: RunSlotDef[] = [
  { id: 's1', name: 'First socket', accepts: 'crystal' },
  { id: 's2', name: 'Second socket', accepts: 'crystal' },
  { id: 's3', name: 'Third socket', accepts: 'crystal' },
  { id: 's4', name: 'Fourth socket', accepts: 'crystal' },
];

// --- what a base holds -----------------------------------------------------

/**
 * Modifiers a gear base holds, by its tier. The WHOLE of capacity: nothing a
 * currency does raises it, so a bigger item means finding a better base.
 */
export const BASE_TIER_MODS = [2, 4, 6];

export const baseMods = (tier: number): number =>
  BASE_TIER_MODS[Math.max(0, Math.min(BASE_TIER_MODS.length - 1, tier - 1))];

/** Kept for crystals and any caller that still wants a default gear layout. */
export const GEAR_SLOTS = { offence: 3, defence: 2, utility: 1 };

// --- equipment -------------------------------------------------------------
//
// Gear mods declare appliesTo: ['gear'], so every base rolls from one pool and
// a new base needs no new mod content.

// The main hand keeps the id `weapon`: a save points at it.
/** What a weapon COUNTS AS, so a requirement is answered by anything that is a
 *  bigger version of what it named: a skill wanting a mace is answered by a
 *  maul, and one naming the maul itself is answered by nothing else. DERIVED
 *  rather than listed the other way round — a new family declares what it
 *  counts as, and every requirement already written picks it up. */
export const WEAPON_COUNTS_AS: Record<string, string[]> = {
  sword: ['sword', 'melee'],
  sword2h: ['sword2h', 'sword', 'melee', 'twohand'],
  dagger: ['dagger', 'melee'],
  mace: ['mace', 'melee'],
  mace2h: ['mace2h', 'mace', 'melee', 'twohand'],
  staff: ['staff', 'melee', 'twohand'],
  wand: ['wand'],
  bow: ['bow', 'twohand'],
};

/** The hand a weapon's own damage is read off, named rather than searched for. */
export const WEAPON_SLOT = 'weapon';
export const OFF_SLOT = 'offhand';

export const EQUIP_SLOTS: EquipSlotDef[] = [
  { id: 'weapon', name: 'Main Hand', accepts: ['weapon'] },
  // A SHIELD or a second one-handed weapon; a two-hander empties it.
  { id: 'offhand', name: 'Off Hand', accepts: ['shield', 'weapon'] },
  { id: 'helmet', name: 'Helmet', accepts: ['helmet'] },
  { id: 'body', name: 'Body', accepts: ['body'] },
  { id: 'gloves', name: 'Gloves', accepts: ['gloves'] },
  { id: 'boots', name: 'Boots', accepts: ['boots'] },
  { id: 'amulet', name: 'Amulet', accepts: ['amulet'] },
  { id: 'ring1', name: 'Ring I', accepts: ['ring'] },
  { id: 'ring2', name: 'Ring II', accepts: ['ring'] },
];

/** DUAL WIELDING: every hit is BOTH hands and the rate ALTERNATES between them.
 *  The shares add to more than one because a pair gives up a shield's armour and
 *  its Block; what it is NOT is a second, independent swing. */
export const DUAL = { main: 0.75, off: 0.55 };

/** Where each rung of a family starts dropping, against a run's drop ilvl. */
export const BASE_TIER_ILVL = [1, 22, 46];

// --- armour ----------------------------------------------------------------
//
// Twelve families across four slots and three rungs. Every family spends the
// SAME budget at the same rate and differs only in how it splits it, so a
// hybrid is a redistribution rather than a surplus — the demo re-adds the
// points to prove it. Slot layouts never vary by family: a better split AND
// more openings is how one becomes the only choice.

/** Budget points per rung, before the slot share. */
const ARMOUR_BUDGET = [20, 32, 46];

/** How much of the budget a slot carries. Body armour is the armour piece. */
const ARMOUR_SLOT_SHARE: Record<string, number> = {
  helmet: 0.7, body: 1, gloves: 0.55, boots: 0.55,
};

const ARMOUR_SLOT_LAYOUT: Record<string, Record<string, number>> = {
  helmet: { offence: 2, defence: 3, utility: 1 },
  body: { offence: 1, defence: 4, utility: 1 },
  gloves: { offence: 5, defence: 1, utility: 0 },
  boots: { offence: 0, defence: 2, utility: 4 },
};

/**
 * What one budget point buys. These rates are what make the budget comparable
 * across families — a point of move speed has to be worth a point of armour or
 * the invariant is decoration. Crit is INCREASED, scaling a base of about 5.
 */
const IMPLICIT_PER_POINT: Record<string, number> = {
  armour: 6,
  attackDamage: 1,
  spellDamage: 1,
  attackSpeed: 0.75,
  castSpeed: 0.75,
  moveSpeed: 0.5,
  critChance: 3,
};

/** Armour and increases are whole numbers; the dear stats need a decimal. */
const IMPLICIT_STEP: Record<string, number> = {
  armour: 1, attackDamage: 1, spellDamage: 1,
  attackSpeed: 0.1, castSpeed: 0.1, moveSpeed: 0.1, critChance: 1,
};

const IMPLICIT_STAT: Record<string, { stat: string; form: 'flat' | 'inc'; tags?: string[] }> = {
  armour: { stat: 'armour', form: 'flat' },
  attackDamage: { stat: 'damage', form: 'inc', tags: ['attack'] },
  spellDamage: { stat: 'damage', form: 'inc', tags: ['spell'] },
  attackSpeed: { stat: 'attackSpeed', form: 'inc' },
  castSpeed: { stat: 'castSpeed', form: 'inc' },
  moveSpeed: { stat: 'moveSpeed', form: 'inc' },
  critChance: { stat: 'critChance', form: 'inc' },
};

interface ArmourFamily {
  id: string;
  /** Which archetypes it draws on. Two names is a hybrid. */
  archetypes: string[];
  /** Fractions of the budget, by IMPLICIT_PER_POINT key. Must sum to 1. */
  mix: Record<string, number>;
  /** Rung words, lowest first, and the noun each slot takes. */
  words: [string, string, string];
  nouns: Record<string, string>;
}

export const ARMOUR_FAMILIES: ArmourFamily[] = [
  // --- melee: nearly the whole budget goes on the rating ---------------
  {
    id: 'bulwark', archetypes: ['melee'],
    mix: { armour: 1 },
    words: ['Rusted', 'Tempered', 'Bastion'],
    nouns: { helmet: 'Helm', body: 'Cuirass', gloves: 'Gauntlets', boots: 'Greaves' },
  },
  {
    id: 'vanguard', archetypes: ['melee'],
    mix: { armour: 0.7, attackDamage: 0.3 },
    words: ['Scored', 'Honed', 'Warlord'],
    nouns: { helmet: 'Barbute', body: 'Brigandine', gloves: 'Handguards', boots: 'Sabatons' },
  },

  // --- spell: the least armour in the game, and the most damage --------
  {
    id: 'arcanist', archetypes: ['spell'],
    mix: { armour: 0.08, spellDamage: 0.92 },
    words: ['Ashen', 'Sigil', 'Empyrean'],
    nouns: { helmet: 'Hood', body: 'Robe', gloves: 'Wraps', boots: 'Slippers' },
  },
  {
    id: 'oracle', archetypes: ['spell'],
    mix: { armour: 0.15, spellDamage: 0.6, castSpeed: 0.25 },
    words: ['Chalk', 'Runed', 'Auger'],
    nouns: { helmet: 'Circlet', body: 'Vestment', gloves: 'Palms', boots: 'Sandals' },
  },

  // --- rogue: between the two, and spends the rest on speed and crit ---
  {
    id: 'shadow', archetypes: ['rogue'],
    mix: { armour: 0.3, critChance: 0.4, moveSpeed: 0.3 },
    words: ['Dusk', 'Umbral', 'Eclipse'],
    nouns: { helmet: 'Cowl', body: 'Shroud', gloves: 'Grips', boots: 'Slips' },
  },
  {
    id: 'skirmisher', archetypes: ['rogue'],
    mix: { armour: 0.3, attackDamage: 0.35, moveSpeed: 0.2, critChance: 0.15 },
    words: ['Tanned', 'Studded', 'Reaver'],
    nouns: { helmet: 'Mask', body: 'Jerkin', gloves: 'Mitts', boots: 'Treads' },
  },

  // --- hybrids: rating lands between the two they borrow from ----------
  {
    id: 'templar', archetypes: ['melee', 'spell'],
    mix: { armour: 0.55, spellDamage: 0.45 },
    words: ['Chapel', 'Consecrated', 'Cathedral'],
    nouns: { helmet: 'Casque', body: 'Hauberk', gloves: 'Mitons', boots: 'Warboots' },
  },
  {
    id: 'runeguard', archetypes: ['melee', 'spell'],
    mix: { armour: 0.4, spellDamage: 0.35, castSpeed: 0.25 },
    words: ['Etched', 'Warded', 'Aegis'],
    nouns: { helmet: 'Crown', body: 'Scalemail', gloves: 'Bracers', boots: 'Sollerets' },
  },
  {
    id: 'nightweave', archetypes: ['spell', 'rogue'],
    mix: { armour: 0.18, spellDamage: 0.45, critChance: 0.22, moveSpeed: 0.15 },
    words: ['Gloam', 'Hexed', 'Voidspun'],
    nouns: { helmet: 'Veil', body: 'Mantle', gloves: 'Silks', boots: 'Striders' },
  },
  {
    id: 'whisper', archetypes: ['spell', 'rogue'],
    mix: { armour: 0.22, spellDamage: 0.33, castSpeed: 0.25, moveSpeed: 0.2 },
    words: ['Hushed', 'Muted', 'Sibilant'],
    nouns: { helmet: 'Cap', body: 'Cloak', gloves: 'Fingers', boots: 'Padfeet' },
  },
  {
    id: 'raider', archetypes: ['melee', 'rogue'],
    mix: { armour: 0.6, moveSpeed: 0.22, critChance: 0.18 },
    words: ['Roving', 'Banded', 'Chieftain'],
    nouns: { helmet: 'Barhelm', body: 'Harness', gloves: 'Cuffs', boots: 'Runners' },
  },
  {
    id: 'duelist', archetypes: ['melee', 'rogue'],
    mix: { armour: 0.45, attackDamage: 0.3, attackSpeed: 0.13, moveSpeed: 0.12 },
    words: ['Fenced', 'Parried', 'Bladed'],
    nouns: { helmet: 'Visor', body: 'Doublet', gloves: 'Guards', boots: 'Stepplates' },
  },
];

export const ARMOUR_SLOT_KINDS = ['helmet', 'body', 'gloves', 'boots'] as const;

/** What the balance harnesses wear. Middling armour, or they measure the tank. */
export const REFERENCE_ARMOUR_FAMILY = 'skirmisher';

/** Budget a family may spend on one slot at one rung. */
export const armourBudget = (kind: string, tier: number): number =>
  ARMOUR_BUDGET[tier - 1] * (ARMOUR_SLOT_SHARE[kind] ?? 1);

/**
 * toFixed, not the bare multiply: 7 * 0.1 is 0.7000000000000001 in binary
 * floating point, and every digit of that reaches the player's tooltip.
 */
export const quantise = (key: string, points: number): number => {
  const step = IMPLICIT_STEP[key];
  return Number((Math.round((points * IMPLICIT_PER_POINT[key]) / step) * step).toFixed(4));
};

const spend = (key: string, points: number): StatSpec => {
  const { stat, form, tags } = IMPLICIT_STAT[key];
  return {
    stat, form,
    range: [quantise(key, points), quantise(key, points)] as [number, number],
    ...(tags ? { tags } : {}),
  };
};

const armourBases = (): GearBase[] => {
  const out: GearBase[] = [];
  for (const family of ARMOUR_FAMILIES) {
    for (const kind of ARMOUR_SLOT_KINDS) {
      for (let tier = 1; tier <= 3; tier++) {
        const budget = armourBudget(kind, tier);
        const implicit = Object.entries(family.mix)
          .filter(([key, share]) => key !== 'armour' && share > 0)
          .map(([key, share]) => spend(key, budget * share));
        out.push({
          id: `${family.id}_${kind}_t${tier}`,
          name: `${family.words[tier - 1]} ${family.nouns[kind]}`,
          kind: kind as GearBase['kind'],
          art: `${family.id}_${kind}`,
          family: family.id,
          ilvl: BASE_TIER_ILVL[tier - 1],
          tier,
          slots: { ...ARMOUR_SLOT_LAYOUT[kind] },
          armour: quantise('armour', budget * (family.mix.armour ?? 0)),
          // A family that spends everything on the rating has no implicit at
          // all, and an empty array would draw an empty "Base" line.
          ...(implicit.length > 0 ? { implicit } : {}),
        });
      }
    }
  }
  return out;
};

export const ARMOUR_BASES: GearBase[] = armourBases();

/**
 * A base read back into budget points — the inverse of spend(), and the only
 * check that two families priced the same thing the same way. The rating counts;
 * it comes out of the same budget. Lossy by under a point per line.
 */
export const implicitSpend = (base: GearBase): number =>
  (base.armour ?? 0) / IMPLICIT_PER_POINT.armour +
  (base.implicit ?? []).reduce((total, s) => {
    const key = Object.keys(IMPLICIT_STAT).find((k) => {
      const want = IMPLICIT_STAT[k];
      const tag = want.tags?.[0];
      return want.stat === s.stat && want.form === s.form
        && (tag === undefined || (s.tags ?? []).includes(tag));
    });
    return key ? total + s.range[0] / IMPLICIT_PER_POINT[key] : total;
  }, 0);

/**
 * Weapons, in five families. Every weapon carries an IMPLICIT no craft can
 * touch — wands spell damage or cast speed, swords attack speed, daggers flat
 * crit, maces flat damage of ONE type, so a mace commits you. Rungs within a
 * family are gated by ilvl, so bases are themselves progression. Bows are the
 * one TWO-HANDED family, and the off hand is what pays for their increase.
 */
const WEAPON_SLOTS = { offence: 5, defence: 1, utility: 0 };

/** Swings a second per FAMILY, before anything worn scales it. This is the
 *  whole of what a two-hander PAYS for its damage — a Sledge hits for 44 where
 *  a Cudgel hits for 24, and swings at three quarters of the speed with no off
 *  hand to put a shield in. A spell never reads it: `heroStats` keeps the
 *  hero's own rate for one, so a wand's number is here for a wand ATTACK. */
export const WEAPON_RATE: Record<string, number> = {
  dagger: 1.55, sword: 1.3, wand: 1.25, bow: 1.2, mace: 1.05,
  staff: 1.0, sword2h: 0.95, mace2h: 0.8,
};

const weapon = (
  id: string,
  name: string,
  family: string,
  ilvl: number,
  damage: number,
  implicit: StatSpec[],
  hands = 1
): GearBase => ({
  id, name, kind: 'weapon', art: family, family, ilvl, damage,
  attackSpeed: WEAPON_RATE[family] ?? HERO_BASE.attacksPerSecond,
  // Off the rung it drops at, so a side-grade arriving beside a rung holds
  // exactly what that rung holds.
  tier: BASE_TIER_ILVL.indexOf(ilvl) + 1,
  slots: { ...WEAPON_SLOTS },
  implicit,
  ...(hands > 1 ? { hands } : {}),
});

export const WEAPON_BASES: GearBase[] = [
  // --- wands: the spell family ---------------------------------------
  weapon('ash_wand', 'Ash Wand', 'wand', BASE_TIER_ILVL[0], 5, [
    { stat: 'damage', form: 'inc', range: [10, 10], tags: ['spell'] },
  ]),
  weapon('carved_wand', 'Carved Wand', 'wand', BASE_TIER_ILVL[1], 8, [
    { stat: 'damage', form: 'inc', range: [16, 16], tags: ['spell'] },
  ]),
  weapon('quartz_wand', 'Quartz Wand', 'wand', BASE_TIER_ILVL[2], 12, [
    { stat: 'damage', form: 'inc', range: [24, 24], tags: ['spell'] },
  ]),
  // A side-grade rather than a fourth rung: it arrives beside the Carved Wand
  // and trades every point of the ladder for speed.
  weapon('whisper_wand', 'Whispering Wand', 'wand', BASE_TIER_ILVL[1], 7, [
    { stat: 'castSpeed', form: 'inc', range: [12, 12] },
  ]),

  // --- swords: attack speed ------------------------------------------
  weapon('rusted_sword', 'Rusted Sword', 'sword', BASE_TIER_ILVL[0], 21, [
    { stat: 'attackSpeed', form: 'inc', range: [8, 8] },
  ]),
  weapon('iron_sword', 'Iron Sword', 'sword', BASE_TIER_ILVL[1], 26, [
    { stat: 'attackSpeed', form: 'inc', range: [13, 13] },
  ]),
  weapon('steel_sword', 'Steel Sword', 'sword', BASE_TIER_ILVL[2], 48, [
    { stat: 'attackSpeed', form: 'inc', range: [18, 18] },
  ]),

  // --- daggers: crit --------------------------------------------------
  weapon('shiv', 'Shiv', 'dagger', BASE_TIER_ILVL[0], 19, [
    { stat: 'critChance', form: 'inc', range: [25, 25] },
  ]),
  weapon('stiletto', 'Stiletto', 'dagger', BASE_TIER_ILVL[1], 25, [
    { stat: 'critChance', form: 'inc', range: [45, 45] },
  ]),
  weapon('fang', 'Fang', 'dagger', BASE_TIER_ILVL[2], 47, [
    { stat: 'critChance', form: 'inc', range: [75, 75] },
  ]),

  // --- maces: the heaviest base, and one damage type each ------------
  //
  // A typed maul's flat line is tagged 'attack' too, or a wand user could hold
  // one for free spell damage. A plain mace's increased PHYSICAL is local.
  weapon('cudgel', 'Cudgel', 'mace', BASE_TIER_ILVL[0], 24, [
    { stat: 'damage', form: 'inc', range: [20, 20], tags: ['physical'] },
  ]),
  weapon('ember_maul', 'Ember Maul', 'mace', BASE_TIER_ILVL[1], 36, [
    { stat: 'damage', form: 'flat', range: [9, 9], tags: ['fire', 'attack'] },
  ]),
  weapon('frost_maul', 'Frost Maul', 'mace', BASE_TIER_ILVL[1], 36, [
    { stat: 'damage', form: 'flat', range: [9, 9], tags: ['cold', 'attack'] },
  ]),
  weapon('storm_maul', 'Storm Maul', 'mace', BASE_TIER_ILVL[1], 36, [
    { stat: 'damage', form: 'flat', range: [9, 9], tags: ['lightning', 'attack'] },
  ]),
  weapon('skull_maul', 'Skull Maul', 'mace', BASE_TIER_ILVL[2], 58, [
    { stat: 'damage', form: 'inc', range: [20, 20], tags: ['physical'] },
  ]),

  // --- bows: the attack family, and the only two-handed one -----------
  //
  // Tagged 'attack' where the wand's line is tagged 'spell'. Twice the increase,
  // because holding one gives up an off hand — a shield's Block and its rating.
  weapon('crude_bow', 'Crude Bow', 'bow', BASE_TIER_ILVL[0], 29, [
    { stat: 'attackRange', form: 'inc', range: [25, 25] },
  ], 2),
  weapon('horn_bow', 'Horn Bow', 'bow', BASE_TIER_ILVL[1], 37, [
    { stat: 'attackRange', form: 'inc', range: [38, 38] },
  ], 2),
  weapon('yew_longbow', 'Yew Longbow', 'bow', BASE_TIER_ILVL[2], 70, [
    { stat: 'attackRange', form: 'inc', range: [55, 55] },
  ], 2),

  // --- greatswords, mauls and staves: two hands, and a family a one-handed
  // requirement is answered BY. See WEAPON_COUNTS_AS — a skill wanting a mace
  // takes a maul, and only one naming the maul refuses everything else.
  weapon('war_sword', 'War Sword', 'sword2h', BASE_TIER_ILVL[0], 45, [
    { stat: 'attackSpeed', form: 'inc', range: [5, 5] },
  ], 2),
  weapon('great_sword', 'Great Sword', 'sword2h', BASE_TIER_ILVL[1], 55, [
    { stat: 'attackSpeed', form: 'inc', range: [8, 8] },
  ], 2),
  weapon('reaver_sword', 'Reaver', 'sword2h', BASE_TIER_ILVL[2], 105, [
    { stat: 'attackSpeed', form: 'inc', range: [11, 11] },
  ], 2),

  weapon('sledge', 'Sledge', 'mace2h', BASE_TIER_ILVL[0], 45, [
    { stat: 'damage', form: 'inc', range: [25, 25], tags: ['physical'] },
  ], 2),
  weapon('great_maul', 'Great Maul', 'mace2h', BASE_TIER_ILVL[1], 52, [
    { stat: 'damage', form: 'inc', range: [38, 38], tags: ['physical'] },
  ], 2),
  weapon('breaker_maul', 'Breaker', 'mace2h', BASE_TIER_ILVL[2], 87, [
    { stat: 'damage', form: 'inc', range: [58, 58], tags: ['physical'] },
  ], 2),

  // One ART and two implicits, at every rung: the shod one is swung and the
  // grey one is cast with, and which you are holding is the line on the piece.
  weapon('shod_staff', 'Shod Staff', 'staff', BASE_TIER_ILVL[0], 38, [
    { stat: 'damage', form: 'inc', range: [18, 18], tags: ['physical'] },
  ], 2),
  weapon('grey_staff', 'Grey Staff', 'staff', BASE_TIER_ILVL[0], 12, [
    { stat: 'damage', form: 'inc', range: [22, 22], tags: ['spell'] },
  ], 2),
  weapon('ironshod_staff', 'Ironshod Staff', 'staff', BASE_TIER_ILVL[1], 45, [
    { stat: 'damage', form: 'inc', range: [28, 28], tags: ['physical'] },
  ], 2),
  weapon('ashen_staff', 'Ashen Staff', 'staff', BASE_TIER_ILVL[1], 19, [
    { stat: 'damage', form: 'inc', range: [35, 35], tags: ['spell'] },
  ], 2),
  weapon('warden_staff', 'Warden Staff', 'staff', BASE_TIER_ILVL[2], 77, [
    { stat: 'damage', form: 'inc', range: [42, 42], tags: ['physical'] },
  ], 2),
  weapon('seer_staff', 'Seer Staff', 'staff', BASE_TIER_ILVL[2], 28, [
    { stat: 'damage', form: 'inc', range: [52, 52], tags: ['spell'] },
  ], 2),

  // The same split on the dagger, one-handed: a shiv stabs, a kris is a focus.
  weapon('bone_kris', 'Bone Kris', 'dagger', BASE_TIER_ILVL[0], 6, [
    { stat: 'damage', form: 'inc', range: [12, 12], tags: ['spell'] },
  ]),
  weapon('rune_kris', 'Rune Kris', 'dagger', BASE_TIER_ILVL[1], 10, [
    { stat: 'damage', form: 'inc', range: [19, 19], tags: ['spell'] },
  ]),
  weapon('sigil_kris', 'Sigil Kris', 'dagger', BASE_TIER_ILVL[2], 15, [
    { stat: 'damage', form: 'inc', range: [28, 28], tags: ['spell'] },
  ]),
];

/** The off hand, and the only source of Block in the game: a rating like a body
 *  armour's and a chance to turn a hit aside. A bow gives up the lot. */
const SHIELD_SLOTS = { offence: 1, defence: 4, utility: 1 };

const shield = (
  id: string,
  name: string,
  tier: number,
  armour: number,
  block: number
): GearBase => ({
  id, name, kind: 'shield', art: 'shield', family: 'shield',
  ilvl: BASE_TIER_ILVL[tier - 1],
  tier,
  slots: { ...SHIELD_SLOTS },
  armour,
  implicit: [{ stat: 'blockChance', form: 'flat', range: [block, block] }],
});

export const SHIELD_BASES: GearBase[] = [
  shield('bark_buckler', 'Bark Buckler', 1, 34, 15),
  shield('banded_kite', 'Banded Kite Shield', 2, 62, 22),
  shield('tower_shield', 'Graven Tower Shield', 3, 96, 30),
];

/**
 * Jewellery carries no implicit, so a rung differs from the one below in
 * exactly one way: how many modifiers it holds. The first rung keeps the ids
 * `amulet` and `ring` — a save points at them.
 */
const TRINKET_SLOTS = { offence: 3, defence: 2, utility: 1 };

const trinket = (id: string, name: string, kind: GearKind, tier: number): GearBase => ({
  id, name, kind, art: kind, tier,
  ilvl: BASE_TIER_ILVL[tier - 1],
  slots: { ...TRINKET_SLOTS },
});

export const GEAR_BASES: GearBase[] = [
  ...WEAPON_BASES,
  ...SHIELD_BASES,
  ...ARMOUR_BASES,
  trinket('amulet', 'Bone Amulet', 'amulet', 1),
  trinket('jade_amulet', 'Jade Amulet', 'amulet', 2),
  trinket('onyx_amulet', 'Onyx Amulet', 'amulet', 3),
  trinket('ring', 'Copper Band', 'ring', 1),
  trinket('silver_band', 'Silver Band', 'ring', 2),
  trinket('gold_band', 'Gold Band', 'ring', 3),
];

export const GEAR_BASE_BY_ID: Record<string, GearBase> = Object.fromEntries(
  GEAR_BASES.map((b) => [b.id, b])
);

// --- what the filter is clicked in -----------------------------------------
//
// A group is a SET somebody builds toward — every mage piece, every bow — never
// one base at a time. Both halves are DERIVED from the tables above, so a
// family added there lands in a group without being listed twice.

export interface KeepGroup {
  id: string;
  name: string;
  /** What the row holds, said in the names it actually drops under. */
  detail: string;
  holds(base: GearBase): boolean;
}

/** What an archetype is called to somebody choosing gear rather than reading
 *  the table. `melee` is the one that has no obvious word for it. */
const ARCHETYPE_NAME: Record<string, string> = {
  melee: 'Tank',
  spell: 'Mage',
  rogue: 'Rogue',
};

const capitalise = (word: string): string => word[0].toUpperCase() + word.slice(1);

/** One group per ARCHETYPE PAIRING, not per family: what a person means by
 *  "mage gear" is both mage families, and a hybrid is a third thing again. */
const armourGroups = (): KeepGroup[] => {
  const out: KeepGroup[] = [];
  for (const family of ARMOUR_FAMILIES) {
    const key = family.archetypes.join('_');
    if (out.some((g) => g.id === `armour_${key}`)) continue;
    const kin = ARMOUR_FAMILIES.filter((f) => f.archetypes.join('_') === key);
    out.push({
      id: `armour_${key}`,
      name: family.archetypes.map((a) => ARCHETYPE_NAME[a] ?? a).join(' / '),
      detail: `${kin.map((f) => f.words[2]).join(' and ')} armour`,
      holds: (base) => kin.some((f) => f.id === base.family),
    });
  }
  return out;
};

const weaponGroups = (): KeepGroup[] => {
  const out: KeepGroup[] = [];
  for (const base of WEAPON_BASES) {
    const family = base.family ?? base.id;
    if (out.some((g) => g.id === `weapon_${family}`)) continue;
    const kin = WEAPON_BASES.filter((b) => b.family === family);
    out.push({
      id: `weapon_${family}`,
      name: `${capitalise(family)}s`,
      detail: kin.map((b) => b.name).join(', '),
      holds: (b) => b.family === family,
    });
  }
  return out;
};

export const KEEP_GROUPS: KeepGroup[] = [
  ...weaponGroups(),
  {
    id: 'shield',
    name: 'Shields',
    detail: SHIELD_BASES.map((b) => b.name).join(', '),
    holds: (base) => base.kind === 'shield',
  },
  ...armourGroups(),
  {
    id: 'amulet',
    name: 'Amulets',
    detail: 'Bone, Jade and Onyx',
    holds: (base) => base.kind === 'amulet',
  },
  {
    id: 'ring',
    name: 'Rings',
    detail: 'Copper, Silver and Gold',
    holds: (base) => base.kind === 'ring',
  },
];

/** The group a base falls in. Every base is in exactly one; the demo holds it. */
export const keepGroupFor = (base: GearBase): KeepGroup | undefined =>
  KEEP_GROUPS.find((g) => g.holds(base));

/** The filter's id for a base rung, alongside a group's. One namespace, so
 *  `GameState.junk` is a flat list rather than two lists that can disagree. */
export const tierKeepId = (tier: number): string => `t${tier}`;

/** Rungs, low to high. Three of them, and `BASE_TIER_ILVL` is why. */
export const KEEP_TIERS: number[] = BASE_TIER_ILVL.map((_, i) => i + 1);

// --- mod pool --------------------------------------------------------------
//
// Tiers are authored best-first and gated by `ilvl`. Keep each slot type
// oversubscribed: more candidates than slots is what makes a roll a roll.

/** A crystal's ward names the thing it turns aside, not the type by id. */
/** WARDS BY FAMILY: a ward has to be one NO BUILD CAN IGNORE, and one per type
 *  failed that seven times in eight. Prismatic rides with Elemental. */
/** A ward's rungs, PER TYPE — scaled down from a single-type ward's by the
 *  average family size, so what a build actually FACES did not move. */
export const WARD_TIERS: ReadonlyArray<readonly [number, number, number, number]> = [
  [60, 120, 15, 19],
  [40, 260, 10, 13],
  [1, 620, 4, 7],
];

export const WARD_GROUPS = [
  { id: 'elemental', name: 'of Cinders and Frost', types: ['fire', 'cold', 'lightning', 'prismatic'] },
  { id: 'occult', name: 'of Clean Blood', types: ['poison', 'dark', 'light'] },
  { id: 'physical', name: 'of Thick Hide', types: ['physical'] },
];

/** DESCENTS A ROLL IS WORTH, off its tier's own WEIGHT: what decides how OFTEN
 *  it turns up decides how LONG it stays — *"super rare ones last less."* */
export const USES = { most: 20, least: 5, common: 1000, rare: 100 };

export function usesFor(weight: number): number {
  const lo = Math.log(USES.rare);
  const at = (Math.log(Math.max(1, weight)) - lo) / (Math.log(USES.common) - lo);
  return Math.round(USES.least + Math.max(0, Math.min(1, at)) * (USES.most - USES.least));
}

export const CRYSTAL_MODS: ModDef[] = [
  {
    id: 'pack_size',
    slot: 'mod',
    name: 'Teeming',
    appliesTo: ['crystal'],
    tags: ['density', 'quantity'],
    tiers: [
      { ilvl: 60, weight: 200, stats: [{ stat: 'packSize', form: 'inc', range: [45, 60] }], name: 'Swarming' },
      { ilvl: 30, weight: 600, stats: [{ stat: 'packSize', form: 'inc', range: [27, 42] }], name: 'Teeming' },
      { ilvl: 1, weight: 1000, stats: [{ stat: 'packSize', form: 'inc', range: [12, 24] }], name: 'Crowded' },
    ],
  },
  {
    id: 'pack_count',
    slot: 'mod',
    name: 'Sprawling',
    appliesTo: ['crystal'],
    tags: ['density'],
    tiers: [
      { ilvl: 45, weight: 300, stats: [{ stat: 'packCount', form: 'inc', range: [30, 45] }] },
      { ilvl: 1, weight: 800, stats: [{ stat: 'packCount', form: 'inc', range: [12, 27] }] },
    ],
  },
  // Reward is derived from danger, so no crystal modifier is pure upside.
  // --- what the ROCK DOES, never what a monster's numbers are -------------
  //
  // *"Change all the mods to be effectively just powerful nodes."* Raw scaling
  // is the RUNG's, so every row under this is a rule the sim runs.

  {
    id: 'crystal_watch',
    slot: 'mod',
    name: 'of the Second Watch',
    appliesTo: ['crystal'],
    tags: ['danger', 'hoard'],
    tiers: [
      { ilvl: 55, weight: 170, stats: [{ stat: 'watchChance', form: 'flat', range: [55, 75] }], name: 'of the Long Watch' },
      { ilvl: 20, weight: 460, stats: [{ stat: 'watchChance', form: 'flat', range: [30, 50] }] },
      { ilvl: 1, weight: 820, stats: [{ stat: 'watchChance', form: 'flat', range: [15, 28] }], name: 'of the Standing Watch' },
    ],
  },
  {
    id: 'crystal_hoard',
    slot: 'mod',
    name: 'of the Hoard',
    appliesTo: ['crystal'],
    tags: ['danger', 'hoard', 'quantity'],
    tiers: [
      { ilvl: 50, weight: 190, stats: [{ stat: 'hoardChance', form: 'flat', range: [26, 38] }], name: 'of the Cache' },
      { ilvl: 20, weight: 520, stats: [{ stat: 'hoardChance', form: 'flat', range: [14, 24] }] },
      { ilvl: 1, weight: 900, stats: [{ stat: 'hoardChance', form: 'flat', range: [6, 12] }], name: 'of the Stash' },
    ],
  },
  {
    id: 'crystal_vein',
    slot: 'mod',
    name: 'of the Vein',
    appliesTo: ['crystal'],
    tags: ['danger', 'hoard', 'finding'],
    tiers: [
      { ilvl: 50, weight: 180, stats: [{ stat: 'veinChance', form: 'flat', range: [24, 36] }], name: 'of the Lode' },
      { ilvl: 20, weight: 500, stats: [{ stat: 'veinChance', form: 'flat', range: [13, 22] }] },
      { ilvl: 1, weight: 880, stats: [{ stat: 'veinChance', form: 'flat', range: [6, 11] }], name: 'of the Seam' },
    ],
  },
  {
    id: 'crystal_warden',
    slot: 'mod',
    name: 'of the Warden',
    appliesTo: ['crystal'],
    tags: ['danger'],
    tiers: [
      { ilvl: 55, weight: 160, stats: [{ stat: 'wardenChance', form: 'flat', range: [45, 65] }], name: 'of the Keeper' },
      { ilvl: 20, weight: 470, stats: [{ stat: 'wardenChance', form: 'flat', range: [22, 38] }] },
      { ilvl: 1, weight: 850, stats: [{ stat: 'wardenChance', form: 'flat', range: [10, 18] }], name: 'of the Watchman' },
    ],
  },
  {
    id: 'crystal_split',
    slot: 'mod',
    name: 'of the Splitting',
    appliesTo: ['crystal'],
    tags: ['danger', 'density'],
    tiers: [
      { ilvl: 55, weight: 175, stats: [{ stat: 'splitChance', form: 'flat', range: [50, 70] }], name: 'of the Sundering' },
      { ilvl: 20, weight: 490, stats: [{ stat: 'splitChance', form: 'flat', range: [26, 44] }] },
      { ilvl: 1, weight: 870, stats: [{ stat: 'splitChance', form: 'flat', range: [12, 22] }], name: 'of the Parting' },
    ],
  },
  {
    id: 'crystal_welling',
    slot: 'mod',
    name: 'of the Welling',
    appliesTo: ['crystal'],
    tags: ['danger'],
    tiers: [
      { ilvl: 55, weight: 165, stats: [{ stat: 'wellChance', form: 'flat', range: [16, 24] }], name: 'of the Rising' },
      { ilvl: 20, weight: 480, stats: [{ stat: 'wellChance', form: 'flat', range: [8, 14] }] },
      { ilvl: 1, weight: 840, stats: [{ stat: 'wellChance', form: 'flat', range: [3, 7] }], name: 'of the Stirring' },
    ],
  },
  {
    id: 'crystal_bearer',
    slot: 'mod',
    name: 'of the Bearer',
    appliesTo: ['crystal'],
    tags: ['danger'],
    tiers: [
      { ilvl: 60, weight: 140, stats: [{ stat: 'bearerChance', form: 'flat', range: [9, 14] }], name: 'of the Procession' },
      { ilvl: 25, weight: 420, stats: [{ stat: 'bearerChance', form: 'flat', range: [4, 8] }] },
      { ilvl: 1, weight: 760, stats: [{ stat: 'bearerChance', form: 'flat', range: [2, 3] }], name: 'of the Carrier' },
    ],
  },
  {
    id: 'crystal_watched',
    slot: 'mod',
    name: 'of the Watched',
    appliesTo: ['crystal'],
    tags: ['danger', 'quantity'],
    tiers: [
      { ilvl: 55, weight: 175, stats: [{ stat: 'monsterRank', form: 'inc', range: [180, 260] }], name: 'of the Assembly' },
      { ilvl: 20, weight: 500, stats: [{ stat: 'monsterRank', form: 'inc', range: [80, 150] }] },
      { ilvl: 1, weight: 900, stats: [{ stat: 'monsterRank', form: 'inc', range: [30, 65] }], name: 'of the Few' },
    ],
  },
  // No danger at all, so it is priced as the find modifiers are.
  {
    id: 'crystal_gilded',
    slot: 'mod',
    name: 'Gilded',
    appliesTo: ['crystal'],
    tags: ['finding'],
    tiers: [
      { ilvl: 55, weight: 180, stats: [{ stat: 'giltChance', form: 'flat', range: [28, 40] }], name: 'Gold-Struck' },
      { ilvl: 1, weight: 480, stats: [{ stat: 'giltChance', form: 'flat', range: [10, 20] }] },
    ],
  },

  {
    id: 'layout_maze',
    slot: 'mod',
    name: 'of Winding Ways',
    appliesTo: ['crystal'],
    tags: ['layout'],
    tiers: [
      {
        ilvl: 1,
        weight: 500,
        stats: [
          { stat: 'layoutComplexity', form: 'inc', range: [25, 45] },
          { stat: 'packCount', form: 'inc', range: [10, 15] },
        ],
      },
    ],
  },
  // What the rock gives up, rather than what it holds. These carry no danger
  // and never raise a drop's item level: the run pays exactly what it paid,
  // in a shape you chose. The cost is the socket, and the mod slot in it
  // that a danger modifier is not using.
  ...DROP_GROUPS.map((group) => ({
    id: `find_${group.id}`,
    slot: 'mod' as const,
    name: group.mod,
    appliesTo: ['crystal' as const],
    tags: ['finding'],
    tiers: [
      {
        ilvl: 55,
        weight: 180,
        stats: [{ stat: findStat(group.id), form: 'inc' as const, range: [90, 130] as [number, number] }],
      },
      {
        ilvl: 1,
        weight: 480,
        stats: [{ stat: findStat(group.id), form: 'inc' as const, range: [35, 70] as [number, number] }],
      },
    ],
  })),
];

// --- gear: DEFENCE = staying alive -----------------------------------------
export const GEAR_MAIN_MODS: ModDef[] = [
  {
    id: 'flat_life',
    slot: 'defence',
    name: 'of the Bear',
    appliesTo: ['gear'],
    tags: ['life', 'defence'],
    tiers: [
      { ilvl: 60, weight: 300, stats: [{ stat: 'life', form: 'flat', range: [70, 90] }] },
      { ilvl: 30, weight: 700, stats: [{ stat: 'life', form: 'flat', range: [40, 60] }] },
      { ilvl: 1, weight: 1000, stats: [{ stat: 'life', form: 'flat', range: [15, 30] }] },
    ],
  },
  {
    id: 'inc_life',
    slot: 'defence',
    name: 'of the Ox',
    appliesTo: ['gear'],
    tags: ['life', 'defence'],
    tiers: [
      { ilvl: 50, weight: 280, stats: [{ stat: 'life', form: 'inc', range: [12, 20] }] },
      { ilvl: 1, weight: 760, stats: [{ stat: 'life', form: 'inc', range: [5, 11] }] },
    ],
  },
  {
    id: 'armour',
    slot: 'defence',
    name: 'Plated',
    appliesTo: ['gear'],
    tags: ['defence'],
    tiers: [
      { ilvl: 50, weight: 350, stats: [{ stat: 'armour', form: 'flat', range: [90, 140] }] },
      { ilvl: 1, weight: 900, stats: [{ stat: 'armour', form: 'flat', range: [20, 60] }] },
    ],
  },
  {
    id: 'inc_armour',
    slot: 'defence',
    name: 'Reinforced',
    appliesTo: ['gear'],
    tags: ['defence'],
    tiers: [
      { ilvl: 45, weight: 300, stats: [{ stat: 'armour', form: 'inc', range: [18, 28] }] },
      { ilvl: 1, weight: 780, stats: [{ stat: 'armour', form: 'inc', range: [8, 16] }] },
    ],
  },
  {
    id: 'life_regen',
    slot: 'defence',
    name: 'of Vigour',
    appliesTo: ['gear'],
    tags: ['life', 'defence'],
    tiers: [
      { ilvl: 40, weight: 260, stats: [{ stat: 'lifeRegen', form: 'inc', range: [25, 40] }] },
      { ilvl: 1, weight: 700, stats: [{ stat: 'lifeRegen', form: 'inc', range: [10, 22] }] },
    ],
  },
  // The pool a skill is paid out of, and the two other ways to afford one:
  // more of it, faster return, or a cheaper skill. Nothing else buys sustain
  // until attributes do, so a build that wants to cast has to wear some.
  {
    id: 'flat_mana',
    slot: 'defence',
    name: 'of the Well',
    appliesTo: ['gear'],
    tags: ['mana', 'defence'],
    tiers: [
      { ilvl: 45, weight: 300, stats: [{ stat: 'mana', form: 'flat', range: [26, 44] }] },
      { ilvl: 1, weight: 800, stats: [{ stat: 'mana', form: 'flat', range: [8, 22] }] },
    ],
  },
  {
    id: 'mana_regen',
    slot: 'defence',
    name: 'of Clarity',
    appliesTo: ['gear'],
    tags: ['mana', 'defence'],
    tiers: [
      { ilvl: 40, weight: 260, stats: [{ stat: 'manaRegen', form: 'inc', range: [30, 50] }] },
      { ilvl: 1, weight: 700, stats: [{ stat: 'manaRegen', form: 'inc', range: [12, 26] }] },
    ],
  },
  {
    id: 'mana_cost',
    slot: 'defence',
    name: 'of Thrift',
    appliesTo: ['gear'],
    tags: ['mana', 'defence'],
    tiers: [
      { ilvl: 50, weight: 220, stats: [{ stat: 'manaCost', form: 'inc', range: [-22, -14] }] },
      { ilvl: 1, weight: 600, stats: [{ stat: 'manaCost', form: 'inc', range: [-12, -6] }] },
    ],
  },
  // Resistances are generated from DAMAGE_TYPES below, also into 'defence'.
];

// --- gear: OFFENCE, part two — the multipliers ------------------------------
//
// Speed and crit compete with flat damage for the same offence room, which is
// the choice worth having.
export const GEAR_SECONDARY_MODS: ModDef[] = [
  {
    id: 'attack_speed',
    slot: 'offence',
    name: 'of Alacrity',
    appliesTo: ['gear'],
    tags: ['speed', 'damage'],
    tiers: [
      { ilvl: 40, weight: 300, stats: [{ stat: 'attackSpeed', form: 'inc', range: [14, 20] }] },
      { ilvl: 1, weight: 800, stats: [{ stat: 'attackSpeed', form: 'inc', range: [5, 12] }] },
    ],
  },
  {
    // Spells scale with cast speed, attacks with attack speed. A spell should
    // not be getting faster because you found a sharper sword.
    id: 'cast_speed',
    slot: 'offence',
    name: 'of Quickening',
    appliesTo: ['gear'],
    tags: ['speed', 'damage', 'spell'],
    tiers: [
      { ilvl: 40, weight: 300, stats: [{ stat: 'castSpeed', form: 'inc', range: [14, 20] }] },
      { ilvl: 1, weight: 800, stats: [{ stat: 'castSpeed', form: 'inc', range: [5, 12] }] },
    ],
  },
  {
    id: 'crit_chance',
    slot: 'offence',
    name: 'of Precision',
    appliesTo: ['gear'],
    tags: ['crit', 'damage'],
    tiers: [
      { ilvl: 45, weight: 250, stats: [{ stat: 'critChance', form: 'inc', range: [30, 45] }] },
      { ilvl: 1, weight: 700, stats: [{ stat: 'critChance', form: 'inc', range: [10, 25] }] },
    ],
  },
  {
    id: 'crit_multiplier',
    slot: 'offence',
    name: 'of Savagery',
    appliesTo: ['gear'],
    tags: ['crit', 'damage'],
    tiers: [
      { ilvl: 50, weight: 220, stats: [{ stat: 'critMultiplier', form: 'flat', range: [22, 34] }] },
      { ilvl: 1, weight: 620, stats: [{ stat: 'critMultiplier', form: 'flat', range: [8, 18] }] },
    ],
  },
  {
    id: 'aoe',
    slot: 'offence',
    name: 'of Reach',
    appliesTo: ['gear'],
    tags: ['area', 'clear'],
    tiers: [
      { ilvl: 35, weight: 250, stats: [{ stat: 'areaOfEffect', form: 'inc', range: [18, 26] }] },
      { ilvl: 1, weight: 600, stats: [{ stat: 'areaOfEffect', form: 'inc', range: [6, 15] }] },
    ],
  },
  {
    // Untagged, so it scales every damage type including typeless.
    id: 'inc_damage_generic',
    slot: 'offence',
    name: 'Honed',
    appliesTo: ['gear'],
    tags: ['damage'],
    tiers: [
      { ilvl: 55, weight: 200, stats: [{ stat: 'damage', form: 'inc', range: [20, 30] }] },
      { ilvl: 1, weight: 640, stats: [{ stat: 'damage', form: 'inc', range: [8, 16] }] },
    ],
  },
];

// --- gear: UTILITY = everything that isn't damage --------------------------
//
// Only boots and amulets have these slots — three on the whole character —
// which is what stops universally-useful mods from being free power.
export const GEAR_UTILITY_MODS: ModDef[] = [
  {
    id: 'move_speed',
    slot: 'utility',
    name: 'of the Wind',
    appliesTo: ['gear'],
    tags: ['speed', 'clear'],
    tiers: [
      { ilvl: 50, weight: 150, stats: [{ stat: 'moveSpeed', form: 'inc', range: [25, 30] }] },
      { ilvl: 20, weight: 400, stats: [{ stat: 'moveSpeed', form: 'inc', range: [15, 24] }] },
      { ilvl: 1, weight: 700, stats: [{ stat: 'moveSpeed', form: 'inc', range: [5, 14] }] },
    ],
  },
  {
    id: 'attack_range',
    slot: 'utility',
    name: 'of Extension',
    appliesTo: ['gear'],
    tags: ['utility'],
    tiers: [
      { ilvl: 40, weight: 260, stats: [{ stat: 'attackRange', form: 'inc', range: [12, 20] }] },
      { ilvl: 1, weight: 640, stats: [{ stat: 'attackRange', form: 'inc', range: [5, 11] }] },
    ],
  },
  {
    // Same meaning as the crystal's rarity: better classes of currency drop.
    id: 'gear_rarity',
    slot: 'utility',
    name: 'of Fortune',
    appliesTo: ['gear'],
    tags: ['reward', 'utility'],
    tiers: [
      { ilvl: 45, weight: 220, stats: [{ stat: 'rarity', form: 'flat', range: [18, 30] }] },
      { ilvl: 1, weight: 600, stats: [{ stat: 'rarity', form: 'flat', range: [6, 15] }] },
    ],
  },
  {
    // Chance that currency drops at all, as opposed to how good it is.
    // Gold goes stale; the scarce classes never do.
    id: 'currency_find',
    slot: 'utility',
    name: 'of Avarice',
    appliesTo: ['gear'],
    tags: ['reward', 'utility'],
    tiers: [
      { ilvl: 45, weight: 220, stats: [{ stat: 'currencyFind', form: 'inc', range: [20, 34] }] },
      { ilvl: 1, weight: 600, stats: [{ stat: 'currencyFind', form: 'inc', range: [8, 18] }] },
    ],
  },
];

// --- generated: one family per damage type ---------------------------------
//
// A new entry in DAMAGE_TYPES gets flat damage, increased damage and a
// resistance automatically, which is the whole point of the table.

const FLAT_DAMAGE_NAMES: Record<string, string> = {
  physical: 'Weighted',
  fire: 'Smouldering',
  cold: 'Frostbound',
  lightning: 'Thunderstruck',
  poison: 'Venomous',
  dark: 'Shrouded',
  light: 'Radiant',
  prismatic: 'Faceted',
};

const INC_DAMAGE_NAMES: Record<string, string> = {
  physical: 'Heavy',
  fire: 'Blazing',
  cold: 'Glacial',
  lightning: 'Storming',
  poison: 'Virulent',
  dark: 'Umbral',
  light: 'Brilliant',
  prismatic: 'Refracting',
};

/**
 * Delivery tags: HOW, where a damage type is WHAT. Skill tags ride along in
 * every damage pass, so ['projectile'] scales any projectile skill whatever
 * its element — and why a damage type must NEVER appear in a skill's tags.
 */
export const DELIVERY_TAGS = ['melee', 'projectile', 'spell', 'area'] as const;

const DELIVERY_NAMES: Record<string, string> = {
  melee: 'Brutal',
  projectile: 'Sharpshooter',
  spell: 'Arcane',
  area: 'Sweeping',
};

const DELIVERY_DAMAGE_MODS: ModDef[] = DELIVERY_TAGS.map((tag) => ({
  id: `inc_${tag}_damage`,
  slot: 'offence',
  name: `${DELIVERY_NAMES[tag]}`,
  appliesTo: ['gear'],
  tags: ['damage', tag],
  tiers: [
    {
      ilvl: 50,
      weight: 240,
      stats: [{ stat: 'damage', form: 'inc' as const, range: [30, 45] as [number, number], tags: [tag] }],
    },
    {
      ilvl: 1,
      weight: 720,
      stats: [{ stat: 'damage', form: 'inc' as const, range: [12, 24] as [number, number], tags: [tag] }],
    },
  ],
}));

/**
 * What scales an AILMENT, and the only gear that does. `overTime` reaches every
 * damage ailment; a per-ailment line reaches one. Neither is tagged spell,
 * attack or critical, which is the whole of why none of those touch a Burn.
 */
const AILMENT_MODS: ModDef[] = [
  {
    id: 'inc_over_time_damage',
    slot: 'offence',
    name: 'Lingering',
    appliesTo: ['gear'],
    tags: ['damage', 'overTime'],
    tiers: [
      { ilvl: 45, weight: 260, stats: [{ stat: 'damage', form: 'inc', range: [26, 40], tags: ['overTime'] }] },
      { ilvl: 1, weight: 700, stats: [{ stat: 'damage', form: 'inc', range: [10, 22], tags: ['overTime'] }] },
    ],
  },
  ...AILMENTS.filter((a) => a.dps).map((a) => ({
    id: `inc_${a.id}_damage`,
    slot: 'offence' as const,
    name: `of ${a.name}s`,
    appliesTo: ['gear' as const],
    tags: ['damage', a.id],
    tiers: [
      {
        ilvl: 40,
        weight: 220,
        stats: [{ stat: 'damage', form: 'inc' as const, range: [34, 52] as [number, number], tags: [a.id] }],
      },
      {
        ilvl: 1,
        weight: 620,
        stats: [{ stat: 'damage', form: 'inc' as const, range: [14, 28] as [number, number], tags: [a.id] }],
      },
    ],
  })),
  // Not for a `bySource` ailment: Poison is applied BY a skill and never by
  // dealing the type, so a chance to apply one is a line that does nothing.
  ...AILMENTS.filter((a) => !a.bySource).map((a) => ({
    id: `chance_${a.id}`,
    slot: 'offence' as const,
    name: `of the ${a.name}`,
    appliesTo: ['gear' as const],
    tags: ['ailment', a.id],
    tiers: [
      {
        ilvl: 35,
        weight: 200,
        stats: [{ stat: 'ailmentChance', form: 'flat' as const, range: [18, 30] as [number, number], tags: [a.id] }],
      },
      {
        ilvl: 1,
        weight: 560,
        stats: [{ stat: 'ailmentChance', form: 'flat' as const, range: [7, 15] as [number, number], tags: [a.id] }],
      },
    ],
  })),
];

const TYPED_DAMAGE_MODS: ModDef[] = DAMAGE_TYPES.flatMap((type) => [
  {
    id: `flat_${type.id}_damage`,
    slot: 'offence',
    name: FLAT_DAMAGE_NAMES[type.id] ?? type.name,
    appliesTo: ['gear'],
    tags: ['damage', type.id, ...(type.group ? [type.group] : [])],
    tiers: [
      {
        ilvl: 45,
        weight: 380,
        stats: [{ stat: 'damage', form: 'flat', range: [12, 24], tags: [type.id] }],
      },
      {
        ilvl: 1,
        weight: 880,
        stats: [{ stat: 'damage', form: 'flat', range: [3, 8], tags: [type.id] }],
      },
    ],
  },
  {
    id: `inc_${type.id}_damage`,
    slot: 'offence',
    name: INC_DAMAGE_NAMES[type.id] ?? type.name,
    appliesTo: ['gear'],
    tags: ['damage', type.id, ...(type.group ? [type.group] : [])],
    tiers: [
      {
        ilvl: 55,
        weight: 240,
        stats: [{ stat: 'damage', form: 'inc', range: [45, 65], tags: [type.id] }],
      },
      {
        ilvl: 1,
        weight: 860,
        stats: [{ stat: 'damage', form: 'inc', range: [18, 34], tags: [type.id] }],
      },
    ],
  },
]);

/** Single-type resistances roll high; group resistances roll low but wide. */
const RESISTANCE_MODS: ModDef[] = [
  ...DAMAGE_TYPES.map((type) => ({
    id: `${type.id}_resist`,
    slot: 'defence',
    name: `of ${type.name} Warding`,
    appliesTo: ['gear'],
    tags: ['resistance', type.id, ...(type.group ? [type.group] : [])],
    tiers: [
      {
        ilvl: 40,
        weight: 320,
        stats: [{ stat: `${type.id}Res`, form: 'flat' as const, range: [26, 38] as [number, number] }],
      },
      {
        ilvl: 1,
        weight: 820,
        stats: [{ stat: `${type.id}Res`, form: 'flat' as const, range: [10, 22] as [number, number] }],
      },
    ],
  })),
  ...DAMAGE_GROUPS.map((group) => ({
    id: `${group}_resist`,
    slot: 'defence',
    name: group === 'elemental' ? 'of the Bulwark' : 'of the Veil',
    appliesTo: ['gear'],
    tags: ['resistance', group],
    tiers: [
      {
        ilvl: 50,
        weight: 200,
        stats: [{ stat: `${group}Res`, form: 'flat' as const, range: [12, 18] as [number, number] }],
      },
      {
        ilvl: 1,
        weight: 520,
        stats: [{ stat: `${group}Res`, form: 'flat' as const, range: [5, 11] as [number, number] }],
      },
    ],
  })),
];

/** Every POINT pays. There is no step to bank toward and nothing is floored,
 *  so a point spent is a number that moved. */
export const ATTRIBUTE_STEP = 1;

/**
 * The four, and what one POINT of each is worth. Every line is an ordinary
 * stat under a name the modifier engine already reads, so an attribute
 * reaches the sim by exactly the path gear does. The TAGS are the whole of
 * what keeps them apart: a critical chance tagged `attack` does nothing for a
 * spell, and `attackSpeed` is already the wrong stat for one, so Dexterity
 * and Acuity are two halves of one shape rather than a stat with a switch.
 */
export const ATTRIBUTES: AttributeDef[] = [
  {
    id: 'strength',
    name: 'Strength',
    per: [
      { stat: 'damage', form: 'inc', value: 1, tags: ['attack'] },
      { stat: 'life', form: 'inc', value: 0.6, tags: [] },
    ],
  },
  {
    id: 'intelligence',
    name: 'Intelligence',
    per: [
      { stat: 'damage', form: 'inc', value: 1, tags: ['spell'] },
      { stat: 'mana', form: 'inc', value: 1.2, tags: [] },
    ],
  },
  {
    id: 'dexterity',
    name: 'Dexterity',
    per: [
      { stat: 'critChance', form: 'inc', value: 1.5, tags: ['attack'] },
      { stat: 'attackSpeed', form: 'inc', value: 0.4, tags: [] },
    ],
  },
  {
    id: 'acuity',
    name: 'Acuity',
    per: [
      { stat: 'critChance', form: 'inc', value: 1.5, tags: ['spell'] },
      { stat: 'castSpeed', form: 'inc', value: 0.4, tags: [] },
    ],
  },
  {
    id: 'spirit',
    name: 'Spirit',
    per: [
      { stat: 'lifeRegen', form: 'inc', value: 2, tags: [] },
      { stat: 'manaRegen', form: 'inc', value: 2, tags: [] },
    ],
  },
  {
    id: 'constitution',
    name: 'Constitution',
    per: [
      { stat: 'armour', form: 'inc', value: 1.5, tags: [] },
      { stat: 'elementalRes', form: 'flat', value: 0.3, tags: [] },
      { stat: 'occultRes', form: 'flat', value: 0.3, tags: [] },
    ],
  },
];

export const ATTRIBUTE_BY_ID: Record<string, AttributeDef> = Object.fromEntries(
  ATTRIBUTES.map((a) => [a.id, a])
);

/** One per attribute, so the four you SPEND points on are also four you can
 *  find. `ATTRIBUTE_STEP` is 1, so a point off a ring is worth a point spent,
 *  and `attributeMod` adds the two before it works out what they buy. */
const ATTRIBUTE_MODS: ModDef[] = ATTRIBUTES.map((attr) => ({
  id: `attr_${attr.id}`,
  slot: 'offence' as const,
  name: `of the ${attr.name}`,
  appliesTo: ['gear' as const],
  tags: ['attribute', attr.id],
  tiers: [
    {
      ilvl: 40,
      weight: 240,
      stats: [{ stat: attr.id, form: 'flat' as const, range: [14, 26] as [number, number], tags: [] }],
    },
    {
      ilvl: 1,
      weight: 620,
      stats: [{ stat: attr.id, form: 'flat' as const, range: [4, 12] as [number, number], tags: [] }],
    },
  ],
}));

export const GEAR_MODS: ModDef[] = [
  ...ATTRIBUTE_MODS,
  ...GEAR_MAIN_MODS,
  ...GEAR_SECONDARY_MODS,
  ...GEAR_UTILITY_MODS,
  ...TYPED_DAMAGE_MODS,
  ...DELIVERY_DAMAGE_MODS,
  ...AILMENT_MODS,
  ...RESISTANCE_MODS,
];

/**
 * What somebody will write over a base's own line, and nothing else in the game
 * can. Never rolled — weight 0, and the pool is weighted — but present in
 * `ALL_MODS`, so a save resolves one and `npm run mods` holds it to the same
 * rules as a line that drops.
 *
 * `kinds` is which gear a line may be grafted onto, read by the panel rather
 * than by `appliesTo`: a graft is not a currency and never asks the pool.
 * `who` is whose room it is written in — the man who takes bodies has no
 * opinion about a ring, and says so out loud.
 */
export interface ForgedDef {
  mod: ModDef;
  kinds: string[];
  who: string; // a `SceneDef` id
}

export const FORGED: ForgedDef[] = [
  {
    who: 'ossuary',
    kinds: ['helmet'],
    mod: {
      id: 'forged_burst',
      slot: 'implicit',
      name: 'Bone-Ledger',
      appliesTo: ['gear'],
      tags: ['forged'],
      grants: { explodeOnKill: { radius: 2, multiplier: 0.35 } },
      tiers: [
        { ilvl: 1, weight: 0, stats: [{ stat: 'critChance', form: 'inc', range: [40, 40] }] },
      ],
    },
  },
  {
    who: 'ossuary',
    kinds: ['body'],
    mod: {
      id: 'forged_bleed',
      slot: 'implicit',
      name: 'Wound-Keeper',
      appliesTo: ['gear'],
      tags: ['forged'],
      grants: { bleedOnHit: { seconds: 3, multiplier: 0.4 } },
      tiers: [
        { ilvl: 1, weight: 0, stats: [{ stat: 'life', form: 'flat', range: [40, 40] }] },
      ],
    },
  },
  {
    who: 'ossuary',
    kinds: ['boots'],
    mod: {
      id: 'forged_stride',
      slot: 'implicit',
      name: 'Long-Gait',
      appliesTo: ['gear'],
      tags: ['forged'],
      tiers: [
        { ilvl: 1, weight: 0, stats: [{ stat: 'moveSpeed', form: 'more', range: [18, 18] }] },
      ],
    },
  },
  // Jewellery has no implicit, so a graft here ADDS where there is nothing —
  // which is why the one that changes the DELIVERY charges mana for it, the
  // same rule the trees follow. The other is conditional damage, and free.
  {
    who: 'orrery',
    kinds: ['ring'],
    mod: {
      id: 'forged_facet',
      slot: 'implicit',
      name: 'Facet-Cut',
      appliesTo: ['gear'],
      tags: ['forged'],
      grants: { burstOnHit: { every: 5, perLevel: 3.5 } },
      tiers: [
        { ilvl: 1, weight: 0, stats: [{ stat: 'damage', form: 'inc', range: [10, 10] }] },
      ],
    },
  },
  {
    who: 'orrery',
    kinds: ['amulet'],
    mod: {
      id: 'forged_angle',
      slot: 'implicit',
      name: 'Long-Angle',
      appliesTo: ['gear'],
      tags: ['forged'],
      grants: { untouchedMore: { after: 3, more: 1.25 } },
      tiers: [
        { ilvl: 1, weight: 0, stats: [{ stat: 'attackRange', form: 'flat', range: [1, 1] }] },
      ],
    },
  },
];

export const FORGED_MODS: ModDef[] = FORGED.map((f) => f.mod);
export const FORGED_BY_ID: Record<string, ForgedDef> = Object.fromEntries(
  FORGED.map((f) => [f.mod.id, f])
);

export const ALL_MODS: ModDef[] = [...CRYSTAL_MODS, ...GEAR_MODS, ...FORGED_MODS];

export const MOD_BY_ID: Record<string, ModDef> = Object.fromEntries(
  ALL_MODS.map((m) => [m.id, m])
);

/**
 * The crafting currencies. Adding one is an entry here; new code is only for a
 * new KIND of mutation. Six: add one, remove one you choose, re-roll which,
 * re-roll the values, and the two gambles.
 */
export const CURRENCIES: CurrencyDef[] = [
  // --- basic: the one thing the shop sells --------------------------------
  {
    id: 'shard_of_making',
    name: 'Shard of Making',
    class: 'basic',
    description: 'Adds 1 random modifier, in an empty slot.',
    targets: {},
    requires: [{ kind: 'not_corrupted' }, { kind: 'has_open_slot' }],
    effects: [{ kind: 'add_mod', count: 1 }],
  },

  // --- uncommon: reshaping something you already have ---------------------
  {
    id: 'shard_of_change',
    name: 'Shard of Change',
    class: 'uncommon',
    description: 'Re-rolls the numeric values of all modifiers.',
    targets: {},
    requires: [{ kind: 'not_corrupted' }, { kind: 'mod_count', min: 1 }],
    effects: [{ kind: 'reroll_values' }],
  },
  {
    id: 'shard_of_chaos',
    name: 'Shard of Chaos',
    class: 'uncommon',
    description: 'Re-rolls which modifiers an item has, keeping the same number.',
    targets: {},
    requires: [{ kind: 'not_corrupted' }, { kind: 'mod_count', min: 1 }],
    effects: [{ kind: 'reroll_mods' }],
  },
  {
    id: 'essence_of_the_swarm',
    name: 'Essence of the Swarm',
    class: 'uncommon',
    description: 'Adds 1 modifier, in an empty slot, guaranteed to be a Density one.',
    // Targeting, on purpose, and only here: a crystal is a configuration you
    // are meant to be able to aim, and none of the gear chase runs through it.
    targets: { kinds: ['crystal'] },
    requires: [{ kind: 'not_corrupted' }, { kind: 'has_open_slot' }],
    effects: [{ kind: 'add_mod', tag: 'density' }],
  },
  {
    id: 'essence_of_greed',
    name: 'Essence of Greed',
    class: 'uncommon',
    description: 'Adds 1 modifier, in an empty slot, guaranteed to be a Hunting one — which KIND of gear the run turns up, never which piece.',
    targets: { kinds: ['crystal'] },
    requires: [{ kind: 'not_corrupted' }, { kind: 'has_open_slot' }],
    effects: [{ kind: 'add_mod', tag: 'finding' }],
  },

  // --- rare: the one currency you aim ------------------------------------
  {
    id: 'shard_of_unmaking',
    name: 'Shard of Unmaking',
    class: 'rare',
    // The whole bench is random except this. Choosing what LEAVES is the one
    // targeting that does not collapse the chase — you still cannot choose
    // what arrives.
    description: 'Removes 1 modifier: the one you point at.',
    targets: {},
    requires: [{ kind: 'not_corrupted' }, { kind: 'mod_count', min: 1 }],
    effects: [{ kind: 'remove_mod', count: 1, chosen: true }],
  },

  // --- exotic: the last thing you do to an item --------------------------
  //
  // Both gambles lock the item, and both say so before you spend one. A
  // one-way door nobody saw is a bug report.
  {
    id: 'sigil_of_finality',
    name: 'Sigil of Finality',
    class: 'exotic',
    // The last thing you do to an item comes from the one place that takes
    // two of each crystal to open: the top of both axes at once.
    gate: { zone: 'seam' },
    description:
      'Empowers or diminishes every modifier by 25% at random, past its normal ' +
      'maximum, then locks the item permanently.',
    targets: {},
    requires: [{ kind: 'not_corrupted' }, { kind: 'mod_count', min: 1 }],
    // Scaling what is already rolled, rather than adding, means the better the
    // item the more the gamble costs you. It is also the only thing in the game
    // that can put a roll above its modifier's ceiling.
    effects: [{ kind: 'scale_values', magnitude: 0.25 }, { kind: 'corrupt' }],
  },
  {
    id: 'sigil_of_upheaval',
    name: 'Sigil of Upheaval',
    class: 'exotic',
    gate: { zone: 'demonic' },
    description:
      'Adds 1 modifier beyond the item\'s limit, or takes 1 away at random, ' +
      'then locks the item permanently.',
    targets: {},
    requires: [{ kind: 'not_corrupted' }, { kind: 'mod_count', min: 1 }],
    effects: [{ kind: 'gamble_mod' }, { kind: 'corrupt' }],
  },
];

export const CURRENCY_BY_ID: Record<string, CurrencyDef> = Object.fromEntries(
  CURRENCIES.map((c) => [c.id, c])
);

// --- recipes ---------------------------------------------------------------
//
// Gold is the universal feedstock and selling is where it comes from. One
// spent on stash space is one not spent at the bench.

/** A crystal's level is its MOD CAPACITY and nothing else: two blank level 4s
 *  are as dangerous as two blank level 1s. `xp` is the total to sit at it. */
/** A LEVEL BUYS `mods` — lines it holds — and `tier`, the best gear BASE a run
 *  may drop. Levelling IS gear progression, so `xp` is a real climb. */
export const CRYSTAL_LEVELS = [
  { level: 1, mods: 0, tier: 1, xp: 0 },
  { level: 2, mods: 1, tier: 1, xp: 25 },
  { level: 3, mods: 2, tier: 2, xp: 120 },
  { level: 4, mods: 3, tier: 3, xp: 400 },
];

/** WHICH TIER A LEVEL ROLLS — a LIFT, never a gate: an entry's weight raised to
 *  how far its tier sits above the worst its modifier has, so the best and the
 *  worst both stay possible at every level. Indexed by level, 1 first. */
export const MOD_TIER_LIFT = [1, 1.2, 2, 3.6];

export const tierForLevel = (level: number): number =>
  CRYSTAL_LEVELS.find((l) => l.level === Math.round(level))?.tier ?? 1;

/** ONE STEP OF THE CRYSTAL LADDER: a crystal, and the one thing true before it
 *  is handed over. *"Normal crystals pay out at 25/50/75/100 runs of this new
 *  zone. Prismatic crystal pays out and full lvl 4 normal crystals, then
 *  another at level 2 prismatic, another at level 3, another at lvl 4, and then
 *  the same thing for demonic."* */
export interface CrystalStep {
  id: string;
  family: MonsterFamily;
  clears?: number; // PROVING GROUND clears, which is what buys the Normal four
  hold?: { family: MonsterFamily; count: number; level: number };
}

/** IN ORDER: nothing is skipped, so the step you are on is the only one owed. */
export const CRYSTAL_LADDER: CrystalStep[] = [
  { id: 'normal_1', family: 'normal', clears: 25 },
  { id: 'normal_2', family: 'normal', clears: 50 },
  { id: 'normal_3', family: 'normal', clears: 75 },
  { id: 'normal_4', family: 'normal', clears: 100 },
  { id: 'prismatic_1', family: 'prismatic', hold: { family: 'normal', count: 4, level: 4 } },
  { id: 'prismatic_2', family: 'prismatic', hold: { family: 'prismatic', count: 1, level: 2 } },
  { id: 'prismatic_3', family: 'prismatic', hold: { family: 'prismatic', count: 1, level: 3 } },
  { id: 'prismatic_4', family: 'prismatic', hold: { family: 'prismatic', count: 1, level: 4 } },
  { id: 'demonic_1', family: 'demonic', hold: { family: 'prismatic', count: 4, level: 4 } },
  { id: 'demonic_2', family: 'demonic', hold: { family: 'demonic', count: 1, level: 2 } },
  { id: 'demonic_3', family: 'demonic', hold: { family: 'demonic', count: 1, level: 3 } },
  { id: 'demonic_4', family: 'demonic', hold: { family: 'demonic', count: 1, level: 4 } },
];

export const CRYSTAL_STEP_BY_ID: Record<string, CrystalStep> = Object.fromEntries(
  CRYSTAL_LADDER.map((c) => [c.id, c])
);

/** What a clear is worth to every SOCKETED crystal. Danger multiplies; the flat
 *  term is why it is `1 + danger`, or four blanks would never level. */
export const CRYSTAL_XP = {
  perClear: 1,
  /** Danger points that add one clear's worth on top. */
  perDanger: 55,
};

/** Who meets you at the mouth of a cleared descent and hands things over in
 *  person. What is waiting is SCHEDULED — `giftWaiting` — never rolled. */
export const LAMPWRIGHT = {
  name: 'the Lampwright',
  sprite: 'lampwright', // in BEASTIARY; the map and the panel draw the same one
  scene: 'workshop', // the room he is met in, in `SCENES`
  /** Said in the log the moment you come up in his room, before the walk. */
  seen: 'A lantern, further back than you have been. Something is holding it up.',
  /** Level 1 holds 0 modifiers: it is socketed blank, and the descent it makes
   *  longer is the whole of what it does until using it buys a slot. */
  level: 1,
  family: 'normal' as MonsterFamily,

  /**
   * What is said at the mouth. FLAVOUR, not instruction: the guided opening is
   * what points at buttons, and he has been down there long enough that he is
   * no good at explaining anything. Nothing in his mouth names a screen, a
   * currency or a number — §2's numbers rule is about mechanics, not voice.
   */
  first: {
    title: 'The Lampwright',
    beats: [
      {
        said: 'Going down. Everyone is, when they come past me. Most of them are only going down the once.',
        act: 'face',
      },
      {
        said: 'It does not end where you think it ends. There is always another way further in, and the things in it get their opinions from somewhere deeper than you.',
        act: 'pace',
      },
      {
        said: 'Do not go with nothing in your hands. Take this one — I have carried it a long way and it has never once been any use to me.',
        act: 'work',
      },
      {
        said: 'The stair behind me keeps going. I stopped following it. You will not.',
        act: 'face',
      },
    ] as SceneBeat[],
    button: 'Take it',
  },
  /** The crystal, which is the first thing that changes what a descent IS. */
  crystal: {
    title: 'The Lampwright',
    beats: [
      {
        said: 'Now this. I have been keeping it for whoever came back up enough times, and that is you.',
        act: 'face',
      },
      {
        said: 'Carry one of these down and the Fissure goes on. And on. Same crack, same rock, and it does not end when it used to end. I have never worked out where the extra comes from.',
        act: 'pace',
      },
      {
        said: 'And it changes, the longer you hold it. Slowly. Whatever you feed it, it wants the same thing again.',
        act: 'work',
      },
    ] as SceneBeat[],
    button: 'Take it',
  },
  /** THE END OF THE CAMPAIGN, which is the one thing he has been waiting for.
   *  Three bosses down and the climb whole; what he hands over is the first
   *  crystal out of the wall and the first points on the web. */
  campaign: {
    title: 'The Lampwright',
    beats: [
      {
        said: 'You went all the way down. Nobody has done that and come back up past me. I had stopped watching the stair.',
        act: 'face',
      },
      {
        said: 'So there is nothing under it after all. Only more of it, and it wants something else from you now.',
        act: 'pace',
      },
      {
        said: 'Here. I have been keeping these two for whoever finished it, and I had begun to think that was nobody.',
        act: 'work',
      },
    ] as SceneBeat[],
    button: 'Take them',
  },
  /** EVERY CRYSTAL AFTER THE CAMPAIGN'S. Said each time, so it is short and it
   *  does not pretend to be an occasion the way the first two were. */
  deeper: {
    title: 'The Lampwright',
    beats: [
      { said: 'Another one. They come up out of the wall down there faster than I can carry them.', act: 'work' },
      { said: 'Take it. I have stopped asking what it is I am handing you.', act: 'face' },
    ] as SceneBeat[],
    button: 'Take it',
  },
  again: {
    title: 'The Lampwright',
    // He KEEPS a counter, so the line that plays when he owes nothing has to
    // say what clicking him does next.
    beats: [
      { said: 'You went and got this one. I only carried it up.', act: 'work' },
      { said: 'I keep a shelf here. Shards, mostly. Come and look when you have the gold.', act: 'face' },
    ] as SceneBeat[],
    button: 'Take it',
  },
};

/** WHERE SOMEBODY IS FOUND: their own world, at every `every` depth from the
 *  `first` and SCHEDULED, so a zone's people are met inside that zone's stretch
 *  of the campaign. The shortest zone's 12 is three meetings against two. */
export const MEET = { first: 2, every: 4 };

/** The opening, in numbers: the one stretch where what happens next is
 *  scheduled rather than earned. */
export const INTRO = {
  /** What the first crystal is paid for, with a notable taken in the ACTIVE
   *  skill's tree: the cheapest is 4 points away — a way off the centre, a
   *  step onto the ring, and the short chain there. */
  crystalSkillLevel: 4,
  /** Forced onto that crystal by the first Shard of Making spent on it, at its
   *  cheapest tier, so a first crystal can never be what walls the game. */
  scriptedMod: 'layout_maze',
  /** Handed over with it: a taught craft nobody can afford teaches nothing. */
  scriptedCurrency: 'shard_of_making',
  /** Two crystals set in the wall is what it takes for somebody to object. */
  bossSockets: 2,
  bossScene: 'reading_room',
  /** Where his key's fight is: the fifth socket is the only way in. */
  bossRoom: 'answering_hall',
};

/** WHAT CLEARING THE CAMPAIGN PAYS: *"1 crystal and 10 trial points"* — one
 *  crystal and the first 10 TALLIES. */
export const CAMPAIGN_REWARD = { crystals: 1, points: 10 };

export const CRYSTAL_ILVL = 70;

// --- combat baselines ------------------------------------------------------
//
// Before any gear, and before any crystal mods. Distances in tiles, speeds in
// tiles/second, rates per second.

// Deliberately generous. A character that insta-dies makes the game
// unwatchable, which blocks judging whether the loop is any fun — so when in
// doubt these go up, not down. Tune for real once the systems stop moving.
export const HERO_BASE = {
  life: 320,
  attacksPerSecond: 1.2,
  critChance: 5,
  /** Extra percent on a crit, on top of the base doubling. */
  critMultiplier: 0,
  moveSpeed: 2.9,
  armour: 0,
  attackRange: 1.7,
  /** Body radius in tiles. */
  radius: 0.34,
  /** How far the hero will notice a monster and divert to fight it. */
  aggroRange: 9,
  /**
   * Percent of max life per second. Recovery between packs is what makes a run
   * a series of fights rather than one attrition curve. Tuned so an ungeared
   * level 1 finishes the Fissure about a third down: hurt, never threatened.
   */
  lifeRegenPercent: 0.55,

  /** Never grows with a level, where life does: sustain is bought. */
  mana: 80,
  /** Percent of max mana per second. */
  manaRegenPercent: 4.5,
};

/** What a skill costs, and what is left when you cannot pay. */
export const MANA = {
  /** Every bare skill costs this much per second once its rate is counted. */
  costPerSecond: 9,
  /** How far one may sit either side of it before the demo objects. */
  costTolerance: 0.12,
  starvedDamage: 0.5, // STARVED: the share of your damage a cast with an empty pool lands for
  /** Ceiling on `manaShield`: past this the pool would be a second life bar. */
  shieldCap: 0.6,
};

/**
 * What the projectile keywords are worth. `KEYWORDS` quotes these and
 * `SKILL_BEHAVIOURS.projectile` acts on them, so glossary and sim cannot
 * drift. Area of Effect reaches none: it would turn +1 Projectile into a room.
 */
export const PROJECTILE = {
  spread: 3.5, // how far a Projectile past the first looks, from your target
  arc: 4.5, // how far an Arc leaps, from the last thing hit
  pierce: 4.5, // how far past the target a Pierce carries
  corridor: 0.85, // half-width of the corridor a Pierce searches
  pierceDamage: 0.7, // what a pierced enemy takes unless a talent says otherwise
  arcDamage: 0.7, // and what an arced-to one takes
  fork: 3.2, // how far a Fork falls, from the enemy you aimed at
  forkDamage: 0.45, // and what it lands for. A Fork is a second bolt, not the same one
};

/** An Echo is the same blow arriving at the next body out, each one looking
 *  FURTHER — so buying more reaches deeper with no second switch for range. */
export const MELEE = {
  echo: 1.5, // how far the FIRST Echo looks, from the enemy you struck
  echoStep: 0.6, // and how much further out each one after it may look
  echoDamage: 0.7, // what an Echo lands for, where the one you aimed at takes all
};

/** AMBUSH puts you BEHIND the body before it hits it, and a Critical does the
 *  whole thing again on somebody else. The follow-up is DELAYED on purpose:
 *  instant, it reads as one hit doing double damage rather than as a second
 *  teleport, and watching it happen is the point of the node. */
export const AMBUSH = {
  behind: 0.45, // the gap past both bodies' radii: touching, the two sprites overlap
  chainDelay: 0.3, // seconds before a Critical's follow-up lands
  chainReach: 9, // how far a follow-up may cross, in tiles
  chainDamage: 0.7, // what it lands for, where the one you aimed at takes all
};

/** A killed enemy's Burst sets off the Burst of whatever IT kills, so a floor
 *  packed tightly enough goes up off one cast. Depth is a COUNT and never a
 *  time or a budget — one seed has to replay one chain. */
export const BURST = {
  chainDepth: 8, // how many times a death may set off the next death's Burst
};

/**
 * A trade is the part of a character that is not the skill, and its points are
 * their own currency: funded by CHARACTER level, so walking one never competes
 * with a skill tree for the same point.
 */
export const TRADE = {
  firstAt: 5, // the level that picks the trade AND hands over the first pair
  levelsPerGrant: 20, // so the three pairs land at 5, 25 and 45
  pointsPerGrant: 2, // TWO AT A TIME: a notable is two steps on, so a pair buys one

  maxPoints: 6,
  /** Gold to take every ATTRIBUTE point back, per level: the one allocation a
   *  click cannot undo. The TRADE is permanent — *"I think trade should be a
   *  permanent decision"* — so nothing buys a different one. */
  respecPerLevel: 40,
};

/**
 * What a monster is before any crystal says anything — which is to say, what
 * the bare Fissure is made of. Crystal modifiers are the whole climb from here,
 * so these are the floor of the game rather than a rung on it.
 */
export const MONSTER_BASE = {
  /** High enough that a pack survives long enough to swing back. */
  life: 34,
  damage: 3.26,
  attacksPerSecond: 0.8,
  moveSpeed: 2.3,
  attackRange: 1.3,
  aggroRange: 8,
};

/** How long a descent runs, indexed by FILLED SOCKETS — index 0 is the bare
 *  Fissure. Length only: what a socket holds is the difficulty, never the count.
 *  `size` is linear, so area goes as its square. */
export const SOCKET_SCALE = {
  size: [0.62, 1, 1.15, 1.3, 1.45],
  packs: [0.66, 1, 1.5, 2, 2.5],
  /** Thinner packs at the bottom: length is survived by walking out hurt, where
   *  a full-sized pack of 50 kills a character one clear old. */
  packSize: [0.66, 0.8, 1, 1, 1],
};

const rung = (n: number, table: number[]): number =>
  table[Math.min(Math.max(0, Math.round(n)), table.length - 1)];

export const socketSize = (filled: number): number => rung(filled, SOCKET_SCALE.size);
export const socketPacks = (filled: number): number => rung(filled, SOCKET_SCALE.packs);
export const socketPackSize = (filled: number): number => rung(filled, SOCKET_SCALE.packSize);

/** THE LADDER, in order. A RUNG is CHOSEN, one cleared stays open, and its
 *  difficulty rides the crystal seam through `rungMod`. `*AtTop` is the LAST
 *  depth of the LAST zone, and the ramp to it is STRAIGHT — every step costs
 *  the same, so the climb is one line rather than three. */
export const LADDER = {
  // THE CAMPAIGN, run with NOTHING SOCKETED, so each zone carries the two things
  // a crystal would otherwise decide: the WORLD you walk into and the best base
  // TIER its depths drop. `arena` is its LAST depth, a fight rather than a
  // descent; `id` is the save key, still spelt the way the worlds were.
  zones: [
    {
      id: 'fissure', name: 'The Answering', art: 'climb_act1',
      blurb: 'Shallow workings, shored and square. Somebody came back out of these.',
      rungs: 12, arena: 'answering_hall', world: 'fissure', tier: 1,
    },
    {
      id: 'prismatic', name: 'The Refraction', art: 'climb_act2',
      blurb: 'Below daylight, where the rock has started closing what was cut.',
      rungs: 14, arena: 'refraction_hall', world: 'prismatic', tier: 2,
    },
    {
      id: 'demonic', name: 'The Flowering', art: 'climb_act3',
      blurb: 'Older than anybody who dug toward it. Nothing down here was worked.',
      rungs: 16, arena: 'flowering_hall', world: 'demonic', tier: 3,
    },
  ] as LadderZoneDef[],
  lifeAtTop: 520,
  damageAtTop: 430,
  packAtTop: 55,
};

/** THE PROVING GROUND: one area past the climb, at a set floor. *"A set
 *  difficulty even harder than the final 'story mode' level which you can scale
 *  with more crystals and more trial points."* `rungMod` is 1 at depth 42, so
 *  `overTop` is a MULTIPLE of it; Tallies scale it through the Reckoning. */
export const PROVING = {
  name: 'The Proving Ground',
  blurb: 'Past the last of the climb, and it does not end. What you socket is where you go.',
  overTop: 1.25,
  perSocket: 0.15,
  tier: 3, // the best gear BASE it drops, floored as a campaign zone floors it
  influences: ['fissure', 'prismatic', 'demonic'] as MapTheme[], // never the Seam
  seamOf: 2, // of EACH aura world, at the top level, and nothing else socketed
};

/** Rungs below this one across the WHOLE ladder. */
export function rungsBelow(zone: number, rung: number): number {
  let below = 0;
  for (let z = 0; z < zone; z++) below += LADDER.zones[z]?.rungs ?? 0;
  return below + Math.max(0, rung - 1);
}

export const LADDER_RUNGS = LADDER.zones.reduce((n, z) => n + z.rungs, 0);

/** What DANGER does to the bodies in a map. Danger 0 is exactly 1, so a new
 *  character's Fissure is untouched. */
export const DANGER = {
  lifeAtTop: 10, // what the top of the curve adds to a body's life
  hitAtTop: 14, //  and to its hit
};

/** How far up that curve a map sits, 0 to 1. Sockets are LENGTH, so they stay
 *  out of it however much run power they buy. */
export const dangerStep = (danger: number): number =>
  Math.min(POWER.max, danger / POWER.perDanger) / POWER.max;

/** RUN POWER: the one number every reward reads, so difficulty and payout
 *  cannot drift apart. 0 is the bare Fissure. */
export const POWER = {
  perSocket: 0.3, // sockets are LENGTH, so they never buy enough to beat danger
  perDanger: 55, // danger points that buy one point of run power
  max: 6,
};


// --- families --------------------------------------------------------------
//
// Which world a crystal opens onto. A family decides WHICH monsters you fight
// and nothing about how hard they are — the three pools are held to the same
// threat by the demo, so choosing Demonic is a change of opponent rather than
// a difficulty setting. Difficulty is still socketed modifiers, all of it.

export const MONSTER_FAMILIES: MonsterFamilyDef[] = [
  {
    id: 'normal',
    name: 'Normal',
    word: '',
    blurb: 'What the rock already holds. Its own dead, and what they were carrying.',
  },
  {
    id: 'demonic',
    name: 'Demonic',
    word: 'Demonic',
    blurb: 'Heavy, and it hits like it. Fewer swings, and none of them cheap.',
  },
  {
    id: 'prismatic',
    name: 'Prismatic',
    word: 'Prismatic',
    blurb: 'Fast and brittle. It gets its hits in first because it cannot take any.',
  },
];

export const FAMILY_BY_ID: Record<string, MonsterFamilyDef> = Object.fromEntries(
  MONSTER_FAMILIES.map((f) => [f.id, f])
);

/**
 * Where the composition puts you. Half of one world is enough to make the rock
 * that world's; two halves and no Normal is the Seam, which is neither parent
 * and cannot be reached by accident — it takes exactly two and two.
 */
export const MAP_THEMES: MapThemeDef[] = [
  {
    id: 'fissure',
    name: 'The Fissure',
    blurb: 'A working somebody gave up on. Rotted props, webs, a candle still going.',
  },
  {
    id: 'demonic',
    name: 'The Rot',
    blurb: 'The rock has given way to something that grew here after it.',
  },
  {
    id: 'prismatic',
    name: 'The Cavern',
    blurb: 'Crystal to the ceiling, and every surface holding light.',
  },
  {
    id: 'seam',
    name: 'The Seam',
    blurb: 'Two worlds fused at a join that should not exist.',
  },
];

export const THEME_BY_ID: Record<string, MapThemeDef> = Object.fromEntries(
  MAP_THEMES.map((t) => [t.id, t])
);

/** What a crystal is called: the room it holds, and the world it opens onto. */
export const crystalName = (level: number, family: MonsterFamily): string => {
  const word = FAMILY_BY_ID[family]?.word ?? '';
  return `Level ${level} ${word ? `${word} ` : ''}Crystal`;
};

/**
 * How far an aura reaches, in tiles, and how often the field is re-read. A
 * carrier never buffs itself: what makes a room lethal is the pack around it,
 * and killing the thing in the middle is the answer.
 */
export const AURA = { radius: 6, tick: 0.25 };

/**
 * The two families buff in incompatible ways. Alone each is a hazard the
 * Fissure does not have; together the multiplier lands on what the other
 * added, which is why a half-and-half room is the hardest in the game. The
 * pools still weigh the same per monster — the ladder is what they bring.
 */
export const AURAS: AuraDef[] = [
  {
    id: 'chant',
    name: 'Chant',
    family: 'demonic',
    flatDamage: 1.75,
    blurb: 'Every swing within 6 tiles lands with 175% of a monster\'s damage added.',
  },
  {
    id: 'bulwark',
    name: 'Bulwark',
    family: 'demonic',
    flatArmour: 380,
    blurb: 'Hide within 6 tiles thickens by +380 armour.',
  },
  {
    id: 'resonance',
    name: 'Resonance',
    family: 'prismatic',
    incDamage: 175,
    blurb: 'Damage within 6 tiles is +175% increased — including whatever a Chant added.',
  },
  {
    id: 'refraction',
    name: 'Refraction',
    family: 'prismatic',
    incArmour: 175,
    blurb: 'Armour within 6 tiles is +175% increased — including whatever a Bulwark added.',
  },
];

export const AURA_BY_ID: Record<string, AuraDef> = Object.fromEntries(
  AURAS.map((a) => [a.id, a])
);

// --- monster kinds ---------------------------------------------------------
//
// Multipliers on MONSTER_BASE, so identity and difficulty stay independent. A
// pack rolls ONE kind and spawns all of it: mixed packs read as noise, uniform
// packs read as "that's a Heap pack, careful".

export const MONSTERS: MonsterDef[] = [
  // One dead told apart by SILHOUETTE. Six rather than eleven, because half a
  // pool at grid 24 and half at 96 is two art eras standing in one pack.
  {
    id: 'crawler',
    name: 'Crawler',
    family: 'normal',
    life: 0.8,
    damage: 0.85,
    moveSpeed: 0.9,
    attacksPerSecond: 1,
    attackRange: 1,
    radius: 0.28,
    sprite: 'dragger',
    scale: 1.35,
    weight: 1000,
    tags: ['undead'],
  },
  {
    id: 'husk',
    name: 'Husk',
    family: 'normal',
    life: 1.1,
    damage: 1,
    moveSpeed: 1,
    attacksPerSecond: 0.9,
    attackRange: 1,
    radius: 0.32,
    sprite: 'hewer',
    scale: 1.45,
    weight: 800,
    tags: ['undead'],
  },
  {
    id: 'hound',
    name: 'Hound',
    family: 'normal',
    life: 0.6,
    damage: 1,
    moveSpeed: 1.45,
    attacksPerSecond: 1.25,
    attackRange: 1,
    radius: 0.26,
    sprite: 'courser',
    scale: 1.45,
    weight: 600,
    tags: ['undead'],
  },
  {
    id: 'heap',
    name: 'Heap',
    family: 'normal',
    life: 2.2,
    damage: 1.15,
    moveSpeed: 0.8,
    attacksPerSecond: 0.7,
    attackRange: 1.15,
    radius: 0.45,
    sprite: 'heap',
    scale: 1.9,
    weight: 320,
    tags: ['undead'],
  },
  {
    id: 'gaunt',
    name: 'Gaunt',
    family: 'normal',
    life: 1.45,
    damage: 1.15,
    moveSpeed: 0.92,
    attacksPerSecond: 0.75,
    attackRange: 1.2,
    // Twice the height of the rest, and twice the WIDTH with it: `scale` is one
    // number applied uniformly. The radius follows, or a pack walks through its
    // legs; `fits` clamps at `BODY_MAX`, so it still takes a one-tile gap.
    radius: 0.7,
    sprite: 'gaunt',
    scale: 3.2,
    weight: 300,
    tags: ['undead'],
  },
  {
    id: 'bonecaller',
    name: 'Bonecaller',
    family: 'normal',
    life: 0.85,
    damage: 0.95,
    moveSpeed: 1,
    attacksPerSecond: 0.85,
    attackRange: 1,
    radius: 0.3,
    throws: true,
    sprite: 'shroud',
    scale: 1.45,
    weight: 300,
    tags: ['undead'],
  },
  // --- demonic: slower, and every swing is a real one ------------------
  //
  // More life and more damage per hit, paid for in attack speed: the pool weighs
  // out to the same threat as the Normal one, and punishes standing still.
  {
    id: 'imp',
    name: 'Imp',
    family: 'demonic',
    life: 0.65,
    damage: 0.85,
    moveSpeed: 1.4,
    attacksPerSecond: 1.15,
    attackRange: 1,
    radius: 0.3,
    sprite: 'imp',
    scale: 1.35,
    weight: 1000,
    tags: ['demon'],
  },
  {
    id: 'flenser',
    name: 'Flenser',
    family: 'demonic',
    life: 0.75,
    damage: 1.3,
    moveSpeed: 1.35,
    attacksPerSecond: 1,
    attackRange: 1.05,
    radius: 0.32,
    sprite: 'flenser',
    scale: 1.5,
    weight: 650,
    tags: ['demon'],
  },
  {
    id: 'bloat',
    aura: 'bulwark',
    name: 'Bloat',
    family: 'demonic',
    life: 2,
    damage: 0.95,
    moveSpeed: 0.6,
    attacksPerSecond: 0.62,
    attackRange: 1.1,
    radius: 0.44,
    sprite: 'bloat',
    scale: 1.75,
    weight: 430,
    tags: ['demon'],
  },
  {
    id: 'hornfiend',
    name: 'Hornfiend',
    family: 'demonic',
    life: 2.3,
    damage: 1.65,
    moveSpeed: 0.75,
    attacksPerSecond: 0.65,
    attackRange: 1.15,
    radius: 0.62, // follows the scale, or a pack walks through its legs
    sprite: 'hornfiend',
    scale: 2.2,
    weight: 240,
    tags: ['demon'],
  },
  {
    id: 'maw',
    name: 'Maw',
    family: 'demonic',
    life: 1.15,
    damage: 1.1,
    moveSpeed: 0.95,
    attacksPerSecond: 0.88,
    attackRange: 1,
    radius: 0.34,
    sprite: 'maw',
    scale: 1.6,
    weight: 780,
    tags: ['demon'],
  },
  {
    id: 'chanter',
    aura: 'chant',
    name: 'Chanter',
    family: 'demonic',
    life: 0.9,
    damage: 0.85,
    moveSpeed: 0.9,
    attacksPerSecond: 0.8,
    attackRange: 1.05,
    radius: 0.3,
    throws: true,
    sprite: 'chanter',
    scale: 1.5,
    weight: 720,
    tags: ['demon'],
  },

  // --- prismatic: quick, numerous, and it dies to a stiff breeze -------
  //
  // The mirror of the demonic pool: the same threat spent on attack speed and
  // movement rather than on life. A crystal room is over fast in one direction
  // or the other.
  {
    id: 'shardling',
    name: 'Shardling',
    family: 'prismatic',
    life: 0.4,
    damage: 0.75,
    moveSpeed: 1.75,
    attacksPerSecond: 1.6,
    attackRange: 1,
    radius: 0.26,
    sprite: 'shardling',
    scale: 1.35,
    weight: 1100,
    tags: ['construct'],
  },
  {
    id: 'lattice',
    aura: 'refraction',
    name: 'Lattice',
    family: 'prismatic',
    life: 1.6,
    damage: 0.85,
    moveSpeed: 0.9,
    attacksPerSecond: 0.95,
    attackRange: 1.05,
    radius: 0.38,
    sprite: 'lattice',
    scale: 1.6,
    weight: 700,
    tags: ['construct'],
  },
  {
    // A Fissure skeleton the Cavern got to: the only one here that was somebody
    id: 'bloom',
    name: 'Bloom',
    family: 'prismatic',
    life: 2.1,
    damage: 1,
    moveSpeed: 0.6,
    attacksPerSecond: 0.7,
    attackRange: 1.1,
    radius: 0.44,
    sprite: 'bloom',
    scale: 1.75,
    weight: 380,
    tags: ['undead', 'construct'],
  },
  {
    id: 'prism',
    name: 'Prism',
    family: 'prismatic',
    life: 0.6,
    damage: 1.1,
    moveSpeed: 1.5,
    attacksPerSecond: 1.35,
    attackRange: 1,
    radius: 0.3,
    throws: true,
    sprite: 'prism',
    scale: 1.05,
    weight: 620,
    tags: ['construct'],
  },
  {
    // Never moves, so it THROWS: a rooted thing that only swings never reaches
    id: 'spire',
    name: 'Spire',
    family: 'prismatic',
    life: 1.8,
    damage: 1.45,
    moveSpeed: 0,
    attacksPerSecond: 0.75,
    attackRange: 1.15,
    radius: 0.42,
    throws: true,
    sprite: 'spire',
    scale: 1.9,
    weight: 250,
    tags: ['construct'],
  },
  {
    id: 'chime',
    aura: 'resonance',
    name: 'Chime',
    family: 'prismatic',
    life: 0.55,
    damage: 0.9,
    moveSpeed: 1.6,
    attacksPerSecond: 1.5,
    attackRange: 1,
    radius: 0.28,
    sprite: 'chime',
    scale: 1.35,
    weight: 800,
    tags: ['construct'],
  },
];

/**
 * The spawn pool for one family. A run reads exactly one of these per pack, so
 * a family that lost its last monster would spawn nothing rather than falling
 * back to Normal — the demo holds every family to a pool.
 */
export const MONSTERS_BY_FAMILY: Record<MonsterFamily, MonsterDef[]> = {
  normal: MONSTERS.filter((m) => m.family === 'normal'),
  demonic: MONSTERS.filter((m) => m.family === 'demonic'),
  prismatic: MONSTERS.filter((m) => m.family === 'prismatic'),
};

/**
 * What a monster can turn up as. Bigger, brighter, worth more — and haloed, so
 * the thing that is about to hurt more looks different before it reaches you.
 * Weights are per monster, so a pack can hold one of each.
 */
export const MONSTER_RANKS: MonsterRankDef[] = [
  { id: 'common', weight: 1000, life: 1, damage: 1, bounty: 1, scale: 1 },
  { id: 'magic', weight: 90, life: 2.6, damage: 1.35, bounty: 3.5, scale: 1.4 },
  { id: 'rare', weight: 18, life: 6, damage: 1.7, bounty: 10, scale: 1.7 },
  // WEIGHT 0, so nothing rolls one: the top of the Welling's ladder, which is
  { id: 'risen', weight: 0, life: 14, damage: 2.2, bounty: 25, scale: 2 }, // its termination proof
];

export const MONSTER_BY_ID: Record<string, MonsterDef> = Object.fromEntries(
  MONSTERS.map((m) => [m.id, m])
);

/** What a monster does, and what it deals doing it: an element belongs to the
 *  MONSTER, not the room. Rolled per PACK off the half of this table its BODY
 *  can do, since two elements in one pack read as noise. */
export const MONSTER_ABILITIES: MonsterAbilityDef[] = [
  { id: 'claws', name: 'Claws', damageType: 'physical', skill: null, weight: 600 },
  { id: 'emberbite', name: 'Emberbite', damageType: 'fire', skill: null, weight: 75 },
  { id: 'rimebite', name: 'Rimebite', damageType: 'cold', skill: null, weight: 75 },
  { id: 'fire_bolt', name: 'Fire Bolt', damageType: 'fire', skill: 'bolt', weight: 84 },
  { id: 'frost_bolt', name: 'Frost Bolt', damageType: 'cold', skill: 'frost_bolt', weight: 83 },
  { id: 'lightning_arc', name: 'Lightning Arc', damageType: 'lightning', skill: 'arc', weight: 83 },
];

/** Which of them a BODY may roll, split on the `skill` field: a thrower throws
 *  and nothing else does. */
export const abilitiesFor = (def: MonsterDef): MonsterAbilityDef[] =>
  MONSTER_ABILITIES.filter((a) => !!a.skill === !!def.throws);

export const MONSTER_ABILITY_BY_ID: Record<string, MonsterAbilityDef> = Object.fromEntries(
  MONSTER_ABILITIES.map((a) => [a.id, a])
);

// --- finale ----------------------------------------------------------------
//
// Rolled per RUN and never shown beforehand: seeing it coming would let you
// socket the crystal that suits it. Three shapes — one huge target, a handful
// of tough ones, a swarm — so no one build owns the ending. Multipliers apply
// to whatever the descent's monsters already are.

/**
 * A boss. NEVER in `MONSTERS`, which is the pack pool and nothing else — its
 * own art, its own rank, and life and damage as multipliers on `MONSTER_BASE`
 * like every other body in the game, so a boss scales with the socketed set
 * rather than being a fixed lump of numbers.
 */
export interface BossDef {
  id: string;
  name: string;
  sprite: string; // its own `BEASTIARY` entry, never a monster's
  herald: string;
  life: number;
  damage: number;
  size: number;
  bounty: number;
  /** The smaller things that keep arriving while it is alive. `from` names a
   *  `MonsterDef`; the clock STOPS the moment the boss is down, because the
   *  adds are pressure and the boss is the objective. `size` at a time, or
   *  twenty bodies on one tile read as two. */
  reinforce: { every: number; size: number; from: string };
  /** Run in order and then again from the top, for as long as it lives. */
  phases?: BossPhase[];
}


/** What a boss DOES, as a cycle — a second boss is a table row. `fall` drops
 *  circles where you stand, `reading` cannot be dodged, `split` opens it. */
export interface BossPhase {
  kind: 'fall' | 'reading' | 'split';
  seconds: number;
}

/** A boss's own windups — neither an action nor a skill, looked up by the
 *  seam a thrown skill uses. */
export const BOSS_POSES = ['slam', 'roar'] as const;

export const BOSS_FIGHT = {
  fallBurst: 3, // a BURST and then a rest, and it does not SWING through one
  fallEvery: 0.95,
  fallRest: 3.4,
  /** THE SPLIT, read together. Leaving crosses `fallRadius` + a stride, 5
   *  tiles: 1.72s at a bare 2.9 move speed and the fuse beats you, 1.42s with
   *  move speed on. Blink's own 5 tiles clear it outright, which is what makes
   *  the movement slot an answer. Neither, and you stand in it. */
  fallFuse: 1.5,
  fallRadius: 4.4,
  fallDamage: 19, // a multiple of the boss's SWING, so gear outscales it
  fallStun: 1.1,
  /** A share of max life per second, climbing by `readingRamp` a second. */
  readingPerSecond: 3,
  readingRamp: 0.3,
  /** What an open crystal costs it. */
  splitMore: 2.2,
  windup: 0.9, // the rear-back before a circle appears
  markEvery: 1,
  markMore: 0.1,
  markCap: 10,
  /** Being CAUGHT marks you too: tank them if you can, but not forever. */
  markPerCatch: 2,
  markFall: 0.75,
  /** THE DPS CHECK, behind the measured kill at the rung it is met at. */
  enrageAt: 70,
  enrageRamp: 0.1,
} as const;

export const BOSSES: BossDef[] = [
  {
    id: 'answering',
    name: 'The Answering',
    sprite: 'answering',
    herald: 'Something in the rock has heard its own name.',
    /** FULL TIER 1 GEAR: 65s runner, 52s tank, measured. Twice its own cycle. */
    life: 600,
    damage: 1.4, // under the swing, the slam and the Reading alike
    size: 5, // COLOSSAL: `radius` is 0.34 of it, so separation grows too
    bounty: 30,
    reinforce: { every: 6, size: 2, from: 'husk' },
    // Short, and round quickly: every phase has to come up early enough to
    // matter rather than once.
    phases: [
      { kind: 'fall', seconds: 6 },
      { kind: 'split', seconds: 4 },
      { kind: 'reading', seconds: 5 },
      { kind: 'fall', seconds: 5 },
      { kind: 'split', seconds: 4 },
    ],
  },
  // ONE PER ZONE, and each is the last rung of its own. Life and damage ride
  // the Fissure's, scaled by where its zone sits on the climb — a boss you
  // reach at rung 14 of the Cavern is fought by a character the Cavern built.
  {
    id: 'refraction',
    name: 'The Refraction',
    sprite: 'refraction',
    herald: 'The light in the walls stops moving, and gathers.',
    life: 2600,
    damage: 3.4,
    size: 5,
    bounty: 60,
    reinforce: { every: 6, size: 2, from: 'shardling' },
    // Longer Falls than the Fissure's and one fewer opening: the Cavern's is
    // fought by a build that has already answered the Answering.
    phases: [
      { kind: 'fall', seconds: 7 },
      { kind: 'reading', seconds: 5 },
      { kind: 'split', seconds: 4 },
      { kind: 'fall', seconds: 7 },
      { kind: 'reading', seconds: 6 },
    ],
  },
  {
    id: 'flowering',
    name: 'The Flowering',
    sprite: 'flowering',
    herald: 'Everything that grew down here turns to face one way.',
    life: 7200,
    damage: 6.2,
    size: 5,
    bounty: 110,
    reinforce: { every: 5, size: 3, from: 'flenser' },
    phases: [
      { kind: 'fall', seconds: 7 },
      { kind: 'reading', seconds: 6 },
      { kind: 'fall', seconds: 6 },
      { kind: 'split', seconds: 3 },
      { kind: 'reading', seconds: 7 },
    ],
  },
];

/** Noise that makes you LOOK at the body, where the phase is drawn already. */
export const BOSS_SHOUTS: Record<string, string[]> = {
  fall: ['DOWN.', 'BE STILL.', 'HOLD.'],
  reading: ['RRRRAAAAGHHH', 'I HAVE YOUR NAME', 'AAAAAAHHHH'],
  split: ['...ngh', '...aah', '...hh'],
};

export const BOSS_BY_ID: Record<string, BossDef> = Object.fromEntries(
  BOSSES.map((b) => [b.id, b])
);

/** A way back to a boss you have put down. Its own table and NEVER a
 *  `CurrencyDef` — a real currency is reachable by the bench's registries,
 *  which is a bench that can pour a boss key onto a helmet. */
export interface BossKeyDef {
  id: string;
  name: string;
  boss: string; // a `BossDef` id
  description: string;
  /** Chance a KILL drops one, before power, and only once its boss is down —
   *  a way back to somewhere you have never been reads as junk. Tuned rare. */
  chance: number;
  perPower: number; // per point of run power, so more crystals buys more fights
}

export const BOSS_KEYS: BossKeyDef[] = [
  {
    id: 'written_name',
    name: 'A Written Name',
    boss: 'answering',
    description: 'Three marks copied off a wall. Said aloud in the right place, something turns round.',
    chance: 0.002,
    perPower: 1.05,
  },
];

export const BOSS_KEY_BY_ID: Record<string, BossKeyDef> = Object.fromEntries(
  BOSS_KEYS.map((k) => [k.id, k])
);

/** WHAT THE RECKONING IS SIZED FOR: the campaign's handout and the whole
 *  Ledger, held to summing to exactly this. A LINE of it is a thing done over
 *  and over, paying Tallies at the count — *"100 runs gets you 5 points."* */
export const TALLIES = { max: 60 };

export interface GrindDef {
  id: string;
  name: string;
  detail: string; // the objective, in words a player can act on
  counter: string; // an entry in `GRIND_COUNTERS`: what one descent adds
  need: number;
  pays: number; // Tallies, once
}

/** THE LEDGER: what a descent is, locks, meets, and where — each a LADDER. */
export const GRINDS: GrindDef[] = [
  { id: 'run_25', name: 'A Habit', detail: 'Clear 25 descents.', counter: 'descents', need: 25, pays: 1 },
  { id: 'run_100', name: 'A Trade', detail: 'Clear 100 descents.', counter: 'descents', need: 100, pays: 2 },
  { id: 'run_400', name: 'A Life Down Here', detail: 'Clear 400 descents.', counter: 'descents', need: 400, pays: 4 },

  { id: 'hoard_50', name: 'Prising', detail: 'Open 50 Hoards.', counter: 'hoards', need: 50, pays: 1 },
  { id: 'hoard_250', name: 'Everything Shut', detail: 'Open 250 Hoards.', counter: 'hoards', need: 250, pays: 3 },
  { id: 'vein_50', name: 'Following the Lode', detail: 'Open 50 Veins.', counter: 'veins', need: 50, pays: 2 },
  { id: 'vein_250', name: 'The Whole Seam', detail: 'Open 250 Veins.', counter: 'veins', need: 250, pays: 4 },

  { id: 'welled_250', name: 'Nothing Stays Down', detail: 'Put down 250 bodies that welled up out of another.', counter: 'welled', need: 250, pays: 2 },
  { id: 'welled_1000', name: 'And Nothing Ever Will', detail: 'Put down 1000 bodies that welled up out of another.', counter: 'welled', need: 1000, pays: 4 },
  { id: 'warden_250', name: 'Past the Keeper', detail: 'Put down 250 Wardens.', counter: 'wardens', need: 250, pays: 2 },
  { id: 'warden_2500', name: 'Nobody Left Watching', detail: 'Put down 2500 Wardens.', counter: 'wardens', need: 2500, pays: 5 },
  { id: 'bearer_50', name: 'Carried Out', detail: 'Put down 50 Bearers and take what they carried.', counter: 'bearers', need: 50, pays: 2 },
  { id: 'bearer_250', name: 'Everything They Held', detail: 'Put down 250 Bearers.', counter: 'bearers', need: 250, pays: 4 },

  { id: 'demonic_50', name: 'A Taste for Rot', detail: 'Clear 50 descents under Demonic influence.', counter: 'demonic', need: 50, pays: 2 },
  { id: 'demonic_200', name: 'At Home in It', detail: 'Clear 200 descents under Demonic influence.', counter: 'demonic', need: 200, pays: 3 },
  { id: 'prismatic_50', name: 'Reading the Light', detail: 'Clear 50 descents under Prismatic influence.', counter: 'prismatic', need: 50, pays: 2 },
  { id: 'prismatic_200', name: 'Every Angle of It', detail: 'Clear 200 descents under Prismatic influence.', counter: 'prismatic', need: 200, pays: 3 },
  { id: 'seam_25', name: 'Where It Meets', detail: 'Clear 25 descents in the Seam.', counter: 'seam', need: 25, pays: 4 },
];

export const GRIND_BY_ID: Record<string, GrindDef> = Object.fromEntries(
  GRINDS.map((g) => [g.id, g])
);

/**
 * The Osteomancer, who is in the Rot and wants what it did not finish. His
 * lines are FLAVOUR like everyone else's: no screen, no currency, no number.
 */
export const OSTEOMANCER = {
  name: 'the Osteomancer',
  sprite: 'osteomancer',
  scene: 'ossuary',
  seen: 'Somebody has been sorting down here. The sorting is not finished.',
  /** Said over his own head while you cross to him, before the bench is up. */
  beats: [
    {
      said: 'You have one. You have one on you, I can hear it not rotting. Give it here, give it here — no, hold it up, let me look at it first.',
      act: 'face' as const,
    },
    {
      said: 'They come apart wrong down here. Everything does. This one came apart RIGHT, which means something was still deciding when it stopped, and a thing that was still deciding can be asked what it decided.',
      act: 'pace' as const,
    },
    {
      said: 'I will put it in something of yours. Not on top of — into. Whatever the smith meant that piece to be, it will stop being, and it will be this instead. You choose which. I do not care which. Choose.',
      act: 'work' as const,
    },
  ],
  /** Once the graft is written. */
  done: 'There. Do not thank me, bring me another one. Bring me a worse one, I want to see a worse one.',
};

/**
 * The Astral-Geometer, who is in the Cavern and is the one down here who is not
 * in a hurry. He measures the rock and thinks it is measuring back. Flavour
 * like everyone else's: no screen, no currency, no number.
 */
export const ASTRAL_GEOMETER = {
  name: 'the Astral-Geometer',
  sprite: 'geometer',
  scene: 'orrery',
  seen: 'Something turning, slowly, and a long way in. Somebody hung it there.',
  beats: [
    {
      said: 'Do not put that down. Hold it where the light is — there, you see the angle it makes. It makes that angle everywhere. I have measured it in nine rooms and it has never once been wrong.',
      act: 'face' as const,
    },
    {
      said: 'The other one takes bodies. I take the dust, which is what is left when the rock has finished deciding, and it is the only honest thing down here. A body is an opinion. Dust is a measurement.',
      act: 'pace' as const,
    },
    {
      said: 'I will set it into something small of yours. Small, because the angle does not care how much of it there is. Give me a ring, or the thing you wear at your throat, and I will show you what it does.',
      act: 'work' as const,
    },
  ],
  done: 'Now walk somewhere with it and watch. Come back and tell me if the angle held. It will have held.',
};

/**
 * Something you carry to a PERSON. It is loot, so it banks like everything
 * else; it is never sold, never spent at the bench, and it is the whole of what
 * schedules the room of whoever wants it. One per world with somebody in it.
 */
export const RELICS: RelicDef[] = [
  {
    id: 'pristine_specimen',
    name: 'Pristine Specimen',
    flavour: 'A body the Rot did not finish with. It is still deciding what to be.',
    gate: { zone: 'demonic' },
    chance: 0.006,
    wants: 'ossuary',
  },
  {
    id: 'prismatic_dust',
    name: 'Prismatic Dust',
    flavour: 'What the Cavern leaves when it has finished growing. Every grain of it is the same shape.',
    gate: { zone: 'prismatic' },
    chance: 0.006,
    wants: 'orrery',
  },
];

export const RELIC_BY_ID: Record<string, RelicDef> = Object.fromEntries(
  RELICS.map((r) => [r.id, r])
);

export interface EncounterDef {
  id: string;
  name: string;
  /** Line shown when it appears. */
  herald: string;
  weight: number;
  count: number;
  life: number;
  damage: number;
  /** Body radius multiplier — a boss should read as big before it hits you. */
  size: number;
  /** Multiplier on the xp and gold each one is worth. */
  bounty: number;
  /** How it comes up the hole: `size` bodies at a time, `every` seconds apart.
   *  Twenty on one tile reads as two. */
  wave: { size: number; every: number };
}

export const ENCOUNTERS: EncounterDef[] = [
  {
    id: 'warden',
    name: 'Warden',
    herald: 'Something heavy is waiting at the exit.',
    weight: 100,
    count: 1,
    life: 16,
    damage: 2.2,
    size: 2.1,
    bounty: 14,
    wave: { size: 1, every: 0 },
  },
  {
    id: 'honour_guard',
    name: 'Honour Guard',
    herald: 'A knot of armoured shapes blocks the exit.',
    weight: 100,
    count: 4,
    life: 3.6,
    damage: 1.5,
    size: 1.35,
    bounty: 3.5,
    wave: { size: 1, every: 0.9 },
  },
  {
    id: 'swarm',
    name: 'Swarm',
    herald: 'The walls come alive near the exit.',
    weight: 100,
    count: 20,
    life: 0.75,
    damage: 0.9,
    size: 0.95,
    bounty: 0.7,
    wave: { size: 5, every: 1.1 },
  },
];


/**
 * A thing that is TRUE FOR A WHILE, and the first instances of one. A potion
 * is not a lump of life — it is an effect with a duration, because the trade
 * that turns potions into the character's engine hangs BUFFS off the same
 * shape, and that has to be a table entry rather than a rewrite.
 */
export interface PotionDef {
  id: string;
  name: string;
  /** The binding that fires it: its key is a table entry like every other. */
  binding: string;
  /** Charges per DESCENT. Run state, so a descent always begins full. */
  charges: number;
  seconds: number;
  /** Which pool it fills, and by what share of that pool's maximum per second. */
  pool: 'life' | 'mana';
  percentPerSecond: number;
  /**
   * Fires itself when the pool falls below this share of its maximum. The
   * player's to move, and the shipped default is the one every harness runs —
   * no build's power may depend on somebody watching.
   */
  threshold: number;
}

export const POTIONS: PotionDef[] = [
  {
    id: 'flask_of_life',
    name: 'Flask of Blood',
    binding: 'potion_life',
    charges: 2,
    seconds: 4,
    pool: 'life',
    percentPerSecond: 5,
    threshold: 0.35,
  },
  {
    id: 'flask_of_mana',
    name: 'Flask of Quiet',
    binding: 'potion_mana',
    charges: 2,
    seconds: 4,
    pool: 'mana',
    percentPerSecond: 6,
    threshold: 0.12,
  },
];

export const POTION_BY_ID: Record<string, PotionDef> = Object.fromEntries(
  POTIONS.map((p) => [p.id, p])
);

// --- loot ------------------------------------------------------------------
//
// Banks only when a run is CLEARED. Dying loses it, which is what makes the
// clear/fail distinction worth anything.

// --- danger → reward -------------------------------------------------------
//
// Every crystal modifier is a DOWNSIDE, and reward is derived from how
// dangerous the descent has become — so a roll is "how much of this can my
// character eat", and a build that shrugs off one kind is paid extra for it.
// `weight` is how dangerous a point of a stat is, monster damage at 1.0.
// `rewards` is whether it PAYS — density does not, since more monsters already
// pay you in extra kills.

export interface DangerStat {
  weight: number;
  rewards: boolean;
  cap?: number; // where the SIM stops reading it: past it, no danger and no reward
}

const ARMOUR_SATURATION = 900; // where reduction reaches the cap
export const DANGER_STATS: Record<string, DangerStat> = {
  // Weighed PER TYPE: what a family's ward is worth falls out of its size.
  ...Object.fromEntries(
    DAMAGE_TYPES.map((t) => [
      monsterResStat(t.id),
      { weight: 0.65, rewards: true, cap: DEFENCE.resistanceCap },
    ])
  ),
  monsterDamage: { weight: 1.0, rewards: true },
  monsterLife: { weight: 0.7, rewards: true },
  monsterArmour: { weight: 0.55, rewards: true, cap: ARMOUR_SATURATION },
  monsterCrit: { weight: 0.5, rewards: true, cap: 100 }, // a chance saturates at certain
  // 0.9, and it does not come down: added damage still multiplies a hit by
  // (1 + share/100), and landing as its OWN type is harder to answer.
  ...Object.fromEntries(
    ADDED_DAMAGE_STATS.map((stat) => [stat, { weight: 0.9, rewards: true }])
  ),
  monsterMoveSpeed: { weight: 0.6, rewards: true },
  layoutComplexity: { weight: 0.2, rewards: true },
  packCount: { weight: 0.5, rewards: false },
  packSize: { weight: 0.5, rewards: false },
  // +100% lifts average monster life 14.4% and damage 3.0% over `MONSTER_RANKS`
  // — 0.10 and 0.03 of those. Capped: the effect saturates, the score does not.
  monsterRank: { weight: 0.13, rewards: true, cap: 400 },
  // Percent of PACKS guarding a Hoard, so it caps at every one. Scores their
  // RANK; the extra BODIES are density, which pays in kills and not here.
  hoardChance: { weight: 0.33, rewards: true, cap: 100 },
  // Percent chance a death wells a body ONE RANK UP; the ladder bounds it.
  wellChance: { weight: 0.5, rewards: true, cap: 100 },
  // Percent of PACKS carrying a Bearer: a `risen` body roughly triples a pack's
  bearerChance: { weight: 1.2, rewards: true, cap: 100 }, // life, weighed as monsterLife would
  // Percent of HOARDS whose guards stand back up once: that pack again, halved
  // because it fires on hoards alone.
  watchChance: { weight: 0.17, rewards: true, cap: 100 },
  veinChance: { weight: 0.33, rewards: true, cap: 100 }, // a Hoard's guard
  // Cheaper than the Welling, which goes the other way: what a split leaves is
  // always weaker than what fell.
  splitChance: { weight: 0.3, rewards: true, cap: 100 },
  // Fight LENGTH rather than threat, so it is weighed the way density is.
  wardenChance: { weight: 0.45, rewards: true, cap: 100 },
  giltChance: { weight: 0, rewards: false, cap: 100 }, // coin, and no danger at all
};

/** THE SECOND WATCH — *"50% chance for enemies guarding a box to all respawn
 *  once they die."* ONCE, flagged on the HOARD rather than counted. */
export const WATCH = { life: 1 };

/** THE VEIN: a Hoard that pays CURRENCY. Same guard, same lock. */
/** A lock paying currency where a Hoard pays gear. ONE piece, like the Hoard. */
export const VEIN = { drops: 1 };

/** THE SPLITTING: what dies leaves one of the rank below; a common leaves
 *  nothing, which is the whole of what bounds it. */
export const SPLIT = { life: 0.55 };

export const GILT = { gold: 14 };

/** THE WARDEN: one body a pack, and nothing else in it can be hurt while it
 *  stands. It ends because the warden itself always can. */
export const WARDEN = { rank: 900 };

/** A pack with something in it worth walking towards. Nothing is CLICKED, which
 *  is what makes it legal under universal automation: the last guard down. */
export const HOARD = {
  // LOCKS A DESCENT AT 100% CHANCE — the pack count IS the difficulty, so a
  // per-pack roll paid the deep end 24 Veins a clear.
  mostPerRun: 3,
  baseline: 0.2, // and one every five descents for NOTHING, on blank crystals
  size: 1.6, // the guard, against an ordinary pack
  rank: 250, // `monsterRank`, on the guard alone
  drops: 1, // ONE thing when the last of them is down, never a pile
  goldChance: 0.3, // or coin instead, which makes opening one a small gamble
  gold: 90, // at the bare Fissure, lifted by the run's own danger
};

/** WHAT A LOCK LOOKS LIKE, and it is made of the world it stands in: two
 *  ordinary and one RARE, each a `shut` prop and the `open` frame of THE SAME
 *  generated object. A rare one pays Rarity, never a bigger pile. */
export interface LockSet {
  common: { shut: string; open: string }[];
  rare: { shut: string; open: string };
}

const lock = (id: string) => ({ shut: `lock_${id}`, open: `lock_${id}_open` });

export const LOCKS: Record<MapTheme, LockSet> = {
  fissure: {
    common: [lock('fissure_plain'), lock('fissure_iron')],
    rare: lock('fissure_locked'),
  },
  demonic: {
    common: [lock('rot_bound'), lock('rot_ribbed')],
    rare: lock('rot_horned'),
  },
  prismatic: {
    common: [lock('cavern_pane'), lock('cavern_teeth')],
    rare: lock('cavern_gem'),
  },
  seam: {
    common: [lock('seam_slab'), lock('seam_split')],
    rare: lock('seam_crown'),
  },
};

export const LOCK = {
  rareChance: 0.16, // of the locks a run puts down, how many are the rare one
  rareRarity: 140, // what its ONE drop is worth EXTRA, in Rarity
  rareGold: 2.2,
};

/**
 * What each world pays in, on top of what every world pays, read off the SHARE
 * of the run it holds. Three different currencies deliberately: they cannot be
 * compared, so no world is strictly best and what you want decides where to go.
 */
export const FAMILY_YIELD: Record<MonsterFamily, { gold: number; currency: number; rarity: number }> = {
  normal: { gold: 0.6, currency: 0, rarity: 0 },
  demonic: { gold: 0, currency: 1.1, rarity: 0 },
  prismatic: { gold: 0, currency: 0, rarity: 34 },
};

/** Loot only; XP stays per-kill. A second channel belongs here, not in the sim. */
export const REWARD = {
  /** Rarity percent gained per danger point. */
  rarityPerDanger: 0.8,
  /**
   * What a set fully MIXED between the two other worlds pays over one made of
   * a single world. Not difficulty and not access: the same monsters, the same
   * item level, more of what they carry — so it can never skip a rung.
   */
  mixYield: 0.25,
};

/**
 * A drop picks a class first, then a currency within it, so rarity climbing
 * `basic → uncommon → rare → exotic` is the only route to the scarce ones.
 */
export const CURRENCY_DROP = {
  /** Currency a CLEAR pays, before Currency Find. **A SHARD IS A DECISION
   *  ABOUT ONE PIECE**: at 0.9 the bare Fissure paid 1.29 against 1.75 pieces
   *  of gear — one per drop. At 0.18 it is one shard per ten. */
  perRun: 0.18,
  /** Per-step chance to climb one class, before rarity is applied. */
  upgradeChance: 0.17,
};

// --- what a run drops ------------------------------------------------------
//
// Indexed by run power. `ilvl` decides which modifier TIERS are reachable AND
// which bases can drop; a base's tier is how many modifiers it holds.
//
// **DANGER BUYS QUALITY, NEVER QUANTITY.** Kills run 26 at the bare Fissure
// against 847 at the deep end: a per-KILL rate paid 1.5 a clear, then 84.

export interface DropBand {
  /** Mods a dropped piece arrives with, as [min, max] SHARES of its own cap.
   *  Never all of them: headroom is what a Shard of Making is spent on. */
  fill: [number, number];
  /** Best currency class this band can produce. */
  currency: CurrencyClass;
  /** Pieces of gear a CLEAR pays, before the crystals' own yield and rarity. */
  gearPerRun: number;
  /** Item level dropped gear rolls at. */
  ilvl: number;
}

export const DROP_BANDS: DropBand[] = [
  // ONE OR TWO A CLEAR AT EVERY BAND — halved at the user's word, and it is
  // the figure that ARRIVES rather than one a lock rides over.
  { fill: [0.4, 0.5], currency: 'basic', gearPerRun: 1.2, ilvl: 10 },
  { fill: [0.4, 0.55], currency: 'basic', gearPerRun: 1.25, ilvl: 10 },
  { fill: [0.45, 0.6], currency: 'uncommon', gearPerRun: 1.25, ilvl: 22 },
  { fill: [0.5, 0.65], currency: 'uncommon', gearPerRun: 1.3, ilvl: 34 },
  // Where a build becomes possible: tier 3 bases, six modifiers apiece.
  { fill: [0.5, 0.7], currency: 'rare', gearPerRun: 1.3, ilvl: 46 },
  { fill: [0.55, 0.75], currency: 'rare', gearPerRun: 1.35, ilvl: 58 },
  { fill: [0.6, 0.85], currency: 'exotic', gearPerRun: 1.35, ilvl: 70 },
];


export const bandFor = (power: number): DropBand =>
  DROP_BANDS[Math.max(0, Math.min(DROP_BANDS.length - 1, Math.round(power)))];

/** Whether a gated thing exists in this run at all. No gate opens everywhere. */
export const opensHere = (gate: DropGate | undefined, power: number, zone: MapTheme): boolean =>
  !gate || ((gate.minPower ?? 0) <= power && (gate.zone === undefined || gate.zone === zone));

// --- uniques ---------------------------------------------------------------
//
// A named piece whose lines are fixed and whose real content is a `grants`
// entry — the same table the trees hand switches to the sim through, so the
// merge rules and the demo's "declared, and read by something" rule apply to
// gear for free. Every one is a TRADE: the switch is paid for on the item.
//
// A unique declares no modifier slots, so no currency reaches it. The whole
// point is a fixed thing you build around rather than a canvas.

export const UNIQUES: UniqueDef[] = [
  // The Fissure's own, which is what it gets for being the shallow end: two
  // pieces that exist nowhere else, so the easy world is still a place you go.
  {
    id: 'hollow_crown',
    name: 'The Hollow Crown',
    base: 'bulwark_helmet_t2',
    flavour: 'Worn thin from the inside. Whoever had it last was not wearing it for the protection.',
    stats: [
      { stat: 'damage', form: 'flat', range: [20, 30] },
      { stat: 'life', form: 'inc', range: [-35, -25] },
    ],
    grants: { moreVsFull: { above: 0.8, more: 0.35 } },
    gate: { zone: 'fissure', minPower: 1 },
  },
  {
    id: 'long_reach',
    name: 'The Long Reach',
    base: 'arcanist_gloves_t2',
    flavour: 'It does not stop where you stop.',
    stats: [
      { stat: 'damage', form: 'inc', range: [-25, -15] },
      { stat: 'attackSpeed', form: 'inc', range: [12, 20] },
      { stat: 'castSpeed', form: 'inc', range: [12, 20] },
    ],
    grants: { pierce: 2, pierceDamage: 1 },
    gate: { zone: 'fissure', minPower: 2 },
  },
  // The Rot: everything here is about what a corpse is still good for.
  {
    id: 'rotcallers_grasp',
    name: "Rotcaller's Grasp",
    base: 'shadow_gloves_t2',
    flavour: 'The dead are a resource. It is only manners to say so.',
    stats: [
      { stat: 'life', form: 'inc', range: [-30, -20] },
      { stat: 'critChance', form: 'inc', range: [60, 100] },
    ],
    grants: { explodeOnKill: { radius: 2.2, multiplier: 0.6 } },
    gate: { zone: 'demonic', minPower: 2 },
  },
  {
    id: 'second_mouth',
    name: 'The Second Mouth',
    base: 'jade_amulet',
    flavour: 'One of them is yours.',
    stats: [
      { stat: 'attackSpeed', form: 'inc', range: [-25, -18] },
      { stat: 'castSpeed', form: 'inc', range: [-25, -18] },
      { stat: 'life', form: 'flat', range: [40, 70] },
    ],
    grants: { ailmentMultiplier: 1.6, ailmentDuration: 1.4 },
    gate: { zone: 'demonic', minPower: 3 },
  },
  // The Cavern: light goes through everything, and so does what you throw.
  {
    id: 'splintered_eye',
    name: 'The Splintered Eye',
    base: 'oracle_helmet_t2',
    flavour: 'You see all of them at once. You cannot look at any of them.',
    stats: [
      { stat: 'armour', form: 'inc', range: [-40, -30] },
      { stat: 'rarity', form: 'flat', range: [18, 30] },
    ],
    grants: { extraTargets: 2, extraFields: 1 },
    gate: { zone: 'prismatic', minPower: 3 },
  },
  // The Seam, and the only piece that asks for both worlds at once.
  {
    id: 'what_the_seam_left',
    name: 'What The Seam Left',
    base: 'vanguard_body_t3',
    flavour: 'Two rooms fused and this was in both of them.',
    stats: [
      { stat: 'life', form: 'inc', range: [-45, -35] },
      { stat: 'damage', form: 'inc', range: [40, 60] },
    ],
    grants: { burstOnHit: { every: 2.5, perLevel: 7 } },
    gate: { zone: 'seam', minPower: 4 },
  },
];

export const UNIQUE_BY_ID: Record<string, UniqueDef> = Object.fromEntries(
  UNIQUES.map((u) => [u.id, u])
);

/** How often a piece of gear that drops is a named one instead. Rarity moves
 *  the chance the same way it moves everything else; a gate is still a wall. */
export const UNIQUE_DROP = { chance: 0.015 };

/** WHAT EACH WEAPON FAMILY IS FOR, as the Specialist reads it — *"crit per
 *  dagger equipped, attack speed for swords."* PER WEAPON HELD, so a matched
 *  pair is the bonus twice. */
export const WEAPON_SPECIALITY: Record<string, { stat: string; per: number }> = {
  dagger: { stat: 'critChance', per: 4 },
  sword: { stat: 'attackSpeed', per: 7 },
  mace: { stat: 'damage', per: 12 },
  wand: { stat: 'castSpeed', per: 9 },
  staff: { stat: 'castSpeed', per: 9 },
  bow: { stat: 'attackSpeed', per: 7 },
};

/** THE OBSIDIAN ORDER, written HERE and quoted from so it has one spelling. */
export const ORDER = {
  name: 'the Obsidian Order',
  blurb: 'They hold that everything down here has a true name, and that the rock is writing.',
};

/** The fixed halves of the rogue's switches, beside `WARRIOR`'s. */
export const ROGUE = {
  guardSeconds: 3, // how long a kill's cover lasts
  hasteSeconds: 3,
};

/** A PERFECT base: 25% more of everything the BASE hands over — the armour
 *  rating, the swing, every implicit. It rolls modifiers like any other. */
/** THE ENDGAME CHASE. A SHARE of drops: at 84 a clear it paid 3.79 a descent. */
export const PERFECT = {
  lift: 0.25,
  tier: 3, // the top base tier and no other
  minSockets: 3, // what the last two sockets are FOR
  atThree: 0.0016, // share of gear drops, before danger
  atFull: 0.006,
  dangerLift: 2, // at `dangerFull`, three times the odds
  dangerFull: 900,
};

// --- the shop's shelf ------------------------------------------------------
//
// Grows with you. At level 1 it holds a Rough piece or two and the currencies
// that work on them. It never reaches the top: the best a shop sells is a rung
// below what a map of the same era drops, so buying is a floor under your luck
// rather than a way around the crystal ladder.

export const SHOP = {
  /** Pieces on the shelf: grows one per this many levels, capped. */
  slotsPerLevel: 4,
  minSlots: 2,
  maxSlots: 8,
  /** Item level of stock, as a multiple of character level. */
  ilvlPerLevel: 1.6,
  /** Gold per item level, before the base's tier. */
  pricePerIlvl: 2.4,
  /** Price multiplier by base tier. Steeper than the mod count, on purpose. */
  priceByTier: [1, 2.6, 7],
  /**
   * What a SALE pays, against the same base. Six modifiers reach 1.9×, so the
   * fraction has to stay under 1/1.9 or buying a full piece and selling it back
   * would mint gold out of the shelf.
   */
  sellFraction: 0.35,
  /** What one rolled modifier adds to a sale, as a fraction of the base. */
  pricePerMod: 0.15,
  /**
   * What a SALE pays for the tier, flatter than what a purchase charges for
   * it: a good piece is worth having, not worth selling. Every entry stays at
   * or under its purchase multiplier, or the counter would mint gold.
   */
  sellByTier: [1, 1.8, 3.2],
};

export const LOOT = {
  /**
   * Gold one COMMON monster is worth in the bare Fissure. Accumulates
   * fractionally and rounds when banked, so values below 1 still work. A magic
   * or rare one is worth several kills, so a pack pays about a third more than
   * its count — ranks redistribute the payout into spikes rather than raising it.
   */
  goldPerKill: 0.6,
  /**
   * Gold multiplier per point of run power, and the ONLY thing gold scales on
   * — danger is already inside power, so a second multiplier for it was the
   * same climb counted twice.
   */
  powerScale: 1.45,
};

/**
 * The Fissure, unempowered. There is only one place you ever go; a crystal
 * empowers it rather than replacing it. Always free, so the economy can never
 * strand you — a way back in, not a place to farm.
 */
export const FISSURE = {
  name: 'The Fissure',
  description: 'A thin place in the rock. Costs nothing, pays little, always open.',
  /**
   * What the FIRST clear pays, on top of its own loot. Gold rather than the
   * shards, because buying them is what the opening teaches, and several times
   * what it asks for so the rest is yours to place. The WEAPON is not here:
   * it is handed over in person at the mouth — see `STARTER_WEAPON`.
   */
  firstClear: {
    gold: 30,
    currency: {} as Record<string, number>,
  },
};

/**
 * The first weapon, by what the skill IS. A Strike character handed a wand is
 * the game's first item and the first thing it teaches you to craft, both
 * wrong. A new skill is a ROW here, or a `weapon` on the skill itself; a skill
 * that resolves to no base is a demo failure rather than a silent wand.
 */
export const STARTER_WEAPON: Record<string, string> = {
  spell: 'ash_wand',
  attack: 'rusted_sword',
};

/** Its own override, else the humblest base it can swing, else the category's.
 *  DERIVED from `requires`, or the opening arms you with a piece it refuses. */
export const starterWeapon = (skill: SkillDef | undefined): string | null => {
  if (skill?.weapon) return skill.weapon;
  const wants = skill?.requires
    ? Object.keys(WEAPON_COUNTS_AS).filter((f) => WEAPON_COUNTS_AS[f].includes(skill.requires!))
    : [];
  const fitting = WEAPON_BASES.filter((b) => b.family && wants.includes(b.family));
  const humblest = fitting.sort((a, b) => (a.ilvl ?? 1) - (b.ilvl ?? 1))[0];
  return humblest?.id ?? STARTER_WEAPON[skill?.category ?? ''] ?? null;
};

/** What a key DOES, declared once. The default is here and an override lands
 *  on `GameState.keys` under the same id, so the screen that edits them later
 *  is a screen rather than a refactor. `what` is the line it will print. */
export interface BindingDef {
  id: string;
  what: string;
  key: string;
}

export const BINDINGS: BindingDef[] = [
  { id: 'centre', what: 'Centre the view on your character, and follow them', key: ' ' },
  { id: 'potion_life', what: 'Drink the Flask of Blood', key: '4' },
  { id: 'potion_mana', what: 'Drink the Flask of Quiet', key: '5' },
  { id: 'fissure', what: 'Look into the crack, and go down it', key: 'g' },
  { id: 'inventory', what: 'Open what you are carrying', key: 'i' },
  { id: 'character', what: 'Open the character sheet', key: 'c' },
  { id: 'skills', what: 'Open the skills and their webs', key: 's' },
  { id: 'trade', what: 'Open your trade', key: 't' },
  { id: 'trials', what: 'Open the Reckoning and its Ledger', key: 'r' },
  { id: 'settings', what: 'Open settings, the auto-sell filter and the book', key: 'j' },
  { id: 'craft', what: 'Open the bench', key: 'b' },
  { id: 'shop', what: 'Open the shop', key: 'v' },
  { id: 'crystals', what: 'Open the crystal collection', key: 'y' },
  { id: 'stash', what: 'Open the stash', key: 'x' },
  { id: 'history', what: 'Open the log', key: 'l' },
  { id: 'save', what: 'Open saving and loading', key: 'o' },
  { id: 'hide', what: 'Hide every panel and watch the map', key: 'z' },
  { id: 'fullscreen', what: 'Fill the screen', key: 'f' },
];

export const BINDING_BY_ID: Record<string, BindingDef> = Object.fromEntries(
  BINDINGS.map((b) => [b.id, b])
);

export interface StartPreset {
  gold: number;
  currency: Record<string, number>;
  crystals: Array<{ level: number; family: MonsterFamily }>;
  gear: Array<{ base: string; ilvl: number; perfect?: boolean }>;
  uniques?: string[];
  relics?: string[];
  /** Whether that gear starts worn, or has to be earned first. */
  equipped: boolean;
}

/**
 * `fresh` is what a new player gets; `dev` is stocked, for exercising the bench
 * and the tree without grinding. Judging the loop from the stocked one is
 * judging the endgame at the start.
 */
export const START_PRESETS: Record<'fresh' | 'dev', StartPreset> = {
  /** Nothing at all. The Fissure is free, and the Lampwright brings the rest. */
  fresh: { gold: 0, currency: {}, crystals: [], gear: [], equipped: false },
  dev: {
    gold: 260,
    currency: {},
    // Off both tables, so a new rung or a new world arrives in the kit without
    // a second edit — every level in every family, which is the whole grid.
    crystals: CRYSTAL_LEVELS.flatMap((t) =>
      MONSTER_FAMILIES.map((f) => ({ level: t.level, family: f.id }))
    ),
    gear: [],
    // One of each, so the kit can look at a named piece without farming for it.
    uniques: UNIQUES.map((u) => u.id),
    // And one of every relic, so the room it schedules is one press away.
    relics: RELICS.map((r) => r.id),
    equipped: true,
  },
};

/** Dev kit only — nobody is handed these by playing. */
export const DEV_CURRENCY: Record<string, number> = {
  shard_of_making: 8,
  shard_of_unmaking: 4,
  shard_of_change: 4,
  shard_of_chaos: 4,
  essence_of_the_swarm: 2,
  essence_of_greed: 2,
  // Drop-only, and only out of one world each. Seeded here so the whole bench
  // can be exercised rather than a third of it being permanently greyed out —
  // the dock draws only what you hold, so a missing kind is an icon nobody can
  // ever look at.
  sigil_of_finality: 2,
  sigil_of_upheaval: 2,
  // Every key, so the way back to a room can be pressed without farming.
  ...Object.fromEntries(BOSS_KEYS.map((k) => [k.id, 2])),
};

/**
 * One full set to wear, a body from every other family to look at, and one of
 * each weapon family. NOT one of every base or icon: a kit that overflows the
 * dock is a kit you cannot read.
 */
const ONE_HANDED = WEAPON_BASES.filter(
  (b, i) => (b.hands ?? 1) === 1 && WEAPON_BASES.findIndex((o) => o.family === b.family) === i
);

export const DEV_GEAR = ([
  // One PERFECT of each shape, FIRST so both are in the bag: a rating, a swing.
  { base: 'bulwark_body_t3', ilvl: 60, perfect: true },
  { base: 'steel_sword', ilvl: 60, perfect: true },
] as Array<{ base: string; ilvl: number; perfect?: boolean }>).concat([
  ...new Set([
    ...ARMOUR_SLOT_KINDS.map((k) => `${REFERENCE_ARMOUR_FAMILY}_${k}_t2`),
    ...ARMOUR_FAMILIES.map((f) => `${f.id}_body_t2`),
    ...WEAPON_BASES.filter(
      (b, i) => WEAPON_BASES.findIndex((o) => o.family === b.family) === i
    ).map((b) => b.id),
    'banded_kite',
    'amulet',
    'ring',
  ]),
  // A SECOND of every one-handed family: one of each makes no matched pair.
  ...ONE_HANDED.map((b) => b.id),
].map((base) => ({ base, ilvl: 20 })));

START_PRESETS.dev.currency = DEV_CURRENCY;
START_PRESETS.dev.gear = DEV_GEAR;

/** What each level is worth, and how much XP a level costs. */
export const LEVELLING = {
  maxLevel: 99, // the top of the climb; XP past it is banked and buys nothing

  lifePerLevel: 14,
  /** PERCENT of the skill's own base per level, so skills stay in proportion. */
  damagePerLevel: 2.2,
  /** Points a level hands you to put into ATTRIBUTES, spent on the sheet. */
  attributePointsPerLevel: 3,
  /** XP from one COMMON monster in the bare Fissure. */
  perMonster: 6,
  /** XP multiplier per point of run power. */
  powerScale: 1.6,
  /**
   * xpToNext(level) = curveBase * level ^ curveExponent. Tuned so a first
   * cleared descent is worth about two levels and the curve outruns one run
   * soon after, so raising run power is what levels you.
   */
  curveBase: 260,
  curveExponent: 1.8,
};


// --- skills ----------------------------------------------------------------
//
// A data entry naming a behaviour from SKILL_BEHAVIOURS. `tags` feed the
// modifier engine; damage types belong in `damageTypes` and NEVER in tags, or
// "increased Physical Damage" leaks onto a skill's fire damage.

export const SKILLS: SkillDef[] = [
  {
    /** The hardest single hit in the game, reaching ONE enemy: everything past
     *  what you aimed at is BOUGHT. The NUMBER did not move with the kit — the
     *  boss gate is calibrated on this figure with this skill, and the pass is
     *  held. */
    id: 'strike',
    requires: 'melee',
    name: 'Strike',
    category: 'attack',
    description: 'A hard melee blow. One enemy.',
    tags: ['attack', 'melee'],
    behaviour: 'melee',
    damageTypes: ['physical'],
    baseDamage: 80,
    critChance: 6,
    addedEffectiveness: 100,
    rateMultiplier: 1,
    manaCost: 7.5,
    range: HERO_BASE.attackRange,
    vfxKind: 'slash',
  },
  {
    /** The DELIVERY is the skill: it closes 5.5 tiles by itself and opens from
     *  behind, so the hit lands where a walk would still be arriving. Paid for
     *  in damage — 64 against Strike's 80 at the same rate — and the 25% base
     *  crit is what the rest of it is built on. */
    id: 'ambush',
    requires: 'melee',
    name: 'Ambush',
    category: 'attack',
    description:
      'You step through the room to behind one enemy and open on it. One ' +
      'target, from 5.5 tiles, and it crits at 25%.',
    tags: ['attack', 'melee'],
    behaviour: 'ambush',
    damageTypes: ['physical'],
    weapon: 'shiv', // the knife the whole skill is written for
    baseDamage: 64,
    critChance: 25,
    addedEffectiveness: 100,
    rateMultiplier: 1,
    manaCost: 7.5,
    range: 5.5,
    vfxKind: 'slash',
  },
  {
    /** The opposite trade to Strike: that takes ONE enemy hard, this takes
     *  everything in the wedge for less each — 58 at 0.90/s against 72 at 1.20. */
    id: 'shockwave',
    requires: 'mace',
    name: 'Shockwave',
    category: 'attack',
    description:
      'A wave driven through the ground. A Cone in front of you, and everything ' +
      'standing in it takes the whole hit.',
    // Area from the start, unlike Strike: the wedge IS the skill.
    tags: ['attack', 'melee', 'area'],
    behaviour: 'cone',
    damageTypes: ['physical'],
    baseDamage: 58,
    critChance: 5,
    addedEffectiveness: 100,
    rateMultiplier: 0.75,
    manaCost: 10,
    // Shorter than the wedge it throws: you swing when something is in sword
    // reach and the wave carries out past it.
    range: 2.2,
    vfxKind: 'wedge',
    params: { coneReach: 3.4, coneArc: 100 },
  },
  {
    /**
     * ONE target, and the hardest single hit a spell has: 104 at 0.90/s where
     * Fireball takes 72 at 1.20. The spikes come up UNDER what you aimed at, so
     * there is nothing in flight to pierce, fork or arc — what its tree buys
     * instead is what a Chill is worth, which is the one thing Cold has that
     * nothing else does.
     */
    id: 'rimespike',
    name: 'Rimespike',
    category: 'spell',
    description:
      'Ice drives up through the ground under one enemy. One target, and it ' +
      'hits harder for it.',
    tags: ['spell'],
    behaviour: 'single_target',
    damageTypes: ['cold'],
    baseDamage: 104,
    critChance: 6,
    addedEffectiveness: 100,
    rateMultiplier: 0.75,
    manaCost: 10,
    range: 5,
    vfxKind: 'spikes',
  },
  {
    /**
     * The one with a tree behind it. Bare, it is one enemy at range and nothing
     * else; bursting, piercing, leaping and burning are all nodes you walked
     * to. The skill is the seed, the tree is the build.
     */
    id: 'fireball',
    name: 'Fireball',
    category: 'spell',
    description:
      'A ball of fire at range. One target.',
    tags: ['spell', 'projectile'],
    behaviour: 'projectile',
    damageTypes: ['fire'],
    baseDamage: 72,
    critChance: 5,
    addedEffectiveness: 100,
    rateMultiplier: 1,
    manaCost: 7.5,
    range: 6.5,
    vfxKind: 'flame',
  },
  {
    /** Monsters only — no category, so it never reaches your Skills screen. */
    id: 'bolt',
    name: 'Fire Bolt',
    description: 'A bolt of fire at range. Single target, from much further away.',
    tags: ['spell', 'projectile'],
    behaviour: 'single_target',
    damageTypes: ['fire'],
    // Never read: a monster's damage comes off the crystal, not off a skill.
    baseDamage: 72,
    addedEffectiveness: 100,
    rateMultiplier: 1,
    manaCost: 0,
    range: 6.5,
    vfxKind: 'shard',
  },
  {
    id: 'frost_bolt',
    name: 'Frost Bolt',
    description: 'A shard of ice at range. Single target, from much further away.',
    tags: ['spell', 'projectile'],
    behaviour: 'single_target',
    damageTypes: ['cold'],
    baseDamage: 72,
    addedEffectiveness: 100,
    rateMultiplier: 1,
    manaCost: 0,
    range: 6.5,
    vfxKind: 'bolt',
  },
  {
    // The one monster skill that is not one line to one target. `params` are
    // the skill's own baseline where grants are what a build ADDS; the
    // projectile behaviour sums the two.
    id: 'arc',
    name: 'Lightning Arc',
    description: 'A strike with 2 Arcs, each for 60% of the damage.',
    tags: ['spell', 'projectile'],
    behaviour: 'projectile',
    damageTypes: ['lightning'],
    baseDamage: 72,
    addedEffectiveness: 100,
    rateMultiplier: 1,
    manaCost: 0,
    range: 5.5,
    vfxKind: 'arc',
    params: { chains: 2, chainDamage: 0.6 },
  },
  {
    /**
     * Born with three Arcs where every other skill buys its second target with
     * a point, and it pays in the only currency left: what ONE target is worth.
     * 44 where Fireball lands 72, so it takes four enemies standing near each
     * other to come out ahead. The tree widens the Arcs, never the discount.
     */
    id: 'arc_lightning',
    name: 'Arc Lightning',
    category: 'spell',
    description:
      'A bolt of lightning with 3 Arcs, each for 70% of the damage. It hits a ' +
      'crowd bare, and hits one enemy for less than anything else does.',
    tags: ['spell', 'projectile'],
    behaviour: 'projectile',
    damageTypes: ['lightning'],
    baseDamage: 44,
    critChance: 4,
    addedEffectiveness: 100,
    rateMultiplier: 1,
    manaCost: 7.5,
    range: 6,
    vfxKind: 'arc',
    params: { chains: 3, chainDamage: 0.7 },
  },
  {
    /**
     * The bow skill. One arrow at full damage, and where it lands the sky opens
     * on enemies near it — Forks, which are their OWN bolts rather than the
     * arrow carrying on, so the shot's line decides nothing about who takes one. */
    id: 'lightning_arrow',
    requires: 'bow',
    // The tail left unturned keeps Physical on your bow worth scaling.
    convert: { from: 'physical', to: 'lightning', share: 0.6 },
    name: 'Lightning Arrow',
    category: 'attack',
    description:
      'An arrow of lightning at range. Full damage to what it hits, and 2 ' +
      'Forks fall on enemies near it for 45% each.',
    tags: ['attack', 'projectile'],
    behaviour: 'projectile',
    damageTypes: ['lightning'],
    weapon: 'crude_bow', // a bow, not the attack shelf's sword
    baseDamage: 58,
    critChance: 7,
    addedEffectiveness: 100,
    rateMultiplier: 1,
    manaCost: 7.5,
    range: 7,
    vfxKind: 'arrow',
    impact: 'storm',
    params: { forks: 2, forkDamage: 0.45 },
  },
  {
    /**
     * Doesn't work by hitting things. Damage over time is resisted but NOT
     * armoured, so this is the answer to a target you can't punch through. Low
     * per-stack damage that stacks: the payoff is a crowd, not a cast.
     */
    id: 'blight',
    name: 'Creeping Blight',
    category: 'spell',
    description:
      'Drops a Cloud of Poison on the target for 10s. No target limit — ' +
      'Area of Effect is what makes it hit more.',
    // 'occult' is a damage GROUP and must not appear here. Skill tags ride
    // along in every damage pass, so a stat line tagged 'occult' would scale
    // this skill's fire damage too once Pyroclasm converts it.
    tags: ['spell', 'area'],
    behaviour: 'ailment_burst',
    damageTypes: ['poison'],
    // Both high because a cast is spread over 10s and caps at 9 stacks at the
    // base cast rate — 0.9 applications a second against a hit skill's 1.2.
    baseDamage: 115,
    critChance: 4,
    addedEffectiveness: 160,
    rateMultiplier: 0.75,
    manaCost: 10,
    range: 6.5,
    vfxKind: 'blight_field',
    /**
     * Tuned against PACKS, not against the average cast — most casts have one
     * or two enemies near and drag the mean down. At 0.9 a packed cast catches
     * a median of 2; 3.2 is where a heavily invested character ends up.
     */
    params: { radius: 0.9, duration: 10 },
  },

  // The passive, and a TRADE — which is what makes it worth a slot. It never
  // casts: `critIntoBuff` is the whole of it, read out of `GRANTS`.
  {
    id: 'surge',
    name: 'Killing Surge',
    category: 'passive',
    description:
      'A Critical deals no extra damage; landing one grants 35% more damage ' +
      'for 5s.',
    tags: ['passive'],
    behaviour: 'no_cast',
    damageTypes: [],
    baseDamage: 0,
    addedEffectiveness: 0,
    rateMultiplier: 1,
    manaCost: 0,
    range: 0,
    grants: { critIntoBuff: { more: 35, seconds: 5 } },
  },
  // The rest of the shelf. Every one is a TRADE — what it takes away is the
  // reason the thing it gives is worth a slot — and every one is `no_cast`
  // with static `grants`, which `treeGrants` merges out of whichever passive
  // slot it happens to sit in.
  {
    id: 'contagion',
    name: 'Contagion',
    category: 'passive',
    description:
      'A body dying with an Ailment gives 1 stack of each to every enemy ' +
      'within 3 tiles, and Ailments you apply are 40% weaker.',
    tags: ['passive'],
    behaviour: 'no_cast',
    damageTypes: [],
    baseDamage: 0,
    addedEffectiveness: 0,
    rateMultiplier: 1,
    manaCost: 0,
    range: 0,
    // One stack and no onward spread: a room where every death re-ails the
    // room is a room that never stops, and a headless run that never ends.
    grants: { ailmentSpread: { radius: 3, stacks: 1, targets: 2 }, ailmentWeak: 0.6 },
  },
  {
    id: 'bloodpact',
    name: 'Blood Pact',
    category: 'passive',
    description:
      'Your mana pool is 0, every use costs 1.4 life per point of mana it ' +
      'would have cost, and 3% of the damage you deal returns to you as ' +
      'life.',
    tags: ['passive'],
    behaviour: 'no_cast',
    damageTypes: [],
    baseDamage: 0,
    addedEffectiveness: 0,
    rateMultiplier: 1,
    manaCost: 0,
    range: 0,
    // The leech is ON the passive rather than left to the tables: a build with
    // no pool and no way back is a passive nobody can finish a descent with.
    grants: { bloodCost: 1.4, lifeLeech: 0.03 },
  },
  {
    id: 'refraction',
    name: 'Refraction',
    category: 'passive',
    description:
      'You deal 30% of your Elemental damage as extra Prismatic damage.',
    tags: ['passive'],
    behaviour: 'no_cast',
    damageTypes: [],
    baseDamage: 0,
    addedEffectiveness: 0,
    rateMultiplier: 1,
    manaCost: 0,
    range: 0,
    grants: { prismaticExtra: 0.3 },
  },
  {
    id: 'unmaking',
    name: 'Unmaking',
    category: 'passive',
    description:
      'Enemies within 5 tiles have 25% less Fire, Cold and Lightning Resistance.',
    tags: ['passive'],
    behaviour: 'no_cast',
    damageTypes: [],
    baseDamage: 0,
    addedEffectiveness: 0,
    rateMultiplier: 1,
    manaCost: 0,
    range: 0,
    grants: { elementalShred: { radius: 5, amount: 25 } },
  },
  {
    id: 'unbinding',
    name: 'Unbinding',
    category: 'passive',
    description:
      'Enemies within 5 tiles have 25% less Poison, Dark and Light Resistance.',
    tags: ['passive'],
    behaviour: 'no_cast',
    damageTypes: [],
    baseDamage: 0,
    addedEffectiveness: 0,
    rateMultiplier: 1,
    manaCost: 0,
    range: 0,
    grants: { occultShred: { radius: 5, amount: 25 } },
  },
  {
    /**
     * The BURST, taken out of every tree and made a slot you spend. What it
     * deals comes off character LEVEL and nothing about the build, so it is the
     * one area answer that cannot be stacked — and it is on a clock, so it is a
     * rhythm rather than a rider on every hit.
     */
    id: 'sundering',
    name: 'Sundering',
    category: 'passive',
    description:
      'Every 4s your next hit Bursts around you for 5.5 Physical damage per ' +
      'character level, 2.4 tiles across.',
    tags: ['passive'],
    behaviour: 'no_cast',
    damageTypes: [],
    baseDamage: 0,
    addedEffectiveness: 0,
    rateMultiplier: 1,
    manaCost: 0,
    range: 0,
    grants: {
      burstOnHit: { every: PASSIVE_DAMAGE.sunderEvery, perLevel: PASSIVE_DAMAGE.sunderPerLevel },
    },
  },
  {
    /**
     * Worth exactly what the rest of the build already does to the room: it
     * asks for a Chill it cannot apply itself, so it is dead in a hand that
     * deals no Cold and an engine in one that does.
     */
    id: 'hoarfrost',
    name: 'Hoarfrost',
    category: 'passive',
    description:
      'Every 0.7s a spike goes out at every Chilled enemy within 7 tiles, ' +
      'for 0.9 Cold damage per character level.',
    tags: ['passive'],
    behaviour: 'no_cast',
    damageTypes: [],
    baseDamage: 0,
    addedEffectiveness: 0,
    rateMultiplier: 1,
    manaCost: 0,
    range: 0,
    grants: {
      frostVolley: { every: PASSIVE_DAMAGE.frostEvery, perLevel: PASSIVE_DAMAGE.frostPerLevel },
    },
  },
  {
    /**
     * SPEED as a defensive layer: armour stops blunting and starts Dodging at
     * 60% of what it was worth, and standing untouched makes you faster. On
     * average 60% of your armour is less mitigation than all of it, and it
     * arrives all-or-nothing — the squishy half of the trade is both at once.
     * Giving ground is NOT here: kiting is what a RANGED build does, and one
     * passive owning it made the same build play differently for one point.
     */
    id: 'featherstep',
    name: 'Featherstep',
    category: 'passive',
    description:
      'Your Armour blunts nothing and is instead 60% of itself as Dodge, ' +
      'and you gain 60% increased Movement Speed once 2s have passed ' +
      'without a hit landing on you.',
    tags: ['passive'],
    behaviour: 'no_cast',
    damageTypes: [],
    baseDamage: 0,
    addedEffectiveness: 0,
    rateMultiplier: 1,
    manaCost: 0,
    range: 0,
    grants: { armourToDodge: 0.6, unhitHaste: { after: 2, more: 0.6 } },
  },

  // Never cast either: `RunSim` reads these params off the equipped slot and
  // fires it ITSELF, because automation is universal.
  {
    id: 'blink',
    name: 'Blink',
    category: 'movement',
    description:
      'Step up to 5 tiles along the way you are already walking, once every 3 ' +
      'seconds. A step needs a clear line and takes you through what is in it.',
    tags: ['movement'],
    // Its OWN behaviour rather than the shared `no_cast`, so `GrantDef.reads`
    // can tell a jump's landing from a step that never lands anywhere.
    behaviour: 'step',
    damageTypes: [],
    baseDamage: 0,
    addedEffectiveness: 0,
    rateMultiplier: 1,
    manaCost: 0,
    range: 0,
    vfxKind: 'blink',
    params: { distance: 5, cooldown: 3 },
  },
  {
    id: 'leap',
    name: 'Leap',
    category: 'movement',
    description:
      'Jump up to 6 tiles along the way you are already walking, once every 4 ' +
      'seconds. A jump needs no clear line — it goes over — and it LANDS.',
    tags: ['movement'],
    behaviour: 'leap',
    damageTypes: [],
    baseDamage: 0,
    addedEffectiveness: 0,
    rateMultiplier: 1,
    manaCost: 0,
    range: 0,
    vfxKind: 'leap',
    params: { distance: 6, cooldown: 4 },
  },
];

export const SKILL_BY_ID: Record<string, SkillDef> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s])
);

/**
 * The shelves of the Skills screen, in order. Empty ones are still listed: a
 * named empty shelf is a promise about where something goes.
 */
export const SKILL_CATEGORIES: Array<{
  id: SkillCategory;
  name: string;
  blurb: string;
}> = [
  { id: 'spell', name: 'Spells', blurb: 'Cast. Scales with cast speed.' },
  { id: 'attack', name: 'Attacks', blurb: 'Swung. Scales with attack speed.' },
  { id: 'passive', name: 'Passive Skills', blurb: 'Always on, and always a trade.' },
  { id: 'movement', name: 'Movement', blurb: 'Crossing ground. Fires itself.' },
];

/** What the Skills screen offers: a shelf is everything ONE KIND OF SLOT takes,
 *  so Attacks and Spells share one because one slot takes both. Inside it they
 *  are still told apart, by a header bar per category. */
export const SKILL_SHELVES: Array<{
  id: string;
  name: string;
  blurb: string;
  holds: SkillCategory[];
}> = [
  {
    id: 'ability',
    name: 'Abilities',
    blurb: 'What you kill with. Attacks swing, spells cast.',
    holds: ['attack', 'spell'],
  },
  { id: 'passive', name: 'Passive Skills', blurb: 'Always on, and always a trade.', holds: ['passive'] },
  { id: 'movement', name: 'Movement', blurb: 'Crossing ground. Fires itself.', holds: ['movement'] },
];

export const SHELF_BY_ID = Object.fromEntries(SKILL_SHELVES.map((s) => [s.id, s]));

/** Every category is on exactly one, and the demo holds it to that. */
export const shelfForCategory = (category: SkillCategory): string =>
  SKILL_SHELVES.find((s) => s.holds.includes(category))?.id ?? SKILL_SHELVES[0].id;

/** The three a character holds at once, as a TABLE like `EQUIP_SLOTS`: a
 *  fourth is one entry rather than a fourth named field. */
export const SKILL_SLOTS: SkillSlotDef[] = [
  {
    id: 'main',
    name: 'Main',
    accepts: ['spell', 'attack'],
    blurb: 'What you kill with. Every damage number on the sheet is this one.',
  },
  {
    id: 'passive',
    name: 'Passive',
    accepts: ['passive'],
    blurb: 'Always on, and paid for by giving something up.',
  },
  // Two more of the same shelf, LEVEL-GATED: three at once is a build rather
  // than a pick, so they arrive across the climb instead of at the start.
  {
    id: 'passive2',
    name: 'Second Passive',
    accepts: ['passive'],
    blurb: 'A second one, from level 20.',
    unlocksAt: 20,
  },
  {
    id: 'passive3',
    name: 'Third Passive',
    accepts: ['passive'],
    blurb: 'A third one, from level 40.',
    unlocksAt: 40,
  },
  {
    id: 'movement',
    name: 'Movement',
    accepts: ['movement'],
    blurb: 'Ground covered. It fires itself, like the flasks.',
  },
];

/** The slot whose skill swings. Everything measured is measured on it. */
export const MAIN_SLOT = 'main';

export const SKILL_SLOT_BY_ID: Record<string, SkillSlotDef> = Object.fromEntries(
  SKILL_SLOTS.map((s) => [s.id, s])
);

/** Skills you can actually pick. Monster-only entries have no category. */
export const PLAYER_SKILLS = SKILLS.filter((s) => s.category);

/** What the MAIN slot takes: everything that swings and is measured. */
export const MAIN_SKILLS = PLAYER_SKILLS.filter((s) =>
  SKILL_SLOT_BY_ID[MAIN_SLOT].accepts.includes(s.category!)
);

export const skillsInCategory = (category: SkillCategory): SkillDef[] =>
  SKILLS.filter((s) => s.category === category);

export const RECIPES: Recipe[] = [
  // An ANTI-BRICK, not a supply. At 22 a level-1 character banked 42 gold a
  // clear and bought one and a half. TEN TIMES that, at the user's word.
  {
    id: 'make_shard_of_making',
    name: 'Shard of Making',
    level: 1,
    inputs: { gold: 220 },
    goldPerIlvl: 22,
    output: { type: 'currency', id: 'shard_of_making', qty: 1 },
  },
];
