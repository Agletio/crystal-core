/**
 * Every switch a skill tree may hand the sim, declared once.
 *
 * `grants` is a bag of strings, so a typo is a node that silently does nothing
 * forever. The demo holds every tree to this table: an undeclared grant fails,
 * and so does one the tree's own behaviour would never read.
 *
 * `reads` names behaviours in SKILL_BEHAVIOURS; STATS is the stat layer, which
 * runs for every skill whatever its delivery is.
 */
import { MANA } from '../data';

export const STATS = 'stats';

/** What two nodes granting the same thing come to. `replace` is the default. */
export type Merge = 'sum' | 'product' | 'max' | 'append' | 'replace';

/**
 * What MECHANISM a grant touches. Two grants can only interact if they touch
 * the same one, or if one changes what the other is made of — so the audit of
 * "what does taking both come to" is over CLASSES rather than over nodes. At
 * node level it is 742 pairs across three trees and nobody reads that; at class
 * level it is 28 rows and a new node cannot add a pair without adding a class.
 */
export type Changes = 'scale' | 'duration' | 'targets' | 'burst' | 'field' | 'crit' | 'type';

export interface GrantDef {
  id: string;
  what: string;
  reads: string[];
  merge?: Merge;
  /** Absent for a switch that changes no delivery — see INTERACTIONS. */
  changes?: Changes;
  /**
   * The same switch with a VALUE in it, for anything handing a player one
   * specific amount of it — a unique's card. Null when the value is not a
   * shape this switch can read, which is how the demo catches a bag the sim
   * would have ignored in silence. `what` stays the generic description.
   */
  say?: (value: unknown) => string | null;
}

/** 0.35 → "35%". Grants carry fractions; nothing player-facing may. */
const pct = (n: number): string => `${Math.round(n * 100)}%`;

/** A multiplier as the change it makes: 1.6 → "60%". */
const more = (n: number): string => pct(n - 1);

const asNumber = (v: unknown): number | null => (typeof v === 'number' ? v : null);

const pair = (v: unknown, a: string, b: string): [number, number] | null => {
  const o = v as Record<string, unknown> | null;
  if (!o || typeof o[a] !== 'number' || typeof o[b] !== 'number') return null;
  return [o[a] as number, o[b] as number];
};

const SHARED = ['projectile', 'cleave', 'ailment_burst'];
const HITTERS = ['projectile', 'cleave'];

export const GRANTS: GrantDef[] = [
  { id: 'convertTree', what: 'the skill deals another damage type', reads: [STATS], changes: 'type' },
  { id: 'addTags', what: 'the skill gains a tag, so more modifiers reach it', reads: [STATS], merge: 'append' },
  {
    id: 'manaMultiplier',
    what: 'the skill costs more mana',
    reads: [STATS],
    // The one thing every delivery node also hands over, so a build that
    // changes what its skill DOES four times pays four times over.
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `${more(n)} more mana per use`;
    },
  },

  {
    id: 'starvedDamage',
    what: 'casting while out of mana costs you less damage',
    // Every skill, whatever its delivery: being unable to pay is not a thing
    // one behaviour does. It MULTIPLIES `MANA.starvedDamage` rather than
    // replacing it, so a trade that makes running dry worse and one that
    // softens it both cost a table entry instead of a rewrite.
    reads: [STATS],
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `${more(n)} more damage while out of mana`;
    },
  },

  {
    id: 'critIntoBuff',
    what: 'critical hits buff you instead of hitting harder',
    // The passive's whole TRADE, as ONE switch: half-applying it would be a
    // character that gave up crit damage and got nothing for it.
    reads: [STATS],
    say: (v) => {
      const p = pair(v, 'more', 'seconds');
      return p && `Critical hits deal no extra damage; landing one grants ${p[0]}% more damage for ${p[1]}s`;
    },
  },

  // --- what a TRADE hands over ---------------------------------------------
  //
  // Every one of these reads STATS, which is the layer that runs whatever the
  // skill's delivery is: a trade belongs to the character, so a switch that
  // only worked for one behaviour would be a trade you had to pick a skill for.
  {
    id: 'potionMore',
    what: 'you deal more damage while a flask is running',
    reads: [STATS],
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `${more(n)} more damage while a flask is running`;
    },
  },
  {
    id: 'potionHaste',
    what: 'you attack and cast faster while a flask is running',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `${n}% increased attack and cast speed while a flask is running`;
    },
  },
  {
    id: 'potionCrit',
    what: 'you critically strike more often while a flask is running',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `+${n}% critical chance while a flask is running`;
    },
  },
  {
    id: 'potionDuration',
    what: 'a flask runs for longer',
    reads: [STATS],
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Flasks run ${more(n)} longer`;
    },
  },
  {
    id: 'potionPotency',
    what: 'a flask pours harder',
    reads: [STATS],
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Flasks restore ${more(n)} more per second`;
    },
  },
  {
    id: 'chargeRegen',
    what: 'flask charges come back during a descent',
    // The Alchemist's whole rule: charges stop being a descent's budget and
    // become a cooldown. Summed, so two nodes shorten the wait together.
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null || n <= 0
        ? null
        : `Each flask regains a charge every ${(1 / n).toFixed(1)}s`;
    },
  },

  {
    id: 'manaShield',
    what: 'damage taken comes off mana before life',
    // Ailments included: they are already the thing armour cannot stop, so the
    // pool eating them is the whole reason this is worth a trade.
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `${pct(n)} of damage taken, ailments included, is paid out of mana first`;
    },
  },
  {
    id: 'overcharge',
    what: 'a cast may spend a share of your maximum mana for more damage',
    reads: [STATS],
    say: (v) => {
      const p = pair(v, 'share', 'more');
      return p && `Each use spends a further ${pct(p[0])} of your maximum mana and deals ${pct(p[1])} more damage`;
    },
  },
  {
    id: 'overchargeMore',
    what: 'an overcharged cast deals more still',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `An overcharged use deals a further ${pct(n)} more damage`;
    },
  },
  {
    id: 'manaLeech',
    what: 'damage you deal comes back as mana',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `${pct(n)} of the damage you deal returns as mana`;
    },
  },
  {
    id: 'poolFromLife',
    what: 'part of your life counts toward your mana pool',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `${pct(n)} of your maximum life is added to your mana pool`;
    },
  },

  { id: 'everyNth', what: 'every nth cast is worth more', reads: SHARED, changes: 'scale' },
  { id: 'moreVsAiling', what: 'more damage to enemies already suffering', reads: SHARED, changes: 'scale' },
  {
    id: 'moreClose',
    changes: 'scale',
    what: 'more damage to enemies near you',
    reads: SHARED,
    say: (v) => {
      const p = pair(v, 'within', 'more');
      return p && `${pct(p[1])} more damage to enemies within ${p[0]} tiles`;
    },
  },
  {
    id: 'moreFar',
    changes: 'scale',
    what: 'more damage to enemies far from you',
    reads: SHARED,
    say: (v) => {
      const p = pair(v, 'beyond', 'more');
      return p && `${pct(p[1])} more damage to enemies over ${p[0]} tiles away`;
    },
  },
  {
    id: 'moreVsLow',
    changes: 'scale',
    what: 'more damage to enemies low on life',
    reads: SHARED,
    say: (v) => {
      const p = pair(v, 'below', 'more');
      return p && `${pct(p[1])} more damage to enemies below ${pct(p[0])} of their life`;
    },
  },
  {
    id: 'moreVsFull',
    changes: 'scale',
    what: 'more damage to enemies near full life',
    reads: SHARED,
    say: (v) => {
      const p = pair(v, 'above', 'more');
      return p && `${pct(p[1])} more damage to enemies above ${pct(p[0])} of their life`;
    },
  },

  { id: 'critAilment', what: 'a crit leaves an ailment instead', reads: HITTERS, changes: 'crit' },
  {
    id: 'ailmentMultiplier',
    changes: 'scale',
    what: 'ailments you apply deal more',
    reads: SHARED,
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Ailments you apply deal ${more(n)} more damage`;
    },
  },
  {
    id: 'ailmentDuration',
    changes: 'duration',
    what: 'ailments you apply last longer',
    reads: SHARED,
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Ailments you apply last ${more(n)} longer`;
    },
  },
  { id: 'ailmentSpread', what: 'a critical tick spreads the ailment', reads: HITTERS, changes: 'crit' },

  {
    id: 'explode',
    changes: 'burst',
    what: 'the hit bursts where it lands',
    reads: SHARED,
    say: (v) => {
      const p = pair(v, 'radius', 'multiplier');
      return p && `The hit bursts ${p[0]} tiles across, for ${pct(p[1])} of the damage`;
    },
  },
  {
    id: 'explodeRadius',
    changes: 'burst',
    what: 'the burst covers more ground',
    reads: SHARED,
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `The burst covers ${more(n)} more ground`;
    },
  },
  {
    id: 'explodeMultiplierAdd',
    changes: 'burst',
    what: 'the burst hits harder',
    reads: SHARED,
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `The burst carries +${pct(n)} of the damage`;
    },
  },
  {
    id: 'explodeOnKill',
    changes: 'burst',
    what: 'a killed enemy bursts',
    reads: HITTERS,
    say: (v) => {
      const p = pair(v, 'radius', 'multiplier');
      return p && `A killed enemy bursts ${p[0]} tiles across, for ${pct(p[1])} of the damage`;
    },
  },

  {
    id: 'extraTargets',
    changes: 'targets',
    what: 'more enemies near the target are hit',
    reads: ['projectile', 'single_target'],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `+${n} more enem${n === 1 ? 'y' : 'ies'} near the target is hit`;
    },
  },
  {
    id: 'extraTargetDamage',
    changes: 'targets',
    what: 'those extra targets take full damage',
    reads: ['projectile'],
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Those extra targets take ${pct(n)} of the damage`;
    },
  },
  {
    id: 'pierce',
    changes: 'targets',
    what: 'the shot carries on through an enemy',
    reads: ['projectile'],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `The shot carries on through +${n} enem${n === 1 ? 'y' : 'ies'}`;
    },
  },
  {
    id: 'pierceDamage',
    changes: 'targets',
    what: 'pierced enemies take full damage',
    reads: ['projectile'],
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Pierced enemies take ${pct(n)} of the damage`;
    },
  },
  { id: 'chains', what: 'the shot leaps to another enemy', reads: ['projectile'], merge: 'sum', changes: 'targets' },
  { id: 'chainDamage', what: 'leaps deal full damage', reads: ['projectile'], changes: 'targets' },

  { id: 'splashMultiplier', what: 'what the swing deals to everything else', reads: ['cleave'], merge: 'max', changes: 'targets' },
  { id: 'splashRadius', what: 'how far the swing reaches', reads: ['cleave'], merge: 'product', changes: 'targets' },
  { id: 'doubleStrike', what: 'extra swings at the target', reads: ['cleave'], merge: 'sum', changes: 'targets' },

  { id: 'fieldRadius', what: 'the cloud covers more ground', reads: ['ailment_burst'], merge: 'product', changes: 'field' },
  {
    id: 'extraFields',
    changes: 'targets',
    what: 'more clouds, on other enemies',
    reads: ['ailment_burst'],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `+${n} more cloud${n === 1 ? '' : 's'}, on other enemies`;
    },
  },
  { id: 'contagionRadius', what: 'a critical tick plants a fresh cloud', reads: ['ailment_burst'], merge: 'sum', changes: 'field' },
];

export const GRANT_BY_ID: Record<string, GrantDef> = Object.fromEntries(
  GRANTS.map((g) => [g.id, g])
);

/** Fold one node's grants into an accumulator, by each grant's declared rule. */
export function mergeGrants(
  out: Record<string, unknown>,
  from: Record<string, unknown>
): Record<string, unknown> {
  for (const [key, value] of Object.entries(from)) {
    switch (GRANT_BY_ID[key]?.merge) {
      case 'sum':
        out[key] = ((out[key] as number) ?? 0) + (value as number);
        break;
      case 'product':
        out[key] = ((out[key] as number) ?? 1) * (value as number);
        break;
      // An outright override, so the best node wins however you walked to it.
      case 'max':
        out[key] = Math.max((out[key] as number) ?? -Infinity, value as number);
        break;
      case 'append':
        out[key] = [...((out[key] as string[]) ?? []), ...(value as string[])];
        break;
      default:
        out[key] = value;
    }
  }
  return out;
}

/** Whether a skill delivered this way would do anything with the grant. */
export const behaviourReads = (behaviour: string, grant: string): boolean =>
  GRANT_BY_ID[grant]?.reads.includes(behaviour) ?? false;

/** How long the passive's buff lasts and what it is worth, or null. */
export function critBuff(grants: Record<string, unknown>): { more: number; seconds: number } | null {
  const v = grants.critIntoBuff as { more?: unknown; seconds?: unknown } | undefined;
  if (typeof v?.more !== 'number' || typeof v?.seconds !== 'number') return null;
  return { more: v.more, seconds: v.seconds };
}

/**
 * What a cast is worth while STARVED of mana. One function, so the sim, the
 * sheet and the demo cannot disagree about the number — and one seam, so what
 * moves it is a grant rather than an edit at every call site.
 */
export function starvedMultiplier(grants: Record<string, unknown>): number {
  const own = typeof grants.starvedDamage === 'number' ? grants.starvedDamage : 1;
  return Math.max(0, Math.min(1, MANA.starvedDamage * own));
}

/**
 * What an overcharged use costs and what it is worth, or null. The base node
 * declares both halves and every amplifier after it sums into `more`, so the
 * sim, the sheet and the card all read one answer.
 */
export function overchargeOf(
  grants: Record<string, unknown>
): { share: number; more: number } | null {
  const v = grants.overcharge as { share?: unknown; more?: unknown } | undefined;
  if (typeof v?.share !== 'number' || typeof v?.more !== 'number') return null;
  const extra = typeof grants.overchargeMore === 'number' ? grants.overchargeMore : 0;
  return { share: Math.max(0, v.share), more: Math.max(0, v.more + extra) };
}

/** The share of a hit the mana pool pays before life does. Capped: a pool that
 *  ate everything would be a second life bar rather than a trade. */
export const shieldShare = (grants: Record<string, unknown>): number =>
  Math.max(0, Math.min(MANA.shieldCap, (grants.manaShield as number) ?? 0));
