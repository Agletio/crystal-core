/**
 * Renders the character model to a PNG contact sheet: every pose, with and
 * without each piece, so the art can be judged as a picture rather than as
 * sixteen rows of text.
 *
 * Not part of the suite. `npx tsx tools/model-sheet.mjs [out.png]`.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const { lookRows } = await import('../src/render/look');
const { POSE_IDS } = await import('../src/render/pose');
const { DOLL_GRID, FAMILY_ART, WEAPON_ART } = await import('../src/render/gear-art');
const { roleChar } = await import('../src/render/look');
const { BEASTIARY, HALO, haloed } = await import('../src/render/bestiary');
const { lookKeyColours } = await import('../src/render/sprites');


/**
 * The game's own palette, read out of its stylesheet, and the game's own key
 * table. A sheet with colours of its own flatters art the game draws darker.
 */
const CSS = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
const VAR = (name: string): string =>
  new RegExp(`--${name}\\s*:\\s*([^;]+);`).exec(CSS)?.[1].trim() ?? '#f0f';
const PALETTE = {
  void: VAR('void'), matrix: VAR('matrix'), seam: VAR('seam'), seamLit: VAR('seam-lit'),
  floor: VAR('floor'), floorLit: VAR('floor-lit'), rock: VAR('rock'), rockTop: VAR('rock-top'),
  rockDeep: VAR('rock-deep'), chalk: VAR('chalk'), dust: VAR('dust'), amethyst: VAR('amethyst'),
  citrine: VAR('citrine'), quartz: VAR('quartz'), verdite: VAR('verdite'), ember: VAR('ember'),
  flame: VAR('flame'), flameCore: VAR('flame-core'), rust: VAR('rust'), venom: VAR('venom'),
  bone: VAR('bone'),
} as never;
const KEY: Record<string, string> = lookKeyColours(PALETTE);

const SCALE = 12;
const GRID = DOLL_GRID;

function cellHtml(rows, label, key = KEY) {
  const px = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = key[row[x]];
      if (!c) continue;
      px.push(`<i style="left:${x * SCALE}px;top:${y * SCALE}px;background:${c}"></i>`);
    }
  });
  return `<div class="cell"><div class="art" style="width:${(rows[0]?.length ?? GRID) * SCALE}px;height:${rows.length * SCALE}px">${px.join('')}</div><span>${label}</span></div>`;
}

const sets: Array<[string, any]> = [['bare', {}]];
const arms: Array<[string, any]> = Object.keys(WEAPON_ART).map((id) => [id, { weapon: { kind: id } }]);
const pieces: Array<[string, any]> = [];
for (const family of Object.keys(FAMILY_ART)) {
  for (const tier of [1, 2, 3]) {
    const worn = {
      helmet: { family, tier }, body: { family, tier },
      gloves: { family, tier }, boots: { family, tier },
    };
    sets.push([`${family} t${tier}`, { ...worn, weapon: { kind: 'steel_sword' } }]);
  }
  for (const slot of ['helmet', 'body', 'gloves', 'boots']) {
    pieces.push([`${family} ${slot}`, { [slot]: { family, tier: 3 } }]);
  }
}

const sheet = (looks: Array<[string, any]>) => looks
  .map(
    ([label, look]) =>
      `<div class="row"><b>${label}</b><div class="poses">${POSE_IDS.map((p) =>
        cellHtml(lookRows(look, p), p)
      ).join('')}</div></div>`
  )
  .join('');

const page1 = sheet(sets);
const page2 = sheet(arms);

/** Every family side by side at one rung, for judging the range at a glance. */
const overview = (tier: number) =>
  Object.keys(FAMILY_ART)
    .map((family) => {
      const look = {
        helmet: { family, tier }, body: { family, tier },
        gloves: { family, tier }, boots: { family, tier },
        weapon: { kind: 'steel_sword' },
      };
      return `<div class="cell">${cellHtml(lookRows(look, 'walk0'), family)}</div>`;
    })
    .join('');
const page3 = [1, 2, 3]
  .map((t) => `<div class="row"><b>tier ${t}</b><div class="poses">${overview(t)}</div></div>`)
  .join('');

const html = (body: string) => `<!doctype html><meta charset="utf-8"><style>
  body { background:#0d0a10; color:#cfc7d8; font:12px monospace; margin:0; padding:16px; }
  .row { display:flex; align-items:center; gap:14px; margin-bottom:10px; }
  .row > b { width:120px; color:#f0c46a; }
  .poses { display:flex; gap:10px; }
  .cell { text-align:center; }
  .art { position:relative; width:${GRID * SCALE}px; height:${GRID * SCALE}px;
         background:#191320; outline:1px solid #2a2233; }
  .art i { position:absolute; width:${SCALE}px; height:${SCALE}px; }
  .cell span { display:block; font-size:9px; color:#6a5f78; margin-top:3px; }
</style><div id="sheet">${body}</div>`;

const out = process.argv[2] ?? '/tmp/model.png';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
/** A creature's own inks, the way monsterArt builds them for the game. */
const beastKey = (art: any, rank: string): Record<string, string> => ({
  ...KEY,
  M: art.tone.lit(PALETTE),
  m: art.tone.mass(PALETTE),
  s: art.tone.shade(PALETTE),
  e: art.tone.eye(PALETTE),
  x:
    rank === 'rare'
      ? '#ffffff'
      : rank === 'magic'
        ? art.tone.eye(PALETTE)
        : art.tone.shade(PALETTE),
  b: '#cfe0f5',
  o: '#f0c46a',
});

/** Every creature at every rank, which is the only view that judges a halo. */
const RANKS = ['common', 'magic', 'rare'] as const;
const page4 = Object.entries(BEASTIARY)
  .map(
    ([id, art]) =>
      `<div class="row"><b>${id}</b><div class="poses">` +
      RANKS.map((r) =>
        [0, 1, 2]
          .map((f) => cellHtml(haloed(f === 2 ? (art.attack ?? art.frames[0]) : art.frames[f], HALO[r]), `${r} ${f}`, beastKey(art, r)))
          .join('')
      ).join('') +
      `</div></div>`
  )
  .join('');

for (const [body, file] of [
  [page4, out.replace('.png', '-beasts.png')],
  [page3, out.replace('.png', '-all.png')],
  [page1, out],
  [page2, out.replace('.png', '-arms.png')],
]) {
  await page.setContent(html(body));
  const box = await page.locator('#sheet').boundingBox();
  await page.setViewportSize({ width: Math.ceil(box.width) + 40, height: Math.ceil(box.height) + 32 });
  writeFileSync(file, await page.screenshot({ fullPage: true }));
}
await browser.close();
console.log(`${sets.length} sets, ${arms.length} weapons x ${POSE_IDS.length} poses -> ${out}`);
