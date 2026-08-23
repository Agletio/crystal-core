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
    },
    twigs: [
      {
        minors: 4,
        notable: {
          id: 'al_superconductor',
          name: 'Superconductor',
          description: 'Arcs deal full damage instead of 70%.',
          grants: { chainDamage: 1, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 0, at: 2 },
        notable: {
          id: 'al_cascade',
          name: 'Cascade',
          description: 'Arc Lightning gains +3 Arcs.',
          grants: { chains: 3, manaMultiplier: 1.15 },
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
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'al_thunderhead',
          name: 'Thunderhead',
          description: 'Forks deal 75% of the damage instead of 45%.',
          grants: { forkDamage: 0.75, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 3,
        forkFrom: { twig: 0, at: 1 },
        notable: {
          id: 'al_downpour',
          name: 'Downpour',
          description: 'Arc Lightning gains +2 Forks.',
          grants: { forks: 2, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [COMMON[1], COMMON[0], COMMON[2], COMMON[1]],
  },
  {
    id: 'potential',
    theme: 'Potential',
    enabler: {
      id: 'al_potential',
      name: 'Potential',
      description: '+7% Momentum per use, up to 55%.',
      grants: { momentum: { per: 7, max: 55 } },
    },
    twigs: [
      {
        minors: 4,
        notable: {
          id: 'al_capacitor',
          name: 'Capacitor',
          description: 'Momentum builds 4% faster per use.',
          grants: { momentumPer: 4 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'al_reservoir',
          name: 'Reservoir',
          description: 'Momentum reaches 40% higher.',
          grants: { momentumMax: 40 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'al_grounding',
          name: 'Grounding Line',
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
      id: 'al_ionise',
      name: 'Ionise',
      description:
        'Arc Lightning cannot Critically strike; a cast that would have leaves ' +
        'an Ailment worth 240% of the hit over 4s.',
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
          description: 'Ailments you apply deal 35% more damage over a 25% shorter time.',
          grants: { ailmentMultiplier: 1.35, ailmentDuration: 0.75 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'al_staticcling',
          name: 'Static Cling',
          description:
            'An Ailment ticking Critically lays the same Ailment on everything within 2 tiles.',
          grants: { ailmentChance: 45, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [
      { text: '+6% increased Ailment Damage', grants: { ailmentMultiplier: 1.06 } },
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
        },
      },
      {
        minors: 4,
        notable: {
          id: 'al_fan',
          name: 'Fan Out',
          description: 'Arc Lightning throws +1 Projectile.',
          grants: { extraTargets: 1, manaMultiplier: 1.15 },
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
      description: 'Arc Lightning deals 25% more damage to enemies below 50% of their life.',
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
          description: 'Arc Lightning deals 35% more damage to enemies above 80% of their life.',
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
    description: 'Arc Lightning deals 30% more damage to enemies carrying an Ailment.',
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
    description: 'Arc Lightning is cast 25% faster.',
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
    momentumPer: 'al_potential',
    momentumMax: 'al_potential',
    momentumKeep: 'al_potential',
    ailmentMultiplier: 'al_ionise',
    ailmentDuration: 'al_ionise',
    ailmentChance: 'al_ionise',
    spreadRange: 'al_split',
    spreadFar: 'al_split',
    forkDamage: 'al_stormfront',
  },
};
