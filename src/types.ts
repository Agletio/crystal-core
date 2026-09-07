/**
 * Core types. Gear and crystals are the SAME structure — a crystal's mods
 * affect map generation — so every currency works on both with no special case.
 */

export type StatForm = 'flat' | 'inc' | 'more';
/** A MATERIAL stacks: `Item.meta.n` is how many, so a bag holds one row. */
export type ItemKind = 'gear' | 'crystal' | 'relic' | 'material' | 'soul';

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

/** What a character level buys points in, spent on the sheet. */
export interface AttributeDef {
  id: string;
  name: string;
  per: StatRoll[]; // ONE step, in stat names the modifier engine already reads
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
  /** Switches out of `GRANTS`, merged by `treeGrants` off what is WORN. */
  grants?: Record<string, unknown>;
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
  /** Descents left, on a CRYSTAL alone: a clear spends one, zero drops it. */
  uses?: number;
  chosen?: boolean; // put here at the bench: `SELECT` caps how many
}

export interface Item {
  id: string;
  kind: ItemKind;
  base: string;
  name: string;
  tags: string[]; // what mods match against: ['crystal','level3']
  ilvl: number;
  slots: Record<ModSlot, number>; // capacity, declared by the base
  mods: RolledMod[];
  /** Part of the base. Apart from `mods`, which is all crafting can reach. */
  implicits: RolledMod[];
  /** Armour rating off the base. Increases scale it; crafting cannot reach it. */
  armour?: number;
  damage?: number; // one swing off the base: a PERFECT one beats its row
  meta: Record<string, any>; // one-off state: bonus slots, corruption, …
}

export type CurrencyClass = 'basic' | 'uncommon' | 'rare' | 'exotic';

/** A wall, never a weight: below it the thing does not exist. */
export interface DropGate {
  /** Run power below which this never drops. */
  minPower?: number;
  /** The one world it comes out of. */
  zone?: MapTheme;
  /** WHERE it can come from; absent means both. Nothing is authored behind it
   *  yet: the seam is here so a counter-only piece is a table row. */
  source?: 'floor' | 'gamble';
}

/** A fixed identity: lines nothing can touch and a switch out of `GRANTS`.
 *  A version of a BASE, so slot, art and armour come from there. */
export interface UniqueDef {
  id: string;
  name: string;
  base: string;
  stats: StatSpec[]; // rolled ONCE, when it drops
  grants?: Record<string, unknown>; // every id declared in GRANTS and read by a skill
  flavour: string; // the line under the name
  gate?: DropGate;
}

/** Carried to a PERSON rather than to a bench, and never sold. `wants` is the
 *  room whose occupant takes it. */
export interface RelicDef {
  id: string;
  name: string;
  flavour: string;
  gate: DropGate;
  chance: number; // per kill, in the zone its gate opens on
  wants: string; // a `SceneDef` id
}

export interface CurrencyDef {
  id: string;
  name: string;
  /** Groups the ledger and says how scarce it reads; no run gates a family out. */
  class: CurrencyClass;
  gate?: DropGate; // absent means it drops anywhere
  description: string;
  icon?: string; // its generated picture, where that is not `cur_<id>`
  weight: number; // share of shard drops this one takes
  /** Spent on a CRYSTAL, for one random rule. A shard is a cost the bench
   *  spends and is never applied to anything. */
  crystal?: boolean;
}

export type GearKind =
  | 'weapon'
  | 'shield'
  | 'helmet'
  | 'body'
  | 'gloves'
  | 'boots'
  | 'amulet'
  | 'ring'
  // Two kinds: the ROD has its own slot and never competes with the other three.
  | 'tool'
  | 'rod';

export interface GearBase {
  id: string;
  name: string;
  kind: GearKind;
  art: string; // icon family — a name, not an asset
  /** Which slot types it can roll and the ceiling on each; `tier` says how
   *  many the piece holds in all. */
  slots: Record<string, number>;
  tier: number; // 1-3, holding BASE_TIER_MODS[tier - 1]; nothing raises it
  implicit?: StatSpec[]; // never rolled, never removable
  /** Bare PHYSICAL added to an ATTACK; increases rolled ON it scale this alone. */
  damage?: number;
  attackSpeed?: number; // swings a second, its OWN: a maul is slow, a dagger is not
  hands?: number; // two is a bow, and its off hand stays empty
  family?: string;
  ilvl?: number; // lowest item level that may drop it; absent means from the start
  armour?: number; // before any modifier
}

export interface EquipSlotDef {
  id: string;
  name: string;
  accepts: GearKind[];
  group?: 'tool'; // which block of the sheet; absent is the gear grid
}

/** A socket in the Fissure. `accepts` is an item KIND, so a slot taking
 *  something other than a crystal is one more entry. */
export interface RunSlotDef {
  id: string;
  name: string;
  accepts: ItemKind;
}

/** Stat fields are MULTIPLIERS on MONSTER_BASE, so identity and difficulty
 *  stay independent. `sprite` is a name, not an asset. */
export interface MonsterRankDef {
  id: 'common' | 'magic' | 'rare' | 'risen';
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

/** ONE ZONE OF THE CAMPAIGN, which is run with NOTHING SOCKETED — so the zone
 *  carries the two things a crystal would otherwise decide. */
export interface LadderZoneDef {
  id: string; // the save key under `character.climbed`
  name: string;
  blurb: string;
  rungs: number;
  arena?: string; // its LAST depth: a fight in a room of its own
  art?: string; // the generated cross-section the climb is drawn on
  path?: [number, number][]; // its COURSE through that picture, in percent of it
  sides?: SideRoomDef[]; // the rooms off the line
  links?: LinkDef[]; // the ways round it
  portalArt?: string; // the `GENERATED_ICONS` row a portal mouth draws here
  world: MapTheme; // the rock you walk into for every depth of it
  tier: number; // the best base TIER its depths may drop
}

/** A SIDE ROOM: a node OFF the main line. Its DIFFICULTY is where it sits, so
 *  no depth is written down twice; clearing one records none. */
export interface SideRoomDef {
  id: string; // unique within the zone; a save points at it
  name: string;
  bonus: string; // a `BRANCH_BONUSES` id
  x: number; // percent across the picture
  y: number; // percent down it
}

/** WHAT TOUCHES WHAT: `d<N>` is a depth, anything else a room. The chain is
 *  implicit; a link is a way ROUND it. */
export interface LinkDef {
  from: string;
  to: string;
  path?: [number, number][]; // traced off the picture's floors; absent is straight
  /** A PORTAL and its two mouths: no line joins them, they are one hole, and a
   *  room past one takes its danger from the CHAIN rather than its position. */
  portal?: [[number, number], [number, number]];
}

/** WHAT A BRANCH PAYS: a PAYOUT and never a rule — the rules are the crystals'
 *  and the Reckoning's. `packSize` alone makes the floor harder, so it rides
 *  the MOD seam where danger weighs it; the rest multiply what a clear pays. */
export interface BranchBonusDef {
  id: string;
  name: string;
  say: string; // the line, with its own figure in it
  icon: string; // its `GENERATED_ICONS` row — the PICTURE is what names a branch
  gold?: number; // multiplier on what a clear banks
  currency?: number;
  rarity?: number; // percent, ADDED like every other rarity
  gather?: number;
  xp?: number;
  packSize?: number; // percent INCREASED, through the mod seam
}

/** A monster that makes its neighbours worse. One family adds a fixed amount,
 *  the other multiplies — a room with both multiplies what the other added. */
export interface AuraDef {
  id: string;
  name: string;
  family: MonsterFamily;
  /** Multiples of the map's baseline monster damage. */
  flatDamage?: number;
  /** Percent, applied after every flat aura in range. */
  incDamage?: number;
  /** Armour points. */
  flatArmour?: number;
  incArmour?: number;
  blurb: string;
}

/** What nearby auras are doing to one monster, already summed. */
export interface Boost {
  flatDamage: number;
  incDamage: number;
  flatArmour: number;
  incArmour: number;
}

/** What a monster DOES, and the damage type it deals doing it. Its own, not
 *  the map's — see MONSTER_ABILITIES. */
export interface MonsterAbilityDef {
  id: string;
  name: string;
  damageType: string;
  skill: string | null; // null is a plain swing at the monster's own reach
  weight: number;
}

export interface MonsterDef {
  id: string;
  name: string;
  family: MonsterFamily;
  /** An aura this kind carries, by id. It never buffs itself. */
  aura?: string;
  life: number;
  damage: number;
  moveSpeed: number;
  attacksPerSecond: number;
  attackRange: number;
  radius: number; // in tiles; units push each other apart rather than stacking
  throws?: boolean; // picks its half of `MONSTER_ABILITIES`: throwers only throw
  sprite: string;
  /** How much of a tile the art covers. Nothing derives it from radius. */
  scale: number;
  weight: number;
  tags?: string[];
}

/** Which shelf of the Skills screen a skill lives on. */
export type SkillCategory = 'spell' | 'attack' | 'passive' | 'movement';

export interface SkillDef {
  /** What this is swung with — any name in `WEAPON_COUNTS_AS`. Spells: none. */
  requires?: string;
  /** A share of one type reaching this skill, delivered as another; `to`
   *  follows a tree Conversion. */
  convert?: { from: string; to: string; share: number };
  id: string;
  name: string;
  description: string;
  category?: SkillCategory; // omitted for monster-only skills
  /** Base the Lampwright hands you, over what `requires` would pick. */
  weapon?: string;
  /** 'attack', 'spell', 'melee', … NEVER damage types, or they'd scale the lot. */
  tags: string[];
  behaviour: string; // key into SKILL_BEHAVIOURS
  damageTypes: string[]; // what the SKILL'S OWN damage is dealt as
  /** The skill's own damage at level 1. Grows by LEVELLING.damagePerLevel. */
  baseDamage: number;
  /** What this crits at BARE. Gear rolls INCREASED crit and SCALES this, so
   *  the skill decides how near the cap a build gets. Absent takes HERO_BASE. */
  critChance?: number;
  /**
   * Percent of flat damage from gear and the tree this skill takes on. 100 is
   * a point for a point; the number is per skill because a lasting skill
   * applies its flat once per stack and a hit applies it once.
   */
  addedEffectiveness: number;
  rateMultiplier: number; // on the character's attacks/sec
  manaCost: number; // per USE, so a slower skill's number is a bigger one
  range: number; // in tiles
  vfxKind?: string; // a name, not a shape. Unset draws a generic line
  impact?: string; // a second kind, drawn where each of its hits LANDS
  params?: Record<string, any>; // behaviour-specific knobs
  splash?: { share: number; radius: number }; // SPLASH; every single-target hero skill has one
  grants?: Record<string, unknown>; // switches an EQUIPPED skill hands the sim
}

/** A slot a skill goes in. A table, so a fourth is one entry. */
export interface SkillSlotDef {
  id: string;
  name: string;
  accepts: SkillCategory[]; // which shelves may fill it
  blurb: string; // what an empty one is for
  /** Character level the slot opens at. Absent is level 1, which is most. */
  unlocksAt?: number;
}

export interface Recipe {
  id: string;
  name: string;
  /** Character level the shelf starts stocking this at, omitted means 1 — and
   *  what stops it short-cutting the crystal ladder. */
  level?: number;
  inputs: Record<string, number>; // currency id -> quantity consumed
  /** Gold per point of the shelf's item level, SQUARED — one flat price is
   *  unbuyable at the bottom of the climb and free at the top. */
  goldPerIlvl?: number;
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
