/**
 * What owning crystals turns into over time: they level while socketed, the
 * Lampwright gives you the Normal ones, and the other two worlds are quests.
 *
 * A crystal is never spent, so this is the only thing that changes one without
 * a currency being poured on it — which is why the level, the base, the name
 * and the capacity are all rewritten together.
 */
import {
  CRYSTAL_QUESTS,
  CRYSTAL_LEVELS,
  CRYSTAL_XP,
  LAMPWRIGHT,
  QUEST_BY_ID,
  crystalName,
} from '../data';
import type { CrystalQuest } from '../data';
import { giveGift } from './state';
import type { GameState, GiftPlace } from './state';
import { makeCrystal } from '../economy';
import { crystalFamily } from '../sim/crystal';
import type { RunSet } from '../sim/crystal';
import type { Item } from '../types';

/** Every crystal you own: socketed, or in the collection. */
export function ownedCrystals(game: GameState): Item[] {
  return [...Object.values(game.sockets ?? {}), ...(game.crystals ?? [])];
}

// --- the Lampwright ---------------------------------------------------------

/** What is waiting at the mouth of a cleared descent, or null. SCHEDULED,
 *  never rolled, and read BEFORE the report, which sets the flag it reads. */
export type Waiting = 'weapon';

export function giftWaiting(game: GameState): Waiting | null {
  return game.firstClearDone ? null : 'weapon';
}

export function lampwrightGift(game: GameState): { crystal: Item; where: GiftPlace } {
  const crystal = makeCrystal(LAMPWRIGHT.level, LAMPWRIGHT.family);
  return { crystal, where: giveGift(game, crystal) };
}

// --- levelling --------------------------------------------------------------

export const crystalXp = (crystal: Item): number => Number(crystal.meta.xp) || 0;

/** The highest level that much experience has paid for. */
export function levelForXp(xp: number): number {
  let level = CRYSTAL_LEVELS[0].level;
  for (const def of CRYSTAL_LEVELS) {
    if (xp >= def.xp) level = def.level;
  }
  return level;
}

/** The level a crystal is standing at, whatever its stored fields say. */
export const crystalLevel = (crystal: Item): number =>
  Number(crystal.meta.level) || levelForXp(crystalXp(crystal));

export const topLevel = (): number => CRYSTAL_LEVELS[CRYSTAL_LEVELS.length - 1].level;

export interface CrystalProgress {
  level: number;
  xp: number;
  /** Total needed for the next level, or null at the top. */
  need: number | null;
  /** 0–1 through the current level. 1 at the top. */
  fraction: number;
}

export function crystalProgress(crystal: Item): CrystalProgress {
  const xp = crystalXp(crystal);
  const level = crystalLevel(crystal);
  const at = CRYSTAL_LEVELS.find((t) => t.level === level);
  const next = CRYSTAL_LEVELS.find((t) => t.level === level + 1);
  if (!next) return { level, xp, need: null, fraction: 1 };
  const floor = at?.xp ?? 0;
  return {
    level,
    xp,
    need: next.xp,
    fraction: Math.max(0, Math.min(1, (xp - floor) / (next.xp - floor))),
  };
}

/** What one cleared descent pays every crystal that was socketed for it. */
export const xpForClear = (danger: number): number =>
  CRYSTAL_XP.perClear * (1 + Math.max(0, danger) / CRYSTAL_XP.perDanger);

/**
 * IN PLACE, and every derived field with it. Returns the levels gained, so a
 * crystal that jumped two rungs on one enormous run reports both.
 */
export function addCrystalXp(crystal: Item, xp: number): number {
  if (crystal.kind !== 'crystal') return 0;
  const was = crystalLevel(crystal);
  crystal.meta.xp = crystalXp(crystal) + xp;

  // Never down. A crystal whose stored xp is behind its level — one granted
  // before xp was tracked — climbs from where it stands.
  const now = levelForXp(crystalXp(crystal));
  if (now <= was) return 0;

  const def = CRYSTAL_LEVELS.find((t) => t.level === now)!;
  const family = crystalFamily(crystal);
  crystal.meta.level = now;
  crystal.base = `crystal_t${now}`;
  crystal.name = crystalName(now, family);
  crystal.tags = ['crystal', `level${now}`, family];
  // Capacity, which is the whole of what a level is. Nothing rolled is
  // touched: room is added above what is already on it.
  crystal.slots = { ...crystal.slots, mod: def.mods };
  return now - was;
}

export interface CrystalGain {
  crystal: Item;
  levels: number;
}

/** Only while socketed — a crystal in the collection is one not being used. */
export function advanceSocketed(game: GameState, set: RunSet): CrystalGain[] {
  const xp = xpForClear(set.rewards.danger);
  const out: CrystalGain[] = [];
  for (const crystal of Object.values(game.sockets ?? {})) {
    const levels = addCrystalXp(crystal, xp);
    if (levels > 0) out.push({ crystal, levels });
  }
  return out;
}

// --- quests -----------------------------------------------------------------

export const questDone = (game: GameState, id: string): boolean =>
  (game.quests ?? []).includes(id);

/** Float shares: one crystal of four is 0.25 and must not miss its own gate. */
const EPSILON = 1e-6;

export function questMet(quest: CrystalQuest, set: RunSet): boolean {
  if (set.rewards.danger < quest.need.danger) return false;
  if (quest.need.family !== undefined) {
    const share = set.composition[quest.need.family] ?? 0;
    if (share + EPSILON < (quest.need.share ?? 0)) return false;
  }
  return true;
}

/** Still open, in table order: the screen shows them as a ladder. */
export const openQuests = (game: GameState): CrystalQuest[] =>
  CRYSTAL_QUESTS.filter((q) => !questDone(game, q.id));

/**
 * Everything this cleared descent just finished, paid out. Called once per
 * clear, so a quest can only ever be claimed the run it was completed on.
 */
export interface QuestPaid {
  quest: CrystalQuest;
  crystal: Item;
  where: GiftPlace;
}

export function claimQuests(game: GameState, set: RunSet): QuestPaid[] {
  const out: QuestPaid[] = [];
  for (const quest of openQuests(game)) {
    if (!questMet(quest, set)) continue;
    game.quests = [...(game.quests ?? []), quest.id];
    const crystal = makeCrystal(quest.gives.level, quest.gives.family);
    out.push({ quest, crystal, where: giveGift(game, crystal) });
  }
  return out;
}

/** A quest id that no longer exists costs its entry and nothing else. */
export function healQuests(game: GameState): void {
  const held = Array.isArray(game.quests) ? game.quests : [];
  game.quests = held.filter((id) => QUEST_BY_ID[id]);
}
