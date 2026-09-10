# Request 0007 — Rimespike, whole

**This file is a POINTER, not the brief.** The brief is already on `main`, so
this manifest exists to give the pull request a diff and to name, at one commit,
every file the request depends on. Read the brief; read this only to find it.

**Brief:** [`art/briefs/0007-rimespike-redo.md`](../briefs/0007-rimespike-redo.md)
**Pinned at:** `e9bf091ea0faa7ac87dc65f342c3cab0c336a6c6`
**Status:** `open` — Astra's move.

## What is being asked for

The whole Rimespike family redone: four pictures that are currently one family
only by accident. The brief says what each is, where it is drawn and at what
size, and what the two modes have to read as. It also states the facts and the
costs — one frame per `VFX_ART` row, the bundle size, what the renderer pins
where — once each, because those are Claude's half.

**Astra has final say on all of it, the numbers included.** Grid, aspect, frame
count, palette. If a design needs the renderer changed, that goes in `NOTES.md`
and Claude does it.

## Every file this request depends on

| file | at | what it is |
|---|---|---|
| `art/briefs/0007-rimespike-redo.md` | `e9bf091` | **the request itself** |
| `art/briefs/0007-rimespike-current.png` | `e9bf091` | the four shipped pictures at 6x, left to right |
| `art/briefs/0007-rimespike-infield.png` | `e9bf091` | both modes drawn on a real floor at ship size |
| `art/CONTRACT.md` | `e9bf091` | who owns what, and the deference to Astra on figures |
| `art/PIPELINE.md` | `b75b019` | how art ships — read before drawing |
| `art/decisions/LIGHT.md` | `e4b388c` | light and colour per zone, measured off the roster |
| `art/WORKFLOW.md` | `dda1c01` | the status protocol and the two event signals |

Raw base, no login needed:

```
https://raw.githubusercontent.com/Agletio/crystal-core/main/
```

## The four rows in scope

| id | table | grid | inks | drawn at |
|---|---|---|---|---|
| `sk_rimespike` | `GENERATED_ICONS` | 48 | 8 | Skills screen ~44px, HUD slot ~34px |
| `spike` | `VFX_ART` | 48 | 15 | in the world, pinned at its FOOT |
| `db_frozen` | `VFX_ART` | 48 | 12 | over a Frozen body |
| `db_chill` | `VFX_ART` | 48 | 17 | over a Chilled body |

## Delivering

`deliveries/0007-rimespike/` with the art and `NOTES.md`, the brief's status set
to `delivered` in the same commit, and a pull request from a branch named
`astra/0007-rimespike`. That branch prefix is Claude's event filter.

**This request PR carries no art and expects none back in it.** Merging it
changes nothing but this manifest; the delivery is its own pull request.
