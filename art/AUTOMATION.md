# Automatic art handoffs

## Setup status — 2026-09-09

- GitHub reads succeeded as Agletio; GitHub reports pull, push and admin permission.
- ChatGPT automation **Crystal Core art handoffs** is **paused** at the owner's request; no hourly checks are enabled.
- Claude cloud routine: **not configured or verified from this session**.
- The complete art-production and integration loop has **not** passed an unattended run.

This file is the shared setup record. A successful file commit proves repository
writing, not image-generation availability in a future run or Claude activation.

## Event-triggered handoff plan — supersedes hourly setup below

The owner prefers a ready-work event over polling to avoid idle checks and
hour-long handoff delays. GitHub PR event support has been verified on both
sides. Neither event subscription has been configured yet.

The intended signal is a ready art-request PR for Astra and a ready delivery
PR for Claude. Filter each direction by a distinct title prefix and trigger
only on opening or marking ready, not every comment or commit. Processing must
deduplicate by brief and delivered revision, and read the event PR's actual
head contents rather than assuming an unmerged brief is already on main.

Claude setup should use a **GitHub event** trigger with no schedule.
Do not create the hourly routine described in the historical instructions below.
A configured trigger starts a new cloud session; delivery latency, execution
tools and account limits still apply. Event receipt and a complete handoff
remain untested.

## Previous hourly setup — reference only

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

1. Read current main and the art contract, pipeline and decisions. List briefs;
   take the highest-numbered actionable `open` request.
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
   Use a PR if direct writes are restricted and identify it in the handoff.
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

The first complete test is: an approved open brief -> real delivery plus
`delivered` on main -> Claude validation/integration plus Outcome and
`integrated` on main. Record both commit links here after it happens.
Until then, only scheduling and repository access have been established.

This setup uses hourly polling. No Worker, API billing account, or always-on
desktop is required. Notifications are for completed work and new blockers,
not empty checks. PR event triggers are an optional later configuration;
creating a file or PR alone does not activate an unconfigured routine.
