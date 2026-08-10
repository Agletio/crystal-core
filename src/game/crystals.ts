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
  INTRO,
  LAMPWRIGHT,
  QUEST_BY_ID,
  crystalName,
} from '../data';
import type { CrystalQuest } from '../data';
import { giveGift, lampwrightWeapon } from './state';
import type { GameState, GiftPlace } from './state';
import { grant, makeCrystal } from '../economy';
import { crystalFamily } from '../sim/crystal';
import type { RunSet } from '../sim/crystal';
import type { Item } from '../types';

/** Every crystal you own: socketed, or in the collection. */
export function ownedCrystals(game: GameState): Item[] {
  return [...Object.values(game.sockets ?? {}), ...(game.crystals ?? [])];
}

// --- the Lampwright ---------------------------------------------------------

/**
 * Everything owed at the mouth of a cleared descent. SCHEDULED off what has
 * been given, the character sheet and the clear itself — never rolled, so a
 * screen can quote it rather than describe it.
 */
export interface Waiting {
  weapon: boolean;
  crystal: boolean;
  quests: CrystalQuest[];
}

export function giftWaiting(game: GameState, clear?: QuestFacts): Waiting | null {
  const given = game.given ?? [];
  const weapon = !given.includes('weapon');
  const crystal =
    !weapon &&
    !given.includes('crystal') &&
    game.character.level >= INTRO.firstCrystalLevel;
  const quests = clear ? openQuests(game).filter((q) => questMet(q, clear)) : [];
  if (!weapon && !crystal && quests.length === 0) return null;
  return { weapon, crystal, quests };
}

/** What the collection screen says about the next meeting. */
export function giftSchedule(game: GameState): string {
  const who = LAMPWRIGHT.name;
  const given = game.given ?? [];
  if (!given.includes('weapon')) {
    return `${who} meets you at the mouth of your first cleared descent.`;
  }
  if (!given.includes('crystal')) {
    const away = INTRO.firstCrystalLevel - game.character.level;
    return away > 0
      ? `${who} brings your first crystal at level ${INTRO.firstCrystalLevel} — ${away} to go.`
      : `${who} is waiting at the mouth of your next cleared descent.`;
  }
  return `${who} hands over whatever is owed at the mouth of a cleared descent. Everything left is earned below.`;
}

/** Everything one meeting puts in your hands. Currency has no slot. */
export interface Handover {
  items: Item[];
  currency: Record<string, number>;
}

export function takeHandover(game: GameState, waiting: Waiting): Handover {
  const items: Item[] = [];
  const currency: Record<string, number> = {};

  if (waiting.weapon) {
    game.given = [...(game.given ?? []), 'weapon'];
    const gift = lampwrightWeapon(game);
    if (gift) items.push(gift.item);
  }
  if (waiting.crystal) {
    game.given = [...(game.given ?? []), 'crystal'];
    const crystal = makeCrystal(LAMPWRIGHT.level, LAMPWRIGHT.family);
    // The one arranged roll in the game, and it rides on the crystal so the
    // shard behaves the same way everywhere else.
    crystal.meta.scripted = INTRO.scriptedMod;
    giveGift(game, crystal);
    grant(game.wallet, INTRO.scriptedCurrency, 1);
    currency[INTRO.scriptedCurrency] = 1;
    items.push(crystal);
  }
  // Marked as they are handed over, never at the report.
  for (const quest of waiting.quests) {
    game.quests = [...(game.quests ?? []), quest.id];
    const crystal = makeCrystal(quest.gives.level, quest.gives.family);
    giveGift(game, crystal);
    items.push(crystal);
  }
  return { items, currency };
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

/** What one cleared descent was, for an objective to be asked about. */
export interface QuestFacts {
  set: RunSet;
  /** Seconds it took. */
  elapsed: number;
  /** The crystals it was launched with, already paid their experience. */
  socketed: Item[];
}

export type QuestConditionImpl = (facts: QuestFacts, params: any) => boolean;

/**
 * THIS is the extension point, the same way `CONDITIONS` is for the bench: a
 * new objective is an entry here plus a row in `CRYSTAL_QUESTS`. A clause
 * naming a kind that is not in here is never met, and the demo holds the table
 * to the registry so a typo cannot become a quest nobody can finish.
 */
export const QUEST_CONDITIONS: Record<string, QuestConditionImpl> = {
  danger: (f, p) => f.set.rewards.danger >= p.value,

  composition: (f, p) =>
    ((f.set.composition as Record<string, number>)[p.family] ?? 0) + EPSILON >= (p.share ?? 0),

  crystal_level: (f, p) => f.socketed.some((c) => crystalLevel(c) >= p.value),

  under_seconds: (f, p) => f.elapsed <= p.value,
};

export const questMet = (quest: CrystalQuest, facts: QuestFacts): boolean =>
  quest.need.every((clause) => QUEST_CONDITIONS[clause.kind]?.(facts, clause) === true);

/** The danger a quest asks for, or 0. For harnesses that have to reach it. */
export const questDanger = (quest: CrystalQuest): number =>
  Math.max(0, ...quest.need.filter((c) => c.kind === 'danger').map((c) => Number(c.value) || 0));

/** Still open, in table order: the screen shows them as a ladder. */
export const openQuests = (game: GameState): CrystalQuest[] =>
  CRYSTAL_QUESTS.filter((q) => !questDone(game, q.id));

/** A quest id that no longer exists costs its entry and nothing else. */
export function healQuests(game: GameState): void {
  const held = Array.isArray(game.quests) ? game.quests : [];
  game.quests = held.filter((id) => QUEST_BY_ID[id]);
}
