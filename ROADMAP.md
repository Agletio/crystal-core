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
six questions they raised have been answered — so the phases left here are all
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

### Phase 1 — Character level buys attributes [user 7]

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

**BLOCKED on open question 1 below, and here is the measurement that blocks it.**
The groundwork was built and reverted rather than half-landed: four attributes
as a synthetic `RolledMod` beside the tree's (`attributeMod` in
`sim/stats.ts`), `Character.attributes`, `attributePointsFor(level)`, a spread
in `ladderCharacter`, and `critChance` reading `skill.tags` so an attack
attribute does nothing for a spell. All of that is straightforward and none of
it is where the phase stops.

Where it stops is the deep end. `RULES.md` says the hardest set in the game has
to be a WALL — a third or less gets through — and, measured over 36 runs rather
than the 12 the demo uses, it was ALREADY at 31% before this phase. Attributes
are a power increase, so there is no room underneath it:

| what a level buys | deep end, 36 runs |
|---|---|
| today: nothing but life and `damagePerLevel` | **31%** |
| 3 points/level, 5% damage · 2% life · 2% speed · 0.6 crit, no `damagePerLevel` | 39% |
| 2 points/level, same rates | 36% |
| 1 point/level, same rates | 33% |

One point a level is the only setting that holds the invariant, and it buys a
level-40 character 2 steps per attribute — 10% attack damage — which is the
phase's own complaint about levelling, restated. Dropping `damagePerLevel`
does NOT buy the room back: the deep end is survival-limited, not
damage-limited, so it is the life, speed and crit that soften it. The demo's
own 12-run check reads 25% at baseline and hides how tight this already was.

### Phase 2 — Trades: the part of a character that is not the skill

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

### Phase 3 — Every monster brings its own element [user 10]

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

### Phase 4 — What a node does, shown and not overlapped [user 8]

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

Do not guess at these. **The first one BLOCKS Phase 1** and is the only thing
standing between the roadmap and a session's work; the rest block nothing.

1. **How much stronger should a level make you, and does the deep end get
   retuned to match?** Attributes are a power increase and `RULES.md` requires
   the hardest set in the game to stay a wall (a third or less gets through).
   It is already at 31% over 36 runs, so the two cannot both hold. Three
   answers, and they are different work:

   - **Shrink the attributes** to 1 point a level. The invariant holds
     untouched, and levelling stays nearly as inert as the phase complains it
     is — 10% attack damage at level 40.
   - **Retune the deep end** so the wall is restored against a character who
     now has attributes. That is monster and danger numbers, which is a
     balance phase rather than this one, and it moves every band with it.
   - **Move the wall.** Decide that a third was the number for a character
     whose levels bought nothing, and say what it is now.

   Nothing else in the phase is blocked — the mechanism, the sheet, the saving
   and the replaying are all buildable the moment this is answered.

2. **What the Lampwright wants.** The trade phase needs a way to GET a trade,
   and the intent is a storyline with the Lampwright rather than a level
   threshold — he is the only person in the game and the only voice it has.
   Nothing about it is written: what he is doing down there, what he asks for,
   how many beats it runs, whether it hands out anything besides the trade.
   The phase ships a placeholder that the story replaces without touching the
   tree or the points, so this blocks the STORY and not the system.

3. **What the second trade is.** The Alchemist is designed. The framework phase
   asks for two, and the rule the second has to clear is the same one: it
   changes what is POSSIBLE rather than by how much. Candidates, all of which
   change a rule the game already has: crystals that level while carried rather
   than only while socketed; a descent that runs longer and pays per clear
   rather than per kill; danger that hurts less and pays less. None is picked.

4. **What is the fifth socket?** Wanted as an endgame slot holding something
   that is not a crystal. Deliberately unspecified — the user wants to think
   about it. `RULES.md` says how to keep it cheap to add; nothing else may
   assume it.

5. **Is the Seam meant to be the hardest room, and is it?** `CLAUDE.md` said it
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
   potions shifted it back — so the demo holds the Seam to the same CLASS as the
   hardest single world (within 15%) rather than to an ordering, and PRINTS the
   margin so an answer has something to read. `CLAUDE.md` says it is an open
   question rather than a claim.

6. **The Cavern and the Fissure have no currency of their own.** Retiring the
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
