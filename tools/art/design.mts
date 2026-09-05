/**
 * DESIGN CANDIDATES for a body, which is the step before anything is rotated.
 * `design.mts <sprite> [n]` reads the `look` off `bodies.json` and asks that
 * many variants at 128, forced to the roster's shared inks so a design cannot
 * come back in a palette the game does not hold.
 *
 * It writes to `cache/designs/<sprite>-<n>.png` and nothing else: the user
 * picks one, and only then does `body.mts ask` spend the sixty-eight.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GENERATED } from '../../src/render/generated-art';
import { callTool, download, urlsIn } from './mcp.mts';
import { encodePng } from './png.mts';

const here = (p: string): string => join(dirname(fileURLToPath(import.meta.url)), p);
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const words = JSON.parse(readFileSync(here('bodies.json'), 'utf8')) as {
  bodies: { sprite: string; look: string; size?: string }[];
};
const [sprite, howMany = '2'] = process.argv.slice(2);
const row = words.bodies.find((b) => b.sprite === sprite);
if (!row) throw new Error(`no ${sprite} in bodies.json`);

/** THE ROSTER'S INKS ACROSS SEVERAL BODIES, as an image: words alone never
 *  forced a colour, and ONE body's palette is too narrow to design against —
 *  the wanderer's alone is brown, bone and black, so a man asked with crystal
 *  on him came back sepia and a woman in dried blood red came back sepia too.
 *  These four between them hold the sand, the violet and the rot. */
const PALETTE = ['wanderer', 'glasswright', 'shroud', 'smith'];

function swatch(): string {
  const inks = [
    ...new Set(PALETTE.flatMap((id) => Object.values(GENERATED[id]?.key ?? {}))),
  ];
  const cell = 8;
  const across = Math.ceil(Math.sqrt(inks.length));
  const size = across * cell;
  const rgba = new Uint8Array(size * size * 4);
  inks.forEach((hex, i) => {
    const [r, g, b] = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
    const ox = (i % across) * cell;
    const oy = Math.floor(i / across) * cell;
    for (let y = 0; y < cell; y++) {
      for (let x = 0; x < cell; x++) {
        const to = ((oy + y) * size + ox + x) * 4;
        rgba[to] = r; rgba[to + 1] = g; rgba[to + 2] = b; rgba[to + 3] = 255;
      }
    }
  });
  return `data:image/png;base64,${encodePng(size, size, rgba).toString('base64')}`;
}

const dir = here('cache/designs');
mkdirSync(dir, { recursive: true });
const colours = swatch();
const jobs: string[] = [];
for (let n = 0; n < Number(howMany); n++) {
  const out = await callTool('create_image_pixflux', {
    description: row.look,
    width: 128, height: 128, no_background: true,
    view: 'high top-down', direction: 'south',
    outline: 'single color black outline', shading: 'medium shading',
    detail: 'medium detail', text_guidance_scale: 12, color_image_url: colours,
  });
  const job = /([0-9a-f-]{36})/.exec(out)?.[1];
  if (job) jobs.push(job);
  else console.log(`${n}: refused — ${out.slice(0, 140)}`);
}

for (const [n, job] of jobs.entries()) {
  let png: Buffer | null = null;
  for (let go = 0; go < 30 && !png; go++) {
    if (go > 0) await wait(10_000);
    const text = await callTool('get_image', { job_id: job });
    const url = urlsIn(text).find((u) => /\/download$/.test(u)) ?? urlsIn(text)[0];
    if (url) png = await download(url).catch(() => null);
  }
  if (!png) { console.log(`${sprite}-${n}: never arrived`); continue; }
  writeFileSync(`${dir}/${sprite}-${n}.png`, png);
  console.log(`${dir}/${sprite}-${n}.png`);
}
