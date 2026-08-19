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
  physical: 'bleeding',
  fire: 'burning',
  cold: 'frostbite',
  lightning: 'arcing',
  poison: 'poison',
  dark: 'withering',
  light: 'searing',
  prismatic: 'resonance',
};

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
export const DEFENCE = {
  resistanceCap: 75,
  armourCap: 75,
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
export const EQUIP_SLOTS: EquipSlotDef[] = [
  { id: 'weapon', name: 'Main Hand', accepts: 'weapon' },
  { id: 'offhand', name: 'Off Hand', accepts: 'shield' },
  { id: 'helmet', name: 'Helmet', accepts: 'helmet' },
  { id: 'body', name: 'Body', accepts: 'body' },
  { id: 'gloves', name: 'Gloves', accepts: 'gloves' },
  { id: 'boots', name: 'Boots', accepts: 'boots' },
  { id: 'amulet', name: 'Amulet', accepts: 'amulet' },
  { id: 'ring1', name: 'Ring I', accepts: 'ring' },
  { id: 'ring2', name: 'Ring II', accepts: 'ring' },
];

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
 * the invariant is decoration. Crit is flat on a 5% base, so it is the dearest.
 */
const IMPLICIT_PER_POINT: Record<string, number> = {
  armour: 6,
  attackDamage: 1,
  spellDamage: 1,
  attackSpeed: 0.75,
  castSpeed: 0.75,
  moveSpeed: 0.5,
  critChance: 0.25,
};

/** Armour and increases are whole numbers; the dear stats need a decimal. */
const IMPLICIT_STEP: Record<string, number> = {
  armour: 1, attackDamage: 1, spellDamage: 1,
  attackSpeed: 0.1, castSpeed: 0.1, moveSpeed: 0.1, critChance: 0.1,
};

const IMPLICIT_STAT: Record<string, { stat: string; form: 'flat' | 'inc'; tags?: string[] }> = {
  armour: { stat: 'armour', form: 'flat' },
  attackDamage: { stat: 'damage', form: 'inc', tags: ['attack'] },
  spellDamage: { stat: 'damage', form: 'inc', tags: ['spell'] },
  attackSpeed: { stat: 'attackSpeed', form: 'inc' },
  castSpeed: { stat: 'castSpeed', form: 'inc' },
  moveSpeed: { stat: 'moveSpeed', form: 'inc' },
  critChance: { stat: 'critChance', form: 'flat' },
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

const ARMOUR_SLOT_KINDS = ['helmet', 'body', 'gloves', 'boots'] as const;

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

const weapon = (
  id: string,
  name: string,
  family: string,
  ilvl: number,
  implicit: StatSpec[],
  hands = 1
): GearBase => ({
  id, name, kind: 'weapon', art: family, family, ilvl,
  // Off the rung it drops at, so a side-grade arriving beside a rung holds
  // exactly what that rung holds.
  tier: BASE_TIER_ILVL.indexOf(ilvl) + 1,
  slots: { ...WEAPON_SLOTS },
  implicit,
  ...(hands > 1 ? { hands } : {}),
});

export const WEAPON_BASES: GearBase[] = [
  // --- wands: the spell family ---------------------------------------
  weapon('ash_wand', 'Ash Wand', 'wand', BASE_TIER_ILVL[0], [
    { stat: 'damage', form: 'inc', range: [10, 10], tags: ['spell'] },
  ]),
  weapon('carved_wand', 'Carved Wand', 'wand', BASE_TIER_ILVL[1], [
    { stat: 'damage', form: 'inc', range: [16, 16], tags: ['spell'] },
  ]),
  weapon('quartz_wand', 'Quartz Wand', 'wand', BASE_TIER_ILVL[2], [
    { stat: 'damage', form: 'inc', range: [24, 24], tags: ['spell'] },
  ]),
  // A side-grade rather than a fourth rung: it arrives beside the Carved Wand
  // and trades every point of the ladder for speed.
  weapon('whisper_wand', 'Whispering Wand', 'wand', BASE_TIER_ILVL[1], [
    { stat: 'castSpeed', form: 'inc', range: [12, 12] },
  ]),

  // --- swords: attack speed ------------------------------------------
  weapon('rusted_sword', 'Rusted Sword', 'sword', BASE_TIER_ILVL[0], [
    { stat: 'attackSpeed', form: 'inc', range: [8, 8] },
  ]),
  weapon('iron_sword', 'Iron Sword', 'sword', BASE_TIER_ILVL[1], [
    { stat: 'attackSpeed', form: 'inc', range: [13, 13] },
  ]),
  weapon('steel_sword', 'Steel Sword', 'sword', BASE_TIER_ILVL[2], [
    { stat: 'attackSpeed', form: 'inc', range: [18, 18] },
  ]),

  // --- daggers: crit --------------------------------------------------
  weapon('shiv', 'Shiv', 'dagger', BASE_TIER_ILVL[0], [
    { stat: 'critChance', form: 'flat', range: [3, 3] },
  ]),
  weapon('stiletto', 'Stiletto', 'dagger', BASE_TIER_ILVL[1], [
    { stat: 'critChance', form: 'flat', range: [5, 5] },
  ]),
  weapon('fang', 'Fang', 'dagger', BASE_TIER_ILVL[2], [
    { stat: 'critChance', form: 'flat', range: [8, 8] },
  ]),

  // --- maces: one damage type each, so the choice commits you ---------
  //
  // Tagged 'attack' as well as their type. Without it a mace's flat fire
  // damage would arm a spell too — a wand user could hold a mace for free
  // damage, which defeats the point of families.
  weapon('cudgel', 'Cudgel', 'mace', BASE_TIER_ILVL[0], [
    { stat: 'damage', form: 'flat', range: [5, 5], tags: ['physical', 'attack'] },
  ]),
  weapon('ember_maul', 'Ember Maul', 'mace', BASE_TIER_ILVL[1], [
    { stat: 'damage', form: 'flat', range: [9, 9], tags: ['fire', 'attack'] },
  ]),
  weapon('frost_maul', 'Frost Maul', 'mace', BASE_TIER_ILVL[1], [
    { stat: 'damage', form: 'flat', range: [9, 9], tags: ['cold', 'attack'] },
  ]),
  weapon('storm_maul', 'Storm Maul', 'mace', BASE_TIER_ILVL[1], [
    { stat: 'damage', form: 'flat', range: [9, 9], tags: ['lightning', 'attack'] },
  ]),
  weapon('skull_maul', 'Skull Maul', 'mace', BASE_TIER_ILVL[2], [
    { stat: 'damage', form: 'flat', range: [14, 14], tags: ['physical', 'attack'] },
  ]),

  // --- bows: the attack family, and the only two-handed one -----------
  //
  // Tagged 'attack' where the wand's line is tagged 'spell'. Twice the increase,
  // because holding one gives up an off hand — a shield's Block and its rating.
  weapon('crude_bow', 'Crude Bow', 'bow', BASE_TIER_ILVL[0], [
    { stat: 'damage', form: 'inc', range: [20, 20], tags: ['attack'] },
  ], 2),
  weapon('horn_bow', 'Horn Bow', 'bow', BASE_TIER_ILVL[1], [
    { stat: 'damage', form: 'inc', range: [32, 32], tags: ['attack'] },
  ], 2),
  weapon('yew_longbow', 'Yew Longbow', 'bow', BASE_TIER_ILVL[2], [
    { stat: 'damage', form: 'inc', range: [48, 48], tags: ['attack'] },
  ], 2),
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
// A group is a SET somebody builds toward — every mage piece, every bow — and
// never one base at a time: 66 bases is a spreadsheet, where what you are
// keeping is a build. Both halves are DERIVED from the tables above, so a
// family or a weapon rung added there lands in a group without being listed
// twice.

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
const MONSTER_WARD_NAMES: Record<string, string> = {
  physical: 'of Thick Hide',
  fire: 'of Cinders',
  cold: 'of Deep Frost',
  lightning: 'of Earthing',
  poison: 'of Clean Blood',
  dark: 'of Lanterns',
  light: 'of Long Shadow',
  prismatic: 'of Dull Facets',
};

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
  // Reward is derived from danger, so no crystal modifier is pure upside: a mod
  // that only gave you something would be a mod with no decision in it.
  {
    id: 'monster_armour',
    slot: 'mod',
    name: 'of Hardened Hide',
    appliesTo: ['crystal'],
    tags: ['danger'],
    // Armour is POINTS — it feeds armourReduction, which curves them into a
    // percentage. Written as 'inc' it multiplied a base of zero and did
    // nothing at all; these same numbers are meaningful as flat armour.
    tiers: [
      {
        ilvl: 60,
        weight: 150,
        name: 'of Scaled Hide',
        stats: [
          { stat: 'monsterArmour', form: 'flat', range: [110, 160] },
          { stat: 'monsterArmour', form: 'inc', range: [50, 70] },
        ],
      },
      {
        ilvl: 45,
        weight: 300,
        stats: [
          { stat: 'monsterArmour', form: 'flat', range: [60, 90] },
          { stat: 'monsterArmour', form: 'inc', range: [30, 45] },
        ],
      },
      { ilvl: 1, weight: 800, stats: [{ stat: 'monsterArmour', form: 'flat', range: [25, 45] }] },
    ],
  },
  {
    id: 'monster_crit',
    slot: 'mod',
    name: 'of Cruelty',
    appliesTo: ['crystal'],
    tags: ['danger'],
    tiers: [
      { ilvl: 60, weight: 130, name: 'of Malice', stats: [{ stat: 'monsterCrit', form: 'inc', range: [45, 65] }] },
      { ilvl: 50, weight: 250, stats: [{ stat: 'monsterCrit', form: 'inc', range: [25, 40] }] },
      { ilvl: 1, weight: 700, stats: [{ stat: 'monsterCrit', form: 'inc', range: [10, 20] }] },
    ],
  },
  /* Three modifiers, one per element, rather than one that rolls which: a
     crystal modifier is read and answered with a resistance, and a name saying
     Cinders over a roll saying cold is worse than two more rows. Each ADDS a
     share of what a monster already hits for, as its own type on top of what
     the monster brings, so a ward blunts it rather than switching it off. */
  {
    id: 'monster_fire',
    slot: 'mod',
    name: 'of Cinders',
    appliesTo: ['crystal'],
    tags: ['danger', 'fire'],
    tiers: [
      { ilvl: 40, weight: 280, stats: [{ stat: 'monsterFire', form: 'inc', range: [225, 375] }] },
      { ilvl: 1, weight: 700, stats: [{ stat: 'monsterFire', form: 'inc', range: [35, 75] }] },
    ],
  },
  {
    id: 'monster_cold',
    slot: 'mod',
    name: 'of Frost',
    appliesTo: ['crystal'],
    tags: ['danger', 'cold'],
    tiers: [
      { ilvl: 40, weight: 280, stats: [{ stat: 'monsterCold', form: 'inc', range: [225, 375] }] },
      { ilvl: 1, weight: 700, stats: [{ stat: 'monsterCold', form: 'inc', range: [35, 75] }] },
    ],
  },
  {
    id: 'monster_lightning',
    slot: 'mod',
    name: 'of Storms',
    appliesTo: ['crystal'],
    tags: ['danger', 'lightning'],
    tiers: [
      { ilvl: 40, weight: 280, stats: [{ stat: 'monsterLightning', form: 'inc', range: [225, 375] }] },
      { ilvl: 1, weight: 700, stats: [{ stat: 'monsterLightning', form: 'inc', range: [35, 75] }] },
    ],
  },
  {
    id: 'monster_damage',
    slot: 'mod',
    name: 'of Ferocity',
    appliesTo: ['crystal'],
    tags: ['danger'],
    tiers: [
      { ilvl: 60, weight: 180, name: 'of Savagery', stats: [{ stat: 'monsterDamage', form: 'inc', range: [450, 640] }] },
      { ilvl: 40, weight: 400, stats: [{ stat: 'monsterDamage', form: 'inc', range: [175, 250] }] },
      { ilvl: 1, weight: 900, stats: [{ stat: 'monsterDamage', form: 'inc', range: [45, 90] }] },
    ],
  },
  {
    id: 'monster_life',
    slot: 'mod',
    name: 'of Resilience',
    appliesTo: ['crystal'],
    tags: ['danger'],
    tiers: [
      { ilvl: 60, weight: 180, name: 'of Endurance', stats: [{ stat: 'monsterLife', form: 'inc', range: [400, 560] }] },
      { ilvl: 40, weight: 400, stats: [{ stat: 'monsterLife', form: 'inc', range: [150, 225] }] },
      { ilvl: 1, weight: 900, stats: [{ stat: 'monsterLife', form: 'inc', range: [35, 75] }] },
    ],
  },
  {
    id: 'monster_speed',
    slot: 'mod',
    name: 'of Swiftness',
    appliesTo: ['crystal'],
    tags: ['danger'],
    tiers: [
      { ilvl: 1, weight: 700, stats: [{ stat: 'monsterMoveSpeed', form: 'inc', range: [10, 22] }] },
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
  // One ward per damage type, so a map can be hostile to what you deal rather
  // than to everything at once. Uniform resistance is a wall; a named one is a
  // reason to carry a second damage type.
  ...DAMAGE_TYPES.map((type) => ({
    id: `monster_${type.id}_ward`,
    slot: 'mod' as const,
    name: MONSTER_WARD_NAMES[type.id] ?? `of the ${type.name} Ward`,
    appliesTo: ['crystal' as const],
    tags: ['danger'],
    tiers: [
      {
        ilvl: 60,
        weight: 120,
        stats: [{ stat: monsterResStat(type.id), form: 'inc' as const, range: [40, 50] as [number, number] }],
      },
      {
        ilvl: 40,
        weight: 260,
        stats: [{ stat: monsterResStat(type.id), form: 'inc' as const, range: [26, 34] as [number, number] }],
      },
      {
        ilvl: 1,
        weight: 620,
        stats: [{ stat: monsterResStat(type.id), form: 'inc' as const, range: [10, 18] as [number, number] }],
      },
    ],
  })),

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

export const GEAR_MODS: ModDef[] = [
  ...GEAR_MAIN_MODS,
  ...GEAR_SECONDARY_MODS,
  ...GEAR_UTILITY_MODS,
  ...TYPED_DAMAGE_MODS,
  ...DELIVERY_DAMAGE_MODS,
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
        { ilvl: 1, weight: 0, stats: [{ stat: 'critChance', form: 'flat', range: [4, 4] }] },
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
      grants: { explode: { radius: 1.4, multiplier: 0.3 }, manaMultiplier: 1.15 },
      tiers: [
        { ilvl: 1, weight: 0, stats: [{ stat: 'areaOfEffect', form: 'inc', range: [10, 10] }] },
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
      grants: { moreFar: { beyond: 4, more: 1.25 } },
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
export const CRYSTAL_LEVELS = [
  { level: 1, mods: 0, xp: 0 },
  { level: 2, mods: 1, xp: 5 },
  { level: 3, mods: 2, xp: 20 },
  { level: 4, mods: 3, xp: 60 },
];

/**
 * What one cleared descent is worth to every crystal SOCKETED for it. Danger
 * is the multiplier, so a socket spent on a fresh crystal is a socket not
 * carrying danger, which is the whole cost. The flat term is why it is
 * `1 + danger`: four blanks are a set with no danger at all, and a game whose
 * first crystals can never level is a game with no way up.
 */
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
        said: 'You came back up. Most do not. I hear the ones that do not, sometimes, still going.',
        act: 'face',
      },
      {
        said: 'You went down there with nothing in your hands. Do not do that again. Take this one — I have carried it a long way and it has never once been any use to me.',
        act: 'work',
      },
      {
        said: 'Things that come out of the rock can be argued with. Not much. A little. You will find out what I mean and then you will not stop.',
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
  again: {
    title: 'The Lampwright',
    beats: [{ said: 'You went and got this one. I only carried it up.', act: 'work' }] as SceneBeat[],
    button: 'Take it',
  },
};

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

/**
 * Every crystal past the first is gone and got. One clause of an objective:
 * `kind` names an entry in `QUEST_CONDITIONS` and everything else on it is
 * that condition's own parameters, so a new objective is a registry entry and
 * a row here rather than a change to anything that reads quests.
 */
export interface QuestNeed {
  kind: string;
  [param: string]: unknown;
}

/** ALL of `need`. `detail` is the objective in words, and the screen shows it,
 *  so it and the clauses have to be changed together. */
export interface CrystalQuest {
  id: string;
  name: string;
  detail: string;
  need: QuestNeed[];
  gives: { level: number; family: MonsterFamily };
}

/**
 * Two ladders in one list, walkable in any order. The Normal rungs open the
 * sockets; the other two worlds are the opponents you take into them. A share
 * of 0.25 is ONE socketed crystal of that family out of four, so the second
 * gift of a world is earned by using its first.
 *
 * Every rung has to be plausible to a character that has just done the one
 * before it — the demo measures that, which is why the numbers can be soft.
 */
export const CRYSTAL_QUESTS: CrystalQuest[] = [
  {
    id: 'normal_ii',
    name: 'A Second Lamp',
    detail: 'Bring a socketed crystal to level 3.',
    need: [{ kind: 'crystal_level', value: 3 }],
    gives: { level: 1, family: 'normal' },
  },
  {
    id: 'demonic_i',
    name: 'The First Door',
    detail: 'Clear a descent at 30 danger.',
    need: [{ kind: 'danger', value: 30 }],
    gives: { level: 1, family: 'demonic' },
  },
  {
    id: 'normal_iii',
    name: 'Wider Ground',
    detail: 'Clear a descent at 40 danger.',
    need: [{ kind: 'danger', value: 40 }],
    gives: { level: 1, family: 'normal' },
  },
  {
    id: 'prismatic_i',
    name: 'The Lit Seam',
    detail: 'Clear a descent at 60 danger.',
    need: [{ kind: 'danger', value: 60 }],
    gives: { level: 1, family: 'prismatic' },
  },
  {
    id: 'normal_iv',
    name: 'Before The Lamp Dies',
    detail: 'Clear a descent at 70 danger in under 90 seconds.',
    need: [
      { kind: 'danger', value: 70 },
      { kind: 'under_seconds', value: 90 },
    ],
    gives: { level: 1, family: 'normal' },
  },
  {
    id: 'demonic_ii',
    name: 'Deeper In',
    detail: 'Clear a descent at 110 danger with a Demonic crystal socketed.',
    need: [
      { kind: 'danger', value: 110 },
      { kind: 'composition', family: 'demonic', share: 0.25 },
    ],
    gives: { level: 1, family: 'demonic' },
  },
  {
    id: 'prismatic_ii',
    name: 'Further Through',
    detail: 'Clear a descent at 110 danger with a Prismatic crystal socketed.',
    need: [
      { kind: 'danger', value: 110 },
      { kind: 'composition', family: 'prismatic', share: 0.25 },
    ],
    gives: { level: 1, family: 'prismatic' },
  },
];

export const QUEST_BY_ID: Record<string, CrystalQuest> = Object.fromEntries(
  CRYSTAL_QUESTS.map((q) => [q.id, q])
);

/** Every crystal rolls at the same item level, so a level buys room, never power. */
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

/**
 * A trade is the part of a character that is not the skill, and its points are
 * their own currency: funded by CHARACTER level, so walking one never competes
 * with a skill tree for the same point.
 */
export const TRADE = {
  levelsPerPoint: 5, // level 5 buys the first point, and picks the trade
  maxPoints: 10,
  /**
   * Gold to take up a different trade, per character level. Every point comes
   * back — what you pay for is the walk — because a hard lock would be the only
   * unforgiving thing in a game that replays allocations rather than trusting them.
   */
  switchPerLevel: 40,
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

/**
 * How long a descent runs, indexed by FILLED SOCKETS — index 0 is the bare
 * Fissure. Length only: monsters are exactly as strong in a four-socket run as
 * in an empty one. `size` is linear, so area goes as its square.
 */
export const SOCKET_SCALE = {
  size: [0.62, 1, 1.15, 1.3, 1.45],
  packs: [0.66, 1, 1.5, 2, 2.5],
  /**
   * Thinner packs at the bottom. Every other rung adds LENGTH, which a level
   * one character survives by walking out hurt — but the first crystal you are
   * given lands on a character who has cleared the Fissure exactly once, and a
   * full-sized pack at 50 monsters is what kills them.
   */
  packSize: [0.66, 0.8, 1, 1, 1],
};

const rung = (n: number, table: number[]): number =>
  table[Math.min(Math.max(0, Math.round(n)), table.length - 1)];

export const socketSize = (filled: number): number => rung(filled, SOCKET_SCALE.size);
export const socketPacks = (filled: number): number => rung(filled, SOCKET_SCALE.packs);
export const socketPackSize = (filled: number): number => rung(filled, SOCKET_SCALE.packSize);

/**
 * Run power: the one number every reward reads, so difficulty and payout
 * cannot drift apart. 0 is the bare Fissure and the baseline for XP, gold,
 * drops and item level. Danger carries most of it; sockets add a little, never
 * enough that filling sockets beats rolling danger — which is what stops a
 * safe grind from being the best farm.
 */
export const POWER = {
  perSocket: 0.3,
  /** Danger points that buy one point of run power. */
  perDanger: 55,
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
    radius: 0.26,
    sprite: 'imp',
    scale: 0.85,
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
    radius: 0.3,
    sprite: 'flenser',
    scale: 0.98,
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
    scale: 1.2,
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
    radius: 0.46,
    sprite: 'hornfiend',
    scale: 1.32,
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
    scale: 1.05,
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
    scale: 1,
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
    radius: 0.24,
    sprite: 'shardling',
    scale: 0.82,
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
    radius: 0.36,
    sprite: 'lattice',
    scale: 1.05,
    weight: 700,
    tags: ['construct'],
  },
  {
    id: 'geode',
    name: 'Geode',
    family: 'prismatic',
    life: 2.1,
    damage: 1,
    moveSpeed: 0.6,
    attacksPerSecond: 0.7,
    attackRange: 1.1,
    radius: 0.42,
    sprite: 'geode',
    scale: 1.2,
    weight: 380,
    tags: ['construct'],
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
    radius: 0.28,
    throws: true,
    sprite: 'prism',
    scale: 0.95,
    weight: 620,
    tags: ['construct'],
  },
  {
    id: 'spire',
    name: 'Spire',
    family: 'prismatic',
    life: 1.8,
    damage: 1.45,
    moveSpeed: 0.7,
    attacksPerSecond: 0.75,
    attackRange: 1.15,
    radius: 0.4,
    sprite: 'spire',
    scale: 1.3,
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
    radius: 0.26,
    sprite: 'chime',
    scale: 0.88,
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
  // A ward is ONE type: it costs a character that deals two almost nothing.
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
  // Unchanged at 0.9 from when this was a conversion, and deliberately: the
  // arithmetic is the same either way — a hit is still multiplied by
  // (1 + share/100) — and what moved is only that the share now lands as its
  // own type on TOP of the monster's rather than replacing the whole hit. That
  // makes it harder to answer, not easier, so nothing here comes down.
  ...Object.fromEntries(
    ADDED_DAMAGE_STATS.map((stat) => [stat, { weight: 0.9, rewards: true }])
  ),
  monsterMoveSpeed: { weight: 0.6, rewards: true },
  layoutComplexity: { weight: 0.2, rewards: true },
  packCount: { weight: 0.5, rewards: false },
  packSize: { weight: 0.5, rewards: false },
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
  chancePerKill: 0.022,
  /** Per-step chance to climb one class, before rarity is applied. */
  upgradeChance: 0.17,
};

// --- what a run drops ------------------------------------------------------
//
// Indexed by run power, which decides what a map can GIVE you and not just how
// much. `ilvl` is the load-bearing one: it decides which modifier TIERS are
// reachable AND which gear bases can drop, and a base's tier is the whole of
// how many modifiers it holds — so a band's item level is its ceiling twice
// over. `fill` is only how finished a piece ARRIVES.

export interface DropBand {
  /** Mods a dropped piece arrives with, as [min, max] of its cap. */
  fill: [number, number];
  /** Best currency class this band can produce. */
  currency: CurrencyClass;
  /** Chance per kill that a piece of gear drops at all. */
  gearChance: number;
  /** Item level dropped gear rolls at. */
  ilvl: number;
}

export const DROP_BANDS: DropBand[] = [
  // The bare Fissure. Mostly junk, occasionally a one-modifier piece — enough
  // that the free descent has some upside, which is the difference between a
  // tutorial and a tax.
  { fill: [1, 1], currency: 'basic', gearChance: 0.05, ilvl: 10 },
  { fill: [1, 2], currency: 'basic', gearChance: 0.075, ilvl: 10 },
  { fill: [1, 2], currency: 'uncommon', gearChance: 0.068, ilvl: 22 },
  // Tier 2 bases are in reach here, and deliberately not filled.
  { fill: [2, 3], currency: 'uncommon', gearChance: 0.06, ilvl: 34 },
  // Where a build becomes possible: tier 3 bases, six modifiers apiece.
  { fill: [3, 4], currency: 'rare', gearChance: 0.052, ilvl: 46 },
  { fill: [3, 5], currency: 'rare', gearChance: 0.045, ilvl: 58 },
  { fill: [4, 6], currency: 'exotic', gearChance: 0.038, ilvl: 70 },
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
      { stat: 'critChance', form: 'flat', range: [6, 10] },
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
    grants: { explode: { radius: 1.6, multiplier: 0.5 }, explodeRadius: 1.5, explodeMultiplierAdd: 0.4 },
    gate: { zone: 'seam', minPower: 4 },
  },
];

export const UNIQUE_BY_ID: Record<string, UniqueDef> = Object.fromEntries(
  UNIQUES.map((u) => [u.id, u])
);

/** How often a piece of gear that drops is a named one instead. Rarity moves
 *  the chance the same way it moves everything else; a gate is still a wall. */
export const UNIQUE_DROP = { chance: 0.015 };

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

export const starterWeapon = (skill: SkillDef | undefined): string | null =>
  skill?.weapon ?? STARTER_WEAPON[skill?.category ?? ''] ?? null;

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
  { id: 'inventory', what: 'Open what you are carrying', key: 'i' },
  { id: 'character', what: 'Open the character sheet', key: 'c' },
  { id: 'skills', what: 'Open the skills and their webs', key: 's' },
  { id: 'trade', what: 'Open your trade', key: 't' },
  { id: 'craft', what: 'Open the bench', key: 'b' },
  { id: 'shop', what: 'Open the shop', key: 'v' },
  { id: 'filter', what: 'Open the auto-sell filter', key: 'j' },
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
  gear: Array<{ base: string; ilvl: number }>;
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
export const DEV_GEAR = [
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
].map((base) => ({ base, ilvl: 20 }));

START_PRESETS.dev.currency = DEV_CURRENCY;
START_PRESETS.dev.gear = DEV_GEAR;

/** What each level is worth, and how much XP a level costs. */
export const LEVELLING = {
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
      { stat: 'critChance', form: 'flat', value: 0.12, tags: ['attack'] },
      { stat: 'attackSpeed', form: 'inc', value: 0.4, tags: [] },
    ],
  },
  {
    id: 'acuity',
    name: 'Acuity',
    per: [
      { stat: 'critChance', form: 'flat', value: 0.12, tags: ['spell'] },
      { stat: 'castSpeed', form: 'inc', value: 0.4, tags: [] },
    ],
  },
];

export const ATTRIBUTE_BY_ID: Record<string, AttributeDef> = Object.fromEntries(
  ATTRIBUTES.map((a) => [a.id, a])
);

// --- skills ----------------------------------------------------------------
//
// A data entry naming a behaviour from SKILL_BEHAVIOURS. `tags` feed the
// modifier engine; damage types belong in `damageTypes` and NEVER in tags, or
// "increased Physical Damage" leaks onto a skill's fire damage.

export const SKILLS: SkillDef[] = [
  {
    id: 'strike',
    name: 'Strike',
    category: 'attack',
    description:
      'A sweeping melee hit. Full damage to the target, 10% to everything else in reach.',
    tags: ['attack', 'melee'],
    behaviour: 'cleave',
    damageTypes: ['physical'],
    baseDamage: 72,
    addedEffectiveness: 100,
    rateMultiplier: 1,
    manaCost: 7.5,
    range: HERO_BASE.attackRange,
    vfxKind: 'sweep',
    // Splash is placeholder-cheap: the mechanism is the point, not the 10%.
    params: { splashRadius: 2.2, splashMultiplier: 0.1 },
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
      'A ball of fire at range. One target, until its tree says otherwise.',
    tags: ['spell', 'projectile'],
    behaviour: 'projectile',
    damageTypes: ['fire'],
    baseDamage: 72,
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
      'A Critical deals no extra damage. Landing one grants 35% more damage for 5 seconds.',
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
  // The whole shelf. Everything else drops, because a shop that stocks the
  // bench is a shop that replaces the map — and adding a modifier is the one
  // thing you need enough of that running out of it is only tedious.
  {
    id: 'make_shard_of_making',
    name: 'Shard of Making',
    level: 1,
    inputs: { gold: 5 },
    output: { type: 'currency', id: 'shard_of_making', qty: 1 },
  },
];
