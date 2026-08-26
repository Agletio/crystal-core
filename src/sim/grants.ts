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
import { AMBUSH, BURST, MANA, PASSIVE_DAMAGE, ROGUE, WARRIOR, WEAPON_SPECIALITY } from '../data';

export const STATS = 'stats';

/** The SIM's own, beside the delivery that triggers it: a switch whose whole
 *  effect lands after the use that started it has ended, so casting one twice
 *  cannot show it. What it does is proved by running a descent instead. */
export const SIM = 'sim';

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
/** ONE DECIMAL where there is one: rounded whole, 0.025 printed as "3%" while
 *  the sim leeched 2.5%, and a card that rounds its own mechanism is a lie. */
const pct = (n: number): string => `${+(n * 100).toFixed(1)}%`;

/** A multiplier as the change it makes: 1.6 → "60%". */
const more = (n: number): string => pct(n - 1);

const asNumber = (v: unknown): number | null => (typeof v === 'number' ? v : null);

const pair = (v: unknown, a: string, b: string): [number, number] | null => {
  const o = v as Record<string, unknown> | null;
  if (!o || typeof o[a] !== 'number' || typeof o[b] !== 'number') return null;
  return [o[a] as number, o[b] as number];
};

/** What EVERY delivery scales by: how good this cast is, and what the body in
 *  front of you is. A behaviour opts in by calling `castScale`/`targetScale`. */
const SCALED = ['projectile', 'melee', 'ailment_burst', 'cone', 'single_target', 'ambush'];
/** And the ones that call `blastAround`, which is a narrower list. */
const SHARED = ['projectile', 'melee', 'ailment_burst', 'cone', 'ambush'];
const HITTERS = ['projectile', 'melee', 'cone', 'ambush'];
/** The two movers. Their own behaviour names, so `reads` can tell a jump's
 *  landing from a step that never lands anywhere. */
const MOVERS = ['step', 'leap'];

export const GRANTS: GrantDef[] = [
  { id: 'convertTree', what: 'the skill is Converted to another damage type', reads: [STATS], changes: 'type' },
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
    what: 'a cast spends a share of your maximum mana and ADDS that much damage',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `Each use spends ${pct(n)} of your maximum mana and adds that much Cold damage`;
    },
  },
  {
    id: 'manaLeech',
    what: 'a share of the damage you deal returns as mana',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `${pct(n)} of the damage you deal returns to you as mana`;
    },
  },
  // --- what a BRANCH of a trade hands over ---------------------------------
  //
  // A trade notable changes a RULE and never a number, or two trades compete
  // on percentages and one of them wins. These are the rules the second branch
  // of each spoke exists for. No `changes` class on any: none is read by a
  // DELIVERY, so none can invent a combination `INTERACTIONS` has to price.
  {
    id: 'potionMove',
    what: 'you move faster while a flask is running',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `While a flask is running you move ${Math.round(n)}% faster`;
    },
  },
  {
    id: 'potionLess',
    what: 'a running flask blunts what reaches you',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `While a flask is running you take ${pct(n)} less damage`;
    },
  },
  {
    id: 'potionFree',
    what: 'a running flask pays for your uses',
    reads: [STATS],
    say: () => 'While a flask is running your uses cost no mana',
  },
  {
    id: 'wardWhole',
    what: 'mana pays the WHOLE of an Ailment rather than a share',
    reads: [STATS],
    say: () =>
      'Mana pays the whole of an Ailment rather than its share, while there is mana to pay with',
  },
  // --- what a PASSIVE hands over -------------------------------------------
  //
  // A passive never casts, so its static `grants` ARE the skill and every one
  // of these reads STATS: the sim asks for them, not a delivery, which is what
  // lets any of the six sit beside any main skill.
  {
    id: 'burstOnHit',
    what: 'landing a hit Bursts around YOU, for damage the skill had no part in',
    // FLAT off character level, moved only by increases to Damage and to
    // Physical. A Burst that is a share of your hit inherits every multiplier
    // already stacked, which is a rider no build declines; one that scales by
    // nothing at all is dead by band 3. This is the narrow road between them.
    reads: [STATS],
    say: (v) => {
      const p = pair(v, 'every', 'perLevel');
      return (
        p &&
        `Every ${p[0]}s your next hit Bursts around you for ${p[1]} Physical damage ` +
          `per character level, ${PASSIVE_DAMAGE.sunderRadius} tiles across`
      );
    },
  },
  {
    id: 'frostVolley',
    what: 'ice spikes go out at everything you have Chilled, on their own clock',
    reads: [STATS],
    say: (v) => {
      const p = pair(v, 'every', 'perLevel');
      return (
        p &&
        `Every ${p[0]}s a spike goes out at every Chilled enemy within ` +
          `${PASSIVE_DAMAGE.frostRange} tiles, for ${p[1]} Cold damage per character level`
      );
    },
  },
  {
    id: 'ailmentSpread',
    what: 'an ailing body passes what it carried on when it dies',
    reads: [STATS],
    say: (v) => {
      const p = pair(v, 'radius', 'stacks');
      const targets = (v as { targets?: number } | null)?.targets;
      if (!p || typeof targets !== 'number') return null;
      return (
        `A body dying with an Ailment gives ${p[1]} stack of each to the ` +
        `${targets} nearest enemies within ${p[0]} tiles`
      );
    },
  },
  {
    id: 'ailmentWeak',
    what: 'every Ailment you apply is weaker, damage and Slow alike',
    reads: [STATS],
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Ailments you apply are ${pct(1 - n)} weaker, in damage and in Slow alike`;
    },
  },
  {
    id: 'bloodCost',
    what: 'you have no mana at all and a use is paid for in life',
    reads: [STATS],
    merge: 'max',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Your mana pool is 0 and every use costs ${n} life per point it would have cost`;
    },
  },
  {
    id: 'lifeLeech',
    what: 'a share of the damage you deal returns as life',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `${pct(n)} of the damage you deal returns to you as life`;
    },
  },
  {
    id: 'prismaticExtra',
    what: 'your Elemental damage carries Prismatic damage on top of it',
    // LAST, and off what the Elemental half already came to: it multiplies a
    // number every other multiplier is already in, and is resisted as
    // Prismatic rather than as the type that carried it.
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `You deal ${pct(n)} of your Elemental damage as extra Prismatic damage`;
    },
  },
  {
    id: 'elementalShred',
    what: 'enemies near you are softer to Fire, Cold and Lightning',
    reads: [STATS],
    say: (v) => {
      const p = pair(v, 'radius', 'amount');
      return p && `Enemies within ${p[0]} tiles have ${p[1]}% less Fire, Cold and Lightning Resistance`;
    },
  },
  {
    id: 'occultShred',
    what: 'enemies near you are softer to Poison, Dark and Light',
    reads: [STATS],
    say: (v) => {
      const p = pair(v, 'radius', 'amount');
      return p && `Enemies within ${p[0]} tiles have ${p[1]}% less Poison, Dark and Light Resistance`;
    },
  },
  {
    id: 'armourToDodge',
    what: 'Armour stops being reduction and becomes a Dodge chance',
    reads: [STATS],
    merge: 'max',
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `Your Armour blunts nothing and is instead ${pct(n)} of itself as Dodge`;
    },
  },
  {
    id: 'unhitHaste',
    what: 'you move faster the longer nothing has landed on you',
    reads: [STATS],
    say: (v) => {
      const p = pair(v, 'after', 'more');
      return p && `${pct(p[1])} increased Movement Speed once ${p[0]}s have passed without a hit landing on you`;
    },
  },
  {
    id: 'manaOnKill',
    what: 'a kill returns mana',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Every kill returns ${pct(n)} of your maximum mana`;
    },
  },
  {
    id: 'payWithLife',
    what: 'a use you cannot pay for is paid in life instead',
    reads: [STATS],
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `A use you cannot pay for spends life instead, ${n} life for every point of mana — so you are never Starved, only bleeding`;
    },
  },
  {
    id: 'overchargeYield',
    what: 'an overcharged use adds more than it spent',
    reads: [STATS],
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Overcharge adds ${n}x what it spent rather than matching it`;
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

  // --- what the WARRIOR's trade hands over ----------------------------------
  //
  // ONE QUESTION, asked fifteen ways: what is in your other hand. A shield's
  // Block and a two-hander's swing each buy things the other cannot, and every
  // switch here pays in exactly one of the two arrangements or in neither.
  // NOTHING writes `blockChance` — a shield's whole worth stays one number you
  // read off the piece. Each carries an AMOUNT and `WARRIOR` carries what it is
  // measured against, so two nodes granting one of these ADD UP.
  {
    id: 'shieldLess',
    what: 'a shield in the off hand blunts every hit',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `While your off hand holds a shield you take ${pct(n)} less damage from hits`;
    },
  },
  {
    id: 'blockThorns',
    what: 'a Block deals damage back',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `A Block deals ${pct(n)} of your damage back to what you blocked`;
    },
  },
  {
    id: 'blockHeal',
    what: 'a Block restores life',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `A Block restores ${pct(n)} of your maximum life`;
    },
  },
  {
    id: 'blockRiposte',
    what: 'the hit after a Block lands harder',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `For ${WARRIOR.riposteSeconds}s after a Block your hits deal ${Math.round(n)}% more damage`;
    },
  },
  {
    id: 'blockStagger',
    what: 'a Block Slows what you blocked',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `A Block Slows what you blocked by ${Math.round(n)}% for ${WARRIOR.staggerSeconds}s`;
    },
  },
  {
    id: 'twoHandMore',
    what: 'both hands on one weapon hit harder',
    reads: [STATS],
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `While both hands are on one weapon you deal ${more(n)} more damage`;
    },
  },
  {
    id: 'twoHandRate',
    what: 'both hands on one weapon swing faster',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `While both hands are on one weapon you attack ${Math.round(n)}% faster`;
    },
  },
  {
    id: 'overwhelm',
    what: 'your hits ignore part of what a body\u2019s Armour blunts',
    reads: [STATS],
    merge: 'max',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Your hits ignore ${pct(n)} of what a body's Armour blunts`;
    },
  },
  {
    id: 'bareChest',
    what: 'the plate on your chest counts for nothing and you are bigger for it',
    // A TRADE, not a bonus: every armour line on a body piece is dead weight
    // from the moment this is taken, which is what the life is paid for with.
    reads: [STATS],
    merge: 'max',
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `Your body armour's rating counts for nothing, and your maximum life is ${pct(n)} higher`;
    },
  },
  {
    id: 'secondSkin',
    what: 'part of your Armour blunts Ailments too',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `${pct(n)} of what your Armour blunts also blunts Ailments`;
    },
  },
  {
    id: 'killHeal',
    what: 'a kill restores life',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Every kill restores ${pct(n)} of your maximum life`;
    },
  },
  {
    id: 'cornered',
    what: 'you hit harder with your back to the wall',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `Below ${WARRIOR.corneredBelow}% of your maximum life you deal ${Math.round(n)}% more damage`;
    },
  },
  // THE PAINT ANSWERS A BLOW. Both fire on being HIT, which is the one thing a
  // man who stands in it can count on — and not on where he is standing.
  {
    id: 'struckLess',
    what: 'a hit that lands on you blunts the next ones',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `For ${WARRIOR.paintSeconds}s after you are hit you take ${Math.round(n)}% less damage`;
    },
  },
  {
    id: 'struckMore',
    what: 'a hit that lands on you sharpens what you swing back',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `For ${WARRIOR.paintSeconds}s after you are hit you deal ${Math.round(n)}% more damage`;
    },
  },
  {
    id: 'heavyHand',
    what: 'your hits Slow what they land on',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `Your hits Slow what they land on by ${Math.round(n)}% for ${WARRIOR.heavyHandSeconds}s`;
    },
  },

  // --- what the ROGUE's trade hands over -------------------------------------
  //
  // TWO WEAPONS instead of a shield, which no other trade may hold at all. Most
  // of these pay only while both hands are full; the rest are what a kill and a
  // first strike buy. `ROGUE` carries the seconds, the grant the amount.
  {
    id: 'pairMore',
    what: 'two weapons hit harder than one and a shield',
    reads: [STATS],
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `While you hold two weapons you deal ${more(n)} more damage`;
    },
  },
  {
    id: 'pairRate',
    what: 'two weapons swing faster',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `While you hold two weapons you attack ${Math.round(n)}% faster`;
    },
  },
  {
    id: 'offHandShare',
    what: 'the off hand puts more of itself into every hit',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `Your off hand puts a further ${pct(n)} of its own damage into every hit`;
    },
  },
  {
    id: 'weaponSpecialist',
    what: 'each weapon you hold grants what its family is for',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      if (n === null) return null;
      const each = Object.entries(WEAPON_SPECIALITY)
        .filter(([, s], i, all) => all.findIndex(([, o]) => o.stat === s.stat) === i)
        .map(([family, s]) => `${Math.round(s.per * n)}% per ${family}`);
      return `Every weapon you hold grants what its family is for — ${each.join(', ')}`;
    },
  },
  {
    id: 'matchedPair',
    what: 'two of the SAME family hit harder',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `While both your weapons are the same family you deal ${Math.round(n)}% more damage`;
    },
  },
  {
    id: 'oddPair',
    what: 'two of DIFFERENT families hit harder',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `While your two weapons are different families you deal ${Math.round(n)}% more damage`;
    },
  },
  {
    id: 'pairCrit',
    what: 'two weapons find the gap more often',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `While you hold two weapons you have +${Math.round(n)}% Critical Chance`;
    },
  },
  {
    id: 'firstBlood',
    what: 'the FIRST hit on a body lands harder',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `The first hit you land on a body deals ${Math.round(n)}% more damage`;
    },
  },
  {
    id: 'critEcho',
    what: 'a Critical strikes again with the off hand',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `A Critical strikes again with your off hand for ${Math.round(n)}% of the hit`;
    },
  },
  {
    id: 'killGuard',
    what: 'a kill covers you for a moment',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `For ${ROGUE.guardSeconds}s after a kill you take ${Math.round(n)}% less damage`;
    },
  },
  {
    id: 'killHaste',
    what: 'a kill quickens the next swing',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `For ${ROGUE.hasteSeconds}s after a kill you attack ${Math.round(n)}% faster`;
    },
  },
  {
    id: 'killMove',
    what: 'a kill carries you to the next one',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null
        ? null
        : `For ${ROGUE.hasteSeconds}s after a kill you move ${Math.round(n)}% faster`;
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

  { id: 'everyNth', what: 'every nth cast is worth more', reads: SCALED, changes: 'scale' },
  { id: 'moreVsAiling', what: 'more damage to enemies already suffering', reads: SCALED, changes: 'scale' },
  // WHAT REPLACED THE DISTANCE NODES. *"It feels bad to ever take increased
  // damage to near enemies when you can't control your character's location at
  // all."* Both of these fire on something a BUILD decides — how fast it kills,
  // and whether anything reaches it — rather than on where the walk put you.
  {
    id: 'killMore',
    changes: 'scale',
    what: 'more damage for a moment after a kill',
    reads: SCALED,
    say: (v) => {
      const p = pair(v, 'seconds', 'more');
      return p && `${pct(p[1])} more damage for ${p[0]}s after a kill`;
    },
  },
  {
    id: 'untouchedMore',
    changes: 'scale',
    what: 'more damage while nothing has landed on you',
    reads: SCALED,
    say: (v) => {
      const p = pair(v, 'after', 'more');
      return p && `${pct(p[1])} more damage while nothing has hit you for ${p[0]}s`;
    },
  },
  {
    id: 'moreVsLow',
    changes: 'scale',
    what: 'more damage to enemies low on life',
    reads: SCALED,
    say: (v) => {
      const p = pair(v, 'below', 'more');
      return p && `${pct(p[1])} more damage to enemies below ${pct(p[0])} of their life`;
    },
  },
  {
    id: 'moreVsFull',
    changes: 'scale',
    what: 'more damage to enemies near full life',
    reads: SCALED,
    say: (v) => {
      const p = pair(v, 'above', 'more');
      return p && `${pct(p[1])} more damage to enemies above ${pct(p[0])} of their life`;
    },
  },

  {
    id: 'ailmentChance',
    changes: 'ailment',
    what: 'more of your hits leave the Ailment their damage carries',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `+${Math.round(n)}% chance to apply your Ailment`;
    },
  },
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
    reads: [STATS],
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
    reads: [STATS],
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Ailments you apply last ${more(n)} longer`;
    },
  },

  // MOMENTUM. Damage that builds while you keep hitting ONE body and drops the
  // moment you switch, so it is worth everything to a build that commits and
  // nothing to one that sprays. It is what a Burst branch became: coverage used
  // to be the only thing a branch could sell, and this sells the opposite.
  {
    id: 'momentum',
    changes: 'scale',
    what: 'staying on one enemy builds Momentum against it',
    reads: [STATS],
    say: (v) => {
      const p = pair(v, 'per', 'max');
      return (
        p &&
        `Each use on the same enemy as the last builds ${p[0]}% Momentum against it, up to ${p[1]}%; using it elsewhere halves what you have built`
      );
    },
  },
  {
    id: 'momentumPer',
    changes: 'scale',
    what: 'Momentum builds faster',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Momentum builds ${n}% faster per use`;
    },
  },
  {
    id: 'momentumMax',
    changes: 'scale',
    what: 'Momentum reaches higher',
    reads: [STATS],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Momentum reaches ${n}% higher`;
    },
  },
  {
    id: 'momentumKeep',
    changes: 'scale',
    what: 'Momentum carries to the next enemy whole instead of being halved',
    reads: [STATS],
    say: (v) =>
      v === true ? 'Momentum carries to a new enemy whole instead of being halved' : null,
  },

  {
    id: 'explodeOnKill',
    changes: 'burst',
    what: 'a killed enemy Bursts, and so does whatever that Burst kills',
    reads: HITTERS,
    say: (v) => {
      const p = pair(v, 'radius', 'multiplier');
      return (
        p &&
        `A killed enemy Bursts ${p[0]} tiles across, for ${pct(p[1])} of the damage — ` +
          `and what THAT kills Bursts too, ${BURST.chainDepth} deep`
      );
    },
  },

  // --- what a Critical STARTS ----------------------------------------------
  {
    id: 'critChain',
    changes: 'targets',
    what: 'a Critical teleports you into another enemy and Ambushes it too',
    reads: ['ambush', SIM],
    say: (v) =>
      v === true
        ? `A Critical teleports you into another enemy ${AMBUSH.chainDelay}s later and ` +
          `Ambushes it, chaining until it lands on a body it has already opened on`
        : null,
  },
  {
    id: 'chainSooner',
    changes: 'targets',
    what: 'the follow-up a Critical bought arrives sooner',
    reads: ['ambush', SIM],
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `The follow-up lands ${pct(1 - n)} sooner`;
    },
  },
  {
    id: 'chainReach',
    changes: 'targets',
    what: 'the follow-up a Critical bought crosses further',
    reads: ['ambush', SIM],
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `The follow-up crosses ${more(n)} further`;
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
    id: 'echoes',
    changes: 'targets',
    what: 'the swing Echoes onto enemies out from the one you struck',
    reads: ['melee'],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `+${n} Echo${n === 1 ? '' : 'es'}`;
    },
  },
  {
    id: 'echoDamage',
    changes: 'targets',
    what: 'an Echo lands for more of the swing',
    reads: ['melee'],
    merge: 'max',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `Echoes land for ${pct(n)} of the swing`;
    },
  },
  {
    id: 'doubleStrike',
    changes: 'targets',
    what: 'more Repeats at the enemy you aimed at',
    reads: ['melee'],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `+${n} Repeat${n === 1 ? '' : 's'}`;
    },
  },

  {
    id: 'coneArc',
    changes: 'targets',
    // Degrees SUM and reach MULTIPLIES, and the pair is not arbitrary: a
    // percentage of an angle means nothing to read, and a wedge that opened by
    // a fifth each time would pass a full circle in four nodes.
    what: 'the Cone opens wider',
    reads: ['cone'],
    merge: 'sum',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `The Cone opens ${n}° wider`;
    },
  },
  {
    id: 'coneReach',
    changes: 'targets',
    what: 'the Cone reaches further',
    reads: ['cone'],
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null ? null : `The Cone reaches ${more(n)} further`;
    },
  },

  {
    id: 'fieldOnCast',
    changes: 'field',
    what: 'the skill leaves a Cloud where it lands, every so many casts',
    reads: ['single_target'],
    say: (v) => {
      const p = pair(v, 'every', 'radius');
      return p && `Every ${p[0]} casts leaves a Cloud reaching ${p[1]} tiles where it lands`;
    },
  },
  {
    id: 'fieldEvery',
    changes: 'field',
    what: 'the Cloud comes round sooner',
    reads: ['single_target'],
    merge: 'product',
    say: (v) => {
      const n = asNumber(v);
      return n === null || n <= 0 ? null : `Clouds come ${more(1 / n)} as often`;
    },
  },
  {
    id: 'fieldRadius',
    changes: 'field',
    what: 'the Cloud covers more ground',
    reads: ['ailment_burst', 'single_target'],
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
    reads: ['ailment_burst', 'single_target'],
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
/**
 * The share of your MAXIMUM mana a cast spends, and therefore how much damage
 * it adds — the two are the same number, which is the whole point: what you
 * pay is what you get, so a bigger pool is a bigger hit rather than a bigger
 * buffer you never touch. A `more` multiplier gave a stacked pool nothing and
 * made regeneration the only stat that mattered.
 */
export const overchargeOf = (grants: Record<string, unknown>): number =>
  Math.max(0, (grants.overcharge as number) ?? 0);

/** The share of a hit the mana pool pays before life does. Capped: a pool that
 *  ate everything would be a second life bar rather than a trade. */
export const shieldShare = (grants: Record<string, unknown>): number =>
  Math.max(0, Math.min(MANA.shieldCap, (grants.manaShield as number) ?? 0));
