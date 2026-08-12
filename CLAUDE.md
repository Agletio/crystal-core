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
| `npm run drag` | 20s: the dock reorders, and a window goes where you put it |

**Run what the change can reach, not the whole suite** — `RULES.md` has the
table. `guide` is the tutorial test and takes minutes; it is not a general
regression check.

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

`SHARE_BY_FILE` gives one file its own share: `docs/index.html` runs at 25%,
because a share is a DENSITY and density only stands in for "how much of this is
prose" while a file's lines are the kind that might need explaining. That file is
mostly stylesheet — a thousand one-line rules needing nothing said — carrying the
few load-bearing traps in the project. Adding an entry is a decision to be argued
for, not a way out of a cut.

It runs automatically as a `PostToolUse` hook the moment you move to a different
file, and again on `Stop`, so a run of edits on one file is never interrupted
mid-change. Also in CI, ahead of typecheck.

**Fix a violation by cutting prose.** Padding a file to raise its allowance is
the one repair that makes the file worse.

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

**An element belongs to the MONSTER, not the room.** `MONSTER_ABILITIES` is a
table of what a monster does and what it deals doing it — Claws, Emberbite,
Rimebite, and three thrown ones — rolled per PACK off the run's own rng, because
a pack throwing two elements reads as noise where a uniform one reads as a thing
you recognise. The three ranged entries weigh a quarter of the table between
them, which is exactly the share that used to shoot. `MONSTER_ABILITY_BY_ID`
names them; a monster skill has no `category`, so it never reaches the Skills
screen. **Lightning Arc** is the one that is not a line to one target: it
carries 2 Arcs at 60% each off the skill's own `params`, which the projectile
behaviour sums with whatever a tree grants.

A crystal **adds** rather than converts. "of Cinders", "of Frost" and "of Storms"
each roll `monsterFire` / `monsterCold` / `monsterLightning`, a share of what a
monster already hits for dealt as that type ON TOP of its own. The total is what
it always was — a hit is still multiplied by (1 + share/100) — so `DANGER_STATS`
weighs them exactly as before; what changed is that carrying one ward blunts a
part of a hit instead of switching a modifier off. Three modifiers rather than
one that rolls which element, because a name saying Cinders over a roll saying
cold is a lie about which resistance to bring. The report splits damage taken by
type, worst first, and that split is what you read to know which ward to find.

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

Never a shop, never a report, and never a roll. At the end of a CLEARED descent
that owes something you drop into the hole exactly as you always do, and come up
in a **scene** rather than in the next descent: **the Lampwright's workshop**, a
small chamber nobody generated with a bench of half-built lanterns in it and
finished ones standing about lit and unlit. He is across the room; walking over
is the meeting, and the meeting ends the run — so a gift is never a thing
standing next to the monsters, and the loot he walks you out with was banked
before anybody spoke. `giftWaiting` is what is owed, `takeHandover` is the panel
granting it, and `giftSchedule` is the same answer in words for the collection
screen.

The panel draws a PORTRAIT, not the map sprite: `PORTRAITS` in
`src/render/portraits.ts` is a separate table at grid 48, one frame,
shoulders-up, because a 24-grid silhouette blown up is a blob. What he SAYS is
flavour — he names no screen, no currency and no number, since teaching the
buttons is the guided opening's job.

Two things are SCHEDULED, off `GameState.given`. The first weapon on the first
cleared descent, picked off the skill (`STARTER_WEAPON`). The first Normal
crystal on the first clear after the ACTIVE SKILL has reached
`INTRO.crystalSkillLevel` with EVERY point of it spent (`crystalEarned`) — the
level buys the points and the allocation spends them, so the crystal is paid
for by the thing that makes a character a build rather than by pressing Enter
twice. Points rather than a notable, because WHICH node they went on is the one
decision the tree exists to hand the player. It arrives at LEVEL 1, which holds no modifiers: it is socketed blank,
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

## A room you arrive in

A **scene** is an authored room you come up into at the end of a cleared
descent: one chamber nobody generated, no packs at all, the props where somebody
put them and the people standing in it. It is a `RunSim` like any other —
`RunOptions.scene` names a `SceneDef` and the constructor calls `sceneMap`
instead of `generateMap` — so both renderers draw one with no changes, and a
room with a fight in it will be a filled-in field rather than a second engine.

`sceneMap` in `src/sim/grid.ts` sits beside `generateMap` and shares `carveRoom`
with it, so a room is cut out of some world's rock the way that world cuts.
There is no rng: a plan is absolute tiles and a cut is hashed off the tile it
lands on, so a place is the same place every time you come up in it. There is
also no exit — `GameMap.exit` is the entrance, so nothing draws a second hole
and there is nothing to walk to.

`GameMap.props` is furniture, empty on every generated map, drawn by `PROPS` in
`src/render/renderer.ts` beside `mouth()`: pure functions returning `Decal[]`, so
a prop is decals rather than a sprite and never appears in `BEASTIARY`.
`RunState.folk` is who is in the room, a LIST and deliberately out of `monsters`,
because nothing in combat may ever be able to see a person.

`sceneWaiting` in `src/game/scenes.ts` is the schedule and returns **at most
one** scene per clear, highest rung first and never rolled; it ASKS
`giftWaiting` rather than replacing it. `src/sim` never decides that a scene
happens — `finish()` in `src/ui/run.ts` does, which is why every headless
harness drives `RunSim` directly and is left alone by all of it.

**He talks over his own head, a line at a time.** `src/ui/speech.ts` is the
bubble: built once and updated per frame, anchored off `Renderer.screenAt` so
the camera moving under it keeps the words on the speaker. A **beat**
(`SceneBeat`) is a line and what is DONE while it is up — `SceneAct` is `pace`,
`work` or `face`, performed by `RunSim.perform` off the walk and pose machinery
that already exists, so an act is `Entity.action` and nothing else. Clicking
advances one; the LAST beat is `#met`, which carries what he is holding and the
one button, anchored exactly like every line before it. Escape skips the rest
and grants, because the gift is yours the moment a panel is up. The scrim is
gone: a scene is already a stop, and a sheet over the room hid the room.

A scene is the fourth `Phase`: a map on screen, so `mapfull` stays on and the
rail stays up, but nothing is ticking, and Leave and Abandon go quiet because
there is nothing to abandon.

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

## Three skills at once

`SKILL_SLOTS` in `data.ts` is a TABLE like `EQUIP_SLOTS` and `RUN_SLOTS`, never
three named fields: **main** (accepting spell OR attack), **passive** and
**movement**. `Character.equipped` is slot id → skill id, `mainSkillId` is what
swings, and every damage number in the game is that one's. `equipSkill` puts a
skill in the slot its category names and refuses anything else, so equipping
the blink can never be what stops you swinging. `heal()` empties a slot naming
a skill that is gone and puts a pre-slots save's bare `skillId` in the main one.

**Killing Surge**, the passive, is a TRADE and that is what makes it worth a
slot: critical hits deal NO extra damage, and landing one grants 35% more
damage for 5 seconds. It never casts — the `critIntoBuff` grant IS the skill,
declared in `sim/grants.ts` like a tree node's, merged by `treeGrants` and read
in two places: `heroStats` reads `critMultiplier` as 0 while it is equipped,
and `dealDamage` arms a `TimedEffect` on the hero from the crit that lands.
The buff refreshes rather than stacking, and the crit that grants it never hits
harder for doing so.

**Blink**, the movement skill, fires ITSELF — automation is universal, so the
shipped policy is what `runToCompletion` runs. `RunSim.maybeBlink` steps to the
furthest waypoint of the path already found within `distance` tiles that is
walkable and has a clear line to it, once every `cooldown` seconds, so it never
lands a body in rock and never cuts a corner the walk could not.
`RunState.blinks` counts them.

Neither has a tree, and neither needs one: `BUILT_TREES` is per skill and a
skill with no web renders "no web yet". `MAIN_SKILLS` is what the main slot
takes and is what every harness that builds a character to fight with reads.

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

A count of what is waiting to be spent sits on the rail button that spends it
(`badge` in `src/ui/badge.ts`) — Character carries unspent attribute points and
Skills carries the ACTIVE skill's spare tree points, whatever web is on screen.
Zero shows nothing at all, since a badge reading 0 is a permanent nag.

## A trade: the part of a character that is not the skill

Every scrap of build identity used to belong to the SKILL, and changing skill
threw the whole of it away. A **trade** is funded by CHARACTER level out of its
own budget (`TRADE` in `data.ts`: one point every 5 levels, 10 at level 50), so
nothing about walking one competes with a tree for the same point — and it
survives every skill you ever swap to.

A trade tree is its OWN shape, not a skill web: five spokes off one middle, four
nodes each, **alternating minor and notable** — 20 nodes, half of them notables,
and 10 points. Every other node out is a notable, so five is the ceiling and a
point spent on a minor whose notable you never buy is a point spent on travel to
nowhere. Two whole arms fit and no more, so the outer notable of a spoke is a
commitment. No ring and no fork: a link sideways would let a build hop into a
neighbour's far notable without walking its arm, and the arm IS the price.

**Every notable changes a RULE, not a number.** A trade handing out percentages
would compete with the other on percentages and one of them would win; a trade
that changes what is POSSIBLE cannot be compared. They reach the sim through
`GRANTS` in `sim/grants.ts` exactly as a tree node and a unique do, merged by
`treeGrants` as a third SOURCE rather than a third concept.

**The Alchemist** turns potions from a safety net into the engine: a flask
carries a buff while it runs (`potionMore`, `potionHaste`, `potionCrit`), runs
longer and pours harder (`potionDuration`, `potionPotency`), and its charges
come BACK during a descent (`chargeRegen`) — so 2 charges are a cooldown rather
than the whole budget. The decision inside it is UPTIME: magnitude against
duration against how fast charges return.

**The Aethermancer** makes mana your second health bar and your damage
multiplier at once, and all five spokes pull on the SAME pool. `manaShield` pays
for a share of damage taken — ailments included, since armour never could —
`overcharge` spends a share of your MAXIMUM pool for proportional damage,
`manaLeech` returns a share of what you deal, `starvedDamage` makes an empty
pool survivable, and `poolFromLife` builds the pool out of the one stat
everything grants. The Ward wants it full and Overflow empties it; that tension
is the trade.

**How you GET one is a placeholder and says so on the screen.** It is meant to
come out of a storyline with the Lampwright that does not exist yet, and that
story replaces the ACQUISITION without touching the tree, the points or the
allocation. Changing trade refunds every point and costs gold
(`tradeSwitchCost`) — a hard lock would be the only unforgiving thing in a game
that replays allocations rather than trusting them.

`src/ui/trade.ts` draws it. Twenty nodes FIT, so that web carries a viewBox and
has no pan, no zoom and no Fit button; the stud art both webs are made of lives
in `src/ui/webart.ts`, and how a web is WALKED lives in `src/webgraph.ts`, over
any list of nodes.

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
skill DOES — a Burst, a Splash, another Projectile, another Cloud — each grant
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

**Out of mana you are STARVED, not stopped.** The pool drains to 0, the cast
happens anyway, and it lands for `MANA.starvedDamage` — 50% — of your damage:
your own skill, its own delivery, every grant the tree gave it, every target it
would have hit. Running dry is a downside you may choose to ignore and answer
by scaling damage, rather than a wall that deletes the build you walked to. It
also means a descent always ends and a headless run can never hang.

The multiplier arrives through ONE seam: `starvedMultiplier(grants)` in
`sim/grants.ts`, which is `MANA.starvedDamage` times the declared
`starvedDamage` grant (product merge). A trade that makes running dry worse —
or better — is a table entry rather than a rewrite. It lands in `dealDamage`,
so ailments and bursts are cut too and no corner of a build runs dry for free.

It is visible: the mana bar goes rust while short of a cast, and the run
readout carries `starved casts` — the count and what one is worth — in rust
once there are any. A bare level 1 spends 0% (Strike) to 25% (Blight) of its
swings starved, measured over real descents with the flasks firing themselves.

## The loop

You press Enter once. A cleared descent launches the next one by itself — that
is not a setting and there is no checkbox for it — and it keeps going until it
is stopped: **you die**, **the haul fills**, **someone is waiting at the
mouth**, or you say so. Saying so has two prices. **Leave after
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
it following; zooming never does. It may sit `CAMERA_SLACK` — a quarter of a
view — past the map's edge, which is what lets a fight in a corner be centred;
clamped to the edge itself, as it was, the camera refuses and you spend the
fight dragging against it.

**The map is the SCREEN, and everything else floats on it.** `body.mapfull`,
toggled by `syncViewportLock`, is the whole of the mechanism: the stage goes
fixed at `inset: 0` behind the shell, and every panel is a corner. Life, mana
and level are a thin HUD bottom left; the three skill slots and the rail are one
stack bottom right; a skinny XP bar runs the full width of the floor under
everything; the flasks are bottom centre.

**A screen is a WINDOW, and only a question stops you.** `.modal` paints no
scrim and is `pointer-events: none` with its card `auto`, so screens no longer
block the map or each other and several can be open at once. `.modal--stop`
is the exception — the confirm, the welcome and the Lampwright — where a scrim
is the point. The inventory is a window like the rest, centred and low, because
every other screen is a verb applied to it.

**A window is DRAGGED by its head, and ON TOP means touched last.**
`src/ui/windows.ts` owns both. A drag writes `--wx` / `--wy` on the card and the
transform is behind `.win--moved`, so the default position stays in CSS and a
window nobody moved is where the layout put it; double-clicking the head puts a
moved one back. Touching or opening one raises it within a band of z-indexes
(`Z_BASE`, under the rail), and `topWindow()` is what Escape answers — with
several open, a hand-written order shuts the one you are not looking at.

**The rail is every screen as a glyph with its key** (`src/ui/rail.ts`,
`src/ui/screenicons.ts`), bottom right. The button IDS are what the guided
opening walks and what the shots lockdown probe asks for, so they outlive any
rearrangement of it. It draws over every window and every scrim, since it is how
a screen is opened and shut. Two of its buttons are its own: Hide parks every
panel and survives its own press AND a reload — `GameState.parked` is a
preference like a keybind — and Fill asks the browser for the screen.

**The map is the GROUND, not a screen.** The dock resolves
`override ?? screenHandler ?? base`; the run sets `base` on every phase change
and a screen sets `screenHandler` when it takes focus. Set from the same slot,
a descent ticking over stole the dock from whatever screen was holding it.

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
src/webgraph.ts    how ANY web is walked: reach, refund, replay
src/scenes.ts      the authored rooms; src/scenes/* are their content
src/game/scenes.ts what happens at the end of THIS clear, at most one thing
src/skills-tree.ts per-skill webs; src/trees/* are their content
src/trades.ts      the character's own web; src/trades/* are the two trades
src/trees/spec.ts  how a tree is written down; layout.ts turns it into nodes
src/sim/grants.ts  every switch a tree may hand the sim, and who reads it
src/sim/           the deterministic simulation
src/game/crystals.ts  gifts, quests, and a crystal's climb from level 1 to 4
src/render/        renderer seam: canvas2d fallback, pixi default
src/ui/            one module per screen
```

## One word per mechanism

`KEYWORDS` in `src/keywords.ts` is the game's vocabulary, and it is the only
way any of these things may be said. A talent used to say "strikes one
additional enemy near the target" and another "passes through one enemy", which
is two phrasings of one idea and neither word worth anything anywhere else.
Now it is **+1 Projectile** and **+1 Pierce** — and a bow skill that says
+5 Arc later costs nothing to learn.

Twenty of them, in three groups. How a use reaches more than one enemy —
**Projectile**, **Pierce**, **Arc**, **Spread**, **Repeat**, **Burst**,
**Splash**, **Cloud**. Damage over time — **Ailment** and the three that are
kinds of one, **Burn**, **Bleed**, **Poison**. And the words every line leans
on — **Area of Effect**, **increased**, **more**, **Critical**, **Resistance**,
**Armour**, **Starved**, **Charge**.

`means` carries its own numbers out of the same tables the sim reads
(`PROJECTILE`, `DEFENCE`, `MANA`, `POTIONS` in `data.ts`), so a glossary cannot
quote a figure the sim stopped using. `KeywordDef.grants` names the switches
that ARE the keyword, and `kin` is a keyword that is a KIND of another — saying
Burn satisfies a node granting an Ailment switch, because Burn is the better
line.

**It is shown, not hidden behind a second hover.** `.tip` is
`pointer-events: none` and always will be, so a word inside a tooltip cannot be
hovered again. `src/ui/glossary.ts` marks every keyword where it appears
(`.kw`, one colour everywhere) and prints what each one means at the bottom of
the same card — so you read the definition where you meet the word, and it
works on a phone, which has no hover at all. Both webs draw their node cards
through `nodeCard`; item cards MARK keywords and a unique also carries the
definitions, since a named piece holds no modifiers and has the room.

**`BANNED` is what the game may no longer say** — "chain", "leaps", "passes
through", "additional target", "explodes" — mapped to the keyword that owns
each. The demo sweeps every tree node, trade node, skill, currency, quest,
modifier line and `GrantDef.what` and fails on any of them, and it also holds a
node handing over a keyword's switch to naming that keyword. A talent cannot
quietly invent a second word for Pierce.

## Adding a skill tree

A tree is a `TreeSpec` in `src/trees/` and a line in `BUILT_TREES`. Six
branches, six trunk notables — `buildTree` refuses anything else rather than
dropping the extras.

Content only: `layout.ts` owns every coordinate. Give the tree a `prefix` no
other tree uses, because node ids are what a save points at.

**What two nodes come to is written down.** `GrantDef.changes` puts every
switch a delivery reads into one of seven CLASSES — scale, duration, targets,
burst, field, crit, type — and `INTERACTIONS` in `src/trees/interactions.ts` is
all 28 pairs of them with what taking both comes to. The audit is over classes
rather than nodes because at node level it is 742 pairs across three trees,
which goes stale the day a node is added; a new node cannot invent a
combination without inventing a class, and the demo fails an unwritten pair.

Nothing is `blocked` today — every pair composes, Rupture's burst under
Blight's cloud tree included, which turns out to be a trade the card already
names rather than a contradiction. The refusal exists for when one appears:
`blockedBy` in `src/skills-tree.ts` is what `canAllocate` asks, and the node's
tooltip says which allocated node it clashes with and why.

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
