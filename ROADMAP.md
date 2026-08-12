# Crystal Core — Roadmap

**The list of work, and nothing else.** Everything that is always true lives in
`RULES.md`; the game as it stands is `CLAUDE.md`. If a thing here is not a task
or something you need in order to do one, it is in the wrong file.

**There is one phase, and it is the UI.** Both original batches landed; Phase 1
below came out of a design conversation afterwards and is the work to take.

Do the lowest-numbered phase that is not blocked on an open question, all of it,
then delete it and renumber. Numbers in a phase are intent, not tuning — a
measurement beats them. A landed phase is DELETED from here, so before starting
one, `git fetch` and check you are on the tip of the branch: a phase you can
still see in a stale clone may already be built. Do not promote a backlog item
into a phase without being asked; the thing most likely to be asked for after
this one is the **balance pass**, written up below.

**What the last four phases turned out to know that their writing did not.**
Kept here because the next thing built on top of them will want it.

- **Widening a Spread is worth nothing on its own.** The first version of
  Scattershot only granted `spreadRange: 1.6`, and the demo's "every notable
  changes the cast" check failed it flat: with 1–4 extra Projectiles there are
  almost always that many enemies inside the bare 3.5 tiles, so a wider radius
  never changes which enemies are picked. It needed `spreadFar` — turn the pick
  around — before the wider radius bought anything at all. Any future "reaches
  further" node on a picker with a target CAP has the same hole in it.
- **A keyword has to be shown where the word is, not behind a second hover.**
  `.tip` is `pointer-events: none`, so a glossary that needed hovering the word
  inside a tooltip was never possible. Marking the word and printing the
  definitions at the foot of the same card is not a compromise: it is the only
  version that works on a phone.
- **The vocabulary pass cost the extra-Projectile falloff.** Making Split Cast
  full damage retired `extraTargetDamage`, which retired Focused Volley, which
  is why the Salvo branch has a new third notable. A keyword that promises a
  thing is thrown has to promise it lands, and a notable existing only to undo
  a falloff was the tell that the falloff was one number too many.

- **Adding an element to every monster did not change what a modifier is
  worth.** "of Cinders" always multiplied a hit by (1 + share/100) and still
  does; only the SPLIT moved. Dropping its `DANGER_STATS` weight from 0.9 to 0.6
  on the assumption that added damage is softer than a conversion flattened the
  reward ladder until band 6 paid no more than band 5, which the existing check
  caught within one run. Weigh a stat by the arithmetic it does, not by the
  story about it.
- **A pack's element is rolled per PACK, not per monster** — the phase asked for
  per monster and the code already said why not, in `RANGED_PACK_CHANCE`'s own
  comment. Mixed packs read as noise.
- **The node-pair audit was 742 pairs and could not be written.** It is 28 once
  it is done over grant CLASSES (`GrantDef.changes`), which is the altitude the
  codebase already works at — a node is a bag of switches. And the answer it
  produced is that NOTHING needs blocking: every pair composes, Rupture's burst
  under Blight's cloud tree included, which is a trade its own card already
  names. The refusal mechanism shipped anyway, unused and tested.
- **Five notables, not "about five".** Twenty nodes alternating minor and
  notable over ten points makes five the CEILING and not the average: a spoke's
  prefix of odd length wastes its last point on travel, so a careless walk
  reaches three. That is the decision the shape hands the player, and the demo
  measures both ends of it over 200 random walks.
- **`buildTree` did not bend.** A trade got a sibling — `src/trades/layout.ts`
  — and what the two share is `src/webgraph.ts`, which is where reach, refund
  and replay now live for any list of nodes. `src/ui/webart.ts` is the same
  answer for the studs.
- **A trade barely moves a kill rate, and that is correct.** Both trades'
  offensive halves are CONDITIONAL — a flask running, a pool with room to
  overcharge — so a flat average across a descent understates a window. The
  demo prints kills a second at the deep end for every trade against every
  skill and asserts nothing about it; whether a pairing is a favourite or a
  requirement needs a wider roster than three skills to tell.

**Where the phases came from.** Two batches of asks, dictated by the user in
one go each, plus a few out of design conversations, plus the vocabulary pass
asked for directly after them. All of them are built. The bracketed numbers in
the git log — [user 8], [user 10] — are the user's own numbering within a
batch, kept so a commit can be matched back to the ask.

**The vocabulary is a place new work lands.** `KEYWORDS` covers the three trees
and the two trades as they stand. A new skill, a new trade or a new modifier
either uses a word that is already in the table or adds one — and the demo's
`ONE WORD PER MECHANISM` sweep is what makes that not optional. A bow skill
saying "+5 Arc" is the case the whole thing was built for.

---

## The balance pass

**Not a phase, and not started. Documented so that asking for it is one
sentence rather than a re-derivation.**

**Why it is now possible.** `RULES.md` has said since the start that nothing is
tuned until every system is in, because each one hands out more power than the
last and anything tuned before it is thrown away. That list was attributes, then
trades, then jobs — and trades WERE the jobs. Every one of them has landed, so
the reason to lean too easy has expired. Nothing has been tuned to compensate;
the game is deliberately soft everywhere.

**What it would read.** Eight `gauge()` lines in `npm run demo` — measured,
printed, never asserted, and each carrying the figure that was wanted beside the
figure it got. They are the before. Taken after the vocabulary pass, with 420
checks passing:

```
the Seam is -0.1% over the hardest single world     — wanted: same class within 15%
a trade moves the deep-end kill rate 3.90–7.50/s    — no pairing should be the only one
1% to 33% of swings go unpaid                       — wanted: 5%–50%
a starved cast lands for 50% of your damage
a naked character walks out on 53% life             — wanted: under 70%
one blank crystal after the first clear: 18/24      — wanted: above 60%
every band is clearable in gear the band below drops
the deep end: 1253 danger, 4/12 through             — wall under 4/12, ceiling at 0
```

Every one of them is where it was at `e811da6` except the trade's top kill rate,
7.86 → 7.50, which is the Splintered Eye losing `extraTargetDamage` — its two
Projectiles were already at full damage through that grant and now are through
the rule. Nothing about the tree changes these: `ladderCharacter` spends no
tree points.

The deep end at 4/12 is the one sitting exactly on its own wall line, and the
unpaid-swing spread reaching 33% is the widest of these. Neither is a bug.

**What must not break.** Everything in `RULES.md` under "Balance is NOT TUNED"
inverts when this starts, and that section has to be rewritten in the same
breath — it is the file's own statement that the pass has not happened. The one
difficulty check that is a `check()` rather than a `gauge()` — a brand new
character clearing the bare Fissure — stays a failure throughout. And the
per-skill numbers are three skills wide, which the trades phase already found is
too few to tell a favourite from a requirement.

**What it is NOT.** Not a licence to change systems. A balance pass moves
numbers in tables; if it wants a mechanism changed, that is a phase and it gets
written as one.

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

### Phase 1 — The map is the screen, and the UI floats on it

**What is true today.** The map is one cell of a layout, and three things box
it in. `<header>` is a title and ten word buttons. `.runside` is
`flex: 0 0 290px` during a descent — a fixed column holding name, level, life,
mana, xp, skill icons, the readout and Carrying. `.dock` is a permanent strip
below everything, and it does not merely sit there: the shell measures it into
`--dock-h`, and `.modal` is `bottom: var(--dock-h)` with
`max-height: calc(100dvh - var(--dock-h) - 40px)`, so the dock reserves height
from every screen in the game. `.modal` also paints `rgba(6,5,8,.86)` over the
whole window, which is what makes a screen MODAL: one at a time, and the map
gone while it is up.

**Why it is wrong.** This game is built to be WATCHED — automation is
universal, potions and Blink fire themselves, `runToCompletion` is the shipped
policy, and no build's power may depend on the player being present. You
assemble a thing and then you want to see it work. There are two ways to play
and the game only supports one of them: menus, crafting and theorycrafting are
well served, and the actual action happens in a box in the corner that you
cannot make bigger even for a minute.

**The shape, as drawn.** The map fills the window edge to edge. Everything else
floats ON it:

- **Top left — the character HUD.** Life, mana, xp. Level at the top or the
  bottom of that cluster. This is HUD, not a menu: it does not hide, because a
  build you cannot see the life bar of is a build you are watching blind.
- **Bottom left, wide and horizontal — the inventory.** Its own window, opened
  like the others.
- **Bottom right — the menu.** Every system, icon based, each showing its
  keybind.
- **Centred, more vertical — every other screen**, opening over the map.

- [ ] **The scrim is the mechanical change.** `.modal`'s full-window
      `rgba(6,5,8,.86)` is what makes these modal rather than windows. Remove it
      and a screen stops covering the map and stops being one-at-a-time;
      everything else in this phase follows from that. `.modal__card` already
      paints itself solid (`--matrix` + `--grit`), so a window reads as a slab
      over the map with no new art.
- [ ] **`--dock-h` goes to zero and its two consumers simplify.** The dock stops
      being in the flow, so nothing needs to reserve height for it. `fitCanvas`
      in `src/ui/run.ts` also reserves height for the flasks because *"taking it
      all pushes them off the bottom, where the dock covers them"* — that reason
      dies here too, and the flasks become HUD over the map like the life bar.
- [ ] **Inventory is horizontal at the bottom and everything else is centred
      above it, and that is not a new idea — it is what the code already
      believes.** `--dock-h` exists precisely so an open screen does not cover
      the inventory. The player's instinct and the current design agree: the
      inventory is the OBJECT and every other screen is a verb applied to it
      (craft it, sell it, stash it, wear it), so it is the one that stays up
      while another is open.
- [ ] **Windows can be dragged where you want them**, and this is its own
      checkbox so it can slip cleanly: get the default positions right first,
      because a good default is what most players never drag away from. The
      trap is that the map is ALREADY drag-to-look (`panBy` on the renderer), so
      a drag on a window must not pan the map underneath it.
- [ ] **Multiple windows open at once makes z-order real, and Escape with it.**
      `src/web.ts` closes "whatever is on top" through a hand-written chain of
      `isXOpen()` checks that assumes one screen at a time. Decide what the top
      one is when three are up — most recently raised is the usual answer — and
      make the chain read that rather than a fixed order.
- [ ] **The menu is icons with keybinds, bottom right.** `src/ui/keys.ts` and
      `BINDINGS` exist and `C` already opens Character, so every icon can print
      its own key. Icons do not exist yet: `src/ui/icons.ts` has `itemIcon`,
      `currencyIcon` and `portraitIcon` and no screen glyphs, and ten of those
      in this game's grid pixel style is the most underestimated part of this
      phase. Keep the button IDS (`open-shop`, `open-craft`, `open-character`,
      `open-save`, …) whatever the presentation becomes — the guided opening
      navigates by them and so does the shots lockdown probe.

      **A first attempt at this was built and thrown away. Read this before the
      second.** Everything below is written down because it was paid for once.
      The work itself is saved as a patch under the session scratchpad, but the
      findings matter more than the diff.
      - **It broke dock drag-and-drop, and that is what killed it.** With the
        rail in and `guide.mjs` UNCHANGED, `npm run guide` failed
        `dragging a dock slot did not reorder it` and
        `a click after a drag opened "Level 2 Crystal"`. Confirmed as a game
        regression, not a harness artifact, by reverting the harness and
        re-running. The cause was never found. **Find it before building the
        rail again**, and the way to find it is to dump
        `document.elementFromPoint` at the drop coordinates together with the
        rects of `.dock`, the open `.modal__card` and `#craft-crystals` at the
        moment of failure — reasoning about z-order and `--dock-h` from
        screenshots produced four wrong answers in a row.
      - **The dock's handler is the thing to suspect.** `#inv-gear` slot
        `aria-label`s read `Wear as …` when the sheet owns the dock and
        `Open on bench: …` when the bench does. `setInventoryHandler` is set by
        whichever screen last took focus, and `setPhase` puts the RUN's handler
        back — so a descent ending while the bench is open silently stops dock
        clicks reaching it. That is a REAL BUG independent of the rail, worth
        fixing on its own: a screen that is open should not lose the dock
        because a descent ticked over.
      - Windows must not cover the rail, since the rail is how a window gets
        closed. `.modal { bottom: max(var(--dock-h, 0px), 106px) }` did it.
      - The rail wraps, and at `max-width: 560px` its wrapped row reaches the
        bottom-centre flasks. 336px keeps it a compact block in the corner.
      - Grid-art glyphs at 10×10 in `src/ui/screenicons.ts` worked and read
        fine at 18px; that part is done and is in the saved patch.
- [ ] **The minimize has to have a way back.** Exactly one affordance never
      hides, and it takes a key — `Space` is already recentre-camera, so pick
      another `BINDINGS` entry. The guided opening should UN-minimize rather
      than ring a button that is not on screen.
- [ ] Minimized state persists across sessions — a watcher next session is
      still a watcher. `GameState` already carries `keys` and `potions`, so a
      UI preference has somewhere to live and `heal()` defaults a missing key.
- [ ] Launching a descent does **not** auto-minimize. Surprise is worse than a
      click.
- [ ] **`requestFullscreen()` on a control and a keybind.** It needs a user
      gesture, so it cannot be automatic. This is the whole of what the phase
      does about packaging — see `RULES.md` on why no app shell is being added
      to get it. Guard it: `document.fullscreenElement` is how you know which
      way the toggle points, and the browser can leave fullscreen without
      asking (Escape), so listen for `fullscreenchange` rather than tracking a
      boolean of your own.

**`npm run guide` is the harness that costs the most, and it can be made cheap.**
It plays REAL descents, so the opening takes eight minutes of wall clock. The
frame loop accumulates real `dt` and steps the sim in fixed `TICK`s, so scaling
`dt` runs it faster with an IDENTICAL tick sequence and an identical outcome —
the seed still replays. A `?fast=` read gated to loopback hosts (so the hosted
game can never be handed it, which in an idle game would be a cheat) took the
guide to **1m52s**. The saved patch has it. Two things learned with it:
the harness's own static server did not strip query strings, so any URL with a
`?` 404'd; and the post-opening drag checks need the loop STOPPED, not merely
slowed, because a descent ending mid-drag redraws the dock underneath it.

**What must not break.** Nothing here can touch the sim: it is in tile space
and never reads a pixel, so a different canvas size replays the same seed and
moves no demo number. `fitCanvas` already measures its box and resizes whichever
renderer is live, and both implement `resize(width, height)` — full-bleed is
mostly giving `#run-stage` a bigger box.

`npm run guide` is the harness that matters, because it plays the opening with a
real pointer: `viaHeader()`, `blocked()` and `CLOSES` in `src/ui/tutorial.ts` all
assume a header bar that a modal covers, and `blocked()` is literally
`ctx.top !== null`, which stops meaning "the header is covered" the moment a
window is not modal. `npm run shots` runs a lockdown probe that hard-codes
`open-shop`, `open-craft`, `open-character` and `open-save` as doors that must
stay clickable, and finds any element covering the guide card.

**Desktop only — see `RULES.md`.** `shots.mjs` runs a 390×844 phone viewport and
FAILS on overflow there. A floating-window UI has no meaning at 390px, so that
viewport is the first thing this phase has to deal with: keep it as a print, or
drop it, but do not contort the layout to satisfy it.

---

## Open questions

Do not guess at these. **None of them ever blocked a phase**, and none of them
is work waiting to be picked up — they are decisions the user has not made.
Every one is parked deliberately. Ask before acting on any of them.

1. **What the Lampwright wants.** Trades have landed and the placeholder is in:
   anyone may take one up at level 5, and the Trade screen says so in as many
   words. The intent was always a storyline with the Lampwright rather than a
   level threshold — he is the only person in the game and the only voice it
   has. Nothing about it is written: what he is doing down there, what he asks
   for, how many beats it runs, whether it hands out anything besides the trade.
   Replacing the placeholder touches the ACQUISITION only — not the tree, not
   the points, not the allocation — so this blocks the STORY and not the system.

2. **What is the fifth socket?** Wanted as an endgame slot holding something
   that is not a crystal. Deliberately unspecified — the user wants to think
   about it. `RULES.md` says how to keep it cheap to add; nothing else may
   assume it.

3. **Is the Seam meant to be the hardest room, and is it?** `CLAUDE.md` said it
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

4. **Nothing but the Fissure hands out an element.** Every monster brings its
   own now, but which one is a flat roll off `MONSTER_ABILITIES` — a Rot pack
   is as likely to throw frost as a Cavern one. Biasing the table by monster
   FAMILY would make a world's fights feel like that world's, and is one field
   on `MonsterFamilyDef` plus a weight lookup. Not a phase, and not asked for:
   written down because the table it needs already exists.

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

- **Whether a trade has exactly one right skill.** `RULES.md` states the line:
  favouring a skill is fine, requiring one is a skill node that got lost. It is
  UNANSWERABLE today — `MAIN_SKILLS` holds three, which is too few to tell a
  favourite from a requirement — so the demo prints what each trade is worth
  per skill and asserts nothing. Deferred by the user's decision, and what
  un-defers it is a wider roster, not a measurement.
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
- **Blight, Strike and Fireball are not the same game.** The old note here said
  Blight cleared the top 12/12 against Strike's 3/12. That number is dead;
  `TRADE RULES` now measures all three at the deep end every run, and it reads
  **Fireball 7.50, Strike 4.37, Blight 3.90 kills/s** with no trade — so the
  ordering has entirely inverted since, and Fireball is now the outlier at
  roughly twice Blight. Do not act on it outside the balance pass: it is three
  skills, and the demo prints it fresh on every run.
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
