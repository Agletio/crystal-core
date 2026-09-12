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
      description: '+2 Echoes.',
      grants: { echoes: 2, manaMultiplier: 1.15 },
      // An Echo is a blade at another body under one keystone and reach under the other.
      under: {
        st_ethereal: { description: '+1 Projectile.', grants: { extraTargets: 1, manaMultiplier: 1.15 } },
        st_whirl: { description: '+12% increased Area of Effect.', stats: [stat('areaOfEffect', 'inc', 12)], grants: { manaMultiplier: 1.15 } },
      },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'st_widearc',
          name: 'Carrying',
          description: '+2 Echoes.',
          grants: { echoes: 2, manaMultiplier: 1.08 },
          under: {
            st_ethereal: { description: '+1 Projectile.', grants: { extraTargets: 1, manaMultiplier: 1.08 } },
            st_whirl: { description: '+10% increased Area of Effect.', stats: [stat('areaOfEffect', 'inc', 10)], grants: { manaMultiplier: 1.08 } },
          },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'st_carve',
          name: 'Full Weight',
          description: 'Echoes land for 100% of the swing rather than 70%.',
          grants: { echoDamage: 1, manaMultiplier: 1.08 },
          under: {
            st_ethereal: { description: 'Thrown blades fly 2 tiles further.', grants: { ghostBlade: { reach: 2 }, manaMultiplier: 1.08 } },
            st_whirl: { description: "Reduces Whirlwind's damage penalty by 15 percentage points.", grants: { whirl: { less: -0.15 }, manaMultiplier: 1.08 } },
          },
        },
      },
      {
        /**
         * ETHEREAL STRIKE, the keystone at the tip of the Carry line: no swing
         * at all, a ghost of the weapon thrown through the pack and back. The
         * Echoes walked to reach it are thrown blades under it, and every
         * Repeat is one more blade at the body you aimed at.
         */
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'st_ethereal',
          name: 'Ethereal Strike',
          keystone: true,
          description:
            'A ghost of your weapon is thrown 6 tiles, through every enemy in its line ' +
            'for 75% less damage, and comes back to your hand through them again. ' +
            'Gains the Projectile tag and loses the Melee tag.',
          becomes:
            'A ghost of your weapon is thrown 6 tiles, spinning through every enemy in ' +
            'its line for 75% less damage, and comes back to your hand hitting them ' +
            'again on the way. A Repeat throws one more at the same enemy.',
          grants: {
            ghostBlade: { less: 0.75, reach: 6 },
            manaMultiplier: 1.15,
            addTags: ['projectile'],
            dropTags: ['melee'],
          },
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
      description: '+55% chance to apply Bleed.',
      grants: { ailmentChance: 55 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'st_hemorrhage',
          name: 'Hemorrhage',
          description: "Bleeds you apply deal 40% more damage per second and have 25% less duration.",
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
        minors: 3,
        notable: {
          id: 'st_flurry',
          name: 'Flurry',
          description: '+1 Repeat.',
          grants: { doubleStrike: 1, manaMultiplier: 1.15 },
        },
      },
      {
        minors: 5,
        notable: {
          id: 'st_frenzy',
          name: 'Frenzy',
          description: '+2 Repeats.',
          grants: { doubleStrike: 2, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [COMMON[2], COMMON[1], COMMON[2], COMMON[0]],
  },
  {
    /**
     * THE BRANCH THAT ARGUES WITH THE REST OF THE TREE. Every other one here
     * wants the swing rate up — Onslaught doubles it, the Echoes ride it, half
     * the minors sell it — and this one pays for it being DOWN, measured
     * against the fastest weapon in the game. A maul at 0.8 sits 94% under a
     * dagger's 1.55 and is paid for all of it, so Strike's heavy build is a
     * real second answer rather than the same build with bigger numbers, and
     * the two cannot be walked together for full value.
     */
    id: 'heft',
    theme: 'Heft',
    enabler: {
      id: 'st_rhythm',
      name: 'Heft',
      description: "Strike hits deal up to 30% more damage as your attack rate falls below 1.55 attacks/s. The " +
      "maximum bonus applies at 0.775 attacks/s or slower.",
      grants: { slowMore: 0.3 },
    },
    twigs: [
      {
        minors: 4,
        notable: {
          id: 'st_cadence',
          name: 'Dead Lift',
          description: "Raises Rhythm's maximum damage bonus by 35 percentage points.",
          grants: { slowMore: 0.35 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'st_relentless',
          name: 'Anvil Weight',
          description:
            "Raises Rhythm's maximum damage bonus by 25 percentage points. Strike Splash deals an additional " +
          "15% of hit damage.",
          grants: { slowMore: 0.25, splashShare: 0.15 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'st_followthrough',
          name: 'Follow-Through',
          description:
            "Raises Rhythm's maximum damage bonus by 45 percentage points. Strike has 15% reduced Attack " +
          "Speed.",
          grants: { slowMore: 0.45 },
          stats: [stat('attackSpeed', 'inc', -15)],
        },
      },
    ],
    minors: [
      COMMON[0],
      { text: '+4% increased Physical Damage', stats: [stat('damage', 'inc', 4, ['physical'])] },
      COMMON[1],
      COMMON[0],
    ],
  },
  {
    // THE IDS ARE THE OLD BULWARK BRANCH'S and are kept exactly: a save points
    // at them, and what changed is what the branch DOES. Flat armour and life
    // belong to gear and the character's own web — a SKILL's tree buys what the
    // skill DOES, and what Strike does that is worth walking to is its Splash.
    id: 'bulwark',
    theme: 'Spill',
    enabler: {
      id: 'st_bulwark',
      name: 'Spill',
      description: "Adds 15 percentage points to Splash damage as a share of the hit.",
      grants: { splashShare: 0.15 },
      // Nothing Splashes under Whirlwind: the circle is what a Splash was for.
      under: { st_whirl: { description: '+10% increased Area of Effect.', stats: [stat('areaOfEffect', 'inc', 10)] } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'st_ironhide',
          name: 'Wide Swing',
          description: "Splash has 40% more radius.",
          grants: { splashRadius: 1.4 },
          under: { st_whirl: { description: '+15% increased Area of Effect.', stats: [stat('areaOfEffect', 'inc', 15)] } },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'st_secondwind',
          name: 'Overspill',
          description: "Adds 25 percentage points to Splash damage as a share of the hit.",
          grants: { splashShare: 0.25 },
          under: { st_whirl: { description: "Reduces Whirlwind's damage penalty by 10 percentage points.", grants: { whirl: { less: -0.1 } } } },
        },
      },
      {
        /**
         * WHIRLWIND, the keystone at the tip of the Spill line: no target and
         * no Splash, everything round you hit at once. The Splash nodes walked
         * to reach it are Area under it, which is what a Splash was buying.
         */
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'st_whirl',
          name: 'Whirlwind',
          keystone: true,
          description:
            'You spin: everything within 1.6 tiles of you is hit for 45% less damage, ' +
            'and nothing Splashes. Gains the Area tag.',
          becomes:
            'You spin, hitting everything within 1.6 tiles of you for 45% less damage. ' +
            'Nothing Splashes: everything near is already hit. A Repeat is another spin.',
          grants: { whirl: { less: 0.45, radius: 1.6 }, manaMultiplier: 1.15, addTags: ['area'] },
        },
      },
    ],
    minors: [
      { text: '+8% increased Area of Effect', stats: [stat('areaOfEffect', 'inc', 8)] },
      { text: '+5% increased Physical Damage', stats: [stat('damage', 'inc', 5, ['physical'])] },
      { text: '+6% increased Area of Effect', stats: [stat('areaOfEffect', 'inc', 6)] },
      COMMON[1],
    ],
  },
  {
    /**
     * THE SWING DOES NOT STOP AT A BODY IT KILLED. An Echo is a SHARE landing
     * on a neighbour; a carry is the same blow at FULL damage, and it only ever
     * happens off a kill — so the branch pays nothing until the build is already
     * killing, and then it pays a whole clear. Its far notable is the trade the
     * other way: a kill that carries costs the swing that follows it.
     */
    id: 'cleave',
    theme: 'Cleave',
    enabler: {
      id: 'st_cruelty',
      name: 'Cleave',
      description:
        "When Strike kills its target, it hits the nearest enemy within 1.8 tiles for full damage. Can " +
      "continue once per use.",
      grants: { carryOnKill: 1, manaMultiplier: 1.15 },
      // A thrown blade carries on whatever it kills, so a carry is reach; a
      // spin that kills spins on, so the word changes and the switch does not.
      under: {
        st_ethereal: { description: 'Thrown blades fly 1 tile further.', grants: { ghostBlade: { reach: 1 }, manaMultiplier: 1.15 } },
        st_whirl: { description: 'A spin that kills spins 1 more time.', grants: { carryOnKill: 1, manaMultiplier: 1.15 } },
      },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'st_executioner',
          name: 'Through and Through',
          description: "Cleave can continue through 2 more kills per use.",
          grants: { carryOnKill: 2, manaMultiplier: 1.08 },
          under: {
            st_ethereal: { description: 'Thrown blades fly 2 tiles further.', grants: { ghostBlade: { reach: 2 }, manaMultiplier: 1.08 } },
            st_whirl: { description: 'A spin that kills spins 2 more times.', grants: { carryOnKill: 2, manaMultiplier: 1.08 } },
          },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'st_ambush',
          name: 'Reaping',
          description: 'A blow that kills swings 1 more time. Splash deals an additional 20% of hit damage.',
          grants: { carryOnKill: 1, splashShare: 0.2 },
          under: {
            st_ethereal: { description: 'Thrown blades fly 1 tile further. Splash deals an additional 20% of hit damage.', grants: { ghostBlade: { reach: 1 }, splashShare: 0.2 } },
            st_whirl: { description: "A spin that kills spins 1 more time. Reduces Whirlwind's damage penalty by 10 percentage points.", grants: { carryOnKill: 1, whirl: { less: -0.1 } } },
          },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'st_haymaker',
          name: 'Butcher',
          description:
            "A blow that kills swings on 3 more times, and Strike deals 35% more damage to enemies at 33% of " +
          "maximum Life or less.",
          grants: { carryOnKill: 3, moreVsLow: { below: 0.33, more: 0.35 }, manaMultiplier: 1.15 },
          under: {
            st_ethereal: {
              description: "Thrown blades fly 3 tiles further, and Strike deals 35% more damage to enemies at 33% of " +
              "maximum Life or less.",
              grants: { ghostBlade: { reach: 3 }, moreVsLow: { below: 0.33, more: 0.35 }, manaMultiplier: 1.15 },
            },
            st_whirl: {
              description: "A spin that kills spins 3 more times, and Strike deals 35% more damage to enemies at 33% of " +
              "maximum Life or less.",
              grants: { carryOnKill: 3, moreVsLow: { below: 0.33, more: 0.35 }, manaMultiplier: 1.15 },
            },
          },
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
    description: "Strike has 25% increased Attack Range, and has 6% increased Attack Speed.",
    stats: [stat('attackRange', 'inc', 25), stat('attackSpeed', 'inc', 6)],
  },
  {
    id: 'st_transmutation',
    name: 'Transmutation',
    description: 'Convert Strike to another damage type.',
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
    description: "Strike deals 45% more damage and has 20% reduced Attack Speed.",
    stats: [stat('damage', 'more', 45), stat('attackSpeed', 'inc', -20)],
  },
  {
    id: 'st_footwork',
    name: 'Footwork',
    description: "Strike has 18% increased Attack Speed and has 10% increased Attack Range.",
    stats: [stat('attackSpeed', 'inc', 18), stat('attackRange', 'inc', 10)],
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
    description: "Strike has 25% increased Attack Speed.",
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
    slowMore: 'st_rhythm',
    echoDamage: 'st_sweep',
    ailmentMultiplier: 'st_rend',
    ailmentDuration: 'st_rend',
    ailmentChance: 'st_rend',
    doubleStrike: 'st_onslaught',
  },
};
