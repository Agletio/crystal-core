/**
 * Every switch a skill tree may hand the sim, declared once.
 *
 * `grants` is a bag of strings, so a typo is a node that silently does nothing
 * forever. This table is what turns that into a failed check: the demo holds
 * every tree to it, and a grant nobody reads — or one a tree's own behaviour
 * cannot read — fails rather than shipping.
 *
 * `reads` names the behaviours in SKILL_BEHAVIOURS that act on it. STATS is the
 * stat layer instead, which runs for every skill whatever its delivery is.
 */
export const STATS = 'stats';

export interface GrantDef {
  id: string;
  what: string;
  reads: string[];
}

const SHARED = ['projectile', 'cleave', 'ailment_burst'];
const HITTERS = ['projectile', 'cleave'];

export const GRANTS: GrantDef[] = [
  { id: 'convertTree', what: 'the skill deals another damage type', reads: [STATS] },
  { id: 'addTags', what: 'the skill gains a tag, so more modifiers reach it', reads: [STATS] },

  { id: 'everyNth', what: 'every nth cast is worth more', reads: SHARED },
  { id: 'moreVsAiling', what: 'more damage to enemies already suffering', reads: SHARED },
  { id: 'moreClose', what: 'more damage to enemies near you', reads: SHARED },
  { id: 'moreFar', what: 'more damage to enemies far from you', reads: SHARED },
  { id: 'moreVsLow', what: 'more damage to enemies low on life', reads: SHARED },
  { id: 'moreVsFull', what: 'more damage to enemies near full life', reads: SHARED },

  { id: 'critAilment', what: 'a crit leaves an ailment instead', reads: HITTERS },
  { id: 'ailmentMultiplier', what: 'ailments you apply deal more', reads: SHARED },
  { id: 'ailmentDuration', what: 'ailments you apply last longer', reads: SHARED },
  { id: 'ailmentSpread', what: 'a critical tick spreads the ailment', reads: HITTERS },

  { id: 'explode', what: 'the hit bursts where it lands', reads: SHARED },
  { id: 'explodeRadius', what: 'the burst covers more ground', reads: SHARED },
  { id: 'explodeMultiplierAdd', what: 'the burst hits harder', reads: SHARED },
  { id: 'explodeOnKill', what: 'a killed enemy bursts', reads: HITTERS },

  { id: 'extraTargets', what: 'more enemies near the target are hit', reads: ['projectile', 'single_target'] },
  { id: 'extraTargetDamage', what: 'those extra targets take full damage', reads: ['projectile'] },
  { id: 'pierce', what: 'the shot carries on through an enemy', reads: ['projectile'] },
  { id: 'pierceDamage', what: 'pierced enemies take full damage', reads: ['projectile'] },
  { id: 'chains', what: 'the shot leaps to another enemy', reads: ['projectile'] },
  { id: 'chainDamage', what: 'leaps deal full damage', reads: ['projectile'] },

  { id: 'splashMultiplier', what: 'what the swing deals to everything else', reads: ['cleave'] },
  { id: 'splashRadius', what: 'how far the swing reaches', reads: ['cleave'] },
  { id: 'doubleStrike', what: 'extra swings at the target', reads: ['cleave'] },

  { id: 'fieldRadius', what: 'the cloud covers more ground', reads: ['ailment_burst'] },
  { id: 'extraFields', what: 'more clouds, on other enemies', reads: ['ailment_burst'] },
  { id: 'contagionRadius', what: 'a critical tick plants a fresh cloud', reads: ['ailment_burst'] },
];

export const GRANT_BY_ID: Record<string, GrantDef> = Object.fromEntries(
  GRANTS.map((g) => [g.id, g])
);

/** Whether a skill delivered this way would do anything with the grant. */
export const behaviourReads = (behaviour: string, grant: string): boolean =>
  GRANT_BY_ID[grant]?.reads.includes(behaviour) ?? false;
