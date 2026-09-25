/**
 * THE GAME FILES, KEPT UP TO DATE. The newest build on a branch is read off
 * GitHub and only the files whose contents changed are fetched. A file is kept
 * under its own sha256, so a build IS its manifest: the new one is written
 * only once every file it names is here, and a download cut short leaves the
 * last whole build running. The installer's own copy (`bundled`) is a second
 * place a file may already be, so a fresh install downloads nothing.
 *
 * Plain Node with the fetch handed in, so it runs outside Electron too.
 */
import { createHash } from 'node:crypto';
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { join } from 'node:path';

/** The newest `shell` a manifest may ask for and still be run by this app. */
export const SHELL = 1;
const WAIT = 8000; // ms for GitHub to answer at all
const STALL = 20000; // ms a download may go without a byte before it is given up

async function json(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

async function within(ms, fetchFn, url, init = {}) {
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), ms);
  try {
    return await fetchFn(url, { ...init, signal: stop.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** The commit `branch` is on, asked the way git asks: GitHub's API answers sixty times an hour a machine, and this is not counted. */
async function commitOf(fetchFn, repo, branch) {
  const res = await within(WAIT, fetchFn, `https://github.com/${repo}.git/info/refs?service=git-upload-pack`, { headers: { 'user-agent': 'git/2 crystal-core' } });
  if (!res.ok) return null;
  const name = branch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`([0-9a-f]{40}) refs/heads/${name}[\\n\\0]`).exec(await res.text())?.[1] ?? null;
}

/** The build the app runs from: the last one fetched, else the installer's own. */
export async function readBuilds(dataDir, bundledDir) {
  const current = await json(join(dataDir, 'current.json'));
  const bundled = bundledDir ? await json(join(bundledDir, 'manifest.json')) : null;
  return { current, bundled };
}

/** Where `path` of `manifest` is on disk: the store holds it by hash, or the installer shipped the same bytes. */
export function locate(dataDir, bundledDir, bundled, manifest, path) {
  const entry = manifest?.files?.[path];
  if (!entry) return null;
  const stored = join(dataDir, 'store', entry.sha256);
  if (existsSync(stored)) return stored;
  if (bundledDir && bundled?.files?.[path]?.sha256 === entry.sha256) return join(bundledDir, ...path.split('/'));
  return null;
}

async function download(fetchFn, url, dest, sha256, onBytes) {
  const stop = new AbortController();
  let timer = setTimeout(() => stop.abort(), STALL);
  const part = `${dest}.part`;
  try {
    const res = await fetchFn(url, { signal: stop.signal });
    if (!res.ok || !res.body) throw new Error(`${url} answered ${res.status}`);
    const hash = createHash('sha256');
    const out = createWriteStream(part);
    for await (const chunk of res.body) {
      clearTimeout(timer);
      timer = setTimeout(() => stop.abort(), STALL);
      hash.update(chunk);
      onBytes(chunk.length);
      if (!out.write(chunk)) await once(out, 'drain');
    }
    out.end();
    await once(out, 'finish');
    if (hash.digest('hex') !== sha256) throw new Error(`${url} arrived damaged`);
    await rename(part, dest);
  } finally {
    clearTimeout(timer);
    await rm(part, { force: true });
  }
}

/**
 * Brings the store up to the newest build on `branch` and returns what to run. With no answer from
 * GitHub it returns the last build it has; `say` hears every step, for the loading screen.
 */
export async function update({ repo, branch, dataDir, bundledDir, fetchFn, say = () => {} }) {
  const { current, bundled } = await readBuilds(dataDir, bundledDir);
  const have = current ?? bundled;
  const fallback = (why) => {
    if (!have) throw new Error(`no game files yet, and ${why}`);
    say({ stage: 'offline', commit: have.commit ?? null, why });
    return { manifest: have, commit: have.commit ?? null, offline: true, downloaded: 0 };
  };
  if (!fetchFn) return fallback('updates are off');

  say({ stage: 'checking', branch });
  let base;
  let remote;
  let commit = null;
  try {
    // A commit's raw files are never stale; a branch's are cached for five minutes.
    commit = await commitOf(fetchFn, repo, branch).catch(() => null);
    base = `https://raw.githubusercontent.com/${repo}/${commit ?? `refs/heads/${branch}`}/3d/`;
    const got = await within(WAIT, fetchFn, `${base}manifest.json`);
    if (!got.ok) throw new Error(`the build list answered ${got.status}`);
    remote = await got.json();
    if (!remote?.files) throw new Error('the build list is empty');
  } catch (e) {
    return fallback(e?.name === 'AbortError' ? 'GitHub did not answer' : String(e?.message ?? e));
  }
  if ((remote.shell ?? 1) > SHELL) {
    const run = fallback('this build needs a newer version of the app');
    return { ...run, needsShell: true };
  }

  const store = join(dataDir, 'store');
  await mkdir(store, { recursive: true });
  const missing = Object.entries(remote.files).filter(([path]) => !locate(dataDir, bundledDir, bundled, remote, path));
  const total = missing.reduce((n, [, f]) => n + f.size, 0);
  let done = 0;
  for (const [path, file] of missing) {
    say({ stage: 'downloading', files: missing.length, done, total });
    try {
      await download(fetchFn, base + path, join(store, file.sha256), file.sha256, (n) => {
        done += n;
        say({ stage: 'downloading', files: missing.length, done, total });
      });
    } catch (e) {
      return fallback(String(e?.message ?? e));
    }
  }

  const manifest = { ...remote, commit, branch };
  await writeFile(join(dataDir, 'current.part'), JSON.stringify(manifest));
  await rename(join(dataDir, 'current.part'), join(dataDir, 'current.json'));
  // What the new build no longer names goes; nothing is running from the store while this runs.
  const keep = new Set(Object.values(manifest.files).map((f) => f.sha256));
  for (const name of await readdir(store)) if (!keep.has(name)) await rm(join(store, name), { force: true });
  say({ stage: 'starting', commit });
  return { manifest, commit, offline: false, downloaded: total };
}
