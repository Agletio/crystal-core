/**
 * Strike's web. A swing, so the splash is centred on YOU rather than on what
 * you hit — everything about coverage here is about standing in the right
 * place, not about aiming.
 *
 * Physical is the one damage type nothing resists by element and everything
 * blunts by armour, which is why Transmutation is worth walking to on a skill
 * that already works: it trades a resistance check for an armour one.
 */
import { stat } from './node';
import type { Branch, Minor, Notable, TreeSpec } from './spec';

const COMMON: Minor[] = [
  { text: '+5% increased Physical Damage', stats: [stat('damage', 'inc', 5, ['physical'])] },
  { text: '+4% increased Damage', stats: [stat('damage', 'inc', 4)] },
  { text: '+3% increased Attack Speed', stats: [stat('attackSpeed', 'inc', 3)] },
  { text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
  { text: '+8% Critical Damage', stats: [stat('critMultiplier', 'flat', 8)] },
  { text: '+4% increased Attack Range', stats: [stat('attackRange', 'inc', 4)] },
];

const BRANCHES: Branch[] = [
  {
    id: 'sweep',
    theme: 'Sweep',
    enabler: {
      id: 'st_sweep',
      name: 'Sweep',
      description:
        'The swing deals 45% damage to everything in reach instead of 10%. ' +
        'Strike stops being aimed at one enemy and starts clearing a circle.',
      grants: { splashMultiplier: 0.45 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'st_widearc',
          name: 'Wide Arc',
          description: 'The swing reaches 40% further.',
          grants: { splashRadius: 1.4 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'st_carve',
          name: 'Carve',
          description: 'The swing deals 70% to everything in reach.',
          grants: { splashMultiplier: 0.7 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'st_whirlwind',
          name: 'Whirlwind',
          description: 'Everything in reach takes the full swing, and reach grows again.',
          grants: { splashMultiplier: 1, splashRadius: 1.25 },
        },
      },
    ],
    minors: [
      { text: '+5% increased swing reach', grants: { splashRadius: 1.05 } },
      COMMON[1],
      COMMON[0],
      { text: '+4% increased swing reach', grants: { splashRadius: 1.04 } },
    ],
  },
  {
    id: 'rend',
    theme: 'Rend',
    enabler: {
      id: 'st_rend',
      name: 'Rend',
      description:
        'Strike can no longer critically strike. A swing that would have crit ' +
        'instead leaves the target bleeding for 240% of the hit over 5s.',
      grants: { critAilment: { multiplier: 2.4, seconds: 5 } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'st_hemorrhage',
          name: 'Hemorrhage',
          description: 'Bleeds you apply deal 40% more damage over a 25% shorter time.',
          grants: { ailmentMultiplier: 1.4, ailmentDuration: 0.75 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'st_deepcut',
          name: 'Deep Cut',
          description: 'Bleeds you apply last 65% longer.',
          grants: { ailmentDuration: 1.65 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'st_butchery',
          name: 'Butchery',
          description:
            'A bleed that ticks critically opens the same wound on everything ' +
            'within 2 tiles.',
          grants: { ailmentSpread: 2 },
        },
      },
    ],
    minors: [
      { text: '+6% increased Bleed Damage', grants: { ailmentMultiplier: 1.06 } },
      { text: '+5% increased Bleed Duration', grants: { ailmentDuration: 1.05 } },
      COMMON[0],
      COMMON[3],
    ],
  },
  {
    id: 'onslaught',
    theme: 'Onslaught',
    enabler: {
      id: 'st_onslaught',
      name: 'Onslaught',
      description: 'Strike swings twice at what you aimed at, and stops once it is down.',
      grants: { doubleStrike: 1 },
    },
    twigs: [
      {
        minors: 4,
        notable: {
          id: 'st_flurry',
          name: 'Flurry',
          description: 'And a third swing.',
          grants: { doubleStrike: 1 },
        },
      },
      {
        minors: 5,
        notable: {
          id: 'st_frenzy',
          name: 'Frenzy',
          description: 'And two more beyond that.',
          grants: { doubleStrike: 2 },
        },
      },
    ],
    minors: [COMMON[2], COMMON[1], COMMON[2], COMMON[0]],
  },
  {
    id: 'shockwave',
    theme: 'Tremor',
    enabler: {
      id: 'st_shockwave',
      name: 'Shockwave',
      description:
        'Every enemy the swing lands on takes a burst, dealing 50% damage within ' +
        '1.6 tiles. Strike gains the Area tag.',
      grants: { explode: { radius: 1.6, multiplier: 0.5 }, addTags: ['area'] },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'st_faultline',
          name: 'Faultline',
          description: 'The burst covers 45% more ground.',
          grants: { explodeRadius: 1.45 },
        },
      },
      {
        minors: 3,
        forkFrom: { twig: 0, at: 1 },
        notable: {
          id: 'st_upheaval',
          name: 'Upheaval',
          description: 'The burst deals full damage rather than a fraction of it.',
          grants: { explodeMultiplierAdd: 0.5 },
        },
      },
      {
        minors: 3,
        forkFrom: { twig: 1, at: 1 },
        notable: {
          id: 'st_aftershock',
          name: 'Aftershock',
          description: 'An enemy killed by Strike bursts, dealing 60% damage within 2.2 tiles.',
          grants: { explodeOnKill: { radius: 2.2, multiplier: 0.6 } },
        },
      },
    ],
    minors: [
      { text: '+5% increased Area of Effect', stats: [stat('areaOfEffect', 'inc', 5)] },
      { text: '+4% larger burst', grants: { explodeRadius: 1.04 } },
      COMMON[0],
      { text: '+6% increased Area of Effect', stats: [stat('areaOfEffect', 'inc', 6)] },
    ],
  },
  {
    id: 'bulwark',
    theme: 'Bulwark',
    enabler: {
      id: 'st_bulwark',
      name: 'Bulwark',
      description:
        'Strike is a melee skill, and melee means standing in it: +25% Armour ' +
        'and +15% maximum Life.',
      stats: [stat('armour', 'inc', 25), stat('life', 'inc', 15)],
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'st_ironhide',
          name: 'Iron Hide',
          description: 'A further 40% increased Armour.',
          stats: [stat('armour', 'inc', 40)],
        },
      },
      {
        minors: 4,
        notable: {
          id: 'st_secondwind',
          name: 'Second Wind',
          description: 'A further 20% maximum Life, and life regenerates far faster.',
          stats: [stat('life', 'inc', 20), stat('lifeRegen', 'inc', 120)],
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'st_immovable',
          name: 'Immovable',
          description: 'Strike deals 30% more damage to enemies within 2 tiles of you.',
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
    id: 'cruelty',
    theme: 'Cruelty',
    enabler: {
      id: 'st_cruelty',
      name: 'Cruelty',
      description: 'Strike deals 25% more damage to enemies that are already bleeding.',
      grants: { moreVsAiling: 0.25 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'st_executioner',
          name: 'Executioner',
          description: 'Strike deals 35% more damage to enemies below a third of their life.',
          grants: { moreVsLow: { below: 0.33, more: 0.35 } },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'st_ambush',
          name: 'Ambush',
          description: 'Strike deals 35% more damage to enemies above four fifths of their life.',
          grants: { moreVsFull: { above: 0.8, more: 0.35 } },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'st_haymaker',
          name: 'Haymaker',
          description: 'Every fifth swing of Strike deals triple damage.',
          grants: { everyNth: { n: 5, multiplier: 3 } },
        },
      },
    ],
    minors: [COMMON[3], COMMON[4], COMMON[1], COMMON[3]],
  },
];

const TRUNK_NOTABLES: Notable[] = [
  {
    id: 'st_reach',
    name: 'Long Reach',
    description: 'Strike reaches 25% further, and swings 6% faster.',
    stats: [stat('attackRange', 'inc', 25), stat('attackSpeed', 'inc', 6)],
  },
  {
    id: 'st_transmutation',
    name: 'Transmutation',
    description:
      'Strike stops dealing Physical. Pick what it deals instead — the Physical ' +
      'modifiers in this tree change with it, the ones on your gear do not.',
    choices: [
      {
        id: 'fire',
        name: 'Searing Blow',
        description: 'Strike deals Fire damage.',
        grants: { convertTree: 'fire' },
      },
      {
        id: 'cold',
        name: 'Frostbite',
        description: 'Strike deals Cold damage.',
        grants: { convertTree: 'cold' },
      },
      {
        id: 'lightning',
        name: 'Thunderclap',
        description: 'Strike deals Lightning damage.',
        grants: { convertTree: 'lightning' },
      },
    ],
  },
  {
    id: 'st_heft',
    name: 'Heft',
    description: 'Strike deals 45% more damage and swings 20% slower.',
    stats: [stat('damage', 'more', 45), stat('attackSpeed', 'inc', -20)],
  },
  {
    id: 'st_footwork',
    name: 'Footwork',
    description: 'You move 18% faster, and Strike swings 8% faster.',
    stats: [stat('moveSpeed', 'inc', 18), stat('attackSpeed', 'inc', 8)],
  },
  {
    id: 'st_focus',
    name: 'Killer Instinct',
    description: 'Strike critically strikes far more often, and far harder.',
    stats: [stat('critChance', 'flat', 11), stat('critMultiplier', 'flat', 45)],
  },
  {
    id: 'st_tempo',
    name: 'Tempo',
    description: 'Strike swings 25% faster.',
    stats: [stat('attackSpeed', 'inc', 25)],
  },
];

export const STRIKE_SPEC: TreeSpec = {
  skillId: 'strike',
  prefix: 'st',
  minorName: 'Notch',
  common: COMMON,
  branches: BRANCHES,
  trunkNotables: TRUNK_NOTABLES,
  needs: {
    splashMultiplier: 'st_sweep',
    splashRadius: 'st_sweep',
    ailmentMultiplier: 'st_rend',
    ailmentDuration: 'st_rend',
    ailmentSpread: 'st_rend',
    doubleStrike: 'st_onslaught',
    areaOfEffect: 'st_shockwave',
    explodeRadius: 'st_shockwave',
    explodeMultiplierAdd: 'st_shockwave',
    explodeOnKill: 'st_shockwave',
  },
};
