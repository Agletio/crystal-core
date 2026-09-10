# What exists today

Measured, not remembered. Regenerate the table with
`for f in src/render/generated-*.ts; do …` — the numbers below are from
2026-09-09 and will drift.

## The shipped size

| | |
|---|---|
| `docs/app.js` | **16.33 MB**, **5.68 MB gzipped** |
| the art tables | **~17 MB of source**, 11 files |

Every player downloads that on first load. The camp scene is 4.93 MB of it and
the bodies 9.42 MB. **This is a live constraint on art direction**, and the
first thing worth an opinion.

## The tables

| file | size | rows | what |
|---|---|---|---|
| `generated-art.ts` | 9.42 MB | 126 | bodies — monsters, heroes, hero-plus-weapon variants |
| `generated-scene.ts` | 4.93 MB | 37 | the camp picture, the title, the tales |
| `generated-props.ts` | 0.72 MB | 110 | floor objects: chests, ore nodes, cover, growth |
| `generated-icons.ts` | 0.58 MB | 209 | gear, skills, currencies, materials, screens |
| `generated-tiles.ts` | 0.27 MB | 15 | Wang tilesets, one per zone plus chained terrain |
| `generated-ui.ts` | 0.10 MB | 7 | frames and plates, worn as CSS 9-slices |
| `generated-cast.ts` | 0.06 MB | 4 | one 128px still a trade, cast hall only |
| `generated-portraits.ts` | 0.05 MB | 5 | speech-bubble busts |
| `generated-vfx.ts` | 0.04 MB | 15 | effect pictures — the ice spike, burst shards |
| `generated-web.ts` | 0.02 MB | 4 | skill-web frames and chain links |
| `generated-grain.ts` | 0.01 MB | 3 | floor grain marks |

## What has no art yet

- **Gale** is the one skill with no generated icon, of 34. It falls back to
  the movement shelf's boot — another skill's picture. The old generator was
  asked eight or more times and never drew it. This is brief 0002.
- **The other fallback grids** in `src/ui/icons.ts` predate the pipeline and
  are reached by nothing that ships; nothing new joins them.
- **`fault_glass`**, the Seam's own material, has an icon but no FLOOR NODE
  picture — it wears the ore's until its own is asked.
- **`torch` and `hung`** in `HUNG_PROPS` are art waiting for an author.

## Open art questions the user has not settled

Both are in `QUESTIONS.md`. Neither should be guessed at.

## Rules the user has already given about art

Kept here so they are not rediscovered the expensive way. Each is his own
word, and each cost something.

- *"Make sure you're using the pixel lab art generator and not creating art
  yourself. We need it to match the rest of the art."* Seven hand-written
  icons shipped once and were replaced the same week. **The TOOL in that
  sentence is superseded and the RULE is not** — *"the idea is for you to
  replace pixel lab"* — so it now reads: art comes off Astra's generator, and
  Claude does not draw.
- *"You're supposed to give me sample images before you begin making
  animations or additional generations for characters."* A body was designed,
  rotated, animated and half-dressed before he saw it.
- *"There is a shadow behind the character looks weird just remove it."*
- *"It's eating into their art instead of adding a border."* — on a lamplit rim.
- *"Delete all of that old self made crap and use the new icons."*
- *"The idle thing honestly looks bad."* — on the cast hall's idle breath.
- *"They are gone because I deleted some stuff that I really didn't like
  wanting you to stop using it."* — on assets missing from the server. Keep
  the grid that ships; ask before regenerating.
- *"The harsh color lines in the floors."* — per-cell tinting, twice.
- *"The repeating bubbles on the water look bad."*
- *"Lets just get rid of the raised areas they look bad and its too hard to
  make it work."*
