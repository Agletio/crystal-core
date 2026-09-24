/**
 * WHAT EVERY SURFACE IN THE ABYSS SHARES, patched into three's own materials so
 * lighting, shadows and fog stay three's: a world position, the X-RAY that
 * dithers anything between the camera and the hero open round him, a slow
 * variation so no floor reads as one tile repeated, walls that rise into dark,
 * and the lava's light on whatever stands low beside it.
 */
import * as THREE from 'three';

export interface Shared {
  uTime: { value: number };
  uHero: { value: THREE.Vector3 };
  uCam: { value: THREE.Vector3 };
  uXray: { value: number };
}

export const shared = (): Shared => ({
  uTime: { value: 0 },
  uHero: { value: new THREE.Vector3() },
  uCam: { value: new THREE.Vector3(0, 50, 0) },
  uXray: { value: 2.3 },
});

const NOISE = /* glsl */ `
  float abyssHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float abyssNoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(abyssHash(i), abyssHash(i + vec2(1.0, 0.0)), f.x),
               mix(abyssHash(i + vec2(0.0, 1.0)), abyssHash(i + vec2(1.0, 1.0)), f.x), f.y);
  }
  float abyssFbm(vec2 p) {
    float s = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { s += a * abyssNoise(p); p = p * 2.03 + vec2(17.1, 9.3); a *= 0.5; }
    return s;
  }
  float abyssBayer(vec2 p) {
    ivec2 i = ivec2(mod(p, 4.0));
    int k = i.x + i.y * 4;
    float m[16] = float[16](0., 8., 2., 10., 12., 4., 14., 6., 3., 11., 1., 9., 15., 7., 13., 5.);
    return (m[k] + 0.5) / 16.0;
  }`;

/** No surface in the Abyss is a mirror: a lamp passing a hair from a polished one is a sparkle, never a firefly. */
const ROUGH_FLOOR = '#include <roughnessmap_fragment>\n  roughnessFactor = max(roughnessFactor, 0.3);';

export interface PatchOptions {
  xray?: boolean;
  rise?: number; // metres: a wall this tall fades to black toward its top
  lavaLit?: boolean;
  variation?: number; // 0 flat, 1 the full slow drift in value and hue
}

/** Wires the shared uniforms into a standard material, keyed so variants never share a program. */
export function patch(mat: THREE.MeshStandardMaterial, s: Shared, o: PatchOptions): void {
  const key = `abyss:${o.xray ? 1 : 0}:${o.rise ?? 0}:${o.lavaLit ? 1 : 0}:${o.variation ?? 0}`;
  mat.customProgramCacheKey = () => key;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { uTime: s.uTime, uHero: s.uHero, uCam: s.uCam, uXray: s.uXray });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vAbyssWorld;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        #ifdef USE_INSTANCING
          vAbyssWorld = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vAbyssWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif`);
    let frag = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vAbyssWorld;
      uniform float uTime, uXray;
      uniform vec3 uHero, uCam;
      ${NOISE}`).replace('#include <roughnessmap_fragment>', ROUGH_FLOOR);
    if (o.xray) {
      frag = frag.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        {
          vec3 toHero = uHero - uCam;
          float len = length(toHero);
          vec3 dir = toHero / len;
          vec3 rel = vAbyssWorld - uCam;
          float along = dot(rel, dir);
          if (along < len - 0.7 && vAbyssWorld.y > 0.25) {
            float r = uXray * clamp(along / len, 0.4, 1.0);
            float open = 1.0 - smoothstep(r * 0.55, r, length(rel - dir * along));
            if (open * 1.05 > abyssBayer(gl_FragCoord.xy)) discard;
          }
        }`);
    }
    if (o.variation) {
      frag = frag.replace('#include <map_fragment>', `#include <map_fragment>
        {
          float v = abyssFbm(vAbyssWorld.xz * 0.11);
          float grime = abyssFbm(vAbyssWorld.xz * 0.43 + 7.0);
          vec3 drift = mix(vec3(0.78, 0.8, 0.9), vec3(1.12, 1.02, 0.9), v);
          diffuseColor.rgb *= mix(vec3(1.0), drift * mix(0.72, 1.08, grime), ${(o.variation ?? 0).toFixed(2)});
        }`);
    }
    if (o.lavaLit) {
      frag = frag.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        {
          float low = pow(1.0 - smoothstep(-2.7, 0.4, vAbyssWorld.y), 2.5);
          float stir = 0.7 + 0.3 * abyssNoise(vAbyssWorld.xz * 0.7 + vAbyssWorld.y * 1.3 + uTime * 0.6);
          totalEmissiveRadiance += vec3(1.0, 0.3, 0.06) * (diffuseColor.rgb * 4.0 + 0.02) * low * stir; // lit BY the lava, so the stone shows
        }`);
    }
    if (o.rise) {
      frag = frag.replace('#include <fog_fragment>', `
        gl_FragColor.rgb *= 1.0 - smoothstep(${(o.rise * 0.38).toFixed(2)}, ${(o.rise + 0.25).toFixed(2)}, vAbyssWorld.y);
        #include <fog_fragment>`);
    }
    shader.fragmentShader = frag;
  };
  mat.needsUpdate = true;
}

/** What each ACTOR carries on top: a hit's white flash, a rank's rim of light, and the dissolve. */
export interface ActorLook {
  uFlash: { value: number };
  uRim: { value: THREE.Color };
  uRimPower: { value: number };
  uDissolve: { value: number };
  uEdge: { value: THREE.Color };
  uGlow: { value: number };
}

export function patchActor(mat: THREE.MeshStandardMaterial, s: Shared, look: ActorLook, xray: boolean): void {
  mat.customProgramCacheKey = () => `abyss-actor:${xray ? 1 : 0}`;
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { uTime: s.uTime, uHero: s.uHero, uCam: s.uCam, uXray: s.uXray, ...look });
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vAbyssWorld;\nvarying vec3 vAbyssLocal;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        vAbyssWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vAbyssLocal = position;`);
    let frag = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vAbyssWorld;
      varying vec3 vAbyssLocal;
      uniform float uTime, uXray, uFlash, uRimPower, uDissolve, uGlow;
      uniform vec3 uHero, uCam, uRim, uEdge;
      ${NOISE}`).replace('#include <roughnessmap_fragment>', ROUGH_FLOOR);
    frag = frag.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      float abyssCut = abyssFbm(vAbyssLocal.xy * 4.1 + vAbyssLocal.zz * 2.3) * 0.7 + abyssNoise(vAbyssLocal.yz * 11.0) * 0.3;
      if (uDissolve > 0.0 && abyssCut < uDissolve) discard;`);
    frag = frag.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      totalEmissiveRadiance *= uGlow * (0.8 + 0.2 * sin(uTime * 3.1 + vAbyssLocal.y * 4.0));
      {
        float rim = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 4.0);
        totalEmissiveRadiance += uRim * rim * uRimPower;
        totalEmissiveRadiance += vec3(1.0, 0.92, 0.85) * uFlash;
        if (uDissolve > 0.0) totalEmissiveRadiance += uEdge * (1.0 - smoothstep(0.0, 0.08, abyssCut - uDissolve)) * 6.0;
      }`);
    shader.fragmentShader = frag;
  };
  mat.needsUpdate = true;
}

export const actorLook = (): ActorLook => ({
  uFlash: { value: 0 },
  uRim: { value: new THREE.Color(0x000000) },
  uRimPower: { value: 0 },
  uDissolve: { value: 0 },
  uEdge: { value: new THREE.Color(1.0, 0.35, 0.08) },
  uGlow: { value: 1 },
});

/** The Wound's lava: plates of cooling crust drifting on it, seams of white heat between them, and pools where the crust has gone under. */
export function lava(s: Shared): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: s.uTime },
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorld;
      ${NOISE}
      vec2 cellHash(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }
      // Distance to the nearest plate's heart and to the next one: equal on a seam.
      vec2 plates(vec2 x, float t) {
        vec2 n = floor(x), f = fract(x);
        float f1 = 8.0, f2 = 8.0;
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
          vec2 g = vec2(float(i), float(j));
          vec2 o = 0.5 + 0.5 * sin(t + 6.2831 * cellHash(n + g));
          vec2 r = g + o - f;
          float d = dot(r, r);
          if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
        }
        return vec2(sqrt(f1), sqrt(f2));
      }
      void main() {
        vec2 p = vWorld.xz;
        float t = uTime;
        vec2 flow = vec2(t * 0.045, -t * 0.028);
        float sunk = abyssFbm(p * 0.075 + flow * 0.4);
        vec2 warp = vec2(abyssFbm(p * 0.22 + flow), abyssFbm(p * 0.22 - flow + 5.2)) - 0.5;
        vec2 v = plates(p * 0.42 + warp * 2.4 + flow * 2.0, t * 0.12);
        float gap = v.y - v.x;
        float molten = smoothstep(0.62, 0.86, sunk);
        float seam = 0.07 + molten * 0.35;
        float heat = 1.0 - smoothstep(0.0, seam, gap);
        float crack = 1.0 - smoothstep(0.0, 0.025, abs(abyssFbm(p * 1.1 + warp * 2.0) - 0.5));
        float stir = abyssNoise(p * 1.4 + flow * 4.0);
        vec3 deep = vec3(0.55, 0.06, 0.01);
        vec3 hot = mix(deep, vec3(1.9, 0.6, 0.09), pow(heat, 2.2) * (0.75 + 0.25 * stir));
        vec3 rock = mix(vec3(0.014, 0.006, 0.005), vec3(0.05, 0.02, 0.012), abyssFbm(p * 2.1 + v.x));
        rock += vec3(0.45, 0.06, 0.01) * (1.0 - smoothstep(0.0, seam * 2.5, gap)) * 0.25 + deep * crack * 0.6;
        vec3 col = mix(rock, hot, max(heat, molten * 0.85));
        col *= 0.9 + 0.1 * sin(t * 1.1 + sunk * 9.0);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
}
