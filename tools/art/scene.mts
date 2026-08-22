/**
 * A SCENE — one drawn picture a screen stands on, rather than a tileset carved
 * into a map.
 *
 *   npx tsx tools/art/scene.mts ask <id> [seed ...]   candidates, one a seed
 *   npx tsx tools/art/scene.mts get <job-id> <png>    fetch one that finished
 *
 * `create_image_pro` is the only tool that draws a whole scene well: it takes a
 * 16:9 canvas to 688x384, answers with several candidates, and is 20-40
 * generations — which is nothing against looking at a camp nobody wants.
 */
import { writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { callTool, download, urlsIn } from './mcp.mts';

const here = (f: string) => new URL(`./${f}`, import.meta.url).pathname;
const words = JSON.parse(readFileSync(here('scenes.json'), 'utf8')) as {
  scenes: Record<string, { width: number; height: number; say: string }>;
};

const [command, id, ...rest] = process.argv.slice(2);

if (command === 'ask') {
  const scene = words.scenes[id];
  if (!scene) throw new Error(`name a scene: ${Object.keys(words.scenes).join(', ')}`);
  const seeds = rest.length ? rest.map(Number) : [1];
  for (const seed of seeds) {
    const out = await callTool('create_image_pro', {
      description: scene.say,
      width: scene.width,
      height: scene.height,
      no_background: false,
      seed,
    });
    console.log(`${id}/${seed}: ${out.split('\n').filter((l) => /id|status|cost/i.test(l)).join(' | ')}`);
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
} else {
  console.log('ask <id> [seed ...] | get <job-id> <png>');
}
