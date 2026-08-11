# Crystal Core — Roadmap

**The list of work, and nothing else.** Everything that is always true lives in
`RULES.md`; the game as it stands is `CLAUDE.md`. If a thing here is not a task
or something you need in order to do one, it is in the wrong file.

Do the lowest-numbered phase that is not blocked on an open question, all of it,
then delete it from here and renumber. Numbers in a phase are intent, not
tuning — a measurement beats them. A landed phase is DELETED from here, so
before starting one, `git fetch` and check you are on the tip of the branch:
a phase you can still see in a stale clone may already be built.

**Where these came from.** Two batches of asks, dictated by the user in one go
each. The number in brackets is the user's own numbering within its batch, kept
so a phase can be matched back to the ask — it says nothing about when to build
it. They are listed in DEPENDENCY order, not in the order they were asked for.

**Balance is not a phase and not a blocker.** `RULES.md` says it plainly now:
nothing here is tuned until every system is in, because attributes, trades and
jobs each hand out more power than the last and anything tuned before them is
thrown away. Lean too easy. Measure, print, carry on.

Three of them are one idea in three landable pieces — mana costs, then the
potions that answer running dry, then the attributes that scale the pool — and
each leaves the game playable on its own.

---

## Phases

**Writing one.** The test is whether a session with no memory of this
conversation could execute it. That takes four things, and the second is the one
usually missing:

1. **What is true today**, named in code — the constant, the function, the file.
   "The shop sells too much" is not executable; "`RECIPES` in `src/data.ts` has
   eleven entries and should have one" is.
2. **Why it is wrong**, in one sentence a stranger would agree with. Without
   this the next session optimises the wrong thing correctly.
3. **Checkboxes that are decisions**, not tasks. "Border by base tier: white
   t1, blue t2, yellow t3" can be done wrong and caught; "improve the tooltip"
   cannot.
4. **What must not break**, and which harness proves it.

Anything you are unsure about goes in Open questions, never into a phase as an
assumption. A phase that guesses is a phase that has to be undone.

### Phase 1 — The harnesses report balance instead of failing on it

**What is true today.** `src/demo.ts` asserts difficulty and reward TARGETS
with `check()`, so a phase that moves one fails the suite: the deep end has to
be a third or less (`through <= deep / 3`), a naked character has to walk out
of the Fissure under 70% life, every band has to clear in the band below's
gear, the Seam has to sit within 15% of the hardest single world, and a bare
skill has to spend between 5% and 50% of its swings unable to pay for itself.

**Why it is wrong.** `RULES.md` now says balance is not tuned until every
system is in, because each one still to land hands out more power than the
last. A check that fails on a number nobody is tuning is a check that stops
work for no reason — it has already blocked one phase.

- [ ] Every check asserting a TARGET becomes a `line()` that prints the number.
      The list is above; `grep "check(" src/demo.ts` around `THE LADDER`,
      `FAMILIES`, `MANA` and `WHAT A BAND IS WORTH` finds them.
- [ ] The numbers keep being printed, and printed in the same place, so a
      balance pass later has a before and an after to read. Deleting the
      measurement is the one wrong answer.
- [ ] **One survives as a `check()`:** a brand new character clears the bare
      Fissure. A game you cannot start is not a balance question.
- [ ] Everything asserting a MECHANISM stays a `check()` and is not touched —
      termination, determinism, every step completing, ids existing, every
      modifier doing something, saves healing, geometry.
- [ ] The demo's last line still counts only real failures, so `✓ every check
      passed` keeps meaning what it says.

**What must not break.** `npm run demo` has to stay green and stay honest: a
suite that passes because it stopped asking is worse than one that fails. The
count of checks will drop; say by how many in the commit.

### Phase 2 — Character level buys attributes [user 7]

**Potions landed first, and they moved the floor.** Every number below that
compares against "today" was measured with the flasks firing themselves, which
is what `runToCompletion` now does: naked level 1 is 24/24 at 57% life, the
blank-crystal rung is 22/24, the bands are 12/12/12/12/12/11 and the deep end
is 3/12. Mana costs `MANA.costPerSecond` a second bare, and a level 1 spends 0%
(Strike) to 17% (Blight) of its swings unable to pay.


**What is true today.** `character.level` (`src/sim/character.ts`) does almost
nothing: it scales the skill's own base damage through `skillBase(skill,
level)` and `LEVELLING.damagePerLevel`, and it sets the shop's stock level.
Everything else a character IS comes off gear and the tree — `characterStats`
in `src/sim/stats.ts` builds `CombatStats` from those two and nothing else.
There are no attributes.

**Why it is wrong.** Levelling is the most common thing a player does and the
thing that changes least.

- [ ] Four attributes: **Strength**, **Intelligence**, **Dexterity**,
      **Acuity**.
- [ ] Strength gives % attack damage and life. Intelligence gives % spell
      damage and mana. Dexterity gives attack critical chance and attack
      speed. Acuity gives spell critical chance and cast speed. Granularity is
      per 5 points, so the numbers can be generous and a build can pile them
      up; the exact rates are tuning and a measurement beats them.
- [ ] A **set number of points per level**, ALLOCATED by the player on the
      character sheet. Spent points are saved, and `heal()` replays them
      against the level that paid for them the way tree points are replayed —
      a level curve that moves must not leave a character holding points no
      level ever granted.
- [ ] They land in `characterStats` beside gear and the tree, under the stat
      names the modifier engine already has, so nothing downstream learns a new
      concept.
- [ ] The sheet shows each attribute, what it is buying in numbers, and how
      many points are unspent. An unspent point is visible from outside the
      sheet, or nobody spends them.
- [ ] Whether `LEVELLING.damagePerLevel` survives: a level that buys attributes
      AND scales the skill's base is paying twice. Decide, and say which.

**What must not break.** The ladder harnesses build characters with
`ladderCharacter` in `src/sim/loadout.ts`; attributes move every number they
print, and the retune that set them was a phase of its own. Measure before and
after, and give `ladderCharacter` a spread so a measured character is not a
character with no attributes at all.

**ANSWERED, and it is 3 points a level.** The phase was blocked on the deep
end: `RULES.md` used to require the hardest set in the game to stay a wall — a
third or less gets through — and measured over 36 runs it was already at 31%
before attributes existed. Three points a level puts it at 39%. The user's
answer is that **balance is not tuned at all** until every system is in, so
that target is suspended and this phase does not have to hold it. Build it at
3 points a level and PRINT what the deep end does.

**MEASURED, so nobody derives it twice.** With `LEVELLING.damagePerLevel` set
to 0 and a spread character (points split four ways by `ladderCharacter`), at
5% damage / 2% life / 2% speed / 0.6 crit per step:

| points a level | deep end, 36 runs | bands, 12 each |
|---|---|---|
| none (before this phase) | 31% | 12/12/12/12/12/11 |
| 1 | 33% | — |
| 2 | 36% | 12/12/12/12/12/12 |
| **3** | **39%** | 12/12/12/12/12/12 |

Dropping `damagePerLevel` does NOT make room: the deep end is survival-limited
rather than damage-limited, so what softens it is the life, the speed and the
crit rather than the damage.

**The groundwork was built once and reverted rather than half-landed.** It is
about forty lines and none of it is hard — rebuild it rather than hunting for
it:

- `ATTRIBUTES` / `ATTRIBUTE_STEP` / `ATTRIBUTE_BY_ID` in `src/data.ts`, each
  attribute holding `per: StatRoll[]` — what ONE step is worth, in ordinary
  stat lines under names the engine already reads. `StatRoll` has to be added
  to data.ts's type import.
- `LEVELLING.attributePointsPerLevel = 3`, and `ATTRIBUTE_STEP = 5` points to
  a step, so a step is bought over a level and a bit.
- `Character.attributes: Record<string, number>` in `src/sim/character.ts`,
  `{}` from `makeCharacter`, plus `attributePointsFor(level)`,
  `attributesSpent`, `attributePointsLeft` and `attributeSteps(character, id)`
  (which FLOORS: a part-step buys nothing yet).
- `attributeMod(character)` in `src/sim/stats.ts` building ONE synthetic
  `RolledMod` exactly the way `treeMod` does, and `statMods` returning it
  beside the tree's. Nothing downstream learns a new concept.
- `heroStats` passes `skill.tags` into the `critChance` `computeStat`, which is
  what makes an ATTACK critical-chance line do nothing for a spell. It is the
  same seam `areaOfEffect` already rides on, and untagged gear lines are
  unaffected.
- `ladderCharacter` in `src/sim/loadout.ts` splits the points four ways.

The rates that were measured, as a starting point rather than a target: 5%
increased damage tagged `['attack']` and 3% increased life for Strength; 5%
tagged `['spell']` and 6% mana for Intelligence; 0.6 flat critical chance
tagged `['attack']` and 2% attack speed for Dexterity; the same tagged
`['spell']` with cast speed for Acuity.

### Phase 3 — Two things the run screen gets wrong [user 1, user 2]

Two unrelated one-screen fixes, both small, both about the screen showing you
the wrong thing. Do them together.

**Keep going is not a choice.** `docs/index.html` has a `.keepgoing` label
holding `<input type="checkbox" id="run-repeat" checked>` beside Enter the
Fissure; it writes `GameState.autoRepeat`, which `looping()` in
`src/ui/run.ts` reads (`game.autoRepeat && !isGuided()`). Chaining descents is
what this game IS, and the two buttons that stop it — **Leave after this run**
and **Abandon** — already cover every way you might want out. A checkbox
offering to make the idle game not idle is a decision nobody needs.

- [ ] The checkbox and its label go from the markup, and `run-repeat`'s
      `onchange` handler goes from `initRun`.
- [ ] `looping()` becomes `!isGuided()`. The guided opening still suppresses
      chaining, which is deliberate: its later steps are written against a
      report that is still on screen.
- [ ] `GameState.autoRepeat` goes, and `heal()` needs nothing — a field a save
      still carries is simply never read again.
- [ ] `grep -rn autoRepeat src smoke.mjs` finds every reader. `smoke.mjs` and
      `src/demo.ts` both touch it.

**A tooltip is the top layer.** `.tip` in `docs/index.html` sits at
`z-index: 40`. The guide card is 50, the item menu 95 and the toast 96, so the
thing explaining what you are looking at is UNDER the thing telling you to
click it. On the skills web this is at its worst: the guided opening rings a
node and its own card covers the tooltip naming it.

- [ ] `.tip` goes above everything the app can put on screen. It is
      `pointer-events: none`, so nothing can be trapped behind it.
- [ ] Check it against the item menu (right-click a dock slot), the toast (equip
      by drag), the guide card, and a modal — the tooltip has to win all four.
- [ ] `npm run shots` renders a tooltip at two viewports and is where a
      regression would show.

**What must not break.** `npm run smoke` drives the checkbox today; `npm run
guide` clicks through the opening with a real pointer and would notice a
tooltip that started swallowing clicks.

### Phase 4 — A badge on every tab holding points to spend [user 6]

**What is true today.** Unspent points are invisible from outside the screen
that spends them. `pointsAvailable(progress)` in `src/sim/character.ts` is the
tree's spare points and is only ever read inside `src/ui/skills.ts`;
`attributePointsLeft(character)` (Phase 2) is the same for attributes and is
only read on the sheet. The header buttons — `#open-skills`, `#open-character`
in `docs/index.html` — say nothing.

**Why it is wrong.** A point nobody spends is a level that did nothing, and the
guided opening is the only thing that has ever told a player they have one.

- [ ] A small badge on a header button when that screen has something to spend:
      a circle with the COUNT in it, top-right of the button. `4` rather than
      `!` — every number is said out loud.
- [ ] Skills carries the ACTIVE skill's spare tree points. Character carries
      unspent attribute points.
- [ ] One mechanism, not two: a `badge(buttonId, count)` helper that adds or
      removes a `<span class="tabbadge">`, and one place that recomputes both.
      `refreshRunPanels()` in `src/ui/run.ts` is called after everything that
      could change them.
- [ ] Zero shows NOTHING at all — a badge reading 0 is a permanent nag.
- [ ] It has to read at 390px, where the header already wraps to three rows.

**What must not break.** `npm run shots` fails on overflow and the header is
the tightest row in the game. The demo's "every step points at an element that
exists" walks header ids and a badge must not become one of them.

### Phase 5 — Out of mana is a penalty, not a wall [user 5]

**What is true today.** `RunSim.swing` in `src/sim/run.ts` pays
`hero.stats.manaCost` and, short of it, casts `DRY_SKILL` instead — a
single-target swing at `MANA.dryDamage` (half) of your damage with NONE of the
tree behind it. `DRY_SKILL` is in `src/data.ts` and its behaviour `dry_swing`
is in `src/sim/skills.ts`. `RunState.dryCasts` counts them.

**Why it is wrong.** Being unable to cast your own skill deletes the build you
walked to, which makes mana a wall rather than a cost. It should be a downside
you may simply choose to ignore: run dry, hit softer, and answer it by scaling
damage instead of by scaling sustain if that is the build you want.

- [ ] The dry swing goes. You ALWAYS cast your own skill, with every grant the
      tree gives it — `DRY_SKILL`, `dry_swing` and `MANA.dryDamage` are
      deleted, not left unreferenced.
- [ ] Short of the cost you are **starved**: mana drains to 0 and the cast
      happens anyway, at a penalty. `RunState.dryCasts` keeps its meaning —
      casts made while starved — and so does the demo's calibration section.
- [ ] The penalty is a `more` multiplier on damage, so more damage from
      anywhere genuinely overcomes it. **See open question 3 for whether it is
      also a speed penalty; do not guess.**
- [ ] It is VISIBLE. The mana bar already turns rust when short of a cast
      (`.hp--dry`); a starved cast needs to read on the map or in the readout
      too, or damage silently halves for a reason nobody can see.
- [ ] Balance is not tuned (see `RULES.md`) — pick a generous placeholder,
      print what the calibration section measures, and move on.

**What must not break.** The `TERMINATION CHECK` holds a character with no pool
at all to finishing its descent; that check gets EASIER here, since it can now
always cast, but it still has to pass. `npm run demo`'s determinism check
replays a seed with the same presses and must still match.

### Phase 6 — The opening spends every point [user 3]

**What is true today.** `TUTORIAL_STEPS` in `src/ui/tutorial.ts` has two tree
steps. `spend_point` rings ONE specific node — `towardNode` walks you into
Skills, down two shelves, and points at `pathToNotable(...)[0]` — and is done
when `allocated.length > 0`. `take_notable` then sleeps (`waits`) until the
skill can afford the run of nodes to a notable, wakes, and rings them one at a
time until `hasNotable(...)` is true. The first crystal is gated on exactly
that: `crystalEarned` in `src/game/crystals.ts` wants
`INTRO.crystalSkillLevel` AND a notable allocated.

**Why it is wrong.** By the time the opening reaches Skills the character is
usually skill level 2, so a step that ends at one point spent leaves a point
unspent and teaches that unspent points are normal. Ringing one particular node
also tells the player what to build, which is the one decision the tree exists
to hand them.

- [ ] One step, not two: spend EVERY point you have. Done when
      `pointsAvailable(progress) === 0`.
- [ ] It rings the web rather than a node — the player picks. `npm run guide`
      clicks only what is lit, so whatever it rings has to be something the
      harness can click into a real allocation; a region gets its first live
      control, and `.web__node--open` is what a free point makes clickable.
- [ ] Nothing on the main screen is held while it runs.
- [ ] **The first crystal's gate has to move with it — see open question 2.**
      Spending three points on three minors leaves you with no notable, so as
      written the crystal would never arrive and the opening would sleep
      forever on `meet_crystal`. Do not build this half.
- [ ] `pathToNotable` in `src/skills-tree.ts` may end up with no callers. If so
      it goes, unless the answer to question 2 keeps it.

**What must not break.** `npm run guide` plays the whole opening with a real
pointer and is the only thing that proves a step is finishable; the demo walks
the same list headlessly with one hand-written action per step, and the step
count in `RULES.md` needs updating with it.

### Phase 7 — Three skills, three icons, and stats that belong to a skill [user 4]

**What is true today.** A character has ONE skill: `Character.skillId`, and
`SKILL_CATEGORIES` in `src/data.ts` lists four kinds — spell, attack, passive,
movement — of which the last two say "Nothing here yet" and have no entries in
`SKILLS`. The run panel's readout begins with a `mana a swing` row
(`#run-mana-cost`) directly under the xp bar. The character sheet
(`src/ui/character.ts`) mixes stats that belong to the CHARACTER (life, armour,
resistances, move speed, mana pool and regeneration) with stats that belong to
the SKILL you happen to have equipped (damage, damage/sec, crit chance and
damage, casts or attacks per second, mana per use, reach).

**Why it is wrong.** A sheet that mixes the two cannot answer either question,
and the moment a character carries more than one skill it cannot even be
written down.

- [ ] The `mana a swing` row goes, and in its place — right under the xp bar —
      three skill icons: your main skill, your passive, your movement.
      `skillIcon(skillId, size)` in `src/ui/icons.ts` already draws one.
- [ ] HOVER gives the short version. CLICK opens the character sheet at that
      skill's own section.
- [ ] The sheet gains a section per equipped skill holding everything that is
      only true of that skill: the damage breakdown that is on it today, mana
      per use, damage per second, crit chance and crit damage, casts or attacks
      per second, reach. Those rows LEAVE the general stats, which keeps life,
      armour, resistances, move speed, regeneration, the mana pool and its
      regeneration.
- [ ] **Whether passive and movement are real slots or two empty ones — see
      open question 4.** If they are real, this phase grows a way to equip
      three skills and `characterStats` grows a skill argument; if they are
      placeholders, the two icons draw empty and say what will go there.
- [ ] An empty slot says what it is for. A dark square teaches nothing.

**What must not break.** `characterStats(character)` resolves ONE skill today
and every harness calls it; `damageDetail` and `skillBase` are per skill
already. `npm run shots` renders the sheet and the run panel at 390px, where
three icons and a per-skill section are the tight fit.

### Phase 8 — Trades: the part of a character that is not the skill

**What is true today.** Every scrap of build identity in this game belongs to
the SKILL. `BUILT_TREES` is one tree per skill, allocated per skill
(`character.skills[skillId].allocated`), funded by that skill's own level
through `treePointsFor` and capped at `MAX_TREE_POINTS = 30`. Change from
Strike to Blight and the whole of what your character was is gone. Character
level funds attributes and nothing else; gear and crystals are things you find
rather than things you chose to become.

**Why it is wrong.** Nothing about a character persists across the one choice
the game most wants you to experiment with, and there is no reason to keep a
character rather than start another — which is a strange thing to be true the
week three save slots landed.

**The shape, and why it is a SEPARATE tree.** On one tree, "specialist
identity" and "generic stats" compete for the same points, so the play is to
beeline the cheapest path to the payoff and take whatever is on the way. Two
trees cannot be compared, so the identity is chosen on taste and the stats on
arithmetic. That is the entire mechanism, and it means **trade points must be
their own currency** — fund them from skill points and the beeline is back.

A trade is not a class: every skill, every attribute and every piece of gear
stays available to every trade. The word is the world's own — the only person
in the game is named for his trade — and it carries none of the rigidity.

- [ ] A trade tree is **20 nodes: 10 that matter and 10 travel**, roughly
      alternating, and a character has **10 points** — so half the tree, and
      about five of the big ones. Smaller and denser than a skill tree, which
      is 30 points over a much wider web.
- [ ] **1 point every 5 character levels**, capped at 10 — so a full trade is a
      character at level 50. This is the second job character level has and the
      first one that is a choice.
- [ ] **Every trade changes a RULE, not a number.** A trade that hands out
      percentages competes with the others on percentages and one of them wins;
      a trade that changes what is POSSIBLE cannot be compared to another one.
      This is the rule the whole system lives or dies on. `GRANTS` in
      `sim/grants.ts` is already a table of switches rather than numbers and a
      trade hands them out the same way a node or a unique does — declared,
      read by something, and paid for.
- [ ] **One trade is enough to ship this.** The framework is what is expensive,
      and one good trade beats six thin ones — a second only lands with it if
      one has been designed by the time this phase is taken. The first is the
      **Alchemist**: potions
      stop being a safety net and become the character's engine — they carry
      buffs, they refresh themselves, and charges come back during a descent,
      so a potion is a cooldown rather than a budget. What the buff DOES is
      specialised inside the tree (fire, projectiles, critical, whatever the
      nodes offer), and the real decision inside it is UPTIME: magnitude
      against duration against how fast charges return. Stack magnitude and you
      get windows of enormous power between dry spells; stack regeneration and
      you are permanently a little better. Same points, different characters,
      and a harness can measure both.
- [ ] Trade grants reach the sim through `treeGrants` in `src/sim/stats.ts`,
      which already merges the tree with what is worn. A third source is a
      third argument, not a new concept.
- [ ] Allocation goes through `canAllocate` and is REPLAYED by `heal()` the way
      skill trees are, so a reshaped trade refunds its points rather than
      leaving a build nobody could have walked to. Node ids take a `prefix` no
      other tree uses — a save points at them.
- [ ] Whether `TreeSpec`/`buildTree`/`layout.ts` bend to a 20-node tree or a
      trade gets a sibling of them. `buildTree` currently REFUSES anything that
      is not six branches and six trunk notables, so one of those two things
      has to give. Either way the demo's geometry rules apply unchanged: no
      link crosses another, and none passes under a node it does not join.
- [ ] Changing trade is allowed, at a price. Everything else in this game is
      forgiving — `heal()` refunds what a reshaped tree stranded, allocations
      are replayed rather than trusted — and a hard lock would be the only
      unforgiving thing in it.
- [ ] **How you GET a trade is a placeholder and is marked as one.** It is
      meant to come out of a storyline with the Lampwright that does not exist
      yet — see the open question. Until it does, you pick when you earn the
      first point, and the story replaces the ACQUISITION without touching the
      tree, the points or the allocation.

**What must not break.** A trade that changes rules moves every ladder number
in `src/demo.ts`, and `ladderCharacter` in `src/sim/loadout.ts` builds the
characters those harnesses measure — decide what trade a measured character has
before reading anything into the numbers. The demo already holds every tree to
its geometry and every grant to being declared and read; a trade tree that
skips those checks is a tree nobody is checking.

### Phase 9 — Every monster brings its own element [user 10]

**What is true today, and it is not what it looks like.** One crystal modifier
does the whole job. **"of Cinders"** (`monster_fire` in `src/data.ts`) rolls
`monsterFire` at +35–75% on its cheap tier and +225–375% on its ilvl 40 tier,
and `monsterStats` in `src/sim/stats.ts` reads it like this:

```
const fire = percentStat(mods, 'monsterFire');
const dealt = computeStat(damage, mods, 'monsterDamage') * (1 + fire / 100);
const type = fire > 0 ? 'fire' : 'physical';
```

So it is a CONVERSION with a damage bonus welded to it: any amount at all flips
every monster on the map from physical to fire, and the number is how much more
damage they do while doing it. One type for the whole map, decided by the
crystal. Nothing else in the game deals anything but physical — and because a
ward is one type and caps at `DEFENCE.resistanceCap`, one fire ward turns that
entire modifier off.

Ranged monsters share one skill: `MONSTER_RANGED_SKILL = 'bolt'`, a monster-only
`SkillDef` with no `category` so it never reaches the Skills screen, and
`RANGED_PACK_CHANCE` decides whether a pack carries it.

**Why it is wrong.** A monster's element belongs to the monster, not the room,
and a danger modifier that one ward switches off entirely is a modifier that is
either free or fatal with nothing in between.

- [ ] A TABLE of monster abilities, each with its own damage type, and a
      monster rolls one at spawn off the run's own rng. Three to start: a fire
      bolt (the look it has now), a frost bolt (blue-white, icy) and a
      lightning arc (a strike that chains).
- [ ] The ability's type is what that monster deals. `MONSTER_RANGED_SKILL`
      becomes the table, and the melee monsters get their entry too rather than
      being physical by definition.
- [ ] `monster_fire` stops CONVERTING. It becomes **added damage of a type**:
      a share of what a monster already hits for, dealt as fire on top. You can
      then stack it and armour yourself against it — and because it is on top
      of the monster's own element, you still need some defence against the
      rest, which is the whole point of the change.
- [ ] Whether the other elements get their own map modifier beside Cinders, or
      one modifier rolls which element it adds. Either is defensible; pick one
      and say why.
- [ ] `DANGER_STATS` re-reads it. `monsterFire` is weighted `0.9` today as a
      convert-everything mod; as added damage it is worth something else, and
      danger is what every reward is derived from.
- [ ] The arc chains, so it needs a `vfxKind` both renderers draw — the sim
      already emits `points` for a shape, which is what a chain is.
- [ ] The results overlay splits damage taken by type already and will show
      three where it showed one. That is the point; check that it reads.

**What must not break.** `npm run demo` measures what a monster hits for
against what its stats say, across every rank and the finale, and it holds
`DEFENCE.monsterHitFloor` — a quarter of every hit lands whatever the wards do.
Three elements against per-type resistances moves every ladder number: measure.

### Phase 10 — What a node does, shown and not overlapped [user 8]

**What is true today.** A tree node hands the sim switches out of `GRANTS`
(`src/sim/grants.ts`), and `mergeGrants` folds two nodes granting the same key
by a declared rule. What it does NOT do is notice that two nodes change the
same thing in incompatible ways: Blight's `bl_rupture` turns the cast into a
HIT that bursts, while the rest of its tree is about the poison cloud, and
`bl_transmutation` changes the damage type under both. Nothing says what
happens when you take them together, and the player cannot tell either.

Strike's `st_whirlwind` grants `splashMultiplier: 1, splashRadius: 1.25` — the
swing now hits everything in reach for full — and the animation is the same
`slash` it was before, so a hitbox that grew by a quarter is invisible.

**Why it is wrong.** A point spent on something you cannot see, on a
combination nobody has decided the meaning of.

- [ ] Every skill's changing nodes are audited in PAIRS, per tree, and the
      result is written down: what each combination does. That written list is
      the phase's real output.
- [ ] Combinations that have no coherent answer are BLOCKED from being taken
      together, and the node says why on its own card — "cannot be taken with
      Rupture" is a decision the player can act on; a silently ignored point is
      not. `canAllocate` in `src/skills-tree.ts` is where a refusal lives.
- [ ] A demo check that the block holds, and that no PAIR of allocatable nodes
      is left un-audited, so a new node cannot quietly add a new combination.
- [ ] Strike's sweep gets an animation that shows its actual reach — the arc
      the hitbox now covers, not the old slash. `vfxKind` picks the shape and
      both renderers draw it.

**What must not break.** Tree allocations are REPLAYED through `canAllocate` on
every load (`heal()` in `src/game/save.ts`), so a new refusal retroactively
refunds points in saves that already spent them. That is the intended
behaviour, not a bug — but it means a wrong refusal costs every player their
build, so the demo has to prove the block only catches what it means to.

---

## Open questions

Do not guess at these. **Questions 1 and 2 block Phases 6 and 7**; nothing else
blocks anything. Every phase before those is buildable today.

1. **What gates the first crystal once the opening stops pointing at a
   notable?** Phase 6 replaces "take this node" with "spend every point", and a
   player can spend three points on three minors and own no notable — at which
   point `crystalEarned` in `src/game/crystals.ts` is never satisfied, the
   Lampwright never comes, and the opening sleeps on `meet_crystal` forever.
   Three answers:

   - **Points spent** rather than a notable: the skill at
     `INTRO.crystalSkillLevel` with every point of it spent. Closest to what
     the opening now teaches, and it cannot dead-end.
   - **Skill level alone.** Simplest; the tree stops being part of the price.
   - **Keep the notable** and let the opening come back a third time when one
     is affordable, which is the dormancy mechanism doing what it is for — but
     it is the "take THIS node" step the phase is trying to remove.

2. **Are passive and movement real skill slots, or two empty ones?** Phase 7
   draws three icons and there is only one skill on a `Character`, no passive
   or movement skills in `SKILLS`, and both categories say "Nothing here yet".
   Either the phase is a UI change over one real skill and two placeholders
   that say what will go there, or it is the system that lets a character equip
   three skills at once — `Character.skillId` becomes a slot table,
   `characterStats` takes which skill it is resolving, and every harness that
   builds a character changes with it. The second is several times the first.

3. **What being starved of mana costs.** Phase 5 makes running dry a penalty
   rather than a wall. Less damage, slower casting, or both? Damage alone is
   the cleanest answer to what was asked — "scale more damage to overcome the
   downside" works directly against a damage penalty and only indirectly
   against a speed one — but both is defensible and reads more like exhaustion.

4. **What the Lampwright wants.** The trade phase needs a way to GET a trade,
   and the intent is a storyline with the Lampwright rather than a level
   threshold — he is the only person in the game and the only voice it has.
   Nothing about it is written: what he is doing down there, what he asks for,
   how many beats it runs, whether it hands out anything besides the trade.
   The phase ships a placeholder that the story replaces without touching the
   tree or the points, so this blocks the STORY and not the system.

5. **What the second trade is.** The Alchemist is designed. The framework phase
   asks for two, and the rule the second has to clear is the same one: it
   changes what is POSSIBLE rather than by how much. Candidates, all of which
   change a rule the game already has: crystals that level while carried rather
   than only while socketed; a descent that runs longer and pays per clear
   rather than per kill; danger that hurts less and pays less. None is picked.

6. **What is the fifth socket?** Wanted as an endgame slot holding something
   that is not a crystal. Deliberately unspecified — the user wants to think
   about it. `RULES.md` says how to keep it cheap to add; nothing else may
   assume it.

7. **Is the Seam meant to be the hardest room, and is it?** `CLAUDE.md` said it
   was, off a check reading 6 seeds. Measured over 24, the Seam sits **0.7%
   BELOW** four Demonic crystals on damage taken per second, and with mana
   removed entirely it is only 2.0% above — so the ordering was always inside
   the noise rather than a thing the game does. The cause is structural: the
   Seam takes exactly two crystals of each world, so only half its packs carry
   a Demonic aura and half a Prismatic one, where four Demonic crystals put an
   aura in every pack. Making it genuinely worst means changing what the
   composition does — both auras on one pack, or a Seam-only carrier — which is
   a balance decision rather than a measurement. The gap also MOVES several
   percent either way whenever anything in the sim changes — mana shifted it,
   potions shifted it back — so the demo PRINTS the margin rather than asserting
   an ordering, and `CLAUDE.md` says it is an open question rather than a claim.
   Nothing is blocked on it: it is a balance answer, and balance waits.

8. **The Cavern and the Fissure have no currency of their own.** Retiring the
   quality ladder took `sigil_of_refinement` with it, which was Prismatic's
   exclusive, and nothing replaced it. Today `sigil_of_upheaval` is gated to
   Demonic and `sigil_of_finality` to the Seam; the other two worlds are gated
   to nothing. `RULES.md` says a world should have a reason to be entered, and
   every world now has uniques of its own — the Fissure two — so this may
   already be paid. **Provisional, and mine, not the user's:** left as it is
   rather than inventing a gate. Ask before gating an existing currency to the
   Cavern; it would make a staple zone-locked.

---

## Backlog

Real, deferred by decision. Not a queue — do not promote one into a phase
without being asked.


- **Jewellery has three rungs but no implicit.** `amulet`/`jade_amulet`/
  `onyx_amulet` and `ring`/`silver_band`/`gold_band` differ in exactly one
  way: how many modifiers they hold. That is the clearest statement of what a
  base tier is, and it is also the least interesting pair of slots in the
  game. Implicits for them would fix that; they are a balance change, so not
  in a phase about capacity.
- **Fewer items per clear.** Measured before the tooltip and shop work: gear
  is rolled per KILL at `gearChance × yield × (1 + rarity/200)`, roughly **two
  to eleven pieces a clear** across the bands. The plan was to halve that and
  gate the three armour tiers behind power thresholds, so quantity resets down
  each time quality steps up, with gold per clear held flat across a
  threshold — crossing one must never read as a demotion.
  **The two things it was waiting on have landed.** Base tiers now gate
  themselves through item level, tooltips are readable, and Sell mode plus
  buy-back mean a heap of drops is a few clicks rather than a chore. So the
  question is now answerable rather than deferred: play it, and if it still
  feels like too much, measure the rate before changing it.
- **The opening can skip the haul step.** `take_haul` is satisfied when the
  haul is empty, and a first descent drops gear at 5% a kill — so about a
  third of the time there is nothing to take and the step the opening exists
  to teach is silently skipped. `npm run guide` passes either way, which is
  the part that makes it worth writing down. The fix is probably a guaranteed
  first drop rather than a change to the step.
- **No per-item "keep" rule for the haul.** Every drop goes to the haul and
  triage is manual. A filter that hides a drop is the kind of thing you only get
  right once you know what a good drop looks like — and now that uniques drop,
  the answer has moved.
- **Blight and Strike are not the same game.** Last measured, Blight cleared
  the top of the ladder 12/12 where Strike managed 3/12. That number is OLD —
  it predates the capacity rework, the retune and everything since — so
  re-measure before acting on it.
- More tutorial steps for systems added since the opening was written: the
  collection screen, the bench's crystals column, sell mode, the counter.
- **A third way to get rid of a piece.** Selling is now a mode with a buy-back
  behind it, which is enough that this is no longer urgent — but everything
  still ends at the same counter, and a game where the only verb is "sell" has
  one verb.
- Four-frame walks for the bestiary, if the creatures ever grow legs worth
  animating.
- **A drawn recovery frame per creature.** They have one `attack` grid each and
  hold it for the whole swing. The hero does not — `poseOf` indexes
  `SWING_POSES` by how far through the swing the entity is — so the fix is that
  same treatment plus 21 more grids in `src/render/bestiary.ts`.
