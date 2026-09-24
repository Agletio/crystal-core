/**
 * THE ABYSS'S GENERATOR RUNS, off `asks.json`, ledgered in `made.json`.
 *
 *   npx tsx tools/abyss/meshy.mts image <id> [variants]   concept art, one task a variant
 *   npx tsx tools/abyss/meshy.mts model <id> [variant]    image-to-3d off a chosen concept
 *   npx tsx tools/abyss/meshy.mts rig <id>                a biped skeleton at the ask's height
 *   npx tsx tools/abyss/meshy.mts anim <id>               every clip the ask names, in ONE file
 *   npx tsx tools/abyss/meshy.mts status                  the ledger and the balance
 *
 * EVERY STEP IS IDEMPOTENT: a key already SUCCEEDED in the ledger with its file
 * on disk is skipped, and one SUCCEEDED without its file is fetched again off
 * its id — a download URL is signed and expires, an id does not.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, rmdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const BASE = 'https://api.meshy.ai/openapi';
const HERE = 'tools/abyss';
const CACHE = join(HERE, 'cache');
const LEDGER = join(HERE, 'made.json');

interface Ask {
  id: string;
  kind: 'character' | 'prop' | 'texture' | 'decal';
  prompt: string;
  model?: string; // text-to-image model
  aspect?: string;
  cutout?: boolean; // transparent background
  height?: number; // metres, characters only
  polycount?: number;
  anims?: Record<string, number>; // clip name -> library action id
}
interface Asks {
  style: Record<string, string>;
  assets: Ask[];
}
interface Entry {
  id: string;
  status: string;
  credits?: number;
  from?: string;
}
type Ledger = Record<string, Entry>;

const key = (): string => {
  const k = process.env.MESHY_API_KEY ?? process.env.Meshy_api_key;
  if (!k) throw new Error('no Meshy key in the environment');
  return k;
};
const asks = (): Asks => JSON.parse(readFileSync(join(HERE, 'asks.json'), 'utf8')) as Asks;
const ledger = (): Ledger => (existsSync(LEDGER) ? (JSON.parse(readFileSync(LEDGER, 'utf8')) as Ledger) : {});

// TWO DOZEN RUNS WRITE THIS FILE AT ONCE, so a write is a read-modify-write
// under a directory lock and lands by rename: a half-written ledger read by a
// neighbour once lost a submitted task, credits and all.
const LOCK = `${LEDGER}.lock`;
const nap = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function record(name: string, entry: Entry): void {
  for (let tries = 0; ; tries++) {
    try {
      mkdirSync(LOCK);
      break;
    } catch {
      if (tries > 400) throw new Error(`${LOCK} held for 20s — remove it if no run is going`);
      nap(50);
    }
  }
  try {
    const all = ledger();
    all[name] = entry;
    const sorted = Object.fromEntries(Object.entries(all).sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(`${LEDGER}.tmp`, `${JSON.stringify(sorted, null, 2)}\n`);
    renameSync(`${LEDGER}.tmp`, LEDGER);
  } finally {
    rmdirSync(LOCK);
  }
}

async function call(path: string, init?: RequestInit): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' },
    });
    const text = await res.text();
    if (res.ok) return text ? JSON.parse(text) : null;
    // 429 and 5xx are the service pacing us; anything else is our ask.
    if ((res.status === 429 || res.status >= 500) && attempt < 6) {
      await new Promise((go) => setTimeout(go, 4000 * 2 ** attempt));
      continue;
    }
    throw new Error(`${init?.method ?? 'GET'} ${path} -> ${res.status} ${text.slice(0, 400)}`);
  }
}

async function wait(path: string, id: string, label: string): Promise<any> {
  let said = -1;
  for (;;) {
    const task = await call(`${path}/${id}`);
    if (task.status === 'SUCCEEDED') return task;
    if (task.status === 'FAILED' || task.status === 'CANCELED') {
      throw new Error(`${label} ${task.status}: ${task.task_error?.message ?? 'no reason given'}`);
    }
    if (task.progress !== said) {
      console.log(`  ${label} ${task.status} ${task.progress ?? 0}%`);
      said = task.progress;
    }
    await new Promise((go) => setTimeout(go, 8000));
  }
}

async function download(url: string, dest: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      return;
    }
    if (attempt >= 4) throw new Error(`download ${new URL(url).host} -> ${res.status}`);
    await new Promise((go) => setTimeout(go, 3000 * 2 ** attempt));
  }
}

/** Submit unless the ledger already has it, wait, and hand back the task. */
async function run(name: string, path: string, body: Record<string, unknown>, file: string, urlOf: (t: any) => string | undefined): Promise<any> {
  const had = ledger()[name];
  if (had?.status === 'SUCCEEDED' && existsSync(file)) {
    console.log(`  ${name}: have it`);
    return null;
  }
  let id = had && had.status !== 'FAILED' ? had.id : '';
  if (!id) {
    const out = await call(path, { method: 'POST', body: JSON.stringify(body) });
    id = out.result ?? out.id;
    record(name, { id, status: 'PENDING' });
    console.log(`  ${name}: submitted ${id}`);
  }
  const task = await wait(path, id, name);
  const url = urlOf(task);
  if (!url) throw new Error(`${name}: SUCCEEDED with no file to fetch`);
  await download(url, file);
  record(name, { id, status: 'SUCCEEDED', credits: task.consumed_credits ?? undefined, from: had?.from });
  console.log(`  ${name}: ${file}`);
  return task;
}

const find = (id: string): Ask => {
  const ask = asks().assets.find((a) => a.id === id);
  if (!ask) throw new Error(`no ask called ${id} in asks.json`);
  return ask;
};

async function image(id: string, variants: number): Promise<void> {
  const ask = find(id);
  const style = asks().style[ask.kind] ?? '';
  const prompt = `${ask.prompt} ${style}`.trim();
  const body: Record<string, unknown> = {
    ai_model: ask.model ?? 'nano-banana-pro',
    prompt,
    aspect_ratio: ask.aspect ?? '1:1',
  };
  if (ask.cutout) body.remove_background = true;
  if (ask.kind === 'character') body.pose_mode = 'a-pose';
  await Promise.all(
    Array.from({ length: variants }, (_, v) =>
      run(`${id}:image:${v}`, '/v1/text-to-image', body, join(CACHE, `${id}-${v}.png`), (t) => t.image_urls?.[0])
    )
  );
}

async function model(id: string, variant: number): Promise<void> {
  const ask = find(id);
  const png = join(CACHE, `${id}-${variant}.png`);
  if (!existsSync(png)) throw new Error(`${png} is missing — run image first`);
  const body: Record<string, unknown> = {
    image_url: `data:image/png;base64,${readFileSync(png).toString('base64')}`,
    ai_model: 'latest',
    model_type: 'standard',
    topology: 'triangle',
    target_polycount: ask.polycount ?? 20000,
    should_remesh: true,
    should_texture: true,
    enable_pbr: true,
    remove_lighting: true,
    texture_resolution: '4k',
    origin_at: 'bottom',
  };
  if (ask.kind === 'character') body.pose_mode = 'a-pose';
  const name = `${id}:model`;
  const had = ledger()[name];
  if (!had) record(name, { id: '', status: 'NEW', from: `${id}-${variant}.png` });
  await run(name, '/v1/image-to-3d', body, join(CACHE, `${id}.glb`), (t) => t.model_urls?.glb);
}

async function rig(id: string): Promise<void> {
  const ask = find(id);
  const made = ledger()[`${id}:model`];
  if (made?.status !== 'SUCCEEDED') throw new Error(`${id} has no finished model to rig`);
  await run(
    `${id}:rig`,
    '/v1/rigging',
    { input_task_id: made.id, animation_type: 'biped', height_meters: ask.height ?? 1.8 },
    join(CACHE, `${id}-rig.glb`),
    (t) => t.result?.rigged_character_glb_url
  );
}

async function anim(id: string): Promise<void> {
  const ask = find(id);
  const rigged = ledger()[`${id}:rig`];
  if (rigged?.status !== 'SUCCEEDED') throw new Error(`${id} has no finished rig`);
  const clips = Object.entries(ask.anims ?? {});
  if (clips.length === 0) throw new Error(`${id} names no clips`);
  // ONE CALL, ONE FILE: `action_ids` hands back every clip on one skeleton in
  // the order asked, so the names below are the clip order and nothing else.
  writeFileSync(join(CACHE, `${id}-anim.json`), JSON.stringify(clips.map(([n]) => n)));
  await run(
    `${id}:anim`,
    '/v1/animations',
    { rig_task_id: rigged.id, action_ids: clips.map(([, a]) => a), post_process: { operation_type: 'change_fps', fps: 30 } },
    join(CACHE, `${id}-anim.glb`),
    (t) => t.result?.animation_glb_url
  );
}

async function status(): Promise<void> {
  const all = ledger();
  let spent = 0;
  for (const [name, e] of Object.entries(all)) {
    spent += e.credits ?? 0;
    console.log(`${name.padEnd(28)} ${e.status.padEnd(10)} ${String(e.credits ?? '').padStart(4)}  ${e.id}`);
  }
  const bal = await call('/v1/balance');
  console.log(`\n${spent} credits recorded here · balance ${bal.balance}`);
}

/** THE SERVER IS THE RECORD: every text-to-image task it lists is matched back
 *  to its ask by prompt, and one the ledger lost is written in as the next
 *  free variant, with its picture fetched. Nothing is submitted. */
async function sync(): Promise<void> {
  const all = asks();
  const tasks: any[] = [];
  for (let page = 1; page <= 6; page++) {
    const got = await call(`/v1/text-to-image?page_num=${page}&page_size=50&sort_by=-created_at`);
    const rows = Array.isArray(got) ? got : (got?.result ?? got?.data ?? []);
    tasks.push(...rows);
    if (rows.length < 50) break;
  }
  const known = new Set(Object.values(ledger()).map((e) => e.id));
  for (const task of tasks) {
    if (known.has(task.id) || task.status !== 'SUCCEEDED') continue;
    const ask = all.assets.find((a) => task.prompt?.startsWith(a.prompt.slice(0, 80)));
    if (!ask) continue;
    let v = 0;
    while (ledger()[`${ask.id}:image:${v}`]) v++;
    const file = join(CACHE, `${ask.id}-${v}.png`);
    await download(task.image_urls[0], file);
    record(`${ask.id}:image:${v}`, { id: task.id, status: 'SUCCEEDED', credits: task.consumed_credits ?? undefined });
    console.log(`  recovered ${ask.id}:image:${v} ${task.id}`);
  }
}

const [verb, id, n] = process.argv.slice(2);
const jobs: Record<string, () => Promise<void>> = {
  sync,
  image: () => image(id, Number(n ?? 1)),
  model: () => model(id, Number(n ?? 0)),
  rig: () => rig(id),
  anim: () => anim(id),
  status,
};
if (!jobs[verb]) {
  console.error('meshy.mts image|model|rig|anim|status <id> [n]');
  process.exit(1);
}
await jobs[verb]();
