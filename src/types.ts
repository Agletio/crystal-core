/**
 * Core types.
 *
 * Gear and crystals are the SAME structure — a crystal is an item whose mods
 * affect map generation instead of your character — so every currency works on
 * both with no special-casing.
 */

export type StatForm = 'flat' | 'inc' | 'more';
export type ItemKind = 'gear' | 'crystal';

/** How many modifiers an item may carry — the base's slot table says which
 *  KINDS. How finished it is, against what it is. */
export type Quality = 'rough' | 'seamed' | 'faceted' | 'brilliant';

/** Declared per base, so a new base can invent its own layout. */
export type ModSlot = string;

/** Purely derived from how full an item is. Display only, never stored. */
export type FillState = 'blank' | 'partial' | 'full';

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
  tags?: string[]; // modifier-engine tags: ['fire'], ['projectile'], …
}

/** A mod family and all its tiers, as authored. */
export interface ModDef {
  id: string;
  group?: string; // two mods sharing a group can't coexist on an item
  slot: ModSlot;
  name: string;
  appliesTo: string[]; // item must have ALL of these tags
  tags?: string[]; // matched by tag-filtered currencies
  /** Best tier first. ilvl is the minimum item level to roll it. */
  tiers: Array<{
    ilvl: number;
    weight: number;
    stats: StatSpec[];
    name?: string;
  }>;
}

/** One flattened, rollable tier. The pool is a list of these. */
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

/** A mod on an item, values already rolled. */
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
  tags: string[]; // what mods match against: ['crystal','tier3']
  ilvl: number;
  slots: Record<ModSlot, number>; // capacity, declared by the base
  mods: RolledMod[];
  /** Part of the base. Apart from `mods`, which is all crafting can reach. */
  implicits: RolledMod[];
  /** Armour rating off the base. Increases scale it; crafting cannot reach it. */
  armour?: number;
  meta: Record<string, any>; // one-off state: bonus slots, corruption, …
}

/** A gate, resolved by the CONDITIONS registry. */
export interface Condition {
  kind: string;
  [param: string]: any;
}

/** A mutation, resolved by the EFFECTS registry. */
export interface Effect {
  kind: string;
  [param: string]: any;
}

export type CurrencyClass = 'basic' | 'uncommon' | 'rare' | 'exotic';

/** A wall, never a weight: below it the thing does not exist at all. */
export interface DropGate {
  /** Run power below which this never drops. */
  minPower?: number;
  /** The one world it comes out of. */
  zone?: MapTheme;
}

export interface CurrencyDef {
  id: string;
  name: string;
  class: CurrencyClass;
  /** Where this can drop. Absent means anywhere the class is reachable. */
  gate?: DropGate;
  description: string;
  targets: {
    kinds?: ItemKind[];
    tags?: string[]; // item must have ALL of these
    slots?: ModSlot[]; // base must declare at least one of these slot types
  };
  requires?: Condition[]; // all must pass
  /** Applied in order. If one fails, the whole craft is rolled back. */
  effects: Effect[];
}

/** What slot a base occupies. Rings fit either ring slot. */
export type GearKind =
  | 'weapon'
  | 'helmet'
  | 'body'
  | 'gloves'
  | 'boots'
  | 'amulet'
  | 'ring';

export interface GearBase {
  id: string;
  name: string;
  kind: GearKind;
  art: string; // icon family — a name, not an asset
  slots: Record<string, number>; // zero in a slot type means it never rolls one
  /** Never rolled, never removable — what makes a wand worth more than a stick. */
  implicit?: StatSpec[];
  family?: string;
  /** Lowest item level that may drop this base. Absent means from the start. */
  ilvl?: number;
  /** Armour rating the piece carries before any modifier. */
  armour?: number;
}

export interface EquipSlotDef {
  id: string;
  name: string;
  accepts: GearKind;
}

/** A socket in the Fissure. `accepts` is an item kind, so a slot that takes
 *  something other than a crystal is one more entry. */
export interface RunSlotDef {
  id: string;
  name: string;
  accepts: ItemKind;
}

/**
 * Stat fields are MULTIPLIERS on the tier-scaled baseline in MONSTER_BASE, so
 * tier and identity stay independent: a Brute is 2.2x whatever a monster is
 * worth at that tier. `sprite` is a name, not an asset.
 */
export interface MonsterRankDef {
  id: 'common' | 'magic' | 'rare';
  weight: number;
  life: number;
  damage: number;
  bounty: number;
  /** Visual size AND body radius: a rare should read as big before it lands. */
  scale: number;
}

/** Which world a monster belongs to, and which crystal calls it up. */
export type MonsterFamily = 'normal' | 'demonic' | 'prismatic';

export interface MonsterFamilyDef {
  id: MonsterFamily;
  name: string;
  /** Names a crystal of this family. Empty for Normal, which is unmarked. */
  word: string;
  blurb: string;
}

/** Which world you stand in, off the composition. A LOOK: same generator,
 *  same packs, different rock under them. */
export type MapTheme = 'fissure' | 'demonic' | 'prismatic' | 'seam';

export interface MapThemeDef {
  id: MapTheme;
  name: string;
  blurb: string;
}

export interface MonsterDef {
  id: string;
  name: string;
  family: MonsterFamily;
  life: number;
  damage: number;
  moveSpeed: number;
  attacksPerSecond: number;
  attackRange: number;
  radius: number; // in tiles; units push each other apart rather than stacking
  sprite: string;
  /** How much of a tile the art covers. Nothing derives it from radius. */
  scale: number;
  weight: number;
  tags?: string[];
}

/** Which shelf of the Skills screen a skill lives on. */
export type SkillCategory = 'spell' | 'attack' | 'passive' | 'movement';

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  category?: SkillCategory; // omitted for monster-only skills
  /** 'attack', 'spell', 'melee', … NEVER damage types, or they'd scale the lot. */
  tags: string[];
  behaviour: string; // key into SKILL_BEHAVIOURS
  damageTypes: string[]; // what the SKILL'S OWN damage is dealt as
  /** The skill's own damage at level 1. Grows by LEVELLING.damagePerLevel. */
  baseDamage: number;
  /**
   * Percent of flat damage from gear and the tree this skill takes on. 100 is
   * a point for a point; the number is per skill because a lasting skill
   * applies its flat once per stack and a hit applies it once.
   */
  addedEffectiveness: number;
  rateMultiplier: number; // on the character's attacks/sec
  range: number; // in tiles
  vfxKind?: string; // a name, not a shape. Unset draws a generic line
  params?: Record<string, any>; // behaviour-specific knobs
}

/** What the figure is wearing, as art keys. Empty slots are simply absent. */
export interface WornPiece {
  family: string;
  tier: number;
}

export interface Look {
  helmet?: WornPiece;
  body?: WornPiece;
  gloves?: WornPiece;
  boots?: WornPiece;
  /** A weapon's shape is its family: mace, sword, dagger, wand. */
  weapon?: { kind: string };
}

export interface Recipe {
  id: string;
  name: string;
  /**
   * Character level the shop starts stocking this at; omitted means 1. Also
   * what stops the shop short-cutting the crystal ladder.
   */
  level?: number;
  inputs: Record<string, number>; // currency id -> quantity consumed
  output:
    | { type: 'currency'; id: string; qty: number }
    | { type: 'item'; base: string; qty: number };
}

export type Wallet = Record<string, number>;

export interface CraftResult {
  ok: boolean;
  item: Item;
  log: string[];
  error?: string;
}
