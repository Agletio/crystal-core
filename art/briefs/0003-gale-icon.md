# 0003 — the Gale icon: the one subject the old generator could not draw

**Status:** open — **after 0002.** If the redo test says the pipeline works,
this is the first icon the game actually gains.

## Why this one

**Gale is the only skill in the game with no generated icon.** It falls back
to the movement shelf's boot, which is another skill's picture.

It is also the subject the old generator could not draw. Pixel Lab was asked
eight or more times and returned five feathers, a knife, a windmill and a dark
pennant; none was usable and the fallback stayed. **So this is a fair test in
both directions.** If Astra draws it, that is an immediate reason to switch,
on a subject with a known failure baseline. If Astra cannot either, we have
learned it is a hard subject rather than a tool problem — which is also worth
knowing and costs one picture.

## What it is for

Gale is one of three movement skills. Blink teleports, Leap dives, and **Gale
never steps at all**: it holds GUSTS, granting movement speed for each one
held, losing one to anything that lands a hit and regaining one every 6
seconds. So out of a fight you are quick, and in one you are as quick as you
are untouched.

The icon has to be **told apart at a glance from Blink's and Leap's** on a
shelf of 34 skill icons. That is its whole job. What it looks like is yours —
the failed attempts are listed only so they are not repeated, not to steer you.

## Where it is drawn

`GENERATED_ICONS` under the id **`sk_gale`**. It appears on the Skills screen
as a 44px tile with the name under it, and in the movement slot of the HUD at
about 34px. **34px is the size that has to read.**

## Size and format

- **48x48, at its own resolution.** Not 512 scaled down, not 12 scaled up.
- One frame. No animation.
- **Hard alpha** — a pixel is opaque or absent, nothing between. Transparent
  background: not white, not a checkerboard pattern.
- Aim for **under about 20 colours**. The importer folds the palette down
  regardless, so picking them yourself is how you keep the shading you meant.

## What already exists

`art/briefs/0002-skill-icons.png` (attached to brief 0002) — all 34 shipped skill icons at 3x. That is
the bench yours has to look like it came off, and matching it is the actual
test. Ask Claude for any of them larger, or for a screenshot of the Skills
screen or the HUD.

## Done when

Claude runs `npx tsx tools/art/gridcheck.mts <your.png> @sk_blink` — your file
measured beside a shipped row — then imports with
`portrait.mts sk_gale <png> 48 icons`, and shoots the skill shelf and the HUD
with it in place. Then we look at it in the row and decide whether stage 2
(tilesets) is worth starting.

**A useful failure is a good outcome.** Upscaled, soft-edged, or in a
different visual language from the other 34 all answer the real question.

---
## Outcome
_not yet_
