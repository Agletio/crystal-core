/**
 * THE WORKS: six stations, one a profession, and what each is working on.
 *
 * A tab apiece rather than six screens, because processing is ONE mechanism
 * however it is dressed — a smelter and a loom differ in the word, the picture
 * and nothing else. Every station in the camp opens this on its own tab, so the
 * furnace and the loom are two doors into one room.
 */
import { CURRENCY_BY_ID, MATERIAL_BY_ID, MATERIAL_FAMILIES, PROFESSIONS, THEME_BY_ID, WORK } from '../data';
import type { MaterialFamilyDef } from '../data';
import type { CurrencyDef } from '../types';
import type { WorkJob } from '../game/work';
import { balance } from '../economy';
import {
  collectWork,
  idleWorker,
  jobOf,
  jobSize,
  jobsIn,
  finishedOn,
  loadCut,
  roughHeld,
  SELF,
  whyNotCut,
  leftOn,
  nextOn,
  loadWork,
  professionAt,
  professionFor,
  rawHeld,
  saysJob,
  saysLeft,
  whyNotWork,
  workersFound,
  xpToNext,
} from '../game/work';
import type { GameState } from '../game/state';
import { currencyIcon, itemIcon } from './icons';
import { attachTooltip } from './tooltip';
import { note } from './history';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let game: GameState;
let onChanged: (() => void) | null = null;
let shown = MATERIAL_FAMILIES[0].id;

/** The button one raw stack offers, so a harness can name it without its wording. */
export const workLoadId = (materialId: string): string => `work-load-${materialId}`;
/** And the one beside it, for the hero taking the job himself. */
export const workSelfId = (materialId: string): string => `work-self-${materialId}`;

/** THE TWO BUTTONS every stack gets: a worker, or the hero himself — *"have
 *  your player character be capable of working if you want them to while in
 *  town."* Each names who it goes to before the click. */
function loadButtons(
  id: string,
  n: number,
  why: (self: boolean) => string | null,
  load: (self: boolean) => { n: number } | null,
  said: string
): HTMLElement {
  const row = el('div', 'workload');
  const idle = idleWorker(game);
  const byWorker = why(false);
  const worker = el('button', 'mini', byWorker ?? `${idle?.name} works ${n}`) as HTMLButtonElement;
  worker.id = workLoadId(id);
  worker.disabled = byWorker !== null;
  const bySelf = why(true);
  const self = el('button', 'mini', bySelf ?? `Work ${n} yourself`) as HTMLButtonElement;
  self.id = workSelfId(id);
  self.disabled = bySelf !== null;
  const go = (own: boolean) => () => {
    const job = load(own);
    if (!job) return;
    note(`${own ? 'You load' : `${idle?.name} loads`} ${job.n} ${said}`);
    render();
    onChanged?.();
  };
  worker.onclick = go(false);
  self.onclick = go(true);
  row.append(worker, self);
  return row;
}
export const workTabId = (familyId: string): string => `work-tab-${familyId}`;

function tabs(): void {
  const host = $('work-tabs');
  host.replaceChildren();
  for (const family of MATERIAL_FAMILIES) {
    const profession = professionFor(family.id);
    const at = professionAt(game, profession?.id ?? '');
    const tab = el('button', 'mini climbtab', profession?.name ?? family.name) as HTMLButtonElement;
    tab.id = workTabId(family.id);
    tab.classList.toggle('climbtab--on', family.id === shown);
    tab.append(el('span', 'climbtab__done', ` ${at.level}`));
    attachTooltip(tab, () => `${profession?.name}, at ${family.station}. It makes ${profession?.makes}.`);
    tab.onclick = () => {
      shown = family.id;
      render();
    };
    host.append(tab);
  }
}

/** One raw stack, and what a job of it would become — the SIZE is what you
 *  hold, so the card names this stack's number rather than a fixed batch. */
function rawCard(family: MaterialFamilyDef, item: any): HTMLElement {
  const def = MATERIAL_BY_ID[item.base];
  const n = (item.meta.n as number) ?? 0;
  const size = jobSize(game, def.id);
  const card = el('div', 'crystal');

  const head = el('div', 'crystal__head');
  head.append(itemIcon(item, 26));
  const title = el('div', 'crystal__title');
  title.append(el('div', 'crystal__name', def.name));
  title.append(
    el('div', 'socket__family', `${THEME_BY_ID[def.world]?.name ?? def.world} · ${n} held`)
  );
  head.append(title);
  card.append(head);

  card.append(
    el('div', 'crystal__grow',
      `${size} → ${size} ${family.one}${size === 1 ? '' : 's'}, one every ${WORK.secondsEach}s, ${saysLeft(size * WORK.secondsEach)} in all`)
  );

  card.append(
    loadButtons(def.id, size, (self) => whyNotWork(game, def, self), (self) => loadWork(game, def, self),
      `${def.name} onto ${family.station}`)
  );
  return card;
}

/** One kind of rough shard, and the shard a job of it becomes. */
function roughCard(def: CurrencyDef): HTMLElement {
  const n = balance(game.wallet, def.id);
  const cut = CURRENCY_BY_ID[def.cuts ?? ''];
  const card = el('div', 'crystal');
  const head = el('div', 'crystal__head');
  head.append(currencyIcon(def, 26));
  const title = el('div', 'crystal__title');
  title.append(el('div', 'crystal__name', def.name));
  title.append(el('div', 'socket__family', `${n} held`));
  head.append(title);
  card.append(head);
  card.append(
    el('div', 'crystal__grow',
      `${n} → ${n} ${cut?.name ?? def.cuts}${n === 1 ? '' : 's'}, one every ${WORK.secondsEach}s, ${saysLeft(n * WORK.secondsEach)} in all`)
  );
  card.append(
    loadButtons(def.id, n, (self) => whyNotCut(game, def, self), (self) => loadCut(game, def, self),
      `${def.name} onto the jeweller's`)
  );
  return card;
}

export function render(): void {
  if (!game) return;
  // WHAT THE CLOCK FINISHED comes off the stations first, and says so.
  for (const done of collectWork(game)) note(`${done.name} came off the station: +${done.n}`);
  tabs();
  const family = MATERIAL_FAMILIES.find((f) => f.id === shown) ?? MATERIAL_FAMILIES[0];
  const profession = professionFor(family.id);
  const at = professionAt(game, profession?.id ?? '');
  const need = xpToNext(at.level);

  // ON THE COOKING TAB, what you are UNDER: a buff with no readout is a buff
  // nobody plans around, and this is the kitchen's own room.
  const meal = game.character.meal;
  const eating = family.id === 'fish'
    ? meal
      ? ` You are on ${meal.name} — ${meal.uses} ${meal.uses === 1 ? 'descent' : 'descents'} left.`
      : ' Nothing eaten. Cook a fish and eat it out of the dock.'
    : '';
  $('work-note').textContent =
    `${profession?.name} works ${family.name.toLowerCase()} at ${family.station}: ` +
    `${family.raw} into ${family.processed}, one every ${WORK.secondsEach} seconds, ` +
    `everything held at once.${eating}`;
  ($('work-bar') as HTMLElement).style.width = `${Math.round((at.xp / need) * 100)}%`;
  $('work-xp').textContent = `Level ${at.level} — ${Math.floor(at.xp)} / ${need} to the next`;

  const host = $('work-raw');
  host.replaceChildren();
  const raw = rawHeld(game, family.id);
  for (const item of raw) host.append(rawCard(family, item));
  // THE ROUGH SHARDS ARE THE JEWELLER'S TOO: every shard drops uncut.
  const rough = family.id === 'gem' ? roughHeld(game) : [];
  for (const def of rough) host.append(roughCard(def));
  if (raw.length === 0 && rough.length === 0) {
    host.append(
      el('p', 'empty', `No ${family.raw} yet. It comes up out of a descent, ${family.verb.toLowerCase()}.`)
    );
  }

  // ONE CARD A WORKER: who they are, what they are on and the time left, or
  // idle. The slots ARE the workers, so an empty list says where they are found.
  const jobs = $('work-jobs');
  jobs.replaceChildren();
  const found = workersFound(game);
  // YOU FIRST, and only while you are on something: an idle hero is not a slot
  // waiting to be filled, he is the one reading the screen.
  const own = jobOf(game, SELF);
  const hands: Array<{ id: string; name: string }> = own ? [{ id: SELF, name: 'You' }, ...found] : found;
  for (const w of hands) {
    const job = jobOf(game, w.id);
    const card = el('div', 'quest');
    card.id = `work-worker-${w.id}`;
    card.append(el('div', 'crystal__name', job ? `${w.name} — ${saysJob(job)}` : `${w.name} — idle`));
    const which = job ? PROFESSIONS.find((p) => p.id === job.profession) : undefined;
    card.append(
      el('div', 'quest__detail',
        job
          ? `${which?.name ?? job.profession} — ${finishedOn(job)} of ${job.n} done · next in ${saysLeft(nextOn(job))} · ${saysLeft(leftOn(job))} in all`
          : 'Load raw at a station.')
    );
    // THE UNIT ON THE BENCH, filling over its seconds and starting again —
    // *"a progress bar showing the progress of the individual one."*
    if (job) {
      const bar = el('div', 'grow workbar');
      const fill = el('div', 'grow__fill workbar__fill');
      fill.dataset.job = job.id;
      bar.append(fill);
      card.append(bar);
    }
    jobs.append(card);
  }
  if (hands.length === 0) {
    jobs.append(el('p', 'empty', 'No workers yet. They are found down the Fissure, or work it yourself.'));
  }
  $('work-slots').textContent = `${jobsIn(game).filter((j) => j.worker !== SELF).length}/${found.length} workers busy`;
  syncBars();
}

/** How far through its current unit a job is, 0 to 1; full once the last has landed. */
function unitShare(job: WorkJob): number {
  if (finishedOn(job) >= job.n) return 1;
  return Math.max(0, Math.min(1, 1 - nextOn(job) / WORK.secondsEach));
}

/** UPDATED, NOT REBUILT: the bars move ten times a second under a screen
 *  that is rebuilt once a second, so a click never lands on a node that has
 *  just been torn down. */
function syncBars(): void {
  for (const fill of document.querySelectorAll<HTMLElement>('.workbar__fill')) {
    const job = jobsIn(game).find((j) => j.id === fill.dataset.job);
    fill.style.width = `${job ? Math.round(unitShare(job) * 1000) / 10 : 0}%`;
  }
}

/** Opened by a station in the camp, ON that station's own tab. */
export function openWork(family?: string): void {
  if (family && MATERIAL_FAMILIES.some((f) => f.id === family)) shown = family;
  $('work').hidden = false;
  render();
  syncBars();
  // The clock is on screen, so it COUNTS DOWN: a number that only moves when
  // you reopen the window is the going in and out the ask was about.
  if (ticking === null) ticking = globalThis.setInterval(render, 1000);
  if (barTick === null) barTick = globalThis.setInterval(syncBars, 100);
}

let ticking: ReturnType<typeof setInterval> | null = null;
let barTick: ReturnType<typeof setInterval> | null = null;

export function closeWork(): void {
  $('work').hidden = true;
  if (ticking !== null) globalThis.clearInterval(ticking);
  if (barTick !== null) globalThis.clearInterval(barTick);
  ticking = null;
  barTick = null;
  onChanged?.();
}

export const isWorkOpen = (): boolean => !$('work').hidden;

export function initWork(state: GameState, refresh: () => void): void {
  game = state;
  onChanged = refresh;
  ($('work-close') as HTMLButtonElement).onclick = closeWork;
}
