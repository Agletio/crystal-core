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
  jobsIn,
  loadWork,
  professionAt,
  professionFor,
  rawHeld,
  saysJob,
  whyNotWork,
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
    el('div', 'crystal__grow', `${WORK.batch} → ${WORK.batch} ${family.one}s, over ${WORK.clears} descents`)
  );

  const why = whyNotWork(game, def);
  const button = el('button', 'mini', why ? why : `Work ${WORK.batch}`) as HTMLButtonElement;
  button.id = workLoadId(def.id);
  button.disabled = why !== null;
  button.onclick = () => {
    const job = loadWork(game, def);
    if (!job) return;
    note(`Loaded ${WORK.batch} ${def.name} onto ${family.station}`);
    render();
    onChanged?.();
  };
  card.append(button);
  return card;
}

export function render(): void {
  if (!game) return;
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
    `${family.raw} into ${family.processed}, ${WORK.clears} descents a batch.${eating}`;
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

  const jobs = $('work-jobs');
  jobs.replaceChildren();
  for (const job of jobsIn(game)) {
    const card = el('div', 'quest');
    card.append(el('div', 'crystal__name', saysJob(job)));
    const which = PROFESSIONS.find((p) => p.id === job.profession);
    card.append(
      el('div', 'quest__detail',
        `${which?.name ?? job.profession} — ${job.left} ${job.left === 1 ? 'descent' : 'descents'} left`)
    );
    jobs.append(card);
  }
  if (jobsIn(game).length === 0) {
    jobs.append(el('p', 'empty', 'Nothing on any of them. Load a batch and go down.'));
  }
  $('work-slots').textContent = `${jobsIn(game).length}/${WORK.slots} loaded`;
}

/** Opened by a station in the camp, ON that station's own tab. */
export function openWork(family?: string): void {
  if (family && MATERIAL_FAMILIES.some((f) => f.id === family)) shown = family;
  $('work').hidden = false;
  render();
}

export function closeWork(): void {
  $('work').hidden = true;
  onChanged?.();
}

export const isWorkOpen = (): boolean => !$('work').hidden;

export function initWork(state: GameState, refresh: () => void): void {
  game = state;
  onChanged = refresh;
  ($('work-close') as HTMLButtonElement).onclick = closeWork;
}
