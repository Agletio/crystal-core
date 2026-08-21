/**
 * The whole game, in one object — and the whole save, since `game/save.ts` is
 * `JSON.stringify(game)` plus a `version` check. Everything here stays plain
 * data. `SAVE_VERSION` moves only for a change `heal()` cannot repair, since
 * moving it wipes everyone's game.
 */
import { Rng } from '../rng';
import {
  BOSSES,
  CRYSTAL_QUESTS,
  EQUIP_SLOTS,
  FISSURE,
  GEAR_BASE_BY_ID,
  RELIC_BY_ID,
  RUN_SLOTS,
  SKILL_BY_ID,
  WEAPON_SLOT,
  START_PRESETS,
  TRIALS,
  CRYSTAL_ILVL,
  UNIQUE_BY_ID,
  keepGroupFor,
  starterWeapon,
  tierKeepId,
} from '../data';
import type { EquipSlotDef, RunSlotDef } from '../types';
import { canSell, grant, makeCrystal, makeGear, makeRelic, makeUnique, sellPrice } from '../economy';
import { baseTier } from '../mods';
import { equippedSkill, mainSkillId, makeCharacter } from '../sim/character';
import { starterLoadout } from '../sim/loadout';
import type { Character } from '../sim/character';
import type { Item, ItemKind, Wallet } from '../types';

export const SAVE_VERSION = 1;

/** What you can carry. The dock draws exactly this many and never scrolls, so
 *  the limit is visible rather than discovered. Crystals are not in here: one
 *  is never spent, sold or carried, and `GameState.crystals` takes every one. */
export const CARRY: Record<'gear', number> = {
  gear: 32,
};

/** What shuts the Fissure. Read BETWEEN runs and never during one, so a
 *  descent's drops arrive whole and the bag ends a floor slightly over. */
export const bagsFull = (game: GameState): boolean =>
  carried(game, 'gear').length >= CARRY.gear;

/** Sales the counter remembers — about one triage's worth. */
export const SOLD_CAP = 12;

export const STASH_START = 12; // stash slots you start with
export const STASH_STEP = 6; // slots one purchase adds
export const STASH_MAX = 60; // where buying more stops

/** The next block, or null at the top. Steep: storage is gold not spent. */
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
  /** What you are carrying to a PERSON. Uncapped for the reason crystals are:
   *  nothing sells one, so a cap could only lose loot. */
  relics: Item[];
  /**
   * What the auto-sell filter turns into gold on the way up: `KEEP_GROUPS` ids
   * and `tierKeepId` rungs in ONE list. Stored as what is SOLD rather than what
   * is kept, so an empty list — a fresh game, or a save written before any of
   * this — keeps everything and the filter starts doing nothing.
   */
  junk: string[];
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
  /** Descents cleared, ever. What the opening's schedule is measured in. */
  clears: number;
  /** What the Lampwright has already handed over. `giftWaiting` reads it. */
  given: string[];
  /** Quest ids already paid out. What is not in here is still open. */
  quests: string[];
  /** What you sold, newest first, each at what it paid. Buying one back costs
   *  the same, so the counter can never mint or eat gold. */
  sold: SoldEntry[];
  /** Stored, not rolled on open: one you re-roll by closing is not a choice. */
  shopStock: Item[];
  shopLevel: number;
  /** Key overrides by binding id; a missing one takes the table's default. */
  keys: Record<string, string>;
  /** Share of a pool a potion fires at, by id. Charges are `RunState`'s. */
  potions: Record<string, number>;
  /** Panels away, map alone. A preference like `keys`, so a wipe keeps it. */
  parked: boolean;
  bosses: string[]; // put down: stops one being scheduled twice, opens its key
  called: string | null; // a fight a socketed key has paid for: the next entry is it
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
    relics: [],
    junk: [],
    stashSlots: STASH_START,
    character: makeCharacter({}, 'strike'),
    sockets: {},
    craftId: null,
    onboarded: false,
    firstClearDone: false,
    clears: 0,
    given: [],
    quests: [],
    sold: [],
    shopStock: [],
    shopLevel: 0,
    keys: {},
    potions: {},
    parked: false,
    bosses: [],
    called: null,
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

  const plain = preset.gear.map((g) => makeGear(g.base, g.ilvl));
  const rng = new Rng(7);
  const named: Item[] = [];
  for (const id of preset.uniques ?? []) {
    const def = UNIQUE_BY_ID[id];
    if (def) named.push(makeUnique(def, CRYSTAL_ILVL, rng));
  }
  // Overflow to the STASH, keeping TWO slots: a kit that fills the bag cannot
  // enter the Fissure, and a two-hander puts the off hand back in it — so one
  // spare slot is one equip away from locked out. A BASE gives way, never a
  // unique, and the bases keep the FRONT: a unique holds nothing to craft on.
  const room = Math.max(0, CARRY.gear - 2 - named.length);
  const stocked = [...plain.slice(0, room), ...named];
  game.inventory = stocked;
  game.crystals = preset.crystals.map((c) => makeCrystal(c.level, c.family));
  game.relics = (preset.relics ?? []).map((id) => makeRelic(RELIC_BY_ID[id]!));
  game.stash = plain.slice(room);
  game.junk = [];
  game.stashSlots = Math.max(STASH_START, game.stash.length);

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
  game.clears = mode === 'dev' ? 1 : 0; // the same descent `firstClearDone` is
  // The dev kit is armed and holds every crystal: nothing waits at the mouth.
  game.given = mode === 'dev' ? ['weapon', 'crystal'] : [];
  // The dev kit is handed every crystal in the game, so its quests are already
  // answered — left open, the first dangerous descent pays out four duplicates.
  game.quests = mode === 'dev' ? CRYSTAL_QUESTS.map((q) => q.id) : [];
  game.bosses = mode === 'dev' ? BOSSES.map((b) => b.id) : []; // handed the door too
  // Every trial done, so the whole web is walkable: a screen nobody can reach
  // holding points nobody has is a screen nobody tested.
  game.character.trials = mode === 'dev' ? TRIALS.map((t) => t.id) : [];
  game.called = null;
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
  const base = starterWeapon(SKILL_BY_ID[mainSkillId(game.character)]);
  if (!base) return null;
  const item = makeGear(base, 1);
  item.meta.firstClear = true;
  const where = giveGift(game, item);
  // Only an empty hand: a later gift never takes off what you chose.
  if (!game.character.equipment[WEAPON_SLOT]) equipItem(game, item, WEAPON_SLOT);
  return { item, where };
}

export const carried = (game: GameState, kind: ItemKind): Item[] =>
  kind === 'crystal'
    ? (game.crystals ?? [])
    : kind === 'relic'
      ? (game.relics ?? [])
      : game.inventory.filter((i) => i.kind === kind);

/** Only gear is capped. A crystal is never carried and a relic is never sold,
 *  so a limit on either could only throw loot away. */
export const carryRoom = (game: GameState, kind: ItemKind): number =>
  kind === 'gear' ? CARRY.gear - carried(game, 'gear').length : Infinity;

export const stashRoom = (game: GameState): number =>
  game.stashSlots - game.stash.length;

/** Where an item ended up. */
export type Placement = 'carried' | 'stashed' | 'lost';

/** Bags, then the stash, then nowhere. Every caller must report what this
 *  returned: loot that silently fails to arrive reads as a bug. */
export function addItem(game: GameState, item: Item): Placement {
  if (item.kind === 'crystal') {
    game.crystals.push(item);
    return 'carried';
  }
  if (item.kind === 'relic') {
    game.relics.push(item);
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
export type GiftPlace = 'carried' | 'stashed';

/** A gift refuses nowhere: bags, then the stash, then the bag OVER its limit.
 *  What you were handed in person is never quietly dropped. */
export function giveGift(game: GameState, item: Item): GiftPlace {
  const where = addItem(game, item);
  if (where !== 'lost') return where;
  game.inventory.push(item);
  return 'carried';
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

/**
 * Whether the filter lets this piece up out of the Fissure. Kept when its RUNG
 * is kept AND its GROUP is, so "tier 3 mage gear" is two clicks rather than a
 * row per combination. A named piece is never junk: a unique is only ever a
 * decision, and a filter set weeks ago was not a decision about this one.
 */
export function keepsItem(game: GameState, item: Item): boolean {
  if (!canSell(item) || isUnique(item)) return true;
  const junk = game.junk ?? [];
  if (junk.length === 0) return true;
  const base = GEAR_BASE_BY_ID[item.base];
  if (!base) return true;
  const group = keepGroupFor(base);
  return !junk.includes(tierKeepId(baseTier(item))) && !(group && junk.includes(group.id));
}

/** What a cleared descent came up with, once the filter has been through it. */
export interface Banked {
  kept: Item[];
  sold: number;
  gold: number;
}

/**
 * A cleared run's loot, banked whole. What the filter junks turns into gold on
 * the way up; the rest goes into the bag even when that puts it OVER its limit,
 * since splitting a descent's drops is worse than a bag reading 34/32. A filter
 * sale stays OFF the counter — a descent's worth would push every deliberate
 * sale off a twelve-deep shelf.
 */
export function bankLoot(game: GameState, items: Item[]): Banked {
  const out: Banked = { kept: [], sold: 0, gold: 0 };
  for (const item of items) {
    if (!keepsItem(game, item)) {
      const paid = sellPrice(item);
      grant(game.wallet, 'gold', paid);
      out.sold++;
      out.gold += paid;
      continue;
    }
    out.kept.push(item);
    if (item.kind === 'gear') game.inventory.push(item);
    else addItem(game, item);
  }
  return out;
}

export function findItem(game: GameState, id: string): Item | undefined {
  return game.inventory.find((i) => i.id === id) ?? game.crystals?.find((i) => i.id === id);
}

/**
 * Gear → gold. A sale needs no room anywhere, which is the way out of a bag
 * that came up over its limit: the loop cannot wedge.
 */
export function sellItem(game: GameState, item: Item): number {
  if (!canSell(item)) return 0;
  const paid = sellPrice(item);
  if (!takeFrom(game.inventory, item)) return 0;
  grant(game.wallet, 'gold', paid);
  game.sold = [{ item, price: paid }, ...(game.sold ?? [])].slice(0, SOLD_CAP);
  return paid;
}

/** Off the counter, at what it sold for. Room is needed HERE and only here,
 *  because this is a purchase: selling still needs room nowhere. */
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

export const isUnique = (i: Item): boolean => i.meta.unique !== undefined; // set by makeUnique

/** Gear with nothing rolled on it: the heap you can clear without reading it.
 *  A named piece rolls nothing and is never in it — the bulk button exists
 *  because it cannot eat a decision, and a unique is only a decision. */
export const plainGear = (items: Item[]): Item[] =>
  items.filter((i) => i.kind === 'gear' && i.mods.length === 0 && !isUnique(i));

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

/** A reference that resolves or does not, rather than an id something has to
 *  remember to clear. */
export function craftItem(game: GameState): Item | null {
  if (!game.craftId) return null;
  return findAnywhere(game, game.craftId) ?? null;
}

/** Grouped by slot, best first inside a group. IN PLACE, so a sort is part of
 *  the save. By SLOT: "all the boots together" is what scanning the dock asks. */
export function sortGear(items: Item[]): void {
  const rank = (i: Item) => {
    const at = EQUIP_SLOTS.findIndex((s) => s.accepts === gearKindOf(i));
    return at < 0 ? EQUIP_SLOTS.length : at;
  };
  items.sort(
    (a, b) =>
      rank(a) - rank(b) ||
      baseTier(b) - baseTier(a) ||
      b.mods.length - a.mods.length ||
      a.name.localeCompare(b.name)
  );
}

/** One comparator, so every screen orders a pile the same way. */
export const sortInventory = (game: GameState): void => sortGear(game.inventory);

/** A swap rather than an insert-before, which puts an item back where it
 *  started when you drop it on its neighbour. */
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

export const relicsIn = (game: GameState): Item[] => game.relics ?? [];

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

/** Off the BASE, so an item out of a save answers the same. */
export const isTwoHanded = (item: Item): boolean =>
  (GEAR_BASE_BY_ID[item.base]?.hands ?? 1) > 1;

/** The slot this equip would empty, or null. A bow and an off hand cannot both
 *  be held, and putting one on takes the other off rather than being refused. */
export function handClash(character: Character, item: Item, slotId: string): string | null {
  if (slotId === 'weapon' && isTwoHanded(item)) {
    return character.equipment.offhand ? 'offhand' : null;
  }
  if (slotId === 'offhand') {
    const held = character.equipment.weapon;
    return held && isTwoHanded(held) ? 'weapon' : null;
  }
  return null;
}

/** Puts an equip back. False once the slot holds something chosen since. */
export type Undo = () => boolean;

/** Worn items leave the inventory: the character sheet is where they now live. */
export function equipItem(game: GameState, item: Item, slotId: string): Undo | null {
  const slot = EQUIP_SLOTS.find((s) => s.id === slotId);
  if (!slot || !fitsSlot(item, slot)) return null;

  // What comes off the OTHER hand is a net addition to the bag, so it can be
  // refused for the same reason unequipping can: the removal below frees the
  // slot `previous` takes, which leaves this room exactly as it reads now.
  const clashSlot = handClash(game.character, item, slotId);
  const clash = clashSlot ? game.character.equipment[clashSlot] ?? null : null;
  if (clash && carryRoom(game, clash.kind) <= 0) return null;

  const previous = game.character.equipment[slotId] ?? null;
  // Removing first guarantees room, so what comes off is carried, never stashed.
  const at = game.inventory.indexOf(item);
  if (!removeItem(game, item)) return null;
  if (previous) addItem(game, previous);
  if (clash && clashSlot) {
    delete game.character.equipment[clashSlot];
    addItem(game, clash);
  }
  game.character.equipment[slotId] = item;

  return () => {
    if (game.character.equipment[slotId] !== item) return false;
    delete game.character.equipment[slotId];
    if (previous) removeItem(game, previous);
    if (clash && clashSlot) {
      removeItem(game, clash);
      game.character.equipment[clashSlot] = clash;
    }
    game.inventory.splice(Math.min(Math.max(at, 0), game.inventory.length), 0, item);
    if (previous) game.character.equipment[slotId] = previous;
    return true;
  };
}

/** Refuses when there is nowhere to put it: unequipping is a net addition to
 *  the bag, and a helmet that vanishes is the worst kind of carry limit. */
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
