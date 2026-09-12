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
      // A crack has no opening to widen, so what was width is length under it.
      under: { sw_fissure: { description: 'The crack reaches 15% further.', grants: { coneReach: 1.15, manaMultiplier: 1.08 } } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'sw_widening',
          name: 'Widening',
          description: 'The Cone opens 30° wider still.',
          grants: { coneArc: 30, manaMultiplier: 1.08 },
          under: { sw_fissure: { description: 'The crack reaches 15% further.', grants: { coneReach: 1.15, manaMultiplier: 1.08 } } },
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
        /**
         * FISSURE, the keystone at the tip of the Front line: the wedge is a
         * straight crack, long and narrow, and the width walked to reach it is
         * length under it. The trade is a pack against a corridor.
         */
        minors: 3,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'sw_fissure',
          name: 'Fissure',
          keystone: true,
          description:
            'The Cone is a straight crack 7 tiles long and 1.2 wide, and everything ' +
            'on it takes 30% more damage.',
          becomes:
            'You split the ground in a straight crack 7 tiles long and 1.2 wide, and ' +
            'everything standing on it takes the whole hit, 30% more.',
          grants: { lineWave: { reach: 7, width: 1.2, more: 0.3 }, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [
      {
        text: 'The Cone opens 6° wider',
        grants: { coneArc: 6 },
        under: { sw_fissure: { description: 'The crack reaches 3% further.', grants: { coneReach: 1.03 } } },
      },
      COMMON[1],
      { text: 'The Cone reaches 5% further', grants: { coneReach: 1.05 } },
      COMMON[0],
    ],
  },
  {
    /**
     * THE GROUND STAYS BROKEN. Every other branch here is about the wedge — how
     * wide, how far, how hard — and this one is about what is left standing in
     * it after the wave has gone: a Cloud, on the same seam Rimespike leaves
     * one, so a Cone that catches a pack keeps working on it while you swing
     * somewhere else. Armour blunts the wave; it does not blunt what it leaves.
     */
    id: 'faultline',
    theme: 'Fault',
    enabler: {
      id: 'sw_pressure',
      name: 'Fault Line',
      description: "Every 3rd use creates a Cloud with a 2.2-tile radius around the target.",
      grants: { fieldOnCast: { every: 3, radius: 2.2 }, manaMultiplier: 1.15 },
    },
    twigs: [
      {
        minors: 4,
        notable: {
          id: 'sw_bearing',
          name: 'Aftershock',
          description: 'Clouds come round 100% more often.',
          grants: { fieldEvery: 0.5, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'sw_deadweight',
          name: 'Subsidence',
          description: "Clouds have 45% more radius.",
          grants: { fieldRadius: 1.45, manaMultiplier: 1.08 },
        },
      },
      {
        /**
         * TREMOR, the keystone at the tip of the Fault line: the wedge deals no
         * hit and the ground it covered keeps shaking, so what a cast is worth
         * is what STAYS standing in it. The Clouds walked to reach it still
         * fall, on their own seam.
         */
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'sw_tremor',
          name: 'Tremor',
          keystone: true,
          description:
            'The Cone deals no hit. The ground it covered shakes for 3s, dealing 30% of ' +
            'the hit every 0.5s to whatever stands in it.',
          becomes:
            'You break the ground in a wedge in front of you and it keeps shaking for 3s, ' +
            'dealing 30% of the hit every 0.5s to whatever stands in it. The wedge itself hits nothing.',
          grants: { tremor: { seconds: 3, share: 0.3, every: 0.5 }, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [COMMON[0], COMMON[3], COMMON[1], COMMON[2]],
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
      { text: "+6% more Bleed Damage", grants: { ailmentMultiplier: 1.06 } },
      { text: '+9% chance to apply Bleed', stats: [stat('ailmentChance', 'flat', 9, ['bleed'])] },
      COMMON[0],
      COMMON[3],
    ],
  },
  {
    // THE IDS ARE THE OLD FOOTING BRANCH'S: a save points at them. Armour and
    // life are gear's and the character's own web — a SKILL's tree buys what
    // the skill does, and what Shockwave does is the WEDGE.
    id: 'footing',
    theme: 'Spread',
    enabler: {
      id: 'sw_footing',
      name: 'Braced',
      description: 'Shockwave has +20% increased Area of Effect.',
      stats: [stat('areaOfEffect', 'inc', 20)],
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'sw_bedrock',
          name: 'Bedrock',
          description: 'The Cone reaches 30% further.',
          grants: { coneReach: 1.3 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'sw_endurance',
          name: 'Broadside',
          description: 'The Cone opens 40° wider.',
          grants: { coneArc: 40 },
          under: { sw_fissure: { description: 'The crack reaches 20% further.', grants: { coneReach: 1.2 } } },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'sw_stonefoot',
          name: 'Stonefoot',
          description: 'For 4s after a kill, Shockwave deals 30% more damage.',
          grants: { killMore: { seconds: 4, more: 0.3 } },
        },
      },
    ],
    minors: [
      { text: '+6% increased Area of Effect', stats: [stat('areaOfEffect', 'inc', 6)] },
      { text: '+5% increased Physical Damage', stats: [stat('damage', 'inc', 5, ['physical'])] },
      COMMON[1],
      { text: '+5% increased Area of Effect', stats: [stat('areaOfEffect', 'inc', 5)] },
    ],
  },
  {
    id: 'echo',
    theme: 'Rumble',
    enabler: {
      id: 'sw_reverberation',
      name: 'Reverberation',
      description: 'Shockwave deals 30% more damage while nothing has hit you for 3s.',
      grants: { untouchedMore: { after: 3, more: 0.3 } },
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
          description: "Shockwave deals 35% more damage to enemies at 80% of maximum Life or more.",
          grants: { moreVsFull: { above: 0.8, more: 0.35 } },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'sw_trough',
          name: 'Trough',
          description: "Shockwave deals 35% more damage to enemies at 33% of maximum Life or less.",
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
      description: "Shockwave deals 25% more damage to enemies affected by an Ailment.",
      grants: { moreVsAiling: 0.25 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'sw_pulverise',
          name: 'Pulverise',
          description: "Shockwave deals 30% more damage and has 15% reduced Attack Speed.",
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
          description: "Shockwave has 30% increased Attack Speed.",
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
    description: "Shockwave deals 45% more damage and has 20% reduced Attack Speed.",
    stats: [stat('damage', 'more', 45), stat('attackSpeed', 'inc', -20)],
  },
  {
    id: 'sw_bracing',
    name: 'Bracing',
    description: "Shockwave has 18% increased Attack Speed and has 10% increased Attack Range.",
    stats: [stat('attackSpeed', 'inc', 18), stat('attackRange', 'inc', 10)],
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
    description: "Shockwave has 25% increased Attack Speed.",
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
    fieldOnCast: 'sw_pressure',
    fieldEvery: 'sw_pressure',
    fieldRadius: 'sw_pressure',
    extraFields: 'sw_pressure',
    ailmentChance: 'sw_fracture',
    ailmentMultiplier: 'sw_fracture',
    ailmentDuration: 'sw_fracture',
  },
};
