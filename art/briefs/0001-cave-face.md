# 0001 — the cut rock face, currently near-black

**Status:** open
**Handed over mid-flight.** Claude had generated candidates and was waiting on
the user when art direction moved to Astra. Everything below is what was
learned; the decision is Astra's, including the decision to throw all of it
out and start again.

## What it is for

A floor is one level throughout — no shelves, no stairs. So the **cut face**,
the strip drawn in the cell below a rock boundary, is the only thing that says
"this is a wall and not more floor". It is the whole of the map's depth cue.

Today it is the same near-black as the rock mass behind it, so the wall reads
as one flat silhouette. The ask on the table was to warm it — *"the face
(warm brown, not the Fissure's near-black)"*.

## Where it is drawn

`ZONES` in `generated-tiles.ts`, corner value `2`. It fills the cell BELOW the
boundary, so a wall spans two rows: `FACE_HEAD` (0.38) down from the top is
drawn as ground, and `FACE_FOOT` (0.81) is how far down the face reaches. Both
numbers are read by `src/vignettes.ts` and by the grid, not just the renderer
— **changing how much of the cell the face covers changes where a body may
stand**, which makes it a brief back to Claude rather than an art change.

## Size and format

32px tiles, one sheet per set, corner-keyed base three. See `PIPELINE.md`.

## Constraints that bite this job

- **One sheet is one exposure.** Three asks with byte-identical floor wording
  returned floor luma 117, 78 and 68. Words cannot hold the floor still.
- **The fix is `lower_base_tile_id`** — chain the floor to the tile the game
  already draws. Both candidates below do, and both hold the floor at luma 117
  rgb(132,115,87), the shipping floor to the byte.
- **The tone rule**: a LIGHT floor under DARK rock. An earlier attempt at a
  warm mass came back floor 68 against rock 65 — a separation of three — and
  the map did not read at all.
- A shipped set is never edited. A design proven here reaches a world through
  `DESIGN`.

## What already exists

`art/briefs/0001-cave-face.png` — three sets on one real map at ship size,
stacked. Top to bottom:

| set | floor | rock | |
|---|---|---|---|
| `test_round` | 117 | 39 | what ships now, near-black |
| `test_warm_chained` | 117 | 12 | warm brown face, near-black mass |
| `test_warm_mass_chained` | 117 | 58 rgb(85,49,31) | face and mass both warm |

Both candidates are on the Pixel Lab account and neither is imported. Their
asks are in `tools/art/zoneset.mts` under those names, with the failed pair
(`test_warm_face`, `test_warm_mass`) kept beside them so neither is asked
again.

Claude's read, offered and not binding: the middle one is what was asked for,
and the black mass is what makes the face read as an edge. The bottom one's
mass is flat and orange and the face stops separating from it.

## Done when

A set is picked, imported through `zoneset.mts emit`, and `npm run peek` and
`npm run shots` are clean. Claude does the import and the wiring through
`DESIGN`.

---
## Outcome
_not yet_
