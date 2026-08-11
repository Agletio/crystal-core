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

**A character will end up holding three skills**, one from each of three slots
— something that kills, something always on, something that moves you — and
`Character.skillId` is one field until Phase 5 changes it. Anything built
before then that assumes one skill is something Phase 5 has to undo, so prefer
`characterStats(character)` over reaching for `character.skillId` yourself.

**Balance is not a phase and not a blocker.** `RULES.md` says it plainly now:
nothing here is tuned until every system is in, because attributes, trades and
jobs each hand out more power than the last and anything tuned before them is
thrown away. Lean too easy. Measure, print, carry on.

Mana costs, the potions that answer running dry, and the attributes that scale
the pool have all landed. What is left of that idea is Phase 3, which turns
running dry from a wall into a penalty.

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

### Phase 1 — Two things the run screen gets wrong [user 1, user 2]

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

### Phase 2 — A badge on every tab holding points to spend [user 6]

**Half of this landed with attributes and the mechanism is built.**
`badge(buttonId, count)` in `src/ui/badge.ts` adds or removes a
`<span class="tabbadge">`, zero removes it entirely, `.tabbadge` in
`docs/index.html` is the circle, and `renderBadges()` in `src/ui/run.ts` is the
one place that recomputes — called from `refreshRunPanels()` and again from
`finish()`, where the level a descent bought lands. `#open-character` already
carries `attributePointsLeft(character)`, and `smoke.mjs` holds it to
appearing, counting down as points are spent, and vanishing at zero.

**What is left is the SKILLS side.** `pointsAvailable(progress)` in
`src/sim/character.ts` is the tree's spare points and is still only ever read
inside `src/ui/skills.ts`, so `#open-skills` says nothing.

**Why it is wrong.** A point nobody spends is a level that did nothing, and the
guided opening is the only thing that has ever told a player they have one.

- [ ] `renderBadges()` gains one line: `#open-skills` carries the ACTIVE
      skill's spare tree points. No second mechanism.
- [ ] It has to read at 390px, where the header already wraps to three rows —
      and with TWO badges up at once, which is the case attributes alone never
      produced. `npm run shots` is where that shows.
- [ ] A smoke check for the skills badge beside the ones the character button
      already has, including that it goes when the last point is allocated.

**What must not break.** `npm run shots` fails on overflow and the header is
the tightest row in the game. The demo's "every step points at an element that
exists" walks header ids and a badge must not become one of them.

### Phase 3 — Out of mana is a penalty, not a wall [user 5]

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
- [ ] The penalty is a `more` multiplier on DAMAGE and nothing else — not
      speed. Answered: scaling damage is meant to be a real answer to running
      dry, and it works against a damage penalty directly where it only works
      against a speed one sideways.
- [ ] **Build the penalty as a number something can later change, not as a
      constant read at the call site.** A job that stacks mana is planned —
      huge upside for solving mana, a bigger downside when you run out — so
      the starved multiplier has to arrive through one seam a grant can reach.
      Declare it in `src/sim/grants.ts` the way `manaMultiplier` is, give it a
      merge, and have the sim ask one function for the number. Getting this
      wrong costs that job a rewrite; getting it right costs a table entry.
- [ ] The character sheet's `mana/sec` row explains the dry swing in its own
      `why` text (`src/ui/character.ts`). It has to say the new rule instead,
      with the penalty's number in it.
- [ ] It is VISIBLE. The mana bar already turns rust when short of a cast
      (`.hp--dry`); a starved cast needs to read on the map or in the readout
      too, or damage silently halves for a reason nobody can see.
- [ ] Balance is not tuned (see `RULES.md`) — pick a generous placeholder,
      print what the calibration section measures, and move on.

**What must not break.** The `TERMINATION CHECK` holds a character with no pool
at all to finishing its descent; that check gets EASIER here, since it can now
always cast, but it still has to pass. `npm run demo`'s determinism check
replays a seed with the same presses and must still match.

### Phase 4 — The opening spends every point [user 3]

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
- [ ] **The first crystal's gate moves with it, and this is answered:**
      `crystalEarned` in `src/game/crystals.ts` becomes the active skill at
      `INTRO.crystalSkillLevel` with EVERY point of it spent —
      `pointsAvailable(progress) === 0` — instead of a notable allocated. The
      level gate is what stops one point at level 1 satisfying it. Nothing can
      dead-end: spending everything is always reachable.
- [ ] The step SUGGESTS a notable and never requires one. Its text can name the
      nearest one — `pathToNotable` in `src/skills-tree.ts` still answers that,
      so it stays — but the ring is the web and the `done` is the points. A
      player who spreads their points instead will meet a notable soon enough
      and work it out; being told what to build is what this removes.
- [ ] `hasNotable` may end up with no callers once the gate moves. If so it
      goes.

**What must not break.** `npm run guide` plays the whole opening with a real
pointer and is the only thing that proves a step is finishable; the demo walks
the same list headlessly with one hand-written action per step, and the step
count in `RULES.md` needs updating with it.

### Phase 5 — Three skill slots, and a skill to put in each [user 4]

**What is true today.** A character has ONE skill — `Character.skillId` —
and `characterStats(character)` resolves exactly that one. `SKILL_CATEGORIES`
in `src/data.ts` lists four kinds: spell, attack, passive, movement. Only the
first two have entries in `SKILLS`; the other two say "Nothing here yet" and
are empty. `src/ui/skills.ts` equips by writing `character.skillId`.

**Why it is wrong.** A character is one ability. The intended shape is three at
once — something that kills, something always on, and something that moves you
— and neither of the last two exists to be equipped.

- [ ] **Three slots, declared as a table** the way `EQUIP_SLOTS` and
      `RUN_SLOTS` are, never three named fields: a `main` slot accepting
      `spell` OR `attack`, a `passive` slot, a `movement` slot. One entry is
      how a fourth ever gets added.
- [ ] `Character.skillId` becomes that slot table's contents. `heal()` drops a
      slot naming a skill that no longer exists, and a save written before this
      puts its old `skillId` in `main` — the demo already holds every container
      to being healed.
- [ ] `characterStats` resolves the MAIN slot for damage, so every existing
      harness keeps meaning what it meant. The passive and the movement skill
      reach the sim as their own thing, not by being the skill that swings.
- [ ] **The passive:** critical hits deal NO extra damage; instead, landing one
      grants 40% more damage for 5 seconds. It is a TRADE, which is what makes
      it worth a slot. The mechanism already exists — `TimedEffect` on the hero
      from the potions phase — so this is an effect with a duration granted by
      a crit rather than by a flask, and `critMultiplier` reads as 0 while it
      is equipped. Its own line has to say both halves and both numbers.
- [ ] **The movement:** a blink. Teleports the hero a short distance on a short
      cooldown, to make crossing a map faster. It fires ITSELF — automation is
      universal (`RULES.md`), so the shipped policy is what `runToCompletion`
      runs: blink along the path you are already walking when it is off
      cooldown and the way is clear. It may not put a body inside rock —
      `RunSim.placeIn` and the `BODIES` demo section are what hold that.
- [ ] Both new skills need art the way every other does, and a tree is NOT
      required: `BUILT_TREES` is per skill and a skill with no web renders "no
      web yet" already.
- [ ] The welcome screen picks your first MAIN skill and says nothing about the
      other two; how you get those is the same question as where any skill
      comes from, and is not answered here.

**What must not break.** `npm run demo` builds characters in a dozen places
through `makeCharacter(equipment, skillId)`; that signature changing touches
`ladderCharacter`, the tutorial walkthrough and the sheet harness. `npm run
guide` equips a skill with a real pointer. The blink is a new way for a run to
end early or never end — `TERMINATION CHECK` is the one that would catch it.

### Phase 6 — Three icons, and the stats that belong to a skill [user 4]

**What is true today.** The run panel's readout begins with a `mana a swing`
row (`#run-mana-cost` in `docs/index.html`) directly under the xp bar. The
character sheet (`src/ui/character.ts`) mixes stats belonging to the CHARACTER
— life, armour, resistances, move speed, the mana pool and its regeneration —
with stats belonging to the SKILL it happens to resolve: the damage breakdown,
damage per second, crit chance and crit damage, casts or attacks per second,
mana per use, reach.

**Why it is wrong.** A sheet that mixes the two cannot answer either question,
and with three skills equipped (Phase 5) it cannot even be written down.

- [ ] The `mana a swing` row goes, and in its place — right under the xp bar —
      three skill icons, one per slot. `skillIcon(skillId, size)` in
      `src/ui/icons.ts` already draws one.
- [ ] HOVER gives the short version. CLICK opens the character sheet at that
      skill's own section.
- [ ] The sheet gains a section PER EQUIPPED SKILL holding everything only true
      of that skill: its damage breakdown, mana per use, damage per second,
      crit chance and crit damage, casts or attacks per second, reach. Those
      rows LEAVE the general stats, which keeps life, armour, resistances, move
      speed, regeneration, the mana pool and its regeneration.
- [ ] An empty slot says what it is for. A dark square teaches nothing.
- [ ] The sheet's right column now runs level → xp → skill line → ATTRIBUTES →
      Stats → Resistances. Attributes belong to the CHARACTER and stay where
      they are; the per-skill sections go below them.

**What must not break.** `npm run shots` renders the sheet and the run panel at
390px, where three icons and three sections are the tight fit; the sheet
harness in `src/demo.ts` checks every number on it survives being recomputed,
and it walks the rows.

### Phase 7 — Trades: the part of a character that is not the skill

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

### Phase 8 — Every monster brings its own element [user 10]

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

### Phase 9 — What a node does, shown and not overlapped [user 8]

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

Do not guess at these. **None of them blocks a phase** — the three that did
have been answered and are written into the phases above, so every phase in
this file is buildable today.

1. **What the Lampwright wants.** The trade phase needs a way to GET a trade,
   and the intent is a storyline with the Lampwright rather than a level
   threshold — he is the only person in the game and the only voice it has.
   Nothing about it is written: what he is doing down there, what he asks for,
   how many beats it runs, whether it hands out anything besides the trade.
   The phase ships a placeholder that the story replaces without touching the
   tree or the points, so this blocks the STORY and not the system.

2. **What the second trade is.** The Alchemist is designed, and a second is
   now half-designed: **a trade that stacks MANA** — a large upside for solving
   mana at all, and a bigger downside for running out, which is a rule change
   rather than a percentage. Phase 3 is built with that in mind: the starved
   damage penalty arrives through a declared grant so this trade can move it
   with a table entry rather than a rewrite. What it grants and what it takes
   away is still unwritten. The user calls these JOBS; this file calls them
   trades, and they are the same thing.
   Other candidates, all of which change a rule the game already has: crystals
   that level while carried rather than only while socketed; a descent that
   runs longer and pays per clear rather than per kill; danger that hurts less
   and pays less.

3. **What is the fifth socket?** Wanted as an endgame slot holding something
   that is not a crystal. Deliberately unspecified — the user wants to think
   about it. `RULES.md` says how to keep it cheap to add; nothing else may
   assume it.

4. **Is the Seam meant to be the hardest room, and is it?** `CLAUDE.md` said it
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

5. **The Cavern and the Fissure have no currency of their own.** Retiring the
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
