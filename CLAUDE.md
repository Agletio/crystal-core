# Crystal Core

A browser ARPG. Deterministic fixed-timestep sim, seeded RNG, no framework.

**`ROADMAP.md` is the to-do list.** This file describes the game as it is; that
one describes where it is going and what to work on next. Read it before
starting anything, and never guess at what it lists as open — ask.

When you put a question to the user, stop and wait for the answer. Do not pick
one and carry on.

## Commands

| | |
|---|---|
| `npm run comments` | comment budget |
| `npm run typecheck` | tsc |
| `npm run build` | bundle to `docs/app.js` — **committed**, Cloudflare runs no build |
| `npm run smoke` | headless boot and interaction |
| `npm run demo` | sim, economy, trees, balance |
| `npm run mods` | every modifier rolls, does something, reads |
| `npm run shots` | screenshots, overflow and lockdown probes |
| `npm run guide` | plays the opening with a real pointer |

Build before `smoke`, `shots` or `guide` — they load the bundle, not the source.

## Comments

Comments carry what the code cannot: an invariant, a unit, a constraint that
looks arbitrary, a trap. Everything else is noise.

- **State what is true.** Never "this used to be X" or "changed from Y". A
  reader who needs the old behaviour has `git log`; a reader who does not is
  being told about a thing that no longer exists.
- **Skip the why when the code shows it.** `if (spare > 0)` does not need a
  comment saying it checks for spare points.
- **No provenance.** Not the bug that prompted the change, not the measurement
  that motivated the number — unless the number is unexplainable without it.
- Trailing comments are free and often the right size.

`npm run comments` enforces a hard cap: standalone comment lines may not exceed
`max(10, 20% of the file)`. Comments are found by parsing — @babel/parser for
JS/TS, parse5 for HTML plus its inline `<style>`/`<script>` — never by matching
text, so a `//` inside a string is not a comment. Trailing comments are free.

It runs automatically as a `PostToolUse` hook the moment you move to a different
file, and again on `Stop`, so a run of edits on one file is never interrupted
mid-change. Also in CI, ahead of typecheck.

**Fix a violation by cutting prose.** Adding code to raise the 20% is the one
repair that makes the file worse.

## The Fissure

There is one place you go. Four **sockets** hold crystals permanently — a run
reads them and never spends them. Their COUNT is how long the run is; their
MODIFIERS are the whole of how hard it is; a crystal's TIER is only how many
modifiers it can hold (T1–T4 → 0–3); its FAMILY — Normal, Demonic or Prismatic —
is only WHICH monsters spawn, each socketed crystal converting its share of the
packs. Nothing else makes a monster stronger.

The three pools are held to the same threat, and the demo measures it both on
paper and by clearing one of each with the same character. A family is an
opponent, never a difficulty setting.

Danger and socket count fold into one **run power** number (`POWER`,
`runSet()`), and every reward reads that and nothing else: drops, item level,
XP and gold. Zero is the bare Fissure and the baseline for all four.

## Saves

The save is `JSON.stringify(game)` in one localStorage key — there is no server
behind the hosted build. `GameState` must stay plain data.

A save is full of ids pointing into `data.ts` and the trees, and those move.
`heal()` in `game/save.ts` runs on every load and drops what no longer resolves:
items whose base is gone, retired currencies, a cut skill. Tree allocations are
**replayed** through `canAllocate` rather than trusted, so a reshaped tree
refunds the points it stranded instead of leaving a build that could never have
been walked to.

- **Adding a field** needs nothing: a missing key takes its default.
- **Renaming an id** costs the player whatever pointed at it, and nothing else.
- **Bump `SAVE_VERSION`** only when a save should be REFUSED — a change `heal()`
  cannot repair. That wipes everyone's game, so it is the last resort.

## Shape

```
src/data.ts        every table: mods, currencies, bases, skills, monsters
src/mods.ts        capacity, allocation, rolling
src/crafting.ts    CONDITIONS / EFFECTS registries — currencies are data
src/skills-tree.ts allocation rules; src/trees/* are the webs
src/trees/spec.ts  how a tree is written down; layout.ts turns it into nodes
src/sim/grants.ts  every switch a tree may hand the sim, and who reads it
src/sim/           the deterministic simulation
src/render/        renderer seam: canvas2d fallback, pixi default
src/ui/            one module per screen
```

## Adding a skill tree

A tree is a `TreeSpec` in `src/trees/` and a line in `BUILT_TREES`. Six
branches, six trunk notables — `buildTree` refuses anything else rather than
dropping the extras.

Content only: `layout.ts` owns every coordinate. Give the tree a `prefix` no
other tree uses, because node ids are what a save points at.

**Distance is the only price.** There are no spent-point gates: what a notable
costs is the run of minors in front of it. A twig may only `forkFrom` the twig
beside it — a fork from further away has to sweep across everything between,
and `buildTree` refuses it. The demo holds every tree to the geometry: no link
may cross another, and none may pass under a node it does not join, both of
which read on screen as a link to somewhere it does not go.

A node's `grants` must be declared in `sim/grants.ts`, and the skill's own
`behaviour` must be listed as reading it — a tree asking a cloud to pierce is
a point spent on nothing, and the demo fails on it. Anything two nodes both
grant needs a `merge`, or the second silently replaces the first.

`needs` names what a grant is useless without, and the demo holds that line to
its own branch. It is per-tree: Area of Effect lives behind Detonation on
Fireball, which does not burst without it, and sits on the trunk for Blight,
which is a circle already.

Positions are in tile units, never pixels. Both renderers must agree exactly,
so anything per-tile is a pure function in `render/renderer.ts`.
