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
| `systems` | `src/sim/`, `src/data.ts`, `src/trees/`, `src/trades/`, `src/moves/`, `src/game/`, `src/crafting.ts` |
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

- **Balance is NOT TUNED, and a balance number never blocks a phase.** Systems
  are still landing and each hands out more power than the last, so anything
  tuned now is tuned against a game that does not exist. Measure it, PRINT it,
  carry on. Balance checks are `gauge()`s that report and never fail; what still
  FAILS is mechanism — a run that does not end, a determinism break, a step
  nobody can finish, a screen that overflows, a modifier that does nothing, a
  save that cannot be healed. One difficulty check stays a failure: a brand new
  character clearing the bare Fissure.
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

**One place you go.** Four sockets hold crystals permanently. Their COUNT is how
long a run is, their MODIFIERS the whole of how hard it is; a crystal's LEVEL is
only capacity and its FAMILY (Normal / Demonic / Prismatic) only which monsters
spawn. Composition also picks the ZONE — four of them, each drawn by its own
generated tileset. Danger and socket count fold into one **run power**, and
every reward reads that and nothing else. A fifth socket takes a **boss key**.

**You press Enter once.** A cleared descent launches the next by itself and
keeps going until you die, your bag fills, someone is waiting at the mouth, or
you say so. All five end on the same report and open the same dock.

**Crystals are given in person, never bought or rolled.** At the end of a
cleared descent that owes something you come up in a **scene** — an authored
room with somebody standing in it — instead of the next descent. Five rooms:
the Lampwright's workshop, the Lambengolmor's reading room, the answering hall
(a boss), the ossuary and the orrery (two people who take a relic and write a
line on your gear that nothing else can).

**A character is a trade, a main skill, two more slots and a bag.** The trade is
chosen when the character is made and is what the hero LOOKS like; it is funded
by character level out of its own budget, so it survives every skill you swap.
Five main skills, each with its own tree; a passive and a mover fill the other
two slots, the mover having a nine-node web of its own. Attributes are bought
per level. Every use costs mana; out of mana you are STARVED, not stopped.

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
src/trades.ts      the character's own web; src/trades/* the two trades
src/moves/         the movement webs
src/scenes.ts      the authored rooms; src/scenes/* their content
src/vignettes.ts   what the rock does: cover, growth, solidity
src/sim/           the deterministic simulation
src/sim/grants.ts  every switch anything may hand the sim, and who reads it
src/sim/grid.ts    generate and carve a map; sceneMap beside it
src/game/          save, state, report, crystals, scenes, graft
src/render/        renderer seam: canvas2d fallback, pixi default
src/render/generated-*.ts   art as data — never edited by hand
src/ui/            one module per screen
tools/art/         the generator, over MCP: bodies.json asks, generated.json answers
tools/*-peek.mjs   screenshots off the committed bundle
src/demo.ts        the checks; src/mods-check.ts the modifier sweep
```
