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
import { TRADE_BASE } from '../data';
import { stat } from '../trees/node';
import type { TradeSpec } from './spec';

export const AETHERMANCER: TradeSpec = {
  id: 'aethermancer',
  name: 'Aethermancer',
  blurb:
    'Uses mana to absorb damage. His talents can strengthen this protection, ' +
    'spend mana for added Cold damage or recover mana by dealing damage.',
  lore:
    'He learned young to let aether take the blows meant for his flesh. ' +
    'Now he draws on it for every battle, pushing his exhausted body beyond ' +
    'its limits. He knows what the power is costing him. He still believes ' +
    'he has the better bargain.',
  baseline: {
    short:
      `Regenerates an additional ${TRADE_BASE.aethermancerPoolRegen}% of maximum Mana per second. ` +
      `${Math.round(TRADE_BASE.aethermancerShield * 100)}% of damage taken is absorbed by Mana before Life.`,
    grants: {
      poolRegen: TRADE_BASE.aethermancerPoolRegen,
      manaShield: TRADE_BASE.aethermancerShield,
    },
  },
  attributes: { strength: 6, intelligence: 15, dexterity: 6, acuity: 12, spirit: 11, constitution: 7 },
  skill: 'rimespike',
  prefix: 'aet',
  sprite: 'aethermancer',
  needs: { overchargeMore: 'aet_overcharge' },
  spokes: [
    {
      id: 'warding',
      theme: 'Warding',
      minors: [
        { text: '+10% increased Mana', stats: [stat('mana', 'inc', 10)] },
      ],
      gate: {
        id: 'aet_ward',
        name: 'Aether Ward',
        description:
          "Adds 20 percentage points to the share of damage absorbed by Mana before Life, up to 60%. Includes Ailment damage and requires available Mana.",
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
          notables: [
            {
              id: 'aet_standing',
              name: 'Standing Ward',
              description: "Adds 12 percentage points to the share of damage absorbed by Mana before Life, up to 60%.",
              grants: { manaShield: 0.12 },
            },
            {
              id: 'aet_bulwark',
              name: 'Bulwark of Aether',
              description: "Adds 25 percentage points to the share of damage absorbed by Mana before Life, up to 60%.",
              grants: { manaShield: 0.25 },
            },
          ],
        },
        {
          id: 'shellwork',
          theme: 'Shellwork',
          minors: [
            { text: '+220 Armour', stats: [stat('armour', 'flat', 220)] },
            { text: '+8% to all Resistances', stats: [stat('elementalRes', 'flat', 8)] },
          ],
          notables: [
            {
              id: 'aet_coldcomfort',
              name: 'Cold Comfort',
              description: "Adds 10% of maximum Life to base Mana. Modifiers to maximum Mana apply to this amount.",
              grants: { poolFromLife: 0.1 },
            },
            {
              id: 'aet_shell',
              name: 'The Outer Shell',
              description: "Mana absorbs 100% of Ailment damage before Life, while you have enough Mana to pay for it.",
              grants: { wardWhole: true },
            },
          ],
        },
      ],
    },
    {
      id: 'overflow',
      theme: 'Overflow',
      minors: [
        { text: '+7% increased Damage', stats: [stat('damage', 'inc', 7)] },
      ],
      gate: {
        id: 'aet_overcharge',
        name: 'Overcharge',
        description: "After paying the skill's Mana cost, spend 10% of maximum Mana to add the same amount of Cold damage to its hits. Requires enough Mana for the full extra cost.",
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
          notables: [
            {
              id: 'aet_kindling',
              name: 'Kindling',
              description: "Overcharge spends an additional 5% of maximum Mana per use and adds the amount spent as Cold damage.",
              grants: { overcharge: 0.05 },
            },
            {
              id: 'aet_cataclysm',
              name: 'Cataclysm',
              description: "Overcharge spends an additional 8% of maximum Mana per use and adds the amount spent as Cold damage.",
              grants: { overcharge: 0.08 },
            },
          ],
        },
        {
          id: 'rime',
          theme: 'Rime',
          minors: [
            { text: '+12% chance to apply Chill', stats: [stat('ailmentChance', 'flat', 12, ['chill'])] },
            { text: '+16% increased Cold Damage', stats: [stat('damage', 'inc', 16, ['cold'])] },
          ],
          notables: [
            {
              id: 'aet_hoar',
              name: 'Hoar',
              description: 'Ailments you apply deal 20% more damage.',
              grants: { ailmentMultiplier: 1.2 },
            },
            {
              id: 'aet_rime',
              name: 'Rimebound',
              description: '+45% chance to apply your Ailment.',
              grants: { ailmentChance: 45 },
            },
          ],
        },
      ],
    },
    {
      id: 'siphoning',
      theme: 'Siphoning',
      minors: [
        { text: '+15% increased Mana Regeneration', stats: [stat('manaRegen', 'inc', 15)] },
      ],
      gate: {
        id: 'aet_siphon',
        name: 'Siphon',
        description: "Recover Mana equal to an additional 4% of damage dealt by hits.",
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
          notables: [
            {
              id: 'aet_firstdraw',
              name: 'The First Draw',
              description: "Recover Mana equal to an additional 2.5% of damage dealt by hits.",
              grants: { manaLeech: 0.025 },
            },
            {
              id: 'aet_deep_draw',
              name: 'Deep Draw',
              description: "Recover Mana equal to an additional 5% of damage dealt by hits.",
              grants: { manaLeech: 0.05 },
            },
          ],
        },
        {
          id: 'wellspring',
          theme: 'Wellspring',
          minors: [
            { text: '+22% increased Mana Regeneration', stats: [stat('manaRegen', 'inc', 22)] },
            { text: '+9% increased Mana', stats: [stat('mana', 'inc', 9)] },
          ],
          notables: [
            {
              id: 'aet_trickle',
              name: 'Trickle',
              description: "Kills restore an additional 2% of maximum Mana.",
              grants: { manaOnKill: 0.02 },
            },
            {
              id: 'aet_wellspring',
              name: 'Wellspring',
              description: "Kills restore an additional 4% of maximum Mana.",
              grants: { manaOnKill: 0.04 },
            },
          ],
        },
      ],
    },
    {
      id: 'drought',
      theme: 'Drought',
      minors: [
        { text: '+4% reduced Mana Cost', stats: [stat('manaCost', 'inc', -4)] },
      ],
      gate: {
        id: 'aet_dry_season',
        name: 'Dry Season',
        description: "Deal 30% more damage while Starved, up to your normal damage.",
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
          notables: [
            {
              id: 'aet_rationed',
              name: 'Rationed',
              description: "Deal 12% more damage while Starved, up to your normal damage. Multiplies with Dry Season.",
              grants: { starvedDamage: 1.12 },
            },
            {
              id: 'aet_last_drop',
              name: 'The Last Drop',
              description: "Deal 25% more damage while Starved, up to your normal damage. Multiplies with other Starved damage bonuses.",
              grants: { starvedDamage: 1.25 },
            },
          ],
        },
        {
          id: 'thrift',
          theme: 'Thrift',
          minors: [
            { text: '+7% reduced Mana Cost', stats: [stat('manaCost', 'inc', -7)] },
            { text: '+10% increased Mana', stats: [stat('mana', 'inc', 10)] },
          ],
          notables: [
            {
              id: 'aet_sparing',
              name: 'Sparing',
              description: "Recover Mana equal to an additional 2% of damage dealt by hits.",
              grants: { manaLeech: 0.02 },
            },
            {
              id: 'aet_thrift',
              name: 'Never Dry',
              description:
                "When Mana cannot cover a skill's cost, spend all remaining Mana and pay 2 Life per missing Mana. The skill is not Starved. This can kill you.",
              grants: { payWithLife: 2 },
            },
          ],
        },
      ],
    },
    {
      id: 'vessel',
      theme: 'Vessel',
      minors: [
        { text: '+7% increased Life', stats: [stat('life', 'inc', 7)] },
      ],
      gate: {
        id: 'aet_vessel',
        name: 'The Vessel',
        description: "Adds 15% of maximum Life to base Mana. Modifiers to maximum Mana apply to this amount.",
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
          notables: [
            {
              id: 'aet_deepening',
              name: 'Deepening',
              description: "Adds 10% of maximum Life to base Mana. Modifiers to maximum Mana apply to this amount.",
              grants: { poolFromLife: 0.1 },
            },
            {
              id: 'aet_confluence',
              name: 'Confluence',
              description: "Adds 20% of maximum Life to base Mana. Modifiers to maximum Mana apply to this amount.",
              grants: { poolFromLife: 0.2 },
            },
          ],
        },
        {
          id: 'widening',
          theme: 'Widening',
          minors: [
            { text: '+13% increased Mana', stats: [stat('mana', 'inc', 13)] },
            { text: '+15% increased Mana', stats: [stat('mana', 'inc', 15)] },
          ],
          notables: [
            {
              id: 'aet_boredout',
              name: 'Bored Out',
              description: "Overcharge adds 25% more Cold damage per Mana spent.",
              grants: { overchargeYield: 1.25 },
            },
            {
              id: 'aet_widening',
              name: 'The Wider Bore',
              description: "Overcharge adds 60% more Cold damage per Mana spent. Multiplies with Bored Out.",
              grants: { overchargeYield: 1.6 },
            },
          ],
        },
      ],
    },
  ],
};
