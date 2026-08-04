import type { CurrencyDef, ModDef, Recipe } from './types';

// ===========================================================================
// SLOT LAYOUTS
//
// Declared per base. Crystals use a single undifferentiated slot type;
// gear splits power (main) from utility (secondary) so the two never compete.
// ===========================================================================

export const CRYSTAL_SLOTS = { mod: 3 };
export const GEAR_SLOTS = { main: 2, secondary: 2 };

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
  {
    id: 'item_rarity',
    slot: 'mod',
    name: 'Gilded',
    appliesTo: ['crystal'],
    tags: ['reward'],
    tiers: [
      { ilvl: 50, weight: 250, stats: [{ stat: 'itemRarity', form: 'inc', range: [40, 60] }] },
      { ilvl: 1, weight: 900, stats: [{ stat: 'itemRarity', form: 'inc', range: [15, 30] }] },
    ],
  },
  {
    id: 'fragment_yield',
    slot: 'mod',
    name: 'Fractured',
    appliesTo: ['crystal'],
    tags: ['reward', 'sustain'],
    tiers: [
      { ilvl: 40, weight: 300, stats: [{ stat: 'fragmentYield', form: 'inc', range: [25, 40] }] },
      { ilvl: 1, weight: 800, stats: [{ stat: 'fragmentYield', form: 'inc', range: [10, 20] }] },
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

// --- gear: MAIN = raw power ------------------------------------------------
export const GEAR_MAIN_MODS: ModDef[] = [
  {
    id: 'flat_life',
    slot: 'main',
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
    id: 'armour',
    slot: 'main',
    name: 'Plated',
    appliesTo: ['gear'],
    tags: ['defence'],
    tiers: [
      { ilvl: 50, weight: 350, stats: [{ stat: 'armour', form: 'flat', range: [90, 140] }] },
      { ilvl: 1, weight: 900, stats: [{ stat: 'armour', form: 'flat', range: [20, 60] }] },
    ],
  },
  {
    id: 'inc_phys_damage',
    slot: 'main',
    name: 'Heavy',
    appliesTo: ['gear'],
    tags: ['damage', 'physical'],
    tiers: [
      { ilvl: 55, weight: 250, stats: [{ stat: 'damage', form: 'inc', range: [60, 80], tags: ['physical'] }] },
      { ilvl: 1, weight: 900, stats: [{ stat: 'damage', form: 'inc', range: [20, 40], tags: ['physical'] }] },
    ],
  },
  {
    id: 'flat_fire_damage',
    slot: 'main',
    name: 'Smouldering',
    appliesTo: ['gear'],
    tags: ['damage', 'fire', 'elemental'],
    tiers: [
      { ilvl: 45, weight: 400, stats: [{ stat: 'damage', form: 'flat', range: [12, 24], tags: ['fire'] }] },
      { ilvl: 1, weight: 900, stats: [{ stat: 'damage', form: 'flat', range: [3, 8], tags: ['fire'] }] },
    ],
  },
  {
    id: 'flat_cold_damage',
    slot: 'main',
    name: 'Frostbound',
    appliesTo: ['gear'],
    tags: ['damage', 'cold', 'elemental'],
    tiers: [
      { ilvl: 45, weight: 400, stats: [{ stat: 'damage', form: 'flat', range: [10, 20], tags: ['cold'] }] },
      { ilvl: 1, weight: 900, stats: [{ stat: 'damage', form: 'flat', range: [2, 7], tags: ['cold'] }] },
    ],
  },
];

// --- gear: SECONDARY = utility and clear speed -----------------------------
export const GEAR_SECONDARY_MODS: ModDef[] = [
  {
    id: 'move_speed',
    slot: 'secondary',
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
    id: 'attack_speed',
    slot: 'secondary',
    name: 'of Alacrity',
    appliesTo: ['gear'],
    tags: ['speed', 'damage'],
    tiers: [
      { ilvl: 40, weight: 300, stats: [{ stat: 'attackSpeed', form: 'inc', range: [14, 20] }] },
      { ilvl: 1, weight: 800, stats: [{ stat: 'attackSpeed', form: 'inc', range: [5, 12] }] },
    ],
  },
  {
    id: 'pickup_radius',
    slot: 'secondary',
    name: 'of Gathering',
    appliesTo: ['gear'],
    tags: ['utility', 'clear'],
    tiers: [
      { ilvl: 1, weight: 500, stats: [{ stat: 'pickupRadius', form: 'inc', range: [20, 45] }] },
    ],
  },
  {
    id: 'aoe',
    slot: 'secondary',
    name: 'of Reach',
    appliesTo: ['gear'],
    tags: ['area', 'clear'],
    tiers: [
      { ilvl: 35, weight: 250, stats: [{ stat: 'areaOfEffect', form: 'inc', range: [18, 26] }] },
      { ilvl: 1, weight: 600, stats: [{ stat: 'areaOfEffect', form: 'inc', range: [6, 15] }] },
    ],
  },
  {
    id: 'crit_chance',
    slot: 'secondary',
    name: 'of Precision',
    appliesTo: ['gear'],
    tags: ['crit', 'damage'],
    tiers: [
      { ilvl: 45, weight: 250, stats: [{ stat: 'critChance', form: 'inc', range: [30, 45] }] },
      { ilvl: 1, weight: 700, stats: [{ stat: 'critChance', form: 'inc', range: [10, 25] }] },
    ],
  },
];

export const GEAR_MODS: ModDef[] = [...GEAR_MAIN_MODS, ...GEAR_SECONDARY_MODS];
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
    id: 'shard_of_ruin',
    name: 'Shard of Ruin',
    class: 'basic',
    description: 'Strips every modifier, emptying all slots.',
    targets: {},
    requires: [{ kind: 'not_corrupted' }, { kind: 'mod_count', min: 1 }],
    effects: [{ kind: 'clear_mods' }],
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
    requires: [{ kind: 'not_corrupted' }, { kind: 'has_open_slot', slot: 'main' }],
    effects: [{ kind: 'add_mod', slot: 'main', tag: 'damage' }],
  },
  {
    id: 'oil_of_swiftness',
    name: 'Oil of Swiftness',
    class: 'uncommon',
    description: 'Fills a secondary slot with a guaranteed Speed modifier.',
    targets: { kinds: ['gear'], slots: ['secondary'] },
    requires: [
      { kind: 'not_corrupted' },
      { kind: 'has_open_slot', slot: 'secondary' },
    ],
    effects: [{ kind: 'add_mod', slot: 'secondary', tag: 'speed' }],
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
    description: 'Fills a slot if it can, then locks the item permanently.',
    targets: {},
    requires: [{ kind: 'not_corrupted' }],
    effects: [
      { kind: 'add_mod', optional: true },
      { kind: 'corrupt' },
    ],
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
  {
    id: 'make_shard_of_ruin',
    name: 'Shard of Ruin',
    inputs: { fragment: 4 },
    output: { type: 'currency', id: 'shard_of_ruin', qty: 1 },
  },
  {
    id: 'make_shard_of_chaos',
    name: 'Shard of Chaos',
    inputs: { fragment: 12 },
    output: { type: 'currency', id: 'shard_of_chaos', qty: 1 },
  },
];
