/**
 * The art pipeline: request, generate, convert, review, accept.
 *
 * `tools/art/manifest.json` is the SOURCE OF TRUTH — a sprite is a row, and
 * generation is a pure function of that row, content-addressed on its hash. So
 * nothing is ever paid for twice, and a diff reads as a row rather than as a
 * wall of binary.
 *
 * The converted GRID is written back into the manifest, which is what makes the
 * PNG disposable: a cloud VM is reclaimed on inactivity and the grid is the
 * artifact.
 *
 *   npx tsx tools/art/art.mts balance
 *   npx tsx tools/art/art.mts list
 *   npx tsx tools/art/art.mts generate [id...]
 *   npx tsx tools/art/art.mts convert  [id...]
 *   npx tsx tools/art/art.mts sheet    [out.png]
 *   npx tsx tools/art/art.mts accept   <id>
 *   npx tsx tools/art/art.mts emit     [id...]
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { balance, generate } from './pixellab.mts';
import { decodePng } from './png.mts';
import { asSource, toGrid } from './convert.mts';
import { inksFor, paletteAsk } from './inks.mts';

type Sprite = {
  id: string;
  prompt: string;
  tone: string;
  grid: number;
  size: number;
  seed: number;
  accepted: boolean;
  rows: string[] | null;
  hash: string | null;
};
type Manifest = { style: number; sprites: Sprite[] };

const here = new URL('.', import.meta.url).pathname;
const MANIFEST = join(here, 'manifest.json');
const CACHE = join(here, 'cache');

const read = (): Manifest => JSON.parse(readFileSync(MANIFEST, 'utf8')) as Manifest;
const write = (m: Manifest): void => writeFileSync(MANIFEST, `${JSON.stringify(m, null, 2)}\n`);

/** What a generation depends on, and nothing else. The grid is a conversion
 *  setting, so changing it must not invalidate a PNG already paid for. */
function hashOf(sprite: Sprite, style: number): string {
  const of = { prompt: sprite.prompt, size: sprite.size, seed: sprite.seed, style };
  return createHash('sha256').update(JSON.stringify(of)).digest('hex').slice(0, 16);
}

const pngPath = (hash: string): string => join(CACHE, `${hash}.png`);

function pick(m: Manifest, ids: string[]): Sprite[] {
  if (!ids.length) return m.sprites;
  return ids.map((id) => {
    const found = m.sprites.find((s) => s.id === id);
    if (!found) throw new Error(`no sprite called "${id}" in the manifest`);
    return found;
  });
}

async function main(): Promise<void> {
  const [command = 'list', ...rest] = process.argv.slice(2);
  const m = read();

  if (command === 'balance') {
    console.log(`$${(await balance()).toFixed(2)} of credit`);
    return;
  }

  if (command === 'list') {
    for (const s of m.sprites) {
      const hash = hashOf(s, m.style);
      const state = s.accepted ? 'accepted' : s.rows ? 'converted' : existsSync(pngPath(hash)) ? 'generated' : 'wanted';
      const stale = s.hash && s.hash !== hash ? '  (row changed since it was generated)' : '';
      console.log(`  ${s.id.padEnd(20)} ${state.padEnd(10)} ${s.size}px -> grid ${s.grid}${stale}`);
    }
    return;
  }

  if (command === 'generate') {
    mkdirSync(CACHE, { recursive: true });
    for (const s of pick(m, rest)) {
      const hash = hashOf(s, m.style);
      if (existsSync(pngPath(hash))) {
        console.log(`  ${s.id}: already generated`);
        continue;
      }
      if (s.size % s.grid !== 0) {
        throw new Error(`${s.id}: ${s.size}px does not divide into a ${s.grid} grid`);
      }
      console.log(`  ${s.id}: generating...`);
      const png = await generate({
        description: s.prompt,
        size: s.size,
        seed: s.seed,
        inks: paletteAsk(s.tone),
      });
      writeFileSync(pngPath(hash), png);
      s.hash = hash;
      write(m);
      console.log(`  ${s.id}: ${png.length} bytes -> cache/${hash}.png`);
    }
    return;
  }

  if (command === 'convert') {
    for (const s of pick(m, rest)) {
      const hash = hashOf(s, m.style);
      if (!existsSync(pngPath(hash))) {
        console.log(`  ${s.id}: nothing generated for this row yet`);
        continue;
      }
      s.rows = toGrid(decodePng(readFileSync(pngPath(hash))), s.grid, inksFor(s.tone));
      s.hash = hash;
      write(m);
      const used = new Set(s.rows.join(''));
      console.log(`  ${s.id}: grid ${s.grid}, inks used ${[...used].sort().join('')}`);
    }
    return;
  }

  if (command === 'accept') {
    const [id] = rest;
    const [s] = pick(m, [id]);
    if (!s.rows) throw new Error(`${id} has not been converted, so there is nothing to accept`);
    s.accepted = true;
    write(m);
    console.log(`  ${id}: accepted`);
    return;
  }

  if (command === 'emit') {
    for (const s of pick(m, rest)) {
      if (!s.rows) continue;
      console.log(`\n// ${s.id}\n${asSource(s.rows)}`);
    }
    return;
  }

  if (command === 'sheet') {
    await sheet(m, rest[0] ?? '/tmp/art.png');
    return;
  }

  throw new Error(`no command "${command}"`);
}

/**
 * The contact sheet, and it draws the CONVERTED grid rather than the PNG: the
 * conversion is lossy and the grid is what ships, so reviewing the PNG reviews
 * something nobody will ever see.
 */
async function sheet(m: Manifest, out: string): Promise<void> {
  const { chromium } = await import('playwright');
  const SCALE = 10;
  const cells = m.sprites
    .filter((s) => s.rows)
    .map((s) => {
      const inks = inksFor(s.tone) as Record<string, string>;
      const px = (s.rows ?? [])
        .flatMap((row, y) =>
          [...row].map((c, x) =>
            c === '.'
              ? ''
              : `<i style="left:${x * SCALE}px;top:${y * SCALE}px;background:${inks[c]}"></i>`
          )
        )
        .join('');
      const mark = s.accepted ? 'accepted' : 'not accepted';
      return `<div class="cell"><div class="art" style="width:${s.grid * SCALE}px;height:${s.grid * SCALE}px">${px}</div><span>${s.id}<br>${mark}</span></div>`;
    })
    .join('');

  const html = `<!doctype html><meta charset="utf-8"><style>
    body { background:#0d0a10; color:#cfc7d8; font:12px monospace; margin:0; padding:16px; }
    #sheet { display:flex; gap:18px; flex-wrap:wrap; }
    .art { position:relative; background:#191320; outline:1px solid #2a2233; }
    .art i { position:absolute; width:${SCALE}px; height:${SCALE}px; }
    .cell span { display:block; text-align:center; font-size:10px; color:#6a5f78; margin-top:5px; }
  </style><div id="sheet">${cells || '<b>nothing converted yet</b>'}</div>`;

  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });
  await page.setContent(html);
  const box = await page.locator('#sheet').boundingBox();
  await page.setViewportSize({
    width: Math.ceil(box?.width ?? 900) + 40,
    height: Math.ceil(box?.height ?? 500) + 32,
  });
  writeFileSync(out, await page.screenshot({ fullPage: true }));
  await browser.close();
  console.log(`  sheet -> ${out}`);
}

await main();
