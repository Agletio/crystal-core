/**
 * EVERY BODY'S CLIPS, MEASURED: stood up the way the game stands them and
 * played frame by frame on the CPU, so what is printed is what a descent draws —
 *
 *   ground   how far the lower foot rides off the floor (min, and at the median frame): + floats, − sinks
 *   depicts  metres a second the planted foot slides back, which is how fast the clip walks, against what the game read
 *   wide     the body's half-width at rest, against the sim's radius for it
 *
 *   PAGE=gait node tools/3d/lineup.mjs out.png
 */
import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { loadAssets } from '../../src/gl/assets';
import { BODIES, SWINGS, bankOf, clipOf, makeTemplate } from '../../src/gl/bodies';

const ask = new URLSearchParams(location.search);
const ids = (ask.get('bodies') ?? Object.keys(BODIES).join(',')).split(',');
const assets = await loadAssets('gl', ['heroes', 'shallows', 'folk', 'clips'], 1);
const bank = bankOf(assets.models.clips)!;
const lines: string[] = [];
const say = (s: string) => (lines.push(s), console.log(s));

const FEET = ['LeftFoot', 'RightFoot'];
for (const id of ids) {
  const def = BODIES[id];
  const model = def && assets.models[def.model];
  if (!def || !model || def.still) continue;
  const t = makeTemplate(def, model, bank);
  const grow = def.height / t.height;
  const scene = cloneSkinned(t.scene);
  scene.updateMatrixWorld(true);
  const bone = (n: string) => scene.getObjectByName(n)!;
  const p = new THREE.Vector3();
  const restFoot = Math.min(...FEET.map((n) => bone(n).getWorldPosition(p).y));
  const box = new THREE.Box3().setFromObject(scene);
  const wide = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) / 2;
  say(`\n${id}: ${def.height} m (template ${t.height.toFixed(2)}, ×${grow.toFixed(3)}), rest ankle ${(restFoot * grow).toFixed(3)} m, half-width ${(wide * grow).toFixed(2)} m`);
  const mixer = new THREE.AnimationMixer(scene);
  const clips = new Set<string>([def.idle, def.ready ?? '', ...def.move, ...def.attack.map((w) => w.clip), ...(def.cast ?? []).map((w) => w.clip), def.hit.clip, def.death.clip]);
  if (def.shard === 'heroes') for (const ws of Object.values(SWINGS)) for (const w of ws) clips.add(w.clip);
  if (ask.has('gaits')) for (const name of bank.clips.keys()) if (/walk|run|shamble/.test(name)) clips.add(name);
  for (const name of clips) {
    if (!name) continue;
    const clip = clipOf(t, name);
    if (!clip) {
      say(`  ${name}: MISSING`);
      continue;
    }
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.reset().play();
    const N = 48;
    const low: number[] = [];
    const lowest: number[] = [];
    const feet = FEET.map(() => [] as { y: number; z: number }[]);
    let hipsTop = -Infinity;
    for (let k = 0; k <= N; k++) {
      mixer.setTime((clip.duration * k) / N);
      scene.updateMatrixWorld(true);
      const ys = FEET.map((n, f) => {
        const w = bone(n).getWorldPosition(p);
        feet[f].push({ y: w.y, z: w.z });
        return w.y;
      });
      low.push(Math.min(...ys) - restFoot);
      let m = Infinity;
      scene.traverse((o) => ((o as THREE.Bone).isBone ? (m = Math.min(m, o.getWorldPosition(p).y)) : undefined));
      lowest.push(m);
      hipsTop = Math.max(hipsTop, bone('Hips').getWorldPosition(p).y);
    }
    const sorted = [...low].sort((a, b) => a - b);
    // THE PLANTED FOOT: within 3 cm of its own lowest, it slides back along the body's forward (+Z) as fast as the body walks.
    const slides: number[] = [];
    for (const track of feet) {
      const floor = Math.min(...track.map((f) => f.y));
      for (let k = 0; k < N; k++) {
        if (track[k].y - floor > 0.03 / grow || track[k + 1].y - floor > 0.03 / grow) continue;
        slides.push(-(track[k + 1].z - track[k].z) / (clip.duration / N));
      }
    }
    slides.sort((a, b) => a - b);
    const depicts = slides.length ? slides[Math.floor(slides.length / 2)] * grow : 0;
    const said = (clip.userData.speed as number) * grow;
    say(`  ${name.padEnd(18)} ${clip.duration.toFixed(2)}s  ground min ${(sorted[0] * grow * 100).toFixed(1)}cm median ${(sorted[N >> 1] * grow * 100).toFixed(1)}cm  lowest bone ${(Math.min(...lowest) * grow * 100).toFixed(0)}cm, at the end ${(Math.min(...lowest.slice(-12)) * grow * 100).toFixed(0)}cm  depicts ${depicts.toFixed(2)} m/s (the game reads ${said.toFixed(2)})`);
  }
}
const pre = document.createElement('pre');
pre.textContent = lines.join('\n');
Object.assign(pre.style, { color: '#ddd', font: '11px monospace', margin: '8px' });
document.body.style.background = '#111';
document.body.append(pre);
(globalThis as Record<string, unknown>).__done = true;
