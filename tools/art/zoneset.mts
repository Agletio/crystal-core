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
 * nothing to buy by quantising one and a lot of quality to lose.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { callTool, download, fields } from './mcp.mts';

const OUT = 'tools/art/cache/zones';
const LEDGER = `${OUT}/asked.json`;

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
  const png = readFileSync(`${OUT}/${name}.png`).toString('base64');
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
