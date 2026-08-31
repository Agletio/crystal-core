# Crystal Core — Roadmap

**The work that is left, and nothing else.** What is always true is `CLAUDE.md`
and the skills it indexes. If a thing here is not a task or something you need
in order to do one, it is in the wrong file. **A finished phase is DELETED from
this file** — `git log` is where a session that has to undo one looks.

## Where this stands

**THE ORDER IS SETTLED and it is the user's:** *"just finish phase 6, make the
character walk to the chest, you can pick the names for phase 6 too. And then go
to phase 7."* So:

1. **PHASE 6**, steps 2 through 7. Step 1 is whole.
2. **THE CHEST WALK** — the one loose end with a task behind it.
3. **PHASE 7**, in full.

Nothing else is queued and nothing else may be promoted without being asked.

**THE NAMES ARE PICKED**, at the user's word (*"you can pick the names for phase
6 too"*). **Three of the four have LANDED in step 4** — the points are
**TALLIES**, the web is **THE RECKONING**, the list of grinds is **THE LEDGER**.
The fourth is step 5's, because it is only said where an influence is picked:
the base world is **THE DIGGINGS**.
**Identifiers do not move** — `trials.ts`, the `trial_` node prefix and
`Character.trials` are what a save points at, exactly as `rung` stayed `rung`
when a player started calling it a depth.

**PHASE 3 — the quest log — is PARKED by the user's word** until a start with
nothing explaining it has been played. Do not take it because it is in the file.

**THE BALANCE PASS IS OUT OF THIS FILE.** *"Remove the balance pass from the
list, I'll just tell you when to do it."* It is not work, not a phase and not
something to pick up — **wait to be told.** Everything it had accumulated (the
parked checks, the skills and off-hand look, the three things earlier phases
handed it) is in `git log` at `977403c`, which is where to read it back from on
the day he calls for it.

**Phases 0, 1, 2, 4 and 5 are DONE and deleted** — the climb, four trades, the
loop, and loot that is rare. `git log` is where a session that has to undo one
looks.

**One ask has NOTHING to bind and was not invented.** *"Keybindings for flasks,
and boss controls"* — the flasks are `potion_life` and `potion_mana` in
`BINDINGS` and rebind on the keys tab, but **a boss is not driven by the player
any more.** The turn was deleted and the fight rebuilt around what a build
carries, so `BossDef.phases` is a cycle the boss runs and there is no verb left
for a key to hold. Ask before adding one; it would be a mechanism, not a
binding.

---

## Phase 6 — THE CAMPAIGN, THE PROVING GROUND AND THE SEAM

**THE ACTIVE PHASE.** Everything below is the user's own restructure of what a
run is FOR. It moves the crystals and the trials out of the first hundred hours
entirely, gives the climb a finish line, and puts a second, endless game behind
it — the one the crystals and the points were always for.

### The ask, in the user's words

*"I think you shouldn't see any trial stuff or even receive any crystals until
you've cleared the entire campaign 'story mode'. Keep the same difficulty curve
that stands but give no crystals/ or trial unlocks at all until you complete the
loop below and clearly states when to receive them."*

*"The Answering is the same. Refraction can be the prismatic zone instead of
base zone but otherwise the same difficulty curve. Flowering is the rot but
otherwise the same. Encounter each npc for crafting in each zone respectively."*

*"After completing all three of these you are awarded 1 crystal from lampwright
and 10 trial points which we will rename to something else that thematically
fits with this system because I want to remove all of the existing trials.
Instead they will all be revolving around doing grinds. For example, just
running the fissure a certain amount of times can be one of the easy ones but im
thinking a lot like 100 runs or something gets you 5 points. open 100 hordes,
swell 1000 enemies, kill 2500 wardens stuff like that. Runs with demonic and
prismatic influence."*

*"Once you finish the first three runs of each zone you end in a 4th tab that
only has one area and its where you can socket the crystals. The other menu can
just remove the crystal sockets and take up more screen with the map and the 4th
screen can have the crystal sockets laid out like the fissure entrance in the
camp on top of the map though. This one is just a set difficulty even harder
than the final 'story mode' level which you can scale with more crystals and
more trial points or whatever we call them."*

*"But just make normal crystals pay out at 25/50/75/100 runs of this new zone.
Prismatic crystal pays out and full lvl 4 normal crystals, then another at level
2 prismatic crystal, another at level 3, and another at lvl 4, and then the same
thing for demonic. Have this zone allow you to select your 'influence' so you
can have it be base fissure, prismatic, or demonic (we really need a different
name for the base fissure idk waht to call it) which will decide what the area
looks like and add that type of mobs to the zone. As you mix and match crystals
you can still get the other types to join by that method but the zone will stay
what your influence is with the exception of socketing 2 lvl 4 prismatic and 2
lvl 4 demonic gives you the seam which will be the final zone."*

### What this changes about the shape of the game

Today the game is ONE loop: socket crystals, pick a depth, descend. After this
it is TWO, and the first is finite.

| | THE CAMPAIGN | THE PROVING GROUND |
|---|---|---|
| what picks the fight | a DEPTH on the climb, 42 of them | your INFLUENCE and what is socketed |
| difficulty | `rungMod` alone — the straight 20-a-depth line, unchanged | a set floor above depth 42, scaled by crystals and points |
| crystals | NONE. No sockets, no rolls, no levelling | the whole of it |
| the trials web | NOT SHOWN. It does not exist yet | earned by grinding, spent here |
| the world you walk into | the ZONE's own: Answering, Refraction, Flowering | your influence, plus whatever you socket |
| it ends | when The Flowering's boss falls | never |

**The zones stop being depth-only and become WORLDS again**, which is the one
rule this reverses: `CLAUDE.md` says "A ZONE IS DEPTH AND NEVER A WORLD… what
world you walk into is what you SOCKETED". With nothing socketed for the whole
campaign that sentence has nothing left to mean, so the campaign's three zones
carry a `world` of their own — Answering the base world, Refraction the Cavern,
Flowering the Rot — and the SOCKETED world comes back in the Proving Ground
where sockets exist. The difficulty curve does not move: `rungMod` is untouched.

### The names, picked

**At the user's word** — *"you can pick the names for phase 6 too."* Each is a
PLAYER word; **no identifier moves**, because a save points at them. The same
split the climb already ships: a player says depth, the code says `rung`.

| the thing | the word | why, and what it does NOT collide with |
|---|---|---|
| the base WORLD | **The Diggings** | *"we really need a different name for the base fissure."* A place somebody dug and gave up on, which is what the art is. Not "The Workings" — `slotWorkings`, `damageWorkings`, `skillWorkings` and `potionWorkings` are all in `src/`, and Mahthar's own lore already says "older than the workings" as ordinary words. `MapTheme` stays `'fissure'`. |
| the POINTS | **Tallies** | a scratch on a wall for a thing done again and again, which is exactly what a grind is, and it sits on a card at "7 Tallies". Not "Marks" — a MARK over a person's head already means they are holding something (`wants()` in `src/ui/talk.ts`). `Character.trials` stays. |
| the WEB they are spent on | **The Reckoning** | a reckoning is a tallying-up, so it takes its name from what pays for it. The old name has to go with `TRIALS`: calling it the trials web after the trials are deleted is a word for a thing that no longer exists. `src/trials.ts` and the `trial_` prefix stay. |
| the list of GRINDS | **The Ledger** | what is written down: `descents run 43 / 100`. It is the screen the counters live on. **The cheapest of the four to drop** — if it reads as one noun too many, the counters go on a tab of the Reckoning and this word never ships. |

**The Fissure keeps its other two jobs**: the crack in the camp is still the
Fissure, and so is the window it opens. Only the WORLD is renamed, because that
is the one the user was naming when he asked — he was listing influences,
*"base fissure, prismatic, or demonic."*

**`CLAUDE.md` says all four old words and must be rewritten in the same breath
as the step that lands them.** So must `KEYWORDS`, and `BANNED` takes the
retired phrasings.

### The steps, each leaving the suite green

- [x] **Step 1a — a campaign zone is a WORLD and a gear TIER. DONE.**
      `LadderZoneDef.world` and `.tier`, read by `runSet` whenever a descent
      names a depth: The Answering is the Fissure at tier 1, The Refraction the
      Cavern at 2, The Flowering the Rot at 3. Off the climb the sockets answer
      both, which is what the Proving Ground is made of. `rungMod` untouched.
- [x] **Step 1b — nothing is PAID until the campaign is whole. DONE.**
      `campaignDone` in `src/ladder.ts`; `CRYSTAL_DEPTHS` and `CrystalDepth`
      deleted. `takeDepth` pays `CAMPAIGN_REWARD` — 1 crystal, 10 points — on
      the depth that finishes the last zone, once, flagged by
      `Character.paidCampaign`. `trialPointsFor` is 0 before that, so the web is
      visible from the first descent with nothing on it walkable.
- [x] **Step 1c — the Fissure window loses its socket column. DONE.**
      `.fissurecard--bare`, toggled off `campaignDone` in `src/ui/run.ts`: one
      column, no sockets and no selection panel, so the climb takes the whole
      room until the campaign is whole. The sockets come back on the Proving
      Ground's own tab in step 5.
- [x] **Step 2 — what a campaign clear PAYS. DONE.** `takeDepth` is gone: the
      reward is a third thing `giftWaiting` puts in the Lampwright's hands,
      taken in his own scene with `LAMPWRIGHT.campaign` on the end of it, and
      `Handover.says` is what the panel prints for the points, which are not a
      thing you can hold. `Character.paidCampaign` is set by the HANDOVER, and
      `trialPointsFor` and the Fissure's socket column both read it — so a
      column with nothing to put in it is never on screen. `campaignLine` and
      `campaignPrize` in `src/ladder.ts` state the finish line on the climb
      before you get there, and the last zone's boss pip says so too.
- [x] **Step 3 — the three crafting people, one a zone. DONE.** `whoIsDown` is
      in `src/game/scenes.ts` and SCHEDULED rather than rolled: the next unmet
      person of that world stands at every `MEET.every` depth from `MEET.first`,
      which measures out as the Lampwright at The Answering 2, the Glasswright
      and the Astral-Geometer at The Refraction 2 and 6, and the Osteomancer at
      The Flowering 2. `MEET_CHANCE` is gone; the demo walks all 42 depths in
      order and holds every person to turning up, in their own world and off an
      arena depth, and to never standing there twice.
- [x] **Step 4 — what AWARDS the points becomes GRINDS. DONE, and the WEB
      SURVIVED.** All 156 nodes are untouched; `TRIALS`, `TrialDef`,
      `TRIAL_CONDITIONS` and `QuestNeed` are deleted. `GRINDS` is 18 lines in
      four ladders — descents, Hoards and Veins, Welled bodies and Wardens and
      Bearers, and descents under each influence — each naming a
      `GRIND_COUNTERS` entry that says what one clear ADDS, counted through the
      one `descentFacts`. `RunState.wardens` is new; Hoards and Veins count
      apart off `Hoard.pays`. **The counts are `Character.grinds`, PER
      CHARACTER and not `GameState`** — global, a second character would start
      the web full, which the demo already forbade. The campaign's 10 plus the
      Ledger's 50 come to `TALLIES.max` exactly and the demo holds it; the demo
      also PLAYS a descent for every counter and fails one that never moves.
      **The names landed with it**: Tallies, the Reckoning, the Ledger, in
      `KEYWORDS.BANNED`, `CLAUDE.md` and every screen. Identifiers did not move.
- [ ] **Step 5 — the Proving Ground.** A fourth tab, one area, the sockets laid
      out over the map the way the camp's crack lays them out. Influence is
      picked here and decides the world and the pack. Difficulty is a floor
      above depth 42, raised by what is socketed and by points spent.
- [ ] **Step 6 — the crystal ladder.** 25/50/75/100 clears pay the four normal
      crystals. Four level-4 normals pay the first Prismatic; a level 2, 3 and 4
      Prismatic each pay the next. Four level-4 Prismatics open the same ladder
      for Demonic.
- [ ] **Step 7 — THE SEAM.** Two level-4 Prismatic and two level-4 Demonic
      socketed at once opens the Seam — the `seam` theme is already drawn and
      already has its three locks. The last world, and the only one you cannot
      pick.

### What must not break

`heal()` — every existing save has crystals, trial allocations and `climbed`
under the old rules, and none of it may throw away a character. The straight
20-a-depth ramp. `SAVE_VERSION` stays put unless a save must be REFUSED.

## Phase 7 — GEAR IS CRAFTED: materials, professions, and a camp with work in it

**Decided in conversation, every question answered.** The filter was never the
problem — it was the symptom. A clear pays 1.3 to 84 finished pieces and almost
none of it is looked at, so the filter exists to throw away noise, and every
knob added to it is another knob for managing garbage. The fix is to drop FEWER,
more meaningful things: materials that stack, and gear you MAKE.

### The ask, in the user's words

*"I think I want to do another change to gear because the filter system is just
not cutting it and making it more complex is just going to become too
complicated… mobs drop crafting items like the currency items we have currently
along with ores, cloths, leathers, gems etc. Using those items along with the
currency items crafts bases of different tiers."*

*"I don't want there to be tiers of any materials, I want there to be different
versions that aren't inherently stronger than others. Like demonic cloth,
rotting leather, prismatic cloth… probably a couple versions per zone but they
should all be generically useful and probably require all of them to make the
best gear."*

*"It's weird to get ore from enemies… should there be ore to mine in the area
and your character just goes up and mines it?"*

*"Needs to be smooth, no just tanking mobs and minimize back tracking as much as
possible. Need to have relatively equal drop rates between materials."*

### The rules this settles

- **MATERIALS HAVE VERSIONS, NEVER TIERS.** Demonic cloth is not better than
  prismatic cloth. Tiered materials kill every zone you outgrow; versions mean
  the shallow end is still an ingredient at the deep end.
- **A TIER IS HOW MANY DIFFERENT VERSIONS THE RECIPE DEMANDS.** t1 takes one
  version of the right family, t2 two, t3 every one there is plus more of
  everything. Depth matters because ACCESS to worlds is gated, not because deep
  ore is better ore — and nothing ever becomes obsolete.
- **EVERY WORLD CARRIES EVERY FAMILY, plus ONE of its own.** *"They should all
  contain the normal ones but maybe just a single 'unique' material per zone
  that's not inherently tied to a single crafting style, just a rare material
  used in crafting really powerful stuff."* So four worlds × six families is
  twenty-four versions and four zone-uniques on top — **past the 12–16 first
  floated, deliberately**: *"it's fine if it's more than 16, they should just
  exist as single line items with a little icon next to them so we can fit a
  lot."* The cross-zone requirement comes from the TIER rule and the four
  uniques rather than from a world missing a family.
- **EVERYTHING IS ACQUIRED IN A DESCENT AND PROCESSED IN CAMP.** Ore is mined,
  hide is skinned, cloth comes off what wore it, gems are rare from any of them,
  wood is cut, fish come out of pools. Camp is smelting, tanning, weaving,
  cutting and cooking. Nothing can be farmed by leaving a tab open.
- **GATHERING HAPPENS WHEN THE ROOM IS CLEAR**, the way a Hoard opens when its
  last guard falls. That is both constraints at once: no channel while something
  is hitting you (*"no just tanking mobs"*), and no node is ever a detour
  because you already fought there (*"minimize back tracking"*). It is the same
  behaviour the roadmap already owes for walking to a chest.
- **MATERIALS RIDE THE PER-RUN BUDGET, never a per-kill rate.** The per-kill
  mistake is already documented: kills run 26 at the bare Fissure against 847 at
  the deep end, so a flat rate paid 1.5 a clear at one end and 84 at the other.
  *"Relatively equal drop rates"* is only sayable as a budget drawn down against
  what is left to kill.
- **MATERIALS DECIDE WHAT AN ITEM IS; CURRENCY DECIDES WHAT IS ON IT.** Crafting
  picks the BASE and its IMPLICIT — `GearBase.implicit` already exists, so this
  is choosing which row to make, not a restructure. Every modifier is still the
  bench's. Two economies, two decisions, and neither is a slot machine.
- **A LEVEL SLIDES THE WINDOW, and it is ONE mechanism for every profession.**
  The BASE names the range and the LEVEL decides where inside it you land,
  narrowing as it climbs: *"a plate helm can get between 100–150 armour, where
  if you're 1 blacksmithing it's always 100–105 and if you're 99 it's always
  145–150."* Materials decide which tier you may ATTEMPT; the level decides how
  well the attempt comes out, and the chance of a PERFECT base. Cooking uses the
  identical rule for how long a meal lasts, so there is one thing to learn.
- **A RECIPE NAMES ONE OR TWO PROFESSIONS AND A LEVEL IN EACH.** Hybrid armour
  already needs two by construction: `ARMOUR_FAMILIES.archetypes` is melee /
  spell / rogue, six families single and six hybrid. Weapons work the same way —
  a sword is mostly Blacksmithing, a bow mostly Woodworking, a staff between.
  No table special-cases weapons.
- **XP COMES FROM PROCESSING AND FROM CRAFTING, both.** Weighted so a higher
  recipe beats spamming the cheapest one — *"I am ok with some spamming though
  to level"* — which is the difference between a curve and a wall.
- **NOTHING CAPS THE PROFESSIONS.** *"You can freely level them all but it just
  costs your time… I don't like forcing you to pick, I think it should just be
  you need to choose early and eventually can out grind any walls."* So the
  early choice is real and the late one is not: hybrids become the endgame
  default rather than a sidegrade, deliberately.
- **A HYBRID IS MORE TOTAL POWER; A SPECIALIST IS MORE OF ONE THING.** *"The
  hybrids can be strictly more overall stat power so for most builds they can be
  better, but you can get more of one stat going specific."* Worked through: if
  5 armour and 5 attack speed are each one POWER, a specialist helm is 50 armour
  — ten power — and a hybrid is 30 armour and 30 attack speed, twelve. The
  hybrid wins on total and loses to a build that stacks the one stat, so the two
  professions a hybrid costs buy breadth rather than a bigger number.
  **This needs a stat-power table**, hero-side, and `DANGER_STATS` is already
  the same shape: a weight per stat so "total power" is a number the demo can
  read rather than a claim.
- **A PERFECT BASE IS CRAFTABLE AND STILL DROPS.** *"I'm fine with uniques and
  perfect bases dropping, but I think there should also just be a way to get
  perfect bases from crafting."* Two roads to the same item and neither closes
  the other: the floor pays one as a rare share of a now-rare drop, and a craft
  pays one on a chance that rides the profession LEVEL — so the endgame chase is
  either luck or a hundred levels of work. **It stays out of the gamble**, which
  is the only road that would make it buyable.
- **GEAR STILL DROPS, RARELY, AND ANY BASE.** *"Since it's so much rarer and it
  can drop any base it'll be very unlikely it's what your character wants, so
  when you do finally get a piece it'll feel good and not make crafting the ONLY
  way to get gear."* Dismantle it for materials of its tier, or sell it.
- **A DISMANTLE NEVER RETURNS MORE THAN THE RECIPE TOOK**, or craft → dismantle
  → craft is a material printer.

### The professions and the materials, enumerated

**SIX PROFESSIONS, SIX MATERIAL FAMILIES, one apiece.** Nothing here was in the
file before and a fresh session cannot build the phase without it.

| profession | its family | raw → processed | what it makes |
|---|---|---|---|
| **Blacksmithing** | metal | ore → bars, at the smelter | `melee` armour; most weapons |
| **Weaving** | cloth | fibre → bolts, at the loom | `spell` armour |
| **Leatherworking** | hide | skins → leather, at the tanning frame | `rogue` armour |
| **Woodworking** | wood | logs → staves, at the bench | bows, staves, hafts |
| **Jewelling** | gem | rough → cut, at the jeweller's | every ring and amulet |
| **Cooking** | fish | catch → meal, at the kitchen | the buffs |

**THE ARMOUR MAP IS ALREADY IN THE DATA and it is exact.**
`ARMOUR_FAMILIES.archetypes` is `melee` / `spell` / `rogue`; six families carry
ONE and six carry TWO. So `melee → Blacksmithing`, `spell → Weaving`,
`rogue → Leatherworking`, and **a hybrid family's recipe names exactly the two
professions its archetypes name.** `templar` (melee + spell) is Blacksmithing
and Weaving; `bulwark` (melee) is Blacksmithing alone. No table special-cases
anything and the six/six split the hybrid rule needs is what already ships.

**THE COUNT: 24 versions and 4 uniques, 28 rows.** Four worlds — the Diggings,
the Cavern, the Rot, the Seam — times six families, plus one zone-unique each,
which is not tied to a profession and is what the best recipes ask for. The
Seam's five are endgame by construction, since nothing reaches the Seam early.

**A FAMILY IN EVERY WORLD IS A NAMING PROBLEM, and it is the user's rule.**
*"They should all contain the normal ones."* Wood in a crystal cavern and fish
in the Rot need words that are not a stretch — a mineral growth that saws like
timber, a thing swimming in a warm pool. **This is where the flavour work is;
do not solve it by dropping a family from a world.**

### Gold, and the shop that stops selling gear

Gold has two sources in the sim and one outside it — SELLING. Rare gear breaks
that, and the shelf of buyable gear is pointless the moment crafting beats it.

- **Gold buys MATERIALS at a bad rate**, which is the smoothing mechanism for
  "equal drop rates": short of one thing, you buy it rather than grind a zone
  you do not want to run.
- **The shelf becomes a GAMBLE.** *"Instead of buying a set gear piece it gives
  a random piece of a certain type… each one has a chance of being a unique
  item. Make it really bad odds but just as a gold sink."* You buy "a ring", not
  a named ring, and *"each one has a chance of being a unique item… really bad odds
  but just as a gold sink."*
- **SOME UNIQUES WILL BE GAMBLE-ONLY, and none of them is designed.** *"Yes
  there will be some but we don't need to work out those yet."* **What that
  costs while building is one seam and nothing else:** the gamble picks its item
  through the SAME gated pool everything else does, with `DropGate` gaining a
  SOURCE dimension beside `minPower` and `zone`. Do that and a gamble-only
  unique is later a table row; hardcode the gamble a pool of its own and it is
  a rewrite. **Build the seam, author nothing behind it.**
- **A gamble always costs more than any one piece sells for**, so it is a sink
  by construction and the demo can hold that arithmetic.
- **No Perfect out of the gamble**, or it competes with the thing crafting owns.
- **Buy-back survives, for what you SOLD only** — it is there for a mis-click,
  never a re-roll of a gamble.

### Cooking, and the buff that burns down

**A MEAL IS A BUFF THAT LASTS RUNS, and that shape already ships**:
`RolledMod.uses` is descents left, set at the roll and spent one per CLEAR. A
meal is the same thing pointed at the hero.

**How many runs is the level sliding the window again** — *"maybe one buff can
give 5–15 runs, and at level 1 you can only get it to land on 5–8 and it goes up
until level 99 cooking is always 14–15."* Fish are caught in a descent and
cooked in camp like everything else; a meal is APPLIED in camp, never mid-run.

### Jewellery

Its own profession, using every material. **Ten base types**, each one an
implicit: Elemental Resistance, Occult Resistance, % Life, % Mana, and one per
attribute — Strength, Intelligence, Dexterity, Acuity, Spirit, Constitution.

- Both a RING and an AMULET of each, so twenty `GearBase` rows and **no new
  icons**: `gear_ring` and `gear_amulet` are recoloured per implicit — occult
  purple, elemental tri-colour, Strength solid red, and so on.
- **The amulet's implicit rolls stronger than a ring's.** Two ring slots and one
  amulet: without that split the answer is always "wear the three best" and the
  slot is not contested.

### The camp

A smelter, an anvil, a loom, a jeweller's bench and a kitchen. **That is a new,
larger GENERATED scene**, not a code change: the camp is one 688×384 picture and
every hotspot is a rectangle measured in that picture's own pixels, so a new
picture invalidates all nine. It needs the generator and it needs the user to
approve the design before anything is dressed. **It is the long pole of this
whole arc.**

**PROCESSING ADVANCES ON DESCENTS, never on a clock.** A smelter job is N clears
long: load it, go down, come back to bars. That is genuinely idle — the idling
is the descending, which already chains — and it cannot be farmed by an open
browser, which is what "automation is universal" requires.

### The steps, each leaving the suite green

**Nine, and the ART one starts FIRST because it is the only one that waits on
somebody.** A camp picture is a generation queue and a design the user has to
approve; everything else is code that can be written while it renders.

- [ ] **Step 0 — the camp DESIGN, started immediately and in parallel.** One
      688×384 scene with a smelter, an anvil, a loom, a tanning frame, a
      jeweller's bench and a kitchen, on top of the nine hotspots already there.
      **Show the user candidates and get an approval before anything is rotated,
      animated or dressed** — that rule is absolute. Nothing downstream blocks
      on it until step 8.
- [ ] **Step 1 — the tables, and nothing uses them yet.** `MATERIALS` (28 rows),
      `PROFESSIONS` (6), `Character.professions` as `{ level, xp }` apiece, and
      an `ItemKind` for a material so it stacks. `SAVE_VERSION` bumps here and
      once only. The demo sweeps every row for a keyword violation and for an
      icon that resolves. Green because nothing reads any of it.
- [ ] **Step 2 — gathering, and gear gets rare.** Nodes placed and gathered the
      way a lock opens: **when the room is clear**, which is both of the user's
      constraints at once. On the per-run depleting budget, never a per-kill
      rate. `DropBand.gearPerRun` falls hard in the same step, so the bag does
      not hold both economies at full volume for a single commit.
- [ ] **Step 3 — processing, in camp, ADVANCING ON DESCENTS.** A smelter job is
      N clears long: load it, go down, come back to bars. Genuinely idle without
      being farmable by an open browser, which is what "automation is universal"
      demands. Processing pays profession XP.
- [ ] **Step 4 — crafting.** `RECIPES` naming one or two professions and a level
      in each; materials pick the BASE and its IMPLICIT; the level slides the
      roll window and narrows it; a chance of PERFECT off the level. Dismantle
      lands here too, and it may never return more than the recipe took.
      Crafting pays XP, weighted so a higher recipe beats spamming the cheapest.
- [ ] **Step 5 — jewellery.** Twenty `GearBase` rows — ten implicits × ring and
      amulet — tinted rather than re-drawn, the amulet's implicit rolling
      stronger than the ring's.
- [ ] **Step 6 — the hybrid rule, and the table that makes it checkable.** A
      hero-side stat-power weight per stat, shaped like `DANGER_STATS`. The demo
      then asserts both halves: a hybrid piece totals MORE power than a
      specialist, and a specialist beats it on its own one stat. Without the
      table this rule is a claim.
- [ ] **Step 7 — cooking.** Fish, meals, and a buff that burns down on
      `RolledMod.uses` — the shape already ships. Applied in camp, never
      mid-run; the level slides how many runs it lasts, exactly as it slides a
      roll window.
- [ ] **Step 8 — the shop becomes a GAMBLE and the filter GOES.** Delete the
      Filter screen, `KEEP_GROUPS`, `GameState.junk`, the bulk sell and the
      shelf of named gear. Gold buys materials at a bad rate. The camp picture
      from step 0 lands here with its five new hotspots.

**Done when.** A clear pays materials rather than a heap to sort; the gear you
wear is gear you MADE; a profession level is felt in the roll you get; and there
is no filter, because there is nothing to filter.

### What must not break

- **`heal()` is explicitly NOT a concern** — the `SAVE_VERSION` bump in step 1
  refuses older saves and that is the point. Do not write a migration.
- **Automation is universal, with no exception.** Gathering has a shipped
  default policy that `runToCompletion` runs, and that policy is the only
  implementation. A node nobody can gather headlessly is a broken node.
- **A run must always END.** Gathering adds time to a descent; `runToCompletion`
  is bounded at 600s and a run that does not finish is a mechanism failure.
- **`s.totalMonsters` counts the whole encounter the moment it starts.**
  Anything that adds bodies has to say so to the counter.
- **A descent's dressing has its OWN rng.** Placing nodes must not move the
  draws that pick a monster, a drop or anything else a seed replays.
- **`Grid.walkable`, never `tiles`.** A gathering node that blocks is a
  `SOLID_PROPS` and gives that up the moment it cuts anything off.
- **The demo, `mods`, `smoke` and `shots`.** A new screen is a new shot; a rail
  icon with no `ICONS` entry renders nothing and fails nowhere.

### What this DELETES

The Filter screen, `KEEP_GROUPS`, `GameState.junk`, the bulk sell, the shelf of
named gear, and most of `DropBand.gearPerRun`.

### Saves

**`heal()` is not a concern for this arc** — *"I'd rather just start my test
over."* It is a `SAVE_VERSION` bump that refuses older saves, which is what buys
the freedom to rename and delete rather than migrate a system still moving.

### Nothing is open

**The sequencing call is MADE** — Phase 6, then the chest walk, then this — and
both of the questions this file used to hold are answered.

- **CRAFTING QUALITY AND THE ROLL WINDOW ARE ONE MECHANISM.** *"Yeah it's the
  same as the roll window."* So there is no second figure, no quality stat on
  the item and no extra card line: **quality IS where inside the base's range
  the level lands you**, narrowing as it climbs. One thing to build, one thing
  to learn, and cooking's run count is the same rule again.
- **GAMBLE-ONLY UNIQUES WILL EXIST, and they are NOT designed yet.** *"Yes there
  will be some but we don't need to work out those yet."* Do not invent one, do
  not pick which, do not write a table of them. **The one thing it costs at
  BUILD time is a seam** — see the gamble section.

**The NUMBERS are measured, not chosen**: the stat-power weights, the roll
windows per level, the recipe costs, what a node yields. None of them is a
design question and none blocks a step.

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

**Left over from finished phases. Each is a task, not a question.**

- **THE HERO STILL DOES NOT WALK TO THE CHEST.** *"I want it to be a chest that
  will actually open and when you kill all the mobs your character walks up and
  opens it."* The twelve locks are drawn, shut and open, and the swap works —
  `swapProps` in `src/render/pixi.ts` re-reads a prop's id every frame, which is
  what was broken. What is missing is the WALK: a lock still opens the instant
  the last guard falls, wherever the hero is standing. It needs a shipped
  default policy that `runToCompletion` runs, like everything else a player
  could do mid-descent.
- **The named-piece check is thin.** 16 descents expects 5.5 and read 3; a zero
  is a 1-in-250 flake. Uniques are a share of drops like Perfect, and the count
  fell under them — either widen the sample or make it a `gauge()`.
- **Dialogue pass: cut the rambling qualifiers.** Never scheduled, never
  cancelled. Every `beats` line in `src/scenes/*` reads long.

---

## Traps that outlive the phase that found them

**Kept because they bite the NEXT thing, not because of what they came from.**

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

**PHASE 6'S OWN. Both blocking questions are answered and folded into its
steps; these three are not.**

- **What is the base world called?** *"we really need a different name for the
  base fissure idk waht to call it."* The clash is that The Fissure is the crack
  in camp, the whole descent system AND one of three worlds. Proposed, in order:
  **The Workings** (a place somebody dug and gave up on, which is what the art
  is), The Diggings, The Old Cut.
- **What are the points called?** Proposed: **Marks** — earned by doing a thing
  enough times that the rock remembers it, and short enough to sit on a card.
  Alternatives: Tallies, Reckonings, Proofs.
- **How many grinds, and what does one pay?** *"100 runs or something gets you
  5 points"* is the only figure given. Proposed: about 20 counters across four
  families (descents, locks, floor rules, influences), paying 1 to 5 apiece.
- **Does the Seam have a boss?** It is *"the final zone"* and every other zone's
  last depth is one. Proposed: yes, but it is Phase 7 — a boss was a whole phase
  each of the three times.

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
- **Jewellery has three rungs but no implicit.** The amulet and ring bases
  differ in exactly one way — how many modifiers they hold — which is the
  clearest statement of what a base tier is and also the least interesting pair
  of slots in the game. Implicits would fix it, and they are a balance change:
  the Astral-Geometer leans on the gap rather than fixing it, since a graft ADDS
  on jewellery and the line that changes the delivery charges mana instead.
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
