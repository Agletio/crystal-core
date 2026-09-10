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
 * RIMEFIELD is how one target becomes a room, and HAIL is how the spike
 * becomes a shot: the two modes, and a build takes one.
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
        minors: 3,
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
      { text: '+8% chance to apply Chill', stats: [stat('ailmentChance', 'flat', 8, ['chill'])] },
      { text: 'Chills you apply last 10% longer', grants: { ailmentDuration: 1.1 } },
      { text: 'Chills you apply are 6% stronger', grants: { ailmentMultiplier: 1.06 } },
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
          description: 'A Critical shatters: 60% of the hit lands on everything within 1.5 tiles of the body it struck.',
          grants: { shatterShare: 0.6 },
        },
      },
      {
        minors: 3,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'rs_avalanche',
          name: 'Avalanche',
          description: 'Every 4th cast of Rimespike deals 260% damage.',
          grants: { everyNth: { n: 4, multiplier: 2.6 } },
        },
      },
    ],
    minors: [
      { text: '+2% Critical Chance', stats: [stat('critChance', 'flat', 2)] },
      { text: '+12% Critical Damage', stats: [stat('critMultiplier', 'flat', 12)] },
      { text: '+6% increased Damage', stats: [stat('damage', 'inc', 6)] },
    ],
  },
  {
    /**
     * THE AREA LINE, and RIMEFIELD is its KEYSTONE at the tip: Rimespike stops
     * being cast at your rate and becomes a COOLDOWN — bigger, harder, and
     * what it leaves STANDS, Chilling everything round it while it does. A
     * build taking it stops caring about cast speed and starts caring about
     * Skill Cooldown and Area of Effect, which is the whole decision. One
     * keystone a tree, so Hail and this are never both live.
     */
    id: 'field',
    theme: 'Rimefield',
    enabler: {
      id: 'rs_frostwork',
      name: 'Frostwork',
      description: 'Rimespike reaches 8% further for every enemy the last cast hit, up to 5 (40%).',
      grants: { fieldFeeds: { per: 0.08, upTo: 5 } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'rs_whiteout',
          name: 'Whiteout',
          description: 'Enemies in the outer half of the field take 40% more damage.',
          grants: { rimBite: 0.4 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'rs_frostfall',
          name: 'Frostfall',
          description: 'Hitting 4 or more enemies refunds all of the mana the cast cost.',
          grants: { refundOnCrowd: { hits: 4, share: 1 } },
        },
      },
      {
        minors: 3,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'rs_field',
          name: 'Rimefield',
          keystone: true,
          description:
            'Rimespike runs on a 2.5s cooldown, reaches 120% further, deals 100% ' +
            'more damage, and the spike stands for 5s, Chilling everything round ' +
            'it every 0.5s.',
          grants: {
            spikeStands: { seconds: 5, cooldown: 2.5, radius: 2.2, more: 1 },
            manaMultiplier: 1.2,
          },
        },
      },
    ],
    minors: [
      { text: '+7% increased Area of Effect', stats: [stat('areaOfEffect', 'inc', 7)] },
      { text: '+5% increased Cold Damage', stats: [stat('damage', 'inc', 5, ['cold'])] },
      { text: 'Rimespike costs 6% less mana', grants: { manaMultiplier: 0.94 } },
    ],
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
        minors: 3,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'rs_wellspring',
          name: 'Everfrost',
          description: 'A Freeze takes 2 fewer stacks of Chill and holds 40% longer.',
          grants: { freezeSooner: 2, freezeLonger: 1.4 },
        },
      },
    ],
    minors: [
      { text: '+10% Critical Damage', stats: [stat('critMultiplier', 'flat', 10)] },
      { text: 'A Freeze holds 8% longer', grants: { freezeLonger: 1.08 } },
      { text: '+5% increased Cold Damage', stats: [stat('damage', 'inc', 5, ['cold'])] },
    ],
  },
  {
    /**
     * SLEET, and HAIL is its KEYSTONE at the tip. Every cast stacks Cast
     * Speed; at the bar the next cast FREEZES what it hits and spends the
     * stacks, so the branch is a rhythm rather than a number, and the small
     * nodes past it are what a stack is worth and how many survive the
     * Freeze. Hail is the mode: no spike at all, the cast thrown as ice
     * Projectiles from where you stand. The ids are the old Tempo branch's.
     */
    id: 'tempo',
    theme: 'Sleet',
    enabler: {
      id: 'rs_sleet',
      name: 'Sleet',
      description:
        'Each cast grants a stack of Sleet, 5% increased Cast Speed each. At 8 stacks ' +
        'the next cast Freezes what it hits and spends them all.',
      grants: { spikeTempo: { per: 5, stacks: 8 } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'rs_flurry',
          name: 'Flurry',
          description: '+1 Projectile.',
          grants: { extraTargets: 1 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'rs_thrift',
          name: 'Squall',
          description: 'Sleet Freezes 3 stacks sooner.',
          grants: { tempoStacks: -3 },
        },
      },
      {
        minors: 3,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'rs_tempo',
          name: 'Hail',
          keystone: true,
          description:
            'Rimespike is thrown as 2 ice Projectiles from you, cast 100% faster, ' +
            'each dealing 50% less damage. One enemy takes both; more take one each.',
          grants: { spikeHail: { projectiles: 2, less: 0.5 }, manaMultiplier: 0.6 },
          stats: [stat('castSpeed', 'inc', 100)],
        },
      },
    ],
    minors: [
      { text: 'Keep 1 stack of Sleet after a Freeze', grants: { tempoKeep: 1 } },
      { text: '+3% more damage per stack of Sleet', grants: { tempoDamage: 3 } },
      { text: '+4% increased Cast Speed', stats: [stat('castSpeed', 'inc', 4)] },
    ],
  },
  {
    // DEEP COLD is the damage branch, and it is a ramp rather than a number:
    // casting at one body in a row is what it pays for, so a build that
    // sweeps a room is worth less here than one that stands and hammers.
    id: 'weight',
    theme: 'Deep Cold',
    enabler: {
      id: 'rs_weight',
      name: 'Deep Cold',
      description:
        'Each cast of Rimespike in a row at the same enemy deals 8% more damage ' +
        'than the last, up to 5 (40%).',
      grants: { spikeRamp: { per: 0.08, upTo: 5 } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'rs_glacier',
          name: 'Glacier',
          description: 'All 5 casts of Deep Cold hold when you cast at another enemy.',
          grants: { rampSticks: true },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'rs_permafrost',
          name: 'Permafrost',
          description: 'Each Deep Cold cast is worth 4% more, 12% in all.',
          grants: { spikeRamp: { per: 0.04 } },
        },
      },
      {
        minors: 3,
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
    minors: [
      { text: '+5% increased Cold Damage', stats: [stat('damage', 'inc', 5, ['cold'])] },
      { text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
      { text: '+6% increased Damage', stats: [stat('damage', 'inc', 6)] },
    ],
  },
];

/** Six for any build, and each one a RULE: a flat number here was a node
 *  every build took and none of them remembered. */
const TRUNK_NOTABLES: Notable[] = [
  {
    id: 'rs_focus',
    name: 'Cold Eye',
    description: '+25% Critical Chance against a Chilled enemy.',
    grants: { critVsChilled: 25 },
  },
  {
    id: 'rs_vein',
    name: 'Deep Vein',
    description: 'A kill refunds 50% of the mana the cast cost.',
    grants: { refundOnKill: 0.5 },
  },
  {
    id: 'rs_footwork',
    name: 'Sure Footing',
    description: 'The first cast at an enemy is 40% faster.',
    grants: { freshFaster: 40 },
  },
  {
    id: 'rs_hardy',
    name: 'Hardy',
    description: 'An enemy killed by Rimespike bursts: 40% of the hit to everything within 1.5 tiles.',
    grants: { burstOnKill: 0.4 },
  },
  {
    id: 'rs_bite',
    name: 'Bite',
    description: 'Rimespike deals 25% more damage to enemies carrying no Ailment.',
    grants: { moreVsClean: 0.25 },
  },
  {
    id: 'rs_measure',
    name: 'Measure',
    description: 'Every 3rd cast at the same enemy costs no mana.',
    grants: { freeNth: 3 },
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
    // A Freeze is worth nothing to a build that never gets a body to the bar.
    freezeSooner: 'rs_ward',
    freezeLonger: 'rs_ward',
    moreVsFrozen: 'rs_ward',
    // A step on the ramp is nothing without the ramp, and neither is holding it.
    spikeRamp: 'rs_weight',
    rampSticks: 'rs_weight',
    // A stack of Sleet is nothing without Sleet.
    tempoKeep: 'rs_sleet',
    tempoDamage: 'rs_sleet',
    tempoStacks: 'rs_sleet',
  },
};
