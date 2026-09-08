/**
 * Gale's web. The third mover, and the one that never teleports: it is a
 * standing burst of speed you hold in GUSTS, and every one of them is movement
 * speed. Something lands a hit, a Gust goes, and you are that much slower — so
 * out of a fight you are quick, and in one you are as quick as you are
 * untouched. *"Make the speed tied to the charges instead. % move speed per
 * charge, lose charges when hit."* A flask's Charge is a Charge; this is the
 * word for the mover's, because one word may only mean one thing.
 *
 * Every branch moves that one dial: what a Gust is worth, how many you hold,
 * what dropping one pays, and whether a hit takes one at all.
 */
import { stat } from '../trees/node';
import type { Branch, Minor, Notable, TreeSpec } from '../trees/spec';

const COMMON: Minor[] = [
  { text: '+5% increased Movement Speed', stats: [stat('moveSpeed', 'inc', 5)] },
  { text: '3% reduced Skill Cooldown', stats: [stat('cooldown', 'inc', -3)] },
  {
    text: '+2% increased Movement Speed for each Gust held',
    grants: { gustSpeed: 2 },
  },
  { text: '+6% increased Movement Speed', stats: [stat('moveSpeed', 'inc', 6)] },
  {
    text: '+1.5% less damage taken for each Gust held',
    grants: { gustGuard: 0.015 },
  },
  { text: '4% reduced Skill Cooldown', stats: [stat('cooldown', 'inc', -4)] },
];

const BRANCHES: Branch[] = [
  {
    id: 'pace',
    theme: 'Pace',
    enabler: {
      id: 'gl_pace',
      name: 'Headlong',
      description: 'A further 5% increased Movement Speed for each Gust held.',
      grants: { gustSpeed: 5 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'gl_bolting',
          name: 'Bolting',
          description: 'A further 4% increased Movement Speed for each Gust held.',
          grants: { gustSpeed: 4 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'gl_headwind',
          name: 'Headwind',
          description: 'A further 6% increased Attack and Cast Speed for each Gust held.',
          grants: { gustHaste: 6 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'gl_running',
          name: 'Running Start',
          description: 'A further 7% more damage for each Gust held.',
          grants: { gustDamage: 0.07 },
        },
      },
    ],
    minors: [COMMON[0], COMMON[2], COMMON[0], COMMON[3]],
  },
  {
    id: 'guard',
    theme: 'Guard',
    enabler: {
      id: 'gl_guard',
      name: 'Windguard',
      description: 'You take 6% less damage for each Gust held.',
      grants: { gustGuard: 0.06 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'gl_hardening',
          name: 'Hardening',
          description: 'A further 4% less damage taken for each Gust held.',
          grants: { gustGuard: 0.04 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'gl_plating',
          name: 'Plating',
          description: 'For 3s after losing a Gust you take 25% less damage.',
          grants: { afterStepGuard: 0.25 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'gl_lastwind',
          name: 'Last Wind',
          description: 'You take 10% less damage while you hold no Gusts at all.',
          grants: { gustlessGuard: 0.1 },
        },
      },
    ],
    minors: [COMMON[4], COMMON[1], COMMON[4], COMMON[0]],
  },
  {
    id: 'renewal',
    theme: 'Renewal',
    enabler: {
      id: 'gl_renewal',
      name: 'Renewal',
      description: 'Losing a Gust restores 6% of your life.',
      grants: { gustHeal: 0.06 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'gl_mending',
          name: 'Mending',
          description: 'Losing a Gust restores a further 5% of your life.',
          grants: { gustHeal: 0.05 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'gl_drawing',
          name: 'Drawing Breath',
          description: 'Losing a Gust restores 8% of your mana pool.',
          grants: { gustMana: 0.08 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'gl_flinch',
          name: 'Flinch',
          description: 'For 3s after losing a Gust you move 30% faster.',
          grants: { afterStepSpeed: 0.3 },
        },
      },
    ],
    minors: [COMMON[1], COMMON[0], COMMON[1], COMMON[4]],
  },
  {
    id: 'reserve',
    theme: 'Reserve',
    enabler: {
      id: 'gl_reserve',
      name: 'Reserve',
      description: '+1 Gust.',
      grants: { gustMax: 1 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'gl_deepreserve',
          name: 'Deep Reserve',
          description: '+2 Gusts.',
          grants: { gustMax: 2 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'gl_stormfront',
          name: 'Stormfront',
          description: 'A further 3% increased Movement Speed for each Gust held.',
          grants: { gustSpeed: 3 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'gl_topping',
          name: 'Topping Up',
          description: 'A kill has a 25% chance to hand back a Gust.',
          grants: { gustOnKill: 0.25 },
        },
      },
    ],
    minors: [COMMON[0], COMMON[1], COMMON[0], COMMON[2]],
  },
  {
    id: 'recovery',
    theme: 'Recovery',
    enabler: {
      id: 'gl_recovery',
      name: 'Recovery',
      description: 'A Gust comes back 35% sooner.',
      grants: { gustBack: 0.65 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'gl_secondwind',
          name: 'Second Wind',
          description: 'A Gust comes back a further 25% sooner.',
          grants: { gustBack: 0.75 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'gl_squall',
          name: 'Squall',
          description: 'A Gust comes back a further 20% sooner.',
          grants: { gustBack: 0.8 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'gl_untouched',
          name: 'Untouched',
          description: 'Every Gust comes back at once after 6s with nothing landing on you.',
          grants: { gustRefill: 6 },
        },
      },
    ],
    minors: [COMMON[5], COMMON[0], COMMON[5], COMMON[3]],
  },
  {
    id: 'anchor',
    theme: 'Anchor',
    enabler: {
      id: 'gl_anchor',
      name: 'Anchored',
      description: 'A hit no longer takes a Gust, and each Gust is worth 40% less.',
      grants: { gustKeep: 0.6 },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'gl_ballast',
          name: 'Ballast',
          description: 'A Gust you keep is worth 20% more.',
          grants: { gustKept: 1.2 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'gl_settled',
          name: 'Settled',
          description: '+1 Gust.',
          grants: { gustMax: 1 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'gl_ironwind',
          name: 'Iron Wind',
          description: 'A Gust you keep is worth a further 15% more.',
          grants: { gustKept: 1.15 },
        },
      },
    ],
    minors: [COMMON[1], COMMON[4], COMMON[1], COMMON[5]],
  },
];

const TRUNK_NOTABLES: Notable[] = [
  {
    id: 'gl_stride',
    name: 'Stride',
    description: '+18% increased Movement Speed.',
    stats: [stat('moveSpeed', 'inc', 18)],
  },
  {
    id: 'gl_measure',
    name: 'Measure',
    description: '12% reduced Skill Cooldown.',
    stats: [stat('cooldown', 'inc', -12)],
  },
  {
    id: 'gl_holding',
    name: 'Holding',
    description: '+1 Gust.',
    grants: { gustMax: 1 },
  },
  {
    id: 'gl_gusting',
    name: 'Gusting',
    description: 'A further 4% increased Movement Speed for each Gust held.',
    grants: { gustSpeed: 4 },
  },
  {
    id: 'gl_fleet',
    name: 'Fleet',
    description: 'For 3s after losing a Gust you move 20% faster.',
    grants: { afterStepSpeed: 0.2 },
  },
  {
    id: 'gl_braced',
    name: 'Braced',
    description: 'You take a further 3% less damage for each Gust held.',
    grants: { gustGuard: 0.03 },
  },
];

export const GALE_TREE: TreeSpec = {
  skillId: 'gale',
  prefix: 'gl',
  minorName: 'Breeze',
  common: COMMON,
  branches: BRANCHES,
  trunkNotables: TRUNK_NOTABLES,
  needs: {
    gustKept: 'gl_anchor',
    gustlessGuard: 'gl_guard',
  },
};
