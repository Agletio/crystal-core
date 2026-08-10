/**
 * Does every modifier actually DO what it says? Run after any change to the mod
 * tables, the stat pipeline, or a skill's tags.
 *
 * It exists for the bug class that is silent by construction: a stat nothing
 * reads, or a describer that drops tags. Both roll, display and stack exactly
 * like working mods. So nothing here asserts on the tables — it asserts the
 * engine RESPONDS to them, which is the part that rots.
 */
import {
  ALL_MODS,
  CRYSTAL_MODS,
  GEAR_BASES,
  GEAR_MODS,
  SKILLS,
  WEAPON_BASES,
} from './data';
import { ModPool, computeStat, instantiate } from './mods';
import { makeItem, makeCrystal } from './economy';
import { dropBias, heroStats, monsterStats, mapDensity } from './sim/stats';
import { describeMod } from './crafting';
import { describeStatLine, tagWord } from './mod-text';
import { treeFor } from './skills-tree';
import { Rng } from './rng';
import { DAMAGE_TYPES, MONSTER_BY_ID } from './data';
import type { Item, ModEntry, RolledMod } from './types';

let failures = 0;
const line = (s = ''): void => console.log(s);
const pass = (label: string): void => line(`  ok   ${label}`);
const fail = (label: string, detail: string): void => {
  failures++;
  line(`  FAIL ${label} — ${detail}`);
};
const check = (cond: boolean, label: string, detail = ''): void =>
  cond ? pass(label) : fail(label, detail);

const rng = new Rng(20260806);
const gearPool = new ModPool(GEAR_MODS);
const crystalPool = new ModPool(CRYSTAL_MODS);
const allBases = [...WEAPON_BASES, ...GEAR_BASES];

/** A mod rolled at its top value, so a weak roll can never read as "no effect". */
function maxRoll(entry: ModEntry): RolledMod {
  const mod = instantiate(entry, rng);
  mod.stats = mod.stats.map((s, i) => ({
    ...s,
    value: entry.stats[i].range[1],
  }));
  return mod;
}

/**
 * Fully open, so quality never masks a gap. Every question here is "can this
 * modifier exist at all", and a Rough item answers no to everything.
 */
const open = (item: Item): Item => ({
  ...item,
  ilvl: 100,
  meta: { ...item.meta, quality: 'brilliant' },
});

line('mods: does every modifier do what it says?\n');

// ---------------------------------------------------------------------------
line('── REACHABILITY — can each mod roll on anything at all? ────────');
// ---------------------------------------------------------------------------
{
  const orphans: string[] = [];
  for (const entry of gearPool.entries) {
    const rollable = allBases.some((b) =>
      gearPool.eligible(open(makeItem(b.id, 100)), { slot: entry.slot }).some((e) => e.id === entry.id)
    );
    if (!rollable) orphans.push(`${entry.id} (slot ${entry.slot})`);
  }
  check(
    orphans.length === 0,
    `all ${gearPool.entries.length} gear entries can roll on some base`,
    orphans.join(', ')
  );

  const crystal = makeCrystal(4);
  const crystalOrphans = crystalPool.entries.filter(
    (e) => !crystalPool.eligible(open(crystal)).some((c) => c.id === e.id)
  );
  check(
    crystalOrphans.length === 0,
    `all ${crystalPool.entries.length} crystal entries can roll on a crystal`,
    crystalOrphans.map((e) => e.id).join(', ')
  );
}

// ---------------------------------------------------------------------------
line('\n── EFFECT — does the engine actually read each stat? ───────────');
// The heart of it: a mod applied on its own, against a character carrying
// nothing. If NOTHING moves, the mod is decoration.
{
  /** Every number a hero's stat block exposes, flattened for comparison. */
  const heroFingerprint = (mods: RolledMod[]): string => {
    const parts: string[] = [];
    for (const skill of SKILLS) {
      const s = heroStats(mods, 30, skill);
      parts.push(
        [
          s.maxLife, s.damage, s.attacksPerSecond, s.critChance, s.critMultiplier,
          s.moveSpeed, s.armour, s.armourReduction, s.attackRange, s.lifeRegen,
          s.areaOfEffect, s.rarity, s.currencyFind,
          ...Object.values(s.resistances),
        ].join(',')
      );
    }
    return parts.join('|');
  };

  // A percentage mod needs something to be a percentage OF. Testing a bare
  // character would report "increased Armour" as broken when it is merely
  // waiting for armour — so the reference character carries one flat point of
  // everything a percentage could scale.
  const bedrock: RolledMod = {
    entryId: 'check_bedrock',
    defId: 'check_bedrock',
    group: 'check_bedrock',
    slot: 'defence',
    name: 'Bedrock',
    tier: 1,
    tags: [],
    stats: [{ stat: 'armour', form: 'flat', value: 100, tags: [] }],
  };

  /** Damage types no skill deals yet: an inert mod there is content, not a bug. */
  const dealt = new Set(SKILLS.flatMap((s) => s.damageTypes));
  const unusedType = (entry: ModEntry): string | null => {
    const types = entry.stats.flatMap((s) => s.tags ?? []).filter((t) => !dealt.has(t));
    // Only excuse it when EVERY line is gated behind an undealt type.
    const all = entry.stats.every((s) => (s.tags ?? []).some((t) => !dealt.has(t)));
    return all && types.length ? types[0] : null;
  };

  const baseline = heroFingerprint([bedrock]);
  const inert: string[] = [];
  const waiting: string[] = [];
  for (const entry of gearPool.entries) {
    if (heroFingerprint([bedrock, maxRoll(entry)]) !== baseline) continue;
    const excuse = unusedType(entry);
    if (excuse) waiting.push(`${entry.defId} (no skill deals ${excuse})`);
    else inert.push(entry.id);
  }
  check(
    inert.length === 0,
    `all ${gearPool.entries.length} gear entries change a stat the engine reads`,
    inert.join(', ')
  );

  // Reported, never silent: these are real mods a player can roll that do
  // nothing today, and the reason is a missing skill rather than broken wiring.
  if (waiting.length) {
    const families = [...new Set(waiting)];
    line(`  note dormant until a skill deals the type: ${families.length} families`);
    for (const w of families) line(`         ${w}`);
  }

  // Crystal mods land on monsters and on the map generator instead.
  const crystalFingerprint = (mods: RolledMod[]): string => {
    const d = mapDensity(mods);
    const m = monsterStats(mods, MONSTER_BY_ID.grub);
    return [
      d.packCount, d.packSize,
      m.maxLife, m.damage, m.critChance, m.moveSpeed, m.armour, m.armourReduction,
      // Per type: a ward hardens ONE of these, and a fingerprint that summed
      // them would call every ward inert.
      ...DAMAGE_TYPES.map((t) => m.resistances[t.id] ?? 0),
      computeStat(1, mods, 'layoutComplexity'),
      // What a run is pointed at is a thing the engine reads too: a crystal
      // that hunts weapons changes no monster and no room.
      ...Object.values(dropBias(mods)),
    ].join(',');
  };
  const crystalBase = crystalFingerprint([]);
  const inertCrystal = crystalPool.entries.filter(
    (e) => crystalFingerprint([maxRoll(e)]) === crystalBase
  );
  check(
    inertCrystal.length === 0,
    `all ${crystalPool.entries.length} crystal entries change something`,
    inertCrystal.map((e) => e.id).join(', ')
  );
}

// ---------------------------------------------------------------------------
line('\n── TAGS — does a typed mod scale ONLY its own type? ────────────');
// ---------------------------------------------------------------------------
//
// The other half of "does what it says". A fire mod that scales everything is
// as wrong as one that scales nothing, and far harder to notice.
{
  const fireSkill = SKILLS.find((s) => s.damageTypes.includes('fire'));
  const physSkill = SKILLS.find((s) => s.damageTypes.includes('physical'));

  if (!fireSkill || !physSkill) {
    fail('a fire skill and a physical skill exist to compare', 'skill table changed');
  } else {
    const dmg = (mods: RolledMod[], skill: typeof fireSkill): number =>
      heroStats(mods, 30, skill).damage;
    const fireMod = [maxRoll(gearPool.entries.find((e) => e.defId === 'inc_fire_damage')!)];
    const genericMod = [maxRoll(gearPool.entries.find((e) => e.defId === 'inc_damage_generic')!)];

    check(
      dmg(fireMod, fireSkill) > dmg([], fireSkill),
      'increased Fire Damage raises a fire skill'
    );
    check(
      dmg(fireMod, physSkill) === dmg([], physSkill),
      'and leaves a physical skill alone',
      `${dmg(fireMod, physSkill)} vs ${dmg([], physSkill)}`
    );
    check(
      dmg(genericMod, fireSkill) > dmg([], fireSkill) &&
        dmg(genericMod, physSkill) > dmg([], physSkill),
      'untagged increased Damage raises both'
    );
  }
}

// ---------------------------------------------------------------------------
line('\n── TEXT — does the player read words, not identifiers? ─────────');
// ---------------------------------------------------------------------------
//
// Guards the second shipped bug directly: raw stat ids leaking into item text,
// and typed damage mods all rendering identically.
{
  const leaks: string[] = [];
  const rendered = new Map<string, string[]>();

  for (const entry of [...gearPool.entries, ...crystalPool.entries]) {
    const text = describeMod(maxRoll(entry));
    // A camelCase run, or a bare stat id, means the describer fell through.
    if (/[a-z][A-Z]/.test(text)) leaks.push(`${entry.id}: ${text}`);
    const body = text.split('  (T')[0];
    rendered.set(body, [...(rendered.get(body) ?? []), entry.defId]);
  }
  check(leaks.length === 0, 'no camelCase identifiers reach the player', leaks.slice(0, 3).join(' | '));

  // A tag with no word is dropped in SILENCE, and a dropped tag is a lie: it
  // is the tag that decides whether the line does anything for the skill you
  // are holding. 'attack' had no word, so a mace's attack-only damage and a
  // ring's read as the same sentence.
  //
  // Everywhere, not just the pool: every flat typed damage line in the game is
  // a base implicit, which is precisely where nothing was looking.
  const wordless = new Set<string>();
  const seen = (lines: Array<{ tags?: string[] }>) => {
    for (const line of lines) {
      for (const tag of line.tags ?? []) if (!tagWord(tag)) wordless.add(tag);
    }
  };
  for (const mod of ALL_MODS) for (const tier of mod.tiers) seen(tier.stats);
  for (const base of GEAR_BASES) seen(base.implicit ?? []);
  for (const skill of SKILLS) {
    for (const node of treeFor(skill.id)) seen(node.stats ?? []);
  }
  check(
    wordless.size === 0,
    'every tag on every stat line has a word the player can read',
    `dropped in silence: ${[...wordless].join(', ')}`
  );

  // The general form of that bug: two lines that READ the same must BEHAVE the
  // same, because tags are the whole of how a line decides whether it applies.
  // Values are normalised out, so this compares wording against tags and
  // nothing else. A mace's attack-only damage and a ring's read identically
  // and only one of them arms a spell.
  const wording = new Map<string, Map<string, string[]>>();
  const record = (where: string, lines: Array<{ stat: string; form: string; tags?: string[] }>) => {
    for (const stat of lines) {
      const tags = [...(stat.tags ?? [])].sort();
      const text = describeStatLine({ stat: stat.stat, form: stat.form, value: 1, tags } as never);
      if (!wording.has(text)) wording.set(text, new Map());
      const byTags = wording.get(text)!;
      byTags.set(tags.join('+'), [...(byTags.get(tags.join('+')) ?? []), where]);
    }
  };
  for (const mod of ALL_MODS) for (const tier of mod.tiers) record(mod.id, tier.stats);
  for (const base of GEAR_BASES) record(base.id, base.implicit ?? []);
  for (const skill of SKILLS) {
    for (const node of treeFor(skill.id)) record(`${skill.id}/${node.id}`, node.stats ?? []);
  }
  const ambiguous = [...wording.entries()].filter(([, byTags]) => byTags.size > 1);
  check(
    ambiguous.length === 0,
    'and no two lines read alike while behaving differently',
    ambiguous
      .slice(0, 3)
      .map(([text, byTags]) =>
        `"${text}" is ${[...byTags.entries()].map(([t, w]) => `[${t}] on ${w[0]}`).join(' but ')}`
      )
      .join(' | ')
  );

  // Two DIFFERENT mod families producing identical text is the fire/cold bug.
  const collisions = [...rendered.entries()].filter(
    ([, ids]) => new Set(ids).size > 1
  );
  check(
    collisions.length === 0,
    'no two mod families render as the same line',
    collisions.slice(0, 3).map(([text, ids]) => `"${text}" ← ${[...new Set(ids)].join(', ')}`).join(' | ')
  );
}

// ---------------------------------------------------------------------------
line('\n── RESULT ─────────────────────────────────────────────────────');
// ---------------------------------------------------------------------------
if (failures > 0) {
  line(`  ✗ ${failures} check${failures === 1 ? '' : 's'} failed`);
  process.exit(1);
}
line('  ✓ every modifier rolls, does something, respects its tags, and reads');
