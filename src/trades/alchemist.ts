/**
 * The Alchemist. Potions stop being a safety net and become the engine.
 *
 * Bare, a flask is two charges of regeneration and a descent's whole budget.
 * Here it carries a buff while it runs and comes BACK during the descent, so
 * the question stops being "can I afford to drink" and becomes UPTIME: three
 * spokes make the window bigger, two make it come round more often, and ten
 * points reach five of them. Stack magnitude and you get windows of enormous
 * power between dry spells; stack the last two and you are permanently a
 * little better.
 */
import { TRADE_BASE } from '../data';
import { stat } from '../trees/node';
import type { TradeSpec } from './spec';

export const ALCHEMIST: TradeSpec = {
  id: 'alchemist',
  name: 'Alchemist',
  blurb:
    'A flask carries a buff while it runs, and its Charges come back during a ' +
    'descent — so 2 Charges are a cooldown rather than the whole budget.',
  lore:
    'He came down here for the water. Something in the rock changes what is ' +
    'steeped in it, and he has been steeping things for a long time — his own ' +
    'blood among them. He does not win a fight so much as outlast it, one ' +
    'mouthful at a time, and what is in the flask is the only part of him ' +
    'that has not been used up.',
  baseline: {
    short: 'Kills put flask Charges back, so the flasks are never a descent’s whole budget.',
    grants: { chargeOnKill: TRADE_BASE.alchemistChargePerKill },
  },
  attributes: { strength: 6, intelligence: 12, dexterity: 7, acuity: 9, spirit: 15, constitution: 8 },
  skill: 'fireball',
  prefix: 'alc',
  sprite: 'alchemist',
  // Nothing here is useless without something else: every notable is worth its
  // point alone, and the spoke is the only thing making one cost more.
  needs: {},
  spokes: [
    {
      id: 'reaction',
      theme: 'Reaction',
      minors: [
        { text: '+6% increased Damage', stats: [stat('damage', 'inc', 6)] },
      ],
      gate: {
        id: 'alc_volatile',
        name: 'Volatile Mixture',
        description: 'While a flask is running you deal 20% more damage.',
        grants: { potionMore: 1.2 },
      },
      branches: [
        {
          id: 'detonating',
          theme: 'Detonating',
          minors: [
            { text: '+9% increased Damage', stats: [stat('damage', 'inc', 9)] },
            { text: '+11% increased Damage', stats: [stat('damage', 'inc', 11)] },
          ],
          notables: [
            {
              id: 'alc_touchpaper',
              name: 'Touchpaper',
              description: '15% more damage while a flask is running.',
              grants: { potionMore: 1.15 },
            },
            {
              id: 'alc_detonation',
              name: 'Detonation',
              description: '30% more damage while a flask is running.',
              grants: { potionMore: 1.3 },
            },
          ],
        },
        {
          id: 'residue',
          theme: 'Residue',
          minors: [
            { text: '+11% chance to apply your Ailment', stats: [stat('ailmentChance', 'flat', 11)] },
            { text: '+14% increased Damage over Time', stats: [stat('damage', 'inc', 14, ['overTime'])] },
          ],
          notables: [
            {
              id: 'alc_sediment',
              name: 'Sediment',
              description: 'Ailments you apply last 40% longer.',
              grants: { ailmentDuration: 1.4 },
            },
            {
              id: 'alc_residue',
              name: 'What It Leaves',
              description: '+40% chance to apply your Ailment, and they deal 25% more damage.',
              grants: { ailmentChance: 40, ailmentMultiplier: 1.25 },
            },
          ],
        },
      ],
    },
    {
      id: 'quicksilver',
      theme: 'Quicksilver',
      minors: [
        { text: '+3% increased Attack Speed', stats: [stat('attackSpeed', 'inc', 3)] },
      ],
      gate: {
        id: 'alc_quicksilver',
        name: 'Quicksilver',
        description: 'While a flask is running you attack and cast 15% faster.',
        grants: { potionHaste: 15 },
      },
      branches: [
        {
          id: 'fevered',
          theme: 'Fevered',
          minors: [
            { text: '+4% increased Attack Speed', stats: [stat('attackSpeed', 'inc', 4)] },
            { text: '+4% increased Cast Speed', stats: [stat('castSpeed', 'inc', 4)] },
          ],
          notables: [
            {
              id: 'alc_rising',
              name: 'Rising Fever',
              description: '+10% increased attack and cast speed while a flask is running.',
              grants: { potionHaste: 10 },
            },
            {
              id: 'alc_fever',
              name: 'Fever',
              description: '+20% increased attack and cast speed while a flask is running.',
              grants: { potionHaste: 20 },
            },
          ],
        },
        {
          id: 'lightfoot',
          theme: 'Lightfoot',
          minors: [
            { text: '+4% increased Movement Speed', stats: [stat('moveSpeed', 'inc', 4)] },
            { text: '+5% increased Movement Speed', stats: [stat('moveSpeed', 'inc', 5)] },
          ],
          notables: [
            {
              id: 'alc_surefoot',
              name: 'Sure Footing',
              description: 'While a flask is running you move 18% faster.',
              grants: { potionMove: 18 },
            },
            {
              id: 'alc_lightfoot',
              name: 'Light on the Rock',
              description: 'While a flask is running you move 30% faster.',
              grants: { potionMove: 30 },
            },
          ],
        },
      ],
    },
    {
      id: 'etching',
      theme: 'Etching',
      minors: [
        { text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
      ],
      gate: {
        id: 'alc_etched',
        name: 'Etched Glass',
        description: 'While a flask is running you have +8% Critical Chance.',
        grants: { potionCrit: 8 },
      },
      branches: [
        {
          id: 'faceted',
          theme: 'Faceted',
          minors: [
            { text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
            { text: '+2% Critical Chance', stats: [stat('critChance', 'flat', 2)] },
          ],
          notables: [
            {
              id: 'alc_firstfacet',
              name: 'The First Facet',
              description: 'While a flask is running you have +7% Critical Chance.',
              grants: { potionCrit: 7 },
            },
            {
              id: 'alc_facets',
              name: 'Cut Facets',
              description: '+12% Critical Chance while a flask is running.',
              grants: { potionCrit: 12 },
            },
          ],
        },
        {
          id: 'deepcut',
          theme: 'Deep Cut',
          minors: [
            { text: '+18% Critical Damage', stats: [stat('critMultiplier', 'flat', 18)] },
            { text: '+22% Critical Damage', stats: [stat('critMultiplier', 'flat', 22)] },
          ],
          notables: [
            {
              id: 'alc_scored',
              name: 'Whetted',
              description: 'While a flask is running you have +5% Critical Chance.',
              grants: { potionCrit: 5 },
            },
            {
              id: 'alc_deepcut',
              name: 'The Long Cut',
              description: 'A Critical leaves you dealing 35% more damage for 4s.',
              grants: { critIntoBuff: { more: 35, seconds: 4 } },
            },
          ],
        },
      ],
    },
    {
      id: 'steeping',
      theme: 'Steeping',
      minors: [
        { text: '+8% increased Life', stats: [stat('life', 'inc', 8)] },
      ],
      gate: {
        id: 'alc_slow_burn',
        name: 'Slow Burn',
        description: 'Flasks run 50% longer.',
        grants: { potionDuration: 1.5 },
      },
      branches: [
        {
          id: 'thickening',
          theme: 'Thickening',
          minors: [
            { text: '+24% increased Life Regeneration', stats: [stat('lifeRegen', 'inc', 24)] },
            { text: '+9% increased Life', stats: [stat('life', 'inc', 9)] },
          ],
          notables: [
            {
              id: 'alc_reduced',
              name: 'Reduced',
              description: 'Flasks restore 20% more per second.',
              grants: { potionPotency: 1.2 },
            },
            {
              id: 'alc_thickened',
              name: 'Thickened',
              description: 'Flasks restore 40% more per second.',
              grants: { potionPotency: 1.4 },
            },
          ],
        },
        {
          id: 'tempering',
          theme: 'Tempering',
          minors: [
            { text: '+11% increased Life', stats: [stat('life', 'inc', 11)] },
            { text: '+180 Armour', stats: [stat('armour', 'flat', 180)] },
          ],
          notables: [
            {
              id: 'alc_annealed',
              name: 'Annealed',
              description: 'While a flask is running you take 18% less damage.',
              grants: { potionLess: 0.18 },
            },
            {
              id: 'alc_tempered',
              name: 'Tempered Glass',
              description: 'While a flask is running you take 30% less damage.',
              grants: { potionLess: 0.3 },
            },
          ],
        },
      ],
    },
    {
      id: 'condensate',
      theme: 'Condensate',
      minors: [
        { text: '+10% increased Mana', stats: [stat('mana', 'inc', 10)] },
      ],
      gate: {
        id: 'alc_still',
        name: 'The Still',
        description: 'Each flask regains a Charge every 14.3s of a descent.',
        grants: { chargeRegen: 0.07 },
      },
      branches: [
        {
          id: 'cascading',
          theme: 'Cascading',
          minors: [
            { text: '+18% increased Mana Regeneration', stats: [stat('manaRegen', 'inc', 18)] },
            { text: '+12% increased Mana', stats: [stat('mana', 'inc', 12)] },
          ],
          notables: [
            {
              id: 'alc_runoff',
              name: 'Runoff',
              description: 'Each flask regains a Charge every 20s of a descent.',
              grants: { chargeRegen: 0.05 },
            },
            {
              id: 'alc_cascade',
              name: 'Cascade',
              description:
                'Another Charge every 12.5s on its own, and one every 6.7s with ' +
                'the Still in front of it.',
              grants: { chargeRegen: 0.08 },
            },
          ],
        },
        {
          id: 'frugality',
          theme: 'Frugality',
          minors: [
            { text: '+6% reduced Mana Cost', stats: [stat('manaCost', 'inc', -6)] },
            { text: '+8% increased Mana', stats: [stat('mana', 'inc', 8)] },
          ],
          notables: [
            {
              id: 'alc_measured',
              name: 'A Measured Draught',
              description: 'Flasks run 30% longer.',
              grants: { potionDuration: 1.3 },
            },
            {
              id: 'alc_frugal',
              name: 'Nothing Wasted',
              description: 'While a flask is running your uses cost 0 mana.',
              grants: { potionFree: true },
            },
          ],
        },
      ],
    },
  ],
};
