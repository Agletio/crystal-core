# Crystal Core — Rules

**Always true. Read this before touching anything.** `ROADMAP.md` is the list of
work; this is the set of things that hold whatever the work is. Nothing in here
is a task — if something here stops being true, it was a mistake, and the fix is
to restore it rather than to update this file. A rule that the user CHANGES gets
rewritten here in the same breath.

Rules with exceptions say so. An exception is written down beside the rule or it
does not exist.

---

## The cycle

One phase at a time, and **no stop between them**. Every pass:

1. **`git fetch` and check you are standing on the tip of the branch.** A
   session's clone is taken when its container starts and the branch moves
   under it — so the `ROADMAP.md` you were handed can list phases that are
   already built, in a file whose own copy is out of date. This has cost a
   whole phase's work once already: it was rebuilt from scratch, tested, and
   thrown away on discovering it had landed hours earlier. `git log --oneline
   -15 origin/<branch>` reads the phases that have landed, and a commit message
   here names what it did in the roadmap's own words. If the local branch is
   behind, reset onto the remote tip and read the roadmap AGAIN before picking
   anything.
2. Read this file, then `ROADMAP.md`. `CLAUDE.md` is loaded for you.
3. Pick the **lowest-numbered phase** in the roadmap that is not blocked on an
   open question, and do the WHOLE of it. Not part. They are one ladder — the
   game gets rooms you arrive in and people standing in them — and that order is
   load-bearing, so read the roadmap for the count and the reason rather than
   trusting a number written here. The balance pass is written up there too, and
   is not a phase until somebody asks.
4. Leave the full suite green: `comments`, `typecheck`, `mods`, `build`,
   `smoke`, `shots`, `drag`. Build before the last three — they load the
   bundle, not the source.
5. Commit and push. Push BEFORE starting the next phase, so the next session
   to fetch sees the work rather than rebuilding it — and because a session's
   checkout is not guaranteed to survive: this working tree has been observed
   resetting to the commit it started from, twice in one session, taking every
   uncommitted and unpushed file with it. Both times the recovery was
   `git fetch && git reset --hard origin/<branch>` and nothing was lost,
   because each phase had been pushed as it went green. A phase's worth of
   work held locally is a phase's worth of work you may be asked to do again.
6. Update `ROADMAP.md`: delete the phase, renumber the rest, move anything that
   turned out to be wrong into its Open questions, and write down anything the
   next session would otherwise have to rediscover. Update this file if a rule
   changed or a new invariant now holds, and `CLAUDE.md` if the GAME changed —
   between them those two files are the answer to "has this been built already",
   so a phase that lands without them updated is a phase somebody does twice.
7. **Start the next phase immediately.** Same turn, same context, no pause.

**Finishing a phase is not a stopping point.** It is the signal to begin the
next one. Do not end the turn to report what was done, do not ask whether to
carry on, and do not wait to be told to. Say what the phase did in a couple of
lines if it is worth saying, and keep working in the same breath. A pass that
ends with "Phase N is complete — shall I continue?" has broken this rule.

Exactly three things end a session, and none of them is a finished phase:

- **The roadmap holds nothing but questions.** Say so and list them. Do not
  invent work to fill the gap, and do not promote something out of the backlog
  without being asked.
- **A question needs answering** — see below.
- **The context runs out.** That is the harness's call, not a decision.

**Ask in a plain message, never through the multiple-choice popup tool.** It is
not always being watched and it times out, which loses the question. Write it in
the reply, stop, and wait. Once it is answered, carry on without stopping again
— pausing between phases is not wanted; a question is.


---

## Design decisions

Settled. Do not relitigate without the user saying so.

**This is a DESKTOP game and mobile is deferred.** The user's call, made
outright: they are done working on mobile for now. So stop paying for it —
hover is allowed to carry meaning, an icon may rely on a keybind, and no layout
gets contorted to survive 390px. Anywhere a rule in this file is justified by
"it works on a phone", the rule may still be a good rule, but the phone is no
longer the argument for it.

**What mobile costs later is a SHELL, not the screens, and that stays true for
free.** One module per screen in `src/ui/`, each rendering CONTENT into ids the
markup owns, with position and size in CSS — that is already how this codebase
is built, and only four modules touch geometry at all (`tooltip`, `skills`,
`menu`, `inventory`), each for a reason. Keep it that way and a
mobile version later is new CSS and a new shell over the same screens. So the
one rule is: **do not bake a position into a content module.** That costs
nothing today, because it is already true. Anything more than that — responsive
breakpoints, touch gestures, a second layout — is not being paid for now.

**It may be packaged as a standalone app one day, and it is already shaped for
it. Do not add a shell to make that truer.** Three things make a web game
wrappable and all three are already true: `build` is one esbuild command to one
static `docs/app.js` with no server behind it, storage is behind the single
private `store()` in `src/game/save.ts` with every consumer going through the
exported API, and nothing talks to a network. Wrapping it later is a shell
loading `docs/index.html` plus swapping that one function for a file-backed
one — so the work is ALREADY done, and there is nothing to buy by doing it
early.

So: **`requestFullscreen()` is the whole of the browser's answer**, and to
develop against something that looks like the shipped thing, run Chromium with
`--app=<url> --start-fullscreen` — no tabs, no URL bar, no install, no
dependency, and each change is a rebuild and a reload. An Electron or Tauri
shell buys nothing over that for layout work, since Electron IS Chromium in a
bare window; add one when a NATIVE capability is actually needed (saves on
disk, a Steam SDK), not to preview a layout. It would also be a thing no
harness here could keep green: this is a headless container, and the suite
drives headless Chromium.

What this costs going forward is one rule: **assume nothing a shell would not
have.** No URL bar, no browser back button, no tab title, no difference between
being served and being opened from a file.

**The game is meant to be WATCHED, and the screen has to allow it.** Automation
is universal, the loop relaunches itself, and no build's power may depend on the
player being present — so the payoff of assembling a build is seeing it work.
There are two ways to play this game, menus and watching, and any change that
serves the first at the cost of the second is taking from the half that has
less.

**The map is the SCREEN and the panels float on it.** `body.mapfull` is the one
switch, off `syncViewportLock`. Three rules keep it working and each was a bug
first: the stage is UNDER the shell, so every structural wrapper needs
`pointer-events: none` and the leaves take one back — hit testing asks what is
on top, not what is opaque, and forgetting it kills drag, zoom and follow
together. A fixed box at `bottom: 0` is still pushed by its own margin. And a
rule for a floating element loses every specificity tie to the class it shares
markup with, so `.hp.xpbar` and not `.xpbar`.

**A screen is a WINDOW; only a question stops you.** No scrim, click-through
layer, card takes the pointer. `.modal--stop` is the short list that blocks,
and it is now TWO: a confirm and the welcome. Anything new is a window unless
it is asking something.

**A scene does not need a scrim, because a scene IS a stop.** The Lampwright
left that list when he got a room: nothing is ticking, the map is not yours to
click, and painting a sheet over the workshop hid the only thing the room was
built to show. What he says is a bubble over his own head and the panel is the
last of those bubbles — same anchor, same layer.

**ON TOP means touched last, and it is one mechanism.** `src/ui/windows.ts`
holds the stack; touching a card raises it, opening one is touching it, and
`topWindow()` is what Escape answers. A hand-written chain of `isXOpen()` checks
is what this replaced, and with several windows open it shut the one you were
not looking at. The z-indexes are a BAND from `Z_BASE`, under the rail — the
rail is how a screen is opened and shut, so nothing may ever cover it — and
`.modal--stop` sits above the whole band, or a scrim is a sheet you can read a
raised screen through.

**A window is dragged by its HEAD, and the drag is a DELTA.** `--wx` / `--wy` on
the card, with the transform behind `.win--moved`: the default position stays in
CSS, so a window nobody moved is exactly where the layout put it and a default
that changes still reaches one that has been dragged. The class gates the
transform because a transform makes a card a containing block for anything fixed
inside it. A control on the head is a control, not a handle; a double-click on
the head puts a moved window back; and the clamp keeps the head on screen,
because there is nothing else on a window that moves it. Where a window sits is
NOT saved — the good default is what most players never drag away from — but
`--dock-h` is measured against the dock's HOME rather than where it has been
dragged, or nudging one window reflows every other one.

**The map is the GROUND, not a screen.** `override ?? screenHandler ?? base`.
The run sets `base` on every phase change; a screen sets `screenHandler` when it
takes focus. Both in one slot and a descent ticking over takes the dock off
whatever screen is holding it — which reads as flaky rather than broken, because
it needs a clear to land while a screen is open.

**A rail button's ID outlives its presentation.** `open-shop`, `open-craft`,
`open-character`, `open-save` and the rest are what every harness names.
Rearrange the bar freely; renaming an id is a much bigger job than it looks.

**Anything drawn per frame must UPDATE, not rebuild.** `renderFlasks` builds and
`syncFlasks` updates, and the split is not tidiness: rebuilt sixty times a
second, a press that straddled a rebuild landed on a node no longer in the
document, and the threshold buttons did nothing at all for as long as they
existed.

**A button that clears a heap may not eat a decision.** Both bulk sells —
the shop's and the haul's — exclude uniques, because a named piece is only ever
a decision. Selling one is still a menu action on the piece.

**The worlds are a ladder, not three equal opponents.** The pools weigh the same
per monster, but Demonic and Prismatic carry auras and Normal does not, so they
are harder — and they pay in currencies Normal does not. Normal keeps its own
reason to exist through drops nothing else has: it is the only world with TWO
uniques of its own, which is the debt that paid.

**Death** costs **only the run you died in** and **stops the idle loop**. Not
the crystals, not the gear, and not the haul banked from earlier clears.
Stopping the loop is the real teeth: a set you cleared four times and died on
the fifth is a setup problem you have to go and fix rather than eat repeatedly.

**Crystals level by being used**, only while socketed, per run cleared and
multiplied by the set's danger. Levelling a blank costs a socket that could have
carried danger.

**It must never be strictly better to run an easier map.** Rewards read run
power, and the best items are hard-gated by `DropGate` — below the threshold
they are not in the pool at all, so no amount of rarity argues with it.

**Power buys access; composition and modifiers buy payment.** Item level comes
off power alone. Nothing else may move it.

**Bags overflow rather than losing loot.** A run that drops five items into one
free slot does not destroy four of them. You triage before continuing.

**Crystals are given, never bought.**

**A relic is carried to a PERSON, never to a bench.** `RELICS` is its own table
and `'relic'` is its own `ItemKind`: `canSell` refuses one, no bulk button can
see one, and the two registries in `src/crafting.ts` never reach it. It is loot
and lands in the haul; `GameState.relics` is where it lives once taken out, and
`carryRoom` is `Infinity` there for the reason it is for a crystal — nothing
sells one, so a cap could only throw loot away. Its dock column has NO click in
it: the only thing you can do with one is walk it to somebody.

**A graft replaces the IMPLICIT, and that is the whole trade.** *The user's
answer, asked and given.* What the base was FOR goes and a `FORGED` line stands
in `Item.implicits` in its place. A unique is
REFUSED, because `makeUnique` puts a named piece's entire identity into
`implicits` and no currency in the game could put it back — `isUnique` is the
test and missing it ruins saves. The armour rating is not the implicit and is
not touched. A second graft replaces the first, so a first one is never a
mistake nobody can walk back, and `item.meta.grafted` marks it so the card stops
calling it "base".

**A line belongs to the person who writes it.** `ForgedDef.who` names a room,
and `forgedFor` / `graftRefusal` / `graftable` all take it. The man who takes
bodies has no opinion about a ring and says so in his own beats, so the panel
has to agree with him — a single table keyed only by slot would have both of
them offering everything and neither of them meaning what they said.

**Jewellery has no implicit, so a graft there ADDS.** *Decided, and the phase's
own note.* That makes a ring the one slot where a graft costs no base line —
so the line that changes the DELIVERY charges `manaMultiplier` for it, which is
the rule the trees already follow, and conditional damage stays free. Giving
jewellery implicits is a balance change and belongs to the balance pass.

**A graft is not a currency.** It happens in a room, spends a relic and one
piece, and writes the line — `src/game/graft.ts`, beside `crafting.ts` rather
than inside it. Every `CurrencyDef` is reachable by `CONDITIONS` and `EFFECTS`,
whose `clone` goes straight past `implicits` on purpose; a graft that went
through them would be a currency that happens to be a man.

**A LINE may grant, through the one table everything else grants through.**
`ModDef.grants`, merged by `treeGrants` off what is WORN, exactly as a unique's
is. Each obeys every rule a tree node's grant obeys: declared in `GRANTS`, read
by a behaviour a player can actually pick, and `say` printing its own number out
of the table the sim reads. A stat line needs none of this — `statMods` already
reads implicits exactly like rolled mods, and its own comment says so.

**`heal()` puts a base's line BACK when a forged def is gone.** The first repair
in the file that heals a MOD rather than dropping an item: without it the piece
keeps a hole where its base line used to be and nothing can ever fill it.

**A forged line never drops.** Weight 0, so the weighted pick can never reach
one; in `ALL_MODS` anyway, so a save resolves it and `npm run mods` holds it to
landing, doing something and reading.

**A crystal has LEVELS, never tiers.** Gear has tiers, mods have tiers and a
map has an item level; a fourth ladder called tier on the one thing that gains
experience was the confusing one. The word never reaches the player — the
base ids are still `crystal_t1`..`crystal_t4`, because a save points at them
and renaming one costs the player that crystal for no gain.

**Mod capacity comes from the BASE's tier**, and from nothing else: t1 holds 2,
t2 holds 4, t3 holds 6. Item level still decides how good a roll can be. No
ORDINARY currency raises it — you go and find a better base, which is what
makes farming duplicates the thing the gambling currencies are for. The one
exception is `sigil_of_upheaval`, which may add a modifier past the cap and
locks the item for doing it; the demo holds every other currency to the rule.

**Only the adding currency is sold.** Everything else drops. A shop that stocks
the whole bench is a shop that replaces the map.

**Every crystal is handed over in person, in a room you came up into.** At the
end of a cleared descent that owes something you drop into the hole exactly as a
chained descent does, and come up in the Lampwright's workshop rather than in
the next map — so a meeting is always the END of a run and never a hazard inside
one. It is granted at the panel rather than paid out by the report, which is
what keeps a gift a gift; and because the descent was cleared and banked before
anybody spoke, that loot can never be lost to it. Nothing about a crystal
arrives as a line in a report.

**A gift is scheduled, never rolled.** What decides whether the Lampwright is
waiting is a condition you can read on a screen — how many descents you have
cleared, a quest you finished — and never a per-descent chance. A player who cannot tell whether the
next crystal is two runs away or twenty has no way to plan the only decision
the game asks them to make.

**Every number is said out loud.** Nothing the player reads may describe a
quantity in words when it has a figure behind it. Never "more damage" — "35%
more damage". Never "another cast" or "an extra cloud" — "+1 cloud". Never "a
third more ground", "hits harder", "grows again". If a line cannot name its
number, the line is describing the wrong thing.

This is about MECHANICS, not about voice. Flavour has no number behind it and is
not covered: the Lampwright says what he sees, a unique's own line is a line
about a dead man, an encounter's herald announces an arrival the kill readout
counts a second later, and none of them is a stat. The test is whether a player
could act differently knowing the figure — if yes, the figure goes in.

**One word per mechanism, and it is the ONLY word.** `KEYWORDS` in
`src/keywords.ts` is the vocabulary — Projectile, Pierce, Arc, Spread, Repeat,
Burst, Splash, Cloud, Ailment and its three kinds, Area of Effect, increased,
more, Critical, Resistance, Armour, Slow, Starved, Charge. A keyword is worth
something only because learning it once pays off everywhere: the day one talent
says "+1 Arc" and another says "leaps to one more enemy", the player has learnt
one of two vocabularies and the whole idea is gone. `BANNED` is every phrasing
that has been retired and the keyword that replaced it, and the demo sweeps
every tree node, movement node, trade node, skill, currency, quest, modifier
line and `GrantDef.what` for one. It also holds a node handing over a keyword's
SWITCH to naming that keyword — "+1 Pierce" is compulsory, not a style.

**A banned entry is a PHRASE, never a bare word that has an innocent use.**
`leap` mapped to Arc, which forbade a movement skill called Leap from saying
its own name; it is `leaps to` and `leaping to` now, which is the sentence that
actually means Arc — and Arc's own `means` line still says "leaps from what it
hits", which is where the idea lives. Banning a word people have to work around
makes the check something people work around.

**A definition carries its own numbers, out of the table the sim reads.**
`KeywordDef.means` interpolates `PROJECTILE`, `DEFENCE`, `MANA` and `POTIONS`
rather than quoting a figure by hand — the same discipline as `GrantDef.say`,
and for the same reason: a glossary that repeats a constant is a glossary that
lies the first time the constant moves.

**A keyword is shown, never hidden behind a second hover.** `.tip` is
`pointer-events: none` and that rule outranks this one, so a word inside a
tooltip can never be hovered again. `src/ui/glossary.ts` marks it where it
appears and prints what it means at the bottom of the SAME card. A keyword the
player has to go and look up somewhere else is a keyword they will not learn.
This one SURVIVES the desktop-only decision: the reason is the mechanical one
above — a tooltip cannot be hovered — and the phone was only ever the second
argument for it.

**Every Projectile lands for full damage.** The falloff on extra Projectiles is
gone, and with it the notable that removed it — a keyword promising a thing is
thrown promises the thing lands. Pierce and Arc keep theirs (70%,
`PROJECTILE.pierceDamage` / `.arcDamage`) because those are the same shot
carrying on, and each has a notable that buys it back to full.

**Widening a Spread is worth nothing on its own.** Measured: with N extra
Projectiles there are almost always N enemies inside the bare 3.5 tiles, so a
wider radius changes which enemies only if the PICK changes too. `spreadFar`
is why Scattershot is a notable rather than a dead point, and the demo's
"every notable changes the cast" check is what caught it.

**The demo sweeps it**, over every tree node, every currency, every quest and
every aura: a line with no digit in it fails. Three things are deliberately out
of that sweep and must not be "fixed" into it — a conversion node, which
changes WHICH damage type and names no amount; the two currencies that act on
every modifier or on no particular one; and the flavour above. `GRANTS[].what`
is out too, because it describes a switch with no value attached — see below.

**No build's power may depend on the player being present.** This is an idle
game whose every balance number comes from headless runs — the ladder grids,
the quest timings, the termination check. A build that only pays out while
somebody is watching is a build no harness can hold, which makes it a build
nobody can tune. So automation is universal and never a build choice: anything
a player can do mid-descent has a shipped default policy, that policy is what
`runToCompletion` runs, and the two are ONE implementation. The reward for
watching is the small gap between a threshold and a person, and it stays small
on purpose — five or ten percent, not thirty.

Nothing hidden and nothing to aim at, either: a policy can see everything a
player can, so any advantage a player has here is judgement rather than
reflexes. Keep it that way — the day something needs positioning or aiming,
this rule stops holding and the harnesses stop meaning anything.

**NOTHING TEACHES, and that is the user's call.** *"I wanna start from scratch
with it honestly. Like its just kinda all broken. Remove it all, and once all
the systems are in place and we see how the intro plays out then we add it in
small parts as needed."* `src/ui/tutorial.ts`, `TUTORIAL_STEPS`, `GuideCtx`,
`body.guided`, `.guide-on`, the spending lock and the `#guide` card are all
gone, and so are the probes and the walkthrough that watched them. The point is
to see what the game is like with nothing explaining it, and that is not visible
while any of it survives — so do NOT put back a smaller tutorial, a hint bar or
a first-run tooltip. Teaching comes back as a QUEST LOG, in small parts, driven
by what actually confused somebody. `ROADMAP.md` holds that phase, and it waits
until the opening has been played.

**Nothing is ever prevented.** A new character lands at the Fissure with every
screen live, every purchase spendable and no card in the way. Whatever teaches
next may not reintroduce a cage — a log that greys out what you have not been
told about is the same cop out in a new coat.

**The sheet splits what is TRUE OF YOU from what is true of a SKILL.** The run
panel carries three skill icons under the xp bar, one per `SKILL_SLOTS` entry;
hovering one says the short version and clicking opens the sheet at
`skillSectionId(slot)`. The sheet's general stats keep life, armour,
resistances, move speed, regeneration and the mana pool — everything that is
still true whatever you are holding — and each equipped slot gets its own
section for the numbers that would be different for a different skill: the
damage breakdown, mana per use, damage per second, crit chance and damage,
casts or attacks per second, reach. With three skills equipped a mixed sheet
cannot even be written down, which is why the split exists. An empty slot
prints `SkillSlotDef.blurb` rather than a dark square.

**A character holds THREE skills, in a slot table.** `SKILL_SLOTS`, like
`EQUIP_SLOTS` and `RUN_SLOTS` — a fourth is one entry, never a fourth named
field. `Character.equipped` is slot id → skill id and nothing outside
`src/sim/character.ts` reads it directly: `mainSkillId`, `equippedSkill`,
`slotForSkill` and `equipSkill` are the seam. `MAIN_SKILLS` is what the main
slot takes, and every harness that builds a character to FIGHT reads that list
rather than `PLAYER_SKILLS` — a passive has no damage to measure.

**A skill that never casts reaches the sim through GRANTS.** `SkillDef.grants`
is merged by `treeGrants` for every equipped slot but the main one, out of the
same table a tree node and a unique use. A passive with a switch nobody reads
is a slot spent on nothing, and the demo holds it to being declared and to
saying its own numbers.

**A MOVER reaches the sim through its own web, and the XP that funds it comes
off every equipped slot.** Two changes, and each was a silence rather than a
bug: `treeGrants` merged the MAIN skill's tree alone, so a mover's allocations
never arrived; and only the main skill took a run's XP, so a mover's web sat at
level 1 holding one point forever. Both are loops over `SKILL_SLOTS` now, and
both are generic over a fourth slot. "Committing to one skill advances its
tree" is about the MAIN slot and is not bent by this — you hold one mover.

**A movement web is THREE ARMS OF THREE over six points.** Its own layout in
`src/moves/layout.ts`, beside the trade's and the tree's, sharing
`webgraph.ts` and `webart.ts` with both. Nine nodes and six points, so two
whole arms fit and the third never does: which two is the decision, and no
level ever takes it back. `buildTree` is not bent to fit — it wants six
branches and six trunk notables and throws rather than dropping the extras.

**The point cap belongs to the WEB, not to the game.** `treePointsFor` takes a
skillId. `MAX_TREE_POINTS`' own comment is that a tree you can fill in is not a
decision, and a nine-node web under a global 30 is owned outright by level 9.

**A MOVER deals no damage, and a landing never will.** Every damage number in
the game is the main skill's, so what a landing does is Slow — a keyword, and
explicitly NOT a Splash, which is defined as damage in a circle. A mover has no
`changes` class on any of its switches either: `INTERACTIONS` is the audit of
what two DELIVERY switches on one CAST come to, and a mover has no cast. The
demo derives that exemption from `SKILL_BEHAVIOURS` rather than from a second
list, so a skill that never casts is exempt by construction.

**A skill with no web EQUIPS rather than descending.** "No web yet" is a promise
the game is not going to keep for a passive, and a dead end is worse than a
verb. Displacing what is in the slot asks first, because swapping the skill you
are holding is not what a click on a list means.

**The Skills screen opens at the TOP.** Where you were last time is not where
you are going, and a screen that reopens three deep hides the two questions
above it. Escape still steps back a level, which is `skillsEscape`.

**A SLOW is set in one place.** `swingCooldown(e)` is the only answer for a
body with a skill and a body without — the rate was written at two call sites,
and anything touching one of them reached melee packs or ranged ones but never
both. `Entity.effects` is ticked for monsters too now; it was the hero's alone
until something could put a `TimedEffect` on anything else.

**The scene guard is for the SLOT.** `maybeMove` reads whatever fills the
movement slot, so `if (this.options.scene) return` suppresses every mover there
will ever be. The demo holds each of them to it: a mover firing
mid-conversation reads as a bug rather than as a build.

**A passive is a TRADE.** That is what makes it worth a slot rather than a free
percentage. Killing Surge gives up crit damage entirely for a window of more
damage, and both halves are one grant — half-applying it would be a character
that paid and got nothing.

**Mana is bought, never granted.** The pool does not grow with a character
level. Life does, and one that grew alongside it would leave the cost
meaningless by level 10 — the whole pressure is that casting more, or casting
something bigger, gets paid for. Gear reaches it through the modifier engine
like every other stat, and so does Intelligence. The Aethermancer's
`poolFromLife` is not an exception: it is bought with trade points, and it lands
on the BASE the `mana` stat scales, so it is another road to the same purchase.

**A trade is funded by CHARACTER level, out of its own budget.** `TRADE` in
`src/data.ts` — one point every 5 levels, capped at 10. Fund them from skill
points and the beeline is back: on one tree, "specialist identity" and "generic
stats" compete for the same point and the play is the cheapest path to the
payoff. Two trees cannot be compared, so the identity is chosen on taste and
the stats on arithmetic, and that separation is the whole mechanism.

**A trade tree is FIVE SPOKES OF FOUR, alternating minor and notable.** Its own
geometry in `src/trades/layout.ts`, not `buildTree`'s six branches. Twenty
nodes, ten of them notables, ten points — so five notables is the CEILING and
every other node out is one. No ring and no fork: a link sideways would let a
build reach a neighbour's far notable without walking its arm, and the arm is
the price. The demo holds it to the same geometry as a skill web — no link
crosses another, none runs through a node it does not join.

**Every trade notable changes a RULE, not a number.** This is the rule the
system lives or dies on. A trade handing out percentages competes with the other
on percentages and one of them wins; a trade that changes what is POSSIBLE
cannot be compared to another one. The demo fails a notable whose whole content
is stat lines.

**A trade reaches the sim through the same table as everything else.**
Declared in `GRANTS`, read by STATS so it works whatever the skill's delivery
is — a switch only one behaviour read would be a trade you had to pick a skill
for — and merged by `treeGrants` as a third SOURCE beside the tree and what is
worn. `tradeGrants` in `src/trades.ts` is that source; nothing downstream learns
the word "trade".

**Changing trade refunds every point and costs gold.** `tradeSwitchCost`. A hard
lock would be the only unforgiving thing in a game where `heal()` refunds what a
reshaped tree stranded and allocations are replayed rather than trusted — and
`replayTrade` in `src/game/save.ts` does for a trade exactly what `replayTree`
does for a skill, through the one `replayWeb` both call.

**How you GET a trade is a PLACEHOLDER and says so on its own screen.** Anyone
may take one up. It is meant to come out of a storyline with the Lampwright that
is not written; that story replaces the ACQUISITION and touches neither the
tree, the points nor the allocation. Do not quietly promote the placeholder into
a design.

**A measured character has NO trade.** `ladderCharacter` does not take one up,
and the demo holds it to that: a trade is a choice, so measuring one would
measure the choice rather than the rung. What a trade is WORTH is printed beside
the deep end as a kill rate and asserted nowhere.

**A trade may FAVOUR a skill; it may not have exactly one.** A pairing being
stronger than another is the system working — what would be wrong is a trade
with a single correct skill, which makes it a skill node that got lost. **It is
not a bar anything clears today.** Three main skills is too few to tell a
favourite from a requirement, so the demo PRINTS what each trade is worth per
skill and asserts nothing about the spread. Do not tune to that print, and do
not add a check that fails on it; it becomes answerable when the roster is wide
enough for the difference to show.

**How a web is WALKED lives in `src/webgraph.ts`,** over any list of nodes:
`neighboursIn`, `canAllocateIn`, `canDeallocateIn`, `replayWeb`. A skill tree
and a trade tree are different content on the same shape, and two copies of a
reachability rule is one copy that is wrong. `src/ui/webart.ts` is the same
answer for the stud art both webs are drawn out of.

**A level GRANTS a baseline and SELLS the rest.** `LEVELLING.lifePerLevel` and
`LEVELLING.damagePerLevel` are the baseline, handed over for nothing;
`attributePointsPerLevel` is the layer you spend by hand. Both halves stay:
measured, dropping `damagePerLevel` costs a top-band character a third of its
damage (554 → 370) and buys the deep end nothing at all (5/12 either way), and
without it a character who never touches Strength or Intelligence gets no
damage growth across fifty levels — which would make an attribute compulsory
rather than a choice.

**An attribute is stat lines, never a new concept.** `AttributeDef.per` is what
ONE step is worth, written under stat names the modifier engine already reads,
and `attributeMod` in `src/sim/stats.ts` folds every step into ONE synthetic
`RolledMod` the way `treeMod` does. Anything downstream that had to learn the
word "attribute" is a seam in the wrong place.

**A part-step buys nothing.** `attributeSteps` FLOORS. Points short of a whole
`ATTRIBUTE_STEP` are banked toward one, which is what lets a step be worth
enough to build around, and the demo holds the 4th point to changing no stat
and the 5th to changing them all.

**Tags are what keep the four apart.** `heroStats` passes the skill's tags into
the `critChance` computation, so a critical chance tagged `attack` does nothing
for a spell — the same seam `areaOfEffect` and the damage passes already ride
on. Untagged gear lines are unaffected and must stay that way.

**Points are REPLAYED on load, never trusted.** `replayAttributes` in
`src/game/save.ts` does for attributes what `replayTree` does for the tree: an
attribute that is cut, or a level curve that moves, hands the points back. A
character holding points no level ever granted is the failure this prevents.

**Every bare skill costs the same per second.** `MANA.costPerSecond`.
`SkillDef.manaCost` is per USE, so the table holds three different figures only
because the cast rates differ; a skill that is deliberately expensive is a
decision, and `MANA.costTolerance` in the demo is what would have to be told
about it.

**A node that changes what the skill DOES charges for it.** `manaMultiplier`,
product merge, on the notables that change the DELIVERY — a burst, a sweep,
another projectile, another cloud. NOT on conditional damage, which moves a
number rather than what the skill is. The line the card prints comes out of
`GrantDef.say`, never out of the node's prose, so what is charged and what is
said cannot come apart.

**Out of mana you are STARVED, and never stand still.** The pool drains to 0
and the cast happens anyway at `MANA.starvedDamage` of the damage — your own
skill, its delivery, its grants, its targets. Running dry is a cost you may
choose to pay, not a wall that deletes the build you walked to, and scaling
damage is a real answer to it because the penalty is on damage and nothing
else. A character that stops attacking is a run that never ends and a harness
that hangs — the demo holds one with no pool at all to finishing its descent,
dead or cleared, casting every swing starved.

**The penalty arrives through ONE declared seam.** `starvedMultiplier(grants)`
in `src/sim/grants.ts` is `MANA.starvedDamage` times the `starvedDamage` grant,
product-merged, clamped to [0, 1] — and the sim, the sheet and the readout all
ask that one function. A mana job with a huge upside and a bigger downside is
planned; moving what running dry costs must stay a table entry. Nothing may
read `MANA.starvedDamage` at a call site.

It lands in `dealDamage`, not in a behaviour, so ailments and bursts are cut
with everything else — no corner of a build runs dry for free.

**A potion is an effect with a DURATION, never a lump.** `TimedEffect` on the
hero, `PotionDef` in `src/data.ts` saying which pool it fills and by what share
of that pool per second. Built as an instant heal, the trade that turns potions
into the character's engine would be a rewrite instead of a table row, and that
trade is already designed.

**Charges are a descent's BUDGET, never a stockpile.** They live on
`RunState.charges` and nothing about them reaches the save — the demo holds
`JSON.stringify(createGame())` to containing no charge count at all — so a
cleared descent always starts full and there is nothing to hoard between runs.

**One rule fires a potion, and it is the rule a harness runs.** The threshold
is the player's (`GameState.potions`, defaulting to `PotionDef.threshold`), and
`RunSim.stepPotions` is the only implementation of it — so what a watching
player gets and what `runToCompletion` measures cannot come apart. A press is
QUEUED and drained at the top of the next tick, never applied where it arrives,
or the same seed stops replaying the same run.

**Balance is NOT TUNED, and a balance number never blocks a phase.** Standing,
and it is meant to outlast a context clear. Lean too easy — too much currency,
characters too strong, every wall softer than it ought to be. Systems are still
going in and each one hands out more power than the last (attributes, then
trades, then jobs), so anything tuned now is tuned against a game that does not
exist yet and gets thrown away. There will be a balance pass when every system
is in, and it is a phase of its own.

Until then:

- **No phase stops because a difficulty or reward measurement moved.** Measure
  it, PRINT it, and carry on. A phase that ends with "this made the deep end
  easier" has done its job and said so.
- **The demo's balance checks report rather than fail.** Anything asserting a
  TARGET — the share that gets through the deep end, what a band clears, the
  Seam's margin, the share of swings that go unpaid — is a `gauge()`, not a
  `check()`. `gauge` prints `· ` where a check prints `✓`, it never touches the
  exit code, and the line CARRIES the number and the figure that was wanted, so
  the balance pass has a before and an after to read. Deleting a measurement to
  silence it is the one wrong answer.
- **Eight of them**, and they are the whole list: the naked character's life
  left and the blank-crystal rung under `THE LADDER`, the band ladder and the
  deep end beside them, the Seam's margin under `FAMILIES`, the unpaid share and
  what a starved cast lands for under `MANA`, and what a trade is worth at the
  deep end under `TRADE RULES`.
- **What still fails is MECHANISM.** A run that does not end, a determinism
  break, a step nobody can finish, a screen that overflows, a modifier that
  does nothing, a save that cannot be healed. Those are bugs at any balance.
- **One difficulty check stays a failure:** a brand new character clearing the
  bare Fissure. A game you cannot start is not a balance question.

### Room for a fifth socket

Wanted eventually, still unspecified. Two rules keep it cheap, and both are
already followed — do not undo them:

1. Sockets are a **slot-def list** (`RUN_SLOTS`, mirroring `EQUIP_SLOTS`), never
   four named fields. A slot accepting something other than a crystal is one
   table entry.
2. The family split is derived from **the number of filled crystal sockets**,
   never from the constant 4. Otherwise a fifth socket silently rescales every
   composition in the game.

---

## What the art is made of

Read this before touching any of it. A session that does not know these things
will make the same mistakes twice.

**There are no image files.** `docs/` is exactly `index.html` and `app.js`, and
`app.js` is committed because Cloudflare runs no build. Every sprite is a list
of strings — one character per pixel — drawn at runtime onto an offscreen canvas
by `drawPixels` in `src/render/sprites.ts`. Adding a binary asset is a change to
how the game ships, not an art decision.

**A sheet is drawn on FIRST USE, never all of it at boot.** `makeSheet` memoises
per creature and rank, and pixi uploads its textures on the same schedule — an
eager loop in either place pays the cost back. Measured: 243 sprite cells at boot
became 1, and a whole 20-second descent draws 30. A descent reaches about eight
creatures, so drawing the table costs the bestiary to open one map.

**The generator is an MCP SERVER, and the REST API is a fraction of it.**
`https://api.pixellab.ai/mcp`, guide at `/mcp/docs`, configured in the committed
`.mcp.json` which expands `${PIXELLAB_API_KEY}` rather than carrying a token.
`create_character` takes a rigged template and every direction at once,
`animate_character` queues states against a stored character, and
`create_topdown_tileset` returns a WANG set whose corners match. None of that is
in the REST spec, and a whole session was spent working around its absence. The
REST spec also LIES: `/rotate` documents 16–200 and takes only 128, 64, 32 or
16. Reach for the MCP tools first; `tools/art/*` still holds the CONVERSION,
which is worth keeping whatever does the asking.

**The MCP TOOL LIST IS NOT THE WHOLE API.** `https://api.pixellab.ai/mcp/docs`
points at `https://api.pixellab.ai/v2/llms.txt`, and
`https://api.pixellab.ai/v2/openapi.json` is the same thing machine-readable.
Most v2 endpoints are the MCP tools renamed, but `POST /transfer-outfit-v2` has
no MCP tool: it applies an outfit from a REFERENCE IMAGE across animation
frames, which is the one reskin that is anchored to a picture rather than to a
prompt. **Read both pages before deciding a thing cannot be done** — three
sessions have now lost time to a capability sitting in plain sight, and the
third was this one.

**The MCP tools may not be in a session's tool list, and that is not a
blocker.** The server answers plain JSON-RPC over ONE POST returning a single
`data:` line, with no session to hold — `tools/art/mcp.mts` is that, and
`callTool` reaches every tool the client would have. Storage REFUSES the key: a
bearer token on a `backblaze.pixellab.ai` URL is a 401, and only
`api.pixellab.ai` is told who is asking.

**Generated art is QUANTISED to a palette of its own.** An export's colours are
not a palette — three frames of one body arrive with more distinct RGB values
than there are characters to name them — so the commonest are the key and
everything else snaps by redmean. `Inks` in `tools/art/tables.mts` is two
passes for that: `note` every pixel, `settle`, then `char`.

**A generated body has named STATES; a hand-drawn one has walk-walk-swing.**
`GeneratedArt.states` maps a name to a RUN of indexes in the one flat `frames`
list, and `generatedFrame` picks among them off what the body is DOING. A state
is named for an ACTION — `idle`, `walk`, `attack` — or for the SKILL it uses,
which is looked up FIRST, so fire, frost and lightning are three animations.
`cast` is the fallback and only reached for a SPELL: the hero carries both a
swing and a cast, and without that test it would cast while swinging a sword.
A further state is a row in `tools/art/generated.json` and a change to nothing.

**Nothing may ask for a frame nobody DREW.** `makeSheet` builds one canvas per
frame and `framesOf` is the count; it was the constant `CREATURE_FRAMES` = 3,
so every index past the second fell through `frames[frame] ?? frames[0]` to the
standing pose and a generated body's swing and cast NEVER drew — what looked
like an attack was `drawEntity`'s lunge with nothing behind it. The demo sweeps
every action, skill and facing and fails an index past the end, and it fails a
frame that ships which nothing reaches.

**A BODY IS ONE FACING, and the renderer mirrors it.** `face` in `bodies.json`
is `south-east` — an angled side profile, front on enough to read a face but
turned well round toward side-on — and `facingRow` answers row 0 for a
single-direction body while the renderer flips anything facing left. Two
directions for the price of one. **Every quality failure the five-facing era
had was a facing other than this**: a walk that came back a standing pose on
four facings of five, a south run that kicked one leg. It is also 5x off both
the generation cost and the source. *The user's call, and the reason to hold
it: "more side profile than that but not all the way".*

**A body's GRID follows how big it is DRAWN, so one art pixel is one size
everywhere.** About 32 art pixels to the tile: a `scale` 1.45 body is grid 48,
the Heap at 1.9 is 64, the Gaunt at 3.2 is 96. Left at a common grid the Gaunt
was drawn at two screen pixels per art pixel where everything else was at one,
and no sampling rule can hide that — it is simply half the resolution. The
generation size is the grid, so the conversion is 1:1 and exact.

**A body's FACINGS are the east half of the compass and nothing more.**
`GeneratedArt.dirs` runs north to south; the renderer mirrors anything facing
left, so generating the western three is paying twice for the same pixels.
`frames` is direction-MAJOR and the runs are the FIRST facing's, so a facing is
one stride along the flat list and every reader stays flat. `facingRow` folds
an angle into that half and buckets it.

**A generated body is drawn at its OWN grid, never `CELL`.** The camera lands
one in about 87 device pixels, so 256 was downsampled before anybody saw it —
and at five facings a body is ninety canvases at four bytes a pixel. `GRID` in
`tables.mts` is 96 for the same reason, Pixi scales by the texture's own
width, and `GLOW.reach` is scaled by `grid / CELL` or the light swallows it.

**A design is APPROVED before a rotation is paid for.** `create_image_pixflux`
draws one sprite from text for ONE generation in about thirty seconds;
`create_character(mode='v3', reference_image_url=…)` then rotates that exact
sprite into eight directions for two more. So the order is design, approve,
rotate, animate — and a body nobody likes costs one generation rather than
thirty. Judging a full character and then throwing it away is what this
replaces.

**`mode` decides the BODY and `proportions` decides the HEAD.** `standard` is
the default and is template-based: one rigged skeleton posed over and over, so
every body it draws shares a silhouette whatever the description says. `v3` is
free of the template. `proportions` defaults to a preset whose skull is about a
third of body height, and only `standard` reads it — `v3` and `pro` ignore it,
along with `text_guidance_scale`, so with v3 the words are the only lever.

**A generated body will not go DARK on words alone, and a forced palette is the
lever that works.** Asked twice with the whole warm family excluded by name, v3
returned ivory both times. `color_image_url` takes a palette as an image — a
data: URI is accepted — and every body forced onto one came back dark and
stayed dark. Every zone floor is pale by decision, so a body that is not dark
does not separate from any of them.

**Only the EAST half is animated.** `directions` on `animate_character` takes a
list, the renderer mirrors anything facing left, and the western three are the
same pixels paid for twice — 37.5% off every animation. And a body is rotated
at 96, which is the grid it ships at: at 128 an animation costs two generations
per direction instead of one, for detail the camera never shows.

**What a body COSTS, measured rather than quoted.** One design, two to rotate,
and five generations per animation over five directions — about **30
generations for a finished body** with five states. A roster of twenty is
around 600, not the 1,200 written down before any of it had been run.

**A rotation's SIZE comes from the reference image, not from `size`.** The
wanderer was asked for at `size: 96` off a 128 design and came back 128x128.
A design is drawn at 128 and a body ships at 96, so the two always disagree and
the design wins — which costs two generations a direction for every animation
after it, **1.78x the source per body**, and the size is inherited by every
`create_character_state` of that character. `body.mts rotate` resamples the
design to `size` before it sends it, and that is not optional.

**AN EDIT IS CONSISTENT WITHIN A CALL AND NOT ACROSS ONE.** `edit_image` applies
one edit to a LIST of frames and the docs sell it for "a character's
directions", which is true and stops at the call boundary: five facings split
4 + 1 — because 4 is all a call takes at that size — came back as one brimmed
helm and one visored helm, on the same description and the same seed. **Anything
that has to MATCH goes in one call**, and a body's frames never fit in one. So a
frame list cannot dress a body, and `create_character_state` is what does: one
edit across every rotation, one charge, identity kept.

**How many frames a call takes is a STEP of their size** — 16 at 64 and under, 4
up to 128, 1 above — because the grid is 512x512 laid out 4x4, 2x2 or 1x1.
Billing follows the grid rather than the count: 20 generations for one frame and
40 for four. **An over-long list is refused BEFORE billing and the refusal names
the number**, so this is measured rather than guessed, for nothing.

**A multi-frame result is ONE INDEXED DOWNLOAD.** `get_image` answers `frames: N`
and a single `download:` url, and the frames past the first are reached by
appending `?index=N`; a one-frame job carries no index at all. Looking for a url
per frame finds none, which reads as "never arrived" on a job that completed and
billed. Handle both forms or pay twice.

**AN EDIT REPAINTS THE WHOLE FRAME, so a dressed frame minus its base is not a
piece of armour.** Asked for a helm alone and forbidden to touch anything lower,
24% of the changed pixels landed on the head and 18% on the boots, and a higher
threshold does not concentrate it. Nothing about the prompt fixes it — the model
re-renders, it does not paste. **A per-slot layer cut out of one is a route this
repo tried and abandoned**, and it is why the hero wears his trade rather than
his gear: a whole-body look needs no layer at all.

**Two animations of one body may not START with the same words.**
`animate_character` dedupes on a `type` it derives from the FIRST ~30
CHARACTERS of `action_description` — `[type=custom-staying in strict side
profile]` — and a second ask matching that prefix is refused with a hint rather
than an error, which reads as success. Nine of nineteen animations vanished
that way in one run, because "staying in strict side profile" is the single
highest-value phrase and every attack, cast and death opened with it. It still
belongs in the description; it belongs after a clause that is the animation's
own. The queue asserts the prefixes are distinct before it fires.

**A state names WHICH WINDOW of its animation to keep.** A generation degrades
across its run and the tail is where it goes: a walk grows a crook, a swing
turns to face the camera, an ask naming a weapon the rotation does not hold
draws a different one per frame. `from`/`to` are fractions and they are not a
nicety; which part is usable is a fact about that generation and belongs beside
its id. Ask in `mode: 'v3'` from a written pose — a template animation is a
lurch — say "staying in strict side profile", and keep `frame_count` low.

**A body can DIE and can FLINCH, and neither was reachable until it was
wired.** Death is not an `EntityAction` — it is a state of a body, so it rides
on `Cel` as `dead`/`dying` and plays over `DEATH_FADE`. `hurt` IS an
`EntityAction` and the sim has always set it on every hit; nothing read it.
Both play their run ONCE and hold on the last frame, through `once()`, which
the swing shares: a fall that loops is a body getting up again.

**A body that has not seen you PACES, and stays where it was put.** `pace` in
`src/sim/run.ts`: an anchored wander inside `WANDER_REACH` of the spot it was
placed, at `WANDER_PACE` of its chase speed, resting between steps. Standing
perfectly still reads as a prop; a pack that walks somewhere has left the room
it guards, so `home` is the anchor and the reach is about a tile. It moves by
`nudge`, never `glide` — `nudge` tests the whole BODY against the rock where
`glide` tests a centre — and the demo holds all three halves: that it stirs,
that it stays, and that it is never in rock.

**There is ONE movement state and a body may not be given a second.**
`EntityAction` has a single movement action and both a wander and a chase draw
it, so one of a walk and a run would never draw and the "every frame that ships
is reached" check fails. The state is named `walk` for the ACTION, not for the
gait — **the hero's is a RUN**, because his `moveSpeed` says he is running, and
the monsters' are hungry strides because theirs say they are not. What the pace
changed is that a SPLIT is now possible; adding a second movement action is
still a change to the sim, the manifest and every body's ask.

**NOTHING is labelled as a shooter, because the body says it.** The pip over a
thrower's head is gone and so is `castsVisibly`: only a body marked `throws`
can throw, there is one per family, and each has its own animation for every
bolt it carries. A label doing a silhouette's job is a label to delete the
moment the silhouette can do it.

**A gait is measured in GROUND COVERED, never in seconds, and the unit is the
CYCLE.** `STRIDE_CYCLE` is tiles per whole gait cycle and `Entity.walked` is
what a body has actually covered. Off the CLOCK a body skates. Per FRAME — which
is how it was written — the frame COUNT decides the gait: six frames carry a
body half again as far per footfall as four, for no reason but how many pictures
were kept. `GeneratedArt.stride` is the per-body override and `strideOf` divides
it down.

**A body's stride is MEASURED off its own art, never assumed.** The feet at
their widest is one step and two of those is a cycle, which is the distance the
animation depicts; `stride` is what the body actually travels, and the two have
to agree or it slides — over-travelling it skates forward, under-travelling it
skids back. **The single per-frame constant matched no body in the game**: five
over-travelled by 72-93% and the Gaunt under-travelled by 28%, which is why
everything had always looked slightly wrong and nothing could say why. `npm run
demo` prints depicted against travelled for every body and every one reads 0%
off. A ROBE defeats the measurement — the Shroud reads 0.66 because its hem
hides its feet — so a body whose legs you cannot see keeps the default and says
so.

**And the ANIMATION has to depict the kind of motion the speed implies.** At
`moveSpeed` 3.4 the hero covered over a tile a footfall, which is a RUN; drawn
as a tired trudge it read as skating however well the stride matched. Gait is
two numbers and they are independent: how far a step carries you, and how often
you take one. **Check both arithmetically before re-rolling art** — footfalls a
second is `moveSpeed / stride * 2` — because no amount of re-generating fixes a
number.

**A transform may not stand in for a frame that exists.** The lunge toward a
target and the bob under a walk were the only motion a hand-drawn body had;
over a real swing they are a second motion fighting the first, which is the
shove-the-model-forward look. `animates` asks whether there are frames for what
the body is doing, and the demo fails one that is still being moved.

**A tile is keyed by CORNERS in base three, and a key nothing draws is a HOLE.**
0 floor, 1 rock, 2 the cut face: a deep-walled set puts that third value at a
vertex and the cliff fills the cell below the boundary, so a wall spans two
rows. `wangNear` falls back through floor and then rock, because a set may have
no tile for a given cliff corner and a missing one is a gap in the ground.

**A tile may not be TURNED and two sets may not be mixed on an edge.** A floor
tile is lit from one side, so a rotated one clashes with its neighbour and the
floor reads as a checkerboard — worse than the repetition it was meant to fix.
An edge tile carries the cut face and its neighbour has to continue it. **The
one exception is the FLANK of a hole**, and it is narrow for exactly the reason
the rule exists: a wall hanging inside a hole has no neighbour to agree with.

**Repetition is answered with LIGHT, since it cannot be answered with tiles.**
A Wang set has one picture per corner combination, so an open floor is that
picture in every cell. `GRAIN` in `pixi.ts` rises and falls over about three
tiles of smooth value noise and reads as damp, as dust, as where the roof came
down — out of the same one tile. It is read BETWEEN the noise's own cells:
sampled at them it is a chequerboard of its own.

**Rock stands DOWN, and its own set will not do it.** A set is drawn to be
looked at as terrain, so its stone is lit like the floor and is often lighter;
laid flat across a map that reads as chambers punched out of a paved field.
`ROCK_TOP` knocks every wall cell back and `ROCK_REACH` runs it to nothing over
three tiles off the floor, which leaves a lit rim and dark past it.

**A per-tile tint is a BAND, never a gradient.** Three tiles of falloff along a
wall is a staircase of flat rectangles, and against an irregular room edge that
is a chequerboard of grey boxes. So the light is not a tint: `lightMap` writes
one texel per lattice CORNER and the GPU interpolates, which makes every
falloff smooth and the wall's own shadow the rock's dark bleeding half a tile
onto the floor. A texel is a COLOUR, so a flame WARMS its corner of the room
rather than only clearing the dark out of it.

**A cut-face key with no ROCK at any corner is not drawn.** `wangShadow` names
them: the cell BELOW a cliff, which a deep-walled set draws as its own flat
rectangle of shadow, and a run of those along a wall reads as paving laid at
the foot of it. It falls back to plain floor and the renderer shades that row.

**A sprite id may be in ONE table.** `monsterArt` asks `BEASTIARY` before
`GENERATED`, so an id in both is a generated body that never draws, silently —
it cost a whole session's judgement of generated art, which was made about the
hand-drawn `husk` throughout. The demo fails a shared id.

**A body is LEVELLED onto the roster's own brightness at import.**
`BodySpec.luma` in `tools/art/generated.json`, applied by `tables.mts` over
every frame of one body AT ONCE — a gain computed per frame makes a walk
flicker as the arms swing, which is `fittedTogether`'s fault in another
currency. Bodies asked in the same words land different distances from black:
the first three skeletons measure luma 30-35 and three later ones arrived at
43-56, which is one family in two exposures. It is a TARGET rather than a gain,
so a body re-generated brighter still lands with the roster.

**A measurement names the POOL, never a row in it.** `PLAIN` in `src/demo.ts`
is the first Normal monster rather than `MONSTER_BY_ID.grub`, and `mods-check`
asks the same way. Every measurement that wanted "an ordinary monster" named
one, and cutting the roster to six broke all six of them at once.

**A monster is drawn out of EITHER table, and at least one is generated.** The
demo holds both halves: every monster and boss resolves in one table or the
other, and at least one is generated at a generated body's `scale` — a body left
at the doll's 1 renders a third smaller than the pack it stands in.

**A generated CHARACTER is not permanent, and the grid is what ships.** Several
this repo generated came back `not found` from the server, taking with them any
chance of re-converting or extending those bodies. Nothing was lost, because
what ships is the converted grid in `src/render/generated-art.ts` — which is the
whole reason the pipeline converts rather than fetching. `tables.mts` takes
`bodies`, `tiles` or `props` so one dead row cannot stop the other two tables
being written, and it names the body rather than failing on a missing rotation.

**How far a thrower stands off is ONE answer.** `thrownReach(skill)` — the
skill's own range, plus two for noticing you. It was written by hand at three
call sites and a fourth was about to be added; a new thrown ability is a table
row and nothing else.

**The fit MARGIN is the rank glow's room and nothing else.** At `rings * 4` a
generated body spans 69% of its grid where the hand-drawn doll spans nearly all
of its 24, so one rendered a third smaller at the same `scale` — invisible
until something correctly sized stood next to it. It is `rings * 2`, and a
generated body still wants a bigger `scale` than the doll does.

**Frames of ONE body are fitted TOGETHER, never one at a time.** `fitted`
measures the frame it is handed, so per frame a walk cycle is scaled and
re-centred on every step and the body jitters against its own feet.
`fittedTogether` takes one box over every frame and one transform for all of
them — which is also what lets frames off two canvas sizes (a template
animation comes back at the character's size, a v3 one larger) keep their
sizes relative to one another.

**WHAT THE HERO LOOKS LIKE IS HIS TRADE, not his gear.** *The user's call, and
it overturned the requirement that came before it: "Ok maybe let's just scratch
the per equip and make it per trade? Like custom appearance for each trade?"* So
equipped gear does not change the sprite, a helm is a stat line, and the only
thing on screen that reads as identity is what the character has BECOME. It fits
what a trade already is — funded by character level, surviving every skill you
swap to, the part of a character that is not the skill.

**A trade look is a WHOLE BODY and a STATE of the base man.** Which makes it the
monster pipeline and nothing new: `create_character_state` off the one rotated
wanderer, so every trade is recognisably the same man in different kit and none
can drift into being a different person. No layers, no crops, no anchors — those
were the per-slot route and it is gone. **No trade is the base man himself**,
ragged and empty-handed, so you start as nobody and taking up a trade is what
dresses you.

**AN ASK THAT NAMES NO LIMB ONLY WORKS IN SIDE PROFILE.** The hero's walk was
"walking forward at a tired trudge, head down, rags swaying at the hem", which
came back a real stride on the EAST facing and a standing pose on the other
four — he slid. A side profile makes a stride obvious and a front or a back view
does not, so a facing where the motion is hard to see needs it spelled out: one
leg swinging past the other, the knee lifting clear of the ground, the opposite
arm swinging with it, shoulders dipping. **This is invisible to every other
check** — the frames are all there, all distinct and all reached. `npm run demo`
PRINTS how far each body's walk moves per facing as a share of its own ink; the
roster runs 27-66% and the broken one ran 1-7%. What to read is one facing far
below the same body's own best. It prints rather than fails because the Heap is
a fused mass whose 1% is honest.

**An animation is JUDGED on ONE facing before the other four are paid for, and
the judgement is the point.** Of the hero's six states, three came back wrong
from a first ask: the death never left its feet, which is the "a body will not
lie FLAT" trap; the flinch barely moved; the swing read as a reach. The fix was
not new prose — it was the rule already written here. **Vary the sentence that
already worked.** The Gaunt's death, hurt and attack `say` strings ship and
work, and with the pronouns changed they worked for a living man too: he pitches
forward, drops to his hands and knees and comes to rest flat. `body.mts state`
takes state NAMES so a re-roll pays for what failed, and `delete_animation`
clears the group first.

**THE HERO IS GENERATED, and `heroSpriteFor` is the one place that chooses.**
`src/sim/appearance.ts` answers the trade's own `TradeSpec.sprite`, then the
base man `wanderer`, then the doll — so a look nobody has generated is a
hand-drawn hero rather than an empty tile. `run.ts` sets `Entity.look` ONLY for
the doll, because an empty `Look` still draws one, and a generated body takes
`scale` 1.5 where the doll takes 1.15.

**The DOLL is still there and is the fallback.** `heroArt` builds him from
`BODY` in `src/render/body.ts` posed by `POSES`/`SWING_POSES`, with
`gear-art.ts` — 1,409 lines — drawing armour as LAYERS over him at `DOLL_GRID`
24, and `lookOf` turning what is equipped into a `Look`. Nothing outside the map
draws any of it: swept, and the only readers beyond those two files are the
demo's own checks. So it goes in ONE piece when it goes, and it does not go
until every trade has a look — until then a trade with no sprite is the base
man, which is correct rather than a gap.

**`BodySpec.frames` is the count KEPT, not the count generated.** `spread` in
`tables.mts` resamples a state's window down to it, so trimming a body costs no
generations at all — and the hero shipped 36 frames a facing before anybody
looked. He is 21 now: the monsters' 14 with more walk and more swing, because he
is the body on screen every second. **Measured, that is 1.3 MB of source against
a monster's 0.8**, and ten trade bodies would be about 13 MB on top of the 4.67
already there. The source size is the wall, and the frame budget is the lever.

**Ten trades is a SOURCE SIZE problem and two is not.** A body is ~0.8 MB at
grid 96 and six already cost 4.67 MB; eleven hero bodies would add about eight
more. What gives — fewer states, fewer frames, a smaller grid for looks, or the
no-binary-assets rule — is a decision to take with a measurement in hand, and
the first trade look is what measures it.

**A generator is an AUTHORING tool, never a shipping format.** `tools/art/` is
the pipeline and its output is a character grid like every other — generated,
converted, reviewed, accepted, and committed as TypeScript. Every standing rule
survives that way: no binary assets, colours out of CSS at runtime, zones
recolouring for free, the canvas2d fallback untouched. An atlas is the right
answer at tens of thousands of sprites and the wrong one at ~300, because it
trades the runtime palette away to solve a problem this game does not have.

**`tools/art/manifest.json` is the source of truth, not the images.** A sprite
is a ROW; generation is a pure function of that row and content-addressed on its
hash, so nothing is paid for twice. The converted GRID is written back into the
manifest, which is what makes the PNG disposable — `tools/art/cache/` is
gitignored and a cloud VM is reclaimed on inactivity. Re-generating a row that
has already been converted spends a generation for nothing.

**One module knows the generator's API**, `tools/art/pixellab.mts`, so swapping
one costs a file. It is written against the spec at
`https://api.pixellab.ai/v1/openapi.json`, which is READABLE — the old egress
block is gone and `curl` answers 405 rather than 403. Two things it settles:
`color_image` takes a forced palette as an image, so a creature is asked for in
its own inks rather than only snapped to them; and `/v1/balance` reads `$0.00`
while generations work, so balance is not a gate and a spent tier is a 402 on
the generate call.

**A conversion is INTEGER, or it is refused.** Block-average down to the grid
and snap to the creature's five authored inks. A non-integer downscale resamples
across pixel boundaries, which is the blur pixel art exists to not be — the tool
throws rather than producing something plausible. Generate at a multiple of the
grid; `image_size` takes 16–400, so 48px into grid 24 is a factor of 2 and there
is no reason to generate big.

**The generator is asked for BODY inks, and the outline is DERIVED.** Measured
twice: offered the outline ink as one of five equals it fills whole bodies with
it — 96% of one creature came back near-black — and denied it entirely it draws
no edge at all. So `paletteAsk` sends the four body inks weighted, and
`outlined()` in `convert.mts` walks the silhouette and puts `#` on every body
pixel touching transparency, INSIDE the edge, the way the hand-authored art does
it. An outline is a house rule; a rule is not something to ask a generator for
and hope. The forced palette is otherwise exact — measured at 100% on-palette at
every size, so the ink-snap is very nearly a no-op and what limits a sprite is
COMPOSITION rather than colour.

**`no_background` is not always obeyed, so the ground is FLOODED away.** At 256
the generator returned a creature on a solid field. `debackground()` runs before
the reduction, and only when under 2% of the canvas is already clear: it floods
inward from the EDGES rather than replacing the colour globally, or a body pixel
that happens to match the ground goes with it.

**A creature may carry its OWN key.** `BeastArt.key` merges over the hand-drawn
five, which were `monsterArt`'s palette and never a limit of anything that
draws. An export of 64 colours takes 64 characters and is not quantised.

**Nothing derives an outline, and a rank is LIGHT.** The art carries its own
edge; one added on top is a slab, and grown inward it eats a thin limb whole. A
rank is `glowed` in the texture with alpha falling off squared — a solid border
is a low-resolution convention that reads as a sticker once the art is not
chunky.

**Generated art carries no accent and no halo.** `x`, `b` and `o` are applied at
RUNTIME off `MonsterRank`, so the converter emits none of the three and the ask
is for one flat creature with no glow and no rim light — art arriving lit makes
every rank look the same. What is REVIEWED is the converted grid, never the PNG:
the conversion is lossy and the grid is what ships.

**Colours come from CSS at runtime.** `readPalette` pulls custom properties out
of the document, and every art key maps a character to a `Palette` entry or a
`mix()` of two. Never write a literal colour into art code: a palette change has
to redraw everything, and that property is worth more than any single sprite.

**Only Pixi draws sprites.** `src/render/pixi.ts` is the real renderer;
`src/render/canvas2d.ts` is a fallback that draws coloured circles with a facing
tick and has no sprites at all. Sprite work is not visible in the fallback,
and that is correct — do not "fix" it. MAP work is the exception: decals are
shared pure functions, so both renderers get them.

**The title is a PICTURE, drawn out of the decals rather than of gradients.**
`src/ui/titleart.ts` paints one 2d canvas behind `#title`: the Cavern top left,
the Rot bottom right, and a front across the diagonal that neither of them holds
straight. It reaches for `floorColour`, `tileDecals` and `livingDecals` — the
same pure functions both renderers stamp — so the two halves are one generator's
stone drawn two ways, which is the whole reason it is worth drawing rather than
faking. A CSS gradient is cheaper and looks like a CSS gradient.

**Two palettes over ONE grid, and the mixing stops at the title.** Every one of
those functions takes the `FloorPalette` as a parameter, so a picture that
changes world across itself costs neither renderer a line and `src/sim` nothing
at all. A `GameMap` still carries a single `theme` and no map generalises this
— a title background is a picture, and the sim does not draw pictures.

**A still, painted once per size.** No renderer boots behind the title and
nothing ticks: `livingDecals` is drawn at one instant of its own clock, and a
resize repaints rather than animates. Measured at 30–38ms for 77×49 tiles at a
device ratio of 2, in headless Chromium with no GPU — two frames, once, before
anything is playable. Dismissing the title sets the canvas to 0×0, because a
screen of rock at twice the device ratio is megabytes nobody will look at again.

**The front is DISPLACED, never straight.** Three terms over the diagonal in
`rotHolds`: lobes several tiles wide, whole holdouts cut off behind the line,
and a per-tile ragged edge. A clean diagonal is a wipe transition and reads as
one; smooth noise on its own reads as a wobble. The interlocking is the point.

**A `<canvas>` is a REPLACED element and `inset: 0` does not size one.** With
`width: auto` it lays out at its own backing store — the viewport times the
device ratio — so a full-screen canvas painted correctly shows its top-left
quarter. `width: 100%; height: 100%` goes with the `inset`, and the same trap
waits for any `<img>` or `<video>` positioned that way.

**`CELL = 256`** is the offscreen cell every sprite is painted into, and the
art grid does NOT have to divide it: `drawPixels` samples per DESTINATION
pixel, so a 24 grid and a 128 one land in the same cell with no seams either
way. **A GENERATED body is painted at its own grid instead**, because a cell is
already bigger than the tile it lands in and one body at five facings would be
a hundred canvases at four bytes a pixel.

**A body samples NEAREST when magnified and LINEAR when minified**, decided per
draw off `e.scale * tile / texture.width`. Nearly every body is minified — a 96
sprite into ~87 device pixels — and linear supersamples it, which is the whole
reason to author above what the screen shows. The Gaunt is the exception at
`scale` 3.2: two screen pixels per art pixel, where linear smeared it to mush
and was the whole of why it looked bad big. Zooming in magnifies everything, and
pixel art magnified wants its pixels. A TILE always samples `nearest`: it is
drawn at or above its own size, so what has to survive is the enlargement.

**Everything is at 24.** All 22 entries in `src/render/bestiary.ts` carry
`grid: 24` and two frames; 21 of them are monsters with an `attack` frame, and
the 22nd is `lampwright`, who is a person rather than a creature and has no
swing. `BeastArt.grid` is per-creature and `DOLL_GRID` is the doll's, and
`wellFormed(frames, grid)` checks each against its own declaration, so a family
can be redrawn without the pipeline caring. Being in `BEASTIARY` does NOT make
something a monster — `MONSTERS` is a separate table, and the demo only asks
that every monster has art, not that every art is a monster.

**A sprite is not a portrait.** Two tables, two grids, two jobs. `BEASTIARY`
is what walks around, at 24, and `beastIcon(id, size)` in `src/ui/icons.ts`
turns one into an inline SVG. `PORTRAITS` in `src/render/portraits.ts` is who is
SPEAKING, at 48, one frame, shoulders-up — `CELL` binds the map's offscreen
canvas and nothing else, so a portrait is free to be bigger than the thing it
stands in for, and the demo insists that it is. `portraitIcon` falls back to
`beastIcon`, so a speaker nobody has drawn yet is a small picture rather than an
empty box. Both read their palette at CALL time, so a colour change reaches
both, and both are held to `wellFormed(rows, grid)` — every row exactly `grid`
wide, trailing dots included.

**A body is told apart by its SILHOUETTE, and at 24 that is negative space.**
The Osteomancer is starved: a head 10 pixels across over a chest of 6, one arm
out and one held in, and gaps you can see the floor through between his limbs
and his ribs. What makes it read is what is not drawn — filled in, he was a
Lampwright in another colour, which is the failure any second character in one
palette walks into. The portrait is its own drawing at 48 and answers to the
same test: he is NARROWER than everyone else in `PORTRAITS`, and the dark either
side of him is the read.

**A sword is held OUT, point slightly up; a dagger is held POINT DOWN.** Both
are deliberate. The swords used to hang point-down from the fist and read as
enormous daggers; the daggers keep that hold because on a dagger it is a
reverse grip and a real way to carry one. A weapon's `strike` is the same blade
levelled and driven forward, so rest and strike are a PAIR — two unrelated
poses snap rather than swing.

**The doll's grip is (17, 14)** and every weapon is drawn against that one
point. `POSES` shifts move it: those numbers are absolute whole pixels, so
anything that changes the figure's size changes all of them.

**A zone is CUT differently as well as coloured differently, and NOTHING is
built.** `CUT` in `src/sim/grid.ts` maps each theme to `dug` (the Fissure: the
rectangle with its corners off and its outer ring worried away tile by tile off
`tileNoise`, so no run of edge is straight), `gullet` (corners off, nothing
else) or `grown` (an ellipse inscribed in the rectangle, ragged, with single
pillars left standing). A square corner exists nowhere in the game — do not
reintroduce one. The `Room` RECTANGLE never changes — every spawn, the entrance
and the exit are placed off it — but it is NOT all floor, so anything placing a
body in a room has to check it fits (`RunSim.placeIn`, which retries off its own
rng stream so placement never moves the draws that pick the next monster). Two traps, both paid for once already: an ellipse
drawn round the OUTSIDE of the rectangle merges neighbouring rooms and the map
loses its walls; and a room a fifth smaller with the same pack in it is a pack
that arrives all at once, which turned the aura worlds into walls the demo
caught. A wandering corridor may drift at most ONE tile per step, or
consecutive bands stop sharing a row and the halves are only diagonally joined.

**A zone is its own rock, not a tint over the Fissure's.** `THEME_INK` in
`render/renderer.ts` names each zone's whole surface — ground, wall, the dark
between them, what grows, what glints — and a `surface` telling `tileDecals`
HOW to draw a tile: `stone` is coursed masonry, `flesh` is lobes and pores,
`crystal` is facets and growth, `seam` is one or the other tile by tile. Colours
are CSS custom properties like everything else (`--flesh`, `--rose`, and their
neighbours).

**`floor.shade` is the dark in every zone; `floor.rock[0]` is not.** The rock
ramp's first entry is `#a96c8f` in the Cavern — pale — so anything that needs
to read as a HOLE and used it vanished into its own floor. `floor.glint` is the
bright in every zone. At one tile across contrast is the only tool: `mouth()`
is a bright rim, a mid ring and a `shade` pit, and the ladder or teeth or
shards inside it are decoration on top of that, not the thing that reads.

**`livingDecals` is the part that moves, and EVERY zone has some** — webs with
something walking them and guttering candles in the Fissure, tendrils and spines
in the Rot, creeping growth and light travelling a facet in the Cavern, both in
the Seam. Drawn every frame from the tile's own hash and the clock, never from
stored state, so both renderers agree and nothing has to be seeded. How much is
`motionDensity`, per zone — a cave with a web on every tile is a web factory.
It hangs off FLOOR tiles rather than the walls it grows from, because a wall's
overhang is painted before the floor under it and vanishes, and never over a
landmark: the two holes are how you read the room. Pixi draws it into a
`propLayer` over the map built once; canvas2d draws it in the same loop as
everything else. Both clip to what is on screen.

**What two changing nodes come to is AUDITED, and the audit is over CLASSES.**
`GrantDef.changes` classes every switch a delivery reads; `INTERACTIONS` holds
every unordered pair of classes with what taking both comes to, and the demo
fails a pair nobody wrote. Never audit at node level: it is 742 pairs across
three trees and it goes stale the day a node is added. A new node that invents
a mechanism invents a class, and the class is what gets a row.

**A combination with no coherent answer is REFUSED and says why.** `blocked` on
an `Interaction`, read by `blockedBy` and asked by `canAllocate`, and the node's
tooltip names the allocated node it clashes with. Nothing is blocked today —
that is a finding, not an omission. Adding one is retroactive: allocations are
replayed on every load, so a wrong refusal costs every player their build, and
the demo holds a randomly walked 30-point build in every tree to being refused
by nothing.

**A swing's reach is a CIRCLE around the swinger, and the vfx draws it at the
radius the sim used.** `sweepRing`, emitted by `cleave` with the radius as its
second point — the same contract as a burst. The old `slash` was an arc at a
fixed size in the direction of one target, which was wrong twice: wrong shape,
and a node widening the reach by a quarter moved nothing on screen.

**A vfx SHAPE is a pure function in `render/renderer.ts`.** `fireBolt`,
`fireBurst`, `poisonDrops` and `lightningArc` return `FirePixel[]` in tile
units, and both renderers stamp them through their own `blocks()`. A kind drawn
in one renderer and not the other is a skill that is invisible in the fallback.
An arc's kinks ALTERNATE sides and are hashed off its two ends: left to the hash
alone, consecutive joints land the same way half the time and the whole thing
reads as a wavy rope rather than as lightning.

**One light, from above and slightly in front** (every sprite faces +x). Mass
takes the lit ink where nothing is above it and the shade where nothing is
below or behind it; a highlight sitting directly under a shadow is light from
underneath and the demo fails on it. Cloth — the bare figure's shirt and
trousers — has no lit ink at all and takes only the shade half: plate catches a
highlight, a filthy traveller's clothes do not.

**A pose is picked from what the entity is doing, not from the clock.**
`poseOf` divides `actionTimer` by `ATTACK_POSE` to get how far through its own
swing an entity is, and indexes `SWING_POSES` / `CAST_POSES` with that. Driving
it off elapsed time makes a fast attack and a slow one look identical.

**The walk is contact, pass, contact, pass** (`WALK_POSES`). A pass has the legs
together, one foot off the ground, and the whole figure a pixel higher — the
`POSES` entry lifts the armour by the same pixel. Feet are the one thing a shift
cannot fake, so `POSES[pose].boot` picks one of four boot grids per family and
nothing else may index `FamilyArt.boots`. Under armour the two CONTACTS are told
apart by the boots trading places, not by the bare figure's leg shading, which
nobody can see.

---

## What the game is made of

The save, the items, the currencies, the screens and the loop. Same purpose as
the art section: it is the part that saves you reading the code.

**`GameState` is plain data in a localStorage key per SLOT**
(`crystal-core.save.1|2|3`, `JSON.stringify(game)`), and `heal()` in
`src/game/save.ts` runs on every load. Adding a field costs
nothing — a missing key takes its default. Renaming an id costs the player
whatever pointed at it, and nothing else. `SAVE_VERSION` is only bumped when a
save must be REFUSED, which wipes everyone, so it is the last resort. `heal()`
is also where a migration goes: moving items between containers on load is
exactly what it is for.

**Capacity comes from the base's TIER, and nothing else.** `GearBase.tier` is
1, 2 or 3; `BASE_TIER_MODS` is `[2, 4, 6]`; `modCapacity` is the lower of that
and what the slot table declares. `GearBase.slots` says only WHERE a modifier
may go — `slotAllocation` deals the tier's budget over those types, richest
first. A bigger item is a better base, found — the one thing that can put a
modifier past the cap is `sigil_of_upheaval`, through a bonus slot, and it
locks the item for doing it. Item level decides how good a roll can be AND
which bases drop at all, so a drop band's `ilvl` is its ceiling twice over. A
crystal's level is the same idea in one `mod` slot.

**Currencies are DATA, not code.** `CURRENCIES` in `src/data.ts` is a list of
`CurrencyDef` — `targets` (which items it may touch), `requires` (a list of
`Condition`), `effects` (a list of `Effect`, applied in order, rolled back
whole if one fails). The named behaviours live in two registries in
`src/crafting.ts`: `CONDITIONS` (`has_open_slot`, `mod_count`, `not_corrupted`,
`ilvl_at_least`, …) and `EFFECTS` (`add_mod`, `remove_mod`, `gamble_mod`,
`scale_values`, `reroll_values`, `reroll_mods`, `add_slot`, `corrupt`, …). A
new currency is usually a table entry; a new *kind* of currency is one registry
entry plus a table entry.

**There are eight currencies, in six kinds.** Add one (`shard_of_making`, the
only thing the shop sells); remove the one you CHOOSE (`shard_of_unmaking`,
armed at the dock and fired by clicking a modifier — the only targeting in the
game); re-roll which (`shard_of_chaos`); re-roll the values
(`shard_of_change`); and two gambles that lock the item, `sigil_of_finality`
(every value ±25%, past the modifier's maximum — the ONLY thing that can do
that) and `sigil_of_upheaval` (one modifier past the cap, or one gone). The
two crystal essences guarantee a Density or a Hunting modifier. `scale_values`
never clamped, so Finality already worked as specified — what changed was that
it now says so.

**`meta.corrupted` is the lock.** It already exists, `not_corrupted` already
guards every currency that should respect it, and the tooltip already says the
item is corrupted. Anything that "locks an item" sets that flag rather than
inventing a second one.

**Containers.** `GameState` holds `inventory` (the dock — gear only, capped by
`CARRY.gear`), `stash` (inert, capacity bought with gold), `haul` (a cleared
run's loot, inert, `HAUL_CAP`), `crystals` (every crystal you own that is not
socketed, UNCAPPED), `sold` (the counter, `SOLD_CAP`), `sockets` and
`shopStock`. Inert means: nothing acts on the item until it is moved into the
dock. `craftId` is a REFERENCE, not a move, and it resolves across the bag, the
collection, the worn slots and the sockets.

**A dev level button, per ladder.** `skills-devlevel` grants a SKILL level and
`sheet-devlevel` grants a CHARACTER one, both marked `.mini--dev`. Attributes
begin at level 2, so without the second one nothing but a played descent
reaches the screen this phase built — and `smoke.mjs` is what proves the
buttons and the badge work.

**A web inside a modal carries a viewBox, never a measurement.** The trade web
is drawn in WEB units and framed by `viewBox` with `xMidYMid meet`. Reading
`getBoundingClientRect` there is reading a box the modal's own flex layout has
not finished deciding: measured once, it drew at a height the wrapper then
squeezed, and half the web was clipped below the fold. The skill web measures
because it PANS, which needs pixels; nothing that only has to fit does.

**A badge is ONE mechanism.** `badge(buttonId, count)` in `src/ui/badge.ts`
adds or removes a `<span class="tabbadge">`, and `renderBadges()` in
`src/ui/run.ts` is the only thing that calls it — from `refreshRunPanels()`,
which every screen's change callback runs, and from `finish()`, where the level
a descent bought lands. Character carries `attributePointsLeft`, Skills carries
`spareTreePoints` for the EQUIPPED skill rather than the web being read, and
Trade carries `tradePointsLeft`. Zero
removes the badge; one reading 0 is a permanent nag. The node carries a class
and no id, because a badge is a count on a button rather than a thing anything
else may point at. `spareTreePoints` exists so drawing one cannot mint a
progress record: a read may not write to the save.

**The tooltip is the TOP LAYER.** `.tip` is `z-index: 100`, over every popup,
menu and toast the app can raise — what explains a thing may not sit under what
points at it. It is
`pointer-events: none`, so nothing can be trapped behind it. `smoke.mjs`
measures it against each of those layers rather than against the number.

**A dock-less modal is still two places.** The Trade screen is the worked
example: markup in `docs/index.html`, and the Escape chain in `src/web.ts`.

**Adding a modal is two places, not one.** The markup in `docs/index.html`, and
the `SCREENS` table in `src/web.ts` — one row of open, close, is-open and the
element id, off which Escape and the window stack both come, so neither is a
third place.

**Three save slots, one of them LIVE.** `crystal-core.slot` remembers which,
`liveSlot()` is the default argument of `saveGame`/`loadGame`/`savedAt`/
`clearSave`, and `startAutosave` reads it every flush — so switching slots is
the entire meaning of "which game is this". A slot is somewhere to KEEP a game,
never somewhere to remember to save one: the live one autosaves exactly as the
single save always did, its row on the Save & Load screen offers no buttons,
and the other two offer **Copy here** and **Load** (or **New game** when
empty). `peekSlot` reads a row's name and level WITHOUT `readSave`, because
looking at a slot may not reserve the item ids inside it, and `copySlot` moves
the stored text itself rather than re-serialising. `lastWritten` is per slot or
a copy is skipped as a no-op. A save written before slots existed is adopted
into slot 1 on the first storage touch, once.

**A new game is a SLOT's action**, which is what stops it being a header button
that wipes the game you are in. The header has Save & Load and the dev kit; the
only thing that erases anything is the slot screen, and it asks first for
anything that overwrites — a copy onto an occupied slot, and every load.

**Adding a container is three places, not one.** The field on `GameState`;
`heal()`, which has to drop entries whose base no longer resolves; and the
demo's "every collection a save can hold items in claims its ids" list, which
walks each one through `readSave` and proves the id counter moved. Miss the
third and a save can hand out an id the next item then reuses.

**An element belongs to the MONSTER.** `MONSTER_ABILITIES` in `src/data.ts` says
what a monster does and what it deals doing it, and `monsterStats` takes one as
its third argument. Nothing about the map decides a damage type any more. Rolled
per PACK — a pack throwing two elements reads as noise where a uniform one reads
as a thing you recognise and answer.

**A BODY either throws or bites, and never both.** `MonsterDef.throws` picks its
half of that table, split on the `skill` field, through the single seam
`abilityFor`. **Every family has exactly one thrower** — Bonecaller, Chanter,
Prism — and that is load-bearing rather than flavour: measured, a pool with no
thrower deals about half what it did (demonic 9.9 → 5.1 damage a second,
prismatic 7.5 → 3.0), which put both aura worlds under the Fissure and broke
"Normal is the shallow end". Adding a thrower to a family is how you keep that
rule; taking the last one away is how you break it.

**A crystal ADDS damage; it never converts it.** A share of what a monster
already hits for, dealt as one type on top of the monster's own. The arithmetic
is unchanged — the hit is still multiplied by (1 + share/100) — so the
`DANGER_STATS` weight stays where it was at 0.9; what moved is only that a ward
now blunts part of a hit rather than switching a modifier off. Three modifiers
(`monster_fire`, `monster_cold`, `monster_lightning`), one per element, because
a crystal modifier is read and answered with a resistance and a name that lied
about which one would be worse than two more table rows. `monsterFire` keeps its
stat id from when it was a conversion: a save points at rolled stat ids and
renaming one costs the player that line silently.

**A monster skill has no `category`.** That is the whole of what keeps it off
the Skills screen, and the demo holds every ability's skill to it.

**Danger only counts what the sim still reads.** `DangerStat.cap` in
`DANGER_STATS` is where a stat saturates — a ward at `DEFENCE.resistanceCap`, a
crit chance at 100, armour at the points where `armourReduction` reaches its own
cap — and `crystalRewards` scores the capped amount. Reward is derived from
danger, so a set stacking four wards of one type is paid for one, and difficulty
and payment cannot drift apart through a ceiling in the sim. A new danger stat
that saturates anywhere needs its `cap` written down with it.

**Uniques are gear that grants.** `UNIQUES` in `src/data.ts` is a table of
`UniqueDef` — a base it is a version of, fixed `stats` rolled once by
`makeUnique`, a `grants` bag out of the same `GRANTS` table the trees use, and a
`gate`. A grant's VALUE has to be the shape the sim reads — `moreVsFull` wants
`{ above, more }` and a bare `1.35` is a switch that does nothing, silently.
`GrantDef.say(value)` is that value in a sentence with its number in it, which
is what a unique's card prints; it returns null for a shape it cannot read, and
the demo fails on that — so the line the card shows and the line the sim acts
on cannot come apart. `what` stays the generic description of the switch, for
the demo and the skills screen, and no player reads it about a specific item. `treeGrants` in `src/sim/stats.ts` merges what is WORN after the tree,
so a unique's switch reaches the sim by the one path a tree's does. The lines
live in `implicits`, and the item declares NO modifier slots — `modCapacity` is
zero and every currency refuses it, `sigil_of_upheaval` included. `plainGear`
excludes them — it is the demo's now that nothing bulk-sells by it, and stays
that way so anything that does again cannot eat one. The demo holds each to
the same rules as a tree node: declared, read by a skill you can pick, and paid for by a
downside on the item. Every world drops something of its own, the Fissure two.

**The deep end is not a band.** Power is clamped at `POWER.max`, so the top drop
band is reached long before danger runs out — the hardest set in the game is
nobody's target, and `deepestSet` in `src/sim/loadout.ts` is the only thing that
builds it. `THE LADDER` measures it against gear a band below the top and
PRINTS what got through, as a `gauge` rather than a check. A wall is a third or
less and a ceiling is nothing at all; both figures are named on the line, and
neither is asserted — under the no-tuning rule above the wall is a number set
for a character whose levels bought nothing, and every system still to land
hands out more power. It comes back at the balance pass, and until then 3/12 is
news rather than a failure. Past the power cap, danger still pays in
RARITY, which reads `payingDanger` directly — that is the whole reason to build
it.

**A crystal is never carried.** It is never spent, sold or moved anywhere, so
there is no dock column for it and `carryRoom(game, 'crystal')` is `Infinity`.
`addItem` routes one to `game.crystals` whatever else is full, which is what
makes a gift unable to fail. Two screens read that list: `src/ui/crystals.ts`,
where the collection is compared against four sockets, and the bench's own
crystals column, which is the only route to crafting one.

**One comparator orders every pile.** `sortGear(items)` in `src/game/state.ts`
sorts in place — by equipment slot, then base tier, then modifier count, then
name — and `sortInventory(game)` is one line calling it. The dock and the haul
both use it, so the two screens cannot drift into ordering the same pieces
differently, and the demo sorts one set of pieces as each and fails if the
answers differ. Sorting the haul is not MOVING: it is inert, and a sort that
took something out of it would be the one screen that spends your loot for you.
The haul has exactly two buttons — Take what fits and Sell all — because two
sell buttons side by side asked the player to care about a distinction nobody
asked for.

**A pile is searched by `itemMatches`** in `src/crafting.ts` — the dock and the
haul both filter through it, over the piece's name, its base's name, kind and
family, and every line printed on it. Substring, case-blind, no syntax. What it
does is DRAW fewer things: nothing moves, nothing is consumed, and every count
beside a filtered grid still reads the real container, or a search looks like
it sold your gear. The box is UI state in the module, never on `GameState`.

**An item is drawn in exactly one place.** `itemCard(item, notes)` in
`src/ui/itemcard.ts` builds the card every screen hovers — the dock, the haul,
the stash, the shelf, the sheet and both of the bench's columns. `notes` is the
only thing that differs per screen: the lines about what a click does, or why
it cannot. Adding a fact about an item means editing one function.

`showTooltip` takes a string OR an element. A currency or a skill is still a
string — every line of those is a sentence. `statParts` in `src/mod-text.ts` is
the seam that makes the card worth having: it splits a rolled line into the
NUMBER and the words around it, so `.rolled__v` can be one colour and
`.rolled__k` another. `describeStatLine` is derived from it, so the text and
the markup can never drift. `describeItem` in `src/crafting.ts` is the
text-only version and is now the demo's alone.

The class is `.rolled`, NOT `.stat`: the character sheet already owns `.stat`
with `justify-content: space-between`, and a rolled line that inherited it
pushed every label to the far edge of the tooltip. One stylesheet, no scoping —
check `docs/index.html` for the name before inventing it.

**Selling is undoable, and needs room nowhere.** `sellItem` puts the piece on
the counter (`GameState.sold`, newest first, `SOLD_CAP` of them) at exactly
what it paid; `buyBack` takes it off for the same number, so the pair is
neutral and the shelf cannot be ground for gold. A SALE needs room nowhere — 
that asymmetry is what stops a full haul wedging the loop — but a buy-back is
a purchase and refuses when there is nowhere to put it. Sell mode is UI state
in `src/ui/shop.ts` laid over the dock through `setInventoryOverride`.

**A currency is ARMED, then pointed.** Clicking a stack in the dock with
nothing benched — or a stack the benched item refuses, or the targeted removal
— arms it: `src/ui/craft.ts` holds `armed` as UI state, never saved. While it
is up the dock lights every item `canApply` accepts and dims the rest, each
dimmed one carrying the refusal in its own tooltip. Clicking a lit item applies
the shard; the targeted one benches the item and waits for a modifier instead.
The old flow is untouched: a benched item the shard accepts still fires on the
click. `InventoryHandler` grew `dimmed(item)` beside `highlighted(item)`, which
is the one mechanism both use.

**UI state that must never be saved.** `armed` (the currency waiting to be
pointed, `src/ui/craft.ts`), `selling` (sell mode, `src/ui/shop.ts`), and
`handover` / `banked` / `pending` (the transition, `src/ui/run.ts`). Each one
changes what a CLICK means, and a mode that survived a reload would turn the
first click of a session into something nobody asked for. None of them is in
`GameState` and none of them should be.

**A PREFERENCE is saved, and parking the panels is one.** `GameState.parked`
sits beside `keys` and `potions` — a missing key takes its default, `heal()`
needs nothing, and `resetGame` leaves all three alone, because a wipe is a new
game rather than a new set of habits. Hide was module state and lasted until a
reload, which made it a thing you did again every session. The test is whether
it changes what a click MEANS: a mode does and may not be saved, a preference
does not and should be.

**Chaining descents is not a setting, and nothing suppresses it.** A cleared
descent launches the next one, full stop. **Leave after this run** and
**Abandon** are the two ways out and there is no third; a checkbox offering to
make the idle game not idle is a decision nobody needs.
`smoke.mjs` holds `#run-repeat` to not existing.

**The run loop lives in `src/ui/run.ts`.** `launch()` builds a `RunSim` and
starts ticking; `finish()` banks the report and decides whether another descent
follows; `land()` is the one terminus every ending arrives at. The sim in `src/sim/` never learns
about presentation — a transition, a panel, a freeze, all of that is the UI
holding off on ticking.

**A freeze is the UI declining to tick.** There is no pause state in the loop
and there is not going to be one. Both of the things that stop a descent work
the same way, and anything that stops one in future should too.

**A view is measured in the CSS pixels the world is positioned in.**
`app.renderer.screen`, never `width / resolution`. Halved by a device ratio of
2, a map SMALLER than the view centred itself in a quarter of the screen — which
no descent ever showed, because a descent overflows the view and clamps against
its edges. The first map smaller than the screen was an authored room, and it is
where this surfaced.

**The camera is the RENDERER's, and gestures are the UI's.** `src/ui/run.ts`
sends what the pointer did — `setZoom(zoom, at)` with a focal point in CSS
pixels from the view's middle, `panBy(dx, dy)` in pixels, `follow()` — and each
renderer converts with the tile size only it knows. Both keep a `looking` focus
in tiles, null while following the hero, clamped to the grid so a long drag
does not bank an offset that takes as many drags to undo. A DRAG unlocks the
follow and nothing else does: zooming while following keeps the hero centred,
because leaning in to look closer must never be the thing that loses them.
`launch()` calls `follow()` — a camera left pointed at a corner of the last
map is a black screen with no obvious way out. The wheel is the only zoom;
there are no buttons and no readout.

**Every key but Escape is a table entry.** `BINDINGS` in `src/data.ts` says
what each one does and what it defaults to, `GameState.keys` overrides by id,
and `src/ui/keys.ts` owns the one listener. Nothing else may read a key
literal — including the hints, which print `keyName(keyFor(...))` so a rebound
key says what it is. Typing is not a shortcut: the listener ignores everything
while an input has focus, or the Find box turns a search into an action.
Escape is the exception and stays in the shell's own chain, because it is
about closing whatever is on top rather than doing anything.

**The handover between descents.** `HANDOVER` seconds where the sim does not
tick at all: the hero drops into the hole at the exit, `#run-fade` goes black
for the moment the map is swapped, and they climb out of the next entrance.
`emerge` (1 standing, 0 underground) is passed to `Renderer.draw` and moves the
hero sprite; the fade hides the swap. `banked` holds the report the drop is
carrying so Abandon mid-drop lands THAT one rather than building a second and
banking the loot twice. The hole itself is a `mouth()` decal on the ENTRANCE
and EXIT tiles, per zone, so both renderers get it.

**Walking out.** A descent does not end where you killed the last thing. The
flood finding nothing reachable puts the hero on a walk to `map.exit`, and three
things hang off that walk: coming within `FINALE_RANGE` triggers the closing
encounter, reaching `AT_EXIT` clears the run, and a route that does not exist is
the same answer as being there already — nothing waits forever. The exit is
drawn by the `mouth()` decal and by nothing else; a marker on the vfx layer
paints over the thing you are fighting.

**The finale comes UP the hole.** `spawnFinale` builds every body at
`map.exit` and queues them in `pending`; `climbOut` releases `EncounterDef.wave`
— `size` at a time, `every` seconds — and `step` runs that clock whether or not
you are winning. `s.totalMonsters` counts the whole encounter the moment it
starts, or the readout ticks down and then climbs again. Twenty bodies on one
tile read as two, which is what the wave shape exists to stop.

**A SCENE is an authored room, and it is one mechanism.** A `RunSim` over a map
nobody generated: `RunOptions.scene` names a `SceneDef` and the constructor
calls `sceneMap` instead of `generateMap` and spawns nothing. Both renderers
draw one with no changes at all, because they already draw a `RunState` — which
is the whole reason a room with a fight in it can be a filled-in field rather
than a second engine. Nothing after this may introduce a second way of doing any
of it.

- `sceneMap` sits BESIDE `generateMap` and shares `carveRoom`. A generator that
  also builds authored rooms is a generator nobody can read.
- **No rng.** A plan is absolute tiles and a cut is hashed off the tile it lands
  on, so a place is the same place every time you come up in it by construction.
- **A scene has no exit.** `GameMap.exit` is the entrance, so nothing draws a
  second hole, there is no `AT_EXIT` check and there is nothing to walk to.
- **A room belongs to the SCENE, never to the descent you came out of.**
  `SceneDef.theme` is the def's: the rock is some world's rock but the place is
  a place.
- **`GameMap.props` is furniture and is empty on every generated map.** A prop
  is PLACED, where a decal is hashed off the tile; it is drawn by `PROPS` in
  `render/renderer.ts` beside `mouth()` as pure `Decal[]` functions, so a prop
  is decals rather than a sprite and never enters `BEASTIARY`.
- **`RunState.folk` is who is in the room** — a LIST, and out of `monsters` for
  the reason it always was: nothing in combat may ever be able to see a person.
- **`src/sim` never decides that a scene happens.** `finish()` in
  `src/ui/run.ts` does, off `sceneWaiting`. That is why the whole of this leaves
  every headless harness alone: they drive `RunSim` directly and never ask.

**A DESCENT over a generated set is what is DRESSED, and there is no room for
looking at art in.** *The user's call, in their words: "We are going to just
delete the sandbox and start updating graphics in the actual game. I think it
either works or it doesn't."* `SceneDef.dummies`, the patrol, the pacing, the
nobody-dies guard and `#dev-sandbox` are all gone. A descent IS the room the
sandbox was, with monsters that fight back — so `npm run peek` is pointed at
one, and that is where art is judged.

- **Only a zone with a SET is dressed, and it is dressed with what the ROCK did
  and nothing else.** The cover and the growth belong to every set, because an
  open floor without them is one picture repeated in every cell. Nothing stands
  ON that floor: *the user's call — "get rid of all the props in the fissure
  zone except for the scattered stones... it's just delete everything placed in
  the dressRooms pass, keeping scattered stones and vines and stuff."* No zone
  is a working. `VIGNETTES` and `dressRooms` are kept and nothing calls the
  placer; per-zone furniture is a backlog item and this is the pass it would
  come back through.
- **A set is RECOLOURED at EMIT, never by editing the file it ships in.**
  `RETONE` in `tools/art/zoneset.mts` — chroma kept and a per-channel gain,
  applied to the whole sheet before it is base64ed. `src/render/generated-tiles.ts`
  says "do not edit by hand" and means it: a colour reached any other way is a
  colour the next re-emit throws away. Whole sheet, never per tile — tiles
  interlock at their edges and two of them toned differently is a checkerboard,
  which is the fault every mixing experiment here has failed on. It is what
  stands in for the runtime palette a painted tileset gave up, and it costs no
  generation.
- **A generated set is asked LIGHT-FLOOR and DARK-ROCK whatever the zone's own
  ink says**, at both ends and by exclusion. Measured twice now: `cavern_lit`
  was asked the Cavern's own way round — pale crystal rock over a dark floor —
  and reads inside out, the pale expanse taking the eye as ground and the
  chamber reading as a hole punched in it. The zone's identity is its HUE; the
  tone is not negotiable.
- **The standard shape pipeline draws MASONRY unless stone is excluded by
  name.** `seam_round` came back as grey cobbles with crystal dots on the rim
  off a prompt that said meat and muscle throughout and never said stone. Not
  asking for a thing is not excluding it: NOT stone, NOT rock, NOT brick, NOT
  cobbles, NOT masonry.
- **A SCENE is one chamber and hand-placed props, and nothing scatters into
  one.** `ScenePlan` is `room`, `entrance`, `stands` and `props` — what the
  ROCK does belongs to a descent. Multiple chambers, corridors between them and
  a per-plan `cut` were the sandbox's and went with it; a room that wants them
  back is ten lines of `sceneMap` and is in the history.
- **A ROUTE reads `Grid.solid`, and `Grid.walkable` is the one answer.**
  `src/sim/pathfind.ts` tested the TILE, which walked the hero straight onto
  the altar standing on it and parked it there for good — every repath from a
  tile it cannot stand on comes back empty, so the descent never ends. Anything
  asking "can a body be here" asks `walkable`, never `tiles`.
- **Furniture BLOCKS, and gives that up the moment it cuts anything off.**
  `SOLID_PROPS` in `vignettes.ts`, `Grid.solid` beside `Grid.tiles`. A second
  layer, because the ground under an altar is still floor and every renderer
  keys off `tiles` — marking it rock cuts a hole in the floor to draw a table
  in. Blocked one tile at a time, and undone if the flood from the hole stops
  reaching what the map has to reach. **Nothing in the shipped game puts a solid
  prop down** — they were all arrangements', and the authored rooms furnish
  themselves with things you walk over — so the demo drives `block` by hand,
  ringing a scene's person with solids and holding it to refusing the one that
  closes the ring. A layer with no live producer is the one worth holding, not
  the one to delete: `findPath` asks `walkable`, and the day furniture comes
  back is the day this stops being theory.
- **A generated tileset REPLACES the whole surface.** `GameMap.bare` with
  `GameMap.zone` naming the set; when it is set the zone's floor fill, its
  `tileDecals`, its `livingDecals` and its hand-drawn props all stand down.
  Masonry with the Fissure's flagstones stamped over it is two floors at once.
  Pixi only — `canvas2d` has no sprites and that stays correct.
- **A generated map draws ONLY the generated furniture.** `PROPS` and
  `PROP_ART` share ids on purpose — the ossuary's bones are drawn and a
  descent's are generated — so a `bare` map skips the hand-drawn pass entirely.
  It did not once, and every bone pile carried a pale rectangle nobody could
  find in the art.
- **Furniture goes down a CLUSTER at a time, wherever it goes down at all.**
  Dropped one at a time a prop reads as one, equally far from everything and
  there for no reason.
- **An arrangement is chosen for the SPOT, not given one.** A ragged room holds
  a four-tile square in about one spot in fifteen, so picking the altar and
  hunting for room leaves the chamber bare; picking a spot and taking the
  biggest that fits there, biggest first, lands it. Weight is multiplied by
  AREA, or the small ones take every space big enough for the large ones.
- **The rock does not stop at the GRID.** It is drawn `EDGE` tiles past it on
  every side, so a chamber near the boundary is not left ending on a straight
  lit line with flat colour past it.
- **What a SET cannot draw, the CARVE must not make.** `fitCorners` in
  `src/sim/grid.ts` opens rock until every cell is a key the set holds, and
  `wangKey` lives beside it because the key is a fact about the GRID first. A
  generated set answers 21 of the 81 corner keys, and what it lacks is not
  missing art — the MCP docs say the plain 16 cover ALL corner combinations, so
  the gaps are shapes its own terrain model never emits. A diagonal step in a
  wall is the one this carve makes and that one does not. Two answers were
  measured and both are worse: drawn as the nearest key, such a cell puts a cut
  face where solid rock belongs; built from QUADRANTS of other tiles it puts a
  sliver of floor inside the stone, because a quadrant's picture is not decided
  by its own corner. It is geometry, and safe because opening only ever adds
  space. Only a cell TOUCHING floor is opened: allowed anywhere it punched 50
  unreachable pockets into the middle of the stone.
- **A key a set does not hold takes the NEAREST one it does.** The renderer's
  backstop, scoring every key the set has with the cut face one step from
  either terrain and floor three from rock. Falling back by rule rather than by
  distance left bare squares between two cliffs.
- **The four wall CONTINUATIONS are told apart by their PATTERN rows**, and
  those rows are corner values one row out — not the cell's tile type. Read
  wrong, the wall's lip tile lands anywhere, and a lip repeating down a face is
  a pale line running up it.
- **The floor is broken up UNDER the furniture, never with it.** `coverFloor`
  lays loose stone and dust; the renderer draws that pass FIRST, so a slab
  stands on the rubble rather than beside it. Cover claims no tile, blocks
  nothing and is exempt from the one-thing-per-tile rule — and no id may be in
  both a cover table and a furniture one, or the renderer's split silently puts
  a prop under whatever it is standing next to.
- **Uniform density is NOISE. Texture is density that varies.** One rate over
  every tile is confetti, which is the same fault as one picture in every cell
  arrived at from the other side. `COVER_RATE` is indexed by distance from the
  rock, so debris drifts at the foot of a wall and thins to nothing in the
  open — and the open floor is what lets the eye rest on anything else.
- **Nothing a PERSON left is scattered.** A whole pass of fringe and open-floor
  props was written, tuned twice and deleted: a room's worth of objects dropped
  one tile at a time reads as exactly that whatever the rates are. What is
  scattered is what the rock does — cover on the floor, growth on the face.
  Furniture is a `Vignette` or is placed by hand.
- **The same five pictures over a whole floor is the fault, so each is SHIFTED.**
  `COVER_TINT` and a scale jitter off `tileNoise`, both keyed on the tile. A
  scatter that repeats exactly is the graph paper it was laid down to hide.
- **A generated prop comes back POLISHED.** Specular highlights and hard
  contrast, at half a tile, read as plastic. `tone` toward the ground's own
  spread does most of it and `dull` the rest; the two together are what makes
  loose stone look like stone.
- **What hangs on the face is the one thing placed INTO rock**, and only on a
  cut face — rock with rock above it and floor below, and a RUN of wall rather
  than a one-tile nub, or it is a light fixture in mid air. `HUNG_PROPS` is
  everything drawn side-on there and is what the renderer and the demo read;
  `WALL_PROPS` is the smaller list `dressWalls` may SCATTER, and it is roots
  only. A torch is somebody's, so a torch is placed by hand — which since the
  shrine went means nothing places one, and `torch` and `hung` are art waiting
  for an author.
- **A generated STAIN is drawn back.** The generator shades one like an object
  — domed, lit from one side — whatever the ask says, and at full strength
  that reads as a lump on the floor. `STAIN_ALPHA` sinks it into the stone.
- **Saturation is not brightness, and `tone` only moves brightness.** "Blood"
  comes back magenta however the ask is worded; matching a mean and a spread
  per channel leaves it magenta and merely darker. `dulled` pulls every pixel
  toward its own luma first, and THEN it tones.
- **A generated picture of a wide floor STAIN comes back as an object** —
  round, centred, edged, a disc lying on the ground. Three small ones on
  touching tiles make an outline nobody drew. The same defeat, four attempts
  apart, killed the ritual circle twice.
- **A generated PROP is a picture; a hand-drawn one is decals.** `PROP_ART`
  beside `PROPS`, anchored at the FOOT of its tile rather than the middle, or
  anything taller than a tile looks like it is sinking into the floor. `tiles`
  is how much of the floor it covers and belongs to the ART: a generator hands
  back a square with a lot of nothing in it, so a prop is cropped to what it
  actually draws before anything measures it.
- **A room's swell may only ADD.** `carveRoom`'s headlands ride on top of the
  ragging rather than replacing it, so every tile the old carve took is still
  taken. A swell that can pull IN puts an authored room's furniture in the
  rock — it did, in two of them, and the shape of a cave is not worth
  re-placing a library every time anybody touches the carve.
- **An island may not cover what a room was authored around.** `carveRoom`
  takes the tiles a plan reserved and drops any island that would land on one:
  a hand-placed prop is a fact about the room, an island is the carve being
  interesting, and the carve loses.


**A bubble is CLAMPED to the window.** The transform hangs a card above its
anchor point, so a TALL one over somebody standing near the top of the room is
drawn off the screen entirely — which the Osteomancer's bench, the first panel
bigger than four lines, found at once. A bubble a few tiles off the speaker
beats one nobody can read.

**A bubble is FROZEN where the speaker was when the line went up.** It follows
the camera and not the body: a bubble that slides about while somebody paces is
a bubble you cannot click, and no harness can hit a moving target either. The
camera moving under it is the case it is anchored for.

**A line is a BUBBLE over the body saying it.** `src/ui/speech.ts` owns it,
built once and UPDATED per frame — `renderFlasks` / `syncFlasks` is the
precedent and the reason is the same. Where it hangs is `Renderer.screenAt`,
asked every frame off the same seam the camera rides on: the anchor is the
UI's and the tile size is the renderer's. A drag or a zoom mid-sentence keeps
the words on the speaker.

**A beat is a line and what is DONE while it is on screen.** `SceneBeat` in
`src/scenes.ts`; `SceneAct` is `pace`, `work` or `face`, performed by
`RunSim.perform` off the walk and pose machinery that already exists. Setting
`Entity.action` and `actionTimer` is the whole of the interface `poseOf` reads
— no new art and no new frames. Only Pixi draws sprites, so an act is a pose
there and a moving circle in the fallback: **a beat may never lean on one to
carry meaning its words do not.** He can pour a lantern; he cannot mime one.

**A BOSS is not in `MONSTERS`.** `BOSSES` in `src/data.ts` is its own table —
`MONSTERS` is the pack pool and nothing in one may leak into the other, or a
slab of the rock arrives four at a time in a corridor. Life, damage and size
are multipliers on `MONSTER_BASE` like every other body in the game, so a boss
scales with the socketed set rather than being a fixed lump of numbers, and
`MONSTER_ABILITIES` gives it an element you can answer with a ward. Its art is
its own `BEASTIARY` entry, and the demo sweeps that table for one.

**The reinforcement clock STOPS when the boss dies, and that is the
termination proof.** It sits beside `waveTimer` in `RunSim`, it runs whether or
not you are winning, and the room is cleared by putting the boss DOWN — never
by walking out, because a scene has no way out. Killing it is the objective;
the adds are pressure. A clock with no stop condition is a run nobody can leave,
and the demo drives the room to completion for every main skill at two bands.

**A boss room is a DESCENT.** Its loot banks, its clear counts, and it lands on
the report every other ending lands on; dying in it costs that room and stops
the loop, exactly as dying anywhere does. It ends in its OWN terminus rather
than through `finish()` — routed through that one it took the chaining branch
and dropped into a hole with no descent at the bottom, which is a frozen screen.

**A scene never schedules a scene.** `sceneWaiting` is asked at the end of a
DESCENT and not at the end of a room, or a room hands you straight into the
next room.

**A boss is scheduled and marked at the CLEAR, never at the door.**
`INTRO.bossSockets` crystals set in the wall is the condition, read off
`GameState` the way a gift is; `takeBoss` writes `boss:<id>` into `given` once
it is down. Marked at the door instead, a room you died in would be gone
forever — and the way back to a second one runs through having put the first
one down.

**A boss KEY is a wallet entry in its own table.** `BOSS_KEYS`, never
`CURRENCIES`: every currency is reachable by the bench's two registries, and a
bench that can pour a boss key onto a helmet is the failure that table avoids.
`heal()` keeps it for exactly that reason — the wallet drops what is neither
gold, a currency, nor a key.

**A key drops off a DESCENT and never out of a room**, and only once its boss
is down. A key that drops in the room it opens is a loop rather than a reason
to run the Fissure, and a key to a door nobody has found reads as junk. The
roll is the SIM's — it owns the rng and the replay — and `RunOptions.beaten` is
how the caller says which doors have been found.

**A key is spent at the LAUNCH.** The button arms it (`calling`, UI state like
`leaving`) and pressing Enter takes it, which is why abandoning a descent costs
you the way in. What is SAVED is `GameState.called`: the room a spent key has
already paid for, cleared when you arrive in it.

**Escape takes the lot.** From any line, `skipToGift` skips the rest and
grants. The gift is already yours by the time a panel is on screen, so refusing
it would be worse than taking it.

**A rule for a fixed element loses every specificity tie to the class it shares
markup with.** `.modal__card` is one class and sets a width, so a card that
wants its own needs two — `.modal__card--bubble` alone loses the tie and the
bubble is drawn at the shell's width.

**A meeting.** `giftWaiting` in `src/game/crystals.ts` answers what is owed,
read AFTER the report so the level that descent just bought counts;
`sceneWaiting` in `src/game/scenes.ts` ASKS it and returns AT MOST ONE scene per
clear, highest rung first and never rolled. `RunSim.walkOut(dt)` is the hero
crossing the room, ticked by the frame loop alone — the descent is over, so
`step` would be wrong and the clock the report read has stopped — and ARRIVING
sets `meeting`. `takeHandover` grants everything the meeting holds and
`src/ui/met.ts` draws it; `giftSchedule` is the same answer in words, for the
collection screen. A meeting is a HALT of the idle loop — `halt = 'met'` —
landing on the same report as any other ending, and the report and the STATE it
lands with are the DESCENT's, never the room's. `walkToMeeting` is the headless
version of the walk, bounded like `runToCompletion`.

**The Lampwright speaks in FLAVOUR.** `LAMPWRIGHT.first`, `.crystal` and
`.again` in `src/data.ts` describe what he has seen the rock do and name no
screen, no currency and no number, and the numbers rule above is about
mechanics rather than voice — do not "fix" his lines by putting figures in
them.

**What is owed.** `Waiting` is everything the mouth is holding — a weapon, the
scheduled crystal, and every quest the clear just finished — and `takeHandover`
grants the lot in one panel. `GameState.given` is what has already been handed
over; with `GameState.clears` and `INTRO` it is the whole of the schedule, and
order cannot break it since nothing reads a flag another step of the same
report sets.

**The schedule is read off what you have DONE, and asked after the report.**
`giftWaiting` runs once `buildReport` has banked the clear, levelled the
sockets and paid the experience, so the descent that just finished is one the
schedule already knows about. `GameState.clears` is still counted there, but
nothing is scheduled on it any more — it is a number on a screen.

- The **weapon**, on the first clear. `STARTER_WEAPON` in `src/data.ts` maps
  `SkillDef.category` to a base and `SkillDef.weapon` overrides it, so it is one
  the chosen skill can swing. `starterWeapon()` resolving to nothing is a demo
  failure rather than a fallback.
- The **first crystal**, on the first clear after the ACTIVE skill has reached
  `INTRO.crystalSkillLevel` AND taken a notable in its tree — `crystalEarned`
  in `src/game/crystals.ts`. Both halves, because the level is what buys the
  point and the allocation is what spends it: it arrives for the thing that
  makes a character a build, where a count of clears paid it out for pressing
  Enter twice. The cheapest notable in every tree is exactly 3 points away and 3
  skill levels buy exactly 3 points, which is where the number comes from;
  `pathToNotable` in `src/skills-tree.ts` is what measures the distance, and the
  demo holds the two to each other. It is a LEVEL 1 crystal
  (`LAMPWRIGHT.level`), holding 0 modifiers: it is socketed BLANK, and making
  the descent longer is the whole of what it does until being used buys it a
  slot — five cleared descents at no danger, since `CRYSTAL_XP.perClear` is 1
  and level 2 costs 5. The Shard of Making comes with it anyway, several
  descents early, because everything is handed over in person and that rule
  outranks tidiness.
- Every **quest** in `CRYSTAL_QUESTS`, which is the other three Normal crystals
  as well as the two other worlds. `CrystalQuest.need` is a list of clauses
  ANDed together; `kind` names an entry in `QUEST_CONDITIONS` in
  `src/game/crystals.ts` and the rest of the clause is that condition's
  parameters — so a new objective is one registry entry and one table row. A
  clause naming a kind that is not in the registry is never met, and the demo
  holds the table to it. The report pays no crystal at all: `buildReport` banks
  loot and levels sockets, and everything given is given at the panel.

**The one arranged roll.** `crystal.meta.scripted` names a mod family;
`scriptedMod` in `src/crafting.ts` is consulted by `add_mod` before the random
pick, takes that family's LAST tier (authored best-first, so the cheapest), and
clears the mark as it fires. On the item rather than the currency, so a Shard of
Making behaves identically everywhere else. `heal()` drops the mark from a
crystal that already carries a modifier.

---

## Working conventions

Everything in `CLAUDE.md` still applies — the comment budget above all.

### How long the suite takes

About **seven minutes** end to end, and three of the nine are slow enough that a
two-minute tool timeout will kill them mid-run:

| | |
|---|---|
| `comments`, `typecheck`, `mods`, `build` | a second or two each |
| `smoke` | ~10s; it prints its own count, and that is the number |
| `demo` | ~2min |
| `shots` | ~2min — desktop only now, waiting out a whole first descent |
| `drag` | ~20s — one dock reorder, and a window dragged by its head |

None of them hangs. If one looks stuck it is `demo` or `shots`, and the answer
is to wait or run it in the background, never to assume it broke.

**A harness that plays the game runs it at `?fast=`.** The frame loop scales its
`dt` off that query, gated to a loopback host, so the sim takes the SAME ticks
to the same end and merely gets there sooner — the seed still replays. Drop back
to real time before any pointer work: at 16x a descent can finish between a
mouse-down and a mouse-up and redraw the dock under the drag.

### Run what the change can break, and nothing else

Running all of it after every edit is how an hour goes on a change to a number,
so the rule is to run what the change can actually reach. `comments` and `typecheck` are not on this list because they are seconds
and already automatic.

| what changed | what to run |
|---|---|
| a NUMBER in a table — balance, a tree, a modifier's range | `mods`, and `demo` if the sim or `GRANTS` reads it |
| the sim, grants, economy, crystals, trees | `demo` |
| UI logic — a handler, a screen's state, what a button does | `smoke` |
| layout, CSS, z-index, anything that MOVES something | `shots`, and `drag` |
| the dock, a window's position, a drag target | `drag` — 20s, and it prints what `elementFromPoint` hits on a failure |
| art, sprites, icons | `shots` |
| a zone's floor, its dressing, what the renderer does with a generated tileset | `peek`, and `demo` for the carve |

**Every graphics change now touches something a player runs.** The exemption
that took the main game's harnesses out of the loop was for the sandbox, and the
sandbox is gone: a generated set draws a live descent, so `demo`, `smoke` and
`shots` are all in the loop for a change to the floor or the dressing.

**When a UI change breaks something, reach for `drag` first.** It found the
handler race that four rounds of reading a slower harness's output did not,
because on a failure it prints what `elementFromPoint` actually hits at the drop
point rather than leaving stacking to be inferred from a screenshot. Reasoning
about z-order and `--dock-h` by eye produced four wrong answers in a row; one
hit test produced the right one.

**Before a push, the whole suite.** This section is about the loop while you
work, not about what a commit is held to.

### Reading the demo's output

`npm run demo` prints TWO kinds of `✗` and only one of them is a failure:

- `✗ FAILED — <why>` is a check that did not hold. `grep '✗ FAILED'`.
- `✗ Shard of Making: no open slot` is the crafting walkthrough printing a
  currency's REFUSAL, on purpose. It is the only place a failure message is
  ever read, so those lines are the point of that section.

The last line is `✓ every check passed (N)` or `✗ N checks failed`. Trust that,
and read the count off it rather than out of this file — a number written down
here goes stale the first time a phase adds a check. A `· ` line is a `gauge`: a
balance number that reports and can never fail.

### The harnesses have their own rules

- **`smoke.mjs` is ORDER-DEPENDENT.** Roughly a dozen assertions pick a dock
  item by POSITION — `filled('#inv-gear')[0]` — so anything that reorders the
  dock has to go at the END of the file, and anything that consumes an item has
  to avoid the pieces later checks look for by name. The Sort test is last for
  exactly this reason. Adding a test in the middle that sells, wears or sorts
  will break checks hundreds of lines further down, and the failure will name a
  piece rather than your change.
- **`npm run shots` can fail on content, not just on layout.** It waits up to
  two minutes for the SCENE and then for the Lampwright panel, and fails the run
  if a first descent never produces one. The meeting is at the END of a cleared
  descent, through the hole and across his workshop, so that wait covers a whole
  one — and the skill it picks is Blight, which takes about a minute over its
  first. `document.body.dataset.runPhase` is what tells a harness a room from a
  descent: both are a map with everything else hidden, so nothing else can.
- **Pointer DRAG tests flake.** `npm run drag` is the one that does this now,
  and a reorder has been seen to fail once on a bundle that passed either side
  of it. Re-run before treating one as a regression; the cause is below.
- **Measure a box with `hover()` first when a drag test aims at one.** Playwright's
  actionability waits for the element to stop MOVING; a raw `boundingBox()`
  does not. The bench going from empty to full grows the card and re-centres
  the modal, so a box read a moment earlier is 20px out and the press lands
  between two slots and silently does nothing. That was a 1-in-4 flake.

### Claims need evidence

- Balance claims need a measurement, not an impression. `ladderCharacter` in
  `src/sim/loadout.ts` and the harnesses in `src/demo.ts` are the tools; a
  throwaway probe script is fine for anything they do not cover. Put probes in
  the scratchpad or delete them — they are not part of the repo.
- Art claims need a screenshot. None of these is in the suite, and the demo's
  sprite checks prove grids are square, not that anything reads.
  - `tools/model-sheet.mts out.png` — every look, and `out-beasts.png` beside
    it with every creature at every rank. The only view that judges a halo.
  - `tools/model-peek.mts out.png family[,family]` — a few looks, drawn large.
  - `npm run peek -- out.png [zoom] [panX] [panY] [x,y,w,h,scale]` — a DESCENT
    on the dev kit, off the committed bundle in real Chromium, because Pixi is
    the only renderer that draws a generated tileset and a map cannot be drawn
    out of the source. The crop is magnified NEAREST: every fault found this
    way so far — the posts along the wall, the black scraps in the floor, the
    seam where the drawn border stopped — was invisible at the size it ships at
    and obvious at 5x.
  - `tools/zone-peek.mts out.png [px] [time] [span]` — all four zones off a
    real generated map, centred on the entrance. **`span` must be EVEN**: it is
    halved to find the corner, and an odd one lands the loop on half-tiles and
    silently draws nothing where the landmark should be.
- `npm run shots` covers the welcome, the Fissure, the collection, the SHEET,
  the SLOTS, the HANDOVER, a descent, the LAMPWRIGHT, the skill web, the TRADE,
  the BENCH and an item TOOLTIP at two sizes. The trade shot grants the levels
  for a full walk and spends them, because an unwalked web shows neither the lit
  links nor whether the whole star fits. The sheet shot grants three levels first
  and scrolls the attributes into view, because at 390px the two columns stack
  and the rows it is there to catch are below the fold. The bench shot catches a third column not fitting; the
  tooltip shot rolls four modifiers onto a piece first, because a blank one
  shows none of the grouping; the handover shot fires 180ms into a launch,
  which is the hero half out of the entrance; the slots shot is three rows of
  name, level, age and two buttons, which is where a narrow screen tears.
