/**
 * Fireball's web: a common trunk, and six branches you have to unlock.
 *
 * The trunk is everything that helps whatever you are building — fire damage,
 * cast speed, crit, reach. It is where you start, and it is the only way to get
 * from one branch to another.
 *
 * A branch hangs off ONE node, and that node is what makes the rest of the
 * branch mean anything: Area of Effect does nothing to a Fireball that does not
 * burst, so it lives behind Detonation and cannot be bought without it. Burn
 * duration lives behind Kindling. That is the whole point of the shape — you
 * cannot spend a point on something that will not do anything.
 *
 * Everything below is data. The geometry is generated so a branch cannot be
 * accidentally wired to the trunk twice, and the demo holds the tree to the
 * rules rather than to any particular set of coordinates.
 */
import { CENTRE, stat } from './node';
import type { NodeChoice, NodeStat, SkillNodeDef } from './node';

// --- shape -----------------------------------------------------------------

const TRUNK = [
  { count: 6, r: 1.35 },
  { count: 12, r: 2.7 },
];
/** Ways off the centre. Fewer than the ring holds, so ring one is a walk too. */
const TRUNK_WAYS_IN = 3;
/** Trunk slots a branch hangs off, and the ones a trunk spur grows from. */
const ANCHORS = [0, 2, 4, 6, 8, 10];
const SPUR_SLOTS = [1, 3, 5, 7, 9, 11];
const SPUR_R = [3.5, 4.4];

const ENABLER_R = 3.8;
/** How far out each step along a twig goes. */
const TWIG_STEP = 1.05;
/** How wide a branch spreads, as a fraction of the circle. */
const BRANCH_ARC = 0.125;

const TAU = Math.PI * 2;

/** Stable 0..1 wobble. Perfect rows read as a diagram rather than a web. */
const jitter = (a: number, b: number, salt: number): number => {
  const h = Math.sin(a * 127.1 + b * 311.7 + salt * 74.7) * 43758.5453;
  return h - Math.floor(h);
};

// --- content ---------------------------------------------------------------

interface Minor {
  text: string;
  stats?: NodeStat[];
  grants?: Record<string, unknown>;
}

interface Notable {
  id: string;
  name: string;
  description: string;
  gate: number;
  stats?: NodeStat[];
  grants?: Record<string, unknown>;
  choices?: NodeChoice[];
}

/**
 * A run of minors ending in a notable, and nothing past it. The notable is the
 * point of the twig, so it is a DEAD END: getting a second one in a branch
 * means walking back and paying for another run of minors.
 */
interface Twig {
  minors: number;
  notable: Notable;
  /** Sprout off another twig this far along it, rather than off the enabler. */
  forkFrom?: { twig: number; at: number };
}

interface Branch {
  id: string;
  theme: string;
  enabler: Notable;
  twigs: Twig[];
  minors: Minor[];
}

const GATE = { enabler: 3, mid: 8, deep: 14, tip: 20 };

/**
 * Lines that help every build. The trunk is made of these, and so is the filler
 * in branches that have no numbers of their own to give.
 */
const COMMON: Minor[] = [
  { text: '+5% increased Fire Damage', stats: [stat('damage', 'inc', 5, ['fire'])] },
  { text: '+4% increased Damage', stats: [stat('damage', 'inc', 4)] },
  { text: '+3% increased Cast Speed', stats: [stat('castSpeed', 'inc', 3)] },
  { text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
  { text: '+8% Critical Damage', stats: [stat('critMultiplier', 'flat', 8)] },
  { text: '+4% increased Attack Range', stats: [stat('attackRange', 'inc', 4)] },
];

const BRANCHES: Branch[] = [
  {
    id: 'ignition',
    theme: 'Smoulder',
    enabler: {
      id: 'fb_kindling',
      name: 'Kindling',
      description:
        'Fireball can no longer critically strike. A cast that would have crit ' +
        'instead sets the target alight for 260% of the hit over 4s.',
      gate: GATE.enabler,
      grants: { critBurn: { multiplier: 2.6, seconds: 4 } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'fb_cauterise',
          name: 'Cauterise',
          description: 'Burns you apply deal 35% more damage over a 25% shorter time.',
          gate: GATE.mid,
          grants: { burnMultiplier: 1.35, burnDuration: 0.75 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'fb_slowburn',
          name: 'Slow Burn',
          description: 'Burns you apply last 60% longer.',
          gate: GATE.deep,
          grants: { burnDuration: 1.6 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'fb_wildfire',
          name: 'Wildfire',
          description:
            'A burn that ticks critically sets everything within 2 tiles alight as well.',
          gate: GATE.tip,
          grants: { burnSpread: 2 },
        },
      },
    ],
    minors: [
      { text: '+6% increased Burning Damage', grants: { burnMultiplier: 1.06 } },
      { text: '+5% increased Burn Duration', grants: { burnDuration: 1.05 } },
      COMMON[0],
      { text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
    ],
  },
  {
    id: 'detonation',
    theme: 'Blastwork',
    enabler: {
      id: 'fb_detonation',
      name: 'Detonation',
      description:
        'Fireball bursts where it lands, dealing 55% damage to everything within ' +
        '1.8 tiles. Fireball gains the Area tag.',
      gate: GATE.enabler,
      grants: { explode: { radius: 1.8, multiplier: 0.55 }, addTags: ['area'] },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'fb_concussive',
          name: 'Concussive Blast',
          description: 'The burst covers 45% more ground.',
          gate: GATE.mid,
          grants: { explodeRadius: 1.45 },
        },
      },
      {
        minors: 3,
        forkFrom: { twig: 0, at: 1 },
        notable: {
          id: 'fb_fuelair',
          name: 'Fuel-Air Charge',
          description: 'The burst deals full damage rather than a fraction of it.',
          gate: GATE.deep,
          grants: { explodeMultiplierAdd: 0.45 },
        },
      },
      {
        minors: 3,
        forkFrom: { twig: 1, at: 1 },
        notable: {
          id: 'fb_chainreaction',
          name: 'Chain Reaction',
          description:
            'An enemy killed by Fireball bursts, dealing 60% damage within 2.2 tiles.',
          gate: GATE.tip,
          grants: { explodeOnKill: { radius: 2.2, multiplier: 0.6 } },
        },
      },
    ],
    minors: [
      { text: '+5% increased Area of Effect', stats: [stat('areaOfEffect', 'inc', 5)] },
      { text: '+4% larger burst', grants: { explodeRadius: 1.04 } },
      COMMON[0],
      { text: '+6% increased Area of Effect', stats: [stat('areaOfEffect', 'inc', 6)] },
    ],
  },
  {
    id: 'volley',
    theme: 'Salvo',
    enabler: {
      id: 'fb_splitcast',
      name: 'Split Cast',
      description:
        'Fireball strikes one additional enemy near the target, for 70% damage.',
      gate: GATE.enabler,
      grants: { extraTargets: 1 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'fb_focused',
          name: 'Focused Volley',
          description: 'Additional targets take full damage instead of 70%.',
          gate: GATE.mid,
          grants: { extraTargetDamage: 1 },
        },
      },
      {
        minors: 3,
        notable: {
          id: 'fb_volley',
          name: 'Volley',
          description: 'Fireball strikes another additional enemy, for 70% damage.',
          gate: GATE.deep,
          grants: { extraTargets: 1 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'fb_barrage',
          name: 'Barrage',
          description: 'Fireball strikes two more enemies near the target, for 70% damage.',
          gate: GATE.tip,
          grants: { extraTargets: 2 },
        },
      },
    ],
    minors: [COMMON[2], COMMON[0], COMMON[1], COMMON[2]],
  },
  {
    id: 'penetration',
    theme: 'Bore',
    enabler: {
      id: 'fb_piercing',
      name: 'Piercing Flame',
      description:
        'Fireball passes through one enemy for 70% damage, carrying on to ' +
        'whatever is behind it.',
      gate: GATE.enabler,
      grants: { pierce: 1 },
    },
    twigs: [
      {
        minors: 5,
        notable: {
          id: 'fb_momentum',
          name: 'Momentum',
          description: 'Enemies pierced take full damage instead of 70%.',
          gate: GATE.mid,
          grants: { pierceDamage: 1 },
        },
      },
      {
        minors: 5,
        notable: {
          id: 'fb_overpen',
          name: 'Overpenetration',
          description: 'Fireball passes through one more enemy, also for 70%.',
          gate: GATE.deep,
          grants: { pierce: 1 },
        },
      },
    ],
    minors: [COMMON[5], COMMON[0], COMMON[1], COMMON[5]],
  },
  {
    id: 'arc',
    theme: 'Leapfire',
    enabler: {
      id: 'fb_arcing',
      name: 'Arcing Flame',
      description:
        'Fireball leaps from the enemy it hits to one more within 4.5 tiles, ' +
        'for 70% damage.',
      gate: GATE.enabler,
      grants: { chains: 1 },
    },
    twigs: [
      {
        minors: 4,
        notable: {
          id: 'fb_rebound',
          name: 'Rebound',
          description: 'Leaps deal full damage instead of 70%.',
          gate: GATE.mid,
          grants: { chainDamage: 1 },
        },
      },
      {
        minors: 5,
        forkFrom: { twig: 0, at: 2 },
        notable: {
          id: 'fb_leaping',
          name: 'Leaping Flame',
          description: 'Fireball leaps one more time, also for 70%.',
          gate: GATE.deep,
          grants: { chains: 1 },
        },
      },
    ],
    minors: [COMMON[0], COMMON[2], COMMON[1], COMMON[0]],
  },
  {
    id: 'cruelty',
    theme: 'Malice',
    enabler: {
      id: 'fb_immolate',
      name: 'Immolate',
      description: 'Fireball deals 25% more damage to enemies that are already burning.',
      gate: GATE.enabler,
      grants: { moreVsBurning: 0.25 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'fb_closequarters',
          name: 'Close Quarters',
          description: 'Fireball deals 30% more damage to enemies within 2.5 tiles of you.',
          gate: GATE.mid,
          grants: { moreClose: { within: 2.5, more: 0.3 } },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'fb_executioner',
          name: 'Executioner',
          description: 'Fireball deals 35% more damage to enemies below a third of their life.',
          gate: GATE.deep,
          grants: { moreVsLow: { below: 0.33, more: 0.35 } },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'fb_overload',
          name: 'Overload',
          description: 'Every fifth cast of Fireball deals triple damage.',
          gate: GATE.tip,
          grants: { everyNth: { n: 5, multiplier: 3 } },
        },
      },
    ],
    minors: [COMMON[3], COMMON[4], COMMON[1], COMMON[3]],
  },
];

/**
 * The trunk's own, each at the end of its own short spur. Every one does
 * something for any build, which is what earns it a place out here where
 * nothing has been unlocked — they are what a branch has to beat.
 */
const TRUNK_NOTABLES: Notable[] = [
  {
    id: 'fb_longfuse',
    name: 'Long Fuse',
    description: 'Fireball deals 30% more damage to enemies more than 5 tiles away.',
    gate: 5,
    grants: { moreFar: { beyond: 5, more: 0.3 } },
  },
  {
    id: 'fb_transmutation',
    name: 'Transmutation',
    description:
      'Fireball stops dealing Fire. Pick what it deals instead — the Fire ' +
      'modifiers in this tree change with it, the ones on your gear do not.',
    gate: 11,
    choices: [
      {
        id: 'cold',
        name: 'Frostfire',
        description: 'Fireball deals Cold damage.',
        grants: { convertTree: 'cold' },
      },
      {
        id: 'lightning',
        name: 'Stormfire',
        description: 'Fireball deals Lightning damage.',
        grants: { convertTree: 'lightning' },
      },
    ],
  },
  {
    id: 'fb_reserves',
    name: 'Deep Reserves',
    description: 'Fireball deals 45% more damage and is cast 20% slower.',
    gate: 17,
    stats: [stat('damage', 'more', 45), stat('castSpeed', 'inc', -20)],
  },
  {
    id: 'fb_opening',
    name: 'Opening Salvo',
    description: 'Fireball deals 35% more damage to enemies above four fifths of their life.',
    gate: 7,
    grants: { moreVsFull: { above: 0.8, more: 0.35 } },
  },
  {
    id: 'fb_focus',
    name: 'Sharpened Focus',
    description: 'Fireball critically strikes far more often, and far harder.',
    gate: 13,
    stats: [stat('critChance', 'flat', 11), stat('critMultiplier', 'flat', 45)],
  },
  {
    id: 'fb_emberstorm',
    name: 'Ember Storm',
    description: 'Fireball is cast 25% faster.',
    gate: 21,
    stats: [stat('castSpeed', 'inc', 25)],
  },
];

/**
 * Ways across between neighbouring spurs, as [spur, step] pairs.
 *
 * A cross link joins a node to one exactly one step further out, so reaching
 * the far one costs the same either way: your own spur, or the neighbour's plus
 * the step across. They are what makes the middle worth reading — two routes to
 * the same node, at the same price, picking up different things on the way.
 *
 * Never into a branch. A branch is only worth anything behind its own node, so
 * a way in that skipped it would put dead nodes back.
 */
const CROSSINGS: Array<[[number, number], [number, number]]> = [
  [[0, 0], [1, 1]],
  [[2, 0], [3, 1]],
  [[4, 0], [5, 1]],
  [[1, 0], [2, 1]],
  [[3, 0], [4, 1]],
  [[5, 0], [0, 1]],
];

/**
 * What a stat or grant needs before it does anything, by the node that provides
 * it. Anything listed here may only appear inside that node's branch, which is
 * the rule that stops a point being spent on nothing. Checked in the demo.
 */
export const NEEDS: Record<string, string> = {
  areaOfEffect: 'fb_detonation',
  explodeRadius: 'fb_detonation',
  explodeMultiplierAdd: 'fb_detonation',
  explodeOnKill: 'fb_detonation',
  burnMultiplier: 'fb_kindling',
  burnDuration: 'fb_kindling',
  burnSpread: 'fb_kindling',
  extraTargetDamage: 'fb_splitcast',
  pierceDamage: 'fb_piercing',
  chainDamage: 'fb_arcing',
};

// --- assembly --------------------------------------------------------------

const trunkId = (ring: number, i: number) => `fb_t${ring}s${i}`;
const branchId = (b: string, row: number, i: number) => `fb_${b}_${row}_${i}`;

function build(): SkillNodeDef[] {
  const nodes: SkillNodeDef[] = [];
  const links = new Map<string, string[]>();
  const join = (a: string, b: string) => {
    if (!links.has(a)) links.set(a, []);
    links.get(a)!.push(b);
  };

  const trunkAt = (ring: number, i: number) => trunkId(ring, i);
  const spurId = (spur: number, step: number) =>
    step === SPUR_R.length - 1
      ? TRUNK_NOTABLES[spur].id
      : `fb_spur${spur}_${step}`;

  // --- the trunk ----------------------------------------------------------
  for (let ring = 1; ring <= TRUNK.length; ring++) {
    const { count } = TRUNK[ring - 1];
    for (let i = 0; i < count; i++) join(trunkAt(ring, i), trunkAt(ring, (i + 1) % count));
  }
  for (let w = 0; w < TRUNK_WAYS_IN; w++) {
    join(trunkAt(1, Math.round((w / TRUNK_WAYS_IN) * TRUNK[0].count)), CENTRE);
  }
  // Turned half a gap off the ways in, so leaving ring one is a walk as well.
  for (let s = 0; s < TRUNK[0].count; s += 2) {
    const outer = Math.round(((s + 1) / TRUNK[0].count) * TRUNK[1].count);
    join(trunkAt(2, outer % TRUNK[1].count), trunkAt(1, s));
  }

  for (let ring = 1; ring <= TRUNK.length; ring++) {
    const { count, r } = TRUNK[ring - 1];
    for (let i = 0; i < count; i++) {
      const angle = ((i + (jitter(ring, i, 1) - 0.5) * 0.3) / count) * TAU - Math.PI / 2;
      const reach = r + (jitter(ring, i, 2) - 0.5) * 0.3;
      const common = COMMON[(ring * 3 + i) % COMMON.length];
      nodes.push({
        id: trunkAt(ring, i),
        name: 'Ember',
        description: common.text,
        kind: 'minor',
        x: Math.cos(angle) * reach,
        y: Math.sin(angle) * reach,
        links: links.get(trunkAt(ring, i)) ?? [],
        stats: common.stats ?? [],
      });
    }
  }

  // Six short spurs off the trunk, each ending in a notable worth having
  // whatever you go on to build.
  SPUR_SLOTS.forEach((slot, spur) => {
    const base = (slot / TRUNK[1].count) * TAU - Math.PI / 2;
    for (let step = 0; step < SPUR_R.length; step++) {
      const last = step === SPUR_R.length - 1;
      const id = spurId(spur, step);
      const notable = last ? TRUNK_NOTABLES[spur] : null;
      const common = COMMON[(spur * 2 + step) % COMMON.length];
      const angle = base + (jitter(spur, step, 5) - 0.5) * 0.12;
      const reach = SPUR_R[step] + (jitter(spur, step, 6) - 0.5) * 0.2;

      join(id, step === 0 ? trunkAt(2, slot) : spurId(spur, step - 1));
      nodes.push({
        id,
        name: notable?.name ?? 'Ember',
        description: notable?.description ?? common.text,
        kind: notable ? 'notable' : 'minor',
        x: Math.cos(angle) * reach,
        y: Math.sin(angle) * reach,
        links: links.get(id) ?? [],
        ...(notable ? { gate: notable.gate } : {}),
        ...(notable
          ? {
              ...(notable.stats ? { stats: notable.stats } : {}),
              ...(notable.grants ? { grants: notable.grants } : {}),
              ...(notable.choices ? { choices: notable.choices } : {}),
            }
          : { stats: common.stats ?? [] }),
      });
    }
  });

  for (const [[fromSpur, fromStep], [toSpur, toStep]] of CROSSINGS) {
    join(spurId(fromSpur, fromStep), spurId(toSpur, toStep));
  }

  // --- the branches -------------------------------------------------------
  //
  // Every twig is a CHAIN: each node hangs off exactly the one before it, and
  // the notable at the tip has nothing past it. No sideways links, so there is
  // no way to cut across to a notable — you buy the run of minors that leads to
  // it, or you do not get it.
  BRANCHES.forEach((branch, b) => {
    const base = (ANCHORS[b] / TRUNK[1].count) * TAU - Math.PI / 2;
    join(branch.enabler.id, trunkAt(2, ANCHORS[b]));
    nodes.push({
      id: branch.enabler.id,
      name: branch.enabler.name,
      description: branch.enabler.description,
      kind: 'notable',
      x: Math.cos(base) * ENABLER_R,
      y: Math.sin(base) * ENABLER_R,
      links: links.get(branch.enabler.id) ?? [],
      gate: branch.enabler.gate,
      ...(branch.enabler.grants ? { grants: branch.enabler.grants } : {}),
    });

    // Where each node of each twig ends up, so a fork can start from one.
    const placed: Array<Array<{ id: string; depth: number; angle: number }>> = [];
    let minorAt = 0;

    branch.twigs.forEach((twig, t) => {
      // Never off a twig's last node: that one is a notable, and a notable
      // with something growing out of it is no longer a dead end.
      const parent = twig.forkFrom
        ? placed[twig.forkFrom.twig][
            Math.min(twig.forkFrom.at, branch.twigs[twig.forkFrom.twig].minors - 1)
          ]
        : { id: branch.enabler.id, depth: 0, angle: base };
      // Each twig aims somewhere of its own inside the wedge, and drifts there
      // as it goes out, so a branch opens like a hand rather than a fan.
      const aim =
        base + (((t + 0.5) / branch.twigs.length - 0.5) * BRANCH_ARC + 0.012 * t) * TAU;

      const chain: Array<{ id: string; depth: number; angle: number }> = [];
      const length = twig.minors + 1;
      for (let step = 0; step < length; step++) {
        const last = step === length - 1;
        const id = last ? twig.notable.id : branchId(branch.id, t, step);
        const depth = parent.depth + step + 1;
        const along = (step + 1) / length;
        const angle =
          parent.angle +
          (aim - parent.angle) * along +
          (jitter(b, t * 9 + step, 3) - 0.5) * 0.045;
        const reach = ENABLER_R + depth * TWIG_STEP + (jitter(b, t * 9 + step, 4) - 0.5) * 0.35;

        join(id, step === 0 ? parent.id : chain[step - 1].id);
        const minor = branch.minors[minorAt++ % branch.minors.length];

        nodes.push({
          id,
          name: last ? twig.notable.name : branch.theme,
          description: last ? twig.notable.description : minor.text,
          kind: last ? 'notable' : 'minor',
          x: Math.cos(angle) * reach,
          y: Math.sin(angle) * reach,
          links: links.get(id) ?? [],
          ...(last ? { gate: twig.notable.gate } : {}),
          ...(last
            ? {
                ...(twig.notable.stats ? { stats: twig.notable.stats } : {}),
                ...(twig.notable.grants ? { grants: twig.notable.grants } : {}),
              }
            : {
                ...(minor.stats ? { stats: minor.stats } : {}),
                ...(minor.grants ? { grants: minor.grants } : {}),
              }),
        });
        chain.push({ id, depth, angle });
      }
      placed.push(chain);
    });
  });

  // Links are collected while the shape is worked out, so every node picks up
  // whatever named it after it was pushed.
  return spread(nodes.map((n) => ({ ...n, links: links.get(n.id) ?? [] })));
}

/**
 * Push apart anything that ended up on top of something else.
 *
 * Twigs aim where they like and two of them can converge; the wobble that stops
 * the web looking like a diagram can close the last of the gap. A few passes of
 * shoving overlapping pairs apart costs nothing and means no node is ever drawn
 * under another one.
 */
function spread(nodes: SkillNodeDef[]): SkillNodeDef[] {
  const APART = 0.92;
  for (let pass = 0; pass < 24; pass++) {
    let moved = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d >= APART) continue;
        moved = true;
        // Straight away from each other, half the shortfall each, and never
        // toward the middle — the rings have to stay rings.
        const push = (APART - Math.max(d, 1e-3)) / 2;
        const ux = d < 1e-3 ? 1 : dx / d;
        const uy = d < 1e-3 ? 0 : dy / d;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
      }
    }
    if (!moved) break;
  }
  return nodes;
}

export const FIREBALL_TREE: SkillNodeDef[] = build();

/** Which branch each node belongs to; trunk nodes are absent. */
export const FIREBALL_BRANCH: Record<string, string> = Object.fromEntries(
  BRANCHES.flatMap((branch) => [
    [branch.enabler.id, branch.id] as [string, string],
    ...branch.twigs.flatMap((twig, t) => [
      [twig.notable.id, branch.id] as [string, string],
      ...Array.from(
        { length: twig.minors },
        (_, step) => [branchId(branch.id, t, step), branch.id] as [string, string]
      ),
    ]),
  ])
);

/**
 * The ways across, as node pairs. Exported so the demo can prove they are free:
 * removing every one of them must leave every node exactly as far from the
 * middle as it was.
 */
export const FIREBALL_CROSSINGS: Array<[string, string]> = CROSSINGS.map(
  ([[fs, ft], [ts, tt]]) =>
    [
      ft === SPUR_R.length - 1 ? TRUNK_NOTABLES[fs].id : `fb_spur${fs}_${ft}`,
      tt === SPUR_R.length - 1 ? TRUNK_NOTABLES[ts].id : `fb_spur${ts}_${tt}`,
    ] as [string, string]
);

/** The node that opens each branch. */
export const FIREBALL_ENABLERS: Record<string, string> = Object.fromEntries(
  BRANCHES.map((b) => [b.id, b.enabler.id])
);
