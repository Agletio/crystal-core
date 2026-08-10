/**
 * A handful of looks, drawn large. `model-sheet.mts` renders everything at a
 * size that answers "is anything broken"; this answers "does this piece read",
 * which is the question every art change actually has.
 *
 * Not part of the suite. `npx tsx tools/model-peek.mts out.png family[,family...]`
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const { lookRows } = await import('../src/render/look');
const { POSE_IDS } = await import('../src/render/pose');
const { DOLL_GRID } = await import('../src/render/gear-art');
const { lookKeyColours, HERO_FRAMES } = await import('../src/render/sprites');

const CSS = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
const VAR = (n: string): string => new RegExp(`--${n}\\s*:\\s*([^;]+);`).exec(CSS)?.[1].trim() ?? '#f0f';
const P = {
  void: VAR('void'), matrix: VAR('matrix'), seam: VAR('seam'), seamLit: VAR('seam-lit'),
  floor: VAR('floor'), floorLit: VAR('floor-lit'), rock: VAR('rock'), rockTop: VAR('rock-top'),
  rockDeep: VAR('rock-deep'), chalk: VAR('chalk'), dust: VAR('dust'), amethyst: VAR('amethyst'),
  citrine: VAR('citrine'), quartz: VAR('quartz'), verdite: VAR('verdite'), ember: VAR('ember'),
  flame: VAR('flame'), flameCore: VAR('flame-core'), rust: VAR('rust'), venom: VAR('venom'),
  bone: VAR('bone'),
} as never;
const KEY: Record<string, string> = lookKeyColours(P);
const HERO_KEY: Record<string, string> = {
  '#': '#241d2b', D: '#4a4048', C: '#6b5f6a', L: '#a9a0ac', F: '#2b2333', E: '#f0c46a',
  P: '#5a4a6a', W: '#6b4a32',
};

const S = 14;
const cell = (rows: string[], label: string, key = KEY): string => {
  const px: string[] = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = key[row[x]];
      if (c) px.push(`<i style="left:${x * S}px;top:${y * S}px;background:${c}"></i>`);
    }
  });
  return `<div class="cell"><div class="art">${px.join('')}</div><span>${label}</span></div>`;
};

const families = (process.argv[3] ?? '').split(',').filter(Boolean);
const looks: Array<[string, unknown]> = [['bare', {}], ['sword', { weapon: { kind: 'steel_sword' } }]];
for (const family of families) {
  for (const tier of [1, 3]) {
    looks.push([
      `${family} t${tier}`,
      {
        helmet: { family, tier }, body: { family, tier },
        gloves: { family, tier }, boots: { family, tier },
        weapon: { kind: 'steel_sword' },
      },
    ]);
  }
}
const rowsHtml =
  `<div class="row"><b>hero</b><div class="poses">` +
  HERO_FRAMES.map((f, i) => cell(f, `f${i}`, HERO_KEY)).join('') +
  `</div></div>` +
  looks
    .map(
      ([label, look]) =>
        `<div class="row"><b>${label}</b><div class="poses">${POSE_IDS.map((p) =>
          cell(lookRows(look as never, p), p)
        ).join('')}</div></div>`
    )
    .join('');

const html = `<!doctype html><meta charset="utf-8"><style>
  body { background:#0d0a10; color:#cfc7d8; font:12px monospace; margin:0; padding:14px; }
  .row { display:flex; align-items:center; gap:12px; margin-bottom:8px; }
  .row > b { width:90px; color:#f0c46a; }
  .poses { display:flex; gap:8px; }
  .art { position:relative; width:${DOLL_GRID * S}px; height:${DOLL_GRID * S}px;
         background:#191320; outline:1px solid #2a2233; }
  .art i { position:absolute; width:${S}px; height:${S}px; }
  .cell span { display:block; font-size:9px; color:#6a5f78; }
</style><div id="s">${rowsHtml}</div>`;

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await b.newPage({ viewport: { width: 1200, height: 900 } });
await page.setContent(html);
const box = (await page.locator('#s').boundingBox())!;
await page.setViewportSize({ width: Math.ceil(box.width) + 30, height: Math.ceil(box.height) + 28 });
writeFileSync(process.argv[2], await page.screenshot({ fullPage: true }));
await b.close();
