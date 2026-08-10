# Crystal Core — Roadmap

**This is the master to-do list.** It is the design of record for work that has
not been built yet. `CLAUDE.md` describes the game as it *is*; this describes
where it is going.

If you are picking this up with no other context, read in this order: §1 for
where things stand, §2 for decisions that are settled, **§3 and §4 for how the
thing is actually built** — those two are the ones that stop you making a
mistake this project has already paid for — then §8 for how to work, then start
at the lowest unchecked phase in §5. §6 lists what is still undecided; do not
guess at those, ask.

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
(`POWER`, `runSet()`). Crystals are given, never bought: the first is scheduled
and every one after it is a quest, all of them handed over in person at the
mouth of a cleared descent, and a crystal levels only while socketed. A cleared
descent launches the next one until you die, fill the haul, or stop it; every
ending lands on the same report and the same haul screen. Gold is the one
currency. Demonic and Prismatic carry auras and Normal does not, so the three
worlds are a ladder as well as three opponents, and each of them drops a unique
that exists nowhere else.

**The art is done, and so is the pass over the parts you touch with your
hands.** Crystals are levels and live on their own screen; capacity comes off
the base's tier and the currencies were rebuilt around six kinds; tooltips are
built cards with the rolled number coloured apart from the words; the dock
sorts and lights up what an armed shard can reach; the counter sells in a mode
and buys back; a descent hands over to the next one through a hole in the
ground; and the Lampwright is a person waiting at the mouth of a cleared one,
holding whatever is owed — the weapon your skill can actually swing, then the
first crystal and the shard to roll it, then every quest you have just finished.
Nothing is a coin flip and nothing is a line in a report.

The OPENING is done, and so are the two things queued behind it: the danger
retune — the deep end is a wall now, and danger stops paying for what a cap has
already eaten — and unique gear, six named pieces that grant switches through
the same table the trees use, one world at a time.

The Lampwright has a face now — a portrait at its own grid, a hood and a lamp
on a crook — and he talks like someone who lives down there rather than like a
manual. **§5 holds four phases**, all of them the user's: a Fissure that reads
as a cave and three worlds that move, a walk to the way out with the finale
climbing out of it, three save slots, and a sweep that puts a figure on every
number the game describes in words. The last is also a standing rule — §2.

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
waiting is a condition you can read on a screen — your level, a quest you
finished — and never a per-descent chance. A player who cannot tell whether the
next crystal is two runs away or twenty has no way to plan the only decision
the game asks them to make.

**Every number is said out loud.** Nothing the player reads may describe a
quantity in words when it has a figure behind it. Never "more damage" — "35%
more damage". Never "another cast" or "an extra cloud" — "+1 cloud". Never "a
third more ground", "hits harder", "grows again". If a line cannot name its
number, the line is describing the wrong thing.

This is about MECHANICS, not about voice. Flavour has no number behind it and is
not covered: the Lampwright says what he sees, a unique's own line is a line
about a dead man, and neither is a stat. The test is whether a player could act
differently knowing the figure — if yes, the figure goes in.

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

**`floor.shade` is the dark in every zone; `floor.rock[0]` is not.** The rock
ramp's first entry is `#a96c8f` in the Cavern — pale — so anything that needs
to read as a HOLE and used it vanished into its own floor. `floor.glint` is the
bright in every zone. At one tile across contrast is the only tool: `mouth()`
is a bright rim, a mid ring and a `shade` pit, and the ladder or teeth or
shards inside it are decoration on top of that, not the thing that reads.

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

The art section above covers the sprites and the map. This covers everything
else — the save, the items, the currencies, the screens and the loop. Same
purpose: a session that does not know these will make the same mistake twice.
It is long because it is the part that saves you reading the code.

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
`gate`. `treeGrants` in `src/sim/stats.ts` merges what is WORN after the tree,
so a unique's switch reaches the sim by the one path a tree's does. The lines
live in `implicits`, and the item declares NO modifier slots — `modCapacity` is
zero and every currency refuses it, `sigil_of_upheaval` included. `plainGear`
excludes them, or the bulk sell would eat one. The demo holds each to the same
rules as a tree node: declared, read by a skill you can pick, and paid for by a
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

**The handover between descents.** `HANDOVER` seconds where the sim does not
tick at all: the hero drops into the hole at the exit, `#run-fade` goes black
for the moment the map is swapped, and they climb out of the next entrance.
`emerge` (1 standing, 0 underground) is passed to `Renderer.draw` and moves the
hero sprite; the fade hides the swap. `banked` holds the report the drop is
carrying so Abandon mid-drop lands THAT one rather than building a second and
banking the loot twice. The hole itself is a `mouth()` decal on the ENTRANCE
and EXIT tiles, per zone, so both renderers get it.

**A meeting.** The Lampwright is `RunState.lampwright`, an `Entity` kept
deliberately OUT of `monsters` so nothing in combat can ever see them.
`giftWaiting` in `src/game/crystals.ts` answers what is waiting at the mouth,
read AFTER the report so the level that descent just bought counts.
`RunSim.greetAtExit()` stands them on `map.exit` facing the hero; `takeHandover`
grants everything the meeting holds and `src/ui/met.ts` draws it; `giftSchedule`
is the same answer in words, for the collection screen. A meeting is a HALT of
the idle loop — `halt = 'met'` — landing on the same report as any other ending,
so the clear is banked before anyone is standing there.

**The Lampwright speaks in FLAVOUR.** `LAMPWRIGHT.first`, `.crystal` and
`.again` in `src/data.ts` describe what he has seen the rock do and name no
screen, no currency and no number. Teaching what to click is the guided
opening's job, and §2's numbers rule is about mechanics rather than voice — do
not "fix" his lines by putting figures in them.

**What is owed.** `Waiting` is everything the mouth is holding — a weapon, the
scheduled crystal, and every quest the clear just finished — and `takeHandover`
grants the lot in one panel. `GameState.given` is what has already been handed
over; with `character.level` and `INTRO` it is the whole of the schedule, and
order cannot break it since nothing reads a flag another step of the same
report sets.

- The **weapon**, on the first clear. `STARTER_WEAPON` in `src/data.ts` maps
  `SkillDef.category` to a base and `SkillDef.weapon` overrides it, so it is one
  the chosen skill can swing. `starterWeapon()` resolving to nothing is a demo
  failure rather than a fallback.
- The **first crystal**, at `INTRO.firstCrystalLevel`, with a Shard of Making
  beside it. It is a LEVEL 2 crystal: level 1 holds no modifiers at all, and the
  meeting is followed by the craft that teaches what one does to a room.
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

## 5. Work

Phases are ordered so each leaves the game playable and each is checkable on its
own. Within a phase, roughly dependency order.

**Writing a new phase.** The test is whether a session with no memory of this
conversation could execute it. That takes four things, and the second is the
one usually missing:

1. **What is true today**, named in code — the constant, the function, the file.
   "The shop sells too much" is not executable; "`RECIPES` in `src/data.ts` has
   eleven entries and should have one" is.
2. **Why it is wrong**, in one sentence a stranger would agree with. Without
   this the next session optimises the wrong thing correctly.
3. **Checkboxes that are decisions**, not tasks. "Border by base tier: white
   t1, blue t2, yellow t3" can be done wrong and caught; "improve the tooltip"
   cannot.
4. **What must not break**, and which harness proves it. Every phase so far has
   had one — the guided opening, the wedge, the ladder grid.

Anything you are unsure about goes in §6 as a question, never into a phase as
an assumption. A phase that guesses is a phase that has to be undone.

Anything in §7 is deferred by decision rather than queued; ask before turning
one of those into a phase.

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

- [ ] The Fissure stops being masonry. `CUT.fissure` leaves `'built'` — a cave
      has no square corners — and the flagstone goes back to being rare rather
      than the default: `patchNoise` currently opens it at `> 0.42`.
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
(§8 — **`span` must be EVEN**). The demo holds map generation to connectivity:
every room reachable, entrance and exit connected. A rounder cut must not strand
a room. Both renderers must agree, so anything per-tile stays a pure function in
`render/renderer.ts` (§3).

### Phase 2 — Walking out

**What is true today.** `spawnFinale()` in `src/sim/run.ts` fires the moment the
flood finds nothing reachable left, and rings the whole encounter around
`map.exit` at once — `count` entities on a circle of radius `0.8 + count*0.09`.
A Swarm is 20 bodies on one point. The hero is already standing at the exit when
the last one dies, so the handover drops it where it stood.

**Why it is wrong.** Twenty monsters spawning inside each other reads as two.
And the run ends the instant the fight does, on the same tile, so the exit is
somewhere you were already standing rather than somewhere you go.

- [ ] The finale arena and the EXIT are near each other and not the same place.
      Clearing the map leaves you with a walk, short enough to be a beat and not
      a chore.
- [ ] The finale is triggered by the hero coming NEAR the exit, not by the map
      going empty — so it is a thing that happens to you on the way out.
- [ ] They come OUT of the exit — the `mouth()` hole is already drawn there, and
      the same hole the Lampwright climbs out of is what they climb out of.
- [ ] Arrival is STAGGERED, per encounter (`ENCOUNTERS` in `src/data.ts`):
      the Warden is one and arrives alone; the Honour Guard's four come out one
      at a time; the Swarm's twenty come in groups. A `wave` shape on
      `EncounterDef` — how many at once and how long between — so the pacing is
      data rather than a special case per encounter.
- [ ] `s.totalMonsters` still counts the whole encounter the moment it starts,
      or the readout counts down and then goes back up.

**What must not break.** `runToCompletion` has a seconds guard and the demo's
TERMINATION CHECK runs 28 of them: a finale that waits on the hero reaching a
place must not be able to wait forever. `npm run guide` and `npm run shots` both
play whole descents. The report reads `RunState.elapsed`, and a quest asks for a
clear inside 90 seconds (`normal_iv`) — a walk added to every descent moves that
number, and the demo measures it.

### Phase 3 — Three save slots

**What is true today.** `src/game/save.ts` writes ONE localStorage key
(`crystal-core.save`) plus a timestamp. The Save screen (`src/ui/savedata.ts`)
says where your progress lives and offers a file backup, a file load and a
delete. `New game` is a separate header button (`dev-fresh`) that wipes.

**Why it is wrong.** One save means trying anything costs you the game you have,
and the only way to keep two is to download a file and remember which is which.

- [ ] Three slots. The key becomes one per slot; `readSave`/`saveGame`/
      `clearSave`/`savedAt` take a slot, and one stored key remembers which slot
      is live so a reload comes back to the same game.
- [ ] The header button says **Save & Load** and opens a screen of three rows.
      Each row shows what is in it — character, level, how long ago — or that it
      is empty, and offers Save here and Load.
- [ ] An empty slot's action is to START one there. **`New game` leaves the
      header**: a new game is a thing you do to a slot, which is also what stops
      it wiping the game you are in.
- [ ] Overwriting an occupied slot asks first (`src/ui/confirm.ts`), the same
      way `New game` does today. Loading over an unsaved game asks too.
- [ ] The file backup and the file load stay — they are the only thing that
      survives clearing the browser — and a loaded file lands in a slot.
- [ ] `SAVE_VERSION` does not move. `heal()` already drops what no longer
      resolves, and a save written before slots existed loads into slot 1.

**What must not break.** `npm run smoke` walks the Save screen and asserts what
it says; the demo's save round-trip and `heal()` checks read and write through
these functions, and its "every collection a save can hold items in claims its
ids" list goes through `readSave`. The guided opening survives a reload twice
(§8) — that has to keep working with a live slot.

### Phase 4 — Every number said out loud

The rule is §2. This is the sweep, and the check that keeps it swept.

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

## 6. Open questions

Do not guess at these.

1. **What is the fifth socket?** Wanted as an endgame slot holding something
   that is not a crystal. Deliberately unspecified — the user wants to think
   about it. §1 says how to keep it cheap to add; nothing else should assume it.

2. **How long should the opening be?** `INTRO.firstCrystalLevel` is 5, which
   the roadmap named. Measured, that is **24 cleared descents — about eleven
   minutes** of the bare Fissure before the first crystal, because a clear is
   worth about two levels at first and the curve outruns it immediately
   (`LEVELLING.curveBase` 260, `curveExponent` 1.8). Level 3 would be ~6 clears,
   level 4 ~13. **Provisional, and mine, not the user's:** left at 5, since the
   phase named it. Say which number the opening should cost and it is one
   constant.

3. **The Cavern and the Fissure have no currency of their own.** Retiring the
   quality ladder took `sigil_of_refinement` with it, which was Prismatic's
   exclusive, and nothing replaced it. Today `sigil_of_upheaval` is gated to
   Demonic and `sigil_of_finality` to the Seam; the other two worlds are gated
   to nothing. §2 says a world should have a reason to be entered, and every
   world now has uniques of its own — the Fissure two — so this may already be
   paid. **Provisional, and mine, not the user's:** left as it is rather than
   inventing a gate. Ask before gating an existing currency to the Cavern; it
   would make a staple zone-locked.

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

### How long the suite takes

About **five minutes** end to end, and three of the eight are slow enough that
a two-minute tool timeout will kill them mid-run:

| | |
|---|---|
| `comments`, `typecheck`, `mods`, `build` | a second or two each |
| `smoke` | ~10s, 443 checks |
| `demo` | ~85s |
| `shots` | ~90s |
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
  There are **fifteen** steps: enter, watch, meet, take_haul, to_shop,
  buy_making, select_weapon, use_making, equip, descend, level, meet_crystal,
  bench_crystal, craft_crystal, socket. The demo walks the same list headlessly
  with a hand-written action per step — add a step and that action list needs
  one too, or the walkthrough reports the opening as STUCK.
- **`npm run shots` can fail on content, not just on layout.** It waits up to
  a minute for the Lampwright panel and fails the run if a first descent never
  produces one. The meeting is at the END of a cleared descent now, so that
  wait has to cover a whole one rather than part of it.
- **The guide plays the opening in REAL TIME, and one step waits on a level.**
  `level` sits through however many descents `INTRO.firstCrystalLevel` costs —
  measured at 24, about eleven minutes — which is not a test, so `guide.mjs`
  ages the SAVE instead and reloads. It has to do that through
  `page.addInitScript`, not by writing localStorage and then reloading:
  `startAutosave` flushes the live game on `pagehide`, so leaving the page
  overwrites anything written before it. The init script runs on the way IN,
  after that flush. The harness asserts the edit took, because a silent failure
  there reads as the step being stuck.
- **The opening ends inside a popup.** The last step socket the crystal from the
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
- `npm run shots` covers the welcome, the Fissure, the collection, the
  HANDOVER, a descent, the LAMPWRIGHT, the skill web, the BENCH and an item
  TOOLTIP at two sizes. The bench shot catches a third column not fitting; the
  tooltip shot rolls four modifiers onto a piece first, because a blank one
  shows none of the grouping; the handover shot fires 180ms into a launch,
  which is the hero half out of the entrance.
