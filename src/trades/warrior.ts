/**
 * Mahthar. ONE QUESTION, asked five ways: what is in your other hand.
 *
 * A shield's Block stops a hit outright and buys nothing else; two hands on one
 * weapon buy a swing and give the Block up. Every notable here pays in exactly
 * one of those arrangements or in neither, so the web is not a ladder of
 * percentages — it is the same six points spent on two different characters.
 *
 * NOTHING in it writes `blockChance`. A shield's whole worth stays one number
 * you read off the piece; what this buys is what a Block DOES.
 */
import { stat } from '../trees/node';
import type { TradeSpec } from './spec';

export const WARRIOR_TRADE: TradeSpec = {
  id: 'warrior',
  name: 'Warrior',
  blurb:
    'A shield in the off hand blunts every hit and makes a Block worth more ' +
    'than the hit it stopped; both hands on one weapon deal 30% more damage.',
  lore:
    'He was not brought down here and he is not looking for anything. The ' +
    'marks on him are older than the workings and he cuts new ones after a ' +
    'fight that was worth it, which is most of them. He wears no shirt because ' +
    'the rock is warm and because what is written on him is the only armour he ' +
    'trusts.',
  prefix: 'mah',
  sprite: 'mahthar',
  needs: {},
  spokes: [
    {
      id: 'wall',
      theme: 'Wall',
      minors: [{ text: '+9% increased Armour', stats: [stat('armour', 'inc', 9)] }],
      gate: {
        id: 'mah_wall',
        name: 'The Wall',
        description: 'While your off hand holds a shield you take 18% less damage from hits.',
        grants: { shieldLess: 0.18 },
      },
      branches: [
        {
          id: 'bracing',
          theme: 'Bracing',
          minors: [
            { text: '+11% increased Armour', stats: [stat('armour', 'inc', 11)] },
            { text: '+13% increased Armour', stats: [stat('armour', 'inc', 13)] },
          ],
          notables: [
            {
              id: 'mah_boss',
              name: 'Barbed Boss',
              description: 'A Block deals 45% of your damage back to what you blocked.',
              grants: { blockThorns: 0.45 },
            },
            {
              id: 'mah_teeth',
              name: 'Teeth in the Rim',
              description: 'A Block deals a further 110% of your damage back to what you blocked.',
              grants: { blockThorns: 1.1 },
            },
          ],
        },
        {
          id: 'turning',
          theme: 'Turning',
          minors: [
            { text: '+8% increased maximum Life', stats: [stat('life', 'inc', 8)] },
            { text: '+12% increased Armour', stats: [stat('armour', 'inc', 12)] },
          ],
          notables: [
            {
              id: 'mah_wind',
              name: 'Second Wind',
              description: 'A Block restores 2% of your maximum life.',
              grants: { blockHeal: 0.02 },
            },
            {
              id: 'mah_unshaken',
              name: 'Unshaken',
              description:
                'A Block Slows what you blocked by 45% for 3s, and restores a further 3% ' +
                'of your maximum life.',
              grants: { blockStagger: 45, blockHeal: 0.03 },
            },
          ],
        },
      ],
    },

    {
      id: 'answer',
      theme: 'Answer',
      minors: [{ text: '+7% increased Damage', stats: [stat('damage', 'inc', 7)] }],
      gate: {
        id: 'mah_answer',
        name: 'The Answer',
        description: 'For 4s after a Block your hits deal 45% more damage.',
        grants: { blockRiposte: 45 },
      },
      branches: [
        {
          id: 'retort',
          theme: 'Retort',
          minors: [
            { text: '+9% increased Damage', stats: [stat('damage', 'inc', 9)] },
            { text: '+4% increased Attack Speed', stats: [stat('attackSpeed', 'inc', 4)] },
          ],
          notables: [
            {
              id: 'mah_backhand',
              name: 'Backhand',
              description: 'A further 30% more damage for 4s after a Block.',
              grants: { blockRiposte: 30 },
            },
            {
              id: 'mah_reprisal',
              name: 'Reprisal',
              description: 'A further 70% more damage for 4s after a Block.',
              grants: { blockRiposte: 70 },
            },
          ],
        },
        {
          id: 'hide',
          theme: 'Hide',
          minors: [
            { text: '+10% increased Armour', stats: [stat('armour', 'inc', 10)] },
            { text: '+9% increased maximum Life', stats: [stat('life', 'inc', 9)] },
          ],
          notables: [
            {
              id: 'mah_secondskin',
              name: 'Second Skin',
              description: '35% of what your Armour blunts also blunts Ailments.',
              grants: { secondSkin: 0.35 },
            },
            {
              id: 'mah_thickhide',
              name: 'Thick Hide',
              description: 'A further 40% of what your Armour blunts also blunts Ailments.',
              grants: { secondSkin: 0.4 },
            },
          ],
        },
      ],
    },

    {
      id: 'bothhands',
      theme: 'Weight',
      minors: [{ text: '+8% increased Damage', stats: [stat('damage', 'inc', 8)] }],
      gate: {
        id: 'mah_bothhands',
        name: 'Both Hands',
        description: 'While both hands are on one weapon you deal 30% more damage.',
        grants: { twoHandMore: 1.3 },
      },
      branches: [
        {
          id: 'sundering',
          theme: 'Sundering',
          minors: [
            { text: '+10% increased Damage', stats: [stat('damage', 'inc', 10)] },
            { text: '+12% increased Damage', stats: [stat('damage', 'inc', 12)] },
          ],
          notables: [
            {
              id: 'mah_overwhelm',
              name: 'Overwhelm',
              description: 'Your hits ignore 35% of what a body’s Armour blunts.',
              grants: { overwhelm: 0.35 },
            },
            {
              id: 'mah_shatterplate',
              name: 'Shatter the Plate',
              description: 'Your hits ignore 70% of what a body’s Armour blunts.',
              grants: { overwhelm: 0.7 },
            },
          ],
        },
        {
          id: 'swinging',
          theme: 'Swinging',
          minors: [
            { text: '+4% increased Attack Speed', stats: [stat('attackSpeed', 'inc', 4)] },
            { text: '+5% increased Attack Speed', stats: [stat('attackSpeed', 'inc', 5)] },
          ],
          notables: [
            {
              id: 'mah_followthrough',
              name: 'Follow Through',
              description: 'While both hands are on one weapon you attack 12% faster.',
              grants: { twoHandRate: 12 },
            },
            {
              id: 'mah_widearc',
              name: 'Wide Arc',
              description:
                'While both hands are on one weapon you attack a further 22% faster, and ' +
                'your hits Slow what they land on by 25% for 2s.',
              grants: { twoHandRate: 22, heavyHand: 25 },
            },
          ],
        },
      ],
    },

    {
      id: 'blood',
      theme: 'Blood',
      minors: [{ text: '+10% increased maximum Life', stats: [stat('life', 'inc', 10)] }],
      gate: {
        id: 'mah_bare',
        name: 'Bare to the Rock',
        description:
          'Your body armour’s rating counts for nothing, and your maximum life is 30% higher.',
        grants: { bareChest: 0.3 },
      },
      branches: [
        {
          id: 'cornered',
          theme: 'Cornered',
          minors: [
            { text: '+11% increased maximum Life', stats: [stat('life', 'inc', 11)] },
            { text: '+9% increased Damage', stats: [stat('damage', 'inc', 9)] },
          ],
          notables: [
            {
              id: 'mah_cornered',
              name: 'Cornered',
              description: 'Below 50% of your maximum life you deal 25% more damage.',
              grants: { cornered: 25 },
            },
            {
              id: 'mah_laststand',
              name: 'Last Stand',
              description: 'Below 50% of your maximum life you deal a further 60% more damage.',
              grants: { cornered: 60 },
            },
          ],
        },
        {
          id: 'feeding',
          theme: 'Feeding',
          minors: [
            { text: '+13 Life Regeneration per second', stats: [stat('lifeRegen', 'flat', 13)] },
            { text: '+12% increased maximum Life', stats: [stat('life', 'inc', 12)] },
          ],
          notables: [
            {
              id: 'mah_feed',
              name: 'Feed',
              description: 'Every kill restores 2% of your maximum life.',
              grants: { killHeal: 0.02 },
            },
            {
              id: 'mah_glut',
              name: 'Glut',
              description: 'Every kill restores a further 5% of your maximum life.',
              grants: { killHeal: 0.05 },
            },
          ],
        },
      ],
    },

    {
      id: 'paint',
      theme: 'Paint',
      minors: [{ text: '+6% increased Damage', stats: [stat('damage', 'inc', 6)] }],
      gate: {
        id: 'mah_paint',
        name: 'War Paint',
        description: 'You deal 25% more damage to enemies within 4 tiles.',
        grants: { warPaint: 25 },
      },
      branches: [
        {
          id: 'dread',
          theme: 'Dread',
          minors: [
            { text: '+9% increased maximum Life', stats: [stat('life', 'inc', 9)] },
            { text: '+11% increased Armour', stats: [stat('armour', 'inc', 11)] },
          ],
          notables: [
            {
              id: 'mah_dread',
              name: 'Dread',
              description: 'Enemies within 5 tiles deal 12% less damage.',
              grants: { dread: 12 },
            },
            {
              id: 'mah_terror',
              name: 'Terror',
              description: 'Enemies within 5 tiles deal a further 22% less damage.',
              grants: { dread: 22 },
            },
          ],
        },
        {
          id: 'marks',
          theme: 'Marks',
          minors: [
            { text: '+8% increased Damage', stats: [stat('damage', 'inc', 8)] },
            { text: '+4% increased Movement Speed', stats: [stat('moveSpeed', 'inc', 4)] },
          ],
          notables: [
            {
              id: 'mah_heavyhand',
              name: 'Heavy Hand',
              description: 'Your hits Slow what they land on by 30% for 2s.',
              grants: { heavyHand: 30 },
            },
            {
              id: 'mah_grind',
              name: 'Grind Them Down',
              description:
                'Your hits Slow what they land on by a further 25%, and you deal 30% more ' +
                'damage to enemies within 4 tiles.',
              grants: { heavyHand: 25, warPaint: 30 },
            },
          ],
        },
      ],
    },
  ],
};
