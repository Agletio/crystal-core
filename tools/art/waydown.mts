/**
 * THE WAY IN AND THE WAY OUT, tried several ways at once.
 * `waydown.mts <dir> [style…]` — asks each style, fetches it, and lays the lot
 * on the FISSURE'S OWN FLOOR at 3x, which is the only honest way to judge one:
 * a hole is read by its contrast against the ground it is cut into.
 *
 * THE PALETTE IS FORCED WITH AN IMAGE, never with words. Round one asked for
 * pale grey stone in prose and two of four came back lavender.
 *
 * AND EVERY STYLE NAMES A THING. This generator draws the OPENING and drops
 * whatever the words put inside it — the shipped ask said "no stairs" and got
 * a spoked wheel; round one's slabs and ramp came back as a plain dark square.
 * Only the rope ladder landed, because a ladder is an object it knows.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { ZONES } from '../../src/render/generated-tiles';
import { callTool, download, urlsIn } from './mcp.mts';
import { decodePng, encodePng } from './png.mts';

const set = ZONES.test_round; // what the FISSURE runs, not the set it moved off
const sheet = decodePng(Buffer.from(set.png.split(',')[1], 'base64'));
const box = set.tiles.find((t) => t.key === 0)!.box;

/** The zone's pure floor tile, lifted out of its sheet. */
function floorTile(): { width: number; height: number; rgba: Uint8Array } {
  const out = new Uint8Array(box[2] * box[3] * 4);
  for (let y = 0; y < box[3]; y++) {
    for (let x = 0; x < box[2]; x++) {
      const s = ((box[1] + y) * sheet.width + box[0] + x) * 4;
      const d = (y * box[2] + x) * 4;
      for (let c = 0; c < 4; c++) out[d + c] = sheet.rgba[s + c];
    }
  }
  return { width: box[2], height: box[3], rgba: out };
}

/** The inks, as an image: the one thing that holds a colour. */
function palette(): string {
  const inks = ['#8E8279', '#6E6258', '#5A5249', '#3A342C', '#14120F', '#0A0908'];
  const S = 8;
  const w = inks.length * S;
  const px = new Uint8Array(w * S * 4);
  inks.forEach((hex, i) => {
    const [r, g, b] = [1, 3, 5].map((o) => parseInt(hex.slice(o, o + 2), 16));
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const d = (y * w + i * S + x) * 4;
        px[d] = r; px[d + 1] = g; px[d + 2] = b; px[d + 3] = 255;
      }
    }
  });
  return `data:image/png;base64,${encodePng(w, S, px).toString('base64')}`;
}

const ABOVE = 'seen from DIRECTLY ABOVE looking straight down, worn, chipped, dusty, ancient';
const DARK = 'The opening it stands in is a ragged square of NEAR-BLACK.';
const NOT = 'NOT a spiral, NOT a wheel, NOT spokes, NOT a turbine, NOT a gear, NOT a well, NOT round, NOT a funnel, NOT bright, NOT colourful, NOT purple, NOT lavender, NOT blue, NOT green.';

export const STYLES: Record<string, string> = {
  timber: `A STEEP WOODEN STAIRCASE of dark rough-sawn planks going down into a hole in a pale stone cave floor, ${ABOVE}: the top four planks are lit and each one below is darker until they are lost. ${DARK} ${NOT}`,
  rope: `A ROPE LADDER hanging down into a hole in a pale stone cave floor, ${ABOVE}: two pale frayed ropes with short dark wooden planks between them, the top three planks lit and the rest swallowed, and a loose coil of the same rope on the stone beside the lip. ${DARK} ${NOT} NOT a net.`,
  slab: `A STACK OF BROKEN STONE SLABS piled into a hole in a pale stone cave floor to make a rough way down, ${ABOVE}: four or five thick uneven grey blocks, each set lower and darker than the one above. ${DARK} ${NOT}`,
  iron: `AN IRON LADDER bolted to the side of a hole in a pale stone cave floor, ${ABOVE}: two dark rusted rails and five flat rungs, the top rungs lit and the lower ones lost in the dark, bolt plates on the stone at the lip. ${DARK} ${NOT}`,
};

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const dir = process.argv[2];
const want = process.argv.slice(3).length > 0 ? process.argv.slice(3) : Object.keys(STYLES);
mkdirSync(dir, { recursive: true });

for (const name of want) {
  const say = STYLES[name];
  if (!say) { console.log(`${name}: no such style`); continue; }
  const out = await callTool('create_image_pixflux', {
    description: say, width: 128, height: 128, no_background: true,
    view: 'high top-down', direction: 'south',
    outline: 'single color black outline', shading: 'detailed shading',
    detail: 'highly detailed', text_guidance_scale: 12, color_image_url: palette(),
  });
  const job = /([0-9a-f-]{36})/.exec(out)?.[1];
  console.log(`${name}: ${job ?? out.slice(0, 140)}`);
  if (!job) continue;
  // THE DOWNLOAD URL CARRIES NO EXTENSION — it is `…/images/<id>/download` —
  // so a filter for `.png` never matches it and every take is recorded as
  // "never arrived" while the generation is already paid for.
  let png: Buffer | null = null;
  for (let go = 0; go < 30 && !png; go++) {
    if (go > 0) await wait(10_000);
    const text = await callTool('get_image', { job_id: job });
    const url = urlsIn(text).find((u) => /\/download$/.test(u)) ?? urlsIn(text)[0];
    if (url) png = await download(url).catch(() => null);
  }
  if (png) { writeFileSync(`${dir}/${name}.png`, png); console.log(`  wrote ${name}.png`); }
  else console.log(`  ${name}: never arrived`);
}

// --- the sheet: every take on the floor it will be cut into ----------------
const have = want.filter((n) => { try { readFileSync(`${dir}/${n}.png`); return true; } catch { return false; } });
if (have.length > 0) {
  const floor = floorTile();
  const BIG = 3;
  const span = 2 * set.grid * BIG;
  const pad = 16;
  const cell = span + pad * 2;
  const W = cell * have.length;
  const H = cell;
  const out = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const f = ((y % floor.height) * floor.width + (x % floor.width)) * 4;
      const at = (y * W + x) * 4;
      for (let c = 0; c < 4; c++) out[at + c] = floor.rgba[f + c];
    }
  }
  have.forEach((name, i) => {
    const art = decodePng(readFileSync(`${dir}/${name}.png`));
    const x0 = i * cell + pad;
    for (let y = 0; y < span; y++) {
      for (let x = 0; x < span; x++) {
        const s = (Math.floor(y / span * art.height) * art.width + Math.floor(x / span * art.width)) * 4;
        const a = art.rgba[s + 3] / 255;
        if (a === 0) continue;
        const at = ((pad + y) * W + x0 + x) * 4;
        for (let c = 0; c < 3; c++) out[at + c] = Math.round(art.rgba[s + c] * a + out[at + c] * (1 - a));
      }
    }
  });
  writeFileSync(`${dir}/sheet.png`, encodePng(W, H, out));
  console.log(`${dir}/sheet.png — ${have.join(', ')}, left to right`);
}
