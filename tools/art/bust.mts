/**
 * A FACE FOR THE BUBBLE. `bust.mts <sprite> [n]` — the head and shoulders of a
 * body that already SHIPS, asked with that body's own inks as a swatch, which
 * is the only thing that forces a colour. So a portrait cannot drift from the
 * model it stands for, the same rule `cast.mts` is under.
 *
 * It writes PNGs to `cache/designs/<sprite>-bust-<n>.png` and nothing else:
 * the one you judge goes in with `portrait.mts <sprite> <that file>`.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GENERATED } from '../../src/render/generated-art';
import { callTool, download, urlsIn } from './mcp.mts';
import { encodePng } from './png.mts';

const here = (p: string): string => join(dirname(fileURLToPath(import.meta.url)), p);
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const [sprite, howMany = '2'] = process.argv.slice(2);
const art = GENERATED[sprite];
if (!art) throw new Error(`no shipped body ${sprite} — import it first`);

/** The body's own inks, as an image. */
function swatch(): string {
  const inks = [...new Set(Object.values(art.key))];
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

const SAY: Record<string, string> = {
  smith: 'The HEAD AND SHOULDERS ONLY of a broad heavy bald man with a heavy jaw and a short blunt '
    + 'beard, seen from the FRONT at eye level, filling the frame: soot on the cheekbones, the neck '
    + 'and shoulders thick, the top of a scorched dark leather apron strap across one shoulder. '
    + 'Soot-black and dull umber, iron grey. Lit from one side. NOT a full body, NOT the legs, '
    + 'NOT anime, NOT manga, NOT chibi, NOT cute, NOT a helmet, NOT armour, NOT a hood. '
    + 'No ground, no shadow, no anvil, no hammer, no other objects.',
};

const say = SAY[sprite];
if (!say) throw new Error(`no bust wording for ${sprite} — add one to SAY`);

const dir = here('cache/designs');
mkdirSync(dir, { recursive: true });
const colours = swatch();
const jobs: string[] = [];
for (let n = 0; n < Number(howMany); n++) {
  const out = await callTool('create_image_pixflux', {
    description: say, width: 128, height: 128, no_background: true,
    view: 'side', direction: 'south',
    outline: 'single color black outline', shading: 'detailed shading',
    detail: 'highly detailed', text_guidance_scale: 12, color_image_url: colours,
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
  if (!png) { console.log(`${sprite}-bust-${n}: never arrived`); continue; }
  writeFileSync(`${dir}/${sprite}-bust-${n}.png`, png);
  console.log(`${dir}/${sprite}-bust-${n}.png`);
}
