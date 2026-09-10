# Open questions for the user

Either side may add one. Nothing here is guessed at; the rule is to do
everything that does not depend on the answer and leave this standing.

Format: the question, who is blocked, and what each answer would mean.

---

## 1. Does the floor grain still read as a checker?

**Blocks:** nothing; it is a suspicion nobody has confirmed.

Grain marks fill their own square, so a marked cell is a square of marks
beside a plain one. If the user sees the checker, the answer is marks asked
SMALLER than a tile and placed off-grid like cover, or fewer heavier ones —
**not more alpha**.

---

## 2. The bundle is 16.33 MB / 5.68 MB gzipped

**Blocks:** nothing yet. Raised because it is a decision nobody has taken.

The pipeline notes record 1.62 MB / 0.43 gzipped and that is a lot of art ago.
Art is ~17 MB of source: bodies 9.42, the camp scene 4.93. Nothing is broken —
first load is just heavy, and it will keep growing as art does. Worth an
explicit call on whether that matters before the next large art push.

---

## 3. 0007 Rimespike — PixelLab access for Astra

**Blocks:** all four replacement visuals in request PR #16.

Astra received [PR #16](https://github.com/Agletio/crystal-core/pull/16) at
`906f4fdf724e1c3b0840cdd32070faec810225ff`. PixelLab is explicitly requested, but this run has
no PixelLab tool, no matching plugin-directory result, and no
`PIXELLAB_API_KEY` for the repository's documented transport.

**Unblock:** provide authorized PixelLab access to Astra's runtime, or explicitly
approve a different provider. Do not paste or commit a key into this public repo.
Access permits the initial concept; it does not waive owner design approval
before animations/variations or final delivery. No assets have been generated.
State and evidence: `art/deliveries/0007-rimespike/INTAKE.json` and `NOTES.md`
on `astra/0007-rimespike`. This is recorded once; unchanged events are no-ops.
