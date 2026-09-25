/**
 * CRYSTAL CORE ON THE DESKTOP: the download's build in its own window. It
 * fetches the newest build on its branch each time it starts (and on F5),
 * then serves those files from disk over `app://game/` — a real origin, so the
 * save in local storage outlives every update. The window has no browser
 * around it: F11 is fullscreen, F5 checks for a new build and reloads, F12 the
 * developer tools.
 *
 *   npm start                  in shell/, the repo's own 3d/ as the installer's copy
 *   npm start -- --offline     no network: whatever build is on disk
 *   CRYSTAL_BRANCH=main        another branch; settings.json in the data folder can say the same
 *   CRYSTAL_QUERY=3d           the page's own query: `3d` draws in 3D without a GPU, `low` a quality
 */
import { app, BrowserWindow, Menu, net, protocol, shell } from 'electron';
import { createReadStream, existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBuilds, locate, update } from './update.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };

protocol.registerSchemesAsPrivileged([{ scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
app.commandLine.appendSwitch('force_high_performance_gpu'); // a laptop's second graphics card, where it has one
if (!app.requestSingleInstanceLock()) app.quit();

let win = null;
let running = null; // the manifest being served
let shipped = null; // the installer's own
let refreshing = false;

const dataDir = () => join(app.getPath('userData'), 'game');
const bundledDir = () => (app.isPackaged ? join(process.resourcesPath, 'game') : join(here, '..', '3d'));

async function settings() {
  try {
    return JSON.parse(await readFile(join(app.getPath('userData'), 'settings.json'), 'utf8'));
  } catch {
    return {};
  }
}

async function remember(change) {
  const next = { ...(await settings()), ...change };
  await writeFile(join(app.getPath('userData'), 'settings.json'), JSON.stringify(next, null, 1)).catch(() => undefined);
}

async function source() {
  const built = JSON.parse(await readFile(join(here, 'build.json'), 'utf8'));
  const chosen = await settings();
  return { repo: chosen.repo ?? built.repo, branch: process.env.CRYSTAL_BRANCH ?? chosen.branch ?? built.branch };
}

async function serve(request) {
  const url = new URL(request.url);
  const path = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
  const file = locate(dataDir(), bundledDir(), shipped, running, path);
  if (!file || !existsSync(file)) return new Response('not found', { status: 404 });
  return new Response(Readable.toWeb(createReadStream(file)), { headers: { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' } });
}

/** The loading screen, told each step at most ten times a second — a download reports every chunk. */
function speaker() {
  let last = 0;
  let stage = '';
  return (msg) => {
    const now = Date.now();
    if (msg.stage === stage && msg.stage === 'downloading' && now - last < 100) return;
    last = now;
    stage = msg.stage;
    win?.webContents.executeJavaScript(`window.say && window.say(${JSON.stringify(msg)})`).catch(() => undefined);
  };
}

async function refresh() {
  if (refreshing || !win) return;
  refreshing = true;
  try {
    await win.loadFile(join(here, 'loading.html'));
    const say = speaker();
    const { repo, branch } = await source();
    say({ stage: 'checking', branch });
    try {
      const got = await update({ repo, branch, dataDir: dataDir(), bundledDir: bundledDir(), fetchFn: process.argv.includes('--offline') ? null : net.fetch, say });
      running = got.manifest;
      shipped = (await readBuilds(dataDir(), bundledDir())).bundled;
      win.setTitle(`Crystal Core — ${got.commit ? got.commit.slice(0, 7) : 'installed build'}${got.offline ? ' (offline)' : ''}`);
      if (got.needsShell) await new Promise((go) => setTimeout(go, 4000)); // long enough to read that the app is behind
      await win.loadURL(`app://game/index.html${process.env.CRYSTAL_QUERY ? `?${process.env.CRYSTAL_QUERY}` : ''}`);
    } catch (e) {
      say({ stage: 'error', why: String(e?.message ?? e) });
    }
  } finally {
    refreshing = false;
  }
}

function keys(event, input) {
  if (input.type !== 'keyDown') return;
  const key = input.key;
  if (key === 'F11' || (input.alt && key === 'Enter')) {
    event.preventDefault();
    win.setFullScreen(!win.isFullScreen());
    void remember({ fullscreen: win.isFullScreen() });
  } else if (key === 'F5') {
    event.preventDefault();
    void refresh();
  } else if (key === 'F12' || (input.control && input.shift && key.toLowerCase() === 'i')) {
    event.preventDefault();
    win.webContents.toggleDevTools();
  }
}

app.on('second-instance', () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});
app.on('window-all-closed', () => app.quit());

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  protocol.handle('app', serve);
  win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    title: 'Crystal Core',
    backgroundColor: '#0c0a08',
    webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false, spellcheck: false },
  });
  if ((await settings()).fullscreen) win.setFullScreen(true);
  else win.maximize();
  win.show();
  win.webContents.on('before-input-event', keys);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('app://') || url.startsWith('file://')) return;
    event.preventDefault();
    if (/^https?:/.test(url)) void shell.openExternal(url);
  });
  win.on('page-title-updated', (event) => event.preventDefault()); // the title says which build, not the page's name
  await refresh();
});
