/**
 * Creeping Blight's web. The skill deals no hit at all, so everything here is
 * about the cloud: how wide it is, how long it lasts, how many there are, and
 * whether a critical tick plants another one.
 *
 * Area of Effect sits on the TRUNK rather than behind a branch, which is the
 * opposite of Fireball — a bigger circle is what Blight does bare, so it helps
 * whatever you go on to build. Rupture is where the exception lives: it turns
 * the cast into a hit, and a hit is the one thing armour can blunt.
 */
import { stat } from './node';
import type { Branch, Minor, Notable, TreeSpec } from './spec';

const COMMON: Minor[] = [
  { text: '+5% increased Poison Damage', stats: [stat('damage', 'inc', 5, ['poison'])] },
  { text: '+4% increased Damage', stats: [stat('damage', 'inc', 4)] },
  { text: '+3% increased Cast Speed', stats: [stat('castSpeed', 'inc', 3)] },
  { text: '+1% Critical Chance', stats: [stat('critChance', 'flat', 1)] },
  { text: '+8% Critical Damage', stats: [stat('critMultiplier', 'flat', 8)] },
  { text: '+4% increased Area of Effect', stats: [stat('areaOfEffect', 'inc', 4)] },
];

const BRANCHES: Branch[] = [
  {
    id: 'contagion',
    theme: 'Bloom',
    enabler: {
      id: 'bl_contagion',
      name: 'Contagion',
      description:
        'A Poison ticking Critically plants a fresh Cloud, 1.6 tiles across, ' +
        'around whatever it ticked on.',
      grants: { contagionRadius: 1.6, manaMultiplier: 1.15 },
      // A hit plants no second Cloud: the Bloom line is Area under the burst.
      under: { bl_spore: { description: '+15% increased Area of Effect.', stats: [stat('areaOfEffect', 'inc', 15)], grants: { manaMultiplier: 1.15 } } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bl_epidemic',
          name: 'Epidemic',
          description: 'A Cloud planted by a Critical tick is 0.9 tiles wider.',
          grants: { contagionRadius: 0.9, manaMultiplier: 1.08 },
          under: { bl_spore: { description: '+10% increased Area of Effect.', stats: [stat('areaOfEffect', 'inc', 10)], grants: { manaMultiplier: 1.08 } } },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bl_pandemic',
          name: 'Pandemic',
          description: 'A Cloud a Critical tick plants is +1.2 tiles wider.',
          grants: { contagionRadius: 1.2, manaMultiplier: 1.08 },
          under: { bl_spore: { description: '+12% increased Area of Effect.', stats: [stat('areaOfEffect', 'inc', 12)], grants: { manaMultiplier: 1.08 } } },
        },
      },
      {
        minors: 3,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bl_plaguebearer',
          name: 'Plaguebearer',
          description:
            'Ticks Critically strike +7% more often, and the Clouds they plant ' +
            'are 0.8 tiles wider.',
          stats: [stat('critChance', 'flat', 7)],
          grants: { contagionRadius: 0.8, manaMultiplier: 1.08 },
          under: { bl_spore: { description: '+10% increased Area of Effect.', stats: [stat('areaOfEffect', 'inc', 10)], grants: { manaMultiplier: 1.08 } } },
        },
      },
    ],
    minors: [COMMON[3], COMMON[4], COMMON[0], COMMON[3]],
  },
  {
    /**
     * THE PLAGUE OUTLIVES WHAT IT KILLED. Contagion spreads the Cloud from a
     * body while it is still up; this passes what a body was CARRYING on as it
     * falls, so a floor Blight has already worked keeps infecting itself with
     * no cast at all. It is worth nothing on a floor that dies to one hit and
     * everything on one that does not, which is the trade the whole skill is.
     */
    id: 'harvest',
    theme: 'Harvest',
    enabler: {
      id: 'bl_fixation',
      name: 'Harvest',
      description:
        "When an enemy with Ailments dies, it applies 1 stack of each Ailment it had to the 2 nearest " +
      "enemies within 3 tiles.",
      grants: { ailmentSpread: { radius: 3, stacks: 1, targets: 2 }, manaMultiplier: 1.15 },
      // Nothing to pass on when nothing is Poisoned: a kill Bursts instead.
      under: { bl_spore: { description: 'A body killed by Spore Burst triggers a Burst with a 1.5-tile radius, for 30% of the damage.', grants: { explodeOnKill: { radius: 1.5, multiplier: 0.3 }, manaMultiplier: 1.15 } } },
    },
    twigs: [
      {
        minors: 4,
        notable: {
          id: 'bl_saturation',
          name: 'Seeding',
          description: "Ailments spread on death apply 1 additional stack of each Ailment and affect 1 more enemy.",
          grants: { ailmentSpread: { radius: 0, stacks: 1, targets: 1 } },
          under: { bl_spore: { description: 'The Burst off a killed enemy deals a further 15% of the damage.', grants: { explodeOnKill: { radius: 0, multiplier: 0.15 } } } },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bl_deepening',
          name: 'Windborne',
          description: "Ailments spread on death reach 2.5 tiles farther and affect 1 more enemy.",
          grants: { ailmentSpread: { radius: 2.5, stacks: 0, targets: 1 } },
          under: { bl_spore: { description: 'The Burst off a killed enemy reaches 0.6 tiles further.', grants: { explodeOnKill: { radius: 0.6, multiplier: 0 } } } },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bl_takehold',
          name: 'Taking Hold',
          description: "Ailments spread on death reach 1.5 tiles farther, apply 1 additional stack of each Ailment and " +
          "affect 2 more enemies.",
          grants: {
            ailmentSpread: { radius: 1.5, stacks: 1, targets: 2 },
            manaMultiplier: 1.15,
          },
          under: { bl_spore: { description: 'The Burst off a killed enemy reaches 0.4 tiles further and deals a further 20% of the damage.', grants: { explodeOnKill: { radius: 0.4, multiplier: 0.2 }, manaMultiplier: 1.15 } } },
        },
      },
    ],
    minors: [COMMON[0], COMMON[3], COMMON[1], COMMON[2]],
  },
  {
    id: 'miasma',
    theme: 'Miasma',
    enabler: {
      id: 'bl_miasma',
      name: 'Miasma',
      description: 'Blight drops +1 Cloud, on another enemy near the target.',
      grants: { extraFields: 1, manaMultiplier: 1.15 },
    },
    twigs: [
      {
        minors: 4,
        notable: {
          id: 'bl_choking',
          name: 'Choking Haze',
          description: '+1 Cloud.',
          grants: { extraFields: 1, manaMultiplier: 1.15 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bl_smother',
          name: 'Smother',
          description: '+2 Clouds.',
          grants: { extraFields: 2, manaMultiplier: 1.15 },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bl_shroud',
          name: 'Shroud',
          description: "+2 Clouds. Clouds have 15% more radius.",
          grants: { extraFields: 2, fieldRadius: 1.15, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [COMMON[2], COMMON[1], COMMON[0], COMMON[2]],
  },
  {
    id: 'virulence',
    theme: 'Virulence',
    enabler: {
      id: 'bl_virulence',
      name: 'Virulence',
      description: 'The Poison deals 50% more damage and has 35% less duration.',
      grants: { ailmentMultiplier: 1.5, ailmentDuration: 0.65 },
      // A hit has no duration: the Poison's worth is the hit's, and nothing else.
      under: { bl_spore: { description: 'Spore Burst deals 50% more damage.', grants: { ailmentMultiplier: 1.5 } } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bl_septic',
          name: 'Septic',
          description: 'The Poison deals 30% more damage.',
          grants: { ailmentMultiplier: 1.3 },
          under: { bl_spore: { description: 'Spore Burst deals 30% more damage.', grants: { ailmentMultiplier: 1.3 } } },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bl_lingering',
          name: 'Lingering Rot',
          description: 'The Poison has 70% more duration.',
          grants: { ailmentDuration: 1.7 },
          under: { bl_spore: { description: 'Spore Burst deals 20% more damage.', grants: { ailmentMultiplier: 1.2 } } },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          /**
           * SPORE BURST, the keystone at the tip of the Virulence line: the
           * circle is one hit, so armour blunts it, a Critical is a Critical,
           * and a kill can Burst off it. What it costs is everything that only
           * a Poison could do — the spread, the duration, the tick.
           */
          id: 'bl_spore',
          name: 'Spore Burst',
          keystone: true,
          description:
            'The Cloud Poisons nothing. It hits everything it covers once, for 40% of what ' +
            'the Poison would have dealt over its whole run.',
          becomes:
            'A burst of spores on the enemy: everything within the circle takes one hit, 40% of ' +
            'what the Poison would have dealt over 5s, and nothing is Poisoned. A kill can Burst off it.',
          grants: { spore: { share: 0.4 }, manaMultiplier: 1.15 },
        },
      },
    ],
    minors: [
      { text: "+6% more Poison Damage", grants: { ailmentMultiplier: 1.06 } },
      { text: "+4% more Poison Duration", grants: { ailmentDuration: 1.04 }, under: { bl_spore: { description: '+3% more damage', grants: { ailmentMultiplier: 1.03 } } } },
      COMMON[1],
      COMMON[0],
    ],
  },
  {
    id: 'canopy',
    theme: 'Canopy',
    enabler: {
      id: 'bl_canopy',
      name: 'Canopy',
      description: "Clouds have 55% more radius. Blight's Poison deals 12% less damage.",
      grants: { fieldRadius: 1.55, ailmentMultiplier: 0.88, manaMultiplier: 1.08 },
      under: { bl_spore: { description: 'Spore Burst has 55% more radius and deals 12% less damage.', grants: { fieldRadius: 1.55, ailmentMultiplier: 0.88, manaMultiplier: 1.08 } } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bl_overgrowth',
          name: 'Overgrowth',
          description: "Clouds have 30% more radius.",
          grants: { fieldRadius: 1.3, manaMultiplier: 1.08 },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bl_thicket',
          name: 'Thicket',
          description: 'Blight has 25% increased Area of Effect.',
          stats: [stat('areaOfEffect', 'inc', 25)],
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          /**
           * WANDERING ROT, the keystone at the tip of the Canopy line: the
           * Cloud is a thing on the floor that follows the pack, so what a
           * cast is worth is how long bodies stay under it.
           */
          id: 'bl_wander',
          name: 'Wandering Rot',
          keystone: true,
          description:
            'The Cloud drifts after the nearest enemy at 1.6 tiles a second for 4s, Poisoning ' +
            'what it covers every 0.5s for 25% of the cast.',
          becomes:
            'You lay a cloud that drifts after the nearest enemy at 1.6 tiles a second for 4s, ' +
            'Poisoning everything it covers every 0.5s for 25% of the cast. The cast itself Poisons nothing.',
          grants: { wander: { seconds: 4, speed: 1.6, every: 0.5, share: 0.25 }, manaMultiplier: 1.2 },
        },
      },
    ],
    minors: [COMMON[5], COMMON[0], COMMON[5], COMMON[1]],
  },
  {
    id: 'spite',
    theme: 'Spite',
    enabler: {
      id: 'bl_spite',
      name: 'Spite',
      description: 'For 4s after a kill, Blight deals 30% more damage.',
      grants: { killMore: { seconds: 4, more: 0.3 } },
    },
    twigs: [
      {
        minors: 3,
        notable: {
          id: 'bl_wither',
          name: 'Wither',
          description: "Blight deals 40% more damage to enemies at 33% of maximum Life or less.",
          grants: { moreVsLow: { below: 0.33, more: 0.4 } },
        },
      },
      {
        minors: 4,
        notable: {
          id: 'bl_dread',
          name: 'Dread',
          description: "Blight deals 35% more damage to enemies at 80% of maximum Life or more.",
          grants: { moreVsFull: { above: 0.8, more: 0.35 } },
        },
      },
      {
        minors: 4,
        forkFrom: { twig: 1, at: 2 },
        notable: {
          id: 'bl_surge',
          name: 'Surge',
          description: 'Every 4th cast of Blight deals 250% damage.',
          grants: { everyNth: { n: 4, multiplier: 2.5 } },
        },
      },
    ],
    minors: [COMMON[3], COMMON[4], COMMON[1], COMMON[3]],
  },
];

const TRUNK_NOTABLES: Notable[] = [
  {
    id: 'bl_slowrot',
    name: 'Slow Rot',
    description: 'The Poison Blight applies lasts 30% longer.',
    grants: { ailmentDuration: 1.3 },
    under: { bl_spore: { description: 'Spore Burst deals 10% more damage.', grants: { ailmentMultiplier: 1.1 } } }, // a hit has no duration
  },
  {
    id: 'bl_transmutation',
    name: 'Transmutation',
    description: 'Convert Blight to another damage type.',
    choices: [
      {
        id: 'dark',
        name: 'Gloomrot',
        description: 'Blight deals Dark damage.',
        grants: { convertTree: 'dark' },
      },
      {
        id: 'fire',
        name: 'Blightfire',
        description: 'Blight deals Fire damage.',
        grants: { convertTree: 'fire' },
      },
    ],
  },
  {
    id: 'bl_reserves',
    name: 'Deep Rot',
    description: "Blight deals 45% more damage and has 20% reduced Cast Speed.",
    stats: [stat('damage', 'more', 45), stat('castSpeed', 'inc', -20)],
  },
  {
    id: 'bl_sprawl',
    name: 'Sprawl',
    description: 'Blight has 22% increased Area of Effect.',
    stats: [stat('areaOfEffect', 'inc', 22)],
  },
  {
    id: 'bl_focus',
    name: 'Malign Focus',
    description: 'Blight has +10% Critical Chance and +45% Critical Damage.',
    stats: [stat('critChance', 'flat', 10), stat('critMultiplier', 'flat', 45)],
  },
  {
    id: 'bl_quickening',
    name: 'Quickening',
    description: "Blight has 25% increased Cast Speed.",
    stats: [stat('castSpeed', 'inc', 25)],
  },
];

export const BLIGHT_SPEC: TreeSpec = {
  skillId: 'blight',
  prefix: 'bl',
  minorName: 'Spore',
  common: COMMON,
  branches: BRANCHES,
  trunkNotables: TRUNK_NOTABLES,
  needs: {
    ailmentSpread: 'bl_fixation',
    contagionRadius: 'bl_contagion',
    extraFields: 'bl_miasma',
  },
};
