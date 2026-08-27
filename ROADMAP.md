# Crystal Core — Roadmap

**The work that is left, and nothing else.** What is always true is `CLAUDE.md`
and the skills it indexes. If a thing here is not a task or something you need
in order to do one, it is in the wrong file.

## Where this stands

**PHASE 1 — THE LADDER — IS DONE.** The CLIMB (42 rungs, three zones, a rung as
ONE mod on the crystal seam), PERFECT bases, wards by FAMILY, CHALLENGE FLOORS
every fourth rung, a BOSS at the top of each zone, and crystals as TIER TOKENS.
All three of its questions were answered and every piece of it has landed. What
it leaves behind is a balance question for the balance pass: a first cycle is
now tier 1 gear for all 42 rungs, and nobody has measured whether that clears
the deep end.

**PHASE 2 — MORE CHARACTERS — IS DONE.** Four trades: the Alchemist, the
Aethermancer, Mahthar and Obreth, each with a body, thirteen weapon variants and
a web that changes rules the others do not. Obreth also holds the ten PAIRS
nobody else may reach. All that is left of the phase is a decision nobody has
been asked for: whether there is a FIFTH. The quest log after it is parked by
the user's word until a start with nothing explaining it has been played.

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
| crit on the SKILL | `SkillDef.critChance`; every gear crit line is INCREASED, the tree keeps flat, one seam in `heroStats` |
| Ambush | the eighth main skill: the `ambush` behaviour, `SkillUse.blink`, `AMBUSH` in `src/data.ts`, `src/trees/ambush.ts` |
| the Relay | a Critical teleports you into the next body and pays for it; `critChain`, `RunState.relays`, and `SIM` in `src/sim/grants.ts` |
| the rung tag | `#run-rung` and `syncRung` in `src/ui/run.ts` — which rung a descent is on, top right |
| the trials atlas | a MAP: 12 wheels, roads between them, 156 nodes, 60 points; shut until the Fissure is whole |
| the climb, drawn | `src/ui/climb.ts` — ONE ZONE at a time on a tab, a seam down its own generated cross-section |
| every plate | the `head` band is retired: a hairline carved edge, fourteen rules and the piece out of the kit |
| no distance bonuses | `killMore` / `untouchedMore` / `struckMore` / `struckLess` replace `moreClose` / `moreFar` / `warPaint` / `dread` |
| the drop mix | a kind's weight is its SLOTS times what a filter can NAME in it — rings 22% → 8.5% |
| a lit person | a camp hotspot draws nothing; `body()` rims the silhouette on the canvas |
| finding a node | `src/ui/websearch.ts` — one box for the skill, trade and trials webs; the shelf has its own |
| Obreth's weapons | 23 variants: `tools/art/bodies.json`, `variant.mts seed`/`manifest`, `roster.mts` |
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
| you go and SEE somebody | `metMark` / `folkMet` — meeting somebody takes them off the schedule and stands them in the CAMP, so a relic you keep is a decision rather than the same room at every clear |
| KITING IS GONE | tried as a passive, then as the SKILL's, then removed entirely — *"kiting is too op. I think remove it entirely for now"*. A build stands in it, ranged and melee alike. It comes back as a passive that pays for it, in Open questions |
| a trade is taken up ONCE | the user's call: the one hard lock in a game that refunds everything else. What gold buys back instead is every ATTRIBUTE point, `respecCost` — the one allocation no click undoes |
| the CAMP is a PICTURE | *"build it not using the tile sets and just use art… we don't need the characters to move around"* — one 688×384 generated scene in `src/render/generated-scene.ts`, hotspot rectangles measured in its own pixels in `src/scenes/camp.ts`, and `src/ui/camp.ts` scaling the lot by one factor so nothing can drift. No map, no carve, no walk: `place` is gone from `SceneDef` and the `camp` `MapTheme` with it |
| DUAL WIELDING | the off hand takes a second one-handed weapon: `DUAL` in `src/data.ts` puts 75% of one hand and 55% of the other into every hit, and `swingCooldown` ALTERNATES between the two rates around their even mean. Twenty pair variants over two heroes — `pairs.mts` layers a `_off` row onto the variant that already holds the other weapon, so a pair is 20 asks and not 20 rewrites |
| Rimespike reaches a PACK | the `depth` arm is gone and RIMEFIELD stands in its place — every 4th cast leaves a Cloud where the spike went in, no damage and the build's own Chill. `fieldOnCast` / `fieldEvery` in `src/sim/grants.ts`, `leaveClouds` in `src/sim/skills.ts`, and `SkillUse.leave` is the seam a Cloud applies through |
| a person in the camp is CLICKABLE | `mountFolk` in `src/ui/camp.ts` — everybody you have met gets a hotspot the size of their own body's grid, where that body is drawn, and it opens their room |
| the camp is HOME | the game OPENS on it and every ending comes back to it — `goHome()`; the Fissure card is a WINDOW the crack opens, `open-fissure` on the rail beside it. Eight hotspots: the crack, the four sockets in the rock, the bench, the shelf and the tent. What MOVES is light and wind on one canvas over the art, plus the hero and everybody you have met drawn from `GENERATED` at their own idle cadence |
| and a PERSON in it is clicked | `mountFolk` in `src/ui/camp.ts` — everybody you have met gets a hotspot the size of their own body's grid, where that body is drawn, and it opens their room |
| THERE ARE NO ROOMS | *"Honestly just ditch all the rooms. I want to encounter them randomly in the maps and they just say like one thing thanking you for saving them… then they can be in the camp and you can just talk to them."* `RunOptions.meets` stands one unmet person in the room furthest from the way in — no draw, so the descent rolls exactly as it would have — and `stepMeeting` finds them by proximity, which needs no policy to satisfy the automation rule. `src/ui/talk.ts` is the conversation in the camp: their `beats`, then the gift, the key or the bench. The four room `plan`s, `sceneWaiting`, `SceneCall`, `walkDown` and `RunState.leaving` are gone; the ANSWERING HALL keeps its plan, because a fight needs an empty floor |
| ONE FRAME, EVERYWHERE | the `card` fixture — a 14px riveted band — is gone from the stylesheet: every panel, chat bubble, web menu and trial row is now `var(--fix-head) 6 16 / 6px 16px round`, the same slim brass plate the rail is. The rail's per-button sockets went with it, so a row of icons sits in one groove rather than in thirteen frames inside a fourteenth |
| the camp FILLS the window | `--camp-sx` / `--camp-sy` — the two axes scale independently, because the bench is against the left edge and the shelf against the right and a cover crop takes a verb off the screen. 16:9 is exact, 16:10 is a 12% pull that reads as a wider room, and past `STRETCH` (1.3) the excess axis is let go rather than squashed |
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
count and this list has to agree with it — one today.**

1. ~~**"the characters checked actually cover every shape it polices"**~~ —
   **RETIRED, and it is a real `check` again.** The sheet audit walks
   deliberately to every node that MULTIPLIES rather than hoping a random walk
   lands on one, and a `more` STAT line now counts as multiplying beside
   `ailmentMultiplier` and `convertTree`. Every tree has a `damage more` node
   and sixteen random points never once reached one.
2. **"plate answers the boss a rung earlier than speed does"** — the PLATE half
   is fixed and the other half is not. Weapons taking damage of their own put
   full tier 1 plate back to **8/8** from 0/8, which is where it should be. But
   thin tier 1 SPEED now clears **5/8 against a floor of 0**: a weapon carries
   damage at every rung, so the rung below the gate got the same lift the gate
   did. That is the half still parked.

The boss grid's MECHANISM is still a real `check` and stays one — speed answers
it at full tier 1, a build with neither answer never does, and t2 trivialises
it. Only the rung PLATE comes good at is parked.

3. **"every band pays more than the one below"** — passing again, **and it
   flipped on NOISE rather than on a fix.** The loot round dipped it at band 0
   into band 1 (`171 → 155 → …`); scattering a drop where it falls added two
   rng draws apiece, the whole seed stream moved, and it came back up. Nothing
   structural changed: **bands 0 and 1 share an item level (10) and differ by
   0.1 of a piece a clear**, so what separates them is luck. Either band 1 buys
   something band 0 does not, or the two collapse into one — until then this
   check will keep flipping with any change that touches the rng.

**Strike's
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

## Phase 0 — nothing left in it

Obreth's variants are drawn and judged, the crit rework and Ambush have landed,
every web has a search box, and the trials web is twelve regions of 156 nodes.

**The off-hand wording still bites the other three heroes** — their pairs and
shield combos came off the same `*_off` and `shield` clauses, so wherever they
show the blob it is the same cause. Re-wording those is a roster-wide spend
nobody has asked for. Not a task until he does.

---

## Phase 1 — THE LADDER: what a crystal is for, and where difficulty comes from

**This replaces the spine of the game**, so it is written down before a line of
it is built. The user's design, in his own words:

*"A set amount of clears that progressively get harder until you reach a final
challenge room for that floor type. It can be a boss, a bunch of rares, whatever
but it's hard. Once you beat it you progress to the next zone… First run t1 only
clear fissure, then prismatic, then demonic, then a boss then get a crystal.
Maybe 10-20 clears per zone before you progress each one getting harder to where
by the time you get to demonic you need a smart build and well rolled gear in all
your slots. Repeat again for t2 and second crystal, t3 and third crystal… Once
you have all 4 there should be a new zone where you can begin leveling crystals,
rolling mods etc and this final zone can be just an amalgamation of all the
zones enemies, it can be randomly stylized… It should drop the strongest gear,
uniques that only drop there etc."*

Plus: **Perfect items** — a normal base with implicits 25% higher, t3 only, only
at 3 crystals socketed, rarer than rare and a little less so at 4; **danger
raises the odds of one**. And: **crystal modifiers get more generic** — *"instead
of like just fire resistance make them have occult and elemental resistance or
something. Having so many very niche mods is cool on gear but on crystals it just
means most of them you can ignore."*

### What this DELETES, and it is most of the current spine

Nothing below is a small edit. Written out so nobody starts and discovers it:

- **Composition stops choosing the zone.** `mapTheme` reads the whole socketed
  set today; the ladder says which zone you are in.
- **Sockets stop being length and difficulty.** `RUN_SLOTS`, `socketSize`,
  `POWER` (sockets + danger), `crystalRewards` and `DANGER_STATS` all read a set
  that no longer exists in the first playthrough at all.
- **Item tier stops coming off power.** `DROP_BANDS[power].ilvl` against
  `BASE_TIER_ILVL` is the whole drop ladder, and the ask replaces it with
  crystals socketed. That was open question 12, and this answers it.
- **The fifth socket and the boss key** were the tier gate. The ladder is now.
- **`CRYSTAL_LEVELS` / `CRYSTAL_XP` are endgame-only**, since nothing levels a
  crystal until all four are in.
- **`FAMILY_YIELD` and the family-as-a-look rule**: families become a LADDER
  (Fissure, then Prismatic, then Demonic), which reverses *"a family decides
  WHICH monsters you fight and nothing about how hard they are"* and retires the
  two Normal-only uniques written to give Normal its reason.

### THE CLIMB HAS LANDED, and it answers questions 1 and 4

Built and shipped: `LADDER` in `src/data.ts` (12 / 14 / 16 rungs across the
Fissure, the Cavern and the Rot, 42 in all), `rungMod` in `src/sim/stats.ts`,
`src/ladder.ts` for what is open, `Character.climbed` for what is cleared, and
the CLIMB inside the Fissure window — a row a zone, a pip a rung, cleared
clickable for the rest of that character's life.

- **Question 1 is answered by the shape rather than by a new system.** A rung is
  ONE synthetic mod on the crystal seam, beside `trialMod` and `treeMod`, so
  `crystalRewards` scores it like anything else and a harder rung pays more with
  nothing written twice. Measured: danger 0 at the first rung, 822 at the last;
  monster life 48 to 3478; packs 21 to 35.
- **Question 4 is answered per CHARACTER**, like trials, trade and levels.
- **The rung is also the ZONE.** Composition still picks one for a set with no
  rung — a measured set, a harness — but a climb says where it is.

**Say if either answer is wrong**; both are one table and one function.

### ALL THREE QUESTIONS ARE ANSWERED — the user's words, and what they settle

1. **A crystal on the ladder is a PLAIN TIER TOKEN.** *"No can only level once
   you get to the end so no mods."* Nothing rolls on a crystal and nothing
   levels one until all four are held and the endgame zone is open. So
   `crystalRewards`, the crystal bench and every finding modifier are DARK for
   the whole of the first three cycles, deliberately — the ladder's difficulty
   is `rungMod` and the challenge floors, and a socket is a TIER, not a roll.

2. **One boss at the end of each zone, and CHALLENGE FLOORS in between.** *"Let's
   just do one at the end of each zone which will be a unique boss each time.
   And then I also want to add like challenge floors for each zone where it's
   just a spike in difficulty like a bunch of rares or something."* So: three
   bosses, one per zone, each its own; plus a rung KIND that is a spike rather
   than a step.

3. **Generic means EVERY BUILD CARES.** *"I just don't want it to be like 90% of
   mods are irrelevant to specific builds. So the resistance one is good to
   combine but like just percent of damage as extra fire or something is
   generally more danger, where like lightning resistance on monsters are
   irrelevant to almost all builds."* The test is not "how few mods" — it is
   whether a roll can be IGNORED. The eight per-type wards are the whole of the
   offence; the added-damage mods and everything else already pass it.

### PERFECT BASES HAVE LANDED

`PERFECT` in `src/data.ts`: 25% more of everything the base hands over — the
armour rating, the swing and every implicit — written onto the ITEM so nothing
recomputes it off the table row. Top base tier only, never a unique, nothing
under 3 crystals socketed, 0.40% of gear drops at three and 1.50% at four,
lifted to 4.50% by danger 900 and saturating there. Never junked by the filter
and never in the bulk heap. The card says it with its figure in it.

### What is left, in order

- [x] **Phase 1a — wards by FAMILY. DONE.** Eight per-type wards became three:
      Elemental (fire, cold, lightning, prismatic), Occult (poison, dark, light)
      and Physical. Every damage type is covered exactly once, every ward writes
      its whole family at every tier, and the per-type roll came down by the
      average family size so what a build FACES did not move. Measured at four
      sockets, level 4: **4.35 ward rolls → 1.96**, and mean danger 502 → 586
      because taking five weak modifiers out of the pool made the average roll
      worth more. A crystal rolled before the pass keeps its retired ward and it
      still works — a `RolledMod` carries its own lines.
- [x] **Phase 1b — challenge floors. DONE.** `CHALLENGE` in `src/data.ts` and
      `isChallenge` in `src/ladder.ts`: every 4th rung, never a zone's last —
      that one is the boss's. `challengeMod` is a second synthetic mod beside
      `rungMod`, so it pays through the seam everything else pays through.
      Measured on The Fissure: rung 3 is 20 common / 1 magic / 0 rare at danger
      3; rung 4 is 11 / 12 / 5 at danger 102, 28 bodies against 21, 74% rarity
      against 3%. Marked on the pip in ember BEFORE you walk into it.
- [x] **Phase 1c — a boss at the end of each zone. DONE.** THE REFRACTION (a
      crystal crab, the Cavern) and THE FLOWERING (a fungal thing, the Rot) join
      The Answering, each with its own body, seven states, arena and phase
      cycle. `LADDER.zones[z].arena` is the zone's LAST rung, `arenaAt` is the
      one read, and clearing it is what records the rung the zone above opens
      on — so the climb has one gate and it is a fight. 600 / 2600 / 7200 life
      and 1.4 / 3.4 / 6.2 damage up the three.
- [x] **Phase 1d — crystals as tier tokens. DONE.** `crystalsUnlocked` is the
      one gate: nothing levels and the bench cannot reach a crystal until all
      four are HELD. And `TIER_BY_SOCKETS` caps the base TIER a run may drop —
      1 / 2 / 3 / 3 / 3 — while leaving ITEM LEVEL to the rung, so a first cycle
      is well-rolled tier 1 rather than tier 1 rolled badly. Played out at the
      Rot's rung 15: nothing socketed drops tier 1 only; four sockets drop 1/2/3.

**PHASE 1 IS COMPLETE.** What is left of it is a BALANCE question, not a build
one: the ladder's `lifeAtTop` / `damageAtTop` were set when a run's gear climbed
with its power, and a first cycle is now tier 1 for all 42 rungs. Nobody has
measured whether well-rolled tier 1 can clear The Flowering, and the balance
pass is where that is answered.

---

## Phase 2 — More characters

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

**MAHTHAR HAS LANDED, WEB AND ALL.** The user's ask: *"Another character should
be a warrior type. Maybe you can choose to build around either a shield or a 2h.
Think like tribal warrior guy tribal tattoos, shirtless."* That one sentence is
the whole web — `src/trades/warrior.ts` asks it five ways and fifteen new
switches in `GRANTS` answer it, none of which writes `blockChance`. His body,
his portrait and all thirteen weapon variants were drawn, animated and shipped
in the round before it.

**Question 9 is ANSWERED and no longer blocks anything** — the user specified
the rework himself (*"slightly more nodes… you get 2 points at a time and need 2
to get to any notable"*) and it landed on all three webs.

**AND SO HAVE HIS TEN PAIRS.** `pairs.mts` took a third name, ten character
states were dressed off the variants that already held one of the two weapons,
fifty animations went in with no refusals, and the import came back with no
`no group`. **`THE ROSTER` in the demo is what says it is finished**: all 23
arrangements a player can reach, for all three heroes, resolve to a picture of
that hero holding that thing rather than to the fallback. The bundle is 7.5 MB,
1.40 gzipped.

**WHAT IS LEFT OF THIS PHASE:**

**THE FOURTH IS ANSWERED, and it changes a RULE for everybody else.** *"I think
all characters should just not be able to dual wield and then we just have a
trade that can dual wield lol. So make this down for future characters, no dual
wielding except for this new character who can dual wield. Think just dark rogue
type, hooded figure spec is all about dual wielding, one node can be a weapon
specialist node where you can pick bonus depending on what weapon you have
equipped? Like crit per dagger equipped, attack speed for swords etc."*

- [x] **DUAL WIELDING IS A TRADE'S PRIVILEGE. DONE.** `TradeSpec.dualWields` is
      the only thing that grants it and `canDualWield` the only read; `fitsSlot`
      takes a character now, so nowhere can forget to ask. `heal` takes a second
      weapon off a save written before the rule and puts it in the bag.
- [x] **THE ROGUE'S WEB IS DONE** — `src/trades/rogue.ts`, twelve new switches,
      and he is playable on the fallback body. **Obreth, of the Obsidian
      Order.**
- [x] **THE WEAPON SPECIALIST is in**, and it is the user's own node:
      `WEAPON_SPECIALITY` says what each family is for and `specialistMod`
      reads it PER WEAPON HELD, so a matched pair is that line twice.
- [x] **THE ROGUE'S ART IS DONE.** Body, thirteen weapon variants and the ten
      PAIRS nobody else may hold — 24 rows in `generated.json`, and `THE ROSTER`
      in the demo reads `obreth: 23 of 23 arrangements a player can reach are
      drawn`. He has no portrait and needs none: `portraitIcon` falls back to
      the map sprite, as it does for Mahthar.

**THE COST, said plainly:** thirty pair variants are already drawn — ten each
for the Alchemist, the Aethermancer and Mahthar — and this rule makes all thirty
unreachable. Nothing is deleted: they stay in `GENERATED`, cost ~1.5 MB of a
7.5 MB bundle, and come back the day the rule does. **Do not regenerate them and
do not cut them.**

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

## Phase 4 — THE LOOP: the rung is the ladder, the crystals are the run

**The user's diagnosis, and it is the right one:** *"I like the progressively
getting harder and I like the crystals but I don't know how to work them
together."* They are the same dial with two handles. Both sell DANGER and both
feed `crystalRewards` — the climb tops out at 822 danger, four crystals rolled
for danger come to 1366. The game already noticed and resolved it by switching
one off: `crystalsUnlocked` means nothing rolls on a crystal and nothing levels
one until you hold all four, so for the whole climb a crystal is a tier token.
The most tactile system in the game is inert for the entire first playthrough
and then becomes a second copy of the ladder you just finished.

**The shape, in the user's words:** *"keep the rung system but the crystals
combined choose the zone that controls mob types and uniques that can drop…
change all the mods to be effectively just powerful nodes from the trials tree.
Like for example it could be 50% chance for enemies guarding a box to all
respawn once they die… Then you just have the rungs progressively make it
harder and give you more crystals of different types."*

So each answers ONE question and never the other's:

| | |
|---|---|
| **the RUNG** | how hard. Monster level, item level, and the ONLY source of raw scaling. It also pays out the crystals. |
| **the CRYSTALS** | what this run IS. Their families pick the WORLD; their mods are MECHANICS, not numbers. |

**AND MODS HAVE USES** — the user's own answer to what makes a permanent socket
a live decision: *"you roll a mod and it lasts for a certain amount runs and
then it's gone. Like more common ones can last longer and maybe super rare ones
last less? Or maybe there can be different tiers of the same mod that rolls with
more uses?"* Four sockets stay permanent and so do the four crystals; what burns
down is what is rolled ON them. That closes the economy: a descent pays currency,
currency re-rolls a crystal, the roll burns down over descents. The bench already
targets crystals (`targets: { kinds: ['crystal'] }`), so the last side of that
triangle is the only new one.

### What is already built, and it is more than it looks

- **`mapTheme(share)` is the crystal-chosen world and it already works** — four
  worlds out of three families, half of one family taking the rock, two halves
  and no Normal being the Seam. It is sitting in `src/sim/crystal.ts` as the
  FALLBACK. `theme: LADDER.zones[at.zone]?.theme ?? mapTheme(share)` is the one
  line where the rung steps on it.
- **Uniques already gate by world** — `DropGate.zone`, filtered before the pick.
- **The pools already weigh the same per monster**, held by the demo, so "keep
  mobs roughly similar base power" is a rule that already holds.
- **Six mechanics already exist** and price themselves through `DANGER_STATS`:
  `hoardChance`, `wellChance`, `bearerChance`, `packCount`, `packSize`,
  `layoutComplexity`, `monsterRank`. A new mechanic is a sim rule, a
  `DangerStat` row and a `ModDef` — no new seam.

### What the crystal pool is TODAY, which is the problem stated as data

17 modifiers: 3 mechanics (`pack_size`, `pack_count`, `layout_maze`), 3 drop
bias (`find_weapons`, `find_armour`, `find_trinkets`), and **11 of pure stat
inflation** — armour, crit, three added elements, damage, life, speed and three
wards. The interesting content lives on the trials web instead, where it is
bought once and never thought about again. Exactly backwards.

### The collision nobody had spotted

**The ladder's zones ARE the worlds.** `LADDER.zones` is `fissure`(12) /
`prismatic`(14) / `demonic`(16), and the climb's three tabs are named and
painted after them. Once the crystals choose the world the three acts need
their own identity: **The Answering, The Refraction, The Flowering**, after the
halls already at their tops, with the climb art redrawn as DEPTH rather than as
worlds. The save keys under `character.climbed` stay the strings they are —
renaming one costs the player their climb.

### The steps, each leaving the suite green

1. ~~**THE WORLD COMES FROM THE CRYSTALS.**~~ **DONE.** The override is gone,
   `LadderZone` splits into `id` / `name` / `blurb` / `art`, the acts are The
   Answering, The Refraction and The Flowering, and their cross-sections are
   redrawn as depth. The demo's check is INVERTED: nothing socketed is the bare
   Fissure at every rung, two Demonic crystals send every one to the Rot.
2. ~~**MODS HAVE USES.**~~ **DONE.** `RolledMod.uses`, set at the roll off the
   tier's own weight through `usesFor`, 5 to 20 descents. A clear spends one off
   every roll on every socketed crystal and drops it at zero; a death spends
   none. `heal` fills a missing count and clamps an absurd one, and strips any
   that ever landed on gear. The card prints `n of N descents left` and lights
   the last one; the report names what ran out; a dry crystal is the sixth thing
   that ends an Enter-chain.
3. ~~**THE MECHANICS POOL.**~~ **DONE.** The 11 inflation modifiers are gone and
   the pool is 15 rules: five new to the sim — **the Second Watch** (the user's
   own), **the Vein** (a Hoard that pays currency), **the Warden** (a pack that
   cannot be hurt until one body is down), **the Splitting** (what dies leaves
   one of the rank below), **Gilded** (coin off a body) — plus crystal rolls for
   the four mechanics that already existed in the sim but were trials-only.
   Measured: 0 of 15 is a resistance or a monster stat.
4. ~~**THE GATES ARE GONE, and tier is the crystal's LEVEL.**~~ **DONE.**
   `crystalsUnlocked` and `TIER_BY_SOCKETS` deleted; `CRYSTAL_LEVELS` carries a
   `tier` and `tierForSet` reads the MEAN level socketed. Levelling is a real
   climb — 25 / 120 / 400 xp — gauged at four dangers. **And the handout is
   scratched:** `CRYSTAL_QUESTS` is gone whole, `CRYSTAL_DEPTHS` pays one at a
   rung, and `MOD_TIER_LIFT` makes a crystal's level decide which TIER of
   modifier it rolls — a lift and never a gate.
5. ~~**THE TRIALS WEB FOLLOWS.**~~ **DONE.** All 156 nodes and the road are
   rules now. The Weight became **The Warden**, the Reading **The Second Watch**
   and the Hide **The Splitting**; every inflation minor scattered through the
   other nine went with them. Measured: 0 monster life, damage, armour, crit,
   move speed, added element or ward anywhere in the web.
6. **REBALANCE.** The rung is the only raw ladder, so `DANGER.lifeAtTop` /
   `hitAtTop` and the rung curve are re-derived against it.

**Done when.** A descent's world is what you socketed, its content is what you
rolled, its difficulty is the rung you picked, and the four sockets are a
decision you re-make because what is on them runs out.

**What must not break.** `heal` — a save holding a crystal with no `uses` on its
mods must come back playable. `npm run mods` (every modifier rolls, does
something and reads), `demo`, `smoke`, `shots`.

---

## Phase 5 — LOOT IS RARE, and danger buys QUALITY

**The user's complaint, and it was not about the filter:** *"getting a new helm
with three mods is super annoying, just keep rerolling the one you already have
instead… an item with no mods could be better than one with 3, you just need to
click the currency to add the mods."*

**Measured, he is exactly right.** A Shard of Making was 5 gold from an
unlimited recipe, and a clear banks 54 gold at the bare Fissure against
**30,359** at the deep end — 6,072 shards a clear. `ModPool.eligible` gates the
bench and the floor through the SAME condition (`e.ilvl > item.ilvl`), so a
drop carried no line 425 shards could not fabricate. The only things a found
piece held that gold could not buy were its base tier and its item level. **The
filter was not broken — it was honest**, and a modifier-count filter would have
been a filter for the part that did not matter.

**The volume, and where it came from.** Gear a clear ran 2.1 → 8.6 → 28.6 →
**84.3**. `gearChance` was per KILL and barely moved (it even ROSE at band 2);
what moved was kills, 26 → 847. **A per-kill rate cannot express "a deep run
pays better" when the kill count is itself the difficulty.**

**The chase is already deep enough — measured.** Keeping the best of 200,000
top-base chests rolled to capacity: new bests at drops 1, 2, 3, 5, 34, 90, 166,
973, 1401, 17206 … 151940. 18 upgrades in 200,000, last gap 40,554. **The user's
own targets** — *"you don't even have a chest equipped? 2-10 [clears] at most.
End game with a mostly t1 chest? Maybe hundreds or even thousands"* — fall out
of that curve at about **two gear drops a clear** across 8 gear kinds.

### The steps

1. ~~**LOOT IS PER RUN.**~~ **DONE.** `DropBand.gearChance` → `gearPerRun` and
   `CURRENCY_DROP.chancePerKill` → `perRun`, drawn down body by body against
   what is LEFT to kill. A live divisor was not enough: the count climbs from
   ~100 to 845 as the Welling and the Splitting put bodies back, and an early
   body divided by 100 paid 17× the band. **Rarity came OUT of the count** — it
   buys what a piece IS, never how many arrive. `fill` rises to [6,6] at the
   top, so a drop arrives judgeable instead of needing the bench first.
2. **PERFECT BECOMES THE CHASE.** Its rate is a SHARE of drops, so against 84 a
   clear it paid 3.79 — wallpaper. With the count flat, cut `atThree`/`atFull`
   so it is an event. *The user: "one rung, make it even rarer than currently
   relative to chance per item that drops AND reduce total items."*
3. ~~**THE BENCH IS AN ANTI-BRICK, NOT A SUPPLY.**~~ **DONE.** `Recipe`
   gains `goldPerIlvl` and the Shard of Making rides the shelf's own item
   level — 46 gold at level 1 against ~45,000 deep. **A CONSTANT PRICE CANNOT
   THROTTLE ANYTHING** across a 562× income swing: tuned to cost a clear at the
   top it is 560 clears at the bottom, so a new character could never buy one.
4. ~~**A GAUGE FOR CLEARS-TO-GEAR-A-SLOT.**~~ **DONE.** `ladderCharacter` and
   `bestBuild` both roll their own gear from thin air, so scarcity moves no
   other harness number. Reads 1.9 a clear at band 2 and 8.5 at band 4.
5. ~~**HEADROOM, AND A LOCK PAYS TWICE THE BUDGET.**~~ **DONE.** `fill` was
   documented as a share of capacity and written as a COUNT, so it clamped to
   full on every smaller base: **80% of deep drops arrived with no open slot**
   and refused the one currency the shelf sells. Now a genuine share, clamped
   to leave a slot — measured 0%. `VEIN.drops` 5 → 2, matching `HOARD.drops`
   against its own budget; at five it paid **12.5 Shards of Making a clear**.

### What is left in it

- **THE HOARD IS THE DEEP END'S WHOLE VOLUME.** Band 6 pays 23 gear a clear
  against a 1.5 budget, because `openHoard` calls `dropGear` outside it and
  `HOARD.drops` is 3 a lock. Every other band is 1.8–5.5. Cutting it is a
  decision about what that modifier IS — *"what it changes is HOW MANY"* — so
  it wants asking, not assuming.
- **The named-piece check is thin.** 16 descents expects 5.5 and read 3; a zero
  is a 1-in-250 flake. Uniques are a share of drops like Perfect, and the count
  fell under them.

**Done when.** A clear pays two or three pieces at every band, each arriving
finished enough to judge; a Perfect base is an event; and adding a modifier
costs a descent rather than five gold.

**What must not break.** `heal`. The opening: a bare descent must still cover
the level-1 shelf, which is now 46 gold rather than 5. `mods`, `demo`, `smoke`,
`shots`.

---

## Phase 3 — A quest log instead of a pointing finger

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

9. **ANSWERED, and it landed.** *"The trade web needs a minor rework, I want
   slightly more nodes, and I want it to line up where you end up getting a
   notable with your last points. Let's make it where you get 2 points at a time
   and need 2 to get to any notable."* Fifty nodes a web, every notable at an
   EVEN step, six points two at a time from level 5 — so a pair always buys a
   notable and the last pair finishes a branch. On all three webs, and the demo
   walks each one a pair at a time and fails if any stop lands on a minor.
   Nothing here is open; kept because it is what the shape is FOR.

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
