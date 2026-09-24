/**
 * A BODY WALKED, and its planted foot watched: each body is carried across the
 * floor at the speeds asked, stepped exactly as a descent steps it, and the
 * foot on the ground is followed in the world. A foot that stays where it was
 * put reads 0 m/s; one skating reads how fast it skates. The picture is each
 * body's stride laid over itself, so a slide shows as a smear.
 *
 *   PAGE=walk QUERY='speeds=1,2.3,2.9,4&bodies=husk,heap' node tools/3d/lineup.mjs out.png
 */
import * as THREE from 'three';
import { loadAssets } from '../../src/gl/assets';
import { BODIES, Figure, bankOf, makeTemplate } from '../../src/gl/bodies';
import type { Pose } from '../../src/gl/bodies';
import { shared } from '../../src/gl/shaders';

const ask = new URLSearchParams(location.search);
const ids = (ask.get('bodies') ?? 'aethermancer,alchemist,obreth,mahthar,husk,gaunt,heap,bonecaller,answering').split(',');
const speeds = (ask.get('speeds') ?? '1,2.3,2.9,4').split(',').map(Number);
const assets = await loadAssets('gl', ['heroes', 'shallows', 'folk', 'clips'], 1);
const bank = bankOf(assets.models.clips);
const s = shared();

const W = innerWidth;
const H = innerHeight;
const canvas = document.createElement('canvas');
document.body.style.margin = '0';
document.body.append(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.autoClear = false;
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xdde4ff, 0x302820, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 2.2);
sun.position.set(3, 8, 10);
scene.add(sun);
renderer.setClearColor(0x2a2a2e);
renderer.clear();

const lines: string[] = [];
const cellW = W / speeds.length;
const cellH = H / ids.length;
const p = new THREE.Vector3();
for (const [row, id] of ids.entries()) {
  const def = BODIES[id];
  const model = def && assets.models[def.model];
  if (!def || !model || def.still) continue;
  const t = makeTemplate(def, model, bank);
  if (ask.get('gait')) def.move = [ask.get('gait')!.replace('*', id)];
  const report: string[] = [];
  for (const [col, v] of speeds.entries()) {
    const fig = new Figure(def, t, s, 'common', 1, false);
    scene.add(fig.root);
    const feet = ['LeftFoot', 'RightFoot'].map((n) => fig.model.getObjectByName(n)!);
    const dt = 1 / 60;
    let x = 0;
    const pose: Pose = { x, z: 0, lift: 0, facing: 0, moving: true, speed: v, dead: false, hurt: false, held: false, flash: 0, hidden: 0 };
    const prev = feet.map(() => new THREE.Vector3());
    const slide: number[] = [];
    let floor = Infinity;
    // Settle a second first, so the gait picked and its crossfade are over before anything is read.
    for (let k = 0; k < 60 * 3; k++) {
      x += v * dt;
      pose.x = x;
      fig.place(pose, dt);
      fig.step(pose, dt);
      fig.root.updateMatrixWorld(true);
      feet.forEach((f, i) => {
        f.getWorldPosition(p);
        if (k > 60) {
          floor = Math.min(floor, p.y);
          if (p.y - floor < 0.03 && prev[i].y - floor < 0.03) slide.push(Math.hypot(p.x - prev[i].x, p.z - prev[i].z) / dt);
        }
        prev[i].copy(p);
      });
    }
    slide.sort((a, b) => a - b);
    const med = slide.length ? slide[slide.length >> 1] : NaN;
    report.push(`${v}m/s: ${(fig as unknown as { base: string }).base.split('/')[1]} ${med.toFixed(2)}`);
    // A few strides laid over each other, the body pulled back to its start so the cell holds it.
    const shots = 5;
    for (let k = 0; k < shots; k++) {
      for (let j = 0; j < 8; j++) (x += v * dt), (pose.x = x), fig.place(pose, dt), fig.step(pose, dt);
      fig.root.position.x = 0;
      const cam = new THREE.OrthographicCamera(-1.6, 1.6, 2.4 * (cellH / cellW) * 1.35, -0.4, 0.1, 50);
      const span = Math.max(1, fig.height / 1.9);
      cam.left *= span, cam.right *= span, cam.top *= span, cam.bottom *= span;
      cam.updateProjectionMatrix();
      cam.position.set(0, fig.height * 0.5, 10);
      cam.lookAt(0, fig.height * 0.5, 0);
      renderer.setViewport(col * cellW, H - (row + 1) * cellH, cellW, cellH);
      renderer.setScissor(col * cellW, H - (row + 1) * cellH, cellW, cellH);
      renderer.setScissorTest(true);
      renderer.render(scene, cam);
    }
    fig.dispose();
  }
  lines.push(`${id.padEnd(13)} ${report.join('   ')}`);
  console.log(lines[lines.length - 1]);
}
(globalThis as Record<string, unknown>).__done = true;
