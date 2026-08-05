/**
 * The character sheet, as a modal.
 *
 * A popup rather than a tab because this is reference you consult, not a
 * workspace you live in — and because you want to read your stats while
 * choosing a map or crafting gear, which a third tab would prevent. It's also
 * the genre convention, which is worth something on its own.
 *
 * Clicking a filled slot takes the item off; clicking an empty one lists what
 * fits. Worn items live here rather than in the inventory, which is safe
 * precisely because this screen shows them.
 */
import { EQUIP_SLOTS, SKILLS } from '../data';
import { describeMod } from '../crafting';
import { characterStats } from '../sim/stats';
import { xpToNext } from '../sim/character';
import { equipItem, fitsSlot, unequipItem } from '../game/state';
import type { GameState } from '../game/state';
import { gearIcon } from './icons';
import { renderInventory } from './inventory';
import type { Item } from '../types';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let game: GameState;
/** Slot currently being filled, if the picker is open. */
let picking: string | null = null;
let onChanged: (() => void) | null = null;

function tooltip(item: Item): string {
  if (item.mods.length === 0) return `${item.name} — no modifiers`;
  return `${item.name}\n${item.mods.map((m) => describeMod(m)).join('\n')}`;
}

function renderSlots(): void {
  const host = $('sheet-slots');
  host.replaceChildren();

  for (const slot of EQUIP_SLOTS) {
    const worn = game.character.equipment[slot.id];
    const cell = el('div', 'slotcell');
    cell.append(el('div', 'slotcell__label', slot.name));

    const btn = el('button', 'slotcell__btn') as HTMLButtonElement;
    if (worn) {
      btn.append(gearIcon((worn.meta.art as string) ?? 'body', 30));
      const body = el('span', 'slotcell__body');
      body.append(el('span', 'slotcell__name', worn.name));
      body.append(
        el('span', 'slotcell__meta', `${worn.mods.length} mod${worn.mods.length === 1 ? '' : 's'}`)
      );
      btn.append(body);
      btn.title = tooltip(worn);
      btn.classList.add('slotcell__btn--worn');
      btn.onclick = () => {
        unequipItem(game, slot.id);
        picking = null;
        render();
      };
    } else {
      btn.append(el('span', 'slotcell__empty', 'empty'));
      btn.classList.toggle('slotcell__btn--picking', picking === slot.id);
      btn.onclick = () => {
        picking = picking === slot.id ? null : slot.id;
        render();
      };
    }
    cell.append(btn);
    host.append(cell);
  }
}

/** Only shown while a slot is selected — otherwise it's a wall of gear. */
function renderPicker(): void {
  const host = $('sheet-picker');
  host.replaceChildren();
  const slot = EQUIP_SLOTS.find((s) => s.id === picking);
  host.hidden = !slot;
  if (!slot) return;

  host.append(el('p', 'panel__title', `Fit a ${slot.name.toLowerCase()}`));
  const options = game.inventory.filter((i) => fitsSlot(i, slot));

  if (options.length === 0) {
    host.append(el('p', 'empty', `Nothing in your inventory fits this slot.`));
    return;
  }

  const grid = el('div', 'inv__grid');
  for (const item of options) {
    const btn = el('button', 'invitem invitem--gear') as HTMLButtonElement;
    btn.append(gearIcon((item.meta.art as string) ?? 'body', 24));
    const body = el('span', 'invitem__body');
    body.append(el('span', 'invitem__name', item.name));
    body.append(
      el('span', 'invitem__meta', `ilvl ${item.ilvl} · ${item.mods.length} mods`)
    );
    btn.append(body);
    btn.title = tooltip(item);
    btn.onclick = () => {
      equipItem(game, item, slot.id);
      picking = null;
      render();
    };
    grid.append(btn);
  }
  host.append(grid);
}

function renderStats(): void {
  const s = characterStats(game.character);
  const host = $('sheet-stats');
  host.replaceChildren();

  const rows: Array<[string, string]> = [
    ['life', Math.round(s.maxLife).toString()],
    ['damage', Math.round(s.damage).toString()],
    ['attacks/sec', s.attacksPerSecond.toFixed(2)],
    ['crit chance', `${Math.round(s.critChance)}%`],
    ['move speed', s.moveSpeed.toFixed(1)],
    ['armour', Math.round(s.armour).toString()],
    ['regen/sec', s.lifeRegen.toFixed(1)],
    ['reach', s.attackRange.toFixed(1)],
  ];

  for (const [k, v] of rows) {
    const row = el('div', 'stat');
    row.append(el('span', 'stat__k', k));
    row.append(el('span', 'stat__v', v));
    host.append(row);
  }

  const need = xpToNext(game.character.level);
  $('sheet-level').textContent = String(game.character.level);
  $('sheet-xp-text').textContent = `${game.character.xp} / ${need}`;
  ($('sheet-xp-fill') as HTMLElement).style.width =
    `${Math.min(100, (game.character.xp / need) * 100)}%`;
}

function renderSkills(): void {
  const host = $('sheet-skills');
  host.replaceChildren();
  for (const skill of SKILLS) {
    const btn = el('button', 'chip', skill.name) as HTMLButtonElement;
    btn.title = skill.description;
    if (skill.id === game.character.skillId) btn.classList.add('chip--on');
    btn.onclick = () => {
      game.character.skillId = skill.id;
      render();
    };
    host.append(btn);
  }
}

function render(): void {
  renderSlots();
  renderPicker();
  renderStats();
  renderSkills();
  renderInventory();
  onChanged?.();
}

export function openCharacter(): void {
  picking = null;
  render();
  $('sheet').hidden = false;
}

export function closeCharacter(): void {
  $('sheet').hidden = true;
  picking = null;
}

export function isCharacterOpen(): boolean {
  return !$('sheet').hidden;
}

/** `changed` lets the views refresh derived readouts after an equip. */
export function initCharacter(state: GameState, changed?: () => void): void {
  game = state;
  onChanged = changed ?? null;

  ($('sheet-close') as HTMLButtonElement).onclick = closeCharacter;
  $('sheet').addEventListener('click', (event) => {
    // Click the backdrop to dismiss; clicks inside the card shouldn't.
    if (event.target === $('sheet')) closeCharacter();
  });
}
