# Crystal Core

A browser ARPG. Deterministic fixed-timestep sim, seeded RNG, no framework.

## Three files

| | |
|---|---|
| **`CLAUDE.md`** | this one — the game as it IS |
| **`RULES.md`** | what is ALWAYS true: how to work, and what must not break |
| **`ROADMAP.md`** | the work that is LEFT, and nothing else |

**Start every session by reading `RULES.md`, then `ROADMAP.md`.** This file is
loaded for you; those two are not.

**Before either of them, `git fetch` and check you are on the tip of the
branch.** The clone is taken when the container starts and the branch moves
under it, so the roadmap you were handed can be listing work that has already
landed — that has cost a whole phase, built and tested and thrown away.
`git log --oneline -15 origin/<branch>` is the fastest read of what is done;
reset onto the tip and re-read the roadmap before picking anything.

One phase at a time, and **no stop between them**: take the lowest-numbered
phase in the roadmap that is not blocked on an open question, do the WHOLE of
it, leave the suite green, commit and push, update `ROADMAP.md` and `RULES.md`
to match what you did — and then start the next phase in the same breath.
Finishing one is not a stopping point and is never a reason to ask whether to
continue. The cycle is written out in `RULES.md` and it is the authority on it.

When the roadmap holds nothing but questions, say so and list them rather than
inventing work.

**Ask in a plain message, never through the multiple-choice popup tool.** The
popup is not always being watched and times out, which loses the question. Write
it in the reply, stop, and wait for the answer — do not pick one and carry on.
Once it is answered, carry on without stopping again: a question is the only
thing worth pausing for, and pausing between phases is not.

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

**Auras** (`AURAS`) are why the aura worlds hurt about twice as much as the
Fissure. One carrier per pack, never buffing itself: Demonic adds a fixed amount
of damage and of armour, Prismatic multiplies both. Alone each is a hazard;
together the multiplier lands on what the other added, and nothing multiplies an
armour nobody granted. Every carrier draws its reach on the floor — a room that
is lethal for a reason you cannot see reads as a bug.

The Seam was meant to be the worst room in the game and MEASURES level with
four Demonic crystals rather than above them — it takes two crystals of each, so
only half its packs carry either aura. That is an open question in
`ROADMAP.md`, not a settled design.

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

Danger only counts what the sim still reads. `DangerStat.cap` in `DANGER_STATS`
is where a stat saturates — a ward at the resistance cap, a crit chance at
certain, armour where its reduction tops out — and `crystalRewards` scores the
capped amount, so four wards of one type are paid for as one. Power is clamped
at `POWER.max`, so the top drop band is reached long before danger runs out;
past it, danger still pays in rarity, which reads `payingDanger` directly. The
hardest set in the game is nobody's band, and `deepestSet` is what builds it.

A `DropGate` says a thing does not exist in this run at all — `minPower`, a
`zone`, or both — and the pool is filtered before the pick, so no amount of
rarity argues with it. The Sigil of Finality drops only in the Seam.

## Where crystals come from

Never a shop, never a report, and never a roll. **The Lampwright** climbs out of
the hole at the exit of a CLEARED descent holding whatever is owed, steps clear
of it, and waits for you to walk over — and that meeting ends the run — so a gift is never a thing standing next to the monsters,
and the loot it walks you out with is already banked. `giftWaiting` is what is
owed, `takeHandover` is the panel granting it, and `giftSchedule` is the same
answer in words for the collection screen.

The panel draws a PORTRAIT, not the map sprite: `PORTRAITS` in
`src/render/portraits.ts` is a separate table at grid 48, one frame,
shoulders-up, because a 24-grid silhouette blown up is a blob. What he SAYS is
flavour — he names no screen, no currency and no number, since teaching the
buttons is the guided opening's job.

Two things are SCHEDULED, off `GameState.given`. The first weapon on the first
cleared descent, picked off the skill (`STARTER_WEAPON`). The first Normal
crystal on the first clear after the ACTIVE SKILL has reached
`INTRO.crystalSkillLevel` and taken a NOTABLE in its tree (`crystalEarned`) —
the level buys the point and the allocation spends it, so the crystal is paid
for by the thing that makes a character a build rather than by pressing Enter
twice. It arrives at LEVEL 1, which holds no modifiers: it is socketed blank,
and the descent it makes longer is the whole of what it does. A Shard of Making
comes with it for later, since everything is handed over in person. Five
cleared descents socketed at no danger buy it its first slot, and THAT is when
the craft is taught. That roll is the one arranged thing in the game:
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

## Uniques

`UNIQUES` in `data.ts` is a table of named pieces: a base it is a version of,
fixed lines rolled once by `makeUnique`, a `grants` bag out of the SAME table
the skill trees hand switches to the sim through, and a `DropGate`. Nothing at a
bench reaches one — the lines are implicits and the item declares no modifier
slots, so capacity is zero and every currency refuses it. `treeGrants` merges
what is worn after the tree, so a unique reaches the sim by a tree's own path
rather than a second one. Every one is a TRADE, paid for by a downside on the
item, and the demo holds that line. Every world drops something of its own, and
the Fissure gets two for being the shallow end.

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

## What a level buys

**Attributes** (`ATTRIBUTES`, `ATTRIBUTE_STEP` in `data.ts`). A character level
hands over `LEVELLING.attributePointsPerLevel` = 3 points and nothing spends
them but you, on the sheet; level 1 grants none. Five points make a STEP and a
part-step pays nothing, so the numbers on a step can be generous enough to
build around. Strength buys attack damage and life, Intelligence spell damage
and mana, Dexterity attack critical chance and attack speed, Acuity the same
two for spells.

Every one of them is written as ordinary stat lines under names the modifier
engine already reads, and `attributeMod` folds the lot into ONE synthetic
`RolledMod` the way `treeMod` does — so an attribute reaches the sim by exactly
the path a ring does. The TAGS are the whole of what keeps the four apart:
`heroStats` passes the skill's tags into the `critChance` computation, so an
attack critical chance does nothing for a spell, and `attackSpeed` was already
the wrong stat for one. Untagged gear lines still reach everything.

`heal()` REPLAYS them against the level that paid, exactly as tree points are
replayed: an attribute that is cut, or a curve that moves, hands the points
back rather than leaving a character holding what no level granted.

The character level also still scales the skill's own base damage
(`LEVELLING.damagePerLevel`), which is the granted baseline `lifePerLevel` is
for life. Attributes are the layer you BUY on top of both.

A count of what is waiting to be spent sits on the header button that spends it
(`badge` in `src/ui/badge.ts`). Zero shows nothing at all.

## What a skill costs

Every use of your skill is paid out of **mana** — `HERO_BASE.mana`, and
`CombatStats.maxMana` beside `maxLife`. The pool never grows with a character
level, where life does: a pool that grew alongside it would leave the cost
meaningless by level 10, so sustain is BOUGHT. Three gear modifiers reach it —
of the Well, of Clarity, of Thrift — through the modifier engine like anything
else.

Bare, every skill costs the same PER SECOND (`MANA.costPerSecond`).
`SkillDef.manaCost` is per USE, so a slower skill's number is a bigger one, and
the demo holds all three to the same rate.

**What a node changes, it charges for.** The 42 notables that change what the
skill DOES — a burst, a sweep, another projectile, another cloud — each grant
`manaMultiplier`, which merges by PRODUCT, so a build stacking four of them
pays about half again a cast. Conditional damage is free: "more against enemies
below a third of their life" changes a number rather than what the skill is.
The line the card prints comes out of `GrantDef.say`, never out of the node's
own prose, so what it charges and what it says cannot drift.

**Two flasks, and they are a descent's budget.** `POTIONS` in `data.ts` — a
Flask of Blood and a Flask of Quiet, 2 charges each, 4 seconds of heavy
regeneration apiece. A potion is an EFFECT WITH A DURATION (`TimedEffect` on
the hero), never a lump of life, because the trade that turns potions into the
character's engine hangs BUFFS off that same shape. Charges live on `RunState`
and nowhere in the save, so a descent always begins full and there is nothing
to hoard.

They fire THEMSELVES at a threshold (`PotionDef.threshold`, moved by the player
into `GameState.potions`), and that same threshold is what `runToCompletion`
obeys — one rule with one implementation, because no build's power may depend
on somebody watching. The keys are `BINDINGS` entries like every other; the
buttons beside the map are the interface, since a phone has no number row.
`RunSim.usePotion` QUEUES a press for the next tick, so a seed still replays.

**Out of mana you do not stand still.** You swing bare — `DRY_SKILL`,
`MANA.dryDamage` of your damage, one target, none of the tree behind it — so a
descent always ends and a headless run can never hang. A bare level 1 spends 0%
(Strike) to 17% (Blight) of its swings that way — measured over real descents
with the flasks firing themselves, which is the floor everything else is
measured against.

## The loop

You press Enter once. A cleared descent launches the next one by itself, and it
keeps going until it is stopped: **you die**, **the haul fills**, **someone is
waiting at the mouth**, or you say so. Saying so has two prices. **Leave after
this run** finishes the descent you are in and banks it; **Abandon** walks out
now, and that descent pays nothing — the same rule as dying in it. A meeting is
the gentlest of the five and costs nothing at all: the descent is already
cleared and banked when he climbs out, and he walks you up. Every one of the
five ends on the same report and opens the same haul, so there is one screen
that means "the run is over, deal with your things", and what earlier clears
banked is visible rather than assumed. Only the descent you are standing in can
be lost; each clear banks as it happens and nothing reaches back for it.

**The camera is yours.** Scroll to zoom, drag to look somewhere else, and one
key puts it back on your character and keeps it there. Dragging is what stops
it following; zooming never does.

**A descent ends at a place you walk to.** Killing the last thing is not the
end of it: the hero walks to the exit, and coming near the hole is what brings
the closing encounter up out of it, a few at a time, so the last fight is
something that happens on the way out. Reaching the hole is the clear. The exit
is drawn as the hole it is — the same `mouth()` the entrance has — and nothing
paints a marker over it.

The **haul** (`GameState.haul`, `HAUL_CAP`) is where a cleared run's loot lands
— never in your bags, which are yours to arrange. It is inert exactly as the
stash is: take a piece out before it can be worn, crafted or socketed. Capacity
is read BETWEEN runs and never during one, so `bankToHaul` refuses nothing and
the haul ends up over its limit rather than a descent's drops being split.

A full haul is the only thing that shuts the Fissure, and it can never wedge:
selling needs room nowhere.

## Saves

The save is `JSON.stringify(game)` in a localStorage key per SLOT — three of
them, one LIVE — and there is no server behind the hosted build. `GameState`
must stay plain data. The live slot autosaves; the Save & Load screen is where
you copy a game into another slot, load one back, or start a new one, and a new
game is a thing you do to a slot rather than a button in the header.

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
src/game/crystals.ts  gifts, quests, and a crystal's climb from level 1 to 4
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
