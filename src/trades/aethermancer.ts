/**
 * The Aethermancer. Mana is your second health bar and your damage multiplier
 * at once, and all five spokes pull on the SAME pool.
 *
 * That is the whole trade. The Ward wants the pool full, Overflow empties it
 * for damage, the Siphon refills it out of what that damage did, Drought makes
 * running dry survivable, and the Vessel makes the pool bigger out of the one
 * stat everything grants. A build that spends its pool for damage is a build
 * one bad pack away from having neither, and every keystone past a gate is a
 * RULE about that bargain rather than a bigger number on it.
 */
import { TRADE_BASE } from '../data';
import { stat } from '../trees/node';
import type { TradeSpec } from './spec';

export const AETHERMANCER: TradeSpec = {
  id: 'aethermancer',
  name: 'Aethermancer',
  blurb:
    "Uses Mana to absorb damage before it reaches Life. His talents let him " +
    "spend Mana for damage, recover it through combat or exchange it for Life.",
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
  needs: {
    overchargeSurge: 'aet_overcharge',
    overchargeChills: 'aet_overcharge',
    leechOnTaken: 'aet_siphon',
  },
  // NEVER DRY is never Starved, so the whole Drought spoke would do nothing.
  clashes: [
    {
      a: 'aet_thrift',
      b: 'aet_dry_season',
      why: "Never Dry pays missing Mana costs with Life. Your skills cannot be Starved, so Dry Season has no effect.",
    },
  ],
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
          minors: [{ text: '+12% increased Mana', stats: [stat('mana', 'inc', 12)] }],
          notables: [
            {
              id: 'aet_refraction',
              name: 'Refraction',
              description: "Recover Life equal to 35% of the damage absorbed by Mana.",
              grants: { wardHeals: 0.35 },
              keystone: true,
            },
          ],
        },
        {
          id: 'shellwork',
          theme: 'Shellwork',
          minors: [{ text: '+220 Armour', stats: [stat('armour', 'flat', 220)] }],
          notables: [
            {
              id: 'aet_shell',
              name: 'The Outer Shell',
              description: 'Mana absorbs 100% of Ailment damage before Life, while you have enough Mana to pay for it.',
              grants: { wardWhole: true },
              keystone: true,
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
        description: "After paying a skill's Mana cost, spend an additional 10% of maximum Mana to add that amount as Cold damage to its hits or Blight's Poison. Also increases Exsanguinate's wound damage. Requires enough Mana for the full extra cost.",
        grants: { overcharge: 0.1 },
      },
      branches: [
        {
          id: 'cataclysm',
          theme: 'Cataclysm',
          minors: [{ text: '+14% increased Mana', stats: [stat('mana', 'inc', 14)] }],
          notables: [
            {
              id: 'aet_surge',
              name: 'Cataclysm',
              description: "After paying the skill's Mana cost, Overcharge activates only if at least 70% of maximum Mana remains. It then spends 30% of maximum Mana instead of 10%.",
              grants: { overchargeSurge: { above: 0.7, share: 0.3 } },
              keystone: true,
            },
          ],
        },
        {
          id: 'rime',
          theme: 'Rime',
          minors: [{ text: '+16% increased Cold Damage', stats: [stat('damage', 'inc', 16, ['cold'])] }],
          notables: [
            {
              id: 'aet_deepwinter',
              name: 'Deep Winter',
              description: "Overcharged Cold hits have at least 100% chance to apply Chill.",
              grants: { overchargeChills: true },
              keystone: true,
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
        description: 'Recover Mana equal to an additional 4% of damage dealt by hits.',
        grants: { manaLeech: 0.04 },
      },
      branches: [
        {
          id: 'deepdraw',
          theme: 'Deep Draw',
          minors: [{ text: '+8% increased Damage', stats: [stat('damage', 'inc', 8)] }],
          notables: [
            {
              id: 'aet_bloodletting',
              name: 'Bloodletting',
              description: "Damage to your Life from hits and boss drains also restores Mana at your Mana Leech percentage (4% from Siphon).",
              grants: { leechOnTaken: true },
              keystone: true,
            },
          ],
        },
        {
          id: 'wellspring',
          theme: 'Wellspring',
          minors: [{ text: '+22% increased Mana Regeneration', stats: [stat('manaRegen', 'inc', 22)] }],
          notables: [
            {
              id: 'aet_secondwind',
              name: 'Second Wind',
              description: "When you kill an enemy with less than 25% of maximum Mana remaining, restore Mana to 25% of maximum.",
              grants: { killFloor: 0.25 },
              keystone: true,
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
        description: 'Deal 30% more damage while Starved, up to your normal damage.',
        grants: { starvedDamage: 1.3 },
      },
      branches: [
        {
          id: 'lastdrop',
          theme: 'Last Drop',
          minors: [{ text: '+6% reduced Mana Cost', stats: [stat('manaCost', 'inc', -6)] }],
          notables: [
            {
              id: 'aet_slowburn',
              name: 'Slow Burn',
              description: "Starved skills deal full damage. Starved attacks and casts have 50% less speed.",
              grants: { starvedSlow: 0.5 },
              keystone: true,
            },
          ],
        },
        {
          id: 'thrift',
          theme: 'Thrift',
          minors: [{ text: '+7% reduced Mana Cost', stats: [stat('manaCost', 'inc', -7)] }],
          notables: [
            {
              id: 'aet_dust',
              name: 'Dust',
              description: "After a Starved use, take 30% less damage from hits and boss drains until you fully pay a skill cost. Adds to movement skill damage reduction, up to a combined 80%.",
              grants: { starvedGuard: 0.3 },
              keystone: true,
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
        description: 'Adds 15% of maximum Life to base Mana. Modifiers to maximum Mana apply to this amount.',
        grants: { poolFromLife: 0.15 },
      },
      branches: [
        {
          id: 'confluence',
          theme: 'Confluence',
          minors: [{ text: '+9% increased Life', stats: [stat('life', 'inc', 9)] }],
          notables: [
            {
              id: 'aet_thrift',
              name: 'Never Dry',
              description:
                "When Mana cannot cover a skill's cost, spend all remaining Mana and pay 2 Life per missing Mana. The skill is not Starved. This can kill you.",
              grants: { payWithLife: 2 },
              keystone: true,
            },
          ],
        },
        {
          id: 'widening',
          theme: 'Widening',
          minors: [{ text: '+13% increased Mana', stats: [stat('mana', 'inc', 13)] }],
          notables: [
            {
              id: 'aet_undertow',
              name: 'Undertow',
              description: "While below 35% of maximum Life, spend up to 5% of maximum Mana per second to recover 1 Life per Mana spent. This recovery stops at 35% Life.",
              grants: { lifeFromMana: { below: 0.35, perSecond: 0.05 } },
              keystone: true,
            },
          ],
        },
      ],
    },
  ],
};
