/**
 * The whole game, in one object — and the whole save, since `game/save.ts` is
 * `JSON.stringify(game)` plus a `version` check. Everything here stays plain
 * data. `SAVE_VERSION` moves only for a change `heal()` cannot repair, since
 * moving it wipes everyone's game.
 */
import { Rng } from '../rng';
import {
  CRYSTAL_QUESTS,
  EQUIP_SLOTS,
  FISSURE,
  RUN_SLOTS,
  SKILL_BY_ID,
  START_PRESETS,
  CRYSTAL_ILVL,
  UNIQUE_BY_ID,
  starterWeapon,
} from '../data';
import type { EquipSlotDef, RunSlotDef } from '../types';
import { canSell, grant, makeCrystal, makeGear, makeUnique, sellPrice } from '../economy';
import { baseTier } from '../mods';
import { makeCharacter } from '../sim/character';
import { starterLoadout } from '../sim/loadout';
import type { Character } from '../sim/character';
import type { Item, ItemKind, Wallet } from '../types';

export const SAVE_VERSION = 1;

/**
 * What you can carry. The dock draws exactly this many and never scrolls, so
 * the limit is visible rather than discovered. Crystals are not in here: they
 * are never spent, sold or carried, so a container for them is triage with
 * nothing to triage, and `GameState.crystals` takes every one uncapped.
 */
export const CARRY: Record<'gear', number> = {
  gear: 32,
};

/**
 * Bigger than either bag: a night's work waiting to be sorted. Read BETWEEN
 * runs, so it overflows by one descent rather than splitting a run's drops.
 */
export const HAUL_CAP = 48;

/** Sales the counter remembers — about one triage's worth. */
export const SOLD_CAP = 12;

/** Stash slots you start with. */
export const STASH_START = 12;
/** Slots one purchase adds. */
export const STASH_STEP = 6;
/** Where buying more stops. */
export const STASH_MAX = 60;

/** The next block of stash space, or null at the top. Steep: gold spent on
 *  storage is gold not spent at the bench. */
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
  /** Every crystal you own that is not socketed. Uncapped, and never gear. */
  crystals: Item[];
  /** A cleared run's loot. Inert as the stash is: take it out to use it. */
  haul: Item[];
  /** How big the stash currently is. Bought up with gold. */
  stashSlots: number;
  character: Character;
  /**
   * Crystals socketed into the Fissure, by slot id. PERMANENT — a run reads
   * them and never spends them, so what is in here is a standing choice rather
   * than a stake. Held like worn gear: the item lives here, not in the bag.
   */
  sockets: Record<string, Item>;
  /**
   * The inventory item open for crafting. A REFERENCE, not a move: it stays in
   * the list, highlighted, and returning it is just dropping the reference.
   */
  craftId: string | null;
  /** False until a skill has been chosen on the first run. */
  onboarded: boolean;
  /** False until the Fissure has been cleared once. Gates the opening payout. */
  firstClearDone: boolean;
  /** What the Lampwright has already handed over. `giftWaiting` reads it. */
  given: string[];
  /** Index into the guided steps, or null when not running / finished. */
  tutorialStep: number | null;
  /** Quest ids already paid out. What is not in here is still open. */
  quests: string[];
  /** What you sold, newest first, each at what it paid. Buying one back costs
   *  the same, so the counter can never mint or eat gold. */
  sold: SoldEntry[];
  /** Stored, not rolled on open: one you re-roll by closing is not a choice. */
  shopStock: Item[];
  shopLevel: number;
  /** Whether a cleared descent launches the next one by itself. */
  autoRepeat: boolean;
}

export interface SoldEntry {
  item: Item;
  price: number;
}

export type StartMode = 'fresh' | 'dev';

export function createGame(mode: StartMode = 'dev'): GameState {
  const game: GameState = {
    version: SAVE_VERSION,
    wallet: {},
    inventory: [],
    stash: [],
    crystals: [],
    haul: [],
    stashSlots: STASH_START,
    character: makeCharacter({}, 'strike'),
    sockets: {},
    craftId: null,
    onboarded: false,
    firstClearDone: false,
    given: [],
    tutorialStep: null,
    quests: [],
    sold: [],
    shopStock: [],
    shopLevel: 0,
    autoRepeat: true,
  };
  resetGame(game, mode);
  return game;
}

/** IN PLACE: every view captured this object at init. */
export function resetGame(game: GameState, mode: StartMode): void {
  const preset = START_PRESETS[mode];

  game.wallet = {};
  grant(game.wallet, 'gold', preset.gold);
  for (const [id, n] of Object.entries(preset.currency)) grant(game.wallet, id, n);

  game.inventory = preset.gear.map((g) => makeGear(g.base, g.ilvl));
  const rng = new Rng(7);
  for (const id of preset.uniques ?? []) {
    const def = UNIQUE_BY_ID[id];
    if (def) game.inventory.push(makeUnique(def, CRYSTAL_ILVL, rng));
  }
  game.crystals = preset.crystals.map((c) => makeCrystal(c.level, c.family));
  game.stash = [];
  game.haul = [];
  game.stashSlots = STASH_START;
  game.autoRepeat = true;

  // The dev preset wears a rolled set, so the stat pipeline has something in it.
  game.character = makeCharacter(
    preset.equipped ? starterLoadout(new Rng(1)) : {},
    'strike'
  );
  game.sockets = {};
  game.craftId = null;

  // A fresh game asks which skill you want; the dev kit assumes you know.
  game.onboarded = mode === 'dev';
  game.firstClearDone = mode === 'dev';
  // The dev kit is armed and holds every crystal: nothing waits at the mouth.
  game.given = mode === 'dev' ? ['weapon', 'crystal'] : [];
  game.tutorialStep = null;
  // The dev kit is handed every crystal in the game, so its quests are already
  // answered — left open, the first dangerous descent pays out four duplicates.
  game.quests = mode === 'dev' ? CRYSTAL_QUESTS.map((q) => q.id) : [];
  game.sold = [];
  // Zero, not the character's level, so the next open restocks rather than
  // showing whatever the previous game happened to be carrying.
  game.shopStock = [];
  game.shopLevel = 0;
}

/** Granted once, on the first cleared descent. Returns what it gave. */
export function grantFirstClear(game: GameState): {
  gold: number;
  currency: Record<string, number>;
} | null {
  if (game.firstClearDone) return null;
  game.firstClearDone = true;

  const gift = FISSURE.firstClear;
  grant(game.wallet, 'gold', gift.gold);
  for (const [id, n] of Object.entries(gift.currency)) grant(game.wallet, id, n);

  // No weapon here: `lampwrightWeapon` is where one is put in your hands.
  return { gold: gift.gold, currency: gift.currency };
}

/** The first weapon, picked off the SKILL. Marked, because the guided opening
 *  rings this piece and every looser reading let a drop satisfy the step. */
export function lampwrightWeapon(game: GameState): { item: Item; where: GiftPlace } | null {
  const base = starterWeapon(SKILL_BY_ID[game.character.skillId]);
  if (!base) return null;
  const item = makeGear(base, 1);
  item.meta.firstClear = true;
  return { item, where: giveGift(game, item) };
}

export const carried = (game: GameState, kind: ItemKind): Item[] =>
  kind === 'crystal' ? (game.crystals ?? []) : game.inventory.filter((i) => i.kind === kind);

export const carryRoom = (game: GameState, kind: ItemKind): number =>
  kind === 'crystal' ? Infinity : CARRY.gear - carried(game, 'gear').length;

export const stashRoom = (game: GameState): number =>
  game.stashSlots - game.stash.length;

/** Where an item ended up. */
export type Placement = 'carried' | 'stashed' | 'lost';

/**
 * Bags first, then the stash, then nowhere. Every caller must report what this
 * returned: loot that silently fails to arrive reads as a bug.
 */
export function addItem(game: GameState, item: Item): Placement {
  if (item.kind === 'crystal') {
    game.crystals.push(item);
    return 'carried';
  }
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

/** Where a gift landed. No 'lost': see giveGift. */
export type GiftPlace = 'carried' | 'stashed' | 'hauled';

/**
 * A gift refuses nowhere. Bags, then the stash, then the haul — which takes
 * anything — so what you were handed is never quietly dropped.
 */
export function giveGift(game: GameState, item: Item): GiftPlace {
  const where = addItem(game, item);
  if (where !== 'lost') return where;
  bankToHaul(game, [item]);
  return 'hauled';
}

function takeFrom(list: Item[], item: Item): boolean {
  const i = list.indexOf(item);
  if (i < 0) return false;
  list.splice(i, 1);
  return true;
}

export function removeItem(game: GameState, item: Item): boolean {
  if (item.kind === 'crystal') return takeFrom(game.crystals, item);
  return takeFrom(game.inventory, item);
}

export const haulRoom = (game: GameState): number => HAUL_CAP - game.haul.length;

/** At or over. Over is legal — a run's drops are never split to fit. */
export const haulFull = (game: GameState): boolean => haulRoom(game) <= 0;

/** A cleared run's loot, banked whole. Nothing is refused and nothing is lost. */
export function bankToHaul(game: GameState, items: Item[]): void {
  game.haul.push(...items);
}

/** Haul → carried. Fails when that kind's bag is full, the same as the stash. */
export function fromHaul(game: GameState, item: Item): boolean {
  if (carryRoom(game, item.kind) <= 0) return false;
  if (!takeFrom(game.haul, item)) return false;
  game.inventory.push(item);
  return true;
}

/** Haul → stashed, skipping the bag: triage should not need a spare slot. */
export function haulToStash(game: GameState, item: Item): boolean {
  if (stashRoom(game) <= 0) return false;
  if (!takeFrom(game.haul, item)) return false;
  game.stash.push(item);
  return true;
}

/** As many as the bags will take, oldest first. Reports what actually moved. */
export function takeWhatFits(game: GameState): number {
  let moved = 0;
  for (const item of [...game.haul]) {
    if (fromHaul(game, item)) moved++;
  }
  return moved;
}

export function findItem(game: GameState, id: string): Item | undefined {
  return game.inventory.find((i) => i.id === id) ?? game.crystals?.find((i) => i.id === id);
}

/**
 * Gear → gold, from the bag or the haul. A sale needs no room anywhere, which
 * is the way out of a full haul on top of full bags: the loop cannot wedge.
 */
export function sellItem(game: GameState, item: Item): number {
  if (!canSell(item)) return 0;
  const paid = sellPrice(item);
  if (!takeFrom(game.inventory, item) && !takeFrom(game.haul, item)) return 0;
  grant(game.wallet, 'gold', paid);
  game.sold = [{ item, price: paid }, ...(game.sold ?? [])].slice(0, SOLD_CAP);
  return paid;
}

/**
 * Off the counter, at what it sold for. Room is needed HERE and only here,
 * because this is a purchase — selling still needs room nowhere, which is
 * what stops a full haul wedging the loop.
 */
export function buyBack(game: GameState, entry: SoldEntry): { ok: boolean; error?: string } {
  const at = (game.sold ?? []).indexOf(entry);
  if (at < 0) return { ok: false, error: 'it is no longer on the counter' };
  if ((game.wallet.gold ?? 0) < entry.price) {
    return { ok: false, error: `costs ${entry.price} gold` };
  }
  if (carryRoom(game, entry.item.kind) <= 0 && stashRoom(game) <= 0) {
    return { ok: false, error: 'your bag and stash are both full' };
  }
  game.sold.splice(at, 1);
  game.wallet.gold = (game.wallet.gold ?? 0) - entry.price;
  addItem(game, entry.item);
  return { ok: true };
}

/** Gear with nothing rolled on it: the heap you can clear without reading it.
 *  A named piece rolls nothing and is never in it — the bulk button exists
 *  because it cannot eat a decision, and a unique is only a decision. */
export const plainGear = (items: Item[]): Item[] =>
  items.filter((i) => i.kind === 'gear' && i.mods.length === 0 && i.meta.unique === undefined);

/** Sells a list in one go. Reports the total, since the wallet only shows a sum. */
export function sellAll(game: GameState, items: Item[]): { count: number; gold: number } {
  let count = 0;
  let gold = 0;
  for (const item of [...items]) {
    const paid = sellItem(game, item);
    if (paid <= 0) continue;
    count++;
    gold += paid;
  }
  return { count, gold };
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
  if ((game.wallet.gold ?? 0) < cost) {
    return { ok: false, error: `costs ${cost} gold` };
  }
  game.wallet.gold = (game.wallet.gold ?? 0) - cost;
  game.stashSlots = Math.min(STASH_MAX, game.stashSlots + STASH_STEP);
  return { ok: true };
}

/** The wand the Fissure hands you, wherever it has ended up. */
export const giftWeapon = (game: GameState): Item | undefined =>
  [...game.inventory, ...wornItems(game), ...game.stash].find((i) => i.meta.firstClear === true);

export const wornItems = (game: GameState): Item[] =>
  EQUIP_SLOTS.map((s) => game.character.equipment[s.id]).filter((i): i is Item => !!i);

/** Carried, worn or socketed. The bench takes all three, so it looks in all three. */
export function findAnywhere(game: GameState, id: string): Item | undefined {
  return (
    findItem(game, id) ??
    wornItems(game).find((i) => i.id === id) ??
    socketed(game).find((i) => i.id === id)
  );
}

/**
 * The item crafting is working on: a reference that resolves or does not,
 * rather than an id something has to remember to clear.
 */
export function craftItem(game: GameState): Item | null {
  if (!game.craftId) return null;
  return findAnywhere(game, game.craftId) ?? null;
}

/** Grouped by slot, best first inside a group. IN PLACE, so a sort is part of
 *  the save. By SLOT: "all the boots together" is what scanning the dock asks. */
export function sortInventory(game: GameState): void {
  const rank = (i: Item) => {
    const at = EQUIP_SLOTS.findIndex((s) => s.accepts === gearKindOf(i));
    return at < 0 ? EQUIP_SLOTS.length : at;
  };
  game.inventory.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      baseTier(b) - baseTier(a) ||
      b.mods.length - a.mods.length ||
      a.name.localeCompare(b.name)
  );
}

/**
 * Exchanges two carried items' places. A swap rather than an insert-before,
 * which puts an item back where it started when you drop it on its neighbour.
 */
export function swapItems(game: GameState, a: Item, b: Item): void {
  const i = game.inventory.findIndex((x) => x.id === a.id);
  const j = game.inventory.findIndex((x) => x.id === b.id);
  if (i < 0 || j < 0 || i === j) return;
  game.inventory[i] = b;
  game.inventory[j] = a;
}

/** The list is packed, so an empty slot means the end. */
export function sendToEnd(game: GameState, item: Item): void {
  const from = game.inventory.findIndex((i) => i.id === item.id);
  if (from < 0) return;
  game.inventory.splice(from, 1);
  game.inventory.push(item);
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
  const socket = RUN_SLOTS.find((s) => game.sockets[s.id]?.id === item.id);
  if (socket) {
    game.sockets[socket.id] = item;
    return;
  }
  const list = item.kind === 'crystal' ? game.crystals : game.inventory;
  const i = list.findIndex((existing) => existing.id === item.id);
  if (i < 0) list.push(item);
  else list[i] = item;
}

export const crystalsIn = (game: GameState): Item[] => game.crystals ?? [];

/** In slot order, so the set reads the same way it is drawn. */
export const socketed = (game: GameState): Item[] =>
  RUN_SLOTS.map((s) => game.sockets[s.id]).filter((i): i is Item => !!i);

export function fitsSocket(item: Item, slot: RunSlotDef): boolean {
  return item.kind === slot.accepts;
}

/** The first empty socket this item fits, else the first it fits at all. */
export function socketFor(game: GameState, item: Item): string | null {
  const fitting = RUN_SLOTS.filter((s) => fitsSocket(item, s));
  if (fitting.length === 0) return null;
  return (fitting.find((s) => !game.sockets[s.id]) ?? fitting[0]).id;
}

/** Collection → socket. Socketing is a MOVE, the same way wearing a helmet is. */
export function socketItem(game: GameState, item: Item, slotId: string): boolean {
  const slot = RUN_SLOTS.find((s) => s.id === slotId);
  if (!slot || !fitsSocket(item, slot)) return false;
  const previous = game.sockets[slotId] ?? null;
  if (!removeItem(game, item)) return false;
  if (previous) addItem(game, previous);
  game.sockets[slotId] = item;
  return true;
}

export function unsocket(game: GameState, slotId: string): boolean {
  const held = game.sockets[slotId];
  if (!held) return false;
  delete game.sockets[slotId];
  addItem(game, held);
  return true;
}

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
  // Removing first guarantees room, so what comes off is carried, never stashed.
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
