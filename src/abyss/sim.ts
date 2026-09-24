/**
 * THE ABYSS IS PLAYED ON THE REAL SIM. A `RunSim` is built the ordinary way and
 * the level is TRANSPLANTED into it: the map, the packs and the Herald. Nothing
 * in `src/sim` knows the Abyss exists, so every rule a descent obeys — Arc
 * Lightning's chain, Blink's reach, a chanter's bolt, the wind-up of a blow —
 * is the rule here.
 *
 * The transplant reaches private members (`byId`, `nextId`, `finale`,
 * `rankedStats`) by name, and that is the whole of its coupling: `check()` in
 * `tools/abyss/check.mts` plays the level headless so a rename there fails.
 */
import { Rng } from '../rng';
import { ENCOUNTERS, MONSTER_ABILITIES, MONSTER_BY_ID, MONSTER_RANKS, SKILL_BY_ID } from '../data';
import { RunSim } from '../sim/run';
import type { Entity } from '../sim/run';
import { ladderCharacter } from '../sim/loadout';
import { equipSkill, skillProgress } from '../sim/character';
import { canAllocate, treeFor, treePointsFor } from '../skills-tree';
import type { Character } from '../sim/character';
import type { Vec2 } from '../sim/grid';
import { build, CIRCLE, ENTRY, HERALD, HERALD_WAKES, PACKS } from './level';
import type { Foe, PackSpot } from './level';

/** The ladder rung the hero is dressed at, and the depth the level is priced at. */
export const HERO_BAND = 5;
export const WHERE = { zone: 1, rung: 2 };

const DEFAULT_ABILITY: Record<Foe, string> = { imp: 'emberbite', chanter: 'fire_bolt', hornfiend: 'claws' };
const OFF_MAP: Vec2 = { x: -1000, y: -1000 };

export type Phase = 'descent' | 'herald' | 'open' | 'cleared' | 'died';

/** What the showcase's tree walk never takes: another damage type, or a keystone the Abyss draws nothing for. */
const BARRED = new Set(['al_transformer']);

/** An Aethermancer, Arc Lightning in the main slot and Blink in the mover's, its tree walked at random off the
 *  ladder's own draw — but never into a node that makes the bolt something the level was not built to show. */
export function aethermancer(name: string, seed = 1, band = HERO_BAND): Character {
  const hero = ladderCharacter(band, new Rng(seed), 'arc_lightning');
  hero.name = name;
  hero.trade = 'aethermancer';
  hero.tradeAllocated = [];
  equipSkill(hero, 'blink', 'movement');
  const progress = skillProgress(hero, 'arc_lightning');
  progress.allocated = [];
  progress.choices = {};
  const tree = treeFor('arc_lightning');
  const rng = new Rng(seed ^ 0xa4c);
  while (progress.allocated.length < treePointsFor('arc_lightning', hero.level)) {
    const open = tree.filter((n) => !BARRED.has(n.id) && !n.keystone && canAllocate('arc_lightning', n.id, progress.allocated));
    if (open.length === 0) break;
    const node = rng.pick(open)!;
    progress.allocated.push(node.id);
    if (node.choices?.length) progress.choices[node.id] = rng.pick(node.choices)!.id;
  }
  return hero;
}

interface Private {
  byId: Map<number, Entity>;
  nextId: number;
  finale: unknown;
  rankedStats(def: unknown, ability: unknown, rank: unknown): Entity['stats'];
}

export class Abyss {
  readonly sim: RunSim;
  phase: Phase = 'descent';
  herald: Entity | null = null;
  /** Seconds since the Herald rose, for whatever draws the eruption. */
  rose = -1;
  private readonly rng: Rng;
  private readonly driven: boolean;

  /** `driven` gates the way out behind the Herald; a headless check leaves it open. */
  constructor(hero: Character, seed: number, driven = true, where = WHERE) {
    this.rng = new Rng(seed ^ 0x5eed);
    this.driven = driven;
    this.sim = new RunSim([], hero, new Rng(seed), { where });
    const s = this.sim.state;
    const inner = this.inner();
    s.map = build();
    s.monsters.length = 0;
    s.hoards.length = 0;
    s.nodes.length = 0;
    s.folk.length = 0;
    inner.byId.clear();
    s.hero.x = ENTRY.x;
    s.hero.y = ENTRY.y;
    s.hero.facing = Math.PI / 2;
    PACKS.forEach((pack, i) => this.lay(pack, i));
    s.totalMonsters = s.monsters.length;
    if (driven) {
      s.map.exit = { ...OFF_MAP };
      this.sim.driving = true; // the player's from the first frame: the policy never walks him
    }
    else inner.finale = ENCOUNTERS[0]; // the Herald IS the finale; the sim's own never rises
  }

  private inner(): Private {
    return this.sim as unknown as Private;
  }

  /** One body, stat for stat what `spawn` would have made of this kind and rank. */
  private body(foe: Foe, rank: string, abilityId: string, at: Vec2, pack: number): Entity {
    const inner = this.inner();
    const def = MONSTER_BY_ID[foe];
    const ability = MONSTER_ABILITIES.find((a) => a.id === abilityId) ?? MONSTER_ABILITIES[0];
    const ranked = MONSTER_RANKS.find((r) => r.id === rank) ?? MONSTER_RANKS[0];
    const stats = inner.rankedStats(def, ability, ranked);
    const thrown = ability.skill ? SKILL_BY_ID[ability.skill] : undefined;
    const radius = def.radius * ranked.scale;
    const grid = this.sim.state.map.grid;
    let spot = at;
    for (let tries = 0; tries < 24 && !grid.fits(spot.x, spot.y, radius); tries++) {
      spot = { x: at.x + this.rng.float(-1.5, 1.5), y: at.y + this.rng.float(-1.5, 1.5) };
    }
    return {
      id: inner.nextId++,
      kind: 'monster',
      sprite: def.sprite,
      scale: def.scale * ranked.scale,
      rank: ranked.id,
      radius,
      skillId: thrown ? ability.skill : null,
      defId: def.id,
      abilityId: ability.id,
      pack,
      x: spot.x,
      y: spot.y,
      facing: this.rng.float(0, Math.PI * 2),
      action: 'idle',
      actionTimer: 0,
      deathAge: 0,
      ailments: [],
      bounty: ranked.bounty,
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
    };
  }

  private enlist(body: Entity): Entity {
    this.sim.state.monsters.push(body);
    this.inner().byId.set(body.id, body);
    return body;
  }

  private lay(pack: PackSpot, index: number): void {
    const def = MONSTER_BY_ID[pack.foe];
    for (let i = 0; i < pack.count; i++) {
      const a = (i / Math.max(1, pack.count)) * Math.PI * 2 + this.rng.float(-0.4, 0.4);
      const r = pack.count === 1 ? 0 : pack.spread * this.rng.float(0.5, 1);
      const at = { x: pack.at.x + Math.cos(a) * r, y: pack.at.y + Math.sin(a) * r };
      const body = this.enlist(this.body(pack.foe, pack.rank ?? 'common', pack.ability ?? DEFAULT_ABILITY[pack.foe], at, index));
      if (def.aura && i === 0) body.aura = def.aura; // one carrier a pack, as a descent has it
    }
  }

  /** What has to be down before the Herald will come: everything the level laid. */
  private quiet(): boolean {
    return this.sim.state.monsters.every((m) => m.dead);
  }

  private rise(): void {
    const s = this.sim.state;
    const inner = this.inner();
    inner.finale = ENCOUNTERS[0];
    const pack = PACKS.length;
    const boss = this.body(HERALD.boss.foe, HERALD.boss.rank, DEFAULT_ABILITY[HERALD.boss.foe], CIRCLE, pack);
    boss.stats = { ...boss.stats, maxLife: boss.stats.maxLife * HERALD.boss.life };
    boss.life = boss.stats.maxLife;
    boss.aggroed = true;
    boss.facing = Math.atan2(s.hero.y - CIRCLE.y, s.hero.x - CIRCLE.x);
    this.herald = this.enlist(boss);
    for (let i = 0; i < HERALD.adds.count; i++) {
      const a = (i / HERALD.adds.count) * Math.PI * 2;
      const add = this.enlist(this.body(HERALD.adds.foe, 'common', DEFAULT_ABILITY[HERALD.adds.foe],
        { x: CIRCLE.x + Math.cos(a) * 2.4, y: CIRCLE.y + Math.sin(a) * 2.4 }, pack));
      add.aggroed = true;
    }
    s.totalMonsters = s.monsters.length;
    this.phase = 'herald';
    this.rose = 0;
  }

  step(dt: number): void {
    const s = this.sim.state;
    this.sim.step(dt);
    if (this.rose >= 0) this.rose += dt;
    if (s.status === 'died') this.phase = 'died';
    else if (s.status === 'cleared') this.phase = 'cleared';
    else if (this.phase === 'descent' && this.quiet() &&
      Math.hypot(s.hero.x - CIRCLE.x, s.hero.y - CIRCLE.y) <= HERALD_WAKES) this.rise();
    else if (this.phase === 'herald' && this.quiet()) {
      this.phase = 'open';
      s.map.exit = { ...CIRCLE };
    }
  }

  /** Where the way out is drawn, whether or not the sim can reach it yet. */
  get circle(): Vec2 {
    return CIRCLE;
  }

  get open(): boolean {
    return this.phase === 'open' || this.phase === 'cleared' || !this.driven;
  }
}
