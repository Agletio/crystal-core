# Crystal Core — Roadmap

**The work that is left, and nothing else.** What is always true is `CLAUDE.md`
and the skills it indexes. If a thing here is not a task or something you need
in order to do one, it is in the wrong file.

## Where this stands

**ONE PHASE IS WAITING and it is BLOCKED on a question**: more characters, which
the user asked for in the same breath as dual wielding — *"We also need to add a
few more characters so we are going to end up well into the 10s of thousands of
gens."* What a character IS here is a TRADE, and a trade is a body, a roster of
weapon variants and a 45-node web whose every notable changes a RULE. The art is
arithmetic; **the web is not, and open question 9 says the user wants trades
reworked with no spec.** Ask before spending. The quest log after it is parked
by his word until a start with nothing explaining it has been played.

Everything else that was asked for has landed: the weapon soft-lock, the two
wrong weapon bodies, the walls and the north lip, the kiting, the people you
have met, what the sheet says about an ailment, Rimespike's pack clear, dual
wielding, the camp REDRAWN as a picture you click rather than a place you walk,
the rail's border cut from 14px to 6, and the opening deleted — a character is
armed as it is made and lands in the camp.

**Everything before them has landed.** The trials-web round — the web and its
six arms, all three events, the skill-tree tints, the arrow, the ailment rework,
settings and the book — and the trades round after it: pan and zoom, forty-five
nodes a trade, Aether Ward and Overcharge. So has everything since — the Burst out of the trees, the
text rules, attributes on gear, the effect redo, the weapon rework and the
opening. **The balance pass has RUN** — the user released it, and the whole of
what it found is below. Phase 2 (a quest log) stays parked by his word until a
start with nothing explaining it has been played.

**ART IS GENERATED, and that is now written into `CLAUDE.md` and the `art`
skill.** *The user's call: "make sure you're using the pixel lab art generator
and not creating art yourself."* The seven icons that shipped hand-drawn were
replaced by generated ones the same week and the grids are gone. **Nothing new
is written by hand** — a picture is a row in the words-file for its tool and a
run of that tool, and if the key or the network is missing the right answer is
to say so and leave the art undone.

**One ask has NOTHING to bind and was not invented.** *"Keybindings for flasks,
and boss controls"* — the flasks are `potion_life` and `potion_mana` in
`BINDINGS` and rebind on the keys tab, but **a boss is not driven by the player
any more.** The turn was deleted and the fight rebuilt around what a build
carries, so `BossDef.phases` is a cycle the boss runs and there is no verb left
for a key to hold. Ask before adding one; it would be a mechanism, not a
binding.

**Under the four phases this file holds a parked phase, a held pass, the open
questions and a backlog nobody asked for. Once the four are done, say so and
list what is left rather than inventing work.**

**What landed, in one line each**, so a session that has to undo one knows where
to look:

| | |
|---|---|
| the trials web | `src/trials.ts`, `src/trials/*`, `TRIALS` in `src/data.ts` — six arms, eighteen nodes, six trials, per character |
| Hoards | a pack modifier: `HOARD`, `hoardChance`, the `cart` prop, `openHoard` |
| the Welling | `wellChance`, and the `risen` rank at weight 0 that bounds it |
| Bearers | `bearerChance`, a `risen` body carrying a gated `RelicDef` |
| the tints | `docs/index.html` — allocated and available split by VALUE, not hue |
| the arrow | `bowMuzzle` in `src/render/pixi.ts`, render-side only |
| ailments | `AILMENTS` in `src/data.ts`; applied by damage TYPE, bought never free, the hero's alone |
| settings | keys, the filter moved in, and the book — `src/ui/settings.ts` |
| one camera | `src/ui/webcam.ts` — the skills web and the trade web pan and zoom through the same class |
| the trade webs | 45 nodes each, a stem of three forking into two branches of three; `src/trades/{spec,layout}.ts` |
| Aether Ward | a share of every hit is paid out of mana first — the mechanic was right, the words were not |
| Overcharge | ADDED damage equal to the mana spent, and nothing at all if the cost went unpaid |
| Shockwave | the sixth main skill and the second melee one: the `cone` behaviour, the Cone keyword, `src/trees/shockwave.ts` |
| Strike, reworked | Splash is GONE — `cleave` is now `melee`, one enemy hit hard, and Echoes are bought |
| three passive slots | `SkillSlotDef.unlocksAt`, opening at levels 1, 20 and 40 of the 99 there are |
| six more passives | Contagion, Blood Pact, Refraction, Unmaking, Unbinding, Featherstep — nine new grants, all read off STATS |
| Dodge | a HIT stopped outright, TRADED for armour and never worn beside it; `DEFENCE.dodgeCap` |
| Rimespike | the seventh main skill: Cold, one target, 104 at 0.90/s, `single_target` with its own web about what a Chill is worth |
| Sundering | the BURST as a passive — flat off character level, on a clock, scaled by nothing the build owns |
| Hoarfrost | a spike every 0.7s at everything Chilled, flat off level, and worth nothing to a build that Chills nothing |
| ten generated icons | through `icons.json` → `icon.mts` → `portrait.mts`, replacing every hand-drawn grid |
| the shelf is PICTURES | `SKILL_SHELVES` — attacks and spells share one, a header bar per category, a tile per skill and the card on the hover |
| the Burst left the trees | six branches rethemed; `explodeOnKill` survives on two uniques and nowhere else |
| every line says its number | no sentence explains a mechanic a second time, no total is counted for you, no stat is given twice |
| attributes roll on gear | `ATTRIBUTE_MODS` — all three, as gear mods like any other |
| Contagion is capped | it spreads to 2, and each spread is an explosion drawn in the ailment's own colour |
| shred is VISIBLE | `Entity.shred`, a ring under the body and arcs over it, in the group's colour |
| a weapon has damage | base physical on 18 bases; its OWN increases are LOCAL, wands keep spell damage |
| a skill names its weapon | `SkillDef.requires`, and NOTHING is refused for it: `weaponRefusal` shuts the Fissure and marks the hand instead |
| THERE IS NO OPENING | *"It should just be you pick character/name/skill and land in the town. Have it just give you an appropriate weapon for the skill you picked."* `begin()` calls `armForSkill` and `goHome()`; the workshop is no longer the first thing a character sees, and `openOpening` is gone. The Lampwright keeps his later meetings, and `dev-owe` is how a harness reaches one |
| rock fades to black | `wallFade` — a generated tileset drew a screen of repeating slab past the carve; now it is the band next to the floor and nothing else |
| the CEILING is measured | `bestBuild` beside `ladderCharacter`, and a FLOOR AND CEILING table in the demo |
| danger reaches the body | `DANGER` and `dangerStep` — monster life and hit rise with what danger alone buys, saturating with run power |
| you go and SEE somebody | `metMark` / `folkMet` — meeting somebody takes them off the schedule and puts them on the Fissure screen, so a relic you keep is a decision rather than the same room at every clear |
| KITING IS GONE | tried as a passive, then as the SKILL's, then removed entirely — *"kiting is too op. I think remove it entirely for now"*. A build stands in it, ranged and melee alike. It comes back as a passive that pays for it, in Open questions |
| a trade is taken up ONCE | the user's call: the one hard lock in a game that refunds everything else. What gold buys back instead is every ATTRIBUTE point, `respecCost` — the one allocation no click undoes |
| the CAMP is a PICTURE | *"build it not using the tile sets and just use art… we don't need the characters to move around"* — one 688×384 generated scene in `src/render/generated-scene.ts`, hotspot rectangles measured in its own pixels in `src/scenes/camp.ts`, and `src/ui/camp.ts` scaling the lot by one factor so nothing can drift. No map, no carve, no walk: `place` is gone from `SceneDef` and the `camp` `MapTheme` with it |
| DUAL WIELDING | the off hand takes a second one-handed weapon: `DUAL` in `src/data.ts` puts 75% of one hand and 55% of the other into every hit, and `swingCooldown` ALTERNATES between the two rates around their even mean. Twenty pair variants over two heroes — `pairs.mts` layers a `_off` row onto the variant that already holds the other weapon, so a pair is 20 asks and not 20 rewrites |
| Rimespike reaches a PACK | the `depth` arm is gone and RIMEFIELD stands in its place — every 4th cast leaves a Cloud where the spike went in, no damage and the build's own Chill. `fieldOnCast` / `fieldEvery` in `src/sim/grants.ts`, `leaveClouds` in `src/sim/skills.ts`, and `SkillUse.leave` is the seam a Cloud applies through |
| a person in the camp is CLICKABLE | `mountFolk` in `src/ui/camp.ts` — everybody you have met gets a hotspot the size of their own body's grid, where that body is drawn, and it opens their room |
| the camp is HOME | the game OPENS on it and every ending comes back to it — `goHome()`; the Fissure card is a WINDOW the crack opens, `open-fissure` on the rail beside it. Eight hotspots: the crack, the four sockets in the rock, the bench, the shelf and the tent. What MOVES is light and wind on one canvas over the art, plus the hero and everybody you have met drawn from `GENERATED` at their own idle cadence |
| and a PERSON in it is clicked | `mountFolk` in `src/ui/camp.ts` — everybody you have met gets a hotspot the size of their own body's grid, where that body is drawn, and it opens their room |
| the rail is a SLIM plate | the `card` frame put a 14px riveted band round a 34px row of buttons, which is nearly as much border as content. `head` is authored as a bar and is applied at its own scale — `var(--fix-head) 6 16 / 6px 16px` — so the corner is 48px shorter and no row of the art is resampled |
| NOTHING goes under a wall | tried and REVERTED at the user's word — *"it looks really bad when other things clip under the walls in certain spots"*. One `wallLayer` behind every body, one clearance every way, and the demo PRINTS how close feet come to rock so the margin is a number |
| and the NORTH lip is closed | the drawing offset cleared the face with the body at its tile CENTRE and `fits` let it drift 0.16 north of that, so at the extreme the feet drew 0.07 tiles INSIDE the rock. `FACE_FOOT` / `FOOT` moved to `src/vignettes.ts` where the grid reads them too, and `Grid.fits` refuses a body high enough to draw its feet in the face. The south is a GAP rather than a clip and the demo prints it: 0.33 tiles of drawn ground out of reach |
| the greatsword points UP | `weapons.json` gains a `carry` clause and `variant.mts` composes a variant's states out of it; the sword-and-shield bodies carry ONE shield |
| bodies HOLD their weapons | 26 variants over two heroes: eight weapons, four of them again with a shield, and a shield alone. `weapons.json` is the shared vocabulary |
| a weapon COUNTS AS | `WEAPON_COUNTS_AS` — a requirement is answered by anything bigger. A skill wanting a mace takes a maul; one naming the maul takes only that |
| greatswords, mauls, staves | three two-handed families, and a melee/spell split on the staff and the dagger: one ART, two implicits |
| nothing is PINNED any more | `HOLDING` names all nine `HELD` rows and `heroSpriteFor` picks a body off the PAIR of hands; a pin is the fallback for a pair nobody drew |
| a weapon has a RATE | `WEAPON_RATE` and `weaponRate` — a maul swings 0.8/s where a dagger swings 1.55, and an untagged increase ON the weapon is LOCAL like its damage |
| the card says both numbers | `addedEffectiveness` and `rateMultiplier` print on the main slot: you cannot pick a weapon off a damage total |
| an ailment is PRICED on the sheet | `ailmentLine` in `src/damage-text.ts` — a row per damage type the build deals, each in its own units; Refraction's Prismatic gets a row of its own because it lands at hit time; `asConverted` retags a node's sentence; flat percentages say `%` |

**The balance pass RAN, and what it found was that nothing had ever been
measured against a build.** *The user's call: "I have a feeling your checks are
not checking in a useful manner and even tuned to where every skill fails all
runs I could still make many builds that work."* He was right, and the numbers
are in `CLAUDE.md` and the `harness` skill. Two things came out of it:

- `bestBuild` in `src/sim/loadout.ts` — the CEILING, searched over plate, mod
  pool, attributes, passives, mover and a greedy tree walk, then PLAYED, against
  `ladderCharacter`'s random walk. It is 1.4x the floor at band 1 and 3.0x at
  band 6, so every difficulty number before this was aimed up to three times too
  low. Everything measuring what a descent PAYS now runs one.
- `DANGER.lifeAtTop` / `hitAtTop` through `dangerStep` — danger now reaches the
  BODY. It had to: a band 6 map's monsters had the 27 life of the bare
  Fissure's, 90 of them died a second, and a build stopping 88% of every hit on
  1813 life out-regenerated the entire map. Measured on the LOW-WATER mark
  rather than the life you walk out on, nothing in the game had ever taken a
  build below 89%.

**The next word is his.** *"Id rather test all together then iterate on one
thing at a time"* — so what comes next is whatever playing it turns up.

### Live known issues

- **The tier ladder the boss is meant to gate does not exist yet.** The fight
  itself now lands where it was asked to — full tier 1 answers it with speed or
  with plate and with neither it does not — but nothing about beating it opens
  anything. Item tier is bought by run POWER alone (`DROP_BANDS[power].ilvl`
  against `BASE_TIER_ILVL = [1, 22, 46]`), families are held to the SAME threat
  by the demo on purpose, and `BOSSES` has one entry. The open question is #11.
  **Beating it now pays a TRIAL POINT**, which is a different answer to the same
  complaint and does not settle the tier ladder.
- **The Lampwright shot is no longer a lottery, and the seed fault it hid is
  still there.** `shots` used to wait out a whole cleared descent to reach him
  and went red on `the first descent never met the Lampwright` — commonly
  because running it beside `demo` or `smoke` starved the browser out of the
  two-minute wait, underneath which sat a real fault: dressing a descent
  consumes one draw from the run's rng, so a descent reaching `#met` is a seed
  away from not. He is the OPENING now, so `shots` meets him before any descent
  and neither cause can reach it — but **the seed fault is undiagnosed and
  unfixed**, and it is what a scene owed at the end of a descent still rides on.
  **Still re-run `shots` alone before treating a red as a regression.**
- **The first-visit boss ARRIVAL has never been watched.** The camera crosses to
  the boss, holds, comes back, then your own character speaks — and the dev kit
  marks every boss beaten, so entering through the dev menu always takes the
  rematch path and skips the look. The spawn-before-pan half is verified; the
  pan itself is typechecked and unwatched. Look at it the first time a real save
  reaches the room.

### If something has to be reverted

Tags cannot be pushed (the remote answers 403 on `refs/tags`), so these are SHAs
and this file is where they live.

| commit | what it is |
|---|---|
| `3f31b6a` | the last commit with the Fissure still HAND-DRAWN. Reverting here undoes the generated zone in the game and keeps everything else. |
| `83b8488` | the BLANK room: every generated tileset deleted, props and bodies kept. Drops generated terrain entirely. |
| `452887c` | the commit that put the tileset into the Fissure. |

---

## Writing a phase

The test is whether a session with no memory of this conversation could execute
it. Six things, and the second and fifth are the ones usually missing:

1. **What is true today**, named in code — the constant, the function, the file.
   "The shop sells too much" is not executable; "`RECIPES` has eleven entries
   and should have one" is.
2. **Why it is wrong**, in one sentence a stranger would agree with. Without
   this the next session optimises the wrong thing correctly.
3. **Checkboxes that are decisions**, not tasks. One that can be done wrong and
   caught.
4. **Traps** — what a fresh session will get wrong because the codebase already
   has an answer somewhere it will not think to look.
5. **Done when**, in one observable sentence. A phase with no stated end gets
   half-done and reported as finished.
6. **What must not break**, and which harness proves it, in the ORDER to run
   them.

Anything you are unsure about goes in Open questions, never into a phase as an
assumption. **A decision taken on the user's behalf is written down as a
decision, with what it beat**, so overruling it is one sentence rather than an
excavation.

**Every phase puts itself in the dev kit.** `START_PRESETS.dev` and
`DEV_CURRENCY` in `src/data.ts` — a screen nobody can reach is a screen nobody
tested.

---

## The balance pass — RUN, and what is left of it

**The first round has landed.** *The user's ask: "make it as hard as you think
you can from the very start to where you think it will just barely be possible
to complete."* Measured, at four seeds a band:

| | |
|---|---|
| naked, level 1, bare Fissure | still clears — the one check that stays a failure — down to **45%** on the way, where it never went below 50% before |
| band 1, ceiling | 6/6, down to 65-96% |
| band 3, ceiling | 2/6 to 6/6, down to 8-74% — **the spike**, and melee is what it catches |
| band 6, ceiling | 5/6 to 6/6, down to 22-89% |
| band 1-6, FLOOR | dies 1 in 6 to 5 in 6 — a random walk is no longer a build |
| the deep end at level 40 | 0/6, dead in six seconds |
| the deep end at level **99** | **3/6, down to 29%** — the top is content you build toward |

**What is still crooked, and is a gauge rather than a task:**

- **Band 3 is harder than band 6** for Strike and Fireball. Not the curve —
  danger 124 against 404 — but the character: level 22 in band-2 gear is the
  thinnest point on the ladder.
- **Arc Lightning is barely touched anywhere**, sitting at 96% low at band 1 and
  82% at band 6 where Blight reads 22%. A ranged chain skill does not stand in
  anything.
- **Strike at level 99 still dies at the deep end.** Melee with the most danger
  four crystals can roll is the case nothing answers, which is the same finding
  the parked wall check has been printing since Splash was removed.

**What it reads.** The `gauge()` lines in `npm run demo` — measured, printed,
never asserted, each carrying the figure that was wanted beside the figure it
got. The section to read first is **FLOOR AND CEILING**, which did not exist
before this round and is the one that says whether any of the others mean
anything.

### It owes two parked checks

Each is a `parkedCheck` in `src/demo.ts` printing its number and failing
nothing; the pass puts them back to `check`. **The demo prints its own parked
count and this list has to agree with it — two today.**

1. **"the characters checked actually cover every shape it polices"** — the
   sheet audit no longer builds a character exercising a "more" line.
2. **"plate answers the boss a rung earlier than speed does"** — the PLATE half
   is fixed and the other half is not. Weapons taking damage of their own put
   full tier 1 plate back to **8/8** from 0/8, which is where it should be. But
   thin tier 1 SPEED now clears **5/8 against a floor of 0**: a weapon carries
   damage at every rung, so the rung below the gate got the same lift the gate
   did. That is the half still parked.

The boss grid's MECHANISM is still a real `check` and stays one — speed answers
it at full tier 1, a build with neither answer never does, and t2 trivialises
it. Only the rung PLATE comes good at is parked.

One more `parkedCheck` site exists and currently PASSES — every band paying more
than the one below — so it prints a tick and counts for nothing. **Strike's
`baseDamage` was calibrated against the boss grid** at 80 (95 let thin tier 1
clear it 5 times in 8; 72 left full tier 1 plate at 4/8), and that calibration
is now against a grid whose plate row is parked, so it is worth re-deriving in
the pass rather than trusted.

### It also owes the two newest skills and the off hand a look

None of it is a check today.

- **Lightning Arrow is the strongest main skill and Fireball the weakest** —
  6.50 kills/s against 3.59 at the reference rung, Strike 5.19, Arc Lightning
  5.34. A bow gives up a shield to get there, which the grid cannot see because
  `ladderCharacter` never holds one.
- **What a shield is worth is not measured against what a bow is worth.** Every
  ladder character wears a shield, so every band gained armour and up to 22%
  Block against grids recorded before it existed. The honest comparison needs a
  measured character holding a bow, which `starterLoadout` deliberately refuses.
- **`DEFENCE.blockCap` at 60% with a Block that stops the whole hit** is the
  simplest rule that could work and has not been weighed against anything.

**What must not break.** `CLAUDE.md`'s "Balance is NOT TUNED" inverts when this
starts, and has to be rewritten in the same breath — it is the statement that
the pass has not happened. The one difficulty check that is a `check()` — a brand
new character clearing the bare Fissure — stays a failure throughout. And the
per-skill numbers are five skills wide, which is still thin.

**What it is NOT.** Not a licence to change systems. A balance pass moves
numbers in tables; if it wants a mechanism changed, that is a phase.

---

## The trials web — what it IS, now that it is built

**The whole of the user's proposal, in his words:** *"I think the anwser is just
another skill tree. Unlock points through various challenges that come up as a
sort of story mode, maybe its the boss fight, maybe its a really hard map we
specifically create, you unlock it sequentially through the story, Encounter
someone they show you a room, a boss etc. fight it and win you get points for
your new skill tree. The tree can have stuff similar to POE league mechnics that
make certain things harder and mroe rewarding. Like we can add events essentially
around the maps that have harder enemies, better loot, etc."*

**What is wrong today**, in one sentence: `CRYSTAL_LEVELS` tops out at 3
modifiers and there are 4 sockets, so **12 crystal modifiers is the entire
permanent difficulty ceiling of the game** — a player who out-grows it has
nothing left to turn, which is the first of the two failure modes he named.

**Why a tree and not a slider.** A slider is a difficulty setting; a tree makes
reaching further along the same axis into the CONTENT. The points are earned
sequentially from authored rooms, so "I am blowing through this" becomes the
trigger for the next thing rather than a reason to stop.

### Decisions taken, and what each beat

- **Per character**, on `Character`, beside `tradeAllocated`. The user's call.
  It beat account-wide, which was mine: account-wide means a second character
  never re-walks the soft part, but it also makes the first character's
  achievement invisible on every one after it.
- **Called a TRIAL, and that is the only word** — the challenge is a trial, the
  web is the trials web, the points are trial points. `trial` appears **nowhere**
  in `src/` today, so it costs no collision. It beat "the world web", which
  collides outright: `world` already means a monster family in `CLAUDE.md`, the
  demo and half the tables. Renaming is one sentence and a prefix.
- **Three event MECHANISMS, not four.** Hoards, the Welling, and Bearers — where
  Bearers is one mechanism with a ROW per relic rather than two near-identical
  events for the Osteomancer and the Astral-Geometer. That is what makes the
  count land on the user's own *"start with 3 different events"* after he
  described four.
- **Every phase ships points AND something to spend them on.** Each event phase
  adds its own trial to the ladder as well as its own nodes, so no phase ends
  with a tree nobody can fill or points nobody can spend.

### The story the trials are told in — the user's, and it settles open question 1

*"I say the story is based around lamwright and lambengolmor kinda not liking
eachother and each pulls you in different directions. The other characters you
meet can just be effectively 'league mechanics' to steal POE terminology more."*

Two consequences a phase has to honour:

- **The Lampwright and the Lambengolmor are the SPINE**, and they disagree. Both
  rooms exist — `src/scenes/workshop.ts` and `src/scenes/reading-room.ts` — and
  both men already have a voice. **The trial ladder is their argument**, which
  answers open question 1 (*what the Lampwright wants*) without inventing a
  third character.
- **Everybody else is an EVENT-GIVER, not a plot.** The Osteomancer and the
  Astral-Geometer hand over a mechanism and go back to their room. Do not write
  them a storyline; do not give them a rival.

**Unwritten, and NOT to be guessed at:** what the two of them actually disagree
ABOUT, and whether being pulled one way closes the other off. A branching ladder
is a different table from a linear one — `TRIALS` is walked in order today, and
a fork is a second field. **Ask before authoring the second room.**

### The seam, as BUILT

`trialMod(character)` in `src/sim/stats.ts` folds the allocation into ONE
synthetic `RolledMod`, beside `treeMod` and `attributeMod`. `runSet(crystals,
standing?)` merges it, and the ONLY caller passing it is the `RunSim`
constructor — every measurement in the demo still builds a set from crystals
alone, which is what keeps a rung a rung. A node reading `monsterLife` or
`packSize` needed no plumbing at all, and `crystalRewards` scores every one of
them through `DANGER_STATS`, so harder-and-better-paying is the arithmetic that
was already there.

`monsterRank` is the one stat this invented: `percentStat(set.mods,
'monsterRank')` lifts the weight of every `MONSTER_RANKS` row above common, in
`spawn()`. ONE weighted pick either way, so lifting it cannot move a seed.

**What an EVENT needs on top of that** is a resolved bag on `RunOptions`, the
way `potionThresholds` and `beaten` already ride there. `src/sim` must never
learn where it came from.

### Traps — still live, for anything that adds an arm

- **A "×danger" node buys ITEM LEVEL for free, and that breaks a standing
  rule.** `runSet` computes `power` from `rewards.danger / POWER.perDanger`, and
  `bandFor(power).ilvl` is the drop tier. The rule is *"Power buys access;
  composition and modifiers buy payment."* So a node whose whole content is a
  multiplier on `crystalRewards` hands out tier-3 bases for nothing. **A trial
  node adds real monster stats and lets danger and power move honestly, or it
  pays in `rarity` / `yield` and leaves `power` alone. A bare danger multiplier
  is refused.** The user asked for one by name — this is why it is not built as
  asked, and it is the single thing most likely to be got wrong.
- **Automation is universal and has NO exception.** Anything a player could do
  mid-descent needs a shipped default policy that `runToCompletion` runs, and
  that policy is the only implementation. This is why a Hoard is **never
  clicked** — an event with no interaction in it satisfies the rule
  by construction, and is the cheapest correct shape.
- **A run must always END.** `runToCompletion` is bounded at 600s and a headless
  run that does not finish is a mechanism FAILURE, not a balance number. The
  Welling spawns monsters from corpses; unbounded, it never terminates.
- **`s.totalMonsters` counts the whole encounter the moment it starts**, or the
  readout ticks down and then climbs. Anything that adds bodies mid-descent has
  to say so to the counter.
- **The tree must not become pure upside.** The crystal rule is that a modifier
  with no downside is *"a mod with no decision in it"*. Points are scarce by
  construction (one per authored trial, and trials are authored), but nodes must
  still compete — the ring/branch shape does that if the layout is walked, and
  does not if every node hangs off the centre.
- **`replayWeb` or the allocation is trusted**, which is the one thing `heal()`
  exists to prevent. Points earned is `Character.trials.length`, so a trial that
  is deleted refunds rather than stranding.
- **Node ids are what a save points at.** Give the web a `prefix` no other web
  uses.
- **A new screen is a new shot.** `npm run shots` walks 30 screens against a
  checklist; a rail icon with no entry in `ICONS` renders nothing and fails
  nowhere.
- **Every phase puts itself in the dev kit** — `START_PRESETS.dev`, so the web
  is reachable without beating anything.

---

## Not a phase — where the balance pass sits against all this

The user's own last clause: *"Then just tune the scaling difficulty better to
where when you get those high end danger mods its actually going to require a
clever build with very good gear. For that stuff im not even sure its going to be
something you can test."*

**Half of it is testable and it is the important half.** Proving a clever build
CLEARS the deep end needs authored candidate builds, which rot every time a
system lands. Proving the WALL EXISTS — that a naive build fails at a given
danger — is `ladderCharacter` plus `runToCompletion` over a grid, which the demo
already does, and a run that never ends is a mechanism failure rather than a
balance number. That is what answers his second fear.

**I recommended running the balance pass before the events and the user
overruled it**, on grounds that are better than mine: *"imagine if we had spent time
balancing before we implemented this map skill tree even it would throw things
off massively. We also need to add more passives that could be a large power
source and probably iterate on trades as well."* The trials web, an ailment
rework and a passive pass are each a power source that moves every number, so a
pass run now is a pass run twice. **The pass is HELD. Do not start it.**

What follows from that: **trial node values are provisional by construction.**
Author them to be obviously interesting rather than obviously balanced, and do
not add a check that fails on one.

---

## Phase 1 — More characters

**The user's ask, in full:** *"We also need to add a few more characters so we
are going to end up well into the 10s of thousands of gens."* He is right about
the scale and knows it; what he has not said is WHICH, or what they DO.

**What a character IS in this game.** A TRADE. `Character.trade` is chosen when
the character is made and is what the hero LOOKS like — `TRADE_BY_ID[trade].spec
.sprite` is the body every variant is a variant OF. There are two: the Alchemist
and the Aethermancer (`src/trades/`). A third is not a table row.

**The art cost, measured on the round just finished** — this part is arithmetic
and needs no decision:

| | |
|---|---|
| the body itself | ~68 generations, most of an hour |
| a portrait | 1, through `create_portrait_character` — nobody has spent one yet |
| 8 weapon variants + 5 shield ones | ~13 × 90 ≈ **1,200** |
| 10 dual-wield pairs | ~10 × 90 ≈ **900** |
| **one trade, end to end** | **~2,200 generations**, and about 0.6 MB of bundle |

**Everything that makes it cheap is already built.** `weapons.json` says what
each weapon looks like once for every hero who carries it; `variant.mts` composes
a variant's five states out of the base body's; `pairs.mts` layers an `_off` row
onto the variant that already holds the other weapon and seeds the row to
animate into. A new hero is `bodies.json` + `pairs.mts` + one run of each — no
new words per weapon and no new tools.

**THE WEB IS THE PART THAT IS NOT ARITHMETIC, and it is the blocker.** Five
spokes of nine, 45 nodes, and **every notable changes a RULE rather than a
number** — the demo fails a notable whose whole content is stat lines, and that
is the rule the whole system lives on. Two trades exist and open question 9 says
the user wants them REWORKED, with no spec. Authoring two more webs against a
shape he may be about to change is the expensive way to find that out.

- [ ] **ASK FIRST: how many, and what is each one ABOUT?** A trade is a
      one-sentence idea before it is 45 nodes — the Alchemist is potions as an
      engine, the Aethermancer is mana as one. **Do not invent a third.**
- [ ] **And ask whether the WEB comes first.** Open question 9 is unanswered; a
      new trade authored against the current shape is a new trade to redo.
- [ ] **The body is designed, approved, rotated, animated and JUDGED before
      any variant is queued.** A design is one generation and a roster is 2,200.
- [ ] **A trade's sprite is a `TradeSpec.sprite`**, and `heroSpriteFor` falls
      back to the base body for a variant nobody has drawn — so a trade ships
      playable the moment its body lands and gets its weapons afterwards.
- [ ] **Every phase puts itself in the dev kit.** A trade nobody can take up
      without making a character is a trade nobody tests.

**Traps.** `takeUpTrade` refuses a second trade outright — it is the one hard
lock in a game that refunds everything else, so a new trade is not something a
save can try on. `ladderCharacter` takes NO trade deliberately, so nothing
measured will notice a new one; what a trade is worth is printed beside the deep
end and asserted nowhere. The demo sweeps every trade node for a banned phrasing
and for a notable that is only numbers.

**Done when.** A new character can be made, is drawn holding what it carries,
and its web changes rules the other two do not.

**What must not break.** `npm run demo` (the trade sweeps), `smoke`, `shots`.

---

## Phase 2 — A quest log instead of a pointing finger

**Not next, and deliberately.** The tutorial was deleted outright so the opening
can be PLAYED with nothing explaining it. This is what teaching eventually
becomes, and it does not start until that has happened — *"once all the systems
are in place and we see how the intro plays out then we add it in small parts as
needed."* **Do not take this phase because it is next in the list; take it when
asked.**

**Why the old one was wrong, in the user's words.** *"The whole click here
highlighting stuff works but it feels like a cop out and mobile gamey. Everyone
I've seen play immediately wants to click on things the tutorial doesn't let
them."* The lockdown did not merely fail to help exploration — it FORBADE it.

**Most of the machinery is already here.** `CRYSTAL_QUESTS` is
`{ id, name, detail, need, gives }`, `need` is clauses ANDed, `kind` names an
entry in `QUEST_CONDITIONS`, and `detail` is the objective already written in
words. What is missing is a screen to read them on, a way for a person in a room
to hand one over, and a reward that is not always a crystal.

- [ ] **A quest log, on the rail like every other screen.** Active quests with
      their `detail`, and what is done. `detail` is the specific instruction, so
      dialogue can stay atmospheric and the log can say "put a Shard of Making
      on a socketed crystal".
- [ ] **A quest is GIVEN, in a room.** A `SceneDef` names the quest its person
      hands over. The existing crystal quests are ambient and complete in any
      order; decide whether they become given too, and say why.
- [ ] **`gives` stops being crystal-shaped.** It is `{ level, family }` today.
      Generalise it the way `GrantDef` generalised a switch, so a new reward is
      a table row.
- [ ] **Quest state goes in the save**, and `heal()` drops an id that no longer
      resolves. Offered / taken / finished is three states where today a quest
      is a condition that is either met or not.
- [ ] **Nothing may reintroduce a cage.**
- [ ] **Start from what actually confused a player.** The suspected pair is the
      bench and the socket — nobody discovers "drag a currency onto an item" by
      clicking about — but that is a guess until somebody has played the
      opening-less start and got stuck.

**Traps.** Teaching has no harness and this phase owes one: can a fresh
character reach the first crystal by doing what the log says? `npm run guide`
was retired and its walkthrough deleted with the steps. It owes a second with
it — `dockSlotId`, `slotButtonId`, `recipeButtonId`, `skillCatId`, `skillRowId`
and `skillNodeId` are still minted by the screens that render them, and the
check that each resolved went with the steps.

**Done when.** A new character is never prevented from clicking anything, and a
player who stops knowing what to do can open one screen that tells them.

**What must not break.** The demo's quest checks — every quest's clauses must
still be satisfiable.

---

## Open questions

**Do not guess at these.** None ever blocked a phase and none is work waiting to
be picked up — they are decisions the user has not made. Ask before acting.

1. **Does kiting come back as a PASSIVE that pays for it?** The user's own
   shape, after having it removed: *"I think later we can make a passive that
   makes you kite but take way more damage when you do get hit but lets just do
   that later."* It was built twice — once as one passive's grant, once as a
   property of any skill reaching more than 3 tiles — and taken out both times
   because it made a build strictly better for nothing. The passive shape is the
   one that has never been tried, and it is the one that costs something. **Not
   started, and explicitly later.** Two things it would owe: a retreat that
   PATHS rather than sliding along rock (*"it kites into a corner and kinda bugs
   out glitching in and out of the wall"*), and a mover that does not blink
   forward into what it is backing away from.

2. **What the Lampwright wants.** The trade acquisition is a placeholder and
   says so on its own screen: anyone may take one up at level 5. It was always
   meant to come out of a storyline with him — he is the only person in the
   game and the only voice it has. Nothing about it is written: what he is doing
   down there, what he asks for, how many beats it runs, whether it hands out
   anything besides the trade. Replacing the placeholder touches the ACQUISITION
   only, not the tree, the points or the allocation. **The thing that story
   would be told in is now BUILT and has been used five times** — a room, a
   person in it, beats you click through, a panel at the end that does
   something — so answering this is content under `src/scenes/` rather than a
   system.

   **MOSTLY ANSWERED — see "The story the trials are told in".** The user's
   call: the story is the Lampwright and the Lambengolmor not liking each other
   and each pulling you a different way, told through the trial ladder, with
   everybody else an event-giver rather than a plot. **What is still open is
   what they disagree ABOUT**, and whether being pulled one way closes the other
   off — a branching `TRIALS` table is a different table from a linear one.
   Ask before authoring the second room.

3. **Does Strike ship with one Echo, or none?** The user's words were *"it
   should just be a single target hit that hits pretty hard with ability to hit
   extra targets"*, and it was built exactly that way: zero Echoes bare, the
   whole branch bought. The measured cost is parked check 1 — an untreed Strike
   character is now the ONLY build that dies in Demonic, at 11.5 damage taken a
   second against Shockwave's 3.3. One base Echo at 70% would restore a melee
   floor without giving anything back that reads as Area. **Not taken on his
   behalf: it is his line about what the skill IS.**

4. **Is the Seam meant to be the hardest room, and is it?** Measured over 24
   seeds it sat 0.7% BELOW four Demonic crystals on damage taken per second;
   after the Normal pool became six generated bodies it is **-21.1%**. The cause
   is structural: the Seam takes exactly two crystals of each world, so only half
   its packs carry a Demonic aura and half a Prismatic one, where four Demonic
   crystals put an aura in every pack. Making it genuinely worst means changing
   what the composition DOES — both auras on one pack, or a Seam-only carrier —
   which is a balance decision rather than a measurement. The gap also moves
   several percent whenever anything in the sim changes, so the demo PRINTS the
   margin rather than asserting an ordering.

5. **Does anyone live in the Seam?** Four characters, three worlds and the
   Fissure — the room that is supposed to be the worst in the game has nobody in
   it. `RunState.folk` is a list partly for this. Leans on question 1.

6. **Nothing but the Fissure hands out an element.** Every monster brings its
   own, but which one is a flat roll off `MONSTER_ABILITIES` — a Rot pack is as
   likely to throw frost as a Cavern one. Biasing the table by monster FAMILY
   would make a world's fights feel like that world's: one field on
   `MonsterFamilyDef` plus a weight lookup. Written down because the table it
   needs already exists.

7. **The Cavern and the Fissure have no currency of their own.**
   `sigil_of_upheaval` is gated to Demonic and `sigil_of_finality` to the Seam;
   the other two are gated to nothing. Every world now has uniques of its own —
   the Fissure two — so this may already be paid. **Provisional, and mine:** left
   as it is rather than inventing a gate. Ask before gating an EXISTING currency
   to the Cavern; it would make a staple zone-locked.

8. **What does a TRADE do in a boss fight?** Deferred at the user's word — *"skip
   this for now and get the base mechanics feeling good."* The intent is ONE
   unique interaction per trade, not a second system. Parked proposals: the
   Alchemist's flask extends whichever face is live when it fires, since potions
   are already that trade's engine; the Aethermancer refunds mana on a turn, so
   weaving is how they stay full.

9. **What does a reworked TRADE web look like?** The user's word during the
   polish round: *"trades needs a rework"*, beyond the node theme, with no
   further spec. The retheme itself landed on all three webs, so what is left is
   the trade web's SHAPE or its content, and only the user can say which. **The
   skills layout is explicitly fine.**

   **THIS NOW BLOCKS PHASE 1.** More characters means more trade webs, and two
   more authored against a shape that is about to change is two more to redo.
   Answer this before the third trade's web, not before its body — the art is
   independent of it and is the long pole.

10. **Do the chasms come back?** The whole drop system — `VOID`, ledges, walls
   hanging into a hole, bridges — was built, judged and deleted at the user's
   instruction (`83b8488`). How to draw one: the wall tile placed ONE ROW LOWER
   than it is keyed (the same picture that reads as a wall standing up under
   rock reads as one going down under ground), flanks turned a quarter, no near
   wall, and the void taking no part in the light's blend or the floor fades out
   at its own rim. The code is at `56d599a`. Never asked for twice; here so
   nobody rediscovers the geometry.

11. **MEASURED, and it has far less teeth than this feared.** Twenty pair
   variants took the bundle from 5.34 MB to **6.33 MB**, and 1.04 to **1.15
   gzipped** — about 50 KB of source a variant, not the ~150 KB the estimate
   below assumed, because a pair is five states at ONE facing rather than a
   whole body. The camp round then ADDED a 93 KB scene and gave back 64 KB of
   camp tileset and props, which is what a picture costs against a place.
   Nothing has been trimmed and nothing needs to be on these numbers. The lever
   is still there if a number the user cares about ever appears. The original
   note, for the arithmetic:

   **The bundle is 5.27 MB now, 1.02 MB gzipped, and this is the first time
   the question has teeth.** It was 1.62 MB / 0.43 gzipped when this said
   "nothing about no binary assets is under pressure"; twenty-six weapon
   variants took `generated-art.ts` to 3.82 MB on its own, and it is now 73%
   of everything the game ships. Cost is grid SQUARED times frames, and a
   variant is five states of a 48 grid. **What is wanted is still a number the
   user cares about** — repo size, or parse time on a cold load — but the
   cheap lever now exists and is worth writing down: a variant's IDLE is two
   frames and its WALK is six, so trimming `frames` costs nothing to try and
   `convert.mts` is re-runnable. Nothing has been trimmed on a guess.

12. **How does beating a boss OPEN a tier?** The user's shape: *"you grind the
    fissure get decent t1 beat this boss and then you can progress to the
    prismatic area where you can get t2 items fight a boss progress to demonic
    t3 etc."* — and his own caveat, *"I know the crystal system will probably
    need to be touched up too."* Four things in the way, and none is a small
    edit:
    - **Tier is bought by POWER, not by permission.** `DROP_BANDS[power].ilvl`
      against `BASE_TIER_ILVL = [1, 22, 46]`, and `POWER` is sockets plus
      danger. A player who never fights a boss reaches ilvl 46 by socketing
      four crystals. Gating tier means item level stops coming off power alone.
    - **Families are deliberately NOT a ladder.** `CLAUDE.md` and the demo hold
      Normal, Demonic and Prismatic to the same threat — *"a family decides
      WHICH monsters you fight and nothing about how hard they are"* — and two
      uniques exist to give Normal its own reason. Making Prismatic the tier-2
      world reverses that decision and retires those reasons.
    - **The ZONE is picked by composition, not by family.** `mapTheme` reads the
      whole set, and there are four zones against three families.
    - **`BOSSES` has one entry.** A ladder of three needs two more bosses, each
      with its own body, phases and room — the Answering alone was a phase.

    The cheapest shape that keeps every existing rule: leave families alone, and
    gate the DROP ilvl on bosses beaten rather than reversing what a family
    means — `bandFor` reads `game.bosses` as a ceiling on top of power. Then a
    second boss is a table row plus a body, not a redesign. **Not started, and
    not to be guessed at.**

---

## Backlog

Real, deferred by decision. **Not a queue — do not promote one into a phase
without being asked.**

- **THE OSSUARY HAS TO BE REDONE AS A DEMONIC ROOM.** *The user's call: "know
  that the ostemancer room needs to be comepletely redone as it needs to be a
  demonci themed room. DOnt do it now just know that it needs to be changed
  eventually."* It is `theme: 'demonic'` already, so it draws the Rot's set —
  what is wrong is what is IN it: a bed of pale gemstone is the Cavern's
  furniture, authored before the Prismatic room existed to want it. Its old
  arrangement now lives in `reading-room.ts`. What he stands in instead is
  unwritten and the props do not exist. **Asked for, and explicitly not now.**
- **The Demonic and Prismatic pools are still hand-drawn, six bodies each** —
  the mismatch the Fissure stopped having, a generated floor with hand-drawn
  bodies on it. Twelve bodies is roughly 800 generations and a lot of judging;
  about 0.5 MB of `generated-art.ts`. The cheaper shape, if it is ever wanted, is
  to cut those pools to six silhouettes each the way Normal was cut and generate
  only what survives. **Not asked for.**
- **NO zone has furniture of its own, and that is a decision rather than a gap.**
  The rock dresses all four and nothing stands on any of those floors, because
  the arrangements were cut at the user's word. `VIGNETTES` and `dressRooms`
  survive with no caller, so bringing furniture back is one call and a table —
  plus roughly fifteen `create_map_object` generations a zone and a `tone` pass,
  since existing props are toned to pale sand. **Do not promote this without
  being asked** — a descent with nothing standing on it is what was asked for,
  and it looked better.
- **`livingDecals` went quiet in three zones, and two of them were made of it.**
  A `bare` map stands the zone's own motion down, which cost the Fissure nothing
  and cost the Rot and the Cavern their stirring surfaces — the whole of what
  made those two read as alive. A generated tileset is a still picture and
  always will be. Whether the motion comes back over a set, as animated props,
  or not at all is unanswered.
- **Whether a trade has exactly one right skill.** The line is that favouring a
  skill is fine and requiring one is a skill node that got lost. It is
  UNANSWERABLE until the roster is wider, so the demo prints what each trade is
  worth per skill and asserts nothing. **Do not tune to that print and do not
  add a check that fails on it.**
- **Jewellery has three rungs but no implicit.** The amulet and ring bases
  differ in exactly one way — how many modifiers they hold — which is the
  clearest statement of what a base tier is and also the least interesting pair
  of slots in the game. Implicits would fix it, and they are a balance change:
  the Astral-Geometer leans on the gap rather than fixing it, since a graft ADDS
  on jewellery and the line that changes the delivery charges mana instead.
- **Fewer items per clear.** Gear rolls per KILL at
  `gearChance × yield × (1 + rarity/200)`, roughly two to eleven pieces a clear
  across the bands. The plan was to halve that and gate the armour tiers behind
  power thresholds so quantity resets down as quality steps up, with gold per
  clear flat across a threshold — crossing one must never read as a demotion.
  **Both things it waited on have landed** (base tiers gate themselves through
  item level; sell mode and buy-back make a heap a few clicks), so the question
  is answerable: play it, and if it still feels like too much, measure the rate
  before changing it.
- **No gear line reduces a movement skill's cooldown.** The user's own aside —
  *"a movement skill thats buffed with some CDR (i know we dont have this yet)"*.
  `moveCooldown` is a declared grant with a product merge and `say` already
  written; the only source is `Quickening` inside each mover's own web. A gear
  mod would be one `ModDef` in `GEAR_UTILITY_MODS` carrying `grants:
  { moveCooldown: n }` — but `ModDef.grants` sits on the FAMILY and not on the
  tier, so it is one fixed value or one family per value. The boss now reads
  right without it, so this is a want rather than a gap.
- **A first descent can drop nothing at all.** Gear rolls at 5% a kill, so about
  a third of first clears bank nothing — a new player meeting the payoff screen
  with an empty one. A guaranteed first drop is the obvious answer.
- **Blight, Strike and Fireball are not the same game.** `TRADE RULES` measures
  all three at the deep end every run and reads Fireball 7.50, Strike 4.37,
  Blight 3.90 kills/s with no trade — an ordering that has entirely inverted
  since the old note here. Do not act on it outside the balance pass.
- **A third way to get rid of a piece.** Selling is a mode with a buy-back
  behind it, which is enough that this is no longer urgent — but everything
  still ends at the same counter, and a game whose only verb is "sell" has one
  verb.
- **A drawn recovery frame per creature.** Hand-drawn bodies have one `attack`
  grid each and hold it for the whole swing; the fix is 21 more grids in
  `src/render/bestiary.ts`. Four-frame walks the same way, if they ever grow
  legs worth animating.
