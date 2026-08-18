/**
 * Putting something on, from wherever you clicked it.
 *
 * One place, because the answer to "did I mean that?" has to be the same on
 * every screen: a line naming what you put on and which slot took it, and one
 * button that puts both pieces back where they were.
 */
import { equipItem, handClash } from '../game/state';
import type { GameState } from '../game/state';
import { EQUIP_SLOTS } from '../data';
import { note } from './history';
import { toast } from './toast';
import type { Item } from '../types';

let after: (() => void) | null = null;

/** The shell owns redrawing: an equip moves something on nearly every screen. */
export function onWearChanged(fn: () => void): void {
  after = fn;
}

export function wear(game: GameState, item: Item, slotId: string): boolean {
  // Read BEFORE the equip: a two-handed weapon empties the other hand, and a
  // piece that comes off without being named reads as a piece that vanished.
  const clashSlot = handClash(game.character, item, slotId);
  const displaced = clashSlot ? game.character.equipment[clashSlot] : null;

  const undo = equipItem(game, item, slotId);
  if (!undo) {
    if (displaced) note(`No room to carry ${displaced.name} — your gear is full`, 'fail');
    return false;
  }

  const slot = EQUIP_SLOTS.find((s) => s.id === slotId);
  note(`Equipped ${item.name}`);
  if (displaced) note(`${displaced.name} came off — ${item.name} takes both hands`);
  after?.();

  toast(`Worn: ${item.name}${slot ? ` — ${slot.name}` : ''}`, {
    label: 'Undo',
    run: () => {
      if (!undo()) {
        note(`${item.name} — that slot has changed since`, 'fail');
        return;
      }
      note(`Took ${item.name} back off`);
      after?.();
    },
  });
  return true;
}
