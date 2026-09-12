# Mechanics questions for Claude

Writing review base: `e1413d520e265eb950b4ea83f86c9fa961441fe1`.
These are findings for the implementation owner. No gameplay was changed.
Status remains blocked until the intended rule and implementation agree.

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

## W004 — Skill bonuses after a kill have no clock of their own

`targetScale` reads `killMore.seconds` only as a type declaration; it checks
`use.sinceKill > 0`. `RunSim.kill` starts that timer only for `killGuard`,
`killHaste` or `killMove`, using the Rogue's 3s duration. A skill's standalone
"4s after a kill" bonus therefore never activates, and with a Rogue grant it
lasts 3s. Affects the `killMore` nodes in Ambush, Shockwave, Blight and Arc
Lightning. Decide and implement the intended timer before approving their copy.

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

## W006 — Chill strength ignores ailmentMultiplier

Rimespike's Hoar and Deepening minors grant `ailmentMultiplier`. `strike` uses
it for DPS, but `chill` computes Slow from stack count, `slowPer` and `weak()`;
it never reads `ailmentMultiplier`. Hoar currently cannot strengthen Chill as
promised. The same mismatch affects general Ailment-strength promises under
Cold conversion. Clarify the intended effect rather than changing a number.

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

## W009 — Attack-only speed wording also affects spells

`heroStats.attacksPerSecond` multiplies both attack and spell rates by
`twoHandRate` and `pairRate`; `hasteOf` applies `killHaste` to both as well.
Warrior and Rogue text names attacks only. Separately, Alchemist `potionHaste`
is labelled increased speed but is multiplied after the stat calculation.
Confirm these scopes and stacking rules before approving the affected nodes.

## W010 — Critical buff still deals double damage

`critIntoBuff`'s declaration promises no extra Critical damage. `heroStats`
sets `critMultiplier` to zero, but `dealDamage` still multiplies a Critical by
`2 + critMultiplier / 100`. The Long Cut therefore keeps the base double
damage. Its description also omits the stated tradeoff. Block until the intended
critical rule is implemented.

## W011 — Backdraft consumes all damaging Ailments after applying new ones

The grant contract says the skill's own Ailment is consumed. `dealDamage`
first calls `applyTyped`, then sums remaining DPS from every Ailment, removes
all of them if the sum is positive, and subtracts that damage directly. It
does not filter to the skill's Ailment or apply resistance to this extra damage.
Confirm the intended scope, timing and mitigation. Backdraft and its upgrades
remain blocked; no substitute mechanic has been invented.

## W012 — Slow-attack bonus has no advertised cap

Strike's Rhythm says "up to 30%". `heftOf` uses
`1 + slowMore * max(0, FASTEST_SWING / attacksPerSecond - 1)` without an upper
cap. Cadence, Relentless and Follow Through add to `slowMore`. Decide whether
the cap is intended; the cap cannot be truthfully explained from this formula.

## W013 — Arc growth differs between ordinary Arc and Ball Lightning

Ordinary `projectile` uses `chainDamage * chainBuild ** i`, starting at `i=0`.
Potential does not replace the first Arc's default 70% share. `stepOrbs` uses
`(chainDamage * chainBuild) ** i`, compounding falloff as well as growth. Confirm
the intended first-hit value and per-hop growth for Potential and Capacitor
under Ball Lightning before approving them.

## W014 — Shield and reactive defence bypassed by boss hits

`dealDamage` applies `shieldLess`, `potionLess`, `struckLess` and `killGuard`.
Boss room `bite(hit=true)` applies Armour, movement reduction and Mana
absorption, but none of those four grants. `stepAilments` also skips the latter
three. The Wall promises less damage from hits; the others say less damage.
Clarify and align their intended scope before narrowing the copy.

## W015 — Generated talent lines can contradict the authored description

`src/ui/trade.ts:saidBy` appends `GrantDef.say(nodeValue)` to each talent's
description. Those generated lines are separate ledger entries. Examples:
The missing weapon families and stat names in `weaponSpecialist.say`,
incremental recovery wording in `chargeRegen.say`, and multiplier wording in
`overchargeYield.say` are corrected in this batch. Other mechanics blockers
still apply to the affected generated lines. Approve a talent's full tooltip
only when both its authored description and generated entries are reviewed.

## W016 — Exsanguinate leaves hit-dependent nodes inactive

Ambush's Exsanguinate calls `wound` instead of `hit`. `execute` is read only by
`dealDamage`, and chance-to-Bleed modifiers do not affect the guaranteed wound.
These nodes have no replacement faces under Exsanguinate, despite the tree
contract that existing investments remain useful after taking a keystone.
Their Exsanguinate entries are blocked pending Claude's mode rules.

## W017 — Spore Burst's kill burst has a different damage basis

`SKILL_BEHAVIOURS.ailment_burst` passes `castMultiplier * targetScale` to
`burstFrom`; the primary Spore hit additionally uses `spore.share` and
`ailmentMultiplier`. The death burst therefore is not a percentage of the
killing Spore hit. It also starts only from each cloud's target, even if other
enemies in that cloud die. Harvest, Seeding, Windborne and Taking Hold inherit
wording suggesting any Spore kill and an unspecified share of "the damage".
Confirm the intended trigger and damage basis before approving those faces.
