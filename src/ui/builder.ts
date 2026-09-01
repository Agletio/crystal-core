/**
 * THE LEVEL BUILDER. Not a screen the game has — a place to lay a floor out by
 * hand with the REAL tilesets and the REAL props, so what is painted is what a
 * descent draws. Every per-cell answer is the renderer's own — `zoneTileAt`,
 * `patchesAt`, `patchKey` — and a prop is `makeProp`, the same canvas Pixi
 * uploads, so a design cannot look one way here and another on the floor.
 *
 * What comes out is a PLAN: one character a tile and a list of objects.
 */
import { FLOOR, Grid, SHELF, STAIR, RIM, WALL, high, patchesAt, patchesFor, rimShelves, wangKey } from '../sim/grid';
import { SHELF_SET, ZONE } from '../sim/grid';
import { patchTileAt, zoneTileAt } from '../render/renderer';
import { ZONES } from '../render/generated-tiles';
import { PROP_ART } from '../render/generated-props';
import { makeProp } from '../render/sprites';
import { COVER_PROPS } from '../vignettes';
import type { MapTheme } from '../types';
import type { MapProp } from '../sim/grid';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

const WIDE = 44;
const TALL = 30;
/** Rock drawn past the plan, so a chamber at the edge does not end on a
 *  straight lit line — the renderer's `EDGE` at a size that still fits. */
const OVER = 2;
const THEMES: MapTheme[] = ['fissure', 'demonic', 'prismatic', 'seam'];
const KEEP = 'crystal-core:plan';

const COVER = new Set(COVER_PROPS.map((c) => c.id));

type Brush =
  | { kind: 'tile'; tile: number }
  | { kind: 'patch'; index: number }
  | { kind: 'prop'; id: string }
  | { kind: 'erase' };

interface Plan {
  theme: MapTheme;
  rows: string[];
  props: MapProp[];
}

let theme: MapTheme = 'fissure';
let grid = new Grid(WIDE, TALL);
let props: MapProp[] = [];
let brush: Brush = { kind: 'tile', tile: FLOOR };
let size = 1;
let zoom = 22;
let lines = true;
let painting = false;
let rubbing = false;
let filter = '';

/** Every sheet, decoded once. Decoding a data URI is ASYNC, so a draw that
 *  runs before it lands silently misses the whole floor. */
const sheets = new Map<string, HTMLImageElement>();
let ready = false;

async function decode(): Promise<void> {
  await Promise.all(
    Object.entries(ZONES).map(async ([id, set]) => {
      const img = new Image();
      img.src = set.png;
      try {
        await img.decode();
      } catch {
        return;
      }
      sheets.set(id, img);
    })
  );
  ready = true;
  draw();
}

/** The patch sets of this world, in `Grid.patch`'s own 1-based order — the
 *  same list a generated map indexes, so an index means one thing. */
const setsFor = (t: MapTheme) => patchesFor(t);

function reset(): void {
  grid = new Grid(WIDE, TALL); // all rock: a floor is CARVED, like the real one
  grid.blocking = setsFor(theme).map((p) => !!p.blocks);
  props = [];
}

function at(x: number, y: number): number {
  return y * grid.width + x;
}

function put(x: number, y: number): void {
  if (!grid.inBounds(x, y)) return;
  const cell = at(x, y);
  if (brush.kind === 'tile') {
    grid.tiles[cell] = brush.tile;
    if (brush.tile !== FLOOR) grid.patch[cell] = 0; // no pool inside the rock, none on a shelf
  } else if (brush.kind === 'patch') {
    if (grid.tiles[cell] === WALL) return;
    grid.patch[cell] = brush.index;
  } else if (brush.kind === 'erase') {
    grid.patch[cell] = 0;
    props = props.filter((p) => p.x !== x || p.y !== y);
  }
}

function paint(x: number, y: number): void {
  if (brush.kind === 'prop') {
    const id = brush.id;
    if (!grid.inBounds(x, y)) return;
    if (props.some((p) => p.x === x && p.y === y && p.id === id)) return;
    props.push({ id, x, y });
    return;
  }
  const half = Math.floor((size - 1) / 2);
  for (let dy = -half; dy < size - half; dy++) {
    for (let dx = -half; dx < size - half; dx++) put(x + dx, y + dy);
  }
}

function draw(): void {
  const canvas = $('builder-canvas') as HTMLCanvasElement;
  const ratio = globalThis.devicePixelRatio || 1;
  const w = grid.width * zoom;
  const h = grid.height * zoom;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.width = Math.round(w * ratio);
  canvas.height = Math.round(h * ratio);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, w, h); // the stage's own ground shows through
  if (!ready) return;

  const name = ZONE[theme];
  const set = name ? ZONES[name] : undefined;
  const sheet = name ? sheets.get(name) : undefined;
  if (set && sheet) {
    for (let y = -OVER; y < grid.height + OVER; y++) {
      for (let x = -OVER; x < grid.width + OVER; x++) {
        const found = zoneTileAt(set, grid, x, y);
        if (found < 0) continue;
        const box = set.tiles[found].box;
        ctx.drawImage(sheet, box[0], box[1], box[2], box[3], x * zoom, y * zoom, zoom, zoom);
      }
    }
  }

  // A SHELF over the floor, keyed as the rock is; rock wins at a corner.
  const shelfName = SHELF_SET[theme];
  const shelfSet = shelfName ? ZONES[shelfName] : undefined;
  const shelfSheet = shelfName ? sheets.get(shelfName) : undefined;
  if (shelfSet && shelfSheet) {
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.at(x, y) === WALL || wangKey(grid, x, y, high) === 0 || wangKey(grid, x, y) !== 0) continue;
        const found = zoneTileAt(shelfSet, grid, x, y, high);
        if (found < 0) continue;
        const box = shelfSet.tiles[found].box;
        ctx.drawImage(shelfSheet, box[0], box[1], box[2], box[3], x * zoom, y * zoom, zoom, zoom);
      }
    }
  }

  // WHAT ELSE IS ON THE FLOOR, over the zone's own surface.
  const kits = setsFor(theme);
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.at(x, y) === WALL) continue;
      for (const index of patchesAt(grid, x, y)) {
        const kit = ZONES[kits[index - 1]?.set ?? ''];
        const skin = sheets.get(kits[index - 1]?.set ?? '');
        if (!kit || !skin) continue;
        const found = patchTileAt(kit, grid, x, y, index);
        if (found < 0) continue;
        const box = kit.tiles[found].box;
        ctx.drawImage(skin, box[0], box[1], box[2], box[3], x * zoom, y * zoom, zoom, zoom);
      }
    }
  }

  // COVER first so furniture stands ON the rubble, then nearest LAST, and each
  // anchored at the FOOT of its tile: a prop taller than a tile grows upward.
  const cover = props.filter((p) => COVER.has(p.id));
  const over = props.filter((p) => !COVER.has(p.id)).sort((a, b) => a.y - b.y);
  for (const prop of [...cover, ...over]) {
    const art = PROP_ART[prop.id];
    const canvasOf = art ? makeProp(prop.id) : null;
    if (!art || !canvasOf) continue;
    const wide = art.tiles * zoom;
    const tall = wide * (canvasOf.height / canvasOf.width);
    ctx.drawImage(canvasOf, (prop.x + 0.5) * zoom - wide / 2, (prop.y + 1) * zoom - tall, wide, tall);
  }

  if (lines) {
    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= grid.width; x++) {
      ctx.beginPath();
      ctx.moveTo(x * zoom + 0.5, 0);
      ctx.lineTo(x * zoom + 0.5, h);
      ctx.stroke();
    }
    for (let y = 0; y <= grid.height; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * zoom + 0.5);
      ctx.lineTo(w, y * zoom + 0.5);
      ctx.stroke();
    }
  }
}

/** ROWS of one character a tile — `#` rock, `.` the zone's own floor, a DIGIT
 *  the patch set at that index, `^` a shelf, `=` its rim, `S` a stair.
 *  Readable, so a plan can be edited by hand. The rim is DERIVED, so `^` and
 *  `=` read back the same. */
const MARK: Record<number, string> = { [WALL]: '#', [SHELF]: '^', [RIM]: '=', [STAIR]: 'S' };
function toPlan(): Plan {
  const rows: string[] = [];
  for (let y = 0; y < grid.height; y++) {
    let row = '';
    for (let x = 0; x < grid.width; x++) {
      const cell = at(x, y);
      const patch = grid.patch[cell];
      row += MARK[grid.tiles[cell]] ?? (patch ? String(patch) : '.');
    }
    rows.push(row);
  }
  return { theme, rows, props };
}

function fromPlan(plan: Plan): void {
  theme = THEMES.includes(plan.theme) ? plan.theme : 'fissure';
  grid = new Grid(plan.rows[0]?.length || WIDE, plan.rows.length || TALL);
  grid.blocking = setsFor(theme).map((p) => !!p.blocks);
  plan.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const mark = row[x];
      if (mark === '#') continue;
      grid.tiles[y * grid.width + x] = mark === '^' || mark === '=' ? SHELF : mark === 'S' ? STAIR : FLOOR;
      if (mark >= '1' && mark <= '9') grid.patch[y * grid.width + x] = Number(mark);
    }
  });
  rimShelves(grid);
  props = (plan.props ?? []).map((p) => ({ id: p.id, x: p.x, y: p.y }));
}

/** One row a line, because a plan is read by eye before it is read by code. */
function written(): string {
  const plan = toPlan();
  const rows = plan.rows.map((r) => `    ${JSON.stringify(r)}`).join(',\n');
  const objects = plan.props.map((p) => `    ${JSON.stringify(p)}`).join(',\n');
  return `{\n  "theme": ${JSON.stringify(plan.theme)},\n  "rows": [\n${rows}\n  ],\n  "props": [\n${objects}\n  ]\n}`;
}

function save(): void {
  try {
    globalThis.localStorage?.setItem(KEEP, written());
  } catch {
    // A builder that cannot remember is still a builder.
  }
}

function changed(): void {
  rimShelves(grid); // the rim is never painted, only read off the shelf
  draw();
  ($('builder-plan') as HTMLTextAreaElement).value = written();
  save();
}

function chip(host: HTMLElement, label: string, want: Brush, art?: string): void {
  const button = el('button', 'mini bldrchip') as HTMLButtonElement;
  const same =
    brush.kind === want.kind &&
    (want.kind !== 'patch' || brush.kind !== 'patch' || brush.index === want.index) &&
    (want.kind !== 'prop' || brush.kind !== 'prop' || brush.id === want.id) &&
    (want.kind !== 'tile' || brush.kind !== 'tile' || brush.tile === want.tile);
  if (same) button.classList.add('bldrchip--on');
  if (art) {
    const made = makeProp(art);
    // A data URI, not `cloneNode`: cloning a canvas copies the ELEMENT and not
    // the bitmap, so every thumbnail comes out blank.
    if (made) {
      const thumb = new Image();
      thumb.src = made.toDataURL();
      thumb.className = 'bldrchip__art';
      button.append(thumb);
    }
  }
  button.append(el('span', 'bldrchip__name', label));
  button.onclick = () => {
    brush = want;
    tools();
  };
  host.append(button);
}

function group(host: HTMLElement, title: string, why?: string): HTMLElement {
  const box = el('div', 'devgroup');
  box.append(el('h3', 'devgroup__title', title));
  if (why) box.append(el('p', 'devgroup__why', why));
  const row = el('div', 'devgroup__row');
  box.append(row);
  host.append(box);
  return row;
}

function tools(): void {
  const host = $('builder-tools');
  host.replaceChildren();

  const where = group(host, 'World', 'Which rock, and which terrains it has. Changing it keeps the shape.');
  for (const world of THEMES) {
    const button = el('button', 'mini bldrchip', world) as HTMLButtonElement;
    if (world === theme) button.classList.add('bldrchip--on');
    button.onclick = () => {
      theme = world;
      grid.blocking = setsFor(theme).map((p) => !!p.blocks);
      // A patch index means a different terrain in another world, so anything
      // that world has no set for goes back to its own floor.
      const kept = setsFor(theme).length;
      for (let i = 0; i < grid.patch.length; i++) if (grid.patch[i] > kept) grid.patch[i] = 0;
      if (brush.kind === 'patch' && brush.index > kept) brush = { kind: 'tile', tile: FLOOR };
      tools();
      changed();
    };
    where.append(button);
  }

  const rock = group(host, 'Level 3 and 2', 'The rock, and the floor cut out of it.');
  chip(rock, 'Rock', { kind: 'tile', tile: WALL });
  chip(rock, 'Floor', { kind: 'tile', tile: FLOOR });
  const up = group(host, 'A level up', 'A shelf grows its own rim; a stair is painted on the rim, foot on the floor.');
  chip(up, 'Shelf', { kind: 'tile', tile: SHELF });
  chip(up, 'Stair', { kind: 'tile', tile: STAIR });

  const sets = setsFor(theme);
  const low = group(host, 'Level 1', 'Lower than the floor, and NEVER walkable.');
  const flat = group(host, 'Level 2 variants', 'The same floor in another grain. Nothing here blocks.');
  sets.forEach((def, i) => {
    chip(def.blocks ? low : flat, def.set, { kind: 'patch', index: i + 1 });
  });
  chip(flat, 'Bare floor', { kind: 'patch', index: 0 });

  const gone = group(host, 'Erase', 'Takes the terrain back to bare floor and lifts any object off the tile.');
  chip(gone, 'Erase', { kind: 'erase' });

  const all = Object.keys(PROP_ART);
  const kit = group(host, 'Objects', `Every generated prop — ${all.length} of them.`);
  const find = el('input', 'bldrfind') as HTMLInputElement;
  find.id = 'builder-find';
  find.placeholder = 'filter';
  find.value = filter;
  // Rebuilt on every key, so the field is put back and re-focused rather than
  // kept: a palette of 99 without one is a scroll for every brush.
  find.oninput = () => {
    filter = find.value;
    tools();
    ($('builder-find') as HTMLInputElement).focus();
  };
  kit.before(find);
  const want = filter.trim().toLowerCase();
  for (const id of all) {
    if (want && !id.includes(want)) continue;
    chip(kit, id, { kind: 'prop', id }, id);
  }
}

function bar(): void {
  const host = $('builder-bar');
  host.replaceChildren();

  const brushes = el('span', 'bldrbar__set');
  brushes.append(el('span', 'bldrbar__label', 'Brush'));
  for (const n of [1, 2, 3, 5]) {
    const button = el('button', 'mini bldrchip', String(n)) as HTMLButtonElement;
    if (n === size) button.classList.add('bldrchip--on');
    button.onclick = () => {
      size = n;
      bar();
    };
    brushes.append(button);
  }
  host.append(brushes);

  const zooms = el('span', 'bldrbar__set');
  zooms.append(el('span', 'bldrbar__label', 'Zoom'));
  for (const n of [14, 18, 22, 28, 32, 36]) {
    const button = el('button', 'mini bldrchip', String(n)) as HTMLButtonElement;
    if (n === zoom) button.classList.add('bldrchip--on');
    button.onclick = () => {
      zoom = n;
      bar();
      draw();
    };
    zooms.append(button);
  }
  host.append(zooms);

  const grill = el('button', 'mini bldrchip', 'Grid') as HTMLButtonElement;
  if (lines) grill.classList.add('bldrchip--on');
  grill.onclick = () => {
    lines = !lines;
    bar();
    draw();
  };
  host.append(grill);

  const fill = el('button', 'mini', 'Fill floor') as HTMLButtonElement;
  fill.id = 'builder-fill';
  fill.onclick = () => {
    grid.tiles.fill(FLOOR);
    // The border ring stays rock: the surface is drawn past the plan, so a
    // floor running off the edge has no wall to end on.
    for (let x = 0; x < grid.width; x++) {
      grid.tiles[at(x, 0)] = WALL;
      grid.tiles[at(x, grid.height - 1)] = WALL;
    }
    for (let y = 0; y < grid.height; y++) {
      grid.tiles[at(0, y)] = WALL;
      grid.tiles[at(grid.width - 1, y)] = WALL;
    }
    changed();
  };
  host.append(fill);

  const wipe = el('button', 'mini', 'Clear') as HTMLButtonElement;
  wipe.id = 'builder-clear';
  wipe.onclick = () => {
    reset();
    changed();
  };
  host.append(wipe);

  const load = el('button', 'mini', 'Load what is written') as HTMLButtonElement;
  load.id = 'builder-load';
  load.onclick = () => {
    try {
      fromPlan(JSON.parse(($('builder-plan') as HTMLTextAreaElement).value) as Plan);
    } catch {
      return;
    }
    tools();
    changed();
  };
  host.append(load);
}

function cellOf(event: MouseEvent): { x: number; y: number } {
  const canvas = $('builder-canvas') as HTMLCanvasElement;
  const box = canvas.getBoundingClientRect();
  return {
    x: Math.floor((event.clientX - box.left) / zoom),
    y: Math.floor((event.clientY - box.top) / zoom),
  };
}

export function isBuilderOpen(): boolean {
  return !$('builder').hidden;
}

export function openBuilder(): void {
  if (!ready && sheets.size === 0) void decode();
  tools();
  bar();
  $('builder').hidden = false;
  changed();
}

export function closeBuilder(): void {
  $('builder').hidden = true;
}

export function initBuilder(): void {
  reset();
  try {
    const kept = globalThis.localStorage?.getItem(KEEP);
    if (kept) fromPlan(JSON.parse(kept) as Plan);
  } catch {
    reset();
  }
  ($('builder-close') as HTMLButtonElement).onclick = closeBuilder;
  const canvas = $('builder-canvas') as HTMLCanvasElement;
  // A DRAG paints: a floor laid one click at a time is a floor nobody lays.
  // The RIGHT button erases whatever the left one is holding, so undoing a
  // stroke never costs a trip back to the palette.
  const stroke = (event: MouseEvent): void => {
    const cell = cellOf(event);
    const held = brush;
    if (rubbing) brush = { kind: 'erase' };
    paint(cell.x, cell.y);
    brush = held;
    changed();
  };
  canvas.onmousedown = (event) => {
    event.preventDefault();
    painting = true;
    rubbing = event.button === 2;
    stroke(event);
  };
  canvas.onmousemove = (event) => {
    if (painting) stroke(event);
  };
  canvas.oncontextmenu = (event) => event.preventDefault();
  globalThis.addEventListener('mouseup', () => {
    painting = false;
    rubbing = false;
  });
}
