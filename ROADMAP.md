# Crystal Core — Roadmap

**The work that is left, and nothing else.** What is always true is `CLAUDE.md`
and the skills it indexes. If a thing here is not a task or something you need
in order to do one, it is in the wrong file. **A finished phase is DELETED from
this file** — `git log` is where a session that has to undo one looks.

## Where this stands

**THE ORDER IS SETTLED and it is the user's:** *"just finish phase 6, make the
character walk to the chest, you can pick the names for phase 6 too. And then go
to phase 7."* So:

1. ~~PHASE 6~~ — **WHOLE and deleted.** `git log` from `2ff5dfa` to `4b6caac`.
2. ~~THE CHEST WALK~~ — **DONE.** `Hoard.free` is the guards being down and
   `stepHoard` is the walk that opens it, asked with nothing left to fight.
3. **PHASE 7**, in full.

Nothing else is queued and nothing else may be promoted without being asked.

**THE NAMES LANDED WITH PHASE 6**: the points are **TALLIES**, the web is
**THE RECKONING**, the list of grinds is **THE LEDGER**. **The fourth was NOT
taken** — the base world is still The Fissure. The influence picker names it
`THEME_BY_ID.fissure.name`, which reads correctly beside The Cavern and The Rot,
and renaming a world nobody was confused by is a change with no complaint behind
it. **The Diggings** is the name if he ever asks; it is one string.
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

**Phases 0, 1, 2, 4, 5 and 6 are DONE and deleted** — the climb, four trades,
the loop, loot that is rare, and the campaign / Proving Ground / Seam split.
`git log` is where a session that has to undo one looks.

**One ask has NOTHING to bind and was not invented.** *"Keybindings for flasks,
and boss controls"* — the flasks are `potion_life` and `potion_mana` in
`BINDINGS` and rebind on the keys tab, but **a boss is not driven by the player
any more.** The turn was deleted and the fight rebuilt around what a build
carries, so `BossDef.phases` is a cycle the boss runs and there is no verb left
for a key to hold. Ask before adding one; it would be a mechanism, not a
binding.

---

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

- [x] **Step 0 — the camp PICTURE. DONE, and approved.** `camp_full`'s worn
      ground, emitted as `camp`. What it took, so nobody pays for it twice:
      - **688×384 is the ceiling and the camp was already full screen.**
        `create_image_pro` caps at 688×384 for 16:9 (512² square, 600×448 at
        4:3, axis maxes not combinable), checked against the API docs. More room
        was a COMPOSITION change — camera pulled back — and it was free.
      - **THE "SET ON TOP" FAULT WAS THE GROUND, NOT THE OBJECTS.** *"Everything
        looks artificial like it's been just set on top of… maybe add some paths
        in grass to where someone's been walking."* The repair is in the ask:
        the grass is TRODDEN AWAY to bare earth in irregular patches, many
        uneven branching paths are beaten from the split to every object and
        between them, and every object sits in its own patch with grass against
        its base. One pass fixed it. **Do not ask for a camp on unbroken grass.**
      - **A description over ~1930 characters is REFUSED** by
        `create_image_pro`, as a pydantic `string_too_long` before it bills.
        The shipped `camp` say is 1907. Budget for it.
      - **HOTSPOTS ARE MEASURED FROM THE PIXELS, never by eye.** Four rounds of
        eyeballing put two sockets on bare rock; a connected-component pass over
        the cliff band (luminance < 30, blobs > 250px) gave the four hollows
        exactly and symmetric about the split. `tools/art/cache/camp_spots3.png`
        is the overlay that proves each box lands on its thing.
      - **THE DEMO'S CAMP CHECKS ARE ARITHMETIC AND RUN IN SECONDS.** Importing
        `CAMP_HOTSPOTS` and re-running its overlap test caught a 2px socket1
        over socket3 without paying for a 19-minute demo.
      - **The crack's CENTRE is what gets clicked**, and shortening the box
        moved it up into something that intercepted the press — `shots` caught
        it as "clicking the crack never opened it". It reaches down over the
        light spill now.
      - **SIX HOLLOWS ARE DRAWN AND FOUR ARE WIRED.** *"6 sockets is fine, don't
        change anything about the socket system, still 4 crystals, but 6 leaves
        us room to add other things later."* Nothing points at the spare pair.
      - **STILL OWED**: the five new stations in the picture — furnace, anvil,
        loom, tannery, cooking tripod, tool table — have no hotspots yet,
        because they have no screens to open. That is step 8's, and the boxes
        are measurable off `camp_ground.png` when it gets there.

- [x] **Step 1 — the tables, and nothing uses them yet. DONE.**
      `MATERIAL_FAMILIES` (6), `MATERIALS` (28 = 4 worlds × 6 families + one
      unique each), `PROFESSIONS` (6, one per family), `PROFESSION.maxLevel`,
      `Character.professions`, and `'material'` on `ItemKind`. `SAVE_VERSION` is
      2 — **bumped for the whole arc, and nothing later in it may bump again.**
      The demo holds: no world short a family, exactly one unique a world, one
      profession per family both ways, no shared id or name, every row's icon
      RESOLVING in `GENERATED_ICONS`, no banned phrasing anywhere in the three
      tables, and that nothing hands a material out yet — which is the step.
      **The 28 icons are generated and imported.** Three still fight their noun
      — `clearheart` wants to be purple, `rotsilk` keeps coming back a bag,
      `joinstone` will not split down the middle — and they are legible at the
      24–40px an icon is read at, so they were ACCEPTED rather than re-rolled a
      third time. Re-roll them if they ever look wrong in the dock.
- [x] **Step 2 — gathering, and gear gets rare. DONE.** `GATHER` and
      `RunState.nodes`: a node is **a lock with a family on it** — put in a
      pack's room, freed by that pack going down, walked to by `stepNode` the
      way `stepHoard` walks to a chest. What it cost, so nobody pays twice:
      - **A COUNT, NOT A BUDGET, and that is the honest reading of the rule.**
        `GATHER.perRun` × `RunSet.yield` nodes, each handing over 2–5, so a
        descent is read off the SET without running it. Measured: 6 nodes and
        ~25 units at both ends against 3× the bodies, where a per-kill rate
        would have paid 3×. `whole()` settles it before it is spread, exactly
        as the gear budget does.
      - **DEALT, NEVER ROLLED.** *"Relatively equal drop rates."* The six
        families are shuffled and dealt round the nodes: measured 12/12/12/12/
        12/12 over twelve descents. Six independent draws could come up all
        metal and no assertion could have caught it.
      - **PLACED AFTER THE PACKS, deliberately.** Every draw a node spends comes
        after the one that decided a body, so how much ore a run holds cannot
        move what is fighting in it. `packRoom[]` is how a node knows whose
        room it is standing in.
      - **THE WALK IS THE WHOLE OF THE DIFFICULTY, and it took three tries.**
        `acquireTarget` returns a body ANYWHERE on the map, so after clearing a
        room the hero sets off for the next pack and never reaches `stepNode` —
        a node freed 5 tiles away goes untaken and is 30 tiles behind by the
        time the floor is dead. What works is TWO reaches: `GATHER.near` (9
        tiles) is checked INSIDE the target branch, before he travels, so a node
        underfoot is taken on the way; `GATHER.walk` (22) is the sweep once
        nothing is left. Measured 6/6 worked and every band back to 10/10.
      - **A BARE DISTANCE CAP LIVELOCKS, and it cost a run 300 seconds.** A node
        across a wall is inside the cap by line of sight and outside it once he
        has walked round, so he crosses the boundary for ever. `GatherNode.left`
        is the one-way decision that fixes it, and it is only ever taken with
        the floor already dead.
      - **AN UNBOUNDED WALK BROKE TWO DEMO CHECKS, and the evidence came from a
        worktree at HEAD.** *"A monster is worth more at every band"* inverted
        at band 3, and one band-6 seed went 235s → over the 400s budget. Both
        were run-LENGTH, not payment. A `git worktree` at the last commit plus a
        70-run probe settled it in six minutes where a second demo is nineteen.
      - **THE ENTER-CHAIN'S BOUND WAS ASSERTING THAT GEAR IS COMMON.** 60
        descents no longer fill a 32-slot bag at 0.27 pieces a clear; measured,
        it takes 81. The bound is 200.
      - **`GATHER` CLASHED WITH A LOCAL.** `src/sim/run.ts` already had a
        `GATHER` — the seconds the sweep-up at the mouth takes. It is `SWEEP`
        now, with `sweeping`/`sweptFrom` beside it.
      - **A MATERIAL STACKS AND HAS ITS OWN CONTAINER.** `GameState.materials`,
        one row a kind with `meta.n` the count, uncapped like relics; `heal`
        merges any save that holds two rows of one kind. Its own dock column,
        drawn only when you hold something, on the relic column's pattern.
      - **`gearPerRun` IS 0.25–0.30**, down from 1.2–1.35. Measured, a bare
        Fissure clear pays 0.13 pieces and 25 materials.
      - **FOUR NODE OBJECTS, ONE PER FAMILY AND THE SAME IN EVERY WORLD.**
        `tools/art/node.mts`, the lock's own pipeline: sixteen candidates in one
        `create_1_direction_object` job, four promoted, a `Spent` state apiece.
        Cloth and gem needed nothing — `cocoon`→`web` and
        `geode_amber`→`geode_split` were already drawn and already a pair.
        **A lock is per world and a node is not**, because an outcrop is the
        rock itself; per-world nodes are 24 objects and nobody has asked.
- [x] **Step 3 — processing, in camp, ADVANCING ON DESCENTS. DONE.** `WORK`,
      `GameState.jobs` and `src/game/work.ts`: load a batch, go down, come back
      to bars. What it settled:
      - **RAW AND PROCESSED ARE TWO STACKS OF ONE ROW.** `Item.meta.done` and
        `stackKey`, not 28 more `MaterialDef`s and 28 more icons. The name takes
        `MaterialFamilyDef.one` — "Pale Iron Bar", "Wickcloth Bolt" — so a stack
        reads as a thing rather than a plural stuck on a name.
      - **A CLEAR, AND NOTHING ELSE.** `advanceWork` is called from
        `buildReport` inside the `cleared` branch, beside `spendSocketed`: a
        death moves no job and neither does walking out. What a walk does not
        buy is progress, and a job is progress.
      - **THE SLOT IS THE WHOLE COST.** `WORK.slots` is 3 over every station, so
        which three you want next is the decision; the raw leaves the bag on
        LOAD, because a job you could cancel for a refund is a slot that costs
        nothing to fill.
      - **XP IS FLAT AND NEVER BY WORLD.** A Seam job paying more than a Fissure
        one would be a TIER in the one place the no-tiers rule is easiest to
        break. `PROFESSION.curve` is 1.05: measured, level 2 is ONE batch, 50 is
        166, and 99 is 1,972 batches — 1,315 descents with every slot full. At
        1.075 it was 13,287 batches, which is a wall pretending to be a curve.
      - **SIX STATIONS, ONE ROOM, SIX TABS.** A smelter and a loom differ in the
        word and the picture, never the mechanism, so `Hotspot.family` opens the
        same screen on that station's own tab. Boxes measured off the camp art
        at 6× with a 10px grid, never by eye: smelter, loom, tanning frame,
        kitchen, sawbench, jeweller's. Fifteen hotspots now, and smoke counts
        them.
      - **A ZONE-UNIQUE IS WORKED BY NOTHING.** It belongs to no family, so no
        station takes it and the best recipes ask for it as it came up.
- [x] **Step 4 — crafting. DONE.** `CRAFT`, `src/game/forge.ts` and the ANVIL
      in the camp. What it settled:
      - **A RECIPE IS DERIVED, NEVER AUTHORED.** `ARMOUR_FAMILIES.archetypes` is
        already melee / spell / rogue, so `ARCHETYPE_PROFESSION` turns it into
        one or two professions and a hybrid family asks for exactly the two its
        archetypes name. Weapons have no archetypes, so `WEAPON_PROFESSIONS` is
        the one table they need — a row, not a special case. Every one of the
        unnamed bases is craftable and there is no `RECIPES` list to keep in
        step with the base table.
      - **`made` IS A MULTIPLIER ON THE ROW, and a DROP is exactly 1.** That is
        the whole of the window: measured, a level 1 craft of an 84-armour helm
        makes 71–75, level 50 makes 82–86 and level 99 makes 94–97 — under a
        drop at the bottom, over it at the top, with the row as the middle. It
        rides `armour`, `damage` AND every implicit through the one `makeGear`
        parameter, so a weapon's implicit moves with its damage.
      - **PERFECT STACKS ON TOP OF IT**, so it stays the step above the best a
        level can reach, and `CRAFT.perfectAtTop` is the second road to one.
      - **THE RECEIPT IS ON THE ITEM.** `meta.spent` is what the craft actually
        ate, so a dismantle refunds a share of THAT rather than guessing off the
        recipe. A FOUND piece has no receipt, so its refund is spread round the
        family's versions off its own id — always refunding the first version
        would slowly starve a bag of the three a tier 3 recipe still wants.
      - **THE PRINTER CHECK IS ASKED OF EVERY BASE**, not a sample: craft it at
        the cap, dismantle it, and assert the total back is under the total in.
        It is the one check standing between this and a material printer.
      - **`CraftRecipe`, NOT `Recipe`.** The shelf already owns that word for
        what a currency purchase costs; one word per mechanism means neither
        may quietly take it from the other.
      - **THE DEV KIT CARRIES RAW AND WORKED**, or half the arc is unreachable
        from it. Sixteen hotspots now.
- [x] **Step 5 — jewellery. DONE.** `JEWEL_IMPLICITS` and `JEWEL`:
      - **TWENTY BASE TYPES, SIXTY ROWS.** The file said twenty `GearBase` rows,
        and that was written before the tier interaction was worked out: every
        rung of jewellery holds the SAME modifiers, so without three rungs a
        ring has no ladder at all and `CRAFT.versions` would never ask a ring
        for a deep material. Ten implicits × ring and amulet × three rungs, the
        same shape armour already ships (12 × 4 × 3 = 144). **What a rung buys
        on jewellery is the implicit's own size** — the demo holds that.
      - **NO NEW ICONS.** `tintedGearIcon` washes every ink of `gear_ring` /
        `gear_amulet` toward the implicit's own hue at that ink's OWN
        brightness, so a highlight stays a highlight. TINT is 0.55 — under a
        half and a red ring is a grey ring; over it, twenty icons are twenty
        flat blobs.
      - **THE OLD SIX IDS ARE GONE**, which `SAVE_VERSION` 2 already paid for.
        `second_mouth` moved from `jade_amulet` to `amulet_life_t2`.
      - **THE GRAFT ANOMALY IS FIXED, not leaned on.** The backlog said a graft
        cost a ring nothing, since jewellery carried no line; every ring and
        amulet is an implicit now, so the trade is the same on all of them.
      - **`npm run mods` COULD NOT SEE AN ATTRIBUTE.** Its probe hands rolled
        mods straight to `heroStats`, and an attribute reaches the sheet through
        `attributeTotals`, which is the CHARACTER's path — so all 36 attribute
        jewellery bases read as inert. The probe now substitutes what an
        attribute BUYS, off `ATTRIBUTES.per`, which is what it really does. **A
        gear line granting an attribute was untested until this step.**
- [x] **Step 6 — the hybrid rule. DONE.** `STAT_POWER`, `statPower()` and
      `HYBRID.lift`:
      - **THE RULE WAS NOT IMPLEMENTED AT ALL.** `ARMOUR_BUDGET` is one figure
        and every `mix` sums to 1, so a hybrid family spent EXACTLY the same 46
        points as a specialist — twelve families of pure sidegrade. It read as
        built because the sentence was in the file.
      - **`HYBRID.lift` IS 1.2**, off the user's own worked example: a
        specialist helm is 50 armour, ten power; a hybrid is 30 and 30, twelve.
        Measured, a tier 3 body is 46 power specialist against 55 hybrid.
      - **HALF TWO NEEDED FOUR MIXES MOVED.** *"You can get more of one stat
        going specific"* only holds if the family with the MOST of every stat is
        a specialist, and at 1.2× three hybrids overtook one: `runeguard` and
        `whisper` on cast speed, `duelist` on attack damage. **And `attackSpeed`
        had no specialist at all** — only `duelist`, a hybrid, carried it — so
        `vanguard` took it, which is what makes it a melee family about hitting
        rather than a second Bulwark.
      - **THE CHECK READS THE PIECE, not the mix.** `statPower` sums every line
        a finished item carries, so the assertion is about what a player wears.
        Asked at every slot and every rung, not one sample.
      - **AN UNPRICED STAT IS WORTH NOTHING**, so the demo holds every base
        implicit to being in `STAT_POWER` — otherwise a family goes missing from
        its own total and the comparison is read off a table with a hole in it.
        It caught `attackRange:inc`, a bow's own line, on the first run.
      - **ARMOUR SETS' OWN CHECK WAS THE OLD RULE.** *"Every family spends the
        SAME points… otherwise 'hybrid' is just the correct answer"* — that is
        the premise step 6 reverses. It compares against each family's OWN
        budget now, and the spread WITHIN a group; what stops hybrid being
        simply the answer is the other half, which THE HYBRID RULE holds.
      - **JEWELLERY BROKE THE DROP MIX and step 6 found it.** `FAMILIES_IN` read
        `GearBase.family`, so ten implicits took rings from weight 2 to 20 and
        **39% of every drop was a ring**. It reads `KEEP_GROUPS` now, which is
        what its comment already claimed — rings are 5.7%. **Step 8 deletes the
        filter, so this weight needs a new basis then.**
      - **`HOARD.baseline` INVERTED THE BAND-WORTH CHECK, TWICE.** A free chest
        one run in five pays a RUN, not a monster; over band 0's 21 bodies that
        is +4 gold a kill against a mean under 2, so ten runs measured whether a
        chest turned up rather than what a monster is worth. Forty runs at the
        two shallow bands — measured, band 0 goes 1.975 → 1.453 and band 1
        1.718 → 2.190, and the ordering is real again.
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

### Which harness each step can actually reach

**MEASURED: `demo` is 19 minutes and `smoke` is 7.** *The user's standing word:
"remember demo runs are long, only run them fully if necessary."* So a step runs
what it can REACH, and the whole suite goes before a PUSH and not before every
commit. `typecheck` (seconds), `comments` and `theme` are free and run always.

| step | what it can reach | what it cannot |
|---|---|---|
| 0 camp art | nothing — it is a picture until step 8 wires it | all of it |
| 1 tables | `mods`, `typecheck`. A row nothing reads cannot move a sim number | `demo`, `smoke` |
| 2 gathering | **`demo`** — it changes what a descent PAYS and what a seed replays | |
| 3 processing | `smoke` (a camp screen), `shots`. Camp-side only, so no descent moves | `demo`, unless a job touches a run |
| 4 crafting | `mods` (a currency still rolls), `demo` for the drop/craft split only | |
| 5 jewellery | `mods`, `shots`. Twenty rows and a tint; nothing in the sim | `demo` |
| 6 stat power | **`demo`** — the whole point is a number it asserts | |
| 7 cooking | `demo` only if a meal reaches a descent, which it does. `smoke` for the camp screen | |
| 8 gamble, filter out | `smoke`, `shots`, `drag` — screens and the rail | `demo`, unless selling moved |

**Build before `smoke`, `shots`, `drag` or `peek`** — they load the committed
`docs/app.js`, and running one against a stale bundle has already produced a
false "the fix does not work" once.

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

- **The named-piece check is thin.** 16 descents expects 5.5 and read 3; a zero
  is a 1-in-250 flake. Uniques are a share of drops like Perfect, and the count
  fell under them — either widen the sample or make it a `gauge()`.
- **Dialogue pass: cut the rambling qualifiers.** Never scheduled, never
  cancelled. Every `beats` line in `src/scenes/*` reads long.

---

## Traps that outlive the phase that found them

**Kept because they bite the NEXT thing, not because of what they came from.**

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
