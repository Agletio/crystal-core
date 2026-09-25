/**
 * THE GAME'S 3D ART, MADE INTO WHAT SHIPS: the bodies, the clip bank and the
 * ground, each a module of data URIs in `src/gl/assets/`, built to `3d/gl/`
 * by `npm run build:gl` and fetched only by a page that draws in 3D.
 *
 *   npx tsx tools/3d/pack.mts [bodies|clips|ground|props] [id…]
 *
 * A RIGGED body comes back with its albedo wired in as a full-strength emissive
 * and its normal and roughness maps dropped, so the maps are borrowed off the
 * unrigged model — the same atlas, checked before it is trusted.
 *
 * THE CLIPS ARE ONE BANK FOR EVERY BIPED. Each is kept as the source rig
 * played it, rotations and the hips' travel, with that rig's REST pose in the
 * meta; the page retargets through both rests (`src/gl/retarget.ts`), so a clip
 * bought on one body plays on any of them. The husk's rig names three spine
 * bones differently and is renamed here, body and bank alike.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import type { Document, Node, Texture } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, getBounds, meshopt, prune, quantize, reorder, resample } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

const CACHE = 'tools/3d/cache';
const ABYSS = 'tools/abyss/cache';
const WORK = join(CACHE, 'pack');
const OUT = 'src/gl/assets';

type Shard = 'heroes' | 'shallows' | 'folk';
interface BodySpec {
  id: string;
  shard: Shard;
  rigged: boolean;
  albedo: number; // px, longest side
  detail: number; // px for the normal map; roughness is half
  glow?: 'cyan' | 'magma' | 'ember' | 'coal';
}

const BODIES: BodySpec[] = [
  { id: 'aethermancer', shard: 'heroes', rigged: true, albedo: 1536, detail: 1024 },
  { id: 'alchemist', shard: 'heroes', rigged: true, albedo: 1536, detail: 1024 },
  { id: 'obreth', shard: 'heroes', rigged: true, albedo: 1536, detail: 1024 },
  { id: 'mahthar', shard: 'heroes', rigged: true, albedo: 1536, detail: 1024 },
  { id: 'husk', shard: 'shallows', rigged: true, albedo: 1024, detail: 1024 },
  { id: 'crawler', shard: 'shallows', rigged: false, albedo: 1024, detail: 1024 },
  { id: 'hound', shard: 'shallows', rigged: false, albedo: 1024, detail: 1024 },
  { id: 'heap', shard: 'shallows', rigged: true, albedo: 1024, detail: 1024 },
  { id: 'bonecaller', shard: 'shallows', rigged: true, albedo: 1024, detail: 1024 },
  { id: 'answering', shard: 'shallows', rigged: true, albedo: 1536, detail: 1024 },
  { id: 'lampwright', shard: 'folk', rigged: false, albedo: 1024, detail: 1024 },
  { id: 'smith', shard: 'folk', rigged: true, albedo: 1024, detail: 1024 },
  { id: 'hob', shard: 'folk', rigged: true, albedo: 1024, detail: 1024 },
  { id: 'nell', shard: 'folk', rigged: true, albedo: 1024, detail: 1024 },
];

/** The husk's rig is Meshy's OTHER skeleton: one spine bone fewer and three of
 *  them named one place along. Renamed, it is the 24-bone chain less two leaves. */
const HUSK_BONES: Record<string, string> = { neck: 'Spine02', Spine02: 'Spine01', Head1: 'neck' };

interface Source {
  id: string;
  file: string;
  names: string[]; // clip names in the order the file holds them
  rename?: Record<string, string>;
}

function sources(): Source[] {
  const names = (f: string): string[] => JSON.parse(readFileSync(f, 'utf8')) as string[];
  const out: Source[] = [];
  if (existsSync(join(CACHE, 'bank-anim.glb'))) {
    out.push({ id: 'bank', file: join(CACHE, 'bank-anim.glb'), names: names(join(CACHE, 'bank-anim.json')), rename: HUSK_BONES });
  }
  for (const id of ['hero', 'imp', 'chanter', 'hornfiend']) {
    out.push({ id, file: join(ABYSS, `${id}-anim.glb`), names: names(join(ABYSS, `${id}-anim.json`)) });
  }
  // WHAT EACH RIG CAME WITH: its own walk and run, the one gait drawn to its own legs.
  for (const b of BODIES.filter((x) => x.rigged)) {
    for (const [clip, file] of [['walk', `${b.id}-walking.glb`], ['run', `${b.id}-running.glb`]]) {
      if (existsSync(join(CACHE, file))) {
        out.push({ id: b.id, file: join(CACHE, file), names: [clip], rename: b.id === 'husk' ? HUSK_BONES : undefined });
      }
    }
  }
  return out;
}

const py = (...args: string[]): string => execFileSync('python3', ['tools/abyss/img.py', ...args], { encoding: 'utf8' }).trim();

function dump(tex: Texture, name: string): string {
  const ext = tex.getMimeType() === 'image/png' ? 'png' : 'jpg';
  const file = join(WORK, `${name}.${ext}`);
  writeFileSync(file, tex.getImage()!);
  return file;
}

const jpeg = (doc: Document, file: string, name: string): Texture =>
  doc.createTexture(name).setImage(readFileSync(file)).setMimeType('image/jpeg');

function rename(doc: Document, names: Record<string, string> | undefined): void {
  if (!names) return;
  for (const n of doc.getRoot().listNodes()) {
    const to = names[n.getName()];
    if (to) n.setName(to);
  }
}

async function body(io: NodeIO, spec: BodySpec): Promise<Uint8Array> {
  const doc = await io.read(join(CACHE, spec.rigged ? `${spec.id}-rig.glb` : `${spec.id}.glb`));
  const root = doc.getRoot();
  const tag = spec.id;
  const mat = root.listMaterials()[0];
  const base = mat.getBaseColorTexture()!;
  let normal = mat.getNormalTexture();
  let mr = mat.getMetallicRoughnessTexture();
  if (spec.rigged) {
    const pbr = (await io.read(join(CACHE, `${spec.id}.glb`))).getRoot().listMaterials()[0];
    const diff = Number(py('same', dump(base, `${tag}-rigbase`), dump(pbr.getBaseColorTexture()!, `${tag}-pbrbase`)));
    if (diff > 0.03) throw new Error(`${tag}: the rig's atlas differs from the model's (${diff}) — its maps cannot be borrowed`);
    normal = pbr.getNormalTexture();
    mr = pbr.getMetallicRoughnessTexture();
    for (const a of root.listAnimations()) a.dispose(); // the rig's own bind-pose clip
    rename(doc, spec.id === 'husk' ? HUSK_BONES : undefined);
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
    py('resize', dump(mr as Texture, `${tag}-mr-src`), out('mr'), String(spec.detail / 2), '86');
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
    m.setDoubleSided(false);
    for (const ext of m.listExtensions()) ext.dispose();
  }
  for (const t of root.listTextures()) if (!Object.values(textures).includes(t)) t.dispose();
  for (const ext of root.listExtensionsUsed()) if (ext.extensionName === 'KHR_materials_specular') ext.dispose();
  await doc.transform(dedup(), prune(), reorder({ encoder: MeshoptEncoder }), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  return io.writeBinary(doc);
}

/** THE BANK: one skeleton-free GLB, a node per bone name and every clip on those
 *  nodes, named `<source>/<clip>`. Nothing but rotations and the hips' travel. */
async function clips(io: NodeIO): Promise<{ glb: Uint8Array; meta: Record<string, unknown> }> {
  const doc = await io.read(join(CACHE, 'aethermancer-rig.glb')); // any 24-bone rig: only its NAMES are kept
  const root = doc.getRoot();
  for (const a of root.listAnimations()) a.dispose();
  for (const s of root.listSkins()) s.dispose();
  for (const m of root.listMeshes()) m.dispose();
  const nodes = new Map<string, Node>();
  for (const n of root.listNodes()) nodes.set(n.getName(), n);
  const buffer = root.listBuffers()[0] ?? doc.createBuffer();

  const rests: Record<string, Record<string, number[]>> = {};
  const hips: Record<string, number[]> = {};
  const of: Record<string, string> = {};
  for (const src of sources()) {
    const from = await io.read(src.file);
    rename(from, src.rename);
    const rest: Record<string, number[]> = rests[src.id] ?? {};
    for (const n of from.getRoot().listNodes()) {
      if (n.getMesh() || n.getName() === 'Armature') continue;
      rest[n.getName()] = n.getRotation().map((v) => +v.toFixed(6));
      if (n.getName() === 'Hips') hips[src.id] = n.getTranslation().map((v) => +v.toFixed(4));
    }
    rests[src.id] = rest;
    from.getRoot().listAnimations().forEach((anim, i) => {
      const name = `${src.id}/${src.names[i] ?? anim.getName()}`;
      const clip = doc.createAnimation(name);
      for (const ch of anim.listChannels()) {
        const bone = ch.getTargetNode()?.getName() ?? '';
        const path = ch.getTargetPath();
        const target = nodes.get(bone);
        if (!target || !(path === 'rotation' || (path === 'translation' && bone === 'Hips'))) continue;
        const s = ch.getSampler()!;
        const input = doc.createAccessor().setType('SCALAR').setArray(new Float32Array(s.getInput()!.getArray()!)).setBuffer(buffer);
        const output = doc.createAccessor().setType(s.getOutput()!.getType()).setArray(new Float32Array(s.getOutput()!.getArray()!)).setBuffer(buffer);
        const sampler = doc.createAnimationSampler().setInput(input).setOutput(output).setInterpolation(s.getInterpolation());
        clip.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(target).setTargetPath(path).setSampler(sampler));
      }
      of[name] = src.id;
      console.log(`  ${name.padEnd(22)} ${clip.listChannels().length} channels`);
    });
  }
  await doc.transform(resample({ tolerance: 1e-4 }), dedup(), prune({ keepLeaves: true }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  return { glb: await io.writeBinary(doc), meta: { rests, hips, of } };
}

/** A CAMP PROP stands on its base at the origin, its longest side `size`
 *  metres; a piece of GEAR has its GRIP at the origin and stands `size` tall,
 *  so a hand holds either with no offset of its own. */
interface PropSpec {
  id: string;
  kind: 'prop' | 'gear';
  size: number;
  grip?: number;
}

async function prop(io: NodeIO, spec: PropSpec): Promise<Uint8Array> {
  const doc = await io.read(join(CACHE, `prop-${spec.id}.glb`));
  const root = doc.getRoot();
  const tag = `prop-${spec.id}`;
  const scene = root.listScenes()[0];
  const box = getBounds(scene);
  const [w, h, d] = [0, 1, 2].map((k) => box.max[k] - box.min[k]);
  const k = spec.kind === 'gear' ? spec.size / h : spec.size / Math.max(w, h, d);
  const mid = [(box.min[0] + box.max[0]) / 2, (box.min[2] + box.max[2]) / 2];
  const lift = spec.kind === 'gear' ? box.min[1] + h * (spec.grip ?? 0.1) : box.min[1];
  const holder = doc.createNode('holder').setScale([k, k, k]).setTranslation([-mid[0] * k, -lift * k, -mid[1] * k]);
  for (const child of scene.listChildren()) holder.addChild(child);
  scene.addChild(holder);

  const px = spec.kind === 'gear' ? 512 : 1024;
  const out = (n: string) => join(WORK, `${tag}-${n}.jpg`);
  for (const m of root.listMaterials()) {
    const base = m.getBaseColorTexture();
    const normal = m.getNormalTexture();
    const mr = m.getMetallicRoughnessTexture();
    if (base) (py('resize', dump(base, `${tag}-base`), out('albedo'), String(px), '88'), m.setBaseColorTexture(jpeg(doc, out('albedo'), `${tag}-albedo`)));
    if (normal) (py('resize', dump(normal, `${tag}-normal-src`), out('normal'), String(px), '86'), m.setNormalTexture(jpeg(doc, out('normal'), `${tag}-normal`)));
    if (mr) (py('resize', dump(mr, `${tag}-mr-src`), out('mr'), String(px / 2), '86'), m.setMetallicRoughnessTexture(jpeg(doc, out('mr'), `${tag}-mr`)));
    m.setEmissiveTexture(null).setEmissiveFactor([0, 0, 0]);
    for (const ext of m.listExtensions()) ext.dispose();
  }
  for (const ext of root.listExtensionsUsed()) if (ext.extensionName === 'KHR_materials_specular') ext.dispose();
  await doc.transform(dedup(), prune(), reorder({ encoder: MeshoptEncoder }), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  return io.writeBinary(doc);
}

/** The ground's surfaces, as `tools/abyss/tex.mts` makes the Abyss's. */
const SURFACES: { id: string; px: number; bump: number; rough: [number, number] }[] = [
  { id: 'sand', px: 1024, bump: 6, rough: [0.86, 0.3] },
  { id: 'cave_rock', px: 1024, bump: 11, rough: [0.8, 0.45] },
  { id: 'camp_dirt', px: 1024, bump: 7, rough: [0.88, 0.3] },
  { id: 'camp_grass', px: 1024, bump: 5, rough: [0.9, 0.25] },
  { id: 'wood', px: 1024, bump: 6, rough: [0.78, 0.4] },
];

function ground(): string[] {
  const uri = (file: string): string => `data:image/jpeg;base64,${readFileSync(file).toString('base64')}`;
  const lines: string[] = [];
  for (const s of SURFACES) {
    const src = join(CACHE, `surface-${s.id}.png`);
    if (!existsSync(src)) continue;
    const out = (k: string) => join(WORK, `${s.id}-${k}.jpg`);
    py('seamless', src, out('seam'), String(s.px));
    py('resize', out('seam'), out('albedo'), String(s.px), '90');
    py('normal', out('seam'), out('normal'), String(s.px), String(s.bump));
    py('rough', out('seam'), out('rough'), String(s.px / 2), String(s.rough[0]), String(s.rough[1]));
    lines.push(`  ${s.id}: { albedo: '${uri(out('albedo'))}', normal: '${uri(out('normal'))}', rough: '${uri(out('rough'))}' },`);
    console.log(`${s.id}: albedo, normal, roughness`);
  }
  return lines;
}

function shard(name: string, type: 'ModelShard' | 'WorldShard', body: string[]): void {
  const text = [
    `// GENERATED by tools/3d/pack.mts — never edited by hand.`,
    `import type { ${type} } from '../assets';`,
    `export const SHARD: ${type} = {`,
    ...body,
    '};',
    '',
  ].join('\n');
  writeFileSync(join(OUT, `${name}.ts`), text);
  const loader = [
    `// The ${name} shard's own bundle, 3d/gl/${name}.js: it registers itself and does nothing else.`,
    `import { SHARD } from './${name}';`,
    '',
    `(globalThis.__shards ??= {})['gl/${name}'] = SHARD;`,
    '',
  ].join('\n');
  writeFileSync(join(OUT, `load-${name}.ts`), loader);
  const mb = Buffer.byteLength(text) / 1048576;
  if (mb > 24) throw new Error(`${name} is ${mb.toFixed(1)} MB as text — past what Cloudflare serves as one file`);
  console.log(`${name}: ${mb.toFixed(1)} MB as text`);
}

mkdirSync(WORK, { recursive: true });
mkdirSync(OUT, { recursive: true });
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const [what = 'all', ...only] = process.argv.slice(2);
const glbUri = (bytes: Uint8Array): string => `data:model/gltf-binary;base64,${Buffer.from(bytes).toString('base64')}`;

if (what === 'bodies' || what === 'all') {
  for (const spec of BODIES) {
    if (only.length && !only.includes(spec.id)) continue;
    const glb = await body(io, spec);
    writeFileSync(join(WORK, `${spec.id}.glb`), glb);
    console.log(`${spec.id.padEnd(14)} ${(glb.byteLength / 1048576).toFixed(2)} MB`);
  }
  for (const name of ['heroes', 'shallows', 'folk'] as Shard[]) {
    const rows: string[] = [];
    for (const spec of BODIES.filter((b) => b.shard === name)) {
      const file = join(WORK, `${spec.id}.glb`);
      if (existsSync(file)) rows.push(`  ${spec.id}: { glb: '${glbUri(readFileSync(file))}', meta: ${JSON.stringify({ rigged: spec.rigged })} },`);
    }
    shard(name, 'ModelShard', rows);
  }
}
if (what === 'clips' || what === 'all') {
  const { glb, meta } = await clips(io);
  console.log(`clips: ${(glb.byteLength / 1048576).toFixed(2)} MB`);
  shard('clips', 'ModelShard', [`  clips: { glb: '${glbUri(glb)}', meta: ${JSON.stringify(meta)} },`]);
}
if (what === 'ground' || what === 'all') shard('ground', 'WorldShard', ground());
if (what === 'props' || what === 'all') {
  const specs = (JSON.parse(readFileSync('tools/3d/props.json', 'utf8')) as { props: PropSpec[] }).props;
  for (const spec of specs) {
    if (only.length && !only.includes(spec.id)) continue;
    if (!existsSync(join(CACHE, `prop-${spec.id}.glb`))) continue;
    const glb = await prop(io, spec);
    writeFileSync(join(WORK, `prop-${spec.id}.glb`), glb);
    console.log(`${spec.id.padEnd(14)} ${(glb.byteLength / 1048576).toFixed(2)} MB`);
  }
  for (const [name, kind] of [['camp', 'prop'], ['gear', 'gear']] as const) {
    const rows: string[] = [];
    for (const spec of specs.filter((p) => p.kind === kind)) {
      const file = join(WORK, `prop-${spec.id}.glb`);
      if (existsSync(file)) rows.push(`  ${spec.id}: { glb: '${glbUri(readFileSync(file))}', meta: ${JSON.stringify({ size: spec.size })} },`);
    }
    shard(name, 'ModelShard', rows);
  }
}
