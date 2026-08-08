# Crystal — crafting & currency core

Headless. No rendering, no DOM. Run it in Node, test it, then build UI on top.

```bash
npm install
npm run build       # bundle the game -> docs/app.js
npm run demo        # console walkthrough + sustain harness
npm run smoke       # headless check that the game boots
npm run typecheck
npm run shots       # real-browser screenshots, phone + desktop
npm run mods        # does every modifier do what it says?
```

The first four are the fast loop. The last two are slower and answer questions
the fast loop structurally cannot — see below.

## Running it

Two ways, no server needed:

- **Locally** — `npm run build`, then open `docs/index.html` in a browser.
  Use `npm run watch` to rebuild automatically while you edit.
- **Anywhere** — <https://crystal-core.austin-baxter990.workers.dev>. Merging
  to `main` republishes it in about twenty seconds. Phone, work laptop,
  anywhere.

Cloudflare serves `docs/` as static files, configured in `wrangler.toml`.
There is no build step in that deploy, and that is deliberate: `docs/app.js`
is committed so publishing the site is a copy rather than a compile.

It used to be GitHub Pages, which deploys from the same runner pool as every
other Actions job. On a day when those runners were starved, a site that
needed no build sat undeployed for six hours while the checks that genuinely
need a machine passed fine in between. Moving the deploy off that pool means
a queue on GitHub can no longer stand between a merge and playing the game;
the checks stayed where they were, because waiting on a check costs nothing.

Cloudflare also builds branches, so a pull request gets its own playable URL —
which is a better answer than a screenshot to "what does this actually do".

`docs/app.js` is committed on purpose — Pages serves static files and won't run
a build for you. Build before pushing, or let CI do it (below).

## CI, and working without a terminal

`.github/workflows/ci.yml` runs on every push and pull request: typecheck,
build, smoke, demo. A push to `main` also **commits the rebuilt `docs/app.js`
back**, so the live page can never lag the source.

That last part is the whole point. The bundle is a committed artifact, so a
change to `src/` that lands without a rebuild gives you a green PR, a clean
merge, and a live site that doesn't change — the one failure you can't diagnose
without a terminal.

Which makes phone-only iteration work:

1. **Claude Code on the web** (`claude.ai/code`) in a mobile browser, pointed at
   this repo. It works in a cloud sandbox and opens a pull request.
2. **Read the check on the PR.** Green means it typechecks, the page boots, the
   loop works, every run terminates, and the guided opening still finishes.
   `npm run demo` exits non-zero when one of its checks fails — the numbers it
   prints are for judging by eye, but the `check()` calls have answers.
3. **Look at the screenshots on the PR.** A second check renders the PR's own
   build in a real browser at phone and desktop size and posts the pictures as
   a comment. That is the QC step a phone otherwise cannot do: the Pages URL
   only ever shows `main`, so without it the only way to see a change is to
   merge it. It also fails on horizontal overflow.
4. **Merge from the GitHub mobile app**, then play it on the Pages URL a minute
   later.

If the screenshots never appear, **Actions → pr shots → Run workflow**, and give
it the PR number. `pull_request` events are not guaranteed to arrive — PR #4
opened with no checks at all, and neither reopening it nor pushing to it
produced a run, while a manual dispatch ran instantly. A review step you cannot
re-trigger is one you eventually merge without.

Merge into `dev` first if you want somewhere to be wrong; `main` is the live
site and a bad merge is visible immediately. Note that `dev` has no URL of its
own — Pages serves one branch, and it serves `main`. The PR screenshots are
what you look at before merging, not a staging site.

## Checking the modifiers

`npm run mods` is not part of the fast loop. Run it after touching the mod
tables, the stat pipeline, or a skill's tags — it exists for bugs that are
silent by construction, and it has already caught two kinds that shipped:

- **A mod the engine never reads.** `areaOfEffect` was claimed by a gear mod
  and two nodes on Blight's own tree while nothing consumed it, so allocating
  them did nothing at all — and the mod still rolled, displayed and stacked
  exactly like a working one. The same shape had killed Currency Find and three
  crystal danger mods: `computeStat` multiplies, so an "increased" line on a
  stat whose base is zero yields zero. `percentStat` is for stats that ARE a
  percentage rather than scaling one.
- **A mod nobody can tell apart.** Fire, cold, lightning, melee, spell and
  generic damage are all `stat: 'damage'`, differing only by the stat line's
  tags. The describer ignored tags, so six distinct mods all rendered as
  "+18% increased damage" — which reads to a player as "elemental mods don't
  exist" rather than as a display bug.

So the checks assert that the ENGINE responds to the tables, not that the
tables look right: every mod must roll somewhere, move a stat something reads,
scale only its own tags, and read as words rather than identifiers. Mods that
are inert only because no skill deals their damage type are reported rather
than passed in silence.

The layout stacks on a phone — map and side panel below 900px, the dock's two
columns below 720px, and below 430px the dock goes back to two columns and
shrinks its slots, because stacking it there costs the map about 140px of
height. Playable, but it was designed for a desktop.

### When the site doesn't update

Look at the Cloudflare deployment, not at the code — `build and check` passing
tells you the bundle is correct, not that it shipped. The two are separate
systems now and only one of them puts anything on screen.

Worth keeping from the GitHub Pages era, in case anything here ever goes back
to an Actions-based deploy: **do not re-run a failed deployment.** It is the
obvious move and it cannot work. `deploy-pages` authenticates with an OIDC
token bound to the run's original context, so re-running an hours-old run is
rejected with

```
Failed to create deployment (status: 400)
Invalid actions OIDC token due to No keys from key endpoint match the id token
```

which reads like a permissions problem and is really a staleness one. Push a
commit instead: only a fresh run mints a fresh token. Three re-runs were spent
learning that.

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
| `render/renderer.ts` | The Renderer interface. **The graphics seam.** |
| `render/pixi.ts` | WebGL renderer (PixiJS). The default. |
| `render/canvas2d.ts` | Plain-shapes fallback when there's no WebGL. |
| `render/sprites.ts` | Procedural placeholder creature sprites. |
| `ui/icons.ts` | Procedural inline-SVG item icons. |
| `game/state.ts` | The whole game in one object. Inventory, wallet, character, bench. |
| `game/report.ts` | Banks a finished run and describes it for the results overlay. |
| `ui/inventory.ts` | The permanent inventory dock. |
| `ui/` | The screens: the run, crafting, the shop, and the dock they all act on. |

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

## Renderers

There are **two** implementations of `Renderer`, which is the practical proof
the seam works. The page starts on canvas so something is on screen
immediately, then hands over to WebGL once Pixi has its GPU device. If Pixi
can't initialise — no WebGL, a hostile driver, jsdom in the smoke test — canvas
simply stays and the page is never blank.

A renderer owns its own `<canvas>` and appends it to `#run-stage`, because a
WebGL context and a 2D context can't share one element.

### Camera

Everything geometric lives in a `world` container measured in **tile units**,
and the camera is that container's transform. That's what makes zooming cheap:
the map is built once and then moved, rather than 2,000 rectangles being
redrawn at new pixel coordinates every frame.

Zoom 1 fits the whole map. Above that it follows the hero, clamped to the map
edges so it never pans into the void. Damage numbers live in screen space
instead of the world, so zooming doesn't scale them into a blur.

The map draws with its own `--floor` / `--floor-lit` pair, much brighter than
the panel colours. Panel colours are meant to sit behind text; a floor lit
like that is unreadable at tile size.

### The floor

`floorPalette()`, `floorColour()` and `tileDecals()` in `render/renderer.ts`
are pure functions of `(tile, x, y)`, so both renderers agree exactly and a
redraw can never make the floor shimmer.

Rooms are **flagstone** — two courses per tile, offset like brickwork — and
passages are bare rock, so the map reads as a building the cave got into rather
than as two shades of the same slab. Roughly a fifth of the paving is missing,
which is the whole difference between a castle and a ruin. Light comes from
above: the edge *below* a wall is lit, the edge above one is in shadow. That
single pair does more for depth than the uniform outline it replaced, which lit
all four sides equally and so implied no light at all.

Every decal is a whole number of sub-tile pixels, on the same principle as the
sprites — a smooth blob on a pixel-art floor is the seam you can't stop
noticing.

`floorPalette()` exists for speed and isn't a micro-optimisation: `mix()` parses
two hex strings and builds a third, and the floor wanted eight per tile. Nothing
in it depends on `x` or `y`; quantising the grain to seven steps is what makes
that true, and it costs nothing visually while collapsing a thousand
one-rectangle draw batches into a handful.

Three things still vary underneath, in rising order of how much they say:

- **Grain.** Value noise smoothed across a lattice five tiles wide. Hashing
  each tile independently is the obvious version and it looks like television
  static — every tile differs from its neighbour, so the eye reads noise rather
  than surface. Rock varies in patches.
- **Chambers against passages.** `generateMap` labels corridor tiles `TUNNEL`
  rather than `FLOOR`, and `carve()` only ever writes into rock, so a passage
  crossing a chamber can't relabel the middle of it. `walkable()` is "not a
  wall", so the sim never had to learn the new value. Corridors draw darker,
  which makes the shape of a level legible at Fit instead of something you have
  to trace. This is the one that is worth more than decoration.
- **The vein.** `GameMap.vein` carries the socketed crystal's tier; the
  renderer turns it into sparse sub-tile flecks in that tier's colour, so a T5
  descent is visibly not a T1 one. It lives on the map rather than in the
  renderer because it has to be a fact about the map — a renderer inventing it
  would give the two implementations different rock.

Flecks are deliberately smaller than a tile. Tinting the whole tile was the
first attempt, and at any real zoom it reads as a square somebody forgot to
paint: you see the grid, not the rock.

The detail costs about **15% of frame time** — 47 → 40 fps median with the sim
paused, measured A/B on the same page with only the bundle swapped, under
headless software GL. That is the worst case for a few thousand extra static
triangles; it is also why `canvas2d` now culls the floor to the visible rect,
which it never used to do.

`npm run demo` guards all of it — that maps have both chambers and passages,
that every carved tile is walkable (so nothing has started testing `=== FLOOR`
and stranded the hero in a corridor), that a corridor never relabels the room
it joins, and that the vein tracks the crystal.

### The sprites

`render/sprites.ts` draws every creature at runtime onto offscreen canvases, so
no binary assets live in the repo. Each is **authored as text** — rows of
characters on a 16×16 grid with a key mapping each character to a palette
colour:

```
'...#DFEF#...W...',    # outline  D/C/L cloth  F hood  E eye  W staff
```

Verbose next to three `ctx.ellipse` calls and worth every line: you can see the
silhouette in the source, and moving a shoulder is moving a character rather
than guessing at a control point. `CELL` divides by the grid exactly, so every
logical pixel lands on a whole number of canvas pixels and nothing is ever
half-lit — that is the entire difference between pixel art and a small smooth
drawing. Pixi textures are forced to `scaleMode: 'nearest'`; under the default
smoothing the grid gets interpolated away and you get back the blurry drawing
the pixel art existed to not be.

Sprites are authored facing right and **flipped** rather than rotated, which is
what lets a pixel grid survive being pointed the other way.

The hero is a traveller who has been down here far too long: hooded, hunched
over a walking staff, cloak gone to rags, a bedroll still strapped to his back
because he set out meaning to come home. The only bright thing on him is the
eye. The monsters were converted in the same pass — a single figure in a
different style doesn't read as "the hero got better", it reads as broken.

Each creature has two walk frames; everything else (bob, lunge, recoil, death
spin) is done with transforms, because transforms are free and frames are not.
The hero's two frames differ by a leg swap *and* a one-pixel drop while the
staff stays planted, which is what turns a walk cycle into a limp.

`npm run demo` asserts every row of every frame is exactly 16 characters, and
that no creature's two frames are identical. A short row doesn't fail loudly —
it silently truncates the figure, which looks like "the art is a bit off"
rather than the typo it is.

To use real art, replace `makeSheet()` with a loader and keep the same
`{sprite, frame}` lookup — `pixi.ts` doesn't change.

### What the sim exposes for animation

These are the hooks that would be expensive to retrofit, so they exist now
even though the placeholder art barely uses them:

| Field | Why a renderer needs it |
|---|---|
| `facing` | Which way to point a sprite. |
| `action` | `idle` / `move` / `attack` / `hurt` → which animation to play. |
| `actionTimer` | How far through a transient pose it is. |
| `deathAge` | Corpses fade over `DEATH_FADE` instead of vanishing mid-frame. |
| `sprite` | Art key. A name, never an asset — the sim has no idea what it looks like. |
| `state.vfx` | Effect *shapes*. A chain's arc is A→B→C, which no renderer could reconstruct from "three entities lost life". |

Skills emit `vfx` themselves, via the `vfx()` callback on `SkillUse`, because
only the skill knows the geometry of what it did.

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

## Adding a monster kind

A data entry in `MONSTERS` (`data.ts`). Stat fields are **multipliers** on the
tier-scaled baseline, so tier scaling and monster identity stay independent — a
Brute is 2.2x whatever a monster is worth at that tier, at every tier.

```ts
{ id: 'brute', name: 'Brute', life: 2.2, damage: 1.6, moveSpeed: 0.7,
  attacksPerSecond: 0.7, attackRange: 1.15, sprite: 'brute', weight: 260 }
```

A pack rolls **one** kind and spawns all of it. Mixed packs read as noise on
screen; a uniform pack reads as "that's a Brute pack, careful" — which is the
difference between decoration and information.

A pack also rolls `RANGED_PACK_CHANCE` to spawn wielding the `bolt` skill
instead of closing to melee — the same skill the hero can use, through the same
code path. Ranged monsters get a pip above them so a pack that shoots is
identifiable before it starts shooting.

## How a run ends

The hero clears the **whole** map — that's baseline, not a toggle. Then
something takes the exit: a Warden, an Honour Guard, or a Swarm, from
`ENCOUNTERS`.

Which one is rolled **per run, not per crystal**, and isn't shown beforehand.
If you could see it coming you'd pick maps that suit your build, which is the
opposite of keeping it fresh. The three shapes stress different things —
single-target damage, sustained fighting, area clear — so no one build owns the
ending. Their multipliers apply to whatever the map's monsters already are, so
a finale on a dangerous crystal is dangerous for the same reasons.

The run is cleared when the finale is dead. Nothing special-cases it: it spawns
at the exit as ordinary monsters with a `bounty` multiplier, and the hero walks
over and fights it like anything else.

**Careful with "no target left".** It doesn't mean "no monsters left" — one can
be briefly unroutable while a crowd shuffles. Spawning the finale on that
condition cleared maps with sixty monsters still standing. A monster is written
off only after `HOPELESS_AFTER` failed routings, and `reachableRemain()` is
what actually decides the map is done.

## Skills and their trees

Skills level by **use** — the active skill shares whatever XP a run earns — so
the tree is what you get for committing to one, not something handed out with
character levels. Points spent are nodes allocated; the budget is the skill's
level.

Two rings around the skill. Inner nodes touch the centre, outer nodes hang off
an inner one, so reaching the interesting things means paying for the cheap
things first.

### A node has two channels

```ts
stats   ordinary stat lines, exactly like a mod's
grants  switches that CHANGE HOW THE SKILL WORKS
```

The second is the point. Most of your *numbers* should come from gear; the
tree should decide how you **play**. "Critical casts spread the blight" and
"Blight deals fire instead of poison" aren't expressible as stat lines, so
they're grants the behaviour and damage resolution read — same division as
currencies, where data says what and a registry says how.

Grants understood today: `convertTo`, `spreadOnCrit`, `extraTargets`,
`splashMultiplier`.

**Conversion keeps the original type's scaling.** Pyroclasm turns Blight's
damage to Fire but "increased Poison Damage" still applies to it — otherwise
converting would be a straight downgrade and nobody would take the node.

Node stats are folded into one synthetic `RolledMod`, so they go through the
same aggregation as gear rather than being a parallel system that drifts.

### Flat crit, not increased

Build-defining nodes grant **flat** critical chance. Increases multiply a 5%
base, so "+20% increased Critical Chance" is +1% — nowhere near enough to
build a crit-triggered archetype on. Gear supplies the multipliers; nodes
supply the base. With both crit nodes, Blight crits ~25% of casts instead of
7%, which is the difference between Contagion being a mechanic and being a
rounding error.

### Attacks and spells

Attacks scale with attack speed, spells with cast speed, chosen by whether the
skill has the `spell` tag. A spell has no business getting faster because you
found a sharper sword.

## Damage, resistance, armour

Damage types live in a table (`DAMAGE_TYPES` in `data.ts`) with a group each.
Adding a type there gives it flat damage, increased damage and a resistance
family automatically — those mods are generated from the table rather than
hand-written.

| | |
|---|---|
| **Elemental** | Fire, Cold, Lightning |
| **Occult** | Poison, Dark, Light |
| **Standalone** | Physical, Crystal |
| **Typeless** | scaled by nothing type-specific, resisted by nothing |

Group resistances roll low but cover three types; single resistances roll
high. Both stack, then cap together.

### Order of operations

```
base → flat added (per type) → increased (additive) → more (multiplicative)
     → crit → resistance (per type, cap 75%) → armour (hits only, cap 75%)
```

**The load-bearing part is per-type resolution**, not where resistance sits
relative to armour — they're both multipliers, so their order is commutative.
What would break is applying resistance to a *summed* total, because then Fire
resistance would reduce Physical damage.

Resistance and armour multiply rather than add. At both caps that's
`0.25 × 0.25` = 6.25% of a hit; adding them would mean immunity at 75 + 75.

### Armour

`reduction% = min(75, 100 × armour / (armour + 300))`

Curved on **points**, not on the size of the hit. Hit-size scaling made armour
impossible to state honestly — its worth changed with every attacker — so the
sheet now prints `armour 108 (27%)`. A straight linear conversion has no good
answer either: a small divisor and three mods reach the cap, a large one and
every mod feels like nothing.

Armour applies to **hits only**. Damage over time goes through resistance
alone, which is what lets an ailment threaten a heavily armoured build.

### Ailments

`Ailment` stacks are separate entries with their own clocks, capped at
`MAX_AILMENT_STACKS`. Applying to a saturated target drops the oldest rather
than being refused, so re-applying still refreshes.

Behaviours call `use.ailment(target, multiplier, seconds)` where `multiplier`
is TOTAL damage over the whole duration — they never reason in per-tick
numbers. `Creeping Blight` is the worked example: area, up to 5 targets, 10s,
weak alone and stacking.

## Danger buys reward

**Every crystal modifier is a downside.** Reward isn't rolled — it's derived
from how dangerous the mods made the map.

This is the difference between a roll being lucky and a roll being a decision.
When rarity was a mod, it was a gift and monster damage was a tax, so a crystal
was just good or bad. Now every mod asks the same question: how much of this
can your character eat?

It also sets up the thing that makes builds matter — **a character that shrugs
off one kind of danger gets paid for danger it isn't taking**. `of Cinders`
exists partly to be the first mod something could be built to ignore.

`DANGER_STATS` in `data.ts` scores it: `weight` is how dangerous a point of a
stat is (monster damage = 1.0), `rewards` is whether it pays.

```ts
monsterDamage: { weight: 1.0, rewards: true },
packCount:     { weight: 0.5, rewards: false },
```

**Density is the exception.** More monsters is genuinely harder, so it counts
toward the displayed Danger — but it already pays you in extra kills, since
loot and XP are both per-kill. Letting it also raise the multiplier would pay
twice and make density the mod you always want. It gets its own line in the
header instead.

The crystal header shows `danger · fragments · rarity · density`, so what the
mods below are buying is legible before you commit.

`REWARD` converts paying danger into multipliers. Loot only — XP stays
per-kill. A future "juice XP at the cost of loot" modifier belongs there as a
second channel rather than as a special case in the sim.

### What rarity does

Rarity is the chance a currency drop climbs a class: `basic → uncommon → rare
→ exotic`, rolled per step. The scarce currencies are reachable *only* by
making maps more dangerous, and this is what finally gives the sigils a source
— before it they existed solely in the starting wallet.

Equipment rarity is the same idea and isn't built: fixed-stat legendaries with
rarity tiers, where more rarity means better ones.

## The shell

The page never scrolls. `.wrap` fills the viewport, and only the active view
grows — it scrolls inside itself, so the frame stays put like an application
window rather than a document.

**One screen, six popups, and a dock.** The map is the floor: it's where the
game happens and the thing you return to after everything else, so it isn't
behind navigation at all. Two tab bars — Bench/Fracture in one place,
Character/Skills/History in another — were one set of destinations pretending
to be two.

- **Crafting** — a popup over the map rather than a page you leave for, which
  means a run keeps advancing while you spend what it dropped. The window is
  the item and nothing else.
- **Shop** — split out of crafting, because the two do unrelated jobs: one
  turns fragments into stock, the other spends stock on the item in front of
  you. Sharing a window meant that item scrolled out of sight exactly when you
  went to buy something for it.
- **Stash** — where the overflow goes once the dock stopped scrolling. You move
  things in by clicking them *in the dock*, which works because every popup
  stops above it: both halves of a move are on screen.
- **Character sheet** — reference you consult rather than a workspace you live
  in, and you want your stats while choosing a map *or* crafting gear.
- **Skills** — the same, per-skill webs.
- **History** — it was a panel on every view, which meant watching a run was
  mostly watching "+7 killed" scroll past. Kills aren't logged at all now; the
  count is already on screen. It's a record you go and read, not a feed.

Escape closes whichever is on top.

Every popup stops **above the dock** — `--dock-h` is measured by the shell and
the modal's `bottom` and `max-height` are both derived from it. That isn't
cosmetic: crafting works *on* the dock — both the item and the currency come
from it — so covering it with the thing that needs it is the one mistake this
layout can't afford.

While a map is on screen the viewport stops scrolling (`.viewport--locked`) and
the stage takes whatever height is left, rather than being sized to an aspect
ratio that made the view taller than the window. The lock is a function of two
facts — the map is showing, and it's showing a *map* — recomputed on every
phase change, because leaving it on froze whatever came next.

### The guided opening

Steps are data with a `done` predicate, so the guide can't desynchronise: wander
off and buy the shard early and the step is already satisfied. Two rules were
learned the hard way and are now guarded.

**A step never covers what it tells you to click.** `place()` will sit the card
*inside* a target big enough to hold it, which is what keeps it off the health
bar during a descent — but the moment the dock grew to four rows it became big
enough to swallow the card, and "click your wand in the dock" got printed over
the wand. That placement is now gated on the step having nothing to click
(`ring: false`). `shots.mjs` fails the run if the card overlaps its own
highlight, because it needs real layout to catch.

**A step never points at something a popup is covering.** The header sits under
every modal, so "Open the Shop" was aimed at a button behind the window you were
standing in. `viaHeader()` returns the next click on the way there — a close
button, then the header button once nothing is in the way. Same moving-target
trick the equip step always used, factored out once three steps needed it.

Card placement also anchors to the enclosing `.dockcol` rather than the slot
grid, because a section's caption sits outside the grid it names and the card
was landing on the word "CURRENCY".

The eventual history is filterable and much richer — xp, damage by source,
regen, drops — enough to answer "why did I die" after the fact. Entries
already carry a `kind` and a timestamp, which is what a filter would key off.

## Item quality

Every item carries a **quality** — Rough, Seamed, Faceted, Brilliant — capping
how many modifiers it may hold at 0 / 2 / 4 / 6. That is deliberately a
different axis from the base's slot table, which says which *kinds* it can
hold. Collapsing the two was the original mistake: the slot table said both "a
body armour is a defensive piece" and "every item holds four modifiers", so
anything you ever found could be filled and re-rolled to perfection the moment
you owned one currency. There was no such thing as an item you couldn't finish,
so there was no such thing as an item worth finding.

`modCapacity()` is the lower of the two, and either can bind: a Brilliant helmet
is capped by its own six slots, a Seamed one by its quality. Bonus slots from
Sigil of Excess raise *both* — counting them against the slot table alone would
leave Excess silently doing nothing on the finished items it exists for.

### The currency ladder

Currencies are gated on quality, and quality is what a crystal tier drops. So
the ladder reads bottom to top: early on you are adding a modifier to a two-slot
piece; only much later are you re-rolling a six-slot one at will.

| | opens | raises | re-rolls |
|---|---|---|---|
| **Rough** | Seaming (→ Seamed, 1 mod) · Cleaving (→ Faceted, 3 mods) | | |
| **Seamed** | Making (+1, to 2) | Ascent (→ Faceted, keeps mods, +1) | Turning |
| **Faceted** | Making · Awakening (fills) | Brilliance (→ Brilliant, +1) | Chaos |
| **Brilliant** | Excess (+1 past the cap) | | Chaos |

Ruin takes an item all the way back to **Rough**, not merely empty — a wipe that
left it Faceted would be a free re-roll rather than a decision. Cleaving stops
one short of full on purpose: skipping a rung should cost you the last slot.

`set_quality` is one effect covering the whole ladder, because every rung is the
same shape — raise the quality, optionally fill to a target count. It only ever
moves upward; a currency that could quietly downgrade would delete modifiers as
a side effect of a name that didn't say so.

## What a tier drops

`TIER_DROPS` in `data.ts` is the whole progression in one table. The crystal you
socket decides what a map *can* give you, not just how much:

| | gear quality | mods | currency ceiling |
|---|---|---|---|
| Fissure | Rough, sometimes Seamed | 1 | basic |
| T1–T2 | Seamed | 1–2 | basic / uncommon |
| T3 | Seamed, some Faceted | 2–3 | uncommon |
| T4 | mostly Faceted, full | 3–4 | rare |
| T5–T6 | Faceted → Brilliant | 3–6 | rare / exotic |

Rarity raises the *chance*, never the ceiling. Without that cap a rarity-stacked
T1 would out-drop an honest T4, which is the entire ladder skipped in one lucky
kill. The unempowered Fissure passes `dropTier: 0` explicitly, because it runs
on a Tier 1 crystal it was handed rather than one you bought — otherwise the
free descent would drop exactly what a purchase does, and the first thing you
ever buy would be pointless.

`npm run demo` prints a **grid**, not a line: each grade of gear against each
tier. Reading down a column says what a tier demands; across a row says what a
grade of gear buys. The design wants roughly a diagonal.

## The shop

A shelf that grows with you rather than a catalogue that was always complete.
Recipes carry a `level`, so at level 1 it sells a Tier 1 crystal and the two
currencies you can actually use on a Rough item — nothing else. Gear stock is
randomly rolled, one of each, and leaves the shelf when bought.

It restocks **only on level-up**, seeded off the level. A shelf that re-rolled
on every open would not be a shelf: you would reopen the window until the piece
you wanted appeared, which is a deterministic shop with extra clicks. Stock is
priced off item level and quality rather than off what rolled — the reason to
buy from a shelf is that you can *see* what you are getting, and charging more
for the good one turns that back into the gamble the maps already are.

The shop never sells the top of the ladder. The best it stocks is a rung below
what a map of the same era drops, so buying is the floor under your luck rather
than a way around the crystal ladder.

## Equipment

Eight slots from `EQUIP_SLOTS`, filled from `GEAR_BASES`. A full set from the
start so the sheet has its final shape and a new base fills a hole rather than
changing the layout.

Worn items leave the inventory. Unlike crafting — where taking the item out
made it look destructive — equipping has somewhere obvious to show it,
so the sheet *is* where that item now lives.

Clicking a filled slot takes it off. Clicking an empty one lights up
everything in the **dock** that fits it — the sheet registers an
`InventoryHandler` like every other screen, so only fitting gear is clickable
and everything else goes inert. This replaced a picker panel inside the window,
which listed the gear that fit from the same inventory already on screen two
inches below it: choosing a helmet meant scrolling past your own dock to reach
a copy of it. Rings fit either ring slot, which is why bases declare a `kind`
and slots declare what they `accept` rather than matching by name.

The equipment column is `position: sticky` and the stats scroll past it. What
you are wearing is the fixed reference for everything on the right, and
scrolling it away to read a resistance meant losing sight of the thing you were
reading it about.

Taking gear off can be refused — see the carry limit below — so the button says
so rather than silently doing nothing.

## Inventory, loot, and the loop

The whole game lives in one object (`game/state.ts`): inventory, wallet,
character, and whatever is on the bench. Nothing persists — a reload starts
fresh — but it's centralised anyway, because that's the difference between
adding save points later and having to hunt state out of five modules first.
`version` is already there so a format change can reset cleanly instead of
crashing on old data.

The inventory dock is deliberately **not** a screen. Every other screen acts on
it — you pull a crystal out to run, put gear on the bench, spend currency on
it, watch the lot fill up after a clear — so hiding it behind navigation would
mean constantly flipping back to check what you have. Clicking anything does
whatever the active screen registered; the dock itself has no opinion about
what an item is for. When crafting is closed, gear is still *shown* but renders
inert: there is nothing to do with a helmet at the Fissure, and a live-looking
button that does nothing is worse than a dim one.

**Currency is inventory.** It used to be thirteen labelled buttons inside the
crafting popup, which said the quiet part out loud: a Shard of Making was a
menu command rather than a thing you own. It is a thing you own — you find it,
you count it, you run out of it — so it's a third column of stacks in the dock,
with the count on the icon. Clicking one applies it to whatever is on the
bench, which is the same seam items already used (`CurrencyHandler` alongside
`InventoryHandler`); with nothing on the bench it opens crafting instead,
because a currency you own that does nothing when clicked reads as broken.
Only what you *hold* is drawn — a stack of zero is not in your inventory, and
rendering all thirteen greyed out would rebuild the wall this replaced.

It's icons in slots — crystals, equipment, currency — with the name and every
modifier in the hover tooltip. Forty item names is a wall you read past; forty
icons is something you scan.

**The dock does not scroll, and that is the carry limit.** It used to be two
rows with `overflow-y: auto`, which made capacity invisible: ninety crystals
looked exactly like twelve, so "what do I keep" was never a question anyone had
to answer. Every slot you can fill is drawn — `CARRY` in `game/state.ts` is
both the rule and the number of squares — so running out is something you watch
approaching rather than discover in a report. The column label carries the
count and turns citrine when it's full.

Both grid dimensions are stated rather than auto-filled. An auto-filled grid
re-wraps as the window narrows, so the same slots would need five rows on a
small screen and the fourth would be clipped — the height has to be constant
for "everything you own is on screen" to be true. `--cols` is written onto the
element from the capacity, so the limit lives in one place and the layout
follows it. Below about 1120px the dock scrolls sideways as a unit rather than
reflowing; `shots.mjs` knows to ignore content inside a deliberate horizontal
scroller, because otherwise the guard reports the feature as the bug.

### The stash

A carry limit needs somewhere for the overflow to go that isn't the floor.
Stashed items are **inert** — not craftable, socketable or wearable until you
carry them again. Storage that also worked as a bag would just be a bigger bag,
and the limit would mean nothing.

It starts at 12 slots and grows 6 at a time for fragments, priced steeply
(40, then 64, 102, 164…) because fragments are the one contested resource:
space competes with buying a crystal, which is the same decision everything
else in the economy is made of. Buying happens on the stash tab, because that's
where you find out you need it.

`addItem()` returns where the item actually landed — bag, stash, or nowhere —
and every caller reports it. That last case is the one that matters: a full bag
and a full stash means loot you earned is gone, and it has to be *said*. An
item that silently fails to arrive reads as a bug, and you'd never learn that
the fix was to clear some space. The shop goes further and refuses the sale up
front, since `runRecipe` spends before it hands the item back — paying full
price for something with nowhere to go is a refund conversation, not a
mechanic. Unequipping refuses for the same reason: it's a net addition to the
bag, and a helmet that vanishes when you take it off is the worst possible
reading of a carry limit.

**The bench selects in place.** `craftId` is a reference into the inventory,
not a move. Taking the item out made it look like crafting had eaten it — the
thing you were working on vanished from the list — so it stays visible and
highlighted instead. `craft()` preserves the item id, so the result swaps back
into the same slot and the selection survives.

Only fragments show in the wallet strip, and that's deliberate: fragments are
the number you compare against a shop price, constantly, which is a readout
rather than an inventory slot. Everything you apply *to an item* is a stack
below.

Items get procedural inline-SVG icons (`ui/icons.ts`). Crystals grow on three
axes at once — size, facet count, elongation — so adjacent tiers differ in
outline and not only in hue, and a T6 reads as more valuable than a T1 without
reading the label. Currency gets one silhouette per kind, chosen for what the
thing *does*: a spike that grows for the one that adds, the same spike with a
chunk missing for the one that removes, a ring for a re-roll, a burst for the
one that fills everything at once. Class drives colour, so rarity is learnable
across a shelf while function is learnable up close. They were previously one
polygon with a side count driven by class, which meant all five basic shards
were the same shape in the same colour and the icon meant nothing. Shading is
one shared helper — a pale wedge and a dark wedge clipped to the silhouette —
so a set drawn months apart still has one light source. SVG rather than canvas
because they live in the DOM next to text and scale with it.

### One place, not a list of them

There is a single destination — **the Fissure** — and it is always open and
always free. A crystal is not somewhere else to go: it's something you *socket*
to empower what's already down there. That framing does two jobs at once. It
makes the next action obvious (there is one button, Enter, and it is never
disabled), and it makes "no crystals" a lean run rather than a dead end.

An empty socket is a legitimate descent, thinned by `FISSURE.densityScale`.
Socketing is a reference into the inventory, not a spend — you can pull the
crystal back out — and the crystal is only consumed at the moment you enter.

A new game therefore starts with **nothing at all**, not even a crystal. Two
starting crystals read as "spend these now", and a brand-new character who
socketed one into their first descent died to it. Crystals are what the first
clear's fragments are *for*.

The loop:

```
fragments → buy a crystal → craft it on the bench → socket it → fragments
```

Two rules give it teeth:

- **A socketed crystal is consumed**, win or lose. It's the stake, and it's
  what stops one good crystal being farmed forever.
- **Loot banks only on a clear.** A run carries what it finds in
  `RunState.loot` and hands it over at the exit; dying drops all of it. That's
  the entire reason the clear/fail distinction is worth anything.

XP is kept either way — you learned something on the way to dying.

### Adding to the results overlay

The overlay renders whatever rows `buildReport()` hands it and knows nothing
about what they mean. A new diagnostic — time spent walking versus fighting,
largest hit taken, damage by source — is a line in `buildReport()` and nothing
else.

`damageTaken` (split by damage type) is the worked example: it's tracked in the
sim, summarised in the report, and displayed, without the overlay knowing what
a damage type is.

## Line of sight

`hasLineOfSight()` samples the segment between two entity centres and fails on
the first wall. Attacks require it — being in range is not enough, or a ranged
attack cheerfully shoots through walls, which is exactly what it did before
this existed.

Monsters also need it to **wake**, but not to **keep** chasing: losing sight of
you mid-fight shouldn't make a pack forget you exist.

An attacker in range but blocked falls through to pathing, so it walks around
the corner instead of standing there. Verified over 5,253 attacks across 28
runs with zero resolving through a wall.

## Telling attacks apart

A skill names its visual with `vfxKind`; the renderer decides what that looks
like. `slash` draws an arc sweeping through the swing, `bolt` draws a
projectile that actually travels with a trail behind it.

Different **shapes**, not just different colours — at melee range two coloured
lines are indistinguishable, which was the original problem.

Colour is chosen in `vfxColour()`, where kind wins over damage type. That's a
presentation call, which is why it lives in the renderer and not the skill
data.

One trap worth knowing: PixiJS `arc()` continues the current path, exactly like
Canvas2D. Without a `moveTo()` to its start point it draws a line from the
canvas origin out to the arc — which looks like a stray beam fired at the
corner of the map.

Life bars are drawn on everything alive rather than only the wounded, dimmed
while untouched, so you can see who is and isn't taking damage.

## Bodies and corridors

Units have a `radius` and shove each other apart, so a pack spreads into a
crowd instead of stacking on one tile. Separation runs *after* movement:
entities steer as if the world were empty and then get pushed out of each
other. Collision-aware pathfinding is far more code for a result nobody
watching could tell apart.

It relaxes over two passes, because one leaves visible overlap in a crowd —
pushing A out of B can shove it into C. Two gets residual overlap to about a
seventh of a tile; three buys nothing. The hero shoves rather than being
shoved, or a big pack walks it backwards off its own path.

Corridors are 2-3 tiles wide for the same reason. At one tile, body collision
turns every hallway into a single-file queue and the hero fights one monster at
a time forever.

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

- **No gear or crystals drop.** Fragments and currency do. The payload is a
  currency map plus an item list, so adding item drops is a change to what gets
  pushed in — not to the plumbing that carries it or the overlay that shows it.
- **Legendaries.** Equipment rarity has nothing to act on: rarity only upgrades
  currency classes. The intended shape is fixed-stat legendaries with rarity
  tiers, so higher rarity means better ones.
- **Weapons carry no base damage.** A weapon is currently just another mod
  carrier; `HERO_BASE.weaponDamage` is innate. Per-base implicit stats are the
  obvious next step.
- **Gear rolls from one pool.** Every base draws the same mods, so boots can
  roll the same things a helmet does. Base-specific pools are cheap to add —
  `appliesTo` already exists.
- **Eight slots of stacked mods make the character very strong.** That's the
  deliberate direction (a character that insta-dies makes the loop unjudgeable)
  but it means the tier ladder currently has no falloff.
- **Nothing persists.** A reload is a new game.
- **A boss.** "Clear all" means every monster, then the exit — there is no boss
  fight at the end yet, and `simulateRun`'s `killBoss` flag is part of the old
  stub, not the sim.
- Two skills exist: `strike` (`cleave` — full damage to the target, 10% to
  everything else in reach) and `bolt` (`single_target`, ranged). The
  interesting ones — chain, true area, multi-projectile — need a behaviour
  each, which is the point of the registry but isn't done.
- `bolt` is identical to `strike` apart from reach, which isolates what range
  alone is worth and makes it strictly better. Give it a cost when it should be
  a real choice.
- The art is procedural placeholder shapes, not sprites anyone drew. The
  pipeline that consumes real sprite sheets is what exists.
- The camera fits the whole map on screen, so creatures are roughly one tile
  and stay small on big maps. A follow-camera is a change to `pixi.ts` alone.
- Trade, stash, passive tree, behavior scripts.
- Unique items — a base with a fixed mod list and `meta.unique`.

## Next

1. **Equipment.** Slots, a character sheet, and wearing what you looted. Until
   gear can be worn, half the inventory is decorative.
2. Unit tests for `computeStat`. The sim exercises it hard now, but a subtle
   bug in the flat/inc/more order still poisons everything downstream and
   stays invisible for months.
3. Watch a T3 run for three minutes and decide whether it's genuinely pleasant.
   That was always the load-bearing assumption, and it's now actually testable.
