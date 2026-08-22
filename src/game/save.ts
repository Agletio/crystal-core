/**
 * The save: the whole game as JSON, in one localStorage key.
 *
 * No server sits behind the hosted build, so a save lives in the browser that
 * made it. `GameState` is plain data, so `version` is the entire compatibility
 * story — a save from another one is refused rather than half-read.
 */
import { SAVE_VERSION, createGame, findAnywhere, giftWeapon, wornItems } from './state';
import { takeMet } from './scenes';
import { healQuests, ownedCrystals } from './crystals';
import { healTrials } from './trials';
import { crystalFamily } from '../sim/crystal';
import type { GameState } from './state';
import {
  ALL_MODS,
  BOSS_BY_ID,
  BOSS_KEY_BY_ID,
  ATTRIBUTE_BY_ID,
  CRYSTAL_LEVELS,
  CURRENCY_BY_ID,
  FAMILY_BY_ID,
  FORGED_BY_ID,
  GEAR_BASE_BY_ID,
  KEEP_GROUPS,
  KEEP_TIERS,
  LADDER,
  MAIN_SKILLS,
  MAIN_SLOT,
  WEAPON_SLOT,
  PLAYER_SKILLS,
  SKILL_SLOTS,
  POTION_BY_ID,
  RELIC_BY_ID,
  RUN_SLOTS,
  SKILL_BY_ID,
  UNIQUE_BY_ID,
  crystalName,
  tierKeepId,
} from '../data';
import { nodeById, replayTreeNodes, treeFor, treePointsFor } from '../skills-tree';
import { TRADE_BY_ID, replayTradeNodes, tradePointsFor } from '../trades';
import { isPerfect, makeGear, reserveItemIds } from '../economy';
import { attributePointsFor, weaponFits } from '../sim/character';
import type { Character } from '../sim/character';
import type { Item } from '../types';

const KEY = 'crystal-core.save';
const STAMP = 'crystal-core.saved-at';
/** Which slot is being played. Everything else keys off it. */
const LIVE = 'crystal-core.slot';

export type Slot = 1 | 2 | 3;
export const SLOTS: readonly Slot[] = [1, 2, 3];

const keyFor = (slot: Slot) => `${KEY}.${slot}`;
const stampFor = (slot: Slot) => `${STAMP}.${slot}`;

/** A save written before slots existed becomes slot 1, once, on first touch. */
function adoptLegacy(s: Storage): void {
  const raw = s.getItem(KEY);
  if (raw === null) return;
  if (s.getItem(keyFor(1)) === null) {
    s.setItem(keyFor(1), raw);
    const at = s.getItem(STAMP);
    if (at !== null) s.setItem(stampFor(1), at);
  }
  s.removeItem(KEY);
  s.removeItem(STAMP);
}

let adopted = false;

/** Private windows throw on the first WRITE, so the probe has to write. */
function store(): Storage | null {
  try {
    const s = globalThis.localStorage;
    s.setItem(`${KEY}.probe`, '1');
    s.removeItem(`${KEY}.probe`);
    if (!adopted) {
      adopted = true;
      adoptLegacy(s);
    }
    return s;
  } catch {
    return null;
  }
}

export const canSave = (): boolean => store() !== null;

/** The slot being played. Where autosave writes, and where a reload comes back
 *  to — so switching slots is the whole of what "which game is this" means. */
export function liveSlot(): Slot {
  const raw = Number(store()?.getItem(LIVE));
  return SLOTS.includes(raw as Slot) ? (raw as Slot) : 1;
}

export function setLiveSlot(slot: Slot): void {
  store()?.setItem(LIVE, String(slot));
}

/** Per slot, so copying a game into another one is never skipped as a no-op. */
const lastWritten = new Map<Slot, string>();

export function saveGame(game: GameState, slot: Slot = liveSlot()): boolean {
  const s = store();
  if (!s) return false;
  const json = JSON.stringify(game);
  if (json === lastWritten.get(slot)) return true;
  try {
    s.setItem(keyFor(slot), json);
    s.setItem(stampFor(slot), String(Date.now()));
    lastWritten.set(slot, json);
    return true;
  } catch {
    return false; // quota; throwing would take the frame down with it
  }
}

/** When the slot was last written, or null if there isn't one. */
export function savedAt(slot: Slot = liveSlot()): number | null {
  const raw = store()?.getItem(stampFor(slot));
  const n = raw === null || raw === undefined ? NaN : Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Who is in a slot, for a screen listing all three. Deliberately NOT
 *  `readSave`: looking at a slot may not reserve the ids inside it. */
export interface SlotInfo {
  name: string;
  /** The trade's NAME, or null before one is taken up. */
  trade: string | null;
  level: number;
  at: number | null;
}

export function peekSlot(slot: Slot): SlotInfo | null {
  const raw = store()?.getItem(keyFor(slot));
  if (!raw) return null;
  try {
    const who = (JSON.parse(raw) as Partial<GameState>).character;
    if (!who) return null;
    return {
      name: who.name || 'wanderer',
      trade: (who.trade && TRADE_BY_ID[who.trade]?.spec.name) || null,
      level: who.level ?? 1,
      at: savedAt(slot),
    };
  } catch {
    return null;
  }
}

/** The text itself, so a copy is exactly the game rather than a re-serialised
 *  one. Returns whether there was anything to copy. */
export function copySlot(from: Slot, to: Slot): boolean {
  const s = store();
  const raw = s?.getItem(keyFor(from));
  if (!s || !raw) return false;
  s.setItem(keyFor(to), raw);
  s.setItem(stampFor(to), String(Date.now()));
  lastWritten.set(to, raw);
  return true;
}

/** Shape is checked, not trusted: the text can be edited by hand. */
export function readSave(text: string): GameState | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const save = data as Partial<GameState>;
  if (save.version !== SAVE_VERSION) return null;
  if (!Array.isArray(save.inventory) || !Array.isArray(save.stash)) return null;
  if (!save.character || typeof save.character !== 'object') return null;
  if (!save.wallet || typeof save.wallet !== 'object') return null;
  // The whole save, before anything can mint an item beside what is in it.
  reserveItemIds(save);
  return save as GameState;
}

export function loadGame(slot: Slot = liveSlot()): GameState | null {
  const raw = store()?.getItem(keyFor(slot));
  if (!raw) return null;
  const save = readSave(raw);
  if (save) lastWritten.set(slot, raw);
  return save;
}

export function clearSave(slot: Slot = liveSlot()): void {
  const s = store();
  if (!s) return;
  s.removeItem(keyFor(slot));
  s.removeItem(stampFor(slot));
  lastWritten.delete(slot);
}

// --- healing an old save ----------------------------------------------------
//
// A save is full of IDS pointing into the data tables and the trees, and those
// move as the game is built. What rots is a reference to something gone: every
// one is dropped rather than trusted, and anything paid for is handed back.

/** What a load had to throw away. Empty when the save was already current. */
export interface Healed {
  items: number;
  currencies: number;
  points: number;
  skill: boolean;
}

export const healedAnything = (h: Healed): boolean =>
  h.items > 0 || h.currencies > 0 || h.points > 0 || h.skill;

/** Crystals name their level; gear names a base that has to still exist, and a
 *  named piece names a unique — its lines are the def, so a cut one is gone. */
const baseExists = (item: Item): boolean => {
  if (item.kind === 'crystal') {
    return CRYSTAL_LEVELS.some((t) => item.base === `crystal_t${t.level}`);
  }
  if (item.kind === 'relic') return RELIC_BY_ID[item.base] !== undefined;
  if (item.meta.unique !== undefined && !UNIQUE_BY_ID[String(item.meta.unique)]) return false;
  return GEAR_BASE_BY_ID[item.base] !== undefined;
};

/** Re-walked with the game's own rule instead of trusted: anything that cannot
 *  be re-bought falls out and is refunded. */
function replayTree(character: Character, skillId: string): number {
  const progress = character.skills[skillId];
  if (!progress) return 0;

  const kept = replayTreeNodes(skillId, progress.allocated, treePointsFor(skillId, progress.level));
  const lost = progress.allocated.length - kept.length;
  progress.allocated = kept;

  for (const nodeId of Object.keys(progress.choices ?? {})) {
    const node = nodeById(skillId, nodeId);
    const picked = progress.choices?.[nodeId];
    const valid = node?.choices?.some((c) => c.id === picked) ?? false;
    if (!valid) delete progress.choices?.[nodeId];
  }
  return lost;
}

/**
 * The same treatment for attributes: replayed against the level that paid for
 * them rather than trusted. A curve that moves, or an attribute that is cut,
 * must not leave a character holding points no level ever granted — and what
 * falls out is refunded, since the pool is the budget minus what is spent.
 */
function replayAttributes(character: Character): number {
  const budget = attributePointsFor(character.level);
  const kept: Record<string, number> = {};
  let spent = 0;
  let lost = 0;

  for (const [id, held] of Object.entries(character.attributes ?? {})) {
    const want = Number.isFinite(held) ? Math.max(0, Math.floor(held)) : 0;
    const take = ATTRIBUTE_BY_ID[id] ? Math.min(want, budget - spent) : 0;
    if (take > 0) kept[id] = take;
    spent += take;
    lost += want - take;
  }

  character.attributes = kept;
  return lost;
}

/**
 * And the same for a trade, against the points character level granted. A
 * trade that is cut takes the walk with it and hands back every point; nothing
 * else about the character moves, because a trade owns nothing else.
 */
function replayTrade(character: Character): number {
  const wanted = (Array.isArray(character.tradeAllocated) ? character.tradeAllocated : []).filter(
    (id) => typeof id === 'string'
  );
  const trade = character.trade;

  if (!trade || !TRADE_BY_ID[trade]) {
    character.trade = null;
    character.tradeAllocated = [];
    return wanted.length;
  }
  const kept = replayTradeNodes(trade, wanted, tradePointsFor(character.level));
  character.tradeAllocated = kept;
  return wanted.length - kept.length;
}

/**
 * The three skill slots. A slot naming a skill that is gone empties; a save
 * written before slots existed carries a bare `skillId`, and that goes in the
 * main one. A character with nothing to swing is given the first skill there
 * is, because a game you cannot play is worse than a lost choice.
 */
function healSkillSlots(character: Character): boolean {
  const was = JSON.stringify(character.equipped ?? {});
  const legacy = (character as unknown as { skillId?: string }).skillId;
  const kept: Record<string, string> = {};

  // A slot the level has not reached drops what is in it, and one skill may sit
  // in only one: a passive held twice merges its own grants into itself.
  const seen = new Set<string>();
  for (const slot of SKILL_SLOTS) {
    const held = character.equipped?.[slot.id] ?? (slot.id === MAIN_SLOT ? legacy : undefined);
    const category = held ? SKILL_BY_ID[held]?.category : undefined;
    if (!held || !category || !slot.accepts.includes(category)) continue;
    if (character.level < (slot.unlocksAt ?? 1) || seen.has(held)) continue;
    seen.add(held);
    kept[slot.id] = held;
  }
  // A skill the weapon cannot swing is LEGAL — the Fissure refuses to open on
  // it — so nothing is healed away here; that would undo a swap in progress.
  if (!kept[MAIN_SLOT]) {
    // What the weapon is FOR first, then anything it can swing: a bow healing
    // to a spell keeps you playing but throws away the shape of the build.
    const held = character.equipment?.[WEAPON_SLOT] ?? null;
    const family = held ? GEAR_BASE_BY_ID[held.base]?.family : undefined;
    kept[MAIN_SLOT] =
      MAIN_SKILLS.find((sk) => sk.requires && family && weaponFits(sk, held))?.id
      ?? MAIN_SKILLS.find((sk) => weaponFits(sk, held))?.id
      ?? MAIN_SKILLS[0]?.id
      ?? PLAYER_SKILLS[0]?.id
      ?? 'strike';
  }

  character.equipped = kept;
  delete (character as unknown as { skillId?: string }).skillId;
  return JSON.stringify(kept) !== was;
}

/** IN PLACE. Everything the current build cannot resolve, gone. */
export function heal(game: GameState): Healed {
  const out: Healed = { items: 0, currencies: 0, points: 0, skill: false };

  const keep = (list: Item[]): Item[] => {
    const ok = list.filter(baseExists);
    out.items += list.length - ok.length;
    return ok;
  };
  game.inventory = keep(game.inventory);
  game.stash = keep(game.stash);
  // The haul is gone: what a save held in it comes into the bag, over the limit
  // if that is where it lands. Over is a real state, and a better one than a
  // night's loot vanishing on load.
  const hauled = (game as unknown as { haul?: Item[] }).haul;
  if (Array.isArray(hauled)) game.inventory.push(...keep(hauled));
  delete (game as unknown as { haul?: Item[] }).haul;
  game.crystals = keep(Array.isArray(game.crystals) ? game.crystals : []);
  game.relics = keep(Array.isArray(game.relics) ? game.relics : []);
  // Same rule as every other container: a base that is gone takes its entry.
  game.sold = (Array.isArray(game.sold) ? game.sold : []).filter((e) => {
    const ok = e && e.item && baseExists(e.item) && Number.isFinite(e.price);
    if (!ok) out.items++;
    return ok;
  });

  // Crystals used to live in the bags. They are never carried anywhere now, so
  // a save written before that moves its collection across rather than leaving
  // it holding gear slots it can never free.
  const container = (list: Item[]): Item[] => {
    const stays = list.filter((i) => i.kind === 'gear');
    game.crystals.push(...list.filter((i) => i.kind === 'crystal'));
    game.relics.push(...list.filter((i) => i.kind === 'relic'));
    return stays;
  };
  game.inventory = container(game.inventory);
  game.stash = container(game.stash);

  for (const item of [...game.crystals, ...Object.values(game.sockets ?? {})]) {
    if (item.kind !== 'crystal') continue;
    // `tier` was the word before levels; the base id never moved, so this is
    // the whole of that rename's cost.
    if (item.meta.level === undefined && item.meta.tier !== undefined) {
      item.meta.level = item.meta.tier;
      delete item.meta.tier;
    }
    // A retired family costs the crystal its world, not the crystal.
    if (!FAMILY_BY_ID[String(item.meta.family)]) {
      item.meta.family = 'normal';
      item.name = crystalName(Number(item.meta.level), 'normal');
    }
    // Written before crystals levelled, or re-tuned since: xp starts at the
    // floor of the level it already holds, so nothing is ever demoted.
    const floor = CRYSTAL_LEVELS.find((t) => t.level === Number(item.meta.level))?.xp ?? 0;
    if (!(Number(item.meta.xp) >= floor)) item.meta.xp = floor;
    // A scripted roll with nowhere left to land expires rather than waiting.
    if (item.mods.length > 0 || !ALL_MODS.some((m) => m.id === item.meta.scripted)) {
      delete item.meta.scripted;
    }
  }
  // The first heal that repairs a LINE rather than dropping an item. A graft
  // stands where the base's own implicit stood, so a forged def that no longer
  // resolves has to put that line BACK — otherwise the piece keeps a hole
  // where the base's line used to be and nothing can ever fill it.
  for (const item of [...game.inventory, ...game.stash, ...wornItems(game)]) {
    if (item.meta.grafted === undefined || FORGED_BY_ID[String(item.meta.grafted)]) continue;
    item.implicits = makeGear(item.base, item.ilvl, undefined, isPerfect(item)).implicits;
    delete item.meta.grafted;
    out.items++;
  }
  healQuests(game);

  // A boss id no table resolves is the whole cost of ever renaming one, and a
  // room called up by a key that has since been cut is a room nobody can enter.
  game.bosses = (Array.isArray(game.bosses) ? game.bosses : []).filter((id) => BOSS_BY_ID[id]);
  if (game.called && !BOSS_BY_ID[game.called]) game.called = null;

  // A row nothing resolves goes: dropping one only ever KEEPS more, which is
  // the safe direction for a repair nobody asked for.
  {
    const rows = new Set([
      ...KEEP_GROUPS.map((g) => g.id),
      ...KEEP_TIERS.map((t) => tierKeepId(t)),
    ]);
    game.junk = (Array.isArray(game.junk) ? game.junk : []).filter((id) => rows.has(id));
  }

  // A threshold for a potion that no longer exists costs its entry; one out of
  // range is clamped rather than dropped, so a save never fires a flask at a
  // share nothing can reach.
  {
    const kept: Record<string, number> = {};
    for (const [id, share] of Object.entries(game.potions ?? {})) {
      if (!POTION_BY_ID[id] || !Number.isFinite(share)) continue;
      kept[id] = Math.max(0, Math.min(1, share));
    }
    game.potions = kept;
  }

  // Before meetings were scheduled: read off what the save already holds.
  if (!Array.isArray(game.given)) {
    game.given = game.firstClearDone ? ['weapon'] : [];
    if (ownedCrystals(game).some((c) => crystalFamily(c) === 'normal')) game.given.push('crystal');
  }

  // Before a person you had met stayed met: a GRAFTED piece is the only proof
  // a save holds that you stood in that room. Anyone met and not spent is found
  // again the next time a relic schedules him, which is the old behaviour.
  for (const item of [...game.inventory, ...game.stash, ...wornItems(game)]) {
    const who = FORGED_BY_ID[String(item.meta.grafted)]?.who;
    if (who) takeMet(game, who);
  }

  // Before descents were counted: read the count off the one milestone the
  // save already holds. Nothing is scheduled on it, so an undercount costs
  // a number on a screen rather than a gift.
  if (!Number.isFinite(game.clears)) {
    game.clears = game.firstClearDone ? 1 : 0;
  }

  // THE CLIMB. A zone that is gone takes its progress, and a count past what
  // the zone holds is clamped: the zone after it reads that number.
  const climbed: Record<string, number> = {};
  for (const zone of LADDER.zones) {
    const was = Math.floor(Number(game.character.climbed?.[zone.theme] ?? 0));
    if (Number.isFinite(was) && was > 0) climbed[zone.theme] = Math.min(zone.rungs, was);
  }
  game.character.climbed = climbed;

  for (const [slot, worn] of Object.entries(game.character.equipment)) {
    if (baseExists(worn)) continue;
    delete game.character.equipment[slot];
    out.items++;
  }
  // A socket holding a crystal whose level was retired empties rather than
  // launching a run built on a base that no longer resolves.
  game.sockets ??= {};
  for (const [slot, held] of Object.entries(game.sockets)) {
    if (baseExists(held) && RUN_SLOTS.some((s) => s.id === slot)) continue;
    delete game.sockets[slot];
    out.items++;
  }
  if (game.craftId && !findAnywhere(game, game.craftId)) game.craftId = null;

  // A save written before the Fissure marked what it hands you. Guessing here
  // is right where guessing in the opening's predicate was wrong: this runs
  // ONCE, and afterwards the mark is exact for the rest of that save's life.
  if (game.firstClearDone && !giftWeapon(game)) {
    const weapons = [...game.inventory, ...wornItems(game)].filter(
      (i) => GEAR_BASE_BY_ID[i.base]?.kind === 'weapon'
    );
    const pick = weapons.find((i) => i.mods.length === 0) ?? weapons[0];
    if (pick) pick.meta.firstClear = true;
  }

  // `gold` is the feedstock rather than a currency, so it has no entry — and a
  // boss key is COUNTED in the wallet without being one, which is the whole
  // point of it having its own table.
  for (const id of Object.keys(game.wallet)) {
    if (id === 'gold' || CURRENCY_BY_ID[id] || BOSS_KEY_BY_ID[id]) continue;
    delete game.wallet[id];
    out.currencies++;
  }

  for (const skillId of Object.keys(game.character.skills)) {
    if (treeFor(skillId).length === 0 && !SKILL_BY_ID[skillId]) {
      delete game.character.skills[skillId];
      continue;
    }
    out.points += replayTree(game.character, skillId);
  }

  out.points += replayAttributes(game.character);
  out.points += replayTrade(game.character);
  out.points += healTrials(game.character);

  out.skill = healSkillSlots(game.character);
  return out;
}

/**
 * IN PLACE: every screen captured the game object at init. Missing keys fall
 * back to a fresh game, so a save written before a field existed still opens.
 */
export function applySave(game: GameState, save: GameState): Healed {
  Object.assign(game, createGame('fresh'), save);
  return heal(game);
}

/** A file the player can keep. */
export function backupName(game: GameState): string {
  const who = (game.character.name || 'wanderer').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return `crystal-core-${who}-level-${game.character.level}.json`;
}

/**
 * Writes on a timer rather than on every mutation, and skips the write when
 * nothing changed — so no screen has to remember to announce that it touched
 * something.
 */
export function startAutosave(game: GameState, everyMs = 4000): void {
  // The LIVE slot, read every time: switching slots is what moves the writes.
  const flush = () => saveGame(game);
  // At once, so a tab closed inside the first tick still leaves a save.
  flush();
  setInterval(flush, everyMs);
  // The tab going away is the one moment the timer is guaranteed to miss.
  globalThis.addEventListener?.('pagehide', flush);
  globalThis.addEventListener?.('visibilitychange', () => {
    if (globalThis.document?.visibilityState === 'hidden') flush();
  });
}
