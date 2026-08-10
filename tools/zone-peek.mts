/**
 * Every zone, drawn the way the game draws it: the same palette, the same pure
 * decal functions, a real generated map. A tileset is a look, and a look can
 * only be judged as a picture.
 *
 * Not part of the suite. `npx tsx tools/zone-peek.mts out.png [tiles]`
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const { generateMap, WALL } = await import('../src/sim/grid');
const { Rng } = await import('../src/rng');
const { MAP_THEMES } = await import('../src/data');
const { paletteFrom, floorPalette, floorColour, tileDecals, isWallFace, livingDecals } =
  await import('../src/render/renderer');

const CSS = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
const PALETTE = paletteFrom(
  (v: string) => new RegExp(`${v}\\s*:\\s*([^;]+);`).exec(CSS)?.[1] ?? ''
);

const PX = Number(process.argv[3] ?? 14);
const SPAN = Number(process.argv[5] ?? 30);

function panel(theme: string, name: string): string {
  const map = generateMap([], new Rng(7), 3, 3, theme as never);
  const { grid } = map;
  const floor = floorPalette(PALETTE, map.vein, theme as never);
  const at = (x: number, y: number) => grid.at(x, y);
  const cx = Math.max(0, Math.round(map.entrance.x) - SPAN / 2);
  const cy = Math.max(0, Math.round(map.entrance.y) - SPAN / 2);

  const rects: string[] = [];
  const box = (x: number, y: number, w: number, h: number, c: string, a = 1) =>
    rects.push(
      `<i style="left:${x * PX}px;top:${y * PX}px;width:${w * PX}px;height:${h * PX}px;background:${c};opacity:${a}"></i>`
    );

  for (let y = cy; y < cy + SPAN; y++) {
    for (let x = cx; x < cx + SPAN; x++) {
      const tile = grid.at(x, y);
      if (tile === WALL && !isWallFace(at, x, y)) continue;
      box(x - cx, y - cy, 1.02, 1.02, floorColour(floor, tile, x, y));
    }
  }
  for (let y = cy; y < cy + SPAN; y++) {
    for (let x = cx; x < cx + SPAN; x++) {
      for (const d of tileDecals(floor, at, x, y)) {
        box(x - cx + d.x, y - cy + d.y, d.w, d.h, d.colour, d.alpha);
      }
      for (const d of livingDecals(floor, at, x, y, Number(process.argv[4] ?? 0))) {
        box(x - cx + d.x, y - cy + d.y, d.w, d.h, d.colour, d.alpha);
      }
    }
  }
  return `<div class="zone"><b>${name}</b><div class="map">${rects.join('')}</div></div>`;
}

const body = MAP_THEMES.map((t: { id: string; name: string }) => panel(t.id, t.name)).join('');
const html = `<!doctype html><meta charset="utf-8"><style>
  body { background:#0C0B0E; color:#877F8C; font:12px monospace; margin:0; padding:12px;
         display:flex; gap:12px; flex-wrap:wrap; }
  .zone b { display:block; color:#D9A441; margin-bottom:4px; }
  .map { position:relative; width:${SPAN * PX}px; height:${SPAN * PX}px; background:#2A2722; }
  .map i { position:absolute; }
</style><div id="s" style="display:flex;gap:12px">${body}</div>`;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await b.newPage({ viewport: { width: 2200, height: 700 } });
await page.setContent(html);
const at = (await page.locator('#s').boundingBox())!;
await page.setViewportSize({ width: Math.ceil(at.width) + 26, height: Math.ceil(at.height) + 26 });
writeFileSync(process.argv[2], await page.screenshot({ fullPage: true }));
await b.close();
