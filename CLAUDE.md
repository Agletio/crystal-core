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
  pack. Measured, the second is 1.4× the first at band 1 and 3.0× at band 6 —
  so anything tuned until the floor dies is off by that much, which is what
  made the whole game clearable at 89% life or better. **Anything measuring
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

**A CHAMBER MAY STAND A LEVEL UP, and nothing is ever stacked.** *"Raised only,
no levels stacked on top of each other."* `SHELF` is a chamber's floor a level
up, walkable; `RIM` is its edge band and NOBODY WALKS IT — with a per-cell
`walkable` that one rule keeps the two levels apart for every mover, the
pathfinder, line of sight and the separation push at once, where an edge rule
would have to be taught to each and a knockback would still shove a body off a
cliff; `STAIR` is a rim cell you climb through, its foot the ground cell beside
it. A room is raised WHOLE (`raiseRooms`, off the room graph and never off
noise contours, which give rings nobody can reach), never the hole's room and
never the way out's, only one with room for an interior inside its rim. **ROCK
COUNTS AS HIGH**: a shelf against the wall has no rim there and its set draws on
under the rock, which wins at any corner the two share. The shelf is drawn by
`SHELF_SET`, the zone's floor as both terrains with the cliff tool's full-tile
face, keyed by the SAME 21 corners the rock is (`wangKey(grid, x, y, high)`), so
`fitShelf` mends a step the set cannot draw by FILLING the notch rather than
shrinking the shelf — demoting alone ate a chamber's south half row by row.
**The stairs are the proof of reachability**: at the corridor MOUTHS first, then
south faces, then any straight rim, joined by union-find until every walkable
cell is reached from the hole; what is still cut off is dug to through rock and
a shelf nothing reaches comes down. A south stair carries the tall face, the
other three a flat run of the same treads (`stair_e`/`stair_w` are the south
picture turned at import — a TILE is never turned, a flat prop may be). `RAISE`
is the share of a world's chambers that stand up and **IT SHIPS AT ZERO until
the user has judged the shelf on a floor** (all four worlds have a set); `raiseShare` is the
dev kit's override (`#dev-shelves`, `SHELVES=1` on `descent-peek`) and what the
demo forces to prove every seed. Measured with every eligible chamber up: 2.8
of 7 rooms a Fissure map stand, and a descent over them still ends.

**A FLOOR IS ONE TILE AND THE WASH IS WHAT VARIES IT — AND THE WASH IS NEVER
PER CELL.** A set holds one pure floor tile, and two thousand of it read as
wallpaper; measured, three of the four ship almost perfectly flat (a spread of
2.3 to 5.6 luma, a wrap seam of 1 to 4), so the tiles were never the problem.
**NOTHING IS TINTED PER CELL any more** — not the floor, not the shelf, not a
pool. Every tile is drawn at full strength and `groundWash` is multiplied over
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
the water — and nothing wet takes a stair's foot or a face cell.

**THERE IS NO FILTER, because there is nothing to filter.** A clear banks the
LOT; what you do not want is dismantled at the anvil or sold across the counter.
`KIND_VARIETY` is what weights a drop's KIND now, AUTHORED and never counted —
counted off content volume, ten ring implicits took rings to 39% of every drop.

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
`.tier`, read by `runSet` whenever a descent names a depth. The Answering is the
Fissure at tier 1, The Refraction the Cavern at tier 2, The Flowering the Rot at
tier 3 — *"T2 in the second area t3 in the third."* `LadderZoneDef.id` is the
save key under `character.climbed`, still spelt the way the worlds were.
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
cleared. **The Fissure window is ONE COLUMN and nothing on it scrolls** — the
map is the screen, so the seam is sized off the room LEFT rather than off the
viewport, and `shots` fails the screen if it needs scrolling. Every station is
placed in PERCENT of the picture, so a rung cannot drift off the chamber it
sits in.

**THE PROVING GROUND IS THE FOURTH TAB, and the sockets are ITS.** *"Once you
finish the first three runs of each zone you end in a 4th tab that only has one
area and its where you can socket the crystals. The other menu can just remove
the crystal sockets and take up more screen with the map and the 4th screen can
have the crystal sockets laid out like the fissure entrance in the camp on top
of the map."* So the socket column is gone from every other tab and the four
lie OVER this one's picture, positioned rather than in flow. It is one AREA and
not a depth — `Proving` beside `Rung` in `RunWhere`, and `isProving` is the only
read — so nothing about it is climbed, recorded or advanced. **THE INFLUENCE IS
PICKED HERE AND IT WINS**: it decides the world and the picture (that world's
own act art), while what you SOCKETED still decides the packs — *"as you mix and
match crystals you can still get the other types to join by that method but the
zone will stay what your influence is."* `GameState.influence` is a preference,
healed against `PROVING.influences`, which are three and never the Seam.
**Its difficulty is a FLOOR above the whole climb**: `provingMod` scales the same
`LADDER.*AtTop` a depth does, by `PROVING.overTop` plus `perSocket` a filled
socket — measured, 1028 danger empty against the deep end's 822, and 1520 on
four blanks. **points scale it through the Reckoning's own lines**, which
already merge into the seam; counting them again here would pay for one web
twice. It opens on `paidCampaign`, so the tab and the first crystal arrive
together.

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
FAMILY (Normal / Demonic / Prismatic) picks which monsters spawn and which
world you walk into. **THE SEAM IS THE ONE WORLD A LEVEL BUYS OUTRIGHT**:
`seamSocketed` is `PROVING.seamOf` of each aura world at the TOP level and
NOTHING else in the wall — *"socketing 2 lvl 4 prismatic and 2 lvl 4 demonic
gives you the seam which will be the final zone."* It is the only thing that
overrides the Proving Ground's influence, and the only world you cannot pick. Danger and socket
count fold into one **run power**, and every reward reads that and nothing else.
A fifth socket takes a **boss key**.

**NOTHING IS PAID UNTIL THE CAMPAIGN IS WHOLE, AND THE LAMPWRIGHT IS WHO PAYS
IT.** *"You shouldn't see any trial stuff or even receive any crystals until
you've cleared the entire campaign."* `campaignDone` is every zone climbed to
its own boss, and finishing it pays NOTHING on the report: `CAMPAIGN_REWARD` —
one crystal and the first 10 points — is a third thing `giftWaiting` holds,
taken in his own scene in the camp, which is what makes him the person the
campaign ends at. `Character.paidCampaign` is set by the HANDOVER and read by
`trialPointsFor`, so the points and the crystal arrive together and a re-grind
pays nothing. **The finish line is SAID before you get there** — `campaignLine`
on the climb names the depth that ends it and quotes `campaignPrize`, because a
reward nobody can see is a reward nobody is climbing toward. The web is on
screen from the first descent, with nothing on it walkable: a plan you cannot
see is a plan nobody makes.

**The Lampwright owes the weapon, the FIRST crystal, the campaign's reward and
every step of the CRYSTAL LADDER**, and nothing else. **THE LADDER IS THE WHOLE
OF WHAT THE ENDLESS HALF PAYS**: *"Normal crystals pay out at 25/50/75/100 runs
of this new zone. Prismatic crystal pays out and full lvl 4 normal crystals,
then another at level 2 prismatic, another at level 3, another at lvl 4, and
then the same thing for demonic."* `CRYSTAL_LADDER` is those twelve steps IN
ORDER — a step further up can never pay before the ones under it — each holding
either a count of `GameState.provingClears` or a number of crystals you already
hold at a level. Levelling one is the only way past the fourth, so the ladder is
the Proving Ground and the sockets pulling on each other. Measured, the twelve
come to 184 Proving Ground clears. Taken in person like every other crystal,
with `gaveStep` in `given` as the one cursor.

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
COUNT it clamped to full on every smaller base — 80% of deep drops arrived with
no room, and a Shard of Making needs `has_open_slot`, so the one currency the
shelf sells was refused by almost everything the floor dropped. **The item you
save currency for is one with good lines and room to add**, which is the whole
of what makes scarce currency a decision rather than a tax — *"the currency
needs to be rare enough you need to wait to find an item that's good enough to
start using it on."* **A SHARD IS A DECISION ABOUT ONE PIECE**: measured, the
bare Fissure pays 0.21 a clear, and the counter's first one is several descents
of saving.

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

**MATERIALS DECIDE WHAT AN ITEM IS; CURRENCY DECIDES WHAT IS ON IT.** A craft
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

**THE BENCH IS AN ANTI-BRICK, NOT A SUPPLY.** A Shard of Making at 5 flat gold
was 6,072 a clear at the deep end, so a found piece's rolled lines were worth
five gold apiece and the floor could never beat the bench — *"an item with no
mods could be better than one with 3, you just need to click the currency."*
`Recipe.goldPerIlvl` rides the counter's own item level instead. **A CONSTANT
PRICE CANNOT THROTTLE ANYTHING**: a clear banks 54 gold at the bare Fissure
against 30,359 at the deep end, so one number tuned to cost a clear at the top
is 560 clears at the bottom and a new character could never buy one.

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
bodies and Wardens and Bearers put down, and descents run under each influence.
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
benches. **THE STORY IS TOLD IN THE CAMP, AS A TALE**: the trip up after
meeting somebody opens `TALES` — full-screen art with the words along the
bottom, one panel a click, the camp nowhere on the glass — and watching it is
what marks him HEARD and stands the next person up. *"Nothing important, cool
if you're watching, no big deal if you're afk grinding"* is the descent's line;
the real content is here, where a player is looking. `src/ui/tale.ts` is not a
window and is outside `SCREENS`: it covers the band and the only thing any
press can do is go on. Somebody with no row has no tale and is simply in the
camp when you come up. **A MARK over the head says somebody is holding something** — `wants()`
in `src/ui/talk.ts`, the same question `offer` answers, asked before the
conversation instead of after — so a picture is never swept for the one person
whose mind has changed. The crafting people are never RESCUED: they live down there, and
`greets` says so. The WORKERS are — that is his word for them — and they are
their own table, not scenes. **The one `plan` left is the ANSWERING HALL**, because a boss fight
needs a floor with nothing on it.

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
blue where a beetle wore a speck. **Ailments are the HERO'S**: a
monster's difficulty is what a crystal rolls, and a second unweighed source is
one no danger number accounts for.

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
src/crafting.ts    CONDITIONS / EFFECTS registries — currencies are data
src/economy.ts     prices
src/webgraph.ts    how ANY web is walked: reach, refund, replay
src/skills-tree.ts per-skill webs; src/trees/* is the content, layout.ts the shape
src/trades.ts      the character's own web; src/trades/* the three trades
src/ui/webcam.ts   how ANY web is panned and zoomed, and why it is built once
src/moves/         the movement webs
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
tools/terrain-proto.mts  the standalone reference for the terraced generator
src/demo.ts        the checks; src/mods-check.ts the modifier sweep
```
