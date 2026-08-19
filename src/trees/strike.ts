/**
 * Strike's web. ONE enemy, hit hard, and every bit of coverage past it is
 * bought: Echoes work outward through a pack a body at a time, Repeats go back
 * into the one you aimed at, and Quake makes each of those Burst.
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
    // The IDS here are the old Splash branch's and are kept exactly: a save
    // points at them, and what changed is what the branch DOES, not where its
    // nodes are. Strike no longer hits a circle at all.
    id: 'sweep',
    theme: 'Carry',
    enabler: {
      id: 'st_sweep',
      name: 'Answering Blow',
      description:
        '+2 Echoes. Strike stops being one enemy and starts working outward ' +
        'through a pack, one body at a time.',
      grants: { echoes: 2, manaMultiplier: 1.15 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'st_widearc',
          name: 'Carrying',
          description: '+2 Echoes.',
          grants: { echoes: 2, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'st_carve',
          name: 'Full Weight',
          description: 'Echoes land for 100% of the swing rather than 70%.',
          grants: { echoDamage: 1, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'st_whirlwind',
          name: 'Chorus',
          description: '+3 Echoes, for seven in all once this branch is walked.',
          grants: { echoes: 3, manaMultiplier: 1.08 },
        },
      },
    ],
    minors: [
      COMMON[5],
      COMMON[1],
      COMMON[0],
      COMMON[2],
    ],
  },
  {
    id: 'rend',
    theme: 'Rend',
    enabler: {
      id: 'st_rend',
      name: 'Rend',
      description:
        '+55% chance to apply the Ailment your damage carries. Strike is ' +
        'Physical, so what it carries is a Bleed.',
      grants: { ailmentChance: 55 },
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
            'A further +45% chance to apply the Ailment, so a swing past 100% ' +
            'leaves two Bleeds rather than one.',
          grants: { ailmentChance: 45, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [
      { text: '+6% increased Bleed Damage', grants: { ailmentMultiplier: 1.06 } },
      { text: '+9% chance to apply the Ailment', stats: [stat('ailmentChance', 'flat', 9, ['bleed'])] },
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
      description: 'Strike gains +1 Repeat.',
      grants: { doubleStrike: 1, manaMultiplier: 1.15 },
    },
    twigs: [
      {
        minors: 4,
        notable: {
          id: 'st_flurry',
          name: 'Flurry',
          description: 'And +1 Repeat on top of that, for three swings.',
          grants: { doubleStrike: 1, manaMultiplier: 1.15 },
        },
      },
      {
        minors: 5,
        notable: {
          id: 'st_frenzy',
          name: 'Frenzy',
          description: 'And +2 more Repeats beyond that, for five swings.',
          grants: { doubleStrike: 2, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [COMMON[2], COMMON[1], COMMON[2], COMMON[0]],
  },
  {
    id: 'shockwave',
    theme: 'Tremor',
    enabler: {
      // The ID is what a save points at and never moves; the NAME did, because
      // Shockwave is a skill now and one word may name one mechanism.
      id: 'st_shockwave',
      name: 'Quake',
      description:
        'Every enemy the swing lands on Bursts, for 50% of the damage within ' +
        '1.6 tiles. Strike gains the Area tag.',
      grants: { explode: { radius: 1.6, multiplier: 0.5 }, addTags: ['area'], manaMultiplier: 1.15 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'st_faultline',
          name: 'Faultline',
          description: 'The Burst covers 45% more ground.',
          grants: { explodeRadius: 1.45, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 3,
        forkFrom: { twig: 0, at: 1 },
        notable: {
          id: 'st_upheaval',
          name: 'Upheaval',
          description: 'The Burst carries +50% of the damage, for all of it.',
          grants: { explodeMultiplierAdd: 0.5, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 3,
        forkFrom: { twig: 1, at: 1 },
        notable: {
          id: 'st_aftershock',
          name: 'Aftershock',
          description: 'An enemy killed by Strike Bursts, for 60% of the damage within 2.2 tiles.',
          grants: { explodeOnKill: { radius: 2.2, multiplier: 0.6 }, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [
      { text: '+5% increased Area of Effect', stats: [stat('areaOfEffect', 'inc', 5)] },
      { text: '+4% larger Burst', grants: { explodeRadius: 1.04 } },
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
      description: 'Strike deals 25% more damage to enemies carrying an Ailment.',
      grants: { moreVsAiling: 0.25 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'st_executioner',
          name: 'Executioner',
          description: 'Strike deals 35% more damage to enemies below 33% of their life.',
          grants: { moreVsLow: { below: 0.33, more: 0.35 } },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'st_ambush',
          name: 'Ambush',
          description: 'Strike deals 35% more damage to enemies above 80% of their life.',
          grants: { moreVsFull: { above: 0.8, more: 0.35 } },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'st_haymaker',
          name: 'Haymaker',
          description: 'Every 5th swing of Strike deals 300% damage.',
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
    description: 'Strike has +11% Critical Chance and +45% Critical Damage.',
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
    echoDamage: 'st_sweep',
    ailmentMultiplier: 'st_rend',
    ailmentDuration: 'st_rend',
    ailmentChance: 'st_rend',
    doubleStrike: 'st_onslaught',
    areaOfEffect: 'st_shockwave',
    explodeRadius: 'st_shockwave',
    explodeMultiplierAdd: 'st_shockwave',
    explodeOnKill: 'st_shockwave',
  },
};
