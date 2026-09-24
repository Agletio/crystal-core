/**
 * THE 3D ROSTER'S GENERATOR RUNS, off `roster.json`, ledgered in `made.json`.
 *
 *   npx tsx tools/3d/roster.mts refs <id|all>                  the pictures and words a concept is asked with, free
 *   npx tsx tools/3d/roster.mts concept <id|all> [variants]   concept art off the body's own picture
 *   npx tsx tools/3d/roster.mts status                         the ledger and the balance
 *
 * A CONCEPT IS THE PIXEL BODY REDRAWN, never a new character: the ask carries
 * the body's current picture as a reference image and its own `look` as the
 * words, so what comes back is that design at a resolution a model can be
 * built from. A design is shown and approved before anything past this runs.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { GENERATED } from '../../src/render/generated-art.ts';
import { GENERATED_CAST } from '../../src/render/generated-cast.ts';
import { GENERATED_PORTRAITS } from '../../src/render/generated-portraits.ts';
import { encodePng } from '../art/png.mts';
import { balance, readLedger, run } from './meshy.mts';

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
}
interface Roster {
  style: Record<'biped' | 'quadruped', string>;
  bodies: Body[];
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

async function status(): Promise<void> {
  let spent = 0;
  for (const [name, e] of Object.entries(readLedger(LEDGER))) {
    spent += e.credits ?? 0;
    console.log(`${name.padEnd(28)} ${e.status.padEnd(10)} ${String(e.credits ?? '').padStart(4)}  ${e.id}`);
  }
  console.log(`\n${spent} credits recorded here · balance ${await balance()}`);
}

const [verb, id, n] = process.argv.slice(2);
const ids = id === 'all' ? roster().bodies.map((b) => b.id) : [id];
if (verb === 'refs') ids.forEach(refs);
else if (verb === 'concept') {
  const results = await Promise.allSettled(ids.map((one) => concept(one, Number(n ?? 1))));
  results.forEach((r, i) => r.status === 'rejected' && console.error(`${ids[i]}: ${(r.reason as Error).message}`));
} else if (verb === 'status') await status();
else {
  console.error('roster.mts refs|concept <id|all> [variants] | status');
  process.exit(1);
}
