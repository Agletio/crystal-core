# Crystal Core — Rules

**Always true. Read this before touching anything.** `ROADMAP.md` is the list of
work; this is the set of things that hold whatever the work is. Nothing in here
is a task — if something here stops being true, it was a mistake, and the fix is
to restore it rather than to update this file. A rule that the user CHANGES gets
rewritten here in the same breath.

Rules with exceptions say so. An exception is written down beside the rule or it
does not exist.

---

## The cycle

One phase at a time, and **no stop between them**. Every pass:

1. **`git fetch` and check you are standing on the tip of the branch.** A
   session's clone is taken when its container starts and the branch moves
   under it — so the `ROADMAP.md` you were handed can list phases that are
   already built, in a file whose own copy is out of date. This has cost a
   whole phase's work once already: it was rebuilt from scratch, tested, and
   thrown away on discovering it had landed hours earlier. `git log --oneline
   -15 origin/<branch>` reads the phases that have landed, and a commit message
   here names what it did in the roadmap's own words. If the local branch is
   behind, reset onto the remote tip and read the roadmap AGAIN before picking
   anything.
2. Read this file, then `ROADMAP.md`. `CLAUDE.md` is loaded for you.
3. Pick the **lowest-numbered phase** in the roadmap that is not blocked on an
   open question, and do the WHOLE of it. Not part.
4. Leave the full suite green: `comments`, `typecheck`, `mods`, `build`,
   `smoke`, `shots`, `guide`. Build before the last three — they load the
   bundle, not the source.
5. Commit and push. Push BEFORE starting the next phase, so the next session
   to fetch sees the work rather than rebuilding it.
6. Update `ROADMAP.md`: delete the phase, renumber the rest, move anything that
   turned out to be wrong into its Open questions, and write down anything the
   next session would otherwise have to rediscover. Update this file if a rule
   changed or a new invariant now holds, and `CLAUDE.md` if the GAME changed —
   between them those two files are the answer to "has this been built already",
   so a phase that lands without them updated is a phase somebody does twice.
7. **Start the next phase immediately.** Same turn, same context, no pause.

**Finishing a phase is not a stopping point.** It is the signal to begin the
next one. Do not end the turn to report what was done, do not ask whether to
carry on, and do not wait to be told to. Say what the phase did in a couple of
lines if it is worth saying, and keep working in the same breath. A pass that
ends with "Phase N is complete — shall I continue?" has broken this rule.

Exactly three things end a session, and none of them is a finished phase:

- **The roadmap holds nothing but questions.** Say so and list them. Do not
  invent work to fill the gap, and do not promote something out of the backlog
  without being asked.
- **A question needs answering** — see below.
- **The context runs out.** That is the harness's call, not a decision.

**Ask in a plain message, never through the multiple-choice popup tool.** It is
not always being watched and it times out, which loses the question. Write it in
the reply, stop, and wait. Once it is answered, carry on without stopping again
— pausing between phases is not wanted; a question is.


---

## Design decisions

Settled. Do not relitigate without the user saying so.

**The worlds are a ladder, not three equal opponents.** The pools weigh the same
per monster, but Demonic and Prismatic carry auras and Normal does not, so they
are harder — and they pay in currencies Normal does not. Normal keeps its own
reason to exist through drops nothing else has: it is the only world with TWO
uniques of its own, which is the debt that paid.

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
t2 holds 4, t3 holds 6. Item level still decides how good a roll can be. No
ORDINARY currency raises it — you go and find a better base, which is what
makes farming duplicates the thing the gambling currencies are for. The one
exception is `sigil_of_upheaval`, which may add a modifier past the cap and
locks the item for doing it; the demo holds every other currency to the rule.

**Only the adding currency is sold.** Everything else drops. A shop that stocks
the whole bench is a shop that replaces the map.

**Every crystal is handed over in person, at the mouth of a cleared descent.**
The Lampwright climbs out of the hole you would have dropped through, hands the
thing over and walks you out — so a meeting is always the END of a run and
never a hazard inside one. It is granted at the panel rather than paid out by
the report, which is what keeps a gift a gift; and because the run is already
cleared when he appears, that loot is already banked. Nothing about a crystal
arrives as a line in a report.

**A gift is scheduled, never rolled.** What decides whether the Lampwright is
waiting is a condition you can read on a screen — how many descents you have
cleared, a quest you finished — and never a per-descent chance. A player who cannot tell whether the
next crystal is two runs away or twenty has no way to plan the only decision
the game asks them to make.

**Every number is said out loud.** Nothing the player reads may describe a
quantity in words when it has a figure behind it. Never "more damage" — "35%
more damage". Never "another cast" or "an extra cloud" — "+1 cloud". Never "a
third more ground", "hits harder", "grows again". If a line cannot name its
number, the line is describing the wrong thing.

This is about MECHANICS, not about voice. Flavour has no number behind it and is
not covered: the Lampwright says what he sees, a unique's own line is a line
about a dead man, an encounter's herald announces an arrival the kill readout
counts a second later, and none of them is a stat. The test is whether a player
could act differently knowing the figure — if yes, the figure goes in.

**The demo sweeps it**, over every tree node, every currency, every quest and
every aura: a line with no digit in it fails. Three things are deliberately out
of that sweep and must not be "fixed" into it — a conversion node, which
changes WHICH damage type and names no amount; the two currencies that act on
every modifier or on no particular one; and the flavour above. `GRANTS[].what`
is out too, because it describes a switch with no value attached — see below.

**No build's power may depend on the player being present.** This is an idle
game whose every balance number comes from headless runs — the ladder grids,
the quest timings, the termination check. A build that only pays out while
somebody is watching is a build no harness can hold, which makes it a build
nobody can tune. So automation is universal and never a build choice: anything
a player can do mid-descent has a shipped default policy, that policy is what
`runToCompletion` runs, and the two are ONE implementation. The reward for
watching is the small gap between a threshold and a person, and it stays small
on purpose — five or ten percent, not thirty.

Nothing hidden and nothing to aim at, either: a policy can see everything a
player can, so any advantage a player has here is judgement rather than
reflexes. Keep it that way — the day something needs positioning or aiming,
this rule stops holding and the harnesses stop meaning anything.

**The guided opening teaches in bursts and lets go between them.** A step that
cannot be finished right now must never hold the screen: no card following you
about, no lockdown, while what it is waiting for is a level or a drop or a
crystal that has to grow. It teaches a thing, releases, and comes BACK when the
game reaches the next thing worth teaching — triggered by state, not queued in
a chain. Tutorial-popup purgatory is the failure this avoids, and it is why
`TUTORIAL_STEPS` is data with `done` predicates rather than a script: a step
that is already satisfied is skipped, and a step nobody can satisfy yet should
not be on screen at all.

**Balance is deliberately loose.** Lean overpowered — too much currency,
characters too strong. It makes testing faster. Do not spend time tuning what is
about to be replaced.

### Room for a fifth socket

Wanted eventually, still unspecified. Two rules keep it cheap, and both are
already followed — do not undo them:

1. Sockets are a **slot-def list** (`RUN_SLOTS`, mirroring `EQUIP_SLOTS`), never
   four named fields. A slot accepting something other than a crystal is one
   table entry.
2. The family split is derived from **the number of filled crystal sockets**,
   never from the constant 4. Otherwise a fifth socket silently rescales every
   composition in the game.

---

## What the art is made of

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

**Everything is at 24.** All 22 entries in `src/render/bestiary.ts` carry
`grid: 24` and two frames; 21 of them are monsters with an `attack` frame, and
the 22nd is `lampwright`, who is a person rather than a creature and has no
swing. `BeastArt.grid` is per-creature and `DOLL_GRID` is the doll's, and
`wellFormed(frames, grid)` checks each against its own declaration, so a family
can be redrawn without the pipeline caring. Being in `BEASTIARY` does NOT make
something a monster — `MONSTERS` is a separate table, and the demo only asks
that every monster has art, not that every art is a monster.

**A sprite is not a portrait.** Two tables, two grids, two jobs. `BEASTIARY`
is what walks around, at 24, and `beastIcon(id, size)` in `src/ui/icons.ts`
turns one into an inline SVG. `PORTRAITS` in `src/render/portraits.ts` is who is
SPEAKING, at 48, one frame, shoulders-up — `CELL` binds the map's offscreen
canvas and nothing else, so a portrait is free to be bigger than the thing it
stands in for, and the demo insists that it is. `portraitIcon` falls back to
`beastIcon`, so a speaker nobody has drawn yet is a small picture rather than an
empty box. Both read their palette at CALL time, so a colour change reaches
both, and both are held to `wellFormed(rows, grid)` — every row exactly `grid`
wide, trailing dots included.

**The doll's grip is (17, 14)** and every weapon is drawn against that one
point. `POSES` shifts move it: those numbers are absolute whole pixels, so
anything that changes the figure's size changes all of them.

**A zone is CUT differently as well as coloured differently, and NOTHING is
built.** `CUT` in `src/sim/grid.ts` maps each theme to `dug` (the Fissure: the
rectangle with its corners off and its outer ring worried away tile by tile off
`tileNoise`, so no run of edge is straight), `gullet` (corners off, nothing
else) or `grown` (an ellipse inscribed in the rectangle, ragged, with single
pillars left standing). A square corner exists nowhere in the game — do not
reintroduce one. The `Room` RECTANGLE never changes — every spawn, the entrance
and the exit are placed off it — but it is NOT all floor, so anything placing a
body in a room has to check it fits (`RunSim.placeIn`, which retries off its own
rng stream so placement never moves the draws that pick the next monster). Two traps, both paid for once already: an ellipse
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

**`floor.shade` is the dark in every zone; `floor.rock[0]` is not.** The rock
ramp's first entry is `#a96c8f` in the Cavern — pale — so anything that needs
to read as a HOLE and used it vanished into its own floor. `floor.glint` is the
bright in every zone. At one tile across contrast is the only tool: `mouth()`
is a bright rim, a mid ring and a `shade` pit, and the ladder or teeth or
shards inside it are decoration on top of that, not the thing that reads.

**`livingDecals` is the part that moves, and EVERY zone has some** — webs with
something walking them and guttering candles in the Fissure, tendrils and spines
in the Rot, creeping growth and light travelling a facet in the Cavern, both in
the Seam. Drawn every frame from the tile's own hash and the clock, never from
stored state, so both renderers agree and nothing has to be seeded. How much is
`motionDensity`, per zone — a cave with a web on every tile is a web factory.
It hangs off FLOOR tiles rather than the walls it grows from, because a wall's
overhang is painted before the floor under it and vanishes, and never over a
landmark: the two holes are how you read the room. Pixi draws it into a
`propLayer` over the map built once; canvas2d draws it in the same loop as
everything else. Both clip to what is on screen.

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

## What the game is made of

The save, the items, the currencies, the screens and the loop. Same purpose as
the art section: it is the part that saves you reading the code.

**`GameState` is plain data in a localStorage key per SLOT**
(`crystal-core.save.1|2|3`, `JSON.stringify(game)`), and `heal()` in
`src/game/save.ts` runs on every load. Adding a field costs
nothing — a missing key takes its default. Renaming an id costs the player
whatever pointed at it, and nothing else. `SAVE_VERSION` is only bumped when a
save must be REFUSED, which wipes everyone, so it is the last resort. `heal()`
is also where a migration goes: moving items between containers on load is
exactly what it is for.

**Capacity comes from the base's TIER, and nothing else.** `GearBase.tier` is
1, 2 or 3; `BASE_TIER_MODS` is `[2, 4, 6]`; `modCapacity` is the lower of that
and what the slot table declares. `GearBase.slots` says only WHERE a modifier
may go — `slotAllocation` deals the tier's budget over those types, richest
first. A bigger item is a better base, found — the one thing that can put a
modifier past the cap is `sigil_of_upheaval`, through a bonus slot, and it
locks the item for doing it. Item level decides how good a roll can be AND
which bases drop at all, so a drop band's `ilvl` is its ceiling twice over. A
crystal's level is the same idea in one `mod` slot.

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
socketed, UNCAPPED), `sold` (the counter, `SOLD_CAP`), `sockets` and
`shopStock`. Inert means: nothing acts on the item until it is moved into the
dock. `craftId` is a REFERENCE, not a move, and it resolves across the bag, the
collection, the worn slots and the sockets.

**Adding a modal is four places, not one.** The markup in `docs/index.html`;
the Escape chain in `src/web.ts`, which closes the topmost thing and must know
where yours sits in that stack; `guideContext()`'s `top`, which is what lets a
tutorial step point at a button inside it; and `CLOSES` in `src/ui/tutorial.ts`,
which is how `viaHeader` walks a player back OUT of it. Miss either of the last
two and the guided opening rings something a popup is covering, which `npm run
guide` reports as being trapped.

**Three save slots, one of them LIVE.** `crystal-core.slot` remembers which,
`liveSlot()` is the default argument of `saveGame`/`loadGame`/`savedAt`/
`clearSave`, and `startAutosave` reads it every flush — so switching slots is
the entire meaning of "which game is this". A slot is somewhere to KEEP a game,
never somewhere to remember to save one: the live one autosaves exactly as the
single save always did, its row on the Save & Load screen offers no buttons,
and the other two offer **Copy here** and **Load** (or **New game** when
empty). `peekSlot` reads a row's name and level WITHOUT `readSave`, because
looking at a slot may not reserve the item ids inside it, and `copySlot` moves
the stored text itself rather than re-serialising. `lastWritten` is per slot or
a copy is skipped as a no-op. A save written before slots existed is adopted
into slot 1 on the first storage touch, once.

**A new game is a SLOT's action**, which is what stops it being a header button
that wipes the game you are in. The header has Save & Load and the dev kit; the
only thing that erases anything is the slot screen, and it asks first for
anything that overwrites — a copy onto an occupied slot, and every load.

**Adding a container is three places, not one.** The field on `GameState`;
`heal()`, which has to drop entries whose base no longer resolves; and the
demo's "every collection a save can hold items in claims its ids" list, which
walks each one through `readSave` and proves the id counter moved. Miss the
third and a save can hand out an id the next item then reuses.

**Danger only counts what the sim still reads.** `DangerStat.cap` in
`DANGER_STATS` is where a stat saturates — a ward at `DEFENCE.resistanceCap`, a
crit chance at 100, armour at the points where `armourReduction` reaches its own
cap — and `crystalRewards` scores the capped amount. Reward is derived from
danger, so a set stacking four wards of one type is paid for one, and difficulty
and payment cannot drift apart through a ceiling in the sim. A new danger stat
that saturates anywhere needs its `cap` written down with it.

**Uniques are gear that grants.** `UNIQUES` in `src/data.ts` is a table of
`UniqueDef` — a base it is a version of, fixed `stats` rolled once by
`makeUnique`, a `grants` bag out of the same `GRANTS` table the trees use, and a
`gate`. A grant's VALUE has to be the shape the sim reads — `moreVsFull` wants
`{ above, more }` and a bare `1.35` is a switch that does nothing, silently.
`GrantDef.say(value)` is that value in a sentence with its number in it, which
is what a unique's card prints; it returns null for a shape it cannot read, and
the demo fails on that — so the line the card shows and the line the sim acts
on cannot come apart. `what` stays the generic description of the switch, for
the demo and the skills screen, and no player reads it about a specific item. `treeGrants` in `src/sim/stats.ts` merges what is WORN after the tree,
so a unique's switch reaches the sim by the one path a tree's does. The lines
live in `implicits`, and the item declares NO modifier slots — `modCapacity` is
zero and every currency refuses it, `sigil_of_upheaval` included. `plainGear`
excludes them — it is the demo's now that nothing bulk-sells by it, and stays
that way so anything that does again cannot eat one. The demo holds each to
the same rules as a tree node: declared, read by a skill you can pick, and paid for by a
downside on the item. Every world drops something of its own, the Fissure two.

**The deep end is not a band.** Power is clamped at `POWER.max`, so the top drop
band is reached long before danger runs out — the hardest set in the game is
nobody's target, and `deepestSet` in `src/sim/loadout.ts` is the only thing that
builds it. `THE LADDER` measures it against gear a band below the top: it has to
be a wall (a third or less), and it has to still be beatable, or it is a ceiling
rather than a wall. Past the power cap, danger still pays in RARITY, which reads
`payingDanger` directly — that is the whole reason to build it.

**A crystal is never carried.** It is never spent, sold or moved anywhere, so
there is no dock column for it and `carryRoom(game, 'crystal')` is `Infinity`.
`addItem` routes one to `game.crystals` whatever else is full, which is what
makes a gift unable to fail. Two screens read that list: `src/ui/crystals.ts`,
where the collection is compared against four sockets, and the bench's own
crystals column, which is the only route to crafting one.

**A pile is searched by `itemMatches`** in `src/crafting.ts` — the dock and the
haul both filter through it, over the piece's name, its base's name, kind and
family, and every line printed on it. Substring, case-blind, no syntax. What it
does is DRAW fewer things: nothing moves, nothing is consumed, and every count
beside a filtered grid still reads the real container, or a search looks like
it sold your gear. The box is UI state in the module, never on `GameState`.

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

The class is `.rolled`, NOT `.stat`: the character sheet already owns `.stat`
with `justify-content: space-between`, and a rolled line that inherited it
pushed every label to the far edge of the tooltip. One stylesheet, no scoping —
check `docs/index.html` for the name before inventing it.

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

**UI state that must never be saved.** `armed` (the currency waiting to be
pointed, `src/ui/craft.ts`), `selling` (sell mode, `src/ui/shop.ts`), and
`handover` / `banked` / `pending` (the transition, `src/ui/run.ts`). Each one
changes what a CLICK means, and a mode that survived a reload would turn the
first click of a session into something nobody asked for. None of them is in
`GameState` and none of them should be.

**The run loop lives in `src/ui/run.ts`.** `launch()` builds a `RunSim` and
starts ticking; `finish()` banks the report and decides whether another descent
follows (`looping()` is `game.autoRepeat` and not the guided opening); `land()`
is the one terminus every ending arrives at. The sim in `src/sim/` never learns
about presentation — a transition, a panel, a freeze, all of that is the UI
holding off on ticking.

**A freeze is the UI declining to tick.** There is no pause state in the loop
and there is not going to be one. Both of the things that stop a descent work
the same way, and anything that stops one in future should too.

**The camera is the RENDERER's, and gestures are the UI's.** `src/ui/run.ts`
sends what the pointer did — `setZoom(zoom, at)` with a focal point in CSS
pixels from the view's middle, `panBy(dx, dy)` in pixels, `follow()` — and each
renderer converts with the tile size only it knows. Both keep a `looking` focus
in tiles, null while following the hero, clamped to the grid so a long drag
does not bank an offset that takes as many drags to undo. A DRAG unlocks the
follow and nothing else does: zooming while following keeps the hero centred,
because leaning in to look closer must never be the thing that loses them.
`launch()` calls `follow()` — a camera left pointed at a corner of the last
map is a black screen with no obvious way out. The wheel is the only zoom;
there are no buttons and no readout.

**Every key but Escape is a table entry.** `BINDINGS` in `src/data.ts` says
what each one does and what it defaults to, `GameState.keys` overrides by id,
and `src/ui/keys.ts` owns the one listener. Nothing else may read a key
literal — including the hints, which print `keyName(keyFor(...))` so a rebound
key says what it is. Typing is not a shortcut: the listener ignores everything
while an input has focus, or the Find box turns a search into an action.
Escape is the exception and stays in the shell's own chain, because it is
about closing whatever is on top rather than doing anything.

**The handover between descents.** `HANDOVER` seconds where the sim does not
tick at all: the hero drops into the hole at the exit, `#run-fade` goes black
for the moment the map is swapped, and they climb out of the next entrance.
`emerge` (1 standing, 0 underground) is passed to `Renderer.draw` and moves the
hero sprite; the fade hides the swap. `banked` holds the report the drop is
carrying so Abandon mid-drop lands THAT one rather than building a second and
banking the loot twice. The hole itself is a `mouth()` decal on the ENTRANCE
and EXIT tiles, per zone, so both renderers get it.

**Walking out.** A descent does not end where you killed the last thing. The
flood finding nothing reachable puts the hero on a walk to `map.exit`, and three
things hang off that walk: coming within `FINALE_RANGE` triggers the closing
encounter, reaching `AT_EXIT` clears the run, and a route that does not exist is
the same answer as being there already — nothing waits forever. The exit is
drawn by the `mouth()` decal and by nothing else; a marker on the vfx layer
paints over the thing you are fighting.

**The finale comes UP the hole.** `spawnFinale` builds every body at
`map.exit` and queues them in `pending`; `climbOut` releases `EncounterDef.wave`
— `size` at a time, `every` seconds — and `step` runs that clock whether or not
you are winning. `s.totalMonsters` counts the whole encounter the moment it
starts, or the readout ticks down and then climbs again. Twenty bodies on one
tile read as two, which is what the wave shape exists to stop.

**A meeting.** The Lampwright is `RunState.lampwright`, an `Entity` kept
deliberately OUT of `monsters` so nothing in combat can ever see them.
`giftWaiting` in `src/game/crystals.ts` answers what is waiting at the mouth,
read AFTER the report so the level that descent just bought counts.
`RunSim.greetAtExit()` stands them `GREET_STEP` off the hole — beside it, never
in it — and does NOT begin the meeting; `RunSim.walkOut(dt)` is the hero
crossing that last stride, ticked by the frame loop alone (the descent is over,
so `step` would be wrong and the clock the report read has stopped), and
ARRIVING sets `meeting`. `takeHandover` grants everything the meeting holds and
`src/ui/met.ts` draws it; `giftSchedule` is the same answer in words, for the
collection screen. A meeting is a HALT of the idle loop — `halt = 'met'` —
landing on the same report as any other ending, so the clear is banked before
anyone is standing there. `walkToMeeting` is the headless version of the walk,
bounded like `runToCompletion`.

**The Lampwright speaks in FLAVOUR.** `LAMPWRIGHT.first`, `.crystal` and
`.again` in `src/data.ts` describe what he has seen the rock do and name no
screen, no currency and no number. Teaching what to click is the guided
opening's job, and the numbers rule above is about mechanics rather than voice — do
not "fix" his lines by putting figures in them.

**What is owed.** `Waiting` is everything the mouth is holding — a weapon, the
scheduled crystal, and every quest the clear just finished — and `takeHandover`
grants the lot in one panel. `GameState.given` is what has already been handed
over; with `GameState.clears` and `INTRO` it is the whole of the schedule, and
order cannot break it since nothing reads a flag another step of the same
report sets.

**The schedule is counted in cleared descents, never in character levels.**
`GameState.clears` goes up inside `buildReport` on a clear, before anything
reads it, and `giftWaiting` is asked after the report — so the descent that
just finished is one the schedule already knows about. A level would say the
same thing in a number that moves every time the XP curve does. `heal()` reads
the count off an older save's own milestones, once.

- The **weapon**, on the first clear. `STARTER_WEAPON` in `src/data.ts` maps
  `SkillDef.category` to a base and `SkillDef.weapon` overrides it, so it is one
  the chosen skill can swing. `starterWeapon()` resolving to nothing is a demo
  failure rather than a fallback.
- The **first crystal**, on the `INTRO.firstCrystalClear`th cleared descent —
  the second, so one clear teaches wearing and crafting and the next is about
  what a crystal is. It is a LEVEL 2 crystal (`LAMPWRIGHT.level`): level 1 holds
  no modifiers at all, and the meeting is followed by the craft that teaches
  what one does to a room. A Shard of Making comes with it.
- Every **quest** in `CRYSTAL_QUESTS`, which is the other three Normal crystals
  as well as the two other worlds. `CrystalQuest.need` is a list of clauses
  ANDed together; `kind` names an entry in `QUEST_CONDITIONS` in
  `src/game/crystals.ts` and the rest of the clause is that condition's
  parameters — so a new objective is one registry entry and one table row. A
  clause naming a kind that is not in the registry is never met, and the demo
  holds the table to it. The report pays no crystal at all: `buildReport` banks
  loot and levels sockets, and everything given is given at the panel.

**The one arranged roll.** `crystal.meta.scripted` names a mod family;
`scriptedMod` in `src/crafting.ts` is consulted by `add_mod` before the random
pick, takes that family's LAST tier (authored best-first, so the cheapest), and
clears the mark as it fires. On the item rather than the currency, so a Shard of
Making behaves identically everywhere else. `heal()` drops the mark from a
crystal that already carries a modifier.

---

## Working conventions

Everything in `CLAUDE.md` still applies — the comment budget above all.

### How long the suite takes

About **seven minutes** end to end, and three of the eight are slow enough that
a two-minute tool timeout will kill them mid-run:

| | |
|---|---|
| `comments`, `typecheck`, `mods`, `build` | a second or two each |
| `smoke` | ~10s, 454 checks |
| `demo` | ~85s |
| `shots` | ~3min — two viewports, each waiting out a whole first descent |
| `guide` | ~2min |

None of them hangs. If one looks stuck it is one of the bottom three, and the
answer is to wait or run it in the background, never to assume it broke.

### Reading the demo's output

`npm run demo` prints TWO kinds of `✗` and only one of them is a failure:

- `✗ FAILED — <why>` is a check that did not hold. `grep '✗ FAILED'`.
- `✗ Shard of Making: no open slot` is the crafting walkthrough printing a
  currency's REFUSAL, on purpose. It is the only place a failure message is
  ever read, so those lines are the point of that section.

The last line is `✓ every check passed` or `✗ N checks failed`. Trust that.

### The harnesses have their own rules

- **`smoke.mjs` is ORDER-DEPENDENT.** Roughly a dozen assertions pick a dock
  item by POSITION — `filled('#inv-gear')[0]` — so anything that reorders the
  dock has to go at the END of the file, and anything that consumes an item has
  to avoid the pieces later checks look for by name. The Sort test is last for
  exactly this reason. Adding a test in the middle that sells, wears or sorts
  will break checks hundreds of lines further down, and the failure will name a
  piece rather than your change.
- **The guided opening (`npm run guide`) walks the real UI with a real pointer.**
  `src/ui/tutorial.ts` is data — steps with `done` predicates — so when a change
  breaks it, the fix is editing those steps, not the harness. A step that is
  already satisfied is SKIPPED and never comes back, so "do this thing that
  happens at a random moment" belongs as a branch inside an existing step's
  `text`/`target`, not as a step of its own. The meeting is the worked example.
  A step's `done` may not read a MOMENT the UI passes through — `meet` ended on
  the panel being shut, and the walk out put a second between the clear and the
  panel in which that was already true, so the opening skipped the meeting and
  then rang a header button underneath it. It ends on the thing having been
  handed over instead.
  A step may not name a thing the player might not be holding: the opening said
  "Ash Wand" three times and lied to every character handed a sword, so the
  demo now renders every step's text for every skill and fails on any weapon
  name that is not the one that character was given.
  There are **fifteen** steps: enter, watch, meet, take_haul, to_shop, buy_making, select_weapon, use_making, equip, descend, again, meet_crystal,
  bench_crystal, craft_crystal, socket. The demo walks the same list headlessly
  with a hand-written action per step — add a step and that action list needs
  one too, or the walkthrough reports the opening as STUCK.
- **`npm run shots` can fail on content, not just on layout.** It waits up to
  two minutes for the Lampwright panel and fails the run if a first descent
  never produces one. The meeting is at the END of a cleared descent, after a
  walk to the exit and a walk over to him, so that wait covers a whole one —
  and the skill it picks is Blight, which takes about a minute over its first.
- **The guide plays the opening in REAL TIME**, and every descent in it is
  played. `again` sits through exactly one — the second clear, which is what
  `INTRO.firstCrystalClear` costs — so nothing in the harness edits the save to
  reach a step.
- **The opening ends inside a popup.** The last step sockets the crystal from the
  collection, so `guide.mjs` closes whatever is open before its post-opening
  work — the tree, the dock and the worn column all click header buttons a
  modal covers.
- **Measure a box with `hover()` first when a drag test aims at one.** Playwright's
  actionability waits for the element to stop MOVING; a raw `boundingBox()`
  does not. The bench going from empty to full grows the card and re-centres
  the modal, so a box read a moment earlier is 20px out and the press lands
  between two slots and silently does nothing. That was a 1-in-4 flake.

### Claims need evidence

- Balance claims need a measurement, not an impression. `ladderCharacter` in
  `src/sim/loadout.ts` and the harnesses in `src/demo.ts` are the tools; a
  throwaway probe script is fine for anything they do not cover. Put probes in
  the scratchpad or delete them — they are not part of the repo.
- Art claims need a screenshot. None of these is in the suite, and the demo's
  sprite checks prove grids are square, not that anything reads.
  - `tools/model-sheet.mts out.png` — every look, and `out-beasts.png` beside
    it with every creature at every rank. The only view that judges a halo.
  - `tools/model-peek.mts out.png family[,family]` — a few looks, drawn large.
  - `tools/zone-peek.mts out.png [px] [time] [span]` — all four zones off a
    real generated map, centred on the entrance. **`span` must be EVEN**: it is
    halved to find the corner, and an odd one lands the loop on half-tiles and
    silently draws nothing where the landmark should be.
- `npm run shots` covers the welcome, the Fissure, the collection, the SLOTS,
  the HANDOVER, a descent, the LAMPWRIGHT, the skill web, the BENCH and an item
  TOOLTIP at two sizes. The bench shot catches a third column not fitting; the
  tooltip shot rolls four modifiers onto a piece first, because a blank one
  shows none of the grouping; the handover shot fires 180ms into a launch,
  which is the hero half out of the entrance; the slots shot is three rows of
  name, level, age and two buttons, which is where a narrow screen tears.
