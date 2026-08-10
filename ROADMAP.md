# Crystal Core — Roadmap

**The list of work, and nothing else.** Everything that is always true lives in
`RULES.md`; the game as it stands is `CLAUDE.md`. If a thing here is not a task
or something you need in order to do one, it is in the wrong file.

Do the lowest-numbered phase that is not blocked on an open question, all of it,
then delete it from here and renumber. Numbers in a phase are intent, not
tuning — a measurement beats them.

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

### Phase 1 — The Fissure is a cave, and every zone moves

**What is true today.**

- `CUT` in `src/sim/grid.ts` maps `fissure → 'built'`: rooms are rectangles with
  square corners and corridors run straight. `paving()` in
  `src/render/renderer.ts` then lays flagstone over better than half of it.
- `livingDecals()` — the part of a zone that MOVES, drawn per frame off the
  tile hash and the clock — returns `[]` for `surface === 'stone'`. The Rot has
  swinging tendrils and spines that push out of the side walls and draw back.
  The Cavern has a brightness pulse and nothing that moves.

**Why it is wrong.** It is called the Fissure, it is a crack you climb down
into, and it looks like a castle. And of three worlds only one is alive.

**What it is.** ANSWERED: an **abandoned working**. A cave somebody tried to dig
out a very long time ago and gave up on — the rock is natural and the shape of
it is natural, but there are signs people were here: rotted props, a fallen
plank, a rope going nowhere, a candle stub still burning. Not architecture, and
nothing with a square corner. The webs and the spiders are what moved in after.

- [ ] The Fissure stops being masonry. `CUT.fissure` leaves `'built'` — a cave
      has no square corners — and the flagstone goes with it. What replaces it
      is not more flagstone: it is bare rock with the odd worked thing in it,
      off the same `patchNoise` field that decides where a passage was dug.
- [ ] `MAP_THEMES.fissure.blurb` says what it is now. It currently reads "Grey
      rock, flagstone and rubble. What the rock already held."
- [ ] **No zone reads as man-made.** `'built'` should end up used by nothing, or
      by one deliberate exception written down here.
- [ ] The Fissure gets its own moving scenery, in the same shape the Rot's is
      written: pure functions of `(tile hash, time)`, no stored state, so both
      renderers agree and nothing needs seeding. **Cobwebs with something
      crawling on them**, and **candles that gutter** — a light that moves is
      what makes a dark room read as occupied rather than empty.
- [ ] The Cavern gets movement of its own, not a brightness ramp: growth that
      creeps, light that travels along a facet. Its own idea, not the Rot's
      recoloured.
- [ ] The Seam keeps taking whichever side a tile belongs to (`seamSide`), so
      it inherits both for free. Check it: it is the one place two zones' art
      is drawn a tile apart, and it is where a clash shows.
- [ ] Density is a knob per zone, not a constant. A cave with a cobweb on every
      tile is a cobweb factory.

**What must not break.** `npm run shots` photographs all four zones and fails on
console errors; `tools/zone-peek.mts` is the tool that actually judges this
(`RULES.md` — **`span` must be EVEN**). The demo holds map generation to connectivity:
every room reachable, entrance and exit connected. A rounder cut must not strand
a room. Both renderers must agree, so anything per-tile stays a pure function in
`render/renderer.ts` — see `RULES.md`.

### Phase 2 — Walking out

One moment of the game: what happens between the last monster and the next
descent. It is currently three things happening on one tile at once.

**What is true today.**

- **A citrine square, pulsing, drawn on the VFX layer** — `state.map.exit` in
  both `src/render/pixi.ts` and `src/render/canvas2d.ts`. The vfx layer is above
  the entities, so it paints over monsters and over the Lampwright. It predates
  `mouth()`, which now draws the exit as the hole it is.
- `spawnFinale()` in `src/sim/run.ts` fires the moment the flood finds nothing
  reachable left, and rings the whole encounter around `map.exit` at once —
  `count` entities on a circle of radius `0.8 + count*0.09`. A Swarm is 20
  bodies on one point.
- `greetAtExit()` puts the Lampwright ON `map.exit`, sets `meeting` in the same
  call, and `src/ui/run.ts` opens the panel immediately. The hero is already
  standing there, so the fight ends, a panel appears, and the descent is over —
  all without moving.

**Why it is wrong.** A marker that clips over the thing you are fighting is a
bug on screen. Twenty monsters spawning inside each other reads as two. And the
end of a descent is a place you should walk to rather than a tile you were
already standing on.

- [ ] **The exit marker goes.** The exit is the `mouth()` decal, the same one
      the entrance has — you came out of one and you drop into the next, and
      they should look alike. Nothing on the vfx layer marks a tile.
- [ ] The finale arena and the EXIT are near each other and not the same place.
      Clearing the map leaves you with a walk, short enough to be a beat and not
      a chore.
- [ ] The finale is triggered by the hero coming NEAR the exit, not by the map
      going empty — so it is a thing that happens to you on the way out.
- [ ] They come OUT of the exit — the same hole the Lampwright climbs out of.
- [ ] Arrival is STAGGERED, per encounter (`ENCOUNTERS` in `src/data.ts`):
      the Warden is one and arrives alone; the Honour Guard's four come out one
      at a time; the Swarm's twenty come in groups. A `wave` shape on
      `EncounterDef` — how many at once and how long between — so the pacing is
      data rather than a special case per encounter.
- [ ] `s.totalMonsters` still counts the whole encounter the moment it starts,
      or the readout counts down and then goes back up.
- [ ] The Lampwright **climbs out and steps clear** — a tile or two off the
      hole, not standing in it — and the hero **walks to him**. `greetAtExit`
      stops setting `meeting`; reaching him does. That is the pre-existing
      walk-to-him behaviour, at the end of a cleared descent where it is safe
      rather than in the middle of one where it was not.
- [ ] The panel opening is what ends the run, so a meeting is still the same
      halt (`halt = 'met'`) landing on the same report.

**What must not break.** `runToCompletion` has a seconds guard and the demo's
TERMINATION CHECK runs 28 of them: nothing that waits on the hero reaching a
place may wait forever — not the finale, and not the meeting. `npm run guide`
clicks `met-take` twice and `npm run shots` waits a minute for the panel; both
now depend on a walk finishing first. `runToCompletion` also needs a way to let
a headless run reach a meeting it now has to walk to. The report reads
`RunState.elapsed`, and `normal_iv` asks for a clear inside 90 seconds — a walk
added to every descent moves that, and the demo measures it.

### Phase 3 — Three save slots

**What is true today.** `src/game/save.ts` writes ONE localStorage key
(`crystal-core.save`) plus a timestamp. The Save screen (`src/ui/savedata.ts`)
says where your progress lives and offers a file backup, a file load and a
delete. `New game` is a separate header button (`dev-fresh`) that wipes.

**Why it is wrong.** One save means trying anything costs you the game you have,
and the only way to keep two is to download a file and remember which is which.

**How it saves.** ANSWERED: **the live slot autosaves**, exactly as the single
save does today — nothing can ever be lost to a closed tab. A slot is somewhere
to KEEP a run, not somewhere to remember to save one. So the row you are
playing says so and has no Save button; the other rows offer **Copy here** and
**Load**.

- [ ] Three slots. The key becomes one per slot; `readSave`/`saveGame`/
      `clearSave`/`savedAt` take a slot, and one stored key remembers which slot
      is live so a reload comes back to the same game.
- [ ] `startAutosave` writes the LIVE slot, on the same 4-second timer and the
      same `pagehide` flush. Switching slots is what changes where it writes.
- [ ] The header button says **Save & Load** and opens a screen of three rows.
      Each row shows what is in it — character, level, how long ago — or that it
      is empty, and offers Save here and Load.
- [ ] An empty slot's action is to START one there. **`New game` leaves the
      header**: a new game is a thing you do to a slot, which is also what stops
      it wiping the game you are in.
- [ ] Copying over an occupied slot asks first (`src/ui/confirm.ts`), the same
      way `New game` does today. Loading asks too — it is the one action that
      puts a different game in front of you.
- [ ] The file backup and the file load stay — they are the only thing that
      survives clearing the browser — and a loaded file lands in a slot.
- [ ] `SAVE_VERSION` does not move. `heal()` already drops what no longer
      resolves, and a save written before slots existed loads into slot 1.

**What must not break.** `npm run smoke` walks the Save screen and asserts what
it says; the demo's save round-trip and `heal()` checks read and write through
these functions, and its "every collection a save can hold items in claims its
ids" list goes through `readSave`. The guided opening survives a reload twice
(`RULES.md`) — that has to keep working with a live slot.

### Phase 4 — Every number said out loud

The rule is in `RULES.md`. This is the sweep, and the check that keeps it swept.

**What is true today.** Most tree nodes already carry figures. What does not:
fractions written as words — "a third more ground", "a quarter more", "below a
third of their life", "above four fifths of their life"; counts written as
words — "And a third cloud", "And a third swing", "another additional enemy";
and bare comparatives — "hits harder", "reach grows again", "wider again".
`GRANTS[].what` in `src/sim/grants.ts` is worse: "more damage to enemies near
you", "extra swings at the target", "more enemies near the target are hit" —
generic by design, and since uniques landed those strings are printed verbatim
on a unique's card.

**Why it is wrong.** Every one of those is a decision the player is being asked
to make with the number withheld.

- [ ] Every node `description` in `src/trees/*` names its figures. Fractions
      become percentages; "another" becomes "+1"; a comparative names its
      amount.
- [ ] A unique's card prints the VALUE off the unique's own `grants` bag, not
      the generic sentence from `GRANTS[].what`. `what` stays what it is — a
      description of the SWITCH for the demo and for `src/ui/skills.ts` — but it
      stops being the thing a player reads about a specific item.
- [ ] Currency descriptions, quest `detail`, `AURAS`, encounter `herald`, the
      report's rows and every tooltip note get the same pass.
- [ ] **A demo check, or it rots in a month.** Player-facing text with no digit
      in it fails, with an allow-list for the lines that genuinely have no
      number — flavour, and the Lampwright.

**What must not break.** `npm run mods` proves every modifier reads; `npm run
smoke` asserts the shapes of several of these strings, including that a stat
line splits its value from its words. The tree demo checks descriptions exist;
they now also have to contain a figure.

---

## Open questions

Do not guess at these.

1. **What is the fifth socket?** Wanted as an endgame slot holding something
   that is not a crystal. Deliberately unspecified — the user wants to think
   about it. `RULES.md` says how to keep it cheap to add; nothing else may
   assume it.

2. **The Cavern and the Fissure have no currency of their own.** Retiring the
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
