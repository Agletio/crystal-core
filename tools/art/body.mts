/**
 * Asking the generator for a body, one step at a time. `bodies.json` is what
 * to say and `sandbox.json` is what came back — this walks between them.
 *
 *   npx tsx tools/art/body.mts ask   skeleton      one character, 8 rotations
 *   npx tsx tools/art/body.mts state skeleton      every state, on ONE facing
 *   npx tsx tools/art/body.mts sheet skeleton f.png  every frame, to look at
 *   npx tsx tools/art/body.mts fill  skeleton      the same states, elsewhere
 *   npx tsx tools/art/body.mts watch               until nothing is pending
 *
 * The order is the point and it is NOT a pipeline. `state` is deliberately one
 * facing, because a generated animation is judged rather than trusted: look at
 * it, re-roll what is wrong, WINDOW what is nearly right, and only then pay
 * for the other four. Fanning out first spends five times as much on frames
 * that turn out to face the camera.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { callTool, download, urlsIn } from './mcp.mts';
import { decodePng, encodePng } from './png.mts';

interface StateAsk {
  say: string;
  frames: number;
}
interface BodyAsk {
  sprite: string;
  character?: string;
  name: string;
  look: string;
  states: Record<string, StateAsk>;
}

/** How many of a body's jobs may be queued before the next call is refused. */
const IN_FLIGHT = 4;

const here = (file: string): string => new URL(`./${file}`, import.meta.url).pathname;
const asks = JSON.parse(readFileSync(here('bodies.json'), 'utf8')) as {
  dirs: string[];
  bodies: BodyAsk[];
};
type Made = { sprite: string; states: Record<string, { group: string }> };
const shipped = JSON.parse(readFileSync(here('sandbox.json'), 'utf8')) as {
  hero: Made;
  bodies: Made[];
};
/** The hero is a body like any other here: it is drawn out of the same table,
 *  and only the room it stands in knows the difference. */
const made = [...shipped.bodies, shipped.hero];

const [command, sprite] = process.argv.slice(2);
const body = asks.bodies.find((b) => b.sprite === sprite);
if (command !== 'watch' && !body) throw new Error(`${sprite ?? '(nothing)'} is not in bodies.json`);

/** The animation groups already imported for this body, by state name. */
const groups = (): Record<string, string> =>
  Object.fromEntries(
    Object.entries(made.find((b) => b.sprite === sprite)?.states ?? {}).map(([n, s]) => [
      n,
      s.group,
    ])
  );

const said = (out: string, keep: RegExp): string =>
  out.split('\n').filter((l) => keep.test(l)).join(' | ').slice(0, 160);

const wait = (ms: number): Promise<void> => new Promise((go) => setTimeout(go, ms));

/** Which facings each animation GROUP already holds, off its header line. */
async function facings(character: string): Promise<Map<string, Set<string>>> {
  const text = await callTool('get_character', { character_id: character });
  const out = new Map<string, Set<string>>();
  for (const line of text.split('\n')) {
    const m = /^ {2}\S.*? — \d+ dir \(([^)]*)\).*\[group: ([0-9a-f-]{36})\]/.exec(line);
    if (m) out.set(m[2], new Set(m[1].split(',').map((d) => d.trim())));
  }
  return out;
}

async function pending(character: string): Promise<string[]> {
  const text = await callTool('get_character', { character_id: character });
  const at = text.indexOf('pending jobs');
  if (at < 0) return [];
  return text
    .slice(at)
    .split('\n')
    .slice(1)
    .filter((l) => /^ {2}\S/.test(l))
    .map((l) => l.trim());
}

if (command === 'ask') {
  const out = await callTool('create_character', {
    name: body!.name,
    description: body!.look,
    body_type: 'humanoid',
    n_directions: 8,
    size: 96,
    view: 'high top-down',
    outline: 'single color black outline',
    shading: 'medium shading',
    detail: 'medium detail',
  });
  console.log(said(out, /id|status/i));
  console.log('put that id in bodies.json AND sandbox.json before going on');
} else if (command === 'state' || command === 'fill') {
  const character = body!.character;
  if (!character) throw new Error(`${sprite} has no character id yet — run \`ask\` first`);
  // One facing to judge, or the rest to fill in. `fill` appends to the group
  // the judged facing already made, so a body's states stay one group each.
  const on = command === 'state' ? asks.dirs.slice(2, 3) : asks.dirs.filter((_, i) => i !== 2);
  const known = groups();
  const held = command === 'fill' ? await facings(character) : new Map<string, Set<string>>();
  for (const [name, ask] of Object.entries(body!.states)) {
    const group = command === 'fill' ? known[name] : undefined;
    if (command === 'fill' && !group) {
      console.log(`${name}: not in sandbox.json yet — judge it first`);
      continue;
    }
    // Only what is MISSING, so a fill is idempotent: the rate limit answers
    // with a hint rather than an error, so a run routinely lands some of a
    // body's facings and not others, and the fix is to run it again.
    const want = on.filter((d) => !held.get(group ?? '')?.has(d));
    if (want.length === 0) {
      console.log(`${name}: all ${on.length} facings already`);
      continue;
    }
    // Only a handful of jobs may be in flight at once, and over the line the
    // server answers with a hint rather than an error — which reads as success
    // and silently leaves a facing missing.
    while ((await pending(character)).length > IN_FLIGHT) await wait(20_000);
    // The server dedupes on the DESCRIPTION and answers `already queued or
    // complete` for a re-ask, whatever directions are actually stored — so a
    // retry says the same thing in a way that hashes differently.
    let out = '';
    for (let go = 0; go < 3; go++) {
      out = await callTool('animate_character', {
        character_id: character,
        action_description: ask.say + '.'.repeat(go),
        animation_name: `${sprite}_${name}`,
        mode: 'v3',
        frame_count: ask.frames,
        directions: want,
        ...(group ? { animation_group_id: group } : {}),
      });
      if (!/nothing re-queued/.test(out)) break;
    }
    console.log(`${name}: ${want.join(', ')} — ${said(out, /group|cost|jobs|status/i)}`);
  }
} else if (command === 'sheet') {
  // One row per animation, one column per frame, straight off the generator.
  // What ships is judged in the room; what is judged HERE is which frames are
  // on model, and that is the only thing `from`/`to` can be picked from.
  const text = await callTool('get_character', { character_id: body!.character! });
  const rows: { name: string; urls: string[] }[] = [];
  let group = '';
  for (const line of text.split('\n')) {
    const head = /^ {2}(\S.*?) — \d+ dir/.exec(line);
    if (head) group = head[1];
    const dir = /^ {4}east: (https\S.*)$/.exec(line);
    if (dir && group && !rows.some((r) => r.name === group)) {
      rows.push({ name: group, urls: urlsIn(dir[1]) });
    }
  }
  const shots = await Promise.all(
    rows.map((r) => Promise.all(r.urls.map(async (u) => decodePng(await download(u)))))
  );
  const flat = shots.flat();
  const w = Math.max(...flat.map((i) => i.width));
  const h = Math.max(...flat.map((i) => i.height));
  const across = w * Math.max(...shots.map((s) => s.length));
  const down = h * rows.length;
  const out = new Uint8Array(across * down * 4);
  for (let i = 0; i < across * down; i++) out.set([24, 22, 28, 255], i * 4);
  shots.forEach((frames, r) =>
    frames.forEach((img, c) => {
      for (let y = 0; y < img.height; y++) {
        for (let x = 0; x < img.width; x++) {
          const from = (y * img.width + x) * 4;
          if (img.rgba[from + 3] < 128) continue;
          const to = ((r * h + y) * across + (c * w + x)) * 4;
          for (let k = 0; k < 4; k++) out[to + k] = img.rgba[from + k];
        }
      }
    })
  );
  writeFileSync(process.argv[4] ?? `${sprite}.png`, encodePng(across, down, out));
  console.log(rows.map((r, i) => `row ${i}: ${r.name} (${r.urls.length}f)`).join('\n'));
} else if (command === 'watch') {
  for (const b of asks.bodies) {
    if (!b.character) continue;
    const jobs = await pending(b.character);
    console.log(jobs.length === 0 ? `${b.sprite}: nothing pending` : `${b.sprite}:`);
    for (const job of jobs) console.log(`  ${job}`);
  }
} else {
  console.log('ask | state | sheet | fill <sprite>, or watch');
}
