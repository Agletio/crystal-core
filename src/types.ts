/**
 * Core types.
 *
 * Design note: gear and crystals are the SAME data structure. A crystal is an
 * item whose mods happen to affect map generation instead of your character.
 * This is why "add a mod" currency works on both without any special-casing,
 * and it's the single biggest reason this system stays small as it grows.
 */

export type StatForm = 'flat' | 'inc' | 'more';
export type ItemKind = 'gear' | 'crystal';

/**
 * Slot types are just strings, declared per item base. Crystals use a single
 * undifferentiated 'mod' slot; gear splits into 'main' and 'secondary'.
 * Prefix/suffix was only ever one instance of this pattern — generalising it
 * means a future base can invent its own slot layout with no engine change.
 */
export type ModSlot = string;

/** Purely derived from how full an item is. Display only, never stored. */
export type FillState = 'blank' | 'partial' | 'full';

/** A concrete rolled stat line on an item. */
export interface StatRoll {
  stat: string;
  form: StatForm;
  value: number;
  tags: string[];
}

/** The authored range a stat rolls within. */
export interface StatSpec {
  stat: string;
  form: StatForm;
  range: [number, number];
  /** Tags for the modifier engine: ['fire'], ['projectile'], etc. */
  tags?: string[];
}

/** Authoring format for a mod family and all its tiers. */
export interface ModDef {
  id: string;
  /** Exclusion group. Two mods from the same group can't coexist on an item. */
  group?: string;
  slot: ModSlot;
  name: string;
  /** Item must have ALL of these tags for the mod to be eligible. */
  appliesTo: string[];
  /** Mod tags, used by tag-filtered currencies ("adds a Density mod"). */
  tags?: string[];
  /** Author best tier first. ilvl is the minimum item level to roll it. */
  tiers: Array<{
    ilvl: number;
    weight: number;
    stats: StatSpec[];
    name?: string;
  }>;
}

/** A flattened, individually-rollable tier. The pool is a list of these. */
export interface ModEntry {
  id: string;
  defId: string;
  group: string;
  slot: ModSlot;
  name: string;
  tier: number;
  ilvl: number;
  weight: number;
  appliesTo: string[];
  tags: string[];
  stats: StatSpec[];
}

/** A mod actually present on an item, with values already rolled. */
export interface RolledMod {
  entryId: string;
  defId: string;
  group: string;
  slot: ModSlot;
  name: string;
  tier: number;
  tags: string[];
  stats: StatRoll[];
}

export interface Item {
  id: string;
  kind: ItemKind;
  base: string;
  name: string;
  /** Item tags. Mods match against these. e.g. ['crystal','tier3'] */
  tags: string[];
  ilvl: number;
  /** Slot capacity, declared by the base. e.g. { main: 2, secondary: 2 } */
  slots: Record<ModSlot, number>;
  mods: RolledMod[];
  /** Escape hatch for one-off state: bonus slots, corruption, etc. */
  meta: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Currencies
// ---------------------------------------------------------------------------

/** A declarative gate. Resolved by the CONDITIONS registry. */
export interface Condition {
  kind: string;
  [param: string]: any;
}

/** A declarative mutation. Resolved by the EFFECTS registry. */
export interface Effect {
  kind: string;
  [param: string]: any;
}

export type CurrencyClass = 'basic' | 'uncommon' | 'rare' | 'exotic';

export interface CurrencyDef {
  id: string;
  name: string;
  class: CurrencyClass;
  description: string;
  /** What this currency is allowed to be used on. */
  targets: {
    kinds?: ItemKind[];
    /** Item must have ALL of these tags. */
    tags?: string[];
    /** Item base must declare at least one of these slot types. */
    slots?: ModSlot[];
  };
  /** Extra gates beyond targets. All must pass. */
  requires?: Condition[];
  /** Applied in order. If one fails, the whole craft is rolled back. */
  effects: Effect[];
}

// ---------------------------------------------------------------------------
// Monsters
// ---------------------------------------------------------------------------

/**
 * A kind of monster. Stat fields are MULTIPLIERS on the tier-scaled baseline
 * in MONSTER_BASE, so tier scaling and monster identity stay independent —
 * a Brute is 2.2x whatever a monster is worth at that tier.
 *
 * `sprite` is the only renderer-facing field, and it's a name rather than any
 * kind of asset: the placeholder renderer draws a shape for it, a real one
 * looks up a sprite sheet. The sim never knows which.
 */
export interface MonsterDef {
  id: string;
  name: string;
  life: number;
  damage: number;
  moveSpeed: number;
  attacksPerSecond: number;
  attackRange: number;
  /** Body radius in tiles. Units push each other apart rather than stacking. */
  radius: number;
  sprite: string;
  /** Relative spawn weight. */
  weight: number;
  tags?: string[];
}

// ---------------------------------------------------------------------------
// Skills
// ---------------------------------------------------------------------------

/**
 * An authored skill. Same shape of idea as CurrencyDef: the data says WHAT,
 * a registry entry says HOW, and most new skills need no new code.
 *
 * `tags` are what the modifier engine matches against, exactly like mod tags —
 * a skill tagged ['attack','melee'] picks up "increased Melee Damage" for free.
 * Deliberately do NOT put damage types in `tags`; those come from
 * `damageTypes`, so "increased Physical Damage" can't leak onto a skill's fire
 * damage.
 */
export interface SkillDef {
  id: string;
  name: string;
  description: string;
  /** Modifier-engine tags: 'attack', 'spell', 'melee', 'area', 'chain', … */
  tags: string[];
  /** Key into the SKILL_BEHAVIOURS registry — how the hit is delivered. */
  behaviour: string;
  /** Which damage types this skill's BASE damage is dealt as. */
  damageTypes: string[];
  /** Multiplier on base damage. */
  damageMultiplier: number;
  /** Multiplier on the character's attacks/sec. */
  rateMultiplier: number;
  /** Reach, in tiles. */
  range: number;
  /** Behaviour-specific knobs: chain count, radius, projectile count, … */
  params?: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Economy
// ---------------------------------------------------------------------------

export interface Recipe {
  id: string;
  name: string;
  /** Currency id -> quantity consumed. */
  inputs: Record<string, number>;
  output:
    | { type: 'currency'; id: string; qty: number }
    | { type: 'item'; base: string; qty: number };
}

/** Player's stock of every currency. */
export type Wallet = Record<string, number>;

export interface CraftResult {
  ok: boolean;
  item: Item;
  log: string[];
  error?: string;
}
