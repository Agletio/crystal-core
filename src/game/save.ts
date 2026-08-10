/**
 * The save: the whole game as JSON, in one localStorage key.
 *
 * No server sits behind the hosted build, so a save lives in the browser that
 * made it. `GameState` is plain data, so `version` is the entire compatibility
 * story — a save from another one is refused rather than half-read.
 */
import { SAVE_VERSION, createGame, findAnywhere, giftWeapon, wornItems } from './state';
import { healQuests, ownedCrystals } from './crystals';
import { crystalFamily } from '../sim/crystal';
import type { GameState } from './state';
import {
  ALL_MODS,
  CRYSTAL_LEVELS,
  CURRENCY_BY_ID,
  FAMILY_BY_ID,
  GEAR_BASE_BY_ID,
  PLAYER_SKILLS,
  RUN_SLOTS,
  SKILL_BY_ID,
  crystalName,
} from '../data';
import { canAllocate, nodeById, treeFor, treePointsFor } from '../skills-tree';
import { reserveItemIds } from '../economy';
import type { Character } from '../sim/character';
import type { Item } from '../types';

const KEY = 'crystal-core.save';
const STAMP = 'crystal-core.saved-at';

/** Private windows throw on the first WRITE, so the probe has to write. */
function store(): Storage | null {
  try {
    const s = globalThis.localStorage;
    s.setItem(`${KEY}.probe`, '1');
    s.removeItem(`${KEY}.probe`);
    return s;
  } catch {
    return null;
  }
}

export const canSave = (): boolean => store() !== null;

/** What was last written, so an unchanged game does not rewrite the key. */
let lastWritten: string | null = null;

export function saveGame(game: GameState): boolean {
  const s = store();
  if (!s) return false;
  const json = JSON.stringify(game);
  if (json === lastWritten) return true;
  try {
    s.setItem(KEY, json);
    s.setItem(STAMP, String(Date.now()));
    lastWritten = json;
    return true;
  } catch {
    return false; // quota; throwing would take the frame down with it
  }
}

/** When the save was last written, or null if there isn't one. */
export function savedAt(): number | null {
  const raw = store()?.getItem(STAMP);
  const n = raw === null || raw === undefined ? NaN : Number(raw);
  return Number.isFinite(n) ? n : null;
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

export function loadGame(): GameState | null {
  const raw = store()?.getItem(KEY);
  if (!raw) return null;
  const save = readSave(raw);
  if (save) lastWritten = raw;
  return save;
}

export function clearSave(): void {
  const s = store();
  if (!s) return;
  s.removeItem(KEY);
  s.removeItem(STAMP);
  lastWritten = null;
}

// --- healing an old save ----------------------------------------------------
//
// A save is full of IDS pointing into the data tables and the trees, and those
// move as the game is built. The shape looks after itself — a field added since
// the save was written takes its default, one removed is simply never read
// again — so what actually rots is a reference to something that is gone.
//
// Every one of them is dropped rather than trusted, and anything paid for is
// handed back. A tree that was reshaped costs you a respec, not the character.

/** What a load had to throw away. Empty when the save was already current. */
export interface Healed {
  items: number;
  currencies: number;
  points: number;
  skill: boolean;
}

export const healedAnything = (h: Healed): boolean =>
  h.items > 0 || h.currencies > 0 || h.points > 0 || h.skill;

/** Crystals name their level; gear names a base that has to still exist. */
const baseExists = (item: Item): boolean =>
  item.kind === 'crystal'
    ? CRYSTAL_LEVELS.some((t) => item.base === `crystal_t${t.level}`)
    : GEAR_BASE_BY_ID[item.base] !== undefined;

/**
 * Re-walks the allocation with the game's own rule instead of trusting it.
 *
 * Anything that cannot be re-bought — its node is gone, its path home went
 * through a node that is gone, or the gate it sits behind is now further out
 * than the points left — falls out and is refunded. Order does not matter: the
 * pass repeats until nothing more can be taken.
 */
function replayTree(character: Character, skillId: string): number {
  const progress = character.skills[skillId];
  if (!progress) return 0;

  const wanted = progress.allocated.filter((id) => nodeById(skillId, id));
  const cap = Math.min(treePointsFor(progress.level), wanted.length);
  const kept: string[] = [];

  for (let added = true; added && kept.length < cap; ) {
    added = false;
    for (const id of wanted) {
      if (kept.includes(id)) continue;
      if (!canAllocate(skillId, id, kept)) continue;
      kept.push(id);
      added = true;
      if (kept.length >= cap) break;
    }
  }

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
  // Hand-edited saves reach here, and one that predates the haul has no key.
  game.haul = keep(Array.isArray(game.haul) ? game.haul : []);
  game.crystals = keep(Array.isArray(game.crystals) ? game.crystals : []);
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
    const stays = list.filter((i) => i.kind !== 'crystal');
    game.crystals.push(...list.filter((i) => i.kind === 'crystal'));
    return stays;
  };
  game.inventory = container(game.inventory);
  game.stash = container(game.stash);
  game.haul = container(game.haul);

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
  healQuests(game);

  // Before meetings were scheduled: read off what the save already holds.
  if (!Array.isArray(game.given)) {
    game.given = game.firstClearDone ? ['weapon'] : [];
    if (ownedCrystals(game).some((c) => crystalFamily(c) === 'normal')) game.given.push('crystal');
  }

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

  // `gold` is the feedstock rather than a currency, so it has no entry.
  for (const id of Object.keys(game.wallet)) {
    if (id === 'gold' || CURRENCY_BY_ID[id]) continue;
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

  if (!SKILL_BY_ID[game.character.skillId]) {
    game.character.skillId = PLAYER_SKILLS[0]?.id ?? 'strike';
    out.skill = true;
  }
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
