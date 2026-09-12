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
import { TRADE_BASE } from '../data';
import { stat } from '../trees/node';
import type { TradeSpec } from './spec';

export const WARRIOR_TRADE: TradeSpec = {
  id: 'warrior',
  name: 'Warrior',
  blurb:
    'A weapon specialist with talents for shield defence, retaliation on Block ' +
    'and powerful two-handed attacks.',
  lore:
    'Mahthar seeks neither riches nor answers in the depths. The marks on his ' +
    'skin are older than these workings, and he cuts a new one after every ' +
    'worthy fight. He wears them openly in the warmth of the rock, trusting ' +
    'them more than any armour.',
  baseline: {
    short:
      `Hits can Stun enemies for ${TRADE_BASE.warriorStunSeconds}s. The chance increases with ` +
      'the proportion of the target\'s maximum Life dealt as damage.',
    grants: { stunSeconds: TRADE_BASE.warriorStunSeconds },
  },
  attributes: { strength: 15, intelligence: 6, dexterity: 8, acuity: 6, spirit: 9, constitution: 13 },
  skill: 'strike',
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
              description: "Blocking a hit deals Physical damage to the attacker equal to 45% of your main skill's damage.",
              grants: { blockThorns: 0.45 },
            },
            {
              id: 'mah_teeth',
              name: 'Teeth in the Rim',
              description: "Blocking a hit deals additional Physical damage to the attacker equal to 110% of your main skill's damage.",
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
              description: "Blocking a hit restores 2% of maximum Life.",
              grants: { blockHeal: 0.02 },
            },
            {
              id: 'mah_unshaken',
              name: 'Unshaken',
              description:
                "Blocking a hit Slows the attacker by 45% for 3s and restores an additional 3% of maximum Life.",
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
              description: "Adds 30 percentage points to your damage bonus for hits during the 4s after a Block.",
              grants: { blockRiposte: 30 },
            },
            {
              id: 'mah_reprisal',
              name: 'Reprisal',
              description: "Adds 70 percentage points to your damage bonus for hits during the 4s after a Block.",
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
              description: "Gain Ailment damage and effect reduction equal to 35% of your Armour's damage reduction.",
              grants: { secondSkin: 0.35 },
            },
            {
              id: 'mah_thickhide',
              name: 'Thick Hide',
              description: "An additional 40% of your Armour's damage reduction applies to Ailment damage and effects, up to 100% of that reduction.",
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
              description: "Your hits ignore 35% of the enemy's damage reduction from Armour.",
              grants: { overwhelm: 0.35 },
            },
            {
              id: 'mah_shatterplate',
              name: 'Shatter the Plate',
              description: "Your hits ignore 70% of the enemy's damage reduction from Armour. Replaces Overwhelm's 35%.",
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
              description: "Kills restore 2% of maximum Life.",
              grants: { killHeal: 0.02 },
            },
            {
              // A kill-heal is a LUMP between fights; this is the same branch's
              // answer DURING one, and the two do not replace each other.
              id: 'mah_glut',
              name: 'Glut',
              description:
                "Kills restore an additional 3% of maximum Life. Recover Life equal to an additional 1.5% of damage dealt by hits.",
              grants: { killHeal: 0.03, lifeLeech: 0.015 },
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
        description: 'For 4s after you are hit, you deal 25% more damage.',
        grants: { struckMore: 25 },
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
              description: 'For 4s after you are hit, you take 12% less damage.',
              grants: { struckLess: 12 },
            },
            {
              id: 'mah_terror',
              name: 'Terror',
              description: 'For 4s after you are hit, you take a further 22% less damage.',
              grants: { struckLess: 22 },
            },
          ],
        },
        {
          id: 'marks',
          theme: 'Concussion',
          minors: [
            { text: '+8% increased Damage', stats: [stat('damage', 'inc', 8)] },
            { text: '+4% increased Movement Speed', stats: [stat('moveSpeed', 'inc', 4)] },
          ],
          notables: [
            {
              id: 'mah_heavyhand',
              name: 'Heavy Hand',
              description:
                '+70% increased chance to Stun, your Stuns last 0.5s longer, and your hits ' +
                'Slow what they land on by 30% for 2s.',
              grants: { stunMore: 70, stunSeconds: 0.5, heavyHand: 30 },
            },
            {
              id: 'mah_aftershock',
              name: 'Aftershock',
              description:
                "Stunning an enemy triggers a Burst with a 2.6-tile radius around it, dealing 55% of your main skill's damage to other enemies. Hits that kill also trigger the Burst.",
              grants: { stunBurst: 0.55 },
            },
          ],
        },
      ],
    },
  ],
};
