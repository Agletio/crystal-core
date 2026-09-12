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
  { name: 'Sharp Weight', text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
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
          description: 'Chills you apply have 70% more duration.',
          grants: { ailmentDuration: 1.7 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'rs_hoar',
          name: 'Hoar',
          description: "Chill's Slow is 45% stronger, up to a maximum Slow of 75%. This does not change the number of " +
          "stacks needed to Freeze.",
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
      { name: 'Numbing', text: '+8% chance to apply Chill', stats: [stat('ailmentChance', 'flat', 8, ['chill'])] },
      { name: 'Lingering', text: 'Chills you apply have 10% more duration', grants: { ailmentDuration: 1.1 } },
      { name: 'Deepening', text: "Chill's Slow is 6% stronger, up to a maximum Slow of 75%", grants: { ailmentMultiplier: 1.06 } },
    ],
  },
  {
    id: 'shatter',
    theme: 'Shatter',
    enabler: {
      id: 'rs_shatter',
      name: 'Shatter',
      description: "Rimespike deals 30% more damage to enemies affected by an Ailment.",
      grants: { moreVsAiling: 0.3 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'rs_splinter',
          name: 'Splintering',
          description: "Rimespike deals 35% more damage to enemies at 33% of maximum Life or less.",
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
      { name: 'Keen Edge', text: '+2% Critical Chance', stats: [stat('critChance', 'flat', 2)] },
      { name: 'Cruel Edge', text: '+12% Critical Damage', stats: [stat('critMultiplier', 'flat', 12)] },
      { name: 'Heavy Ice', text: '+6% increased Damage', stats: [stat('damage', 'inc', 6)] },
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
      description: "Rimespike's initial hit gains 8% more radius per hit from its previous cast, up to 40% more " +
      "radius. Under Rimefield, the standing field keeps its normal radius.",
      grants: { fieldFeeds: { per: 0.08, upTo: 5 } },
      // No field under Hail, so the reach goes into the shards instead.
      under: { rs_tempo: { description: 'Each shard Pierces 1 more enemy.', grants: { pierce: 1 } } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'rs_whiteout',
          name: 'Whiteout',
          description: "Rimespike deals 40% more damage to enemies farther than halfway from the centre to the edge of " +
          "its radius.",
          grants: { rimBite: 0.4 },
          under: { rs_tempo: { description: 'A shard that Pierces carries 100% of its damage on.', grants: { pierceDamage: 1 } } },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'rs_frostfall',
          name: 'Frostfall',
          description: "A cast that hits at least 4 times restores Mana equal to its Mana cost.",
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
          becomes:
            'Ice drives up from the ground every 2.5s, hitting every enemy in a ' +
            '2.9 tile radius, and stands there for 5s, Chilling everything round ' +
            'it every 0.5s.',
          grants: {
            spikeStands: { seconds: 5, cooldown: 2.5, radius: 2.2, more: 1 },
            manaMultiplier: 1.2,
          },
          // On a cooldown, a cast-speed line is dead: it is read as cooldown.
          converts: { castSpeed: { stat: 'cooldown', flip: true, say: ['increased Cast Speed', 'reduced Skill Cooldown'] } },
        },
      },
    ],
    minors: [
      { name: 'Wide Frost', text: '+7% increased Area of Effect', stats: [stat('areaOfEffect', 'inc', 7)] },
      { name: 'Cold Snap', text: '+5% increased Cold Damage', stats: [stat('damage', 'inc', 5, ['cold'])] },
      { name: 'Thin Air', text: 'Rimespike costs 6% less mana', grants: { manaMultiplier: 0.94 } },
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
      description: "Freeze requires 2 fewer Chill stacks, to a minimum of 1.",
      grants: { freezeSooner: 2 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'rs_frostplate',
          name: 'Lockjaw',
          description: "Freeze has 60% more duration.",
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
          description: "Freeze requires 2 fewer Chill stacks, to a minimum of 1, and has 40% more duration.",
          grants: { freezeSooner: 2, freezeLonger: 1.4 },
        },
      },
    ],
    minors: [
      { name: 'Brittle Bones', text: '+10% Critical Damage', stats: [stat('critMultiplier', 'flat', 10)] },
      { name: 'Long Winter', text: 'A Freeze holds 8% longer', grants: { freezeLonger: 1.08 } },
      { name: 'Winter\'s Bite', text: '+5% increased Cold Damage', stats: [stat('damage', 'inc', 5, ['cold'])] },
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
        "Each cast grants a stack of Sleet, giving 5% more Cast Speed per stack. Bonuses add, up to 40% " +
      "at 8 stacks. At maximum stacks, the next cast Freezes what it hits and removes all stacks.",
      grants: { spikeTempo: { per: 5, stacks: 8 } },
      under: {
        rs_field: {
          description:
            "Each cast grants a stack of Sleet, giving 5% faster cooldown recovery per stack. Bonuses add, up " +
          "to 40% at 8 stacks. At maximum stacks, the next cast Freezes what it hits and removes all " +
          "stacks.",
          grants: { spikeTempo: { per: 5, stacks: 8 } },
        },
      },
    },
    // Squall and Tempest hang off ONE minor, either side of it: taking both is
    // a wash, and nothing needs to forbid what nobody would do.
    twigs: [
      {
        minors: 2,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'rs_tempest',
          name: 'Tempest',
          description: '+3 maximum stacks of Sleet.',
          grants: { tempoStacks: 3 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'rs_thrift',
          name: 'Squall',
          description: '-3 maximum stacks of Sleet.',
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
            'Rimespike is thrown as 2 ice Projectiles from you with 100% increased Cast Speed, ' +
            'each dealing 50% less damage. One enemy takes both; more take one each. ' +
            'Gains the Projectile tag and loses the Area tag.',
          becomes:
            'Ice is thrown as 2 Projectiles from where you stand with 100% increased Cast Speed, ' +
            'each dealing 50% less damage. One enemy takes both; more take one each.',
          grants: {
            spikeHail: { projectiles: 2, less: 0.5 },
            manaMultiplier: 0.6,
            addTags: ['projectile'],
            dropTags: ['area'],
          },
          stats: [stat('castSpeed', 'inc', 100)],
          // No circle, so an Area line is read as Projectile Damage.
          converts: { areaOfEffect: { stat: 'damage', tags: ['projectile'], say: ['Area of Effect', 'Projectile Damage'] } },
        },
      },
      {
        minors: 3,
        notable: {
          id: 'rs_flurry',
          name: 'Flurry',
          // A second spike bare; a Projectile is what the same switch IS under Hail.
          description: "Rimespike rises under 1 more enemy on the initial cast. Under Rimefield, only the primary target " +
          "leaves a standing field.",
          grants: { extraTargets: 1 },
          under: { rs_tempo: { description: '+1 Projectile.', grants: { extraTargets: 1 } } },
        },
      },
    ],
    minors: [
      { name: 'Holdfast', text: 'Keep 1 stack of Sleet after a Freeze', grants: { tempoKeep: 1 } },
      { name: 'Gathering Storm', text: '+3% more damage per stack of Sleet', grants: { tempoDamage: 3 } },
      { name: 'Quick Flurries', text: '+4% increased Cast Speed', stats: [stat('castSpeed', 'inc', 4)] },
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
        "Consecutive casts at the same enemy add 8 percentage points to the Deep Cold damage bonus, up " +
      "to 40% more damage. The first cast grants no bonus.",
      grants: { spikeRamp: { per: 0.08, upTo: 5 } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'rs_glacier',
          name: 'Glacier',
          description: "Keep all 5 stacks of Deep Cold when you switch targets.",
          grants: { rampSticks: true },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'rs_permafrost',
          name: 'Permafrost',
          description: "Deep Cold grants 12% more damage per consecutive cast instead of 8%, up to 60% more damage.",
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
      { name: 'Cold Weight', text: '+5% increased Cold Damage', stats: [stat('damage', 'inc', 5, ['cold'])] },
      { text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
      { name: 'Dead Weight', text: '+6% increased Damage', stats: [stat('damage', 'inc', 6)] },
    ],
  },
];

/** Six for any build, and each one a RULE: a flat number here was a node
 *  every build took and none of them remembered. */
const TRUNK_NOTABLES: Notable[] = [
  {
    id: 'rs_focus',
    name: 'Cold Eye',
    description: "+25 percentage points to Critical Chance when the targeted enemy is Chilled.",
    grants: { critVsChilled: 25 },
  },
  {
    id: 'rs_vein',
    name: 'Deep Vein',
    description: "Each kill restores Mana equal to 50% of your most recent cast's Mana cost.",
    grants: { refundOnKill: 0.5 },
  },
  {
    id: 'rs_footwork',
    name: 'Sure Footing',
    description: "The first cast after switching targets has 40% more Cast Speed. Under Rimefield, that cast's " +
    "cooldown also recovers 40% faster.",
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
    description: "Rimespike deals 25% more damage to enemies with no Ailments.",
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
