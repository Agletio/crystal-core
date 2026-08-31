/**
 * The whole game, in one object — and the whole save, since `game/save.ts` is
 * `JSON.stringify(game)` plus a `version` check. Everything here stays plain
 * data. `SAVE_VERSION` moves only for a change `heal()` cannot repair, since
 * moving it wipes everyone's game.
 */
import { Rng } from '../rng';
import {
  BOSSES,
  EQUIP_SLOTS,
  OFF_SLOT,
  FISSURE,
  GEAR_BASE_BY_ID,
  RELIC_BY_ID,
  RUN_SLOTS,
  SKILL_BY_ID,
  WEAPON_SLOT,
  START_PRESETS,
  GRINDS,
  MATERIALS,
  PROVING,
  CRYSTAL_ILVL,
  UNIQUE_BY_ID,
  starterWeapon,
} from '../data';
import type { EquipSlotDef, MapTheme, RunSlotDef } from '../types';
import {
  canSell,
  grant,
  isPerfect,
  isTwoHanded,
  makeCrystal,
  makeGear,
  makeMaterial,
  makeRelic,
  makeUnique,
  sellPrice,
  stackKey,
} from '../economy';
import { baseTier } from '../mods';
import { canDualWield, equippedSkill, mainSkillId, makeCharacter } from '../sim/character';
import { starterLoadout } from '../sim/loadout';
import { SCENES } from '../scenes';
import { metMark } from './scenes';
import type { Character } from '../sim/character';
import type { Item, ItemKind, Wallet } from '../types';
import type { WorkJob } from './work';

// BUMPED ONCE for the whole crafting arc; nothing later in it may bump again.
export const SAVE_VERSION = 2;

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
  /** MATERIALS, ONE ROW A STACK: `stackKey` is which, `meta.n` is how many. */
  materials: Item[];
  /** WHAT THE STATIONS ARE WORKING ON, advanced by a CLEAR. */
  jobs: WorkJob[];
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
  /** False until a trade has been chosen on the first run. */
  onboarded: boolean;
  /** False until the Skills screen has been opened once, ever, and false until
   *  a descent has ENDED. The rail wears an accent while the first is false and
   *  the second true — a death brings you back to camp the same as a clear, so
   *  this cannot read off `clears`. */
  skillsSeen: boolean;
  cameBack: boolean;
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
  /** Key overrides by binding id; a missing one takes the table's default. */
  keys: Record<string, string>;
  /** Share of a pool a potion fires at, by id. Charges are `RunState`'s. */
  potions: Record<string, number>;
  /** Panels away, map alone. A preference like `keys`, so a wipe keeps it. */
  parked: boolean;
  climbing: boolean; // a CLEAR takes the next RUNG down; absent is off, and dying clears it
  influence?: MapTheme; // WHICH WORLD the Proving Ground runs in; a preference
  provingClears?: number; // what the crystal ladder's first four are bought with

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
    materials: [],
    jobs: [],
    stashSlots: STASH_START,
    character: makeCharacter({}, 'strike'),
    sockets: {},
    craftId: null,
    onboarded: false,
    skillsSeen: false,
    cameBack: false,
    firstClearDone: false,
    clears: 0,
    given: [],
    quests: [],
    sold: [],
    keys: {},
    potions: {},
    parked: false,
    climbing: false,
    influence: PROVING.influences[0],
    bosses: [],
    called: null,
  };
  resetGame(game, mode);
  return game;
}

/** EVERY LINE OF THE LEDGER at its threshold, off the table rather than a list,
 *  so a grind added later is in the kit with no second edit. */
const devGrinds = (): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const grind of GRINDS) out[grind.counter] = Math.max(out[grind.counter] ?? 0, grind.need);
  return out;
};

/** IN PLACE: every view captured this object at init. */
export function resetGame(game: GameState, mode: StartMode): void {
  const preset = START_PRESETS[mode];

  game.wallet = {};
  grant(game.wallet, 'gold', preset.gold);
  for (const [id, n] of Object.entries(preset.currency)) grant(game.wallet, id, n);

  const plain = preset.gear.map((g) => makeGear(g.base, g.ilvl, undefined, g.perfect));
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
  // RAW and WORKED both: a kit that could not reach the anvil is one that can
  // look at half the arc.
  game.materials = preset.materials
    ? MATERIALS.flatMap((def) => [
        makeMaterial(def, preset.materials!),
        ...(def.family ? [makeMaterial(def, preset.materials!, true)] : []),
      ])
    : [];
  game.jobs = [];
  game.stash = plain.slice(room);
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
  game.skillsSeen = mode === 'dev';
  game.cameBack = mode === 'dev';
  game.firstClearDone = mode === 'dev';
  game.clears = mode === 'dev' ? 1 : 0; // the same descent `firstClearDone` is
  // The dev kit is armed, holds every crystal, and has MET everybody: nothing
  // waits at the mouth and every room is one click off the Fissure.
  game.given =
    mode === 'dev'
      ? ['weapon', 'crystal', ...SCENES.filter((s) => !s.encounter).map((s) => metMark(s.id))]
      : [];
  // The dev kit is handed every crystal in the game, so its quests are already
  // answered — left open, the first dangerous descent pays out four duplicates.
  game.bosses = mode === 'dev' ? BOSSES.map((b) => b.id) : []; // handed the door too
  // THE WHOLE LEDGER ground out, and the campaign's reward already TAKEN —
  // never the climb itself, which the kit has walked none of. Between them
  // that is every Tally there is, and sockets for the crystals to go in.
  game.character.grinds = mode === 'dev' ? devGrinds() : {};
  if (mode === 'dev') game.character.paidCampaign = true;
  game.called = null;
  game.sold = [];
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

  // No weapon here: `armForSkill` is where one is put in your hands.
  return { gold: gift.gold, currency: gift.currency };
}

/** THE FIRST WEAPON, picked off the SKILL and put in your hands as the
 *  character is MADE — *"It should just be you pick character/name/skill and
 *  land in the town. Have it just give you an appropriate weapon for the skill
 *  you picked."* Marked twice over: `given` so nobody hands you a second, and
 *  `meta.firstClear` so a heal can find the piece again. */
export function armForSkill(game: GameState): { item: Item; where: GiftPlace } | null {
  const base = starterWeapon(SKILL_BY_ID[mainSkillId(game.character)]);
  if (!base) return null;
  if (!(game.given ?? []).includes('weapon')) game.given = [...(game.given ?? []), 'weapon'];
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
      : kind === 'material'
        ? (game.materials ?? [])
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
  // A STACK, so the bag holds one row however many descents fed it — and RAW
  // and PROCESSED are two stacks of the same row, which is what `stackKey` is.
  if (item.kind === 'material') {
    game.materials = game.materials ?? [];
    const key = stackKey(item);
    const held = game.materials.find((i) => stackKey(i) === key);
    if (held) held.meta.n = (held.meta.n ?? 0) + (item.meta.n ?? 0);
    else game.materials.push(item);
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

export { isTwoHanded };

export function removeItem(game: GameState, item: Item): boolean {
  if (item.kind === 'crystal') return takeFrom(game.crystals, item);
  return takeFrom(game.inventory, item);
}

/** What a cleared descent came up with. */
export interface Banked {
  kept: Item[];
}

/**
 * A cleared run's loot, banked WHOLE — there is no filter any more, because
 * there is nothing to filter. It goes into the bag even when that puts it OVER
 * its limit: splitting a descent's drops is worse than a bag reading 34/32.
 */
export function bankLoot(game: GameState, items: Item[]): Banked {
  const out: Banked = { kept: [] };
  for (const item of items) {
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
 *  because it cannot eat a decision, and a unique is only a decision. Nor is a
 *  PERFECT base, which is worth keeping with nothing on it at all. */
export const plainGear = (items: Item[]): Item[] =>
  items.filter(
    (i) => i.kind === 'gear' && i.mods.length === 0 && !isUnique(i) && !isPerfect(i)
  );

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
    const at = EQUIP_SLOTS.findIndex((s) => s.accepts[0] === gearKindOf(i));
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

export function fitsSlot(item: Item, slot: EquipSlotDef, character: Character): boolean {
  const kind = gearKindOf(item);
  if (!kind || !slot.accepts.includes(kind as never)) return false;
  if (slot.id !== OFF_SLOT) return true;
  // A two-hander is held in BOTH hands, so the off hand is not a second place
  // to put one — `handClash` empties the off hand for it instead.
  if (isTwoHanded(item)) return false;
  // And a second WEAPON there is one trade's privilege. A shield is anybody's.
  return kind !== 'weapon' || canDualWield(character);
}

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
  if (!slot || !fitsSlot(item, slot, game.character)) return null;

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
  const fitting = EQUIP_SLOTS.filter((s) => fitsSlot(item, s, game.character));
  if (fitting.length === 0) return null;
  const empty = fitting.find((s) => !game.character.equipment[s.id]);
  return (empty ?? fitting[0]).id;
}
