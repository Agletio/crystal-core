# Crystal Core — Roadmap

**The list of work, and nothing else.** Everything that is always true lives in
`RULES.md`; the game as it stands is `CLAUDE.md`. If a thing here is not a task
or something you need in order to do one, it is in the wrong file.

## Where this stands

**THE WHOLE NORMAL POOL IS GENERATED** — the Crawler, the Husk, the Hound, the
Heap, the Gaunt and the Bonecaller, six rows where there were eleven, all undead
and all levelled onto one brightness. So a Fissure descent is generated at both
ends, the ground and everything standing on it, and it reads as one art era.
Open question 8 is closed with it: a body asked DARK separates from all four
zone floors, so nothing is re-inked and nothing is generated per zone. **The
Demonic and Prismatic pools are still hand-drawn** and are in the backlog, not
in a phase — twelve more bodies is about 800 generations and a lot of judging,
which is a job nobody has asked for rather than a `RULES.md` decision.

**Before generating anything else, read "The process, as it now stands" and
"Doing this a thousand times" below.** The first is the runbook and the second
is every pitfall that has already cost time — the ten-job account-wide limit, a
refusal that arrives as text rather than an error, a dedup keyed on the first
thirty characters of a description, and characters that vanish from the server.
The GENERATION budget is the ceiling; the source size is not, and this file said
otherwise for months.

**ALL FOUR zones are drawn by a GENERATED TILESET, in live descents.** Four
sets, one per zone, each asked off that zone's own line in `MAP_THEMES`. The
runtime palette is what a generated surface cost, and that was the user's call
taken in the doing.

**The SANDBOX IS DELETED and the work has moved into the game.** *The user's
call, in their words: "We are going to just delete the sandbox and start
updating graphics in the actual game. I think it either works or it doesn't."*
A descent is where art is judged, and `npm run peek` is pointed at one.

**THE UI IS ONE ART DIRECTION WITH THE MAP.** *The user's call: "we need to
redo the entire ui... to match the theme of the new fissure art... a more rpg
fantasy theme... literally everything", and "make sure you specify it in a way
that doesn't leave any stragglers".* The frame is the Fissure's own rock with
its lamps on it, in serif; the frame's tokens are SPLIT from the map's so a
retheme cannot re-ink committed art; the logo is a drawn gem in grid art; and
"no stragglers" is two machine checks rather than an opinion — `npm run theme`
fails a hand-written colour or an undefined token, and `shots.mjs` carries a
CHECKLIST of all 30 screens and fails on one nobody shot.

**THE SHELL IS BUILT THINGS.** *The user's call: "instead of all sprayer
buttons in the bottom right an actual designed bar like wow/poe does with
buttons on top of that. Apply that logic to everything else."* Six generated
fixtures out of ONE `create_ui_asset` call plus one pixflux socket
(`tools/art/uikit.mts`, `src/render/generated-ui.ts`, `--fix-*` mounted by
`src/ui/fixtures.ts`) dress every cluster the phase named: socketed action
bar, channel vessels, flask rack, framed windows with carved title plates,
carded dock/tooltips/menus/bubbles/sockets. The mechanism rules — the border
shorthand resetting border-image, fill middles tiling, the window cascade —
are in `RULES.md` under One art direction. The weak icons are re-asked:
fireball is a ball in flight, blight is a falling wall of liquid poison at
the user's word, strike a broadsword with the swing behind it. **The title
followed**, at the user's word ("way too noisy... I really don't like it"):
the two-worlds canvas and `titleart.ts` are deleted, and the title is the
mark on a generated ceremonial plaque (`extras` in `uikit.json`) over quiet
stone — one lamp glow and a vignette. The gem ghosted enormous behind it came
and went: at that size its grid pixels read as a banding artifact, the user
called it, and `src/ui/logo.ts` went with it.
**Then the ITEMS followed**, at the user's word again: 66 more generated
icons — twelve crystals (three families × four levels, each family its own
stone), all 48 armour pieces, the weapons and the jewellery — with
`crystalIcon`/`gearIcon` answering the generated table first, the tooltip
carrying the art beside the name, and the title's mark now the highest-level
Normal crystal. What the batch taught: an ask per FAMILY with a shared tier
sentence keeps a ladder reading as one ladder; the one family that came back
wrong (nightweave, violet like arcanist's) was re-asked by naming what it may
NOT be; and a 66-row batch runs in sevens through `icon.mts`'s own ten-job
slice, idempotent on the cache, in about twenty minutes.

**THE SECOND POLISH ROUND IS IN, plus the follow-ups the user called off
seeing it.** Save & Load is select-then-act — a slot is a button, Play now /
Save here / Delete act on the pick, warnings on the two that destroy; a
Settings shell exists (`open-settings`, an empty framed window on purpose);
the grit dither is a quiet wash everywhere; the title's ground is a GENERATED
scene of the fissure — rock face, lit crack, a lantern either side, meadow —
a `crackscene` extras row carrying its own `style` words (to escape the kit's
fixture styling) and an emit-time `crop` (the generator framed it anyway).
The wordmark is one gradient, a dark stroke and ONE hard shadow — the soft
halo read as mush — and plaque, mark, wordmark and rules all size off
`--plaque-w` so a short viewport scales instead of wrapping. Fixture buttons
highlight WHOLE: the enter plate `fill`s with its own stone and glows at its
silhouette (`drop-shadow`), because brightness over a flat padding-box centre
lit a hard rectangle inside the carved edge. Off the follow-up round: the rail is a
34px touching row of screens with Fill/Hide/dev on their OWN small plate
above, sized to clear the flask bar at 1280 with no lift; each flask stands
in a dark arched NICHE on the rack with its threshold controls under it; and
the webs are PoE-shaped — gold-ringed medallion notables, silver-band minors,
an image in every frame off the node's own words, rusted oval chain between
them. The one piece NOT done is the trade web's rework beyond theme — open
question 12, the user's to spec.

**YOU WALK AROUND THE FURNITURE IN AN AUTHORED ROOM.** *The user's call: "make
the furniture specifically solid so you can't walk through it."* The bench, the
shelf, the lampshelf, the lamprack, the slab, the plinth and the orrery are in
`SOLID_PROPS`, so all 38 pieces across the four rooms block and every route from
the hole to the person goes round them. `Grid.solid` has a live producer for the
first time since the arrangements were cut. Lanterns and floor debris stay
walk-over.

**A descent is what the ROCK did and nothing else** — loose stone drifted at the
wall's foot and three shapes of root on the cut face, with nothing standing on
the floor, at the user's word. And the Fissure floor is RETONED at emit:
rgb(206,193,158) at luma 193 was beach sand, and it is a dim warm grey at 126
now.

**ONE BODY PER FAMILY THROWS and nothing is labelled.** `MonsterDef.throws`
splits `MONSTER_ABILITIES` — the Bonecaller, the Chanter and the Prism throw,
everything else bites — and the pip over a shooter's head is gone with
`castsVisibly`. A family with no thrower deals about HALF what it did, measured,
so that is a mechanism rule and not a balance one.

**THE HERO IS HIS TRADE, and the doll is gone.** Both trades carry a whole
generated body of their own — the Alchemist broad in a burned apron, the
Aethermancer starved and hung with violet phials — `wanderer` is what a
character with no trade is drawn as, and `gear-art.ts`, `look.ts`, `body.ts`,
`pose.ts` and the `Look` type went with the requirement that needed them. The
phase that held all of that is finished and deleted.

**NOTHING STANDS IN A PUDDLE ANY MORE.** The ground the generator paints under
a body is cut at IMPORT by three rules — `defloor` by colour, `deslab` by shape,
`loose` for what is left unjoined — and the Dragger, the Shroud and the Gaunt
are all clean where the first two were not. No generations were spent. Every
body the art can measure now reports a stride 0% off; the Shroud's hem hides its
legs and it says so.

**A BODY STANDS ON ITS TILE.** Every entity sprite is pinned at `bodyFoot` less
a quarter tile rather than at its centre, so the drawing hangs 0.25 tiles below
the entity at every `scale` on the roster — it was 0.63 for the hero and 1.33
for the Gaunt, which is what put a big body out over the void. North and south
only: east/west overhang is width and the user has not asked for it.

**A body that has not seen you PACES**, an anchored wander about a tile wide. It
is why a pack no longer reads as props, and it is what a walk/run split would
have needed — the split is now possible and still not built.

**APPEARANCE IS PER TRADE, and it is BUILT.** *The user's call:
"Ok maybe let's just scratch the per equip and make it per trade? Like custom
appearance for each trade? I want to have like 10 trades eventually but we only
have two now."* Equipped gear no longer changes the sprite. A trade look is a
WHOLE BODY — the monster pipeline, paid for six times already — so the per-slot
layers, crops, bands and anchors are all gone with the requirement that needed
them.

**What the abandoned route measured is kept anyway**, because it is about the
GENERATOR rather than about the hero, and the next thing to use `edit_image`
will want all of it: an edit repaints every pixel of the frame it dresses, a
call takes 4 frames at 96 and 16 at 64, and consistency stops at the call
boundary. It is under "Doing this a thousand times" and in `RULES.md`. The
tools that did it — `layer.mts`, `anchor.mts` — are deleted, at `d16ae4e`.

### If it does not work, revert to one of these

Two clean points, both pushed. **Tags could not be pushed — the remote answers
403 on `refs/tags` — so these are SHAs and this file is where they live.**

| commit | what it is |
|---|---|
| `3f31b6a` | the last commit with the Fissure still HAND-DRAWN. The generated tileset exists but nothing a player runs uses it. Reverting here undoes the zone in the game and keeps everything else. |
| `83b8488` | the BLANK room: every generated tileset deleted, props and bodies kept. Reverting here drops generated terrain entirely. |
| `9c85286` | before this session. The old two-tile wall, the chasms, the lightmap. |

`452887c` is the commit that put the tileset into the Fissure. Everything
before it was the sandbox, and the sandbox is gone.

## How to work

Do the lowest-numbered phase that is not blocked on an open question, all of it,
then delete it and renumber. Numbers in a phase are intent, not tuning — a
measurement beats them. A landed phase is DELETED from here, so before starting
one, `git fetch` and check you are on the tip of the branch: a phase you can
still see in a stale clone may already be built. Do not promote a backlog item
into a phase without being asked.

**`npm run shots` was RED for `desktop: the first descent never met the
Lampwright`, and it is GREEN now.** It was never diagnosed, and it has NOT been
fixed on purpose: dressing a descent consumes one draw from the run's own rng,
which shifts every roll after it, and the first descent now happens to reach
`#met`. So it is a seed away from coming back. If it does, that is the old
undiagnosed fault and not a regression.

**What the last phases turned out to know that their writing did not.**
Kept here because the next thing built on top of them will want it.

- **The web kit is GENERATED and `webkit.mts` owns `generated-web.ts`.** Four
  pixflux pieces (two node frames, the hub, a chain segment) ship as data URIs
  drawn as SVG `<image>`, and the fifteen `wn_*` node icons ride the ordinary
  icon pipeline. The minor frame came back a filled verdigris shield until
  re-asked as a variation on the notable's working sentence; the flame icon
  summoned the torch holding it — the actor trap again.
- **`BodySpec.grounded` keeps a body's drawn ground.** The Crawler stands IN
  a mound and the Lampwright's robe pools like one, so `deslab` amputated
  feet and `loose` swept the toes; the flag keeps `defloor` and stands the
  other two down. Diagnose by running each rule alone over a live frame —
  every Normal-pool character was still on the server, so it cost nothing.
- **Rock cells draw again ABOVE entities (`wallLayer` in pixi).** A sprite at
  the north wall drew its head up the cliff; the overlay makes it walk behind
  the rock instead. Anything placed INTO rock (the roots) must ride that same
  layer or the overlay hides it.
- **The channel fixture's cap art intrudes past its border box.** A fill at
  100% of the content box drew over the right brass cap; the track is padded
  inside the caps (`.hp--slim` padding, `.hp__track`). Any fixture whose art
  rounds INTO the frame has the same gap between border-box and visible
  interior — pad, do not trust the border widths.
- **One row of rail sockets is wider than half a 1280 screen**, and `shots`
  judges everything at 1280×800. The first fix lifted the corner over the
  flask line below 1620px and the user refused it outright — the corner sits
  on the floor, and the answer is the utility trio on its own plate plus 34px
  sockets, which is what clears the flask bar. Adding a rail button widens
  the row; re-check the clearance.
- **The forced icon palette had NO red**, so the first life flask came back
  amber; `icons.json` carries three reds now and every future icon ask gets
  them. A colour a batch keeps refusing may simply not be in the palette.
- **`--grit` must stay a valid `<image>`.** Half its users compose it inside
  a `background-image` LIST, and `none` inside a list invalidates the whole
  property — so the quiet replacement is a barely-there gradient, not `none`.
- **A black split on near-black stone is invisible.** The title's crack is
  drawn as the LIGHT in it — the glow spilling out is what reads, and the
  same holds for anything dark carved into the frame's own rock.
- **`webart.ts` is frames and chain now: `frame()`, `chain()`, `mount()`.** A
  notable is a gold-ringed medallion with slim ornament points, a minor a
  silver band, the links are oval chain runs (every other link edge-on), and
  the image inside a frame comes from `src/ui/webicons.ts`, picked off the
  node's own words. `stud`, `gem` and `shine` are gone; `gridIcon` could not
  draw the images because it ROUNDS its height, which is 0 in a web measured
  in tiles — `nodeGlyph` builds its own svg with exact sizes.

- **The generator will not draw a MOTION or a PHENOMENON as an object; it
  draws the ACTOR or the SCENE that owns it.** Six generations on one icon
  measured it: "a sword-slash" summons a warrior swinging it (exclusions
  ignored, twice), "a waterfall of poison" summons the cliffs and pool around
  it, "a crescent of steel" is a moon. What works is describing shape and
  material with no actor noun in reach, or giving it an object it draws well
  (a sword) and putting the motion BEHIND it. A detached stray blob in an
  otherwise good result is cut at import — keep the largest connected
  component — not re-asked.
- **`create_ui_asset` facts, all measured:** the MCP tool takes flat
  `width`/`height` where the REST schema says `image_size`; the `pieces`
  template really does lay out a whole kit in one 20–40 generation call in
  one style; a piece under ~90px comes back detail-less (the 48px socket was
  an empty ring) and is asked ALONE via pixflux instead, standing in through
  `SOLO` in `uikit.mts emit`.

- **NEITHER WEBFONT HAS EVER RENDERED IN A SCREENSHOT THIS REPO TOOK.**
  Measured on the served page in headless Chromium: `Silkscreen` and `IBM Plex
  Mono` lay out at exactly the generic fallback's width, so every shot ever
  judged here was DejaVu, and the "monospace terminal" look was the fallback
  doing it rather than the chosen face. The last name in each stack is the one
  being designed, and it is what an offline player gets. **Check what a font
  actually resolves to before reasoning about it** — measure a string's width
  against the generic, since `document.fonts.check()` returns true for a family
  that is not there.
- **`?fast=` does not exist, and `RULES.md` said it did.** Nothing in `src/`
  reads a query parameter and the frame loop has no scale on its `dt`, which is
  why `shots` waits out descents in real time. Corrected there. **Anything
  either file says about a harness is worth grepping for before trusting** —
  this is the same failure as the renderer prose, in a new place.
- **Three CSS variables were used and never defined** — `--edge`,
  `--parchment`, `--pitch`. An undefined `var()` is invalid at computed-value
  time, which is neither an error nor a warning: the property silently inherits,
  so `border: 1px solid var(--edge)` drew a border the colour of the text. They
  had been in the file long enough that nobody could say when. `npm run theme`
  is the check that would have caught them on the day.
- **The retheme was mostly ONE mechanical swap, and the split was the design.**
  Pointing every UI rule at new frame tokens and leaving `VARS` alone was six
  string replacements; deciding WHICH names were the frame's took reading what
  the renderer does with them, and the answer was that `p.void` is the shade end
  of every hand-drawn creature and portrait. **A shared token between a frame
  and a renderer is a retheme that repaints the art.**
- **A grid icon that is not square was being squashed.** `gridIcon` set both
  `width` and `height` to `size`; every rail icon is 10x10 so it never showed,
  and the first non-square mark drawn through it was the logo.
- **The item MENU, the TOAST and the GRAFT bench are the three states no click
  reaches.** The menu wants a right-click (the press-and-hold is a timer and a
  flake); the toast is raised by exactly one thing in the whole game, an equip,
  and `note()` goes to the LEDGER and raises none; the bench is the last beat of
  a room somebody holds a relic for, so it costs a second cleared descent, which
  is why `shots` is five minutes rather than two.
- **The report was being shot as a second picture of the haul.** Every ending
  opens the haul ON TOP of the report, so a shot taken straight after abandoning
  is the haul. Close it first.
- **Making the furniture solid cost the SEVEN IDS and nothing else in the sim.**
  `block`, `Grid.solid`, `walkable`, `findPath` and `glide` were all already
  right, and every one of the 38 pieces blocked with none refused — the rooms
  were authored roomy enough that no piece strands anybody. The whole phase was
  one `Set` and three demo checks, exactly as the vacuous-check note below
  predicted. **The prop tile is what a `fits(x, y, 0.3)` test reads**, and for
  integer coordinates that is `walkable` and nothing more — so the "every prop
  fits where it was put" sweep started failing on every solid prop the moment
  furniture blocked. A PROP is asked about its tile and a BODY about whether it
  fits; split that way the second half catches a person placed on a bench,
  which is what it was always for.
- **A single-seed check does not fail when a mechanism breaks; it fails when
  the rng moves.** The wander shifted every draw after it and two checks went
  red, neither for a real reason. The Slow lands on six maps in eight and the
  demo measured one of the two that see none — it sweeps eight now. And "a
  press changes the run" compared two fingerprints eighty seconds apart, which
  a flask poured into a barely-hurt character correctly does not move; it asks
  the PRESS whether it spent a charge and put the flask on the hero instead.
  **Compare the thing you changed, not the far end of a run that contains it.**
- **A per-entity measurement must be scoped per SIM.** The wander's own check
  kept one `Map` of home positions across three seeds, and entity ids start
  again with each `RunSim` — so it measured a body in one descent against where
  a different body stood in the last and read 27 tiles of drift that nothing
  had walked.
- **`tables.mts props` CLOBBERED the zone tilesets, silently.** It wrote a
  `TILESETS` table into `src/render/generated-tiles.ts` — the file
  `zoneset.mts emit` owns — and nothing has read `TILESETS` since generated
  zones landed, so the only symptom was `ZONES` vanishing and the whole game
  failing to typecheck. It was reached because the ground was fetched to TONE
  the furniture by, and writing came along with the fetch. It reads the
  shipping floor for that now and writes nothing. **Two tools writing one
  generated file is a fault this repo has now had twice** — the first was three
  tools writing `generated-art.ts` — so before adding a writer, grep for who
  else writes that path.
- **`tools/*.mts` IS NOT TYPECHECKED.** `npm run typecheck` covers `src` only,
  so two missing imports in `tables.mts` passed clean and failed at runtime. A
  change to the art tools is proven by RUNNING them and nothing else.
- **Every generated PROP is now gone from the server**, not just some — the
  whole table came back `not found`. `furniture` keeps the grid a row already
  ships when that happens, which is the only reason a new prop can be added at
  all: throwing on the first dead row meant no new prop could ever be written
  again.
- **A prop is toned to the floor that SHIPS, and the floor moved.** `RETONE`
  darkened the Fissure after every existing prop had been toned to the old
  bright sand, so anything imported now is toned to the new stone and the old
  grids are not. Nothing looks wrong today because the survivors kept their
  grids, but a re-generated prop will sit differently from its neighbours.
- **The NOUN beat "roots" twice, and it was dropped the second time.** Three
  variants asked as "a few long single roots", "a knotted mass" and "a thin
  straggle" came back a single scratch, a tree trunk and green leaves. Re-asked
  as minimal variations on the WORDING THAT ALREADY WORKED — same opening
  clause, same exclusions, one adjective moved — two of three landed and the
  knot came back a tree again. **Vary the proven sentence, do not write a new
  one**, and drop a noun that has fought twice, exactly as the sigil was.
- **THREE BODIES COST 203 GENERATIONS AND MOST OF A DAY**, against the ~30 each
  this file estimated. The breakdown: 9 designs, 6 to rotate, 15 to animate one
  facing per state, and 60 to fill the other four — which is 90 CALLS but 203
  generations, because a v3 animation is more than one apiece. Budget by calls
  and you will be out by a factor of two.
- **The approval gate paid for itself.** Nine designs at one generation each
  answered three questions no amount of prose could: the crawler's "top half
  only" was refused by the model twice out of three (a legless body is the same
  trap as the body lying FLAT already written up here), the hound came back
  perfect first time, and two of nine baked in a cast shadow or a blood pool
  the ask had forbidden. Judging after the rotation would have cost thirty.
- **The gap between a new body and the roster was BRIGHTNESS, not colour.**
  Measured rather than eyeballed: the shipped three sit at luma 30-35 and sat
  25-27%, and the three new ones arrived at luma 43-56 and sat 24-31%. So
  saturation already matched and one gain per body closed it — which is
  `BodySpec.luma`, a target rather than a multiplier, applied over every frame
  at once. **Measure both before reaching for a colour pass**; the obvious
  reading of that comparison was "they are warmer", and it was wrong.
- **Every measurement that wanted "an ordinary monster" NAMED one.** Six call
  sites across `demo.ts` and `mods-check.ts` held `MONSTER_BY_ID.grub`, and
  cutting the roster broke all six at once — as a crash inside `monsterStats`,
  not as a failed check. They read the pool now. Anything that wants a typical
  ROW of a table should ask the table.
- **Cutting eleven rows to six cut the file's comment ALLOWANCE with it.** The
  budget is 20% of the file, so deleting 67 lines of table lowered the ceiling
  and put `data.ts` over by 14 without a word being added. Expect to pay for a
  deletion in prose.
- **The balance gauges MOVED with the roster.** One blank crystal after the
  first clear went from 18/24 to 24/24. The Seam went -0.1% to -21.1% and then
  back to **-12.6%** once every family got a thrower, which is inside its own
  wanted band again.
- **RANGED PACKS WERE CARRYING THE AURA WORLDS, and nobody knew.** Measured by
  isolating the change: taking ranged away from every pool dropped damage taken
  from 9.9 to 5.1 a second in the Rot and 7.5 to 3.0 in the Cavern, against 4.3
  to 3.4 in the Fissure. So a world with no thrower is HALF a world, and the
  "Normal is the shallow end" check — which is a `check()`, not a gauge — broke
  outright. **A family without a thrower is a mechanism failure, not a balance
  drift.** The fix was one `throws: true` per family, not a number anywhere.
- **A generated sheet CAN be recoloured, for free, and `RETONE` is where.** The
  runtime palette a painted tileset gave up is bought back at emit rather than
  at draw: chroma kept plus a per-channel gain over the whole sheet in
  `tools/art/zoneset.mts`, no generation, re-runnable, and the `.png` in
  `tools/art/cache/zones/` is the input. **That cache is gitignored and a
  container is reclaimed**, so if it is gone the durable copy is the data URI
  already in `src/render/generated-tiles.ts` — decode it back out rather than
  re-asking the generator.
- **A whole-sheet tone move costs nothing at the dark end when the rock is
  already black.** The Fissure's rock measures rgb(0,0,0), so two thirds gain
  took the floor from luma 193 to 126 and left the rock exactly where it was.
  A set whose rock is NOT black — the Cavern, the Seam — would lose separation
  the same pass, which is the thing to measure before toning one of those.
- **A monster at weight 300 cannot be judged by taking screenshots and hoping.**
  The Gaunt is one row in eleven and three peeks in a row caught none. What
  works is bumping its `weight` to something absurd, building, shooting it, and
  putting the weight back — a minute, and it is the only way to see a body
  against the hero and the pack at once. `npm run peek` takes a zoom, a pan and
  a `x,y,w,h,scale` crop, which is what makes the shot judgeable.
- **`radius` is capped for WALKING and uncapped for SHOVING.** `Grid.fits`
  clamps to `BODY_MAX` (0.45), so no radius can wall a body out of a passage;
  separation in `src/sim/run.ts` reads `a.radius + b.radius` raw. That is what
  makes doubling a big body's radius safe — it pushes the pack out of its legs
  and cannot strand it.
- **Stripping the arrangements left `Grid.solid` with NO live producer, and the
  check that guarded it went vacuous rather than red.** Every solid prop —
  altar, cairn, brazier, pillar, pitprop, cart, cocoon, stake, skulls — only
  ever arrived through a `VIGNETTES` arrangement, so `block` ran over four
  descents and marked nothing, and a check reading "furniture blocks, only
  where it may" passed forever while proving nothing. **A check whose subject a
  phase deletes does not fail; it stops meaning anything. Look for the vacuous
  ones, not just the red ones.** The rooms are the producer now — the same
  check, re-pointed, holds 38 real pieces of furniture — and the by-hand ring
  is still there for the UNDO half, which nothing a room places exercises.
- **The Fissure was the only zone `WORKED` held, so emptying that gate was the
  whole phase.** One call site, one `Set`, one constant. Everything else was
  the two demo checks written against the old rule.
- **A descent's dressing has its OWN rng**, so removing a pass moves the cover
  and cannot move a monster, a drop or a seed anything else reads. Measured: 141
  of cover and 9 roots on seed 11, and every balance number in the demo
  unchanged.

- **The sandbox's deletion had to answer its own trap, and it answered it the
  expensive way.** The phase said either keep a descent that dresses or delete
  the prop tables and say so. `VIGNETTES`, `COVER_PROPS`, `WALL_PROPS`,
  `STAIN_PROPS`, `SOLID_PROPS` and every entry in `PROP_ART` were reachable
  ONLY through the sandbox — `generateMap` returned `props: []` and the four
  authored rooms are not `bare` — so deleting the room would have retired every
  generated prop in the repo one phase before the roster phase generates more.
  So `generateMap` dresses, gated on `ZONE[theme]`: cover, growth on the face
  and `DRESS_PER_ROOM` arrangements per chamber. The other three zones get it
  free the moment they get a set. **The props phase now retires the
  arrangements deliberately** — that is a look decision taken with the room on
  screen, not this trap coming back, and the tables stay in the file.
- **`Grid.solid` was a layer the PATHFINDER did not know about.** `findPath`
  and `nearestByPath` tested `grid.at(...) === WALL` where everything else asks
  `grid.walkable`, so the first descent with furniture in it walked the hero
  onto a brazier and parked it there for 5,821 ticks: every repath from a tile
  it cannot stand on comes back empty, and the descent never ends. It was
  invisible while only the sandbox had furniture, because nothing in that room
  had to reach an exit. Anything asking "can a body be here" asks `walkable`.
- **A body could always clip a wall CORNER, and the demo's six seeds missed
  it.** `advance` interpolated straight to the next waypoint with no
  walkability test: waypoints never cut a corner, but a body pushed off the
  lattice by separation can cross one getting back to them. Measured on the
  UNCHANGED code over 60 seeds it happens on one of them — so it is pre-existing
  and the rng shift merely landed on it. `glide` moves per axis now, and both
  movers measure 0 ticks in rock over 80 seeds each.
- **`RULES.md` and `CLAUDE.md` describe a renderer that is partly not there,
  and this phase only fixed what it touched.** `lightMap`, `ROCK_TOP`,
  `ROCK_REACH`, `GRAIN`, `GLOW_PROPS`, `WALL_FACE`, `thinRock`, `wangCorners`,
  `wangNear`, `wangShadow`, `VOID` and every chasm are all named in prose and
  none exists in `src/` — they went with `83b8488` and `aecbe3c` and the docs
  did not follow. The sandbox and chasm passages are gone from both files now;
  **anything else either file says about the renderer is worth grepping for
  before trusting.** What the deleted work FOUND is still true and is written up
  further down this file.
- **`torch` and `hung` are generated art nothing places.** They are
  `HUNG_PROPS`, which is placed by hand and never scattered, and the hand that
  placed them was the shrine. `roots` keeps the set load-bearing because
  `dressWalls` scatters it. The first authored room built on a generated set is
  what they are waiting for.
- **Three more zones cost nine generations and no code worth the name.** The
  whole of that phase's zone work was: write the asks off each zone's own line,
  `ask`, `get`, `emit`, and four lines in `ZONE`. Everything the first set had
  to learn about the renderer — the twins, the nearest-key fallback, the
  bounding boxes, `fitCorners` — held for all three without a change. **The
  pipeline is the thing that was expensive, and it is paid for.**
- **`cavern_lit` is the tone rule MEASURED, and it is in the file on purpose.**
  It was asked the Cavern's own way round — pale crystal rock over a dark violet
  floor, which is exactly what `THEME_INK` says the zone is — and it reads
  inside out: the pale expanse takes the eye as ground and the chamber reads as
  a hole punched in it. A zone's identity is its HUE, and the tone is not
  negotiable. Two asks, two confirmations, and one of them deliberate.
- **Not asking for stone is not excluding it.** `seam_round` said meat and
  muscle and crystal throughout, never said stone, and came back as grey
  cobbles with magenta dots on the rim. The re-ask with NOT stone, NOT rock,
  NOT brick, NOT cobbles, NOT masonry drew what was asked for.
- **The Seam ships `seam_pro` and the repetition is the price.** `seam_round2`
  is the repetition-safe one — near-black rock, sparse crystal — and it reads as
  the Cavern with a pink floor. `seam_pro` is unmistakably two worlds fused, and
  its rock is a dense field that repeats visibly across a map. The Seam is the
  rarest room in the game, so identity beat repetition; the other set is in
  `zoneset.mts` beside it, one word to switch. **There is nothing left to
  answer repetition with** — `GRAIN` and the lightmap went at `83b8488` — so the
  cover scatter is the whole of the answer, which is why it is not gated.
- **Judging a zone means SOCKETING for it.** A zone is a composition, not a
  setting, so `npm run peek` takes a zone name and puts the crystals in through
  the collection screen — two Demonic for the Rot, two Prismatic for the Cavern,
  two of each for the Seam. There is no other way in, and there should not be.
- **A scene lost its multi-chamber machinery with the room that used it.**
  `ScenePlan` is `room`, `entrance`, `stands`, `props` and nothing else:
  `also`, `joins`, `cut`, `patrol`, `busy`, `plain`, `dress` and `grown` were
  all the sandbox's, and no authored room ever used one. Putting `also`/`joins`
  back is about ten lines of `sceneMap` and it is in the history at `2b965bc`.

- **THE SHADOW COST NOTHING, AND THE PHASE HAD BUDGETED TWO WHOLE BODIES.** The
  written plan was to crop the design below the hem, re-rotate and re-animate
  the Dragger and the Shroud — a new character each, every state judged again,
  and the roadmap's own measurement says three bodies cost 203 generations.
  What it beat: **a third RULE at import**, `deslab`, which finds the ground by
  SHAPE where `defloor` finds it by colour, plus `loose` for the stones left
  over. Zero generations, no risk to two approved bodies, reversible, and it
  cleared the Gaunt's residue too — which the phase believed was already clean
  and was not. **The prohibition the phase wrote was on loosening `defloor`,
  and it still stands**: the fix was another signal, not a lower threshold.
  Before re-generating anything to remove an artefact, ask whether the artefact
  has a shape the import can name.
- **A shadow is measured as FEET, so the stride gauge was reading it.** Cut, the
  Gaunt went -36% to 0% with its number untouched, and the Dragger's judged 1.52
  measured 1.80. The Shroud went the other way — -17% to 85% — because with the
  ground gone what it measures is the HEM, which is the case `CLAUDE.md` already
  named and nothing in code knew about. `BodySpec.robed` is that, one line
  through `generated.json`, `tables.mts` and `GeneratedArt`, and the gauge
  prints the reason instead of a percentage. **A measurement that reads the
  wrong thing is worse than none**, because a number gets tuned against.
- **The anchor phase's own trap was the one it did not write down: the HARNESS
  had already rotted.** `npm run drag` had been red and `npm run peek` had been
  shooting the character-select hall ever since a character became something
  you MAKE — neither walks `pick-take`, and the dev kit is a new game, so the
  gate runs a second time after `confirm-yes`. `drag` did not say so: it timed
  out 30 seconds later on a `dblclick` it could not land and named the window
  it was aiming at. **A harness that restarts the game walks the gate twice**,
  and it is in `RULES.md` now.
- **`bodyFoot` reads the SHADOW as the foot, for the two bodies that still have
  one.** Every body measures its ink ending at 0.917 of its grid, which for the
  Dragger and the Shroud is the bottom of the cast shadow rather than the
  bottom of the feet. The anchor is right either way — 0.25 tiles of overhang
  is 0.25 tiles — but cleaning those two moves their foot up, and the phase
  that does it should re-shoot rather than assume nothing moved.
- **A stray file called `--help` was in the repo, 400 KB of PNG.**
  `descent-peek.mjs` takes its output path as the first positional argument, so
  `node tools/descent-peek.mjs --help` writes a screenshot to a file named
  `--help`, and one got committed at `d2685f1`. Deleted. The tool has no flags
  and prints no help.
- **A phase's seven measured traps were all real, and all cheap.** The skills
  phase named seven things a fresh session would get wrong, every one of them
  measured rather than guessed, and each cost one edit: XP over `SKILL_SLOTS`,
  `treeGrants` over `SKILL_SLOTS`, `treePointsFor(skillId, level)`, `BANNED`
  narrowed to a phrase, the demo's sweeps given the third web family by hand,
  one `swingCooldown` helper, and a behaviour name per mover. **Nothing in the
  phase cost more than its traps did.** That is what a phase written to the six
  rules buys, and it is worth saying out loud.
- **The class audit's exemption is DERIVED, not a second list.** A mover's
  switches read a behaviour and declare no `changes`, which the "every switch a
  delivery reads declares what it changes" check failed at once. The fix is not
  an exemption list: it is asking `SKILL_BEHAVIOURS` whether anything that
  actually CASTS reads the switch. A mover has no cast, so it is exempt by
  construction and a third one will be too. The symmetric check — "nothing that
  changes no delivery claims a class" — was written and DELETED: `convertTree`
  reads the stat layer and is legitimately classed, so that half is just wrong.
- **A small web needed its own "every notable does something".** The tree's
  version fires `SKILL_BEHAVIOURS[skill.behaviour]` at dummies and counts who
  got hit, which for a skill with no behaviour is a crash rather than a check.
  The movement version reads the same expressions the sim reads — reach,
  cooldown, mana back, `landingOf` — so a grant renamed in one place and not
  the other fails rather than going quiet.
- **`fitted` per frame makes a walk cycle jitter.** Not this phase's, but the
  same shape: a function that measures what it is handed, run over things that
  are meant to be measured TOGETHER. `fittedTogether` was the answer there;
  `swingCooldown` is the answer to the same shape in the sim.

- **A table keyed only by SLOT made both men offer everything.** The phase said
  "`FORGED_MODS` for `ring` and `amulet` only", which is true of the lines and
  false of the panel: with `kinds` as the only key, the man who takes bodies
  offered a ring the graft he had just said he had no opinion about.
  `ForgedDef.who` names the room. A table keyed by the thing rather than by the
  person is the shape to watch the next time two characters share one.
- **A check written for one entry breaks on the second.** "A specimen only
  exists in the Rot" was written as `RELICS.some(...)` and started failing the
  moment a relic existed that was meant to be somewhere else. Sweeping a table
  is only right when it asks each row about ITSELF.

- **`fromHaul` pushed straight into `game.inventory`.** Every kind that is not
  gear was routed correctly by `addItem` and then routed WRONG the moment it
  came out of the haul, which is the one door a drop actually walks through. It
  calls `addItem` now. Anything that adds a container has to check both.
- **The dev preset carrying a relic scheduled his room over two boss checks.**
  Holding one IS the schedule, so the kit holding every relic means the ossuary
  is always owed — and two checks asserting "nobody is waiting" started
  failing. They clear `relics` the way they already cleared `bosses`. The dev
  kit has now broken a scheduled-room test twice, for the same reason both
  times: it is the game with everything, and every schedule reads what you have.
- **`tools/model-sheet.mts` keeps its own partial palette.** It lists the
  custom properties by hand and had none of the two far worlds' inks, so the
  first creature drawn out of the Rot handed `mix` an undefined and killed the
  tool. It has the whole list now; a new palette entry still needs adding there.
- **A bubble is anchored ABOVE its point, and nothing clamped it.** The first
  panel taller than four lines was drawn off the top of the screen. `anchor` in
  `src/ui/speech.ts` clamps to the window now.
- **A base with no implicit cannot show what a graft costs.** Half the armour
  families spend their whole budget on the rating, so `bulwark_*` has no line to
  write over — a check meant to prove the trade proved nothing on one. The
  reference family is `skirmisher`, which spends on three.

- **The demo's `GUIDED OPENING` section was not all about the steps.** Three of
  its checks were about the GAME and had to survive the deletion: the mark on
  the weapon the Lampwright hands over (and that a craft keeps it, and that
  `heal` puts it on a save that predates it), that the bench resolves to a
  piece you are WEARING and to a crystal you have SOCKETED, and that a first
  clear pays for the one currency the shop sells. They are `THE OPENING` now.
  A section named after a feature is worth reading line by line before it goes.
- **The ids the opening needed are still rendered, and now nothing proves they
  exist.** `dockSlotId`, `slotButtonId`, `recipeButtonId` and the three
  `skill*Id`s moved to the modules that mint them; the check that every one
  resolved was the walkthrough's, and it went with the steps. Whatever teaches
  next inherits that debt along with the harness debt already written down.
- **`pickingSlot` and `skillsDepth` were `GuideCtx` and nothing else.** Two
  exported accessors with no other reader, which is what an interface built for
  one consumer looks like once the consumer goes.

- **A `<canvas>` is a REPLACED element, and `inset: 0` does not size one.**
  With `width: auto` it lays out at its own backing store — the viewport times
  the device ratio — so a full-screen canvas painted correctly showed its
  top-left quarter and the title's two worlds read as one with a stain in the
  corner. `width: 100%; height: 100%` is the fix, and the same trap waits for
  any `<img>` or `<video>` positioned that way.
- **Two palettes over one grid is the whole of a map that changes world.**
  `tileDecals`, `livingDecals` and `floorColour` all take the `FloorPalette` as
  a PARAMETER, so drawing half a picture as one theme and half as another cost
  no change to either renderer and nothing in `src/sim`. The mixing lives in
  `src/ui/titleart.ts` and stops there: a `GameMap` still carries one theme.
- **A screen of stone is two frames, once.** 77×49 tiles at a device ratio of 2
  paints in 30–38ms in headless Chromium with no GPU — measured over three
  boots. Cheap enough that the phase's fallback to a still image was never
  needed, and cheap enough that the answer to a resize is to paint it again.

- **`heal()` drops a wallet entry that is not a `CurrencyDef`**, which is
  exactly what a boss key is. The rule that keeps a key off the bench is the
  rule that deleted it on every load until `heal` learnt the second table. Any
  future thing counted in the wallet has the same shape.
- **The dev preset holding every DOOR closed the room it was meant to open.**
  `game.bosses` is what stops a boss being scheduled twice, so handing the kit
  every id meant the Lambengolmor was never scheduled at all. The kit gets the
  keys and the doors both, and the test that walks the schedule clears them.

- **A room that goes live may not end through `finish()`.** Routed there, a
  cleared boss room took the chain-another-descent branch and dropped into a
  hole with nothing at the bottom: a frozen screen with no way off it. A room
  ends in its own terminus, and `sceneWaiting` is asked at the end of a DESCENT
  only, or a room hands you straight into the next room.
- **A bubble anchored to a body you can walk cannot be clicked.** Playwright
  refuses a target that will not hold still, and a player has the same problem
  with a slower version of it. The anchor is frozen per BEAT and follows the
  camera instead, which is the case the phase actually named.
- **A boss whose adds never arrive is a mechanism that does not exist.** At the
  life the phase's numbers implied, the thing died in two seconds and the
  reinforcement clock never fired once. Balance is not tuned, but a number that
  makes a mechanism unobservable is not balance — it is the mechanism missing.
- **A scene skips `spawn()`, and `spawn()` was where a kill's PRICE was set.**
  A boss room paid nothing at all until `priceKills` came out of it. Anything
  else that only a descent runs is worth checking for the same shape.

- **A rule for a FIXED element loses every specificity tie to the class it
  shares markup with.** `.modal__card` is one class and sets a width, so a card
  that wants its own needs two. The bubble was dropped back into the flow at the
  foot of the page by exactly this once already.
- **A scene needed the panel restyled, not replaced.** `#met` keeps its markup
  and its `met-take` id, and became the LAST beat by anchoring the same way the
  bubble does. Nothing about the handover moved.

- **A scene needs no rng, and the phase asked for one.** The trap said to feed
  `sceneMap` the run's seed or the props would move; with an absolute plan and a
  cut hashed off the tile it lands on, a room is the same room every time by
  CONSTRUCTION, which is stronger than seeding it. A parameter nothing reads is
  a parameter that lies about what varies.
- **The first map smaller than the screen found a camera bug three years of
  descents could not.** `viewW()` was `renderer.width / resolution`, which at a
  device ratio of 2 is half the real view — invisible for a descent, because a
  descent overflows the view and clamps against its edges, and glaring for a
  room, which centred itself in a quarter of the screen. `renderer.screen` is
  the accessor that cannot be wrong.
- **The climb out plays for the rest of the handover, so the branch at the
  bottom of the hole runs every frame of it.** `launch()` and `land()` both
  clear their own trigger; a room does too, and then has to say it is already
  in one or the next frame launches a descent on top of it.
- **A room's report is the DESCENT's.** `renderResults` reads a `RunState` for
  the loot, and the scene is a different sim with nothing in it. The state is
  held beside the report rather than taken from `sim` at the end.

- **Widening a Spread is worth nothing on its own.** The first version of
  Scattershot only granted `spreadRange: 1.6`, and the demo's "every notable
  changes the cast" check failed it flat: with 1–4 extra Projectiles there are
  almost always that many enemies inside the bare 3.5 tiles, so a wider radius
  never changes which enemies are picked. It needed `spreadFar` — turn the pick
  around — before the wider radius bought anything at all. Any future "reaches
  further" node on a picker with a target CAP has the same hole in it.
- **A keyword has to be shown where the word is, not behind a second hover.**
  `.tip` is `pointer-events: none`, so a glossary that needed hovering the word
  inside a tooltip was never possible. Marking the word and printing the
  definitions at the foot of the same card is not a compromise: it is the only
  version that works on a phone.
- **The vocabulary pass cost the extra-Projectile falloff.** Making Split Cast
  full damage retired `extraTargetDamage`, which retired Focused Volley, which
  is why the Salvo branch has a new third notable. A keyword that promises a
  thing is thrown has to promise it lands, and a notable existing only to undo
  a falloff was the tell that the falloff was one number too many.

- **Adding an element to every monster did not change what a modifier is
  worth.** "of Cinders" always multiplied a hit by (1 + share/100) and still
  does; only the SPLIT moved. Dropping its `DANGER_STATS` weight from 0.9 to 0.6
  on the assumption that added damage is softer than a conversion flattened the
  reward ladder until band 6 paid no more than band 5, which the existing check
  caught within one run. Weigh a stat by the arithmetic it does, not by the
  story about it.
- **A pack's element is rolled per PACK, not per monster** — the phase asked for
  per monster and the code already said why not, in `RANGED_PACK_CHANCE`'s own
  comment. Mixed packs read as noise.
- **The node-pair audit was 742 pairs and could not be written.** It is 28 once
  it is done over grant CLASSES (`GrantDef.changes`), which is the altitude the
  codebase already works at — a node is a bag of switches. And the answer it
  produced is that NOTHING needs blocking: every pair composes, Rupture's burst
  under Blight's cloud tree included, which is a trade its own card already
  names. The refusal mechanism shipped anyway, unused and tested.
- **Five notables, not "about five".** Twenty nodes alternating minor and
  notable over ten points makes five the CEILING and not the average: a spoke's
  prefix of odd length wastes its last point on travel, so a careless walk
  reaches three. That is the decision the shape hands the player, and the demo
  measures both ends of it over 200 random walks.
- **`buildTree` did not bend.** A trade got a sibling — `src/trades/layout.ts`
  — and what the two share is `src/webgraph.ts`, which is where reach, refund
  and replay now live for any list of nodes. `src/ui/webart.ts` is the same
  answer for the studs.
- **A trade barely moves a kill rate, and that is correct.** Both trades'
  offensive halves are CONDITIONAL — a flask running, a pool with room to
  overcharge — so a flat average across a descent understates a window. The
  demo prints kills a second at the deep end for every trade against every
  skill and asserts nothing about it; whether a pairing is a favourite or a
  requirement needs a wider roster than three skills to tell.

**Where the phases came from.** Two batches of asks, dictated by the user in
one go each, plus a few out of design conversations, plus the vocabulary pass
asked for directly after them. All of them are built. The bracketed numbers in
the git log — [user 8], [user 10] — are the user's own numbering within a
batch, kept so a commit can be matched back to the ask.

**The vocabulary is a place new work lands, and it has landed once.** `KEYWORDS`
covers the three trees, the two movement webs and the two trades. A new skill, a
new trade or a new modifier either uses a word that is already in the table or
adds one — and the demo's `ONE WORD PER MECHANISM` sweep is what makes that not
optional. **Slow** is the worked example: nothing in the game slowed an enemy,
so the landing shockwave added a word rather than borrowing Splash, which is
defined as damage in a circle and would have been a lie. A bow skill saying
"+5 Arc" is the other half of the same case.

---

## The balance pass

**Not a phase, and not started. Documented so that asking for it is one
sentence rather than a re-derivation.**

**Why it is now possible.** `RULES.md` has said since the start that nothing is
tuned until every system is in, because each one hands out more power than the
last and anything tuned before it is thrown away. That list was attributes, then
trades, then jobs — and trades WERE the jobs. Every one of them has landed, so
the reason to lean too easy has expired. Nothing has been tuned to compensate;
the game is deliberately soft everywhere.

**What it would read.** Eight `gauge()` lines in `npm run demo` — measured,
printed, never asserted, and each carrying the figure that was wanted beside the
figure it got. They are the before. Taken with 530 checks passing, after the
Normal pool became six generated bodies:

```
the Seam is -12.6% over the hardest single world    — wanted: same class within 15%
a trade moves the deep-end kill rate 3.85–7.44/s    — no pairing should be the only one
2% to 22% of swings go unpaid                       — wanted: 5%–50%
a starved cast lands for 50% of your damage
a naked character walks out on 66% life             — wanted: under 70%
one blank crystal after the first clear: 24/24      — wanted: above 60%
every band is clearable in gear the band below drops
the deep end: 1253 danger, 8/12 through             — wall under 4/12, ceiling at 0
```

**Several of these moved when the ROSTER did, and that is the reason.** Six
generated bodies with their own stats replaced eleven, and one thrower per
family replaced a quarter of all packs shooting. The blank-crystal rung went
18/24 → 24/24 and the deep end 4/12 → 8/12, so the game got EASIER at both ends
— which is the direction `RULES.md` says to lean, but it is a bigger step than
anything before it and the balance pass should read it as one change rather
than as drift.

The naked character at 66% is the closest of these to its own line.

**What must not break.** Everything in `RULES.md` under "Balance is NOT TUNED"
inverts when this starts, and that section has to be rewritten in the same
breath — it is the file's own statement that the pass has not happened. The one
difficulty check that is a `check()` rather than a `gauge()` — a brand new
character clearing the bare Fissure — stays a failure throughout. And the
per-skill numbers are three skills wide, which the trades phase already found is
too few to tell a favourite from a requirement.

**What it is NOT.** Not a licence to change systems. A balance pass moves
numbers in tables; if it wants a mechanism changed, that is a phase and it gets
written as one.

---

## What the generated zone cost, and what it taught

**This is the part to duplicate, and the part not to repeat.** The Fissure now
draws from a 25-tile generated Wang set shipped whole as a data URI. Six
generations over two rounds got there; most of the session went on the renderer
rather than on the art.

### The generator, as it actually is

**THE MCP TOOL LIST IS NOT THE WHOLE API, and the docs page says where the rest
is.** `https://api.pixellab.ai/mcp/docs` ends with a pointer to
`https://api.pixellab.ai/v2/llms.txt`, and `https://api.pixellab.ai/v2/openapi.json`
is the machine-readable version. Most v2 endpoints ARE the MCP tools under
another name — `/edit-animation-v2` is `edit_image`, and its frame tiers match
what was measured — but one has no MCP tool at all:

- **`POST /transfer-outfit-v2`** takes a REFERENCE IMAGE of an outfit and applies
  it across animation frames, "maintains animation motion while changing
  appearance". That is a reference-anchored reskin rather than a text-prompted
  one, which is the thing `edit_image` cannot do — every batch is anchored to the
  same picture instead of re-imagining the outfit per call. **At 96 it holds
  THREE frames a request** (81-256px is a 2x2 grid and the reference eats a
  slot), so over a body's ~70 frames it is 24 Pro calls and worse economics than
  `create_character_state` plus an animation. **It is the right tool the day a
  look has to land on frames that already exist**, and the wrong one for building
  a look from scratch. `additional_instructions` is where a view hint goes.
- `/interpolation-v2` fills frames BETWEEN two keyframes, 16-128px. Nothing wants
  it today; it is the answer if a 4-frame state ever needs to be 8.
- `/animate-with-text-v3` states the budget the v3 cost scales on:
  `width x height x frame_count <= 524,288`. At 96 that is 56 frames.
- `create_portrait_character(direction='character_to_portrait')` turns a finished
  character into a bust portrait — which is `PORTRAITS` in
  `src/render/portraits.ts`, the grid-48 shoulders-up table every speaker needs.
  20 generations at sizes up to 64. Nobody has spent one; the four speakers are
  hand-drawn.
- `create_image_pro` takes up to **four LABELLED reference images**, each with a
  `usage` note saying what to take from it ("character base", "outfit and
  armour"). That labelling is what makes combining references work at all.

**A tool's cost is the GRID it fills, not the thing you asked for.** Measured on
the account: `edit_image` over one 128 frame is 20 generations and over four is
40, and a rotation is 2. So batching is most of what a piece costs.

- **`create_topdown_tileset` tops out at 21 distinct corner combinations.** 16
  tiles at transition 0/0.25/0.5, 25 at 1.0 — and the 25 are 21 keys plus four
  wall CONTINUATIONS that share their corners with a twin. No prompt, mode or
  shape style changes that. A regen buys a different-looking set with identical
  gaps, so **do not spend a generation trying to fill a missing key.**
- **`transition_size: 1` is what makes a wall a WALL.** The cliff fills the map
  cell BELOW the boundary, so a wall is two rows tall as DRAWN. The old set's
  face was a fraction of a tile and every attempt to stretch it turned its
  rounded columns into fence posts.
- **`shape_style: 'round'` is the one that reads.** The rock reduces to a thin
  dark cliff band and then pure black, so there is barely any rock surface left
  to repeat — which answers the wallpaper problem by REMOVING the surface rather
  than by lighting it. A whole previous session was spent failing to light it.
- **Tone has to be said at BOTH ends.** Four asks came back with the rock PALER
  than the floor, which reads inside out — the eye takes the bright expanse for
  ground and the rooms for holes. A LIGHT floor that is NOT dark and a near-black
  rock that is NOT pale, each excluding the other's colour, is what fixed it.
  `lit_round` ships; `lit_floor` is the same tone with more rock texture and is
  in the file beside it, one word to switch.
- **`standard` mode drew an orange brick dungeon** off a cave prompt. Pro and
  shape_style both stayed in the cave. 
- **The sheet ships WHOLE, as a data URI.** Quantising to a character grid
  bought the runtime palette, and a painted tileset has baked hex and cannot
  have that anyway — so the conversion was all cost. `tools/art/zoneset.mts`
  is `ask` / `get` / `emit`, and `emit` writes `src/render/generated-tiles.ts`.
- **The docs at `https://api.pixellab.ai/mcp/docs` are worth reading and I did
  not until told to.** They say the plain 16 cover ALL corner combinations,
  which is what settled that the gaps are shapes the generator's terrain model
  never emits rather than missing art. That one sentence would have saved two
  wrong fixes.

### Three fixes tried, and only the third was right

Worth writing out because the wrong two are attractive.

1. **Nearest key.** A cell whose corners the set has no picture for takes the
   closest it does. Cheap, and it is still there as the renderer's backstop —
   but it puts a cut face where solid rock belongs.
2. **Quadrant synthesis. WRONG, and it looked right on paper.** A corner tile IS
   its four corners, so build the missing key from quarters of the ones you
   have. Measured on one view with it on and off: it puts thin slivers of FLOOR
   inside solid rock. A quadrant's picture is not decided by its own corner —
   the boundary inside a quarter depends on the corners either side, which a
   corner key cannot say. **Render composited tiles and LOOK at them before
   shipping any scheme like this.**
3. **Fit the CARVE.** `fitCorners` opens rock until every cell is a key the set
   holds. Zero cells drawn off their corners, against 26. Same move `thinRock`
   made, safe for the same reason — opening only ever adds space.

### What the renderer needed, none of it guessable

- **Decode the sheet where the renderer is already awaited.** Sliced on first
  use, the draw runs before the image has loaded and the entire floor is
  silently missing.
- **The four twins are told apart by `pattern_4x4`, and those rows are CORNER
  values one row out** — not the cell's tile type. Read wrong, the wall's lip
  tile lands anywhere, and a lip repeating down a face is a pale line running
  up it.
- **The cut face moved.** The old set drew it in the rock cell; this one fills
  the cell below the boundary, so the face is the FLOOR tile with rock over it.
  Anything hanging on the face moved a row with it — `dressWalls`, the demo's
  `face` predicate and the shrine's own wall row.
- **The two LANDMARKS survive `bare`.** Every other decal stands down, but the
  entrance and exit have to be findable. And `mouth` takes darker inks there: a
  hole reads by CONTRAST, and the rim that stood out on dark stone is a white
  box on pale sand.
- **`fitCorners` must hold the rock a hand-placed prop hangs on**, or it opens
  the wall under a torch and leaves it on air. And it may only open a cell
  TOUCHING floor — allowed anywhere it punched 50 unreachable pockets into the
  middle of the stone.

### What it cost that is not code

- **The runtime palette, for this zone.** Every other pixel takes its ink from a
  CSS property at draw time, which is what makes a zone recolour for free. A
  painted tileset is baked hex. Four zones will be four generated sets, not one
  set with four palettes.
- **A little rock.** `fitCorners` opens about 40 cells in 2700, so Fissure maps
  are marginally more open than they were. It only ever opens, so nothing can be
  walled off.
- **One demo check, which was underpowered rather than wrong.** A Bleed on every
  hit is worth about 1% of a clear and the check sampled five seeds: at five it
  reads 0.3% the WRONG way, at twelve 0.5% right, at twenty-four 1.0%. Moving
  the carve reshuffled which five maps those were. It measures 24 now.

### What the deleted work found, kept because it is about the LOOK

The two-tile wall, the lightmap, the chasms and every drop rule were deleted at
the user's instruction (`83b8488`). These outlived them:

- **A per-tile tint is a BAND, never a gradient**, and every falloff one can
  express is a staircase of flat rectangles.
- **A drop needs the wall tile placed ONE ROW LOWER than it is keyed** — the
  same picture that reads as a wall standing up under rock reads as a wall going
  down under ground, and a pit's flanks are that tile turned a quarter. If
  chasms come back, that is how, and it is written up at `56d599a`.
- **Uniform density is NOISE; texture is density that VARIES.** `COVER_RATE` is
  indexed by distance from the rock, which is what makes debris drift at a
  wall's foot rather than read as confetti.
- **Nothing a PERSON left is scattered.** A room's worth of objects dropped one
  tile at a time reads as exactly that at any rate.

### The process, as it now stands

**This is the part to duplicate, and it is written to be executed by a session
that remembers none of this.** Run end to end three times now — a zone, a
throwaway body, and the three skeletons that ship. Every step is a row in a file
rather than a change to code.

**The order is DESIGN → APPROVE → ROTATE → ANIMATE → JUDGE → IMPORT → WIRE, and
the order is the whole trick.** A design is one generation and thirty seconds; a
rotation is two; a full body is thirty. Judging AFTER the rotation — which is
how the first four bodies were made — means a body nobody likes costs thirty
instead of one. Three things settle at the design step and NOWHERE else: the
silhouette, the proportions, and the tone.

**Two files hold a body and neither is code.** `tools/art/bodies.json` is what
to SAY — `look` is the design ask, `states[].say` is one animation ask each —
and `tools/art/generated.json` is what came BACK, one row per body naming its
character and a group per state. `tools/art/body.mts` walks between them.

#### 0. Before anything

`PIXELLAB_API_KEY` must be set; `.mcp.json` expands it and `tools/art/mcp.mts`
speaks plain JSON-RPC to `https://api.pixellab.ai/mcp`, so a session with no MCP
client for it is not blocked. **Read `https://api.pixellab.ai/mcp/docs` first.**
Two sessions in a row have failed by not reading it, and both failures were
parameters sitting in plain sight. `get_balance` prints what is left.

#### 1. Write the ask into `bodies.json`

Off the game's OWN documentation: `MAP_THEMES` gives a zone its line, `THEME_INK`
its hexes, `CUT` how it is carved, `MONSTER_FAMILIES` what lives there. A generic
prompt gives generic art; the Fissure's own sentence gives the Fissure.

- **Name a colour by EXCLUSION as well as by name**, and exclude the whole
  family: "dark bone" got ivory until `NOT tan, NOT beige, NOT sand, NOT gold,
  NOT amber, NOT bronze, NOT warm` went in. But exclude only what you mean —
  `NOT red` killed the blood entirely, where `NOT bright red, NOT pink, NOT
  crimson, NOT magenta` left the dried rust-brown that was wanted.
- **Forbid the GROUND and any second object by name.** Bodies drew themselves a
  dirt patch, a blood pool and a spare skull. Say: no ground, no floor, no
  shadow cast on the ground, no base, no platform, no other objects.
- **Say the proportions.** "SMALL skull on a long thin neck, the proportions of
  a tall adult man, NOT a big head, NOT chibi, NOT a bobblehead."
- **No two of a body's `say` strings may share their first 30 characters** — see
  the pitfalls below. `body.mts` refuses the file if any do.

#### 2. DESIGN — one image, one generation, ~30 seconds

`create_image_pixflux` with `no_background: true`, `view: 'high top-down'`,
`direction: 'south'`, `width`/`height` 128, `text_guidance_scale: 12`. Ask for
several concepts at once and several variants of each; they are a generation
apiece.

**`color_image_url` takes a forced palette as an image and a `data:` URI is
accepted.** It is the ONLY thing that made a body dark — words alone returned
ivory twice, and v3 ignores `text_guidance_scale` so there is no harder push.
Build a strip of the inks you want and pass it. Every zone floor is pale by
decision, so a body that is not dark separates from none of them.

The palette buys tone and costs some drama: the same ask on words alone had a
better pose and the wrong colour. Judge both.

#### 3. APPROVE

Put the candidates on the four real zone floors, magnified. `npm run peek` is
for a map; for a sprite, lift a floor tile out of
`src/render/generated-tiles.ts` (the tile whose `key` is 0 is pure floor) and
put the sprite on it. **Nothing below this line is cheap, so nothing below it
starts until a human has said yes.**

#### 4. ROTATE — two generations, ~5 minutes

`create_character` with `mode: 'v3'` and the approved PNG as
`reference_image_base64`, `size: 96`, `view: 'high top-down'`.

- **`mode` decides the body.** `standard` is the default and is template-based:
  ONE rigged skeleton posed over and over, so every body it draws shares a
  silhouette whatever the words say. That is why three asks came back as one
  skeleton in three colours.
- **`size: 96` and not the design's 128.** 96 is the grid a body ships at and
  the camera lands one in ~87 device pixels; at 128 every animation costs TWO
  generations per direction instead of one, for detail nothing draws.
- Look at the five facings before going on. Height and identity survived the
  rotation here, but that is not a promise.

#### 5. ANIMATE — five generations a state, ~3 minutes each

`npx tsx tools/art/body.mts fill <sprite>` once `generated.json` names the
character. It asks ONE facing at a time into the same animation group, paced off
`list_jobs`, and retries a refusal.

- **`mode: 'v3'` from a written pose, never a template animation.** Templates
  pose a rigged skeleton and drift: `walk` grows a crook, `cross-punch` turns to
  face the camera. v3 is the only mode with `frame_count`.
- **"in strict side profile" is the highest-value phrase there is** — without it
  the skull turns to face the camera by frame three. It may NOT open the
  sentence; see the pitfalls.
- **Describe the LIMBS, not the tool.** Naming a weapon the rotation does not
  hold draws a different one every frame. **And an ask that names no limb only
  works in SIDE PROFILE**: the hero's walk said "a tired trudge, head down, rags
  swaying at the hem" and came back a real stride on east and a standing pose on
  the other four, so he slid everywhere but east and west. Name the leg swinging
  past the other, the knee lifting clear, the opposite arm swinging with it.
  `npm run demo` prints how far each walk moves per facing and is the only way
  to see it — the frames are all there, all distinct and all reached.
- **Short animations drift less.** `frame_count: 4` lands usable where 6 needs a
  window.
- **Five facings, not eight.** `GeneratedArt.dirs` runs north to south and the
  renderer mirrors anything facing left. Generating the western three is paying
  twice for the same pixels.

#### 6. JUDGE — free

`body.mts sheet <sprite> out.png` draws every animation, one row each, and LOOK
at it. A generation degrades across its run and the tail is where it goes, so
each state names `from`/`to` — the fraction worth keeping — in
`generated.json`. This is hand-work and there is no way round it.

#### 7. IMPORT — free

`npx tsx tools/art/tables.mts bodies` reads `generated.json`, fetches the
frames, quantises each body to its own 56-ink palette and writes
`src/render/generated-art.ts`. It asks the generator for no generations.

**Name the table.** `tables.mts` with no argument writes all three, and one dead
row then stops the other two being written at all.

#### 8. WIRE — free

A row in `MONSTERS` in `src/data.ts` naming the sprite, at `scale` 1.45–1.6
rather than the doll's 1 — a generated body spans about 69% of its grid where
the doll spans nearly all of 24. Then `npm run demo`, which holds that every
monster resolves in exactly one art table, that no frame ships unreached, and
that a swing and a cast draw different runs. Then `npm run build` and
`npm run peek` and look at it in a descent.

#### 9. DRESS — only for a body that wears things

**Only the HERO wears anything**, and he wears his TRADE rather than his gear,
so a look is a whole body and this is not part of a monster's run.

```
npx tsx tools/art/body.mts  grab   <sprite>                 the base rotations
npx tsx tools/art/dress.mts <look> --state <character-id>   every rotation dressed
```

`create_character_state` applies ONE edit across every rotation of a character
for one 20-40 charge, keeps identity, body type and proportions, and hands back
a character that INHERITS THE SKELETON, so it animates like any other. That is
what makes a trade look 40 generations rather than a second body: every look is
the same man in different kit and none can drift into being somebody else.

It is also the ONLY tool that dresses a whole body consistently. `edit_image`
takes a list of frames and is billed by the grid, which reads like the cheaper
answer and is not — a call holds 4 frames at 96, and **what one call produces
does not match what the next one does**. See the pitfalls.

`OUTFITS` in `dress.mts` is what to SAY for each look, and `KEEP` is the clause
that dresses the man rather than replacing him — 97.4% silhouette overlap with
the base, holding stance, belt, pouch and feet.

Then animate the STATE, judge, import and wire exactly as steps 5-8, and the
look is a row in `GENERATED` like every other body.

### Doing this a thousand times

**The pitfalls that cost real time here, in the order they will bite.**

- **THE DOCS HOLD TOOLS NOBODY HERE KNEW ABOUT, and they change the plan.**
  `create_character_state` (an edit applied across every rotation, keeping
  identity), `edit_image` (one edit across a LIST of frames, billed by the
  grid) and `inpaint_image` (everything outside a mask stays pixel-identical)
  are all in `https://api.pixellab.ai/mcp/docs` and none was used for the
  monsters. **Re-read that page before designing a pipeline**, not just before
  spending — this is the third time it has held the answer.
- **`edit_image` IS CONSISTENT WITHIN A CALL AND NOT ACROSS ONE.** Five facings
  of one man asked for one helm, same description, same seed, split 4 + 1
  because that is all a call takes: the four came back wearing one brimmed helm
  and the fifth came back visored. So the "one edit across a LIST of frames"
  promise is real but it stops at the call boundary — **anything that must match
  has to be in the same call, and a body's frames never fit.**
  `create_character_state` is the way round it and the reason it exists.
- **HOW MANY FRAMES A CALL TAKES IS A STEP OF THEIR SIZE**, measured by asking
  for 64 of them at each size and reading the refusal: **16 at 64 and under, 4
  up to 128, 1 above it.** The grid is 512x512 laid out 4x4, 2x2 or 1x1. The
  server refuses an over-long list BEFORE billing and names the number, so
  probing this costs nothing at all — and the billing follows the grid rather
  than the count, measured at 20 generations for one frame and 40 for four.
- **A MULTI-FRAME RESULT IS ONE INDEXED DOWNLOAD.** `get_image` answers
  `frames: 4` and a single `download:` url, and frames 1..n are reached by
  appending `?index=N`; a single-frame job carries no index at all. Looking for
  a url per frame finds none and reads as "never arrived" on a job that
  completed and billed. Both forms are one regex and both must be handled.
- **A ROTATION'S SIZE COMES FROM THE REFERENCE IMAGE, not from `size`.** The
  wanderer was rotated with `size: 96` off a 128 design and came back 128x128.
  That matters three times over: at 128 a v3 animation costs TWO generations per
  direction rather than one, a body is **1.78x the source** it would be at 96,
  and a `create_character_state` of it inherits the size for good. **`body.mts
  rotate` resamples the design to `size` before sending it**, which is the fix;
  the re-rotation cost 2 generations and came back 96x96.
- **THE SOURCE SIZE IS NOT THE WALL, and this file said it was for months.**
  Measured: `generated-art.ts` is **0.48 MB for TEN bodies** — 33-52 KB each at
  grid 48, 120 KB for the Gaunt at grid 96 — and `docs/app.js` is 1.62 MB, 0.43
  gzipped. The **4.67 MB for six** and **0.8 MB per body** written here and in
  `RULES.md` are from the era when every body was grid 96, and a body's cost is
  its grid SQUARED times its frames, so re-gridding to how big a body is DRAWN
  cut it fourfold and nobody re-measured. Twelve more bodies is about 0.5 MB,
  not 14. **The generation budget is the real cost** — measured at 203 for
  three bodies. Nothing about "no binary assets" is under pressure.
- **A body costs ~68 GENERATIONS, not the ~30 this file used to say.** Measured
  over three: 203 generations for 9 designs, 6 rotations, 15 single-facing
  animations and 60 fills — 90 calls, because a v3 animation is more than one
  generation apiece. Budget by CALLS and you are out by a factor of two.
- **The job limit is TEN, per ACCOUNT, and a call needs one slot per DIRECTION
  all at once.** A five-facing ask needs five free slots and is refused whole.
  Pacing off one character's pending count works until a second body is in
  flight and then fails constantly. `list_jobs` is the only authoritative
  count. Ask one facing at a time.
- **A refusal is TEXT, not an error.** `error: need 5 job slots but only 1
  available (9/10 used)` and `already queued or complete (nothing re-queued)`
  both come back as a normal tool result. Anything that does not check the
  response for a group id is recording a lie — nine animations vanished that
  way in one run and were only found by counting groups afterwards.
- **`animate_character` dedupes on the FIRST ~30 CHARACTERS of the action
  description.** The group carries `[type=custom-<the first 30 chars>]`. Every
  attack, cast and death opened with "staying in strict side profile" and
  collapsed into one. Keep the phrase, put it after a clause of the animation's
  own, and assert the prefixes are distinct before firing.
- **A generated CHARACTER is not permanent.** The docs say characters are stored
  permanently. The skeleton, the revenant, the delver and every generated PROP
  this repo shipped all came back `not found`. What ships is the converted grid,
  so no art was lost — that is the argument for the conversion step — but
  nothing on the server can be re-converted or extended, and a body you may want
  to add a state to later must be finished while it still exists.
- **The wall clock is the budget, not the generations.** A body is ~30
  generations and most of an hour: animations are 2-4 minutes each and pace
  against the job limit. Twelve bodies is a day of waiting, not an afternoon.
  Queue in the background, hold the ledger on disk, and make every step
  idempotent — a run WILL be interrupted.
- **Keep a ledger of every id, on disk, as you go.** Character ids, group ids,
  job ids. A body whose character id is lost is a body that has to be paid for
  again.
- **The demo is the backstop and it is not optional.** It fails a frame that
  ships unreached, a sprite id in both art tables, a state named for a skill
  nothing throws, and a body still being moved by a transform it has frames
  for. Every one of those is a silent fault in the renderer otherwise.

**What asking for a REAL zone taught, on the second pass.** The first tileset
was a generic mine shaft; the second was written off the Fissure's own line in
`MAP_THEMES` — "a working somebody gave up on. Rotted props, webs, a candle
still going" — plus its `THEME_INK` hexes and its `dug` cut. That is the ask
that worked, and these are what it cost:

- **Naming a hex does not get you the hex, but naming what it is NOT does.**
  "Cold desaturated grey-brown around #4F4941" came back olive-khaki. Adding
  "NOT olive, NOT khaki, NOT yellow, NOT green, NOT sandy brown" is what
  actually moved it. Describe the colour by exclusion as well as by number.
- **`mode: 'pro'` with `raggedness` is what makes rock look DUG.** The standard
  pipeline draws coursed masonry whatever the prompt says, which is a wall
  somebody BUILT — the opposite of what `CUT` means by `dug`. Pro at
  `raggedness: 0.85` gives broken irregular stone and a real cut face.
- **A `transition` becomes a bright RIM if you let it.** "Pale rock dust banked
  at the foot" was drawn as a white hairline round every rock, which reads as a
  UI stroke rather than as stone. `outline: 'lineless'` does not stop it — the
  rim is the transition. Ask for the boundary as a shadow, or set
  `transition_size: 0`.
- **Props do NOT inherit the style you hand them.** `create_map_object` takes a
  `background_image` for style matching and all six still came back warmer and
  more 3/4-projected than the top-down floor under them. `background_image` and
  `inpainting` are both JSON **strings**, not objects — passing an object is a
  validation error, and that is not in the schema's own types.
- **Six objects at once is a rate limit.** ~15-30s each and roughly five in
  flight; the sixth came back `rate limit exceeded` with a hint to wait.

**What asking for real ANIMATION taught, on the third pass.**

- **A template animation is a lurch; `mode: 'v3'` with an `action_description`
  is an animation.** The templates pose a rigged skeleton and drift: `walk`
  grows a crook, `cross-punch` turns to face the camera, `fireball` flickers a
  shield in and out. v3 from a written pose does none of that, costs 2–3
  generations rather than 1, and is the only mode with `frame_count`.
- **Naming a weapon the rotation does not HOLD invents a different one per
  frame.** Asking a bare skeleton to "raise a pick overhead" drew a floating
  crescent in two places at once. Describe the limbs, not the tool.
- **"Staying in strict side profile" is worth saying out loud.** Every ask
  without it turned the skull to face the camera by frame three, which reads as
  the body rotating mid-swing. It is the single highest-value phrase found.
- **Short animations drift less.** The degradation is at the TAIL, so
  `frame_count: 4` lands usable where 6 needs a window.
- **The ten-job limit is per ACCOUNT, not per character, and a call needs one
  slot PER DIRECTION all at once.** Pacing off one body's pending count fires
  straight into it the moment a second body is in flight — which is what
  refused five animations here, in text rather than as an error. `list_jobs` is
  the authoritative count, and `body.mts fill` asks for ONE facing at a time
  into the same group: the pipe stays full and a refusal costs one facing
  instead of five.
- **A generated CHARACTER is NOT permanent.** The docs say characters are
  stored permanently; the skeleton, revenant and delver this repo shipped all
  came back `not found`, along with every generated PROP. The converted grid is
  what ships so no art was lost — but nothing on the server can be re-converted
  or extended, which is the argument for the conversion step rather than an
  argument against it. `tables.mts` writes one table at a time now.
- **`animate_character` dedupes on the first ~30 CHARACTERS of the action
  description**, not on the whole of it: the group carries `[type=custom-<the
  first 30 chars>]` and a second ask matching that prefix is refused with a hint
  rather than an error, which reads as success. Nine of nineteen animations
  vanished in one run because every attack, cast and death opened with "staying
  in strict side profile" — the highest-value phrase there is. Keep it, put it
  AFTER a clause of the animation's own, and assert the prefixes are distinct
  before firing.
- **`delete_animation` keys on the TYPE, not the display name**, so a re-roll
  under the same name leaves two groups standing. `sandbox.json` therefore
  names a group by UUID; a name picks whichever the server listed first.
- **A GARMENT is the first thing a tail loses.** The revenant's cape vanishes
  entirely by the last frames of its walk and its fire bolt, leaving a bare
  skeleton — so a body whose silhouette IS a piece of cloth wants a tighter
  window than a bare one.
- **`fill` is not idempotent unless it is made to be.** The rate limit answers
  with a hint rather than an error, so a fan-out routinely lands some facings
  and not others — and a re-run is refused, because the dedup is on the
  DESCRIPTION and ignores which directions are actually stored. `body.mts fill`
  now reads back which facings each group holds, asks only for the rest, and
  re-asks with the description punctuated differently when it is refused.

**What was paid for in this session and is not guessable.**

- **`makeSheet` drew a fixed three frames per sprite.** Every index past the
  second fell through `frames[frame] ?? frames[0]` to the standing pose, so a
  generated body's swing and cast NEVER drew — what looked like an attack was
  `drawEntity`'s lunge transform with nothing behind it. It is `framesOf` now,
  and the demo holds that nothing asks for a frame past the ones drawn.
- **A generated body is drawn at its OWN grid, not `CELL`.** The camera lands
  one in about 87 device pixels, so 256 was already downsampled before anybody
  saw it — and at five facings it is a canvas per frame at four bytes a pixel.
  `GRID` is 96 for the same reason. Pixi scales by the texture's own width.
- **The walk cycle was read off the CLOCK, so the feet skated.** At a fixed
  frame rate a body covers two tiles a stride, and what that reads as is
  moving too fast — the speed itself was fine. `Entity.walked` is ground
  covered and `STRIDE` is tiles per frame, so a run is a run and a walk is a
  walk out of one number.
- **The lunge and the bob are TRANSFORMS standing in for frames.** Over a body
  that has its own swing they are a second motion fighting the first, which is
  exactly the shove-the-model-forward look. `animates` asks whether there are
  frames for what the body is doing, and the demo fails a generated body that
  is still being moved by one.
- **The wire cost of facings is small and the SOURCE cost is not.** Ninety
  frames is 980KB of strings that gzip to 80KB. The repo carries the 980KB.
- **A Wang set is ONE picture per corner combination**, so an open floor is
  that picture in every cell and reads as graph paper. Two things fix it and
  neither invents geometry: turning and mirroring the two UNIFORM masks, which
  carry no direction (no other mask may — rotating one makes a tile for a
  DIFFERENT mask), and ALTERNATES off more sets of the same terrain, chained
  on `lower_base_tile_id`.
- **Chaining does NOT make two sets match.** Off one base tile they still came
  back 16 and 5 points apart in mean brightness, and mixed per cell that reads
  as a checkerboard — worse than the repetition. `tone`/`retoned` in
  `sandbox.mts` move each alternate onto the first set's mean AND spread per
  channel, which is what makes three sets read as one floor.
- **`create_topdown_tileset` does not take the same enum values `art.mts`
  uses.** `outline` is `single color outline` (not `single color black
  outline`) and `detail` is `highly detailed` (not `high detail`).
- **`view: 'high top-down'` does not get you top-down.** It is the DEFAULT for
  `create_map_object` and every prop still came back 3/4-projected, reading as
  furniture from a different game standing on the floor. Saying "seen from
  DIRECTLY ABOVE looking straight down" in the description is what moved it,
  and it is worth saying in capitals.
- **A prop lands warmer and more saturated than the stone whatever the ask
  says.** `PropSpec.tone` pulls it toward the ground's own mean and spread —
  0.4 by default, which settles it into the scene, and 0.1 for the candle,
  because a flame pulled to grey stops being one.
- **The NOUN is the prior, and it fights you.** "altar" draws a tidy ziggurat,
  "ritual circle" a stone medallion, "a dead miner" a modern man in denim and a
  hard hat. Describing the SHAPE and the MATERIAL and naming nothing — "one
  slab laid flat across two boulders" — is what got the thing asked for. The
  sigil never came, over three passes, and was dropped.
- **"Blood" comes back BRIGHT PINK** however dark the words are, until the
  exclusions name the colour: NOT red, NOT pink, NOT crimson, NOT magenta.
- **`transition_size` past 0.25 is a different tileset**, not a deeper one: 25
  tiles, a third corner value, and a cliff that spans two rows. Worth it — the
  face was a seventh of a tile and read as a kerb — but three sets each traded
  the floor's quality for the wall's.
- **The set's own shadow tile is a flat rectangle**, and a run of them along a
  wall reads as paving laid at the foot of it. Darkening it in the importer
  made it worse, not better: a blacker rectangle is still a rectangle. It is
  not drawn at all now (`wangShadow`), and the wall's shadow is one row of
  floor tint. Which killed `tileset.shade`, `darkened` and `isShadowRow`.
- **The light had to stop being a TINT.** Every falloff a per-tile tint can
  express is a staircase of flat rectangles, and against a ragged room edge
  that is a field of grey boxes — which is exactly what it looked like.
  `lightMap` writes one texel per lattice corner and lets the GPU interpolate;
  the wall's shadow then costs nothing, being the rock's own dark bleeding half
  a tile onto the floor. A texel is a colour, so `GLOW_PROPS` fell out of it
  for free: a torch warms its corner of the room.
- **The corner mismatches were a FALLBACK, not a missing tile.** A generated
  set answers 21 of the 81 keys and the old fallback read the cut face as floor
  and then as rock, which for two of them landed on plain ground — a bare
  square between two cliffs. Scoring every key the set holds, with the cut face
  one step from either terrain and floor three from rock, fixed it without a
  generation.
- **A drop-off is the ground STOPPING, and everything soft ruins it.** Three
  goes: the lightmap blurred the edge into a shadow, then skipping the void's
  tile made a black square, and what works is drawing the tile from the same
  set and fading it — the tile IS the interlocking edge. A void also has to
  take no part in the light's blend or the floor fades out at its own rim.
- **Uniform density is NOISE, and it took three rounds to see it.** Cover at
  one rate over every tile is confetti; the fix is the SAME fix as the tile
  repetition, arrived at from the other side — the density has to vary. Indexed
  by distance from the rock it drifts at a wall's foot and leaves the open
  floor nearly bare, and that bare floor is what lets anything else read.
- **A room's worth of objects dropped one tile at a time reads as exactly
  that.** Two rounds of tuning a fringe-and-open-floor scatter, and it was
  never going to work at any rate. It is deleted. Scattering is for what the
  ROCK does; what a person left is an arrangement or is placed by hand.
- **A tile set's repetition is answered UNDER it, not by it.** Light helps and
  a second set does not, but what actually kills the pattern is a scatter of
  loose stone over the whole floor, drawn as one pass beneath the furniture.
  Each scrap shifted off its own colour and size, or the scatter is the graph
  paper again at a different scale.
- **A generated prop is POLISHED** — specular highlights, hard contrast — and
  at half a tile that reads as plastic rather than as stone. `tone` toward the
  ground's spread plus `dull` toward its own luma is what settles one.
- **Asking for a random scatter gets a GRID.** "A dozen chips spread apart"
  came back as a tidy 4x4 lattice. It took NOT a grid, NOT rows, NOT columns,
  NOT evenly spaced, NOT a pattern — and saying the scatter is UNEVEN and MESSY
  in as many words.
- **A corner Wang set cannot draw stone one cell thick.** A corner is rock only
  where four cells round it are, so a one-cell finger has no rock corner in it
  anywhere and comes out as cut faces with nothing between them — the wall
  melting into the floor. It is a GEOMETRY fix, not a tile one: `thinRock` cuts
  that rock back after every carve. Nothing in a set can answer it.
- **A wall has to be TALLER than one tile.** A generated set draws its cut
  face one tile high; a body is rendered at one and a half, so the wall read as
  a kerb and every prop looked oversized against it. The fix is in the drawing
  rather than in the set — the bottom row of a wall run is stretched up over
  the rock behind it, which is a surface nobody stands on.
- **An id in BOTH prop tables is drawn twice.** `bones` is in `PROPS` (the
  ossuary's, hand-drawn) and in `PROP_ART` (the sandbox's, generated), and the
  hand-drawn pass was still running over a generated map — a pale rectangle
  across every bone pile that could not be found in the art, because it was
  not in the art.
- **Every remaining tileset problem was answered with LIGHT.** The stone came
  lighter than the floor and read as masonry; the floor was one picture over
  the whole map. `ROCK_TOP` / `ROCK_REACH` / `GRAIN` in `pixi.ts` — a lit rim
  over dark and smooth value noise across the floor. Cheaper than any
  generation, and it fixed what four sets could not.
- **A per-tile tint is a BAND, not a gradient.** Three tiles of falloff along
  an irregular room edge is a chequerboard of flat rectangles — the exact
  fault the alternates and the rotation were rejected for, arrived at from the
  other direction.
- **A wide floor STAIN cannot be generated.** `pool` and `circle` came back as
  discs — round, centred, edged, an object lying on the ground — through every
  wording tried, at two sizes. Three small stains on touching tiles make an
  outline nobody drew, which is what `butchery` is.
- **A body lying FLAT cannot be generated either.** Three passes at `husk`,
  each one a figure standing up and facing the viewer, whatever "lying FLAT on
  its front, seen from DIRECTLY ABOVE, the soles of both feet showing" says.
  Dropped; `cocoon`, `ribs`, `bones` and `skulls` carry the dead.
- **The small props are where the noun fights hardest.** At 96px a chip
  scatter came back as one round pile, a rock stub as a teal crystal, a
  ribcage as a magenta centipede, mould as red-and-white toadstools on grass.
  A SMALLER canvas (64) plus exclusions naming the colour got three of the
  four; the fourth took abandoning the noun entirely — "a crust clinging FLAT
  to stone" rather than any kind of mushroom.
- **Naming a thing gets you ONE of it.** "a scatter of bones" came back as a
  single large skull and "a sheet of cobweb" as a square of cloth. Saying what
  it is NOT, and saying "spread apart with gaps between them / the floor
  visible THROUGH it", is what produced a scatter and a web.

- **An export's colours are not a PALETTE.** Three frames of one body arrive
  with 87–124 distinct RGB values, past the 88 characters a row can use. So a
  generated body is QUANTISED to a palette of its own — the commonest 56, with
  everything else snapped by redmean — rather than to the hand-drawn five.
  `Inks` in `sandbox.mts` is two passes for exactly this.
- **Frames of one body arrive at two canvas sizes.** A template animation comes
  back on the character's own 128 and a v3 one on a 180, so they are centred in
  the larger and then fitted TOGETHER: `fittedTogether` in `convert.mts` takes
  one bounding box over every frame and one transform for all of them. Run per
  frame, `fitted` scales each to fill its own box and the body jitters against
  its own feet on every step.
- **Storage REFUSES the key.** A bearer token on a `backblaze.pixellab.ai` URL
  is a 401. Only `api.pixellab.ai` is told who is asking.
- **Which terrain of a Wang set is the FLOOR is not in the metadata.** The mine
  shaft's `lower_description` says "quarried stone walls" and its `lower` tile
  is the dirt you walk on. The pictures say so and the words do not, so it is
  an argument to `sandbox.mts` and what ships always means "set bit = floor".
- **Three tools now write `src/render/generated-art.ts`** — `sandbox.mts`,
  `import.mts` and `art.mts emit`. `sandbox.mts` is the one to use; the other
  two predate it and will happily overwrite its quantised key with their own.

**What is NOT true any more.** `RULES.md` said `CELL = 48`; it has been 256
since generated art landed, and `drawPixels` samples per DESTINATION pixel, so
the art grid does not have to divide the cell at all. Both are fixed there now.

---

## Phases

**Writing one.** The test is whether a session with no memory of this
conversation could execute it. That takes six things, and the second and the
fifth are the ones usually missing:

1. **What is true today**, named in code — the constant, the function, the file.
   "The shop sells too much" is not executable; "`RECIPES` in `src/data.ts` has
   eleven entries and should have one" is.
2. **Why it is wrong**, in one sentence a stranger would agree with. Without
   this the next session optimises the wrong thing correctly.
3. **Checkboxes that are decisions**, not tasks. "Border by base tier: white
   t1, blue t2, yellow t3" can be done wrong and caught; "improve the tooltip"
   cannot.
4. **Traps** — what a fresh session will get wrong because the codebase already
   has an answer somewhere it will not think to look. Every one of these was
   paid for once already.
5. **Done when**, in one observable sentence. A phase with no stated end is a
   phase that gets half-done and reported as finished.
6. **What must not break**, and which harness proves it, IN THE ORDER to run
   them. `RULES.md` has the table of which change reaches which harness.

Anything you are unsure about goes in Open questions, never into a phase as an
assumption. A phase that guesses is a phase that has to be undone. A decision
taken on the user's behalf is written down as a decision, with what it beat,
so overruling it is one sentence rather than an excavation.

### Before you touch the ladder

**Read this whole section first. It is the part that belongs to no single
phase, and skipping it is how the same thing gets built twice.**

Every one of them is the SAME object with different content in it: a
**scene** — an authored room you arrive in at the end of a cleared descent,
with somebody standing in it who talks to you. It is BUILT, and `RULES.md` holds
the rules it is bound by. Nothing below may introduce a second way of doing any
of it.

**Where the pieces go.** All four exist. Nothing below adds a fifth.

| | | |
|---|---|---|
| `src/scenes.ts` | the types and the registry | as `src/skills-tree.ts` is for trees |
| `src/scenes/*.ts` | one file per room, content only | as `src/trees/*` and `src/trades/*` are |
| `src/game/scenes.ts` | the SCHEDULE: what happens at the end of this clear | as `src/game/crystals.ts` is for gifts |
| `src/ui/speech.ts` | the bubble: a line over the body saying it | one module, one screen |

**ONE scene per cleared descent, and the order is fixed.** Four things can be
owed at the same moment — a crystal, a boss, a corpse to hand over, dust to
trade. `sceneWaiting(game, facts)` in `src/game/scenes.ts` is the
one function that answers what happens next, it returns **at most one** scene,
and everything else keeps waiting for the clear after. The order is:

1. the Lampwright, whenever `giftWaiting` says something is owed
2. the Lambengolmor, when a boss is scheduled or a key was spent
3. whoever wants a relic you are carrying. Rung 3 asks the SCENES table which
   room somebody is holding a relic for rather than naming anyone, so the
   Osteomancer and the Astral-Geometer come through one clause

Highest first, every time, with no interleaving and no roll. `RULES.md` says a
gift is scheduled and never rolled; the same reason covers all four, because a
player who cannot tell what the next clear brings cannot plan the only decision
the game asks for.

`giftWaiting` keeps its name and its job. `sceneWaiting` ASKS it. Nothing about
the Lampwright's own schedule moves in any phase below.

**A room belongs to the SCENE, never to the descent you came out of.** The
Lampwright's workshop is the same workshop every time: `SceneDef.theme` is the
def's, so the rock is some world's rock but the place is a place. Which world a
character is met THROUGH is decided by the trigger — the Osteomancer's corpse
only drops in the Demonic world — and never by the room.

**`src/sim` never decides that a scene happens.** BUILT: the decision is
`finish()` in `src/ui/run.ts`, off `sceneWaiting`, and the sim is TOLD through
`RunOptions.scene`. This is why the whole ladder leaves every headless harness
alone — `runToCompletion`, the ladder grids, the quest timings and the mana
measurements all drive `RunSim` directly and never ask for a scene.

**What does NOT change, and must not be quietly "fixed" into changing.**

- **`SAVE_VERSION`.** Everything the ladder adds to `GameState` is a new key, and
  a missing key takes its default. The version is bumped only when a save must
  be REFUSED, which wipes every player's game. Nothing in this ladder qualifies.
- **The report and the haul.** Every scene arrives AFTER `buildReport` has
  banked the clear, and every ending still lands on the same report and opens
  the same haul. A scene is a reason the loop stopped, never a new ending.
- **Loot is banked before anybody speaks.** That is what makes a meeting unable
  to be a hazard, and it is the reason a scene is on the far side of the hole
  rather than in the room you just cleared.
- **Automation is universal.** No build's power may depend on the player being
  present. The only thing in any scene that can be fought is a boss, and it is
  fought by the shipped policy like everything else.
- **Every number is said out loud, and every mechanism has one word.** Four new
  characters is a great deal of new prose. The demo sweeps modifier lines, quest
  text, currency text and `GrantDef.what` for a `BANNED` phrasing and for a line
  with no digit in it. What a character SAYS is flavour and is out of that
  sweep, exactly as the Lampwright's lines are; what a graft or a key or a boss
  DOES is not.

**The five harnesses this ladder keeps walking into.**

| harness | what it will catch, and it will |
|---|---|
| `demo` | a run that never ends, a container that does not claim its ids, a banned phrasing anywhere |
| `shots` | it WAITS up to two minutes for the SCENE and then for the Lampwright panel, and fails the run if a first descent never produces one. Anything that moves that panel has to move the shot with it |
| `smoke` | it is ORDER-DEPENDENT: a dozen assertions pick a dock item by POSITION, so anything that reorders the dock goes at the END of the file |
| `drag` | 20 seconds, and on a failure it prints what `elementFromPoint` actually hits. Reach for it the moment a new layer stops taking a click |

**Every phase from here puts itself in the dev kit.** `START_PRESETS.dev` and
`DEV_CURRENCY` in `src/data.ts` are how a screen gets opened without farming for
it. A relic — and anything else like one — goes into the dev preset in the same
phase that adds it. A screen nobody can reach is a screen nobody tested. The reading room is the
worked exception and the reason is written down: the dev kit is handed every
crystal, so socketing two of them is the whole of what schedules it, and
socketing two in the PRESET would have changed what a dev game's Fissure is —
which `smoke` asserts about and every screenshot is taken against.

### Phase 1 — A quest log instead of a pointing finger

**Not next, and deliberately.** The tutorial has been deleted outright so the
opening can be PLAYED with nothing explaining it. This phase is what teaching
eventually becomes, and it does not start until that has happened and the
systems have settled — the user's words are "once all the systems are in place
and we see how the intro plays out then we add it in small parts as needed".
Small parts, driven by what actually confused somebody. Do not take this phase
because it is next in the list; take it when asked.

**What is true today.** Nothing teaches anything: `TUTORIAL_STEPS`, the card
and `body.guided` are gone. What that leaves is a game that never prevents a
click and never explains one either.

**Why it is wrong, in the user's words.** *"The whole click here highlighting
stuff works but it feels like a cop out and mobile gamey. Everyone I've seen
play immediately wants to click on things the tutorial doesn't let them."* The
lockdown does not merely fail to help exploration — it FORBIDS it. What is
wanted is the opposite shape: nothing blocks you, and there is somewhere to
look when you get stuck.

**The machinery is already here, and it is most of the job.** `CRYSTAL_QUESTS`
in `src/data.ts` is a table of `{ id, name, detail, need, gives }`; `need` is
clauses ANDed together, `kind` names an entry in `QUEST_CONDITIONS`, and
`detail` is *the objective already written in words*. A new objective is a
registry entry and a table row. What is missing is only: a screen to read them
on, a way for a person in a room to hand one over, and a reward that is not
always a crystal.

- [ ] **A quest log, on the rail like every other screen.** Active quests with
      their `detail`, and what is done. `detail` is the specific instruction —
      the thing you open when stuck — so the dialogue can stay atmospheric and
      the log can say "put a Shard of Making on a socketed crystal".
- [ ] **A quest is GIVEN, in a room.** A `SceneDef` names the quest its person
      hands over, so meeting somebody is what starts one. The existing crystal
      quests are ambient and complete in any order; decide whether they become
      given too or stay as they are, and say why.
- [ ] **`gives` stops being crystal-shaped.** It is `{ level, family }` today.
      A quest that teaches the bench pays a currency, or nothing at all — the
      teaching is the point. Generalise it the way `GrantDef` generalised a
      switch, so a new reward is a table row.
- [ ] **Quest state goes in the save**, and `heal()` drops an id that no longer
      resolves, exactly as it does for items and tree nodes. A quest offered,
      taken and finished is three states, where today a quest is a condition
      that is either met or not.
- [ ] **Nothing may reintroduce a cage.** The lockdown is already gone; a log
      that greys out what you have not been told about is the same cop out in
      a new coat.
- [ ] **Start from what actually confused a player**, not from a list of
      systems. The suspected pair is the bench and the socket — nobody
      discovers "drag a currency onto an item" by clicking about — but that is
      a guess until somebody has played the stripped opening and got stuck.

**Traps.**

- **Teaching has no harness and this phase owes one**: can a fresh character
  reach the first crystal by doing what the log says? `npm run guide` was
  retired and its walkthrough deleted with the steps, so the debt is real and
  it is this phase's to pay. It owes a second one with it: the ids the opening
  needed — `dockSlotId`, `slotButtonId`, `recipeButtonId`, `skillCatId`,
  `skillRowId`, `skillNodeId` — are still minted by the screens that render
  them, and the check that each one resolved went with the steps.

**Done when.** A new character is never prevented from clicking anything, and
a player who stops knowing what to do can open one screen that tells them.

**What must not break.** The demo's quest checks — every quest's clauses must
still be satisfiable, which is the check that already exists and is the reason
this phase is cheaper than it looks.

---

## Open questions

Do not guess at these. **None of them ever blocked a phase**, and none of them
is work waiting to be picked up — they are decisions the user has not made.
Every one is parked deliberately. Ask before acting on any of them.

1. **What the Lampwright wants.** Trades have landed and the placeholder is in:
   anyone may take one up at level 5, and the Trade screen says so in as many
   words. The intent was always a storyline with the Lampwright rather than a
   level threshold — he is the only person in the game and the only voice it
   has. Nothing about it is written: what he is doing down there, what he asks
   for, how many beats it runs, whether it hands out anything besides the trade.
   Replacing the placeholder touches the ACQUISITION only — not the tree, not
   the points, not the allocation — so this blocks the STORY and not the system.

2. **What is the fifth socket?** Wanted as an endgame slot holding something
   that is not a crystal. Deliberately unspecified — the user wants to think
   about it. `RULES.md` says how to keep it cheap to add; nothing else may
   assume it.

3. **Is the Seam meant to be the hardest room, and is it?** `CLAUDE.md` said it
   was, off a check reading 6 seeds. Measured over 24, the Seam sat **0.7%
   BELOW** four Demonic crystals on damage taken per second, and with mana
   removed entirely only 2.0% above — so the ordering was always inside the
   noise rather than a thing the game does. **It is -21.1% now**, after the
   Normal pool became six generated bodies with different stats: still not a
   failure and still nobody's blocker, but the gap is well outside noise and
   the answer has moved further from yes. The cause is structural: the
   Seam takes exactly two crystals of each world, so only half its packs carry
   a Demonic aura and half a Prismatic one, where four Demonic crystals put an
   aura in every pack. Making it genuinely worst means changing what the
   composition does — both auras on one pack, or a Seam-only carrier — which is
   a balance decision rather than a measurement. The gap also MOVES several
   percent either way whenever anything in the sim changes — mana shifted it,
   potions shifted it back — so the demo PRINTS the margin rather than asserting
   an ordering, and `CLAUDE.md` says it is an open question rather than a claim.
   Nothing is blocked on it: it is a balance answer, and balance waits.

4. **Nothing but the Fissure hands out an element.** Every monster brings its
   own now, but which one is a flat roll off `MONSTER_ABILITIES` — a Rot pack
   is as likely to throw frost as a Cavern one. Biasing the table by monster
   FAMILY would make a world's fights feel like that world's, and is one field
   on `MonsterFamilyDef` plus a weight lookup. Not a phase, and not asked for:
   written down because the table it needs already exists.

5. **The Cavern and the Fissure have no currency of their own.** Retiring the
   quality ladder took `sigil_of_refinement` with it, which was Prismatic's
   exclusive, and nothing replaced it. Today `sigil_of_upheaval` is gated to
   Demonic and `sigil_of_finality` to the Seam; the other two worlds are gated
   to nothing. `RULES.md` says a world should have a reason to be entered, and
   every world now has uniques of its own — the Fissure two — so this may
   already be paid. **Provisional, and mine, not the user's:** left as it is
   rather than inventing a gate. Ask before gating an existing currency to the
   Cavern; it would make a staple zone-locked.

6. **Does anyone live in the Seam?** Four characters, three worlds and the
   Fissure — the Seam, which is supposed to be the worst room in the game and
   takes exactly two crystals of each, has nobody in it. `RunState.folk` is a
   list rather than one slot partly for this. Not written and not asked for, and
   it leans on question 3, which is about whether the Seam is what it claims to
   be at all.

7. **The Lampwright's story is now BUILDABLE, which changes question 1.**
   Question 1 has stood since trades landed: the trade acquisition is a
   placeholder and is meant to come out of a storyline with him. The thing that
   story would be told in is now BUILT and has been used three times — a room,
   a person in it, beats you click through, and a panel at the end that does
   something. Nothing about the story is written, so it is still question 1 and
   still the user's; what has changed is that answering it is content under
   `src/scenes/` rather than a system.

8. **ANSWERED at both ends.** *The user's call, in their words: "Just use the
   pixellab pipeline to generate a zone that looks good... I literally don't
   care what it looks like as long as it looks good", then "put this map into
   the main game to replace the base fissure".* Generated art ships: all four
   zones are generated tilesets and three monsters are generated bodies.
   The second half — whether to re-ink a generated body onto CSS properties to
   buy the runtime palette back — is answered NO, and by the art rather than by
   code. A body asked DARK through a forced palette separates from all four zone
   floors, because every one of them is pale by decision. So a generated body
   stays baked hex, is generated once rather than once per zone, and the runtime
   recolour is given up for bodies alone. Ranks are still light applied at
   runtime and still work.

9. **Do the chasms come back?** The whole drop system — `VOID`, ledges, the
   walls hanging into a hole, bridges — was built, judged and deleted at the
   user's instruction along with everything else in `83b8488`. How to draw one
   is written up under "What the deleted work found" and the code is at
   `56d599a`: the wall tile placed one row lower than it is keyed, flanks turned
   a quarter, no near wall. Nothing is blocked on it and it was never asked for
   twice; it is here so nobody rediscovers the geometry.

10. **ANSWERED, and the phase it blocked has landed.** Both trades have a look
    of their own — the Alchemist broad in a burned leather apron over acid
    green glass and brass, the Aethermancer starved and hung with violet
    phials — each a whole generated body, each its own silhouette rather than
    its own palette, and the doll is deleted. What the answer settled for the
    eight trades still to come is that a look is a SILHOUETTE decision: two
    near-neighbours at the ~87 device pixels the camera lands a body in are the
    same picture whatever their colours are.

11. **How many bodies can ship, now that the wall is measured and is not
    where this file said it was?** `src/render/generated-art.ts` is **0.48 MB
    for TEN bodies** — 33–52 KB each at grid 48, and 120 KB for the Gaunt at
    grid 96 — against the 4.67 MB for six and "0.8 MB per body" written all
    over this file and `CLAUDE.md`. That figure is from the era when every body
    was grid 96; cost is grid SQUARED times frames, so re-gridding a body to
    how big it is drawn cut it fourfold and nobody re-measured. **`docs/app.js`
    is 1.62 MB, 0.43 MB gzipped.** So ten trade looks are about 0.5 MB and the
    twelve Demonic and Prismatic bodies are about another 0.5 — not the ~13 and
    ~14 MB this file has been parking both decisions on. Nothing about "no
    binary assets" is under pressure and there is no decision to take. What is
    left is a question rather than a wall: **how big does this get before it
    matters**, and the answer to ask for is a number the user cares about
    (repo size, parse time on a cold load), not a re-derivation of this one.

12. **What does a reworked TRADE web look like?** The user's word during the
    polish round: *"trades needs a rework"*, beyond the node theme, with no
    further spec. The retheme itself landed — bound-diamond notables, chain
    links, a mounted centre, no grid — on all three webs at once, so what is
    left is the trade web's SHAPE or its content, and only the user can say
    which. The skills layout is explicitly fine.

**Decisions taken inside the ladder, and what each one beat.** These are mine
except where marked, made because the ask invited them and the work stalls
without them. Any can be overruled cheaply while the phase is still on this
list; each one is repeated in the phase it belongs to, so overruling one means
editing two places.

- **A graft replaces the IMPLICIT.** *The user's answer, asked and given.* The
  line the base gave you goes and the forged one stands in its place, which
  makes a graft a trade rather than a free upgrade. The alternative — replacing
  a rolled modifier — would have been a currency that happens to be a man.
- **A scene is a `RunSim` over an authored map**, rather than a second kind of
  simulation beside it. A boss room is then one filled-in field instead of a
  second engine, and both renderers draw a scene with no changes at all, because
  they already draw a `RunState`.
- **A scene arrives THROUGH the hole** at the end of a cleared descent, and
  still ends the run. It keeps every rule the meeting already obeys and costs
  nothing new.
- **One scene per clear, in a fixed order**, rather than several at once or a
  roll between them. A gift is scheduled and never rolled, and four schedules
  that can interleave is four schedules nobody can read off a screen.
- **A boss room is a descent**: its loot banks, its clear counts, dying in it
  costs that room and stops the loop. The alternative — a room outside the loop
  that pays nothing — is a cutscene with hit points.
- **A boss key is a wallet entry in its own table**, not a `CurrencyDef` and not
  an item. The ask said "probably just gain the required currency"; a real
  currency is reachable by the bench's registries, which is a bench that can
  pour a boss key onto a helmet.
- **Relics are a third `ItemKind`**, not gear with a tag. `carryRoom`,
  `addItem`, `sortGear` and every screen already branch on kind, and a corpse
  that sorts into the dock beside a pair of boots is a corpse you sell by
  accident.
- **A graft leaves the armour rating alone**, adds where jewellery has no
  implicit to replace, and can be done again over itself. Three small ones.
- **A forged line belongs to the PERSON, not the slot.** `ForgedDef.who`. The
  Astral-Geometer's phase said "for `ring` and `amulet` only", which described
  the lines and not the panel — keyed by slot alone, the man who takes bodies
  offered a ring the graft he had just said he had no opinion about.

## Backlog

Real, deferred by decision. Not a queue — do not promote one into a phase
without being asked.

- **The Demonic and Prismatic pools are still hand-drawn, six bodies each.**
  The Normal pool is six generated bodies now, so those two are the mismatch
  the Fissure stopped having — a Rot descent is a generated floor with hand-drawn
  bodies on it. Twelve more bodies is roughly 800 generations, and that is the
  whole of the cost: measured, they would add about 0.5 MB of
  `generated-art.ts` rather than the 14 this file used to claim, so it is a
  generation budget and a great deal of judging rather than a `RULES.md`
  decision. **Not asked for.**
  The cheaper shape, if it is ever wanted, is to cut those pools to six
  silhouettes each the way Normal was cut, and generate only what survives.
- **NO zone has furniture of its own, and that is now a decision rather than a
  gap.** Every zone draws a generated set and the rock dresses all four — cover
  at the wall's foot, roots on the cut face — and nothing stands on any of those
  floors, because the arrangements were cut at the user's word. `VIGNETTES` and
  `dressRooms` are still in the repo and nothing calls the placer, so bringing
  furniture back to any zone is one call and a table. What per-zone furniture
  would cost on top of that is roughly fifteen `create_map_object` generations a
  zone plus the judging, and a `tone` pass per zone, because a prop is toned
  toward the ground it stands on and these are toned to pale sand. **Do not
  promote this without being asked** — a descent with nothing standing on it is
  what was asked for, and it looked better.
- **`livingDecals` went quiet in three zones, and two of them were made of it.**
  A `bare` map stands the zone's own floor, decals and MOTION down, which cost
  the Fissure nothing (its `motion` is 0.5 and its `density` 0) and costs the
  Rot and the Cavern their stirring surfaces — the whole of what made those two
  read as alive rather than as coloured rock. A generated tileset is a still
  picture and always will be. Whether the motion comes back over a set, as
  animated props or not at all is unanswered; nothing is blocked on it.

- **Whether a trade has exactly one right skill.** `RULES.md` states the line:
  favouring a skill is fine, requiring one is a skill node that got lost. It is
  UNANSWERABLE today — `MAIN_SKILLS` holds three, which is too few to tell a
  favourite from a requirement — so the demo prints what each trade is worth
  per skill and asserts nothing. Deferred by the user's decision, and what
  un-defers it is a wider roster, not a measurement.
- **Jewellery has three rungs but no implicit.** `amulet`/`jade_amulet`/
  `onyx_amulet` and `ring`/`silver_band`/`gold_band` differ in exactly one
  way: how many modifiers they hold. That is the clearest statement of what a
  base tier is, and it is also the least interesting pair of slots in the
  game. Implicits for them would fix that; they are a balance change, so not
  in a phase about capacity — and the Astral-Geometer leans on it rather than
  fixing it: a graft ADDS on jewellery because there is nothing to replace, so
  the line that changes the delivery charges mana instead. Giving jewellery
  implicits would change what that graft costs, which is the balance pass's.
- **Fewer items per clear.** Measured before the tooltip and shop work: gear
  is rolled per KILL at `gearChance × yield × (1 + rarity/200)`, roughly **two
  to eleven pieces a clear** across the bands. The plan was to halve that and
  gate the three armour tiers behind power thresholds, so quantity resets down
  each time quality steps up, with gold per clear held flat across a
  threshold — crossing one must never read as a demotion.
  **The two things it was waiting on have landed.** Base tiers now gate
  themselves through item level, tooltips are readable, and Sell mode plus
  buy-back mean a heap of drops is a few clicks rather than a chore. So the
  question is now answerable rather than deferred: play it, and if it still
  feels like too much, measure the rate before changing it.
- **A first descent can drop nothing at all.** Gear rolls at 5% a kill, so
  about a third of first clears bank an empty haul — which is a new player
  meeting the loop's payoff screen with nothing in it. A guaranteed first drop
  is the obvious answer. Written down as the opening's, and it outlived it.
- **No per-item "keep" rule for the haul.** Every drop goes to the haul and
  triage is manual. A filter that hides a drop is the kind of thing you only get
  right once you know what a good drop looks like — and now that uniques drop,
  the answer has moved.
- **Blight, Strike and Fireball are not the same game.** The old note here said
  Blight cleared the top 12/12 against Strike's 3/12. That number is dead;
  `TRADE RULES` now measures all three at the deep end every run, and it reads
  **Fireball 7.50, Strike 4.37, Blight 3.90 kills/s** with no trade — so the
  ordering has entirely inverted since, and Fireball is now the outlier at
  roughly twice Blight. Do not act on it outside the balance pass: it is three
  skills, and the demo prints it fresh on every run.
- **A third way to get rid of a piece.** Selling is now a mode with a buy-back
  behind it, which is enough that this is no longer urgent — but everything
  still ends at the same counter, and a game where the only verb is "sell" has
  one verb.
- Four-frame walks for the bestiary, if the creatures ever grow legs worth
  animating.
- **A drawn recovery frame per creature.** They have one `attack` grid each and
  hold it for the whole swing. The hero does not — `poseOf` indexes
  `SWING_POSES` by how far through the swing the entity is — so the fix is that
  same treatment plus 21 more grids in `src/render/bestiary.ts`.
