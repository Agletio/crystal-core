# Crystal Core — Roadmap

**This is the master to-do list.** It is the design of record for work that has
not been built yet. `CLAUDE.md` describes the game as it *is*; this describes
where it is going.

If you are picking this up with no other context: read §1 for the target, §2 for
the model that replaces the current tier system, §3 for decisions that are
settled, then start at the lowest unchecked phase in §5. §6 lists what is still
undecided — do not guess at those, ask.

Checked boxes are done and can be trusted. Everything else is a plan, not a
promise: the numbers in here are intent, not tuning.

---

## 1. The target

The game becomes a loop you set up and then run, rather than one you feed.

Today a crystal is a consumable stake: you craft it, socket it, and it is gone
in about a minute whether you win or lose. That makes crystal crafting a chore
gate — the investment is large and the payoff lasts one run.

Instead: **crystals are permanent.** You own a small number, you socket them
into the Fissure, and they stay there. They level up by being used. Crafting one
is a build decision with a lasting home, exactly like crafting a piece of gear.

The loop that falls out of it:

> Set your sockets → send the character out → it clears repeatedly until your
> bags are full or it dies → triage the haul, sell what you don't want, upgrade
> gear, re-roll a crystal, socket a harder set → go again.

---

## 2. The socket model

Four independent axes, one per thing a crystal has. This is the core of the
redesign and everything else follows from it.

| Axis | What it is | What it controls |
|---|---|---|
| **Count** | How many sockets are filled | Run **length** — map size and total monsters. Not difficulty. |
| **Tier** | A crystal's own rank, T1–T4 | **Mod capacity** only: T1 = 0 mods, T2 = 1, T3 = 2, T4 = 3. T4 is max. |
| **Mods** | What is rolled on the crystal | **Difficulty**, and part of what a run is worth. Unchanged from today. |
| **Family** | Normal, Demonic, or Crystal | **Which monsters** spawn, and which map you are in. |

Illustrative sizing (placeholders, to be tuned):

| Sockets filled | Map | Monsters |
|---|---|---|
| 0 (bare Fissure) | 200 sq | 50 |
| 1 | 300 sq | 75 |
| 2 | 400 sq | 100 |
| 3 | 500 sq | 125 |
| 4 | 600 sq | 150 |

**Monsters do not get stronger from count.** A four-socket run with no mods
rolled is long and easy — and pays badly, because reward derives from what the
set actually is (§3, *Rewards*). A long safe run is a valid strategy that earns
less, which is self-limiting without needing a rule against it.

### What this retires

Tier currently drives seven things at once. Under the new model it drives one,
and the rest move to mods or to socket count. These all go:

- `MONSTER_TIER_SCALE` — monster life/damage by tier → **mods** (`monsterLife`,
  `monsterDamage`, which already exist)
- `MONSTER_TIER_RESIST`, `MONSTER_TIER_ARMOUR` → **mods** (the wards and
  `monsterArmour`, which already exist)
- `MAP_TIER_SCALE` → **socket count**
- `CRYSTAL_TIERS` as a purchase ladder → crystals are given, not bought

And four more that are also keyed on tier and are easy to miss, because they are
not difficulty — they are what a run is WORTH. All four move to **run power**:

- `TIER_DROPS` / `dropsForTier` — drop quality, fill, currency class, gear chance
- `monsterXp(tier)` via `LEVELLING.tierScale` (`src/sim/character.ts`) — XP per kill
- `LOOT.tierScale` (`src/sim/run.ts`) — gold per kill
- `mapIlvl` off `CRYSTAL_TIERS[].ilvl` — the **item level dropped gear rolls at**,
  which is how mod tiers ladder. Losing this silently would flatten gear
  progression to its lowest rung with nothing reporting a problem.

**Because of those four, run power is needed in Phase 1, not Phase 7.** The
moment tier stops being a difficulty axis, drops, XP, gold and ilvl all lose the
number they read. Phase 1 introduces a minimal version (danger and socket count);
Phase 7 refines the curve, adds composition, and adds gating.

> **Landed in Phase 1.** Power runs 0 (bare Fissure) to 6, and `DROP_BANDS`
> replaced `TIER_DROPS` — same seven rows, keyed on power, with the drop ilvl
> now an explicit column rather than something read off a crystal.

This is a large simplification: two overlapping difficulty axes become one. It
also invalidates the tier tuning in the `MITIGATION` and `THE LADDER` checks in
`src/demo.ts` — see *What must not break* below.

### Families

A crystal is exactly one of Normal, Demonic, or Crystal. Each socketed crystal
converts **its share** of the run's monsters to its family — with four sockets
that is 25% each, so three Demonic + one Normal is 75% demonic.

Map theme follows the composition:

- Demonic ≥ 50% → dark demonic theme
- Crystal ≥ 50% → crystal cavern theme
- 50/50 Demonic/Crystal with no Normal → **the Seam**, a unique zone

*(The Seam is named to fit the existing vocabulary — the Fissure is "a thin
place in the rock", and a Shard of Seaming joins things. Visually: crystal
growth erupting through demonic architecture, two worlds fused at a join that
should not exist. Distinct from both parents rather than a blend of their
tilesets.)*

The nine monsters in `MONSTERS` today are all Normal. Demonic and Crystal
families need their own monsters and art (`src/render/bestiary.ts`).

### Keeping room for a fifth socket

A fifth socket is wanted eventually as an endgame slot holding something
entirely different — not a crystal, and not yet specified. **No structural work
is needed for it now**, provided two rules are followed while building §5
Phase 1, both of which cost nothing today:

1. Model sockets as a **slot-def list** — `{ id, name, accepts }` — the way
   `EQUIP_SLOTS` already does, not four named fields or a fixed array. A slot
   that accepts something other than a crystal then costs one table entry.
2. Derive the family split from **the number of filled crystal sockets**, never
   from the constant 4. Otherwise a fifth socket silently rescales every
   composition in the game.

### What must not break

Two things in the repo will fail loudly, and one will fail quietly, when this
work lands. Expect them rather than discovering them.

**The guided opening (`npm run guide`) walks the real UI with a real pointer and
will break twice.** Phase 3 renames the currency it tells you to buy ("Buy a
Shard of Seaming"), and Phase 4 changes the run flow its steps are written
against. `src/ui/tutorial.ts` is data — steps with `done` predicates — so the
fix is editing those steps, not the harness. Budget for it in both phases.

**The demo's `THE LADDER` and `MITIGATION` checks are tier-shaped and cannot
survive as written.** Do not delete them; restate the same two invariants
against run power, because both caught real bugs:

- *The free descent stays beatable by a character that owns nothing* — no gear,
  no points, level one — **and still costs it something.** This is the check
  that fails at both ends, and it is what stops the game becoming unstartable.
- *No reachable setup is a wall.* The tier version asked whether tier n was
  clearable in what tier n-1 drops. The socket version asks whether a set the
  player can actually assemble at power band N is clearable in gear farmed at
  band N-1. Same question, different axis.

**The single-socket UI already exists** (`run-socket` in `src/ui/run.ts`). Phase
1 is extending it to a persistent set, not building socketing from nothing.
*(Done: it is now `#run-sockets`, a grid built from `RUN_SLOTS`.)*

---

## 3. Standing decisions

Settled. Do not relitigate without the user saying so.

**Death** costs **only the run you died in** and **stops the idle loop**. Not
the crystals, not the gear, and not the haul already banked from earlier clears.
Stopping the loop is the real teeth: you cannot blindly re-run a set that kills
you, so a set you cleared four times and died on the fifth is a setup problem you
have to go and fix rather than eat repeatedly.

A death drops you on **the haul screen** — the same screen a full haul stops you
on. The loop has one terminus regardless of why it ended, so there is one place
that means "the run is over, deal with your things".

**Crystals level by being used.** A crystal must be **socketed** to gain
progress, and gains it **per run cleared, multiplied by the set's danger**. This
makes levelling a fresh T1 cost you something real — it takes a socket a good
crystal could have held, and dilutes the danger multiplier feeding every other
crystal in the set — while letting a far-progressed player level a new one
quickly by carrying it in an otherwise vicious set. T1 → T4, one mod slot per
tier.

**Rewards scale off everything**, and some things are hard-gated. The rule the
user wants held: *it must never be strictly better to run an easier map.* So
drop quality and quantity scale off crystal tier, socket count, total danger,
**and** family composition, with a 50/50 Demonic/Crystal split being the most
rewarding of all. Beyond scaling, the best items are **gated**: they cannot drop
at all below a threshold, so BIS gear is only reachable at the top of every
axis at once.

> Implementation note: fold those inputs into **one derived "run power" number**
> and let drops read that, rather than four separate multipliers. Tier already
> correlates with danger (more mods), so separate multipliers double-count and
> get hard to reason about — which is the exact problem the socket model just
> removed. One number, one place to tune it.

**Bags overflow rather than losing loot.** A run that drops five items into one
free slot does not destroy four of them. You triage before continuing.

**Fragments are removed entirely. Gold replaces them.** Shop, recipes and stash
upgrades all price in gold. Selling items is the new source.

**Crystals are given, never bought.** An NPC hands out the first four (Normal)
crystals at random during Fissure runs, with the chance falling as you collect
more, until you have all four. The rest — Demonic and Crystal — come from
**explicit quests** instead ("clear a run at N total danger", and so on), so the
first four are easy and everything after is something you have learnt enough to
go and do on purpose.

**Balance is deliberately loose for now.** Lean overpowered — too much currency,
characters too strong. It makes testing faster. Reinvestment ratios and skill
balance get dialled in once the systems stop moving. Do not spend time tuning
what is about to be replaced.

---

## 4. How the haul works

Answering "what happens when one free slot meets five drops", because it is the
part with the most ways to go wrong.

- The **haul** is its own container in `GameState`, separate from the dock and
  the stash, with its own capacity (larger than the dock).
- A **cleared** run banks its loot into the haul. A run you die in banks nothing.
- Items in the haul are **inert** — not equippable, not craftable, not sellable
  from anywhere else — until you move them out. This mirrors the rule the stash
  already follows, so there is one concept rather than two.
- The loop **stops** when a cleared run leaves the haul at or over capacity, or
  on death. Capacity is checked *between* runs, never mid-run, so a run's drops
  are never split or discarded — the haul simply ends up over by at most one
  run's worth.
- Both endings land on **the same screen**. Full haul or dead, the loop has one
  terminus.
- You cannot launch again until the haul is back under capacity. That is the
  "deal with your items" step, and it is the only thing gating the loop.
- Triage per item: send to dock, send to stash, or sell. Plus bulk actions —
  triaging thirty items one click at a time is what kills an idle loop.

This keeps the real inventory clean (nothing auto-fills it), makes the stop
condition exact, and never destroys a drop.

---

## 5. Work

Phases are ordered so each leaves the game playable. Within a phase, roughly
dependency order.

### Phase 1 — The socket model

The heart of it. Everything else builds on this.

- [x] Sockets are a persistent part of `GameState` (`RUN_SLOTS`, a slot-def
      list, mirroring `EQUIP_SLOTS`). Socketing is a MOVE, like wearing a
      helmet: the crystal leaves the bag, and a fifth one swaps rather than
      being refused, so the dock never fills with dead slots.
- [x] `RunSim` takes the socketed **set** (`RunSet` in `src/sim/crystal.ts`).
      `mapDensity`, `crystalRewards`, `monsterStats` and `generateMap` all take
      a merged `RolledMod[]` instead of one `Item`.
- [x] Socket count drives map size and monster count (`SOCKET_SCALE`, indexed
      by filled sockets, index 0 being the bare Fissure); `MAP_TIER_SCALE` gone.
- [x] Monster power comes from socketed mods only; `MONSTER_TIER_SCALE`,
      `MONSTER_TIER_RESIST` and `MONSTER_TIER_ARMOUR` gone. The Fissure's old
      `powerScale` is folded into `MONSTER_BASE`, so the bare Fissure IS the
      floor rather than a discount off tier 1.
- [x] Crystal tier means mod capacity (T1–T4 → 0–3 mods), through the item's own
      `slots` table. Quality is derived from tier so the quality-gated crafting
      currencies reach exactly the room the tier granted.
- [x] `heal()` empties a socket whose crystal is gone, and one whose SLOT is
      gone (`src/game/save.ts`).
- [x] **Run power** (`POWER` in `src/data.ts`, `runSet()` in
      `src/sim/crystal.ts`): `filled × perSocket + danger / perDanger`, 0 being
      the bare Fissure. `DROP_BANDS` replaces `TIER_DROPS` and carries the drop
      ilvl; XP and gold scale continuously off power. Not the final curve —
      that is Phase 7.
- [x] The demo's `THE LADDER` and `MITIGATION` checks are restated against run
      power, both invariants intact, plus three new guards: the top of what four
      sockets can hold must reach the top drop band, a kill must be worth more
      gold AND more XP at every band, and only the top of the ladder may roll
      top-tier modifiers — the last of which is the silent ilvl failure §2
      warned about.

### Phase 2 — Families

Separable from everything else and lands value immediately.

- [x] `family` field on `MonsterDef`; the nine existing monsters are Normal.
      `MONSTER_FAMILIES` is the table, `MONSTERS_BY_FAMILY` the spawn pools.
- [x] Crystal family field (`meta.family`, and a tag, so a modifier restricted
      to one world is a line in the mod table). `RunSet.composition` is the
      share map; `familyPlan` deals whole packs, exact rather than rolled, so a
      half-demonic set is half demonic on every seed.
- [x] Demonic monster set — six kinds, art and a bestiary entry each.
- [x] Crystal monster set — same six-kind shape.
- [x] Family shows on the crystal's header rows, on each socket, and as the
      run's composition under the set chips.

> **Landed.** Six per family rather than nine: enough for a pool that reads as
> its own world without doubling the bestiary. The families are held to the
> same threat — weighted life × damage × rate within 2% — and the demo also
> clears four blank crystals of each with one character, which comes out 5%
> apart. The closing encounter now wears the dominant family's face while
> keeping one fixed stat baseline, so the finale is the same fight in all three.

### Phase 3 — Gold and disposal

Prerequisite for the idle loop: you cannot auto-repeat into a full bag without a
way to empty it.

Phase 1 left two things here on purpose, because both are this phase's job:
the demo's `WHERE THE FRAGMENTS GO` section still buys and burns crystals as if
they were consumable, and `RECIPES` still sells them.

- [ ] Replace `fragment` with `gold` everywhere. Touch list: `src/data.ts`
      (`LOOT.fragmentsPerKill`, every `RECIPES` input, `START_PRESETS`,
      `FISSURE.firstClear`), `src/game/state.ts`, `src/game/save.ts` (the
      `heal()` special case), `src/ui/shop.ts`, `src/ui/icons.ts`. Old saves
      lose their fragments — acceptable under the documented id-rename policy,
      no `SAVE_VERSION` bump.
- [ ] Remove crystal purchase recipes; crystals are not bought.
- [ ] Sell an item for gold. Price derived from base, quality and mods.
- [ ] Sell from the haul and from the dock, including a bulk action.
- [ ] Update the guided opening for the currency rename (`src/ui/tutorial.ts`).

### Phase 4 — The haul and the idle loop

Mechanism is specified in §4.

- [ ] The haul: its own container in `GameState`, with capacity, saved and healed.
- [ ] Loot from a cleared run banks into the haul; a death banks nothing.
- [ ] The haul screen is a **grid you can act on**, not a list of names.
      Replaces the `run-loot` rendering in `src/ui/run.ts` / `src/game/report.ts`.
- [ ] Auto-repeat: clear, re-launch, repeat.
- [ ] Stop on death, and say why. Stop when the haul is at capacity. Both land
      on the haul screen — one terminus for the loop.
- [ ] Launching is blocked while the haul is over capacity.
- [ ] Update the guided opening for the changed run flow (`src/ui/tutorial.ts`).

### Phase 5 — Progression

- [ ] The NPC: a random event during a Fissure run that hands you a crystal, at a
      falling chance as you collect more, until you hold all four Normal ones.
- [ ] Crystals gain levels per cleared run, scaled by the set's danger, only
      while socketed. T1 → T4, one mod slot per tier.
- [ ] Quests for the Demonic and Crystal crystals — objectives like clearing at a
      given total danger.
- [ ] Crystal storage — you will own more crystals than you have sockets, so they
      need somewhere to live and a way to compare them.

### Phase 6 — Themed maps

- [ ] Map theme selected from family composition (thresholds in §2).
- [ ] Demonic tileset.
- [ ] Crystal cavern tileset.
- [ ] The Seam — the 50/50 zone.

### Phase 7 — Rewards and gating

Phase 1 leaves a minimal run power number in place. This is where it becomes the
real curve.

**What Phase 1 left for it, measured rather than guessed:** the difficulty
ceiling now lives entirely in crystal modifiers, and it is LOWER than the tier
tables it replaced. Twelve modifiers across four sockets have to span what
`MONSTER_TIER_SCALE` used to span on its own, and the danger mods were widened
but not to that. Reward scaling is intact — a kill at the top band is worth
~240× the bare Fissure — so the game is loose in the direction §3 asks for.
Retuning the danger mods so the top set is genuinely dangerous belongs here.

- [ ] Run power takes **composition** and crystal tier as inputs too, and becomes
      the tuned curve rather than a placeholder (§3, *Rewards*).
- [ ] Drop gating: items that cannot appear below a threshold, so the best gear
      is only reachable at the top of every axis at once.
- [ ] Rewards unique to each monster family, so choosing Demonic over Normal is a
      farming decision rather than a cosmetic one.
- [ ] Targeted farming: a crystal set that biases toward a specific armour family
      or item type, through family plus mods.

### Phase 8 — Cross-family monster interactions

**Why 50/50 is the hardest run, and therefore the best-paying one.** The
families are designed to be dangerous *together* in a way neither is alone.

The shape: one family carries auras that grant nearby monsters **flat** damage
but has no percentage scaling of its own; the other carries **percentage**
buffs but no flat. Separately each is mild. Mixed, the percentages land on the
flat and the room becomes lethal. Defensive variants of the same idea — one
family granting flat armour, the other multiplying it.

- [ ] Monster aura/buff system in the sim. Does not exist today; monsters have no
      way to affect each other.
- [ ] Offensive aura pair — flat-granting family, percent-granting family.
- [ ] Defensive aura pair on the same principle.
- [ ] Auras are visible on the field. A room that is lethal for a reason you
      cannot see is a room that reads as a bug.
- [ ] The demo proves the interaction: each family alone versus both together,
      with the combined number materially higher than the sum.

### Phase 9 — Unique gear

Items with fixed identity and a behaviour attached, closer to a tree passive than
to a rolled mod, but broad enough to work across builds.

Examples given: gloves that make projectiles arc to one extra target but deal
slightly less damage; a helmet granting a lot of flat damage that also adds it to
attacks *you* take.

- [ ] Unique item concept — fixed mods, optionally with ranges on flat stats.
- [ ] Uniques grant **behaviours through the existing `GRANTS` table**
      (`src/sim/grants.ts`), not a parallel system. The merge rules
      (`mergeGrants`) and the demo's rule that every grant must be declared and
      read by some behaviour then apply to gear for free.
- [ ] Grant collection reads equipment as well as the tree — `treeGrants` in
      `src/sim/stats.ts` is the seam.
- [ ] Drop-gated by zone: some uniques only from a full Demonic run, some from
      full Crystal, some only from the Seam.

---

## 6. Open questions

Do not guess at these.

1. **What is the fifth socket?** Wanted as an endgame slot holding something
   that is not a crystal. Deliberately unspecified — the user wants to think
   about it. §2 says how to keep it cheap to add; nothing else should assume it.
2. **What exactly does the run power formula look like?** §3 settles the inputs
   and that it should be one number. The shape of the curve is open, and it is
   the lever that decides whether pushing difficulty is correct or optional.

---

## 7. Backlog

Real, deferred by decision. Do not spend time here until the systems above stop
moving — see §3, balance is deliberately loose.

- ~~Reinvestment runs above 1.0 at T3–T5.~~ Gone: crystals are permanent, so
  there is no per-run cost to divide by. The demo's `SUSTAIN CHECK` became
  `WHAT A BAND IS WORTH`, which asks whether pushing power pays instead.
- Blight clears T6 12/12 where Strike manages 3/12. A large skill imbalance that
  predates the difficulty work.
- More tutorial steps for systems added since the opening was written.
- Multiple item-disposal routes, so selling is not the only option.

---

## 8. Conventions for work done from this document

- Everything in `CLAUDE.md` still applies — the comment budget, the save rules,
  the tree rules. Read it first.
- Check boxes as they land, and move anything that turns out to be wrong into §6
  rather than silently doing something else.
- Every phase should leave the full suite green: `comments`, `typecheck`,
  `demo`, `mods`, `build`, `smoke`, `shots`, `guide`.
- Balance claims need a measurement, not an impression. `ladderCharacter` in
  `src/sim/loadout.ts` and the harnesses in `src/demo.ts` are the tools; a
  throwaway probe script is fine for anything they do not cover.
