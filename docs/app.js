"use strict";
(() => {
  // src/rng.ts
  var Rng = class {
    state;
    constructor(seed3 = Date.now()) {
      this.state = seed3 >>> 0 || 2654435769;
    }
    /** Raw float in [0, 1). Every other method is built on this one. */
    next() {
      this.state = this.state + 1831565813 >>> 0;
      let t = this.state;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    /** Float in [lo, hi). */
    float(lo, hi) {
      return lo + this.next() * (hi - lo);
    }
    /** Integer in [lo, hi] — inclusive both ends, which is how mod ranges read. */
    int(lo, hi) {
      return Math.floor(this.float(lo, hi + 1));
    }
    /** True with probability p. p <= 0 is never, p >= 1 is always. */
    chance(p) {
      return this.next() < p;
    }
    /** Uniform pick. Undefined on an empty list — callers treat that as "nothing fits". */
    pick(items) {
      if (items.length === 0) return void 0;
      return items[this.int(0, items.length - 1)];
    }
    /**
     * Weighted pick. Non-positive weights are skipped, so an entry can be
     * disabled by zeroing its weight without removing it from the pool.
     */
    weighted(items, weightOf) {
      let total = 0;
      for (const item2 of items) {
        const w = weightOf(item2);
        if (w > 0) total += w;
      }
      if (total <= 0) return void 0;
      let roll = this.next() * total;
      for (const item2 of items) {
        const w = weightOf(item2);
        if (w <= 0) continue;
        roll -= w;
        if (roll < 0) return item2;
      }
      return items[items.length - 1];
    }
    /** Fisher-Yates, returns a new array. */
    shuffle(items) {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = this.int(0, i);
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    }
  };

  // src/mods.ts
  function slotTypes(item2) {
    return Object.keys(item2.slots);
  }
  function slotCapacity(item2, slot) {
    const base = item2.slots[slot] ?? 0;
    const bonus = item2.meta?.bonusSlots?.[slot] ?? 0;
    return base + bonus;
  }
  function slotUsed(item2, slot) {
    return item2.mods.filter((m) => m.slot === slot).length;
  }
  function hasOpenSlot(item2, slot) {
    const types = slot ? [slot] : slotTypes(item2);
    return types.some((t) => slotUsed(item2, t) < slotCapacity(item2, t));
  }
  function totalCapacity(item2) {
    return slotTypes(item2).reduce((n, t) => n + slotCapacity(item2, t), 0);
  }
  function fillState(item2) {
    if (item2.mods.length === 0) return "blank";
    return item2.mods.length >= totalCapacity(item2) ? "full" : "partial";
  }
  var ModPool = class {
    entries = [];
    constructor(defs = []) {
      for (const def of defs) this.add(def);
    }
    /** Flattens a mod family into one rollable entry per tier. */
    add(def) {
      def.tiers.forEach((t, i) => {
        const tier = i + 1;
        this.entries.push({
          id: `${def.id}_t${tier}`,
          defId: def.id,
          group: def.group ?? def.id,
          slot: def.slot,
          name: t.name ?? def.name,
          tier,
          ilvl: t.ilvl,
          weight: t.weight,
          appliesTo: def.appliesTo,
          tags: def.tags ?? [],
          stats: t.stats
        });
      });
    }
    /**
     * Everything that could legally roll on this item right now.
     * Filters on: item tags, item level, slot space, group exclusivity.
     */
    eligible(item2, opts = {}) {
      const takenGroups = new Set(item2.mods.map((m) => m.group));
      for (const g of opts.excludeGroups ?? []) takenGroups.add(g);
      return this.entries.filter((e) => {
        if (e.ilvl > item2.ilvl) return false;
        if (takenGroups.has(e.group)) return false;
        if (opts.slot && e.slot !== opts.slot) return false;
        if (opts.tag && !e.tags.includes(opts.tag)) return false;
        if (!e.appliesTo.every((t) => item2.tags.includes(t))) return false;
        if (slotUsed(item2, e.slot) >= slotCapacity(item2, e.slot)) return false;
        return true;
      });
    }
  };
  function rollValues(entry, rng2) {
    return entry.stats.map((s) => {
      const [lo, hi] = s.range;
      const isInt = Number.isInteger(lo) && Number.isInteger(hi);
      return {
        stat: s.stat,
        form: s.form,
        value: isInt ? rng2.int(lo, hi) : Number(rng2.float(lo, hi).toFixed(2)),
        tags: s.tags ?? []
      };
    });
  }
  function instantiate(entry, rng2) {
    return {
      entryId: entry.id,
      defId: entry.defId,
      group: entry.group,
      slot: entry.slot,
      name: entry.name,
      tier: entry.tier,
      tags: entry.tags,
      stats: rollValues(entry, rng2)
    };
  }
  function rollRandomMod(item2, pool2, rng2, opts = {}) {
    const candidates = pool2.eligible(item2, opts);
    const entry = rng2.weighted(candidates, (e) => e.weight);
    return entry ? instantiate(entry, rng2) : null;
  }
  function aggregate(mods, stat, contextTags = []) {
    const out = { flat: 0, inc: 0, more: [] };
    const ctx = new Set(contextTags);
    for (const mod of mods) {
      for (const line of mod.stats) {
        if (line.stat !== stat) continue;
        if (!line.tags.every((t) => ctx.has(t))) continue;
        if (line.form === "flat") out.flat += line.value;
        else if (line.form === "inc") out.inc += line.value;
        else out.more.push(line.value);
      }
    }
    return out;
  }
  function computeStat(base, mods, stat, contextTags = []) {
    const b = aggregate(mods, stat, contextTags);
    let v = (base + b.flat) * (1 + b.inc / 100);
    for (const m of b.more) v *= 1 + m / 100;
    return v;
  }

  // src/crafting.ts
  var CONDITIONS = {
    has_open_slot: (item2, p) => hasOpenSlot(item2, p.slot),
    slots_full: (item2, p) => !hasOpenSlot(item2, p.slot),
    has_slot_type: (item2, p) => slotCapacity(item2, p.slot) > 0,
    fill_state: (item2, p) => p.any.includes(fillState(item2)),
    mod_count: (item2, p) => {
      const n = p.slot ? slotUsed(item2, p.slot) : item2.mods.length;
      if (p.min !== void 0 && n < p.min) return false;
      if (p.max !== void 0 && n > p.max) return false;
      return true;
    },
    has_mod_tag: (item2, p) => item2.mods.some((m) => m.tags.includes(p.tag)),
    has_item_tag: (item2, p) => item2.tags.includes(p.tag),
    ilvl_at_least: (item2, p) => item2.ilvl >= p.value,
    not_corrupted: (item2) => item2.meta.corrupted !== true
  };
  var CONDITION_MESSAGES = {
    not_corrupted: "item is corrupted",
    has_open_slot: "no open slot",
    slots_full: "slots are not yet full",
    has_slot_type: "item has no such slot",
    mod_count: "wrong number of modifiers",
    fill_state: "wrong fill state"
  };
  function checkConditions(item2, conds = []) {
    const ordered = [...conds].sort(
      (a, b) => (a.kind === "not_corrupted" ? -1 : 0) - (b.kind === "not_corrupted" ? -1 : 0)
    );
    for (const c of ordered) {
      const impl = CONDITIONS[c.kind];
      if (!impl) return `unknown condition '${c.kind}'`;
      if (!impl(item2, c)) {
        return c.fail ?? CONDITION_MESSAGES[c.kind] ?? `condition '${c.kind}' not met`;
      }
    }
    return null;
  }
  function matching(mods, p) {
    return mods.filter((m) => {
      if (p.tag && !m.tags.includes(p.tag)) return false;
      if (p.slot && m.slot !== p.slot) return false;
      if (p.defId && m.defId !== p.defId) return false;
      return true;
    });
  }
  var EFFECTS = {
    /** Add one or more random mods. Optionally constrained by tag or slot. */
    add_mod: (ctx, p) => {
      const count = p.count ?? 1;
      let added = 0;
      for (let i = 0; i < count; i++) {
        const mod = rollRandomMod(ctx.item, ctx.pool, ctx.rng, {
          slot: p.slot,
          tag: p.tag
        });
        if (!mod) break;
        ctx.item.mods.push(mod);
        ctx.log.push(`+ ${describeMod(mod)}`);
        added++;
      }
      return added > 0;
    },
    /** Remove mods at random from the matching set. */
    remove_mod: (ctx, p) => {
      const count = p.count ?? 1;
      let removed = 0;
      for (let i = 0; i < count; i++) {
        const pool2 = matching(ctx.item.mods, p);
        const victim = ctx.rng.pick(pool2);
        if (!victim) break;
        ctx.item.mods.splice(ctx.item.mods.indexOf(victim), 1);
        ctx.log.push(`- ${describeMod(victim)}`);
        removed++;
      }
      return removed > 0;
    },
    /**
     * Coin-flip: empower or diminish every matching mod's values at once.
     * Unlike reroll_values this doesn't touch the authored ranges — it scales
     * whatever is already there, so a well-rolled item has more to lose. That
     * asymmetry is the whole point of pairing it with a lock.
     */
    scale_values: (ctx, p) => {
      const targets = matching(ctx.item.mods, p);
      if (targets.length === 0) return false;
      const magnitude = p.magnitude ?? 0.25;
      const up = ctx.rng.chance(p.upChance ?? 0.5);
      const factor = up ? 1 + magnitude : 1 - magnitude;
      for (const mod of targets) {
        mod.stats = mod.stats.map((s) => ({ ...s, value: scaleValue(s.value, factor) }));
      }
      ctx.log.push(
        `${up ? "empowered" : "diminished"} ${targets.length} mod(s) by ${Math.round(magnitude * 100)}%`
      );
      return true;
    },
    /** Re-roll the numeric values of existing mods, keeping which mods they are. */
    reroll_values: (ctx, p) => {
      const targets = matching(ctx.item.mods, p);
      if (targets.length === 0) return false;
      for (const mod of targets) {
        const entry = ctx.pool.entries.find((e) => e.id === mod.entryId);
        if (entry) mod.stats = rollValues(entry, ctx.rng);
      }
      ctx.log.push(`re-rolled values on ${targets.length} mod(s)`);
      return true;
    },
    /** Wipe all mods and roll a fresh set of the same size. */
    reroll_mods: (ctx, p) => {
      const had = ctx.item.mods.length;
      if (had === 0) return false;
      ctx.item.mods = [];
      fillAll(ctx, p?.slot, had);
      ctx.log.push("re-rolled all modifiers");
      return true;
    },
    clear_mods: (ctx) => {
      if (ctx.item.mods.length === 0) return false;
      ctx.item.mods = [];
      ctx.log.push("stripped all modifiers");
      return true;
    },
    /** Fill every empty slot on the item. */
    fill_slots: (ctx, p) => {
      const before = ctx.item.mods.length;
      fillAll(ctx, p?.slot);
      return ctx.item.mods.length > before;
    },
    /** Grant a bonus slot beyond what the base declares. */
    add_slot: (ctx, p) => {
      const slot = p.slot ?? slotTypes(ctx.item)[0];
      if (!slot) return false;
      ctx.item.meta.bonusSlots ??= {};
      ctx.item.meta.bonusSlots[slot] = (ctx.item.meta.bonusSlots[slot] ?? 0) + (p.count ?? 1);
      ctx.log.push(`+${p.count ?? 1} ${slot} slot`);
      return true;
    },
    /** Upgrade a matching mod to a better tier of the same family. */
    upgrade_mod_tier: (ctx, p) => {
      const pool2 = matching(ctx.item.mods, p).filter((m) => m.tier > 1);
      const target = ctx.rng.pick(pool2);
      if (!target) return false;
      const better = ctx.pool.entries.find(
        (e) => e.defId === target.defId && e.tier === target.tier - 1
      );
      if (!better || better.ilvl > ctx.item.ilvl) return false;
      const idx = ctx.item.mods.indexOf(target);
      ctx.item.mods[idx] = instantiate(better, ctx.rng);
      ctx.log.push(`^ ${describeMod(ctx.item.mods[idx])}`);
      return true;
    },
    /** Irreversibly lock the item. Demonstrates a meta-flag effect. */
    corrupt: (ctx) => {
      ctx.item.meta.corrupted = true;
      ctx.log.push("item is now corrupted");
      return true;
    },
    set_meta: (ctx, p) => {
      ctx.item.meta[p.key] = p.value;
      ctx.log.push(`${p.key} = ${String(p.value)}`);
      return true;
    }
  };
  function scaleValue(value, factor) {
    const scaled = value * factor;
    if (!Number.isInteger(value)) return Number(scaled.toFixed(2));
    const rounded = Math.round(scaled);
    if (rounded === 0 && value !== 0) return value < 0 ? -1 : 1;
    return rounded;
  }
  function fillAll(ctx, slot, limit = Infinity) {
    let guard = 32;
    while (ctx.item.mods.length < limit && guard-- > 0) {
      const mod = rollRandomMod(ctx.item, ctx.pool, ctx.rng, { slot });
      if (!mod) break;
      ctx.item.mods.push(mod);
      ctx.log.push(`+ ${describeMod(mod)}`);
    }
  }
  function canApply(item2, currency) {
    const t = currency.targets;
    if (t.kinds && !t.kinds.includes(item2.kind)) {
      return `${currency.name} cannot be used on ${item2.kind}`;
    }
    if (t.slots && !t.slots.some((s) => slotCapacity(item2, s) > 0)) {
      return `${currency.name} requires a ${t.slots.join(" or ")} slot`;
    }
    if (t.tags && !t.tags.every((tag) => item2.tags.includes(tag))) {
      return `${currency.name} requires ${t.tags.join(", ")}`;
    }
    return checkConditions(item2, currency.requires);
  }
  function clone(item2) {
    return {
      ...item2,
      tags: [...item2.tags],
      slots: { ...item2.slots },
      mods: item2.mods.map((m) => ({
        ...m,
        tags: [...m.tags],
        stats: m.stats.map((s) => ({ ...s, tags: [...s.tags] }))
      })),
      meta: JSON.parse(JSON.stringify(item2.meta ?? {}))
    };
  }
  function craft(item2, currency, pool2, rng2) {
    const blocked = canApply(item2, currency);
    if (blocked) return { ok: false, item: item2, log: [], error: blocked };
    const ctx = { item: clone(item2), pool: pool2, rng: rng2, log: [] };
    for (const effect of currency.effects) {
      const impl = EFFECTS[effect.kind];
      if (!impl) {
        return { ok: false, item: item2, log: [], error: `unknown effect '${effect.kind}'` };
      }
      const worked = impl(ctx, effect);
      if (!worked && effect.optional !== true) {
        return {
          ok: false,
          item: item2,
          log: [],
          error: `${currency.name} had no effect`
        };
      }
    }
    return { ok: true, item: ctx.item, log: ctx.log };
  }
  function describeMod(mod) {
    const lines = mod.stats.map((s) => {
      const sign = s.value >= 0 ? "+" : "";
      if (s.form === "flat") return `${sign}${s.value} ${s.stat}`;
      if (s.form === "inc") return `${sign}${s.value}% increased ${s.stat}`;
      return `${s.value}% more ${s.stat}`;
    }).join(", ");
    return `${lines}  (T${mod.tier} ${mod.name})`;
  }

  // src/data.ts
  var CRYSTAL_SLOTS = { mod: 3 };
  var GEAR_SLOTS = { main: 2, secondary: 2 };
  var CRYSTAL_MODS = [
    {
      id: "pack_size",
      slot: "mod",
      name: "Teeming",
      appliesTo: ["crystal"],
      tags: ["density", "quantity"],
      tiers: [
        { ilvl: 60, weight: 200, stats: [{ stat: "packSize", form: "inc", range: [30, 40] }], name: "Swarming" },
        { ilvl: 30, weight: 600, stats: [{ stat: "packSize", form: "inc", range: [18, 28] }], name: "Teeming" },
        { ilvl: 1, weight: 1e3, stats: [{ stat: "packSize", form: "inc", range: [8, 16] }], name: "Crowded" }
      ]
    },
    {
      id: "pack_count",
      slot: "mod",
      name: "Sprawling",
      appliesTo: ["crystal"],
      tags: ["density"],
      tiers: [
        { ilvl: 45, weight: 300, stats: [{ stat: "packCount", form: "inc", range: [20, 30] }] },
        { ilvl: 1, weight: 800, stats: [{ stat: "packCount", form: "inc", range: [8, 18] }] }
      ]
    },
    {
      id: "item_rarity",
      slot: "mod",
      name: "Gilded",
      appliesTo: ["crystal"],
      tags: ["reward"],
      tiers: [
        { ilvl: 50, weight: 250, stats: [{ stat: "itemRarity", form: "inc", range: [40, 60] }] },
        { ilvl: 1, weight: 900, stats: [{ stat: "itemRarity", form: "inc", range: [15, 30] }] }
      ]
    },
    {
      id: "fragment_yield",
      slot: "mod",
      name: "Fractured",
      appliesTo: ["crystal"],
      tags: ["reward", "sustain"],
      tiers: [
        { ilvl: 40, weight: 300, stats: [{ stat: "fragmentYield", form: "inc", range: [25, 40] }] },
        { ilvl: 1, weight: 800, stats: [{ stat: "fragmentYield", form: "inc", range: [10, 20] }] }
      ]
    },
    {
      id: "monster_damage",
      slot: "mod",
      name: "of Ferocity",
      appliesTo: ["crystal"],
      tags: ["danger"],
      tiers: [
        { ilvl: 40, weight: 400, stats: [{ stat: "monsterDamage", form: "inc", range: [35, 50] }] },
        { ilvl: 1, weight: 900, stats: [{ stat: "monsterDamage", form: "inc", range: [15, 30] }] }
      ]
    },
    {
      id: "monster_life",
      slot: "mod",
      name: "of Resilience",
      appliesTo: ["crystal"],
      tags: ["danger"],
      tiers: [
        { ilvl: 40, weight: 400, stats: [{ stat: "monsterLife", form: "inc", range: [30, 45] }] },
        { ilvl: 1, weight: 900, stats: [{ stat: "monsterLife", form: "inc", range: [12, 25] }] }
      ]
    },
    {
      id: "monster_speed",
      slot: "mod",
      name: "of Swiftness",
      appliesTo: ["crystal"],
      tags: ["danger"],
      tiers: [
        { ilvl: 1, weight: 700, stats: [{ stat: "monsterMoveSpeed", form: "inc", range: [10, 22] }] }
      ]
    },
    {
      id: "layout_maze",
      slot: "mod",
      name: "of Winding Ways",
      appliesTo: ["crystal"],
      tags: ["layout"],
      tiers: [
        {
          ilvl: 1,
          weight: 500,
          stats: [
            { stat: "layoutComplexity", form: "inc", range: [25, 45] },
            { stat: "packCount", form: "inc", range: [10, 15] }
          ]
        }
      ]
    }
  ];
  var GEAR_MAIN_MODS = [
    {
      id: "flat_life",
      slot: "main",
      name: "of the Bear",
      appliesTo: ["gear"],
      tags: ["life", "defence"],
      tiers: [
        { ilvl: 60, weight: 300, stats: [{ stat: "life", form: "flat", range: [70, 90] }] },
        { ilvl: 30, weight: 700, stats: [{ stat: "life", form: "flat", range: [40, 60] }] },
        { ilvl: 1, weight: 1e3, stats: [{ stat: "life", form: "flat", range: [15, 30] }] }
      ]
    },
    {
      id: "armour",
      slot: "main",
      name: "Plated",
      appliesTo: ["gear"],
      tags: ["defence"],
      tiers: [
        { ilvl: 50, weight: 350, stats: [{ stat: "armour", form: "flat", range: [90, 140] }] },
        { ilvl: 1, weight: 900, stats: [{ stat: "armour", form: "flat", range: [20, 60] }] }
      ]
    },
    {
      id: "inc_phys_damage",
      slot: "main",
      name: "Heavy",
      appliesTo: ["gear"],
      tags: ["damage", "physical"],
      tiers: [
        { ilvl: 55, weight: 250, stats: [{ stat: "damage", form: "inc", range: [60, 80], tags: ["physical"] }] },
        { ilvl: 1, weight: 900, stats: [{ stat: "damage", form: "inc", range: [20, 40], tags: ["physical"] }] }
      ]
    },
    {
      id: "flat_fire_damage",
      slot: "main",
      name: "Smouldering",
      appliesTo: ["gear"],
      tags: ["damage", "fire", "elemental"],
      tiers: [
        { ilvl: 45, weight: 400, stats: [{ stat: "damage", form: "flat", range: [12, 24], tags: ["fire"] }] },
        { ilvl: 1, weight: 900, stats: [{ stat: "damage", form: "flat", range: [3, 8], tags: ["fire"] }] }
      ]
    },
    {
      id: "flat_cold_damage",
      slot: "main",
      name: "Frostbound",
      appliesTo: ["gear"],
      tags: ["damage", "cold", "elemental"],
      tiers: [
        { ilvl: 45, weight: 400, stats: [{ stat: "damage", form: "flat", range: [10, 20], tags: ["cold"] }] },
        { ilvl: 1, weight: 900, stats: [{ stat: "damage", form: "flat", range: [2, 7], tags: ["cold"] }] }
      ]
    }
  ];
  var GEAR_SECONDARY_MODS = [
    {
      id: "move_speed",
      slot: "secondary",
      name: "of the Wind",
      appliesTo: ["gear"],
      tags: ["speed", "clear"],
      tiers: [
        { ilvl: 50, weight: 150, stats: [{ stat: "moveSpeed", form: "inc", range: [25, 30] }] },
        { ilvl: 20, weight: 400, stats: [{ stat: "moveSpeed", form: "inc", range: [15, 24] }] },
        { ilvl: 1, weight: 700, stats: [{ stat: "moveSpeed", form: "inc", range: [5, 14] }] }
      ]
    },
    {
      id: "attack_speed",
      slot: "secondary",
      name: "of Alacrity",
      appliesTo: ["gear"],
      tags: ["speed", "damage"],
      tiers: [
        { ilvl: 40, weight: 300, stats: [{ stat: "attackSpeed", form: "inc", range: [14, 20] }] },
        { ilvl: 1, weight: 800, stats: [{ stat: "attackSpeed", form: "inc", range: [5, 12] }] }
      ]
    },
    {
      id: "pickup_radius",
      slot: "secondary",
      name: "of Gathering",
      appliesTo: ["gear"],
      tags: ["utility", "clear"],
      tiers: [
        { ilvl: 1, weight: 500, stats: [{ stat: "pickupRadius", form: "inc", range: [20, 45] }] }
      ]
    },
    {
      id: "aoe",
      slot: "secondary",
      name: "of Reach",
      appliesTo: ["gear"],
      tags: ["area", "clear"],
      tiers: [
        { ilvl: 35, weight: 250, stats: [{ stat: "areaOfEffect", form: "inc", range: [18, 26] }] },
        { ilvl: 1, weight: 600, stats: [{ stat: "areaOfEffect", form: "inc", range: [6, 15] }] }
      ]
    },
    {
      id: "crit_chance",
      slot: "secondary",
      name: "of Precision",
      appliesTo: ["gear"],
      tags: ["crit", "damage"],
      tiers: [
        { ilvl: 45, weight: 250, stats: [{ stat: "critChance", form: "inc", range: [30, 45] }] },
        { ilvl: 1, weight: 700, stats: [{ stat: "critChance", form: "inc", range: [10, 25] }] }
      ]
    }
  ];
  var GEAR_MODS = [...GEAR_MAIN_MODS, ...GEAR_SECONDARY_MODS];
  var ALL_MODS = [...CRYSTAL_MODS, ...GEAR_MODS];
  var CURRENCIES = [
    // --- basic: the ones that become effectively infinite ------------------
    {
      id: "shard_of_making",
      name: "Shard of Making",
      class: "basic",
      description: "Fills one empty slot with a random modifier.",
      targets: {},
      requires: [{ kind: "not_corrupted" }, { kind: "has_open_slot" }],
      effects: [{ kind: "add_mod", count: 1 }]
    },
    {
      id: "shard_of_unmaking",
      name: "Shard of Unmaking",
      class: "basic",
      description: "Removes one modifier at random.",
      targets: {},
      requires: [{ kind: "not_corrupted" }, { kind: "mod_count", min: 1 }],
      effects: [{ kind: "remove_mod", count: 1 }]
    },
    {
      id: "shard_of_change",
      name: "Shard of Change",
      class: "basic",
      description: "Re-rolls the numeric values of all modifiers.",
      targets: {},
      requires: [{ kind: "not_corrupted" }, { kind: "mod_count", min: 1 }],
      effects: [{ kind: "reroll_values" }]
    },
    {
      id: "shard_of_awakening",
      name: "Shard of Awakening",
      class: "basic",
      description: "Fills every empty slot at once.",
      targets: {},
      requires: [{ kind: "not_corrupted" }, { kind: "has_open_slot" }],
      effects: [{ kind: "fill_slots" }]
    },
    {
      id: "shard_of_chaos",
      name: "Shard of Chaos",
      class: "basic",
      description: "Re-rolls every modifier, keeping the same number of them.",
      targets: {},
      requires: [{ kind: "not_corrupted" }, { kind: "mod_count", min: 1 }],
      effects: [{ kind: "reroll_mods" }]
    },
    // --- specialised: the ones you actually care about later ---------------
    {
      id: "essence_of_the_swarm",
      name: "Essence of the Swarm",
      class: "uncommon",
      description: "Fills a slot with a guaranteed Density modifier.",
      targets: { kinds: ["crystal"] },
      requires: [{ kind: "not_corrupted" }, { kind: "has_open_slot" }],
      effects: [{ kind: "add_mod", tag: "density" }]
    },
    {
      id: "essence_of_greed",
      name: "Essence of Greed",
      class: "uncommon",
      description: "Fills a slot with a guaranteed Reward modifier.",
      targets: { kinds: ["crystal"] },
      requires: [{ kind: "not_corrupted" }, { kind: "has_open_slot" }],
      effects: [{ kind: "add_mod", tag: "reward" }]
    },
    {
      id: "whetstone_of_might",
      name: "Whetstone of Might",
      class: "uncommon",
      description: "Fills a main slot with a guaranteed Damage modifier.",
      targets: { kinds: ["gear"], slots: ["main"] },
      requires: [{ kind: "not_corrupted" }, { kind: "has_open_slot", slot: "main" }],
      effects: [{ kind: "add_mod", slot: "main", tag: "damage" }]
    },
    {
      id: "oil_of_swiftness",
      name: "Oil of Swiftness",
      class: "uncommon",
      description: "Fills a secondary slot with a guaranteed Speed modifier.",
      targets: { kinds: ["gear"], slots: ["secondary"] },
      requires: [
        { kind: "not_corrupted" },
        { kind: "has_open_slot", slot: "secondary" }
      ],
      effects: [{ kind: "add_mod", slot: "secondary", tag: "speed" }]
    },
    {
      id: "sigil_of_refinement",
      name: "Sigil of Refinement",
      class: "rare",
      description: "Upgrades one modifier to a higher tier.",
      targets: {},
      requires: [{ kind: "not_corrupted" }, { kind: "mod_count", min: 1 }],
      effects: [{ kind: "upgrade_mod_tier" }]
    },
    {
      id: "sigil_of_excess",
      name: "Sigil of Excess",
      class: "exotic",
      description: "Grants one slot beyond the base limit. Only on a full item.",
      targets: {},
      requires: [{ kind: "not_corrupted" }, { kind: "slots_full" }],
      effects: [{ kind: "add_slot", count: 1 }]
    },
    {
      id: "sigil_of_finality",
      name: "Sigil of Finality",
      class: "exotic",
      description: "Empowers or diminishes every modifier by 25% at random, then locks the item permanently.",
      targets: {},
      requires: [{ kind: "not_corrupted" }],
      // A coin flip you can't take back. Scaling what's already rolled (rather
      // than adding) means the better the item, the more the gamble costs you —
      // so finishing a good item is a real decision instead of a free upgrade.
      effects: [
        { kind: "scale_values", magnitude: 0.25, optional: true },
        { kind: "corrupt" }
      ]
    },
    {
      // Deliberately exotic and drop-only. As a cheap basic this was the single
      // biggest thing devaluing bases: any good chest could be spammed back to
      // blank and re-rolled for free, so no base was ever worth keeping. Making
      // a wipe scarce is what gives a well-rolled base its weight.
      id: "shard_of_ruin",
      name: "Shard of Ruin",
      class: "exotic",
      description: "Strips every modifier, emptying all slots. Rare \u2014 spend it carefully.",
      targets: {},
      requires: [{ kind: "not_corrupted" }, { kind: "mod_count", min: 1 }],
      effects: [{ kind: "clear_mods" }]
    }
  ];
  var CURRENCY_BY_ID = Object.fromEntries(
    CURRENCIES.map((c) => [c.id, c])
  );
  var CRYSTAL_TIERS = [
    { tier: 1, ilvl: 10, fragments: 8 },
    { tier: 2, ilvl: 22, fragments: 20 },
    { tier: 3, ilvl: 34, fragments: 45 },
    { tier: 4, ilvl: 46, fragments: 95 },
    { tier: 5, ilvl: 58, fragments: 190 },
    { tier: 6, ilvl: 70, fragments: 370 }
  ];
  var HERO_BASE = {
    life: 240,
    /** Physical damage per hit before gear. Elemental damage is gear-only. */
    weaponDamage: 55,
    attacksPerSecond: 1.2,
    critChance: 5,
    moveSpeed: 3.4,
    armour: 0,
    attackRange: 1.7,
    /** How far the hero will notice a monster and divert to fight it. */
    aggroRange: 9,
    /** Percent of max life per second. Recovery happens between packs, which
     *  is what turns a run into a series of fights instead of one long
     *  attrition curve you always lose. */
    lifeRegenPercent: 2.2
  };
  var MONSTER_BASE = {
    life: 26,
    damage: 1.9,
    attacksPerSecond: 0.8,
    moveSpeed: 2.3,
    attackRange: 1.3,
    aggroRange: 8
  };
  var MONSTER_TIER_SCALE = { life: 1.5, damage: 1.32 };
  var RECIPES = [
    ...CRYSTAL_TIERS.map((t) => ({
      id: `crystal_t${t.tier}`,
      name: `Tier ${t.tier} Crystal`,
      inputs: { fragment: t.fragments },
      output: { type: "item", base: `crystal_t${t.tier}`, qty: 1 }
    })),
    {
      id: "make_shard_of_making",
      name: "Shard of Making",
      inputs: { fragment: 5 },
      output: { type: "currency", id: "shard_of_making", qty: 1 }
    },
    {
      id: "make_shard_of_unmaking",
      name: "Shard of Unmaking",
      inputs: { fragment: 7 },
      output: { type: "currency", id: "shard_of_unmaking", qty: 1 }
    },
    {
      id: "make_shard_of_change",
      name: "Shard of Change",
      inputs: { fragment: 3 },
      output: { type: "currency", id: "shard_of_change", qty: 1 }
    },
    {
      id: "make_shard_of_awakening",
      name: "Shard of Awakening",
      inputs: { fragment: 10 },
      output: { type: "currency", id: "shard_of_awakening", qty: 1 }
    },
    // No recipe for Shard of Ruin — it's exotic and drop-only. If you could buy
    // a wipe for fragments, bases would be disposable again.
    {
      id: "make_shard_of_chaos",
      name: "Shard of Chaos",
      inputs: { fragment: 12 },
      output: { type: "currency", id: "shard_of_chaos", qty: 1 }
    }
  ];

  // src/economy.ts
  var nextId = 1;
  var uid = (p) => `${p}_${nextId++}`;
  function makeCrystal(tier) {
    const def = CRYSTAL_TIERS.find((t) => t.tier === tier);
    if (!def) throw new Error(`no crystal tier ${tier}`);
    return {
      id: uid("crystal"),
      kind: "crystal",
      base: `crystal_t${tier}`,
      name: `Tier ${tier} Crystal`,
      tags: ["crystal", `tier${tier}`],
      ilvl: def.ilvl,
      slots: { ...CRYSTAL_SLOTS },
      mods: [],
      meta: { tier }
    };
  }
  function makeGear(base, ilvl, name) {
    return {
      id: uid("gear"),
      kind: "gear",
      base,
      name: name ?? base,
      tags: ["gear", base],
      ilvl,
      slots: { ...GEAR_SLOTS },
      mods: [],
      meta: {}
    };
  }
  var RECIPE_BY_ID = Object.fromEntries(
    RECIPES.map((r) => [r.id, r])
  );

  // src/ui/bench.ts
  var pool = new ModPool(ALL_MODS);
  var seed = Math.floor(Math.random() * 1e9);
  var rng = new Rng(seed);
  var item = makeCrystal(3);
  var log = [];
  var focused = null;
  function currentItem() {
    return item;
  }
  var BENCH_ITEMS = [
    ...CRYSTAL_TIERS.map((t) => ({
      label: `Crystal T${t.tier}`,
      make: () => makeCrystal(t.tier)
    })),
    { label: "Body Armour", make: () => makeGear("body_armour", 55, "Runeplate") },
    { label: "Ring", make: () => makeGear("ring", 40, "Band of Ash") }
  ];
  var TAG_COLOURS = [
    ["density", "amethyst"],
    ["reward", "citrine"],
    ["danger", "ember"],
    ["layout", "quartz"],
    ["damage", "ember"],
    ["defence", "quartz"],
    ["speed", "verdite"],
    ["clear", "verdite"],
    ["crit", "citrine"],
    ["utility", "verdite"]
  ];
  function facetOf(mod) {
    for (const [tag, colour] of TAG_COLOURS) {
      if (mod.tags.includes(tag)) return colour;
    }
    return "quartz";
  }
  function use(currency) {
    const result = craft(item, currency, pool, rng);
    if (!result.ok) {
      log.unshift({ text: `${currency.name} \u2014 ${result.error}`, kind: "fail" });
      render();
      return;
    }
    log.unshift({ text: currency.name, kind: "note" });
    for (const entry of result.log) {
      const kind = entry.startsWith("-") ? "remove" : "add";
      log.unshift({ text: entry, kind });
    }
    item = result.item;
    render();
  }
  function loadBase(index) {
    item = BENCH_ITEMS[index].make();
    focused = null;
    log.unshift({ text: `Loaded ${item.name}`, kind: "note" });
    render();
  }
  function reseed() {
    seed = Math.floor(Math.random() * 1e9);
    rng = new Rng(seed);
    log.unshift({ text: `Seed ${seed}`, kind: "note" });
    render();
  }
  var $ = (id) => document.getElementById(id);
  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== void 0) node.textContent = text;
    return node;
  }
  function renderBases() {
    const host = $("bases");
    host.replaceChildren();
    BENCH_ITEMS.forEach((base, i) => {
      const btn = el("button", "chip", base.label);
      if (base.label === item.name || item.name.startsWith(base.label)) {
        btn.classList.add("chip--on");
      }
      btn.onclick = () => loadBase(i);
      host.append(btn);
    });
  }
  function renderItem() {
    $("item-name").textContent = item.name;
    $("item-meta").textContent = `ilvl ${item.ilvl} \xB7 ${fillState(item)}` + (item.meta.corrupted ? " \xB7 locked" : "");
    $("item-name").classList.toggle("locked", !!item.meta.corrupted);
    const host = $("sockets");
    host.replaceChildren();
    for (const slot of slotTypes(item)) {
      const group = el("div", "slotgroup");
      const cap = slotCapacity(item, slot);
      group.append(el("div", "slotgroup__label", `${slot} ${slotUsed(item, slot)}/${cap}`));
      const row = el("div", "facets");
      const mods = item.mods.filter((m) => m.slot === slot);
      for (let i = 0; i < cap; i++) {
        const mod = mods[i];
        const facet = el("button", "facet");
        if (mod) {
          facet.classList.add("facet--set", `facet--${facetOf(mod)}`);
          facet.title = describeMod(mod);
          facet.setAttribute("aria-label", describeMod(mod));
          facet.onclick = () => {
            focused = focused === mod.entryId ? null : mod.entryId;
            render();
          };
          if (focused === mod.entryId) facet.classList.add("facet--focus");
          facet.append(el("span", "facet__tier", `T${mod.tier}`));
        } else {
          facet.classList.add("facet--empty");
          facet.setAttribute("aria-label", `empty ${slot} slot`);
          facet.disabled = true;
        }
        row.append(facet);
      }
      group.append(row);
      host.append(group);
    }
    const list = $("modlist");
    list.replaceChildren();
    if (item.mods.length === 0) {
      list.append(el("p", "empty", "No modifiers. Use a currency to fill a slot."));
    }
    for (const mod of item.mods) {
      const row = el("div", "mod");
      if (focused === mod.entryId) row.classList.add("mod--focus");
      row.append(el("span", `dot dot--${facetOf(mod)}`));
      const body = el("div", "mod__body");
      body.append(
        el(
          "div",
          "mod__stats",
          mod.stats.map(
            (s) => s.form === "flat" ? `+${s.value} ${s.stat}` : `+${s.value}% ${s.form === "inc" ? "increased" : "more"} ${s.stat}`
          ).join(", ")
        )
      );
      body.append(el("div", "mod__name", `T${mod.tier} ${mod.name} \xB7 ${mod.slot}`));
      row.append(body);
      list.append(row);
    }
  }
  function renderCurrencies() {
    const host = $("currencies");
    host.replaceChildren();
    const classes = ["basic", "uncommon", "rare", "exotic"];
    for (const cls of classes) {
      const group = CURRENCIES.filter((c) => c.class === cls);
      if (group.length === 0) continue;
      host.append(el("div", "shelf__label", cls));
      const grid = el("div", "shelf");
      for (const currency of group) {
        const blocked = canApply(item, currency);
        const btn = el("button", `curr curr--${cls}`);
        btn.append(el("span", "curr__name", currency.name));
        btn.append(el("span", "curr__desc", currency.description));
        if (blocked) {
          btn.disabled = true;
          btn.classList.add("curr--off");
          btn.append(el("span", "curr__why", blocked));
        }
        btn.onclick = () => use(currency);
        grid.append(btn);
      }
      host.append(grid);
    }
  }
  function renderLog() {
    const host = $("log");
    host.replaceChildren();
    if (log.length === 0) {
      host.append(el("p", "empty", "Craft something and the history shows up here."));
    }
    for (const entry of log.slice(0, 60)) {
      host.append(el("div", `logline logline--${entry.kind}`, entry.text));
    }
  }
  function render() {
    renderBases();
    renderItem();
    renderCurrencies();
    renderLog();
    $("seed").textContent = String(seed);
  }
  function initBench() {
    $("reseed").onclick = reseed;
    $("clear").onclick = () => {
      log = [];
      render();
    };
    log.unshift({ text: `Seed ${seed}`, kind: "note" });
    render();
  }

  // src/sim/grid.ts
  var WALL = 0;
  var FLOOR = 1;
  var ENTRANCE = 2;
  var EXIT = 3;
  var clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function roomCenter(r) {
    return { x: r.x + Math.floor((r.w - 1) / 2), y: r.y + Math.floor((r.h - 1) / 2) };
  }
  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  var Grid = class {
    width;
    height;
    tiles;
    constructor(width, height) {
      this.width = width;
      this.height = height;
      this.tiles = new Uint8Array(width * height);
    }
    inBounds(x, y) {
      return x >= 0 && y >= 0 && x < this.width && y < this.height;
    }
    at(x, y) {
      if (!this.inBounds(x, y)) return WALL;
      return this.tiles[y * this.width + x];
    }
    set(x, y, tile) {
      if (this.inBounds(x, y)) this.tiles[y * this.width + x] = tile;
    }
    /** Walls block; everything else is walkable. Entities use float positions,
     *  so this is sampled at the rounded tile under them. */
    walkable(x, y) {
      return this.at(Math.round(x), Math.round(y)) !== WALL;
    }
  };
  function overlaps(a, b, pad) {
    return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
  }
  function carveRoom(grid, r) {
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) grid.set(x, y, FLOOR);
    }
  }
  function hLine(grid, x0, x1, y) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) grid.set(x, y, FLOOR);
  }
  function vLine(grid, y0, y1, x) {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) grid.set(x, y, FLOOR);
  }
  function carveCorridor(grid, a, b, rng2) {
    const ax = Math.round(a.x);
    const ay = Math.round(a.y);
    const bx = Math.round(b.x);
    const by = Math.round(b.y);
    if (rng2.chance(0.5)) {
      hLine(grid, ax, bx, ay);
      vLine(grid, ay, by, bx);
    } else {
      vLine(grid, ay, by, ax);
      hLine(grid, ax, bx, by);
    }
  }
  function reachable(grid, from) {
    const seen = /* @__PURE__ */ new Set();
    const start = Math.round(from.y) * grid.width + Math.round(from.x);
    const queue = [start];
    seen.add(start);
    while (queue.length > 0) {
      const node = queue.pop();
      const x = node % grid.width;
      const y = (node - x) / grid.width;
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (!grid.inBounds(nx, ny) || grid.at(nx, ny) === WALL) continue;
        const nk = ny * grid.width + nx;
        if (seen.has(nk)) continue;
        seen.add(nk);
        queue.push(nk);
      }
    }
    return seen;
  }
  function generateMap(crystal, rng2) {
    const layout = computeStat(1, crystal.mods, "layoutComplexity");
    const width = clamp(Math.round(42 * Math.sqrt(layout)), 30, 72);
    const height = clamp(Math.round(28 * Math.sqrt(layout)), 22, 48);
    const grid = new Grid(width, height);
    const target = clamp(Math.round(7 * layout), 5, 16);
    const rooms = [];
    for (let attempt = 0; attempt < 500 && rooms.length < target; attempt++) {
      const w = rng2.int(5, 9);
      const h = rng2.int(4, 7);
      const candidate = {
        x: rng2.int(1, Math.max(1, width - w - 2)),
        y: rng2.int(1, Math.max(1, height - h - 2)),
        w,
        h
      };
      if (rooms.some((r) => overlaps(r, candidate, 2))) continue;
      rooms.push(candidate);
    }
    for (const room of rooms) carveRoom(grid, room);
    for (let i = 1; i < rooms.length; i++) {
      carveCorridor(grid, roomCenter(rooms[i - 1]), roomCenter(rooms[i]), rng2);
    }
    const entrance = roomCenter(rooms[0]);
    let exitRoom = rooms[rooms.length - 1];
    let best = -1;
    for (const room of rooms.slice(1)) {
      const d = dist(entrance, roomCenter(room));
      if (d > best) {
        best = d;
        exitRoom = room;
      }
    }
    const exit = roomCenter(exitRoom);
    const exitKey = Math.round(exit.y) * grid.width + Math.round(exit.x);
    if (!reachable(grid, entrance).has(exitKey)) {
      carveCorridor(grid, entrance, exit, rng2);
    }
    grid.set(Math.round(entrance.x), Math.round(entrance.y), ENTRANCE);
    grid.set(Math.round(exit.x), Math.round(exit.y), EXIT);
    return { grid, rooms, entrance, exit };
  }

  // src/sim/pathfind.ts
  var DIRS = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [-1, -1, Math.SQRT2]
  ];
  var MinHeap = class {
    items = [];
    get size() {
      return this.items.length;
    }
    push(key, cost) {
      this.items.push({ key, cost });
      let i = this.items.length - 1;
      while (i > 0) {
        const parent = i - 1 >> 1;
        if (this.items[parent].cost <= this.items[i].cost) break;
        [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
        i = parent;
      }
    }
    pop() {
      const top = this.items[0];
      const last = this.items.pop();
      if (this.items.length > 0) {
        this.items[0] = last;
        let i = 0;
        for (; ; ) {
          const l = i * 2 + 1;
          const r = l + 1;
          let smallest = i;
          if (l < this.items.length && this.items[l].cost < this.items[smallest].cost) smallest = l;
          if (r < this.items.length && this.items[r].cost < this.items[smallest].cost) smallest = r;
          if (smallest === i) break;
          [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
          i = smallest;
        }
      }
      return top.key;
    }
  };
  function canStep(grid, x, y, dx, dy) {
    if (grid.at(x + dx, y + dy) === WALL) return false;
    if (dx !== 0 && dy !== 0) {
      if (grid.at(x + dx, y) === WALL || grid.at(x, y + dy) === WALL) return false;
    }
    return true;
  }
  function findPath(grid, from, to, maxNodes = 4e3) {
    const sx = Math.round(from.x);
    const sy = Math.round(from.y);
    const gx = Math.round(to.x);
    const gy = Math.round(to.y);
    if (sx === gx && sy === gy) return [];
    if (grid.at(gx, gy) === WALL) return [];
    const { width } = grid;
    const key = (x, y) => y * width + x;
    const goal = key(gx, gy);
    const gScore = /* @__PURE__ */ new Map();
    const cameFrom = /* @__PURE__ */ new Map();
    const open = new MinHeap();
    const closed = /* @__PURE__ */ new Set();
    const h = (x, y) => Math.hypot(x - gx, y - gy);
    gScore.set(key(sx, sy), 0);
    open.push(key(sx, sy), h(sx, sy));
    let expanded = 0;
    while (open.size > 0 && expanded < maxNodes) {
      const current = open.pop();
      if (closed.has(current)) continue;
      closed.add(current);
      expanded++;
      if (current === goal) break;
      const cx = current % width;
      const cy = (current - cx) / width;
      const base = gScore.get(current);
      for (const [dx, dy, cost] of DIRS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (!grid.inBounds(nx, ny) || !canStep(grid, cx, cy, dx, dy)) continue;
        const nk = key(nx, ny);
        if (closed.has(nk)) continue;
        const tentative = base + cost;
        const known = gScore.get(nk);
        if (known !== void 0 && known <= tentative) continue;
        gScore.set(nk, tentative);
        cameFrom.set(nk, current);
        open.push(nk, tentative + h(nx, ny));
      }
    }
    if (!cameFrom.has(goal) && goal !== key(sx, sy)) return [];
    const path = [];
    let node = goal;
    const start = key(sx, sy);
    while (node !== start) {
      const x = node % width;
      path.push({ x, y: (node - x) / width });
      const prev = cameFrom.get(node);
      if (prev === void 0) return [];
      node = prev;
    }
    return path.reverse();
  }

  // src/sim/stats.ts
  var DAMAGE_TYPES = ["physical", "fire", "cold"];
  function damageFrom(mods, weaponBase) {
    let total = 0;
    for (const type of DAMAGE_TYPES) {
      const base = type === "physical" ? weaponBase : 0;
      total += computeStat(base, mods, "damage", [type]);
    }
    return total;
  }
  function heroStats(equipped) {
    const mods = equipped.flatMap((item2) => item2.mods);
    const maxLife = computeStat(HERO_BASE.life, mods, "life");
    return {
      maxLife,
      lifeRegen: maxLife * HERO_BASE.lifeRegenPercent / 100,
      damage: damageFrom(mods, HERO_BASE.weaponDamage),
      attacksPerSecond: computeStat(HERO_BASE.attacksPerSecond, mods, "attackSpeed"),
      critChance: computeStat(HERO_BASE.critChance, mods, "critChance"),
      moveSpeed: computeStat(HERO_BASE.moveSpeed, mods, "moveSpeed"),
      armour: computeStat(HERO_BASE.armour, mods, "armour"),
      attackRange: HERO_BASE.attackRange,
      aggroRange: HERO_BASE.aggroRange
    };
  }
  function monsterStats(crystal, tier) {
    const life = MONSTER_BASE.life * Math.pow(MONSTER_TIER_SCALE.life, tier - 1);
    const damage = MONSTER_BASE.damage * Math.pow(MONSTER_TIER_SCALE.damage, tier - 1);
    return {
      maxLife: computeStat(life, crystal.mods, "monsterLife"),
      damage: computeStat(damage, crystal.mods, "monsterDamage"),
      attacksPerSecond: MONSTER_BASE.attacksPerSecond,
      critChance: 0,
      moveSpeed: computeStat(MONSTER_BASE.moveSpeed, crystal.mods, "monsterMoveSpeed"),
      armour: 0,
      attackRange: MONSTER_BASE.attackRange,
      aggroRange: MONSTER_BASE.aggroRange,
      lifeRegen: 0
    };
  }
  function mapDensity(crystal) {
    return {
      packCount: Math.max(1, Math.round(computeStat(10, crystal.mods, "packCount"))),
      packSize: Math.max(1, Math.round(computeStat(5, crystal.mods, "packSize")))
    };
  }

  // src/sim/run.ts
  var TICK = 1 / 30;
  var ACTIVE_RANGE = 16;
  var FLOATER_LIFE = 1.1;
  var RunSim = class {
    state;
    rng;
    events = [];
    nextId = 1;
    constructor(crystal, equipped, rng2) {
      this.rng = rng2;
      const map = generateMap(crystal, rng2);
      const stats = heroStats(equipped);
      const hero = {
        id: 0,
        kind: "hero",
        x: map.entrance.x,
        y: map.entrance.y,
        life: stats.maxLife,
        stats,
        cooldown: 0,
        path: [],
        pathTimer: 0,
        aggroed: false,
        hitFlash: 0,
        dead: false
      };
      const monsters = this.spawn(crystal, map);
      this.state = {
        map,
        hero,
        monsters,
        floaters: [],
        elapsed: 0,
        status: "running",
        killed: 0,
        totalMonsters: monsters.length
      };
    }
    /** Packs land in rooms other than the entrance, so you always get a moment
     *  to look at the map before anything reaches you. */
    spawn(crystal, map) {
      const tier = crystal.meta.tier ?? 1;
      const stats = monsterStats(crystal, tier);
      const { packCount, packSize } = mapDensity(crystal);
      const rooms = map.rooms.length > 1 ? map.rooms.slice(1) : map.rooms;
      const monsters = [];
      for (let p = 0; p < packCount; p++) {
        const room = this.rng.pick(rooms) ?? rooms[0];
        for (let i = 0; i < packSize; i++) {
          monsters.push({
            id: this.nextId++,
            kind: "monster",
            x: this.rng.float(room.x, room.x + room.w - 1),
            y: this.rng.float(room.y, room.y + room.h - 1),
            life: stats.maxLife,
            stats,
            cooldown: this.rng.float(0, 1),
            path: [],
            pathTimer: 0,
            aggroed: false,
            hitFlash: 0,
            dead: false
          });
        }
      }
      return monsters;
    }
    /** Events since the last call. The UI drains these to build its log. */
    drainEvents() {
      const out = this.events;
      this.events = [];
      return out;
    }
    step(dt) {
      const s = this.state;
      if (s.status !== "running") return;
      s.elapsed += dt;
      for (const f of s.floaters) f.age += dt;
      if (s.floaters.length > 0 && s.floaters[0].age >= FLOATER_LIFE) {
        s.floaters = s.floaters.filter((f) => f.age < FLOATER_LIFE);
      }
      this.stepHero(dt);
      if (s.status !== "running") return;
      for (const m of s.monsters) {
        if (m.dead) continue;
        if (m.hitFlash > 0) m.hitFlash -= dt;
        this.stepMonster(m, dt);
        if (s.status !== "running") return;
      }
    }
    stepHero(dt) {
      const s = this.state;
      const hero = s.hero;
      if (hero.cooldown > 0) hero.cooldown -= dt;
      if (hero.hitFlash > 0) hero.hitFlash -= dt;
      if (hero.life < hero.stats.maxLife) {
        hero.life = Math.min(hero.stats.maxLife, hero.life + hero.stats.lifeRegen * dt);
      }
      const target = this.nearestMonster(hero, hero.stats.aggroRange);
      if (target) {
        const d = dist(hero, target);
        if (d <= hero.stats.attackRange) {
          hero.path = [];
          if (hero.cooldown <= 0) this.attack(hero, target);
        } else {
          this.advance(hero, target, dt);
        }
        return;
      }
      const arrived = Math.round(hero.x) === Math.round(s.map.exit.x) && Math.round(hero.y) === Math.round(s.map.exit.y);
      if (arrived) {
        s.status = "cleared";
        this.events.push({
          kind: "cleared",
          seconds: s.elapsed,
          killed: s.killed
        });
        return;
      }
      this.advance(hero, s.map.exit, dt);
    }
    stepMonster(m, dt) {
      const hero = this.state.hero;
      if (m.cooldown > 0) m.cooldown -= dt;
      const d = dist(m, hero);
      if (d > ACTIVE_RANGE) return;
      if (!m.aggroed && d <= m.stats.aggroRange) m.aggroed = true;
      if (!m.aggroed) return;
      if (d <= m.stats.attackRange) {
        m.path = [];
        if (m.cooldown <= 0) this.attack(m, hero);
        return;
      }
      this.advance(m, hero, dt);
    }
    nearestMonster(from, range) {
      let best = null;
      let bestDist = range;
      for (const m of this.state.monsters) {
        if (m.dead) continue;
        const d = dist(from, m);
        if (d <= bestDist) {
          bestDist = d;
          best = m;
        }
      }
      return best;
    }
    /** Walk along a cached path, repathing on a stagger so a whole pack never
     *  recomputes on the same tick. */
    advance(e, goal, dt) {
      e.pathTimer -= dt;
      if (e.path.length === 0 || e.pathTimer <= 0) {
        e.path = findPath(this.state.map.grid, e, goal);
        e.pathTimer = 0.4 + this.rng.float(0, 0.25);
      }
      let remaining = e.stats.moveSpeed * dt;
      while (remaining > 0 && e.path.length > 0) {
        const wp = e.path[0];
        const dx = wp.x - e.x;
        const dy = wp.y - e.y;
        const d = Math.hypot(dx, dy);
        if (d <= 1e-6) {
          e.path.shift();
          continue;
        }
        if (d <= remaining) {
          e.x = wp.x;
          e.y = wp.y;
          e.path.shift();
          remaining -= d;
        } else {
          e.x += dx / d * remaining;
          e.y += dy / d * remaining;
          remaining = 0;
        }
      }
    }
    attack(attacker, defender) {
      const s = this.state;
      const crit = attacker.stats.critChance > 0 && this.rng.chance(attacker.stats.critChance / 100);
      let dmg = attacker.stats.damage * this.rng.float(0.9, 1.1);
      if (crit) dmg *= 2;
      const armour = defender.stats.armour;
      if (armour > 0) dmg *= 1 - armour / (armour + 12 * dmg);
      dmg = Math.max(1, dmg);
      defender.life -= dmg;
      defender.hitFlash = 0.18;
      attacker.cooldown = 1 / attacker.stats.attacksPerSecond;
      s.floaters.push({
        x: defender.x,
        y: defender.y,
        text: String(Math.round(dmg)),
        age: 0,
        crit,
        on: defender.kind
      });
      if (defender.kind === "hero") {
        this.events.push({ kind: "hurt", life: Math.max(0, defender.life), maxLife: defender.stats.maxLife });
      }
      if (defender.life <= 0) this.kill(defender);
    }
    kill(victim) {
      const s = this.state;
      victim.dead = true;
      victim.life = 0;
      if (victim.kind === "hero") {
        s.status = "died";
        this.events.push({ kind: "died", seconds: s.elapsed, killed: s.killed });
        return;
      }
      s.killed++;
      this.events.push({ kind: "kill", total: s.killed });
    }
  };

  // src/sim/loadout.ts
  function starterLoadout(rng2, ilvl = 30) {
    const pool2 = new ModPool(ALL_MODS);
    const fill = (item2) => craft(item2, CURRENCY_BY_ID.shard_of_awakening, pool2, rng2).item;
    return [
      fill(makeGear("body_armour", ilvl, "Worn Plate")),
      fill(makeGear("ring", ilvl, "Iron Band"))
    ];
  }

  // src/render/canvas2d.ts
  var FLOATER_LIFE2 = 1.1;
  function createCanvasRenderer(canvas, palette) {
    const maybeCtx = canvas.getContext("2d");
    if (!maybeCtx) {
      return { resize: () => {
      }, draw: () => {
      } };
    }
    const ctx = maybeCtx;
    let cssWidth = canvas.clientWidth || 640;
    let cssHeight = canvas.clientHeight || 420;
    function resize(width, height) {
      const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
      cssWidth = Math.max(1, Math.floor(width));
      cssHeight = Math.max(1, Math.floor(height));
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function viewFor(state) {
      const { grid } = state.map;
      const tile = Math.min(cssWidth / grid.width, cssHeight / grid.height);
      return {
        tile,
        offX: (cssWidth - tile * grid.width) / 2,
        offY: (cssHeight - tile * grid.height) / 2
      };
    }
    const cx = (v, x) => v.offX + (x + 0.5) * v.tile;
    const cy = (v, y) => v.offY + (y + 0.5) * v.tile;
    function drawMap(state, v) {
      const { grid } = state.map;
      ctx.fillStyle = palette.matrix;
      for (let y = 0; y < grid.height; y++) {
        for (let x2 = 0; x2 < grid.width; x2++) {
          if (grid.at(x2, y) === WALL) continue;
          ctx.fillRect(
            v.offX + x2 * v.tile,
            v.offY + y * v.tile,
            Math.ceil(v.tile),
            Math.ceil(v.tile)
          );
        }
      }
      ctx.strokeStyle = palette.seam;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = 0; y < grid.height; y++) {
        for (let x2 = 0; x2 < grid.width; x2++) {
          if (grid.at(x2, y) === WALL) continue;
          if (grid.at(x2, y - 1) === WALL) {
            ctx.moveTo(v.offX + x2 * v.tile, v.offY + y * v.tile);
            ctx.lineTo(v.offX + (x2 + 1) * v.tile, v.offY + y * v.tile);
          }
          if (grid.at(x2, y + 1) === WALL) {
            ctx.moveTo(v.offX + x2 * v.tile, v.offY + (y + 1) * v.tile);
            ctx.lineTo(v.offX + (x2 + 1) * v.tile, v.offY + (y + 1) * v.tile);
          }
          if (grid.at(x2 - 1, y) === WALL) {
            ctx.moveTo(v.offX + x2 * v.tile, v.offY + y * v.tile);
            ctx.lineTo(v.offX + x2 * v.tile, v.offY + (y + 1) * v.tile);
          }
          if (grid.at(x2 + 1, y) === WALL) {
            ctx.moveTo(v.offX + (x2 + 1) * v.tile, v.offY + y * v.tile);
            ctx.lineTo(v.offX + (x2 + 1) * v.tile, v.offY + (y + 1) * v.tile);
          }
        }
      }
      ctx.stroke();
      const e = state.map.entrance;
      ctx.fillStyle = palette.seamLit;
      ctx.fillRect(
        cx(v, e.x) - v.tile * 0.3,
        cy(v, e.y) - v.tile * 0.3,
        v.tile * 0.6,
        v.tile * 0.6
      );
      const x = state.map.exit;
      const pulse = 0.75 + 0.25 * Math.sin(state.elapsed * 3);
      ctx.save();
      ctx.translate(cx(v, x.x), cy(v, x.y));
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = palette.citrine;
      ctx.globalAlpha = pulse;
      const s = v.tile * 0.42;
      ctx.fillRect(-s, -s, s * 2, s * 2);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
    function drawLifeBar(v, e, width, colour) {
      const frac = Math.max(0, Math.min(1, e.life / e.stats.maxLife));
      if (frac >= 1) return;
      const w = v.tile * width;
      const h = Math.max(2, v.tile * 0.12);
      const x = cx(v, e.x) - w / 2;
      const y = cy(v, e.y) - v.tile * 0.72;
      ctx.fillStyle = palette.void;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = colour;
      ctx.fillRect(x, y, w * frac, h);
    }
    function drawMonster(v, m) {
      const r = v.tile * 0.3;
      ctx.beginPath();
      ctx.arc(cx(v, m.x), cy(v, m.y), r, 0, Math.PI * 2);
      ctx.fillStyle = m.hitFlash > 0 ? palette.chalk : palette.ember;
      ctx.fill();
      drawLifeBar(v, m, 0.7, palette.ember);
    }
    function drawHero(v, hero) {
      const r = v.tile * 0.38;
      const x = cx(v, hero.x);
      const y = cy(v, hero.y);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = hero.hitFlash > 0 ? palette.ember : palette.quartz;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = palette.void;
      ctx.fill();
      drawLifeBar(v, hero, 1.1, palette.verdite);
    }
    function drawFloater(v, f) {
      const t = f.age / FLOATER_LIFE2;
      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.fillStyle = f.on === "hero" ? palette.ember : f.crit ? palette.citrine : palette.chalk;
      ctx.font = `${f.crit ? 700 : 500} ${Math.max(9, v.tile * (f.crit ? 0.75 : 0.6))}px ui-monospace, monospace`;
      ctx.textAlign = "center";
      ctx.fillText(f.text, cx(v, f.x), cy(v, f.y) - v.tile * (0.5 + t * 1.2));
      ctx.globalAlpha = 1;
    }
    function draw(state) {
      const v = viewFor(state);
      ctx.fillStyle = palette.void;
      ctx.fillRect(0, 0, cssWidth, cssHeight);
      drawMap(state, v);
      for (const m of state.monsters) {
        if (!m.dead) drawMonster(v, m);
      }
      if (!state.hero.dead) drawHero(v, state.hero);
      for (const f of state.floaters) drawFloater(v, f);
    }
    resize(cssWidth, cssHeight);
    return { resize, draw };
  }

  // src/render/renderer.ts
  var VARS = [
    ["void", "--void"],
    ["matrix", "--matrix"],
    ["seam", "--seam"],
    ["seamLit", "--seam-lit"],
    ["chalk", "--chalk"],
    ["dust", "--dust"],
    ["amethyst", "--amethyst"],
    ["citrine", "--citrine"],
    ["quartz", "--quartz"],
    ["verdite", "--verdite"],
    ["ember", "--ember"]
  ];
  function readPalette(el3) {
    const style = getComputedStyle(el3);
    const out = {};
    for (const [key, cssVar] of VARS) {
      out[key] = style.getPropertyValue(cssVar).trim() || "#ffffff";
    }
    return out;
  }

  // src/ui/run.ts
  var $2 = (id) => document.getElementById(id);
  function el2(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== void 0) node.textContent = text;
    return node;
  }
  var sim = null;
  var renderer = null;
  var playing = false;
  var speed = 1;
  var accumulator = 0;
  var lastFrame = 0;
  var seed2 = 0;
  var log2 = [];
  var crystalLabel = "\u2014";
  var gearLabel = "\u2014";
  function buildSim() {
    seed2 = Math.floor(Math.random() * 1e9);
    const bench = currentItem();
    const crystal = bench.kind === "crystal" ? bench : makeCrystal(3);
    crystalLabel = `${crystal.name}${crystal.mods.length ? "" : " (unmodded)"}`;
    const loadout = starterLoadout(new Rng(seed2 ^ 6250335));
    if (bench.kind === "gear") {
      const idx = loadout.findIndex((i) => i.base === bench.base);
      if (idx >= 0) loadout[idx] = bench;
      else loadout.push(bench);
      gearLabel = `starter + ${bench.name}`;
    } else {
      gearLabel = "starter set";
    }
    const built = new RunSim(crystal, loadout, new Rng(seed2));
    renderStatsPanel(loadout);
    return built;
  }
  function renderStatsPanel(loadout) {
    const s = heroStats(loadout);
    const host = $2("run-stats");
    host.replaceChildren();
    const rows = [
      ["life", Math.round(s.maxLife).toString()],
      ["damage", Math.round(s.damage).toString()],
      ["atk/sec", s.attacksPerSecond.toFixed(2)],
      ["crit", `${Math.round(s.critChance)}%`],
      ["move", s.moveSpeed.toFixed(1)],
      ["armour", Math.round(s.armour).toString()],
      ["regen/s", s.lifeRegen.toFixed(1)]
    ];
    for (const [label, value] of rows) {
      const row = el2("div", "stat");
      row.append(el2("span", "stat__k", label));
      row.append(el2("span", "stat__v", value));
      host.append(row);
    }
  }
  function note(text, kind = "note") {
    log2.unshift({ text, kind });
    if (log2.length > 60) log2.length = 60;
  }
  function renderLog2() {
    const host = $2("run-log");
    host.replaceChildren();
    if (log2.length === 0) {
      host.append(el2("p", "empty", "Press Start to send the character in."));
    }
    for (const entry of log2) {
      host.append(el2("div", `logline logline--${entry.kind}`, entry.text));
    }
  }
  function renderReadout() {
    if (!sim) return;
    const s = sim.state;
    $2("run-elapsed").textContent = `${s.elapsed.toFixed(1)}s`;
    $2("run-killed").textContent = `${s.killed}/${s.totalMonsters}`;
    $2("run-seed").textContent = String(seed2);
    $2("run-source").textContent = `${crystalLabel} \xB7 ${gearLabel}`;
    const frac = Math.max(0, s.hero.life / s.hero.stats.maxLife);
    $2("run-hp-fill").style.width = `${frac * 100}%`;
    $2("run-hp-text").textContent = `${Math.max(0, Math.round(s.hero.life))} / ${Math.round(s.hero.stats.maxLife)}`;
    const status = $2("run-status");
    status.textContent = s.status === "running" ? playing ? "running" : "paused" : s.status;
    status.className = `run-status run-status--${s.status}`;
  }
  function absorbEvents() {
    if (!sim) return;
    let kills = 0;
    for (const e of sim.drainEvents()) {
      if (e.kind === "kill") kills++;
      else if (e.kind === "cleared") {
        note(`Cleared in ${e.seconds.toFixed(1)}s \u2014 ${e.killed} killed`, "add");
        playing = false;
        setStartLabel();
      } else if (e.kind === "died") {
        note(`Died at ${e.seconds.toFixed(1)}s \u2014 ${e.killed} killed`, "fail");
        playing = false;
        setStartLabel();
      }
    }
    if (kills > 0) note(`+${kills} killed`, "remove");
  }
  function frame(now) {
    const dt = lastFrame === 0 ? 0 : Math.min(0.25, (now - lastFrame) / 1e3);
    lastFrame = now;
    if (playing && sim && sim.state.status === "running") {
      accumulator += dt * speed;
      let steps = 0;
      while (accumulator >= TICK && steps < 400) {
        sim.step(TICK);
        accumulator -= TICK;
        steps++;
      }
      absorbEvents();
      renderLog2();
    }
    if (sim && renderer) renderer.draw(sim.state);
    renderReadout();
    requestAnimationFrame(frame);
  }
  function setStartLabel() {
    const btn = $2("run-start");
    const done = sim && sim.state.status !== "running";
    btn.textContent = done ? "Finished" : playing ? "Pause" : "Start";
    btn.disabled = !!done;
  }
  function newRun() {
    sim = buildSim();
    log2 = [];
    accumulator = 0;
    playing = true;
    note(`Seed ${seed2} \xB7 ${sim.state.totalMonsters} monsters`, "note");
    setStartLabel();
    renderLog2();
    fitCanvas();
  }
  function fitCanvas() {
    const canvas = $2("run-canvas");
    const box = canvas.parentElement;
    const width = box.clientWidth;
    const height = Math.max(320, Math.round(width * 0.66));
    renderer?.resize(width, height);
  }
  function initRun() {
    const canvas = $2("run-canvas");
    renderer = createCanvasRenderer(canvas, readPalette(document.documentElement));
    $2("run-start").onclick = () => {
      if (!sim || sim.state.status !== "running") {
        newRun();
        return;
      }
      playing = !playing;
      setStartLabel();
    };
    $2("run-new").onclick = () => newRun();
    for (const mult of [1, 2, 4]) {
      const btn = $2(`run-speed-${mult}`);
      btn.onclick = () => {
        speed = mult;
        for (const m of [1, 2, 4]) {
          $2(`run-speed-${m}`).classList.toggle("chip--on", m === speed);
        }
      };
    }
    $2("run-speed-1").classList.add("chip--on");
    globalThis.addEventListener("resize", fitCanvas);
    sim = buildSim();
    fitCanvas();
    renderLog2();
    setStartLabel();
    renderReadout();
    requestAnimationFrame(frame);
  }
  function onRunShown() {
    fitCanvas();
    renderReadout();
  }

  // src/web.ts
  var VIEWS = ["bench", "run"];
  function show(view) {
    for (const name of VIEWS) {
      const panel = document.getElementById(`view-${name}`);
      const tab = document.getElementById(`tab-${name}`);
      const active = name === view;
      panel.hidden = !active;
      tab.classList.toggle("tab--on", active);
      tab.setAttribute("aria-selected", String(active));
    }
    if (view === "run") onRunShown();
  }
  for (const name of VIEWS) {
    document.getElementById(`tab-${name}`).addEventListener("click", () => show(name));
  }
  initBench();
  initRun();
  show("bench");
})();
