/**
 * The game's vocabulary: one word per mechanism, defined once.
 *
 * A talent that says "strikes one additional enemy near the target" and a
 * talent that says "passes through one enemy" are teaching two phrasings of
 * one idea, and neither word is worth anything anywhere else. A KEYWORD is:
 * you learn what Arc means once, and every skill that ever says "+1 Arc"
 * costs you nothing to read.
 *
 * So every line a player reads uses the keyword and nothing but the keyword,
 * `BANNED` is the list of phrasings that used to say the same thing, and the
 * demo fails on any of them reaching a screen.
 *
 * `means` carries its own numbers, out of the same tables the sim reads. A
 * glossary quoting a figure by hand is a glossary that goes stale silently.
 */
import { AILMENT_BY_ID, DAMAGE_TYPE_BY_ID, DEFENCE, MANA, POTIONS, PROJECTILE } from './data';

export interface KeywordDef {
  id: string;
  /** The word as a line writes it. */
  name: string;
  /**
   * Every spelling that counts as this keyword, matched whole-word and
   * case-blind. The name is always one of them; plurals and the past tense
   * are what the rest are for.
   */
  says: string[];
  /** What it means, with every number it has. */
  means: string;
  /**
   * The grants that ARE this keyword. A node granting one of them has to name
   * it, which is what the demo checks — a switch with no word for it is a
   * mechanism the player meets without ever being told its name.
   */
  grants?: string[];
  /**
   * A keyword this one is a KIND of, and which naming it therefore satisfies:
   * Kindling grants an Ailment switch and says Burn, which is the specific
   * word and the better line.
   */
  kin?: string;
}

const pct = (n: number): string => `${Math.round(n * 100)}%`;

/**
 * An ailment's line, out of `AILMENTS` rather than quoted by hand — the table
 * the sim reads is the table the glossary prints, so the two cannot drift.
 */
function ailmentMeans(id: string): string {
  const a = AILMENT_BY_ID[id];
  const applied = a.bySource
    ? 'Applied only by something that says it applies one'
    : `Applied by a hit dealing ${DAMAGE_TYPE_BY_ID[a.type]?.name ?? a.type} damage, at whatever chance you have bought`;
  const does =
    a.kind === 'chill'
      ? `Each stack takes ${a.slowPer}% off movement, attack and cast speed. ${a.freezeAt} stacks FREEZE it for ${a.freezeSeconds}s and clear them, and the next hit on a body coming out of one is a Critical whatever your chance is.`
      : a.kind === 'curse'
        ? `When the body dies it bursts for ${a.burstShare}% of its maximum life per stack, ${a.burstRadius} tiles across.`
        : a.kind === 'exposure'
          ? `Each stack is ${a.takenPer}% increased damage taken, from anyone.`
          : a.kind === 'shock'
            ? `${a.dps} damage a second, and every tick throws ${pct(a.arcShare ?? 0)} of it at up to ${a.arcTargets} enemies within ${a.arcRadius} tiles.`
            : `${a.dps} damage a second. Scaled by ${(a.tags ?? []).join(', ')} and by nothing else — never by Spell, Attack or Critical.`;
  return `${applied}, for ${a.seconds}s. ${does}`;
}

/**
 * Ordered longest-first at the bottom of this file, so "Critical Damage" is
 * matched before "Critical" and a two-word keyword is never torn in half.
 */
export const KEYWORDS: KeywordDef[] = [
  // --- how a use reaches more than one enemy -------------------------------
  {
    id: 'projectile',
    name: 'Projectile',
    says: ['Projectile', 'Projectiles'],
    means:
      `A skill throws one Projectile at what you aimed at. Each one beyond the ` +
      `first flies at another enemy within ${PROJECTILE.spread} tiles of that ` +
      `target, for full damage. Nothing is hit twice by one use.`,
    grants: ['extraTargets'],
  },
  {
    id: 'pierce',
    name: 'Pierce',
    says: ['Pierce', 'Pierces', 'Pierced'],
    means:
      `A Projectile carries on through what it hits. Each Pierce catches one ` +
      `more enemy behind the target — up to ${PROJECTILE.pierce} tiles further ` +
      `along the line and ${PROJECTILE.corridor} tiles either side of it — for ` +
      `${pct(PROJECTILE.pierceDamage)} of the damage.`,
    grants: ['pierce', 'pierceDamage'],
  },
  {
    id: 'arc',
    name: 'Arc',
    says: ['Arc', 'Arcs'],
    means:
      `A Projectile leaps from what it hits to the nearest enemy it has not, ` +
      `within ${PROJECTILE.arc} tiles. Each Arc is one more leap, for ` +
      `${pct(PROJECTILE.arcDamage)} of the damage.`,
    grants: ['chains', 'chainDamage'],
  },
  {
    id: 'fork',
    name: 'Fork',
    says: ['Fork', 'Forks'],
    means:
      `A bolt falls from above on an enemy near the one you hit — within ` +
      `${PROJECTILE.fork} tiles of it — for ${pct(PROJECTILE.forkDamage)} of ` +
      `the damage. It is its own bolt, not the shot carrying on, so where the ` +
      `shot came from decides nothing. Nothing is hit twice by one use.`,
    grants: ['forks', 'forkDamage'],
  },
  {
    id: 'spread',
    name: 'Spread',
    says: ['Spread', 'Spreads'],
    means:
      `How far a Projectile past the first looks for its own enemy, from the ` +
      `one you aimed at. ${PROJECTILE.spread} tiles bare.`,
    grants: ['spreadRange'],
  },
  {
    id: 'repeat',
    name: 'Repeat',
    says: ['Repeat', 'Repeats'],
    means:
      'One more swing at the enemy you aimed at, in the same use and at full ' +
      'damage. Repeats stop the moment that enemy is down.',
    grants: ['doubleStrike'],
  },
  {
    id: 'burst',
    name: 'Burst',
    says: ['Burst', 'Bursts'],
    means:
      'Damage in a circle around what was hit, for a share of that hit. It ' +
      'overlaps freely — two Bursts on one enemy both land — and Area of ' +
      'Effect widens every Burst.',
    grants: ['explode', 'explodeRadius', 'explodeMultiplierAdd', 'explodeOnKill'],
  },
  {
    id: 'splash',
    name: 'Splash',
    says: ['Splash', 'Splashes'],
    means:
      'A swing hits everything in its reach for a share of what it deals the ' +
      'target. The circle is around YOU, not around what you hit, so Splash ' +
      'is about where you stand.',
    grants: ['splashMultiplier', 'splashRadius'],
  },
  {
    id: 'cone',
    name: 'Cone',
    says: ['Cone', 'Cones'],
    means:
      'A wedge in front of you. Everything standing in it takes the WHOLE hit ' +
      'and nothing takes a share, and there is no target limit — so how many ' +
      'bodies the wedge holds is the whole of what a use is worth. Area of ' +
      'Effect reaches every Cone further.',
    grants: ['coneArc', 'coneReach'],
  },
  {
    id: 'cloud',
    name: 'Cloud',
    says: ['Cloud', 'Clouds'],
    means:
      'A circle on the ground that leaves an Ailment on everything standing ' +
      'in it. It has no target limit, so a wider Cloud is the whole of how it ' +
      'hits more. Area of Effect widens every Cloud.',
    grants: ['extraFields', 'fieldRadius', 'contagionRadius'],
  },

  // --- damage over time ----------------------------------------------------
  {
    id: 'ailment',
    name: 'Ailment',
    says: ['Ailment', 'Ailments'],
    means:
      'What a DAMAGE TYPE leaves behind. Dealing a type applies its Ailment at ' +
      `that Ailment's own chance; past 100% you apply a second, past 200% a ` +
      'third. Resistance blunts one and Armour never does, which is what makes ' +
      'an Ailment the answer to something you cannot punch through.',
    grants: ['ailmentChance', 'ailmentMultiplier', 'ailmentDuration', 'bleedOnHit'],
  },
  {
    id: 'burn',
    name: 'Burn',
    says: ['Burn', 'Burns', 'Burning'],
    means: ailmentMeans('burn'),
    kin: 'ailment',
  },
  {
    id: 'bleed',
    name: 'Bleed',
    says: ['Bleed', 'Bleeds', 'Bleeding'],
    means: ailmentMeans('bleed'),
    kin: 'ailment',
  },
  {
    id: 'poison',
    name: 'Poison',
    says: ['Poison', 'Poisons', 'Poisoned'],
    means: ailmentMeans('poison'),
    kin: 'ailment',
  },
  {
    id: 'chill',
    name: 'Chill',
    says: ['Chill', 'Chills', 'Chilled'],
    means: ailmentMeans('chill'),
    kin: 'ailment',
  },
  {
    id: 'shock',
    name: 'Shock',
    says: ['Shock', 'Shocks', 'Shocked'],
    means: ailmentMeans('shock'),
    kin: 'ailment',
  },
  {
    id: 'curse',
    name: 'Curse',
    says: ['Curse', 'Curses', 'Cursed'],
    means: ailmentMeans('curse'),
    kin: 'ailment',
  },
  {
    id: 'exposure',
    name: 'Exposure',
    says: ['Exposure', 'Expose', 'Exposes', 'Exposed'],
    means: ailmentMeans('exposure'),
    kin: 'ailment',
  },

  // --- the stats every line leans on --------------------------------------
  {
    id: 'area',
    name: 'Area of Effect',
    says: ['Area of Effect'],
    means:
      'Widens every Burst, Cloud and Splash the skill makes. It grows the ' +
      'AREA, so a radius goes by the square root of it, and it never touches ' +
      'damage.',
  },
  {
    id: 'increased',
    name: 'increased',
    says: ['increased', 'reduced'],
    means:
      'Every increased line of one stat adds up, and the total multiplies the ' +
      'base once. Two +50% increased lines are +100%, not +125%. Reduced is a ' +
      'negative increase and joins the same sum.',
  },
  {
    id: 'more',
    name: 'more',
    says: ['more', 'less'],
    means:
      'Every more line multiplies on its own, on top of everything else. Two ' +
      '50% more lines are 125% more, not 100% — which is why they are rare ' +
      'and why a talent charges for one.',
  },
  {
    id: 'critical',
    name: 'Critical',
    says: ['Critical', 'Critically', 'Criticals'],
    means:
      'A Critical hit deals ×2 your damage, plus whatever Critical Damage you ' +
      'have found. Critical Chance is how often, and a spell and an attack ' +
      'count it separately.',
  },
  {
    id: 'resistance',
    name: 'Resistance',
    says: ['Resistance', 'Resistances'],
    means:
      `Blunts one damage type, Ailments included. It caps at ` +
      `${DEFENCE.resistanceCap}%, and Resistance and Armour multiply rather ` +
      `than adding — at both caps a hit lands for a sixteenth.`,
  },
  {
    id: 'block',
    name: 'Block',
    says: ['Block', 'Blocks', 'Blocked'],
    means:
      `A Blocked hit deals nothing at all — there is no second number. Block ` +
      `Chance caps at ${DEFENCE.blockCap}%, comes off a shield in your off ` +
      `hand and from nowhere else, and does nothing against an Ailment.`,
  },
  {
    id: 'armour',
    name: 'Armour',
    says: ['Armour'],
    means:
      `Blunts a HIT, by a share that curves with Armour points rather than ` +
      `with the size of the hit: ${DEFENCE.armourHalfPoint} points is half the ` +
      `${DEFENCE.armourCap}% cap. It does nothing at all against an Ailment.`,
  },

  // --- mana and flasks -----------------------------------------------------
  {
    id: 'starved',
    name: 'Starved',
    says: ['Starved'],
    means:
      `With nothing left in the pool the use happens anyway and lands for ` +
      `${pct(MANA.starvedDamage)} of your damage. Running dry is a price, ` +
      `never a wall.`,
    grants: ['starvedDamage'],
  },
  // --- what a movement skill does -----------------------------------------
  {
    id: 'slow',
    name: 'Slow',
    says: ['Slow', 'Slows', 'Slowed'],
    means:
      'An enemy swings and casts more slowly for a duration. It is NOT a ' +
      'Splash — a Splash is damage in a circle and a Slow deals none, because ' +
      'every damage number in the game belongs to the skill in your main slot.',
    grants: ['landingSlow'],
  },
  {
    id: 'charge',
    name: 'Charge',
    says: ['Charge', 'Charges'],
    means:
      `What a flask holds. Each carries ${POTIONS[0]?.charges ?? 2}, a descent ` +
      `always begins full, and nothing about them survives one — there is ` +
      `nothing to hoard.`,
    grants: ['chargeRegen'],
  },
];

/** Which keyword owns a grant, for the demo's "every switch has a word" check. */
export const KEYWORD_BY_GRANT: Record<string, KeywordDef> = Object.fromEntries(
  KEYWORDS.flatMap((k) => (k.grants ?? []).map((g) => [g, k]))
);

/**
 * What a line may NOT say, because a keyword already owns the idea. The value
 * is the keyword to use instead, which is what the demo prints when it finds
 * one — a failure naming the fix is a failure somebody acts on.
 *
 * Matched whole-word and case-blind over every player-facing line. Keep the
 * entries to genuine SYNONYMS: banning a word that also has an innocent use
 * makes the check something people work around.
 */
export const BANNED: Record<string, string> = {
  chain: 'Arc',
  chains: 'Arc',
  chaining: 'Arc',
  // The PHRASE, never the bare word: a movement skill called Leap cannot be
  // forbidden from saying its own name, and Arc's own `means` line says
  // "leaps from what it hits" — which is the sentence that owns the idea.
  'leaps to': 'Arc',
  'leaping to': 'Arc',
  'leaps from one': 'Arc',
  'passes through': 'Pierce',
  'pass through': 'Pierce',
  'passing through': 'Pierce',
  'additional enemy': 'Projectile',
  'additional enemies': 'Projectile',
  'additional target': 'Projectile',
  'additional targets': 'Projectile',
  'extra target': 'Projectile',
  'extra targets': 'Projectile',
  explodes: 'Burst',
  explosion: 'Burst',
  'blows up': 'Burst',
};

/**
 * Longest first, so "Area of Effect" wins over "Effect" and "Critical Damage"
 * is never split at "Critical". Built once: this runs per line rendered.
 */
const SPELLINGS: { word: string; keyword: KeywordDef }[] = KEYWORDS.flatMap((k) =>
  k.says.map((word) => ({ word, keyword: k }))
).sort((a, b) => b.word.length - a.word.length);

const escape = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** One expression for the lot, alternated longest-first and bounded by words. */
const PATTERN = new RegExp(`\\b(${SPELLINGS.map((s) => escape(s.word)).join('|')})\\b`, 'gi');

const BY_SPELLING = new Map(SPELLINGS.map((s) => [s.word.toLowerCase(), s.keyword]));

/** A line cut at its keywords: the runs between them, and the words themselves. */
export interface Piece {
  text: string;
  keyword?: KeywordDef;
}

export function cutKeywords(text: string): Piece[] {
  const out: Piece[] = [];
  let at = 0;
  PATTERN.lastIndex = 0;
  for (let m = PATTERN.exec(text); m; m = PATTERN.exec(text)) {
    const keyword = BY_SPELLING.get(m[0].toLowerCase());
    if (!keyword) continue;
    if (m.index > at) out.push({ text: text.slice(at, m.index) });
    out.push({ text: m[0], keyword });
    at = m.index + m[0].length;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}

/** Every keyword some lines name, once each, in the order they first appear. */
export function keywordsIn(lines: string[]): KeywordDef[] {
  const seen = new Map<string, KeywordDef>();
  for (const line of lines) {
    for (const piece of cutKeywords(line)) {
      if (piece.keyword) seen.set(piece.keyword.id, piece.keyword);
    }
  }
  return [...seen.values()];
}

/** Banned phrasings a line still uses, with the keyword each one owes. */
export function bannedIn(text: string): { said: string; use: string }[] {
  const found: { said: string; use: string }[] = [];
  for (const [phrase, use] of Object.entries(BANNED)) {
    if (new RegExp(`\\b${escape(phrase)}\\b`, 'i').test(text)) found.push({ said: phrase, use });
  }
  return found;
}
