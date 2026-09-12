/**
 * Leap's web. A jump goes OVER rather than through, and unlike a step it
 * LANDS — so in a fight it goes AT the pack and every branch here is either
 * what coming down does to what is under it, or what you are for the seconds
 * after it.
 *
 * A landing deals no damage and never will: every damage number in the game
 * belongs to the skill in the main slot, so what a landing does is Slow.
 */
import { stat } from '../trees/node';
import type { Branch, Minor, Notable, TreeSpec } from '../trees/spec';

const COMMON: Minor[] = [
  { text: '+5% increased Movement Speed', stats: [stat('moveSpeed', 'inc', 5)] },
  { text: '3% reduced Skill Cooldown', stats: [stat('cooldown', 'inc', -3)] },
  {
    text: "Leap has 8% more maximum travel distance",
    grants: { moveDistance: 1.08 },
  },
  { text: '+6% increased Movement Speed', stats: [stat('moveSpeed', 'inc', 6)] },
  {
    text: "Each use of your movement skill restores 2% of your maximum Mana",
    grants: { moveMana: 0.02 },
  },
  { text: '4% reduced Skill Cooldown', stats: [stat('cooldown', 'inc', -4)] },
];

const BRANCHES: Branch[] = [
  {
    id: 'impact',
    theme: 'Impact',
    enabler: {
      id: 'lp_impact',
      name: 'Impact',
      description: "Leap Slows the enemy you land on by 45% for 5s.",
      grants: { landingPin: { slow: 0.45, seconds: 5 } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'lp_pinned',
          name: 'Pinned',
          description: "Adds 20 percentage points to the Slow from Impact, up to a maximum Slow of 90%.",
          grants: { pinSlow: 0.2 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'lp_crushing',
          name: 'Crushing Weight',
          description: "The Slow from Impact lasts 4s longer.",
          grants: { pinLonger: 4 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'lp_standing',
          name: 'Standing Over',
          description: "For 3s after Leap, your hits deal 25% more damage. Adds to other damage bonuses after Leap.",
          grants: { afterStepDamage: 0.25 },
        },
      },
    ],
    minors: [COMMON[2], COMMON[1], COMMON[2], COMMON[0]],
  },
  {
    id: 'tremor',
    theme: 'Tremor',
    enabler: {
      id: 'lp_tremor',
      name: 'Tremor',
      description: 'Landing Slows enemies within 3 tiles by 30% for 4s.',
      grants: { landingSlow: { radius: 3, slow: 0.3, seconds: 4 } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'lp_faultline',
          name: 'Fault',
          description: "Tremor has 60% more radius.",
          grants: { landingRadius: 1.6 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'lp_aftershock',
          name: 'Aftershock',
          description: "Adds 25 percentage points to the Slow from Tremor, up to a maximum Slow of 90%.",
          grants: { landingMore: 0.25 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'lp_lasting',
          name: 'Lasting Ground',
          description: "The Slow from Tremor lasts 4s longer.",
          grants: { landingSeconds: 4 },
        },
      },
    ],
    minors: [COMMON[1], COMMON[0], COMMON[1], COMMON[3]],
  },
  {
    id: 'footing',
    theme: 'Footing',
    enabler: {
      id: 'lp_footing',
      name: 'Sure Footing',
      description: "Leap has 35% less cooldown.",
      grants: { moveCooldown: 0.65 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'lp_rebound',
          name: 'Rebound',
          description: "Leap has 25% less cooldown. Multiplies with Sure Footing.",
          grants: { moveCooldown: 0.75 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'lp_charge',
          name: 'Charging In',
          description: "For 3s after landing you have 30% more Movement Speed.",
          grants: { afterStepSpeed: 0.3 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'lp_pounce',
          name: 'Pounce',
          description: "Leap has 40% less cooldown when you land on an enemy.",
          grants: { pressedCooldown: 0.6 },
        },
      },
    ],
    minors: [COMMON[4], COMMON[0], COMMON[4], COMMON[2]],
  },
  {
    id: 'fall',
    theme: 'Fall',
    enabler: {
      id: 'lp_longfall',
      name: 'Long Fall',
      description: "Leap has 60% more maximum travel distance.",
      grants: { moveDistance: 1.6 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'lp_further',
          name: 'Further',
          description: "Leap has 40% more maximum travel distance.",
          grants: { moveDistance: 1.4 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'lp_headlong',
          name: 'Headlong',
          description: "For 3s after Leap, your hits deal 20% more damage. Adds to other damage bonuses after Leap.",
          grants: { afterStepDamage: 0.2 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'lp_skyfall',
          name: 'Skyfall',
          description: "Leap has 30% more maximum travel distance.",
          grants: { moveDistance: 1.3 },
        },
      },
    ],
    minors: [COMMON[0], COMMON[1], COMMON[0], COMMON[3]],
  },
  {
    id: 'reprieve',
    theme: 'Reprieve',
    enabler: {
      id: 'lp_reprieve',
      name: 'Reprieve',
      description: "Landing restores 8% of your maximum Life.",
      grants: { moveHeal: 0.08 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'lp_secondbreath',
          name: 'Second Breath',
          description: "Landing restores a further 6% of your maximum Life.",
          grants: { moveHeal: 0.06 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'lp_knitting',
          name: 'Knitting',
          description: "For 3s after landing you regenerate 3% of your maximum Life a second.",
          grants: { afterStepRegen: { life: 0.03 } },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'lp_drawingbreath',
          name: 'Drawing Breath',
          description: "For 3s after landing you regenerate 4% of your maximum Mana a second.",
          grants: { afterStepRegen: { mana: 0.04 } },
        },
      },
    ],
    minors: [COMMON[3], COMMON[5], COMMON[3], COMMON[0]],
  },
  {
    id: 'bracing',
    theme: 'Bracing',
    enabler: {
      id: 'lp_bracing',
      name: 'Bracing',
      description: "For 3s after Leap, take 25% less damage from hits and boss drains. Movement damage reductions " +
      "add, up to 80%.",
      grants: { afterStepGuard: 0.25 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'lp_setstance',
          name: 'Set Stance',
          description: "For 3s after Leap, take 20% less damage from hits and boss drains. Movement damage reductions " +
          "add, up to 80%.",
          grants: { afterStepGuard: 0.2 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'lp_dugin',
          name: 'Dug In',
          description: "Bonuses granted after Leap last 2s longer.",
          grants: { afterStepLonger: 2 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'lp_ironfooted',
          name: 'Iron Footed',
          description: "Bonuses granted after Leap last 2s longer.",
          grants: { afterStepLonger: 2 },
        },
      },
    ],
    minors: [COMMON[5], COMMON[3], COMMON[5], COMMON[4]],
  },
];

const TRUNK_NOTABLES: Notable[] = [
  {
    id: 'lp_stride',
    name: 'Stride',
    description: '+18% increased Movement Speed.',
    stats: [stat('moveSpeed', 'inc', 18)],
  },
  {
    id: 'lp_measure',
    name: 'Measure',
    description: '12% reduced Skill Cooldown.',
    stats: [stat('cooldown', 'inc', -12)],
  },
  {
    id: 'lp_longlegs',
    name: 'Longlegs',
    description: "Leap has 25% more maximum travel distance.",
    grants: { moveDistance: 1.25 },
  },
  {
    id: 'lp_wellspring',
    name: 'Wellspring',
    description: "Each use of your movement skill restores 10% of your maximum Mana.",
    grants: { moveMana: 0.1 },
  },
  {
    id: 'lp_fleet',
    name: 'Fleet',
    description: "For 3s after your movement skill you have 20% more Movement Speed.",
    grants: { afterStepSpeed: 0.2 },
  },
  {
    id: 'lp_braced',
    name: 'Braced',
    description: "For 3s after Leap, take 15% less damage from hits and boss drains. Movement damage reductions " +
    "add, up to 80%.",
    grants: { afterStepGuard: 0.15 },
  },
];

export const LEAP_TREE: TreeSpec = {
  skillId: 'leap',
  prefix: 'lp',
  minorName: 'Fall',
  common: COMMON,
  branches: BRANCHES,
  trunkNotables: TRUNK_NOTABLES,
  needs: {
    pinSlow: 'lp_impact',
    pinLonger: 'lp_impact',
    landingRadius: 'lp_tremor',
    landingMore: 'lp_tremor',
    landingSeconds: 'lp_tremor',
    afterStepLonger: 'lp_bracing',
  },
};
