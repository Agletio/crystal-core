/**
 * Fireball's web — 100 nodes, 25 of them notable, laid out to be WALKED.
 *
 * Five rings around the skill. The links outward are sparse and every ring's
 * spokes are turned off the ring below's, so the way out is never straight: you
 * come up a spoke, walk round a way, and go up the next one. That is what makes
 * the minors worth buying — they are the road, not a tax on the destination.
 *
 * Notables are SCATTERED rather than stacked. A family's three nodes sit about
 * 140 degrees apart, so a pierce build cannot be walked in a line, and picking
 * up the second pierce means paying for whatever is on the way there. The
 * placement is generated from that rule and checked in the demo, because
 * twenty-five hand-chosen indices is twenty-five chances to put two of them
 * next to each other.
 *
 * Minors are deliberately small. Thirty points of tree should decide HOW you
 * fight; the numbers come off your gear.
 */
import { CENTRE, stat } from './node';
import type { NodeStat, SkillNodeDef } from './node';

// --- shape -----------------------------------------------------------------

const RINGS = [
  { count: 8, r: 1.5 },
  { count: 16, r: 2.9 },
  { count: 20, r: 4.3 },
  { count: 26, r: 5.7 },
  { count: 26, r: 7.1 },
];
const KEYSTONE_R = 8.5;

/**
 * How many ways out of each ring, and how far round the previous ring's spokes
 * they are turned. A turn of half a gap is what stops a spoke ever lining up
 * with the one below it.
 */
const SPOKES = [
  { count: 4, turn: 0 },
  { count: 5, turn: 0.5 },
  { count: 5, turn: 0.5 },
  { count: 6, turn: 0.5 },
  { count: 5, turn: 0.5 },
];

const TAU = Math.PI * 2;
const nodeId = (ring: number, i: number) => `fb_r${ring}s${i}`;

/** Stable 0..1 wobble for a slot. Perfect rings read as a dartboard. */
const jitter = (ring: number, i: number, salt: number): number => {
  const h = Math.sin(ring * 127.1 + i * 311.7 + salt * 74.7) * 43758.5453;
  return h - Math.floor(h);
};

const angleOf = (ring: number, i: number) =>
  ((i + (jitter(ring, i, 1) - 0.5) * 0.42) / RINGS[ring - 1].count) * TAU - Math.PI / 2;

const radiusOf = (ring: number, i: number) =>
  RINGS[ring - 1].r + (jitter(ring, i, 2) - 0.5) * 0.5;

/** Index on `ring` whose angle is closest to `turns` of the way round. */
const nearest = (ring: number, turns: number): number => {
  const count = RINGS[ring - 1].count;
  return ((Math.round(turns * count) % count) + count) % count;
};

// --- content ---------------------------------------------------------------

/**
 * Filler, by family. Two lines each so a stretch of road reads as one idea
 * without every node on it being the same node. Fire-tagged lines are what a
 * conversion rewrites — see `convertTree` in sim/stats.ts.
 */
const FILLER: Array<{ theme: string; lines: Array<{ text: string; stats: NodeStat[] }> }> = [
  {
    theme: 'Ignition',
    lines: [
      { text: '+5% increased Fire Damage', stats: [stat('damage', 'inc', 5, ['fire'])] },
      { text: '+4% increased Damage', stats: [stat('damage', 'inc', 4)] },
    ],
  },
  {
    theme: 'Detonation',
    lines: [
      { text: '+5% increased Area of Effect', stats: [stat('areaOfEffect', 'inc', 5)] },
      { text: '+5% increased Fire Damage', stats: [stat('damage', 'inc', 5, ['fire'])] },
    ],
  },
  {
    theme: 'Volley',
    lines: [
      { text: '+3% increased Cast Speed', stats: [stat('castSpeed', 'inc', 3)] },
      { text: '+5% increased Fire Damage', stats: [stat('damage', 'inc', 5, ['fire'])] },
    ],
  },
  {
    theme: 'Penetration',
    lines: [
      { text: '+4% increased Attack Range', stats: [stat('attackRange', 'inc', 4)] },
      { text: '+5% increased Fire Damage', stats: [stat('damage', 'inc', 5, ['fire'])] },
    ],
  },
  {
    theme: 'Arc',
    lines: [
      { text: '+5% increased Fire Damage', stats: [stat('damage', 'inc', 5, ['fire'])] },
      { text: '+3% increased Cast Speed', stats: [stat('castSpeed', 'inc', 3)] },
    ],
  },
  {
    theme: 'Cruelty',
    lines: [
      { text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
      { text: '+8% Critical Damage', stats: [stat('critMultiplier', 'flat', 8)] },
    ],
  },
  {
    theme: 'Reach',
    lines: [
      { text: '+4% increased Attack Range', stats: [stat('attackRange', 'inc', 4)] },
      { text: '+4% increased Damage', stats: [stat('damage', 'inc', 4)] },
    ],
  },
  {
    theme: 'Transmutation',
    lines: [
      { text: '+5% increased Fire Damage', stats: [stat('damage', 'inc', 5, ['fire'])] },
      { text: '+3% increased Cast Speed', stats: [stat('castSpeed', 'inc', 3)] },
    ],
  },
];

interface NotableSpec {
  /** Which idea it belongs to. Members are pushed apart around the web. */
  family: string;
  /** 0-3 for the rings outward; 4 hangs past the edge as a keystone. */
  depth: number;
  id: string;
  name: string;
  description: string;
  gate: number;
  stats?: NodeStat[];
  grants?: Record<string, unknown>;
  choices?: SkillNodeDef['choices'];
}

/** Ring each depth lands on, and how many notables that ring takes. */
const DEPTH_RING = [2, 3, 4, 5];
const GATE = [5, 11, 17, 23, 25];

const NOTABLES: NotableSpec[] = [
  // --- burning ------------------------------------------------------------
  {
    family: 'burn', depth: 0, gate: GATE[0],
    id: 'fb_kindling',
    name: 'Kindling',
    description:
      'Fireball can no longer critically strike. A cast that would have crit ' +
      'instead sets the target alight for 260% of the hit over 4s.',
    grants: { critBurn: { multiplier: 2.6, seconds: 4 } },
  },
  {
    family: 'burn', depth: 1, gate: GATE[1],
    id: 'fb_cauterise',
    name: 'Cauterise',
    description: 'Burns you apply deal 35% more damage over a 25% shorter time.',
    grants: { burnMultiplier: 1.35, burnDuration: 0.75 },
  },
  {
    family: 'burn', depth: 2, gate: GATE[2],
    id: 'fb_slowburn',
    name: 'Slow Burn',
    description: 'Burns you apply last 60% longer.',
    grants: { burnDuration: 1.6 },
  },
  {
    family: 'burn', depth: 4, gate: GATE[4],
    id: 'fb_wildfire',
    name: 'Wildfire',
    description: 'A burn that ticks critically sets everything within 2 tiles alight as well.',
    grants: { burnSpread: 2 },
  },

  // --- bursting -----------------------------------------------------------
  {
    family: 'explode', depth: 0, gate: GATE[0],
    id: 'fb_detonation',
    name: 'Detonation',
    description:
      'Fireball bursts where it lands, dealing 55% damage to everything within ' +
      '1.8 tiles. Fireball gains the Area tag.',
    grants: { explode: { radius: 1.8, multiplier: 0.55 }, addTags: ['area'] },
  },
  {
    family: 'explode', depth: 1, gate: GATE[1],
    id: 'fb_concussive',
    name: 'Concussive Blast',
    description: 'The burst covers 45% more ground.',
    grants: { explodeRadius: 1.45 },
  },
  {
    family: 'explode', depth: 2, gate: GATE[2],
    id: 'fb_fuelair',
    name: 'Fuel-Air Charge',
    description: 'The burst deals full damage rather than a fraction of it.',
    grants: { explodeMultiplierAdd: 0.45 },
  },
  {
    family: 'explode', depth: 4, gate: GATE[4],
    id: 'fb_chainreaction',
    name: 'Chain Reaction',
    description: 'An enemy killed by Fireball bursts, dealing 60% damage within 2.2 tiles.',
    grants: { explodeOnKill: { radius: 2.2, multiplier: 0.6 } },
  },

  // --- more targets -------------------------------------------------------
  {
    family: 'targets', depth: 0, gate: GATE[0],
    id: 'fb_splitcast',
    name: 'Split Cast',
    description: 'Fireball strikes one additional enemy near the target.',
    grants: { extraTargets: 1 },
  },
  {
    family: 'targets', depth: 1, gate: GATE[1],
    id: 'fb_volley',
    name: 'Volley',
    description: 'Fireball strikes another additional enemy.',
    grants: { extraTargets: 1 },
  },
  {
    family: 'targets', depth: 2, gate: GATE[2],
    id: 'fb_focused',
    name: 'Focused Volley',
    description: 'Additional targets take full damage instead of 70%.',
    grants: { extraTargetDamage: 1 },
  },
  {
    family: 'targets', depth: 4, gate: GATE[4],
    id: 'fb_barrage',
    name: 'Barrage',
    description: 'Fireball strikes two more enemies near the target.',
    grants: { extraTargets: 2 },
  },

  // --- through them -------------------------------------------------------
  {
    family: 'pierce', depth: 0, gate: GATE[0],
    id: 'fb_piercing',
    name: 'Piercing Flame',
    description: 'Fireball passes through one enemy, carrying on to whatever is behind it.',
    grants: { pierce: 1 },
  },
  {
    family: 'pierce', depth: 1, gate: GATE[1],
    id: 'fb_momentum',
    name: 'Momentum',
    description: 'Enemies pierced take full damage instead of 70%.',
    grants: { pierceDamage: 1 },
  },
  {
    family: 'pierce', depth: 2, gate: GATE[2],
    id: 'fb_overpen',
    name: 'Overpenetration',
    description: 'Fireball passes through one more enemy.',
    grants: { pierce: 1 },
  },

  // --- between them -------------------------------------------------------
  {
    family: 'chain', depth: 0, gate: GATE[0],
    id: 'fb_arcing',
    name: 'Arcing Flame',
    description: 'Fireball leaps from the enemy it hits to one more within 4.5 tiles.',
    grants: { chains: 1 },
  },
  {
    family: 'chain', depth: 1, gate: GATE[1],
    id: 'fb_rebound',
    name: 'Rebound',
    description: 'Leaps deal full damage instead of 70%.',
    grants: { chainDamage: 1 },
  },
  {
    family: 'chain', depth: 2, gate: GATE[2],
    id: 'fb_leaping',
    name: 'Leaping Flame',
    description: 'Fireball leaps one more time.',
    grants: { chains: 1 },
  },

  // --- the right ones harder ----------------------------------------------
  {
    family: 'cruelty', depth: 0, gate: GATE[0],
    id: 'fb_immolate',
    name: 'Immolate',
    description: 'Fireball deals 25% more damage to enemies that are already burning.',
    grants: { moreVsBurning: 0.25 },
  },
  {
    family: 'cruelty', depth: 1, gate: GATE[1],
    id: 'fb_closequarters',
    name: 'Close Quarters',
    description: 'Fireball deals 30% more damage to enemies within 2.5 tiles of you.',
    grants: { moreClose: { within: 2.5, more: 0.3 } },
  },
  {
    family: 'cruelty', depth: 3, gate: GATE[3],
    id: 'fb_executioner',
    name: 'Executioner',
    description: 'Fireball deals 35% more damage to enemies below a third of their life.',
    grants: { moreVsLow: { below: 0.33, more: 0.35 } },
  },

  // --- further ------------------------------------------------------------
  {
    family: 'reach', depth: 1, gate: GATE[1],
    id: 'fb_longfuse',
    name: 'Long Fuse',
    description: 'Fireball deals 30% more damage to enemies more than 5 tiles away.',
    grants: { moreFar: { beyond: 5, more: 0.3 } },
  },
  {
    family: 'reach', depth: 3, gate: GATE[3],
    id: 'fb_reserves',
    name: 'Deep Reserves',
    description: 'Fireball deals 45% more damage and is cast 20% slower.',
    stats: [stat('damage', 'more', 45), stat('castSpeed', 'inc', -20)],
  },

  // --- one node, one question ---------------------------------------------
  {
    family: 'transmute', depth: 2, gate: GATE[2],
    id: 'fb_transmutation',
    name: 'Transmutation',
    description:
      'Fireball stops dealing Fire. Pick what it deals instead — the Fire ' +
      'modifiers in this tree change with it, the ones on your gear do not.',
    grants: {},
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

  // --- every fifth one --------------------------------------------------
  {
    family: 'overload', depth: 4, gate: GATE[4],
    id: 'fb_overload',
    name: 'Overload',
    description: 'Every fifth cast of Fireball deals triple damage.',
    grants: { everyNth: { n: 5, multiplier: 3 } },
  },
];

// --- assembly --------------------------------------------------------------

/** Families, in a stable order, so placement never depends on table order. */
const FAMILIES = [...new Set(NOTABLES.map((n) => n.family))].sort();

/**
 * The ways outward, as slots. Worked out before anything is placed, because
 * placement has to know which slots are radially joined — a notable directly
 * up a spoke from another notable is the straight line this layout exists to
 * avoid, and it is invisible if you only check along the ring.
 */
interface Spoke {
  outer: { ring: number; index: number };
  inner: { ring: number; index: number } | null;
}

function spokes(): Spoke[] {
  const out: Spoke[] = [];
  let turn = 0;
  for (let level = 0; level < SPOKES.length; level++) {
    const { count, turn: shift } = SPOKES[level];
    turn += shift / count;
    for (let s = 0; s < count; s++) {
      const bearing = s / count + turn;
      out.push({
        outer: { ring: level + 1, index: nearest(level + 1, bearing) },
        inner: level === 0 ? null : { ring: level, index: nearest(level, bearing) },
      });
    }
  }
  return out;
}

const SPOKE_LINKS = spokes();

/**
 * Where each notable goes: a family starts at its own bearing and every later
 * member is turned most of the way round the web from the last. Collisions walk
 * to the next free index, and no slot beside or up a spoke from a notable is
 * ever taken — two notables touching is a shortcut past a whole stretch of road.
 */
function place(): Map<string, { ring: number; index: number }> {
  const at = new Map<string, { ring: number; index: number }>();
  const taken = new Map<number, Set<number>>();
  for (let r = 1; r <= RINGS.length; r++) taken.set(r, new Set());

  /** Slots one spoke away from this one, on either side. */
  const across = (ring: number, index: number) =>
    SPOKE_LINKS.flatMap((s) => {
      if (s.outer.ring === ring && s.outer.index === index) return s.inner ? [s.inner] : [];
      if (s.inner && s.inner.ring === ring && s.inner.index === index) return [s.outer];
      return [];
    });

  const seen: Record<string, number> = {};
  // Keystones hang past the outer ring and take no slot on it.
  for (const spec of NOTABLES.filter((n) => n.depth < DEPTH_RING.length)) {
    const step = seen[spec.family] ?? 0;
    seen[spec.family] = step + 1;

    const bearing =
      FAMILIES.indexOf(spec.family) / FAMILIES.length + step * 0.382;
    const ring = DEPTH_RING[Math.min(spec.depth, DEPTH_RING.length - 1)];
    const count = RINGS[ring - 1].count;
    const used = taken.get(ring)!;

    // Both rules if the ring has room for them, and never the sideways one:
    // two notables touching along a ring is the shortcut you can see.
    const start = nearest(ring, bearing);
    const free = (i: number) => ![-1, 0, 1].some((d) => used.has((i + d + count) % count));
    const apart = (i: number) =>
      !across(ring, i).some((slot) => taken.get(slot.ring)?.has(slot.index));

    let index = start;
    for (let pass = 0; pass < 2; pass++) {
      let found = -1;
      for (let step = 0; step < count; step++) {
        const i = (start + step) % count;
        if (free(i) && (pass === 1 || apart(i))) {
          found = i;
          break;
        }
      }
      if (found >= 0) {
        index = found;
        break;
      }
    }
    used.add(index);
    at.set(spec.id, { ring, index });
  }
  return at;
}

function build(): SkillNodeDef[] {
  const placed = place();
  const byPlace = new Map<string, NotableSpec>();
  for (const spec of NOTABLES) {
    const p = placed.get(spec.id);
    if (p) byPlace.set(`${p.ring}:${p.index}`, spec);
  }
  // A notable takes over its slot's identity, so every link has to be built
  // through here or half of them point at ids that no longer exist.
  const at = (ring: number, i: number) =>
    byPlace.get(`${ring}:${i}`)?.id ?? nodeId(ring, i);

  const nodes: SkillNodeDef[] = [];
  const linkOut = new Map<string, string[]>();
  const addLink = (from: string, to: string) => {
    if (!linkOut.has(from)) linkOut.set(from, []);
    linkOut.get(from)!.push(to);
  };

  // Sideways, all the way round every ring.
  for (let ring = 1; ring <= RINGS.length; ring++) {
    const { count } = RINGS[ring - 1];
    for (let i = 0; i < count; i++) addLink(at(ring, i), at(ring, (i + 1) % count));
  }

  // Outward, only at the spokes — and each ring's are turned off the last's,
  // so leaving a ring means walking round it first.
  for (const spoke of SPOKE_LINKS) {
    addLink(
      at(spoke.outer.ring, spoke.outer.index),
      spoke.inner ? at(spoke.inner.ring, spoke.inner.index) : CENTRE
    );
  }

  for (let ring = 1; ring <= RINGS.length; ring++) {
    const { count } = RINGS[ring - 1];
    const filler = FILLER[(ring - 1) % FILLER.length];

    for (let i = 0; i < count; i++) {
      const spec = byPlace.get(`${ring}:${i}`);
      const id = at(ring, i);
      const angle = angleOf(ring, i);
      const reach = radiusOf(ring, i);
      const x = Math.cos(angle) * reach;
      const y = Math.sin(angle) * reach;
      const links = linkOut.get(id) ?? [];

      nodes.push(
        spec
          ? {
              id: spec.id,
              name: spec.name,
              description: spec.description,
              kind: 'notable',
              x, y, links, gate: spec.gate,
              ...(spec.stats ? { stats: spec.stats } : {}),
              ...(spec.grants ? { grants: spec.grants } : {}),
              ...(spec.choices ? { choices: spec.choices } : {}),
            }
          : {
              id,
              // Named for the ring it is on, so a hover anywhere on the way
              // out still says where you are.
              name: filler.theme,
              description: filler.lines[i % filler.lines.length].text,
              kind: 'minor',
              x, y, links,
              ...(ring >= 4 ? { gate: ring === 4 ? 7 : 13 } : {}),
              stats: filler.lines[i % filler.lines.length].stats,
            }
      );
    }
  }

  // The four keystones, hung off the outer ring a long way apart.
  const outer = RINGS.length;
  NOTABLES.filter((n) => n.depth === 4).forEach((spec, i) => {
    const bearing = i / 4 + 0.125;
    const anchor = nearest(outer, bearing);
    const angle = angleOf(outer, anchor);
    nodes.push({
      id: spec.id,
      name: spec.name,
      description: spec.description,
      kind: 'notable',
      x: Math.cos(angle) * KEYSTONE_R,
      y: Math.sin(angle) * KEYSTONE_R,
      links: [at(outer, anchor)],
      gate: spec.gate,
      ...(spec.grants ? { grants: spec.grants } : {}),
    });
  });

  return nodes;
}

export const FIREBALL_TREE: SkillNodeDef[] = build();

/** Which idea each notable belongs to. The demo checks they stay scattered. */
export const FIREBALL_FAMILIES: Record<string, string> = Object.fromEntries(
  NOTABLES.map((n) => [n.id, n.family])
);
