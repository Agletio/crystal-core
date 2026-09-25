/**
 * THE 3D ART AS FILES UNREAL IMPORTS: every model and the clip bank out of the
 * shards in `src/gl/assets/`, as plain GLB — the meshopt compression and the
 * quantization undone, since Unreal's glTF importer reads neither — beside its
 * meta as JSON, and every ground texture as the image it was, all under
 * `unreal/Import/<shard>/`. The shards stay the one source; this is output.
 *
 *   npx tsx tools/unreal/export.mts
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';

const root = new URL('../..', import.meta.url).pathname;
const out = join(root, 'unreal', 'Import');
const SHARDS = ['heroes', 'shallows', 'folk', 'clips', 'ground', 'camp', 'gear'];
const UNREAD = new Set(['EXT_meshopt_compression', 'KHR_mesh_quantization']);
const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const bytes = (uri: string): Buffer => Buffer.from(uri.slice(uri.indexOf(',') + 1), 'base64');
const used = new Set<string>();

rmSync(out, { recursive: true, force: true });
for (const name of SHARDS) {
  const { SHARD } = (await import(`../../src/gl/assets/${name}.ts`)) as { SHARD: Record<string, Record<string, unknown>> };
  const dir = join(out, name);
  mkdirSync(dir, { recursive: true });
  let models = 0;
  let images = 0;
  for (const [id, entry] of Object.entries(SHARD)) {
    if (typeof entry.glb === 'string') {
      const doc = await io.readBinary(bytes(entry.glb));
      await doc.transform(dequantize());
      for (const ext of doc.getRoot().listExtensionsUsed()) {
        if (UNREAD.has(ext.extensionName)) ext.dispose();
        else used.add(ext.extensionName);
      }
      writeFileSync(join(dir, `${id}.glb`), await io.writeBinary(doc));
      writeFileSync(join(dir, `${id}.json`), `${JSON.stringify(entry.meta ?? {}, null, 1)}\n`);
      models++;
    }
    for (const map of ['albedo', 'normal', 'rough'] as const) {
      const uri = entry[map];
      if (typeof uri !== 'string') continue;
      const mime = uri.slice(5, uri.indexOf(';'));
      writeFileSync(join(dir, `${id}_${map}.${EXT[mime] ?? 'bin'}`), bytes(uri));
      images++;
    }
  }
  console.log(`${name}: ${models} models, ${images} images`);
}
console.log(`extensions left in the models: ${[...used].sort().join(', ') || 'none'}`);
