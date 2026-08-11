/** The character: what persists between runs. A run reports XP, this banks it. */
import { ATTRIBUTE_BY_ID, ATTRIBUTE_STEP, LEVELLING } from '../data';
import { treePointsFor } from '../skills-tree';
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
  skillId: string;
  /** Per-skill levels and tree allocations, keyed by skill id. */
  skills: Record<string, SkillProgress>;
  /** Attribute id → points put in. What a character LEVEL bought, spent by
   *  hand on the sheet; the tree is per skill and this is not. */
  attributes: Record<string, number>;
}

export function makeCharacter(
  equipment: Record<string, Item>,
  skillId: string
): Character {
  return { name: 'Wanderer', level: 1, xp: 0, equipment, skillId, skills: {}, attributes: {} };
}

/** Level 1 buys nothing: the first level is the one you start on. */
export const attributePointsFor = (level: number): number =>
  Math.max(0, level - 1) * LEVELLING.attributePointsPerLevel;

export const attributesSpent = (character: Character): number =>
  Object.values(character.attributes ?? {}).reduce((a, b) => a + b, 0);

export const attributePointsLeft = (character: Character): number =>
  attributePointsFor(character.level) - attributesSpent(character);

/** FLOORS: a part-step is points banked toward one, and pays nothing yet. */
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

export const pointsSpent = (p: SkillProgress): number => p.allocated.length;

/** Capped by the tree, not your level: a tree you can fill in is not a decision. */
export const pointsAvailable = (p: SkillProgress): number =>
  treePointsFor(p.level) - p.allocated.length;

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
