/**
 * Fireball's web: a common trunk, and six branches you have to unlock.
 *
 * The trunk is everything that helps whatever you are building — fire damage,
 * cast speed, crit, reach. It is where you start, and it is the only way to get
 * from one branch to another.
 *
 * A branch hangs off ONE node, and that node is what makes the rest of the
 * branch mean anything: Area of Effect does nothing to a Fireball that does not
 * burst, so it lives behind Detonation and cannot be bought without it. Burn
 * duration lives behind Kindling. That is the whole point of the shape — you
 * cannot spend a point on something that will not do anything.
 */
import { stat } from './node';
import type { Branch, Minor, Notable, TreeSpec } from './spec';

/**
 * Lines that help every build. The trunk is made of these, and so is the filler
 * in branches that have no numbers of their own to give.
 */
const COMMON: Minor[] = [
  { text: '+5% increased Fire Damage', stats: [stat('damage', 'inc', 5, ['fire'])] },
  { text: '+4% increased Damage', stats: [stat('damage', 'inc', 4)] },
  { text: '+3% increased Cast Speed', stats: [stat('castSpeed', 'inc', 3)] },
  { text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
  { text: '+8% Critical Damage', stats: [stat('critMultiplier', 'flat', 8)] },
  { text: '+4% increased Attack Range', stats: [stat('attackRange', 'inc', 4)] },
];

const BRANCHES: Branch[] = [
  {
    id: 'ignition',
    theme: 'Smoulder',
    enabler: {
      id: 'fb_kindling',
      name: 'Kindling',
      description:
        'Fireball can no longer Critically strike. A cast that would have ' +
        'instead leaves a Burn worth 260% of the hit over 4s.',
      grants: { ailmentChance: 55 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'fb_cauterise',
          name: 'Cauterise',
          description: 'Burns you apply deal 35% more damage over a 25% shorter time.',
          grants: { ailmentMultiplier: 1.35, ailmentDuration: 0.75 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'fb_slowburn',
          name: 'Slow Burn',
          description: 'Burns you apply last 60% longer.',
          grants: { ailmentDuration: 1.6 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'fb_wildfire',
          name: 'Wildfire',
          description:
            'A Burn ticking Critically lays the same Burn on everything within 2 tiles.',
          grants: { ailmentChance: 45, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [
      { text: '+6% increased Burn Damage', grants: { ailmentMultiplier: 1.06 } },
      { text: '+5% increased Burn Duration', grants: { ailmentDuration: 1.05 } },
      COMMON[0],
      { text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
    ],
  },
  {
    id: 'detonation',
    theme: 'Blastwork',
    enabler: {
      id: 'fb_detonation',
      name: 'Detonation',
      description:
        'Fireball Bursts where it lands, for 55% of the damage within 1.8 ' +
        'tiles. Fireball gains the Area tag.',
      grants: { explode: { radius: 1.8, multiplier: 0.55 }, addTags: ['area'], manaMultiplier: 1.15 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'fb_concussive',
          name: 'Concussive Blast',
          description: 'The Burst covers 45% more ground.',
          grants: { explodeRadius: 1.45, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 3,
        forkFrom: { twig: 0, at: 1 },
        notable: {
          id: 'fb_fuelair',
          name: 'Fuel-Air Charge',
          description: 'The Burst carries +45% of the damage, for all of it.',
          grants: { explodeMultiplierAdd: 0.45, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 3,
        forkFrom: { twig: 1, at: 1 },
        notable: {
          id: 'fb_chainreaction',
          name: 'Cascade',
          description:
            'An enemy killed by Fireball Bursts, for 60% of the damage within 2.2 tiles.',
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
    id: 'volley',
    theme: 'Salvo',
    enabler: {
      id: 'fb_splitcast',
      name: 'Split Cast',
      description: 'Fireball throws +1 Projectile.',
      grants: { extraTargets: 1, manaMultiplier: 1.15 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'fb_focused',
          name: 'Scattershot',
          description:
            'Projectiles Spread 60% further, and take the enemies furthest ' +
            'into it rather than the nearest.',
          grants: { spreadRange: 1.6, spreadFar: true, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 3,
        notable: {
          id: 'fb_volley',
          name: 'Volley',
          description: 'Fireball throws +1 Projectile on top of that, for three.',
          grants: { extraTargets: 1, manaMultiplier: 1.15 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'fb_barrage',
          name: 'Barrage',
          description: 'And +2 more Projectiles beyond that, for five.',
          grants: { extraTargets: 2, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [COMMON[2], COMMON[0], COMMON[1], COMMON[2]],
  },
  {
    id: 'penetration',
    theme: 'Bore',
    enabler: {
      id: 'fb_piercing',
      name: 'Piercing Flame',
      description: 'Fireball gains +1 Pierce.',
      grants: { pierce: 1, manaMultiplier: 1.15 },
    },
    twigs: [
      {
        minors: 5,
        notable: {
          id: 'fb_momentum',
          name: 'Momentum',
          description: 'Pierce deals full damage instead of 70%.',
          grants: { pierceDamage: 1, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 5,
        notable: {
          id: 'fb_overpen',
          name: 'Overpenetration',
          description: 'Fireball gains +1 more Pierce, for two.',
          grants: { pierce: 1, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [COMMON[5], COMMON[0], COMMON[1], COMMON[5]],
  },
  {
    id: 'arc',
    theme: 'Leapfire',
    enabler: {
      id: 'fb_arcing',
      name: 'Arcing Flame',
      description: 'Fireball gains +1 Arc.',
      grants: { chains: 1, manaMultiplier: 1.15 },
    },
    twigs: [
      {
        minors: 4,
        notable: {
          id: 'fb_rebound',
          name: 'Rebound',
          description: 'Arcs deal full damage instead of 70%.',
          grants: { chainDamage: 1, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 5,
        forkFrom: { twig: 0, at: 2 },
        notable: {
          id: 'fb_leaping',
          name: 'Leaping Flame',
          description: 'Fireball gains +1 more Arc, for two.',
          grants: { chains: 1, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [COMMON[0], COMMON[2], COMMON[1], COMMON[0]],
  },
  {
    id: 'cruelty',
    theme: 'Malice',
    enabler: {
      id: 'fb_immolate',
      name: 'Immolate',
      description: 'Fireball deals 25% more damage to enemies carrying an Ailment.',
      grants: { moreVsAiling: 0.25 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'fb_closequarters',
          name: 'Close Quarters',
          description: 'Fireball deals 30% more damage to enemies within 2.5 tiles of you.',
          grants: { moreClose: { within: 2.5, more: 0.3 } },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'fb_executioner',
          name: 'Executioner',
          description: 'Fireball deals 35% more damage to enemies below 33% of their life.',
          grants: { moreVsLow: { below: 0.33, more: 0.35 } },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'fb_overload',
          name: 'Overload',
          description: 'Every 5th cast of Fireball deals 300% damage.',
          grants: { everyNth: { n: 5, multiplier: 3 } },
        },
      },
    ],
    minors: [COMMON[3], COMMON[4], COMMON[1], COMMON[3]],
  },
];

/**
 * The trunk's own, each at the end of its own short spur. Every one does
 * something for any build, which is what earns it a place out here where
 * nothing has been unlocked — they are what a branch has to beat.
 */
const TRUNK_NOTABLES: Notable[] = [
  {
    id: 'fb_longfuse',
    name: 'Long Fuse',
    description: 'Fireball deals 30% more damage to enemies more than 5 tiles away.',
    grants: { moreFar: { beyond: 5, more: 0.3 } },
  },
  {
    id: 'fb_transmutation',
    name: 'Transmutation',
    description:
      'Fireball stops dealing Fire. Pick what it deals instead — the Fire ' +
      'modifiers in this tree change with it, the ones on your gear do not.',
    choices: [
      {
        id: 'cold',
        name: 'Frostfire',
        description: 'Fireball deals Cold damage.',
        grants: { convertTree: 'cold' },
      },
      {
        id: 'lightning',
        name: 'Stormfire',
        description: 'Fireball deals Lightning damage.',
        grants: { convertTree: 'lightning' },
      },
    ],
  },
  {
    id: 'fb_reserves',
    name: 'Deep Reserves',
    description: 'Fireball deals 45% more damage and is cast 20% slower.',
    stats: [stat('damage', 'more', 45), stat('castSpeed', 'inc', -20)],
  },
  {
    id: 'fb_opening',
    name: 'Opening Salvo',
    description: 'Fireball deals 35% more damage to enemies above 80% of their life.',
    grants: { moreVsFull: { above: 0.8, more: 0.35 } },
  },
  {
    id: 'fb_focus',
    name: 'Sharpened Focus',
    description: 'Fireball has +11% Critical Chance and +45% Critical Damage.',
    stats: [stat('critChance', 'flat', 11), stat('critMultiplier', 'flat', 45)],
  },
  {
    id: 'fb_emberstorm',
    name: 'Ember Storm',
    description: 'Fireball is cast 25% faster.',
    stats: [stat('castSpeed', 'inc', 25)],
  },
];

export const FIREBALL_SPEC: TreeSpec = {
  skillId: 'fireball',
  prefix: 'fb',
  minorName: 'Ember',
  common: COMMON,
  branches: BRANCHES,
  trunkNotables: TRUNK_NOTABLES,
  needs: {
    areaOfEffect: 'fb_detonation',
    explodeRadius: 'fb_detonation',
    explodeMultiplierAdd: 'fb_detonation',
    explodeOnKill: 'fb_detonation',
    ailmentMultiplier: 'fb_kindling',
    ailmentDuration: 'fb_kindling',
    ailmentChance: 'fb_kindling',
    spreadRange: 'fb_splitcast',
    spreadFar: 'fb_splitcast',
    pierceDamage: 'fb_piercing',
    chainDamage: 'fb_arcing',
  },
};
