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
| `npm run smoke` | ~10s: headless boot and interaction |
| `npm run demo` | ~2min: sim, economy, trees, balance |
| `npm run shots` | ~5min: all 30 screens against a checklist |
| `npm run drag` | ~20s: the dock reorders, a window goes where you put it |
| `npm run peek` | a descent, at a zoom, a pan, a crop, a skill, a burst of frames |

**Run what the change can reach, not the whole suite** — the table is in the
`harness` skill, along with every quirk and flake. Build before `smoke`,
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
  animations or additional generations for characters."* The grids already
  in `src/ui/icons.ts` are what shipped before there was a generator; they are a
  FALLBACK for an id nobody has drawn yet and **nothing new joins them.**
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
cannot drift off the thing it sits on. It FILLS the window and the two axes
scale independently — the bench is against one edge and the shelf against the
other, so a cover crop takes a verb off the screen. There is no map, no carve
and no walk: nine hotspots — the crack, four sockets in the rock, the bench,
the shelf, the tent, the fire — and what MOVES is light, wind and idling bodies
on one canvas over the art. Everybody you have met stands about in it and clicking one
goes to their room — a person's hotspot is their own body's grid, where that
body was drawn. **THE FISSURE IS REACHED FROM THE CAMP AND NOWHERE ELSE** —
*"remove the fissure button, the shop, from the ui in the bottom right rail,
have that only be from camp"* — the crack. **FOUR MORE SCREENS ARE THE
PICTURE'S ALONE**: the STASH is the shelf, the CRYSTALS are the four sockets
(which open that screen whether or not one is in them — taking a crystal back
is the Fissure card's own sockets' job, and a filled socket that unsocketed
instead would leave no door at all), and the TRIALS are the FIRE, the one lit
thing in the art nothing else claimed. Everything else is still on the rail,
and a screen with neither a button nor a hotspot is one somebody will lose.

**A COUNTER BELONGS TO A PERSON, and the shop is the Lampwright's.** *"The shop
should exist in the first character you meet… Each character can have something
similar to a shop or a just a different shop entirely."* `SceneDef.keeps` is
what somebody runs without being handed anything; a bench a RELIC buys (the
ossuary's, the orrery's) is the same shape already.

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
nothing written twice. **A ZONE IS DEPTH AND NEVER A WORLD** — The Answering,
The Refraction, The Flowering, named for the halls at their tops. What world you
walk into is what you SOCKETED (`mapTheme`), and the two used to be the same
thing, which made the crystals a second ladder. `LadderZone.id` is still spelt
the way the worlds were, because it is the save key under `character.climbed`.
**Every fourth rung is a CHALLENGE FLOOR** — `challengeMod`, a second mod on the
same seam — and the room fills with rares instead of stepping. **A zone's LAST
rung is its BOSS**, in an arena of its own (`LADDER.zones[z].arena`, read through
`arenaAt`), and clearing that is the whole of what opens the zone above: The
Answering, The Refraction, The Flowering. **THE CLIMB IS DRAWN ONE ZONE AT A
TIME, on a TAB**, as a seam descending that act's own generated cross-section
(`LadderZone.art`) with a station on every rung, lit as far as you have
cleared. **The Fissure window is TWO COLUMNS and nothing on it scrolls** —
*"the map being much larger almost the entire screen and the sockets on the
right side"* — so the seam is sized off the room LEFT rather than off the
viewport, and `shots` fails the screen if it needs scrolling. Every station is placed in PERCENT of the picture, so a rung cannot
drift off the chamber it sits in.

**A CRYSTAL ROLL BURNS DOWN.** *"You roll a mod and it lasts for a certain
amount runs and then it's gone."* `RolledMod.uses` is descents left, set at the
roll off the TIER'S OWN WEIGHT (`usesFor`) so a rarer tier is stronger and runs
out sooner — a decision rather than an upgrade. A CLEAR spends one off every
roll on every socketed crystal and drops it at zero; a DEATH spends none,
because failing a rung already costs nothing but time. Gear never carries one.
A roll running out is the sixth thing that ends an Enter-chain.

**A CRYSTAL ROLLS A RULE, NEVER A NUMBER ON A BODY.** *"Change all the mods to
be effectively just powerful nodes from the trials tree. Like for example it
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
world you walk into. Danger and socket
count fold into one **run power**, and every reward reads that and nothing else.
A fifth socket takes a **boss key**.

**A CRYSTAL COMES OUT OF THE GROUND AT A DEPTH.** *"The entire Crystal handout
should be scratched and it should just be at certain depths instead."*
`CRYSTAL_DEPTHS` is one row per rung that pays one, and the FAMILY is what that
depth is FOR. Paid on a rung being NEWLY cleared, asked before `takeRung`
records it, so grinding an old rung pays nothing. Fifteen across the climb plus
the Lampwright's — four of every family, so every world has a way in, the fourth
socket fills at The Answering rung 6 and the first crystal of another world is
rung 8. **The Lampwright owes the weapon and the FIRST crystal and nothing
else**; there is no quest ladder any more.

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
bare Fissure pays 0.21 a clear against 1.3 pieces of gear, and the counter's
first one is several descents of saving.

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

**A LOCK IS MADE OF THE WORLD IT STANDS IN, and it OPENS.** `LOCKS` is three a
world — two ordinary and one RARE — each a `shut` prop and the `open` frame of
**the same generated object**, so the last guard falling swaps the picture
rather than standing a second chest beside the first. A pair is cropped to ONE
box (`PropSpec.with`), or the lid going back moves the box under it. **A rare
one is never a bigger pile**: `LOCK.rareRarity` is what its ONE drop is worth
extra, because rarity buys what a piece IS everywhere else in the game. A
timber box in a gullet of meat read as furniture somebody carried down, which
is the whole reason the table is per world.

**A PERFECT BASE IS THE ENDGAME CHASE, and it is the only step above ordinary.**
25% on the implicit, top tier only, three sockets minimum. Its rate is a SHARE
of drops, which is why the count had to be flattened first — at 84 a clear the
same odds paid 3.79 Perfect bases a descent and the rare tier was wallpaper.

**THE BENCH IS AN ANTI-BRICK, NOT A SUPPLY.** A Shard of Making at 5 flat gold
was 6,072 a clear at the deep end, so a found piece's rolled lines were worth
five gold apiece and the floor could never beat the bench — *"an item with no
mods could be better than one with 3, you just need to click the currency."*
`Recipe.goldPerIlvl` rides the shelf's own item level instead. **A CONSTANT
PRICE CANNOT THROTTLE ANYTHING**: a clear banks 54 gold at the bare Fissure
against 30,359 at the deep end, so one number tuned to cost a clear at the top
is 560 clears at the bottom and a new character could never buy one.

**Twelve modifiers was the whole ceiling, and the TRIALS WEB is how it rises.**
Four sockets of three is all the difficulty a crystal can ever hold, so the web
is a standing set of modifiers on top. **It is a MAP, not a fan**: TWELVE
WHEELS on three rings, 156 nodes, joined by ROADS of generic nodes, so reaching
a thing is a route you worked out. A wheel's ring of six is one idea said six
ways with its MAJOR at the middle, hung off the ring point FURTHEST from the
road — half the ring is what the major costs.

**60 points: five a TRIAL, one a RUNG, and the Fissure pays nothing** — the web
is SHUT until the Fissure is whole (`trialsOpen`), so a new character meets the
climb before it meets a hundred and fifty-six nodes. Never a level, so it cannot
be ground for. Its lines merge into `RunSet.mods` beside the crystals' own and
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
the same report and open the same dock. **REPEAT is the one toggle that says
whether**, under the button — `GameState.repeating`, a preference like Hide,
absent meaning ON. It is not "Leave after this run" in a new coat: that armed a
stop one descent AHEAD, where this is a standing answer you give once.
**Saying so is ONE BUTTON — Return to camp — and it KEEPS what the descent
found**: *"make it where all the loot on the floor just gets
picked up when you return to camp… you can min max by doing a hard level for a
bit and then returning before you die."* Only DYING banks nothing. What a walk
does not buy is PROGRESS — no rung, no crystal out of the wall, no levelling of
what is socketed, no trial point — so going deeper than you can finish is a
decision rather than a punishment. "Leave after this run" is gone with it: it
armed a stop one descent ahead, which is the same stop said early.

**THERE ARE NO ROOMS, and a person is FOUND IN THEIR OWN ZONE.** *"Honestly just
ditch all the rooms. I want to encounter them randomly in the maps and they
just say like one thing… then they can be in the camp and you can just talk to
them."* `SceneDef.theme` is where somebody LIVES and they are only ever found
there — a man who turns up in every world lives in none. One unmet person from
THAT zone stands in the room furthest from the way in, at `MEET_CHANCE` a
descent — placed with NO draw, so
whether somebody is down there cannot move a single roll — and walking past
them is the whole meeting: `SceneDef.greets` goes into the log, nothing stops,
and they stand there for the rest of the run. Afterwards they are in the camp,
and clicking them runs `SceneDef.beats` and then whatever they are FOR: the
Lampwright's crystal, the Lambengolmor's key, the ossuary's and the orrery's
benches. **A MARK over the head says somebody is holding something** — `wants()`
in `src/ui/talk.ts`, the same question `offer` answers, asked before the
conversation instead of after — so a picture is never swept for the one person
whose mind has changed. Nobody is being RESCUED: they live down there, and
`greets` says so. **The one `plan` left is the ANSWERING HALL**, because a boss fight
needs a floor with nothing on it.

**CRIT CHANCE IS THE SKILL'S, and gear only SCALES it.** `SkillDef.critChance`
is what a skill crits at bare — 4% for Arc Lightning, 25% for Ambush — and every
crit line on a piece of gear is *increased* Critical Chance, so 10% base and
100% increased is 20%. FLAT crit stays a tree and trade line, which is what
keeps a web able to change what a build is capable of rather than nudging it.

**Every damage type leaves something behind.** `AILMENTS` in `src/data.ts` is
one row per type — Burn, Bleed, Chill, Shock, Poison, Curse, Exposure, and
Prismatic deliberately none. Dealing the type applies it, at a chance you BUY
and never get free; past 100% you apply a second. A damage ailment scales by its
OWN tags and nothing else, so Spell, Attack and Critical never reach one, and
crit is out of them in both directions — it comes back only as the guaranteed
Critical on a body thawing out of a Freeze. **Ailments are the HERO'S**: a
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
of the 99 there are. Attributes are bought per level. Every use costs mana; out
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
src/trials.ts      the web a TRIAL pays for; src/trials/* its six arms
src/scenes.ts      the PEOPLE and the one arena; src/scenes/camp.ts the picture
src/vignettes.ts   what the rock does: cover, growth, solidity
src/sim/           the deterministic simulation
src/sim/grants.ts  every switch anything may hand the sim, and who reads it
src/sim/grid.ts    generate and carve a map; sceneMap beside it
src/game/          save, state, report, crystals, scenes, graft
src/render/        renderer seam: canvas2d fallback, pixi default
src/render/generated-*.ts   art as data — never edited by hand
src/ui/            one module per screen; talk.ts is a person in the camp
tools/art/         the generator, over MCP: bodies.json asks, generated.json answers
tools/*-peek.mjs   screenshots off the committed bundle
src/demo.ts        the checks; src/mods-check.ts the modifier sweep
```
