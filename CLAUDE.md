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
and no walk: eight hotspots — the crack, four sockets in the rock, the bench,
the shelf, the tent — and what MOVES is light, wind and idling bodies on one
canvas over the art. Everybody you have met stands about in it and clicking one
goes to their room — a person's hotspot is their own body's grid, where that
body was drawn. **The rail still reaches every screen** — the Fissure is one
of them, and a screen you can only find by clicking a picture is a screen
somebody will lose.

**One place you go, at the RUNG you pick.** `LADDER` is three zones of 12, 14
and 16 rungs; a rung is CHOSEN, one you have cleared stays open for the rest of
that character's life, and a zone opens when the one below it is whole. Its
difficulty rides the crystal seam as ONE synthetic mod (`rungMod`, beside
`trialMod` and `treeMod`), so `crystalRewards` pays a harder rung more with
nothing written twice — and the rung is also the ZONE, composition only picking
one for a set with no rung. The CLIMB draws it: a row a zone, a pip a rung.
**Every fourth rung is a CHALLENGE FLOOR** — `challengeMod`, a second mod on the
same seam — and the room fills with rares instead of stepping. **A zone's LAST
rung is its BOSS**, in an arena of its own (`LADDER.zones[z].arena`, read through
`arenaAt`), and clearing that is the whole of what opens the zone above: The
Answering, The Refraction, The Flowering.

Four sockets hold crystals permanently. Their COUNT is how long a run is, their
MODIFIERS how hard it is; a crystal's LEVEL is only capacity and its FAMILY
(Normal / Demonic / Prismatic) only which monsters spawn. Danger and socket
count fold into one **run power**, and every reward reads that and nothing else.
A fifth socket takes a **boss key**.

**ON THE CLIMB A CRYSTAL IS A TIER TOKEN.** Nothing rolls on one and nothing
levels one until all four are HELD (`crystalsUnlocked`) — the ladder's
difficulty is the rung and the challenge floors, never a socket. What a socket
buys instead is the base TIER a run may drop (`TIER_BY_SOCKETS`, 1/2/3/3/3),
where the RUNG buys the item level: a first cycle is well-rolled tier 1 rather
than tier 1 rolled badly.

**Twelve modifiers was the whole ceiling, and the TRIALS WEB is how it rises.**
Four sockets of three is all the difficulty a crystal can ever hold, so the web
is a standing set of modifiers on top — earned one point at a time by doing a
TRIAL, never bought by a level. Its lines merge into `RunSet.mods` beside the
crystals' own and are weighed by the same `crystalRewards`, so harder is what
pays. Per CHARACTER, and what it makes worse is every descent that character
takes.

**You press Enter once.** A cleared descent launches the next by itself and
keeps going until you die, your bag fills, someone is waiting at the mouth, or
you say so. All five end on the same report and open the same dock.

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
is a trade, a name and a skill, and then you are STANDING IN THE CAMP holding
the weapon that skill wants — *"It should just be you pick character/name/skill
and land in the town."* There is no opening room; `armForSkill` is what puts it
in your hand. The trade is what the hero LOOKS like; it is funded
by character level out of its own budget, so it survives every skill you swap.
Four of them: potions as an engine, mana as one, **what is in your other hand**
(a shield's Block against a two-hander's swing — Mahthar's whole web), and
**TWO WEAPONS**, which is Obreth's and which nobody else may hold at all.
**DUAL WIELDING IS ONE TRADE'S PRIVILEGE** — `TradeSpec.dualWields`, read
through `canDualWield` and nowhere else. Obreth and the Lambengolmor are both of
**the Obsidian Order** (`ORDER`), who hold that the rock is writing.
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
