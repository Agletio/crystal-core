/**
 * A UI ICON, asked for and downloaded.   `icon.mts [<words>.json] [id ...]`
 *
 * `icons.json` beside this is what to SAY, one row per id, so an icon can be
 * re-asked or re-rolled without anybody reconstructing the words. Naming ids
 * asks for THOSE; naming nothing asks for every row with no PNG cached yet. A
 * words-file carries its own framing, palette and size, so `vfx.json` is this
 * same tool asking for something that is not an icon at all.
 *
 * It stops at the download. `portrait.mts <id> <png> 48 icons` puts one in a
 * table: a portrait, an icon and an effect are one problem — one PNG, no rig.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { callTool, download, fields } from './mcp.mts';
import { encodePng } from './png.mts';

const here = (file: string): string => new URL(`./${file}`, import.meta.url).pathname;
const CACHE = here('cache/designs');

const args = process.argv.slice(2);
const words = args[0]?.endsWith('.json') ? args.shift()! : 'icons.json';

const asks = JSON.parse(readFileSync(here(words), 'utf8')) as {
  size: number;
  how: string;
  inks: string[];
  icons: { id: string; say: string; size?: number }[];
};

/** The forced palette, as an image: only its colours are read. */
function palette(): string {
  const S = 8, w = asks.inks.length * S, px = new Uint8Array(w * S * 4);
  asks.inks.forEach((hex, i) => {
    const [r, g, b] = [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16));
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const d = (y * w + i * S + x) * 4;
      px[d] = r; px[d + 1] = g; px[d + 2] = b; px[d + 3] = 255;
    }
  });
  return `data:image/png;base64,${encodePng(w, S, px).toString('base64')}`;
}

const want = new Set(args);
const todo = asks.icons.filter((i) =>
  want.size ? want.has(i.id) : !existsSync(`${CACHE}/${i.id}.png`)
);

// The generator caps at TEN jobs in flight and REFUSES the rest outright, so a
// batch bigger than that silently comes back short. They go in tens.
const jobs: [string, string][] = [];
for (const ask of todo.slice(0, 10)) {
  const out = await callTool('create_image_pixflux', {
    description: ask.say + asks.how,
    width: ask.size ?? asks.size, height: ask.size ?? asks.size,
    no_background: true, view: 'side',
    outline: 'single color black outline', shading: 'medium shading', detail: 'medium detail',
    text_guidance_scale: 13, color_image_url: palette(),
  });
  const job = fields(out).job_id ?? /([0-9a-f-]{36})/.exec(out)?.[1];
  if (job) jobs.push([ask.id, job]);
  else console.log(`${ask.id}: refused — ${out.slice(0, 160)}`);
}
if (todo.length > 10) console.log(`${todo.length - 10} left over — run again once these land`);

for (const [name, job] of jobs) {
  let url = '';
  for (let go = 0; go < 60 && !url; go++) {
    await new Promise((r) => setTimeout(r, 8000));
    const f = fields(await callTool('get_image', { job_id: job }));
    url = (f.image_url ?? f.download ?? '').split(/\s+/)[0];
    if (!url.startsWith('http')) url = '';
  }
  if (!url) { console.log(`${name}: never arrived`); continue; }
  writeFileSync(`${CACHE}/${name}.png`, await download(url));
  console.log(`${name}.png`);
}
