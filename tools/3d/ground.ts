/**
 * THE GROUND'S PAGE: a real descent, built by the real sim and drawn by the real
 * 3D renderer, shot at the places a fault hides — the ways in and out, a clump
 * of boulders, a lake's shore, a seam, a lock, the hero — in one picture.
 *
 *   PAGE=ground QUERY='zone=0&depth=4&seed=1&views=entrance,exit,boulder,lake&sim=6&walk=1' node tools/3d/lineup.mjs out.png
 */
import * as THREE from 'three';
import { Rng } from '../../src/rng';
import { RunSim, TICK } from '../../src/sim/run';
import { ladderCharacter } from '../../src/sim/loadout';
import { equipSkill } from '../../src/sim/character';
import { WALL } from '../../src/sim/grid';
import type { Vec2 } from '../../src/sim/grid';
import { createThreeRenderer, harness } from '../../src/render/three';
import { Figure } from '../../src/gl/bodies';
import { readPalette, walkOverlay } from '../../src/render/renderer';

const ask = new URLSearchParams(location.search);
// A PLAYED descent runs on a clock of its own, a sixtieth a frame, however slowly the software GPU draws them.
let clock = 0;
if (ask.has('play')) performance.now = () => clock;
const zone = Number(ask.get('zone') ?? 0);
const depth = Number(ask.get('depth') ?? 1);
const seed = Number(ask.get('seed') ?? 1);
const views = (ask.get('views') ?? 'entrance,exit,boulder,lake').split(',');
const zoom = Number(ask.get('zoom') ?? 3);
walkOverlay(ask.has('walk'));

const hero = ladderCharacter(Math.min(8, 1 + zone * 3 + Math.floor(depth / 5)), new Rng(seed * 7 + depth), ask.get('skill') ?? 'strike');
hero.trade = ask.get('trade') ?? 'warrior'; // a trade with a body, or the hero is his pixel frames on a card
if (ask.get('mover')) equipSkill(hero, ask.get('mover')!, 'movement');
const sim = new RunSim([], hero, new Rng(seed * 101 + depth * 13 + zone), { where: { zone, rung: depth } });
const s = sim.state;
for (let t = 0; t < Number(ask.get('sim') ?? 0) && s.status === 'running'; t += TICK) sim.step(TICK);

const { grid } = s.map;
/** The first cell a test answers, scanning out from the entrance, or the entrance itself. */
const find = (hit: (x: number, y: number) => boolean): Vec2 => {
  let best: Vec2 | null = null;
  let far = Infinity;
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const d = Math.hypot(x - s.map.entrance.x, y - s.map.entrance.y);
      if (d < far && hit(x, y)) (best = { x, y }), (far = d);
    }
  }
  return best ?? s.map.entrance;
};
const rockIsland = (x: number, y: number): boolean => {
  if (grid.at(x, y) !== WALL) return false;
  let open = 0;
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (grid.inBounds(x + dx, y + dy) && grid.walkable(x + dx, y + dy)) open++;
  return open >= 3;
};
const focusOf = (v: string): Vec2 => {
  const [kind, at] = v.split('@');
  if (at) return { x: Number(at.split(':')[0]), y: Number(at.split(':')[1]) };
  if (kind === 'entrance') return s.map.entrance;
  if (kind === 'exit') return s.map.exit;
  if (kind === 'hero') return s.hero;
  if (kind === 'boulder') return find(rockIsland);
  if (kind === 'lake') return find((x, y) => grid.wet(x, y) && grid.walkable(x, y));
  if (kind === 'seam') return s.nodes[0] ?? s.map.entrance;
  if (kind === 'hoard') return s.hoards[0] ?? s.map.entrance;
  if (kind === 'pack') return s.monsters.find((m) => !m.dead) ?? s.map.entrance;
  return s.map.entrance;
};

const W = innerWidth;
const H = innerHeight;
const cols = Number(ask.get('cols') ?? Math.min(views.length, 2));
const rows = Math.ceil(views.length / cols);
const tw = Math.floor(W / cols);
const th = Math.floor(H / rows);
document.body.style.margin = '0';
document.body.style.background = '#000';
const out = document.createElement('canvas');
out.width = W;
out.height = H;
const ctx = out.getContext('2d')!;
const host = document.createElement('div');
Object.assign(host.style, { position: 'absolute', left: '0', top: '0', width: `${tw}px`, height: `${th}px` });
document.body.append(host);
const renderer = await createThreeRenderer(host, readPalette(document.documentElement));
if (!renderer) throw new Error('no 3D renderer');
renderer.resize(tw, th);
renderer.setZoom(zoom);
const frame = () => new Promise((go) => requestAnimationFrame(go));
for (let k = 0, still = 0, was = -1; k < 900 && still < 90; k++) {
  renderer.draw(s, 1);
  const boards = renderer.stats().boards;
  still = boards === was ? still + 1 : 0;
  was = boards;
  if (boards === 0) break;
  await frame();
}
if (ask.has('play')) {
  // Every body's planted foot followed through the fight, as the renderer draws it.
  const seen = new Map<number, { feet: { x: number; y: number; z: number }[]; floor: number; slide: number[]; by: Record<string, number[]>; kind: string; moving: number; frames: number; jumps: number; last?: { x: number; z: number }; yaw?: number }>();
  const frames = Number(ask.get('play')) * 60;
  harness.pictures = false;
  for (let f = 0; f < frames && s.status === 'running'; f++) {
    clock += 1000 / 60;
    if (f % 2 === 0) sim.step(TICK);
    renderer.draw(s, 1, { alpha: (f % 2) / 2, steps: f % 2 === 0 ? 1 : 0 });
    for (const e of [s.hero, ...s.monsters]) {
      if (e.dead) continue;
      const body = renderer.bodyAt(e.id);
      if (!body) continue;
      body.updateMatrixWorld(true);
      let r = seen.get(e.id);
      if (!r) seen.set(e.id, (r = { feet: [], floor: Infinity, slide: [], by: {}, kind: e.kind === 'hero' ? 'hero' : e.defId ?? e.sprite, moving: 0, frames: 0, jumps: 0 }));
      r.frames++;
      const root = body.parent!.position;
      if (r.last && Math.hypot(root.x - r.last.x, root.z - r.last.z) > 0.3) r.jumps++;
      const pace = r.last ? Math.hypot(root.x - r.last.x, root.z - r.last.z) * 60 : 0;
      const yaw = body.parent!.rotation.y;
      const turning = r.yaw !== undefined && Math.abs(Math.atan2(Math.sin(yaw - r.yaw), Math.cos(yaw - r.yaw))) * 60 > 1.5;
      r.yaw = yaw;
      r.last = { x: root.x, z: root.z };
      const doing = turning ? 'turning' : pace > 0.3 ? `walking ${e.action}` : pace < 0.05 ? `standing ${e.action}` : 'easing';
      Figure.trace = ask.has('trace');
      if (ask.get('trace') === 'doing' && e === s.hero && doing === ask.get('doing')) console.log(`trace f${f} ${doing} pace ${pace.toFixed(2)} ${body.userData.playing} sim ${e.action} timer ${e.actionTimer.toFixed(2)} hop ${e.hop ? 'yes' : 'no'}`);
      if (ask.get('trace') === '1' && e === s.hero && pace > 0.3 && f % 3 === 0 && f < 60 * 12) {
        const heading = r.last ? Math.atan2(root.z - (r as { lz?: number }).lz!, root.x - (r as { lx?: number }).lx!) : 0;
        const faces = Math.PI / 2 - yaw;
        console.log(`trace f${f} pace ${pace.toFixed(2)} sim ${e.action} facing ${(e.facing * 57.3).toFixed(0)} body ${((Math.atan2(Math.sin(faces), Math.cos(faces))) * 57.3).toFixed(0)} heading ${(heading * 57.3).toFixed(0)} path ${e.path.slice(0, 3).map((w) => `${w.x},${w.y}`).join(' ')} at ${e.x.toFixed(2)},${e.y.toFixed(2)}`);
      }
      (r as { lx?: number }).lx = root.x;
      (r as { lz?: number }).lz = root.z;
      ['LeftFoot', 'RightFoot'].forEach((n, i) => {
        const bone = body.getObjectByName(n);
        if (!bone) return;
        const w = bone.getWorldPosition(new THREE.Vector3());
        w.y -= root.y; // off the ground the body stands on, which a funnel or a shore moves
        const was = r!.feet[i];
        r!.floor = Math.min(r!.floor, w.y);
        if (was && w.y - r!.floor < 0.03 && was.y - r!.floor < 0.03) {
          const v = Math.hypot(w.x - was.x, w.z - was.z) * 60;
          r!.slide.push(v);
          (r!.by[doing] ??= []).push(v);
        }
        r!.feet[i] = { x: w.x, y: w.y, z: w.z };
      });
    }
    if (f % 300 === 0) console.log(`  played ${(f / 60).toFixed(0)}s`), await frame();
  }
  const kinds = new Map<string, number[]>();
  for (const r of seen.values()) {
    kinds.set(r.kind, [...(kinds.get(r.kind) ?? []), ...r.slide]);
    if (r.kind === (ask.get('split') ?? 'hero')) for (const [k, v] of Object.entries(r.by)) kinds.set(`  ${r.kind} ${k}`, [...(kinds.get(`  ${r.kind} ${k}`) ?? []), ...v]);
  }
  for (const [k, sl] of kinds) {
    sl.sort((a, b) => a - b);
    const q = (t: number) => (sl.length ? sl[Math.floor(sl.length * t)] : NaN).toFixed(2);
    console.log(`${k.padEnd(12)} planted foot: median ${q(0.5)} m/s, p90 ${q(0.9)}, over ${sl.length} frames`);
  }
  console.log(`bodies drawn jumping over 0.3 m in a frame: ${[...seen.values()].reduce((n, r) => n + r.jumps, 0)}; ${s.status} at ${s.elapsed.toFixed(1)}s`);
  harness.pictures = true;
  // A FILMSTRIP of the hero from here, a frame every `every` sixtieths, played on the same clock.
  const film = Number(ask.get('film') ?? 0);
  if (film > 0) {
    const every = Number(ask.get('every') ?? 6);
    const fw = Math.floor(W / Math.min(film, 6));
    const fh = Math.floor(fw * 0.75);
    const strip = document.createElement('canvas');
    strip.width = fw * Math.min(film, 6);
    strip.height = fh * Math.ceil(film / 6);
    const sg = strip.getContext('2d')!;
    renderer.resize(fw, fh);
    renderer.setZoom(5);
    renderer.follow();
    for (let n = 0, f = 0; n < film && s.status === 'running'; f++) {
      clock += 1000 / 60;
      if (f % 2 === 0) sim.step(TICK);
      renderer.draw(s, 1, { alpha: (f % 2) / 2, steps: f % 2 === 0 ? 1 : 0 });
      if (ask.get('watch')) {
        for (const m of s.monsters) {
          if (m.defId !== ask.get('watch')) continue;
          const b = renderer.bodyAt(m.id);
          if (f % 3 === 0) console.log(`watch ${(f / 60).toFixed(2)}s #${m.id} dead ${m.dead} action ${m.action} life ${m.life.toFixed(0)} stun ${(m.stun ?? 0).toFixed(2)} ${m.stunKind ?? ''} at ${m.x.toFixed(2)},${m.y.toFixed(2)} ${b?.userData.playing ?? ''}`);
        }
      }
      if (f % every !== 0) continue;
      for (const c of host.querySelectorAll('canvas')) sg.drawImage(c, (n % 6) * fw, Math.floor(n / 6) * fh, fw, fh);
      sg.fillStyle = '#fff';
      sg.font = '12px monospace';
      sg.fillText(`${(f / 60).toFixed(2)}s ${s.hero.action}`, (n % 6) * fw + 4, Math.floor(n / 6) * fh + 14);
      n++;
    }
    document.body.append(strip);
    host.remove();
  }
}
const filmed = Number(ask.get('film') ?? 0) > 0;
if (!filmed) {
  for (const [n, v] of views.entries()) {
    const at = focusOf(v);
    renderer.lookAt({ x: at.x + 50, y: at.y });
    renderer.draw(s, 1);
    renderer.lookAt(at);
    for (let k = 0; k < 3; k++) renderer.draw(s, 1), await frame();
    renderer.draw(s, 1);
    const x = (n % cols) * tw;
    const y = Math.floor(n / cols) * th;
    for (const c of host.querySelectorAll('canvas')) ctx.drawImage(c, x, y, tw, th);
    ctx.fillStyle = '#fff';
    ctx.font = '16px monospace';
    ctx.fillText(`${v} (${at.x.toFixed(1)}, ${at.y.toFixed(1)})`, x + 8, y + 20);
  }
  host.remove();
  document.body.append(out);
}
console.log(`zone ${zone} depth ${depth} seed ${seed}: ${grid.width}x${grid.height}, ${s.monsters.length} bodies, ${s.nodes.length} seams, ${s.hoards.length} locks, entrance ${s.map.entrance.x},${s.map.entrance.y}`);
(globalThis as Record<string, unknown>).__done = true;
