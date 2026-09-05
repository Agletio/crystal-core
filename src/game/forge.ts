/**
 * MAKING A BASE. **Materials decide what an item IS; currency decides what is
 * ON it** — this picks the base and its implicit, and every modifier is still
 * the bench's. Two economies, two decisions, and neither is a slot machine.
 *
 * A recipe is DERIVED rather than authored: `ARMOUR_FAMILIES.archetypes` is
 * already melee / spell / rogue, so a hybrid family names exactly the two
 * professions its archetypes do, and a weapon family names its own. A new base
 * is craftable the moment it exists, with nothing to write down.
 */
import {
  TOOL_SLOTS,
  toolBaseId,
  ARCHETYPE_PROFESSION,
  ARMOUR_FAMILIES,
  CRAFT,
  GEAR_BASE_BY_ID,
  MATERIALS,
  MATERIAL_BY_ID,
  MATERIAL_FAMILY_BY_ID,
  PROFESSION,
  PROFESSION_BY_ID,
  WEAPON_PROFESSIONS,
} from '../data';
import type { MaterialDef, ToolDef, ToolRungDef } from '../data';
import { canBePerfect, makeGear, makeMaterial, stackKey } from '../economy';
import { addItem } from './state';
import { payXp, professionAt } from './work';
import { toolIn, toolRung } from '../sim/character';
import type { GameState } from './state';
import type { GearBase, Item } from '../types';
import type { Rng } from '../rng';

/** One profession's half of a recipe: the level it asks for and the stacks it
 *  eats. A hybrid holds two of these and a specialist one. */
export interface CraftPart {
  profession: string;
  level: number;
  /** PROCESSED material ids, and how many of each. Which WORLD versions is the
   *  bag's business — a recipe asks for `versions` DIFFERENT ones, not for
   *  named ones, since no version is better than another. */
  wants: number;
  versions: number;
}

/** `CraftRecipe` and not `Recipe`: the SHELF owns that word for what a currency
 *  purchase costs, and one word per mechanism means neither may take it. */
export interface CraftRecipe {
  base: string;
  tier: number;
  parts: CraftPart[];
  /** A world's UNIQUE, from `CRAFT.uniqueFrom` up. Raw, and any world's. */
  unique: number;
  gems: number; // CUT STONES every recipe wants; any world's, so it is universal
  xp: number;
}

/** Which professions make this base, or none — a unique, a relic, a crystal. */
export function makersOf(base: GearBase): string[] {
  // JEWELLERY IS ONE PROFESSION'S WHOLE OUTPUT: every ring and amulet there is.
  if (base.kind === 'ring' || base.kind === 'amulet') return ['jewelling'];
  if (base.kind === 'weapon' || base.kind === 'shield') {
    return WEAPON_PROFESSIONS[base.family ?? ''] ?? [];
  }
  const family = ARMOUR_FAMILIES.find((f) => f.id === base.family);
  if (!family) return [];
  return family.archetypes.map((a) => ARCHETYPE_PROFESSION[a]).filter(Boolean);
}

/** The recipe for one base, or null where nothing makes it. */
export function recipeFor(baseId: string): CraftRecipe | null {
  const base = GEAR_BASE_BY_ID[baseId];
  if (!base) return null;
  const makers = makersOf(base);
  if (makers.length === 0) return null;
  const tier = Math.max(1, Math.min(CRAFT.needs.length, base.tier ?? 1));
  return {
    base: baseId,
    tier,
    parts: makers.map((profession) => ({
      profession,
      level: CRAFT.needs[tier - 1],
      wants: CRAFT.each[tier - 1],
      versions: CRAFT.versions[tier - 1],
    })),
    unique: tier >= CRAFT.uniqueFrom ? 1 : 0,
    gems: CRAFT.gems[tier - 1],
    xp: CRAFT.xp[tier - 1],
  };
}

/** What one stack holds, by `stackKey`. */
const heldBy = (game: GameState): Map<string, Item> =>
  new Map((game.materials ?? []).map((i) => [stackKey(i), i]));

const countOf = (item: Item | undefined): number => (item?.meta.n as number) ?? 0;

/** WHICH VERSIONS a part would actually eat: the ones you hold most of, so a
 *  craft never asks you to pick between things that are not different. */
export function versionsFor(game: GameState, part: CraftPart): MaterialDef[] {
  const family = PROFESSION_BY_ID[part.profession]?.family;
  if (!family) return [];
  const held = heldBy(game);
  return MATERIALS.filter((m) => m.family === family)
    .map((m) => ({ def: m, n: countOf(held.get(`${m.id}:done`)) }))
    .filter((row) => row.n >= part.wants)
    .sort((a, b) => b.n - a.n || a.def.id.localeCompare(b.def.id))
    .slice(0, part.versions)
    .map((row) => row.def);
}

/** The zone-unique a craft would eat: whichever you hold most of. */
export function uniqueFor(game: GameState): MaterialDef | null {
  const held = heldBy(game);
  return (
    MATERIALS.filter((m) => m.family === null)
      .map((m) => ({ def: m, n: countOf(held.get(m.id)) }))
      .filter((row) => row.n > 0)
      .sort((a, b) => b.n - a.n || a.def.id.localeCompare(b.def.id))[0]?.def ?? null
  );
}

/**
 * FILL A COUNT off a family's PROCESSED stacks, biggest first, spilling into a
 * second world only when the first runs short. This is what a UNIVERSAL input
 * is, against a part's demand for `versions` DIFFERENT worlds; the cut stones
 * every recipe wants and a tool upgrade's material are both one. `already` is
 * what the same transaction claimed elsewhere, which matters for the one
 * profession whose family IS gem — a ring must not eat the stones it needs.
 */
export function fillFrom(
  game: GameState,
  family: string,
  want: number,
  already: Spent[] = []
): Spent[] {
  if (want <= 0) return [];
  const held = heldBy(game);
  const claimed = new Map<string, number>();
  for (const row of already) claimed.set(row.material, (claimed.get(row.material) ?? 0) + row.n);
  const out: Spent[] = [];
  let left = want;
  const stacks = MATERIALS.filter((m) => m.family === family)
    .map((m) => ({ def: m, n: countOf(held.get(`${m.id}:done`)) - (claimed.get(m.id) ?? 0) }))
    .filter((row) => row.n > 0)
    .sort((a, b) => b.n - a.n || a.def.id.localeCompare(b.def.id));
  for (const row of stacks) {
    if (left <= 0) break;
    const take = Math.min(left, row.n);
    out.push({ material: row.def.id, n: take });
    left -= take;
  }
  return left > 0 ? [] : out;
}

/** The cut stones a craft would take. Any world's: that is what universal is. */
export const gemsFor = (game: GameState, want: number, already: Spent[] = []): Spent[] =>
  fillFrom(game, 'gem', want, already);

/** EVERY TAKE ONE CRAFT WOULD MAKE, or null. The check and the craft read this
 *  one answer, so what is refused and what is eaten cannot come apart. */
export function craftPlan(game: GameState, recipe: CraftRecipe): Spent[] | null {
  const spent: Spent[] = [];
  for (const part of recipe.parts) {
    const have = versionsFor(game, part);
    if (have.length < part.versions) return null;
    for (const def of have) spent.push({ material: def.id, n: part.wants });
  }
  const stones = gemsFor(game, recipe.gems, spent);
  if (recipe.gems > 0 && stones.length === 0) return null;
  spent.push(...stones);
  if (recipe.unique > 0) {
    const rare = uniqueFor(game);
    if (!rare) return null;
    spent.push({ material: rare.id, n: recipe.unique });
  }
  return spent;
}

// --- upgrading a tool, which is the anvil's other verb --------------------

/** The rung a tool would go UP to, or null when it is already at its best. */
export function nextRung(game: GameState, tool: ToolDef): ToolRungDef | null {
  return tool.rungs[toolRung(game.character, tool.id) + 1] ?? null;
}

/** The material half of a tool upgrade: the same fill a cut stone is. */
export const upgradeCost = (game: GameState, tool: ToolDef, rung: ToolRungDef): Spent[] =>
  fillFrom(game, tool.eats, rung.eats);

/** Why a tool cannot be upgraded, or null — in NUMBERS, like every refusal. */
export function whyNotUpgrade(game: GameState, tool: ToolDef): string | null {
  const rung = nextRung(game, tool);
  if (!rung) return 'Nothing better to make of it.';
  const at = professionAt(game, tool.skill).level;
  const who = PROFESSION_BY_ID[tool.skill]?.name ?? tool.skill;
  if (at < rung.at) return `${who} ${rung.at} needed, you are ${at}.`;
  const gold = game.wallet.gold ?? 0;
  if (gold < rung.gold) return `${rung.gold} gold needed, you have ${Math.floor(gold)}.`;
  if (rung.eats > 0 && upgradeCost(game, tool, rung).length === 0) {
    const family = MATERIAL_FAMILY_BY_ID[tool.eats];
    return `${rung.eats} ${family?.one.toLowerCase() ?? 'unit'}s needed. Work some at ${family?.station ?? 'a station'}.`;
  }
  return null;
}

/** MAKE IT BETTER. The gold and the material go now; the rung is what you get,
 *  and it is the only thing an upgrade ever changes. */
export function upgradeTool(game: GameState, tool: ToolDef): ToolRungDef | null {
  if (whyNotUpgrade(game, tool)) return null;
  const rung = nextRung(game, tool)!;
  for (const row of upgradeCost(game, tool, rung)) take(game, `${row.material}:done`, row.n);
  game.wallet.gold = (game.wallet.gold ?? 0) - rung.gold;
  // The piece you WEAR becomes the better one: a rung is another base, so the
  // reforge is a swap in the slot rather than a number kept beside it.
  const slot = TOOL_SLOTS.find((s) => toolIn(game.character, s.id)?.id === tool.id);
  if (slot) {
    game.character.equipment[slot.id] =
      makeGear(toolBaseId(tool, toolRung(game.character, tool.id) + 1), 1);
  }
  return rung;
}

/** Why this cannot be made, or null. Said in NUMBERS — the level you are and
 *  the level it wants, the versions you hold and the versions it asks for. */
export function whyNotCraft(game: GameState, recipe: CraftRecipe): string | null {
  for (const part of recipe.parts) {
    const at = professionAt(game, part.profession).level;
    const who = PROFESSION_BY_ID[part.profession]?.name ?? part.profession;
    if (at < part.level) return `${who} ${part.level} needed, you are ${at}.`;
    const have = versionsFor(game, part);
    if (have.length < part.versions) {
      const family = MATERIAL_FAMILY_BY_ID[PROFESSION_BY_ID[part.profession]?.family ?? ''];
      const one = family?.one ?? 'unit';
      return part.versions === 1
        ? `${part.wants} ${one}s needed. Work some at ${family?.station ?? 'the station'}.`
        : `${part.versions} worlds of ${one}s needed, you have ${have.length}.`;
    }
  }
  if (craftPlan(game, recipe) === null && recipe.gems > 0) {
    return `${recipe.gems} cut stones needed. Every recipe wants them; cut some at the jeweller's.`;
  }
  if (recipe.unique > 0 && !uniqueFor(game)) return 'A world\'s own material is missing.';
  return null;
}

/**
 * WHERE INSIDE THE BASE'S OWN RANGE THE LEVEL LANDS YOU, as a share of the
 * whole span. *"At 1 blacksmithing it's always 100–105 and at 99 it's always
 * 145–150."* The window NARROWS as it climbs, and the roll inside it is the
 * only luck in a craft — the rest is what you spent.
 */
export function qualityRoll(level: number, rng: Rng): number {
  const share = Math.max(
    0,
    Math.min(1, (level - 1) / Math.max(1, PROFESSION.maxLevel - 1))
  );
  const width = CRAFT.widthAt1 + (CRAFT.widthAtTop - CRAFT.widthAt1) * share;
  const start = share * (1 - width);
  return start + rng.next() * width;
}

/** A craft's lift on the base's own numbers: 1 is exactly the row, which is
 *  what a DROP pays, so the level alone is what separates the two. */
export const liftFor = (quality: number): number => 1 + CRAFT.span * (2 * quality - 1);

/** The LOWEST level in the recipe, which is what the window reads: a hybrid is
 *  no better than the profession you neglected. */
export const craftLevel = (game: GameState, recipe: CraftRecipe): number =>
  Math.min(...recipe.parts.map((p) => professionAt(game, p.profession).level));

/** A PERFECT out of a craft, off that same level. */
export const perfectChanceAt = (level: number): number => {
  const share = Math.max(0, Math.min(1, (level - 1) / Math.max(1, PROFESSION.maxLevel - 1)));
  return CRAFT.perfectAt1 + (CRAFT.perfectAtTop - CRAFT.perfectAt1) * share;
};

/** What one craft actually spent, so a dismantle can hand a share of it back. */
export interface Spent {
  material: string;
  n: number;
}

export interface Crafted {
  item: Item;
  spent: Spent[];
  levels: Record<string, number>;
  quality: number;
  perfect: boolean;
}

function take(game: GameState, key: string, n: number): void {
  const held = (game.materials ?? []).find((i) => stackKey(i) === key);
  if (!held) return;
  held.meta.n = countOf(held) - n;
  game.materials = (game.materials ?? []).filter((i) => countOf(i) > 0);
}

/** MAKE IT. Nothing is refunded and nothing is refused halfway: the check runs
 *  first, and after it every take is paid for. */
export function craftBase(game: GameState, recipe: CraftRecipe, rng: Rng): Crafted | null {
  if (whyNotCraft(game, recipe)) return null;
  const base = GEAR_BASE_BY_ID[recipe.base];
  if (!base) return null;

  // ONE PLAN, and the check above read the same one, so nothing is taken that
  // was not counted. A world's UNIQUE is the one raw input; the rest is worked.
  const spent = craftPlan(game, recipe);
  if (!spent) return null;
  const rare = recipe.unique > 0 ? uniqueFor(game)?.id : undefined;
  for (const row of spent) take(game, row.material === rare ? row.material : `${row.material}:done`, row.n);

  const level = craftLevel(game, recipe);
  const quality = qualityRoll(level, rng);
  const perfect = canBePerfect(recipe.base) && rng.chance(perfectChanceAt(level));
  const item = makeGear(recipe.base, base.ilvl ?? 1, undefined, perfect, liftFor(quality));
  item.meta.crafted = Math.round(quality * 100);
  // THE RECEIPT: a dismantle reads it, so what comes back is a share of what
  // actually went in rather than a guess off the recipe.
  item.meta.spent = spent;
  addItem(game, item);

  const levels: Record<string, number> = {};
  for (const part of recipe.parts) levels[part.profession] = payXp(game, part.profession, recipe.xp);
  return { item, spent, levels, quality, perfect };
}

/**
 * WHAT A DISMANTLE HANDS BACK, and it is never more than the recipe took —
 * `CRAFT.back` is a share under 1, or craft → dismantle → craft prints
 * materials. Rounded DOWN, so a recipe that takes one of something hands back
 * nothing of it.
 *
 * A MADE piece carries its own receipt in `meta.spent` and is refunded off
 * that. A FOUND one has none, so its share is SPREAD over the family's
 * versions from an offset off its own id: always refunding the first version
 * would slowly starve a bag of the three a tier-3 recipe still wants.
 */
export function dismantleYield(game: GameState, item: Item): Spent[] {
  if (item.kind !== 'gear') return [];
  const receipt = item.meta.spent as Spent[] | undefined;
  if (Array.isArray(receipt)) {
    return receipt
      .map((row) => ({ material: row.material, n: Math.floor(row.n * CRAFT.back) }))
      .filter((row) => row.n > 0);
  }
  const recipe = recipeFor(item.base);
  if (!recipe) return [];
  const out: Spent[] = [];
  let at = [...item.id].reduce((n, c) => n + c.charCodeAt(0), 0);
  for (const part of recipe.parts) {
    const family = PROFESSION_BY_ID[part.profession]?.family;
    const versions = MATERIALS.filter((m) => m.family === family);
    let back = Math.floor(part.wants * part.versions * CRAFT.back);
    if (back <= 0 || versions.length === 0) continue;
    const each = Math.floor(back / versions.length);
    for (const def of versions) {
      const n = Math.min(back, each + (back > each * versions.length ? 1 : 0));
      if (n > 0) out.push({ material: versions[at++ % versions.length].id, n });
      back -= n;
      if (back <= 0) break;
    }
  }
  return out;
}

/** Take the piece apart. Returns what it paid, or null if it refuses. */
export function dismantle(game: GameState, item: Item): Spent[] | null {
  const paid = dismantleYield(game, item);
  if (paid.length === 0) return null;
  const at = game.inventory.indexOf(item);
  if (at < 0) return null;
  game.inventory.splice(at, 1);
  for (const row of paid) {
    const def = MATERIAL_BY_ID[row.material];
    if (def) addItem(game, makeMaterial(def, row.n, true));
  }
  return paid;
}
