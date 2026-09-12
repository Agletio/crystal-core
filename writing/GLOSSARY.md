# Glossary review

All 33 definitions in `src/keywords.ts` were read against main
`726e1417229ffd1bc07c923cf1da2eccc7f55d6d`. This batch rewrites their explanatory
text, preserving keyword IDs, names, aliases, grants, relationships and scaling
labels. The approved character-selection copy remains the style reference.

**28 reviewed; 5 blocked.** Blocked entries have clearer descriptions of
confirmed behavior but are not approved as complete rules. No gameplay changes
are included. In particular, Shock's disputed secondary targeting is omitted
until Claude resolves W021; do not treat that omission as removing the effect.

The ledger records the source and text fingerprints. References below identify
the consumers behind each definition, including exceptions to broad rules.

| Entry | Status | Implementation and review |
| --- | --- | --- |
| `keyword.projectile` | reviewed | `src/sim/skills.ts`: `projectile`, `spreadTargets`, `fanOut`, `fallOn`, `strikeShocked`; ordinary direct hits share a visited set, extra shots have full share, Splash/Bursts can overlap, alternate modes replace delivery. |
| `keyword.pierce` | reviewed | `src/data.ts`: `PROJECTILE`; `src/sim/skills.ts`: `alongRay`, `projectile`, `hailOf`; target count, original-target corridor, 4.5-tile extension and default 70% share confirmed. |
| `keyword.arc` | reviewed | `src/sim/skills.ts`: `projectile`; `src/sim/run.ts`: `stepOrbs`; nearest unhit target from last hit, 4.5 tiles, default 70% of full hit rather than repeated 30% loss; explicit growth overrides. |
| `keyword.fork` | reviewed | `src/sim/skills.ts`: `projectile`; nearest unhit targets within 3.2 tiles of original target, one per Fork, default 45% share, independent of shot direction. |
| `keyword.spread` | reviewed | `src/sim/skills.ts`: `spreadTargets`; `PROJECTILE.spread * spreadRange`, measured from original target; no `areaRadius` call. |
| `keyword.repeat` | reviewed | `src/sim/skills.ts`: `melee`, `throwBlades`, `spin`; `src/sim/run.ts`: `swing`; one Mana payment per use, ordinary repeated hits stop on primary death, alternate attacks repeat their pattern. |
| `keyword.burst` | reviewed | `src/sim/skills.ts`: `burstFrom`, `blastAround`; `src/sim/run.ts`: `sunder`, `spreadAilment`, `burstCurse`; sources differ in damage, radius and trigger. Death-hit chains stop after 8 generations. Removed false blanket claims about passive scaling and diameter. |
| `keyword.splash` | reviewed | `src/sim/skills.ts`: `splashFrom`; requires a skill's `splash` definition, excludes the central target, uses listed share and area-scaled radius; repeated hits can overlap their Splashes. |
| `keyword.convert` | reviewed | `src/sim/stats.ts`: `damageBreakdown`, `convertedType`, `retag`, `treeMod`, `effectiveSkill`; base/tree conversion differs from partial added-damage conversion. Gear keeps tags; unrelated added damage survives. |
| `keyword.echo` | reviewed | `src/sim/skills.ts`: `melee`; nearest other enemies, 70% default share, 1.5 + 0.6 times prior Echo count in tiles, measured from original target. Removed whole-use uniqueness claim because Repeats/carry/Splash can hit again. |
| `keyword.cone` | reviewed | `src/sim/skills.ts`: `cone`, `inWedge`; uncapped targets, full standard hit, angle capped at 360 degrees; Fissure and Tremor replace geometry/delivery. |
| `keyword.cloud` | reviewed | `src/sim/skills.ts`: `ailment_burst`, `leaveClouds`; `src/sim/run.ts`: `stepClouds`; ordinary Blight applies once, Wandering Rot persists and reapplies, Spore Burst hits, overlapping areas may affect the same enemy. |
| `keyword.ailment` | reviewed | `src/data.ts`: `AILMENT`, `AILMENTS`; `src/sim/run.ts`: `applyTyped`, `strike`, `applyAilment`, `stepAilments`, `hide`; hero typed-hit chance, guaranteed stacks plus remainder, shared 12-stack cap with oldest replacement, resistance and Second Skin exception. |
| `keyword.burn` | reviewed | `src/data.ts`: Burn definition; `src/sim/stats.ts`: `ailmentDamage`, `ailmentChances`; `src/sim/run.ts`: `strike`, `stepAilments`; 26 base Fire DPS per stack for 4s before Ailment modifiers, independent of Attack/Spell/Critical Damage. |
| `keyword.bleed` | reviewed | `src/data.ts`: Bleed definition; `src/sim/stats.ts`: `ailmentDamage`; `src/sim/run.ts`: `strike`, `stepAilments`, `useSkill.wound`; 22 base Physical DPS for 5s, source modifiers including Exsanguinate apply; no Critical tick damage. |
| `keyword.poison` | reviewed | `src/sim/skills.ts`: `ailment_burst`; `src/sim/run.ts`: `applyAilment`, `stepAilments`, `spreadAilment`; source defines damage/duration, including typed added damage; tick Critical Chance only triggers Contagion and never Critical Damage. |
| `keyword.chill` | blocked | W018: `src/data.ts` promises movement Slow; `RunSim.chill`, `hasteOf`, `paceOf`, `stepEffects`, `stepAilments`, `freeze` disagree on movement and Slow duration. Confirmed base stacks, Attack/Cast Slow, distinct hero threshold and immediately available guaranteed Critical are clarified; no movement claim added. |
| `keyword.shock` | blocked | W021: `RunSim.shockArc` selects monsters when carrier is hero, but only the hero when carrier is monster. This contradicts the nearby-enemy rule. Confirmed base 7 Lightning DPS for 4s is rewritten; secondary targeting awaits Claude. |
| `keyword.curse` | reviewed | `src/data.ts`: Curse definition; `src/sim/run.ts`: `strike`, `burstCurse`; base 8s, enemy death releases Dark damage of 4% maximum Life per stack, 2.2-tile radius, each recipient's Resistance; Starved can scale it. |
| `keyword.exposure` | reviewed | `src/data.ts`: Exposure definition; `src/sim/run.ts`: `dealDamage`, `stepAilments`; base 5s, additive 4% increased hit damage taken per stack, no increased Ailment tick damage; magnitude/protection modifiers may apply. |
| `keyword.area` | reviewed | `src/sim/run.ts`: `areaRadius`; `src/sim/skills.ts`: Splash, Cloud, death Burst and Cone consumers; radius uses square root of area multiplier, 100% area gives about 41% radius, no damage multiplier. Fixed-radius passives are not included in the blanket promise. |
| `keyword.increased` | reviewed | `src/mods.ts`: `aggregate`, `computeStat`, `percentStat`; additive increases/reductions multiply base plus flats; added chance bonuses use percentage points. |
| `keyword.more` | reviewed | `src/mods.ts`: `computeStat`; `src/sim/grants.ts`: family merge rules; `src/sim/run.ts`: `hasteOf`, `paceOf`; separate factors multiply, explicitly summed per-stack/family bonuses combine first. |
| `keyword.critical` | reviewed | `src/sim/stats.ts`: `playerStats`; `src/sim/run.ts`: `dealDamage`, `critChanceOf`, `stepAilments`; normal hit multiplier 2 + Critical Damage / 100, increased base Critical Chance, no Critical damage on ticks, crit-into-buff is an exception. |
| `keyword.resistance` | reviewed | `src/sim/stats.ts`: `resistancesFrom`; `src/sim/run.ts`: `afterResistance`, `dealDamage`, `bite`, `stepAilments`; per-type 75% cap, applies to damage over time, multiplies separately from Armour. |
| `keyword.block` | reviewed | `src/sim/stats.ts`: `blockChance`; `src/sim/run.ts`: `dealDamage`, `bite`, `stepAilments`; 60% cap, ordinary hit negation; boss room damage and Ailment ticks do not roll Block. |
| `keyword.dodge` | reviewed | `src/sim/stats.ts`: `playerStats`; `src/sim/run.ts`: `dealDamage`, `bite`, `stepAilments`; 50% cap, ordinary hit avoidance, Armour conversion removes reduction; boss room damage and ticks do not roll Dodge. |
| `keyword.armour` | blocked | W019: `src/data.ts` says 300 Armour reaches half the 75% cap, but `src/sim/stats.ts:armourReduction` returns 50%. Rewrite confirms hit/type scope, diminishing returns and cap, omitting the disputed example. |
| `keyword.starved` | blocked | W005: `RunSim.swing`, `weak`, `dealDamage`, `applyAilment`; confirmed insufficient-Mana trigger, remaining-Mana payment, 50% default hit share and Life-payment exception; Blight Poison bypasses the penalty, contrary to broad talent promises. |
| `keyword.slow` | reviewed | `src/sim/run.ts`: `slowFor`, `hasteOf`, `stepEffects`, Heavy Hand and Block Stagger consumers; reduces Attack/Cast rate by stated share for effect duration; does not reduce damage. Movement is not claimed (W018). |
| `keyword.charge` | reviewed | `src/data.ts`: `POTIONS`; `src/sim/run.ts`: constructor, `drink`, `bankCharges`, `stepRecharge`; two per flask per descent, one per use, restoration capped individually, no extra stockpile across descents. |
| `keyword.gust` | blocked | W020: `src/sim/movers.ts`: `moverStats`; `RunSim.stepGusts`, `spendGust`, `paceOf`, `bite`; base three, additive 10% per Gust within separate movement multiplier, six-second recovery restarted on loss; boss drains also consume Gusts despite hit-only source wording. |
| `keyword.stun` | reviewed | `src/data.ts`: `stunChanceFor`; `src/sim/run.ts`: `stun`, `stepMonster`, `dealDamage`; requires Stun grant, chance is damage/maxLife to power 1.5 before modifiers, killing-hit trigger, movement/action lock for duration. |

## Handoff to Claude

Resolve W018–W021 in `BLOCKERS.md`, and the glossary consequence of W005. State
the intended rule beside each decision, implement any required mechanics change,
run `npm run writing:sync`, and leave the affected entries blocked or stale for
Astra. Add the changed IDs, implementation references, branch and commit to
`REQUESTS.md`. New definitions start pending. Preserve reviewed wording when a
mechanics change does not affect its meaning; do not mark placeholder copy reviewed.
