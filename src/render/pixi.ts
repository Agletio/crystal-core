/**
 * WebGL renderer, built on PixiJS.
 *
 * Same Renderer interface as canvas2d — the sim can't tell them apart. This
 * one draws actual sprites with animation, batches on the GPU, and is what a
 * real art pass plugs into: replace makeSheet() in sprites.ts with a loader
 * and nothing in this file changes.
 *
 * Everything geometric lives inside a `world` container measured in TILE
 * units, and the camera is that container's transform. This is what makes
 * zooming and following cheap: the map is built once and then moved, rather
 * than 2,000 rectangles being redrawn at new pixel coordinates every frame.
 * Text is the exception — it sits in screen space so it stays crisp instead
 * of being scaled up into a blur.
 *
 * Construction is async (Pixi 8 initialises the GPU device asynchronously) and
 * can fail — no WebGL, headless, a hostile driver. It returns null in that
 * case and the caller falls back to canvas2d.
 */
import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { WALL } from '../sim/grid';
import { DEATH_FADE } from '../sim/run';
import type { Entity, RunState } from '../sim/run';
import type { GameMap } from '../sim/grid';
import type { Palette, Renderer } from './renderer';
import {
  clampZoom,
  floorColour,
  floorPalette,
  isWallFace,
  poisonDrops,
  poisonFieldRadius,
  tileDecals,
  tileSize,
  toHexNumber,
  vfxColour,
} from './renderer';
import { CELL, WALK_FRAMES, makeSheet } from './sprites';

const FLOATER_LIFE = 1.1;

/** Tiles per second of leg movement — how fast the walk cycle plays. */
const WALK_CYCLE = 7;

function sizeOf(sprite: string): number {
  if (sprite === 'brute') return 1.25;
  if (sprite === 'stalker') return 0.85;
  if (sprite === 'grub') return 0.95;
  if (sprite === 'hero') return 1.15;
  return 1;
}

export async function createPixiRenderer(
  host: HTMLElement,
  palette: Palette
): Promise<Renderer | null> {
  const sheet = makeSheet(palette);
  if (!sheet) return null;

  const textures: Record<string, Texture[]> = {};
  for (const [name, frames] of Object.entries(sheet)) {
    textures[name] = frames.map((canvas) => {
      const texture = Texture.from(canvas);
      // Nearest, not linear. The hero is authored on a 16-pixel grid and is
      // then drawn at whatever fraction of a tile the zoom works out to —
      // under the default smoothing that grid is interpolated away and you get
      // back the small blurry drawing pixel art exists to not be.
      texture.source.scaleMode = 'nearest';
      return texture;
    });
  }

  const app = new Application();
  try {
    await app.init({
      width: Math.max(1, host.clientWidth),
      height: Math.max(1, Math.round(host.clientWidth * 0.66)),
      // Solid rock, not void. The map is a place cut out of stone; a black
      // background made every chamber a slab floating in nothing.
      background: toHexNumber(palette.rockDeep),
      antialias: true,
      autoDensity: true,
      resolution: Math.min(globalThis.devicePixelRatio || 1, 2),
      preference: 'webgl',
    });
  } catch {
    return null;
  }

  app.canvas.id = 'run-canvas';
  app.canvas.setAttribute('aria-label', 'map view');
  (app.canvas as HTMLCanvasElement).style.display = 'block';
  (app.canvas as HTMLCanvasElement).style.width = '100%';
  host.replaceChildren(app.canvas as HTMLCanvasElement);

  // Pixi drives its own ticker by default; we draw explicitly from the run
  // loop so the sim stays the only clock that matters.
  app.ticker.stop();

  const world = new Container();
  const mapLayer = new Graphics();
  const vfxLayer = new Graphics();
  const entityLayer = new Container();
  const textLayer = new Container();

  world.addChild(mapLayer, entityLayer, vfxLayer);
  app.stage.addChild(world, textLayer);

  let builtMap: GameMap | null = null;
  let zoom = 1;
  let tile = 1;
  let offX = 0;
  let offY = 0;

  const sprites = new Map<number, Sprite>();
  const floaters: Text[] = [];

  const viewW = () => app.renderer.width / app.renderer.resolution;
  const viewH = () => app.renderer.height / app.renderer.resolution;

  /** World units are tiles, so a centre is just the tile plus a half. */
  const cx = (x: number) => x + 0.5;
  const cy = (y: number) => y + 0.5;

  /** Screen position, for things that live outside the world container. */
  const sx = (x: number) => offX + (x + 0.5) * tile;
  const sy = (y: number) => offY + (y + 0.5) * tile;

  /**
   * At zoom 1 the whole map is centred. Above that the camera follows the
   * focus point and clamps to the map edges, so it never pans into the void.
   */
  function camera(map: GameMap, focus?: { x: number; y: number }): void {
    const w = viewW();
    const h = viewH();
    const fit = Math.min(w / map.grid.width, h / map.grid.height);
    tile = tileSize(zoom, fit);

    const mapW = tile * map.grid.width;
    const mapH = tile * map.grid.height;

    if (zoom <= 1 || !focus) {
      offX = (w - mapW) / 2;
      offY = (h - mapH) / 2;
    } else {
      offX = w / 2 - (focus.x + 0.5) * tile;
      offY = h / 2 - (focus.y + 0.5) * tile;
      offX = mapW <= w ? (w - mapW) / 2 : Math.min(0, Math.max(w - mapW, offX));
      offY = mapH <= h ? (h - mapH) / 2 : Math.min(0, Math.max(h - mapH, offY));
    }

    world.scale.set(tile);
    world.position.set(offX, offY);
  }

  /** Built once per map, in tile units, then moved by the camera. */
  function buildMap(map: GameMap): void {
    const { grid } = map;
    mapLayer.clear();

    const floor = floorPalette(palette, map.vein);
    const at = (gx: number, gy: number) => grid.at(gx, gy);

    // Same grouping as the decals below: the floor's grain gives many tiles
    // the same colour, so one fill per tile is mostly wasted batches.
    const floors = new Map<string, number[][]>();
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const tile = grid.at(x, y);
        // Rock gets drawn too now, but only the band you could see from a
        // room — everything past it is already this colour behind the map.
        if (tile === WALL && !isWallFace(at, x, y)) continue;
        const colour = floorColour(floor, tile, x, y);
        let rects = floors.get(colour);
        if (!rects) floors.set(colour, (rects = []));
        // Slight overdraw closes hairline seams between adjacent tiles.
        rects.push([x - 0.01, y - 0.01, 1.02, 1.02]);
      }
    }
    for (const [colour, rects] of floors) {
      for (const [rx, ry, rw, rh] of rects) mapLayer.rect(rx, ry, rw, rh);
      mapLayer.fill(toHexNumber(colour));
    }

    // Flagstones, rubble, mineral and the lit lip under a wall. Built once per
    // map alongside the floor, so the cost lands on entering a descent rather
    // than on every frame of one.
    //
    // Grouped by colour before drawing. Graphics batches whatever paths are
    // pending when fill() is called, so a fill PER RECTANGLE is ten thousand
    // batches and a third of a second of hitch on the click that starts a
    // run; there are only a handful of distinct decal colours, so grouping
    // turns that into a handful of fills.
    const batches = new Map<string, { colour: number; alpha: number; rects: number[][] }>();
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        for (const d of tileDecals(floor, at, x, y)) {
          const key = `${d.colour}|${d.alpha}`;
          let batch = batches.get(key);
          if (!batch) {
            batch = { colour: toHexNumber(d.colour), alpha: d.alpha, rects: [] };
            batches.set(key, batch);
          }
          batch.rects.push([x + d.x, y + d.y, d.w, d.h]);
        }
      }
    }
    for (const batch of batches.values()) {
      for (const [rx, ry, rw, rh] of batch.rects) mapLayer.rect(rx, ry, rw, rh);
      mapLayer.fill({ color: batch.colour, alpha: batch.alpha });
    }

    // The way in: a hole in the floor with a lit lip, not a coloured block.
    // seamLit is a panel violet, and on stone it read as a UI element someone
    // had dropped on the map.
    const e = map.entrance;
    mapLayer
      .rect(cx(e.x) - 0.32, cy(e.y) - 0.32, 0.64, 0.64)
      .fill(toHexNumber(palette.rockDeep));
    mapLayer
      .rect(cx(e.x) - 0.38, cy(e.y) - 0.38, 0.76, 0.76)
      .stroke({ width: 0.08, color: toHexNumber(floor.rockLit), alpha: 0.9 });

    builtMap = map;
  }

  function spriteFor(e: Entity): Sprite {
    let s = sprites.get(e.id);
    if (!s) {
      const frames = textures[e.sprite] ?? textures.grub;
      s = new Sprite(frames[0]);
      s.anchor.set(0.5);
      entityLayer.addChild(s);
      sprites.set(e.id, s);
    }
    return s;
  }

  function drawEntity(e: Entity, elapsed: number): void {
    const fade = e.dead ? Math.min(1, e.deathAge / DEATH_FADE) : 0;
    if (e.dead && fade >= 1) {
      const stale = sprites.get(e.id);
      if (stale) {
        stale.destroy();
        sprites.delete(e.id);
      }
      return;
    }

    const s = spriteFor(e);
    const frames = textures[e.sprite] ?? textures.grub;

    // Walk cycle only advances while actually moving, so idle monsters stand
    // still instead of marching on the spot.
    const frame = e.action === 'move' ? Math.floor(elapsed * WALK_CYCLE) % WALK_FRAMES : 0;
    s.texture = frames[frame];

    // One texture cell should cover roughly one tile of world.
    const scale = (1 / CELL) * sizeOf(e.sprite) * (1 - fade * 0.5);
    s.scale.set(scale);
    s.alpha = 1 - fade;
    s.rotation = fade * 1.2;

    // Lunge toward whatever it's hitting; recoil when hit.
    let lunge = 0;
    if (e.action === 'attack') lunge = 0.22 * Math.max(0, e.actionTimer / 0.22);
    if (e.action === 'hurt') lunge = -0.12;

    s.x = cx(e.x) + Math.cos(e.facing) * lunge;
    s.y = cy(e.y) + Math.sin(e.facing) * lunge;

    // A gentle bob while walking sells motion more than the frames do.
    if (e.action === 'move') {
      s.y -= Math.abs(Math.sin(elapsed * WALK_CYCLE * Math.PI)) * 0.06;
    }

    // Sprites are authored facing right; flip rather than rotate so they
    // never appear upside down.
    s.scale.x = Math.abs(s.scale.x) * (Math.cos(e.facing) < 0 ? -1 : 1);
    s.tint = e.hitFlash > 0 ? toHexNumber(palette.chalk) : 0xffffff;
  }

  function drawOverlays(state: RunState): void {
    vfxLayer.clear();
    // Keep hairlines visible however far out we're zoomed.
    const hair = Math.max(0.05, 1 / tile);

    const x = state.map.exit;
    const pulse = 0.75 + 0.25 * Math.sin(state.elapsed * 3);
    vfxLayer
      .rect(cx(x.x) - 0.32, cy(x.y) - 0.32, 0.64, 0.64)
      .fill({ color: toHexNumber(palette.citrine), alpha: pulse });

    // Life bars on everything alive, not just the wounded — the point is
    // seeing at a glance who is and isn't taking damage. Untouched bars are
    // dimmed so a full room doesn't shout.
    const bar = (e: Entity, width: number, colour: string) => {
      if (e.dead) return;
      const frac = Math.max(0, Math.min(1, e.life / e.stats.maxLife));
      const hurt = frac < 1;
      const h = Math.max(2 / tile, 0.11);
      const bx = cx(e.x) - width / 2;
      const by = cy(e.y) - 0.75;

      vfxLayer.rect(bx, by, width, h).fill({
        color: toHexNumber(palette.void),
        alpha: hurt ? 1 : 0.5,
      });
      vfxLayer.rect(bx, by, width * frac, h).fill({
        color: toHexNumber(colour),
        alpha: hurt ? 1 : 0.45,
      });
    };
    for (const m of state.monsters) bar(m, 0.7, palette.ember);
    bar(state.hero, 1.1, palette.verdite);

    // Ranged monsters get a pip, so a pack that shoots is identifiable
    // before it starts shooting.
    for (const m of state.monsters) {
      if (m.dead || !m.skillId) continue;
      vfxLayer
        .circle(cx(m.x), cy(m.y) - 0.55, 0.11)
        .fill(toHexNumber(palette.amethyst));
    }

    // Skill and impact effects. Each kind gets a different SHAPE, not just a
    // different colour — at melee range two lines are indistinguishable.
    for (const fx of state.vfx) {
      const t = Math.min(1, fx.age / fx.ttl);
      const colour = toHexNumber(vfxColour(palette, fx.kind, fx.damageType));
      const alpha = Math.max(0, 1 - t);
      const from = fx.points[0];
      if (!from) continue;
      const to = fx.points[1] ?? from;

      if (fx.kind === 'blight_field') {
        // The second point IS the radius — see poisonDrops. Drawing anything
        // else here would be lying about what the sim poisoned.
        const radius = poisonFieldRadius(Math.hypot(to.x - from.x, to.y - from.y), t);

        vfxLayer
          .circle(cx(from.x), cy(from.y), radius)
          .fill({ color: colour, alpha: Math.max(0, 0.22 * (1 - t)) });
        // The rim has to stay legible as the circle grows, so it outlives the
        // fill rather than fading with it.
        vfxLayer
          .circle(cx(from.x), cy(from.y), radius)
          .stroke({
            width: Math.max(hair, 0.07),
            color: colour,
            alpha: Math.max(0, 0.85 * (1 - t * 0.55)),
          });

        for (const d of poisonDrops(from.x, from.y, radius, t)) {
          if (d.alpha <= 0) continue;
          vfxLayer
            .circle(cx(d.x), cy(d.y), d.r)
            .fill({ color: colour, alpha: Math.min(1, d.alpha) });
        }
        continue;
      }

      if (fx.kind === 'slash') {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const sweep = Math.PI * 0.75;
        const start = angle - sweep / 2 + sweep * t;
        const radius = 0.95;
        // arc() continues the current path, exactly like Canvas2D — without
        // moving to its start first it draws a line from the path origin out
        // to the arc, which reads as a stray beam fired at the map corner.
        vfxLayer
          .moveTo(cx(from.x) + Math.cos(start) * radius, cy(from.y) + Math.sin(start) * radius)
          .arc(cx(from.x), cy(from.y), radius, start, start + sweep * 0.45)
          .stroke({ width: Math.max(hair, 0.18), color: colour, alpha });
        continue;
      }

      if (fx.kind === 'bolt') {
        const travel = Math.min(1, t * 1.5);
        const tail = Math.max(0, travel - 0.3);
        const px = from.x + (to.x - from.x) * travel;
        const py = from.y + (to.y - from.y) * travel;

        vfxLayer
          .moveTo(cx(from.x + (to.x - from.x) * tail), cy(from.y + (to.y - from.y) * tail))
          .lineTo(cx(px), cy(py))
          .stroke({ width: Math.max(hair, 0.1), color: colour, alpha: alpha * 0.7 });
        vfxLayer.circle(cx(px), cy(py), 0.16).fill({ color: colour, alpha });
        continue;
      }

      if (fx.points.length >= 2) {
        vfxLayer.moveTo(cx(from.x), cy(from.y));
        for (const p of fx.points.slice(1)) vfxLayer.lineTo(cx(p.x), cy(p.y));
        vfxLayer.stroke({ width: Math.max(hair, 0.09), color: colour, alpha });
      } else {
        vfxLayer
          .circle(cx(from.x), cy(from.y), 0.16 + t * 0.3)
          .stroke({ width: Math.max(hair, 0.08), color: colour, alpha });
      }
    }
  }

  /** Damage numbers live in screen space so zooming doesn't blur them. */
  function drawFloaters(state: RunState): void {
    state.floaters.forEach((f, i) => {
      let label = floaters[i];
      if (!label) {
        label = new Text({
          text: '',
          style: { fontFamily: 'monospace', fontSize: 16, fill: 0xffffff },
        });
        label.anchor.set(0.5);
        textLayer.addChild(label);
        floaters[i] = label;
      }
      const t = f.age / FLOATER_LIFE;
      label.visible = true;
      label.text = f.text;
      label.style.fontSize = Math.max(10, Math.min(28, tile * (f.crit ? 0.75 : 0.6)));
      label.style.fill = toHexNumber(
        f.on === 'hero' ? palette.ember : f.crit ? palette.citrine : palette.chalk
      );
      label.alpha = Math.max(0, 1 - t);
      label.x = sx(f.x);
      label.y = sy(f.y) - tile * (0.5 + t * 1.2);
    });
    for (let i = state.floaters.length; i < floaters.length; i++) {
      floaters[i].visible = false;
    }
  }

  function draw(state: RunState): void {
    if (state.map !== builtMap) {
      // New run: drop every sprite, the ids belong to a dead sim.
      for (const s of sprites.values()) s.destroy();
      sprites.clear();
      buildMap(state.map);
    }

    camera(state.map, state.hero);

    for (const m of state.monsters) {
      if (!m.dead || m.deathAge < DEATH_FADE) drawEntity(m, state.elapsed);
    }
    if (!state.hero.dead) drawEntity(state.hero, state.elapsed);

    drawOverlays(state);
    drawFloaters(state);
    app.render();
  }

  function resize(width: number, height: number): void {
    app.renderer.resize(Math.max(1, width), Math.max(1, height));
    if (builtMap) camera(builtMap);
  }

  function setZoom(next: number): void {
    zoom = clampZoom(next);
    if (builtMap) camera(builtMap);
  }

  function destroy(): void {
    app.destroy(true, { children: true });
  }

  return { resize, draw, setZoom, destroy };
}
