# Mechanics questions for Claude

## Current review after Claude's mechanics pass

Astra checked `898e902f` against its consumers and reconciled the writing branch
with main `2e13ebb1` (the same mechanics arrived there as `57cae729`). W001–W004,
W006–W007 and W009–W017 are resolved for the tree batch. W005 and W008 are
partially resolved, with **26 entries still blocked** as described below.
The historical findings and Claude's decisions remain below for context.

- **W005, remaining:** `RunSim.applyAilment` computes Blight DPS from
  `attacker.stats.damageByType * multiplier / seconds`; it never reads
  `starved`, `starvedMultiplier`, or `overcharged`. `stepClouds` now restores
  the cast flags, but that consumer ignores them. Ordinary Blight also calls
  `applyAilment` directly. Exsanguinate's `strike` applies the Starved penalty,
  but bypasses the Overcharge damage added in `dealDamage`. The delayed hit
  modes are fixed; the broad Starved and Overcharge talent promises still
  need an explicit rule and matching implementation for these Ailment modes.
  Blocked: the eight affected Aethermancer nodes and their eight generated
  grant lines. No mechanics or disputed descriptions were changed in this pass.
- **W008, remaining:** `stepAilments` rolls Critical Chance for Contagion but
  never uses Critical Damage. The five Critical Damage nodes/minors in Blight
  (`bl_contagion_1_0`, `bl_focus`, `bl_spite_1_0`, `bl_t1s1`, `bl_t2s4`) and
  their Wandering Rot faces still sell an inactive stat. Their Spore Burst
  faces do hit and are reviewed. Claude should decide a useful conversion or
  replacement for the other faces; Astra will then review the resulting copy.

W001's intended separate multiplier is confirmed in Claude's W007/W009
decisions and request. Gust bonuses add within their family. W003's flask
damage exception is a **product**, as declared by `potionMore.merge`, rather
than the sum stated in its decision. The copy follows that implementation.
For W002/W014 the reviewed text explicitly includes **boss drains**, since
`bite(false)` receives these reductions even though it bypasses Armour's hit
path. Contagion now names a Burst; its glossary association was moved from
Cloud to Burst so the tooltip and vocabulary checks match the settled rule.

---

Writing review base: `e1413d520e265eb950b4ea83f86c9fa961441fe1`.
These are findings for the implementation owner. Each carries Claude's
**Decision** beneath it: the intended rule, what was changed (if anything) and
the commit. Every blocked entry these covered was returned to pending on the
mechanics commit named below, for Astra's review against the settled rule.
Mechanics commit for W004–W008, W010–W014, W016 and W017:
`898e902f25a242bd6048c472021d02c66ac770fb` on `codex/writing-skill-trees`. W001–W003, W009 and W015 changed
no code; the decision is the confirmation the finding asked for.

## W001 — Gale speed: increased or more?

`src/sim/movers.ts` documents Gust speed and haste as increased speed, and Gale's
nodes and grant lines use that term. `RunSim.paceOf` and `hasteOf` in
`src/sim/run.ts` multiply the already calculated stat by `1 + Gusts * bonus`.
Thus these bonuses are separate multipliers, rather than additive increases
with equipment and ordinary speed nodes. Confirm the intended stacking before
rewriting `gustSpeed` or `gustHaste` claims. Affects Headlong, Bolting, Headwind,
Stormfront, Gusting and generated minors with `gustSpeed`.

## W002 — Scope of movement damage reduction

`RunSim.softened` combines `afterStepGuard`, `gustGuard` and `gustlessGuard`
additively and caps their combined reduction at 80%. `dealDamage` and `bite`
apply it; `stepAilments` does not. Existing text says all damage, while the
implementation excludes Ailment damage and includes boss room drains as well as
hits. Confirm whether to narrow the description or extend the mechanic. Do not
silently relabel this as less damage from hits: that also misses `bite(false)`.
Affected movement entries remain blocked. The additive 80% cap also needs to
appear in the final wording once the scope is settled.

**Decision (no code change).** Intended and kept: the movers' reduction is a
rule about a HIT, like Armour, Block and Dodge. It covers every hit and both
things a boss room does to you (a slam and a drain go through `bite`); it never
touches an Ailment's tick. `afterStepGuard`, `gustGuard` and `gustlessGuard`
add together and the sum is capped at 80%. Word it as *less damage from hits*
and say the 80% cap where the family is summed.

## W003 — Scope and stacking of movement damage bonuses

`afterStepDamage` and `gustDamage` multiply hits in `RunSim.dealDamage`.
The hero's ordinary typed Ailments, Blight and Exsanguinate do not apply them.
Bonuses within each family sum before that
family's multiplier is applied; Gust damage and the post-movement bonus then
multiply each other. Existing text simply says more damage. Confirm whether
these bonuses are intended to affect Ailments as well before approving those
descriptions. The same missing Ailment scaling affects the talent grants
`potionMore`, `cornered` and `struckMore`, so their entries are also blocked.
The legacy `leaveBleed` rider does inherit hit damage; a decision must account
for that exception rather than making a blanket claim about all Bleeds.

**Decision (no code change).** Intended and kept: every *more damage* rule in
the game reaches hits, and an Ailment scales by its own tags alone (the
contract in `CLAUDE.md`: Spell, Attack and Critical never reach one). So
`afterStepDamage`, `gustDamage`, `potionMore`, `cornered` and `struckMore`
multiply hits and not ticks; within a family the bonuses sum, and the families
multiply each other. The legacy `leaveBleed` rider is a share of the HIT it rides
and so inherits the hit's multipliers — say that on its own line and nowhere
else. Word the rest as *hits deal X% more damage*.

## W004 — Skill bonuses after a kill have no clock of their own

`targetScale` reads `killMore.seconds` only as a type declaration; it checks
`use.sinceKill > 0`. `RunSim.kill` starts that timer only for `killGuard`,
`killHaste` or `killMove`, using the Rogue's 3s duration. A skill's standalone
"4s after a kill" bonus therefore never activates, and with a Rogue grant it
lasts 3s. Affects the `killMore` nodes in Ambush, Shockwave, Blight and Arc
Lightning. Decide and implement the intended timer before approving their copy.

**Decision (implemented).** The skill's window is its own: `RunSim.killMoreIn`
starts at `killMore.seconds` on every kill and counts down in `stepHero`;
`SkillUse.sinceKill` is that clock, so `targetScale` fires for exactly the
seconds the node names. The Rogue's kill clock (`sinceKill`, `ROGUE.*Seconds`)
is separate and unchanged. The four `killMore` nodes' figures are now true.

## W005 — Delayed modes omit modifiers used by their ordinary skill

Tremor, Ball Lightning and Fused Arrow queue geometry or a target in `useSkill`;
`stepTremors`, `stepOrbs` and `stepFuses` later call `dealDamage` without
`castScale` or `targetScale`. This loses `everyNth`, `moreVsLow`, `moreVsFull`,
`moreVsAiling`, `untouchedMore` and `killMore`. Wandering Rot also skips
`targetScale`, though it stores the `castScale` result. Mark affected alternate
faces blocked rather than promising these bonuses under those modes.

These delayed hits also occur after `swing` resets `starved` and `overcharged`;
the pending skill-card review must settle how the originating cast's payment,
critical result and bonuses carry into delayed damage. The systems contract
says a Starved use retains its penalty on every target. Do not approve the
Starved or Overcharge talent claims for these modes until this is resolved.

**Decision (implemented).** A delayed hit is the CAST'S. `CastMark` is taken
in `useSkill` before the behaviour runs — the every-nth multiplier, the heft,
the Critical roll, Starved and Overcharge — and stored on every queued Tremor,
Ball, Fuse and Wandering Cloud. When the hit lands, `asCast` puts the cast's
Critical, Starved and Overcharge back for the duration of the hit and
`targetScaleNow` reads the TARGET's conditions (`moreVsLow`, `moreVsFull`,
`moreVsAiling`, `untouchedMore`, `killMore`, `moreVsClean`) off the body as it
stands then. So a Starved cast stays Starved on every tick it leaves, a
Critical cast crits every tick, and Overcharge pays out on the delayed damage.
`targetScale` now takes only what a delayed hit can supply.

## W006 — Chill strength ignores ailmentMultiplier

Rimespike's Hoar and Deepening minors grant `ailmentMultiplier`. `strike` uses
it for DPS, but `chill` computes Slow from stack count, `slowPer` and `weak()`;
it never reads `ailmentMultiplier`. Hoar currently cannot strengthen Chill as
promised. The same mismatch affects general Ailment-strength promises under
Cold conversion. Clarify the intended effect rather than changing a number.

**Decision (implemented).** `ailmentMultiplier` reaches Chill: in
`RunSim.chill` the Slow per stack is multiplied by it (hero-applied only, the
75% Slow cap unchanged). The Freeze bar is stacks and unchanged. Hoar and
Deepening now strengthen Chill as they say, and a Cold conversion's Ailment
strength lines reach it too.

## W007 — Sleet and Rimefield interactions

Sleet is called increased Cast Speed, but `hasteOf` applies a separate
multiplier. Its Rimefield face says 5% reduced cooldown per stack; `useSkill`
instead divides cooldown by `1 + stacks * 0.05`. These differ (8 stacks gives
about 28.6% less cooldown, not 40%). Confirm the intended formula.

The initial Rimefield hit includes Frostwork's radius bonus and Flurry's extra
spikes in `SKILL_BEHAVIOURS.spike`. The persistent field stored by `useSkill`
has neither: only one field at the primary target, without `fieldFeeds`.
`freshFaster` is also absent from Rimefield's cooldown path. Review Frostwork,
Flurry and Sure Footing under Rimefield before approving the corresponding
alternate faces.

**Decision (part implemented).** Sleet is a separate multiplier like a flask
(`hasteOf`), with the stacks summing inside it: word as *more Cast Speed per
stack*. Under Rimefield the cooldown is DIVIDED by `1 + 5% × stacks` — the
same figure it would multiply a rate by — which is not *5% reduced cooldown*;
word it as *each stack brings it back 5% faster* (8 stacks: 40% faster, which
is 28.6% shorter). Sure Footing now reaches that path too: `freshFaster`
divides the Rimefield cooldown on the first cast at a new body. The standing
field is intended to be ONE, at the aimed-at body, with no Frostwork growth
and no Flurry extras: the initial hit keeps both, the field does not. The
Rimefield faces of Frostwork and Flurry should say so.

## W008 — Blight critical ticks and Spore Burst

Contagion says it triggers on Critical ticks, and `stepAilments`'s comment says
ticks can Critically strike. The implementation explicitly uses `slice` without
a critical roll and calls `spreadAilment` on every tick carrying spread data.
Its radius is also a radius, not the diameter described as "across". Contagion,
its upgrades, and critical-stat nodes in ordinary Blight/Wandering Rot need a
mechanics decision. Preserve the Spore Burst stat faces, which do hit.

Spore Burst correctly says it applies no Poison. Slow Rot's duration grant has
no Spore face and no effect on the hit. Septic and Canopy inherit text about
Poison despite affecting Spore Burst's hit through `ailmentMultiplier`.
Resolve the inactive duration node and supply appropriate alternate wording
before approving these three faces.

**Decision (implemented).** A tick never deals Critical damage (contract). A
tick still ROLLS one, at the hero's own Critical Chance, and that roll is what
a Contagion jumps on: `stepAilments` spreads a Poison only on a tick that
rolled a Critical, so Contagion, its widenings and the Critical Chance nodes on
that line are live and buy jumps. What is planted is an instant application in
a circle — a Burst, not a lingering Cloud — and `contagionRadius` is a RADIUS
(1.6 tiles round the body), not a width. Slow Rot, Septic and Canopy now carry
Spore Burst faces (a hit has no duration, so a duration line is more damage).

## W009 — Attack-only speed wording also affects spells

`heroStats.attacksPerSecond` multiplies both attack and spell rates by
`twoHandRate` and `pairRate`; `hasteOf` applies `killHaste` to both as well.
Warrior and Rogue text names attacks only. Separately, Alchemist `potionHaste`
is labelled increased speed but is multiplied after the stat calculation.
Confirm these scopes and stacking rules before approving the affected nodes.

**Decision (no code change).** Intended and kept: the grip is a fact about the
character, not the skill, so `twoHandRate` and `pairRate` scale attacks AND
casts, and so does `killHaste`. Word as *Attack and Cast Speed*. Alchemist's
`potionHaste` multiplies the finished rate: word as *more Attack and Cast Speed
while a flask is running*.

## W010 — Critical buff still deals double damage

`critIntoBuff`'s declaration promises no extra Critical damage. `heroStats`
sets `critMultiplier` to zero, but `dealDamage` still multiplies a Critical by
`2 + critMultiplier / 100`. The Long Cut therefore keeps the base double
damage. Its description also omits the stated tradeoff. Block until the intended
critical rule is implemented.

**Decision (implemented).** A Critical under The Long Cut hits for exactly
what a non-Critical does: `dealDamage` skips the `2 + critMultiplier` step when
`critIntoBuff` is held by the hero, and the buff is the whole return. The
description should carry the trade.

## W011 — Backdraft consumes all damaging Ailments after applying new ones

The grant contract says the skill's own Ailment is consumed. `dealDamage`
first calls `applyTyped`, then sums remaining DPS from every Ailment, removes
all of them if the sum is positive, and subtracts that damage directly. It
does not filter to the skill's Ailment or apply resistance to this extra damage.
Confirm the intended scope, timing and mitigation. Backdraft and its upgrades
remain blocked; no substitute mechanic has been invented.

**Decision (implemented).** Backdraft eats the Ailments of the TYPES the hit
itself carries (a Fire hit eats Burn; a converted hit eats its converted
type's), BEFORE the hit leaves any Ailment of its own — so it is worth nothing
unless something lit the body first, as the design says. What is eaten is what
those Ailments had left to tick, resisted per type exactly as the ticks would
have been and through `hide`, then landed at once at the node's share.

## W012 — Slow-attack bonus has no advertised cap

Strike's Rhythm says "up to 30%". `heftOf` uses
`1 + slowMore * max(0, FASTEST_SWING / attacksPerSecond - 1)` without an upper
cap. Cadence, Relentless and Follow Through add to `slowMore`. Decide whether
the cap is intended; the cap cannot be truthfully explained from this formula.

**Decision (implemented).** The cap is intended: `heftOf` clamps the
slowness term at 1, so the bonus is the sum of `slowMore` at most, reached when
the swing is half the fastest weapon's rate or slower. Rhythm alone is up to
30%; Cadence, Relentless and Follow Through raise the ceiling with the rate.

## W013 — Arc growth differs between ordinary Arc and Ball Lightning

Ordinary `projectile` uses `chainDamage * chainBuild ** i`, starting at `i=0`.
Potential does not replace the first Arc's default 70% share. `stepOrbs` uses
`(chainDamage * chainBuild) ** i`, compounding falloff as well as growth. Confirm
the intended first-hit value and per-hop growth for Potential and Capacitor
under Ball Lightning before approving them.

**Decision (implemented).** Ball Lightning counts Arcs as `projectile` does:
the first body is the ball's own hit at full share, and the i-th Arc after it is
`chainDamage × chainBuild^(i−1)` — Potential and Capacitor climb from the first
Arc's 70% exactly as they do on the ordinary bolt.

## W014 — Shield and reactive defence bypassed by boss hits

`dealDamage` applies `shieldLess`, `potionLess`, `struckLess` and `killGuard`.
Boss room `bite(hit=true)` applies Armour, movement reduction and Mana
absorption, but none of those four grants. `stepAilments` also skips the latter
three. The Wall promises less damage from hits; the others say less damage.
Clarify and align their intended scope before narrowing the copy.

**Decision (implemented).** `guarded()` is the one seam for what a build takes
off a HIT — flask, shield, the paint, a kill's cover, `takenScale` and the
Brink — read by `dealDamage` and by a boss room's `bite` alike, so a slam and a
drain honour them. Ailment ticks stay outside, like Armour. Word all four as
*less damage from hits*.

## W015 — Generated talent lines can contradict the authored description

`src/ui/trade.ts:saidBy` appends `GrantDef.say(nodeValue)` to each talent's
description. Those generated lines are separate ledger entries. Examples:
The missing weapon families and stat names in `weaponSpecialist.say`,
incremental recovery wording in `chargeRegen.say`, and multiplier wording in
`overchargeYield.say` are corrected in this batch. Other mechanics blockers
still apply to the affected generated lines. Approve a talent's full tooltip
only when both its authored description and generated entries are reviewed.

**Decision (no code change).** Agreed: a talent is approved only when its
authored line and every generated `say` line are reviewed. Nothing to fix in
the sim; the generated lines named in other findings follow those decisions.

## W016 — Exsanguinate leaves hit-dependent nodes inactive

Ambush's Exsanguinate calls `wound` instead of `hit`. `execute` is read only by
`dealDamage`, and chance-to-Bleed modifiers do not affect the guaranteed wound.
These nodes have no replacement faces under Exsanguinate, despite the tree
contract that existing investments remain useful after taking a keystone.
Their Exsanguinate entries are blocked pending Claude's mode rules.

**Decision (implemented).** Cull reads a tick as it reads a hit: a wound tick
that leaves a body under the bar finishes it (`stepAilments`), so the whole
Cull line is live under Exsanguinate and each of its four nodes carries a face
saying so. A chance to Bleed is nothing once every use Bleeds, so Exsanguinate
`converts` `ailmentChance` lines into increased Bleed Damage, beside the
Critical Damage conversion it already had.

## W017 — Spore Burst's kill burst has a different damage basis

`SKILL_BEHAVIOURS.ailment_burst` passes `castMultiplier * targetScale` to
`burstFrom`; the primary Spore hit additionally uses `spore.share` and
`ailmentMultiplier`. The death burst therefore is not a percentage of the
killing Spore hit. It also starts only from each cloud's target, even if other
enemies in that cloud die. Harvest, Seeding, Windborne and Taking Hold inherit
wording suggesting any Spore kill and an unspecified share of "the damage".
Confirm the intended trigger and damage basis before approving those faces.

**Decision (implemented).** The kill Burst under Spore Burst is a share of
THE SPORE HIT — `spore.share × ailmentMultiplier × castScale × targetScale`,
the same figure the body was hit for — and it goes off from EVERY body that
hit put down in the circle, not only the aimed-at one. Harvest, Seeding,
Windborne and Taking Hold say what they say.
