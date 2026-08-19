---
name: harness
description: Running and reading the test suite — what each harness proves, how long it takes, its order dependencies and known flakes, and how to write a check that cannot go vacuous. Load when a harness fails, flakes, hangs, or when adding a check to src/demo.ts, smoke.mjs, shots.mjs or dragprobe.mjs.
---

# The harnesses

About **twelve minutes** end to end. Four are slow enough that a two-minute tool
timeout kills them mid-run — background them.

| | |
|---|---|
| `comments`, `theme`, `typecheck`, `mods`, `build` | a second or two each |
| `smoke` | ~4min — measured; it plays a descent too. It prints its own count, and that is the number |
| `demo` | ~2min |
| `shots` | ~5min — it waits out TWO whole descents |
| `drag` | ~20s |
| `peek` | a real descent in real time |

**None of them hangs**, and `smoke` is the one that looks like it does: it
prints a line per check, but through a PIPE that output is buffered, so
`npm run smoke | tail` shows an empty screen for four minutes and then
everything at once. Redirect to a file and watch the file. Never assume it broke.

**Do NOT run `shots` concurrently with `demo` or `smoke`.** It waits out real
descents in real time against a two-minute budget, so under contention it loses
that race and reports `the first descent never met the Lampwright` — measured:
red beside the other two, green alone, on the same tree. **A `shots` failure
that names a missing SCENE is a load result until you have re-run it alone.**

**There is no `?fast=`.** Nothing in `src/` reads a query parameter and the
frame loop has no scale on its `dt`, which is why a harness that plays the game
waits out a descent in real time. Re-adding one is a change to the SIM's clock
and a phase of its own — and the rule it would come back with is: drop to real
time before any pointer work, or a descent finishes between a mouse-down and a
mouse-up and redraws the dock under the drag.

**Build before `smoke`, `shots`, `drag` or `peek`** — they load the bundle, not
the source.

## Reading the demo

`npm run demo` prints TWO kinds of `✗` and only one is a failure:

- `✗ FAILED — <why>` is a check that did not hold. `grep '✗ FAILED'`.
- `✗ Shard of Making: no open slot` is the crafting walkthrough printing a
  currency's REFUSAL, on purpose — the only place a failure message is read.

The last line is `✓ every check passed (N)` or `✗ N checks failed`. Read the
count off it, never out of a document. A `· ` line is a **`gauge`**: a balance
number that reports and can never fail. `parkedCheck` prints its number and
fails nothing; the demo prints the parked COUNT and `ROADMAP.md` has to agree
with it.

## Known quirks

- **`smoke.mjs` is ORDER-DEPENDENT.** A dozen assertions pick a dock item by
  POSITION (`filled('#inv-gear')[0]`), so anything that reorders the dock goes
  at the END of the file, and anything that consumes an item must avoid pieces
  later checks look for by name. A test added in the middle that sells, wears or
  sorts breaks checks hundreds of lines further down, and the failure names a
  piece rather than your change.
- **A NEW GAME is made before it is played, and the character-select hall takes
  every pointer.** Any browser harness walks `pick-<trade>` then `pick-take`
  before the welcome — **and the dev kit IS a new game**, so `restart()` runs
  the gate a SECOND time. `drag` and `peek` both sat on the hall until this was
  written down: `drag` timed out 30 seconds later on a `dblclick` it could not
  land and named the window it was aiming at, and `peek` shot the hall itself.
  **A harness that restarts and then times out on something unrelated is this.**
- **`shots` can fail on CONTENT, not just layout.** It waits up to two minutes
  for the SCENE and then for the Lampwright panel and fails if a first descent
  never produces one. `document.body.dataset.runPhase` is what tells a harness a
  room from a descent — both are a map with everything else hidden.
- **`shots` carries the CHECKLIST.** `STATES` is every screen and overlay the
  game has, and a state on that list with no file at the end FAILS the run.
  Adding a screen without shooting it is a red harness, not something somebody
  notices later. Three states cannot be clicked to: the item MENU wants a
  right-click, the TOAST is raised by exactly one thing in the game (an equip —
  `note()` goes to the ledger and raises none), and the GRAFT bench is the last
  beat of a room somebody holds a relic for, which costs a whole second cleared
  descent. That is why `shots` is five minutes rather than two.
- **The report is easily shot as a second picture of the dock** — a descent that
  found anything opens the dock ON TOP of it. Close it first.
- **Pointer DRAG tests flake.** A reorder has been seen to fail once on a bundle
  that passed either side of it. Re-run before treating one as a regression.
- **Measure a box with `hover()` first when a drag test aims at one.**
  Playwright's actionability waits for the element to stop MOVING; a raw
  `boundingBox()` does not. The bench going from empty to full re-centres the
  modal, so a box read a moment earlier is 20px out and the press lands between
  two slots and silently does nothing. That was a 1-in-4 flake.
- **When a UI change breaks something, reach for `drag` FIRST.** On a failure it
  prints what `elementFromPoint` actually hits at the drop point. Reasoning about
  z-order by eye produced four wrong answers in a row; one hit test produced the
  right one.
- **`tools/*.mts` is NOT typechecked** — `tsc` covers `src` only. A change to
  the art tools is proven by RUNNING them.

## Writing a check

- **A check whose subject a phase deletes does not fail; it stops meaning
  anything.** Stripping the arrangements left `Grid.solid` with no live producer,
  so "furniture blocks, only where it may" ran over four descents, marked
  nothing, and passed forever while proving nothing. **Look for the vacuous
  ones, not just the red ones.**
- **A single-seed check does not fail when a mechanism breaks; it fails when the
  rng moves.** The wander shifted every draw after it and two checks went red,
  neither for a real reason. Sweep seeds — a Bleed on every hit reads 0.3% the
  WRONG way at five seeds, 0.5% right at twelve, 1.0% at twenty-four.
- **Compare the thing you changed, not the far end of a run that contains it.**
  "A press changes the run" compared two fingerprints eighty seconds apart,
  which a flask poured into a barely-hurt character correctly does not move.
- **A per-entity measurement must be scoped per SIM.** Entity ids start again
  with each `RunSim`, so one `Map` across three seeds measured a body in one
  descent against where a different body stood in the last.
- **A check written for one entry breaks on the second.** "A specimen only
  exists in the Rot" as `RELICS.some(...)` started failing the moment a second
  relic existed. Sweeping a table is only right when it asks each row about
  ITSELF.
- **Derive an exemption, never list one.** A mover is exempt from the
  interaction audit because `SKILL_BEHAVIOURS` says nothing that CASTS reads its
  switches — so a third mover is exempt by construction.
- **A measurement that reads the wrong thing is worse than none**, because a
  number gets tuned against. The stride gauge was reading the cast shadow as
  feet, and three bodies shipped a compensating number a human chose.
- **Deleting a measurement to silence it is the one wrong answer.** Balance
  numbers are `gauge()`s: they print, they carry the figure that was wanted
  beside the figure they got, and they never touch the exit code.

## Claims need evidence

- **A balance claim needs a measurement.** `ladderCharacter` in
  `src/sim/loadout.ts` and the harnesses in `src/demo.ts` are the tools; a
  throwaway probe is fine for what they do not cover — put it in the scratchpad
  or delete it.
- **An art claim needs a screenshot.** None of these is in the suite, and the
  demo's sprite checks prove grids are square, not that anything reads.
  - `npm run peek -- out.png [zoom] [panX] [panY] [x,y,w,h,scale] [zone] [hold]
    [skill] [shots]` — a descent off the committed bundle. The crop is magnified
    NEAREST; every fault found this way was invisible at ship size.
  - `node tools/boss-peek.mjs <dir>` — a whole boss cycle.
  - `tools/zone-peek.mts out.png [px] [time] [span]` — all four zones off a real
    map. **`span` must be EVEN**: it is halved to find the corner, and an odd one
    lands the loop on half-tiles and silently draws nothing.

## Which harness a change reaches

| what changed | what to run |
|---|---|
| a NUMBER in a table | `mods`, and `demo` if the sim or `GRANTS` reads it |
| the sim, grants, economy, crystals, trees | `demo` |
| UI logic — a handler, a screen's state | `smoke` |
| layout, CSS, z-index, anything that MOVES something | `shots`, `drag` |
| the dock, a window's position, a drag target | `drag` |
| art, sprites, icons | `shots` |
| a zone's floor, its dressing, the tileset path | `peek`, and `demo` for the carve |

**Every graphics change now touches something a player runs** — the exemption
was for the sandbox, and the sandbox is gone.

**Before a push, the whole suite.** The table above is for the loop while you
work, not for what a commit is held to.
