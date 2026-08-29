/**
 * The Rogue. THE ONLY TRADE THAT MAY HOLD TWO WEAPONS.
 *
 * *"All characters should just not be able to dual wield and then we just have
 * a trade that can. Dark rogue type, hooded figure, spec is all about dual
 * wielding."* Everybody else takes a shield or two hands on one weapon; this is
 * the third arrangement and nobody else can reach it, so almost every notable
 * here pays only while both hands are full.
 *
 * The WEAPON SPECIALIST is the user's own node: what each weapon grants is a
 * fact about its family, held in `WEAPON_SPECIALITY`, and it is read PER WEAPON
 * — so a matched pair is that line twice.
 */
import { DUAL, ORDER } from '../data';
import { stat } from '../trees/node';
import type { TradeSpec } from './spec';

const pct = (n: number): string => `${Math.round(n * 100)}%`;

export const ROGUE_TRADE: TradeSpec = {
  id: 'rogue',
  name: 'Rogue',
  blurb:
    'The only trade that may hold two weapons at once. A pair deals 25% more ' +
    'damage, and every node reads WHICH two you are holding.',
  lore:
    `Obreth, of ${ORDER.name}, which is not a thing he volunteers. They sent ` +
    'him down to read the rock and he came back up with two knives instead, ' +
    'and he has been trading them up ever since, one hand at a time. He has ' +
    'never once been seen carrying a shield and he is unkind about people who ' +
    'are. What the Order wanted read, he has not said.',
  baseline: {
    short: 'Capable of holding two weapons at once — no other trade may.',
    says: [
      `Both hands may hold a one-handed weapon. A pair puts ${pct(DUAL.main)} of the main ` +
        `hand and ${pct(DUAL.off)} of the off hand into every hit, and the rate ALTERNATES: ` +
        'this swing at the main hand’s, the next at the off hand’s.',
    ],
  },
  skill: 'ambush',
  prefix: 'rog',
  sprite: 'obreth',
  dualWields: true,
  needs: {},
  spokes: [
    {
      id: 'pair',
      theme: 'Pair',
      minors: [{ text: '+7% increased Damage', stats: [stat('damage', 'inc', 7)] }],
      gate: {
        id: 'rog_pair',
        name: 'Both Hands Full',
        description: 'While you hold two weapons you deal 25% more damage.',
        grants: { pairMore: 1.25 },
      },
      branches: [
        {
          id: 'alternating',
          theme: 'Alternating',
          minors: [
            { text: '+4% increased Attack Speed', stats: [stat('attackSpeed', 'inc', 4)] },
            { text: '+5% increased Attack Speed', stats: [stat('attackSpeed', 'inc', 5)] },
          ],
          notables: [
            {
              id: 'rog_rhythm',
              name: 'Rhythm',
              description: 'While you hold two weapons you attack 10% faster.',
              grants: { pairRate: 10 },
            },
            {
              id: 'rog_blur',
              name: 'Blur',
              description: 'While you hold two weapons you attack a further 22% faster.',
              grants: { pairRate: 22 },
            },
          ],
        },
        {
          id: 'weakhand',
          theme: 'Weak Hand',
          minors: [
            { text: '+8% increased Damage', stats: [stat('damage', 'inc', 8)] },
            { text: '+9% increased Damage', stats: [stat('damage', 'inc', 9)] },
          ],
          notables: [
            {
              id: 'rog_evenly',
              name: 'Evenly Weighted',
              description: 'Your off hand puts a further 15% of its own damage into every hit.',
              grants: { offHandShare: 0.15 },
            },
            {
              id: 'rog_ambidextrous',
              name: 'Ambidextrous',
              description: 'Your off hand puts a further 35% of its own damage into every hit.',
              grants: { offHandShare: 0.35 },
            },
          ],
        },
      ],
    },

    {
      id: 'trade',
      theme: 'Trade',
      minors: [{ text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] }],
      gate: {
        id: 'rog_specialist',
        name: 'Weapon Specialist',
        description:
          'Every weapon you hold grants what its family is for — 4% Critical Chance per ' +
          'dagger, 7% increased Attack Speed per sword, 12% increased Damage per mace, ' +
          '9% increased Cast Speed per wand or staff, 7% per bow.',
        grants: { weaponSpecialist: 1 },
      },
      branches: [
        {
          id: 'matched',
          theme: 'Matched',
          minors: [
            { text: '+9% increased Damage', stats: [stat('damage', 'inc', 9)] },
            { text: '+10% increased Damage', stats: [stat('damage', 'inc', 10)] },
          ],
          notables: [
            {
              id: 'rog_twinned',
              name: 'Twinned',
              description: 'While both your weapons are the same family you deal 20% more damage.',
              grants: { matchedPair: 20 },
            },
            {
              id: 'rog_mirror',
              name: 'Mirror Work',
              description:
                'While both your weapons are the same family you deal a further 45% more ' +
                'damage, and every weapon grants half its family’s line again.',
              grants: { matchedPair: 45, weaponSpecialist: 0.5 },
            },
          ],
        },
        {
          id: 'mixed',
          theme: 'Mixed',
          minors: [
            { text: '+4% increased Attack Speed', stats: [stat('attackSpeed', 'inc', 4)] },
            { text: '+9% increased Damage', stats: [stat('damage', 'inc', 9)] },
          ],
          notables: [
            {
              id: 'rog_odd',
              name: 'Odd Hands',
              description: 'While your two weapons are different families you deal 18% more damage.',
              grants: { oddPair: 18 },
            },
            {
              id: 'rog_improviser',
              name: 'Improviser',
              description:
                'While your two weapons are different families you deal a further 40% more ' +
                'damage, and every weapon grants half its family’s line again.',
              grants: { oddPair: 40, weaponSpecialist: 0.5 },
            },
          ],
        },
      ],
    },

    {
      id: 'shadow',
      theme: 'Shadow',
      minors: [{ text: '+8% increased Damage', stats: [stat('damage', 'inc', 8)] }],
      gate: {
        id: 'rog_unseen',
        name: 'Unseen',
        description: 'The first hit you land on a body deals 60% more damage.',
        grants: { firstBlood: 60 },
      },
      branches: [
        {
          id: 'opening',
          theme: 'Opening',
          minors: [
            { text: '+10% increased Damage', stats: [stat('damage', 'inc', 10)] },
            { text: '+2% Critical Chance', stats: [stat('critChance', 'flat', 2)] },
          ],
          notables: [
            {
              id: 'rog_opener',
              name: 'The Opener',
              description: 'The first hit you land on a body deals a further 40% more damage.',
              grants: { firstBlood: 40 },
            },
            {
              id: 'rog_assassin',
              name: 'Assassination',
              description: 'The first hit you land on a body deals a further 90% more damage.',
              grants: { firstBlood: 90 },
            },
          ],
        },
        {
          id: 'vanishing',
          theme: 'Vanishing',
          minors: [
            { text: '+9% increased maximum Life', stats: [stat('life', 'inc', 9)] },
            { text: '+4% increased Movement Speed', stats: [stat('moveSpeed', 'inc', 4)] },
          ],
          notables: [
            {
              id: 'rog_cover',
              name: 'Cover',
              description: 'For 3s after a kill you take 12% less damage.',
              grants: { killGuard: 12 },
            },
            {
              id: 'rog_gone',
              name: 'Gone',
              description: 'For 3s after a kill you take a further 25% less damage.',
              grants: { killGuard: 25 },
            },
          ],
        },
      ],
    },

    {
      id: 'quick',
      theme: 'Quick',
      minors: [{ text: '+3% increased Attack Speed', stats: [stat('attackSpeed', 'inc', 3)] }],
      gate: {
        id: 'rog_quickening',
        name: 'Quickening',
        description: 'For 3s after a kill you attack 15% faster.',
        grants: { killHaste: 15 },
      },
      branches: [
        {
          id: 'cascade',
          theme: 'Cascade',
          minors: [
            { text: '+4% increased Attack Speed', stats: [stat('attackSpeed', 'inc', 4)] },
            { text: '+5% increased Attack Speed', stats: [stat('attackSpeed', 'inc', 5)] },
          ],
          notables: [
            {
              id: 'rog_cascade',
              name: 'Cascade',
              description: 'For 3s after a kill you attack a further 12% faster.',
              grants: { killHaste: 12 },
            },
            {
              id: 'rog_spree',
              name: 'Spree',
              description: 'For 3s after a kill you attack a further 28% faster.',
              grants: { killHaste: 28 },
            },
          ],
        },
        {
          id: 'footwork',
          theme: 'Footwork',
          minors: [
            { text: '+4% increased Movement Speed', stats: [stat('moveSpeed', 'inc', 4)] },
            { text: '+5% increased Movement Speed', stats: [stat('moveSpeed', 'inc', 5)] },
          ],
          notables: [
            {
              id: 'rog_carried',
              name: 'Carried On',
              description: 'For 3s after a kill you move 15% faster.',
              grants: { killMove: 15 },
            },
            {
              id: 'rog_running',
              name: 'Running Work',
              description: 'For 3s after a kill you move a further 30% faster.',
              grants: { killMove: 30 },
            },
          ],
        },
      ],
    },

    {
      id: 'edge',
      theme: 'Edge',
      minors: [{ text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] }],
      gate: {
        id: 'rog_edge',
        name: 'Edge',
        description: 'While you hold two weapons you have +8% Critical Chance.',
        grants: { pairCrit: 8 },
      },
      branches: [
        {
          id: 'precision',
          theme: 'Precision',
          minors: [
            { text: '+2% Critical Chance', stats: [stat('critChance', 'flat', 2)] },
            { text: '+9% increased Damage', stats: [stat('damage', 'inc', 9)] },
          ],
          notables: [
            {
              id: 'rog_precision',
              name: 'Precision',
              description: 'While you hold two weapons you have a further +6% Critical Chance.',
              grants: { pairCrit: 6 },
            },
            {
              id: 'rog_needlepoint',
              name: 'Needlepoint',
              description: 'While you hold two weapons you have a further +14% Critical Chance.',
              grants: { pairCrit: 14 },
            },
          ],
        },
        {
          id: 'follow',
          theme: 'Follow',
          minors: [
            { text: '+10% increased Damage', stats: [stat('damage', 'inc', 10)] },
            { text: '+2% Critical Chance', stats: [stat('critChance', 'flat', 2)] },
          ],
          notables: [
            {
              id: 'rog_follow',
              name: 'Follow Through',
              description: 'A Critical strikes again with your off hand for 25% of the hit.',
              grants: { critEcho: 25 },
            },
            {
              id: 'rog_flurry',
              name: 'Flurry',
              description: 'A Critical strikes again with your off hand for a further 55% of the hit.',
              grants: { critEcho: 55 },
            },
          ],
        },
      ],
    },
  ],
};
