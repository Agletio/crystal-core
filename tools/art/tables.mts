/**
 * The GENERATED art, off the MCP server and into the tables the renderer reads
 * — bodies and furniture, each a list of strings with a key of its own, like
 * every hand-drawn grid in `src/render`. Nothing here ships a PNG and nothing
 * here asks the generator for anything new: `generated.json` names every id.
 *
 *   npx tsx tools/art/tables.mts bodies | props
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { decodePng } from './png.mts';
import type { Decoded } from './png.mts';
import { apart, debackground, defloor, fittedTogether, rgb } from './convert.mts';
import { callTool, download, urlsIn } from './mcp.mts';
import { PROP_ART } from '../../src/render/generated-props';
import { ZONES } from '../../src/render/generated-tiles';

/** Every character a row may use. `.` is transparent and stays out of it. */
const CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-*/=<>?@%&$!~^();:[]{}|,_';

interface BodySpec {
  sprite: string;
  character: string;
  /**
   * Which facings to pull, north to south. Only the EAST half of the compass
   * is worth generating: the renderer mirrors anything facing left, so the
   * western three are reflections and paying for them buys nothing.
   */
  dirs?: string[];
  /** The mean brightness this body is taken to, over every frame at once. A
   *  TARGET rather than a gain, so one re-generated brighter still lands with
   *  the roster. Omitted, it ships as the generator drew it. */
  luma?: number;
  /** Tiles one whole GAIT CYCLE covers — how far the stride the animation
   *  DEPICTS actually carries the body. Omitted, it takes `STRIDE_CYCLE`. */
  stride?: number;
  /** The grid it ships at; the GENERATION must be an integer multiple of it. */
  grid?: number;
  inks?: number; // how many it settles to; 56 is a 96 grid's number, not a 24's
  /**
   * State name -> which animation GROUP ID on the generator, and which window
   * of it to keep. The whole of what makes a body's states data: a further one
   * is a row here and nothing else anywhere.
   *
   * `from`/`to` are fractions of the animation, defaulting to the whole of it.
   * They are not a nicety: a generated animation DEGRADES across its run — a
   * skeleton grows a weapon it does not hold, or turns to face the camera —
   * so which part is usable is a fact about that generation, belongs beside
   * its id, and is the one judgement no tool makes for you.
   */
  states: Record<string, { group: string; frames: number; from?: number; to?: number }>;
}

/** Every pixel pulled toward its own brightness. "Blood" comes back MAGENTA
 *  however the ask is worded, and `tone` cannot fix it: a mean and a spread
 *  per channel move how BRIGHT a thing is, never how saturated. */
function dulled(image: Decoded, by: number): Decoded {
  const rgba = new Uint8Array(image.rgba);
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue;
    const luma = 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
    for (let c = 0; c < 3; c++) rgba[i + c] = Math.round(rgba[i + c] + (luma - rgba[i + c]) * by);
  }
  return { width: image.width, height: image.height, rgba };
}

/** Every frame of one body onto a mean BRIGHTNESS, TOGETHER and never per
 *  frame — a gain off the frame it is handed makes a walk flicker as the arms
 *  swing, which is `fittedTogether`'s fault in another currency. Bodies asked
 *  in the same words land different distances from black: the first three
 *  skeletons measure luma 30-35 and three later ones 43-56. Saturation
 *  matches already and is left alone. */
function levelled(images: Decoded[], want: number): Decoded[] {
  let sum = 0;
  let n = 0;
  for (const image of images) {
    for (let i = 0; i < image.rgba.length; i += 4) {
      if (image.rgba[i + 3] < 128) continue;
      sum += 0.299 * image.rgba[i] + 0.587 * image.rgba[i + 1] + 0.114 * image.rgba[i + 2];
      n++;
    }
  }
  if (n === 0) return images;
  const by = want / (sum / n);
  return images.map((image) => {
    const rgba = new Uint8Array(image.rgba);
    for (let i = 0; i < rgba.length; i += 4) {
      if (rgba[i + 3] < 128) continue;
      for (let c = 0; c < 3; c++) rgba[i + c] = Math.min(255, Math.round(rgba[i + c] * by));
    }
    return { width: image.width, height: image.height, rgba };
  });
}

/** `tiles` is how much of the FLOOR it covers, which the generator cannot know.
 *  `tone` is how far to pull it toward the GROUND's own mean and spread, 0 to
 *  1: an object comes back warmer and more saturated than the stone whatever
 *  the ask says, and a prop that does not sit in the scene reads as a sticker
 *  on it. Knocked all the way back it stops being wood, so it is a fraction. */
interface PropSpec {
  id: string;
  object: string;
  tiles: number;
  tone?: number;
  dull?: number;
}

interface Manifest {
  /** `also` names more tilesets of the SAME terrain, chained off this one's
   *  lower base tile, whose tiles are ALTERNATES for the mask they carry — a
   *  Wang set has one picture per corner combination, so an open floor is that
   *  picture in every cell and reads as graph paper. */
  tileset: { id: string; floorIs: string; also?: string[] };
  hero: BodySpec;
  bodies: BodySpec[];
  props: PropSpec[];
}

type Art = {
  grid: number;
  stride?: number;
  dirs: string[];
  frames: string[][];
  states: Record<string, number[]>;
  key: Record<string, string>;
};
type Ground = { grid: number; tiles: Record<number, string[][]>; key: Record<string, string>; tone: Tone };
type Prop = { grid: number; tiles: number; rows: string[]; key: Record<string, string> };

const manifest: Manifest = JSON.parse(
  readFileSync(new URL('./generated.json', import.meta.url).pathname, 'utf8')
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

/** The grid a body ships at, unless its row says otherwise. The art is
 *  `grid × grid` strings per frame in a committed bundle AND a canvas per frame
 *  at four bytes a pixel, both paid per FACING — so the grid and the facing
 *  count are the two numbers a body's whole cost is made of. */
const GRID = 96;

const SHIPPING_FLOOR = 'lit_round'; // the floor a prop is toned to sit on

/** How many inks a body, a tileset and one prop each settle to. */
const BODY_INKS = 56;
const GROUND_INKS = 48;
const PROP_INKS = 32;

/** How far a prop is pulled toward the ground it stands on, unless it says. */
const PROP_TONE = 0.4;

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

/** A group header sits at two spaces and each direction's frames at four.
 *  Keyed by group ID, never by name: a re-roll under the same name leaves TWO
 *  groups standing, and a name then picks whichever was listed first. */
function animationFrames(text: string, direction: string): Map<string, string[]> {
  const out = new Map<string, string[]>();
  let group = '';
  for (const line of text.split('\n')) {
    const head = /^ {2}\S.*? — \d+ dir.*\[group: ([0-9a-f-]{36})\]/.exec(line);
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

/** Frames spread evenly over a WINDOW of an animation. A walk of 8 down to 2
 *  wants the two CONTACTS, not the first two frames of one step. */
function spread(urls: string[], want: number, from = 0, to = 1): string[] {
  const first = Math.floor(from * urls.length);
  const last = Math.max(first + 1, Math.ceil(to * urls.length));
  const window = urls.slice(first, last);
  return Array.from({ length: want }, (_, i) =>
    window[Math.min(window.length - 1, Math.round((i * window.length) / want))]
  );
}

async function creature(spec: BodySpec): Promise<Art> {
  const text = await callTool('get_character', { character_id: spec.character });
  if (/not found/.test(text)) {
    throw new Error(`${spec.sprite}: character ${spec.character} is gone from the server`);
  }
  const dirs = spec.dirs ?? ['east'];

  // One flat list, direction-MAJOR: every facing holds the same states in the
  // same order, so the runs are the first facing's and a facing is one stride
  // along the list. The rotation stands in for a group a character does not
  // have, so a body with no walk still draws rather than throwing.
  const wanted: string[] = [];
  const states: Record<string, number[]> = {};
  for (const dir of dirs) {
    const animations = animationFrames(text, dir);
    const still = rotation(text, dir);
    const from = wanted.length;
    for (const [name, want] of Object.entries(spec.states)) {
      const urls = animations.get(want.group) ?? [];
      if (urls.length === 0) console.log(`  ${dir} ${name}: no group ${want.group} — standing still`);
      const taken = urls.length > 0 ? spread(urls, want.frames, want.from, want.to) : [still];
      if (from === 0) states[name] = taken.map((_, i) => wanted.length + i);
      wanted.push(...taken);
    }
  }

  const got = await Promise.all(
    wanted.map(async (url) => debackground(decodePng(await download(url))))
  );
  const images = spec.luma ? levelled(got, spec.luma) : got;
  // Frames of one body arrive at two canvas sizes — a template animation on the
  // character's own and a v3 one larger. Centred in the biggest they share a
  // grid, and the common fit keeps a raised arm taller than the walk.
  const widest = Math.max(...images.map((i) => i.width));
  const square = images.map((i) => centred(defloor(i), widest));

  const grid = spec.grid ?? GRID;
  const inks = new Inks();
  for (const image of square) noted(image, inks);
  inks.settle(spec.inks ?? BODY_INKS);
  // The margin is the RANK GLOW's room and nothing else. At `rings * 4` a body
  // spans 69% of its grid where the hand-drawn doll spans nearly all of its 24,
  // so a generated one rendered a third smaller at the same `scale` — which is
  // invisible until something correctly sized stands next to it.
  const frames = fittedTogether(
    square.map((image) => rowsOf(image, inks)),
    Math.max(1, Math.round(grid / 24)) * 2,
    grid
  );
  console.log(
    `  ${widest}px into a ${grid} grid, ${inks.distinct} colours into ${inks.size}, ` +
      `${dirs.length} facings x ` +
      Object.entries(states).map(([n, ix]) => `${n} ${ix.length}f`).join(', ')
  );
  return { grid, stride: spec.stride, dirs, frames, states, key: inks.key };
}

// ---------------------------------------------------------------------------
// The ground
// ---------------------------------------------------------------------------

interface WangTile {
  corners: Record<'NW' | 'NE' | 'SW' | 'SE', string>;
  bounding_box: { x: number; y: number; width: number; height: number };
}

/**
 * NW, NE, SW, SE in base THREE — 0 floor, 1 rock, 2 the cut face between them.
 * A deep-walled set has a third terrain at a vertex: the cliff fills the cell
 * BELOW the boundary, so a wall spans two rows and cannot be said in one bit
 * per corner. Which of `lower`/`upper` is the floor belongs to the SET and not
 * to the renderer — the descriptions do not say and the pictures do — so it is
 * a manifest field, and what ships always means the same thing.
 */
const CORNER_VALUE = { floor: 0, rock: 1, cut: 2 };

const cornerKey = (t: WangTile, floorIs: string): number =>
  (['NW', 'NE', 'SW', 'SE'] as const).reduce((n, c) => {
    const v = t.corners[c];
    return n * 3 + (v === 'transition' ? CORNER_VALUE.cut : v === floorIs ? CORNER_VALUE.floor : CORNER_VALUE.rock);
  }, 0);

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

type Tone = { mean: number[]; spread: number[] };

/** Mean and spread per channel over the tiles of a sheet, opaque pixels only. */
function tone(sheet: Decoded, boxes: Box[]): Tone {
  const seen: number[][] = [[], [], []];
  for (const box of boxes) {
    for (let y = 0; y < box.h; y++) {
      for (let x = 0; x < box.w; x++) {
        const at = ((box.y + y) * sheet.width + (box.x + x)) * 4;
        if (sheet.rgba[at + 3] < 128) continue;
        for (let c = 0; c < 3; c++) seen[c].push(sheet.rgba[at + c]);
      }
    }
  }
  const mean = seen.map((v) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length));
  const spread = seen.map((v, c) =>
    Math.sqrt(v.reduce((a, b) => a + (b - mean[c]) ** 2, 0) / Math.max(1, v.length))
  );
  return { mean, spread };
}

/** Every pixel moved onto another sheet's mean AND spread. Two sets of the same
 *  terrain come back at visibly different brightness and contrast even chained
 *  off one base tile, and mixed per cell that reads as a CHECKERBOARD — which
 *  is worse than the repetition the alternates exist to break up. */
function retoned(sheet: Decoded, has: Tone, want: Tone, by = 1): Decoded {
  const rgba = new Uint8Array(sheet.rgba);
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 128) continue;
    for (let c = 0; c < 3; c++) {
      const scale = has.spread[c] > 1 ? want.spread[c] / has.spread[c] : 1;
      const moved = (rgba[i + c] - has.mean[c]) * scale + want.mean[c];
      rgba[i + c] = Math.max(0, Math.min(255, Math.round(rgba[i + c] + (moved - rgba[i + c]) * by)));
    }
  }
  return { width: sheet.width, height: sheet.height, rgba };
}

async function ground(spec: { id: string; floorIs: string; also?: string[] }): Promise<Ground> {
  const raw = await Promise.all([spec.id, ...(spec.also ?? [])].map(sheetOf));
  const rect = (t: WangTile): Box => ({
    x: t.bounding_box.x,
    y: t.bounding_box.y,
    w: t.bounding_box.width,
    h: t.bounding_box.height,
  });
  const want = tone(raw[0].sheet, raw[0].tiles.map(rect));
  const sets = raw.map(({ sheet, tiles: list }, i) => {
    if (i === 0) return { sheet, tiles: list };
    const has = tone(sheet, list.map(rect));
    console.log(
      `  set ${i}: mean ${has.mean.map((v) => v.toFixed(0)).join('/')} -> ` +
        `${want.mean.map((v) => v.toFixed(0)).join('/')}`
    );
    return { sheet: retoned(sheet, has, want), tiles: list };
  });
  const boxes = sets.flatMap(({ sheet, tiles: list }) =>
    list.map((t) => ({ sheet, mask: cornerKey(t, spec.floorIs), box: rect(t) }))
  );

  const inks = new Inks();
  for (const { sheet, box } of boxes) noted(sheet, inks, box);
  inks.settle(GROUND_INKS);

  const tiles: Record<number, string[][]> = {};
  for (const { sheet, mask, box } of boxes) (tiles[mask] ??= []).push(rowsOf(sheet, inks, box));
  const grid = boxes[0].box.w;
  console.log(
    `ground: ${grid} grid, ${sets.length} set(s), ${boxes.length} tiles over ` +
      `${Object.keys(tiles).length} corner keys, ${inks.distinct} colours into ${inks.size}`
  );
  return { grid, tiles, key: inks.key, tone: want };
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

/** A generated object is NOT permanent — every prop this repo shipped comes
 *  back `not found` — so a row the server lost keeps the grid it ships. */
async function furniture(specs: PropSpec[], ground: Tone | null): Promise<Record<string, Prop>> {
  const out: Record<string, Prop> = {};
  for (const spec of specs) {
    const text = await callTool('get_map_object', { object_id: spec.object });
    const url = urlsIn(text).find((u) => /\.png/.test(u)) ?? urlsIn(text)[0];
    if (!url) {
      const had = PROP_ART[spec.id];
      if (!had) throw new Error(`${spec.id}: no image and none shipped — ${text.slice(0, 90)}`);
      console.log(`  ${spec.id}: gone from the server, keeping the grid that ships`);
      out[spec.id] = { grid: had.grid, tiles: had.tiles, rows: had.rows, key: had.key };
      continue;
    }
    const got = debackground(decodePng(await download(url)));
    const raw = spec.dull ? dulled(got, spec.dull) : got;
    const pull = spec.tone ?? PROP_TONE;
    const image =
      ground && pull > 0 ? retoned(raw, tone(raw, [whole(raw)]), ground, pull) : raw;
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
  `/**\n * Written by \`tools/art/tables.mts\`. Do not edit by hand.\n *\n` +
  ` * ${what}\n */\n`;

const write = (name: string, text: string): void =>
  writeFileSync(new URL(`../../src/render/${name}`, import.meta.url).pathname, text);

/** Which tables to write — `bodies`, `tiles`, `props`, or all. A generated
 *  character is NOT permanent: several came back `not found`, so insisting on
 *  all three writes none. The grid ships, so nothing is lost. */
const want = process.argv.slice(2);
const doing = (which: string): boolean => want.length === 0 || want.includes(which);

// --- the bodies, and the one the hero is drawn as --------------------------
const bodies: Record<string, Art> = {};
if (doing('bodies'))
for (const spec of [...manifest.bodies, ...(manifest.hero.character ? [manifest.hero] : [])]) {
  console.log(`${spec.sprite}:`);
  bodies[spec.sprite] = await creature(spec);
}
if (doing('bodies')) write(
  'generated-art.ts',
  header(
    `The generated bodies, off the MCP server and reduced to the\n` +
      ` * same list of strings every hand-drawn one is. Each carries its OWN key: the\n` +
      ` * five inks belong to \`BEASTIARY\`, not to the renderer.`
  ) +
    `export type GeneratedArt = {\n  grid: number;\n` +
    `  /** Tiles one whole GAIT CYCLE covers. A per-frame stride would let the\n` +
    `   *  frame COUNT decide how far a body travels per footfall. */\n` +
    `  stride?: number;\n` +
    `  /** Facings, north to south, and only the east half of the compass —\n` +
    `   *  anything facing left is one of these mirrored. */\n` +
    `  dirs: string[];\n` +
    `  /** Direction-MAJOR: every facing holds the same states in the same\n` +
    `   *  order, so a facing is one stride along this and everything that\n` +
    `   *  draws a body stays flat. */\n` +
    `  frames: string[][];\n` +
    `  /** Which indexes of the FIRST facing are which STATE. A body walks,\n` +
    `   *  stands, swings and casts one animation per skill it throws, and a\n` +
    `   *  further one is a manifest row rather than a change to what draws. */\n` +
    `  states: Record<string, number[]>;\n  key: Record<string, string>;\n};\n\n` +
    `export const GENERATED: Record<string, GeneratedArt> = {\n` +
    Object.entries(bodies)
      .map(
        ([id, art]) =>
          `  ${id}: {\n    grid: ${art.grid},\n` +
          (art.stride === undefined ? '' : `    stride: ${art.stride},\n`) +
          `    dirs: ${JSON.stringify(art.dirs)},\n` +
          `    frames: [${art.frames.map((f) => rowSource(f, '    ')).join(', ')}],\n` +
          `    states: ${JSON.stringify(art.states)},\n` +
          `    key: ${JSON.stringify(art.key)},\n  },`
      )
      .join('\n') +
    `\n};\n`
);

// --- the ground ------------------------------------------------------------
// Only to TONE the furniture by, off the set that SHIPS. `generated-tiles.ts`
// belongs to `zoneset.mts emit` and this tool must never write it: it wrote a
// `TILESETS` table nothing has read since, and clobbered the zones doing it.
let floorTone: Tone | null = null;
if (doing('props')) {
  const set = ZONES[SHIPPING_FLOOR];
  const sheet = decodePng(Buffer.from(set.png.split(',')[1], 'base64'));
  const floor = set.tiles.find((t) => t.key === 0) ?? set.tiles[0];
  const [x, y, w, h] = floor.box;
  floorTone = tone(sheet, [{ x, y, w, h }]);
}

// --- the furniture ---------------------------------------------------------
if (doing('props') && manifest.props.length > 0) {
  console.log('props:');
  const props = await furniture(manifest.props, floorTone);
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
