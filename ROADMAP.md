# Crystal Core — Roadmap

**The list of work, and nothing else.** Everything that is always true lives in
`RULES.md`; the game as it stands is `CLAUDE.md`. If a thing here is not a task
or something you need in order to do one, it is in the wrong file.

Do the lowest-numbered phase that is not blocked on an open question, all of it,
then delete it from here and renumber. Numbers in a phase are intent, not
tuning — a measurement beats them. A landed phase is DELETED from here, so
before starting one, `git fetch` and check you are on the tip of the branch:
a phase you can still see in a stale clone may already be built.

**Where these came from.** Ten asks, dictated by the user in one go, and the
six questions they raised have been answered — so these eleven phases are all
unblocked, and they are listed in dependency order. The number in brackets is
the user's own numbering of what they asked for, kept so a phase can be matched
back to the ask — it says nothing about when to build it.

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

### Phase 1 — The first crystal is earned with a notable [user 6]

**What is true today.** `giftWaiting` in `src/game/crystals.ts` schedules the
first crystal off `INTRO.firstCrystalClear = 2` — the second cleared descent —
and `LAMPWRIGHT.level = 2`, so it arrives already holding one modifier slot,
with a `shard_of_making` beside it and `INTRO.scriptedMod` forced into it. The
guided opening runs straight through: `descend`, `again`, `meet_crystal`,
`bench_crystal`, `craft_crystal`, `socket`, fifteen steps end to end.

Tree points come from the SKILL's level, not the character's:
`treePointsFor(p.level)` in `src/skills-tree.ts`, and `addSkillXp` gives the
active skill the same XP the character gets. **The cheapest notable in every
tree costs exactly 3 points** — measured: `st_rend`, `fb_detonation` and
`bl_rupture` are all 3 — so skill level 3 buys a first notable and nothing
earlier does.

A crystal's LEVEL is its modifier capacity: `CRYSTAL_LEVELS` gives level 1 zero
slots, level 2 one, level 3 two, level 4 three. `xpForClear` levels a socketed
crystal, and level 2 costs 5 xp — one cleared descent at any danger.

**Why it is wrong.** The crystal arrives because you cleared twice, which is a
number nobody is looking at. It should arrive because you did the thing that
makes a character feel like a build — took your first notable.

- [ ] The first crystal is scheduled on the first cleared descent AFTER the
      active skill has reached level 3 AND a notable is allocated in its tree.
      Both: the level buys the point and the allocation spends it.
- [ ] It is a **level 1** crystal, which holds NO modifiers. It is socketed
      blank, and the descent it makes longer is the whole of what it does at
      first — which is also the honest lesson about what a level is.
- [ ] A step gains `waits`: true while it cannot be reached yet. A waiting step
      hides the card, drops the lockdown and advances nothing — the guide is
      DORMANT rather than stuck, which is the whole of "no popup purgatory".
      `npm run guide` reads the card being hidden as FINISHED, so dormancy has
      to be visible from outside it (a `data-` attribute on `body`, say) or the
      harness will report the opening as over the moment it lets go.
- [ ] The order changes: the crystal arrives BLANK, so it is socketed first and
      crafted later. `meet_crystal` → `socket` → (dormant) → `bench_crystal` →
      `craft_crystal`, and the `again` step goes: the dormant stretch is what
      replaces it.
- [ ] The shard still comes WITH the crystal at the meeting — everything is
      handed over in person, and that rule outranks tidiness — so the player
      may hold it for several descents and can spend it elsewhere. The craft
      step therefore has to survive an empty wallet: with no shard it points at
      the shop, which is where the gold from the first clear is already for.
- [ ] The craft is TRIGGERED, not queued. Nothing about crafting is taught at
      the meeting; when that crystal reaches level 2 by being used, the guide
      comes back on its own for the two steps that put a modifier on it, and
      lets go again. `INTRO.scriptedMod` stays on the crystal from the moment
      it is handed over — it is inert until there is a slot to fill — so what
      moves to the trigger is the TEACHING and not the items.
- [ ] The opening runs to the end of the first descent as it does now, plus one
      step: spend your first skill point. Then it LETS GO — lockdown off, and
      what it is waiting for said somewhere you can read it rather than in a
      card that follows you. Nothing is locked while you are levelling.
- [ ] `giftSchedule` says the new condition in words, the way it says the clear
      count today, and the collection screen is where it is read.
- [ ] The dev preset still marks everything given (`game.given`), so a stocked
      game does not walk into the opening.

**MEASURED, so nobody derives it twice.** A fresh character on bare descents
reaches skill level 2 on the 2nd clear and **skill level 3 on the 5th**, about
**133 seconds** of play (three trials, all the same shape). So the crystal
arrives on roughly the fifth descent, which is a fine pace for a player and a
problem for one harness only:

**What must not break.** `npm run guide` plays the opening in REAL TIME and
sits through every descent in it. Five descents is ~2¼ minutes of waiting on
top of everything else, and its turn budget is 240 turns of ~320–500ms — about
two minutes total. **Raise it to ~600 turns and write the new suite timing into
`RULES.md`;** the harness being too impatient is this phase's problem, not a
reason to move the condition. While the guide is DORMANT the lockdown is off,
so `looping()` is true and descents chain by themselves — the harness only has
to wait, not click. The demo walks the same steps headlessly with one hand-written
action each, and a TRIGGERED step is a new shape for both of them: a step that
is not reachable yet must not be reported as stuck.

### Phase 2 — Mana, and what a skill costs [user 3a]

**What is true today.** There is no mana anywhere: no resource on `Character`
(`src/sim/character.ts`), no field on `CombatStats` (`src/sim/stats.ts`), no
cost on `SkillDef` (`src/types.ts`), no bar. A skill fires whenever
`hero.cooldown <= 0` in `useSkill` (`src/sim/run.ts`), and the only thing that
has ever limited one is time. `lifeRegen` is the shape a regenerating resource
already has.

**Why it is wrong.** Every node in every tree is an upgrade with no cost beside
the point it took, so "more of everything" is always the right build.

- [ ] Mana on the character: a pool, a regeneration rate, and a cost per skill
      use. Same shape as life — a `CombatStats` field, so gear and the tree
      reach it through the modifier engine without learning a new concept.
- [ ] **The calibration, and it is the whole phase:** a level 1 character with
      no attributes, no regeneration and no gear, casting a BARE skill with no
      nodes, is just barely sustainable. Not comfortable. Measured against a
      real descent, not a formula.
- [ ] A node that changes what a skill DOES multiplies its cost. Bigger nodes
      cost more, so stacking them is what makes a build mana-hungry — that is
      the pressure this phase exists to create. A `manaMultiplier` grant with
      a `product` merge is the mechanism; it is declared in `sim/grants.ts`
      like every other switch and says its number out loud on the node.
- [ ] What a character out of mana DOES. It cannot be "stand still" — the run
      would never end, and `runToCompletion` would hang. Name it: walk to the
      exit, fall back to an unarmed swing, or wait while regeneration catches
      up with a floor on how long that can take.
- [ ] A mana bar beside the life bar in the run readout, and on the sheet.

**What must not break.** Every ladder harness in `src/demo.ts` measures what a
band clears, and a skill that can run dry moves all of them. Measure before and
after. `TERMINATION CHECK` runs 28 descents and proves every one ends — a
character that cannot afford to attack is the newest way for one not to.

### Phase 3 — Two potions, two charges [user 3b]

**What is true today.** Nothing. There are no consumables, and — more to the
point — **there is no player input during a descent at all.** The guided
opening's first hint says so: "You fight on your own. Nothing to time." The
only mid-run controls are Abandon and Leave, which are about the loop rather
than the fight.

**Why it is wrong.** With mana costed, running dry has no answer, and a run
you can only watch has no moment in it that is yours.

- [ ] A potion is an EFFECT WITH A DURATION, not an instant heal. The life one
      is a few seconds of heavy life regeneration and the mana one is the same
      for mana — the plainest possible instance of "a thing that is true for a
      while". Built any other way, the trade that turns potions into buffs is a
      rewrite rather than a table entry, and that trade is already designed.
- [ ] **Two charges each per descent**, refilled on the descent after — so they
      are part of a descent's budget rather than a stockpile, and a cleared run
      always starts full.
- [ ] Charges are RUN state, not save state: they live on `RunState`, and
      `RunSim` grows the one input it has ever had. Nothing about a potion is
      in `GameState` yet — the ways to modify them come later.
- [ ] Bound to **1** and **2** through `BINDINGS` in `src/data.ts` and the one
      listener in `src/ui/keys.ts` — two more table entries, not two literals.
      That table already exists; see `RULES.md`.
- [ ] The tutorial's opening hint stops saying there is nothing to time, and
      the opening teaches the two keys somewhere. This is the first thing a
      player DOES in a fight and it cannot be a secret.
- [ ] **Automation is universal and is never a build choice.** Potions
      auto-use on a threshold, the threshold is the player's to set, and the
      shipped default is the one every harness runs — so `runToCompletion` and
      the in-game automation are ONE rule with one implementation. A build
      whose power needs the player present is a build no harness can hold, and
      `RULES.md` forbids it.
- [ ] The ladder is measured with potions ON, as the floor. Auto-firing potions
      hand every character in the game the equivalent of extra life at all
      times; counted as a bonus on top of the existing numbers rather than as
      part of them, every band is quietly softer than it reads.
- [ ] Potions are one of THREE postures and the other two are built later, so
      leave room for them: this phase is the reactive safety net; a node
      somewhere that deletes potions outright for flat power is the second;
      and the Alchemist, who turns them into the character's engine, is the
      third and has a phase of its own. All three are automatic — see the rule
      in `RULES.md` about builds that need the player present.
- [ ] On-screen buttons beside the map, with 1 and 2 as the shortcut rather
      than the interface. `npm run shots` runs a 390px viewport: a phone has no
      number row, and a potion nobody can reach there is not optional, it is
      missing.

**What must not break.** The sim is deterministic and replay-safe: an input
arriving between ticks must land on a tick boundary like everything else, or
the same seed stops giving the same run. `npm run smoke` and `npm run guide`
both drive real descents.

### Phase 4 — Character level buys attributes [user 7]

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

### Phase 5 — Trades: the part of a character that is not the skill

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

### Phase 6 — Every monster brings its own element [user 10]

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

### Phase 7 — What a node does, shown and not overlapped [user 8]

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

Do not guess at these. None of them blocks a phase in this file — the six that
did have been answered and are written into the phases above. The first two are
new and come out of the trade system.

1. **What the Lampwright wants.** The trade phase needs a way to GET a trade,
   and the intent is a storyline with the Lampwright rather than a level
   threshold — he is the only person in the game and the only voice it has.
   Nothing about it is written: what he is doing down there, what he asks for,
   how many beats it runs, whether it hands out anything besides the trade.
   The phase ships a placeholder that the story replaces without touching the
   tree or the points, so this blocks the STORY and not the system.

2. **What the second trade is.** The Alchemist is designed. The framework phase
   asks for two, and the rule the second has to clear is the same one: it
   changes what is POSSIBLE rather than by how much. Candidates, all of which
   change a rule the game already has: crystals that level while carried rather
   than only while socketed; a descent that runs longer and pays per clear
   rather than per kill; danger that hurts less and pays less. None is picked.

3. **What is the fifth socket?** Wanted as an endgame slot holding something
   that is not a crystal. Deliberately unspecified — the user wants to think
   about it. `RULES.md` says how to keep it cheap to add; nothing else may
   assume it.

4. **The Cavern and the Fissure have no currency of their own.** Retiring the
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
