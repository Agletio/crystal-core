/**
 * Putting something on, from wherever you clicked it.
 *
 * One place, because the answer to "did I mean that?" has to be the same on
 * every screen: a line naming what you put on and which slot took it, and one
 * button that puts both pieces back where they were.
 */
import { equipItem } from '../game/state';
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
  const undo = equipItem(game, item, slotId);
  if (!undo) return false;

  const slot = EQUIP_SLOTS.find((s) => s.id === slotId);
  note(`Equipped ${item.name}`);
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
