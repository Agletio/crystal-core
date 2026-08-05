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
import { generateMap, dist } from './grid';
import type { GameMap, Vec2 } from './grid';
import { findPath } from './pathfind';
import { heroStats, monsterStats, mapDensity } from './stats';
import type { CombatStats } from './stats';
import type { Item } from '../types';

/** Sim step. 30/s is plenty for movement this slow and keeps replays cheap. */
export const TICK = 1 / 30;

/** Monsters beyond this range of the hero don't think at all. */
const ACTIVE_RANGE = 16;

export type EntityKind = 'hero' | 'monster';

export interface Entity {
  id: number;
  kind: EntityKind;
  x: number;
  y: number;
  life: number;
  stats: CombatStats;
  cooldown: number;
  path: Vec2[];
  pathTimer: number;
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

export type RunEvent =
  | { kind: 'kill'; total: number }
  | { kind: 'hurt'; life: number; maxLife: number }
  | { kind: 'cleared'; seconds: number; killed: number }
  | { kind: 'died'; seconds: number; killed: number };

export type RunStatus = 'running' | 'cleared' | 'died';

export interface RunState {
  map: GameMap;
  hero: Entity;
  monsters: Entity[];
  floaters: Floater[];
  elapsed: number;
  status: RunStatus;
  killed: number;
  totalMonsters: number;
}

const FLOATER_LIFE = 1.1;

export class RunSim {
  readonly state: RunState;
  private readonly rng: Rng;
  private events: RunEvent[] = [];
  private nextId = 1;

  constructor(crystal: Item, equipped: Item[], rng: Rng) {
    this.rng = rng;

    const map = generateMap(crystal, rng);
    const stats = heroStats(equipped);

    const hero: Entity = {
      id: 0,
      kind: 'hero',
      x: map.entrance.x,
      y: map.entrance.y,
      life: stats.maxLife,
      stats,
      cooldown: 0,
      path: [],
      pathTimer: 0,
      aggroed: false,
      hitFlash: 0,
      dead: false,
    };

    const monsters = this.spawn(crystal, map);

    this.state = {
      map,
      hero,
      monsters,
      floaters: [],
      elapsed: 0,
      status: 'running',
      killed: 0,
      totalMonsters: monsters.length,
    };
  }

  /** Packs land in rooms other than the entrance, so you always get a moment
   *  to look at the map before anything reaches you. */
  private spawn(crystal: Item, map: GameMap): Entity[] {
    const tier = (crystal.meta.tier as number) ?? 1;
    const stats = monsterStats(crystal, tier);
    const { packCount, packSize } = mapDensity(crystal);

    const rooms = map.rooms.length > 1 ? map.rooms.slice(1) : map.rooms;
    const monsters: Entity[] = [];

    for (let p = 0; p < packCount; p++) {
      const room = this.rng.pick(rooms) ?? rooms[0];
      for (let i = 0; i < packSize; i++) {
        monsters.push({
          id: this.nextId++,
          kind: 'monster',
          x: this.rng.float(room.x, room.x + room.w - 1),
          y: this.rng.float(room.y, room.y + room.h - 1),
          life: stats.maxLife,
          stats,
          cooldown: this.rng.float(0, 1),
          path: [],
          pathTimer: 0,
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

    this.stepHero(dt);
    if (s.status !== 'running') return;

    for (const m of s.monsters) {
      if (m.dead) continue;
      if (m.hitFlash > 0) m.hitFlash -= dt;
      this.stepMonster(m, dt);
      if (s.status !== 'running') return;
    }
  }

  private stepHero(dt: number): void {
    const s = this.state;
    const hero = s.hero;

    if (hero.cooldown > 0) hero.cooldown -= dt;
    if (hero.hitFlash > 0) hero.hitFlash -= dt;

    if (hero.life < hero.stats.maxLife) {
      hero.life = Math.min(hero.stats.maxLife, hero.life + hero.stats.lifeRegen * dt);
    }

    const target = this.nearestMonster(hero, hero.stats.aggroRange);

    if (target) {
      const d = dist(hero, target);
      if (d <= hero.stats.attackRange) {
        hero.path = [];
        if (hero.cooldown <= 0) this.attack(hero, target);
      } else {
        this.advance(hero, target, dt);
      }
      return;
    }

    // Nothing to fight — head for the exit. Arrival is compared in whole
    // tiles, the same units the pathfinder works in, so it can't be defeated
    // by a fraction of a tile.
    const arrived =
      Math.round(hero.x) === Math.round(s.map.exit.x) &&
      Math.round(hero.y) === Math.round(s.map.exit.y);
    if (arrived) {
      s.status = 'cleared';
      this.events.push({
        kind: 'cleared',
        seconds: s.elapsed,
        killed: s.killed,
      });
      return;
    }
    this.advance(hero, s.map.exit, dt);
  }

  private stepMonster(m: Entity, dt: number): void {
    const hero = this.state.hero;
    if (m.cooldown > 0) m.cooldown -= dt;

    const d = dist(m, hero);
    if (d > ACTIVE_RANGE) return;

    if (!m.aggroed && d <= m.stats.aggroRange) m.aggroed = true;
    if (!m.aggroed) return;

    if (d <= m.stats.attackRange) {
      m.path = [];
      if (m.cooldown <= 0) this.attack(m, hero);
      return;
    }
    this.advance(m, hero, dt);
  }

  private nearestMonster(from: Entity, range: number): Entity | null {
    let best: Entity | null = null;
    let bestDist = range;
    for (const m of this.state.monsters) {
      if (m.dead) continue;
      const d = dist(from, m);
      if (d <= bestDist) {
        bestDist = d;
        best = m;
      }
    }
    return best;
  }

  /** Walk along a cached path, repathing on a stagger so a whole pack never
   *  recomputes on the same tick. */
  private advance(e: Entity, goal: Vec2, dt: number): void {
    e.pathTimer -= dt;
    if (e.path.length === 0 || e.pathTimer <= 0) {
      e.path = findPath(this.state.map.grid, e, goal);
      e.pathTimer = 0.4 + this.rng.float(0, 0.25);
    }

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
  }

  private attack(attacker: Entity, defender: Entity): void {
    const s = this.state;

    const crit =
      attacker.stats.critChance > 0 && this.rng.chance(attacker.stats.critChance / 100);

    let dmg = attacker.stats.damage * this.rng.float(0.9, 1.1);
    if (crit) dmg *= 2;

    // Armour mitigates on a curve against the size of the hit, so it's strong
    // against chip damage and weak against big hits. Never reaches immunity.
    const armour = defender.stats.armour;
    if (armour > 0) dmg *= 1 - armour / (armour + 12 * dmg);
    dmg = Math.max(1, dmg);

    defender.life -= dmg;
    defender.hitFlash = 0.18;
    attacker.cooldown = 1 / attacker.stats.attacksPerSecond;

    s.floaters.push({
      x: defender.x,
      y: defender.y,
      text: String(Math.round(dmg)),
      age: 0,
      crit,
      on: defender.kind,
    });

    if (defender.kind === 'hero') {
      this.events.push({ kind: 'hurt', life: Math.max(0, defender.life), maxLife: defender.stats.maxLife });
    }

    if (defender.life <= 0) this.kill(defender);
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
    this.events.push({ kind: 'kill', total: s.killed });
  }
}

/** Convenience for the headless callers (demo, smoke): run to completion. */
export function runToCompletion(sim: RunSim, maxSeconds = 600): RunState {
  let guard = Math.ceil(maxSeconds / TICK);
  while (sim.state.status === 'running' && guard-- > 0) sim.step(TICK);
  return sim.state;
}
