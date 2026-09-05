/**
 * The UI FIXTURE KIT.   `uikit.mts ask | get | emit`
 *
 * `uikit.json` beside this is what to SAY: one `create_ui_asset` call carrying
 * every fixture as a labelled PIECE, because consistency stops at the call
 * boundary and a kit split across calls is a kit in two styles. `ask` fires it
 * and records the asset id, `get` downloads the finished sheet to
 * `cache/ui/kit.png`, `emit` cuts each piece out and writes
 * `src/render/generated-ui.ts` — data URIs, the `generated-tiles.ts` pattern.
 *
 * A piece is authored at the CSS pixel size it displays at, so a 9-slice's
 * corners draw 1:1 and only the runs stretch.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { callTool, download, fields, urlsIn } from './mcp.mts';
import { decodePng, encodePng } from './png.mts';

const here = (file: string): string => new URL(`./${file}`, import.meta.url).pathname;
const CACHE = here('cache/ui');
const SHEET = `${CACHE}/kit.png`;

interface Piece { id: string; kind: string; label: string; x: number; y: number; w: number; h: number; radius?: number }
interface Extra {
  id: string; width: number; height: number; asset: string | null; say: string;
  style?: string;
  crop?: [number, number, number, number]; // cut at emit: a generation that arrived framed
}
interface Kit {
  _: string; style: string; palette: string;
  size: { width: number; height: number };
  asset: string | null;
  extras?: Extra[];
  pieces: Piece[];
}

const kit = JSON.parse(readFileSync(here('uikit.json'), 'utf8')) as Kit;
const save = () => writeFileSync(here('uikit.json'), JSON.stringify(kit, null, 1) + '\n');

/** No name asks for the KIT; a name asks for that row of `extras`, alone,
 *  with the finished kit sheet as the style reference so one style holds. */
async function ask(which?: string): Promise<void> {
  const extra = which ? kit.extras?.find((e) => e.id === which) : undefined;
  if (which && !extra) throw new Error(`no extra called ${which}`);
  const style = extra && existsSync(SHEET)
    ? { style_image_base64: readFileSync(SHEET).toString('base64') }
    : {};
  const out = await callTool('create_ui_asset', {
    description: extra ? `${extra.say} ${extra.style ?? kit.style}` : kit.style,
    color_palette: kit.palette,
    width: extra?.width ?? kit.size.width,
    height: extra?.height ?? kit.size.height,
    no_background: true,
    name: `crystal-core ${which ?? 'fixture kit'}`,
    ...style,
    ...(extra ? {} : {
      pieces: kit.pieces.map(({ id, kind, label, x, y, w, h, radius }) =>
        ({ id, kind, label, x, y, w, h, radius: radius ?? 0 })),
    }),
  });
  const id = fields(out).ui_asset_id ?? /([0-9a-f-]{36})/.exec(out)?.[1];
  if (!id) throw new Error(`no asset id in: ${out.slice(0, 300)}`);
  if (extra) extra.asset = id;
  else kit.asset = id;
  save();
  console.log(`asked: ${id}`);
}

async function get(which?: string): Promise<void> {
  const extra = which ? kit.extras?.find((e) => e.id === which) : undefined;
  const asset = extra ? extra.asset : kit.asset;
  if (!asset) throw new Error('nothing asked yet');
  mkdirSync(CACHE, { recursive: true });
  const file = extra ? `${CACHE}/${extra.id}.png` : SHEET;
  for (let go = 0; go < 40; go++) {
    const out = await callTool('get_ui_asset', { ui_asset_id: asset });
    const url = urlsIn(out).find((u) => /\.png/.test(u)) ?? fields(out).download;
    if (url?.startsWith('http')) {
      writeFileSync(file, await download(url));
      console.log(`${extra ? extra.id : 'kit'}.png (${out.match(/\d+x\d+/)?.[0] ?? 'size unknown'})`);
      return;
    }
    if (/failed|error/i.test(out)) throw new Error(out.slice(0, 300));
    await new Promise((r) => setTimeout(r, 8000));
  }
  throw new Error('never arrived');
}

/** A piece asked for OUTSIDE the kit call — a shape too small for the sheet to
 *  give detail, generated alone and standing in for the kit's own. */
const SOLO: Record<string, string> = { socket: 'socket96.png' };

/** Every `extras` row with a downloaded PNG is emitted, cut to `crop` if set. */
const extraRows = (): string[] =>
  (kit.extras ?? []).flatMap((e) => {
    if (!existsSync(`${CACHE}/${e.id}.png`)) return [];
    const own = decodePng(readFileSync(`${CACHE}/${e.id}.png`));
    const [cx, cy, cw, ch] = e.crop ?? [0, 0, own.width, own.height];
    const cut = new Uint8Array(cw * ch * 4);
    for (let r = 0; r < ch; r++)
      cut.set(own.rgba.subarray(((cy + r) * own.width + cx) * 4, ((cy + r) * own.width + cx + cw) * 4), r * cw * 4);
    const png = `data:image/png;base64,${encodePng(cw, ch, cut).toString('base64')}`;
    console.log(`${e.id}: ${cw}x${ch} (extra)`);
    return [`  ${e.id}: { w: ${cw}, h: ${ch}, png: '${png}' },`];
  });

function emit(): void {
  if (!existsSync(SHEET)) throw new Error('no kit.png — run get first');
  const { width, height, rgba } = decodePng(readFileSync(SHEET));
  const sx = width / kit.size.width, sy = height / kit.size.height;
  const rows: string[] = [];
  for (const p of kit.pieces) {
    const solo = SOLO[p.id];
    if (solo && existsSync(`${CACHE}/${solo}`)) {
      const own = decodePng(readFileSync(`${CACHE}/${solo}`));
      const png = `data:image/png;base64,${encodePng(own.width, own.height, own.rgba).toString('base64')}`;
      rows.push(`  ${p.id}: { w: ${own.width}, h: ${own.height}, png: '${png}' },`);
      console.log(`${p.id}: ${own.width}x${own.height} (solo)`);
      continue;
    }
    const x = Math.round(p.x * sx), y = Math.round(p.y * sy);
    const w = Math.round(p.w * sx), h = Math.round(p.h * sy);
    const cut = new Uint8Array(w * h * 4);
    for (let r = 0; r < h; r++)
      cut.set(rgba.subarray(((y + r) * width + x) * 4, ((y + r) * width + x + w) * 4), r * w * 4);
    const png = `data:image/png;base64,${encodePng(w, h, cut).toString('base64')}`;
    rows.push(`  ${p.id}: { w: ${w}, h: ${h}, png: '${png}' },`);
    console.log(`${p.id}: ${w}x${h}`);
  }
  writeFileSync(
    here('../../src/render/generated-ui.ts'),
    `/**\n * Written by \`tools/art/uikit.mts emit\`. Do not edit by hand.\n *\n * One entry per FIXTURE: a generated pixel-art frame or plate at the CSS\n * pixel size it displays at. \`src/ui/fixtures.ts\` mounts each as a\n * \`--fix-<id>\` custom property at boot, and the stylesheet applies them as\n * border-image 9-slices and backgrounds.\n */\nexport interface UiFixture { w: number; h: number; png: string }\n\nexport const UI_FIXTURES: Record<string, UiFixture> = {\n${[...rows, ...extraRows()].join('\n')}\n};\n`
  );
  console.log('-> src/render/generated-ui.ts');
}

const verb = process.argv[2];
if (verb === 'ask') await ask(process.argv[3]);
else if (verb === 'get') await get(process.argv[3]);
else if (verb === 'emit') emit();
else console.log('uikit.mts ask [extra] | get [extra] | emit');
