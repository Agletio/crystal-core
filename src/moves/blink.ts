/**
 * Blink's web. A step THROUGH: it wants a clear line and it arrives, so there
 * is no landing to hang anything off. What it has instead is the KITE — in a
 * fight it fires when something in reach has just hit you, and it goes the
 * other way — so what its branches buy is the ground it leaves behind and
 * what you are for the seconds after a step.
 *
 * A mover deals no damage and never will, so every notable here is a rule
 * about the step or a window after it.
 */
import { stat } from '../trees/node';
import type { Branch, Minor, Notable, TreeSpec } from '../trees/spec';

const COMMON: Minor[] = [
  { text: '+5% increased Movement Speed', stats: [stat('moveSpeed', 'inc', 5)] },
  { text: '3% reduced Skill Cooldown', stats: [stat('cooldown', 'inc', -3)] },
  {
    text: "Blink has 8% more maximum travel distance",
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
    id: 'wake',
    theme: 'Wake',
    enabler: {
      id: 'bk_wake',
      name: 'Backwash',
      description: "Blink Slows enemies within 3 tiles of your starting position by 30% for 4s.",
      grants: { blinkWake: { radius: 3, slow: 0.3, seconds: 4 } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bk_undertow',
          name: 'Undertow',
          description: "Backwash has 60% more radius.",
          grants: { wakeRadius: 1.6 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bk_riptide',
          name: 'Riptide',
          description: "Adds 25 percentage points to the Slow from Backwash, up to a maximum Slow of 90%.",
          grants: { wakeSlow: 0.25 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bk_deepwake',
          name: 'Deep Water',
          description: "The Slow from Backwash lasts 3s longer.",
          grants: { wakeSeconds: 3 },
        },
      },
    ],
    minors: [COMMON[0], COMMON[2], COMMON[0], COMMON[5]],
  },
  {
    id: 'current',
    theme: 'Current',
    enabler: {
      id: 'bk_current',
      name: 'Aftercurrent',
      description: "Each Blink restores 8% of your maximum Mana.",
      grants: { moveMana: 0.08 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bk_aftercurrent',
          name: 'Undercurrent',
          description: "Each Blink restores a further 7% of your maximum Mana.",
          grants: { moveMana: 0.07 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bk_syphon',
          name: 'Syphon',
          description: "For 3s after a Blink you regenerate 4% of your maximum Mana a second.",
          grants: { afterStepRegen: { mana: 0.04 } },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bk_quenching',
          name: 'Quenching',
          description: "For 3s after a Blink you regenerate 3% of your maximum Life a second.",
          grants: { afterStepRegen: { life: 0.03 } },
        },
      },
    ],
    minors: [COMMON[1], COMMON[0], COMMON[1], COMMON[5]],
  },
  {
    id: 'quickening',
    theme: 'Quickening',
    enabler: {
      id: 'bk_quickening',
      name: 'Quickening',
      description: "Blink has 35% less cooldown.",
      grants: { moveCooldown: 0.65 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bk_flicker',
          name: 'Flicker',
          description: "Blink has 25% less cooldown. Multiplies with Quickening.",
          grants: { moveCooldown: 0.75 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bk_slipstream',
          name: 'Slipstream',
          description: "For 3s after a Blink you have 30% more Movement Speed.",
          grants: { afterStepSpeed: 0.3 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bk_secondwind',
          name: 'Second Wind',
          description: "Blink has 40% less cooldown when it teleports you away from a nearby enemy.",
          grants: { pressedCooldown: 0.6 },
        },
      },
    ],
    minors: [COMMON[4], COMMON[2], COMMON[4], COMMON[0]],
  },
  {
    id: 'reach',
    theme: 'Reach',
    enabler: {
      id: 'bk_longstep',
      name: 'Longstep',
      description: "Blink has 60% more maximum travel distance.",
      grants: { moveDistance: 1.6 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bk_farstep',
          name: 'Farstep',
          description: "Blink has 40% more maximum travel distance.",
          grants: { moveDistance: 1.4 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bk_reprisal',
          name: 'Reprisal',
          description: "For 3s after Blink, your hits deal 25% more damage. Adds to other damage bonuses after Blink.",
          grants: { afterStepDamage: 0.25 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bk_bolt',
          name: 'Boltstep',
          description: "Blink can teleport you away from an enemy within 1.6 tiles without waiting for you to be hit.",
          grants: { kiteUnhurt: true },
        },
      },
    ],
    minors: [COMMON[2], COMMON[3], COMMON[2], COMMON[0]],
  },
  {
    id: 'afterimage',
    theme: 'Afterimage',
    enabler: {
      id: 'bk_afterimage',
      name: 'Afterimage',
      description: "For 3s after Blink, take 25% less damage from hits and boss drains. Movement damage reductions " +
      "add, up to 80%.",
      grants: { afterStepGuard: 0.25 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bk_ghosting',
          name: 'Ghosting',
          description: "Bonuses granted after Blink last 2s longer.",
          grants: { afterStepLonger: 2 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bk_paling',
          name: 'Paling',
          description: "For 3s after Blink, take 20% less damage from hits and boss drains. Movement damage reductions " +
          "add, up to 80%.",
          grants: { afterStepGuard: 0.2 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bk_vanishing',
          name: 'Vanishing',
          description: "For 3s after a Blink you regenerate 4% of your maximum Life a second.",
          grants: { afterStepRegen: { life: 0.04 } },
        },
      },
    ],
    minors: [COMMON[5], COMMON[0], COMMON[5], COMMON[4]],
  },
  {
    id: 'distance',
    theme: 'Distance',
    enabler: {
      id: 'bk_distance',
      name: 'Keeping Distance',
      description: "Blink teleports you up to 40% farther when retreating from an enemy.",
      grants: { kiteFurther: 1.4 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bk_looseleash',
          name: 'Loose Leash',
          description: "Blink teleports you up to 40% farther when retreating from an enemy. Multiplies with Keeping " +
          "Distance.",
          grants: { kiteFurther: 1.4 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bk_cutandrun',
          name: 'Cut and Run',
          description: "For 3s after a Blink you have 25% more Movement Speed.",
          grants: { afterStepSpeed: 0.25 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bk_standoff',
          name: 'Standoff',
          description: "For 3s after Blink, your hits deal 20% more damage. Adds to other damage bonuses after Blink.",
          grants: { afterStepDamage: 0.2 },
        },
      },
    ],
    minors: [COMMON[0], COMMON[4], COMMON[2], COMMON[3]],
  },
];

const TRUNK_NOTABLES: Notable[] = [
  {
    id: 'bk_stride',
    name: 'Stride',
    description: '+18% increased Movement Speed.',
    stats: [stat('moveSpeed', 'inc', 18)],
  },
  {
    id: 'bk_measure',
    name: 'Measure',
    description: '12% reduced Skill Cooldown.',
    stats: [stat('cooldown', 'inc', -12)],
  },
  {
    id: 'bk_longlegs',
    name: 'Longlegs',
    description: "Blink has 25% more maximum travel distance.",
    grants: { moveDistance: 1.25 },
  },
  {
    id: 'bk_wellspring',
    name: 'Wellspring',
    description: "Each use of your movement skill restores 10% of your maximum Mana.",
    grants: { moveMana: 0.1 },
  },
  {
    id: 'bk_fleet',
    name: 'Fleet',
    description: "For 3s after your movement skill you have 20% more Movement Speed.",
    grants: { afterStepSpeed: 0.2 },
  },
  {
    id: 'bk_braced',
    name: 'Braced',
    description: "For 3s after Blink, take 15% less damage from hits and boss drains. Movement damage reductions " +
    "add, up to 80%.",
    grants: { afterStepGuard: 0.15 },
  },
];

export const BLINK_TREE: TreeSpec = {
  skillId: 'blink',
  prefix: 'bk',
  minorName: 'Step',
  common: COMMON,
  branches: BRANCHES,
  trunkNotables: TRUNK_NOTABLES,
  // Everything the wake buys is worth nothing without one to shape.
  needs: {
    wakeRadius: 'bk_wake',
    wakeSlow: 'bk_wake',
    wakeSeconds: 'bk_wake',
    afterStepLonger: 'bk_afterimage',
  },
};
