/**
 * Armour onto a body that already exists.  `dress.mts <design> [outfit ...]`
 *
 * `edit_image` applies the SAME edit to a LIST of PNGs consistently — the docs
 * say "useful for animation frames or a character's directions" — and bills by
 * the whole frame grid, so a LOOK costs one charge over a finished animation
 * where a second body would cost the animation again. Measured on one design,
 * the man came back the same man at 97.4% and 96.9% silhouette overlap, holding
 * his stance, belt, pouch and feet. Frames cap at 512x512 each.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { callTool, download, fields, urlsIn } from './mcp.mts';

const CACHE = new URL('./cache/designs/', import.meta.url).pathname;

/** The edit DRESSES a man rather than replacing him, and must say so. */
const KEEP =
  'Keep the SAME man, the same face, the same pose, the same proportions and the same ' +
  'grimy palette. Do not replace him. No ground, no floor, no shadow, no base.';

/** A LOOK, not a slot. Few and strongly separated: at the ~87 device pixels the
 *  camera lands a body in, two near-neighbours are the same picture. */
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

const design = process.argv[2];
if (!design) throw new Error('name a design in tools/art/cache/designs');
const want = process.argv.length > 3 ? process.argv.slice(3) : Object.keys(OUTFITS);

const source = `${CACHE}${design}.png`;
if (!existsSync(source)) throw new Error(`${source} is not there — run \`body.mts design\` first`);
const base = readFileSync(source).toString('base64');

for (const name of want) {
  const description = OUTFITS[name];
  if (!description) {
    console.log(`${name}: no such outfit`);
    continue;
  }
  const out = await callTool('edit_image', { images_base64: [base], description, seed: 7 });
  const job = fields(out).job_id ?? /([0-9a-f-]{36})/.exec(out)?.[1];
  if (!job) {
    console.log(`${name}: refused — ${out.slice(0, 200)}`);
    continue;
  }
  console.log(`${name}: job ${job}`);
  let url = '';
  for (let go = 0; go < 40 && !url; go++) {
    await wait(8000);
    const said = await callTool('get_image', { job_id: job });
    url = urlsIn(said).find((u) => /\.png/.test(u)) ?? urlsIn(said)[0] ?? '';
    if (!url.startsWith('http')) url = '';
  }
  if (!url) {
    console.log(`${name}: never arrived`);
    continue;
  }
  writeFileSync(`${CACHE}${design}-${name}.png`, await download(url));
  console.log(`  ${CACHE}${design}-${name}.png`);
}
