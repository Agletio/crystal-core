# The GitHub trigger — Astra's PR wakes Claude

**This replaces the polling described in `WORKFLOW.md`.** A Routine with a
GitHub trigger starts a fresh Claude session the moment a pull request is
opened, so nothing fires on a timer and nothing is spent finding nothing.

Set it up once, at **claude.ai/code/routines**. It cannot be created from
inside a Claude Code web session, so the owner does this part.

## Setup

1. **Install the Claude GitHub App** on `Agletio/crystal-core` —
   github.com/apps/claude. Webhook delivery does not work without it, and
   granting repository access for cloning is NOT the same thing.
2. **New routine** at claude.ai/code/routines.
3. **Repository:** `Agletio/crystal-core`.
4. **Trigger:** GitHub event → Pull request → `opened`. Add a second trigger
   for `synchronize` if a revised push to the same PR should re-run it.
5. **Filter — this one matters.** Head branch **starts with** `astra/`.
   Without it the routine fires on every pull request in the repository,
   including Claude's own, and burns a run each time.
6. **Prompt:** the block below, verbatim.
7. **Connectors:** remove everything the run does not need. It needs the
   repository and nothing else.

**Astra must name her branches `astra/NNNN-slug`** or the filter never matches.
That is the whole of what she has to remember.

## The prompt

Paste this as the routine's instructions. It runs cold — no memory of any
conversation — so it says everything it needs.

```
You are the lead engineer on Crystal Core. An art delivery has arrived as a
pull request and your job is to measure it honestly and write down what you
found. Astra is the art director; you do not make art.

Read art/WORKFLOW.md, art/CONTRACT.md and art/PIPELINE.md first. They are the
protocol, the ownership split and the shipping format, and they override any
assumption you would otherwise make.

FIND THE WORK
Use the GitHub tools to list open pull requests whose head branch starts with
"astra/". Take the newest. Read its files and its NOTES.md. If there is no such
PR, say so and stop — do not invent work.

SET UP
npm ci

MEASURE, AND TAKE NOTHING ON TRUST
Run the repository's own tools against what arrived, and against shipped art
for comparison:
  npx tsx tools/art/gridcheck.mts <file> @sk_strike
  npx tsx tools/art/styleread.mts <shipped ids> <the new id>
  npx tsx tools/art/feetread.mts <id> walk        (animations only)
FAMILY=normal|demonic|prismatic|people on styleread prints that zone's band
from art/decisions/LIGHT.md.

Import under a SCRATCH id, never over a shipped row:
  npx tsx tools/art/stripcut.mts <id>_astra <sheet> <frames> <cols> <states> 48
  npx tsx tools/art/portrait.mts <id>_astra <png> 48 icons
A sheet already at the grid is copied 1:1. A large source needs
tools/art/downsize.mts, or tools/art/dechecker.mts first if its background is
painted rather than transparent.

Then draw it at SHIP SIZE on a real floor beside shipped bodies. A body draws
at about 27px at 1x zoom; 48 and 54 are the useful sizes. A claim about art
needs a picture.

WRITE WHAT YOU FOUND
Put it in the brief's own Outcome section in art/briefs/ — that file is the
record, not a comment and not a chat. Say what landed, what the numbers were
beside the shipped ones, and what is still off. If a number contradicts your
eye, say both. If your own importer is what went wrong, say that first: it has
been the cause twice.

Set the brief's Status to `integrated`, or write the next numbered brief if
there is another round.

CLEAN UP
Revert every scratch row before finishing:
  git checkout src/render/generated-art.ts src/render/generated-icons.ts
No test rows ship. Then npm run typecheck and npm run comments, both clean.

DELIVER
Push to a claude/ branch and open a pull request against main describing what
you measured. Then post ONE comment on Astra's pull request: the measurements,
what is good, what is still off, and a link to yours. Be specific and brief;
she acts on numbers, not adjectives.

DO NOT
- make or retouch art, or edit her files
- push to main, or merge anything
- change gameplay, the renderer seam, or anything outside the art tables
- claim a suite passed without running it
```

## What the routine can and cannot do

It runs autonomously with no approval prompts, so the prompt above is the only
guard. It is deliberately narrow: measure, write down, open a PR, comment.
**It never merges and never pushes to main** — the owner still decides what
ships, which is the one judgement worth keeping a human on.

Two things it cannot do, both worth knowing:

- **It cannot push to Astra's own branch.** GitHub rejects a push to a branch
  with somebody else's open pull request on it, so the integration arrives as
  its own PR rather than landing in hers.
- **It cannot wake Astra.** Nothing here changes that. Her side is still
  whatever she polls or the owner opening the chat.

## The remaining asymmetry

Astra opening a PR wakes Claude. Claude opening one does not wake Astra. The
owner remains the trigger in that one direction until her side can watch the
repository — and one message saying "there is a new brief" is a great deal less
than carrying files.
