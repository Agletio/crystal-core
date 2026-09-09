# How art ships in this game

**Read this before drawing anything.** These are not preferences. Art that
ignores them cannot be loaded by the game at all.

## The one fact everything else follows from

**There are no image files, and no binary assets.** `docs/` is `index.html`
and a committed `app.js`, and that is the whole of what is served. Every
sprite in the game is either a **list of strings** with a colour key, or a
**PNG as a `data:` URI**, inside a `.ts` file under `src/render/`.

Cloudflare runs no build. `docs/app.js` is committed, so art is not "added to
the project" — it is compiled into the one file every player downloads.

**Measured today: `docs/app.js` is 16.33 MB, 5.68 MB gzipped**, of which about
17 MB of source is the art tables. The pipeline notes still record 1.62 MB /
0.43 gzipped, which was true and is a decade of art ago. **This is the live
budget constraint on art direction** and it is Astra's to weigh: the camp
scene alone is 4.93 MB and the bodies 9.42 MB. Nothing forbids growth; it
should just be a decision rather than a surprise.

Aseprite files, layered PSDs, reference sheets and working files are welcome
in `art/deliveries/` — they are source, not shipping format. Only the
generated tables ship.

## The tables, and what each one's shape is

| table | file | grid | shape |
|---|---|---|---|
| `GENERATED` | `generated-art.ts` | 96 | bodies: rows + key, multi-state, multi-facing |
| `GENERATED_ICONS` | `generated-icons.ts` | 48 | one frame, rows + key |
| `ZONES` | `generated-tiles.ts` | 32 | a PNG sheet + corner-keyed tile boxes |
| `GENERATED_PROPS` | `generated-props.ts` | varies | rows + key, anchored at the tile foot |
| `GENERATED_VFX` | `generated-vfx.ts` | 48 | rows + key |
| `GENERATED_UI` | `generated-ui.ts` | — | data URIs, worn as CSS 9-slices |
| `GENERATED_CAST` | `generated-cast.ts` | 128 | one still per trade, the cast hall only |
| `GENERATED_SCENE` | `generated-scene.ts` | — | the camp, one 688x384 picture |
| `GENERATED_PORTRAITS` | `generated-portraits.ts` | — | speech-bubble busts |

### A grid sprite

```ts
{ grid: 48, rows: ['....AB..', '...ACB..', …], key: { A: '#3b2f2a', B: '#c9bfa3' } }
```

One character per pixel, `.` transparent, every other character a key into
`key`. The grid does not have to divide the cell it is drawn into — the
renderer samples per destination pixel.

### A body

Bodies carry more, and each field is load-bearing:

- **`dirs` is the EAST HALF of the compass only.** The renderer mirrors
  anything facing left. Drawing the western three is paying twice for art
  that never draws.
- **`frames` is direction-MAJOR**, one flat list; `states` names which
  indexes of the FIRST facing are which state. A facing is one stride along
  the list.
- **A state is named for an ACTION** — `idle`, `walk`, `attack`, `hurt`,
  `death` — **or for the SKILL it throws**, which is looked up first, so fire,
  frost and lightning are three animations. `cast` is the fallback.
- **`hurt` and `death` play once and hold on the last frame.** A death that
  loops is a body getting up again. An **attack ends at full extension and
  never recovers** — the last kept frame is the pose the game sits on, so a
  "settles back upright" beat throws the blow away.
- **`stride` is tiles covered per whole GAIT CYCLE**, and it is measured off
  the art, never chosen. Feet at their widest is one step, two is a cycle.
  The suite prints depicted against travelled for every body. A robe defeats
  the measurement, so `robed: true` prints the reason instead.
- **Nothing may ask for a frame nobody drew.** The suite sweeps every action,
  skill and facing, and also fails a frame that ships which nothing reaches.

### A tileset

A Wang set, **keyed by four CORNERS in base three** — `0` floor, `1` rock,
`2` the cut face — as `((NW*3 + NE)*3 + SW)*3 + SE`. The cut face fills the
cell BELOW a boundary, so a wall spans two rows.

- **A tile may not be rotated.** A floor tile is lit from one side; a rotated
  one reads as a checkerboard, which is worse than the repetition it was
  meant to fix.
- **Two sets may not be mixed on an edge.** A second terrain chains off the
  first's own base tile (`lower_base_tile_id`) so it meets the floor the game
  already draws.
- **One sheet is one exposure.** Wording about the rock drags the floor's
  brightness with it — measured, byte-identical floor wording returned luma
  117, 78 and 68 across three asks. Pin a floor by chaining it, never by
  describing it again.
- **A floor is ONE tile and the wash varies it**, applied over the whole floor
  as one field. Nothing is tinted per cell — a per-cell tint is a hard line at
  every cell whatever noise drives it.

## Colour

**Hand-drawn art takes its colours from CSS at runtime.** `readPalette` pulls
custom properties off the document and each art key maps a character to a
palette entry. Never write a literal colour into art code.

**Generated art is baked hex, and that is decided, not an oversight** — a body
asked DARK separates from all four pale zone floors, so it is generated once
rather than once per zone.

Two namespaces that must not be crossed: `VARS` in `render/renderer.ts` is the
MAP's, and `--ink` / `--panel` / `--edge` / `--text` are the FRAME's. That
split is what stops a retheme re-inking committed art.

## Rules about bodies that are already settled

- **Nothing is drawn under a body and nothing on its edge.** A contact shadow
  was drawn under every body and deleted at the user's word. A lamplit rim was
  tried and deleted — *"it's eating into their art instead of adding a
  border"* — because it recoloured the outermost pixels, which are the
  silhouette. A rank's glow lies OUTSIDE the art and is the only light a body
  wears.
- **A body stands on its tile, pinned at its own FOOT**, measured off the art
  as `bodyFoot`. Anchored at the centre it hangs half its height over the void.
- **An idle is a breath, never a gesture.** Anything whose inked box shifts
  more than `IDLE_CALM` between idle frames holds its first frame instead.
- **A transform may not stand in for a frame that exists.** The old lunge and
  bob were the only motion a hand-drawn body had; over a real swing they are a
  second motion fighting the first.

## Only Pixi draws sprites

`src/render/pixi.ts` is the real renderer; `canvas2d.ts` is a fallback that
draws coloured circles. **Sprite work being invisible in the fallback is
correct**, not a bug. Anything per-tile is a pure function in
`render/renderer.ts` so both read one answer.

## The generator, as it stands today

`tools/art/` speaks to Pixel Lab over MCP (`mcp.mts`, plain JSON-RPC over one
POST). A words-file says what to ask; a `*.mts` tool asks and imports.

```
icons.json   → icon.mts → portrait.mts <id> <png> 48 icons   an icon
bodies.json  → body.mts ask|state|sheet|fill → tables.mts    a body
             → record.mts                    reads group ids back off the server
zoneset.mts  ask|get|emit                                    a floor
uikit.mts / webkit.mts                                       a fixture
vfx.json     → portrait.mts <id> <png> 48 vfx                an effect
weapons.json → variant.mts                                   a hero holding one weapon
```

Costs, measured: a design is 1 generation (~30s); a rotation 2; one animation
state across five facings ~13; **a finished body ~68 generations**, most of an
hour. The job limit is TEN per account and `list_jobs` is the only
authoritative count. **A refusal arrives as normal text, not an error** — code
that does not check the response for an id is recording a lie.

This pipeline is Astra's now, to keep, extend or replace. What may not change
without a brief is the *shape of the tables it writes*, because the renderer
reads those.

## Judging

- `npm run build` then `npm run peek` — a descent, at a zoom, a crop.
- `npm run shots` (~2.5 min) — all 30 screens against a checklist.
- `npx tsx tools/art/shipped.mts <sprite> out.png [scale] [states]` draws a
  body out of `GENERATED`, which is what the renderer actually reads. The
  server's own sheet and the shipped table differ by the whole import — the
  window, the fitting, the levelling, the quantisation.
- `npx tsx tools/art/audit.mts <state> out.png <sprite…>` puts one state
  across every body in one picture, which is the only way the odd one out is
  visible.

**A claim about art needs a screenshot.** That is a house rule and it applies
to both of us.
