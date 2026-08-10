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
(`POWER`, `runSet()`). Crystals are given, never bought: the Lampwright hands
out the Normal ones, quests pay the other two, and a crystal levels only while
socketed. A cleared descent launches the next one until you die, fill the haul,
or stop it; every ending lands on the same report and the same haul screen. Gold
is the one currency. Demonic and Prismatic carry auras and Normal does not, so
the three worlds are a ladder as well as three opponents.

**The art is done, and so is the pass over the parts you touch with your
hands.** Crystals are levels and live on their own screen; capacity comes off
the base's tier and the currencies were rebuilt around six kinds; tooltips are
built cards with the rolled number coloured apart from the words; the dock
sorts and lights up what an armed shard can reach; the counter sells in a mode
and buys back; a descent hands over to the next one through a hole in the
ground; and the Lampwright is a person you walk to.

What is left is the OPENING — the first hour hands out crystals faster than a
character can carry them — then one balance debt carried out of the systems
work, then the next feature. §7 is the deferred pile, and the first entry in it
is now answerable rather than blocked.

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
reason to exist through drops nothing else has, which is a debt the unique-gear
phase owes it.

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

**Adding a modal is three places, not one.** The markup in `docs/index.html`;
the Escape chain in `src/web.ts`, which closes the topmost thing and must know
where yours sits in that stack; and `guideContext()`'s `top`, which is what
lets a tutorial step point at a button inside it. Miss the third and the guided
opening will ring something a popup is covering, which is a failure `npm run
guide` reports as being trapped.

**Adding a container is three places, not one.** The field on `GameState`;
`heal()`, which has to drop entries whose base no longer resolves; and the
demo's "every collection a save can hold items in claims its ids" list, which
walks each one through `readSave` and proves the id counter moved. Miss the
third and a save can hand out an id the next item then reuses.

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
The hero breaks off and walks over; reaching them sets `meeting`, the UI stops
ticking and puts `src/ui/met.ts` up, and the button grants the crystal and
calls `RunSim.takeGift()`. The report never pays a meeting out, which is what
makes it yours even if you die further down. `runToCompletion` takes an
`onMeeting` callback because a headless run would otherwise stand there
forever.

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

### Phase 1 — The Lampwright at the mouth

The three phases that follow are one idea in three landable pieces: **the
opening hands out crystals faster than a character can carry them.** A crystal
socketed the moment it is given makes the descent LONGER, and longer is harder
even with nothing rolled on it — you have to survive all of it. So most skills
die on the run after their first gift, and the honest move is to leave the gift
out, which reads as the game handing you a trap. This phase moves the meeting;
Phase 2 moves the first crystal off it; Phase 3 replaces the coin flip that
pays for the rest.

**What is true today.**

- The Lampwright is met MID-descent. `RunSim` picks a kill count (`meetAt`),
  and `placeLampwright` in `src/sim/run.ts` drops a body three to six tiles
  from the hero; walking to it sets `meeting`, the UI freezes and `src/ui/met.ts`
  hands over a crystal. The descent then carries on.
- The first clear pays at the REPORT: `grantFirstClear` in `src/game/state.ts`
  reads `FISSURE.firstClear` and grants 30 gold and an `ash_wand` — the same
  wand whatever skill was chosen.

**Why it is wrong.** A Strike character is handed a wand, which is the first
item the game gives you and the first one it teaches you to craft. And a meeting
in the middle of a descent is a gift you can walk away from with a corpse: it is
the only good thing on the map, and it is standing next to the monsters.

- [ ] The meeting moves to the END of a cleared descent. The Lampwright climbs
      out of the hole the hero would have dropped into — the `mouth()` decal on
      the EXIT tile — rather than being placed mid-map. `placeLampwright` and
      the `meetAt` kill count go.
- [ ] A meeting ENDS the run rather than pausing it. It banks as the clear it
      is, lands on the usual report, and stops the idle loop: the same terminus
      as **Leave after this run** (`land()` in `src/ui/run.ts`), not a fifth
      ending. He guides you out; that is what the words say and what the loop
      does.
- [ ] The first cleared descent always has one, and what it hands over is a
      WEAPON. `FISSURE.firstClear.weapon` — one base id — becomes `STARTER_WEAPON`,
      a table from what the skill IS to a weapon base, so a new skill is one row
      and never a silent wand.
- [ ] Keyed off `SkillDef.category`, which is already `'attack' | 'spell'`, with
      an optional `weapon` field on `SkillDef` overriding it when a skill wants a
      specific family. Today that is `spell → ash_wand` and `attack →
      rusted_sword`; the point of the table is the rows that are not written yet
      — a bow skill and a two-hander each add one. A skill that resolves to no
      base is a demo failure, not a fallback.
- [ ] The 30 gold stays a report line. Gold is not a thing that is handed over,
      and the opening needs it to buy the shard it already asks for.
- [ ] `LAMPWRIGHT.first` is the WEAPON speech now, and teaches equipping and
      crafting rather than sockets. The crystal speech moves to Phase 2.
- [ ] The guided opening's `select_weapon` / `use_making` / `equip` steps hang
      off this meeting instead of off a report payout, and `descend`'s "Socket
      the crystal you were given first" goes with the crystal (Phase 2).

**What must not break.** `npm run guide` walks the real opening with a real
pointer, and `npm run shots` fails the run if a first descent never produces a
Lampwright panel — both are about to be load-bearing for this phase rather than
incidental to it. `runToCompletion` takes an `onMeeting` callback so a headless
run does not stand there forever; a meeting that ends the run has to leave that
harness with a cleared run rather than a stuck one.

### Phase 2 — The first crystal, at character level 5

**What is true today.** `LAMPWRIGHT.chance` is `[1, 0.34, 0.22, 0.14]`, indexed
by how many Normal crystals you hold — so the first one is CERTAIN, and lands
on the first cleared descent. The last guided step tells you to socket it.

**Why it is wrong.** Stated above: a level 1 character with one blank crystal
socketed is running twice the descent it just barely survived, for a reward
that reads as nothing because a blank crystal rolls no danger. You should have
to level in the bare Fissure before the run gets longer.

- [ ] The first Normal crystal is gated on CHARACTER level — `character.level`
      in `src/sim/character.ts` — at `INTRO.firstCrystalLevel`, 5 to begin with.
      The first cleared descent at or above it is a meeting.
- [ ] Nothing about it is rolled. It is scheduled off a number on the character
      sheet, so the collection screen can say exactly how far away it is.
- [ ] The meeting is followed by a scripted craft: the guided steps put a
      `shard_of_making` on the crystal, and it teaches sockets by having you
      fill one. It looks like crafting because it IS crafting — the only thing
      arranged is which modifier comes out.
- [ ] The roll is forced to one named modifier at its lowest tier, so a first
      crystal can never be the thing that walls the game. `layout_maze` is the
      pick: `layoutComplexity` carries weight `0.2` in `DANGER_STATS`, the
      cheapest danger in the game, and its `ilvl: 1` tier is the bottom of that.
- [ ] The forcing lives on the CRYSTAL, not on the currency — `crystal.meta.scripted`,
      read once by `add_mod` in `src/crafting.ts` and cleared as it fires. A
      Shard of Making that behaves differently for one item is a currency whose
      tooltip lies.
- [ ] The shard for it is handed over at the meeting, as a `gifts` entry. Bought,
      the step can be blocked by an empty wallet, and a tutorial step nobody can
      satisfy is the one failure mode the guide cannot report its way out of.

**What must not break.** `npm run mods` proves every modifier rolls, does
something and reads — a scripted roll must go through the same path rather than
around it. The demo's save round-trip has to carry `meta.scripted`, and `heal()`
has to drop it on a crystal that already has its modifier. `npm run guide` grows
the steps that teach the socket.

### Phase 3 — The rest of the Normal crystals are quests

**What is true today.** `LAMPWRIGHT.chance[1..3]` — crystals two, three and four
are a per-clear coin flip at 34%, 22% and 14%. `CRYSTAL_QUESTS` in `src/data.ts`
has four entries, all Demonic or Prismatic, and every one of them is
`need: { danger, family?, share? }` and nothing else. `claimQuests` in
`src/game/crystals.ts` walks every open quest on every clear, so order is
already free.

**Why it is wrong.** Luck decides when the game's biggest difficulty step
arrives. Two players who play identically get it eight runs apart, and neither
of them can see it coming.

- [ ] `LAMPWRIGHT.chance` goes. Every Normal crystal after the first is a quest,
      completable in ANY order, and each pays once.
- [ ] `CrystalQuest.need` widens past `danger` into a `QUEST_CONDITIONS`
      registry — same shape as `CONDITIONS` in `src/crafting.ts`, a named
      behaviour taking the cleared `RunSet` and the run's own numbers. A new
      objective is then one registry entry plus a table row, which is the point:
      these are meant to be changed without a session reading any code.
- [ ] Three objectives to start with. **Numbers here are intent, not tuning** —
      the ladder they sit on is what matters, not the values:
      a socketed crystal reaching level 4 (`crystalLevel`); a clear at a given
      danger; a clear inside a given number of seconds (`RunState.elapsed` is
      already carried, so this costs a field on the report and nothing in the sim).
- [ ] Every objective must be plausible to a character that has just done the
      one before it, with the crystal count it has when it gets there. That is
      the whole test of this table and the reason the numbers are soft.
- [ ] All four existing quests pay through Phase 1's MEETING as well, Demonic
      and Prismatic included. A crystal is never a line in a report.
- [ ] The collection screen (`src/ui/crystals.ts`) already draws quests as a
      ladder; the Normal ones join it, and the sentence about meeting the
      Lampwright on some percentage of clears goes with the chance table.

**What must not break.** `game.quests` is a list of ids in the save, so new ids
only ever add — `healQuests` drops one that stops existing and costs nothing
else. The dev preset marks every quest done (`src/game/state.ts`) so a stocked
game does not pay out four duplicates on its first dangerous descent; three more
quests have to be in that set. The demo's quest checks and `npm run guide` both
walk this.

### Phase 4 — The danger retune

Carried out of the rewards work, where it was deferred on purpose: setting the
danger modifiers before the aura system existed would have meant setting them
twice. The aura system exists now.

**The debt, stated precisely.** Difficulty lives entirely in crystal modifiers.
There used to be a per-crystal monster scale (`MONSTER_TIER_SCALE`) doing most
of the work; it is GONE — do not go looking for it — and twelve modifiers
across four sockets now have to span what it spanned on its own. They were
widened when it was removed, but not that far, so **the top set is still
clearable ten times out of ten**. The game is loose in the direction §2 asks
for, which is why this waited rather than blocking anything.

The two harnesses that measure it are both in `src/demo.ts` and both print a
grid rather than asserting a verdict, because a hardcoded verdict goes stale
the moment the numbers move:

- **ONE SOCKET** — crystal level against a rung of gear. Currently 5/5 in every
  cell, which is the shallow end having nothing left to say. This is the rung
  the guided opening puts in front of a new player.
- **THE LADDER** — each power band cleared in gear the band below it drops.
  Currently 12/12 at every band, which is the number this phase exists to move.

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

### Phase 5 — Unique gear

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

## 6. Open questions

Do not guess at these.

1. **What is the fifth socket?** Wanted as an endgame slot holding something
   that is not a crystal. Deliberately unspecified — the user wants to think
   about it. §1 says how to keep it cheap to add; nothing else should assume it.

2. **The Cavern and the Fissure have no currency of their own.** Retiring the
   quality ladder took `sigil_of_refinement` with it, which was Prismatic's
   exclusive, and nothing replaced it. Today `sigil_of_upheaval` is gated to
   Demonic and `sigil_of_finality` to the Seam; the other two worlds are gated
   to nothing. §2 says a world should have a reason to be entered, and the
   unique-gear phase already owes the Fissure one — so this may be the same
   debt rather than a second. **Provisional, and mine, not the user's:** left
   as it is rather than inventing a gate. Ask before gating an existing
   currency to the Cavern — it would make a staple zone-locked.

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
  right once you know what a good drop looks like, and uniques will move that
  answer again.
- **Blight and Strike are not the same game.** Last measured, Blight cleared
  the top of the ladder 12/12 where Strike managed 3/12. That number is OLD —
  it predates the capacity rework and everything since — so re-measure before
  acting on it. The danger retune will move it again either way.
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
| `smoke` | ~10s |
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
- **`npm run shots` can fail on content, not just on layout.** It waits up to
  a minute for the Lampwright panel and fails the run if a first descent never
  produces one. The meeting fires on a kill count the run rolled, up to seven
  tenths of the map, so the wait has to cover most of a descent.
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
