/**
 * THE 3D SPIKE — grey boxes and capsules, no art at all.
 *
 * A third `Renderer` beside pixi and canvas2d, reading the same `RunState`
 * they read. It exists to answer what a plan cannot: how many dynamic lights
 * a frame carries, whether a 10,000-tile floor draws in a handful of calls,
 * how many bodies hold frame rate, and whether `worldAt` still puts a cast
 * under the cursor when the camera is a perspective one.
 *
 * NOT a step toward shipping. Every measurement it reports is in `stats`,
 * which the dev kit prints; nothing here is art and nothing here is tuned.
 */
import * as THREE from 'three';
import { WALL } from '../sim/grid';
import type { Vec2 } from '../sim/grid';
import type { RunState } from '../sim/run';
import type { Palette, Renderer } from './renderer';
import { ZOOM_MAX, ZOOM_MIN } from './renderer';

/** The fixed angle, off horizontal. Hades sits about here; a shallower one
 *  hides what is behind a wall and a steeper one flattens every silhouette. */
const PITCH = 52;
/** Tiles from the hero to the camera at zoom 1, before the zoom divides it.
 *  Diablo distance rather than Hades distance: these floors are generated and
 *  hold 850 bodies, so the camera has to show what is coming. */
const BACK = 26;
/** How far the camera leans toward the cursor, as a share of the gap. */
const LEAD = 0.18;
const WALL_H = 2.2;

/** What the spike reports. The whole reason it exists. */
export interface ThreeStats {
  calls: number;
  triangles: number;
  bodies: number;
  lights: number;
  fps: number;
}

export function createThreeRenderer(host: HTMLElement, palette: Palette): Renderer & {
  stats(): ThreeStats;
  setLights(n: number): void;
} {
  const canvas = document.createElement('canvas');
  canvas.className = 'stage__canvas';
  host.append(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.void ?? '#000000');
  const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 400);

  // ONE directional light and an ambient, which is the cheap half of the
  // lighting answer. `setLights` adds POINT lights on top, and counting how
  // many the frame carries before it falls over is the measurement.
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(-8, 16, 10);
  scene.add(sun);
  scene.add(new THREE.AmbientLight(0x404858, 1.1));
  const lamps: THREE.PointLight[] = [];

  const floorMat = new THREE.MeshStandardMaterial({ color: 0x6b6256, roughness: 0.95 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x2b2722, roughness: 1 });
  const heroMat = new THREE.MeshStandardMaterial({ color: 0xd8c48a, roughness: 0.6 });
  const foeMat = new THREE.MeshStandardMaterial({ color: 0x8c4a3f, roughness: 0.7 });

  // ONE MESH FOR EVERY FLOOR TILE AND ONE FOR EVERY WALL. A hundred by a
  // hundred is ten thousand cells, and a mesh each is dead on arrival — this
  // is the whole reason the floor is instanced from the first line.
  let floors: THREE.InstancedMesh | null = null;
  let walls: THREE.InstancedMesh | null = null;
  let bodies: THREE.InstancedMesh | null = null;
  let foes: THREE.InstancedMesh | null = null;
  let builtFor: unknown = null;

  const box = new THREE.BoxGeometry(1, 1, 1);
  const pill = new THREE.CapsuleGeometry(0.32, 0.7, 4, 8);
  const spot = new THREE.Object3D();

  let zoom = 1.6;
  let looking: Vec2 | null = null;
  let lead = { x: 0, y: 0 };
  let at = { x: 0, y: 0 };
  let frames = 0;
  let fpsAt = performance.now();
  let fps = 0;

  const viewW = () => canvas.clientWidth || 1;
  const viewH = () => canvas.clientHeight || 1;

  function build(state: RunState): void {
    const { grid } = state.map;
    for (const m of [floors, walls]) if (m) scene.remove(m);
    floors?.dispose();
    walls?.dispose();

    let floorN = 0;
    let wallN = 0;
    for (let i = 0; i < grid.tiles.length; i++) (grid.tiles[i] === WALL ? wallN++ : floorN++);

    floors = new THREE.InstancedMesh(box, floorMat, Math.max(1, floorN));
    walls = new THREE.InstancedMesh(box, wallMat, Math.max(1, wallN));
    let f = 0;
    let w = 0;
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const rock = grid.tiles[y * grid.width + x] === WALL;
        // THE WALLS ARE EXTRUDED FROM THE ROCK MASK and nothing is modelled:
        // the grid already knows where stone is, which is the whole of what a
        // first pass needs. A kit replaces this piece by piece later.
        spot.position.set(x, rock ? WALL_H / 2 : -0.05, y);
        spot.scale.set(1, rock ? WALL_H : 0.1, 1);
        spot.updateMatrix();
        if (rock) walls.setMatrixAt(w++, spot.matrix);
        else floors.setMatrixAt(f++, spot.matrix);
      }
    }
    floors.count = f;
    walls.count = w;
    floors.instanceMatrix.needsUpdate = true;
    walls.instanceMatrix.needsUpdate = true;
    scene.add(floors, walls);
    builtFor = grid;
  }

  function camAt(): void {
    const rad = (PITCH * Math.PI) / 180;
    const back = BACK / Math.max(0.2, zoom);
    const focus = looking ?? at;
    const eye = {
      x: focus.x + lead.x * LEAD,
      z: focus.y + lead.y * LEAD,
    };
    camera.position.set(eye.x, Math.sin(rad) * back, eye.z + Math.cos(rad) * back);
    camera.lookAt(eye.x, 0, eye.z);
  }

  function draw(state: RunState): void {
    if (state.map.grid !== builtFor) build(state);
    at = { x: state.hero.x, y: state.hero.y };

    const live = state.monsters.filter((m) => !m.dead);
    if (!bodies) {
      bodies = new THREE.InstancedMesh(pill, heroMat, 1);
      scene.add(bodies);
    }
    if (!foes || foes.instanceMatrix.count < live.length) {
      if (foes) scene.remove(foes);
      foes?.dispose();
      foes = new THREE.InstancedMesh(pill, foeMat, Math.max(64, live.length * 2));
      scene.add(foes);
    }
    spot.position.set(state.hero.x, 0.7, state.hero.y);
    spot.scale.setScalar(1);
    spot.updateMatrix();
    bodies.setMatrixAt(0, spot.matrix);
    bodies.instanceMatrix.needsUpdate = true;

    live.forEach((m, i) => {
      spot.position.set(m.x, 0.7 * m.scale, m.y);
      spot.scale.setScalar(m.scale);
      spot.updateMatrix();
      foes!.setMatrixAt(i, spot.matrix);
    });
    foes.count = live.length;
    foes.instanceMatrix.needsUpdate = true;

    // The lamps ride the nearest bodies, which is the worst case a real one
    // would ever see: a light per effect, all of them in frame at once.
    lamps.forEach((lamp, i) => {
      const on = live[i % Math.max(1, live.length)];
      if (on) lamp.position.set(on.x, 1.6, on.y);
    });

    camAt();
    if (viewW() !== canvas.width || viewH() !== canvas.height) {
      camera.aspect = viewW() / viewH();
      camera.updateProjectionMatrix();
    }
    renderer.render(scene, camera);

    frames++;
    const now = performance.now();
    if (now - fpsAt >= 500) {
      fps = (frames * 1000) / (now - fpsAt);
      frames = 0;
      fpsAt = now;
    }
  }

  /** WHICH TILE A PIXEL IS OVER, by casting onto the ground plane — the one
   *  thing a perspective camera makes harder than a flat one, and the thing
   *  every cast at the cursor depends on. */
  function worldAt(v: { x: number; y: number }): Vec2 {
    const ndc = new THREE.Vector2((v.x / viewW()) * 2 - 1, -(v.y / viewH()) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    if (!ray.ray.intersectPlane(ground, hit)) return { x: at.x, y: at.y };
    lead = { x: hit.x - at.x, y: hit.z - at.y };
    return { x: hit.x, y: hit.z };
  }

  return {
    resize(width: number, height: number): void {
      renderer.setSize(width, height, false);
      camera.aspect = Math.max(0.1, width / Math.max(1, height));
      camera.updateProjectionMatrix();
    },
    draw,
    setZoom(next: number): void {
      zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next));
    },
    panBy(dx: number, dy: number): void {
      looking = { x: (looking ?? at).x - dx / 40, y: (looking ?? at).y - dy / 40 };
    },
    lookAt(spotAt: Vec2): void {
      looking = { x: spotAt.x, y: spotAt.y };
    },
    screenAt(v: Vec2): { x: number; y: number } {
      const p = new THREE.Vector3(v.x, 0, v.y).project(camera);
      return { x: ((p.x + 1) / 2) * viewW(), y: ((-p.y + 1) / 2) * viewH() };
    },
    worldAt,
    follow(): void {
      looking = null;
    },
    destroy(): void {
      renderer.dispose();
      canvas.remove();
    },
    stats(): ThreeStats {
      return {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        bodies: foes?.count ?? 0,
        lights: lamps.length,
        fps,
      };
    },
    /** THE LIGHTING MEASUREMENT: add point lights until the frame gives up.
     *  three.js is a FORWARD renderer, so each one costs every lit object. */
    setLights(n: number): void {
      while (lamps.length > n) scene.remove(lamps.pop()!);
      while (lamps.length < n) {
        const lamp = new THREE.PointLight(0xffb066, 12, 9, 2);
        lamps.push(lamp);
        scene.add(lamp);
      }
    },
  };
}
