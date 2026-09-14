# Writing batches

## Batch 3 — menus, crafting, dialogue and remaining cards

Completed the broad review against main `4267c981`, including all menu
modules, static labels, HUD explanations, 88 dialogue/scene entries, 25
currencies, nine professions, 24 materials, all 35 skill cards, four character
introductions, 162 Reckoning node/choice entries and 18 objectives. Clear
existing text remains in place. See `MENUS-DIALOGUE.md` for the evidence.

The durable inventory now contains **2,504 reviewed and nine blocked entries**,
with no pending or stale entries. W005, W008 and W018–W021 are resolved;
W022–W026 are Claude's current mechanics questions. Counts describe review
units and include unchanged copy, not just rewritten sentences.

Validation: all 1,285 default demo checks passed; all eight writing tests and
the inventory check passed; typecheck, comments and theme checks passed.
Chromium screenshots reported no overflow or console errors, and the drag
probe passed. Source/HTML comparison confirmed unchanged gameplay structure,
IDs, bindings and styles outside the audited copy formatters. The generated
bundle is rebuilt. The PR records publication and live verification.

The older sections below retain the history of prior batches.

## Batch 2 — entire glossary

All **33 keyword definitions** in `src/keywords.ts` were reviewed against main
`726e1417` and rewritten for clear targeting, amounts, timing and exceptions.
`GLOSSARY.md` records individual implementation evidence. **28 are reviewed;
five remain blocked** on mechanics questions (W005 and W018–W021). Their copy
clarifies confirmed behavior without approving the disputed rules. Shock's
secondary-target description is intentionally deferred to Claude.

The ledger now has **1,783 reviewed, 31 blocked, 39 pending, no stale entries**.
Pending entries are skill cards and character introductions, not glossary
definitions. Keyword IDs, names, aliases, grants, relationships and scaling
labels are preserved. Only glossary prose and its string formatter change in
game source; the generated browser bundle is rebuilt for publication.

Validation and publication are recorded in the glossary pull request. The
earlier sections below describe completed tree work, not the current queue.

## Current publication follow-up

Reconciled draft PR #17 with main `2e13ebb1`. Claude's mechanics fixes were on
main, but the writing branch and its bundle had not been merged. The only merge
conflict was the generated `docs/app.js`; rebuilding it includes both sets of
changes. This follow-up changes text and Contagion's glossary association only.

- **1,755 reviewed**, including the revised movement, talent and alternate-mode
  descriptions and their generated tooltip lines. Clear copy was retained.
- **26 blocked**, limited to the remaining W005 and W008 questions documented
  at the top of `BLOCKERS.md`. Their disputed text remains unapproved.
- **72 pending**, covering skill cards, keyword explanations and the previously
  owner-approved character introductions. **No stale entries** remain.

The source comparison confirms no new gameplay, IDs, names or lore changes in
the 13 source files edited in this follow-up. The explicit presentation-only
exception moves Contagion's glossary lookup from Cloud to Burst. Parsed source
comparison verifies every other non-copy field and expression is unchanged.
Typechecking, comment/theme budgets, all five writing-workflow tests and all
1,248 default demo checks pass (15 slow balance sections skipped, two parked).
The modifier check exposed an existing missing tooltip for Permafrost's partial
`spikeRamp` grant. Its display function now describes the added four percentage
points without requiring the stack cap to be repeated in the upgrade's data.

The earlier counts below describe the initial pass and Claude's handoff.

## Batch 1 — skill and character talent trees

Reviewed against main `e1413d520e265eb950b4ea83f86c9fa961441fe1`, using the
approved character-selection rewrite as the style reference. GitHub's PR and
branch lists contained no recoverable earlier skill-writing publication.

All eight main skill trees, three movement trees and four character talent
trees have an initial mechanics review. The ledger includes generated minors,
choices, every reachable keystone face and generated talent tooltip lines.
These are review entries, not a count of unique authored sentences.

- **1,581 reviewed:** clear existing wording retained; unclear amounts,
  conditions, radius, resource recovery, conversion and stacking clarified.
- **200 blocked:** see the numbered findings in `BLOCKERS.md`. These entries
  have been inspected but are not approved. No gameplay was changed to resolve
  them. Some plainly correct portions were clarified while the disputed claim
  remains blocked.
- **72 pending:** skill cards, keyword definitions and the approved character
  introductions are inventoried for the next batch. Pending does not revoke the
  owner's earlier character-selection approval; it means a ledger review has
  not yet been recorded for that entry.

Source verification compared parsed code with the base commit: all 16 edited
game source files retain their executable mechanics, stable IDs, names and
character lore. Text-producing `say` functions are presentation code and were
checked against their consumers. Workflow regression tests cover new, unchanged,
edited, stale and blocked entries, and mechanics fingerprints.

The next batch covers skill cards and keyword explanations, followed by sheet
rules, equipment and crafting, encounters and tutorial text, then UI messages.
The inventory must be extended as those surfaces are taken up; untracked text
is not implicitly reviewed. Current live counts are always available through
`npm run writing -- report`.

## Claude's mechanics pass on the batch-1 blockers

Every W-number in `BLOCKERS.md` carries a Decision; twelve were implemented
(W004–W008, W010–W014, W016, W017) and five confirmed as intended (W001–W003,
W009, W015). All 200 blocked entries are pending again for review against the
settled rules. The sim change makes every reviewed tree entry stale by the
module-level dependency; `REQUESTS.md` lists which need new words and which
only need the review recorded again. Quick demo: all checks pass; every
keystone mode replayed at band 4 within its band.
