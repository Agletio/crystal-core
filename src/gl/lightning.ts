/**
 * ARC LIGHTNING, and any other bolt: a path split by midpoint displacement into
 * a jagged line, branches forking off it that die short of anything, the whole
 * of it RE-ROLLED every few frames so it crackles rather than hangs, and drawn
 * as a camera-facing ribbon — white-hot core, coloured halo — additive, in HDR,
 * so bloom makes it the brightest thing in the room for the instant it lives.
 *
 * Every bolt in flight shares one dynamic buffer, rebuilt each frame.
 */
import * as THREE from 'three';

export interface BoltStyle {
  core: THREE.Color;
  halo: THREE.Color;
  width: number;
  rough: number; // displacement as a share of each span
  branches: number; // expected forks a bolt
}

export const STORM: BoltStyle = { core: new THREE.Color(0.85, 0.93, 1.0), halo: new THREE.Color(0.28, 0.5, 1.0), width: 0.2, rough: 0.55, branches: 4 };
export const HELLFIRE: BoltStyle = { core: new THREE.Color(1.0, 0.9, 0.95), halo: new THREE.Color(1.0, 0.18, 0.28), width: 0.22, rough: 0.55, branches: 3 };
export const SPARKLE: BoltStyle = { core: new THREE.Color(1, 1, 1), halo: new THREE.Color(0.4, 0.7, 1.0), width: 0.12, rough: 0.5, branches: 0 };

interface Bolt {
  from: () => THREE.Vector3; // read each frame, so a bolt stays on a body that moves
  to: () => THREE.Vector3;
  style: BoltStyle;
  life: number;
  left: number;
  reroll: number;
  lines: { pts: THREE.Vector3[]; power: number }[];
  power: number;
}

const MAX_VERTS = 24000;

function jag(a: THREE.Vector3, b: THREE.Vector3, rough: number, depth: number, side: THREE.Vector3, lift: THREE.Vector3): THREE.Vector3[] {
  let pts = [a.clone(), b.clone()];
  let r = rough;
  for (let d = 0; d < depth; d++) {
    const next: THREE.Vector3[] = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i];
      const q = pts[i + 1];
      const len = p.distanceTo(q);
      const mid = p.clone().lerp(q, 0.5 + (Math.random() - 0.5) * 0.15);
      mid.addScaledVector(side, (Math.random() - 0.5) * len * r * 2).addScaledVector(lift, (Math.random() - 0.5) * len * r);
      next.push(mid, q);
    }
    pts = next;
    r *= 0.56;
  }
  return pts;
}

export class Lightning {
  readonly mesh: THREE.Mesh;
  private readonly bolts: Bolt[] = [];
  private readonly geo = new THREE.BufferGeometry();
  private readonly pos = new Float32Array(MAX_VERTS * 3);
  private readonly uv = new Float32Array(MAX_VERTS * 2);
  private readonly core = new Float32Array(MAX_VERTS * 3);
  private readonly halo = new Float32Array(MAX_VERTS * 3);
  private readonly index = new Uint32Array(MAX_VERTS * 3);

  constructor() {
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('uv', new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aCore', new THREE.BufferAttribute(this.core, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aHalo', new THREE.BufferAttribute(this.halo, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setIndex(new THREE.BufferAttribute(this.index, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      vertexShader: /* glsl */ `
        attribute vec3 aCore, aHalo;
        varying vec2 vUv;
        varying vec3 vCore, vHalo;
        void main() { vUv = uv; vCore = aCore; vHalo = aHalo; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vCore, vHalo;
        void main() {
          float d = abs(vUv.y - 0.5) * 2.0;
          float core = 1.0 - smoothstep(0.05, 0.22, d);
          float halo = exp(-d * 4.5) * (1.0 - smoothstep(0.7, 1.0, d));
          gl_FragColor = vec4(vCore * core * 4.2 + vHalo * halo * 1.1, 1.0);
        }`,
    });
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 7;
  }

  get active(): number {
    return this.bolts.length;
  }

  strike(from: () => THREE.Vector3, to: () => THREE.Vector3, style: BoltStyle, life = 0.26, power = 1): void {
    const bolt: Bolt = { from, to, style, life, left: life, reroll: 0, lines: [], power };
    this.shape(bolt);
    this.bolts.push(bolt);
  }

  private shape(bolt: Bolt): void {
    const a = bolt.from();
    const b = bolt.to();
    const dir = b.clone().sub(a);
    const len = dir.length() || 1;
    dir.divideScalar(len);
    const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
    if (side.lengthSq() < 0.1) side.set(1, 0, 0);
    const lift = new THREE.Vector3().crossVectors(dir, side).normalize();
    const depth = Math.max(4, Math.min(8, Math.round(Math.log2(len * 10))));
    const main = jag(a, b, bolt.style.rough, depth, side, lift);
    bolt.lines = [{ pts: main, power: 1 }];
    const forks = bolt.style.branches > 0 ? Math.round(bolt.style.branches * (0.6 + Math.random() * 0.8)) : 0;
    for (let f = 0; f < forks; f++) {
      const at = main[1 + Math.floor(Math.random() * (main.length - 2))];
      const off = dir.clone().multiplyScalar(0.5 + Math.random() * 0.5)
        .addScaledVector(side, (Math.random() - 0.5) * 1.8).addScaledVector(lift, (Math.random() - 0.5) * 0.9).normalize();
      const end = at.clone().addScaledVector(off, len * (0.15 + Math.random() * 0.3));
      bolt.lines.push({ pts: jag(at, end, bolt.style.rough * 1.2, Math.max(2, depth - 2), side, lift), power: 0.5 });
    }
  }

  update(dt: number, camera: THREE.Camera): void {
    let v = 0;
    let n = 0;
    const eye = camera.position;
    const t = new THREE.Vector3();
    const toEye = new THREE.Vector3();
    const edge = new THREE.Vector3();
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const bolt = this.bolts[i];
      bolt.left -= dt;
      bolt.reroll -= dt;
      if (bolt.left <= 0) {
        this.bolts.splice(i, 1);
        continue;
      }
      if (bolt.reroll <= 0) {
        this.shape(bolt);
        bolt.reroll = 0.035 + Math.random() * 0.03;
      }
      const age = 1 - bolt.left / bolt.life;
      const env = Math.min(1, age * 14) * (1 - Math.pow(age, 3)) * (0.7 + Math.random() * 0.5) * bolt.power;
      for (const line of bolt.lines) {
        const pts = line.pts;
        if (v + pts.length * 2 >= MAX_VERTS) break;
        const start = v;
        for (let k = 0; k < pts.length; k++) {
          const p = pts[k];
          t.copy(pts[Math.min(pts.length - 1, k + 1)]).sub(pts[Math.max(0, k - 1)]).normalize();
          toEye.copy(eye).sub(p).normalize();
          const taper = line.power < 1 ? 1 - k / (pts.length - 1) : 1 - 0.35 * Math.pow(k / (pts.length - 1), 4);
          edge.crossVectors(t, toEye).normalize().multiplyScalar((bolt.style.width * 0.5) * (0.35 + 0.65 * taper) * (line.power < 1 ? 0.6 : 1));
          const u = k / (pts.length - 1);
          for (const [sgn, y] of [[1, 0], [-1, 1]] as const) {
            this.pos.set([p.x + edge.x * sgn, p.y + edge.y * sgn, p.z + edge.z * sgn], v * 3);
            this.uv.set([u, y], v * 2);
            const k2 = env * line.power * taper;
            this.core.set([bolt.style.core.r * k2, bolt.style.core.g * k2, bolt.style.core.b * k2], v * 3);
            this.halo.set([bolt.style.halo.r * k2, bolt.style.halo.g * k2, bolt.style.halo.b * k2], v * 3);
            v++;
          }
        }
        for (let k = 0; k < pts.length - 1; k++) {
          const a = start + k * 2;
          this.index.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], n);
          n += 6;
        }
      }
    }
    for (const name of ['position', 'uv', 'aCore', 'aHalo']) (this.geo.getAttribute(name) as THREE.BufferAttribute).needsUpdate = true;
    this.geo.index!.needsUpdate = true;
    this.geo.setDrawRange(0, n);
  }
}
