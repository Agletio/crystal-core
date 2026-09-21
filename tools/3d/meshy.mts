/**
 * THE GENERATOR FOR 3D, and it is a plain REST API rather than an MCP server.
 * `https://api.meshy.ai`, bearer token, submit-and-poll: every endpoint answers
 * a task id and the task carries `status` until it is `SUCCEEDED`.
 *
 * WHAT IT DOWNLOADS IS RECORDED. A finished task hands back URLs the spec
 * declares only as `format: uri`, so which HOST serves them cannot be known
 * until one arrives — and if it is not a `*.meshy.ai` the environment's
 * allowlist has to learn it. `pull` prints and stores every host it fetched.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const BASE = 'https://api.meshy.ai';
const LEDGER = 'tools/3d/made.json';

export interface Made {
  hosts?: string[];
  tasks?: Record<string, { kind: string; id: string; status?: string; urls?: Record<string, string> }>;
}

export function key(): string {
  // The environment names it either way; caps are a convention, not a rule.
  const found = process.env.MESHY_API_KEY ?? process.env.Meshy_api_key ?? process.env.meshy_api_key;
  if (!found) throw new Error('MESHY_API_KEY is not set — it is fixed at container start, so a fresh session picks up a newly added one');
  return found;
}

export function ledger(): Made {
  return existsSync(LEDGER) ? (JSON.parse(readFileSync(LEDGER, 'utf8')) as Made) : {};
}

export function writeLedger(next: Made): void {
  mkdirSync(dirname(LEDGER), { recursive: true });
  writeFileSync(LEDGER, `${JSON.stringify(next, null, 2)}\n`);
}

async function call(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init?.method ?? 'GET'} ${path} -> ${res.status} ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

/** Submit, and hand back the task id the poll needs. */
export async function submit(path: string, body: Record<string, unknown>): Promise<string> {
  const out = (await call(path, { method: 'POST', body: JSON.stringify(body) })) as { result?: string; id?: string };
  const id = out.result ?? out.id;
  if (!id) throw new Error(`${path} answered no task id: ${JSON.stringify(out).slice(0, 200)}`);
  return id;
}

export interface Task {
  id: string;
  status: string;
  progress?: number;
  model_urls?: Record<string, string>;
  texture_urls?: Array<Record<string, string>>;
  rigged_character_glb_url?: string;
  animation_glb_url?: string;
  task_error?: { message?: string };
}

export const fetchTask = (path: string, id: string): Promise<Task> => call(`${path}/${id}`) as Promise<Task>;

/** Poll to a terminal state. Generation is minutes, so this is a slow loop by
 *  design and prints progress rather than going quiet. */
export async function waitFor(path: string, id: string, every = 10000): Promise<Task> {
  let said = -1;
  for (;;) {
    const task = await fetchTask(path, id);
    if (task.status === 'SUCCEEDED') return task;
    if (task.status === 'FAILED' || task.status === 'CANCELED') {
      throw new Error(`${id} ${task.status}: ${task.task_error?.message ?? 'no reason given'}`);
    }
    const at = task.progress ?? 0;
    if (at !== said) {
      console.log(`  ${id} ${task.status} ${at}%`);
      said = at;
    }
    await new Promise((go) => setTimeout(go, every));
  }
}

/** Fetch one URL to disk and REMEMBER ITS HOST, which is the open question
 *  about the allowlist: a download served off the generator's own domain needs
 *  nothing, and one served off cloud storage needs that host adding. */
export async function pull(url: string, dest: string): Promise<string> {
  const host = new URL(url).host;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${host} -> ${res.status}${res.status === 403 ? ' (allowlist? add this host)' : ''}`);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  const led = ledger();
  led.hosts = [...new Set([...(led.hosts ?? []), host])];
  writeLedger(led);
  return host;
}
