/**
 * THE CAMP'S PROPS AND A HERO'S GEAR, off `props.json`, ledgered in `made.json`.
 *
 *   npx tsx tools/3d/props.mts concept <id|all|prop|gear>   a picture off its reference: a crop of the camp, or its icon
 *   npx tsx tools/3d/props.mts model <id|all|prop|gear>     the concept to a textured mesh
 *   npx tsx tools/3d/props.mts sheet <out.png>              every concept on one sheet, free, to judge before a model is paid for
 *
 * A camp prop costs 9 and 30 (the full model, since the camp is looked at up
 * close); a piece of gear 6 and 15 (`meshy-6-lite`: it is a hand's length on
 * screen). A run is idempotent, so an interrupted one resumes.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { GENERATED_ICONS } from '../../src/render/generated-icons.ts';
import { encodePng } from '../art/png.mts';
import { run } from './meshy.mts';

const HERE = 'tools/3d';
const CACHE = join(HERE, 'cache');
const LEDGER = join(HERE, 'made.json');

interface Prop {
  id: string;
  kind: 'prop' | 'gear';
  crop?: [number, number, number, number]; // left, top, right, bottom in the camp concept's pixels
  icon?: string;
  size: number;
  words: string;
}
interface Props {
  style: Record<Prop['kind'], string>;
  props: Prop[];
}
const book = (): Props => JSON.parse(readFileSync(join(HERE, 'props.json'), 'utf8')) as Props;

/** An icon off the committed grid, drawn NEAREST onto grey at 1024. */
function iconPng(id: string): string {
  const icon = GENERATED_ICONS[id];
  if (!icon) throw new Error(`no icon ${id}`);
  const n = icon.grid;
  const s = Math.floor(1024 / n);
  const W = n * s;
  const px = new Uint8Array(W * W * 4);
  for (let i = 0; i < W * W; i++) px.set([128, 128, 128, 255], i * 4);
  icon.rows.forEach((line, y) => {
    for (let x = 0; x < line.length; x++) {
      const hex = icon.key[line[x]];
      if (!hex) continue;
      const rgb = [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16));
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) px.set([...rgb, 255], ((y * s + dy) * W + x * s + dx) * 4);
    }
  });
  return `data:image/png;base64,${Buffer.from(encodePng(W, W, px)).toString('base64')}`;
}

/** A crop of the approved camp, upscaled so the generator reads its detail. */
function cropPng(box: [number, number, number, number], id: string): string {
  const out = join(CACHE, `prop-${id}-ref.png`);
  execFileSync('python3', ['-c', `
from PIL import Image
im = Image.open('${join(CACHE, 'scene-camp-1.png')}').convert('RGB').crop((${box.join(',')}))
s = 1024 / max(im.size)
im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS).save('${out}')
`]);
  return `data:image/png;base64,${readFileSync(out).toString('base64')}`;
}

const pick = (which: string): Prop[] => {
  const all = book().props;
  if (which === 'all') return all;
  if (which === 'prop' || which === 'gear') return all.filter((p) => p.kind === which);
  const one = all.find((p) => p.id === which);
  if (!one) throw new Error(`no prop called ${which} in props.json`);
  return [one];
};

async function concept(p: Prop): Promise<void> {
  const ref = p.crop ? cropPng(p.crop, p.id) : iconPng(p.icon!);
  const ask = {
    ai_model: p.kind === 'gear' ? 'nano-banana-2' : 'nano-banana-pro', // 6 and 9: a hand's length on screen needs less
    reference_image_urls: [ref],
    prompt: `${p.words} ${book().style[p.kind]}`,
    aspect_ratio: p.kind === 'gear' ? '3:4' : '1:1',
  };
  await run(LEDGER, `prop:${p.id}:concept`, '/v1/image-to-image', ask, join(CACHE, `prop-${p.id}-concept.png`), (t) => t.image_urls?.[0]);
}

async function model(p: Prop): Promise<void> {
  const png = join(CACHE, `prop-${p.id}-concept.png`);
  if (!existsSync(png)) throw new Error(`${p.id} has no concept to model`);
  const ask = {
    image_url: `data:image/png;base64,${readFileSync(png).toString('base64')}`,
    ai_model: p.kind === 'gear' ? 'meshy-6-lite' : 'latest',
    topology: 'triangle',
    target_polycount: p.kind === 'gear' ? 3000 : 9000,
    should_remesh: true,
    should_texture: true,
    enable_pbr: true,
    texture_resolution: '2k',
    origin_at: 'bottom',
  };
  await run(LEDGER, `prop:${p.id}:model`, '/v1/image-to-3d', ask, join(CACHE, `prop-${p.id}.glb`), (t) => t.model_urls?.glb);
}

function sheet(out: string): void {
  const have = book().props.filter((p) => existsSync(join(CACHE, `prop-${p.id}-concept.png`)));
  execFileSync('python3', ['-c', `
from PIL import Image, ImageDraw
ids = ${JSON.stringify(have.map((p) => p.id))}
tiles = []
for i in ids:
    im = Image.open('${CACHE}/prop-' + i + '-concept.png').convert('RGB')
    im.thumbnail((300, 300))
    t = Image.new('RGB', (310, 330), (30, 30, 30))
    t.paste(im, (5, 5))
    ImageDraw.Draw(t).text((8, 312), i, fill=(255, 255, 255))
    tiles.append(t)
cols = 6
rows = (len(tiles) + cols - 1) // cols
s = Image.new('RGB', (310 * cols, 330 * max(1, rows)), (15, 15, 15))
for k, t in enumerate(tiles):
    s.paste(t, ((k % cols) * 310, (k // cols) * 330))
s.save('${out}', quality=88)
`]);
  console.log(`${out}: ${have.length} concepts`);
}

const [verb, which = 'all'] = process.argv.slice(2);
const each = async (job: (p: Prop) => Promise<void>): Promise<void> => {
  const list = pick(which);
  const results = await Promise.allSettled(list.map(job));
  results.forEach((r, i) => r.status === 'rejected' && console.error(`${list[i].id}: ${(r.reason as Error).message}`));
};
if (verb === 'concept') await each(concept);
else if (verb === 'model') await each(model);
else if (verb === 'sheet') sheet(which === 'all' ? join(CACHE, 'props-sheet.jpg') : which);
else {
  console.error('props.mts concept|model <id|all|prop|gear> | sheet <out>');
  process.exit(1);
}
