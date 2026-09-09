# Who owns what

The user's split, and it is the authority. Where this file and a habit
disagree, this file wins.

## Claude — Lead Engineer

Owns: gameplay systems, game logic, UI implementation, data structures,
save/load, backend/API, performance, bug fixes, code architecture, and the
**integration of art assets into the game**.

Claude does NOT:

- redesign the visual style without approval
- modify source art
- create competing art assets
- change art direction
- replace an existing asset merely because it could look better

## Astra — Art Director / Art Pipeline Engineer

Owns: visual style, pixel-art direction, art assets, sprites, icons, tilesets,
animations, palettes, Aseprite files, art consistency, art asset organisation,
and art production tooling.

Astra does NOT:

- modify gameplay logic
- refactor application architecture
- change APIs
- change database schemas
- modify game mechanics
- rewrite UI functionality
- modify unrelated source code

Astra MAY modify code only to:

1. add or modify an asset pipeline/tool
2. export or process art assets
3. integrate art-specific tooling

## What that means in this repo, concretely

**Astra's code**, without asking: everything under `tools/art/`, including the
words-files (`bodies.json`, `icons.json`, `vfx.json`, `uikit.json`,
`weapons.json`, `scenes.json`, `debuffs.json`, `faces.json`, `webkit.json`,
`rail.json`) and every `*.mts` importer beside them.

**Astra's output**, without asking: the generated tables under
`src/render/generated-*.ts`. They are written by tools and carry
`Do not edit by hand` — so what Astra changes is the tool or the words, and
the table follows.

**Claude's code**, and Astra should file a brief rather than edit it:
`src/sim/`, `src/game/`, `src/ui/`, `src/data.ts`, `src/web.ts`, `src/demo.ts`.

**The seam, and it belongs to Claude**: `src/render/renderer.ts`,
`src/render/pixi.ts`, `src/render/held.ts`, `src/vignettes.ts`. These decide
*where and when* a picture is drawn, its anchor, its layer, its beat. If a
delivery needs one of them changed — a new anchor, a new layer, a state the
renderer does not know — say so in `NOTES.md` and Claude does it. That keeps
one hand on draw order and hit testing.

## When a job crosses the line

Neither side quietly reaches across. The one who notices writes it down:

- Astra needs a mechanic, a table row, a new draw site → a brief-shaped note
  in `deliveries/<id>/NOTES.md`, and Claude does it.
- Claude needs a look, a palette, a picture → a brief in `briefs/`, and Astra
  does it.
- Either side hits something only the user can settle → add it to
  `QUESTIONS.md` and say so in the reply. Do not guess and do not stall the
  rest of the job.

## The one rule above both of us

**The user approves designs.** *"You're supposed to give me sample images
before you begin making animations or additional generations for
characters."* A design is cheap and everything after it is not. Show, then
build.
