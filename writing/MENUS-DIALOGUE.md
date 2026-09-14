# Menus, dialogue and crafting review

Reviewed against GitHub main `4267c9817887a8bbd28a11e9fe71c777c9368c01`, including
Claude's requests since the glossary merge, `552ab901`. The approved character
selection copy remains the voice reference. This batch preserves gameplay,
saved IDs, character names, art, bindings and menu structure.

The ledger has **2,504 reviewed entries and nine blocked entries**, with no
pending or stale entries in its current inventory. Entries are review units,
not a count of rewritten sentences. Good existing text was retained.

## Coverage and evidence

| Surface | Entries | Implementation reviewed |
| --- | ---: | --- |
| Menu declarations, static HTML and HUD text | 364 | Every `src/ui` menu; action handlers in `src/game`; static labels and accessibility text in `docs/index.html`; `RunSim.readBuffs/readDebuffs` |
| Dialogue, scenes, cutscenes, workers and handovers | 88 | `SCENES`, `TALES`, `LAMPWRIGHT`, worker/NPC tables; `game/scenes.ts`, `game/crystals.ts`, `game/smith.ts`, `game/graft.ts` |
| Currency, professions and materials | 58 | `shardFor`, `tierRank`, `costOf`, `wear`, `dismantleShards`; `game/forge.ts`, `game/work.ts`, `game/smith.ts`, `professions.ts` |
| Reckoning nodes/choices and Ledger objectives | 180 | `trials/web.ts`, `trials/layout.ts`, `game/trials.ts`; `RunSim` spawning, Welling, Splitting, Hoards, Bearers and kill counters; `dropBias` and `randomGearBase` |
| Skill cards and character introductions | 39 | Skill behavior, grants and stat consumers; all ordinary and alternate modes; the new Aethermancer resource rules |
| Previous skill trees, talents and glossary | Remaining inventory | Mechanics diff from `552ab901` through `4267c981`, then the changed consumers; unchanged earlier reviews revalidated |

The menu sweep includes the crafting bench, anvil, jewellery, Smith, all five
processing stations, meals, professions, equipment, shop, buyback, stash,
grafting, skill shelves, talent trees, progression maps, crystals, Reckoning,
Journal, save/load, settings, run reports, confirmations and development menus.
Functional labels that already read well remain unchanged.

Crafting copy distinguishes adding a modifier from upgrading it one rank,
per-upgrade shard costs from the total investment, and socket fracture from
losing an entire item. Instability equal to capacity is safe; exceeding it
destroys the socket's modifier and spends the shards. The Jewelling level,
recipe plans, compatible item types and available sockets remain the gates.
No gameplay rule was changed to suit the descriptions.

Work descriptions distinguish the hero's job, paused during descents, from
rescued workers' jobs. Processing consumes the stack at assignment and finishes
one item at a time. Cooking quality is read when a meal is eaten. The profession
screen no longer advertises equipment-base unlocks for Cooking and now includes
Jewelling's modifier-rank unlocks; these are display corrections only.

The Lampwright keeps his weary caution; the Smith remains blunt; the
Glasswright keeps her certainty; the Osteomancer's speech remains broken.
The new journal handover and tales were edited in context, including what the
player has actually met, claimed or unlocked at that point. No scene order,
reward, portrait, animation or character identity changed.

The Reckoning distinguishes increased spawn/drop weighting from guaranteed
extra drops. Event-chance bonuses add percentage points. Welling and Splitting
retain their rank limits and their exclusions for enemies created by the other
effect. Objective names and suitable flavor were preserved.

## Claude's requests

W005, W008 and W018–W021 are resolved for this review. Chill's live stacks now
slow movement and skill use; Gusts survive boss drains; Shock arcs to nearby
monsters; Starved and Overcharge reach Blight's Poison and Exsanguinate;
Blight's Critical Damage replacements and their Spore Burst faces match code.
The Armour formula is unchanged and its corrected interpretation is accepted.

The ten new Aethermancer notables and generated grant lines were reviewed.
Their copy now states resource thresholds, replacement Overcharge costs,
recovery limits and damage scope. Deep Winter and Slow Burn retain blockers
for alternate modes. Three additional passive-skill questions are recorded as
W024–W026. The nine affected entries are explicitly blocked, not approved by
silently narrowing their advertised mechanics.

## Validation boundary

The source comparison verifies unchanged executable structure outside prose
and audited display functions: `ailmentMeans`, `unlocksFor`,
`saysProfession`, and the two HUD methods `readBuffs/readDebuffs`. The HUD
changes compute displayed figures from existing grants and correct labels;
they do not change damage, timing, targeting or resource costs. Static HTML
retains every element, binding, style and script. A single existing demo
assertion was updated to recognize the revised busy-worker message.

The PR records typecheck, writing tests/check, comment/theme checks, the default
gameplay demo, layout screenshots, drag checks, bundle rebuild and live asset
verification. The default demo's explicitly parked balance sections remain
parked; this writing pass does not resolve them.

The inventory is not a localization layer and does not claim automatic
semantic coverage of every future feature. New rendering modules enter the
menu inventory automatically. For a new data registry or imported helper,
Claude should add its IDs/dependencies and a request; untracked text is never
implicitly reviewed. Future equipment lore, new encounters and new systems
remain separate manageable writing batches.
