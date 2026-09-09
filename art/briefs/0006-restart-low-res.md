# 0006 — restart: 48 pixels, and motion over detail

**Status:** `open` — the size test landed (see the Outcome). What is still
wanted is the WALK at this grid: four frames, two contacts on opposite feet,
and the highlight brought from 238 into 110-150.
conversion at all. One thing sits outside the game's register — see the outcome.

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
## Outcome — the witch at 48 (`art/deliveries/0006-witch-48/`)

Picture: `0006-outcome-witch48.png` — Hob, Nell, the witch and the Imp, each
drawn at **27px and 54px**, the real on-screen sizes, on the Fissure floor.

### It arrives import-ready, which nothing before did

Verified independently rather than taken on trust: **48x48 native, 23 colours,
binary alpha, 5% gentle steps.** No `dechecker`, no `downsize`, no resample —
`stripcut` copies it 1:1. She wrote her own export (`export-witch.cjs`, sharp
plus ImageMagick), hardening alpha at 128, fitting to a 40px ink height by
nearest neighbour and quantising to 24 without dithering. **Art production
tooling is hers under the contract, and this is what that being hers looks
like.**

That change alone removes every fault of 0004 and 0005: nothing to smear, no
palette to guess at, no contour thinner than a destination pixel.

**A native-grid sprite is now copied, never fitted.** Its ink is placed on
purpose — 40px tall at a chosen offset — and refitting would rescale it and
move the foot anchor the renderer pins to. Only art larger than the grid is
reduced.

### At ship size it belongs

At 27px she reads as a robed figure with an outstretched arm; at 54 she is a
dark-fantasy caster. She sits in the palette, has the right chunk, and stands
beside Hob and Nell as one roster.

### The ONE thing outside the register

| | luma range | median | step |
|---|---|---|---|
| Hob | 5-66 | 32 | 14.6 |
| Nell | 3-65 | 31 | 16.7 |
| Imp | 6-85 | 25 | 22.2 |
| **witch48** | **6-238** | **43** | **46.0** |

**Her highlight reaches 238 where no shipped body passes 85.** She flagged it
herself — *"the retained skin highlights reach luma 237.4; no global darkening
was applied"* — and it is a deliberate choice, not a slip. It is what drives
the step to 46 as well.

The median at 43 against a shipped 25-32 is the same thing at lower volume:
she is lit, where the roster sits in a cave.

**ANSWERED, and the answer is both** — *"a bright young wizard casting
elemental spells makes sense. A gloomy dark witch casting undead probably less
so. The shallows full of skeletons and deserts yeah probably darker. The Prism
with shiny geodes lighter and more colors."*

Measured off the roster, the game was already doing this and nobody had written
it down. **The mass is dark in every zone — every family's median sits between
17 and 33.** What changes is the LIGHT: the Shallows top out near 89 at chroma
10 and nearly grey, the Prism reaches 109 at chroma 22 and leans blue. It is
`art/decisions/LIGHT.md` now, and `FAMILY=<name> styleread` prints the band.

So the witch is not too bright for being a lit caster; she is too bright at
**238**, which is above the lampwright's lamp at 146 and twice the Prism's
ceiling. White belongs to a light SOURCE, not to lit skin. **110 to 150** puts
her at the top of the game's range without leaving it.

### Not claimed

One pose. No gait, no stride, no states. The spell ships as its own aligned
layer and is NOT baked into the body — correct, and left that way.
