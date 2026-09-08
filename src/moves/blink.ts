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
    text: 'Your movement skill carries you 8% more tiles',
    grants: { moveDistance: 1.08 },
  },
  { text: '+6% increased Movement Speed', stats: [stat('moveSpeed', 'inc', 6)] },
  {
    text: 'Each use of your movement skill restores 2% of your mana pool',
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
      description: 'Blink Slows enemies within 3 tiles of where it LEFT by 30% for 4s.',
      grants: { blinkWake: { radius: 3, slow: 0.3, seconds: 4 } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bk_undertow',
          name: 'Undertow',
          description: 'The wake reaches 60% further.',
          grants: { wakeRadius: 1.6 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bk_riptide',
          name: 'Riptide',
          description: 'The wake Slows by a further 25%.',
          grants: { wakeSlow: 0.25 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bk_deepwake',
          name: 'Deep Water',
          description: 'The wake lasts 3s longer.',
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
      description: 'Each Blink restores 8% of your mana pool.',
      grants: { moveMana: 0.08 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bk_aftercurrent',
          name: 'Undercurrent',
          description: 'Each Blink restores a further 7% of your mana pool.',
          grants: { moveMana: 0.07 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bk_syphon',
          name: 'Syphon',
          description: 'For 3s after a Blink you regenerate 4% of your mana pool a second.',
          grants: { afterStepRegen: { mana: 0.04 } },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bk_quenching',
          name: 'Quenching',
          description: 'For 3s after a Blink you regenerate 3% of your life a second.',
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
      description: '35% reduced movement skill cooldown.',
      grants: { moveCooldown: 0.65 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bk_flicker',
          name: 'Flicker',
          description: 'A further 25% reduced movement skill cooldown.',
          grants: { moveCooldown: 0.75 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bk_slipstream',
          name: 'Slipstream',
          description: 'For 3s after a Blink you move 30% faster.',
          grants: { afterStepSpeed: 0.3 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bk_secondwind',
          name: 'Second Wind',
          description: 'A Blink taken while something is in reach of you comes back 40% sooner.',
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
      description: 'Your movement skill carries you 60% more tiles.',
      grants: { moveDistance: 1.6 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bk_farstep',
          name: 'Farstep',
          description: 'Your movement skill carries you a further 40% of its tiles.',
          grants: { moveDistance: 1.4 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bk_reprisal',
          name: 'Reprisal',
          description: 'For 3s after a Blink you deal 25% more damage.',
          grants: { afterStepDamage: 0.25 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bk_bolt',
          name: 'Boltstep',
          description: 'A Blink fires when something is within 1.6 tiles, hit or not.',
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
      description: 'For 3s after a Blink you take 25% less damage.',
      grants: { afterStepGuard: 0.25 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bk_ghosting',
          name: 'Ghosting',
          description: 'The window after a Blink lasts 2s longer.',
          grants: { afterStepLonger: 2 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bk_paling',
          name: 'Paling',
          description: 'A further 20% less damage taken after a Blink.',
          grants: { afterStepGuard: 0.2 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bk_vanishing',
          name: 'Vanishing',
          description: 'For 3s after a Blink you regenerate 4% of your life a second.',
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
      description: 'Blink keeps 40% more ground between you and what pushed you.',
      grants: { kiteFurther: 1.4 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bk_looseleash',
          name: 'Loose Leash',
          description: 'A further 40% ground kept between you and what pushed you.',
          grants: { kiteFurther: 1.4 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bk_cutandrun',
          name: 'Cut and Run',
          description: 'For 3s after a Blink you move 25% faster.',
          grants: { afterStepSpeed: 0.25 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bk_standoff',
          name: 'Standoff',
          description: 'For 3s after a Blink you deal 20% more damage.',
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
    description: 'Your movement skill carries you 25% more tiles.',
    grants: { moveDistance: 1.25 },
  },
  {
    id: 'bk_wellspring',
    name: 'Wellspring',
    description: 'Each use of your movement skill restores 10% of your mana pool.',
    grants: { moveMana: 0.1 },
  },
  {
    id: 'bk_fleet',
    name: 'Fleet',
    description: 'For 3s after your movement skill you move 20% faster.',
    grants: { afterStepSpeed: 0.2 },
  },
  {
    id: 'bk_braced',
    name: 'Braced',
    description: 'For 3s after your movement skill you take 15% less damage.',
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
