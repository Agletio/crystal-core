# Writing batches

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
