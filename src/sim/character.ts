/**
 * The character: what persists between runs.
 *
 * Level and XP live here rather than in RunState because they survive a run —
 * the run reports XP earned, the character banks it. When inventory and
 * equipment arrive they belong here too.
 */
import { LEVELLING } from '../data';
import type { Item } from '../types';

/**
 * A skill's own progression.
 *
 * Levels come from USE — the active skill shares whatever XP a run generates
 * — so committing to one skill is what advances its tree. Points spent are
 * `allocated.length`, and the budget is the level.
 */
export interface SkillProgress {
  level: number;
  xp: number;
  allocated: string[];
}

export interface Character {
  /** Chosen on the first run. Shown above the health bar during a map. */
  name: string;
  level: number;
  /** XP banked toward the NEXT level, not lifetime total. */
  xp: number;
  /** Slot id → worn item. Slots with nothing in them are simply absent. */
  equipment: Record<string, Item>;
  skillId: string;
  /** Per-skill levels and tree allocations, keyed by skill id. */
  skills: Record<string, SkillProgress>;
}

export function makeCharacter(
  equipment: Record<string, Item>,
  skillId: string
): Character {
  return { name: 'Wanderer', level: 1, xp: 0, equipment, skillId, skills: {} };
}

/** Progress for a skill, created on first sight. */
export function skillProgress(character: Character, skillId: string): SkillProgress {
  let progress = character.skills[skillId];
  if (!progress) {
    progress = { level: 1, xp: 0, allocated: [] };
    character.skills[skillId] = progress;
  }
  return progress;
}

export const pointsSpent = (p: SkillProgress): number => p.allocated.length;
export const pointsAvailable = (p: SkillProgress): number => p.level - p.allocated.length;

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

/** XP a single monster of this crystal tier is worth. */
export function monsterXp(tier: number): number {
  return Math.max(1, Math.round(LEVELLING.perMonster * Math.pow(LEVELLING.tierScale, tier - 1)));
}

/**
 * Banks XP, levelling up as many times as it covers.
 * Returns how many levels were gained, so the UI can say so.
 */
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
