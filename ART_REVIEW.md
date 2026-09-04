# Art review

What the creative director approved and what three indie-game critics scored,
strictly 1–10 against Steam's popular pixel-art indies. The loop is the
`critique` skill; the pictures live under `art-review/<date>/` and are not
committed. **Done is every critic at 8 or better on the OVERALL score in one
run.** Anything under 8 is roadmap work, written in the critic's words.

## 2026-09-03 — the first review, a catch-up on everything that ships

Commit `1066855`. Shot with `shots.mjs` (41 screens), `descent-peek`,
`boss-peek` and `face-peek`; 116 pictures, 24 in the set, **4 approved as
they stand** (the title, the pickaxe crop, the north-wall crop, the ore-heap
crop) and 20 held on one named fault each. The director's 32 faults are in
`art-review/2026-09-03/APPROVED.md`.

**The director's three worst faults:**

1. The rock past the cut face is a flat grey mask — one `#1c1c1c` plane
   ending in a stair-step against pure black, a third of the view at zoom 0,
   the whole map a sand shape with a grey border at zoom 9.
2. The wanderer's first line is pinned over 26 of the 41 screens — the
   opening speech bubble and its NEXT button outlive the camp and sit over
   every window the harness opened.
3. The XP bar is saturated cobalt with white ticks and fills whole at 0/0 on
   the camp, while in a descent the same bar is dark stone with a gold
   hairline.

**Three things the tools could not reach** (harness faults, on the roadmap):
`descent-peek <zone>` lands every socketing on The Answering's sand, so the
Rot, Cavern and Seam floors were not judged; `boss-peek` finds no keyhole;
Shockwave is not on the Aethermancer's welcome shelf.

| critic | bodies | floors | ui | effects | consistency | **overall** | compared to |
|---|---|---|---|---|---|---|---|
| the pixel-art purist | 5 | 5 | 5 | 3 | 4 | **5** | Halls of Torment, Loop Hero |
| the UI reviewer | 5 | 5 | 6 | 3 | 4 | **5** | Halls of Torment, Death Must Die, Loop Hero |
| the Steam shopper | 4 | 5 | 6 | 3 | 4 | **5** | Halls of Torment, Loop Hero, Stardew Valley |

**Where they agree, in one line each:** the title, the camp, the skill web and
the climb are 8s that prove the pipeline can hit the bar; the descent under
them is a sand shape with a grey border on black void; the effects are a lime
ring at three times the floor's pixel size and skills that draw nothing; the
shell below the carved windows (dock, rail, bars, bubbles, hexagons, three
typefaces) is several games; and the cast hall is the worst art in the game.
The shopper: *"the camp looks like a finished Stardew-scale scene, and the
descent under it looks like the tilemap the scene was tested on."*

**The UI reviewer, fix first:**

1. Clear the stuck Wanderer bubble off every window and replace the cobalt XP
   strip with the descent's dark-stone-and-gold-hairline bar, empty at 0/0.
2. Draw the rock's top surface and the void as one value out to the viewport
   (no stair-stepped grey mask), put The Answering's arena on the Fissure
   family with rock round it, and make the shelf the sand tile lit a step up.
3. One fidelity and one face across the shell: Geometer and Osteomancer
   through the portrait pipeline, cast hall bodies at nearest integer scale,
   stone sockets for the vector hexagons, generated rail glyphs, and the
   shell serif for pack labels, pickups and window-header counts.

**The Steam shopper, fix first:**

1. Rock past the face is a flat grey mask on black void, and the boss arena
   is a grey 8-tile grid from another set — draw rock and void as one value
   to the viewport and stand the arena on the Fissure set.
2. Hero is a black-violet smudge at ship size and the cast hall scales four
   idles to mush — rim-light the hero, drop the standing corpse ghost, draw
   the cast hall nearest at integer scale.
3. Three off-palette elements: cobalt XP bar full at 0/0 on every camp
   screen, lime Creeping Blight ring at 3x floor pixel size, translucent
   yellow disc under every Rot and Cavern pack.

**Facts the critics could not know**, said once and left for the next run:
the "stuck bubble" is the wanderer's opening line, which the harness never
dismisses before it opens each window — a harness fault first, and then a
question of whether a bubble should outlive the camp at all; the "yellow disc
under every Rot and Cavern pack" is the aura's reach drawn as a filled circle;
the pack label and the pickup floater are the map's own bitmap face by
design, and the critics want the shell serif there instead.

**The pixel-art purist, fix first:**

1. Rock past the two-row face: draw the top surface and the void at one value
   out to the viewport (or push EDGE tiles past the grid) so the map is not a
   sand shape with a grey border on black (`fault-rock-top-mask.png`,
   `fissure-z9.png`).
2. Creeping Blight ring and the Rot/Cavern pack disc: re-ask both at the
   floor's own pixel size, toned to venom, drawn as glow on bodies or soft
   fall-off rather than a filled lime circle (`fault-ground-ring.png`,
   `fault-rot-disc.png`).
3. Shell parity: replace the cobalt XP strip with the descent's dark-stone bar
   (empty at 0/0), the CSS hexagons with a stone socket and a tier hairline,
   the monospace headers on crystals/stations/anvil with the shell serif, and
   dress the dock and tooltips in the same carved frame as every window
   (`fault-xpbar-camp.png`, `fault-bench-hexagons.png`,
   `desktop-crystals.png`).

The purist's own words on the whole: *"Two pictures in this set would stop a
shopper (the title and the camp); the picture the game actually is, a fight
on a floor, would tell that same shopper it was generated within a second…
the strip is a Stardew-quality camp in front of a Halls of Torment floor that
Halls of Torment would not ship."*

## 2026-09-03b — the second review, after Phase 11's first eight items

Commit `5dc6865`. Shot with `shots.mjs` (41 screens), `descent-peek` at four
socketings and three zooms, three bursts, three held casts (`CAST=1`),
`boss-peek` and `face-peek`; 118 pictures, **18 approved as they stand** (up
from 4). The director judged every first-pass fault: the rock mask, the
stuck bubble, the cobalt bar, the arena floor, Fireball's flight, the Arc,
the shell's CSS faults, the round ripple and the hover light are FIXED; the
hero's edge, the cast hall and the corpse are BETTER. The list is in
`art-review/2026-09-03b/APPROVED.md`.

**The director's three worst faults:**

1. The aura disc — a translucent olive disc up to ten tiles across with
   concentric banding and a hard edge under every Rot, Cavern and Seam pack,
   laid over sand and rock alike; the largest shape in any descent that is
   not the map, and it reads as a debug radius.
2. Three worlds and the boss are still unjudged — `descent-peek`'s socketing
   lands on The Answering's sand every time and `boss-peek` prints no
   keyhole; the Rot, Cavern and Seam tilesets and every telegraph have never
   been looked at.
3. Rimespike is a flat cyan slab — one tone, serrated top, no dark root, no
   lit tip, no shadow on the sand.

| critic | bodies | floors | ui | effects | consistency | **overall** | compared to |
|---|---|---|---|---|---|---|---|
| the pixel-art purist | 4 | 5 | 6 | 4 | 4 | **5** | Halls of Torment, Death Must Die, Loop Hero |
| the UI reviewer | 5 | 4 | 6 | 5 | 4 | **5** | Halls of Torment, Hades, Loop Hero |
| the Steam shopper | 5 | 6 | 7 | 5 | 5 | **6** | Halls of Torment, Death Must Die, Loop Hero |

**Where they agree, in one line each:** the camp, the title, the carved
windows, the seam climb and the Fireball web are one finished game and would
sit beside Loop Hero; the descent under the crack is a second, desaturated
one — one khaki tile, a flat grey rock fill, black cut-out monsters, a hero
you cannot pick out of his shadow; the aura disc is the largest shape in any
fight and means nothing; the Arc is the one effect that reads and Rimespike
and the Fireball trail are not there yet; the cast hall is crisp now and the
Warrior and Rogue still have no silhouette. The shopper: *"a shopper
comparing it to Halls of Torment sees a camp they like and a fight they
don't believe."*

**Facts the critics could not know**, said once and left for the next run:
ordinary damage numbers are "the ink of the rock" by decision (`floaterInk`),
and the UI reviewer's invisible `275` is that decision at ship size; the
head-band frame the purist and the UI reviewer want back on the dock and the
tooltip was retired at the user's word; `gather.png` was approved as "the
pick raised" and shows the hero idle — a director's slip, and the burst
frames beside it are what hold the pick.

**The pixel-art purist, fix first:**

1. Kill the banded olive aura disc under Rot/Cavern/Seam packs
   (`crop-seam-aura-disc-x2.png`, `crop-rot-disc-x2.png`); a body tint or a
   pack-wide falloff, never a rimmed circle.
2. Give the cast-hall Warrior and Rogue real three-value clusters and a rim
   light (`crop-cast-hall-warrior-x3.png`), and every floor monster a
   mid-tone plane so it is not a black cut-out (`fissure-z0.png`).
3. Regrade the Fissure sand and rock to the camp's warm ramp and put marks in
   the all-rock tile a step darker than the face shadow (`fissure-z4.png`,
   `crop-rock-void-x4.png`).
4. Regenerate the Geometer and Osteomancer portraits at the Lampwright's
   fidelity (`faces.png`, `desktop-graft.png`).
5. Rimespike needs a dark root and lit tips, Fireball an ember-to-smoke trail,
   and the way-in wheel a re-ask as a shaft (`crop-rimespike-x5.png`,
   `crop-fireball-flight-x4.png`, `gather.png`).

**The UI reviewer, fix first:**

1. Remove the ten-tile olive aura disc under Rot/Cavern/Seam packs
   (`crop-seam-aura-disc-x2.png`, `rot-z4.png`); make it a glow on the
   bodies no wider than the pack.
2. Give the cast hall Warrior and Rogue a lit edge or a lighter card ground,
   and draw all four at 3x not 6x (`desktop-pick.png`,
   `crop-cast-hall-warrior-x3.png`).
3. Ordinary damage digits are ghost-grey on khaki (`crop-floater-x5.png`,
   `cast-arc.png`); use the bone-with-shadow the HUD numerals got.
4. Proving Ground sockets are four text fields over a dimmed picture
   (`desktop-proving.png`); draw them as the crack's clawed sockets on the
   art at full brightness.
5. One chrome: frame the inventory dock and tooltips like the window, replace
   the CSS hexagons, and use one plate style across bars, skill slots and
   potions (`desktop-sheet.png`, `desktop-tooltip.png`, `crop-hud-x3.png`).

**The Steam shopper, fix first:**

1. Remove the ten-tile banded aura disc under Rot/Cavern/Seam packs
   (`crop-seam-aura-disc-x2.png`, `cavern-z4.png`); make it a glow on the
   bodies no wider than the pack.
2. Give the hero and every monster a lamplit edge and 2–3 luma steps off the
   sand at ship zoom (`crop-hero-x6.png`, `fissure-z4.png`).
3. Grain the rock interior and drop its mean below the face's shadow row
   (`crop-rock-void-x4.png`, `fissure-z9.png`); tone the arena tile's
   crescent into the sand (`crop-arena-grain-x3.png`, `desktop-scene.png`).
4. Rebuild the Warrior and Rogue cast-hall cards with a lit edge or a lighter
   ground (`desktop-pick.png`, `crop-cast-hall-warrior-x3.png`).
5. Redraw Rimespike with a dark root, lit tips and a floor shadow, and
   Fireball's trail as ember-to-smoke (`crop-rimespike-x5.png`,
   `crop-fireball-flight-x4.png`).

## 2026-09-03c — the third review, after the critics' code items

Commit `cd4ef06`. The director's shoot was cut off by a usage limit and a
second run judged the 120 pictures already taken plus nineteen crops; **20
approved**. Every second-pass item that was code or a small generation is
judged FIXED (the aura, the lamp on every body, the carved dock and
tooltip, the socket-plate facets, the generated rail glyphs, bone digits,
the ember trail, the rooted spike, the two busts, the shaft) and three
BETTER (the camp at one scale but letterboxed, the rock's dashes with the
interior still lighter than the face's shadow, the socket plates over a
translucent panel). The Rot and the Cavern were judged for the first time.
The list is in `art-review/2026-09-03c/APPROVED.md`.

**The director's three worst faults:**

1. The light drift on the three shipped sets is quantised into hard-edged
   rectangles one to four tiles a side — a mosaic at zoom 0 and 4, the
   checker the designed floor went `plain` to avoid.
2. The Seam is still unseen: the `seam` socketing is not at the top level
   `seamSocketed` asks for.
3. The arena sand's crescent repeats on a fixed diagonal lattice under the
   boss, and the boss's slam telegraph is a flat translucent red disc with a
   smooth vector rim eight tiles across.

| critic | bodies | floors | ui | effects | consistency | **overall** | compared to |
|---|---|---|---|---|---|---|---|
| the pixel-art purist | 5 | 5 | 7 | 5 | 5 | **5** | Halls of Torment, Death Must Die, Loop Hero |
| the UI reviewer | 5 | 5 | 7 | 4 | 4 | **5** | Halls of Torment, Loop Hero, Death Must Die |
| the Steam shopper | 5 | 5 | 7 | 4 | 4 | **5** | Halls of Torment, Death Must Die, Loop Hero |

**Where they agree, in one line each:** the camp, the title, the carved
chrome and the four busts are one finished product and would sit beside Loop
Hero; the descent is where it falls over — the Rot and Cavern floors are a
patchwork of lighter rectangles, the hero at ship zoom is an unedged smudge,
the boss's slam is two red vector discs, Creeping Blight is a lime ring with
no pool and Shockwave three sand squares, a Cavern pack dies into one stacked
lozenge, the stations window covers nine of the rail's buttons, and the cast
hall still asks a new player to pick between two finished bodies and two
blocks of noise. The shopper: *"it is a 9 shell around a 4 fight, and a
shopper buys the fight."*

**Facts the critics could not know:** the per-cell light was switched off on
every world the same hour (`GameMap.plain` is true everywhere); the hero does
wear the rim every monster wears, at the same strength, and at zoom 4 it is
one pixel; the Warrior and Rogue bodies and a regrade of the floor sets are
the two overhauls the user ruled out.

**The pixel-art purist, fix first:**

1. `rot-z4.png` / `cavern-z4.png` / `seam-z4.png` — the per-cell light drift
   draws as a mosaic of lighter rectangles with a hard edge at every cell;
   sample it across the tile or turn it off for those worlds.
2. `boss/boss-07.png` / `crop-telegraph-rim-x3.png` — the slam telegraph is
   two anti-aliased 2 px red vector discs eight tiles wide; redraw as a
   hard-edged one-pixel ring in the sand's own shadow with a single-step
   tint fill.
3. `fissure-z4.png` / `cast-arc.png` — the hero at ship zoom is a 12 px dark
   smudge no brighter than the cover beside him; a lit rim or a lighter
   cloak so the body is the brightest thing on the floor.
4. `crop-cavern-corpses-x4.png` / `cavern-z0.png` — eight crawlers die into
   one identical lozenge stacked seven deep and a body without death frames
   fades upright as a tan ghost; a fall direction and a second frame, and
   fall rather than fade.
5. `desktop-pick.png` / `crop-cast-hall-x2.png` — the Warrior and Rogue are
   noise blocks beside two finished bodies on the first screen after the
   title.

**The UI reviewer, fix first:**

1. `rot-z4.png` / `cavern-z4.png` — the light drift is a mosaic of
   hard-edged 1–4 tile rectangles; per pixel, or off as the Fissure's
   `plain`.
2. `desktop-stations.png` / `desktop-anvil.png` / `desktop-jewellery.png` —
   windows stack over the crafting window, run off an 800 px view and hide
   nine of eleven rail buttons; one frame footprint, stop above the dock,
   rail on top.
3. `boss/boss-07.png` / `crop-blight-ring-x2.png` / `crop-boss-cyan-blob-x4.png`
   — the slam disc, the Blight ring and the Chill marker are smooth vector
   primitives on pixel art; hard-edged pixel rings in the floor's own
   shadow with at most one step of tint fill.
4. `desktop-descent.png` at 1280×800 — the hero has no lamp edge and reads
   as a 20 px smudge, the rail glyphs are 12 px specks with 8 px letters;
   rim the hero like every monster, draw the rail at 24 px.
5. `crop-cavern-corpses-x4.png` — eight kills stack one identical lozenge and
   unframed bodies fade upright; a fall direction, and fall rather than fade.

**The Steam shopper, fix first:**

1. `rot-z4.png` / `cavern-z4.png` / `seam-z4.png` — the floor light drift is
   a hard-edged rectangle patchwork; per pixel, or off as the designed
   Fissure does.
2. `boss/boss-07.png` / `boss/boss-04.png` — the slam telegraph is two flat
   translucent red discs with a smooth rim; a hard-edged pixel ring in the
   sand's own dark and at most a step of tint fill.
3. `fissure-z4.png` / `cast-arc.png` — the hero at ship zoom is a 14 px navy
   figure with no rim and no readable pose; the lamp edge every monster
   wears and a silhouette that reads at that size.
4. `desktop-descent.png` / `cast-shockwave.png` — Creeping Blight is a
   lime-yellow ring brighter than anything on the floor with nothing in the
   pool, and Shockwave is three sand-coloured squares; an olive-filled pool,
   a visible sweep ring at its real reach.
5. `desktop-stations.png` / `desktop-anvil.png` — the window sits over the
   rail and hides nine of eleven buttons, and runs off the bottom of an
   800 px view.

---

## 2026-09-03d — commit `ceae303`

Twenty pictures approved, and every CODE item off the third review landed
before the shoot: the light-drift mosaic is gone on all four worlds, the slam
telegraph is a hard pixel ring, the rail glyphs read at 24 px, a body with no
death frames keels over, and the hero takes 1.4x a monster's rim light.

**The director's three worst faults:** the stations, anvil and jewellery
windows cascade over the crafting window and run off the bottom of an 800 px
view; Creeping Blight at ship zoom is a lime dithered disc five tiles wide
with a stack of green 8s over it; the Chill mark on the boss is a 40 px flat
sky-blue square, because the mark scaled with the body's `size`.

| critic | bodies | floors | ui | effects | consistency | **overall** | compared to |
|---|---|---|---|---|---|---|---|
| the pixel-art purist | 5 | 6 | 7 | 4 | 5 | **5** | Halls of Torment, Death Must Die, Loop Hero |
| the UI reviewer | 5 | 5 | 6 | 4 | 5 | **5** | Halls of Torment, Death Must Die |
| the Steam shopper | 4 | 4 | 6 | 3 | 4 | **4** | Death Must Die, Halls of Torment |

**Where they agree:** the shell is finished and the fight is not — *"a 9 shell
around a 4 fight, and a shopper buys the fight"*. All three name the same four
code faults first: the Blight pool, the window footprint and clipped rows, the
floaters and labels that do not scale with the camera, and the flat sky-blue
Chill square. All three then name the same ART faults, which are the two
overhauls the user ruled out: the Rot's and Cavern's palettes and rock, and
the Warrior and Rogue in the cast hall.

**One fact they could not check:** the rail is no longer coverable. Probed with
the stations open over the bench, `.corner` computes to 64 against the window's
36 and all eleven rail buttons hit-test to themselves; what the picture shows is
the window's own width beside them, not a window over them. The cascade off the
bottom was real and is fixed.

**The pixel-art purist, fix first:**

1. `desktop-descent.png` / `crop-blight-pool-shipzoom-x2.png` — cap the Blight's
   alpha where pools overlap so it stays the dark olive of the first cast, give
   it a hard edge instead of the soft-brush falloff, and stack the 8s into one
   summed floater.
2. `crop-hero-pack-rot-z4-x3.png` / `seam-z4.png` — floaters in the pixel font
   at a size that scales with zoom, a cap of one body-height at zoom 4, bone
   with a 1 px dark edge and no drop shadow.
3. `swing/swing-14.png` / `crop-swing-hit-dust-x3.png` — delete the 85 px grey
   square under a monster, replace the blurred hit halo with a 1 px outline for
   one frame, and the Bark Buckler bag icon with a pixel spark.
4. `crop-boss-chill-block-x3.png` / `crop-boss-telegraph-x3.png` — ailment marks
   a fixed ~6 px glyph at ANY body size; the telegraph on the sprite's own
   pixel grid rather than at 10 CSS px a step.
5. `rot-z0.png` / `cavern-z0.png` — re-ask the Rot's rock as rock rather than
   notched posts, pull the Cavern's floor toward the camp's palette, tint the
   shared grey props per world, and give the Cavern a stepped way-in.

**The UI reviewer, fix first:**

1. One Blight pool per target, capped alpha, palette-quantised hard edge with no
   smoothing, and one merged floater instead of eight 8s.
2. One window footprint that stops above the dock and clear of the rail, and a
   real scroll region with a visible thumb — a helmet slot, a ledger row, a
   settings row and a section heading are each sliced by the frame with nothing
   saying more exists.
3. Scale floaters and name labels with the camera; remove the grey square under
   a hovered monster; frame the name label; stop using an inventory icon as a
   VFX.
4. `crop-arena-lattice-x2.png` — the floor decal repeats on a fixed ~55 px
   diagonal lattice; offset its position and its choice by a per-cell hash.
5. Give the rail's glyphs distinct silhouettes and a second hue, and re-emit the
   four cast-hall bodies nearest-neighbour at native scale.

**The Steam shopper, fix first:**

1. Cap overlapping Blight pools to the single-pool alpha and stagger the
   floaters.
2. Darken the Rot's cream floor two or three values, delete its watermark, cap
   the maroon staves, and put a cast foot-shadow under every rock, body and prop
   on all three worlds.
3. Render the cast-hall bodies nearest-neighbour at integer scale, and replace
   the grey hover square with a 1 px outline plus a framed name plate.
4. Give stations, anvil and jewellery one footprint above the dock and under the
   rail, and scroll the Reckoning and Crystals panels so no card is clipped
   mid-row.
5. Redraw the Cavern beetle with legs and a death frame, widen the stalk
   monster, and replace the 40 px Chill square with one fixed-size frost mark.

---

## 2026-09-04e — commit `125b78d` — A VERIFICATION, NOT A SCORED RUN

The director shot 121 pictures and approved 16, against the nine things the
fourth review's code fixes claimed. No critic scored this build: what it
found sent more work back, and the critics run on what comes after it.

| what was claimed | what the pictures show |
|---|---|
| the Blight pool is one union at one alpha | **fixed** — a dull olive stain darker than the floor, one flat alpha, a hard cell-stepped edge, no falloff and no stacking |
| one number a body | **fixed** — four bodies, four floaters, no column in any of twelve fight frames |
| floaters and drop names halved | **fixed** — ~12 px against ~20 px bodies at zoom 4, the same ratio at zooms 1 and 2 |
| an ailment mark is a fixed size in tiles | **fixed as SIZE** — the boss's Chill is a 14 px chip, not a 40 px slab; still a featureless square rather than a frost glyph |
| a body casts a contact shadow | **landed, and it broke at boss size** — a ~190x60 px oval three tiles wide, the largest shape in the frame |
| no window runs off the bottom | **fixed** |
| a clipped row has an affordance | **NOT fixed** — no thumb in any of nine windows |
| one tab lit at a time | **fixed** in the stations and the anvil; the Proving Ground's influence row still reads as two |
| the cast hall is not blurred | **fixed** — the chosen figure's pixels are square and hard-edged at x3 |
| the rail glyphs read at 24 px | **NO** — three of ten have a nameable silhouette; seven are the same bone blob at the same value, told apart by the keybind letter |

**What that sent back, and what was done about it, on top of `125b78d`:**

- **The shadow is CAPPED** (`SHADOW.most`), because a shadow is contact and not
  mass — off `scale` alone the boss stood on a three-tile rug.
- **A scrollbar can never be photographed.** The panels do scroll and the track
  is reserved, but every headless shot this repo judges is taken by Playwright
  with `--hide-scrollbars`, so no thumb can appear in one. The thumb is brass
  now for a player, and **the affordance a picture can show is a FADE**: the
  foot of every window body fades into the frame, so a cut row says there is
  more under it.
- **THE RAIL GLYPHS WERE RE-ASKED.** The fault was in the words, not the size:
  every emblem was asked "in pale bone-grey with one small warm gold accent",
  which is one value, and one value at 16 px on a dark plate is a blob whatever
  it depicts. Re-asked with a thick near-black outline round the whole shape,
  open gaps inside it and gold over a third of it. Nine of eleven landed first
  time; the pouch came back a badge and the corner brackets a disc, and both
  were re-asked with the noun that fought removed — the pouch by its shape, and
  Fill as two nested squares. All eleven imported and shipped.

---

## 2026-09-04f — commit `c3faa37` — the sixth pass, and what it sent back

125 shot, 20 approved. Four screens the brief asked for are deliberately NOT
in the set — the Rot and Cavern floors, the boss, the gather and the shop —
because none is store-page material; they are cited as fault evidence instead.

**The three verifications.** The rail glyphs are **7 of 11** with a nameable
silhouette, up from 3 of 10, and the shapes landed — but all eleven are still
one near-white value on one near-black plate and the promised gold is a bead,
so the row still reads as marks of equal weight. The contact shadow is
**fixed** at boss size. The foot fade **works**: a cut row reads as
continuing, though the cue is the card's gold rule dissolving rather than the
words, and it only reaches `.modal__body` — the Proving Ground's inner stats
panel still clips with no fade.

**Its three worst faults, and what they turned out to be:**

1. **The cast hall's bodies** — *"bilinear-smoothed, the Warrior a checkerboard
   with no head-torso-limb separation."* PROBED, and the smoothing is NOT
   there: `image-rendering` computes to `pixelated`, the transform is `none`
   and every canvas is scaled by a whole number. What IS there is the source:
   the four bodies' ink boxes are **19x39, 12x39, 14x38 and 15x39 art pixels**.
   At fourteen pixels across there is no silhouette to read at any filter, and
   the softness in a crop is the crop's own downscale. It is the excluded
   overhaul, and no CSS reaches it.
2. **The rock is a flat void with no foot** — *"the floor's value is identical
   right up to the wall."* TRUE, and it was a regression of ours: `groundLight`
   is a per-cell DRIFT times a wall-foot SLOPE, and `plain` was switching off
   both. Only the drift makes a mosaic — a tint decided per cell is a hard line
   at every cell — where the foot is a slope over several tiles. Split, so
   every world keeps its flat floor AND darkens into the rock (`foot.png`).
   What is left of the fault is the face itself, which is the shipped set.
3. **A Fireball's head is a soft radial gradient and its impact a rounded
   orange square**, beside an Arc Lightning that is stepped and on-grid. NOT
   taken: the VFX stills are generated art, and re-asking them is a design the
   user approves rather than a session's call.
