# Crystal Core — Roadmap

**This is the master to-do list.** It is the design of record for work that has
not been built yet. `CLAUDE.md` describes the game as it *is*; this describes
where it is going.

If you are picking this up with no other context: read §1 for the target, §2 for
the model that replaces the current tier system, then start at the lowest
unchecked phase in §4. §5 lists what is still undecided — do not guess at those,
ask.

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
| **Mods** | What is rolled on the crystal | **Difficulty** and the reward that pays for it. Unchanged from today. |
| **Family** | Normal, Demonic, or Crystal | **Which monsters** spawn, and which map you are in. |

Illustrative sizing (numbers are placeholders, to be tuned):

| Sockets filled | Map | Monsters |
|---|---|---|
| 0 (bare Fissure) | 200 sq | 50 |
| 1 | 300 sq | 75 |
| 2 | 400 sq | 100 |
| 3 | 500 sq | 125 |
| 4 | 600 sq | 150 |

**Monsters do not get stronger from count.** A four-socket run with no mods
rolled is long and easy — and pays badly, because reward is derived from danger
(`crystalRewards` in `src/sim/crystal.ts` already works this way). That
self-balances: a long safe run is a valid farming strategy that earns less.

### What this retires

Tier currently drives seven things at once. Under the new model it drives one,
and the rest move to mods or to socket count. These all go:

- `MONSTER_TIER_SCALE` — monster life/damage by tier → **mods** (`monsterLife`,
  `monsterDamage`, which already exist)
- `MONSTER_TIER_RESIST`, `MONSTER_TIER_ARMOUR` → **mods** (the wards and
  `monsterArmour`, which already exist)
- `MAP_TIER_SCALE` → **socket count**
- `TIER_DROPS` / `dropsForTier` keyed on tier → keyed on **danger** (see §5, open)
- `CRYSTAL_TIERS` as a purchase ladder → crystals are given, not bought

This is a large simplification: two overlapping difficulty axes become one. It
also invalidates the tier tuning done in `MITIGATION` and `THE LADDER` in
`src/demo.ts`, which will need reframing from tiers to danger bands.

### Families

A crystal is exactly one of Normal, Demonic, or Crystal. Each socketed crystal
converts **25% of the run's monsters** to its family. Three Demonic + one Normal
is a run that is 75% demonic.

Map theme follows the composition:

- Demonic ≥ 50% → dark demonic theme
- Crystal ≥ 50% → crystal cavern theme
- 50/50 Demonic/Crystal with no Normal → **the Seam**, a unique zone

*(The Seam is named to fit the existing vocabulary — the Fissure is "a thin
place in the rock", and a Shard of Seaming joins things. Visually: crystal
growth erupting through demonic architecture, the two worlds fused at a join
that should not exist. Distinct from both parents rather than a blend.)*

The nine monsters in `MONSTERS` today are all Normal. Demonic and Crystal
families need their own monsters and art (`src/render/bestiary.ts`).

---

## 3. Standing decisions

Settled, and not to be relitigated without the user saying so.

- **Death costs the run's loot, and stops the idle loop.** Not the crystals, not
  the gear. Stopping the loop is the real teeth: you cannot blindly re-run a set
  that kills you, so a map you cleared four times and died on the fifth is a
  setup problem you have to go and fix.
- **Bags overflow rather than losing loot.** A run that drops five items into one
  free slot does not destroy four of them. You must triage before continuing.
- **Fragments are removed entirely. Gold replaces them.** Shop, recipes and
  stash upgrades all price in gold. Selling items is the new source.
- **Balance is deliberately loose for now.** Lean overpowered — too much
  currency, characters too strong. It makes testing faster. Reinvestment ratios
  and skill balance get dialled in once the systems stop moving. Do not spend
  time tuning what is about to be replaced.
- **Crystals are given, never bought.** An NPC hands them out; you level them by
  playing.

---

## 4. Work

Phases are ordered so each one leaves the game playable. Within a phase, order
is roughly dependency order.

### Phase 1 — The socket model

The heart of it. Everything else builds on this.

- [ ] Sockets become a persistent part of `GameState`, not a per-run choice
      (`src/game/state.ts`, `src/ui/run.ts`). A socketed crystal stays socketed.
- [ ] `RunSim` takes the socketed **set** rather than one crystal
      (`src/sim/run.ts`). `mapDensity`, `crystalRewards` and `monsterStats` all
      read `crystal.mods` today — they read the merged mod list instead. The
      aggregation already exists in `src/mods.ts`.
- [ ] Socket count drives map size and monster count; retire `MAP_TIER_SCALE`.
- [ ] Monster power comes from socketed mods only; retire `MONSTER_TIER_SCALE`,
      `MONSTER_TIER_RESIST`, `MONSTER_TIER_ARMOUR`.
- [ ] Crystal tier means mod capacity (T1–T4 → 0–3 mods). Update `modCapacity`
      for crystals and `CRYSTAL_SLOTS`.
- [ ] `heal()` learns about sockets — a socketed crystal whose base is gone must
      be dropped and the socket emptied (`src/game/save.ts`).
- [ ] Reframe the demo's `THE LADDER` and `MITIGATION` checks from tiers to
      danger bands (`src/demo.ts`).

### Phase 2 — Families

Separable from everything else and lands value immediately.

- [ ] `family` field on `MonsterDef`; the nine existing monsters are Normal.
- [ ] Crystal family field; the socketed set decides the spawn pool at 25% per
      crystal (`spawn()` in `src/sim/run.ts`).
- [ ] Demonic monster set — data, art, and a bestiary entry each.
- [ ] Crystal monster set — same.
- [ ] Family shows in the crystal's own description and in the socket UI, so a
      composition is readable before you commit to it.

### Phase 3 — Gold and disposal

Prerequisite for the idle loop: you cannot auto-repeat into a full bag without a
way to empty it.

- [ ] Replace `fragment` with `gold` everywhere. Touch list:
      `src/data.ts` (`LOOT.fragmentsPerKill`, every `RECIPES` input,
      `START_PRESETS`, `FISSURE.firstClear`), `src/game/state.ts`,
      `src/game/save.ts` (the `heal()` special case), `src/ui/shop.ts`,
      `src/ui/icons.ts`. Old saves lose their fragments — acceptable under the
      documented id-rename policy, no `SAVE_VERSION` bump.
- [ ] Remove crystal purchase recipes; crystals are not bought.
- [ ] Sell an item for gold. Price derived from base, quality and mods.
- [ ] Sell from the haul screen and from the dock, including a bulk action —
      triaging thirty items one click at a time is the thing that kills an idle
      loop.

### Phase 4 — The haul and the idle loop

- [ ] Loot after a clear is a **temporary inventory** (a grid you can act on),
      not a list of names. Replaces the current `run-loot` rendering in
      `src/ui/run.ts` / `src/game/report.ts`.
- [ ] Loot accumulates into the haul across the whole auto-repeat session.
- [ ] Auto-repeat: clear, re-launch, repeat until the haul is full or the
      character dies.
- [ ] Death stops the loop and says why.
- [ ] Haul overflows rather than dropping items; you cannot start another run
      until it is triaged.

### Phase 5 — Progression

- [ ] The NPC: a random event during a Fissure run that hands you a crystal.
- [ ] First appearances give the four basic (Normal) crystals, one per socket.
- [ ] Once all four are held, later appearances have a chance of Demonic and
      Crystal ones.
- [ ] Crystals gain levels by being used, T1 → T4, unlocking a mod slot per tier.
- [ ] Crystal storage — you will own more crystals than you have sockets, so they
      need somewhere to live and a way to compare them.

### Phase 6 — Themed maps

- [ ] Map theme selected from family composition (thresholds in §2).
- [ ] Demonic tileset.
- [ ] Crystal cavern tileset.
- [ ] The Seam — the 50/50 zone.

### Phase 7 — Family rewards

- [ ] Rewards unique to each monster family, so choosing Demonic over Normal is a
      farming decision rather than a cosmetic one.
- [ ] Targeted farming: a crystal set that biases toward a specific armour family
      or item type, through family plus mods.

---

## 5. Open questions

Do not guess at these. They change the shape of the work.

1. **Four sockets or six?** Six was the first number, four in the later
   description ("4 sockets each one can just replace 25%"). The 25% split and
   the T4/3-mod cap both assume four. Four is assumed throughout this document.
2. **How do crystals level?** Per run cleared, per kill, or per danger survived?
   Does a crystal have to be socketed to gain progress? If yes — and it probably
   should be, since it makes levelling a new crystal a real cost — then swapping
   in a fresh T1 means running a weaker set for a while, which is a good
   decision to have.
3. **Haul contents: the whole session, or the last clear only?** Recommendation:
   the whole session. Auto-repeat means runs 1–4 have to put their loot
   somewhere, and silently auto-banking them would fill the real inventory
   without you seeing what arrived.
4. **What drives drop quality now that tier is gone?** Recommendation: total
   danger from the socketed set, reusing `crystalRewards`. It keeps the
   "danger pays" principle that already governs fragments and rarity, and it
   means a long safe run drops junk while a short vicious one drops well.
5. **How often does the NPC appear, and what gates it?** Needs to be reliable
   enough that a new player is not stuck without a crystal, rare enough to feel
   like an event.
6. **What is a run worth when the character is much stronger than the set?**
   With difficulty player-set and permanent, there is nothing stopping you
   parking at a comfortable set forever. Reward-per-danger scaling is the lever,
   but the curve needs to make pushing correct rather than optional.

---

## 6. Backlog

Real, deferred by decision. Do not spend time here until the systems above stop
moving — see §3, balance is deliberately loose.

- Reinvestment runs above 1.0 at T3–T5. Left alone pending the redesign, which
  removes crystal cost from the equation entirely.
- Blight clears T6 12/12 where Strike manages 3/12. A large skill imbalance that
  predates the difficulty work.
- A second currency source was discussed and never specified. May be moot once
  selling exists.
- More tutorial steps for systems added since the opening was written.
- Multiple item-disposal routes, so selling is not the only option.

---

## 7. Conventions for work done from this document

- Everything in `CLAUDE.md` still applies — the comment budget, the save rules,
  the tree rules. Read it first.
- Check boxes as they land, and move anything that turns out to be wrong into §5
  rather than silently doing something else.
- Every phase should leave the full suite green: `comments`, `typecheck`,
  `demo`, `mods`, `build`, `smoke`, `shots`, `guide`.
- Balance claims need a measurement, not an impression. `ladderCharacter` in
  `src/sim/loadout.ts` and the harnesses in `src/demo.ts` are the tools; a
  throwaway probe script is fine for anything they do not cover.
