---
name: screens
description: The UI shell — windows, the rail, the dock, modals, the HUD over a full-screen map, theme tokens and generated fixtures, tooltips and item cards, speech bubbles, badges. Load before touching src/ui/, src/web.ts or docs/index.html.
---

# Screens

**One module per screen in `src/ui/`**, each rendering CONTENT into ids the
markup owns, with position and size in CSS. **Do not bake a position into a
content module** — only `tooltip`, `skills`, `menu` and `inventory` touch
geometry at all, each for a stated reason.

**Adding a modal is two places**: the markup in `docs/index.html`, and the
`SCREENS` table in `src/web.ts` — one row of open, close, is-open and the
element id, off which Escape and the window stack both come, so neither is a
third place.

## The map is the screen

`body.mapfull`, toggled by `syncViewportLock`, puts the stage fixed at
`inset: 0` behind the shell; every panel is a corner. Life, mana and level are a
thin HUD bottom left with the three skill slots on it; the rail is its own stack
bottom right; a skinny XP bar runs the full width of the floor; the flasks are
bottom centre.

**The stage is UNDER the shell, so every structural wrapper needs
`pointer-events: none` and the LEAVES take one back.** Hit testing asks what is
on top, not what is opaque, and forgetting it kills drag, zoom and follow
together. `.skillslot` and `.debuff` were not on that list and three buttons and
two hoverable boxes were visible, looked right and did nothing at all.
`hudProbe` in `shots.mjs` catches it: a leaf whose own centre hit-tests to the
map. A window sitting over one is not that.

Two more that were bugs first: a fixed box at `bottom: 0` is still pushed by its
own margin, and **a rule for a fixed/floating element loses every specificity
tie to the class it shares markup with** — `.hp.xpbar` and not `.xpbar`,
`.modal__card--bubble` needs two classes or the bubble draws at the shell's
width.

**The map is the GROUND, not a screen.** The dock resolves
`override ?? screenHandler ?? base`. The run sets `base` on every phase change;
a screen sets `screenHandler` when it takes focus. Set from one slot, a descent
ticking over stole the dock from whatever screen was holding it — which reads
as flaky, because it needs a clear to land while a screen is open.

## Windows

**A screen is a WINDOW; only a question stops you.** `.modal` paints no scrim
and is `pointer-events: none` with its card `auto`, so several can be open at
once. `.modal--stop` is the short list that blocks — the confirm, the welcome
and the Lampwright — and it sits above the whole z band, or a scrim is a sheet
you can read a raised screen through.

**A scene does not need a scrim, because a scene IS a stop.** Nothing is
ticking, and a sheet over the workshop hid the only thing the room was built to
show.

`src/ui/windows.ts` owns the stack. **ON TOP means touched last**; opening one
is touching it, and `topWindow()` is what Escape answers — a hand-written chain
of `isXOpen()` checks shut the one you were not looking at. The z-indexes are a
BAND from `Z_BASE`, **under the rail**, because the rail is how a screen is
opened and shut.

**A window is dragged by its HEAD and the drag is a DELTA** — `--wx`/`--wy` on
the card, transform behind `.win--moved`, so the default position stays in CSS
and a window nobody moved is where the layout put it. The class gates the
transform because a transform makes a card a containing block for anything fixed
inside it. A control on the head is a control, not a handle; double-clicking the
head puts a moved window back; the clamp keeps the head on screen, because
there is nothing else that moves a window. **Position is not saved**, but
`--dock-h` is measured against the dock's HOME rather than where it was dragged,
or nudging one window reflows every other.

**`unbury`: a window that OPENS square over another's head CASCADES**, stepping
down-right 36px through the same custom properties until it does not. Only a
COLLIDING open steps; a dragged card, the dock and the speech bubbles are left
alone. It exists because the head is the ONLY handle a window has.

## The rail

`src/ui/rail.ts` + `src/ui/screenicons.ts`, bottom right on the floor: the
screens are ONE row of touching 34px sockets, and the utility trio (Fill, Hide,
dev menu) is its own small plate above. **That is what keeps the row clear of
the flask bar at 1280**, which is the width `shots` judges at — the corner never
lifts, at the user's word. Adding a rail button widens the row; re-check that
clearance.

**A rail button's ID outlives its presentation.** `open-shop`, `open-craft`,
`open-character`, `open-save` and the rest are what every harness names.
Rearrange freely; renaming an id is a much bigger job than it looks.

It draws over every window and every scrim. Hovering raises the game's OWN
tooltip immediately — nothing on the rail sets `title`. **Hide is a PREFERENCE**
(`GameState.parked`) and survives a reload; Fill is `requestFullscreen()`.

**The DEV MENU reaches a state the game only reaches by PLAYING to it, and
nothing in it is a rule** — every button drives the same entry point the game
drives (`enterRoomNow` calls the schedule's own `enterScene`; a rung wears
`ladderCharacter` and `heal` replays the walk). **Every phase puts itself in the
dev kit** — a screen nobody can reach is a screen nobody tested. Watch the other
side of that: the kit is the game with everything, and every schedule reads what
you have, so handing it every relic or every boss id has broken scheduled-room
tests twice.

## Theme

**The FRAME has its own tokens and the MAP is PINNED.** `--ink`, `--panel`,
`--panel-lit`, `--edge`, `--edge-lit`, `--text`, `--text-dim` are the frame and
nothing else reads them; every name in `VARS` in `render/renderer.ts` is the
map. That split is the whole of what stops a retheme re-inking committed art.
CONTENT accents stay shared on purpose — a tier colour means the same thing on a
card and on the floor.

The shell is lamplit stone: warm near-black panels, carved edges with a hairline
of gold inside them, a SERIF everywhere there is prose. **Four treatments,
defined once**: `--bevel`, `--gilt`, `--sunk`, `--lift`. Every floating box
takes the WINDOW treatment.

**`npm run theme` fails a colour written by hand and a token nobody defined.**
Both faults are invisible to a screenshot of some other screen — an undefined
`var()` is invalid at computed-value time, which is neither an error nor a
warning: the property silently inherits, so `border: 1px solid var(--edge)`
drew a border the colour of the text. Three had been in the file long enough
that nobody could say when. A translucent overlay is a TREATMENT rather than a
colour and is left alone.

**`--grit` must stay a valid `<image>`.** Half its users compose it inside a
`background-image` LIST, and `none` inside a list invalidates the whole property
silently — so however quiet it gets, it stays a gradient.

**NEITHER WEBFONT HAS EVER RENDERED IN A SCREENSHOT THIS REPO TOOK.** Measured
on the served page in headless Chromium: `Silkscreen` and `IBM Plex Mono` lay
out at exactly the generic fallback's width. **The last name in each stack is
the face being designed**, and it is what an offline player gets. Check what a
font resolves to by measuring a string against the generic — `document.fonts.check()`
returns true for a family that is not there.

## Fixtures

**A FIXTURE is generated pixel art applied as a CSS 9-slice; a glyph is grid
art.** The kit ships as data URIs in `src/render/generated-ui.ts` and is mounted
as `--fix-<id>` at boot by `src/ui/fixtures.ts`. `theme-check` treats the
`--fix-` prefix as runtime. A fixture is authored at the CSS pixel size it
displays at so a 9-slice's corners draw 1:1; the socket is shipped at 96 for a
48px button because device ratio 2 then lands it pixel-perfect.

- **The `border` SHORTHAND resets `border-image`.** A later rule with
  `border: 1px solid …` silently kills an earlier fixture at equal specificity —
  the HUD vessels drew nothing until their rule moved BELOW the base `.hp` block.
- **A frame's `fill` middle TILES under `repeat: round`, and a near-uniform
  interior shows the seams.** Frames are used WITHOUT `fill`; the interior is the
  element's own background with `background-clip: padding-box`, which also stops
  the panel colour leaking past the art's silhouette corners. The `bar` plate is
  the exception — its middle was drawn as a continuous slab.
- **A fixture whose art rounds INTO the frame leaves a gap between border-box
  and visible interior.** The channel's fill at 100% of the content box drew over
  its brass cap; pad inside the caps, do not trust the border widths.
- **Highlight a fixture button WHOLE**: `fill` it with its own stone and glow at
  its silhouette (`drop-shadow`). Brightness over a flat padding-box centre lights
  a hard rectangle inside the carved edge.
- **A black split on near-black stone is invisible** — draw the LIGHT in it.

## The sheet and the Skills screen

**The sheet splits what is TRUE OF YOU from what is true of a SKILL.** The
general stats keep life, armour, resistances, move speed, regeneration and the
mana pool — everything still true whatever you are holding — and **each equipped
slot gets its own section** (`skillSectionId(slot)`) for the numbers that would
differ for a different skill: the damage breakdown, mana per use, dps, crit,
casts per second, reach. With three skills equipped a mixed sheet cannot be
written down, which is why the split exists. An empty slot prints
`SkillSlotDef.blurb` rather than a dark square.

**A SHELF ROW SAYS WHAT THE SKILL DOES, on the row.** `.skillrow__how` is
`SkillDef.description` through `keywordLine`. A skill with a web can be read on
its web; **one WITHOUT is EQUIPPED by the very click that would have opened it**
— "no web yet" is a promise the game will not keep for a passive, and a dead end
is worse than a verb — so a row carrying only a name is a choice made blind.
Displacing what is in the slot asks first.

**The Skills screen opens at the TOP.** Where you were last time is not where
you are going, and a screen that reopens three deep hides the two questions
above it. Escape steps back a level (`skillsEscape`).

**A flask and a skill say what they do FOR THIS BUILD**, never what the table
says — `potionReading` and `mainWorkings`/`slotWorkings` are modules rather than
lines in a panel, so the demo can pour one into an emptied hero and hold the
number the hover promised against the life that arrived. **ONE FACT A LINE**, no
sentences and no trailing punctuation: `17 life per second`, `2/2 charges`. No
charge regeneration means no regeneration LINE, not a line saying there is none.

## Cards, tooltips, badges

- **An item is drawn in exactly one place**, `itemCard(item, notes)`. `notes` is
  the only thing that differs per screen. `showTooltip` takes a string OR an
  element; a currency or a skill is still a string.
- **`statParts` in `src/mod-text.ts` splits a rolled line into the NUMBER and
  the words around it**, so `.rolled__v` and `.rolled__k` can differ;
  `describeStatLine` is derived from it, so text and markup cannot drift. The
  class is `.rolled`, NOT `.stat` — the sheet already owns `.stat` with
  `space-between` and a rolled line inheriting it pushed every label to the far
  edge. One stylesheet, no scoping: check `docs/index.html` before inventing a
  name.
- **The tooltip is the TOP LAYER** (`z-index: 100`) and is `pointer-events:
  none`, always — which is why a keyword is MARKED where it appears and defined
  at the foot of the SAME card (`src/ui/glossary.ts`), never behind a second
  hover.
- **A badge is ONE mechanism.** `badge(buttonId, count)`; `renderBadges()` in
  `src/ui/run.ts` is the only caller. Zero removes it — a badge reading 0 is a
  permanent nag. `spareTreePoints` exists so drawing one cannot mint a progress
  record: a read may not write to the save.
- **A web inside a modal carries a `viewBox`, never a measurement.** Reading
  `getBoundingClientRect` there reads a box the modal's flex layout has not
  finished deciding — measured once, half the web was clipped below the fold.
  The skill web measures because it PANS.
- **Anything drawn per frame must UPDATE, not rebuild.** `renderFlasks` builds
  and `syncFlasks` updates: rebuilt sixty times a second, a press straddling a
  rebuild landed on a node no longer in the document and the threshold buttons
  did nothing at all for as long as they existed.

## Webs

**A skill web is BUILT ONCE and the camera is a CSS transform on the SVG
ELEMENT.** Every node, chain link and frame goes into one `.web__view` group at
`BUILD` pixels per unit; `.webwrap` clips it. A scroll or drag writes
`style.transform` on the svg and nothing else — **written as the view group's
own SVG `transform`, the obvious way, every element re-rasters per frame**:
50ms against 17. Rebuilding per event (three hundred `<image>` elements torn
down) is what made it stutter, and it also meant nothing off screen was built.

**A web's icons are BAKED to bitmaps.** `bakedArt` in `src/ui/webicons.ts`
rasterises a `GENERATED_ICONS` row to a PNG data URI once. Drawn as a `<rect>`
per RUN of pixels — 395 for the average glyph, ~44,000 across a tree —
separate shapes scaled by an arbitrary zoom stop meeting at their seams and the
ground shows through as black lines. jsdom has no canvas, so the paths stay as
the fallback and the headless suite still draws.

Node art is drawn SMOOTH and not `pixelated`, alone among the game's art: 96px
pieces are minified at every zoom the web allows. `src/ui/webart.ts` is
`frame()`, `chain()`, `mount()`; `src/ui/webicons.ts` picks the image off the
node's own words, so it cannot state a mechanic the tooltip does not.

## Speech

`src/ui/speech.ts`, built once and updated per frame, anchored off
`Renderer.screenAt` — the anchor is the UI's and the tile size is the
renderer's, so a drag or zoom mid-sentence keeps the words on the speaker.

- **FROZEN where the speaker was when the line went up.** It follows the camera
  and not the body: a bubble sliding about while somebody paces cannot be
  clicked, by a player or by Playwright.
- **CLAMPED to the window.** The transform hangs a card above its anchor, so a
  tall one over somebody near the top of the room draws off screen entirely.
- **A beat is a line and what is DONE while it is up.** `SceneAct` is `pace`,
  `work` or `face`, performed by `RunSim.perform` off the walk and pose
  machinery that exists — setting `Entity.action` is the whole interface. Only
  Pixi draws sprites, so **a beat may never lean on an act to carry meaning its
  words do not**. He can pour a lantern; he cannot mime one.
- Every line looks the same: portrait out of the top-left corner (cropped to
  the padding it reads as an icon, over the edge it reads as somebody leaning
  in), the speaker's name, and Next. The LAST beat carries what he is holding
  and says Take it. **Escape skips the rest and GRANTS** — the gift is yours
  the moment a panel is up.
- **A bench is the LAST BEAT of the room it is in**, in the same bubble, and
  names nobody: the `SceneDef` comes in and the portrait, the name and the
  lines on offer all come off it. **It shows what you are WEARING and takes a
  carried piece through `setInventoryHandler`** — everything you carried in the
  bubble was an inventory inside a speech bubble, which at a full bag pushed the
  lines you had to pick from off the bottom of the screen.
