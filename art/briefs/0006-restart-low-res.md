# 0006 — restart: 48 pixels, and motion over detail

**Status:** open. This replaces the approach in 0004 and 0005, not the
findings in them.

## What was wrong, and it was the brief

**The handoff said the body grid was 96. It is 48.** Measured: 121 of the 126
shipped bodies are a 48 grid; the only 96s are the Gaunt and the Hornfiend,
both oversized monsters at `scale` 3.2, and the three 160s are bosses.
`TILE_AT_1X` is 18, so an ordinary body draws at about **27 pixels on screen**
at 1x zoom.

Against that, art was arriving at 1254 to 2172 pixels and being reduced
**twenty-six to one**. Every fault we chased is downstream of that ratio: soft
alpha, forty thousand colours, a contour thinner than one destination pixel,
shading too smooth to survive, feet too small to place. The conversion was
being asked to invent a pixel artist.

`0006-grid-comparison.png` is the same delivered source cut at both grids and
drawn at ONE on-screen size, over the shipped Imp: the 48 row has the Imp's own
chunk, the 96 row is finer and smoother than anything the game ships.

*The owner's call: "we are way too high res… I would rather be way lower
quality in terms of actual pixel count but have smooth coherent animations."*

## What a 48 body actually is

- The creature stands about **40 pixels tall** inside the frame.
- A head is about **8 pixels**. A limb is **4 or 5 across**. An eye is **one
  or two pixels** — not a drawn eye, a dark pixel where an eye is.
- The whole body holds perhaps **20 to 30 distinct regions of colour**, not
  three thousand shaded ones.
- **A contour is one pixel.** At 48 it is a real, countable pixel; at 1254 it
  was 0.8 of one and the average ate it.

The test: if a feature would vanish when you squint, it is too small to draw.

## The direction, unchanged where it was working

Dark, Diablo II. **The mass of the body sits in shadow and catches light** —
measured, a shipped body's median pixel is luma 17 to 45 where v2's was 72.
That is the note that survives from 0005 and it is about where the mass sits,
never about adding darks: the range was always fine.

## What is actually needed

Four frames, one facing (south-east), the walk. Foot placement is the subject:

1. **Contact** — near leg forward heel down, far leg back toe down, body at
   mid height.
2. **Passing** — legs together, far leg swinging past the near, **body at its
   highest**.
3. **Contact, limbs SWAPPED** — far leg forward, near leg back, same facing.
   Visibly the opposite of frame 1, not a repeat of it.
4. **Passing** — near leg swinging past, body at its highest again.

The planted foot stays on the ground line; the swinging foot lifts. Hip rise
and opposing shoulders carry the weight transfer — bob added on top of a
repeated same-foot sequence does not fix it.

## Done when

`styleread` puts the median at 20-45 and `feetread` shows frames 1 and 3
leading with opposite feet.

---
## Outcome
_not yet_
