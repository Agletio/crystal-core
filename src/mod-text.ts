/**
 * Turning a rolled stat line into the sentence a player actually reads.
 *
 * This exists because the old one-liner printed `s.stat` raw, which had two
 * consequences that looked like content bugs rather than display bugs:
 *
 *   1. It ignored the line's TAGS. Fire, cold, melee and generic damage are
 *      all `stat: 'damage'` and differ only by tag, so six distinct mods all
 *      rendered as "+18% increased damage". The elemental mods were rolling
 *      fine the whole time — they were simply invisible.
 *   2. It printed identifiers. "increased attackSpeed", "+9 critMultiplier",
 *      "+12 fireRes" — camelCase leaking into the fiction.
 *
 * Both are fixed here rather than at the call sites, so anything that grows a
 * new stat or tag gets readable text for free.
 */
import { DAMAGE_TYPES, DAMAGE_GROUPS, DELIVERY_TAGS } from './data';
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
};

const titled = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/** Every tag that names a thing worth putting in front of "Damage". */
const TAG_WORDS: Record<string, string> = Object.fromEntries([
  ...DAMAGE_TYPES.map((t) => [t.id, t.name]),
  ...DAMAGE_GROUPS.map((g) => [g, titled(g)]),
  ...DELIVERY_TAGS.map((t) => [t, titled(t)]),
]);

/** `fireRes` → Fire, `occultRes` → Occult. Null when it isn't a resistance. */
function resistancePrefix(stat: string): string | null {
  if (!stat.endsWith('Res')) return null;
  const key = stat.slice(0, -3);
  return TAG_WORDS[key] ?? titled(key);
}

/**
 * The readable name of a stat on its own, before tags qualify it.
 * Falls back to splitting camelCase so a new stat is never unreadable, only
 * unpolished — which is the right way round for a table anyone can extend.
 */
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
 * What a line's tags add to the stat's name.
 *
 * A line tagged ['fire'] on `damage` is Fire Damage. Tags the player has no
 * word for are dropped rather than printed raw — an internal grouping tag
 * leaking into an item description is worse than saying nothing.
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
  const name = qualify(line.stat, line.tags);
  const sign = line.value >= 0 ? '+' : '';
  if (line.form === 'flat') return `${sign}${line.value} ${name}`;
  if (line.form === 'inc') return `${sign}${line.value}% increased ${name}`;
  return `${line.value}% more ${name}`;
}
