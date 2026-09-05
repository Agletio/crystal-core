/**
 * The trials web: what a point earned in a room does to every descent after it.
 *
 * A MAP of TWELVE WHEELS on three rings, joined by roads. The roads are generic
 * — a little more of everything — and the wheels are not: each ring of six is
 * one idea said six ways, with its major at the middle of it. So the web is not
 * a menu of upgrades, it is a route: what you can reach with sixty points
 * decides what your descents are, and two characters spending the same sixty
 * arrive somewhere different.
 *
 * Most nodes make a descent WORSE, which is not a downside to be paid for — it
 * is the product. Reward is derived from danger exactly as it is for a crystal,
 * so a monster that really is harder really does pay more. The REWARD wheels —
 * the Vein, the Reliquary, the Tithe — are the exception, and what they cost is
 * the road: a rarity node is a danger node you did not walk to.
 */
import { DROP_GROUPS, findStat } from '../data';
import { CENTRE, stat } from '../trees/node';
import type { NodeStat } from '../trees/node';
import type { Minor } from '../trees/spec';
import type { TrialSpec } from './spec';

const m = (text: string, ...stats: NodeStat[]): Minor => ({ text, stats });

/** What the two wheels that ASK offer: a share of what drops, bent one way. */
const bend = (much: number) =>
  DROP_GROUPS.map((g) => ({
    id: g.id,
    name: g.id[0].toUpperCase() + g.id.slice(1),
    description: `+${much}% increased ${g.id} found, everywhere.`,
    stats: [stat(findStat(g.id), 'inc', much)],
  }));

/** Where a wheel sits. Three rings, four wheels each, the outer two turned so
 *  a road always runs to the gap between the two before it. */
const at = (ring: 0 | 1 | 2, turn: number): { x: number; y: number } => {
  const reach = [4.6, 9.2, 13.2][ring];
  const angle = (turn / 4) * Math.PI * 2 - Math.PI / 2 + (ring === 1 ? Math.PI / 4 : 0);
  return { x: Math.cos(angle) * reach, y: Math.sin(angle) * reach };
};

export const TRIAL_WEB: TrialSpec = {
  prefix: 'tr',
  // Small, and every one of them worth having on the way past. Nothing here is
  // a decision — the decision is which road you are on.
  road: [
    m('+6% increased Pack Size', stat('packSize', 'inc', 6)),
    m('+5% increased Pack Count', stat('packCount', 'inc', 5)),
    m('+12% increased Magic and Rare monsters', stat('monsterRank', 'inc', 12)),
    m('+3 Rarity', stat('rarity', 'flat', 3)),
    m('+6% increased Currency Find', stat('currencyFind', 'inc', 6)),
    m('+6% increased Layout Complexity', stat('layoutComplexity', 'inc', 6)),
    m('+2% of packs guard a Hoard', stat('hoardChance', 'inc', 2)),
    m('+2% of deaths leave one of the rank below', stat('splitChance', 'inc', 2)),
    m('+3% of packs hold a Warden', stat('wardenChance', 'inc', 3)),
    m('+10% increased Magic and Rare monsters', stat('monsterRank', 'inc', 10)),
  ],
  wheels: [
    // --- the inner four: reached straight off the middle -------------------
    {
      id: 'watch',
      theme: 'The Watch',
      blurb: 'Fewer of them are ordinary. What is left is bigger, lit, and worth more.',
      at: at(0, 0),
      roads: [CENTRE],
      minors: [
        m('+20% increased Magic and Rare monsters', stat('monsterRank', 'inc', 20)),
        m('+20% increased Magic and Rare monsters', stat('monsterRank', 'inc', 20)),
        m('+4% of packs hold a Warden', stat('wardenChance', 'inc', 4)),
        m('+25% increased Magic and Rare monsters', stat('monsterRank', 'inc', 25)),
        m('+5 Rarity', stat('rarity', 'flat', 5)),
        m('+30% increased Magic and Rare monsters', stat('monsterRank', 'inc', 30)),
      ],
      major: {
        id: 'tr_watched',
        name: 'Watched',
        description:
          '+150% increased Magic and Rare monsters, and +10% of packs hold a ' +
          'Warden. Every one of them was already facing the way you came in.',
        stats: [stat('monsterRank', 'inc', 150), stat('wardenChance', 'inc', 10)],
      },
    },
    {
      id: 'weight',
      theme: 'The Warden',
      blurb: 'Something in every pack the rest of it is standing behind.',
      at: at(0, 1),
      roads: [CENTRE],
      minors: [
        m('+6% of packs hold a Warden', stat('wardenChance', 'inc', 6)),
        m('+7% of packs hold a Warden', stat('wardenChance', 'inc', 7)),
        m('+15% increased Magic and Rare monsters', stat('monsterRank', 'inc', 15)),
        m('+7% of packs hold a Warden', stat('wardenChance', 'inc', 7)),
        m('+8% of packs hold a Warden', stat('wardenChance', 'inc', 8)),
        m('+4 Rarity', stat('rarity', 'flat', 4)),
      ],
      major: {
        id: 'tr_grave_weight',
        name: 'Nothing Gets Past',
        description:
          '+25% of packs hold a Warden. Nothing else in a pack can be hurt ' +
          'while its Warden stands, and it is the biggest thing in there.',
        stats: [stat('wardenChance', 'inc', 25)],
      },
    },
    {
      id: 'press',
      theme: 'The Press',
      blurb: 'More of them, standing closer. It pays in bodies rather than in rarity.',
      at: at(0, 2),
      roads: [CENTRE],
      minors: [
        m('+10% increased Pack Count', stat('packCount', 'inc', 10)),
        m('+10% increased Pack Size', stat('packSize', 'inc', 10)),
        m('+12% increased Pack Count', stat('packCount', 'inc', 12)),
        m('+8% increased Layout Complexity', stat('layoutComplexity', 'inc', 8)),
        m('+12% increased Pack Size', stat('packSize', 'inc', 12)),
        m('+14% increased Pack Count', stat('packCount', 'inc', 14)),
      ],
      major: {
        id: 'tr_the_press',
        name: 'The Press',
        description:
          '+40% increased Pack Count and +30% increased Pack Size. They come up ' +
          'out of the same holes, and there is no longer room between them.',
        stats: [stat('packCount', 'inc', 40), stat('packSize', 'inc', 30)],
      },
    },
    {
      id: 'vein',
      theme: 'The Vein',
      blurb: 'The rock pays in coin. Follow the seam and it keeps paying.',
      at: at(0, 3),
      roads: [CENTRE],
      minors: [
        m('+10% increased Currency Find', stat('currencyFind', 'inc', 10)),
        m('+12% increased Currency Find', stat('currencyFind', 'inc', 12)),
        m('+4 Rarity', stat('rarity', 'flat', 4)),
        m('+12% increased Currency Find', stat('currencyFind', 'inc', 12)),
        m('+14% increased Currency Find', stat('currencyFind', 'inc', 14)),
        m('+5% of packs guard a Vein', stat('veinChance', 'inc', 5)),
      ],
      major: {
        id: 'tr_salt',
        name: 'The Salt Road',
        description:
          '+45% increased Currency Find. What they were hauling up here was ' +
          'never the interesting part.',
        stats: [stat('currencyFind', 'inc', 45), stat('veinChance', 'inc', 14)],
      },
    },

    // --- the middle four: one road in from each inner wheel beside them ----
    {
      id: 'hoard',
      theme: 'The Hoard',
      blurb: 'Somebody left something down here, and something is standing over it.',
      at: at(1, 0),
      roads: ['watch', 'weight'],
      minors: [
        m('+6% of packs guard a Hoard', stat('hoardChance', 'inc', 6)),
        m('+7% of packs guard a Hoard', stat('hoardChance', 'inc', 7)),
        m('+20% increased Magic and Rare monsters', stat('monsterRank', 'inc', 20)),
        m('+7% of packs guard a Hoard', stat('hoardChance', 'inc', 7)),
        m('+10% increased Currency Find', stat('currencyFind', 'inc', 10)),
        m('+8% of packs guard a Hoard', stat('hoardChance', 'inc', 8)),
      ],
      major: {
        id: 'tr_the_hoard',
        name: 'Say What They Carried',
        description:
          '+20% of packs guard a Hoard, and you name what they were hauling: ' +
          '+60% more of it is found everywhere.',
        choices: bend(60).map((c) => ({
          ...c,
          stats: [...c.stats, stat('hoardChance', 'inc', 20)],
        })),
      },
    },
    {
      id: 'welling',
      theme: 'The Welling',
      blurb: 'What you kill is not always what is left standing where it fell.',
      at: at(1, 1),
      roads: ['weight', 'press'],
      minors: [
        m('+5% of deaths well up something worse', stat('wellChance', 'inc', 5)),
        m('+6% of deaths well up something worse', stat('wellChance', 'inc', 6)),
        m('+8% of deaths leave one of the rank below', stat('splitChance', 'inc', 8)),
        m('+6% of deaths well up something worse', stat('wellChance', 'inc', 6)),
        m('+10% of deaths leave one of the rank below', stat('splitChance', 'inc', 10)),
        m('+7% of deaths well up something worse', stat('wellChance', 'inc', 7)),
      ],
      major: {
        id: 'tr_the_welling',
        name: 'Nothing Stays Down',
        description:
          '+22% of deaths well up something worse. A Magic out of a Common, a ' +
          'Rare out of that, and out of a Rare something the rock has no name for.',
        stats: [stat('wellChance', 'inc', 22)],
      },
    },
    {
      id: 'bearer',
      theme: 'The Bearer',
      blurb: 'Something down there is carrying what the two of them want.',
      at: at(1, 2),
      roads: ['press', 'vein'],
      minors: [
        m('+3% of packs carry a Bearer', stat('bearerChance', 'inc', 3)),
        m('+5% of packs hold a Warden', stat('wardenChance', 'inc', 5)),
        m('+3% of packs carry a Bearer', stat('bearerChance', 'inc', 3)),
        m('+5 Rarity', stat('rarity', 'flat', 5)),
        m('+4% of packs carry a Bearer', stat('bearerChance', 'inc', 4)),
        m('+12% of bodies drop coin where they fall', stat('giltChance', 'inc', 12)),
      ],
      major: {
        id: 'tr_the_bearer',
        name: 'Carried Out',
        description:
          '+12% of packs carry a Bearer, and +16 Rarity. It comes up at the rank ' +
          'the rock has no name for, and what it holds is yours if you put it down.',
        stats: [stat('bearerChance', 'inc', 12), stat('rarity', 'flat', 16)],
      },
    },
    {
      id: 'reliquary',
      theme: 'The Reliquary',
      blurb: 'Better things, not more of them. What comes up comes up finished.',
      at: at(1, 3),
      roads: ['vein', 'watch'],
      minors: [
        m('+5 Rarity', stat('rarity', 'flat', 5)),
        m('+6 Rarity', stat('rarity', 'flat', 6)),
        m('+8% increased Currency Find', stat('currencyFind', 'inc', 8)),
        m('+6 Rarity', stat('rarity', 'flat', 6)),
        m('+5% of packs guard a Hoard', stat('hoardChance', 'inc', 5)),
        m('+7 Rarity', stat('rarity', 'flat', 7)),
      ],
      major: {
        id: 'tr_reliquary',
        name: 'Sorted Through',
        description:
          '+24 Rarity, and you name a kind of thing: +45% more of it is found ' +
          'everywhere. Somebody was already sorting it when the roof came in.',
        choices: bend(45).map((c) => ({
          ...c,
          stats: [...c.stats, stat('rarity', 'flat', 24)],
        })),
      },
    },

    // --- the outer four: the long roads, and the hardest things on them ----
    {
      id: 'reading',
      theme: 'The Second Watch',
      blurb: 'The rock is writing, and what it wrote is that they get up again.',
      at: at(2, 0),
      roads: ['hoard', 'reliquary'],
      minors: [
        m('+10% of Hoards whose guards stand back up', stat('watchChance', 'inc', 10)),
        m('+12% of Hoards whose guards stand back up', stat('watchChance', 'inc', 12)),
        m('+4% of packs guard a Hoard', stat('hoardChance', 'inc', 4)),
        m('+12% of Hoards whose guards stand back up', stat('watchChance', 'inc', 12)),
        m('+14% of Hoards whose guards stand back up', stat('watchChance', 'inc', 14)),
        m('+5% of packs guard a Hoard', stat('hoardChance', 'inc', 5)),
      ],
      major: {
        id: 'tr_read_aloud',
        name: 'Read Aloud',
        description:
          '+45% of Hoards whose guards stand back up, and +12% of packs guard ' +
          'a Hoard. They do it once each. You can hear it before it happens.',
        stats: [stat('watchChance', 'inc', 45), stat('hoardChance', 'inc', 12)],
      },
    },
    {
      id: 'hide',
      theme: 'The Splitting',
      blurb: 'Harder to get through, because none of it goes down in one piece.',
      at: at(2, 1),
      roads: ['hoard', 'welling'],
      minors: [
        m('+10% of deaths leave one of the rank below', stat('splitChance', 'inc', 10)),
        m('+12% of deaths leave one of the rank below', stat('splitChance', 'inc', 12)),
        m('+20% increased Magic and Rare monsters', stat('monsterRank', 'inc', 20)),
        m('+12% of deaths leave one of the rank below', stat('splitChance', 'inc', 12)),
        m('+8% of deaths well up something worse', stat('wellChance', 'inc', 8)),
        m('+14% of deaths leave one of the rank below', stat('splitChance', 'inc', 14)),
      ],
      major: {
        id: 'tr_warded',
        name: 'Grown Over',
        description:
          '+50% of deaths leave one of the rank below, and +80% increased ' +
          'Magic and Rare monsters. A common leaves nothing, and that is all ' +
          'that stops it.',
        stats: [stat('splitChance', 'inc', 50), stat('monsterRank', 'inc', 80)],
      },
    },
    {
      id: 'longway',
      theme: 'The Long Way',
      blurb: 'Further in, further round, and further back out again.',
      at: at(2, 2),
      roads: ['welling', 'bearer'],
      minors: [
        m('+10% increased Layout Complexity', stat('layoutComplexity', 'inc', 10)),
        m('+6% of packs guard a Vein', stat('veinChance', 'inc', 6)),
        m('+12% increased Layout Complexity', stat('layoutComplexity', 'inc', 12)),
        m('+8% increased Pack Count', stat('packCount', 'inc', 8)),
        m('+6% of packs guard a Hoard', stat('hoardChance', 'inc', 6)),
        m('+14% increased Layout Complexity', stat('layoutComplexity', 'inc', 14)),
      ],
      major: {
        id: 'tr_winding',
        name: 'The Long Way Round',
        description:
          '+40% increased Layout Complexity, +25% increased Pack Count and +14% ' +
          'of packs guard a Vein. Everything worth having is round one more corner.',
        stats: [
          stat('layoutComplexity', 'inc', 40),
          stat('packCount', 'inc', 25),
          stat('veinChance', 'inc', 14),
        ],
      },
    },
    {
      id: 'tithe',
      theme: 'The Tithe',
      blurb: 'It pays better and it takes its cut out of you on the way past.',
      at: at(2, 3),
      roads: ['bearer', 'reliquary'],
      minors: [
        m('+12% increased Currency Find', stat('currencyFind', 'inc', 12)),
        m('+14% of bodies drop coin where they fall', stat('giltChance', 'inc', 14)),
        m('+6 Rarity', stat('rarity', 'flat', 6)),
        m('+14% increased Currency Find', stat('currencyFind', 'inc', 14)),
        m('+8% of packs hold a Warden', stat('wardenChance', 'inc', 8)),
        m('+7 Rarity', stat('rarity', 'flat', 7)),
      ],
      major: {
        id: 'tr_the_tithe',
        name: 'The Whole Purse',
        description:
          '+40% increased Currency Find, +26 Rarity and +30% of bodies drop ' +
          'coin where they fall, and +18% of packs hold a Warden. What it ' +
          'charges and what it hands over are one deal.',
        stats: [
          stat('currencyFind', 'inc', 40),
          stat('rarity', 'flat', 26),
          stat('giltChance', 'inc', 30),
          stat('wardenChance', 'inc', 18),
        ],
      },
    },
  ],
};
