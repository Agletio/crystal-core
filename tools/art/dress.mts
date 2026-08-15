/**
 * Armour onto a body that already exists.  `dress.mts <outfit> <image> [image ...]`
 *
 * `edit_image` applies the SAME edit to a LIST of PNGs — the docs say "useful
 * for animation frames or a character's directions" — and bills by the whole
 * frame grid. Measured on one design, the man came back the same man at 97.4%
 * and 96.9% silhouette overlap, holding his stance, belt, pouch and feet.
 *
 * The edit REPAINTS the whole frame doing it, so what comes back is not a piece.
 * `layer.mts` is the other half: it cuts the slot's band out.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { callTool, download, fields, urlsIn } from './mcp.mts';
import { decodePng } from './png.mts';

const CACHE = new URL('./cache/designs/', import.meta.url).pathname;

/** The edit DRESSES a man rather than replacing him, and must say so. */
const KEEP =
  'Keep the SAME man, the same face, the same pose, the same proportions and the same ' +
  'grimy palette. Do not replace him. No ground, no floor, no shadow, no base.';

/** One outfit is one SLOT's worth: only the band `layer.mts` cuts is kept, so
 *  what an outfit says about the rest of the body is thrown away anyway. */
export const OUTFITS: Record<string, string> = {
  helm:
    'Put a battered open-faced iron helm on his head, over or instead of the hood. Change NOTHING ' +
    'below the neck: the same tattered tunic, the same rope belt, the same hip pouch, the same ' +
    'rag-bound shins, the same worn-through boots, every one of them exactly as they are. The helm ' +
    'is dull pitted grey-brown iron, NOT shiny, NOT silver, NOT gold. ' + KEEP,
  mail:
    'Put a rusted iron mail hauberk on him over the tattered clothes, a battered open-faced ' +
    'iron helm, and worn leather bracers at the forearms. The mail is dull pitted grey-brown ' +
    'iron, NOT shiny, NOT silver, NOT gold. ' + KEEP,
  plate:
    'Put heavy dark plate armour on him over the tattered clothes: a breastplate, shoulder ' +
    'pauldrons, a closed visored helm and steel greaves. Dark scarred iron, NOT shiny, ' +
    'NOT silver, NOT gold, NOT ornate. ' + KEEP,
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const name = process.argv[2];
const description = OUTFITS[name];
if (!description) throw new Error(`name an outfit: ${Object.keys(OUTFITS).join(', ')}`);
const frames = process.argv.slice(3);
if (!frames.length) throw new Error('name at least one image in tools/art/cache/designs');

function path(f: string): string {
  const found = f.includes('/') ? f : `${CACHE}${f}.png`;
  if (!existsSync(found)) throw new Error(`${found} is not there`);
  return found;
}
const images = frames.map((f) => readFileSync(path(f)).toString('base64'));

// How many frames one charge covers is a step of the frame's own SIZE — the
// grid is 512x512 laid out 4x4, 2x2 or 1x1 — and that is what a piece really
// costs. The server refuses the 5th at 96 before billing rather than truncating.
const PER_CALL = (size: number) => (size <= 64 ? 16 : size <= 128 ? 4 : 1);

const first = decodePng(readFileSync(path(frames[0])));
const chunk = PER_CALL(Math.max(first.width, first.height));
console.log(`${name}: ${frames.length} frame(s) at ${first.width}x${first.height}, ${chunk} a call`);

for (let from = 0; from < frames.length; from += chunk) {
  const batch = frames.slice(from, from + chunk);
  const out = await callTool('edit_image', {
    images_base64: images.slice(from, from + chunk),
    description,
    seed: 7,
  });
  const job = fields(out).job_id ?? /([0-9a-f-]{36})/.exec(out)?.[1];
  if (!job) throw new Error(`${name}: refused — ${out.slice(0, 300)}`);
  console.log(`  job ${job} over ${batch.length}`);

  // A multi-frame result is ONE indexed download rather than a url per frame,
  // and the index form is the only way to reach frames 1..n.
  let urls: string[] = [];
  for (let go = 0; go < 60 && !urls.length; go++) {
    await wait(8000);
    const said = await callTool('get_image', { job_id: job });
    const got = /^download: (https\S+?)(\?index=0)?(?:\s|$)/m.exec(said);
    const count = Number(fields(said).frames ?? 0);
    if (got && count) urls = Array.from({ length: count }, (_, i) => (count > 1 ? `${got[1]}?index=${i}` : got[1]));
    else urls = urlsIn(said).filter((u) => /\.png/.test(u) && u.startsWith('http'));
  }
  if (!urls.length) throw new Error(`${name}: batch at ${from} never arrived`);
  if (urls.length !== batch.length) console.log(`  ASKED ${batch.length}, GOT ${urls.length}`);

  for (const [n, url] of urls.entries()) {
    const stem = (batch[n] ?? `frame${from + n}`).split('/').pop()!.replace(/\.png$/, '');
    writeFileSync(`${CACHE}${stem}-${name}.png`, await download(url));
    console.log(`  ${CACHE}${stem}-${name}.png`);
  }
}
