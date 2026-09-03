---
name: critique
description: The art review loop — the creative director shoots and approves a set of screenshots, three indie-game critics rate it 1–10 against popular Steam pixel-art games, and the scores and reasons go into ART_REVIEW.md. Run after a large art change and at the end of every phase until every critic gives 8 or better. Invoke with /critique.
---

# The critique

*The user's ask: "a specialized agent whose entire job is to be the creative
director… take screenshots of the game at many different points judging the
art, UI design, themes and general flow… send these to other agents who will
act as indie game critics judging the art compared to other mainstream super
popular Steam indie games. They will rate the art strictly on a 1–10 scale
offering feedback as to why if possible. We will iterate until all critics
give an 8/10 or higher."*

A subagent cannot spawn agents, so THIS session runs the loop and the two
agents under `.claude/agents/` do the looking. Nothing in the loop writes
code; what comes out of it is a report and roadmap work.

## The loop

1. **A current bundle.** `npm run build` if anything under `src/` is newer
   than `docs/app.js`. The pictures are of what ships.
2. **The director.** `Agent` with `subagent_type: creative-director`, in the
   foreground — the critics wait on its set. Its prompt names today's date
   as the folder (`art-review/YYYY-MM-DD/`) and says what changed since the
   last review, if anything, so it knows where to look hardest. It hands
   back the path of `APPROVED.md` and the three worst faults.
3. **Three critics, in parallel**, `subagent_type: art-critic`, each handed
   the `APPROVED.md` path and ONE persona in its prompt so the three do not
   agree by construction:
   - *the pixel-art purist* — cluster shading, palette discipline, animation
     frames, one-generator consistency;
   - *the UI reviewer* — legibility, hierarchy, the frame, the fonts, what a
     new player's eye lands on;
   - *the Steam shopper* — the six-picture strip, what would make them click
     and what would make them leave.
4. **The report.** Append a section to `ART_REVIEW.md` at the repo root:
   the date, the commit (`git rev-parse --short HEAD`), the director's three
   worst faults, then a table — critic, bodies, floors, ui, effects,
   consistency, overall, compared to — and under it each critic's
   `fix_first` list verbatim. The pictures stay under `art-review/`, which is
   ignored by git; the report is committed.
5. **Below 8 from ANY critic is work.** Every `fix_first` line becomes a
   roadmap item under the phase that owns the art it names, written in the
   critic's words, and the loop is run again after that work lands. Do not
   argue a score down in the report; if a critic is wrong about a fact (a
   fallback that no longer ships, a screen it did not open), say so under
   the table in one line and let the next run settle it.
6. **Done** is every critic at 8 or better on the OVERALL score in one run.
   Say so in the report and stop running it after every phase; run it after
   large art changes only.

## What it is not

- The director does not generate art and the critics never see the source.
  A generation is spent by a session working a roadmap item, through the
  `art` skill, with the user approving the design.
- A score is not a balance number and does not gate a phase; the report is
  what the user reads, and what he does with it is his call.
- Do not tune the critics' prompts toward the score. The point of three
  personas is that they disagree; a run where all three say the same thing
  in the same words is a run to distrust.
