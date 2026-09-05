/**
 * THE GRAIN: sixteen scatters of marks for one zone's floor — pebbles, cracks,
 * dust — asked through `create_tiles_pro` in STYLE mode with the shipped floor
 * tile as the style image, so what comes back is in that tile's own ink. They
 * arrive as marks on a clear ground, which is the useful shape: laid over the
 * floor tile at `GRAIN_ALPHA` a cell is one of seventeen floors, and a set
 * still holds one.
 *
 *   ask <zone…>   — one call a zone, 16 tiles, ten cents
 *   get           — poll, and write every tile to the cache
 *   emit          — src/render/generated-grain.ts, one sheet a zone
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { callTool, download, fields, urlsIn } from './mcp.mts';
import { decodePng, encodePng } from './png.mts';
import { ZONES } from '../../src/render/generated-tiles.ts';
import { ZONE } from '../../src/sim/grid.ts';

const OUT = new URL('./cache/grain/', import.meta.url).pathname;
const LEDGER = `${OUT}asked.json`;
mkdirSync(OUT, { recursive: true });
const asked: Record<string, string> = existsSync(LEDGER) ? JSON.parse(readFileSync(LEDGER, 'utf8')) : {};

/** Each zone's floor in the words its own set was asked with, cut down to the
 *  surface: the style image carries the colour, the words carry the marks. */
const SAID: Record<string, string> = {
  fissure: 'one pale dusty cave floor of fine dirt and gravel, dim warm grey-brown stone somebody stopped working',
  demonic: 'one floor of pale dry membrane over packed meat, warm grey-pink, cracked and veined',
  prismatic: 'one floor of crushed crystal grit, lilac-white, MOST OF EVERY TILE BARE with a few crystal chips, cracks and dust laid on it',
  seam: 'one floor of pale membrane crusted with crystal grit, warm grey-pink, dry',
};

/** The set's own pure floor tile, cut out of the sheet that ships. */
function floorTile(zone: string): { png: Buffer; size: number } {
  const set = ZONES[ZONE[zone as keyof typeof ZONE]!];
  const floor = set.tiles.find((t) => t.key === 0)!;
  const sheet = decodePng(Buffer.from(set.png.split(',')[1], 'base64'));
  const [bx, by, bw, bh] = floor.box;
  const tile = new Uint8Array(bw * bh * 4);
  for (let y = 0; y < bh; y++) {
    for (let x = 0; x < bw; x++) {
      const at = ((by + y) * sheet.width + bx + x) * 4;
      tile.set(sheet.rgba.subarray(at, at + 4), (y * bw + x) * 4);
    }
  }
  return { png: encodePng(bw, bh, tile as any), size: bw };
}

async function ask(zones: string[]): Promise<void> {
  for (const zone of zones) {
    if (asked[zone]) {
      console.log(`${zone}: already ${asked[zone]}`);
      continue;
    }
    const { png, size } = floorTile(zone);
    const said = await callTool('create_tiles_pro', {
      description:
        `sixteen variations of ${SAID[zone]}, each tile a different scatter of small pebbles, ` +
        'cracks, dust and worn patches, all the SAME colour and the SAME flat lighting so any two sit ' +
        'side by side without a seam, seen from DIRECTLY ABOVE, NOT grass, NOT sand, NOT bright, NOT water',
      tile_type: 'square_topdown',
      tile_view: 'top-down',
      outline_mode: 'segmentation',
      style_images: JSON.stringify([{ base64: png.toString('base64'), width: size, height: size }]),
      style_options: JSON.stringify({ color_palette: true, outline: true, detail: true, shading: true }),
    });
    const id = fields(said).id ?? /([0-9a-f-]{36})/.exec(said)?.[1];
    if (!id) throw new Error(`${zone}: no id in ${said.slice(0, 200)}`);
    asked[zone] = id;
    writeFileSync(LEDGER, JSON.stringify(asked, null, 2));
    console.log(`${zone}: ${id}`);
  }
}

async function get(): Promise<void> {
  for (const [zone, id] of Object.entries(asked)) {
    if (existsSync(`${OUT}${zone}.txt`)) continue;
    const said = await callTool('get_tiles_pro', { tile_id: id });
    const f = fields(said);
    if (f.status !== 'completed') {
      console.log(`${zone}: ${f.status} ${f.progress ?? ''}`);
      continue;
    }
    const urls = urlsIn(said).filter((u) => /\.png/.test(u));
    for (let i = 0; i < urls.length; i++) writeFileSync(`${OUT}${zone}_${i}.png`, await download(urls[i]));
    writeFileSync(`${OUT}${zone}.txt`, said);
    console.log(`${zone}: ${urls.length} tiles`);
  }
}

/** Ink coverage, so the sheet runs LIGHT to HEAVY and a skewed pick lands
 *  on the quiet ones most of the time. */
function inked(t: ReturnType<typeof decodePng>): number {
  let n = 0;
  for (let i = 3; i < t.rgba.length; i += 4) if (t.rgba[i] > 0) n++;
  return n / (t.width * t.height);
}

function emit(): void {
  const rows: string[] = [];
  for (const zone of Object.keys(asked)) {
    const tiles: ReturnType<typeof decodePng>[] = [];
    for (let i = 0; existsSync(`${OUT}${zone}_${i}.png`); i++) tiles.push(decodePng(readFileSync(`${OUT}${zone}_${i}.png`)));
    // A WHOLE tile is not a mark: laid over the floor it is a lighter square.
    const marks = tiles.filter((t) => inked(t) <= 0.6);
    if (marks.length < tiles.length) console.log(`${zone}: ${tiles.length - marks.length} whole tiles dropped`);
    tiles.length = 0;
    tiles.push(...marks);
    if (tiles.length === 0) continue;
    tiles.sort((a, b) => inked(a) - inked(b));
    const size = tiles[0].width;
    const sheet = new Uint8Array(size * tiles.length * size * 4);
    tiles.forEach((t, i) => {
      for (let y = 0; y < size; y++) sheet.set(t.rgba.subarray(y * size * 4, (y + 1) * size * 4), (y * tiles.length * size + i * size) * 4);
    });
    const png = encodePng(size * tiles.length, size, sheet as any).toString('base64');
    rows.push(`  ${zone}: { grid: ${size}, count: ${tiles.length}, png: 'data:image/png;base64,${png}' },`);
    console.log(`${zone}: ${tiles.length} tiles, ink ${tiles.map((t) => inked(t).toFixed(2)).join(' ')}`);
  }
  const src =
    '/** GENERATED by tools/art/grain.mts — never edited by hand. One sheet a\n' +
    ' *  zone: `count` marks of `grid` px, lightest first, laid over the floor. */\n' +
    'export interface GrainSheet {\n  grid: number;\n  count: number;\n  png: string;\n}\n\n' +
    `export const GRAIN: Record<string, GrainSheet> = {\n${rows.join('\n')}\n};\n`;
  writeFileSync(new URL('../../src/render/generated-grain.ts', import.meta.url).pathname, src);
  console.log('wrote src/render/generated-grain.ts');
}

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'ask') await ask(rest);
else if (cmd === 'get') await get();
else if (cmd === 'emit') emit();
else console.log('grain.mts ask <zone…> | get | emit');
