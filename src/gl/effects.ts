/**
 * THE SIM'S EFFECTS IN 3D: one live picture per `Vfx`, made the frame it first
 * shows and dropped the frame the sim drops it, sized off the SAME numbers the
 * 2D renderer reads — the radius a burst carries in its second point, a wedge's
 * two rim points, a spike field's circle — so what is drawn is what was hit.
 *
 * Colour is the damage TYPE's, off the palette the map already uses, so a
 * converted fireball looks converted in both renderers.
 */
import * as THREE from 'three';
import type { RunState, Vfx } from '../sim/run';
import type { Palette } from '../render/renderer';
import { burstRadius, damageColour, poisonFieldRadius, spikeAlpha, SPIKE_TTL, vfxColour } from '../render/renderer';
import type { Lamps } from './lights';
import type { Lightning } from './lightning';
import { STORM } from './lightning';
import type { BoltStyle } from './lightning';
import type { Particles } from './particles';

type Point = { x: number; y: number };
interface Live {
  update(fx: Vfx, t: number, state: RunState): void;
  dispose(): void;
}

const additive = (color: THREE.Color, opacity = 1, side: THREE.Side = THREE.FrontSide): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side, toneMapped: false });

/** A soft round glow, drawn once and shared by every orb and flash. */
let glowTexture: THREE.Texture | null = null;
function glowTex(): THREE.Texture {
  if (glowTexture) return glowTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  if (g) {
    const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 64, 64);
  }
  glowTexture = new THREE.CanvasTexture(c);
  return glowTexture;
}

function orb(color: THREE.Color, size: number): THREE.Sprite {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
  s.scale.setScalar(size);
  return s;
}

export class Effects {
  readonly group = new THREE.Group();
  private readonly live = new Map<Vfx, Live>();
  private readonly ringGeo = new THREE.RingGeometry(0.86, 1, 64).rotateX(-Math.PI / 2);
  private readonly discGeo = new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2);
  private readonly spikeGeo = new THREE.ConeGeometry(0.16, 1, 5).translate(0, 0.5, 0);
  private readonly ice = new THREE.MeshStandardMaterial({ color: 0xbfe8ff, emissive: 0x3a86c8, emissiveIntensity: 0.9, roughness: 0.12, metalness: 0.1, transparent: true });

  constructor(
    private readonly palette: Palette,
    private readonly particles: Particles,
    private readonly lightning: Lightning,
    private readonly lamps: Lamps,
    /** Where a thrower's effect leaves them: a hand, or the chest. */
    private readonly castFrom: (id: number, fallback: Point) => THREE.Vector3,
    private readonly groundAt: (x: number, z: number) => number
  ) {}

  private colour(fx: Vfx): THREE.Color {
    return new THREE.Color(vfxColour(this.palette, fx.kind, fx.damageType) || damageColour(this.palette, fx.damageType));
  }

  private at(p: Point, up = 0): THREE.Vector3 {
    return new THREE.Vector3(p.x, this.groundAt(p.x, p.y) + up, p.y);
  }

  sync(state: RunState): void {
    const seen = new Set<Vfx>();
    for (const fx of state.vfx) {
      if (fx.age < 0 || !fx.points[0]) continue;
      seen.add(fx);
      let l = this.live.get(fx);
      if (!l) {
        l = this.spawn(fx, state);
        this.live.set(fx, l);
      }
      l.update(fx, Math.min(1, fx.age / Math.max(1e-3, fx.ttl)), state);
    }
    for (const [fx, l] of this.live) {
      if (seen.has(fx)) continue;
      l.dispose();
      this.live.delete(fx);
    }
  }

  private style(fx: Vfx): BoltStyle {
    if (fx.damageType === 'lightning') return STORM;
    const c = this.colour(fx);
    return { core: new THREE.Color(1, 1, 1).lerp(c, 0.25), halo: c, width: 0.18, rough: 0.5, branches: 2 };
  }

  private spawn(fx: Vfx, state: RunState): Live {
    const from = fx.points[0];
    const to = fx.points[1] ?? from;
    const c = this.colour(fx);
    const start = (): THREE.Vector3 => (fx.cast !== undefined ? this.castFrom(fx.cast, from) : this.at(from, 1.1));
    const none: Live = { update() {}, dispose() {} };

    switch (fx.kind) {
      case 'arc':
      case 'bolt': {
        const a = fx.kind === 'bolt' || fx.cast !== undefined ? start() : this.at(from, 1.1);
        const b = this.at(to, 1.0);
        this.lightning.strike(() => a, () => b, this.style(fx), Math.min(0.4, fx.ttl), 1);
        this.lamps.flash(b, c, 18, 7, 0.25);
        this.particles.emit({ at: b, count: 14, speed: [2, 6], life: [0.15, 0.4], size: [0.04, 0.09], color: [c, 0xffffff], streak: 0.04, drag: 2 });
        return none;
      }
      case 'flame':
      case 'shard':
      case 'arrow':
        return this.thrown(fx, start, c);
      case 'blade':
        return this.blade(fx, start, c, state);
      case 'burst':
        return this.burst(fx, c);
      case 'sweep':
        return this.ring(fx, c, (t) => 0.55 + 0.45 * Math.min(1, t * 1.6), 0.9);
      case 'blight_field':
        return this.pool(fx, c);
      case 'spikes':
        return this.spikes(fx);
      case 'wedge':
        return this.wedge(fx, c);
      case 'slash':
        return this.slash(fx, c);
      case 'storm': {
        const b = this.at(to, 0);
        const cloud = this.at(to, 7);
        this.lightning.strike(() => cloud, () => b, this.style(fx), 0.3, 1.3);
        this.lamps.flash(b, c, 22, 9, 0.3);
        this.particles.emit({ at: cloud, count: 30, spread: 1.4, speed: [0.1, 0.4], life: [0.6, 1.1], size: [0.5, 0.9], color: 0x2a2c34, normal: true });
        return none;
      }
      case 'leap': {
        const b = this.at(to, 0.05);
        this.particles.emit({ at: b, count: 34, spread: 0.3, speed: [1.5, 3.5], dir: new THREE.Vector3(0, 0.3, 0), cone: 1, life: [0.4, 0.8], size: [0.2, 0.4], color: 0xa89a82, normal: true, drag: 3 });
        return none;
      }
      case 'blink': {
        for (const p of [from, to]) {
          const at = this.at(p, 0.9);
          this.particles.emit({ at, count: 26, spread: 0.3, speed: [0.5, 2.2], life: [0.3, 0.7], size: [0.05, 0.12], color: [c, 0xffffff], swirl: 3 });
          this.lamps.flash(at, c, 12, 6, 0.25);
        }
        return none;
      }
      default: {
        this.particles.emit({ at: this.at(to, 0.8), count: 12, speed: [1, 3.5], life: [0.2, 0.5], size: [0.05, 0.1], color: c, streak: 0.03 });
        return none;
      }
    }
  }

  /** A thing THROWN from the hand to where it lands over the effect's life. */
  private thrown(fx: Vfx, start: () => THREE.Vector3, c: THREE.Color): Live {
    const to = fx.points[1] ?? fx.points[0];
    const a = start();
    const b = this.at(to, 1.0);
    const g = new THREE.Group();
    let body: THREE.Object3D;
    if (fx.kind === 'arrow') {
      body = new THREE.Group();
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 5).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x5a4430, roughness: 0.8 }));
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 5).rotateX(Math.PI / 2).translate(0, 0, 0.41), additive(c, 1));
      body.add(shaft, head, orb(c, 0.5));
    } else if (fx.kind === 'shard') {
      body = new THREE.Group();
      const sh = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0).scale(0.7, 0.7, 2.6), this.ice);
      body.add(sh, orb(c, 0.8));
    } else {
      body = orb(c, 0.9);
      body.add(orb(new THREE.Color(1, 0.95, 0.8), 0.45));
    }
    g.add(body);
    this.group.add(g);
    let last = a.clone();
    return {
      update: (_fx, t) => {
        const p = a.clone().lerp(b, t);
        p.y += Math.sin(t * Math.PI) * (fx.kind === 'arrow' ? 0.25 : 0.1);
        g.position.copy(p);
        const dir = p.clone().sub(last);
        if (dir.lengthSq() > 1e-6) g.lookAt(p.clone().add(dir));
        if (fx.kind === 'flame') this.particles.emit({ at: p, count: 3, spread: 0.08, speed: [0.1, 0.6], life: [0.2, 0.45], size: [0.12, 0.25], color: [c, 0xffc070], rise: 1.5 });
        last = p;
      },
      dispose: () => {
        this.group.remove(g);
        if (fx.kind === 'flame') this.particles.emit({ at: b, count: 18, speed: [1, 3.5], life: [0.2, 0.5], size: [0.08, 0.16], color: [c, 0xffd080], streak: 0.03, rise: 1 });
      },
    };
  }

  /** Ethereal Strike's ghost: out to the far point and back to the hero's LIVE place, turning. */
  private blade(fx: Vfx, start: () => THREE.Vector3, c: THREE.Color, state: RunState): Live {
    const to = fx.points[1] ?? fx.points[0];
    const out = this.at(to, 1.0);
    const g = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 1.1), additive(c, 0.8));
    g.add(blade, orb(c, 1.1));
    this.group.add(g);
    return {
      update: (_fx, t) => {
        const hero = new THREE.Vector3(state.hero.x, 1.0, state.hero.y);
        const home = start();
        const p = t < 0.5 ? home.clone().lerp(out, t * 2) : out.clone().lerp(hero, (t - 0.5) * 2);
        g.position.copy(p);
        g.rotation.y = t * 30;
      },
      dispose: () => this.group.remove(g),
    };
  }

  /** Out fast from its middle to the radius the sim hit, then gone. */
  private burst(fx: Vfx, c: THREE.Color): Live {
    const from = fx.points[0];
    const to = fx.points[1] ?? from;
    const radius = Math.hypot(to.x - from.x, to.y - from.y);
    const centre = this.at(from, 0.04);
    const ring = new THREE.Mesh(this.ringGeo, additive(c, 1, THREE.DoubleSide));
    ring.position.copy(centre);
    const flash = orb(c, radius * 2.2);
    flash.position.copy(centre).y += 0.6;
    this.group.add(ring, flash);
    this.lamps.flash(centre.clone().setY(1.2), c, 26, radius * 3 + 3, 0.35);
    this.particles.emit({ at: centre.clone().setY(0.4), count: Math.round(20 + radius * 14), spread: radius * 0.3, speed: [radius * 2, radius * 5], dir: new THREE.Vector3(0, 0.25, 0), cone: 1, life: [0.25, 0.6], size: [0.06, 0.14], color: [c, 0xffffff], streak: 0.05, drag: 2.5 });
    return {
      update: (_fx, t) => {
        const r = Math.max(0.05, burstRadius(radius, t));
        ring.scale.setScalar(r);
        (ring.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - t * t);
        (flash.material as THREE.SpriteMaterial).opacity = Math.max(0, 0.8 * (1 - t * 2.5));
      },
      dispose: () => {
        this.group.remove(ring, flash);
        (ring.material as THREE.Material).dispose();
        (flash.material as THREE.Material).dispose();
      },
    };
  }

  private ring(fx: Vfx, c: THREE.Color, grow: (t: number) => number, alpha: number): Live {
    const from = fx.points[0];
    const to = fx.points[1] ?? from;
    const radius = Math.hypot(to.x - from.x, to.y - from.y);
    const ring = new THREE.Mesh(this.ringGeo, additive(c, alpha, THREE.DoubleSide));
    ring.position.copy(this.at(from, 0.05));
    this.group.add(ring);
    return {
      update: (_fx, t) => {
        ring.scale.setScalar(Math.max(0.05, radius * grow(t)));
        (ring.material as THREE.MeshBasicMaterial).opacity = alpha * (1 - t);
      },
      dispose: () => {
        this.group.remove(ring);
        (ring.material as THREE.Material).dispose();
      },
    };
  }

  /** Poison opens to its radius and holds, bubbling. */
  private pool(fx: Vfx, c: THREE.Color): Live {
    const from = fx.points[0];
    const to = fx.points[1] ?? from;
    const radius = Math.hypot(to.x - from.x, to.y - from.y);
    const ink = c.clone().multiplyScalar(0.55);
    const disc = new THREE.Mesh(this.discGeo, new THREE.MeshBasicMaterial({ color: ink, transparent: true, opacity: 0.7, depthWrite: false }));
    disc.position.copy(this.at(from, 0.03));
    disc.renderOrder = 1;
    const sheen = new THREE.Mesh(this.discGeo, additive(c, 0.35));
    sheen.position.copy(disc.position).y += 0.01;
    this.group.add(disc, sheen);
    let bubble = 0;
    return {
      update: (_fx, t) => {
        const r = Math.max(0.05, poisonFieldRadius(radius, t));
        disc.scale.setScalar(r);
        sheen.scale.setScalar(r * 0.8);
        const fade = 1 - Math.max(0, (t - 0.8) / 0.2);
        (disc.material as THREE.MeshBasicMaterial).opacity = 0.7 * fade;
        (sheen.material as THREE.MeshBasicMaterial).opacity = 0.3 * fade;
        if ((bubble += 1) % 4 === 0) {
          const a = Math.random() * Math.PI * 2;
          const d = Math.sqrt(Math.random()) * r;
          this.particles.emit({ at: disc.position.clone().add(new THREE.Vector3(Math.cos(a) * d, 0.05, Math.sin(a) * d)), count: 1, speed: [0.1, 0.3], dir: new THREE.Vector3(0, 1, 0), cone: 0.2, life: [0.5, 0.9], size: [0.06, 0.12], color: c, rise: 0.6 });
        }
      },
      dispose: () => {
        this.group.remove(disc, sheen);
        (disc.material as THREE.Material).dispose();
        (sheen.material as THREE.Material).dispose();
      },
    };
  }

  /** Ice up out of the floor across the circle the sim hit, each blade rising on its own beat. */
  private spikes(fx: Vfx): Live {
    const from = fx.points[0];
    const to = fx.points[1] ?? from;
    const radius = Math.max(0.3, Math.hypot(to.x - from.x, to.y - from.y));
    const n = Math.max(6, Math.round(radius * radius * 9));
    const mesh = new THREE.InstancedMesh(this.spikeGeo, this.ice.clone(), n);
    const seats: { p: THREE.Vector3; h: number; tilt: THREE.Euler; up: number }[] = [];
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996;
      const d = Math.sqrt((i + 0.5) / n) * radius * 0.95;
      const p = this.at({ x: from.x + Math.cos(a) * d, y: from.y + Math.sin(a) * d }, -0.05);
      seats.push({ p, h: 0.5 + ((i * 7919) % 97) / 97 * 0.9 * (1 - d / radius * 0.5), tilt: new THREE.Euler(Math.cos(a) * 0.35 * (d / radius), 0, -Math.sin(a) * 0.35 * (d / radius)), up: d / radius });
    }
    mesh.castShadow = true;
    this.group.add(mesh);
    const stands = (fx.ttl ?? 0) > SPIKE_TTL;
    this.lamps.flash(this.at(from, 1), new THREE.Color(0x9fd8ff), 14, radius * 2 + 3, 0.3);
    this.particles.emit({ at: this.at(from, 0.3), count: 24, spread: radius * 0.6, speed: [0.6, 2], dir: new THREE.Vector3(0, 1, 0), cone: 0.6, life: [0.3, 0.8], size: [0.05, 0.1], color: [0xdff4ff, 0x8fd0ff], drag: 1.5 });
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    return {
      update: (_fx, t) => {
        const a = spikeAlpha(t, fx.ttl);
        seats.forEach((s, i) => {
          const rise = Math.min(1, Math.max(0, (t * (stands ? 6 : 2.5)) - s.up * 0.6)) * a;
          m.compose(s.p, q.setFromEuler(s.tilt), new THREE.Vector3(1, Math.max(0.001, s.h * rise * (stands ? 1.5 : 1)), 1));
          mesh.setMatrixAt(i, m);
        });
        mesh.instanceMatrix.needsUpdate = true;
        (mesh.material as THREE.MeshStandardMaterial).opacity = Math.min(1, a * 1.2);
      },
      dispose: () => {
        this.group.remove(mesh);
        (mesh.material as THREE.Material).dispose();
      },
    };
  }

  /** Shockwave's cone: a front of broken ground racing out between its two rim points. */
  private wedge(fx: Vfx, c: THREE.Color): Live {
    const [o, left, right] = fx.points;
    if (!left || !right) return { update() {}, dispose() {} };
    const a0 = Math.atan2(left.y - o.y, left.x - o.x);
    let a1 = Math.atan2(right.y - o.y, right.x - o.x);
    while (a1 < a0) a1 += Math.PI * 2;
    const reach = Math.hypot(left.x - o.x, left.y - o.y);
    const seg = 24;
    const pos: number[] = [0, 0, 0];
    for (let i = 0; i <= seg; i++) {
      const a = a0 + ((a1 - a0) * i) / seg;
      pos.push(Math.cos(a), 0, Math.sin(a));
    }
    const idx: number[] = [];
    for (let i = 1; i <= seg; i++) idx.push(0, i + 1, i);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    const fan = new THREE.Mesh(geo, additive(c, 0.5, THREE.DoubleSide));
    fan.position.copy(this.at(o, 0.04));
    this.group.add(fan);
    for (let i = 0; i < 18; i++) {
      const a = a0 + (a1 - a0) * (i / 17);
      const d = reach * (0.3 + 0.7 * ((i * 37) % 17) / 17);
      this.particles.emit({ at: this.at({ x: o.x + Math.cos(a) * d, y: o.y + Math.sin(a) * d }, 0.1), count: 3, speed: [0.5, 1.8], dir: new THREE.Vector3(0, 1, 0), cone: 0.5, life: [0.4, 0.8], size: [0.15, 0.3], color: 0x9a8a72, normal: true, gravity: 3 });
    }
    return {
      update: (_fx, t) => {
        fan.scale.setScalar(Math.max(0.05, reach * (0.25 + 0.75 * Math.min(1, t * 1.5))));
        (fan.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - t);
      },
      dispose: () => {
        this.group.remove(fan);
        geo.dispose();
        (fan.material as THREE.Material).dispose();
      },
    };
  }

  /** A melee cut: a crescent sweeping across in front of whoever swung. */
  private slash(fx: Vfx, c: THREE.Color): Live {
    const from = fx.points[0];
    const to = fx.points[1] ?? from;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const geo = new THREE.RingGeometry(0.75, 1.05, 24, 1, 0, Math.PI * 0.55);
    const arc = new THREE.Mesh(geo, additive(c.clone().lerp(new THREE.Color(1, 1, 1), 0.5), 0.8, THREE.DoubleSide));
    const pivot = new THREE.Group();
    pivot.position.copy(this.at(from, 1.05));
    arc.rotation.x = -Math.PI / 2 + 0.35;
    pivot.add(arc);
    this.group.add(pivot);
    return {
      update: (_fx, t) => {
        pivot.rotation.y = -angle + Math.PI * 0.55 * (0.5 - t) + Math.PI / 2 - Math.PI * 0.275;
        (arc.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - t);
      },
      dispose: () => {
        this.group.remove(pivot);
        geo.dispose();
        (arc.material as THREE.Material).dispose();
      },
    };
  }

  dispose(): void {
    for (const l of this.live.values()) l.dispose();
    this.live.clear();
  }
}
