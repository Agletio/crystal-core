/**
 * THE CAST HALL'S PICTURE, one per hero. `cast.mts <sprite…> [n]`
 *
 * A hero's card is a still at 128 rather than his 48-grid body magnified, so
 * the one screen that shows a man at four times his ship size shows a drawing
 * made for it. The words are the body's OWN `look`, and the palette is forced
 * with the body's OWN inks — `design` forces the roster's shared one, which is
 * why asking a blue-robed man's words came back brown. Same words, same
 * colours: the picture cannot drift from the model it stands for.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { loose } from './convert.mts';
import { callTool, download, fields } from './mcp.mts';
import { decodePng, encodePng } from './png.mts';
import { GENERATED } from '../../src/render/generated-art';

const here = (file: string): string => new URL(`./${file}`, import.meta.url).pathname;
const asks = JSON.parse(readFileSync(here('bodies.json'), 'utf8'));
const args = process.argv.slice(2);
const many = Number(args.at(-1)) > 0 ? Number(args.pop()) : 2;
const dir = here('cache/designs');
mkdirSync(dir, { recursive: true });

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** The body's inks as an image, which is the only thing that forces colour. */
function swatch(sprite: string): string {
  const art = GENERATED[sprite];
  if (!art) throw new Error(`no shipped body ${sprite}`);
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

for (const sprite of args) {
  const body = asks.bodies.find((b: { sprite: string; look?: string }) => b.sprite === sprite && b.look);
  if (!body) { console.log(`${sprite}: no design row`); continue; }
  const colours = swatch(sprite);
  const jobs: string[] = [];
  for (let n = 0; n < many; n++) {
    const out = await callTool('create_image_pixflux', {
      description: body.look,
      width: 128,
      height: 128,
      no_background: true,
      view: 'high top-down',
      direction: body.face ?? asks.face,
      outline: 'single color black outline',
      shading: 'detailed shading',
      detail: 'highly detailed',
      text_guidance_scale: 12,
      color_image_url: colours,
    });
    const job = fields(out).job_id ?? /([0-9a-f-]{36})/.exec(out)?.[1];
    if (job) jobs.push(job);
    else console.log(`${sprite}-${n}: refused — ${out.slice(0, 160)}`);
  }
  for (const [n, job] of jobs.entries()) {
    let url = '';
    for (let go = 0; go < 30 && !url; go++) {
      if (go > 0) await wait(10_000);
      const f = fields(await callTool('get_image', { job_id: job }));
      url = (f.image_url ?? f.download ?? '').split(/\s+/)[0];
      if (!url.startsWith('http')) url = '';
    }
    if (!url) { console.log(`cast-${sprite}-${n}: never arrived`); continue; }
    const [joined] = loose(decodePng(await download(url)));
    writeFileSync(`${dir}/cast-${sprite}-${n}.png`, encodePng(joined.width, joined.height, joined.rgba));
    console.log(`${dir}/cast-${sprite}-${n}.png`);
  }
}
