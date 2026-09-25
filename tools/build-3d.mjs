/**
 * THE DOWNLOAD: `3d/` is the game with its 3D half, and it plays from the disk
 * — `index.html` opened by a double-click, no server, no network, since all it
 * loads is classic scripts beside it.
 *
 *   node tools/build-3d.mjs        the page: docs/index.html less the analytics beacon
 *   node tools/build-3d.mjs zip    crystal-core-3d.zip of the folder, never committed
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, symlinkSync } from 'node:fs';
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
}
