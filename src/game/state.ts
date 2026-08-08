/**
 * The whole game, in one object — and the whole save, since `game/save.ts` is
 * `JSON.stringify(game)` plus a `version` check. Everything in here has to stay
 * plain data, and `SAVE_VERSION` has to move whenever the shape does: a save
 * from another version is refused rather than half-read.
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
 * What you can carry, per kind. The dock draws exactly this many and never
 * scrolls, so the limit is visible rather than discovered. Four rows each.
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
 * The next block of stash space, or null when there is no more. Steep: every
 * fragment spent here is a crystal not bought, so storage is a real decision.
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
  /** Nothing acts on a stashed item until you carry it again. */
  stash: Item[];
  /** How big the stash currently is. Bought up with fragments. */
  stashSlots: number;
  character: Character;
  /**
   * The inventory item open for crafting. A REFERENCE, not a move: it stays in
   * the list, highlighted, and returning it is just dropping the reference.
   */
  craftId: string | null;
  /** False until a skill has been chosen on the first run. */
  onboarded: boolean;
  /** False until the Fissure has been cleared once. Gates the opening payout. */
  firstClearDone: boolean;
  /** Index into the guided steps, or null when not running / finished. */
  tutorialStep: number | null;
  /**
   * The shelf, and the level it stocked for. Stored, not generated on open: one
   * you re-roll by closing the window is deterministic with extra clicks.
   */
  shopStock: Item[];
  shopLevel: number;
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
    shopStock: [],
    shopLevel: 0,
  };
  resetGame(game, mode);
  return game;
}

/** IN PLACE: every view captured this object at init. */
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
  // Zero, not the character's level, so the next open restocks rather than
  // showing whatever the previous game happened to be carrying.
  game.shopStock = [];
  game.shopLevel = 0;
}

/** Granted once, on the first cleared descent. Returns what it gave. */
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
 * Bags first, then the stash, then nowhere. Every caller must report what this
 * returned: loot that silently fails to arrive reads as a bug, and you would
 * never learn the thing to do was clear some space.
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
  return true;
}

export function findItem(game: GameState, id: string): Item | undefined {
  return game.inventory.find((i) => i.id === id);
}

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

/** Here rather than in the shop: the stash tab is where you find out you need it. */
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

export const wornItems = (game: GameState): Item[] =>
  EQUIP_SLOTS.map((s) => game.character.equipment[s.id]).filter((i): i is Item => !!i);

/** Carried or worn. The bench takes both, so it looks in both. */
export function findAnywhere(game: GameState, id: string): Item | undefined {
  return findItem(game, id) ?? wornItems(game).find((i) => i.id === id);
}

/**
 * The item crafting is working on: a reference that resolves or does not,
 * rather than an id something has to remember to clear.
 */
export function craftItem(game: GameState): Item | null {
  if (!game.craftId) return null;
  return findAnywhere(game, game.craftId) ?? null;
}

/** Moves a carried item just before `before`, or last when that is null. */
export function reorderItem(game: GameState, item: Item, before: Item | null): void {
  const from = game.inventory.findIndex((i) => i.id === item.id);
  if (from < 0 || item.id === before?.id) return;
  game.inventory.splice(from, 1);
  const to = before ? game.inventory.findIndex((i) => i.id === before.id) : -1;
  if (to < 0) game.inventory.push(item);
  else game.inventory.splice(to, 0, item);
}

export function selectForCraft(game: GameState, item: Item): void {
  game.craftId = item.id;
}

export function clearCraft(game: GameState): void {
  game.craftId = null;
}

/** craft() returns a new object with the same id, so position and selection survive. */
export function replaceItem(game: GameState, item: Item): void {
  const slot = EQUIP_SLOTS.find((s) => game.character.equipment[s.id]?.id === item.id);
  if (slot) {
    game.character.equipment[slot.id] = item;
    return;
  }
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

/** Puts an equip back. False once the slot holds something chosen since. */
export type Undo = () => boolean;

/** Worn items leave the inventory: the character sheet is where they now live. */
export function equipItem(game: GameState, item: Item, slotId: string): Undo | null {
  const slot = EQUIP_SLOTS.find((s) => s.id === slotId);
  if (!slot || !fitsSlot(item, slot)) return null;

  const previous = game.character.equipment[slotId] ?? null;
  // Where it sat, so undo restores rather than appends. Removing first
  // guarantees room, so what comes off is carried, never stashed.
  const at = game.inventory.indexOf(item);
  if (!removeItem(game, item)) return null;
  if (previous) addItem(game, previous);
  game.character.equipment[slotId] = item;

  return () => {
    if (game.character.equipment[slotId] !== item) return false;
    delete game.character.equipment[slotId];
    if (previous) removeItem(game, previous);
    game.inventory.splice(Math.min(Math.max(at, 0), game.inventory.length), 0, item);
    if (previous) game.character.equipment[slotId] = previous;
    return true;
  };
}

/**
 * Refuses when there is nowhere to put it. Unequipping is a net addition to the
 * bag, and a helmet that vanishes is the worst version of a carry limit.
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
