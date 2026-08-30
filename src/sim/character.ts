/** The character: what persists between runs. A run reports XP, this banks it. */
import { defaultGearBase, makeGear } from '../economy';
import {
  ATTRIBUTE_BY_ID,
  ATTRIBUTE_STEP,
  GEAR_BASE_BY_ID,
  WEAPON_COUNTS_AS,
  WEAPON_SLOT,
  LEVELLING,
  MAIN_SLOT,
  SKILL_BY_ID,
  SKILL_SLOTS,
  SKILL_SLOT_BY_ID,
} from '../data';
import { treePointsFor } from '../skills-tree';
import { TRADE_BY_ID, canAllocateTrade, canDeallocateTrade, tradePointsFor } from '../trades';
import { canAllocateTrial, canDeallocateTrial, trialPointsFor } from '../trials';
import type { Item, SkillDef, SkillSlotDef } from '../types';

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
  paidCampaign?: boolean; // the Lampwright has handed the campaign over. Once
  /** Nodes walked on it, out of a budget character level funds. */
  tradeAllocated: string[];
  /** Trials done, in the order they were done. Its LENGTH is the point budget
   *  for the trials web — a second counter is a number that can disagree. */
  trials: string[];
  /** Rungs CLEARED per zone, keyed by theme. See `src/ladder.ts`. */
  climbed: Record<string, number>;
  /** Nodes walked on the trials web. */
  trialAllocated: string[];
  /** Trials node id -> the option taken on it, for nodes that offer one. */
  trialChoices?: Record<string, string>;
}

/** Every family a skill will be swung with, resolving a group to its members. */
export const weaponFamilies = (skill: SkillDef): string[] =>
  !skill.requires
    ? []
    : Object.keys(WEAPON_COUNTS_AS).filter((f) => WEAPON_COUNTS_AS[f].includes(skill.requires!));

/** Whether what is in your hand can swing this skill. A spell requires nothing
 *  and is cast bare-handed; a skill that names a weapon needs one IN your hand. */
export function weaponFits(skill: SkillDef | undefined, held: Item | null): boolean {
  if (!skill?.requires) return true;
  const family = held ? GEAR_BASE_BY_ID[held.base]?.family : undefined;
  return family !== undefined && weaponFamilies(skill).includes(family);
}

/** What a skill must be swung with, in words. `requires` names a family or a
 *  group; a group is already a word and a family needs one. */
const WEAPON_WORDS: Record<string, string> = {
  melee: 'a melee weapon',
  twohand: 'a two-handed weapon',
  sword2h: 'a two-handed sword',
  mace2h: 'a two-handed mace',
};
export const weaponWanted = (skill: SkillDef): string =>
  WEAPON_WORDS[skill.requires ?? ''] ?? `a ${skill.requires}`;

/** Why this build cannot go down, or null. A skill and the hand it is swung
 *  with may DISAGREE — refusing the swap both ways is a deadlock you can only
 *  leave through a spell — so the Fissure reads the mismatch here instead.
 *  Every equipped slot: a mover may name a weapon as readily as a main. */
export function weaponRefusal(character: Character): string | null {
  const held = character.equipment?.[WEAPON_SLOT] ?? null;
  for (const slot of SKILL_SLOTS) {
    const skill = SKILL_BY_ID[character.equipped?.[slot.id] ?? ''];
    if (!skill || weaponFits(skill, held)) continue;
    const holding = held ? held.name : 'nothing';
    return `${skill.name} needs ${weaponWanted(skill)}. You are holding ${holding}.`;
  }
  return null;
}

export function makeCharacter(
  equipment: Record<string, Item>,
  skillId: string
): Character {
  // Never MADE holding a weapon its own skill refuses; an empty hand stays empty.
  const skill = SKILL_BY_ID[skillId];
  const held = equipment[WEAPON_SLOT] ?? null;
  if (held && !weaponFits(skill, held)) {
    const want = defaultGearBase('weapon', held?.ilvl ?? 1, weaponFamilies(skill)[0]);
    if (want) {
      equipment = { ...equipment, [WEAPON_SLOT]: makeGear(want.id, held?.ilvl ?? 1) };
      // Two hands empties the other, as `handClash` would.
      if ((want.hands ?? 1) > 1) delete equipment.offhand;
    }
  }

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
    climbed: {},
    trialAllocated: [],
  };
}

/** Points the trials done have paid, and what is left of them. */
export const trialPointsLeft = (character: Character): number =>
  trialPointsFor(character) - (character.trialAllocated?.length ?? 0);

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

/** IN PLACE, and ONCE: a trade is taken up and never swapped. */
/** WHO MAY HOLD TWO WEAPONS: one read, so nothing can disagree with it. */
export const canDualWield = (character: Character): boolean =>
  !!(character.trade && TRADE_BY_ID[character.trade]?.spec.dualWields);

export function takeUpTrade(character: Character, tradeId: string): boolean {
  // ONCE. Who you are is chosen when you come down here and it does not move
  // again — the user's call. The WALK is still respecced a node at a time.
  if (!TRADE_BY_ID[tradeId] || character.trade) return false;
  character.trade = tradeId;
  character.tradeAllocated = [];
  return true;
}

/** Every attribute point back. The one allocation with no click to undo it —
 *  a tree node refunds itself and so does a trade node — so this is the click,
 *  and what it costs is the caller's to charge. */
export function forgetAttributes(character: Character): boolean {
  const spent = Object.values(character.attributes ?? {}).reduce((a, b) => a + b, 0);
  if (spent <= 0) return false;
  character.attributes = {};
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

/** Which SHELF a skill comes off. Not where one LANDS — with three passive
 *  slots that is `targetSlotFor`. Null for a monster's. */
export function slotForSkill(skillId: string): string | null {
  const category = SKILL_BY_ID[skillId]?.category;
  if (!category) return null;
  return SKILL_SLOTS.find((s) => s.accepts.includes(category))?.id ?? null;
}

/** The slots this character has actually reached. */
export const openSlots = (character: Character): SkillSlotDef[] =>
  SKILL_SLOTS.filter((s) => character.level >= (s.unlocksAt ?? 1));

export const slotIsOpen = (character: Character, slotId: string): boolean =>
  character.level >= (SKILL_SLOT_BY_ID[slotId]?.unlocksAt ?? 1);

/** Where it would land: the slot it is in, else the first EMPTY one it fits,
 *  else the first it fits at all. Null when nothing open takes it. */
export function targetSlotFor(character: Character, skillId: string): string | null {
  const category = SKILL_BY_ID[skillId]?.category;
  if (!category) return null;
  const fits = openSlots(character).filter((s) => s.accepts.includes(category));
  const held = fits.find((s) => equippedSkill(character, s.id) === skillId);
  if (held) return held.id;
  return (fits.find((s) => !equippedSkill(character, s.id)) ?? fits[0])?.id ?? null;
}

/** IN PLACE. Refuses a slot the skill does not fit or the level has not opened;
 *  one held elsewhere MOVES, since two slots holding one passive would merge
 *  its grants into itself. */
export function equipSkill(character: Character, skillId: string, slotId?: string): boolean {
  const category = SKILL_BY_ID[skillId]?.category;
  if (!category) return false;
  const slot = slotId ?? targetSlotFor(character, skillId);
  if (!slot) return false;
  const def = SKILL_SLOT_BY_ID[slot];
  if (!def || !def.accepts.includes(category) || !slotIsOpen(character, slot)) return false;
  const held = { ...(character.equipped ?? {}) };
  for (const [id, what] of Object.entries(held)) {
    if (what === skillId && id !== slot) delete held[id];
  }
  held[slot] = skillId;
  character.equipped = held;
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

  // The cap is on the LEVEL, never the bank: xp past it buys nothing and the
  // number still climbs, so a report never reads as a loss.
  while (character.level < LEVELLING.maxLevel && character.xp >= xpToNext(character.level)) {
    character.xp -= xpToNext(character.level);
    character.level++;
    gained++;
  }
  return gained;
}
