/**
 * Ambush's web. The skill arrives BEHIND one body and opens on it, and the
 * whole tree is built on the 25% it crits at bare: nothing else starts a fifth
 * of its uses on a Critical, so every switch here that fires on one is worth
 * five times what it would be anywhere else.
 *
 * The Relay branch is the one that changes the DELIVERY — a Critical teleports
 * you into the next body and does it again — and it terminates because a
 * follow-up landing on a body the chain has already opened on ends it.
 */
import { stat } from './node';
import type { Branch, Minor, Notable, TreeSpec } from './spec';

const COMMON: Minor[] = [
  { text: '+5% increased Physical Damage', stats: [stat('damage', 'inc', 5, ['physical'])] },
  { text: '+4% increased Damage', stats: [stat('damage', 'inc', 4)] },
  { text: '+3% increased Attack Speed', stats: [stat('attackSpeed', 'inc', 3)] },
  { text: '+2% Critical Chance', stats: [stat('critChance', 'flat', 2)] },
  { text: '+10% Critical Damage', stats: [stat('critMultiplier', 'flat', 10)] },
  { text: '+4% increased Attack Speed', stats: [stat('attackSpeed', 'inc', 4)] },
];

const BRANCHES: Branch[] = [
  {
    id: 'relay',
    theme: 'Relay',
    enabler: {
      id: 'am_relay',
      name: 'Relay',
      description:
        'A Critical teleports you into another enemy 0.3s later and Ambushes it ' +
        'too, paying that use’s mana. It prefers a body it has not opened on, ' +
        'and stops when it repeats.',
      grants: { critChain: true, manaMultiplier: 1.2 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'am_quickening',
          name: 'Quickening',
          description: "Relay has 35% less delay before its follow-up attack.",
          grants: { chainSooner: 0.65 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'am_crossing',
          name: 'Long Crossing',
          description: "Relay has 60% more range when choosing its next enemy.",
          grants: { chainReach: 1.6 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'am_relentless',
          name: 'Relentless',
          description: "Relay has 30% less delay and 40% more range when choosing its next enemy.",
          grants: { chainSooner: 0.7, chainReach: 1.4 },
        },
      },
    ],
    minors: [COMMON[3], COMMON[1], COMMON[2], COMMON[3]],
  },
  {
    id: 'opening',
    theme: 'Opening',
    enabler: {
      id: 'am_opening',
      name: 'The Opening',
      description: "Ambush deals 30% more damage to enemies at 80% of maximum Life or more.",
      grants: { moreVsFull: { above: 0.8, more: 0.3 } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'am_throat',
          name: 'Throat',
          description: "Ambush deals 40% more damage to enemies at 33% of maximum Life or less.",
          grants: { moreVsLow: { below: 0.33, more: 0.4 } },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'am_unguarded',
          name: 'Unguarded',
          description: "Ambush deals 35% more damage to enemies affected by an Ailment.",
          grants: { moreVsAiling: 0.35 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'am_finisher',
          name: 'Finisher',
          description: 'Every 4th use of Ambush deals 280% damage.',
          grants: { everyNth: { n: 4, multiplier: 2.8 } },
        },
      },
    ],
    minors: [COMMON[0], COMMON[4], COMMON[1], COMMON[0]],
  },
  {
    id: 'edge',
    theme: 'Edge',
    enabler: {
      id: 'am_edge',
      name: 'Edge',
      description: 'Ambush has +8% Critical Chance and +40% Critical Damage.',
      stats: [stat('critChance', 'flat', 8), stat('critMultiplier', 'flat', 40)],
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'am_hairline',
          name: 'Hairline',
          description: 'Ambush has +9% Critical Chance.',
          stats: [stat('critChance', 'flat', 9)],
        },
      },
      {
        minors: 4,
        notable: {
          id: 'am_cruelty',
          name: 'Cruelty',
          description: 'Ambush has +110% Critical Damage.',
          stats: [stat('critMultiplier', 'flat', 110)],
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'am_certainty',
          name: 'Certainty',
          description: 'Ambush has +14% Critical Chance and +50% Critical Damage.',
          stats: [stat('critChance', 'flat', 14), stat('critMultiplier', 'flat', 50)],
        },
      },
    ],
    minors: [COMMON[3], COMMON[4], COMMON[3], COMMON[4]],
  },
  {
    id: 'bleeding',
    theme: 'Bleeding',
    enabler: {
      id: 'am_bleeding',
      name: 'Opened Up',
      description: '+55% chance to apply Bleed.',
      grants: { ailmentChance: 55 },
      // A chance is nothing once every use Bleeds: the line is worth instead.
      under: { am_exsanguinate: { description: 'Bleeds you apply deal 25% more damage.', grants: { ailmentMultiplier: 1.25 } } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'am_hemorrhage',
          name: 'Hemorrhage',
          description: 'Bleeds you apply deal 45% more damage and have 25% less duration.',
          grants: { ailmentMultiplier: 1.45, ailmentDuration: 0.75 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'am_deepcut',
          name: 'Deep Cut',
          description: 'Bleeds you apply have 70% more duration.',
          grants: { ailmentDuration: 1.7 },
        },
      },
      {
        /**
         * EXSANGUINATE, the keystone at the tip of the Bleeding line: no hit at
         * all, a Bleed every use, and the rate is what stacks them. A Critical
         * still Relays, so the Edge line keeps its chance and trades its
         * Critical Damage for Bleed damage.
         */
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'am_exsanguinate',
          name: 'Exsanguinate',
          keystone: true,
          description:
            'Ambush deals no hit damage. Every use applies Bleed with 150% more damage. ' +
            'Critical uses can still trigger Relay.',
          becomes:
            'You step behind an enemy and apply Bleed with 150% more damage, dealing no hit damage. ' +
            'Faster attacks apply more stacks. Critical uses can still trigger Relay.',
          grants: { bleedOut: { more: 1.5 }, manaMultiplier: 1.15 },
          converts: { critMultiplier: { stat: 'damage', tags: ['bleed'], form: 'inc', say: ['Critical Damage', 'increased Bleed Damage'] } },
        },
      },
    ],
    minors: [
      { text: '+9% chance to apply Bleed', stats: [stat('ailmentChance', 'flat', 9, ['bleed'])] },
      { text: "+6% more Bleed Damage", grants: { ailmentMultiplier: 1.06 } },
      COMMON[0],
      COMMON[1],
    ],
  },
  {
    // THE IDS ARE THE OLD FOOTING BRANCH'S: a save points at them. AMBUSH DOES
    // NOT SPLASH — it is the one single-target skill that does not, because it
    // scales its own rate so hard that a share of every hit compounds — so this
    // branch is the rate itself and what a kill or a clean stretch is worth.
    id: 'footing',
    theme: 'Pace',
    enabler: {
      id: 'am_footing',
      name: 'Quick Hands',
      description: "Ambush has 15% increased Attack Speed.",
      stats: [stat('attackSpeed', 'inc', 15)],
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'am_hide',
          name: 'Bloodrush',
          description: "Ambush has 25% increased Attack Speed.",
          stats: [stat('attackSpeed', 'inc', 25)],
        },
      },
      {
        minors: 4,
        notable: {
          id: 'am_wind',
          name: 'Poise',
          description: 'Ambush deals 30% more damage while nothing has hit you for 3s.',
          grants: { untouchedMore: { after: 3, more: 0.3 } },
        },
      },
      {
        /**
         * VANISH, the keystone at the tip of the Pace line: a kill hides you,
         * the pack loses you, and the first step out of hiding lands hardest.
         * The run keeps it, so the sheet cannot see it and a played descent can.
         */
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'am_vanish',
          name: 'Vanish',
          keystone: true,
          description:
            'A kill makes you Vanish for 1s: nothing can see you, you move 40% faster, ' +
            'and the next Ambush out of it deals 150% more damage.',
          becomes:
            'You step behind an enemy and strike it. A kill makes you Vanish for 1s: ' +
            'nothing can see you, you move 40% faster, and the next Ambush out of it deals ' +
            '150% more damage.',
          grants: { vanish: { seconds: 1, faster: 0.4, more: 1.5 }, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [
      COMMON[2],
      { text: '+5% increased Physical Damage', stats: [stat('damage', 'inc', 5, ['physical'])] },
      COMMON[2],
      { text: '+4% increased Attack Speed', stats: [stat('attackSpeed', 'inc', 4)] },
    ],
  },
  {
    /**
     * THE CULL. Every other branch here buys a bigger hit; this one buys the
     * hit not having to be big enough. It reads what the wound ACTUALLY left,
     * so it pays exactly where a rogue's damage runs out — a body it took to a
     * sliver and could not finish — and it is worth nothing at all on a body
     * the build one-shots anyway.
     */
    id: 'cull',
    theme: 'Cull',
    enabler: {
      id: 'am_rhythm',
      name: 'Cull',
      description: "Hits kill enemies left at 8% or less of maximum Life.",
      grants: { execute: 0.08, manaMultiplier: 1.15 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'am_cadence',
          name: 'Bled Out',
          description: "Adds 7 percentage points to the Life threshold at which your hits kill enemies.",
          grants: { execute: 0.07 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'am_carried',
          name: 'Mercy',
          description:
            "Adds 5 percentage points to the Life threshold at which your hits kill enemies. Ambush has +8% " +
          "Critical Chance.",
          grants: { execute: 0.05 },
          stats: [stat('critChance', 'flat', 8)],
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'am_drumming',
          name: 'The Quiet Part',
          description:
            "Adds 10 percentage points to the Life threshold at which your hits kill enemies. Ambush has " +
          "+45% Critical Damage.",
          grants: { execute: 0.1, manaMultiplier: 1.15 },
          stats: [stat('critMultiplier', 'flat', 45)],
        },
      },
    ],
    minors: [COMMON[2], COMMON[3], COMMON[1], COMMON[2]],
  },
];

const TRUNK_NOTABLES: Notable[] = [
  {
    id: 'am_reach',
    name: 'Long Step',
    description: "Ambush has 30% increased Attack Range, and has 6% increased Attack Speed.",
    stats: [stat('attackRange', 'inc', 30), stat('attackSpeed', 'inc', 6)],
  },
  {
    id: 'am_transmutation',
    name: 'Transmutation',
    description: 'Convert Ambush to another damage type.',
    choices: [
      {
        id: 'fire',
        name: 'Cauterise',
        description: 'Ambush deals Fire damage.',
        grants: { convertTree: 'fire' },
      },
      {
        id: 'cold',
        name: 'Cold Open',
        description: 'Ambush deals Cold damage.',
        grants: { convertTree: 'cold' },
      },
      {
        id: 'lightning',
        name: 'Live Wire',
        description: 'Ambush deals Lightning damage.',
        grants: { convertTree: 'lightning' },
      },
    ],
  },
  {
    id: 'am_weight',
    name: 'Weight',
    description: "Ambush deals 45% more damage and has 20% reduced Attack Speed.",
    stats: [stat('damage', 'more', 45), stat('attackSpeed', 'inc', -20)],
  },
  {
    id: 'am_practice',
    name: 'Practice',
    description: "Ambush has 25% increased Attack Speed.",
    stats: [stat('attackSpeed', 'inc', 25)],
  },
  {
    id: 'am_instinct',
    name: 'Killer Instinct',
    description: 'Ambush has +12% Critical Chance and +45% Critical Damage.',
    stats: [stat('critChance', 'flat', 12), stat('critMultiplier', 'flat', 45)],
  },
  {
    id: 'am_close',
    name: 'Close Work',
    description: 'For 4s after a kill, Ambush deals 30% more damage.',
    grants: { killMore: { seconds: 4, more: 0.3 } },
  },
];

export const AMBUSH_SPEC: TreeSpec = {
  skillId: 'ambush',
  prefix: 'am',
  minorName: 'Mark',
  common: COMMON,
  branches: BRANCHES,
  trunkNotables: TRUNK_NOTABLES,
  needs: {
    chainSooner: 'am_relay',
    chainReach: 'am_relay',
    execute: 'am_rhythm',
    ailmentMultiplier: 'am_bleeding',
    ailmentDuration: 'am_bleeding',
    ailmentChance: 'am_bleeding',
  },
};
