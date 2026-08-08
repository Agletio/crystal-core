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
import { GATE, SPUR_GATES } from './spec';
import type { Branch, Crossing, Minor, Notable, TreeSpec } from './spec';

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
      gate: GATE.enabler,
      grants: { contagionRadius: 1.6 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bl_epidemic',
          name: 'Epidemic',
          description: 'Clouds planted by a critical tick are 0.9 tiles wider.',
          gate: GATE.mid,
          grants: { contagionRadius: 0.9 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bl_pandemic',
          name: 'Pandemic',
          description: 'And another 1.2 tiles wider again.',
          gate: GATE.deep,
          grants: { contagionRadius: 1.2 },
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
          gate: GATE.tip,
          stats: [stat('critChance', 'flat', 7)],
          grants: { contagionRadius: 0.8 },
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
      gate: GATE.enabler,
      grants: { explode: { radius: 1.5, multiplier: 0.7 } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bl_shrapnel',
          name: 'Shrapnel',
          description: 'The burst covers 50% more ground.',
          gate: GATE.mid,
          grants: { explodeRadius: 1.5 },
        },
      },
      {
        minors: 3,
        forkFrom: { twig: 0, at: 1 },
        notable: {
          id: 'bl_overpressure',
          name: 'Overpressure',
          description: 'The burst deals full damage rather than a fraction of it.',
          gate: GATE.deep,
          grants: { explodeMultiplierAdd: 0.3 },
        },
      },
      {
        minors: 3,
        forkFrom: { twig: 1, at: 1 },
        notable: {
          id: 'bl_sporeburst',
          name: 'Sporeburst',
          description: 'The burst covers a third more ground again, and hits harder.',
          gate: GATE.tip,
          grants: { explodeRadius: 1.35, explodeMultiplierAdd: 0.25 },
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
      description: 'Blight drops a second cloud on another enemy near the target.',
      gate: GATE.enabler,
      grants: { extraFields: 1 },
    },
    twigs: [
      {
        minors: 4,
        notable: {
          id: 'bl_choking',
          name: 'Choking Haze',
          description: 'And a third cloud.',
          gate: GATE.mid,
          grants: { extraFields: 1 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bl_smother',
          name: 'Smother',
          description: 'And two more beyond that.',
          gate: GATE.deep,
          grants: { extraFields: 2 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bl_shroud',
          name: 'Shroud',
          description: 'Two more clouds again, and every cloud is 15% wider.',
          gate: GATE.tip,
          grants: { extraFields: 2, fieldRadius: 1.15 },
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
      gate: GATE.enabler,
      grants: { ailmentMultiplier: 1.5, ailmentDuration: 0.65 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bl_septic',
          name: 'Septic',
          description: 'The poison deals 30% more damage.',
          gate: GATE.mid,
          grants: { ailmentMultiplier: 1.3 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bl_lingering',
          name: 'Lingering Rot',
          description: 'The poison lasts 70% longer.',
          gate: GATE.deep,
          grants: { ailmentDuration: 1.7 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 0, at: 2 },
        notable: {
          id: 'bl_necrosis',
          name: 'Necrosis',
          description: 'The poison deals another 35% more damage.',
          gate: GATE.tip,
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
      gate: GATE.enabler,
      grants: { fieldRadius: 1.55, ailmentMultiplier: 0.88 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bl_overgrowth',
          name: 'Overgrowth',
          description: 'The cloud covers 30% more ground again.',
          gate: GATE.mid,
          grants: { fieldRadius: 1.3 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bl_thicket',
          name: 'Thicket',
          description: 'Blight has 25% increased Area of Effect.',
          gate: GATE.deep,
          stats: [stat('areaOfEffect', 'inc', 25)],
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 0, at: 2 },
        notable: {
          id: 'bl_wildgrowth',
          name: 'Wildgrowth',
          description: 'The cloud covers a quarter more ground, and area grows again.',
          gate: GATE.tip,
          stats: [stat('areaOfEffect', 'inc', 15)],
          grants: { fieldRadius: 1.25 },
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
      gate: GATE.enabler,
      grants: { moreClose: { within: 3, more: 0.3 } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bl_wither',
          name: 'Wither',
          description: 'Blight deals 40% more damage to enemies below a third of their life.',
          gate: GATE.mid,
          grants: { moreVsLow: { below: 0.33, more: 0.4 } },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bl_dread',
          name: 'Dread',
          description: 'Blight deals 35% more damage to enemies above four fifths of their life.',
          gate: GATE.deep,
          grants: { moreVsFull: { above: 0.8, more: 0.35 } },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bl_surge',
          name: 'Surge',
          description: 'Every fourth cast of Blight is worth two and a half.',
          gate: GATE.tip,
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
    gate: SPUR_GATES[0],
    grants: { ailmentDuration: 1.3 },
  },
  {
    id: 'bl_transmutation',
    name: 'Transmutation',
    description:
      'Blight stops dealing Poison. Pick what it deals instead — the Poison ' +
      'modifiers in this tree change with it, the ones on your gear do not.',
    gate: SPUR_GATES[1],
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
    gate: SPUR_GATES[2],
    stats: [stat('damage', 'more', 45), stat('castSpeed', 'inc', -20)],
  },
  {
    id: 'bl_sprawl',
    name: 'Sprawl',
    description: 'Blight has 22% increased Area of Effect.',
    gate: SPUR_GATES[3],
    stats: [stat('areaOfEffect', 'inc', 22)],
  },
  {
    id: 'bl_focus',
    name: 'Malign Focus',
    description: 'Blight critically strikes far more often, and far harder.',
    gate: SPUR_GATES[4],
    stats: [stat('critChance', 'flat', 10), stat('critMultiplier', 'flat', 45)],
  },
  {
    id: 'bl_quickening',
    name: 'Quickening',
    description: 'Blight is cast 25% faster.',
    gate: SPUR_GATES[5],
    stats: [stat('castSpeed', 'inc', 25)],
  },
];

const CROSSINGS: Crossing[] = [
  [[0, 0], [1, 1]],
  [[2, 0], [3, 1]],
  [[4, 0], [5, 1]],
  [[1, 0], [2, 1]],
  [[3, 0], [4, 1]],
  [[5, 0], [0, 1]],
];

export const BLIGHT_SPEC: TreeSpec = {
  skillId: 'blight',
  prefix: 'bl',
  minorName: 'Spore',
  common: COMMON,
  branches: BRANCHES,
  trunkNotables: TRUNK_NOTABLES,
  crossings: CROSSINGS,
  needs: {
    contagionRadius: 'bl_contagion',
    explodeRadius: 'bl_rupture',
    explodeMultiplierAdd: 'bl_rupture',
    extraFields: 'bl_miasma',
  },
};
