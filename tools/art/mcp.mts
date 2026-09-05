/**
 * The generator, as it actually is: an MCP server at `https://api.pixellab.ai/mcp`,
 * spoken to over plain JSON-RPC. `pixellab.mts` beside this one is the REST API,
 * which is a fraction of what exists — `create_character` poses onto a rigged
 * template, `animate_character` queues states against a stored one and
 * `create_topdown_tileset` returns a Wang set whose corners match, none of
 * which the REST spec has. The transport is one POST answering
 * `text/event-stream` with a single `data:` line, and holds no session.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const URL_MCP = 'https://api.pixellab.ai/mcp';

interface Rpc {
  result?: { content?: Array<{ type: string; text?: string }> };
  error?: { message: string };
}

function key(): string {
  const found = process.env.PIXELLAB_API_KEY;
  if (!found) throw new Error('PIXELLAB_API_KEY is not set');
  return found;
}

let nextId = 1;

/** Every tool answers in lines of `field: value` rather than JSON. */
export async function callTool(name: string, args: Record<string, unknown>): Promise<string> {
  const res = await fetch(URL_MCP, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: nextId++,
      method: 'tools/call',
      params: { name, arguments: args },
    }),
  });
  const body = await res.text();
  const line = body.split('\n').find((l) => l.startsWith('data: '));
  if (!line) throw new Error(`${name}: ${res.status} ${body.slice(0, 300)}`);
  const answer = JSON.parse(line.slice(6)) as Rpc;
  if (answer.error) throw new Error(`${name}: ${answer.error.message}`);
  return (answer.result?.content ?? []).map((c) => c.text ?? '').join('\n');
}

/**
 * Storage needs no key and REFUSES one — a bearer token on a backblaze URL is
 * a 401. Only the API host is told who is asking.
 *
 * READ THROUGH DISK, keyed on the PATH: the query carries a per-request
 * timestamp, where the path names an object the store never rewrites. A
 * whole-table import is fifteen minutes of frames that one flaky object kills,
 * so a rerun picks up where the last got to rather than starting over.
 */
export async function download(url: string): Promise<Buffer> {
  const held = cached(url);
  if (held && existsSync(held)) return readFileSync(held);
  await take();
  let got: Buffer;
  try {
    got = await fetchOnce(url);
  } finally {
    give();
  }
  if (held) {
    mkdirSync(dirname(held), { recursive: true });
    writeFileSync(held, got);
  }
  return got;
}

/** Where a frame is kept, or null for anything not worth keeping. */
function cached(url: string): string | null {
  const at = new URL(url);
  if (!at.pathname.endsWith('.png')) return null;
  const name = createHash('sha1').update(at.pathname).digest('hex');
  return new URL(`./cache/frames/${name}.png`, import.meta.url).pathname;
}

/** IN FLIGHT AT ONCE, over every caller: `tables.mts` fans a whole roster out
 *  through `Promise.all`, and 502, a 200 of HTML and a cut transfer are three
 *  faces of one throttle that retrying alone does not answer. */
const AT_ONCE = 6;
let running = 0;
const queue: (() => void)[] = [];
function take(): Promise<void> {
  if (running < AT_ONCE) {
    running++;
    return Promise.resolve();
  }
  return new Promise((go) => queue.push(go));
}
function give(): void {
  // A waiter INHERITS the slot rather than freeing it, or the count drifts.
  const next = queue.shift();
  if (next) next();
  else running--;
}

async function fetchOnce(url: string): Promise<Buffer> {
  const mine = new URL(url).hostname.endsWith('api.pixellab.ai');
  let last = '';
  for (let go = 0; go < 8; go++) { // one object 502s a third of the time
    if (go > 0) await new Promise((r) => setTimeout(r, Math.min(15_000, 1000 * 2 ** go)));
    try {
      const res = await fetch(url, mine ? { headers: { Authorization: `Bearer ${key()}` } } : {});
      if (res.ok) {
        const body = Buffer.from(await res.arrayBuffer());
        // A 200 carrying an error page is the SAME throttle wearing a different
        // hat, and it reaches the importer as `not a PNG` a hundred frames later.
        if (!/\.png(\?|$)/.test(url) || body.subarray(0, 4).toString('hex') === '89504e47') return body;
        last = `${body.length}B that is not a PNG`;
      } else {
        last = String(res.status);
        if (res.status < 500 && res.status !== 429) break; // a 404 will not heal
      }
    } catch (why) {
      last = String(why); // a cut transfer, which is the other shape of the same fault
    }
  }
  throw new Error(`${last} for ${url}`);
}

/** Every `key: value` line of a tool's answer, first one wins. */
export function fields(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const at = line.indexOf(':');
    if (at < 0) continue;
    const k = line.slice(0, at).trim();
    if (k && !(k in out)) out[k] = line.slice(at + 1).trim();
  }
  return out;
}

/** Every https URL in a blob of the server's prose, in order. */
export const urlsIn = (text: string): string[] => text.match(/https:\/\/[^\s,]+/g) ?? [];
