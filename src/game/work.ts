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
  CURRENCIES,
  CURRENCY_BY_ID,
  GATHER,
  INSTABILITY,
  MATERIAL_BY_ID,
  MATERIAL_FAMILY_BY_ID,
  MEAL,
  MEAL_BY_FISH,
  PROCESSING,
  PROFESSION,
  PROFESSIONS,
  WORK,
  WORKERS,
  WORKER_BY_ID,
  gathererOf,
  workerMark,
} from '../data';
import type { MaterialDef, ProfessionDef, WorkerDef } from '../data';
import type { CurrencyDef } from '../types';
import type { MapTheme } from '../types';
import { nextMeeting } from './scenes';
import { balance, grant, makeMaterial, spend } from '../economy';
import { addItem } from './state';
import type { GameState } from './state';
import type { Item, RolledMod } from '../types';
import type { Rng } from '../rng';
import { liftFor, qualityRoll } from './forge';

/** One job loaded at a station, and WHO is on it. `startAt` and `doneAt` are
 *  epoch milliseconds a unit apart per `n`; `taken` is how many of the units
 *  the clock has finished have already been collected into the bag. `material`
 *  names a raw material, or a ROUGH shard the jeweller's is cutting. */
export interface WorkJob {
  id: string;
  profession: string;
  material: string;
  n: number;
  startAt: number;
  doneAt: number;
  taken: number;
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

/** WHO STANDS DOWN HERE, off the ONE queue everybody found is in — a worker is
 *  not a separate rota, or two schedules would each think it was their turn. */
export const workerDown = (game: GameState, theme: MapTheme, rung: number): WorkerDef | undefined => {
  const next = nextMeeting(game);
  if (!next?.worker || next.theme !== theme || rung < next.rung) return undefined;
  return next.worker;
};

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
export const unitMs = (): number => WORK.secondsEach * 1000;

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

/** A gathering profession's cut of one descent. */
export interface GatherGain {
  profession: string;
  raw: number;
  levels: number;
}

/**
 * WHAT A DESCENT TAUGHT THE GATHERER, off the RAW it actually banked — *"the
 * levels should be separate and increased by actually using the tools."*
 * Derived from the haul rather than counted in the sim, so nothing has to be
 * tallied twice; gem pays nothing at all, having no gatherer to pay.
 */
export function payGathering(game: GameState, items: Item[]): GatherGain[] {
  const raw = new Map<string, number>();
  for (const item of items) {
    if (item.kind !== 'material' || item.meta.done) continue;
    const who = gathererOf(MATERIAL_BY_ID[item.base]?.family ?? '');
    if (!who) continue;
    raw.set(who.id, (raw.get(who.id) ?? 0) + (((item.meta.n as number) ?? 0)));
  }
  return [...raw.entries()]
    .filter(([, n]) => n > 0)
    .map(([profession, n]) => ({ profession, raw: n, levels: payXp(game, profession, n * GATHER.xpPerRaw) }));
}

/** Raw of one material in the bag. */
const rawCount = (game: GameState, id: string): number =>
  ((game.materials ?? []).find((i) => i.base === id && !i.meta.done)?.meta.n as number) ?? 0;

/** Why this job cannot be loaded, or null. Said rather than greyed: a button
 *  that does nothing and will not say why is the same as one that is missing. */
export function whyNotWork(game: GameState, def: MaterialDef): string | null {
  if (!def.family) return 'Nothing works this. It is used as it came up.';
  const found = workersFound(game);
  if (found.length === 0) return 'Nobody to work it. Workers are found down the Fissure.';
  if (!idleWorker(game)) return `Every worker is busy — ${found.length} of ${found.length}.`;
  const n = rawCount(game, def.id);
  if (n < WORK.least) return `${WORK.least} needed, ${n} held.`;
  return null;
}

/** How big a job of this would be: EVERYTHING YOU HOLD. Read by the screen
 *  before the click, so the button says the number it is about to take. */
export const jobSize = (game: GameState, id: string): number => rawCount(game, id);

/** Load one job onto the first idle worker. The raw leaves the bag NOW — a
 *  job you can cancel for a refund is a slot that costs nothing to fill. */
export function loadWork(game: GameState, def: MaterialDef): WorkJob | null {
  if (whyNotWork(game, def)) return null;
  const profession = PROCESSING.find((p) => p.family === def.family);
  const held = (game.materials ?? []).find((i) => i.base === def.id && !i.meta.done);
  if (!profession || !held) return null;
  const n = jobSize(game, def.id);
  held.meta.n = ((held.meta.n as number) ?? 0) - n;
  game.materials = (game.materials ?? []).filter((i) => ((i.meta.n as number) ?? 0) > 0);
  return startJob(game, profession.id, def.id, n);
}

/** THE ROUGH SHARDS HELD, every kind with one in the wallet: what the jeweller's cuts. */
export const roughHeld = (game: GameState): CurrencyDef[] =>
  CURRENCIES.filter((c) => c.cuts && balance(game.wallet, c.id) > 0);

/** Why this rough cannot be cut, or null — the same walls a raw stack meets. */
export function whyNotCut(game: GameState, def: CurrencyDef): string | null {
  if (!def.cuts) return 'Nothing cuts this. It is spent as it is.';
  const found = workersFound(game);
  if (found.length === 0) return 'Nobody to cut it. Workers are found down the Fissure.';
  if (!idleWorker(game)) return `Every worker is busy — ${found.length} of ${found.length}.`;
  const n = balance(game.wallet, def.id);
  if (n < WORK.least) return `${WORK.least} needed, ${n} held.`;
  return null;
}

/** CUT EVERY ROUGH SHARD OF ONE KIND, at the jeweller's, into the shard the
 *  bench spends. One for one on the same clock a bar is, and it is the whole
 *  of how Jewelling is levelled short of the bench. */
export function loadCut(game: GameState, def: CurrencyDef): WorkJob | null {
  if (whyNotCut(game, def)) return null;
  const n = balance(game.wallet, def.id);
  spend(game.wallet, { [def.id]: n });
  return startJob(game, INSTABILITY.bench, def.id, n);
}

function startJob(game: GameState, profession: string, material: string, n: number): WorkJob | null {
  const worker = idleWorker(game);
  if (!worker) return null;
  const job: WorkJob = {
    id: `job_${nextJob++}`,
    profession,
    material,
    n,
    startAt: clock(),
    doneAt: clock() + n * unitMs(),
    taken: 0,
    worker: worker.id,
  };
  game.jobs = [...jobsIn(game), job];
  return job;
}

/** The family a job's station belongs to: a rough shard is the jeweller's. */
export const familyOfJob = (job: WorkJob): string | undefined =>
  CURRENCY_BY_ID[job.material]?.cuts ? 'gem' : MATERIAL_BY_ID[job.material]?.family ?? undefined;

/** What a job handed over on one collection: `n` units of it, never the whole. */
export interface Finished {
  job: WorkJob;
  name: string;
  item?: Item; // the stack a material landed as; a cut shard lands in the wallet
  n: number;
  levels: number;
}

/** Seconds a job has left on the clock, floored at none. */
export const leftOn = (job: WorkJob): number => Math.max(0, (job.doneAt - clock()) / 1000);
/** Units the clock has finished so far, collected or not. */
export const finishedOn = (job: WorkJob): number =>
  Math.max(0, Math.min(job.n, Math.floor((clock() - job.startAt) / unitMs())));
/** Seconds until the next unit lands, none once the last has. */
export const nextOn = (job: WorkJob): number =>
  finishedOn(job) >= job.n ? 0 : Math.max(0, (job.startAt + (finishedOn(job) + 1) * unitMs() - clock()) / 1000);

/** A time left said as `m:ss`, so the screen counts down in one shape. */
export function saysLeft(seconds: number): string {
  const s = Math.ceil(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * WHAT THE CLOCK HAS FINISHED, taken off the stations and into the bag a unit
 * at a time — *"work in bulk but just finish the individual items as it
 * goes."* Asked wherever the bag is next read, so a job done overnight is bars
 * by the time the anvil opens, and one half done is half the bars.
 */
export function collectWork(game: GameState): Finished[] {
  const out: Finished[] = [];
  const kept: WorkJob[] = [];
  for (const job of jobsIn(game)) {
    const def = MATERIAL_BY_ID[job.material];
    const cut = CURRENCY_BY_ID[job.material]?.cuts;
    if (!def && !cut) continue; // a material that has been cut takes its job with it
    const fresh = finishedOn(job) - job.taken;
    if (fresh > 0) {
      let item: Item | undefined;
      if (cut) grant(game.wallet, cut, fresh);
      else addItem(game, (item = makeMaterial(def as MaterialDef, fresh, true)));
      job.taken += fresh;
      const name = item?.name ?? CURRENCY_BY_ID[cut ?? '']?.name ?? job.material;
      out.push({ job, name, item, n: fresh, levels: payXp(game, job.profession, WORK.xp * fresh) });
    }
    if (job.taken < job.n) kept.push(job);
  }
  game.jobs = kept;
  return out;
}

/** What a job is called on screen, in the station's own words. */
export function saysJob(job: WorkJob): string {
  const rough = CURRENCY_BY_ID[job.material];
  if (rough?.cuts) return `${job.n} ${rough.name} → ${job.n} ${CURRENCY_BY_ID[rough.cuts]?.name ?? rough.cuts}`;
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
