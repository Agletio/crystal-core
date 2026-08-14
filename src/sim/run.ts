/**
 * The run: deterministic, headless, fixed-timestep. Same crystal, gear and seed
 * gives the same run tick for tick, so a balance complaint is a seed rather than
 * a description. The caller owns real time and calls step(TICK) a whole number
 * of times, so frame rate never changes an outcome.
 */
import { Rng } from '../rng';
import { WALL, generateMap, sceneMap, dist, hasLineOfSight, roomCenter } from './grid';
import type { GameMap, Grid, Room, Vec2 } from './grid';
import { findPath, nearestByPath } from './pathfind';
import { AILMENT, POTIONS, POTION_BY_ID } from '../data';
import { lookOf } from './appearance';
import {
  armourReduction,
  characterStats,
  dropBias,
  effectiveSkill,
  mapDensity,
  monsterStats,
  treeGrants,
} from './stats';
import type { CombatStats } from './stats';
import { SKILL_BEHAVIOURS } from './skills';
import { bleedOf, critBuff, landingOf, overchargeOf, shieldShare, starvedMultiplier } from './grants';
import { equippedSkill, mainSkillId, monsterXp } from './character';
import type { Character } from './character';
import { dominantFamily, familyPlan, runSet } from './crystal';
import type { RunSet } from './crystal';
import {
  AURA,
  AURA_BY_ID,
  BOSS_BY_ID,
  BOSS_KEYS,
  MONSTER_BY_ID,
  CURRENCIES,
  CURRENCY_DROP,
  DEFENCE,
  ENCOUNTERS,
  ALL_MODS,
  HERO_BASE,
  LOOT,
  MONSTER_BASE,
  MONSTERS,
  MONSTERS_BY_FAMILY,
  MONSTER_RANKS,
  MONSTER_ABILITIES,
  MONSTER_ABILITY_BY_ID,
  SKILLS,
  SKILL_BY_ID,
  opensHere,
  GEAR_BASE_BY_ID,
  RELICS,
  UNIQUES,
  UNIQUE_DROP,
  socketPackSize,
  socketPacks,
  socketSize,
} from '../data';
import type { BossDef, EncounterDef } from '../data';
import { LURKS, SCENE_BY_ID, scaleFor } from '../scenes';
import type { SceneAct, SceneDummy } from '../scenes';
import { ModPool, computeStat } from '../mods';
import { makeRelic, makeUnique, pickGearBase, rollGear } from '../economy';
import type { Boost, Item, Look, SkillDef } from '../types';
import type { MonsterRank } from '../render/bestiary';

/** Built once at load: derived from authored data and never mutated. */
const DROP_POOL = new ModPool(ALL_MODS);

/** Sim step. 30/s is plenty for movement this slow and keeps replays cheap. */
export const TICK = 1 / 30;

/** Monsters beyond this range of the hero don't think at all. */
const ACTIVE_RANGE = 16;

/** How far a body with something to THROW stands off, and notices you from:
 *  the skill's own reach, in the four places that used to say it by hand. */
const thrownReach = (skill?: SkillDef): Partial<CombatStats> =>
  skill ? { attackRange: skill.range, aggroRange: skill.range + 2 } : {};

/** Relaxation iterations for body separation. See separate(). */
const SEPARATION_PASSES = 2;

/** How far waking one wakes its neighbours. ONE hop, or a dense map cascades. */
const AGGRO_CHAIN_RADIUS = 4.5;

/** How near the way out the last encounter comes up the hole behind you. */
const SHOW_FIGHT = 4; // seconds a sandbox hero swings at what came into reach
const SHOW_WALK = 6; // and then walks on regardless of what is still there

const FINALE_RANGE = 5;

/** Close enough to be standing on the way out, and the descent is over. */
const AT_EXIT = 0.5;

/** How far a pacing body walks from where it was standing, and back. */
const PACE_STEP = 2;
/** How close you get before the one who lurks comes out at you. */
const LURK_RANGE = 4;

/** The passive's buff, as a `TimedEffect` id. Not a potion; nothing fills. */
const CRIT_BUFF = 'crit_surge';

/** A Slow, on a MONSTER — the first `TimedEffect` on anything but the hero. */
const SLOWED = 'slowed';

/** Ordered worst-to-best, so rarity climbs the list. */
const CURRENCY_CLASSES = ['basic', 'uncommon', 'rare', 'exotic'] as const;

export type EntityKind = 'hero' | 'monster';

/** A damage-over-time stack. Resisted, but NOT armoured, which is what makes
 *  an ailment the answer to a target you cannot punch through. Separate
 *  entries rather than one number, so each expires on its own clock. */
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

/** A cap on WORK, not on state: re-poisoning refreshes rather than duplicates,
 *  but a dense room could still scan every enemy from every enemy. */
const MAX_CONTAGION_GENERATIONS = 3;

/** Named so a renderer picks an animation rather than guessing from deltas. */
export type EntityAction = 'idle' | 'move' | 'attack' | 'hurt';

/** How long a corpse stays on screen so a death animation can play out. */
export const DEATH_FADE = 0.6;

/** How long an entity holds the swing. Exported because the renderer
 *  divides by it: a frame has to come off how far through its OWN attack a
 *  thing is, or a fast swing and a slow one look the same. */
export const ATTACK_POSE = 0.22;
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
  mana: number; // monsters never spend it and never regain it
  /** What is true of this entity for a while yet. Only the hero has any. */
  effects: TimedEffect[];
  stats: CombatStats;
  cooldown: number;
  path: Vec2[];
  pathTimer: number;
  /** Committed target, held across ticks so the hero doesn't thrash. */
  targetId: number | null;
  /** Multiplier on the xp and gold this one is worth. 1 for rank and file. */
  bounty: number;
  aggroed: boolean;
  /** An aura this entity emits, by id. Presentation draws its reach. */
  aura?: string;
  /** What nearby auras are doing to it, re-read a few times a second. */
  boost?: Boost;
  /** Seconds of "just got hit" left, for the renderer to flash. */
  hitFlash: number;
  /** Share off this one's swing rate while a Slow is running. Absent is none. */
  slowed?: number;
  /** Tiles this body has actually walked, for the walk cycle to read. */
  walked: number;
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

export interface RunOptions {
  /** Thins the packs without touching the map. Harness use only. */
  densityScale?: number;
  /** Share of a pool below which a potion fires itself, by potion id. A
   *  missing one takes the table's default, which is what every harness runs. */
  potionThresholds?: Record<string, number>;
  /** Bosses already put down, so the keys that lead back to them may drop. The
   *  sim rolls them — it owns the rng and the replay — and the caller owns
   *  which doors have been found. */
  beaten?: string[];
  /**
   * A `SceneDef` id: an authored room instead of a generated descent, with the
   * people in it and no packs at all. The sim is TOLD to build one — nothing
   * in `src/sim` ever decides that a scene happens.
   */
  scene?: string;
}

/** A thing that is true for a while. `id` names a `PotionDef` for now. */
export interface TimedEffect {
  id: string;
  remaining: number;
}

export type RunEvent =
  | { kind: 'finale'; name: string; herald: string }
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
  /** Who is standing in this room. Deliberately NOT in `monsters`: nothing in
   *  combat may ever see a person. A LIST — a room can hold more than one. */
  folk: Entity[];
  /** True from the moment the hero reaches them until the panel is dismissed. */
  meeting: boolean;
  /** What has to be put down before a room is yours, once it has been called
   *  up. Null everywhere else — a descent has a finale, never a boss. */
  boss: Entity | null;
  /** Damage taken, by type. The results overlay renders whatever it is handed. */
  damageTaken: Record<string, number>;
  /** Swings that could not pay, and swings in all: the calibration is a share. */
  dryCasts: number;
  /** Times the movement skill fired. Zero without one equipped. */
  blinks: number; // any movement skill's uses, whichever fills the slot
  casts: number;
  /** Potion charges left this descent, by id. A descent always begins full. */
  charges: Record<string, number>;
  /** Charges spent, so a harness can say whether the floor was actually used. */
  drunk: number;
  /** Charges a trade handed back mid-descent. Zero without one. */
  regained: number;
  /** Uses that spent a share of the pool for damage. Zero without the node. */
  overcharges: number;
  /** Damage the mana pool paid for instead of your life. */
  absorbed: number;
}

const FLOATER_LIFE = 1.1;

export class RunSim {
  readonly state: RunState;
  private readonly rng: Rng;
  /** Placement retries only. Fixed, so the same map places the same way. */
  private readonly retry = new Rng(7919);
  private readonly queued: string[] = []; // presses waiting for the next tick
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
  /** True for the length of a cast the hero could not pay for. */
  private starved = false;
  /** True for the length of a cast that bought extra damage with the pool. */
  private overcharged = false;
  /** Fractions of a flask charge banked back, by potion id. */
  private readonly recharging: Record<string, number> = {};
  /** Seconds until the movement skill can fire again. */
  private moveIn = 0;
  /** The movement skill in the slot, resolved once. Null without one. */
  private readonly mover: SkillDef | null;
  /** How many times the hero has cast, for nodes that count casts. */
  private casts = 0;
  /** Set once the closing encounter has been triggered. */
  private finale: EncounterDef | null = null;
  /** Bodies of it still to climb out, oldest first. */
  private pending: Entity[] = [];
  /** Countdown to the next of them. */
  private waveTimer = 0;
  /** Countdown to the next aura pass. */
  private auraTimer = 0;
  /** One aura's worth of flat damage on this map, in real damage. */
  private auraDamage = 0;
  /** The line being acted out, and whether its one act has finished. */
  private acting: { beat: number; done: boolean; to?: Vec2 } | null = null;
  /** The boss's own clock, beside `waveTimer` and stopped by the same death. */
  private reinforce: BossDef['reinforce'] | null = null;
  private reinforceTimer = 0;
  private byId = new Map<number, Entity>();
  /**
   * The socketed set: how long the run is, how dangerous, and what it pays.
   * Read once at spawn — nothing about a set changes mid-descent.
   */
  readonly set: RunSet;
  /** A room with bodies in it to be looked at. Nothing loses life while this is
   *  set, so nothing dies and the run has no end to reach. */
  private readonly sandbox: boolean;
  private readonly patrol: Vec2[];
  private patrolAt = 0;

  constructor(
    crystals: Item[],
    character: Character,
    rng: Rng,
    options: RunOptions = {}
  ) {
    this.rng = rng;
    this.options = options;
    this.grants = treeGrants(character);
    this.mover = SKILL_BY_ID[equippedSkill(character, 'movement') ?? ''] ?? null;
    // The tree can change what the skill IS — its damage type, its tags — and
    // the sim has to fight with the same skill the stat sheet described, or a
    // converted Fireball scales off cold and is resisted as fire.
    this.skill = effectiveSkill(SKILL_BY_ID[mainSkillId(character)] ?? SKILLS[0], this.grants);
    this.set = runSet(crystals);

    const def = options.scene ? SCENE_BY_ID[options.scene] : undefined;
    // Sockets are the only thing that lengthens a descent. An empty Fissure is
    // index zero of the same table, not a special case beside it.
    this.sandbox = !!def?.dummies?.length;
    this.patrol = this.sandbox ? (def?.plan.patrol ?? []) : [];
    const map = def
      ? sceneMap(def.plan, def.theme, Math.max(1, Math.round(this.set.power)), def.ground)
      : generateMap(
          this.set.mods,
          rng,
          socketSize(this.set.filled),
          Math.max(1, Math.round(this.set.power)),
          this.set.theme
        );
    const stats = characterStats(character);

    // A room may draw the hero as a BODY rather than as the doll: a sandbox
    // uses none of the game's own art, and the doll is most of it.
    const hero: Entity = {
      id: 0,
      kind: 'hero',
      sprite: def?.hero?.sprite ?? 'hero',
      ...(def?.hero ? {} : { look: lookOf(character) }),
      scale: def?.hero?.scale ?? 1.15,
      rank: 'common',
      x: map.entrance.x,
      y: map.entrance.y,
      facing: 0,
      action: 'idle',
      radius: HERO_BASE.radius,
      skillId: mainSkillId(character),
      actionTimer: 0,
      deathAge: 0,
      ailments: [],
      bounty: 1,
      life: stats.maxLife,
      mana: stats.maxMana,
      effects: [],
      // `HERO_BASE.moveSpeed` is a descent's sprint; a room to be watched is not.
      stats: def?.hero?.speed
        ? { ...stats, moveSpeed: stats.moveSpeed * def.hero.speed }
        : stats,
      cooldown: 0,
      path: [],
      pathTimer: 0,
      targetId: null,
      walked: 0,
      aggroed: false,
      hitFlash: 0,
      dead: false,
    };

    // A scene has no packs at all, which is what makes it one: whatever it
    // holds is called up by name, and a sandbox names its bodies in the def.
    const monsters = def ? (def.dummies ?? []).map((d) => this.dummy(d, hero)) : this.spawn(map);
    if (def) this.priceKills();
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
      dryCasts: 0,
      blinks: 0,
      casts: 0,
      charges: Object.fromEntries(POTIONS.map((p) => [p.id, p.charges])),
      drunk: 0,
      regained: 0,
      overcharges: 0,
      absorbed: 0,
      folk: [],
      meeting: false,
      boss: null,
      damageTaken: {},
    };

    if (def) this.state.folk.push(this.stand(def.who, def.plan.stands));
  }

  /** A body for the sandbox: a monster in every way the sim reads, off
   *  `MONSTER_BASE` and the empty set. Nothing loses life while one is up. */
  private dummy(spec: SceneDummy, hero: Entity): Entity {
    const ability = MONSTER_ABILITY_BY_ID[spec.ability ?? ''];
    const stats = monsterStats([], {
      id: spec.sprite,
      name: spec.sprite,
      family: 'normal',
      life: 1,
      damage: 1,
      moveSpeed: 1,
      attacksPerSecond: 0.8,
      attackRange: 1,
      radius: 0.3,
      sprite: spec.sprite,
      scale: spec.scale,
      weight: 0,
    }, ability);
    const thrown = SKILL_BY_ID[ability?.skill ?? ''];
    // A ROOTED body holds its post, or everything that chases ends up in one
    // clump. Speed 0, so nothing else has to know.
    const reach = { ...stats, ...thrownReach(thrown), ...(spec.rooted ? { moveSpeed: 0 } : {}) };
    return {
      id: this.nextId++,
      kind: 'monster',
      sprite: spec.sprite,
      scale: spec.scale,
      rank: 'common',
      radius: 0.3,
      // A body with a skill goes through the path a ranged pack does.
      skillId: ability?.skill ?? null,
      x: spec.at.x,
      y: spec.at.y,
      facing: Math.atan2(hero.y - spec.at.y, hero.x - spec.at.x),
      action: 'idle',
      actionTimer: 0,
      deathAge: 0,
      ailments: [],
      bounty: 0,
      life: reach.maxLife,
      mana: 0,
      effects: [],
      stats: reach,
      cooldown: 0,
      path: [],
      pathTimer: 0,
      targetId: null,
      walked: 0,
      aggroed: true, // they are the point of the room
      hitFlash: 0,
      dead: false,
    };
  }

  /** A person in a room: no stats worth anything, no bounty, and out of
   *  `monsters`, so nothing in combat can ever be pointed at them. */
  private stand(sprite: string, at: Vec2): Entity {
    const hero = this.state.hero;
    return {
      id: this.nextId++,
      kind: 'monster',
      sprite,
      scale: scaleFor(sprite),
      rank: 'common',
      radius: 0.3,
      skillId: null,
      x: at.x,
      y: at.y,
      facing: Math.atan2(hero.y - at.y, hero.x - at.x),
      action: 'idle',
      actionTimer: 0,
      deathAge: 0,
      ailments: [],
      bounty: 0,
      life: 1,
      mana: 0,
      effects: [],
      stats: hero.stats,
      cooldown: 0,
      path: [],
      pathTimer: 0,
      targetId: null,
      walked: 0,
      aggroed: false,
      hitFlash: 0,
      dead: false,
    };
  }

  /**
   * Somewhere in the room a body of this size actually FITS: no world carves
   * the whole rectangle, and a monster dropped in the rock stands in it. The
   * first draw is the run's own and every retry comes off a stream of its own,
   * so where a body ends up never moves the draws that pick the next one.
   */
  private placeIn(grid: Grid, room: Room, radius: number): Vec2 {
    let x = this.rng.float(room.x, room.x + room.w - 1);
    let y = this.rng.float(room.y, room.y + room.h - 1);
    for (let tries = 0; tries < 20 && !grid.fits(x, y, radius); tries++) {
      x = this.retry.float(room.x, room.x + room.w - 1);
      y = this.retry.float(room.y, room.y + room.h - 1);
    }
    return grid.fits(x, y, radius) ? { x, y } : roomCenter(room);
  }

  /** What one body on this map is worth, and what one aura adds. Read by a
   *  descent and by a boss room alike: a room that pays nothing is a room you
   *  would rather not be in. */
  private priceKills(): void {
    // A flat aura is stated as a multiple of what a monster on THIS map hits
    // for, so it stays worth something once the crystals scale the room.
    this.auraDamage = computeStat(MONSTER_BASE.damage, this.set.mods, 'monsterDamage');
    // Run power pays here: it is the one number a reward reads.
    this.xpPerKill = monsterXp(this.set.power);
    // Power is the whole of it, times what the worlds in the set pay.
    this.goldPerKill =
      LOOT.goldPerKill *
      Math.pow(LOOT.powerScale, this.set.power) *
      this.set.yield *
      this.set.pays.gold;
  }

  /** Packs land in rooms other than the entrance: a moment to look first. */
  private spawn(map: GameMap): Entity[] {
    const filled = this.set.filled;
    const density = mapDensity(this.set.mods);
    const thin = this.options.densityScale ?? 1;
    // Sockets add PACKS, never bigger ones: a longer run rather than a harder
    // room. Scaling both would square it.
    const packCount = Math.max(1, Math.round(density.packCount * thin * socketPacks(filled)));
    const packSize = Math.max(1, Math.round(density.packSize * socketPackSize(filled)));
    this.priceKills();

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

    for (let p = 0; p < packCount; p++) {
      const room = this.rng.pick(rooms) ?? rooms[0];

      // One kind per pack. Mixed packs read as noise; a uniform pack reads as
      // a thing you can recognise and react to.
      const pool = MONSTERS_BY_FAMILY[plan[p] ?? 'normal'];
      const def = this.rng.weighted(pool, (m) => m.weight) ?? pool[0];
      // Per PACK: a pack throwing two elements reads as noise.
      const ability =
        this.rng.weighted(MONSTER_ABILITIES, (a) => a.weight) ?? MONSTER_ABILITIES[0];
      const thrown = ability.skill ? SKILL_BY_ID[ability.skill] : undefined;
      // One carrier per pack, whatever the kind. Five Chanters would stack
      // five chants on their own neighbours, and read on screen as fog rather
      // than as a thing in the middle of the room worth killing first.
      const carrier = def.aura ? this.rng.int(0, packSize - 1) : -1;

      // Stats differ between the melee and ranged variants of a kind, so they
      // key separately — a ranged pack reaches much further and has to notice
      // the hero from beyond its own reach to ever open fire.
      for (let i = 0; i < packSize; i++) {
        // Per monster, not per pack: a pack with one blue thing in it is a
        // pack you look at. Stats key on the rank too, or every rare in the
        // run would share the common one's life.
        const rank = this.rng.weighted(MONSTER_RANKS, (r) => r.weight) ?? MONSTER_RANKS[0];
        const statsKey = `${def.id}:${ability.id}:${rank.id}`;
        let stats = statsFor.get(statsKey);
        if (!stats) {
          const base = monsterStats(this.set.mods, def, ability);
          stats = {
            ...base,
            maxLife: base.maxLife * rank.life,
            damage: base.damage * rank.damage,
            // Every type scaled together and never re-derived: a rank that
            // scales one and not the other is a rare that hits like a common.
            damageByType: Object.fromEntries(
              Object.entries(base.damageByType).map(([t, v]) => [t, v * rank.damage])
            ),
          };
          stats = { ...stats, ...thrownReach(thrown) };
          statsFor.set(statsKey, stats);
        }

        const radius = def.radius * rank.scale;
        const at = this.placeIn(map.grid, room, radius);
        monsters.push({
          id: this.nextId++,
          kind: 'monster',
          sprite: def.sprite,
          scale: def.scale * rank.scale,
          rank: rank.id,
          radius,
          skillId: thrown ? ability.skill : null,
          ...(def.aura && i === carrier ? { aura: def.aura } : {}),
          x: at.x,
          y: at.y,
          facing: this.rng.float(0, Math.PI * 2),
          action: 'idle',
          actionTimer: 0,
          deathAge: 0,
          ailments: [],
          bounty: rank.bounty,
          life: stats.maxLife,
          mana: 0,
          effects: [],
          stats,
          cooldown: this.rng.float(0, 1),
          path: [],
          pathTimer: 0,
          targetId: null,
          walked: 0,
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

    // On a TICK, before anything else: a press lands on the next one like
    // every other decision, or a seed stops replaying the same run.
    this.stepPotions(dt);

    for (const f of s.floaters) f.age += dt;
    if (s.floaters.length > 0 && s.floaters[0].age >= FLOATER_LIFE) {
      s.floaters = s.floaters.filter((f) => f.age < FLOATER_LIFE);
    }

    for (const v of s.vfx) v.age += dt;
    if (s.vfx.length > 0) s.vfx = s.vfx.filter((v) => v.age < v.ttl);

    // Before anyone swings: what the room is doing to itself. A carrier that
    // died last tick stops helping this one.
    this.auraTimer -= dt;
    if (this.auraTimer <= 0) {
      this.auraTimer = AURA.tick;
      this.readAuras();
    }

    // Whatever is still climbing out, on its own clock rather than on the
    // room emptying: reinforcements arrive whether or not you are winning.
    if (this.pending.length > 0) {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) this.climbOut();
    }

    // A boss room's own clock. STOPS with the boss, which is the whole of why
    // a room with something endless in it still terminates.
    if (s.boss && !s.boss.dead) {
      this.reinforceTimer -= dt;
      if (this.reinforceTimer <= 0) this.sendReinforcements();
    }

    // Ailments tick before anyone acts, so a poisoned monster can die on its
    // own without first getting a free swing.
    this.stepAilments(s.hero, dt);
    for (const m of s.monsters) if (!m.dead) this.stepAilments(m, dt);
    // And whatever is true of one for a while: a monster's are only ever a
    // Slow, and were ticked nowhere at all until one could carry one.
    for (const m of s.monsters) if (!m.dead && m.effects.length > 0) this.stepEffects(m, dt);

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
    if (this.moveIn > 0) this.moveIn -= dt;
    if (hero.hitFlash > 0) hero.hitFlash -= dt;
    if (hero.actionTimer > 0) hero.actionTimer -= dt;

    if (hero.life < hero.stats.maxLife) {
      hero.life = Math.min(hero.stats.maxLife, hero.life + hero.stats.lifeRegen * dt);
    }
    if (hero.mana < hero.stats.maxMana) {
      hero.mana = Math.min(hero.stats.maxMana, hero.mana + hero.stats.manaRegen * dt);
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
        if (hero.cooldown <= 0) this.swing(hero, target);
      } else if (!this.advance(hero, target, dt)) {
        // Route vanished mid-chase. Drop it; the next flood picks correctly.
        hero.targetId = null;
        hero.path = [];
      }
      return;
    }

    // A sandbox has nowhere to walk out to: round the circuit forever instead,
    // meeting the same bodies from a different side on every lap.
    if (this.patrol.length > 0) {
      const mark = this.patrol[this.patrolAt % this.patrol.length];
      if (dist(hero, mark) <= AT_EXIT || !this.advance(hero, mark, dt)) this.patrolAt++;
      return;
    }

    // A boss room is cleared by putting the boss DOWN, never by walking out:
    // it has no way out, and the adds are what fills the gap while it lives.
    if (s.boss) {
      if (!s.boss.dead) {
        this.face(hero, s.boss.x, s.boss.y);
        this.settleAction(hero, false);
        return;
      }
      s.status = 'cleared';
      this.events.push({ kind: 'cleared', seconds: s.elapsed, killed: s.killed });
      return;
    }

    // Nothing reachable is left, and the way out is a place you walk to.
    const exit = s.map.exit;
    const out = dist(hero, exit);

    // Near enough for something to notice you leaving: the last fight comes up
    // the hole you were walking towards, rather than filling a room behind you.
    if (!this.finale && out <= FINALE_RANGE) {
      this.spawnFinale();
      return;
    }

    // The rest of it is still climbing out; hold rather than walk into it.
    if (this.pending.length > 0) {
      this.face(hero, exit.x, exit.y);
      this.settleAction(hero, false);
      return;
    }

    hero.targetId = null;
    // A route that does not exist is the same answer as being there already.
    if (out > AT_EXIT && this.advance(hero, exit, dt)) return;

    s.status = 'cleared';
    this.dropKeys();
    this.events.push({ kind: 'cleared', seconds: s.elapsed, killed: s.killed });
  }

  /**
   * A way back to a room you have already put down. Per cleared DESCENT rather
   * than per kill, and never out of a scene — a key that drops in the room it
   * opens is a loop rather than a reason to run the Fissure.
   */
  private dropKeys(): void {
    if (this.options.scene) return;
    const beaten = this.options.beaten ?? [];
    for (const key of BOSS_KEYS) {
      if (!beaten.includes(key.boss)) continue;
      const odds = key.chance * Math.pow(key.perPower, Math.max(0, this.set.power));
      if (!this.rng.chance(Math.min(1, odds))) continue;
      this.state.loot.currency[key.id] = (this.state.loot.currency[key.id] ?? 0) + 1;
    }
  }

  /** Arriving in a room. THEY cross it, not you — a person who stands still
   *  while you walk over is furniture. The one who lurks is the exception, and
   *  he does not move until you are close enough to be worth coming out for.
   *  Not `step`: nothing in a scene has a clock. */
  walkOut(dt: number): void {
    const s = this.state;
    const met = s.folk[0];
    if (!met || s.meeting) return;

    const apart = dist(s.hero, met);
    const lurking = LURKS.has(met.sprite) && apart > LURK_RANGE;
    // A walk that cannot finish still hands the thing over, whoever is walking.
    if (apart > 1.1) {
      if (lurking) {
        // Still behind whatever he is behind. You close the distance instead.
        if (this.advance(s.hero, met, dt)) return;
      } else if (this.advance(met, s.hero, dt)) {
        this.face(s.hero, met.x, met.y);
        return;
      }
    }
    met.path = [];
    s.hero.path = [];
    this.face(met, s.hero.x, s.hero.y);
    this.face(s.hero, met.x, met.y);
    this.settleAction(met, false);
    this.settleAction(s.hero, false);
    s.meeting = true;
  }

  /**
   * What the person in the room is doing while a line is on screen. Ticked by
   * the frame loop like the walk — a scene has no clock of its own — and it
   * only ever sets `action` and `actionTimer`, which is the whole of the
   * interface `poseOf` reads.
   */
  perform(beat: number, act: SceneAct | undefined, dt: number): void {
    const who = this.state.folk[0];
    if (!who) return;

    // ONE act per line, armed when the line changes. Left running, `pace`
    // turned round the moment it arrived and walked back, and `work` swung
    // again every time its timer ran out — which is the twitching.
    if (this.acting?.beat !== beat) {
      this.acting = { beat, done: act === undefined };
      if (act === 'pace') {
        // Alternating by LINE rather than on arrival, so nobody paces a hole
        // in the floor while one bubble is up.
        const side = beat % 2 === 0 ? 1 : -1;
        this.acting.to = { x: who.x + side * PACE_STEP, y: who.y };
      }
      if (act === 'work') {
        who.action = 'attack';
        who.actionTimer = ATTACK_POSE;
      }
    }
    const doing = this.acting!;

    if (!doing.done) {
      if (act === 'pace' && doing.to) {
        if (dist(who, doing.to) > 0.4 && this.advance(who, doing.to, dt)) return;
        doing.done = true;
      } else if (act === 'work') {
        who.actionTimer -= dt;
        if (who.actionTimer > 0) return;
        doing.done = true;
      } else {
        doing.done = true;
      }
    }

    // Done, and still until the next line: `face` is what every act ends on.
    who.path = [];
    this.face(who, this.state.hero.x, this.state.hero.y);
    this.settleAction(who, false);
  }

  /**
   * The room goes live. Called by the UI once the lines before the fight have
   * been said — `src/sim` never decides that a scene happens and never decides
   * when one starts either. Everything about the thing is a multiplier on the
   * same baseline every other body in the game is built from.
   */
  beginEncounter(): boolean {
    const s = this.state;
    const def = BOSS_BY_ID[SCENE_BY_ID[this.options.scene ?? '']?.encounter ?? ''];
    if (!def || s.boss) return false;

    const ability = this.rng.weighted(MONSTER_ABILITIES, (a) => a.weight) ?? MONSTER_ABILITIES[0];
    const thrown = ability.skill ? SKILL_BY_ID[ability.skill] : undefined;
    const base = monsterStats(this.set.mods, MONSTERS[0], ability);
    const stats: CombatStats = {
      ...base,
      maxLife: base.maxLife * def.life,
      damage: base.damage * def.damage,
      damageByType: Object.fromEntries(
        Object.entries(base.damageByType).map(([t, v]) => [t, v * def.damage])
      ),
      ...thrownReach(thrown),
    };

    // At the far end of the room from the hero, so it has to cross the floor.
    const room = s.map.rooms[0];
    const at = this.placeIn(s.map.grid, room, 0.34 * def.size);
    const boss: Entity = {
      id: this.nextId++,
      kind: 'monster',
      sprite: def.sprite,
      scale: def.size,
      rank: 'rare',
      radius: 0.34 * def.size,
      skillId: thrown ? ability.skill : null,
      x: at.x,
      y: at.y,
      facing: Math.atan2(s.hero.y - at.y, s.hero.x - at.x),
      action: 'idle',
      actionTimer: 0,
      deathAge: 0,
      ailments: [],
      bounty: def.bounty,
      life: stats.maxLife,
      mana: 0,
      effects: [],
      stats,
      cooldown: 0,
      path: [],
      pathTimer: 0,
      targetId: null,
      walked: 0,
      aggroed: true,
      hitFlash: 0,
      dead: false,
    };
    s.boss = boss;
    s.monsters.push(boss);
    this.byId.set(boss.id, boss);
    // The boss only. What keeps arriving is not counted, because a readout
    // that climbs while you are winning reads as a bug.
    s.totalMonsters = 1;
    this.reinforce = def.reinforce;
    this.reinforceTimer = def.reinforce.every;
    this.events.push({ kind: 'finale', name: def.name, herald: def.herald });
    return true;
  }

  /** One more of the smaller things, out of the hole you came up. Stops dead
   *  when the boss does: the adds are pressure, never the objective. */
  private sendReinforcements(): void {
    const s = this.state;
    const from = MONSTER_BY_ID[this.reinforce?.from ?? ''];
    if (!from || !this.reinforce || !s.boss || s.boss.dead) return;

    const ability = this.rng.weighted(MONSTER_ABILITIES, (a) => a.weight) ?? MONSTER_ABILITIES[0];
    const thrown = ability.skill ? SKILL_BY_ID[ability.skill] : undefined;
    const stats = monsterStats(this.set.mods, from, ability);
    const mouth = s.map.entrance;

    for (let i = 0; i < Math.max(1, this.reinforce.size); i++) {
      const angle = (i / Math.max(1, this.reinforce.size)) * Math.PI * 2;
      const body: Entity = {
        id: this.nextId++,
        kind: 'monster',
        sprite: from.sprite,
        scale: from.scale,
        rank: 'common',
        radius: 0.3,
        skillId: thrown ? ability.skill : null,
        x: mouth.x + Math.cos(angle) * 0.15,
        y: mouth.y + Math.sin(angle) * 0.15,
        facing: Math.atan2(s.hero.y - mouth.y, s.hero.x - mouth.x),
        action: 'idle',
        actionTimer: 0,
        deathAge: 0,
        ailments: [],
        bounty: 1,
        life: stats.maxLife,
        mana: 0,
        effects: [],
        stats,
        cooldown: 0,
        path: [],
        pathTimer: 0,
        targetId: null,
        walked: 0,
        aggroed: true,
        hitFlash: 0,
        dead: false,
      };
      s.monsters.push(body);
      this.byId.set(body.id, body);
    }
    this.reinforceTimer = this.reinforce.every;
  }

  /** The meeting is over and the crystal is in hand — granted by whoever calls
   *  this, BEFORE calling it. The report never pays a meeting out. */
  takeGift(): void {
    const s = this.state;
    if (!s.meeting) return;
    s.meeting = false;
    s.folk = [];
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

    // One ability for the whole encounter: what comes up the hole is one thing.
    const ability =
      this.rng.weighted(MONSTER_ABILITIES, (a) => a.weight) ?? MONSTER_ABILITIES[0];
    const thrown = ability.skill ? SKILL_BY_ID[ability.skill] : undefined;
    const base = monsterStats(this.set.mods, MONSTERS[0], ability);
    const stats: CombatStats = {
      ...base,
      maxLife: base.maxLife * def.life,
      damage: base.damage * def.damage,
      damageByType: Object.fromEntries(
        Object.entries(base.damageByType).map(([t, v]) => [t, v * def.damage])
      ),
      ...thrownReach(thrown),
    };

    const exit = s.map.exit;
    for (let i = 0; i < def.count; i++) {
      // Out of the hole, and separation unstacks them as they land.
      const angle = (i / Math.max(1, def.count)) * Math.PI * 2;

      this.pending.push({
        id: this.nextId++,
        kind: 'monster',
        sprite: def.count === 1 ? biggest.sprite : commonest.sprite,
        // The finale is its own rank: gold-haloed, because a thing worth
        // fourteen kills should not look like the one worth a tenth of that.
        scale: (def.count === 1 ? biggest.scale : commonest.scale) * def.size,
        rank: 'rare',
        radius: 0.34 * def.size,
        skillId: thrown ? ability.skill : null,
        x: exit.x + Math.cos(angle) * 0.15,
        y: exit.y + Math.sin(angle) * 0.15,
        facing: Math.atan2(s.hero.y - exit.y, s.hero.x - exit.x),
        action: 'idle',
        actionTimer: 0,
        deathAge: 0,
        ailments: [],
        bounty: def.bounty,
        life: stats.maxLife,
        mana: 0,
        effects: [],
        stats,
        cooldown: 0,
        path: [],
        pathTimer: 0,
        targetId: null,
        walked: 0,
        // Awake from the moment they exist; they're the point of the room.
        aggroed: true,
        hitFlash: 0,
        dead: false,
      });
    }

    // Counted whole the moment it starts: a readout that ticks down and then
    // climbs again reads as a bug.
    s.totalMonsters += def.count;
    s.finale = def.name;
    this.events.push({ kind: 'finale', name: def.name, herald: def.herald });
    this.climbOut();
  }

  /** One wave up the hole, and the clock for the next. */
  private climbOut(): void {
    const def = this.finale;
    if (!def) return;
    for (let i = 0; i < Math.max(1, def.wave.size) && this.pending.length > 0; i++) {
      const entity = this.pending.shift()!;
      this.state.monsters.push(entity);
      this.byId.set(entity.id, entity);
    }
    this.waveTimer = def.wave.every;
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
          // What `useSkill` sets, or a melee body swings from a standing pose.
          m.action = 'attack';
          m.actionTimer = ATTACK_POSE;
          this.dealDamage(m, hero, 1);
          m.cooldown = this.swingCooldown(m);
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
    // Held until it dies is, where nothing dies, one facing forever — and it
    // lets go on a CLOCK, or bodies in reach pin it and the circuit never runs.
    if (this.sandbox) {
      hero.targetId = null;
      if (this.state.elapsed % (SHOW_FIGHT + SHOW_WALK) >= SHOW_FIGHT) return null;
    }
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
    if (this.sandbox) return null;

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
    if (e.kind === 'hero') this.maybeMove(e);

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
    // Ground covered, which is what a walk cycle is measured in.
    e.walked += Math.hypot(e.x - startX, e.y - startY);
    if (moved) this.face(e, e.x + (e.x - startX), e.y + (e.y - startY));
    this.settleAction(e, moved);
    return true;
  }

  /** The movement skill, firing ITSELF, along the path already found: the
   *  furthest walkable waypoint in reach, so it never lands a body in rock. A
   *  STEP also wants a clear line and goes through; a JUMP wants none and goes
   *  over. Neither reaches anywhere the walk could not. */
  private maybeMove(hero: Entity): void {
    const skill = this.mover;
    if (!skill || this.moveIn > 0 || hero.path.length === 0) return;
    // Never in an authored room, and the guard is for the SLOT rather than for
    // one skill: skipping the last of a walk across a room reads as a bug.
    if (this.options.scene) return;

    const further = (this.grants.moveDistance as number) ?? 1;
    const reach = ((skill.params?.distance as number) ?? 0) * further;
    const jumps = skill.behaviour === 'leap';
    const grid = this.state.map.grid;
    let landing: Vec2 | null = null;
    let steps = 0;
    for (const wp of hero.path) {
      if (dist(hero, wp) > reach) break;
      steps++;
      if (grid.walkable(wp.x, wp.y) && (jumps || hasLineOfSight(grid, hero, wp))) landing = wp;
    }
    if (!landing || steps === 0) return;

    this.emit(
      skill.vfxKind ?? 'blink',
      [{ x: hero.x, y: hero.y }, { x: landing.x, y: landing.y }],
      'physical',
      0.25
    );
    hero.x = landing.x;
    hero.y = landing.y;
    hero.path = hero.path.slice(steps);
    this.state.blinks++;
    const sooner = (this.grants.moveCooldown as number) ?? 1;
    this.moveIn = ((skill.params?.cooldown as number) ?? 1) * sooner;

    if (jumps) this.land(hero); // a step arrives; only a jump LANDS
    const back = (this.grants.moveMana as number) ?? 0;
    if (back > 0) hero.mana = Math.min(hero.stats.maxMana, hero.mana + hero.stats.maxMana * back);
  }

  /** What coming down does to what is near it. Never damage: every damage
   *  number in the game belongs to the skill in the main slot. */
  private land(hero: Entity): void {
    const shock = landingOf(this.grants);
    if (!shock) return;
    this.emit('sweep', [{ x: hero.x, y: hero.y }, { x: hero.x + shock.radius, y: hero.y }], 'physical', 0.35);
    for (const m of this.state.monsters) {
      if (m.dead || dist(m, hero) > shock.radius) continue;
      const live = m.effects.find((e) => e.id === SLOWED);
      // Refreshed rather than stacked, exactly as the crit buff is.
      if (live) live.remaining = Math.max(live.remaining, shock.seconds);
      else m.effects.push({ id: SLOWED, remaining: shock.seconds });
      m.slowed = shock.slow;
    }
  }

  /** The behaviour decides WHO gets hit; the sim decides what a hit does. */
  /** The one input a descent has ever had. QUEUED, never applied where it
   *  arrives, so a press cannot land between two ticks. */
  usePotion(id: string): void {
    this.queued.push(id);
  }

  /** What a potion is waiting for, whoever is asking. */
  potionThreshold(id: string): number {
    return this.options.potionThresholds?.[id] ?? POTION_BY_ID[id]?.threshold ?? 0;
  }

  /** Whether one would do anything if you pressed it right now. */
  canDrink(id: string): boolean {
    const hero = this.state.hero;
    return (
      this.state.status === 'running' &&
      (this.state.charges[id] ?? 0) > 0 &&
      !hero.effects.some((e) => e.id === id)
    );
  }

  /**
   * Presses first, then the shipped policy, then what is already running. ONE
   * implementation: `runToCompletion` runs exactly the rule a player watching
   * would, because a build whose power needs somebody there is a build no
   * harness can hold.
   */
  private stepPotions(dt: number): void {
    const hero = this.state.hero;

    this.stepRecharge(dt);
    for (const id of this.queued) this.drink(id);
    this.queued.length = 0;

    for (const potion of POTIONS) {
      const max = potion.pool === 'life' ? hero.stats.maxLife : hero.stats.maxMana;
      const now = potion.pool === 'life' ? hero.life : hero.mana;
      if (max > 0 && now / max <= this.potionThreshold(potion.id)) this.drink(potion.id);
    }

    if (hero.effects.length === 0) return;
    const potency = (this.grants.potionPotency as number) ?? 1;
    for (const effect of hero.effects) {
      effect.remaining -= dt;
      const potion = POTION_BY_ID[effect.id];
      if (!potion) continue;
      const max = potion.pool === 'life' ? hero.stats.maxLife : hero.stats.maxMana;
      const gain = ((max * potion.percentPerSecond * potency) / 100) * dt;
      if (potion.pool === 'life') hero.life = Math.min(max, hero.life + gain);
      else hero.mana = Math.min(max, hero.mana + gain);
    }
    hero.effects = hero.effects.filter((e) => e.remaining > 0);
  }

  /** A monster's own clock: it runs down and what it was doing stops. The
   *  hero's also POUR, which is why the potions keep their own. */
  private stepEffects(e: Entity, dt: number): void {
    for (const effect of e.effects) effect.remaining -= dt;
    e.effects = e.effects.filter((x) => x.remaining > 0);
    if (!e.effects.some((x) => x.id === SLOWED)) delete e.slowed;
  }

  /** A charge as a cooldown rather than a budget: banked fractionally per flask
   *  and never past what that flask holds, so it is never a stockpile. */
  private stepRecharge(dt: number): void {
    const rate = (this.grants.chargeRegen as number) ?? 0;
    if (rate <= 0) return;
    for (const potion of POTIONS) {
      if ((this.state.charges[potion.id] ?? 0) >= potion.charges) continue;
      const banked = (this.recharging[potion.id] ?? 0) + rate * dt;
      const whole = Math.floor(banked);
      this.recharging[potion.id] = banked - whole;
      if (whole <= 0) continue;
      this.state.charges[potion.id] = Math.min(
        potion.charges,
        (this.state.charges[potion.id] ?? 0) + whole
      );
      this.state.regained += whole;
    }
  }

  /** True while any flask is pouring. What every `potion*` grant is waiting on. */
  private flasked(): boolean {
    return this.state.hero.effects.some((e) => POTION_BY_ID[e.id] !== undefined);
  }

  private drink(id: string): void {
    if (!this.canDrink(id)) return;
    this.state.charges[id]--;
    this.state.drunk++;
    const longer = (this.grants.potionDuration as number) ?? 1;
    this.state.hero.effects.push({ id, remaining: POTION_BY_ID[id].seconds * longer });
  }

  /** The one place mana is spent. Short of it you are STARVED: the pool drains
   *  to 0 and the cast lands at `starvedMultiplier`, skill and tree intact. */
  private swing(hero: Entity, target: Entity): void {
    const cost = hero.stats.manaCost;
    this.state.casts++;
    const paid = hero.mana + 1e-9 >= cost;
    hero.mana = paid ? hero.mana - cost : 0;
    if (!paid) this.state.dryCasts++;
    this.starved = !paid;
    // A cost that is a SHARE of the pool, so stacking mana pays for itself.
    this.overcharged = paid && this.spendOvercharge(hero);
    this.useSkill(hero, target, this.skill);
    this.starved = false;
    this.overcharged = false;
  }

  /** Whether this use was overcharged. Silently skipped when the pool is short,
   *  so the trade never turns a payable cast into a starved one. */
  private spendOvercharge(hero: Entity): boolean {
    const deal = overchargeOf(this.grants);
    if (!deal) return false;
    const price = hero.stats.maxMana * deal.share;
    if (price <= 0 || hero.mana < price) return false;
    hero.mana -= price;
    this.state.overcharges++;
    return true;
  }

  private useSkill(user: Entity, primary: Entity, skill: SkillDef): void {
    const behaviour = SKILL_BEHAVIOURS[skill.behaviour] ?? SKILL_BEHAVIOURS.single_target;

    user.action = 'attack';
    user.actionTimer = ATTACK_POSE;

    const grants = user.kind === 'hero' ? this.grants : {};
    const castIndex = user.kind === 'hero' ? this.casts++ : 0;

    // Rolled once for the whole use. Behaviours branch on it (Contagion), and
    // dealDamage honours it so a critical cast crits every target it touches.
    const chance = this.critChanceOf(user);
    const crit = chance > 0 && this.rng.chance(chance / 100);

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
    user.cooldown = this.swingCooldown(user);
  }

  /** Critical chance, plus whatever a running flask is adding to the hero's. */
  private critChanceOf(e: Entity): number {
    const flask = e.kind === 'hero' && this.flasked() ? (this.grants.potionCrit as number) ?? 0 : 0;
    return e.stats.critChance + flask;
  }

  /** What a swing rate is multiplied by: a flask, and a Slow. */
  private hasteOf(e: Entity): number {
    const slow = 1 - (e.slowed ?? 0);
    if (e.kind !== 'hero' || !this.flasked()) return slow;
    return slow * (1 + ((this.grants.potionHaste as number) ?? 0) / 100);
  }

  /** ONE answer, for a body with a skill and a body without. In two places a
   *  Slow reached melee packs or ranged ones, never both. */
  private swingCooldown(e: Entity): number {
    return 1 / Math.max(0.01, e.stats.attacksPerSecond * this.hasteOf(e));
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
    const own = this.critChanceOf(attacker);
    const crit = this.useCrit ?? (own > 0 && this.rng.chance(own / 100));

    let scale = multiplier * this.rng.float(0.9, 1.1);
    if (crit) scale *= 2 + attacker.stats.critMultiplier / 100;
    // Ailments and bursts too: no corner of a build runs dry for free.
    if (this.starved && attacker.kind === 'hero') scale *= starvedMultiplier(this.grants);
    // Conditions on the WHOLE use: a burst is worth what made it.
    if (attacker.kind === 'hero') {
      if (this.overcharged) scale *= 1 + (overchargeOf(this.grants)?.more ?? 0);
      if (this.flasked()) scale *= (this.grants.potionMore as number) ?? 1;
    }
    // From a crit that landed BEFORE this one: the crit granting it never
    // hits harder for doing so.
    const buff = attacker.kind === 'hero' ? critBuff(this.grants) : null;
    if (buff && attacker.effects.some((e) => e.id === CRIT_BUFF)) scale *= 1 + buff.more / 100;

    // Resistance applies to ONE type's damage, never to a summed total, or
    // fire resistance would reduce the physical half of the same hit. Armour
    // is typeless and hits only — damage over time skips it, which is what
    // lets an ailment threaten a tanky build.
    const armour = 1 - this.blunting(defender) / 100;
    // A flat aura lands ONCE on the hit, then every percentage multiplies what
    // is there — which is the whole of why a room holding both is lethal.
    const boost = attacker.boost;
    const swing = Object.values(attacker.stats.damageByType).reduce((n, v) => n + v, 0);
    const lift =
      boost && swing > 0
        ? ((swing + boost.flatDamage) * (1 + boost.incDamage / 100)) / swing
        : 1;

    const byType: Record<string, number> = {};
    let dmg = 0;
    for (const [type, amount] of Object.entries(attacker.stats.damageByType)) {
      const dealt = this.afterResistance(defender, amount * scale * lift, type) * armour;
      byType[type] = (byType[type] ?? 0) + dealt;
      dmg += dealt;
    }
    // The floor is on the HIT, not per type: a hit split six ways would
    // otherwise be worth six times the minimum.
    dmg = Math.max(1, dmg);

    // The pool takes its share before life does, and what it took comes off
    // every type in proportion — so the overlay reports what actually landed.
    if (defender.kind === 'hero') {
      const before = dmg;
      dmg = this.absorb(defender, dmg);
      if (dmg < before) {
        const kept = dmg / before;
        for (const type of Object.keys(byType)) byType[type] *= kept;
      }
    }
    if (attacker.kind === 'hero') this.leech(attacker, dmg);

    // Being hit is the most reliable way to notice someone, whatever the
    // range or the line of sight.
    this.wake(defender, true);

    // Everything else about the hit still happens — the flash, the recoil, the
    // number over the head — because a sandbox is for watching a hit land.
    if (!this.sandbox) defender.life -= dmg;
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

    // Refreshed, never stacked: two windows would be one number twice.
    if (crit && buff) {
      const live = attacker.effects.find((e) => e.id === CRIT_BUFF);
      if (live) live.remaining = buff.seconds;
      else attacker.effects.push({ id: CRIT_BUFF, remaining: buff.seconds });
      this.emit('crit_surge', [{ x: attacker.x, y: attacker.y }], 'physical', 0.4);
    }

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

    // A line no drop can roll: the wound, not the cast. Off the damage that
    // actually landed, so a starved swing leaves a smaller Bleed and no corner
    // of a build runs dry for free.
    const bleed = attacker.kind === 'hero' ? bleedOf(this.grants) : null;
    if (bleed && defender.life > 0) this.leaveBleed(defender, dmg, bleed);

    if (defender.life <= 0) this.kill(defender);
  }

  /** Physical, whatever the skill deals: a Bleed is what the hit opened. */
  private leaveBleed(
    target: Entity,
    dealt: number,
    bleed: { seconds: number; multiplier: number }
  ): void {
    if (bleed.seconds <= 0 || dealt <= 0) return;
    if (target.ailments.length >= MAX_AILMENT_STACKS) target.ailments.shift();
    target.ailments.push({
      type: 'physical',
      dps: { physical: (dealt * bleed.multiplier) / bleed.seconds },
      remaining: bleed.seconds,
      tickIn: AILMENT_TICK * this.rng.float(0.5, 1),
      critChance: 0,
      critMultiplier: 0,
    });
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
    const byType: Record<string, number> = {};
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
        if (e.kind === 'hero') byType[type] = (byType[type] ?? 0) + dealt;
      }
    }
    e.ailments = e.ailments.filter((a) => a.remaining > 0);

    // The pool eats a poison exactly as it eats a hit. Armour never could,
    // which is the whole reason letting mana do it is worth a trade.
    if (e.kind === 'hero') {
      const before = total;
      total = this.absorb(e, total);
      const kept = before > 0 ? total / before : 1;
      for (const [type, dealt] of Object.entries(byType)) {
        this.state.damageTaken[type] = (this.state.damageTaken[type] ?? 0) + dealt * kept;
      }
    }

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

  /** A share of what would reach the hero, paid at one point of pool for one of
   *  damage. Returns what gets through, and is the one seam a hit and an
   *  ailment tick both ask, so the two can never drift. */
  private absorb(hero: Entity, damage: number): number {
    const share = shieldShare(this.grants);
    if (share <= 0 || hero.mana <= 0 || damage <= 0) return damage;
    const paid = Math.min(hero.mana, damage * share);
    hero.mana -= paid;
    this.state.absorbed += paid;
    return damage - paid;
  }

  /** Damage dealt, back as mana. The road that pays for spending the pool. */
  private leech(hero: Entity, damage: number): void {
    const share = (this.grants.manaLeech as number) ?? 0;
    if (share <= 0 || damage <= 0) return;
    hero.mana = Math.min(hero.stats.maxMana, hero.mana + damage * share);
  }

  /** A defender's armour once the room has had its say. The stat pipeline's
   *  floor holds here too: a quarter of every hit still lands. */
  private blunting(defender: Entity): number {
    const boost = defender.boost;
    if (!boost || (boost.flatArmour === 0 && boost.incArmour === 0)) {
      return defender.stats.armourReduction;
    }
    const armour = (defender.stats.armour + boost.flatArmour) * (1 + boost.incArmour / 100);
    const hardest = Math.max(0, ...Object.values(defender.stats.resistances)) / 100;
    const room = 1 - DEFENCE.monsterHitFloor / Math.max(0.01, 1 - hardest);
    return Math.max(0, Math.min(armourReduction(armour), room * 100));
  }

  /**
   * What every monster is currently standing in. Read a few times a second
   * rather than per hit: a carrier that walked away or died stops mattering.
   * Flats and percentages are summed apart, and multiplied once at the point
   * of use — so order never changes the answer.
   */
  private readAuras(): void {
    const carriers = this.state.monsters.filter((m) => !m.dead && m.aura);
    for (const m of this.state.monsters) {
      if (m.dead) continue;
      if (carriers.length === 0) {
        m.boost = undefined;
        continue;
      }
      let flatDamage = 0;
      let incDamage = 0;
      let flatArmour = 0;
      let incArmour = 0;
      for (const carrier of carriers) {
        // Never itself: what makes a room lethal is the pack around the thing
        // in the middle, and killing that thing is the answer to it.
        if (carrier === m) continue;
        if (dist(carrier, m) > AURA.radius) continue;
        const aura = AURA_BY_ID[carrier.aura!];
        if (!aura) continue;
        flatDamage += (aura.flatDamage ?? 0) * this.auraDamage;
        incDamage += aura.incDamage ?? 0;
        flatArmour += aura.flatArmour ?? 0;
        incArmour += aura.incArmour ?? 0;
      }
      m.boost =
        flatDamage || incDamage || flatArmour || incArmour
          ? { flatDamage, incDamage, flatArmour, incArmour }
          : undefined;
    }
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
    this.rollRelicDrop();
    this.events.push({ kind: 'kill', total: s.killed, xp: this.xpPerKill });

  }

  /**
   * A piece's item level comes off the power band, and the base's tier comes
   * off that — so a weak set cannot hand you a six-modifier base however lucky
   * you get. Rarity raises the CHANCE, never the ceiling, or a rarity-stacked
   * bare run out-drops an honest set.
   */
  private rollGearDrop(): void {
    const drops = this.set.band;
    const hero = this.state.hero.stats;
    const rarity = this.set.rewards.rarity + hero.rarity + this.set.pays.rarity;
    const chance = drops.gearChance * this.set.yield * (1 + rarity / 200);
    if (!this.rng.chance(chance)) return;

    // A named piece instead of a rolled one. A gate is a wall, so the pool is
    // filtered before the pick and no amount of rarity argues with it.
    const named = UNIQUES.filter(
      (u) =>
        opensHere(u.gate, this.set.power, this.set.theme) &&
        (GEAR_BASE_BY_ID[u.base]?.ilvl ?? 1) <= drops.ilvl
    );
    if (named.length > 0 && this.rng.chance(UNIQUE_DROP.chance * (1 + rarity / 200))) {
      const def = this.rng.pick(named)!;
      this.state.loot.items.push(makeUnique(def, drops.ilvl, this.rng));
      return;
    }

    const base = pickGearBase(drops.ilvl, this.rng, dropBias(this.set.mods));
    if (!base) return;

    const mods = this.rng.int(drops.fill[0], drops.fill[1]);
    this.state.loot.items.push(rollGear(base.id, drops.ilvl, mods, DROP_POOL, this.rng));
  }

  /** A corpse for whoever wants one. A gate is a wall, so the pool is filtered
   *  before the roll: no amount of rarity finds a specimen outside the Rot. */
  private rollRelicDrop(): void {
    for (const def of RELICS) {
      if (!opensHere(def.gate, this.set.power, this.set.theme)) continue;
      if (this.rng.chance(def.chance)) this.state.loot.items.push(makeRelic(def));
    }
  }

  private rollCurrency(): void {
    // Gear stacks with the crystal: currency find changes HOW OFTEN, rarity
    // changes HOW GOOD. Two separate questions, so two separate stats.
    const hero = this.state.hero.stats;
    const chance =
      CURRENCY_DROP.chancePerKill * (1 + hero.currencyFind / 100) * this.set.pays.currency;
    if (!this.rng.chance(chance)) return;

    // The tier caps the class. Rarity decides how often you reach the ceiling;
    // the crystal decides where the ceiling is. Without the cap, a T1 map with
    // enough rarity would drop the currency that re-rolls a Brilliant item —
    // which is the whole ladder skipped in one lucky kill.
    const ceiling = CURRENCY_CLASSES.indexOf(this.set.band.currency);
    const rarity = this.set.rewards.rarity + hero.rarity + this.set.pays.rarity;
    const climb = CURRENCY_DROP.upgradeChance * (1 + rarity / 100);
    let rank = 0;
    while (rank < ceiling && this.rng.chance(climb)) rank++;

    // A gate is a wall: what this run cannot reach does not exist here, so the
    // pool is filtered before the pick rather than the pick being rerolled.
    const cls = CURRENCY_CLASSES[rank];
    const pool = CURRENCIES.filter(
      (c) => c.class === cls && opensHere(c.gate, this.set.power, this.set.theme)
    );
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

/** The walk over to whoever climbed out, for a harness with no frame loop.
 *  Bounded like the run itself: nobody may wait on an arrival forever. */
export function walkToMeeting(sim: RunSim, maxSeconds = 30): boolean {
  let guard = Math.ceil(maxSeconds / TICK);
  while (!sim.state.meeting && guard-- > 0) sim.walkOut(TICK);
  return sim.state.meeting;
}
