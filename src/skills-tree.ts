/**
 * Skill trees.
 *
 * Two rings around the skill itself. Inner nodes touch the centre; outer
 * nodes hang off an inner one, so reaching the interesting things means
 * paying for the cheap things first. That's what makes the web a tree rather
 * than a menu.
 *
 * A node has two channels:
 *
 *   stats   ordinary stat lines, exactly like a mod's
 *   grants  switches that CHANGE HOW THE SKILL WORKS
 *
 * The second is the point. Trees are meant to be transformative — most of
 * your numbers should come from gear, while the tree decides how you play.
 * "Crits spread the blight" and "Blight deals fire instead of poison" are not
 * expressible as stat lines, so they're grants that the behaviour and the
 * damage resolution read.
 *
 * Same division as currencies: data says WHAT, a registry says HOW. Grants
 * currently understood:
 *
 *   convertTo       damage type replacement; increases to the ORIGINAL type
 *                   still apply, which is what makes conversion a real
 *                   archetype rather than a downgrade
 *   spreadOnCrit    extra ailment targets when the cast crits
 *   extraTargets    additional single-target hits
 *   splashMultiplier  overrides a cleave's splash fraction
 */
import type { StatForm } from './types';

export interface NodeStat {
  stat: string;
  form: StatForm;
  value: number;
  tags?: string[];
}

export interface SkillNodeDef {
  id: string;
  name: string;
  description: string;
  /** 1 touches the centre, 2 hangs off an inner node. */
  ring: 1 | 2;
  /** Where it sits on the web, 0..1 clockwise from the top. */
  angle: number;
  /** Must be allocated first. Null means it connects to the skill itself. */
  requires: string | null;
  stats?: NodeStat[];
  grants?: Record<string, unknown>;
  /** Drawn larger. The archetype pushes, not the filler. */
  major?: boolean;
}

const ring1 = (i: number) => i / 5;
const ring2 = (i: number) => i / 5 + 0.1;

export const SKILL_TREES: Record<string, SkillNodeDef[]> = {
  blight: [
    // --- inner: small, cheap, and each one points somewhere -------------
    {
      id: 'bl_poison',
      name: 'Seeping',
      description: '+20% increased Poison Damage',
      ring: 1,
      angle: ring1(0),
      requires: null,
      stats: [{ stat: 'damage', form: 'inc', value: 20, tags: ['poison'] }],
    },
    {
      /**
       * FLAT crit, not increased.
       *
       * Increases multiply a 5% base, so "+20% increased" is +1% — nowhere
       * near enough to build a crit-triggered archetype on. Gear supplies
       * the multipliers; nodes that define a build supply the base.
       */
      id: 'bl_crit',
      name: 'Weak Points',
      description: '+7% Critical Chance',
      ring: 1,
      angle: ring1(1),
      requires: null,
      stats: [{ stat: 'critChance', form: 'flat', value: 7 }],
    },
    {
      id: 'bl_area',
      name: 'Miasma',
      description: '+15% increased Area of Effect',
      ring: 1,
      angle: ring1(2),
      requires: null,
      stats: [{ stat: 'areaOfEffect', form: 'inc', value: 15 }],
    },
    {
      id: 'bl_cast',
      name: 'Fervour',
      description: '+15% increased Cast Speed',
      ring: 1,
      angle: ring1(3),
      requires: null,
      stats: [{ stat: 'castSpeed', form: 'inc', value: 15 }],
    },
    {
      id: 'bl_hardy',
      name: 'Inured',
      description: '+12% increased Life, +10% Poison Resistance',
      ring: 1,
      angle: ring1(4),
      requires: null,
      stats: [
        { stat: 'life', form: 'inc', value: 12 },
        { stat: 'poisonRes', form: 'flat', value: 10 },
      ],
    },

    // --- outer: two of these change the skill ----------------------------
    {
      id: 'bl_poison2',
      name: 'Virulence',
      description: '+35% increased Poison Damage',
      ring: 2,
      angle: ring2(0),
      requires: 'bl_poison',
      stats: [{ stat: 'damage', form: 'inc', value: 35, tags: ['poison'] }],
    },
    {
      id: 'bl_contagion',
      name: 'Contagion',
      description: 'Critical casts spread the blight to 3 extra enemies. +10% Critical Chance.',
      ring: 2,
      angle: ring2(1),
      requires: 'bl_crit',
      major: true,
      stats: [{ stat: 'critChance', form: 'flat', value: 10 }],
      grants: { spreadOnCrit: 3 },
    },
    {
      id: 'bl_area2',
      name: 'Pall',
      description: '+25% increased Area of Effect',
      ring: 2,
      angle: ring2(2),
      requires: 'bl_area',
      stats: [{ stat: 'areaOfEffect', form: 'inc', value: 25 }],
    },
    {
      id: 'bl_pyre',
      name: 'Pyroclasm',
      description:
        'Blight deals Fire damage instead of Poison. Increases to Poison Damage apply to it.',
      ring: 2,
      angle: ring2(3),
      requires: 'bl_cast',
      major: true,
      grants: { convertTo: 'fire' },
    },
    {
      id: 'bl_savage',
      name: 'Cruel Rot',
      description: '+30% Critical Damage',
      ring: 2,
      angle: ring2(4),
      requires: 'bl_hardy',
      stats: [{ stat: 'critMultiplier', form: 'flat', value: 30 }],
    },
  ],

  strike: [
    {
      id: 'st_phys',
      name: 'Weight',
      description: '+20% increased Physical Damage',
      ring: 1,
      angle: ring1(0),
      requires: null,
      stats: [{ stat: 'damage', form: 'inc', value: 20, tags: ['physical'] }],
    },
    {
      id: 'st_speed',
      name: 'Momentum',
      description: '+15% increased Attack Speed',
      ring: 1,
      angle: ring1(1),
      requires: null,
      stats: [{ stat: 'attackSpeed', form: 'inc', value: 15 }],
    },
    {
      id: 'st_crit',
      name: 'Openings',
      description: '+7% Critical Chance',
      ring: 1,
      angle: ring1(2),
      requires: null,
      stats: [{ stat: 'critChance', form: 'flat', value: 7 }],
    },
    {
      id: 'st_reach',
      name: 'Long Guard',
      description: '+12% increased Attack Range',
      ring: 1,
      angle: ring1(3),
      requires: null,
      stats: [{ stat: 'attackRange', form: 'inc', value: 12 }],
    },
    {
      id: 'st_tough',
      name: 'Braced',
      description: '+15% increased Armour',
      ring: 1,
      angle: ring1(4),
      requires: null,
      stats: [{ stat: 'armour', form: 'inc', value: 15 }],
    },
    {
      id: 'st_phys2',
      name: 'Brutality',
      description: '+35% increased Physical Damage',
      ring: 2,
      angle: ring2(0),
      requires: 'st_phys',
      stats: [{ stat: 'damage', form: 'inc', value: 35, tags: ['physical'] }],
    },
    {
      id: 'st_whirl',
      name: 'Whirlwind',
      description: 'The sweep hits everything in reach for FULL damage instead of 10%.',
      ring: 2,
      angle: ring2(1),
      requires: 'st_speed',
      major: true,
      grants: { splashMultiplier: 1 },
    },
    {
      id: 'st_crit2',
      name: 'Executioner',
      description: '+35% Critical Damage',
      ring: 2,
      angle: ring2(2),
      requires: 'st_crit',
      stats: [{ stat: 'critMultiplier', form: 'flat', value: 35 }],
    },
    {
      id: 'st_ember',
      name: 'Searing Edge',
      description: 'Strike deals Fire damage instead of Physical.',
      ring: 2,
      angle: ring2(3),
      requires: 'st_reach',
      major: true,
      grants: { convertTo: 'fire' },
    },
    {
      id: 'st_life',
      name: 'Constitution',
      description: '+15% increased Life',
      ring: 2,
      angle: ring2(4),
      requires: 'st_tough',
      stats: [{ stat: 'life', form: 'inc', value: 15 }],
    },
  ],

  bolt: [
    {
      id: 'bo_fire',
      name: 'Kindling',
      description: '+20% increased Fire Damage',
      ring: 1,
      angle: ring1(0),
      requires: null,
      stats: [{ stat: 'damage', form: 'inc', value: 20, tags: ['fire'] }],
    },
    {
      id: 'bo_cast',
      name: 'Incantation',
      description: '+15% increased Cast Speed',
      ring: 1,
      angle: ring1(1),
      requires: null,
      stats: [{ stat: 'castSpeed', form: 'inc', value: 15 }],
    },
    {
      id: 'bo_crit',
      name: 'Focus',
      description: '+7% Critical Chance',
      ring: 1,
      angle: ring1(2),
      requires: null,
      stats: [{ stat: 'critChance', form: 'flat', value: 7 }],
    },
    {
      id: 'bo_proj',
      name: 'Trajectory',
      description: '+20% increased Projectile Damage',
      ring: 1,
      angle: ring1(3),
      requires: null,
      stats: [{ stat: 'damage', form: 'inc', value: 20, tags: ['projectile'] }],
    },
    {
      id: 'bo_ward',
      name: 'Mantle',
      description: '+10% Elemental Resistance',
      ring: 1,
      angle: ring1(4),
      requires: null,
      stats: [{ stat: 'elementalRes', form: 'flat', value: 10 }],
    },
    {
      id: 'bo_fire2',
      name: 'Conflagration',
      description: '+35% increased Fire Damage',
      ring: 2,
      angle: ring2(0),
      requires: 'bo_fire',
      stats: [{ stat: 'damage', form: 'inc', value: 35, tags: ['fire'] }],
    },
    {
      id: 'bo_fork',
      name: 'Fork',
      description: 'Fire Bolt strikes 2 additional enemies.',
      ring: 2,
      angle: ring2(1),
      requires: 'bo_cast',
      major: true,
      grants: { extraTargets: 2 },
    },
    {
      id: 'bo_crit2',
      name: 'Killing Intent',
      description: '+35% Critical Damage',
      ring: 2,
      angle: ring2(2),
      requires: 'bo_crit',
      stats: [{ stat: 'critMultiplier', form: 'flat', value: 35 }],
    },
    {
      id: 'bo_frost',
      name: 'Rime',
      description:
        'Fire Bolt deals Cold damage instead. Increases to Fire Damage apply to it.',
      ring: 2,
      angle: ring2(3),
      requires: 'bo_proj',
      major: true,
      grants: { convertTo: 'cold' },
    },
    {
      id: 'bo_life',
      name: 'Vitality',
      description: '+15% increased Life',
      ring: 2,
      angle: ring2(4),
      requires: 'bo_ward',
      stats: [{ stat: 'life', form: 'inc', value: 15 }],
    },
  ],
};

export const treeFor = (skillId: string): SkillNodeDef[] => SKILL_TREES[skillId] ?? [];

export function nodeById(skillId: string, nodeId: string): SkillNodeDef | undefined {
  return treeFor(skillId).find((n) => n.id === nodeId);
}

/** Allocatable only if its parent is taken — the centre counts as taken. */
export function canAllocate(
  skillId: string,
  nodeId: string,
  allocated: readonly string[]
): boolean {
  const node = nodeById(skillId, nodeId);
  if (!node || allocated.includes(nodeId)) return false;
  return node.requires === null || allocated.includes(node.requires);
}

/** Removing a node that others hang off would strand them, so it's refused. */
export function canDeallocate(
  skillId: string,
  nodeId: string,
  allocated: readonly string[]
): boolean {
  if (!allocated.includes(nodeId)) return false;
  return !treeFor(skillId).some(
    (n) => n.requires === nodeId && allocated.includes(n.id)
  );
}
