# 0007 — Rimespike concept v1 (NOT A DELIVERY)

**Status:** awaiting owner design approval.
Source: [request PR #16](https://github.com/Agletio/crystal-core/pull/16), head
`906f4fdf724e1c3b0840cdd32070faec810225ff`. Work branch: `astra/0007-rimespike`.

## Provider decision and intake history

The initial receipt interpreted the brief's historical PixelLab quote as a
provider requirement and recorded unavailable access. The owner then clarified:
"So the idea is for you to replace pixel lab not sure why Claude is saying to use it".
That blocker is RESOLVED. Astra replaces PixelLab using built-in OpenAI image
generation. No PixelLab key or setup is requested. This does not waive design
approval. The brief records the correction without altering Claude's Outcome.

## Actual output

- `spike-concept-v1-source.png`: one new static spike concept from one built-in
  image-generation call, preserved unchanged.
- `PROMPT.md`: exact prompt and provider.
- `measurements.json`: measured source properties, not a claim of import readiness.
- `INTAKE.json`: source, revision, provider clarification and deduplication state.

Direction proposed: an asymmetrical pointed ice blade, dark blue faceted mass,
a strong internal fissure and subordinate splinters. This is the first design
sample for the owner, not an approved direction or final production asset.

## Checks actually performed

Verified PR eligibility, read its manifest/brief and both reference PNGs at the
source SHA, visually inspected both references, and read current CONTRACT,
WORKFLOW, PIPELINE, AUTOMATION and LIGHT. Checked branches and all-state
Rimespike PRs; no prior work branch/delivery/claim existed. Compared source/main
brief and reference blob SHAs: identical before this work. Later bookkeeping
commits were not treated as new art revisions.

Inspected the generated sample and measured it with Pillow:
1024 x 1536 RGBA, 1,115,131 bytes; 1,290,364 fully transparent pixels,
282,500 partially transparent pixels, zero fully opaque pixels, alpha 0–254.
There are 100,057 unique RGB values including transparent pixels. The requested
64 x 96 logical grid is a prompt target, NOT a measured grid. The result has
soft glow and partial alpha and therefore fails the game's hard-alpha
production requirement. Preserve it as concept source only. No game tables,
gridcheck/styleread, build, renderer or floor tests were run on new assets.

## Approval and remaining scope

The owner must review shape and direction before further generations or animation.
`sk_rimespike`, production `spike`, `db_frozen` and `db_chill` all remain
in scope; none is marked delivered. No animation or variation has been made.
The witch (0006) was not resumed. Do not import this concept.

## Claude / renderer handoff

No renderer change is requested yet; wait for an approved production design.
The erupting field must remain visually distinct from the 3.5-second standing
Rimefield. Final anchor, layer, aspect or sequence requirements will be recorded
here with actual assets; Claude owns renderer implementation. Debuffs must
respect the no-under-body/no-body-edge decision. Final checks need the real
floor and both modes at ship size, and the icon at HUD/Skills sizes.

No delivery PR, merge or deployment was performed. There is no evidence of a
Claude integration run. This proves request receipt and initial concept
generation, not the completed end-to-end handoff. The webhook remains unchanged.
