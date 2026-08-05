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
import type { Vec2 } from './grid';

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
   * Behaviour switches from the skill tree.
   *
   * Rolled once per use rather than per target, so "crits spread" is a
   * property of the cast — which is what makes it feel like an event instead
   * of a per-enemy coin flip.
   */
  grants: Record<string, unknown>;
  /** Whether this whole use crit. */
  crit: boolean;
  /**
   * Deal this skill's damage to one target.
   * `multiplier` is relative to the skill's own damage, so 0.6 means a
   * weakened chain jump rather than 60% of some other number.
   */
  hit(target: Entity, multiplier: number): void;
  /**
   * Apply a damage-over-time stack.
   *
   * `multiplier` is the TOTAL damage across the whole duration, relative to
   * the skill's damage — so 1.0 over 10 seconds is one hit's worth, spread
   * thin. The sim divides it out; behaviours never deal in per-tick numbers.
   */
  ailment(target: Entity, multiplier: number, seconds: number): void;
  /**
   * Emit a visual event. Only the skill knows the SHAPE of what happened —
   * a chain's arc is A→B→C, which no renderer could reconstruct from the
   * damage alone. Points are in tile units.
   */
  vfx(kind: string, points: Vec2[], ttl?: number): void;
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

    // Fork and the like: nearest others, full damage.
    const extra = (use.grants.extraTargets as number) ?? 0;
    if (extra > 0) {
      const others = use.enemies
        .filter((e) => e !== use.primary)
        .sort((a, b) => separation(use.primary, a) - separation(use.primary, b))
        .slice(0, extra);
      for (const other of others) {
        use.hit(other, 1);
        use.vfx(use.skill.vfxKind ?? 'swing', [
          { x: use.primary.x, y: use.primary.y },
          { x: other.x, y: other.y },
        ]);
      }
    }

    // The skill names its visual; the renderer decides what that looks like.
    use.vfx(use.skill.vfxKind ?? 'swing', [
      { x: use.user.x, y: use.user.y },
      { x: use.primary.x, y: use.primary.y },
    ]);
  },

  /**
   * Full damage to the target, a fraction to everything else in reach.
   *
   * Centred on the USER rather than the target, because it models a swing
   * around the attacker — which is also what the arc visual shows. Centring
   * it on the target would let you clip enemies behind a monster you're
   * barely touching.
   *
   * params: { splashRadius, splashMultiplier }
   */
  cleave: (use) => {
    const radius = (use.skill.params?.splashRadius as number) ?? 2.2;
    // Whirlwind and the like override the splash fraction outright.
    const splash =
      (use.grants.splashMultiplier as number) ??
      (use.skill.params?.splashMultiplier as number) ??
      0.1;

    use.hit(use.primary, 1);

    if (splash > 0) {
      for (const enemy of use.enemies) {
        if (enemy === use.primary) continue;
        if (separation(use.user, enemy) <= radius) use.hit(enemy, splash);
      }
    }

    use.vfx(use.skill.vfxKind ?? 'swing', [
      { x: use.user.x, y: use.user.y },
      { x: use.primary.x, y: use.primary.y },
    ]);
  },

  /**
   * No hit at all — spreads a damage-over-time stack to everything near the
   * primary target.
   *
   * Nearest-first up to a cap, so it reliably covers the knot of enemies you
   * are standing in rather than scattering across whichever ones the list
   * happened to hold.
   *
   * params: { targets, radius, duration }
   */
  ailment_burst: (use) => {
    const base = (use.skill.params?.targets as number) ?? 5;
    const radius = (use.skill.params?.radius as number) ?? 3;
    const duration = (use.skill.params?.duration as number) ?? 10;

    // Contagion: a critical cast spreads further. Crit is rolled per USE, so
    // this is an event you notice rather than a per-enemy coin flip — which
    // is what makes crit chance worth stacking on a skill that never "hits".
    const spread = use.crit ? ((use.grants.spreadOnCrit as number) ?? 0) : 0;
    const cap = base + spread;

    const inRange = use.enemies
      .filter((e) => separation(use.primary, e) <= radius)
      .sort((a, b) => separation(use.primary, a) - separation(use.primary, b))
      .slice(0, cap);

    // The primary is always poisoned, even if the radius somehow excludes it.
    if (!inRange.includes(use.primary)) inRange.unshift(use.primary);

    for (const enemy of inRange.slice(0, cap)) {
      use.ailment(enemy, 1, duration);
      use.vfx('blight', [{ x: enemy.x, y: enemy.y }], 0.5);
    }

    use.vfx(use.skill.vfxKind ?? 'swing', [
      { x: use.user.x, y: use.user.y },
      { x: use.primary.x, y: use.primary.y },
    ]);
  },
};
