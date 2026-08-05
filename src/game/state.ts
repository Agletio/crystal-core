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
  /** The item currently on the crafting bench, pulled out of the inventory. */
  bench: Item | null;
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
    bench: null,
  };
}

export function addItem(game: GameState, item: Item): void {
  game.inventory.push(item);
}

export function removeItem(game: GameState, item: Item): boolean {
  const i = game.inventory.indexOf(item);
  if (i < 0) return false;
  game.inventory.splice(i, 1);
  return true;
}

export function findItem(game: GameState, id: string): Item | undefined {
  return game.inventory.find((i) => i.id === id);
}

/** Moves an item from the inventory onto the bench, returning whatever was there. */
export function putOnBench(game: GameState, item: Item): void {
  if (!removeItem(game, item)) return;
  if (game.bench) addItem(game, game.bench);
  game.bench = item;
}

export function clearBench(game: GameState): void {
  if (!game.bench) return;
  addItem(game, game.bench);
  game.bench = null;
}

export const crystalsIn = (game: GameState): Item[] =>
  game.inventory.filter((i) => i.kind === 'crystal');
