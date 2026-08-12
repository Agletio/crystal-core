# Crystal Core — Roadmap

**The list of work, and nothing else.** Everything that is always true lives in
`RULES.md`; the game as it stands is `CLAUDE.md`. If a thing here is not a task
or something you need in order to do one, it is in the wrong file.

**There are no phases in this file.** Every one of both batches has landed. If
you are a session looking for work, there is none here to take: say so, list the
Open questions, and stop. Do not invent a phase and do not promote a backlog
item into one without being asked. The thing most likely to be asked for next is
the **balance pass**, written up below.

When there ARE phases again: do the lowest-numbered one that is not blocked on
an open question, all of it, then delete it and renumber. Numbers in a phase are
intent, not tuning — a measurement beats them. A landed phase is DELETED from
here, so before starting one, `git fetch` and check you are on the tip of the
branch: a phase you can still see in a stale clone may already be built.

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

**There are none.** Every phase in both batches has landed. What is left in this
file is the balance pass above, Open questions, and a Backlog — and `RULES.md`
says plainly what to do with that: say so and list them, do not invent work, and
do not promote a backlog item into a phase without being asked.

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
