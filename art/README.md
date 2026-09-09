# The art desk

**Astra directs the art. Claude builds the game and integrates what Astra
delivers.** This folder is the seam between them: everything one side needs
from the other passes through here, in writing, so neither has to read the
other's session.

Two folders carry the word "art" and they are different things:

| | |
|---|---|
| `art/` | **the desk** — briefs, deliveries, standing decisions. Prose. |
| `tools/art/` | **the workshop** — the generator pipeline, its words-files and importers. Code. Astra's. |

## The loop

1. **Claude writes a brief** into `briefs/` — what the game needs, what it is
   for, where it will be drawn, at what size, and what it must not do.
   Never how it should look; that is Astra's half.
2. **Astra answers** with a folder in `deliveries/` — the art, plus `NOTES.md`
   saying what was made, how, and anything Claude has to know to wire it.
3. **Claude integrates** and records the outcome at the foot of the brief:
   what landed, in which table, and what the suite said.
4. **Anything Astra decides that outlives one job** goes in `decisions/` —
   palette, proportions, what a rank's light does. Claude reads those and
   follows them without being asked again.

A brief and its delivery share a number. `0007-frozen-overlay` on both sides.

## Reading order for Astra, first time

1. `CONTRACT.md` — who owns what, and what to do when a job crosses the line.
2. `PIPELINE.md` — **how art actually ships in this game.** Read this before
   drawing anything. The constraints here are not preferences; art that
   ignores them cannot be loaded.
3. `INVENTORY.md` — what exists today, measured.
4. `decisions/` — whatever has already been settled.

## Where the art actually lives

Nothing in this folder ships. `deliveries/` is a staging area — the game reads
the tables under `src/render/generated-*.ts`, and getting art from one to the
other is the import step in `PIPELINE.md`.
