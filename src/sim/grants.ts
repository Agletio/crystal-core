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
}

const SHARED = ['projectile', 'cleave', 'ailment_burst'];
const HITTERS = ['projectile', 'cleave'];

export const GRANTS: GrantDef[] = [
  { id: 'convertTree', what: 'the skill deals another damage type', reads: [STATS] },
  { id: 'addTags', what: 'the skill gains a tag, so more modifiers reach it', reads: [STATS], merge: 'append' },

  { id: 'everyNth', what: 'every nth cast is worth more', reads: SHARED },
  { id: 'moreVsAiling', what: 'more damage to enemies already suffering', reads: SHARED },
  { id: 'moreClose', what: 'more damage to enemies near you', reads: SHARED },
  { id: 'moreFar', what: 'more damage to enemies far from you', reads: SHARED },
  { id: 'moreVsLow', what: 'more damage to enemies low on life', reads: SHARED },
  { id: 'moreVsFull', what: 'more damage to enemies near full life', reads: SHARED },

  { id: 'critAilment', what: 'a crit leaves an ailment instead', reads: HITTERS },
  { id: 'ailmentMultiplier', what: 'ailments you apply deal more', reads: SHARED, merge: 'product' },
  { id: 'ailmentDuration', what: 'ailments you apply last longer', reads: SHARED, merge: 'product' },
  { id: 'ailmentSpread', what: 'a critical tick spreads the ailment', reads: HITTERS },

  { id: 'explode', what: 'the hit bursts where it lands', reads: SHARED },
  { id: 'explodeRadius', what: 'the burst covers more ground', reads: SHARED, merge: 'product' },
  { id: 'explodeMultiplierAdd', what: 'the burst hits harder', reads: SHARED, merge: 'sum' },
  { id: 'explodeOnKill', what: 'a killed enemy bursts', reads: HITTERS },

  { id: 'extraTargets', what: 'more enemies near the target are hit', reads: ['projectile', 'single_target'], merge: 'sum' },
  { id: 'extraTargetDamage', what: 'those extra targets take full damage', reads: ['projectile'] },
  { id: 'pierce', what: 'the shot carries on through an enemy', reads: ['projectile'], merge: 'sum' },
  { id: 'pierceDamage', what: 'pierced enemies take full damage', reads: ['projectile'] },
  { id: 'chains', what: 'the shot leaps to another enemy', reads: ['projectile'], merge: 'sum' },
  { id: 'chainDamage', what: 'leaps deal full damage', reads: ['projectile'] },

  { id: 'splashMultiplier', what: 'what the swing deals to everything else', reads: ['cleave'], merge: 'max' },
  { id: 'splashRadius', what: 'how far the swing reaches', reads: ['cleave'], merge: 'product' },
  { id: 'doubleStrike', what: 'extra swings at the target', reads: ['cleave'], merge: 'sum' },

  { id: 'fieldRadius', what: 'the cloud covers more ground', reads: ['ailment_burst'], merge: 'product' },
  { id: 'extraFields', what: 'more clouds, on other enemies', reads: ['ailment_burst'], merge: 'sum' },
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
