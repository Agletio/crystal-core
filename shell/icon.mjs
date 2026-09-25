/**
 * The app's icon, drawn off the game's own generated art — the level-four
 * Prismatic crystal — at five pixels a pixel on a 256 square, written as a PNG
 * to `build/icon.png` for the installer. Nothing is committed.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';
import { GENERATED_ICONS } from '../src/render/generated-icons.ts';

const SIZE = 256;
const art = GENERATED_ICONS.crys_prismatic_t4;
const scale = Math.floor(SIZE / art.grid);
const pad = Math.floor((SIZE - art.grid * scale) / 2);
const rows = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  for (let x = 0; x < SIZE; x++) {
    const hex = art.key[art.rows[Math.floor((y - pad) / scale)]?.[Math.floor((x - pad) / scale)] ?? '.'];
    if (!hex || x < pad || y < pad) continue;
    const at = y * (SIZE * 4 + 1) + 1 + x * 4;
    rows.writeUInt32BE((parseInt(hex.slice(1, 7), 16) << 8 | 0xff) >>> 0, at);
  }
}
const chunk = (type, data) => {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0, 0);
  return Buffer.concat([head, data, tail]);
};
const header = Buffer.alloc(13);
header.writeUInt32BE(SIZE, 0);
header.writeUInt32BE(SIZE, 4);
header.set([8, 6, 0, 0, 0], 8); // 8 bits, RGBA, no interlace
mkdirSync(new URL('build/', import.meta.url), { recursive: true });
writeFileSync(new URL('build/icon.png', import.meta.url), Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', header),
  chunk('IDAT', deflateSync(rows)),
  chunk('IEND', Buffer.alloc(0)),
]));
