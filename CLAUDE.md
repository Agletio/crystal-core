# Crystal Core

A browser ARPG. Deterministic fixed-timestep sim, seeded RNG, no framework, no
server. Ships as `docs/index.html` + a committed `docs/app.js`.

Two files: **this one** (always true, always loaded) and **`ROADMAP.md`** (the
work that is left). Everything domain-specific is a SKILL — load it when you
touch that domain, not before.

| skill | load before |
|---|---|
| `art` | spending a generation on anything: bodies, tilesets, icons, fixtures |
| `renderer` | `src/render/`, `src/vignettes.ts`, the carve in `src/sim/grid.ts` |
| `systems` | `src/sim/`, `src/data.ts`, `src/trees/`, `src/trades/`, `src/moves/`, `src/trials/`, `src/game/`, `src/crafting.ts` |
| `screens` | `src/ui/`, `src/web.ts`, `docs/index.html` |
| `harness` | a failing, flaking or hanging check; adding one |
| `critique` | judging the ART: the creative director shoots and approves a set, three critics score it 1–10 against Steam's pixel-art indies — after a large art change, and at the end of every phase until all three give 8 |

## The cycle

**`git fetch` first, every session.** The clone is taken when the container
starts and the branch moves under it, so the roadmap you were handed can list
work that has already landed — that has cost a whole phase, built and tested and
thrown away. `git log --oneline -15 origin/<branch>` is the fastest read; reset
onto the tip and re-read the roadmap before picking anything.

Then: take the **lowest-numbered phase** not blocked on an open question, do the
WHOLE of it, leave the suite green, commit and push, update `ROADMAP.md` (delete
the phase, renumber, move what turned out wrong into Open questions) and this
file if the game changed — **and start the next phase in the same breath.**

**Finishing a phase is not a stopping point.** Do not end the turn to report,
do not ask whether to carry on. Say what it did in two lines and keep working.

**Push before starting the next phase.** This working tree has been observed
resetting to the commit it started from, twice in one session; both times
`git fetch && git reset --hard origin/<branch>` lost nothing, because each phase
had been pushed as it went green.

Exactly three things end a session, and a finished phase is not one:

- **The roadmap holds nothing but questions** — say so and list them. Do not
  invent work, and do not promote a backlog item without being asked.
- **A question needs answering.** **Ask in a plain message, never through the
  multiple-choice popup** — it is not always watched, it times out, and the
  question is lost. Write it in the reply, stop, wait. Once answered, carry on
  without stopping again.
- **The context runs out.** The harness's call, not a decision.

## Commands

| | |
|---|---|
| `npm run comments` | comment budget |
| `npm run theme` | every colour a token, every token defined |
| `npm run typecheck` | tsc, `src` only |
| `npm run build` | bundle to `docs/app.js` — **committed**, Cloudflare runs no build |
| `npm run mods` | every modifier rolls, does something, reads |
| `npm run smoke` | ~7min: headless boot and interaction |
| `npm run demo` | ~19min: sim, economy, trees, balance. `DEMO_TIME=1` times each section |
| `npm run shots` | ~1min: all 30 screens against a checklist |
| `npm run drag` | ~13s: the dock reorders, a window goes where you put it |
| `npm run peek` | a descent, at a zoom, a pan, a crop, a skill, a burst of frames |

**These are MEASURED, and they were wrong by 10x in both directions** — smoke
was written down as 10 seconds and takes seven minutes, demo as two minutes and
takes nineteen. **Run what the change can reach, not the whole suite** — the
table is in the `harness` skill, along with every quirk and flake. Build before `smoke`,
`shots`, `drag` or `peek`; they load the bundle. Whole suite before a push.

## What holds, whatever you are changing

- **A balance number never blocks a phase.** Measure it, PRINT it, carry on.
  Balance checks are `gauge()`s that report and never fail; what still FAILS is
  mechanism — a run that does not end, a determinism break, a step nobody can
  finish, a screen that overflows, a modifier that does nothing, a save that
  cannot be healed. One difficulty check stays a failure: a brand new character
  clearing the bare Fissure.
- **A difficulty number is aimed at the CEILING, never at the floor.**
  `ladderCharacter` walks its tree at random and splits its attributes four
  ways; `bestBuild` searches plate, lines, attributes, passives, mover and a
  greedy tree walk, then PLAYS its shortlist because the sheet cannot see a
  pack — **and PLAYS its passive set too** (`playPassives`), because
  `buildPower` is a SHEET number and a passive whose worth is a RULE is worth
  nothing to it: scoring alone took `surge+contagion+bloodpact` for strike AND
  for shockwave, two skills with nothing in common. Played, four skills share
  no passive at all and the rule-shaped ones — Glass, Brink, Aftershock,
  Bulwark, Rimeheart — get picked. **It cost +36% a build and 2 minutes on the
  demo, and it moved no gauge**: the ratio below is `buildPower` over
  `buildPower`, so the one number that reports the search cannot see the search
  getting better. Measured across bands 1, 3 and 6, the second is **1.5× to 6.2×** the
  first — so anything tuned until the floor dies is off by that much, which is
  what made the whole game clearable at 89% life or better. The top of that
  spread WIDENED from 3.0× when the passive shelf tripled, because the search
  picks three passives and a random walk does not. **Anything measuring
  what a descent PAYS runs a ceiling**: a character that dies banks nothing.
- **Read the LOW-WATER mark, not the life you walk out on.** A descent ends in a
  walk to the exit and regeneration tops you up on the way, so a build nearly
  killed twice reports full life at the end.
- **DANGER is what makes a monster harder, and it now reaches the BODY.**
  `DANGER.lifeAtTop` and `hitAtTop` in `src/data.ts`, through `dangerStep`,
  which reads what danger ALONE buys — sockets are length, so they stay out of
  it, and it saturates with run power where the hero's item level does. Danger 0
  is exactly 1, so the Fissure a new character walks into is untouched.
- **Every number is said out loud.** Nothing describing a quantity in words when
  it has a figure behind it — "35% more damage", never "more damage"; "+1 Cloud",
  never "an extra cloud". The test is whether a player could act differently
  knowing the figure. FLAVOUR is exempt and must not be "fixed": a character's
  lines, a unique's line about a dead man.
- **A CARD SAYS WHAT IS TRUE, AND NEVER WHY.** *"Really need to stop with the
  over describing everything… it literally says the ilvl already. You do this
  kinda dialogue all over the place."* A tooltip, a card, a button, a heading:
  the facts a player ACTS on and nothing else. Not the mechanism behind a
  number, not a second sentence restating something already on the screen, not
  an explanation of what a thing is for. "A way through The Prism." is the
  whole of a portal's card. FLAVOUR authored as flavour is exempt — a zone's
  blurb, a character's lines, a unique's line about a dead man.
- **One word per mechanism, and it is the ONLY word.** `KEYWORDS` in
  `src/keywords.ts`; `BANNED` is every retired phrasing. The demo sweeps every
  tree node, trade node, skill, currency, quest, modifier line and
  `GrantDef.what`.
- **Automation is universal, and there is NO exception.** No build's power may
  depend on the player being present — every balance number comes from headless
  runs. Anything a player can do mid-descent has a shipped default policy, that
  policy is what `runToCompletion` runs, and the two are ONE implementation. A
  boss was the one exception for a while and is not any more.
- **The game is meant to be WATCHED, and the screen has to allow it.** The
  payoff of assembling a build is seeing it work. There are two ways to play
  this — menus and watching — and a change that serves the first at the cost of
  the second is taking from the half that has less.
- **Nothing teaches, by decision**, and **nothing is ever prevented.** *"I wanna
  start from scratch with it. Remove it all, and once all the systems are in
  place and we see how the intro plays out then we add it in small parts as
  needed."* Do not put back a smaller tutorial, a hint bar or a first-run
  tooltip. Teaching comes back as a quest log, driven by what actually confused
  somebody. A log that greys out what you have not been told about is the same
  cop-out in a new coat.
- **This is a DESKTOP game.** Hover may carry meaning, an icon may rely on a
  keybind, no layout is contorted for a phone. Assume nothing a standalone shell
  would not have: no URL bar, no back button, no tab title.
- **There are no image files, and no binary assets.** Every sprite is a list of
  strings or a data URI in TypeScript. Adding one is a change to how the game
  ships, not an art decision.
- **ART IS GENERATED, never hand-written.** *The user's call: "make sure you're
  using the pixel lab art generator and not creating art yourself. We need it to
  match the rest of the art."* A grid typed out by hand does not sit beside a
  roster that came off one generator with one forced palette, however readable
  it is on its own. **Load the `art` skill and use the pipeline** — `icons.json`
  → `icon.mts` → `portrait.mts` for an icon, `bodies.json` → `body.mts` for a
  body, `zoneset.mts` for a floor, `uikit.mts` for a fixture. **A DESIGN IS
  SHOWN TO THE USER AND APPROVED BY HIM BEFORE ANYTHING IS ROTATED, ANIMATED OR
  DRESSED** — *"you're supposed to give me sample images before you begin making
  animations or additional generations for characters."* **GEAR HAS NO
  FALLBACK AT ALL**: all 59 `GearBase.art` keys are generated rows, the
  hand-drawn silhouettes behind them were deleted, and the demo fails a base
  with no icon — *"delete all of that old self made crap and use the new
  icons."* One source means the bag and the FLOOR cannot draw two pictures of
  one item. The grids still in `src/ui/icons.ts` are the SKILL shelf's, for an
  id nobody has drawn yet, and **nothing new joins them.**
- **`GameState` is plain data**, `heal()` repairs it on every load, and
  allocations are REPLAYED rather than trusted. Adding a field costs nothing;
  renaming an id costs the player whatever pointed at it; `SAVE_VERSION` is only
  bumped when a save must be REFUSED, which wipes everyone.
- **Only Pixi draws sprites**; `canvas2d` is a fallback with none. Sprite work
  being invisible there is correct. Anything per-tile is a pure function in
  `render/renderer.ts` so both renderers read one answer.
- **NOTHING KEYS OFF WHERE THE HERO STANDS.** *"It feels bad to ever take like
  % increased damage to near enemies when you can't control your character's
  location at all."* Nobody drives him, so a condition on distance is a
  condition on the pathfinder. A conditional buys off something the BUILD
  decides — a kill still counting, a stretch with nothing landing on you, a
  target's life, an Ailment already on it.
- **Claims need evidence.** A balance claim needs a measurement, an art claim
  needs a screenshot.

## Comments

Comments carry what the code cannot: an invariant, a unit, a constraint that
looks arbitrary, a trap. Everything else is noise.

- **State what is true.** Never "this used to be X". A reader who needs the old
  behaviour has `git log`.
- **Skip the why when the code shows it.** No provenance — not the bug that
  prompted the change, not the measurement behind the number, unless the number
  is unexplainable without it.
- Trailing comments are free and often the right size.

`npm run comments` caps standalone comment lines at `max(10, 20% of the file)`,
found by parsing rather than by matching text. `SHARE_BY_FILE` gives
`docs/index.html` 25% because it is mostly one-line CSS rules; adding an entry is
a decision to argue for, not a way out of a cut. It runs as a `PostToolUse` hook
when you move to a different file, on `Stop`, and in CI. **Fix a violation by
cutting prose** — padding a file to raise its allowance is the one repair that
makes it worse. Expect to pay for a DELETION in prose too: cutting a table lowers
the ceiling with it.

## The game

**THE CAMP IS WHAT THE GAME OPENS ON**, and everything else is reached from it.
**It is a PICTURE, not a place** — *"build it not using the tile sets and just
use art and then make objects clickable on it… we don't need the characters to
move around"*. One generated 688×384 scene in `src/render/generated-scene.ts`;
`src/scenes/camp.ts` is every rectangle and every anchor measured in THAT
picture's own pixels, and `src/ui/camp.ts` scales the whole stage, so a hotspot
cannot drift off the thing it sits on. It is scaled WHOLE at one scale on both
axes, the largest that fits — a pixel of it is a square, and the bench against
one edge and the shelf against the other are never cropped; what the window
has over the picture's shape is the stage's own ground. There is no map, no carve
and no walk: sixteen hotspots — the crack, four sockets in the rock, the bench,
the shelf, the tent, the fire, the ANVIL and five STATIONS — and what MOVES is light, wind and idling bodies
on one canvas over the art. Everybody you have met stands about in it and clicking one
goes to their room — a person's hotspot is their own body's grid, where that
body was drawn. **THE FISSURE IS REACHED FROM THE CAMP AND NOWHERE ELSE** —
*"remove the fissure button, the shop, from the ui in the bottom right rail,
have that only be from camp"* — the crack. **FOUR MORE SCREENS ARE THE
PICTURE'S ALONE**: the STASH is the shelf, the CRYSTALS are the four sockets
(which open that screen whether or not one is in them — taking a crystal back
is the Fissure card's own sockets' job, and a filled socket that unsocketed
instead would leave no door at all), and THE RECKONING is the FIRE, the one lit
thing in the art nothing else claimed. **THE STATIONS ARE FIVE MORE DOORS INTO
ONE ROOM, AND THE ROOM IS THE WORKS** — the smelter, the loom, the tanning
frame, the kitchen and the jeweller's, each opening it on its own tab, because a
smelter and a loom differ in the word and the picture and never the mechanism.
A station keeps its own name in the picture; the SCREEN is named for the word
the code already uses (`#work`, `WorkJob`, `src/game/work.ts`), so the player's
word and the source's are one.
The sawbench in the picture is scenery: **THERE IS NO WOOD** — *"it doesn't
make sense to be gathering wood in the fissure anyways"* — so a bow is
Leatherworking's, a staff Weaving's and a wand Jewelling's.
**THE ANVIL IS WHERE A BASE IS MADE**, which is a different verb from the
bench's. **Its card is THREE BLOCKS** — the piece and the window your level
buys, then a NEEDS LEDGER of one row a thing wanted (`.forgeneed`: the
profession level, every stack a part eats with its icon, the world's own
material) said as *held / wanted* and lit or dim, then the button — and the
list is FILTERED beside the kind tabs: one tier or every tier, and *Can make
now*. *"Clean up the actual boxes so it's clear what items are needed and
what level is required."*
Everything else is still on the rail, and a screen with neither a
button nor a hotspot is one somebody will lose.

**A COUNTER BELONGS TO A PERSON, and the shop is the Lampwright's.** *"The shop
should exist in the first character you meet… Each character can have something
similar to a shop or a just a different shop entirely."* `SceneDef.keeps` is
what somebody runs without being handed anything; a bench a RELIC buys (the
ossuary's, the orrery's) is the same shape already.

**NOTHING NAMED IS SOLD: the counter is a GAMBLE.** You buy "a ring", not a ring
you read first — one button per KIND, rolled at the click and never stored, so
there is no shelf to reopen the window at. **Its price is DERIVED and never
typed**: `bestSale(ilvl)` is the most any piece of that level could ever fetch —
top base tier, every slot filled — and `gamblePrice` is `GAMBLE.over` times it,
so buying one and selling it back is a loss however it rolled and no edit can
invert that. **NO PERFECT comes out of it**, at any level: that is the floor's
own chase. The only named pieces it can reach are the FISSURE's, because the
counter stands in the camp above it. **GOLD ALSO BUYS RAW, at a bad rate** —
`MATERIAL_PRICE` flat by world — which is what makes it the smoothing for a
recipe you are two short of rather than a supply: a bare clear's gold buys 0.80
raw against the 21 it gathers, so descending is 26x the rate.

**THERE ARE NO RAISED CHAMBERS, and nothing is ever stacked.** *"Lets just get
rid of the raised areas they look bad and its too hard to make it work."* A
floor is ONE level throughout: no shelf, no rim, no stairs. `wangKey` still
reads a cell's four corners in base three off the ROCK alone, which is the whole
of what a set is keyed by. Do not build it back — the shelf sets, the stair
props and `RAISE` are deleted, and what a floor gains instead is what stands ON
it.

**A FLOOR IS ONE TILE AND THE WASH IS WHAT VARIES IT — AND THE WASH IS NEVER
PER CELL.** A set holds one pure floor tile, and two thousand of it read as
wallpaper; measured, three of the four ship almost perfectly flat (a spread of
2.3 to 5.6 luma, a wrap seam of 1 to 4), so the tiles were never the problem.
**NOTHING IS TINTED PER CELL any more** — not the floor, not a pool. Every
tile is drawn at full strength and `groundWash` is multiplied over
the whole floor as ONE field: *"once the floor is generated… generate a gradient
ON TOP of those tiles… make sure it's not just giving a recolor to entire tiles
or you're going to get sharp lines."*

**AND THE FIX WAS WHERE IT WAS SAMPLED, not what it computed.** `patchNoise` is
smoothstepped and always took floats; it was only ever CALLED at whole cells,
and that is the whole of what turned a gradient into a mosaic with an edge at
every tile — *"the harsh color lines in the floors"*. Sampled BETWEEN cells
(`WASH_PER_TILE` a tile each way, stretched smoothly between) there is no
boundary for a line to land on, and the foot slope is bilinear over the four
surrounding cells for the same reason. The builder samples it the same way, or
it would show lines the real floor does not have. **IT COVERS THE ROCK TOO**: a
WALL tile draws its top `FACE_HEAD` as ground, so washing only the floor left
that strip at full brightness — a pale band hugging every rock edge, reading as
another tile and as floor you could stand on. `GameMap.plain` is left governing
the GRAIN alone, which no map draws.

**THE TEST LEVEL IS WHERE A LEVEL DESIGN IS WORKED OUT, and it is the dev
menu's alone.** *"Just stop messing with existing tiles. Make a whole new
tileset and make a new map that's only accessible in the dev menu. We will use
that to test until we get a good level design."* `TEST_LEVEL` in
`src/sim/grid.ts`, behind `testLevel()` — the dev kit's toggle and `TEST=1` on
`descent-peek` — swaps the next descent onto its own family (`test_round`, and
`test_pool` chained off that set's floor tile in the same mode, so one floor is
drawn everywhere) and its own rules: bigger chambers on a map grown to match
(`LevelDesign.scale`, or the same packs land in half the rooms), WHOLE lakes nobody walks,
a cell of plain floor all round them, every cell inside a full three-by-three
(a lake is drawn at its CORNERS, so a run of cells draws a tile narrower than
it is, and two tiles of water is what a ripple fits in), a fishing spot on a
cell drawn wholly as water, and no light drift on the floor. **A SHIPPED SET IS
NEVER EDITED**: what is judged good here becomes a world's through `DESIGN`,
which names the worlds running a `LevelDesign` — **THE FISSURE RUNS THE TEST
LEVEL'S**, *"then you can push to the main fissure levels"* — and a designed
floor is `GameMap.plain`: no light drift and no grain, because a per-cell tint
is a hard line at every cell whatever noise drives it, and *"the harsh color
lines in the floors"* were exactly that. The drift is BACK everywhere as the
wash above, which is what the mosaic of rectangles was really complaining
about; the grain stays off, each mark carrying its own edge.

**A LAKE IS A DEEP CORE IN A SHALLOW WREATH.** Brogue's rule: a blocking patch's
DEEP is every cell of it with the patch on all four sides (`Grid.deep`), and its
ring walks, drawn as the shore. So water lies against a wall and still leaves a
way round, and `placePatches` refuses a lake WHOLE if its deep strands one dry
cell. A landmark keeps a dry ring — the way out standing in a pond is a hole in
the water — and nothing wet takes a face cell.

**THERE IS NO FILTER, because there is nothing to filter.** A clear banks the
LOT; what you do not want is dismantled at the anvil or sold across the counter.
`KIND_VARIETY` is what weights a drop's KIND now, AUTHORED and never counted —
counted off content volume, ten ring implicits took rings to 39% of every drop.

**AN ODDITY STACKS.** *"Change the 'Carrying' part of the inventory to
'Oddities' and make them stackable so your inventory doesn't fill with a million
corpses and dust."* The relic column is ODDITIES and `addItem` merges one into
its own row by `stackKey`, the way a material does; `spendRelic` takes one off
the stack rather than the list, and `heal()` merges a save written before it.

**THE DOCK IS THREE TABS, and only ONE of them is a grid.** Gear is SLOTS
because the slot count IS the carry limit — 48, twelve columns of four, and
running out is something you watch approaching. Currency and material are
LEDGER ROWS — an icon, a name, a count, grouped under a heading — because
`carryRoom` is `Infinity` for both and a slot can only make a capacity visible
that exists. A row also carries the NAME a 40px icon never could. **The dock is
ONE HEIGHT whatever tab is up**: every popup stops above it, so a tab holding
one row still stands as tall as the grid, and `shots` measures all three and
fails on a gap. **A ROW IS CLICKABLE and that is the point** — the material
slots it replaced were disabled with no menu, which left "Eat it" on a cooked
fish reachable from nowhere in the game.

**CLICKING A PERSON ASKS WHAT YOU WANT OF THEM** — *"a menu that says like
Dialogue option / Shop / Exit"* — `options()` in `src/ui/talk.ts`: their words,
their counter, the way out, each with an id a harness names rather than its
wording. A counter reached only after the last beat was one you got to by
pressing Next four times. **Talk still leads where the LINES lead**: a key and
a gift are scripted moments and stay on the end of them, which is what keeps
the first meeting a scene rather than a menu entry.

**One place you go, at the RUNG you pick.** `LADDER` is three zones of 12, 14
and 16 rungs; a rung is CHOSEN, one you have cleared stays open for the rest of
that character's life, and a zone opens when the one below it is whole. Its
difficulty rides the crystal seam as ONE synthetic mod (`rungMod`, beside
`trialMod` and `treeMod`), so `crystalRewards` pays a harder rung more with
nothing written twice. **A DEPTH is what a player calls a rung** — the identifiers stay `rung`,
because `climbed` is a save key. **A CAMPAIGN ZONE IS A WORLD AND A GEAR TIER**,
because the campaign is run with NOTHING SOCKETED: `LadderZoneDef.world` and
`.tier`, read by `runSet` whenever a descent names a depth. **A ZONE IS NAMED
FOR THE PLACE, never for the boss on top of it**: The Shallows is the Fissure at
tier 1, The Prism the Cavern at tier 2, The Rot the Rot at tier 3 — *"T2 in the
second area t3 in the third."* `LadderZoneDef.id` is the save key under
`character.climbed`, still spelt the way the worlds were.
**THE RAMP IS A STRAIGHT LINE**: `rungMod` reads how far up the 42 you are and
scales `LADDER.*AtTop` by exactly that, so every depth costs the same 20 danger
as the one before it. There is no exponent and no spike — a challenge floor
every fourth rung made 2 and 3 free, 4 five times the fight and 5 easier again.
**A zone's LAST
rung is its BOSS**, in an arena of its own (`LADDER.zones[z].arena`, read through
`arenaAt`), and clearing that is the whole of what opens the zone above: The
Answering, The Refraction, The Flowering. **THE CLIMB IS DRAWN ONE ZONE AT A
TIME, on a TAB**, as a seam descending that act's own generated cross-section
(`LadderZone.art`) with a station on every rung, lit as far as you have
cleared. **THE MAP IS THE SCREEN, EDGE TO EDGE, AND NOTHING IS WRITTEN OVER
IT** — *"the maps need to be flush all the way to the border… the fissure text
and the close button can just float on top"*. The window's body carries no
padding and no fade, its head lies OVER the picture and takes no clicks, the
tabs and the way in rest ON it, and the seam is sized off the room LEFT rather
than off the viewport; `shots` fails the screen if it needs scrolling. The
title, the depths-cleared line and the campaign's own line are GONE with it —
the window already says THE FISSURE, and they said it three more times. Every
station is placed in PERCENT of the picture, so a rung cannot drift off the
chamber it sits in.

**THE LINE IS THE CAVE'S OWN MAIN PATH, AND IT IS TRACED, NEVER EYEBALLED.**
`LadderZoneDef.path` is the course through that cross-section, and
`tools/act-floors.mts <scene> path <x> <y> <x> <y>` is what finds it: the drawn
floors are cheap and the rock is dear, so the cheapest route from the top of
the mine to the fire at the bottom IS the main passage. Depths are spread along
it at even ARC LENGTH, and **THE DRAWN SEAM IS THAT COURSE** rather than a
curve through the pips — twelve points across a zigzag cut every corner and ran
the line through solid rock.

**THE SIDE ROOMS ARE A NETWORK, AND THE MAP IS THE GATE.** *"Offshoot levels
of the main line that branch in these separate rooms. Each has a special
bonus… I want you to be able to skip zones by going in between others."*
`LadderZoneDef.sides` are the rooms and `.links` the ways ROUND the line; a
node is `d<N>` for a depth or a room's own id and the main chain is implicit,
so only the ways round it are authored. `canEnter` is REACHABILITY — a node
opens when something touching it is cleared — so a run of side rooms arrives at
a depth you never climbed to. **CLEARING THAT DEPTH IS WHAT MAKES IT YOUR
LEVEL**; a side room moves nothing but the map: *"otherwise you're still at
your current main level even if you cleared higher difficulty side levels."*
`Character.opened` is what the map remembers, per zone, and it is never a
level. Measured on The Answering: the network joins the line at depth 2, and
from there the line alone reaches depth 3 where the rooms reach depth 10.
**THE NETWORK IS WALKED, NEVER HANDED OVER** — six of the fourteen touch no
depth at all, so climbing the whole line still leaves them a clear away.

**A PORTAL IS A HOLE, AND WHAT IS PAST ONE IS AS DEEP AS THE WALK.** *"that's
how these are connected rather than the line. When you hover it should
highlight the other portal."* `LinkDef.portal` is the two mouths and nothing is
drawn between them — a line across half the picture said the two chambers touch,
which the art does not. Each mouth carries a STUB to its OWN room, so which
room a hole belongs to reads without hovering; the hover is what says where it
goes. `chainDepths` is the other half: what the line reaches
WITHOUT crossing a portal keeps `depthOfSide`, and everything past one ramps
from the near mouth's own depth to the zone's LAST, by steps walked — so the
room at the end of the chain is worth the grind and no room past a portal is
priced by where it happens to sit. `LadderZoneDef.portalArt` is the ring a zone
draws, cold blue in The Prism and a hoop of fire in The Rot.

**A SIDE ROOM'S DIFFICULTY IS WHERE IT STANDS.** `depthOfSide` puts it on the
zone's own course and reads the arc length as a depth, so a room low on the map
is a hard floor and no depth is written down twice. Its bonus lands in TWO
places because they are two things: what makes the floor HARDER is one
synthetic mod on the seam `rungMod` rides, so `crystalRewards` weighs it, and
what it PAYS is `RunSet.bonus`. **WHAT IT PAYS IS ITS NAME** —
`BranchBonusDef.icon` is a generated row and the pip draws that picture,
*"the 3a/b looks kinda weird no? should we even just have little icons that
look cool?"* **A LINK IS TRACED LIKE THE LINE**, and kept only where the traced
route is within 1.6x the straight hop: past that the tracer went the long way
round, which means the picture never joined those two chambers, so it draws as
a straight dashed hop. Every spur is drawn TWICE, a dark casing under the dash,
because a hairline on a lit cave floor is the same value as the floor.

**THE SOULSTONE IS THE WHOLE OF THE ENDLESS HALF, AND THE PROVING GROUND IS
GONE.** *"Scratch the entire proving ground idea. Once you clear the last level
of the rot you get a new item called a soulstone… all it does is increase the
difficulty of all the levels starting to be the same difficulty as the last
level of the rot but on the first level of the shallows. And your map starts
over so basically its just a difficulty increase and map reset."* So `RunWhere`
is a `Rung` and nothing else — there is no second kind of place, no influence
pick and no world you choose. **IT ROLLS NOTHING**: `makeSoul` is one base with
no mods, no level and no family.

**THE RAMP JUST CARRIES ON, AND A STONE'S WORTH IS A TABLE.** `rungMod` runs 0
to 1 across the whole 42 and `soulMod` adds `soulClimbs(souls)` on the same three
stats, so every depth still costs the same as the one below it and there is no
exponent anywhere. `SOULS.perStone` is what each stone is worth IN WHOLE CLIMBS:
the first is exactly 1, so depth 1 of The Shallows with one socketed costs what
depth 42 cost bare — his rule, pinned at the one point he named. **TWO OF THEM**
(`SOULS.max`), and `soulOwed` asks for the campaign to be finished AT THE TIER
YOU STAND ON, so it is 84 depths for the pair.

**THE SECOND STONE IS 8 CLIMBS, AND THE TOP OF THE ROT UNDER IT IS THE ONE FLOOR
NOTHING IS MEANT TO WALK.** *"I'd rather the two soulstone clears, at least like
the rot area, be so hard that nothing beats them on your tests because I have a
feeling as someone plays theyll find a unique combination that makes it
through."* Measured with `bestBuild` at the level cap and IMMUNE to Ailments —
the honest ceiling, since a player who gets there has the lines: at a flat 1 the
top of The Rot was cleared 4/4 by strike and blight and 2/4 by rimespike and
fireball; at 3 it was blight alone, at 5 blight alone, and at 8 nothing at all.
**BLIGHT IS THE WHOLE OF WHY IT IS 8** — every other skill was walled at 3 — so
the number is priced against one outlier and Phase 18 owns that. **NOTHING
STRANDS BEHIND IT**: no crystal-ladder step and no soulstone asks for a clear up
there, `soulClears` counts a clear at any depth of the tier, and the second stone
is owed for the campaign at ONE. The gauge is in FLOOR AND CEILING and it is a
gauge, never a check — the harness is softer than a player, and the one
difficulty check that still fails is the bare Fissure.

**AND DIFFICULTY PAST THE CAMPAIGN ARRIVES THROUGH THE RAMP AND NOWHERE ELSE.**
`dangerStep` saturates at `POWER.max * POWER.perDanger` — danger 330 — and the
two-stone Rot top sits at 8195, so `DANGER.lifeAtTop` and `hitAtTop` have been
flat out since somewhere inside the campaign. Moving either changes the campaign
and does nothing at all to the endgame.

**THE MAP STARTS AGAIN AND NOTHING IS EVER WIPED.** `progressKey` keys `climbed`
and `opened` by the soul count, so each tier keeps its own sheet and taking a
stone back out puts the climb you had back rather than handing it to you twice.
`Character.souls` is DERIVED by `syncSouls` off the wall itself and written
nowhere else, so the count and the sockets cannot disagree.

**THE WALL IS SIX SOCKETS IN A DRAWER, and the rule between them is the point.**
*"Have the socket menu be a tab you can open on the right side that just pops out
the 6 socket slots seperating the soul slots from the crystal slots."* A tab on
the map's right edge, shut by default so the picture keeps the window; four
crystal sockets, a rule, then the two soul ones. `RUN_SLOTS` holds all six and
`CRYSTAL_SLOTS` / `SOUL_SLOTS` are what everything else reads — `socketed()` is
the crystals alone, or a soulstone would arrive in `runSet` as a crystal.

**THE CRYSTAL LADDER IS PAID BY THE SOULED CLIMB, AND IT IS TWO LADDERS.**
*"Make some of the crystals unlock for 1 soulstone and some 2 soulstones… 100
with 1 soulstone in and then 100 with 2 in."* The Normal four are 25/50/75/100
clears at ONE stone and the Demonic four the same at TWO, with the Prismatic
four between them bought by LEVELLING what you already hold. `CrystalStep.souls`
is which tier a step's clears are counted at and `GameState.soulClears` is one
row a tier: **a clear at two counts for one as well** — *"if you just skip to 2
without finishing the 1 it should count both"* — so `bankSoulClear` walks down
from the tier you ran at and the rows can never rise. So the first crystal
arrives with the campaign, and every one after it is bought by walking the climb
again against something worse.

**A CRYSTAL ROLL BURNS DOWN.** *"You roll a mod and it lasts for a certain
amount runs and then it's gone."* `RolledMod.uses` is descents left, set at the
roll off the TIER'S OWN WEIGHT (`usesFor`) so a rarer tier is stronger and runs
out sooner — a decision rather than an upgrade. A CLEAR spends one off every
roll on every socketed crystal and drops it at zero; a DEATH spends none,
because failing a rung already costs nothing but time. Gear never carries one.
A roll running out is the sixth thing that ends an Enter-chain.

**A CRYSTAL ROLLS A RULE, NEVER A NUMBER ON A BODY.** *"Change all the mods to
be effectively just powerful nodes from the web. Like for example it
could be 50% chance for enemies guarding a box to all respawn once they die."*
Eleven modifiers used to be monster life, damage, armour, crit, three added
elements, speed and three wards; raw scaling is the RUNG's now and every one of
the fifteen is something the floor DOES — the Second Watch, the Hoard, the Vein,
the Warden, the Splitting, the Welling, the Bearer, the Watched, Gilded, density
and layout, and what a run is pointed at. Not one of them is a resistance, so
there is no crystal roll a build walks past. **A rule that puts bodies back on
the floor needs a TERMINATION PROOF, and it is never a counter**: the Second
Watch is flagged on the lock, the Welling climbs a rank ladder that ends, the
Splitting descends one that ends at common, and a Warden is always hurtable
itself. **The Warden's answer SHIPS** — `sheltered` is asked by the target
picker AND by `dealDamage`, so a headless hero walks to the warden rather than
swinging at a body taking nothing.

Four sockets hold crystals permanently. Their COUNT is how long a run is, their
MODIFIERS how hard it is; a crystal's LEVEL buys capacity and tier, and its
FAMILY (Normal / Demonic / Prismatic) picks which monsters spawn. **THE ZONE IS
THE WORLD** — every depth walks into `LadderZoneDef.world` — and **THE SEAM IS
THE ONE THING THAT OVERRIDES IT**: `seamSocketed` is `SEAM_OF` of each aura
world at the TOP level and NOTHING else in the wall — *"socketing 2 lvl 4
prismatic and 2 lvl 4 demonic gives you the seam which will be the final
zone."* It is the only world you cannot pick. Danger and socket count fold into
one **run power**, and every reward reads that and nothing else. A fifth socket
takes a **boss key**.

**NOTHING IS PAID UNTIL THE CAMPAIGN IS WHOLE, AND THE LAMPWRIGHT IS WHO PAYS
IT.** *"You shouldn't see any trial stuff or even receive any crystals until
you've cleared the entire campaign."* `campaignDone` is every zone climbed to
its own boss, and finishing it pays NOTHING on the report: `CAMPAIGN_REWARD` —
one crystal and the first 10 points — is a third thing `giftWaiting` holds,
taken in his own scene in the camp, which is what makes him the person the
campaign ends at. `Character.paidCampaign` is set by the HANDOVER and read by
`trialPointsFor`, so the points and the crystal arrive together and a re-grind
pays nothing. `campaignLine` still names the depth that ends it and quotes
`campaignPrize`, but NOTHING SHOWS IT any more — it came off the climb with
every other line, at the user's word, and it is waiting on a screen that has
room. The web is on screen from the first descent, with nothing on it walkable:
a plan you cannot see is a plan nobody makes.

**The Lampwright owes the weapon, the FIRST crystal, the campaign's reward and
every step of the CRYSTAL LADDER**, and nothing else. **THE FIRST CRYSTAL IS
THE SECOND PASS'S** — *"make the first crystal come at level 4 on the second
clear when you have a soul stone in"* — so `crystalEarned` asks for a SOCKETED
soulstone as well as the main skill at `INTRO.crystalSkillLevel` with every
point spent. The whole campaign is walked with an empty wall, which is what the
campaign already claimed to be. **THE LADDER IS THE WHOLE
OF WHAT THE ENDLESS HALF PAYS**: *"Normal crystals pay out at 25/50/75/100 runs
of this new zone. Prismatic crystal pays out and full lvl 4 normal crystals,
then another at level 2 prismatic, another at level 3, another at lvl 4, and
then the same thing for demonic."* `CRYSTAL_LADDER` is those twelve steps IN
ORDER — a step further up can never pay before the ones under it — each holding
either a count of `GameState.soulClears` at a soul tier or a number you already
hold at a level. Levelling one is the only way past the fourth, so the ladder is
the souled climb and the sockets pulling on each other. Measured, the twelve
come to 184 souled clears. Taken in person like every other crystal, with
`gaveStep` in `given` as the one cursor.

**A CRYSTAL'S LEVEL IS THE WHOLE OF GEAR PROGRESSION.** *"Make it where tiers
are just based on crystal level and make it take longer to level them."*
`CRYSTAL_LEVELS` buys three things and nothing else buys any of them: `mods` is
how many lines it holds, `tier` the best gear BASE a run may drop — read off the
MEAN level socketed (`tierForSet`), so one good crystal cannot carry three
blanks — and `MOD_TIER_LIFT` is which TIER of modifier it rolls. That last one
is a LIFT and never a gate: measured, a level 2 crystal rolls the best tier 27%
of the time and a level 4 one 52%, and the WORST is still 14% at level 4. *"You
can still get the worst mods too and it's just possible to get the very best."* The RUNG buys item level, so a first cycle is well-rolled tier 1 rather
than tier 1 rolled badly. Nothing gates levelling any more — a crystal earns
from the first clear it is socketed for — and `xp` is a real climb: measured,
level 4 is 400 clears at the bare Fissure, 87 at 200 danger and 26 at the top,
which says go DEEPER rather than grind where you are.

**LOOT IS PAID PER RUN, AND DANGER BUYS QUALITY — NEVER QUANTITY.**
`DropBand.gearPerRun` and `CURRENCY_DROP.perRun` are what a CLEAR pays, drawn
down body by body against what is LEFT to kill. A per-KILL rate could not say
this: kills run 26 at the bare Fissure against 847 at the deep end, so a rate
that looked flat paid 1.5 pieces a clear at one end and 84 at the other. **A
budget that DEPLETES is the only spread that survives a floor putting bodies
back** — dividing by the live total instead paid the Welling and the Splitting
17× the band. **RARITY IS NOT IN THE COUNT**: it buys what a piece IS — the base
drawn, a named one, a currency's class — and what a deep run buys is `fill`,
`ilvl` and the base tier those reach. A drop arrives FINISHED enough to judge
(`fill` reaches [6,6]), because a piece the bench has to be spent on first is a
piece nobody reads.

**A DROPPED PIECE NEVER ARRIVES FULL.** `DropBand.fill` is a SHARE of the
BASE's own capacity, clamped to leave at least one slot open. Written as a
COUNT it clamped to full on every smaller base, and a piece with no room is a
piece the bench cannot reach at all. **The item you save shards for is one with
good lines and room to add**, which is the whole of what makes a scarce shard a
decision rather than a tax — *"the currency needs to be rare enough you need to
wait to find an item that's good enough to start using it on."*

**A BUDGET IS SETTLED TO A WHOLE NUMBER BEFORE IT IS SPREAD.**
`left / bodiesLeft` places exactly `left` items only when `left` is an INTEGER;
on a fraction the per-body chance climbs to the whole remainder by the last
body and the run pays `left × H(bodies)` — the harmonic number, 3.5 over 33
bodies and 7.4 over 850. A currency budget of 0.9 paid 1.29 a clear, and
cutting it to 0.18 still paid 0.79: the number in the table was never what
arrived.

**A LOCK IS AN OCCASION, AND THE RUN DECIDES HOW MANY.** `HOARD.mostPerRun` is
what 100% chance buys and the roll buys a share of it. Per PACK it could not
be: the pack count IS the difficulty, so the deep end's thirty packs turned an
80% Vein chance into 24 Veins a descent against a run budget of 0.18, and gear
rode eight Hoards while the band said 1.7. **`HOARD.baseline` is what a run
gets for NOTHING** — measured, a chest in one descent of 4.8 on blank crystals
— because art nobody has spent a point on is art nobody ever sees. On the
Hoard and never the Vein: a free lock paying currency hands a shard's scarcity
straight back.

**A LOCK IS MADE OF THE WORLD IT STANDS IN, and it is WALKED TO.** `LOCKS` is
three a world — two ordinary and one RARE — each a `shut` prop and the `open`
frame of **the same generated object**, so opening one swaps the picture rather
than standing a second chest beside the first. **The last guard falling only
UNLOCKS it** (`Hoard.free`): *"I want it to be a chest that will actually open
and when you kill all the mobs your character walks up and opens it."*
`stepHoard` is that walk and it is a shipped default policy `runToCompletion`
runs, asked with nothing left to fight so a pack always outranks a box. A route
that does not exist is the same answer as being there already — the rule the
exit is already under, and what stops a walled-off lock holding a descent open
for ever. A pair is cropped to ONE
box (`PropSpec.with`), or the lid going back moves the box under it. **A rare
one is never a bigger pile**: `LOCK.rareRarity` is what its ONE drop is worth
extra, because rarity buys what a piece IS everywhere else in the game. A
timber box in a gullet of meat read as furniture somebody carried down, which
is the whole reason the table is per world.

**A GATHERING NODE IS A LOCK WITH A FAMILY ON IT.** *"It's weird to get ore
from enemies… should there be ore to mine in the area and your character just
goes up and mines it?"* `GATHER` and `RunState.nodes`: a node is put in a PACK's
room, `freeNode` opens it when that pack is down, and `stepNode` is the walk —
the Hoard's own three states, so gathering satisfies universal automation with
nothing to click and no policy to ship. **When the room is clear** is both of
the user's constraints at once: *"no just tanking mobs"* and *"minimize back
tracking"*, since you already fought there. **DEALT, NEVER ROLLED**: the
families are shuffled and dealt round the nodes rather than drawn, so a spread
is sayable at all — but **ONLY THE FAMILIES YOUR TOOLS CAN WORK ARE DEALT**,
because a node nobody may open pays nothing and stands there, which is the
never-prevented rule broken and a third of a run's materials gone. The node
COUNT never moves; only which pile it lands in. **A COUNT, NOT A RATE**:
`GATHER.perRun` × `RunSet.yield`, read off the SET without running it, because
the pack count IS the difficulty. **AND IT IS SCARCE** — *"not every floor
should have ore veins but when it does have it just have it give 1 most of the
time, same concept with all the floor spawn stuff"*: 1.5 nodes a bare clear,
`GATHER.single` of them handing over exactly one, and the amounts are the
balance lever. **FISH RIDES THE WATER, outside the count**: one spot a lake,
none on a dry map. **THE FISHING SPOT IS ONE RIPPLE THAT MOVES**, drawn by the renderer off
`rippleRings` and never a painted prop (`LIVE_PROPS`) — *"an actual moving
ripple even if it's contained to that size"* — and nothing else stands in the
water: cover on a wet cell is dropped, and **THE WATER ITSELF IS FLAT** —
`CALM` in `zoneset.mts` folds every colour the water tile holds besides its
commonest into that one at emit, because the generator paints three pale blobs
on a tile and two thousand tiles of it is a grid of blobs: *"the repeating
bubbles on the water look bad."* **A WORLD'S UNIQUE IS A NODE OF ITS OWN**, never dealt, at
`GATHER.uniqueChance` a run, in its own picture (`MaterialDef.node`) or the
ore's where none has been asked; the ore itself is three pictures a room draws
any of (`MaterialFamilyDef.also`), *his picks*. **PLACED AFTER THE PACKS**, so how much ore a
run holds cannot move what is fighting in it. **GATHERING IS SEEN**: he stands
at a node for `GATHER.pause` seconds with the family's `tool` in his main hand
— a `HELD` row whose picture is a generated icon, exactly as a sword's is — the
pick and the hook swung through the body's OWN attack frames, the rod held out
at rest, and the weapon and the off hand out of the picture for as long as it
lasts (`Entity.tool`, and the BARE body under it, since a variant body draws
what it holds). *"It just feels so wrong right now how quickly it just
instantly grabs stuff."* A body coming into reach drops the tool and the node
waits. What he took floats up as **`+2 Pale Iron`**, never a verb — *"so you
know how many of each you got."* **IT IS TAKEN ON THE WAY, NEVER
FETCHED BACK** — `GATHER.near` is what he steps aside for with a pack still
standing and `GATHER.walk` the sweep once nothing is left, because
`acquireTarget` reaches the whole map and would otherwise carry him off before
he ever gathered. **A BARE DISTANCE CAP LIVELOCKS**: a node across a wall is
inside it by line of sight and outside it once he has walked round, so
`GatherNode.left` is a ONE-WAY decision taken only with the floor dead. **A NODE IS THE SAME IN EVERY
WORLD** where a lock is per world: a lock is furniture somebody carried down and
an outcrop is the rock itself. **GEAR IS THE LUCKY EXCEPTION NOW** —
`DropBand.gearPerRun` is 0.25 to 0.30, one piece every four clears, *"so when
you do finally get a piece it'll feel good."*

**A TOOL DECIDES WHAT YOU GATHER, AND IT IS ONE AT A TIME.** *"I think we add
an equipment slot for gathering… you can only collect one at a time, if you
don't have the correct one equipped you don't gather it."* `TOOLS` and
`TOOL_SLOTS` in `src/data.ts`: the ROD has its own slot, since water is outside
the node count and costs the other families nothing; the other slot takes the
pick, the sickle or the skinning knife, and that is the whole specialization.
**A TOOL IS AN ITEM AND IT IS WORN LIKE GEAR** — *"have the tools enter the
inventory. I want to add variations of the tools you can get later so need to
work as items now."* Every rung is a `GearBase` DERIVED from the `TOOLS` table
(`TOOL_BASES`, `TOOL_OF_BASE`), `gather` and `rod` are two more `EQUIP_SLOTS`,
and `EquipSlotDef.group` is the only thing that draws them under their own
heading — so the bag, the sheet, a swap and the smith's counter all read a tool
through the code gear already goes through, and a variation later is a table
row. **NOTHING IS OWNED BESIDE WHAT IS WORN**: there is no second map, a tool
you are not using sits in the bag, and a new character has none.
**A TOOL IS NEVER A DROP**: `KIND_VARIETY` is `0` for both kinds, and writing
that down is load-bearing — the weight is `slots × (KIND_VARIETY[kind] ?? 1)`
off `EQUIP_SLOTS`, so a new slot with no entry would drop like a shield.
**SKINS ARE THE KNIFE'S ALONE** — *"it won't drop unless you have the skinning
knife equipped"* — off bodies, with no node and no walk, and without the knife
that budget is never drawn against. **A BETTER TOOL TAKES MORE OUT OF ONE
NODE** (`ToolRungDef.more`) and is reforged for gold and the material it `eats`,
gated on the gathering level — a swap of the piece in the slot, since a rung is
another base.

**EVERY TOOL COMES FROM THE SMITH, AND HE IS FOUND AT DEPTH 4.** *"After you
clear depth 4 you find a blacksmith who will greet you in town when you return.
He has the quest icon, offers you one tool for free and lets you buy any
starting tool for gold… have him be the source of the upgraded tools."*
`SceneDef.rung` is a person's OWN depth, ahead of the meeting rota the way a
worker's is, and a pinned person is never handed out by the rota in his place.
`src/game/smith.ts` is the counter and `src/ui/smith.ts` ONE LIST READ THREE
WAYS — take, buy, reforge — because they are the same four rows with a different
verb on the end. `keeps: 'tools'` puts **Talk, Shop and Upgrade** in his parley
menu, and `smith:first` in `given` is the free one, taken in person like every
other gift. **THE ANVIL IS BACK TO ONE TAB A SLOT**: a tool is a person's, not
a screen's. **Nothing is paid for in its
own output**: the three blades are the smith's and the rod's line is the
weaver's, so every tool pulls on a profession other than the one it feeds.

**GEM IS THE UNIVERSAL MATERIAL, AND IT HAS NO TOOL.** *"All things require it
and everyone can use them. They can just drop randomly from everything… just
don't spam too many of them."* `GEM_DROP` is its own budget off any source, and
`CRAFT.gems` is what every recipe asks for by tier. **ANY WORLD'S WILL DO** —
`fillFrom` takes a plain COUNT where a part demands `versions` DIFFERENT worlds,
which is the whole of what universal means — and it is PROCESSED like every
other input, so Jewelling has a job in a build wearing no jewellery. Measured,
1.45 a bare clear against metal's 1.50: level with what it accompanies.

**NINE PROFESSIONS, AND FOUR OF THEM ARE GATHERED.** `ProfessionDef.kind` is
the whole of what tells them apart, so one `professionAt`, one `payXp` and one
`xpToNext` serve both. Mining, Harvesting, Skinning and Fishing are levelled by
USE — *"increased by actually using the tools"* — and `payGathering` derives that
from the RAW a descent banked rather than tallying it in the sim. **THE
PROFESSIONS PAGE is the sheet's second tab**, nine tiles of icon, name and level
with the STEPS of whichever you click; every step is DERIVED in
`src/professions.ts` from the table that enforces it, so a page promising a
level that buys nothing is not a state that exists.

**PROCESSING RUNS ON THE CLOCK.** *"Change the materials to process on a
timer. I think it's fine you still want to go and run stuff to clear it while
it's processing anyway but it's annoying having to go in and out to see if
they are ready."* `WORK.minutes` a job and `WorkJob.doneAt` an epoch
millisecond, read through ONE `clock()` in `src/game/work.ts` that the demo
sets forward; `collectWork` takes what the clock finished off the stations
wherever the bag is next read — the report (cleared, died or walked), the
Works, the anvil, a load — and the Works counts down once
a second while it is open. **The cost is said out loud**: a job finishes while
the browser is shut and while it is left open, so processing is the one thing
in the game a player can wait out, and it pays materials, never power. The
meal still burns on CLEARS. `heal()` turns a job written in descents into a
`doneAt`. **RAW AND PROCESSED
ARE TWO STACKS OF ONE ROW**: `Item.meta.done` and `stackKey`, named for
`MaterialFamilyDef.one`, rather than 28 more rows and 28 more icons. **THE SLOTS ARE
PEOPLE, and a WORKER is the whole cost** — *"find generic workers in the
fissure you rescue and they come back to camp… clearly shows what worker
you're assigning it to and what that worker is currently doing."* `WORKERS` in
`src/data.ts`: four, each standing at ONE depth of one world's zone (Hob at
depth 1 of the Fissure, the one you find immediately), placed by `workerDown`
ahead of the people's schedule and RESCUED by the same walk past
(`worker:<id>` in `given`), wearing the `wanderer` body because a bust nobody
has generated is a face nobody can talk to. `WorkJob.worker` names who is on
it, the load button names the idle worker it goes to, the Works is
one card a worker, and in the camp an idle one stands by the tent and a busy
one at the foot of the station of the job (`CAMP_STATION_FOOT`), opening the
Works on that tab. The dev kit rescues all four. The raw
leaves the bag on LOAD, since a job you could cancel for a refund is a slot that
costs nothing to fill. **A JOB IS ONE FOR ONE**, so nothing is lost and nothing
minted — which is why **A JOB'S SIZE IS WHAT YOU HOLD**, `WORK.least` of 1 up
to `WORK.most`, and never a floor you have to reach: *"it feels bad to need 4
ores for a bar."* Measured, a bare clear gathers 2.1 raw dealt round the two dry
families, so the old floor of 4 was four descents before a station would take
anything at all. The rate never moved — it was one for one
before and after — so nothing a recipe asks for changes with it, and `most` is
the only reason a worker is worth finding. **XP IS FLAT AND NEVER BY WORLD**, or
the no-tiers rule breaks in the easiest place, and it is paid PER UNIT — so what
a level costs is said in RAW, which no job size can flatter: measured, level 2 is
4 raw and 99 is 7,886, nine hours at best with all four workers on full jobs. A
zone-unique is worked by nothing at all.

**JEWELLERY IS TEN IMPLICITS, and it is JEWELLING's whole output.**
`JEWEL_IMPLICITS` — Elemental and Occult Resistance, % Life, % Mana and one per
attribute — with a RING and an AMULET of each at three rungs. **THE AMULET'S
LINE BEATS THE RING'S** (`JEWEL.amuletLift`): two ring slots against one amulet,
and without the split the answer is always "wear the three best" and the amulet
slot is contested by nothing. **A RUNG BUYS THE LINE**, because every rung of
jewellery holds the same modifiers. **NO NEW ICONS** — `tintedGearIcon` washes
every ink of `gear_ring` / `gear_amulet` toward the implicit's own hue at that
ink's OWN brightness, so the SHAPE says which slot and the COLOUR says what is
on it.

**A MEAL IS A BUFF THAT LASTS RUNS, and the PROCESSED FISH IS THE MEAL.** The
kitchen already makes them, so eating one is a VERB on the stack rather than a
second recipe — `Character.meal` is a `RolledMod` in `statMods` beside the tree
and the attributes, so the sheet, the sim and every card read one meal through
the seam every other line uses. ONE AT A TIME: a second sits the first down.
`MEAL.runs` is 5–15 descents and the COOKING level slides where in it you land,
off the same `qualityRoll` a craft reads — measured, 5–6 at level 1 and 14–15
at 99. It burns down on a CLEAR and nothing else, beside `spendSocketed`, and
it NEVER ends an Enter-chain: a crystal roll running out does, and a meal doing
so would make eating one a leash.

**A HYBRID IS MORE TOTAL POWER; A SPECIALIST IS MORE OF ONE THING.** *"The
hybrids can be strictly more overall stat power so for most builds they can be
better, but you can get more of one stat going specific."* `HYBRID.lift` is 1.2
on `armourBudget`, so a two-archetype family spends 55 points where a
specialist spends 46 — the two professions it costs buy BREADTH. The second
half is what keeps a specialist worth taking, and it is a rule about the whole
table: **the family with the MOST of any stat is a SPECIALIST**, so whatever
you are stacking a hybrid is never the answer. `STAT_POWER` is the hero-side
weight per stat — `DANGER_STATS` prices what a MONSTER carries, this prices
what YOU do — and `statPower()` reads a finished ITEM, so both halves are
asserted about what a player wears rather than about a mix. An UNPRICED stat is
worth NOTHING in that total, so every base implicit is held to being priced.

**MATERIALS DECIDE WHAT AN ITEM IS; SHARDS DECIDE WHAT IS ON IT.** A craft
picks the BASE and its IMPLICIT and every modifier is still the bench's — two
economies, two decisions, neither a slot machine. **A RECIPE IS DERIVED, NEVER
AUTHORED**: `ARCHETYPE_PROFESSION` turns `ARMOUR_FAMILIES.archetypes` into one
or two professions, so a hybrid family asks for exactly the two its archetypes
name and there is no list to keep in step with the base table;
`WEAPON_PROFESSIONS` is the one row weapons need, having no archetypes.
**A TIER IS HOW MANY DIFFERENT WORLD VERSIONS THE RECIPE DEMANDS** —
`CRAFT.versions` — so depth matters because ACCESS is gated and never because
deep ore is better ore, and nothing becomes obsolete.

**A LEVEL SLIDES THE WINDOW, and `makeGear`'s `made` is the whole of it.**
*"A plate helm can get between 100–150 armour, where if you're 1 blacksmithing
it's always 100–105 and if you're 99 it's always 145–150."* A DROP is exactly
the row, so `made` is 1 for one; measured on an 84-armour helm, level 1 makes
71–75, level 50 makes 82–86 and level 99 makes 94–97. It rides `armour`,
`damage` and every implicit through the one parameter, and PERFECT stacks on
top so it stays the step above the best a level can reach. The LOWEST level in
a recipe is what the window reads: a hybrid is no better than the profession you
neglected.

**A DISMANTLE MAY NEVER RETURN MORE THAN THE RECIPE TOOK**, or craft →
dismantle → craft prints materials. `meta.spent` is the RECEIPT a craft leaves,
so a made piece refunds a share of what it actually ate; a found one has none,
so its refund is spread round the family's versions off its own id rather than
always landing on the first. The demo asks this of EVERY base, not a sample.

**A PERFECT BASE IS THE ENDGAME CHASE, and it is the only step above ordinary.**
25% on the implicit, top tier only, three sockets minimum. Its rate is a SHARE
of drops, which is why the count had to be flattened first — at 84 a clear the
same odds paid 3.79 Perfect bases a descent and the rare tier was wallpaper.

**THE BENCH SELECTS, AND THE PoE ONE IS GONE.** *"I want to drop the entire POE
style crafting system and switch to a select style crafting system. As your
associated crafting level increases you can select more and more stats to be
guaranteed."* `src/crafting.ts` is `choices` / `whyNotChoose` / `chooseMod`:
under the benched item is every line it could still take, and taking one is a
click on the line you want. There is no random add, no re-roll, no targeted
removal and no gamble — `CONDITIONS`, `EFFECTS`, both Sigils and the two
Essences are DELETED, and with them the only thing that ever set
`meta.corrupted`.

**A LEVEL BUYS TWO THINGS AND `SELECT` IS BOTH.** `linesAt` is the level the
Nth CHOSEN line on one piece opens at — 10, 30, 55, 80, so under 10 a profession
makes bases and nothing else — and `tierAt` is the level a TIER needs, by rank
from the worst. Everything else about the level is the WINDOW: `qualityWindow`
in `src/mods.ts` is the one answer, read by the craft, the bench and every card
that prints a range, and a chosen line rolls its value inside it. Measured on
a +14–26 Strength line: 14–16 at level 1 and 25–26 at 99.

**A SHARD IS A COST, NEVER A THING YOU APPLY.** Twelve of them, one per family
of modifier, DERIVED off the tags `GEAR_MODS` already carries — `SHARD_FAMILIES`
and `shardFor`, first matching tag wins, and the demo fails a modifier no family
claims. `SHARDS.perTier` is 3 / 30 / 300 by tier RANK from the worst, ten times
a step, so grinding the shallow end for a top line is the slow road and the
answer is the next zone — *"you need 1 for tier 1… but t2 you need say like 20
per."* **NO RUN GATES A FAMILY OUT**: damage you cannot craft until the fourth
band is damage nobody crafts, so the CLASS only groups the ledger and
`DropBand.shards` is the pile one drop hands over. Depth buys VOLUME here, and
volume is the whole of what a better tier costs. Measured: a clear pays 7.3
shards at the bare Fissure and 38.0 at the deep end, which for the family
everybody wants is a worst-tier line in 3 clears at the bottom and 1 at the top,
a middle one in 27 against 5, and the best in 261 against 50.

**A PLAN IS THE THIRD GATE, AND NOTHING YOU OWN OPENS ONE.** *"The cool or
really powerful stats should be locked behind crafting plans. Blacksmithing
plans, weaving patterns etc. You have to find these in higher level zones and
they can be locked in the side areas."* `PLANS` in `src/data.ts` and
`planFor(defId)`: three lines are behind one — **Area of Effect**, **reduced
Skill Cooldown** and **+Level of Attack or Spell Skills** — and a
level 99 bench holding ten thousand of every shard still refuses each of them
by name. `Character.plans` is what is held, per character, and a plan is never
unlearned. **IT GATES THE BENCH AND NEVER THE FLOOR**: the same lines still
roll on a drop, because nothing is ever prevented — what a plan buys is
CHOOSING one. **FOUND, NEVER BOUGHT, AND LEARNED WHERE IT FALLS**: no item, no
click, so a full bag can never cost you the rarest thing on the floor.
`PLAN_DROP.perRun` is 0.05, out of what this run's gates open and what you do
not already hold. **WHAT A SIDE ROOM CONTAINS IS SAID ON ITS PIP** — the
Drafting Room (`blueprint`, `RunBonus.plans` of 6), two rooms at the bottom of
every zone. **A PLAN'S WORD IS ITS PROFESSION'S** (`PLAN_WORD`, `planName`) and
so is its picture (`planIcon`), so a new plan is one row and no art.

**THERE ARE TWO COOLDOWNS, AND THE SAME TWO THINGS CUT BOTH.** The mover's and
**the follow-up Ambush's Relay buys** — *"I really want it to be stack cooldown
reduction for ambush so you can lower the .3 second cooldown between crit
teleports so you get 100% and then stack CDR."* Each has a FLOOR
(`MOVE.leastCooldown`, `AMBUSH.leastChain`) and each is cut by the GRANT and the
worn `cooldown` stat MULTIPLIED, so a notable and a rolled line cannot replace
each other. **A MOVER'S FLOOR IS THERE TO STOP IT BEING A SECOND WALK SPEED;
AMBUSH'S IS SET UNDER WHAT GEAR ROLLS ON PURPOSE** — measured, a full set of
the line is 84% and the floor is 15%, so stacking it pays all the way rather
than stopping partway, and the demo ROLLS that set rather than quoting it. The
line is called **Skill Cooldown** now, because naming the mover was a lie the
moment a second cooldown existed. **A LEVEL ON A SKILL LANDS INSIDE `skillBase`**, tagged like every
other line, so `+1 to Level of Attack Skills` reaches a swing and not a cast and
the sheet and the sim read one number.

**A DISMANTLE PAYS SHARDS TOO.** *"If it has +strength and +attack speed you can
get a +attribute and +speed currency, and more of them based on the tier of the
mods."* `dismantleShards` is `SHARDS.refund` of what each line cost, floored, so
it is never the whole cost and the bench cannot be a printer with an extra click
in it.

**THE COUNTER SELLS ONE THING AND IT IS THE CRYSTAL'S.** `shard_of_making` is
the one roll left in the game — a crystal rolls a RULE, and choosing which rule
would buy the cheapest danger for the richest payment. **A CONSTANT PRICE CANNOT
THROTTLE ANYTHING**: a clear banks 54 gold at the bare Fissure against 30,359 at
the deep end, so `Recipe.goldPerIlvl` rides the counter's own item level.

**Twelve modifiers was the whole ceiling, and THE RECKONING is how it rises.**
Four sockets of three is all the difficulty a crystal can ever hold, so the web
is a standing set of modifiers on top. **It is a MAP, not a fan**: TWELVE
WHEELS on three rings, 156 nodes, joined by ROADS of generic nodes, so reaching
a thing is a route you worked out. A wheel's ring of six is one idea said six
ways with its MAJOR at the middle, hung off the ring point FURTHEST from the
road — half the ring is what the major costs. Its identifiers stay `trial_` and
`Character.trialAllocated`, because a save points at them.

**60 POINTS, and every one of them is GROUND OUT.** *"Instead they will all be
revolving around doing grinds… open 100 hordes, swell 1000 enemies, kill 2500
wardens stuff like that."* `POINTS.max` is what the web is sized for, and the
campaign's 10 plus **THE LEDGER** come to exactly it — 18 lines in `GRINDS`,
four families of ladders: descents cleared, Hoards and Veins opened, Welled
bodies and Wardens and Bearers put down, and descents run in each world.
A line is one row and one `GRIND_COUNTERS` entry saying what a clear ADDS to it,
counted through the one `descentFacts`; the demo plays a real descent for every
counter, because a counter nothing ticks is a grind nobody can finish. The
counts are `Character.grinds`, PER CHARACTER, and **what they have paid for is
DERIVED** — a stored list is one that can disagree. Never a level, so it cannot
be levelled for. Its lines merge into `RunSet.mods` beside the crystals' own and
are weighed by the same `crystalRewards`, so harder is what pays. **Every one
of its 156 nodes is a RULE, the same vocabulary the crystals roll** — no
monster life, no damage, no armour, no crit, no added element and no ward
anywhere in it. **NOTHING IN THE GAME WARDS A DAMAGE TYPE any more**, so there
is no element that is worse to bring; a monster's element is its own ability's,
which is what an Ailment still keys off. Most of it is
danger; the Vein, the Reliquary and the Tithe pay in Rarity and Currency Find
instead, and **what a reward node costs is the ROAD** — it is a danger node you
did not walk to. Per CHARACTER, and it worsens every descent that character
takes.

**You press Enter once, and the button says ENTER** — the rung is picked on the
climb beside it, so naming it there said it twice. A cleared descent launches
the next by itself and keeps going until you die, your bag fills, someone is
waiting at the mouth, a crystal roll runs out, or you say so. All of them end on
the same report and open the same dock. **DEEPER is the one toggle that says how far**,
under the button — `GameState.climbing`, a preference like Hide, absent meaning
OFF, and a DEATH clears it. On, every clear takes the next depth by forgetting
the pick (`advanceRung`) so `furthest` answers; off, a depth can be ground until
the gear is there. The chain itself is not a choice.
**Saying so is ONE BUTTON — Return to camp — and it KEEPS what the descent
found**: *"make it where all the loot on the floor just gets
picked up when you return to camp… you can min max by doing a hard level for a
bit and then returning before you die."* Only DYING banks nothing. What a walk
does not buy is PROGRESS — no rung, no crystal out of the wall, no levelling of
what is socketed, no point — so going deeper than you can finish is a
decision rather than a punishment. "Leave after this run" is gone with it: it
armed a stop one descent ahead, which is the same stop said early.

**THERE ARE NO ROOMS, and a person is FOUND IN THEIR OWN ZONE.** *"Honestly just
ditch all the rooms. I want to encounter them randomly in the maps and they
just say like one thing… then they can be in the camp and you can just talk to
them."* `SceneDef.theme` is where somebody LIVES and they are only ever found
there — a man who turns up in every world lives in none. **THE PEOPLE AND THE
WORKERS ARE TWO TABLES AND ONE QUEUE.** `MEETINGS` in `src/game/scenes.ts` is
every one of them ordered by ZONE and then by the depth each already names
(`SceneDef.rung`, `WorkerDef.rung`), so the order is derived rather than
written a second time where it can disagree — the Lampwright at 2, the smith at
4, Hob at 5. **THE QUEUE MOVES ON A TALE HEARD IN TOWN, never on the meeting**:
`nextMeeting` stops dead at anybody met whose story has not been watched, so
diving from 2 to 9 without coming up finds nobody but the first — *"they only
see black smith until they see him in town and return."* Placed with NO draw,
so whether somebody is down there cannot move a single roll, and in the room
whose NEARER hole is furthest away, which is the middle of the descent and
never beside the exit. Walking past them is the whole meeting:
`SceneDef.greets` goes into the log and nothing stops — and **NOBODY IS EVER
SKIPPED**, because with nothing left to fight an unmet person is WALKED TO
(`stepGreet`), the same shipped policy that opens a chest, and then he walks
out to the exit himself (`stepLeaving`). Afterwards they are in the camp,
and clicking them runs `SceneDef.beats` and then whatever they are FOR: the
Lampwright's crystal, the Lambengolmor's key, the ossuary's and the orrery's
benches.

**BUT TWO OF THEM NEVER COME UP, AND EACH KEEPS HIS OWN ROOM.** *"It doesn't
really make sense to have him come back to your camp — instead once you find him
it should be a separate disconnected area you can enter and its his room… use
the same process that we did for the camp."* `SceneDef.room` is a drawn picture
like the camp's, measured in its own pixels, and it is a TAB on the Fissure
screen past the three zones, appearing only once you have found him — a zone
off the line, with no depth and no way in, so the Enter button goes while you
stand in it. His body is the hotspot and clicking him is the same parley the
camp runs; the Osteomancer's and the Astral-Geometer's benches are reached
there. **HIS TALE PLAYS WHEN YOU WALK IN, AND NOTHING WAITS ON IT** —
`nextMeeting` steps over a room-owner and `owedTale` never asks for one in
town, because a bonus zone nobody happened to open would hold the whole queue
behind him and soft-lock everybody after.

**THE STORY IS TOLD IN THE CAMP, AS A TALE**: the trip up after
meeting somebody opens `TALES` — full-screen art with the words along the
bottom, one panel a click, the camp nowhere on the glass — and watching it is
what marks him HEARD and stands the next person up. *"Nothing important, cool
if you're watching, no big deal if you're afk grinding"* is the descent's line;
the real content is here, where a player is looking. `src/ui/tale.ts` is not a
window and is outside `SCREENS`: it covers the band and the only thing any
press can do is go on. **A PANEL THAT CONTINUES ANOTHER NAMES IT** —
`SceneDef`-style `like` in `scenes.json`, whose shipped PNG goes to the
generator as the style image AND as a labelled reference — because "the same
chamber" means nothing to a generator with no memory and drew the tunnel the
other way. **AND WHAT IT MUST NOT INHERIT HAS TO BE SAID**: a reference pulls a
room over whole, so three of the Geometer's five came back as one picture with
the man moved until the next room excluded the cords by name. Somebody with no
row has no tale and is simply in the camp when you come up; nobody is, today. **A MARK over the head says somebody is holding something** — `wants()`
in `src/ui/talk.ts`, the same question `offer` answers, asked before the
conversation instead of after — so a picture is never swept for the one person
whose mind has changed. The crafting people are never RESCUED: they live down there, and
`greets` says so. The WORKERS are — that is his word for them — and they are
their own table, not scenes. **The one `plan` left is the ANSWERING HALL**, because a boss fight
needs a floor with nothing on it.

**RIMESPIKE IS AN AREA SKILL, AND RIMEFIELD IS THE ONE MODE SWITCH IN THE GAME.**
*"Make rimespike a large aoe spike instead of single target + splash… it does an
aoe hit that looks like one big spike raising up from the ground."* One blade up
under the body it aimed at, everything within 1.9 tiles taking the WHOLE hit, and
the picture is drawn at the radius the SIM used, so Area of Effect grows the
blade. **RIMEFIELD TAKES THE CAST OFF YOUR RATE AND PUTS IT ON A COOLDOWN** —
2.5s, 120% further, 100% more damage, and what it leaves STANDS for 3.5s,
Chilling everything round it every 0.5s. **CLICKED ALONE IT IS A LOSS** — *"the
idea is if you just click it then it should be worse than not"* — measured at
band 4 over six crystal sets, 20% under a bare tree; what buys it back is Skill
Cooldown, 48% OVER at the 84% a full set of the line rolls, against
`STANDING.leastCooldown` of 0.15 set under that so stacking pays all the way.
**AND WHAT THE CHILL IS FOR IS THE FREEZE.** Eight stacks freeze a body and
nothing casts fast enough to reach that bar; the standing spike does. Measured
over one band-5 descent: 1 Freeze on a bare tree, 9 walking Deepfreeze, 331 with
the spike standing under it. HOARFROST is the third leg — *"the passive that
shoots frost at targets that are chilled so that the aoe chill application can
become a source of damage"* — 1.77 to 2.03 kills/s with the mode feeding it and
nothing at all without one. **THE SPIKE'S CHILL GOES DOWN THE ONE-STACK PATH**:
`applyAilment` is the CLOUD's and writes a Poison whatever type it is handed.

**THE BLADE IS GENERATED ART; THE RING UNDER IT IS BLOCKS.** *"Use pixel lab to
make a cool looking ice spike not whatever that is."* The spike a Rimespike
raises is a `VFX_ART` row like the burst's shards — asked through `vfx.json`,
imported by `portrait.mts <id> <png> 48 vfx`, drawn by Pixi pinned at its FOOT
and sized off the radius the sim used. What the picture cannot carry is the
damage TYPE, so the broken ground at the rim stays `FirePixel` blocks in the
type's own colour, exactly as the burst is drawn. `spikeAlpha` works in SECONDS
rather than in a fraction of a life, so a blade that stands for four is the same
blade coming up at the same speed and held.

**A FREEZE HOLDS A BODY STILL, AND FOR A LONG TIME IT HELD NOTHING.** A
monster's `Entity.stun` — what a Freeze writes, and a Pin, and the boss's Fall —
was written by three things and READ by none: `stepMonster` never asked, so a
Frozen body swung and closed exactly as before while every card said it could
not. It is one early return beside the Stun's now, and the seconds run down
there. Measured: a body Frozen for 2s moves 0.00 tiles and takes 0 life off you.

**AND A NaN NEVER CRASHES — IT MAKES A BODY UNKILLABLE.** A passive's scale read
off a key nobody wrote made `damage` NaN, `m.life -= NaN` made the body's life
NaN, and nothing could ever kill it again: a descent that cleared in 4,594 ticks
ran 27,000 with 221 bodies standing and no error anywhere. `afterResistance` is
the one seam every damage path goes through, and it refuses a number that is not
finite.

**SHARDFALL IS THE SHAPE A PASSIVE IS MEANT TO BE** — *"another passive could be
enemies that die while frozen shoot some ice crystals out nearby targets. Make
it projectile tagged spell. Add mods to weapons and gloves that are +1-2
projectiles and then you can make an entire build out of that with any skill
basically just convert to cold and add cold ailment chance."* A body dying
FROZEN throws crystals at what is near it; they are Projectiles, so
`extraTargets` from anywhere buys another, and Spells, so a cold sheet scales
them. **A TIER MAY CARRY ITS OWN SWITCH** (`ModDef.tiers[].grants`), which is
what makes `+1` and `+2 Projectiles` two rungs of ONE modifier — on a WEAPON and
on GLOVES, the two slots a build has one of. Measured on a Freeze build at band
5: 0 crystals without the passive, 221 with it, 294 with a Projectile line on
the gloves, and 1.93 to 2.07 to 2.18 kills/s. **THIS IS WHAT MOST NODES ARE FOR**
— *"this is kinda what I want most nodes to be like, some cool path to figure
out a unique build."* Nothing in it is new content: Transmutation, Chill chance,
Deepfreeze and the standing spike were all already there.

**TWENTY-FOUR PASSIVES, THREE A DAMAGE SKILL, AND EVERY ONE IS A TRADE.**
*"We need to add some more ideally like 3x the number of damage skills because
you get three passives so we need some variety."* Sixteen became twenty-four:
**Brink** (65% more damage and 30% less taken under 35% life, 20% less above
it), **Glass**, **Reaping** (a kill restores a tenth of a pool 35% smaller),
**Zealotry** (55% more damage over 70% mana, every use costing 70% more),
**Aftershock** (every Ailment tick dealt again 2.2 tiles round the body carrying
it, Ailments 40% shorter), **Bulwark** (no hit takes more than 10% of your
maximum life), **Quickening** (six kills is 60% increased Attack and Cast Speed)
and **RIMEHEART**, which Converts everything you deal to Cold — the one that
makes any skill a Cold skill, since two of the eight trees sell no Cold node at
all. **A PASSIVE'S BOTH HALVES ARE ITS OWN `grants`**, never a stat line, and
each new switch has exactly ONE read site: `damageScale`, `takenScale` and
`lifeScale` are the three generic multipliers, `atBrink`, `flushMore`,
`ailmentShare`, `killTempo` and `hitCap` the five rules. Measured at band 6,
every one moves a run: −8% to +6% on the kill rate, and Reaping is the only one
that clears 5 of 5. **AND A HERO NEVER CARRIES AN AILMENT** — `applyTyped`
returns unless the attacker is the hero — so a passive answering one is dead
content, which is what an Ironclad drafted round `secondSkin` turned out to be.

**A BRANCH ENABLER'S OWN STAT LINES ARE ITS OWN, AND THE BUILDER DROPPED THEM.**
`buildTree` copies a node a field at a time, so a field it forgets is a card
printing a figure the sim never applies — six enablers across three trees shipped
that way, Ambush's Edge and Footing among them. The demo holds every spec node's
stats COUNT and grant KEYS against the built node now.

**EVERY SINGLE-TARGET SKILL SPLASHES, AND IT IS BAKED IN.** *"The game revolves
so much around aoe clearing and single target only being one small part of it,
every skill should have at least a little AOE baked in. If we don't then
literally every single person playing Strike is going to click Echoes and
Repeats until you have good clear and then maybe have 5-10 points to get
damage."* `SPLASH` is `share` of a hit onto everything else within `radius` of
the body it landed on, and `SkillDef.splash` is on every hero skill with a
single-target delivery and on nothing else. **IT IS PER SKILL, AND THE TRADE IS
SHARE AGAINST RADIUS** — *"some skills might be less damage for a larger area
and others can be more damage for a smaller area"* — so `SPLASH` is a table
keyed by skill id: Strike 45% within 0.9 tiles, Rimespike 25% within 1.4,
Fireball 35% within 1.3, Lightning Arrow 30% within 1.1, Arc Lightning 20%
within 1.0. **What a skill already reaches for free is the other half of the
price**, which is why Arc Lightning's three Arcs buy it the meanest splash of
the five. **EVERY CARD SAYS ITS OWN TWO FIGURES**, and the demo fails a skill
whose description does not; the KEYWORD names the spread instead of a number,
read off the table rather than typed. **AMBUSH IS THE
ONE EXCEPTION** — *"it can be an exception since it can scale its speed so
much"* — so its Pace branch is the rate itself and what a kill is worth. **A MONSTER NEVER
SPLASHES**: a second unweighed source of damage is one no danger number
accounts for. `splashShare` ADDS and `splashRadius` MULTIPLIES, both ordinary
grants a tree, a trade or gear can hand over, and the radius goes through
`areaRadius` so increased Area of Effect from anywhere widens it.

**THE EIGHT START ROUGHLY LEVEL, AND IT IS MEASURED BARE.** *"If they have
similar starting power it doesn't need to be exact but roughly similar, then
they should scale roughly the same since they should have access to all the same
stuff."* The yardstick is a character with NOTHING — level 1, no trade, no
points, no gear but the weapon the skill itself comes down holding — at DEPTH 4
of The Shallows, which is the shallowest floor that separates them: the first is
cleared by all eight and past the sixth none of them lives. Measured, they kill
0.31 to 0.44 a second, **1.44x between the best and the worst** against 2.79x
before, and put down 64% to 84% of that floor. **THE SHEET DOES NOT PREDICT
IT**: single-target DPS runs 58 to 153 in a different ORDER, because what a
skill reaches for free is half of what it is worth. Two were levelled to get
there — Lightning Arrow, the only one holding a two-hander, from 58 damage to
48, and Blight, the slowest by 1.7x, to a 1.1-tile cloud over 5 seconds at 155.
**A LEVER THAT MULTIPLIES IS THE WRONG ONE**: Blight's radius fixed the bare end
at 1.6 and took an INVESTED build to 5.93 kills/s against everybody else's
3.5–4.3, because area is what a tree already sells. Every bare-end change is
checked at the deep end too. **AMBUSH IS THE ONE THAT SITS APART BARE**, at 39%
of the floor on a kill rate inside the band: it steps BEHIND what it hits, so it
fights every pack from inside one. That is its delivery, it is printed rather
than tuned away, and **WHAT ANSWERS IT IS THE BUILD** — 100% Critical Chance
(157% is reachable) turns every use into a Relay, and reduced Skill Cooldown
then drives the follow-up. Measured at the deep end: 1.44 kills/s on a random
tree walk, 1.84 walking the Relay branch, **2.79 with the line stacked on top**,
which puts it in the pack rather than 1.9x below the next skill.

**A MOVER HAS TWO MODES, AND THE SECOND ONE IS WHAT TELLS THEM APART.** *"They
should still all work to just traverse the area faster when not fighting but
when actually fighting it should work as described."* Out of a fight all three
cover ground along the path already found; with something alive inside
`MOVE.engaged` they stop travelling entirely and do their own thing, which is
what keeps a kite's cooldown for the moment something lands a hit. **BLINK
KITES**: it fires when a body is within `MOVE.reach` AND has hit you inside
`MOVE.pressed` seconds — being HIT is a fact about the fight where a bare
distance is a condition on the pathfinder — and it steps the other way, leaving
its WAKE where it LEFT rather than where it lands. **LEAP DIVES**: off cooldown
onto whatever you are fighting, and what it comes down ON takes its own Slow
beside the ring's. Measured over six descents, every combat Blink opened ground
and 16 of 18 combat Leaps closed it. **GALE NEVER STEPS AT ALL**: it holds
GUSTS, movement speed for each one held, one taken by anything that lands a hit
and one back every 6s — so out of a fight you are quick and in one you are as
quick as you are untouched. A flask's CHARGE and a mover's GUST are two words
because they are two mechanisms. Measured at band 4 with no point spent in any
of the three: 2.18 kills/s and 2555 damage taken with the slot EMPTY, against
Blink 2.28 and 2291, Leap 2.58 and 2478, Gale 2.38 and 2287 — the dive kills
fastest, the kite and the Gusts are what stop the floor reaching you. **THE THREE WEBS ARE TREES NOW**, six branches
and 30 points each, and `MOVE_POINTS`, `MOVE_SKILLS`, `pointCapFor`'s special
case and the bespoke movement layout are all gone.

**A MOVER'S OWN VOCABULARY IS THE WINDOW AFTER A USE** — *"stats in the movement
skills is fine as something you get for a few seconds after the skill's used."*
`AFTER.seconds` is the ONE length and `afterStepLonger` is what stretches it;
four seams and no more, each read in exactly one place: speed in `paceOf`,
damage in `dealDamage`'s scale, damage taken in `softened`, and regeneration in
the hero step. **AND `moverReading` IS THE WHOLE OF WHAT A MOVER IS**: the sim
moves by it, the sheet's hover prints it and the demo fingerprints it, so a
notable that changes nothing there changes nothing in a descent.

**A MECHANIC IN SEVEN TREES IS NOBODY'S IDENTITY, AND MOMENTUM IS DELETED.**
*"Honestly momentum kinda sucks. I feel like it only makes sense on a skill that
attacks super fast already but we don't really have that."* It was one identical
branch — enabler, three notables, a minor, the same four grants — in seven of the
eight, and nothing in the game swings fast enough to build it. **EVERY TREE NOW
HAS A BRANCH ONLY IT COULD HAVE**: Strike's HEFT pays up to 30% for the swing
rate falling under the fastest weapon's 1.55/s (`FASTEST_SWING`, derived off
`WEAPON_RATE`) and its CLEAVE carries a killing blow into the next body; Ambush
CULLS anything a hit leaves under 8%; Shockwave's cone leaves BROKEN GROUND on
the Cloud's own seam; Fireball's BACKDRAFT eats the Ailment and lands what was
left, and its DETONATION chains Bursts off the dead; Arc Lightning's chain
RUNS AWAY, each Arc worth 25% more than the one before instead of 30% less;
Lightning Arrow PINS what it hits on `Entity.stun`, the seam a Freeze already
writes; Blight HARVESTS, a dying body passing its Ailment on. **TWO OF THEM
ARGUE WITH THEIR OWN TREE ON PURPOSE** — Heft pays for the attack speed Strike's
other four branches sell, and Backdraft is worth nothing unless Kindling lit the
body — because a branch that only ever adds is a branch every build takes.
**MOMENTUM'S SEAM SURVIVES AS `heft`**, what a use is worth before any target is
looked at, and it reaches EVERY body the cast touches where Momentum reached the
aimed-at one alone. **AN OBJECT GRANT NEEDS THE `bag` MERGE**: without it a
notable saying "a further 25%" replaces the enabler's whole bag and is a
downgrade the tooltip cannot show.

**A SKILL'S OWN TREE BUYS WHAT THE SKILL DOES.** *"Remove all the flat stats
that aren't related to the skill. So like health, armour and stuff like that —
attack and cast speed, crit etc is all fine."* A web may sell `damage`,
`attackSpeed`, `castSpeed`, `critChance`, `critMultiplier`, `attackRange`,
`areaOfEffect`, `ailmentChance` and `manaCost` and NOTHING else; a MOVEMENT web
adds `moveSpeed` and `cooldown`, which are its own subject — how fast you cross
ground and how often the skill comes back. Life, armour, resistances,
regeneration and the mana pool are gear's and the character's own web — a branch
of them inside Strike is six points that change nothing about striking. The
three defensive branches are gone: Strike's and Ambush's and Rimespike's are
SPILL, Shockwave's is SPREAD. **Every node id is kept**, because a save points
at them.

**CRIT CHANCE IS THE SKILL'S, and gear only SCALES it.** `SkillDef.critChance`
is what a skill crits at bare — 4% for Arc Lightning, 25% for Ambush — and every
crit line on a piece of gear is *increased* Critical Chance, so 10% base and
100% increased is 20%. FLAT crit stays a tree and trade line, which is what
keeps a web able to change what a build is capable of rather than nudging it.

**A FLOATING NUMBER IS PALE ON A DARK EDGE, AND THERE IS ONE A BODY.**
`floaterInk` in `render/renderer.ts` is the one seam: green is life arriving (a
pickup, a heal), `--hurt` is life leaving, citrine is coin and a Critical, and
ordinary damage is bone — dark on khaki was invisible at ship size, three
critics said so, and the user's word was to do what they say. **`bank()` in
`src/sim/run.ts` is the only way one is raised**: a live number of the same
sort on the same spot takes the new damage and starts its rise again, because
a pool ticking eight times a second printed a column of figures up the body it
was killing. **It is sized off the TILE and capped well under a body** — a
number taller than what it happened to was the biggest thing in a fight.
**NOTHING IS DRAWN UNDER A BODY AND NOTHING ON ITS EDGE.** A contact shadow
was drawn under every body and DELETED at the user's word — *"there is a shadow
behind the character looks weird just remove it"* — so a body meets the floor
on its own art alone. A lamplit rim was tried on every body and
DELETED — *"it's eating into their art instead of adding a border"* — because it
recoloured the body's own outermost pixels, which is the silhouette. A rank's
`glow` lies OUTSIDE the art and is the only light a body wears.
**An IDLE is a breath,
never a gesture**: `idleTravel` measures how far a body's inked box shifts
between idle frames and anything past `IDLE_CALM` holds its first frame, so the
loud few stand still while the calm majority still moves.

**Every damage type leaves something behind.** `AILMENTS` in `src/data.ts` is
one row per type — Burn, Bleed, Chill, Shock, Poison, Curse, Exposure, and
Prismatic deliberately none. Dealing the type applies it, at a chance you BUY
and never get free; past 100% you apply a second. A damage ailment scales by its
OWN tags and nothing else, so Spell, Attack and Critical never reach one, and
crit is out of them in both directions — it comes back only as the guaranteed
Critical on a body thawing out of a Freeze. **A MARK'S SIZE IS IN TILES AND
NEVER THE BODY'S** (`MARK_R`): keyed off `scale`, a boss wore a slab of sky
blue where a beetle wore a speck.

**A MONSTER'S HIT LEAVES ONE TOO, AND IT IS A SHARE OF THAT HIT.** *"Mobs should
begin to apply ailments."* The Ailment is of whichever half of the hit landed
hardest, and it is worth `MONSTER_AILMENT.share` — 1.2 — of that hit over its own
run. **Riding the hit is the whole of what keeps it inside the danger already
priced** — a flat dps would be 26 a second at the bare Fissure and 26 at the
bottom of The Rot, which is the unweighed second source the old rule was written
against, and it is why there is no `DANGER_STATS` row for it.

**AND THE CHANCE IS A STRAIGHT LINE IN DANGER, FROM NOTHING TO OVER 100%.**
*"For monsters applying ailments start at 0% and scale up to a lot at really
high difficulties. Like over 100% at top end."* `monsterAilmentChance` is
`MONSTER_AILMENT.atTop` of 120 across `topDanger` of 820, and it is **UNCLAMPED**
— `POWER.max` is what a run may DROP where this is what it does to you, so a
souled climb keeps climbing. Measured down the climb rather than across the drop
bands, which top out near 240: **0% at the bare Fissure**, 15% at Shallows d6,
32% at d12, 97% at Rot d8 and **120% at the bottom, where a hit leaves TWO** —
`floor(chance/100)` outright and the remainder rolled, the hero's own rule read
the other way. At d12 it is 37% on top of what reaches you and takes the
low-water mark from 32% to 14%. **A FREEZE IS STILL SOMETHING YOU DO** — nothing
hero-side reads a hold, so a Chill on him slows and never Freezes, which would
be a wall with no answer.

**AND THE ANSWER IS ON GEAR, IN THE RESISTANCES' OWN SHAPE.** *"Maybe it should
be specific to certain ailments but a large percent? Like reduced elemental
ailments 10–50% based on the tier so get two perfect rolls and you're good for
elemental or 3 decent rolls. And then if you only care about like say just fire
have one be 50–100% so one perfect roll for a single one."* So a SINGLE line and
a GROUP line, exactly as a Fire Resistance sits beside an Elemental one:
`fire_inurement` rolls 50–64 / 66–82 / 85–100 by tier, so **one perfect roll
ends Burn outright** and a middling one never does; `elemental_inurement` rolls
10–18 / 20–32 / 36–50, so **the whole group takes two perfect rolls or three at
the bottom of the same tier**. `ailmentWardsFrom` reads own plus group and caps
at `DEFENCE.ailmentWardCap`, which is `resistancesFrom` in every particular, and
**both families are DERIVED off the Ailment table** — a new Ailment is a row and
never a list to keep in step.
**`hide(entity, type)` IS THE ONE SEAM** for what an Ailment is worth into a
body, asked wherever one does something: the tick, the Chill's slow and
Exposure's own multiplier on a hit. The Warrior's `secondSkin` folds there and
nowhere else — dead content while nothing could Ail the hero, live for the first
time now. **AND `ailmentWeak` IS THE HERO'S OWN**, so it reaches a monster
alone: Contagion softening what a monster left on YOU was the same seam read
from the wrong end.

**THE OFF HAND TAKES A SHIELD OR A SECOND ONE-HANDED WEAPON.** A pair puts
`DUAL.main` of one and `DUAL.off` of the other into every hit — 1.30 between
them, which is what a shield's armour and its Block are given up for — and the
rate ALTERNATES: this swing at the main hand's, the next at the off hand's. So a
dagger beside a maul is a fast swing and a slow one rather than an average
nobody can see. `attacksPerSecond` is their EVEN mean, `2 / (1/a + 1/b)`, which
is what two swings actually take, so the sheet prints one number and a long run
agrees with it. A two-hander is never in the off hand; `handClash` empties the
other hand instead. **A pair is ORDERLESS in art and ORDERED in stats** —
`variants()` sorts it, so which hand you filled never asks for a second picture.

**THE CAST HALL IS FOUR PICTURES, not four bodies.** *"Is there anything wrong
with just having static high quality images for the character select screen? As
long as they are fairly similar to the existing character models?"* — there is
not: the camp, the title and every portrait already ship as generated stills in
a `generated-*.ts`, and "no binary assets" means no image FILES. `GENERATED_CAST`
is one 128 still a trade, drawn where the body is 48, because this is the only
screen that shows a man at four times his ship size. **IT IS ASKED WITH THE
BODY'S OWN WORDS AND THE BODY'S OWN INKS** — `tools/art/cast.mts` forces the
palette with a swatch of `GENERATED[sprite].key`, where `design` forces the
roster's shared one and returned a blue-robed man in brown — so a picture cannot
drift from the model it stands for. **The idle breath is GONE with it**: *"the
idle thing honestly looks bad."*

**A character is a trade, a main skill, two more slots and a bag.** Making one
is a trade and a NAME, and then you are STANDING IN THE CAMP holding the weapon
that skill wants — *"It should just be you pick character/name/skill and land in
the town."* **A TRADE COMES DOWN HOLDING SOMETHING** (`TradeSpec.skill`, equipped
where the trade is taken and never in `takeUpTrade`, which a later trade CHANGE
also runs), so the welcome asks the one thing the cast hall cannot: eight skills
offered before anybody has seen one work was the same question twice. There is
no opening room; `armForSkill` is what puts the weapon
in your hand. The trade is what the hero LOOKS like; it is funded
by character level out of its own budget, so it survives every skill you swap.
Four of them: potions as an engine, mana as one, **what is in your other hand**
(a shield's Block against a two-hander's swing — Mahthar's whole web), and
**TWO WEAPONS**, which is Obreth's and which nobody else may hold at all.
**DUAL WIELDING IS ONE TRADE'S PRIVILEGE** — `TradeSpec.dualWields`, read
through `canDualWield` and nowhere else. Obreth and the Lambengolmor are both of
**the Obsidian Order** (`ORDER`), who hold that the rock is writing.

**EVERY TRADE GIVES SOMETHING FOR NOTHING**, which is what tells two of them
apart in the first hour rather than at the point cap. `TradeSpec.baseline` is
one `short` line — what the cast hall picks on — and a grants bag merged by
`tradeGrants` BEFORE anything walked, so the free half reaches the sim, the
sheet and every card through the one seam, and a summed grant a node also
carries ADDS to it (the Aether Ward is a bigger version of the ward you had).
The web's MIDDLE prints the specific line, off each grant's own `say`. The four
are in `TRADE_BASE`: the rogue holds two weapons, the Alchemist's flask
**Charges come back on KILLS** (`chargeOnKill` — never a clock, or a build
grinding one tanky body down would have permanent regeneration for nothing),
the Aethermancer's pool refills as a SHARE of itself and eats 10% of every hit,
and a Warrior's heavy blow **Stuns**.

**A STUN IS WHAT A HEAVY BLOW DOES**, and the chance is the share of the body's
own MAXIMUM life the one hit took (`stunChanceFor`, `WARRIOR.stunPower` — 3% at
a tenth, 72% at four fifths). **A hit that KILLS always Stuns**, because what a
Stun sets off has to fire on a body taken down in one: a build strong enough to
one-shot would otherwise lose the branch it spent points on exactly where that
branch is working. A Stunned body neither swings nor closes and its cooldown
still runs down, so a Stun is time off the fight and not a free swing at the end
of it. Rolled only where there IS a Stun, or every hero swing would spend a draw.
Its web is five spokes of TEN — one minor, a GATE everyone on that spoke takes,
then a fork into two branches of minor, notable, minor, notable. **Every notable
sits at an EVEN step from the middle and points come TWO AT A TIME**, so a grant
is always a minor and the notable behind it and the last pair finishes a branch
instead of stranding you short of its tip. Six points against fifty nodes: one
branch whole, three notables, and the fork is still a decision at the cap.
Eight main skills, each with its own tree; a mover and THREE passives fill the
other slots, the mover having a nine-node web of its own. **A passive changes a
RULE and pays for it**, and the second and third slots open at levels 20 and 40
of the 99 there are. **SIX ATTRIBUTES**, bought per level: Strength,
Intelligence, Dexterity, Acuity, **Spirit** (life and mana regeneration) and
**Constitution** (Armour, Elemental and Occult Resistance). **A TRADE COMES DOWN
WITH A SPREAD OF ITS OWN** — `TradeSpec.attributes`, 6 to 15 an attribute and 57
in all, so what separates two trades in the first hour is the SHAPE rather than
the total. It is never in `Character.attributes`, which is what a respec hands
back. `attributeTotals` adds the three sources — the trade, the points spent,
what is worn — and **the sheet prints that total**, so the number shown is the
number that lands. Every use costs mana; out
of mana you are STARVED, not stopped — unless a passive took the pool away, and
then life pays.

**A boss is fought by your BUILD**, like everything else — a cycle of phases
drawn on its own body, and what answers them is what you are wearing. Move speed
and a movement skill carry you out of a slam; enough plate lets you stand in one;
a build with neither does not come back up. It is the barrier between tiers.

## Shape

```
src/data.ts        every table: mods, currencies, bases, skills, monsters, bosses
src/types.ts       the shapes
src/keywords.ts    the vocabulary, and what is BANNED
src/mods.ts        capacity, allocation, rolling
src/crafting.ts    THE BENCH: what may be chosen, what it costs, what a dismantle pays
src/economy.ts     prices
src/webgraph.ts    how ANY web is walked: reach, refund, replay
src/skills-tree.ts per-skill webs; src/trees/* is the content, layout.ts the shape
src/trades.ts      the character's own web; src/trades/* the three trades
src/ui/webcam.ts   how ANY web is panned and zoomed, and why it is built once
src/moves/         the three movers' trees; src/sim/movers.ts what one COMES TO
src/ladder.ts      the CLIMB: which rung is open, and what a clear records
src/trials.ts      the RECKONING and what a point buys; src/trials/* its arms
src/game/trials.ts the LEDGER: what a clear counts, and what that has paid for
src/scenes.ts      the PEOPLE and the one arena; src/scenes/camp.ts the picture
src/vignettes.ts   what the rock does: cover, growth, solidity
src/sim/           the deterministic simulation
src/sim/grants.ts  every switch anything may hand the sim, and who reads it
src/sim/grid.ts    generate and carve a map; sceneMap beside it
src/game/          save, state, report, crystals, scenes, graft
src/game/work.ts   PROCESSING: what a station is working on, and what a clear moves
src/professions.ts what a LEVEL buys, derived from the table that enforces it
src/game/forge.ts  MAKING A BASE: the recipe off the base, the window off the level
src/render/        renderer seam: canvas2d fallback, pixi default
src/render/generated-*.ts   art as data — never edited by hand
src/ui/            one module per screen; talk.ts is a person in the camp
src/ui/builder.ts  THE LEVEL BUILDER: paint a floor with the real sets and props
tools/art/         the generator, over MCP: bodies.json asks, generated.json answers
tools/*-peek.mjs   screenshots off the committed bundle; plan-peek draws a builder plan
tools/act-floors.mts  where the FLOORS are in a cross-section, to place a depth on one
src/demo.ts        the checks; src/mods-check.ts the modifier sweep
```
