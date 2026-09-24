/**
 * THE EFFECTS DIRECTOR: every `Vfx` the sim emits is read ONCE, the tick it
 * comes due, and turned into light — bolts, sparks, flashes, rings, scorches,
 * projectiles in flight — plus what the level does on its own: the lava's
 * embers, the braziers' smoke, the windows' shafts, the Herald's eruption.
 *
 * The sim says WHAT happened and between which points; which HAND a bolt
 * leaves, which CHEST it lands in, is read off the bodies here, so Arc
 * Lightning's chain runs hand to chest to chest exactly as the sim chained it.
 */
import * as THREE from 'three';
import type { RunState, Vfx } from '../sim/run';
import type { Actor, Cast } from './actors';
import type { Lamps } from '../gl/lights';
import { HELLFIRE, Lightning, SPARKLE, STORM } from '../gl/lightning';
import type { BoltStyle } from '../gl/lightning';
import type { Particles } from '../gl/particles';
import type { Shared } from '../gl/shaders';
import type { Stage } from '../gl/stage';
import type { World } from './world';

const TYPE_TINT: Record<string, number> = { lightning: 0x9cc8ff, fire: 0xff7a2a, cold: 0xa8e4ff, physical: 0xb3261e, occult: 0xb05cff };
const BLINK_CORE = new THREE.Color(0.85, 0.7, 1.0);
const BLINK_HALO = new THREE.Color(0.6, 0.25, 1.0);
const GROUND: BoltStyle = { core: new THREE.Color(0.75, 0.88, 1.0), halo: new THREE.Color(0.22, 0.42, 1.0), width: 0.07, rough: 0.6, branches: 1 };
const WAKE: BoltStyle = { core: new THREE.Color(0.95, 0.85, 1.0), halo: new THREE.Color(0.55, 0.2, 1.0), width: 0.7, rough: 0.06, branches: 0 };

/** Dark in the middle, white at the rim: a MULTIPLY decal, so its darkness is its colour and no alpha is asked of it. */
function burnt(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.fillRect(0, 0, 128, 128);
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 62);
  grad.addColorStop(0, '#2a2622');
  grad.addColorStop(0.45, '#6a625a');
  grad.addColorStop(1, '#ffffff');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(64, 64, 62, 0, Math.PI * 2);
  g.fill();
  return new THREE.CanvasTexture(c);
}

function radial(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface Timed {
  obj: THREE.Object3D;
  mat: THREE.Material & { opacity: number };
  life: number;
  left: number;
  grow: number; // metres added across the life
  size: number;
  hdr: THREE.Color;
  age?: (k: number) => void; // a decal that fades its own way, where the rest fade their colour
}

interface Missile {
  v: Vfx;
  sprite: THREE.Sprite;
  kind: 'fire' | 'frost';
  landed: boolean;
}

export class Director {
  readonly group = new THREE.Group();
  readonly bolts = new Lightning();
  private readonly seen = new WeakSet<Vfx>();
  private readonly glow = radial();
  private readonly scorchMap = burnt();
  private readonly timed: Timed[] = [];
  private readonly missiles: Missile[] = [];
  private readonly ghosts: { obj: THREE.Object3D; mat: THREE.MeshBasicMaterial; left: number; life: number }[] = [];
  private readonly crackles: { actor: Actor; left: number; next: number }[] = [];
  private readonly materials: { dissolve: { actor: Actor; left: number; life: number }[] } = { dissolve: [] };
  private emberDebt = 0;
  private shafts: THREE.Mesh[] = [];
  private circleGlow = 0.8;

  constructor(
    private readonly stage: Stage,
    private readonly lamps: Lamps,
    private readonly motes: Particles,
    private readonly cast: Cast,
    private readonly s: Shared,
    private readonly world: World
  ) {
    this.group.add(this.bolts.mesh);
    for (const w of world.windows) this.shafts.push(this.shaft(w));
    this.group.add(...this.shafts);
  }

  /** A shaft of stained light from a window down into the room toward the camera. */
  private shaft(w: World['windows'][number]): THREE.Mesh {
    const len = 9;
    const geo = new THREE.CylinderGeometry(w.width * 0.42, w.width * 1.25, len, 24, 1, true);
    geo.translate(0, -len / 2, 0);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTime: this.s.uTime },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `varying vec2 vUv; varying vec3 vN; varying vec3 vView; varying float vY;
        void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vY = w.y; vN = normalize(mat3(modelMatrix) * normal); vView = normalize(cameraPosition - w.xyz);
          gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `uniform float uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vView; varying float vY;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
        void main(){
          float along = vUv.y;
          float edge = pow(abs(dot(vN, vView)), 1.6);
          float dust = 0.6 + 0.4 * n(vec2(vUv.x * 18.0, along * 6.0 - uTime * 0.12));
          float a = edge * smoothstep(0.0, 0.35, along) * smoothstep(1.0, 0.75, along) * dust * smoothstep(0.1, 2.2, vY);
          gl_FragColor = vec4(vec3(1.0, 0.22, 0.12) * a * 0.22, 1.0);
        }`,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(w.at);
    mesh.rotation.x = -0.9;
    mesh.renderOrder = 4;
    return mesh;
  }

  private sprite(at: THREE.Vector3, color: THREE.Color, size: number, life: number, grow = 0): void {
    const mat = new THREE.SpriteMaterial({ map: this.glow, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
    const obj = new THREE.Sprite(mat);
    obj.position.copy(at);
    obj.scale.setScalar(size);
    obj.renderOrder = 8;
    this.group.add(obj);
    this.timed.push({ obj, mat, life, left: life, grow, size, hdr: color.clone() });
  }

  /** A shockwave along the floor: a soft band running out from `from` to `to` metres, torn by noise so it is never a drawn hoop. */
  private ring(at: THREE.Vector3, color: THREE.Color, from: number, to: number, life: number, width = 0.18, fill = 0.35): void {
    const k = { value: 0 };
    const big = Math.max(from, to);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uK: k, uColor: { value: color.clone() }, uFrom: { value: from / big }, uTo: { value: to / big }, uWidth: { value: width }, uFill: { value: fill }, uSeed: { value: Math.random() * 40 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `varying vec2 vP; void main(){ vP = position.xz * 2.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `uniform float uK, uFrom, uTo, uWidth, uFill, uSeed; uniform vec3 uColor; varying vec2 vP;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
        void main(){
          float d = length(vP);
          if (d > 1.0) discard;
          float front = mix(uFrom, uTo, 1.0 - (1.0 - uK) * (1.0 - uK));
          float w = max(0.03, uWidth * front);
          float band = exp(-pow((d - front) / w, 2.0) * 2.5) * step(d, front + w);
          band += exp(-max(0.0, front - d) / (w * 2.5)) * uFill * step(d, front);
          vec2 dir = vP / max(d, 1e-4);
          float torn = n(dir * 2.6 + uSeed + d * 3.0 - uK * 2.0) * 0.65 + n(dir * 7.0 - uSeed + d * 9.0) * 0.35;
          band *= smoothstep(0.25, 0.75, torn);
          gl_FragColor = vec4(uColor * band * pow(1.0 - uK, 1.5), 1.0);
        }`,
    }) as unknown as THREE.Material & { opacity: number };
    const obj = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat);
    obj.position.copy(at).setY(0.05);
    obj.scale.setScalar(big * 2);
    obj.renderOrder = 3;
    this.group.add(obj);
    this.timed.push({ obj, mat, life, left: life, grow: 0, size: big * 2, hdr: color.clone(), age: (kk) => (k.value = kk) });
  }

  /** A burn on the floor where a strike landed: the stone darkened, and a glint of the strike's colour dying in it. */
  private scorch(at: THREE.Vector3, tint: number): void {
    const strength = { value: 1 };
    const burn = new THREE.ShaderMaterial({
      uniforms: { map: { value: this.scorchMap }, uStrength: strength },
      transparent: true,
      depthWrite: false,
      blending: THREE.MultiplyBlending,
      premultipliedAlpha: true,
      vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `uniform sampler2D map; uniform float uStrength; varying vec2 vUv;
        void main(){ gl_FragColor = vec4(mix(vec3(1.0), texture2D(map, vUv).rgb, uStrength), 1.0); }`,
    }) as unknown as THREE.Material & { opacity: number };
    const mark = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), burn);
    mark.position.copy(at).setY(0.025);
    mark.scale.setScalar(0.9);
    mark.rotation.y = Math.random() * Math.PI;
    this.group.add(mark);
    this.timed.push({ obj: mark, mat: burn, life: 2.4, left: 2.4, grow: 0.1, size: 0.9, hdr: new THREE.Color(1, 1, 1), age: (k) => (strength.value = 0.8 * (1 - k)) });
    const c = new THREE.Color(tint).multiplyScalar(0.5);
    const glint = new THREE.MeshBasicMaterial({ map: this.glow, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
    const hot = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), glint);
    hot.position.copy(at).setY(0.03);
    this.group.add(hot);
    this.timed.push({ obj: hot, mat: glint, life: 0.5, left: 0.5, grow: 0.2, size: 0.5, hdr: c });
  }

  /** The body a point belongs to: the sim's own positions are where bodies stood when it fired. */
  private bodyAt(state: RunState, p: { x: number; y: number }): Actor | undefined {
    let best: Actor | undefined;
    let far = 1.2;
    for (const e of [state.hero, ...state.monsters]) {
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if (d < far) (far = d), (best = this.cast.of(e.id));
    }
    return best;
  }

  private arc(state: RunState, v: Vfx): void {
    const [p0, p1] = v.points;
    const heroCast = v.cast === state.hero.id;
    const style = heroCast ? STORM : HELLFIRE;
    const sky = p0.x === p1.x && Math.abs(p1.y - p0.y - 2) < 1e-6;
    const target = this.bodyAt(state, p1);
    const origin = sky ? undefined : this.bodyAt(state, p0);
    const toGround = new THREE.Vector3(p1.x, 1.0, p1.y);
    const to = () => (target && !target.gone ? target.chest(new THREE.Vector3()) : toGround);
    const fromFixed = new THREE.Vector3(p0.x, sky ? 8 : 1.2, p0.y);
    const from = sky
      ? () => fromFixed
      : origin?.entity.kind === 'hero'
        ? () => origin.castPoint(new THREE.Vector3())
        : () => (origin && !origin.gone ? origin.chest(new THREE.Vector3()) : fromFixed);
    this.bolts.strike(from, to, style, sky ? 0.32 : 0.28, 1);
    const hit = to().clone();
    const halo = style.halo.clone();
    this.motes.emit({ at: hit, count: 26, speed: [2.5, 7], life: [0.15, 0.45], size: [0.02, 0.05], color: [0xffffff, halo], gravity: 9, drag: 2.5, streak: 0.045 });
    this.motes.emit({ at: hit, count: 8, spread: 0.2, speed: [0.3, 1.2], life: [0.3, 0.7], size: [0.05, 0.1], color: halo.clone().multiplyScalar(0.6), drag: 3, rise: 0.8 });
    this.sprite(hit, halo.clone().multiplyScalar(1.4), 0.9, 0.12, 0.35);
    this.lamps.flash(hit.clone().setY(hit.y + 1.2), heroCast ? 0x8ab8ff : 0xff3a4a, 18, 6, 0.18);
    this.scorch(new THREE.Vector3(hit.x, 0, hit.z), heroCast ? 0x6fa0ff : 0xff3040);
    if (target && target.entity.kind !== 'hero') this.crackles.push({ actor: target, left: 0.45, next: 0 });
    if (heroCast) this.stage.shake(0.06);
  }

  private blink(state: RunState, v: Vfx): void {
    const [was, landing] = v.points;
    const hero = this.cast.of(state.hero.id);
    const a = new THREE.Vector3(was.x, 0, was.y);
    const b = new THREE.Vector3(landing.x, 0, landing.y);
    const chestA = a.clone().setY(1.1);
    const chestB = b.clone().setY(1.1);
    if (hero) {
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.32, 0.18, 0.9), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.6 });
      const ghost = hero.ghost(mat);
      ghost.position.copy(a);
      this.group.add(ghost);
      this.ghosts.push({ obj: ghost, mat, left: 0.6, life: 0.6 });
      hero.look.uEdge.value.setRGB(0.7, 0.35, 1.6);
      this.materials.dissolve.push({ actor: hero, left: 0.32, life: 0.32 });
    }
    this.bolts.strike(() => chestA, () => chestB, { ...WAKE, core: BLINK_CORE, halo: BLINK_HALO }, 0.22, 0.6);
    this.bolts.strike(() => chestA, () => chestB, { ...STORM, halo: BLINK_HALO, width: 0.2, branches: 1 }, 0.2, 0.7);
    const dir = b.clone().sub(a);
    const steps = Math.max(4, Math.round(dir.length() * 5));
    for (let i = 0; i <= steps; i++) {
      const p = a.clone().lerp(b, i / steps).setY(0.4 + Math.random() * 1.2);
      this.motes.emit({ at: p, count: 3, spread: 0.18, speed: [0.2, 0.9], life: [0.35, 0.8], size: [0.05, 0.12], color: [0xb38cff, 0x6ad8ff], drag: 2, rise: 0.6 });
    }
    this.motes.emit({ at: chestA, count: 60, spread: 0.3, speed: [1, 3.2], dir: new THREE.Vector3(0, 1, 0), cone: 0.8, life: [0.4, 1], size: [0.05, 0.13], color: [0x9a6bff, 0x62c8ff], drag: 2.2, swirl: 5, rise: 1.2 });
    this.motes.emit({ at: chestB, count: 40, spread: 0.1, speed: [2, 5], life: [0.15, 0.4], size: [0.02, 0.05], color: [0xffffff, 0xb08cff], drag: 3, streak: 0.04 });
    this.ring(a, new THREE.Color(0.5, 0.28, 1.3), 0.2, 1.3, 0.45);
    this.ring(b, new THREE.Color(0.5, 0.32, 1.4), 1.0, 0.2, 0.25, 0.3);
    this.sprite(chestB, new THREE.Color(0.7, 0.5, 1.6), 1.3, 0.18, -0.6);
    this.lamps.flash(chestB.clone().setY(2.4), 0xa27bff, 20, 7, 0.28);
    this.stage.shake(0.05);
  }

  private impact(state: RunState, v: Vfx): void {
    const p = v.points[0];
    const onHero = Math.hypot(p.x - state.hero.x, p.y - state.hero.y) < 0.4;
    const body = this.bodyAt(state, p);
    const at = body ? body.chest(new THREE.Vector3()) : new THREE.Vector3(p.x, 1, p.y);
    const tint = new THREE.Color(TYPE_TINT[v.damageType] ?? 0xffffff);
    if (v.damageType === 'physical') {
      this.motes.emit({ at, count: onHero ? 16 : 9, spread: 0.12, speed: [1, 3.4], life: [0.3, 0.7], size: [0.03, 0.07], color: [0x5c0606, 0x9a1010], gravity: 11, drag: 1.2, normal: false });
    } else if (v.damageType !== 'lightning') {
      this.motes.emit({ at, count: 8, spread: 0.15, speed: [0.6, 2.2], life: [0.25, 0.6], size: [0.04, 0.09], color: tint.clone().multiplyScalar(2), drag: 2, rise: 1 });
    }
    if (onHero) {
      this.stage.hurt = Math.min(0.85, this.stage.hurt + 0.28);
      this.stage.shake(0.12);
    }
  }

  private launch(v: Vfx): void {
    const fire = v.kind === 'shard';
    const mat = new THREE.SpriteMaterial({ map: this.glow, color: fire ? new THREE.Color(3.2, 1.3, 0.35) : new THREE.Color(1.2, 2.2, 3.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.setScalar(fire ? 0.9 : 0.7);
    sprite.renderOrder = 8;
    this.group.add(sprite);
    this.missiles.push({ v, sprite, kind: fire ? 'fire' : 'frost', landed: false });
  }

  private fly(state: RunState, m: Missile): boolean {
    const [p0, p1] = m.v.points;
    const t = Math.min(1, Math.max(0, m.v.age / m.v.ttl));
    const gone = !state.vfx.includes(m.v) || t >= 0.999;
    const at = new THREE.Vector3(p0.x + (p1.x - p0.x) * t, 1.25 + Math.sin(t * Math.PI) * 0.35, p0.y + (p1.y - p0.y) * t);
    m.sprite.position.copy(at);
    const fire = m.kind === 'fire';
    this.motes.emit({ at, count: 2, spread: 0.06, speed: [0.1, 0.5], life: [0.25, 0.5], size: [0.08, 0.16], color: fire ? [0xffa040, 0xff3a0a] : [0xbfefff, 0x6ab8ff], drag: 2, rise: fire ? 1.4 : -0.4 });
    this.lamps.flash(at, fire ? 0xff6a1a : 0x7ac8ff, 14, 5, 0.05);
    if (!gone) return true;
    this.group.remove(m.sprite);
    m.sprite.material.dispose();
    this.motes.emit({ at, count: 22, spread: 0.1, speed: [1.2, 4], life: [0.25, 0.7], size: [0.05, 0.12], color: fire ? [0xffc060, 0xff3010] : [0xffffff, 0x8ad4ff], gravity: fire ? 1 : 6, drag: 2.2 });
    if (fire) this.motes.emit({ at, count: 8, spread: 0.2, speed: [0.2, 0.6], life: [0.8, 1.6], size: [0.3, 0.6], color: 0x404040, rise: 0.9, drag: 1, normal: true, fade: 0.2 });
    this.sprite(at, fire ? new THREE.Color(3, 1.2, 0.3) : new THREE.Color(1.2, 2, 3), 1.5, 0.18, 0.5);
    this.lamps.flash(at, fire ? 0xff6a1a : 0x7ac8ff, 40, 6, 0.22);
    return false;
  }

  private burst(v: Vfx): void {
    const [p0, p1] = v.points;
    const r = Math.max(0.4, Math.hypot(p1.x - p0.x, p1.y - p0.y));
    const at = new THREE.Vector3(p0.x, 0, p0.y);
    if (v.damageType === 'lightning') {
      this.ring(at, STORM.halo.clone().multiplyScalar(0.45), r * 0.35, r, 0.18, 0.12, 0);
      const root = at.clone().setY(0.45);
      for (let i = 0, n = 2 + Math.floor(Math.random() * 2); i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const end = at.clone().add(new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(r * (0.6 + Math.random() * 0.4))).setY(0.04);
        this.bolts.strike(() => root, () => end, GROUND, 0.09 + Math.random() * 0.06, 0.55);
      }
      this.motes.emit({ at: at.clone().setY(0.15), count: 10, spread: r * 0.45, speed: [0.4, 1.8], life: [0.12, 0.3], size: [0.02, 0.04], color: [0xffffff, 0x7ab4ff], drag: 3, streak: 0.03 });
      return;
    }
    const tint = new THREE.Color(TYPE_TINT[v.damageType] ?? 0xffffff).multiplyScalar(0.8);
    this.ring(at, tint, r * 0.3, r, 0.26, 0.16, 0.15);
    this.motes.emit({ at: at.clone().setY(0.3), count: 16, spread: r * 0.5, speed: [0.5, 2], life: [0.2, 0.5], size: [0.04, 0.09], color: tint, drag: 3, rise: 1 });
  }

  /** The Herald, out of the circle: a column of fire and the floor jumping. */
  erupt(at: THREE.Vector3): void {
    this.stage.shake(0.9);
    this.stage.flashed(0.22);
    this.lamps.flash(at.clone().setY(2.5), 0xff4a14, 90, 16, 1.3);
    for (let i = 0; i < 3; i++) this.ring(at, new THREE.Color(1.5, 0.42, 0.08), 0.6 + i * 0.5, 7 + i * 2, 0.8 + i * 0.25, 0.08, 0.08);
    this.motes.emit({ at: at.clone().setY(0.3), count: 420, spread: 1.4, speed: [2, 9], dir: new THREE.Vector3(0, 1, 0), cone: 0.25, life: [0.6, 2.2], size: [0.05, 0.16], color: [0xffd070, 0xff3000], drag: 0.8, gravity: 1.5 });
    this.motes.emit({ at: at.clone().setY(0.5), count: 90, spread: 1.6, speed: [0.5, 2], life: [1.5, 3.2], size: [0.9, 1.8], color: 0x303030, rise: 1.5, drag: 0.6, normal: true, fade: 0.15 });
    this.motes.emit({ at: at.clone().setY(1), count: 160, spread: 0.8, speed: [4, 11], life: [0.2, 0.6], size: [0.02, 0.05], color: [0xffffff, 0xffa040], drag: 2, streak: 0.05 });
    this.circleGlow = 3.2;
  }

  /** A corpse catching light as it goes. */
  burn(a: Actor): void {
    const at = a.chest(new THREE.Vector3());
    this.motes.emit({ at, count: 40, spread: 0.45, speed: [0.2, 0.9], life: [0.8, 1.8], size: [0.04, 0.1], color: [0xffb050, 0xff4010], rise: 1.3, drag: 1.4 });
  }

  /** A kill landing: a small spray, for the moment it drops. */
  fell(a: Actor): void {
    if (a.entity.kind === 'hero') return;
    const at = a.chest(new THREE.Vector3());
    this.motes.emit({ at, count: 14, spread: 0.2, speed: [1, 3], life: [0.3, 0.6], size: [0.04, 0.08], color: [0x3a0404, 0x7a0a0a], gravity: 10, drag: 1 });
  }

  /** The hero's cast: a snap of light off the hand the bolt leaves. */
  casting(a: Actor): void {
    const at = a.castPoint(new THREE.Vector3());
    this.motes.emit({ at, count: 12, speed: [1, 3], life: [0.1, 0.3], size: [0.02, 0.04], color: [0xffffff, 0x7ab4ff], drag: 4, streak: 0.03 });
    this.sprite(at, new THREE.Color(0.8, 1.2, 2), 0.45, 0.1, 0.15);
  }

  frame(state: RunState, dt: number, open: boolean): void {
    for (const v of state.vfx) {
      if (v.age < 0 || this.seen.has(v)) continue;
      this.seen.add(v);
      if (v.kind === 'arc') this.arc(state, v);
      else if (v.kind === 'blink') this.blink(state, v);
      else if (v.kind === 'impact') this.impact(state, v);
      else if (v.kind === 'shard' || v.kind === 'bolt') this.launch(v);
      else if (v.kind === 'burst') this.burst(v);
    }
    for (let i = this.missiles.length - 1; i >= 0; i--) if (!this.fly(state, this.missiles[i])) this.missiles.splice(i, 1);

    for (let i = this.timed.length - 1; i >= 0; i--) {
      const t = this.timed[i];
      t.left -= dt;
      if (t.left <= 0) {
        this.group.remove(t.obj);
        t.mat.dispose();
        this.timed.splice(i, 1);
        continue;
      }
      const k = 1 - t.left / t.life;
      t.obj.scale.setScalar(Math.max(0.01, t.size + t.grow * (1 - (1 - k) * (1 - k))));
      if (t.age) t.age(k);
      else (t.mat as unknown as { color: THREE.Color }).color.copy(t.hdr).multiplyScalar(1 - k * k);
    }
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const g = this.ghosts[i];
      g.left -= dt;
      g.mat.opacity = Math.max(0, g.left / g.life) * 0.6;
      g.obj.position.y += dt * 0.6;
      if (g.left <= 0) {
        this.group.remove(g.obj);
        g.mat.dispose();
        this.ghosts.splice(i, 1);
      }
    }
    for (let i = this.materials.dissolve.length - 1; i >= 0; i--) {
      const d = this.materials.dissolve[i];
      d.left -= dt;
      d.actor.look.uDissolve.value = Math.max(0, d.left / d.life) * 0.85;
      if (d.left <= 0) {
        d.actor.look.uDissolve.value = 0;
        d.actor.look.uEdge.value.setRGB(1.0, 0.35, 0.08);
        this.materials.dissolve.splice(i, 1);
      }
    }
    for (let i = this.crackles.length - 1; i >= 0; i--) {
      const c = this.crackles[i];
      c.left -= dt;
      c.next -= dt;
      if (c.left <= 0 || c.actor.gone) {
        this.crackles.splice(i, 1);
        continue;
      }
      if (c.next <= 0) {
        c.next = 0.05;
        const mid = c.actor.chest(new THREE.Vector3());
        const r = c.actor.height * 0.35;
        const a = mid.clone().add(new THREE.Vector3((Math.random() - 0.5) * r, (Math.random() - 0.5) * r * 1.6, (Math.random() - 0.5) * r));
        const b = mid.clone().add(new THREE.Vector3((Math.random() - 0.5) * r, (Math.random() - 0.5) * r * 1.6, (Math.random() - 0.5) * r));
        this.bolts.strike(() => a, () => b, SPARKLE, 0.07, 0.8);
      }
    }

    this.emberDebt += dt * 55;
    while (this.emberDebt >= 1 && this.world.embers.length) {
      this.emberDebt -= 1;
      const at = this.world.embers[Math.floor(Math.random() * this.world.embers.length)];
      this.motes.emit({ at, count: 1, spread: 0.6, speed: [0.3, 1.4], dir: new THREE.Vector3(0, 1, 0), cone: 0.6, life: [2, 4.5], size: [0.04, 0.1], color: [0xffb040, 0xff3a08], rise: 1.1, drag: 0.4, swirl: 0.4 });
    }
    for (const f of this.world.flames) {
      if (f.kind === 'candle' || Math.random() > dt * (f.kind === 'brazier' ? 9 : 3)) continue;
      const at = f.at.clone().add(new THREE.Vector3(0, f.size * 0.8, 0));
      this.motes.emit({ at, count: 1, spread: f.size * 0.3, speed: [0.5, 1.5], dir: new THREE.Vector3(0, 1, 0), cone: 0.35, life: [0.8, 1.8], size: [0.03, 0.06], color: [0xffc060, 0xff5010], rise: 1.2, drag: 0.6, swirl: 0.8 });
      if (f.kind === 'brazier' && Math.random() < 0.5) this.motes.emit({ at: at.clone().setY(at.y + f.size), count: 1, spread: 0.2, speed: [0.1, 0.3], life: [2, 3.5], size: [0.5, 1.0], color: 0x333333, rise: 0.5, drag: 0.4, normal: true, fade: 0.3 });
    }
    const circle = this.world.circle.material as THREE.MeshBasicMaterial;
    const want = open ? 2.4 : 1;
    this.circleGlow += (want - this.circleGlow) * (1 - Math.exp(-dt * 1.5));
    const pulse = this.circleGlow * (0.85 + 0.15 * Math.sin(this.s.uTime.value * (open ? 3 : 1.4)));
    circle.color.setRGB(3.2 * pulse, 1.5 * pulse, 0.9 * pulse);
    if (open && Math.random() < dt * 30) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 3;
      const at = this.world.circle.position.clone().add(new THREE.Vector3(Math.cos(a) * r, 0.1, Math.sin(a) * r));
      this.motes.emit({ at, count: 1, speed: [1, 2.5], dir: new THREE.Vector3(0, 1, 0), cone: 0.1, life: [1, 2], size: [0.05, 0.12], color: [0xffe0a0, 0xff6a20], rise: 1.6, swirl: 1.4 });
    }
    this.bolts.update(dt, this.stage.camera);
  }
}
