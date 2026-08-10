# Crystal Core — Roadmap

**This is the master to-do list.** It is the design of record for work that has
not been built yet. `CLAUDE.md` describes the game as it *is*; this describes
where it is going.

If you are picking this up with no other context: read §1 for where things
stand, §2 for decisions that are settled, then start at the lowest unchecked
phase in §4. §5 lists what is still undecided — do not guess at those, ask.

Landed phases are deleted from this file rather than left checked, so everything
below §4 is work. The numbers in here are intent, not tuning.

---

## 1. Where things stand

The socket model is built and the game runs on it. `CLAUDE.md` is the accurate
description; the short version, because the phases below assume it:

Four sockets hold permanent crystals. Their COUNT is run length, their MODIFIERS
are the whole of difficulty, a crystal's TIER is only mod capacity (T1–T4 → 0–3)
and its FAMILY — Normal, Demonic, Prismatic — is only which monsters spawn.
Composition picks the zone. Everything a run pays reads one derived number
(`POWER`, `runSet()`). Crystals are given, never bought: the Lampwright hands
out the Normal ones, quests pay the other two, and a crystal levels only while
socketed. A cleared descent launches the next one until you die, fill the haul,
or stop it; every ending lands on the same report and the same haul screen. Gold
is the one currency. Demonic and Prismatic carry auras and Normal does not, so
the three worlds are a ladder as well as three opponents.

**What is left is the art.** The systems stopped moving; the sprites did not
keep up with them. Phases 1–2 are that work. Phase 3 is the one balance debt
carried out of the systems work, and Phase 4 is the next feature.

### Keeping room for a fifth socket

Still wanted eventually, still unspecified (§5). Two rules keep it cheap, and
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
reason to exist through drops nothing else has, which is a debt Phase 4 owes it.

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

**Balance is deliberately loose.** Lean overpowered — too much currency,
characters too strong. It makes testing faster. Do not spend time tuning what is
about to be replaced.

---

## 3. What the art is made of

Read this before starting any of Phases 1–2. A session that does not know these
five things will make the same mistakes twice.

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
tick and has no sprites at all. Phase 1 is not visible in the fallback,
and that is correct — do not "fix" it. Phase 2 is the exception: map decals are
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

## 4. Work

Phases are ordered so each leaves the game playable and each is checkable on its
own. Within a phase, roughly dependency order.

### Phase 1 — Silhouette rules per family

Legibility at play zoom is an outline problem, not a pixel-count one. A tile is
around 47px at zoom 2, so one art pixel is two screen pixels — detail at that
size is mush and shape is not. Today each creature was designed on its own, so
the three worlds do not read as three worlds at a glance.

- [ ] Give each family a silhouette law and hold every member to it:
      - **Normal** — the baseline. Upright, roughly as tall as wide, nothing
        overhanging.
      - **Demonic** — heavy and LOW. Mass in the bottom third, wide base,
        shoulders forward. Reads as something that hits hard from close.
      - **Prismatic** — angular and TALL. Narrow base, mass high, straight edges
        and points rather than curves. Reads as something brittle at range.
- [ ] Make it a check rather than an intention. Both numbers come off the
      character grids with no canvas: the occupied-pixel centroid height, and
      the base width (occupied columns in the bottom quarter), each as a
      fraction of the grid. Demonic sits low and wide, Prismatic high and
      narrow, Normal between. Put it beside the existing bestiary checks in
      `src/demo.ts` and set the bounds from the measured spread.
- [ ] Redraw whatever fails. That is the phase — the rule is cheap, the
      conformance is the work.

### Phase 2 — Zone props

The best world identity per byte in the project, and the only art work that
reaches both renderers.

`tileDecals(floor, at, x, y)` in `src/render/renderer.ts` is pure and per-tile,
and Pixi and the canvas fallback both read it, so anything added here is themed
for free and shows up in the fallback too.

- [ ] Props are placed by `tileNoise(x, y, salt)` — a hash of the coordinate, so
      both renderers put the same prop on the same tile with no state and no
      seed threaded through. Pick unused salts; wall growth uses 81–85.
- [ ] Draw in palette colours only. `floorPalette` already carries each theme's
      inks (`growth`, `growthAlt`, `glint`, `growthDensity`) and `THEME_INK` is
      where a new one goes.
- [ ] Sizes are fractions of a tile (`U`, `SUB`, `snap`), never pixels — tile
      size changes with zoom.
- [ ] Roughly in value order: bones and skulls on the Fissure floor; braziers
      with an ember glint in the Rot; crystal clusters growing out of the FLOOR
      as well as the walls in the Cavern; and for the Seam, the prop that can
      only exist where two worlds meet — crystal growing through a bone or
      through a brazier.
- [ ] Keep the density low. `tileDecals` runs for every visible tile every frame
      in the fallback, and a floor covered in props is a floor you cannot see
      monsters on. The wall-growth densities (0.34–0.46, and only on wall faces)
      are a ceiling, not a target.
- [ ] Extend the demo's theme-distinguishability check to props, so a prop table
      that renders identically in two zones fails the way a duplicate tileset
      already does.

### Phase 3 — The danger retune

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

### Phase 4 — Unique gear

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

## 5. Open questions

Do not guess at these.

1. **What is the fifth socket?** Wanted as an endgame slot holding something
   that is not a crystal. Deliberately unspecified — the user wants to think
   about it. §1 says how to keep it cheap to add; nothing else should assume it.

---

## 6. Backlog

Real, deferred by decision. Do not spend time here until the systems above stop
moving — see §2, balance is deliberately loose.

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

## 7. Conventions for work done from this document

- Everything in `CLAUDE.md` still applies — the comment budget, the save rules,
  the tree rules. Read it first.
- Check boxes as they land. Delete a phase once it is finished rather than
  leaving it checked, and move anything that turns out to be wrong into §5
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
  every creature; `tools/model-peek.mts` draws a few of them large, which is the
  view that answers whether a piece reads. Neither is in the suite. The demo's
  sprite checks prove grids are square, not that anything reads.
