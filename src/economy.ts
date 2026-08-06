import { Rng } from './rng';
import { computeStat } from './mods';
import {
  CRYSTAL_SLOTS,
  CRYSTAL_TIERS,
  GEAR_BASE_BY_ID,
  GEAR_SLOTS,
  RECIPES,
} from './data';
import type { GearBase, Item, ItemKind, Recipe, RolledMod, Wallet } from './types';

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
    meta: { tier },
  };
}

/**
 * Turns a base's authored implicit into a rolled mod.
 *
 * Implicits use fixed ranges, so there's nothing random about them — they're
 * built through the same shape as a mod purely so stat aggregation treats
 * them identically and needs no special case.
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

export function makeGear(base: string, ilvl: number, name?: string): Item {
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
    // Which slot type this fits. Kept on the item so equipping doesn't have
    // to reach back into the base table every time it asks.
    meta: { gearKind: def?.kind ?? 'body', art: def?.art ?? 'body' },
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
