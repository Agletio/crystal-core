/**
 * THE STATIONS: six of them, one a profession, and what each is working on.
 *
 * A tab apiece rather than six screens, because processing is ONE mechanism
 * however it is dressed — a smelter and a loom differ in the word, the picture
 * and nothing else. Every station in the camp opens this on its own tab, so the
 * furnace and the loom are two doors into one room.
 */
import { MATERIAL_BY_ID, MATERIAL_FAMILIES, PROFESSIONS, THEME_BY_ID, WORK } from '../data';
import type { MaterialFamilyDef } from '../data';
import {
  collectWork,
  idleWorker,
  jobOf,
  jobsIn,
  leftOn,
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
import { itemIcon } from './icons';
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

/** One raw stack, and what a batch of it would become. */
function rawCard(family: MaterialFamilyDef, item: any): HTMLElement {
  const def = MATERIAL_BY_ID[item.base];
  const n = (item.meta.n as number) ?? 0;
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
    el('div', 'crystal__grow', `${WORK.batch} → ${WORK.batch} ${family.one}s, ${WORK.minutes} minutes`)
  );

  // THE BUTTON NAMES THE WORKER it goes to, so who is being assigned is read
  // before the click rather than found afterwards.
  const why = whyNotWork(game, def);
  const idle = idleWorker(game);
  const button = el('button', 'mini', why ?? `${idle?.name} works ${WORK.batch}`) as HTMLButtonElement;
  button.id = workLoadId(def.id);
  button.disabled = why !== null;
  button.onclick = () => {
    const job = loadWork(game, def);
    if (!job) return;
    note(`${idle?.name} loads ${WORK.batch} ${def.name} onto ${family.station}`);
    render();
    onChanged?.();
  };
  card.append(button);
  return card;
}

export function render(): void {
  if (!game) return;
  // WHAT THE CLOCK FINISHED comes off the stations first, and says so.
  for (const done of collectWork(game)) note(`${done.item.name} came off the station: +${done.job.n}`);
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
    `${family.raw} into ${family.processed}, ${WORK.minutes} minutes a batch.${eating}`;
  ($('work-bar') as HTMLElement).style.width = `${Math.round((at.xp / need) * 100)}%`;
  $('work-xp').textContent = `Level ${at.level} — ${Math.floor(at.xp)} / ${need} to the next`;

  const host = $('work-raw');
  host.replaceChildren();
  const raw = rawHeld(game, family.id);
  for (const item of raw) host.append(rawCard(family, item));
  if (raw.length === 0) {
    host.append(
      el('p', 'empty', `No ${family.raw} yet. It comes up out of a descent, ${family.verb.toLowerCase()}.`)
    );
  }

  // ONE CARD A WORKER: who they are, what they are on and the time left, or
  // idle. The slots ARE the workers, so an empty list says where they are found.
  const jobs = $('work-jobs');
  jobs.replaceChildren();
  const found = workersFound(game);
  for (const w of found) {
    const job = jobOf(game, w.id);
    const card = el('div', 'quest');
    card.id = `work-worker-${w.id}`;
    card.append(el('div', 'crystal__name', job ? `${w.name} — ${saysJob(job)}` : `${w.name} — idle`));
    const which = job ? PROFESSIONS.find((p) => p.id === job.profession) : undefined;
    card.append(
      el('div', 'quest__detail',
        job ? `${which?.name ?? job.profession} — ${saysLeft(leftOn(job))} left` : 'Load a batch at a station.')
    );
    jobs.append(card);
  }
  if (found.length === 0) {
    jobs.append(el('p', 'empty', 'Nobody to work them yet. Workers are found down the Fissure and come back with you.'));
  }
  $('work-slots').textContent = `${jobsIn(game).length}/${found.length} workers busy`;
}

/** Opened by a station in the camp, ON that station's own tab. */
export function openWork(family?: string): void {
  if (family && MATERIAL_FAMILIES.some((f) => f.id === family)) shown = family;
  $('work').hidden = false;
  render();
  // The clock is on screen, so it COUNTS DOWN: a number that only moves when
  // you reopen the window is the going in and out the ask was about.
  if (ticking === null) ticking = globalThis.setInterval(render, 1000);
}

let ticking: ReturnType<typeof setInterval> | null = null;

export function closeWork(): void {
  $('work').hidden = true;
  if (ticking !== null) globalThis.clearInterval(ticking);
  ticking = null;
  onChanged?.();
}

export const isWorkOpen = (): boolean => !$('work').hidden;

export function initWork(state: GameState, refresh: () => void): void {
  game = state;
  onChanged = refresh;
  ($('work-close') as HTMLButtonElement).onclick = closeWork;
}
