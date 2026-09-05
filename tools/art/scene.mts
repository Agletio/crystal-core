/**
 * A SCENE — one drawn picture a screen stands on, rather than a tileset carved
 * into a map.
 *
 *   npx tsx tools/art/scene.mts ask <id> [seed ...]   candidates, one a seed
 *   npx tsx tools/art/scene.mts get <job-id> <png>    fetch one that finished
 *   npx tsx tools/art/scene.mts emit <id> <png>       into src/render/generated-scene.ts
 *
 * `create_image_pro` is the only tool that draws a whole scene well: it takes a
 * 16:9 canvas to 688x384, answers with several candidates, and is 20-40
 * generations — which is nothing against looking at a camp nobody wants.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { callTool, download, urlsIn } from './mcp.mts';

const here = (f: string) => new URL(`./${f}`, import.meta.url).pathname;
const OUT = new URL('../../src/render/generated-scene.ts', import.meta.url).pathname;
const words = JSON.parse(readFileSync(here('scenes.json'), 'utf8')) as {
  scenes: Record<string, { width: number; height: number; say: string; like?: string }>;
};

/** ANOTHER PANEL'S OWN PICTURE, as a `data:` URI out of what already shipped.
 *  Two panels of one scene have to be the same room: words alone gave the same
 *  chamber a different wall texture and a tunnel running the other way. */
function shipped(id: string): string | undefined {
  if (!existsSync(OUT)) return undefined;
  const row = new RegExp(`^  ${id}: \\{ w: \\d+, h: \\d+, png: '([^']+)' \\},$`, 'm')
    .exec(readFileSync(OUT, 'utf8'));
  return row?.[1];
}

const [command, id, ...rest] = process.argv.slice(2);

if (command === 'ask') {
  const scene = words.scenes[id];
  if (!scene) throw new Error(`name a scene: ${Object.keys(words.scenes).join(', ')}`);
  const seeds = rest.length ? rest.map(Number) : [1];
  for (const seed of seeds) {
    const like = scene.like ? shipped(scene.like) : undefined;
    if (scene.like && !like) throw new Error(`${scene.like} has not been emitted`);
    const out = await callTool('create_image_pro', {
      description: scene.say,
      width: scene.width,
      height: scene.height,
      no_background: false,
      seed,
      // The room is taken from the picture and the words only say what CHANGED.
      ...(like
        ? {
            style_image_url: like,
            reference_images: [{ url: like, usage: 'the chamber itself: its wall texture, its colours, and the direction it opens' }],
          }
        : {}),
    });
    const said = out.split('\n').filter((l) => /id|status|cost|error|valid/i.test(l)).join(' | ');
    console.log(`${id}/${seed}: ${said.slice(0, 400)}`);
  }
} else if (command === 'get') {
  const out = await callTool('get_image', { job_id: id });
  const url = urlsIn(out).find((u) => /\.png/.test(u)) ?? urlsIn(out)[0];
  if (!url) {
    console.log(out.slice(0, 400));
    process.exit(1);
  }
  writeFileSync(rest[0] ?? `${id}.png`, await download(url));
  console.log(rest[0] ?? `${id}.png`);
} else if (command === 'emit') {
  const scene = words.scenes[id];
  const png = readFileSync(rest[0] ?? `${id}.png`);
  const held = existsSync(OUT)
    ? [...readFileSync(OUT, 'utf8').matchAll(/^  (\w+): \{ w: (\d+), h: (\d+), png: '([^']+)' \},$/gm)]
        .map((m) => [m[1], { w: Number(m[2]), h: Number(m[3]), png: m[4] }] as const)
    : [];
  const rows = new Map(held);
  rows.set(id, { w: scene.width, h: scene.height, png: `data:image/png;base64,${png.toString('base64')}` });
  writeFileSync(
    OUT,
    `/**\n * Written by \`tools/art/scene.mts emit\`. Do not edit by hand.\n *\n` +
      ` * A whole SCENE as one drawn picture — the camp is art rather than a\n` +
      ` * tileset carved into a map, so what ships is the picture itself.\n */\n` +
      `export interface SceneArt { w: number; h: number; png: string }\n\n` +
      `export const SCENE_ART: Record<string, SceneArt> = {\n` +
      [...rows].map(([k, v]) => `  ${k}: { w: ${v.w}, h: ${v.h}, png: '${v.png}' },`).join('\n') +
      `\n};\n`
  );
  console.log(`${id}: ${scene.width}x${scene.height}, ${Math.round(png.length / 1024)} KB into ${OUT}`);
} else {
  console.log('ask <id> [seed ...] | get <job-id> <png> | emit <id> <png>');
}
