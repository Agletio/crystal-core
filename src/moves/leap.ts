/**
 * Leap's web. A jump goes OVER rather than through, and unlike a step it
 * LANDS — which is the one thing either web could hang something off that the
 * other could not, and is why Tremor exists and Aftercurrent does not.
 *
 * A landing deals no damage and never will: every damage number in the game
 * belongs to the skill in the main slot, so what a landing does is Slow.
 */
import { stat } from '../trees/node';
import type { MoveSpec } from './spec';

export const LEAP_MOVES: MoveSpec = {
  skillId: 'leap',
  prefix: 'lp',
  needs: {},
  arms: [
    {
      id: 'tremor',
      theme: 'Tremor',
      minors: [
        { text: '+22 to maximum Life', stats: [stat('life', 'flat', 22)] },
        { text: '+10% increased Armour', stats: [stat('armour', 'inc', 10)] },
      ],
      notable: {
        id: 'lp_tremor',
        name: 'Tremor',
        description: 'Landing Slows enemies within 3 tiles by 30% for 4s.',
        grants: { landingSlow: { radius: 3, slow: 0.3, seconds: 4 } },
      },
    },
    {
      id: 'footing',
      theme: 'Footing',
      minors: [
        { text: '+6% increased Movement Speed', stats: [stat('moveSpeed', 'inc', 6)] },
        { text: '+4% increased Attack Speed', stats: [stat('attackSpeed', 'inc', 4)] },
      ],
      notable: {
        id: 'lp_footing',
        name: 'Sure Footing',
        description: '35% reduced movement skill cooldown.',
        grants: { moveCooldown: 0.65 },
      },
    },
    {
      id: 'fall',
      theme: 'Fall',
      minors: [
        { text: '+8% increased Armour', stats: [stat('armour', 'inc', 8)] },
        { text: '+18 to maximum Life', stats: [stat('life', 'flat', 18)] },
      ],
      notable: {
        id: 'lp_longfall',
        name: 'Long Fall',
        description: 'Your movement skill carries you 60% more tiles.',
        grants: { moveDistance: 1.6 },
      },
    },
  ],
};
