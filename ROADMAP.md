# Crystal Core — Roadmap

**This is the master to-do list.** It is the design of record for work that has
not been built yet. `CLAUDE.md` describes the game as it *is*; this describes
where it is going.

If you are picking this up with no other context: read §1 for where things
stand, §2 for decisions that are settled, then start at the lowest unchecked
phase in §5. §6 lists what is still undecided — do not guess at those, ask.

Landed phases are deleted from this file rather than left checked, so everything
below §5 is work. The numbers in here are intent, not tuning.

---

## 1. Where things stand

The socket model is built and the game runs on it. `CLAUDE.md` is the accurate
description; the short version, because the phases below assume it:

Four sockets hold permanent crystals. Their COUNT is run length, their MODIFIERS
are the whole of difficulty, a crystal's LEVEL is only mod capacity (1–4 → 0–3)
and its FAMILY — Normal, Demonic, Prismatic — is only which monsters spawn.
Composition picks the zone. Everything a run pays reads one derived number
(`POWER`, `runSet()`). Crystals are given, never bought: the Lampwright hands
out the Normal ones, quests pay the other two, and a crystal levels only while
socketed. A cleared descent launches the next one until you die, fill the haul,
or stop it; every ending lands on the same report and the same haul screen. Gold
is the one currency. Demonic and Prismatic carry auras and Normal does not, so
the three worlds are a ladder as well as three opponents.

**The art work is done.** What is left is a pass over the parts you touch with
your hands — how a crystal is described, what a currency does, what a tooltip
says, how you get rid of things — then one balance debt carried out of the
systems work, then the next feature.

### Keeping room for a fifth socket

Still wanted eventually, still unspecified (§6). Two rules keep it cheap, and
both are already followed — do not undo them:

1. Sockets are a **slot-def list** (`RUN_SLOTS`, mirroring `EQUIP_SLOTS`), never
   four named fields. A slot accepting something other than a crystal is one
   table entry.
2. The family split is derived from **the number of filled crystal sockets**,
   never from the constant 4. Otherwise a fifth socket silently rescales every
   composition in the game.

---

## 2. Standing decisions

Settled. Do not relitigate without the user saying so.

**The worlds are a ladder, not three equal opponents.** The pools weigh the same
per monster, but Demonic and Prismatic carry auras and Normal does not, so they
are harder — and they pay in currencies Normal does not. Normal keeps its own
reason to exist through drops nothing else has, which is a debt the unique-gear
phase owes it.

**Death** costs **only the run you died in** and **stops the idle loop**. Not
the crystals, not the gear, and not the haul banked from earlier clears.
Stopping the loop is the real teeth: a set you cleared four times and died on
the fifth is a setup problem you have to go and fix rather than eat repeatedly.

**Crystals level by being used**, only while socketed, per run cleared and
multiplied by the set's danger. Levelling a blank costs a socket that could have
carried danger.

**It must never be strictly better to run an easier map.** Rewards read run
power, and the best items are hard-gated by `DropGate` — below the threshold
they are not in the pool at all, so no amount of rarity argues with it.

**Power buys access; composition and modifiers buy payment.** Item level comes
off power alone. Nothing else may move it.

**Bags overflow rather than losing loot.** A run that drops five items into one
free slot does not destroy four of them. You triage before continuing.

**Crystals are given, never bought.**

**A crystal has LEVELS, never tiers.** Gear has tiers, mods have tiers and a
map has an item level; a fourth ladder called tier on the one thing that gains
experience was the confusing one. The word never reaches the player — the
base ids are still `crystal_t1`..`crystal_t4`, because a save points at them
and renaming one costs the player that crystal for no gain.

**Mod capacity comes from the BASE's tier**, and from nothing else: t1 holds 2,
t2 holds 4, t3 holds 6. Item level still decides how good a roll can be. There
is no currency that raises a base's capacity — you go and find a better base,
which is what makes farming duplicates the thing the gambling currencies are
for.

**Only the adding currency is sold.** Everything else drops. A shop that stocks
the whole bench is a shop that replaces the map.

**Taking the Lampwright's crystal in person means you keep it**, even if you die
later in that descent. This replaces the older rule that a meeting on a descent
you die in was only ever a meeting: it was true while the report paid it out,
and it reads as a bug the moment he hands it over on screen.

**Balance is deliberately loose.** Lean overpowered — too much currency,
characters too strong. It makes testing faster. Do not spend time tuning what is
about to be replaced.

---

## 3. What the art is made of

Read this before touching any of it. A session that does not know these things
will make the same mistakes twice.

**There are no image files.** `docs/` is exactly `index.html` and `app.js`, and
`app.js` is committed because Cloudflare runs no build. Every sprite is a list
of strings — one character per pixel — drawn at runtime onto an offscreen canvas
by `drawPixels` in `src/render/sprites.ts`. Adding a binary asset is a change to
how the game ships, not an art decision.

**Colours come from CSS at runtime.** `readPalette` pulls custom properties out
of the document, and every art key maps a character to a `Palette` entry or a
`mix()` of two. Never write a literal colour into art code: a palette change has
to redraw everything, and that property is worth more than any single sprite.

**Only Pixi draws sprites.** `src/render/pixi.ts` is the real renderer;
`src/render/canvas2d.ts` is a fallback that draws coloured circles with a facing
tick and has no sprites at all. Sprite work is not visible in the fallback,
and that is correct — do not "fix" it. MAP work is the exception: decals are
shared pure functions, so both renderers get them.

**`CELL = 48`** is the offscreen cell every sprite is painted into, so the art
grid has to divide it: 16 gives 3 device pixels per art pixel, 24 gives 2, 32
gives 1.5 and the rect seams stop landing on pixel boundaries. **24 is the last
integer step under the current cell.** Going to 32 means raising `CELL` to 96
first, and is not wanted now.

**Everything is at 24.** All 21 creatures in `src/render/bestiary.ts` carry
`grid: 24`, two walk frames and an `attack` frame; the paper doll and the hooded
traveller followed. `BeastArt.grid` is per-creature and `DOLL_GRID` is the
doll's, and `wellFormed(frames, grid)` checks each against its own declaration,
so a family can be redrawn without the pipeline caring.

**The doll's grip is (17, 14)** and every weapon is drawn against that one
point. `POSES` shifts move it: those numbers are absolute whole pixels, so
anything that changes the figure's size changes all of them.

**A zone is CUT differently as well as coloured differently.** `CUT` in
`src/sim/grid.ts` maps each theme to `built` (the Fissure's rectangles),
`gullet` (rectangles with their corners off) or `grown` (an ellipse inscribed
in the rectangle, ragged by a tile off `tileNoise`, with single pillars left
standing). The `Room` RECTANGLE never changes — every spawn, the entrance and
the exit are placed off it. Two traps, both paid for once already: an ellipse
drawn round the OUTSIDE of the rectangle merges neighbouring rooms and the map
loses its walls; and a room a fifth smaller with the same pack in it is a pack
that arrives all at once, which turned the aura worlds into walls the demo
caught. A wandering corridor may drift at most ONE tile per step, or
consecutive bands stop sharing a row and the halves are only diagonally joined.

**A zone is its own rock, not a tint over the Fissure's.** `THEME_INK` in
`render/renderer.ts` names each zone's whole surface — ground, wall, the dark
between them, what grows, what glints — and a `surface` telling `tileDecals`
HOW to draw a tile: `stone` is coursed masonry, `flesh` is lobes and pores,
`crystal` is facets and growth, `seam` is one or the other tile by tile. Colours
are CSS custom properties like everything else (`--flesh`, `--rose`, and their
neighbours).

**`livingDecals` is the part that moves** — tendrils, spines, the pulse in a
crystal — drawn every frame from the tile's own hash and the clock, never from
stored state. It hangs off FLOOR tiles rather than the walls it grows from,
because a wall's overhang is painted before the floor under it and vanishes.
Pixi draws it into a `propLayer` over the map built once; canvas2d draws it in
the same loop as everything else. Both clip to what is on screen.

**One light, from above and slightly in front** (every sprite faces +x). Mass
takes the lit ink where nothing is above it and the shade where nothing is
below or behind it; a highlight sitting directly under a shadow is light from
underneath and the demo fails on it. Cloth — the bare figure's shirt and
trousers — has no lit ink at all and takes only the shade half: plate catches a
highlight, a filthy traveller's clothes do not.

**A pose is picked from what the entity is doing, not from the clock.**
`poseOf` divides `actionTimer` by `ATTACK_POSE` to get how far through its own
swing an entity is, and indexes `SWING_POSES` / `CAST_POSES` with that. Driving
it off elapsed time makes a fast attack and a slow one look identical.

**The walk is contact, pass, contact, pass** (`WALK_POSES`). A pass has the legs
together, one foot off the ground, and the whole figure a pixel higher — the
`POSES` entry lifts the armour by the same pixel. Feet are the one thing a shift
cannot fake, so `POSES[pose].boot` picks one of four boot grids per family and
nothing else may index `FamilyArt.boots`. Under armour the two CONTACTS are told
apart by the boots trading places, not by the bare figure's leg shading, which
nobody can see.

---

## 4. What the game is made of

The art section above covers the sprites and the map. This covers the parts the
next few phases actually touch. Same purpose: a session that does not know these
will make the same mistake twice.

**`GameState` is plain data in one localStorage key** (`JSON.stringify(game)`),
and `heal()` in `src/game/save.ts` runs on every load. Adding a field costs
nothing — a missing key takes its default. Renaming an id costs the player
whatever pointed at it, and nothing else. `SAVE_VERSION` is only bumped when a
save must be REFUSED, which wipes everyone, so it is the last resort. `heal()`
is also where a migration goes: moving items between containers on load is
exactly what it is for.

**Currencies are DATA, not code.** `CURRENCIES` in `src/data.ts` is a list of
`CurrencyDef` — `targets` (which items it may touch), `requires` (a list of
`Condition`), `effects` (a list of `Effect`, applied in order, rolled back
whole if one fails). The named behaviours live in two registries in
`src/crafting.ts`: `CONDITIONS` (`has_open_slot`, `mod_count`, `not_corrupted`,
`ilvl_at_least`, …) and `EFFECTS` (`add_mod`, `remove_mod`, `scale_values`,
`reroll_values`, `reroll_mods`, `clear_mods`, `add_slot`, `corrupt`,
`set_meta`, …). A new currency is usually a table entry; a new *kind* of
currency is one registry entry plus a table entry. `WHY` maps a failed
condition to the sentence the player is shown.

**`meta.corrupted` is the lock.** It already exists, `not_corrupted` already
guards every currency that should respect it, and the tooltip already says the
item is corrupted. Anything that "locks an item" sets that flag rather than
inventing a second one.

**Containers.** `GameState` holds `inventory` (the dock — gear only, capped by
`CARRY.gear`), `stash` (inert, capacity bought with gold), `haul` (a cleared
run's loot, inert, `HAUL_CAP`), `crystals` (every crystal you own that is not
socketed, UNCAPPED), `sockets` and `shopStock`. Inert means: nothing acts on
the item until it is moved into the dock. `craftId` is a REFERENCE, not a move,
and it resolves across the bag, the collection, the worn slots and the sockets.

**A crystal is never carried.** It is never spent, sold or moved anywhere, so
there is no dock column for it and `carryRoom(game, 'crystal')` is `Infinity`.
`addItem` routes one to `game.crystals` whatever else is full, which is what
makes a gift unable to fail. Two screens read that list: `src/ui/crystals.ts`,
where the collection is compared against four sockets, and the bench's own
crystals column, which is the only route to crafting one.

**Tooltips are plain text today.** `src/ui/tooltip.ts` is 58 lines and does
`textContent = text()`. `attachTooltip(el, () => string)` is how every screen
uses it, and `describeItem` in `src/crafting.ts` builds the string. Anything
that wants colour or layout has to change that seam, not work around it.

**The run loop lives in `src/ui/run.ts`.** `launch()` builds a `RunSim` and
starts ticking; `finish()` banks the report and decides whether another descent
follows (`looping()` is `game.autoRepeat` and not the guided opening). The sim
in `src/sim/` never learns about presentation — a transition, a panel, a
freeze, all of that is the UI holding off on ticking.

---

## 5. Work

Phases are ordered so each leaves the game playable and each is checkable on its
own. Within a phase, roughly dependency order.

### Phase 1 — Capacity comes from the base, and the currencies are rebuilt

The biggest change in this list, and the one the rest lean on.

**What is true today.** Mod capacity is `QUALITIES[quality].mods` — 0/2/4/6 —
split across typed slots (offence / defence / utility) by `slotAllocation` in
`src/mods.ts`, and read through `slotCapacity` / `hasOpenSlot` / `modCapacity`.
Quality is raised by a ladder of currencies: Seaming, Ascent, Cleaving, and
Ruin taking it all the way back. That ladder is what makes crafting a chore
gate, and the crystal screens have already stopped naming it.

**What replaces it.** Capacity comes from the base's TIER. Armour bases are
generated by `armourBases()` in `src/data.ts` — 12 families × 4 kinds × 3 tiers,
with `ARMOUR_BUDGET = [20, 32, 46]` and `BASE_TIER_ILVL = [1, 22, 46]` already
laddering by tier. Weapons carry the same three rungs through `BASE_TIER_ILVL`.

- [ ] **t1 holds 2 modifiers, t2 holds 4, t3 holds 6.** `GearBase.slots` gains
      the tier's allocation rather than one layout per kind. Split across the
      typed slots the way `ARMOUR_SLOT_LAYOUT` already does; the split is a
      design table, the total is the rule.
- [ ] Quality stops granting slots. `QUALITIES` loses `mods`. `qualityOf`,
      `qualityRank`, the `quality_is` / `quality_at_least` / `quality_below`
      conditions and the `set_quality` effect all go. `DropBand.quality` goes
      with them — a band still controls item level, how many modifiers a drop
      rolls with (`fill`), how often gear drops (`gearChance`) and which class
      of currency it can reach, which is plenty.
- [ ] Item level keeps its job unchanged: how good a roll can be. **Nothing
      raises it** — that is §2, power buys access.

**The currencies.** Six kinds, and most of the machinery is already there.
Everything below is a `CurrencyDef` entry in `src/data.ts` plus, where noted,
one registry entry in `src/crafting.ts` (§4).

| Want | Class | What exists today |
|---|---|---|
| **Add one modifier** | basic | `shard_of_making` — "Fills one empty slot with a random modifier". Keep as is. **The only one the shop sells.** |
| **Remove one modifier, CHOSEN** | rare | `shard_of_unmaking` removes one *at random*. Needs a targeted variant of `remove_mod` and a bench affordance. |
| **Re-roll every modifier** | uncommon | `shard_of_chaos`, minus its Faceted gate. `shard_of_turning` is the same thing gated to Seamed — retire it. |
| **Re-roll every value** | uncommon | `shard_of_change` — "Re-rolls the numeric values of all modifiers". Keep. |
| **The value gamble** | exotic | `sigil_of_finality` already IS this — "Empowers or diminishes every modifier by 25% at random, then corrupts". It clamps to the modifier's range; the whole point is that it must not. |
| **The modifier gamble** | exotic | New. Nothing does this. |

- [ ] The **remove** currency is targeted: you arm it, then click the modifier
      you want gone. `src/ui/craft.ts` already draws each modifier as a facet
      with a tooltip, so the affordance is a class and a click handler on
      something that is already on screen. Everything else stays random —
      targeting is what makes a chase collapse, which is why there is no
      targeted re-roll.
- [ ] The **value gamble** rolls each modifier up or down by 25%
      independently, and **ignores the modifier's maximum**. That is the whole
      currency: a max-rolled 100% Spell Damage wand can come out at 125%, or at
      75%. `scale_values` clamps today; it needs a variant that does not, and
      the demo needs a check that this is the ONLY thing in the game that can
      put a roll above its modifier's ceiling.
- [ ] The **modifier gamble** is a coin flip: either add one new random
      modifier **past the capacity cap**, or remove one at random. Needs an
      effect that can add past `modCapacity`.
- [ ] Both gambles then **lock** the item by setting `meta.corrupted` (§4).
      Every currency already refuses a corrupted item through `not_corrupted`,
      so nothing else has to learn about it. The tooltip must say the item will
      be locked BEFORE it is used — a one-way door nobody saw is a bug report.
- [ ] `sigil_of_finality` carries a `DropGate` to the Seam. Keep that gate on
      whichever of the two gambles it ends up as, so the Seam keeps something
      that is only its own (§2).

**Retired, and why.** All of these lose their job when quality does:

- `shard_of_seaming`, `sigil_of_ascent`, `shard_of_cleaving`,
  `sigil_of_brilliance`, `shard_of_ruin` — the quality ladder itself.
- `sigil_of_excess` — "one modifier beyond the limit" is what the modifier
  gamble now buys, at a real risk instead of for free.
- `shard_of_awakening` — "fills every empty slot at once" makes the adding
  currency pointless.
- `sigil_of_refinement` — "upgrades one modifier to a higher tier" is targeted
  improvement, which is the thing that must not exist.
- `shard_of_turning` — a duplicate of `shard_of_chaos` once the gate is gone.
- `whetstone_of_might` and `oil_of_swiftness` — guaranteed Damage / Speed on
  GEAR. Targeting, on the chase that is supposed to be a chase.

**Kept, deliberately:** `essence_of_the_swarm` and `essence_of_greed` guarantee
a Density or Reward modifier on a **crystal**. That is targeting too, and it
stays: a crystal is a configuration you are supposed to be able to aim, and
none of the gear chase runs through it. If that turns out to feel wrong, it is
two table entries to remove.

- [ ] Retired ids are dropped by `heal()` and players lose those currencies.
      That is the documented cost of an id rename and needs no `SAVE_VERSION`
      bump.
- [ ] The shop's shelf (`SHOP` in `src/data.ts`) stocks the adding currency and
      nothing else. Its gear shelf is untouched.

**What must not break.** `npm run mods` holds every modifier to rolling, doing
something and reading as English. The demo's crafting section walks one item
through the whole ladder and prints it — that section is now wrong end to end,
so rewrite it against the new set rather than deleting it: it is the only place
a currency's failure MESSAGE is ever read. Two new invariants worth adding
while you are there: a locked item refuses every currency, and the value gamble
is the only thing in the game that can put a roll above its modifier's maximum.

### Phase 2 — Tooltips you can read

The information is right and the presentation is a wall of monospace. Other
ARPGs solved this; copy them.

**The seam.** `src/ui/tooltip.ts` sets `textContent`, so there is no markup in
a tooltip anywhere in the game. `describeItem` in `src/crafting.ts` builds one
string, and `describeStatLine` flattens a rolled value and its stat name into
one run of text. Both have to hand back parts.

- [ ] `showTooltip` takes structured content as well as a string. Everything
      that passes a string keeps working — currency and skill tooltips can stay
      text — so this is additive, not a rewrite of every caller.
- [ ] A bigger box with real padding, and a rule between sections.
- [ ] **Colour separates what varies from what does not.** The rolled number is
      one colour, the stat's name another. That contrast is most of the win, and
      it is exactly what `describeStatLine` currently destroys.
- [ ] Modifiers grouped and spaced: implicit lines under a Base heading, then
      rolled mods grouped by slot type with a gap between groups, each showing
      its tier and name the way it does now.
- [ ] **Border by base tier**: white t1, blue t2, yellow t3, and **orange for a
      locked item** — a state worth seeing from across the screen. All four are
      CSS custom properties in `docs/index.html`, never literals.
- [ ] Anything else that reads better is welcome. It is a presentation phase;
      the check is whether you can find the good modifier in under a second.
- [ ] `npm run shots` for overflow at both sizes, `npm run smoke` for console
      errors. A tooltip that runs off the screen is the failure this catches.

### Phase 3 — Inventory management

- [ ] A **sort by kind** button on the dock. It reorders `game.inventory` in
      place, and the order is saved, so it sticks.
- [ ] **Arming a currency lights up what it can touch.** `canApply(item,
      currency)` already exists and `src/ui/craft.ts` already computes it for
      the currency row. The dock already has a `highlighted` predicate for the
      crafting selection — extend that one rather than adding a second
      mechanism, and light every item the armed currency would accept.
- [ ] The same highlight answers "why can I not use this" without a click, so
      the dimmed items should carry the `WHY` sentence in their tooltip.

### Phase 4 — The shop sells and buys back, and the haul empties

- [ ] Replace **Sell unmodified gear** in `src/ui/shop.ts` with a **Sell mode**
      toggle. While it is on, a left-click on a dock item sells it. Mode is UI
      state, not saved — it should not survive a reload and surprise anyone.
- [ ] A **sold list** in the same panel: the last 12 pieces, each with **Buy
      back** at exactly what it sold for. Saved in `GameState`, so it survives a
      reload; buying back removes it from the list. No room in the dock means
      the button is disabled and says why.
- [ ] **Right-click a shop currency** opens a quantity picker: 5 / 10 / 20 / as
      many as you can afford. Left-click still buys one.
- [ ] **Sell all** on the haul, beside the bulk buttons in `src/ui/haul.ts`.
      Takes everything still in the haul, behind a confirm naming the count and
      the gold (`src/ui/confirm.ts` exists).
- [ ] The rule that must survive all of it: **selling needs room nowhere.** That
      is what stops a full haul wedging the loop, and the demo builds the wedge
      and checks the way out.

### Phase 5 — The descent transition

A cleared descent swaps the map between two frames and it reads as a glitch.

- [ ] About **1.2 seconds**, and on every launch including the first: the hero
      steps into a hole at the exit, a short fade, then climbs out of the
      entrance in the new map. Short enough that you never wait on it — this
      plays twenty times in a session.
- [ ] **The hole belongs to the zone.** The Fissure is a ladder into the rock,
      the Cavern a crystal throat, the Rot a mouth that opens. It is a decal
      keyed on the EXIT tile and the theme, so it goes in
      `tileDecals` / `livingDecals` in `src/render/renderer.ts` and both
      renderers get it (§3).
- [ ] **Nothing in `src/sim` learns about this.** The report is built and the
      loot banked exactly as now; the transition is the UI declining to tick
      for a moment while it draws. `launch()` and `finish()` in `src/ui/run.ts`
      are the two seams.
- [ ] Input is never blocked. Leave and Abandon do what they say mid-transition.

### Phase 6 — Meeting the Lampwright

Today he is a number. `meetAt` in `src/sim/run.ts` is a kill count; crossing it
pushes a `met` event, and the REPORT pays the crystal out at the end.

- [ ] He is a **body on the map**. When the kill count is crossed he appears in
      a room already cleared, the hero walks to him, and the descent freezes
      when they meet.
- [ ] A **panel**: his line, the crystal he is holding drawn as an item, and one
      button. Dismissing it grants the crystal **immediately** and unfreezes.
- [ ] **You keep it even if you die later in that descent** (§2 — this replaced
      the older rule and the older rule is gone).
- [ ] The freeze is not a pause. The loop has no pause state and is not getting
      one; the UI simply stops ticking the sim while the panel is up.
- [ ] **The first meeting teaches**: what a crystal is, that it goes in a
      socket, and that a socket makes the run LONGER rather than harder — which
      is the single thing new players get wrong. Later meetings are two lines
      and no lesson.
- [ ] His words live in `LAMPWRIGHT` in `src/data.ts`, next to the name and the
      gift chance, never in the UI module.
- [ ] The guided opening now contains a meeting, so `npm run guide` has to walk
      through it.

### Phase 7 — The danger retune

Carried out of the rewards work, where it was deferred on purpose: setting the
danger modifiers before the aura system existed would have meant setting them
twice. The aura system exists now.

**The debt, stated precisely.** Difficulty lives entirely in crystal modifiers,
and twelve modifiers across four sockets have to span what the old
`MONSTER_TIER_SCALE` spanned on its own. The danger mods were widened when tier
was removed, but not that far, so **the top set is still clearable ten times out
of ten**. The game is loose in the direction §2 asks for, which is why this
waited rather than blocking anything.

- [ ] Widen the danger modifiers until the top of what four sockets can hold is
      genuinely a wall for gear farmed a band below it — measured, not felt.
- [ ] Hold both ends of `THE LADDER` while doing it. The free descent must stay
      beatable by a character that owns nothing and still cost it something, and
      the rung the guided opening puts in front of a new player — one socket,
      first crystal — must stay clearable most of the time. That rung has its
      own check because it is the one the game shows first and nothing was
      watching it.
- [ ] Respect `DEFENCE.monsterHitFloor`. Two caps of 75% multiply into a map
      that cannot hurt you; the floor holds armour back to whatever the wards
      left room for, and a quarter of every hit lands regardless.

### Phase 8 — Unique gear

Items with fixed identity and a behaviour attached, closer to a tree passive
than to a rolled mod, but broad enough to work across builds.

Examples given: gloves that make projectiles arc to one extra target but deal
slightly less damage; a helmet granting a lot of flat damage that also adds it
to attacks *you* take.

- [ ] Unique item concept — fixed mods, optionally with ranges on flat stats.
- [ ] Uniques grant **behaviours through the existing `GRANTS` table**
      (`src/sim/grants.ts`), not a parallel system. The merge rules
      (`mergeGrants`) and the demo's rule that every grant must be declared and
      read by some behaviour then apply to gear for free.
- [ ] Grant collection reads equipment as well as the tree — `treeGrants` in
      `src/sim/stats.ts` is the seam.
- [ ] Drop-gated by zone through `DropGate`: some uniques only from a full
      Demonic run, some from full Prismatic, some only from the Seam — **and
      some only from Normal**, which is what the Fissure gets in exchange for
      being the easy world (§2).

---

## 6. Open questions

Do not guess at these.

1. **What is the fifth socket?** Wanted as an endgame slot holding something
   that is not a crystal. Deliberately unspecified — the user wants to think
   about it. §1 says how to keep it cheap to add; nothing else should assume it.

---

## 7. Backlog

Real, deferred by decision. Do not spend time here until the systems above stop
moving — see §2, balance is deliberately loose.

- **Fewer items per clear.** Measured today: gear is rolled per KILL at
  `gearChance × yield × (1 + rarity/200)`, which is roughly **two to eleven
  pieces a clear** across the bands. The plan was to halve that and gate the
  three armour tiers behind power thresholds, so quantity resets down each time
  quality steps up, with gold per clear held flat across a threshold — crossing
  one must never read as a demotion. Deferred deliberately: it may only feel bad
  because the opening hands you everything at once, and readable tooltips plus
  real selling may fix the feeling without touching the rate. Revisit after
  Phases 2 and 4, and measure before changing anything.
- **No per-item "keep" rule for the haul.** Every drop goes to the haul and
  triage is manual. A filter that hides a drop is the kind of thing you only get
  right once you know what a good drop looks like, and uniques will move that
  answer again.
- Blight clears the top of the ladder 12/12 where Strike manages 3/12. A large
  skill imbalance that predates the difficulty work.
- More tutorial steps for systems added since the opening was written.
- Multiple item-disposal routes, so selling is not the only option.
- Four-frame walks for the bestiary, if the creatures ever grow legs worth
  animating.
- A drawn recovery frame per creature. They have one `attack` grid each and
  hold it for the whole swing — the same thing the hero's swing just stopped
  doing — and fixing it is 21 more grids in `src/render/bestiary.ts`.

---

## 8. Conventions for work done from this document

- Everything in `CLAUDE.md` still applies — the comment budget, the save rules,
  the tree rules. Read it first.
- Check boxes as they land. Delete a phase once it is finished rather than
  leaving it checked, and move anything that turns out to be wrong into §6
  rather than silently doing something else.
- Every phase should leave the full suite green: `comments`, `typecheck`,
  `demo`, `mods`, `build`, `smoke`, `shots`, `guide`. Build before `smoke`,
  `shots` or `guide` — they load the bundle, not the source.
- **The guided opening (`npm run guide`) walks the real UI with a real pointer.**
  `src/ui/tutorial.ts` is data — steps with `done` predicates — so when a change
  breaks it, the fix is editing those steps, not the harness.
- Balance claims need a measurement, not an impression. `ladderCharacter` in
  `src/sim/loadout.ts` and the harnesses in `src/demo.ts` are the tools; a
  throwaway probe script is fine for anything they do not cover.
- Art claims need a screenshot. `tools/model-sheet.mts` draws every look and
  every creature, `tools/model-peek.mts` draws a few of them large, and
  `tools/zone-peek.mts` draws all four zones off a real generated map. None is
  in the suite. The demo's sprite checks prove grids are square, not that
  anything reads.
- `npm run shots` covers the welcome, the Fissure, the collection, a descent,
  the skill web and the BENCH at two sizes. The bench shot is the one that
  catches a third column not fitting — it is the widest screen in the game.
