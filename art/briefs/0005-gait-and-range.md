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
## Outcome
_not yet_
