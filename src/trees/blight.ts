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
        'A poison tick that critically strikes plants a fresh cloud, 1.6 tiles ' +
        'across, around whatever it ticked on.',
      grants: { contagionRadius: 1.6, manaMultiplier: 1.15 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bl_epidemic',
          name: 'Epidemic',
          description: 'Clouds planted by a critical tick are 0.9 tiles wider.',
          grants: { contagionRadius: 0.9, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bl_pandemic',
          name: 'Pandemic',
          description: 'And another +1.2 tiles wider.',
          grants: { contagionRadius: 1.2, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bl_plaguebearer',
          name: 'Plaguebearer',
          description:
            'Ticks critically strike far more often, and the clouds they plant ' +
            'are 0.8 tiles wider.',
          stats: [stat('critChance', 'flat', 7)],
          grants: { contagionRadius: 0.8, manaMultiplier: 1.08 },
        },
      },
    ],
    minors: [COMMON[3], COMMON[4], COMMON[0], COMMON[3]],
  },
  {
    id: 'rupture',
    theme: 'Rupture',
    enabler: {
      id: 'bl_rupture',
      name: 'Rupture',
      description:
        'Blight bursts as it lands, dealing 70% damage within 1.5 tiles. That ' +
        'burst is a HIT, so armour blunts it where the poison it leaves ignores it.',
      grants: { explode: { radius: 1.5, multiplier: 0.7 }, manaMultiplier: 1.15 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bl_shrapnel',
          name: 'Shrapnel',
          description: 'The burst covers 50% more ground.',
          grants: { explodeRadius: 1.5, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 3,
        forkFrom: { twig: 0, at: 1 },
        notable: {
          id: 'bl_overpressure',
          name: 'Overpressure',
          description: 'The burst carries +30% of the damage, for all of it.',
          grants: { explodeMultiplierAdd: 0.3, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 3,
        forkFrom: { twig: 1, at: 1 },
        notable: {
          id: 'bl_sporeburst',
          name: 'Sporeburst',
          description: 'The burst covers 35% more ground and deals 25% more damage.',
          grants: { explodeRadius: 1.35, explodeMultiplierAdd: 0.25, manaMultiplier: 1.08 },
        },
      },
    ],
    minors: [
      { text: '+4% larger burst', grants: { explodeRadius: 1.04 } },
      COMMON[1],
      COMMON[0],
      { text: '+5% larger burst', grants: { explodeRadius: 1.05 } },
    ],
  },
  {
    id: 'miasma',
    theme: 'Miasma',
    enabler: {
      id: 'bl_miasma',
      name: 'Miasma',
      description: 'Blight drops +1 cloud, on another enemy near the target.',
      grants: { extraFields: 1, manaMultiplier: 1.15 },
    },
    twigs: [
      {
        minors: 4,
        notable: {
          id: 'bl_choking',
          name: 'Choking Haze',
          description: 'And +1 cloud on top of that, for three.',
          grants: { extraFields: 1, manaMultiplier: 1.15 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bl_smother',
          name: 'Smother',
          description: 'And +2 more clouds beyond that.',
          grants: { extraFields: 2, manaMultiplier: 1.15 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bl_shroud',
          name: 'Shroud',
          description: 'Two more clouds again, and every cloud is 15% wider.',
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
      description:
        'The poison deals 50% more damage over a 35% shorter time. Blight kills ' +
        'faster and holds ground worse.',
      grants: { ailmentMultiplier: 1.5, ailmentDuration: 0.65 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bl_septic',
          name: 'Septic',
          description: 'The poison deals 30% more damage.',
          grants: { ailmentMultiplier: 1.3 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bl_lingering',
          name: 'Lingering Rot',
          description: 'The poison lasts 70% longer.',
          grants: { ailmentDuration: 1.7 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bl_necrosis',
          name: 'Necrosis',
          description: 'The poison deals a further 35% more damage.',
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
      description:
        'The cloud covers 55% more ground, and its poison deals 12% less damage. ' +
        'Blight stops being aimed and starts being placed.',
      grants: { fieldRadius: 1.55, ailmentMultiplier: 0.88, manaMultiplier: 1.08 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bl_overgrowth',
          name: 'Overgrowth',
          description: 'The cloud covers 30% more ground again.',
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
          description: 'The cloud covers 25% more ground, and +15% increased Area of Effect.',
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
      description: 'Blight deals 30% more damage to enemies within 3 tiles of you.',
      grants: { moreClose: { within: 3, more: 0.3 } },
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
    description: 'The poison Blight applies lasts 30% longer.',
    grants: { ailmentDuration: 1.3 },
  },
  {
    id: 'bl_transmutation',
    name: 'Transmutation',
    description:
      'Blight stops dealing Poison. Pick what it deals instead — the Poison ' +
      'modifiers in this tree change with it, the ones on your gear do not.',
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
    description: 'Blight criticals +10% more often, for +45% critical damage.',
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
    contagionRadius: 'bl_contagion',
    explodeRadius: 'bl_rupture',
    explodeMultiplierAdd: 'bl_rupture',
    extraFields: 'bl_miasma',
  },
};
