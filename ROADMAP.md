# Crystal Core — Roadmap

**The work that is left, and nothing else.** What is always true is `CLAUDE.md`
and the skills it indexes. If a thing here is not a task or something you need
in order to do one, it is in the wrong file.

## Where this stands

**Eight phases are waiting.** Phase 9 (a quest log) stays parked by the user's
word until the stripped opening has been played.

**The TRIALS WEB ITSELF HAS LANDED** — the web, its points, the screen, the
ladder and the seam into `RunSet.mods`. What is left of it is the three EVENTS,
which are Phases 1–3.

| | | |
|---|---|---|
| 1–3 | Hoards, the Welling, Bearers | the three events, each with its own trial |
| 4 | the skill tree's tints | an hour |
| 5 | the arrow out of the bow | an hour, render-side only |
| 6 | **ailments per damage type** | the big one — 44 node slots and a sim rewrite |
| 7 | settings becomes a screen | keybindings, and the filter moves in |
| 8 | the book | one searchable place for every keyword |

**The ORDER is provisional and it is MINE, not the user's.** He wrote them all
down in one go and said *"Let me know once this is all added adn then I will tell
you how to proceed."* Cheap and independent first, then the big system, then the
shell — but **ask before assuming the lowest number is what he wants next.**

**Read "The trials web" before taking Phases 1–3.** They share one seam and one
set of traps, and a session that takes one without reading it will add a node
that silently buys item level.

**The balance pass is HELD AGAIN**, and this time with a reason rather than a
timing: *"imagine if we had spent time balancing before we implemented this map
skill tree even it would throw things off massively. We also need to add more
passives that could be a large power source and probably iterate on trades as
well. So I think we hold off for now."* Do not start it, and do not tune to a
gauge while doing anything else.

### Live known issues

- **The tier ladder the boss is meant to gate does not exist yet.** The fight
  itself now lands where it was asked to — full tier 1 answers it with speed or
  with plate and with neither it does not — but nothing about beating it opens
  anything. Item tier is bought by run POWER alone (`DROP_BANDS[power].ilvl`
  against `BASE_TIER_ILVL = [1, 22, 46]`), families are held to the SAME threat
  by the demo on purpose, and `BOSSES` has one entry. The open question is #10.
  **Beating it now pays a TRIAL POINT**, which is a different answer to the same
  complaint and does not settle the tier ladder.
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

## The trials web — read this before Phases 1–4

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
is a different table from a linear one — `TRIALS` is walked in order in Phase 1,
and a fork is a second field. **Ask before authoring the second room.**

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

### Traps — all four phases

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
  clicked** (see Phase 2) — an event with no interaction in it satisfies the rule
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

## Phase 1 — Hoards: a pack with something worth killing it for

**What is true today.** `spawn()` builds packs of one kind, one ability, one
optional aura carrier, and rolls a `rank` per monster off `MONSTER_RANKS`.
`MapProp` is `{ id, x, y }` and props are decoration nothing in the sim reads.
Loot comes off `rollGearDrop`, per kill, off `this.set.band`.

**Why it is wrong.** Nothing in a descent is worth walking toward. Every pack is
the same proposition, so watching one is watching all of them.

**The user's shape, and the automation rule.** *"basically think strong boxes in
POE but instead of clicking and monsters spawn just have them spawned in but more
monsters spawn around them and make them a little tougher."* **Nothing is
clicked** — that is not a simplification, it is what makes the event legal under
*"anything a player can do mid-descent has a shipped default policy"*. A Hoard is
a PACK MODIFIER: a box stands in it, the pack is bigger and ranked up, and the
box pays out when the pack is dead.

- [ ] **A Hoard is a pack, not an entity.** The box is a prop the sim knows
      about; killing the pack banks its loot. Decide whether the box needs a
      body at all — a prop already draws, and a generated one is an `art` job.
- [ ] **Nodes: how OFTEN, how MUCH, and what KIND.** The third is the user's
      *"one node that lets you select a preference for gear type it drops"* —
      `dropBias` and `DROP_GROUPS` already exist and are exactly this, so the
      node is a choice node feeding the bias that is already read by
      `pickGearBase`. **`SkillProgress.choices` is the precedent for a node that
      offers an option**; this web needs the same field.
- [ ] **Its own trial**, so the phase ships a point with the nodes.
- [ ] **The loot is banked, not dropped on the floor.** `state.loot.items` is
      the one path up.

**Trap.** Both pack-size stats are `rewards: false` in `DANGER_STATS` — density
does not pay, on purpose, because it pays in extra kills. A Hoard pack that is
bigger AND ranked up is paying twice unless the rank half is what carries the
danger.

**Done when.** A headless descent with the Hoard node allocated contains boxes,
they are guarded, killing the guards pays, and nothing in the run needs a click.

**What must not break.** As Phase 1, plus `npm run peek` — a box nobody can see
is a box that is not there.

---

## Phase 2 — The Welling: what comes up out of a body

**What is true today.** `spawn()` places every monster before the descent starts
and `s.totalMonsters` is set once from that count. Nothing adds a body mid-run
except the closing encounter, which sets the counter when it starts.

**Why it is wrong.** A fight has one shape: the pack you can see is the pack
there is. Nothing escalates because you are winning.

**The user's shape.** *"when an enemy dies it has a chance to spawn another enemy
from its body... chance for mobs to tier up when summoned in. Like a normal dies
it summons in a magic, magic summons a rare, rare has a small chance to summon a
boss etc."*

- [ ] **On death, a chance to spawn one body at the corpse.** `MONSTER_RANKS` is
      an ordered list, so "tiers up" is an index step and needs no new table.
- [ ] **It must TERMINATE.** A chain where each death can spawn a death is a run
      that may never end, and `runToCompletion` failing is a mechanism failure.
      Decide the bound and write it down: a per-descent cap, a decaying chance,
      or a rank ceiling that cannot re-spawn. **Pick one and say which it beat.**
- [ ] **`s.totalMonsters` learns about each one**, or the readout climbs.
- [ ] **"rare has a small chance to summon a boss" is a decision, not a task.**
      `BOSSES` is deliberately NOT `MONSTERS` — a boss has phases, a room and a
      terminus of its own, and one loose in a descent has none of that. Either
      the top rung is a `BOSSES` entry with the phase machinery suppressed, or it
      is a fourth `MONSTER_RANKS` row that is merely enormous. **The second is
      cheaper and is the recommendation**; the first is what the user's words
      literally say. Ask, or take it and write down what it beat.
- [ ] **Its own trial.**

**Trap.** Killing a spawned body pays gold and XP through `priceKills`; an
uncapped chain is an uncapped XP faucet, and XP is not gated by power.

**Done when.** A headless descent with the node allocated ends, its monster count
is honest, and the deep end measurably escalates.

**What must not break.** As Phase 1. `npm run demo` proves termination; the
600-second bound in `runToCompletion` is the check that already exists.

---

## Phase 3 — Bearers: the thing somebody is waiting for

**What is true today.** `RELICS` has two rows, both `chance: 0.006` per kill,
each gated to one zone by `opensHere`, each naming the scene that `wants` it.
`sceneWaiting` schedules that room the moment one is held. So the two authored
rooms that write a line nothing else can are behind a 0.6%-per-kill roll and
nothing else.

**Why it is wrong.** The best two rewards in the game are pure luck, and a player
who wants one has no way to go and get it.

**The user's shape.** *"we can make two centered around the existing mechanics
with the corpses and the gemstone guy for the unique mods. Make it where really
hard enemies can spawn and guarantee corpse/dust or maybe increase the drop rate
of them."*

- [ ] **ONE mechanism, a row per relic.** A Bearer is a single very hard body
      that drops what it carries on death. `RELICS` already has the gate and the
      `wants`; the Bearer row points at a relic id and inherits both.
- [ ] **The gate is a WALL and stays one.** *"A `DropGate` says a thing does not
      exist in this run at all... the pool is filtered before the pick, so no
      amount of rarity argues with it."* A Bearer in the Fissure may not hand out
      a Rot corpse.
- [ ] **Nodes: how often a Bearer appears, and how hard.** Whether the drop is
      GUARANTEED or merely much likelier is a decision — guaranteed makes the
      node a switch rather than a number, which reads better and is worth more.
- [ ] **Hard means hard.** *"really hard enemies"* — it must be a body a build
      can lose to, or the reward is free.
- [ ] **Its own trial.**

**Trap.** `rollRelicDrop` runs per kill over all of `RELICS`; a Bearer that drops
through that path rolls the OTHER relic too. It needs its own path, or the loop
needs to know which body just died.

**Done when.** A player who wants a graft can build toward one, a Bearer is
gated to the right world, and killing one in the wrong world is impossible rather
than unlucky.

**What must not break.** As Phase 1, plus the demo's existing relic checks: each
relic exists in ONE world, and every one names a scene that exists.

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

**I recommended running the balance pass before Phase 2 and the user overruled
it**, on grounds that are better than mine: *"imagine if we had spent time
balancing before we implemented this map skill tree even it would throw things
off massively. We also need to add more passives that could be a large power
source and probably iterate on trades as well."* The trials web, an ailment
rework and a passive pass are each a power source that moves every number, so a
pass run now is a pass run twice. **The pass is HELD. Do not start it.**

What follows from that: **trial node values are provisional by construction.**
Author them to be obviously interesting rather than obviously balanced, and do
not add a check that fails on one.

---

## Phase 4 — Tell an allocated node from one you could take

**What is true today.** `docs/index.html:1608–1696`. A reachable node is
`.web__node--open` and gets `drop-shadow(0 0 3px var(--bone))`; an allocated one
is `.web__node--on` and gets `brightness(1.35) drop-shadow(0 0 3px
var(--citrine))` plus two fill swaps (`--on-lit`, `--on-gem-lit`). `--bone` is
`#C9BFA3` and `--citrine` is `#D9A441` — **two warm desaturated yellows three
steps apart**, at 3px blur, behind art that is mostly rust and bone already.

**Why it is wrong**, in the user's words: *"Need to make skill tree ui slightly
more clear as to what nodes you have selected and one nodes you are capable of
selected that tint is very simialr so its kinda confusing."* A tree is the one
screen where the whole point is reading state at a glance.

- [ ] **Separate the two by SHAPE or VALUE, not by hue.** Two warm yellows will
      still be two warm yellows after a hue nudge, and the art under them is
      warm too. A ring, a fill, a halo width, a brightness gap that is not
      subtle — pick one and say which it beat.
- [ ] **Three states have to be told apart, not two:** allocated, reachable, and
      `--locked` (opacity .42). Do not fix the first pair and collapse the
      second.
- [ ] **`npm run theme` — every colour a token, every token defined.** A hex in
      a rule fails it.
- [ ] **All FOUR webs draw through this**, not just the skill trees: the trades
      web, the movement webs, and the trials web once Phase 1 lands. One change
      in `docs/index.html`, and check it on each.

**Trap.** `.web__node--on` already sets `.sicon__ink` and `.sicon__lit` fills;
a change that only touches the drop-shadow will be swamped by them. Read all
five rules together before editing one.

**Done when.** A screenshot of a half-allocated tree can be sorted into
allocated / reachable / locked by someone who has not been told the rule.

**What must not break.** `npm run theme`, `npm run build`, `npm run shots`
(alone) — the skills screen is in the checklist and this is what it looks at.

---

## Phase 5 — The arrow comes out of the bow

**What is true today.** `src/sim/skills.ts:241` emits the shot as
`use.vfx(kind, [{x: use.user.x, y: use.user.y}, {x: use.primary.x, y:
use.primary.y}])` — the hero's TILE CENTRE. The bow is drawn somewhere else
entirely: `HELD.bow` in `src/render/held.ts` pins it at the OFF hand
(`track: 'off'`, `grip: [0.47, 0.5]`, `reach: 0.11`) through `handAt`, and the
whole offset is MIRRORED when the hero faces west. `ARROW_SPAN` is `0.95` tiles.

**Why it is wrong**, in the user's words: *"Currently it spawns like off to the
side of the character in certain directions and looks weird."* The sim's origin
and the drawn bow disagree, and the disagreement flips sign with facing.

- [ ] **Fix it in the RENDERER, never in the sim.** `use.user` is the origin for
      pierce geometry and target picking; moving it changes what the shot HITS
      and breaks every seed's replay. The renderer already knows where the bow
      is — `handAt(sprite, 'bow', cel)` plus `HELD.bow.grip`/`reach` and the
      facing flip — so the correction is the same arithmetic `drawHeld` already
      does in `src/render/pixi.ts`.
- [ ] **`ARROW_SPAN` comes down.** The user asked for a smaller arrow and did
      not say how much; pick a number, look at it with `npm run peek`, and put
      the figure in the commit.
- [ ] **Both renderers, or say why not.** `arrowFlight` is deliberately the ONE
      answer so the Pixi sprite and the canvas2d shaft cannot disagree. canvas2d
      draws no held weapon at all, so the bow-relative origin has nothing to
      anchor to there — **that is expected and is not a bug**, but write down
      which of the two moved.
- [ ] **The hero is not the only archer.** Monsters throw through the same
      `projectile` behaviour and hold no bow; the correction must be a no-op for
      anything with no `bow` in hand.

**Trap.** `pinnedFor` returns undefined when the BODY already draws the bow —
`aethermancer_bow` is a generated variant holding one, and the Alchemist has no
such variant and still pins. So "where the bow is" has two answers depending on
the hero, and only one of them goes through `HELD`.

**Done when.** `npm run peek` at four facings shows the arrow leaving the bow in
all four, and the shot still hits exactly what it hit before.

**What must not break.** `npm run build`, then `npm run peek` and `npm run
shots` (alone). The demo's damage numbers must not move at all — if they do, the
sim was touched and the fix is in the wrong place.

---

## Phase 6 — An ailment per damage type

**The biggest phase in this file.** Read the whole of it before starting; it
rewrites a sim mechanism, retires four tree notables, and reopens the keyword
table.

**What is true today.**

- There is **ONE ailment**: a damage-over-time stack, `Ailment` in
  `src/sim/run.ts:148`. `applyAilment` sets `dps[t] = attacker.stats
  .damageByType[t] * multiplier / seconds` — **so it scales with everything that
  scales the hit**: spell damage, attack damage, added flat, all of it. It also
  snapshots `critChance`/`critMultiplier` and can critically TICK.
- Its type is `skill.damageTypes[0]` and `AILMENT_NAMES` maps that to a word.
  The comment above that table says so outright: *"The sim has one ailment and
  takes its element from the skill, so this is naming rather than mechanics."*
  **Burning and frostbite are the same thing with two names.**
- It is applied by three things: the `critAilment` grant (*a Critical leaves an
  Ailment instead* — `this.useCrit = grants.critAilment ? false : crit`),
  `bleedOnHit`, and Blight's `ailment_burst` behaviour.
- `AILMENT.maxStacks` is 12, `AILMENT.tick` is 0.5s, and stacks expire on their
  own clocks.
- **44 node references** across five tree files: `strike.ts` 9, `fireball.ts` 9,
  `arc_lightning.ts` 9, `lightning_arrow.ts` 9, `blight.ts` 8.

**Why it is wrong**, in the user's words: *"Currently we have a bunch of talents
that remove crit and apply an ailment dot but I want ailments to be related to
hit damage with a certain type where unless you have a specifc item/class or
something to change this each damage type has an ailment associated that does a
certain thing."* An ailment is a NODE you buy today; it should be what a damage
type DOES.

### The thing that makes this cheap, and a session will miss it

**The tag system already does the scaling rule.** Gear damage mods are all one
stat with TAGS — `{ stat: 'damage', form: 'inc', tags: ['fire'] }`,
`tags: ['spell']`, `tags: ['attack']` (`src/data.ts:1152–1197`) — and
`computeStat(base, mods, stat, contextTags)` in `src/mods.ts:268` filters by
them. `heroStats` already passes the SKILL's tags in, which is what keeps an
attack crit off a spell.

So *"you have to scale it through burn damage, fire damage, or damage over time
mods. So spell damage/attack damage/crit/crit multi etc don't scale it"* is
**not a new system**: it is computing the ailment's damage with the AILMENT's own
tag set (`['fire', 'burn', 'overTime']`) instead of the skill's. Spell and
attack mods fall out because their tags are not in that set. **Do not build a
parallel scaling path.**

- [ ] **`AILMENTS` is a table, one row per damage type**, replacing
      `AILMENT_NAMES`. Each row names the ailment, what it does, and its own
      tags. A row is the only place a new ailment may be added.
- [ ] **Flat base damage, not a share of the hit.** *"Burns deal a flat damage
      amout thats preset."* The number lives on the row; `applyAilment` stops
      reading `attacker.stats.damageByType` for a damage ailment.
- [ ] **A chance to apply, per damage type, rolled per HIT.** *"You can get %
      chance to apply the ailment but it only applies if you deal that damage
      type."*
- [ ] **Over 100% is a second stack.** `floor(chance/100)` guaranteed
      applications plus one more at `chance % 100`. Write the formula down where
      it is read; do not re-derive it at two call sites.
- [ ] **Attack speed is free.** Application is per hit, so a faster skill applies
      more; the 12-stack cap is what stops it running away. **No new machinery.**
- [ ] **The eight rows**, in the user's own words:

| type | ailment | what it does |
|---|---|---|
| fire | **Burn** | flat damage over time |
| physical | **Bleed** | the same, physical |
| cold | **Chill** | a small % off movement, attack and cast speed PER STACK; **Freeze** at a stack threshold, and the next hit after a Freeze is a guaranteed Critical |
| lightning | **Shock** | *"very little single target but every tick it does a small lightning chain hitting a few enemies"* |
| poison | **Poison** | like Burn, but applied ONLY by an item or skill that says it applies Poison, and scaled by that skill's tags |
| dark | **Cursed** | on the enemy's death, a chance to burst for a share of its life; more stacks, bigger burst |
| light | **Exposed** | the target takes a stacking % increased damage |
| prismatic | *(none)* | monsters simply have little or no Prismatic resistance |

- [ ] **Redo all 44 ailment node slots.** *"Redo all the existing no crit,
      ailment nodes to something else."* This is authoring, not deleting: four
      trees each hang a NOTABLE off `critAilment` (`st_rend`, `al_ionise`, and
      Fireball's and Lightning Arrow's), each with branch minors under it, and
      `TREE_NEEDS` maps `ailmentMultiplier`/`ailmentDuration`/`ailmentSpread`
      onto those notables. Budget the content, not the deletion.
- [ ] **A tooltip per ailment**, which is `KEYWORDS` and therefore free on every
      screen at once — see Phase 9.

### Decisions taken, each overrulable in a sentence

- **The light ailment is called Exposed.** The user: *"dunno what to call this
  one."* It beat "Lit", which is better flavour under a game full of lamps but
  says nothing about what it does; `AILMENT_NAMES.light` is `searing` today and
  that describes fire.
- **Chill and Exposed are not `changes: 'scale'`.** See the class trap below.

### Traps — and the first two are the expensive ones

- **`GrantDef.changes` may need an EIGHTH class, and that is not free.**
  `INTERACTIONS` in `src/trees/interactions.ts` holds **28 pairs** over seven
  classes and *"the demo fails an unwritten pair"*. Chill changes a target's
  SPEED, Cursed fires on DEATH, Exposed changes what a target TAKES — none is
  cleanly scale/duration/targets/burst/field/crit/type. An eighth class takes
  the table from 28 pairs to 36, and every new one has to be written. **Decide
  early whether these ride an existing class**, because discovering it at the
  end is eight paragraphs of prose at the worst moment.
- **Crit leaving ailments is the whole of two mechanisms, and both die.** Today
  an ailment snapshots crit and can crit-TICK, and `ailmentSpread` (*a Critical
  tick spreads the Ailment*) has no other trigger. The user's rule — crit does
  not scale an ailment — deletes crit ticking, which deletes `ailmentSpread`'s
  reason to exist. **Blight is the skill that pays**: its entire tree is
  ailments and it loses crit scaling outright. Balance is held, but *a skill
  that stops working is mechanism, not balance* — measure Blight before and
  after and print both.
- **Freeze puts crit back in from the other side.** *"next hit is guranteed crit
  after freeze"* — that is a crit GRANT on the hero, not on the ailment, and it
  is not a contradiction. Say so in the code so the next session does not
  "fix" it.
- **Poison breaks the general rule on purpose.** Poison is a `DAMAGE_TYPES` row
  and Blight deals it, so under "dealing the type applies the ailment" every
  Blight tick would poison. The user wants the opposite: *"it should only be
  applied by specifc items or skills that say apply poisons."* **Write down
  which rule wins** — the row needs a flag saying it is never applied by damage
  type alone.
- **Prismatic having no resistance collides with a crystal modifier.**
  `monsterResStat('prismatic')` is a real rolled crystal mod and a real
  `DANGER_STATS` entry (weight 0.65, capped at `DEFENCE.resistanceCap`). If
  monsters have no Prismatic resistance, that modifier is a mod that does
  nothing — which `npm run mods` fails by design. Either it comes out of the
  pool or "little" means a lower cap rather than none. **Also check
  `DEFENCE.monsterHitFloor`**: a floor of 0.25 already stops full immunity, so
  the type may be less resisted than it looks.
- **Every roll is off `RunSim.rng`, and ONLY when the chance is above zero.**
  This is the Block precedent, stated in the `systems` skill: a roll taken when
  the chance is 0 still consumes a draw, and gear would then move a seed's
  replay.
- **`Ailment.dps` is `Record<string, number>` because a cast's typed parts tick
  as themselves** — a cold ring on Blight ticks as cold. Flattening it to one
  number loses that.
- **Chill has a home already.** `SLOWED` and `Entity.slowed` exist on monsters
  (`src/sim/run.ts:137`, `1901`), `swingCooldown(e)` is the ONE place a swing
  rate is multiplied, and `Entity.effects` is ticked for monsters. **Do not
  invent a second slow.**
- **`AILMENT_NAMES`' own comment becomes false** and must be rewritten in the
  same commit, along with the `KEYWORDS` entries for Ailment, Burn, Bleed and
  Poison — whose `means` lines are currently *"The Fire Ailment."* and so on,
  which is naming standing in for a definition.
- **There are NO gear mods for ailment or over-time damage today.** Grep found
  none. The user names three scaling sources — burn damage, fire damage, damage
  over time — and only the middle one exists. Adding the other two is `ModDef`
  rows, and `npm run mods` holds every modifier to rolling, doing something and
  reading.

**Done when.** Every damage type either applies its own ailment or is written
down as not having one; nothing scales a damage ailment except its own tags;
100%+ application chance stacks; and no tree node in the game says "a Critical
leaves an Ailment instead".

**What must not break, in order.** `npm run comments`, `npm run theme`, `npm run
typecheck`, `npm run mods`, `npm run build`, `npm run demo` — which polices the
keyword sweep, the `INTERACTIONS` pairs, every `GrantDef.say`, and the grant/
behaviour reading table — then `npm run smoke`, then `npm run shots` **alone**.
Expect `demo` to be where this phase lives or dies.

---

## Phase 7 — Settings stops being an empty shell

**What is true today.** `src/ui/settings.ts` is 21 lines and says so in its own
header: *"an empty shell on purpose. The rail button and this window exist so
there is a place the moment something needs setting; nothing does yet."*
Something does now.

**Most of the work is already done and a session will not expect it.**
`BINDINGS` in `src/data.ts:2920` is the table of what every key does and defaults
to; `GameState.keys` overrides by the same id; `keyFor(game, id)` reads the
override; and `src/ui/keys.ts` says outright that *"a screen that rebinds them is
a screen and not a rewrite"*. **The flasks are already bound** — `potion_life` to
`4` and `potion_mana` to `5`. What is missing is the screen that edits them.

- [ ] **A rebinding screen over `BINDINGS`**, one row per entry, driven off the
      table so a new binding needs no second edit. It must refuse a duplicate,
      and it must survive `heal()`.
- [ ] **The auto-sell filter moves in.** *"Move the item filter there out of the
      main menu."* That is `open-filter` out of the rail, its `ICONS` entry, the
      `filter` binding (`j`), the dock slot and the `shots` checklist entry —
      **five places, and `smoke` asserts on at least one of them.** Decide
      whether the binding survives the move; a screen inside another screen with
      its own hotkey is defensible and is a decision either way.
- [ ] **"Boss controls" needs one sentence from the user before it is built.**
      What exists that could be bound: the fifth socket's *arm the key* button
      (`game.called`, `src/ui/run.ts:326–345`), `run-leave`, `run-abandon`, and
      `run-launch`. None has a binding. **The boss FIGHT has no controls at all**
      — it is automated like every other room, by a rule with no exception — so
      *"boss controls"* most likely means the launch, not the fight. **Ask.**
- [ ] **A binding is a PREFERENCE and is saved**; a mode is not. `game.keys`
      already sits beside `potions`, so this rule is already obeyed — do not add
      a second store.

**Trap.** `initKeys` ignores every key while an input has focus, on purpose
(*"Typing is not a shortcut"*). A rebinding row IS an input, so the capture has
to read the raw event rather than going through the dispatcher.

**Done when.** Every entry in `BINDINGS` can be changed and the change survives a
reload, and the filter is reachable from settings with nothing left pointing at
the rail.

**What must not break.** `npm run comments`, `npm run typecheck`, `npm run
build`, `npm run smoke` (it holds ids that are about to move), `npm run drag`,
`npm run shots` **alone**.

---

## Phase 8 — The book

**What is true today.** `src/ui/glossary.ts` already marks every keyword inside a
line (`keywordLine`) and appends *what every keyword these lines name means*
under the card it is on (`glossaryOf`) — because a tooltip is
`pointer-events: none` and a keyword inside one cannot be hovered twice.
`KEYWORDS` in `src/keywords.ts` carries `means` for each, with *its own numbers
out of the tables the sim reads*. **So the content exists and is already correct;
what is missing is a place to read it that is not a hover.**

**Why it is wrong**, in the user's words: *"add somethign like a help, book
something idk just something that has all the tooltip descriptions for
everything you use like blast, arc, bleed etc in one place where you can search
and read them."* Learning Arc requires meeting a card that says Arc.

- [ ] **Every `KEYWORDS` entry, in one scrollable place, with a Find box.**
      Search over `name`, `says` and `means`, so looking up "bleeding" finds
      Bleed.
- [ ] **Driven off the table, never a second list.** A keyword added in Phase 7
      appears here with no edit. The demo should hold that: the book's row count
      equals `KEYWORDS.length`.
- [ ] **`kin` is shown**, since a Burn satisfying an Ailment is exactly the thing
      a player cannot work out from two separate entries.
- [ ] **Decide where it lives** — a rail screen of its own, or a tab inside
      settings from Phase 8. A tab is cheaper and the rail is already thirteen
      icons long; a rail screen is easier to reach mid-decision. **Say which it
      beat.**

**Trap.** `initKeys` ignores keystrokes while an input has focus — that is what
lets a Find box exist at all, and `src/ui/keys.ts` names this as the whole reason
the guard is there. It already works; do not "fix" it.

**Traps, the second.** Keyword text is matched longest-first so *"Critical
Damage"* is never torn in half by *"Critical"*. A book that re-sorts the table
for display must not re-sort the table itself.

**Done when.** A player who has never seen a card saying Arc can find out what
Arc is, by typing.

**What must not break.** `npm run comments`, `npm run typecheck`, `npm run
build`, `npm run smoke`, `npm run shots` **alone** — a new screen is a new shot
and the checklist has to learn it.

---

## Phase 9 — A quest log instead of a pointing finger

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

   **MOSTLY ANSWERED — see "The story the trials are told in".** The user's
   call: the story is the Lampwright and the Lambengolmor not liking each other
   and each pulling you a different way, told through the trial ladder, with
   everybody else an event-giver rather than a plot. **What is still open is
   what they disagree ABOUT**, and whether being pulled one way closes the other
   off — a branching `TRIALS` table is a different table from a linear one.
   Ask before authoring the second room.

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
