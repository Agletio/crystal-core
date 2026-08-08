/**
 * Skill delivery registry — the extension point for combat, same pattern as
 * EFFECTS in crafting.ts. A skill is a data entry in SKILLS naming a behaviour
 * here; new code is only needed for a genuinely new KIND of delivery.
 *
 * A behaviour never touches the sim. It gets candidate targets and a `hit`
 * callback and decides who is hit and for how much; damage numbers, crit,
 * armour, death and XP are the sim's business.
 */
import { Rng } from '../rng';
import type { SkillDef } from '../types';
import type { Entity } from './run';
import type { Vec2 } from './grid';

export interface SkillUse {
  skill: SkillDef;
  user: Entity;
  primary: Entity; // what triggered the use, and the origin for area effects
  enemies: Entity[]; // every living enemy on the map. Filter it yourself
  rng: Rng;
  grants: Record<string, unknown>; // behaviour switches from the skill tree
  crit: boolean; // whether this whole use crit
  castIndex: number; // uses so far by this user, from zero
  /** `multiplier` is relative to THIS skill's damage, not to anything else. */
  hit(target: Entity, multiplier: number): void;
  /**
   * `multiplier` is TOTAL damage across the whole duration — 1.0 over 10s is
   * one hit's worth spread thin. Behaviours never deal in per-tick numbers.
   */
  ailment(
    target: Entity,
    multiplier: number,
    seconds: number,
    spread?: { radius: number; generation: number }
  ): void;
  /** Area of Effect grows AREA, so radius goes by the square root. */
  areaRadius(base: number): number;
  /** Points are in tile units. Only the skill knows the shape of what it did. */
  vfx(kind: string, points: Vec2[], ttl?: number): void;
}

export type SkillBehaviour = (use: SkillUse) => void;

/** Distance between two entities, in tiles. */
export function separation(a: Entity, b: Entity): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * How far the tree's targeting grants reach, in tiles. Hard limits, and none
 * of them scale: "nearest other enemy" with no distance limit is a teleport,
 * and area scaling would turn "one more target" into "the whole room".
 */
const REACH = {
  spread: 3.5, // extra targets, from the primary
  chain: 4.5, // each leap, from the last thing hit
  pierce: 4.5, // how far past the primary a pierced shot carries
  corridor: 0.85, // half-width of the pierce corridor
};

/** Fractions applied to secondary hits unless a node says otherwise. */
const FALLOFF = { extra: 0.7, chain: 0.7, pierce: 0.7 };

const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' ? v : fallback;

/** Distance along and off the ray origin→through. Behind the origin is negative. */
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

    use.vfx(use.skill.vfxKind ?? 'swing', [
      { x: use.user.x, y: use.user.y },
      { x: use.primary.x, y: use.primary.y },
    ]);
  },

  /**
   * A thrown ball of fire, and everything a tree can make of one. Bare, it is
   * `single_target` with a longer arm; order matters — aimed-at, then pierced,
   * then leapt-to, then spread, with a burst around each.
   *
   * Nothing is hit twice by one cast. Without that, pierce and chain and spread
   * all find the same clump and stack on it, and talents meant to make you hit
   * MORE things just make you hit the same things harder. Bursts are exempt:
   * overlapping is what area damage is for.
   */
  projectile: (use) => {
    const g = use.grants;
    const kind = use.skill.vfxKind ?? 'bolt';

    // What this cast is worth, before any target is chosen.
    const nth = g.everyNth as { n: number; multiplier: number } | undefined;
    const castMultiplier = nth && (use.castIndex + 1) % nth.n === 0 ? nth.multiplier : 1;

    const burn = g.critBurn as { multiplier: number; seconds: number } | undefined;
    const burnPower = num(g.burnMultiplier, 1);
    const burnTime = num(g.burnDuration, 1);
    const burnSpread = num(g.burnSpread, 0);

    const explode = g.explode as { radius: number; multiplier: number } | undefined;
    const onKill = g.explodeOnKill as { radius: number; multiplier: number } | undefined;

    /** Each asks about the enemy in front of you, not about your sheet. */
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

    /** Overlaps freely — see the note above. */
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

      // The crit itself is suppressed in the sim: a behaviour cannot un-crit
      // a hit it has already asked for.
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

    // The one grant that cares about GEOMETRY rather than proximity, which is
    // what keeps it distinct from chain on an auto-targeting skill.
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
   * Full damage to the target, a fraction to everything in reach of the USER —
   * it is a swing. params: { splashRadius, splashMultiplier }
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
   * No hit at all — a circle of poison on the target, with no target cap, so
   * the way to poison more is a bigger circle.
   * params: { radius, duration }   grants: { contagionRadius }
   */
  ailment_burst: (use) => {
    const duration = (use.skill.params?.duration as number) ?? 10;
    const radius = use.areaRadius((use.skill.params?.radius as number) ?? 1.6);

    // A critical TICK plants a fresh circle around whatever it ticked on. The
    // jump inherits Area of Effect, so area widens the cast and every jump.
    const contagion = use.grants.contagionRadius as number | undefined;
    const spread = contagion
      ? { radius: use.areaRadius(contagion), generation: 0 }
      : undefined;

    const caught = use.enemies.filter((e) => separation(use.primary, e) <= radius);
    // The primary is always poisoned, even if the radius somehow excludes it.
    if (!caught.includes(use.primary)) caught.push(use.primary);

    for (const enemy of caught) use.ailment(enemy, 1, duration, spread);

    // Second point IS the radius, so the renderer draws what the sim used.
    // Half a cast, never a fixed time: a fixed one is on screen most of the
    // time at any real cast speed, and reads as an aura rather than a spell.
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
