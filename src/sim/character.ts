/** The character: what persists between runs. A run reports XP, this banks it. */
import {
  ATTRIBUTE_BY_ID,
  ATTRIBUTE_STEP,
  LEVELLING,
  MAIN_SLOT,
  SKILL_BY_ID,
  SKILL_SLOTS,
  SKILL_SLOT_BY_ID,
} from '../data';
import { treePointsFor } from '../skills-tree';
import { TRADE_BY_ID, canAllocateTrade, canDeallocateTrade, tradePointsFor } from '../trades';
import { canAllocateTrial, canDeallocateTrial, trialPointsFor } from '../trials';
import type { Item } from '../types';

/**
 * A skill's own progression. Levels come from USE — only the active skill takes
 * a run's XP — so committing to one skill is what advances its tree.
 */
export interface SkillProgress {
  level: number;
  xp: number;
  allocated: string[];
  /** Node id → chosen option, for nodes that offer one. */
  choices?: Record<string, string>;
}

export interface Character {
  /** Chosen on the first run. Shown above the health bar during a descent. */
  name: string;
  level: number;
  /** XP banked toward the NEXT level, not lifetime total. */
  xp: number;
  /** Slot id → worn item. Slots with nothing in them are simply absent. */
  equipment: Record<string, Item>;
  /** Slot id → skill id, over `SKILL_SLOTS`. An empty slot is simply absent. */
  equipped: Record<string, string>;
  /** Per-skill levels and tree allocations, keyed by skill id. */
  skills: Record<string, SkillProgress>;
  /** Attribute id → points put in. What a character LEVEL bought, spent by
   *  hand on the sheet; the tree is per skill and this is not. */
  attributes: Record<string, number>;
  /** The trade taken up, or null before one is. Survives every skill swap. */
  trade: string | null;
  /** Nodes walked on it, out of a budget character level funds. */
  tradeAllocated: string[];
  /** Trials done, in the order they were done. Its LENGTH is the point budget
   *  for the trials web — a second counter is a number that can disagree. */
  trials: string[];
  /** Nodes walked on the trials web. */
  trialAllocated: string[];
  /** Trials node id -> the option taken on it, for nodes that offer one. */
  trialChoices?: Record<string, string>;
}

export function makeCharacter(
  equipment: Record<string, Item>,
  skillId: string
): Character {
  return {
    name: 'Wanderer',
    level: 1,
    xp: 0,
    equipment,
    equipped: { [MAIN_SLOT]: skillId },
    skills: {},
    attributes: {},
    trade: null,
    tradeAllocated: [],
    trials: [],
    trialAllocated: [],
  };
}

/** Points the trials done have paid, and what is left of them. */
export const trialPointsLeft = (character: Character): number =>
  trialPointsFor(character.trials ?? []) - (character.trialAllocated?.length ?? 0);

/** One node, or nothing when it is not reachable or nothing is spare. */
export function allocateTrial(character: Character, nodeId: string): boolean {
  if (trialPointsLeft(character) <= 0) return false;
  character.trialAllocated ??= [];
  if (!canAllocateTrial(nodeId, character.trialAllocated)) return false;
  character.trialAllocated.push(nodeId);
  return true;
}

/** Refused when it would strand another node, exactly as a tree refund is. */
export function deallocateTrial(character: Character, nodeId: string): boolean {
  if (!canDeallocateTrial(nodeId, character.trialAllocated ?? [])) return false;
  character.trialAllocated = character.trialAllocated.filter((id) => id !== nodeId);
  delete character.trialChoices?.[nodeId];
  return true;
}

/** Points a character level has bought toward a trade, and what is left of them. */
export const tradePointsLeft = (character: Character): number =>
  tradePointsFor(character.level) - (character.tradeAllocated?.length ?? 0);

/**
 * IN PLACE. Taking up a trade for the first time, or swapping to another —
 * which refunds every point, since what a swap costs is gold and the walk.
 */
export function takeUpTrade(character: Character, tradeId: string): boolean {
  if (!TRADE_BY_ID[tradeId] || character.trade === tradeId) return false;
  character.trade = tradeId;
  character.tradeAllocated = [];
  return true;
}

/** One node, or nothing when it is not reachable or nothing is spare. */
export function allocateTrade(character: Character, nodeId: string): boolean {
  const trade = character.trade;
  if (!trade || tradePointsLeft(character) <= 0) return false;
  character.tradeAllocated ??= [];
  if (!canAllocateTrade(trade, nodeId, character.tradeAllocated)) return false;
  character.tradeAllocated.push(nodeId);
  return true;
}

/** Refused when it would strand another node, exactly as a tree refund is. */
export function deallocateTrade(character: Character, nodeId: string): boolean {
  const trade = character.trade;
  if (!trade || !canDeallocateTrade(trade, nodeId, character.tradeAllocated ?? [])) return false;
  character.tradeAllocated = character.tradeAllocated.filter((id) => id !== nodeId);
  return true;
}

/** What is in a slot, or null. Nothing else may read `equipped` directly. */
export const equippedSkill = (character: Character, slotId: string): string | null =>
  character.equipped?.[slotId] ?? null;

/** The skill that swings. Every damage number in the game is this one's. */
export const mainSkillId = (character: Character): string =>
  equippedSkill(character, MAIN_SLOT) ?? '';

/** Which slot a skill goes in, by its category. Null for a monster's. */
export function slotForSkill(skillId: string): string | null {
  const category = SKILL_BY_ID[skillId]?.category;
  if (!category) return null;
  return SKILL_SLOTS.find((s) => s.accepts.includes(category))?.id ?? null;
}

/** IN PLACE. Refuses a skill the slot does not accept. */
export function equipSkill(character: Character, skillId: string): boolean {
  const slot = slotForSkill(skillId);
  if (!slot || !SKILL_SLOT_BY_ID[slot]) return false;
  character.equipped = { ...(character.equipped ?? {}), [slot]: skillId };
  return true;
}

/** Level 1 buys nothing: the first level is the one you start on. */
export const attributePointsFor = (level: number): number =>
  Math.max(0, level - 1) * LEVELLING.attributePointsPerLevel;

export const attributesSpent = (character: Character): number =>
  Object.values(character.attributes ?? {}).reduce((a, b) => a + b, 0);

export const attributePointsLeft = (character: Character): number =>
  attributePointsFor(character.level) - attributesSpent(character);

/** Points spent, which is now what pays: `ATTRIBUTE_STEP` is 1. */
export const attributeSteps = (character: Character, id: string): number =>
  Math.floor((character.attributes?.[id] ?? 0) / ATTRIBUTE_STEP);

/** One point, or nothing when there is none spare. Returns what happened. */
export function spendAttribute(character: Character, id: string): boolean {
  if (!ATTRIBUTE_BY_ID[id] || attributePointsLeft(character) <= 0) return false;
  character.attributes ??= {};
  character.attributes[id] = (character.attributes[id] ?? 0) + 1;
  return true;
}

/** Progress for a skill, created on first sight. */
export function skillProgress(character: Character, skillId: string): SkillProgress {
  let progress = character.skills[skillId];
  if (!progress) {
    progress = { level: 1, xp: 0, allocated: [], choices: {} };
    character.skills[skillId] = progress;
  }
  return progress;
}

/** Capped by the tree, not your level: a tree you can fill in is not a decision. */
export const pointsAvailable = (skillId: string, p: SkillProgress): number =>
  treePointsFor(skillId, p.level) - p.allocated.length;

/** A skill's spare points WITHOUT minting a record for one never opened —
 *  drawing a badge is a read, and a read may not write to the save. */
export const spareTreePoints = (character: Character, skillId: string): number =>
  pointsAvailable(skillId, character.skills[skillId] ?? { level: 1, xp: 0, allocated: [] });

/** Skills use the same curve as the character, so the numbers stay legible. */
export function addSkillXp(character: Character, skillId: string, amount: number): number {
  if (amount <= 0) return 0;
  const progress = skillProgress(character, skillId);
  progress.xp += amount;

  let gained = 0;
  while (progress.xp >= xpToNext(progress.level)) {
    progress.xp -= xpToNext(progress.level);
    progress.level++;
    gained++;
  }
  return gained;
}

/** Everything worn, in no particular order. What stat derivation reads. */
export function equippedItems(character: Character): Item[] {
  return Object.values(character.equipment);
}

/** XP required to get from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  return Math.round(LEVELLING.curveBase * Math.pow(level, LEVELLING.curveExponent));
}

/** XP a single monster at this run power is worth. */
export function monsterXp(power: number): number {
  return Math.max(1, Math.round(LEVELLING.perMonster * Math.pow(LEVELLING.powerScale, power)));
}

/** Banks XP and returns how many levels it covered. */
export function addXp(character: Character, amount: number): number {
  if (amount <= 0) return 0;

  character.xp += amount;
  let gained = 0;

  while (character.xp >= xpToNext(character.level)) {
    character.xp -= xpToNext(character.level);
    character.level++;
    gained++;
  }
  return gained;
}
