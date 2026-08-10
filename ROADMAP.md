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
keep up with them. Phases 1–5 are that work. Phase 6 is the one balance debt
carried out of the systems work, and Phase 7 is the next feature.

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
reason to exist through drops nothing else has, which is a debt Phase 7 owes it.

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

Read this before starting any of Phases 1–5. A session that does not know these
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
tick and has no sprites at all. None of Phases 1–4 is visible in the fallback,
and that is correct — do not "fix" it. Phase 5 is the exception: map decals are
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

---

## 4. Work

Phases are ordered so each leaves the game playable and each is checkable on its
own. Within a phase, roughly dependency order.

### Phase 1 — A walk that walks

The current walk cycle reads as the figure doing the splits on the spot, and the
reason is exact: **both frames have both feet planted.** `walk0` puts the feet
2 apart, `walk1` puts them 6 apart and drops the whole figure a row. Nothing
ever passes. A cycle needs a frame where the legs are TOGETHER and one foot is
off the ground — that is the frame that turns two poses into a step.

The fix is the standard four-frame cycle: **contact** (feet apart, weight
landing) → **pass** (legs together, rear foot lifted, body up one pixel) →
**contact** (the other leg leading) → **pass** (the other foot lifted). Two of
the four are new drawings; the contacts are the existing pair with the leading
leg swapped.

- [ ] `PoseId` in `src/render/pose.ts` gains `walk2` and `walk3`, with shifts in
      `POSES`. Everything keyed on `PoseId` follows for free — `POSE_IDS` drives
      `makeLookFrames`, so a look becomes six textures instead of four.
- [ ] `poseOf` in `src/render/pixi.ts` currently reads
      `Math.floor(elapsed * WALK_CYCLE) % WALK_FRAMES ? 'walk1' : 'walk0'` — a
      boolean. It has to index a walk-pose list instead.
- [ ] **Split `WALK_FRAMES`.** It lives in `sprites.ts` and is shared with
      creatures: `ATTACK_FRAME = WALK_FRAMES` and `CREATURE_FRAMES =
      WALK_FRAMES + 1`. Creatures have two walk frames and are not getting four;
      bumping the shared constant allocates creature frames nothing draws. The
      doll's cycle length comes from its pose list, and the creature count stays
      its own.
- [ ] **Boots do not quadruple.** `layerRows` in `look.ts` picks a boot frame
      with `const stride = pose === 'walk1' || pose === 'attack'`. Replace the
      boolean with an explicit `Record<PoseId, 0 | 1>` mapping both contacts to
      the apart drawing and both passes to the together drawing. That holds
      boots at 24 grids instead of 48.
- [ ] Arm swing comes from `POSES[...].hand`, not from new drawings. That is
      what the shift system is for, and it is why a body tweak does not strand
      sixty pieces of armour.
- [ ] Check the bob. `pixi.ts` lifts the sprite by
      `|sin(elapsed * WALK_CYCLE * π)| * 0.06`; with four frames it has to peak
      on the passes and trough on the contacts, or the figure rises as it lands.

Creatures walk on two frames and read fine, having no legs to speak of. Do not
four-frame the bestiary here.

### Phase 2 — Attack and cast are frames, not shifts

Melee looks like nothing happens because, on the body, nothing does. `attack` is
`walk1`'s legs with `all: [2, 0]` and `swing: true`; the WEAPON has two drawings
(`WEAPON_ART[kind].rest` and `.strike`) so the sword moves, but the figure under
it is a walking pose nudged one pixel forward. `cast` is one frame with the hand
shifted up.

- [ ] A swing is two body frames: wind-up with the shoulder rotated back and
      weight on the rear foot, then follow-through driven through with weight
      forward. The weapon already has the two drawings to hang off them.
- [ ] A cast is two frames: gather, then release.
- [ ] **Pick the frame from the swing, not from the clock.** An attack has a
      duration in `src/sim/run.ts`; `poseOf` receives the `Entity`, so the frame
      must come from how far through its own attack the entity is. Driving it
      off `elapsed` makes a fast attack and a slow one look identical, which is
      the bug this phase is meant to fix rather than move.
- [ ] Optional half: monsters got exactly one attack frame in the bestiary pass
      (`BeastArt.attack`, drawn at `ATTACK_FRAME`) and hold it for the whole
      swing — the same problem in miniature. A second frame each is 21 more
      grids and can be taken separately.

### Phase 3 — One light, every key

The cheapest depth in the project, and the thing that will make 24 look like a
decision rather than a bigger 16. `TRIM`/`TRIM_LIT` already set the precedent:
two characters for one material, the lit one where the light lands, swapped by
`atTier`.

The inks already exist everywhere — `BeastTone` is mass/lit/shade/eye,
`FamilyTone` is mass/lit/dark/trim/trimLit. What does not exist is a **rule**
about where they go, so families are lit from different directions and some are
not lit at all.

- [ ] Adopt one law and hold everything to it: **light from above and slightly
      in front** (every sprite is drawn facing +x; the renderer flips rather
      than rotates). Top surfaces and forward edges take the lit ink, undersides
      and trailing edges take the shade ink, one pixel deep, no gradients.
- [ ] Apply it across `FAMILY_ART`, `BODY`, `HERO_FRAMES` and `BEASTIARY`. It is
      a handful of characters per sprite, not a redraw.
- [ ] Keep `lookKeyColours` in `sprites.ts` as the single table it is — it is
      what makes the gauntlet and the hand inside it lit by the same source.
- [ ] Worth a demo check, if it can be stated without false positives: a lit
      pixel sitting directly under a mass pixel in the same column is light from
      underneath. Set any allowance from the measured spread rather than by
      guess, the way the `BODIES` bound was set.

### Phase 4 — Silhouette rules per family

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

### Phase 5 — Zone props

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

### Phase 6 — The danger retune

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

### Phase 7 — Unique gear

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
