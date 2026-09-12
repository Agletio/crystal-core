# Writing review

Astra reviews player-facing copy against implementation. Claude owns changes to
mechanics. Preserve names, character identities and good existing text. Use the
approved character selection copy in `src/trades/` at `4e68b380` as the style
reference: direct rules, separate intentional lore. Main was verified on GitHub
at `e1413d520e265eb950b4ea83f86c9fa961441fe1` on 2026-09-11.

No earlier writing PR or writing branch was present among all 14 PRs and all
eight branches returned by GitHub. The approved character rewrite is on main;
no interrupted local skill-tree draft was recovered in this workspace. Review
the current source rather than treating an earlier draft as published.

## Commands

- `npm run writing:sync`: discover entries and refresh current revisions.
- `npm run writing:check`: fail on inventory drift or stale reviews.
- `npm run writing -- report`: print status counts without changing the ledger.
- `npm run writing -- review skill.blink "Evidence and review decision"`: record
  an actual review, including unchanged copy. Accepts an exact ID or ID prefix.
- `npm run writing -- block skill.blink.bk_wake "BLOCK-ID: evidence"`: record an
  unresolved mechanics question. Sync preserves blockers. Resolve a blocker by
  recording the decision in `BLOCKERS.md`, setting that entry to pending, then
  reviewing its current implementation and text.

`entries.json` is the durable ledger. IDs use existing saved node IDs, scoped by
skill or character; choices and alternate keystone faces have their own IDs.
Generated minor nodes retain the layout's save IDs. Never rename an ID because
the prose changed. A source file and semantic selector locate each entry;
generated minor IDs can be resolved with `BUILT_TREES` or `TRADES`.

Each entry records current text, implementation paths, current mechanics and
text hashes, status, reviewed mechanics and text hashes, review-base commit and
notes. Hashes identify the exact content reviewed, including uncommitted work;
the base commit alone is not a claim that edits were published.

New entries are **pending**. A reviewed entry whose text or mechanics changes
becomes **stale**. Unchanged text can be **reviewed**. Unresolved disagreement
between implementation and intended behavior is **blocked**. Pending and
blocked entries remain visible without preventing Claude from shipping systems.
Sync never grants approval or clears a blocker.

## Claude's handoff to Astra

After changing mechanics or text, run `npm run writing:sync` and commit the
updated ledger with the implementation. New tracked entries become pending;
affected reviewed entries become stale. Keep stable IDs. Do not mark entries
reviewed merely to pass a check. Astra may approve wording without changing it.

Use `writing/REQUESTS.md` to give Astra context: entry IDs, text locations,
implementation references, the mechanics commit, intended amounts and conditions,
and the requested priority. For text outside the extractor, assign a descriptive
stable ID and record it there as pending until its surface is inventoried.
Never infer that untracked text has been reviewed.

For a mechanics disagreement, retain blocked status and record the decision or
fix under its W-number in `writing/BLOCKERS.md`, with the relevant commit and
entry IDs. After the rule is settled, return the affected entries to pending
for Astra's review; do not silently clear the disagreement or rewrite gameplay
to justify existing prose. Stale checks require a writing review before merge,
but Claude can continue implementation on a branch while the review is pending.

The files are a durable queue; they do not send notifications. Include the
branch, commit and affected IDs when handing work back to Astra.

Mechanics revisions include values, conditions, allocation rules, alternate
faces and dependency source. Source fingerprints ignore comments, formatting
and named copy properties, but retain executable rules. Dependencies currently
use whole modules: a shared mechanics change conservatively makes many reviews
stale. This may over-report impact; it must never silently approve a change.
When adding a new implementation module, add its dependency here in
`tools/writing.mts`. The tool does not infer a complete dependency graph.

## Batch order and scope

1. All 11 skill trees, including Blink, Leap and Gale, and all four character
   talent trees. Include choices, explicit alternate faces and stat conversions.
2. Skill cards, generated grant lines, keyword explanations and character-sheet
   rules. The complete 33-entry glossary pass is recorded in `GLOSSARY.md`:
   28 reviewed and five blocked on mechanics questions. Cards remain pending.
3. Equipment, modifiers, flasks and crafting.
4. Quests, tutorial and encounter text; then navigation, empty states and errors.

The current extractor covers batch 1, skill cards, character introductions and
keywords. Other surfaces are a backlog, not implicitly reviewed. Extend the
extractor with stable domain IDs when taking each subsequent batch. Keep prose
in its existing source location; this ledger is not a second localization layer.

Read each mechanic's consumers, not just its grant label. Check targeting,
timing, stacking, caps and alternate modes. Distinguish increased from more,
radius from area, percentage points from percentages, and increments from
replacement totals. Never change a mechanic to make a sentence true.

Before a writing PR: sync the ledger, run its checks and regression tests, run
the repository's relevant validation, rebuild `docs/app.js`, and verify the diff
contains no gameplay changes. Record blockers for Claude in this directory.
