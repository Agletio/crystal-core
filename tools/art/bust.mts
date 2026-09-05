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
import { readFileSync } from 'node:fs';
import { decodePng } from './png.mts';
import { encodePng } from './png.mts';

const here = (p: string): string => join(dirname(fileURLToPath(import.meta.url)), p);
const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const words = JSON.parse(readFileSync(here('faces.json'), 'utf8')) as {
  how: string;
  inks: string[];
};
const FACE_INKS = words.inks;

const [sprite, howMany = '2'] = process.argv.slice(2);
const art = GENERATED[sprite];
const design = process.argv[4];
if (!art && !design) throw new Error(`no shipped body ${sprite} — import it, or pass its design png`);

/** Every distinct opaque colour in a design, commonest first. */
function fromPng(file: string): string[] {
  const { rgba } = decodePng(readFileSync(file));
  const seen = new Map<string, number>();
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 40) continue;
    const hex = `#${[0, 1, 2].map((k) => rgba[i + k].toString(16).padStart(2, '0')).join('')}`;
    seen.set(hex, (seen.get(hex) ?? 0) + 1);
  }
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([hex]) => hex);
}

/** THE FACE PALETTE AND THE BODY'S, TOGETHER. The body's alone is what made
 *  the smith a grey slab: his are soot and umber, and a face asked with no
 *  skin in the swatch comes back with no skin in it. `faces.json` holds the
 *  roster's shared face inks, which is why the four asked through it have
 *  colour; his own are still in there, so the portrait cannot drift off him. */
function swatch(): string {
  const own = art ? Object.values(art.key) : fromPng(design!);
  const inks = [...new Set([...FACE_INKS, ...own])];
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
  osteomancer: 'a SMALL STOOPED creature that used to be a man, seen from the FRONT at eye level '
    + 'with his head and narrow shoulders filling the frame: a bald domed head with a few long lank '
    + 'strands of dark hair, ENORMOUS thin pointed ears, huge round wet eyes set wide under a high '
    + 'brow, a small NOSE, hollow cheeks and a thin lipless-looking MOUTH WITH LIPS drawn back off '
    + 'small teeth in a wary half-grin. His SKIN is bare, taut and DRIED BLOOD RED going to rot '
    + 'brown in the hollows, cracked like meat left to dry. A cord of small pale finger bones round '
    + 'the scrawny neck. Cunning and frightened at once — the expression is the subject. '
    + 'NOT A SKULL, NOT a skeleton, NOT undead, NOT bone showing on the head, NOT eye sockets, '
    + 'NOT green, NOT grey, NOT a goblin snout, NOT cute, NOT a helmet, NOT a hood.',
  smith: 'a broad heavy BALD man with a heavy jaw, a short blunt dark beard and RUDDY WEATHERED '
    + 'SKIN, forge-burnt across the cheekbones and soot-marked at the temple, dark eyes open and '
    + 'looking straight out, the neck and shoulders thick, the top of a scorched dark leather '
    + 'apron strap over one bare shoulder. His skin is warm and lived-in; the leather is soot '
    + 'black and dull umber. NOT grey skin, NOT a corpse, NOT a skull, NOT undead, NOT a helmet, '
    + 'NOT armour, NOT a hood, NOT hair on the head, NOT holding anything.',
};

const say = SAY[sprite];
if (!say) throw new Error(`no bust wording for ${sprite} — add one to SAY`);

const dir = here('cache/designs');
mkdirSync(dir, { recursive: true });
const colours = swatch();
const jobs: string[] = [];
for (let n = 0; n < Number(howMany); n++) {
  // WITH A DESIGN, THE FACE IS PULLED OFF THE PICTURE. Words alone could not
  // hold this one: three pixflux asks that said NOT A SKULL, NOT eye sockets,
  // NOT bone showing on the head came back as three skulls, because a gaunt
  // red face collapses into one at 128. `create_image_pro` takes a labelled
  // reference, which is the same thing that made a tale panel keep its room.
  const out = design
    ? await callTool('create_image_pro', {
        description: `${say}${words.how}`, width: 128, height: 128, no_background: true,
        style_image_url: colours,
        reference_images: [{ url: `data:image/png;base64,${readFileSync(design).toString('base64')}`,
          usage: 'the FACE and head of this character: its shape, its features and its colour' }],
      })
    : await callTool('create_image_pixflux', {
        description: `${say}${words.how}`, width: 128, height: 128, no_background: true,
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
