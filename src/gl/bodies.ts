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
  move: string;
  attack: Window[];
  cast?: Window[];
  hit: Window;
  death: Window;
  roar?: Window;
  shape?: Shape;
  /** No skeleton: moved whole. A beast trots on its own bob, a person glides. */
  still?: 'beast' | 'glide';
  rim?: number; // a glow the body's own paint carries, 1 as painted
}

const W = (clip: string, start: number, impact: number, end: number): Window => ({ clip, start, impact, end });

const HERO: Omit<BodyDef, 'model' | 'move'> = {
  shard: 'heroes', height: 1.8, idle: 'hero/idle', ready: 'hero/ready',
  attack: [W('imp/attack', 0.2, 0.42, 0.78)],
  cast: [W('hero/cast', 0.3, 0.37, 0.6), W('hero/cast2', 0.32, 0.4, 0.62)],
  hit: W('hero/hit', 0.02, 0.1, 0.34), death: W('hero/death', 0, 0, 0.98),
};

/** By body id. A hero's is the TRADE's sprite; a monster's is `MONSTERS`' own id. */
export const BODIES: Record<string, BodyDef> = {
  aethermancer: { ...HERO, model: 'aethermancer', move: 'aethermancer/run' },
  alchemist: { ...HERO, model: 'alchemist', move: 'alchemist/run' },
  obreth: { ...HERO, model: 'obreth', move: 'obreth/run', height: 1.85 },
  mahthar: { ...HERO, model: 'mahthar', move: 'mahthar/run', height: 1.9 },
  husk: {
    model: 'husk', shard: 'shallows', height: 1.75, idle: 'hornfiend/idle', move: 'husk/walk',
    attack: [W('imp/attack', 0.08, 0.42, 0.78)],
    hit: W('hero/hit', 0.02, 0.1, 0.3), death: W('imp/death', 0.02, 0, 0.6),
  },
  gaunt: {
    model: 'husk', shard: 'shallows', height: 2.9, idle: 'hornfiend/idle', move: 'bank/shamble',
    attack: [W('imp/attack', 0.08, 0.42, 0.78)],
    hit: W('hero/hit', 0.02, 0.1, 0.3), death: W('hornfiend/death', 0, 0, 0.97), roar: W('imp/roar', 0.1, 0.3, 0.75),
    shape: { lengths: { LeftUpLeg: 1.45, LeftLeg: 1.45, RightUpLeg: 1.45, RightLeg: 1.45, LeftArm: 1.7, LeftForeArm: 1.7, RightArm: 1.7, RightForeArm: 1.7, neck: 1.8 }, head: 0.72 },
  },
  heap: {
    model: 'heap', shard: 'shallows', height: 2.4, idle: 'hornfiend/idle', move: 'hornfiend/walk',
    attack: [W('hornfiend/attack', 0.2, 0.82, 0.98)],
    hit: W('hero/hit', 0.02, 0.12, 0.3), death: W('hornfiend/death', 0, 0, 0.97), roar: W('hornfiend/roar', 0.1, 0.35, 0.8),
  },
  bonecaller: {
    model: 'bonecaller', shard: 'shallows', height: 1.95, idle: 'chanter/idle', move: 'chanter/walk',
    attack: [W('chanter/cast', 0.18, 0.52, 0.82)], cast: [W('chanter/cast', 0.18, 0.52, 0.82)],
    hit: W('chanter/hit', 0.02, 0.06, 0.2), death: W('chanter/death', 0.02, 0, 0.6),
  },
  answering: {
    model: 'answering', shard: 'shallows', height: 4.0, idle: 'hornfiend/idle', move: 'answering/walk',
    attack: [W('hornfiend/attack', 0.2, 0.82, 0.98), W('bank/slam', 0.1, 0.55, 0.9)],
    hit: W('hero/hit', 0.02, 0.12, 0.3), death: W('hornfiend/death', 0, 0, 0.97), roar: W('imp/roar', 0.1, 0.3, 0.75),
  },
  crawler: {
    model: 'crawler', shard: 'shallows', height: 1.0, idle: '', move: '', still: 'beast',
    attack: [W('', 0, 0.5, 1)], hit: W('', 0, 0.2, 1), death: W('', 0, 0, 1),
  },
  hound: {
    model: 'hound', shard: 'shallows', height: 1.1, idle: '', move: '', still: 'beast',
    attack: [W('', 0, 0.5, 1)], hit: W('', 0, 0.2, 1), death: W('', 0, 0, 1),
  },
  lampwright: {
    model: 'lampwright', shard: 'folk', height: 1.85, idle: '', move: '', still: 'glide',
    attack: [W('', 0, 0.5, 1)], hit: W('', 0, 0.2, 1), death: W('', 0, 0, 1),
  },
  smith: {
    model: 'smith', shard: 'folk', height: 1.9, idle: 'chanter/idle', move: 'smith/walk',
    attack: [W('hornfiend/attack', 0.2, 0.82, 0.98)], hit: W('hero/hit', 0.02, 0.1, 0.3), death: W('hero/death', 0, 0, 0.98),
  },
  hob: {
    model: 'hob', shard: 'folk', height: 1.35, idle: 'chanter/idle', move: 'hob/walk',
    attack: [W('bank/stoop', 0, 0.5, 1)], hit: W('hero/hit', 0.02, 0.1, 0.3), death: W('hero/death', 0, 0, 0.98),
  },
  nell: {
    model: 'nell', shard: 'folk', height: 1.7, idle: 'chanter/idle', move: 'nell/walk',
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
const RANK_LOOK: Record<string, { glow: number; power: number; grow: number }> = {
  magic: { glow: 0x4a7dff, power: 0.55, grow: 1.1 },
  rare: { glow: 0xffb02e, power: 0.7, grow: 1.2 },
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
}

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

export function makeTemplate(def: BodyDef, model: Model, bank: Bank | null): Template {
  const scene = def.shape ? cloneSkinned(model.gltf.scene) : model.gltf.scene;
  if (def.shape) reshape(scene, def.shape);
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

function clipOf(t: Template, name: string): THREE.AnimationClip | null {
  if (!name || !t.skeleton || !t.bank) return null;
  const had = t.clips.get(name);
  if (had) return had;
  const made = retarget(t.bank, name, t.skeleton, /death|leap/.test(name));
  if (made) t.clips.set(name, made);
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
  readonly root = new THREE.Group();
  readonly look: ActorLook = actorLook();
  readonly model: THREE.Object3D;
  readonly height: number;
  readonly hands = new Map<string, THREE.Object3D>();
  private readonly mixer: THREE.AnimationMixer | null;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private readonly materials: THREE.Material[] = [];
  private base = '';
  private top: { action: THREE.AnimationAction; end: number; hold: boolean } | null = null;
  private yaw = 0;
  private placed = false;
  private time = Math.random() * 10;
  private lunge = 0;
  deadFor = -1;
  gone = false;
  seenAt = 0; // when the sim last had this body, for the corpse to outlive it

  constructor(readonly def: BodyDef, readonly template: Template, s: Shared, rank: string, scale: number, monster: boolean) {
    this.model = def.still ? template.scene.clone(true) : cloneSkinned(template.scene);
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
      const span = Math.max(1.2, this.height * 0.75);
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
    next.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    if (was && fade > 0) next.crossFadeFrom(was, fade, false);
    else if (was) was.stop();
    this.base = name;
  }

  /** A window of a clip over `seconds`, its impact `impactIn` from now when that is given. */
  play(w: Window, seconds: number, impactIn?: number, hold = false): void {
    if (this.def.still) {
      this.lunge = hold ? 0 : 1;
      return;
    }
    const action = this.action(w.clip);
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
    action.setEffectiveWeight(1);
    action.fadeIn(hold ? 0.12 : 0.06).play();
    this.top = { action, end: w.end * dur, hold };
  }

  get busy(): boolean {
    return this.top !== null;
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
    const idle = this.def.idle;
    this.loop(p.moving ? this.def.move : idle, 0.18);
    const base = this.actions.get(this.base);
    if (base) {
      const depicts = (base.getClip().userData.speed as number) * this.model.scale.x;
      base.timeScale = p.moving && depicts > 0.2 ? THREE.MathUtils.clamp(p.speed / depicts, 0.5, 2.2) : 1;
    }
    this.mixer?.update(p.held ? 0 : dt);
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
    const pace = p.moving ? Math.max(1, p.speed) * 5.5 : 1.2;
    const bob = p.moving ? Math.abs(Math.sin(t * pace)) * 0.06 : Math.sin(t * pace) * 0.012;
    this.model.position.set(0, bob, push);
    this.model.rotation.x = p.moving ? Math.sin(t * pace * 2) * 0.05 : 0;
    this.model.rotation.z = p.moving ? Math.sin(t * pace) * 0.04 : 0;
  }

  /** A body down: its death plays once and holds; the corpse lies, then sinks. */
  die(dt: number): void {
    if (this.deadFor < 0) {
      this.deadFor = 0;
      if (this.def.still) this.model.rotation.z = 0;
      else this.play(this.def.death, 1.6, undefined, true);
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
