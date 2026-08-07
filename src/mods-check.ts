/**
 * Does every modifier actually DO what it says?
 *
 * Run it after any change to the mod tables, the stat pipeline, or a skill's
 * tags: `npm run mods`. It is not part of the fast loop — smoke and demo are —
 * because it exists for the class of bug that is silent by construction.
 *
 * The bugs it was written against, all of which shipped:
 *
 *   - `areaOfEffect` was claimed by a gear mod and two tree nodes and read by
 *     nothing at all. Rolling "of Reach" did literally nothing, forever, and
 *     no test could have noticed because the mod rolled, displayed and stacked
 *     exactly like a working one.
 *   - Every typed damage mod (fire, cold, lightning, ...) rendered as plain
 *     "+18% increased damage", because the describer ignored the stat line's
 *     tags. The mods were rolling perfectly; they were merely indistinguishable,
 *     which reads to a player as "elemental mods don't exist".
 *
 * The shape of both is the same: the data was fine and the wiring was not. So
 * these checks deliberately avoid asserting on the tables — they assert that
 * the engine RESPONDS to the tables, which is the part that silently rots.
 */
import {
  CRYSTAL_MODS,
  GEAR_BASES,
  GEAR_MODS,
  SKILLS,
  WEAPON_BASES,
} from './data';
import { ModPool, instantiate } from './mods';
import { makeItem, makeCrystal } from './economy';
import { heroStats, monsterStats, mapDensity } from './sim/stats';
import { describeMod } from './crafting';
import { Rng } from './rng';
import { MONSTER_BY_ID } from './data';
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
 * A probe item: fully open, so quality never masks a genuine gap.
 *
 * Every question below is "can this modifier exist here at all", and a Rough
 * item answers no to everything by definition. Asking it of a Brilliant one
 * keeps the check measuring the mod pool rather than measuring the quality
 * ladder — the ladder has its own checks in the demo.
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

  const crystal = makeCrystal(6);
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
// ---------------------------------------------------------------------------
//
// The heart of it. A mod is applied on its own and the resulting stats are
// compared with the same character carrying nothing. If NOTHING moves, the mod
// is decoration — which is exactly what "of Reach" was.
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
    const c = { ...makeCrystal(3), mods } as Item;
    const d = mapDensity(c);
    const m = monsterStats(c, 3, MONSTER_BY_ID.grub);
    return [
      d.packCount, d.packSize,
      m.maxLife, m.damage, m.critChance, m.moveSpeed, m.armour, m.armourReduction,
      (c.meta?.layoutComplexity as number) ?? 0,
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
