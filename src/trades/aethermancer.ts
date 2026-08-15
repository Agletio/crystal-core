/**
 * The Aethermancer. Mana is your second health bar and your damage multiplier
 * at once, and all five spokes pull on the SAME pool.
 *
 * That is the whole trade. The Ward wants the pool full, Overflow empties it
 * for damage, the Siphon refills it out of what that damage did, Drought makes
 * running dry survivable, and the Vessel makes the pool bigger out of the one
 * stat everything grants. A build that spends its pool for damage is a build
 * one bad pack away from having neither, and the far notables are where you
 * buy your way out of that.
 */
import { stat } from '../trees/node';
import type { TradeSpec } from './spec';

export const AETHERMANCER: TradeSpec = {
  id: 'aethermancer',
  name: 'Aethermancer',
  blurb:
    'Mana takes hits before your life does, and a use can spend the pool for ' +
    'more damage. Every one of the five roads runs through the same pool.',
  lore:
    'He learned young that the pool will hold a wound for you, and he has been ' +
    'spending it ever since — on damage, on hurts he should have taken, on ' +
    'the next hour. There is nothing left of him that is not the pool. He is ' +
    'starved, wired, and entirely certain he has the better end of it.',
  prefix: 'aet',
  sprite: 'aethermancer',
  needs: { overchargeMore: 'aet_overcharge' },
  spokes: [
    {
      id: 'warding',
      theme: 'Warding',
      minors: [
        { text: '+10% increased Mana', stats: [stat('mana', 'inc', 10)] },
        { text: '+6% increased Life', stats: [stat('life', 'inc', 6)] },
      ],
      notables: [
        {
          id: 'aet_ward',
          name: 'Aether Ward',
          description:
            '20% of damage taken is paid out of mana before it reaches your ' +
            'life — Ailments included, which Armour never blunts.',
          grants: { manaShield: 0.2 },
        },
        {
          id: 'aet_bulwark',
          name: 'Bulwark of Aether',
          description: 'A further 25% of damage taken comes off mana first.',
          grants: { manaShield: 0.25 },
        },
      ],
    },
    {
      id: 'overflow',
      theme: 'Overflow',
      minors: [
        { text: '+7% increased Damage', stats: [stat('damage', 'inc', 7)] },
        { text: '+12% increased Mana', stats: [stat('mana', 'inc', 12)] },
      ],
      notables: [
        {
          id: 'aet_overcharge',
          name: 'Overcharge',
          description:
            'Each use spends a further 12% of your maximum mana and deals 40% ' +
            'more damage. The only cost in the game that grows as you stack mana.',
          grants: { overcharge: { share: 0.12, more: 0.4 } },
        },
        {
          id: 'aet_cataclysm',
          name: 'Cataclysm',
          description: 'An overcharged use deals a further 45% more damage.',
          grants: { overchargeMore: 0.45 },
        },
      ],
    },
    {
      id: 'siphoning',
      theme: 'Siphoning',
      minors: [
        { text: '+15% increased Mana Regeneration', stats: [stat('manaRegen', 'inc', 15)] },
        { text: '+6% increased Damage', stats: [stat('damage', 'inc', 6)] },
      ],
      notables: [
        {
          id: 'aet_siphon',
          name: 'Siphon',
          description: '4% of the damage you deal returns to you as mana.',
          grants: { manaLeech: 0.04 },
        },
        {
          id: 'aet_deep_draw',
          name: 'Deep Draw',
          description: 'A further 5% of the damage you deal returns as mana.',
          grants: { manaLeech: 0.05 },
        },
      ],
    },
    {
      id: 'drought',
      theme: 'Drought',
      minors: [
        { text: '+4% reduced Mana Cost', stats: [stat('manaCost', 'inc', -4)] },
        { text: '+5% increased Damage', stats: [stat('damage', 'inc', 5)] },
      ],
      notables: [
        {
          id: 'aet_dry_season',
          name: 'Dry Season',
          description: 'A Starved use lands for 65% of your damage rather than 50%.',
          grants: { starvedDamage: 1.3 },
        },
        {
          id: 'aet_last_drop',
          name: 'The Last Drop',
          description: 'And 81% rather than 65%, so being Starved costs you almost nothing.',
          grants: { starvedDamage: 1.25 },
        },
      ],
    },
    {
      id: 'vessel',
      theme: 'Vessel',
      minors: [
        { text: '+7% increased Life', stats: [stat('life', 'inc', 7)] },
        { text: '+10% increased Mana', stats: [stat('mana', 'inc', 10)] },
      ],
      notables: [
        {
          id: 'aet_vessel',
          name: 'The Vessel',
          description:
            '15% of your maximum life is added to your mana pool — the one road ' +
            'to mana that runs through the stat everything grants.',
          grants: { poolFromLife: 0.15 },
        },
        {
          id: 'aet_confluence',
          name: 'Confluence',
          description: 'A further 20% of your maximum life is added to the pool.',
          grants: { poolFromLife: 0.2 },
        },
      ],
    },
  ],
};
