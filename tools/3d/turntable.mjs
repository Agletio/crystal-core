/**
 * WHAT A MODEL ACTUALLY IS, AND WHAT IT LOOKS LIKE FROM EVERY SIDE.
 *
 *   node tools/3d/turntable.mjs <model.glb> [out.png] [frames]
 *
 * Loads a GLB through the same three.js the game bundles and reports the
 * facts a generated model has to be judged on before a credit is spent on the
 * next one: how tall it is, where its origin sits, triangles, whether it is
 * rigged, what clips it carries, and what maps its material holds.
 *
 * THE SHEET IS TWO ROWS AND THAT IS THE POINT. The top is LIT, which is what
 * ships; the bottom is the raw base colour with no light on it at all. Baked
 * lighting is invisible in the top row — it reads as shading you meant — and
 * obvious in the bottom one, where a highlight nobody lit is a highlight
 * painted into the texture.
 *
 * `bakedLuma` puts a number on it. Baked lighting is LOW FREQUENCY: blur the
 * base colour hard and what survives is the bake, where material detail does
 * not. So `low` is the spread across an 8x8 reduction and `detail` is what the
 * full-resolution spread adds. A flat albedo reads low near 0.
 */
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, extname } from 'node:path';
import { chromium } from 'playwright';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const model = process.argv[2];
if (!model || !existsSync(model)) {
  console.error('turntable: give it a .glb — node tools/3d/turntable.mjs <model.glb> [out.png] [frames]');
  process.exit(1);
}
const out = process.argv[3] ?? 'shots/turntable.png';
const frames = Number(process.argv[4] ?? 8);
const CELL = 256;

const three = join(root, 'node_modules', 'three');
const page_html = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;background:#101014}</style>
<script type="importmap">{"imports":{
 "three":"/three/build/three.module.js",
 "three/addons/":"/three/examples/jsm/"}}</script></head>
<body><script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const CELL = ${CELL}, FRAMES = ${frames};
const sheet = document.createElement('canvas');
sheet.width = CELL * FRAMES; sheet.height = CELL * 2;
const paper = sheet.getContext('2d');

const canvas = document.createElement('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(CELL, CELL, false);
const scene = new THREE.Scene();
// The game's own void, never white: a pale ground flatters every silhouette
// and is the opposite of what this sheet is for.
scene.background = new THREE.Color(0x101014);
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);

const sun = new THREE.DirectionalLight(0xfff0dd, 2.2); sun.position.set(-3, 5, 4);
const rim = new THREE.DirectionalLight(0x88aaff, 1.4); rim.position.set(3, 2, -4);
// A fill under the key, so a frame facing away still shows its shape — the
// turn is what the sheet is for and a black backside says nothing.
const fill = new THREE.HemisphereLight(0x8899bb, 0x33302c, 1.1);
scene.add(sun, rim, fill, new THREE.AmbientLight(0x404858, 0.6));

/** Low-frequency luma spread is the bake; the rest is material detail. */
function bakedLuma(image) {
  const c = document.createElement('canvas');
  const w = Math.min(256, image.width || 256), h = Math.min(256, image.height || 256);
  c.width = w; c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(image, 0, 0, w, h);
  const px = g.getImageData(0, 0, w, h).data;
  const luma = [];
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 8) continue;
    luma.push((0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255);
  }
  if (!luma.length) return null;
  const spread = (list) => {
    const s = [...list].sort((a, b) => a - b);
    const at = (q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
    const mid = at(0.5);
    return mid > 0.001 ? (at(0.95) - at(0.05)) / mid : 0;
  };
  // 8x8 box reduction: the blur that only baked lighting survives.
  const N = 8, sum = new Float64Array(N * N), hit = new Float64Array(N * N);
  let i = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++, i++) {
    if (px[i * 4 + 3] < 8) continue;
    const cell = Math.floor((y / h) * N) * N + Math.floor((x / w) * N);
    sum[cell] += (0.2126 * px[i * 4] + 0.7152 * px[i * 4 + 1] + 0.0722 * px[i * 4 + 2]) / 255;
    hit[cell]++;
  }
  const low = [];
  for (let c2 = 0; c2 < N * N; c2++) if (hit[c2] > 0) low.push(sum[c2] / hit[c2]);
  const whole = spread(luma), lowSpread = spread(low);
  return { low: +lowSpread.toFixed(3), whole: +whole.toFixed(3), detail: +(whole - lowSpread).toFixed(3) };
}

new GLTFLoader().load('/model.glb', (gltf) => {
  const root3 = gltf.scene;
  scene.add(root3);

  let tris = 0, skinned = 0, meshes = 0;
  const maps = new Set(); let baseImage = null;
  root3.traverse((o) => {
    if (!o.isMesh && !o.isSkinnedMesh) return;
    meshes++; if (o.isSkinnedMesh) skinned++;
    const g = o.geometry;
    tris += (g.index ? g.index.count : g.attributes.position.count) / 3;
    for (const m of [].concat(o.material)) {
      for (const k of ['map','normalMap','roughnessMap','metalnessMap','aoMap','emissiveMap'])
        if (m && m[k]) maps.add(k);
      if (m && m.map && m.map.image && !baseImage) baseImage = m.map.image;
    }
  });

  const boxOf = new THREE.Box3().setFromObject(root3);
  const size = boxOf.getSize(new THREE.Vector3());
  const stats = {
    height: +size.y.toFixed(3), width: +size.x.toFixed(3), depth: +size.z.toFixed(3),
    footY: +boxOf.min.y.toFixed(3),
    triangles: Math.round(tris), meshes, skinned,
    clips: gltf.animations.map((a) => \`\${a.name}:\${a.duration.toFixed(2)}s\`),
    maps: [...maps],
    baked: baseImage ? bakedLuma(baseImage) : null,
  };

  // Frame the model whatever its scale: fit the whole box in view.
  const reach = Math.max(size.x, size.y, size.z);
  const back = (reach / 2) / Math.tan((35 * Math.PI / 360)) * 1.5;
  const mid = boxOf.getCenter(new THREE.Vector3());

  const flat = new Map();
  const shade = (on) => root3.traverse((o) => {
    if (!o.isMesh && !o.isSkinnedMesh) return;
    if (on) {
      if (!flat.has(o)) flat.set(o, o.material);
      const src = [].concat(flat.get(o));
      o.material = src.map((m) => new THREE.MeshBasicMaterial({ map: m.map ?? null, color: m.map ? 0xffffff : (m.color ?? 0xffffff) }));
      if (o.material.length === 1) o.material = o.material[0];
    } else if (flat.has(o)) o.material = flat.get(o);
  });

  for (let row = 0; row < 2; row++) {
    shade(row === 1);
    for (let f = 0; f < FRAMES; f++) {
      const a = (f / FRAMES) * Math.PI * 2;
      camera.position.set(mid.x + Math.sin(a) * back, mid.y + back * 0.45, mid.z + Math.cos(a) * back);
      camera.lookAt(mid);
      renderer.render(scene, camera);
      paper.drawImage(canvas, f * CELL, row * CELL);
    }
  }
  shade(false);

  globalThis.__tt = { stats, png: sheet.toDataURL('image/png') };
}, undefined, (e) => { globalThis.__tt = { error: String(e && e.message || e) }; });
</script></body></html>`;

const TYPES = { '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.html': 'text/html' };
const server = createServer(async (req, res) => {
  const url = (req.url ?? '/').split('?')[0];
  try {
    if (url === '/') { res.writeHead(200, { 'content-type': 'text/html' }).end(page_html); return; }
    const path = url === '/model.glb' ? resolve(model) : join(three, url.replace(/^\/three\//, ''));
    res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    res.end(await readFile(path));
  } catch { res.writeHead(404).end(); }
});
await new Promise((go) => server.listen(0, '127.0.0.1', go));

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 400 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => !!globalThis.__tt, null, { timeout: 60000 }).catch(() => {});

const got = await page.evaluate(() => globalThis.__tt ?? null);
if (!got || got.error) {
  console.error(`turntable: the model would not load — ${got?.error ?? 'no result'}`);
  if (errors.length) console.error(`  ${errors.slice(0, 2).join(' | ')}`);
  await browser.close(); server.close(); process.exit(1);
}

const s = got.stats;
console.log(`\n${model}`);
console.log(`  size        ${s.width} x ${s.height} x ${s.depth} m  (w x h x d)`);
console.log(`  feet at y   ${s.footY}${Math.abs(s.footY) < 0.005 ? '  — stands on the ground' : '  — NOT on the ground; origin is not at the foot'}`);
console.log(`  triangles   ${s.triangles} over ${s.meshes} mesh${s.meshes === 1 ? '' : 'es'}`);
console.log(`  rigged      ${s.skinned ? `yes, ${s.skinned} skinned` : 'no'}`);
console.log(`  clips       ${s.clips.length ? s.clips.join(', ') : 'none'}`);
console.log(`  maps        ${s.maps.length ? s.maps.join(', ') : 'none'}`);
if (s.baked) {
  console.log(`  base colour luma spread ${s.baked.whole} = ${s.baked.low} low frequency + ${s.baked.detail} detail`);
  console.log(`              ${s.baked.low > 0.25 ? 'LIGHTING IS PAINTED IN — de-light it' : 'flat enough to light'}`);
}
await writeFile(join(root, out), Buffer.from(got.png.split(',')[1], 'base64'));
console.log(`  wrote ${out} — lit on top, raw base colour underneath\n`);

await browser.close();
server.close();
