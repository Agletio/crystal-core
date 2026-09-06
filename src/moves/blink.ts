/**
 * Blink's web. A step THROUGH: it wants a clear line and it arrives, so there
 * is no landing to hang anything off — what its arms buy is the step itself
 * and what you have left when it is done.
 *
 * Three arms, two of them fit. Aftercurrent pays for the step in mana, which
 * is what makes a mover part of a build rather than a convenience; the other
 * two make it come round sooner and reach further.
 */
import { stat } from '../trees/node';
import type { MoveSpec } from './spec';

export const BLINK_MOVES: MoveSpec = {
  skillId: 'blink',
  prefix: 'bk',
  needs: {},
  arms: [
    {
      id: 'current',
      theme: 'Current',
      minors: [
        { text: '+5% increased Movement Speed', stats: [stat('moveSpeed', 'inc', 5)] },
        { text: '+4% increased Cast Speed', stats: [stat('castSpeed', 'inc', 4)] },
      ],
      notable: {
        id: 'bk_aftercurrent',
        name: 'Aftercurrent',
        description: 'Each Blink restores 8% of your mana pool.',
        grants: { moveMana: 0.08 },
      },
    },
    {
      id: 'quickening',
      theme: 'Quickening',
      minors: [
        { text: '+6% increased Movement Speed', stats: [stat('moveSpeed', 'inc', 6)] },
        { text: '+6% increased Movement Speed', stats: [stat('moveSpeed', 'inc', 6)] },
      ],
      notable: {
        id: 'bk_quickening',
        name: 'Quickening',
        description: '35% reduced movement skill cooldown.',
        grants: { moveCooldown: 0.65 },
      },
    },
    {
      id: 'reach',
      theme: 'Reach',
      minors: [
        { text: '+5% increased Movement Speed', stats: [stat('moveSpeed', 'inc', 5)] },
        { text: '+4% increased Attack Speed', stats: [stat('attackSpeed', 'inc', 4)] },
      ],
      notable: {
        id: 'bk_longstep',
        name: 'Longstep',
        description: 'Your movement skill carries you 60% more tiles.',
        grants: { moveDistance: 1.6 },
      },
    },
  ],
};
