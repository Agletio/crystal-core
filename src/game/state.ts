/**
 * The whole game, in one object.
 *
 * Nothing persists yet — a reload starts fresh. It's centralised anyway
 * because that's the difference between adding save points later and having
 * to hunt state out of five modules first. When saving arrives it should be
 * roughly `JSON.stringify(game)` plus a version check, and `version` is here
 * so a format change can reset cleanly instead of crashing on old data.
 */
import { Rng } from '../rng';
import { EQUIP_SLOTS, FREE_MAP, START_PRESETS } from '../data';
import type { EquipSlotDef } from '../types';
import { grant, makeCrystal, makeGear } from '../economy';
import { makeCharacter } from '../sim/character';
import { starterLoadout } from '../sim/loadout';
import type { Character } from '../sim/character';
import type { Item, Wallet } from '../types';

export const SAVE_VERSION = 1;

export interface GameState {
  version: number;
  wallet: Wallet;
  inventory: Item[];
  character: Character;
  /**
   * Id of the inventory item currently open on the bench.
   *
   * A reference, not a move. The bench used to take the item OUT of the
   * inventory, which made it look like crafting had eaten it — the thing you
   * were working on vanished from the list. Selecting in place means it stays
   * visible and highlighted, and "returning" it is just dropping the
   * reference.
   */
  benchId: string | null;
  /** False until a skill has been chosen on the first run. */
  onboarded: boolean;
  /** False until the first map has been cleared. Gates the opening payout. */
  firstClearDone: boolean;
}

export type StartMode = 'fresh' | 'dev';

export function createGame(mode: StartMode = 'dev'): GameState {
  const game: GameState = {
    version: SAVE_VERSION,
    wallet: {},
    inventory: [],
    character: makeCharacter({}, 'strike'),
    benchId: null,
    onboarded: false,
    firstClearDone: false,
  };
  resetGame(game, mode);
  return game;
}

/**
 * Wipes back to a starting state, IN PLACE.
 *
 * Mutates rather than replacing because every view captured this object at
 * init. Handing them a new one would leave them all pointed at the old game.
 */
export function resetGame(game: GameState, mode: StartMode): void {
  const preset = START_PRESETS[mode];

  game.wallet = {};
  grant(game.wallet, 'fragment', preset.fragments);
  for (const [id, n] of Object.entries(preset.currency)) grant(game.wallet, id, n);

  game.inventory = [
    ...preset.crystals.map((tier) => makeCrystal(tier)),
    ...preset.gear.map((g) => makeGear(g.base, g.ilvl)),
  ];

  // A fresh character owns nothing and has worn nothing. The dev preset wears
  // a rolled set so the sheet and the stat pipeline have something in them.
  game.character = makeCharacter(
    preset.equipped ? starterLoadout(new Rng(1)) : {},
    'strike'
  );
  game.benchId = null;

  // A fresh game asks which skill you want; the dev kit assumes you know.
  game.onboarded = mode === 'dev';
  game.firstClearDone = mode === 'dev';
}

/**
 * The opening payout, granted once, when the first map is cleared.
 *
 * Returns what was given so the results overlay can show it as loot rather
 * than having it appear silently in the inventory.
 */
export function grantFirstClear(game: GameState): {
  fragments: number;
  currency: Record<string, number>;
  weapon: Item | null;
} | null {
  if (game.firstClearDone) return null;
  game.firstClearDone = true;

  const gift = FREE_MAP.firstClear;
  grant(game.wallet, 'fragment', gift.fragments);
  for (const [id, n] of Object.entries(gift.currency)) grant(game.wallet, id, n);

  const weapon = makeGear(gift.weapon, 1);
  addItem(game, weapon);

  return { fragments: gift.fragments, currency: gift.currency, weapon };
}

export function addItem(game: GameState, item: Item): void {
  game.inventory.push(item);
}

export function removeItem(game: GameState, item: Item): boolean {
  const i = game.inventory.indexOf(item);
  if (i < 0) return false;
  game.inventory.splice(i, 1);
  if (game.benchId === item.id) game.benchId = null;
  return true;
}

export function findItem(game: GameState, id: string): Item | undefined {
  return game.inventory.find((i) => i.id === id);
}

/** The item the bench is working on, or null. */
export function benchItem(game: GameState): Item | null {
  if (!game.benchId) return null;
  return findItem(game, game.benchId) ?? null;
}

export function selectForBench(game: GameState, item: Item): void {
  game.benchId = item.id;
}

export function clearBench(game: GameState): void {
  game.benchId = null;
}

/**
 * Swaps a crafted result back into the inventory in place.
 * craft() returns a new object but preserves the id, so position is kept and
 * the bench selection survives.
 */
export function replaceItem(game: GameState, item: Item): void {
  const i = game.inventory.findIndex((existing) => existing.id === item.id);
  if (i < 0) game.inventory.push(item);
  else game.inventory[i] = item;
}

export const crystalsIn = (game: GameState): Item[] =>
  game.inventory.filter((i) => i.kind === 'crystal');

/** Which slot type an item fits, if any. */
export function gearKindOf(item: Item): string | null {
  if (item.kind !== 'gear') return null;
  return (item.meta.gearKind as string) ?? null;
}

export function fitsSlot(item: Item, slot: EquipSlotDef): boolean {
  return gearKindOf(item) === slot.accepts;
}

/**
 * Wear an item, returning whatever came off to the inventory.
 *
 * Worn items leave the inventory. Unlike the bench — where taking the item
 * out made crafting look destructive — equipping has somewhere obvious to
 * show it, so the character sheet IS where that item now lives.
 */
export function equipItem(game: GameState, item: Item, slotId: string): boolean {
  const slot = EQUIP_SLOTS.find((s) => s.id === slotId);
  if (!slot || !fitsSlot(item, slot)) return false;

  const previous = game.character.equipment[slotId];
  if (!removeItem(game, item)) return false;
  if (previous) addItem(game, previous);

  game.character.equipment[slotId] = item;
  return true;
}

export function unequipItem(game: GameState, slotId: string): boolean {
  const worn = game.character.equipment[slotId];
  if (!worn) return false;
  delete game.character.equipment[slotId];
  addItem(game, worn);
  return true;
}

/** The first empty slot this item fits, else the first it fits at all. */
export function slotFor(game: GameState, item: Item): string | null {
  const fitting = EQUIP_SLOTS.filter((s) => fitsSlot(item, s));
  if (fitting.length === 0) return null;
  const empty = fitting.find((s) => !game.character.equipment[s.id]);
  return (empty ?? fitting[0]).id;
}
