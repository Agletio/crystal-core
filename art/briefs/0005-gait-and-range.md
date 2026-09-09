# 0005 — the two things stopping a body from landing

**Status:** open, and both are corrections to art already made. Nothing about
either character needs redesigning.

Measured on the Cave Prowler (0004) and the Demonic Witch (0005 v1). The Witch
delivery is in `art/deliveries/0005-demonic-witch/`; the picture is
`0005-outcome-witch.png` — the Gaunt, her walk and her cast on the Fissure
floor at 48px.

## 0. WHERE THE DARKS WERE LOST — the answer, and it was the importer

Astra challenged the "darkest ink is 52" figure: the delivered PNG holds pure
black and hundreds of pixels under luma 10 in every sampled region, so 52
could not describe her drawing. **She was right.** Traced stage by stage on the
Prowler v2 source:

| stage | min luma | px under 10 | share of ink |
|---|---|---|---|
| 1. raw source | 0 | 28,991 | — |
| 2. after `dechecker` | 0 | 28,863 | 7.79% |
| 3. after resample to 96 | 0 | 198 | **1.25%** |
| 4. after quantise to 24 | **52** | **0** | **0%** |

Extraction kept the darks — 128 pixels lost of 28,991. **Both losses were
mine, and both are fixed:**

- **The resample blended the contour away.** A 4px outline on a 337px figure
  is 0.8px at 96, so an area average smears it into the body. A pixel on the
  EDGE now takes its cell's darkest source pixel instead of the mean, which is
  what the source says that edge is.
- **A palette picked by FREQUENCY loses the extremes.** A contour is about 1%
  of a body's pixels, so it never reached the top 24 and folded to something
  bright. The ends of the range are now bought back — the least-used kept ink
  traded for the commonest ink beyond each end, and an end once bought is never
  traded away again.

After both: min luma **0**, range **121**.

## 1. THE RANGE WAS NEVER THE PROBLEM — THE MEDIAN IS

With the importer fixed, the honest measurement is the opposite of what was
first reported. Her interior shading (outline excluded) spans **1 to 121**,
wider than any shipped body. What is off is where the mass sits:

| | luma range | **median** |
|---|---|---|
| Gaunt | 7-76 | **17** |
| Imp | 6-85 | **25** |
| Maw | 3-69 | **28** |
| Wanderer | 9-108 | **45** |
| **Prowler v2** | 0-121 | **72** |

**A shipped body sits in shadow and catches light; hers is evenly lit.** The
darks are present but a small minority. The note is not "add darks" — it is
that the BULK of the creature should be dark, with lit planes as the
exception. Target median 20-45; currently 72.

Both earlier notes on this — *"aim for value steps of 18-24"* and *"put the
darks back"* — were wrong, and each was wrong because the importer was
destroying what it was measuring.

## 1b. The original (superseded) range note

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

### The gait is NOT fixed — and the width check could not see why

**Correction.** This section first said the gait was fixed on the strength of
the foot spans below. It is not, and the owner caught what the number missed:
*"Legs start with left, then right is up and out and then right goes back and
then left is fully out again. Makes no sense."*

**A stance's WIDTH says a foot is planted; it cannot say WHICH foot.** Two
poses with the same leg forward measure identically to a real alternating
cycle. `feetread.mts` reads the feet as separate blobs instead, and on v2 both
wide contacts — frames 1 and 4 — lead with the SAME foot. One pose twice with
the legs waving between it, exactly as described.

**The root is that the upper body never moves.** Torso, shoulders and head sit
in nearly the same place in all six frames while only the legs flap. A walk is
the body rising and falling and the shoulders counter-rotating against the
hips; without that, no arrangement of legs reads as walking.

Astra asked for the right thing — her notes specify contact, weight transfer,
passing, opposite contact, opposite weight transfer, opposite passing. The
generator did not deliver it, which makes this a tool limit rather than a
direction fault, and changes what to ask for: **four frames rather than six**,
each with its body height said out loud (lowest at contact, highest at
passing), and the second contact stated as the MIRROR of the first.

### The stance widths, which were not enough

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
