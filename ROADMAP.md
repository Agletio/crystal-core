# Crystal Core — Roadmap

**The list of work, and nothing else.** Everything that is always true lives in
`RULES.md`; the game as it stands is `CLAUDE.md`. If a thing here is not a task
or something you need in order to do one, it is in the wrong file.

## Where this stands

**A player fights THREE GENERATED BODIES** — the Husk, the Gaunt and the
Bonecaller, all Normal undead, six states apiece over five facings. So generated
art is in the game at both ends now, the ground and the things standing on it.
Open question 8 is closed at both ends with it: a body asked DARK separates from
all four zone floors, so nothing is re-inked and nothing is generated per zone.

**Before generating anything else, read "The process, as it now stands" and
"Doing this a thousand times" below.** The first is the runbook and the second
is every pitfall that has already cost time — the ten-job account-wide limit, a
refusal that arrives as text rather than an error, a dedup keyed on the first
thirty characters of a description, characters that vanish from the server, and
the source size, which is the real ceiling rather than the generation budget.

**ALL FOUR zones are drawn by a GENERATED TILESET, in live descents.** Four
sets, one per zone, each asked off that zone's own line in `MAP_THEMES`. The
runtime palette is what a generated surface cost, and that was the user's call
taken in the doing.

**The SANDBOX IS DELETED and the work has moved into the game.** *The user's
call, in their words: "We are going to just delete the sandbox and start
updating graphics in the actual game. I think it either works or it doesn't."*
A Fissure descent is now the dressed room the sandbox was — cover at the wall
feet, roots on the cut face, arrangements you can read — and `npm run peek` is
pointed at one. Judging art in a room nobody plays cost a round trip on every
question, and there is nothing left to round-trip through.

### If it does not work, revert to one of these

Two clean points, both pushed. **Tags could not be pushed — the remote answers
403 on `refs/tags` — so these are SHAs and this file is where they live.**

| commit | what it is |
|---|---|
| `3f31b6a` | the last commit with the Fissure still HAND-DRAWN. The generated tileset exists but nothing a player runs uses it. Reverting here undoes the zone in the game and keeps everything else. |
| `83b8488` | the BLANK room: every generated tileset deleted, props and bodies kept. Reverting here drops generated terrain entirely. |
| `9c85286` | before this session. The old two-tile wall, the chasms, the lightmap. |

`452887c` is the commit that put the tileset into the Fissure. Everything
before it was the sandbox, and the sandbox is gone.

## How to work

Do the lowest-numbered phase that is not blocked on an open question, all of it,
then delete it and renumber. Numbers in a phase are intent, not tuning — a
measurement beats them. A landed phase is DELETED from here, so before starting
one, `git fetch` and check you are on the tip of the branch: a phase you can
still see in a stale clone may already be built. Do not promote a backlog item
into a phase without being asked.

**`npm run shots` was RED for `desktop: the first descent never met the
Lampwright`, and it is GREEN now.** It was never diagnosed, and it has NOT been
fixed on purpose: dressing a descent consumes one draw from the run's own rng,
which shifts every roll after it, and the first descent now happens to reach
`#met`. So it is a seed away from coming back. If it does, that is the old
undiagnosed fault and not a regression.

**What the last phases turned out to know that their writing did not.**
Kept here because the next thing built on top of them will want it.

- **A monster at weight 300 cannot be judged by taking screenshots and hoping.**
  The Gaunt is one row in eleven and three peeks in a row caught none. What
  works is bumping its `weight` to something absurd, building, shooting it, and
  putting the weight back — a minute, and it is the only way to see a body
  against the hero and the pack at once. `npm run peek` takes a zoom, a pan and
  a `x,y,w,h,scale` crop, which is what makes the shot judgeable.
- **`radius` is capped for WALKING and uncapped for SHOVING.** `Grid.fits`
  clamps to `BODY_MAX` (0.45), so no radius can wall a body out of a passage;
  separation in `src/sim/run.ts` reads `a.radius + b.radius` raw. That is what
  makes doubling a big body's radius safe — it pushes the pack out of its legs
  and cannot strand it.
- **Stripping the arrangements left `Grid.solid` with NO live producer, and the
  check that guarded it went vacuous rather than red.** Every solid prop in the
  game — altar, cairn, brazier, pillar, pitprop, cart, cocoon, stake, skulls —
  only ever arrived through a `VIGNETTES` arrangement, and the four authored
  rooms furnish themselves with benches, shelves and lanterns, none of which
  block. So `block` ran over four descents and marked nothing, and a check
  reading "furniture blocks, only where it may" would have passed forever while
  proving nothing. It DRIVES the layer now: it rings a scene's person with
  solids and holds `block` to refusing the one that closes the ring — which is
  the undo rule, and the old check never tested it at all. **A check whose
  subject a phase deletes does not fail; it stops meaning anything. Look for
  the vacuous ones, not just the red ones.**
- **The Fissure was the only zone `WORKED` held, so emptying that gate was the
  whole phase.** One call site, one `Set`, one constant. Everything else was
  the two demo checks written against the old rule.
- **A descent's dressing has its OWN rng**, so removing a pass moves the cover
  and cannot move a monster, a drop or a seed anything else reads. Measured: 141
  of cover and 9 roots on seed 11, and every balance number in the demo
  unchanged.

- **The sandbox's deletion had to answer its own trap, and it answered it the
  expensive way.** The phase said either keep a descent that dresses or delete
  the prop tables and say so. `VIGNETTES`, `COVER_PROPS`, `WALL_PROPS`,
  `STAIN_PROPS`, `SOLID_PROPS` and every entry in `PROP_ART` were reachable
  ONLY through the sandbox — `generateMap` returned `props: []` and the four
  authored rooms are not `bare` — so deleting the room would have retired every
  generated prop in the repo one phase before the roster phase generates more.
  So `generateMap` dresses, gated on `ZONE[theme]`: cover, growth on the face
  and `DRESS_PER_ROOM` arrangements per chamber. The other three zones get it
  free the moment they get a set. **The props phase now retires the
  arrangements deliberately** — that is a look decision taken with the room on
  screen, not this trap coming back, and the tables stay in the file.
- **`Grid.solid` was a layer the PATHFINDER did not know about.** `findPath`
  and `nearestByPath` tested `grid.at(...) === WALL` where everything else asks
  `grid.walkable`, so the first descent with furniture in it walked the hero
  onto a brazier and parked it there for 5,821 ticks: every repath from a tile
  it cannot stand on comes back empty, and the descent never ends. It was
  invisible while only the sandbox had furniture, because nothing in that room
  had to reach an exit. Anything asking "can a body be here" asks `walkable`.
- **A body could always clip a wall CORNER, and the demo's six seeds missed
  it.** `advance` interpolated straight to the next waypoint with no
  walkability test: waypoints never cut a corner, but a body pushed off the
  lattice by separation can cross one getting back to them. Measured on the
  UNCHANGED code over 60 seeds it happens on one of them — so it is pre-existing
  and the rng shift merely landed on it. `glide` moves per axis now, and both
  movers measure 0 ticks in rock over 80 seeds each.
- **`RULES.md` and `CLAUDE.md` describe a renderer that is partly not there,
  and this phase only fixed what it touched.** `lightMap`, `ROCK_TOP`,
  `ROCK_REACH`, `GRAIN`, `GLOW_PROPS`, `WALL_FACE`, `thinRock`, `wangCorners`,
  `wangNear`, `wangShadow`, `VOID` and every chasm are all named in prose and
  none exists in `src/` — they went with `83b8488` and `aecbe3c` and the docs
  did not follow. The sandbox and chasm passages are gone from both files now;
  **anything else either file says about the renderer is worth grepping for
  before trusting.** What the deleted work FOUND is still true and is written up
  further down this file.
- **`torch` and `hung` are generated art nothing places.** They are
  `HUNG_PROPS`, which is placed by hand and never scattered, and the hand that
  placed them was the shrine. `roots` keeps the set load-bearing because
  `dressWalls` scatters it. The first authored room built on a generated set is
  what they are waiting for.
- **Three more zones cost nine generations and no code worth the name.** The
  whole of that phase's zone work was: write the asks off each zone's own line,
  `ask`, `get`, `emit`, and four lines in `ZONE`. Everything the first set had
  to learn about the renderer — the twins, the nearest-key fallback, the
  bounding boxes, `fitCorners` — held for all three without a change. **The
  pipeline is the thing that was expensive, and it is paid for.**
- **`cavern_lit` is the tone rule MEASURED, and it is in the file on purpose.**
  It was asked the Cavern's own way round — pale crystal rock over a dark violet
  floor, which is exactly what `THEME_INK` says the zone is — and it reads
  inside out: the pale expanse takes the eye as ground and the chamber reads as
  a hole punched in it. A zone's identity is its HUE, and the tone is not
  negotiable. Two asks, two confirmations, and one of them deliberate.
- **Not asking for stone is not excluding it.** `seam_round` said meat and
  muscle and crystal throughout, never said stone, and came back as grey
  cobbles with magenta dots on the rim. The re-ask with NOT stone, NOT rock,
  NOT brick, NOT cobbles, NOT masonry drew what was asked for.
- **The Seam ships `seam_pro` and the repetition is the price.** `seam_round2`
  is the repetition-safe one — near-black rock, sparse crystal — and it reads as
  the Cavern with a pink floor. `seam_pro` is unmistakably two worlds fused, and
  its rock is a dense field that repeats visibly across a map. The Seam is the
  rarest room in the game, so identity beat repetition; the other set is in
  `zoneset.mts` beside it, one word to switch. **There is nothing left to
  answer repetition with** — `GRAIN` and the lightmap went at `83b8488` — so the
  cover scatter is the whole of the answer, which is why it is not gated.
- **Judging a zone means SOCKETING for it.** A zone is a composition, not a
  setting, so `npm run peek` takes a zone name and puts the crystals in through
  the collection screen — two Demonic for the Rot, two Prismatic for the Cavern,
  two of each for the Seam. There is no other way in, and there should not be.
- **A scene lost its multi-chamber machinery with the room that used it.**
  `ScenePlan` is `room`, `entrance`, `stands`, `props` and nothing else:
  `also`, `joins`, `cut`, `patrol`, `busy`, `plain`, `dress` and `grown` were
  all the sandbox's, and no authored room ever used one. Putting `also`/`joins`
  back is about ten lines of `sceneMap` and it is in the history at `2b965bc`.

- **A phase's seven measured traps were all real, and all cheap.** The skills
  phase named seven things a fresh session would get wrong, every one of them
  measured rather than guessed, and each cost one edit: XP over `SKILL_SLOTS`,
  `treeGrants` over `SKILL_SLOTS`, `treePointsFor(skillId, level)`, `BANNED`
  narrowed to a phrase, the demo's sweeps given the third web family by hand,
  one `swingCooldown` helper, and a behaviour name per mover. **Nothing in the
  phase cost more than its traps did.** That is what a phase written to the six
  rules buys, and it is worth saying out loud.
- **The class audit's exemption is DERIVED, not a second list.** A mover's
  switches read a behaviour and declare no `changes`, which the "every switch a
  delivery reads declares what it changes" check failed at once. The fix is not
  an exemption list: it is asking `SKILL_BEHAVIOURS` whether anything that
  actually CASTS reads the switch. A mover has no cast, so it is exempt by
  construction and a third one will be too. The symmetric check — "nothing that
  changes no delivery claims a class" — was written and DELETED: `convertTree`
  reads the stat layer and is legitimately classed, so that half is just wrong.
- **A small web needed its own "every notable does something".** The tree's
  version fires `SKILL_BEHAVIOURS[skill.behaviour]` at dummies and counts who
  got hit, which for a skill with no behaviour is a crash rather than a check.
  The movement version reads the same expressions the sim reads — reach,
  cooldown, mana back, `landingOf` — so a grant renamed in one place and not
  the other fails rather than going quiet.
- **`fitted` per frame makes a walk cycle jitter.** Not this phase's, but the
  same shape: a function that measures what it is handed, run over things that
  are meant to be measured TOGETHER. `fittedTogether` was the answer there;
  `swingCooldown` is the answer to the same shape in the sim.

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

**The vocabulary is a place new work lands, and it has landed once.** `KEYWORDS`
covers the three trees, the two movement webs and the two trades. A new skill, a
new trade or a new modifier either uses a word that is already in the table or
adds one — and the demo's `ONE WORD PER MECHANISM` sweep is what makes that not
optional. **Slow** is the worked example: nothing in the game slowed an enemy,
so the landing shockwave added a word rather than borrowing Splash, which is
defined as damage in a circle and would have been a lie. A bow skill saying
"+5 Arc" is the other half of the same case.

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

## What the generated zone cost, and what it taught

**This is the part to duplicate, and the part not to repeat.** The Fissure now
draws from a 25-tile generated Wang set shipped whole as a data URI. Six
generations over two rounds got there; most of the session went on the renderer
rather than on the art.

### The generator, as it actually is

- **`create_topdown_tileset` tops out at 21 distinct corner combinations.** 16
  tiles at transition 0/0.25/0.5, 25 at 1.0 — and the 25 are 21 keys plus four
  wall CONTINUATIONS that share their corners with a twin. No prompt, mode or
  shape style changes that. A regen buys a different-looking set with identical
  gaps, so **do not spend a generation trying to fill a missing key.**
- **`transition_size: 1` is what makes a wall a WALL.** The cliff fills the map
  cell BELOW the boundary, so a wall is two rows tall as DRAWN. The old set's
  face was a fraction of a tile and every attempt to stretch it turned its
  rounded columns into fence posts.
- **`shape_style: 'round'` is the one that reads.** The rock reduces to a thin
  dark cliff band and then pure black, so there is barely any rock surface left
  to repeat — which answers the wallpaper problem by REMOVING the surface rather
  than by lighting it. A whole previous session was spent failing to light it.
- **Tone has to be said at BOTH ends.** Four asks came back with the rock PALER
  than the floor, which reads inside out — the eye takes the bright expanse for
  ground and the rooms for holes. A LIGHT floor that is NOT dark and a near-black
  rock that is NOT pale, each excluding the other's colour, is what fixed it.
  `lit_round` ships; `lit_floor` is the same tone with more rock texture and is
  in the file beside it, one word to switch.
- **`standard` mode drew an orange brick dungeon** off a cave prompt. Pro and
  shape_style both stayed in the cave. 
- **The sheet ships WHOLE, as a data URI.** Quantising to a character grid
  bought the runtime palette, and a painted tileset has baked hex and cannot
  have that anyway — so the conversion was all cost. `tools/art/zoneset.mts`
  is `ask` / `get` / `emit`, and `emit` writes `src/render/generated-tiles.ts`.
- **The docs at `https://api.pixellab.ai/mcp/docs` are worth reading and I did
  not until told to.** They say the plain 16 cover ALL corner combinations,
  which is what settled that the gaps are shapes the generator's terrain model
  never emits rather than missing art. That one sentence would have saved two
  wrong fixes.

### Three fixes tried, and only the third was right

Worth writing out because the wrong two are attractive.

1. **Nearest key.** A cell whose corners the set has no picture for takes the
   closest it does. Cheap, and it is still there as the renderer's backstop —
   but it puts a cut face where solid rock belongs.
2. **Quadrant synthesis. WRONG, and it looked right on paper.** A corner tile IS
   its four corners, so build the missing key from quarters of the ones you
   have. Measured on one view with it on and off: it puts thin slivers of FLOOR
   inside solid rock. A quadrant's picture is not decided by its own corner —
   the boundary inside a quarter depends on the corners either side, which a
   corner key cannot say. **Render composited tiles and LOOK at them before
   shipping any scheme like this.**
3. **Fit the CARVE.** `fitCorners` opens rock until every cell is a key the set
   holds. Zero cells drawn off their corners, against 26. Same move `thinRock`
   made, safe for the same reason — opening only ever adds space.

### What the renderer needed, none of it guessable

- **Decode the sheet where the renderer is already awaited.** Sliced on first
  use, the draw runs before the image has loaded and the entire floor is
  silently missing.
- **The four twins are told apart by `pattern_4x4`, and those rows are CORNER
  values one row out** — not the cell's tile type. Read wrong, the wall's lip
  tile lands anywhere, and a lip repeating down a face is a pale line running
  up it.
- **The cut face moved.** The old set drew it in the rock cell; this one fills
  the cell below the boundary, so the face is the FLOOR tile with rock over it.
  Anything hanging on the face moved a row with it — `dressWalls`, the demo's
  `face` predicate and the shrine's own wall row.
- **The two LANDMARKS survive `bare`.** Every other decal stands down, but the
  entrance and exit have to be findable. And `mouth` takes darker inks there: a
  hole reads by CONTRAST, and the rim that stood out on dark stone is a white
  box on pale sand.
- **`fitCorners` must hold the rock a hand-placed prop hangs on**, or it opens
  the wall under a torch and leaves it on air. And it may only open a cell
  TOUCHING floor — allowed anywhere it punched 50 unreachable pockets into the
  middle of the stone.

### What it cost that is not code

- **The runtime palette, for this zone.** Every other pixel takes its ink from a
  CSS property at draw time, which is what makes a zone recolour for free. A
  painted tileset is baked hex. Four zones will be four generated sets, not one
  set with four palettes.
- **A little rock.** `fitCorners` opens about 40 cells in 2700, so Fissure maps
  are marginally more open than they were. It only ever opens, so nothing can be
  walled off.
- **One demo check, which was underpowered rather than wrong.** A Bleed on every
  hit is worth about 1% of a clear and the check sampled five seeds: at five it
  reads 0.3% the WRONG way, at twelve 0.5% right, at twenty-four 1.0%. Moving
  the carve reshuffled which five maps those were. It measures 24 now.

### What the deleted work found, kept because it is about the LOOK

The two-tile wall, the lightmap, the chasms and every drop rule were deleted at
the user's instruction (`83b8488`). These outlived them:

- **A per-tile tint is a BAND, never a gradient**, and every falloff one can
  express is a staircase of flat rectangles.
- **A drop needs the wall tile placed ONE ROW LOWER than it is keyed** — the
  same picture that reads as a wall standing up under rock reads as a wall going
  down under ground, and a pit's flanks are that tile turned a quarter. If
  chasms come back, that is how, and it is written up at `56d599a`.
- **Uniform density is NOISE; texture is density that VARIES.** `COVER_RATE` is
  indexed by distance from the rock, which is what makes debris drift at a
  wall's foot rather than read as confetti.
- **Nothing a PERSON left is scattered.** A room's worth of objects dropped one
  tile at a time reads as exactly that at any rate.

### The process, as it now stands

**This is the part to duplicate, and it is written to be executed by a session
that remembers none of this.** Run end to end three times now — a zone, a
throwaway body, and the three skeletons that ship. Every step is a row in a file
rather than a change to code.

**The order is DESIGN → APPROVE → ROTATE → ANIMATE → JUDGE → IMPORT → WIRE, and
the order is the whole trick.** A design is one generation and thirty seconds; a
rotation is two; a full body is thirty. Judging AFTER the rotation — which is
how the first four bodies were made — means a body nobody likes costs thirty
instead of one. Three things settle at the design step and NOWHERE else: the
silhouette, the proportions, and the tone.

**Two files hold a body and neither is code.** `tools/art/bodies.json` is what
to SAY — `look` is the design ask, `states[].say` is one animation ask each —
and `tools/art/generated.json` is what came BACK, one row per body naming its
character and a group per state. `tools/art/body.mts` walks between them.

#### 0. Before anything

`PIXELLAB_API_KEY` must be set; `.mcp.json` expands it and `tools/art/mcp.mts`
speaks plain JSON-RPC to `https://api.pixellab.ai/mcp`, so a session with no MCP
client for it is not blocked. **Read `https://api.pixellab.ai/mcp/docs` first.**
Two sessions in a row have failed by not reading it, and both failures were
parameters sitting in plain sight. `get_balance` prints what is left.

#### 1. Write the ask into `bodies.json`

Off the game's OWN documentation: `MAP_THEMES` gives a zone its line, `THEME_INK`
its hexes, `CUT` how it is carved, `MONSTER_FAMILIES` what lives there. A generic
prompt gives generic art; the Fissure's own sentence gives the Fissure.

- **Name a colour by EXCLUSION as well as by name**, and exclude the whole
  family: "dark bone" got ivory until `NOT tan, NOT beige, NOT sand, NOT gold,
  NOT amber, NOT bronze, NOT warm` went in. But exclude only what you mean —
  `NOT red` killed the blood entirely, where `NOT bright red, NOT pink, NOT
  crimson, NOT magenta` left the dried rust-brown that was wanted.
- **Forbid the GROUND and any second object by name.** Bodies drew themselves a
  dirt patch, a blood pool and a spare skull. Say: no ground, no floor, no
  shadow cast on the ground, no base, no platform, no other objects.
- **Say the proportions.** "SMALL skull on a long thin neck, the proportions of
  a tall adult man, NOT a big head, NOT chibi, NOT a bobblehead."
- **No two of a body's `say` strings may share their first 30 characters** — see
  the pitfalls below. `body.mts` refuses the file if any do.

#### 2. DESIGN — one image, one generation, ~30 seconds

`create_image_pixflux` with `no_background: true`, `view: 'high top-down'`,
`direction: 'south'`, `width`/`height` 128, `text_guidance_scale: 12`. Ask for
several concepts at once and several variants of each; they are a generation
apiece.

**`color_image_url` takes a forced palette as an image and a `data:` URI is
accepted.** It is the ONLY thing that made a body dark — words alone returned
ivory twice, and v3 ignores `text_guidance_scale` so there is no harder push.
Build a strip of the inks you want and pass it. Every zone floor is pale by
decision, so a body that is not dark separates from none of them.

The palette buys tone and costs some drama: the same ask on words alone had a
better pose and the wrong colour. Judge both.

#### 3. APPROVE

Put the candidates on the four real zone floors, magnified. `npm run peek` is
for a map; for a sprite, lift a floor tile out of
`src/render/generated-tiles.ts` (the tile whose `key` is 0 is pure floor) and
put the sprite on it. **Nothing below this line is cheap, so nothing below it
starts until a human has said yes.**

#### 4. ROTATE — two generations, ~5 minutes

`create_character` with `mode: 'v3'` and the approved PNG as
`reference_image_base64`, `size: 96`, `view: 'high top-down'`.

- **`mode` decides the body.** `standard` is the default and is template-based:
  ONE rigged skeleton posed over and over, so every body it draws shares a
  silhouette whatever the words say. That is why three asks came back as one
  skeleton in three colours.
- **`size: 96` and not the design's 128.** 96 is the grid a body ships at and
  the camera lands one in ~87 device pixels; at 128 every animation costs TWO
  generations per direction instead of one, for detail nothing draws.
- Look at the five facings before going on. Height and identity survived the
  rotation here, but that is not a promise.

#### 5. ANIMATE — five generations a state, ~3 minutes each

`npx tsx tools/art/body.mts fill <sprite>` once `generated.json` names the
character. It asks ONE facing at a time into the same animation group, paced off
`list_jobs`, and retries a refusal.

- **`mode: 'v3'` from a written pose, never a template animation.** Templates
  pose a rigged skeleton and drift: `walk` grows a crook, `cross-punch` turns to
  face the camera. v3 is the only mode with `frame_count`.
- **"in strict side profile" is the highest-value phrase there is** — without it
  the skull turns to face the camera by frame three. It may NOT open the
  sentence; see the pitfalls.
- **Describe the LIMBS, not the tool.** Naming a weapon the rotation does not
  hold draws a different one every frame.
- **Short animations drift less.** `frame_count: 4` lands usable where 6 needs a
  window.
- **Five facings, not eight.** `GeneratedArt.dirs` runs north to south and the
  renderer mirrors anything facing left. Generating the western three is paying
  twice for the same pixels.

#### 6. JUDGE — free

`body.mts sheet <sprite> out.png` draws every animation, one row each, and LOOK
at it. A generation degrades across its run and the tail is where it goes, so
each state names `from`/`to` — the fraction worth keeping — in
`generated.json`. This is hand-work and there is no way round it.

#### 7. IMPORT — free

`npx tsx tools/art/tables.mts bodies` reads `generated.json`, fetches the
frames, quantises each body to its own 56-ink palette and writes
`src/render/generated-art.ts`. It asks the generator for no generations.

**Name the table.** `tables.mts` with no argument writes all three, and one dead
row then stops the other two being written at all.

#### 8. WIRE — free

A row in `MONSTERS` in `src/data.ts` naming the sprite, at `scale` 1.45–1.6
rather than the doll's 1 — a generated body spans about 69% of its grid where
the doll spans nearly all of 24. Then `npm run demo`, which holds that every
monster resolves in exactly one art table, that no frame ships unreached, and
that a swing and a cast draw different runs. Then `npm run build` and
`npm run peek` and look at it in a descent.

### Doing this a thousand times

**The pitfalls that cost real time here, in the order they will bite.**

- **THE SOURCE SIZE IS THE WALL, not the generation budget.** Three bodies are
  **2.63 MB** of `generated-art.ts` — 270 frames at grid 96, about **0.9 MB per
  body**. It gzips 19:1 so the wire is fine, but the REPO carries the raw
  megabytes and `docs/app.js` is committed because Cloudflare runs no build. At
  4,000 generations remaining the budget buys ~130 bodies; at 0.9 MB each that
  is 120 MB of TypeScript, which is not shippable. **Twelve more bodies — the
  Demonic and Prismatic pools — is about 10 MB and is probably the practical
  ceiling for the format as it stands.** Past that it is a decision: fewer
  states, fewer frames per state, a smaller grid, or giving up "no binary
  assets", which is a `RULES.md` change and the user's call. Do not walk into
  it by accident.
- **The job limit is TEN, per ACCOUNT, and a call needs one slot per DIRECTION
  all at once.** A five-facing ask needs five free slots and is refused whole.
  Pacing off one character's pending count works until a second body is in
  flight and then fails constantly. `list_jobs` is the only authoritative
  count. Ask one facing at a time.
- **A refusal is TEXT, not an error.** `error: need 5 job slots but only 1
  available (9/10 used)` and `already queued or complete (nothing re-queued)`
  both come back as a normal tool result. Anything that does not check the
  response for a group id is recording a lie — nine animations vanished that
  way in one run and were only found by counting groups afterwards.
- **`animate_character` dedupes on the FIRST ~30 CHARACTERS of the action
  description.** The group carries `[type=custom-<the first 30 chars>]`. Every
  attack, cast and death opened with "staying in strict side profile" and
  collapsed into one. Keep the phrase, put it after a clause of the animation's
  own, and assert the prefixes are distinct before firing.
- **A generated CHARACTER is not permanent.** The docs say characters are stored
  permanently. The skeleton, the revenant, the delver and every generated PROP
  this repo shipped all came back `not found`. What ships is the converted grid,
  so no art was lost — that is the argument for the conversion step — but
  nothing on the server can be re-converted or extended, and a body you may want
  to add a state to later must be finished while it still exists.
- **The wall clock is the budget, not the generations.** A body is ~30
  generations and most of an hour: animations are 2-4 minutes each and pace
  against the job limit. Twelve bodies is a day of waiting, not an afternoon.
  Queue in the background, hold the ledger on disk, and make every step
  idempotent — a run WILL be interrupted.
- **Keep a ledger of every id, on disk, as you go.** Character ids, group ids,
  job ids. A body whose character id is lost is a body that has to be paid for
  again.
- **The demo is the backstop and it is not optional.** It fails a frame that
  ships unreached, a sprite id in both art tables, a state named for a skill
  nothing throws, and a body still being moved by a transform it has frames
  for. Every one of those is a silent fault in the renderer otherwise.

**What asking for a REAL zone taught, on the second pass.** The first tileset
was a generic mine shaft; the second was written off the Fissure's own line in
`MAP_THEMES` — "a working somebody gave up on. Rotted props, webs, a candle
still going" — plus its `THEME_INK` hexes and its `dug` cut. That is the ask
that worked, and these are what it cost:

- **Naming a hex does not get you the hex, but naming what it is NOT does.**
  "Cold desaturated grey-brown around #4F4941" came back olive-khaki. Adding
  "NOT olive, NOT khaki, NOT yellow, NOT green, NOT sandy brown" is what
  actually moved it. Describe the colour by exclusion as well as by number.
- **`mode: 'pro'` with `raggedness` is what makes rock look DUG.** The standard
  pipeline draws coursed masonry whatever the prompt says, which is a wall
  somebody BUILT — the opposite of what `CUT` means by `dug`. Pro at
  `raggedness: 0.85` gives broken irregular stone and a real cut face.
- **A `transition` becomes a bright RIM if you let it.** "Pale rock dust banked
  at the foot" was drawn as a white hairline round every rock, which reads as a
  UI stroke rather than as stone. `outline: 'lineless'` does not stop it — the
  rim is the transition. Ask for the boundary as a shadow, or set
  `transition_size: 0`.
- **Props do NOT inherit the style you hand them.** `create_map_object` takes a
  `background_image` for style matching and all six still came back warmer and
  more 3/4-projected than the top-down floor under them. `background_image` and
  `inpainting` are both JSON **strings**, not objects — passing an object is a
  validation error, and that is not in the schema's own types.
- **Six objects at once is a rate limit.** ~15-30s each and roughly five in
  flight; the sixth came back `rate limit exceeded` with a hint to wait.

**What asking for real ANIMATION taught, on the third pass.**

- **A template animation is a lurch; `mode: 'v3'` with an `action_description`
  is an animation.** The templates pose a rigged skeleton and drift: `walk`
  grows a crook, `cross-punch` turns to face the camera, `fireball` flickers a
  shield in and out. v3 from a written pose does none of that, costs 2–3
  generations rather than 1, and is the only mode with `frame_count`.
- **Naming a weapon the rotation does not HOLD invents a different one per
  frame.** Asking a bare skeleton to "raise a pick overhead" drew a floating
  crescent in two places at once. Describe the limbs, not the tool.
- **"Staying in strict side profile" is worth saying out loud.** Every ask
  without it turned the skull to face the camera by frame three, which reads as
  the body rotating mid-swing. It is the single highest-value phrase found.
- **Short animations drift less.** The degradation is at the TAIL, so
  `frame_count: 4` lands usable where 6 needs a window.
- **The ten-job limit is per ACCOUNT, not per character, and a call needs one
  slot PER DIRECTION all at once.** Pacing off one body's pending count fires
  straight into it the moment a second body is in flight — which is what
  refused five animations here, in text rather than as an error. `list_jobs` is
  the authoritative count, and `body.mts fill` asks for ONE facing at a time
  into the same group: the pipe stays full and a refusal costs one facing
  instead of five.
- **A generated CHARACTER is NOT permanent.** The docs say characters are
  stored permanently; the skeleton, revenant and delver this repo shipped all
  came back `not found`, along with every generated PROP. The converted grid is
  what ships so no art was lost — but nothing on the server can be re-converted
  or extended, which is the argument for the conversion step rather than an
  argument against it. `tables.mts` writes one table at a time now.
- **`animate_character` dedupes on the first ~30 CHARACTERS of the action
  description**, not on the whole of it: the group carries `[type=custom-<the
  first 30 chars>]` and a second ask matching that prefix is refused with a hint
  rather than an error, which reads as success. Nine of nineteen animations
  vanished in one run because every attack, cast and death opened with "staying
  in strict side profile" — the highest-value phrase there is. Keep it, put it
  AFTER a clause of the animation's own, and assert the prefixes are distinct
  before firing.
- **`delete_animation` keys on the TYPE, not the display name**, so a re-roll
  under the same name leaves two groups standing. `sandbox.json` therefore
  names a group by UUID; a name picks whichever the server listed first.
- **A GARMENT is the first thing a tail loses.** The revenant's cape vanishes
  entirely by the last frames of its walk and its fire bolt, leaving a bare
  skeleton — so a body whose silhouette IS a piece of cloth wants a tighter
  window than a bare one.
- **`fill` is not idempotent unless it is made to be.** The rate limit answers
  with a hint rather than an error, so a fan-out routinely lands some facings
  and not others — and a re-run is refused, because the dedup is on the
  DESCRIPTION and ignores which directions are actually stored. `body.mts fill`
  now reads back which facings each group holds, asks only for the rest, and
  re-asks with the description punctuated differently when it is refused.

**What was paid for in this session and is not guessable.**

- **`makeSheet` drew a fixed three frames per sprite.** Every index past the
  second fell through `frames[frame] ?? frames[0]` to the standing pose, so a
  generated body's swing and cast NEVER drew — what looked like an attack was
  `drawEntity`'s lunge transform with nothing behind it. It is `framesOf` now,
  and the demo holds that nothing asks for a frame past the ones drawn.
- **A generated body is drawn at its OWN grid, not `CELL`.** The camera lands
  one in about 87 device pixels, so 256 was already downsampled before anybody
  saw it — and at five facings it is a canvas per frame at four bytes a pixel.
  `GRID` is 96 for the same reason. Pixi scales by the texture's own width.
- **The walk cycle was read off the CLOCK, so the feet skated.** At a fixed
  frame rate a body covers two tiles a stride, and what that reads as is
  moving too fast — the speed itself was fine. `Entity.walked` is ground
  covered and `STRIDE` is tiles per frame, so a run is a run and a walk is a
  walk out of one number.
- **The lunge and the bob are TRANSFORMS standing in for frames.** Over a body
  that has its own swing they are a second motion fighting the first, which is
  exactly the shove-the-model-forward look. `animates` asks whether there are
  frames for what the body is doing, and the demo fails a generated body that
  is still being moved by one.
- **The wire cost of facings is small and the SOURCE cost is not.** Ninety
  frames is 980KB of strings that gzip to 80KB. The repo carries the 980KB.
- **A Wang set is ONE picture per corner combination**, so an open floor is
  that picture in every cell and reads as graph paper. Two things fix it and
  neither invents geometry: turning and mirroring the two UNIFORM masks, which
  carry no direction (no other mask may — rotating one makes a tile for a
  DIFFERENT mask), and ALTERNATES off more sets of the same terrain, chained
  on `lower_base_tile_id`.
- **Chaining does NOT make two sets match.** Off one base tile they still came
  back 16 and 5 points apart in mean brightness, and mixed per cell that reads
  as a checkerboard — worse than the repetition. `tone`/`retoned` in
  `sandbox.mts` move each alternate onto the first set's mean AND spread per
  channel, which is what makes three sets read as one floor.
- **`create_topdown_tileset` does not take the same enum values `art.mts`
  uses.** `outline` is `single color outline` (not `single color black
  outline`) and `detail` is `highly detailed` (not `high detail`).
- **`view: 'high top-down'` does not get you top-down.** It is the DEFAULT for
  `create_map_object` and every prop still came back 3/4-projected, reading as
  furniture from a different game standing on the floor. Saying "seen from
  DIRECTLY ABOVE looking straight down" in the description is what moved it,
  and it is worth saying in capitals.
- **A prop lands warmer and more saturated than the stone whatever the ask
  says.** `PropSpec.tone` pulls it toward the ground's own mean and spread —
  0.4 by default, which settles it into the scene, and 0.1 for the candle,
  because a flame pulled to grey stops being one.
- **The NOUN is the prior, and it fights you.** "altar" draws a tidy ziggurat,
  "ritual circle" a stone medallion, "a dead miner" a modern man in denim and a
  hard hat. Describing the SHAPE and the MATERIAL and naming nothing — "one
  slab laid flat across two boulders" — is what got the thing asked for. The
  sigil never came, over three passes, and was dropped.
- **"Blood" comes back BRIGHT PINK** however dark the words are, until the
  exclusions name the colour: NOT red, NOT pink, NOT crimson, NOT magenta.
- **`transition_size` past 0.25 is a different tileset**, not a deeper one: 25
  tiles, a third corner value, and a cliff that spans two rows. Worth it — the
  face was a seventh of a tile and read as a kerb — but three sets each traded
  the floor's quality for the wall's.
- **The set's own shadow tile is a flat rectangle**, and a run of them along a
  wall reads as paving laid at the foot of it. Darkening it in the importer
  made it worse, not better: a blacker rectangle is still a rectangle. It is
  not drawn at all now (`wangShadow`), and the wall's shadow is one row of
  floor tint. Which killed `tileset.shade`, `darkened` and `isShadowRow`.
- **The light had to stop being a TINT.** Every falloff a per-tile tint can
  express is a staircase of flat rectangles, and against a ragged room edge
  that is a field of grey boxes — which is exactly what it looked like.
  `lightMap` writes one texel per lattice corner and lets the GPU interpolate;
  the wall's shadow then costs nothing, being the rock's own dark bleeding half
  a tile onto the floor. A texel is a colour, so `GLOW_PROPS` fell out of it
  for free: a torch warms its corner of the room.
- **The corner mismatches were a FALLBACK, not a missing tile.** A generated
  set answers 21 of the 81 keys and the old fallback read the cut face as floor
  and then as rock, which for two of them landed on plain ground — a bare
  square between two cliffs. Scoring every key the set holds, with the cut face
  one step from either terrain and floor three from rock, fixed it without a
  generation.
- **A drop-off is the ground STOPPING, and everything soft ruins it.** Three
  goes: the lightmap blurred the edge into a shadow, then skipping the void's
  tile made a black square, and what works is drawing the tile from the same
  set and fading it — the tile IS the interlocking edge. A void also has to
  take no part in the light's blend or the floor fades out at its own rim.
- **Uniform density is NOISE, and it took three rounds to see it.** Cover at
  one rate over every tile is confetti; the fix is the SAME fix as the tile
  repetition, arrived at from the other side — the density has to vary. Indexed
  by distance from the rock it drifts at a wall's foot and leaves the open
  floor nearly bare, and that bare floor is what lets anything else read.
- **A room's worth of objects dropped one tile at a time reads as exactly
  that.** Two rounds of tuning a fringe-and-open-floor scatter, and it was
  never going to work at any rate. It is deleted. Scattering is for what the
  ROCK does; what a person left is an arrangement or is placed by hand.
- **A tile set's repetition is answered UNDER it, not by it.** Light helps and
  a second set does not, but what actually kills the pattern is a scatter of
  loose stone over the whole floor, drawn as one pass beneath the furniture.
  Each scrap shifted off its own colour and size, or the scatter is the graph
  paper again at a different scale.
- **A generated prop is POLISHED** — specular highlights, hard contrast — and
  at half a tile that reads as plastic rather than as stone. `tone` toward the
  ground's spread plus `dull` toward its own luma is what settles one.
- **Asking for a random scatter gets a GRID.** "A dozen chips spread apart"
  came back as a tidy 4x4 lattice. It took NOT a grid, NOT rows, NOT columns,
  NOT evenly spaced, NOT a pattern — and saying the scatter is UNEVEN and MESSY
  in as many words.
- **A corner Wang set cannot draw stone one cell thick.** A corner is rock only
  where four cells round it are, so a one-cell finger has no rock corner in it
  anywhere and comes out as cut faces with nothing between them — the wall
  melting into the floor. It is a GEOMETRY fix, not a tile one: `thinRock` cuts
  that rock back after every carve. Nothing in a set can answer it.
- **A wall has to be TALLER than one tile.** A generated set draws its cut
  face one tile high; a body is rendered at one and a half, so the wall read as
  a kerb and every prop looked oversized against it. The fix is in the drawing
  rather than in the set — the bottom row of a wall run is stretched up over
  the rock behind it, which is a surface nobody stands on.
- **An id in BOTH prop tables is drawn twice.** `bones` is in `PROPS` (the
  ossuary's, hand-drawn) and in `PROP_ART` (the sandbox's, generated), and the
  hand-drawn pass was still running over a generated map — a pale rectangle
  across every bone pile that could not be found in the art, because it was
  not in the art.
- **Every remaining tileset problem was answered with LIGHT.** The stone came
  lighter than the floor and read as masonry; the floor was one picture over
  the whole map. `ROCK_TOP` / `ROCK_REACH` / `GRAIN` in `pixi.ts` — a lit rim
  over dark and smooth value noise across the floor. Cheaper than any
  generation, and it fixed what four sets could not.
- **A per-tile tint is a BAND, not a gradient.** Three tiles of falloff along
  an irregular room edge is a chequerboard of flat rectangles — the exact
  fault the alternates and the rotation were rejected for, arrived at from the
  other direction.
- **A wide floor STAIN cannot be generated.** `pool` and `circle` came back as
  discs — round, centred, edged, an object lying on the ground — through every
  wording tried, at two sizes. Three small stains on touching tiles make an
  outline nobody drew, which is what `butchery` is.
- **A body lying FLAT cannot be generated either.** Three passes at `husk`,
  each one a figure standing up and facing the viewer, whatever "lying FLAT on
  its front, seen from DIRECTLY ABOVE, the soles of both feet showing" says.
  Dropped; `cocoon`, `ribs`, `bones` and `skulls` carry the dead.
- **The small props are where the noun fights hardest.** At 96px a chip
  scatter came back as one round pile, a rock stub as a teal crystal, a
  ribcage as a magenta centipede, mould as red-and-white toadstools on grass.
  A SMALLER canvas (64) plus exclusions naming the colour got three of the
  four; the fourth took abandoning the noun entirely — "a crust clinging FLAT
  to stone" rather than any kind of mushroom.
- **Naming a thing gets you ONE of it.** "a scatter of bones" came back as a
  single large skull and "a sheet of cobweb" as a square of cloth. Saying what
  it is NOT, and saying "spread apart with gaps between them / the floor
  visible THROUGH it", is what produced a scatter and a web.

- **An export's colours are not a PALETTE.** Three frames of one body arrive
  with 87–124 distinct RGB values, past the 88 characters a row can use. So a
  generated body is QUANTISED to a palette of its own — the commonest 56, with
  everything else snapped by redmean — rather than to the hand-drawn five.
  `Inks` in `sandbox.mts` is two passes for exactly this.
- **Frames of one body arrive at two canvas sizes.** A template animation comes
  back on the character's own 128 and a v3 one on a 180, so they are centred in
  the larger and then fitted TOGETHER: `fittedTogether` in `convert.mts` takes
  one bounding box over every frame and one transform for all of them. Run per
  frame, `fitted` scales each to fill its own box and the body jitters against
  its own feet on every step.
- **Storage REFUSES the key.** A bearer token on a `backblaze.pixellab.ai` URL
  is a 401. Only `api.pixellab.ai` is told who is asking.
- **Which terrain of a Wang set is the FLOOR is not in the metadata.** The mine
  shaft's `lower_description` says "quarried stone walls" and its `lower` tile
  is the dirt you walk on. The pictures say so and the words do not, so it is
  an argument to `sandbox.mts` and what ships always means "set bit = floor".
- **Three tools now write `src/render/generated-art.ts`** — `sandbox.mts`,
  `import.mts` and `art.mts emit`. `sandbox.mts` is the one to use; the other
  two predate it and will happily overwrite its quantised key with their own.

**What is NOT true any more.** `RULES.md` said `CELL = 48`; it has been 256
since generated art landed, and `drawPixels` samples per DESTINATION pixel, so
the art grid does not have to divide the cell at all. Both are fixed there now.

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

### Phase 1 — An older, dimmer floor under the Fissure

**Asked for directly.** *"Go ahead and recolor the floor, try and make it a
little less bright, make it a little more like ancient cavern vibes."*

**What is true today.** The Fissure draws `lit_round`, a 25-tile generated Wang
set shipped whole as a data URI in `src/render/generated-tiles.ts` and written
by `tools/art/zoneset.mts emit`. It is BAKED HEX — every other pixel in the game
takes its ink from a CSS property at draw time, and a generated surface is what
gave that up. Its ask is `CAVE` in `zoneset.mts`, a pale rock-dust floor under
near-black broken stone.

**Why it is wrong.** The floor is bright enough to read as sand rather than as
stone somebody stopped working, and the Fissure's own line in `MAP_THEMES` is a
working somebody gave up on.

- [ ] **Do it as a colour pass at EMIT, not as a generation.** `zoneset.mts
      emit` already reads `tools/art/cache/zones/<name>.png` and base64s it; the
      change is a pass over those pixels before the encode, so re-colouring is
      free and repeatable and nothing is asked of the generator. **The cached
      PNG may not survive the container** — the durable copy of that sheet is
      the data URI already in `generated-tiles.ts`, so read it back out of there
      if the cache is gone.
- [ ] **Shift the sheet GLOBALLY, never per tile.** Floor and rock are one
      image and tiles interlock at their edges; two tiles shifted differently is
      the checkerboard that every mixing experiment in this file already failed
      on. Darkening plus a pull off saturation toward the zone's own
      grey-brown is the shape of it — an old cavern is dim and desaturated, not
      a hue swap.
- [ ] **The TONE RULE outranks the ask.** A LIGHT floor under near-black rock,
      said at both ends. `cavern_lit` is the measured counter-example sitting
      beside the shipping set: asked pale-rock-over-dark-floor, it reads INSIDE
      OUT, the pale expanse taking the eye as ground and the room reading as a
      hole punched in it. So the floor may get dimmer and older; it may not
      approach the rock, and if the pass takes it there the pass has gone too
      far.
- [ ] **The bodies are the other end of it.** All three skeletons are asked
      near-black because every zone floor is pale by decision. A floor taken
      far enough down costs them their silhouette, so judge the floor with
      monsters standing on it — which is what `npm run peek` is.
- [ ] **Only the Fissure.** The other three sets are not in the ask and each
      was toned off its own zone's line.

**Traps.**

- **`docs/app.js` is committed and carries the sheet.** A re-emit changes a
  data URI inside the bundle, so `npm run build` is not optional and the diff
  will be large and unreadable. That is expected.
- **`generated-tiles.ts` says "Do not edit by hand" and means it.** The pass
  belongs in `zoneset.mts` so the next re-emit does not undo it.
- **Props are toned to the ground they stand on.** `PropSpec.tone` pulls a
  generated prop toward the ground's mean and spread, and those were computed
  against the CURRENT floor. Moving the floor moves what the cover reads as, so
  look at the loose stone after the shift, not just the tiles.
- **`canvas2d` is untouched** — it has no sprites and keeps its drawn rock. It
  is the fallback and has always looked different.

**Done when.** The Fissure floor reads dimmer and older in a live descent, the
rock is still unmistakably darker than it, the three skeletons still separate
from it, and the pass that did it is a function in `zoneset.mts` rather than an
edited data URI.

**What must not break, in order.** `comments`, `typecheck`, `build`, `peek`,
`shots`.

### Phase 2 — Six Normal monsters, all of them the skeletons' kind

**The ask CHANGED, and it got much smaller.** *The user's words: "Have it just
be the normal mobs, but cut some of the medium sized ones out so there's only 6
mobs total (keeping the three skeletons we just made with good art obviously),
and then make sure they are all based around the art created with the skeletons.
That sort of vibe."* So the Demonic and Prismatic pools are OUT of this phase
entirely — twelve bodies and a day of wall clock became three bodies and a cut.

**What is true today.** The Normal pool is **11** rows in `MONSTERS`, three of
them generated:

| id | sprite | art | weight | what it is |
|---|---|---|---|---|
| `grub` | `grub` | drawn | 1000 | the commonest thing in the pool |
| `husk` | `hewer` | **generated** | 800 | the mine skeleton with the tool |
| `sparkmite` | `sparkmite` | drawn | 700 | tiny, elemental |
| `stalker` | `stalker` | drawn | 600 | fast, weak, beast |
| `cinder_hound` | `cinder_hound` | drawn | 520 | beast |
| `shale_crawler` | `shale_crawler` | drawn | 480 | beast, tough |
| `gale_wisp` | `gale_wisp` | drawn | 420 | elemental |
| `rime_crab` | `rime_crab` | drawn | 340 | beast, tough |
| `gaunt` | `gaunt` | **generated** | 300 | the tall one |
| `bonecaller` | `shroud` | **generated** | 300 | robed, throws |
| `brute` | `brute` | drawn | 260 | humanoid, the heavy |

**Why it is wrong.** Eight hand-drawn creatures at grid 24 standing beside three
generated bodies at grid 96 is two art eras in one pack, and it is the mismatch
the ground stopped having when every zone got a set.

**Read "The process, as it now stands" and "Doing this a thousand times" above
before spending anything.** Both are written for a session with no memory of
this one, and the second is the list of what has already cost time.

- [ ] **Six rows in the Normal pool, and the three skeletons are three of
      them.** The other eight are cut from `MONSTERS`.
- [ ] **Three new GENERATED bodies, in the skeletons' register** — near-black
      bone, dried gore, `undead`, told apart by SILHOUETTE the way the first
      three are. That is what "that sort of vibe" is, and the asks already in
      `tools/art/bodies.json` are the reference for how to say it.
- [ ] **Choose the three by ROLE, not by which drawn monster is liked.** The
      skeletons cover a common melee (Husk), reach (Gaunt) and a thrower
      (Bonecaller). What the pool loses with the eight is a SWARM — `grub` at
      weight 1000 is the commonest thing a player meets — something FAST
      (`stalker`), and a HEAVY (`brute`, `rime_crab`). Those are the three
      silhouettes to design: small and many, quick, and big and slow.
- [ ] **Redistribute the weights so the pool still has a common one.** Six rows
      sharing 11 rows' worth of weight is not a rescale — decide what a player
      meets most and say so.
- [ ] **The hand-drawn grids STAY in `BEASTIARY`.** A cut monster is a row
      removed from `MONSTERS`, not art deleted: `SPRITE_KINDS` sweeps that
      table, the renderers name `grub`, `stalker` and `brute` directly
      (`canvas2d`'s fallback radius, `renderer.ts`'s colour cases, pixi's
      warm-up texture) and the demo asks `framesOf('grub')`. Deleting the art
      is a second phase and nobody asked for one.
- [ ] **Watch the SOURCE SIZE.** Three bodies are 2.63 MB of
      `generated-art.ts`; three more is about 5.3 MB, plus a committed
      `docs/app.js` carrying the same. Measure it and say the number — the
      practical ceiling for "every sprite is a list of strings" is somewhere
      near 10 MB and going past it is a `RULES.md` decision, not a phase.

**Traps.**

- **A sprite id may be in ONE table.** `monsterArt` asks `BEASTIARY` before
  `GENERATED`, so an id in both is a generated body that never draws, silently
  — it cost a whole session's judgement once. Do not name a new body `grub`.
- **A generated body wants `scale` 1.45–1.6, not the doll's 1**, and the demo
  fails a fought generated monster under 1.3. A SWARM body is the awkward one:
  it has to read small, and the way to do that is its own `scale` and `radius`
  rather than leaving it at the doll's.
- **The boss reinforces `from: 'husk'`** (`BOSSES` in `src/data.ts`). That
  survives this phase, but anything cut is worth grepping for the same shape.
- **`MONSTER_ABILITIES` is rolled per PACK off the run's rng and is not keyed
  by monster**, so cutting rows does not touch what a pack throws. The demo's
  danger and ladder measurements DO move, because the pool's composition
  changes what a band fights — measure it, print it, carry on. Balance is not
  tuned.
- **The demo's `THE SANDBOX` section is gone and this phase still owes what it
  was for.** What survived is table-level: every frame that ships is reached, a
  swing and a cast draw different runs, each thrown skill has its own
  animation, no transform stands in for a frame. What went with the room is the
  check that DROVE a body — every facing SEEN in a live sim, a caster actually
  casting. A generated body in a descent is where that comes back.

**Done when.** `MONSTERS` holds six Normal rows, every one of them a generated
body in the skeletons' register, and a Fissure descent reads as one art era.

**What is NOT in this phase.** The Demonic and Prismatic pools, which are
twelve hand-drawn bodies and are now nobody's phase — they are the backlog until
asked for. And a body GENERATED to be imposing: the Gaunt is drawn at 3.2 and
towers, but it is still the same 96-grid body scaled up, so what a purpose-built
giant would buy is detail rather than height.

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

8. **ANSWERED at both ends.** *The user's call, in their words: "Just use the
   pixellab pipeline to generate a zone that looks good... I literally don't
   care what it looks like as long as it looks good", then "put this map into
   the main game to replace the base fissure".* Generated art ships: all four
   zones are generated tilesets and three monsters are generated bodies.
   The second half — whether to re-ink a generated body onto CSS properties to
   buy the runtime palette back — is answered NO, and by the art rather than by
   code. A body asked DARK through a forced palette separates from all four zone
   floors, because every one of them is pale by decision. So a generated body
   stays baked hex, is generated once rather than once per zone, and the runtime
   recolour is given up for bodies alone. Ranks are still light applied at
   runtime and still work.

9. **Do the chasms come back?** The whole drop system — `VOID`, ledges, the
   walls hanging into a hole, bridges — was built, judged and deleted at the
   user's instruction along with everything else in `83b8488`. How to draw one
   is written up under "What the deleted work found" and the code is at
   `56d599a`: the wall tile placed one row lower than it is keyed, flanks turned
   a quarter, no near wall. Nothing is blocked on it and it was never asked for
   twice; it is here so nobody rediscovers the geometry.

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

- **NO zone has furniture of its own, and that is now a decision rather than a
  gap.** Every zone draws a generated set and the rock dresses all four — cover
  at the wall's foot, roots on the cut face — and nothing stands on any of those
  floors, because the arrangements were cut at the user's word. `VIGNETTES` and
  `dressRooms` are still in the repo and nothing calls the placer, so bringing
  furniture back to any zone is one call and a table. What per-zone furniture
  would cost on top of that is roughly fifteen `create_map_object` generations a
  zone plus the judging, and a `tone` pass per zone, because a prop is toned
  toward the ground it stands on and these are toned to pale sand. **Do not
  promote this without being asked** — a descent with nothing standing on it is
  what was asked for, and it looked better.
- **`livingDecals` went quiet in three zones, and two of them were made of it.**
  A `bare` map stands the zone's own floor, decals and MOTION down, which cost
  the Fissure nothing (its `motion` is 0.5 and its `density` 0) and costs the
  Rot and the Cavern their stirring surfaces — the whole of what made those two
  read as alive rather than as coloured rock. A generated tileset is a still
  picture and always will be. Whether the motion comes back over a set, as
  animated props or not at all is unanswered; nothing is blocked on it.

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
