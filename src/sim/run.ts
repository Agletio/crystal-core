/**
 * The run: deterministic, headless, fixed-timestep.
 *
 * Feed it the same crystal, gear and seed and you get the same run, tick for
 * tick. That's what makes a balance complaint reproducible — you keep the
 * seed, not a description of what happened.
 *
 * The caller owns real time. It accumulates elapsed milliseconds and calls
 * step(TICK) a whole number of times, so frame rate never changes outcomes.
 */
import { Rng } from '../rng';
import { generateMap, dist, hasLineOfSight } from './grid';
import type { GameMap, Vec2 } from './grid';
import { findPath, nearestByPath } from './pathfind';
import { characterStats, monsterStats, mapDensity } from './stats';
import type { CombatStats } from './stats';
import { SKILL_BEHAVIOURS } from './skills';
import { monsterXp } from './character';
import type { Character } from './character';
import { crystalRewards } from './crystal';
import type { CrystalRewards } from './crystal';
import {
  CURRENCIES,
  CURRENCY_DROP,
  ENCOUNTERS,
  HERO_BASE,
  LOOT,
  MONSTERS,
  MONSTER_RANGED_SKILL,
  RANGED_PACK_CHANCE,
  SKILLS,
  SKILL_BY_ID,
} from '../data';
import type { EncounterDef } from '../data';
import type { Item, SkillDef } from '../types';

/** Sim step. 30/s is plenty for movement this slow and keeps replays cheap. */
export const TICK = 1 / 30;

/** Monsters beyond this range of the hero don't think at all. */
const ACTIVE_RANGE = 16;

/** Relaxation iterations for body separation. See separate(). */
const SEPARATION_PASSES = 2;

/** Ordered worst-to-best, so rarity climbs the list. */
const CURRENCY_CLASSES = ['basic', 'uncommon', 'rare', 'exotic'] as const;

export type EntityKind = 'hero' | 'monster';

/**
 * A damage-over-time stack.
 *
 * Resisted like anything else, but NOT reduced by armour — that split is what
 * makes an ailment the answer to a target you can't punch through, and the
 * first place where how a monster is defended actually changes what you
 * should be using.
 *
 * Stacks are separate entries rather than a merged number, so each expires on
 * its own clock and the count is meaningful.
 */
export interface Ailment {
  type: string;
  /** Damage per second before resistance. */
  dps: number;
  remaining: number;
}

/** Enough for stacking to matter, few enough that it can't run away. */
const MAX_AILMENT_STACKS = 12;

/**
 * What an entity is visibly doing. The sim already knows this implicitly;
 * naming it is what lets a renderer pick an animation without guessing from
 * position deltas.
 */
export type EntityAction = 'idle' | 'move' | 'attack' | 'hurt';

/** How long a corpse stays on screen so a death animation can play out. */
export const DEATH_FADE = 0.6;

const ATTACK_POSE = 0.22;
const HURT_POSE = 0.16;

export interface Entity {
  id: number;
  kind: EntityKind;
  /** Which monster kind this is; 'hero' for the hero. Renderer art key. */
  sprite: string;
  x: number;
  y: number;
  /** Radians. Where the entity is looking — sprites need this, the sim doesn't. */
  facing: number;
  action: EntityAction;
  /** Body radius in tiles. Units shove each other apart rather than stacking. */
  radius: number;
  /** Skill this entity attacks with. Null means a plain melee hit. */
  skillId: string | null;
  /** Seconds left holding a transient action before falling back to idle/move. */
  actionTimer: number;
  /** Seconds since death, for the fade-out. Only meaningful once dead. */
  deathAge: number;
  /** Active damage-over-time stacks. */
  ailments: Ailment[];
  life: number;
  stats: CombatStats;
  cooldown: number;
  path: Vec2[];
  pathTimer: number;
  /** Committed target, held across ticks so the hero doesn't thrash. */
  targetId: number | null;
  /** Multiplier on the xp and fragments this one is worth. 1 for rank and file. */
  bounty: number;
  aggroed: boolean;
  /** Seconds of "just got hit" left, for the renderer to flash. */
  hitFlash: number;
  dead: boolean;
}

export interface Floater {
  x: number;
  y: number;
  text: string;
  age: number;
  crit: boolean;
  on: EntityKind;
}

/**
 * A transient visual event.
 *
 * The sim emits these because only the sim knows the shape of what happened —
 * a chain skill's arc is A→B→C, and no renderer could reconstruct that from
 * "three entities lost life". `points` is in tile units like everything else,
 * and `damageType` lets the renderer colour it without knowing any rules.
 */
export interface Vfx {
  kind: string;
  points: Vec2[];
  damageType: string;
  age: number;
  ttl: number;
}

/**
 * Nothing to configure yet.
 *
 * Clearing the map used to be a toggle. It's baseline now: the hero hunts
 * everything, then the finale spawns at the exit. A "leave early" option was
 * mostly a way to skip content and made every reward number conditional on
 * how it was played.
 */
export interface RunOptions {
  /** Placeholder so callers don't churn when a real option arrives. */
  reserved?: never;
}

export type RunEvent =
  | { kind: 'finale'; name: string; herald: string }
  | { kind: 'kill'; total: number; xp: number }
  | { kind: 'hurt'; life: number; maxLife: number }
  | { kind: 'cleared'; seconds: number; killed: number }
  | { kind: 'died'; seconds: number; killed: number };

export type RunStatus = 'running' | 'cleared' | 'died';

/**
 * What a run has picked up so far.
 *
 * Held by the run, not the player: it's only banked into the inventory if the
 * run is cleared. Currency is a map and items are a list, so adding shards,
 * gear or crystal drops later is a change to what gets pushed in — nothing
 * downstream needs to know what's in here.
 */
export interface RunLoot {
  /** Currency id → amount. Fractional; rounds when banked. */
  currency: Record<string, number>;
  items: Item[];
}

export interface RunState {
  map: GameMap;
  hero: Entity;
  monsters: Entity[];
  floaters: Floater[];
  vfx: Vfx[];
  elapsed: number;
  status: RunStatus;
  killed: number;
  totalMonsters: number;
  /** XP earned so far. The character banks it; the run just reports it. */
  xpGained: number;
  /** Name of the closing encounter, once it has appeared. */
  finale: string | null;
  /** Carried, not owned — lost entirely if the hero dies. */
  loot: RunLoot;
  /**
   * Damage the hero has taken, split by damage type.
   *
   * Nothing needs this yet. It exists because "where is my character actually
   * struggling" is answered by stats like this one, and the results overlay
   * renders whatever rows it's handed — so the next stat is a line here and a
   * line where the report is built, not a UI change.
   */
  damageTaken: Record<string, number>;
}

const FLOATER_LIFE = 1.1;

export class RunSim {
  readonly state: RunState;
  private readonly rng: Rng;
  private readonly options: RunOptions;
  private readonly skill: SkillDef;
  private events: RunEvent[] = [];
  private nextId = 1;
  /** XP one monster on this map is worth, fixed by crystal tier at spawn. */
  private xpPerKill = 1;
  /** Fragments one monster is worth. Fractional; rounds when banked. */
  private fragmentsPerKill = 0;
  /** Set once the closing encounter has been spawned. */
  private finale: EncounterDef | null = null;
  /** Baseline monster stats for this map, scaled into the finale. */
  private finaleStats!: CombatStats;
  private rewards: CrystalRewards = {
    danger: 0,
    payingDanger: 0,
    fragmentYield: 1,
    rarity: 0,
  };
  private byId = new Map<number, Entity>();

  constructor(
    crystal: Item,
    character: Character,
    rng: Rng,
    options: RunOptions = {}
  ) {
    this.rng = rng;
    this.options = options;
    this.skill = SKILL_BY_ID[character.skillId] ?? SKILLS[0];

    const map = generateMap(crystal, rng);
    const stats = characterStats(character);

    const hero: Entity = {
      id: 0,
      kind: 'hero',
      sprite: 'hero',
      x: map.entrance.x,
      y: map.entrance.y,
      facing: 0,
      action: 'idle',
      radius: HERO_BASE.radius,
      skillId: character.skillId,
      actionTimer: 0,
      deathAge: 0,
      ailments: [],
      bounty: 1,
      life: stats.maxLife,
      stats,
      cooldown: 0,
      path: [],
      pathTimer: 0,
      targetId: null,
      aggroed: false,
      hitFlash: 0,
      dead: false,
    };

    const monsters = this.spawn(crystal, map);
    this.byId = new Map(monsters.map((m) => [m.id, m]));

    this.state = {
      map,
      hero,
      monsters,
      floaters: [],
      vfx: [],
      elapsed: 0,
      status: 'running',
      killed: 0,
      totalMonsters: monsters.length,
      xpGained: 0,
      finale: null,
      loot: { currency: {}, items: [] },
      damageTaken: {},
    };
  }

  /** Packs land in rooms other than the entrance, so you always get a moment
   *  to look at the map before anything reaches you. */
  private spawn(crystal: Item, map: GameMap): Entity[] {
    const tier = (crystal.meta.tier as number) ?? 1;
    const { packCount, packSize } = mapDensity(crystal);
    // Danger pays here: the crystal's own modifiers set what a kill is worth.
    this.rewards = crystalRewards(crystal);
    this.xpPerKill = monsterXp(tier);
    this.fragmentsPerKill =
      LOOT.fragmentsPerKill *
      Math.pow(LOOT.tierScale, tier - 1) *
      this.rewards.fragmentYield;

    const rooms = map.rooms.length > 1 ? map.rooms.slice(1) : map.rooms;
    const monsters: Entity[] = [];

    // Stats are per KIND, not per monster — one shared object per kind keeps
    // fifty entities cheap and makes "all Brutes hit this hard" true by
    // construction.
    const statsFor = new Map<string, CombatStats>();

    // Baseline for the finale, so it scales with the crystal like everything
    // else rather than being a fixed lump of numbers.
    this.finaleStats = monsterStats(crystal, tier, MONSTERS[0]);

    for (let p = 0; p < packCount; p++) {
      const room = this.rng.pick(rooms) ?? rooms[0];

      // One kind per pack. Mixed packs read as noise; a uniform pack reads as
      // a thing you can recognise and react to.
      const def = this.rng.weighted(MONSTERS, (m) => m.weight) ?? MONSTERS[0];
      const ranged = this.rng.chance(RANGED_PACK_CHANCE);
      const bolt = SKILL_BY_ID[MONSTER_RANGED_SKILL];

      // Stats differ between the melee and ranged variants of a kind, so they
      // key separately — a ranged pack reaches much further and has to notice
      // the hero from beyond its own reach to ever open fire.
      const statsKey = ranged ? `${def.id}:ranged` : def.id;
      let stats = statsFor.get(statsKey);
      if (!stats) {
        const base = monsterStats(crystal, tier, def);
        stats =
          ranged && bolt
            ? { ...base, attackRange: bolt.range, aggroRange: bolt.range + 2 }
            : base;
        statsFor.set(statsKey, stats);
      }

      for (let i = 0; i < packSize; i++) {
        monsters.push({
          id: this.nextId++,
          kind: 'monster',
          sprite: def.sprite,
          radius: def.radius,
          skillId: ranged && bolt ? MONSTER_RANGED_SKILL : null,
          x: this.rng.float(room.x, room.x + room.w - 1),
          y: this.rng.float(room.y, room.y + room.h - 1),
          facing: this.rng.float(0, Math.PI * 2),
          action: 'idle',
          actionTimer: 0,
          deathAge: 0,
          ailments: [],
          bounty: 1,
          life: stats.maxLife,
          stats,
          cooldown: this.rng.float(0, 1),
          path: [],
          pathTimer: 0,
          targetId: null,
          aggroed: false,
          hitFlash: 0,
          dead: false,
        });
      }
    }
    return monsters;
  }

  /** Events since the last call. The UI drains these to build its log. */
  drainEvents(): RunEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  step(dt: number): void {
    const s = this.state;
    if (s.status !== 'running') return;

    s.elapsed += dt;

    for (const f of s.floaters) f.age += dt;
    if (s.floaters.length > 0 && s.floaters[0].age >= FLOATER_LIFE) {
      s.floaters = s.floaters.filter((f) => f.age < FLOATER_LIFE);
    }

    for (const v of s.vfx) v.age += dt;
    if (s.vfx.length > 0) s.vfx = s.vfx.filter((v) => v.age < v.ttl);

    // Ailments tick before anyone acts, so a poisoned monster can die on its
    // own without first getting a free swing.
    this.stepAilments(s.hero, dt);
    for (const m of s.monsters) if (!m.dead) this.stepAilments(m, dt);

    this.stepHero(dt);
    if (s.status !== 'running') return;

    for (const m of s.monsters) {
      if (m.dead) {
        if (m.deathAge < DEATH_FADE) m.deathAge += dt;
        continue;
      }
      if (m.hitFlash > 0) m.hitFlash -= dt;
      this.stepMonster(m, dt);
      if (s.status !== 'running') return;
    }

    this.separate();
  }

  /**
   * Push overlapping bodies apart.
   *
   * Runs after everyone has moved, so pathing stays simple: entities steer as
   * if the world were empty and then get shoved out of each other. Doing it
   * the other way round — collision-aware pathfinding — is far more code for
   * a result nobody watching could tell apart.
   *
   * Bucketed by tile so this stays linear rather than checking all pairs;
   * sixty monsters in one room would otherwise be 1,800 comparisons a tick.
   */
  private separate(): void {
    const s = this.state;
    const { grid } = s.map;

    // Two passes. One leaves visible residual overlap in a crowded corridor,
    // because pushing A out of B can shove it into C. Two gets it to roughly
    // a twentieth of a tile, which nobody can see. Three buys nothing.
    for (let pass = 0; pass < SEPARATION_PASSES; pass++) {
      const buckets = new Map<number, Entity[]>();
      const actives: Entity[] = [];

      const add = (e: Entity) => {
        actives.push(e);
        const k = Math.round(e.y) * grid.width + Math.round(e.x);
        const list = buckets.get(k);
        if (list) list.push(e);
        else buckets.set(k, [e]);
      };

      for (const m of s.monsters) if (!m.dead) add(m);
      if (!s.hero.dead) add(s.hero);

      for (const a of actives) {
        const ax = Math.round(a.x);
        const ay = Math.round(a.y);
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const list = buckets.get((ay + dy) * grid.width + (ax + dx));
            if (!list) continue;
            // id ordering visits each pair exactly once.
            for (const b of list) if (b.id > a.id) this.resolveOverlap(a, b);
          }
        }
      }
    }
  }

  private resolveOverlap(a: Entity, b: Entity): void {
    const min = a.radius + b.radius;
    let dx = b.x - a.x;
    let dy = b.y - a.y;
    let d = Math.hypot(dx, dy);
    if (d >= min) return;

    if (d < 1e-4) {
      // Exactly stacked, which happens at spawn. Pick a direction off the id
      // so the nudge is deterministic and the pair doesn't jitter.
      dx = Math.cos(a.id * 2.399);
      dy = Math.sin(a.id * 2.399);
      d = 1;
    }

    const overlap = (min - d) / 2;
    const nx = (dx / d) * overlap;
    const ny = (dy / d) * overlap;

    // The hero shoves rather than being shoved. Otherwise a big pack walks it
    // backwards off its own path and it never reaches anything.
    const aw = a.kind === 'hero' ? 0.2 : 1;
    const bw = b.kind === 'hero' ? 0.2 : 1;

    this.nudge(a, -nx * aw, -ny * aw);
    this.nudge(b, nx * bw, ny * bw);
  }

  /** Move an entity, refusing any component that would put it inside a wall. */
  private nudge(e: Entity, dx: number, dy: number): void {
    const { grid } = this.state.map;
    if (grid.walkable(e.x + dx, e.y)) e.x += dx;
    if (grid.walkable(e.x, e.y + dy)) e.y += dy;
  }

  /** Decay the transient pose and fall back to whether it's moving. */
  private settleAction(e: Entity, moving: boolean): void {
    if (e.actionTimer > 0) return;
    e.action = moving ? 'move' : 'idle';
  }

  /** Unobstructed line between two entities. */
  private canSee(a: Entity, b: Entity): boolean {
    return hasLineOfSight(this.state.map.grid, a, b);
  }

  private face(e: Entity, towardX: number, towardY: number): void {
    const dx = towardX - e.x;
    const dy = towardY - e.y;
    if (dx * dx + dy * dy > 1e-6) e.facing = Math.atan2(dy, dx);
  }

  private emit(kind: string, points: Vec2[], damageType: string, ttl: number): void {
    this.state.vfx.push({ kind, points, damageType, age: 0, ttl });
  }

  private stepHero(dt: number): void {
    const s = this.state;
    const hero = s.hero;

    if (hero.cooldown > 0) hero.cooldown -= dt;
    if (hero.hitFlash > 0) hero.hitFlash -= dt;
    if (hero.actionTimer > 0) hero.actionTimer -= dt;

    if (hero.life < hero.stats.maxLife) {
      hero.life = Math.min(hero.stats.maxLife, hero.life + hero.stats.lifeRegen * dt);
    }

    const target = this.acquireTarget(hero);

    if (target) {
      const d = dist(hero, target);
      // In range is not enough — you have to be able to see it. Without this a
      // ranged attack happily shoots through a wall.
      if (d <= hero.stats.attackRange && this.canSee(hero, target)) {
        hero.path = [];
        this.face(hero, target.x, target.y);
        this.settleAction(hero, false);
        if (hero.cooldown <= 0) this.useSkill(hero, target, this.skill);
      } else if (!this.advance(hero, target, dt)) {
        // Route vanished mid-chase. Drop it; the next flood picks correctly.
        hero.targetId = null;
        hero.path = [];
      }
      return;
    }

    // Nothing reachable is left — the flood is authoritative about that, so
    // no separate bookkeeping is needed to be sure.
    // Map is empty. Something takes its place at the exit, once.
    if (!this.finale) {
      this.spawnFinale();
      return;
    }

    // Finale down too — that's the run.
    s.status = 'cleared';
    this.events.push({ kind: 'cleared', seconds: s.elapsed, killed: s.killed });
  }

  /**
   * Spawns the closing encounter at the exit.
   *
   * Rolled from the run's rng rather than the crystal, so the same crystal
   * doesn't always end the same way. The hero walks over to it like anything
   * else — the approach is the drama, no special casing needed.
   */
  private spawnFinale(): void {
    const s = this.state;
    const def = this.rng.weighted(ENCOUNTERS, (e) => e.weight) ?? ENCOUNTERS[0];
    this.finale = def;

    const base = this.finaleStats;
    const stats: CombatStats = {
      ...base,
      maxLife: base.maxLife * def.life,
      damage: base.damage * def.damage,
    };

    const exit = s.map.exit;
    for (let i = 0; i < def.count; i++) {
      // Ring them around the exit so a swarm doesn't spawn inside itself;
      // separation sorts out the rest on the first tick.
      const angle = (i / Math.max(1, def.count)) * Math.PI * 2;
      const spread = def.count > 1 ? 0.8 + def.count * 0.09 : 0;

      const entity: Entity = {
        id: this.nextId++,
        kind: 'monster',
        sprite: def.count === 1 ? 'brute' : 'husk',
        radius: 0.34 * def.size,
        skillId: null,
        x: exit.x + Math.cos(angle) * spread,
        y: exit.y + Math.sin(angle) * spread,
        facing: angle + Math.PI,
        action: 'idle',
        actionTimer: 0,
        deathAge: 0,
        ailments: [],
        bounty: def.bounty,
        life: stats.maxLife,
        stats,
        cooldown: 0,
        path: [],
        pathTimer: 0,
        targetId: null,
        // Awake from the moment they exist; they're the point of the room.
        aggroed: true,
        hitFlash: 0,
        dead: false,
      };
      s.monsters.push(entity);
      this.byId.set(entity.id, entity);
    }

    s.totalMonsters += def.count;
    s.finale = def.name;
    this.events.push({ kind: 'finale', name: def.name, herald: def.herald });
  }

  private stepMonster(m: Entity, dt: number): void {
    const hero = this.state.hero;
    if (m.cooldown > 0) m.cooldown -= dt;

    const d = dist(m, hero);
    if (d > ACTIVE_RANGE) return;

    // Monsters wake to something they can actually see. Once woken they stay
    // woken and will chase around corners — losing sight of you mid-fight
    // shouldn't make a pack forget you exist.
    if (!m.aggroed && d <= m.stats.aggroRange && this.canSee(m, hero)) m.aggroed = true;
    if (!m.aggroed) return;

    if (m.actionTimer > 0) m.actionTimer -= dt;

    if (d <= m.stats.attackRange && this.canSee(m, hero)) {
      m.path = [];
      this.face(m, hero.x, hero.y);
      this.settleAction(m, false);
      if (m.cooldown <= 0) {
        const skill = m.skillId ? SKILL_BY_ID[m.skillId] : undefined;
        if (skill) {
          // Ranged packs go through the exact same skill path the hero uses.
          this.useSkill(m, hero, skill);
        } else {
          this.dealDamage(m, hero, 1);
          m.cooldown = 1 / m.stats.attacksPerSecond;
        }
      }
      return;
    }
    this.advance(m, hero, dt);
  }

  /**
   * Hold the committed target until it dies; otherwise take the nearest by
   * WALKING distance.
   *
   * Straight-line distance was the bug: a monster three tiles away through a
   * wall beat one twelve tiles down an open corridor, so the hero jogged past
   * a room full of things to reach whatever was nearest as the crow flies.
   * nearestByPath floods outward from the hero, so "nearest" means what it
   * looks like it means on screen.
   *
   * It's also authoritative about reachability — a walled-off monster is
   * never returned — so null here honestly means "nothing left to fight".
   * The ignore/hopeless bookkeeping that used to live here existed only to
   * paper over euclidean picking things it couldn't reach, and went with it.
   */
  private acquireTarget(hero: Entity): Entity | null {
    if (hero.targetId !== null) {
      const held = this.byId.get(hero.targetId);
      if (held && !held.dead) return held;
      hero.targetId = null;
      hero.path = [];
    }

    const { grid } = this.state.map;
    const occupancy = new Map<number, Entity>();
    for (const m of this.state.monsters) {
      if (m.dead) continue;
      const key = Math.round(m.y) * grid.width + Math.round(m.x);
      if (!occupancy.has(key)) occupancy.set(key, m);
    }
    if (occupancy.size === 0) return null;

    const key = nearestByPath(grid, hero, (k) => occupancy.has(k));
    if (key === null) return null;

    // A four-way route exists, so A* with diagonals will always find one too.
    const candidate = occupancy.get(key)!;
    hero.targetId = candidate.id;
    hero.path = findPath(grid, hero, candidate);
    hero.pathTimer = 0.4;
    return candidate;
  }

  /**
   * Walk along a cached path, repathing on a stagger so a whole pack never
   * recomputes on the same tick.
   *
   * Returns false when there is no route to the goal, which callers treat as
   * "pick something else" rather than looping forever.
   */
  private advance(e: Entity, goal: Vec2, dt: number): boolean {
    e.pathTimer -= dt;
    if (e.path.length === 0 || e.pathTimer <= 0) {
      e.path = findPath(this.state.map.grid, e, goal);
      e.pathTimer = 0.4 + this.rng.float(0, 0.25);
      if (e.path.length === 0) return false;
    }

    const startX = e.x;
    const startY = e.y;

    let remaining = e.stats.moveSpeed * dt;
    while (remaining > 0 && e.path.length > 0) {
      const wp = e.path[0];
      const dx = wp.x - e.x;
      const dy = wp.y - e.y;
      const d = Math.hypot(dx, dy);
      if (d <= 1e-6) {
        e.path.shift();
        continue;
      }
      if (d <= remaining) {
        e.x = wp.x;
        e.y = wp.y;
        e.path.shift();
        remaining -= d;
      } else {
        e.x += (dx / d) * remaining;
        e.y += (dy / d) * remaining;
        remaining = 0;
      }
    }

    const moved = Math.abs(e.x - startX) > 1e-6 || Math.abs(e.y - startY) > 1e-6;
    if (moved) this.face(e, e.x + (e.x - startX), e.y + (e.y - startY));
    this.settleAction(e, moved);
    return true;
  }

  /**
   * Use the character's skill. The behaviour decides WHO gets hit; the sim
   * decides what a hit does. Adding chain lightning or a ground slam means
   * adding a behaviour, not touching this method.
   */
  private useSkill(user: Entity, primary: Entity, skill: SkillDef): void {
    const behaviour = SKILL_BEHAVIOURS[skill.behaviour] ?? SKILL_BEHAVIOURS.single_target;

    user.action = 'attack';
    user.actionTimer = ATTACK_POSE;

    behaviour({
      skill,
      user,
      primary,
      // Whose side you're on decides who counts as an enemy. Monsters only
      // ever have one, which is why this stays a list rather than a lookup.
      enemies:
        user.kind === 'hero'
          ? this.state.monsters.filter((m) => !m.dead)
          : [this.state.hero],
      rng: this.rng,
      hit: (target, multiplier) => this.dealDamage(user, target, multiplier, skill),
      ailment: (target, multiplier, seconds) =>
        this.applyAilment(user, target, multiplier, seconds, skill),
      vfx: (kind, points, ttl = 0.3) =>
        this.emit(kind, points, skill.damageTypes[0] ?? 'physical', ttl),
    });

    user.cooldown = 1 / user.stats.attacksPerSecond;
  }

  private dealDamage(
    attacker: Entity,
    defender: Entity,
    multiplier: number,
    skill?: SkillDef
  ): void {
    const s = this.state;
    if (defender.dead) return;

    const crit =
      attacker.stats.critChance > 0 && this.rng.chance(attacker.stats.critChance / 100);

    let dmg = attacker.stats.damage * multiplier * this.rng.float(0.9, 1.1);
    if (crit) dmg *= 2;

    const type = skill?.damageTypes[0] ?? attacker.stats.damageType ?? 'physical';

    // Resistance first, then armour. They're both multipliers so the order
    // between them doesn't change the result — but each must be applied to
    // ONE type's damage, never to a summed total, or fire resistance would
    // start reducing physical hits.
    dmg = this.afterResistance(defender, dmg, type);

    // Armour is a flat percentage against hits only. Damage over time skips
    // this entirely, which is what lets an ailment threaten a tanky build.
    dmg *= 1 - defender.stats.armourReduction / 100;
    dmg = Math.max(1, dmg);

    defender.life -= dmg;
    defender.hitFlash = 0.18;
    defender.action = 'hurt';
    defender.actionTimer = HURT_POSE;
    this.face(attacker, defender.x, defender.y);

    // Every hit leaves a mark the renderer can draw. Type comes from the
    // attacker's skill for the hero, and is plain physical for monsters.
    this.emit(
      'impact',
      [{ x: defender.x, y: defender.y }],
      skill?.damageTypes[0] ?? attacker.stats.damageType ?? 'physical',
      0.25
    );

    // Cooldown is the caller's business — a multi-target skill deals several
    // hits from one use and must not pay for each of them.

    s.floaters.push({
      x: defender.x,
      y: defender.y,
      text: String(Math.round(dmg)),
      age: 0,
      crit,
      on: defender.kind,
    });

    if (defender.kind === 'hero') {
      s.damageTaken[type] = (s.damageTaken[type] ?? 0) + dmg;
      this.events.push({ kind: 'hurt', life: Math.max(0, defender.life), maxLife: defender.stats.maxLife });
    }

    if (defender.life <= 0) this.kill(defender);
  }

  /** Typeless has no entry, so it passes through untouched — by design. */
  private afterResistance(defender: Entity, amount: number, type: string): number {
    const res = defender.stats.resistances[type] ?? 0;
    return amount * (1 - res / 100);
  }

  /**
   * Applies one stack of damage over time.
   *
   * `multiplier` is total damage across the whole duration relative to the
   * skill's damage, so behaviours never have to reason in per-tick numbers.
   */
  private applyAilment(
    attacker: Entity,
    target: Entity,
    multiplier: number,
    seconds: number,
    skill: SkillDef
  ): void {
    if (target.dead || seconds <= 0) return;

    const total = attacker.stats.damage * multiplier;
    const type = skill.damageTypes[0] ?? 'physical';

    // Oldest stack falls off rather than refusing the new one, so re-applying
    // to a saturated target still refreshes rather than being wasted.
    if (target.ailments.length >= MAX_AILMENT_STACKS) target.ailments.shift();
    target.ailments.push({ type, dps: total / seconds, remaining: seconds });
  }

  /** Ticks every active stack. Resisted, never armoured. */
  private stepAilments(e: Entity, dt: number): void {
    if (e.ailments.length === 0 || e.dead) return;
    let total = 0;

    for (const ailment of e.ailments) {
      ailment.remaining -= dt;
      const dealt = this.afterResistance(e, ailment.dps * dt, ailment.type);
      total += dealt;
      if (e.kind === 'hero') {
        this.state.damageTaken[ailment.type] =
          (this.state.damageTaken[ailment.type] ?? 0) + dealt;
      }
    }
    e.ailments = e.ailments.filter((a) => a.remaining > 0);
    if (total <= 0) return;

    e.life -= total;
    if (e.life <= 0) this.kill(e);
  }

  private kill(victim: Entity): void {
    const s = this.state;
    victim.dead = true;
    victim.life = 0;

    if (victim.kind === 'hero') {
      s.status = 'died';
      this.events.push({ kind: 'died', seconds: s.elapsed, killed: s.killed });
      return;
    }

    s.killed++;
    s.xpGained += this.xpPerKill * victim.bounty;
    s.loot.currency.fragment =
      (s.loot.currency.fragment ?? 0) + this.fragmentsPerKill * victim.bounty;
    this.rollCurrency();
    this.events.push({ kind: 'kill', total: s.killed, xp: this.xpPerKill });
  }

  /**
   * Currency drops, and the only thing rarity does.
   *
   * A drop starts at `basic` and rarity gives it repeated chances to climb a
   * class, so the scarce currencies are reachable only by making the map more
   * dangerous. This is also what finally gives the sigils a source — before
   * this they existed solely in the starting wallet.
   */
  private rollCurrency(): void {
    if (!this.rng.chance(CURRENCY_DROP.chancePerKill)) return;

    const climb = CURRENCY_DROP.upgradeChance * (1 + this.rewards.rarity / 100);
    let rank = 0;
    while (rank < CURRENCY_CLASSES.length - 1 && this.rng.chance(climb)) rank++;

    const cls = CURRENCY_CLASSES[rank];
    const pool = CURRENCIES.filter((c) => c.class === cls);
    const dropped = this.rng.pick(pool);
    if (!dropped) return;

    const loot = this.state.loot.currency;
    loot[dropped.id] = (loot[dropped.id] ?? 0) + 1;
  }
}

/** Convenience for the headless callers (demo, smoke): run to completion. */
export function runToCompletion(sim: RunSim, maxSeconds = 600): RunState {
  let guard = Math.ceil(maxSeconds / TICK);
  while (sim.state.status === 'running' && guard-- > 0) sim.step(TICK);
  return sim.state;
}
