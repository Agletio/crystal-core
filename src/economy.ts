import { Rng } from './rng';
import { ModPool, baseTier, modCapacity, rollRandomMod } from './mods';
import {
  CRYSTAL_ILVL,
  CRYSTAL_LEVELS,
  EQUIP_SLOTS,
  GEAR_BASE_BY_ID,
  GEAR_BASES,
  GEAR_SLOTS,
  GROUP_OF_KIND,
  RECIPES,
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

/**
 * Implicits use fixed ranges, so nothing here is random — they take a mod's
 * shape purely so stat aggregation needs no special case for them.
 */
function implicitsFor(def: GearBase | undefined): RolledMod[] {
  if (!def?.implicit?.length) return [];
  return [
    {
      entryId: `${def.id}_implicit`,
      defId: `${def.id}_implicit`,
      group: 'implicit',
      slot: 'implicit',
      name: 'Base',
      tier: 0,
      tags: ['implicit'],
      stats: def.implicit.map((s) => ({
        stat: s.stat,
        form: s.form,
        value: s.range[0],
        tags: s.tags ?? [],
      })),
    },
  ];
}

/** Drop weight per kind: how many equip slots are FOR it. Two rings, twice as
 *  often. A slot counts ONCE, for the kind it is named after — the off hand also
 *  takes a weapon, and counting it twice doubles every weapon drop by accident. */
const KIND_WEIGHT: Record<string, number> = EQUIP_SLOTS.reduce(
  (acc, slot) => ({ ...acc, [slot.accepts[0]]: (acc[slot.accepts[0]] ?? 0) + 1 }),
  {} as Record<string, number>
);

/**
 * Kind first, base only within it: one uniform pick would make composition a
 * side effect of content volume, and there are 144 armour bases to one ring.
 * Bases above the item level are ineligible.
 */
export function pickGearBase(
  ilvl: number,
  rng: Rng,
  bias: Record<string, number> = {}
): GearBase | undefined {
  const eligible = GEAR_BASES.filter((b) => (b.ilvl ?? 1) <= ilvl);
  const kinds = [...new Set(eligible.map((b) => b.kind))];
  // A crystal hunting weapons weights the KIND pick and nothing else, so it
  // cannot conjure a base the item level does not already allow.
  // dropBias is already a multiplier: 1 is untouched.
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

export function makeGear(base: string, ilvl: number, name?: string): Item {
  const def = GEAR_BASE_BY_ID[base];
  return {
    id: uid('gear'),
    kind: 'gear',
    base,
    name: name ?? def?.name ?? base,
    tags: ['gear', base],
    ilvl,
    // The whole restriction mechanism: a base with no utility slots can never
    // roll move speed, whatever its tier.
    slots: { ...(def?.slots ?? GEAR_SLOTS) },
    mods: [],
    implicits: implicitsFor(def),
    ...(def?.armour ? { armour: def.armour } : {}), // the item outlives its base
    // Which slot type this fits. Kept on the item so equipping doesn't have
    // to reach back into the base table every time it asks.
    meta: { gearKind: def?.kind ?? 'body', art: def?.art ?? 'body' },
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
  rng: Rng
): Item {
  const item = makeGear(base, ilvl);
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

export function runRecipe(wallet: Wallet, recipeId: string): RecipeResult {
  const recipe = RECIPE_BY_ID[recipeId];
  if (!recipe) return { ok: false, error: `no recipe '${recipeId}'` };
  if (!spend(wallet, recipe.inputs)) {
    const need = Object.entries(recipe.inputs)
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
