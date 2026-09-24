/**
 * THE ABYSS'S ASSETS ARRIVE ONLY WHEN SOMEBODY WALKS IN. Each shard is its own
 * script beside `app.js` (`docs/abyss/<shard>.js`, built from
 * `src/abyss/assets/load-<shard>.ts`), so a player who never opens the dev menu never
 * downloads a byte of it, and no shard passes Cloudflare's 25 MiB a file.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

export interface ModelMeta {
  flames?: number[][]; // [x, y, z, radius] in the model's own space, where fire is lit
}
export type ModelShard = Record<string, { glb: string; meta: ModelMeta }>;
export type WorldShard = Record<string, { albedo: string; normal?: string; rough?: string; icon?: boolean }>;

export const SHARDS = ['world', 'actors', 'props', 'furniture'] as const;
type ShardName = (typeof SHARDS)[number];

declare global {
  // eslint-disable-next-line no-var
  var __abyssShards: Partial<Record<ShardName, ModelShard | WorldShard>> | undefined;
}

export interface Model {
  gltf: GLTF;
  meta: ModelMeta;
}

export interface Assets {
  models: Record<string, Model>;
  surfaces: Record<string, { albedo: THREE.Texture; normal?: THREE.Texture; rough?: THREE.Texture }>;
  decals: Record<string, THREE.Texture>;
  icons: Record<string, string>; // data URIs, for the HUD's CSS
}

function script(name: ShardName): Promise<void> {
  if (globalThis.__abyssShards?.[name]) return Promise.resolve();
  return new Promise((ok, no) => {
    const tag = document.createElement('script');
    tag.src = `abyss/${name}.js`;
    tag.onload = () => ok();
    tag.onerror = () => no(new Error(`abyss/${name}.js did not load`));
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

/** Every shard, fetched then decoded; `said` hears each step as it lands. */
export async function loadAssets(anisotropy: number, said: (what: string, done: number) => void): Promise<Assets> {
  let steps = 0;
  const total = SHARDS.length * 2;
  const tick = (what: string) => said(what, ++steps / total);
  await Promise.all(SHARDS.map((s) => script(s).then(() => tick(`fetched ${s}`))));
  const shards = globalThis.__abyssShards ?? {};

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const models: Record<string, Model> = {};
  for (const name of ['actors', 'props', 'furniture'] as const) {
    const shard = (shards[name] ?? {}) as ModelShard;
    await Promise.all(
      Object.entries(shard).map(async ([id, { glb, meta }]) => {
        models[id] = { gltf: await loader.parseAsync(bytes(glb), ''), meta };
      })
    );
    tick(`decoded ${name}`);
  }

  const world = (shards.world ?? {}) as WorldShard;
  const surfaces: Assets['surfaces'] = {};
  const decals: Assets['decals'] = {};
  const icons: Assets['icons'] = {};
  await Promise.all(
    Object.entries(world).map(async ([id, set]) => {
      if (set.icon) {
        icons[id.replace(/^icon_/, '')] = set.albedo;
        return;
      }
      if (!set.normal) {
        decals[id] = await texture(set.albedo, true, anisotropy);
        return;
      }
      surfaces[id] = {
        albedo: await texture(set.albedo, true, anisotropy),
        normal: await texture(set.normal, false, anisotropy),
        rough: set.rough ? await texture(set.rough, false, anisotropy) : undefined,
      };
    })
  );
  tick('decoded world');
  return { models, surfaces, decals, icons };
}
