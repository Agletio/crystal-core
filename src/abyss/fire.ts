/**
 * EVERY FLAME IN ONE DRAW CALL: an instanced quad turned to the camera about
 * the vertical (so a flame never lies down when the eye moves), and a flame
 * drawn in the shader — two noises licking a tapered body, white at the root,
 * orange, then red, then gone. HDR, so bloom does the halo.
 */
import * as THREE from 'three';
import type { Flame } from './world';
import type { Shared } from './shaders';

const STACK: Record<Flame['kind'], { tongues: number; spread: number; lift: number; heat: number }> = {
  candle: { tongues: 1, spread: 0, lift: 1.9, heat: 0.8 },
  torch: { tongues: 2, spread: 0.06, lift: 1.7, heat: 2.2 },
  brazier: { tongues: 5, spread: 0.3, lift: 1.35, heat: 1.6 },
};

export function flames(list: Flame[], s: Shared): THREE.InstancedMesh {
  const quads: { at: THREE.Vector3; size: number; lift: number; heat: number }[] = [];
  for (const f of list) {
    const k = STACK[f.kind];
    for (let t = 0; t < k.tongues; t++) {
      const a = (t / k.tongues) * Math.PI * 2 + f.at.x;
      const r = t === 0 ? 0 : k.spread * f.size;
      const shrink = t === 0 ? 1 : 0.62 + 0.2 * Math.sin(a * 3.1);
      quads.push({ at: f.at.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)), size: f.size * shrink, lift: k.lift, heat: k.heat });
    }
  }
  const geo = new THREE.PlaneGeometry(1, 1);
  const seeds = new Float32Array(quads.length);
  const lifts = new Float32Array(quads.length);
  const heats = new Float32Array(quads.length);
  quads.forEach((q, i) => {
    seeds[i] = (q.at.x * 12.9898 + q.at.z * 78.233) % 17;
    lifts[i] = q.lift;
    heats[i] = q.heat;
  });
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));
  geo.setAttribute('aLift', new THREE.InstancedBufferAttribute(lifts, 1));
  geo.setAttribute('aHeat', new THREE.InstancedBufferAttribute(heats, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: s.uTime },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float aSeed, aLift, aHeat;
      uniform float uTime;
      varying vec2 vUv;
      varying float vSeed, vHeat;
      void main() {
        vUv = uv;
        vSeed = aSeed;
        vHeat = aHeat;
        vec3 centre = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float size = length((instanceMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
        vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        float sway = sin(uTime * 3.7 + aSeed) * 0.06 * (position.y + 0.5);
        vec3 p = centre + right * (position.x + sway) * size + vec3(0.0, 1.0, 0.0) * (position.y + 0.42) * size * aLift;
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      varying float vSeed, vHeat;
      float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        float y = vUv.y;
        float lick = n(vec2(vUv.x * 3.0 + vSeed, y * 3.2 - uTime * 3.1)) * 0.65 + n(vec2(vUv.x * 7.0 - vSeed, y * 6.0 - uTime * 5.3)) * 0.35;
        float x = vUv.x - 0.5 + (lick - 0.5) * 0.32 * y;
        float width = 0.34 * pow(1.0 - y, 0.85) * (0.75 + 0.35 * sin(y * 3.1416));
        float body = 1.0 - smoothstep(width * 0.35, width, abs(x));
        body *= smoothstep(0.0, 0.1, y) * (1.0 - smoothstep(0.45 + lick * 0.4, 0.98, y));
        float heat = body * (1.1 - y);
        vec3 col = mix(vec3(0.9, 0.12, 0.02), vec3(1.0, 0.55, 0.12), smoothstep(0.15, 0.55, heat));
        col = mix(col, vec3(1.0, 0.93, 0.75), smoothstep(0.6, 0.95, heat));
        float flicker = 0.85 + 0.15 * n(vec2(uTime * 7.0, vSeed));
        gl_FragColor = vec4(col * body * vHeat * flicker, 1.0);
      }`,
  });
  const mesh = new THREE.InstancedMesh(geo, mat, quads.length);
  const m = new THREE.Matrix4();
  quads.forEach((q, i) => mesh.setMatrixAt(i, m.compose(q.at, new THREE.Quaternion(), new THREE.Vector3(q.size, q.size, q.size))));
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  return mesh;
}
