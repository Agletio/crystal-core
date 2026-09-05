---
name: art
description: Generating art through the PixelLab MCP generator — monster and hero bodies, zone tilesets, icons, VFX stills, UI fixtures, portraits. Load before spending a single generation, and before deciding a thing cannot be done.
---

# Generating art

Everything ships as **data in TypeScript** — grids of strings, or a sheet as a
data URI. There are no image files; `docs/` is `index.html` and `app.js`. The
generator is an authoring tool, never a shipping format.

**EVERY picture goes through the generator. Writing a grid by hand is not an
option**, however small the thing is and however quick it would be — *the
user's call: "make sure you're using the pixel lab art generator and not
creating art yourself. We need it to match the rest of the art."* Hand-drawn
art reads as hand-drawn beside a roster that came off one generator under one
forced palette: seven icons written out by hand shipped once and were replaced
the same week. The grids still in `src/ui/icons.ts` predate the pipeline and
are a FALLBACK for an id nobody has drawn; nothing new joins them. A new skill,
monster, prop, zone or fixture is a row in the words-file for its tool and a
run of that tool — **if the key or the network is not there, say so and leave
the art undone rather than typing one out.**

**Judge before importing, and re-ask what missed.** Ten icons in one batch came
back with three wrong nouns; each was re-asked with the noun that fought
removed, and one of them took four tries. That is normal and it is cheap — a
design is one generation. What is not cheap is a picture nobody looked at.

## The generator

MCP server at `https://api.pixellab.ai/mcp`, wired in `.mcp.json` (expands
`$PIXELLAB_API_KEY`). `tools/art/mcp.mts` speaks plain JSON-RPC over one POST,
so a session with no MCP client for it is not blocked.

**Read `https://api.pixellab.ai/mcp/docs` before designing anything.** Three
sessions running have lost time to a capability sitting in plain sight there.
The tool list is not the whole API either — the docs point at
`https://api.pixellab.ai/v2/llms.txt` and `/v2/openapi.json`. Most v2 endpoints
are the MCP tools renamed; `POST /transfer-outfit-v2` has no MCP tool at all
(applies an outfit from a REFERENCE IMAGE across existing animation frames —
the right tool the day a look must land on frames that already exist, three
frames a request at 96, worse economics than `create_character_state` for
building one from scratch).

**The site and the API are ONE ACCOUNT.** `list_characters`, `list_objects`,
`list_topdown_tilesets` return everything the key owns by name and id — so art
the user makes on the website is art this repo can pull. Prefer it to asking
blind: the user can JUDGE a design before it is accepted.

**A row `tables.mts` calls `gone from the server` was REJECTED by the user.**
*"They are gone because I deleted some stuff that I really didn't like wanting
you to stop using it."* Keep the grid that ships; do NOT generate a replacement.
Ask first.

**A generated character is not permanent.** Several came back `not found`. What
ships is the converted grid, which is the whole argument for the conversion
step — but nothing on the server can be re-converted or extended, so finish a
body while it exists, and keep a ledger of character/group/job ids on disk.

## Costs, measured

| | |
|---|---|
| a design (`create_image_pixflux`, 128) | 1 generation, ~30s |
| a rotation (`create_character` v3) | 2 |
| one animation state, five facings | ~13 (a v3 animation is more than one apiece) |
| **a finished body** | **~68 generations**, most of an hour |
| `create_character_state` (a whole look) | 20–40 |
| `edit_image`, one 128 frame / four | 20 / 40 |
| `create_ui_asset` `pieces` (a whole kit) | 20–40 |

**Budget by CALLS and you are out by a factor of two.** Three bodies measured
203 generations over 90 calls.

**The wall clock is the budget, not the source size.** `generated-art.ts` is
0.48 MB for ten bodies; `docs/app.js` is 1.62 MB, 0.43 gzipped. Nothing about
"no binary assets" is under pressure. Animations are 2–4 minutes each and pace
against the job limit, so twelve bodies is a day of waiting. Queue in the
background, make every step idempotent — a run WILL be interrupted.

**The job limit is TEN per ACCOUNT**, and a call needs one slot per DIRECTION
at once. `list_jobs` is the only authoritative count. Ask one facing at a time.

**A refusal is TEXT, not an error.** `need 5 job slots but only 1 available`
and `already queued or complete` both arrive as normal tool results. Anything
not checking the response for a group id is recording a lie — nine animations
vanished that way in one run.

## Writing an ask

- **Name a colour by EXCLUSION as well as by name, and exclude the family.**
  "dark bone" returned ivory until `NOT tan, NOT beige, NOT sand, NOT gold, NOT
  amber, NOT bronze, NOT warm` went in. Exclude only what you mean — `NOT red`
  killed the dried blood; `NOT bright red, NOT pink, NOT crimson, NOT magenta`
  kept the rust-brown.
- **Not asking for a thing is not excluding it.** A prompt saying meat and
  muscle throughout, never saying stone, came back grey cobbles. `NOT stone,
  NOT rock, NOT brick, NOT cobbles, NOT masonry`.
- **The NOUN is the prior and it fights you.** "altar" draws a ziggurat, "a
  dead miner" a man in denim. Describe the SHAPE and the MATERIAL and name
  nothing. Drop a noun that has fought twice.
- **The generator will not draw a MOTION or a PHENOMENON — it draws the ACTOR
  or the SCENE that owns it.** "a sword-slash" summons a warrior swinging it;
  "a waterfall of poison" summons the cliffs. Give it an object it draws well
  and put the motion BEHIND it.
- **A composition the model wants to draw is CROPPED, never argued out of it.**
  A storm cloud came back twice with a bolt and a ground shadow hung under it.
  `keep` in `portrait.mts` takes them off for nothing. Same lesson as cutting a
  design below the hem instead of asking it to stand on nothing.
- **Naming a thing gets you ONE of it.** "a scatter of bones" is one skull.
  Say "spread apart with gaps between them", and that it is UNEVEN and MESSY —
  asking for a random scatter otherwise gets a tidy lattice.
- **Say the proportions or a person comes back CHIBI.** "a SMALL head on a tall
  long-limbed body, at least eight heads tall", plus `NOT anime, NOT manga, NOT
  chibi, NOT cute, NOT a big head, NOT a doll, NOT a cartoon`.
- **`view: 'high top-down'` does not get you top-down.** Say "seen from
  DIRECTLY ABOVE looking straight down" in the description, in capitals.
- **Vary the sentence that already worked.** Three variants written fresh came
  back a scratch, a tree trunk and green leaves; re-asked as minimal variations
  on the proven wording, two of three landed.
- **A palette is forced with an image.** `color_image_url` accepts a `data:`
  URI and is the ONLY thing that made a body dark — words alone returned ivory
  twice, and v3 ignores `text_guidance_scale`. It costs some drama; judge both.

## A body, end to end

**DESIGN → APPROVE → ROTATE → ANIMATE → JUDGE → IMPORT → WIRE**, and the order
is the whole trick: a design is one generation, a finished body is ~68. Three
things settle at the design step and nowhere else — silhouette, proportions,
tone.

Two files hold a body and neither is code. `tools/art/bodies.json` is what to
SAY (`look` is the design, `states[].say` is one animation each);
`tools/art/generated.json` is what came BACK. `tools/art/body.mts` walks
between them — `ask`, `state`, `sheet`, `fill`, `props`, `watch`.

**`tools/art/record.mts [sprite …]` reads the group ids back off the server**
into `generated.json`, matched by the `<sprite>_<state>` name the queue gives.
They used to be copied across by hand, which once pointed a whole roster at
another character's groups — something the server refuses and no file checks.
What a human decides (`grid`, `inks`, `stride`, `luma`, the `from`/`to` window)
is kept; only the ids are the server's to say.

- **It RUNS ON IMPORT and REWRITES `generated.json`.** So does every other
  `tools/art/*.mts` — they are scripts, not modules. Importing one to check it
  loads is not a safe test; it rewrote three shipping `group` ids that way once.
  Check a tool by reading it, or run it and `git diff` immediately after.
- **It picks among DUPLICATE groups.** `delete_animation` keys on the TYPE, not
  the display name, so a re-roll under the same name leaves two groups standing
  and a name picks whichever the server lists first. Re-running it can therefore
  silently repoint a body at the animation you threw away — **diff
  `generated.json` after every run and keep the ids you judged.**

1. **Write the ask** off the game's own tables: `MAP_THEMES` for a zone's line,
   `THEME_INK` for its hexes, `MONSTER_FAMILIES` for what lives there. A
   generic prompt gives generic art.
2. **Design** — `create_image_pixflux`, `no_background: true`,
   `view: 'high top-down'`, `direction: 'south'`, 128, `text_guidance_scale:
   12`. Ask several concepts and several variants at once.
3. **Approve — AND THE USER IS WHO APPROVES.** *His word, after a body was
   designed, rotated, animated and half-dressed before he ever saw it: "No stop
   I hate this design he looks like an anime character. You're supposed to give
   me sample images before you begin making animations or additional
   generations for characters."* **SHOW HIM THE DESIGN SHEET AND STOP.** Do not
   rotate, animate, dress or queue anything until he has picked one. A design
   is one generation and everything past it is sixty-eight; judging it yourself
   is not judging it. Put candidates on the real zone floors, magnified (lift
   the tile whose `key` is 0 out of `generated-tiles.ts`). **Nothing below this
   line is cheap.**
4. **Rotate** — `create_character`, `mode: 'v3'`, approved PNG as
   `reference_image_base64`, `size: 96`. `standard` mode is template-based: one
   rigged skeleton posed over and over, so three asks come back as one skeleton
   in three colours. **A rotation's SIZE comes from the reference image, not
   from `size`** — `body.mts rotate` resamples before sending, and that is not
   optional; inherited at 128, every later animation costs two generations a
   direction and every `create_character_state` of it is stuck there.
5. **Animate** — `body.mts fill <sprite>`. v3 from a written pose, never a
   template animation (templates drift: a walk grows a crook, a punch turns to
   face the camera). Rules that cost real time:
   - **"staying in strict side profile" is the highest-value phrase there is**
     — without it the skull faces the camera by frame three.
   - **It may NOT open the sentence.** `animate_character` dedupes on the first
     ~30 characters of `action_description`; nine of nineteen animations
     collapsed into one because every attack, cast and death opened with it.
     `body.mts` refuses a file whose prefixes collide.
   - **Describe the LIMBS, not the tool.** Naming a weapon the rotation does
     not hold draws a different one per frame.
   - **An ask that names no limb only works in side profile.** A walk described
     as mood came back a real stride on east and a standing pose elsewhere.
     Name the leg swinging past the other, the knee lifting, the opposite arm.
   - **An attack ENDS at full forward extension and never recovers.** The
     renderer holds a one-shot state's last frame, so a "settles back upright"
     beat is only ever the drift it brings — both heroes' swings came back
     facing backwards. Say he faces the same way in every frame.
   - **`frame_count: 4` drifts less than 6.** Degradation is at the tail.
   - **East half only.** The renderer mirrors anything facing left.
6. **Judge** — `body.mts sheet <sprite> out.png` and LOOK at it. Each state
   names `from`/`to`, the fraction of its run worth keeping. Hand work, no way
   round it. **A window that ends before the STRIKE lands keeps the wind-up and
   throws the blow away** — the renderer holds a one-shot state's last frame, so
   read the sheet's last kept frame as the pose the game will sit on.
7. **Import** — `tables.mts bodies` (also takes `tiles`, `props`). Free.
   **Name the table**: with no argument it writes all three and one dead row
   stops the other two.
   - **THE CHARACTER ID LIVES IN TWO FILES AND THEY MUST AGREE.** `body.mts`
     reads it off `bodies.json`; `tables.mts` reads the MANIFEST, which is
     `generated.json`. Re-dress a body, update one, and the animations queue
     against the new character while the import asks the old one for them —
     which arrives as `no group <id> — standing still`, imports a one-frame
     body of six colours, and fails nothing. **Grep the import log for
     `no group` before believing it.**
8. **Wire** — a row in `MONSTERS`, then `npm run demo`, `npm run build`,
   `npm run peek`.
9. **Look at what SHIPPED** — `npx tsx tools/art/shipped.mts <sprite> out.png
   [scale] [state,state]` draws a body out of `GENERATED`, which is the data the
   renderer actually reads. `body.mts sheet` draws what the SERVER holds, and
   the two differ by the whole import: the window, the fitting, the levelling
   and the quantisation. Both faults in the weapon round were found this way and
   neither was visible on the server's own sheet.

### A variant: one hero holding one weapon

Twenty-six of them, and none of their words are written by hand.
`tools/art/weapons.json` says what a weapon looks like, once, for every hero
that carries it; `tools/art/variant.mts` composes each variant's five states out
of that and the BASE body's own states.

- `variant.mts check` composes all 26 and prints what differs from the stored
  rows. Fourteen come back byte-identical to what shipped, which is what makes
  the composer trustworthy — change the vocabulary and `check` tells you exactly
  which art is now asking for something it was not generated with.
- `variant.mts write <sprite> …` rewrites only the rows it is named. **The words
  in a row are the words its shipped art was ASKED with**, so a sweep would make
  every other row a lie.
- A weapon row may carry a **`carry`** clause, appended to every state but the
  attack: where the weapon RESTS.
- **A `cast` clause is the same seam as `attack`, and a one-handed weapon needs
  one.** A base body's cast is a spell thrown from BOTH OPEN PALMS, and **a hand
  asked to OPEN is a hand that lets go** — the wand was absent from nine cast
  frames of eleven while `He keeps hold of it in EVERY frame` sat on the end of
  the same sentence. A trailing rule does not beat a described pose; describe
  the pose you want instead.
- **A weapon row's clause may not speak for the OTHER hand**, because the same
  row dresses a hand beside a shield and a hand beside a second weapon. What is
  in the other hand is the BODY's business: `words.alone` is appended only when
  the row has no `off`, and a shield's or second weapon's own `carry` covers the
  rest. Written into the weapon row, "his other hand stays empty" is a lie on
  two thirds of the rows that use it.
- **`variant.mts write <sprite> --state <name>` rewrites ONE state.** A row's
  words are the words its shipped art was ASKED with, so rewriting five to
  change one makes four of them a lie about art nobody re-rolled.
- **EVERY animation fault observed has been at the TAIL, seven for seven** — a
  wand lost from frame 7 of 11, a second wand on the last frame, a shield
  detaching from frame 5 and never coming back, a stray streak on a last idle
  frame. So `from`/`to` is the WHOLE repair vocabulary and no interior-frame
  surgery has ever been needed: a `drop` for a bad frame mid-run was built,
  found to have no user, and reverted. **Read the SERVER's run before deciding
  a fault is mid-run** — the shipped resample made a tail fault look like one.
- **A CAST may be windowed at the tail; an attack may not.** Obreth's cast
  drifts into a spread-armed pair in its last frames — his own silhouette is a
  rogue's — so his two wand rows keep only the first 72% and 45% of the run. The
  renderer holds a one-shot state's LAST frame, so the same trim on an attack
  would throw the blow away and sit on the wind-up. Only a weapon observed drifting earns one —
  the greatsword, asked upright, came back diagonal in the still and pointing at
  the floor by the third walk frame.
- **A tall body has no headroom in a 96 frame.** A weapon held vertically with
  its point above the head fits the Aethermancer and is cut off for the
  Alchemist, and no wording bought it back: six asks went in. Anchoring each
  part vertically — fists at the waist, guard at the chest, point above the head
  — is what got it upright at all; asking it to rise "up and slightly BACK past
  his shoulder" to buy room came back pointing DOWN and forward, because the
  generator hears *back* as trailing behind.

### Auditing art that already shipped — the sweep runbook

Do this whole loop before spending a generation. Steps 1–3 are free.

1. **`npx tsx tools/art/audit.mts drift [state]`** — every state whose composed
   words differ from what its row holds, grouped by state, ending in a list of
   sprites you can paste straight back in. A row differs because somebody
   changed the vocabulary and never re-rolled the art, so **a difference is a
   SUSPICION, not a fault.**
2. **LOOK.** `npx tsx tools/art/audit.mts <state> out.png <sprite…|--drift>`
   draws that ONE state across every named body, one row each, off `GENERATED`
   — what the game reads. Thirty bodies in one picture is the only way the odd
   one out is visible; `shipped.mts` answers "is this body right", which is a
   different question and thirty pictures nobody compares.
3. **Decide per row, and write down which.** A fault that is really there, a
   difference in WORDS with art that is fine, or a tail that drifts. **Most
   drift is not a fault**: of 28 rows audited, 22 were right and were left
   alone, and a `check` that keeps reporting them is the tool doing its job.
4. **Ask whether the WORDS are the cause before believing they are.** Split the
   rows into the ones that came out right and the ones that did not, and see
   whether the clause you suspect actually separates them. The shield's own
   `carry` anchor sat in 3 of 5 BROKEN rows and was missing from 4 of 9 GOOD
   ones — it separates nothing, so those five were bad DRAWS and a vocabulary
   fix would have been ~470 generations of the wrong repair. A re-roll of a bad
   draw may miss again; that is normal and it is cheap.
5. **Fix the WORDS first if they are wrong for some rows** — a weapon row that
   speaks for the other hand is a lie on every row with something in it, and
   generating before fixing it buys the wrong art at full price.
6. **`variant.mts write <sprite…> --state <name>`** — one state, never the row.
7. **`body.mts state <sprite> <name>`** per sprite, then `body.mts watch`.
8. **Judge the SERVER's sheet** (`body.mts sheet`), set `frames`/`from`/`to`,
   `tables.mts bodies`, then **look at what SHIPPED again with `audit.mts`** —
   the window and the fitting happen at import and change what you get.
9. **Diff the blast radius**: split `generated-art.ts` on its sprite keys and
   list which changed. It must be exactly the rows you swept.

### Dressing a body

`create_character_state` applies ONE edit across every rotation for one
20–40 charge, keeps identity and proportions, and hands back a character that
INHERITS THE SKELETON — so it animates like any other body. That is what makes
a look 40 generations rather than a second body.

**`edit_image` is consistent WITHIN a call and not ACROSS one.** Five facings
split 4 + 1 (all a call takes at that size) came back wearing two different
helms on the same description and seed. A body's frames never fit in one call,
so a frame list cannot dress a body. **An edit also repaints the WHOLE frame** —
asked for a helm alone, 24% of changed pixels landed on the head and 18% on the
boots. A per-slot armour layer cut out of one is a route this repo abandoned.

Frames per call is a STEP of their size: **16 at ≤64, 4 up to 128, 1 above** —
the grid is 512×512 laid out 4×4, 2×2 or 1×1, and billing follows the grid, not
the count. An over-long list is refused BEFORE billing and the refusal names
the number, so probing costs nothing.

**A multi-frame result is ONE INDEXED DOWNLOAD.** `get_image` answers
`frames: N` and a single `download:` url; frames past the first append
`?index=N`. A one-frame job carries no index. Looking for a url per frame finds
none and reads as "never arrived" on a job that completed and billed.

`dress.mts <outfit> --state <character-id>`; `OUTFITS` is what to say and
`KEEP` is the clause that dresses the man rather than replacing him.

## Import: what the conversion does for free

`tools/art/convert.mts`, no generations, re-runnable — so a re-import is the
whole repair. Before re-generating anything to remove an artefact, ask whether
the artefact has a SHAPE the import can name.

- **THE STORE ROTS, and it rots as a 200.** One frame of `obreth_mace2h`
  answers `Content-Length: 3234` and then closes having sent no body, every
  time, from curl as well as from the importer. `tables.mts` KEEPS what shipped
  for a body it cannot read and says so loudly at the end — the grid is the
  durable artefact and that is the whole argument for the conversion step — but
  such a body can never be re-imported, so a change to its words is a
  re-generation of the whole variant.
- **`download` caches to `tools/art/cache/frames/`, keyed on the URL PATH**
  (the query carries a per-request timestamp). A whole-table import is fifteen
  minutes of frames and one flaky object used to throw all of it away; a rerun
  now picks up where the last got to. It also caps concurrency at 6 and retries
  eight times — 502, a 200 carrying HTML, and a cut transfer are three faces of
  one throttle, and only the first looks like an error.

- **The ground is CUT by three rules seeing different halves.** `defloor` by
  COLOUR (what spills beside the body and is almost nowhere above it);
  `deslab` by SHAPE (a low-band region wider than tall and LIGHTER than the
  body); `loose` for what is left unjoined. The ask already forbids a shadow
  and the generator draws one anyway.
  - **The light test is what keeps the feet.** A body is asked near-black and
    the ground is pale floor darkened, so no foot passes it — including a body
    lying flat in its death frames, which every width rule gets wrong.
  - **Loosening `defloor`'s refusal to touch a colour the body shares is the
    one repair that puts holes in a body.** The answer is another SIGNAL, never
    a lower threshold.
  - `BodySpec.grounded` (Crawler, Lampwright) stands `deslab` and `loose` down;
    `BodySpec.mound` runs `demound` instead, which cuts by runs wider than the
    body's own chest and keeps death frames.
- **Colours are QUANTISED to a palette of its own.** Three frames arrive with
  87–124 distinct RGB values. `Inks` in `tables.mts` is two passes: `note`
  every pixel, `settle`, then `char`.
- **Frames are fitted TOGETHER, never one at a time.** `fittedTogether` takes
  one box and one transform over every frame — per frame a walk cycle rescales
  on every step and the body jitters against its own feet. It is also what lets
  frames off two canvas sizes keep their sizes relative to one another.
- **A body is LEVELLED onto the roster's brightness.** `BodySpec.luma`, a
  TARGET rather than a gain, applied over every frame at once. Bodies asked in
  the same words land different distances from black — 30–35 against 43–56.
  **Measure brightness before reaching for a colour pass**: the obvious reading
  of that comparison was "they are warmer", and it was wrong.
- **A conversion is INTEGER or it is refused.** A non-integer downscale
  resamples across pixel boundaries, which is the blur pixel art exists not to
  be.
- **The outline is DERIVED, never asked for.** Offered as one of five inks the
  generator fills whole bodies with it; denied entirely it draws no edge.
  `outlined()` walks the silhouette and puts `#` inside the edge.
- **`no_background` is not always obeyed**, so `debackground()` floods inward
  from the EDGES (never a global colour replace) when under 2% is already
  clear.
- **`BodySpec.frames` is the count KEPT, not generated.** `spread` resamples a
  state's window down to it, so trimming a body costs nothing.

## A zone tileset

`tools/art/zoneset.mts` — `ask` / `get` / `emit`, writing
`src/render/generated-tiles.ts`. **A new zone is that plus one row in `ZONE` in
`src/sim/grid.ts`.** Three zones after the first cost nine generations and no
code worth the name: everything the renderer had to learn held for all three.

Ask it the way the Fissure's `lit_round` was asked:

- `create_topdown_tileset`, `mode: 'pro'`, `raggedness: 0.85` — the standard
  pipeline draws coursed masonry whatever the prompt says, which is a wall
  somebody BUILT.
- `shape_style: 'round'` — the rock reduces to a thin dark cliff band and then
  pure black, so there is barely any surface left to repeat. That answers the
  wallpaper problem by removing the surface.
- `transition_size: 1` — the cliff fills the cell BELOW the boundary, so a wall
  is two rows tall as drawn. Anything less is a kerb, and it cannot be
  stretched: the face is rounded columns, and taller they are fence posts.
- **LIGHT floor, near-black rock, said at BOTH ends and by exclusion**, whatever
  the zone's own ink says. Measured twice: `cavern_lit` was asked the Cavern's
  own way round and reads INSIDE OUT, the pale expanse taking the eye as ground
  and the room reading as a hole in it. **A zone's identity is its HUE; the tone
  is not negotiable.**
- Its enum values are not the ones the other tools take: `outline` is
  `single color outline` (not `single color black outline`) and `detail` is
  `highly detailed` (not `high detail`).
- A `transition` becomes a bright RIM if you let it. `outline: 'lineless'` does
  not stop it. Ask for the boundary as a shadow, or `transition_size: 0`.

**It tops out at 21 distinct corner keys** — 16 tiles at transition ≤0.5, 25 at
1.0, and the 25 are 21 keys plus four wall CONTINUATIONS sharing corners with a
twin. No prompt or mode changes that; the MCP docs say the plain 16 cover all
corner combinations, so the gaps are shapes the terrain model never emits.
**Do not spend a generation trying to fill a missing key** — `fitCorners` opens
the carve to fit instead.

**A set is RETONED at emit, not by editing the file it ships in.** `RETONE` in
`zoneset.mts`: chroma kept plus a per-channel gain over the WHOLE sheet, no
generation, re-runnable. Whole sheet, never per tile — tiles interlock at their
edges and two toned differently is a checkerboard. It is what stands in for the
runtime palette a generated surface cost. A tone move costs nothing at the dark
end when the rock is already black (the Fissure's is rgb(0,0,0)); a set whose
rock is not would lose separation the same pass.

The `tools/art/cache/` PNG is gitignored and a container is reclaimed — if it
is gone, decode the data URI already in `generated-tiles.ts` rather than
re-asking.

## Icons, VFX and UI fixtures

- **Icons and VFX stills** go through `tools/art/icon.mts` — `icons.json` and
  `vfx.json` are the words, each row carrying its own framing, palette and
  size. `portrait.mts <id> <png> <grid> vfx <keep>` imports one; `keep` is the
  top fraction of the source worth having. Effect art is cropped to its own INK
  and squared up, so the picture's edges are the effect's edges and the
  renderer pins it by them. A 66-row batch runs in sevens through the ten-job
  slice, idempotent on the cache, in about twenty minutes.
- **A colour a batch keeps refusing may not be in the forced palette.** The
  first life flask came back amber because `icons.json` had no red.
- **Ask per FAMILY with a shared tier sentence** and a ladder reads as one
  ladder. The one family that came back wrong was re-asked by naming what it
  may NOT be.
- **UI fixtures** — `tools/art/uikit.mts` (`ask`/`get`/`emit`, words in
  `uikit.json`) → `src/render/generated-ui.ts`, mounted as `--fix-*` by
  `src/ui/fixtures.ts`. `create_ui_asset` over MCP takes flat `width`/`height`,
  not the REST schema's `image_size`. Its `pieces` template buys a whole kit in
  ONE call, which is one style — but **a piece under ~90px comes back with no
  detail** and is asked alone through `create_image_pixflux`, standing in via
  `SOLO` in `uikit.mts emit`. An `extras` row may carry its own `style` words
  and a `crop`.
- **Portraits**: `create_portrait_character(direction='character_to_portrait')`
  turns a finished character into a bust. Nobody has spent one — the speakers
  are hand-drawn at grid 48.

## Judging it

**In a DESCENT, with monsters that fight back.** *The user's call: "We are
going to just delete the sandbox and start updating graphics in the actual
game. I think it either works or it doesn't."* There is no room for looking at
art in.

`npm run peek -- out.png [zoom] [panX] [panY] [x,y,w,h,scale] [zone] [hold]
[skill] [shots]` — off the committed bundle in real Chromium, because Pixi is
the only renderer that draws a generated tileset. **The crop is magnified
NEAREST, and every fault found this way was invisible at ship size**: the posts
along the wall, the black scraps in the floor, the seam where the border
stopped. An EFFECT needs the last two arguments — it belongs to a skill and is
over in a fifth of a second.

- **Judging a zone means SOCKETING for it.** `peek` takes a zone name and puts
  the crystals in through the collection screen. There is no other way in.
- **A rare monster cannot be judged by shooting and hoping.** Bump its `weight`
  to something absurd, build, shoot, put it back.
- `tools/boss-peek.mjs <dir>` shoots a whole boss cycle.
- `npx tsx tools/face-peek.mts out.png [name|name:sprite]` draws the portraits
  large. `PORTRAITS` is the one table with no pipeline behind it, and art you
  cannot look at is art you are guessing at.
- **`tools/*.mts` is NOT typechecked** — `npm run typecheck` covers `src` only.
  A change to the art tools is proven by RUNNING it.
- **Before adding a writer to a generated file, grep for who else writes that
  path.** Two tools writing one has happened twice, and the second time
  `tables.mts props` silently clobbered the zone tilesets.
