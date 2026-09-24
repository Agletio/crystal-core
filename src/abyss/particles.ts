/**
 * EVERY LOOSE MOTE OF LIGHT: embers off the lava, sparks off a bolt, the blink's
 * dust, a brazier's smoke. Simulated on the CPU, drawn in two calls — soft
 * points, and sparks as short lines stretched along their own velocity, which is
 * what reads as FAST where a dot reads as floating.
 */
import * as THREE from 'three';

export interface Burst {
  at: THREE.Vector3;
  count: number;
  spread?: number; // metres of jitter round `at`
  speed: [number, number];
  dir?: THREE.Vector3; // a bias; absent is every way
  cone?: number; // 0 exactly `dir`, 1 any direction
  life: [number, number];
  size: [number, number];
  color: THREE.ColorRepresentation | [THREE.ColorRepresentation, THREE.ColorRepresentation];
  gravity?: number;
  drag?: number;
  rise?: number; // upward pull, for heat and smoke
  swirl?: number; // turns about the vertical through `at`
  streak?: number; // seconds of velocity drawn behind a spark; absent is a soft point
  fade?: number; // share of the life spent fading in
  normal?: boolean; // drawn alpha over rather than additive: smoke
}

const CAP = 9000;
const SPARK_CAP = 2400;

class Pool {
  readonly pos: Float32Array;
  readonly vel: Float32Array;
  readonly col: Float32Array;
  readonly axis: Float32Array; // the swirl's centre
  readonly size: Float32Array;
  readonly age: Float32Array;
  readonly life: Float32Array;
  readonly phys: Float32Array; // gravity, drag, rise, swirl, streak, fade
  count = 0;
  constructor(readonly cap: number) {
    this.pos = new Float32Array(cap * 3);
    this.vel = new Float32Array(cap * 3);
    this.col = new Float32Array(cap * 3);
    this.axis = new Float32Array(cap * 2);
    this.size = new Float32Array(cap);
    this.age = new Float32Array(cap);
    this.life = new Float32Array(cap);
    this.phys = new Float32Array(cap * 6);
  }
  kill(i: number): void {
    const j = --this.count;
    if (i === j) return;
    this.pos.copyWithin(i * 3, j * 3, j * 3 + 3);
    this.vel.copyWithin(i * 3, j * 3, j * 3 + 3);
    this.col.copyWithin(i * 3, j * 3, j * 3 + 3);
    this.axis.copyWithin(i * 2, j * 2, j * 2 + 2);
    this.size[i] = this.size[j];
    this.age[i] = this.age[j];
    this.life[i] = this.life[j];
    this.phys.copyWithin(i * 6, j * 6, j * 6 + 6);
  }
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const tmp = new THREE.Vector3();
const tint = new THREE.Color();

export class Particles {
  readonly group = new THREE.Group();
  private readonly glow = new Pool(CAP);
  private readonly smoke = new Pool(1600);
  private readonly sparks = new Pool(SPARK_CAP);
  private readonly glowGeo = new THREE.BufferGeometry();
  private readonly smokeGeo = new THREE.BufferGeometry();
  private readonly sparkGeo = new THREE.BufferGeometry();
  private readonly glowMat: THREE.ShaderMaterial;
  private readonly smokeMat: THREE.ShaderMaterial;

  constructor() {
    const points = (geo: THREE.BufferGeometry, cap: number) => {
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage));
      geo.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(cap), 1).setUsage(THREE.DynamicDrawUsage));
      geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    };
    points(this.glowGeo, CAP);
    points(this.smokeGeo, 1600);
    const shader = (smoke: boolean) =>
      new THREE.ShaderMaterial({
        uniforms: { uScale: { value: 800 } },
        transparent: true,
        depthWrite: false,
        blending: smoke ? THREE.NormalBlending : THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          uniform float uScale;
          attribute vec3 aColor;
          attribute float aSize;
          varying vec3 vColor;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSize * uScale / -mv.z;
            gl_Position = projectionMatrix * mv;
            vColor = aColor;
          }`,
        fragmentShader: smoke
          ? /* glsl */ `varying vec3 vColor;
            void main() { float d = length(gl_PointCoord - 0.5); float a = 1.0 - smoothstep(0.1, 0.5, d);
              gl_FragColor = vec4(vec3(0.05, 0.045, 0.05), a * vColor.r); }`
          : /* glsl */ `varying vec3 vColor;
            void main() { float d = length(gl_PointCoord - 0.5); float a = 1.0 - smoothstep(0.0, 0.5, d);
              gl_FragColor = vec4(vColor * a * a, 1.0); }`,
      });
    this.glowMat = shader(false);
    this.smokeMat = shader(true);
    this.group.add(new THREE.Points(this.smokeGeo, this.smokeMat), new THREE.Points(this.glowGeo, this.glowMat));
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SPARK_CAP * 6), 3).setUsage(THREE.DynamicDrawUsage));
    this.sparkGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(SPARK_CAP * 6), 3).setUsage(THREE.DynamicDrawUsage));
    this.sparkGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    const sparkMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.group.add(new THREE.LineSegments(this.sparkGeo, sparkMat));
    for (const o of this.group.children) (o.frustumCulled = false), (o.renderOrder = 5);
  }

  /** Pixels a metre is at unit depth, off the viewport's height and the lens. */
  setScale(height: number, fov: number): void {
    const s = height / (2 * Math.tan((fov * Math.PI) / 360));
    this.glowMat.uniforms.uScale.value = s;
    this.smokeMat.uniforms.uScale.value = s;
  }

  emit(b: Burst): void {
    const pool = b.normal ? this.smoke : b.streak ? this.sparks : this.glow;
    const [c0, c1] = Array.isArray(b.color) ? b.color : [b.color, b.color];
    const ca = new THREE.Color(c0);
    const cb = new THREE.Color(c1);
    for (let n = 0; n < b.count && pool.count < pool.cap; n++) {
      const i = pool.count++;
      const s = b.spread ?? 0;
      pool.pos[i * 3] = b.at.x + rand(-s, s);
      pool.pos[i * 3 + 1] = b.at.y + rand(-s, s) * 0.5;
      pool.pos[i * 3 + 2] = b.at.z + rand(-s, s);
      tmp.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
      if (b.dir) tmp.lerp(b.dir, 1 - (b.cone ?? 0.5)).normalize();
      const v = rand(b.speed[0], b.speed[1]);
      pool.vel[i * 3] = tmp.x * v;
      pool.vel[i * 3 + 1] = tmp.y * v;
      pool.vel[i * 3 + 2] = tmp.z * v;
      tint.copy(ca).lerp(cb, Math.random());
      pool.col[i * 3] = tint.r;
      pool.col[i * 3 + 1] = tint.g;
      pool.col[i * 3 + 2] = tint.b;
      pool.axis[i * 2] = b.at.x;
      pool.axis[i * 2 + 1] = b.at.z;
      pool.size[i] = rand(b.size[0], b.size[1]);
      pool.age[i] = 0;
      pool.life[i] = rand(b.life[0], b.life[1]);
      pool.phys.set([b.gravity ?? 0, b.drag ?? 0, b.rise ?? 0, b.swirl ?? 0, b.streak ?? 0, b.fade ?? 0.1], i * 6);
    }
  }

  private step(pool: Pool, dt: number): void {
    for (let i = pool.count - 1; i >= 0; i--) {
      pool.age[i] += dt;
      if (pool.age[i] >= pool.life[i]) {
        pool.kill(i);
        continue;
      }
      const p = i * 6;
      const [g, drag, rise, swirl] = [pool.phys[p], pool.phys[p + 1], pool.phys[p + 2], pool.phys[p + 3]];
      pool.vel[i * 3 + 1] += (rise - g) * dt;
      const k = Math.max(0, 1 - drag * dt);
      pool.vel[i * 3] *= k;
      pool.vel[i * 3 + 1] *= k;
      pool.vel[i * 3 + 2] *= k;
      if (swirl) {
        const dx = pool.pos[i * 3] - pool.axis[i * 2];
        const dz = pool.pos[i * 3 + 2] - pool.axis[i * 2 + 1];
        pool.vel[i * 3] += -dz * swirl * dt;
        pool.vel[i * 3 + 2] += dx * swirl * dt;
      }
      pool.pos[i * 3] += pool.vel[i * 3] * dt;
      pool.pos[i * 3 + 1] += pool.vel[i * 3 + 1] * dt;
      pool.pos[i * 3 + 2] += pool.vel[i * 3 + 2] * dt;
    }
  }

  private envelope(pool: Pool, i: number): number {
    const t = pool.age[i] / pool.life[i];
    const f = pool.phys[i * 6 + 5];
    return Math.min(1, t / Math.max(1e-3, f)) * (1 - t * t);
  }

  update(dt: number): void {
    for (const pool of [this.glow, this.smoke, this.sparks]) this.step(pool, dt);
    for (const [pool, geo] of [[this.glow, this.glowGeo], [this.smoke, this.smokeGeo]] as const) {
      const pos = geo.getAttribute('position') as THREE.BufferAttribute;
      const col = geo.getAttribute('aColor') as THREE.BufferAttribute;
      const size = geo.getAttribute('aSize') as THREE.BufferAttribute;
      (pos.array as Float32Array).set(pool.pos.subarray(0, pool.count * 3));
      for (let i = 0; i < pool.count; i++) {
        const a = this.envelope(pool, i);
        const ca = col.array as Float32Array;
        ca[i * 3] = pool.col[i * 3] * a;
        ca[i * 3 + 1] = pool.col[i * 3 + 1] * a;
        ca[i * 3 + 2] = pool.col[i * 3 + 2] * a;
        (size.array as Float32Array)[i] = pool.size[i] * (pool === this.smoke ? 1 + pool.age[i] / pool.life[i] * 1.6 : 1);
      }
      pos.needsUpdate = col.needsUpdate = size.needsUpdate = true;
      geo.setDrawRange(0, pool.count);
    }
    const sp = this.sparks;
    const pos = this.sparkGeo.getAttribute('position') as THREE.BufferAttribute;
    const col = this.sparkGeo.getAttribute('color') as THREE.BufferAttribute;
    const pa = pos.array as Float32Array;
    const cc = col.array as Float32Array;
    for (let i = 0; i < sp.count; i++) {
      const s = sp.phys[i * 6 + 4];
      const a = this.envelope(sp, i);
      for (let k = 0; k < 3; k++) {
        pa[i * 6 + k] = sp.pos[i * 3 + k];
        pa[i * 6 + 3 + k] = sp.pos[i * 3 + k] - sp.vel[i * 3 + k] * s;
        cc[i * 6 + k] = sp.col[i * 3 + k] * a;
        cc[i * 6 + 3 + k] = sp.col[i * 3 + k] * a * 0.15;
      }
    }
    pos.needsUpdate = col.needsUpdate = true;
    this.sparkGeo.setDrawRange(0, sp.count * 2);
  }
}
