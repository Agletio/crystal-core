/**
 * THE DOWNLOAD: `3d/` is the game with its 3D half, and it plays from the disk
 * — `index.html` opened by a double-click, no server, no network, since all it
 * loads is classic scripts beside it.
 *
 *   node tools/build-3d.mjs        the page (docs/index.html less the analytics beacon), then the manifest
 *   node tools/build-3d.mjs zip    crystal-core-3d.zip of the folder, never committed
 *
 * The MANIFEST is every file's sha256 and size, and it is what the desktop app (`shell/`) diffs to fetch
 * only what changed; `shell` is the oldest app that can run this build, `SHELL` in `shell/update.mjs`.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, symlinkSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const out = join(root, '3d');
const NAME = 'crystal-core-3d';

if (process.argv[2] === 'zip') {
  for (const need of ['index.html', 'app.js', 'gl/heroes.js', 'abyss/world.js']) {
    if (!existsSync(join(out, need))) {
      console.error(`build-3d: 3d/${need} missing — run \`npm run build\` first`);
      process.exit(1);
    }
  }
  // Zipped under its own name, so unpacking it makes one folder rather than a spill.
  const stage = join(root, '.scratch', 'zip-3d');
  const zip = join(root, `${NAME}.zip`);
  rmSync(stage, { recursive: true, force: true });
  rmSync(zip, { force: true });
  mkdirSync(stage, { recursive: true });
  symlinkSync(out, join(stage, NAME));
  execFileSync('zip', ['-r', '-q', '-9', zip, NAME], { cwd: stage, stdio: 'inherit' });
  rmSync(stage, { recursive: true, force: true });
  console.log(`build-3d: ${zip}`);
} else {
  const page = readFileSync(join(root, 'docs', 'index.html'), 'utf8');
  const beacon = /\n<!--[^\n]*-->\n<script[^\n]*cloudflareinsights[^\n]*<\/script>/;
  if (!beacon.test(page)) {
    console.error('build-3d: the analytics beacon has moved — the download must not carry it');
    process.exit(1);
  }
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'index.html'), page.replace(beacon, ''));
  const files = {};
  const walk = (dir) => {
    for (const entry of readdirSync(join(out, dir), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const path = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(path);
      else if (path !== 'manifest.json') {
        const bytes = readFileSync(join(out, path));
        files[path] = { sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length };
      }
    }
  };
  walk('');
  writeFileSync(join(out, 'manifest.json'), `${JSON.stringify({ shell: 1, files }, null, 1)}\n`);
}
