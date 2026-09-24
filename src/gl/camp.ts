/**
 * THE CAMP IN 3D: the approved concept built as a scene — the cliff, the crack
 * and its sockets in code, the stations and the tent modelled — laid out where
 * the painted camp has them, at real sizes, with everybody you have met
 * standing about.
 *
 * NOTHING HERE IS A DOOR. The camp's hotspots stay the DOM buttons they are, in
 * the picture's own pixels, and this only says where on screen each thing it
 * stands for landed this frame (`bounds`), so `src/ui/camp.ts` puts the button
 * over it: every id a harness names and every `opens` the camp runs is kept.
 */
import * as THREE from 'three';
import { Stage } from './stage';
import { loadAssets } from './assets';
import type { Assets } from './assets';
import { Lamps } from './lights';
import type { LightSource } from './lights';
import { Particles } from './particles';
import { shared } from './shaders';
import type { Shared } from './shaders';
import { flames } from './fire';
import { material } from './terrain';
import { BODIES, Figure, bankOf, bodyFor, makeTemplate } from './bodies';
import type { Pose, Template } from './bodies';
import type { Bank } from './retarget';

/** The painted camp's size, whose pixels every spot and hotspot is measured in. */
export const ART = { w: 688, h: 384 };
/** Art pixels to metres: across the width, and down the ground band from the cliff's foot. */
const PER_X = 0.031;
const CLIFF_Y = 176; // art row where the rock meets the ground
const PER_Z = 0.047;
export const worldOf = (ax: number, ay: number): THREE.Vector3 =>
  new THREE.Vector3((ax - ART.w / 2) * PER_X, 0, Math.max(0.4, (ay - CLIFF_Y) * PER_Z));

/** Where each prop stands, off its hotspot's own rectangle: the middle of its foot. */
const FOOT_OF = (r: { x: number; y: number; w: number; h: number }): THREE.Vector3 => worldOf(r.x + r.w / 2, r.y + r.h * 0.92);

/** A crystal's light, by family. */
const CRYSTAL_INK: Record<string, number> = { normal: 0x9fd4ff, demonic: 0xff5a3c, prismatic: 0xd08cff };

export interface CampPerson {
  key: string; // what the DOM button is keyed by
  sprite: string;
  at: { x: number; y: number }; // feet, in art pixels
  lit: boolean;
  working?: boolean;
}

export interface CampView {
  hero: CampPerson;
  folk: CampPerson[];
  sockets: ({ family: string; level: number } | null)[];
  banked: boolean;
  hot: string | null;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function hash(x: number, y: number, z = 0): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

export class Camp3d {
  readonly canvas: HTMLCanvasElement;
  private readonly stage: Stage;
  private readonly s: Shared = shared();
  private readonly lamps: Lamps;
  private readonly motes = new Particles();
  private readonly world = new THREE.Group();
  private readonly things = new Map<string, THREE.Object3D>(); // hotspot id -> what it stands for
  private readonly crystals: THREE.Group[] = [];
  private readonly people = new Map<string, Figure>();
  private readonly worn = new Map<string, string>(); // a person's key -> the sprite their figure was made for
  private readonly templates = new Map<string, Template>();
  private readonly fireLight: LightSource;
  private emberAt = 0;
  private time = 0;
  private artScale = 1;

  private constructor(host: HTMLElement, stage: Stage, private readonly assets: Assets, private readonly bank: Bank | null, spots: Record<string, Rect>) {
    this.stage = stage;
    this.canvas = stage.canvas;
    this.canvas.className = 'camp__gl';
    Object.assign(this.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%' });
    host.prepend(this.canvas);
    stage.scene.background = new THREE.Color(0x07080b);
    stage.scene.fog = new THREE.FogExp2(0x07080b, 0.009);
    this.lamps = new Lamps(stage.quality);
    this.lamps.tone(0x8e94aa, 0x3a2c1e, 2.1, 0xd0d4ec, 1.5);
    this.lamps.moonFrom.set(-7, 24, 18); // over the eye's left shoulder: the camp is seen from the south, so it is lit from there
    this.lamps.heroPower = 0;
    stage.scene.add(this.world, this.lamps.group, this.motes.group);
    stage.glowing.push(this.motes.group);
    this.fireLight = { kind: 'fire', at: new THREE.Vector3(), color: new THREE.Color(0xff8a3c), power: 28, range: 13, flicker: 0.35, seed: 3 };
    this.build(spots);
  }

  static async create(host: HTMLElement, spots: Record<string, Rect>): Promise<Camp3d | null> {
    const canvas = document.createElement('canvas');
    let stage: Stage;
    try {
      stage = new Stage(canvas);
    } catch {
      return null;
    }
    const assets = await loadAssets('gl', ['ground', 'clips', 'heroes', 'folk', 'camp', 'gear'], stage.anisotropy).catch(() => null);
    if (!assets) {
      stage.dispose();
      return null;
    }
    return new Camp3d(host, stage, assets, bankOf(assets.models.clips), spots);
  }

  // ─── THE PLACE ───
  private build(spots: Record<string, Rect>): void {
    const a = this.assets;
    const s = this.s;
    const lights: LightSource[] = [];

    // The ground: packed dirt on the path, grass where nobody walks.
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(90, 60, 1, 1).rotateX(-Math.PI / 2), groundMaterial(a, s));
    ground.position.set(0, 0, 14);
    ground.receiveShadow = true;
    this.world.add(ground);

    // The cliff: a wall of rock across the back, curling forward at both ends, split by the crack.
    const crackX = worldOf(spots.crack.x + spots.crack.w / 2, 0).x;
    this.world.add(cliff(a, s, crackX));
    const crack = crackGlow(crackX);
    this.world.add(crack);
    this.stage.glowing.push(crack);
    this.things.set('crack', crack.userData.hit as THREE.Object3D);
    lights.push({ kind: 'crack', at: new THREE.Vector3(crackX, 2.4, 0.4), color: new THREE.Color(0xffc56a), power: 34, range: 15, flicker: 0.06, seed: 1 });

    // The sockets, cut into the rock, and the two the art drew that nothing points at.
    for (let slot = 0; slot < 4; slot++) {
      const r = spots[`socket${slot}`];
      if (!r) continue;
      const at = new THREE.Vector3(worldOf(r.x + r.w / 2, 0).x, 6.3 - ((r.y + r.h / 2) / CLIFF_Y) * 5.2, 0.1);
      const hollow = socket(a, s, at, r.w * PER_X * 0.55);
      this.world.add(hollow);
      this.things.set(`socket${slot}`, hollow);
      const gem = new THREE.Group();
      gem.position.copy(at).add(new THREE.Vector3(0, 0, 0.25));
      this.world.add(gem);
      this.crystals[slot] = gem;
    }

    // The stations and the rest, each at the foot of its own rectangle.
    const PROP: Record<string, { model: string; turn: number; lit?: number }> = {
      bench: { model: 'bench', turn: 0.15 },
      shelf: { model: 'shelf', turn: 0.3 },
      tent: { model: 'tent', turn: -0.55 },
      anvil: { model: 'anvil', turn: 0.4 },
      smelter: { model: 'smelter', turn: 0.45, lit: 0xff7a2c },
      loom: { model: 'loom', turn: -0.2 },
      tannery: { model: 'tannery', turn: -0.35 },
      kitchen: { model: 'kitchen', turn: -0.4, lit: 0xff8a3c },
      jeweller: { model: 'jeweller', turn: -0.5 },
    };
    for (const [id, p] of Object.entries(PROP)) {
      const r = spots[id];
      const model = a.models[p.model];
      if (!r) continue;
      const at = FOOT_OF(r);
      const g = new THREE.Group();
      g.position.copy(at);
      g.rotation.y = p.turn;
      if (model) {
        const copy = model.gltf.scene.clone(true);
        copy.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m.isMesh) (m.castShadow = true), (m.receiveShadow = true);
        });
        g.add(copy);
      }
      this.world.add(g);
      this.things.set(id, g);
      if (p.lit) lights.push({ kind: id, at: at.clone().add(new THREE.Vector3(0, 0.8, 0.6)), color: new THREE.Color(p.lit), power: 8, range: 6, flicker: 0.3, seed: hash(at.x, at.z) * 50 });
    }

    // The fire: a ring of stones, crossed logs, flame, and the light the whole camp is lit by.
    const fr = spots.fire;
    const fire = new THREE.Group();
    fire.position.copy(FOOT_OF(fr));
    const stone = material(a, 'cave_rock', 0xd8ccb8, s, { triplanar: 1.2 }, false);
    const wood = material(a, 'wood', 0x8a7a66, s, { triplanar: 1.4 }, false);
    const rock = new THREE.IcosahedronGeometry(0.2, 1);
    for (let k = 0; k < 11; k++) {
      const t = (k / 11) * Math.PI * 2;
      const m = new THREE.Mesh(rock, stone);
      m.position.set(Math.cos(t) * 0.78, 0.08, Math.sin(t) * 0.62);
      m.scale.set(1 + hash(k, 1) * 0.4, 0.7 + hash(k, 2) * 0.3, 1 + hash(k, 3) * 0.3);
      m.castShadow = m.receiveShadow = true;
      fire.add(m);
    }
    for (let k = 0; k < 5; k++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.9, 7), wood);
      const t = (k / 5) * Math.PI * 2;
      log.position.set(Math.cos(t) * 0.18, 0.2, Math.sin(t) * 0.18);
      log.rotation.set(Math.sin(t) * 1.05, 0, -Math.cos(t) * 1.05);
      log.castShadow = true;
      fire.add(log);
    }
    const flame = flames([{ at: new THREE.Vector3(0, 0.15, 0), size: 1.1, kind: 'brazier' }], s);
    fire.add(flame);
    this.stage.glowing.push(flame);
    this.world.add(fire);
    this.things.set('fire', fire);
    this.fireLight.at.copy(fire.position).add(new THREE.Vector3(0, 1.1, 0));
    lights.push(this.fireLight);
    this.lamps.use(lights);
  }

  // ─── WHAT MOVES: people, the crystals in their sockets, the fire, the air ───
  private templateOf(sprite: string): Template | null {
    const id = bodyFor(sprite);
    if (!id) return null;
    const had = this.templates.get(id);
    if (had) return had;
    const def = BODIES[id];
    const model = this.assets.models[def.model];
    if (!model) return null;
    const made = makeTemplate(def, model, this.bank);
    this.templates.set(id, made);
    return made;
  }

  private person(p: CampPerson, dt: number, face: THREE.Vector3): void {
    let fig = this.people.get(p.key);
    if (fig && this.worn.get(p.key) !== p.sprite) (fig.dispose(), this.people.delete(p.key), (fig = undefined));
    if (!fig) {
      const t = this.templateOf(p.sprite);
      const id = bodyFor(p.sprite);
      if (!t || !id) return;
      fig = new Figure(BODIES[id], t, this.s, 'common', 1, false);
      this.worn.set(p.key, p.sprite);
      this.people.set(p.key, fig);
      this.world.add(fig.root);
    }
    const at = worldOf(p.at.x, p.at.y);
    const toward = face.clone().sub(at);
    const pose: Pose = {
      x: at.x, z: at.z, lift: 0, facing: Math.atan2(toward.z, toward.x), moving: false, speed: 0,
      dead: false, hurt: false, held: false, flash: p.lit ? 0.22 : 0, hidden: 0,
    };
    fig.place(pose, dt);
    // A hero stands in camp holding what he wears, off his sprite's variant.
    const drawn = p.sprite.split('_').slice(1);
    const lead = drawn[0] === 'bow' || drawn[0] === 'shield';
    const main: string | undefined = lead ? undefined : drawn[0];
    const off: string | undefined = lead ? drawn[0] : drawn[1];
    fig.carry('main', main ?? null, main ? (this.assets.models[main]?.gltf.scene ?? null) : null);
    fig.carry('off', off ?? null, off ? (this.assets.models[off]?.gltf.scene ?? null) : null);
    fig.step(pose, dt);
    fig.seenAt = this.time;
  }

  frame(view: CampView, dt: number): void {
    this.time += dt;
    this.s.uTime.value += dt;
    const camp = new THREE.Vector3(0, 0, 7);
    const fire = this.things.get('fire')?.position ?? camp;
    this.person(view.hero, dt, fire);
    for (const p of view.folk) this.person(p, dt, fire);
    for (const [key, fig] of this.people) {
      if (fig.seenAt === this.time) continue;
      fig.dispose();
      this.people.delete(key);
      this.worn.delete(key);
    }
    view.sockets.forEach((held, slot) => {
      const gem = this.crystals[slot];
      if (!gem) return;
      const want = held ? `${held.family}:${held.level}` : '';
      if (gem.userData.held !== want) {
        gem.clear();
        gem.userData.held = want;
        if (held) {
          const ink = CRYSTAL_INK[held.family] ?? CRYSTAL_INK.normal;
          const c = new THREE.Mesh(
            new THREE.OctahedronGeometry(0.22 + held.level * 0.03, 0).scale(0.8, 1.5, 0.8),
            new THREE.MeshStandardMaterial({ color: ink, emissive: ink, emissiveIntensity: 1.6 + held.level * 0.3, roughness: 0.15, metalness: 0.2 })
          );
          gem.add(c);
        }
      }
      gem.rotation.y += dt * 0.8;
    });
    // The fire BANKED burns harder: points are waiting on the web it opens.
    const hard = view.banked ? 1.6 : 1;
    this.fireLight.power = 28 * hard;
    this.emberAt -= dt;
    if (this.emberAt <= 0) {
      this.emberAt = view.banked ? 0.05 : 0.12;
      this.motes.emit({ at: fire.clone().add(new THREE.Vector3(0, 0.6, 0)), count: 1, spread: 0.25, speed: [0.3, 0.9], dir: new THREE.Vector3(0, 1, 0), cone: 0.35, life: [1.2, 2.4], size: [0.03, 0.06], color: [0xffa050, 0xffd080], rise: 0.8, drag: 0.4, swirl: 0.6 });
    }
    this.lamps.update(camp, camp, this.s.uTime.value, dt);
    this.motes.update(dt);
    this.s.uCam.value.copy(this.stage.camera.position);
    this.stage.render(dt);
  }

  /** The camera sees the camp the way the picture does: a high look north at the cliff. */
  resize(width: number, height: number, artScale: number): void {
    this.artScale = artScale;
    this.stage.resize(Math.max(1, width), Math.max(1, height));
    this.motes.setScale(height * this.stage.renderer.getPixelRatio(), this.stage.camera.fov);
    const cam = this.stage.camera;
    // THE ART'S RECTANGLE IS FRAMED EXACTLY and a wider window sees more camp either side.
    const artH = ART.h * artScale;
    cam.fov = (2 * Math.atan(Math.tan((CAM.fov * Math.PI) / 360) * (height / Math.max(1, artH))) * 180) / Math.PI;
    cam.aspect = width / Math.max(1, height);
    cam.position.copy(CAM.at);
    cam.lookAt(CAM.look);
    cam.updateProjectionMatrix();
  }

  /** Where `id` landed on screen this frame, in art pixels: a hotspot, or a person's key. */
  bounds(id: string, width: number, height: number): Rect | null {
    const thing = this.things.get(id) ?? this.people.get(id)?.root;
    if (!thing) return null;
    const box = new THREE.Box3();
    const fig = this.people.get(id);
    if (fig) {
      const p = fig.root.position;
      box.set(new THREE.Vector3(p.x - 0.45, p.y, p.z - 0.45), new THREE.Vector3(p.x + 0.45, p.y + fig.height, p.z + 0.45));
    } else box.setFromObject(thing);
    if (box.isEmpty()) return null;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    const v = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(this.stage.camera);
      const sx = ((v.x + 1) / 2) * width;
      const sy = ((1 - v.y) / 2) * height;
      x0 = Math.min(x0, sx);
      y0 = Math.min(y0, sy);
      x1 = Math.max(x1, sx);
      y1 = Math.max(y1, sy);
    }
    // Screen pixels into the stage's own: centred, and scaled by one number.
    const k = this.artScale;
    const ax = (px: number) => (px - width / 2) / k + ART.w / 2;
    const ay = (py: number) => (py - height / 2) / k + ART.h / 2;
    return { x: ax(x0), y: ay(y0), w: (x1 - x0) / k, h: (y1 - y0) / k };
  }

  dispose(): void {
    for (const f of this.people.values()) f.dispose();
    this.people.clear();
    this.stage.dispose();
    this.canvas.remove();
  }
}

/** The camera, fixed: where it stands, where it looks, and the lens across the art's own height. */
const CAM = { at: new THREE.Vector3(0, 9.8, 18.6), look: new THREE.Vector3(0, 1.2, 4.9), fov: 34 };

/** Dirt where the camp walks and grass where it does not, mixed by a noise and the path from the crack to the fire. */
function groundMaterial(a: Assets, s: Shared): THREE.MeshStandardMaterial {
  const dirt = a.surfaces.camp_dirt;
  const grass = a.surfaces.camp_grass;
  const mat = new THREE.MeshStandardMaterial({ map: dirt?.albedo ?? null, normalMap: dirt?.normal ?? null, roughnessMap: dirt?.rough ?? null, roughness: 1, color: 0xb8aa98 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uGrass = { value: grass?.albedo ?? null };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCampWorld;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvCampWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D uGrass;
        varying vec3 vCampWorld;
        float ch(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float cn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(ch(i), ch(i + vec2(1, 0)), f.x), mix(ch(i + vec2(0, 1)), ch(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('#include <map_fragment>', `
        vec2 cuv = vCampWorld.xz * 0.28;
        vec3 dirtC = texture2D(map, cuv).rgb;
        vec3 grassC = texture2D(uGrass, cuv * 1.3).rgb;
        float noise = cn(vCampWorld.xz * 0.35) * 0.6 + cn(vCampWorld.xz * 1.1) * 0.4;
        float path = smoothstep(2.6, 0.8, abs(vCampWorld.x - 0.1 * vCampWorld.z)) * smoothstep(13.0, 4.0, vCampWorld.z);
        float ring = smoothstep(4.6, 2.2, length(vCampWorld.xz - vec2(0.0, 4.2)));
        float bare = clamp(max(path, ring) + (0.45 - noise), 0.0, 1.0);
        diffuseColor.rgb *= mix(grassC * 0.95, dirtC, smoothstep(0.35, 0.65, bare));`);
  };
  return mat;
}

/** The rock the camp is backed against: a curved wall, pushed about by noise,
 *  SPLIT where the crack runs — its columns crowd toward the split so the
 *  opening is cut clean rather than guessed at between two coarse ones. */
function cliff(a: Assets, s: Shared, crackX: number): THREE.Mesh {
  const COLS = 120;
  const ROWS = 40;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const xs: number[] = [];
  for (let c = 0; c <= COLS; c++) {
    const u = (c / COLS) * 2 - 1; // -1..1, squeezed toward the split
    xs.push(crackX + Math.sign(u) * Math.pow(Math.abs(u), 1.8) * 32);
  }
  for (let r = 0; r <= ROWS; r++) {
    const y = (r / ROWS) * 16;
    for (const x of xs) {
      const curl = Math.pow(Math.max(0, Math.abs(x) - 11) / 19, 1.6) * 16; // the ends wrap round toward the eye
      const d = x - crackX;
      const split = Math.exp(-Math.pow(d / 0.7, 2)) * 3.2; // the crack: the rock falls away into it
      const lean = Math.exp(-Math.pow(d / 2.4, 2)) * 0.6; // and the two lips lean in over it
      const rough = (hash(Math.round(x * 3), Math.round(y * 3)) - 0.5) * 0.22 + Math.sin(x * 0.9 + y * 0.4) * 0.35 + Math.sin(y * 1.7 - x * 0.3) * 0.2;
      pos.push(x, y, -0.4 - split + lean + curl + rough - Math.max(0, 0.6 - y) * 0.8);
      uv.push(x * 0.12, y * 0.12);
    }
  }
  const row = COLS + 1;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const a0 = r * row + c;
      idx.push(a0, a0 + 1, a0 + row, a0 + 1, a0 + row + 1, a0 + row);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mat = material(a, 'cave_rock', 0xd8cbb8, s, { triplanar: 0.42 }, false);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

/** The crack's light: a hot slit down the back of the split, lit from within. */
function crackGlow(x: number): THREE.Group {
  const g = new THREE.Group();
  const slit = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 16, 1, 1).translate(0, 8, 0),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.2, 1.0), toneMapped: false })
  );
  slit.position.set(x, 0, -3.2);
  const haze = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 16, 1, 1).translate(0, 8, 0),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.55, 0.2), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
  );
  haze.position.set(x, 0, -2.4);
  const hit = new THREE.Mesh(new THREE.BoxGeometry(1.6, 7, 1), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(x, 3.5, -1.2);
  g.add(slit, haze, hit);
  g.userData.hit = hit;
  return g;
}

/** A hollow cut into the rock for a crystal: a carved rim round a dark recess. */
function socket(a: Assets, s: Shared, at: THREE.Vector3, r: number): THREE.Group {
  const g = new THREE.Group();
  g.position.copy(at);
  const stone = material(a, 'cave_rock', 0x9a9088, s, { triplanar: 2 }, false);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.22, 8, 24), stone);
  rim.castShadow = true;
  const hole = new THREE.Mesh(new THREE.CircleGeometry(r * 0.95, 24), new THREE.MeshStandardMaterial({ color: 0x0c0a09, roughness: 1 }));
  hole.position.z = -0.05;
  g.add(rim, hole);
  return g;
}
