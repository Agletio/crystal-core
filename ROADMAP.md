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

**Capacity comes from the base's TIER, and nothing else.** `GearBase.tier` is
1, 2 or 3; `BASE_TIER_MODS` is `[2, 4, 6]`; `modCapacity` is the lower of that
and what the slot table declares. `GearBase.slots` says only WHERE a modifier
may go — `slotAllocation` deals the tier's budget over those types, richest
first. Nothing raises a tier: a bigger item is a better base, found. Item
level decides how good a roll can be and which bases drop at all, so a drop
band's `ilvl` is its ceiling twice over. A crystal's level is the same idea in
one `mod` slot.

**Currencies are DATA, not code.** `CURRENCIES` in `src/data.ts` is a list of
`CurrencyDef` — `targets` (which items it may touch), `requires` (a list of
`Condition`), `effects` (a list of `Effect`, applied in order, rolled back
whole if one fails). The named behaviours live in two registries in
`src/crafting.ts`: `CONDITIONS` (`has_open_slot`, `mod_count`, `not_corrupted`,
`ilvl_at_least`, …) and `EFFECTS` (`add_mod`, `remove_mod`, `gamble_mod`,
`scale_values`, `reroll_values`, `reroll_mods`, `add_slot`, `corrupt`, …). A
new currency is usually a table entry; a new *kind* of currency is one registry
entry plus a table entry.

**There are eight currencies, in six kinds.** Add one (`shard_of_making`, the
only thing the shop sells); remove the one you CHOOSE (`shard_of_unmaking`,
armed at the dock and fired by clicking a modifier — the only targeting in the
game); re-roll which (`shard_of_chaos`); re-roll the values
(`shard_of_change`); and two gambles that lock the item, `sigil_of_finality`
(every value ±25%, past the modifier's maximum — the ONLY thing that can do
that) and `sigil_of_upheaval` (one modifier past the cap, or one gone). The
two crystal essences guarantee a Density or a Hunting modifier. `scale_values`
never clamped, so Finality already worked as specified — what changed was that
it now says so.

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

**An item is drawn in exactly one place.** `itemCard(item, notes)` in
`src/ui/itemcard.ts` builds the card every screen hovers — the dock, the haul,
the stash, the shelf, the sheet and both of the bench's columns. `notes` is the
only thing that differs per screen: the lines about what a click does, or why
it cannot. Adding a fact about an item means editing one function.

`showTooltip` takes a string OR an element. A currency or a skill is still a
string — every line of those is a sentence. `statParts` in `src/mod-text.ts` is
the seam that makes the card worth having: it splits a rolled line into the
NUMBER and the words around it, so `.rolled__v` can be one colour and
`.rolled__k` another. `describeStatLine` is derived from it, so the text and
the markup can never drift. `describeItem` in `src/crafting.ts` is the
text-only version and is now the demo's alone.

**Selling is undoable, and needs room nowhere.** `sellItem` puts the piece on
the counter (`GameState.sold`, newest first, `SOLD_CAP` of them) at exactly
what it paid; `buyBack` takes it off for the same number, so the pair is
neutral and the shelf cannot be ground for gold. A SALE needs room nowhere — 
that asymmetry is what stops a full haul wedging the loop — but a buy-back is
a purchase and refuses when there is nowhere to put it. Sell mode is UI state
in `src/ui/shop.ts` laid over the dock through `setInventoryOverride`.

**A currency is ARMED, then pointed.** Clicking a stack in the dock with
nothing benched — or a stack the benched item refuses, or the targeted removal
— arms it: `src/ui/craft.ts` holds `armed` as UI state, never saved. While it
is up the dock lights every item `canApply` accepts and dims the rest, each
dimmed one carrying the refusal in its own tooltip. Clicking a lit item applies
the shard; the targeted one benches the item and waits for a modifier instead.
The old flow is untouched: a benched item the shard accepts still fires on the
click. `InventoryHandler` grew `dimmed(item)` beside `highlighted(item)`, which
is the one mechanism both use.

**The run loop lives in `src/ui/run.ts`.** `launch()` builds a `RunSim` and
starts ticking; `finish()` banks the report and decides whether another descent
follows (`looping()` is `game.autoRepeat` and not the guided opening); `land()`
is the one terminus every ending arrives at. The sim in `src/sim/` never learns
about presentation — a transition, a panel, a freeze, all of that is the UI
holding off on ticking.

**The handover is the pattern for that.** `HANDOVER` seconds where the sim does
not tick at all: the hero drops into the hole at the exit, `#run-fade` goes
black for the moment the map is swapped, and they climb out of the next
entrance. `emerge` (1 standing, 0 underground) is passed to `Renderer.draw` and
moves the hero sprite; the fade hides the swap. `banked` holds the report the
drop is carrying so Abandon mid-drop lands THAT one rather than building a
second and banking the loot twice. The hole itself is a `mouth()` decal on the
ENTRANCE and EXIT tiles, per zone, so both renderers get it.

---

## 5. Work

Phases are ordered so each leaves the game playable and each is checkable on its
own. Within a phase, roughly dependency order.

### Phase 1 — Meeting the Lampwright

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

### Phase 2 — The danger retune

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

### Phase 3 — Unique gear

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

2. **The Cavern and the Fissure have no currency of their own.** Retiring the
   quality ladder took `sigil_of_refinement` with it, which was Prismatic's
   exclusive, and nothing replaced it. Today `sigil_of_upheaval` is gated to
   Demonic and `sigil_of_finality` to the Seam; the other two worlds are gated
   to nothing. §2 says a world should have a reason to be entered, and the
   unique-gear phase already owes the Fissure one — so this may be the same
   debt rather than a second. **Provisional, and mine, not the user's:** left
   as it is rather than inventing a gate. Ask before gating an existing
   currency to the Cavern — it would make a staple zone-locked.

---

## 7. Backlog

Real, deferred by decision. Do not spend time here until the systems above stop
moving — see §2, balance is deliberately loose.

- **Jewellery has three rungs but no implicit.** `amulet`/`jade_amulet`/
  `onyx_amulet` and `ring`/`silver_band`/`gold_band` differ in exactly one
  way: how many modifiers they hold. That is the clearest statement of what a
  base tier is, and it is also the least interesting pair of slots in the
  game. Implicits for them would fix that; they are a balance change, so not
  in a phase about capacity.
- **Fewer items per clear.** Measured before the tooltip and shop work: gear
  is rolled per KILL at `gearChance × yield × (1 + rarity/200)`, roughly **two
  to eleven pieces a clear** across the bands. The plan was to halve that and
  gate the three armour tiers behind power thresholds, so quantity resets down
  each time quality steps up, with gold per clear held flat across a
  threshold — crossing one must never read as a demotion.
  **The two things it was waiting on have landed.** Base tiers now gate
  themselves through item level, tooltips are readable, and Sell mode plus
  buy-back mean a heap of drops is a few clicks rather than a chore. So the
  question is now answerable rather than deferred: play it, and if it still
  feels like too much, measure the rate before changing it.
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
- `npm run shots` covers the welcome, the Fissure, the collection, the
  HANDOVER, a descent, the skill web, the BENCH and an item TOOLTIP at two
  sizes. The bench shot catches a third column not fitting; the tooltip shot
  rolls four modifiers onto a piece first, because a blank one shows none of
  the grouping; the handover shot fires 180ms into a launch, which is the
  hero half out of the entrance.
