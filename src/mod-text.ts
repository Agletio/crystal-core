/**
 * Turning a rolled stat line into the sentence a player reads. It must never
 * print an identifier, and must never drop the line's TAGS: fire, cold, melee
 * and generic damage are all `stat: 'damage'` and differ only by tag.
 */
import {
  AILMENT_BY_ID,
  AILMENTS,
  ADDED_DAMAGE_TYPES,
  DAMAGE_TYPES,
  DAMAGE_TYPE_BY_ID,
  DAMAGE_GROUPS,
  DELIVERY_TAGS,
  DROP_GROUPS,
  findStat,
  monsterAddedStat,
  monsterResStat,
} from './data';
import type { StatRoll } from './types';

const titled = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Stats whose name is not simply their identifier with spaces. */
const NAMED: Record<string, string> = {
  damage: 'Damage',
  life: 'Life',
  lifeRegen: 'Life Regeneration',
  mana: 'Mana',
  manaRegen: 'Mana Regeneration',
  manaCost: 'Mana Cost',
  armour: 'Armour',
  attackSpeed: 'Attack Speed',
  castSpeed: 'Cast Speed',
  critChance: 'Critical Chance',
  critMultiplier: 'Critical Damage',
  blockChance: 'Block Chance',
  areaOfEffect: 'Area of Effect',
  moveSpeed: 'Movement Speed',
  attackRange: 'Attack Range',
  rarity: 'Rarity',
  currencyFind: 'Currency Find',
  packCount: 'Pack Count',
  packSize: 'Pack Size',
  layoutComplexity: 'Layout Complexity',
  monsterLife: 'Monster Life',
  monsterDamage: 'Monster Damage',
  monsterArmour: 'Monster Armour',
  monsterCrit: 'Monster Critical Chance',
  monsterMoveSpeed: 'Monster Movement Speed',
  ...Object.fromEntries(
    DAMAGE_TYPES.map((t) => [monsterResStat(t.id), `Monster ${t.name} Resistance`])
  ),
  // ADDED, said out loud, and in the order it happens: a share of what the
  // monster already hits for, dealt as this type on top. "Monster Fire Damage"
  // would still be describing the conversion this stopped being.
  ...Object.fromEntries(
    ADDED_DAMAGE_TYPES.map((t) => [
      monsterAddedStat(t),
      `Monster Damage Added as ${DAMAGE_TYPE_BY_ID[t]?.name ?? t}`,
    ])
  ),
  ...Object.fromEntries(DROP_GROUPS.map((g) => [findStat(g.id), `Chance to Find ${titled(g.id)}`])),
  ailmentChance: 'Chance to apply your Ailment',
};

/** Every tag that names a thing worth putting in front of "Damage". */
const TAG_WORDS: Record<string, string> = Object.fromEntries([
  ...DAMAGE_TYPES.map((t) => [t.id, t.name]),
  ...DAMAGE_GROUPS.map((g) => [g, titled(g)]),
  ...DELIVERY_TAGS.map((t) => [t, titled(t)]),
  ['attack', 'Attack'], // not in DELIVERY_TAGS: that list mints a mod per entry
  ['overTime', 'Damage over Time'],
  // Every ailment names itself, so "increased Burn Damage" and "increased
  // Bleed Damage" are two lines rather than two spellings of one.
  ...AILMENTS.map((a) => [a.id, a.name]),
]);

/** Null when nothing here can say it, which is what the mods check refuses. */
export const tagWord = (tag: string): string | null => TAG_WORDS[tag] ?? null;

/** A suffix, not a prefix: "Attack Damage" reads as a kind of damage. */
const FAMILY_WORDS: Record<string, string> = { attack: 'Attacks', spell: 'Spells' };

/** `fireRes` → Fire, `occultRes` → Occult. Null when it isn't a resistance. */
function resistancePrefix(stat: string): string | null {
  if (!stat.endsWith('Res')) return null;
  const key = stat.slice(0, -3);
  return TAG_WORDS[key] ?? titled(key);
}

/** Falls back to splitting camelCase, so a new stat is unpolished, not unreadable. */
export function statLabel(stat: string): string {
  const named = NAMED[stat];
  if (named) return named;

  const res = resistancePrefix(stat);
  if (res) return `${res} Resistance`;

  return stat
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * What a line's tags add: ['fire'] on `damage` is Fire Damage. Tags with no
 * player-facing word are dropped rather than printed raw.
 */
export function qualify(stat: string, tags: string[] = []): string {
  const base = statLabel(stat);
  // A resistance already names its type; tagging it again would stutter.
  if (resistancePrefix(stat)) return base;

  // The one stat whose tag reads AFTER it: "Chance to Bleed", not "Bleed Chance".
  if (stat === 'ailmentChance') {
    const named = tags.map((t) => AILMENT_BY_ID[t]).filter(Boolean);
    return named.length ? `Chance to ${named.map((a) => a.verb ?? a.name).join(' ')}` : base;
  }

  const words = tags.map((t) => TAG_WORDS[t]).filter(Boolean);
  return words.length ? `${words.join(' ')} ${base}` : base;
}

/**
 * A stat line split at the seam that matters. Two rolls of the same modifier
 * differ only in `value`, so colouring the two apart is how you find the good
 * number without reading the sentence.
 */
export interface StatParts {
  /** The rolled number, with its sign and its unit. */
  value: string;
  /** Everything that does not vary between two rolls of the same modifier. */
  label: string;
}

export function statParts(line: StatRoll): StatParts {
  const sign = line.value >= 0 ? '+' : '';
  const shown = String(Math.round(line.value * 100) / 100); // never float noise


  // Flat damage always names who can use it. A mace and a ring both grant
  // "+5 Physical Damage" and only one of them arms a spell.
  if (line.form === 'flat' && line.stat === 'damage') {
    const families = line.tags.filter((t) => FAMILY_WORDS[t]);
    const name = qualify(line.stat, line.tags.filter((t) => !FAMILY_WORDS[t]));
    const reach = families.length ? families : Object.keys(FAMILY_WORDS);
    return {
      value: `${sign}${shown}`,
      label: `${name} to ${reach.map((t) => FAMILY_WORDS[t]).join(' and ')}`,
    };
  }

  const name = qualify(line.stat, line.tags);
  if (line.form === 'flat') return { value: `${sign}${shown}`, label: name };
  if (line.form === 'inc') return { value: `${sign}${shown}%`, label: `increased ${name}` };
  return { value: `${shown}%`, label: `more ${name}` };
}

/** The same line as one run of text, for anywhere without room for markup. */
export function describeStatLine(line: StatRoll): string {
  const { value, label } = statParts(line);
  return `${value} ${label}`;
}
