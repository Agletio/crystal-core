# Crystal Core

A browser ARPG. Deterministic fixed-timestep sim, seeded RNG, no framework, no
server. Ships as `docs/index.html` plus a committed `docs/app.js`.

Open `docs/index.html` in a browser, or run `npm run watch` and open it from
there. Cloudflare serves `docs/` as-is and runs no build, which is why the
bundle is committed.

## The two files that are kept true

- **`CLAUDE.md`** — what the game IS. Every rule that holds whatever you are
  changing, and the table of skills to load before touching a domain.
- **`ROADMAP.md`** — what is LEFT. A finished phase is deleted from it.

Everything else, this file included, is a pointer to those two. Domain
documentation lives in `.claude/skills/`: `art`, `renderer`, `systems`,
`screens`, `harness`, `critique`.

## Commands

| | |
|---|---|
| `npm run build` | bundle to `docs/app.js` — **committed** |
| `npm run watch` | the same, rebuilt as you edit |
| `npm run typecheck` | tsc, `src` only |
| `npm run comments` | comment budget |
| `npm run theme` | every colour a token, every token defined |
| `npm run mods` | every modifier rolls, does something, reads |
| `npm run drag` | ~13s: the dock reorders, a window goes where you put it |
| `npm run shots` | ~2.5min: every screen against a checklist |
| `npm run demo` | ~25min: sim, economy, trees, balance |
| `npm run smoke` | ~16min: headless boot and interaction |
| `npm run peek` | one descent, at a zoom, a pan, a crop, a burst of frames |

The timings are MEASURED and have been wrong by 10x in both directions before.
Run what a change can reach rather than the whole suite; the table of what
covers what is in the `harness` skill. Build before `smoke`, `shots`, `drag` or
`peek` — they load the committed bundle, not the source.
