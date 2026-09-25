/**
 * THE ABYSS'S RENDERER: one WebGL2 context, an HDR pipeline and the camera.
 *
 * Scene → (GTAO) → bloom → ACES → a grade in display space: split toning,
 * an S-curve, radial chromatic aberration, vignette and grain. What that costs
 * is a `PRESET`: the URL's (`?low`, `?medium`, `?high`), else the player's own
 * (`src/graphics.ts`), else LOW on a software rasteriser — the headless
 * harness, picked off the renderer's own name — and MEDIUM on a GPU.
 *
 * The camera is FIXED at 45° of yaw — the classic isometric diagonal, so every
 * room shows its north and west walls as the back of the diorama — and only
 * its distance moves.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { QUALITIES, graphics } from '../graphics';
import type { Quality } from '../graphics';

export type { Quality } from '../graphics';

/** What each quality buys. The ratio is a cap on the screen's own pixel ratio; the lamps are the point lights handed round. */
export const PRESET: Record<Quality, { ratio: number; samples: number; shadows: THREE.ShadowMapType | null; ao: boolean; lamps: number; shadowMap: number; anisotropy: number }> = {
  low: { ratio: 1, samples: 0, shadows: null, ao: false, lamps: 4, shadowMap: 1024, anisotropy: 1 },
  medium: { ratio: 1, samples: 4, shadows: THREE.PCFShadowMap, ao: false, lamps: 8, shadowMap: 1024, anisotropy: 4 },
  high: { ratio: 2, samples: 4, shadows: THREE.PCFSoftShadowMap, ao: true, lamps: 12, shadowMap: 2048, anisotropy: 16 },
};

export const YAW = Math.PI / 4;
export const PITCH = (56 * Math.PI) / 180;
export const FOV = 30;
export const ZOOM = { near: 15, far: 42, start: 25 };

const GRADE = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uVignette: { value: 0.62 },
    uGrain: { value: 0.035 },
    uAberration: { value: 0.0012 },
    uFlash: { value: 0 },
    uHurt: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uGrain, uAberration, uFlash, uHurt;
    uniform vec2 uRes;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec2 off = c * r2 * uAberration * 4.0;
      vec3 col = vec3(texture2D(tDiffuse, vUv + off).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - off).b);
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(col, col * vec3(0.9, 0.95, 1.12), smoothstep(0.32, 0.0, l) * 0.55);
      col = mix(col, col * vec3(1.07, 1.0, 0.9), smoothstep(0.4, 1.0, l) * 0.45);
      col = mix(col, col * col * (3.0 - 2.0 * col), 0.22);
      col += vec3(0.55, 0.75, 1.0) * uFlash;
      float edge = length(c * vec2(1.0, 0.82));
      col = mix(col, col * vec3(1.35, 0.35, 0.3), uHurt * smoothstep(0.25, 0.75, edge));
      col *= mix(1.0 - uVignette, 1.0, smoothstep(0.78, 0.18, edge * 1.2));
      col += (hash(vUv * uRes + fract(uTime * 7.13) * 91.7) - 0.5) * uGrain;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

/** Before the bloom, which would blur ONE non-finite pixel — a half float overflows at 65504 — across the whole frame. */
const SCRUB = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      bool bad = any(isnan(c)) || any(isinf(c)) || !(c.r >= 0.0 && c.g >= 0.0 && c.b >= 0.0);
      gl_FragColor = vec4(bad ? vec3(0.0) : min(c, vec3(48.0)), 1.0);
    }`,
};

/** A dark room with a few coloured panels: enough for a metal to catch a highlight. */
function environment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const room = new THREE.Scene();
  room.background = new THREE.Color(0x040306);
  const panel = (color: number, x: number, y: number, z: number, w: number, h: number) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    room.add(m);
  };
  panel(0xff8a3c, 4, 1, 3, 3, 2);
  panel(0xff5520, -3, 0.5, 4, 2, 1.5);
  panel(0x5a78ff, -4, 3, -3, 4, 2);
  panel(0x2a2433, 0, 6, 0, 10, 10);
  panel(0x120d0a, 0, -4, 0, 12, 12);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(room, 0.02).texture;
  pmrem.dispose();
  return env;
}

let running: Quality | null = null;
/** The quality the last stage built runs at, for the settings screen to light. */
export const stageQuality = (): Quality | null => running;

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 0.5, 220);
  readonly quality: Quality;
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly grade: ShaderPass;
  private readonly gtao: GTAOPass | null = null;
  private readonly size = new THREE.Vector2(1, 1);
  private readonly pinned = new WeakSet<object>();
  /** A quality the URL or the player asked for is never traded for frame rate. */
  readonly forced: boolean;
  readonly focus = new THREE.Vector3();
  /** What the AO pass must not see: its depth pass draws a transparent ribbon as a solid wall. */
  readonly glowing: THREE.Object3D[] = [];
  private readonly aim = new THREE.Vector3();
  distance = ZOOM.start;
  private trauma = 0;
  private time = 0;
  private flash = 0;
  hurt = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
    const gl = this.renderer.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    const asked = new URLSearchParams(location.search);
    const software = /swiftshader|llvmpipe|software/i.test(name); // draws the scene twice for shadows, at a frame a second
    const url = QUALITIES.find((q) => asked.has(q));
    this.quality = url ?? graphics().quality ?? (software ? 'low' : 'medium');
    this.forced = url !== undefined || graphics().quality !== null;
    running = this.quality;
    const preset = PRESET[this.quality];
    this.renderer.setPixelRatio(Math.min(preset.ratio, globalThis.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = preset.shadows !== null;
    this.renderer.shadowMap.type = preset.shadows ?? THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.info.autoReset = false; // a frame is several passes; the count is the frame's

    this.scene.background = new THREE.Color(0x020203);
    this.scene.fog = new THREE.FogExp2(0x050408, 0.012);
    this.scene.environment = environment(this.renderer);
    this.scene.environmentIntensity = 0.55;

    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: preset.samples });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (preset.ao && !asked.has('noao')) {
      this.gtao = new GTAOPass(this.scene, this.camera, 1, 1);
      this.gtao.updateGtaoMaterial({ radius: 0.32, distanceExponent: 2, thickness: 0.45, scale: 1.1, samples: 16 });
      this.gtao.blendIntensity = 0.8;
      const inner = this.gtao.render.bind(this.gtao);
      this.gtao.render = (...args: Parameters<GTAOPass['render']>) => {
        const was = this.glowing.map((o) => o.visible);
        for (const o of this.glowing) o.visible = false;
        inner(...args);
        this.glowing.forEach((o, i) => (o.visible = was[i]));
      };
      this.composer.addPass(this.gtao);
    }
    this.composer.addPass(new ShaderPass(SCRUB));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.32, 0.9);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GRADE);
    this.composer.addPass(this.grade);
  }

  get anisotropy(): number {
    return Math.min(PRESET[this.quality].anisotropy, this.renderer.capabilities.getMaxAnisotropy());
  }

  resize(width: number, height: number): void {
    this.size.set(width, height);
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    (this.grade.uniforms.uRes.value as THREE.Vector2).set(width, height);
  }

  /** One step down in cost for a frame that is not keeping up: what it gave up, or null once there is nothing left. */
  lighten(): string | null {
    const ratio = this.renderer.getPixelRatio();
    if (ratio > 1.01) {
      const next = ratio > 1.6 ? 1.5 : 1;
      this.renderer.setPixelRatio(next);
      this.composer.setPixelRatio(next);
      this.resize(this.size.x, this.size.y);
      return `pixel ratio ${next}`;
    }
    if (this.gtao?.enabled) {
      this.gtao.enabled = false;
      return 'ambient occlusion';
    }
    return null;
  }

  zoom(by: number): void {
    this.distance = THREE.MathUtils.clamp(this.distance * by, ZOOM.near, ZOOM.far);
  }

  shake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount);
  }

  /** A white-blue bloom over the whole frame, for a strike that fills the room. */
  flashed(amount: number): void {
    this.flash = Math.max(this.flash, amount);
  }

  /** The ground direction the camera looks along, and its right hand: WASD reads these. */
  axes(): { up: THREE.Vector2; right: THREE.Vector2 } {
    return {
      up: new THREE.Vector2(-Math.sin(YAW), -Math.cos(YAW)),
      right: new THREE.Vector2(Math.cos(YAW), -Math.sin(YAW)),
    };
  }

  /** Eases the eye onto `on` and places the camera; call once a frame before `render`. */
  place(on: THREE.Vector3, dt: number, snap = false): void {
    this.aim.copy(on);
    if (snap || this.focus.distanceTo(on) > 8) this.focus.copy(on); // a jump no Blink makes is a cut, not a pan
    else this.focus.lerp(this.aim, 1 - Math.exp(-dt * 7.5));
    const d = this.distance;
    const back = new THREE.Vector3(Math.sin(YAW) * Math.cos(PITCH), Math.sin(PITCH), Math.cos(YAW) * Math.cos(PITCH));
    this.camera.position.copy(this.focus).addScaledVector(back, d);
    const look = this.focus.clone().add(new THREE.Vector3(0, 0.9, 0));
    if (this.trauma > 0) {
      const s = this.trauma * this.trauma * 0.35;
      const t = this.time * 38;
      this.camera.position.x += Math.sin(t * 1.3) * s;
      this.camera.position.y += Math.sin(t * 1.7 + 1.1) * s * 0.6;
      this.camera.position.z += Math.sin(t * 1.1 + 2.3) * s;
      this.trauma = Math.max(0, this.trauma - dt * 1.6);
    }
    this.camera.lookAt(look);
  }

  /** Where a pixel lands on the floor plane, in world metres. */
  ground(px: number, py: number): THREE.Vector3 | null {
    const w = this.canvas.clientWidth || 1;
    const h = this.canvas.clientHeight || 1;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((px / w) * 2 - 1, -(py / h) * 2 + 1), this.camera);
    const hit = new THREE.Vector3();
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit) ? hit : null;
  }

  /** CSS pixels a world point lands on, or null behind the camera. */
  screen(at: THREE.Vector3): { x: number; y: number } | null {
    const p = at.clone().project(this.camera);
    if (p.z > 1) return null;
    return { x: ((p.x + 1) / 2) * (this.canvas.clientWidth || 1), y: ((1 - p.y) / 2) * (this.canvas.clientHeight || 1) };
  }

  render(dt: number): void {
    dt = Math.max(0, dt);
    this.time += dt;
    this.flash = Math.max(0, this.flash - dt * 5);
    this.hurt = Math.max(0, this.hurt - dt * 1.4);
    this.grade.uniforms.uTime.value = this.time;
    this.grade.uniforms.uFlash.value = this.flash * 0.35;
    this.grade.uniforms.uHurt.value = this.hurt;
    this.renderer.info.reset();
    this.composer.render(dt);
    this.pin();
  }

  /** Three.js deletes a program when the last material using it goes, and compiles it again — a hitch —
   *  the next time one comes: every kind of effect, every time it came back. So each is held for the stage's life. */
  pin(): void {
    for (const program of this.renderer.info.programs ?? []) {
      if (this.pinned.has(program)) continue;
      this.pinned.add(program);
      program.usedTimes++;
    }
  }

  /** Compiles `object` as a frame will draw it — into the composer's own target, which is what decides tone mapping
   *  and colour space, and lit by this scene — then holds what it compiled, so its first sight is not a hitch. */
  async warm(object: THREE.Object3D): Promise<void> {
    const was = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.composer.renderTarget1);
    const done = this.renderer.compileAsync(object, this.camera, this.scene);
    this.renderer.setRenderTarget(was);
    await done;
    this.pin();
  }

  dispose(): void {
    this.composer.dispose();
    this.renderer.dispose();
    this.scene.environment?.dispose();
  }
}
