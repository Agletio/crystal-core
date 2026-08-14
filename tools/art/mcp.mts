/**
 * The generator, as it actually is: an MCP server at `https://api.pixellab.ai/mcp`,
 * spoken to over plain JSON-RPC. `pixellab.mts` beside this one is the REST API,
 * which is a fraction of what exists — `create_character` poses onto a rigged
 * template, `animate_character` queues states against a stored one and
 * `create_topdown_tileset` returns a Wang set whose corners match, none of
 * which the REST spec has. The transport is one POST answering
 * `text/event-stream` with a single `data:` line, and holds no session.
 */
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

/** Storage needs no key and REFUSES one — a bearer token on a backblaze URL is
 *  a 401. Only the API host is told who is asking. */
export async function download(url: string): Promise<Buffer> {
  const mine = new URL(url).hostname.endsWith('api.pixellab.ai');
  const res = await fetch(url, mine ? { headers: { Authorization: `Bearer ${key()}` } } : {});
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
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
