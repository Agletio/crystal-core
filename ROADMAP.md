# Crystal Core — Roadmap

**The list of work, and nothing else.** Everything that is always true lives in
`RULES.md`; the game as it stands is `CLAUDE.md`. If a thing here is not a task
or something you need in order to do one, it is in the wrong file.

**Three phases. Phases 1 and 2 are buildable now; Phase 3 WAITS.** The arc
dictated in one go is finished — the game has rooms you arrive in and people
standing in them, and all four people are built. Phase 1 is an art pipeline with
a generator behind it, which the user redirected onto and which therefore goes
first — it is now a SANDBOX to judge that art in, since the pipeline itself is
built and the real tools turned out to be an MCP server. Phase 2 is the batch after the arc: the skills screen, and a second way
to move. Phase 3 is teaching, and it does not start until the stripped opening
has been played — see its own note.

Do the lowest-numbered phase that is not blocked on an open question, all of it,
then delete it and renumber. Numbers in a phase are intent, not tuning — a
measurement beats them. A landed phase is DELETED from here, so before starting
one, `git fetch` and check you are on the tip of the branch: a phase you can
still see in a stale clone may already be built. Do not promote a backlog item
into a phase without being asked; the thing most likely to be asked for after
these is the **balance pass**, written up below.

**Nothing is blocked on an open question.** Phase 1 was rewritten after a long
session with the generator: the pipeline it asked for is BUILT, and what is left
is a sandbox to look at the art in. **Read all of Phase 1 before touching it** —
it holds what that session cost, including the fact that the generator is an
MCP server and not the REST API everything was first written against. Then read
**Before you touch the ladder**, below, which holds the parts belonging to no
single phase.

**What the last twelve phases turned out to know that their writing did not.**
Kept here because the next thing built on top of them will want it.

- **A table keyed only by SLOT made both men offer everything.** The phase said
  "`FORGED_MODS` for `ring` and `amulet` only", which is true of the lines and
  false of the panel: with `kinds` as the only key, the man who takes bodies
  offered a ring the graft he had just said he had no opinion about.
  `ForgedDef.who` names the room. A table keyed by the thing rather than by the
  person is the shape to watch the next time two characters share one.
- **A check written for one entry breaks on the second.** "A specimen only
  exists in the Rot" was written as `RELICS.some(...)` and started failing the
  moment a relic existed that was meant to be somewhere else. Sweeping a table
  is only right when it asks each row about ITSELF.

- **`fromHaul` pushed straight into `game.inventory`.** Every kind that is not
  gear was routed correctly by `addItem` and then routed WRONG the moment it
  came out of the haul, which is the one door a drop actually walks through. It
  calls `addItem` now. Anything that adds a container has to check both.
- **The dev preset carrying a relic scheduled his room over two boss checks.**
  Holding one IS the schedule, so the kit holding every relic means the ossuary
  is always owed — and two checks asserting "nobody is waiting" started
  failing. They clear `relics` the way they already cleared `bosses`. The dev
  kit has now broken a scheduled-room test twice, for the same reason both
  times: it is the game with everything, and every schedule reads what you have.
- **`tools/model-sheet.mts` keeps its own partial palette.** It lists the
  custom properties by hand and had none of the two far worlds' inks, so the
  first creature drawn out of the Rot handed `mix` an undefined and killed the
  tool. It has the whole list now; a new palette entry still needs adding there.
- **A bubble is anchored ABOVE its point, and nothing clamped it.** The first
  panel taller than four lines was drawn off the top of the screen. `anchor` in
  `src/ui/speech.ts` clamps to the window now.
- **A base with no implicit cannot show what a graft costs.** Half the armour
  families spend their whole budget on the rating, so `bulwark_*` has no line to
  write over — a check meant to prove the trade proved nothing on one. The
  reference family is `skirmisher`, which spends on three.

- **The demo's `GUIDED OPENING` section was not all about the steps.** Three of
  its checks were about the GAME and had to survive the deletion: the mark on
  the weapon the Lampwright hands over (and that a craft keeps it, and that
  `heal` puts it on a save that predates it), that the bench resolves to a
  piece you are WEARING and to a crystal you have SOCKETED, and that a first
  clear pays for the one currency the shop sells. They are `THE OPENING` now.
  A section named after a feature is worth reading line by line before it goes.
- **The ids the opening needed are still rendered, and now nothing proves they
  exist.** `dockSlotId`, `slotButtonId`, `recipeButtonId` and the three
  `skill*Id`s moved to the modules that mint them; the check that every one
  resolved was the walkthrough's, and it went with the steps. Whatever teaches
  next inherits that debt along with the harness debt already written down.
- **`pickingSlot` and `skillsDepth` were `GuideCtx` and nothing else.** Two
  exported accessors with no other reader, which is what an interface built for
  one consumer looks like once the consumer goes.

- **A `<canvas>` is a REPLACED element, and `inset: 0` does not size one.**
  With `width: auto` it lays out at its own backing store — the viewport times
  the device ratio — so a full-screen canvas painted correctly showed its
  top-left quarter and the title's two worlds read as one with a stain in the
  corner. `width: 100%; height: 100%` is the fix, and the same trap waits for
  any `<img>` or `<video>` positioned that way.
- **Two palettes over one grid is the whole of a map that changes world.**
  `tileDecals`, `livingDecals` and `floorColour` all take the `FloorPalette` as
  a PARAMETER, so drawing half a picture as one theme and half as another cost
  no change to either renderer and nothing in `src/sim`. The mixing lives in
  `src/ui/titleart.ts` and stops there: a `GameMap` still carries one theme.
- **A screen of stone is two frames, once.** 77×49 tiles at a device ratio of 2
  paints in 30–38ms in headless Chromium with no GPU — measured over three
  boots. Cheap enough that the phase's fallback to a still image was never
  needed, and cheap enough that the answer to a resize is to paint it again.

- **`heal()` drops a wallet entry that is not a `CurrencyDef`**, which is
  exactly what a boss key is. The rule that keeps a key off the bench is the
  rule that deleted it on every load until `heal` learnt the second table. Any
  future thing counted in the wallet has the same shape.
- **The dev preset holding every DOOR closed the room it was meant to open.**
  `game.bosses` is what stops a boss being scheduled twice, so handing the kit
  every id meant the Lambengolmor was never scheduled at all. The kit gets the
  keys and the doors both, and the test that walks the schedule clears them.

- **A room that goes live may not end through `finish()`.** Routed there, a
  cleared boss room took the chain-another-descent branch and dropped into a
  hole with nothing at the bottom: a frozen screen with no way off it. A room
  ends in its own terminus, and `sceneWaiting` is asked at the end of a DESCENT
  only, or a room hands you straight into the next room.
- **A bubble anchored to a body you can walk cannot be clicked.** Playwright
  refuses a target that will not hold still, and a player has the same problem
  with a slower version of it. The anchor is frozen per BEAT and follows the
  camera instead, which is the case the phase actually named.
- **A boss whose adds never arrive is a mechanism that does not exist.** At the
  life the phase's numbers implied, the thing died in two seconds and the
  reinforcement clock never fired once. Balance is not tuned, but a number that
  makes a mechanism unobservable is not balance — it is the mechanism missing.
- **A scene skips `spawn()`, and `spawn()` was where a kill's PRICE was set.**
  A boss room paid nothing at all until `priceKills` came out of it. Anything
  else that only a descent runs is worth checking for the same shape.

- **A rule for a FIXED element loses every specificity tie to the class it
  shares markup with.** `.modal__card` is one class and sets a width, so a card
  that wants its own needs two. The bubble was dropped back into the flow at the
  foot of the page by exactly this once already.
- **A scene needed the panel restyled, not replaced.** `#met` keeps its markup
  and its `met-take` id, and became the LAST beat by anchoring the same way the
  bubble does. Nothing about the handover moved.

- **A scene needs no rng, and the phase asked for one.** The trap said to feed
  `sceneMap` the run's seed or the props would move; with an absolute plan and a
  cut hashed off the tile it lands on, a room is the same room every time by
  CONSTRUCTION, which is stronger than seeding it. A parameter nothing reads is
  a parameter that lies about what varies.
- **The first map smaller than the screen found a camera bug three years of
  descents could not.** `viewW()` was `renderer.width / resolution`, which at a
  device ratio of 2 is half the real view — invisible for a descent, because a
  descent overflows the view and clamps against its edges, and glaring for a
  room, which centred itself in a quarter of the screen. `renderer.screen` is
  the accessor that cannot be wrong.
- **The climb out plays for the rest of the handover, so the branch at the
  bottom of the hole runs every frame of it.** `launch()` and `land()` both
  clear their own trigger; a room does too, and then has to say it is already
  in one or the next frame launches a descent on top of it.
- **A room's report is the DESCENT's.** `renderResults` reads a `RunState` for
  the loot, and the scene is a different sim with nothing in it. The state is
  held beside the report rather than taken from `sim` at the end.

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

Every one of them is the SAME object with different content in it: a
**scene** — an authored room you arrive in at the end of a cleared descent,
with somebody standing in it who talks to you. It is BUILT, and `RULES.md` holds
the rules it is bound by. Nothing below may introduce a second way of doing any
of it.

**Where the pieces go.** All four exist. Nothing below adds a fifth.

| | | |
|---|---|---|
| `src/scenes.ts` | the types and the registry | as `src/skills-tree.ts` is for trees |
| `src/scenes/*.ts` | one file per room, content only | as `src/trees/*` and `src/trades/*` are |
| `src/game/scenes.ts` | the SCHEDULE: what happens at the end of this clear | as `src/game/crystals.ts` is for gifts |
| `src/ui/speech.ts` | the bubble: a line over the body saying it | one module, one screen |

**ONE scene per cleared descent, and the order is fixed.** Four things can be
owed at the same moment — a crystal, a boss, a corpse to hand over, dust to
trade. `sceneWaiting(game, facts)` in `src/game/scenes.ts` is the
one function that answers what happens next, it returns **at most one** scene,
and everything else keeps waiting for the clear after. The order is:

1. the Lampwright, whenever `giftWaiting` says something is owed
2. the Lambengolmor, when a boss is scheduled or a key was spent
3. whoever wants a relic you are carrying. Rung 3 asks the SCENES table which
   room somebody is holding a relic for rather than naming anyone, so the
   Osteomancer and the Astral-Geometer come through one clause

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

**`src/sim` never decides that a scene happens.** BUILT: the decision is
`finish()` in `src/ui/run.ts`, off `sceneWaiting`, and the sim is TOLD through
`RunOptions.scene`. This is why the whole ladder leaves every headless harness
alone — `runToCompletion`, the ladder grids, the quest timings and the mana
measurements all drive `RunSim` directly and never ask for a scene.

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
  present. The only thing in any scene that can be fought is a boss, and it is
  fought by the shipped policy like everything else.
- **Every number is said out loud, and every mechanism has one word.** Four new
  characters is a great deal of new prose. The demo sweeps modifier lines, quest
  text, currency text and `GrantDef.what` for a `BANNED` phrasing and for a line
  with no digit in it. What a character SAYS is flavour and is out of that
  sweep, exactly as the Lampwright's lines are; what a graft or a key or a boss
  DOES is not.

**The five harnesses this ladder keeps walking into.**

| harness | what it will catch, and it will |
|---|---|
| `demo` | a run that never ends, a container that does not claim its ids, a banned phrasing anywhere |
| `shots` | it WAITS up to two minutes for the SCENE and then for the Lampwright panel, and fails the run if a first descent never produces one. Anything that moves that panel has to move the shot with it |
| `smoke` | it is ORDER-DEPENDENT: a dozen assertions pick a dock item by POSITION, so anything that reorders the dock goes at the END of the file |
| `drag` | 20 seconds, and on a failure it prints what `elementFromPoint` actually hits. Reach for it the moment a new layer stops taking a click |

**Every phase from here puts itself in the dev kit.** `START_PRESETS.dev` and
`DEV_CURRENCY` in `src/data.ts` are how a screen gets opened without farming for
it. A relic — and anything else like one — goes into the dev preset in the same
phase that adds it. A screen nobody can reach is a screen nobody tested. The reading room is the
worked exception and the reason is written down: the dev kit is handed every
crystal, so socketing two of them is the whole of what schedules it, and
socketing two in the PRESET would have changed what a dev game's Fissure is —
which `smoke` asserts about and every screenshot is taken against.

### Phase 1 — A sandbox, and the real generator behind it

**Read this whole section before touching anything.** Everything below was paid
for in generations and in wrong turns, and almost none of it is guessable.

**THE GENERATOR IS AN MCP SERVER, NOT THE REST API.** `https://api.pixellab.ai/mcp`,
with its guide at `/mcp/docs`. `.mcp.json` is committed and expands
`${PIXELLAB_API_KEY}`, so the tools appear as `mcp__pixellab__*` once a session
connects. **Use those and not `tools/art/pixellab.mts`,** which speaks to the
REST API — a fraction of what exists, and the reason a whole day went into
fighting problems the real tools do not have. The REST spec is also WRONG in
places: `/rotate` documents 16–200 and accepts only 128, 64, 32 or 16, and
refuses a reference image that is not already that size.

What the MCP has that REST does not:

- **`create_character`** — `body_type`, `template` (bear, cat, dog, horse,
  lion), `proportions`, `n_directions` 4 or 8. This is the rigged MANNEQUIN
  the website uses, and it is the whole quality gap. It also answers the
  quadrupeds and the amorphous creatures, which have no skeleton for the REST
  animator to find. Characters are STORED and reusable.
- **`animate_character`** — queued against a stored character, every direction
  at once, non-blocking. REST's `animate-with-text` is locked to 64px and its
  `animate-with-skeleton` needs hand-authored keypoints.
- **`create_topdown_tileset`** — a WANG tileset: 16 tiles covering every corner
  combination, 25 at full transition, chainable so one terrain blends into the
  next. This is the seam problem solved, and it is why CHUNKS are not needed.
- Creation is NON-BLOCKING: a job returns an id in moments and finishes in
  2–5 minutes. Queue several, then collect. Downloads need no auth.

**Sizes, measured.** Characters export at 128. Tiles cap at 64 (16/32 standard,
64 in `mode: 'pro'`). Creatures are therefore about two tiles tall — normal for
top-down, but LOOK at one before generating a set.

**Do not put generated art in the game outside the sandbox.** The husk was
swapped and is now reverted; `src/render/generated-art.ts` is left in place and
nothing imports it.

- [ ] **A dev button that opens a SANDBOX descent.** Its own `RunOptions`, its
      own tileset and its own bodies, reachable from the dev kit and from
      nowhere a player goes. It must not touch `MONSTERS`, `BEASTIARY` or any
      balance table, or the demo's measurements move under it.
- [ ] **Nothing dies in it and nothing ends it.** The point is to WATCH: walk
      about, swing in every direction, and look at the art for as long as you
      like. So the bodies do not take damage and the run has no clear
      condition. `RunSim` already ticks a map with no exit — that is what a
      scene is — so this is a scene with monsters in it rather than a new mode.
- [ ] **One tileset, one enemy, one character**, all through the MCP tools and
      all only in the sandbox.
- [ ] **Then judge it, and only then decide** whether the roster follows.

**What was learned about the art itself.** All of it still applies:

- **The five inks were never a limit.** `PixelArt.key` is an arbitrary record;
  `BeastArt.key` is optional and merges over the hand-drawn five. An export of
  64 colours takes 64 characters and needs no quantising at all.
- **`no_background` is not always obeyed**, and the flood that clears it works
  from the EDGES — so the gap between a pair of legs stays filled. `debackground`
  now also clears what the flood could not reach.
- **A cast shadow is drawn even when asked away twice**, and it is found by
  being wider than the WIDEST row of the body. Measured against the median it
  ate the feet.
- **Nothing may derive an outline.** The art carries its own edge; an added one
  is a slab of black, and eleven rings inward eats a thin limb whole.
- **A body must be FITTED to its frame**, or a cell drawn as one tile means two
  different things depending on where the art came from.
- **A rank is LIGHT, not a band.** `glowed` in `sprites.ts`, in the texture,
  alpha falling off squared. A solid border is a low-resolution convention and
  reads as a sticker at 128 and above.
- **The prompt owns the POSE and the parameter owns the CAMERA.** Changing both
  at once is what made `low top-down` look broken; kept apart it is right for
  this map, and bodies stay in profile so the renderer can still mirror them.
- **Wrongness is normalised away.** A panther asked for with no head came back
  with a head. Exaggerate proportions; do not ask for impossible anatomy.
- **`e.facing` is already a full angle** (`Math.atan2`), and only the renderer
  throws it away, collapsing it to a left/right flip. So directional sprites are
  a RENDERER change and nothing in the sim, the saves or the tables moves.
- **Mirroring halves a direction set**: 8 ways needs 5 generated (E, NE, SE, N,
  S) and 4 ways needs 3. Check the mirrors match before discarding — asymmetric
  detail on a body flips with it.
- **Every animation needs every direction you support**, or a creature pops
  between styles as it turns. Decide the direction count BEFORE generating
  states, because it multiplies everything after it.

**What the bundle costs, since art ships as STRINGS in a committed
`docs/app.js` that is 901 KB today.** One direction at 128 is about 1 MB across
the roster; five directions about 5 MB; eight about 8 MB. Past that it stops
being strings and needs an atlas, which costs the runtime palette — and the
runtime palette is what makes a zone recolour for free. That is a decision
about how the game SHIPS, not an art decision.

**Tools, all committed.** `tools/art/art.mts` drives the REST pipeline
(`balance`, `list`, `generate`, `convert`, `skeleton`, `animate`, `turn`,
`sheet <out> [id...]`, `accept`, `emit`); `import.mts` reads a website export
(`metadata.json` plus `rotations`) straight into grids; `selftest.mts` proves
the conversion without spending anything. `convert` re-derives animation frames
from cached PNGs, so refining the reduction costs no generations. Keep them:
they hold the conversion, and only the ASKING moves to MCP.

### Phase 2 — The skills screen, and a second way to move

**Dictated in one go. Five asks, and the last two are most of the work.**

**What is true today.** `src/ui/skills.ts` is three deep — category, then skill,
then its web — and it holds `category` and `viewing` as MODULE state, so
reopening the screen puts you back where you left rather than at the top. Every
skill with a web gets one from `BUILT_TREES`; a skill with none renders "no web
yet", which is what both passives and Blink do today. `movement` has exactly one
entry, `blink`.

- [ ] **The scene guard is for the SLOT, not for Blink.** Already true and worth
      keeping true: `maybeMove` reads `this.mover`, which is
      `equippedSkill(character, 'movement')`, so `if (this.options.scene) return`
      suppresses whatever fills the slot. What is still Blink-shaped is the
      BEHAVIOUR — the method teleports along the path — and the `'blink'` event
      both renderers draw. Leap needs its own of each.
- [ ] **Skills always opens at the top.** `openSkills` clears `category` and
      `viewing`. Escape still steps back a level, which is `skillsEscape` and
      stays.
- [ ] **A top row of the three equipped slots**, on the home page. Each shows
      the equipped skill or an empty slot, off `SKILL_SLOTS` and
      `Character.equipped`. Clicking a filled one goes straight to that skill's
      web; clicking an empty one goes to the list of skills that slot ACCEPTS —
      `SkillSlotDef.accepts` already says which shelves those are.
- [ ] **A passive has no web and must not pretend to.** Clicking one equips it,
      or asks first when the slot is filled. It never opens a tree — "no web
      yet" is a promise the game is not going to keep for a passive.
- [ ] **Leap**, the second movement skill: a jump rather than a step through.
      Same slot, same automation — `runToCompletion` is the shipped policy and
      no build's power may depend on somebody watching — but it LANDS, and
      landing is what its tree hangs off.
- [ ] **A web for Blink and one for Leap**, smaller than a skill tree. Simple
      things: cooldown off the `cooldown` param, and effects that fire on the
      MOVE. The examples asked for are mana regeneration after a blink, and a
      shockwave on landing a leap that slows attack speed nearby.
- [ ] **`buildTree` will refuse both.** It throws unless a spec has exactly six
      branches and six trunk notables (`BRANCH_COUNT` in `src/trees/layout.ts`).
      A smaller web needs its own layout the way the trade tree got
      `src/trades/layout.ts` — and what the two already share is
      `src/webgraph.ts` for reach, refund and replay, and `src/ui/webart.ts` for
      the studs. Do not bend `buildTree`; give the movement webs a sibling.
- [ ] Every grant a node hands over is declared in `sim/grants.ts` and READ by
      something, with a `merge` if two nodes can both grant it, and the demo
      holds that line. A move that grants regeneration and a move that grants a
      shockwave are two new readers, not two new concepts.
- [ ] The vocabulary. `KEYWORDS` is the only way these may be said, and the
      demo's `ONE WORD PER MECHANISM` sweep fails an invented synonym. A
      shockwave that slows is a **Splash** that does something; check the table
      before naming anything.

**Traps, all seven MEASURED rather than guessed.** Read every one before
starting: the first three are why the last two checkboxes are not an afternoon,
and none of them is visible from the files a fresh session would open.

- **Only the MAIN skill takes a run's XP.** `report.ts:97` is
  `addSkillXp(game.character, mainSkillId(character), xp)`. A skill web is
  funded by that SKILL's level, and a mover never gains one — so a movement web
  would sit at level 1 holding a single point, forever, and every node past the
  first would be unreachable in a played game. The fix is to bank the run's XP
  for every EQUIPPED skill, as a loop over `SKILL_SLOTS`, which costs one change
  and is generic over a fourth slot. The rule it seems to bend is not bent:
  "committing to one skill advances its tree" is about the MAIN slot, and you
  only ever hold one mover.
- **`treeGrants` merges the MAIN skill's tree and nothing else.**
  `src/sim/stats.ts` — the other two slots contribute their static
  `SkillDef.grants` only, so a mover's ALLOCATIONS never reach the sim and every
  node of both new webs would do nothing at all. Extend that same loop to merge
  each non-main slot's own web, so a web reaches the sim by the one path a tree
  node, a trade node and a unique already use.
- **`treePointsFor(level)` is `Math.min(level, MAX_TREE_POINTS)` — 30, globally.**
  A nine-node web is therefore OWNED by level 9, and `MAX_TREE_POINTS`' own
  comment is "a tree you can fill in is not a decision". A small web has to
  declare its own budget, which means `treePointsFor` takes a skillId. Every
  call site has one in scope: `ui/skills.ts` ×3, `game/save.ts:225`,
  `sim/loadout.ts:69`, and `sim/character.ts` — where `pointsAvailable(progress)`
  has to grow one too, and its callers are `game/crystals.ts:54` and `:80`.
- **`BANNED` maps the bare word `leap` to Arc**, and the demo sweeps every
  skill's own description — so the skill cannot say its own name. Narrow it to
  the PHRASE that actually means Arc (`leaps to`, `leaping to`) and Arc keeps
  its word, since its `means` line already says "leaps from what it hits". This
  is a DECISION taken on the user's behalf: the ask names the skill Leap, and
  the alternative is renaming the thing they asked for.
- **The demo's sweeps name `BUILT_TREES` and `TRADES` one at a time.** A third
  web family is invisible to all of them until it is added by hand to each: the
  every-line-says-its-number sweep (~3429), the two vocabulary sweeps (~3491,
  ~3541), and the per-tree reachability and grant checks (~1707). Adding the
  family is adding a row to each of those, not adding a file.
- **A monster's swing rate is set in TWO places** — `run.ts:1211` for a melee
  body and `run.ts:1541` for anything with a skill — and `Entity.effects` is
  ticked for the HERO alone. A Slow on landing therefore needs one rate helper
  that both call, plus a tick for monster effects; put it in either place only
  and ranged packs, or melee ones, ignore it silently.
- **`SKILL_BEHAVIOURS` has no `no_cast` entry and does not need one** —
  `run.ts:1499` falls back. So giving the two movers their own behaviour names
  costs nothing and is what lets `GrantDef.reads` tell a jump's shockwave from a
  step: a landing switch on the web of a skill that does not land is exactly the
  point spent on nothing the demo already fails a tree for.

**Decisions taken, each cheap to overrule while this is still a phase.**

- **What makes Leap a jump rather than a second Blink**: a step needs a clear
  line and goes THROUGH, a jump does not and goes OVER. Both still land on
  walkable ground and both stay on the path already found, so a leap can never
  put you somewhere the walk could not reach — it cuts the corner instead.
- **A movement web is three arms of three**, minor-minor-notable, with a budget
  smaller than the web: what is decided is which arms you walk, and the arm is
  the price, exactly as a trade spoke is. Its own layout beside
  `src/trades/layout.ts`, sharing `webgraph.ts` and `webart.ts`.
- **Slow becomes a KEYWORD.** Nothing in the game slows an enemy today, so the
  shockwave is a new mechanism, and `RULES.md` says a new mechanism either uses
  a word in the table or adds one. It is not a Splash: that word is defined as a
  swing dealing a share of its damage in a circle, and the landing deals none.

**What must not break.** `equipSkill` refuses a skill whose category the slot
does not accept, and the demo checks it — equipping a mover must never be what
stops you swinging. `heal()` empties a slot naming a skill that is gone, so
adding one costs nothing but removing one does. `npm run demo` measures that the
mover fires itself with nobody watching and never lands in rock, that every
descent it is in still ends, and that nobody moves across an authored room; all
four now have a second skill to hold to. `MAIN_SKILLS` is what every harness
builds a character to fight with and Leap is not in it.

### Phase 3 — A quest log instead of a pointing finger

**Not next, and deliberately.** The tutorial has been deleted outright so the
opening can be PLAYED with nothing explaining it. This phase is what teaching
eventually becomes, and it does not start until that has happened and the
systems have settled — the user's words are "once all the systems are in place
and we see how the intro plays out then we add it in small parts as needed".
Small parts, driven by what actually confused somebody. Do not take this phase
because it is next in the list; take it when asked.

**What is true today.** Nothing teaches anything: `TUTORIAL_STEPS`, the card
and `body.guided` are gone. What that leaves is a game that never prevents a
click and never explains one either.

**Why it is wrong, in the user's words.** *"The whole click here highlighting
stuff works but it feels like a cop out and mobile gamey. Everyone I've seen
play immediately wants to click on things the tutorial doesn't let them."* The
lockdown does not merely fail to help exploration — it FORBIDS it. What is
wanted is the opposite shape: nothing blocks you, and there is somewhere to
look when you get stuck.

**The machinery is already here, and it is most of the job.** `CRYSTAL_QUESTS`
in `src/data.ts` is a table of `{ id, name, detail, need, gives }`; `need` is
clauses ANDed together, `kind` names an entry in `QUEST_CONDITIONS`, and
`detail` is *the objective already written in words*. A new objective is a
registry entry and a table row. What is missing is only: a screen to read them
on, a way for a person in a room to hand one over, and a reward that is not
always a crystal.

- [ ] **A quest log, on the rail like every other screen.** Active quests with
      their `detail`, and what is done. `detail` is the specific instruction —
      the thing you open when stuck — so the dialogue can stay atmospheric and
      the log can say "put a Shard of Making on a socketed crystal".
- [ ] **A quest is GIVEN, in a room.** A `SceneDef` names the quest its person
      hands over, so meeting somebody is what starts one. The existing crystal
      quests are ambient and complete in any order; decide whether they become
      given too or stay as they are, and say why.
- [ ] **`gives` stops being crystal-shaped.** It is `{ level, family }` today.
      A quest that teaches the bench pays a currency, or nothing at all — the
      teaching is the point. Generalise it the way `GrantDef` generalised a
      switch, so a new reward is a table row.
- [ ] **Quest state goes in the save**, and `heal()` drops an id that no longer
      resolves, exactly as it does for items and tree nodes. A quest offered,
      taken and finished is three states, where today a quest is a condition
      that is either met or not.
- [ ] **Nothing may reintroduce a cage.** The lockdown is already gone; a log
      that greys out what you have not been told about is the same cop out in
      a new coat.
- [ ] **Start from what actually confused a player**, not from a list of
      systems. The suspected pair is the bench and the socket — nobody
      discovers "drag a currency onto an item" by clicking about — but that is
      a guess until somebody has played the stripped opening and got stuck.

**Traps.**

- **Teaching has no harness and this phase owes one**: can a fresh character
  reach the first crystal by doing what the log says? `npm run guide` was
  retired and its walkthrough deleted with the steps, so the debt is real and
  it is this phase's to pay. It owes a second one with it: the ids the opening
  needed — `dockSlotId`, `slotButtonId`, `recipeButtonId`, `skillCatId`,
  `skillRowId`, `skillNodeId` — are still minted by the screens that render
  them, and the check that each one resolved went with the steps.

**Done when.** A new character is never prevented from clicking anything, and
a player who stops knowing what to do can open one screen that tells them.

**What must not break.** The demo's quest checks — every quest's clauses must
still be satisfiable, which is the check that already exists and is the reason
this phase is cheaper than it looks.

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
   placeholder and is meant to come out of a storyline with him. The thing that
   story would be told in is now BUILT and has been used three times — a room,
   a person in it, beats you click through, and a panel at the end that does
   something. Nothing about the story is written, so it is still question 1 and
   still the user's; what has changed is that answering it is content under
   `src/scenes/` rather than a system.

8. **How many DIRECTIONS does a creature have?** This is the one that
   multiplies everything after it, so it wants answering before a roster is
   generated rather than during. One (today) keeps the renderer as it is and
   costs about 1 MB across the roster; four costs three generated directions
   per animation state and about 3 MB; eight costs five and about 8 MB, since
   mirroring gives W, NW and SW free. Past roughly 5 MB the art stops being
   strings in `docs/app.js` and needs an ATLAS, which costs the runtime palette
   — and the runtime palette is what makes a zone recolour for free. So it is
   really two questions and the second is the bigger one: how many directions,
   and is the game still shipping its art as strings. The sandbox exists to
   answer the first by LOOKING; the second is a decision about how the game
   ships and belongs to the user.

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
  implicit to replace, and can be done again over itself. Three small ones.
- **A forged line belongs to the PERSON, not the slot.** `ForgedDef.who`. The
  Astral-Geometer's phase said "for `ring` and `amulet` only", which described
  the lines and not the panel — keyed by slot alone, the man who takes bodies
  offered a ring the graft he had just said he had no opinion about.

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
  in a phase about capacity — and the Astral-Geometer leans on it rather than
  fixing it: a graft ADDS on jewellery because there is nothing to replace, so
  the line that changes the delivery charges mana instead. Giving jewellery
  implicits would change what that graft costs, which is the balance pass's.
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
- **A first descent can drop nothing at all.** Gear rolls at 5% a kill, so
  about a third of first clears bank an empty haul — which is a new player
  meeting the loop's payoff screen with nothing in it. A guaranteed first drop
  is the obvious answer. Written down as the opening's, and it outlived it.
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
