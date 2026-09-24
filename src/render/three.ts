/**
 * THE DESCENT IN 3D: the third `Renderer`, reading the same `RunState` the 2D
 * two read and deciding nothing. The sim, the saves and every screen are
 * untouched, so what is played is the game whichever of the three draws it.
 *
 * The ground is the map's own grid (`src/gl/terrain.ts`), what stands on it the
 * map's and the run's own props (`src/gl/dressing.ts`), every body a Meshy model
 * animated off its entity (`src/gl/bodies.ts`) — or, for a sprite nobody has
 * modelled, its own pixel frames stood up on a card, so a world without models
 * still plays. What is written over it is a 2D canvas (`src/gl/overlay.ts`).
 *
 * Its art is fetched as SHARDS beside `app.js`, so a page that never draws in
 * 3D never downloads a byte of it; until they land the 2D renderer is up.
 */
import * as THREE from 'three';
import type { Vec2 } from '../sim/grid';
import type { Entity, RunState } from '../sim/run';
import { TICK } from '../sim/run';
import { SKILL_BY_ID, MONSTERS, GEAR_BASE_BY_ID, AURA_BY_ID } from '../data';
import { HERO_SCALE } from '../sim/appearance';
import { MOVE } from '../data';
import type { Palette, Renderer, TickClock } from './renderer';
import { ZOOM_MAX, ZOOM_MIN, bossTelegraph, groupColour, lootBeam, lootSpan, showingWalk, walkMarks } from './renderer';
import { bodyFoot, generatedFrame, makeSheet } from './sprites';
import type { SpriteSheet } from './sprites';
import { makeProp } from './sprites';
import { gearCanvas } from '../ui/webicons';
import { loadAssets } from '../gl/assets';
import type { Assets } from '../gl/assets';
import { Stage, FOV } from '../gl/stage';
import { Lamps } from '../gl/lights';
import { Particles } from '../gl/particles';
import { Lightning } from '../gl/lightning';
import { shared } from '../gl/shaders';
import { LOOKS, buildTerrain } from '../gl/terrain';
import type { Terrain } from '../gl/terrain';
import { dress } from '../gl/dressing';
import type { Dressing } from '../gl/dressing';
import { BODIES, Figure, SWINGS, bankOf, bodyFor, makeTemplate } from '../gl/bodies';
import type { Pose, Template, Window } from '../gl/bodies';
import type { Bank } from '../gl/retarget';
import { Effects } from '../gl/effects';
import { Overlay } from '../gl/overlay';
import { Clearance } from '../gl/clearance';

export interface ThreeStats {
  quality: string;
  calls: number;
  triangles: number;
  bodies: number;
  boards: number;
  fps: number;
}
/** For a harness that follows bodies over thousands of frames and needs no pictures of them. */
export const harness = { pictures: true };

export type ThreeRenderer = Renderer & {
  stats(): ThreeStats;
  /** The drawn body of an entity, for a harness to read its bones. */
  bodyAt(id: number): THREE.Object3D | null;
};

/** Whether this page has a GPU of its own: a software rasteriser — the headless
 *  harness's — draws 3D at a frame a second, so it keeps to 2D unless asked. */
export function hardwareGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return false;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return !/swiftshader|llvmpipe|software/i.test(name);
  } catch {
    return false;
  }
}

/** Metres from the eye at each zoom stop: 1 shows a room and its neighbours, 5 a fight up close. */
const distanceAt = (zoom: number): number => 46 / Math.pow(zoom, 0.72);

/** The body's base size in its own table, so a rank that grows it grows the model the same share. */
const baseScale = (e: Entity): number =>
  e.kind === 'hero' ? HERO_SCALE : (MONSTERS.find((m) => m.id === e.defId)?.scale ?? e.scale);

/** A sprite nobody has modelled: its own frames on a card that turns to face the eye. */
class Board {
  readonly root = new THREE.Group();
  private readonly card: THREE.Sprite;
  private readonly textures: THREE.Texture[];
  gone = false;
  deadFor = -1;

  constructor(readonly e: Entity, frames: HTMLCanvasElement[]) {
    this.textures = frames.map((c) => {
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.magFilter = THREE.NearestFilter;
      return t;
    });
    this.card = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.textures[0], transparent: true, alphaTest: 0.35, color: 0xcfc6b8 }));
    this.card.center.set(0.5, 1 - bodyFoot(e.sprite));
    this.card.scale.setScalar(e.scale);
    this.root.add(this.card);
  }

  step(e: Entity, elapsed: number, dt: number): void {
    const frame = generatedFrame(e.sprite, {
      action: e.action, through: 0, elapsed, walked: e.walked, skill: e.skillId, facing: e.facing, spell: false, dead: e.dead, dying: 1,
    });
    this.card.material.map = this.textures[frame] ?? this.textures[0];
    this.card.scale.set(e.scale * (Math.cos(e.facing) < 0 ? -1 : 1), e.scale, 1);
    if (e.dead) {
      this.deadFor = Math.max(0, this.deadFor) + dt;
      this.card.material.opacity = Math.max(0, 1 - this.deadFor / 1.2);
      if (this.deadFor > 1.2) this.gone = true;
    }
  }

  dispose(): void {
    this.root.removeFromParent();
    for (const t of this.textures) t.dispose();
    this.card.material.dispose();
  }
}

interface Shown {
  body: Figure | Board;
  x: number;
  z: number;
  speed: number;
  timer: number; // the last action timer seen, so a fresh swing is told from one still running
  winding: boolean;
  hitWait: number;
  going: boolean; // walking as DRAWN: off how fast the body really crosses the floor, never the action's name
  hopping: boolean;
  drawn: { x: number; y: number; z: number }; // where the body is drawn, feet
  was: { x: number; y: number }; // the sim's last two ticks, which a frame is drawn between
  now: { x: number; y: number };
  pace: number; // metres a second between them
}

export async function createThreeRenderer(host: HTMLElement, palette: Palette): Promise<ThreeRenderer | null> {
  const canvas = document.createElement('canvas');
  canvas.className = 'stage__canvas';
  Object.assign(canvas.style, { display: 'block', width: '100%', height: '100%' });
  let stage: Stage;
  try {
    stage = new Stage(canvas);
  } catch {
    return null;
  }
  const assets: Assets | null = await loadAssets('gl', ['ground', 'clips', 'heroes', 'shallows'], stage.anisotropy).catch(() => null);
  if (!assets) {
    stage.dispose();
    return null;
  }
  const bank: Bank | null = bankOf(assets.models.clips);
  const sheet: SpriteSheet | null = makeSheet(palette);
  canvas.id = 'run-canvas';
  canvas.setAttribute('aria-label', 'map view');
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative'; // the overlay is pinned to it
  host.append(canvas);
  const overlay = new Overlay(host, palette);

  const s = shared();
  const lamps = new Lamps(stage.quality);
  lamps.heroPower = 9;
  lamps.moonFrom.set(9, 26, 14); // from the eye's side: a body turned to the camera is lit, not a silhouette
  const motes = new Particles();
  const bolts = new Lightning();
  stage.scene.add(lamps.group, motes.group, bolts.mesh);
  stage.scene.fog = new THREE.FogExp2(0x07080a, 0.018);
  stage.glowing.push(motes.group, bolts.mesh);

  const templates = new Map<string, Template>();
  const gearOf = (key: string | undefined): THREE.Object3D | null => (key ? (assets.models[key]?.gltf.scene ?? null) : null);
  const loading = new Set<string>();
  /** A shard fetched the first time a body in it is seen; a card stands in until it lands. */
  const need = (shard: string): void => {
    if (loading.has(shard)) return;
    loading.add(shard);
    const [dir, name] = shard.includes('/') ? shard.split('/') : ['gl', shard];
    void loadAssets(dir, [name], stage.anisotropy)
      .then((more) => Object.assign(assets.models, more.models))
      .catch(() => undefined);
  };
  const templateOf = (id: string): Template | null => {
    const had = templates.get(id);
    if (had) return had;
    const def = BODIES[id];
    const model = def && assets.models[def.model];
    if (!model) {
      if (def) need(def.shard);
      return null;
    }
    const made = makeTemplate(def, model, bank);
    templates.set(id, made);
    return made;
  };

  need('gear'); // what hands hold: fetched behind the bodies, and empty hands until it lands
  let builtFor: unknown = null;
  let terrain: Terrain | null = null;
  let clearance: Clearance | null = null;
  let dressing: Dressing | null = null;
  let effects: Effects | null = null;
  const shown = new Map<number, Shown>();
  const loot = new Map<unknown, THREE.Object3D>();
  const lootGroup = new THREE.Group();
  stage.scene.add(lootGroup);

  // WHAT LIES ON THE FLOOR AND IS NOT A THING: a shred aura's reach, the Fall's
  // circles filling as their fuse burns, the glow under a monster carrying an
  // aura. A pool of rings, laid again each frame.
  const marks = new THREE.Group();
  stage.scene.add(marks);
  stage.glowing.push(marks);
  const ringGeo = new THREE.RingGeometry(0.9, 1, 64).rotateX(-Math.PI / 2);
  const discGeo = new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2);
  const pool: THREE.Mesh[] = [];
  let used = 0;
  const mark = (geo: THREE.BufferGeometry, x: number, z: number, r: number, colour: string, alpha: number): void => {
    let m = pool[used];
    if (!m) {
      m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      pool.push(m);
      marks.add(m);
    }
    used++;
    m.geometry = geo;
    m.visible = true;
    m.position.set(x, (terrain?.heightAt(x, z) ?? 0) + 0.04, z);
    m.scale.setScalar(Math.max(0.01, r));
    const mat = m.material as THREE.MeshBasicMaterial;
    mat.color.set(colour);
    mat.opacity = alpha;
  };
  function drawMarks(state: RunState): void {
    used = 0;
    for (const a of state.auras) mark(ringGeo, a.x, a.y, a.r, groupColour(palette, a.group), 0.45);
    for (const ring of state.circles) {
      const gone = 1 - Math.max(0, ring.fuse) / Math.max(0.01, ring.of);
      mark(ringGeo, ring.x, ring.y, ring.r, palette.ember, 0.9);
      mark(discGeo, ring.x, ring.y, ring.r * gone, palette.ember, 0.25 + gone * 0.35);
    }
    for (const m of state.monsters) {
      if (m.dead || !m.aura || !AURA_BY_ID[m.aura]) continue;
      mark(discGeo, m.x, m.y, 1.6, AURA_BY_ID[m.aura].family === 'demonic' ? palette.venom : palette.bone, 0.16);
    }
    for (let i = used; i < pool.length; i++) pool[i].visible = false;
  }

  // THE WALKABLE OVERLAY, the dev kit's: the same `walkMarks` the 2D renderers paint, laid on the ground's own height.
  let walk: THREE.Mesh | null = null;
  function syncWalk(state: RunState): void {
    if (!showingWalk() || !terrain) {
      if (walk) walk.visible = false;
      return;
    }
    if (walk?.userData.map === state.map) {
      walk.visible = true;
      return;
    }
    if (walk) (walk.removeFromParent(), walk.geometry.dispose(), (walk.material as THREE.Material).dispose());
    const t = terrain;
    const pos: number[] = [];
    const col: number[] = [];
    const c = new THREE.Color();
    const { grid } = state.map;
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        for (const d of walkMarks(palette, grid, x, y)) {
          c.set(d.colour);
          const x0 = x - 0.5 + d.x + 0.04;
          const z0 = y - 0.5 + d.y + 0.04;
          const sx = (d.w - 0.08) / 4;
          const sz = (d.h - 0.08) / 4;
          for (let v = 0; v < 4; v++) {
            for (let u = 0; u < 4; u++) {
              const [a, b] = [x0 + u * sx, z0 + v * sz];
              for (const [px, pz] of [[a, b], [a, b + sz], [a + sx, b + sz], [a, b], [a + sx, b + sz], [a + sx, b]]) {
                pos.push(px, t.heightAt(px, pz) + 0.06, pz);
                col.push(c.r, c.g, c.b, d.alpha);
              }
            }
          }
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    walk = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, toneMapped: false }));
    walk.userData.map = state.map;
    walk.renderOrder = 3;
    stage.scene.add(walk);
  }

  let zoom = 2;
  stage.distance = distanceAt(zoom);
  let looking: THREE.Vector3 | null = null;
  let last = 0;
  let frames = 0;
  let fps = 0;
  let fpsAt = performance.now();
  const focus = new THREE.Vector3();

  const clear = (): void => {
    for (const v of shown.values()) v.body.dispose();
    shown.clear();
    for (const o of loot.values()) o.removeFromParent();
    loot.clear();
    if (terrain) (stage.scene.remove(terrain.group), terrain.dispose());
    if (dressing) (stage.scene.remove(dressing.group), dressing.dispose());
    if (effects) (stage.scene.remove(effects.group), effects.dispose(), stage.glowing.splice(stage.glowing.indexOf(effects.group), 1));
    terrain = dressing = effects = null;
    clearance = null;
  };

  function build(state: RunState): void {
    clear();
    const eye = new THREE.Vector2(Math.sin(Math.PI / 4), Math.cos(Math.PI / 4));
    terrain = buildTerrain(state.map, assets!, s, eye);
    stage.scene.add(terrain.group);
    const look = LOOKS[state.map.theme] ?? LOOKS.fissure;
    lamps.tone(look.sky[0], look.sky[1], look.sky[2], look.moon[0], look.moon[1]);
    stage.scene.fog = new THREE.FogExp2(look.fog[0], look.fog[1]);
    const t = terrain;
    dressing = dress(state.map, t, assets!, s, (id) => {
      const pic = makeProp(id);
      if (!pic) return null;
      const tex = new THREE.CanvasTexture(pic);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.magFilter = THREE.NearestFilter;
      const card = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.35, color: 0xcfc6b8 }));
      card.center.set(0.5, 0.05);
      return card;
    });
    stage.scene.add(dressing.group);
    lamps.use(dressing.lamps);
    const rounds = [
      ...t.stones,
      ...state.hoards.map((h) => ({ x: h.x, z: h.y, r: 0.45 })),
      ...state.nodes.filter((n) => n.family !== 'fish').map((n) => ({ x: n.x, z: n.y, r: 0.4 })),
    ];
    clearance = new Clearance(state.map.grid.width, state.map.grid.height, t.edges, rounds);
    effects = new Effects(palette, motes, bolts, lamps, castFrom, (x, z) => t.heightAt(x, z));
    stage.scene.add(effects.group);
    stage.glowing.push(effects.group);
    builtFor = state.map;
    looking = null;
    stage.place(new THREE.Vector3(state.hero.x, 0, state.hero.y), 0, true);
  }

  function castFrom(id: number, fallback: { x: number; y: number }): THREE.Vector3 {
    const v = shown.get(id);
    if (v && v.body instanceof Figure) return v.body.castPoint(new THREE.Vector3());
    return new THREE.Vector3(fallback.x, 1.1, fallback.y);
  }

  const casting = (e: Entity): boolean => (e.skillId ? (SKILL_BY_ID[e.skillId]?.tags.includes('spell') ?? false) : false);

  /** What a hero's swing is, off what his hands hold: the sprite names a variant, the entity what is pinned. */
  function swingOf(e: Entity, fig: Figure): Window[] {
    if (e.tool) return SWINGS[e.tool] ?? fig.def.attack;
    if (casting(e) && fig.def.cast) return fig.def.cast;
    if (e.kind !== 'hero') return fig.def.attack;
    const drawn = e.sprite.split('_').slice(1);
    const main = e.held ?? drawn[0];
    const off = e.offhand ?? drawn[1];
    if (main === 'bow' || off === 'bow') return SWINGS.bow;
    if (main && off && off !== 'shield' && main !== 'shield') return SWINGS.dual;
    return (main && SWINGS[main]) || fig.def.attack;
  }

  /** WHAT EACH HAND HOLDS: a hero's off his sprite's variant and what the sim pinned, a tool INSTEAD of both while he
   *  gathers; a monster's off its own body. A bow is the off hand's, as `HELD` has it. */
  function handsOf(e: Entity, fig: Figure): { main?: string; off?: string; size?: number } {
    if (e.kind !== 'hero') return fig.def.holds ?? {};
    if (e.tool) return { main: e.tool };
    const drawn = e.sprite.split('_').slice(1);
    const main: string | undefined = e.held ?? drawn[0];
    const off: string | undefined = e.offhand ?? drawn[1];
    return main === 'bow' || main === 'shield' ? { off: main } : { main, off };
  }

  function bodyOf(e: Entity): Figure | Board | null {
    const id = bodyFor(e.sprite);
    const t = id ? templateOf(id) : null;
    if (id && t) {
      const def = BODIES[id];
      return new Figure(def, t, s, e.rank, e.scale / baseScale(e), e.kind === 'monster');
    }
    const frames = sheet?.frames(e.sprite, e.rank) ?? sheet?.frames(e.sprite, 'common');
    return frames ? new Board(e, frames) : null;
  }

  function sync(state: RunState, dt: number, emerge: number, clock?: TickClock): void {
    const all: Entity[] = [state.hero, ...state.monsters, ...state.folk];
    const here = new Set<number>();
    for (const e of all) {
      here.add(e.id);
      let v = shown.get(e.id);
      // A card while its model is still on its way is swapped for the model once it lands.
      if (v && v.body instanceof Board && !e.dead) {
        const id = bodyFor(e.sprite);
        if (id && templateOf(id)) (v.body.dispose(), shown.delete(e.id), (v = undefined));
      }
      if (!v) {
        const body = bodyOf(e);
        if (!body) continue;
        v = { body, x: e.x, z: e.y, speed: 0, timer: e.actionTimer, winding: false, hitWait: 0, going: false, hopping: false, drawn: { x: e.x, y: 0, z: e.y }, was: { x: e.x, y: e.y }, now: { x: e.x, y: e.y }, pace: 0 };
        shown.set(e.id, v);
        stage.scene.add(body.root);
      }
      if (clock) {
        // DRAWN BETWEEN THE LAST TWO TICKS, as far into the next as the frame is: eased toward the sim
        // instead, a body stepped at thirty a second is drawn at two speeds on alternate frames.
        if (clock.steps > 0) {
          v.was = v.now;
          v.now = { x: e.x, y: e.y };
          if (Math.hypot(v.now.x - v.was.x, v.now.y - v.was.y) > 1.6 * clock.steps) v.was = v.now; // a jump no walk makes is a cut
          v.pace = Math.hypot(v.now.x - v.was.x, v.now.y - v.was.y) / (TICK * clock.steps);
        }
        v.x = v.was.x + (v.now.x - v.was.x) * clock.alpha;
        v.z = v.was.y + (v.now.y - v.was.y) * clock.alpha;
        v.speed = THREE.MathUtils.lerp(v.speed, v.pace, 1 - Math.exp(-dt * 10));
      } else {
        // With no clock, eased toward the sim; a jump no walk makes is a cut.
        const far = Math.hypot(e.x - v.x, e.y - v.z);
        const k = far > 1.6 ? 1 : 1 - Math.exp(-dt * 22);
        const nx = v.x + (e.x - v.x) * k;
        const nz = v.z + (e.y - v.z) * k;
        v.speed = THREE.MathUtils.lerp(v.speed, dt > 0 && far <= 1.6 ? Math.hypot(nx - v.x, nz - v.z) / dt : 0, 1 - Math.exp(-dt * 8));
        v.x = nx;
        v.z = nz;
      }
      let x = v.x;
      let z = v.z;
      let lift = 0;
      if (e.hop && e.hop.total > 0) {
        const through = Math.min(1, Math.max(0, 1 - e.hop.left / e.hop.total));
        x = e.hop.fx + (e.x - e.hop.fx) * through;
        z = e.hop.fy + (e.y - e.hop.fy) * through;
        lift = Math.sin(through * Math.PI) * (MOVE.hopHeight ?? 1) * 1.4;
      }
      if (clearance && terrain) {
        const half = v.body instanceof Figure ? THREE.MathUtils.clamp(v.body.height * 0.16, 0.24, 0.7) : 0.26;
        const at = clearance.place(x, z, half, { x, z });
        x = at.x;
        z = at.z;
        // A body wandering over a way down stands on its funnel's side, not on the dark in the middle.
        for (const t of e === state.hero ? [] : terrain.throats) {
          const d = Math.hypot(x - t.x, z - t.z);
          const keep = t.r + half * 0.8;
          if (d >= keep) continue;
          const [ux, uz] = d > 1e-3 ? [(x - t.x) / d, (z - t.z) / d] : [1, 0];
          x = t.x + ux * keep;
          z = t.z + uz * keep;
        }
      }
      let ground = terrain?.heightAt(x, z) ?? 0;
      if (e === state.hero && emerge < 1) ground -= (1 - emerge) * 1.9; // down into the hole, not simply away
      v.drawn = { x, y: ground + lift, z };
      if (v.body instanceof Board) {
        v.body.root.position.set(x, ground + lift, z);
        v.body.step(e, state.elapsed, dt);
        continue;
      }
      const fig = v.body;
      const hero = e === state.hero;
      // A body hit while it walks keeps walking: the sim's action says 'hurt' and its feet still carry it.
      v.going = v.going ? v.speed > 0.22 : v.speed > (e.action === 'move' ? 0.3 : 0.6);
      const pose: Pose = {
        x, z, lift: ground + lift, facing: e.facing,
        moving: !e.dead && !e.hop && v.going,
        speed: v.speed,
        dead: e.dead,
        hurt: e.action === 'hurt',
        held: (e.stun ?? 0) > 0,
        flash: e.hitFlash > 0.1 ? 0.8 : 0,
        hidden: hero ? Math.max(1 - emerge, state.vanished > 0 ? 0.55 : 0) : 0,
      };
      fig.place(pose, dt);
      if (e.dead) {
        fig.die(dt);
        continue;
      }
      const hands = handsOf(e, fig);
      fig.carry('main', hands.main ?? null, gearOf(hands.main), hands.size);
      fig.carry('off', hands.off ?? null, gearOf(hands.off), hands.size);
      // A MONSTER'S BLOW is timed to fall when its wind-up runs out; the hero's lands the tick it is made.
      const winding = e.winding !== undefined;
      if (e.hop && !v.hopping && fig.def.leap) {
        fig.play(fig.def.leap, e.hop.total, { whole: true }); // a jump is the whole body's, and lands where the arc does
      } else if (winding && !v.winding) {
        const ws = swingOf(e, fig);
        fig.play(ws[Math.floor(Math.random() * ws.length)], 0, { impactIn: e.winding });
      } else if (e.kind === 'hero' && e.action === 'attack' && e.actionTimer > v.timer + 1e-4) {
        const ws = swingOf(e, fig);
        const w = ws[state.casts % ws.length];
        const rate = Math.max(0.6, e.stats.attacksPerSecond || 1);
        fig.play({ ...w, start: w.impact - (w.impact - w.start) * 0.3 }, Math.min(0.9, Math.max(0.28, 1 / rate)));
      } else if (!winding && e.action === 'attack' && e.kind !== 'hero' && e.actionTimer > v.timer + 1e-4 && !fig.busy) {
        const ws = swingOf(e, fig);
        fig.play(ws[0], 0.5);
      }
      v.hopping = !!e.hop;
      v.winding = winding;
      v.timer = e.actionTimer;
      v.hitWait -= dt;
      if (e.action === 'hurt' && !fig.busy && v.hitWait <= 0) {
        fig.flinch(0.3);
        v.hitWait = 0.6;
      }
      // WHAT IT IS UNDER, in its own light: the boss's phase, and ice round a body a Freeze holds.
      const told = e === state.boss ? bossTelegraph(palette, state.phase, state.elapsed) : null;
      const frozen = (e.stun ?? 0) > 0 && e.stunKind === 'freeze';
      fig.look.uRim.value.set(told ? told.colour : frozen ? '#9fd8ff' : '#000000');
      fig.look.uRimPower.value = told ? 0.9 : frozen ? 1.4 : 0;
      fig.step(pose, dt);
    }
    for (const [id, v] of shown) {
      if (here.has(id) && !v.body.gone) continue;
      if (!here.has(id) && v.body instanceof Figure && !v.body.gone) {
        v.body.die(dt); // the sim let it go; the corpse keeps its own clock
        continue;
      }
      v.body.dispose();
      shown.delete(id);
    }
  }

  function syncLoot(state: RunState, t: number): void {
    const seen = new Set<unknown>();
    for (const drop of state.ground) {
      seen.add(drop);
      let o = loot.get(drop);
      if (!o) {
        o = new THREE.Group();
        const beam = lootBeam(palette, drop.rank);
        const colour = new THREE.Color(beam.colour);
        const pic = gearCanvas(String(drop.item.meta.art ?? 'body'));
        if (pic) {
          const tex = new THREE.CanvasTexture(pic);
          tex.colorSpace = THREE.SRGBColorSpace;
          const base = GEAR_BASE_BY_ID[drop.item.base];
          const span = lootSpan(base?.kind ?? 'weapon', base?.hands ?? 1) * 0.9;
          const card = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.3 }));
          card.center.set(0.5, 0.1);
          card.scale.set(span, span * (pic.height / Math.max(1, pic.width)), 1);
          o.add(card);
        }
        const shaft = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.12, beam.tall, 8, 1, true).translate(0, beam.tall / 2, 0),
          new THREE.MeshBasicMaterial({ color: colour, transparent: true, opacity: beam.lit * 0.45, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })
        );
        o.add(shaft);
        o.position.set(drop.x, terrain?.heightAt(drop.x, drop.y) ?? 0, drop.y);
        o.userData.shaft = shaft;
        o.userData.lit = beam.lit;
        lootGroup.add(o);
        loot.set(drop, o);
      }
      const shaft = o.userData.shaft as THREE.Mesh;
      (shaft.material as THREE.MeshBasicMaterial).opacity = (o.userData.lit as number) * (0.38 + 0.1 * Math.sin(t * 2.2 + drop.x));
    }
    for (const [key, o] of loot) {
      if (seen.has(key)) continue;
      o.removeFromParent();
      loot.delete(key);
    }
  }

  const heroAt = (state: RunState): THREE.Vector3 => {
    const v = shown.get(state.hero.id);
    return new THREE.Vector3(v?.x ?? state.hero.x, 0, v?.z ?? state.hero.y);
  };

  function draw(state: RunState, emerge = 1, clock?: TickClock): void {
    const now = performance.now();
    const dt = last === 0 ? 0 : Math.min(0.1, (now - last) / 1000);
    last = now;
    if (state.map !== builtFor) build(state);
    sync(state, dt, emerge, clock);
    syncLoot(state, s.uTime.value);
    drawMarks(state);
    syncWalk(state);
    dressing?.update(state, s.uTime.value);
    effects?.sync(state);

    const hero = heroAt(state);
    focus.copy(looking ?? hero);
    stage.place(focus, dt);
    s.uTime.value += dt;
    s.uHero.value.set(hero.x, 1.1, hero.z);
    s.uCam.value.copy(stage.camera.position);
    lamps.update(stage.focus, hero, s.uTime.value, dt);
    motes.update(dt);
    bolts.update(dt, stage.camera);
    if (harness.pictures) stage.render(dt);
    overlay.draw(state, {
      screen: (x, y, z) => stage.screen(new THREE.Vector3(x, y + (terrain?.heightAt(x, z) ?? 0), z)),
      over: (e) => {
        const v = shown.get(e.id);
        if (!v) return null;
        const tall = v.body instanceof Figure ? v.body.height : e.scale * 0.95;
        return stage.screen(new THREE.Vector3(v.drawn.x, v.drawn.y + tall + 0.25, v.drawn.z));
      },
    });

    frames++;
    if (now - fpsAt >= 500) {
      fps = (frames * 1000) / (now - fpsAt);
      frames = 0;
      fpsAt = now;
    }
  }

  const middle = () => ({ x: (canvas.clientWidth || 1) / 2, y: (canvas.clientHeight || 1) / 2 });

  return {
    resize(width: number, height: number): void {
      stage.resize(Math.max(1, width), Math.max(1, height));
      overlay.resize(Math.max(1, width), Math.max(1, height));
      motes.setScale(height * stage.renderer.getPixelRatio(), FOV);
    },
    draw,
    setZoom(next: number): void {
      zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, next));
      stage.distance = distanceAt(zoom);
    },
    panBy(dx: number, dy: number): void {
      const m = middle();
      const a = stage.ground(m.x, m.y);
      const b = stage.ground(m.x + dx, m.y + dy);
      if (!a || !b) return;
      looking = (looking ?? stage.focus.clone()).clone().sub(b.sub(a));
      looking.y = 0;
    },
    lookAt(at: Vec2): void {
      looking = new THREE.Vector3(at.x, 0, at.y);
    },
    screenAt(at: Vec2): { x: number; y: number } {
      return stage.screen(new THREE.Vector3(at.x, 0, at.y)) ?? middle();
    },
    worldAt(at: { x: number; y: number }): Vec2 {
      const g = stage.ground(at.x, at.y);
      return g ? { x: g.x, y: g.z } : { x: stage.focus.x, y: stage.focus.z };
    },
    follow(): void {
      looking = null;
    },
    destroy(): void {
      clear();
      overlay.dispose();
      stage.dispose();
      canvas.remove();
    },
    bodyAt(id: number): THREE.Object3D | null {
      const v = shown.get(id);
      return v && v.body instanceof Figure ? v.body.model : null;
    },
    stats(): ThreeStats {
      let bodies = 0;
      let boards = 0;
      for (const v of shown.values()) v.body instanceof Figure ? bodies++ : boards++;
      return { quality: stage.quality, calls: stage.renderer.info.render.calls, triangles: stage.renderer.info.render.triangles, bodies, boards, fps };
    },
  };
}
