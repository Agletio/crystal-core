/**
 * Skill delivery registry.
 *
 * THIS is the extension point for combat, and it's deliberately the same
 * pattern as EFFECTS in crafting.ts: a skill is a data entry in SKILLS
 * (data.ts) that names a behaviour here. You only write code when you invent
 * a genuinely new *kind* of delivery — and then every future skill can
 * compose it.
 *
 * A behaviour never touches the sim directly. It gets candidate targets and a
 * `hit` callback, and decides who gets hit and for how much. Damage numbers,
 * crit, armour, death and XP are the sim's business, not the skill's.
 *
 * Sketches of what slots in here later, none of which need sim changes:
 *
 *   chain:        hit primary, then repeatedly the nearest unhit enemy within
 *                 params.chainRange, up to params.chains, multiplier decaying
 *                 by params.falloff each jump.
 *   ground_slam:  hit every enemy within params.radius of the user.
 *   projectile:   fire params.count lines toward the primary, hitting the
 *                 first enemy each one meets.
 *
 * All three are a handful of lines because targeting is the only thing that
 * differs between them.
 */
import { Rng } from '../rng';
import type { SkillDef } from '../types';
import type { Entity } from './run';

export interface SkillUse {
  skill: SkillDef;
  /** Who is using it. */
  user: Entity;
  /** The target that triggered the use — the natural origin for area effects. */
  primary: Entity;
  /** Every living enemy on the map. Filter it yourself. */
  enemies: Entity[];
  rng: Rng;
  /**
   * Deal this skill's damage to one target.
   * `multiplier` is relative to the skill's own damage, so 0.6 means a
   * weakened chain jump rather than 60% of some other number.
   */
  hit(target: Entity, multiplier: number): void;
}

export type SkillBehaviour = (use: SkillUse) => void;

/** Distance between two entities, in tiles. */
export function separation(a: Entity, b: Entity): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export const SKILL_BEHAVIOURS: Record<string, SkillBehaviour> = {
  /** One target, full damage. The floor every other behaviour builds on. */
  single_target: (use) => {
    use.hit(use.primary, 1);
  },
};
