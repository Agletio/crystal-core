/**
 * The run: deterministic, headless, fixed-timestep. Same crystal, gear and seed
 * gives the same run tick for tick, so a balance complaint is a seed rather than
 * a description. The caller owns real time and calls step(TICK) a whole number
 * of times, so frame rate never changes an outcome.
 */
import { Rng } from '../rng';
import {generateMap, sceneMap, dist, hasLineOfSight, roomCenter } from './grid';
import type { GameMap, Grid, Room, Vec2 } from './grid';
import { findPath, nearestByPath } from './pathfind';
import { AILMENT, DAMAGE_TYPE_BY_ID, PASSIVE_DAMAGE, POTIONS, POTION_BY_ID } from '../data';
import { percentStat } from '../mods';
import type { BossPhase } from '../data';

/** A circle the Fall has put on the floor, and the seconds until it lands. */
export interface FallCircle {
  x: number;
  y: number;
  r: number;
  fuse: number;
  of: number;
}
import { HERO_SCALE, heroSpriteFor, pinnedFor } from './appearance';
import {
  armourReduction,
  characterStats,
  dropBias,
  effectiveSkill,
  mapDensity,
  monsterStats,
  passiveScale,
  statMods,
  treeGrants,
  trialMod,
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
  BOSS_FIGHT,
  BOSS_KEYS,
  BOSS_POSES,
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
  abilitiesFor,
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
  HOARD,
  RELIC_BY_ID,
  AILMENTS,
  AILMENT_BY_ID,
  AILMENT_OF_TYPE,
} from '../data';
import type { AilmentDef, BossDef, EncounterDef } from '../data';
import type { MonsterAbilityDef, MonsterDef, MonsterRankDef } from '../types';
import { LURKS, SCENE_BY_ID, scaleFor } from '../scenes';
import type { SceneAct } from '../scenes';
import { ModPool, computeStat } from '../mods';
import { makeRelic, makeUnique, pickGearBase, rollGear } from '../economy';
import type { Boost, Item, SkillDef } from '../types';
import type { MonsterRank } from '../render/bestiary';

/** Built once at load: derived from authored data and never mutated. */
const DROP_POOL = new ModPool(ALL_MODS);

/** Sim step. 30/s is plenty for movement this slow and keeps replays cheap. */
export const TICK = 1 / 30;

/** Monsters beyond this range of the hero don't think at all. */
const ACTIVE_RANGE = 16;

/** How a body that has not seen you paces: never further than `WANDER_REACH`
 *  from where it was put, at a fraction of its chase speed, resting between
 *  steps. Shifting weight rather than patrolling — a pack that walks somewhere
 *  is a pack that has left the room it guards. */
const WANDER_REACH = 1.15;
const WANDER_PACE = 0.32;
const WANDER_REST: [number, number] = [0.7, 2.8];

/** How far a body with something to THROW stands off, and notices you from:
 *  the skill's own reach, in the four places that used to say it by hand. */
const thrownReach = (skill?: SkillDef): Partial<CombatStats> =>
  skill ? { attackRange: skill.range, aggroRange: skill.range + 2 } : {};

/** Ways out of a Fall circle the hero costs. A whole circle rather than a
 *  sweep from one ray: the cheapest is usually SIDEWAYS, and a sweep that
 *  stops at the first fit never sees it. `SLIDES` is the same idea a step at
 *  a time, for a walk a live circle is standing in the way of. */
const WAYS_OUT = 24;
const SLIDES = [Math.PI / 3, -Math.PI / 3, Math.PI / 2, -Math.PI / 2, 2.2, -2.2];

/** Slack on a line asked to clear the boss's body: the dodge worth having runs
 *  ALONG the rim. `BEHIND` prices one reachable only THROUGH it, out of range
 *  of the room, so every honest way out wins. */
const ROUND_THE_BOSS = 0.15;
const BEHIND_THE_BOSS = 1000;

/** Relaxation iterations for body separation. See separate(). */
const SEPARATION_PASSES = 2;

/** How far waking one wakes its neighbours. ONE hop, or a dense map cascades. */
const AGGRO_CHAIN_RADIUS = 4.5;

/** How near the way out the last encounter comes up the hole behind you. */
const FINALE_RANGE = 5;
const KITE_EDGE = 0.92; // of your own reach; short of all of it, or a hair of drift eats the use

/** Close enough to be standing on the way out, and the descent is over. */
const AT_EXIT = 0.5;

/** How far a pacing body walks from where it was standing, and back. */
const PACE_STEP = 2;
/** How close you get before the one who lurks comes out at you. */
const LURK_RANGE = 4;
/** A share of descent speed, for crossing a room you are meant to look at. */
const SCENE_WALK = 0.4;

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
  /** An `AilmentDef` id. What it IS decides what it DOES. */
  id: string;
  /** What the ailment IS, for naming and for what contagion plants. */
  type: string;
  /** Damage per second before resistance, per damage type. */
  dps: Record<string, number>;
  remaining: number;
  /** Countdown to the next lump. Discrete, so a poison can critically TICK. */
  tickIn: number;
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
  /** Which body draws it: a monster's id, or the hero's TRADE. */
  sprite: string;
  /** `HELD` rows pinned at each hand. The body never changes for either. */
  held?: string;
  offhand?: string;
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
  /** Held still by something that landed on you. Only the Fall sets it. */
  stun?: number;
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
  /** Which HOARD this body guards. The last guard down is what opens it. */
  hoard?: number;
  /** What it IS, so the Welling can raise the same kind one rank up. */
  defId?: string;
  abilityId?: string;
  welled?: boolean; // came up out of a body rather than being spawned with the map
  bears?: string; // a `RelicDef` id this body is carrying, handed over when it dies
  /** Just out of a Freeze: the next hit on it is a Critical, whatever your
   *  chance is. Crit comes back to an ailment from THIS side and no other. */
  thawed?: boolean;
  /** Where a body that has not seen you paces about: where it was PUT, the spot
   *  it is ambling to, and the pause before the next one. Anchored, so a pack
   *  cannot drift out of the room it stands in. */
  wander?: { home: Vec2; to: Vec2; wait: number };
  dead: boolean;
}

/** How many of one ailment are running. Stacks are separate entries so each
 *  expires on its own clock, which is what lets a chance over 100% mean it. */
export const stacksOf = (e: Entity, id: string): number =>
  e.ailments.reduce((n, a) => n + (a.id === id ? 1 : 0), 0);

const OVERCHARGE_TYPE = 'cold'; // whatever the skill deals: the pool is his, and cold

/** A box in a pack. `opened` turns when the last guard goes down. */
export interface Hoard {
  id: number;
  x: number;
  y: number;
  opened: boolean;
}

export interface Floater {
  x: number;
  y: number;
  text: string;
  age: number;
  crit: boolean;
  on: EntityKind;
  tick?: string; // an ailment id: a TICK, drawn smaller and in its own colour
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
  /** Every Hoard put down this descent, and whether its guard is dead yet. */
  hoards: Hoard[];
  /** Bodies that welled up out of another and were then put down. */
  welled: number;
  bearers: number; // Bearers put down, and so relics actually taken
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
  /** What the boss is DOING, and how long is left of it. Null everywhere else. */
  phase: BossPhase['kind'] | null;
  phaseLeft: number;
  /** Where the Fall has put circles, for whatever draws them. */
  circles: FallCircle[];
  /** What a Reading has left on you: every mark is more damage taken, and they
   *  fall off once it stops. What makes the Reading worth answering. */
  marks: number;
  /** Damage taken, by type. The results overlay renders whatever it is handed. */
  damageTaken: Record<string, number>;
  blocked: number; // hits a shield turned aside; zero with nothing in the off hand
  dodged: number; // and hits stepped out of, which is the same shape without one
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
  /** Mana this cast spent overcharging, which is also what it ADDS. */
  private overcharged = 0;
  /** Seconds since anything last landed on the hero. */
  private sinceHit = 0;
  /** Fractions of a flask charge banked back, by potion id. */
  private readonly recharging: Record<string, number> = {};
  /** Seconds until the movement skill can fire again. */
  private moveIn = 0;
  /** Seconds until the MOVEMENT slot may fire again, and what it counts down
   *  from: the readout draws the wait, so it reads one number the sim owns. */
  get moverWait(): { left: number; of: number } {
    return {
      left: Math.max(0, this.moveIn),
      of: (this.mover?.params?.cooldown as number) ?? 0,
    };
  }
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
  /** The character's LEVEL, which is the only thing a flat passive scales on. */
  private readonly level: number;
  /** Seconds until Sundering arms the next Burst, and until Hoarfrost fires. */
  private sunderIn = 0;
  private frostIn = 0;
  /** Whose body Momentum is built against, and how many uses have gone into it. */
  private momentumOn = -1;
  private momentumStacks = 0;
  /** Fixed at spawn: what a passive's own damage is scaled by, per type. */
  private readonly passiveScale: Record<string, number>;
  /** One aura's worth of flat damage on this map, in real damage. */
  private auraDamage = 0;
  /** The line being acted out, and whether its one act has finished. */
  private acting: { beat: number; done: boolean; to?: Vec2 } | null = null;
  /** The boss's own clock, beside `waveTimer` and stopped by the same death. */
  private reinforce: BossDef['reinforce'] | null = null;
  private reinforceTimer = 0;
  private nextHoard = 0;
  private putDown: Hoard[] = []; // `spawn` runs BEFORE `this.state` exists
  private statsFor = new Map<string, CombatStats>(); // per kind, ability and RANK
  /** Read once: rolled per death, and only ever when something bought it. */
  private wellChance = 0;
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
    this.level = character.level;
    this.mover = SKILL_BY_ID[equippedSkill(character, 'movement') ?? ''] ?? null;
    // The tree can change what the skill IS — its damage type, its tags — and
    // the sim has to fight with the same skill the stat sheet described, or a
    // converted Fireball scales off cold and is resisted as fire.
    this.skill = effectiveSkill(SKILL_BY_ID[mainSkillId(character)] ?? SKILLS[0], this.grants);
    this.set = runSet(crystals, trialMod(character));
    this.wellChance = percentStat(this.set.mods, 'wellChance');

    const def = options.scene ? SCENE_BY_ID[options.scene] : undefined;
    // Sockets are the only thing that lengthens a descent: an empty Fissure is
    // index zero of the same table rather than a special case beside it.
    const map = def
      ? sceneMap(def.plan, def.theme, Math.max(1, Math.round(this.set.power)))
      : generateMap(
          this.set.mods,
          rng,
          socketSize(this.set.filled),
          Math.max(1, Math.round(this.set.power)),
          this.set.theme
        );
    const stats = characterStats(character);
    const lines = statMods(character);
    this.passiveScale = { physical: passiveScale(lines, 'physical'), cold: passiveScale(lines, 'cold') };

    const worn = heroSpriteFor(character);
    const hero: Entity = {
      id: 0,
      kind: 'hero',
      sprite: worn,
      held: pinnedFor(character),
      offhand: pinnedFor(character, 'offhand'),
      scale: HERO_SCALE,
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
      stats,
      cooldown: 0,
      path: [],
      pathTimer: 0,
      targetId: null,
      walked: 0,
      aggroed: false,
      hitFlash: 0,
      dead: false,
    };

    // No packs at all is what makes a scene one: it calls up what it holds.
    const monsters = def ? [] : this.spawn(map);
    if (def) this.priceKills();
    this.byId = new Map(monsters.map((m) => [m.id, m]));

    this.state = {
      map,
      hero,
      monsters,
      floaters: [],
      vfx: [],
      hoards: this.putDown,
      welled: 0,
      bearers: 0,
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
      phase: null,
      phaseLeft: 0,
      circles: [],
      marks: 0,
      damageTaken: {},
      blocked: 0,
      dodged: 0,
    };

    if (def) this.state.folk.push(this.stand(def.who, def.plan.stands));
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

  /** A spot on a room's RIM that holds a body of this size. */
  private edgeOf(grid: Grid, room: Room, radius: number): Vec2 {
    const mid = roomCenter(room);
    const rim = Math.max(1, Math.round(radius) + 1);
    const spots: Vec2[] = [
      { x: mid.x, y: room.y + rim },
      { x: mid.x, y: room.y + room.h - 1 - rim },
      { x: room.x + rim, y: mid.y },
      { x: room.x + room.w - 1 - rim, y: mid.y },
    ];
    return spots.find((spot) => grid.fits(spot.x, spot.y, radius)) ?? mid;
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

  /** One kind at one rank. A rank scales life and EVERY damage type together:
   *  one and not the other is a rare that hits like a common. */
  private rankedStats(
    def: MonsterDef,
    ability: MonsterAbilityDef,
    rank: MonsterRankDef
  ): CombatStats {
    const key = `${def.id}:${ability.id}:${rank.id}`;
    const held = this.statsFor.get(key);
    if (held) return held;

    const base = monsterStats(this.set.mods, def, ability);
    const thrown = ability.skill ? SKILL_BY_ID[ability.skill] : undefined;
    const stats: CombatStats = {
      ...base,
      maxLife: base.maxLife * rank.life,
      damage: base.damage * rank.damage,
      damageByType: Object.fromEntries(
        Object.entries(base.damageByType).map(([t, v]) => [t, v * rank.damage])
      ),
      ...thrownReach(thrown),
    };
    this.statsFor.set(key, stats);
    return stats;
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

    // Every rank ABOVE common weighs more. One weighted pick either way, so a
    // set that lifts this cannot move where the seed goes next.
    const rank0 = percentStat(this.set.mods, 'monsterRank');
    const rankWeight = (r: MonsterRankDef, lift: number): number =>
      r.weight * (r === MONSTER_RANKS[0] ? 1 : lift);

    // Rolled ONLY when something bought it, or a set with no Hoards in it would
    // still spend a draw a set with none does not, and the seed would part.
    const hoardChance = percentStat(this.set.mods, 'hoardChance');
    // A gate is a WALL: the pool is filtered before the pick, so a Bearer in
    // the Fissure can never be carrying a corpse the Rot owns.
    const carried = RELICS.filter((r) => opensHere(r.gate, this.set.power, this.set.theme));
    const bearerChance = carried.length > 0 ? percentStat(this.set.mods, 'bearerChance') : 0;

    for (let p = 0; p < packCount; p++) {
      const room = this.rng.pick(rooms) ?? rooms[0];
      const hoarded = hoardChance > 0 && this.rng.chance(hoardChance / 100);
      const hoard = hoarded ? ++this.nextHoard : 0;
      const lift = 1 + (rank0 + (hoarded ? HOARD.rank : 0)) / 100;
      const guards = hoarded ? Math.round(packSize * HOARD.size) : packSize;
      if (hoarded) {
        const middle = roomCenter(room); // a PROP: both renderers already draw one
        map.props.push({ id: HOARD.prop, x: middle.x, y: middle.y });
        this.putDown.push({ id: hoard, x: middle.x, y: middle.y, opened: false });
      }

      // One kind per pack. Mixed packs read as noise; a uniform pack reads as
      // a thing you can recognise and react to.
      const pool = MONSTERS_BY_FAMILY[plan[p] ?? 'normal'];
      const def = this.rng.weighted(pool, (m) => m.weight) ?? pool[0];
      // Per PACK, off the half of the table this BODY can do: two elements in
      // one pack read as noise, and the pack that shoots is one you can see.
      const ability = this.abilityFor(def);
      const thrown = ability.skill ? SKILL_BY_ID[ability.skill] : undefined;
      // One carrier per pack, whatever the kind. Five Chanters would stack
      // five chants on their own neighbours, and read on screen as fog rather
      // than as a thing in the middle of the room worth killing first.
      const carrier = def.aura ? this.rng.int(0, guards - 1) : -1;
      // One body at the top rung holding what somebody upstairs wants.
      const bearing = bearerChance > 0 && this.rng.chance(bearerChance / 100);
      const bearer = bearing ? this.rng.int(0, guards - 1) : -1;
      const relic = bearing ? this.rng.pick(carried) : undefined;

      // Stats differ between the melee and ranged variants of a kind, so they
      // key separately — a ranged pack reaches much further and has to notice
      // the hero from beyond its own reach to ever open fire.
      for (let i = 0; i < guards; i++) {
        // Per monster, not per pack: a pack with one blue thing in it is a
        // pack you look at. Stats key on the rank too, or every rare in the
        // run would share the common one's life.
        const rank =
          i === bearer
            ? MONSTER_RANKS[MONSTER_RANKS.length - 1]
            : this.rng.weighted(MONSTER_RANKS, (r) => rankWeight(r, lift)) ?? MONSTER_RANKS[0];
        const stats = this.rankedStats(def, ability, rank);

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
          defId: def.id,
          abilityId: ability.id,
          ...(i === bearer && relic ? { bears: relic.id } : {}),
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
          ...(hoarded ? { hoard } : {}),
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
    if (this.sunderIn > 0) this.sunderIn -= dt;
    this.stepFrost(dt);

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

    this.stepFight(dt);
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
            for (const b of list) if (b.id > a.id) this.resolveOverlap(a, b); // each pair once
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

    // The hero shoves rather than being shoved, or a big pack walks it
    // backwards off its own path. A BOSS is shoved by NOTHING: one that can be
    // leaned on ends the fight against a wall. What cannot move hands its half
    // of the overlap to whatever is standing in it.
    const weight = (e: Entity) => (e === this.state.boss ? 0 : e.kind === 'hero' ? 0.2 : 1);
    const aw = weight(a);
    const bw = weight(b);
    const push = aw === 0 || bw === 0 ? 2 : 1;

    this.nudge(a, -nx * aw * push, -ny * aw * push);
    this.nudge(b, nx * bw * push, ny * bw * push);
  }

  /** A step that never puts a body's own tile in rock. `canStep` refuses a
   *  corner-cutting diagonal, but a body pushed off the lattice can cross one
   *  getting back to the path; one already in rock may move anywhere. */
  private glide(e: Entity, x: number, y: number): void {
    const { grid } = this.state.map;
    if (!grid.walkable(e.x, e.y)) {
      e.x = x;
      e.y = y;
      return;
    }
    if (grid.walkable(x, e.y)) e.x = x;
    if (grid.walkable(e.x, y)) e.y = y;
  }

  /** A shove, refusing any component that would put a BODY inside a wall:
   *  separation is what pushes things into rock, a path running only down tile
   *  centres. One already overlapping a wall falls back to its centre, so it
   *  can always walk out of somewhere it should never have been. */
  private nudge(e: Entity, dx: number, dy: number): void {
    const { grid } = this.state.map;
    const stuck = !grid.fits(e.x, e.y, e.radius);
    const ok = (x: number, y: number): boolean =>
      stuck ? grid.walkable(x, y) : grid.fits(x, y, e.radius);

    if (ok(e.x + dx, e.y)) e.x += dx;
    if (ok(e.x, e.y + dy)) e.y += dy;
  }

  /** A step away from whatever is nearest, only while the skill is recovering
   *  and only out to `KITE_EDGE` of your reach. Returns whether it moved. */
  private kiteFrom(hero: Entity, dt: number): boolean {
    if (this.grants.kite !== true) return false;
    let near: Entity | null = null;
    let closest = Infinity;
    for (const m of this.state.monsters) {
      if (m.dead) continue;
      const d = dist(hero, m);
      if (d < closest) {
        closest = d;
        near = m;
      }
    }
    if (!near) return false;
    const edge = this.reachTo(hero, near) * KITE_EDGE;
    if (closest >= edge || closest < 1e-3) return false;

    const step = Math.min(edge - closest, hero.stats.moveSpeed * dt * this.paceOf(hero));
    this.nudge(hero, ((hero.x - near.x) / closest) * step, ((hero.y - near.y) / closest) * step);
    return true;
  }

  /** Decay the transient pose and fall back to whether it's moving. */
  private settleAction(e: Entity, moving: boolean): void {
    if (e.actionTimer > 0) return;
    e.action = moving ? 'move' : 'idle';
  }

  /** How far apart two CENTRES may be and still be in reach. An arm starts at
   *  the BODY: measured centre to centre a COLOSSAL body never touches
   *  anything, since separation holds the pair further apart than its reach.
   *  Two ordinary bodies are exactly `attackRange`, so no pack moves. */
  private reachTo(a: Entity, b: Entity): number {
    const bulk = (e: Entity) => Math.max(0, e.radius - HERO_BASE.radius);
    return a.stats.attackRange + bulk(a) + bulk(b);
  }

  /** Nowhere he may walk INTO. `findPath` reads walls and a boss is not one, so
   *  a route behind it runs through a body `resolveOverlap` gives weight 0. */
  private penned(at: Vec2, radius: number): boolean {
    return this.inCircle(at) || this.inBody(at, radius);
  }

  private inCircle(at: Vec2): boolean {
    return this.state.circles.some((c) => dist(at, c) <= c.r);
  }

  private inBody(at: Vec2, radius: number): boolean {
    const boss = this.state.boss;
    return !!boss && !boss.dead && dist(at, boss) < boss.radius + radius;
  }

  /** Whether walking straight at `to` goes THROUGH the boss. The bar is the
   *  closer of the body and where he stands NOW, or a hair inside the rim
   *  refuses every direction at once. */
  private throughBoss(hero: Entity, to: Vec2): boolean {
    const boss = this.state.boss;
    if (!boss || boss.dead) return false;
    const dx = to.x - hero.x;
    const dy = to.y - hero.y;
    const len = dx * dx + dy * dy;
    const t = len > 1e-9 ? Math.max(0, Math.min(1, ((boss.x - hero.x) * dx + (boss.y - hero.y) * dy) / len)) : 0;
    const closest = Math.hypot(hero.x + dx * t - boss.x, hero.y + dy * t - boss.y);
    return closest < Math.min(boss.radius + hero.radius, dist(hero, boss)) - ROUND_THE_BOSS;
  }

  /** Round what is in the way toward `goal`, nearer side first. The body is
   *  always refused, a circle only while he is OUT of one — else a hero one was
   *  dropped on has every direction refused and stands in it. */
  private slideRound(e: Entity, goal: Vec2, step: number): void {
    if (step <= 0) return;
    const straight = Math.atan2(goal.y - e.y, goal.x - e.x);
    const grid = this.state.map.grid;
    const clear = !this.inCircle(e);
    for (const turn of SLIDES) {
      const a = straight + turn;
      const x = e.x + Math.cos(a) * step;
      const y = e.y + Math.sin(a) * step;
      if (!grid.fits(x, y, e.radius)) continue;
      if (this.inBody({ x, y }, e.radius)) continue;
      if (clear && this.inCircle({ x, y })) continue;
      this.glide(e, x, y);
      return;
    }
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

  /** Where in the boss's cycle we are, and how long this phase has run — the
   *  Reading climbs off the second number. */
  private phaseAt = 0;
  private phaseFor = 0;
  private fallIn = 0;
  private fallLeft = 0;
  private marked = 0;

  /** Hauling the maul out of the floor rather than swinging: rear-back until
   *  the last circle lands, never in the gap between bursts. Quick is a FLICK. */
  private get slamming(): boolean {
    return (
      this.state.phase === 'fall' &&
      (this.state.circles.length > 0 || this.fallIn <= BOSS_FIGHT.windup)
    );
  }

  /** Not fighting you at all: mid-slam, or hanging open and DAZED. */
  private get stalled(): boolean {
    return this.slamming || this.state.phase === 'split';
  }

  /** When the boss was called up. The enrage counts from THERE, never from the
   *  room's own clock: its walk across the floor is not your dps. */
  private fightFrom = 0;

  /** THE DPS CHECK: past `enrageAt` everything it does climbs, so a fight you
   *  cannot finish is one you eventually lose however well you turn. */
  private get rage(): number {
    const over = this.state.elapsed - this.fightFrom - BOSS_FIGHT.enrageAt;
    return over > 0 ? 1 + over * BOSS_FIGHT.enrageRamp : 1;
  }

  /**
   * The way clear of every circle he stands in, costed by how far it leaves him
   * from the boss. Straight away is the shortest ray and the worst one: three
   * slams running walk you to the far wall. But nearest-to-the-boss is the ray
   * that runs INTO it, so inside the body is refused and only-through-it priced
   * as the far wall — which leaves the ways ALONG the rim.
   */
  private wayOut(hero: Entity, on: FallCircle[]): Vec2 {
    const cx = on.reduce((n, c) => n + c.x, 0) / on.length;
    const cy = on.reduce((n, c) => n + c.y, 0) / on.length;
    let away = Math.atan2(hero.y - cy, hero.x - cx);
    const boss = this.state.boss;
    if (Math.hypot(hero.x - cx, hero.y - cy) < 0.05) {
      away = boss ? Math.atan2(hero.y - boss.y, hero.x - boss.x) : 0;
    }
    const grid = this.state.map.grid;
    const at = (a: number): Vec2 => {
      const ux = Math.cos(a);
      const uy = Math.sin(a);
      const far = Math.max(
        ...on.map((c) => {
          const fx = hero.x - c.x;
          const fy = hero.y - c.y;
          const b = fx * ux + fy * uy;
          return -b + Math.sqrt(Math.max(0, b * b - (fx * fx + fy * fy) + c.r * c.r));
        })
      );
      return { x: hero.x + ux * (far + 0.6), y: hero.y + uy * (far + 0.6) };
    };
    let best: Vec2 | null = null;
    let cost = Infinity;
    for (let i = 0; i < WAYS_OUT; i++) {
      const spot = at(away + (i / WAYS_OUT) * Math.PI * 2);
      if (!grid.fits(spot.x, spot.y, hero.radius)) continue;
      if (this.inBody(spot, hero.radius)) continue;
      const near = boss ? dist(spot, boss) : 0;
      const price = this.throughBoss(hero, spot) ? near + BEHIND_THE_BOSS : near;
      if (price < cost) {
        cost = price;
        best = spot;
      }
    }
    return best ?? at(away);
  }

  /** A boss playing one of its OWN animations: a state is looked up by skill
   *  id first, and nothing is named `slam`, so this borrows that seam. A pose
   *  is SPENT with its timer, or it is the only thing the body ever plays and
   *  the ordinary swing loses the lookup to a windup finished ages ago. */
  private pose(boss: Entity, state: string): void {
    boss.skillId = state;
    boss.action = 'attack';
    boss.actionTimer = ATTACK_POSE;
  }

  private unpose(boss: Entity): void {
    const held = boss.skillId as (typeof BOSS_POSES)[number] | null;
    if (held && boss.actionTimer <= 0 && BOSS_POSES.includes(held)) boss.skillId = null;
  }

  /** A boss up and alive, which is the whole of what makes a room a fight. */
  private get fighting(): boolean {
    const boss = this.state.boss;
    return !!boss && !boss.dead;
  }

  /**
   * What the boss is doing to you. The cycle runs on its own clock, so a fight
   * with nobody at the keyboard still ends — a hero who never turns simply
   * fights in whatever face he was left in.
   */
  private stepFight(dt: number): void {
    const s = this.state;
    const boss = s.boss;
    const def = BOSS_BY_ID[SCENE_BY_ID[this.options.scene ?? '']?.encounter ?? ''];
    const phases = def?.phases;
    if (!boss || boss.dead || !phases?.length) {
      s.phase = null;
      s.circles.length = 0;
      return;
    }

    this.unpose(boss);
    s.phaseLeft -= dt;
    this.phaseFor += dt;
    if (s.phaseLeft <= 0) {
      this.phaseAt = (this.phaseAt + 1) % phases.length;
      s.phase = phases[this.phaseAt].kind;
      s.phaseLeft = phases[this.phaseAt].seconds;
      this.phaseFor = 0;
      this.marked = 0;
      if (s.phase === 'fall') this.fallIn = BOSS_FIGHT.windup; // each OPENS on its own pose
      if (s.phase === 'reading') this.pose(boss, BOSS_POSES[1]);
      if (s.phase === 'split') boss.skillId = null;
    }

    // THE FALL: a circle where you ARE, on a fuse. Standing in one when it
    // lands is heavy damage and being held still, which is what makes a mover
    // the answer rather than a nicety.
    if (s.phase === 'fall') {
      this.fallIn -= dt;
      // It rears back BEFORE the circle appears; the fuse is the rest. Never
      // where it is ALREADY swinging: re-posed per tick the animation pins to
      // its first frame and the maul never comes down.
      if (this.fallIn <= BOSS_FIGHT.windup && boss.skillId !== BOSS_POSES[0]) {
        this.pose(boss, BOSS_POSES[0]);
      }
      if (this.fallIn <= 0) {
        this.fallLeft = this.fallLeft > 0 ? this.fallLeft - 1 : BOSS_FIGHT.fallBurst - 1;
        this.fallIn = this.fallLeft > 0 ? BOSS_FIGHT.fallEvery : BOSS_FIGHT.fallRest;
        s.circles.push({
          x: s.hero.x,
          y: s.hero.y,
          r: BOSS_FIGHT.fallRadius,
          fuse: BOSS_FIGHT.fallFuse,
          of: BOSS_FIGHT.fallFuse,
        });
      }
    }

    for (const ring of s.circles) ring.fuse -= dt;
    for (const ring of s.circles.filter((c) => c.fuse <= 0)) {
      if (dist(s.hero, ring) <= ring.r) {
        this.bite(boss.stats.damage * BOSS_FIGHT.fallDamage, 'physical', true);
        s.hero.stun = Math.max(s.hero.stun ?? 0, BOSS_FIGHT.fallStun);
        // Tank it if you can, but every one marks you.
        s.marks = Math.min(BOSS_FIGHT.markCap, s.marks + BOSS_FIGHT.markPerCatch);
      }
    }
    s.circles = s.circles.filter((c) => c.fuse > 0);

    // THE READING: it fixes on you, it cannot be dodged, and it climbs.
    if (s.phase === 'reading') {
      const per = BOSS_FIGHT.readingPerSecond * (1 + BOSS_FIGHT.readingRamp * this.phaseFor);
      this.bite(boss.stats.damage * per * dt, 'fire');
      this.marked += dt;
      while (this.marked >= BOSS_FIGHT.markEvery && s.marks < BOSS_FIGHT.markCap) {
        this.marked -= BOSS_FIGHT.markEvery;
        s.marks++;
      }
    } else if (s.marks > 0) {
      this.marked += dt * BOSS_FIGHT.markFall;
      while (this.marked >= BOSS_FIGHT.markEvery && s.marks > 0) {
        this.marked -= BOSS_FIGHT.markEvery;
        s.marks--;
      }
    }
  }

  /**
   * What the ROOM does to you, rather than what something swung. Resisted and
   * absorbed as an ailment's tick is. A SLAM is a HIT and armour blunts it; the
   * Reading is a drain and goes through, which is the whole of why plate
   * answers one of them and nothing else in the room.
   */
  private bite(raw: number, type: string, hit = false): void {
    const hero = this.state.hero;
    if (hero.dead) return;
    const marked = 1 + this.state.marks * BOSS_FIGHT.markMore;
    const blunt = hit ? 1 - this.blunting(hero) / 100 : 1;
    let total = this.afterResistance(hero, raw * marked * this.rage, type) * blunt;
    const before = total;
    total = this.absorb(hero, total);
    const kept = before > 0 ? total / before : 1;
    this.state.damageTaken[type] = (this.state.damageTaken[type] ?? 0) + before * kept;
    if (total <= 0) return;
    this.sinceHit = 0;
    hero.life -= total;
    if (hero.life <= 0) this.kill(hero);
  }

  private stepHero(dt: number): void {
    const s = this.state;
    const hero = s.hero;

    if (hero.stun !== undefined && hero.stun > 0) hero.stun -= dt;
    if (hero.cooldown > 0) hero.cooldown -= dt;
    if (this.moveIn > 0) this.moveIn -= dt;
    if (hero.hitFlash > 0) hero.hitFlash -= dt;
    this.sinceHit += dt;
    if (hero.actionTimer > 0) hero.actionTimer -= dt;

    if (hero.life < hero.stats.maxLife) {
      hero.life = Math.min(hero.stats.maxLife, hero.life + hero.stats.lifeRegen * dt);
    }
    if (hero.mana < hero.stats.maxMana) {
      hero.mana = Math.min(hero.stats.maxMana, hero.mana + hero.stats.manaRegen * dt);
    }

    // A CIRCLE ON YOU outranks fighting, and leaving means clearing them ALL —
    // out of one and into the next is how a burst catches a mover. Getting out
    // is his own business, like pathing; being QUICK enough is the player's.
    const on = this.state.circles.filter((c) => dist(hero, c) <= c.r);
    if (on.length > 0 && (hero.stun ?? 0) <= 0) {
      const spot = this.wayOut(hero, on);
      hero.targetId = null;
      this.face(hero, spot.x, spot.y);
      this.settleAction(hero, true);
      if (this.advance(hero, spot, dt)) return;
    }

    const target = this.acquireTarget(hero);

    if (target) {
      const d = dist(hero, target);
      // In range is not enough — you have to be able to see it. Without this a
      // ranged attack happily shoots through a wall.
      if (d <= this.reachTo(hero, target) && this.canSee(hero, target)) {
        hero.path = [];
        this.face(hero, target.x, target.y);
        // Standing in it is the default and a passive replaces it: while the
        // skill is recovering, give ground out to the EDGE of your own reach
        // and no further. Past the edge you would be walking back in for every
        // use, which is a build that cannot kill rather than one that kites.
        const gave = hero.cooldown > 0 && this.kiteFrom(hero, dt);
        this.settleAction(hero, gave);
        if (hero.cooldown <= 0) this.swing(hero, target);
      } else if (!this.advance(hero, target, dt)) {
        // Route vanished mid-chase. Drop it; the next flood picks correctly.
        hero.targetId = null;
        hero.path = [];
      }
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
    this.events.push({ kind: 'cleared', seconds: s.elapsed, killed: s.killed });
  }

  /**
   * A way back to a room you have already put down. Per KILL and rare, an
   * occasion rather than a wage — and never out of a scene: a key that drops
   * in the room it opens is a loop rather than a reason to run the Fissure.
   */
  private rollKeyDrop(): void {
    if (this.options.scene) return;
    const beaten = this.options.beaten ?? [];
    for (const key of BOSS_KEYS) {
      if (!beaten.includes(key.boss)) continue;
      const odds = key.chance * Math.pow(key.perPower, Math.max(0, this.set.power));
      if (!this.rng.chance(Math.min(1, odds))) continue;
      this.state.loot.currency[key.id] = (this.state.loot.currency[key.id] ?? 0) + 1;
    }
  }

  /** Arriving in a room. YOU cross it, at a walk rather than at descent speed:
   *  the room is the point and arriving instantly skips it. Not `step`:
   *  nothing in a scene has a clock. */
  walkOut(dt: number): void {
    const s = this.state;
    const met = s.folk[0];
    if (!met || s.meeting) return;

    const apart = dist(s.hero, met);
    const lurking = LURKS.has(met.sprite) && apart > LURK_RANGE;
    // A walk that cannot finish still hands the thing over, whoever is walking.
    if (apart > 1.1) {
      if (this.advance(s.hero, met, dt, SCENE_WALK)) {
        if (!lurking) this.face(met, s.hero.x, s.hero.y); // he watches you come
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
  /** CALLING IT UP without starting its cycle: the body has to exist before
   *  the camera crosses to it. Nothing ticks while a room is arrived in. */
  summonBoss(): Vec2 | null {
    if (this.state.boss) return this.state.boss;
    return this.callUp() ? this.state.boss : null;
  }

  /** And the CYCLE. Idempotent: the body may already be standing there. */
  beginEncounter(): boolean {
    const s = this.state;
    const def = BOSS_BY_ID[SCENE_BY_ID[this.options.scene ?? '']?.encounter ?? ''];
    if (!def) return false;
    if (!s.boss && !this.callUp()) return false;

    this.fightFrom = s.elapsed;
    if (def.phases?.length) {
      s.phase = def.phases[0].kind;
      s.phaseLeft = def.phases[0].seconds;
      this.phaseAt = 0;
      this.phaseFor = 0;
    }
    return true;
  }

  private callUp(): boolean {
    const s = this.state;
    const def = BOSS_BY_ID[SCENE_BY_ID[this.options.scene ?? '']?.encounter ?? ''];
    if (!def || s.boss) return false;

    const ability = this.abilityFor(MONSTERS[0]);
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

    const room = s.map.rooms[0]; // THE MIDDLE is its ground; you cross to it
    const mid = roomCenter(room);
    const at = s.map.grid.fits(mid.x, mid.y, 0.34 * def.size)
      ? mid
      : this.edgeOf(s.map.grid, room, 0.34 * def.size);
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

  /** What this body fights with. One seam, so a pack, a boss, its adds and the
   *  closing encounter all agree about which bodies throw. */
  private abilityFor(def: MonsterDef): MonsterAbilityDef {
    const can = abilitiesFor(def);
    return this.rng.weighted(can, (a) => a.weight) ?? can[0] ?? MONSTER_ABILITIES[0];
  }

  /** One more of the smaller things, out of the hole you came up. Stops dead
   *  when the boss does: the adds are pressure, never the objective. */
  private sendReinforcements(): void {
    const s = this.state;
    const from = MONSTER_BY_ID[this.reinforce?.from ?? ''];
    if (!from || !this.reinforce || !s.boss || s.boss.dead) return;

    const ability = this.abilityFor(from);
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

    const ability = this.abilityFor(MONSTERS[0]);
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

    // Above the aggro gate: a pose an unwoken body was knocked into would hold
    if (m.actionTimer > 0) m.actionTimer -= dt; // for the rest of the descent
    if (!m.aggroed) {
      this.pace(m, dt);
      return;
    }

    // A stalled boss neither swings nor closes.
    if (m === this.state.boss && this.stalled) {
      m.path = [];
      this.face(m, hero.x, hero.y);
      this.settleAction(m, false);
      return;
    }

    if (d <= this.reachTo(m, hero) && this.canSee(m, hero)) {
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

    const candidates = this.state.monsters.filter(
      (m) => !m.dead && dist(hero, m) <= this.reachTo(hero, m) && this.canSee(hero, m)
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
  /** Shifting about on the spot, for a body that has not seen you. By `nudge`
   *  rather than by a path — a wander is a step and a half, and `nudge` is the
   *  mover that tests the whole BODY against the rock rather than its centre.
   *  A step it cannot take ends there rather than pushing forever: what is in
   *  the way is usually another monster, which `separate` already resolves. */
  private pace(e: Entity, dt: number): void {
    const w =
      e.wander ??
      (e.wander = {
        home: { x: e.x, y: e.y },
        to: { x: e.x, y: e.y },
        wait: this.rng.float(0, WANDER_REST[1]),
      });

    if (w.wait > 0) {
      w.wait -= dt;
      this.settleAction(e, false);
      return;
    }

    const dx = w.to.x - e.x;
    const dy = w.to.y - e.y;
    const d = Math.hypot(dx, dy);
    const rest = (): void => {
      const turn = this.rng.float(0, Math.PI * 2);
      const out = this.rng.float(0.25, WANDER_REACH);
      w.to = { x: w.home.x + Math.cos(turn) * out, y: w.home.y + Math.sin(turn) * out };
      w.wait = this.rng.float(WANDER_REST[0], WANDER_REST[1]);
    };
    if (d <= 0.05) {
      rest();
      this.settleAction(e, false);
      return;
    }

    const step = Math.min(d, e.stats.moveSpeed * WANDER_PACE * dt);
    const wasX = e.x;
    const wasY = e.y;
    this.nudge(e, (dx / d) * step, (dy / d) * step);

    const went = Math.hypot(e.x - wasX, e.y - wasY);
    e.walked += went;
    if (went > 1e-6) this.face(e, e.x + (e.x - wasX), e.y + (e.y - wasY));
    else rest();
    this.settleAction(e, went > 1e-6);
  }

  private advance(e: Entity, goal: Vec2, dt: number, pace = 1): boolean {
    e.pathTimer -= dt;
    if (e.path.length === 0 || e.pathTimer <= 0) {
      e.path = findPath(this.state.map.grid, e, goal);
      e.pathTimer = 0.4 + this.rng.float(0, 0.25);
      if (e.path.length === 0) return false;
    }
    // Not while PACING: a mover would blink him across the room he is walking.
    if (e.kind === 'hero' && pace === 1) this.maybeMove(e);

    const startX = e.x;
    const startY = e.y;

    if (e.kind === 'hero' && (e.stun ?? 0) > 0) return false; // a Fall holds you still
    let remaining = e.stats.moveSpeed * dt * pace * this.paceOf(e);
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
        this.glide(e, wp.x, wp.y);
        e.path.shift();
        remaining -= d;
      } else {
        this.glide(e, e.x + (dx / d) * remaining, e.y + (dy / d) * remaining);
        remaining = 0;
      }
    }

    // Both walked ROUND, never into, and asked SEPARATELY: standing in a circle
    // is no licence to walk into the body, and a tank stands in one for a while.
    if (e.kind === 'hero' && (this.state.circles.length > 0 || this.fighting)) {
      const was = { x: startX, y: startY };
      const stepped = (into: (p: Vec2) => boolean) => into(e) && !into(was);
      if (stepped((p) => this.inCircle(p)) || stepped((p) => this.inBody(p, e.radius))) {
        e.x = startX; // round it rather than into it
        e.y = startY;
        this.slideRound(e, goal, e.stats.moveSpeed * dt * pace * this.paceOf(e));
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
   *  furthest walkable waypoint in reach. A STEP wants a clear line and goes
   *  through; a JUMP wants none and goes over, and neither reaches anywhere
   *  the walk could not. */
  private maybeMove(hero: Entity): void {
    const skill = this.mover;
    if (!skill || this.moveIn > 0 || hero.path.length === 0) return;
    // Never in a room you are WALKING across — skipping the last of it reads
    // as a bug — but a boss room is a fight, and a mover is how you leave a
    // slam without turning at all. Which is why a slam comes in a BURST.
    if (this.options.scene && !this.fighting) return;

    const further = (this.grants.moveDistance as number) ?? 1;
    const reach = ((skill.params?.distance as number) ?? 0) * further;
    const jumps = skill.behaviour === 'leap';
    const grid = this.state.map.grid;
    let landing: Vec2 | null = null;
    let steps = 0;
    let seen = 0;
    for (const wp of hero.path) {
      if (dist(hero, wp) > reach) break;
      seen++;
      // Never INTO a live circle or the boss: a blink landing in either is the
      // mover doing the boss's work. A JUMP clears the body; a STEP wants a
      // line, and one is no clearer through a boss than through a wall.
      if (this.penned(wp, hero.radius)) continue;
      if (!jumps && this.throughBoss(hero, wp)) continue;
      if (grid.walkable(wp.x, wp.y) && (jumps || hasLineOfSight(grid, hero, wp))) {
        landing = wp;
        steps = seen;
      }
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
    // A running flask can pay for the whole thing, which is what makes that
    // window the Alchemist's rather than a stat block with a duration.
    const cost = this.grants.potionFree && this.flasked() ? 0 : hero.stats.manaCost;
    this.state.casts++;

    // NO POOL AT ALL: life is the only currency, so the use always happens and
    // the price is always paid, and regeneration becomes the whole build.
    const blood = (this.grants.bloodCost as number) ?? 0;
    if (blood > 0) {
      hero.life -= cost * blood;
      this.starved = false;
      this.overcharged = 0;
      if (hero.life <= 0) {
        this.kill(hero);
        return;
      }
      this.useSkill(hero, target, this.skill);
      return;
    }

    let paid = hero.mana + 1e-9 >= cost;

    // Or LIFE pays what the pool cannot, so the Aethermancer is never Starved
    // — only bleeding, which is a different problem and a survivable one.
    const perMana = (this.grants.payWithLife as number) ?? 0;
    if (!paid && perMana > 0) {
      const short = cost - hero.mana;
      hero.life -= short * perMana;
      hero.mana = 0;
      paid = true;
      if (hero.life <= 0) this.kill(hero);
    } else {
      hero.mana = paid ? hero.mana - cost : 0;
    }
    if (!paid) this.state.dryCasts++;
    this.starved = !paid;
    // A cost that is a SHARE of the pool, so stacking mana pays for itself.
    this.overcharged = paid ? this.spendOvercharge(hero) : 0;
    this.useSkill(hero, target, this.skill);
    this.starved = false;
    this.overcharged = 0;
  }

  /** What it PAID, or 0 when short. The payment IS the damage. */
  private spendOvercharge(hero: Entity): number {
    const share = overchargeOf(this.grants);
    const price = hero.stats.maxMana * share;
    if (price <= 0 || hero.mana < price) return 0;
    hero.mana -= price;
    this.state.overcharges++;
    return price;
  }

  private useSkill(user: Entity, primary: Entity, skill: SkillDef): void {
    const behaviour = SKILL_BEHAVIOURS[skill.behaviour] ?? SKILL_BEHAVIOURS.single_target;

    user.action = 'attack';
    user.actionTimer = ATTACK_POSE;

    const grants = user.kind === 'hero' ? this.grants : {};
    const castIndex = user.kind === 'hero' ? this.casts++ : 0;
    const momentum = user.kind === 'hero' ? this.stepMomentum(primary) : 1;

    // Rolled once for the whole use. Behaviours branch on it (Contagion), and
    // dealDamage honours it so a critical cast crits every target it touches.
    const chance = this.critChanceOf(user);
    const crit = chance > 0 && this.rng.chance(chance / 100);

    this.useCrit = crit;

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
      momentum,
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

  /** MOMENTUM, advanced once per use: what THIS use is worth against the body
   *  it is aimed at, before the use adds to it. */
  private stepMomentum(primary: Entity): number {
    const bag = this.grants.momentum as { per: number; max: number } | undefined;
    if (!bag) return 1;

    // HALVED on a switch, never zeroed: a room with adds takes the hero off the
    // body he is working on constantly, and a streak one add wipes never exists.
    if (primary.id !== this.momentumOn) {
      this.momentumOn = primary.id;
      if (this.grants.momentumKeep !== true) this.momentumStacks >>= 1;
    }
    const per = bag.per + ((this.grants.momentumPer as number) ?? 0);
    const ceiling = bag.max + ((this.grants.momentumMax as number) ?? 0);
    const built = Math.min(ceiling, this.momentumStacks * per);
    this.momentumStacks++;
    return 1 + built / 100;
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

  /** What a step is multiplied by: a running flask, and nothing else yet. */
  private paceOf(e: Entity): number {
    if (e.kind !== 'hero') return 1;
    let pace = this.flasked() ? 1 + ((this.grants.potionMove as number) ?? 0) / 100 : 1;
    // Untouched for long enough, and speed IS the defence. It is a pace rather
    // than a stat so that being hit takes it away the instant it happens.
    const ramp = this.grants.unhitHaste as { after: number; more: number } | undefined;
    if (ramp && this.sinceHit >= ramp.after) pace *= 1 + ramp.more;
    return pace;
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

    // A Block stops a HIT and nothing else: an ailment ticks straight through
    // it, exactly as it does through armour. Rolled only when there is a chance
    // at all, or a character with no shield would burn a number every swing.
    if (defender.kind === 'hero' && defender.stats.blockChance > 0) {
      if (this.rng.chance(defender.stats.blockChance / 100)) {
        s.blocked++;
        s.floaters.push({ x: defender.x, y: defender.y, text: 'block', age: 0, crit: false, on: 'hero' });
        this.wake(defender, true);
        return;
      }
    }
    // A DODGE is the same shape and the same place in the order: the hit does
    // not happen, so nothing it carried happens either.
    if (defender.kind === 'hero' && defender.stats.dodgeChance > 0) {
      if (this.rng.chance(defender.stats.dodgeChance / 100)) {
        s.dodged++;
        s.floaters.push({ x: defender.x, y: defender.y, text: 'dodge', age: 0, crit: false, on: 'hero' });
        this.wake(defender, true);
        return;
      }
    }

    // Inside a skill use, crit was decided once for the whole cast. A plain
    // monster swing rolls its own.
    const own = this.critChanceOf(attacker);
    let crit = this.useCrit ?? (own > 0 && this.rng.chance(own / 100));
    if (defender.thawed) {
      crit = true;
      defender.thawed = false;
    }

    let scale = multiplier * this.rng.float(0.9, 1.1);
    // A boss fight's OWN multipliers, which the room applies and no build sets:
    // marks and the enrage climb what lands on you, and an open crystal takes
    // more than it ever does closed.
    if (this.fighting) {
      if (defender.kind === 'hero') scale *= (1 + s.marks * BOSS_FIGHT.markMore) * this.rage;
      if (defender === s.boss && s.phase === 'split') scale *= BOSS_FIGHT.splitMore;
    }
    // EXPOSURE changes a HIT rather than ticking: more damage taken, from anyone.
    const exposed = stacksOf(defender, 'exposure');
    if (exposed > 0) scale *= 1 + (exposed * (AILMENT_BY_ID.exposure?.takenPer ?? 0) * this.weak()) / 100;
    // A flask that blunts what reaches you. The window is the trade.
    if (defender.kind === 'hero' && this.flasked()) {
      scale *= 1 - Math.min(0.8, (this.grants.potionLess as number) ?? 0);
    }
    if (crit) scale *= 2 + attacker.stats.critMultiplier / 100;
    // Ailments and bursts too: no corner of a build runs dry for free.
    if (this.starved && attacker.kind === 'hero') scale *= starvedMultiplier(this.grants);
    // Conditions on the WHOLE use: a burst is worth what made it.
    if (attacker.kind === 'hero') {
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

    // What the cast paid, ADDED point for point: a bigger pool hits harder.
    const dealt = { ...attacker.stats.damageByType };
    if (this.overcharged > 0 && attacker.kind === 'hero') {
      const yieldOf = (this.grants.overchargeYield as number) ?? 1;
      dealt[OVERCHARGE_TYPE] = (dealt[OVERCHARGE_TYPE] ?? 0) + this.overcharged * yieldOf;
    }

    const byType: Record<string, number> = {};
    let dmg = 0;
    let elemental = 0;
    for (const [type, amount] of Object.entries(dealt)) {
      const raw = amount * scale * lift;
      if (DAMAGE_TYPE_BY_ID[type]?.group === 'elemental') elemental += raw;
      const dealt = this.afterResistance(defender, raw, type) * armour;
      byType[type] = (byType[type] ?? 0) + dealt;
      dmg += dealt;
    }
    // LAST, off the elemental total BEFORE its own resistance: every multiplier
    // is already in that number, and the tail is resisted as Prismatic instead,
    // so hardening against Fire does not harden against what Fire carried.
    const tail = attacker.kind === 'hero' ? ((this.grants.prismaticExtra as number) ?? 0) : 0;
    if (tail > 0 && elemental > 0) {
      const extra = this.afterResistance(defender, elemental * tail, 'prismatic') * armour;
      byType.prismatic = (byType.prismatic ?? 0) + extra;
      dmg += extra;
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

    this.applyTyped(attacker, defender, byType); // what the types carried, on a body still up

    // Being hit is the most reliable way to notice someone, whatever the
    // range or the line of sight.
    this.wake(defender, true);

    defender.life -= dmg;
    if (attacker.kind === 'hero' && defender.kind !== 'hero') this.sunder(defender);
    if (defender.kind === 'hero') this.sinceHit = 0;
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
      id: 'bleed',
      type: 'physical',
      dps: { physical: (dealt * bleed.multiplier) / bleed.seconds },
      remaining: bleed.seconds,
      tickIn: AILMENT_TICK * this.rng.float(0.5, 1),
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
    return amount * (1 - (res - this.shredding(defender, type)) / 100);
  }

  /** What an aura has taken off a monster's ward for this type, here and now.
   *  Never the hero's: an aura you carry cannot soften you. */
  private shredding(defender: Entity, type: string): number {
    if (defender.kind === 'hero') return 0;
    const group = DAMAGE_TYPE_BY_ID[type]?.group;
    if (!group) return 0;
    const aura = (group === 'elemental' ? this.grants.elementalShred : this.grants.occultShred) as
      | { radius: number; amount: number }
      | undefined;
    if (!aura) return 0;
    return dist(this.state.hero, defender) <= aura.radius ? aura.amount : 0;
  }

  /** A hit lands, so whatever its damage TYPES carry lands with it: an ailment
   *  is a fact about the damage rather than a node. Over 100% is more than one
   *  stack — 250% is two for certain and a coin at a third. */
  private applyTyped(attacker: Entity, target: Entity, byType: Record<string, number>): void {
    // THE HERO'S ALONE. A monster's difficulty is what a crystal rolls and
    // nothing else — "modifiers are the whole of how hard it is" — so letting
    // every pack burn and chill you would be a second, unweighed difficulty
    // source that no danger number accounts for. Measured: it took the first
    // descent from winnable to 1 clear in 24. Beat retuning every band, which
    // is the balance pass, and that is held.
    if (attacker.kind !== 'hero' || target.dead) return;
    for (const [type, dealt] of Object.entries(byType)) {
      if (dealt <= 0) continue;
      const def = AILMENT_OF_TYPE[type];
      if (!def || def.bySource) continue; // Poison is applied BY a skill, never by its type

      // A tree's own element is what its chance node raises: the grant is
      // untagged and the type it lands on is the one the skill actually dealt.
      const bought = attacker.kind === 'hero' ? ((this.grants.ailmentChance as number) ?? 0) : 0;
      const chance = (attacker.stats.ailmentChance?.[def.id] ?? def.chance) + bought;
      if (chance <= 0) continue;
      let count = Math.floor(chance / 100);
      const over = chance - count * 100; // rolled only when there IS one, or the seed parts
      if (over > 0 && this.rng.chance(over / 100)) count++;
      for (let i = 0; i < count; i++) this.strike(attacker, target, def);
    }
  }

  /** ONE stack. The oldest falls off at the cap rather than the new one being
   *  refused, so re-applying to a saturated target still refreshes. */
  private strike(attacker: Entity, target: Entity, def: AilmentDef): void {
    if (target.ailments.length >= MAX_AILMENT_STACKS) target.ailments.shift();
    // The two switches a tree still hands over: what an ailment is worth and
    // how long it runs. They reach the new ailments exactly as they reached
    // the old one, so a walked Rend tree is not a walked tree that does nothing.
    const g = attacker.kind === 'hero' ? this.grants : {};
    const more = ((g.ailmentMultiplier as number) ?? 1) * (attacker.kind === 'hero' ? this.weak() : 1);
    const longer = (g.ailmentDuration as number) ?? 1;
    const dps = (attacker.stats.ailmentDps?.[def.id] ?? def.dps ?? 0) * more;
    target.ailments.push({
      id: def.id,
      type: def.type,
      dps: def.dps ? { [def.type]: dps } : {},
      remaining: def.seconds * longer,
      tickIn: AILMENT_TICK * this.rng.float(0.5, 1),
    });
    if (def.kind === 'chill') this.chill(target, def);
  }

  /** CHILL slows and enough of it FREEZES, riding `Entity.slowed` — the one
   *  place a swing rate is multiplied, so there is no second slow. */
  private chill(target: Entity, def: AilmentDef): void {
    const stacks = stacksOf(target, 'chill');
    target.slowed = Math.min(0.75, (stacks * (def.slowPer ?? 0) * this.weak()) / 100);
    const live = target.effects.find((x) => x.id === SLOWED);
    if (live) live.remaining = Math.max(live.remaining, def.seconds);
    else target.effects.push({ id: SLOWED, remaining: def.seconds });

    if (def.freezeAt && stacks >= def.freezeAt) {
      target.stun = Math.max(target.stun ?? 0, def.freezeSeconds ?? 1);
      target.thawed = true; // the hit after a Freeze is a Critical, whatever your chance
      target.ailments = target.ailments.filter((a) => a.id !== 'chill');
      target.slowed = 0;
    }
  }

  /** SHOCK: a little lightning onto the neighbours every tick. Weak on one
   *  body and worth having against a room. */
  private shockArc(from: Entity, ailment: Ailment, scale: number): void {
    const def = AILMENT_BY_ID.shock;
    if (!def?.arcShare) return;
    const near = (from.kind === 'hero' ? this.state.monsters : [this.state.hero])
      .filter((m) => m !== from && !m.dead && dist(m, from) <= (def.arcRadius ?? 2))
      .slice(0, def.arcTargets ?? 3);
    const each = (ailment.dps[def.type] ?? 0) * scale * def.arcShare;
    if (each <= 0) return;
    for (const m of near) {
      m.life -= this.afterResistance(m, each, def.type);
      if (m.life <= 0) this.kill(m);
    }
    if (near.length > 0) {
      this.emit('arc', [{ x: from.x, y: from.y }, { x: near[0].x, y: near[0].y }], def.type, 0.14);
    }
  }

  /**
   * HOARFROST: a spike at everything you have Chilled, on its own clock. It
   * asks for a Chill it did not apply, so the passive is worth exactly what the
   * rest of the build already does to the room — and worth nothing on its own,
   * which is what keeps it off every build.
   */
  private stepFrost(dt: number): void {
    const volley = this.grants.frostVolley as { every: number; perLevel: number } | undefined;
    if (!volley) return;
    this.frostIn -= dt;
    if (this.frostIn > 0) return;
    this.frostIn = volley.every;

    const hero = this.state.hero;
    const damage = volley.perLevel * this.level * this.passiveScale.cold;
    for (const m of this.state.monsters) {
      if (m.dead || stacksOf(m, 'chill') === 0) continue;
      if (dist(hero, m) > PASSIVE_DAMAGE.frostRange) continue;
      m.life -= this.afterResistance(m, damage, 'cold');
      this.emit('shard', [{ x: hero.x, y: hero.y }, { x: m.x, y: m.y }], 'cold', 0.2);
      if (m.life <= 0) this.kill(m);
    }
  }

  /**
   * SUNDERING: a Burst around YOU, armed by landing a hit and then on a
   * cooldown. `perLevel` off character level, scaled only by increases to
   * Damage and to Physical, so the cooldown, the radius and the per-level
   * figure are the three numbers it is balanced on and there are no others.
   */
  private sunder(at: Entity): void {
    const burst = this.grants.burstOnHit as { every: number; perLevel: number } | undefined;
    if (!burst || this.sunderIn > 0 || at.dead) return;
    this.sunderIn = burst.every;

    const hero = this.state.hero;
    const damage = burst.perLevel * this.level * this.passiveScale.physical;
    const radius = PASSIVE_DAMAGE.sunderRadius;
    for (const m of this.state.monsters) {
      if (m.dead || dist(m, hero) > radius) continue;
      m.life -= this.afterResistance(m, damage, 'physical');
      if (m.life <= 0) this.kill(m);
    }
    this.emit('burst', [{ x: hero.x, y: hero.y }, { x: hero.x + radius, y: hero.y }], 'physical', 0.32);
  }

  /** What the body was CARRYING passes on: one stack of each kind it had, and
   *  never onward again — a spread that spreads is a run that never ends. */
  private spreadAilments(victim: Entity): void {
    const aura = this.grants.ailmentSpread as { radius: number; stacks: number } | undefined;
    if (!aura || victim.kind === 'hero' || victim.ailments.length === 0) return;

    const kinds = [...new Set(victim.ailments.map((a) => a.id))];
    for (const m of this.state.monsters) {
      if (m === victim || m.dead || dist(m, victim) > aura.radius) continue;
      for (const id of kinds) {
        const def = AILMENT_BY_ID[id];
        if (!def) continue;
        for (let n = 0; n < aura.stacks; n++) this.strike(this.state.hero, m, def);
      }
    }
    this.emit('burst', [{ x: victim.x, y: victim.y }, { x: victim.x + aura.radius, y: victim.y }], 'poison', 0.3);
  }

  /** CURSE pays when the body DIES: a share of what it could hold, to whatever
   *  is round it. */
  private burstCurse(victim: Entity): void {
    const def = AILMENT_BY_ID.curse;
    const stacks = stacksOf(victim, 'curse');
    if (!def?.burstShare || stacks === 0) return;
    const damage = victim.stats.maxLife * ((stacks * def.burstShare * this.weak()) / 100);
    if (damage <= 0) return;

    const radius = def.burstRadius ?? 2;
    for (const m of this.state.monsters) {
      if (m === victim || m.dead || dist(m, victim) > radius) continue;
      m.life -= this.afterResistance(m, damage, def.type);
      if (m.life <= 0) this.kill(m);
    }
    this.emit('burst', [{ x: victim.x, y: victim.y }, { x: victim.x + radius, y: victim.y }], def.type, 0.3);
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
      id: 'poison',
      tickIn: AILMENT_TICK * this.rng.float(0.5, 1),
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
    const ticked: Record<string, number> = {}; // per ailment, so a tick can be SEEN
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

      // Crit no longer reaches an ailment: it is not in one's tags and it no
      // longer rides the stack. Contagion is planted by the tick itself.
      const scale = slice;
      if (ailment.spread) contagious.push(ailment.spread);

      // Resisted per type, never armoured — which is what lets an ailment
      // threaten a build no hit can get through.
      for (const [type, dps] of Object.entries(ailment.dps)) {
        const dealt = this.afterResistance(e, dps * scale, type);
        total += dealt;
        ticked[ailment.id] = (ticked[ailment.id] ?? 0) + dealt;
        if (e.kind === 'hero') byType[type] = (byType[type] ?? 0) + dealt;
      }

      if (ailment.id === 'shock') this.shockArc(e, ailment, scale);
    }
    e.ailments = e.ailments.filter((a) => a.remaining > 0);

    // The pool eats a poison exactly as it eats a hit. Armour never could,
    // which is the whole reason letting mana do it is worth a trade.
    if (e.kind === 'hero') {
      const before = total;
      total = this.absorb(e, total, true);
      const kept = before > 0 ? total / before : 1;
      for (const [type, dealt] of Object.entries(byType)) {
        this.state.damageTaken[type] = (this.state.damageTaken[type] ?? 0) + dealt * kept;
      }
    }

    // Spread BEFORE the victim can die, so a killing tick still infects the
    // pack — the corpse is exactly when you want the disease to jump.
    for (const s of contagious) this.spreadAilment(e, s!);

    // ONE floater per ailment, never one per stack: twelve Burns are one
    // number climbing rather than twelve on top of each other.
    for (const [id, dealt] of Object.entries(ticked)) {
      if (dealt < 1) continue;
      this.state.floaters.push({
        x: e.x,
        y: e.y,
        text: String(Math.round(dealt)),
        age: 0,
        crit: false,
        on: e.kind,
        tick: id,
      });
    }

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
  private absorb(hero: Entity, damage: number, ailment = false): number {
    const share = ailment && this.grants.wardWhole ? 1 : shieldShare(this.grants);
    if (share <= 0 || hero.mana <= 0 || damage <= 0) return damage;
    const paid = Math.min(hero.mana, damage * share);
    hero.mana -= paid;
    this.state.absorbed += paid;
    return damage - paid;
  }

  /** Damage dealt, back as mana. The road that pays for spending the pool. */
  private leech(hero: Entity, damage: number): void {
    const share = (this.grants.manaLeech as number) ?? 0;
    if (share > 0 && damage > 0) {
      hero.mana = Math.min(hero.stats.maxMana, hero.mana + damage * share);
    }
    const life = (this.grants.lifeLeech as number) ?? 0;
    if (life > 0 && damage > 0) {
      hero.life = Math.min(hero.stats.maxLife, hero.life + damage * life);
    }
  }

  /** What every Ailment you apply is worth, as one multiplier. ONE seam, or a
   *  passive that softens a Burn would leave a Chill at full strength — and
   *  every ailment in the game is the hero's, so there is no second source. */
  private weak(): number {
    return (this.grants.ailmentWeak as number) ?? 1;
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
    if (victim.welled) s.welled++;
    const back = (this.grants.manaOnKill as number) ?? 0;
    if (back > 0) {
      const hero = s.hero;
      hero.mana = Math.min(hero.stats.maxMana, hero.mana + hero.stats.maxMana * back);
    }
    s.xpGained += this.xpPerKill * victim.bounty;
    s.loot.currency.gold =
      (s.loot.currency.gold ?? 0) + this.goldPerKill * victim.bounty;
    this.rollCurrency();
    this.rollGearDrop();
    this.rollRelicDrop();
    this.rollKeyDrop();
    this.burstCurse(victim);
    this.spreadAilments(victim);
    this.openHoard(victim);
    this.wellUp(victim);
    // Its own path, never `rollRelicDrop`: that loops every row, so a Bearer
    // going through it would hand over the OTHER relic as well.
    const borne = victim.bears ? RELIC_BY_ID[victim.bears] : undefined;
    if (borne) {
      s.loot.items.push(makeRelic(borne));
      s.bearers++;
    }
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
    if (this.rng.chance(chance)) this.dropGear();
  }

  /** ONE piece, unconditionally. A Hoard pays in these rather than in a second
   *  kind of loot: what it changes is HOW MANY, never what the band can hold. */
  private dropGear(): void {
    const drops = this.set.band;
    const hero = this.state.hero.stats;
    const rarity = this.set.rewards.rarity + hero.rarity + this.set.pays.rarity;

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

  /**
   * THE WELLING: a death brings something up out of the body, one rank higher.
   *
   * The rank LADDER is the whole termination proof and there is no counter: a
   * body comes up one rung above what died, and the top rung — `risen`, weight
   * 0, which nothing rolls — wells nothing. So one common death raises at most
   * a magic, a rare and a risen, and a descent can never grow past four times
   * what it spawned with. That beat a per-descent cap and a decaying chance,
   * both of which bound the chain with a number somebody has to tune.
   */
  private wellUp(victim: Entity): void {
    if (this.wellChance <= 0 || victim.kind !== 'monster') return;
    const at = MONSTER_RANKS.findIndex((r) => r.id === victim.rank);
    const rank = MONSTER_RANKS[at + 1];
    const def = MONSTER_BY_ID[victim.defId ?? ''];
    const ability = MONSTER_ABILITIES.find((a) => a.id === victim.abilityId);
    if (!rank || !def || !ability) return;
    if (!this.rng.chance(this.wellChance / 100)) return;

    const stats = this.rankedStats(def, ability, rank);
    const thrown = ability.skill ? SKILL_BY_ID[ability.skill] : undefined;
    const born: Entity = {
      id: this.nextId++,
      kind: 'monster',
      sprite: def.sprite,
      scale: def.scale * rank.scale,
      rank: rank.id,
      radius: def.radius * rank.scale,
      skillId: thrown ? ability.skill : null,
      defId: def.id,
      abilityId: ability.id,
      x: victim.x,
      y: victim.y,
      facing: victim.facing,
      action: 'idle',
      actionTimer: 0,
      deathAge: 0,
      ailments: [],
      bounty: rank.bounty,
      life: stats.maxLife,
      mana: 0,
      effects: [],
      stats,
      cooldown: 0,
      path: [],
      pathTimer: 0,
      targetId: null,
      walked: 0,
      // Awake already: it came up because you killed something, so pretending
      // it has not noticed you is a body standing still while you walk off.
      aggroed: true,
      hitFlash: 0,
      welled: true,
      dead: false,
    };
    this.state.monsters.push(born);
    this.byId.set(born.id, born);
    // Or the readout ticks down and then climbs, which reads as a bug.
    this.state.totalMonsters++;
  }

  /** The last guard is down, so the Hoard opens. Nothing is clicked and nothing
   *  is walked to — the guard WAS the lock, which is what lets a headless run
   *  open every one it can beat with no policy to ship. */
  private openHoard(victim: Entity): void {
    if (!victim.hoard) return;
    const box = this.state.hoards.find((h) => h.id === victim.hoard);
    if (!box || box.opened) return;
    if (this.state.monsters.some((m) => !m.dead && m.hoard === victim.hoard)) return;

    box.opened = true;
    for (let i = 0; i < HOARD.drops; i++) this.dropGear();
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
