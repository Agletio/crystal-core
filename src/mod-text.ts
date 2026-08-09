/**
 * Turning a rolled stat line into the sentence a player reads. It must never
 * print an identifier, and must never drop the line's TAGS: fire, cold, melee
 * and generic damage are all `stat: 'damage'` and differ only by tag.
 */
import { DAMAGE_TYPES, DAMAGE_GROUPS, DELIVERY_TAGS, monsterResStat } from './data';
import type { StatRoll } from './types';

/** Stats whose name is not simply their identifier with spaces. */
const NAMED: Record<string, string> = {
  damage: 'Damage',
  life: 'Life',
  lifeRegen: 'Life Regeneration',
  armour: 'Armour',
  attackSpeed: 'Attack Speed',
  castSpeed: 'Cast Speed',
  critChance: 'Critical Chance',
  critMultiplier: 'Critical Damage',
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
  monsterFire: 'Monster Fire Damage',
  ...Object.fromEntries(
    DAMAGE_TYPES.map((t) => [monsterResStat(t.id), `Monster ${t.name} Resistance`])
  ),
};

const titled = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Every tag that names a thing worth putting in front of "Damage". */
const TAG_WORDS: Record<string, string> = Object.fromEntries([
  ...DAMAGE_TYPES.map((t) => [t.id, t.name]),
  ...DAMAGE_GROUPS.map((g) => [g, titled(g)]),
  ...DELIVERY_TAGS.map((t) => [t, titled(t)]),
  ['attack', 'Attack'], // not in DELIVERY_TAGS: that list mints a mod per entry
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

  const words = tags.map((t) => TAG_WORDS[t]).filter(Boolean);
  return words.length ? `${words.join(' ')} ${base}` : base;
}

/** One stat line, as text. */
export function describeStatLine(line: StatRoll): string {
  const sign = line.value >= 0 ? '+' : '';

  // Flat damage always names who can use it. A mace and a ring both grant
  // "+5 Physical Damage" and only one of them arms a spell.
  if (line.form === 'flat' && line.stat === 'damage') {
    const families = line.tags.filter((t) => FAMILY_WORDS[t]);
    const name = qualify(line.stat, line.tags.filter((t) => !FAMILY_WORDS[t]));
    const reach = families.length ? families : Object.keys(FAMILY_WORDS);
    return `${sign}${line.value} ${name} to ${reach.map((t) => FAMILY_WORDS[t]).join(' and ')}`;
  }

  const name = qualify(line.stat, line.tags);
  if (line.form === 'flat') return `${sign}${line.value} ${name}`;
  if (line.form === 'inc') return `${sign}${line.value}% increased ${name}`;
  return `${line.value}% more ${name}`;
}
