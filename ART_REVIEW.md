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
