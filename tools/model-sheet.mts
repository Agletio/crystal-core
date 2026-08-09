/**
 * Renders the character model to a PNG contact sheet: every pose, with and
 * without each piece, so the art can be judged as a picture rather than as
 * sixteen rows of text.
 *
 * Not part of the suite. `npx tsx tools/model-sheet.mjs [out.png]`.
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const { lookRows } = await import('../src/render/look');
const { POSE_IDS } = await import('../src/render/pose');
const { FAMILY_ART, WEAPON_SHAPE } = await import('../src/render/gear-art');

const KEY = {
  '#': '#141018',
  s: '#c9a07a', e: '#f5d36b', h: '#3a2a26',
  t: '#6b5a72', T: '#4c3f52',
  l: '#4a4050', L: '#37303d',
  b: '#5a4a3a',
  p: '#8f95a6', P: '#c3c9d8', d: '#5f6472',
  c: '#7a6a86', C: '#a99bb5',
  w: '#7a5a3a', W: '#a8845a',
  m: '#9aa2b1', M: '#dfe6f2',
  g: '#b08cd8',
  x: '#8a6b3a', X: '#f0c46a',
};

const SCALE = 10;
const GRID = 16;

function cellHtml(rows, label) {
  const px = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = KEY[row[x]];
      if (!c) continue;
      px.push(`<i style="left:${x * SCALE}px;top:${y * SCALE}px;background:${c}"></i>`);
    }
  });
  return `<div class="cell"><div class="art">${px.join('')}</div><span>${label}</span></div>`;
}

const looks = [
  ['bare', {}],
  ['wand', { weapon: { kind: 'wand' } }],
  ['sword', { weapon: { kind: 'sword' } }],
  ['dagger', { weapon: { kind: 'dagger' } }],
  ['mace', { weapon: { kind: 'mace' } }],
];
for (const family of Object.keys(FAMILY_ART)) {
  for (const tier of [1, 2, 3]) {
    const worn = {
      helmet: { family, tier }, body: { family, tier },
      gloves: { family, tier }, boots: { family, tier },
    };
    looks.push([`${family} t${tier}`, { ...worn, weapon: { kind: 'mace' } }]);
  }
  for (const slot of ['helmet', 'body', 'gloves', 'boots']) {
    looks.push([`${family} ${slot}`, { [slot]: { family, tier: 3 } }]);
  }
}

const rowsHtml = looks
  .map(
    ([label, look]) =>
      `<div class="row"><b>${label}</b><div class="poses">${POSE_IDS.map((p) =>
        cellHtml(lookRows(look, p), p)
      ).join('')}</div></div>`
  )
  .join('');

const html = `<!doctype html><meta charset="utf-8"><style>
  body { background:#0d0a10; color:#cfc7d8; font:12px monospace; margin:0; padding:16px; }
  .row { display:flex; align-items:center; gap:14px; margin-bottom:10px; }
  .row > b { width:120px; color:#f0c46a; }
  .poses { display:flex; gap:10px; }
  .cell { text-align:center; }
  .art { position:relative; width:${GRID * SCALE}px; height:${GRID * SCALE}px;
         background:#191320; outline:1px solid #2a2233; }
  .art i { position:absolute; width:${SCALE}px; height:${SCALE}px; }
  .cell span { display:block; font-size:9px; color:#6a5f78; margin-top:3px; }
</style><div id="sheet">${rowsHtml}</div>`;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 700, height: 800 } });
await page.setContent(html);
const box = await page.locator('#sheet').boundingBox();
await page.setViewportSize({ width: 700, height: Math.ceil(box.height) + 32 });
const shot = await page.screenshot({ fullPage: true });
writeFileSync(process.argv[2] ?? '/tmp/model.png', shot);
await browser.close();
console.log(`${looks.length} looks x ${POSE_IDS.length} poses -> ${process.argv[2] ?? '/tmp/model.png'}`);
