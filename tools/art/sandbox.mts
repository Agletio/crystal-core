/**
 * The sandbox's art, pulled straight off the MCP server and written into the
 * two tables the renderer reads. Nothing here ships a PNG: a creature and a
 * tileset both come out as lists of strings with a key of their own, exactly
 * like every hand-drawn grid in `src/render`.
 *
 *   npx tsx tools/art/sandbox.mts
 *
 * `sandbox.json` beside this file is the SOURCE of truth and names every id;
 * nothing here asks the generator for anything new. A character wants a walk
 * animation and a swing — without them the rotation stands in for both and the
 * body does not move.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng } from './png.mts';
import type { Decoded } from './png.mts';
import { apart, debackground, deshadow, fittedTogether, rgb } from './convert.mts';
import { callTool, download, urlsIn } from './mcp.mts';

/** Every character a row may use. `.` is transparent and stays out of it. */
const CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-*/=<>?@%&$!~^();:[]{}|,_';

interface BodySpec {
  sprite: string;
  character: string;
}

/** `tiles` is how much of the FLOOR it covers, which the generator cannot know. */
interface PropSpec {
  id: string;
  object: string;
  tiles: number;
}

interface Manifest {
  tileset: { id: string; floorIs: string };
  hero: BodySpec;
  bodies: BodySpec[];
  props: PropSpec[];
}

type Art = { grid: number; frames: string[][]; key: Record<string, string> };
type Ground = { grid: number; tiles: Record<number, string[]>; key: Record<string, string> };
type Prop = { grid: number; tiles: number; rows: string[]; key: Record<string, string> };

const manifest: Manifest = JSON.parse(
  readFileSync(new URL('./sandbox.json', import.meta.url).pathname, 'utf8')
);

const hex = (r: number, g: number, b: number): string =>
  `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;

/**
 * One key across every frame and every tile of a set — a key per frame would
 * give the same colour a different letter in each, which is three unrelated
 * palettes in one entry.
 *
 * An export's colours are not a PALETTE. Three frames of one body arrive with
 * more distinct values than there are characters to name them, so the common
 * ones are the palette and everything else snaps to its nearest by redmean.
 * Two passes: `note` every pixel, `settle`, then `char`.
 */
class Inks {
  private readonly count = new Map<string, number>();
  private readonly of = new Map<string, string>();
  readonly key: Record<string, string> = {};

  note(colour: string): void {
    this.count.set(colour, (this.count.get(colour) ?? 0) + 1);
  }

  settle(most: number): void {
    const kept = [...this.count]
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.min(most, CHARS.length))
      .map(([colour], i) => {
        this.key[CHARS[i]] = colour;
        this.of.set(colour, CHARS[i]);
        return { colour, rgb: rgb(colour), char: CHARS[i] };
      });
    for (const colour of this.count.keys()) {
      if (this.of.has(colour)) continue;
      const mine = rgb(colour);
      let best = kept[0];
      for (const k of kept) if (apart(mine, k.rgb) < apart(mine, best.rgb)) best = k;
      this.of.set(colour, best.char);
    }
  }

  char(colour: string): string {
    const found = this.of.get(colour);
    if (!found) throw new Error(`${colour} was never noted`);
    return found;
  }

  get size(): number {
    return Object.keys(this.key).length;
  }

  get distinct(): number {
    return this.count.size;
  }
}

/**
 * The grid a body ships at. A DECISION, not whatever the generator handed
 * back: the art is three frames of `grid × grid` strings in a committed
 * bundle, so the size is a cost rather than a fact. `drawPixels` samples per
 * destination pixel, so nothing here has to divide `CELL`.
 */
const GRID = 128;

/** How many inks a body, a tileset and one prop each settle to. */
const BODY_INKS = 56;
const GROUND_INKS = 48;
const PROP_INKS = 32;

/** The same image on a bigger square, centred and transparent around it. */
function centred(image: Decoded, size: number): Decoded {
  if (image.width === size && image.height === size) return image;
  const rgba = new Uint8Array(size * size * 4);
  const offX = Math.floor((size - image.width) / 2);
  const offY = Math.floor((size - image.height) / 2);
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const from = (y * image.width + x) * 4;
      const to = ((y + offY) * size + (x + offX)) * 4;
      for (let c = 0; c < 4; c++) rgba[to + c] = image.rgba[from + c];
    }
  }
  return { width: size, height: size, rgba };
}

type Box = { x: number; y: number; w: number; h: number };

const whole = (image: Decoded): Box => ({ x: 0, y: 0, w: image.width, h: image.height });

/** Every opaque pixel of a region, as its colour. */
function* pixels(image: Decoded, box: Box): Generator<string | null> {
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      const at = ((box.y + y) * image.width + (box.x + x)) * 4;
      yield image.rgba[at + 3] < 128
        ? null
        : hex(image.rgba[at], image.rgba[at + 1], image.rgba[at + 2]);
    }
  }
}

const noted = (image: Decoded, inks: Inks, box = whole(image)): void => {
  for (const colour of pixels(image, box)) if (colour) inks.note(colour);
};

/** A region of an image as rows, at one character per pixel. */
function rowsOf(image: Decoded, inks: Inks, box = whole(image)): string[] {
  const rows: string[] = [];
  let row = '';
  for (const colour of pixels(image, box)) {
    row += colour ? inks.char(colour) : '.';
    if (row.length === box.w) {
      rows.push(row);
      row = '';
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------
// The creature
// ---------------------------------------------------------------------------

/** `get_character` prints a group header at two spaces and each direction's
 *  frames at four. Nothing else is indented that way. */
function animationFrames(text: string, direction: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  let group = '';
  for (const line of text.split('\n')) {
    const head = /^ {2}(\S.*?) — \d+ dir/.exec(line);
    if (head) {
      group = head[1];
      continue;
    }
    const dir = new RegExp(`^ {4}${direction}: (https\\S.*)$`).exec(line);
    if (dir && group && !out.has(group)) out.set(group, urlsIn(dir[1]));
  }
  return out;
}

/** The URL under `rotations:` for one direction. */
function rotation(text: string, direction: string): string {
  const found = new RegExp(`^ {2}${direction}: (https\\S+)$`, 'm').exec(text);
  if (!found) throw new Error(`no ${direction} rotation`);
  return found[1];
}

/** The walk and the swing, in order of preference. A character accumulates the
 *  tries that came before it, so read strongly first: on the loose reading
 *  alone an old spell wins the swing slot and arrives with its halo on. */
const WALK = [/walk/i, /run|step|stride/i];
const SWING = [/swing|punch|jab|kick|slash|attack|strike/i, /hand|cast|throw/i];

const pick = (animations: Map<string, string[]>, tiers: RegExp[]): string[] => {
  for (const tier of tiers) {
    const found = [...animations].find(([name]) => tier.test(name));
    if (found) return found[1];
  }
  return [];
};

async function creature(characterId: string): Promise<Art> {
  const text = await callTool('get_character', { character_id: characterId });
  const animations = animationFrames(text, 'east');
  const walk = pick(animations, WALK);
  const swing = pick(animations, SWING);
  const idle = rotation(text, 'east');

  // Two of the walk and one of the swing, which is what `CREATURE_FRAMES` is.
  // A walk of n frames contacts at 0 and passes near the middle; with no walk
  // at all the rotation stands in and the body slides rather than steps.
  const wanted = walk.length >= 2 ? [walk[0], walk[Math.floor(walk.length / 2)]] : [idle, idle];
  // The swing is held for the whole of the pose, so it wants the frame the arm
  // is furthest through rather than the one it starts from.
  wanted.push(swing.length ? swing[Math.floor(swing.length * 0.6)] : idle);

  const images = await Promise.all(
    wanted.map(async (url) => debackground(decodePng(await download(url))))
  );
  // A template animation comes back on the character's own canvas and a v3 one
  // on a larger one, so frames of one body arrive at two sizes. Centred in the
  // biggest of them they share a grid, and the common fit keeps the raised arms
  // taller than the walk rather than scaling each frame to fill its own box.
  const widest = Math.max(...images.map((i) => i.width));
  const square = images.map((i) => centred(i, widest));

  const inks = new Inks();
  for (const image of square) noted(image, inks);
  inks.settle(BODY_INKS);
  // The margin is the RANK GLOW's room and nothing else. At `rings * 4` a body
  // spans 69% of its grid where the hand-drawn doll spans nearly all of its 24,
  // so a generated one rendered a third smaller at the same `scale` — which is
  // invisible until something correctly sized stands next to it.
  const frames = fittedTogether(
    square.map((image) => deshadow(rowsOf(image, inks))),
    Math.max(1, Math.round(GRID / 24)) * 2,
    GRID
  );
  console.log(
    `  ${widest}px into a ${GRID} grid, ${inks.distinct} colours into ${inks.size}, ` +
      `${walk.length ? 'walk' : 'no walk'} + ${swing.length ? 'swing' : 'no swing'}`
  );
  return { grid: GRID, frames, key: inks.key };
}

// ---------------------------------------------------------------------------
// The ground
// ---------------------------------------------------------------------------

interface WangTile {
  corners: Record<'NW' | 'NE' | 'SW' | 'SE', string>;
  bounding_box: { x: number; y: number; width: number; height: number };
}

/**
 * NW, NE, SW, SE as one bit each, high to low, SET meaning floor. Which of the
 * two terrains that is belongs to the SET and not to the renderer: a tileset's
 * `lower` may be the dirt you walk on or the rock beside it, and the
 * descriptions do not say which — the pictures do. So it is a manifest field,
 * and what ships always means the same thing.
 */
const cornerMask = (t: WangTile, floorIs: string): number =>
  (['NW', 'NE', 'SW', 'SE'] as const).reduce(
    (n, c) => (n << 1) | (t.corners[c] === floorIs ? 1 : 0),
    0
  );

/** The sheet and the tile rects, which every other reader of a tileset wants. */
async function sheetOf(tilesetId: string): Promise<{ sheet: Decoded; tiles: WangTile[] }> {
  const text = await callTool('get_topdown_tileset', { tileset_id: tilesetId });
  const inline = urlsIn(text).find((u) => u.includes('image?inline=true'));
  const meta = urlsIn(text).find((u) => u.endsWith('/metadata'));
  if (!inline || !meta) throw new Error('tileset has no image or metadata link');
  const sheet = decodePng(await download(inline));
  const data = JSON.parse((await download(meta)).toString('utf8'));
  return { sheet, tiles: data.tileset_data?.tiles ?? [] };
}

async function ground(spec: { id: string; floorIs: string }): Promise<Ground> {
  const { sheet, tiles: list } = await sheetOf(spec.id);
  if (list.length !== 16) throw new Error(`${list.length} tiles is not a 16-tile Wang set`);

  const boxes = list.map((t) => ({
    mask: cornerMask(t, spec.floorIs),
    box: {
      x: t.bounding_box.x,
      y: t.bounding_box.y,
      w: t.bounding_box.width,
      h: t.bounding_box.height,
    },
  }));
  const inks = new Inks();
  for (const { box } of boxes) noted(sheet, inks, box);
  inks.settle(GROUND_INKS);

  const tiles: Record<number, string[]> = {};
  for (const { mask, box } of boxes) tiles[mask] = rowsOf(sheet, inks, box);
  if (Object.keys(tiles).length !== 16) throw new Error('two tiles claim the same corners');
  const grid = boxes[0].box.w;
  console.log(`ground: ${grid} grid, 16 tiles, ${inks.distinct} colours into ${inks.size}`);
  return { grid, tiles, key: inks.key };
}

// ---------------------------------------------------------------------------
// The furniture
// ---------------------------------------------------------------------------

/** A prop is ONE picture with a transparent field round it, cropped to what it
 *  actually draws — a generator hands back a square with a lot of nothing in
 *  it, and the nothing would be counted as part of the prop's footprint. */
function cropped(rows: string[]): string[] {
  let top = rows.length;
  let bottom = -1;
  let left = rows[0]?.length ?? 0;
  let right = -1;
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (c === '.') return;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      left = Math.min(left, x);
      right = Math.max(right, x);
    })
  );
  if (bottom < 0) return rows;
  // Square, so the renderer can scale by one number and a prop never squashes.
  const span = Math.max(bottom - top, right - left) + 1;
  const offX = left - Math.floor((span - (right - left + 1)) / 2);
  return Array.from({ length: span }, (_, y) =>
    Array.from({ length: span }, (_, x) => rows[top + y]?.[offX + x] ?? '.').join('')
  );
}

async function furniture(specs: PropSpec[]): Promise<Record<string, Prop>> {
  const out: Record<string, Prop> = {};
  for (const spec of specs) {
    const text = await callTool('get_map_object', { object_id: spec.object });
    const url = urlsIn(text).find((u) => /\.png/.test(u)) ?? urlsIn(text)[0];
    if (!url) throw new Error(`${spec.id}: no image — ${text.slice(0, 120)}`);
    const image = debackground(decodePng(await download(url)));
    const inks = new Inks();
    noted(image, inks);
    inks.settle(PROP_INKS);
    const rows = cropped(rowsOf(image, inks));
    console.log(`  ${spec.id}: ${rows.length} grid, ${spec.tiles} tiles across, ${inks.size} inks`);
    out[spec.id] = { grid: rows.length, tiles: spec.tiles, rows, key: inks.key };
  }
  return out;
}

// ---------------------------------------------------------------------------

const rowSource = (rows: string[], indent: string): string =>
  `[\n${rows.map((r) => `${indent}  '${r}',`).join('\n')}\n${indent}]`;

const header = (what: string): string =>
  `/**\n * Written by \`tools/art/sandbox.mts\`. Do not edit by hand.\n *\n` +
  ` * ${what}\n */\n`;

const write = (name: string, text: string): void =>
  writeFileSync(new URL(`../../src/render/${name}`, import.meta.url).pathname, text);

// --- the bodies, and the one the hero is drawn as --------------------------
const bodies: Record<string, Art> = {};
for (const spec of [...manifest.bodies, ...(manifest.hero.character ? [manifest.hero] : [])]) {
  console.log(`${spec.sprite}:`);
  bodies[spec.sprite] = await creature(spec.character);
}
write(
  'generated-art.ts',
  header(
    `The sandbox's bodies, generated through the MCP server and reduced to the\n` +
      ` * same list of strings every hand-drawn one is. Each carries its OWN key: the\n` +
      ` * five inks belong to \`BEASTIARY\`, not to the renderer.`
  ) +
    `export type GeneratedArt = { grid: number; frames: string[][]; key: Record<string, string> };\n\n` +
    `export const GENERATED: Record<string, GeneratedArt> = {\n` +
    Object.entries(bodies)
      .map(
        ([id, art]) =>
          `  ${id}: {\n    grid: ${art.grid},\n` +
          `    frames: [${art.frames.map((f) => rowSource(f, '    ')).join(', ')}],\n` +
          `    key: ${JSON.stringify(art.key)},\n  },`
      )
      .join('\n') +
    `\n};\n`
);

// --- the ground ------------------------------------------------------------
if (manifest.tileset.id) {
  const floor = await ground(manifest.tileset);
  write(
    'generated-tiles.ts',
    header(
      `The sandbox's ground: a Wang set whose CORNERS match, so a floor meets rock\n` +
        ` * without a seam. Keyed by NW/NE/SW/SE as one bit each, high to low, with a\n` +
        ` * set bit meaning floor — all sixteen, so no map can ask for one it lacks.`
    ) +
      `export type GeneratedTiles = { grid: number; tiles: Record<number, string[]>; key: Record<string, string> };\n\n` +
      `export const TILESETS: Record<string, GeneratedTiles> = {\n  mineshaft: {\n` +
      `    grid: ${floor.grid},\n    tiles: {\n` +
      Object.entries(floor.tiles)
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([mask, rows]) => `      ${mask}: ${rowSource(rows, '      ')},`)
        .join('\n') +
      `\n    },\n    key: ${JSON.stringify(floor.key)},\n  },\n};\n`
  );
}

// --- the furniture ---------------------------------------------------------
if (manifest.props.length > 0) {
  console.log('props:');
  const props = await furniture(manifest.props);
  write(
    'generated-props.ts',
    header(
      `Furniture for a room with generated ground under it. \`PROPS\` in\n` +
        ` * \`renderer.ts\` is the hand-drawn answer and is decals; this is a picture, so\n` +
        ` * only Pixi draws one — and \`tiles\` is how much of the floor it covers, which\n` +
        ` * is a fact about the art rather than about the room it stands in.`
    ) +
      `export type GeneratedProp = {\n  grid: number;\n  tiles: number;\n  rows: string[];\n` +
      `  key: Record<string, string>;\n};\n\n` +
      `export const PROP_ART: Record<string, GeneratedProp> = {\n` +
      Object.entries(props)
        .map(
          ([id, art]) =>
            `  ${id}: {\n    grid: ${art.grid},\n    tiles: ${art.tiles},\n` +
            `    rows: ${rowSource(art.rows, '    ')},\n` +
            `    key: ${JSON.stringify(art.key)},\n  },`
        )
        .join('\n') +
      `\n};\n`
  );
}
