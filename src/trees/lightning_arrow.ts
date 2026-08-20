/**
 * Lightning Arrow's web.
 *
 * The one tree whose conditional damage lives on the TRUNK and whose branches
 * are all delivery. A bow is already the longest reach in the game, so "more
 * damage at range" is true of every build that holds one and belongs where
 * everything true of every build belongs; what a point out on a branch buys is
 * a different shot — more Forks out of the sky, a shaft that carries on, a
 * second arrow, a leap, a blast, or the crit given up for an Ailment.
 */
import { stat } from './node';
import type { Branch, Minor, Notable, TreeSpec } from './spec';

const COMMON: Minor[] = [
  { text: '+5% increased Lightning Damage', stats: [stat('damage', 'inc', 5, ['lightning'])] },
  { text: '+4% increased Damage', stats: [stat('damage', 'inc', 4)] },
  { text: '+3% increased Attack Speed', stats: [stat('attackSpeed', 'inc', 3)] },
  { text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
  { text: '+8% Critical Damage', stats: [stat('critMultiplier', 'flat', 8)] },
  { text: '+4% increased Attack Range', stats: [stat('attackRange', 'inc', 4)] },
];

const BRANCHES: Branch[] = [
  {
    id: 'storm',
    theme: 'Squall',
    enabler: {
      id: 'la_stormcall',
      name: 'Storm Call',
      description: 'Lightning Arrow gains +2 Forks.',
      grants: { forks: 2, manaMultiplier: 1.15 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'la_thunderhead',
          name: 'Thunderhead',
          description: 'Forks deal 80% of the damage instead of 45%.',
          grants: { forkDamage: 0.8, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 0, at: 1 },
        notable: {
          id: 'la_deluge',
          name: 'Deluge',
          description: 'Lightning Arrow gains +3 Forks.',
          grants: { forks: 3, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [COMMON[0], COMMON[1], COMMON[2], COMMON[0]],
  },
  {
    id: 'penetration',
    theme: 'Broadhead',
    enabler: {
      id: 'la_broadhead',
      name: 'Broadhead',
      description: 'Lightning Arrow gains +1 Pierce.',
      grants: { pierce: 1, manaMultiplier: 1.15 },
    },
    twigs: [
      {
        minors: 5,
        notable: {
          id: 'la_momentum',
          name: 'Full Draw',
          description: 'Pierce deals full damage instead of 70%.',
          grants: { pierceDamage: 1, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 5,
        notable: {
          id: 'la_overdraw',
          name: 'Overdraw',
          description: 'Lightning Arrow gains +2 Pierce.',
          grants: { pierce: 2, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [COMMON[5], COMMON[1], COMMON[0], COMMON[5]],
  },
  {
    id: 'volley',
    theme: 'Quiver',
    enabler: {
      id: 'la_volley',
      name: 'Volley',
      description: 'Lightning Arrow throws +1 Projectile.',
      grants: { extraTargets: 1, manaMultiplier: 1.15 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'la_scatter',
          name: 'Scattershot',
          description:
            'Projectiles Spread 60% further, and take the enemies furthest ' +
            'into it rather than the nearest.',
          grants: { spreadRange: 1.6, spreadFar: true, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'la_rain',
          name: 'Rain of Arrows',
          description: 'Lightning Arrow throws +2 Projectiles.',
          grants: { extraTargets: 2, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [COMMON[2], COMMON[0], COMMON[1], COMMON[2]],
  },
  {
    id: 'conduction',
    theme: 'Conduit',
    enabler: {
      id: 'la_conduction',
      name: 'Conduction',
      description: 'Lightning Arrow gains +1 Arc.',
      grants: { chains: 1, manaMultiplier: 1.15 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'la_rebound',
          name: 'Rebound',
          description: 'Arcs deal full damage instead of 70%.',
          grants: { chainDamage: 1, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 5,
        forkFrom: { twig: 0, at: 2 },
        notable: {
          id: 'la_earthchain',
          name: 'Earthing Line',
          description: 'Lightning Arrow gains +2 Arcs.',
          grants: { chains: 2, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [COMMON[0], COMMON[2], COMMON[1], COMMON[0]],
  },
  {
    id: 'mark',
    theme: 'Mark',
    enabler: {
      id: 'la_mark',
      name: 'Mark',
      description: '+8% Momentum per use, up to 60%.',
      grants: { momentum: { per: 8, max: 60 } },
    },
    twigs: [
      {
        minors: 4,
        notable: {
          id: 'la_ranging',
          name: 'Ranging Shot',
          description: 'Momentum builds 4% faster per use.',
          grants: { momentumPer: 4 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'la_deadeye',
          name: 'Dead Eye',
          description: 'Momentum reaches 40% higher.',
          grants: { momentumMax: 40 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'la_quarry',
          name: 'Quarry',
          description:
            'Momentum carries to a new enemy whole instead of being halved, ' +
            'and reaches 15% higher.',
          grants: { momentumKeep: true, momentumMax: 15 },
        },
      },
    ],
    minors: [COMMON[0], { text: '+2% Momentum per use', grants: { momentumPer: 2 } }, COMMON[1], COMMON[2]],
  },
  {
    id: 'ionisation',
    theme: 'Static',
    enabler: {
      id: 'la_takeaim',
      name: 'Live Shaft',
      description:
        'Lightning Arrow cannot Critically strike; a shot that would have ' +
        'leaves an Ailment worth 260% of the hit over 4s.',
      grants: { ailmentChance: 55 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'la_slowdischarge',
          name: 'Slow Discharge',
          description: 'Ailments you apply last 60% longer.',
          grants: { ailmentDuration: 1.6 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'la_searing',
          name: 'Searing Shaft',
          description: 'Ailments you apply deal 35% more damage over a 25% shorter time.',
          grants: { ailmentMultiplier: 1.35, ailmentDuration: 0.75 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'la_earthingfield',
          name: 'Earthing Field',
          description:
            'An Ailment ticking Critically lays the same Ailment on everything within 2 tiles.',
          grants: { ailmentChance: 45, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [
      { text: '+6% increased Ailment Damage', grants: { ailmentMultiplier: 1.06 } },
      { text: '+9% chance to apply Shock', stats: [stat('ailmentChance', 'flat', 9, ['shock'])] },
      COMMON[3],
      { text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
    ],
  },
];

/** Everything true of a bow whatever you build with it. This is the tree where
 *  the conditionals live out here rather than in a branch of their own. */
const TRUNK_NOTABLES: Notable[] = [
  {
    id: 'la_longshot',
    name: 'Long Shot',
    description: 'Lightning Arrow deals 35% more damage to enemies more than 5 tiles away.',
    grants: { moreFar: { beyond: 5, more: 0.35 } },
  },
  {
    id: 'la_hunter',
    name: "Hunter's Opening",
    description: 'Lightning Arrow deals 35% more damage to enemies above 80% of their life.',
    grants: { moreVsFull: { above: 0.8, more: 0.35 } },
  },
  {
    id: 'la_finisher',
    name: 'Finisher',
    description: 'Lightning Arrow deals 35% more damage to enemies below 33% of their life.',
    grants: { moreVsLow: { below: 0.33, more: 0.35 } },
  },
  {
    id: 'la_transmutation',
    name: 'Tipping',
    description: 'Convert Lightning Arrow to another damage type.',
    choices: [
      {
        id: 'fire',
        name: 'Fire Arrow',
        description: 'Lightning Arrow deals Fire damage.',
        grants: { convertTree: 'fire' },
      },
      {
        id: 'physical',
        name: 'Bodkin',
        description: 'Lightning Arrow deals Physical damage.',
        grants: { convertTree: 'physical' },
      },
    ],
  },
  {
    id: 'la_steadyhand',
    name: 'Steady Hand',
    description: 'Lightning Arrow has +11% Critical Chance and +45% Critical Damage.',
    stats: [stat('critChance', 'flat', 11), stat('critMultiplier', 'flat', 45)],
  },
  {
    id: 'la_quickdraw',
    name: 'Quick Draw',
    description: 'Lightning Arrow is loosed 25% faster.',
    stats: [stat('attackSpeed', 'inc', 25)],
  },
];

export const LIGHTNING_ARROW_SPEC: TreeSpec = {
  skillId: 'lightning_arrow',
  prefix: 'la',
  minorName: 'Fletching',
  common: COMMON,
  branches: BRANCHES,
  trunkNotables: TRUNK_NOTABLES,
  // Forks are not in here: the skill looses two of its own, so a node that
  // makes a Fork hit harder does something the moment it is bought.
  needs: {
    momentumPer: 'la_mark',
    momentumMax: 'la_mark',
    momentumKeep: 'la_mark',
    ailmentMultiplier: 'la_takeaim',
    ailmentDuration: 'la_takeaim',
    ailmentChance: 'la_takeaim',
    spreadRange: 'la_volley',
    spreadFar: 'la_volley',
    pierceDamage: 'la_broadhead',
    chainDamage: 'la_conduction',
  },
};
