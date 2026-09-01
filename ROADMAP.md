# Crystal Core — Roadmap

**The work that is left, and nothing else.** What is always true is `CLAUDE.md`
and the skills it indexes. If a thing here is not a task or something you need
in order to do one, it is in the wrong file. **A finished phase is DELETED from
this file** — `git log` is where a session that has to undo one looks.

## Where this stands

**THE SETTLED ORDER IS SPENT.** *"just finish phase 6, make the character walk
to the chest, you can pick the names for phase 6 too. And then go to phase 7."*
All three are done:

1. ~~PHASE 6~~ — **WHOLE and deleted.** `git log` from `2ff5dfa` to `4b6caac`.
2. ~~THE CHEST WALK~~ — **DONE.** `Hoard.free` is the guards being down and
   `stepHoard` is the walk that opens it, asked with nothing left to fight.
3. ~~PHASE 7~~ — **WHOLE and deleted.** `git log` from `4b6caac` to `33d7a85`:
   28 materials and six professions, gathering on the floor, processing that
   advances on descents, crafting with a window a level narrows, jewellery,
   the hybrid power rule, cooking, and a counter that gambles instead of
   selling. The filter is gone with the heap it existed to sort.

**TWO PHASES ARE QUEUED, and the user asked for BOTH in one breath** —
*"make sure both are properly documented in todo and continue with both."*
Phase 8 then Phase 9. Phase 3 is PARKED and is not the lowest-numbered thing to
take; these are. Everything after them is a parked phase, the traps, and
questions only the user can answer.

**THE NAMES LANDED WITH PHASE 6**: the points are **TALLIES**, the web is
**THE RECKONING**, the list of grinds is **THE LEDGER**. **The fourth was NOT
taken** — the base world is still The Fissure. The influence picker names it
`THEME_BY_ID.fissure.name`, which reads correctly beside The Cavern and The Rot,
and renaming a world nobody was confused by is a change with no complaint behind
it. **The Diggings** is the name if he ever asks; it is one string.
**Identifiers do not move** — `trials.ts`, the `trial_` node prefix and
`Character.trials` are what a save points at, exactly as `rung` stayed `rung`
when a player started calling it a depth.

**THE LEVEL BUILDER EXISTS**, in the dev menu — *"honestly just givve me the
level builder, have everything we've made as objects I can add and the floor
variants ill make at least one for you to reference."* `src/ui/builder.ts`: a
paint grid drawn with the REAL tilesets through the renderer's own
`zoneTileAt`/`patchTileAt` and the REAL `makeProp` art, a palette of rock, floor,
every level-1 terrain and level-2 variant the world holds and all 99 props, and
a PLAN out of it — one character a tile (`#` rock, `.` the zone's own floor, a
DIGIT the patch index into `patchesFor(theme)`) plus a list of objects, which
pastes back in. **It is what a floor is judged on now**: a sheet says whether
two terrains read apart, only a laid floor says what the carve does with them.

**PHASE 3 — the quest log — is PARKED by the user's word** until a start with
nothing explaining it has been played. Do not take it because it is in the file.

**THE BALANCE PASS IS OUT OF THIS FILE.** *"Remove the balance pass from the
list, I'll just tell you when to do it."* It is not work, not a phase and not
something to pick up — **wait to be told.** Everything it had accumulated (the
parked checks, the skills and off-hand look, the three things earlier phases
handed it) is in `git log` at `977403c`, which is where to read it back from on
the day he calls for it.

**Phases 0, 1, 2, 4, 5, 6 and 7 are DONE and deleted** — the climb, four
trades, the loop, loot that is rare, the campaign / Proving Ground / Seam split,
and gear that is crafted. `git log` is where a session that has to undo one
looks.

**One ask has NOTHING to bind and was not invented.** *"Keybindings for flasks,
and boss controls"* — the flasks are `potion_life` and `potion_mana` in
`BINDINGS` and rebind on the keys tab, but **a boss is not driven by the player
any more.** The turn was deleted and the fight rebuilt around what a build
carries, so `BossDef.phases` is a cycle the boss runs and there is no verb left
for a key to hold. Ask before adding one; it would be a mechanism, not a
binding.

---

## Phase 8 — TERRAIN, RECALIBRATED: levels, water, detail, and where things grow

*"We are failing to achieve what I want here so lets just start from the
beginning in terms of structure… multiple levels but not overlapping so some
stairs rocky time stuff you can climb up or down, water lava etc. better
enviroment detail so its not so repetative, How to add ores, herbs, fishing
spots in a generated way that fits seemlessly."* The research is done (Brogue's
`Architect.c`, Amit Patel's map generator, Wolverson's builders, Stardew's mine
tables, Valheim's placement rules, the generator's live tool list) and this is
the plan it came to. **`tools/terrain-proto.mts` IS THE REFERENCE** — run it on
a seed and it prints what every step below does, and a schematic.

**What was wrong is not the skeleton.** Rooms joined by corridors is the pacing
skeleton every ARPG uses and the sim needs `map.rooms` for packs, nodes, hoards
and who is met. What reads as repetitive and rectangular is everything DRAWN on
it: one floor tile repeated, variation laid as hard-edged patches, one flat
light, a black rock with one shape, and nothing standing at a second height.
**Keep the skeleton, replace the carve, add a height layer, replace the
dressing.** Nothing in `src/sim/run.ts` should have to learn a new word except
that a stair walks.

**THE STRUCTURE, in the order the passes run** (Brogue's order — walkability
final before liquids, liquids final before dressing):

1. **Carve.** Rooms as noise-swelled blobs, corridors two wide that drift one
   tile a step, a loop or two so the map is not a chain, then ONE cellular
   automata pass over the whole grid so no run of edge is straight. Flood from
   the hole; a room it cannot reach is dug to.
2. **Levels — a ROOM IS RAISED WHOLE.** `Grid.level`: rock, low floor, shelf.
   Never the first room and never the way out; the rest by a coin weighted to
   the bigger chambers (~30–55%). **A shelf's edge band is the RIM and nobody
   walks it** — that is the whole of what keeps the two levels apart with a
   per-cell `walkable`, which every mover, the pathfinder, line of sight and the
   separation push already read; an edge-based rule would have to be taught to
   all of them and a knockback would still shove a body off a cliff. So the
   levels never overlap and never touch: the interior is reachable only through
   a stair. Elevation is chosen off the room GRAPH and never off noise contours
   — quantised noise gives concentric rings and shelves nobody can reach.
3. **Stairs, at the MOUTHS first.** A stair is two cells, the rim cell and the
   low cell beside it, both walkable. The first stairs go where a corridor
   arrives at a rim, then south faces, then any straight rim, joined by
   union-find until every walkable cell is reached from the hole; what is still
   cut off is dug to through rock, and a shelf that cannot be reached comes
   down. **A south stair carries the tall face; north, east and west are a flat
   run of steps** — the cliff tool only ever hangs a face on the south edge.
   "Rocky stuff you can climb" is the same two cells wearing a rubble picture.
4. **Water and lava — a DEEP core in a SHALLOW wreath.** Brogue's lake: a blob
   grown off the wettest floor, its interior (four wet neighbours) is DEEP and
   blocks, its ring is SHALLOW and walks, drawn as the shore. **Refused whole if
   any dry cell stops being reachable.** This dissolves `OPEN_SEED`: the wreath
   IS the walkable ring, so water can lie against a wall and the deep core is
   still a tile in. Lava is the same lake in the Seam's own set. On the low
   floor only, never beside a stair.
5. **Resources by RULE, not by room.** Ore is a VEIN walked 3–5 cells along
   the rock (a north wall two deep, spaced apart), drawn IN the face. Herbs are
   damp low floor beside the wreath. A fishing spot is a wreath cell with deep
   water on one side and dry floor behind. `placeNodes` keeps dealing the
   families and keeps the pack guard; what changes is that it asks the map for
   a family's SPOTS instead of a room. Measured on eight seeds of the
   prototype: 0–17 ore cells, 0–26 herb, 0–33 fish — the ore gate wants
   loosening and a seed with no water pays no fish, which the deal already
   tolerates.
6. **Detail that is not a shape.** Three things, none a patch: (a) **many pure
   floor tiles** picked per cell by hash with skewed weights (70/15/10/5) — a
   set holds ONE and that one repeated is the blandness itself; (b) **light** —
   a per-tile tint off low-frequency noise plus darkening toward the rock, in
   Pixi, costing no art at all, which is most of what makes a Diablo cave read
   as lit stone rather than wallpaper; (c) cover scattered under a noise MASK
   (clumps where the mask says, nothing where it does not) instead of a flat
   rate. The level-2 variant patches stay only where a material has a real
   edge (a bed of grit); a "slightly different floor" is a variant tile, not a
   region.

**THE ART, and what each costs.** Every set is `create_topdown_tileset` asked
the way `lit_round` was — standard, `shape_style: 'round'` — which is 3–4
generations, not the 20–40 the pro patches cost. **THE ACCOUNT IS AT ZERO
GENERATIONS UNTIL 2026-09-13 and bills credits ($22.72) until then**, so every
ask below is spent with the user's word and judged by him before the next.

- **The SHELF set, one a zone**: floor as BOTH terrains at `transition_size`
  1. The generator's own help says that is how two heights of one material are
  asked; three earlier tries said it would not draw one. Standard/round at ~4
  generations is the cheap way to find out, and the sheet goes to the user
  first. Its keys are the rock's 21, so `zoneTileAt` draws it with one new
  argument and **rock wins at a corner** where a shelf meets the wall — the
  wall layer already draws above.
- **Floor VARIANTS**: `create_tiles_pro` in style mode with the zone's own
  floor tile as the style image returns 16 variations in one call. One call a
  zone.
- **Stairs, ore vein, herb clump, fishing spot as OBJECTS**:
  `create_map_object` with a rendered crop of OUR map as `background_image`
  inpaints the thing into the picture it will stand in, so it matches by
  construction. A face stair and a flat stair; a vein three cells wide; the
  herb and the ripple re-asked the same way (*"I dont like how the ores and
  the fish look"*).
- **Water re-asked** — `fissure_pool` reads as ridged slabs — once the wreath
  rule is in, since the shore tile is what a wreath cell wears.
- **The account already holds art this repo never imported**: nine "abandoned
  mine working" cliff sets whose rock TOP is textured and lit (a shelf you
  could stand on, unlike the Fissure's pure black), a 64px "rocky cavern floor
  → roof" set with wooden props and bugs in the floor, and a water → void set.
  Look at them before asking for anything; the 64px one is twice the shipped
  resolution and would be a decision about every zone.

**Open questions for the user**, none of which blocks step 1:
- Spend credits on the shelf sheet now (~4 generations), or wait for the reset?
- Is the 64px "rocky cavern floor" on the account the direction he wants? It
  is warmer and busier than what ships, and twice the pixel density.
- Shelves per zone: raised chambers only, or also a ledge inside a big chamber
  (same machinery, a noise lobe instead of a room)?

**Order of work.** (1) the generator with shelves OFF by default so the game
keeps shipping, `Grid.level`, rim refused by `walkable`, stairs as walkable
props, lakes with a wreath, `OPEN_SEED` retired, the demo proving reachability
and determinism; (2) the renderer — shelf keyed like rock, the face row, tint,
variants by hash; (3) the art, one sheet at a time with approval; (4) resources
by rule. The level builder gets the new cells as paint (shelf, rim, stair,
deep, shallow), because it is what a floor is judged on.

---

## Phase 9 — WHERE MATERIALS COME FROM: gathered, or off a body

**The rule the user settled**, after three passes: *"mining and fishing should
be the only ones you just find sitting out"* → *"instead of dropping cloth from
enemies we have hemp/cotton type materals you make into cloth? that can be the
herbs."* What it comes to is not "nodes vs enemies" but **things that grow or
sit in the rock are GATHERED; things that come off a body DROP.**

| family | where | why |
|---|---|---|
| metal | gathered | ore in the rock |
| cloth | gathered | plant fibre — hemp, flax. THE HERB-SHAPED THING |
| wood | gathered | a deadfall is a thing sitting in the rock |
| fish | gathered | a pool, which Phase 8 puts water under |
| hide | **dropped** | skinned off what you killed |
| gem | **dropped** | *"gems still from everything"* |

**Wood is MY call, not the user's** — a monster dropping logs is the weirdness
that created nodes. Flagged to him; reverse it if he says so.

**THE SPREAD IS LANDED.** `BODY_DROP.perRun` is 3 whole drops of 2–5 each,
drawn down body by body through the same `budgets()` the gear and currency
budgets use, on `bodyRng` — its OWN stream, seed 104729, because a draw per kill
out of the run's rng cost band 5 its tier 3 bases. `placeNodes` deals round
`GATHERED` and `rollMaterialDrop` round `DROPPED`, so both halves are a spread
rather than a roll. Measured, 3.2–8.2 a family against gathering's 20. The
fishing spot is landed too: `poolSpot` stands `node_ripple` ON the water with a
walkable neighbour, and a room with no pool grows no fish node at all. **Fish is
dealt the WET rooms first** — the packs are split by whether their room has a
bank, and `banks()` SCANS a room rather than sampling it, so a two-tile pool is
found. Measured over 12 descents: metal 17, cloth 20, wood 15, fish 17.

- [ ] **THE CLOTH FAMILY'S FOUR MATERIALS STILL CARRY SPIDER-SILK NAMES.**
      `MaterialFamilyDef` is a plant already — `raw: 'fibre'`, `verb: 'Cut'`,
      the bush nodes — but `wickcloth`, `glassweave`, `rotsilk` and `weldcloth`
      are woven things, and their icons are cloth. New icons through
      `icons.json` → `icon.mts` → `portrait.mts`. **The ids do not move**: a
      save points at them, so it is `name` and `description` that change.
- [ ] **THE ORE ART IS RE-ASKED.** *"I dont like how the ores and the fish
      look."* Measured at 6x: the vein is nearly invisible and it reads as a
      grey boulder beside the stump. A bad draw, not a wrong world — re-ask
      before deciding it needs per-world art, which is 24 objects.
- [ ] **`node_carcass` AND `geode_amber` NO LONGER RETIRE.** They were dead
      data when hide and gem left the floor; the level builder offers every
      `PROP_ART` id as a placeable object, so they are a palette entry now.
      `geode_amber` is also a `style` image in `node.mts` and `chest.mts`, and a
      style image is what keeps the next generation matching the roster.
- [ ] **The demo is what proves the rates.** A gathered family and a dropped one
      must pay comparably over a run, at every band, and the check is a
      `gauge()` where it is balance and a `check()` where it is mechanism.

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

**The machinery this used to lean on IS GONE.** `CRYSTAL_QUESTS` and
`QUEST_CONDITIONS` were deleted whole when the crystal handout was scratched;
what survives is `src/game/trials.ts`, the same `{ need, kind }` shape asking
what a TRIAL wants. So this phase is a table, a screen to read it on, a way for
a person to hand one over, and a reward that is not always a crystal — and the
table is new rather than inherited.

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

## Loose ends — real, small, and belonging to no phase

**Empty. Both are done** — the named-piece check is a `gauge()` with a
deterministic reachability `check` beside it, and the dialogue pass has been
made: every clause that restated the one before it is cut, and every voice tic
is kept.

---

## Traps that outlive the phase that found them

**Kept because they bite the NEXT thing, not because of what they came from.**

- **`KIND_VARIETY` IS AUTHORED AND MUST STAY THAT WAY.** It was COUNTED twice —
  off `GearBase.family`, then off the filter's own groups — and both read right
  until a kind grew rows the count did not mean: ten ring implicits took rings
  from weight 2 to 20 and **39% of every drop was a ring.** A drop weight that
  tracks content volume is a bug waiting for the next table to grow. Adding a
  kind means adding a row and arguing for the number.
- **A GAMBLE'S PRICE IS DERIVED, never typed.** `bestSale(ilvl)` is the most any
  piece of that item level could ever fetch and `gamblePrice` is `GAMBLE.over`
  times it, so an edit to `SHOP.sellByTier`, `sellFraction` or `pricePerMod`
  cannot leave the counter minting gold. Anything new on the counter that pays
  out gear needs the same treatment.
- **GAMBLE-ONLY UNIQUES ARE NOT DESIGNED, and the SEAM for them is built.**
  *"Yes there will be some but we don't need to work out those yet."*
  `DropGate.source` takes `'floor' | 'gamble'`, `opensHere` reads it, and
  **nothing is authored behind it.** One is a table row when he asks; do not
  invent one first.
- **THE COUNTER STANDS ABOVE THE FISSURE, and that is what gates it.** A gamble
  asks `opensHere(gate, shopPower(ilvl), 'fissure', 'gamble')`, so gold can
  never buy a deep world's named piece. Anything that gives the counter a
  different reach is changing what gold is allowed to buy.
- **A DESCENT'S DRESSING HAS ITS OWN RNG.** Placing gathering nodes must not
  move the draws that pick a monster or a drop, or a seed stops replaying. The
  same applies to anything else added to a floor.
- **THE CHEST WALK COST A WALL CHECK ONE DEATH.** A level-16 Strike character
  against four blank Prismatic crystals died 6 of 12 seeds before it and 7 of 12
  after, which tips a parked balance check from ✓ to printed. The cause is real
  and small: a descent now spends a little longer on the floor walking to what
  it unlocked. **Not tuned** — it is a balance number, the pass is the user's to
  call, and the file's own warning is that this measurement is noisy at twelve
  seeds. Written down so the balance pass knows where the death came from.

- **THIRTY PAIR VARIANTS ARE DRAWN AND UNREACHABLE.** Ten each for the
  Alchemist, the Aethermancer and Mahthar, made before dual wielding became one
  trade's privilege. They stay in `GENERATED`, cost ~1.5 MB of the bundle, and
  come back the day the rule does. **Do not regenerate them and do not cut
  them.**
- **The off-hand wording bites three heroes.** Their pairs and shield combos
  came off the same `*_off` and `shield` clauses in `weapons.json`, so wherever
  one shows the blob it is the same cause. Re-wording is a roster-wide spend
  nobody has asked for. Not a task until he does.
- **A trade is taken up ONCE.** `takeUpTrade` refuses a second outright — the
  one hard lock in a game that refunds everything else, so a new trade is not
  something a save can try on. What gold buys back instead is every ATTRIBUTE
  point (`respecCost`).
- **`ladderCharacter` takes NO trade, deliberately**, so nothing measured will
  notice a new one. What a trade is worth is printed beside the deep end and
  asserted nowhere.
**Anything that adds an ARM to the trials web, or any run-wide rule:**

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

## Open questions

**Do not guess at these.** None ever blocked a phase and none is work waiting to
be picked up — they are decisions the user has not made. Ask before acting.

**LEFT OVER FROM PHASE 6, which is otherwise whole.**

- **What is the base world called?** *"we really need a different name for the
  base fissure idk waht to call it."* The clash is that The Fissure is the crack
  in camp, the whole descent system AND one of three worlds. **Not taken**: the
  influence picker reads fine as The Fissure beside The Cavern and The Rot, and
  a rename with no confusion behind it is churn. **The Diggings** if he asks.
- **Does the Seam have a boss?** It is *"the final zone"* and every other zone's
  last depth is one. Proposed: yes, but a boss was a whole phase each of the
  three times, so it is not something to slip into another one.
- **The Seam has no cross-section of its own.** It borrows The Flowering's on
  the Proving Ground's tab. One `zoneset.mts` generation would fix it, and it
  needs the `art` skill and an approval before anything is dressed.

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

2. **What the Lampwright wants, and the story has LOST ITS VEHICLE.** The trade
   acquisition is still a placeholder — anyone may take one up at level 5 — and
   the user's answer for the story was *"lamwright and lambengolmor kinda not
   liking eachother and each pulls you in different directions"*, told through
   the trial ladder, with everybody else an event-giver rather than a plot.
   **Phase 6 deletes `TRIALS`**, so the ladder that argument was to be told on
   will not exist: grinds are counters, and a counter cannot take a side. What
   is open is therefore two things — what the two of them disagree ABOUT, and
   what the story is told THROUGH now. Ask before authoring the second room.

3. **Does Strike ship with one Echo, or none?** The user's words were *"it
   should just be a single target hit that hits pretty hard with ability to hit
   extra targets"*, and it was built exactly that way: zero Echoes bare, the
   whole branch bought. The measured cost is the parked wall check — an untreed Strike
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

10. **Do the chasms come back?** The whole drop system — `VOID`, ledges, walls
   hanging into a hole, bridges — was built, judged and deleted at the user's
   instruction (`83b8488`). How to draw one: the wall tile placed ONE ROW LOWER
   than it is keyed (the same picture that reads as a wall standing up under
   rock reads as one going down under ground), flanks turned a quarter, no near
   wall, and the void taking no part in the light's blend or the floor fades out
   at its own rim. The code is at `56d599a`. Never asked for twice; here so
   nobody rediscovers the geometry.

11. **The bundle, and the cheap lever nobody has pulled.** 6.33 MB, 1.15
   gzipped — a pair variant costs ~50 KB of source, not the ~150 KB once feared,
   because it is five states at ONE facing rather than a whole body. Nothing has
   been trimmed and nothing needs to be on these numbers. **The lever, if a
   number the user cares about ever appears:** a variant's IDLE is two frames and
   its WALK is six, `BodySpec.frames` is the count KEPT rather than generated,
   and `convert.mts` is re-runnable — so trimming costs nothing to try.

12. **THE FLOWERING BUYS NO DIFFICULTY.** `dangerStep` saturates at 330 danger
   and the rung alone reaches it at depth 17 of 42 — so the top 25 rungs have
   monsters no harder than two zones down, at the same item level, paying more.
   Measured, a ceiling build walks out of the deep end at 94% life where the
   demo wants under 70%. `CLAUDE.md` says the saturation is deliberate ("it
   saturates where the hero's item level does"), so fixing it changes a stated
   rule: decouple `dangerStep` from run power, extend item level past 70 so both
   caps move together, or accept that difficulty ends at The Refraction.
   **Asked; not answered.** Phase 6 makes it worse, not better — a campaign zone
   now floors the gear tier, so the last zone pays tier 3 for a fight it does
   not make harder.

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
- **No gear line reduces a movement skill's cooldown.** The user's own aside —
  *"a movement skill thats buffed with some CDR (i know we dont have this yet)"*.
  `moveCooldown` is a declared grant with a product merge and `say` already
  written; the only source is `Quickening` inside each mover's own web. A gear
  mod would be one `ModDef` in `GEAR_UTILITY_MODS` carrying `grants:
  { moveCooldown: n }` — but `ModDef.grants` sits on the FAMILY and not on the
  tier, so it is one fixed value or one family per value. The boss now reads
  right without it, so this is a want rather than a gap.
- **A first descent can drop nothing at all.** The bare Fissure's budget is 1.3
  pieces a clear and a fractional budget is spread as a chance, so some first
  clears bank nothing — a new player meeting the payoff screen with an empty one.
  A guaranteed first drop is the obvious answer.
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
