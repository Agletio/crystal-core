/**
 * The auto-sell filter: what comes up out of the Fissure with you and what
 * arrives as gold. Clicked in what you KEEP, because that is the short list —
 * a build wants three rungs of two groups and nothing else in the game.
 *
 * `GameState.junk` stores the inverse, so a save that has never seen this
 * screen keeps everything and the filter does nothing until it is opened.
 */
import { KEEP_GROUPS, KEEP_TIERS, tierKeepId } from '../data';
import { keepsItem } from '../game/state';
import type { GameState } from '../game/state';
import { sellPrice } from '../economy';
import { attachTooltip, hideTooltip } from './tooltip';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let game: GameState;
let onChanged: (() => void) | null = null;

const kept = (id: string): boolean => !(game.junk ?? []).includes(id);

function setKept(id: string, on: boolean): void {
  const junk = new Set(game.junk ?? []);
  if (on) junk.delete(id);
  else junk.add(id);
  game.junk = [...junk];
}

/** One toggle. `detail` is what the row actually holds, since a group name is
 *  a word somebody chose and the bases under it are the answer. */
function toggle(id: string, name: string, detail: string): HTMLButtonElement {
  const on = kept(id);
  const btn = el('button', `mini keepbtn${on ? ' mini--on' : ''}`, name) as HTMLButtonElement;
  attachTooltip(btn, () => `${name}\n${detail}\n— ${on ? 'kept' : 'sold on the way up'}`);
  btn.setAttribute('aria-pressed', String(on));
  btn.onclick = () => {
    setKept(id, !on);
    render();
    onChanged?.();
  };
  return btn;
}

export function render(): void {
  hideTooltip();

  const tiers = $('filter-tiers');
  tiers.replaceChildren();
  for (const tier of KEEP_TIERS) {
    tiers.append(toggle(tierKeepId(tier), `Tier ${tier}`, `Every base at rung ${tier}`));
  }

  const gear = $('filter-gear');
  const armour = $('filter-armour');
  gear.replaceChildren();
  armour.replaceChildren();
  for (const group of KEEP_GROUPS) {
    const row = toggle(group.id, group.name, group.detail);
    (group.id.startsWith('armour_') ? armour : gear).append(row);
  }

  // What it would do to what you are holding RIGHT NOW. A filter is a rule
  // about loot nobody has found yet, and a rule you cannot see the effect of
  // is one you set wrong and never find out about.
  const doomed = game.inventory.filter((i) => i.kind === 'gear' && !keepsItem(game, i));
  const worth = doomed.reduce((n, i) => n + sellPrice(i), 0);
  $('filter-hint').textContent =
    (game.junk ?? []).length === 0
      ? 'Keeping everything. A cleared descent brings up all of it.'
      : doomed.length === 0
        ? 'Nothing you are carrying would be sold. It is read on the way up, so a piece already in the bag is safe.'
        : `${doomed.length} of what you carry matches what this sells — ${worth} gold. It only ever runs on the way up, so those stay.`;
}

export function openFilter(): void {
  $('filter').hidden = false;
  render();
}

export function closeFilter(): void {
  $('filter').hidden = true;
  hideTooltip();
}

export const isFilterOpen = (): boolean => !$('filter').hidden;

export function initFilter(state: GameState, refresh: () => void): void {
  game = state;
  onChanged = refresh;
  ($('filter-close') as HTMLButtonElement).onclick = closeFilter;
  ($('filter-all') as HTMLButtonElement).onclick = () => {
    game.junk = [];
    render();
    onChanged?.();
  };
  // The other end of the same rule, and the way you actually build one: junk
  // the lot, then click back the two groups and the rung you are wearing.
  ($('filter-none') as HTMLButtonElement).onclick = () => {
    game.junk = [...KEEP_GROUPS.map((g) => g.id), ...KEEP_TIERS.map((t) => tierKeepId(t))];
    render();
    onChanged?.();
  };
  render();
}
