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
  { text: '+4% increased Movement Speed', stats: [stat('moveSpeed', 'inc', 4)] },
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
          description: 'The follow-up lands 35% sooner.',
          grants: { chainSooner: 0.65 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'am_crossing',
          name: 'Long Crossing',
          description: 'The follow-up crosses 60% further to find a body.',
          grants: { chainReach: 1.6 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'am_relentless',
          name: 'Relentless',
          description: 'The follow-up lands a further 30% sooner, and crosses 40% further.',
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
      description: 'Ambush deals 30% more damage to enemies above 80% of their life.',
      grants: { moreVsFull: { above: 0.8, more: 0.3 } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'am_throat',
          name: 'Throat',
          description: 'Ambush deals 40% more damage to enemies below 33% of their life.',
          grants: { moreVsLow: { below: 0.33, more: 0.4 } },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'am_unguarded',
          name: 'Unguarded',
          description: 'Ambush deals 35% more damage to enemies carrying an Ailment.',
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
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'am_hemorrhage',
          name: 'Hemorrhage',
          description: 'Bleeds you apply deal 45% more damage over a 25% shorter time.',
          grants: { ailmentMultiplier: 1.45, ailmentDuration: 0.75 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'am_deepcut',
          name: 'Deep Cut',
          description: 'Bleeds you apply last 70% longer.',
          grants: { ailmentDuration: 1.7 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'am_butchery',
          name: 'Butchery',
          description: '+45% chance to apply Bleed, and Bleeds deal 20% more damage.',
          grants: { ailmentChance: 45, ailmentMultiplier: 1.2, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [
      { text: '+9% chance to apply Bleed', stats: [stat('ailmentChance', 'flat', 9, ['bleed'])] },
      { text: '+6% increased Bleed Damage', grants: { ailmentMultiplier: 1.06 } },
      COMMON[0],
      COMMON[1],
    ],
  },
  {
    id: 'footing',
    theme: 'Footing',
    enabler: {
      id: 'am_footing',
      name: 'Sure Footing',
      description: '+20% increased maximum Life and +12% increased Movement Speed.',
      stats: [stat('life', 'inc', 20), stat('moveSpeed', 'inc', 12)],
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'am_hide',
          name: 'Thin Hide',
          description: '+35% increased Armour and +12% increased maximum Life.',
          stats: [stat('armour', 'inc', 35), stat('life', 'inc', 12)],
        },
      },
      {
        minors: 4,
        notable: {
          id: 'am_wind',
          name: 'Second Wind',
          description: '+18% increased maximum Life and +130% increased Life Regeneration.',
          stats: [stat('life', 'inc', 18), stat('lifeRegen', 'inc', 130)],
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'am_ghosting',
          name: 'Ghosting',
          description: 'You move 22% faster, and Ambush swings 8% faster.',
          stats: [stat('moveSpeed', 'inc', 22), stat('attackSpeed', 'inc', 8)],
        },
      },
    ],
    minors: [
      COMMON[5],
      { text: '+5% increased maximum Life', stats: [stat('life', 'inc', 5)] },
      COMMON[5],
      { text: '+6% increased Armour', stats: [stat('armour', 'inc', 6)] },
    ],
  },
  {
    id: 'rhythm',
    theme: 'Rhythm',
    enabler: {
      id: 'am_rhythm',
      name: 'Rhythm',
      description: '+8% Momentum per use, up to 64%.',
      grants: { momentum: { per: 8, max: 64 } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'am_cadence',
          name: 'Cadence',
          description: 'Momentum builds 5% faster per use.',
          grants: { momentumPer: 5 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'am_carried',
          name: 'Carried Over',
          description:
            'Momentum carries to a new enemy whole instead of being halved, and ' +
            'reaches 20% higher.',
          grants: { momentumKeep: true, momentumMax: 20 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'am_drumming',
          name: 'Drumming',
          description: 'Momentum reaches 50% higher.',
          grants: { momentumMax: 50 },
        },
      },
    ],
    minors: [COMMON[2], { text: '+2% Momentum per use', grants: { momentumPer: 2 } }, COMMON[1], COMMON[2]],
  },
];

const TRUNK_NOTABLES: Notable[] = [
  {
    id: 'am_reach',
    name: 'Long Step',
    description: 'Ambush reaches 30% further, and swings 6% faster.',
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
    description: 'Ambush deals 45% more damage and swings 20% slower.',
    stats: [stat('damage', 'more', 45), stat('attackSpeed', 'inc', -20)],
  },
  {
    id: 'am_practice',
    name: 'Practice',
    description: 'Ambush swings 25% faster.',
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
    momentumPer: 'am_rhythm',
    momentumMax: 'am_rhythm',
    momentumKeep: 'am_rhythm',
    ailmentMultiplier: 'am_bleeding',
    ailmentDuration: 'am_bleeding',
    ailmentChance: 'am_bleeding',
  },
};
