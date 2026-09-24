/**
 * WHAT MESHY HANDED BACK, MADE INTO WHAT SHIPS: one GLB per model as a data
 * URI in `src/abyss/assets/`, loaded only when somebody walks into the Abyss.
 *
 *   npx tsx tools/abyss/pack.mts [id…]
 *
 * A RIGGED body comes back with its normal and roughness maps DROPPED and its
 * albedo wired in as a full-strength EMISSIVE, which draws it flat and self-lit
 * under any light. So the maps are taken back off the unrigged model — same
 * atlas, checked by `same` before trusting it — and the emissive becomes a mask
 * of what the albedo PAINTS as light (runes, magma, coals) and nothing else.
 *
 * Every map is resized and re-encoded JPEG by `img.py`, and the geometry is
 * meshopt-compressed; the page decodes it with three's MeshoptDecoder.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import type { Document, Texture } from '@gltf-transform/core';
import { ALL_EXTENSIONS, EXTMeshoptCompression } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, quantize, reorder } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

const CACHE = 'tools/abyss/cache';
const WORK = join(CACHE, 'pack');
const OUT = 'src/abyss/assets';

interface Spec {
  id: string;
  rigged?: boolean;
  glow?: 'cyan' | 'magma' | 'ember' | 'coal';
  albedo: number; // px, longest side
  detail: number; // px for the normal and roughness maps
  flames?: 'tips' | 'bowl' | 'head'; // where the renderer lights fire, found off the geometry
}

const SPECS: Spec[] = [
  { id: 'hero', rigged: true, glow: 'cyan', albedo: 2048, detail: 2048 },
  { id: 'imp', rigged: true, glow: 'magma', albedo: 1536, detail: 1024 },
  { id: 'chanter', rigged: true, glow: 'ember', albedo: 1536, detail: 1024 },
  { id: 'hornfiend', rigged: true, glow: 'magma', albedo: 2048, detail: 1024 },
  { id: 'column', albedo: 1536, detail: 1024 },
  { id: 'brazier', glow: 'coal', albedo: 1024, detail: 1024, flames: 'bowl' },
  { id: 'candelabra', albedo: 1024, detail: 512, flames: 'tips' },
  { id: 'candles', albedo: 1024, detail: 1024, flames: 'tips' },
  { id: 'skulls', albedo: 1024, detail: 1024 },
  { id: 'sarcophagus', albedo: 1024, detail: 1024 },
  { id: 'statue', albedo: 1024, detail: 1024 },
  { id: 'altar', glow: 'ember', albedo: 1024, detail: 1024 },
  { id: 'pew', albedo: 1024, detail: 1024 },
  { id: 'cage', albedo: 1024, detail: 512 },
  { id: 'sconce', albedo: 512, detail: 512, flames: 'head' },
  { id: 'rubble', albedo: 1024, detail: 1024 },
  { id: 'spikes', albedo: 1024, detail: 512 },
  { id: 'chest', albedo: 1024, detail: 1024 },
  { id: 'arch', albedo: 1024, detail: 1024 },
  { id: 'throne', albedo: 1536, detail: 1024 },
  { id: 'banner', albedo: 1024, detail: 512 },
];

const py = (...args: string[]): string => execFileSync('python3', ['tools/abyss/img.py', ...args], { encoding: 'utf8' }).trim();

function dump(tex: Texture, name: string): string {
  const ext = tex.getMimeType() === 'image/png' ? 'png' : 'jpg';
  const file = join(WORK, `${name}.${ext}`);
  writeFileSync(file, tex.getImage()!);
  return file;
}

function jpeg(doc: Document, file: string, name: string): Texture {
  return doc.createTexture(name).setImage(readFileSync(file)).setMimeType('image/jpeg');
}

/** Candle tips, a brazier's bowl, a torch's head — what the renderer sets alight. */
function flames(doc: Document, how: Spec['flames']): number[][] {
  const pos: number[][] = [];
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const a = prim.getAttribute('POSITION')!;
      const v = [0, 0, 0];
      for (let i = 0; i < a.getCount(); i++) pos.push([...a.getElement(i, v)]);
    }
  }
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  for (const p of pos) {
    min = min.map((m, k) => Math.min(m, p[k]));
    max = max.map((m, k) => Math.max(m, p[k]));
  }
  const h = max[1] - min[1];
  if (how === 'bowl') return [[(min[0] + max[0]) / 2, max[1] - h * 0.18, (min[2] + max[2]) / 2, (max[0] - min[0]) * 0.36]];
  // A GRID OF COLUMNS over the floor plan, each keeping its highest point; a
  // tip is a column higher than every other within reach of it.
  const cell = Math.max(max[0] - min[0], max[2] - min[2]) / 90;
  const top = new Map<string, number[]>();
  for (const p of pos) {
    const k = `${Math.floor((p[0] - min[0]) / cell)},${Math.floor((p[2] - min[2]) / cell)}`;
    const had = top.get(k);
    if (!had || p[1] > had[1]) top.set(k, p);
  }
  const reach = how === 'head' ? 30 : 4;
  const floor = min[1] + h * (how === 'head' ? 0.6 : 0.22);
  const tips: number[][] = [];
  for (const [k, p] of top) {
    if (p[1] < floor) continue;
    const [i, j] = k.split(',').map(Number);
    let best = true;
    for (let di = -reach; di <= reach && best; di++) {
      for (let dj = -reach; dj <= reach && best; dj++) {
        const q = top.get(`${i + di},${j + dj}`);
        if (q && (q[1] > p[1] || (q[1] === p[1] && (di < 0 || (di === 0 && dj < 0))))) best = false;
      }
    }
    if (best) tips.push([p[0], p[1], p[2], 0]);
  }
  return tips.sort((a, b) => b[1] - a[1]).slice(0, how === 'head' ? 1 : 24);
}

async function pack(io: NodeIO, spec: Spec): Promise<{ glb: Uint8Array; meta: Record<string, unknown> }> {
  const src = join(CACHE, spec.rigged ? `${spec.id}-anim.glb` : `${spec.id}.glb`);
  const doc = await io.read(src);
  const root = doc.getRoot();
  const mat = root.listMaterials()[0];
  const tag = spec.id;
  let base = mat.getBaseColorTexture()!;
  let normal = mat.getNormalTexture();
  let mr = mat.getMetallicRoughnessTexture();

  if (spec.rigged) {
    const pbr = await io.read(join(CACHE, `${spec.id}.glb`));
    const pm = pbr.getRoot().listMaterials()[0];
    const a = dump(base, `${tag}-rigbase`);
    const b = dump(pm.getBaseColorTexture()!, `${tag}-pbrbase`);
    const diff = Number(py('same', a, b));
    if (diff > 0.03) throw new Error(`${tag}: the rig's atlas differs from the model's (${diff}) — its maps cannot be borrowed`);
    normal = pm.getNormalTexture();
    mr = pm.getMetallicRoughnessTexture();
    console.log(`  ${tag}: atlas matches the unrigged model (${diff}), borrowing its normal and roughness`);
  }

  const baseFile = dump(base, `${tag}-base`);
  const out = (n: string) => join(WORK, `${tag}-${n}.jpg`);
  py('resize', baseFile, out('albedo'), String(spec.albedo), '88');
  const textures: Record<string, Texture> = { albedo: jpeg(doc, out('albedo'), `${tag}-albedo`) };
  if (normal) {
    py('resize', dump(normal as Texture, `${tag}-normal-src`), out('normal'), String(spec.detail), '86');
    textures.normal = jpeg(doc, out('normal'), `${tag}-normal`);
  }
  if (mr) {
    py('resize', dump(mr as Texture, `${tag}-mr-src`), out('mr'), String(Math.min(spec.detail, spec.rigged ? 1024 : 512)), '86');
    textures.mr = jpeg(doc, out('mr'), `${tag}-mr`);
  }
  if (spec.glow) {
    console.log(`  ${tag}: ${py('glow', baseFile, out('glow'), String(Math.min(spec.albedo, 1024)), spec.glow)}`);
    textures.glow = jpeg(doc, out('glow'), `${tag}-glow`);
  }

  for (const m of root.listMaterials()) {
    m.setBaseColorTexture(textures.albedo);
    m.setNormalTexture(textures.normal ?? null);
    m.setMetallicRoughnessTexture(textures.mr ?? null);
    m.setRoughnessFactor(1).setMetallicFactor(textures.mr ? 1 : 0);
    m.setEmissiveTexture(textures.glow ?? null).setEmissiveFactor(textures.glow ? [1, 1, 1] : [0, 0, 0]);
    m.setDoubleSided(true);
    for (const ext of m.listExtensions()) ext.dispose();
  }
  for (const t of root.listTextures()) if (!Object.values(textures).includes(t)) t.dispose();
  for (const ext of root.listExtensionsUsed()) if (ext.extensionName === 'KHR_materials_specular') ext.dispose();

  if (spec.rigged) {
    const names = JSON.parse(readFileSync(join(CACHE, `${spec.id}-anim.json`), 'utf8')) as string[];
    root.listAnimations().forEach((clip, i) => clip.setName(names[i] ?? clip.getName()));
  }
  const meta: Record<string, unknown> = {};
  if (spec.flames) meta.flames = flames(doc, spec.flames);

  await doc.transform(dedup(), prune(), reorder({ encoder: MeshoptEncoder }), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  return { glb: await io.writeBinary(doc), meta };
}

mkdirSync(WORK, { recursive: true });
mkdirSync(OUT, { recursive: true });
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const wanted = process.argv.slice(2);
const SHARDS: Record<string, string[]> = {
  actors: ['hero', 'imp', 'chanter', 'hornfiend'],
  props: ['column', 'brazier', 'candelabra', 'candles', 'skulls', 'sarcophagus', 'statue', 'altar', 'pew'],
  furniture: ['cage', 'sconce', 'rubble', 'spikes', 'chest', 'arch', 'throne', 'banner'],
};
const packed = join(WORK, 'packed.json');
const done: Record<string, { bytes: number; meta: Record<string, unknown> }> = existsSync(packed) ? JSON.parse(readFileSync(packed, 'utf8')) : {};
for (const spec of SPECS) {
  if (wanted.length && !wanted.includes(spec.id)) continue;
  const { glb, meta } = await pack(io, spec);
  writeFileSync(join(WORK, `${spec.id}.glb`), glb);
  done[spec.id] = { bytes: glb.byteLength, meta };
  console.log(`${spec.id.padEnd(12)} ${(glb.byteLength / 1048576).toFixed(2)} MB${meta.flames ? `  ${(meta.flames as unknown[]).length} flames` : ''}`);
}
writeFileSync(packed, JSON.stringify(done, null, 1));
void EXTMeshoptCompression;

// ONE MODULE A SHARD, each under Cloudflare's 25 MiB a file once base64'd.
for (const [shard, ids] of Object.entries(SHARDS)) {
  const lines = [
    `// GENERATED by tools/abyss/pack.mts — never edited by hand. Meshy models, repacked.`,
    `import type { ModelShard } from '../../gl/assets';`,
    `export const SHARD: ModelShard = {`,
  ];
  let total = 0;
  for (const id of ids) {
    const file = join(WORK, `${id}.glb`);
    if (!existsSync(file)) continue;
    const bytes = readFileSync(file);
    total += bytes.byteLength;
    lines.push(`  ${id}: { glb: 'data:model/gltf-binary;base64,${bytes.toString('base64')}', meta: ${JSON.stringify(done[id]?.meta ?? {})} },`);
  }
  lines.push('};', '');
  writeFileSync(join(OUT, `${shard}.ts`), lines.join('\n'));
  console.log(`${shard}: ${(total / 1048576).toFixed(1)} MB of GLB, ${((total * 4) / 3 / 1048576).toFixed(1)} MB as text`);
}
