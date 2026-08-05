/**
 * WebGL renderer, built on PixiJS.
 *
 * Same Renderer interface as canvas2d — the sim can't tell them apart. This
 * one draws actual sprites with animation, batches on the GPU, and is what a
 * real art pass plugs into: replace makeSheet() in sprites.ts with a loader
 * and nothing in this file changes.
 *
 * Construction is async (Pixi 8 initialises the GPU device asynchronously) and
 * can fail — no WebGL, headless, a hostile driver. It returns null in that
 * case and the caller falls back to canvas2d rather than showing nothing.
 */
import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { WALL } from '../sim/grid';
import { DEATH_FADE } from '../sim/run';
import type { Entity, RunState } from '../sim/run';
import type { GameMap } from '../sim/grid';
import type { Palette, Renderer } from './renderer';
import { toHexNumber, vfxColour } from './renderer';
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
    textures[name] = frames.map((canvas) => Texture.from(canvas));
  }

  const app = new Application();
  try {
    await app.init({
      width: Math.max(1, host.clientWidth),
      height: Math.max(1, Math.round(host.clientWidth * 0.66)),
      background: toHexNumber(palette.void),
      antialias: true,
      autoDensity: true,
      resolution: Math.min(globalThis.devicePixelRatio || 1, 2),
      preference: 'webgl',
    });
  } catch {
    // No GPU here. Caller falls back.
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

  const mapLayer = new Graphics();
  const vfxLayer = new Graphics();
  const entityLayer = new Container();
  const textLayer = new Container();
  app.stage.addChild(mapLayer, entityLayer, vfxLayer, textLayer);

  let builtMap: GameMap | null = null;
  let tile = 1;
  let offX = 0;
  let offY = 0;

  const sprites = new Map<number, Sprite>();
  const floaters: Text[] = [];

  const cx = (x: number) => offX + (x + 0.5) * tile;
  const cy = (y: number) => offY + (y + 0.5) * tile;

  function layout(map: GameMap): void {
    const w = app.renderer.width / app.renderer.resolution;
    const h = app.renderer.height / app.renderer.resolution;
    tile = Math.min(w / map.grid.width, h / map.grid.height);
    offX = (w - tile * map.grid.width) / 2;
    offY = (h - tile * map.grid.height) / 2;
  }

  /** The map is static for a whole run — draw it once, not every frame. */
  function buildMap(map: GameMap): void {
    const { grid } = map;
    mapLayer.clear();

    const floor = toHexNumber(palette.matrix);
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.at(x, y) === WALL) continue;
        mapLayer.rect(offX + x * tile, offY + y * tile, tile + 1, tile + 1).fill(floor);
      }
    }

    const seam = toHexNumber(palette.seam);
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.at(x, y) === WALL) continue;
        const px = offX + x * tile;
        const py = offY + y * tile;
        if (grid.at(x, y - 1) === WALL) mapLayer.moveTo(px, py).lineTo(px + tile, py);
        if (grid.at(x, y + 1) === WALL)
          mapLayer.moveTo(px, py + tile).lineTo(px + tile, py + tile);
        if (grid.at(x - 1, y) === WALL) mapLayer.moveTo(px, py).lineTo(px, py + tile);
        if (grid.at(x + 1, y) === WALL)
          mapLayer.moveTo(px + tile, py).lineTo(px + tile, py + tile);
      }
    }
    mapLayer.stroke({ width: 1, color: seam });

    const e = map.entrance;
    mapLayer
      .rect(cx(e.x) - tile * 0.3, cy(e.y) - tile * 0.3, tile * 0.6, tile * 0.6)
      .fill(toHexNumber(palette.seamLit));

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
    const frame =
      e.action === 'move' ? Math.floor(elapsed * WALK_CYCLE) % WALK_FRAMES : 0;
    s.texture = frames[frame];

    const scale = (tile / CELL) * sizeOf(e.sprite) * (1 - fade * 0.5);
    s.scale.set(scale);
    s.alpha = 1 - fade;
    s.rotation = fade * 1.2;

    // Lunge toward whatever it's hitting; recoil when hit.
    let lunge = 0;
    if (e.action === 'attack') lunge = tile * 0.22 * Math.max(0, e.actionTimer / 0.22);
    if (e.action === 'hurt') lunge = -tile * 0.12;

    s.x = cx(e.x) + Math.cos(e.facing) * lunge;
    s.y = cy(e.y) + Math.sin(e.facing) * lunge;

    // A gentle bob while walking sells motion more than the frames do.
    if (e.action === 'move') s.y -= Math.abs(Math.sin(elapsed * WALK_CYCLE * Math.PI)) * tile * 0.06;

    // Sprites are authored facing right; flip rather than rotate so they never
    // appear upside down.
    s.scale.x = Math.abs(s.scale.x) * (Math.cos(e.facing) < 0 ? -1 : 1);
    s.tint = e.hitFlash > 0 ? toHexNumber(palette.chalk) : 0xffffff;
  }

  function drawOverlays(state: RunState): void {
    vfxLayer.clear();

    // Exit marker, pulsing.
    const x = state.map.exit;
    const pulse = 0.75 + 0.25 * Math.sin(state.elapsed * 3);
    vfxLayer
      .rect(cx(x.x) - tile * 0.32, cy(x.y) - tile * 0.32, tile * 0.64, tile * 0.64)
      .fill({ color: toHexNumber(palette.citrine), alpha: pulse });

    // Life bars on everything alive, not just the wounded — the whole point
    // is seeing at a glance who is and isn't taking damage. Untouched bars
    // are dimmed so a full room doesn't shout.
    const bar = (e: Entity, width: number, colour: string) => {
      if (e.dead) return;
      const frac = Math.max(0, Math.min(1, e.life / e.stats.maxLife));
      const hurt = frac < 1;
      const w = tile * width;
      const h = Math.max(2, tile * 0.11);
      const bx = cx(e.x) - w / 2;
      const by = cy(e.y) - tile * 0.75;

      vfxLayer.rect(bx, by, w, h).fill({
        color: toHexNumber(palette.void),
        alpha: hurt ? 1 : 0.5,
      });
      vfxLayer.rect(bx, by, w * frac, h).fill({
        color: toHexNumber(colour),
        alpha: hurt ? 1 : 0.45,
      });
    };
    for (const m of state.monsters) bar(m, 0.7, palette.ember);
    bar(state.hero, 1.1, palette.verdite);

    // Ranged monsters get a pip, so a pack that shoots is identifiable before
    // it starts shooting.
    for (const m of state.monsters) {
      if (m.dead || !m.skillId) continue;
      vfxLayer
        .circle(cx(m.x), cy(m.y) - tile * 0.55, tile * 0.11)
        .fill(toHexNumber(palette.amethyst));
    }

    // Skill and impact effects. Each kind gets a different SHAPE, not just a
    // different colour — at melee range two lines are indistinguishable.
    for (const fx of state.vfx) {
      const t = Math.min(1, fx.age / fx.ttl);
      const colour = toHexNumber(vfxColour(palette, fx.kind, fx.damageType));
      const alpha = Math.max(0, 1 - t);
      const from = fx.points[0];
      const to = fx.points[1] ?? from;

      if (fx.kind === 'slash' && from) {
        // An arc that sweeps through the swing, centred on the attacker.
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const sweep = Math.PI * 0.75;
        const start = angle - sweep / 2 + sweep * t;
        const radius = tile * 0.95;

        // arc() continues the current path, exactly like Canvas2D — without
        // moving to its start first it draws a line from wherever the path
        // was (the canvas origin) out to the arc, which reads as a stray
        // beam shooting off to the corner of the map.
        vfxLayer
          .moveTo(cx(from.x) + Math.cos(start) * radius, cy(from.y) + Math.sin(start) * radius)
          .arc(cx(from.x), cy(from.y), radius, start, start + sweep * 0.45)
          .stroke({ width: Math.max(2, tile * 0.18), color: colour, alpha });
        continue;
      }

      if (fx.kind === 'bolt' && from) {
        // A projectile that actually travels, with a short trail behind it.
        const travel = Math.min(1, t * 1.5);
        const tail = Math.max(0, travel - 0.3);
        const px = from.x + (to.x - from.x) * travel;
        const py = from.y + (to.y - from.y) * travel;
        const tx = from.x + (to.x - from.x) * tail;
        const ty = from.y + (to.y - from.y) * tail;

        vfxLayer
          .moveTo(cx(tx), cy(ty))
          .lineTo(cx(px), cy(py))
          .stroke({ width: Math.max(1, tile * 0.1), color: colour, alpha: alpha * 0.7 });
        vfxLayer.circle(cx(px), cy(py), tile * 0.16).fill({ color: colour, alpha });
        continue;
      }

      if (fx.points.length >= 2) {
        vfxLayer.moveTo(cx(from.x), cy(from.y));
        for (const p of fx.points.slice(1)) vfxLayer.lineTo(cx(p.x), cy(p.y));
        vfxLayer.stroke({ width: Math.max(1, tile * 0.09), color: colour, alpha });
      } else if (from) {
        vfxLayer
          .circle(cx(from.x), cy(from.y), tile * (0.16 + t * 0.3))
          .stroke({ width: Math.max(1, tile * 0.08), color: colour, alpha });
      }
    }
  }

  function drawFloaters(state: RunState): void {
    // Pooled — creating a Text per damage number would thrash the atlas.
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
      label.style.fontSize = Math.max(9, tile * (f.crit ? 0.75 : 0.6));
      label.style.fill = toHexNumber(
        f.on === 'hero' ? palette.ember : f.crit ? palette.citrine : palette.chalk
      );
      label.alpha = Math.max(0, 1 - t);
      label.x = cx(f.x);
      label.y = cy(f.y) - tile * (0.5 + t * 1.2);
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
      layout(state.map);
      buildMap(state.map);
    }

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
    if (builtMap) {
      layout(builtMap);
      buildMap(builtMap);
    }
  }

  function destroy(): void {
    app.destroy(true, { children: true });
  }

  return { resize, draw, destroy };
}
