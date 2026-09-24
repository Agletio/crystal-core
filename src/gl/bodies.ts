/**
 * THE BODIES IN 3D: which model draws a sprite, which clips it plays, and one
 * FIGURE per entity animated off the sim's own state and nothing else.
 *
 * A sprite with no model here is not an error — the renderer stands its pixel
 * frames up as a billboard, so a world nobody has modelled still plays.
 *
 * AN ATTACK IS A WINDOW OF ITS CLIP, and its IMPACT frame is pinned to the
 * moment the sim lands the blow: a monster's swing starts with its wind-up and
 * is time-scaled so the blow falls when `winding` runs out, which is the tell
 * the game gives and the one thing the art may not get wrong. The hero's swing
 * lands the tick it is made, so his starts just short of its impact.
 *
 * EVERY CLIP IS MEASURED ON THE BODY IT PLAYS ON before it is played: stood on
 * the floor by its lower foot (a clip made for another skeleton floats or sinks
 * by whatever the two legs differ), and its walking speed read off the foot
 * that is planted, since every clip in the bank walks on the spot. A body picks
 * the GAIT whose speed is nearest its own and plays it at exactly that speed,
 * so a foot on the floor stays where it was put.
 */
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import type { Model } from './assets';
import { actorLook, patchActor } from './shaders';
import type { ActorLook, Shared } from './shaders';
import { retarget, skeletonOf } from './retarget';
import type { Bank, Skeleton } from './retarget';

export interface Window {
  clip: string;
  start: number; // fractions of the clip
  impact: number;
  end: number;
}

/** A body drawn off ANOTHER body's mesh, its limbs lengthened: `lengths` scales
 *  the distance from a bone to its children, `head` the skull around its joint. */
export interface Shape {
  lengths: Record<string, number>;
  head: number;
}

export interface BodyDef {
  model: string; // a model in the gl shards
  shard: string;
  height: number; // metres, at the sprite's own scale
  idle: string;
  ready?: string; // the idle with something awake near
  move: string[]; // gaits, slowest first: the one nearest the body's speed plays
  attack: Window[];
  cast?: Window[];
  hit: Window;
  death: Window;
  roar?: Window;
  leap?: Window; // a mover's jump, over the arc the renderer flies it along
  shape?: Shape;
  /** No skeleton: moved whole. A beast trots on its own bob, a person glides. */
  still?: 'beast' | 'glide';
  /** What a body that is NOT a hero carries, by `HELD` family: a hero's is his equipment. */
  holds?: { main?: string; off?: string; size?: number };
  rim?: number; // a glow the body's own paint carries, 1 as painted
}

const W = (clip: string, start: number, impact: number, end: number): Window => ({ clip, start, impact, end });

const HERO: Omit<BodyDef, 'model' | 'move'> = {
  shard: 'heroes', height: 1.8, idle: 'hero/idle', ready: 'hero/ready',
  attack: [W('imp/attack', 0.2, 0.42, 0.78)],
  cast: [W('hero/cast', 0.3, 0.37, 0.6), W('hero/cast2', 0.32, 0.4, 0.62)],
  hit: W('hero/hit', 0.02, 0.1, 0.34), death: W('hero/death', 0, 0, 0.98),
  leap: W('bank/leap', 0.12, 0.29, 0.45), // the crouch, the spring, and down hard at its end
};
/** A hero jogs at his own pace and sprints on his OWN run once something makes him quicker. Obreth's
 *  legs take the borrowed jog badly — measured, his planted foot skated at 1.2 m/s — so he walks or runs. */
const heroGaits = (id: string): string[] => (id === 'obreth' ? [`${id}/walk`, `${id}/run`] : ['hero/run', `${id}/run`]);

/** By body id. A hero's is the TRADE's sprite; a monster's is `MONSTERS`' own id. */
export const BODIES: Record<string, BodyDef> = {
  aethermancer: { ...HERO, model: 'aethermancer', move: heroGaits('aethermancer') },
  alchemist: { ...HERO, model: 'alchemist', move: heroGaits('alchemist') },
  obreth: { ...HERO, model: 'obreth', move: heroGaits('obreth'), height: 1.85 },
  mahthar: { ...HERO, model: 'mahthar', move: heroGaits('mahthar'), height: 1.9 },
  husk: {
    model: 'husk', shard: 'shallows', height: 1.75, idle: 'hornfiend/idle', move: ['husk/walk', 'husk/run'], holds: { main: 'pick' },
    attack: [W('imp/attack', 0.08, 0.42, 0.78)],
    hit: W('hero/hit', 0.02, 0.1, 0.3), death: W('imp/death', 0.02, 0, 0.92),
  },
  gaunt: {
    model: 'husk', shard: 'shallows', height: 2.9, idle: 'hornfiend/idle', move: ['bank/shamble', 'husk/walk'],
    attack: [W('imp/attack', 0.08, 0.42, 0.78)],
    hit: W('hero/hit', 0.02, 0.1, 0.3), death: W('hornfiend/death', 0, 0, 0.97), roar: W('imp/roar', 0.1, 0.3, 0.75),
    shape: { lengths: { LeftUpLeg: 1.45, LeftLeg: 1.45, RightUpLeg: 1.45, RightLeg: 1.45, LeftArm: 1.7, LeftForeArm: 1.7, RightArm: 1.7, RightForeArm: 1.7, neck: 1.8 }, head: 0.72 },
  },
  heap: {
    model: 'heap', shard: 'shallows', height: 2.4, idle: 'hornfiend/idle', move: ['hornfiend/walk', 'heap/walk'],
    attack: [W('hornfiend/attack', 0.2, 0.82, 0.98)],
    hit: W('hero/hit', 0.02, 0.12, 0.3), death: W('hornfiend/death', 0, 0, 0.97), roar: W('hornfiend/roar', 0.1, 0.35, 0.8),
  },
  bonecaller: {
    model: 'bonecaller', shard: 'shallows', height: 1.95, idle: 'chanter/idle', move: ['bonecaller/walk', 'bonecaller/run'],
    attack: [W('chanter/cast', 0.18, 0.52, 0.82)], cast: [W('chanter/cast', 0.18, 0.52, 0.82)],
    hit: W('chanter/hit', 0.02, 0.06, 0.2), death: W('hero/death', 0, 0, 0.98),
  },
  answering: {
    model: 'answering', shard: 'shallows', height: 4.0, idle: 'hornfiend/idle', move: ['bank/shamble', 'answering/walk'], holds: { main: 'mace2h', size: 1.6 },
    attack: [W('hornfiend/attack', 0.2, 0.82, 0.98), W('bank/slam', 0.1, 0.55, 0.9)],
    hit: W('hero/hit', 0.02, 0.12, 0.3), death: W('hornfiend/death', 0, 0, 0.97), roar: W('imp/roar', 0.1, 0.3, 0.75),
  },
  // THE ROT'S, off the Abyss's own models and the clips it bought for them.
  imp: {
    model: 'imp', shard: 'abyss/actors', height: 1.15, idle: 'imp/idle', move: ['imp/run'],
    attack: [W('imp/attack', 0.08, 0.42, 0.78)], hit: W('imp/hit', 0.02, 0.04, 0.1), death: W('imp/death', 0.02, 0, 0.92),
    roar: W('imp/roar', 0.1, 0.3, 0.75), rim: 0.55,
  },
  chanter: {
    model: 'chanter', shard: 'abyss/actors', height: 1.9, idle: 'chanter/idle', move: ['chanter/walk'],
    attack: [W('chanter/cast', 0.18, 0.52, 0.82)], cast: [W('chanter/cast', 0.18, 0.52, 0.82)],
    hit: W('chanter/hit', 0.02, 0.04, 0.1), death: W('chanter/death', 0.02, 0, 0.92), rim: 1.3,
  },
  hornfiend: {
    model: 'hornfiend', shard: 'abyss/actors', height: 3.0, idle: 'hornfiend/idle', move: ['hornfiend/walk'],
    attack: [W('hornfiend/attack', 0.2, 0.82, 0.98)], hit: W('hornfiend/hit', 0.02, 0.12, 0.3), death: W('hornfiend/death', 0, 0, 0.97),
    roar: W('hornfiend/roar', 0.1, 0.35, 0.8), rim: 1.1,
  },
  crawler: {
    model: 'crawler', shard: 'shallows', height: 1.0, idle: '', move: [], still: 'beast',
    attack: [W('', 0, 0.5, 1)], hit: W('', 0, 0.2, 1), death: W('', 0, 0, 1),
  },
  hound: {
    model: 'hound', shard: 'shallows', height: 1.1, idle: '', move: [], still: 'beast',
    attack: [W('', 0, 0.5, 1)], hit: W('', 0, 0.2, 1), death: W('', 0, 0, 1),
  },
  lampwright: {
    model: 'lampwright', shard: 'folk', height: 1.85, idle: '', move: [], still: 'glide',
    attack: [W('', 0, 0.5, 1)], hit: W('', 0, 0.2, 1), death: W('', 0, 0, 1),
  },
  smith: {
    model: 'smith', shard: 'folk', height: 1.9, idle: 'chanter/idle', move: ['smith/walk', 'smith/run'],
    attack: [W('hornfiend/attack', 0.2, 0.82, 0.98)], hit: W('hero/hit', 0.02, 0.1, 0.3), death: W('hero/death', 0, 0, 0.98),
  },
  hob: {
    model: 'hob', shard: 'folk', height: 1.35, idle: 'chanter/idle', move: ['hob/walk', 'hob/run'],
    attack: [W('bank/stoop', 0, 0.5, 1)], hit: W('hero/hit', 0.02, 0.1, 0.3), death: W('hero/death', 0, 0, 0.98),
  },
  nell: {
    model: 'nell', shard: 'folk', height: 1.7, idle: 'chanter/idle', move: ['nell/walk', 'nell/run'],
    attack: [W('bank/stoop', 0, 0.5, 1)], hit: W('hero/hit', 0.02, 0.1, 0.3), death: W('hero/death', 0, 0, 0.98),
  },
};

/** A sprite to its body: a hero's weapon VARIANTS are one man, so the part
 *  before the first underscore is the body and the rest is what he holds. */
const SPRITE_BODY: Record<string, string> = {
  dragger: 'crawler', hewer: 'husk', courser: 'hound', shroud: 'bonecaller',
};
export function bodyFor(sprite: string): string | null {
  const base = sprite.split('_')[0];
  const id = SPRITE_BODY[base] ?? base;
  return BODIES[id] ? id : null;
}

/** What a hero's swing looks like, by the `HELD` family in his main hand. */
export const SWINGS: Record<string, Window[]> = {
  sword: [W('imp/attack', 0.2, 0.42, 0.78)],
  mace: [W('imp/attack', 0.2, 0.42, 0.78)],
  dagger: [W('bank/thrust', 0.1, 0.4, 0.8)],
  sword2h: [W('hornfiend/attack', 0.45, 0.82, 0.98)],
  mace2h: [W('hornfiend/attack', 0.45, 0.82, 0.98)],
  staff: [W('hornfiend/attack', 0.45, 0.82, 0.98)],
  bow: [W('bank/bow', 0.3, 0.62, 0.9)],
  dual: [W('bank/dual', 0.05, 0.3, 0.55), W('bank/dual', 0.55, 0.75, 0.98)],
  pick: [W('hornfiend/attack', 0.2, 0.82, 0.98)],
  hook: [W('bank/stoop', 0.05, 0.5, 0.95)],
};

/** A RANK IS LIGHT OUTSIDE THE BODY — a pool of it on the floor under the feet —
 *  and never a line round its edge: the silhouette is the body's own. */
/** HOW A HAND HOLDS A THING, in the hand bone's own frame: Meshy's hand bone
 *  runs wrist to fingers along Y, so a weapon stands out of the thumb side of
 *  the fist a quarter turn off it, and a shield hangs face-out off the left. The
 *  bone's origin is the WRIST; the grip is `PALM` metres on, in the palm. */
const GRIP_TURN = {
  main: new THREE.Euler(0, 0, -Math.PI / 2),
  off: new THREE.Euler(0, 0, Math.PI / 2),
  shield: new THREE.Euler(Math.PI, 0, Math.PI / 2),
};
const PALM = 0.085;

const RANK_LOOK: Record<string, { glow: number; power: number; grow: number }> = {
  magic: { glow: 0x4a7dff, power: 0.32, grow: 1.1 },
  rare: { glow: 0xffb02e, power: 0.4, grow: 1.2 },
};

let poolTexture: THREE.Texture | null = null;
function poolTex(): THREE.Texture {
  if (poolTexture) return poolTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,0.9)');
    r.addColorStop(0.5, 'rgba(255,255,255,0.35)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  }
  poolTexture = new THREE.CanvasTexture(c);
  return poolTexture;
}

/** One model made ready once, whatever number of bodies wear it. */
export interface Template {
  scene: THREE.Object3D;
  skeleton: Skeleton | null;
  height: number; // metres the model stands at scale 1
  clips: Map<string, THREE.AnimationClip>;
  bank: Bank | null;
  probe?: Probe | null;
}

/** A spare copy of a body, posed on the CPU to measure a clip before anything plays it. */
interface Probe {
  scene: THREE.Object3D;
  mixer: THREE.AnimationMixer;
  bones: THREE.Object3D[];
  feet: THREE.Object3D[];
  rest: number; // the lower ankle's height standing at rest
  unit: number; // metres a unit of the hips' parent, which is what a Hips.position key is in
}

const TOP = 9; // a one-shot outweighs the loop under it nine to one: a swing is a swing, not half of one
const FLINCH = 1.2; // a hit is laid OVER what the body is doing, never instead of it
const UPPER = '|upper'; // a clip's top half alone, for a body swinging on the move
const LEGS = new Set(['Hips', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase']);
const SAMPLES = 40;

export function bankOf(model: Model | undefined): Bank | null {
  if (!model) return null;
  const meta = model.meta as unknown as Omit<Bank, 'clips'>;
  const clips = new Map<string, THREE.AnimationClip>();
  for (const c of model.gltf.animations) clips.set(c.name, c);
  return { clips, rests: meta.rests, hips: meta.hips, of: meta.of };
}

/** THE LIMBS LENGTHENED IN THE MESH ITSELF, so the result is an ordinary
 *  skinned body at rest: posed long, every vertex skinned into that pose, and
 *  the pose made its new bind. A bone scaled at play time shears at every bend. */
function reshape(scene: THREE.Object3D, shape: Shape): void {
  scene.updateMatrixWorld(true);
  const bones = new Map<string, THREE.Object3D>();
  scene.traverse((o) => bones.set(o.name, o));
  const footY = (): number => {
    const p = new THREE.Vector3();
    return Math.min(...['LeftFoot', 'RightFoot'].map((n) => bones.get(n)?.getWorldPosition(p).y ?? 0));
  };
  const before = footY();
  for (const [name, k] of Object.entries(shape.lengths)) {
    for (const child of bones.get(name)?.children ?? []) child.position.multiplyScalar(k);
  }
  bones.get('Head')?.scale.setScalar(shape.head);
  scene.updateMatrixWorld(true);
  const hips = bones.get('Hips');
  if (hips?.parent) {
    const drop = before - footY();
    hips.position.y += drop / hips.parent.getWorldScale(new THREE.Vector3()).y;
    scene.updateMatrixWorld(true);
  }
  scene.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    // A cloned skeleton SHARES its inverse binds with the one it was cloned
    // from, so re-binding it in place re-binds the body this one was made of.
    mesh.skeleton.boneInverses = mesh.skeleton.boneInverses.map((m) => m.clone());
    mesh.geometry = mesh.geometry.clone();
    const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const out = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    mesh.skeleton.update();
    // `attached` binding reads a vertex as WORLD once boneWorld · inverse has
    // run, so the skinned point is stored in metres, not the armature's units.
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      mesh.applyBoneTransform(i, v).applyMatrix4(mesh.matrixWorld);
      v.toArray(out, i * 3);
    }
    mesh.geometry.setAttribute('position', new THREE.BufferAttribute(out, 3));
    mesh.geometry.computeBoundingBox();
    mesh.geometry.computeBoundingSphere();
  });
  bones.get('Head')?.scale.setScalar(1);
  scene.updateMatrixWorld(true);
  scene.traverse((o) => {
    const mesh = o as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    mesh.skeleton.calculateInverses();
    mesh.computeBoundingBox(); // copied off the body it was cloned from, and stale
    mesh.computeBoundingSphere();
  });
}

/**
 * A BEAST MESHY WOULD NOT RIG, rigged here: its four limbs are where the mesh
 * meets the ground, found by clustering what is under its belly; its head is
 * its highest mass, and the body is turned so that head is +Z like every other
 * model. A limb is a hip and a knee; everything over the belly is the body.
 */
function rigBeast(scene: THREE.Object3D): THREE.Object3D {
  scene.updateMatrixWorld(true);
  let source: THREE.Mesh | null = null;
  scene.traverse((o) => {
    if (!source && (o as THREE.Mesh).isMesh) source = o as THREE.Mesh;
  });
  if (!source) return scene;
  const mesh = source as THREE.Mesh;
  const geo = mesh.geometry.clone();
  // PACKED POSITIONS ARE 16-BIT and normalised: moved in place they clamp to the
  // unit cube, so they are floats before anything transforms them.
  for (const name of ['position', 'normal']) {
    const a = geo.getAttribute(name);
    if (!a) continue;
    const f = new Float32Array(a.count * 3);
    for (let i = 0; i < a.count; i++) (f[i * 3] = a.getX(i)), (f[i * 3 + 1] = a.getY(i)), (f[i * 3 + 2] = a.getZ(i));
    geo.setAttribute(name, new THREE.BufferAttribute(f, 3));
  }
  geo.applyMatrix4(mesh.matrixWorld);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  geo.computeBoundingBox();
  const box = geo.boundingBox!;
  const h = box.max.y - box.min.y;
  const floor = box.min.y;
  const v = new THREE.Vector3();
  // THE HEAD: the top of the body, off the middle of the whole.
  const mid = new THREE.Vector2();
  const top = new THREE.Vector2();
  let n = 0;
  let nt = 0;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    mid.x += v.x;
    mid.y += v.z;
    n++;
    if (v.y > floor + h * 0.8) (top.x += v.x), (top.y += v.z), nt++;
  }
  mid.divideScalar(Math.max(1, n));
  top.divideScalar(Math.max(1, nt));
  const ahead = top.clone().sub(mid);
  const turn = ahead.lengthSq() > 1e-6 ? Math.atan2(ahead.x, ahead.y) : 0;
  geo.applyMatrix4(new THREE.Matrix4().makeTranslation(-mid.x, -floor, -mid.y));
  geo.applyMatrix4(new THREE.Matrix4().makeRotationY(-turn));
  // THE LIMBS: what is under the belly, in four clumps seeded at its corners.
  const hipY = h * 0.42;
  const kneeY = h * 0.2;
  const low: THREE.Vector2[] = [];
  for (let i = 0; i < pos.count; i += 2) {
    v.fromBufferAttribute(pos, i);
    if (v.y < h * 0.3) low.push(new THREE.Vector2(v.x, v.z));
  }
  const lo = new THREE.Vector2(Infinity, Infinity);
  const hi = new THREE.Vector2(-Infinity, -Infinity);
  for (const p of low) (lo.min(p), hi.max(p));
  const legs = [new THREE.Vector2(hi.x, hi.y), new THREE.Vector2(lo.x, hi.y), new THREE.Vector2(hi.x, lo.y), new THREE.Vector2(lo.x, lo.y)]; // FL FR BL BR
  for (let round = 0; round < 8; round++) {
    const sum = legs.map(() => new THREE.Vector3());
    for (const p of low) {
      let best = 0;
      for (let k = 1; k < 4; k++) if (p.distanceToSquared(legs[k]) < p.distanceToSquared(legs[best])) best = k;
      sum[best].x += p.x;
      sum[best].y += p.y;
      sum[best].z++;
    }
    sum.forEach((s3, k) => s3.z > 0 && legs[k].set(s3.x / s3.z, s3.y / s3.z));
  }
  const root = new THREE.Bone();
  root.name = 'beast_body';
  root.position.set(0, hipY, 0);
  const bones: THREE.Bone[] = [root];
  ['FL', 'FR', 'BL', 'BR'].forEach((name, k) => {
    const hip = new THREE.Bone();
    hip.name = `beast_hip_${name}`;
    hip.position.set(legs[k].x, 0, legs[k].y);
    const knee = new THREE.Bone();
    knee.name = `beast_knee_${name}`;
    knee.position.set(0, kneeY - hipY, 0);
    hip.add(knee);
    root.add(hip);
    bones.push(hip, knee);
  });
  const index = new Uint16Array(pos.count * 4);
  const weight = new Float32Array(pos.count * 4);
  const smooth = (a: number, b: number, x: number) => THREE.MathUtils.smoothstep(x, Math.min(a, b), Math.max(a, b)) * (a > b ? -1 : 1) + (a > b ? 1 : 0);
  const p2 = new THREE.Vector2();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    p2.set(v.x, v.z);
    let leg = 0;
    for (let k = 1; k < 4; k++) if (p2.distanceToSquared(legs[k]) < p2.distanceToSquared(legs[leg])) leg = k;
    const onLeg = smooth(hipY + h * 0.06, hipY - h * 0.08, v.y);
    const onKnee = smooth(kneeY + h * 0.05, kneeY - h * 0.05, v.y);
    index.set([0, 1 + leg * 2, 2 + leg * 2, 0], i * 4);
    weight.set([1 - onLeg, onLeg * (1 - onKnee), onLeg * onKnee, 0], i * 4);
  }
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(index, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weight, 4));
  const skinned = new THREE.SkinnedMesh(geo, mesh.material);
  skinned.add(root);
  skinned.bind(new THREE.Skeleton(bones));
  const out = new THREE.Group();
  out.add(skinned);
  return out;
}

export function makeTemplate(def: BodyDef, model: Model, bank: Bank | null): Template {
  let scene = def.shape ? cloneSkinned(model.gltf.scene) : model.gltf.scene;
  if (def.shape) reshape(scene, def.shape);
  if (def.still === 'beast') scene = rigBeast(scene);
  const rigged = !def.still;
  const box = new THREE.Box3().setFromObject(scene);
  return {
    scene,
    skeleton: rigged ? skeletonOf(scene) : null,
    height: Math.max(0.1, box.max.y - Math.min(0, box.min.y)),
    clips: new Map(),
    bank: rigged ? bank : null,
  };
}

function probeOf(t: Template): Probe | null {
  if (t.probe !== undefined) return t.probe;
  const scene = cloneSkinned(t.scene);
  scene.updateMatrixWorld(true);
  const p = new THREE.Vector3();
  const feet = ['LeftFoot', 'RightFoot'].map((n) => scene.getObjectByName(n)).filter((o): o is THREE.Object3D => !!o);
  const hips = scene.getObjectByName('Hips');
  const bones: THREE.Object3D[] = [];
  scene.traverse((o) => ((o as THREE.Bone).isBone ? bones.push(o) : undefined));
  t.probe = feet.length === 2 && hips?.parent
    ? { scene, mixer: new THREE.AnimationMixer(scene), bones, feet, rest: Math.min(...feet.map((f) => f.getWorldPosition(p).y)), unit: hips.parent.getWorldScale(p).y }
    : null;
  return t.probe;
}

/** A clip played through on the probe: how far the lower foot rides off its rest height, the lowest
 *  bone, and the speed its planted foot slides back at — which is the speed the clip walks. */
function measure(pr: Probe, clip: THREE.AnimationClip, height: number): { low: number[]; lowest: number[]; depicts: number } {
  const action = pr.mixer.clipAction(clip);
  action.play();
  const p = new THREE.Vector3();
  const low: number[] = [];
  const lowest: number[] = [];
  const tracks = pr.feet.map(() => [] as { y: number; z: number }[]);
  for (let k = 0; k <= SAMPLES; k++) {
    pr.mixer.setTime((clip.duration * k) / SAMPLES);
    pr.scene.updateMatrixWorld(true);
    const ys = pr.feet.map((f, i) => {
      f.getWorldPosition(p);
      tracks[i].push({ y: p.y, z: p.z });
      return p.y;
    });
    low.push(Math.min(...ys) - pr.rest);
    lowest.push(Math.min(...pr.bones.map((b) => b.getWorldPosition(p).y)));
  }
  action.stop();
  pr.mixer.uncacheAction(clip);
  const planted = 0.03 * (height / 1.8);
  const slides: number[] = [];
  for (const tr of tracks) {
    const floor = Math.min(...tr.map((f) => f.y));
    for (let k = 0; k < SAMPLES; k++) {
      if (tr[k].y - floor < planted && tr[k + 1].y - floor < planted) slides.push(-(tr[k + 1].z - tr[k].z) / (clip.duration / SAMPLES));
    }
  }
  slides.sort((a, b) => a - b);
  return { low, lowest, depicts: slides.length ? Math.max(0, slides[slides.length >> 1]) : 0 };
}

/** `name` made to play on this body: retargeted, stood on its feet, its speed read. A fall lies ON the floor,
 *  never in it. `<clip>|upper` is its top half alone. */
export function clipOf(t: Template, name: string): THREE.AnimationClip | null {
  if (!name || !t.skeleton || !t.bank) return null;
  const had = t.clips.get(name);
  if (had) return had;
  if (name.endsWith(UPPER)) {
    const whole = clipOf(t, name.slice(0, -UPPER.length));
    if (!whole) return null;
    const upper = new THREE.AnimationClip(name, whole.duration, whole.tracks.filter((tr) => !LEGS.has(tr.name.split('.')[0])));
    upper.userData = { ...whole.userData };
    t.clips.set(name, upper);
    return upper;
  }
  const falls = /death/.test(name);
  const made = retarget(t.bank, name, t.skeleton, falls);
  if (!made) return null;
  const pr = probeOf(t);
  if (pr) {
    const m = measure(pr, made, t.height);
    const tail = m.lowest.slice(-Math.ceil(SAMPLES * 0.15)); // where a fall comes to rest
    const lift = falls ? Math.max(0, 0.02 * (t.height / 1.8) - Math.min(...tail)) : -Math.min(...m.low);
    const hips = made.tracks.find((tr) => tr.name === 'Hips.position');
    const dy = THREE.MathUtils.clamp(lift, -0.35 * (t.height / 1.8), 0.35 * (t.height / 1.8)) / pr.unit;
    if (hips) for (let i = 1; i < hips.values.length; i += 3) hips.values[i] += dy;
    made.userData.speed = m.depicts;
  }
  t.clips.set(name, made);
  return made;
}

const CORPSE = 5; // seconds a body lies before it sinks away
const SINK = 1.2;

/** What the renderer tells a figure each frame, all of it read off an Entity. */
export interface Pose {
  x: number;
  z: number;
  lift: number; // metres off the floor: a leap's arc, a hover
  facing: number; // the sim's radians
  moving: boolean;
  speed: number; // tiles a second, what the move clip's rate follows
  dead: boolean;
  hurt: boolean;
  held: boolean; // stunned: the pose stops where it is
  flash: number; // 0..1 of a hit's flash
  hidden: number; // 0 seen, 1 gone: a Vanish, or the hero sinking into the hole
}

export class Figure {
  /** A harness's: every figure writes what it is playing into its model's `userData.playing`. */
  static trace = false;
  readonly root = new THREE.Group();
  readonly look: ActorLook = actorLook();
  readonly model: THREE.Object3D;
  readonly height: number;
  readonly hands = new Map<string, THREE.Object3D>();
  private readonly mixer: THREE.AnimationMixer | null;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private readonly materials: THREE.Material[] = [];
  private base = '';
  private top: { action: THREE.AnimationAction; end: number; hold: boolean; clip: string; whole: boolean; weight: number } | null = null;
  private yaw = 0;
  private placed = false;
  private time = Math.random() * 10;
  private lunge = 0;
  deadFor = -1;
  gone = false;
  seenAt = 0; // when the sim last had this body, for the corpse to outlive it
  private readonly carried = new Map<'main' | 'off', { key: string; obj: THREE.Object3D }>();
  private readonly limbs = new Map<string, THREE.Object3D>(); // a beast's own bones, by `rigBeast`'s names
  private gait = 0;
  private moving = false;

  constructor(readonly def: BodyDef, readonly template: Template, s: Shared, rank: string, scale: number, monster: boolean) {
    this.model = def.still === 'glide' ? template.scene.clone(true) : cloneSkinned(template.scene);
    this.model.traverse((o) => {
      if (o.name.startsWith('beast_')) this.limbs.set(o.name.slice(6), o);
    });
    const grow = (def.height / template.height) * scale * (RANK_LOOK[rank]?.grow ?? 1);
    this.height = template.height * grow;
    this.model.scale.setScalar(grow);
    this.root.add(this.model);
    const r = RANK_LOOK[rank];
    this.look.uGlow.value = def.rim ?? 1;
    if (r) {
      const pool = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ map: poolTex(), color: r.glow, transparent: true, opacity: r.power, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
      );
      const span = THREE.MathUtils.clamp(this.height * 0.6, 1.2, 2.6);
      pool.scale.setScalar(span);
      pool.position.y = 0.03;
      this.root.add(pool);
      this.materials.push(pool.material);
    }
    this.model.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      if (mesh.isSkinnedMesh) {
        mesh.computeBoundingSphere(); // the bind pose's bounds, grown to cover any clip
        if (mesh.boundingSphere) mesh.boundingSphere.radius *= 2.2;
      }
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      patchActor(mat, s, this.look, monster);
      mesh.material = mat;
      this.materials.push(mat);
    });
    for (const name of ['RightHand', 'LeftHand']) {
      const hand = this.model.getObjectByName(name);
      if (hand) this.hands.set(name, hand);
    }
    this.mixer = def.still ? null : new THREE.AnimationMixer(this.model);
    this.loop(def.idle, 0);
    this.mixer?.update(Math.random() * 2);
  }

  private action(name: string): THREE.AnimationAction | null {
    if (!this.mixer || !name) return null;
    const had = this.actions.get(name);
    if (had) return had;
    const clip = clipOf(this.template, name);
    if (!clip) return null;
    const made = this.mixer.clipAction(clip);
    this.actions.set(name, made);
    return made;
  }

  private loop(name: string, fade: number): void {
    if (this.base === name) return;
    const next = this.action(name);
    if (!next) return;
    const was = this.actions.get(this.base);
    next.reset().setLoop(THREE.LoopRepeat, Infinity).setEffectiveWeight(1);
    // One gait into another keeps its place in the stride, or the feet swap mid-step.
    const gaits = this.def.move;
    if (was && gaits.includes(this.base) && gaits.includes(name)) next.time = (was.time / was.getClip().duration) * next.getClip().duration;
    next.play();
    if (was && fade > 0) next.crossFadeFrom(was, fade, false);
    else if (was) was.stop();
    this.base = name;
  }

  /** The gait nearest the speed asked, the one already playing kept until another is clearly nearer. */
  private gaitFor(speed: number): string {
    const gaits = this.def.move;
    const miss = (g: string): number => {
      const d = ((clipOf(this.template, g)?.userData.speed as number | undefined) ?? 0) * this.model.scale.x;
      return d > 0.05 ? Math.abs(Math.log(Math.max(0.05, speed) / d)) : Infinity;
    };
    let best = gaits.includes(this.base) ? this.base : '';
    let score = best ? miss(best) - 0.2 : Infinity;
    for (const g of gaits) {
      const m = miss(g);
      if (m < score) (best = g), (score = m);
    }
    return best || gaits[0] || this.def.idle;
  }

  /** A window of a clip over `seconds`, its impact `impactIn` from now when that is given. A swing on the move
   *  is its top half alone, so the legs keep walking under it; `whole` is the whole body whatever it was doing. */
  play(w: Window, seconds: number, o: { impactIn?: number; hold?: boolean; weight?: number; whole?: boolean } = {}): void {
    const { impactIn, hold = false, weight = TOP, whole = hold } = o;
    if (this.def.still) {
      this.lunge = hold ? 0 : 1;
      return;
    }
    const action = this.action(this.moving && !whole ? w.clip + UPPER : w.clip);
    if (!action) return;
    const dur = action.getClip().duration;
    let scale = ((w.end - w.start) * dur) / Math.max(0.05, seconds);
    if (impactIn !== undefined && impactIn > 0.02) scale = ((w.impact - w.start) * dur) / impactIn;
    if (this.top && this.top.action !== action) this.top.action.fadeOut(0.08);
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.time = w.start * dur;
    action.timeScale = THREE.MathUtils.clamp(scale, 0.2, 4);
    action.setEffectiveWeight(weight);
    action.fadeIn(hold ? 0.12 : 0.06).play();
    this.top = { action, end: w.end * dur, hold, clip: w.clip, whole, weight };
  }

  /** A swing begun standing that the body walks out of: its top half carries on at the same moment,
   *  and the legs go back to walking. */
  private halve(): void {
    const top = this.top;
    if (!top || top.whole || top.action.getClip().name.endsWith(UPPER)) return;
    const upper = this.action(top.clip + UPPER);
    if (!upper) return;
    upper.reset();
    upper.setLoop(THREE.LoopOnce, 1);
    upper.clampWhenFinished = true;
    upper.time = top.action.time;
    upper.timeScale = top.action.timeScale;
    upper.setEffectiveWeight(top.weight);
    upper.play();
    top.action.stop();
    this.top = { ...top, action: upper };
  }

  /** A hit's flinch, over whatever the body is doing. */
  flinch(seconds: number): void {
    this.play(this.def.hit, seconds, { weight: FLINCH });
  }

  get busy(): boolean {
    return this.top !== null;
  }

  /** What a hand holds: a model out of the gear shard, `key` its family, null empty.
   *  Scaled off the ARMATURE only, so a bigger body holds a bigger weapon. */
  carry(slot: 'main' | 'off', key: string | null, source: THREE.Object3D | null, grow = 1): void {
    const had = this.carried.get(slot);
    if ((had?.key ?? null) === (source ? key : null)) return;
    had?.obj.removeFromParent();
    this.carried.delete(slot);
    const hand = this.hands.get(slot === 'main' ? 'RightHand' : 'LeftHand');
    if (!key || !source || !hand) return;
    const obj = source.clone(true);
    this.model.updateMatrixWorld(true);
    const k = (this.model.getWorldScale(new THREE.Vector3()).x / hand.getWorldScale(new THREE.Vector3()).x) * grow;
    obj.scale.setScalar(k);
    obj.position.y = PALM * k;
    obj.rotation.copy(key === 'shield' ? GRIP_TURN.shield : GRIP_TURN[slot]);
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) m.castShadow = true;
    });
    hand.add(obj);
    this.carried.set(slot, { key, obj });
  }

  /** Stood in ONE frame of a clip, `at` of the way through, and held there. */
  hold(name: string, at: number): void {
    const action = this.action(name);
    if (!action || !this.mixer) return;
    this.mixer.stopAllAction();
    action.reset().play();
    action.paused = true;
    action.time = at * action.getClip().duration;
    this.base = '';
    this.top = null;
    this.mixer.update(0);
  }

  /** Where a thing leaves the body: whichever hand is further forward, or the chest. */
  castPoint(out: THREE.Vector3): THREE.Vector3 {
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    out.copy(this.root.position).add(new THREE.Vector3(0, this.height * 0.62, 0)).addScaledVector(fwd, 0.35);
    let best = -Infinity;
    const p = new THREE.Vector3();
    for (const hand of this.hands.values()) {
      hand.getWorldPosition(p);
      const ahead = p.clone().sub(this.root.position).dot(fwd);
      if (ahead > best) (best = ahead), out.copy(p);
    }
    return out;
  }

  place(p: Pose, dt: number): void {
    const want = Math.PI / 2 - p.facing;
    if (!this.placed) (this.yaw = want), (this.placed = true);
    this.root.position.set(p.x, p.lift, p.z);
    let d = want - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * (1 - Math.exp(-dt * 14));
    this.root.rotation.y = this.yaw;
  }

  step(p: Pose, dt: number): void {
    this.time += dt;
    if (p.flash > 0) this.look.uFlash.value = Math.max(this.look.uFlash.value, p.flash);
    this.look.uFlash.value = Math.max(0, this.look.uFlash.value - dt * 7);
    this.model.visible = p.hidden < 0.98;
    for (const m of this.materials) {
      m.transparent = p.hidden > 0.01;
      m.opacity = 1 - p.hidden;
    }
    if (this.def.still) return this.stepStill(p, dt);
    if (this.top) {
      const a = this.top.action;
      if (a.time >= this.top.end - 1e-3 || !a.isRunning()) {
        if (this.top.hold) a.paused = true;
        else {
          a.fadeOut(0.16);
          this.top = null;
        }
      }
    }
    this.moving = p.moving && this.def.move.length > 0;
    if (this.moving) this.halve();
    this.loop(this.moving ? this.gaitFor(p.speed) : this.def.idle, 0.14);
    const base = this.actions.get(this.base);
    if (base) {
      // AT THE SPEED IT IS CARRIED: the planted foot moves with the floor, never across it.
      const depicts = ((base.getClip().userData.speed as number | undefined) ?? 0) * this.model.scale.x;
      base.timeScale = this.moving && depicts > 0.05 ? THREE.MathUtils.clamp(p.speed / depicts, 0.4, 2.4) : 1;
    }
    this.mixer?.update(p.held ? 0 : dt);
    if (Figure.trace) this.model.userData.playing = `${this.base}${this.top ? ` + ${this.top.action.getClip().name}` : ''}${this.moving ? ' moving' : ''}`;
  }

  /** A body with no skeleton: a trot is a bob and a roll, a glide a slow sway. */
  private stepStill(p: Pose, dt: number): void {
    const t = this.time;
    this.lunge = Math.max(0, this.lunge - dt * 3.2);
    const push = Math.sin(this.lunge * Math.PI) * 0.35;
    if (this.def.still === 'glide') {
      this.model.position.y = Math.sin(t * 1.3) * 0.04;
      this.model.rotation.z = Math.sin(t * 0.9) * 0.03;
      return;
    }
    // A TROT: the diagonal pairs swing together, a knee folding as its foot comes forward.
    const stride = 0.55 * this.height; // metres a whole cycle carries it
    this.gait += p.moving ? (p.speed / Math.max(0.2, stride)) * Math.PI * 2 * dt : 0;
    const swing = p.moving ? 0.55 : 0;
    const PHASE: Record<string, number> = { FL: 0, BR: 0, FR: Math.PI, BL: Math.PI };
    for (const [leg, off] of Object.entries(PHASE)) {
      const hip = this.limbs.get(`hip_${leg}`);
      const knee = this.limbs.get(`knee_${leg}`);
      const a = this.gait + off;
      if (hip) hip.rotation.x = THREE.MathUtils.lerp(hip.rotation.x, Math.sin(a) * swing, 1 - Math.exp(-dt * 20));
      if (knee) knee.rotation.x = THREE.MathUtils.lerp(knee.rotation.x, -Math.max(0, Math.cos(a)) * swing * 1.1, 1 - Math.exp(-dt * 20));
    }
    const body = this.limbs.get('body');
    if (body) {
      body.userData.rest ??= body.position.y;
      const lift = p.moving ? Math.abs(Math.cos(this.gait)) * 0.04 : Math.sin(t * 1.9) * 0.012; // a share of its height
      body.position.y = (body.userData.rest as number) * (1 + lift);
      body.rotation.x = Math.sin(this.lunge * Math.PI) * 0.35; // the lunge puts its head down at you
    }
    this.model.position.set(0, 0, push);
  }

  /** A body down: its death plays once and holds; the corpse lies, then sinks. */
  die(dt: number): void {
    if (this.deadFor < 0) {
      this.deadFor = 0;
      this.moving = false;
      if (this.def.still) this.model.rotation.z = 0;
      else {
        this.actions.get(this.base)?.fadeOut(0.25); // the fall is the whole body's: nothing stands on under it
        this.base = '';
        this.play(this.def.death, 2, { hold: true });
      }
    }
    this.deadFor += dt;
    if (this.def.still) this.model.rotation.z = Math.min(Math.PI / 2, this.deadFor * 6);
    if (this.deadFor > CORPSE) {
      this.look.uDissolve.value = Math.min(1.05, (this.deadFor - CORPSE) / SINK);
      if (this.look.uDissolve.value >= 1.05) this.gone = true;
    }
    if (!this.def.still) this.mixer?.update(dt);
  }

  dispose(): void {
    this.mixer?.stopAllAction();
    this.root.removeFromParent();
    for (const m of this.materials) m.dispose();
  }
}
