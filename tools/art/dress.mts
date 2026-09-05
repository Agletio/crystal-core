/**
 * Armour onto a body that already exists.
 *   `dress.mts <outfit> <image> [image ...]`      one edit over a list of frames
 *   `dress.mts <outfit> --state <character-id> [label]`  every rotation of a character
 *
 * `edit_image` applies the SAME edit to a LIST of PNGs and bills by the frame
 * grid, and the man comes back the same man at 97% silhouette overlap. But it is
 * consistent only WITHIN one call, and a call takes 4 frames at 96 — four
 * facings dressed together got one brimmed helm and the fifth, sent alone, came
 * back visored. So the list form cannot dress a body.
 *
 * A state INHERITS THE SKELETON, so it animates like any other body — which is
 * what makes a whole LOOK 40 generations rather than a second character.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { callTool, download, fields, urlsIn } from './mcp.mts';
import { decodePng } from './png.mts';

const CACHE = new URL('./cache/designs/', import.meta.url).pathname;

/** The edit DRESSES a man rather than replacing him, and must say so. */
const KEEP =
  'Keep the SAME man, the same face, the same pose, the same proportions and the same ' +
  'palette. Do not replace him. No ground, no floor, no shadow, no base.';

/** One entry is one whole LOOK, and a look is what a TRADE looks like. At the
 *  ~87 device pixels the camera lands a body in, two near-neighbours are the
 *  same picture, so what separates them has to be SILHOUETTE. */
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

/** Every weapon, said the SAME way for every hero who carries it — the words
 *  are `weapons.json` and are never rewritten per body. A weapon written afresh
 *  per man is a weapon that looks different per man. */
const WORDS = JSON.parse(
  readFileSync(new URL('./weapons.json', import.meta.url), 'utf8')
) as {
  keep: string;
  pale: string;
  weapons: Record<string, { say: string; pale?: boolean }>;
};

/** The server refuses an `edit_description` over this OUTRIGHT. It refuses
 *  before billing, but a refusal in a batch of seven is seven runs wasted. */
const SAY_MAX = 1000;

for (const [id, row] of Object.entries(WORDS.weapons)) {
  const said = [row.say, row.pale === false ? '' : WORDS.pale, WORDS.keep].filter(Boolean).join(' ');
  if (said.length > SAY_MAX) {
    throw new Error(`${id}: ${said.length} characters of ask, and ${SAY_MAX} is the ceiling`);
  }
  OUTFITS[id] = said;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const name = process.argv[2];
const description = OUTFITS[name];
if (!description) throw new Error(`name an outfit: ${Object.keys(OUTFITS).join(', ')}`);
// A RE-DRESS MUST BE A DIFFERENT DRAW: one came back facing backwards.
const seedAt = process.argv.indexOf('--seed');
const seed = seedAt > 0 ? Number(process.argv[seedAt + 1]) : 7;
const frames = process.argv.slice(3).filter((a, i, all) =>
  a !== '--seed' && all[i - 1] !== '--seed'
);
if (!frames.length) throw new Error('name at least one image in tools/art/cache/designs');

function path(f: string): string {
  const found = f.includes('/') ? f : `${CACHE}${f}.png`;
  if (!existsSync(found)) throw new Error(`${found} is not there`);
  return found;
}

/** The east half of the compass, which is every facing the renderer needs. */
const DIRS = ['north', 'north-east', 'east', 'south-east', 'south'];

if (frames[0] === '--state') {
  const source = frames[1];
  if (!source) throw new Error('--state wants a character id');
  // A LABEL: one outfit is worn by more than one man now, and without it both
  // heroes' maces are called `mace` and land on each other's cache files.
  const label = frames[2] ?? name;
  const made = await callTool('create_character_state', {
    character_id: source,
    state_name: label,
    edit_description: description,
    seed,
  });
  const id = fields(made).id;
  if (!id) throw new Error(`${name}: refused — ${made.slice(0, 300)}`);
  console.log(`${name}: state ${id} of ${source}`);

  let said = '';
  for (let go = 0; go < 60; go++) {
    said = await callTool('get_character', { character_id: id });
    if (!/status: (creating|processing)/.test(said)) break;
    await wait(20_000);
  }
  for (const dir of DIRS) {
    const url = new RegExp(`^ {2}${dir}: (https\\S+)$`, 'm').exec(said);
    if (!url) throw new Error(`${name}: no ${dir} rotation`);
    writeFileSync(`${CACHE}${label}-${dir}.png`, await download(url[1]));
    console.log(`  ${CACHE}${label}-${dir}.png`);
  }
  process.exit(0);
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
    seed,
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
