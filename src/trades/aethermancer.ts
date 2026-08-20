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
      gate: {
        id: 'aet_ward',
        name: 'Aether Ward',
        description:
          '20% of every hit, Ailments included, is paid out of mana before it ' +
          'reaches your life.',
        grants: { manaShield: 0.2 },
      },
      branches: [
        {
          id: 'bulwark',
          theme: 'Bulwark',
          minors: [
            { text: '+12% increased Mana', stats: [stat('mana', 'inc', 12)] },
            { text: '+8% increased Life', stats: [stat('life', 'inc', 8)] },
          ],
          notable: {
            id: 'aet_bulwark',
            name: 'Bulwark of Aether',
            description: '25% of every hit comes off mana before it reaches your life.',
            grants: { manaShield: 0.25 },
          },
        },
        {
          id: 'shellwork',
          theme: 'Shellwork',
          minors: [
            { text: '+220 Armour', stats: [stat('armour', 'flat', 220)] },
            { text: '+8% to all Resistances', stats: [stat('elementalRes', 'flat', 8)] },
          ],
          notable: {
            id: 'aet_shell',
            name: 'The Outer Shell',
            description: 'Mana pays 100% of an Ailment rather than the 20% a hit pays.',
            grants: { wardWhole: true },
          },
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
      gate: {
        id: 'aet_overcharge',
        name: 'Overcharge',
        description: 'Each use spends 10% of your maximum mana and adds that much Cold damage.',
        grants: { overcharge: 0.1 },
      },
      branches: [
        {
          id: 'cataclysm',
          theme: 'Cataclysm',
          minors: [
            { text: '+14% increased Mana', stats: [stat('mana', 'inc', 14)] },
            { text: '+9% increased Damage', stats: [stat('damage', 'inc', 9)] },
          ],
          notable: {
            id: 'aet_cataclysm',
            name: 'Cataclysm',
            description: 'Overcharge spends 8% more of the pool per use, and adds 8% more.',
            grants: { overcharge: 0.08 },
          },
        },
        {
          id: 'rime',
          theme: 'Rime',
          minors: [
            { text: '+12% chance to apply Chill', stats: [stat('ailmentChance', 'flat', 12, ['chill'])] },
            { text: '+16% increased Cold Damage', stats: [stat('damage', 'inc', 16, ['cold'])] },
          ],
          notable: {
            id: 'aet_rime',
            name: 'Rimebound',
            description: '+45% chance to apply your Ailment.',
            grants: { ailmentChance: 45 },
          },
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
      gate: {
        id: 'aet_siphon',
        name: 'Siphon',
        description: '4% of the damage you deal returns to you as mana.',
        grants: { manaLeech: 0.04 },
      },
      branches: [
        {
          id: 'deepdraw',
          theme: 'Deep Draw',
          minors: [
            { text: '+8% increased Damage', stats: [stat('damage', 'inc', 8)] },
            { text: '+18% increased Mana Regeneration', stats: [stat('manaRegen', 'inc', 18)] },
          ],
          notable: {
            id: 'aet_deep_draw',
            name: 'Deep Draw',
            description: '5% of the damage you deal returns as mana.',
            grants: { manaLeech: 0.05 },
          },
        },
        {
          id: 'wellspring',
          theme: 'Wellspring',
          minors: [
            { text: '+22% increased Mana Regeneration', stats: [stat('manaRegen', 'inc', 22)] },
            { text: '+9% increased Mana', stats: [stat('mana', 'inc', 9)] },
          ],
          notable: {
            id: 'aet_wellspring',
            name: 'Wellspring',
            description: 'Every kill returns 4% of your maximum mana.',
            grants: { manaOnKill: 0.04 },
          },
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
      gate: {
        id: 'aet_dry_season',
        name: 'Dry Season',
        description: 'A Starved use lands for 65% of your damage rather than 50%.',
        grants: { starvedDamage: 1.3 },
      },
      branches: [
        {
          id: 'lastdrop',
          theme: 'Last Drop',
          minors: [
            { text: '+6% reduced Mana Cost', stats: [stat('manaCost', 'inc', -6)] },
            { text: '+7% increased Damage', stats: [stat('damage', 'inc', 7)] },
          ],
          notable: {
            id: 'aet_last_drop',
            name: 'The Last Drop',
            description: '81% rather than 65% of your damage while Starved.',
            grants: { starvedDamage: 1.25 },
          },
        },
        {
          id: 'thrift',
          theme: 'Thrift',
          minors: [
            { text: '+7% reduced Mana Cost', stats: [stat('manaCost', 'inc', -7)] },
            { text: '+10% increased Mana', stats: [stat('mana', 'inc', 10)] },
          ],
          notable: {
            id: 'aet_thrift',
            name: 'Never Dry',
            description:
              'A use you cannot pay for spends life instead, 2 life for every point ' +
              'of mana.',
            grants: { payWithLife: 2 },
          },
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
      gate: {
        id: 'aet_vessel',
        name: 'The Vessel',
        description: '15% of your maximum life is added to your maximum mana.',
        grants: { poolFromLife: 0.15 },
      },
      branches: [
        {
          id: 'confluence',
          theme: 'Confluence',
          minors: [
            { text: '+9% increased Life', stats: [stat('life', 'inc', 9)] },
            { text: '+11% increased Life', stats: [stat('life', 'inc', 11)] },
          ],
          notable: {
            id: 'aet_confluence',
            name: 'Confluence',
            description: '20% of your maximum life is added to the pool.',
            grants: { poolFromLife: 0.2 },
          },
        },
        {
          id: 'widening',
          theme: 'Widening',
          minors: [
            { text: '+13% increased Mana', stats: [stat('mana', 'inc', 13)] },
            { text: '+15% increased Mana', stats: [stat('mana', 'inc', 15)] },
          ],
          notable: {
            id: 'aet_widening',
            name: 'The Wider Bore',
            description: 'Overcharge adds 1.6x what it spent rather than matching it.',
            grants: { overchargeYield: 1.6 },
          },
        },
      ],
    },
  ],
};
