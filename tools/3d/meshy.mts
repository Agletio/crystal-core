/**
 * THE MESHY TRANSPORT, shared by every tool that asks it for anything: the
 * call with its back-off, the poll, the download, and the LEDGER that makes a
 * run idempotent — a step already SUCCEEDED with its file on disk is skipped,
 * and one SUCCEEDED without its file is fetched again off its id, since a
 * download URL is signed and expires and an id does not.
 *
 * A module, not a script: importing it runs nothing.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, rmdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const BASE = 'https://api.meshy.ai/openapi';

export interface Entry {
  id: string;
  status: string;
  credits?: number;
  from?: string;
}
export type Ledger = Record<string, Entry>;

const key = (): string => {
  const k = process.env.MESHY_API_KEY ?? process.env.Meshy_api_key;
  if (!k) throw new Error('no Meshy key in the environment');
  return k;
};

export const readLedger = (file: string): Ledger => (existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as Ledger) : {});

// MANY RUNS WRITE ONE LEDGER AT ONCE, so a write is a read-modify-write under a
// directory lock and lands by rename: a half-written ledger read by a
// neighbour once lost a submitted task, credits and all.
const nap = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
export function record(file: string, name: string, entry: Entry): void {
  const lock = `${file}.lock`;
  for (let tries = 0; ; tries++) {
    try {
      mkdirSync(lock);
      break;
    } catch {
      if (tries > 400) throw new Error(`${lock} held for 20s — remove it if no run is going`);
      nap(50);
    }
  }
  try {
    const all = readLedger(file);
    all[name] = entry;
    const sorted = Object.fromEntries(Object.entries(all).sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(`${file}.tmp`, `${JSON.stringify(sorted, null, 2)}\n`);
    renameSync(`${file}.tmp`, file);
  } finally {
    rmdirSync(lock);
  }
}

export async function call(path: string, init?: RequestInit): Promise<any> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json' },
    });
    const text = await res.text();
    if (res.ok) return text ? JSON.parse(text) : null;
    // 429 and 5xx are the service pacing us; anything else is our ask.
    if ((res.status === 429 || res.status >= 500) && attempt < 6) {
      await new Promise((go) => setTimeout(go, 4000 * 2 ** attempt));
      continue;
    }
    throw new Error(`${init?.method ?? 'GET'} ${path} -> ${res.status} ${text.slice(0, 400)}`);
  }
}

async function wait(path: string, id: string, label: string): Promise<any> {
  let said = -1;
  for (;;) {
    const task = await call(`${path}/${id}`);
    if (task.status === 'SUCCEEDED') return task;
    if (task.status === 'FAILED' || task.status === 'CANCELED') {
      throw new Error(`${label} ${task.status}: ${task.task_error?.message ?? 'no reason given'}`);
    }
    if (task.progress !== said) {
      console.log(`  ${label} ${task.status} ${task.progress ?? 0}%`);
      said = task.progress;
    }
    await new Promise((go) => setTimeout(go, 8000));
  }
}

export async function download(url: string, dest: string): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
      return;
    }
    if (attempt >= 4) throw new Error(`download ${new URL(url).host} -> ${res.status}`);
    await new Promise((go) => setTimeout(go, 3000 * 2 ** attempt));
  }
}

/** Submit unless `ledger` already holds `name`, wait for it, fetch its file. Null when there was nothing to do. */
export async function run(
  ledger: string,
  name: string,
  path: string,
  body: Record<string, unknown>,
  file: string,
  urlOf: (task: any) => string | undefined
): Promise<any> {
  const had = readLedger(ledger)[name];
  if (had?.status === 'SUCCEEDED' && existsSync(file)) {
    console.log(`  ${name}: have it`);
    return null;
  }
  let id = had && had.status !== 'FAILED' && had.status !== 'NEW' ? had.id : '';
  if (!id) {
    const out = await call(path, { method: 'POST', body: JSON.stringify(body) });
    id = out.result ?? out.id;
    record(ledger, name, { id, status: 'PENDING', from: had?.from });
    console.log(`  ${name}: submitted ${id}`);
  }
  const task = await wait(path, id, name);
  const url = urlOf(task);
  if (!url) throw new Error(`${name}: SUCCEEDED with no file to fetch`);
  await download(url, file);
  record(ledger, name, { id, status: 'SUCCEEDED', credits: task.consumed_credits ?? undefined, from: had?.from });
  console.log(`  ${name}: ${file}`);
  return task;
}

export async function balance(): Promise<number> {
  return (await call('/v1/balance')).balance;
}
