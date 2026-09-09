# 0004 — the first animation: one creature, one walk, ONE picture

**Status:** open. Do after 0002's revision round, or instead of it if you would
rather answer the bigger question first.
**Nothing is replaced.** This is a new creature on a scratch id.

## The question

Whether frames of one creature can come out of you and still be the same
creature. That is the only thing standing between you and the other half of
the game's art.

## The trick, and please argue with it if you disagree

A generative model returns a different character every call, so frames asked
one at a time do not belong to one creature. **So do not ask for frames — ask
for ONE picture with every frame inside it**, laid out as a horizontal strip.
Consistency is then a property of a single generation rather than something
the model has to remember between calls. It is the same reason a tileset
arrives as one sheet and works.

If your tool has a better answer — a reference-image mode, an edit mode that
holds a subject, anything — use it and say so. The strip is a proposal, not a
constraint.

## What a body actually costs here, measured

Much less than it sounds, and I had this wrong in the pack until now:

- **All 126 bodies in this game are ONE facing.** The renderer mirrors
  anything walking left. The western half has never been drawn.
- A body is **4–5 states** — idle, walk, attack, sometimes cast, sometimes
  death — of **2–9 frames** each. **12 to 26 frames in total.** The Gaunt,
  which is a shipped monster, is 12.

`0004-reference-animations.png` is three shipped runs at 3x: the Gaunt's walk
(4 frames), the Imp's walk (9), the Gaunt's attack (3). That is the standard,
and it is a lower bar than a modern sprite sheet.

## What to make

**One creature, its WALK, 6 frames, in one horizontal strip.** A walk because
it is where a character coming apart between frames is most obvious, and
because the game measures it: `stride` is how far one gait cycle carries a
body, read off the art, and a walk that does not depict its own travel looks
wrong however good the frames are.

Subject is yours. Something that belongs in a lamplit cave; there is no gap in
the roster this has to fill, so pick whatever shows the most.

## Format

- **One PNG. Six cells in a row, each square.** 96x96 a cell is native
  (576x96); if your tool only outputs large, any uniform multiple is fine —
  say the layout and I will cut it.
- **The creature in the same place in every cell**, facing SOUTH-EAST — down
  and to the right, three-quarter view from slightly above. All 126 bodies
  face that way.
- Transparent background, hard alpha if you can get it. If you cannot, say so;
  the conversion handles it, as it did for 0002.
- Feet at their widest is one step, twice is a cycle. Six frames is a
  comfortable whole cycle.

## Rules that bite an animated body

- **Nothing is drawn under a body and nothing on its edge.** No contact
  shadow, no rim light. Both were tried and deleted at the owner's word: a rim
  recolours the outermost pixels, which ARE the silhouette.
- **An attack ends at full extension and never recovers** — the renderer holds
  a one-shot state's last frame. Not this brief, but it decides how you would
  frame one later.
- **An idle is a breath, not a gesture.** The game measures how far an idle's
  inked box shifts and holds the first frame if it is too much.

## Done when

`stripcut.mts` cuts it, quantising every frame together to one palette and
fitting them to one shared box — a per-frame palette flickers and per-frame
fitting makes the creature jump inside its own cell. Then it goes on a real
cave floor beside the Gaunt and the Imp, at ship size, moving.

I will also print how far the inked box travels across the run against what
the walk depicts, because a gait is two independent numbers and no amount of
re-drawing fixes an arithmetic mismatch.

**A useful failure is a good outcome.** Six frames of six different creatures
is the answer to the real question and it costs one picture.

---
## Outcome
_not yet_
