/**
 * Rimespike's web. The spikes come up UNDER one enemy, so nothing here is
 * about a shot: there is no line to pierce along and no neighbour to leap to.
 * What Cold has instead is the CHILL, which is the only Ailment that changes
 * what a body can do rather than how fast it loses life — and a Freeze, which
 * is the only one that stops it outright and hands back a guaranteed Critical.
 *
 * So every branch here is a different answer to the same question: what is a
 * Chill worth, and what happens to the body coming out of one.
 */
import { stat } from './node';
import type { Branch, Minor, Notable, TreeSpec } from './spec';

const COMMON: Minor[] = [
  { text: '+5% increased Cold Damage', stats: [stat('damage', 'inc', 5, ['cold'])] },
  { text: '+4% increased Damage', stats: [stat('damage', 'inc', 4)] },
  { text: '+3% increased Cast Speed', stats: [stat('castSpeed', 'inc', 3)] },
  { text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
  { text: '+8% Critical Damage', stats: [stat('critMultiplier', 'flat', 8)] },
  { text: '+4% maximum Life', stats: [stat('life', 'inc', 4)] },
];

const BRANCHES: Branch[] = [
  {
    id: 'rime',
    theme: 'Rime',
    enabler: {
      id: 'rs_rime',
      name: 'Rime',
      description: '+55% chance to apply Chill.',
      grants: { ailmentChance: 55 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'rs_bitter',
          name: 'Bitter Cold',
          description: 'Chills you apply last 70% longer.',
          grants: { ailmentDuration: 1.7 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'rs_hoar',
          name: 'Hoar',
          description: 'Chills you apply are 45% stronger.',
          grants: { ailmentMultiplier: 1.45 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'rs_killingfrost',
          name: 'Killing Frost',
          description: '+45% chance to apply Chill.',
          grants: { ailmentChance: 45, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [
      { text: '+9% chance to apply Chill', stats: [stat('ailmentChance', 'flat', 9, ['chill'])] },
      { text: '+6% increased Chill Damage', grants: { ailmentMultiplier: 1.06 } },
      COMMON[0],
      COMMON[3],
    ],
  },
  {
    id: 'shatter',
    theme: 'Shatter',
    enabler: {
      id: 'rs_shatter',
      name: 'Shatter',
      description: 'Rimespike deals 30% more damage to enemies carrying an Ailment.',
      grants: { moreVsAiling: 0.3 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'rs_splinter',
          name: 'Splintering',
          description: 'Rimespike deals 35% more damage to enemies below 33% of their life.',
          grants: { moreVsLow: { below: 0.33, more: 0.35 } },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'rs_glassing',
          name: 'Glassing',
          description: 'Rimespike has +14% Critical Chance and +70% Critical Damage.',
          stats: [stat('critChance', 'flat', 14), stat('critMultiplier', 'flat', 70)],
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'rs_avalanche',
          name: 'Avalanche',
          description: 'Every 4th cast of Rimespike deals 260% damage.',
          grants: { everyNth: { n: 4, multiplier: 2.6 } },
        },
      },
    ],
    minors: [COMMON[3], COMMON[4], COMMON[1], COMMON[4]],
  },
  {
    id: 'depth',
    theme: 'Depth',
    enabler: {
      id: 'rs_depth',
      name: 'From Below',
      description: 'Rimespike deals 30% more damage to enemies more than 3 tiles away.',
      grants: { moreFar: { beyond: 3, more: 0.3 } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'rs_reach',
          name: 'Long Winter',
          description: 'Rimespike reaches 30% further, and is cast 6% faster.',
          stats: [stat('attackRange', 'inc', 30), stat('castSpeed', 'inc', 6)],
        },
      },
      {
        minors: 4,
        notable: {
          id: 'rs_underfoot',
          name: 'Underfoot',
          description: 'Rimespike deals 35% more damage to enemies within 2.5 tiles of you.',
          grants: { moreClose: { within: 2.5, more: 0.35 } },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'rs_firstblood',
          name: 'First Frost',
          description: 'Rimespike deals 40% more damage to enemies above 80% of their life.',
          grants: { moreVsFull: { above: 0.8, more: 0.4 } },
        },
      },
    ],
    minors: [COMMON[1], COMMON[0], COMMON[2], COMMON[1]],
  },
  {
    id: 'ward',
    theme: 'Ward',
    enabler: {
      id: 'rs_ward',
      name: 'Cold Ward',
      description:
        'Standing still to cast is standing in it: +20% maximum Life and +25% ' +
        'Cold Resistance.',
      stats: [stat('life', 'inc', 20), stat('coldRes', 'flat', 25)],
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'rs_frostplate',
          name: 'Frostplate',
          description: '45% increased Armour.',
          stats: [stat('armour', 'inc', 45)],
        },
      },
      {
        minors: 4,
        notable: {
          id: 'rs_stillness',
          name: 'Stillness',
          description: '20% maximum Life, and 130% increased Life Regeneration.',
          stats: [stat('life', 'inc', 20), stat('lifeRegen', 'inc', 130)],
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'rs_wellspring',
          name: 'Wellspring',
          description: '35% maximum Mana, and 60% increased Mana Regeneration.',
          stats: [stat('mana', 'inc', 35), stat('manaRegen', 'inc', 60)],
        },
      },
    ],
    minors: [
      COMMON[5],
      { text: '+6% increased Armour', stats: [stat('armour', 'inc', 6)] },
      COMMON[5],
      { text: '+8% Cold Resistance', stats: [stat('coldRes', 'flat', 8)] },
    ],
  },
  {
    id: 'tempo',
    theme: 'Tempo',
    enabler: {
      id: 'rs_tempo',
      name: 'Quickening',
      description: 'Rimespike is cast 22% faster.',
      stats: [stat('castSpeed', 'inc', 22)],
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'rs_flurry',
          name: 'Flurry',
          description: '25% increased Cast Speed.',
          stats: [stat('castSpeed', 'inc', 25)],
        },
      },
      {
        minors: 4,
        notable: {
          id: 'rs_thrift',
          name: 'Thrift',
          description: 'Rimespike costs 25% less mana.',
          stats: [stat('manaCost', 'inc', -25)],
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'rs_relentless',
          name: 'Unrelenting',
          description: '30% increased Cast Speed, and 25% increased Damage.',
          stats: [stat('castSpeed', 'inc', 30), stat('damage', 'inc', 25)],
        },
      },
    ],
    minors: [COMMON[2], COMMON[1], COMMON[2], COMMON[0]],
  },
  {
    id: 'weight',
    theme: 'Weight',
    enabler: {
      id: 'rs_weight',
      name: 'Deep Cold',
      description: 'Rimespike deals 40% more damage and is cast 15% slower.',
      stats: [stat('damage', 'more', 40), stat('castSpeed', 'inc', -15)],
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'rs_glacier',
          name: 'Glacier',
          description: '30% more damage.',
          stats: [stat('damage', 'more', 30)],
        },
      },
      {
        minors: 4,
        notable: {
          id: 'rs_permafrost',
          name: 'Permafrost',
          description: '55% increased Cold Damage.',
          stats: [stat('damage', 'inc', 55, ['cold'])],
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'rs_transmutation',
          name: 'Transmutation',
          description: 'Convert Rimespike to another damage type.',
          choices: [
            {
              id: 'fire',
              name: 'Thawing',
              description: 'Rimespike deals Fire damage.',
              grants: { convertTree: 'fire' },
            },
            {
              id: 'lightning',
              name: 'Static',
              description: 'Rimespike deals Lightning damage.',
              grants: { convertTree: 'lightning' },
            },
            {
              id: 'physical',
              name: 'Stonespike',
              description: 'Rimespike deals Physical damage.',
              grants: { convertTree: 'physical' },
            },
          ],
        },
      },
    ],
    minors: [COMMON[0], COMMON[1], COMMON[0], COMMON[4]],
  },
];

const TRUNK_NOTABLES: Notable[] = [
  {
    id: 'rs_focus',
    name: 'Cold Eye',
    description: 'Rimespike has +11% Critical Chance and +45% Critical Damage.',
    stats: [stat('critChance', 'flat', 11), stat('critMultiplier', 'flat', 45)],
  },
  {
    id: 'rs_vein',
    name: 'Deep Vein',
    description: '+30% maximum Mana, and 45% increased Mana Regeneration.',
    stats: [stat('mana', 'inc', 30), stat('manaRegen', 'inc', 45)],
  },
  {
    id: 'rs_footwork',
    name: 'Sure Footing',
    description: 'You move 18% faster, and Rimespike is cast 8% faster.',
    stats: [stat('moveSpeed', 'inc', 18), stat('castSpeed', 'inc', 8)],
  },
  {
    id: 'rs_hardy',
    name: 'Hardy',
    description: '+18% maximum Life and +20% Cold Resistance.',
    stats: [stat('life', 'inc', 18), stat('coldRes', 'flat', 20)],
  },
  {
    id: 'rs_bite',
    name: 'Bite',
    description: '+45% increased Cold Damage.',
    stats: [stat('damage', 'inc', 45, ['cold'])],
  },
  {
    id: 'rs_measure',
    name: 'Measure',
    description: 'Rimespike is cast 25% faster.',
    stats: [stat('castSpeed', 'inc', 25)],
  },
];

export const RIMESPIKE_SPEC: TreeSpec = {
  skillId: 'rimespike',
  prefix: 'rs',
  minorName: 'Frost',
  common: COMMON,
  branches: BRANCHES,
  trunkNotables: TRUNK_NOTABLES,
  // A Chill is what everything here is worth, and none of the three switches
  // that tune one does a thing until something is applying them.
  needs: {
    ailmentChance: 'rs_rime',
    ailmentMultiplier: 'rs_rime',
    ailmentDuration: 'rs_rime',
  },
};
