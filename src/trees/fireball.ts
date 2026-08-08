/**
 * Fireball's web — 100 nodes, 25 of them notable.
 *
 * Laid out as eight wedges around the skill, each one an idea: burning,
 * exploding, hitting more things, going through them, bouncing between them,
 * hurting the right ones more, reaching further, and turning the fire into
 * something else. A wedge runs outward through five rings, getting stronger
 * and more expensive, and neighbouring wedges are stitched together at two
 * depths so you can cross rather than start again.
 *
 * The geometry is generated, the CONTENT is not. Writing a hundred nodes'
 * coordinates by hand produces a hundred chances to put one in the wrong
 * place, and the interesting part of a tree is never where the dots are — it
 * is which dot does what, and how far in you have to be before it will open.
 * So the shape comes from a handful of numbers below and the notables are a
 * plain table naming exactly where each one sits.
 *
 * Two rules keep this from being a menu:
 *
 *   the walk    an outer node costs every node between it and the middle
 *   the gate    a notable refuses to open until you are that deep in the tree
 *
 * Cross links would defeat the first on their own — they are shortcuts by
 * definition — so anything worth crossing for carries the second.
 *
 * Minors are deliberately small. Thirty points of tree should decide HOW you
 * fight; the numbers come off your gear, where a single modifier can be worth
 * more than a whole wedge of these.
 */
import { CENTRE, stat } from './node';
import type { NodeStat, SkillNodeDef } from './node';

// --- shape -----------------------------------------------------------------

/** Radius and how many nodes each wedge gets, ring by ring. */
const RINGS = [
  { r: 1.40, per: 1 },
  { r: 2.65, per: 2 },
  { r: 3.90, per: 3 },
  { r: 5.15, per: 3 },
  { r: 6.40, per: 3 },
];
const WEDGES = 8;
/** The four deepest nodes hang past the outer ring, on these wedges. */
const KEYSTONE_WEDGES = [0, 2, 4, 6];
const KEYSTONE_R = 7.70;

/** Rings where a wedge is stitched to the next one round. */
const CROSSINGS = [2, 4];

/** How deep you must already be for a ring's minors to open. */
const MINOR_GATE: Record<number, number> = { 4: 8, 5: 14 };

const TAU = Math.PI * 2;
const WEDGE_ARC = TAU / WEDGES;

/** Wedge centre, with 0 pointing straight up. */
const wedgeAngle = (wedge: number) => wedge * WEDGE_ARC - Math.PI / 2;

/** Spread `per` nodes across a wedge, centred. */
function slotAngle(wedge: number, slot: number, per: number): number {
  const spread = WEDGE_ARC * 0.70;
  const offset = per === 1 ? 0 : (slot / (per - 1) - 0.5) * spread;
  return wedgeAngle(wedge) + offset;
}

const minorId = (w: number, r: number, s: number) => `fb_w${w}r${r}s${s}`;

// --- content ---------------------------------------------------------------

/**
 * What the filler in each wedge does.
 *
 * Two lines per wedge, alternating, so a wedge reads as one idea without
 * every node in it being the same node. Fire-tagged lines are the ones a
 * conversion notable rewrites — see `convertTree` in sim/stats.ts.
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
  /** Where it sits: wedge, ring, slot. Ring 6 means the keystone past the edge. */
  at: [number, number, number];
  id: string;
  name: string;
  description: string;
  gate: number;
  stats?: NodeStat[];
  grants?: Record<string, unknown>;
}

/**
 * The twenty-five.
 *
 * Every one of these changes what Fireball IS, not how big its number is —
 * that is the difference between a notable and the filler leading to it. The
 * numbers in them are first drafts; the mechanisms are the point.
 */
const NOTABLES: NotableSpec[] = [
  // --- wedge 0: Ignition -------------------------------------------------
  {
    at: [0, 3, 1],
    id: 'fb_kindling',
    name: 'Kindling',
    description:
      'Fireball can no longer critically strike. A cast that would have crit ' +
      'instead sets the target alight for 260% of the hit over 4s.',
    gate: 6,
    grants: { critBurn: { multiplier: 2.6, seconds: 4 } },
  },
  {
    at: [0, 4, 1],
    id: 'fb_cauterise',
    name: 'Cauterise',
    description: 'Burns you apply deal 35% more damage over a 25% shorter time.',
    gate: 12,
    grants: { burnMultiplier: 1.35, burnDuration: 0.75 },
  },
  {
    at: [0, 5, 1],
    id: 'fb_slowburn',
    name: 'Slow Burn',
    description: 'Burns you apply last 60% longer.',
    gate: 18,
    grants: { burnDuration: 1.6 },
  },

  // --- wedge 1: Detonation ------------------------------------------------
  {
    at: [1, 3, 1],
    id: 'fb_detonation',
    name: 'Detonation',
    description:
      'Fireball bursts where it lands, dealing 55% damage to everything within ' +
      '1.8 tiles. Fireball gains the Area tag.',
    gate: 6,
    grants: { explode: { radius: 1.8, multiplier: 0.55 }, addTags: ['area'] },
  },
  {
    at: [1, 4, 1],
    id: 'fb_concussive',
    name: 'Concussive Blast',
    description: 'The burst covers 45% more ground.',
    gate: 12,
    grants: { explodeRadius: 1.45 },
  },
  {
    at: [1, 5, 1],
    id: 'fb_fuelair',
    name: 'Fuel-Air Charge',
    description: 'The burst deals full damage rather than a fraction of it.',
    gate: 18,
    grants: { explodeMultiplierAdd: 0.45 },
  },

  // --- wedge 2: Volley ----------------------------------------------------
  {
    at: [2, 3, 1],
    id: 'fb_splitcast',
    name: 'Split Cast',
    description: 'Fireball strikes one additional enemy near the target.',
    gate: 6,
    grants: { extraTargets: 1 },
  },
  {
    at: [2, 5, 1],
    id: 'fb_volley',
    name: 'Volley',
    description: 'Fireball strikes another additional enemy.',
    gate: 18,
    grants: { extraTargets: 1 },
  },

  // --- wedge 3: Penetration -----------------------------------------------
  {
    at: [3, 3, 1],
    id: 'fb_piercing',
    name: 'Piercing Flame',
    description:
      'Fireball passes through one enemy, carrying on to whatever is behind it.',
    gate: 6,
    grants: { pierce: 1 },
  },
  {
    at: [3, 4, 1],
    id: 'fb_momentum',
    name: 'Momentum',
    description: 'Enemies pierced take full damage instead of 70%.',
    gate: 12,
    grants: { pierceDamage: 1 },
  },
  {
    at: [3, 5, 1],
    id: 'fb_overpen',
    name: 'Overpenetration',
    description: 'Fireball passes through one more enemy.',
    gate: 18,
    grants: { pierce: 1 },
  },

  // --- wedge 4: Arc -------------------------------------------------------
  {
    at: [4, 3, 1],
    id: 'fb_arcing',
    name: 'Arcing Flame',
    description:
      'Fireball leaps from the enemy it hits to one more within 4.5 tiles.',
    gate: 6,
    grants: { chains: 1 },
  },
  {
    at: [4, 4, 1],
    id: 'fb_rebound',
    name: 'Rebound',
    description: 'Leaps deal full damage instead of 70%.',
    gate: 12,
    grants: { chainDamage: 1 },
  },
  {
    at: [4, 5, 1],
    id: 'fb_leaping',
    name: 'Leaping Flame',
    description: 'Fireball leaps one more time.',
    gate: 18,
    grants: { chains: 1 },
  },

  // --- wedge 5: Cruelty ---------------------------------------------------
  {
    at: [5, 3, 1],
    id: 'fb_immolate',
    name: 'Immolate',
    description: 'Fireball deals 25% more damage to enemies that are already burning.',
    gate: 6,
    grants: { moreVsBurning: 0.25 },
  },
  {
    at: [5, 4, 1],
    id: 'fb_closequarters',
    name: 'Close Quarters',
    description: 'Fireball deals 30% more damage to enemies within 2.5 tiles of you.',
    gate: 12,
    grants: { moreClose: { within: 2.5, more: 0.3 } },
  },
  {
    at: [5, 5, 1],
    id: 'fb_executioner',
    name: 'Executioner',
    description: 'Fireball deals 35% more damage to enemies below a third of their life.',
    gate: 18,
    grants: { moreVsLow: { below: 0.33, more: 0.35 } },
  },

  // --- wedge 6: Reach -----------------------------------------------------
  {
    at: [6, 3, 1],
    id: 'fb_longfuse',
    name: 'Long Fuse',
    description: 'Fireball deals 30% more damage to enemies more than 5 tiles away.',
    gate: 6,
    grants: { moreFar: { beyond: 5, more: 0.3 } },
  },
  {
    at: [6, 5, 1],
    id: 'fb_reserves',
    name: 'Deep Reserves',
    description: 'Fireball deals 45% more damage and is cast 20% slower.',
    gate: 18,
    stats: [stat('damage', 'more', 45), stat('castSpeed', 'inc', -20)],
  },

  // --- wedge 7: Transmutation ---------------------------------------------
  {
    at: [7, 3, 1],
    id: 'fb_frostfire',
    name: 'Frostfire',
    description:
      'Fireball deals Cold damage instead of Fire. Fire modifiers in this tree ' +
      'become Cold modifiers.',
    gate: 6,
    grants: { convertTree: 'cold' },
  },
  {
    at: [7, 5, 1],
    id: 'fb_stormfire',
    name: 'Stormfire',
    description:
      'Fireball deals Lightning damage instead of Fire. Fire modifiers in this ' +
      'tree become Lightning modifiers.',
    gate: 18,
    grants: { convertTree: 'lightning' },
  },

  // --- the keystones, past the edge ---------------------------------------
  {
    at: [0, 6, 0],
    id: 'fb_wildfire',
    name: 'Wildfire',
    description:
      'A burn that ticks critically sets everything within 2 tiles alight as well.',
    gate: 25,
    grants: { burnSpread: 2 },
  },
  {
    at: [2, 6, 0],
    id: 'fb_barrage',
    name: 'Barrage',
    description: 'Fireball strikes two more enemies near the target.',
    gate: 25,
    grants: { extraTargets: 2 },
  },
  {
    at: [4, 6, 0],
    id: 'fb_chainreaction',
    name: 'Chain Reaction',
    description:
      'An enemy killed by Fireball bursts, dealing 60% damage within 2.2 tiles.',
    gate: 25,
    grants: { explodeOnKill: { radius: 2.2, multiplier: 0.6 } },
  },
  {
    at: [6, 6, 0],
    id: 'fb_overload',
    name: 'Overload',
    description: 'Every fifth cast of Fireball deals triple damage.',
    gate: 25,
    grants: { everyNth: { n: 5, multiplier: 3 } },
  },
];

// --- assembly --------------------------------------------------------------

function build(): SkillNodeDef[] {
  const byPlace = new Map<string, NotableSpec>();
  for (const n of NOTABLES) byPlace.set(n.at.join(':'), n);

  const nodes: SkillNodeDef[] = [];
  const place = (w: number, r: number, s: number) => byPlace.get(`${w}:${r}:${s}`);

  for (let w = 0; w < WEDGES; w++) {
    const filler = FILLER[w];

    for (let r = 1; r <= RINGS.length; r++) {
      const ring = RINGS[r - 1];
      const prev = RINGS[r - 2];

      for (let s = 0; s < ring.per; s++) {
        const angle = slotAngle(w, s, ring.per);
        const links: string[] = [];

        // Inward. Ring 1 touches the skill itself; everything else fans back
        // onto the slice of the previous ring sitting behind it, so a wide
        // ring narrowing to a thin one still has a way home from every node.
        if (r === 1) {
          links.push(CENTRE);
        } else {
          const lo = Math.floor((s * prev.per) / ring.per);
          const hi = Math.floor(((s + 1) * prev.per - 1) / ring.per);
          for (let j = lo; j <= hi; j++) links.push(idAt(w, r - 1, j));
        }

        // Sideways within the ring.
        if (s + 1 < ring.per) links.push(idAt(w, r, s + 1));

        // And across to the next wedge, at two depths only. Every crossing is
        // a shortcut past somebody's gate, which is why there are two of them
        // and not one per ring.
        if (CROSSINGS.includes(r) && s === ring.per - 1) {
          links.push(idAt((w + 1) % WEDGES, r, 0));
        }

        const notable = place(w, r, s);
        nodes.push(
          notable
            ? {
                id: notable.id,
                name: notable.name,
                description: notable.description,
                kind: 'notable',
                x: Math.cos(angle) * ring.r,
                y: Math.sin(angle) * ring.r,
                links,
                gate: notable.gate,
                ...(notable.stats ? { stats: notable.stats } : {}),
                ...(notable.grants ? { grants: notable.grants } : {}),
              }
            : {
                id: minorId(w, r, s),
                // Filler is named for the wedge it belongs to, so a hover
                // anywhere on the way out still tells you where you are.
                name: filler.theme,
                description: filler.lines[s % filler.lines.length].text,
                kind: 'minor',
                x: Math.cos(angle) * ring.r,
                y: Math.sin(angle) * ring.r,
                links,
                ...(MINOR_GATE[r] ? { gate: MINOR_GATE[r] } : {}),
                stats: filler.lines[s % filler.lines.length].stats,
              }
        );
      }
    }
  }

  // The keystones, hanging off the middle of their wedge's outer ring.
  for (const w of KEYSTONE_WEDGES) {
    const spec = place(w, 6, 0)!;
    const angle = wedgeAngle(w);
    nodes.push({
      id: spec.id,
      name: spec.name,
      description: spec.description,
      kind: 'notable',
      x: Math.cos(angle) * KEYSTONE_R,
      y: Math.sin(angle) * KEYSTONE_R,
      links: [idAt(w, RINGS.length, 1)],
      gate: spec.gate,
      ...(spec.stats ? { stats: spec.stats } : {}),
      ...(spec.grants ? { grants: spec.grants } : {}),
    });
  }

  return nodes;
}

/** Whatever is at a place — a notable's real id, or the generated filler id. */
function idAt(w: number, r: number, s: number): string {
  const notable = NOTABLES.find(
    (n) => n.at[0] === w && n.at[1] === r && n.at[2] === s
  );
  return notable ? notable.id : minorId(w, r, s);
}

export const FIREBALL_TREE: SkillNodeDef[] = build();
