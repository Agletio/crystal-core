# Crystal Core — Roadmap

**The list of work, and nothing else.** Everything that is always true lives in
`RULES.md`; the game as it stands is `CLAUDE.md`. If a thing here is not a task
or something you need in order to do one, it is in the wrong file.

**There are seven phases, and they are one arc**, dictated in one go: the game
gets **rooms you arrive in and people standing in them**, and the machinery that
carries all of it is built once, in Phase 1, on the one character who already
exists. The UI phase that stood in front of them has landed — windows drag,
raise on focus and remember being parked — and `CLAUDE.md` describes what it
left behind.

Do the lowest-numbered phase that is not blocked on an open question, all of it,
then delete it and renumber. Numbers in a phase are intent, not tuning — a
measurement beats them. A landed phase is DELETED from here, so before starting
one, `git fetch` and check you are on the tip of the branch: a phase you can
still see in a stale clone may already be built. Do not promote a backlog item
into a phase without being asked; the thing most likely to be asked for after
these is the **balance pass**, written up below.

**The ladder's order is load-bearing.** Every one of them is the same mechanism
with different content in it, and 1 is the only one that builds the mechanism:

```
1  the scene            an authored room, props in it, someone standing in it
2  the bubble           he talks in the room instead of over a sheet covering it
3  the Lambengolmor     a scene with a fight in it — the first boss
4  the key              going back for a boss you have already put down
5  the Osteomancer      a third item kind, and a scene that spends one
6  the Astral-Geometer  phase 5's machinery, jewellery, a calmer voice
7  teaching in a room   the guided opening's lessons, moved into the scenes
```

Doing 3 before 2 or 5 before 1 means building the room machinery twice. If a
phase here has to be reordered, say so and reorder the WHOLE ladder rather than
lifting one out of it.

**Nothing is blocked on an open question.** Every decision the arc needed has
been taken and written down, so the phase to pick is simply the lowest-numbered
one still here. Before starting any of them, read **Before you touch the
ladder**, below — it holds the parts that belong to no single phase, and every
one of them is something a phase would otherwise get wrong on its own.

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
conversation could execute it. That takes six things, and the second and the
fifth are the ones usually missing:

1. **What is true today**, named in code — the constant, the function, the file.
   "The shop sells too much" is not executable; "`RECIPES` in `src/data.ts` has
   eleven entries and should have one" is.
2. **Why it is wrong**, in one sentence a stranger would agree with. Without
   this the next session optimises the wrong thing correctly.
3. **Checkboxes that are decisions**, not tasks. "Border by base tier: white
   t1, blue t2, yellow t3" can be done wrong and caught; "improve the tooltip"
   cannot.
4. **Traps** — what a fresh session will get wrong because the codebase already
   has an answer somewhere it will not think to look. Every one of these was
   paid for once already.
5. **Done when**, in one observable sentence. A phase with no stated end is a
   phase that gets half-done and reported as finished.
6. **What must not break**, and which harness proves it, IN THE ORDER to run
   them. `RULES.md` has the table of which change reaches which harness.

Anything you are unsure about goes in Open questions, never into a phase as an
assumption. A phase that guesses is a phase that has to be undone. A decision
taken on the user's behalf is written down as a decision, with what it beat,
so overruling it is one sentence rather than an excavation.

### Before you touch the ladder

**Read this whole section first. It is the part that belongs to no single
phase, and skipping it is how the same thing gets built twice.**

Every one of the seven is the SAME object with different content in it: a
**scene** — an authored room you arrive in at the end of a cleared descent,
with somebody standing in it who talks to you. Phase 1 builds it. Nothing after
Phase 1 may introduce a second way of doing any of this.

**Where the pieces go.** Four new places, each shaped like something that is
already there:

| | | |
|---|---|---|
| `src/scenes.ts` | the types and the registry | as `src/skills-tree.ts` is for trees |
| `src/scenes/*.ts` | one file per room, content only | as `src/trees/*` and `src/trades/*` are |
| `src/game/scenes.ts` | the SCHEDULE: what happens at the end of this clear | as `src/game/crystals.ts` is for gifts |
| `src/ui/speech.ts` | the bubble (Phase 2) | one module, one screen |

**ONE scene per cleared descent, and the order is fixed.** By Phase 6 four
things can be owed at the same moment — a crystal, a boss, a corpse to hand
over, dust to trade. `sceneWaiting(game, facts)` in `src/game/scenes.ts` is the
one function that answers what happens next, it returns **at most one** scene,
and everything else keeps waiting for the clear after. The order is:

1. the Lampwright, whenever `giftWaiting` says something is owed
2. the Lambengolmor, when a boss is scheduled or a key was spent
3. the Osteomancer
4. the Astral-Geometer

Highest first, every time, with no interleaving and no roll. `RULES.md` says a
gift is scheduled and never rolled; the same reason covers all four, because a
player who cannot tell what the next clear brings cannot plan the only decision
the game asks for.

`giftWaiting` keeps its name and its job. `sceneWaiting` ASKS it. Nothing about
the Lampwright's own schedule moves in any phase below.

**A room belongs to the SCENE, never to the descent you came out of.** The
Lampwright's workshop is the same workshop every time: `SceneDef.theme` is the
def's, so the rock is some world's rock but the place is a place. Which world a
character is met THROUGH is decided by the trigger — the Osteomancer's corpse
only drops in the Demonic world — and never by the room.

**No scene but the Lampwright's happens during the guided opening.**
`isGuided()` already suppresses the chained descent, and `guide.mjs` plays the
whole opening in real time; a boss room landing in the middle of it is fifteen
steps that no longer describe what is on screen. `sceneWaiting` returns only the
Lampwright while `isGuided()` is true.

**`src/sim` never decides that a scene happens.** The decision is `finish()` in
`src/ui/run.ts`, off `sceneWaiting`, which is exactly where the meeting is
decided today; the sim is TOLD to build one through `RunOptions.scene`. This is
why the whole ladder leaves every headless harness alone — `runToCompletion`,
the ladder grids, the quest timings and the mana measurements all drive `RunSim`
directly and never ask for a scene.

**What does NOT change, and must not be quietly "fixed" into changing.**

- **`SAVE_VERSION`.** Everything the ladder adds to `GameState` is a new key, and
  a missing key takes its default. The version is bumped only when a save must
  be REFUSED, which wipes every player's game. Nothing in this ladder qualifies.
- **The report and the haul.** Every scene arrives AFTER `buildReport` has
  banked the clear, and every ending still lands on the same report and opens
  the same haul. A scene is a reason the loop stopped, never a new ending.
- **Loot is banked before anybody speaks.** That is what makes a meeting unable
  to be a hazard, and it is the reason a scene is on the far side of the hole
  rather than in the room you just cleared.
- **Automation is universal.** No build's power may depend on the player being
  present. The only thing in any scene that can be fought is Phase 3's boss, and
  it is fought by the shipped policy like everything else.
- **Every number is said out loud, and every mechanism has one word.** Four new
  characters is a great deal of new prose. The demo sweeps modifier lines, quest
  text, currency text and `GrantDef.what` for a `BANNED` phrasing and for a line
  with no digit in it. What a character SAYS is flavour and is out of that
  sweep, exactly as the Lampwright's lines are; what a graft or a key or a boss
  DOES is not.

**The five harnesses this ladder keeps walking into.**

| harness | what it will catch, and it will |
|---|---|
| `demo` | a run that never ends (Phase 3's reinforcements), a container that does not claim its ids (Phase 5), a banned phrasing anywhere |
| `shots` | it WAITS up to two minutes for the Lampwright panel and fails the run if a first descent never produces one. Phases 2 and 3 both move that panel and both must move the shot with it |
| `guide` | `meet` and `meet_crystal`. Its dormant branch reads the state, reads what is open, then presses Escape — and `RULES.md` records that the meeting is the one modal it never Escapes |
| `smoke` | it is ORDER-DEPENDENT: a dozen assertions pick a dock item by POSITION, so Phase 5's third column goes at the END of the file |
| `drag` | 20 seconds, and on a failure it prints what `elementFromPoint` actually hits. Reach for it before `guide` the moment a new layer stops taking a click |

**Every phase from 3 on puts itself in the dev kit.** `START_PRESETS.dev` and
`DEV_CURRENCY` in `src/data.ts` are how a screen gets opened without farming for
it. A boss schedule, a key, a relic — each goes into the dev preset in the same
phase that adds it. A screen nobody can reach is a screen nobody tested.

### Phase 1 — The room through the hole

**What is true today.** A meeting happens on the floor of the descent you just
cleared. `RunSim.greetAtExit()` in `src/sim/run.ts` stands the Lampwright
`GREET_STEP` tiles off `map.exit`, `besideTheHole` picks the side, `walkOut(dt)`
is the hero crossing that last stride, and `finish()` in `src/ui/run.ts` takes
the `halt = 'met'` branch and holds the report until the panel is dismissed.
`generateMap` in `src/sim/grid.ts` is the ONLY thing in the game that builds a
map, and every map it builds is rooms, corridors and packs.

**Why it is wrong.** The one man who lives down there is standing in the room
you killed forty things in a moment ago, which makes the only place in the game
with nothing in it look exactly like the place that was full.

**What it becomes.** You drop into the hole the way you always do, and you come
up somewhere else: a small chamber nobody generated, cut out of the same rock,
with no packs in it, a bench with half-built lanterns on it, finished ones
standing about lit and unlit, and him.

- [ ] **`SceneDef` in `src/scenes.ts`.** `id`; `who`, a sprite id that is in
      `BEASTIARY` and in `PORTRAITS` both; `theme`, a `MapTheme`, so a scene is
      cut and inked out of a world that exists rather than being a fourth kind
      of rock; `plan`, the room and where the props stand; `said`, the words;
      `encounter`, null here and not null in Phase 3. One file per room under
      `src/scenes/`.
- [ ] **`sceneMap(def, rng): GameMap` in `src/sim/grid.ts`**, beside
      `generateMap`, sharing `carveRoom` with it and nothing else. ONE room, cut
      the way its theme cuts (`CUT`), and an `entrance` you come up out of. Not
      `generateMap` with a flag on it: a generator that also builds authored
      rooms is a generator nobody can read.
- [ ] **A scene has no exit to walk to.** `GameMap.exit` is required by the
      interface, so it is set to the entrance and nothing draws a second hole.
      A peaceful scene ENDS when the last beat is dismissed, and Phase 3's ends
      when the boss is down. There is no walk out, no `AT_EXIT` check and no
      second `mouth()`.
- [ ] **`GameMap.props`: `{ id, x, y }[]`, empty on every generated map.** A
      prop is PLACED where a decal is hashed off the tile — a bench with three
      half-built lanterns on it is a fact about a room, not a texture. Each prop
      id is a pure function returning `Decal[]` in `src/render/renderer.ts`
      beside `mouth()`, so BOTH renderers draw them and the colours come out of
      CSS custom properties like every other colour in the game. Nothing new in
      `BEASTIARY`: a prop is decals, not a sprite.
- [ ] **`RunState.folk: Entity[]` replaces `RunState.lampwright`.** Kept out of
      `monsters` for exactly the reason it is kept out today — nothing in combat
      may ever see a person — and a LIST because later phases put more than one
      body in a room. Both renderers draw folk where they draw the Lampwright
      now.
- [ ] **A scene is a `RunSim` over an authored map with no packs.**
      `RunOptions.scene` names the def; the constructor calls `sceneMap` instead
      of `generateMap` and spawns nothing. This is the decision the whole ladder
      rests on: a boss room is then one filled-in field, and Phase 3 is content
      rather than a second mechanism.
- [ ] **A fourth `Phase`: `'scene'`.** `Phase` in `src/ui/run.ts` is
      `'menu' | 'running' | 'results'` and `setPhase` is what `syncViewportLock`
      and `setInventoryBase(runHandler())` hang off. A scene is a map on screen,
      so `mapfull` stays on, the HUD and the rail stay up, and the dock's `base`
      handler is set from the same one slot as every other phase change — the
      map is the GROUND and a screen may still take `screenHandler` over it.
- [ ] **The run loop arrives there.** In `finish()`, the branch that today sets
      `halt = 'met'` and returns instead drops into the hole (`handover`,
      `banked = report`, exactly as a chained descent already does) and comes up
      in the scene rather than in the next descent. Three things stay as they
      are, and the phase is wrong if any of them moves: the report is the one
      that descent produced, the loot was banked before anybody spoke, and the
      meeting still STOPS the loop and lands on the same report screen.
- [ ] **The walk is the scene's own.** The hero walks in from the entrance and
      he walks to meet them; arriving sets `meeting` and opens the panel, as it
      does today. `takeHandover` and `#met` are untouched this phase — the card
      is Phase 2's job, and doing both at once is how a phase stops being
      reviewable.
- [ ] **`greetAtExit` and `besideTheHole` go.** Nothing stands beside a hole any
      more.
- [ ] **Leave and Abandon during a scene.** `setLeaveLabel` reads
      `phase === 'running'`; a scene is not running and has nothing to leave, so
      both go quiet rather than offering to abandon a room with a gift in it.

**Traps.**

- `launch()` calls `renderer.follow()` because a camera left pointed at a corner
  of the last map is a black screen with no obvious way out. A scene is a new
  map and needs the same call.
- The scene needs an `Rng`. Feed it the run's seed, not `Math.random()`, or the
  props move every time the same room is entered.
- `walkToMeeting` in `src/sim/run.ts` is the headless version of the walk and
  the demo drives it. It stays a bounded walk, over the scene's floor.
- The meeting checks near the end of `src/demo.ts` are written against
  `greetAtExit`, `state.lampwright` and the distance from `map.exit`. They are
  REWRITTEN against the scene, never deleted — they are what proves a gift can
  still never be missed.

**Done when.** Clearing a descent the Lampwright owes something for drops you
into the hole and stands you up in a lit workshop with a bench in it, he walks
over, the existing panel opens, and the run ends on the same report it always
did.

**What must not break, in this order.** `demo`, then `shots` — and add a SCENE
shot to it, because an art claim needs a screenshot and a room whose props draw
in one renderer only is precisely what that rule exists to catch. Then `guide`,
then `smoke`.

### Phase 2 — He says it out loud, in the room

**What is true today.** `src/ui/met.ts` puts up `#met`: a `.modal--stop` card in
the middle of the screen, a 120px portrait through `portraitIcon`, every line of
`LAMPWRIGHT.first.said` in one block, and one button. `.modal--stop` paints a
scrim over everything behind it.

**Why it is wrong.** Phase 1 builds a room and then covers it with a sheet, so
nobody ever sees the room or the man standing in it.

- [ ] **`src/ui/speech.ts` — a bubble anchored to a body on the map.** Built
      once and UPDATED per frame, never rebuilt: `renderFlasks` / `syncFlasks`
      is the precedent, and `RULES.md` records what rebuilding one sixty times a
      second did to the threshold buttons.
- [ ] **`Renderer.screenAt(at: Vec2): { x, y }` on the seam** in
      `src/render/renderer.ts`, implemented by both renderers. The bubble is the
      UI's and the tile size is the renderer's — the same split the camera
      already rides on, where the UI sends `panBy` in pixels and each renderer
      converts with the tile size only it knows.
- [ ] **Beats.** `SceneBeat { said: string; act?: SceneAct }`, and
      `SceneDef.said` becomes `SceneDef.beats`. `SceneAct` is what he does
      BETWEEN lines — `pace`, `work`, `face` — performed by the scene's own step
      off the walk and pose machinery that already exists: `WALK_POSES` in
      `src/render/pose.ts`, and `poseOf` in `src/render/pixi.ts`, which picks a
      pose from what the entity is DOING rather than from the clock. Setting
      `Entity.action` and `actionTimer` is the whole of the interface. No new
      art and no new frames.
- [ ] **Clicking advances one beat**, and the last beat is where the gift is.
      `#met` keeps its markup and keeps the `met-take` button id — that id is
      what the guided opening rings — and is restyled as the final bubble rather
      than as a centred card.
- [ ] **Escape takes the lot.** Today Escape closes the panel and the crystal is
      already granted, so refusing it would be worse than taking it. With beats,
      Escape skips the rest of them and grants — one press is still the whole
      answer, and `guide.mjs`'s dormant branch presses Escape at a moment nobody
      controls.
- [ ] **`.modal--stop` loses the Lampwright, and `RULES.md` says why in the same
      breath.** A scene IS a stop — nothing is ticking and the map is not yours
      to click — so it does not need a sheet over the room to prove it. That
      rule is written down today, and changing it without rewriting it is how
      `RULES.md` stops being the thing you can trust.
- [ ] **Nothing he says gains a number.** `LAMPWRIGHT.first`, `.crystal` and
      `.again` become beat lists and keep their words. He is flavour and the
      numbers rule is about mechanics.

**Traps.**

- The camera moves under the bubble. It is anchored per frame off `screenAt`,
  so a drag or a zoom mid-sentence keeps it over his head — and a body that has
  walked off screen needs an answer that is not a bubble in the corner.
- `.tip` is `z-index: 100`, `pointer-events: none`, and the TOP layer over
  every popup the app can raise. A bubble is a new layer and `smoke` measures
  the tooltip against each of them rather than against the number.
- The `#met` markup lives in `docs/index.html` and that file runs at a 25%
  comment share for a reason that is written down. Restyling is CSS in the same
  stylesheet; check `docs/index.html` for a class name before inventing one.
- **Only Pixi draws sprites**, so an `act` reads as a pose in the real renderer
  and as a moving circle in the canvas2d fallback. That is correct and is not to
  be "fixed" — but it does mean the beat script may never depend on a pose to
  carry meaning the words do not. He can pour a lantern; he cannot mime one.

**Done when.** He talks over his own head, in his own workshop, a line at a
time, and pours a lantern between two of them.

**What must not break, in this order.** `guide` first, because the opening
clicks `#met-take` twice and now has beats in front of it. Then `smoke`, then
`shots`, then `drag`.

### Phase 3 — The one who thinks the Lampwright is wrong

**What is true today.** `ENCOUNTERS` in `src/data.ts` is three closing shapes,
rolled from the run's own rng at the exit of any descent, and there is no such
thing as a fight you were brought to. Every id in `MONSTERS` can turn up in a
pack. The Lampwright's pitch — keep bringing me crystals, go deeper, survive —
is the only voice in the game, and nothing has ever argued with it.

**Who.** The **Lambengolmor**, met in the Fissure. His pitch is *stop blindly
feeding the stone; learn its true names and command it.* He holds that the
crystals are not fuel but punctuation in an old spell, and that the Lampwright
is waking something every time he sets one into a socket. The game never says
which of them is right.

- [ ] **A second scene character**, done exactly as the first: a `PORTRAITS`
      entry at grid 48, shoulders-up, one frame; a `BEASTIARY` entry at grid 24
      with two frames and NO `attack` frame, because he is a person and
      `lampwright` is the worked example of one. `wellFormed(rows, grid)` holds
      both to their own declared grid.
- [ ] **His room is large and round** — a `plan` with a `grown` cut — and its
      `SceneDef` carries an `encounter`.
- [ ] **A boss is not in `MONSTERS`.** `BOSSES` in `src/data.ts`: its own art,
      its own rank, life and damage as multipliers on `MONSTER_BASE` like
      everything else in the game, and `reinforce: { every, size, from }` — the
      smaller things that keep coming while it is alive. `MONSTERS` stays the
      pack pool and nothing in `BOSSES` may leak into it. The demo's "every
      monster has art" sweep gains the boss table; `MONSTER_ABILITIES` gives a
      boss its element the same way it gives a pack one, so its damage type is
      something you can answer with a ward.
- [ ] **The reinforcement clock sits beside `waveTimer` in `RunSim`** and STOPS
      when the boss dies. Killing the boss is what clears the room; the adds are
      pressure, never the objective.
- [ ] **The trigger is scheduled, never rolled.** The first boss room comes at
      the end of the first cleared descent run with two crystals socketed, read
      off `GameState` the way `giftWaiting` reads it, and recorded in `given`
      so it can only ever happen once.
- [ ] **He speaks before it and after it.** Beats, then the room goes live, then
      beats. A freeze is the UI declining to tick, which is all a scene already
      is — there is no pause state in the loop and there is not going to be one.
- [ ] **A boss room is a descent.** Its loot banks, its clear counts, and it
      lands on the report every other ending lands on. Dying in it costs that
      room and stops the loop, which is what dying costs anywhere else.

**Traps.**

- **A reinforcement clock with no stop condition is a run that never ends**, and
  the demo holds every descent to terminating. That one is a `check()`, not a
  `gauge()`, and it fails at any balance.
- The finale machinery is next door and is not the same thing: `spawnFinale`
  builds every body at `map.exit` and `climbOut` releases `EncounterDef.wave`
  in `size` at a time. `s.totalMonsters` counts the whole encounter the moment
  it starts, or the readout ticks down and then climbs again — a boss that keeps
  spawning adds has to decide what its readout counts before it is written.
- Twenty bodies on one tile read as two. That is what `wave` exists for, and
  reinforcements need the same shape.
- How hard the boss is, is a balance number, and `RULES.md` is standing: measure
  it, print it, carry on. No phase stops because a difficulty measurement moved.

**Done when.** A descent with two crystals in ends by putting you in a round
room with a stranger in it who tells you the Lampwright is using you, and then
something large comes at you while smaller things keep arriving, and putting it
down banks the room.

**What must not break, in this order.** `demo` — the termination check above
everything. Then `smoke`, then `shots`, and `tools/model-sheet.mts` for the new
art, which is the only view that judges a silhouette.

### Phase 4 — Going back for one you have already put down

**What is true today.** Nothing you do decides what a descent contains except
which crystals are socketed. Phase 3's boss happens once and can never happen
again.

**Why it is wrong.** The best fight in the game is a thing that occurred to you
once, and an idle game whose loop you cannot point at anything is a loop with
one setting.

- [ ] **A key is a wallet entry declared in its own table** — `BOSS_KEYS` in
      `src/data.ts` — and NEVER in `CURRENCIES`, so no shard, no sigil and no
      bench registry can ever reach it. `game.wallet` is already
      `Record<string, number>` and takes it for nothing.
- [ ] **It drops off a cleared descent**, at a rate that reads run power the way
      currency does, so running more crystals is the thing that buys another
      fight. Gated behind having put that boss down once.
- [ ] **`GameState.bosses`** — the ids you have beaten — beside `given` and
      `quests`, and `heal()` drops an id no table resolves, which is the whole
      cost of ever renaming one.
- [ ] **Spending it is a button on the Fissure screen** (`renderMenu` in
      `src/ui/run.ts`), naming the boss and what it costs, and it is consumed at
      the LAUNCH rather than at the clear: abandoning a boss room is abandoning,
      and that is the rule everywhere else.
- [ ] **The key is in the dev preset.** See the shared section.

**Traps.**

- The drop rate is a balance number and blocks nothing. Print it if it is worth
  knowing; do not tune the phase around it.
- A key spent puts the boss room at the end of the NEXT cleared descent, through
  `sceneWaiting` like everything else. It does not replace the descent, and it
  does not jump the order — it enters the queue at rung 2.

**Done when.** Clearing descents earns keys, and spending one puts the boss in
front of you again.

**What must not break, in this order.** `smoke` for the new menu button, then
`demo`.

### Phase 5 — The Osteomancer, and what a corpse is for

**What is true today.**

- `ItemKind` in `src/types.ts` is `'gear' | 'crystal'`, and `addItem`,
  `carryRoom`, `plainGear` and `sortGear` in `src/game/state.ts` all branch on
  it.
- An implicit is the base's own line. `GearBase.implicit` is authored for
  weapons and GENERATED for armour — `armourBases()` in `src/data.ts` spends a
  family's `mix` over `armourBudget`, which is what makes a Skirmisher chest
  different from a Bulwark one. `implicitsFor` in `src/economy.ts` rolls it onto
  the item as `Item.implicits`, and `applyCurrency` in `src/crafting.ts` clones
  it untouched, which is exactly why implicits survive every craft in the game.
- `statMods` in `src/sim/stats.ts` reads `[...i.mods, ...i.implicits]` off every
  equipped piece — its own comment says implicits count exactly like rolled mods
  and the only difference is that crafting cannot reach them — so a grafted STAT
  line needs no new path at all. Only a grafted GRANT does.
- A switch out of `GRANTS` reaches the sim from a tree node, a trade node, a
  passive skill or a unique. Never from a line on a piece of gear.

**Why it is wrong.** Nothing in the game lets one piece of gear give a thing up
to get a thing.

**Who.** The **Osteomancer**, in the Demonic world only, and frantic with it —
*gimme, gimme.* He wants the corpse and he will pay in something no drop can
roll.

**What a graft IS, and it is the shape of the whole feature.** It **replaces the
implicit.** The line the base gave you goes, and a `FORGED_MODS` line stands in
`Item.implicits` in its place. That is the trade: you give up what the base was
for.

- [ ] **A third `ItemKind`: `'relic'`.** `RULES.md` says adding a container is
      three places and it is right — the field on `GameState`, `heal()` dropping
      what no longer resolves, and the demo's "every collection a save can hold
      items in claims its ids" list. Plus `addItem` / `carryRoom` routing and a
      third column on the dock, which is the generic section the ask called for.
- [ ] **`RELICS` in `src/data.ts`**, `pristine_specimen` its first entry: a
      `DropGate` of `{ zone: 'demonic' }` and a low chance per kill. A gate is a
      wall and the pool is filtered before the pick, so no amount of rarity ever
      argues one out of the Fissure.
- [ ] **A relic cannot be sold**, exactly as a crystal cannot, and no bulk
      button may ever see one.
- [ ] **His scene is triggered by holding one**, and it is a scene like every
      other: cleared descent, down the hole, up into his room.
- [ ] **The graft is not a currency.** It happens in his room, spends the relic
      and one item, and writes the line. A currency is a thing you carry to a
      bench; this is a thing you carry to a man — and `CURRENCIES` effects clone
      straight past implicits on purpose.
- [ ] **`helmet`, `body` and `boots` only.**
- [ ] **A unique is REFUSED, and missing this one ruins saves.** `makeUnique`
      puts a named piece's whole identity into `implicits`; grafting over it
      deletes the item's reason to exist and no currency can put it back.
      `isUnique(item)` in `src/game/state.ts` is the test and it already exists.
- [ ] **The armour rating is not the implicit and is not touched.**
      `Item.armour` comes off the base out of the same family budget, so a
      grafted Bulwark helmet keeps its rating. Decided rather than overlooked,
      and cheap to overrule.
- [ ] **A second graft replaces the first.** The base's own line is gone the
      moment the first one lands and is never coming back; leaving the piece
      stuck on one choice forever would make a first graft a mistake nobody can
      walk back.
- [ ] **`item.meta.grafted` marks it**, because `itemCard` in
      `src/ui/itemcard.ts` draws implicits under a "base" heading and a grafted
      line sitting under that heading is a lie about where it came from.
- [ ] **`heal()` restores the base's implicit** when a graft's def no longer
      resolves — `GEAR_BASE_BY_ID[item.base].implicit` is still there. Without
      it the piece keeps a hole where its base line used to be. Note that
      `heal()` drops items by BASE and has never healed a MOD, so this is the
      first one of its kind and belongs beside the crystal repairs.
- [ ] **`ModDef.grants`**, merged by `treeGrants` in `src/sim/stats.ts` off worn
      gear exactly as `UNIQUE_BY_ID[...].grants` already is. Enemies bursting on
      death and hits leaving a Bleed are SWITCHES, not stat lines, and `GRANTS`
      is the one table a switch may be declared in. Each obeys every rule a tree
      node's grant obeys: declared, read by a behaviour a player can actually
      pick, and `say` printing its own number out of the table the sim reads.
- [ ] **Watch the class count.** `GrantDef.changes` has seven classes and
      `INTERACTIONS` in `src/trees/interactions.ts` holds all 28 pairs; the demo
      fails an unwritten pair. Reuse an existing class where the switch honestly
      fits one — a burst on death is a `burst` — and if a new class is genuinely
      needed, budget for the rows, because eight classes is 36 pairs.
- [ ] **A forged line never drops.** Weight 0 and excluded from the drop pool,
      but present in `ALL_MODS` so a save resolves it and `npm run mods` holds it
      to rolling, doing something and reading.
- [ ] **The vocabulary.** Bleed is already in `KEYWORDS`. "Explodes" is in
      `BANNED` and maps to Burst, and the demo sweeps every modifier line for it.

**Traps.**

- `sellPrice` in `src/economy.ts` counts `item.mods.length` and never implicits,
  so a graft moves an item's price by nothing. Deliberate — leave it.
- `sigil_of_finality`'s `scale_values` walks `ctx.item.mods` only, so nothing at
  the bench can push a grafted line past its own maximum. Deliberate — leave it.
- `implicitSpend` and the demo's family-budget check read `GearBase.implicit` —
  the DEF, not a rolled item — so grafting cannot make that check fail. Do not
  "fix" it into walking items.
- Relics are loot, so they land in the HAUL. `sortGear`, `itemMatches`, the
  haul's counts and both Sell all buttons all have to learn that a third kind
  exists. `plainGear` already filters `kind === 'gear'`; check it rather than
  assuming it.
- The Seam's theme id is `seam`, not `demonic`, so a Seam run drops no
  specimens even when half its packs are Demonic. That is a consequence of
  `DropGate.zone` being a zone and not a family, and it is worth a deliberate
  answer rather than a surprise.

**Done when.** A Demonic descent drops a pristine specimen, the next cleared
descent lands you in his room, and a chest piece walks out with its base line
replaced by something no drop in the game can roll.

**What must not break, in this order.** `mods` and `demo` first — a new item
kind touches `heal()`, the id counter and the drop pipeline, and the demo's
container list is where a missed one shows up. Then `smoke`, with the dock
column's checks at the END of the file. Then `shots`.

### Phase 6 — The Astral-Geometer

**What is true today.** After Phase 5, one world pays in something you carry to
a person, and it is the Demonic one. `RELICS` has one entry, `FORGED_MODS`
covers three armour slots, and the Cavern has nothing of its own — which Open
question 5 has been saying about the Prismatic world since the quality ladder
was retired.

**Why it is wrong.** A mechanism that exists in exactly one world is a
mechanism half the game never meets.

**What it is.** Phase 5's machinery with different content in it, which is
exactly why it is a separate phase and a small one. He is in the Prismatic
world, he is calm, and he offers a trade rather than begging for one.

- [ ] A second `RELICS` entry — prismatic dust — gated `{ zone: 'prismatic' }`.
- [ ] His scene, triggered the same way, at rung 4 of the order.
- [ ] `FORGED_MODS` for `ring` and `amulet` only.
- [ ] Art: `PORTRAITS` at 48, `BEASTIARY` at 24, no `attack` frame.
- [ ] Voice: he is the one who is not desperate. Same rule as every other
      character — flavour, no screen named, no number quoted.

**Traps.**

- **Jewellery has no implicit to replace.** `amulet`/`jade_amulet`/`onyx_amulet`
  and `ring`/`silver_band`/`gold_band` differ in exactly one way — how many
  modifiers they hold — and the backlog note about that lives next door to this
  phase. **Decided: the graft ADDS where there is nothing**, so jewellery is the
  one slot where a graft costs nothing, and that asymmetry is a price for the
  balance pass to set rather than a reason to give jewellery implicits here.
  Giving them implicits is a balance change and belongs to the balance pass; do
  not smuggle one in under a phase about a character.
- Nothing in Phase 5's work may need changing to make this fit. If it does,
  Phase 5 hard-coded something that should have been a table.

**Done when.** A Prismatic descent pays in dust, and a ring walks out of his
room carrying something a ring cannot otherwise hold.

**What must not break.** The same list as Phase 5, same order.

### Phase 7 — Teaching in a room instead of over one

> **Under-specified on purpose. Which lessons move is Open question 8** — write
> the answer into this phase before starting it.

**What is true today.** Everything the game teaches is taught by
`TUTORIAL_STEPS` in `src/ui/tutorial.ts`: fifteen steps, a card beside one lit
control, a lockdown on spending. It is good at "press this" and has no way at
all to say why any of it matters. Meanwhile phases 2–7 build four rooms where
somebody is talking directly to the player and nothing is ticking.

- [ ] **A beat may SHOW a keyword.** `SceneBeat.shows` names entries in
      `KEYWORDS`, and the bubble marks them and prints what each one means at
      the foot of the same bubble through `src/ui/glossary.ts`. The rule is
      already that a keyword is shown where it appears and never hidden behind a
      second hover; this is one more place it appears.
- [ ] **A scene may SATISFY a step.** A `TutorialStep` whose lesson a scene now
      carries is DELETED, not disabled, and the demo's hand-written action list
      loses its row in the same commit. `RULES.md` names the fifteen steps by id
      and that list is updated in the same breath.
- [ ] **The bursts rule still holds.** A scene teaches and then lets go. Nothing
      from this phase may follow the player out of the room, and no step may
      wait on something a scene has not reached yet.

**Traps.**

- `guide` is the primary harness for this phase rather than the expensive one,
  and it plays the opening in real time over about eleven descents.
- A step that is already satisfied is SKIPPED and never comes back. A lesson
  moved into a scene that the player reaches LATER than the step is a lesson
  nobody is ever taught.

**Done when.** The opening teaches fewer things and the game teaches more of
them, in rooms, and `npm run guide` still finishes by clicking only what is lit.

**What must not break.** `guide`, all of it, and the demo's step walkthrough.

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

6. **Does anyone live in the Seam?** Four characters, three worlds and the
   Fissure — the Seam, which is supposed to be the worst room in the game and
   takes exactly two crystals of each, has nobody in it. `RunState.folk` is a
   list rather than one slot partly for this. Not written and not asked for, and
   it leans on question 3, which is about whether the Seam is what it claims to
   be at all.

7. **The Lampwright's story is now BUILDABLE, which changes question 1.**
   Question 1 has stood since trades landed: the trade acquisition is a
   placeholder and is meant to come out of a storyline with him. Phases 2 and 3
   build exactly the thing that story would be told in — a room, a person in it,
   beats you click through. Nothing about the story is written, so it is still
   question 1 and still the user's; what has changed is that answering it is now
   content under `src/scenes/` rather than a system.

8. **What does a scene TEACH?** Phase 7 is written and under-specified on
   purpose. Four rooms where somebody talks straight at the player is the best
   teaching surface the game has ever had, and the list of lessons worth moving
   into one — what a crystal does, what a socket costs, what a ward is for, why
   the report splits damage by type — has not been picked. The one thing already
   decided is the shape: a step a scene now carries is DELETED from
   `TUTORIAL_STEPS` rather than left in beside it.

**Decisions taken inside the ladder, and what each one beat.** These are mine
except where marked, made because the ask invited them and the work stalls
without them. Any can be overruled cheaply while the phase is still on this
list; each one is repeated in the phase it belongs to, so overruling one means
editing two places.

- **A graft replaces the IMPLICIT.** *The user's answer, asked and given.* The
  line the base gave you goes and the forged one stands in its place, which
  makes a graft a trade rather than a free upgrade. The alternative — replacing
  a rolled modifier — would have been a currency that happens to be a man.
- **A scene is a `RunSim` over an authored map**, rather than a second kind of
  simulation beside it. A boss room is then one filled-in field instead of a
  second engine, and both renderers draw a scene with no changes at all, because
  they already draw a `RunState`.
- **A scene arrives THROUGH the hole** at the end of a cleared descent, and
  still ends the run. It keeps every rule the meeting already obeys and costs
  nothing new.
- **One scene per clear, in a fixed order**, rather than several at once or a
  roll between them. A gift is scheduled and never rolled, and four schedules
  that can interleave is four schedules nobody can read off a screen.
- **A boss room is a descent**: its loot banks, its clear counts, dying in it
  costs that room and stops the loop. The alternative — a room outside the loop
  that pays nothing — is a cutscene with hit points.
- **A boss key is a wallet entry in its own table**, not a `CurrencyDef` and not
  an item. The ask said "probably just gain the required currency"; a real
  currency is reachable by the bench's registries, which is a bench that can
  pour a boss key onto a helmet.
- **Relics are a third `ItemKind`**, not gear with a tag. `carryRoom`,
  `addItem`, `sortGear` and every screen already branch on kind, and a corpse
  that sorts into the dock beside a pair of boots is a corpse you sell by
  accident.
- **A graft leaves the armour rating alone**, adds where jewellery has no
  implicit to replace, and can be done again over itself. Three small ones,
  each written into the phase that owns it.

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
  in a phase about capacity — and Phase 6 leans on this rather than fixing it:
  a graft ADDS on jewellery because there is nothing there to replace.
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
