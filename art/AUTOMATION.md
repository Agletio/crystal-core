# Automatic art handoffs

## Setup status — 2026-09-10

- GitHub reads succeeded as Agletio; GitHub reports pull, push and admin permission.
- ChatGPT automation **Crystal Core art handoffs** is **paused** at the owner's request; no hourly checks are enabled.
- Claude cloud routine exists and is enabled per Claude's API readback below; its GitHub event delivery remains unverified.
- **Astra ready art requests**: creation with a GitHub PR trigger succeeded; readback confirms enabled and unscheduled. No event has run yet.
- The complete art-production and integration loop has **not** passed an unattended run.

This file is the shared setup record. A successful file commit proves repository
writing, not image-generation availability in a future run or Claude activation.

## Verified 2026-09-10 — Claude's routine, read back from the API

Read off `list_triggers` rather than off the form, so this is what is stored:

| | |
|---|---|
| routine | `trig_01DnB7qx2NkzKhnXX2KUQqJ4`, "Crystal Core art Integration" |
| enabled | **true** |
| schedule | **none** — `cron_expression` empty, no next run. **No polling.** |
| repository | `https://github.com/Agletio/crystal-core` |
| connectors | **none** — the `visualize` image generator was attached at creation and has been removed |
| prompt | the corrected git-only one, stored in full |
| tools | Bash, Read, Write, Edit, Glob, Grep, WebFetch, WebSearch — **no GitHub API**, which is why the prompt uses git |
| notifications | push on, email off |
| run history | **none recorded** |
| outcome branch | `claude/gracious-tesla`, pinned in the routine's own config — every run pushes there, so the second run lands on the first one's branch |

**WHAT THIS DOES NOT PROVE, AND MUST NOT BE READ AS PROVING:** the payload
carries **no GitHub trigger field at all** — no event, no repository
subscription, no filter. That is ambiguous between the endpoint not
serialising GitHub triggers and the trigger not being saved, and this session
cannot tell those apart. No tool available here exposes GitHub App
installations or repository webhooks either.

**So the trigger is UNVERIFIED.** Two things would settle it: the routine's
detail page showing its GitHub trigger row, and
`github.com/Agletio/crystal-core/settings/installations` showing Claude
installed and scoped to this repository. Until one of those, or until a real
event fires a run, the correct statement is that the routine exists and is
correctly configured in every respect this session can see, and that whether
an event reaches it is untested.

## Astra subscription created 2026-09-10

- Name: **Astra ready art requests**.
- Repository: `Agletio/crystal-core`; PR author: verified account `Agletio`.
- Title regex: `^ASTRA READY: [0-9]{4}-[a-z0-9-]+$`.
- Publish the first real request as **ASTRA READY: 0007-rimespike** on a
  `claude/` branch, targeting main. If the brief is already on main, a small
  request manifest referencing its path and source commit supplies the PR diff.
- Open a non-draft PR, or mark a matching draft ready. Include its source brief
  and reference paths. A file commit or title edit alone is not the signal.
- Comment, review and commit-update triggers were not enabled. The provider
  includes closed events; the prompt ignores those without starting art work.
- Readback confirms enabled and `X-UNSCHEDULED:1`. First event receipt is
  **not yet tested**. Creating the subscription succeeded with the filter
  above; the readback surface does not separately enumerate webhook filters.
- Deduplicate by source PR and relevant brief/assets revision. Record intake
  on the work branch and notify the owner once on receipt.
- Do not use `ASTRA READY:` on Astra delivery PRs. This avoids self-triggering.
- Claude may now publish 0007. No separate dummy art request is needed.

## Event-triggered handoff plan — supersedes hourly setup below

The owner prefers a ready-work event over polling to avoid idle checks and
hour-long handoff delays. GitHub PR event support has been verified on both
sides. Astra's subscription has now been created successfully. Claude's routine
exists, but its GitHub event wiring remains unverified.

The intended signal is a ready art-request PR for Astra and a ready delivery
PR for Claude. Astra filters the request title; Claude filters the delivery
head branch beginning with `astra/`. Processing must
deduplicate by brief and delivered revision, and read the event PR's actual
head contents rather than assuming an unmerged brief is already on main.

Claude setup should use a **GitHub event** trigger with no schedule.
Do not create the hourly routine described in the historical instructions below.
A configured trigger starts a new cloud session; delivery latency, execution
tools and account limits still apply. Event receipt and a complete handoff
remain untested.

## Previous hourly setup — reference only

**The live Claude routine prompt is in [ROUTINE.md](ROUTINE.md), not below.**
The prompt in this section is the superseded hourly one and is kept only so the
history reads; pasting it would create exactly the timed routine the owner
asked not to have. *(Added by Claude, additively — the rest of this file is
Astra's.)*

Open [Claude Routines](https://claude.ai/code/routines), create a **Cloud**
routine named **Crystal Core art integration**, select **Agletio/crystal-core**
and its working cloud environment, and choose **Hourly**. Use this prompt:

> Check Agletio/crystal-core for delivered art. Fetch the latest main safely
> and read art/README.md, art/WORKFLOW.md, art/AUTOMATION.md, art/CONTRACT.md,
> art/PIPELINE.md and standing decisions. This routine is scoped to art
> integration; do not start unrelated ROADMAP phases. Inspect numbered
> briefs and existing integration branches/PRs. If no unprocessed delivery
> exists, exit without changes. For each delivered brief, read its matching
> delivery NOTES.md, inspect the actual assets, and use the repository's art
> and harness instructions to validate and integrate them. Claude owns
> integration; do not generate, redesign or modify source art. Preserve
> Astra's NOTES.md. Write measurements and findings in the brief's Outcome.
> Commit the integration and status change together. Use a claude/ branch
> and a PR when main writes are unavailable; reuse an existing PR for the
> same delivery rather than creating duplicates. Report its URL. A change
> pending in a PR is not yet integrated on main. Do not merge or deploy
> without the owner's existing authorization. If a delivery fails
> validation, record the evidence and create a numbered follow-up brief,
> linking the superseded request so the same failure is not retried forever.
> Record only new owner decisions in art/QUESTIONS.md. Never overwrite
> another session's work or force-push. Regenerate art/astra-pack.md when
> the desk changes. Handle only the current queue and finish this run.

Click **Run now** once after saving. Confirm the transcript actually reads
the repo and reports the queue. Record the routine link and outcome here.
An empty queue is a successful connectivity check, not an integration test.

Claude routines run in the cloud while the laptop is closed. They consume
subscription usage and have account run limits; do not enable paid overages
for this setup. Main writes can be restricted, so a PR review/merge may remain
an owner step. Source: [Claude routine documentation](https://code.claude.com/docs/en/routines).

## Astra: each automation run

1. Fetch the triggering PR and its actual head SHA. Read that PR's brief and
   references, plus current contract, pipeline and decisions. Work on the
   event's brief, not an unrelated newer branch. Brief 0006 is dropped by the
   owner; 0007 Rimespike is the current assignment.
2. Check existing deliveries and open PRs for that brief before producing
   anything. A prior static sample does not satisfy an open animation request.
3. Respect recorded design approval. Do not infer approval for a replacement
   design from approval of an earlier one. Work with available tools; if a
   required reference or capability is missing, state the exact blocker.
4. Persist real assets and `NOTES.md` in the brief's matching delivery folder.
   Include source brief, approved reference, filenames, import instructions,
   checks actually run, and any renderer changes Claude must make.
5. Set `delivered` only when the requested deliverable is complete, with notes,
   assets and brief status in one commit. Preserve Claude's Outcome. Never
   update generated game tables merely to test repository access.
6. Re-read main before committing. Use a non-forced update; if main moved,
   reconcile against its new tip. If the brief changed, reassess the work.
   Publish completed deliveries through `astra/NNNN-slug` PRs; a direct main
   commit is not the Claude wake-up signal. Use `astra/0007-rimespike` for 0007.
7. For a new blocker, set `blocked: <reason>` and record a concrete unblock
   condition. Put owner questions in `QUESTIONS.md`; resume only when the
   condition is resolved. Do not repeat unchanged notifications or commits.

Only one session should produce a given brief at a time. Before working,
check for an active delivery PR or recorded work in progress; if another
session owns it, leave it alone. Recheck before publishing. Never replace
another session's assets silently.

## State and verification

The status protocol in WORKFLOW.md remains authoritative. Main is the shared
queue; unmerged branch changes do not advance main's status. The same numeric
brief ID must be explicit in NOTES.md even when historical folder slugs differ.

The first complete test is: a ready request PR -> Astra intake receipt and
art work -> real delivery PR from `astra/NNNN-slug`, with `delivered` on its
head -> Claude's measured Outcome. Neither PR has to be merged to be read.
Record request PR, Astra run/receipt, delivery PR and Claude run evidence here.
Merging and shipping remain separate owner decisions.

This setup is event-driven; the old hourly task remains paused. No polling
schedule was supplied for the new subscription. A run's available tools and
actual event receipt still need verification; subscription creation does not
prove unattended art generation or Claude integration.
