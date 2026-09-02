/**
 * Ask the generator for a ZONE's tileset, several ways at once, and put the
 * sheets and the example maps somewhere they can be looked at.
 *
 * A tileset is ~100s and the tool is async, so the only sane way to judge one
 * is to queue a handful of variants together and compare the answers. Not part
 * of the suite.
 *
 *   npx tsx tools/art/zoneset.mts ask          — queue every ASK, print the ids
 *   npx tsx tools/art/zoneset.mts get          — poll, download sheet + metadata
 *   npx tsx tools/art/zoneset.mts emit <name>  — write src/render/generated-tiles.ts
 *
 * The sheet ships WHOLE, as a data URI. Every other sprite in the game is a
 * list of characters mapping to a palette property, which is what lets a zone
 * recolour for free — a painted tileset has baked hex and cannot, so there is
 * nothing to buy by quantising one and a lot of quality to lose. `RETONE` is
 * what stands in for that palette: a colour pass at emit, costing no
 * generation, so a floor can be moved without asking for a set again.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { callTool, download, fields } from './mcp.mts';
import { decodePng, encodePng } from './png.mts';

const OUT = 'tools/art/cache/zones';
const LEDGER = `${OUT}/asked.json`;

/**
 * A colour pass over a finished sheet, per set. `sat` is how much of the
 * original chroma survives and `mul` is a per-channel gain — so a hue moves by
 * what is knocked back rather than by a rotation, which is the only kind of
 * shift that cannot invent a colour the shading did not have.
 *
 * It runs over the WHOLE sheet, never per tile: floor and rock are one image
 * and its tiles interlock at their edges, so two of them toned differently is
 * a checkerboard — the fault every mixing experiment here has already failed
 * on. What it may not do is take the floor toward the rock: a LIGHT floor
 * under near-black stone is the tone rule, and `cavern_lit` sits in this file
 * as the measured proof that the other way round reads inside out.
 */
interface Retone {
  sat: number;
  mul: [number, number, number];
}

const RETONE: Record<string, Retone> = {
  // The camp came back LIME — the one ask in this file whose colour is the
  // point, and the generator took "fresh green" all the way to a highlighter.
  // Half the chroma and a green-weighted gain puts it at field grass; the rock
  // is already pure black, so nothing is lost at the dark end.
  camp_round: { sat: 0.46, mul: [0.62, 0.7, 0.5] },
  // The Fissure asked older and dimmer. It came back as bright sand — a floor
  // mean of rgb(206,193,158) at luma 193, which reads as a beach rather than as
  // stone somebody stopped working. Half the chroma and about two thirds the
  // light puts it at a dim warm grey, and the rock is already pure black, so
  // nothing is lost at the dark end.
  lit_round: { sat: 0.5, mul: [0.66, 0.65, 0.63] },
};

// TONED WITH THE FLOOR IT SITS ON: chaining buys the SHAPE, not the tone.
for (const name of [
  'fissure_pool', 'fissure_moss2', 'fissure_rubble', 'fissure_floor_cracked',
  'fissure_floor_grit', 'fissure_floor_swept', 'fissure_shelf',
]) {
  RETONE[name] = RETONE.lit_round;
}

/** Which zone floor a patch set is laid on, for the gain measured at emit. */
const SITS_ON: Record<string, string> = {
  fissure_pool: 'lit_round',
  rot_blood: 'rot_round',
  cavern_pool: 'cavern_round',
  seam_lava: 'seam_pro',
  seam_pool: 'seam_pro',
};

function retone(png: Buffer, how: Retone): Buffer {
  const { width, height, rgba } = decodePng(png);
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] === 0) continue;
    const l = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
    for (let c = 0; c < 3; c++) {
      const away = l + (rgba[i + c] - l) * how.sat;
      rgba[i + c] = Math.max(0, Math.min(255, Math.round(away * how.mul[c])));
    }
  }
  return encodePng(width, height, rgba);
}

/** Said the way the generator answers to: name the colour, then say what it is
 *  NOT, because naming a hex alone comes back olive every time. */
const CAVE =
  'cold desaturated grey-brown broken stone, NOT olive, NOT khaki, NOT yellow, ' +
  'NOT green, NOT sandy, NOT warm brown';

/** The Fissure's floor EXACTLY as the shipped set was asked for it, so the
 *  chained water set is told the same thing the base tile already is. */
const FISSURE_FLOOR_SAID =
  'a pale dusty cave floor of fine dirt and gravel, LIGHT warm grey-brown, ' +
  'brightly lit, NOT dark, NOT black, NOT charcoal, NOT green, NOT olive';
/** `lit_round`'s own lower base tile, off `get_topdown_tileset`. */
const FISSURE_FLOOR_TILE = '0f8b4d8e-4c25-431b-89fc-75ee0e6873ad';
/** OVER-EXCLUDED ONCE and it came back a HOLE: with blue, teal, cyan and green
 *  all excluded there was no hue left for water to be made of. What makes it
 *  read at 32px is a SURFACE — a reflection and a flat highlight — so those are
 *  asked for outright and the exclusions are cut to the drift observed. */
const WATER =
  'the flat still surface of deep cold water, dark blue-grey, ' +
  'MIRROR-SMOOTH and REFLECTIVE, the pale stone of the bank reflected in it ' +
  'near the edge, a few flat pale specular highlights lying on the surface, ' +
  'NOT tropical, NOT bright, NOT sunlit, NOT turquoise, NOT a hole, ' +
  'NOT a pit, NOT empty black';


/** A ZONE'S OWN FLOOR, off `get_topdown_tileset`. Every extra terrain chains
 *  off these, so a shore meets the floor the game already draws rather than a
 *  second floor toned apart — the checkerboard, avoided by construction. */
const FLOOR: Record<string, { tile: string; said: string }> = {
  fissure: { tile: FISSURE_FLOOR_TILE, said: FISSURE_FLOOR_SAID },
  rot: {
    tile: 'e5c25607-e66e-4416-9b6c-a594d1394c19',
    said: 'a floor of pale dry membrane and shed skin, LIGHT warm grey-pink raw '
      + 'membrane, pale and dry, brightly lit, NOT dark, NOT black, NOT red',
  },
  cavern: {
    tile: 'a19842a7-ea93-46c5-a894-63c21cf786f2',
    said: 'a floor of crushed crystal grit, LIGHT lilac-white floor of fine '
      + 'crystal dust and grit, brightly lit, NOT dark, NOT black, NOT purple',
  },
  seam: {
    tile: '8f1fb67b-4e50-409a-82c8-3842617ed9b3',
    said: 'a floor of pale membrane crusted with crystal grit, LIGHT warm '
      + 'grey-pink, pale and dry, brightly lit, NOT dark, NOT black, NOT red',
  },
};

/** The model's OWN rewrite of `WATER`, read back off `fissure_shore_enhanced`.
 *  `enhance` is shape_style-only and `pro` refuses shape_style, so the only way
 *  to put the better surface on pro's ragged shore is to say its words. */
const WATER_SAID =
  'deep cold water with a mirror-smooth and reflective surface showing pale '
  + 'stone reflections near the edge and scattered flat pale specular '
  + 'highlights, dark blue-grey in layered tones with deep shadows and bright '
  + 'surface gleams';

/** A patch of terrain lying IN the floor rather than standing over it: a shore
 *  and a blend, never the full-tile cliff the rock sets are built on. */
const patch = (zone: string, said: string, edge: string, ragged = 0.85) => ({
  lower_description: said,
  upper_description: FLOOR[zone].said,
  upper_base_tile_id: FLOOR[zone].tile,
  transition_description: edge,
  mode: 'pro',
  raggedness: ragged,
  spread_x: 0.35,
  transition_size: 0.25,
  tile_size: { width: 32, height: 32 },
  outline: 'lineless',
  shading: 'detailed shading',
  detail: 'highly detailed',
  view: 'high top-down',
});

const WET = 'wet dark stone at the waterline, the floor darkening as it goes under';

/**
 * A RAISED SHELF OF THE SAME FLOOR. It is the ROCK WALL'S OWN SHAPE —
 * `transition_size: 1` is the full-tile cliff every zone set is built on, so a
 * plateau lands in the SAME 21 Wang keys. What separates it from a wall is the
 * GRID: a wall is unwalkable, a shelf is floor reachable only by a stair.
 */
const raised = (zone: string) => ({
  // THE TWO TERRAINS MUST DIFFER OR THE MODEL INVENTS THE DIFFERENCE. Asked as
  // the same floor twice it drew the LOWER as flat black holes — a pit, not a
  // shelf. Height is read off LIGHT in an overhead view, so the upper floor is
  // the one nearer the lamp and the lower is the one in its shadow. That is a
  // real difference to draw and it is the difference the eye actually uses.
  lower_description: FLOOR[zone].said
    + ', lying LOWER and IN SHADOW, dimmer and cooler, NOT black, NOT a hole, NOT a pit',
  lower_base_tile_id: FLOOR[zone].tile,
  upper_description: FLOOR[zone].said
    + ', standing HIGHER on a shelf and brightly lit from above, the same floor',
  transition_description:
    'a sheer cut rock face in deep shadow dropping from the upper floor to the lower',
  shape_style: 'round',
  transition_size: 1,
  enhance: false,
  tile_size: { width: 32, height: 32 },
  outline: 'lineless',
  shading: 'detailed shading',
  detail: 'highly detailed',
  view: 'high top-down',
});

/** A LEVEL 2 VARIANT: the same floor, differently grained, meeting the real one
 *  with NO boundary. `transition_size: 0` is what makes it a blend rather than
 *  a shore — a drawn edge is what made the first round read as holes. */
const floorOf = (zone: string, said: string) => ({
  lower_description: said,
  upper_description: FLOOR[zone].said,
  upper_base_tile_id: FLOOR[zone].tile,
  transition_size: 0,
  mode: 'pro',
  raggedness: 0.9,
  spread_x: 0.5,
  tile_size: { width: 32, height: 32 },
  outline: 'lineless',
  shading: 'detailed shading',
  detail: 'highly detailed',
  view: 'high top-down',
});

const ASK: Record<string, Record<string, unknown>> = {
  // LEVEL 2: the walkable floor in more than one grain. Same LIGHT tone at
  // both ends, so the eye reads one ground with texture, not two surfaces.
  fissure_floor_grit: floorOf('fissure',
    'the same pale dusty cave floor, LIGHT warm grey-brown, but coarser — packed '
    + 'with small pale gravel and grit, SAME brightness as smooth floor, NOT dark, '
    + 'NOT a pit, NOT a hole, NOT water, NOT a different level'),
  fissure_floor_swept: floorOf('fissure',
    'the same pale dusty cave floor, LIGHT warm grey-brown, but smoother and finer '
    + '— drifted dust with faint wind lines, SAME brightness, NOT dark, NOT a pit, '
    + 'NOT a hole, NOT water, NOT a different level'),
  rot_floor_veined: floorOf('rot',
    'the same pale dry membrane floor, LIGHT warm grey-pink, but veined — faint '
    + 'darker capillaries running through it, SAME brightness, NOT dark, NOT red, '
    + 'NOT a pit, NOT a hole, NOT a different level'),
  cavern_floor_coarse: floorOf('cavern',
    'the same crushed crystal grit floor, LIGHT lilac-white, but coarser — larger '
    + 'broken crystal chips among the dust, SAME brightness, NOT dark, NOT purple, '
    + 'NOT a pit, NOT a hole, NOT a different level'),

  // --- EVERY ZONE'S EXTRA TERRAINS ----------------------------------------
  //
  // *"the rooms are kinda bland… Id just add more this time so we dont have to
  // do this later."* One ask per patch, all chained off their own zone's floor.
  // WATER IS FUNCTIONAL — a fishing pool stands on it — and the rest is what
  // the rock does on its own.
  fissure_raised2: raised('fissure'),
  // THE OTHER THREE SHELVES, asked as the Fissure's was: the one that shipped
  // as `fissure_shelf` is `fissure_raised2` — never a failure, imported for
  // nothing once the rim rule counted rock as high.
  rot_shelf: raised('rot'),
  cavern_shelf: raised('cavern'),
  seam_shelf: raised('seam'),
  // FLOOR VARIATION is a patch whose other terrain is ANOTHER FLOOR. Every set
  // holds exactly ONE pure-floor tile — measured, 1 of 25 in all four — so the
  // open ground is one 32px square repeated, which is the blandness itself.
  fissure_floor_cracked: patch('fissure',
    'the same pale dusty cave floor but dried and CRACKED into plates, fine dark '
    + 'fissures running between them, LIGHT warm grey-brown, NOT dark, NOT black',
    'the cracking fading out into smooth dust', 0.6),
  rot_bone: patch('rot', 'a bed of dry pale bone fragments and shed plates packed together, '
    + 'chalky off-white, NOT tan, NOT beige, NOT gold, NOT ivory, NOT warm',
    'the bone thinning into bare membrane'),
  cavern_ice: patch('cavern', 'a sheet of clouded pale ice over stone, milky white-blue, cracked '
    + 'and faintly translucent, NOT bright blue, NOT water, NOT purple',
    'the ice thinning to a wet rim over grit'),
  seam_ash: patch('seam', 'a drift of fine dark ash and cinder, near-black powder in soft banks, '
    + 'NOT brown, NOT sandy, NOT grey stone, NOT warm',
    'the ash thinning out over pale membrane'),
  fissure_pool: patch('fissure', WATER_SAID, WET),
  fissure_moss: patch('fissure', 'a thick mat of dark wet moss and pale lichen creeping over the stone, '
    + 'deep desaturated green-grey, NOT bright green, NOT grass, NOT a lawn, NOT sunlit', 
    'ragged fronds of moss thinning out over bare stone'),
  // Round one came back LIME. RETONE cannot repair a PATCH set: it runs over
  // the WHOLE sheet and half of this one is the chained floor, which has to
  // keep matching. So the colour is fixed in the ASK, excluding the family.
  fissure_moss2: patch('fissure',
    'a thick mat of wet moss and lichen creeping over the stone, ALMOST BLACK '
    + 'green, very dark and heavily desaturated, dull and unlit, the stone '
    + 'showing through it in places, NOT bright green, NOT lime, NOT emerald, '
    + 'NOT grass green, NOT yellow-green, NOT neon, NOT vivid, NOT sunlit, '
    + 'NOT a lawn, NOT foliage',
    'ragged dark fronds thinning out over bare pale stone'),
  fissure_rubble: patch('fissure', 'a bed of loose broken scree and shattered stone, angular grey rubble '
    + 'in heaped fragments, NOT sand, NOT smooth, NOT gravel path',
    'the rubble thinning to bare floor at its edge'),
  rot_blood: patch('rot', 'a still pool of thick dark blood, deep blackened crimson, glossy and '
    + 'reflective, NOT bright red, NOT pink, NOT magenta, NOT water, NOT clear',
    'a dark drying rim where the blood has soaked into the membrane'),
  rot_flesh: patch('rot', 'a bed of raw wet open meat, glistening dark red-brown muscle, NOT bright '
    + 'red, NOT pink, NOT magenta, NOT stone, NOT rock',
    'the membrane splitting where the raw meat opens through it'),
  cavern_pool: patch('cavern', WATER_SAID + ', faintly lit from below', WET),
  cavern_growth: patch('cavern', 'a dense field of pale violet crystal spines grown up out of the '
    + 'floor, lilac and white, faceted and glinting, NOT green, NOT blue, NOT grass',
    'the crystal thinning to loose grit at its edge'),
  // Round one was a FLAT WASH: the noun did no work, so this describes the
  // SHAPE — separate blades at separate angles — and excludes the wash.
  cavern_growth2: patch('cavern',
    'MANY SEPARATE angular crystal blades standing up out of the floor at '
    + 'DIFFERENT angles, spread apart with gaps of pale grit showing between '
    + 'them, each blade its own sharp facet catching a hard highlight, uneven '
    + 'and messy, pale lilac and white, NOT a flat sheet, NOT a smooth wash, '
    + 'NOT stripes, NOT an outline, NOT green, NOT blue',
    'the blades getting shorter and further apart until only grit is left'),
  seam_lava: patch('seam', 'a channel of molten rock, black crust broken by cracks of glowing '
    + 'orange heat, NOT bright yellow, NOT lava lamp, NOT cartoon, NOT water',
    'blackened cooled crust at the rim, cracked and dull'),
  seam_pool: patch('seam', WATER_SAID, WET),

  // --- WATER, round 2: a SHORE, not a cliff -------------------------------
  //
  // `transition_size` 0.5 and 0.8 are what the ROCK sets are built on — the
  // scale is 0 sharp, 0.25 medium, 1.0 full cliff — so round one drew rock
  // columns dropping into the dark. A shoreline is a BLEND.
  fissure_shore: {
    lower_description: WATER,
    upper_description: FISSURE_FLOOR_SAID,
    upper_base_tile_id: FISSURE_FLOOR_TILE,
    transition_description:
      'wet dark stone at the waterline, the floor darkening as it goes under, damp and shining',
    shape_style: 'round',
    transition_size: 0.25,
    enhance: false,
    tile_size: { width: 32, height: 32 },
    outline: 'lineless',
    shading: 'detailed shading',
    detail: 'highly detailed',
    view: 'high top-down',
  },
  // Let the model write it, which is how `lit_round` was asked.
  fissure_shore_enhanced: {
    lower_description: WATER,
    upper_description: FISSURE_FLOOR_SAID,
    upper_base_tile_id: FISSURE_FLOOR_TILE,
    transition_description:
      'wet dark stone at the waterline, the floor darkening as it goes under, damp and shining',
    shape_style: 'round',
    transition_size: 0.25,
    enhance: true,
    tile_size: { width: 32, height: 32 },
    outline: 'lineless',
    shading: 'detailed shading',
    detail: 'highly detailed',
    view: 'high top-down',
  },
  // A RAGGED waterline: a pool with an edge drawn by a ruler reads as a tank,
  // and the round shores put a cobble kerb round it that reads as BUILT.
  fissure_shore_pro: {
    lower_description: WATER,
    upper_description: FISSURE_FLOOR_SAID,
    upper_base_tile_id: FISSURE_FLOOR_TILE,
    transition_description:
      'wet dark stone at the waterline, the floor darkening as it goes under, damp and shining',
    mode: 'pro',
    raggedness: 0.85,
    spread_x: 0.35,
    transition_size: 0.25,
    tile_size: { width: 32, height: 32 },
    outline: 'lineless',
    shading: 'detailed shading',
    detail: 'highly detailed',
    view: 'high top-down',
  },
  // --- WATER round 1, kept as the measured proof of both faults ------------
  //
  // `upper_base_tile_id` is the docs' "connected tilesets": the shipped set's
  // own floor tile IS the upper terrain, so the shore meets the floor the game
  // draws rather than a second floor toned apart — the checkerboard every
  // mixing experiment here has failed on, avoided by construction.
  // WATER IS THE LOWER TERRAIN because it is lower: the floor drops into it.
  fissure_water_round: {
    lower_description: WATER,
    upper_description: FISSURE_FLOOR_SAID,
    upper_base_tile_id: FISSURE_FLOOR_TILE,
    transition_description: 'a dark wet waterline in shadow where the dry floor goes under',
    shape_style: 'round',
    transition_size: 0.5,
    enhance: false,
    tile_size: { width: 32, height: 32 },
    outline: 'lineless',
    shading: 'detailed shading',
    detail: 'highly detailed',
    view: 'high top-down',
  },
  // The same, let the model write its own descriptions — how `lit_round` was
  // asked, and it is the one that shipped.
  fissure_water_enhanced: {
    lower_description: WATER,
    upper_description: FISSURE_FLOOR_SAID,
    upper_base_tile_id: FISSURE_FLOOR_TILE,
    transition_description: 'a dark wet waterline in shadow where the dry floor goes under',
    shape_style: 'round',
    transition_size: 0.8,
    enhance: true,
    tile_size: { width: 32, height: 32 },
    outline: 'lineless',
    shading: 'detailed shading',
    detail: 'highly detailed',
    view: 'high top-down',
  },
  // A RAGGED shore. `pro` rejects shape_style and brings its own controls; a
  // pool with a straight edge reads as a tank, so this is the one to beat.
  fissure_water_pro: {
    lower_description: WATER,
    upper_description: FISSURE_FLOOR_SAID,
    upper_base_tile_id: FISSURE_FLOOR_TILE,
    transition_description: 'a dark wet waterline in shadow where the dry floor goes under',
    mode: 'pro',
    raggedness: 0.8,
    spread_x: 0.4,
    transition_size: 0.5,
    tile_size: { width: 32, height: 32 },
    outline: 'lineless',
    shading: 'detailed shading',
    detail: 'highly detailed',
    view: 'high top-down',
  },

  // A full-tile transition is the whole point: it is what makes the wall a
  // WALL rather than a kerb, and it is the thing the last set never had.
  pro_ragged: {
    lower_description: `dark cave floor of packed dirt and rubble, ${CAVE}`,
    upper_description: `a mass of solid dug rock, ${CAVE}`,
    transition_description: 'a sheer cut rock face in deep shadow at the foot of the wall',
    transition_size: 1,
    mode: 'pro',
    raggedness: 0.85,
    spread_x: 0.35,
    tile_size: { width: 32, height: 32 },
    outline: 'lineless',
    shading: 'detailed shading',
    detail: 'highly detailed',
    view: 'high top-down',
  },
  pro_sloped: {
    lower_description: `dark cave floor of packed dirt and rubble, ${CAVE}`,
    upper_description: `a mass of solid dug rock, ${CAVE}`,
    transition_description: 'a sheer cut rock face in deep shadow at the foot of the wall',
    transition_size: 1,
    mode: 'pro',
    raggedness: 0.55,
    slope_size: 0.3,
    spread_x: 0.5,
    tile_size: { width: 32, height: 32 },
    outline: 'lineless',
    shading: 'detailed shading',
    detail: 'highly detailed',
    view: 'high top-down',
  },
  // `shape_style` is newer than this pipeline and lets `enhance` write the
  // descriptions and pick the base colours itself.
  round_enhanced: {
    lower_description: 'dark cave floor of packed dirt and loose rubble',
    upper_description: 'a mass of solid dug cave rock',
    transition_description: 'a sheer cut rock face in deep shadow',
    shape_style: 'round',
    transition_size: 0.8,
    enhance: true,
    tile_size: { width: 32, height: 32 },
    outline: 'lineless',
    shading: 'detailed shading',
    detail: 'highly detailed',
    view: 'high top-down',
  },
  // Both first passes came back with the ROCK paler than the floor, which
  // reads inside out: the eye takes the bright expanse for ground and the dark
  // rooms for holes. The tone is the prompt's job, and it has to be said at
  // both ends — light floor AND near-black rock, each excluding the other.
  lit_floor: {
    lower_description:
      'a pale dusty cave floor of fine dirt and gravel, LIGHT warm grey-brown, ' +
      'brightly lit, NOT dark, NOT black, NOT charcoal, NOT green, NOT olive',
    upper_description:
      'a mass of near-black rock, VERY DARK charcoal almost black, unlit, ' +
      'NOT pale, NOT light grey, NOT brown, NOT sandy',
    transition_description: 'a sheer near-black cut rock face dropping to the floor',
    transition_size: 1,
    mode: 'pro',
    raggedness: 0.7,
    spread_x: 0.4,
    tile_size: { width: 32, height: 32 },
    outline: 'lineless',
    shading: 'detailed shading',
    detail: 'highly detailed',
    view: 'high top-down',
  },
  lit_round: {
    lower_description:
      'a pale dusty cave floor of fine dirt and gravel, LIGHT warm grey-brown, ' +
      'brightly lit, NOT dark, NOT black, NOT charcoal, NOT green, NOT olive',
    upper_description:
      'a mass of near-black rock, VERY DARK charcoal almost black, unlit, ' +
      'NOT pale, NOT light grey, NOT brown, NOT sandy',
    transition_description: 'a sheer near-black cut rock face dropping to the floor',
    shape_style: 'round',
    transition_size: 1,
    enhance: false,
    tile_size: { width: 32, height: 32 },
    outline: 'lineless',
    shading: 'detailed shading',
    detail: 'highly detailed',
    view: 'high top-down',
  },
};

/** Every set below is written off its zone's OWN line in `MAP_THEMES` and its
 *  own `THEME_INK` hexes: a generic prompt gives generic art, and the Fissure's
 *  own sentence is what gave the Fissure. Two asks a zone, `round` against
 *  `pro`, because that is the pair that settled the first one.
 *
 *  The FLOOR is asked LIGHT and the ROCK near-black in every one of them, said
 *  at both ends and by exclusion. That is not the zone's own ink — the Cavern
 *  is pale rock over a dark floor and the Rot is dark throughout — and it is
 *  deliberate: four asks came back with the rock paler than the floor and every
 *  one read inside out, the eye taking the bright expanse for ground and the
 *  rooms for holes. `cavern_lit` is the one exception, asked the zone's own way
 *  round on purpose so the two can be looked at side by side. */
const ROT_DARK =
  'VERY DARK blackened red-brown clotted meat, almost black, ' +
  'NOT pink, NOT bright red, NOT crimson, NOT magenta, NOT grey, NOT brown stone';
const ROT_LIGHT =
  'LIGHT warm grey-pink raw membrane, pale and dry, brightly lit, ' +
  'NOT dark, NOT black, NOT red, NOT crimson, NOT magenta, NOT green';

const CAVERN_DARK =
  'VERY DARK violet-black rock shot through with dull crystal, almost black, ' +
  'NOT pale, NOT white, NOT pink, NOT blue, NOT grey stone';
const CAVERN_LIGHT =
  'LIGHT lilac-white floor of fine crystal dust and grit, brightly lit, ' +
  'NOT dark, NOT black, NOT purple, NOT blue, NOT green, NOT sandy';

// THE CAMP — the one place in the game that is not underground. Its identity
// is the GREEN, and the tone rule holds all the same: light grass under
// near-black cliff, or the field reads as the hole and the rock as the ground.
const CAMP_LIGHT =
  'LIGHT fresh green meadow grass in short tufts, brightly lit, ' +
  'NOT dark, NOT black, NOT grey, NOT brown, NOT sandy, NOT dead, NOT yellow';
const CAMP_DARK =
  'VERY DARK grey-black cliff rock, almost black, unlit, ' +
  'NOT pale, NOT light grey, NOT brown, NOT sandy, NOT green, NOT mossy';

const ZONE_ASK: Record<string, Record<string, unknown>> = {
  camp_round: {
    lower_description: `a field of short green grass over packed earth, ${CAMP_LIGHT}`,
    upper_description: `a mass of near-black cliff rock, ${CAMP_DARK}`,
    transition_description: 'a sheer near-black rock face dropping to the grass',
    shape_style: 'round',
    transition_size: 1,
    enhance: false,
    tile_size: { width: 32, height: 32 },
    outline: 'lineless',
    shading: 'detailed shading',
    detail: 'highly detailed',
    view: 'high top-down',
  },
  camp_pro: {
    lower_description: `a field of short green grass over packed earth, ${CAMP_LIGHT}`,
    upper_description: `a mass of near-black cliff rock, ${CAMP_DARK}`,
    transition_description: 'a sheer near-black rock face dropping to the grass',
    transition_size: 1,
    mode: 'pro',
    raggedness: 0.85,
    spread_x: 0.35,
    tile_size: { width: 32, height: 32 },
    outline: 'lineless',
    shading: 'detailed shading',
    detail: 'highly detailed',
    view: 'high top-down',
  },
  // THE ROT — "The rock has given way to something that grew here after it."
  // The walls are not stone with something on them, they are the thing, so
  // nothing in the ask may say stone.
  rot_round: {
    lower_description: `a floor of pale dry membrane and shed skin, ${ROT_LIGHT}`,
    upper_description: `a mass of dark clotted meat grown solid, ${ROT_DARK}`,
    transition_description: 'a sheer cut face of dark wet muscle dropping to the floor',
    shape_style: 'round',
    transition_size: 1,
    enhance: false,
    tile_size: { width: 32, height: 32 },
    outline: 'lineless',
    shading: 'detailed shading',
    detail: 'highly detailed',
    view: 'high top-down',
  },
  rot_pro: {
    lower_description: `a floor of pale dry membrane and shed skin, ${ROT_LIGHT}`,
    upper_description: `a mass of dark clotted meat grown solid, ${ROT_DARK}`,
    transition_description: 'a sheer cut face of dark wet muscle dropping to the floor',
    transition_size: 1,
    mode: 'pro',
    raggedness: 0.7,
    spread_x: 0.4,
    tile_size: { width: 32, height: 32 },
    outline: 'lineless',
    shading: 'detailed shading',
    detail: 'highly detailed',
    view: 'high top-down',
  },
  // THE CAVERN — "Crystal to the ceiling, and every surface holding light."
  cavern_round: {
    lower_description: `a floor of crushed crystal grit, ${CAVERN_LIGHT}`,
    upper_description: `a mass of crystal grown solid, ${CAVERN_DARK}`,
    transition_description: 'a sheer cut face of dark crystal dropping to the floor',
    shape_style: 'round',
    transition_size: 1,
    enhance: false,
    tile_size: { width: 32, height: 32 },
    outline: 'lineless',
    shading: 'detailed shading',
    detail: 'highly detailed',
    view: 'high top-down',
  },
  // The zone's own way round: pale rock over a dark floor. The one ask that
  // breaks the tone rule, made on purpose so the pair can be judged together.
  cavern_lit: {
    lower_description:
      'a dark violet cavern floor in shadow, DEEP indigo-violet, ' +
      'NOT pale, NOT white, NOT pink, NOT grey, NOT brown',
    upper_description:
      'a mass of PALE luminous crystal, light rose-white, glowing from within, ' +
      'NOT dark, NOT black, NOT violet, NOT grey stone',
    transition_description: 'a sheer face of pale crystal dropping to a dark floor',
    shape_style: 'round',
    transition_size: 1,
    enhance: false,
    tile_size: { width: 32, height: 32 },
    outline: 'lineless',
    shading: 'detailed shading',
    detail: 'highly detailed',
    view: 'high top-down',
  },
  // THE SEAM — "Two worlds fused at a join that should not exist." ONE set and
  // never two mixed: an edge tile carries the cut face and its neighbour has to
  // continue it, so a per-tile mix of two sets tears at every wall.
  seam_round: {
    lower_description: `a floor of pale membrane crusted with crystal grit, ${ROT_LIGHT}`,
    upper_description:
      'a mass of dark clotted meat with violet crystal breaking out through it, ' +
      'VERY DARK blackened red shot with purple, almost black, ' +
      'NOT pale, NOT pink, NOT grey, NOT brown stone',
    transition_description:
      'a sheer cut face of dark muscle split by crystal shards, dropping to the floor',
    shape_style: 'round',
    transition_size: 1,
    enhance: false,
    tile_size: { width: 32, height: 32 },
    outline: 'lineless',
    shading: 'detailed shading',
    detail: 'highly detailed',
    view: 'high top-down',
  },
  // `seam_round` came back as grey COBBLES with crystal dots on the rim: the
  // standard shape pipeline draws masonry whatever the words say, and "stone"
  // has to be excluded by name rather than merely not asked for.
  seam_round2: {
    lower_description: `a floor of pale membrane crusted with crystal grit, ${ROT_LIGHT}`,
    upper_description:
      'a solid mass of dark clotted MEAT and muscle with violet crystal shards ' +
      'breaking out through it, VERY DARK blackened red shot with purple, ' +
      'almost black, NOT stone, NOT rock, NOT brick, NOT cobbles, NOT masonry, ' +
      'NOT grey, NOT pale, NOT pink',
    transition_description:
      'a sheer cut face of dark muscle split by crystal shards, NOT stone, NOT brick',
    shape_style: 'round',
    transition_size: 1,
    enhance: false,
    tile_size: { width: 32, height: 32 },
    outline: 'lineless',
    shading: 'detailed shading',
    detail: 'highly detailed',
    view: 'high top-down',
  },
  seam_pro: {
    lower_description: `a floor of pale membrane crusted with crystal grit, ${ROT_LIGHT}`,
    upper_description:
      'a mass of dark clotted meat with violet crystal breaking out through it, ' +
      'VERY DARK blackened red shot with purple, almost black, ' +
      'NOT pale, NOT pink, NOT grey, NOT brown stone',
    transition_description:
      'a sheer cut face of dark muscle split by crystal shards, dropping to the floor',
    transition_size: 1,
    mode: 'pro',
    raggedness: 0.8,
    spread_x: 0.4,
    tile_size: { width: 32, height: 32 },
    outline: 'lineless',
    shading: 'detailed shading',
    detail: 'highly detailed',
    view: 'high top-down',
  },
};

Object.assign(ASK, ZONE_ASK);

mkdirSync(OUT, { recursive: true });

if (process.argv[2] === 'ask') {
  const asked: Record<string, string> = existsSync(LEDGER)
    ? JSON.parse(readFileSync(LEDGER, 'utf8'))
    : {};
  for (const [name, args] of Object.entries(ASK)) {
    if (asked[name]) {
      console.log(`${name}: already ${asked[name]}`);
      continue;
    }
    const said = await callTool('create_topdown_tileset', args);
    const id = fields(said).tileset_id ?? /([0-9a-f-]{36})/.exec(said)?.[1];
    if (!id) {
      console.log(`${name}: NO ID — ${said.slice(0, 200)}`);
      continue;
    }
    asked[name] = id;
    console.log(`${name}: ${id}`);
    writeFileSync(LEDGER, JSON.stringify(asked, null, 2));
  }
} else if (process.argv[2] === 'emit') {
  const TERRAIN: Record<string, number> = { lower: 0, upper: 1, transition: 2 };
  const keyOf = (t: any): number =>
    ((TERRAIN[t.corners.NW] * 3 + TERRAIN[t.corners.NE]) * 3 + TERRAIN[t.corners.SW]) * 3 + TERRAIN[t.corners.SE];
  /** The mean colour of one tile of a sheet, by corner key. */
  const meanOf = (png: Buffer, meta: any, key: number): number[] => {
    const t = meta.tileset_data.tiles.find((t: any) => keyOf(t) === key);
    const img = decodePng(png);
    const sum = [0, 0, 0];
    let n = 0;
    for (let y = 0; y < t.bounding_box.height; y++) {
      for (let x = 0; x < t.bounding_box.width; x++) {
        const i = ((t.bounding_box.y + y) * img.width + t.bounding_box.x + x) * 4;
        if (img.rgba[i + 3] === 0) continue;
        for (let c = 0; c < 3; c++) sum[c] += img.rgba[i + c];
        n++;
      }
    }
    return sum.map((v) => v / Math.max(1, n));
  };
  const toned = (name: string): Buffer => {
    const raw = readFileSync(`${OUT}/${name}.png`);
    const how = RETONE[name];
    return how ? retone(raw, how) : raw;
  };
  const want = process.argv.slice(3);
  const body = want.map((name) => {
  const meta = JSON.parse(readFileSync(`${OUT}/${name}.json`, 'utf8'));
  const how = RETONE[name];
  let sheet = toned(name);
  if (how) console.log(`  ${name}: retoned, sat ${how.sat}, mul ${how.mul.join('/')}`);
  // TONED TO THE FLOOR IT SITS ON, by measurement: a chained set draws the
  // floor again in its own rendition, and every corner of a pool outside the
  // water wears that floor, so a shade off is a square halo round it. The
  // whole sheet takes the gain, tiles interlocking at their edges.
  const under = SITS_ON[name];
  if (under) {
    const floor = meanOf(toned(under), JSON.parse(readFileSync(`${OUT}/${under}.json`, 'utf8')), 0);
    const mine = meanOf(sheet, meta, 40);
    const gain = floor.map((f, c) => f / Math.max(1, mine[c]));
    const img = decodePng(sheet);
    for (let i = 0; i < img.rgba.length; i += 4) {
      if (img.rgba[i + 3] === 0) continue;
      for (let c = 0; c < 3; c++) img.rgba[i + c] = Math.max(0, Math.min(255, Math.round(img.rgba[i + c] * gain[c])));
    }
    sheet = encodePng(img.width, img.height, img.rgba as any);
    console.log(`  ${name}: toned to ${under}'s floor, gain ${gain.map((g) => g.toFixed(2)).join('/')}`);
  }
  const png = sheet.toString('base64');
  // A corner in base three, high to low, exactly as the renderer keys a cell.
  const tiles = meta.tileset_data.tiles.map((t: any) => ({
    key: keyOf(t),
    // What is ABOVE and BELOW the tile, 255 where it does not care. The four
    // wall-continuation tiles share their corners with a twin and are told
    // apart by nothing else.
    over: t.pattern_4x4.row_0,
    under: t.pattern_4x4.row_3,
    box: [t.bounding_box.x, t.bounding_box.y, t.bounding_box.width, t.bounding_box.height],
  }));
  return `  ${name}: {
    grid: ${meta.tile_size.width ?? meta.tile_size},
    tiles: ${JSON.stringify(tiles)},
    png: 'data:image/png;base64,${png}',
  },`;
  });
  const out = `/**
 * Written by \`tools/art/zoneset.mts emit\`. Do not edit by hand.
 *
 * Keyed by four CORNERS in base three: 0 floor, 1 rock, 2 the cut face, which
 * fills the cell BELOW the boundary so a wall spans two rows. \`over\`/\`under\`
 * is the terrain a tile wants there, 255 for don't care.
 */
export interface ZoneTile {
  key: number;
  over: number[];
  under: number[];
  box: [number, number, number, number];
}

export interface ZoneSet {
  grid: number;
  png: string;
  tiles: ZoneTile[];
}

export const ZONES: Record<string, ZoneSet> = {
${body.join('\n')}
};
`;
  writeFileSync('src/render/generated-tiles.ts', out);
  console.log(`wrote src/render/generated-tiles.ts: ${want.join(', ')}`);
} else {
  const asked: Record<string, string> = JSON.parse(readFileSync(LEDGER, 'utf8'));
  for (const [name, id] of Object.entries(asked)) {
    const said = await callTool('get_topdown_tileset', { tileset_id: id });
    const f = fields(said);
    const status = f.status ?? '?';
    console.log(`\n=== ${name} (${id}) — ${status}`);
    if (status !== 'completed') continue;
    // The sheet and its metadata are ENDPOINTS rather than .png urls, and the
    // metadata is the only place a tile's rect in the sheet is written down.
    // A field can carry prose after the url, so take the first token of one.
    const url = (of: string) => (f[of] ?? '').split(/\s+/)[0];
    writeFileSync(`${OUT}/${name}.png`, await download(url('download_png_inline')));
    writeFileSync(`${OUT}/${name}.json`, await download(url('download_metadata')));
    writeFileSync(`${OUT}/${name}.txt`, said);
    console.log(`  ${OUT}/${name}.png  +.json  ${f.tiles} tiles at ${f.tile_size}`);
  }
}
