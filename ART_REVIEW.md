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
