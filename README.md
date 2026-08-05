# Crystal — crafting & currency core

Headless. No rendering, no DOM. Run it in Node, test it, then build UI on top.

```bash
npm install
npm run build       # bundle the bench -> docs/app.js
npm run demo        # console walkthrough + sustain harness
npm run smoke       # headless check that the bench boots
npm run typecheck
```

## Running the bench

Two ways, no server needed:

- **Locally** — `npm run build`, then open `docs/index.html` in a browser.
  Use `npm run watch` to rebuild automatically while you edit.
- **Anywhere** — push to GitHub, then Settings → Pages → Source: *Deploy from
  a branch*, Branch: `main`, Folder: `/docs`. Give it a minute and it's live at
  `https://<user>.github.io/<repo>/`. Phone, work laptop, anywhere.

`docs/app.js` is committed on purpose — Pages serves static files and won't run
a build for you. Re-run `npm run build` before pushing or the live page will be
stale.

## Branching

`main` always works. Break things on `dev`.

```bash
git checkout -b dev          # once
# ...edit, commit as you go...
git checkout main
git merge dev
npm run build && git commit -am "rebuild" && git push
```

There is never a `game_v2_final` folder. Old versions live in git history:
`git log` to see them, `git diff` for what changed, `git checkout <hash>` to
visit one.

## The one idea

**Gear and crystals are the same data structure.** A crystal is just an item
whose mods feed the map generator instead of the character. That's why a single
"add a mod" currency works on both with zero special-casing, and it's the main
reason this stays small as you add content.

## Slots

Each base declares named slot types and capacities:

| Base | Layout |
|---|---|
| Crystal | `{ mod: 3 }` — three undifferentiated slots |
| Gear | `{ main: 2, secondary: 2 }` — power vs utility |

Slot types are just strings, so a future base can invent its own layout with no
engine change. Mods declare which slot they occupy, and pools are disjoint —
a `main` mod can never land in a `secondary` slot.

There is no rarity ladder. Items have fixed capacity and you fill it with
currency. `fillState()` (blank / partial / full) is derived for loot colouring
and is never stored.

Keep each slot type **oversubscribed** — more eligible mods than slots. That's
what makes a roll feel like a roll. Crystals currently run 8 candidates for 3
slots; gear runs 5 for 2 on each side.

## Files

| File | What it holds |
|---|---|
| `rng.ts` | Seeded RNG. Everything random goes through it, so runs replay exactly. |
| `types.ts` | Data shapes. Read this first. |
| `mods.ts` | Mod pool, eligibility, rolling, and the flat/increased/more stat resolution. |
| `crafting.ts` | Condition registry, effect registry, `craft()`. **The extension point.** |
| `data.ts` | All mods, currencies, recipes. Content lives here, not in code. |
| `economy.ts` | Wallet, item factory, recipes, placeholder run rewards. |
| `demo.ts` | Runnable walkthrough, tier ladder, sustain harness. |
| `sim/grid.ts` | Map generation. Size and room count come off crystal mods. |
| `sim/pathfind.ts` | A* on the tile grid. |
| `sim/stats.ts` | Items → combat numbers, through `computeStat`. |
| `sim/run.ts` | The tick loop: movement, aggro, combat. Deterministic. |
| `sim/skills.ts` | Skill delivery registry. **The combat extension point.** |
| `sim/character.ts` | Level, XP, and what persists between runs. |
| `sim/loadout.ts` | Placeholder starter gear until equipment exists. |
| `render/` | Renderer interface + a placeholder canvas implementation. |
| `ui/` | The two views: crafting bench and run. |

## The sim

`src/sim/` is headless and DOM-free, same discipline as the crafting core — it
runs in Node, which is why `demo.ts` can print a tier ladder without a browser.

Three rules keep the graphics replaceable:

1. **The renderer only reads.** It takes `RunState` and draws. It never writes
   back, and the sim doesn't know it exists.
2. **Positions are in tile units, not pixels.** A new renderer picks its own
   scale, camera and projection without touching the sim.
3. **Fixed timestep off the seeded RNG.** Same crystal, gear and seed gives the
   same run tick for tick, so a balance complaint is reproducible from a seed
   rather than a description.

Swapping stick figures for sprites means writing a second implementation of
`Renderer` and changing one line in `ui/run.ts`.

`npm run demo` prints the tier ladder — which crystal tiers the starter gear
clears and where it dies, averaged over several seeds. That gap is the reason
to craft; if it never loses, gear doesn't matter yet.

It also prints a **termination check**. A run that never ends is the worst bug
this thing can have — it looks exactly like a hero standing still, and it has
happened three separate times (a corridor carved with only one leg, a
fractional exit tile the hero could never quite stand on, and a target on the
aggro boundary chased in circles). Assert on it, always.

## Adding a skill

Same shape as adding a currency. Most of the time, no code — add an entry to
`SKILLS` in `data.ts`:

```ts
{
  id: 'chain_lightning',
  name: 'Chain Lightning',
  description: 'Arcs to nearby enemies, weakening with each jump.',
  tags: ['spell', 'chain'],
  behaviour: 'chain',
  damageTypes: ['lightning'],
  damageMultiplier: 0.8,
  rateMultiplier: 0.9,
  range: 7,
  params: { chains: 3, chainRange: 5, falloff: 0.7 },
}
```

`behaviour` names an entry in `SKILL_BEHAVIOURS` (`sim/skills.ts`), which
decides **who gets hit**. The sim decides what a hit *does* — crit, armour,
death, XP — so a behaviour is usually a few lines of targeting:

- `chain` — hit the primary, then the nearest unhit enemy within
  `chainRange`, `chains` times, multiplier decaying by `falloff`.
- `ground_slam` — hit everything within `params.radius` of the user.
- `projectile` — fire `params.count` lines at the primary, hitting the first
  enemy each meets.

You only write code when you invent a genuinely new *kind* of delivery.

**`tags` vs `damageTypes` matters.** Tags feed the modifier engine, so
`['attack','melee']` picks up "increased Melee Damage" for free. Damage types
are separate so that "increased Physical Damage" can't leak onto a skill's
fire damage — each type is resolved in its own pass with the skill's tags
riding along. Never put a damage type in `tags`.

## Levelling

XP comes off kills, scaled by crystal tier, and the curve lives in `LEVELLING`
in `data.ts`. Levels grant flat life and damage.

Stats resolve once when a run starts, so a level gained mid-run applies from
the next one. That's deliberate — recomputing the hero's stats halfway through
a fight would make the replay a lie about what the sim actually did.

## Adding a currency

Most of the time, no code. Add an entry to `CURRENCIES` in `data.ts`:

```ts
{
  id: 'essence_of_ruin',
  name: 'Essence of Ruin',
  class: 'rare',
  description: 'Adds a guaranteed Danger modifier, and a Reward modifier.',
  targets: { kinds: ['crystal'] },
  requires: [{ kind: 'not_corrupted' }, { kind: 'has_open_affix' }],
  effects: [
    { kind: 'add_mod', tag: 'danger' },
    { kind: 'add_mod', tag: 'reward', optional: true },
  ],
}
```

Effects run in order. If one fails and isn't `optional`, the whole craft rolls
back and the item is untouched — which makes preview and undo trivial in UI.

Available effects: `add_mod`, `remove_mod`, `reroll_values`, `scale_values`,
`reroll_mods`, `clear_mods`, `fill_slots`, `add_slot`, `upgrade_mod_tier`,
`corrupt`, `set_meta`. Most take an optional `slot` and/or `tag` to constrain
them.

`scale_values` multiplies existing rolls rather than re-rolling them, so the
better the item the more a bad flip costs. `magnitude` defaults to 0.25 and
`upChance` to 0.5.

Available conditions: `has_open_slot`, `slots_full`, `has_slot_type`,
`fill_state`, `mod_count`, `has_mod_tag`, `has_item_tag`, `ilvl_at_least`,
`not_corrupted`.

You only write code when you invent a genuinely new *kind* of mutation — then
add one function to `EFFECTS` and every future currency can compose it.

## Adding a mod

Append to `CRYSTAL_MODS`, `GEAR_MAIN_MODS`, or `GEAR_SECONDARY_MODS`, and set
`slot` to match. Author tiers **best first**; `ilvl` gates them, so item level
is your main progression dial. `tags` are what tag-filtered currencies target
(`density`, `reward`, `danger`, `speed`, `damage`, …).

## The sustain harness

`npm run demo` prints reinvestment ratio per tier: average fragment yield
divided by crystal cost. **Keep it under 1.0** or the queue self-refills, the
character runs forever, and the resting state you wanted disappears.

T1 currently sits at ~1.1 on purpose — the early game should ramp. Everything
above it decays, so growth is logarithmic rather than exponential.

The other check worth running before you build much content: plot
*currency/hour if I spend everything on crystals* against *currency/hour if I
spend everything on gear*, across the progression. They should trade places
several times. That oscillation is the endgame rhythm.

## Deliberately not here yet

- **Loot and equipment.** The sim kills things but drops nothing, and there's
  no inventory. `simulateRun()` in `economy.ts` is still the old stub — the
  economy has not been rewired to the real sim yet, so the sustain numbers and
  the map you watch are currently two separate models of the same run.
- The hero's gear is a seeded starter set. The bench bridges into it (a crystal
  becomes the map, a piece of gear replaces the starter item of the same base),
  but that's wiring, not an equipment system.
- **A boss.** "Clear all" means every monster, then the exit — there is no boss
  fight at the end yet, and `simulateRun`'s `killBoss` flag is part of the old
  stub, not the sim.
- Only one skill exists (`strike`). The registry that makes more of them cheap
  is in place; the skills themselves are not.
- Trade, stash, passive tree, behavior scripts.
- Unique items — a base with a fixed mod list and `meta.unique`.

## Next

1. **Loot.** Drops on kill, an inventory, and equipping what you crafted. Then
   delete `simulateRun()` and let the real sim report its own rewards, so
   there's one model of a run instead of two.
2. Unit tests for `computeStat`. The sim exercises it hard now, but a subtle
   bug in the flat/inc/more order still poisons everything downstream and
   stays invisible for months.
3. Watch a T3 run for three minutes and decide whether it's genuinely pleasant.
   That was always the load-bearing assumption, and it's now actually testable.
