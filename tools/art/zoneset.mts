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

const ASK: Record<string, Record<string, unknown>> = {
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
  const want = process.argv.slice(3);
  const body = want.map((name) => {
  const meta = JSON.parse(readFileSync(`${OUT}/${name}.json`, 'utf8'));
  const raw = readFileSync(`${OUT}/${name}.png`);
  const how = RETONE[name];
  const png = (how ? retone(raw, how) : raw).toString('base64');
  if (how) console.log(`  ${name}: retoned, sat ${how.sat}, mul ${how.mul.join('/')}`);
  // A corner in base three, high to low, exactly as the renderer keys a cell.
  const tiles = meta.tileset_data.tiles.map((t: any) => ({
    key:
      ((TERRAIN[t.corners.NW] * 3 + TERRAIN[t.corners.NE]) * 3 + TERRAIN[t.corners.SW]) * 3 +
      TERRAIN[t.corners.SE],
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
