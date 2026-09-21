/**
 * A GLB THE PIPELINE CAN BE TESTED ON WITH NO KEY AND NO GENERATOR.
 *
 *   node tools/3d/testmodel.mjs [out.glb]
 *
 * Writes a two-box figure with an embedded base-colour texture, standing on
 * y=0 at a stated height in metres — the shape `origin_at: bottom` and
 * `resize_height` are asked to produce, so anything downstream that mishandles
 * either fails here rather than on a model that cost credits.
 *
 * ITS TEXTURE HAS LIGHTING PAINTED INTO IT ON PURPOSE: a vertical brightness
 * ramp over one flat hue, which is what a baked highlight IS. `turntable.mjs`
 * measures that ramp, so the de-light question has an answer on a model whose
 * true albedo is known — it is flat by construction.
 */
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const HEIGHT = 1.8; // metres, a person
const TEX = 64;

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** A flat hue under a vertical brightness ramp: `lit` is the ramp's spread. */
function png(lit) {
  const rows = [];
  for (let y = 0; y < TEX; y++) {
    const row = Buffer.alloc(1 + TEX * 3);
    // 1.0 at the top down to 1-lit at the bottom, which is a top-lit bake.
    const k = 1 - lit * (y / (TEX - 1));
    for (let x = 0; x < TEX; x++) {
      const grain = (x + y) % 8 < 4 ? 1 : 0.94; // detail the ramp must not eat
      const at = 1 + x * 3;
      row[at] = Math.round(150 * k * grain);
      row[at + 1] = Math.round(108 * k * grain);
      row[at + 2] = Math.round(72 * k * grain);
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(TEX, 0);
  ihdr.writeUInt32BE(TEX, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** A unit box centred on the origin: 24 vertices so every face keeps its own
 *  normal, which is what flat shading needs. */
function box() {
  const pos = [];
  const nrm = [];
  const uv = [];
  const idx = [];
  const faces = [
    [[1, 1, 1], [1, 1, -1], [1, -1, -1], [1, -1, 1], [1, 0, 0]],
    [[-1, 1, -1], [-1, 1, 1], [-1, -1, 1], [-1, -1, -1], [-1, 0, 0]],
    [[-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1], [0, 1, 0]],
    [[-1, -1, 1], [1, -1, 1], [1, -1, -1], [-1, -1, -1], [0, -1, 0]],
    [[-1, 1, 1], [1, 1, 1], [1, -1, 1], [-1, -1, 1], [0, 0, 1]],
    [[1, 1, -1], [-1, 1, -1], [-1, -1, -1], [1, -1, -1], [0, 0, -1]],
  ];
  for (const f of faces) {
    const base = pos.length / 3;
    const n = f[4];
    for (let i = 0; i < 4; i++) {
      pos.push(f[i][0] / 2, f[i][1] / 2, f[i][2] / 2);
      nrm.push(n[0], n[1], n[2]);
    }
    uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  return { pos, nrm, uv, idx };
}

const { pos, nrm, uv, idx } = box();
// A GLB chunk is 4-byte aligned; the JSON one pads with SPACES and the
// binary one with zeros, and a zero-padded JSON chunk is a parse error.
const pad = (b, fill = 0) => (b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - (b.length % 4), fill)]) : b);
const fPos = Buffer.from(new Float32Array(pos).buffer);
const fNrm = Buffer.from(new Float32Array(nrm).buffer);
const fUv = Buffer.from(new Float32Array(uv).buffer);
const fIdx = pad(Buffer.from(new Uint16Array(idx).buffer));
const fPng = png(0.55);

const parts = [fPos, fNrm, fUv, fIdx, fPng];
let at = 0;
const views = parts.map((p) => {
  const v = { buffer: 0, byteOffset: at, byteLength: p.length };
  at += p.length;
  return v;
});
const bin = pad(Buffer.concat(parts));

const lo = [-0.5, -0.5, -0.5];
const hi = [0.5, 0.5, 0.5];

// Torso and head, both the one box, scaled and stood on y=0.
const torsoH = HEIGHT * 0.72;
const headH = HEIGHT - torsoH;
const gltf = {
  asset: { version: '2.0', generator: 'crystal-core testmodel' },
  scene: 0,
  scenes: [{ nodes: [0, 1] }],
  nodes: [
    { name: 'torso', mesh: 0, translation: [0, torsoH / 2, 0], scale: [0.42, torsoH, 0.26] },
    { name: 'head', mesh: 0, translation: [0, torsoH + headH / 2, 0], scale: [headH * 0.8, headH, headH * 0.8] },
  ],
  meshes: [{
    name: 'part',
    primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }],
  }],
  materials: [{
    name: 'baked',
    pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0, roughnessFactor: 0.9 },
  }],
  textures: [{ source: 0 }],
  images: [{ bufferView: 4, mimeType: 'image/png' }],
  accessors: [
    { bufferView: 0, componentType: 5126, count: pos.length / 3, type: 'VEC3', min: lo, max: hi },
    { bufferView: 1, componentType: 5126, count: nrm.length / 3, type: 'VEC3' },
    { bufferView: 2, componentType: 5126, count: uv.length / 2, type: 'VEC2' },
    { bufferView: 3, componentType: 5123, count: idx.length, type: 'SCALAR' },
  ],
  bufferViews: [
    { ...views[0], target: 34962 },
    { ...views[1], target: 34962 },
    { ...views[2], target: 34962 },
    { ...views[3], target: 34963 },
    views[4],
  ],
  buffers: [{ byteLength: bin.length }],
};

const json = pad(Buffer.from(JSON.stringify(gltf), 'utf8'), 0x20);
const head = Buffer.alloc(12);
head.writeUInt32LE(0x46546c67, 0);
head.writeUInt32LE(2, 4);
head.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
const tag = (len, type) => {
  const b = Buffer.alloc(8);
  b.writeUInt32LE(len, 0);
  b.writeUInt32LE(type, 4);
  return b;
};
const out = process.argv[2] ?? 'tools/3d/models/testfigure.glb';
writeFileSync(out, Buffer.concat([
  head, tag(json.length, 0x4e4f534a), json, tag(bin.length, 0x004e4942), bin,
]));
console.log(`wrote ${out} — ${HEIGHT}m tall, origin at the feet, 12 triangles, a ${TEX}x${TEX} baked texture`);
