/** Skill delivery registry, the extension point for combat: a skill is a row in
 *  SKILLS naming a behaviour here, and new code is only needed for a genuinely
 *  new KIND of delivery. A behaviour never touches the sim — it gets candidate
 *  targets and a `hit` callback; damage, crit, armour, death and XP are the
 *  sim's. */
import { Rng } from '../rng';
import { ailmentSeconds } from './stats';
import { BURST, MELEE, PROJECTILE } from '../data';
import { SHATTER } from './grants';
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
  /** What this USE is worth before any target is looked at, off the swing rate
   *  it was made at — the sim's to say, since only it knows the rate. */
  heft: number;
  sinceKill: number; // seconds left of a kill still counting
  sinceHit: number; // seconds since anything landed on the hero
  streak: number; // casts in a row at the same body, this one included
  sleet: number; // stacks of Sleet held going into this cast
  lastHits: number; // bodies the last cast hit
  /** Hold a body: the Freeze a Chill ends in, handed out by a rule instead. */
  freeze(target: Entity): void;
  /** Leave the skill's own Ailment on a body with NO hit and no chance rolled,
   *  worth `more` more than one the chance would have left. */
  wound(target: Entity, more: number): void;
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
  /** What the damage TYPES carry, with no hit. A Cloud's whole content. */
  leave(target: Entity): void;
  /** Area of Effect grows AREA, so radius goes by the square root. */
  areaRadius(base: number): number;
  /** Points are in tile units. Only the skill knows the shape of what it did. */
  vfx(kind: string, points: Vec2[], ttl?: number, delay?: number): void; // delay: seconds before it shows
  /** BEHIND a body, if there is anywhere to stand: only the sim knows tiles. */
  blink(target: Entity): void;
  /** Lay a shaking WEDGE the sim keeps and ticks: Shockwave's standing mode. */
  tremor(wedge: Wedge): void;
}

/** A wedge on the floor: where it opens from, which way, how far and how wide. */
export interface Wedge {
  x: number;
  y: number;
  facing: number;
  reach: number;
  half: number; // half the opening, in radians; a LINE carries its half-width in `width` instead
  width?: number;
}

/** Whether a body stands in a wedge — or on a line, when the wedge has a
 *  `width`. The BODY counts at the flank, or the picture lies about who is in it. */
export function inWedge(w: Wedge, e: Entity): boolean {
  const dx = e.x - w.x;
  const dy = e.y - w.y;
  const away = Math.hypot(dx, dy);
  if (w.width !== undefined) {
    const along = dx * Math.cos(w.facing) + dy * Math.sin(w.facing);
    const off = Math.abs(dx * Math.sin(w.facing) - dy * Math.cos(w.facing));
    return along > -e.radius && along - e.radius <= w.reach && off - e.radius <= w.width;
  }
  if (away - e.radius > w.reach) return false;
  if (w.half >= Math.PI) return true;
  let off = Math.abs(Math.atan2(dy, dx) - w.facing);
  if (off > Math.PI) off = Math.PI * 2 - off;
  return off - Math.asin(Math.min(1, e.radius / Math.max(away, 1e-3))) <= w.half;
}

export type SkillBehaviour = (use: SkillUse) => void;

/** Distance between two entities' CENTRES, in tiles. */
export function separation(a: Entity, b: Entity): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Whether a circle of `radius` drawn around `at` touches `enemy` AT ALL — the
 * body it overlaps, not the centre it contains, because that circle is the only
 * picture of the rule a player gets. Only the VICTIM's body counts: the circle
 * is a geometric radius from a point, not a second body.
 */
export function within(at: Entity, enemy: Entity, radius: number): boolean {
  return separation(at, enemy) - enemy.radius <= radius;
}

const num = (v: unknown, fallback: number): number =>
  typeof v === 'number' ? v : fallback;

const IMPACT_TTL = 0.8; // what a shot LEAVES boils up and breaks apart, and outlives the shot
const FLIGHT = { speed: 9, least: 0.3, arrives: 1 / 1.8, hailGap: 0.09 }; // hailGap: seconds between one Hail shard leaving and the next, so a volley reads as a volley // a ball: tiles/s, shortest flight, share of its picture at which `fireBolt` lands
const CONE_MOUTH = 0.95; // the Burst under a Cone's mouth, in tiles
const BLADE = { speed: 7, gap: 0.12 };
const METEOR_DROP = 4; // tiles above the body a Meteor is drawn falling from // a thrown ghost blade: tiles/s each way, and seconds between one leaving and the next

/** Which enemies the Projectiles past the first take. Nearest by default; a
 *  node may widen the Spread and turn the pick AROUND, which is the only way a
 *  wider one is worth anything in a room already full inside the bare radius. */
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

/** A CLOUD where the spike went in, every Nth cast: no damage at all, and what
 *  it leaves is the Ailment the build already applies at the chance it bought. */
export function leaveClouds(use: SkillUse): void {
  const g = use.grants;
  const field = g.fieldOnCast as { every: number; radius: number } | undefined;
  if (!field) return;
  const every = Math.max(1, Math.round(field.every * num(g.fieldEvery, 1)));
  if ((use.castIndex + 1) % every !== 0) return;

  const radius = use.areaRadius(field.radius * num(g.fieldRadius, 1));
  const spots = [use.primary, ...spreadTargets(use, use.enemies.filter((e) => e !== use.primary), num(g.extraFields, 0))];
  for (const at of spots) {
    for (const enemy of use.enemies) {
      if (within(at, enemy, radius)) use.leave(enemy);
    }
    // Second point IS the radius, so the renderer draws what the sim used.
    use.vfx('blight_field', [{ x: at.x, y: at.y }, { x: at.x + radius, y: at.y }], 0.5);

  }
}

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

  // A Freeze is the only thing that writes `stun` on a body a Cold build fights.
  const frozen = g.moreVsFrozen as number | undefined;
  if (frozen && (target.stun ?? 0) > 0) m *= 1 + frozen;

  // NEITHER IS ABOUT WHERE YOU STAND: a kill and an untouched run are things a
  // BUILD decides, and nobody drives the hero to a tile.
  const killed = g.killMore as { seconds: number; more: number } | undefined;
  if (killed && use.sinceKill > 0) m *= 1 + killed.more;

  const clean = g.untouchedMore as { after: number; more: number } | undefined;
  if (clean && use.sinceHit >= clean.after) m *= 1 + clean.more;

  const fresh = g.moreVsClean as number | undefined;
  if (fresh && target.ailments.length === 0) m *= 1 + fresh;

  const low = g.moreVsLow as { below: number; more: number } | undefined;
  if (low && target.life <= target.stats.maxLife * low.below) m *= 1 + low.more;

  const full = g.moreVsFull as { above: number; more: number } | undefined;
  if (full && target.life >= target.stats.maxLife * full.above) m *= 1 + full.more;

  // EVERY target: a heavier swing is heavier wherever it lands.
  m *= use.heft ?? 1;
  return m;
}

/** Overlaps freely; returns who it put down — the next hop of a chain. */
export function blastAround(
  use: SkillUse,
  at: Entity,
  radius: number,
  multiplier: number,
  scale: (target: Entity) => number
): Entity[] {
  if (multiplier <= 0 || radius <= 0) return [];
  const killed: Entity[] = [];
  for (const enemy of use.enemies) {
    if (enemy === at || enemy.dead) continue;
    if (!within(at, enemy, radius)) continue;
    use.hit(enemy, multiplier * scale(enemy));
    if (enemy.dead) killed.push(enemy);
  }
  use.vfx('burst', [{ x: at.x, y: at.y }, { x: at.x + radius, y: at.y }], 0.32);
  return killed;
}

/**
 * SPLASH: the share of a single-target hit that lands on everything else near
 * the body it hit. Baked into the skill rather than bought, so no build spends
 * its first ten points buying its way out of hitting one body at a time.
 * `splashShare` is ADDED and `splashRadius` a multiplier, and the radius goes
 * through `areaRadius` so increased Area of Effect from anywhere widens it.
 */
export function splashFrom(
  use: SkillUse,
  at: Entity,
  scale: (target: Entity) => number
): void {
  const baked = use.skill.splash;
  if (!baked) return;
  const g = use.grants;
  const share = baked.share + num(g.splashShare, 0);
  const radius = use.areaRadius(baked.radius * num(g.splashRadius, 1));
  if (share <= 0 || radius <= 0) return;
  for (const enemy of use.enemies) {
    if (enemy === at || enemy.dead) continue;
    if (!within(at, enemy, radius)) continue;
    use.hit(enemy, share * scale(enemy));
  }
  use.vfx('burst', [{ x: at.x, y: at.y }, { x: at.x + radius, y: at.y }], 0.22);
}

/** The chain a DEATH sets off. No tree grants this — it is a unique's whole
 *  reason to exist — and `dealsHits` keeps it off Blight's circle, which deals
 *  no hit damage for it to be a share of. */
export function burstFrom(
  use: SkillUse,
  at: Entity,
  scale: (target: Entity) => number,
  dealsHits: boolean
): void {
  const onKill = dealsHits
    ? (use.grants.explodeOnKill as { radius: number; multiplier: number } | undefined)
    : undefined;
  if (!onKill || !at.dead) return;

  // Breadth-first, and DEATH is what marks a body seen: `blastAround` steps over
  // a corpse, so nothing Bursts twice and a chain that stops killing stops dead.
  const radius = use.areaRadius(onKill.radius);
  let front = [at];
  for (let hop = 0; hop < BURST.chainDepth && front.length > 0; hop++) {
    const next: Entity[] = [];
    for (const body of front) {
      next.push(...blastAround(use, body, radius, onKill.multiplier, scale));
    }
    front = next;
  }
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

/** METEOR: the fire falls on the body aimed at and on one more for every
 *  Projectile, and Bursts round each. The body under it takes the hit and the
 *  Burst both, which is what standing under a falling rock costs. */
function fallOn(use: SkillUse, meteor: { radius: number; more: number }, scale: (e: Entity) => number): void {
  const g = use.grants;
  const more = 1 + meteor.more;
  const radius = use.areaRadius(meteor.radius);
  const targets = [
    use.primary,
    ...spreadTargets(use, use.enemies.filter((e) => !e.dead && e !== use.primary), num(g.extraTargets, 0)),
  ];
  targets.forEach((at, i) => {
    if (at.dead) return;
    use.hit(at, more * scale(at));
    for (const enemy of use.enemies) {
      if (enemy === at || enemy.dead || !within(at, enemy, radius)) continue;
      use.hit(enemy, more * scale(enemy));
    }
    burstFrom(use, at, scale, true);
    // Down out of the sky onto the body, then the Burst where it landed.
    use.vfx(use.skill.vfxKind ?? 'flame', [{ x: at.x, y: at.y - METEOR_DROP }, { x: at.x, y: at.y }], 0.45, i * 0.15);
    use.vfx('burst', [{ x: at.x, y: at.y }, { x: at.x + radius, y: at.y }], 0.32, 0.45 * FLIGHT.arrives + i * 0.15);
  });
}

/** EMBER SPRAY: a fan of embers ahead of you, one enemy each nearest first, and
 *  the rest lost. What a use is worth is how many bodies stand in the fan. */
function fanOut(use: SkillUse, spray: { count: number; arc: number; reach: number; less: number }, scale: (e: Entity) => number): void {
  const g = use.grants;
  const count = Math.max(1, Math.round(spray.count + num(g.extraTargets, 0)));
  const share = Math.max(0.05, 1 - spray.less);
  const dx = use.primary.x - use.user.x;
  const dy = use.primary.y - use.user.y;
  const facing = Math.hypot(dx, dy) < 1e-3 ? use.user.facing : Math.atan2(dy, dx);
  // The fan always reaches the body you aimed at, or a cast from range is lost whole.
  const reach = Math.max(spray.reach, separation(use.user, use.primary) + use.primary.radius);
  const wedge: Wedge = { x: use.user.x, y: use.user.y, facing, reach, half: (spray.arc / 2) * (Math.PI / 180) };
  const inside = use.enemies
    .filter((e) => !e.dead && inWedge(wedge, e))
    .sort((a, b) => separation(use.user, a) - separation(use.user, b))
    .slice(0, count);
  inside.forEach((e, i) => {
    use.hit(e, share * scale(e));
    splashFrom(use, e, (o) => share * scale(o));
    burstFrom(use, e, scale, true);
    use.vfx(use.skill.vfxKind ?? 'flame', [{ x: use.user.x, y: use.user.y }, { x: e.x, y: e.y }], 0.3, i * 0.04);
  });
  // The lost embers are still thrown, into the empty fan.
  for (let i = inside.length; i < count; i++) {
    const turn = facing + (i / Math.max(1, count - 1) - 0.5) * wedge.half * 2;
    use.vfx(use.skill.vfxKind ?? 'flame', [
      { x: use.user.x, y: use.user.y },
      { x: use.user.x + Math.cos(turn) * reach, y: use.user.y + Math.sin(turn) * reach },
    ], 0.3, i * 0.04);
  }
}

/** A wedge's picture: where it opens from and its two rim corners. */
export function wedgeCorners(w: Wedge): Vec2[] {
  const half = w.width !== undefined ? Math.atan2(w.width, w.reach) : w.half;
  return [
    { x: w.x, y: w.y },
    { x: w.x + Math.cos(w.facing - half) * w.reach, y: w.y + Math.sin(w.facing - half) * w.reach },
    { x: w.x + Math.cos(w.facing + half) * w.reach, y: w.y + Math.sin(w.facing + half) * w.reach },
  ];
}

/** ETHEREAL STRIKE: a ghost of the weapon thrown `reach` tiles through the body
 *  you aimed at, hitting everything in its corridor on the way OUT and again on
 *  the way BACK. A Repeat is one more blade at the same body; a Projectile is a
 *  blade at another. Hits land now; the picture takes the flight. */
function throwBlades(use: SkillUse, ghost: { less: number; reach: number }, scale: (e: Entity) => number): void {
  const g = use.grants;
  const share = Math.max(0.05, 1 - ghost.less);
  const reach = Math.max(1, ghost.reach);
  const each = 1 + num(g.doubleStrike, 0);
  const targets = [
    use.primary,
    ...spreadTargets(use, use.enemies.filter((e) => !e.dead && e !== use.primary), num(g.extraTargets, 0)),
  ];
  const flight = (2 * reach) / BLADE.speed;
  let thrown = 0;
  for (const target of targets) {
    const span = Math.max(1e-3, separation(use.user, target));
    const far = {
      x: use.user.x + ((target.x - use.user.x) / span) * reach,
      y: use.user.y + ((target.y - use.user.y) / span) * reach,
    };
    const line = use.enemies
      .filter((e) => !e.dead)
      .map((e) => ({ e, ...alongRay(use.user, target, e) }))
      .filter((c) => c.off <= PROJECTILE.corridor && c.along > 0 && c.along <= reach)
      .sort((a, b) => a.along - b.along)
      .map((c) => c.e);
    for (let i = 0; i < each; i++) {
      for (const pass of [line, [...line].reverse()]) {
        for (const e of pass) {
          if (e.dead) continue;
          use.hit(e, share * scale(e));
          splashFrom(use, e, (o) => share * scale(o));
          burstFrom(use, e, scale, true);
        }
      }
      use.vfx('blade', [{ x: use.user.x, y: use.user.y }, far], flight, thrown * BLADE.gap);
      thrown++;
    }
  }
}

/** WHIRLWIND: everything within `radius` of YOU takes the hit, no Splash, and a
 *  Repeat is another spin. A spin that kills spins on off the Cleave budget,
 *  which is spent per spin and is the termination proof. */
function spin(use: SkillUse, whirl: { less: number; radius: number }, scale: (e: Entity) => number): void {
  const g = use.grants;
  const radius = use.areaRadius(whirl.radius);
  const share = Math.max(0.05, 1 - whirl.less);
  let spins = 1 + num(g.doubleStrike, 0);
  let carries = num(g.carryOnKill, 0);
  for (let s = 0; s < spins; s++) {
    let killed = false;
    for (const enemy of use.enemies) {
      if (enemy.dead || !within(use.user, enemy, radius)) continue;
      use.hit(enemy, share * scale(enemy));
      burstFrom(use, enemy, scale, true);
      if (enemy.dead) killed = true;
    }
    use.vfx('sweep', [{ x: use.user.x, y: use.user.y }, { x: use.user.x + radius, y: use.user.y }], 0.35, s * 0.15);
    if (killed && carries > 0) {
      carries--;
      spins++;
    }
  }
}

/** HAIL: the cast as ice Projectiles thrown from where you stand. ONE EACH
 *  while there are enemies in Spread to take one, and whatever is left over
 *  lands on the body you aimed at — so one enemy takes the lot. Every
 *  Projectile from anywhere adds one, and a Pierce carries each on past its
 *  target the way any Projectile's does. No spike, so no circle. */
function hailOf(use: SkillUse, hail: { projectiles: number; less: number }, scale: (e: Entity) => number, freezes: boolean): void {
  const g = use.grants;
  // A shatter and a kill-burst reach round a shard exactly as round a spike.
  const shatter = use.crit ? num(g.shatterShare, 0) : 0;
  const bursts = num(g.burstOnKill, 0);
  const scattered = new Set<Entity>();
  const scatter = (from: Entity, share: number) => {
    for (const other of use.enemies) {
      if (other.dead || other === from || scattered.has(other) || !within(from, other, SHATTER.radius)) continue;
      scattered.add(other);
      use.hit(other, share * scale(other));
    }
  };
  const count = Math.max(1, Math.round(hail.projectiles + num(g.extraTargets, 0)));
  const others = spreadTargets(use, use.enemies.filter((e) => !e.dead && e !== use.primary), count - 1);
  const targets = [use.primary, ...others];
  const share = 1 - hail.less;
  const pierce = num(g.pierce, 0);
  const pierceShare = num(g.pierceDamage, PROJECTILE.pierceDamage);
  for (let i = 0; i < count; i++) {
    const target = targets[i % targets.length];
    if (target.dead) continue;
    const flight = Math.max(FLIGHT.least, separation(use.user, target) / FLIGHT.speed);
    const leaves = i * FLIGHT.hailGap; // one after another, never a stack
    use.hit(target, share * scale(target));
    if (freezes) use.freeze(target);
    burstFrom(use, target, (e) => share * scale(e), true);
    if (shatter > 0) scatter(target, shatter * share);
    if (bursts > 0 && target.dead) scatter(target, bursts * share);
    use.vfx('shard', [{ x: use.user.x, y: use.user.y }, { x: target.x, y: target.y }], flight, leaves);
    if (pierce <= 0) continue;
    const from = separation(use.user, target);
    const behind = use.enemies
      .filter((e) => e !== target && !e.dead)
      .map((e) => ({ e, ...alongRay(use.user, target, e) }))
      .filter((c) => c.off <= PROJECTILE.corridor && c.along > from && c.along <= from + PROJECTILE.pierce)
      .sort((a, b) => a.along - b.along)
      .slice(0, pierce);
    let last: Entity = target;
    for (const { e } of behind) {
      use.hit(e, pierceShare * share * scale(e));
      use.vfx('shard', [{ x: last.x, y: last.y }, { x: e.x, y: e.y }], flight, leaves + flight * FLIGHT.arrives);
      last = e;
    }
  }
}

export const SKILL_BEHAVIOURS: Record<string, SkillBehaviour> = {
  /** One target, full damage — the floor the rest build on. */
  /**
   * ONE SPIKE, and everything standing round where it came up takes the whole
   * hit. No falloff and no target cap: the radius IS the skill, so Area of
   * Effect is what a build buys and the picture grows with it.
   * params: { radius }
   */
  spike: (use) => {
    const g = use.grants;
    const castMultiplier = castScale(g, use.castIndex);
    // THE MODE'S OWN TWO NUMBERS, read here so the cast that plants a standing
    // spike is the same cast that lands harder and wider for it.
    const stands = g.spikeStands as { seconds: number; radius: number; more: number } | undefined;
    // DEEP COLD: every cast in a row at one body is worth `per` more than the
    // last, to a cap. The streak is the sim's; the first cast is worth nothing.
    const ramp = g.spikeRamp as { per: number; upTo: number } | undefined;
    const rampMore = ramp ? 1 + ramp.per * Math.min(ramp.upTo, Math.max(0, use.streak - 1)) : 1;
    // SLEET: what the stacks are worth on this cast, and whether it is the
    // one at the bar that Freezes.
    const tempo = g.spikeTempo as { per: number; stacks: number } | undefined;
    const tempoMore = tempo ? 1 + (use.sleet * num(g.tempoDamage, 0)) / 100 : 1;
    const freezes = !!tempo && use.sleet >= Math.max(1, tempo.stacks + num(g.tempoStacks, 0));
    const scale = (e: Entity) =>
      castMultiplier * targetScale(use, e) * (1 + (stands?.more ?? 0)) * rampMore * tempoMore;
    // HAIL is the other mode: no spike at all, the cast thrown as Projectiles.
    const hail = g.spikeHail as { projectiles: number; less: number } | undefined;
    if (hail) {
      hailOf(use, hail, scale, freezes);
      return;
    }
    const feeds = g.fieldFeeds as { per: number; upTo: number } | undefined;
    const fed = feeds ? 1 + feeds.per * Math.min(feeds.upTo, use.lastHits) : 1;
    const radius =
      use.areaRadius((use.skill.params?.radius as number) ?? 1.3) * (stands?.radius ?? 1) * fed;
    const rim = num(g.rimBite, 0);
    const shatter = use.crit ? num(g.shatterShare, 0) : 0;
    const bursts = num(g.burstOnKill, 0);

    // A PROJECTILE is one more spike, up under another enemy in Spread, and
    // nothing is struck twice by one cast. A shatter and a kill-burst reach
    // what the field did NOT, once each.
    const struck = new Set<Entity>();
    const scattered = new Set<Entity>();
    const scatter = (from: Entity, share: number) => {
      for (const other of use.enemies) {
        if (other.dead || struck.has(other) || scattered.has(other) || !within(from, other, SHATTER.radius)) continue;
        scattered.add(other);
        use.hit(other, share * scale(other));
      }
    };
    const raise = (at: Entity) => {
      for (const enemy of use.enemies) {
        if (enemy.dead || struck.has(enemy) || !within(at, enemy, radius)) continue;
        struck.add(enemy);
        const far = rim > 0 && separation(at, enemy) > radius / 2 ? 1 + rim : 1;
        use.hit(enemy, scale(enemy) * far);
        if (freezes) use.freeze(enemy);
        burstFrom(use, enemy, scale, true);
        if (shatter > 0) scatter(enemy, shatter);
        if (bursts > 0 && enemy.dead) scatter(enemy, bursts);
      }
      // Second point IS the radius, so the renderer draws the size the sim
      // used, and a spike that STANDS is drawn for as long as it stands there.
      use.vfx(
        use.skill.vfxKind ?? 'spikes',
        [{ x: at.x, y: at.y }, { x: at.x + radius, y: at.y }],
        stands ? stands.seconds + num(g.spikeLonger, 0) : undefined
      );
    };
    raise(use.primary);
    const more = num(g.extraTargets, 0);
    if (more > 0) {
      for (const other of spreadTargets(use, use.enemies.filter((e) => !e.dead && !struck.has(e)), more)) {
        if (!struck.has(other)) raise(other);
      }
    }
  },

  single_target: (use) => {
    const castMultiplier = castScale(use.grants, use.castIndex);
    const scale = (e: Entity) => castMultiplier * targetScale(use, e);
    use.hit(use.primary, scale(use.primary));
    splashFrom(use, use.primary, scale);

    leaveClouds(use);

    const extra = (use.grants.extraTargets as number) ?? 0;
    if (extra > 0) {
      const others = spreadTargets(use, use.enemies.filter((e) => e !== use.primary), extra);
      for (const other of others) {
        use.hit(other, scale(other));
        splashFrom(use, other, scale);
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

  /** The STEP is the delivery: behind the body, then one hit and nothing else.
   *  A Critical's follow-up is the SIM's, landing after this use has ended —
   *  which is what makes it a second teleport rather than a bigger hit. */
  ambush: (use) => {
    const castMultiplier = castScale(use.grants, use.castIndex);
    const scale = (e: Entity) => castMultiplier * targetScale(use, e);
    use.blink(use.primary);
    // EXSANGUINATE: the step, then a wound and nothing else. What the hit would
    // have been worth against THIS body is what the wound is worth.
    const bleed = use.grants.bleedOut as { more: number } | undefined;
    if (bleed) {
      use.wound(use.primary, (1 + bleed.more) * scale(use.primary) - 1);
      use.vfx(use.skill.vfxKind ?? 'slash', [
        { x: use.user.x, y: use.user.y },
        { x: use.primary.x, y: use.primary.y },
      ]);
      return;
    }
    use.hit(use.primary, scale(use.primary));
    splashFrom(use, use.primary, scale);
    burstFrom(use, use.primary, scale, true);
    use.vfx(use.skill.vfxKind ?? 'slash', [
      { x: use.user.x, y: use.user.y },
      { x: use.primary.x, y: use.primary.y },
    ]);
  },

  /** A thrown ball of fire, and everything a tree can make of one. Order
   *  matters — aimed-at, then pierced, then leapt-to, then spread — and nothing
   *  is hit twice by one cast, or pierce and chain and spread all find the same
   *  clump and talents meant to hit MORE things hit the same things harder.
   *  Bursts are exempt: overlapping is the point. */
  projectile: (use) => {
    const g = use.grants;
    const kind = use.skill.vfxKind ?? 'bolt';
    const impact = use.skill.impact;

    const castMultiplier = castScale(g, use.castIndex);
    const scale = (e: Entity) => castMultiplier * targetScale(use, e);

    // THE TWO MODES a thrown ball may be instead, each the whole use.
    const meteor = g.meteor as { radius: number; more: number } | undefined;
    if (meteor) {
      fallOn(use, meteor, scale);
      return;
    }
    const spray = g.spray as { count: number; arc: number; reach: number; less: number } | undefined;
    if (spray) {
      fanOut(use, spray, scale);
      return;
    }

    // A BALL flies and a bolt of lightning does not: a flight is timed off the
    // distance so the trail is on screen, and what it leaves waits for it.
    const flies = kind !== 'arc';
    const flight = (a: Vec2, b: Vec2): number =>
      flies ? Math.max(FLIGHT.least, Math.hypot(b.x - a.x, b.y - a.y) / FLIGHT.speed) : 0.3;
    const lands = (ttl: number): number => (flies ? ttl * FLIGHT.arrives : 0);

    const struck = new Set<Entity>();
    const strike = (target: Entity, falloff: number, after = 0): boolean => {
      if (target.dead || struck.has(target)) return false;
      struck.add(target);
      use.hit(target, falloff * scale(target));
      splashFrom(use, target, (e) => falloff * scale(e));
      // A cloud over the thing it hit, for a skill that leaves one.
      if (impact) use.vfx(impact, [{ x: target.x, y: target.y }], IMPACT_TTL, after);
      burstFrom(use, target, scale, true);
      return true;
    };

    // --- the shot ---------------------------------------------------------
    const shot = flight(use.user, use.primary);
    strike(use.primary, 1, lands(shot));
    use.vfx(kind, [
      { x: use.user.x, y: use.user.y },
      { x: use.primary.x, y: use.primary.y },
    ], shot);
    let at = lands(shot); // when the ball is at `last`, for the next leg to start from

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
        const leg = flight(last, e);
        if (!strike(e, num(g.pierceDamage, PROJECTILE.pierceDamage), at + lands(leg))) continue;
        use.vfx(kind, [{ x: last.x, y: last.y }, { x: e.x, y: e.y }], leg, at);
        at += lands(leg);
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
      // COMPOUNDED PER HOP: `chainBuild` above 1 turns the falloff into a climb.
      const falloff = num(
        g.chainDamage,
        num(use.skill.params?.chainDamage, PROJECTILE.arcDamage)
      ) * num(g.chainBuild, 1) ** i;
      const leg = flight(from, next);
      if (!strike(next, falloff, at + lands(leg))) break;
      use.vfx(kind, [{ x: from.x, y: from.y }, { x: next.x, y: next.y }], leg, at);
      at += lands(leg);
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
   * ONE enemy, hit hard, and nothing else until a tree buys Echoes. Each Echo
   * past the first may look `MELEE.echoStep` further, so buying more reaches
   * deeper into a pack with no second switch for the distance. Nothing is hit
   * twice by one use, or Echoes and Repeats read as damage rather than reach.
   */
  melee: (use) => {
    const g = use.grants;
    const castMultiplier = castScale(g, use.castIndex);
    const kind = use.skill.vfxKind ?? 'slash';

    const scale = (e: Entity) => castMultiplier * targetScale(use, e);

    // THE TWO MODES, each the whole use: a thrown blade or a spin.
    const ghost = g.ghostBlade as { less: number; reach: number } | undefined;
    if (ghost) {
      throwBlades(use, ghost, scale);
      return;
    }
    const whirl = g.whirl as { less: number; radius: number } | undefined;
    if (whirl) {
      spin(use, whirl, scale);
      return;
    }

    const swing = (target: Entity, falloff: number): void => {
      if (target.dead) return;
      use.hit(target, falloff * scale(target));
      splashFrom(use, target, (e) => falloff * scale(e));
      burstFrom(use, target, scale, true);
    };

    swing(use.primary, 1);
    // Repeats land on what you aimed at, and stop once it is down.
    for (let i = 0; i < num(g.doubleStrike, 0); i++) swing(use.primary, 1);

    // A CARRY continues the swing through a body it KILLED. The budget is spent
    // per carry rather than per kill, which is the termination proof.
    let carries = num(g.carryOnKill, 0);
    let from = use.primary;
    while (carries > 0 && from.dead) {
      carries--;
      const next = use.enemies
        .filter((e) => !e.dead && e !== from && e !== use.primary)
        .sort((a, b) => separation(from, a) - separation(from, b))[0];
      if (!next || separation(from, next) > MELEE.carry) break;
      use.vfx(kind, [{ x: from.x, y: from.y }, { x: next.x, y: next.y }]);
      swing(next, 1);
      from = next;
    }

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

    // FISSURE: the wedge is a LINE, its reach the crack's and its opening gone.
    const line = g.lineWave as { reach: number; width: number; more: number } | undefined;
    const wedge: Wedge = line
      ? { x: use.user.x, y: use.user.y, facing, reach: use.areaRadius(line.reach * num(g.coneReach, 1)), half: 0, width: line.width / 2 }
      : { x: use.user.x, y: use.user.y, facing, reach, half };
    const more = line ? 1 + line.more : 1;
    const scale = (e: Entity) => castMultiplier * targetScale(use, e) * more;
    const inside = (e: Entity): boolean => inWedge(wedge, e);

    // TREMOR: no hit; the wedge is laid and the sim shakes it.
    const shakes = g.tremor as { seconds: number; share: number; every: number } | undefined;
    if (shakes) {
      use.tremor(wedge);
    } else {
      for (const enemy of use.enemies) {
        if (enemy.dead || !inside(enemy)) continue;
        use.hit(enemy, scale(enemy));
        burstFrom(use, enemy, scale, true);
      }
    }

    // BROKEN GROUND, on the Cloud's own seam: the wedge says who it caught.
    leaveClouds(use);

    // The ground going up UNDER you: sized to the reach it would be a circle
    // where the wedge is a wedge, and the wedge is what says who it caught.
    use.vfx('burst', [
      { x: use.user.x, y: use.user.y },
      { x: use.user.x + CONE_MOUTH, y: use.user.y },
    ], 0.26);

    // Where you stand, then the two RIM corners. Reach and opening are both
    // bought, so both have to be readable off the picture; a crack is drawn as
    // a wedge as wide at the far end as the crack is.
    use.vfx(use.skill.vfxKind ?? 'wedge', wedgeCorners(wedge));
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

      burstFrom(use, at, (e) => castMultiplier * targetScale(use, e), false);

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
