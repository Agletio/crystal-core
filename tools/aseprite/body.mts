// A GENERATED body row to and from Aseprite, so a frame can be touched up
// there and put back.
//   body.mts export <sprite> <dir>   frames.json: the row's frames, states and key
//   body.mts import <sprite> <json>  a frames.json (edited) back into generated-art.ts
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { GENERATED } from '../../src/render/generated-art.ts';

const here = (f: string): string => new URL(`./${f}`, import.meta.url).pathname;
const [cmd, sprite, arg] = process.argv.slice(2);
const art = (GENERATED as Record<string, any>)[sprite];
if (!art) throw new Error(`no body ${sprite}`);

if (cmd === 'export') {
  mkdirSync(arg, { recursive: true });
  writeFileSync(`${arg}/frames.json`, JSON.stringify({ sprite, grid: art.grid, states: art.states, key: art.key, frames: art.frames }));
  console.log(`${sprite}: ${art.frames.length} frames, ${Object.keys(art.key).length} inks -> ${arg}/frames.json`);
} else if (cmd === 'import') {
  const edited = JSON.parse(readFileSync(arg, 'utf8'));
  if (edited.frames.length !== art.frames.length) throw new Error(`frame count ${edited.frames.length} != ${art.frames.length}`);
  const file = here('../../src/render/generated-art.ts');
  let src = readFileSync(file, 'utf8');
  const head = src.indexOf(`\n  ${sprite}: {`);
  const framesAt = src.indexOf('frames: [', head);
  const keyAt = src.indexOf('key: {', framesAt);
  const keyEnd = src.indexOf('}', keyAt) + 1;
  // frames and key are rewritten; everything else in the row is kept
  const framesText = `frames: [${edited.frames.map((f: string[]) => `[\n${f.map((r: string) => `      '${r}',`).join('\n')}\n    ]`).join(', ')}],\n    states: ${JSON.stringify(art.states)},\n    key: ${JSON.stringify(edited.key)}`;
  const statesAt = src.indexOf('states: {', framesAt);
  if (statesAt < 0 || statesAt > keyAt) throw new Error('row shape not understood');
  src = src.slice(0, framesAt) + framesText + src.slice(keyEnd);
  writeFileSync(file, src);
  let changed = 0;
  edited.frames.forEach((f: string[], i: number) => { if (f.join('\n') !== art.frames[i].join('\n')) changed++; });
  console.log(`${sprite}: ${changed} of ${edited.frames.length} frames changed, ${Object.keys(edited.key).length} inks -> generated-art.ts`);
} else console.log('export <sprite> <dir> | import <sprite> <frames.json>');
