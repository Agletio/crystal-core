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
      description: '+55% chance to apply Burn.',
      grants: { ailmentChance: 55 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'fb_cauterise',
          name: 'Cauterise',
          description: "Burns you apply deal 35% more damage per second and have 25% less duration.",
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
        minors: 3,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'fb_wildfire',
          name: 'Wildfire',
          description: '+45% chance to apply Burn.',
          grants: { ailmentChance: 45, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [
      { text: "+6% more Burn Damage", grants: { ailmentMultiplier: 1.06 } },
      { text: '+9% chance to apply Burn', stats: [stat('ailmentChance', 'flat', 9, ['burn'])] },
      COMMON[0],
      { text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
    ],
  },
  {
    /**
     * THE BRANCH THAT NEEDS THE OTHER ONE. A Burn is damage spread over
     * seconds; this eats it and lands what was LEFT all at once, so the tree's
     * two halves stop being alternatives — Kindling lights the body and this
     * cashes it in. It is worth exactly nothing on a floor nothing has lit,
     * which is what makes taking both a build rather than a rider.
     */
    id: 'bellows',
    theme: 'Backdraft',
    enabler: {
      id: 'fb_bellows',
      name: 'Backdraft',
      description:
        'A hit on an enemy carrying your Ailment consumes every stack and deals ' +
        '60% of what they had left, at once.',
      grants: { consumeAilment: 0.6, manaMultiplier: 1.15 },
    },
    twigs: [
      {
        minors: 4,
        notable: {
          id: 'fb_draught',
          name: 'Draught',
          description: "Adds 45 percentage points to the share of remaining Ailment damage dealt by Backdraft.",
          grants: { consumeAilment: 0.45 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'fb_furnace',
          name: 'Furnace',
          description: "Adds 30 percentage points to the share of remaining Ailment damage dealt by Backdraft.",
          grants: { consumeAilment: 0.3 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'fb_forgefire',
          name: 'Forge-Fire',
          description: "Adds 65 percentage points to the share of remaining Ailment damage dealt by Backdraft.",
          grants: { consumeAilment: 0.65, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [COMMON[0], COMMON[3], COMMON[1], COMMON[2]],
  },
  {
    id: 'volley',
    theme: 'Salvo',
    enabler: {
      id: 'fb_splitcast',
      name: 'Split Cast',
      description: 'Fireball throws +1 Projectile.',
      grants: { extraTargets: 1, manaMultiplier: 1.15 },
      // A Projectile is one more fall under Meteor, and an ember is one already.
      under: { fb_meteor: { description: '+1 Meteor.', grants: { extraTargets: 1, manaMultiplier: 1.15 } } },
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
          under: {
            fb_meteor: { description: 'Meteors Spread 60% further, and fall on the enemies furthest into it rather than the nearest.', grants: { spreadRange: 1.6, spreadFar: true, manaMultiplier: 1.08 } },
            fb_spray: { description: 'The fan reaches 2 tiles deeper.', grants: { spray: { reach: 2 }, manaMultiplier: 1.08 } },
          },
        },
      },
      {
        minors: 3,
        notable: {
          id: 'fb_volley',
          name: 'Volley',
          description: 'Fireball throws +1 Projectile.',
          grants: { extraTargets: 1, manaMultiplier: 1.15 },
          under: { fb_meteor: { description: '+1 Meteor.', grants: { extraTargets: 1, manaMultiplier: 1.15 } } },
        },
      },
      {
        /**
         * EMBER SPRAY, the keystone at the tip of the Salvo line: the ball is a
         * fan of embers, one body each and the rest lost, so every Projectile
         * walked to reach it is one more ember. A room in front of you is the
         * whole of what it is worth.
         */
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'fb_spray',
          name: 'Ember Spray',
          keystone: true,
          description:
            'Fireball is 5 embers in a 60° fan at least 5 tiles deep, one enemy each, 70% less ' +
            'damage apiece; an ember with nobody to land on is lost.',
          becomes:
            'You throw 5 embers in a 60° fan at least 5 tiles deep, one enemy each nearest first, ' +
            'each 70% less damage and Splashing on its own. An ember with nobody to land on is lost.',
          grants: { spray: { count: 5, arc: 60, reach: 5, less: 0.7 }, manaMultiplier: 1.15 },
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
      // Nothing flies under either keystone: a Pierce is a wider Burst or an ember.
      under: {
        fb_meteor: { description: "Adds 0.4 tiles to the radius of the Meteor Burst.", grants: { meteor: { radius: 0.4 }, manaMultiplier: 1.15 } },
        fb_spray: { description: '+1 ember.', grants: { spray: { count: 1 }, manaMultiplier: 1.15 } },
      },
    },
    twigs: [
      {
        minors: 5,
        notable: {
          // The ID is kept — a save points at it — where the NAME was Momentum's
          // and that mechanic is gone.
          id: 'fb_momentum',
          name: 'Clean Through',
          description: 'Pierce deals full damage instead of 70%.',
          grants: { pierceDamage: 1, manaMultiplier: 1.08 },
          under: {
            fb_meteor: { description: "Adds 20 percentage points to Meteor's damage bonus.", grants: { meteor: { more: 0.2 }, manaMultiplier: 1.08 } },
            fb_spray: { description: "Reduces the damage penalty on embers by 10 percentage points.", grants: { spray: { less: -0.1 }, manaMultiplier: 1.08 } },
          },
        },
      },
      {
        /**
         * METEOR, the keystone at the tip of the Bore line: no shot at all, the
         * fire falls on the body and Bursts. The Pierce walked to reach it is
         * width under it, and a Projectile is a second fall.
         */
        minors: 5,
        notable: {
          id: 'fb_meteor',
          name: 'Meteor',
          keystone: true,
          description:
            'Fireball falls from above onto the enemy and Bursts 1.6 tiles round it, for ' +
            '20% more damage. Nothing Pierces or Arcs. Gains the Area tag and loses the Projectile tag.',
          becomes:
            'Fire falls from above onto the enemy you aimed at and Bursts 1.6 tiles round it, ' +
            '20% more damage to everything it covers. Nothing Pierces or Arcs, and a Projectile is one more fall.',
          grants: { meteor: { radius: 1.6, more: 0.2 }, manaMultiplier: 1.3, addTags: ['area'], dropTags: ['projectile'] },
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
      under: {
        fb_meteor: { description: "Adds 0.4 tiles to the radius of the Meteor Burst.", grants: { meteor: { radius: 0.4 }, manaMultiplier: 1.15 } },
        fb_spray: { description: 'The fan opens 20° wider.', grants: { spray: { arc: 20 }, manaMultiplier: 1.15 } },
      },
    },
    twigs: [
      {
        minors: 4,
        notable: {
          id: 'fb_rebound',
          name: 'Rebound',
          description: 'Arcs deal full damage instead of 70%.',
          grants: { chainDamage: 1, manaMultiplier: 1.08 },
          under: {
            fb_meteor: { description: "Adds 20 percentage points to Meteor's damage bonus.", grants: { meteor: { more: 0.2 }, manaMultiplier: 1.08 } },
            fb_spray: { description: "Reduces the damage penalty on embers by 10 percentage points.", grants: { spray: { less: -0.1 }, manaMultiplier: 1.08 } },
          },
        },
      },
      {
        minors: 5,
        forkFrom: { twig: 0, at: 2 },
        notable: {
          id: 'fb_leaping',
          name: 'Leaping Flame',
          description: 'Fireball gains +1 Arc.',
          grants: { chains: 1, manaMultiplier: 1.15 },
          under: {
            fb_meteor: { description: "Adds 0.4 tiles to the radius of the Meteor Burst.", grants: { meteor: { radius: 0.4 }, manaMultiplier: 1.15 } },
            fb_spray: { description: 'The fan opens 20° wider.', grants: { spray: { arc: 20 }, manaMultiplier: 1.15 } },
          },
        },
      },
    ],
    minors: [COMMON[0], COMMON[2], COMMON[1], COMMON[0]],
  },
  {
    /**
     * THE CHAIN REACTION. Every other branch here decides where the ball GOES;
     * this one decides what happens after it has already killed something —
     * a Burst off the body, and a Burst off whatever THAT takes down, `BURST`
     * deep. A pack tight enough goes up off one cast, and a pack that is not
     * gets nothing at all, which is what makes it a decision about the floor
     * you run rather than a rider on the damage.
     */
    id: 'cruelty',
    theme: 'Detonation',
    enabler: {
      id: 'fb_immolate',
      name: 'Detonation',
      description: "Enemies killed by Fireball Burst in a 2-tile radius, dealing 30% of Fireball's damage.",
      grants: { explodeOnKill: { radius: 2, multiplier: 0.3 }, manaMultiplier: 1.15 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'fb_closequarters',
          name: 'Firestorm',
          description: "Adds 0.8 tiles to the radius of the Burst triggered by kills.",
          grants: { explodeOnKill: { radius: 0.8, multiplier: 0 } },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'fb_executioner',
          name: 'Fuel Air',
          description: "Adds 25 percentage points to the damage share of the Burst triggered by kills.",
          grants: { explodeOnKill: { radius: 0, multiplier: 0.25 } },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'fb_overload',
          name: 'Overload',
          description:
            "Adds 0.6 tiles to the radius and 20 percentage points to the damage share of the Burst " +
          "triggered by kills.",
          grants: { explodeOnKill: { radius: 0.6, multiplier: 0.2 }, manaMultiplier: 1.15 },
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
    description: 'Fireball deals 30% more damage while nothing has hit you for 3s.',
    grants: { untouchedMore: { after: 3, more: 0.3 } },
  },
  {
    id: 'fb_transmutation',
    name: 'Transmutation',
    description: 'Convert Fireball to another damage type.',
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
    description: "Fireball deals 45% more damage and has 20% reduced Cast Speed.",
    stats: [stat('damage', 'more', 45), stat('castSpeed', 'inc', -20)],
  },
  {
    id: 'fb_opening',
    name: 'Opening Salvo',
    description: "Fireball deals 35% more damage to enemies at 80% of maximum Life or more.",
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
    description: "Fireball has 25% increased Cast Speed.",
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
    consumeAilment: 'fb_bellows',
    explodeOnKill: 'fb_immolate',
    ailmentMultiplier: 'fb_kindling',
    ailmentDuration: 'fb_kindling',
    ailmentChance: 'fb_kindling',
    spreadRange: 'fb_splitcast',
    spreadFar: 'fb_splitcast',
    pierceDamage: 'fb_piercing',
    chainDamage: 'fb_arcing',
  },
};
