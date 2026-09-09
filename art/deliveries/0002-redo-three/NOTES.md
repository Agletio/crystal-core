# 0002 — Astra's first three skill-icon candidates

Date: 2026-09-09
Status: source-art comparison candidates. NOT ready for direct shipping.
Owner requested three PNGs and an honest account of the process. No existing game assets were replaced.

## Read of the existing art, recorded before drawing

The supplied icon sheets use selective dark contours, compact colour clusters and small bright highlights to describe materials. Strike reads through a steel-blue diagonal; Fireball through a pale core within an orange head and tail. Brown and ochre connect otherwise different materials. Recognition depends mainly on silhouette and a few strong light-dark boundaries.

I inspected the live camp, Abilities shelf and combat HUD in the hosted game. The interface places icons on very dark warm panels within worn brown-and-gold frames; the camp adds violet rock and warm firelight. Strike remained legible in the small HUD slot. On the Abilities shelf, Ambush's thin purple silhouette nearly disappeared. That set the first design priority: more blade area and a clearer light edge.

## Delivered PNGs

- strike-source.png — broad steel sword pointing up-right, bronze guard and leather grip. Preserve the decisive bright edge and dark blue underside.
- fireball-source.png — compact bright head with an asymmetric orange mantle and a split trailing flame. Self-lit, with the brightest point toward the leading edge.
- ambush-source.png — broad violet dagger pointing down-left, bronze fittings and a pale blade edge. Reverse orientation distinguishes it from Strike. The small purple echo was intended to suggest sudden movement.

All three are original generated designs. The supplied images and palette informed the direction; they were not traced. The generation calls used written specifications rather than attached image inputs.

## How they were made

Used the built-in image-generation tool, once per icon, with a common art direction and subject-specific prompts. Requested an exact 48x48 logical grid, native 48x48 output if supported, 12-14 specified palette colours, full transparency outside the silhouette, binary alpha, restrained pixel clusters and no smooth gradients.

The actual tool output did not satisfy those technical requests. PNGs are copied unchanged from the generated originals. No resizing, palette quantisation, alpha thresholding or pixel retouching has been applied.

PROMPTS.md contains the exact three prompts. measurements.json contains read-only measurements of the delivered PNG files, obtained with Pillow.

## The format is fighting me

The tool produces the appearance of enlarged pixel art without reliably obeying a native grid, exact colour palette or binary alpha. It also adds fine shading. These are not proven integer enlargements of a 48px original, so treating their apparent blocks as a reliable pixel grid would be a mistake.

| Source | Dimensions | Distinct RGB colours where alpha > 0 | Pixels with alpha 1-254 | Pixels with alpha 255 |
| --- | --- | ---: | ---: | ---: |
| Strike | 1254x1254 | 47,407 | 349,860 | 1,377 |
| Fireball | 1254x1254 | 40,263 | 418,732 | 2,218 |
| Ambush | 1254x1254 | 49,113 | 264,280 | 1,676 |

All three have genuinely transparent areas and alpha values spanning 0-255, but alpha is not hard. Many interior pixels are nearly opaque rather than exactly 255, so the partial-alpha counts are not simply an edge-halo measurement.

These measurements are NOT the game's gridcheck results. The game repository and its importer/test tools are not present in this workspace. No scratch-table import, shipped comparison, bundle measurement or in-game rendering of these candidates has occurred.

## What I would want done differently

1. Enforce the final grid, palette and alpha through the conversion stage; prompts alone demonstrably did not enforce them. Judge the converted 48px art, since these enlarged previews cannot establish small-size quality.
2. Keep Ambush's broader blade and reversed direction. I would test removing its detached purple echo: it may read as debris at 34px. The dagger is also relatively long; a shorter blade and smaller fittings may better separate it from Strike after reduction.
3. Fireball needs its head to remain dominant after reduction. If its three trailing strands fragment, consolidate the tail into fewer broader clusters.
4. Strike and Ambush received more material shading and ornament than the existing icons. Simplify that detail before expanding this style into a roster. Their common metal fittings help them belong together, but that is a design intention, not yet a validated set.
5. A successful icon import would establish only the single-picture path. It would not establish character consistency, animation quality or tileset compatibility.

## Handoff to Claude

Please follow brief 0002's large-output fallback: resample these source candidates before import. Preserve the originals and create separate working copies.

- Inspect with gridcheck.mts first; report what it detects rather than assuming a clean logical grid.
- Produce one 48x48 RGBA candidate per source. Use a consistent fit with roughly 3px padding; exclude near-transparent fringe from fit bounds. Establish binary alpha deliberately, preserving the blade tips and flame silhouette.
- Map colours to the supplied icon palette without dithering. Aim for approximately 12-15 used colours, prioritising the light edge, material midtone and deep contour.
- Inspect the 48px result at 34px and 44px on the actual panel background. If thresholding or resampling changes the design materially, show that result rather than silently calling it finished.
- Run gridcheck.mts on the converted files beside the corresponding shipped rows.
- Use portrait.mts <unused-scratch-id> <converted-48px.png> 48 icons. Choose verified unused scratch IDs; do not overwrite the shipped originals.
- Capture the three old/new pairs from the imported tables at ship size on the real interface. Record the conversion settings and any bundle-size change.
- No new anchor, layer, animation state, table shape or renderer change is requested.

The owner decides after seeing the converted comparison. This delivery does not establish readiness to replace the rest of the game's art.

