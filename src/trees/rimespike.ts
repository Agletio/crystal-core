/**
 * Rimespike's web. The spikes come up UNDER one enemy, so nothing here is
 * about a shot: there is no line to pierce along and no neighbour to leap to.
 * What Cold has instead is the CHILL, which is the only Ailment that changes
 * what a body can do rather than how fast it loses life — and a Freeze, which
 * is the only one that stops it outright and hands back a guaranteed Critical.
 *
 * So every branch here is a different answer to the same question: what is a
 * Chill worth, and what happens to the body coming out of one.
 *
 * RIMEFIELD is how one target becomes a room. The Cloud deals nothing and
 * leaves the Chill the build already applies, so the pack clear is the Rime
 * tree reaching more bodies — never a second damage pipeline no danger number
 * accounts for.
 */
import { stat } from './node';
import type { Branch, Minor, Notable, TreeSpec } from './spec';

const COMMON: Minor[] = [
  { text: '+5% increased Cold Damage', stats: [stat('damage', 'inc', 5, ['cold'])] },
  { text: '+4% increased Damage', stats: [stat('damage', 'inc', 4)] },
  { text: '+3% increased Cast Speed', stats: [stat('castSpeed', 'inc', 3)] },
  { text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
  { text: '+8% Critical Damage', stats: [stat('critMultiplier', 'flat', 8)] },
  { text: '+6% increased Area of Effect', stats: [stat('areaOfEffect', 'inc', 6)] },
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
    /**
     * THE ONE MODE SWITCH IN THE GAME. Rimespike stops being cast at your rate
     * and becomes a COOLDOWN: bigger, harder, and what it leaves STANDS,
     * Chilling everything round it while it does. Everything else in this tree
     * makes the cast better; this changes what the cast IS, and a build taking
     * it stops caring about cast speed and starts caring about Skill Cooldown
     * and Area of Effect — which is the whole decision.
     */
    id: 'field',
    theme: 'Rimefield',
    enabler: {
      id: 'rs_field',
      name: 'Rimefield',
      description:
        'Rimespike runs on a 2.5s cooldown, reaches 120% further, deals 100% ' +
        'more damage, and the spike stands for 3.5s, Chilling everything round ' +
        'it every 0.5s.',
      grants: {
        spikeStands: { seconds: 3.5, cooldown: 2.5, radius: 2.2, more: 1 },
        manaMultiplier: 1.2,
      },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'rs_whiteout',
          name: 'Whiteout',
          description: '+35% increased Area of Effect.',
          stats: [stat('areaOfEffect', 'inc', 35)],
        },
      },
      {
        minors: 4,
        notable: {
          id: 'rs_frostfall',
          name: 'Frostfall',
          description: 'The spike stands 2s longer.',
          grants: { spikeLonger: 2 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'rs_bloom',
          name: 'Bloom of Frost',
          description: 'The spike stands 2.5s longer, and +25% increased Area of Effect.',
          grants: { spikeLonger: 2.5 },
          stats: [stat('areaOfEffect', 'inc', 25)],
        },
      },
    ],
    minors: [COMMON[1], COMMON[0], COMMON[2], COMMON[1]],
  },
  {
    // THE IDS ARE THE OLD WARD BRANCH'S: a save points at them. What a Chill
    // ENDS in is the Freeze, and what fills the bar is the standing spike —
    // eight stacks is out of reach of any cast rate, so this branch is what
    // Rimefield's own Chill is FOR. It sells no chance of its own: that is
    // Rime's, and a stat gated there cannot sit in another branch.
    id: 'ward',
    theme: 'Freeze',
    enabler: {
      id: 'rs_ward',
      name: 'Deepfreeze',
      description: 'A Freeze takes 2 fewer stacks of Chill.',
      grants: { freezeSooner: 2 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'rs_frostplate',
          name: 'Lockjaw',
          description: 'A Freeze holds 60% longer.',
          grants: { freezeLonger: 1.6 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'rs_stillness',
          name: 'Killing Cold',
          description: 'Rimespike deals 45% more damage to Frozen enemies.',
          grants: { moreVsFrozen: 0.45 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'rs_wellspring',
          name: 'Everfrost',
          description: 'A Freeze takes 2 fewer stacks of Chill and holds 40% longer.',
          grants: { freezeSooner: 2, freezeLonger: 1.4 },
        },
      },
    ],
    minors: [COMMON[5], COMMON[0], COMMON[4], COMMON[0]],
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
    description: 'Rimespike costs 30% less mana.',
    grants: { manaMultiplier: 0.7 },
  },
  {
    id: 'rs_footwork',
    name: 'Sure Footing',
    description: 'Rimespike is cast 18% faster and reaches 12% further.',
    stats: [stat('castSpeed', 'inc', 18), stat('attackRange', 'inc', 12)],
  },
  {
    id: 'rs_hardy',
    name: 'Hardy',
    description: 'Rimespike has +25% increased Area of Effect.',
    stats: [stat('areaOfEffect', 'inc', 25)],
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
    // And a Cloud is nothing without one to leave.
    spikeLonger: 'rs_field',
    // A Freeze is worth nothing to a build that never gets a body to the bar.
    freezeSooner: 'rs_ward',
    freezeLonger: 'rs_ward',
    moreVsFrozen: 'rs_ward',
  },
};
