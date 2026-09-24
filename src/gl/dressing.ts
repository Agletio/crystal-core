/**
 * WHAT STANDS ON A DESCENT'S FLOOR, built in code off the same map and run
 * state the 2D renderer reads: the loose stone the rock shed, the roots down its
 * face, the lanterns somebody hung, the locks and the seams you work.
 *
 * Nothing here is placed by the renderer's own choice. Cover is `map.props`,
 * a lock is a `Hoard`, a seam is a `GatherNode`; the lanterns ride the tall
 * faces the terrain found, a hash apiece, so a floor lights the same way twice.
 * A prop id with no 3D answer stands its pixel picture up instead.
 */
import * as THREE from 'three';
import type { GameMap } from '../sim/grid';
import { WALL } from '../sim/grid';
import type { GatherNode, Hoard, RunState } from '../sim/run';
import { COVER_PROPS, HUNG_PROPS } from '../vignettes';
import { LIVE_PROPS, rippleRings } from '../render/renderer';
import type { Assets } from './assets';
import type { LightSource } from './lights';
import type { Shared } from './shaders';
import { material, LOOKS } from './terrain';
import type { Terrain } from './terrain';

function hash(x: number, y: number, z = 0): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

/** A stone: an icosahedron pushed about by a hash, flattened to lie on the floor. */
function stone(seed: number): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const k = 0.72 + hash(v.x * 3 + seed, v.y * 3, v.z * 3) * 0.5;
    p.setXYZ(i, v.x * k, v.y * k * 0.62, v.z * k);
  }
  g.computeVertexNormals();
  return g;
}

/** How many stones a cover prop lays down, and how big, by its id. */
const COVER_SHAPE: Record<string, { n: [number, number]; size: [number, number] }> = {
  grit: { n: [4, 8], size: [0.025, 0.05] },
  rubble: { n: [3, 5], size: [0.07, 0.14] },
  chips: { n: [4, 7], size: [0.04, 0.08] },
  cobbles: { n: [2, 3], size: [0.11, 0.19] },
  pebbles: { n: [5, 9], size: [0.02, 0.045] },
};
const COVER = new Set(COVER_PROPS.map((c) => c.id));

/** A seam's crystals, by what it gives: a family's own, or a world's unique. */
const SEAM_INK: Record<string, number> = { metal: 0xc98a4a, cloth: 0xcdbd86, gem: 0x7fd6ff, unique: 0x9fffd6 };

export interface Dressing {
  group: THREE.Group;
  lamps: LightSource[];
  update(state: RunState, t: number): void;
  dispose(): void;
}

export function dress(map: GameMap, terrain: Terrain, assets: Assets, s: Shared, billboard: (id: string) => THREE.Object3D | null): Dressing {
  const group = new THREE.Group();
  const look = LOOKS[map.theme] ?? LOOKS.fissure;
  const rockMat = material(assets, look.rock, look.rockTint, s, { triplanar: 0.9 }, false);
  const woodMat = material(assets, 'wood', 0xb8a890, s, { triplanar: 1.6 }, false);
  const iron = new THREE.MeshStandardMaterial({ color: 0x3a3634, roughness: 0.55, metalness: 0.85 });
  const gilt = new THREE.MeshStandardMaterial({ color: 0xb08a3c, roughness: 0.35, metalness: 1 });
  const stones = [0, 1, 2, 3].map((k) => stone(k * 17.3));
  const lamps: LightSource[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();

  // ─── COVER: every scrap the carve left, as stones a little sunk in the sand ───
  const cover = map.props.filter((p) => COVER.has(p.id));
  const scraps: { geo: number; mat: THREE.Matrix4 }[] = [];
  const ways = [map.entrance, map.exit];
  for (const prop of cover) {
    const shape = COVER_SHAPE[prop.id];
    if (!shape) continue;
    const n = Math.round(shape.n[0] + hash(prop.x, prop.y, 1) * (shape.n[1] - shape.n[0]));
    for (let k = 0; k < n; k++) {
      const x = prop.x + (hash(prop.x, prop.y, k * 3 + 2) - 0.5) * 0.9;
      const z = prop.y + (hash(prop.y, prop.x, k * 3 + 5) - 0.5) * 0.9;
      if (ways.some((w) => Math.hypot(x - w.x, z - w.y) < 0.55)) continue; // nothing lies in a way down's throat
      const size = shape.size[0] + hash(x, z, 7) * (shape.size[1] - shape.size[0]);
      q.setFromEuler(new THREE.Euler(hash(x, z, 8) * 0.6, hash(x, z, 9) * 6.3, hash(x, z, 10) * 0.6));
      scraps.push({
        geo: Math.floor(hash(x, z, 11) * 4),
        mat: new THREE.Matrix4().compose(new THREE.Vector3(x, terrain.heightAt(x, z) + size * 0.25, z), q, new THREE.Vector3(size, size, size)),
      });
    }
  }
  stones.forEach((geo, k) => {
    const mine = scraps.filter((c) => c.geo === k);
    if (mine.length === 0) return;
    const mesh = new THREE.InstancedMesh(geo, rockMat, mine.length);
    mine.forEach((c, i) => mesh.setMatrixAt(i, c.mat));
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  });

  // ─── ROOTS down the faces the camera looks at ───
  const rootMat = new THREE.MeshStandardMaterial({ color: 0x2e241c, roughness: 0.9 });
  const { grid } = map;
  for (const prop of map.props) {
    if (!HUNG_PROPS.has(prop.id) || prop.id === 'torch' || prop.id === 'hung') continue;
    // The floor it hangs over: the neighbour the camera sees the face of.
    const toward = [[1, 0], [0, 1], [-1, 0], [0, -1]].find(([dx, dy]) => grid.inBounds(prop.x + dx, prop.y + dy) && grid.at(prop.x + dx, prop.y + dy) !== WALL);
    if (!toward || toward[0] < 0 || toward[1] < 0) continue;
    const thin = prop.id === 'roots_thin';
    for (let k = 0; k < (thin ? 2 : 3); k++) {
      const side = (hash(prop.x, prop.y, k) - 0.5) * 0.8;
      const top = look.tall * (0.62 + hash(prop.y, prop.x, k) * 0.3);
      // ON the face: it stands WALL_AT short of the floor cell, and its rock is pushed out by the noise at each height.
      const along = { x: prop.x + toward[1] * side, z: prop.y + toward[0] * side };
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 6; i++) {
        const f = i / 6;
        const sway = Math.sin(f * 5 + k) * 0.12 * f;
        const y = top * (1 - f * (0.75 + hash(k, prop.x) * 0.2));
        const out = 0.15 + terrain.pushAt(along.x + toward[0] * 0.15, y, along.z + toward[1] * 0.15) + 0.04 + 0.08 * f;
        pts.push(new THREE.Vector3(along.x + toward[0] * out + toward[1] * sway, y, along.z + toward[1] * out + toward[0] * sway));
      }
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, thin ? 0.018 : 0.03, 5, false);
      const root = new THREE.Mesh(tube, rootMat);
      root.castShadow = true;
      group.add(root);
    }
  }

  // ─── LANTERNS on the tall faces, a light each ───
  const glass = new THREE.MeshStandardMaterial({ color: 0x331a08, emissive: 0xffa24a, emissiveIntensity: 2.6, roughness: 0.4 });
  for (const face of terrain.faces) {
    const at = face.at.clone().addScaledVector(face.normal, face.out + 0.14);
    at.y = 1.9;
    const lantern = new THREE.Group();
    lantern.position.copy(at);
    lantern.rotation.y = Math.atan2(face.normal.x, face.normal.z);
    const cage = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.2), iron);
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.22, 0.15), glass);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.1, 4), iron);
    cap.position.y = 0.19;
    cap.rotation.y = Math.PI / 4;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.28), iron);
    arm.position.set(0, 0.26, -0.14);
    cage.scale.set(1, 1, 1);
    for (const piece of [cage, cap, arm]) piece.castShadow = true;
    lantern.add(light, cage, cap, arm);
    (cage.material as THREE.MeshStandardMaterial).transparent = false;
    cage.visible = false; // the glass is the lantern; the frame is the cap and the arm
    group.add(lantern);
    lamps.push({ kind: 'lantern', at: at.clone().addScaledVector(face.normal, 0.3), color: new THREE.Color(0xffa24a), power: 7, range: 7.5, flicker: 0.12, seed: hash(at.x, at.z) * 100 });
  }

  // ─── THE LOCKS: a chest a Hoard, its lid on a hinge ───
  const chests = new Map<number, { lid: THREE.Object3D; open: number; glow: THREE.Mesh }>();
  const lockOf = (h: Hoard): THREE.Group => {
    const g = new THREE.Group();
    g.position.set(h.x, terrain.heightAt(h.x, h.y), h.y);
    g.rotation.y = hash(h.x, h.y, 3) * Math.PI * 2;
    const band = h.rare ? gilt : iron;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.46, 0.54), woodMat);
    body.position.y = 0.23;
    const hinge = new THREE.Group();
    hinge.position.set(0, 0.46, -0.27);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.86, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2), woodMat);
    lid.position.set(0, 0, 0.27);
    hinge.add(lid);
    for (const x of [-0.32, 0.32]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.48, 0.56), band);
      strap.position.set(x, 0.23, 0);
      g.add(strap);
      const arc = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.07, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateX(-Math.PI / 2), band);
      arc.position.set(x, 0, 0.27);
      hinge.add(arc);
    }
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.04), band);
    clasp.position.set(0, 0.4, 0.28);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.44).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: h.rare ? 0xffd27a : 0xffb866, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.y = 0.45;
    g.add(body, hinge, clasp, glow);
    g.traverse((o) => ((o as THREE.Mesh).isMesh && o !== glow ? ((o.castShadow = true), (o.receiveShadow = true)) : undefined));
    chests.set(h.id, { lid: hinge, open: h.opened ? 1 : 0, glow });
    return g;
  };

  // ─── THE SEAMS: stone with crystals in it, spent once worked ───
  const seams = new Map<number, { crystals: THREE.Object3D; ripple?: THREE.Group; node: GatherNode }>();
  const seamOf = (n: GatherNode): THREE.Group => {
    const g = new THREE.Group();
    const onWater = n.family === 'fish';
    const at = n.on ?? n;
    g.position.set(at.x, onWater ? -0.08 : terrain.heightAt(at.x, at.y), at.y);
    const crystals = new THREE.Group();
    if (onWater) {
      const ripple = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0, depthWrite: false }));
        ripple.add(ring);
      }
      g.add(ripple);
      seams.set(n.id, { crystals, ripple, node: n });
      return g;
    }
    const grass = n.family === 'cloth';
    // Inside its own tile: the sim walks everything round it at half a tile and a body's width.
    for (let k = 0; k < (grass ? 2 : 4); k++) {
      const r = 0.14 + hash(n.x, n.y, k) * 0.13;
      const rock = new THREE.Mesh(stones[k % 4], rockMat);
      rock.scale.setScalar(r);
      rock.position.set((hash(k, n.x) - 0.5) * 0.36, r * 0.3, (hash(n.y, k) - 0.5) * 0.36);
      rock.castShadow = rock.receiveShadow = true;
      g.add(rock);
    }
    const ink = SEAM_INK[n.family] ?? SEAM_INK.unique;
    if (grass) {
      const blade = new THREE.MeshStandardMaterial({ color: ink, roughness: 0.8, side: THREE.DoubleSide });
      for (let k = 0; k < 14; k++) {
        const b = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.4 + hash(k, n.x, 2) * 0.35, 3), blade);
        b.position.set((hash(k, n.y, 3) - 0.5) * 0.5, 0.2, (hash(n.x, k, 4) - 0.5) * 0.5);
        b.rotation.set((hash(k, 5) - 0.5) * 0.7, 0, (hash(k, 6) - 0.5) * 0.7);
        crystals.add(b);
      }
    } else {
      const shine = new THREE.MeshStandardMaterial({
        color: ink, roughness: 0.25, metalness: n.family === 'metal' ? 0.9 : 0.1,
        emissive: n.family === 'unique' || n.family === 'gem' ? ink : 0x000000, emissiveIntensity: 0.8,
      });
      for (let k = 0; k < 7; k++) {
        const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.07 + hash(k, n.y, 7) * 0.06, 0), shine);
        c.scale.y = 1.8 + hash(k, 8) * 1.4;
        c.position.set((hash(k, n.x, 9) - 0.5) * 0.4, 0.18 + hash(k, 10) * 0.18, (hash(n.y, k, 11) - 0.5) * 0.4);
        c.rotation.set((hash(k, 12) - 0.5) * 1.1, hash(k, 13) * 3, (hash(k, 14) - 0.5) * 1.1);
        c.castShadow = true;
        crystals.add(c);
      }
    }
    g.add(crystals);
    seams.set(n.id, { crystals, node: n });
    return g;
  };

  // ─── ANYTHING ELSE a room holds, stood up as its own picture ───
  for (const prop of map.props) {
    if (COVER.has(prop.id) || HUNG_PROPS.has(prop.id) || LIVE_PROPS.has(prop.id)) continue;
    if (/^node_|^fissure_|^rot_|^cavern_|^seam_/.test(prop.id)) continue; // a lock or a seam, drawn off the run
    const pic = billboard(prop.id);
    if (!pic) continue;
    pic.position.set(prop.x, terrain.heightAt(prop.x, prop.y), prop.y);
    group.add(pic);
  }

  let built = false;
  return {
    group,
    lamps,
    update(state: RunState, t: number): void {
      if (!built) {
        built = true;
        for (const h of state.hoards) group.add(lockOf(h));
        for (const n of state.nodes) group.add(seamOf(n));
      }
      for (const h of state.hoards) {
        const c = chests.get(h.id);
        if (!c) continue;
        c.open = Math.min(1, Math.max(0, c.open + (h.opened ? 0.05 : -0.05)));
        const e = c.open * c.open * (3 - 2 * c.open);
        c.lid.rotation.x = -e * 1.9;
        (c.glow.material as THREE.MeshBasicMaterial).opacity = e * (0.55 + 0.1 * Math.sin(t * 3));
      }
      for (const seam of seams.values()) {
        const spent = state.map.props[seam.node.at]?.id === seam.node.art.spent;
        seam.crystals.visible = !spent;
        if (seam.ripple) {
          seam.ripple.visible = !spent;
          rippleRings(t, seam.node.id * 0.37).forEach((ring, i) => {
            const mesh = seam.ripple!.children[i] as THREE.Mesh;
            if (!mesh) return;
            mesh.scale.setScalar(Math.max(0.05, ring.r));
            (mesh.material as THREE.MeshBasicMaterial).opacity = ring.alpha;
          });
        }
      }
    },
    dispose(): void {
      group.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mt of mats) mt.dispose();
      });
    },
  };
}
