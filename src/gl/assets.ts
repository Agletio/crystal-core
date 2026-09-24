/**
 * 3D ASSETS ARRIVE AS SHARDS: each is its own script beside `app.js`
 * (`docs/<dir>/<name>.js`, built from a `load-<name>.ts` that registers its
 * data in `__shards` and does nothing else), so a page that never draws in 3D
 * never downloads a byte of it, and no shard passes Cloudflare's 25 MiB a file.
 *
 * A shard entry with a `glb` is a MODEL; one with an `albedo` is a SURFACE when
 * it carries a normal map, a DECAL when it does not, and an ICON when it says so.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export interface ModelMeta {
  flames?: number[][]; // [x, y, z, radius] in the model's own space, where fire is lit
  [key: string]: unknown;
}
export type ModelShard = Record<string, { glb: string; meta: ModelMeta }>;
export type WorldShard = Record<string, { albedo: string; normal?: string; rough?: string; icon?: boolean }>;
type Shard = Record<string, { glb?: string; meta?: ModelMeta; albedo?: string; normal?: string; rough?: string; icon?: boolean }>;

declare global {
  // eslint-disable-next-line no-var
  var __shards: Record<string, Shard> | undefined; // keyed `<dir>/<name>`
}

export interface Model {
  gltf: GLTF;
  meta: ModelMeta;
}

export interface Assets {
  models: Record<string, Model>;
  surfaces: Record<string, { albedo: THREE.Texture; normal?: THREE.Texture; rough?: THREE.Texture }>;
  decals: Record<string, THREE.Texture>;
  icons: Record<string, string>; // data URIs, for CSS
}

function script(dir: string, name: string): Promise<void> {
  if (globalThis.__shards?.[`${dir}/${name}`]) return Promise.resolve();
  return new Promise((ok, no) => {
    const tag = document.createElement('script');
    tag.src = `${dir}/${name}.js`;
    tag.onload = () => ok();
    tag.onerror = () => no(new Error(`${dir}/${name}.js did not load`));
    document.head.append(tag);
  });
}

function bytes(uri: string): ArrayBuffer {
  const bin = atob(uri.slice(uri.indexOf(',') + 1));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

function texture(uri: string, srgb: boolean, anisotropy: number): Promise<THREE.Texture> {
  return new Promise((ok, no) => {
    new THREE.TextureLoader().load(
      uri,
      (t) => {
        t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = anisotropy;
        ok(t);
      },
      undefined,
      no
    );
  });
}

/** Every shard named, fetched then decoded; `said` hears each step as it lands. */
export async function loadAssets(
  dir: string,
  names: readonly string[],
  anisotropy: number,
  said: (what: string, done: number) => void = () => undefined
): Promise<Assets> {
  let steps = 0;
  const total = names.length * 2;
  const tick = (what: string) => said(what, ++steps / total);
  await Promise.all(names.map((n) => script(dir, n).then(() => tick(`fetched ${n}`))));

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const out: Assets = { models: {}, surfaces: {}, decals: {}, icons: {} };
  for (const name of names) {
    const shard = globalThis.__shards?.[`${dir}/${name}`] ?? {};
    await Promise.all(
      Object.entries(shard).map(async ([id, e]) => {
        if (e.glb) out.models[id] = { gltf: await loader.parseAsync(bytes(e.glb), ''), meta: e.meta ?? {} };
        else if (e.icon && e.albedo) out.icons[id.replace(/^icon_/, '')] = e.albedo;
        else if (e.albedo && !e.normal) out.decals[id] = await texture(e.albedo, true, anisotropy);
        else if (e.albedo && e.normal) {
          out.surfaces[id] = {
            albedo: await texture(e.albedo, true, anisotropy),
            normal: await texture(e.normal, false, anisotropy),
            rough: e.rough ? await texture(e.rough, false, anisotropy) : undefined,
          };
        }
      })
    );
    tick(`decoded ${name}`);
  }
  return out;
}
