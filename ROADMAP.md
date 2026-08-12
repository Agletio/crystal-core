# Crystal Core — Roadmap

**The list of work, and nothing else.** Everything that is always true lives in
`RULES.md`; the game as it stands is `CLAUDE.md`. If a thing here is not a task
or something you need in order to do one, it is in the wrong file.

**There are eight phases.** Phase 1 is what is left of the UI. Phases 2–8 are
one arc, dictated in one go: the game gets **rooms you arrive in and people
standing in them**, and the machinery that carries all of it is built once, in
Phase 2, on the one character who already exists.

Do the lowest-numbered phase that is not blocked on an open question, all of it,
then delete it and renumber. Numbers in a phase are intent, not tuning — a
measurement beats them. A landed phase is DELETED from here, so before starting
one, `git fetch` and check you are on the tip of the branch: a phase you can
still see in a stale clone may already be built. Do not promote a backlog item
into a phase without being asked; the thing most likely to be asked for after
these is the **balance pass**, written up below.

**Phases 2–8 are a LADDER and the order is load-bearing.** Every one of them is
the same mechanism with different content in it, and 2 is the only one that
builds the mechanism:

```
2  the scene            an authored room, props in it, someone standing in it
3  the bubble           he talks in the room instead of over a sheet covering it
4  the Lambengolmor     a scene with a fight in it — the first boss
5  the key              going back for a boss you have already put down
6  the Osteomancer      a third item kind, and a scene that spends one
7  the Astral-Geometer  phase 6's machinery, jewellery, a calmer voice
8  teaching in a room   the guided opening's lessons, moved into the scenes
```

Doing 4 before 3 or 6 before 2 means building the room machinery twice. If a
phase here has to be reordered, say so and reorder the WHOLE ladder rather than
lifting one out of it.

**What the last four phases turned out to know that their writing did not.**
Kept here because the next thing built on top of them will want it.

- **Widening a Spread is worth nothing on its own.** The first version of
  Scattershot only granted `spreadRange: 1.6`, and the demo's "every notable
  changes the cast" check failed it flat: with 1–4 extra Projectiles there are
  almost always that many enemies inside the bare 3.5 tiles, so a wider radius
  never changes which enemies are picked. It needed `spreadFar` — turn the pick
  around — before the wider radius bought anything at all. Any future "reaches
  further" node on a picker with a target CAP has the same hole in it.
- **A keyword has to be shown where the word is, not behind a second hover.**
  `.tip` is `pointer-events: none`, so a glossary that needed hovering the word
  inside a tooltip was never possible. Marking the word and printing the
  definitions at the foot of the same card is not a compromise: it is the only
  version that works on a phone.
- **The vocabulary pass cost the extra-Projectile falloff.** Making Split Cast
  full damage retired `extraTargetDamage`, which retired Focused Volley, which
  is why the Salvo branch has a new third notable. A keyword that promises a
  thing is thrown has to promise it lands, and a notable existing only to undo
  a falloff was the tell that the falloff was one number too many.

- **Adding an element to every monster did not change what a modifier is
  worth.** "of Cinders" always multiplied a hit by (1 + share/100) and still
  does; only the SPLIT moved. Dropping its `DANGER_STATS` weight from 0.9 to 0.6
  on the assumption that added damage is softer than a conversion flattened the
  reward ladder until band 6 paid no more than band 5, which the existing check
  caught within one run. Weigh a stat by the arithmetic it does, not by the
  story about it.
- **A pack's element is rolled per PACK, not per monster** — the phase asked for
  per monster and the code already said why not, in `RANGED_PACK_CHANCE`'s own
  comment. Mixed packs read as noise.
- **The node-pair audit was 742 pairs and could not be written.** It is 28 once
  it is done over grant CLASSES (`GrantDef.changes`), which is the altitude the
  codebase already works at — a node is a bag of switches. And the answer it
  produced is that NOTHING needs blocking: every pair composes, Rupture's burst
  under Blight's cloud tree included, which is a trade its own card already
  names. The refusal mechanism shipped anyway, unused and tested.
- **Five notables, not "about five".** Twenty nodes alternating minor and
  notable over ten points makes five the CEILING and not the average: a spoke's
  prefix of odd length wastes its last point on travel, so a careless walk
  reaches three. That is the decision the shape hands the player, and the demo
  measures both ends of it over 200 random walks.
- **`buildTree` did not bend.** A trade got a sibling — `src/trades/layout.ts`
  — and what the two share is `src/webgraph.ts`, which is where reach, refund
  and replay now live for any list of nodes. `src/ui/webart.ts` is the same
  answer for the studs.
- **A trade barely moves a kill rate, and that is correct.** Both trades'
  offensive halves are CONDITIONAL — a flask running, a pool with room to
  overcharge — so a flat average across a descent understates a window. The
  demo prints kills a second at the deep end for every trade against every
  skill and asserts nothing about it; whether a pairing is a favourite or a
  requirement needs a wider roster than three skills to tell.

**Where the phases came from.** Two batches of asks, dictated by the user in
one go each, plus a few out of design conversations, plus the vocabulary pass
asked for directly after them. All of them are built. The bracketed numbers in
the git log — [user 8], [user 10] — are the user's own numbering within a
batch, kept so a commit can be matched back to the ask.

**The vocabulary is a place new work lands.** `KEYWORDS` covers the three trees
and the two trades as they stand. A new skill, a new trade or a new modifier
either uses a word that is already in the table or adds one — and the demo's
`ONE WORD PER MECHANISM` sweep is what makes that not optional. A bow skill
saying "+5 Arc" is the case the whole thing was built for.

---

## The balance pass

**Not a phase, and not started. Documented so that asking for it is one
sentence rather than a re-derivation.**

**Why it is now possible.** `RULES.md` has said since the start that nothing is
tuned until every system is in, because each one hands out more power than the
last and anything tuned before it is thrown away. That list was attributes, then
trades, then jobs — and trades WERE the jobs. Every one of them has landed, so
the reason to lean too easy has expired. Nothing has been tuned to compensate;
the game is deliberately soft everywhere.

**What it would read.** Eight `gauge()` lines in `npm run demo` — measured,
printed, never asserted, and each carrying the figure that was wanted beside the
figure it got. They are the before. Taken after the vocabulary pass, with 420
checks passing:

```
the Seam is -0.1% over the hardest single world     — wanted: same class within 15%
a trade moves the deep-end kill rate 3.90–7.50/s    — no pairing should be the only one
1% to 33% of swings go unpaid                       — wanted: 5%–50%
a starved cast lands for 50% of your damage
a naked character walks out on 53% life             — wanted: under 70%
one blank crystal after the first clear: 18/24      — wanted: above 60%
every band is clearable in gear the band below drops
the deep end: 1253 danger, 4/12 through             — wall under 4/12, ceiling at 0
```

Every one of them is where it was at `e811da6` except the trade's top kill rate,
7.86 → 7.50, which is the Splintered Eye losing `extraTargetDamage` — its two
Projectiles were already at full damage through that grant and now are through
the rule. Nothing about the tree changes these: `ladderCharacter` spends no
tree points.

The deep end at 4/12 is the one sitting exactly on its own wall line, and the
unpaid-swing spread reaching 33% is the widest of these. Neither is a bug.

**What must not break.** Everything in `RULES.md` under "Balance is NOT TUNED"
inverts when this starts, and that section has to be rewritten in the same
breath — it is the file's own statement that the pass has not happened. The one
difficulty check that is a `check()` rather than a `gauge()` — a brand new
character clearing the bare Fissure — stays a failure throughout. And the
per-skill numbers are three skills wide, which the trades phase already found is
too few to tell a favourite from a requirement.

**What it is NOT.** Not a licence to change systems. A balance pass moves
numbers in tables; if it wants a mechanism changed, that is a phase and it gets
written as one.

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

### Phase 1 — What is left of the UI

**Most of it landed.** The map is the screen, every panel floats on it, and the
rail replaced the header. What remains is two checkboxes off the original phase
and nothing else; `CLAUDE.md` describes what exists and `RULES.md` holds the
rules it is now bound by.

- [ ] **Windows can be dragged where you want them.** Deliberately last: good
      default positions are what most players never drag away from, and those
      are now in. The trap is that the map is ALREADY drag-to-look (`panBy` on
      the renderer), so a drag on a window must not pan the map underneath it.
      `npm run drag` is the check — it is 20 seconds and it prints what
      `elementFromPoint` hits at the drop.
- [ ] **Z-order is static, and "on top" should mean most recently raised.**
      Today `.dock` is 18, `.modal` 20, `.rail` 22, and the Escape chain in
      `src/web.ts` is a hand-written order of `isXOpen()` checks. With several
      windows open, Escape closes by that fixed order rather than by which one
      you last touched. Raising on focus is the usual answer, and it is what
      dragging will want anyway — do the two together.
- [ ] **Minimized state does not persist.** `parked` in `src/ui/rail.ts` is
      module state, so hiding the panels lasts until reload. It belongs in
      `GameState` beside `keys` and `potions`; a missing key takes its default
      and `heal()` needs nothing.

**What must not break.** `npm run drag`, then `shots`. `guide` only if the
change touches what the opening navigates — see the table in `RULES.md`.

### Phase 2 — The room through the hole

**What is true today.** A meeting happens on the floor of the descent you just
cleared. `RunSim.greetAtExit()` in `src/sim/run.ts` stands the Lampwright
`GREET_STEP` tiles off `map.exit`, `walkOut(dt)` is the hero crossing that last
stride, and `finish()` in `src/ui/run.ts` takes the `halt = 'met'` branch and
holds the report until the panel is dismissed. `generateMap` in
`src/sim/grid.ts` is the ONLY thing in the game that builds a map, and every map
it builds is rooms, corridors and packs.

**Why it is wrong.** The one man who lives down there is standing in the room
you killed forty things in a moment ago, which makes the only place in the game
with nothing in it look exactly like the place that was full.

**What it becomes.** You drop into the hole the way you always do, and you come
up somewhere else — a small chamber nobody generated, cut out of the same rock,
with no packs in it, a bench with half-built lanterns on it, finished ones
standing about lit and unlit, and him. That is a **scene**, and it is the thing
phases 3 to 8 are all made of.

- [ ] **`SceneDef` in `src/scenes.ts`** — the new table, beside `CRYSTAL_QUESTS`
      in spirit: content, not code. `id`; `who`, a sprite id that is in
      `BEASTIARY` and `PORTRAITS` both; `theme`, a `MapTheme`, so a scene is cut
      and inked out of a world that already exists rather than a fourth kind of
      rock; `plan`, the room and where the props stand; `said`, the words;
      `encounter`, null here and not null in Phase 4.
- [ ] **`sceneMap(def, rng): GameMap` in `src/sim/grid.ts`**, beside
      `generateMap` and sharing `carveRoom` with it and nothing else. ONE room,
      cut the way its theme cuts (`CUT`), an `entrance` you come up out of and an
      `exit` you leave by. Not `generateMap` with a flag: a generator that also
      builds authored rooms is a generator nobody can read.
- [ ] **`GameMap.props`: `{ id, x, y }[]`, empty on every generated map.** A prop
      is PLACED, where a decal is hashed off the tile — a bench with three
      half-built lanterns on it is a fact about a room, not a texture. Each prop
      id is a pure function returning `Decal[]` in `src/render/renderer.ts`
      beside `mouth()`, so BOTH renderers draw them and the palette comes out of
      CSS like every other colour in the game. Nothing new in `BEASTIARY`: a
      prop is decals, not a sprite.
- [ ] **`RunState.folk: Entity[]` replaces `RunState.lampwright`.** Kept out of
      `monsters` for exactly the reason it is kept out today — nothing in combat
      may ever see a person — and a LIST because Phase 4 onwards puts more than
      one in a room. Both renderers draw folk where they draw the Lampwright
      now.
- [ ] **A scene is a `RunSim` over an authored map with no packs.**
      `RunOptions.scene` names the def; the constructor calls `sceneMap` instead
      of `generateMap` and spawns nothing. This is the decision the whole ladder
      rests on: a boss room is then a scene whose def carries an encounter, and
      Phase 4 is content rather than a second mechanism.
- [ ] **The run loop arrives there.** In `finish()`, the branch that today sets
      `halt = 'met'` and returns instead drops into the hole (`handover`,
      `banked = report`, as a chained descent already does) and comes up in the
      scene rather than in the next descent. Three things stay exactly as they
      are and the phase is wrong if any of them moves: the report is the one
      that descent produced, the loot was banked before anybody spoke, and the
      meeting still STOPS the loop and lands on the same report screen.
- [ ] **The walk is the scene's.** The hero walks in from the entrance and he
      walks to meet them; arriving sets `meeting` and opens the panel, as it does
      today. `takeHandover` and `#met` are untouched this phase — the card is
      Phase 3's job, and doing both at once is how a phase stops being reviewable.
- [ ] **`greetAtExit` goes**, and with it `besideTheHole`. Nothing stands beside
      a hole any more.

**What must not break.** `demo` — the meeting checks near the end of
`src/demo.ts` are written against `greetAtExit` and `state.lampwright`, and they
are REWRITTEN against the scene rather than deleted; `walkToMeeting` is the
headless walk and stays one. `shots` waits up to two minutes for the Lampwright
panel and fails the run without one. `guide` walks `meet` and `meet_crystal`.
Then `smoke`. Add a SCENE shot to `npm run shots`: an art claim needs a
screenshot, and a room whose props are drawn in one renderer only is exactly
what that rule exists to catch.

### Phase 3 — He says it out loud, in the room

**What is true today.** `src/ui/met.ts` puts up `#met`: a `.modal--stop` card in
the middle of the screen, a 120px portrait, every line of
`LAMPWRIGHT.first.said` in one block, one button. `.modal--stop` paints a scrim.

**Why it is wrong.** Phase 2 builds a room and then covers it with a sheet, so
nobody ever sees either the room or the man in it.

- [ ] **`src/ui/speech.ts` — a bubble anchored to a body on the map.** Built
      once and UPDATED per frame, never rebuilt: `renderFlasks` / `syncFlasks`
      is the precedent and the reason is in `RULES.md`.
- [ ] **`Renderer.screenAt(at: Vec2): { x, y }` on the seam**, implemented by
      both renderers. The bubble is the UI's and the tile size is the
      renderer's — the same split the camera already rides on.
- [ ] **Beats.** `SceneBeat { said: string; act?: SceneAct }`; `SceneDef.said`
      becomes `SceneDef.beats`. `SceneAct` is what he does BETWEEN lines —
      `pace`, `work`, `face` — performed by the scene's step off the walk and
      pose machinery that already exists (`WALK_POSES`, `poseOf`). No new art
      and no new frames.
- [ ] **Clicking advances one beat.** The last beat is where the gift is:
      `#met` keeps its markup and its `met-take` button id, and is restyled as
      the final bubble rather than as a centred card.
- [ ] **`.modal--stop` loses the Lampwright, and `RULES.md` says why in the same
      breath.** A scene IS a stop — nothing is ticking, the map is not yours to
      click — so it does not need a sheet over the room to prove it. That rule
      is written down today; changing it without rewriting it is how `RULES.md`
      stops being true.
- [ ] **Nothing he says gains a number.** `LAMPWRIGHT.first`, `.crystal` and
      `.again` become beat lists and keep their words. He is flavour, and the
      numbers rule is about mechanics.

**What must not break.** `guide` first — `meet` and `meet_crystal` ring
`#met-take`, so the harness now has to click through beats to reach it, and
`RULES.md` already records that the meeting is the one modal `guide.mjs` never
Escapes. Then `smoke`, which measures `.tip` against every layer the app can
raise and now has one more. Then `shots` and `drag`.

### Phase 4 — The one who thinks the Lampwright is wrong

**What is true today.** `ENCOUNTERS` is three closing shapes rolled at the exit
of any descent, and there is no such thing as a fight you were brought to.
Every id in `MONSTERS` can turn up in a pack. The Lampwright's pitch — keep
bringing me crystals, go deeper, survive — is the only voice in the game and
nothing ever argues with it.

**Who.** The **Lambengolmor**, in the Fissure. His pitch is *stop blindly
feeding the stone; learn its true names and command it*. He holds that the
crystals are not fuel but punctuation in a spell, and that the Lampwright is
waking something every time he sets one in. He is wrong or he is right and the
game never says which.

- [ ] **A second scene character**, done exactly as the first: a `PORTRAITS`
      entry at grid 48, shoulders-up, one frame; a `BEASTIARY` entry at grid 24
      with two frames and NO `attack` frame, because he is a person and
      `lampwright` is the worked example.
- [ ] **His room is large and round** — a `plan` with a `grown` cut whatever the
      descent's theme was — and its `SceneDef` carries an `encounter`.
- [ ] **A boss is not in `MONSTERS`.** `BOSSES` in `src/data.ts`: its own art, a
      rank of its own, life and damage as multipliers on `MONSTER_BASE` like
      everything else in the game, and `reinforce: { every, size, from }` — the
      smaller things that keep coming while it is alive. `MONSTERS` stays the
      pack pool. The demo's "every monster has art" sweep gains the boss table;
      `MONSTER_ABILITIES` gives a boss its element the same way it gives a pack
      one.
- [ ] **The reinforcement clock sits beside `waveTimer` in `RunSim`** and STOPS
      when the boss dies. Killing the boss is what clears the room.
- [ ] **The trigger is scheduled, never rolled** — `RULES.md` says that about a
      gift and the same reason applies to a fight you are walked into: the first
      boss room comes at the end of the first cleared descent run with two
      crystals socketed, read off `GameState` the way `giftWaiting` reads it.
- [ ] **He speaks before it and after it.** Beats, then the room goes live, then
      beats. A freeze is the UI declining to tick, which is what a scene already
      is.
- [ ] **A boss room is a descent.** Its loot banks, its clear counts, and it
      lands on the report every other ending lands on. Dying in it costs the
      room and stops the loop, which is what dying costs anywhere.

**What must not break.** `demo`'s termination check above everything: a run must
always end, and a reinforcement clock with no stop condition is a run that never
does — that one is a `check()`, not a `gauge()`. Then `smoke`, `shots`, and the
model sheet (`tools/model-sheet.mts`) for the new art.

### Phase 5 — Going back for one you have already put down

**What is true today.** Nothing you do decides what the next descent contains
except which crystals are socketed. Phase 4's boss happens once and can never
happen again.

- [ ] **A key is a wallet entry declared in its own table** (`BOSS_KEYS` in
      `src/data.ts`) and NEVER in `CURRENCIES`, so no bench, no shard and no
      sigil can ever reach it. `game.wallet` is already `Record<string, number>`
      and takes it for free.
- [ ] **It drops off a cleared descent**, at a rate off run power like currency,
      so more crystals is the thing that buys another fight. Gated behind having
      put that boss down once.
- [ ] **`GameState.bosses`** — the ids you have beaten — beside `given` and
      `quests`. `heal()` drops an id no table resolves, which is the whole cost
      of ever renaming one.
- [ ] **Spending it is a button on the Fissure screen** (`renderMenu` in
      `src/ui/run.ts`), naming the boss and what it costs. It is consumed at the
      launch, not at the clear: abandoning a boss room is abandoning, and that
      is the same rule as everywhere else.

**What must not break.** `smoke` (a new button on the menu), then `demo`.

### Phase 6 — The Osteomancer, and what a corpse is for

> **Blocked on Open question 6.** Do not start it until that is answered — what
> a graft REPLACES is the whole shape of the feature, and guessing it wrong is a
> phase that gets undone.

**What is true today.** `ItemKind` is `'gear' | 'crystal'` and nothing else.
Every modifier in the game either drops or comes off a bench, and a switch out
of `GRANTS` reaches the sim from a tree node, a trade node, a passive skill or a
unique — never from a rolled line.

**Who.** The **Osteomancer**, in the Demonic world only, and frantic with it:
*gimme, gimme.* He wants the corpse and he will pay for it in something you
cannot get anywhere else.

- [ ] **A third `ItemKind`: `'relic'`.** `RULES.md` says adding a container is
      three places and it is right — the field on `GameState`, `heal()` dropping
      what no longer resolves, and the demo's "every collection a save can hold
      items in claims its ids" list. Plus `addItem`/`carryRoom` routing and a
      third column on the dock, since the user asked for a generic section for
      things like this.
- [ ] **`RELICS` in `src/data.ts`**, with `pristine_specimen` its first entry:
      a `DropGate` of `{ zone: 'demonic' }`, and a low chance per kill. A gate
      is a wall and the pool is filtered before the pick, so no amount of rarity
      argues one out of the Fissure.
- [ ] **His scene is triggered by holding one**, and it is a scene like every
      other: cleared descent, down the hole, up into his room.
- [ ] **The graft is not a currency.** It happens in his room, spends a relic
      and an item, and writes a line out of `FORGED_MODS` onto a `helmet`,
      `body` or `boots` — nothing else. A currency is a thing you carry to a
      bench and this is a thing you carry to a man.
- [ ] **`ModDef.grants`**, merged by `treeGrants` in `src/sim/stats.ts` off worn
      gear exactly as `UNIQUE_BY_ID[...].grants` already is. Enemies bursting on
      death and hits leaving a Bleed are SWITCHES, not stat lines, and `GRANTS`
      is the one table a switch may be declared in. Each one obeys every rule a
      tree node's grant obeys: declared, read by a behaviour a player can pick,
      `say` printing its own number.
- [ ] **Watch the class count.** `GrantDef.changes` has seven classes and
      `INTERACTIONS` holds all 28 pairs; the demo fails an unwritten pair. Reuse
      an existing class if the switch honestly fits one — a burst on death is a
      `burst` — and if a new class is genuinely needed, budget for the rows it
      adds, because eight classes is 36 pairs.
- [ ] **A forged line never drops.** Weight 0 and excluded from the drop pool,
      but present in `ALL_MODS` so a save resolves it and `npm run mods` holds
      it to rolling, doing something and reading.
- [ ] **Every keyword it uses is in `KEYWORDS` or is added to it.** Bleed is
      already there. "Explodes" is in `BANNED` and maps to Burst — the demo
      sweeps every modifier line for it.

**What must not break.** `mods` and `demo` first — a new item kind touches
`heal()`, the id counter and the drop pipeline. Then `smoke` for the dock
column, then `shots`.

### Phase 7 — The Astral-Geometer

Phase 6's machinery with different content in it, which is why it is a separate
phase and a small one. He is in the Prismatic world, he is calm, and he offers a
trade rather than begging for one.

- [ ] A second `RELICS` entry, gated `{ zone: 'prismatic' }`.
- [ ] His scene, triggered the same way.
- [ ] `FORGED_MODS` for `ring` and `amulet` only. The backlog note that
      jewellery has three rungs and no implicit is next door to this; do not
      quietly fix it here.
- [ ] Art: `PORTRAITS` at 48, `BEASTIARY` at 24, no `attack` frame.

**What must not break.** The same list as Phase 6, and nothing in Phase 6's work
may need changing to make this fit — if it does, Phase 6 hard-coded something it
should have put in a table.

### Phase 8 — Teaching in a room instead of over one

> **Under-specified. Which lessons move is Open question 9** — write the answer
> into this phase before starting it.

**What is true today.** Everything the game teaches is taught by
`TUTORIAL_STEPS`: fifteen steps, a card beside one lit control, a lockdown on
spending. It is good at "press this" and it has no way at all to say why any of
it matters. Meanwhile Phases 2–7 build four rooms where somebody is talking
directly to the player and nothing is ticking.

- [ ] **A beat may SHOW a keyword.** `SceneBeat.shows` names entries in
      `KEYWORDS` and the bubble marks them and prints what they mean at the foot
      of the same bubble, through `src/ui/glossary.ts` — the rule is already
      that a keyword is shown where it appears, and this is one more place it
      appears.
- [ ] **A scene may SATISFY a step.** A `TutorialStep` whose lesson a scene now
      carries is deleted, not disabled, and the demo's hand-written action list
      loses its row with it — `RULES.md` counts the steps and that count is
      updated in the same breath.
- [ ] **The bursts rule still holds.** A scene teaches and then lets go; nothing
      from this phase may follow the player out of the room.

**What must not break.** `guide`, all of it, and the demo's step walkthrough —
this is the one phase where `guide` is the primary harness rather than the
expensive one.

---

## Open questions

Do not guess at these. **None of them ever blocked a phase**, and none of them
is work waiting to be picked up — they are decisions the user has not made.
Every one is parked deliberately. Ask before acting on any of them.

1. **What the Lampwright wants.** Trades have landed and the placeholder is in:
   anyone may take one up at level 5, and the Trade screen says so in as many
   words. The intent was always a storyline with the Lampwright rather than a
   level threshold — he is the only person in the game and the only voice it
   has. Nothing about it is written: what he is doing down there, what he asks
   for, how many beats it runs, whether it hands out anything besides the trade.
   Replacing the placeholder touches the ACQUISITION only — not the tree, not
   the points, not the allocation — so this blocks the STORY and not the system.

2. **What is the fifth socket?** Wanted as an endgame slot holding something
   that is not a crystal. Deliberately unspecified — the user wants to think
   about it. `RULES.md` says how to keep it cheap to add; nothing else may
   assume it.

3. **Is the Seam meant to be the hardest room, and is it?** `CLAUDE.md` said it
   was, off a check reading 6 seeds. Measured over 24, the Seam sits **0.7%
   BELOW** four Demonic crystals on damage taken per second, and with mana
   removed entirely it is only 2.0% above — so the ordering was always inside
   the noise rather than a thing the game does. The cause is structural: the
   Seam takes exactly two crystals of each world, so only half its packs carry
   a Demonic aura and half a Prismatic one, where four Demonic crystals put an
   aura in every pack. Making it genuinely worst means changing what the
   composition does — both auras on one pack, or a Seam-only carrier — which is
   a balance decision rather than a measurement. The gap also MOVES several
   percent either way whenever anything in the sim changes — mana shifted it,
   potions shifted it back — so the demo PRINTS the margin rather than asserting
   an ordering, and `CLAUDE.md` says it is an open question rather than a claim.
   Nothing is blocked on it: it is a balance answer, and balance waits.

4. **Nothing but the Fissure hands out an element.** Every monster brings its
   own now, but which one is a flat roll off `MONSTER_ABILITIES` — a Rot pack
   is as likely to throw frost as a Cavern one. Biasing the table by monster
   FAMILY would make a world's fights feel like that world's, and is one field
   on `MonsterFamilyDef` plus a weight lookup. Not a phase, and not asked for:
   written down because the table it needs already exists.

5. **The Cavern and the Fissure have no currency of their own.** Retiring the
   quality ladder took `sigil_of_refinement` with it, which was Prismatic's
   exclusive, and nothing replaced it. Today `sigil_of_upheaval` is gated to
   Demonic and `sigil_of_finality` to the Seam; the other two worlds are gated
   to nothing. `RULES.md` says a world should have a reason to be entered, and
   every world now has uniques of its own — the Fissure two — so this may
   already be paid. **Provisional, and mine, not the user's:** left as it is
   rather than inventing a gate. Ask before gating an existing currency to the
   Cavern; it would make a staple zone-locked.

6. **What does a graft REPLACE?** Blocks Phase 6, and it is the only thing in
   the whole ladder that does. The ask was "rare mods that don't exist
   elsewhere … can replace the existing base mod on an item", and *base mod*
   reads two ways. Either it replaces the **implicit** — the line the base
   itself gives you, `Item.implicits`, never rolled and never removable today —
   which makes a graft a real trade: you give up what the base was for. Or it
   replaces **one rolled modifier**, which makes it a currency that happens to
   be a man, and leaves the base intact. The first is the more interesting piece
   of gear and the bigger change to `RULES.md`; the second is a table row.
   **Do not pick one.** Both readings are coherent and the phase is written
   either way.

7. **Does anyone live in the Seam?** Four characters and three worlds plus the
   Fissure — the Seam, which is the hardest room in the game and takes exactly
   two crystals of each, has nobody. `RunState.folk` is a list rather than one
   slot partly for this. Not written, not asked for, and it interacts with
   Open question 3, which is about whether the Seam is what it claims to be at
   all.

8. **What the Lampwright wants is now BUILDABLE, and that changes question 1.**
   Question 1 above has stood since trades landed: the trade acquisition is a
   placeholder and is meant to come out of a storyline with him. Phases 2 and 3
   build precisely the thing that story would be told in — a room, a person in
   it, beats you click through. Nothing about the story is written yet, so this
   is still question 1 and still blocked on the user; what has changed is that
   answering it is now content in `src/scenes.ts` rather than a system.

9. **What does a scene TEACH?** Phase 8 is written and under-specified on
   purpose. Four rooms where somebody talks directly to the player is the best
   teaching surface the game has ever had, and the list of lessons worth moving
   into one — what a crystal does, what a socket costs, what a ward is for, why
   the report splits damage by type — has not been picked. The one thing that is
   already decided is the shape: a step that a scene now carries is DELETED from
   `TUTORIAL_STEPS`, not left in beside it.

**Decisions taken inside phases 2–8, and the alternative each one beat.** These
are mine, made because the ask invited them and the work stalls without them.
Any of them can be overruled cheaply while the phase is still on this list.

- **A scene is a `RunSim` over an authored map**, rather than a new kind of
  simulation beside it. It means a boss room is one table field rather than a
  second engine, and it means both renderers draw a scene with no changes at
  all, since they already draw a `RunState`.
- **A scene arrives THROUGH the hole**, on a cleared descent, and still ends the
  run. It keeps every rule the meeting already obeys — banked before anyone
  speaks, never a hazard inside a descent — and it costs nothing new.
- **A boss room is a descent**: its loot banks, its clear counts, dying in it
  costs it and stops the loop. The alternative, a room outside the loop that
  pays nothing, makes the fight a cutscene with hit points.
- **A boss key is a wallet entry in its own table**, not a currency and not an
  item. The ask said "probably just gain the required currency"; a real
  `CurrencyDef` would be reachable by the bench's registries, which is a bench
  that can pour a boss key onto a helmet.
- **Relics are a third `ItemKind`,** not gear with a tag. `carryRoom`,
  `addItem`, `sortGear` and every screen already branch on kind, and a corpse
  that sorts into the dock beside boots is a corpse you will sell by accident.

## Backlog

Real, deferred by decision. Not a queue — do not promote one into a phase
without being asked.

- **Whether a trade has exactly one right skill.** `RULES.md` states the line:
  favouring a skill is fine, requiring one is a skill node that got lost. It is
  UNANSWERABLE today — `MAIN_SKILLS` holds three, which is too few to tell a
  favourite from a requirement — so the demo prints what each trade is worth
  per skill and asserts nothing. Deferred by the user's decision, and what
  un-defers it is a wider roster, not a measurement.
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
- **Blight, Strike and Fireball are not the same game.** The old note here said
  Blight cleared the top 12/12 against Strike's 3/12. That number is dead;
  `TRADE RULES` now measures all three at the deep end every run, and it reads
  **Fireball 7.50, Strike 4.37, Blight 3.90 kills/s** with no trade — so the
  ordering has entirely inverted since, and Fireball is now the outlier at
  roughly twice Blight. Do not act on it outside the balance pass: it is three
  skills, and the demo prints it fresh on every run.
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
