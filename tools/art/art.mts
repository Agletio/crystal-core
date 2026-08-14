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
import { HOUSE_STYLE, HOUSE_WORDS, animateSkeleton, balance, estimateSkeleton, generate } from './pixellab.mts';
import type { Point } from './pixellab.mts';
import { decodePng } from './png.mts';
import { asSource, debackground, toGrid } from './convert.mts';
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
  /** The three the game wants: two of the walk, then the swing. */
  frames?: string[][] | null;
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
  // HOUSE_WORDS is part of the ask, so a change to the look has to invalidate
  // every row the way a changed prompt does.
  const of = { prompt: sprite.prompt + HOUSE_WORDS, look: HOUSE_STYLE, size: sprite.size, seed: sprite.seed, style };
  return createHash('sha256').update(JSON.stringify(of)).digest('hex').slice(0, 16);
}

const pngPath = (hash: string): string => join(CACHE, `${hash}.png`);

/**
 * Two of the walk and a swing, written against the joints the estimator found.
 * Contact has the legs apart, pass brings them under and lifts the body, and
 * the swing throws the right arm forward — the same three `POSES` describes.
 */
function walkPoses(base: Point[]): Point[][] {
  const shift = (by: Record<string, [number, number]>, lift = 0): Point[] =>
    base.map((k) => {
      const d = by[k.label] ?? [0, 0];
      return { ...k, x: k.x + d[0], y: k.y + d[1] - lift };
    });
  const STRIDE = 0.06;
  const contact = shift({
    'LEFT KNEE': [STRIDE, 0], 'LEFT LEG': [STRIDE * 1.6, 0],
    'RIGHT KNEE': [-STRIDE, 0], 'RIGHT LEG': [-STRIDE * 1.6, 0],
    'LEFT ELBOW': [-STRIDE, 0], 'LEFT ARM': [-STRIDE * 1.4, 0],
    'RIGHT ELBOW': [STRIDE, 0], 'RIGHT ARM': [STRIDE * 1.4, 0],
  });
  const pass = shift({}, 0.02);
  const swing = shift({
    'RIGHT SHOULDER': [STRIDE * 0.5, 0],
    'RIGHT ELBOW': [STRIDE * 2, -STRIDE], 'RIGHT ARM': [STRIDE * 3.2, -STRIDE * 1.6],
    'LEFT ELBOW': [-STRIDE, 0], 'LEFT ARM': [-STRIDE * 1.5, 0],
  });
  return [contact, pass, swing];
}

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
      s.rows = toGrid(debackground(decodePng(readFileSync(pngPath(hash)))), s.grid, inksFor(s.tone));
      // The animation frames go through the same reduction, off the PNGs the
      // animate step already paid for: a change here must not cost generations.
      const frames = [0, 1, 2].map((i) => join(CACHE, `${hash}-f${i}.png`));
      if (frames.every((f) => existsSync(f))) {
        s.frames = frames.map((f) =>
          toGrid(debackground(decodePng(readFileSync(f))), s.grid, inksFor(s.tone))
        );
      }
      s.hash = hash;
      write(m);
      const used = new Set(s.rows.join(''));
      console.log(`  ${s.id}: grid ${s.grid}, inks used ${[...used].sort().join('')}`);
    }
    return;
  }

  if (command === 'skeleton') {
    const [s] = pick(m, rest);
    const found = await estimateSkeleton(readFileSync(pngPath(hashOf(s, m.style))));
    console.log(`  ${s.id}: ${found.length} joints`);
    for (const k of found) console.log(`    ${k.label.padEnd(16)} ${k.x.toFixed(1)}, ${k.y.toFixed(1)}`);
    return;
  }

  if (command === 'animate') {
    for (const s of pick(m, rest)) {
      const hash = hashOf(s, m.style);
      const png = readFileSync(pngPath(hash));
      const base = await estimateSkeleton(png);
      console.log(`  ${s.id}: ${base.length} joints -> 3 frames`);
      const made = await animateSkeleton(png, s.size, walkPoses(base), paletteAsk(s.tone));
      s.frames = made.map((frame, i) => {
        writeFileSync(join(CACHE, `${hash}-f${i}.png`), frame);
        return toGrid(debackground(decodePng(frame)), s.grid, inksFor(s.tone));
      });
      write(m);
      console.log(`  ${s.id}: ${s.frames.length} frames converted`);
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
    // Machine-written and never edited by hand: a 256 grid is 65,536 characters
    // a frame, which would bury the hand-drawn table it would otherwise sit in.
    const done = m.sprites.filter((s) => s.accepted && s.frames?.length);
    const body = done
      .map((s) => `  ${s.id}: {\n    grid: ${s.grid},\n    frames: [\n${(s.frames ?? [])
        .map((f) => `      ${asSource(f).replace(/\n/g, '\n      ')},`)
        .join('\n')}\n    ],\n  },`)
      .join('\n');
    writeFileSync(
      new URL('../../src/render/generated-art.ts', import.meta.url).pathname,
      `/**\n * Written by \`tools/art/art.mts emit\`. Do not edit by hand.\n *\n` +
        ` * Every accepted generated creature, as the grids the renderer draws.\n */\n` +
        `export type GeneratedArt = { grid: number; frames: string[][] };\n\n` +
        `export const GENERATED: Record<string, GeneratedArt> = {\n${body}\n};\n`
    );
    console.log(`  emitted ${done.length} to src/render/generated-art.ts`);
    return;
  }

  if (command === 'sheet') {
    await sheet(m, rest[0] ?? '/tmp/art.png', rest.slice(1));
    return;
  }

  throw new Error(`no command "${command}"`);
}

/**
 * The contact sheet, and it draws the CONVERTED grid rather than the PNG: the
 * conversion is lossy and the grid is what ships, so reviewing the PNG reviews
 * something nobody will ever see.
 */
async function sheet(m: Manifest, out: string, only: string[] = []): Promise<void> {
  const { chromium } = await import('playwright');
  const cells = m.sprites
    .filter((s) => s.rows && (!only.length || only.includes(s.id)))
    .map((s, n) => {
      // Per sprite, so a 24 and a 256 land at comparable size on the sheet.
      const SCALE = Math.max(1, Math.round(384 / s.grid));
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
      return `<div class="cell"><div class="art" style="--px:${SCALE}px;width:${s.grid * SCALE}px;height:${s.grid * SCALE}px">${px}</div><span><b>${n + 1}</b> &middot; ${s.id}<br>${mark}</span></div>`;
    })
    .join('');

  const html = `<!doctype html><meta charset="utf-8"><style>
    body { background:#0d0a10; color:#cfc7d8; font:12px monospace; margin:0; padding:16px; }
    #sheet { display:flex; gap:18px; flex-wrap:wrap; }
    .art { position:relative; background:#191320; outline:1px solid #2a2233; }
    .art i { position:absolute; width:var(--px); height:var(--px); }
    .cell span { display:block; text-align:center; font-size:13px; color:#8a7f98; margin-top:6px; }
    .cell b { color:#f0c46a; font-size:18px; }
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
