/**
 * The run: deterministic, headless, fixed-timestep. Same crystal, gear and seed
 * gives the same run tick for tick, so a balance complaint is a seed rather than
 * a description. The caller owns real time and calls step(TICK) a whole number
 * of times, so frame rate never changes an outcome.
 */
import { Rng } from '../rng';
import { generateMap, dist, hasLineOfSight } from './grid';
import type { GameMap, Vec2 } from './grid';
import { findPath, nearestByPath } from './pathfind';
import { AILMENT } from '../data';
import { lookOf } from './appearance';
import {
  characterStats,
  effectiveSkill,
  mapDensity,
  monsterStats,
  treeGrants,
} from './stats';
import type { CombatStats } from './stats';
import { SKILL_BEHAVIOURS } from './skills';
import { monsterXp } from './character';
import type { Character } from './character';
import { dominantFamily, familyPlan, runSet } from './crystal';
import type { RunSet } from './crystal';
import {
  CURRENCIES,
  CURRENCY_DROP,
  ENCOUNTERS,
  ALL_MODS,
  HERO_BASE,
  LOOT,
  MONSTERS,
  MONSTERS_BY_FAMILY,
  MONSTER_RANKS,
  MONSTER_RANGED_SKILL,
  RANGED_PACK_CHANCE,
  SKILLS,
  SKILL_BY_ID,
} from '../data';
import { LAMPWRIGHT, socketPackSize, socketPacks, socketSize } from '../data';
import type { EncounterDef } from '../data';
import { ModPool } from '../mods';
import { pickGearBase, pickQuality, rollGear } from '../economy';
import type { Item, Look, SkillDef } from '../types';
import type { MonsterRank } from '../render/bestiary';

/** Built once at load: derived from authored data and never mutated. */
const DROP_POOL = new ModPool(ALL_MODS);

/** Sim step. 30/s is plenty for movement this slow and keeps replays cheap. */
export const TICK = 1 / 30;

/** Monsters beyond this range of the hero don't think at all. */
const ACTIVE_RANGE = 16;

/** Relaxation iterations for body separation. See separate(). */
const SEPARATION_PASSES = 2;

/**
 * How far waking one monster wakes its neighbours. ONE hop: letting the woken
 * wake their own would cascade across a dense map and pull everything at once.
 */
const AGGRO_CHAIN_RADIUS = 4.5;

/** Ordered worst-to-best, so rarity climbs the list. */
const CURRENCY_CLASSES = ['basic', 'uncommon', 'rare', 'exotic'] as const;

export type EntityKind = 'hero' | 'monster';

/**
 * A damage-over-time stack. Resisted, but NOT armoured, which is what makes an
 * ailment the answer to a target you cannot punch through. Separate entries
 * rather than a merged number, so each expires on its own clock.
 */
export interface Ailment {
  /** What the ailment IS, for naming and for what contagion plants. */
  type: string;
  /** Damage per second before resistance, per damage type. */
  dps: Record<string, number>;
  remaining: number;
  /** Countdown to the next lump. Discrete, so a poison can critically TICK. */
  tickIn: number;
  /** Crit chance of whoever applied it, snapshotted. */
  critChance: number;
  /** Extra crit damage of whoever applied it, snapshotted. */
  critMultiplier: number;
  /**
   * Contagion. Present only when the poison can propagate; absent poison is
   * inert and just ticks.
   */
  spread?: {
    source: Entity;
    skill: SkillDef;
    /** Total damage of the poison this plants, relative to the skill. */
    multiplier: number;
    duration: number;
    /** Already scaled by Area of Effect at the time it was planted. */
    radius: number;
    /** How many jumps this poison is from the hero's own cast. */
    generation: number;
  };
}

const MAX_AILMENT_STACKS = AILMENT.maxStacks;
const AILMENT_TICK = AILMENT.tick;

/**
 * How far contagion may travel from the cast. A cap on WORK, not on state:
 * re-poisoning refreshes rather than duplicates, so the poisoned set already
 * saturates, but a dense room could still scan every enemy from every enemy.
 */
const MAX_CONTAGION_GENERATIONS = 3;

/** Named so a renderer picks an animation rather than guessing from deltas. */
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
  /** Worn art keys, for anything the renderer draws in layers. */
  look?: Look;
  /** How much of a tile the art covers. */
  scale: number;
  /** Common, magic or rare. Drives size, halo and what it is worth. */
  rank: MonsterRank;
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
  /** Multiplier on the xp and gold this one is worth. 1 for rank and file. */
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
 * A transient visual event. Only the sim knows the SHAPE of what happened — a
 * chain's arc is A→B→C, which no renderer could rebuild from "three entities
 * lost life". `points` is in tile units.
 */
export interface Vfx {
  kind: string;
  points: Vec2[];
  damageType: string;
  age: number;
  ttl: number;
}

/** The hero hunts everything, then the finale spawns at the exit. */
export interface RunOptions {
  /** Thins the packs without touching the map. Harness use only. */
  densityScale?: number;
  /** Chance the Lampwright is met down here. The player's, not the run's. */
  crystalGift?: number;
}

export type RunEvent =
  | { kind: 'finale'; name: string; herald: string }
  | { kind: 'met'; who: string; said: string }
  | { kind: 'kill'; total: number; xp: number }
  | { kind: 'hurt'; life: number; maxLife: number }
  | { kind: 'cleared'; seconds: number; killed: number }
  | { kind: 'died'; seconds: number; killed: number };

export type RunStatus = 'running' | 'cleared' | 'died';

/** Held by the run, not the player: banked only if the run is cleared. */
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
  /** The socketed set this was launched with. Never changes mid-descent. */
  set: RunSet;
  /** Whether the Lampwright turned up. The report is what pays it out. */
  met: boolean;
  /** Damage taken, by type. The results overlay renders whatever it is handed. */
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
  /** Gold one monster is worth. Fractional; rounds when banked. */
  private goldPerKill = 0;
  /** Tree switches for the hero's skill, resolved once at spawn. */
  private readonly grants: Record<string, unknown>;
  /** Crit decided for the current skill use, so every target shares it. */
  private useCrit: boolean | null = null;
  /** How many times the hero has cast, for nodes that count casts. */
  private casts = 0;
  /** Set once the closing encounter has been spawned. */
  private finale: EncounterDef | null = null;
  /** Kill count the Lampwright turns up on, or null for a descent they miss. */
  private meetAt: number | null = null;
  /** Baseline monster stats for this map, scaled into the finale. */
  private finaleStats!: CombatStats;
  private byId = new Map<number, Entity>();
  /**
   * The socketed set: how long the run is, how dangerous, and what it pays.
   * Read once at spawn — nothing about a set changes mid-descent.
   */
  readonly set: RunSet;

  constructor(
    crystals: Item[],
    character: Character,
    rng: Rng,
    options: RunOptions = {}
  ) {
    this.rng = rng;
    this.options = options;
    this.grants = treeGrants(character);
    // The tree can change what the skill IS — its damage type, its tags — and
    // the sim has to fight with the same skill the stat sheet described, or a
    // converted Fireball scales off cold and is resisted as fire.
    this.skill = effectiveSkill(SKILL_BY_ID[character.skillId] ?? SKILLS[0], this.grants);
    this.set = runSet(crystals);

    // Sockets are the only thing that lengthens a descent. An empty Fissure is
    // index zero of the same table, not a special case beside it.
    const map = generateMap(
      this.set.mods,
      rng,
      socketSize(this.set.filled),
      Math.max(1, Math.round(this.set.power))
    );
    const stats = characterStats(character);

    const hero: Entity = {
      id: 0,
      kind: 'hero',
      sprite: 'hero',
      look: lookOf(character),
      scale: 1.15,
      rank: 'common',
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

    const monsters = this.spawn(map);
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
      set: this.set,
      met: false,
      damageTaken: {},
    };

    // Rolled only when there is something to give, so a harness that passes no
    // chance draws exactly the stream it always did. Never on the last kills:
    // a meeting the finale interrupts reads as having missed it.
    const chance = options.crystalGift ?? 0;
    if (chance > 0 && rng.chance(chance)) {
      this.meetAt = rng.int(1, Math.max(1, Math.floor(monsters.length * 0.7)));
    }
  }

  /** Packs land in rooms other than the entrance, so you always get a moment
   *  to look at the map before anything reaches you. */
  private spawn(map: GameMap): Entity[] {
    const filled = this.set.filled;
    const density = mapDensity(this.set.mods);
    const thin = this.options.densityScale ?? 1;
    // Sockets add PACKS, never bigger ones: a longer run rather than a harder
    // room. Scaling both would square it.
    const packCount = Math.max(1, Math.round(density.packCount * thin * socketPacks(filled)));
    const packSize = Math.max(1, Math.round(density.packSize * socketPackSize(filled)));
    // Run power pays here: it is the one number a reward reads.
    this.xpPerKill = monsterXp(this.set.power);
    this.goldPerKill =
      LOOT.goldPerKill *
      Math.pow(LOOT.powerScale, this.set.power) *
      this.set.rewards.goldYield;

    // One family per pack, for the same reason as one kind per pack.
    const plan = familyPlan(this.set.composition, packCount);

    const rooms = map.rooms.length > 1 ? map.rooms.slice(1) : map.rooms;
    const monsters: Entity[] = [];

    // Stats are per KIND, not per monster — one shared object per kind keeps
    // fifty entities cheap and makes "all Brutes hit this hard" true by
    // construction.
    const statsFor = new Map<string, CombatStats>();

    // Baseline for the finale, so it scales with the crystal like everything
    // else rather than being a fixed lump of numbers. Fixed to one monster
    // across every family: the closing fight is the same fight in all three.
    this.finaleStats = monsterStats(this.set.mods, MONSTERS[0]);

    for (let p = 0; p < packCount; p++) {
      const room = this.rng.pick(rooms) ?? rooms[0];

      // One kind per pack. Mixed packs read as noise; a uniform pack reads as
      // a thing you can recognise and react to.
      const pool = MONSTERS_BY_FAMILY[plan[p] ?? 'normal'];
      const def = this.rng.weighted(pool, (m) => m.weight) ?? pool[0];
      const ranged = this.rng.chance(RANGED_PACK_CHANCE);
      const bolt = SKILL_BY_ID[MONSTER_RANGED_SKILL];

      // Stats differ between the melee and ranged variants of a kind, so they
      // key separately — a ranged pack reaches much further and has to notice
      // the hero from beyond its own reach to ever open fire.
      for (let i = 0; i < packSize; i++) {
        // Per monster, not per pack: a pack with one blue thing in it is a
        // pack you look at. Stats key on the rank too, or every rare in the
        // run would share the common one's life.
        const rank = this.rng.weighted(MONSTER_RANKS, (r) => r.weight) ?? MONSTER_RANKS[0];
        const statsKey = `${def.id}:${ranged ? 'r' : 'm'}:${rank.id}`;
        let stats = statsFor.get(statsKey);
        if (!stats) {
          const base = monsterStats(this.set.mods, def);
          const damage = base.damage * rank.damage;
          stats = {
            ...base,
            maxLife: base.maxLife * rank.life,
            damage,
            // Beside `damage`, never derived from it later: a rank that scaled
            // one and not the other is a rare that hits like a common.
            damageByType: { [base.damageType ?? 'physical']: damage },
          };
          if (ranged && bolt) {
            stats = {
              ...stats,
              attackRange: bolt.range,
              aggroRange: bolt.range + 2,
              // What it throws, not what the map is made of.
              damageByType: { [bolt.damageTypes[0] ?? 'physical']: damage },
            };
          }
          statsFor.set(statsKey, stats);
        }

        monsters.push({
          id: this.nextId++,
          kind: 'monster',
          sprite: def.sprite,
          scale: def.scale * rank.scale,
          rank: rank.id,
          radius: def.radius * rank.scale,
          skillId: ranged && bolt ? MONSTER_RANGED_SKILL : null,
          x: this.rng.float(room.x, room.x + room.w - 1),
          y: this.rng.float(room.y, room.y + room.h - 1),
          facing: this.rng.float(0, Math.PI * 2),
          action: 'idle',
          actionTimer: 0,
          deathAge: 0,
          ailments: [],
          bounty: rank.bounty,
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
   * Push overlapping bodies apart, after everyone has moved: entities steer as if
   * the world were empty and then get shoved out of each other. Bucketed by tile
   * so it stays linear — sixty monsters in a room is 1,800 pairs a tick.
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

  /**
   * Move an entity, refusing any component that would put its BODY inside a
   * wall. Separation is what pushes things into rock — a path only ever runs
   * down tile centres — so this is where the clipping was.
   *
   * An entity already overlapping a wall (spawned at a room's edge, or scaled
   * up by its rank where it stood) falls back to its centre, so it can always
   * walk out of somewhere it should never have been.
   */
  private nudge(e: Entity, dx: number, dy: number): void {
    const { grid } = this.state.map;
    const stuck = !grid.fits(e.x, e.y, e.radius);
    const ok = (x: number, y: number): boolean =>
      stuck ? grid.walkable(x, y) : grid.fits(x, y, e.radius);

    if (ok(e.x + dx, e.y)) e.x += dx;
    if (ok(e.x, e.y + dy)) e.y += dy;
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

  /** Rolled from the run's rng, so the same crystal does not always end the same. */
  private spawnFinale(): void {
    const s = this.state;
    const def = this.rng.weighted(ENCOUNTERS, (e) => e.weight) ?? ENCOUNTERS[0];
    this.finale = def;

    // Whatever the run was mostly made of closes it: the family's biggest for
    // a single target, its rank and file for a swarm. Who shows up, never how
    // hard — the stats above come off one fixed baseline for every family.
    const pool = MONSTERS_BY_FAMILY[dominantFamily(this.set.composition)];
    const biggest = pool.reduce((a, b) => (b.scale > a.scale ? b : a));
    const commonest = pool.reduce((a, b) => (b.weight > a.weight ? b : a));

    const base = this.finaleStats;
    const damage = base.damage * def.damage;
    const stats: CombatStats = {
      ...base,
      maxLife: base.maxLife * def.life,
      damage,
      damageByType: { [base.damageType ?? 'physical']: damage },
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
        sprite: def.count === 1 ? biggest.sprite : commonest.sprite,
        // The finale is its own rank: gold-haloed, because a thing worth
        // fourteen kills should not look like the one worth a tenth of that.
        scale: (def.count === 1 ? biggest.scale : commonest.scale) * def.size,
        rank: 'rare',
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

    // Woken by sight, and once woken they chase around corners. Waking one
    // wakes whoever is beside it, so a pack turns together.
    if (!m.aggroed && d <= m.stats.aggroRange && this.canSee(m, hero)) this.wake(m, true);
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
   * Hold the committed target until it dies, else the nearest by WALKING
   * distance. Straight-line picking sends the hero past a room full of things to
   * reach whatever is closest through a wall; nearestByPath is also
   * authoritative about reachability, so null honestly means nothing is left.
   *
   * Among things already in REACH, "best" is whichever puts the most enemies
   * inside the skill's area — nearest-first clips the straggler on the near edge
   * of a pack. A skill with no area scores every candidate 1 and falls through
   * to the closest, and this never chooses to walk further for a better angle.
   */
  private bestInReach(hero: Entity): Entity | null {
    const radius = this.areaRadiusFor(hero);
    const reach = hero.stats.attackRange;

    const candidates = this.state.monsters.filter(
      (m) => !m.dead && dist(hero, m) <= reach && this.canSee(hero, m)
    );
    if (candidates.length === 0) return null;

    let best = candidates[0];
    let bestScore = -1;
    let bestDist = Infinity;
    for (const c of candidates) {
      const caught =
        radius <= 0 ? 1 : candidates.filter((o) => dist(c, o) <= radius).length;
      const d = dist(hero, c);
      // Ties go to the closer one, which keeps single-target skills behaving
      // exactly as they did.
      if (caught > bestScore || (caught === bestScore && d < bestDist)) {
        best = c;
        bestScore = caught;
        bestDist = d;
      }
    }
    return best;
  }

  /**
   * The one place Area of Effect becomes tiles. Targeting and the behaviour both
   * come through here, or the hero aims at a circle it does not hit with.
   */
  private areaRadius(user: Entity, base: number): number {
    if (base <= 0) return 0;
    return base * Math.sqrt(1 + (user.stats.areaOfEffect ?? 0) / 100);
  }

  /** The equipped skill's area in tiles, for aiming. */
  private areaRadiusFor(user: Entity): number {
    return this.areaRadius(user, (this.skill.params?.radius as number) ?? 0);
  }

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

    // Anything already in reach is free to choose between — walking is the
    // only thing nearest-first is protecting, and none of these need it.
    const best = this.bestInReach(hero);
    if (best) {
      hero.targetId = best.id;
      hero.path = [];
      return best;
    }

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
   * Walk a cached path, repathing on a stagger so a pack never recomputes on one
   * tick. False means no route, which callers treat as "pick something else".
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

  /** The behaviour decides WHO gets hit; the sim decides what a hit does. */
  private useSkill(user: Entity, primary: Entity, skill: SkillDef): void {
    const behaviour = SKILL_BEHAVIOURS[skill.behaviour] ?? SKILL_BEHAVIOURS.single_target;

    user.action = 'attack';
    user.actionTimer = ATTACK_POSE;

    const grants = user.kind === 'hero' ? this.grants : {};
    const castIndex = user.kind === 'hero' ? this.casts++ : 0;

    // Rolled once for the whole use. Behaviours branch on it (Contagion), and
    // dealDamage honours it so a critical cast crits every target it touches.
    const crit =
      user.stats.critChance > 0 && this.rng.chance(user.stats.critChance / 100);

    // Kindling and the like: the roll still HAPPENS — the behaviour needs to
    // know a crit came up so it can do something else with it — but the hit
    // itself lands as a normal hit. A behaviour cannot take a crit back after
    // asking for the damage, so the suppression has to be here.
    this.useCrit = grants.critAilment ? false : crit;

    behaviour({
      skill,
      user,
      primary,
      grants,
      crit,
      castIndex,
      // Whose side you're on decides who counts as an enemy. Monsters only
      // ever have one, which is why this stays a list rather than a lookup.
      enemies:
        user.kind === 'hero'
          ? this.state.monsters.filter((m) => !m.dead)
          : [this.state.hero],
      rng: this.rng,
      hit: (target, multiplier) => this.dealDamage(user, target, multiplier, skill),
      ailment: (target, multiplier, seconds, spread) =>
        this.applyAilment(user, target, multiplier, seconds, skill, spread),
      areaRadius: (base) => this.areaRadius(user, base),
      vfx: (kind, points, ttl = 0.3) =>
        this.emit(kind, points, skill.damageTypes[0] ?? 'physical', ttl),
    });

    this.useCrit = null;
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

    // Inside a skill use, crit was decided once for the whole cast. A plain
    // monster swing rolls its own.
    const crit =
      this.useCrit ??
      (attacker.stats.critChance > 0 &&
        this.rng.chance(attacker.stats.critChance / 100));

    let scale = multiplier * this.rng.float(0.9, 1.1);
    if (crit) scale *= 2 + attacker.stats.critMultiplier / 100;

    // Resistance first, then armour. They're both multipliers so the order
    // between them doesn't change the result — but resistance must be applied
    // to ONE type's damage, never to a summed total, or fire resistance would
    // start reducing the physical half of the same hit.
    //
    // Armour is a flat percentage against hits only, and is typeless. Damage
    // over time skips it entirely, which is what lets an ailment threaten a
    // tanky build.
    const armour = 1 - defender.stats.armourReduction / 100;
    const byType: Record<string, number> = {};
    let dmg = 0;
    for (const [type, amount] of Object.entries(attacker.stats.damageByType)) {
      const dealt = this.afterResistance(defender, amount * scale, type) * armour;
      byType[type] = (byType[type] ?? 0) + dealt;
      dmg += dealt;
    }
    // The floor is on the HIT, not per type: a hit split six ways would
    // otherwise be worth six times the minimum.
    dmg = Math.max(1, dmg);

    // Being hit is the most reliable way to notice someone, whatever the
    // range or the line of sight.
    this.wake(defender, true);

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
      for (const [type, dealt] of Object.entries(byType)) {
        s.damageTaken[type] = (s.damageTaken[type] ?? 0) + dealt;
      }
      this.events.push({ kind: 'hurt', life: Math.max(0, defender.life), maxLife: defender.stats.maxLife });
    }

    if (defender.life <= 0) this.kill(defender);
  }

  /** `chain` is false on the second hop, so a pack wakes but the map does not. */
  private wake(m: Entity, chain: boolean): void {
    if (m.kind !== 'monster' || m.dead || m.aggroed) return;
    m.aggroed = true;
    if (!chain) return;

    for (const other of this.state.monsters) {
      if (other === m || other.dead || other.aggroed) continue;
      if (dist(m, other) <= AGGRO_CHAIN_RADIUS) this.wake(other, false);
    }
  }

  /** Typeless has no entry, so it passes through untouched — by design. */
  private afterResistance(defender: Entity, amount: number, type: string): number {
    const res = defender.stats.resistances[type] ?? 0;
    return amount * (1 - res / 100);
  }

  /** `multiplier` is total damage across the duration, never per tick. */
  private applyAilment(
    attacker: Entity,
    target: Entity,
    multiplier: number,
    seconds: number,
    skill: SkillDef,
    spread?: { radius: number; generation: number }
  ): void {
    if (target.dead || seconds <= 0) return;

    // A cast's typed parts tick as themselves: a cold ring on Blight is cold
    // damage over time, resisted as cold, not more poison.
    const dps: Record<string, number> = {};
    for (const [t, amount] of Object.entries(attacker.stats.damageByType)) {
      dps[t] = (amount * multiplier) / seconds;
    }

    // Oldest stack falls off rather than refusing the new one, so re-applying
    // to a saturated target still refreshes rather than being wasted.
    if (target.ailments.length >= MAX_AILMENT_STACKS) target.ailments.shift();
    target.ailments.push({
      type: skill.damageTypes[0] ?? 'physical',
      dps,
      remaining: seconds,
      // Staggered by a partial tick so a burst of poison applied on the same
      // frame doesn't then crit in lockstep forever after.
      tickIn: AILMENT_TICK * this.rng.float(0.5, 1),
      critChance: attacker.stats.critChance,
      critMultiplier: attacker.stats.critMultiplier,
      spread: spread
        ? {
            source: attacker,
            skill,
            multiplier,
            duration: seconds,
            radius: spread.radius,
            generation: spread.generation,
          }
        : undefined,
    });
  }

  /**
   * Every active stack. Resisted, never armoured. A tick that crits deals crit
   * damage and, with contagion, plants the poison around its victim — the
   * disease spreads on its own, not the cast.
   */
  private stepAilments(e: Entity, dt: number): void {
    if (e.ailments.length === 0 || e.dead) return;
    let total = 0;
    let contagious: Ailment['spread'][] = [];

    for (const ailment of e.ailments) {
      ailment.remaining -= dt;
      ailment.tickIn -= dt;
      if (ailment.tickIn > 0) continue;

      // A stack that expires mid-tick still pays out the slice it lived for,
      // so shortening a poison never refunds damage it had already earned.
      const slice = Math.min(AILMENT_TICK, AILMENT_TICK + ailment.remaining);
      ailment.tickIn += AILMENT_TICK;
      if (slice <= 0) continue;

      let scale = slice;
      const crit =
        ailment.critChance > 0 && this.rng.chance(ailment.critChance / 100);
      if (crit) {
        scale *= 2 + ailment.critMultiplier / 100;
        if (ailment.spread) contagious.push(ailment.spread);
      }

      // Resisted per type, never armoured — which is what lets an ailment
      // threaten a build no hit can get through.
      for (const [type, dps] of Object.entries(ailment.dps)) {
        const dealt = this.afterResistance(e, dps * scale, type);
        total += dealt;
        if (e.kind === 'hero') {
          this.state.damageTaken[type] = (this.state.damageTaken[type] ?? 0) + dealt;
        }
      }
    }
    e.ailments = e.ailments.filter((a) => a.remaining > 0);

    // Spread BEFORE the victim can die, so a killing tick still infects the
    // pack — the corpse is exactly when you want the disease to jump.
    for (const s of contagious) this.spreadAilment(e, s!);

    if (total <= 0) return;

    // Poison counts as being hit. Without this an area ailment could kill
    // something across the room that never once looked up.
    this.wake(e, true);

    e.life -= total;
    if (e.life <= 0) this.kill(e);
  }

  /** Plants a fresh burst of the same poison around a critically-ticking victim. */
  private spreadAilment(victim: Entity, spread: NonNullable<Ailment['spread']>): void {
    if (spread.generation >= MAX_CONTAGION_GENERATIONS) return;

    const pool =
      victim.kind === 'hero' ? [this.state.hero] : this.state.monsters.filter((m) => !m.dead);

    let jumped = false;
    for (const other of pool) {
      if (other === victim || other.dead) continue;
      if (Math.hypot(other.x - victim.x, other.y - victim.y) > spread.radius) continue;
      this.applyAilment(spread.source, other, spread.multiplier, spread.duration, spread.skill, {
        radius: spread.radius,
        generation: spread.generation + 1,
      });
      jumped = true;
    }

    // Draw the jump even when it lands on nobody: a Contagion proc you cannot
    // see reads as the talent not working.
    this.emit(
      'blight_field',
      [
        { x: victim.x, y: victim.y },
        { x: victim.x + spread.radius, y: victim.y },
      ],
      spread.skill.damageTypes[0] ?? 'poison',
      jumped ? 0.5 : 0.3
    );
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
    s.loot.currency.gold =
      (s.loot.currency.gold ?? 0) + this.goldPerKill * victim.bounty;
    this.rollCurrency();
    this.rollGearDrop();
    this.events.push({ kind: 'kill', total: s.killed, xp: this.xpPerKill });

    if (this.meetAt !== null && s.killed >= this.meetAt) {
      this.meetAt = null;
      s.met = true;
      this.events.push({ kind: 'met', who: LAMPWRIGHT.name, said: LAMPWRIGHT.met });
    }
  }

  /**
   * A piece's quality and item level come off the power band, so a weak set
   * cannot hand you a Brilliant one however lucky you get. Rarity raises the
   * CHANCE, never the ceiling, or a rarity-stacked bare run out-drops an
   * honest set.
   */
  private rollGearDrop(): void {
    const drops = this.set.band;
    const hero = this.state.hero.stats;
    const chance = drops.gearChance * (1 + (this.set.rewards.rarity + hero.rarity) / 200);
    if (!this.rng.chance(chance)) return;

    const base = pickGearBase(drops.ilvl, this.rng);
    if (!base) return;

    const quality = pickQuality(drops.quality, this.rng);
    const mods = this.rng.int(drops.fill[0], drops.fill[1]);
    this.state.loot.items.push(
      rollGear(base.id, drops.ilvl, quality, mods, DROP_POOL, this.rng)
    );
  }

  private rollCurrency(): void {
    // Gear stacks with the crystal: currency find changes HOW OFTEN, rarity
    // changes HOW GOOD. Two separate questions, so two separate stats.
    const hero = this.state.hero.stats;
    const chance = CURRENCY_DROP.chancePerKill * (1 + hero.currencyFind / 100);
    if (!this.rng.chance(chance)) return;

    // The tier caps the class. Rarity decides how often you reach the ceiling;
    // the crystal decides where the ceiling is. Without the cap, a T1 map with
    // enough rarity would drop the currency that re-rolls a Brilliant item —
    // which is the whole ladder skipped in one lucky kill.
    const ceiling = CURRENCY_CLASSES.indexOf(this.set.band.currency);
    const rarity = this.set.rewards.rarity + hero.rarity;
    const climb = CURRENCY_DROP.upgradeChance * (1 + rarity / 100);
    let rank = 0;
    while (rank < ceiling && this.rng.chance(climb)) rank++;

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
