/**
 * The character sheet, as a modal — reference you consult while socketing a
 * crystal or crafting gear, which navigating to a screen would prevent.
 *
 * A filled slot takes the item off; an empty one lights up everything in the
 * DOCK that fits, which is where your gear already is. Worn items live here
 * rather than in the dock, which is safe because this screen shows them.
 */
import { DAMAGE_TYPES, DEFENCE, EQUIP_SLOTS, SKILLS } from '../data';
import { describeMod } from '../crafting';
import { characterStats } from '../sim/stats';
import { xpToNext } from '../sim/character';
import { equipItem, fitsSlot, unequipItem } from '../game/state';
import type { GameState } from '../game/state';
import { gearIcon } from './icons';
import { note } from './history';
import { attachTooltip, hideTooltip } from './tooltip';
import { slotButtonId } from './tutorial';
import { setInventoryHandler } from './inventory';
import type { EquipSlotDef, Item } from '../types';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let game: GameState;
/** Slot currently being filled. Drives what lights up in the dock. */
let picking: string | null = null;
let onChanged: (() => void) | null = null;
/** Hands the dock back to whatever is underneath when this closes. */
let onClosed: (() => void) | null = null;

function tooltip(item: Item): string {
  if (item.mods.length === 0) return `${item.name} — no modifiers`;
  const rating = item.armour ? [`Armour ${item.armour}`] : [];
  return [item.name, ...rating, ...item.mods.map((m) => describeMod(m))].join('\n');
}

function renderSlots(): void {
  const host = $('sheet-slots');
  host.replaceChildren();

  for (const slot of EQUIP_SLOTS) {
    const worn = game.character.equipment[slot.id];
    const cell = el('div', 'slotcell');
    cell.append(el('div', 'slotcell__label', slot.name));

    const btn = el('button', 'slotcell__btn') as HTMLButtonElement;
    // Stable id so the guided opening can point at one slot rather than the
    // grid. The demo asserts every step's target exists.
    btn.id = slotButtonId(slot.id);
    if (worn) {
      btn.append(gearIcon((worn.meta.art as string) ?? 'body', 30));
      const body = el('span', 'slotcell__body');
      body.append(el('span', 'slotcell__name', worn.name));
      body.append(
        el('span', 'slotcell__meta', `${worn.mods.length} mod${worn.mods.length === 1 ? '' : 's'}`)
      );
      btn.append(body);
      attachTooltip(btn, () => tooltip(worn));
      btn.classList.add('slotcell__btn--worn');
      btn.onclick = () => {
        // Taking something off is a net addition to the bag, so it can be
        // refused. Silently doing nothing would read as a broken button.
        if (!unequipItem(game, slot.id)) {
          note(`No room to carry ${worn.name} — your gear is full`, 'fail');
          return;
        }
        note(`Took off ${worn.name}`);
        picking = null;
        render();
      };
    } else {
      btn.append(
        el(
          'span',
          'slotcell__empty',
          picking === slot.id ? 'pick one below' : 'empty'
        )
      );
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

/**
 * What the dock does while the sheet is open. With no slot picked nothing is
 * actionable — a live-looking button that does nothing is worse than a dim one.
 */
function sheetHandler() {
  const slot: EquipSlotDef | undefined = EQUIP_SLOTS.find((s) => s.id === picking);
  return {
    actionFor: (item: Item) => {
      if (!slot || !fitsSlot(item, slot)) return null;
      return {
        label: `Wear as ${slot.name.toLowerCase()}`,
        run: () => {
          equipItem(game, item, slot.id);
          note(`Equipped ${item.name}`);
          picking = null;
          render();
        },
      };
    },
    highlighted: (item: Item) => !!slot && fitsSlot(item, slot),
  };
}

/** Says what picking a slot did, since the answer is now outside this window. */
function renderPickHint(): void {
  const host = $('sheet-pick');
  const slot = EQUIP_SLOTS.find((s) => s.id === picking);
  host.hidden = !slot;
  if (!slot) return;

  const options = game.inventory.filter((i) => fitsSlot(i, slot));
  host.textContent =
    options.length === 0
      ? `Nothing you are carrying fits the ${slot.name.toLowerCase()} slot.`
      : `${options.length} in your dock fit${options.length === 1 ? 's' : ''} the ${slot.name.toLowerCase()} slot — they are lit up below.`;
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
    // Armour shows points AND what they're worth — the whole reason it curves
    // on points rather than on hit size is that this number can be stated.
    ['armour', `${Math.round(s.armour)} (${s.armourReduction.toFixed(0)}%)`],
    ['regen/sec', s.lifeRegen.toFixed(1)],
    ['reach', s.attackRange.toFixed(1)],
  ];

  for (const [k, v] of rows) {
    const row = el('div', 'stat');
    row.append(el('span', 'stat__k', k));
    row.append(el('span', 'stat__v', v));
    host.append(row);
  }

  // Resistances, grouped as they're resisted. Zeroes are shown too — an
  // unresisted type is exactly the thing you want to notice.
  const res = $('sheet-res');
  res.replaceChildren();
  for (const type of DAMAGE_TYPES) {
    const value = Math.round(s.resistances[type.id] ?? 0);
    const row = el('div', 'stat');
    row.append(el('span', 'stat__k', type.name.toLowerCase()));
    const cell = el('span', 'stat__v', `${value}%`);
    if (value >= DEFENCE.resistanceCap) cell.classList.add('stat__v--capped');
    else if (value === 0) cell.classList.add('stat__v--zero');
    row.append(cell);
    res.append(row);
  }

  const need = xpToNext(game.character.level);
  $('sheet-level').textContent = String(game.character.level);
  $('sheet-xp-text').textContent = `${game.character.xp} / ${need}`;
  ($('sheet-xp-fill') as HTMLElement).style.width =
    `${Math.min(100, (game.character.xp / need) * 100)}%`;
}

function render(): void {
  hideTooltip();
  renderSlots();
  renderPickHint();
  renderStats();
  // The handler has to be re-registered on every render: it closes over
  // `picking`, so a stale one keeps lighting up the slot you already filled.
  // setInventoryHandler redraws the dock, so this covers that too.
  setInventoryHandler(sheetHandler());
  onChanged?.();
}

/** Redraws the sheet if it is up, for an equip that happened somewhere else. */
export function refreshCharacter(): void {
  if (isCharacterOpen()) render();
}

export function openCharacter(): void {
  picking = null;
  render();
  $('sheet').hidden = false;
}

export function closeCharacter(): void {
  $('sheet').hidden = true;
  picking = null;
  hideTooltip();
  onClosed?.();
}

/**
 * Which slot is waiting, if any. The guided opening needs it: picking a slot
 * moves the next thing to click OUT of this window and into the dock, and a
 * guide that cannot see that rings a slot while the gear sits switched off.
 */
export const pickingSlot = (): string | null => picking;

export function isCharacterOpen(): boolean {
  return !$('sheet').hidden;
}

/**
 * `changed` lets the views refresh derived readouts after an equip; `closed`
 * hands the dock back, because this screen now claims it while it is open.
 */
export function initCharacter(
  state: GameState,
  changed?: () => void,
  closed?: () => void
): void {
  game = state;
  onChanged = changed ?? null;
  onClosed = closed ?? null;

  ($('sheet-close') as HTMLButtonElement).onclick = closeCharacter;
  $('sheet').addEventListener('click', (event) => {
    // Click the backdrop to dismiss; clicks inside the card shouldn't.
    if (event.target === $('sheet')) closeCharacter();
  });
}
