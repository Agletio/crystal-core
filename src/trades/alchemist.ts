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
        { text: '+8% increased Damage', stats: [stat('damage', 'inc', 8)] },
      ],
      notables: [
        {
          id: 'alc_volatile',
          name: 'Volatile Mixture',
          description: 'While a flask is running you deal 20% more damage.',
          grants: { potionMore: 1.2 },
        },
        {
          id: 'alc_detonation',
          name: 'Detonation',
          description: 'And 30% more again on top of that.',
          grants: { potionMore: 1.3 },
        },
      ],
    },
    {
      id: 'quicksilver',
      theme: 'Quicksilver',
      minors: [
        { text: '+3% increased Attack Speed', stats: [stat('attackSpeed', 'inc', 3)] },
        { text: '+3% increased Cast Speed', stats: [stat('castSpeed', 'inc', 3)] },
      ],
      notables: [
        {
          id: 'alc_quicksilver',
          name: 'Quicksilver',
          description: 'While a flask is running you attack and cast 15% faster.',
          grants: { potionHaste: 15 },
        },
        {
          id: 'alc_fever',
          name: 'Fever',
          description: 'And another 20% faster while one runs.',
          grants: { potionHaste: 20 },
        },
      ],
    },
    {
      id: 'etching',
      theme: 'Etching',
      minors: [
        { text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
        { text: '+10% Critical Damage', stats: [stat('critMultiplier', 'flat', 10)] },
      ],
      notables: [
        {
          id: 'alc_etched',
          name: 'Etched Glass',
          description: 'While a flask is running you have +8% Critical Chance.',
          grants: { potionCrit: 8 },
        },
        {
          id: 'alc_facets',
          name: 'Cut Facets',
          description: 'And a further +12% Critical Chance while one runs.',
          grants: { potionCrit: 12 },
        },
      ],
    },
    {
      id: 'steeping',
      theme: 'Steeping',
      minors: [
        { text: '+8% increased Life', stats: [stat('life', 'inc', 8)] },
        { text: '+20% increased Life Regeneration', stats: [stat('lifeRegen', 'inc', 20)] },
      ],
      notables: [
        {
          id: 'alc_slow_burn',
          name: 'Slow Burn',
          description: 'Flasks run 50% longer, so the window they open is half again as wide.',
          grants: { potionDuration: 1.5 },
        },
        {
          id: 'alc_thickened',
          name: 'Thickened',
          description: 'And restore 40% more per second while they run.',
          grants: { potionPotency: 1.4 },
        },
      ],
    },
    {
      id: 'condensate',
      theme: 'Condensate',
      minors: [
        { text: '+10% increased Mana', stats: [stat('mana', 'inc', 10)] },
        { text: '+15% increased Mana Regeneration', stats: [stat('manaRegen', 'inc', 15)] },
      ],
      notables: [
        {
          id: 'alc_still',
          name: 'The Still',
          description: 'Each flask regains a Charge every 14.3s of a descent.',
          grants: { chargeRegen: 0.07 },
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
  ],
};
