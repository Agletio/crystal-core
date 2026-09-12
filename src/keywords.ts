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
import { AILMENT, AILMENT_BY_ID, MONSTER_AILMENT, BURST, SKILL_BY_ID, DAMAGE_TYPE_BY_ID, DEFENCE, MANA, MELEE, POTIONS, PROJECTILE, stunChanceFor } from './data';

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
  /**
   * The TAGS and lines that move it, as the player reads them: a Splash is
   * Area of Effect, a Pierce is Projectile. Empty for a word that is a stat
   * itself. Rendered under the meaning on every card that names the word.
   */
  scales: string[];
}

const pct = (n: number): string => `${Math.round(n * 100)}%`;

/** A tag as a line writes it; a stat name passes through untouched. */
const TAG_WORD: Record<string, string> = {
  attack: 'Attack', spell: 'Spell', melee: 'Melee', projectile: 'Projectile',
  area: 'Area of Effect', ailment: 'Ailment', overTime: 'Damage over Time',
  fire: 'Fire', cold: 'Cold', lightning: 'Lightning', physical: 'Physical',
  poison: 'Poison', dark: 'Dark', light: 'Light', damage: 'increased Damage',
};
export const scaleWord = (tag: string): string => TAG_WORD[tag] ?? AILMENT_BY_ID[tag]?.name ?? tag;

/**
 * An ailment's line, out of `AILMENTS` rather than quoted by hand — the table
 * the sim reads is the table the glossary prints, so the two cannot drift.
 */
function ailmentMeans(id: string): string {
  const a = AILMENT_BY_ID[id];
  const type = DAMAGE_TYPE_BY_ID[a.type]?.name ?? a.type;
  if (a.bySource) return 'Poison deals damage over time. You apply it through skills and effects that specifically inflict it. ' +
    'Its source determines its damage and duration. Poison ticks do not ' +
    'deal Critical damage. With Contagion, each tick uses your Critical Chance to try to spread Poison.';
  const applied = `${type} hits use your chance to apply ${a.name}. `;
  if (a.kind === 'chill') return applied +
    `Chill stacks normally last ${a.seconds}s. Each application Slows Attack and Cast Speed for ${a.seconds}s, ` +
    `based on the current stack count: ${a.slowPer}% per stack, up to 75%. ` +
    `Enemies normally Freeze at ${a.freezeAt} stacks for ${a.freezeSeconds}s: they cannot move, attack or cast, ` +
    'and their Chill stacks are removed. The next hit against that enemy is a guaranteed Critical, ' +
    'even while it is Frozen. ' +
    `You Freeze at ${MONSTER_AILMENT.freezeAt} stacks instead; protection against Chill raises this threshold.`;
  if (a.kind === 'curse') return applied +
    `By default, each stack lasts ${a.seconds}s. When a Cursed enemy dies, it deals Dark damage equal to ` +
    `${a.burstShare}% of its maximum Life per stack to other enemies within ${a.burstRadius} tiles.`;
  if (a.kind === 'exposure') return applied +
    `By default, each stack lasts ${a.seconds}s and causes ${a.takenPer}% increased damage taken from hits. ` +
    'Stack bonuses add together. Exposure does not increase damage taken from Ailment ticks.';
  const damage = `Each stack you apply deals ${a.dps} base ${type} damage per second for ${a.seconds}s, ` +
    'before Ailment damage and duration modifiers. ';
  return applied + damage + 'Spell Damage, Attack Damage and Critical Damage do not increase this damage.';
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
      'The standard Projectile use hits your target. Each additional Projectile hits a different ' +
      `enemy within ${PROJECTILE.spread} tiles of that target for full damage, before Spread modifiers. ` +
      'These direct hits do not hit the same enemy twice in one use. Splash and Bursts can overlap. ' +
      'Alternate skill modes can change this targeting and damage.',
    grants: ['extraTargets'],
    scales: ['projectile'],
  },
  {
    id: 'pierce',
    name: 'Pierce',
    says: ['Pierce', 'Pierces', 'Pierced'],
    means:
      'Allows a Projectile to hit additional enemies behind its target. Each Pierce adds one target ' +
      `within ${PROJECTILE.pierce} tiles beyond the original target and ${PROJECTILE.corridor} tiles ` +
      `either side of the shot's path. Each Pierced enemy takes ${pct(PROJECTILE.pierceDamage)} ` +
      'of the full hit damage unless a skill or modifier changes that share.',
    grants: ['pierce', 'pierceDamage'],
    scales: ['projectile'],
  },
  {
    id: 'arc',
    name: 'Arc',
    says: ['Arc', 'Arcs'],
    means:
      'Allows a Projectile to jump from the last enemy hit to the nearest enemy it has not hit, ' +
      `within ${PROJECTILE.arc} tiles. Each Arc adds one jump. By default, every Arc deals ` +
      `${pct(PROJECTILE.arcDamage)} of the full hit damage; this share does not decrease on each jump. ` +
      'Skills and modifiers can change the share or make successive Arcs stronger.',
    grants: ['chains', 'chainDamage'],
    scales: ['projectile'],
  },
  {
    id: 'fork',
    name: 'Fork',
    says: ['Fork', 'Forks'],
    means:
      'Each Fork creates a separate bolt that strikes an enemy near your original target, within ' +
      `${PROJECTILE.fork} tiles. It deals ${pct(PROJECTILE.forkDamage)} of the full hit damage unless ` +
      'modified. Forks choose the nearest enemies that the use has not already hit directly. ' +
      'They can strike in any direction from the original target.',
    grants: ['forks', 'forkDamage'],
    scales: ['projectile'],
  },
  {
    id: 'spread',
    name: 'Spread',
    says: ['Spread', 'Spreads'],
    means:
      'The distance from your original target within which additional Projectiles can choose enemies. ' +
      `The base distance is ${PROJECTILE.spread} tiles. Spread modifiers scale this distance directly; ` +
      'Area of Effect does not affect it.',
    grants: ['spreadRange'],
    scales: ['projectile'],
  },
  {
    id: 'repeat',
    name: 'Repeat',
    says: ['Repeat', 'Repeats'],
    means:
      'Each Repeat adds another attack within the same use, without another Mana cost. A standard ' +
      'melee Repeat hits your original target for full damage and stops if that target dies. ' +
      'Alternate modes can repeat the whole attack pattern, such as a spin or thrown blade.',
    grants: ['doubleStrike'],
    scales: ['attack', 'melee'],
  },
  {
    id: 'burst',
    name: 'Burst',
    says: ['Burst', 'Bursts'],
    means:
      'An instant circular effect. Damage Bursts hit nearby enemies; Contagion Bursts apply Poison. ' +
      'The source determines the trigger, damage and radius. Effects that make killed enemies Burst ' +
      `can chain through further kills for up to ${BURST.chainDepth} generations. Overlapping Bursts ` +
      'can affect the same enemy.',
    grants: ['burstOnHit', 'explodeOnKill', 'contagionRadius'],
    scales: ['area', 'damage'],
  },
  {
    id: 'splash',
    name: 'Splash',
    says: ['Splash', 'Splashes'],
    means:
      'A skill with Splash deals a share of its hit damage to other enemies in a circle around the ' +
      'enemy hit. The skill lists its base damage share and radius. Splash does not hit the central ' +
      'target again, but Splashes from separate hits can overlap.',
    grants: ['splashShare', 'splashRadius'],
    scales: ['area'],
  },
  {
    id: 'convert',
    name: 'Convert',
    says: ['Convert', 'Converts', 'Converted'],
    means:
      "A tree conversion changes the skill's base damage to the stated type. Damage-type and Ailment " +
      "modifiers in that skill's tree change to match. Gear modifiers keep their original types, and " +
      'added damage of other types remains unless a separate conversion applies. A conversion of ' +
      'a stated share moves only that share of the specified damage; the converted part scales with its new type.',
    grants: ['convertTree'],
    scales: [],
  },
  {
    id: 'echo',
    name: 'Echo',
    says: ['Echo', 'Echoes'],
    means:
      'Each Echo hits a different enemy near your original melee target, choosing the nearest first. ' +
      `By default, it deals ${pct(MELEE.echoDamage)} of the full hit damage. The first Echo can reach ` +
      `${MELEE.echo} tiles from the original target; each additional Echo extends this limit by ` +
      `${MELEE.echoStep} tiles. Echoes do not target the original enemy.`,
    grants: ['echoes', 'echoDamage'],
    scales: ['attack', 'melee'],
  },
  {
    id: 'cone',
    name: 'Cone',
    says: ['Cone', 'Cones'],
    means:
      'A wedge aimed toward your target. A standard Cone hit deals full damage to every enemy inside ' +
      'it, with no target limit. Reach determines its distance and angle determines its width. At ' +
      '360°, it covers every direction. Alternate modes can replace the wedge or its initial hit.',
    grants: ['coneArc', 'coneReach'],
    scales: ['area'],
  },
  {
    id: 'cloud',
    name: 'Cloud',
    says: ['Cloud', 'Clouds'],
    means:
      'A circular area that applies an Ailment to enemies inside it, with no target limit. An ordinary ' +
      'Blight Cloud applies Poison once when cast; the Poison then lasts for its own duration. Wandering ' +
      'Rot creates a moving Cloud that applies Poison repeatedly. Spore Burst replaces the Poison with a hit. ' +
      'Overlapping Clouds can affect the same enemy.',
    grants: ['extraFields', 'fieldRadius'],
    scales: ['area', 'ailment'],
  },

  // --- damage over time ----------------------------------------------------
  {
    id: 'ailment',
    name: 'Ailment',
    says: ['Ailment', 'Ailments'],
    means:
      'A temporary effect that deals damage over time or weakens a target. Your hits can apply the ' +
      'Ailment associated with their damage type; Poison requires a source that specifically applies it. ' +
      'Each 100% application chance guarantees one stack, with the remainder rolled for another. ' +
      `A target can carry ${AILMENT.maxStacks} Ailment stacks in total; a new stack replaces the oldest at the cap. ` +
      'Resistance reduces Ailment damage of the corresponding type. Armour does not normally reduce Ailment damage.',
    grants: ['ailmentChance', 'ailmentMultiplier', 'ailmentDuration', 'bleedOnHit', 'ailmentShare'],
    scales: ['ailment'],
  },
  {
    id: 'burn',
    name: 'Burn',
    says: ['Burn', 'Burns', 'Burning'],
    means: ailmentMeans('burn'),
    kin: 'ailment',
    scales: AILMENT_BY_ID.burn.tags ?? ['ailment'],
  },
  {
    id: 'bleed',
    name: 'Bleed',
    says: ['Bleed', 'Bleeds', 'Bleeding'],
    means: ailmentMeans('bleed'),
    kin: 'ailment',
    scales: AILMENT_BY_ID.bleed.tags ?? ['ailment'],
  },
  {
    id: 'poison',
    name: 'Poison',
    says: ['Poison', 'Poisons', 'Poisoned'],
    means: ailmentMeans('poison'),
    kin: 'ailment',
    scales: AILMENT_BY_ID.poison.tags ?? ['ailment'],
  },
  {
    id: 'chill',
    name: 'Chill',
    says: ['Chill', 'Chills', 'Chilled'],
    means: ailmentMeans('chill'),
    kin: 'ailment',
    scales: AILMENT_BY_ID.chill.tags ?? ['ailment'],
  },
  {
    id: 'shock',
    name: 'Shock',
    says: ['Shock', 'Shocks', 'Shocked'],
    means: ailmentMeans('shock'),
    kin: 'ailment',
    scales: AILMENT_BY_ID.shock.tags ?? ['ailment'],
  },
  {
    id: 'curse',
    name: 'Curse',
    says: ['Curse', 'Curses', 'Cursed'],
    means: ailmentMeans('curse'),
    kin: 'ailment',
    scales: AILMENT_BY_ID.curse.tags ?? ['ailment'],
  },
  {
    id: 'exposure',
    name: 'Exposure',
    says: ['Exposure', 'Expose', 'Exposes', 'Exposed'],
    means: ailmentMeans('exposure'),
    kin: 'ailment',
    scales: AILMENT_BY_ID.exposure.tags ?? ['ailment'],
  },

  // --- the stats every line leans on --------------------------------------
  {
    id: 'area',
    name: 'Area of Effect',
    says: ['Area of Effect'],
    means:
      'Scales the area covered by skill effects such as Splash, Clouds and skill-created Bursts. ' +
      'It also extends Cone reach. The bonus applies to area: 100% increased Area of Effect doubles ' +
      'the area and increases radius by about 41%. Area of Effect does not increase damage.',
    scales: [],
  },
  {
    id: 'increased',
    name: 'increased / reduced',
    says: ['increased', 'reduced'],
    means:
      'For stats with a base value, increased and reduced modifiers add together before multiplying ' +
      'that base, including flat additions. Two 50% increased modifiers give 100% increased, doubling ' +
      'the value. Reduced modifiers subtract from that total. Added chance bonuses, such as +10% ' +
      'chance to apply an Ailment, add percentage points instead.',
    scales: [],
  },
  {
    id: 'more',
    name: 'more / less',
    says: ['more', 'less'],
    means:
      'Separate more and less modifiers multiply. Two 50% more modifiers give 2.25 times the original ' +
      'value, or 125% more. A 40% less modifier multiplies the value by 0.6. Bonuses that a description ' +
      'says add together, such as bonuses per stack, are combined before their multiplier applies.',
    scales: [],
  },
  {
    id: 'critical',
    name: 'Critical',
    says: ['Critical', 'Critically', 'Criticals'],
    means:
      'A Critical hit normally deals 200% of its usual damage. Critical Damage adds to that total: ' +
      '+50% Critical Damage makes it 250%. Critical Chance determines how often a skill is Critical. ' +
      'Increased Critical Chance scales the base chance; 10% base chance with 50% increased becomes 15%. ' +
      'Ailment ticks do not deal Critical damage.',
    scales: ['Critical Chance', 'Critical Damage'],
  },
  {
    id: 'resistance',
    name: 'Resistance',
    says: ['Resistance', 'Resistances'],
    means:
      'Resistance reduces damage from the corresponding damage type, including damage over time. ' +
      `Each Resistance is capped at ${DEFENCE.resistanceCap}%. Resistance and Armour apply separately ` +
      'to hits: 50% damage reduction from each leaves you taking 25% of the incoming damage.',
    scales: [],
  },
  {
    id: 'block',
    name: 'Block',
    says: ['Block', 'Blocks', 'Blocked'],
    means:
      'Blocking prevents all damage from an ordinary enemy hit. ' +
      `Block Chance is capped at ${DEFENCE.blockCap}%. Ailment damage, boss room attacks and boss drains bypass Block.`,
    scales: [],
  },
  {
    id: 'dodge',
    name: 'Dodge',
    says: ['Dodge', 'Dodges', 'Dodged'],
    means:
      'Dodging avoids all damage from an ordinary enemy hit. ' +
      `Dodge Chance is capped at ${DEFENCE.dodgeCap}%. Ailment damage, boss room attacks and boss drains bypass Dodge. ` +
      'Converting Armour to Dodge removes the damage reduction that Armour would have provided.',
    grants: ['armourToDodge'],
    scales: [],
  },
  {
    id: 'armour',
    name: 'Armour',
    says: ['Armour'],
    means:
      'Armour reduces damage from hits of every damage type. Additional Armour gives diminishing ' +
      `returns, up to ${DEFENCE.armourCap}% damage reduction. Armour does not normally reduce Ailment ` +
      'damage and does not reduce boss drains.',
    scales: [],
  },

  // --- mana and flasks -----------------------------------------------------
  {
    id: 'starved',
    name: 'Starved',
    says: ['Starved'],
    means:
      'When you cannot pay the full Mana cost, you spend your remaining Mana and use the skill anyway. ' +
      `Starved hits deal ${pct(MANA.starvedDamage)} of their normal damage before modifiers to the penalty. ` +
      "An effect that pays the missing cost with Life prevents Starved. Blight's Poison bypasses this penalty.",
    grants: ['starvedDamage'],
    scales: [],
  },
  // --- what a movement skill does -----------------------------------------
  {
    id: 'slow',
    name: 'Slow',
    says: ['Slow', 'Slows', 'Slowed'],
    means:
      'Temporarily reduces Attack and Cast Speed by the amount stated on the effect. A 30% Slow ' +
      'makes attacks and casts occur at 70% of their normal rate. Slow deals no damage.',
    grants: ['landingSlow'],
    scales: [],
  },
  {
    id: 'charge',
    name: 'Charge',
    says: ['Charge', 'Charges'],
    means:
      `Each flask holds ${POTIONS[0]?.charges ?? 2} Charges, and each use spends one. Flasks start every ` +
      'descent with full Charges. Charge recovery effects can refill them during a descent, up to ' +
      'their capacity. Unspent Charges do not carry over as extras on the next descent.',
    grants: ['chargeRegen', 'chargeOnKill'],
    scales: [],
  },
  {
    /** A flask's Charge and a mover's Gust are two things, so they are two
     *  words: one word may only ever mean one mechanism. */
    id: 'gust',
    name: 'Gust',
    says: ['Gust', 'Gusts'],
    means:
      `Gale starts with ${SKILL_BY_ID.gale?.params?.gusts ?? 0} Gusts. Each grants ` +
      `${SKILL_BY_ID.gale?.params?.speed ?? 0}% more Movement Speed by default; these bonuses add together. ` +
      'Taking a hit removes one Gust and restarts the recovery timer. Boss drains remove Gusts too. ' +
      `One Gust returns every ${SKILL_BY_ID.gale?.params?.back ?? 0}s, up to your maximum. ` +
      'Gale talents can change these values or prevent Gust loss.',
    grants: ['gustSpeed', 'gustMax', 'gustBack'],
    scales: ['Movement Speed'],
  },
  {
    id: 'stun',
    name: 'Stun',
    says: ['Stun', 'Stuns', 'Stunned', 'Stunning'],
    means:
      'Prevents an enemy from moving, attacking or casting for the stated duration. If you have an ' +
      'effect that grants Stun, hits dealing a larger share of maximum Life have a higher Stun chance. ' +
      `Before Stun chance modifiers, a hit dealing 10% of maximum Life has about ${pct(stunChanceFor(0.1))} ` +
      `chance to Stun; a hit dealing 80% has about ${pct(stunChanceFor(0.8))}. Killing hits always trigger ` +
      'your Stun effects when you can Stun.',
    grants: ['stunSeconds', 'stunMore', 'stunBurst'],
    scales: ['attack'],
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
  'knocks out': 'Stun',
  stagger: 'Stun',
  staggers: 'Stun',
  // What the Reckoning was called while points came from authored trials. The
  // PHRASE, never the bare word: a trial is still an ordinary English word and
  // the Trials of a boss fight may yet want it.
  'trials web': 'the Reckoning',
  'the trials tree': 'the Reckoning',
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
