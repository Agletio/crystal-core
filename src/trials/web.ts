/**
 * The trials web: what a point earned in a room does to every descent after it.
 *
 * TWELVE REGIONS, a hundred and fifty-six nodes, and about fifty points — so
 * what the web is FOR is choosing which four or five of them you walk. Nothing
 * about a region is exclusive; the budget is.
 *
 * Most nodes here make a descent WORSE, and that is not a downside to be paid
 * for — it is the product. Reward is derived from danger exactly as it is for a
 * crystal, so a monster that really is harder really does pay more, and the
 * arithmetic is the one `crystalRewards` already does. The REWARD regions — the
 * Vein, the Reliquary, the Tithe — are the exception, and what they cost is the
 * point: a rarity node here is a danger node you did not take.
 */
import { DROP_GROUPS, findStat } from '../data';
import { stat } from '../trees/node';
import type { NodeStat } from '../trees/node';
import type { Minor } from '../trees/spec';
import type { TrialSpec } from './spec';

const m = (text: string, ...stats: NodeStat[]): Minor => ({ text, stats });

/** What the two nodes that ASK offer: a share of what drops, bent one way. */
const bend = (much: number) =>
  DROP_GROUPS.map((g) => ({
    id: g.id,
    name: g.id[0].toUpperCase() + g.id.slice(1),
    description: `+${much}% increased ${g.id} found, everywhere.`,
    stats: [stat(findStat(g.id), 'inc', much)],
  }));

export const TRIAL_WEB: TrialSpec = {
  prefix: 'tr',
  regions: [
    {
      id: 'watch',
      theme: 'The Watch',
      blurb: 'Fewer of them are ordinary. What is left is bigger, lit, and worth more.',
      gate: {
        id: 'tr_watch',
        name: 'The Watch',
        description:
          '+50% increased Magic and Rare monsters. What comes up rare down here ' +
          'comes up looking at you.',
        stats: [stat('monsterRank', 'inc', 50)],
      },
      branches: [
        {
          id: 'lit',
          theme: 'Lit',
          minors: [
            m('+25% increased Magic and Rare monsters', stat('monsterRank', 'inc', 25)),
            m('+25% increased Magic and Rare monsters', stat('monsterRank', 'inc', 25)),
            m('+30% increased Magic and Rare monsters', stat('monsterRank', 'inc', 30)),
          ],
          notable: {
            id: 'tr_watched',
            name: 'Watched',
            description:
              '+110% increased Magic and Rare monsters, and +12% Monster Critical ' +
              'Chance. Every one of them was already facing the way you came in.',
            stats: [stat('monsterRank', 'inc', 110), stat('monsterCrit', 'inc', 12)],
          },
        },
        {
          id: 'marked',
          theme: 'Marked',
          minors: [
            m('+8% Monster Critical Chance', stat('monsterCrit', 'inc', 8)),
            m('+8% Monster Critical Chance', stat('monsterCrit', 'inc', 8)),
            m('+10% Monster Critical Chance', stat('monsterCrit', 'inc', 10)),
          ],
          notable: {
            id: 'tr_marked',
            name: 'Marked Out',
            description:
              '+25% Monster Critical Chance and +40% increased Magic and Rare ' +
              'monsters. They have all been told which one you are.',
            stats: [stat('monsterCrit', 'inc', 25), stat('monsterRank', 'inc', 40)],
          },
        },
        {
          id: 'chosen',
          theme: 'Chosen',
          minors: [
            m('+5 Rarity', stat('rarity', 'flat', 5)),
            m('+6 Rarity', stat('rarity', 'flat', 6)),
            m('+20% increased Magic and Rare monsters', stat('monsterRank', 'inc', 20)),
          ],
          notable: {
            id: 'tr_chosen',
            name: 'Chosen Ground',
            description:
              '+18 Rarity and +60% increased Magic and Rare monsters. What stands ' +
              'up here was picked for it.',
            stats: [stat('rarity', 'flat', 18), stat('monsterRank', 'inc', 60)],
          },
        },
      ],
    },

    {
      id: 'weight',
      theme: 'The Weight',
      blurb: 'The same monsters, carrying more. The rock leans on everything in it.',
      gate: {
        id: 'tr_weight',
        name: 'The Weight',
        description:
          '+25% increased Monster Life. Nothing new is down there. There is ' +
          'simply more of what is.',
        stats: [stat('monsterLife', 'inc', 25)],
      },
      branches: [
        {
          id: 'heavy',
          theme: 'Heavy',
          minors: [
            m('+12% increased Monster Life', stat('monsterLife', 'inc', 12)),
            m('+14% increased Monster Life', stat('monsterLife', 'inc', 14)),
            m('+16% increased Monster Life', stat('monsterLife', 'inc', 16)),
          ],
          notable: {
            id: 'tr_grave_weight',
            name: 'Grave Weight',
            description:
              '+45% increased Monster Life. They come apart at the same rate and ' +
              'there is a great deal more of them to come apart.',
            stats: [stat('monsterLife', 'inc', 45)],
          },
        },
        {
          id: 'hard',
          theme: 'Hard',
          minors: [
            m('+8% increased Monster Damage', stat('monsterDamage', 'inc', 8)),
            m('+10% increased Monster Damage', stat('monsterDamage', 'inc', 10)),
            m('+12% increased Monster Damage', stat('monsterDamage', 'inc', 12)),
          ],
          notable: {
            id: 'tr_hard_hands',
            name: 'Hard Hands',
            description:
              '+30% increased Monster Damage. Whatever they were swinging with ' +
              'before, they are swinging it like they mean it now.',
            stats: [stat('monsterDamage', 'inc', 30)],
          },
        },
        {
          id: 'quick',
          theme: 'Quick',
          minors: [
            m('+8% increased Monster Movement Speed', stat('monsterMoveSpeed', 'inc', 8)),
            m('+8% increased Monster Movement Speed', stat('monsterMoveSpeed', 'inc', 8)),
            m('+10% increased Monster Movement Speed', stat('monsterMoveSpeed', 'inc', 10)),
          ],
          notable: {
            id: 'tr_quickfoot',
            name: 'Quick Off the Rock',
            description:
              '+25% increased Monster Movement Speed and +10% increased Monster ' +
              'Damage. Walking away has stopped being a plan.',
            stats: [stat('monsterMoveSpeed', 'inc', 25), stat('monsterDamage', 'inc', 10)],
          },
        },
      ],
    },

    {
      id: 'press',
      theme: 'The Press',
      blurb: 'More of them, standing closer. It pays in bodies rather than in rarity.',
      gate: {
        id: 'tr_press',
        name: 'The Press',
        description:
          '+20% increased Pack Count. They come up out of the same holes, and ' +
          'there is no longer room between them.',
        stats: [stat('packCount', 'inc', 20)],
      },
      branches: [
        {
          id: 'crowds',
          theme: 'Crowds',
          minors: [
            m('+10% increased Pack Count', stat('packCount', 'inc', 10)),
            m('+12% increased Pack Count', stat('packCount', 'inc', 12)),
            m('+14% increased Pack Count', stat('packCount', 'inc', 14)),
          ],
          notable: {
            id: 'tr_crowded',
            name: 'Crowded Rock',
            description: '+35% increased Pack Count. Every corner has one behind it.',
            stats: [stat('packCount', 'inc', 35)],
          },
        },
        {
          id: 'swarms',
          theme: 'Swarms',
          minors: [
            m('+10% increased Pack Size', stat('packSize', 'inc', 10)),
            m('+12% increased Pack Size', stat('packSize', 'inc', 12)),
            m('+14% increased Pack Size', stat('packSize', 'inc', 14)),
          ],
          notable: {
            id: 'tr_swarming',
            name: 'Swarming',
            description: '+30% increased Pack Size. What was six of them is nine.',
            stats: [stat('packSize', 'inc', 30)],
          },
        },
        {
          id: 'warrens',
          theme: 'Warrens',
          minors: [
            m('+10% increased Layout Complexity', stat('layoutComplexity', 'inc', 10)),
            m('+12% increased Layout Complexity', stat('layoutComplexity', 'inc', 12)),
            m('+15% increased Layout Complexity', stat('layoutComplexity', 'inc', 15)),
          ],
          notable: {
            id: 'tr_warrens',
            name: 'Warrens',
            description:
              '+35% increased Layout Complexity and +10% increased Pack Count. ' +
              'The floor was dug rather than cut, and by something with hands.',
            stats: [stat('layoutComplexity', 'inc', 35), stat('packCount', 'inc', 10)],
          },
        },
      ],
    },

    {
      id: 'hoard',
      theme: 'The Hoard',
      blurb: 'Somebody left something down here, and something is standing over it.',
      gate: {
        id: 'tr_hoard',
        name: 'The Hoard',
        description:
          '+10% of packs guard a Hoard. They did not get far. What stands over ' +
          'it now was not with them.',
        stats: [stat('hoardChance', 'inc', 10)],
      },
      branches: [
        {
          id: 'carts',
          theme: 'Carts',
          minors: [
            m('+6% of packs guard a Hoard', stat('hoardChance', 'inc', 6)),
            m('+7% of packs guard a Hoard', stat('hoardChance', 'inc', 7)),
            m('+8% of packs guard a Hoard', stat('hoardChance', 'inc', 8)),
          ],
          notable: {
            id: 'tr_the_hoard',
            name: 'What Was Left',
            description:
              '+18% of packs guard a Hoard. Whatever they were hauling out, they ' +
              'were hauling a great deal of it.',
            stats: [stat('hoardChance', 'inc', 18)],
          },
        },
        {
          id: 'guards',
          theme: 'Guards',
          minors: [
            m('+20% increased Magic and Rare monsters', stat('monsterRank', 'inc', 20)),
            m('+5% of packs guard a Hoard', stat('hoardChance', 'inc', 5)),
            m('+25% increased Magic and Rare monsters', stat('monsterRank', 'inc', 25)),
          ],
          notable: {
            id: 'tr_guards',
            name: 'Standing Over It',
            description:
              '+60% increased Magic and Rare monsters and +8% of packs guard a ' +
              'Hoard. Nothing small is left in charge of anything worth having.',
            stats: [stat('monsterRank', 'inc', 60), stat('hoardChance', 'inc', 8)],
          },
        },
        {
          id: 'spoils',
          theme: 'Spoils',
          minors: [
            m('+10% increased Currency Find', stat('currencyFind', 'inc', 10)),
            m('+12% increased Currency Find', stat('currencyFind', 'inc', 12)),
            m('+14% increased Currency Find', stat('currencyFind', 'inc', 14)),
          ],
          notable: {
            id: 'tr_spoils',
            name: 'Say What They Carried',
            description:
              'Name a kind of thing, and +60% more of it is found everywhere. ' +
              'You have seen enough carts to know what is worth turning over.',
            choices: bend(60),
          },
        },
      ],
    },

    {
      id: 'welling',
      theme: 'The Welling',
      blurb: 'What you kill is not always what is left standing where it fell.',
      gate: {
        id: 'tr_welling',
        name: 'The Welling',
        description:
          '+8% of deaths well up something worse. A Magic out of a Common, a ' +
          'Rare out of that.',
        stats: [stat('wellChance', 'inc', 8)],
      },
      branches: [
        {
          id: 'rising',
          theme: 'Rising',
          minors: [
            m('+5% of deaths well up something worse', stat('wellChance', 'inc', 5)),
            m('+6% of deaths well up something worse', stat('wellChance', 'inc', 6)),
            m('+7% of deaths well up something worse', stat('wellChance', 'inc', 7)),
          ],
          notable: {
            id: 'tr_the_welling',
            name: 'Nothing Stays Down',
            description:
              '+18% of deaths well up something worse, and out of a Rare comes ' +
              'something the rock has no name for.',
            stats: [stat('wellChance', 'inc', 18)],
          },
        },
        {
          id: 'deeper',
          theme: 'Deeper',
          minors: [
            m('+5% of deaths well up something worse', stat('wellChance', 'inc', 5)),
            m('+14% increased Monster Life', stat('monsterLife', 'inc', 14)),
            m('+6% of deaths well up something worse', stat('wellChance', 'inc', 6)),
          ],
          notable: {
            id: 'tr_deeper',
            name: 'It Comes Up Bigger',
            description:
              '+12% of deaths well up something worse, and +30% increased Monster ' +
              'Life. Whatever answers is wearing the last one.',
            stats: [stat('wellChance', 'inc', 12), stat('monsterLife', 'inc', 30)],
          },
        },
        {
          id: 'unnamed',
          theme: 'Unnamed',
          minors: [
            m('+8% Monster Critical Chance', stat('monsterCrit', 'inc', 8)),
            m('+5% of deaths well up something worse', stat('wellChance', 'inc', 5)),
            m('+10% increased Monster Damage', stat('monsterDamage', 'inc', 10)),
          ],
          notable: {
            id: 'tr_unnamed',
            name: 'The Rock Has No Name For It',
            description:
              '+10% of deaths well up something worse, +20% increased Monster ' +
              'Damage and +8 Rarity. It came up wrong, and it came up rich.',
            stats: [
              stat('wellChance', 'inc', 10),
              stat('monsterDamage', 'inc', 20),
              stat('rarity', 'flat', 8),
            ],
          },
        },
      ],
    },

    {
      id: 'bearer',
      theme: 'The Bearer',
      blurb: 'Something down there is carrying what the two of them want.',
      gate: {
        id: 'tr_bearer',
        name: 'The Bearer',
        description:
          '+5% of packs carry a Bearer. It comes up at the rank the rock has no ' +
          'name for, and what it is holding is yours if you can put it down.',
        stats: [stat('bearerChance', 'inc', 5)],
      },
      branches: [
        {
          id: 'burdened',
          theme: 'Burdened',
          minors: [
            m('+3% of packs carry a Bearer', stat('bearerChance', 'inc', 3)),
            m('+3% of packs carry a Bearer', stat('bearerChance', 'inc', 3)),
            m('+4% of packs carry a Bearer', stat('bearerChance', 'inc', 4)),
          ],
          notable: {
            id: 'tr_the_bearer',
            name: 'Carried Out',
            description:
              '+10% of packs carry a Bearer. There is one in nearly every room ' +
              'now, and every one of them is slower for it.',
            stats: [stat('bearerChance', 'inc', 10)],
          },
        },
        {
          id: 'escort',
          theme: 'Escort',
          minors: [
            m('+15% increased Monster Armour', stat('monsterArmour', 'inc', 15)),
            m('+18% increased Monster Armour', stat('monsterArmour', 'inc', 18)),
            m('+20% increased Monster Armour', stat('monsterArmour', 'inc', 20)),
          ],
          notable: {
            id: 'tr_escort',
            name: 'The Escort',
            description:
              '+45% increased Monster Armour and +3% of packs carry a Bearer. ' +
              'Whatever is carrying it is not carrying it alone.',
            stats: [stat('monsterArmour', 'inc', 45), stat('bearerChance', 'inc', 3)],
          },
        },
        {
          id: 'relics',
          theme: 'Relics',
          minors: [
            m('+5 Rarity', stat('rarity', 'flat', 5)),
            m('+6 Rarity', stat('rarity', 'flat', 6)),
            m('+7 Rarity', stat('rarity', 'flat', 7)),
          ],
          notable: {
            id: 'tr_relics',
            name: 'Worth Carrying',
            description:
              '+16 Rarity and +3% of packs carry a Bearer. What it is holding was ' +
              'worth the walk down here for something that cannot spend it.',
            stats: [stat('rarity', 'flat', 16), stat('bearerChance', 'inc', 3)],
          },
        },
      ],
    },

    {
      id: 'vein',
      theme: 'The Vein',
      blurb: 'The rock pays in coin. Follow the seam and it keeps paying.',
      gate: {
        id: 'tr_vein',
        name: 'The Vein',
        description:
          '+20% increased Currency Find. It runs through the whole floor and ' +
          'always has.',
        stats: [stat('currencyFind', 'inc', 20)],
      },
      branches: [
        {
          id: 'salt',
          theme: 'Salt',
          minors: [
            m('+12% increased Currency Find', stat('currencyFind', 'inc', 12)),
            m('+14% increased Currency Find', stat('currencyFind', 'inc', 14)),
            m('+16% increased Currency Find', stat('currencyFind', 'inc', 16)),
          ],
          notable: {
            id: 'tr_salt',
            name: 'The Salt Road',
            description:
              '+40% increased Currency Find. What they were hauling up here was ' +
              'never the interesting part.',
            stats: [stat('currencyFind', 'inc', 40)],
          },
        },
        {
          id: 'ore',
          theme: 'Ore',
          minors: [
            m('+10% increased Currency Find', stat('currencyFind', 'inc', 10)),
            m('+6 Rarity', stat('rarity', 'flat', 6)),
            m('+12% increased Currency Find', stat('currencyFind', 'inc', 12)),
          ],
          notable: {
            id: 'tr_ore',
            name: 'Struck Ore',
            description:
              '+25% increased Currency Find and +14 Rarity. The seam widens the ' +
              'further in you cut, which is the trouble with it.',
            stats: [stat('currencyFind', 'inc', 25), stat('rarity', 'flat', 14)],
          },
        },
        {
          id: 'ash',
          theme: 'Ash',
          minors: [
            m('+10% increased Monster Damage', stat('monsterDamage', 'inc', 10)),
            m('+14% increased Currency Find', stat('currencyFind', 'inc', 14)),
            m('+12% increased Monster Life', stat('monsterLife', 'inc', 12)),
          ],
          notable: {
            id: 'tr_ash',
            name: 'Paid in Ash',
            description:
              '+35% increased Currency Find, +25% increased Monster Damage and ' +
              '+25% increased Monster Life. The rock has never given anything away.',
            stats: [
              stat('currencyFind', 'inc', 35),
              stat('monsterDamage', 'inc', 25),
              stat('monsterLife', 'inc', 25),
            ],
          },
        },
      ],
    },

    {
      id: 'reliquary',
      theme: 'The Reliquary',
      blurb: 'Better things, not more of them. What comes up comes up finished.',
      gate: {
        id: 'tr_reliquary',
        name: 'The Reliquary',
        description:
          '+10 Rarity. Somewhere under this floor is a room where they put the ' +
          'good ones.',
        stats: [stat('rarity', 'flat', 10)],
      },
      branches: [
        {
          id: 'polish',
          theme: 'Polish',
          minors: [
            m('+5 Rarity', stat('rarity', 'flat', 5)),
            m('+6 Rarity', stat('rarity', 'flat', 6)),
            m('+7 Rarity', stat('rarity', 'flat', 7)),
          ],
          notable: {
            id: 'tr_polish',
            name: 'Kept Clean',
            description: '+20 Rarity. Whatever is down here, somebody looked after it.',
            stats: [stat('rarity', 'flat', 20)],
          },
        },
        {
          id: 'sorting',
          theme: 'Sorting',
          minors: [
            m('+8% increased Currency Find', stat('currencyFind', 'inc', 8)),
            m('+5 Rarity', stat('rarity', 'flat', 5)),
            m('+10% increased Currency Find', stat('currencyFind', 'inc', 10)),
          ],
          notable: {
            id: 'tr_sorting',
            name: 'Sorted Through',
            description:
              'Name a kind of thing, and +45% more of it is found everywhere. ' +
              'Somebody down here was already sorting it when the roof came in.',
            choices: bend(45),
          },
        },
        {
          id: 'pockets',
          theme: 'Pockets',
          minors: [
            m('+5% of packs guard a Hoard', stat('hoardChance', 'inc', 5)),
            m('+6 Rarity', stat('rarity', 'flat', 6)),
            m('+5% of packs guard a Hoard', stat('hoardChance', 'inc', 5)),
          ],
          notable: {
            id: 'tr_pockets',
            name: 'Deep Pockets',
            description:
              '+12 Rarity and +10% of packs guard a Hoard. They were carrying it ' +
              'on them, and they still are.',
            stats: [stat('rarity', 'flat', 12), stat('hoardChance', 'inc', 10)],
          },
        },
      ],
    },

    {
      id: 'reading',
      theme: 'The Reading',
      blurb: 'The rock is writing, and what it wrote is on every hand down there.',
      gate: {
        id: 'tr_reading',
        name: 'The Reading',
        description:
          'Monsters deal +6% of their damage as Fire, +6% as Cold and +6% as ' +
          'Lightning, on top of their own. Something has been read aloud here.',
        stats: [
          stat('monsterFire', 'inc', 6),
          stat('monsterCold', 'inc', 6),
          stat('monsterLightning', 'inc', 6),
        ],
      },
      branches: [
        {
          id: 'cinders',
          theme: 'Cinders',
          minors: [
            m('+8% of Monster Damage Added as Fire', stat('monsterFire', 'inc', 8)),
            m('+10% of Monster Damage Added as Fire', stat('monsterFire', 'inc', 10)),
            m('+12% of Monster Damage Added as Fire', stat('monsterFire', 'inc', 12)),
          ],
          notable: {
            id: 'tr_cinders',
            name: 'Read in Cinders',
            description:
              '+25% of Monster Damage Added as Fire. Everything they swing comes ' +
              'off the rock warm.',
            stats: [stat('monsterFire', 'inc', 25)],
          },
        },
        {
          id: 'frost',
          theme: 'Frost',
          minors: [
            m('+8% of Monster Damage Added as Cold', stat('monsterCold', 'inc', 8)),
            m('+10% of Monster Damage Added as Cold', stat('monsterCold', 'inc', 10)),
            m('+12% of Monster Damage Added as Cold', stat('monsterCold', 'inc', 12)),
          ],
          notable: {
            id: 'tr_frost',
            name: 'Read in Frost',
            description:
              '+25% of Monster Damage Added as Cold. The floor takes the heat out ' +
              'of you through the boots.',
            stats: [stat('monsterCold', 'inc', 25)],
          },
        },
        {
          id: 'storm',
          theme: 'Storm',
          minors: [
            m('+8% of Monster Damage Added as Lightning', stat('monsterLightning', 'inc', 8)),
            m('+10% of Monster Damage Added as Lightning', stat('monsterLightning', 'inc', 10)),
            m('+12% of Monster Damage Added as Lightning', stat('monsterLightning', 'inc', 12)),
          ],
          notable: {
            id: 'tr_storm',
            name: 'Read Aloud',
            description:
              '+25% of Monster Damage Added as Lightning and +10% Monster Critical ' +
              'Chance. You can hear it before it reaches you, which does not help.',
            stats: [stat('monsterLightning', 'inc', 25), stat('monsterCrit', 'inc', 10)],
          },
        },
      ],
    },

    {
      id: 'hide',
      theme: 'The Hide',
      blurb: 'Harder to get through, and it knows which way you hit.',
      gate: {
        id: 'tr_hide',
        name: 'The Hide',
        description:
          '+20% increased Monster Armour. Whatever is on them, it grew there.',
        stats: [stat('monsterArmour', 'inc', 20)],
      },
      branches: [
        {
          id: 'plated',
          theme: 'Plated',
          minors: [
            m('+12% increased Monster Armour', stat('monsterArmour', 'inc', 12)),
            m('+15% increased Monster Armour', stat('monsterArmour', 'inc', 15)),
            m('+18% increased Monster Armour', stat('monsterArmour', 'inc', 18)),
          ],
          notable: {
            id: 'tr_plated',
            name: 'Grown Over',
            description:
              '+50% increased Monster Armour. The rock has closed over them the ' +
              'way it closes over everything else.',
            stats: [stat('monsterArmour', 'inc', 50)],
          },
        },
        {
          id: 'warded',
          theme: 'Warded',
          minors: [
            m(
              '+10% Monster Fire, Cold and Lightning Resistance',
              stat('monsterFireRes', 'flat', 10),
              stat('monsterColdRes', 'flat', 10),
              stat('monsterLightningRes', 'flat', 10)
            ),
            m(
              '+10% Monster Poison, Dark and Light Resistance',
              stat('monsterPoisonRes', 'flat', 10),
              stat('monsterDarkRes', 'flat', 10),
              stat('monsterLightRes', 'flat', 10)
            ),
            m('+12% Monster Physical Resistance', stat('monsterPhysicalRes', 'flat', 12)),
          ],
          notable: {
            id: 'tr_warded',
            name: 'Warded',
            description:
              '+15% Monster Resistance to every damage type there is. Bring the ' +
              'one they have not answered yet.',
            stats: [
              stat('monsterPhysicalRes', 'flat', 15),
              stat('monsterFireRes', 'flat', 15),
              stat('monsterColdRes', 'flat', 15),
              stat('monsterLightningRes', 'flat', 15),
              stat('monsterPoisonRes', 'flat', 15),
              stat('monsterDarkRes', 'flat', 15),
              stat('monsterLightRes', 'flat', 15),
              stat('monsterPrismaticRes', 'flat', 15),
            ],
          },
        },
        {
          id: 'slow',
          theme: 'Slow to Die',
          minors: [
            m('+10% increased Monster Life', stat('monsterLife', 'inc', 10)),
            m('+12% increased Monster Life', stat('monsterLife', 'inc', 12)),
            m('+14% increased Monster Life', stat('monsterLife', 'inc', 14)),
          ],
          notable: {
            id: 'tr_slowdeath',
            name: 'Slow to Die',
            description:
              '+35% increased Monster Life and +20% increased Monster Armour. ' +
              'They take the hit and then take the next one.',
            stats: [stat('monsterLife', 'inc', 35), stat('monsterArmour', 'inc', 20)],
          },
        },
      ],
    },

    {
      id: 'longway',
      theme: 'The Long Way',
      blurb: 'Further in, further round, and further back out again.',
      gate: {
        id: 'tr_longway',
        name: 'The Long Way',
        description:
          '+25% increased Layout Complexity. The way you came in is not the way ' +
          'you will be going out.',
        stats: [stat('layoutComplexity', 'inc', 25)],
      },
      branches: [
        {
          id: 'winding',
          theme: 'Winding',
          minors: [
            m('+10% increased Layout Complexity', stat('layoutComplexity', 'inc', 10)),
            m('+12% increased Layout Complexity', stat('layoutComplexity', 'inc', 12)),
            m('+14% increased Layout Complexity', stat('layoutComplexity', 'inc', 14)),
          ],
          notable: {
            id: 'tr_winding',
            name: 'Winding',
            description:
              '+35% increased Layout Complexity. It doubles back, and it does it ' +
              'while you are not looking.',
            stats: [stat('layoutComplexity', 'inc', 35)],
          },
        },
        {
          id: 'deeprooms',
          theme: 'Deep Rooms',
          minors: [
            m('+8% increased Pack Count', stat('packCount', 'inc', 8)),
            m('+10% increased Layout Complexity', stat('layoutComplexity', 'inc', 10)),
            m('+10% increased Pack Count', stat('packCount', 'inc', 10)),
          ],
          notable: {
            id: 'tr_deeprooms',
            name: 'Deep Rooms',
            description:
              '+25% increased Pack Count and +20% increased Layout Complexity. ' +
              'Every room off this one has something standing in it.',
            stats: [stat('packCount', 'inc', 25), stat('layoutComplexity', 'inc', 20)],
          },
        },
        {
          id: 'blind',
          theme: 'Blind Corners',
          minors: [
            m('+8% increased Monster Movement Speed', stat('monsterMoveSpeed', 'inc', 8)),
            m('+10% increased Layout Complexity', stat('layoutComplexity', 'inc', 10)),
            m('+10% increased Monster Movement Speed', stat('monsterMoveSpeed', 'inc', 10)),
          ],
          notable: {
            id: 'tr_blind',
            name: 'Blind Corners',
            description:
              '+25% increased Monster Movement Speed and +20% increased Layout ' +
              'Complexity. They are round it before you are.',
            stats: [stat('monsterMoveSpeed', 'inc', 25), stat('layoutComplexity', 'inc', 20)],
          },
        },
      ],
    },

    {
      id: 'tithe',
      theme: 'The Tithe',
      blurb: 'It pays better and it takes its cut out of you on the way past.',
      gate: {
        id: 'tr_tithe',
        name: 'The Tithe',
        description:
          '+12% increased Currency Find and +25% increased Monster Damage. ' +
          'Nothing down here is free and it never pretended to be.',
        stats: [stat('currencyFind', 'inc', 12), stat('monsterDamage', 'inc', 25)],
      },
      branches: [
        {
          id: 'toll',
          theme: 'Toll',
          minors: [
            m('+10% increased Monster Damage', stat('monsterDamage', 'inc', 10)),
            m('+12% increased Monster Damage', stat('monsterDamage', 'inc', 12)),
            m('+14% increased Monster Damage', stat('monsterDamage', 'inc', 14)),
          ],
          notable: {
            id: 'tr_toll',
            name: 'The Toll',
            description:
              '+35% increased Monster Damage and +10 Rarity. What it charges and ' +
              'what it hands over are the same arrangement.',
            stats: [stat('monsterDamage', 'inc', 35), stat('rarity', 'flat', 10)],
          },
        },
        {
          id: 'coin',
          theme: 'Coin',
          minors: [
            m('+12% increased Currency Find', stat('currencyFind', 'inc', 12)),
            m('+8% Monster Critical Chance', stat('monsterCrit', 'inc', 8)),
            m('+14% increased Currency Find', stat('currencyFind', 'inc', 14)),
          ],
          notable: {
            id: 'tr_coin',
            name: 'Told in Coin',
            description:
              '+30% increased Currency Find and +15% Monster Critical Chance. ' +
              'It counts out what you are owed while it is still swinging.',
            stats: [stat('currencyFind', 'inc', 30), stat('monsterCrit', 'inc', 15)],
          },
        },
        {
          id: 'purse',
          theme: 'Purse',
          minors: [
            m('+6 Rarity', stat('rarity', 'flat', 6)),
            m('+7 Rarity', stat('rarity', 'flat', 7)),
            m('+8 Rarity', stat('rarity', 'flat', 8)),
          ],
          notable: {
            id: 'tr_purse',
            name: 'The Whole Purse',
            description:
              '+22 Rarity and +15% increased Monster Life. It empties out on the ' +
              'floor, eventually.',
            stats: [stat('rarity', 'flat', 22), stat('monsterLife', 'inc', 15)],
          },
        },
      ],
    },
  ],
};
