/**
 * Asking the generator for a body, one step at a time. `bodies.json` is what
 * to say and `generated.json` is what came back — this walks between them.
 *
 *   body.mts design gaunt [n]     n design images, ONE generation each
 *   body.mts rotate gaunt f.png   the approved design into 8 facings, for 2
 *   body.mts state  gaunt         every state, on the one FACING
 *   body.mts sheet  gaunt f.png   every frame, to look at
 *   body.mts props                every prop, from scratch
 *   body.mts watch                until nothing is pending
 *
 * The ORDER is the whole trick. A design is one generation and a body is
 * thirty, so a body nobody likes dies at `design`. Three things settle there
 * and nowhere else: the silhouette, the proportions and the TONE.
 *
 * A body is ONE facing — `face` in `bodies.json`, an angled side profile — and
 * the renderer mirrors it for the left half. An animation is judged rather than
 * trusted: look at it, re-roll what is wrong, WINDOW what is nearly right.
 *
 * `ROADMAP.md` holds the runbook and the pitfalls. Read them.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { callTool, download, fields, urlsIn } from './mcp.mts';
import { decodePng, encodePng, type Decoded } from './png.mts';

interface StateAsk {
  say: string;
  frames: number;
}
interface BodyAsk {
  sprite: string;
  character?: string;
  name: string;
  look: string;
  /** `standard` poses ONE rigged template, so every body shares a silhouette
   *  whatever the words say; `v3` is free of it at 2-9 generations. */
  mode?: 'standard' | 'pro' | 'v3';
  /** `standard` only, and its default preset is the bobblehead. */
  proportions?: string;
  size?: number;
  states: Record<string, StateAsk>;
}

/** The account may hold TEN jobs at once, and the ceiling is GLOBAL rather than
 *  per character — pacing off one body's pending count fires straight into the
 *  limit the moment a second body is in flight. `list_jobs` is the only
 *  authoritative answer. A call asks for one job PER DIRECTION and needs them
 *  all at once, so a five-facing ask needs five free slots. */
const SLOTS = 10;

const here = (file: string): string => new URL(`./${file}`, import.meta.url).pathname;
const asks = JSON.parse(readFileSync(here('bodies.json'), 'utf8')) as {
  face: string;
  inks: string[];
  bodies: BodyAsk[];
  props: { id: string; tiles: number; say: string; view?: string; size?: number }[];
};
type Made = { sprite: string; states: Record<string, { group: string }> };
const shipped = JSON.parse(readFileSync(here('generated.json'), 'utf8')) as {
  hero: Made;
  bodies: Made[];
  props: { id: string }[];
};
/** The hero is a body like any other here: it is drawn out of the same table,
 *  and only the room it stands in knows the difference. */
const made = [...shipped.bodies, shipped.hero];

/** No two of a body's says may share their first thirty characters: the server
 *  keys an animation's TYPE off that prefix and refuses the second silently. */
for (const b of asks.bodies) {
  const seen = new Map<string, string>();
  for (const [name, ask] of Object.entries(b.states)) {
    const head = ask.say.slice(0, 30);
    const clash = seen.get(head);
    if (clash) throw new Error(`${b.sprite}: "${name}" and "${clash}" open with the same thirty characters`);
    seen.set(head, name);
  }
}

const [command, sprite] = process.argv.slice(2);
const body = asks.bodies.find((b) => b.sprite === sprite);
if (!['watch', 'props'].includes(command) && !body) throw new Error(`${sprite ?? '(nothing)'} is not in bodies.json`);

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

/** Jobs in flight ACROSS the account. A refusal reads `need 5 job slots but
 *  only 1 available (9/10 used)`, and it comes back as TEXT rather than as an
 *  error — so anything that does not check is recording a lie. */
async function inFlight(): Promise<number> {
  const text = await callTool('list_jobs', {});
  if (/no active jobs/i.test(text)) return 0;
  const said = /(\d+)\s*\/\s*10/.exec(text);
  if (said) return Number(said[1]);
  return text.split('\n').filter((l) => /^\s*\S/.test(l) && /[0-9a-f-]{36}/.test(l)).length;
}

/** Wait until `want` slots are free, so a call is made when it can succeed
 *  rather than made and refused. */
async function room(want: number): Promise<void> {
  for (let tries = 0; tries < 120; tries++) {
    if (SLOTS - (await inFlight()) >= want) return;
    await wait(20_000);
  }
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

/** The inks a design is FORCED onto, as an image. Words alone will not make a
 *  body dark — v3 ignores `text_guidance_scale` and returned ivory twice — and
 *  every zone floor is pale by decision, so a body that is not dark separates
 *  from none of them. */
function palette(): string {
  const S = 8;
  const w = asks.inks.length * S;
  const px = new Uint8Array(w * S * 4);
  asks.inks.forEach((hex, i) => {
    const [r, g, b] = [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16));
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const d = (y * w + i * S + x) * 4;
        px[d] = r; px[d + 1] = g; px[d + 2] = b; px[d + 3] = 255;
      }
    }
  });
  return `data:image/png;base64,${encodePng(w, S, px).toString('base64')}`;
}

/** A square design at another size, area-averaged. This is a REFERENCE and not
 *  art that ships, so it is not held to the integer rule the conversion is —
 *  what it has to be is the size the rotation should come back at. */
function resample({ width, height, rgba }: Decoded, size: number): string {
  const out = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const x0 = Math.floor((x * width) / size);
      const x1 = Math.max(x0 + 1, Math.floor(((x + 1) * width) / size));
      const y0 = Math.floor((y * height) / size);
      const y1 = Math.max(y0 + 1, Math.floor(((y + 1) * height) / size));
      const sum = [0, 0, 0, 0];
      for (let sy = y0; sy < y1; sy++)
        for (let sx = x0; sx < x1; sx++) {
          const a = rgba[(sy * width + sx) * 4 + 3];
          for (let c = 0; c < 3; c++) sum[c] += rgba[(sy * width + sx) * 4 + c] * a;
          sum[3] += a;
        }
      const n = (y1 - y0) * (x1 - x0);
      const d = (y * size + x) * 4;
      for (let c = 0; c < 3; c++) out[d + c] = sum[3] ? Math.round(sum[c] / sum[3]) : 0;
      out[d + 3] = Math.round(sum[3] / n);
    }
  return encodePng(size, size, out).toString('base64');
}

/** Everything not JOINED to the body, gone. A design is asked for with no
 *  ground, no base and no other objects, and it draws them anyway — a pebble
 *  field under the feet, a blood pool, a spare skull. Detached is the whole
 *  test, so this is a rule rather than a thing to ask for and hope, the way
 *  the outline and the background flood already are. It reports what it took,
 *  because a genuinely detached scrap of cloth would go the same way. */
function loose({ width: W, height: H, rgba }: Decoded): [Buffer, number] {
  const mine = new Int32Array(W * H).fill(-1);
  const sizes: number[] = [];
  for (let seed = 0; seed < W * H; seed++) {
    if (rgba[seed * 4 + 3] < 40 || mine[seed] >= 0) continue;
    const id = sizes.length;
    let n = 0;
    const stack = [seed];
    mine[seed] = id;
    while (stack.length) {
      const at = stack.pop()!;
      n++;
      const x = at % W;
      const y = (at / W) | 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny * W + nx;
          if (rgba[j * 4 + 3] < 40 || mine[j] >= 0) continue;
          mine[j] = id;
          stack.push(j);
        }
    }
    sizes.push(n);
  }
  const body = sizes.indexOf(Math.max(...sizes, 0));
  const out = new Uint8Array(rgba);
  let dropped = 0;
  for (let i = 0; i < W * H; i++)
    if (mine[i] >= 0 && mine[i] !== body) {
      out.set([0, 0, 0, 0], i * 4);
      dropped++;
    }
  return [encodePng(W, H, out), dropped];
}

if (command === 'design') {
  // ONE image, one generation, ~30 seconds. Everything after this costs thirty,
  // so a body nobody likes is meant to die here.
  const many = Number(process.argv[4] ?? 3);
  const dir = here('cache/designs');
  mkdirSync(dir, { recursive: true });
  const jobs: string[] = [];
  for (let n = 0; n < many; n++) {
    const out = await callTool('create_image_pixflux', {
      description: body!.look,
      width: 128,
      height: 128,
      no_background: true,
      view: 'high top-down',
      direction: asks.face,
      outline: 'single color black outline',
      shading: 'detailed shading',
      detail: 'highly detailed',
      text_guidance_scale: 12,
      color_image_url: palette(),
    });
    const job = fields(out).job_id ?? /([0-9a-f-]{36})/.exec(out)?.[1];
    if (job) jobs.push(job);
    else console.log(`${n}: refused — ${said(out, /error|hint/i)}`);
  }
  for (const [n, job] of jobs.entries()) {
    let url = '';
    for (let go = 0; go < 30 && !url; go++) {
      if (go > 0) await wait(10_000);
      const f = fields(await callTool('get_image', { job_id: job }));
      url = (f.image_url ?? f.download ?? '').split(/\s+/)[0];
      if (!url.startsWith('http')) url = '';
    }
    if (!url) { console.log(`${sprite}-${n}: never arrived`); continue; }
    const [png, dropped] = loose(decodePng(await download(url)));
    writeFileSync(`${dir}/${sprite}-${n}.png`, png);
    console.log(`${dir}/${sprite}-${n}.png${dropped ? `  (dropped ${dropped} loose px)` : ''}`);
  }
  console.log('LOOK at them on the four zone floors, then `rotate` the one that is approved');
} else if (command === 'grab') {
  // The base frames a layer is cut AGAINST. `dress.mts --state` writes the
  // dressed half of the same pair.
  const text = await callTool('get_character', { character_id: body!.character! });
  const dir = here('cache/designs');
  for (const facing of [asks.face]) {
    const url = new RegExp(`^ {2}${facing}: (https\\S+)$`, 'm').exec(text);
    if (!url) { console.log(`${facing}: no rotation`); continue; }
    writeFileSync(`${dir}/${sprite}-${facing}.png`, await download(url[1]));
    console.log(`${dir}/${sprite}-${facing}.png`);
  }
} else if (command === 'rotate') {
  // The approved design, turned into eight facings at the grid a body SHIPS at.
  // The reference's own size beats `size` — a 128 design came back 128 — and at
  // 128 an animation costs two generations a direction and a body is 1.78x the
  // source. So the design is resampled to `size` before it is sent.
  const size = body!.size ?? 96;
  const out = await callTool('create_character', {
    name: body!.name,
    description: body!.look,
    body_type: 'humanoid',
    mode: 'v3',
    reference_image_base64: resample(decodePng(readFileSync(process.argv[4])), size),
    size,
    view: 'high top-down',
  });
  console.log(said(out, /id|status/i));
  console.log('put that id in bodies.json AND generated.json before going on');
} else if (command === 'ask') {
  const out = await callTool('create_character', {
    name: body!.name,
    description: body!.look,
    body_type: 'humanoid',
    n_directions: 8,
    size: body!.size ?? 96,
    view: 'high top-down',
    outline: 'single color black outline',
    shading: 'medium shading',
    detail: 'medium detail',
    ...(body!.mode ? { mode: body!.mode } : {}),
    ...(body!.proportions ? { proportions: body!.proportions } : {}),
  });
  console.log(said(out, /id|status/i));
  console.log('put that id in bodies.json AND generated.json before going on');
} else if (command === 'state') {
  const character = body!.character;
  if (!character) throw new Error(`${sprite} has no character id yet — run \`ask\` first`);
  // One facing to judge, or the rest to fill in. `fill` appends to the group
  // the judged facing already made, so a body's states stay one group each.
  const on = [asks.face];
  const held = await facings(character);
  // Naming states asks for THOSE, which is what a re-roll wants: a judged state
  // that failed is deleted and asked again, and the five that passed are not
  // paid for a second time.
  const only = new Set(process.argv.slice(4));
  for (const [name, ask] of Object.entries(body!.states)) {
    if (only.size && !only.has(name)) continue;
    const group = groups()[name];
    // Only what is MISSING, so a fill is idempotent: the rate limit answers
    // with a hint rather than an error, so a run routinely lands some of a
    // body's facings and not others, and the fix is to run it again.
    const want = on.filter((d) => !held.get(group ?? '')?.has(d));
    if (want.length === 0) {
      console.log(`${name}: all ${on.length} facings already`);
      continue;
    }
    // ONE facing per call, appended to the same group. A five-facing call needs
    // five slots at once and is refused whole; one at a time keeps the pipe
    // full instead, and a refusal costs one facing rather than five.
    let into = group;
    for (const facing of want) {
      await room(1);
      // The server dedupes on the DESCRIPTION and answers `already queued or
      // complete` for a re-ask, whatever directions are actually stored — so a
      // retry says the same thing in a way that hashes differently.
      let out = '';
      let got = '';
      for (let go = 0; go < 4 && !got; go++) {
        if (go > 0) await wait(20_000);
        out = await callTool('animate_character', {
          character_id: character,
          action_description: ask.say + '.'.repeat(go),
          animation_name: `${sprite}_${name}`,
          mode: 'v3',
          frame_count: ask.frames,
          directions: [facing],
          ...(into ? { animation_group_id: into } : {}),
        });
        got = /group[:= ]+([0-9a-f-]{36})/.exec(out)?.[1] ?? '';
      }
      if (!got) {
        console.log(`${name}/${facing}: GAVE UP — ${said(out, /error|hint|slots/i)}`);
        continue;
      }
      into ??= got;
      console.log(`${name}/${facing}: ${got}`);
    }
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
  // A state whose frames are still rendering has no urls, and the sizes below
  // are then a max over nothing — which reaches `encodePng` as a NaN rather
  // than as a complaint about the thing that is actually wrong.
  if (flat.length === 0) throw new Error(`${sprite}: no frames yet — still rendering?`);
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
} else if (command === 'props') {
  // ~15-30s each and about five may be in flight, so they go in twos with a
  // pause. Nothing here waits for one: the id is what is wanted, and
  // `tables.mts` reads whatever has finished by the time it runs.
  // Only what has no id yet, so a run after adding a row costs one generation.
  // Naming one is how a bad roll is asked for AGAIN.
  const done = new Set(shipped.props.map((p) => p.id));
  const want = asks.props.filter((p) => (sprite ? p.id === sprite : !done.has(p.id)));
  for (const [i, ask] of want.entries()) {
    const out = await callTool('create_map_object', {
      description: ask.say,
      width: ask.size ?? 96,
      height: ask.size ?? 96,
      view: ask.view ?? 'high top-down',
      outline: 'single color outline',
      shading: 'medium shading',
      detail: 'high detail',
    });
    console.log(`${ask.id}: ${said(out, /^id|status/i)}`);
    if (i % 2 === 1) await wait(20_000);
  }
} else if (command === 'watch') {
  for (const b of asks.bodies) {
    if (!b.character) continue;
    const jobs = await pending(b.character);
    console.log(jobs.length === 0 ? `${b.sprite}: nothing pending` : `${b.sprite}:`);
    for (const job of jobs) console.log(`  ${job}`);
  }
} else {
  console.log('ask | state | sheet | fill <sprite>, or props, or watch');
}
