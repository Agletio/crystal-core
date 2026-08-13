/**
 * The four portraits, drawn large enough to judge. `PORTRAITS` is the one table
 * with no tool behind it, and art you cannot look at is art you are guessing at.
 *
 * A name draws the PORTRAIT; `name:sprite` draws that creature's two standing
 * frames instead, so a face and the body under it can be judged together.
 *
 * Not part of the suite. `npx tsx tools/face-peek.mts out.png [name,name:sprite]`
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const { PORTRAITS } = await import('../src/render/portraits');
const { BEASTIARY } = await import('../src/render/bestiary');

const CSS = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
const VAR = (name: string): string =>
  new RegExp(`--${name}\\s*:\\s*([^;]+);`).exec(CSS)?.[1].trim() ?? '#f0f';

// Every ink a portrait can mix. Missing one hands `mix` an undefined and kills
// the tool, which is the same trap the model sheet already carries.
const PALETTE = {
  void: VAR('void'), matrix: VAR('matrix'), seam: VAR('seam'), seamLit: VAR('seam-lit'),
  floor: VAR('floor'), floorLit: VAR('floor-lit'), rock: VAR('rock'), rockTop: VAR('rock-top'),
  rockDeep: VAR('rock-deep'), chalk: VAR('chalk'), dust: VAR('dust'), amethyst: VAR('amethyst'),
  citrine: VAR('citrine'), quartz: VAR('quartz'), verdite: VAR('verdite'), ember: VAR('ember'),
  flame: VAR('flame'), flameCore: VAR('flame-core'), rust: VAR('rust'), venom: VAR('venom'),
  bone: VAR('bone'), gloom: VAR('gloom'), flesh: VAR('flesh'), fleshLit: VAR('flesh-lit'),
  gore: VAR('gore'), char: VAR('char'), sinew: VAR('sinew'), rose: VAR('rose'),
  blush: VAR('blush'), lilac: VAR('lilac'), orchid: VAR('orchid'), pearl: VAR('pearl'),
} as never;

const SCALE = 9;
/** The sprite key mixes two palette entries, which portraits do through `mix`. */
const mixHex = (a: string, b: string, t: number): string => {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [ar, ag, ab] = rgb(a);
  const [br, bg, bb] = rgb(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, '0');
  return `#${c(ar, br)}${c(ag, bg)}${c(ab, bb)}`;
};
const want = (process.argv[3] ?? '').split(',').filter(Boolean);
const names = want.length ? want : Object.keys(PORTRAITS);

function cell(rows: string[], key: Record<string, string>, grid: number, label: string): string {
  const px: string[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = key[row[x]];
      if (!c) continue;
      px.push(`<i style="left:${x * SCALE}px;top:${y * SCALE}px;background:${c}"></i>`);
    }
  });
  const w = (rows[0]?.length ?? grid) * SCALE;
  return `<div class="cell"><div class="art" style="width:${w}px;height:${rows.length * SCALE}px">${px.join('')}</div><span>${label}</span></div>`;
}

const cells = names.flatMap((name) => {
  if (name.endsWith(':sprite')) {
    const id = name.slice(0, -7);
    const art = (BEASTIARY as never)[id];
    if (!art) return [`<div class="cell"><span>${id}: NOT IN BEASTIARY</span></div>`];
    const key: Record<string, string> = {
      '#': mixHex(PALETTE.rockDeep, PALETTE.void, 0.6),
      M: art.tone.lit(PALETTE), m: art.tone.mass(PALETTE),
      s: art.tone.shade(PALETTE), e: art.tone.eye(PALETTE),
    };
    return art.frames.map((f: string[], i: number) => cell(f, key, art.grid, `${id} frame ${i}`));
  }
  const art = PORTRAITS[name];
  if (!art) return [`<div class="cell"><span>${name}: NOT IN PORTRAITS</span></div>`];
  const key = art.ink(PALETTE);
  return [cell(art.rows, key, art.grid, name)];
});

const html = `<style>
  body { margin:0; background:${PALETTE.void}; font:12px monospace; color:${PALETTE.dust}; }
  .sheet { display:flex; flex-wrap:wrap; gap:24px; padding:24px; }
  .cell { display:flex; flex-direction:column; align-items:center; gap:8px; }
  .art { position:relative; background:${PALETTE.matrix}; outline:1px solid ${PALETTE.seam}; }
  i { position:absolute; width:${SCALE}px; height:${SCALE}px; }
</style><div class="sheet">${cells.join('')}</div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.setContent(html);
writeFileSync(process.argv[2], await page.screenshot({ fullPage: true }));
await browser.close();
console.log(`face-peek: ${names.join(', ')} -> ${process.argv[2]}`);
