/**
 * THE 3D ROSTER'S GENERATOR RUNS, off `roster.json`, ledgered in `made.json`.
 *
 *   npx tsx tools/3d/roster.mts refs <id|all>                  the pictures and words a concept is asked with, free
 *   npx tsx tools/3d/roster.mts concept <id|all> [variants]   concept art off the body's own picture
 *   npx tsx tools/3d/roster.mts edit <id> <variant> <words…>  a concept changed and nothing else, as the next variant
 *   npx tsx tools/3d/roster.mts model <id|all>                 the approved concept (`pick`) to a textured mesh
 *   npx tsx tools/3d/roster.mts rig <id|all>                   a skeleton at the body's height, and the walk and run it comes with
 *   npx tsx tools/3d/roster.mts surface <id|all>               a seamless surface picture, for the pack step to make a material of
 *   npx tsx tools/3d/roster.mts status                         the ledger and the balance
 *
 * A CONCEPT IS THE PIXEL BODY REDRAWN, never a new character: the ask carries
 * the body's current picture as a reference image and its own `look` as the
 * words, so what comes back is that design at a resolution a model can be
 * built from. A design is shown and approved before anything past this runs.
 * A body with `same` is another body's mesh and asks for nothing of its own.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GENERATED } from '../../src/render/generated-art.ts';
import { GENERATED_CAST } from '../../src/render/generated-cast.ts';
import { GENERATED_PORTRAITS } from '../../src/render/generated-portraits.ts';
import { encodePng } from '../art/png.mts';
import { balance, download, readLedger, run } from './meshy.mts';

const HERE = 'tools/3d';
const CACHE = join(HERE, 'cache');
const LEDGER = join(HERE, 'made.json');

interface Body {
  id: string;
  sprite?: string;
  kind: 'hero' | 'monster' | 'boss' | 'person';
  refs: ('cast' | 'body' | 'portrait' | 'walk')[];
  height: number;
  rig: 'biped' | 'quadruped';
  note?: string;
  pick?: number; // the approved concept variant
  polycount?: number;
  same?: string; // another body's mesh, reproportioned at load
}
interface Roster {
  style: Record<'biped' | 'quadruped', string>;
  bodies: Body[];
  surfaces_style: string;
  surfaces: { id: string; prompt: string }[];
}

const roster = (): Roster => JSON.parse(readFileSync(join(HERE, 'roster.json'), 'utf8')) as Roster;

/** What the pixel ask said about the CAMERA and the PICTURE rather than the body: a 3D concept sets its own. */
const PIXEL_ONLY = /seen at|seen from|side profile|three-quarter|no ground|no shadow|pixel|front on|full body head|no floor/i;

function lookOf(sprite: string): string {
  const bodies = (JSON.parse(readFileSync('tools/art/bodies.json', 'utf8')) as { bodies: { sprite: string; look?: string }[] }).bodies;
  const look = bodies.find((b) => b.sprite === sprite)?.look;
  if (!look) throw new Error(`${sprite} has no look in tools/art/bodies.json`);
  return look
    .split(/(?<=\.)\s+/)
    .filter((sentence) => !PIXEL_ONLY.test(sentence))
    .join(' ');
}

/** A picture off the committed grids, drawn NEAREST onto the concept's own grey. */
function png(rows: string[], key: Record<string, string>, longest = 1024): string {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => r.length));
  const s = Math.max(1, Math.floor(longest / Math.max(w, h)));
  const W = w * s;
  const H = h * s;
  const px = new Uint8Array(W * H * 4);
  for (let i = 0; i < W * H; i++) px.set([128, 128, 128, 255], i * 4);
  rows.forEach((line, y) => {
    for (let x = 0; x < line.length; x++) {
      const hex = key[line[x]];
      if (!hex) continue;
      const rgb = [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16));
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) px.set([...rgb, 255], ((y * s + dy) * W + x * s + dx) * 4);
    }
  });
  return `data:image/png;base64,${Buffer.from(encodePng(W, H, px)).toString('base64')}`;
}

function refsOf(body: Body): string[] {
  const sprite = body.sprite ?? body.id;
  return body.refs.map((ref) => {
    if (ref === 'cast') {
      const c = GENERATED_CAST[sprite];
      if (!c) throw new Error(`${sprite} has no cast still`);
      return png(c.rows, c.key);
    }
    if (ref === 'portrait') {
      const p = GENERATED_PORTRAITS[sprite] as unknown as { rows: string[]; key: Record<string, string> } | undefined;
      if (!p) throw new Error(`${sprite} has no portrait`);
      return png(p.rows, p.key);
    }
    const art = GENERATED[sprite];
    if (!art) throw new Error(`${sprite} has no body`);
    const run = ref === 'walk' ? art.states.walk : art.states.idle;
    const frame = art.frames[run[Math.min(run.length - 1, ref === 'walk' ? 1 : 0)]];
    return png(frame, art.key);
  });
}

const find = (id: string): Body => {
  const body = roster().bodies.find((b) => b.id === id);
  if (!body) throw new Error(`no body called ${id} in roster.json`);
  return body;
};

const wordsOf = (body: Body): string => [lookOf(body.sprite ?? body.id), body.note, roster().style[body.rig]].filter(Boolean).join(' ');

function refs(id: string): void {
  const body = find(id);
  mkdirSync(CACHE, { recursive: true });
  refsOf(body).forEach((uri, i) => writeFileSync(join(CACHE, `${id}-ref-${i}.png`), Buffer.from(uri.split(',')[1], 'base64')));
  console.log(`${id}: ${body.refs.length} reference(s), ${wordsOf(body).length} characters of prompt`);
}

async function concept(id: string, variants: number): Promise<void> {
  const body = find(id);
  const words = wordsOf(body);
  const ask = {
    ai_model: 'nano-banana-pro',
    reference_image_urls: refsOf(body),
    prompt: words,
    aspect_ratio: body.rig === 'quadruped' ? '4:3' : '3:4',
  };
  await Promise.all(
    Array.from({ length: variants }, (_, v) =>
      run(LEDGER, `${id}:concept:${v}`, '/v1/image-to-image', ask, join(CACHE, `${id}-concept-${v}.png`), (t) => t.image_urls?.[0])
    )
  );
}

async function edit(id: string, from: number, words: string): Promise<void> {
  const src = join(CACHE, `${id}-concept-${from}.png`);
  let v = from + 1;
  while (readLedger(LEDGER)[`${id}:concept:${v}`]) v++;
  const ask = {
    ai_model: 'nano-banana-pro',
    reference_image_urls: [`data:image/png;base64,${readFileSync(src).toString('base64')}`],
    prompt: `${words} Keep EVERYTHING else exactly as it is in the reference: the same figure, pose, clothing, colours, lighting, framing and plain grey backdrop.`,
  };
  await run(LEDGER, `${id}:concept:${v}`, '/v1/image-to-image', ask, join(CACHE, `${id}-concept-${v}.png`), (t) => t.image_urls?.[0]);
  console.log(`${id}: variant ${v} is the edit of ${from}`);
}

/** Crowds are cheap and a boss is looked at: triangles follow how many are on screen at once. */
const TRIANGLES: Record<Body['kind'], number> = { hero: 20000, person: 16000, monster: 12000, boss: 24000 };

async function model(id: string): Promise<void> {
  const body = find(id);
  if (body.same) return console.log(`${id}: is ${body.same}'s mesh`);
  const png = join(CACHE, `${id}-concept-${body.pick ?? 0}.png`);
  const ask: Record<string, unknown> = {
    image_url: `data:image/png;base64,${readFileSync(png).toString('base64')}`,
    ai_model: 'latest',
    model_type: 'standard',
    topology: 'triangle',
    target_polycount: body.polycount ?? TRIANGLES[body.kind],
    should_remesh: true,
    should_texture: true,
    enable_pbr: true,
    remove_lighting: true,
    texture_resolution: '2k',
    origin_at: 'bottom',
  };
  if (body.rig === 'biped') ask.pose_mode = 'a-pose';
  await run(LEDGER, `${id}:model`, '/v1/image-to-3d', ask, join(CACHE, `${id}.glb`), (t) => t.model_urls?.glb);
}

async function rig(id: string): Promise<void> {
  const body = find(id);
  if (body.same) return console.log(`${id}: is ${body.same}'s rig`);
  const made = readLedger(LEDGER)[`${id}:model`];
  if (made?.status !== 'SUCCEEDED') throw new Error(`${id} has no finished model to rig`);
  const task = await run(
    LEDGER,
    `${id}:rig`,
    '/v1/rigging',
    { input_task_id: made.id, animation_type: body.rig, height_meters: body.height },
    join(CACHE, `${id}-rig.glb`),
    (t) => t.result?.rigged_character_glb_url
  );
  // WHAT THE RIG COMES WITH, free: the walk and the run, fetched while the URL is fresh.
  const basics = task?.result?.basic_animations ?? {};
  for (const [name, url] of Object.entries(basics)) {
    if (typeof url === 'string' && name.endsWith('glb_url')) await download(url, join(CACHE, `${id}-${name.replace(/_glb_url$/, '')}.glb`));
  }
}

async function surface(id: string): Promise<void> {
  const r = roster();
  const s = r.surfaces.find((x) => x.id === id);
  if (!s) throw new Error(`no surface called ${id} in roster.json`);
  const ask = { ai_model: 'nano-banana-pro', prompt: `${s.prompt} ${r.surfaces_style}`, aspect_ratio: '1:1' };
  await run(LEDGER, `${id}:surface`, '/v1/text-to-image', ask, join(CACHE, `surface-${id}.png`), (t) => t.image_urls?.[0]);
}

async function status(): Promise<void> {
  let spent = 0;
  for (const [name, e] of Object.entries(readLedger(LEDGER))) {
    spent += e.credits ?? 0;
    console.log(`${name.padEnd(28)} ${e.status.padEnd(10)} ${String(e.credits ?? '').padStart(4)}  ${e.id}`);
  }
  console.log(`\n${spent} credits recorded here · balance ${await balance()}`);
}

const [verb, id, n, ...rest] = process.argv.slice(2);
const ids = id === 'all' ? roster().bodies.map((b) => b.id) : [id];
const each = async (job: (one: string) => Promise<void>): Promise<void> => {
  const results = await Promise.allSettled(ids.map(job));
  results.forEach((r, i) => r.status === 'rejected' && console.error(`${ids[i]}: ${(r.reason as Error).message}`));
};
if (verb === 'refs') ids.forEach(refs);
else if (verb === 'concept') await each((one) => concept(one, Number(n ?? 1)));
else if (verb === 'edit') await edit(id, Number(n), rest.join(' '));
else if (verb === 'model') await each(model);
else if (verb === 'rig') await each(rig);
else if (verb === 'surface') {
  const which = id === 'all' ? roster().surfaces.map((x) => x.id) : [id];
  const results = await Promise.allSettled(which.map(surface));
  results.forEach((r, i) => r.status === 'rejected' && console.error(`${which[i]}: ${(r.reason as Error).message}`));
} else if (verb === 'status') await status();
else {
  console.error('roster.mts refs|concept|edit|model|rig|surface <id|all> … | status');
  process.exit(1);
}
