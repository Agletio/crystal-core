import { Rng } from './rng';
import { ModPool, baseTier, modCapacity, rollRandomMod } from './mods';
import {
  keepGroupFor,
  CRYSTAL_ILVL,
  CRYSTAL_LEVELS,
  EQUIP_SLOTS,
  GEAR_BASE_BY_ID,
  GEAR_BASES,
  GEAR_SLOTS,
  GROUP_OF_KIND,
  PERFECT,
  RECIPES,
  RUN_SLOTS,
  SHOP,
  crystalName,
} from './data';
import type {
  GearBase,
  Item,
  MonsterFamily,
  Recipe,
  RolledMod,
  RelicDef,
  UniqueDef,
  Wallet,
} from './types';
import type { MaterialDef } from './data';
import { MATERIAL_FAMILY_BY_ID } from './data';

let nextId = 1;
const uid = (p: string) => `${p}_${nextId++}`;

const ITEM_ID = /^(crystal|gear)_(\d+)$/; // moves with uid's callers, never apart

/**
 * Ids come off a counter that restarts with the page, so a save from an earlier
 * session holds ids this one would hand out again. Two items under one id is
 * ONE item to every lookup: the bench opens whichever comes first, and both
 * slots light up. Push the counter past what is already spoken for.
 *
 * Walks the whole save rather than a named list of collections — naming them
 * is what let the shop's stored shelf through.
 */
export function reserveItemIds(value: unknown): void {
  if (Array.isArray(value)) {
    for (const entry of value) reserveItemIds(entry);
    return;
  }
  if (!value || typeof value !== 'object') return;

  const id = (value as { id?: unknown }).id;
  if (typeof id === 'string') {
    const n = Number(ITEM_ID.exec(id)?.[2]);
    if (Number.isFinite(n) && n >= nextId) nextId = n + 1;
  }
  for (const nested of Object.values(value)) reserveItemIds(nested);
}

// ---------------------------------------------------------------------------
// Item factory
// ---------------------------------------------------------------------------

export function makeCrystal(level: number, family: MonsterFamily = 'normal'): Item {
  const def = CRYSTAL_LEVELS.find((t) => t.level === level);
  if (!def) throw new Error(`no crystal level ${level}`);
  return {
    id: uid('crystal'),
    kind: 'crystal',
    base: `crystal_t${level}`,
    name: crystalName(level, family),
    // The family is a tag as well as a meta field, so a modifier restricted to
    // one world is a line in the mod table rather than an engine change.
    tags: ['crystal', `level${level}`, family],
    ilvl: CRYSTAL_ILVL,
    // The level IS the capacity, and the only thing that grants any.
    slots: { mod: def.mods },
    mods: [],
    implicits: [],
    // Experience starts at its level's floor: a crystal handed out above 1 has
    // had that climb paid for, and one whose xp disagrees would drop a level.
    meta: { level, family, xp: def.xp },
  };
}

/** Implicits use fixed ranges: they take a mod's shape purely so stat
 *  aggregation needs no special case for them. */
function implicitsFor(def: GearBase | undefined, perfect = false, made = 1): RolledMod[] {
  if (!def?.implicit?.length) return [];
  const lift = (perfect ? 1 + PERFECT.lift : 1) * made; // both, and they stack
  return [
    {
      entryId: `${def.id}_implicit`,
      defId: `${def.id}_implicit`,
      group: 'implicit',
      slot: 'implicit',
      name: perfect ? 'Perfect' : 'Base',
      tier: 0,
      tags: ['implicit'],
      stats: def.implicit.map((s) => ({
        stat: s.stat,
        form: s.form,
        value: lift === 1 ? s.range[0] : Math.ceil(s.range[0] * lift),
        tags: s.tags ?? [],
      })),
    },
  ];
}

/** `meta.perfect` is the flag; what it lifts is written onto the ITEM. */
export const isPerfect = (item: Item): boolean => item.meta.perfect === true;

/** HOW LOUD A DROP IS, one number the floor and its beam both read: ordinary,
 *  well rolled, a Perfect base, a named piece. */
export function lootRank(item: Item): number {
  if (item.kind === 'relic' || item.meta.unique !== undefined) return 3;
  if (isPerfect(item)) return 2;
  return item.mods.length >= 4 ? 1 : 0;
}

/** HANDS ARE A FACT ABOUT THE BASE, never a tag and never a family name. Lives
 *  beside the other base facts so the sim can ask without reaching into game/. */
export const isTwoHanded = (item: Item): boolean =>
  (GEAR_BASE_BY_ID[item.base]?.hands ?? 1) > 1;

/** Whether a base may be one at all: the top tier, and never a unique. */
export const canBePerfect = (base: string): boolean =>
  (GEAR_BASE_BY_ID[base]?.tier ?? 0) >= PERFECT.tier;

/** THE ODDS per gear drop. Zero under `PERFECT.minSockets` — it is what the
 *  last two sockets are for — and danger only ever lifts it. */
export function perfectChance(sockets: number, danger: number): number {
  if (sockets < PERFECT.minSockets) return 0;
  const at = sockets >= RUN_SLOTS.length ? PERFECT.atFull : PERFECT.atThree;
  const steep = Math.min(1, Math.max(0, danger) / PERFECT.dangerFull);
  return at * (1 + steep * PERFECT.dangerLift);
}

/** Equip slots FOR a kind, counted ONCE each: the off hand also takes a
 *  weapon, and counting it twice doubles every weapon drop by accident. */
const SLOTS_FOR: Record<string, number> = EQUIP_SLOTS.reduce(
  (acc, slot) => ({ ...acc, [slot.accepts[0]]: (acc[slot.accepts[0]] ?? 0) + 1 }),
  {} as Record<string, number>
);

/** What a FILTER can name inside a kind, off `KEEP_GROUPS` itself rather than
 *  off `GearBase.family` — which reads the same until a kind grows families the
 *  filter does not name. Jewellery did exactly that: ten implicits took rings
 *  from weight 2 to 20 and 39% of every drop was a ring. */
const FAMILIES_IN = (kind: string): number =>
  new Set(
    GEAR_BASES.filter((b) => b.kind === kind).map((b) => keepGroupFor(b)?.id ?? kind)
  ).size;

/** Drop weight per kind: its slots TIMES what a filter can name in it. Slots
 *  alone made rings the commonest drop at 22% and the whole weapon kind rarer
 *  than boots — a filter cuts a kind by FAMILY, so a kind with none survives
 *  every cut whole and a filtered bag came back all jewellery. */
const KIND_WEIGHT: Record<string, number> = Object.fromEntries(
  Object.entries(SLOTS_FOR).map(([kind, slots]) => [kind, slots * FAMILIES_IN(kind)])
);

/** Kind first, base only within it: a uniform pick would make composition a
 *  side effect of content volume — 144 armour bases to one ring. */
export function pickGearBase(
  ilvl: number,
  rng: Rng,
  bias: Record<string, number> = {},
  /** Best base TIER this may drop: what a SOCKET buys, not what a rung does. */
  maxTier = Infinity
): GearBase | undefined {
  const eligible = GEAR_BASES.filter((b) => (b.ilvl ?? 1) <= ilvl && (b.tier ?? 1) <= maxTier);
  const kinds = [...new Set(eligible.map((b) => b.kind))];
  // A crystal hunting weapons weights the KIND pick and nothing else, so it
  // cannot conjure a base the item level does not allow. 1 is untouched.
  const kind = rng.weighted(kinds, (k) => (KIND_WEIGHT[k] ?? 1) * (bias[GROUP_OF_KIND[k]] ?? 1));
  if (!kind) return undefined;
  return rng.pick(eligible.filter((b) => b.kind === kind));
}

/** Highest base of a kind an item level allows, preferring a named family. */
export function defaultGearBase(
  kind: string,
  ilvl: number,
  family?: string
): GearBase | undefined {
  const fit = GEAR_BASES.filter((b) => b.kind === kind && (b.ilvl ?? 1) <= ilvl);
  const preferred = family ? fit.filter((b) => b.family === family) : [];
  return (preferred.length ? preferred : fit).reduce<GearBase | undefined>(
    (best, b) => (!best || (b.ilvl ?? 1) > (best.ilvl ?? 1) ? b : best),
    undefined
  );
}

/** `made` is a CRAFT's lift on the row, and 1 is exactly the row — which is
 *  what a DROP pays, so the level is what separates made from found. */
export function makeGear(
  base: string,
  ilvl: number,
  name?: string,
  perfect = false,
  made = 1
): Item {
  const def = GEAR_BASE_BY_ID[base];
  // A base that cannot be Perfect simply is not one, so a caller may ask.
  const lifted = perfect && canBePerfect(base);
  const lift = (n: number) => Math.ceil(n * (1 + PERFECT.lift) * made);
  const plain = (n: number) => (made === 1 ? n : Math.ceil(n * made));
  return {
    id: uid('gear'),
    kind: 'gear',
    base,
    name: name ?? `${lifted ? 'Perfect ' : ''}${def?.name ?? base}`,
    tags: ['gear', base, ...(lifted ? ['perfect'] : [])],
    ilvl,
    // The whole restriction mechanism: a base with no utility slots can never
    // roll move speed, whatever its tier.
    slots: { ...(def?.slots ?? GEAR_SLOTS) },
    mods: [],
    implicits: implicitsFor(def, lifted, made),
    // The item outlives its base, and a Perfect one differs from its row.
    ...(def?.armour ? { armour: lifted ? lift(def.armour) : plain(def.armour) } : {}),
    ...(def?.damage ? { damage: lifted ? lift(def.damage) : plain(def.damage) } : {}),
    // Which slot type this fits. Kept on the item so equipping doesn't have
    // to reach back into the base table every time it asks.
    meta: {
      gearKind: def?.kind ?? 'body',
      art: def?.art ?? 'body',
      ...(lifted ? { perfect: true } : {}),
    },
  };
}

/**
 * Rolling happens HERE rather than in the sim, so a drop, a shop entry and a
 * dev-kit grant produce the same shape. The sim never learns what a mod is.
 */
export function rollGear(
  base: string,
  ilvl: number,
  mods: number,
  pool: ModPool,
  rng: Rng,
  perfect = false
): Item {
  const item = makeGear(base, ilvl, undefined, perfect);
  // modCapacity is the truth, not the caller: a tier 1 base asked for four
  // mods gets two, and a base with no utility slots gets whatever fits.
  const want = Math.min(mods, modCapacity(item));
  let guard = 24;
  while (item.mods.length < want && guard-- > 0) {
    const mod = rollRandomMod(item, pool, rng);
    if (!mod) break;
    item.mods.push(mod);
  }
  return item;
}

/**
 * A named piece, rolled once and then fixed. Its lines live in `implicits`,
 * which nothing at the bench can reach, and it declares NO modifier slots — so
 * `modCapacity` is zero and every currency refuses it, including the one that
 * adds a slot past the cap.
 */
export function makeUnique(def: UniqueDef, ilvl: number, rng: Rng): Item {
  const item = makeGear(def.base, ilvl, def.name);
  item.tags = [...item.tags, 'unique', def.id];
  item.slots = {};
  item.implicits = [
    ...item.implicits,
    {
      entryId: `${def.id}_unique`,
      defId: `${def.id}_unique`,
      group: 'unique',
      slot: 'implicit',
      name: def.name,
      tier: 0,
      tags: ['unique'],
      stats: def.stats.map((line) => ({
        stat: line.stat,
        form: line.form,
        value: rng.int(line.range[0], line.range[1]),
        tags: line.tags ?? [],
      })),
    },
  ];
  item.meta.unique = def.id;
  return item;
}

/**
 * A relic. No slots, no lines and no tier: it is not a thing you improve, it is
 * a thing you hand over. `canSell` refuses one and the bench's registries never
 * see it, which is what keeps it out of every other pipeline.
 */
export function makeRelic(def: RelicDef): Item {
  return {
    id: uid('relic'),
    kind: 'relic',
    base: def.id,
    name: def.name,
    tags: ['relic', def.id],
    ilvl: 1,
    slots: {},
    mods: [],
    implicits: [],
    meta: {},
  };
}

/** A STACK of one material: `meta.n` is how many, so a bag holds one row.
 *  `done` is the PROCESSED form — the same row worked at a station, named for
 *  what one of it is, so a family is two stacks and never two tables. */
export function makeMaterial(def: MaterialDef, n = 1, done = false): Item {
  const one = def.family ? MATERIAL_FAMILY_BY_ID[def.family]?.one : undefined;
  return {
    id: uid('material'),
    kind: 'material',
    base: def.id,
    name: done && one ? `${def.name} ${one}` : def.name,
    tags: [
      'material',
      def.id,
      def.world,
      ...(def.family ? [def.family] : ['unique']),
      done ? 'processed' : 'raw',
    ],
    ilvl: 1,
    slots: {},
    mods: [],
    implicits: [],
    meta: done ? { n, done: true } : { n },
  };
}

/** THE STACK a material belongs in. Raw and processed are the same row worked
 *  or not, so the id alone cannot tell two stacks apart. */
export const stackKey = (item: Item): string => `${item.base}${item.meta.done ? ':done' : ''}`;

export function makeItem(base: string, ilvl = 1): Item {
  const m = /^crystal_t(\d+)$/.exec(base);
  return m ? makeCrystal(Number(m[1])) : makeGear(base, ilvl);
}

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

export function balance(w: Wallet, id: string): number {
  return w[id] ?? 0;
}

/**
 * Priced off item level and tier, never off what rolled. Charging for a good
 * roll would turn a shelf you can SEE into the gamble maps already are.
 */
export function priceOfItem(item: Item): number {
  const byTier = SHOP.priceByTier[baseTier(item) - 1] ?? 1;
  return Math.max(4, Math.round(item.ilvl * SHOP.pricePerIlvl * byTier));
}

/** Gear only. A crystal is a standing choice, not stock. */
export const canSell = (item: Item): boolean => item.kind === 'gear';

/**
 * What a sale pays. The same base as a purchase, plus what is ON the piece —
 * a shelf price ignores the roll, but the roll is the whole of what you are
 * deciding to part with.
 */
export function sellPrice(item: Item): number {
  if (!canSell(item)) return 0;
  const byTier = SHOP.sellByTier[baseTier(item) - 1] ?? 1;
  const worth =
    item.ilvl * SHOP.pricePerIlvl * byTier * (1 + item.mods.length * SHOP.pricePerMod);
  return Math.max(1, Math.round(worth * SHOP.sellFraction));
}

export function canAfford(w: Wallet, inputs: Record<string, number>): boolean {
  return Object.entries(inputs).every(([id, n]) => balance(w, id) >= n);
}

export function spend(w: Wallet, inputs: Record<string, number>): boolean {
  if (!canAfford(w, inputs)) return false;
  for (const [id, n] of Object.entries(inputs)) w[id] = balance(w, id) - n;
  return true;
}

export function grant(w: Wallet, id: string, n: number): void {
  w[id] = balance(w, id) + n;
}

export const RECIPE_BY_ID: Record<string, Recipe> = Object.fromEntries(
  RECIPES.map((r) => [r.id, r])
);

export interface RecipeResult {
  ok: boolean;
  item?: Item;
  error?: string;
}

/** WHAT THE SHELF CHARGES THIS CHARACTER. One price for a whole climb is what
 *  made adding a modifier free; the shelf's item level is what it rides. */
export function recipeInputs(recipe: Recipe, level: number): Record<string, number> {
  if (!recipe.goldPerIlvl) return recipe.inputs;
  const ilvl = Math.max(1, level) * SHOP.ilvlPerLevel;
  const gold = (recipe.inputs.gold ?? 0) + Math.round(recipe.goldPerIlvl * ilvl * ilvl);
  return { ...recipe.inputs, gold };
}

export function runRecipe(wallet: Wallet, recipeId: string, level = 1): RecipeResult {
  const recipe = RECIPE_BY_ID[recipeId];
  if (!recipe) return { ok: false, error: `no recipe '${recipeId}'` };
  const inputs = recipeInputs(recipe, level);
  if (!spend(wallet, inputs)) {
    const need = Object.entries(inputs)
      .map(([id, n]) => `${n} ${id}`)
      .join(', ');
    return { ok: false, error: `need ${need}` };
  }

  if (recipe.output.type === 'currency') {
    grant(wallet, recipe.output.id, recipe.output.qty);
    return { ok: true };
  }
  return { ok: true, item: makeItem(recipe.output.base) };
}

/** A crystal with its level's slots filled at random. */
export function rollCrystal(
  level: number,
  pool: ModPool,
  rng: Rng,
  family: MonsterFamily = 'normal'
): Item {
  const item = makeCrystal(level, family);
  let guard = 12;
  while (item.mods.length < modCapacity(item) && guard-- > 0) {
    const mod = rollRandomMod(item, pool, rng);
    if (!mod) break;
    item.mods.push(mod);
  }
  return item;
}
