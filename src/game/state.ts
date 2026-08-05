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
import {
  STARTING_CRYSTALS,
  STARTING_CURRENCY,
  STARTING_FRAGMENTS,
  STARTING_GEAR,
} from '../data';
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
}

export function createGame(): GameState {
  const wallet: Wallet = {};
  grant(wallet, 'fragment', STARTING_FRAGMENTS);
  for (const [id, n] of Object.entries(STARTING_CURRENCY)) grant(wallet, id, n);

  const inventory: Item[] = [
    ...STARTING_CRYSTALS.map((tier) => makeCrystal(tier)),
    ...STARTING_GEAR.map((g) => makeGear(g.base, g.ilvl, g.name)),
  ];

  return {
    version: SAVE_VERSION,
    wallet,
    inventory,
    character: makeCharacter(starterLoadout(new Rng(1)), 'strike'),
    benchId: null,
  };
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
