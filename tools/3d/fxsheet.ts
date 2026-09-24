/**
 * THE EFFECTS SHEET'S PAGE: every effect kind the sim emits, laid out on one
 * floor at the moment asked, through the same `Effects` a descent runs — so a
 * shape is judged without a descent having to reach a cast first.
 */
import * as THREE from 'three';
import { loadAssets } from '../../src/gl/assets';
import { Stage } from '../../src/gl/stage';
import { Lamps } from '../../src/gl/lights';
import { Particles } from '../../src/gl/particles';
import { Lightning } from '../../src/gl/lightning';
import { Effects } from '../../src/gl/effects';
import { material } from '../../src/gl/terrain';
import { shared } from '../../src/gl/shaders';
import { readPalette } from '../../src/render/renderer';
import type { RunState, Vfx } from '../../src/sim/run';

const ask = new URLSearchParams(location.search);
const at = Number(ask.get('at') ?? 0.35);
const canvas = document.createElement('canvas');
document.body.style.margin = '0';
document.body.append(canvas);
const stage = new Stage(canvas);
stage.resize(innerWidth, innerHeight);
const assets = await loadAssets('gl', ['ground'], 4);
const s = shared();
const lamps = new Lamps(stage.quality);
lamps.tone(0xa89c88, 0x3a2e22, 1.15, 0xe6dac4, 1.5);
lamps.moonFrom.set(9, 26, 14);
const motes = new Particles();
const bolts = new Lightning();
stage.scene.add(lamps.group, motes.group, bolts.mesh);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 30).rotateX(-Math.PI / 2), material(assets, 'sand', 0xcfc4ae, s, {}, false));
floor.position.set(8, 0, 4);
floor.receiveShadow = true;
stage.scene.add(floor);
const palette = readPalette(document.documentElement);
const fx = new Effects(palette, motes, bolts, lamps, (_, p) => new THREE.Vector3(p.x, 1.2, p.y), () => 0);
stage.scene.add(fx.group);

const P = (x: number, y: number) => ({ x, y });
const row = (i: number) => (i % 4) * 5;
const col = (i: number) => Math.floor(i / 4) * 5;
const kinds: [string, (x: number, y: number) => { points: { x: number; y: number }[]; damageType: string; ttl: number }][] = [
  ['burst', (x, y) => ({ points: [P(x, y), P(x + 1.6, y)], damageType: 'fire', ttl: 0.5 })],
  ['blight_field', (x, y) => ({ points: [P(x, y), P(x + 1.4, y)], damageType: 'poison', ttl: 4 })],
  ['spikes', (x, y) => ({ points: [P(x, y), P(x + 1.3, y)], damageType: 'cold', ttl: 0.3 })],
  ['wedge', (x, y) => ({ points: [P(x - 1.5, y + 1.5), P(x + 1.5, y - 0.5), P(x + 0.5, y + 1.5)], damageType: 'physical', ttl: 0.45 })],
  ['slash', (x, y) => ({ points: [P(x, y), P(x + 1, y)], damageType: 'physical', ttl: 0.25 })],
  ['sweep', (x, y) => ({ points: [P(x, y), P(x + 1.5, y)], damageType: 'physical', ttl: 0.4 })],
  ['flame', (x, y) => ({ points: [P(x - 2, y), P(x + 2, y)], damageType: 'fire', ttl: 0.4 })],
  ['arrow', (x, y) => ({ points: [P(x - 2, y), P(x + 2, y)], damageType: 'lightning', ttl: 0.3 })],
  ['shard', (x, y) => ({ points: [P(x - 2, y), P(x + 2, y)], damageType: 'cold', ttl: 0.3 })],
  ['arc', (x, y) => ({ points: [P(x - 2, y), P(x + 2, y)], damageType: 'lightning', ttl: 0.3 })],
  ['blink', (x, y) => ({ points: [P(x - 1.5, y), P(x + 1.5, y)], damageType: 'lightning', ttl: 0.4 })],
  ['leap', (x, y) => ({ points: [P(x - 1.5, y), P(x + 1.5, y)], damageType: 'physical', ttl: 0.5 })],
];
const vfx: Vfx[] = kinds.map(([kind, make], i) => ({ kind, ...make(row(i), col(i)), age: 0 }));
const state = { vfx, hero: { x: 0, y: 0 } } as unknown as RunState;
fx.sync(state);
for (const v of vfx) v.age = v.ttl * at;
fx.sync(state);
motes.setScale(innerHeight, stage.camera.fov);
for (let k = 0; k < 6; k++) motes.update(0.016), bolts.update(0.016, stage.camera);
stage.distance = 30;
stage.place(new THREE.Vector3(7.5, 0, 5), 0, true);
lamps.update(stage.focus, stage.focus, 0, 0);
stage.render(0.016);
(globalThis as Record<string, unknown>).__done = true;
