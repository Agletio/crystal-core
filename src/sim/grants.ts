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
export const STATS = 'stats';

/** What two nodes granting the same thing come to. `replace` is the default. */
export type Merge = 'sum' | 'product' | 'max' | 'append' | 'replace';

export interface GrantDef {
  id: string;
  what: string;
  reads: string[];
  merge?: Merge;
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
  { id: 'convertTree', what: 'the skill deals another damage type', reads: [STATS] },
  { id: 'addTags', what: 'the skill gains a tag, so more modifiers reach it', reads: [STATS], merge: 'append' },

  { id: 'everyNth', what: 'every nth cast is worth more', reads: SHARED },
  { id: 'moreVsAiling', what: 'more damage to enemies already suffering', reads: SHARED },
  {
    id: 'moreClose',
    what: 'more damage to enemies near you',
    reads: SHARED,
    say: (v) => {
      const p = pair(v, 'within', 'more');
      return p && `${pct(p[1])} more damage to enemies within ${p[0]} tiles`;
    },
  },
  {
    id: 'moreFar',
    what: 'more damage to enemies far from you',
    reads: SHARED,
    say: (v) => {
      const p = pair(v, 'beyond', 'more');
      return p && `${pct(p[1])} more damage to enemies over ${p[0]} tiles away`;
    },
  },
  {
    id: 'moreVsLow',
    what: 'more damage to enemies low on life',
    reads: SHARED,
    say: (v) => {
      const p = pair(v, 'below', 'more');
      return p && `${pct(p[1])} more damage to enemies below ${pct(p[0])} of their life`;
    },
  },
  {
    id: 'moreVsFull',
    what: 'more damage to enemies near full life',
    reads: SHARED,
    say: (v) => {
      const p = pair(v, 'above', 'more');
      return p && `${pct(p[1])} more damage to enemies above ${pct(p[0])} of their life`;
    },
  },

  { id: 'critAilment', what: 'a crit leaves an ailment instead', reads: HITTERS },
  {
    id: 'ailmentMultiplier',
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
    what: 'ailments you apply last longer',
    reads: SHARED,
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Ailments you apply last ${more(n)} longer`;
    },
  },
  { id: 'ailmentSpread', what: 'a critical tick spreads the ailment', reads: HITTERS },

  {
    id: 'explode',
    what: 'the hit bursts where it lands',
    reads: SHARED,
    say: (v) => {
      const p = pair(v, 'radius', 'multiplier');
      return p && `The hit bursts ${p[0]} tiles across, for ${pct(p[1])} of the damage`;
    },
  },
  {
    id: 'explodeRadius',
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
    what: 'a killed enemy bursts',
    reads: HITTERS,
    say: (v) => {
      const p = pair(v, 'radius', 'multiplier');
      return p && `A killed enemy bursts ${p[0]} tiles across, for ${pct(p[1])} of the damage`;
    },
  },

  {
    id: 'extraTargets',
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
    what: 'those extra targets take full damage',
    reads: ['projectile'],
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Those extra targets take ${pct(n)} of the damage`;
    },
  },
  {
    id: 'pierce',
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
    what: 'pierced enemies take full damage',
    reads: ['projectile'],
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Pierced enemies take ${pct(n)} of the damage`;
    },
  },
  { id: 'chains', what: 'the shot leaps to another enemy', reads: ['projectile'], merge: 'sum' },
  { id: 'chainDamage', what: 'leaps deal full damage', reads: ['projectile'] },

  { id: 'splashMultiplier', what: 'what the swing deals to everything else', reads: ['cleave'], merge: 'max' },
  { id: 'splashRadius', what: 'how far the swing reaches', reads: ['cleave'], merge: 'product' },
  { id: 'doubleStrike', what: 'extra swings at the target', reads: ['cleave'], merge: 'sum' },

  { id: 'fieldRadius', what: 'the cloud covers more ground', reads: ['ailment_burst'], merge: 'product' },
  {
    id: 'extraFields',
    what: 'more clouds, on other enemies',
    reads: ['ailment_burst'],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `+${n} more cloud${n === 1 ? '' : 's'}, on other enemies`;
    },
  },
  { id: 'contagionRadius', what: 'a critical tick plants a fresh cloud', reads: ['ailment_burst'], merge: 'sum' },
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
