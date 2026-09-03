/**
 * PROCESSING: raw out of a descent turned into what a recipe can use, at a
 * station in the camp, over WALL-CLOCK MINUTES.
 *
 * *"Process on a timer… it's fine you still want to go and run stuff to clear
 * it while it's processing anyway."* A job finishes at `doneAt` whatever you
 * are doing, and is COLLECTED wherever the bag is next read — the report, the
 * stations, the anvil, a load — through one `clock()` a harness sets forward.
 */
import {
  MATERIAL_BY_ID,
  MATERIAL_FAMILY_BY_ID,
  MEAL,
  MEAL_BY_FISH,
  PROFESSION,
  PROFESSIONS,
  WORK,
  WORKERS,
  WORKER_BY_ID,
  workerMark,
} from '../data';
import type { MaterialDef, ProfessionDef, WorkerDef } from '../data';
import type { MapTheme } from '../types';
import { makeMaterial } from '../economy';
import { addItem } from './state';
import type { GameState } from './state';
import type { Item, RolledMod } from '../types';
import type { Rng } from '../rng';
import { liftFor, qualityRoll } from './forge';

/** One batch loaded at a station, and WHO is on it. `doneAt` is the epoch
 *  millisecond it is finished at; loaded again on a later day it is done. */
export interface WorkJob {
  id: string;
  profession: string;
  material: string;
  n: number;
  doneAt: number;
  worker: string;
}

// --- the workers: found, rescued, and every one a slot ----------------------

export const hasWorker = (game: GameState, id: string): boolean =>
  (game.given ?? []).includes(workerMark(id));

export function takeWorker(game: GameState, id: string): void {
  if (WORKER_BY_ID[id] && !hasWorker(game, id)) game.given = [...(game.given ?? []), workerMark(id)];
}

/** Everybody rescued so far, in the table's order. */
export const workersFound = (game: GameState): WorkerDef[] =>
  WORKERS.filter((w) => hasWorker(game, w.id));

/** WHO STANDS AT THIS DEPTH of this world, not yet rescued. Placed like anybody
 *  else met down there, and ahead of them: a worker's depth is his own. */
export const workerDown = (game: GameState, theme: MapTheme, rung: number): WorkerDef | undefined =>
  WORKERS.find((w) => w.world === theme && w.rung === rung && !hasWorker(game, w.id));

export const jobOf = (game: GameState, workerId: string): WorkJob | undefined =>
  jobsIn(game).find((j) => j.worker === workerId);

/** The first rescued worker with nothing on, or nobody. */
export const idleWorker = (game: GameState): WorkerDef | undefined =>
  workersFound(game).find((w) => !jobOf(game, w.id));

let nextJob = 1;

/** THE CLOCK, one seam: a harness sets it forward instead of waiting. */
let clock: () => number = () => Date.now();
export const setClock = (fn: () => number): void => {
  clock = fn;
};
export const now = (): number => clock();
export const minutesMs = (minutes: number): number => minutes * 60_000;

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
  const found = workersFound(game);
  if (found.length === 0) return 'Nobody to work it. Workers are found down the Fissure.';
  if (!idleWorker(game)) return `Every worker is busy — ${found.length} of ${found.length}.`;
  const held = (game.materials ?? []).find((i) => i.base === def.id && !i.meta.done);
  const n = (held?.meta.n as number) ?? 0;
  if (n < WORK.batch) return `${WORK.batch} needed, ${n} held.`;
  return null;
}

/** Load one batch onto the first idle worker. The raw leaves the bag NOW — a
 *  job you can cancel for a refund is a slot that costs nothing to fill. */
export function loadWork(game: GameState, def: MaterialDef): WorkJob | null {
  if (whyNotWork(game, def)) return null;
  const profession = PROFESSIONS.find((p) => p.family === def.family);
  const worker = idleWorker(game);
  if (!profession || !worker) return null;
  const held = (game.materials ?? []).find((i) => i.base === def.id && !i.meta.done);
  if (!held) return null;

  held.meta.n = ((held.meta.n as number) ?? 0) - WORK.batch;
  game.materials = (game.materials ?? []).filter((i) => ((i.meta.n as number) ?? 0) > 0);
  const job: WorkJob = {
    id: `job_${nextJob++}`,
    profession: profession.id,
    material: def.id,
    n: WORK.batch,
    doneAt: clock() + minutesMs(WORK.minutes),
    worker: worker.id,
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

/** Seconds a job has left on the clock, floored at none. */
export const leftOn = (job: WorkJob): number => Math.max(0, (job.doneAt - clock()) / 1000);

/** A time left said as `m:ss`, so the screen counts down in one shape. */
export function saysLeft(seconds: number): string {
  const s = Math.ceil(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * WHAT THE CLOCK HAS FINISHED, taken off the stations and into the bag. Asked
 * wherever the bag is next read, so a job done overnight is bars by the time
 * the anvil opens.
 */
export function collectWork(game: GameState): Finished[] {
  const out: Finished[] = [];
  const kept: WorkJob[] = [];
  for (const job of jobsIn(game)) {
    if (leftOn(job) > 0) {
      kept.push(job);
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
