# Crystal Core

A browser ARPG. Deterministic fixed-timestep sim, seeded RNG, no framework.

**`ROADMAP.md` is the to-do list.** This file describes the game as it is; that
one describes where it is going and what to work on next. Read it before
starting anything, and never guess at what it lists as open — ask.

**Ask in a plain message, never through the multiple-choice popup tool.** The
popup is not always being watched and times out, which loses the question. Write
it in the reply, stop, and wait for the answer — do not pick one and carry on.

Once it is answered, carry on down `ROADMAP.md` without stopping again. Pausing
between phases is not wanted; a question is.

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
MODIFIERS are the whole of how hard it is; a crystal's LEVEL is only how many
modifiers it can hold (1–4 → 0–3); its FAMILY — Normal, Demonic or Prismatic —
is only WHICH monsters spawn, each socketed crystal converting its share of the
packs. Nothing else makes a monster stronger.

The three pools weigh the same PER MONSTER, and the demo measures it. What
differs is what a world brings with it: Demonic and Prismatic carry **auras**
and the Fissure does not, so the worlds are a ladder as well as three
opponents — Normal is the shallow end, and you are given its crystals first.

The composition also decides the **zone** (`mapTheme`, `MAP_THEMES`): half of one
world takes the rock — The Rot, The Cavern — and two halves with no Normal is
The Seam, which therefore takes exactly two crystals of each. A zone is a LOOK:
same generator, same packs, different stone under them. It rides on `GameMap`,
so both renderers read one answer.

**Auras** (`AURAS`) are why the Seam is the hardest room in the game. One
carrier per pack, never buffing itself: Demonic adds a fixed amount of damage
and of armour, Prismatic multiplies both. Alone each is a hazard; together the
multiplier lands on what the other added, and nothing multiplies an armour
nobody granted. Every carrier draws its reach on the floor — a room that is
lethal for a reason you cannot see reads as a bug.

Danger and socket count fold into one **run power** number (`POWER`,
`runSet()`), and every reward reads that and nothing else: drops, item level,
XP and gold. Zero is the bare Fissure and the baseline for all four. Nothing is
counted twice — a crystal's level is capacity, capacity is modifiers, modifiers
are danger, and danger is already in power.

**Power buys access; composition and modifiers buy payment.** Item level and
what a band can drop at all come off power alone. An even split of the two
other worlds pays 25% more (`REWARD.mixYield`), each world pays in its own
currency (`FAMILY_YIELD` — Normal gold, Demonic crafting currency, Prismatic
rarity), and the finding modifiers weight WHICH kind of gear drops. None of
those touch item level, so no amount of arranging skips a rung.

A `DropGate` says a thing does not exist in this run at all — `minPower`, a
`zone`, or both — and the pool is filtered before the pick, so no amount of
rarity argues with it. The Sigil of Finality drops only in the Seam.

## Where crystals come from

Never a shop, never a report, and never a roll. **The Lampwright** climbs out of
the hole at the exit of a CLEARED descent holding whatever is owed, and that
meeting ends the run — so a gift is never a thing standing next to the monsters,
and the loot it walks you out with is already banked. `giftWaiting` is what is
owed, `takeHandover` is the panel granting it, and `giftSchedule` is the same
answer in words for the collection screen.

Two things are SCHEDULED, off `GameState.given` and the character sheet: the
first weapon on the first clear, picked off the skill (`STARTER_WEAPON`), and
the first Normal crystal at `INTRO.firstCrystalLevel` — a level 2, with a Shard
of Making beside it, because the meeting is followed by the craft that teaches
what a modifier does to a room. That roll is the one arranged thing in the game:
`crystal.meta.scripted` names the family, `add_mod` takes its cheapest tier and
clears the mark. It rides on the CRYSTAL so the currency lies to nobody.

Everything else is a **quest** (`CRYSTAL_QUESTS`) — the other three Normal
crystals as much as the two other worlds, completable in any order, each paying
once. `need` is a list of clauses ANDed together; `kind` names an entry in
`QUEST_CONDITIONS` and the rest of the clause is that condition's parameters, so
a new objective is one registry entry and one table row.

A crystal **levels only while socketed**, one clear at a time, multiplied by the
set's danger (`CRYSTAL_XP`, `advanceSocketed`). That is the cost of levelling a
blank: it is holding a socket that could have carried danger. A tier gained
rewrites the base, name, quality and capacity together — nothing reads a crystal
by fewer than all four — and never removes what is already rolled on it.

`src/ui/crystals.ts` is where the collection is compared, since four sockets
against everything you have ever been given is a comparison rather than a bag.

## Money

**Gold** is the one currency prices are quoted in. It comes off corpses and out
of selling gear, and it buys crafting shards and stash space — never a crystal,
which is given rather than bought. `sellPrice()` in `src/economy.ts` reads the
same base as a purchase plus what is rolled on the piece, times a fraction held
low enough that buying and selling back always loses.

Selling one piece is a menu action on the dock, never a click: it is the only
thing an item can do that cannot be undone. The bulk button in the shop takes
every carried piece no currency has touched, which is why it can never eat a
decision.

## The loop

You press Enter once. A cleared descent launches the next one by itself, and it
keeps going until it is stopped: **you die**, **the haul fills**, or you say so.
Saying so has two prices. **Leave after this run** finishes the descent you are
in and banks it; **Abandon** walks out now, and that descent pays nothing — the
same rule as dying in it. Every one of the four ends on the same report and
opens the same haul, so there is one screen that means "the run is over, deal
with your things", and what earlier clears banked is visible rather than
assumed. Only the descent you are standing in can be lost; each clear banks as
it happens and nothing reaches back for it.

The **haul** (`GameState.haul`, `HAUL_CAP`) is where a cleared run's loot lands
— never in your bags, which are yours to arrange. It is inert exactly as the
stash is: take a piece out before it can be worn, crafted or socketed. Capacity
is read BETWEEN runs and never during one, so `bankToHaul` refuses nothing and
the haul ends up over its limit rather than a descent's drops being split.

A full haul is the only thing that shuts the Fissure, and it can never wedge:
selling needs room nowhere.

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
src/game/crystals.ts  gifts, quests, and a crystal's climb from T1 to T4
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
