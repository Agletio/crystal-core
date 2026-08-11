# Crystal Core — Roadmap

**The list of work, and nothing else.** Everything that is always true lives in
`RULES.md`; the game as it stands is `CLAUDE.md`. If a thing here is not a task
or something you need in order to do one, it is in the wrong file.

Do the lowest-numbered phase that is not blocked on an open question, all of it,
then delete it from here and renumber. Numbers in a phase are intent, not
tuning — a measurement beats them. A landed phase is DELETED from here, so
before starting one, `git fetch` and check you are on the tip of the branch:
a phase you can still see in a stale clone may already be built.

**Where these came from.** Ten of them, dictated by the user in one go. The
number in brackets on each is the user's own, so a phase can be matched back to
what was asked for; the ORDER here is dependency order and does not match.
Several are blocked on an Open question below — skip a blocked one and take the
next, rather than guessing at it.

---

## Phases

**Writing one.** The test is whether a session with no memory of this
conversation could execute it. That takes four things, and the second is the one
usually missing:

1. **What is true today**, named in code — the constant, the function, the file.
   "The shop sells too much" is not executable; "`RECIPES` in `src/data.ts` has
   eleven entries and should have one" is.
2. **Why it is wrong**, in one sentence a stranger would agree with. Without
   this the next session optimises the wrong thing correctly.
3. **Checkboxes that are decisions**, not tasks. "Border by base tier: white
   t1, blue t2, yellow t3" can be done wrong and caught; "improve the tooltip"
   cannot.
4. **What must not break**, and which harness proves it.

Anything you are unsure about goes in Open questions, never into a phase as an
assumption. A phase that guesses is a phase that has to be undone.

### Phase 1 — The opening stops naming one weapon [user 2, 4]

**What is true today.** `src/ui/tutorial.ts` has fifteen steps. Three of them
hardcode the wand: `select_weapon` says "Click your **Ash Wand** in the dock",
`use_making`'s hint opens "An **Ash Wand** is a tier 1 base", and `equip` says
"Click the **Ash Wand** in the dock". The item those steps point at is already
resolved by identity rather than by name — `theWand(g)` reads `giftWeapon(g)`,
which finds `meta.firstClear === true` — so only the WORDS are wrong. A Strike
character is handed a Rusted Sword by `STARTER_WEAPON` and told to click a wand.

Separately, `bench_crystal` (step 13) is reached with the HAUL open over it,
because `land()` opens the haul on every ending and the second meeting is an
ending. Its blocked branch says only "Close this and open Crafting", so the
opening's own second haul is a screen it tells you to dismiss unread.

**Why it is wrong.** The game names a weapon the player is not holding, and it
will do it again for every weapon added. And a step that says "close this"
about the haul is teaching the opposite of the step that taught the haul.

- [ ] No step names a weapon base. Either "your weapon", or the item's own
      `name` read off `giftWeapon(g)` — pick one and use it in all three.
      The `meta.firstClear` mark is what identifies it and does not change.
- [ ] `bench_crystal` takes the haul first: while `ctx.top === 'haul'` it points
      at `haul-take` and says to take what fits, and only then at the Close.
      Same shape as `take_haul` (step 4), which already does exactly this.
- [ ] The demo's headless walkthrough gets the matching action, or it reports
      the opening as STUCK — see the fifteen-step note in `RULES.md`.

**What must not break.** `npm run guide` walks all fifteen with a real pointer
and is the proof; the demo's GUIDED OPENING rule walks the same list headlessly
and asserts every step's target exists and is never under a popup.

### Phase 2 — The haul is take, sell all, sort [user 5]

**What is true today.** `src/ui/haul.ts` renders three buttons —
`haul-take` (Take what fits), `haul-sell` (sell every piece no currency has
touched, `plainGear`) and `haul-sellall` — and no sort. The dock has
`inv-sort`, handled in `src/ui/inventory.ts` and implemented by
`sortInventory` in `src/game/state.ts`.

**Why it is wrong.** Two sell buttons side by side is a decision about a
distinction nobody asked for, and the haul is the one screen with fifty
unsorted things in it and no way to order them.

- [ ] `haul-sell` goes, markup and handler. Take what fits and Sell all are the
      two buttons.
- [ ] A Sort button on the haul, the same comparator the dock uses, so the two
      screens order a pile the same way.
- [ ] Sorting the haul is not a move: nothing leaves it, and a sort with the
      screen open re-renders in place.

**What must not break.** `npm run smoke` clicks the haul's buttons by id and
is ORDER-DEPENDENT — see `RULES.md`. `npm run shots` has no haul shot; add one
only if the row of buttons stops fitting.

### Phase 3 — Searching a pile [user 9]

**What is true today.** The dock (`renderInventory` in `src/ui/inventory.ts`)
and the haul (`src/ui/haul.ts`) both draw every item as a slot with a tooltip.
Finding "everything with critical damage on it" means hovering each one.
`describeMod` in `src/crafting.ts` and `statParts` in `src/mod-text.ts` are
what turn a rolled modifier into words.

**Why it is wrong.** A haul is a night's work and the only way to read it is
one hover at a time.

- [ ] A search box on the dock and on the haul. Typing filters what is drawn;
      an empty box draws everything.
- [ ] It matches the item's NAME, its base's name, and the text of every
      modifier and implicit on it — so "crit", "Bulwark" and "helmet" all find
      something. Case-insensitive, substring, no syntax.
- [ ] Filtering is DRAWING only. Nothing moves, nothing is consumed, and the
      capacity counts still read the real container — a filtered dock that
      says "3/32" is lying about the bags.
- [ ] The box is UI state and is never saved, and it clears when the screen
      closes: a filter that survived a reload is a dock that looks empty.

**What must not break.** `npm run smoke` picks dock items BY POSITION —
`filled('#inv-gear')[0]` — so anything that reorders or hides a slot breaks
checks hundreds of lines further down. Leave the box empty in every existing
check and add the search's own at the END of the file.

### Phase 4 — The camera is yours [user 1]

**What is true today.** `src/ui/run.ts` owns zoom: three buttons
(`run-zoom-in`, `run-zoom-out`, `run-zoom-fit`) and a `run-zoom-label`, plus a
wheel handler that steps `±0.35` ADDITIVELY between `ZOOM_MIN = 1` and
`ZOOM_MAX = 5` (`src/render/renderer.ts`). There is no pan at all: `camera()`
in `src/render/pixi.ts` and the same block in `src/render/canvas2d.ts` centre
the whole map at zoom 1 and follow the hero above it, clamped to the map.

The skill web already does what is wanted, in `src/ui/skills.ts`: the wheel
zooms MULTIPLICATIVELY about the cursor (`scale * ZOOM.step`, keeping the point
under the pointer fixed), and `pointerdown`/`pointermove`/`pointerup` with
`setPointerCapture` pans, with a `dragged` flag so a drag is not also a click.

**Why it is wrong.** Two controls for zoom where one would do, a step so coarse
the map jumps, and no way to look at anything but the hero.

- [ ] The three zoom buttons and the label go from `docs/index.html` and from
      `src/ui/run.ts`. The wheel is the only zoom.
- [ ] Zoom is multiplicative and small enough to read as smooth — the web's
      `ZOOM.step` is the model, and one notch must not cross a whole level.
      It zooms about the POINTER, not the centre, or the thing you were
      looking at slides away as you lean in.
- [ ] Drag pans, exactly as the web does, including the capture and the
      "a drag is not a click" flag. Panning UNLOCKS the camera: it stops
      following the hero and stays where you put it.
- [ ] One key re-centres on the hero and re-locks the follow. It is one entry
      in a table of bindings rather than a literal in a handler — see the open
      question about keybinds.
- [ ] The pan is clamped the way the follow already is, so the map cannot be
      dragged off the screen entirely, and it survives a resize.
- [ ] BOTH renderers. `camera()` is per-renderer today; the pan offset and the
      locked flag belong wherever the two already agree, and the canvas2d
      fallback may not silently keep following.

**What must not break.** `npm run shots` fires its HANDOVER shot 180ms into a
launch and its descent shot at 4.3s, both expecting the hero on screen —
a camera that starts unlocked would empty both. `npm run guide` clicks the map
region for some steps; a drag handler that eats those clicks reads as STUCK.

**BLOCKED** on the open question "Keybinds: a real rebinding screen, or one
constant?" — everything else in this phase can be built without the answer, so
if that one lands first, the rest of it does not wait.

### Phase 5 — A sword is held out, not hung [user 3]

**What is true today.** `WEAPON_ART` in `src/render/gear-art.ts` draws every
weapon against the doll's grip at (17, 14), as two 24-grids: `rest` and
`strike`. `rusted_sword`, `iron_sword` and `steel_sword` all hang STRAIGHT
DOWN from the grip — a single column of blade running from row 14 to row 21,
directly below the hand. The daggers (`shiv`, `stiletto`, `fang`) do the same,
shorter.

**Why it is wrong.** A sword hanging point-down out of the fist reads as a
dagger held in a reverse grip. It is the first weapon half the characters in
the game are given.

- [ ] The three swords are held OUT with the point slightly up, from the grip
      the doll already has. The grip does not move: those coordinates are
      absolute whole pixels and everything else is drawn against them.
- [ ] The daggers KEEP the point-down hold, which is what it always read as.
      Decide and write down whether that is the dagger family's look on
      purpose or a thing to redraw later.
- [ ] `strike` is redrawn to match the new rest, or the swing snaps between two
      unrelated poses.
- [ ] `npm run demo`'s sprite checks still pass: every grid exactly 24 wide,
      trailing dots included, and no highlight directly under a shadow — the
      light is from above and slightly in front, and the demo fails on it.

**What must not break.** Art claims need a screenshot: `tools/model-sheet.mts
out.png` draws every look, `tools/model-peek.mts out.png family` draws a few
large. Neither is in the suite, so LOOK at one.

### Phase 6 — The first crystal is earned with a notable [user 6]

**What is true today.** `giftWaiting` in `src/game/crystals.ts` schedules the
first crystal off `INTRO.firstCrystalClear = 2` — the second cleared descent —
and `LAMPWRIGHT.level = 2`, so the crystal arrives holding one modifier slot
with a `shard_of_making` beside it and `INTRO.scriptedMod` forced into it. The
guided opening runs straight through it: `descend`, `again`, `meet_crystal`,
`bench_crystal`, `craft_crystal`, `socket`.

Tree points come from the SKILL's level, not the character's:
`treePointsFor(p.level)` in `src/skills-tree.ts`, and `addSkillXp` gives the
active skill the same XP the character gets. **The cheapest notable in every
tree costs exactly 3 points** — measured: `st_rend`, `fb_detonation` and
`bl_rupture` are all 3 — so skill level 3 buys a first notable and nothing
earlier does.

**Why it is wrong.** The crystal arrives because you cleared twice, which is a
number nobody is looking at. It should arrive because you did the thing that
makes a character feel like a build — took your first notable — and the run
after that is the one where a longer descent is survivable.

- [ ] The first crystal is scheduled on the first cleared descent AFTER the
      active skill has reached level 3 AND a notable is allocated in its tree.
      Both, not either: the level is what buys the point and the allocation is
      what spends it.
- [ ] It is a LEVEL 1 crystal (`LAMPWRIGHT.level`), which holds NO modifiers —
      see the open question "A level 1 crystal holds NO modifiers".
- [ ] The opening runs to the end of the first descent as it does now, plus one
      new step: spend your first skill point. Then it LETS GO — the lockdown
      comes off and the guide says what it is waiting for, which is a notable.
      Nothing is locked while you are levelling.
- [ ] It takes hold again at the meeting that hands the crystal over, for the
      craft and the socket, and lets go for good after.
- [ ] The collection screen's `giftSchedule` says the new condition in words,
      the way it says the clear count today.
- [ ] The dev preset still marks everything given (`game.given`), so a stocked
      game does not walk into the opening.

**What must not break.** `npm run guide` plays the opening in REAL TIME and
sits through every descent in it. A condition that needs a skill level will
cost it descents — measure how many before writing the number, and if the guide
cannot reach it in its turn budget, that is the phase's problem and not the
harness's. The demo walks the same steps headlessly with one hand-written
action each.

**BLOCKED** on the open question "A level 1 crystal holds NO modifiers".

### Phase 7 — Three bolts, three elements [user 10]

**What is true today.** `MONSTER_RANGED_SKILL = 'bolt'` in `src/data.ts` names
ONE skill, and `RANGED_PACK_CHANCE` decides whether a pack carries it. The
`bolt` SkillDef is monster-only (no `category`, so it never reaches the Skills
screen), `damageTypes: ['fire']`, `vfxKind: 'bolt'`.

What a monster's damage actually IS comes from the MAP, not the skill:
`monsterStats` in `src/sim/stats.ts` reads the crystal's `monsterFire` modifier
and sets `damageByType` to fire if it rolled and physical if it did not — one
type for every monster on the map.

**Why it is wrong.** Every ranged monster in the game throws the same bolt, and
a caster's element is a property of the room rather than of the thing casting.

- [ ] Three monster skills — a fire bolt, a frost bolt and a lightning arc —
      each dealing its own element. The fire bolt keeps the look it has; frost
      is a blue-white icy bolt; the arc is a lightning strike that chains.
- [ ] `MONSTER_RANGED_SKILL` becomes a LIST, and which one a pack carries is
      rolled off the run's own rng at spawn beside `RANGED_PACK_CHANCE`.
- [ ] How the skill's element and the map's `monsterFire` modifier combine —
      see the open question about it.
- [ ] The arc chains, so it needs a `vfxKind` both renderers can draw: the sim
      already emits `points` for a shape, which is what the chain arc is for.
- [ ] The results overlay's damage-taken rows already split by type and will
      show three where they showed one. That is the point; check it reads.

**What must not break.** `npm run demo` measures what a monster hits for
against what its stats say, across every rank and the finale. Resistances are
per type, so three elements means a warded character eats less from one pack
and the same from another — the ladder harnesses will move, and by how much is
a measurement, not a guess.

**BLOCKED** on the open question "Does a monster's bolt override the map's
element?".

### Phase 8 — What a node does, shown and not overlapped [user 8]

**What is true today.** A tree node hands the sim switches out of `GRANTS`
(`src/sim/grants.ts`), and `mergeGrants` folds two nodes granting the same key
by a declared rule. What it does NOT do is notice that two nodes change the
same thing in incompatible ways: Blight's `bl_rupture` turns the cast into a
HIT that bursts, while the rest of its tree is about the poison cloud, and
`bl_transmutation` changes the damage type under both. Nothing says what
happens when you take them together, and the player cannot tell either.

Strike's `st_whirlwind` grants `splashMultiplier: 1, splashRadius: 1.25` — the
swing now hits everything in reach for full — and the animation is the same
`slash` it was before, so a hitbox that grew by a quarter is invisible.

**Why it is wrong.** A point spent on something you cannot see, on a
combination nobody has decided the meaning of.

- [ ] Every skill's changing nodes are audited in PAIRS, per tree, and the
      result is written down: what each combination does. That written list is
      the phase's real output.
- [ ] Combinations that have no coherent answer are BLOCKED from being taken
      together, and the node says why on its own card — "cannot be taken with
      Rupture" is a decision the player can act on; a silently ignored point is
      not. `canAllocate` in `src/skills-tree.ts` is where a refusal lives.
- [ ] A demo check that the block holds, and that no PAIR of allocatable nodes
      is left un-audited, so a new node cannot quietly add a new combination.
- [ ] Strike's sweep gets an animation that shows its actual reach — the arc
      the hitbox now covers, not the old slash. `vfxKind` picks the shape and
      both renderers draw it.

**What must not break.** Tree allocations are REPLAYED through `canAllocate` on
every load (`heal()` in `src/game/save.ts`), so a new refusal retroactively
refunds points in saves that already spent them. That is the intended
behaviour, not a bug — but it means a wrong refusal costs every player their
build, so the demo has to prove the block only catches what it means to.

### Phase 9 — Character level buys stats [user 7]

**What is true today.** `character.level` (`src/sim/character.ts`) does almost
nothing. It scales the skill's own base damage through
`skillBase(skill, level)` and `LEVELLING.damagePerLevel`, and it sets the
shop's stock level. Everything else a character IS comes off gear and the tree:
`characterStats` in `src/sim/stats.ts` builds `CombatStats` from those two and
nothing else. There are no attributes in the game, and **no mana** — no
resource, no cost, no bar, nowhere.

**Why it is wrong.** Levelling is the most common thing a player does and it is
the one that changes the least.

- [ ] Attributes on the character: Strength, Intelligence, Dexterity, and a
      fourth whose name is an open question.
- [ ] Strength gives % attack damage and life; Intelligence gives % spell
      damage and whatever the mana question answers; Dexterity gives attack
      critical chance and attack speed; the fourth gives spell critical chance
      and cast speed. Granularity is per 5 points so the numbers can be generous —
      exact rates are tuning and a measurement beats them.
- [ ] Where the points come from — automatic per level, or allocated — is a
      question below, and the answer changes whether there is a screen.
- [ ] They land in `characterStats` beside gear and the tree, using the stat
      names the modifier engine already has, so nothing downstream learns a
      new concept.
- [ ] The character sheet shows them, and shows what each is buying.
- [ ] Whether `LEVELLING.damagePerLevel` survives: if a level now buys
      attributes, a level that ALSO scales the skill's base is paying twice.
      Decide, and say which.

**What must not break.** `npm run demo`'s ladder harnesses build characters
with `ladderCharacter` in `src/sim/loadout.ts` and measure what each band
clears — attributes will move every one of those numbers, and the retune that
set them was itself a phase. Measure before and after. The save takes new
fields for free; `heal()` needs nothing unless points are allocated, in which
case it must replay them the way it replays the tree.

**BLOCKED** on three open questions: "Does mana exist?", "Where attribute
points come from" and "What the fourth stat is called".

---

## Open questions

Do not guess at these. The first six block a phase each and are named in it.

1. **A level 1 crystal holds NO modifiers, so it cannot be crafted on.**
   `CRYSTAL_LEVELS` is `[{1, mods: 0}, {2, mods: 1}, {3, mods: 2}, {4, mods:
   3}]` — a level is capacity and level 1 is none of it. The phase "The first
   crystal is earned with a notable" asks for a
   level 1 crystal AND for the craft that teaches what a modifier does to a
   room, and those two cannot both happen: the Shard of Making refuses an item
   with no open slot. Three ways out and the user picks:
   (a) level 1 holds ONE modifier — shift the whole table, which hands every
   crystal in the game a slot and moves the danger ladder that was just tuned;
   (b) the crystal arrives level 1 and BLANK, the socket lesson ends there, and
   the craft lesson waits for it to reach level 2 by being used, which is
   itself the lesson about what a level is;
   (c) it stays level 2, as built. **Mine, not the user's: (b).** It is the
   only one that gives a level 1 crystal without touching balance.

2. **Keybinds: a real rebinding screen, or one constant?** There is no keybind
   system and no settings screen in the game — every key today is a literal in
   a handler (Escape in `src/web.ts`, Enter and Space in the guide's lock).
   The phase "The camera is yours" wants "space centres the camera, and it
   should be customisable".
   Customisable means a table of bindings, a screen to change them on, and a
   field on `GameState` — a phase of its own. **Mine, not the user's:** do the
   table now (one place, saved, so nothing has to be found again later) and the
   SCREEN as its own phase when there are more than two bindings worth
   changing.

3. **Does mana exist?** The phase "Character level buys stats" wants
   Intelligence to give "% spell damage and mana per int". There is no mana anywhere in the game: no resource, no cost
   on a skill, no regeneration, no bar. Adding it is a mechanic — every skill
   needs a cost, the sim needs to refuse a cast without it, and a character who
   runs out needs something to do. Either that is wanted now, in this phase or
   beside it, or Intelligence gives something else until it exists (ailment
   damage and duration is the obvious pair, since it is what a caster already
   has that an attacker does not).

4. **Where attribute points come from.** Automatic on level — every level gives
   a fixed spread, and the character sheet is a readout — or ALLOCATED, and
   there is a screen with four buttons and a respec question. Automatic is
   cheap and honest with the existing "distance is the only price" tree;
   allocated is a second build system beside the tree it might argue with.

5. **What the fourth stat is called.** Spell critical chance and cast speed —
   the spell mirror of Dexterity. Suggestions: **Wit** (quickness of mind, so
   it reads as speed and precision at once), **Focus**, **Acuity**, **Insight**,
   **Attunement**, **Clarity**. Wit is the one that mirrors Dexterity's brevity
   and says both halves. Also worth confirming the reading: the user wrote
   "spell crit and attack speed", which beside Dexterity's "attack crit and
   attack speed" is presumably cast speed.

6. **Does a monster's bolt override the map's element?** Today one crystal
   modifier (`monsterFire`) makes EVERY monster on the map deal fire, and
   nothing else deals anything but physical. The phase "Three bolts, three
   elements" gives them three. Either the skill wins for the thing casting it (a frost caster in
   a fire map throws frost, and the map's fire is what everything else swings
   with), or the map wins and the bolts are three looks over one element, which
   is most of the point gone. **Mine, not the user's:** the skill wins.

7. **What is the fifth socket?** Wanted as an endgame slot holding something
   that is not a crystal. Deliberately unspecified — the user wants to think
   about it. `RULES.md` says how to keep it cheap to add; nothing else may
   assume it.

8. **The Cavern and the Fissure have no currency of their own.** Retiring the
   quality ladder took `sigil_of_refinement` with it, which was Prismatic's
   exclusive, and nothing replaced it. Today `sigil_of_upheaval` is gated to
   Demonic and `sigil_of_finality` to the Seam; the other two worlds are gated
   to nothing. `RULES.md` says a world should have a reason to be entered, and
   every world now has uniques of its own — the Fissure two — so this may already be
   paid. **Provisional, and mine, not the user's:** left as it is rather than
   inventing a gate. Ask before gating an existing currency to the Cavern; it
   would make a staple zone-locked.

---

## Backlog

Real, deferred by decision. Not a queue — do not promote one into a phase
without being asked.


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
- **The opening can skip the haul step.** `take_haul` is satisfied when the
  haul is empty, and a first descent drops gear at 5% a kill — so about a
  third of the time there is nothing to take and the step the opening exists
  to teach is silently skipped. `npm run guide` passes either way, which is
  the part that makes it worth writing down. The fix is probably a guaranteed
  first drop rather than a change to the step.
- **No per-item "keep" rule for the haul.** Every drop goes to the haul and
  triage is manual. A filter that hides a drop is the kind of thing you only get
  right once you know what a good drop looks like — and now that uniques drop,
  the answer has moved.
- **Blight and Strike are not the same game.** Last measured, Blight cleared
  the top of the ladder 12/12 where Strike managed 3/12. That number is OLD —
  it predates the capacity rework, the retune and everything since — so
  re-measure before acting on it.
- More tutorial steps for systems added since the opening was written: the
  collection screen, the bench's crystals column, sell mode, the counter.
- **A third way to get rid of a piece.** Selling is now a mode with a buy-back
  behind it, which is enough that this is no longer urgent — but everything
  still ends at the same counter, and a game where the only verb is "sell" has
  one verb.
- Four-frame walks for the bestiary, if the creatures ever grow legs worth
  animating.
- **A drawn recovery frame per creature.** They have one `attack` grid each and
  hold it for the whole swing. The hero does not — `poseOf` indexes
  `SWING_POSES` by how far through the swing the entity is — so the fix is that
  same treatment plus 21 more grids in `src/render/bestiary.ts`.
