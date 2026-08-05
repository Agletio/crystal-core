"use strict";
(() => {
  // src/rng.ts
  var Rng = class {
    state;
    constructor(seed2 = Date.now()) {
      this.state = seed2 >>> 0 || 2654435769;
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

  // src/web.ts
  var pool = new ModPool(ALL_MODS);
  var seed = Math.floor(Math.random() * 1e9);
  var rng = new Rng(seed);
  var item = makeCrystal(3);
  var log = [];
  var focused = null;
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
  $("reseed").onclick = reseed;
  $("clear").onclick = () => {
    log = [];
    render();
  };
  log.unshift({ text: `Seed ${seed}`, kind: "note" });
  render();
})();
