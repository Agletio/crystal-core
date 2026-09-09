# 0005 — the two things stopping a body from landing

**Status:** open, and both are corrections to art already made. Nothing about
either character needs redesigning.

Measured on the Cave Prowler (0004) and the Demonic Witch (0005 v1). The Witch
delivery is in `art/deliveries/0005-demonic-witch/`; the picture is
`0005-outcome-witch.png` — the Gaunt, her walk and her cast on the Fissure
floor at 48px.

## 1. A BODY NEEDS A LIGHT-TO-DARK RANGE, and this is the root

`styleread.mts` reads every shipped body at **luma range 65 to 99**. The Witch
is **20**. Her brightest ink, 32, is darker than the Gaunt's median of 36.

| | luma range | contour | clusters | step |
|---|---|---|---|---|
| Gaunt | 7-76 (**69**) | 60% | 9.3px | 19.6 |
| Imp | 6-85 (**79**) | 49% | 4.5px | 22.2 |
| Wanderer | 9-108 (**99**) | 53% | 9.7px | 24.2 |
| Maw | 3-69 (**65**) | 42% | 5.3px | 20.7 |
| **Witch** | 12-32 (**20**) | 29% | 6.5px | **6.5** |

**The other two failures are downstream of this one.** A value step cannot be
large inside a 20-point range, and a dark contour needs something darker than
the body to be drawn in. So the earlier note — *aim for value steps of 18-24*
— named a symptom. The cause is that a dark costume was drawn dark
THROUGHOUT, with no lit planes.

The Gaunt is a dark creature too and spans 69: near-black in shadow, bone
catching the lamp. **Dark is a hue decision; the range is not optional.** On
the pale Fissure floor a body with no light values is a cut-out silhouette,
which is what the Witch currently reads as.

## 2. A WALK NEEDS TWO CONTACTS, AND NEITHER HAS ONE

A contact pose plants a foot and reads WIDE at the bottom; a passing pose is
narrow. Foot span, frame by frame:

| | spans | contacts |
|---|---|---|
| Gaunt (4 frames) | **37, 33**, 12, 12 | two |
| Prowler (6) | 19, 18, 17, **47**, 16, 16 | one |
| Witch (6) | 12, 12, **28**, 13, 18, 21 | one, and its tail is ambiguous |

A stride alternates: left foot planted, pass, right foot planted, pass. One
contact reads as a hop.

**And the Witch BOBS.** Her lowest inked row runs 84 to 93 — **9px of vertical
travel** on a 96 grid, against the Gaunt's 2px. She rises about a tenth of her
own height while walking, which is most of why it looks wrong. Her ink-box
travels 1.5px horizontally, so she is bouncing in place rather than striding.

**Feet stay on one line.** The renderer pins a body at its own foot, so
vertical drift between frames is drift the game cannot correct.

## What is already right

- **Identity holds in both**, across 6 and across 12 poses. That question is
  settled.
- The Witch's **cast reads well** — the shield's progression from gather to
  closed shell is legible at ship size, and it is the strongest sequence
  delivered so far.
- Cluster size is in range on both. Chunkiness is not the problem.

## Done when

`styleread.mts` puts a body inside 65-99 luma range, and the foot spans show
two wide frames and the rest narrow, with the lowest inked row steady within
about 2px.

---
## Outcome so far — Prowler v2 (0004 revision)

Picture: `0004-outcome-v2-floor.png`. Delivery:
`art/deliveries/0004-cave-prowler-v2/`.

### The gait is FIXED

Foot spans, with the target being two wide and the rest narrow:

| | spans | contacts |
|---|---|---|
| Gaunt (shipped) | 37, 33, 12, 12 | two |
| Prowler v1 | 19, 18, 17, 47, 16, 16 | one |
| **Prowler v2** | **65, 50, 19, 70, 19, 44** | **two — 1 and 4, passing at 3 and 5** |

That is a real alternating cycle. **Bob is still 4px** against the Gaunt's 2,
so the feet do not yet sit on one line.

### The range moved, but too far and the wrong way

| | luma range | contour | clusters | step |
|---|---|---|---|---|
| Gaunt | 7-76 (69) | 60% | 9.3px | 19.6 |
| Wanderer | 9-108 (99) | 53% | 9.7px | 24.2 |
| Witch | 12-32 (20) | 29% | 6.5px | 6.5 |
| **Prowler v2** | **52-102 (50)** | **96%** | 5.1px | **15.7** |

The value step is nearly there — 15.7 against a shipped 17.5-24.2, up from
12.8. But the range moved by LIGHTENING: its darkest ink is 52, where every
shipped body reaches below 10. **A range is not a brightness.** The Witch had
no lights; v2 has no darks, and on a pale floor it reads as a bright orange
cut-out instead of a black one. What is wanted is both ends: deep shadow AND a
lit plane, 65-99 apart.

Contour at 96% against a shipped 42-60% is the same fault seen from the other
side — with nothing dark in the body, every edge pixel counts as the darkest
quarter.

### The tool it needed

The source arrived with a **painted checkerboard**, fully opaque, which no
alpha threshold can remove, and with figures too close for equal cuts.
`dechecker.mts` handles both: it floods the neutral background inward from the
border (so a pale claw INSIDE the body survives, the flood never reaching it),
restores any flooded pixel touching coloured ink so the silhouette is not
eaten, and finds the figures by their gaps — splitting the widest span at its
own thinnest column when two stand too close for an empty one between them.

That is source preparation, on Claude's side of the seam, and it means a
transparency failure upstream no longer blocks a delivery.
