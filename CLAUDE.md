# Crystal Core

A browser ARPG. Deterministic fixed-timestep sim, seeded RNG, no framework.

## Commands

| | |
|---|---|
| `npm run comments` | comment budget |
| `npm run typecheck` | tsc |
| `npm run build` | bundle to `docs/app.js` — **committed**, Cloudflare runs no build |
| `npm run smoke` | headless boot and interaction |
| `npm run demo` | sim, economy, trees, balance |
| `npm run mods` | every modifier rolls, does something, reads |
| `npm run shots` | screenshots, overflow and lockdown probes |
| `npm run guide` | plays the opening with a real pointer |

Build before `smoke`, `shots` or `guide` — they load the bundle, not the source.

## Comments

Comments carry what the code cannot: an invariant, a unit, a constraint that
looks arbitrary, a trap. Everything else is noise.

- **State what is true.** Never "this used to be X" or "changed from Y". A
  reader who needs the old behaviour has `git log`; a reader who does not is
  being told about a thing that no longer exists.
- **Skip the why when the code shows it.** `if (spare > 0)` does not need a
  comment saying it checks for spare points.
- **No provenance.** Not the bug that prompted the change, not the measurement
  that motivated the number — unless the number is unexplainable without it.
- Trailing comments are free and often the right size.

`npm run comments` enforces a hard cap: standalone comment lines may not exceed
`max(10, 20% of the file)`. Comments are found by parsing — @babel/parser for
JS/TS, parse5 for HTML plus its inline `<style>`/`<script>` — never by matching
text, so a `//` inside a string is not a comment. Trailing comments are free.

It runs automatically as a `PostToolUse` hook the moment you move to a different
file, and again on `Stop`, so a run of edits on one file is never interrupted
mid-change. Also in CI, ahead of typecheck.

**Fix a violation by cutting prose.** Adding code to raise the 20% is the one
repair that makes the file worse.

## Shape

```
src/data.ts        every table: mods, currencies, bases, skills, monsters
src/mods.ts        capacity, allocation, rolling
src/crafting.ts    CONDITIONS / EFFECTS registries — currencies are data
src/skills-tree.ts allocation rules; src/trees/* are the webs
src/sim/           the deterministic simulation
src/render/        renderer seam: canvas2d fallback, pixi default
src/ui/            one module per screen
```

Positions are in tile units, never pixels. Both renderers must agree exactly,
so anything per-tile is a pure function in `render/renderer.ts`.
