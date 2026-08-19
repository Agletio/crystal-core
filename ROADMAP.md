# Crystal Core — Roadmap

**The work that is left, and nothing else.** What is always true is `CLAUDE.md`
and the skills it indexes. If a thing here is not a task or something you need
in order to do one, it is in the wrong file.

## Where this stands

**There is no phase waiting to be taken.** Phase 1 (the boss fight) shipped.
Phase 2 (a quest log) is parked by the user's own word until the stripped
opening has been played. The balance pass is written up below and the user has
held it: *"dont do balance yet I want the fight to not be buggy and feel ok and
then we can balance."*

So this file holds a held pass, a backlog nobody asked for, and the open
questions. **Say so and list them rather than inventing work.**

### Live known issues

- **The tier ladder the boss is meant to gate does not exist yet.** The fight
  itself now lands where it was asked to — full tier 1 answers it with speed or
  with plate and with neither it does not — but nothing about beating it opens
  anything. Item tier is bought by run POWER alone (`DROP_BANDS[power].ilvl`
  against `BASE_TIER_ILVL = [1, 22, 46]`), families are held to the SAME threat
  by the demo on purpose, and `BOSSES` has one entry. The open question is #11.
- **`npm run shots` can go red on `desktop: the first descent never met the
  Lampwright`.** Two separate causes, and the cheap one is far commoner:
  **running it beside `demo` or `smoke`** starves the browser and it loses the
  two-minute wait (measured — red concurrent, green alone, same tree), so
  **re-run it alone before treating one as a regression**. Underneath that is a
  real undiagnosed fault, not fixed on purpose: dressing a descent consumes one
  draw from the run's rng, so the first descent only happens to reach `#met` at
  the moment, and it is a seed away from coming back.
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

## The balance pass

**Not a phase, and not started.** Documented so that asking for it is one
sentence rather than a re-derivation.

**Why it is now possible.** Nothing is tuned until every system is in, because
each one hands out more power than the last. That list was attributes, then
trades, then jobs — and trades WERE the jobs. Every one has landed, so the
reason to lean too easy has expired. Nothing has been tuned to compensate; the
game is deliberately soft everywhere.

**What it would read.** Eight `gauge()` lines in `npm run demo` — measured,
printed, never asserted, each carrying the figure that was wanted beside the
figure it got. These are the before:

```
the Seam is -12.6% over the hardest single world    — wanted: same class within 15%
a trade moves the deep-end kill rate 3.85–7.44/s    — no pairing should be the only one
2% to 22% of swings go unpaid                       — wanted: 5%–50%
a starved cast lands for 50% of your damage
a naked character walks out on 66% life             — wanted: under 70%
one blank crystal after the first clear: 24/24      — wanted: above 60%
every band is clearable in gear the band below drops
the deep end: 1253 danger, 8/12 through             — wall under 4/12, ceiling at 0
```

**Several moved when the ROSTER did**, and the pass should read that as one
change rather than as drift: six generated bodies replaced eleven and one
thrower per family replaced a quarter of all packs shooting, which took the
blank-crystal rung 18/24 → 24/24 and the deep end 4/12 → 8/12.

### It owes three parked checks

Each is a `parkedCheck` in `src/demo.ts` printing its number and failing
nothing; the pass puts them back to `check`. **The demo prints its own parked
count and this list has to agree with it.**

1. **"the characters checked actually cover every shape it polices"** — the
   sheet audit no longer builds a character exercising a "more" line.
2. **"the sim asks for exactly what the sheet promised"** — `fireball@30`
   promises 355.89 per hit where the sim asks 480.45, which is exactly the
   `ailmentMultiplier: 1.35` the tree grants: the sheet applies it only for
   `ailment_burst` and the sim also applies it on the `critAilment` path.
   Widening the sheet's condition broke a SECOND promise, so what is wanted is
   the per-hit and per-crit numbers being told apart. Pre-existing.
3. **"Before The Lamp Dies: 90s against a median clear"** — the room takes 92s.

The boss grid came OUT of this list: the turn was deleted, the fight was rebuilt
around what a build carries, and the check is a real `check` again.

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

## Phase 1 — A quest log instead of a pointing finger

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
      stripped opening and got stuck.

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

1. **What the Lampwright wants.** The trade acquisition is a placeholder and
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

2. **Is the Seam meant to be the hardest room, and is it?** Measured over 24
   seeds it sat 0.7% BELOW four Demonic crystals on damage taken per second;
   after the Normal pool became six generated bodies it is **-21.1%**. The cause
   is structural: the Seam takes exactly two crystals of each world, so only half
   its packs carry a Demonic aura and half a Prismatic one, where four Demonic
   crystals put an aura in every pack. Making it genuinely worst means changing
   what the composition DOES — both auras on one pack, or a Seam-only carrier —
   which is a balance decision rather than a measurement. The gap also moves
   several percent whenever anything in the sim changes, so the demo PRINTS the
   margin rather than asserting an ordering.

3. **Does anyone live in the Seam?** Four characters, three worlds and the
   Fissure — the room that is supposed to be the worst in the game has nobody in
   it. `RunState.folk` is a list partly for this. Leans on question 2.

4. **Nothing but the Fissure hands out an element.** Every monster brings its
   own, but which one is a flat roll off `MONSTER_ABILITIES` — a Rot pack is as
   likely to throw frost as a Cavern one. Biasing the table by monster FAMILY
   would make a world's fights feel like that world's: one field on
   `MonsterFamilyDef` plus a weight lookup. Written down because the table it
   needs already exists.

5. **The Cavern and the Fissure have no currency of their own.**
   `sigil_of_upheaval` is gated to Demonic and `sigil_of_finality` to the Seam;
   the other two are gated to nothing. Every world now has uniques of its own —
   the Fissure two — so this may already be paid. **Provisional, and mine:** left
   as it is rather than inventing a gate. Ask before gating an EXISTING currency
   to the Cavern; it would make a staple zone-locked.

6. **What does a TRADE do in a boss fight?** Deferred at the user's word — *"skip
   this for now and get the base mechanics feeling good."* The intent is ONE
   unique interaction per trade, not a second system. Parked proposals: the
   Alchemist's flask extends whichever face is live when it fires, since potions
   are already that trade's engine; the Aethermancer refunds mana on a turn, so
   weaving is how they stay full.

7. **What does a reworked TRADE web look like?** The user's word during the
   polish round: *"trades needs a rework"*, beyond the node theme, with no
   further spec. The retheme itself landed on all three webs, so what is left is
   the trade web's SHAPE or its content, and only the user can say which. **The
   skills layout is explicitly fine.**

8. **Do the chasms come back?** The whole drop system — `VOID`, ledges, walls
   hanging into a hole, bridges — was built, judged and deleted at the user's
   instruction (`83b8488`). How to draw one: the wall tile placed ONE ROW LOWER
   than it is keyed (the same picture that reads as a wall standing up under
   rock reads as one going down under ground), flanks turned a quarter, no near
   wall, and the void taking no part in the light's blend or the floor fades out
   at its own rim. The code is at `56d599a`. Never asked for twice; here so
   nobody rediscovers the geometry.

9. **How big does the bundle get before it matters?** `generated-art.ts` is
   0.48 MB for TEN bodies (33–52 KB each at grid 48, 120 KB for the Gaunt at
   96); `docs/app.js` is 1.62 MB, 0.43 gzipped. Ten trade looks are about 0.5 MB
   and twelve more monster bodies another 0.5 — **not the ~13 MB this file
   parked two decisions on for months**, which was from the era when every body
   was grid 96. Cost is grid SQUARED times frames. Nothing about "no binary
   assets" is under pressure and there is no decision to take; what is wanted is
   a number the user cares about (repo size, parse time on a cold load).

10. **How does beating a boss OPEN a tier?** The user's shape: *"you grind the
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
