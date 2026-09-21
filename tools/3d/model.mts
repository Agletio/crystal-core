/**
 * THE WALKER BETWEEN WHAT TO ASK AND WHAT CAME BACK, exactly as `body.mts` is
 * for the pixel roster: `models.json` says what to ask, `made.json` records
 * every task id and URL so a run that is interrupted resumes instead of paying
 * twice.
 *
 *   npx tsx tools/3d/model.mts library [word]     free, spends no credits
 *   npx tsx tools/3d/model.mts concept <sprite>   a reference image off `look`
 *   npx tsx tools/3d/model.mts make <sprite>      that image to a textured GLB
 *   npx tsx tools/3d/model.mts rig <sprite>
 *   npx tsx tools/3d/model.mts animate <sprite> <action_id>
 *   npx tsx tools/3d/model.mts watch              poll everything pending
 *
 * THE PROSE IS NEVER WRITTEN TWICE. A body's `look` in tools/art/bodies.json
 * is what its pixel art was generated from, so the 3D ask reads that same
 * string — the two rosters cannot drift into two different characters.
 */
import { readFileSync } from 'node:fs';
import { fetchTask, ledger, pull, submit, waitFor, writeLedger } from './meshy.mts';

const ASKS = 'tools/3d/models.json';
const BODIES = 'tools/art/bodies.json';

interface Ask { sprite: string; height: number; [k: string]: unknown }
interface File { defaults: Record<string, unknown>; models: Ask[] }

const file = (): File => JSON.parse(readFileSync(ASKS, 'utf8')) as File;

function lookOf(sprite: string): string {
  const bodies = (JSON.parse(readFileSync(BODIES, 'utf8')) as { bodies: Array<{ sprite: string; look?: string }> }).bodies;
  const found = bodies.find((b) => b.sprite === sprite);
  if (!found?.look) throw new Error(`no body called ${sprite} in ${BODIES}, or it has no look`);
  return found.look;
}

function askFor(sprite: string): Ask {
  const f = file();
  const found = f.models.find((m) => m.sprite === sprite);
  if (!found) throw new Error(`${sprite} is not in ${ASKS}`);
  return { ...f.defaults, ...found } as Ask;
}

/** One row a task, keyed `<sprite>:<stage>` so a resume knows what it holds. */
function remember(slot: string, kind: string, id: string): void {
  const led = ledger();
  led.tasks = { ...(led.tasks ?? {}), [slot]: { kind, id } };
  writeLedger(led);
  console.log(`  ${slot} -> ${id}`);
}

const held = (slot: string) => ledger().tasks?.[slot];

const PATHS: Record<string, string> = {
  concept: '/v1/text-to-image',
  make: '/v1/image-to-3d',
  rig: '/v1/rigging',
  animate: '/v1/animations',
};

async function library(word?: string): Promise<void> {
  const list = (await fetchTask('/v1/animations', 'library') as unknown as { result?: Array<Record<string, string>> });
  const rows = (list.result ?? list) as unknown as Array<Record<string, string>>;
  const keep = word ? rows.filter((r) => `${r.name} ${r.key} ${r.category}`.toLowerCase().includes(word.toLowerCase())) : rows;
  console.log(`${keep.length} of ${rows.length} actions${word ? ` matching "${word}"` : ''}`);
  for (const r of keep) console.log(`  ${String(r.action_id).padStart(5)}  ${r.key.padEnd(28)} ${r.category}/${r.sub_category}`);
}

async function concept(sprite: string): Promise<void> {
  const ask = askFor(sprite);
  const id = await submit(PATHS.concept, {
    ai_model: 'gpt-image-2',
    prompt: `${lookOf(sprite)} Full body, standing, plain flat background, even lighting with NO strong shadows and NO cast shadow.`,
    pose_mode: ask.pose_mode,
    remove_background: true,
    aspect_ratio: '3:4',
  });
  remember(`${sprite}:concept`, 'concept', id);
}

async function make(sprite: string): Promise<void> {
  const ask = askFor(sprite);
  const from = held(`${sprite}:concept`);
  if (!from) throw new Error(`no concept for ${sprite} yet — run \`concept ${sprite}\` first`);
  const done = await fetchTask(PATHS.concept, from.id);
  const image = (done as unknown as { image_urls?: string[]; result?: string }).image_urls?.[0];
  if (!image) throw new Error(`${sprite}'s concept is ${done.status}, not an image yet`);
  const id = await submit(PATHS.make, {
    image_url: image,
    model_type: ask.model_type,
    topology: ask.topology,
    target_polycount: ask.target_polycount,
    remove_lighting: ask.remove_lighting,
    enable_pbr: ask.enable_pbr,
    origin_at: ask.origin_at,
    pose_mode: ask.pose_mode,
    texture_resolution: ask.texture_resolution,
    resize_height: ask.height,
    should_texture: true,
  });
  remember(`${sprite}:make`, 'make', id);
}

async function rig(sprite: string): Promise<void> {
  const from = held(`${sprite}:make`);
  if (!from) throw new Error(`nothing made for ${sprite} yet`);
  remember(`${sprite}:rig`, 'rig', await submit(PATHS.rig, { input_task_id: from.id }));
}

async function animate(sprite: string, action: string): Promise<void> {
  const from = held(`${sprite}:rig`);
  if (!from) throw new Error(`${sprite} is not rigged yet`);
  const id = await submit(PATHS.animate, { rig_task_id: from.id, action_id: Number(action) });
  remember(`${sprite}:anim:${action}`, 'animate', id);
}

/** Poll everything the ledger holds that has not finished, and DOWNLOAD what
 *  has — which is also what learns the host the files are served from. */
async function watch(): Promise<void> {
  const led = ledger();
  for (const [slot, task] of Object.entries(led.tasks ?? {})) {
    if (task.status === 'SUCCEEDED') continue;
    console.log(`${slot} (${task.kind})`);
    const done = await waitFor(PATHS[task.kind], task.id);
    const urls: Record<string, string> = {
      ...(done.model_urls ?? {}),
      ...(done.rigged_character_glb_url ? { glb: done.rigged_character_glb_url } : {}),
      ...(done.animation_glb_url ? { glb: done.animation_glb_url } : {}),
    };
    if (urls.glb) {
      const dest = `tools/3d/models/${slot.replace(/:/g, '-')}.glb`;
      console.log(`  served from ${await pull(urls.glb, dest)} -> ${dest}`);
    }
    const now = ledger();
    now.tasks![slot] = { ...task, status: 'SUCCEEDED', urls };
    writeLedger(now);
  }
  console.log(`hosts seen: ${(ledger().hosts ?? ['none yet']).join(', ')}`);
}

const [verb, a, b] = process.argv.slice(2);
const VERBS: Record<string, () => Promise<void>> = {
  library: () => library(a),
  concept: () => concept(a),
  make: () => make(a),
  rig: () => rig(a),
  animate: () => animate(a, b),
  watch: () => watch(),
};

const go = VERBS[verb ?? ''];
if (!go) {
  console.log(`${Object.keys(VERBS).join(' | ')}  —  library spends no credits`);
  process.exit(1);
}
// A refusal is a SENTENCE, not a stack: every failure here is a missing key,
// a sprite nobody wrote down, or a stage run out of order.
await go().catch((e: Error) => {
  console.error(`model ${verb}: ${e.message}`);
  process.exit(1);
});
