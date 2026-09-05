/**
 * Creeping Blight's web. The skill deals no hit at all, so everything here is
 * about the cloud: how wide it is, how long it lasts, how many there are, and
 * whether a critical tick plants another one.
 *
 * Area of Effect sits on the TRUNK rather than behind a branch, which is the
 * opposite of Fireball — a bigger circle is what Blight does bare, so it helps
 * whatever you go on to build. Rupture is where the exception lives: it turns
 * the cast into a hit, and a hit is the one thing armour can blunt.
 */
import { stat } from './node';
import type { Branch, Minor, Notable, TreeSpec } from './spec';

const COMMON: Minor[] = [
  { text: '+5% increased Poison Damage', stats: [stat('damage', 'inc', 5, ['poison'])] },
  { text: '+4% increased Damage', stats: [stat('damage', 'inc', 4)] },
  { text: '+3% increased Cast Speed', stats: [stat('castSpeed', 'inc', 3)] },
  { text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
  { text: '+8% Critical Damage', stats: [stat('critMultiplier', 'flat', 8)] },
  { text: '+4% increased Area of Effect', stats: [stat('areaOfEffect', 'inc', 4)] },
];

const BRANCHES: Branch[] = [
  {
    id: 'contagion',
    theme: 'Bloom',
    enabler: {
      id: 'bl_contagion',
      name: 'Contagion',
      description:
        'A Poison ticking Critically plants a fresh Cloud, 1.6 tiles across, ' +
        'around whatever it ticked on.',
      grants: { contagionRadius: 1.6, manaMultiplier: 1.15 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bl_epidemic',
          name: 'Epidemic',
          description: 'A Cloud planted by a Critical tick is 0.9 tiles wider.',
          grants: { contagionRadius: 0.9, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bl_pandemic',
          name: 'Pandemic',
          description: 'A Cloud a Critical tick plants is +1.2 tiles wider.',
          grants: { contagionRadius: 1.2, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 3,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bl_plaguebearer',
          name: 'Plaguebearer',
          description:
            'Ticks Critically strike +7% more often, and the Clouds they plant ' +
            'are 0.8 tiles wider.',
          stats: [stat('critChance', 'flat', 7)],
          grants: { contagionRadius: 0.8, manaMultiplier: 1.08 },
        },
      },
    ],
    minors: [COMMON[3], COMMON[4], COMMON[0], COMMON[3]],
  },
  {
    id: 'fixation',
    theme: 'Fixation',
    enabler: {
      id: 'bl_fixation',
      name: 'Fixation',
      description: '+7% Momentum per use, up to 55%.',
      grants: { momentum: { per: 7, max: 55 } },
    },
    twigs: [
      {
        minors: 4,
        notable: {
          id: 'bl_saturation',
          name: 'Saturation',
          description: 'Momentum builds 4% faster per use.',
          grants: { momentumPer: 4 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bl_deepening',
          name: 'Deepening',
          description: 'Momentum reaches 40% higher.',
          grants: { momentumMax: 40 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bl_takehold',
          name: 'Taking Hold',
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
    id: 'miasma',
    theme: 'Miasma',
    enabler: {
      id: 'bl_miasma',
      name: 'Miasma',
      description: 'Blight drops +1 Cloud, on another enemy near the target.',
      grants: { extraFields: 1, manaMultiplier: 1.15 },
    },
    twigs: [
      {
        minors: 4,
        notable: {
          id: 'bl_choking',
          name: 'Choking Haze',
          description: '+1 Cloud.',
          grants: { extraFields: 1, manaMultiplier: 1.15 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bl_smother',
          name: 'Smother',
          description: '+2 Clouds.',
          grants: { extraFields: 2, manaMultiplier: 1.15 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bl_shroud',
          name: 'Shroud',
          description: '+2 Clouds, and every Cloud covers 15% more ground.',
          grants: { extraFields: 2, fieldRadius: 1.15, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [COMMON[2], COMMON[1], COMMON[0], COMMON[2]],
  },
  {
    id: 'virulence',
    theme: 'Virulence',
    enabler: {
      id: 'bl_virulence',
      name: 'Virulence',
      description: 'The Poison deals 50% more damage over a 35% shorter time.',
      grants: { ailmentMultiplier: 1.5, ailmentDuration: 0.65 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bl_septic',
          name: 'Septic',
          description: 'The Poison deals 30% more damage.',
          grants: { ailmentMultiplier: 1.3 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bl_lingering',
          name: 'Lingering Rot',
          description: 'The Poison lasts 70% longer.',
          grants: { ailmentDuration: 1.7 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bl_necrosis',
          name: 'Necrosis',
          description: 'The Poison deals a further 35% more damage.',
          grants: { ailmentMultiplier: 1.35 },
        },
      },
    ],
    minors: [
      { text: '+6% increased Poison Damage', grants: { ailmentMultiplier: 1.06 } },
      { text: '+4% increased Poison Duration', grants: { ailmentDuration: 1.04 } },
      COMMON[1],
      COMMON[0],
    ],
  },
  {
    id: 'canopy',
    theme: 'Canopy',
    enabler: {
      id: 'bl_canopy',
      name: 'Canopy',
      description: 'The Cloud covers 55% more ground, and its Poison deals 12% less damage.',
      grants: { fieldRadius: 1.55, ailmentMultiplier: 0.88, manaMultiplier: 1.08 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bl_overgrowth',
          name: 'Overgrowth',
          description: 'The Cloud covers 30% more ground again.',
          grants: { fieldRadius: 1.3, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bl_thicket',
          name: 'Thicket',
          description: 'Blight has 25% increased Area of Effect.',
          stats: [stat('areaOfEffect', 'inc', 25)],
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bl_wildgrowth',
          name: 'Wildgrowth',
          description: 'The Cloud covers 25% more ground, and +15% increased Area of Effect.',
          stats: [stat('areaOfEffect', 'inc', 15)],
          grants: { fieldRadius: 1.25, manaMultiplier: 1.08 },
        },
      },
    ],
    minors: [COMMON[5], COMMON[0], COMMON[5], COMMON[1]],
  },
  {
    id: 'spite',
    theme: 'Spite',
    enabler: {
      id: 'bl_spite',
      name: 'Spite',
      description: 'For 4s after a kill, Blight deals 30% more damage.',
      grants: { killMore: { seconds: 4, more: 0.3 } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bl_wither',
          name: 'Wither',
          description: 'Blight deals 40% more damage to enemies below 33% of their life.',
          grants: { moreVsLow: { below: 0.33, more: 0.4 } },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bl_dread',
          name: 'Dread',
          description: 'Blight deals 35% more damage to enemies above 80% of their life.',
          grants: { moreVsFull: { above: 0.8, more: 0.35 } },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bl_surge',
          name: 'Surge',
          description: 'Every 4th cast of Blight deals 250% damage.',
          grants: { everyNth: { n: 4, multiplier: 2.5 } },
        },
      },
    ],
    minors: [COMMON[3], COMMON[4], COMMON[1], COMMON[3]],
  },
];

const TRUNK_NOTABLES: Notable[] = [
  {
    id: 'bl_slowrot',
    name: 'Slow Rot',
    description: 'The Poison Blight applies lasts 30% longer.',
    grants: { ailmentDuration: 1.3 },
  },
  {
    id: 'bl_transmutation',
    name: 'Transmutation',
    description: 'Convert Blight to another damage type.',
    choices: [
      {
        id: 'dark',
        name: 'Gloomrot',
        description: 'Blight deals Dark damage.',
        grants: { convertTree: 'dark' },
      },
      {
        id: 'fire',
        name: 'Blightfire',
        description: 'Blight deals Fire damage.',
        grants: { convertTree: 'fire' },
      },
    ],
  },
  {
    id: 'bl_reserves',
    name: 'Deep Rot',
    description: 'Blight deals 45% more damage and is cast 20% slower.',
    stats: [stat('damage', 'more', 45), stat('castSpeed', 'inc', -20)],
  },
  {
    id: 'bl_sprawl',
    name: 'Sprawl',
    description: 'Blight has 22% increased Area of Effect.',
    stats: [stat('areaOfEffect', 'inc', 22)],
  },
  {
    id: 'bl_focus',
    name: 'Malign Focus',
    description: 'Blight has +10% Critical Chance and +45% Critical Damage.',
    stats: [stat('critChance', 'flat', 10), stat('critMultiplier', 'flat', 45)],
  },
  {
    id: 'bl_quickening',
    name: 'Quickening',
    description: 'Blight is cast 25% faster.',
    stats: [stat('castSpeed', 'inc', 25)],
  },
];

export const BLIGHT_SPEC: TreeSpec = {
  skillId: 'blight',
  prefix: 'bl',
  minorName: 'Spore',
  common: COMMON,
  branches: BRANCHES,
  trunkNotables: TRUNK_NOTABLES,
  needs: {
    momentumPer: 'bl_fixation',
    momentumMax: 'bl_fixation',
    momentumKeep: 'bl_fixation',
    contagionRadius: 'bl_contagion',
    extraFields: 'bl_miasma',
  },
};
