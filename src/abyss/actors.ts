/**
 * THE BODIES: one skinned clone of a Meshy model for every entity the sim
 * holds, animated off the sim's own state and nothing else.
 *
 * AN ATTACK IS A WINDOW OF ITS CLIP, and its IMPACT frame is pinned to the
 * moment the sim lands the blow: a monster's swing starts with its wind-up and
 * is time-scaled so the hammer comes down when `winding` runs out, which is the
 * only tell the game gives and so the one thing the art may not get wrong. The
 * hero's cast is started just short of its thrust, because his bolt leaves the
 * tick he casts.
 *
 * Root motion is pinned to the ground plane — the sim owns x and y — except in a
 * death, where the fall is the point.
 */
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import type { Entity, RunState } from '../sim/run';
import type { Assets } from '../gl/assets';
import { actorLook, patchActor } from '../gl/shaders';
import type { ActorLook, Shared } from '../gl/shaders';

interface Window {
  clip: string;
  start: number; // fractions of the clip
  impact: number;
  end: number;
}

interface Body {
  model: string;
  glow: number;
  idle: string;
  ready?: string; // the idle when something is awake nearby
  move: string;
  stride: number; // metres a second the move clip depicts at speed 1
  attacks: Window[];
  hit: Window;
  death: Window;
  roar?: Window;
  rim: [number, number];
}

const BODIES: Record<string, Body> = {
  hero: {
    model: 'hero', glow: 1.6, idle: 'idle', ready: 'ready', move: 'run', stride: 5.4,
    attacks: [{ clip: 'cast', start: 0.3, impact: 0.37, end: 0.6 }, { clip: 'cast2', start: 0.32, impact: 0.4, end: 0.62 }],
    hit: { clip: 'hit', start: 0.02, impact: 0.1, end: 0.34 }, death: { clip: 'death', start: 0, impact: 0, end: 0.98 },
    rim: [0x8fb4ff, 0.26],
  },
  imp: {
    model: 'imp', glow: 0.55, idle: 'idle', move: 'run', stride: 4.3,
    attacks: [{ clip: 'attack', start: 0.08, impact: 0.42, end: 0.78 }],
    hit: { clip: 'hit', start: 0.02, impact: 0.04, end: 0.1 }, death: { clip: 'death', start: 0.02, impact: 0, end: 0.6 },
    roar: { clip: 'roar', start: 0.1, impact: 0.3, end: 0.75 }, rim: [0xff5a2a, 0.12],
  },
  chanter: {
    model: 'chanter', glow: 1.3, idle: 'idle', move: 'walk', stride: 1.6,
    attacks: [{ clip: 'cast', start: 0.18, impact: 0.52, end: 0.82 }],
    hit: { clip: 'hit', start: 0.02, impact: 0.04, end: 0.1 }, death: { clip: 'death', start: 0.02, impact: 0, end: 0.6 },
    rim: [0xff4a3a, 0.1],
  },
  hornfiend: {
    model: 'hornfiend', glow: 1.1, idle: 'idle', move: 'walk', stride: 1.3,
    attacks: [{ clip: 'attack', start: 0.2, impact: 0.82, end: 0.98 }],
    hit: { clip: 'hit', start: 0.02, impact: 0.12, end: 0.3 }, death: { clip: 'death', start: 0, impact: 0, end: 0.97 },
    roar: { clip: 'roar', start: 0.1, impact: 0.35, end: 0.8 }, rim: [0xff5020, 0.14],
  },
};

const RANK_LOOK: Record<string, { rim: number; power: number; grow: number }> = {
  magic: { rim: 0x4a7dff, power: 0.9, grow: 1.16 },
  rare: { rim: 0xffb02e, power: 1.1, grow: 1.32 },
  risen: { rim: 0xff3b1f, power: 1.2, grow: 1.4 },
};

const CORPSE = 4.5; // seconds a body lies before it burns away
const BURN = 1.4;

/** The clips of one model, root motion pinned. Done once a model, not once a body. */
function tidy(scene: THREE.Object3D, clips: THREE.AnimationClip[]): THREE.AnimationClip[] {
  scene.updateMatrixWorld(true);
  const hips = scene.getObjectByName('Hips');
  const up = new THREE.Vector3(0, 1, 0);
  if (hips?.parent) up.applyQuaternion(hips.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).normalize();
  return clips.map((clip) => {
    const out = clip.clone();
    if (clip.name === 'death') return out;
    for (const track of out.tracks) {
      if (!track.name.startsWith('Hips') || !track.name.endsWith('.position')) continue;
      const v = track.values;
      const first = new THREE.Vector3(v[0], v[1], v[2]);
      const at = new THREE.Vector3();
      for (let i = 0; i < v.length; i += 3) {
        at.set(v[i], v[i + 1], v[i + 2]).sub(first);
        at.projectOnVector(up).add(first);
        v[i] = at.x;
        v[i + 1] = at.y;
        v[i + 2] = at.z;
      }
    }
    return out;
  });
}

export class Actor {
  readonly root = new THREE.Group();
  readonly look: ActorLook = actorLook();
  readonly height: number;
  private readonly model: THREE.Object3D;
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private base = '';
  private top: { action: THREE.AnimationAction; end: number; hold: boolean } | null = null;
  private yaw = 0;
  private placed = false;
  private readonly last = new THREE.Vector3();
  speed = 0;
  deadFor = -1;
  gone = false;
  seenCasts = 0;
  wasWinding = false;
  wasAggro = false;
  hitWait = 0;
  attackAt = 0;
  readonly hands: THREE.Object3D[] = [];

  constructor(readonly body: Body, source: { scene: THREE.Object3D; clips: THREE.AnimationClip[] }, s: Shared, readonly entity: Entity, extra = 1) {
    this.model = cloneSkinned(source.scene);
    const grow = (entity.kind === 'hero' ? 1 : RANK_LOOK[entity.rank]?.grow ?? 1) * extra;
    this.height = new THREE.Box3().setFromObject(source.scene).getSize(new THREE.Vector3()).y * grow;
    this.model.scale.setScalar(grow);
    this.root.add(this.model);
    const rank = RANK_LOOK[entity.rank];
    this.look.uRim.value.set(rank && entity.kind !== 'hero' ? rank.rim : body.rim[0]);
    this.look.uRimPower.value = rank && entity.kind !== 'hero' ? rank.power : body.rim[1];
    this.look.uGlow.value = body.glow;
    this.model.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere(); // a skinned body's bounds are its bind pose, so they are grown to cover any clip
      if (mesh.boundingSphere) mesh.boundingSphere.radius *= 2.2;
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      patchActor(mat, s, this.look, entity.kind !== 'hero');
      mesh.material = mat;
    });
    for (const name of ['RightHand', 'LeftHand']) {
      const hand = this.model.getObjectByName(name);
      if (hand) this.hands.push(hand);
    }
    this.mixer = new THREE.AnimationMixer(this.model);
    for (const clip of source.clips) this.actions.set(clip.name, this.mixer.clipAction(clip));
    this.loop(body.idle, 0);
    this.mixer.update(Math.random() * 2);
  }

  private loop(name: string, fade: number): void {
    if (this.base === name) return;
    const next = this.actions.get(name);
    if (!next) return;
    const was = this.actions.get(this.base);
    next.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    if (was && fade > 0) next.crossFadeFrom(was, fade, false);
    else if (was) was.stop();
    this.base = name;
  }

  /** A window of a clip, over `seconds`, its impact at `impactIn` from now when that is given. */
  play(w: Window, seconds: number, impactIn?: number, hold = false): void {
    const action = this.actions.get(w.clip);
    if (!action) return;
    const dur = action.getClip().duration;
    let scale = ((w.end - w.start) * dur) / Math.max(0.05, seconds);
    if (impactIn !== undefined && impactIn > 0.02) scale = ((w.impact - w.start) * dur) / impactIn;
    if (this.top && this.top.action !== action) this.top.action.fadeOut(0.08);
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.clampWhenFinished = true;
    action.time = w.start * dur;
    action.timeScale = Math.max(0.2, scale);
    action.setEffectiveWeight(1);
    action.fadeIn(hold ? 0.12 : 0.06).play();
    this.top = { action, end: w.end * dur, hold };
  }

  get busy(): boolean {
    return this.top !== null;
  }

  /** Where a bolt leaves: whichever hand is further forward. */
  castPoint(out: THREE.Vector3): THREE.Vector3 {
    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    let best = -Infinity;
    const p = new THREE.Vector3();
    out.copy(this.root.position).add(new THREE.Vector3(0, this.height * 0.62, 0)).addScaledVector(fwd, 0.35);
    for (const hand of this.hands) {
      hand.getWorldPosition(p);
      const ahead = p.clone().sub(this.root.position).dot(fwd);
      if (ahead > best) (best = ahead), out.copy(p);
    }
    return out;
  }

  chest(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.root.position).add(new THREE.Vector3(0, this.height * (this.deadFor >= 0 ? 0.2 : 0.6), 0));
  }

  /** Placed from the sim's position blended across the tick, turned toward its facing. */
  place(x: number, z: number, facing: number, dt: number): void {
    const target = new THREE.Vector3(x, 0, z);
    if (!this.placed) {
      this.root.position.copy(target);
      this.last.copy(target);
      this.yaw = Math.PI / 2 - facing;
      this.placed = true;
    }
    this.root.position.copy(target);
    const moved = this.last.distanceTo(target);
    this.speed = THREE.MathUtils.lerp(this.speed, dt > 0 ? moved / dt : 0, 1 - Math.exp(-dt * 10));
    this.last.copy(target);
    const want = Math.PI / 2 - facing;
    let d = want - this.yaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.yaw += d * (1 - Math.exp(-dt * 16));
    this.root.rotation.y = this.yaw;
  }

  step(dt: number, moving: boolean, ready: boolean): void {
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
    const want = moving ? this.body.move : ready && this.body.ready ? this.body.ready : this.body.idle;
    this.loop(want, 0.18);
    const base = this.actions.get(this.base);
    if (base && moving) base.timeScale = THREE.MathUtils.clamp(this.speed / this.body.stride, 0.55, 1.8);
    else if (base) base.timeScale = 1;
    this.mixer.update(dt);
    this.look.uFlash.value = Math.max(0, this.look.uFlash.value - dt * 7);
    if (this.hitWait > 0) this.hitWait -= dt;
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.root.removeFromParent();
    this.model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) (mesh.material as THREE.Material).dispose();
    });
  }

  /** The pose as it stands, frozen into a copy for an after-image to fade away. */
  ghost(material: THREE.Material): THREE.Object3D {
    const copy = cloneSkinned(this.model);
    copy.traverse((o) => {
      const mesh = o as THREE.SkinnedMesh;
      if (mesh.isMesh) (mesh.material = material), (mesh.frustumCulled = false), (mesh.castShadow = false);
    });
    const bones = new Map<string, THREE.Object3D>();
    this.model.traverse((o) => bones.set(o.name, o));
    copy.traverse((o) => {
      const from = bones.get(o.name);
      if (from && o !== copy) {
        o.position.copy(from.position);
        o.quaternion.copy(from.quaternion);
        o.scale.copy(from.scale);
      }
    });
    copy.position.copy(this.root.position);
    copy.rotation.y = this.yaw;
    copy.scale.copy(this.model.scale);
    return copy;
  }
}

export interface CastEvents {
  swung: (a: Actor) => void; // a monster's blow, the moment it lands
  cast: (a: Actor) => void; // the hero's cast, the tick it happens
  died: (a: Actor) => void;
  burnt: (a: Actor) => void; // a corpse beginning to burn away
}

export class Cast {
  readonly group = new THREE.Group();
  readonly actors = new Map<number, Actor>();
  private readonly sources = new Map<string, { scene: THREE.Object3D; clips: THREE.AnimationClip[] }>();

  constructor(assets: Assets, private readonly s: Shared, private readonly on: CastEvents) {
    for (const [id, body] of Object.entries(BODIES)) {
      const model = assets.models[body.model];
      if (!model) continue;
      this.sources.set(id, { scene: model.gltf.scene, clips: tidy(model.gltf.scene, model.gltf.animations) });
    }
  }

  private bodyOf(e: Entity): string {
    return e.kind === 'hero' ? 'hero' : e.defId && BODIES[e.defId] ? e.defId : 'imp';
  }

  of(id: number): Actor | undefined {
    return this.actors.get(id);
  }

  /** Every entity drawn where the sim has it, `alpha` of the way through the tick from `was`. */
  sync(state: RunState, was: Map<number, { x: number; y: number }>, alpha: number, dt: number, herald: Entity | null): void {
    const live = [state.hero, ...state.monsters];
    const awake = state.monsters.some((m) => !m.dead && m.aggroed && Math.hypot(m.x - state.hero.x, m.y - state.hero.y) < 12);
    for (const e of live) {
      let a = this.actors.get(e.id);
      if (!a) {
        const kind = this.bodyOf(e);
        const src = this.sources.get(kind);
        if (!src) continue;
        a = new Actor(BODIES[kind], src, this.s, e, e === herald ? 1.3 : 1);
        this.actors.set(e.id, a);
        this.group.add(a.root);
      }
      if (a.gone) continue;
      const from = was.get(e.id) ?? e;
      a.place(from.x + (e.x - from.x) * alpha, from.y + (e.y - from.y) * alpha, e.facing, dt);
      this.drive(a, e, state, dt);
      a.step(dt, !e.dead && e.action === 'move', awake);
    }
  }

  private drive(a: Actor, e: Entity, state: RunState, dt: number): void {
    const b = a.body;
    if (e.dead) {
      if (a.deadFor < 0) {
        a.deadFor = 0;
        a.play(b.death, e.kind === 'hero' ? 2.2 : 1.6, undefined, true);
        this.on.died(a);
      }
      a.deadFor += dt;
      if (e.kind !== 'hero' && a.deadFor > CORPSE) {
        if (a.look.uDissolve.value === 0) this.on.burnt(a);
        a.look.uDissolve.value = Math.min(1.05, (a.deadFor - CORPSE) / BURN);
        if (a.look.uDissolve.value >= 1.05) (a.gone = true), a.root.removeFromParent();
      }
      return;
    }
    if (e.hitFlash > 0.12) a.look.uFlash.value = Math.max(a.look.uFlash.value, 0.9);
    if (e.kind === 'hero') {
      if (state.casts !== a.seenCasts) {
        a.seenCasts = state.casts;
        const w = b.attacks[state.casts % b.attacks.length];
        a.play(w, 0.46);
        this.on.cast(a);
      }
    } else {
      const winding = e.winding !== undefined;
      if (winding && !a.wasWinding) {
        const w = b.attacks[Math.floor(Math.random() * b.attacks.length)];
        a.play(w, 0, e.winding);
        a.attackAt = e.winding ?? 0;
      }
      if (!winding && a.wasWinding) this.on.swung(a);
      a.wasWinding = winding;
      if (e.aggroed && !a.wasAggro && b.roar && e.action !== 'move') a.play(b.roar, 1.4);
      a.wasAggro = e.aggroed;
    }
    if (e.action === 'hurt' && !a.busy && a.hitWait <= 0) {
      a.play(b.hit, 0.28);
      a.hitWait = 0.5;
    }
  }

  dispose(): void {
    for (const a of this.actors.values()) a.dispose();
    this.actors.clear();
  }
}
