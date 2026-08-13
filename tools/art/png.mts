/**
 * PNG decode, on Node's own zlib. The generator hands back a PNG and the grid
 * is what ships, so something has to read pixels — and a dependency for it
 * would be the first binary-adjacent one in the repo.
 *
 * 8 bits per channel and no interlacing. Anything else THROWS rather than
 * guessing: a generator that starts returning 16-bit should stop the tool, not
 * quietly lose the low byte of every pixel.
 */
import { deflateSync, inflateSync } from 'node:zlib';

export type Decoded = { width: number; height: number; rgba: Uint8Array };

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** Channels per pixel, by PNG colour type. Index 3 is palette: one byte in. */
const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

const CRC: number[] = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, body: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length);
  const tagged = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(tagged));
  return Buffer.concat([length, tagged, crc]);
}

/** 8-bit RGBA out. The generator takes a palette as an IMAGE, so one has to
 *  be written before anything can be asked for in our inks. */
export function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(rgba.buffer, rgba.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from(SIGNATURE),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export function decodePng(buf: Buffer): Decoded {
  for (let i = 0; i < SIGNATURE.length; i++) {
    if (buf[i] !== SIGNATURE[i]) throw new Error('not a PNG');
  }

  let width = 0;
  let height = 0;
  let depth = 0;
  let colour = 0;
  let palette: Buffer | null = null;
  let alpha: Buffer | null = null;
  const idat: Buffer[] = [];

  let at = 8;
  while (at < buf.length) {
    const length = buf.readUInt32BE(at);
    const type = buf.toString('ascii', at + 4, at + 8);
    const body = buf.subarray(at + 8, at + 8 + length);
    at += 12 + length;

    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      depth = body[8];
      colour = body[9];
      if (body[12] !== 0) throw new Error('interlaced PNGs are not read');
    } else if (type === 'PLTE') palette = Buffer.from(body);
    else if (type === 'tRNS') alpha = Buffer.from(body);
    else if (type === 'IDAT') idat.push(Buffer.from(body));
    else if (type === 'IEND') break;
  }

  if (depth !== 8) throw new Error(`${depth}-bit PNG: only 8 is read`);
  const channels = CHANNELS[colour];
  if (!channels) throw new Error(`colour type ${colour} is not read`);

  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = new Uint8Array(width * height * 4);
  const line = new Uint8Array(stride);
  const prev = new Uint8Array(stride);

  let read = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[read++];
    for (let x = 0; x < stride; x++) {
      const value = raw[read + x];
      const left = x >= channels ? line[x - channels] : 0;
      const up = prev[x];
      const corner = x >= channels ? prev[x - channels] : 0;
      let restored: number;
      if (filter === 0) restored = value;
      else if (filter === 1) restored = value + left;
      else if (filter === 2) restored = value + up;
      else if (filter === 3) restored = value + ((left + up) >> 1);
      else if (filter === 4) restored = value + paeth(left, up, corner);
      else throw new Error(`filter ${filter} on row ${y}`);
      line[x] = restored & 0xff;
    }
    read += stride;

    for (let x = 0; x < width; x++) {
      const at4 = (y * width + x) * 4;
      const src = x * channels;
      if (colour === 3) {
        const index = line[src];
        out[at4] = palette?.[index * 3] ?? 0;
        out[at4 + 1] = palette?.[index * 3 + 1] ?? 0;
        out[at4 + 2] = palette?.[index * 3 + 2] ?? 0;
        out[at4 + 3] = alpha?.[index] ?? 255;
      } else if (colour === 0 || colour === 4) {
        out[at4] = line[src];
        out[at4 + 1] = line[src];
        out[at4 + 2] = line[src];
        out[at4 + 3] = colour === 4 ? line[src + 1] : 255;
      } else {
        out[at4] = line[src];
        out[at4 + 1] = line[src + 1];
        out[at4 + 2] = line[src + 2];
        out[at4 + 3] = colour === 6 ? line[src + 3] : 255;
      }
    }
    prev.set(line);
  }

  return { width, height, rgba: out };
}
