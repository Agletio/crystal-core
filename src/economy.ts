import { Rng } from './rng';
import { computeStat } from './mods';
import { CRYSTAL_SLOTS, CRYSTAL_TIERS, GEAR_SLOTS, RECIPES } from './data';
import type { Item, ItemKind, Recipe, Wallet } from './types';

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
    meta: { tier },
  };
}

export function makeGear(base: string, ilvl: number, name?: string): Item {
  return {
    id: uid('gear'),
    kind: 'gear',
    base,
    name: name ?? base,
    tags: ['gear', base],
    ilvl,
    slots: { ...GEAR_SLOTS },
    mods: [],
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
// Placeholder until the real sim exists, but the SHAPE is what matters:
// rewards read off the crystal's own mods via the same aggregation the
// character uses. Sustain is deliberately under 100% — see notes.
// ---------------------------------------------------------------------------

export interface RunOutcome {
  fragments: number;
  currency: Record<string, number>;
  monstersKilled: number;
  seconds: number;
}

/** Base fragment yield per tier, tuned so reinvestment decays as you climb. */
function baseFragmentYield(tier: number): number {
  return Math.round(5 * Math.pow(1.85, tier - 1));
}

export function simulateRun(
  crystal: Item,
  rng: Rng,
  opts: { clearPercent?: number; killBoss?: boolean } = {}
): RunOutcome {
  const clear = opts.clearPercent ?? 1;
  const tier = (crystal.meta.tier as number) ?? 1;

  const packCount = computeStat(10, crystal.mods, 'packCount');
  const packSize = computeStat(5, crystal.mods, 'packSize');
  const rarity = computeStat(0, crystal.mods, 'itemRarity');

  const monsters = Math.round(packCount * packSize * clear);

  const yieldMult = computeStat(1, crystal.mods, 'fragmentYield');
  const densityBonus = 1 + (packCount * packSize) / 200;
  let fragments = Math.round(
    baseFragmentYield(tier) * yieldMult * densityBonus * clear * rng.float(0.85, 1.15)
  );
  if (opts.killBoss) fragments = Math.round(fragments * 1.25);

  const currency: Record<string, number> = {};
  const rareChance = 0.04 * (1 + rarity / 100) * (opts.killBoss ? 2.5 : 1);
  if (rng.chance(rareChance)) grant(currency, 'sigil_of_refinement', 1);
  if (rng.chance(rareChance * 0.25)) grant(currency, 'sigil_of_excess', 1);

  const layout = computeStat(1, crystal.mods, 'layoutComplexity');
  const seconds = Math.round(60 * layout * (0.6 + 0.4 * clear) + monsters * 0.25);

  return { fragments, currency, monstersKilled: monsters, seconds };
}

/** Fragments spent to make this crystal, for sustain accounting. */
export function crystalCost(tier: number): number {
  return CRYSTAL_TIERS.find((t) => t.tier === tier)?.fragments ?? Infinity;
}

export function kindOf(item: Item): ItemKind {
  return item.kind;
}
