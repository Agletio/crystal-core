# Writing requests for Astra

The current queue is the pending, stale and blocked entries in `entries.json`.
The first remaining batch is skill cards and keyword explanations. Mechanics
disagreements are in `BLOCKERS.md`. No additional requests have been filed here.

Use this format to supply context for a tracked entry, or to register new text
outside the current extractor. Reuse the same ID when the wording changes.
Group related IDs when they share one mechanics change.

```text
Entry ID(s): existing ledger IDs, or a new stable ID such as ui.craft.empty
Status: pending / stale / blocked
Text location: repository path and function, selector or data ID
Implementation: paths and functions that determine the rule
Mechanics revision: commit SHA; identify any uncommitted changes
Reviewed text revision: ledger hash, or none for new/unreviewed text
Current text: source excerpt or current text hash
Intended rule: what happens, when, how much, limits, stacking and alternate modes
Request: wording needed, uncertainty to resolve, and priority
Blocker: W-number if applicable
```

Do not copy reviewed status into this request to bypass the ledger. Astra reads
the implementation and records the review there. A request does not itself
notify Astra; include its IDs in the next handoff with the branch and commit.
