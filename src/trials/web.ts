/**
 * The trials web: what a point earned in a room does to every descent after it.
 *
 * Every node here makes a descent WORSE. That is not a downside to be paid for
 * — it is the whole product. Reward is derived from danger exactly as it is for
 * a crystal, so a monster that really is harder really does pay more, and the
 * arithmetic is the one `crystalRewards` already does.
 *
 * Which is why no node grants rarity, yield or gold directly. A node that only
 * gave you something would be a node with no decision in it, and a node that
 * multiplied `danger` without making anything harder would buy item level for
 * nothing: `POWER` reads danger, and `bandFor(power).ilvl` is the drop tier.
 */
import { stat } from '../trees/node';
import type { TrialSpec } from './spec';

export const TRIAL_WEB: TrialSpec = {
  prefix: 'tr',
  arms: [
    {
      id: 'watch',
      theme: 'The Watch',
      blurb: 'Fewer of them are ordinary. What is left is bigger, lit, and worth more.',
      minors: [
        { text: '+30% increased Magic and Rare monsters', stats: [stat('monsterRank', 'inc', 30)] },
        { text: '+30% increased Magic and Rare monsters', stats: [stat('monsterRank', 'inc', 30)] },
      ],
      notable: {
        id: 'tr_watched',
        name: 'Watched',
        description:
          '+90% increased Magic and Rare monsters, and +15% increased Monster ' +
          'Critical Chance. What comes up rare down here comes up looking at you.',
        stats: [stat('monsterRank', 'inc', 90), stat('monsterCrit', 'inc', 15)],
      },
    },
    {
      id: 'weight',
      theme: 'The Weight',
      blurb: 'The same monsters, carrying more. The rock leans on everything in it.',
      minors: [
        { text: '+18% increased Monster Life', stats: [stat('monsterLife', 'inc', 18)] },
        { text: '+12% increased Monster Damage', stats: [stat('monsterDamage', 'inc', 12)] },
      ],
      notable: {
        id: 'tr_grave_weight',
        name: 'Grave Weight',
        description:
          '+45% increased Monster Life and +30% increased Monster Damage. ' +
          'Nothing new is down there. There is simply more of what is.',
        stats: [stat('monsterLife', 'inc', 45), stat('monsterDamage', 'inc', 30)],
      },
    },
    {
      id: 'hoard',
      theme: 'The Hoard',
      blurb: 'Somebody left something down here, and something is standing over it.',
      minors: [
        { text: '+12% of packs guard a Hoard', stats: [stat('hoardChance', 'inc', 12)] },
        { text: '+12% of packs guard a Hoard', stats: [stat('hoardChance', 'inc', 12)] },
      ],
      notable: {
        id: 'tr_the_hoard',
        name: 'What Was Left',
        description:
          '+30% of packs guard a Hoard. They were carrying it out and did not ' +
          'get far. Whatever is standing over it now was not with them.',
        stats: [stat('hoardChance', 'inc', 30)],
      },
    },
    {
      id: 'press',
      // Density is the one kind of danger that does not pay: `DANGER_STATS` has
      // both pack stats at `rewards: false`, because they already pay in kills.
      theme: 'The Press',
      blurb: 'More of them, standing closer. It pays in bodies rather than in rarity.',
      minors: [
        { text: '+15% increased Pack Count', stats: [stat('packCount', 'inc', 15)] },
        { text: '+15% increased Pack Size', stats: [stat('packSize', 'inc', 15)] },
      ],
      notable: {
        id: 'tr_the_press',
        name: 'The Press',
        description:
          '+35% increased Pack Count and +25% increased Pack Size. They come ' +
          'up out of the same holes, and there is no longer room between them.',
        stats: [stat('packCount', 'inc', 35), stat('packSize', 'inc', 25)],
      },
    },
  ],
};
