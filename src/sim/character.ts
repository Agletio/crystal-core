/**
 * The character: what persists between runs.
 *
 * Level and XP live here rather than in RunState because they survive a run —
 * the run reports XP earned, the character banks it. When inventory and
 * equipment arrive they belong here too.
 */
import { LEVELLING } from '../data';
import type { Item } from '../types';

export interface Character {
  level: number;
  /** XP banked toward the NEXT level, not lifetime total. */
  xp: number;
  /** Slot id → worn item. Slots with nothing in them are simply absent. */
  equipment: Record<string, Item>;
  skillId: string;
}

export function makeCharacter(
  equipment: Record<string, Item>,
  skillId: string
): Character {
  return { level: 1, xp: 0, equipment, skillId };
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
