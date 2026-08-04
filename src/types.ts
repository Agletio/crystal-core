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
