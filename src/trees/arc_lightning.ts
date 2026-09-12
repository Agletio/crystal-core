/**
 * Arc Lightning's web.
 *
 * The skill arrives already hitting a crowd — three Arcs off the table rather
 * than off a point — so this tree is not about FINDING a second target. It is
 * about what the bolt does once it is already touching four of them: more leaps
 * and better ones, bolts falling out of the sky beside it, a blast at every
 * stop, and an Ailment left where the crit went.
 *
 * That is also why the discount is never on offer here. Bare, one target takes
 * 44 where Fireball lands 72, and no node in this tree gives that back.
 */
import { stat } from './node';
import type { Branch, Minor, Notable, TreeSpec } from './spec';

const COMMON: Minor[] = [
  { text: '+5% increased Lightning Damage', stats: [stat('damage', 'inc', 5, ['lightning'])] },
  { text: '+4% increased Damage', stats: [stat('damage', 'inc', 4)] },
  { text: '+3% increased Cast Speed', stats: [stat('castSpeed', 'inc', 3)] },
  { text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
  { text: '+8% Critical Damage', stats: [stat('critMultiplier', 'flat', 8)] },
  { text: '+4% increased Attack Range', stats: [stat('attackRange', 'inc', 4)] },
];

const BRANCHES: Branch[] = [
  {
    id: 'conduction',
    theme: 'Conduit',
    enabler: {
      id: 'al_conduction',
      name: 'Conduction',
      description: 'Arc Lightning gains +2 Arcs.',
      grants: { chains: 2, manaMultiplier: 1.15 },
      // Nothing Arcs under Cloudburst: the chain walked to reach it is reach.
      under: { al_cloudburst: { description: 'The storm reaches 2 tiles further.', grants: { smite: { reach: 2 }, manaMultiplier: 1.15 } } },
    },
    twigs: [
      {
        minors: 4,
        notable: {
          id: 'al_superconductor',
          name: 'Superconductor',
          description: 'Arcs deal full damage instead of 70%.',
          grants: { chainDamage: 1, manaMultiplier: 1.08 },
          under: { al_cloudburst: { description: "Reduces Cloudburst's damage penalty by 15 percentage points.", grants: { smite: { less: -0.15 }, manaMultiplier: 1.08 } } },
        },
      },
      {
        /**
         * BALL LIGHTNING, the keystone at the tip of the Conduit line: no bolt,
         * a ball that drifts after the body and keeps Arcing, so every Arc the
         * line bought is one more body a tick reaches and the climb runs each
         * tick. What it costs is the hit landing NOW.
         */
        minors: 4,
        forkFrom: { twig: 0, at: 2 },
        notable: {
          id: 'al_ball',
          name: 'Ball Lightning',
          keystone: true,
          description:
            'A ball of lightning drifts after the enemy for 3s, Arcing every 0.4s to what is ' +
            'within 2 tiles of it for 50% less damage. Every Arc is one more body a tick reaches.',
          becomes:
            'You loose a ball of lightning that drifts after the enemy for 3s, Arcing every 0.4s ' +
            'to the nearest bodies within 2 tiles of it for 50% less damage, one more for every Arc. ' +
            'The cast itself hits nothing.',
          grants: { orb: { seconds: 3, every: 0.4, radius: 2, less: 0.5, speed: 2.5 }, manaMultiplier: 1.2 },
        },
      },
    ],
    minors: [COMMON[0], COMMON[2], COMMON[1], COMMON[0]],
  },
  {
    id: 'stormfront',
    theme: 'Skyfall',
    enabler: {
      id: 'al_stormfront',
      name: 'Stormfront',
      description: 'Arc Lightning gains +2 Forks.',
      grants: { forks: 2, manaMultiplier: 1.15 },
      // A Fork is a bolt on a neighbour, which is what a spare bolt is under
      // Cloudburst; under the ball nothing forks, so it is time.
      under: {
        al_cloudburst: { description: '+2 bolts, on the nearest enemies that are not Shocked.', grants: { smite: { extra: 2 }, manaMultiplier: 1.15 } },
        al_ball: { description: 'The ball lasts 1s longer.', grants: { orb: { seconds: 1 }, manaMultiplier: 1.15 } },
      },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'al_thunderhead',
          name: 'Thunderhead',
          description: 'Forks deal 75% of the damage instead of 45%.',
          grants: { forkDamage: 0.75, manaMultiplier: 1.08 },
          under: {
            al_cloudburst: { description: "Reduces Cloudburst's damage penalty by 15 percentage points.", grants: { smite: { less: -0.15 }, manaMultiplier: 1.08 } },
            al_ball: { description: "Reduces Ball Lightning's damage penalty by 15 percentage points.", grants: { orb: { less: -0.15 }, manaMultiplier: 1.08 } },
          },
        },
      },
      {
        /**
         * CLOUDBURST, the keystone at the tip of the Skyfall line: the bolt
         * comes down on the body you aimed at and on every Shocked enemy near
         * you, so the Static line is the engine and the room is the target.
         */
        minors: 3,
        forkFrom: { twig: 0, at: 1 },
        notable: {
          id: 'al_cloudburst',
          name: 'Cloudburst',
          keystone: true,
          description:
            'The bolt falls from the sky on the enemy you aimed at and on every Shocked enemy ' +
            'within 6 tiles of you, 40% less damage each. Nothing Arcs or Forks.',
          becomes:
            'Lightning falls from the sky on the enemy you aimed at and on every Shocked enemy ' +
            'within 6 tiles of you, 40% less damage each. Nothing Arcs or Forks: what is Shocked is the target.',
          grants: { smite: { less: 0.4, reach: 6 }, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [COMMON[1], COMMON[0], COMMON[2], COMMON[1]],
  },
  {
    /**
     * THE CHAIN RUNS THE OTHER WAY. Bare, each Arc lands for 70% of the one
     * before it and the bolt fades out; here it CLIMBS, so the far end of the
     * chain is the biggest hit in the cast and the build is pointed at a wall
     * of bodies rather than at one. The whole branch is that one inversion,
     * and the fork is the trade the other way — fewer Arcs, each worth more.
     */
    id: 'runaway',
    theme: 'Runaway',
    enabler: {
      id: 'al_potential',
      name: 'Runaway',
      description: "Each Arc after the first deals 25% more damage than the previous Arc. The first Arc keeps its " +
      "usual share of the initial hit.",
      grants: { chainBuild: 1.25, manaMultiplier: 1.15 },
      under: { al_cloudburst: { description: 'Each bolt deals 10% more than the one before it.', grants: { smite: { build: 0.1 }, manaMultiplier: 1.15 } } },
    },
    twigs: [
      {
        minors: 4,
        notable: {
          id: 'al_capacitor',
          name: 'Avalanche',
          description: "Raises Runaway's damage growth from 25% to 50% per Arc after the first.",
          grants: { chainBuild: 1.2, manaMultiplier: 1.08 },
          under: { al_cloudburst: { description: "Adds 8 percentage points to Runaway's damage growth per bolt, for 18% more damage with each " +
                                    "successive bolt.", grants: { smite: { build: 0.08 }, manaMultiplier: 1.08 } } },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'al_reservoir',
          name: 'Long Line',
          description: "Arc Lightning gains +2 Arcs.",
          grants: { chains: 2, manaMultiplier: 1.15 },
          under: { al_cloudburst: { description: 'The storm reaches 2 tiles further.', grants: { smite: { reach: 2 }, manaMultiplier: 1.15 } } },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'al_grounding',
          name: 'Short Circuit',
          description: "Arc Lightning loses 2 Arcs and has 45% increased Damage.",
          stats: [stat('damage', 'inc', 45)],
          grants: { chains: -2 },
          under: { al_cloudburst: { description: 'The storm reaches 2 tiles less, and Arc Lightning deals 45% increased Damage.', stats: [stat('damage', 'inc', 45)], grants: { smite: { reach: -2 } } } },
        },
      },
    ],
    minors: [COMMON[0], COMMON[3], COMMON[1], COMMON[2]],
  },
  {
    id: 'ionisation',
    theme: 'Static',
    enabler: {
      id: 'al_ionise',
      name: 'Ionise',
      description: '+55% chance to apply Shock.',
      grants: { ailmentChance: 55 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'al_slowdischarge',
          name: 'Slow Discharge',
          description: 'Ailments you apply last 60% longer.',
          grants: { ailmentDuration: 1.6 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'al_searing',
          name: 'Searing Charge',
          description: "Ailments you apply deal 35% more damage per second and have 25% less duration.",
          grants: { ailmentMultiplier: 1.35, ailmentDuration: 0.75 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'al_staticcling',
          name: 'Static Cling',
          description: '+45% chance to apply Shock.',
          grants: { ailmentChance: 45, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [
      { text: "+6% more Ailment Damage", grants: { ailmentMultiplier: 1.06 } },
      { text: '+9% chance to apply Shock', stats: [stat('ailmentChance', 'flat', 9, ['shock'])] },
      COMMON[0],
      { text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
    ],
  },
  {
    id: 'volley',
    theme: 'Fan',
    enabler: {
      id: 'al_split',
      name: 'Split Bolt',
      description: 'Arc Lightning throws +1 Projectile.',
      grants: { extraTargets: 1, manaMultiplier: 1.15 },
      under: {
        al_ball: { description: '+1 ball of lightning, after another enemy.', grants: { extraTargets: 1, manaMultiplier: 1.15 } },
        al_cloudburst: { description: '+1 bolt, on the nearest enemy that is not Shocked.', grants: { smite: { extra: 1 }, manaMultiplier: 1.15 } },
      },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'al_scatter',
          name: 'Scattershot',
          description:
            'Projectiles Spread 60% further, and take the enemies furthest ' +
            'into it rather than the nearest.',
          grants: { spreadRange: 1.6, spreadFar: true, manaMultiplier: 1.08 },
          under: {
            al_ball: { description: 'Balls Spread 60% further, after the enemies furthest into it rather than the nearest.', grants: { spreadRange: 1.6, spreadFar: true, manaMultiplier: 1.08 } },
            al_cloudburst: { description: 'The storm reaches 2 tiles further.', grants: { smite: { reach: 2 }, manaMultiplier: 1.08 } },
          },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'al_fan',
          name: 'Fan Out',
          description: 'Arc Lightning throws +1 Projectile.',
          grants: { extraTargets: 1, manaMultiplier: 1.15 },
          under: {
            al_ball: { description: '+1 ball of lightning, after another enemy.', grants: { extraTargets: 1, manaMultiplier: 1.15 } },
            al_cloudburst: { description: '+1 bolt, on the nearest enemy that is not Shocked.', grants: { smite: { extra: 1 }, manaMultiplier: 1.15 } },
          },
        },
      },
    ],
    minors: [COMMON[2], COMMON[1], COMMON[0], COMMON[2]],
  },
  {
    id: 'earthing',
    theme: 'Malice',
    enabler: {
      id: 'al_earthed',
      name: 'Earthed',
      description: "Arc Lightning deals 25% more damage to enemies at 50% of maximum Life or less.",
      grants: { moreVsLow: { below: 0.5, more: 0.25 } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'al_pointblank',
          name: 'Second Wind',
          description: 'For 4s after a kill, Arc Lightning deals 30% more damage.',
          grants: { killMore: { seconds: 4, more: 0.3 } },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'al_firstlight',
          name: 'First Light',
          description: "Arc Lightning deals 35% more damage to enemies at 80% of maximum Life or more.",
          grants: { moreVsFull: { above: 0.8, more: 0.35 } },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'al_dischargecycle',
          name: 'Discharge Cycle',
          description: 'Every 4th cast of Arc Lightning deals 260% damage.',
          grants: { everyNth: { n: 4, multiplier: 2.6 } },
        },
      },
    ],
    minors: [COMMON[3], COMMON[4], COMMON[1], COMMON[3]],
  },
];

/** The trunk's own. Every one of them works for a bolt with three Arcs and no
 *  points spent, which is what earns a place out where nothing is unlocked. */
const TRUNK_NOTABLES: Notable[] = [
  {
    id: 'al_longreach',
    name: 'Long Reach',
    description: 'Arc Lightning deals 30% more damage while nothing has hit you for 3s.',
    grants: { untouchedMore: { after: 3, more: 0.3 } },
  },
  {
    id: 'al_transformer',
    name: 'Transformer',
    description: 'Convert Arc Lightning to another damage type.',
    choices: [
      {
        id: 'fire',
        name: 'Emberarc',
        description: 'Arc Lightning deals Fire damage.',
        grants: { convertTree: 'fire' },
      },
      {
        id: 'cold',
        name: 'Frostarc',
        description: 'Arc Lightning deals Cold damage.',
        grants: { convertTree: 'cold' },
      },
    ],
  },
  {
    id: 'al_overvolt',
    name: 'Overvolt',
    // The one trunk notable written for THIS skill rather than for any: a bolt
    // that already touches four enemies pays for a flat multiplier four times.
    description: 'Arc Lightning deals 40% more damage and costs 60% more mana per use.',
    stats: [stat('damage', 'more', 40)],
    grants: { manaMultiplier: 1.6 },
  },
  {
    id: 'al_saturation',
    name: 'Saturation',
    description: "Arc Lightning deals 30% more damage to enemies affected by an Ailment.",
    grants: { moreVsAiling: 0.3 },
  },
  {
    id: 'al_focus',
    name: 'Narrow Focus',
    description: 'Arc Lightning has +11% Critical Chance and +45% Critical Damage.',
    stats: [stat('critChance', 'flat', 11), stat('critMultiplier', 'flat', 45)],
  },
  {
    id: 'al_stormcall',
    name: 'Storm Call',
    description: "Arc Lightning has 25% increased Cast Speed.",
    stats: [stat('castSpeed', 'inc', 25)],
  },
];

export const ARC_LIGHTNING_SPEC: TreeSpec = {
  skillId: 'arc_lightning',
  prefix: 'al',
  minorName: 'Spark',
  common: COMMON,
  branches: BRANCHES,
  trunkNotables: TRUNK_NOTABLES,
  // Arcs are not in here: the skill has three of its own, so a node that makes
  // an Arc better does something the moment it is bought.
  needs: {
    chainBuild: 'al_potential',
    ailmentMultiplier: 'al_ionise',
    ailmentDuration: 'al_ionise',
    ailmentChance: 'al_ionise',
    spreadRange: 'al_split',
    spreadFar: 'al_split',
    forkDamage: 'al_stormfront',
  },
};
