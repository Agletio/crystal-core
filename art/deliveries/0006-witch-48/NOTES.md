# Crystal Core — witch size test

This delivery tests the owner-preferred human witch concept at a real 48×48 grid. It is one cast still, not an animated body or an integrated game asset. No game files have been changed.

## Art direction carried forward

Natural human anatomy; readable burgundy and charcoal clothing; controlled colors and deliberate pixel shading. Preserve these qualities while simplifying details that disappear at display size. The owner preferred this witch to the over-simplified Cave Prowler. This size test has not yet received owner review.

## Files

- `witch-body-48.png`: transparent 48×48 body-only cast still, 40px ink height, 23 opaque colors.
- `witch-spell-48.png`: detached spell on the same 48×48 canvas, using the same origin and palette. Do not auto-trim or independently fit these layers.
- `witch-cast-composite-48.png`: both layers combined, 24 opaque colors. Review reference only; do not bake a permanent spell into a whole character.
- `witch-cast-composite-27.png`: nearest-neighbor 27×27 display simulation of the composite. The actual figure spans 23px vertically inside this canvas.
- `witch-size-comparison.png`: exact exports enlarged 8× alongside views at actual pixel dimensions. The floor is sampled from the supplied grid-comparison screenshot. This is a composited size test, not a live renderer capture.
- `measurements.json`: local measurements and conversion parameters.
- `export-witch.cjs`: exact export procedure. Requires Node, sharp and ImageMagick `convert`. Set `CODEX_PRIMARY_RUNTIME_NODE_MODULES` to the directory containing sharp, then run `node export-witch.cjs` inside the extracted folder. An optional first argument selects that folder.
- `source/`: original approved concept, imagegen background-isolation result, and supplied game-floor reference for reproduction.

## Production method and checks

The built-in imagegen tool isolated the gray-background concept using an instruction to preserve the character and change only the background to alpha. This is generative extraction, not a pixel-identical mask of the approved concept. The isolated source remained large and carried partial alpha; it was not treated as a finished sprite.

The technical export hardens alpha at 128, uses the shared occupied source rectangle [352,249,746,838], fits it uniformly to 40px height with nearest-neighbor sampling, and places the resulting 36×40 image at (6,4) inside 48×48. Opaque pixels are quantized together to 24 colors with no dithering. A cut between detached body and spell produces two aligned layers; there are zero overlapping pixels, and recombining them exactly reconstructs the composite. Binary alpha and maximum color count were verified after export.

Whole-body median luma is **38.0**, using Rec.709 coefficients on 8-bit RGB. Excluding the one-pixel silhouette boundary gives **42.1**. These are local measurements, not results from the repository's `styleread` implementation. The retained skin highlights reach luma 237.4; no global darkening was applied to force a value range. The corrected brief prioritizes shadow mass, not a narrow range.

At 48×48 the hair, robe divisions and casting pose remain distinguishable. At 27×27 the face and fingers lose specificity, and the small spell fragments. The comparison deliberately exposes this loss. No animation or gait quality is claimed.

## Claude handoff

Keep this under a scratch ID. Do not replace a shipped body. Run the repository's `gridcheck` and `styleread` against a shipped 48px human, then capture the still on the actual Fissure floor at the ordinary monster draw size. Source-reference compositing cannot establish exact Pixi sampling or renderer placement.

This is one cast pose only. Further frames and states require their own production pass. Do not invent walk frames, stride, idle, attack or death metadata for this still. Determine the foot anchor from the exported body using the established pipeline. Renderer anchors, spell timing, layers and integration remain Claude's responsibility. The spell layer's full-canvas alignment is delivery metadata, not a request to add a new renderer layer.

Imagegen extraction prompt (abridged): “Change ONLY the gray background into genuine transparent alpha. Preserve the existing character exactly: same body shape, anatomy, face, hair, pixel shading, dark burgundy and charcoal colors, extended casting arm, outfit, boots, pose, camera, and small violet spell. Remove gray background between shapes; keep complete figure and spell uncut.”
