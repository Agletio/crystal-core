/**
 * THE 3D GROUND HELD AGAINST THE GRID IT IS DRAWN OFF: real descents are built
 * and played headless, and every tick asks whether what a body stands on, walks
 * through or is stopped by is what the picture shows there.
 *
 *   npx tsx tools/3d/audit.mts [zone,zone] [depth,depth] [seeds]
 *
 * Prints, per descent: rock drawn as floor (a wall nobody can see), boulders a
 * body can walk into, lanterns inside their rock, bodies inside a face, bodies
 * standing over a way down, bodies inside a chest or a seam.
 */
import * as THREE from 'three';
import { Rng } from '../../src/rng';
import { RunSim, TICK } from '../../src/sim/run';
import type { Entity } from '../../src/sim/run';
import { ladderCharacter } from '../../src/sim/loadout';
import { WALL } from '../../src/sim/grid';
import { buildTerrain } from '../../src/gl/terrain';
import { Clearance } from '../../src/gl/clearance';
import { shared } from '../../src/gl/shaders';
import type { Assets } from '../../src/gl/assets';

const zones = (process.argv[2] ?? '0,1,2').split(',').map(Number);
const depths = (process.argv[3] ?? '1,4,9').split(',').map(Number);
const seeds = Number(process.argv[4] ?? 2);
const BAND = 12; // metres a body is tall enough to reach into: its knees to its shoulders
const stub = { models: {}, surfaces: {}, decals: {}, icons: {} } as unknown as Assets;
const eye = new THREE.Vector2(Math.sin(Math.PI / 4), Math.cos(Math.PI / 4));

/** A body's half-width in the picture, as the renderer takes it: a sixth of its height, and a body of scale 1 is 1.25 m. */
const drawnRadius = (e: Entity): number => (e.kind === 'hero' ? 0.29 : Math.min(0.7, Math.max(0.24, 0.16 * 1.25 * e.scale)));

interface Tally { [k: string]: number }
const total: Tally = {};
const add = (t: Tally, k: string, n = 1) => (t[k] = (t[k] ?? 0) + n);

for (const zone of zones) {
  for (const depth of depths) {
    for (let seed = 1; seed <= seeds; seed++) {
      const hero = ladderCharacter(Math.min(8, 1 + zone * 3 + Math.floor(depth / 5)), new Rng(seed * 7 + depth), 'strike');
      let sim: RunSim;
      try {
        sim = new RunSim([], hero, new Rng(seed * 101 + depth * 13 + zone), { where: { zone, rung: depth } });
      } catch (e) {
        console.log(`zone ${zone} depth ${depth}: ${(e as Error).message}`);
        continue;
      }
      const s = sim.state;
      const { grid } = s.map;
      const t: Tally = {};
      const terrain = buildTerrain(s.map, stub, shared(), eye);
      const [floorMesh, wallMesh] = terrain.group.children as THREE.Mesh[];

      // ROCK DRAWN AS FLOOR: a blocking cell whose four corners the ground calls floor.
      const W = grid.width;
      const H = grid.height;
      const rock = (x: number, y: number) => !grid.inBounds(x, y) || grid.at(x, y) === WALL;
      const floorish = (i: number, j: number) => [[i - 1, j - 1], [i, j - 1], [i - 1, j], [i, j]].some(([x, y]) => !rock(x, y));
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!rock(x, y)) continue;
          const open = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]].filter(([i, j]) => floorish(i, j)).length;
          if (open === 4) add(t, 'rock drawn as floor');
          else if (open === 3) add(t, 'rock mostly floor');
        }
      }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (grid.at(x, y) !== WALL && !grid.walkable(x, y) && !grid.wet(x, y)) add(t, 'blocked floor (solid prop)');

      // THE FACES within a body's reach, as segments in the ground plane, binned by cell.
      const bins = new Map<number, number[]>();
      const pos = wallMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
      const idx = wallMesh.geometry.getIndex()!;
      const segs: number[] = [];
      for (let i = 0; i < idx.count; i += 3) {
        const v = [idx.getX(i), idx.getX(i + 1), idx.getX(i + 2)];
        for (let k = 0; k < 3; k++) {
          const a = v[k];
          const b = v[(k + 1) % 3];
          const ya = pos.getY(a);
          const yb = pos.getY(b);
          if (Math.max(ya, yb) < 0.15 || Math.min(ya, yb) > BAND / 10) continue;
          const n = segs.length / 4;
          segs.push(pos.getX(a), pos.getZ(a), pos.getX(b), pos.getZ(b));
          const cx = Math.round((pos.getX(a) + pos.getX(b)) / 2);
          const cz = Math.round((pos.getZ(a) + pos.getZ(b)) / 2);
          const key = cz * 1000 + cx;
          (bins.get(key) ?? bins.set(key, []).get(key)!).push(n);
        }
      }
      const faceGap = (x: number, z: number): number => {
        let best = Infinity;
        for (let dz = -2; dz <= 2; dz++) {
          for (let dx = -2; dx <= 2; dx++) {
            for (const n of bins.get((Math.round(z) + dz) * 1000 + Math.round(x) + dx) ?? []) {
              const [ax, az, bx, bz] = segs.slice(n * 4, n * 4 + 4);
              const ex = bx - ax;
              const ez = bz - az;
              const l = ex * ex + ez * ez || 1e-9;
              const u = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / l));
              best = Math.min(best, Math.hypot(x - ax - ex * u, z - az - ez * u));
            }
          }
        }
        return best;
      };

      // BOULDERS: every stone's centre and reach, out of the instanced mesh.
      const boulders: { x: number; z: number; r: number }[] = [];
      terrain.group.traverse((o) => {
        const m = o as THREE.InstancedMesh;
        if (!m.isInstancedMesh || o.parent !== terrain.group) return;
        const mat = new THREE.Matrix4();
        const p = new THREE.Vector3();
        const q = new THREE.Quaternion();
        const sc = new THREE.Vector3();
        for (let i = 0; i < m.count; i++) {
          m.getMatrixAt(i, mat);
          mat.decompose(p, q, sc);
          boulders.push({ x: p.x, z: p.z, r: Math.max(sc.x, sc.z) * 1.2 });
        }
      });
      add(t, 'boulders', boulders.length);

      // LANTERNS: where the face is pushed at a lantern's height against how far out it hangs.
      add(t, 'tall faces lit', terrain.faces.length);

      // THE FLOOR UNDER A POINT, as the mesh has it, against what `heightAt` says.
      const ray = new THREE.Raycaster();
      let worstHeight = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (!grid.walkable(x, y)) continue;
          for (const [ox, oz] of [[0.3, 0.2], [-0.25, 0.35], [0.4, -0.4]]) {
            ray.set(new THREE.Vector3(x + ox, 5, y + oz), new THREE.Vector3(0, -1, 0));
            const hit = ray.intersectObject(floorMesh)[0];
            if (!hit) {
              if (![s.map.entrance, s.map.exit].some((m) => Math.hypot(x + ox - m.x, y + oz - m.y) < 0.31)) add(t, 'walkable point with no floor under it');
              continue;
            }
            if (hit.face && hit.face.normal.y < 0) add(t, 'floor facing down');
            worstHeight = Math.max(worstHeight, Math.abs(hit.point.y - terrain.heightAt(x + ox, y + oz)));
          }
        }
      }
      t['worst floor vs heightAt (cm)'] = Math.round(worstHeight * 100);

      // PLAYED: every tick, every body against the faces, the stones, the holes and the locks — where the
      // renderer DRAWS it, which is kept clear of all of them, and how far and how smoothly that moves it.
      const mouths = [s.map.entrance, s.map.exit];
      const clear = new Clearance(W, H, terrain.edges, [
        ...terrain.stones,
        ...s.hoards.map((h) => ({ x: h.x, z: h.y, r: 0.45 })),
        ...s.nodes.filter((n) => n.family !== 'fish').map((n) => ({ x: n.x, z: n.y, r: 0.4 })),
      ]);
      const shift: number[] = [];
      const lastShift = new Map<number, { x: number; z: number; ex: number; ey: number }>();
      let pops = 0;
      let worstFace = 0;
      let worstStone = 0;
      let ticks = 0;
      const seen = new Set<string>();
      while (s.status === 'running' && ticks < 30 * 240) {
        sim.step(TICK);
        ticks++;
        for (const e of [s.hero, ...s.monsters, ...s.folk]) {
          if (e.dead) continue;
          const r = drawnRadius(e);
          const at = clear.place(e.x, e.y, r, { x: 0, z: 0 });
          const dx = at.x - e.x;
          const dz = at.z - e.y;
          shift.push(Math.hypot(dx, dz));
          const was = lastShift.get(e.id);
          if (was && Math.hypot(e.x - was.ex, e.y - was.ey) < 0.12 && Math.hypot(dx - was.x, dz - was.z) > 0.08) pops++;
          lastShift.set(e.id, { x: dx, z: dz, ex: e.x, ey: e.y });
          const ex = e.x;
          const ey = e.y;
          const gap = faceGap(at.x, at.z) - r;
          if (gap < 0) {
            add(t, `${e.kind} ticks inside a face`);
            worstFace = Math.max(worstFace, -gap);
            const where = `${e.defId}@${e.x.toFixed(2)},${e.y.toFixed(2)} r${e.radius.toFixed(2)} s${e.scale.toFixed(2)} ${e.action} fits:${grid.fits(e.x, e.y, e.radius)}`;
            if (-gap > 0.15 && seen.size < 8) seen.add(where);
          }
          for (const b of boulders) {
            const d = Math.hypot(at.x - b.x, at.z - b.z) - r - b.r;
            if (d < 0) {
              add(t, `${e.kind} ticks inside a boulder`);
              worstStone = Math.max(worstStone, -d);
            }
          }
          if (s.elapsed > 1.5) for (const m of mouths) if (Math.hypot(ex - m.x, ey - m.y) < 0.3) add(t, `${e.kind} ticks in a throat`);
          for (const h of s.hoards) if (Math.hypot(at.x - h.x, at.z - h.y) < r + 0.4) add(t, `${e.kind} ticks inside a chest`);
          for (const n of s.nodes) if (!n.taken && n.family !== 'fish' && Math.hypot(at.x - n.x, at.z - n.y) < r + 0.3) add(t, `${e.kind} ticks inside a seam`);
        }
      }
      t['ticks'] = ticks;
      shift.sort((a, b) => a - b);
      t['drawn off where it stands, p95 (cm)'] = Math.round(shift[Math.floor(shift.length * 0.95)] * 100);
      t['drawn off where it stands, most (cm)'] = Math.round(shift[shift.length - 1] * 100);
      t['drawn place jumping while the body stands still'] = pops;
      t['worst into a face (cm)'] = Math.round(worstFace * 100);
      t['worst into a boulder (cm)'] = Math.round(worstStone * 100);
      console.log(`\nzone ${zone} depth ${depth} seed ${seed} — ${W}x${H}, ${s.status}${seen.size ? `, deep in a face at\n    ${[...seen].join('\n    ')}` : ''}`);
      for (const [k, v] of Object.entries(t)) console.log(`  ${k}: ${v}`), add(total, k, v);
      terrain.dispose();
    }
  }
}
console.log('\nALL');
for (const [k, v] of Object.entries(total)) console.log(`  ${k}: ${v}`);
