/**
 * Shockwave's web. The skill is a Cone, so every question this tree asks is
 * about the WEDGE — how wide it opens, how far it runs, what it leaves in the
 * ground behind it. Nothing here aims, because there is nothing to aim at.
 *
 * The wedge has no target cap, which is what makes opening it the one purchase
 * that scales with the ROOM rather than with the enemy in front of you.
 */
import { stat } from './node';
import type { Branch, Minor, Notable, TreeSpec } from './spec';

const COMMON: Minor[] = [
  { text: '+5% increased Physical Damage', stats: [stat('damage', 'inc', 5, ['physical'])] },
  { text: '+4% increased Damage', stats: [stat('damage', 'inc', 4)] },
  { text: '+3% increased Attack Speed', stats: [stat('attackSpeed', 'inc', 3)] },
  { text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
  { text: '+4% increased Area of Effect', stats: [stat('areaOfEffect', 'inc', 4)] },
  { text: '+8% Critical Damage', stats: [stat('critMultiplier', 'flat', 8)] },
];

const BRANCHES: Branch[] = [
  {
    id: 'wedge',
    theme: 'Front',
    enabler: {
      id: 'sw_wedge',
      name: 'Broad Front',
      description: 'The Cone opens 30° wider.',
      grants: { coneArc: 30, manaMultiplier: 1.08 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'sw_widening',
          name: 'Widening',
          description: 'The Cone opens 30° wider still.',
          grants: { coneArc: 30, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'sw_longfault',
          name: 'Long Fault',
          description: 'The Cone reaches 40% further.',
          grants: { coneReach: 1.4, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 3,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'sw_encirclement',
          name: 'Encirclement',
          description: 'The Cone opens 150° wider.',
          grants: { coneArc: 150, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [
      { text: 'The Cone opens 6° wider', grants: { coneArc: 6 } },
      COMMON[1],
      { text: 'The Cone reaches 5% further', grants: { coneReach: 1.05 } },
      COMMON[0],
    ],
  },
  {
    id: 'pressure',
    theme: 'Pressure',
    enabler: {
      id: 'sw_pressure',
      name: 'Pressure',
      description: '+8% Momentum per use, up to 60%.',
      grants: { momentum: { per: 8, max: 60 } },
    },
    twigs: [
      {
        minors: 4,
        notable: {
          id: 'sw_bearing',
          name: 'Bearing',
          description: 'Momentum builds 4% faster per use.',
          grants: { momentumPer: 4 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'sw_deadweight',
          name: 'Dead Weight',
          description: 'Momentum reaches 40% higher.',
          grants: { momentumMax: 40 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'sw_carrythrough',
          name: 'Carry-Through',
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
    id: 'fracture',
    theme: 'Fracture',
    enabler: {
      id: 'sw_fracture',
      name: 'Fracture',
      description: '+50% chance to apply Bleed.',
      grants: { ailmentChance: 50 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'sw_splinter',
          name: 'Splinter',
          description: 'Bleeds you apply deal 45% more damage.',
          grants: { ailmentMultiplier: 1.45 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'sw_openwound',
          name: 'Open Wound',
          description: 'Bleeds you apply last 70% longer.',
          grants: { ailmentDuration: 1.7 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'sw_shatter',
          name: 'Shatter',
          description: '+45% chance to apply Bleed.',
          grants: { ailmentChance: 45, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [
      { text: '+6% increased Bleed Damage', grants: { ailmentMultiplier: 1.06 } },
      { text: '+9% chance to apply Bleed', stats: [stat('ailmentChance', 'flat', 9, ['bleed'])] },
      COMMON[0],
      COMMON[3],
    ],
  },
  {
    id: 'footing',
    theme: 'Footing',
    enabler: {
      id: 'sw_footing',
      name: 'Braced',
      description: '+25% increased Armour and +15% increased maximum Life.',
      stats: [stat('armour', 'inc', 25), stat('life', 'inc', 15)],
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'sw_bedrock',
          name: 'Bedrock',
          description: '40% increased Armour.',
          stats: [stat('armour', 'inc', 40)],
        },
      },
      {
        minors: 4,
        notable: {
          id: 'sw_endurance',
          name: 'Endurance',
          description: '20% maximum Life, and 120% increased Life Regeneration.',
          stats: [stat('life', 'inc', 20), stat('lifeRegen', 'inc', 120)],
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'sw_stonefoot',
          name: 'Stonefoot',
          description: 'Shockwave deals 30% more damage to enemies within 2 tiles of you.',
          grants: { moreClose: { within: 2, more: 0.3 } },
        },
      },
    ],
    minors: [
      { text: '+6% increased Armour', stats: [stat('armour', 'inc', 6)] },
      { text: '+4% maximum Life', stats: [stat('life', 'inc', 4)] },
      COMMON[1],
      { text: '+5% increased Armour', stats: [stat('armour', 'inc', 5)] },
    ],
  },
  {
    id: 'echo',
    theme: 'Rumble',
    enabler: {
      id: 'sw_reverberation',
      name: 'Reverberation',
      description: 'Shockwave deals 30% more damage to enemies more than 2.2 tiles away.',
      grants: { moreFar: { beyond: 2.2, more: 0.3 } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'sw_swell',
          name: 'Swell',
          description: 'Every 4th use of Shockwave deals 250% damage.',
          grants: { everyNth: { n: 4, multiplier: 2.5 } },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'sw_crest',
          name: 'Crest',
          description: 'Shockwave deals 35% more damage to enemies above 80% of their life.',
          grants: { moreVsFull: { above: 0.8, more: 0.35 } },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'sw_trough',
          name: 'Trough',
          description: 'Shockwave deals 35% more damage to enemies below 33% of their life.',
          grants: { moreVsLow: { below: 0.33, more: 0.35 } },
        },
      },
    ],
    minors: [COMMON[1], COMMON[5], COMMON[2], COMMON[0]],
  },
  {
    id: 'ruin',
    theme: 'Ruin',
    enabler: {
      id: 'sw_ruin',
      name: 'Ruin',
      description: 'Shockwave deals 25% more damage to enemies carrying an Ailment.',
      grants: { moreVsAiling: 0.25 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'sw_pulverise',
          name: 'Pulverise',
          description: 'Shockwave deals 30% more damage and swings 15% slower.',
          stats: [stat('damage', 'more', 30), stat('attackSpeed', 'inc', -15)],
        },
      },
      {
        minors: 4,
        notable: {
          id: 'sw_reckoning',
          name: 'Reckoning',
          description: 'Shockwave has +14% Critical Chance and +60% Critical Damage.',
          stats: [stat('critChance', 'flat', 14), stat('critMultiplier', 'flat', 60)],
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'sw_relentless',
          name: 'Relentless',
          description: 'Shockwave swings 30% faster.',
          stats: [stat('attackSpeed', 'inc', 30)],
        },
      },
    ],
    minors: [COMMON[3], COMMON[5], COMMON[1], COMMON[2]],
  },
];

const TRUNK_NOTABLES: Notable[] = [
  {
    id: 'sw_expanse',
    name: 'Expanse',
    description: '+35% increased Area of Effect.',
    stats: [stat('areaOfEffect', 'inc', 35)],
  },
  {
    id: 'sw_transmutation',
    name: 'Transmutation',
    description: 'Convert Shockwave to another damage type.',
    choices: [
      {
        id: 'fire',
        name: 'Magma Front',
        description: 'Shockwave deals Fire damage.',
        grants: { convertTree: 'fire' },
      },
      {
        id: 'cold',
        name: 'Glacier',
        description: 'Shockwave deals Cold damage.',
        grants: { convertTree: 'cold' },
      },
      {
        id: 'lightning',
        name: 'Earthing',
        description: 'Shockwave deals Lightning damage.',
        grants: { convertTree: 'lightning' },
      },
    ],
  },
  {
    id: 'sw_hammerblow',
    name: 'Hammer Blow',
    description: 'Shockwave deals 45% more damage and swings 20% slower.',
    stats: [stat('damage', 'more', 45), stat('attackSpeed', 'inc', -20)],
  },
  {
    id: 'sw_bracing',
    name: 'Bracing',
    description: 'You move 18% faster, and Shockwave swings 8% faster.',
    stats: [stat('moveSpeed', 'inc', 18), stat('attackSpeed', 'inc', 8)],
  },
  {
    id: 'sw_keenedge',
    name: 'Keen Edge',
    description: 'Shockwave has +11% Critical Chance and +45% Critical Damage.',
    stats: [stat('critChance', 'flat', 11), stat('critMultiplier', 'flat', 45)],
  },
  {
    id: 'sw_cadence',
    name: 'Cadence',
    description: 'Shockwave swings 25% faster.',
    stats: [stat('attackSpeed', 'inc', 25)],
  },
];

export const SHOCKWAVE_SPEC: TreeSpec = {
  skillId: 'shockwave',
  prefix: 'sw',
  minorName: 'Crack',
  common: COMMON,
  branches: BRANCHES,
  trunkNotables: TRUNK_NOTABLES,
  // The Cone is the skill, so opening it needs nothing bought first; a Burst
  // and a Bleed both do, and every switch that only tunes one is listed here.
  needs: {
    momentumPer: 'sw_pressure',
    momentumMax: 'sw_pressure',
    momentumKeep: 'sw_pressure',
    ailmentChance: 'sw_fracture',
    ailmentMultiplier: 'sw_fracture',
    ailmentDuration: 'sw_fracture',
  },
};
