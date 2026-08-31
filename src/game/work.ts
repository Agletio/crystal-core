/**
 * PROCESSING: raw out of a descent turned into what a recipe can use, at a
 * station in the camp, over DESCENTS rather than over a clock.
 *
 * *"A smelter job is N clears long: load it, go down, come back to bars."* The
 * idling is the descending, which already chains, so nothing here can be farmed
 * by an open browser — the one thing universal automation forbids of anything
 * that pays while you are away.
 */
import {
  MATERIAL_BY_ID,
  MATERIAL_FAMILY_BY_ID,
  MEAL,
  MEAL_BY_FISH,
  PROFESSION,
  PROFESSIONS,
  WORK,
} from '../data';
import type { MaterialDef, ProfessionDef } from '../data';
import { makeMaterial } from '../economy';
import { addItem } from './state';
import type { GameState } from './state';
import type { Item, RolledMod } from '../types';
import type { Rng } from '../rng';
import { liftFor, qualityRoll } from './forge';

/** One batch loaded at a station. `left` is DESCENTS, counted down by a CLEAR
 *  and by nothing else — a walk out banks no progress anywhere in the game. */
export interface WorkJob {
  id: string;
  profession: string;
  material: string;
  n: number;
  left: number;
}

let nextJob = 1;

export const jobsIn = (game: GameState): WorkJob[] => game.jobs ?? [];

/** RAW ONLY, and a world's UNIQUE is never any of it: it belongs to no family,
 *  so no station works it and the best recipes ask for it as it came up. */
export function rawHeld(game: GameState, family: string): Item[] {
  return (game.materials ?? []).filter((item) => {
    if (item.meta.done) return false;
    if (((item.meta.n as number) ?? 0) < 1) return false;
    return MATERIAL_BY_ID[item.base]?.family === family;
  });
}

/** What one profession has done, healed on read: an absent row is level 1. */
export function professionAt(game: GameState, id: string): { level: number; xp: number } {
  const held = game.character.professions?.[id];
  return { level: held?.level ?? 1, xp: held?.xp ?? 0 };
}

/** XP from one level to the NEXT. Steepening, so 99 is the whole of a long game
 *  and the first few are felt inside an hour. */
export const xpToNext = (level: number): number =>
  Math.round(PROFESSION.xpTo1 * Math.pow(PROFESSION.curve, level - 1));

/** Banked, and levelled as far as it goes. Returns levels gained, which is what
 *  the report says out loud. */
export function payXp(game: GameState, id: string, xp: number): number {
  const at = professionAt(game, id);
  let { level } = at;
  let banked = at.xp + xp;
  let gained = 0;
  while (level < PROFESSION.maxLevel && banked >= xpToNext(level)) {
    banked -= xpToNext(level);
    level++;
    gained++;
  }
  if (level >= PROFESSION.maxLevel) banked = 0;
  game.character.professions = { ...(game.character.professions ?? {}), [id]: { level, xp: banked } };
  return gained;
}

/** Why this batch cannot be loaded, or null. Said rather than greyed: a button
 *  that does nothing and will not say why is the same as one that is missing. */
export function whyNotWork(game: GameState, def: MaterialDef): string | null {
  if (!def.family) return 'Nothing works this. It is used as it came up.';
  if (jobsIn(game).length >= WORK.slots) {
    return `Every station is loaded — ${WORK.slots} jobs at once.`;
  }
  const held = (game.materials ?? []).find((i) => i.base === def.id && !i.meta.done);
  const n = (held?.meta.n as number) ?? 0;
  if (n < WORK.batch) return `${WORK.batch} needed, ${n} held.`;
  return null;
}

/** Load one batch. The raw leaves the bag NOW — a job you can cancel for a
 *  refund is a slot that costs nothing to fill. */
export function loadWork(game: GameState, def: MaterialDef): WorkJob | null {
  if (whyNotWork(game, def)) return null;
  const profession = PROFESSIONS.find((p) => p.family === def.family);
  if (!profession) return null;
  const held = (game.materials ?? []).find((i) => i.base === def.id && !i.meta.done);
  if (!held) return null;

  held.meta.n = ((held.meta.n as number) ?? 0) - WORK.batch;
  game.materials = (game.materials ?? []).filter((i) => ((i.meta.n as number) ?? 0) > 0);
  const job: WorkJob = {
    id: `job_${nextJob++}`,
    profession: profession.id,
    material: def.id,
    n: WORK.batch,
    left: WORK.clears,
  };
  game.jobs = [...jobsIn(game), job];
  return job;
}

/** What a finished job handed over. */
export interface Finished {
  job: WorkJob;
  item: Item;
  levels: number;
}

/**
 * ONE DESCENT'S WORTH, on a CLEAR and never on a death. Every job loaded moves
 * together: they are all standing in the same camp while you are down there.
 */
export function advanceWork(game: GameState): Finished[] {
  const out: Finished[] = [];
  const kept: WorkJob[] = [];
  for (const job of jobsIn(game)) {
    const left = job.left - 1;
    if (left > 0) {
      kept.push({ ...job, left });
      continue;
    }
    const def = MATERIAL_BY_ID[job.material];
    if (!def) continue; // a material that has been cut takes its job with it
    const item = makeMaterial(def, job.n, true);
    addItem(game, item);
    out.push({ job, item, levels: payXp(game, job.profession, WORK.xp * job.n) });
  }
  game.jobs = kept;
  return out;
}

/** What a job is called on screen, in the station's own words. */
export function saysJob(job: WorkJob): string {
  const def = MATERIAL_BY_ID[job.material];
  const family = def?.family ? MATERIAL_FAMILY_BY_ID[def.family] : undefined;
  const one = family?.one ?? 'unit';
  return `${job.n} ${def?.name ?? job.material} → ${job.n} ${one}${job.n === 1 ? '' : 's'}`;
}

export const professionFor = (family: string): ProfessionDef | undefined =>
  PROFESSIONS.find((p) => p.family === family);

// --- cooking, and the buff that burns down ---------------------------------
//
// A MEAL IS A BUFF THAT LASTS RUNS, which is the crystal roll's own shape
// pointed at the hero. The PROCESSED fish IS the meal, so eating one is a verb
// rather than a second recipe, and the COOKING level slides how long it lasts
// exactly as it slides a base's roll — one thing to learn.

/** Descents a meal cooked at this level lasts. The window NARROWS as it climbs,
 *  off the same `CRAFT.width*` a craft reads: *"at level 1 you can only get it
 *  to land on 5–8 and it goes up until level 99 cooking is always 14–15."* */
export function mealRuns(level: number, rng: Rng): number {
  const quality = qualityRoll(level, rng);
  const [lo, hi] = MEAL.runs;
  return Math.max(1, Math.round(lo + quality * (hi - lo)));
}

/** Why this cannot be eaten, or null. */
export function whyNotEat(game: GameState, fish: string): string | null {
  if (!MEAL_BY_FISH[fish]) return 'Nothing is cooked out of that.';
  const held = (game.materials ?? []).find((i) => i.base === fish && i.meta.done);
  if (((held?.meta.n as number) ?? 0) < 1) return 'None cooked. Work some at the kitchen.';
  return null;
}

/** EAT IT. One at a time: a second sits the first down, which is what makes
 *  which fish you cooked a decision rather than a checklist. */
export function eatMeal(game: GameState, fish: string, rng: Rng): RolledMod | null {
  if (whyNotEat(game, fish)) return null;
  const def = MEAL_BY_FISH[fish];
  const held = (game.materials ?? []).find((i) => i.base === fish && i.meta.done)!;
  held.meta.n = ((held.meta.n as number) ?? 0) - 1;
  game.materials = (game.materials ?? []).filter((i) => ((i.meta.n as number) ?? 0) > 0);

  const level = professionAt(game, 'cooking').level;
  const lift = liftFor(qualityRoll(level, rng));
  const meal: RolledMod = {
    entryId: `meal_${fish}`,
    defId: `meal_${fish}`,
    group: 'meal',
    slot: 'meal',
    name: def.name,
    tier: 0,
    tags: ['meal'],
    uses: mealRuns(level, rng),
    stats: def.stats.map((line) => ({
      stat: line.stat,
      form: line.form,
      value: Math.round(line.range[0] * lift),
      tags: line.tags ?? [],
    })),
  };
  game.character.meal = meal;
  return meal;
}

/** ONE DESCENT off what you ate, on a CLEAR and never on a death — the rule a
 *  crystal roll is already under. Returns the meal that ran out, if one did. */
export function spendMeal(game: GameState): RolledMod | null {
  const meal = game.character.meal;
  if (!meal || meal.uses === undefined) return null;
  if (meal.uses > 1) {
    game.character.meal = { ...meal, uses: meal.uses - 1 };
    return null;
  }
  delete game.character.meal;
  return meal;
}
