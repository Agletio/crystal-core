/**
 * THE LIGHT: a cold moon overhead casting the one shadow map, the
 * hero's own lamp, and a POOL of point lights handed each frame to whichever
 * braziers, candles and lava vents are nearest the eye. A forward renderer
 * pays per light per pixel, so the level holds a hundred sources and the frame
 * lights a dozen; a source leaving the pool has already faded to nothing by
 * the edge of it, so nothing pops.
 *
 * A FLASH — a bolt landing, a blink — outranks every lamp for its few frames.
 */
import * as THREE from 'three';
import type { Quality } from './stage';

/** A lamp the level owns: the pool hands the nearest of these a real light each frame. */
export interface LightSource {
  kind: string;
  at: THREE.Vector3;
  color: THREE.Color;
  power: number;
  range: number;
  flicker: number;
  seed: number;
}

interface Flash {
  at: THREE.Vector3;
  color: THREE.Color;
  power: number;
  range: number;
  life: number;
  left: number;
}

const REACH = 24; // metres from the eye at which a lamp has faded out of the pool

export class Lamps {
  readonly group = new THREE.Group();
  readonly moon: THREE.DirectionalLight;
  readonly hero: THREE.PointLight;
  private readonly pool: THREE.PointLight[] = [];
  private readonly flashes: Flash[] = [];
  private sources: LightSource[] = [];
  heroPower = 16;

  constructor(quality: Quality) {
    const high = quality === 'high';
    this.group.add(new THREE.HemisphereLight(0x3a4468, 0x1c0d08, 0.85));
    this.moon = new THREE.DirectionalLight(0x8e9cff, 1.3);
    this.moon.castShadow = true;
    this.moon.shadow.mapSize.set(high ? 2048 : 1024, high ? 2048 : 1024);
    const cam = this.moon.shadow.camera;
    cam.left = cam.bottom = -21;
    cam.right = cam.top = 21;
    cam.near = 1;
    cam.far = 80;
    this.moon.shadow.bias = -0.0005;
    this.moon.shadow.normalBias = 0.035;
    this.moon.shadow.radius = 3;
    this.group.add(this.moon, this.moon.target);
    this.hero = new THREE.PointLight(0xffd9b8, this.heroPower, 14, 1.4);
    this.group.add(this.hero);
    for (let i = 0; i < (high ? 12 : 4); i++) {
      const lamp = new THREE.PointLight(0xffffff, 0, 8, 2);
      this.pool.push(lamp);
      this.group.add(lamp);
    }
  }

  use(sources: LightSource[]): void {
    this.sources = sources;
  }

  flash(at: THREE.Vector3, color: THREE.ColorRepresentation, power: number, range: number, life: number): void {
    if (this.flashes.length >= 4) this.flashes.shift();
    this.flashes.push({ at: at.clone(), color: new THREE.Color(color), power, range, life, left: life });
  }

  update(eye: THREE.Vector3, hero: THREE.Vector3, t: number, dt: number): void {
    this.moon.position.set(eye.x - 14, eye.y + 26, eye.z - 11);
    this.moon.target.position.copy(eye);
    this.hero.position.set(hero.x + 0.6, hero.y + 3.8, hero.z + 0.9);
    this.hero.intensity = this.heroPower * (0.96 + 0.04 * Math.sin(t * 2.3));

    for (let i = this.flashes.length - 1; i >= 0; i--) {
      this.flashes[i].left -= dt;
      if (this.flashes[i].left <= 0) this.flashes.splice(i, 1);
    }
    const near = this.sources
      .map((s) => ({ s, d: s.at.distanceTo(eye) }))
      .filter((c) => c.d < REACH)
      .sort((a, b) => b.s.power / (1 + (b.d * b.d) / 60) - a.s.power / (1 + (a.d * a.d) / 60));
    let slot = 0;
    for (const f of this.flashes) {
      if (slot >= this.pool.length) break;
      const lamp = this.pool[slot++];
      const k = f.left / f.life;
      lamp.position.copy(f.at);
      lamp.color.copy(f.color);
      lamp.distance = f.range;
      lamp.intensity = f.power * k * k;
    }
    for (const { s, d } of near) {
      if (slot >= this.pool.length) break;
      const lamp = this.pool[slot++];
      const wobble = Math.sin(t * 9.1 + s.seed) * 0.5 + Math.sin(t * 23.7 + s.seed * 1.7) * 0.3 + Math.sin(t * 3.3 + s.seed * 0.3) * 0.2;
      const fade = 1 - THREE.MathUtils.smoothstep(d, REACH * 0.62, REACH);
      lamp.position.copy(s.at);
      lamp.color.copy(s.color);
      lamp.distance = s.range;
      lamp.intensity = s.power * fade * (1 + wobble * s.flicker);
      lamp.position.y += wobble * s.flicker * 0.08;
    }
    for (; slot < this.pool.length; slot++) this.pool[slot].intensity = 0;
  }
}
