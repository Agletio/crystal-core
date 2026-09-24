/**
 * THE LINEUP'S PAGE: every body named, side by side, in the pose a clip holds at
 * each moment asked — what `lineup.mjs` photographs. Reads the same shards and
 * the same `Figure` the game does, so a pose here is the pose a descent draws.
 */
import * as THREE from 'three';
import { loadAssets } from '../../src/gl/assets';
import { BODIES, Figure, bankOf, makeTemplate } from '../../src/gl/bodies';
import type { Template } from '../../src/gl/bodies';
import { shared } from '../../src/gl/shaders';

const ask = new URLSearchParams(location.search);
const ids = (ask.get('bodies') ?? 'aethermancer,alchemist,obreth,mahthar,husk,gaunt,heap,bonecaller,answering,smith,hob,nell,crawler,hound,lampwright').split(',');
const clip = ask.get('clip') ?? '';
const moments = (ask.get('at') ?? '0.5').split(',').map(Number);
const turn = Number(ask.get('turn') ?? 0.5);

const canvas = document.createElement('canvas');
document.body.style.margin = '0';
document.body.append(canvas);
const W = innerWidth;
const H = innerHeight;
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x2a2a2e);
scene.add(new THREE.HemisphereLight(0xdde4ff, 0x302820, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(4, 8, 10);
scene.add(sun);

const assets = await loadAssets('gl', ['heroes', 'shallows', 'folk', 'clips', 'gear'], 4);
const gear = ask.get('gear') ?? '';
const turn3 = (ask.get('grip') ?? '0,0,0').split(',').map(Number);
const bank = bankOf(assets.models.clips);
const s = shared();
const made = new Map<string, Template>();
const gap = 2.4;
let widest = 0;
moments.forEach((at, row) => {
  ids.forEach((id, col) => {
    const def = BODIES[id];
    const model = def && assets.models[def.model];
    if (!model) return;
    const t = made.get(id) ?? makeTemplate(def, model, bank);
    if (!made.has(id) && ask.has('debug')) console.log(`${id} template ${t.height.toFixed(3)} m`);
    made.set(id, t);
    const fig = new Figure(def, t, s, 'common', 1, false);
    const scale = Math.min(1, 2.1 / fig.height);
    fig.root.scale.setScalar(scale);
    fig.root.position.set(col * gap, -row * 2.6, 0);
    fig.root.rotation.y = turn;
    const piece = gear && assets.models[gear];
    const hand = fig.hands.get(ask.get('hand') ?? 'RightHand');
    if (piece && hand) {
      const held = piece.gltf.scene.clone(true);
      held.rotation.set(turn3[0], turn3[1], turn3[2]);
      const k = 1 / hand.getWorldScale(new THREE.Vector3()).x; // the hand sits under the armature's centimetres
      held.scale.setScalar(k);
      held.position.y = Number(ask.get('palm') ?? 0.085) * k; // the bone's origin is the WRIST; the grip is in the palm
      hand.add(held);
    }
    if (clip) fig.hold(clip, at);
    scene.add(fig.root);
    widest = Math.max(widest, col);
  });
});
if (ask.has('debug')) {
  const src = made.get('gaunt')?.scene ?? assets.models.husk?.gltf.scene;
  src?.updateMatrixWorld(true);
  src?.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh) return;
    const sc = (x: THREE.Matrix4) => new THREE.Vector3().setFromMatrixScale(x).toArray().map((v) => +v.toFixed(4)).join(',');
    const tr = (x: THREE.Matrix4) => new THREE.Vector3().setFromMatrixPosition(x).toArray().map((v) => +v.toFixed(3)).join(',');
    const hips = m.skeleton.bones.find((b) => b.name === 'Hips')!;
    const i = m.skeleton.bones.indexOf(hips);
    console.log(`bind s ${sc(m.bindMatrix)} t ${tr(m.bindMatrix)} | world s ${sc(m.matrixWorld)} | hips world s ${sc(hips.matrixWorld)} t ${tr(hips.matrixWorld)} | hips inv s ${sc(m.skeleton.boneInverses[i])} t ${tr(m.skeleton.boneInverses[i])}`);
    const prod = m.skeleton.bones.map((b, k) => `${b.name}:${new THREE.Vector3().setFromMatrixScale(new THREE.Matrix4().multiplyMatrices(b.matrixWorld, m.skeleton.boneInverses[k])).x.toFixed(3)}`);
    console.log(`world*inv ${prod.join(' ')}`);
    console.log(`bones same objects as scene? ${m.skeleton.bones.every((b) => { let p: THREE.Object3D | null = b; while (p?.parent) p = p.parent; return p === src; })}`);
    const sw = m.geometry.getAttribute('skinWeight');
    const si = m.geometry.getAttribute('skinIndex');
    console.log(`skinWeight ${sw.array.constructor.name} normalized ${sw.normalized} v0 ${[sw.getX(0), sw.getY(0), sw.getZ(0), sw.getW(0)].map((x) => x.toFixed(3))} raw ${Array.from(sw.array.slice(0, 4))} | skinIndex ${si.array.constructor.name} ${Array.from(si.array.slice(0, 4))}`);
    const pos = m.geometry.getAttribute('position');
    const v = new THREE.Vector3().fromBufferAttribute(pos, 0);
    console.log(`v0 raw ${v.toArray().map((x) => x.toFixed(3))} normalized ${pos.normalized} ${pos.array.constructor.name}`);
    m.applyBoneTransform(0, v);
    console.log(`v0 skinned local ${v.toArray().map((x) => x.toFixed(3))}`);
  });
}
const mid = (widest * gap) / 2;
const rows = moments.length;
const spanX = widest * gap + gap;
const spanY = rows * 2.6;
const aspect = W / H;
const half = Math.max(spanX / aspect, spanY) / 2 + 0.2;
const camera = new THREE.OrthographicCamera(-half * aspect, half * aspect, half, -half, 0.1, 100);
camera.position.set(mid, 1.05 - (rows - 1) * 1.3 + 1.2, 30);
camera.lookAt(mid, 1.05 - (rows - 1) * 1.3, 0);
renderer.render(scene, camera);
(globalThis as Record<string, unknown>).__done = true;
