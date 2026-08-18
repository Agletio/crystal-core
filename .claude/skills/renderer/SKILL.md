---
name: renderer
description: Drawing the map and the bodies on it — the pixi/canvas2d split, sprite anchoring and animation state, held weapons, generated tilesets and Wang keys, props and floor dressing, VFX geometry, the camera. Load before touching src/render/, src/vignettes.ts, or the carve in src/sim/grid.ts.
---

# The renderer

**Two renderers, one seam.** `src/render/pixi.ts` is the real one;
`src/render/canvas2d.ts` is a fallback that draws coloured circles with a
facing tick. **Only Pixi draws sprites** — bodies, tilesets, props, held
weapons, VFX pictures — and sprite work being invisible in the fallback is
correct, not a bug to fix.

**Anything per-tile is a pure function in `render/renderer.ts`**, so both
renderers read one answer and cannot come apart: `tileDecals`, `livingDecals`,
`mouth`, `PROPS`, `bossTelegraph`, `dazeMarks`, the VFX shapes. Add a kind
there and branch in each renderer; never add a behaviour.

**Colours come from CSS at runtime.** `readPalette` pulls custom properties out
of the document and every art key maps a character to a `Palette` entry or a
`mix()` of two. Never write a literal colour into art code. `VARS` in
`renderer.ts` is the MAP's namespace and is PINNED — the frame's tokens
(`--ink`, `--panel`, `--edge`, `--text`, …) are separate on purpose, because
`p.void` is the shade end of every hand-drawn creature and portrait and moving
it to suit a panel repaints the bestiary. Generated art is baked hex and is the
exception, decided: a body asked DARK separates from all four pale zone floors,
so it is generated once rather than once per zone.

## Sprites

**A sheet is drawn on FIRST USE.** `makeSheet` memoises per creature and rank
and Pixi uploads textures on the same schedule; an eager loop in either place
pays the cost back. 243 cells at boot became 1.

**`CELL = 256`** is the offscreen cell a hand-drawn sprite is painted into, and
the art grid does not have to divide it — `drawPixels` samples per DESTINATION
pixel. **A generated body is painted at its OWN grid instead**: the camera
lands one in ~87 device pixels, so 256 is downsampled before anybody sees it,
and five facings would be a hundred canvases at four bytes a pixel.

**NEAREST when magnified, LINEAR when minified**, decided per draw off
`e.scale * tile / texture.width`. Nearly every body is minified and linear
supersamples it, which is the whole reason to author above ship size; the Gaunt
at `scale` 3.2 is the exception and linear smeared it to mush. A TILE always
samples nearest — it is drawn at or above its own size, so what has to survive
is the enlargement.

**A sprite id may be in ONE table.** `monsterArt` asks `BEASTIARY` before
`GENERATED`, so an id in both is a generated body that never draws, silently.
It cost a whole session's judgement of generated art. The demo fails a shared
id. Being in `BEASTIARY` does not make something a monster — `MONSTERS` is a
separate table.

**Nothing may ask for a frame nobody DREW.** `framesOf` is the count; when it
was the constant 3, every index past the second fell through to the standing
pose and a generated body's swing and cast never drew — what looked like an
attack was the lunge transform with nothing behind it. The demo sweeps every
action, skill and facing, and also fails a frame that ships which nothing
reaches.

**A rank is LIGHT, and nothing derives an outline.** The art carries its own
edge; one added on top is a slab and grown inward it eats a thin limb.
`glowed` falls off squared. Generated art carries no accent and no halo — `x`,
`b` and `o` are applied at runtime off `MonsterRank`.

### States and facings

`GeneratedArt.states` maps a name to a RUN of indexes in one flat `frames`
list. `generatedBeat` is the ONE answer for which state and frame is showing,
so a body and anything hung on it cannot pick different beats.

A state is named for an ACTION — `idle`, `walk`, `attack`, `hurt`, `death` —
or for the SKILL it uses, **which is looked up FIRST**, so fire, frost and
lightning are three animations. `cast` is the fallback and only reached for a
SPELL, or the hero would cast while swinging a sword. `hurt` and `death` play
ONCE and hold on the last frame through `once()`; a fall that loops is a body
getting up again.

**`dirs` is the EAST half of the compass and nothing more.** The renderer
mirrors anything facing left, so generating the western three is paying twice.
`frames` is direction-MAJOR and the runs are the first facing's, so a facing is
one stride along the flat list and every reader stays flat.

**There is ONE movement state.** `EntityAction` has a single movement action
and both a wander and a chase draw it, so a walk/run split would leave one
never drawn and fail the every-frame-is-reached check. It is named for the
ACTION: the hero's is a run because his `moveSpeed` says so.

**A transform may not stand in for a frame that exists.** The lunge and the bob
were the only motion a hand-drawn body had; over a real swing they are a second
motion fighting the first — the shove-the-model-forward look. `animates` asks
whether frames exist, and the demo fails a body still being moved.

### Gait

**Measured in GROUND COVERED, never in seconds, and the unit is the CYCLE.**
`STRIDE_CYCLE` is tiles per whole gait cycle; `Entity.walked` is what a body
covered. Off the clock a body skates; per FRAME the frame COUNT decides the
gait, so six frames carry a body half again as far per footfall as four for no
reason but how many pictures were kept. `GeneratedArt.stride` is the per-body
override.

**A stride is measured off the ART or not at all.** Feet at their widest is one
step; two is a cycle. `npm run demo` prints depicted against travelled for
every body and every one reads 0% off — a single constant matched no body in
the game, which is why everything had always looked slightly wrong. A shadow
under the feet defeats the measurement (it was reading the shadow, and three
bodies shipped a number a human chose), and so does a ROBE: `BodySpec.robed`
prints the reason instead of a percentage.

**The ANIMATION has to depict the motion the speed implies.** Gait is two
independent numbers — how far a step carries you, and how often you take one.
Footfalls a second is `moveSpeed / stride * 2`. **Check both arithmetically
before re-rolling art**; no amount of re-generating fixes a number.

### Anchoring

**A body stands ON its tile, pinned at its own FOOT.** `bodyFoot` is where a
sprite's ink ends as a fraction of its grid, measured over every frame beside
`bodyTop`; `anchorY` in `pixi.ts` is that less `FOOT_DROP`, so the drawing
hangs that far below the entity whatever its `scale` is. Anchored at the CENTRE
it hung half its drawn height — 1.33 tiles for the Gaunt against the 0.7 radius
the sim keeps it inside the rock by, which is a big body drawn out over the
void.

**The number comes off the ART, not off the tile.** `FACE_FOOT` is how far down
the cell under a boundary the cut face reaches, MEASURED on the shipping set at
0.81 — so only the last fifth of the tile at a north wall is ground at all, and
`FOOT_DROP` is `FACE_FOOT - 0.5` plus room for the half-tile of drift `fits`
allows.

**This fixes NORTH and SOUTH only.** East/west overhang is WIDTH, and a body's
width is its `scale`, applied uniformly. Do not shrink a body to make a
vertical fix look finished.

**The life bar reads the SAME anchor** — `bar()` in `pixi.ts` asks `anchorY` and
`bodyTop`, or every bar detaches the day a `scale` moves. A boss gets a framed
bar across the top of the screen instead: at `size` 5 the strip over its head is
tiny and a long way from where you are looking.

**Rock cells draw ABOVE entities.** Every ROCK cell's tile goes to `wallLayer`
under the entities — anything placed INTO rock (the roots) rides that layer too,
over its own stone. Occluding bodies with it was tried and sheared the head off
anything standing legally at a north wall.

## Held weapons

`HELD` in `src/render/held.ts` is one row per weapon FAMILY, and the picture is
the item's OWN inventory icon out of `GENERATED_ICONS` — already drawn upright
with its grip in the middle, which is the whole of why this was free. `heldFor`
answers the main hand's `GearBase.art`, `drawHeld` lays a second sprite over
the body at a HAND, riding the SAME anchor the body does and mirroring with the
facing rather than rotating.

- **A hand is authored PER FRAME.** `HERO_HANDS` is a hand for every frame of
  every state. A formula swung a sword the opposite way to the arm holding it,
  because an overhead smash and a backhand are not the same arc and nothing in
  a body's frames says which it is. The demo holds each run to exactly the
  length of the state it pins to. The numbers ARE the record — they were read
  off a sheet the user drew dots on, and the sheet is regenerated from the same
  table it feeds, which is what makes a re-mark cheap.
- **`HeldSpec.turn`** hangs a weapon's business end DOWN: a sword is drawn
  blade-down and takes none, a mace and a wand are drawn head-up and take half
  a turn. That is what lets one hand table swing all five families.
- **Both hands are drawn.** `HANDS_DRAWN` is off hand then main; `HeldSpec.track`
  names a second run per state, keyed `<state>/<track>`. A shield and a bow both
  live in the `off` track — the arm that does not strike. The demo fails a
  track a hero has not authored for every state, since a missing one silently
  falls back to the wrong arm.
- **`HeldSpec.reach`** is how far FORWARD of that hand a thing sits: a bow is
  held out at arm's length where a shield is strapped at the arm. The hand is
  where the hand is, so the difference belongs to the weapon.
- **`HeldSpec.behind` draws a thing UNDER its own body.** *The user's call:
  "layer to where character is always above the shield."* Nothing a body
  carries may occlude the body — which hero you are looking at is the
  silhouette.
- **A body that draws its own weapon is NEVER also pinned one.** `HOLDING` in
  `src/sim/appearance.ts` maps a `HELD` row to the `<body>_<suffix>` variant
  that draws it; `heroSpriteFor` answers the variant where the art exists and
  `pinnedFor` — not `heldFor` — is what the sim puts on the entity. One seam, so
  a weapon can never be drawn twice.

**Equipped gear does not change the SPRITE.** The hero IS his trade
(`TradeSpec.sprite` through `heroSpriteFor`, `wanderer` for a trade with no
look of its own). The paper doll is gone — about 1,900 lines of per-slot armour
layers, poses and the `Look` type — and there is no art left that could.

## The map

**A generated tileset REPLACES the whole surface.** `ZONE` in `src/sim/grid.ts`
maps a theme to a set; `GameMap.bare` then stands the zone's own floor fill,
`tileDecals`, `livingDecals` and hand-drawn props down. Masonry with flagstones
stamped over it is two floors at once. **The two LANDMARKS survive it** —
`mouth` for the way in and the way out, which have to be findable — and takes
darker inks there, because a hole reads by CONTRAST and the rim that stood out
on dark stone is a white box on pale sand.

`PROPS` and `PROP_ART` share ids on purpose (the ossuary's bones are drawn, a
descent's are generated), so a `bare` map must skip the hand-drawn pass
entirely — it did not once, and every bone pile carried a pale rectangle nobody
could find in the art.

### Wang keys

**A tile is keyed by its four CORNERS in base three** — 0 floor, 1 rock, 2 the
cut face. `wangKey` lives in `src/sim/grid.ts` because the key is a fact about
the GRID first: **what a set cannot draw, the carve must not make.**

- **`fitCorners` opens rock until every cell is a key the set holds.** Zero
  cells drawn off their corners, against 26. Safe because opening only ever
  adds space — but only a cell TOUCHING floor may be opened, or it punches
  unreachable pockets into the middle of the stone, and it must hold the rock a
  hand-placed prop hangs on.
- **The renderer's backstop is the NEAREST key the set holds**, scoring the cut
  face one step from either terrain and floor three from rock. Falling back by
  rule rather than by distance left bare squares between two cliffs.
- **Quadrant synthesis is WRONG and looks right on paper.** A quadrant's
  picture is not decided by its own corner — the boundary inside a quarter
  depends on the corners either side — so it puts slivers of FLOOR inside solid
  rock. Render composited tiles and LOOK before shipping any scheme like this.
- **The four wall CONTINUATIONS are told apart by `pattern_4x4`, and those rows
  are CORNER values one row out**, not the cell's tile type. Read wrong, a lip
  tile repeats down a face as a pale line running up it.
- **A tile may not be TURNED and two sets may not be mixed on an edge.** A
  floor tile is lit from one side, so a rotated one reads as a checkerboard —
  worse than the repetition it was meant to fix. The one exception is the FLANK
  of a hole, which has no neighbour to agree with.
- **Decode the sheet where the renderer is already awaited.** Sliced on first
  use, the draw runs before the image loads and the entire floor is silently
  missing.
- **The rock does not stop at the GRID.** It is drawn `EDGE` tiles past it on
  every side, or a chamber near the boundary ends on a straight lit line with
  flat colour past it.
- **A LANDMARK keeps a tile of floor all round it.** `clearSpot` — the way down
  is drawn two tiles across and CENTRED, so one stamped a step from the rock
  has half its rim inside the wall. Only a GENERATED map is moved; an authored
  room's landmark is the author's, and the demo checks every `SceneDef`.

### Dressing a floor

**Only what the ROCK did is scattered, and it is the only thing placed.** *The
user's call: "get rid of all the props in the fissure zone except for the
scattered stones… delete everything placed in the dressRooms pass, keeping
scattered stones and vines and stuff."* A room's worth of objects dropped one
tile at a time reads as exactly that at any rate — a whole pass of fringe and
open-floor scatter was tuned twice and deleted. `VIGNETTES` and `dressRooms`
survive with no live caller; what a PERSON left is placed by hand in a scene.

- **`COVER_PROPS` is loose stone and dust, laid by `coverFloor` and drawn
  FIRST**, so furniture stands on the rubble rather than beside it. It claims
  no tile and blocks nothing, and no id may be in both a cover table and a
  furniture one.
- **Uniform density is NOISE; texture is density that VARIES.** `COVER_RATE` is
  indexed by distance from the ROCK, so debris drifts at a wall's foot and
  thins to nothing in the open — and the open floor is what lets the eye rest
  on anything else. It skips a cell with rock ABOVE it, which is the one the
  cut face is drawn in and the heaviest row of the rate: every cliff wore a
  band of stone halfway up it.
- **Each scrap is SHIFTED** off its own colour and size (`COVER_TINT` and a
  scale jitter off `tileNoise`), or the scatter is graph paper at a smaller
  scale.
- **`WALL_PROPS` is what GROWS on the cut face** — three shapes of dead root,
  because a run of cut face is where a single picture repeats within sight of
  itself. Placed INTO rock, on a RUN of wall rather than a one-tile nub, drawn
  side-on, hanging `FACE_HANG` past its own cell's foot because the face spans
  TWO cells.
- **`HUNG_PROPS` is placed by hand, never scattered.** A lit torch on a wall
  nobody stands near is a bucket in the middle of a room. `torch` and `hung`
  are art waiting for an author.
- **`SOLID_PROPS` blocks, and gives that up the moment it cuts anything off.**
  `Grid.solid` is a second layer over the tiles — the ground under an altar is
  still floor and every renderer keys its surface off `tiles`. Blocked one tile
  at a time and undone if the flood stops reaching what the map must reach.
  **Anything asking "can a body be here" asks `Grid.walkable`, never `tiles`**:
  `findPath` tested the tile once and walked the hero onto a brazier, where
  every repath came back empty and the descent never ended.
- **A generated prop is a PICTURE anchored at the FOOT of its tile**, where
  `PROPS` is decals; `tiles` says how much floor it covers and is a fact about
  the ART, so a prop is cropped to what it draws before anything measures it.
- **A generated prop comes back POLISHED** — specular highlights at half a tile
  read as plastic. `tone` toward the ground's mean and spread, then `dull`
  toward its own luma. **Saturation is not brightness and `tone` only moves
  brightness**: "blood" comes back magenta and toning leaves it magenta and
  darker, so `dulled` runs first.
- **A wide floor STAIN comes back as an OBJECT** — round, centred, edged, a
  disc lying on the ground, through every wording tried at two sizes. Three on
  touching tiles make an outline nobody drew. `STAIN_ALPHA` sinks what does
  ship into the stone, because the generator domes and lights one whatever the
  ask says.
- **A prop is toned to the floor that SHIPS, and the floor moved.** Everything
  imported before `RETONE` darkened the Fissure is toned to the old bright
  sand; a newly imported prop will sit differently from its neighbours.

### The carve

`CUT` in `src/sim/grid.ts` maps a theme to `dug`, `gullet` or `grown`. **A
square corner exists nowhere in the game.** The `Room` RECTANGLE never changes
— every spawn, the entrance and the exit are placed off it — but it is NOT all
floor, so anything placing a body checks it fits (`RunSim.placeIn`, retrying
off its own rng stream so placement never moves the draws that pick the next
monster).

- An ellipse drawn round the OUTSIDE of the rectangle merges neighbouring rooms
  and the map loses its walls.
- A room a fifth smaller with the same pack in it is a pack that arrives all at
  once, which turned the aura worlds into walls.
- A wandering corridor may drift at most ONE tile per step, or consecutive
  bands stop sharing a row and the halves are only diagonally joined.
- **A room's swell may only ADD**, and an island may not cover what a room was
  authored around — a hand-placed prop is a fact about the room, and the carve
  loses.
- **A descent's dressing has its OWN rng**, so adding or removing a pass moves
  the cover and cannot move a monster, a drop or a seed anything else reads.
- **A body can clip a wall CORNER if a mover interpolates straight.** Waypoints
  never cut a corner, but a body pushed off the lattice by separation can cross
  one getting back. `glide` moves per axis; `nudge` tests the whole BODY where
  `glide` tests a centre.

## VFX

**Geometry is a pure function; the picture is Pixi's.** `arrowFlight`,
`stormCloud`, `stormBolts`, `poisonDrops`, `fireBolt`, `fireBurst`,
`lightningArc`, `sweepRing` return positions in tile units that both renderers
read; `VFX_ART` stills are laid on top by Pixi alone and `canvas2d` stamps the
shape through its own `blocks()`.

- **A field's art is drawn to the radius the SIM used.** The vfx's second point
  IS the radius, so the art cannot lie about what got poisoned. Same contract
  as a burst: `sweepRing` carries the swing's real reach, where the old fixed
  arc meant a node widening it by a quarter moved nothing on screen.
- **Effect art that lies on the FLOOR goes UNDER the bodies** (`vfxGroundLayer`,
  between props and entities). A pool drawn over the pack it caught is a lid on
  the fight. Everything in the AIR keeps `vfxArtLayer`.
- **`SkillDef.impact` is a second kind drawn where each HIT lands**, with a ttl
  of its own, because what a shot leaves outlives the shot. Generic — a Fork
  gets the same storm as the shot.
- **A flicker is hashed off POSITION, never off the clock**, so both renderers
  agree and nothing has to be seeded. An arc's kinks ALTERNATE sides and are
  hashed off its two ends; off the hash alone consecutive joints land the same
  way half the time and it reads as a wavy rope.

## The camera

**The camera is the RENDERER's; gestures are the UI's.** `src/ui/run.ts` sends
`setZoom(zoom, at)` with a focal point in CSS pixels from the view's middle,
`panBy(dx, dy)`, `follow()`; each renderer converts with the tile size only it
knows. Both keep a `looking` focus in tiles, null while following.

- **A view is measured in the CSS pixels the world is positioned in** —
  `app.renderer.screen`, never `width / resolution`. Halved by a device ratio
  of 2, a map SMALLER than the view centres itself in a quarter of the screen;
  no descent ever showed it, because a descent overflows and clamps.
- **A DRAG unlocks the follow and nothing else does.** Leaning in to look
  closer must never lose the hero. `launch()` calls `follow()`.
- **`CAMERA_SLACK` is a quarter of a view past the map's edge**, which is what
  lets a fight in a corner be centred; clamped to the edge you spend the fight
  dragging against it.
- The wheel is the only zoom. No buttons, no readout.
