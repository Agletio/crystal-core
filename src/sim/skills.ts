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
  /** How many times this user has used this skill, counting from zero. */
  castIndex: number;
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
  ailment(
    target: Entity,
    multiplier: number,
    seconds: number,
    spread?: { radius: number; generation: number }
  ): void;
  /**
   * Scales a base radius by the user's Area of Effect.
   *
   * The stat increases AREA, so the radius grows by the square root — +100%
   * area is a 1.41x radius, not 2x. Every behaviour goes through this so two
   * area skills can never disagree about what the stat means.
   */
  areaRadius(base: number): number;
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

/**
 * How far the tree's targeting grants reach, in tiles. FIXED, on purpose.
 *
 * "Nearest other enemy" with no distance limit is not a talent, it is a
 * teleport: the old fork node happily struck something on the far side of the
 * map, through walls, because nearest-of-all-enemies is still nearest when
 * the nearest is thirty tiles away. Every one of these is a hard radius, and
 * none of them scales with Area of Effect — a build that stacked area would
 * otherwise turn "one more target" into "the whole room".
 */
const REACH = {
  /** Extra targets, measured from the primary. */
  spread: 3.5,
  /** Each leap, measured from the last thing hit. */
  chain: 4.5,
  /** How far past the primary a pierced shot carries. */
  pierce: 4.5,
  /** Half-width of the pierce corridor. Wider than a body, narrower than a cone. */
  corridor: 0.85,
};

/** Fractions applied to secondary hits unless a node says otherwise. */
const FALLOFF = { extra: 0.7, chain: 0.7, pierce: 0.7 };

const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' ? v : fallback;

/**
 * Perpendicular distance from `e` to the ray from `origin` through `through`,
 * and how far along that ray it sits. Behind the origin is negative.
 */
function alongRay(
  origin: { x: number; y: number },
  through: { x: number; y: number },
  e: Entity
): { along: number; off: number } {
  const dx = through.x - origin.x;
  const dy = through.y - origin.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return { along: 0, off: Math.hypot(e.x - origin.x, e.y - origin.y) };
  const ux = dx / len;
  const uy = dy / len;
  const px = e.x - origin.x;
  const py = e.y - origin.y;
  const along = px * ux + py * uy;
  return { along, off: Math.abs(px * uy - py * ux) };
}

export const SKILL_BEHAVIOURS: Record<string, SkillBehaviour> = {
  /** One target, full damage. The floor every other behaviour builds on. */
  single_target: (use) => {
    use.hit(use.primary, 1);

    // Fork and the like: nearest others, full damage, WITHIN REACH.
    const extra = (use.grants.extraTargets as number) ?? 0;
    if (extra > 0) {
      const others = use.enemies
        .filter((e) => e !== use.primary && separation(use.primary, e) <= REACH.spread)
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
   * A thrown ball of fire, and everything a tree can make of one.
   *
   * Bare, this is `single_target` with a longer arm. Everything else here is
   * switched on by a node, and the order matters: the thing you aimed at is
   * hit first, then whatever the shot passed through, then whatever it leapt
   * to, then anything close enough to be caught by the spread — and a burst,
   * if it bursts, goes off around every one of them.
   *
   * One rule holds the whole thing together: nothing is hit twice by the same
   * cast. Without it, pierce and chain and spread would all find the same
   * clump of three enemies and stack on them, and the talents that are meant
   * to make you hit MORE things would just make you hit the same things
   * harder. Bursts are the exception — an explosion is area damage, and area
   * damage overlapping is the point of area damage.
   *
   * grants: critBurn, burnMultiplier, burnDuration, burnSpread, explode,
   *         explodeRadius, explodeMultiplierAdd, explodeOnKill, pierce,
   *         pierceDamage, chains, chainDamage, extraTargets,
   *         extraTargetDamage, moreVsBurning, moreClose, moreFar, moreVsLow,
   *         everyNth
   */
  projectile: (use) => {
    const g = use.grants;
    const kind = use.skill.vfxKind ?? 'bolt';

    // --- what this particular cast is worth, before any target is chosen ---
    const nth = g.everyNth as { n: number; multiplier: number } | undefined;
    const castMultiplier = nth && (use.castIndex + 1) % nth.n === 0 ? nth.multiplier : 1;

    const burn = g.critBurn as { multiplier: number; seconds: number } | undefined;
    const burnPower = num(g.burnMultiplier, 1);
    const burnTime = num(g.burnDuration, 1);
    const burnSpread = num(g.burnSpread, 0);

    const explode = g.explode as { radius: number; multiplier: number } | undefined;
    const onKill = g.explodeOnKill as { radius: number; multiplier: number } | undefined;

    /**
     * Per-target multipliers. Each one asks a question about the enemy in
     * front of you rather than about your sheet, which is what makes them
     * choices — Close Quarters is worthless on a build that never closes.
     */
    const conditional = (target: Entity): number => {
      let m = 1;
      const burning = g.moreVsBurning as number | undefined;
      if (burning && target.ailments.length > 0) m *= 1 + burning;

      const close = g.moreClose as { within: number; more: number } | undefined;
      if (close && separation(use.user, target) <= close.within) m *= 1 + close.more;

      const far = g.moreFar as { beyond: number; more: number } | undefined;
      if (far && separation(use.user, target) > far.beyond) m *= 1 + far.more;

      const low = g.moreVsLow as { below: number; more: number } | undefined;
      if (low && target.life <= target.stats.maxLife * low.below) m *= 1 + low.more;
      return m;
    };

    const struck = new Set<Entity>();

    /** Area damage around a point. Overlaps freely; see the note above. */
    const blast = (at: Entity, radius: number, multiplier: number): void => {
      if (multiplier <= 0 || radius <= 0) return;
      for (const enemy of use.enemies) {
        if (enemy === at || enemy.dead) continue;
        if (separation(at, enemy) > radius) continue;
        use.hit(enemy, multiplier * castMultiplier * conditional(enemy));
      }
      use.vfx('burst', [{ x: at.x, y: at.y }, { x: at.x + radius, y: at.y }], 0.32);
    };

    const strike = (target: Entity, falloff: number): boolean => {
      if (target.dead || struck.has(target)) return false;
      struck.add(target);
      use.hit(target, falloff * castMultiplier * conditional(target));

      // Kindling: the cast that WOULD have crit sets it alight instead. The
      // crit itself is suppressed upstream, in the sim — a behaviour cannot
      // un-crit a hit it has already asked for.
      if (burn && use.crit) {
        use.ailment(
          target,
          burn.multiplier * burnPower * falloff,
          burn.seconds * burnTime,
          burnSpread > 0 ? { radius: burnSpread, generation: 0 } : undefined
        );
      }

      if (explode) {
        blast(
          target,
          use.areaRadius(explode.radius * num(g.explodeRadius, 1)),
          (explode.multiplier + num(g.explodeMultiplierAdd, 0)) * falloff
        );
      }
      // Checked after the burst, because the burst is what usually kills it.
      if (onKill && target.dead) {
        blast(target, use.areaRadius(onKill.radius), onKill.multiplier);
      }
      return true;
    };

    // --- the shot ---------------------------------------------------------
    strike(use.primary, 1);
    use.vfx(kind, [
      { x: use.user.x, y: use.user.y },
      { x: use.primary.x, y: use.primary.y },
    ]);

    // Pierce: straight on, through whatever is standing behind it. This is
    // the one grant that cares about GEOMETRY rather than proximity — that is
    // what makes it different from chain, which would otherwise be the same
    // talent with a different name on an auto-targeting skill.
    const pierce = num(g.pierce, 0);
    let last = use.primary;
    if (pierce > 0) {
      const behind = use.enemies
        .filter((e) => e !== use.primary && !e.dead && !struck.has(e))
        .map((e) => ({ e, ...alongRay(use.user, use.primary, e) }))
        .filter(
          (c) =>
            c.off <= REACH.corridor &&
            c.along > separation(use.user, use.primary) &&
            c.along <= separation(use.user, use.primary) + REACH.pierce
        )
        .sort((a, b) => a.along - b.along)
        .slice(0, pierce);

      for (const { e } of behind) {
        if (!strike(e, num(g.pierceDamage, FALLOFF.pierce))) continue;
        use.vfx(kind, [{ x: last.x, y: last.y }, { x: e.x, y: e.y }]);
        last = e;
      }
    }

    // Chain: from the last thing hit to the nearest thing that hasn't been.
    const chains = num(g.chains, 0);
    for (let i = 0; i < chains; i++) {
      const next = use.enemies
        .filter((e) => !e.dead && !struck.has(e) && separation(last, e) <= REACH.chain)
        .sort((a, b) => separation(last, a) - separation(last, b))[0];
      if (!next) break;
      const from = last;
      if (!strike(next, num(g.chainDamage, FALLOFF.chain))) break;
      use.vfx(kind, [{ x: from.x, y: from.y }, { x: next.x, y: next.y }]);
      last = next;
    }

    // Spread: everything else close to what you aimed at.
    const extra = num(g.extraTargets, 0);
    if (extra > 0) {
      const others = use.enemies
        .filter(
          (e) => !e.dead && !struck.has(e) && separation(use.primary, e) <= REACH.spread
        )
        .sort((a, b) => separation(use.primary, a) - separation(use.primary, b))
        .slice(0, extra);

      for (const other of others) {
        if (!strike(other, num(g.extraTargetDamage, FALLOFF.extra))) continue;
        use.vfx(kind, [
          { x: use.user.x, y: use.user.y },
          { x: other.x, y: other.y },
        ]);
      }
    }
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
   * No hit at all — drops a circle of poison centred on the target.
   *
   * There is no target cap: the circle poisons whatever is standing in it, so
   * the way to poison more things is to make the circle bigger. That is the
   * whole reason this skill wants Area of Effect, and a cap would have quietly
   * made the stat worthless past the fifth enemy.
   *
   * params: { radius, duration }
   * grants: { contagionRadius } — see Contagion in the tree.
   */
  ailment_burst: (use) => {
    const duration = (use.skill.params?.duration as number) ?? 10;
    const radius = use.areaRadius((use.skill.params?.radius as number) ?? 1.6);

    // Contagion turns the poison itself infectious: a critical TICK plants a
    // fresh circle around whatever it ticked on. The jump inherits Area of
    // Effect too, so investing in area widens both the cast and every jump.
    const contagion = use.grants.contagionRadius as number | undefined;
    const spread = contagion
      ? { radius: use.areaRadius(contagion), generation: 0 }
      : undefined;

    const caught = use.enemies.filter((e) => separation(use.primary, e) <= radius);
    // The primary is always poisoned, even if the radius somehow excludes it.
    if (!caught.includes(use.primary)) caught.push(use.primary);

    for (const enemy of caught) use.ailment(enemy, 1, duration, spread);

    // The field carries its true radius as a second point, so the renderer
    // draws exactly what the sim used — you can see what you did and did not
    // catch, and see it grow as Area of Effect goes up.
    //
    // It lives for half a cast, never a fixed time. At 0.85s against a 1.11s
    // cadence the circle was on screen 77% of the time, which stops reading as
    // "a spell landed here" and starts reading as an aura the caster is
    // wearing — and any cast speed at all would have closed the gap entirely.
    // Tying it to the user's own rate keeps the gap at every build speed.
    const cadence = 1 / Math.max(0.1, use.user.stats.attacksPerSecond);
    use.vfx(
      use.skill.vfxKind ?? 'blight_field',
      [
        { x: use.primary.x, y: use.primary.y },
        { x: use.primary.x + radius, y: use.primary.y },
      ],
      Math.min(0.75, cadence * 0.5)
    );
  },
};
