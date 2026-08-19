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
import { ailmentSeconds } from './stats';
import { MELEE, PROJECTILE } from '../data';
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

/** Distance between two entities' CENTRES, in tiles. */
export function separation(a: Entity, b: Entity): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Whether a circle of `radius` drawn around `at` touches `enemy` AT ALL.
 *
 * Every area is drawn as that circle, so this has to be the body it overlaps
 * rather than the centre it contains — a ring visibly over a monster that took
 * no damage is the game contradicting the only picture of the rule it gives
 * you. Only the victim's body counts: the circle is a geometric radius from a
 * point, not a second body.
 */
export function within(at: Entity, enemy: Entity, radius: number): boolean {
  return separation(at, enemy) - enemy.radius <= radius;
}

const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' ? v : fallback;

const IMPACT_TTL = 0.8; // what a shot LEAVES boils up and breaks apart, and outlives the shot

/**
 * Which enemies the Projectiles past the first take. Nearest by default; a node
 * may widen the Spread and turn the pick around, which is the only way a wider
 * one is worth anything in a room already full inside the bare radius.
 */
function spreadTargets(use: SkillUse, from: Entity[], count: number): Entity[] {
  const reach = PROJECTILE.spread * num(use.grants.spreadRange, 1);
  const far = use.grants.spreadFar === true;
  return from
    .filter((e) => separation(use.primary, e) <= reach)
    .sort((a, b) => {
      const d = separation(use.primary, a) - separation(use.primary, b);
      return far ? -d : d;
    })
    .slice(0, count);
}

// --- the shared vocabulary --------------------------------------------------
// A behaviour opts into a grant by calling these, and the demo holds each tree
// to what its own behaviour actually reads.

/** What this cast is worth before any target is chosen. */
export function castScale(grants: Record<string, unknown>, castIndex: number): number {
  const nth = grants.everyNth as { n: number; multiplier: number } | undefined;
  return nth && (castIndex + 1) % nth.n === 0 ? nth.multiplier : 1;
}

/** Each asks about the enemy in front of you, not about your sheet. */
export function targetScale(use: SkillUse, target: Entity): number {
  const g = use.grants;
  let m = 1;

  const ailing = g.moreVsAiling as number | undefined;
  if (ailing && target.ailments.length > 0) m *= 1 + ailing;

  const close = g.moreClose as { within: number; more: number } | undefined;
  if (close && separation(use.user, target) <= close.within) m *= 1 + close.more;

  const far = g.moreFar as { beyond: number; more: number } | undefined;
  if (far && separation(use.user, target) > far.beyond) m *= 1 + far.more;

  const low = g.moreVsLow as { below: number; more: number } | undefined;
  if (low && target.life <= target.stats.maxLife * low.below) m *= 1 + low.more;

  const full = g.moreVsFull as { above: number; more: number } | undefined;
  if (full && target.life >= target.stats.maxLife * full.above) m *= 1 + full.more;
  return m;
}

/** Overlaps freely: overlapping is what area damage is for. */
export function blastAround(
  use: SkillUse,
  at: Entity,
  radius: number,
  multiplier: number,
  scale: (target: Entity) => number
): void {
  if (multiplier <= 0 || radius <= 0) return;
  for (const enemy of use.enemies) {
    if (enemy === at || enemy.dead) continue;
    if (!within(at, enemy, radius)) continue;
    use.hit(enemy, multiplier * scale(enemy));
  }
  use.vfx('burst', [{ x: at.x, y: at.y }, { x: at.x + radius, y: at.y }], 0.32);
}

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
  /** One target, full damage — the floor the rest build on. */
  single_target: (use) => {
    const castMultiplier = castScale(use.grants, use.castIndex);
    const scale = (e: Entity) => castMultiplier * targetScale(use, e);
    use.hit(use.primary, scale(use.primary));

    const extra = (use.grants.extraTargets as number) ?? 0;
    if (extra > 0) {
      const others = spreadTargets(use, use.enemies.filter((e) => e !== use.primary), extra);
      for (const other of others) {
        use.hit(other, scale(other));
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
    const impact = use.skill.impact;

    const castMultiplier = castScale(g, use.castIndex);
    const explode = g.explode as { radius: number; multiplier: number } | undefined;
    const onKill = g.explodeOnKill as { radius: number; multiplier: number } | undefined;

    const struck = new Set<Entity>();
    const blast = (at: Entity, radius: number, multiplier: number): void =>
      blastAround(use, at, radius, multiplier, (e) => castMultiplier * targetScale(use, e));

    const strike = (target: Entity, falloff: number): boolean => {
      if (target.dead || struck.has(target)) return false;
      struck.add(target);
      use.hit(target, falloff * castMultiplier * targetScale(use, target));
      // A cloud over the thing it hit, for a skill that leaves one.
      if (impact) use.vfx(impact, [{ x: target.x, y: target.y }], IMPACT_TTL);


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
            c.off <= PROJECTILE.corridor &&
            c.along > separation(use.user, use.primary) &&
            c.along <= separation(use.user, use.primary) + PROJECTILE.pierce
        )
        .sort((a, b) => a.along - b.along)
        .slice(0, pierce);

      for (const { e } of behind) {
        if (!strike(e, num(g.pierceDamage, PROJECTILE.pierceDamage))) continue;
        use.vfx(kind, [{ x: last.x, y: last.y }, { x: e.x, y: e.y }]);
        last = e;
      }
    }

    // Arc: from the last thing hit to the nearest thing that hasn't been.
    // `params` are the skill's OWN baseline and grants are what a build adds,
    // so the two sum — the monsters' Lightning Arc reaches without a tree.
    const arcs = num(g.chains, 0) + num(use.skill.params?.chains, 0);
    for (let i = 0; i < arcs; i++) {
      const next = use.enemies
        .filter((e) => !e.dead && !struck.has(e) && separation(last, e) <= PROJECTILE.arc)
        .sort((a, b) => separation(last, a) - separation(last, b))[0];
      if (!next) break;
      const from = last;
      const falloff = num(
        g.chainDamage,
        num(use.skill.params?.chainDamage, PROJECTILE.arcDamage)
      );
      if (!strike(next, falloff)) break;
      use.vfx(kind, [{ x: from.x, y: from.y }, { x: next.x, y: next.y }]);
      last = next;
    }

    // Forks come out of the SKY on enemies near the one you AIMED at, never
    // off the end of the chain: a Fork is its own bolt rather than the shot
    // carrying on, so nothing about where the shot went decides who takes one.
    const forks = num(g.forks, 0) + num(use.skill.params?.forks, 0);
    if (forks > 0) {
      const falloff = num(
        g.forkDamage,
        num(use.skill.params?.forkDamage, PROJECTILE.forkDamage)
      );
      const near = use.enemies
        .filter(
          (e) => !e.dead && !struck.has(e) && separation(use.primary, e) <= PROJECTILE.fork
        )
        .sort((a, b) => separation(use.primary, a) - separation(use.primary, b))
        .slice(0, forks);

      for (const e of near) {
        if (!strike(e, falloff)) continue;
        // Two tiles above the victim and down onto it, which is what makes a
        // Fork read as falling — unless an IMPACT has already drawn one here.
        if (!impact) use.vfx('arc', [{ x: e.x, y: e.y - 2 }, { x: e.x, y: e.y }]);
      }
    }

    // Every Projectile past the first, at FULL damage: a shot that is thrown
    // is a shot that lands, and a falloff on it was one number too many for
    // what the keyword promises.
    const extra = num(g.extraTargets, 0);
    if (extra > 0) {
      const others = spreadTargets(
        use,
        use.enemies.filter((e) => !e.dead && !struck.has(e)),
        extra
      );

      for (const other of others) {
        if (!strike(other, 1)) continue;
        use.vfx(kind, [
          { x: use.user.x, y: use.user.y },
          { x: other.x, y: other.y },
        ]);
      }
    }
  },

  /**
   * ONE enemy, hit hard, and nothing else until a tree buys Echoes. An Echo is
   * the same blow landing on the next body out from the one you struck, and
   * each one after it may look `MELEE.echoStep` further — so buying more of
   * them reaches further into a pack without a second switch for the distance.
   *
   * Nothing is hit twice by one use, exactly as a Projectile's coverage works:
   * without that, Echoes and Repeats both find the enemy in front of you and
   * read as raw damage rather than as reach.
   */
  melee: (use) => {
    const g = use.grants;
    const castMultiplier = castScale(g, use.castIndex);
    const kind = use.skill.vfxKind ?? 'slash';

    const explode = g.explode as { radius: number; multiplier: number } | undefined;
    const onKill = g.explodeOnKill as { radius: number; multiplier: number } | undefined;
    const scale = (e: Entity) => castMultiplier * targetScale(use, e);

    const swing = (target: Entity, falloff: number): void => {
      if (target.dead) return;
      use.hit(target, falloff * scale(target));

      if (explode) {
        blastAround(
          use,
          target,
          use.areaRadius(explode.radius * num(g.explodeRadius, 1)),
          (explode.multiplier + num(g.explodeMultiplierAdd, 0)) * falloff,
          scale
        );
      }
      if (onKill && target.dead) {
        blastAround(use, target, use.areaRadius(onKill.radius), onKill.multiplier, scale);
      }
    };

    swing(use.primary, 1);
    // Repeats land on what you aimed at, and stop once it is down.
    for (let i = 0; i < num(g.doubleStrike, 0); i++) swing(use.primary, 1);

    const echoes = num(g.echoes, 0);
    if (echoes > 0) {
      const share = num(g.echoDamage, MELEE.echoDamage);
      const out = use.enemies
        .filter((e) => !e.dead && e !== use.primary)
        .sort((a, b) => separation(use.primary, a) - separation(use.primary, b));

      let taken = 0;
      for (const other of out) {
        if (taken >= echoes) break;
        // Sorted nearest-first, so the first one too far away means every one
        // after it is too — the allowance only grows once an Echo is spent.
        if (separation(use.primary, other) > MELEE.echo + MELEE.echoStep * taken) break;
        taken++;
        swing(other, share);
        use.vfx(kind, [
          { x: use.primary.x, y: use.primary.y },
          { x: other.x, y: other.y },
        ]);
      }
    }

    use.vfx(kind, [
      { x: use.user.x, y: use.user.y },
      { x: use.primary.x, y: use.primary.y },
    ]);
  },

  /**
   * A wedge in FRONT of you: everything standing in it takes the whole hit and
   * nothing takes a share, so a use is worth how many bodies the wedge holds.
   * No target cap — with one, opening the wedge would buy nothing past it.
   * params: { coneReach, coneArc }
   */
  cone: (use) => {
    const g = use.grants;
    const castMultiplier = castScale(g, use.castIndex);
    const reach = use.areaRadius(
      ((use.skill.params?.coneReach as number) ?? 3.4) * num(g.coneReach, 1)
    );
    const arc = Math.min(
      360,
      ((use.skill.params?.coneArc as number) ?? 100) + num(g.coneArc, 0)
    );
    const half = (arc / 2) * (Math.PI / 180);

    // Aimed at what triggered the use, and at the body's own facing when that
    // is standing on top of you: a wedge with no direction hits nothing.
    const dx = use.primary.x - use.user.x;
    const dy = use.primary.y - use.user.y;
    const facing = Math.hypot(dx, dy) < 1e-3 ? use.user.facing : Math.atan2(dy, dx);

    const explode = g.explode as { radius: number; multiplier: number } | undefined;
    const onKill = g.explodeOnKill as { radius: number; multiplier: number } | undefined;
    const scale = (e: Entity) => castMultiplier * targetScale(use, e);

    const inside = (e: Entity): boolean => {
      if (!within(use.user, e, reach)) return false;
      if (arc >= 360) return true;
      let off = Math.abs(Math.atan2(e.y - use.user.y, e.x - use.user.x) - facing);
      if (off > Math.PI) off = Math.PI * 2 - off;
      // The BODY counts, not the centre: `within` already reads a body for the
      // reach, and an edge that read one way at the rim and another at the
      // flank would be a wedge that lies about who is in it.
      const away = Math.max(separation(use.user, e), 1e-3);
      return off - Math.asin(Math.min(1, e.radius / away)) <= half;
    };

    for (const enemy of use.enemies) {
      if (enemy.dead || !inside(enemy)) continue;
      use.hit(enemy, scale(enemy));

      if (explode) {
        blastAround(
          use,
          enemy,
          use.areaRadius(explode.radius * num(g.explodeRadius, 1)),
          explode.multiplier + num(g.explodeMultiplierAdd, 0),
          scale
        );
      }
      if (onKill && enemy.dead) {
        blastAround(use, enemy, use.areaRadius(onKill.radius), onKill.multiplier, scale);
      }
    }

    // The wedge as the sim used it: where you stand, then its two RIM corners.
    // Reach and opening are both bought, so both have to be readable off the
    // picture or half the branch moves nothing on screen.
    use.vfx(use.skill.vfxKind ?? 'wedge', [
      { x: use.user.x, y: use.user.y },
      { x: use.user.x + Math.cos(facing - half) * reach, y: use.user.y + Math.sin(facing - half) * reach },
      { x: use.user.x + Math.cos(facing + half) * reach, y: use.user.y + Math.sin(facing + half) * reach },
    ]);
  },

  /**
   * No hit at all — a circle of poison on the target, with no target cap, so
   * the way to poison more is a bigger circle.
   * params: { radius, duration }
   */
  ailment_burst: (use) => {
    const g = use.grants;
    const castMultiplier = castScale(g, use.castIndex);
    const duration = ailmentSeconds(use.skill, g);
    const radius = use.areaRadius(
      ((use.skill.params?.radius as number) ?? 1.6) * num(g.fieldRadius, 1)
    );
    const power = castMultiplier * num(g.ailmentMultiplier, 1);

    // A critical TICK plants a fresh circle around whatever it ticked on. The
    // jump inherits Area of Effect, so area widens the cast and every jump.
    const contagion = g.contagionRadius as number | undefined;
    const spread = contagion
      ? { radius: use.areaRadius(contagion), generation: 0 }
      : undefined;

    const explode = g.explode as { radius: number; multiplier: number } | undefined;
    // Half a cast, never a fixed time: a fixed one is on screen most of the
    // time at any real cast speed, and reads as an aura rather than a spell.
    const cadence = 1 / Math.max(0.1, use.user.stats.attacksPerSecond);

    const field = (at: Entity): void => {
      const caught = use.enemies.filter((e) => within(at, e, radius));
      // Always poisoned, even if the radius somehow excludes it.
      if (!caught.includes(at)) caught.push(at);
      for (const enemy of caught) {
        use.ailment(enemy, power * targetScale(use, enemy), duration, spread);
      }

      if (explode) {
        blastAround(
          use,
          at,
          use.areaRadius(explode.radius * num(g.explodeRadius, 1)),
          explode.multiplier + num(g.explodeMultiplierAdd, 0),
          (e) => castMultiplier * targetScale(use, e)
        );
      }

      // Second point IS the radius, so the renderer draws what the sim used.
      use.vfx(
        use.skill.vfxKind ?? 'blight_field',
        [{ x: at.x, y: at.y }, { x: at.x + radius, y: at.y }],
        Math.min(0.75, cadence * 0.5)
      );
    };

    field(use.primary);

    // More Clouds, on whatever else is close — never twice on the same enemy.
    const extra = num(g.extraFields, 0);
    if (extra > 0) {
      const others = use.enemies
        .filter(
          (e) => e !== use.primary && !e.dead && separation(use.primary, e) <= PROJECTILE.spread
        )
        .sort((a, b) => separation(use.primary, a) - separation(use.primary, b))
        .slice(0, extra);
      for (const other of others) field(other);
    }
  },
};
