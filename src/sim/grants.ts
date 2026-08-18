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
export type Changes =
  | 'scale'
  | 'duration'
  | 'targets'
  | 'burst'
  | 'field'
  | 'crit'
  | 'type'
  | 'ailment';

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
/** The two movers. Their own behaviour names, so `reads` can tell a jump's
 *  landing from a step that never lands anywhere. */
const MOVERS = ['step', 'leap'];

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
    what: 'a Starved use costs you less damage',
    // Every skill, whatever its delivery: being unable to pay is not a thing
    // one behaviour does. It MULTIPLIES `MANA.starvedDamage` rather than
    // replacing it, so a trade that makes running dry worse and one that
    // softens it both cost a table entry instead of a rewrite.
    reads: [STATS],
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `${more(n)} more damage while Starved`;
    },
  },

  {
    id: 'critIntoBuff',
    what: 'a Critical buffs you instead of hitting harder',
    // The passive's whole TRADE, as ONE switch: half-applying it would be a
    // character that gave up crit damage and got nothing for it.
    reads: [STATS],
    say: (v) => {
      const p = pair(v, 'more', 'seconds');
      return p && `A Critical deals no extra damage; landing one grants ${p[0]}% more damage for ${p[1]}s`;
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
    what: 'you Critically strike more often while a flask is running',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `+${n}% Critical Chance while a flask is running`;
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
    what: 'flask Charges come back during a descent',
    // The Alchemist's whole rule: charges stop being a descent's budget and
    // become a cooldown. Summed, so two nodes shorten the wait together.
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null || n <= 0
        ? null
        : `Each flask regains a Charge every ${(1 / n).toFixed(1)}s`;
    },
  },

  {
    id: 'manaShield',
    what: 'damage taken comes off mana before life',
    // Ailments included: they are already the thing Armour cannot stop, so the
    // pool eating them is the whole reason this is worth a trade.
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `${pct(n)} of damage taken, Ailments included, is paid out of mana first`;
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

  // --- what a MOVEMENT web hands over --------------------------------------
  //
  // No `changes` class on any of them: `INTERACTIONS` is the audit of what two
  // DELIVERY switches come to, and a mover has no delivery — it never casts and
  // never deals damage, because every damage number in the game is the main
  // skill's. So a movement notable is only ever about the move.
  {
    id: 'moveCooldown',
    what: 'your movement skill recharges sooner',
    reads: MOVERS,
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `${pct(1 - n)} reduced movement skill cooldown`;
    },
  },
  {
    id: 'moveDistance',
    what: 'your movement skill carries you further',
    reads: MOVERS,
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Your movement skill carries you ${more(n)} more tiles`;
    },
  },
  {
    id: 'moveMana',
    what: 'moving restores mana',
    reads: ['step'],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Each Blink restores ${pct(n)} of your mana pool`;
    },
  },
  {
    id: 'landingSlow',
    // A jump LANDS and a step does not, which is the one thing that could ever
    // tell the two webs apart. A landing deals no damage and never will.
    what: 'landing Slows what is near you',
    reads: ['leap'],
    say: (v) => {
      const o = v as Record<string, unknown> | null;
      if (!o || typeof o.radius !== 'number' || typeof o.slow !== 'number' || typeof o.seconds !== 'number') {
        return null;
      }
      return `Landing Slows enemies within ${o.radius} tiles by ${pct(o.slow)} for ${o.seconds}s`;
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

  { id: 'critAilment', what: 'a Critical leaves an Ailment instead', reads: HITTERS, changes: 'crit' },
  {
    id: 'bleedOnHit',
    changes: 'ailment',
    what: 'every hit leaves a Bleed',
    reads: HITTERS,
    say: (v) => {
      const p = pair(v, 'seconds', 'multiplier');
      return p && `Every hit leaves a Bleed worth ${pct(p[1])} of it, over ${p[0]} seconds`;
    },
  },
  {
    id: 'ailmentMultiplier',
    changes: 'scale',
    what: 'Ailments you apply deal more',
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
    what: 'Ailments you apply last longer',
    reads: SHARED,
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Ailments you apply last ${more(n)} longer`;
    },
  },
  { id: 'ailmentSpread', what: 'a Critical tick spreads the Ailment', reads: HITTERS, changes: 'crit' },

  {
    id: 'explode',
    changes: 'burst',
    what: 'the hit Bursts where it lands',
    reads: SHARED,
    say: (v) => {
      const p = pair(v, 'radius', 'multiplier');
      return p && `The hit Bursts ${p[0]} tiles across, for ${pct(p[1])} of the damage`;
    },
  },
  {
    id: 'explodeRadius',
    changes: 'burst',
    what: 'the Burst covers more ground',
    reads: SHARED,
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `The Burst covers ${more(n)} more ground`;
    },
  },
  {
    id: 'explodeMultiplierAdd',
    changes: 'burst',
    what: 'the Burst hits harder',
    reads: SHARED,
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `The Burst carries +${pct(n)} of the damage`;
    },
  },
  {
    id: 'explodeOnKill',
    changes: 'burst',
    what: 'a killed enemy Bursts',
    reads: HITTERS,
    say: (v) => {
      const p = pair(v, 'radius', 'multiplier');
      return p && `A killed enemy Bursts ${p[0]} tiles across, for ${pct(p[1])} of the damage`;
    },
  },

  {
    id: 'extraTargets',
    changes: 'targets',
    what: 'the skill throws more Projectiles',
    reads: ['projectile', 'single_target'],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `+${n} Projectile${n === 1 ? '' : 's'}`;
    },
  },
  {
    id: 'spreadRange',
    changes: 'targets',
    what: 'a Projectile Spreads further to find its own enemy',
    reads: ['projectile', 'single_target'],
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Projectiles Spread ${more(n)} further`;
    },
  },
  {
    id: 'spreadFar',
    changes: 'targets',
    // Widening the Spread alone is worth nothing in a packed room, where there
    // are always enough enemies inside the bare radius: what a wider one buys
    // is only reachable if the pick changes with it.
    what: 'a Projectile takes the enemy furthest into its Spread',
    reads: ['projectile', 'single_target'],
    say: (v) =>
      v === true ? 'Projectiles take the enemies furthest into their Spread' : null,
  },
  {
    id: 'pierce',
    changes: 'targets',
    what: 'the Projectile gains Pierce',
    reads: ['projectile'],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `+${n} Pierce`;
    },
  },
  {
    id: 'pierceDamage',
    changes: 'targets',
    what: 'Pierce lands for more of the damage',
    reads: ['projectile'],
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Pierce deals ${pct(n)} of the damage`;
    },
  },
  {
    id: 'chains',
    changes: 'targets',
    what: 'the Projectile leaves an Arc behind it',
    reads: ['projectile'],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `+${n} Arc`;
    },
  },
  {
    id: 'chainDamage',
    changes: 'targets',
    what: 'an Arc lands for more of the damage',
    reads: ['projectile'],
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Arcs deal ${pct(n)} of the damage`;
    },
  },

  {
    id: 'forks',
    changes: 'targets',
    what: 'the skill gains a Fork',
    reads: ['projectile'],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `+${n} Fork${n === 1 ? '' : 's'}`;
    },
  },
  {
    id: 'forkDamage',
    changes: 'targets',
    what: 'a Fork lands for more of the damage',
    reads: ['projectile'],
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Forks deal ${pct(n)} of the damage`;
    },
  },

  {
    id: 'splashMultiplier',
    changes: 'targets',
    what: 'what the Splash deals',
    reads: ['cleave'],
    merge: 'max',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Splash deals ${pct(n)} of the swing`;
    },
  },
  {
    id: 'splashRadius',
    changes: 'targets',
    what: 'how far the Splash reaches',
    reads: ['cleave'],
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Splash reaches ${more(n)} further`;
    },
  },
  {
    id: 'doubleStrike',
    changes: 'targets',
    what: 'more Repeats at the enemy you aimed at',
    reads: ['cleave'],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `+${n} Repeat${n === 1 ? '' : 's'}`;
    },
  },

  {
    id: 'fieldRadius',
    changes: 'field',
    what: 'the Cloud covers more ground',
    reads: ['ailment_burst'],
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Clouds cover ${more(n)} more ground`;
    },
  },
  {
    id: 'extraFields',
    changes: 'targets',
    what: 'the skill drops more Clouds, on other enemies',
    reads: ['ailment_burst'],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `+${n} Cloud${n === 1 ? '' : 's'}, on other enemies`;
    },
  },
  {
    id: 'contagionRadius',
    changes: 'field',
    what: 'a Critical tick plants a fresh Cloud',
    reads: ['ailment_burst'],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `A Critical tick plants a Cloud ${n} tiles across`;
    },
  },
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

/** What a landing does to whatever is standing near it, or null. */
export function landingOf(
  grants: Record<string, unknown>
): { radius: number; slow: number; seconds: number } | null {
  const v = grants.landingSlow as Record<string, unknown> | undefined;
  if (typeof v?.radius !== 'number' || typeof v?.slow !== 'number' || typeof v?.seconds !== 'number') {
    return null;
  }
  return { radius: v.radius, slow: v.slow, seconds: v.seconds };
}

/** What a grafted line leaves on every hit, or null. */
export function bleedOf(
  grants: Record<string, unknown>
): { seconds: number; multiplier: number } | null {
  const v = grants.bleedOnHit as { seconds?: unknown; multiplier?: unknown } | undefined;
  if (typeof v?.seconds !== 'number' || typeof v?.multiplier !== 'number') return null;
  return { seconds: v.seconds, multiplier: v.multiplier };
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
