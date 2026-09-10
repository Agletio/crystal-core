# 0007 — redo Rimespike, whole

**Status:** `open`
**Astra has final say on all of it**, the numbers included — grid, aspect,
frame count, palette. Everything below is a fact or a cost, never a preference.
*"Even like sizing and aspect ratios etc she is final say."*

## Why this one

*The owner's call: "What I want to do is use her to completely redo a skill.
Let's start with rimespike. If we can get that looking good then I want to try
to use her to completely redo a character."*

So this is a whole subject rather than one picture, and it is the trial run for
doing a character the same way.

## What Rimespike IS, mechanically

Ice drives up through the ground under one enemy. **Everything within 1.3 tiles
takes the whole hit** — not a splash, the full damage to every body in the
circle. Cold, so it Chills; a Chill stacked eight times Freezes.

It has **one mode switch**, the only one in the game. The Rimefield node puts
the cast on a 2.5s cooldown, makes it reach 120% further and hit 100% harder,
and **what it leaves STANDS for 3.5 seconds**, Chilling everything around it
every 0.5s. That standing spike is the only thing in the game that casts fast
enough to fill a Freeze bar — measured over one descent: 1 Freeze on a bare
tree, 331 with the spike standing.

**So the two modes must read as different things**, and the difference is the
point of the whole skill tree.

## The four pictures it uses today

`0007-rimespike-current.png`, left to right at 6x:

| id | table | grid | inks | drawn |
|---|---|---|---|---|
| `sk_rimespike` | `GENERATED_ICONS` | 48 | 8 | Skills screen ~44px, HUD slot ~34px |
| `spike` | `VFX_ART` | 48 | 15 | in the world, pinned at its FOOT |
| `db_frozen` | `VFX_ART` | 48 | 12 | over a Frozen body |
| `db_chill` | `VFX_ART` | 48 | 17 | over a Chilled body |

**All four are in scope.** They are one family and currently only sort of look
like one.

## How they are drawn, which is Claude's half and is fact

- **A cast fills its circle with blades.** `spikeField` places about
  `radius² × 5.2` copies of `spike` on a sunflower spiral, each rising on its
  own beat. At 1.3 tiles that is 9 blades; with +50% Area of Effect, 20.
- **The standing mode draws ONE big blade** at `radius × 0.52`, plus a ring of
  broken ground and a blizzard of cold motes.
- **The blade is pinned at its FOOT** and sized off the radius the sim used, so
  Area of Effect grows it. It is squashed to 0.8 vertically because the art is
  drawn tall.
- **The ring and the motes are BLOCKS, not art** — drawn by the renderer in the
  damage type's own colour, because a picture cannot carry a damage type.

If a design needs any of that changed — a different anchor, a second layer, a
frame sequence rather than one still — **say so in `NOTES.md` and Claude does
it.** The renderer seam is the one thing not yours, and only because it is also
hit testing.

## Facts and costs, stated once

- `VFX_ART` rows hold **one frame**. A multi-frame effect is possible and needs
  renderer work; it is not free but it is not hard. Say if you want it.
- The palette is measured in `decisions/LIGHT.md`. **Cold belongs to the
  Prism's register** — the coolest, bluest, brightest-highlighted of the three
  zones — but Rimespike is a HERO skill and is cast in all of them.
- `docs/app.js` is 16.33 MB and every player downloads it. Four 48px rows are
  noise against that; a 96px multi-frame set is not. Not a veto, a number.
- Nothing may be drawn on a body's edge or under it. That is a shipped
  decision, twice made, and it binds effects that overlap a body.

## What good looks like

The owner's words about the current one, which is what started this:
*"Use pixel lab to make a cool looking ice spike not whatever that is."*
The judgement is what carries; the tool named in it does not, and quoting it
here cost an intake cycle — *"the idea is for you to replace pixel lab not sure
why Claude is saying to use it."* Astra's generator is the generator.

Beyond that: a cast reads as a field erupting, the standing mode reads as a
place that stays, and a player can tell at a glance which one is happening.

## Done when

The owner says it looks good. Claude measures, imports under scratch ids, and
draws it at ship size in both modes on a real floor.

---
## Outcome
_not yet_
