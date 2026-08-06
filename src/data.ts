import type {
  CurrencyDef,
  EquipSlotDef,
  GearBase,
  ModDef,
  MonsterDef,
  Recipe,
  SkillDef,
  StatSpec,
} from './types';

// ===========================================================================
// SLOT LAYOUTS
//
// Declared per base. Crystals use a single undifferentiated slot type;
// gear splits power (main) from utility (secondary) so the two never compete.
// ===========================================================================

// ===========================================================================
// DAMAGE TYPES
//
// A table, not a hardcoded list, so adding a type is a data entry: it starts
// being resolved, resisted and displayed everywhere at once.
//
// Groups let a single mod cover several types at lower value — Elemental
// covers fire/cold/lightning, Occult covers poison/dark/light. Physical and
// Crystal stand alone, so their only cover is their own resistance.
//
// TYPELESS is deliberately absent from this table. Nothing type-specific
// scales it and nothing resists it; generic "increased Damage" still applies,
// because that carries no type tag to fail against.
// ===========================================================================

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
  { id: 'crystal', name: 'Crystal', group: null },
];

export const DAMAGE_TYPE_BY_ID: Record<string, DamageTypeDef> = Object.fromEntries(
  DAMAGE_TYPES.map((d) => [d.id, d])
);

export const DAMAGE_GROUPS = ['elemental', 'occult'] as const;

/** Damage that nothing scales and nothing resists. */
export const TYPELESS = 'typeless';

/**
 * Defensive layers.
 *
 * Resistance and armour are separate MULTIPLIERS, so at both caps you take
 * 0.25 * 0.25 = 6.25% of a hit. Adding them instead would mean immunity at
 * 75 + 75, which is why they don't add.
 *
 * Armour reduction curves with armour POINTS rather than with the size of the
 * hit. Hit-size scaling made armour impossible to display honestly — its
 * worth changed with every attacker. This way it's one number you can print,
 * while still avoiding the two failure modes of a linear conversion: mods
 * that do nothing, or three mods reaching the cap.
 *
 * Armour applies only to HITS. Damage over time goes through resistance
 * alone, which is what lets an ailment threaten a heavily armoured build.
 */
export const DEFENCE = {
  resistanceCap: 75,
  armourCap: 75,
  /** Armour points at which reduction reaches half the cap. */
  armourHalfPoint: 300,
};

export const CRYSTAL_SLOTS = { mod: 3 };

/**
 * Gear mod groups.
 *
 * Slot types were always just strings declared per base — so restricting what
 * a piece can roll is a capacity table, not an engine feature. A base with
 * zero utility slots simply cannot roll move speed; no per-mod base lists, no
 * eligibility special-casing.
 *
 *   offence  raw damage
 *   defence  staying alive
 *   damage   multipliers — attack speed and crit are not utility
 *   utility  everything that isn't damage
 */
export const GEAR_SLOT_TYPES = ['offence', 'defence', 'damage', 'utility'] as const;

/** Kept for crystals and any caller that still wants a default gear layout. */
export const GEAR_SLOTS = { offence: 1, defence: 1, damage: 1, utility: 1 };

// ===========================================================================
// EQUIPMENT
//
// A full slot set from the start, so the character sheet has its final shape
// and adding a base later fills a hole rather than changing the layout.
//
// Gear mods declare appliesTo: ['gear'], so every base rolls from the same
// pool and a new base needs no new mod content. Base-specific pools (weapons
// getting damage, boots getting movement) are the obvious next step and cost
// nothing to add later.
// ===========================================================================

export const EQUIP_SLOTS: EquipSlotDef[] = [
  { id: 'weapon', name: 'Weapon', accepts: 'weapon' },
  { id: 'helmet', name: 'Helmet', accepts: 'helmet' },
  { id: 'body', name: 'Body', accepts: 'body' },
  { id: 'gloves', name: 'Gloves', accepts: 'gloves' },
  { id: 'boots', name: 'Boots', accepts: 'boots' },
  { id: 'amulet', name: 'Amulet', accepts: 'amulet' },
  { id: 'ring1', name: 'Ring I', accepts: 'ring' },
  { id: 'ring2', name: 'Ring II', accepts: 'ring' },
];

/**
 * Each base declares how many of each group it can hold. This is the whole
 * restriction mechanism.
 *
 * Only boots and amulets have utility slots, which is what confines move
 * speed to them — by construction rather than by rule. Body has no offence at
 * all and boots no multipliers, so those pieces have a defensive identity
 * instead of being generic stat sticks. Weapons keep one defence slot, so a
 * weapon can still roll armour or life.
 */
/**
 * One-handed weapons, in four families.
 *
 * Every weapon carries an IMPLICIT — a stat it always has, which no craft can
 * add or remove. That's the reason to want a wand over a sword before either
 * has rolled anything, and it's what makes a weapon drop interesting rather
 * than being a mod container with a different name.
 *
 *   wands    spell damage, or cast speed
 *   swords   attack speed
 *   daggers  flat critical chance — flat, because increases multiply a 5%
 *            base and would be worth almost nothing here
 *   maces    flat damage of ONE type per base, so a mace commits you
 *
 * Tiers within a family are gated by ilvl, so better bases are themselves a
 * progression rather than everything being available immediately.
 */
const WEAPON_SLOTS = { offence: 2, defence: 1, damage: 1, utility: 0 };

const weapon = (
  id: string,
  name: string,
  family: string,
  implicit: StatSpec[]
): GearBase => ({
  id, name, kind: 'weapon', art: family, family,
  slots: { ...WEAPON_SLOTS },
  implicit,
});

export const WEAPON_BASES: GearBase[] = [
  // --- wands: the spell family ---------------------------------------
  weapon('ash_wand', 'Ash Wand', 'wand', [
    { stat: 'damage', form: 'inc', range: [10, 10], tags: ['spell'] },
  ]),
  weapon('carved_wand', 'Carved Wand', 'wand', [
    { stat: 'damage', form: 'inc', range: [16, 16], tags: ['spell'] },
  ]),
  weapon('quartz_wand', 'Quartz Wand', 'wand', [
    { stat: 'damage', form: 'inc', range: [24, 24], tags: ['spell'] },
  ]),
  weapon('whisper_wand', 'Whispering Wand', 'wand', [
    { stat: 'castSpeed', form: 'inc', range: [12, 12] },
  ]),

  // --- swords: attack speed ------------------------------------------
  weapon('rusted_sword', 'Rusted Sword', 'sword', [
    { stat: 'attackSpeed', form: 'inc', range: [8, 8] },
  ]),
  weapon('iron_sword', 'Iron Sword', 'sword', [
    { stat: 'attackSpeed', form: 'inc', range: [13, 13] },
  ]),
  weapon('steel_sword', 'Steel Sword', 'sword', [
    { stat: 'attackSpeed', form: 'inc', range: [18, 18] },
  ]),

  // --- daggers: crit --------------------------------------------------
  weapon('shiv', 'Shiv', 'dagger', [
    { stat: 'critChance', form: 'flat', range: [3, 3] },
  ]),
  weapon('stiletto', 'Stiletto', 'dagger', [
    { stat: 'critChance', form: 'flat', range: [5, 5] },
  ]),
  weapon('fang', 'Fang', 'dagger', [
    { stat: 'critChance', form: 'flat', range: [8, 8] },
  ]),

  // --- maces: one damage type each, so the choice commits you ---------
  //
  // Tagged 'attack' as well as their type. Without it a mace's flat fire
  // damage would arm a spell too — a wand user could hold a mace for free
  // damage, which defeats the point of families.
  weapon('cudgel', 'Cudgel', 'mace', [
    { stat: 'damage', form: 'flat', range: [5, 5], tags: ['physical', 'attack'] },
  ]),
  weapon('ember_maul', 'Ember Maul', 'mace', [
    { stat: 'damage', form: 'flat', range: [9, 9], tags: ['fire', 'attack'] },
  ]),
  weapon('frost_maul', 'Frost Maul', 'mace', [
    { stat: 'damage', form: 'flat', range: [9, 9], tags: ['cold', 'attack'] },
  ]),
  weapon('storm_maul', 'Storm Maul', 'mace', [
    { stat: 'damage', form: 'flat', range: [9, 9], tags: ['lightning', 'attack'] },
  ]),
  weapon('skull_maul', 'Skull Maul', 'mace', [
    { stat: 'damage', form: 'flat', range: [14, 14], tags: ['physical', 'attack'] },
  ]),
];

export const GEAR_BASES: GearBase[] = [
  ...WEAPON_BASES,
  {
    id: 'helmet', name: 'Iron Helm', kind: 'helmet', art: 'helmet',
    slots: { offence: 1, defence: 2, damage: 1, utility: 0 },
  },
  {
    id: 'body_armour', name: 'Plated Vest', kind: 'body', art: 'body',
    slots: { offence: 0, defence: 3, damage: 1, utility: 0 },
  },
  {
    id: 'gloves', name: 'Leather Gloves', kind: 'gloves', art: 'gloves',
    slots: { offence: 1, defence: 1, damage: 2, utility: 0 },
  },
  {
    id: 'boots', name: 'Worn Boots', kind: 'boots', art: 'boots',
    slots: { offence: 0, defence: 2, damage: 0, utility: 2 },
  },
  {
    id: 'amulet', name: 'Bone Amulet', kind: 'amulet', art: 'amulet',
    slots: { offence: 1, defence: 1, damage: 1, utility: 1 },
  },
  {
    id: 'ring', name: 'Copper Band', kind: 'ring', art: 'ring',
    slots: { offence: 1, defence: 2, damage: 1, utility: 0 },
  },
];

export const GEAR_BASE_BY_ID: Record<string, GearBase> = Object.fromEntries(
  GEAR_BASES.map((b) => [b.id, b])
);

// ===========================================================================
// MOD POOL
//
// Tiers are authored best-first. `ilvl` gates them, so a T1 crystal can only
// ever roll the weak tiers — item level is your main progression dial.
//
// Keep each slot type meaningfully oversubscribed: more candidates than slots
// is what makes a roll feel like a roll.
// ===========================================================================

export const CRYSTAL_MODS: ModDef[] = [
  {
    id: 'pack_size',
    slot: 'mod',
    name: 'Teeming',
    appliesTo: ['crystal'],
    tags: ['density', 'quantity'],
    tiers: [
      { ilvl: 60, weight: 200, stats: [{ stat: 'packSize', form: 'inc', range: [30, 40] }], name: 'Swarming' },
      { ilvl: 30, weight: 600, stats: [{ stat: 'packSize', form: 'inc', range: [18, 28] }], name: 'Teeming' },
      { ilvl: 1, weight: 1000, stats: [{ stat: 'packSize', form: 'inc', range: [8, 16] }], name: 'Crowded' },
    ],
  },
  {
    id: 'pack_count',
    slot: 'mod',
    name: 'Sprawling',
    appliesTo: ['crystal'],
    tags: ['density'],
    tiers: [
      { ilvl: 45, weight: 300, stats: [{ stat: 'packCount', form: 'inc', range: [20, 30] }] },
      { ilvl: 1, weight: 800, stats: [{ stat: 'packCount', form: 'inc', range: [8, 18] }] },
    ],
  },
  // Gilded (itemRarity) and Fractured (fragmentYield) used to live here as
  // pure upside. They're gone: reward is now derived from danger, so a mod
  // that only gave you something was a mod with no decision in it. Their
  // slots are taken by the three below.
  {
    id: 'monster_armour',
    slot: 'mod',
    name: 'of Hardened Hide',
    appliesTo: ['crystal'],
    tags: ['danger'],
    tiers: [
      { ilvl: 45, weight: 300, stats: [{ stat: 'monsterArmour', form: 'inc', range: [50, 80] }] },
      { ilvl: 1, weight: 800, stats: [{ stat: 'monsterArmour', form: 'inc', range: [20, 40] }] },
    ],
  },
  {
    id: 'monster_crit',
    slot: 'mod',
    name: 'of Cruelty',
    appliesTo: ['crystal'],
    tags: ['danger'],
    tiers: [
      { ilvl: 50, weight: 250, stats: [{ stat: 'monsterCrit', form: 'inc', range: [25, 40] }] },
      { ilvl: 1, weight: 700, stats: [{ stat: 'monsterCrit', form: 'inc', range: [10, 20] }] },
    ],
  },
  {
    // Makes monsters deal fire instead of physical, which is the first mod
    // that a character could be built to shrug off — and it shows up in the
    // results overlay's damage-by-type breakdown immediately.
    id: 'monster_fire',
    slot: 'mod',
    name: 'of Cinders',
    appliesTo: ['crystal'],
    tags: ['danger', 'fire'],
    tiers: [
      { ilvl: 40, weight: 280, stats: [{ stat: 'monsterFire', form: 'inc', range: [30, 50] }] },
      { ilvl: 1, weight: 700, stats: [{ stat: 'monsterFire', form: 'inc', range: [12, 25] }] },
    ],
  },
  {
    id: 'monster_damage',
    slot: 'mod',
    name: 'of Ferocity',
    appliesTo: ['crystal'],
    tags: ['danger'],
    tiers: [
      { ilvl: 40, weight: 400, stats: [{ stat: 'monsterDamage', form: 'inc', range: [35, 50] }] },
      { ilvl: 1, weight: 900, stats: [{ stat: 'monsterDamage', form: 'inc', range: [15, 30] }] },
    ],
  },
  {
    id: 'monster_life',
    slot: 'mod',
    name: 'of Resilience',
    appliesTo: ['crystal'],
    tags: ['danger'],
    tiers: [
      { ilvl: 40, weight: 400, stats: [{ stat: 'monsterLife', form: 'inc', range: [30, 45] }] },
      { ilvl: 1, weight: 900, stats: [{ stat: 'monsterLife', form: 'inc', range: [12, 25] }] },
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
  // Resistances are generated from DAMAGE_TYPES below, also into 'defence'.
];

// --- gear: DAMAGE = multipliers --------------------------------------------
//
// Attack speed and crit are not utility. They multiply your damage, and
// grouping them with move speed made a "utility" slot the best damage slot on
// the item.
export const GEAR_SECONDARY_MODS: ModDef[] = [
  {
    id: 'attack_speed',
    slot: 'damage',
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
    slot: 'damage',
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
    slot: 'damage',
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
    slot: 'damage',
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
    slot: 'damage',
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
    slot: 'damage',
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
// Only boots and amulets have these slots, so this is where move speed lives
// and where it competes for room. Three slots on the whole character, which
// is what stops universally-useful mods from being free power.
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
    // Fragments go stale; the scarce classes never do.
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
// Written as a loop rather than eighteen near-identical blocks. Adding a
// damage type to DAMAGE_TYPES gives it flat damage, increased damage and a
// resistance automatically, which is the whole point of the table.

const FLAT_DAMAGE_NAMES: Record<string, string> = {
  physical: 'Weighted',
  fire: 'Smouldering',
  cold: 'Frostbound',
  lightning: 'Thunderstruck',
  poison: 'Venomous',
  dark: 'Shrouded',
  light: 'Radiant',
  crystal: 'Faceted',
};

const INC_DAMAGE_NAMES: Record<string, string> = {
  physical: 'Heavy',
  fire: 'Blazing',
  cold: 'Glacial',
  lightning: 'Storming',
  poison: 'Virulent',
  dark: 'Umbral',
  light: 'Brilliant',
  crystal: 'Prismatic',
};

/**
 * Delivery tags, not damage types.
 *
 * A damage type is WHAT (fire, cold); a delivery tag is HOW (projectile,
 * spell, melee). They're separate axes, and skill tags ride along in every
 * damage pass — so a mod tagged ['projectile'] scales any projectile skill
 * whatever its element, with no engine change.
 *
 * This is also why a damage type must NEVER appear in a skill's tags: it
 * would then satisfy every type pass and scale the lot.
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
export const ALL_MODS: ModDef[] = [...CRYSTAL_MODS, ...GEAR_MODS];

// ===========================================================================
// CURRENCIES
//
// Adding a currency = adding an entry here. No new code unless you need a
// genuinely new kind of mutation.
// ===========================================================================

export const CURRENCIES: CurrencyDef[] = [
  // --- basic: the ones that become effectively infinite ------------------
  {
    id: 'shard_of_making',
    name: 'Shard of Making',
    class: 'basic',
    description: 'Fills one empty slot with a random modifier.',
    targets: {},
    requires: [{ kind: 'not_corrupted' }, { kind: 'has_open_slot' }],
    effects: [{ kind: 'add_mod', count: 1 }],
  },
  {
    id: 'shard_of_unmaking',
    name: 'Shard of Unmaking',
    class: 'basic',
    description: 'Removes one modifier at random.',
    targets: {},
    requires: [{ kind: 'not_corrupted' }, { kind: 'mod_count', min: 1 }],
    effects: [{ kind: 'remove_mod', count: 1 }],
  },
  {
    id: 'shard_of_change',
    name: 'Shard of Change',
    class: 'basic',
    description: 'Re-rolls the numeric values of all modifiers.',
    targets: {},
    requires: [{ kind: 'not_corrupted' }, { kind: 'mod_count', min: 1 }],
    effects: [{ kind: 'reroll_values' }],
  },
  {
    id: 'shard_of_awakening',
    name: 'Shard of Awakening',
    class: 'basic',
    description: 'Fills every empty slot at once.',
    targets: {},
    requires: [{ kind: 'not_corrupted' }, { kind: 'has_open_slot' }],
    effects: [{ kind: 'fill_slots' }],
  },
  {
    id: 'shard_of_chaos',
    name: 'Shard of Chaos',
    class: 'basic',
    description: 'Re-rolls every modifier, keeping the same number of them.',
    targets: {},
    requires: [{ kind: 'not_corrupted' }, { kind: 'mod_count', min: 1 }],
    effects: [{ kind: 'reroll_mods' }],
  },

  // --- specialised: the ones you actually care about later ---------------
  {
    id: 'essence_of_the_swarm',
    name: 'Essence of the Swarm',
    class: 'uncommon',
    description: 'Fills a slot with a guaranteed Density modifier.',
    targets: { kinds: ['crystal'] },
    requires: [{ kind: 'not_corrupted' }, { kind: 'has_open_slot' }],
    effects: [{ kind: 'add_mod', tag: 'density' }],
  },
  {
    id: 'essence_of_greed',
    name: 'Essence of Greed',
    class: 'uncommon',
    description: 'Fills a slot with a guaranteed Reward modifier.',
    targets: { kinds: ['crystal'] },
    requires: [{ kind: 'not_corrupted' }, { kind: 'has_open_slot' }],
    effects: [{ kind: 'add_mod', tag: 'reward' }],
  },
  {
    id: 'whetstone_of_might',
    name: 'Whetstone of Might',
    class: 'uncommon',
    description: 'Fills a main slot with a guaranteed Damage modifier.',
    targets: { kinds: ['gear'], slots: ['main'] },
    requires: [{ kind: 'not_corrupted' }, { kind: 'has_open_slot', slot: 'offence' }],
    effects: [{ kind: 'add_mod', slot: 'offence', tag: 'damage' }],
  },
  {
    id: 'oil_of_swiftness',
    name: 'Oil of Swiftness',
    class: 'uncommon',
    description: 'Fills a secondary slot with a guaranteed Speed modifier.',
    targets: { kinds: ['gear'], slots: ['secondary'] },
    requires: [
      { kind: 'not_corrupted' },
      { kind: 'has_open_slot', slot: 'utility' },
    ],
    effects: [{ kind: 'add_mod', slot: 'utility', tag: 'speed' }],
  },
  {
    id: 'sigil_of_refinement',
    name: 'Sigil of Refinement',
    class: 'rare',
    description: 'Upgrades one modifier to a higher tier.',
    targets: {},
    requires: [{ kind: 'not_corrupted' }, { kind: 'mod_count', min: 1 }],
    effects: [{ kind: 'upgrade_mod_tier' }],
  },
  {
    id: 'sigil_of_excess',
    name: 'Sigil of Excess',
    class: 'exotic',
    description: 'Grants one slot beyond the base limit. Only on a full item.',
    targets: {},
    requires: [{ kind: 'not_corrupted' }, { kind: 'slots_full' }],
    effects: [{ kind: 'add_slot', count: 1 }],
  },
  {
    id: 'sigil_of_finality',
    name: 'Sigil of Finality',
    class: 'exotic',
    description:
      'Empowers or diminishes every modifier by 25% at random, then locks the item permanently.',
    targets: {},
    requires: [{ kind: 'not_corrupted' }],
    // A coin flip you can't take back. Scaling what's already rolled (rather
    // than adding) means the better the item, the more the gamble costs you —
    // so finishing a good item is a real decision instead of a free upgrade.
    effects: [
      { kind: 'scale_values', magnitude: 0.25, optional: true },
      { kind: 'corrupt' },
    ],
  },
  {
    // Deliberately exotic and drop-only. As a cheap basic this was the single
    // biggest thing devaluing bases: any good chest could be spammed back to
    // blank and re-rolled for free, so no base was ever worth keeping. Making
    // a wipe scarce is what gives a well-rolled base its weight.
    id: 'shard_of_ruin',
    name: 'Shard of Ruin',
    class: 'exotic',
    description: 'Strips every modifier, emptying all slots. Rare — spend it carefully.',
    targets: {},
    requires: [{ kind: 'not_corrupted' }, { kind: 'mod_count', min: 1 }],
    effects: [{ kind: 'clear_mods' }],
  },
];

export const CURRENCY_BY_ID: Record<string, CurrencyDef> = Object.fromEntries(
  CURRENCIES.map((c) => [c.id, c])
);

// ===========================================================================
// RECIPES — fragments are the universal feedstock
//
// Every fragment spent on a crystal is a fragment not spent on gear crafting.
// That contested single resource IS the endgame decision.
// ===========================================================================

export const CRYSTAL_TIERS = [
  { tier: 1, ilvl: 10, fragments: 8 },
  { tier: 2, ilvl: 22, fragments: 20 },
  { tier: 3, ilvl: 34, fragments: 45 },
  { tier: 4, ilvl: 46, fragments: 95 },
  { tier: 5, ilvl: 58, fragments: 190 },
  { tier: 6, ilvl: 70, fragments: 370 },
];

// ===========================================================================
// COMBAT BASELINES
//
// The character's stats before any gear, and a monster's before any crystal
// mods. Every one of these is a dial you will want to turn while watching a
// run, so they live here rather than buried in the sim.
//
// Distances are in tiles, speeds in tiles/second, rates in per-second.
// ===========================================================================

// Deliberately generous. A character that insta-dies makes the game
// unwatchable, which blocks judging whether the loop is any fun — so when in
// doubt these go up, not down. Tune for real once the systems stop moving.
export const HERO_BASE = {
  life: 320,
  /** Physical damage per hit before gear. Elemental damage is gear-only. */
  weaponDamage: 72,
  attacksPerSecond: 1.2,
  critChance: 5,
  /** Extra percent on a crit, on top of the base doubling. */
  critMultiplier: 0,
  moveSpeed: 3.4,
  armour: 0,
  attackRange: 1.7,
  /** Body radius in tiles. */
  radius: 0.34,
  /** How far the hero will notice a monster and divert to fight it. */
  aggroRange: 9,
  /**
   * Percent of max life per second.
   *
   * Recovery between packs is what turns a run into a series of fights
   * rather than one attrition curve you always lose. But at 2.2% it
   * out-healed everything a low tier could do — a naked character finished
   * their first descent at full life, so nothing was ever at stake.
   *
   * Tuned so an ungeared level 1 finishes the Fissure around a third of the
   * way down: visibly hurt, never actually threatened.
   */
  lifeRegenPercent: 1.0,
};

export const MONSTER_BASE = {
  /**
   * Raised sharply from 26.
   *
   * A naked character killed a tier 1 monster in about a third of a second,
   * so a pack died before it landed two hits and the first descent ended at
   * full life. Nothing was at stake because nothing survived long enough to
   * swing.
   */
  life: 46,
  damage: 2.9,
  attacksPerSecond: 0.8,
  moveSpeed: 2.3,
  attackRange: 1.3,
  aggroRange: 8,
};

/**
 * Per-tier monster scaling.
 *
 * Life outpaces damage so climbing tiers first reads as "this takes longer",
 * and only later as "this kills me". Starter gear comfortably clears T1-T3
 * and loses badly around T6 — that gap is the reason to craft.
 */
/**
 * Flattened along with the base raise.
 *
 * Raising the base without lowering these would have made the top tiers
 * unreachable rather than the bottom one meaningful. The intent is a curve
 * that starts somewhere real and ends roughly where it already did.
 */
export const MONSTER_TIER_SCALE = { life: 1.36, damage: 1.24 };

// ===========================================================================
// MONSTER KINDS
//
// Multipliers on the tier-scaled baseline, so identity and tier scaling stay
// independent. A pack rolls ONE kind and spawns all of it — mixed packs read
// as noise on screen, uniform packs read as "that's a Brute pack, careful".
//
// Adding a kind is a data entry. `sprite` is a name the renderer maps to art;
// the sim never knows what it looks like.
// ===========================================================================

export const MONSTERS: MonsterDef[] = [
  {
    id: 'grub',
    name: 'Grub',
    life: 0.8,
    damage: 0.85,
    moveSpeed: 0.85,
    attacksPerSecond: 1,
    attackRange: 1,
    radius: 0.3,
    sprite: 'grub',
    weight: 1000,
    tags: ['beast'],
  },
  {
    id: 'husk',
    name: 'Husk',
    life: 1.1,
    damage: 1,
    moveSpeed: 1,
    attacksPerSecond: 0.9,
    attackRange: 1,
    radius: 0.32,
    sprite: 'husk',
    weight: 800,
    tags: ['undead'],
  },
  {
    id: 'stalker',
    name: 'Stalker',
    life: 0.6,
    damage: 1,
    moveSpeed: 1.45,
    attacksPerSecond: 1.25,
    attackRange: 1,
    radius: 0.26,
    sprite: 'stalker',
    weight: 600,
    tags: ['beast'],
  },
  {
    id: 'brute',
    name: 'Brute',
    life: 2.2,
    damage: 1.6,
    moveSpeed: 0.7,
    attacksPerSecond: 0.7,
    attackRange: 1.15,
    radius: 0.44,
    sprite: 'brute',
    weight: 260,
    tags: ['humanoid'],
  },
];

export const MONSTER_BY_ID: Record<string, MonsterDef> = Object.fromEntries(
  MONSTERS.map((m) => [m.id, m])
);

/**
 * Chance a pack spawns wielding the ranged skill instead of closing to melee.
 *
 * Rolled per PACK, not per monster, for the same reason kinds are: a pack that
 * hangs back and shoots is a thing you can recognise, where one archer mixed
 * into a melee pack is just an inconsistency.
 */
export const RANGED_PACK_CHANCE = 0.25;

// ===========================================================================
// FINALE
//
// Once the floor is empty, something waits at the exit. Which something is
// rolled per RUN and isn't shown beforehand — if you could see it coming you'd
// socket the crystal that suits your build, which is the opposite of keeping
// it fresh.
//
// Three shapes deliberately: one huge target, a handful of tough ones, and a
// swarm. They stress different things — single-target damage, sustained
// fighting, area clear — so no one build owns the ending. Equal weights: it
// should feel like a coin toss, not a rare event.
//
// Multipliers apply to whatever the descent's normal monsters already are, so
// a finale under a dangerous crystal is dangerous for the same reasons.
// ===========================================================================

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
  /** Multiplier on the xp and fragments each one is worth. */
  bounty: number;
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
  },
];

/** Which skill a ranged pack uses. */
export const MONSTER_RANGED_SKILL = 'bolt';

// ===========================================================================
// LOOT
//
// Fragments are the only thing that drops today, but what the sim accumulates
// is a currency map plus an item list — so adding shards, gear or crystals
// later changes what gets pushed in, not the plumbing that carries it or the
// overlay that displays it.
//
// Loot banks only when a run is CLEARED. Dying loses it, which is what makes
// the clear/fail distinction worth anything.
// ===========================================================================

// ===========================================================================
// DANGER → REWARD
//
// Every crystal modifier is a DOWNSIDE. Reward is derived from how dangerous
// the descent has become, rather than being rolled separately.
//
// The point is that no mod is simply good or simply bad: a roll becomes "how
// much of this can my character eat", and a build that shrugs off one kind of
// danger is being paid extra for it. That's the whole reason this model is
// worth the plumbing.
//
// `weight` is how dangerous one point of a stat is, relative to monster
// damage at 1.0. `rewards` is whether that danger PAYS.
//
// Density is the exception: more monsters is genuinely harder, so it counts
// toward the displayed Danger, but it already pays you in extra kills — more
// loot and more XP fall out of there being more things to kill. Letting it
// also raise the multiplier would pay twice and make density the mod you
// always want.
// ===========================================================================

export interface DangerStat {
  weight: number;
  rewards: boolean;
}

export const DANGER_STATS: Record<string, DangerStat> = {
  monsterDamage: { weight: 1.0, rewards: true },
  monsterLife: { weight: 0.7, rewards: true },
  monsterArmour: { weight: 0.55, rewards: true },
  monsterCrit: { weight: 0.5, rewards: true },
  monsterFire: { weight: 0.9, rewards: true },
  monsterMoveSpeed: { weight: 0.6, rewards: true },
  layoutComplexity: { weight: 0.2, rewards: true },
  packCount: { weight: 0.5, rewards: false },
  packSize: { weight: 0.5, rewards: false },
};

/**
 * What a point of rewarding danger is worth.
 *
 * Loot only, deliberately — XP stays per-kill. If a "juice XP at the cost of
 * loot" modifier arrives later, it belongs here as a second channel rather
 * than as a special case in the sim.
 */
export const REWARD = {
  /** Fragment multiplier gained per danger point. 100 danger = +100%. */
  fragmentPerDanger: 0.01,
  /** Rarity percent gained per danger point. */
  rarityPerDanger: 0.8,
};

/**
 * Currency drops, and what rarity does to them.
 *
 * A drop picks a class first and then a currency within it, so rarity
 * upgrading `basic → uncommon → rare → exotic` is the only thing that gets
 * you the scarce ones. This is also what finally gives the sigils a source.
 */
export const CURRENCY_DROP = {
  chancePerKill: 0.022,
  /** Per-step chance to climb one class, before rarity is applied. */
  upgradeChance: 0.17,
};

export const LOOT = {
  /**
   * Fragments one monster is worth at tier 1. Accumulates fractionally and
   * rounds when banked, so per-kill values below 1 still work.
   */
  fragmentsPerKill: 0.115,
  /**
   * Multiplier per crystal tier.
   *
   * Matched to how crystal COST scales (roughly 2.1x a tier). At 1.85 the
   * yield fell behind the price every tier, so climbing was a losing trade
   * however well you played — the deep tiers could never pay for themselves.
   *
   * Now a juiced crystal sustains its own tier with a little over, and a
   * plain one does not, which is what makes crafting the crystal the point
   * rather than an optional flourish.
   */
  tierScale: 2.1,
};

/**
 * What a new game starts with, so there's something to do immediately.
 *
 * The currency matters as much as the fragments: with an empty wallet the
 * bench is a shelf of disabled buttons until you've been to the workshop,
 * which is a poor first thirty seconds.
 */
/**
 * The Fissure, unempowered — what you descend into with an empty socket.
 *
 * There is only one place you ever go; a crystal empowers it rather than
 * replacing it. These are the numbers for a descent with nothing socketed:
 * always available, costs nothing, carries no danger, and therefore pays the
 * base rate and nothing more.
 *
 * Without this floor the economy can strand you — a plain crystal banks less
 * than it costs, so a player out of both crystals and fragments would have no
 * way back in. It's a way back, not a place to farm, and it doubles as the
 * first descent anyone makes.
 */
export const FISSURE = {
  tier: 1,
  name: 'The Fissure',
  description: 'A thin place in the rock. Costs nothing, pays little, always open.',
  /**
   * Thinner than a tier 1 crystal makes it.
   *
   * It's the first thing anyone descends into, so it should leave you visibly
   * hurt without killing you. A plain T1 crystal killed an ungeared character
   * roughly one run in five — acceptable for a descent you chose to empower,
   * not for the one the game hands you.
   */
  densityScale: 0.55,
  /**
   * What clearing it the FIRST time hands you, on top of the descent's own
   * loot: a Shard of Awakening (10), a Shard of Chaos (12), and a Tier 1
   * crystal (8) — the exact cost of everything the guided opening asks you to
   * do, plus the crystal it points you at afterwards.
   *
   * Without it the opening was: choose a skill, watch for a minute, and still
   * not have enough for a crystal. The tutorial teaches you to BUY these, so
   * handing them over would skip the thing it's teaching. Covering the crystal
   * matters because the last step tells you that you can afford one: at 22 you
   * finished on zero and it was a lie.
   */
  firstClear: {
    fragments: 30,
    weapon: 'ash_wand',
    currency: {} as Record<string, number>,
  },
};

export interface StartPreset {
  fragments: number;
  currency: Record<string, number>;
  crystals: number[];
  gear: Array<{ base: string; ilvl: number }>;
  /** Whether that gear starts worn, or has to be earned first. */
  equipped: boolean;
}

/**
 * Two starting states, because they answer different questions.
 *
 * `fresh` is what a new player actually gets: nothing at all. `dev` is
 * stocked, for exercising the bench and the tree without grinding first.
 *
 * The distinction matters more than it looks. Judging whether the loop is
 * engaging while starting with a full set of filled gear and 260 fragments
 * is judging the endgame state at the start — no scarcity means nothing to
 * progress through.
 */
export const START_PRESETS: Record<'fresh' | 'dev', StartPreset> = {
  /**
   * Nothing at all — not even a crystal.
   *
   * Two starting crystals read as "use these now", and a brand-new character
   * socketing one into their first descent died to it. The Fissure is always
   * open and always free; crystals are what you spend the first clear's
   * fragments ON, once you have something to spend.
   */
  fresh: { fragments: 0, currency: {}, crystals: [], gear: [], equipped: false },
  dev: {
    fragments: 260,
    currency: {},
    crystals: [1, 1, 2],
    gear: [],
    equipped: true,
  },
};

/** Dev kit only — nobody is handed these by playing. */
export const DEV_CURRENCY: Record<string, number> = {
  shard_of_making: 6,
  shard_of_awakening: 3,
  shard_of_unmaking: 3,
  shard_of_change: 4,
  // The rare ones have no recipe and, until runs drop currency, no source at
  // all. Seeded here so the whole bench can be exercised rather than half of
  // it being permanently greyed out.
  sigil_of_refinement: 2,
  sigil_of_excess: 1,
  sigil_of_finality: 1,
  shard_of_ruin: 1,
  shard_of_chaos: 2,
};

/** One of each base at low ilvl, so every slot can be filled immediately. */
export const DEV_GEAR = GEAR_BASES.map((b) => ({ base: b.id, ilvl: 20 }));

// Fill in the halves of the preset that depend on the constants above.
START_PRESETS.dev.currency = DEV_CURRENCY;
START_PRESETS.dev.gear = DEV_GEAR;

/** What each level is worth, and how much XP a level costs. */
export const LEVELLING = {
  lifePerLevel: 14,
  damagePerLevel: 1.6,
  /** XP from one tier-1 monster. */
  perMonster: 8,
  tierScale: 1.6,
  /**
   * xpToNext(level) = curveBase * level ^ curveExponent
   *
   * Tuned so a first cleared T1 descent is worth roughly two levels and the curve
   * outruns a single run quickly after that. Higher tiers pay far more per
   * monster, so climbing tiers — not grinding T1 — is what levels you.
   */
  curveBase: 260,
  curveExponent: 1.8,
};

// ===========================================================================
// SKILLS
//
// Adding a skill is normally a data entry here naming a behaviour from
// SKILL_BEHAVIOURS in sim/skills.ts — same deal as currencies and effects.
//
// `tags` feed the modifier engine, so a skill tagged ['attack','melee'] picks
// up "increased Melee Damage" with no special-casing. Damage types belong in
// `damageTypes`, NOT in tags, or "increased Physical Damage" would leak onto
// a skill's fire damage.
// ===========================================================================

export const SKILLS: SkillDef[] = [
  {
    id: 'strike',
    name: 'Strike',
    description:
      'A sweeping melee hit. Full damage to the target, 10% to everything else in reach.',
    tags: ['attack', 'melee'],
    behaviour: 'cleave',
    damageTypes: ['physical'],
    damageMultiplier: 1,
    rateMultiplier: 1,
    range: HERO_BASE.attackRange,
    vfxKind: 'slash',
    // Splash is placeholder-cheap on purpose. The mechanism is what matters;
    // 10% is a number to look at, not a number that has been balanced.
    params: { splashRadius: 2.2, splashMultiplier: 0.1 },
  },
  {
    // Needed no new code — same single_target behaviour, longer range. That is
    // the registry doing its job.
    //
    // `projectile` is a delivery tag and `fire` is a damage type: the tag
    // goes in tags, the type in damageTypes. Putting the type in tags would
    // make it satisfy every damage pass and scale the lot.
    id: 'bolt',
    name: 'Fire Bolt',
    description: 'A bolt of fire at range. Single target, from much further away.',
    tags: ['spell', 'projectile'],
    behaviour: 'single_target',
    damageTypes: ['fire'],
    damageMultiplier: 1,
    rateMultiplier: 1,
    range: 6.5,
    vfxKind: 'bolt',
  },
  {
    /**
     * The first skill that doesn't work by hitting things.
     *
     * Damage over time is resisted but NOT reduced by armour, so this is the
     * answer to a target you can't punch through — and the first case where
     * what a monster is armoured against actually matters.
     *
     * Low per-stack damage that stacks is deliberate: the payoff comes from
     * applying it to a crowd early and letting it work while you fight, not
     * from any single cast.
     */
    id: 'blight',
    name: 'Creeping Blight',
    description:
      'Poisons up to 5 nearby enemies for 10s. Weak alone, and it stacks.',
    // 'occult' is a damage GROUP and must not appear here. Skill tags ride
    // along in every damage pass, so a stat line tagged 'occult' would scale
    // this skill's fire damage too once Pyroclasm converts it.
    tags: ['spell', 'area'],
    behaviour: 'ailment_burst',
    damageTypes: ['poison'],
    damageMultiplier: 1.6,
    rateMultiplier: 0.75,
    range: 6.5,
    vfxKind: 'blight',
    params: { targets: 5, radius: 3.2, duration: 10 },
  },
];

export const SKILL_BY_ID: Record<string, SkillDef> = Object.fromEntries(
  SKILLS.map((s) => [s.id, s])
);

export const RECIPES: Recipe[] = [
  ...CRYSTAL_TIERS.map((t) => ({
    id: `crystal_t${t.tier}`,
    name: `Tier ${t.tier} Crystal`,
    inputs: { fragment: t.fragments },
    output: { type: 'item' as const, base: `crystal_t${t.tier}`, qty: 1 },
  })),
  {
    id: 'make_shard_of_making',
    name: 'Shard of Making',
    inputs: { fragment: 5 },
    output: { type: 'currency', id: 'shard_of_making', qty: 1 },
  },
  {
    id: 'make_shard_of_unmaking',
    name: 'Shard of Unmaking',
    inputs: { fragment: 7 },
    output: { type: 'currency', id: 'shard_of_unmaking', qty: 1 },
  },
  {
    id: 'make_shard_of_change',
    name: 'Shard of Change',
    inputs: { fragment: 3 },
    output: { type: 'currency', id: 'shard_of_change', qty: 1 },
  },
  {
    id: 'make_shard_of_awakening',
    name: 'Shard of Awakening',
    inputs: { fragment: 10 },
    output: { type: 'currency', id: 'shard_of_awakening', qty: 1 },
  },
  // No recipe for Shard of Ruin — it's exotic and drop-only. If you could buy
  // a wipe for fragments, bases would be disposable again.
  {
    id: 'make_shard_of_chaos',
    name: 'Shard of Chaos',
    inputs: { fragment: 12 },
    output: { type: 'currency', id: 'shard_of_chaos', qty: 1 },
  },
];
