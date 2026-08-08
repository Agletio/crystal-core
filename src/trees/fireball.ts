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
 */
import { stat } from './node';
import { GATE, SPUR_GATES } from './spec';
import type { Branch, Crossing, Minor, Notable, TreeSpec } from './spec';

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
      grants: { critAilment: { multiplier: 2.6, seconds: 4 } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'fb_cauterise',
          name: 'Cauterise',
          description: 'Burns you apply deal 35% more damage over a 25% shorter time.',
          gate: GATE.mid,
          grants: { ailmentMultiplier: 1.35, ailmentDuration: 0.75 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'fb_slowburn',
          name: 'Slow Burn',
          description: 'Burns you apply last 60% longer.',
          gate: GATE.deep,
          grants: { ailmentDuration: 1.6 },
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
          grants: { ailmentSpread: 2 },
        },
      },
    ],
    minors: [
      { text: '+6% increased Burning Damage', grants: { ailmentMultiplier: 1.06 } },
      { text: '+5% increased Burn Duration', grants: { ailmentDuration: 1.05 } },
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
      grants: { moreVsAiling: 0.25 },
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
    gate: SPUR_GATES[0],
    grants: { moreFar: { beyond: 5, more: 0.3 } },
  },
  {
    id: 'fb_transmutation',
    name: 'Transmutation',
    description:
      'Fireball stops dealing Fire. Pick what it deals instead — the Fire ' +
      'modifiers in this tree change with it, the ones on your gear do not.',
    gate: SPUR_GATES[1],
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
    gate: SPUR_GATES[2],
    stats: [stat('damage', 'more', 45), stat('castSpeed', 'inc', -20)],
  },
  {
    id: 'fb_opening',
    name: 'Opening Salvo',
    description: 'Fireball deals 35% more damage to enemies above four fifths of their life.',
    gate: SPUR_GATES[3],
    grants: { moreVsFull: { above: 0.8, more: 0.35 } },
  },
  {
    id: 'fb_focus',
    name: 'Sharpened Focus',
    description: 'Fireball critically strikes far more often, and far harder.',
    gate: SPUR_GATES[4],
    stats: [stat('critChance', 'flat', 11), stat('critMultiplier', 'flat', 45)],
  },
  {
    id: 'fb_emberstorm',
    name: 'Ember Storm',
    description: 'Fireball is cast 25% faster.',
    gate: SPUR_GATES[5],
    stats: [stat('castSpeed', 'inc', 25)],
  },
];

/** Never into a branch: a way in that skipped the enabler puts dead nodes back. */
const CROSSINGS: Crossing[] = [
  [[0, 0], [1, 1]],
  [[2, 0], [3, 1]],
  [[4, 0], [5, 1]],
  [[1, 0], [2, 1]],
  [[3, 0], [4, 1]],
  [[5, 0], [0, 1]],
];

export const FIREBALL_SPEC: TreeSpec = {
  skillId: 'fireball',
  prefix: 'fb',
  minorName: 'Ember',
  common: COMMON,
  branches: BRANCHES,
  trunkNotables: TRUNK_NOTABLES,
  crossings: CROSSINGS,
  needs: {
    areaOfEffect: 'fb_detonation',
    explodeRadius: 'fb_detonation',
    explodeMultiplierAdd: 'fb_detonation',
    explodeOnKill: 'fb_detonation',
    ailmentMultiplier: 'fb_kindling',
    ailmentDuration: 'fb_kindling',
    ailmentSpread: 'fb_kindling',
    extraTargetDamage: 'fb_splitcast',
    pierceDamage: 'fb_piercing',
    chainDamage: 'fb_arcing',
  },
};
