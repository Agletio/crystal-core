/**
 * The web NODE KIT: frames and chain.   `webkit.mts ask [id ...] | emit`
 *
 * `webkit.json` beside this is what to SAY, one pixflux ask per piece —
 * a frame is well under the size at which a kit sheet gives detail, so each
 * is asked ALONE, the socket's own lesson. `ask` generates every piece with
 * no PNG in `cache/web/` (naming ids re-asks those); `emit` writes
 * `src/render/generated-web.ts` as data URIs, the `generated-ui.ts` pattern.
 * The node ICONS are `wn_*` rows in `icons.json`, not pieces here.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { callTool, download, fields } from './mcp.mts';
import { decodePng, encodePng } from './png.mts';

const here = (file: string): string => new URL(`./${file}`, import.meta.url).pathname;
const CACHE = here('cache/web');

interface Piece { id: string; width: number; height: number; say: string }
const kit = JSON.parse(readFileSync(here('webkit.json'), 'utf8')) as {
  how: string;
  pieces: Piece[];
};

/** The icon palette as an image, so the kit sits in the same inks. */
function palette(): string {
  const inks = (JSON.parse(readFileSync(here('icons.json'), 'utf8')) as { inks: string[] }).inks;
  const S = 8, w = inks.length * S, px = new Uint8Array(w * S * 4);
  inks.forEach((hex, i) => {
    const [r, g, b] = [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16));
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const d = (y * w + i * S + x) * 4;
      px[d] = r; px[d + 1] = g; px[d + 2] = b; px[d + 3] = 255;
    }
  });
  return `data:image/png;base64,${encodePng(w, S, px).toString('base64')}`;
}

async function ask(which: string[]): Promise<void> {
  mkdirSync(CACHE, { recursive: true });
  const todo = kit.pieces.filter((p) =>
    which.length ? which.includes(p.id) : !existsSync(`${CACHE}/${p.id}.png`)
  );
  const jobs: [Piece, string][] = [];
  for (const piece of todo) {
    const out = await callTool('create_image_pixflux', {
      description: piece.say + kit.how,
      width: piece.width, height: piece.height, no_background: true, view: 'side',
      outline: 'single color black outline', shading: 'medium shading', detail: 'medium detail',
      text_guidance_scale: 13, color_image_url: palette(),
    });
    const job = fields(out).job_id ?? /([0-9a-f-]{36})/.exec(out)?.[1];
    if (job) jobs.push([piece, job]);
    else console.log(`${piece.id}: refused — ${out.slice(0, 160)}`);
  }
  for (const [piece, job] of jobs) {
    let url = '';
    for (let go = 0; go < 60 && !url; go++) {
      await new Promise((r) => setTimeout(r, 8000));
      const f = fields(await callTool('get_image', { job_id: job }));
      url = (f.image_url ?? f.download ?? '').split(/\s+/)[0];
      if (!url.startsWith('http')) url = '';
    }
    if (!url) { console.log(`${piece.id}: never arrived`); continue; }
    writeFileSync(`${CACHE}/${piece.id}.png`, await download(url));
    console.log(`${piece.id}.png`);
  }
}

function emit(): void {
  const rows: string[] = [];
  for (const p of kit.pieces) {
    const file = `${CACHE}/${p.id}.png`;
    if (!existsSync(file)) throw new Error(`${p.id}.png missing — run ask first`);
    const { width, height, rgba } = decodePng(readFileSync(file));
    const png = `data:image/png;base64,${encodePng(width, height, rgba).toString('base64')}`;
    rows.push(`  ${p.id}: { w: ${width}, h: ${height}, png: '${png}' },`);
    console.log(`${p.id}: ${width}x${height}`);
  }
  writeFileSync(
    here('../../src/render/generated-web.ts'),
    `/**\n * Written by \`tools/art/webkit.mts emit\`. Do not edit by hand.\n *\n * The web node kit: generated frames and the chain segment, as data URIs.\n * The webs draw each as an SVG <image>, so one PNG serves every zoom.\n */\nexport interface WebArt { w: number; h: number; png: string }\n\nexport const WEB_ART: Record<string, WebArt> = {\n${rows.join('\n')}\n};\n`
  );
  console.log('-> src/render/generated-web.ts');
}

const verb = process.argv[2];
if (verb === 'ask') await ask(process.argv.slice(3));
else if (verb === 'emit') emit();
else console.log('webkit.mts ask [id ...] | emit');
