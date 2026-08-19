---
name: systems
description: The simulation and its tables — skills, trees, grants, keywords, damage, mana, attributes, trades, crystals, drops, uniques, bosses, scenes, saves, currencies. Load before touching src/sim/, src/data.ts, src/trees/, src/trades/, src/moves/, src/game/, or src/crafting.ts.
---

# Systems

Everything is a TABLE and a REGISTRY. A new thing is usually a table row; a new
KIND of thing is one registry entry plus a table row. Anything downstream that
has to learn a new word is a seam in the wrong place.

## Grants — the one path a rule changes by

`GRANTS` in `src/sim/grants.ts` is **every switch anything may hand the sim**,
and who reads it. A tree node, a movement node, a trade node, a unique's
`grants`, a `ModDef.grants` on a worn line, a skill's static `SkillDef.grants`
and a boss face all reach the sim through it, merged by `treeGrants`. There is
never a second path.

- A grant must be **declared in `GRANTS`** and the skill's own `behaviour` must
  be listed as **reading** it — a tree asking a cloud to pierce is a point
  spent on nothing, and the demo fails it.
- Anything two sources both grant needs a **`merge`**, or the second silently
  replaces the first.
- **A grant's VALUE has to be the shape the sim reads.** `moreVsFull` wants
  `{ above, more }`; a bare `1.35` is a switch that does nothing, silently.
- **`GrantDef.say(value)` is that value in a sentence with its number in it** —
  what a card prints. It returns null for a shape it cannot read and the demo
  fails on that, so the line shown and the line acted on cannot come apart.
  `what` stays the generic description of the switch and no player reads it
  about a specific item.
- **`needs` names what a grant is useless without**, and it is per-tree: Area of
  Effect lives behind Detonation on Fireball, which does not burst without it,
  and sits on the trunk for Blight, which is a circle already.
- **`GrantDef.changes` classes every switch a DELIVERY reads** into one of seven
  classes — scale, duration, targets, burst, field, crit, type — and
  `INTERACTIONS` in `src/trees/interactions.ts` holds all 28 unordered pairs
  with what taking both comes to. The demo fails an unwritten pair. **Never
  audit at node level**: it is 742 pairs across the trees and goes stale the day
  a node is added. A node that invents a mechanism invents a class.
- **A combination with no coherent answer is REFUSED and says why** —
  `blocked` on an `Interaction`, read by `blockedBy`, asked by `canAllocate`,
  and the node's tooltip names the allocated node it clashes with. **Nothing is
  blocked today; that is a finding, not an omission.** Adding one is
  retroactive — allocations are replayed on every load, so a wrong refusal
  costs every player their build.
- A skill that never CASTS (both movers, the passive) declares no `changes` and
  is exempt **by construction**, derived from `SKILL_BEHAVIOURS` rather than
  from a second list.

## Skills

**Three slots in a TABLE** — `SKILL_SLOTS`, like `EQUIP_SLOTS` and `RUN_SLOTS`.
A fourth is one entry, never a fourth named field. `Character.equipped` is slot
id → skill id and **nothing outside `src/sim/character.ts` reads it directly**:
`mainSkillId`, `equippedSkill`, `slotForSkill`, `equipSkill` are the seam.
`MAIN_SKILLS` is what the main slot takes, and every harness that builds a
character to FIGHT reads that rather than `PLAYER_SKILLS`.

**Every damage number in the game is the main skill's.** A mover deals none and
never will — what a landing does is Slow, which is a keyword and explicitly not
a Splash (defined as damage in a circle).

**A new main skill does not get a new behaviour unless the DELIVERY is new.**
Fireball, Arc Lightning and Lightning Arrow are all `projectile`, told apart by
`params`, tags and their trees. A skill that is an old delivery with new numbers
is a table row.

**A keyword's switches are read by the BEHAVIOUR, not by the skill** — `forks`
and `forkDamage` are read by `projectile`, so Arc Lightning can buy Forks and
Lightning Arrow can buy Arcs. That is the whole return on a keyword.

**Every EQUIPPED slot takes the run's XP** and **`treeGrants` merges every
non-main slot's own web**, both as loops over `SKILL_SLOTS`. Each was a silence
rather than a bug: a mover's allocations never arrived, and its web sat at
level 1 holding one point forever.

**The point cap belongs to the WEB.** `treePointsFor` takes a skillId — a
nine-node movement web under a global 30 is owned outright by level 9.

## Trees and webs

Three shapes, one graph. **How a web is WALKED lives in `src/webgraph.ts`** —
`neighboursIn`, `canAllocateIn`, `canDeallocateIn`, `replayWeb` — over any list
of nodes, because two copies of a reachability rule is one copy that is wrong.

| | shape | points |
|---|---|---|
| skill tree (`src/trees/`) | 3 ways in, a ring of 12, 6 branches, 6 trunk notables | level-funded |
| movement web (`src/moves/`) | 3 arms of 3 | 6 — two whole arms fit, a third never does |
| trade tree (`src/trades/`) | 5 spokes of 4, alternating minor/notable | 10 — five notables is the CEILING |

- **Content only**; `layout.ts` owns every coordinate, in tile units. Give a
  tree a `prefix` no other tree uses — node ids are what a save points at.
- `buildTree` wants six branches and six trunk notables and **throws rather
  than dropping the extras**; the movement and trade webs have their own
  layouts rather than bending it.
- **Distance is the only price.** No spent-point gates: what a notable costs is
  the run of minors in front of it. A twig may only `forkFrom` the twig beside
  it. No ring and no fork on a trade spoke — a link sideways lets a build reach
  a neighbour's far notable without walking its arm, and the arm IS the price.
- **The demo holds every web to its geometry**: no link crosses another, none
  passes under a node it does not join. `spread` keeps nodes apart by what
  their ART spans (`ART_R`), not by one number per pair.
- **Every trade notable changes a RULE, not a number.** This is what the system
  lives on: a trade handing out percentages competes on percentages and one
  wins; a trade that changes what is POSSIBLE cannot be compared. The demo
  fails a notable whose whole content is stat lines.
- **A trade is funded by CHARACTER level** (`TRADE`: one point every 5, capped
  at 10), out of its own budget — funded from skill points, "identity" and
  "generic stats" compete for the same point and the beeline is back.
- **Changing trade refunds every point and costs gold.** `replayTrade` does for
  a trade what `replayTree` does for a skill, through the one `replayWeb`.

## Mana, damage, attributes

- **Every bare skill costs the same PER SECOND** (`MANA.costPerSecond`).
  `SkillDef.manaCost` is per USE, so a slower skill's number is bigger.
- **A node that changes what the skill DOES charges for it** —
  `manaMultiplier`, product merge, on the notables that change the DELIVERY.
  NOT on conditional damage, which moves a number rather than what the skill
  is. The line comes out of `GrantDef.say`, never the node's prose.
- **Mana is bought, never granted.** The pool does not grow with a character
  level; life does. The Aethermancer's `poolFromLife` is bought with trade
  points and lands on the BASE the `mana` stat scales, so it is another road to
  the same purchase.
- **Out of mana you are STARVED, not stopped.** The pool drains to 0, the cast
  happens anyway, and it lands for `MANA.starvedDamage` of your damage —
  everything the build grants, every target it would hit. It also means a
  descent always ends and a headless run can never hang. **The penalty arrives
  through ONE seam**, `starvedMultiplier(grants)`, product-merged and clamped
  to [0,1], asked by the sim, the sheet and the readout alike; nothing may read
  `MANA.starvedDamage` at a call site. It lands in `dealDamage`, so ailments
  and bursts are cut too.
- **A level GRANTS a baseline and SELLS the rest.** `lifePerLevel` and
  `damagePerLevel` are free; `attributePointsPerLevel` is spent by hand. Both
  halves stay: dropping `damagePerLevel` costs a top-band character a third of
  its damage and buys the deep end nothing, and without it a character who
  never touches Strength or Intelligence gets no growth across fifty levels —
  which makes an attribute compulsory rather than a choice.
- **An attribute is stat lines, never a new concept.** `AttributeDef.per` is
  what ONE step is worth under stat names the modifier engine already reads;
  `attributeMod` folds every step into ONE synthetic `RolledMod` the way
  `treeMod` does. **A part-step buys nothing** — `attributeSteps` FLOORS.
- **TAGS are what keep the four attributes apart.** `heroStats` passes the
  skill's tags into the `critChance` computation, so an attack crit chance does
  nothing for a spell. Untagged gear lines reach everything and must stay that
  way.
- **A potion is an effect with a DURATION, never a lump** (`TimedEffect` on the
  hero), because the trade that turns potions into a build's engine hangs BUFFS
  off that shape. **Charges live on `RunState` and never in the save** — the
  demo holds `JSON.stringify(createGame())` to containing no charge count — so
  a descent always starts full.
- **One rule fires a potion and it is the rule a harness runs.**
  `RunSim.stepPotions` is the only implementation of the player's threshold. A
  press is QUEUED and drained at the top of the next tick, never applied where
  it arrives, or the seed stops replaying.
- **A SLOW is set in one place**, `swingCooldown(e)` — written at two call
  sites it reached melee packs or ranged ones but never both. `Entity.effects`
  is ticked for monsters too; it was the hero's alone until something could put
  a `TimedEffect` on anything else.
- **The scene guard is for the SLOT.** `maybeMove` reads whatever fills the
  movement slot, so `if (this.options.scene) return` suppresses every mover
  there will ever be — a mover firing mid-conversation reads as a bug rather
  than as a build.
- **A measured character has NO trade.** `ladderCharacter` does not take one up:
  a trade is a choice, so measuring one would measure the choice rather than the
  rung. What a trade is WORTH is printed beside the deep end and asserted
  nowhere.
- **Block is a SHIELD and nothing else.** `blockChance` is a flat implicit on a
  shield base; no rolled modifier, tree node, trade or unique writes it, so an
  off hand's whole worth is one number you read off the piece. It **stops the
  HIT outright** — no second figure — capped at `DEFENCE.blockCap`, rolled in
  `dealDamage` off `RunSim.rng` and **only when the chance is above zero**, or
  gear would move a seed's replay. Like Armour it is a HIT rule; an Ailment goes
  through it.
- **Hands are a fact about the BASE.** `GearBase.hands`, read through
  `isTwoHanded`, never a tag on the item and never a family name. `handClash`
  is the ONE answer to what an equip empties; the displaced piece rides the same
  undo the replaced one does, and an equip is refused only when there is nowhere
  to put what comes off — never because the arrangement is illegal.
- **A two-handed weapon is never in a MEASURED set.** `starterLoadout` skips
  one so every band is compared across one arrangement. What a bow trades an off
  hand for is a BUILD, and a measurement may not pick a build.

## Keywords

`KEYWORDS` in `src/keywords.ts` is the vocabulary and **the only way any of
these things may be said**. A keyword pays off because learning it once works
everywhere; the day one talent says "+1 Arc" and another says "leaps to one
more enemy", the player has learnt one of two vocabularies.

- **`means` carries its own numbers out of the tables the sim reads**
  (`PROJECTILE`, `DEFENCE`, `MANA`, `POTIONS`), never a figure quoted by hand.
- **`kin` is a keyword that is a KIND of another** — saying Burn satisfies a
  node granting an Ailment switch.
- **`BANNED` is every retired phrasing and the keyword that replaced it.** The
  demo sweeps every tree node, movement node, trade node, skill, currency,
  quest, modifier line and `GrantDef.what`. It also holds a node handing over a
  keyword's SWITCH to naming that keyword — "+1 Pierce" is compulsory.
- **A banned entry is a PHRASE, never a bare word with an innocent use.**
  `leap` mapped to Arc forbade the movement skill Leap from saying its own
  name; it is `leaps to` / `leaping to`. Banning a word people work around
  makes the check something people work around.
- **Every Projectile lands for full damage.** Pierce and Arc keep their falloff
  because those are the same shot carrying on, and each has a notable buying it
  back.
- **Widening a Spread is worth nothing on its own.** Measured: with N extra
  Projectiles there are almost always N enemies inside the bare radius, so a
  wider one changes which enemies only if the PICK changes too. Any "reaches
  further" node on a picker with a target CAP has the same hole.

## The Fissure, crystals and reward

Four sockets. **Count is how long a run is; MODIFIERS are the whole of how hard
it is; LEVEL is only capacity (1–4 → 0–3 modifiers); FAMILY is only which
monsters spawn.** Nothing else makes a monster stronger. Composition also picks
the ZONE (`mapTheme`, `MAP_THEMES`).

- **The pools weigh the same per monster**; Demonic and Prismatic carry AURAS
  and the Fissure does not, so the worlds are a ladder. Normal keeps its reason
  to exist through TWO uniques of its own.
- **An element belongs to the MONSTER.** `MONSTER_ABILITIES`, rolled per PACK
  (a pack throwing two elements reads as noise). **`MonsterDef.throws` splits
  the table on the `skill` field through the one seam `abilityFor`**, and
  **every family has exactly one thrower** — load-bearing, not flavour: measured,
  a pool with no thrower deals about HALF what it did, which put both aura
  worlds under the Fissure and broke "Normal is the shallow end".
- **A monster skill has no `category`**, which is the whole of what keeps it off
  the Skills screen.
- **A crystal ADDS damage, never converts it.** A share of what a monster
  already hits for, dealt as one type on top of its own — the hit is still
  multiplied by (1 + share/100), so `DANGER_STATS` weighs it exactly as before.
  Three modifiers, one per element, because a name saying Cinders over a roll
  saying cold lies about which resistance to bring. `monsterFire` keeps its
  stat id from when it was a conversion — a save points at rolled stat ids.
  **Weigh a stat by the arithmetic it does, not by the story about it**:
  dropping that weight on the assumption added damage is softer flattened the
  reward ladder until band 6 paid no more than band 5.
- **Danger only counts what the sim still reads.** `DangerStat.cap` is where a
  stat saturates and `crystalRewards` scores the capped amount, so four wards
  of one type are paid for as one. A new danger stat that saturates needs its
  `cap` written down with it.
- **Power buys access; composition and modifiers buy payment.** Item level and
  what a band can drop come off `POWER` alone and nothing else may move it.
  `FAMILY_YIELD`, `REWARD.mixYield` and the finding modifiers pay in currency
  and rarity instead.
- **`DropGate` says a thing does not exist in this run at all** — `minPower`, a
  `zone`, or both — and the pool is filtered before the pick, so no amount of
  rarity argues with it. **It must never be strictly better to run an easier
  map.**
- **The deep end is not a band.** Power is clamped at `POWER.max`, so the top
  drop band is reached long before danger runs out; past it danger pays in
  RARITY off `payingDanger`. `deepestSet` is the only thing that builds it.
- **A crystal levels only while SOCKETED**, per clear × danger. A tier rewrites
  base, name, quality and capacity together and never removes what is rolled.
- **A crystal is never carried, spent, sold or moved.** `carryRoom` is
  `Infinity`; `addItem` routes one to `game.crystals` whatever else is full,
  which is what makes a gift unable to fail.
- **A crystal has LEVELS, never tiers** (`CRYSTAL_LEVELS`, `CRYSTAL_XP`). Gear
  has tiers, mods have tiers and a map has an item level; a fourth ladder called
  tier on the one thing that gains experience was the confusing one, and the
  word never reaches the player.

## Items, currencies, uniques

- **Capacity comes from the BASE's tier and nothing else.** `BASE_TIER_MODS` is
  `[2,4,6]`; `GearBase.slots` says only WHERE a modifier may go. A bigger item
  is a better base, FOUND. The one exception is `sigil_of_upheaval`, which adds
  past the cap and locks the item; the demo holds every other currency to it.
- **Currencies are DATA.** `CurrencyDef` is `targets` / `requires` / `effects`,
  and the named behaviours live in two registries in `src/crafting.ts` —
  `CONDITIONS` and `EFFECTS`. Effects apply in order and roll back whole if one
  fails. Eight currencies in six kinds; **only the adding currency is sold**,
  because a shop stocking the whole bench replaces the map.
- **`meta.corrupted` is the lock.** Anything that "locks an item" sets that
  flag rather than inventing a second one.
- **Uniques are gear that GRANTS.** Fixed lines rolled once by `makeUnique`
  into `implicits`, a `grants` bag out of the same `GRANTS` table, a `gate`, and
  **no modifier slots at all** — capacity is zero and every currency refuses
  one. Every unique is a TRADE, paid for by a downside on the item, and the
  demo holds that. Every world drops something of its own; the Fissure two.
- **A relic is carried to a PERSON, never to a bench.** Its own `ItemKind`;
  `canSell` refuses one, no bulk button sees one, the crafting registries never
  reach it, and its dock column has no click in it.
- **A graft replaces the IMPLICIT** — what the base was FOR goes, and a `FORGED`
  line (weight 0, in `ALL_MODS` so a save resolves it) stands in its place.
  `src/game/graft.ts`, beside `crafting.ts` rather than inside it: every
  `CurrencyDef` is reachable by the bench's registries, and a graft that went
  through them would be a currency that happens to be a man. A **unique is
  REFUSED** (`isUnique` — `makeUnique` puts the whole identity into `implicits`
  and nothing could put it back); the armour rating is not the implicit and is
  untouched; a second graft replaces the first. **`ForgedDef.who` names whose
  room it is written in** — keyed by slot alone, both men offered everything.
- **`heal()` puts a base's line BACK when a forged def is gone** — the one
  repair that heals a MOD rather than dropping the item.
- **The auto-sell filter is clicked in what you KEEP and stored as what you
  SELL.** `KEEP_GROUPS` is DERIVED from `ARMOUR_FAMILIES.archetypes`, the weapon
  families and the jewellery kinds. `GameState.junk` holds what is sold, so an
  empty list keeps everything — which is what a fresh game and every older save
  hold, and a filter can only ever start by doing nothing. Kept when the RUNG is
  kept **AND** the GROUP is, never OR. Read on the way up in `bankLoot` only, so
  a piece already in a container is safe, and a filter sale stays off the
  counter.
- **One comparator orders every pile** (`sortGear`), and **one predicate
  searches one** (`itemMatches`). Sorting and searching never MOVE anything.
- **Selling is undoable and needs room nowhere** — that asymmetry is what stops
  a full bag wedging the loop. `buyBack` costs exactly what the sale paid, so
  the shelf cannot be ground for gold.
- **A button that clears a heap may not eat a decision**: the bulk sell and the
  filter both exclude uniques.

## Saves

**`GameState` is plain data**, `JSON.stringify(game)` into one localStorage key
per SLOT (three, one LIVE). No server.

- **Adding a field costs nothing** — a missing key takes its default.
- **Renaming an id costs the player whatever pointed at it.**
- **Bump `SAVE_VERSION` only when a save must be REFUSED.** That wipes
  everyone; it is the last resort.
- **`heal()` runs on every load** and drops what no longer resolves. It is also
  where a migration goes. **Allocations are REPLAYED through `canAllocate`
  rather than trusted**, so a reshaped tree refunds what it stranded rather
  than leaving a build nobody could have walked to. Same for attributes and the
  trade walk, against the level that paid.
- **Adding a container is three places**: the field on `GameState`; `heal()`;
  and the demo's "every collection a save can hold items in claims its ids"
  list, which proves the id counter moved. Miss the third and a save hands out
  an id the next item reuses. **`addItem` and `bankLoot` both have to route the
  new kind** — the banking path had it wrong once and a relic landed in the
  gear bag.
- **A MODE may never be saved; a PREFERENCE is.** The test is whether it
  changes what a CLICK means. `armed`, `selling`, `handover`/`banked`/`pending`
  are modes and stay module-local; `parked` sits beside `keys` and `potions`.

## Scenes and bosses

**A scene is a `RunSim` over an authored map** — `RunOptions.scene` names a
`SceneDef` and the constructor calls `sceneMap` instead of `generateMap`. Both
renderers draw one with no changes, which is why a room with a fight in it is a
filled-in field rather than a second engine. **Nothing may introduce a second
way of doing any of it.**

- `sceneMap` sits BESIDE `generateMap` and shares `carveRoom`.
- **No rng.** A plan is absolute tiles and a cut is hashed off the tile it lands
  on, so a place is the same place every time BY CONSTRUCTION — stronger than
  seeding it, and a parameter nothing reads lies about what varies.
- **A scene has no exit**: `GameMap.exit` is the entrance.
- **`RunState.folk` is who is in the room**, a LIST and out of `monsters`,
  because nothing in combat may ever see a person.
- **`src/sim` never decides that a scene happens.** `finish()` in `src/ui/run.ts`
  does, off `sceneWaiting` — which is why the whole of it leaves every headless
  harness alone.
- **`sceneWaiting` returns AT MOST ONE scene per clear**, highest rung first and
  never rolled, and it ASKS `giftWaiting` rather than replacing it. **A scene
  never schedules a scene** — asked at the end of a DESCENT only.
- **A boss is NEVER in `MONSTERS`** (`BOSSES` is its own table, `MONSTERS` is
  the pack pool). Life, damage and size are multipliers on `MONSTER_BASE` like
  every other body, so it scales with the socketed set.
- **A boss room is a DESCENT** — loot banks, the clear counts, it lands on the
  same report — but it ends in **its OWN terminus**, never through `finish()`:
  routed there it took the chaining branch and dropped into a hole with nothing
  at the bottom. A scene also skips `spawn()`, which is where a kill's PRICE was
  set, so a boss room paid nothing until `priceKills` came out.
- **The reinforcement clock STOPS when the boss dies**, and that is the
  termination proof. Killing it is the objective; the adds are pressure.
- **A boss KEY is a wallet entry in its own table** (`BOSS_KEYS`, never
  `CURRENCIES`) — a real currency is reachable by the bench's registries, which
  is a bench that can pour a key onto a helmet. `heal()` learnt that second
  table or it deleted the key on every load. It drops off a DESCENT and never
  out of a room, only once its boss is down; it is spent at the LAUNCH, so
  abandoning costs the way in.
- **A boss is scheduled and marked at the CLEAR, never at the door**, or a room
  you died in would be gone forever.
- **A boss is automated like every other room**, and the universal-automation
  rule has no exception any more. What answers a boss is the BUILD: move speed
  and a mover carry you clear of a slam, enough plate lets you stand in one, and
  a build with neither does not come back up. `ladderCharacter` takes a
  `BuildShape` so the demo can measure exactly that, rather than measuring a way
  of playing.
- **A SLAM is a HIT and armour blunts it; the Reading is a drain and goes
  through**, exactly as an ailment does — `bite`'s third argument. That split is
  the whole of why plate answers one of them and nothing else in the room.
- **`RunSim.stalled`** is both the slam commitment and the daze, which is what
  makes the damage window a window rather than a number you have to be told.
- **`resolveOverlap` gives a boss weight 0** — what cannot move hands its half
  of the overlap to whatever is standing in it, or it is slowly leaned into a
  wall.
- **`RunSim.reachTo` adds whatever a body is BIGGER than an ordinary one to
  both ends**, so two ordinary bodies stay exactly `attackRange` apart. Measured
  centre to centre a colossal body can never touch anything: separation holds it
  further off than its own reach, so it walked in, was shoved out, and did that
  forever.
- **`wayOut` costs EVERY way clear of the circles by how far it leaves you from
  the boss** and takes the cheapest, which is usually sideways — straight away
  is the shortest ray and the worst one.
- **The boss's BODY is an obstacle nothing else in the sim knows about.**
  `findPath` reads walls and a boss is not one, so nearest-to-the-boss was the
  ray straight INTO it: he pressed in, `resolveOverlap` handed the whole overlap
  back, and he did that until the circle went off — measured at 67.5% of every
  dodging tick. `inBody` refuses a way out inside it and `throughBoss` prices one
  reachable only through it as the far wall, which leaves the ways along the rim.
- **A hazard the walk refuses is asked WAS HE ALREADY IN IT, one hazard at a
  time.** Rolled into a single predicate, standing in a circle licenced a step
  into the body — and Stone stands in one for whole fights. Rolled the other way,
  `slideRound` refuses every direction the moment a circle lands on him.

## The loop

`src/ui/run.ts` owns it: `launch()` builds a `RunSim` and ticks, `finish()`
banks and decides whether another descent follows, `land()` is the one terminus
every ending arrives at. **The sim never learns about presentation** — a
transition, a panel, a freeze are all the UI declining to tick. There is no
pause state and there is not going to be one.

- **A cleared descent launches the next by itself.** Not a setting; `smoke`
  holds `#run-repeat` to not existing. **Leave after this run** banks the
  descent you are in, **Abandon** pays nothing — the same rule as dying.
- **Death costs only the run you died in and stops the idle loop.** Stopping the
  loop is the real teeth.
- **A descent ends at a place you walk to.** The flood finding nothing reachable
  puts the hero on a walk to `map.exit`; `FINALE_RANGE` triggers the closing
  encounter, `AT_EXIT` clears the run, and a route that does not exist is the
  same answer as being there already. `s.totalMonsters` counts the whole
  encounter the moment it starts, or the readout ticks down and then climbs.
- **Bags overflow rather than losing loot.** There is one container.
  `bagsFull` is read BETWEEN runs and never during one, so a descent's drops
  arrive whole and a bag ends a floor at 35/32.
- **Crystals are given, never bought**, in person, at the end of a cleared
  descent — so a gift is never a hazard, and the loot was banked before anybody
  spoke. **Scheduled, never rolled**: a player who cannot tell whether the next
  crystal is two runs away or twenty cannot plan the only decision the game
  asks for. `giftWaiting` is asked AFTER `buildReport`, so the level that
  descent just bought counts.
- **The one arranged roll** is `crystal.meta.scripted` — on the ITEM rather than
  the currency, so a Shard of Making behaves identically everywhere else.
- **A quest is `need`, a list of clauses ANDed**; `kind` names an entry in
  `QUEST_CONDITIONS` and the rest is that condition's parameters, so a new
  objective is one registry entry and one table row. A clause naming a kind not
  in the registry is never met, and the demo holds the table to it.
- **Every key but Escape is a `BINDINGS` entry.** Nothing else may read a key
  literal, including hints, which print `keyName(keyFor(...))`. The listener
  ignores everything while an input has focus.
- **A measurement names the POOL, never a row in it.** `PLAIN` in `src/demo.ts`
  is the first Normal monster, not an id — six call sites held one and cutting
  the roster broke all six at once, as a crash rather than a failed check.
