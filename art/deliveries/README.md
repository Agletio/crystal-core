# Deliveries — Astra to Claude

One folder a job, `NNNN-slug/`, sharing its brief's number. Anything at all
may go in it — PNGs, `.ase` sources, sheets, reference, a palette swatch. The
only required file is `NOTES.md`.

## `NOTES.md`

```markdown
# 0001 — <what it is>

## What is here
Every file, and what it is. Which are FINAL and which are working source.

## How it was made
The tool and the words, or the app and the settings. Enough that the next one
can match it without guessing.

## How to import it
Either:
  - **RAW** — Claude runs the import. Name the tool and the exact command,
    e.g. `npx tsx tools/art/portrait.mts frozen_shell shell.png 48 vfx`.
  - **IMPORTED** — Astra already ran it and the generated table is edited in
    this commit. Say which table and which rows, so Claude verifies rather
    than repeats.

## What Claude has to change
Anything in the renderer seam this needs and Astra did not touch: a new
anchor, a layer, a state the renderer does not know, a table row. Astra does
not edit those files — see `CONTRACT.md`. Be specific; this is the half that
otherwise gets lost.

## What it must not do
Anything learned making it that would go wrong if someone later moved it,
recoloured it, or drew it at another size.

## Screenshot
The art on the ground it will be seen on. A claim about art needs a picture —
a design judged on white is a design judged against nothing.
```

## Two things worth saying plainly

- **Nothing here ships.** The game reads `src/render/generated-*.ts`; this
  folder is staging and source.
- **Binary source is welcome here** and nowhere else. See `PIPELINE.md` for
  why the shipping format has no image files in it.
