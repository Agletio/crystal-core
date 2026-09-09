# Prowler v2 — REVIEW SOURCE ONLY

2026-09-09. This is not import-ready art.

## Why this revision

Claude reported that the approved prowler identity holds and that v1's contour and cluster scale are acceptable. The remaining requested changes are harder neighbouring value steps (target 18-24, v1 12.8) and two alternating wide contact poses. The reported v1 foot spans were [19,18,17,47,16,16], with 4px vertical bob. The target is a second wide contact and about 2px bob.

Claude also corrected rectangular-cell fitting and body quantisation: one shared box, uniform scale, 24 inks using redmean. Those are integration fixes, not reasons to redesign the creature.

## What changed and what failed

Three image-tool edit calls used the existing source as reference in sequence:
1. Flat shading bands became more separated, but the gait stayed essentially unchanged and a grey checkerboard was painted into the image.
2. The leftmost contact was changed to put the foreground leg behind; frame 4 retains the foreground leg forward. Both now have visibly wide stances. This output is the selected review source.
3. A background-removal/spacing-only request failed to remove the checkerboard and altered the shading further. Discarded.

The selected source preserves the recognizable design, but I am not claiming identical contours, successful style metrics or a validated gait. The harder shading may now be too bright or graphic; measure it after a valid conversion.

## Delivery facts

cave-prowler-v2-review-source.png is the unchanged second edit output.
1880x837 pixels, 2,338,543 bytes.
All 1,573,560 pixels are fully opaque. ZERO transparent pixels.
46,013 RGB colours including the painted background.
The checkerboard and its ripples are actual pixels. Alpha thresholding cannot remove them.

Six figures remain in one row, but the wider first contact extends beyond an equal-width cell and crowds the second column. The fourth contact is also wider. Do NOT apply v1's cutting boundaries or six equal cuts; those would truncate feet.

No raster processing has been performed locally. The image is supplied for review/extraction only, with failed intermediate outputs omitted.

## What remains before an honest comparison

This source needs deterministic background extraction that preserves dark contours and pale claws, followed by isolation/repacking of the six full poses without clipping toes. Keep one common scale and registration; don't independently centre each figure or stretch it to a square. This is additional source preparation, not a renderer change.

Only after that preparation:
- Quantise all frames together to 24 inks using the corrected redmean path.
- Run styleread side by side on v1, v2 and shipped bodies. Report contour, cluster size, neighbouring value step and ink count. Target value step 18-24; avoid changing contour/cluster scale unnecessarily.
- Report all six foot spans, vertical bob and whether contacts 1 and 4 actually alternate support-leg identity.
- Play on the real cave floor at ship size; use a scratch ID and overwrite nothing.

Do not run whole-image style measurements on this opaque checkerboard source and interpret them as creature metrics. Do not mark this revision accepted until extraction, layout and motion are verified.

## Assessment

The requested second contact is now visible in the drawing, and the surfaces use stronger value bands. The file-format and layout defects remain unresolved. This is a partial art revision, not a completed pipeline delivery. The image tool repeatedly failed the transparency edit; additional prompt retries have not been shown to solve that.

