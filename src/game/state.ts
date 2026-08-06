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
import { EQUIP_SLOTS, FISSURE, START_PRESETS } from '../data';
import type { EquipSlotDef } from '../types';
import { grant, makeCrystal, makeGear } from '../economy';
import { makeCharacter } from '../sim/character';
import { starterLoadout } from '../sim/loadout';
import type { Character } from '../sim/character';
import type { Item, ItemKind, Wallet } from '../types';

export const SAVE_VERSION = 1;

/**
 * What you can carry, per kind.
 *
 * The dock used to scroll, which made capacity invisible: a hoard of ninety
 * crystals looked exactly like a hoard of twelve, so "what do I keep" was
 * never a question anyone had to answer. Every carried item is on screen now,
 * and these are the numbers that make that true — the dock draws exactly this
 * many slots and never scrolls, so the limit is a thing you can see rather
 * than a thing you discover.
 *
 * Four rows each, which is where the two-column grid stops eating the map.
 */
export const CARRY: Record<ItemKind, number> = {
  crystal: 32,
  gear: 32,
};

/** Stash slots you start with. */
export const STASH_START = 12;
/** Slots one purchase adds. */
export const STASH_STEP = 6;
/** Where buying more stops. */
export const STASH_MAX = 60;

/**
 * What the next block of stash space costs, or null when there is no more.
 *
 * Steep on purpose. Fragments are the one contested resource — every fragment
 * spent here is a crystal not bought — so storage has to be a real decision
 * rather than a formality you clear on the second clear. The fourth purchase
 * costs about as much as a Tier 5 crystal.
 */
export function stashUpgradeCost(slots: number): number | null {
  if (slots >= STASH_MAX) return null;
  const bought = Math.max(0, Math.round((slots - STASH_START) / STASH_STEP));
  return Math.round(40 * Math.pow(1.6, bought));
}

export interface GameState {
  version: number;
  wallet: Wallet;
  inventory: Item[];
  /**
   * Long-term storage. Nothing acts on a stashed item — it cannot be crafted,
   * socketed or worn until you carry it again, which is what makes the carry
   * limit mean anything.
   */
  stash: Item[];
  /** How big the stash currently is. Bought up with fragments. */
  stashSlots: number;
  character: Character;
  /**
   * Id of the inventory item currently open for crafting.
   *
   * A reference, not a move. Crafting used to take the item OUT of the
   * inventory, which made it look like crafting had eaten it — the thing you
   * were working on vanished from the list. Selecting in place means it stays
   * visible and highlighted, and "returning" it is just dropping the
   * reference.
   */
  craftId: string | null;
  /** False until a skill has been chosen on the first run. */
  onboarded: boolean;
  /** False until the Fissure has been cleared once. Gates the opening payout. */
  firstClearDone: boolean;
  /** Index into the guided steps, or null when not running / finished. */
  tutorialStep: number | null;
}

export type StartMode = 'fresh' | 'dev';

export function createGame(mode: StartMode = 'dev'): GameState {
  const game: GameState = {
    version: SAVE_VERSION,
    wallet: {},
    inventory: [],
    stash: [],
    stashSlots: STASH_START,
    character: makeCharacter({}, 'strike'),
    craftId: null,
    onboarded: false,
    firstClearDone: false,
    tutorialStep: null,
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
  game.stash = [];
  game.stashSlots = STASH_START;

  // A fresh character owns nothing and has worn nothing. The dev preset wears
  // a rolled set so the sheet and the stat pipeline have something in them.
  game.character = makeCharacter(
    preset.equipped ? starterLoadout(new Rng(1)) : {},
    'strike'
  );
  game.craftId = null;

  // A fresh game asks which skill you want; the dev kit assumes you know.
  game.onboarded = mode === 'dev';
  game.firstClearDone = mode === 'dev';
  game.tutorialStep = null;
}

/**
 * The opening payout, granted once, on the first cleared descent.
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

  const gift = FISSURE.firstClear;
  grant(game.wallet, 'fragment', gift.fragments);
  for (const [id, n] of Object.entries(gift.currency)) grant(game.wallet, id, n);

  const weapon = makeGear(gift.weapon, 1);
  addItem(game, weapon);

  return { fragments: gift.fragments, currency: gift.currency, weapon };
}

export const carried = (game: GameState, kind: ItemKind): Item[] =>
  game.inventory.filter((i) => i.kind === kind);

export const carryRoom = (game: GameState, kind: ItemKind): number =>
  CARRY[kind] - carried(game, kind).length;

export const stashRoom = (game: GameState): number =>
  game.stashSlots - game.stash.length;

/** Where an item ended up. */
export type Placement = 'carried' | 'stashed' | 'lost';

/**
 * Put an item somewhere, in the order you'd want it.
 *
 * Bags first, then the stash, then nowhere. The last case is the one that
 * matters: a full bag and a full stash means loot you earned is gone, and it
 * has to be SAID — an item that silently fails to arrive reads as a bug, and
 * you'd never learn that the thing to do was clear some space first. Every
 * caller reports what this returned.
 */
export function addItem(game: GameState, item: Item): Placement {
  if (carryRoom(game, item.kind) > 0) {
    game.inventory.push(item);
    return 'carried';
  }
  if (stashRoom(game) > 0) {
    game.stash.push(item);
    return 'stashed';
  }
  return 'lost';
}

export function removeItem(game: GameState, item: Item): boolean {
  const i = game.inventory.indexOf(item);
  if (i < 0) return false;
  game.inventory.splice(i, 1);
  if (game.craftId === item.id) game.craftId = null;
  return true;
}

export function findItem(game: GameState, id: string): Item | undefined {
  return game.inventory.find((i) => i.id === id);
}

// ---------------------------------------------------------------------------
// The stash
// ---------------------------------------------------------------------------

/** Carried → stashed. Fails when the stash is full. */
export function toStash(game: GameState, item: Item): boolean {
  if (stashRoom(game) <= 0) return false;
  if (!removeItem(game, item)) return false;
  game.stash.push(item);
  return true;
}

/** Stashed → carried. Fails when that kind's bag is full. */
export function fromStash(game: GameState, item: Item): boolean {
  const i = game.stash.indexOf(item);
  if (i < 0) return false;
  if (carryRoom(game, item.kind) <= 0) return false;
  game.stash.splice(i, 1);
  game.inventory.push(item);
  return true;
}

/**
 * Buy the next block of stash space.
 *
 * Lives here rather than in the shop because it changes the SHAPE of storage
 * rather than adding to it — and because the stash tab is where you find out
 * you need it.
 */
export function buyStashSpace(game: GameState): { ok: boolean; error?: string } {
  const cost = stashUpgradeCost(game.stashSlots);
  if (cost === null) return { ok: false, error: 'the stash is as large as it goes' };
  if ((game.wallet.fragment ?? 0) < cost) {
    return { ok: false, error: `costs ${cost} fragments` };
  }
  game.wallet.fragment = (game.wallet.fragment ?? 0) - cost;
  game.stashSlots = Math.min(STASH_MAX, game.stashSlots + STASH_STEP);
  return { ok: true };
}

/** The item crafting is working on, or null. */
export function craftItem(game: GameState): Item | null {
  if (!game.craftId) return null;
  return findItem(game, game.craftId) ?? null;
}

export function selectForCraft(game: GameState, item: Item): void {
  game.craftId = item.id;
}

export function clearCraft(game: GameState): void {
  game.craftId = null;
}

/**
 * Swaps a crafted result back into the inventory in place.
 * craft() returns a new object but preserves the id, so position is kept and
 * the crafting selection survives.
 */
export function replaceItem(game: GameState, item: Item): void {
  const i = game.inventory.findIndex((existing) => existing.id === item.id);
  if (i < 0) game.inventory.push(item);
  else game.inventory[i] = item;
}

export const crystalsIn = (game: GameState): Item[] => carried(game, 'crystal');

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
 * Worn items leave the inventory. Unlike crafting — where taking the item
 * out made crafting look destructive — equipping has somewhere obvious to
 * show it, so the character sheet IS where that item now lives.
 */
export function equipItem(game: GameState, item: Item, slotId: string): boolean {
  const slot = EQUIP_SLOTS.find((s) => s.id === slotId);
  if (!slot || !fitsSlot(item, slot)) return false;

  const previous = game.character.equipment[slotId];
  if (!removeItem(game, item)) return false;
  if (previous) addItem(game, previous);

  // Worn items leave the inventory, and crafting works on inventory items.
  // A stale craftId would leave the bench displaying something you're now
  // wearing, with every currency in the dock live against it.
  if (game.craftId === item.id) game.craftId = null;

  game.character.equipment[slotId] = item;
  return true;
}

/**
 * Take something off.
 *
 * Refuses when there is nowhere to put it, rather than taking it off and
 * letting addItem fall through to the stash or to nothing. Equipping is safe
 * without this check — it removes the incoming item before returning the
 * outgoing one, so the count never rises — but taking something off is a net
 * addition, and a helmet that vanishes on unequip is the worst version of a
 * carry limit.
 */
export function unequipItem(game: GameState, slotId: string): boolean {
  const worn = game.character.equipment[slotId];
  if (!worn) return false;
  if (carryRoom(game, worn.kind) <= 0) return false;
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
