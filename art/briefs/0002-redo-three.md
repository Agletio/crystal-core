# 0002 — redo three skill icons: the test that decides the rest

**Status:** open — **do this first, before 0001 and 0003.**
**A test, not a job. Nothing is deleted and nothing is replaced.** The three
shipped icons stay exactly where they are; yours are put beside them and we
look at the pair.

## The question this answers

The art in this game was made by Pixel Lab, a pixel-art-specific generator.
The intent is to replace it with you, and nobody knows yet whether that works.
*"The hope would be for it to be significantly better at making art and we
replace everything with stuff it's created, but I want to see what it can even
do first."*

A **redo** answers that better than a new icon would, because there is a
baseline: the same three subjects, drawn by the thing being replaced, sitting
right beside yours. Three rather than one, because one picture says whether
you can draw and three says whether you can draw a **set** — and a set that
looks like one hand is the whole of what a roster needs.

## Step one, before drawing anything: read the existing art

This part is not optional and it is most of the value.

Attached:

- `0002-skill-icons.png` — all 34 shipped skill icons at 3x
- `0002-redo-these.png` — the three you are redoing, at 6x
- `palette-icons.png` — the palette, below

Ask Claude for anything else you want to see: gear icons, material icons,
monster bodies, a cave floor, the camp, any screen in the game. He will shoot
it. **Ask before you draw** — this is the step that decides whether your set
looks like it belongs.

Say what you see before you draw. What is the light doing, where does the
outline sit, how is a form read at 48px, what is the palette actually doing.
If your read differs from what is written below, say so — the notes are
observations, not law.

## The palette, measured

**209 shipped icons are made of 36 distinct colours.** That is a forced
palette, and matching it is most of what "looks like it came off the same
bench" means. Folded to 28 by weight:

```
near-black   #0a0807  #221a10
brown        #443322  #5a4530  #7a5c3c  #9c7a4e  #c2a06a  #e2c68e
gold / fire  #8a3a16  #c4631e  #e2871b  #f5c24a  #ffe9a8
steel / bone #8e8a94  #9aa3a8  #d6dde0  #f2ede4
blue         #1e3a52  #2e6c93  #6fc2e0  #bfefff
purple       #3a2352  #6b3fa0  #a97be0
green        #243b22  #4f8a3a  #8fd654
blood        #6e120e
```

A warm brown-and-gold base, steel-blue and purple as the accents, everything
against near-black. Each of the three icons you are redoing uses **12 to 15
colours** — that is the working budget, not a limit imposed on you.

## What to redo

Three, in the attached order:

1. **Strike** — a melee attack. A hit that splashes 45% within 0.9 tiles.
   The shipped icon is a sword.
2. **Fireball** — a ball of fire at range, splashing 35% within 1.3 tiles.
   The shipped icon is a flaming sphere.
3. **Ambush** — the rogue's skill. It **steps behind what it hits**, so it
   fights every pack from inside one, and a critical hit relays it into
   another. The shipped icon is a purple dagger, and it is the muddiest of
   the three at small size.

**You are not tracing them.** The subject is fixed — a player has to recognise
a strike, a fireball and an ambush — and everything else is yours. If you
think Ambush should not be a dagger, draw what it should be and say why.

## Size and format

- **48x48, at its own resolution.** Not 512 scaled down, not 12 scaled up.
  If your tool only outputs large, say so and Claude will resample — but say
  it, because silently upscaled art turns every pixel into a block.
- One frame each. No animation.
- **Hard alpha**: a pixel is opaque or absent, nothing between. Transparent
  background — not white, not a checkerboard.
- These are seen at **34 to 44px**. That is the size that has to read.

## Done when

Claude runs `gridcheck.mts` on all three beside shipped rows, imports them to
a **scratch id** — not over the originals — and shoots the three pairs side by
side at ship size. Then the owner looks and decides.

**A useful failure is a good outcome.** Upscaled, soft-edged, off-palette, or
three icons that do not look like each other all answer the real question, and
they cost three pictures.

---
## Outcome
_not yet_
