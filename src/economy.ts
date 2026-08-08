import { Rng } from './rng';
import { ModPool, computeStat, modCapacity, rollRandomMod } from './mods';
import {
  CRYSTAL_SLOTS,
  CRYSTAL_TIERS,
  EQUIP_SLOTS,
  GEAR_BASE_BY_ID,
  GEAR_BASES,
  GEAR_SLOTS,
  RECIPES,
} from './data';
import type {
  GearBase,
  Item,
  ItemKind,
  Quality,
  Recipe,
  RolledMod,
  Wallet,
} from './types';

let nextId = 1;
const uid = (p: string) => `${p}_${nextId++}`;

// ---------------------------------------------------------------------------
// Item factory
// ---------------------------------------------------------------------------

export function makeCrystal(tier: number): Item {
  const def = CRYSTAL_TIERS.find((t) => t.tier === tier);
  if (!def) throw new Error(`no crystal tier ${tier}`);
  return {
    id: uid('crystal'),
    kind: 'crystal',
    base: `crystal_t${tier}`,
    name: `Tier ${tier} Crystal`,
    tags: ['crystal', `tier${tier}`],
    ilvl: def.ilvl,
    slots: { ...CRYSTAL_SLOTS },
    mods: [],
    implicits: [],
    // A bought crystal is a blank stone. Everything it becomes, you do to it.
    meta: { tier, quality: 'rough' as Quality },
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

/** Drop weight per kind: how many equip slots accept it. Two rings, twice as often. */
const KIND_WEIGHT: Record<string, number> = EQUIP_SLOTS.reduce(
  (acc, slot) => ({ ...acc, [slot.accepts]: (acc[slot.accepts] ?? 0) + 1 }),
  {} as Record<string, number>
);

/**
 * Kind first, base only within it: one uniform pick would make composition a
 * side effect of content volume, and there are 144 armour bases to one ring.
 * Bases above the item level are ineligible, which is what makes a family's
 * rungs progression rather than three names for one drop.
 */
export function pickGearBase(ilvl: number, rng: Rng): GearBase | undefined {
  const eligible = GEAR_BASES.filter((b) => (b.ilvl ?? 1) <= ilvl);
  const kinds = [...new Set(eligible.map((b) => b.kind))];
  const kind = rng.weighted(kinds, (k) => KIND_WEIGHT[k] ?? 1);
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

export function makeGear(
  base: string,
  ilvl: number,
  name?: string,
  quality: Quality = 'rough'
): Item {
  const def = GEAR_BASE_BY_ID[base];
  return {
    id: uid('gear'),
    kind: 'gear',
    base,
    name: name ?? def?.name ?? base,
    tags: ['gear', base],
    ilvl,
    // Per-base capacities are the whole restriction mechanism: a base with no
    // utility slots can never roll move speed.
    slots: { ...(def?.slots ?? GEAR_SLOTS) },
    mods: [],
    implicits: implicitsFor(def),
    ...(def?.armour ? { armour: def.armour } : {}), // the item outlives its base
    // Which slot type this fits. Kept on the item so equipping doesn't have
    // to reach back into the base table every time it asks.
    meta: { gearKind: def?.kind ?? 'body', art: def?.art ?? 'body', quality },
  };
}

/**
 * A dropped or stocked piece: a base, a quality, and mods already rolled.
 *
 * Rolling happens HERE rather than in the sim so that a drop, a shop entry and
 * a dev-kit grant all produce the same shape of item. The sim only decides
 * which base and how good; it never learns what a modifier is.
 */
export function rollGear(
  base: string,
  ilvl: number,
  quality: Quality,
  mods: number,
  pool: ModPool,
  rng: Rng
): Item {
  const item = makeGear(base, ilvl, undefined, quality);
  // modCapacity is the truth, not the caller: a Seamed item asked for four
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

/** Picks a quality out of a weighted table. */
export function pickQuality(table: Array<[Quality, number]>, rng: Rng): Quality {
  const total = table.reduce((n, [, w]) => n + w, 0);
  let roll = rng.next() * total;
  for (const [quality, weight] of table) {
    roll -= weight;
    if (roll <= 0) return quality;
  }
  return table[table.length - 1]?.[0] ?? 'rough';
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

// ---------------------------------------------------------------------------
// Crystal rewards
//
// There used to be a simulateRun() stub here that modelled a run analytically.
// It's gone: the real sim reports its own loot (see RunState.loot), so there
// is one answer to "what is a run worth" instead of two that could disagree.
//
// It was also the only source of the rare sigils and Shard of Ruin. Until the
// sim drops currency, those are unobtainable outside the dev kit — see
// DEV_CURRENCY.
// ---------------------------------------------------------------------------

/** Fragments spent to make this crystal, for sustain accounting. */
export function crystalCost(tier: number): number {
  return CRYSTAL_TIERS.find((t) => t.tier === tier)?.fragments ?? Infinity;
}

export function kindOf(item: Item): ItemKind {
  return item.kind;
}
