/**
 * Placeholder renderer: shapes, not sprites.
 *
 * Everything here is deliberately primitive — circles, rects, a diamond for
 * the exit. It exists to answer the load-bearing question from the README
 * ("is watching this for three minutes actually pleasant?") without anyone
 * drawing art first.
 *
 * When real art arrives, write a second Renderer and swap it in game.ts.
 * Nothing outside this file knows what a pixel is.
 */
import { AURA, AURA_BY_ID } from '../data';
import { WALL } from '../sim/grid';
import { DEATH_FADE } from '../sim/run';
import type { RunState, Entity, Floater } from '../sim/run';
import type { FirePixel, Palette, Renderer } from './renderer';
import {
  auraLook,
  burstRadius,
  fireBolt,
  fireBurst,
  fireShades,
  fireSparks,
  clampZoom,
  floorColour,
  floorPalette,
  isWallFace,
  poisonDrops,
  poisonFieldRadius,
  spriteColour,
  livingDecals,
  tileDecals,
  tileSize,
  vfxColour,
  TILE_AT_1X,
  ZOOM_MIN,
} from './renderer';

const FLOATER_LIFE = 1.1;

interface View {
  tile: number;
  offX: number;
  offY: number;
}

export function createCanvasRenderer(host: HTMLElement, palette: Palette): Renderer {
  const canvas = document.createElement('canvas');
  canvas.id = 'run-canvas';
  canvas.setAttribute('aria-label', 'map view');
  host.replaceChildren(canvas);

  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) {
    // Headless (jsdom in smoke.mjs) has no 2D context. The sim is what's
    // under test there, so drawing degrades to a no-op instead of crashing
    // the page on boot.
    return {
      resize: () => {},
      draw: () => {},
      setZoom: () => {},
      panBy: () => {},
      follow: () => {},
      destroy: () => canvas.remove(),
    };
  }
  // Rebound so the narrowing survives into the draw closures below.
  const ctx = maybeCtx;

  let cssWidth = canvas.clientWidth || 640;
  let cssHeight = canvas.clientHeight || 420;
  let zoom = 1;
  /** Where the camera is pointed, in tiles. Null while it follows the hero. */
  let looking: { x: number; y: number } | null = null;
  /** What it centred on last, and the tile size it did it at. */
  let at = { x: 0, y: 0 };
  let lastTile = 0;

  function resize(width: number, height: number): void {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    cssWidth = Math.max(1, Math.floor(width));
    cssHeight = Math.max(1, Math.floor(height));
    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /**
   * Zoom 1 fits the whole map; above that it sits on the focus, clamped. The
   * focus is the hero unless a drag took it — `looking` — and it is clamped in
   * TILES as well, or a long drag banks an offset that takes as many drags to
   * undo as it took to build.
   */
  function viewFor(state: RunState): View {
    const { grid } = state.map;
    const fit = Math.min(cssWidth / grid.width, cssHeight / grid.height);
    const tile = tileSize(zoom, fit);
    const mapW = tile * grid.width;
    const mapH = tile * grid.height;
    lastTile = tile;

    if (looking) {
      looking.x = Math.max(0, Math.min(grid.width - 1, looking.x));
      looking.y = Math.max(0, Math.min(grid.height - 1, looking.y));
    }
    const on = looking ?? state.hero;
    at = { x: on.x, y: on.y };

    if (zoom <= 1) {
      return { tile, offX: (cssWidth - mapW) / 2, offY: (cssHeight - mapH) / 2 };
    }

    let offX = cssWidth / 2 - (on.x + 0.5) * tile;
    let offY = cssHeight / 2 - (on.y + 0.5) * tile;
    offX = mapW <= cssWidth ? (cssWidth - mapW) / 2 : Math.min(0, Math.max(cssWidth - mapW, offX));
    offY = mapH <= cssHeight ? (cssHeight - mapH) / 2 : Math.min(0, Math.max(cssHeight - mapH, offY));
    return { tile, offX, offY };
  }

  const cx = (v: View, x: number) => v.offX + (x + 0.5) * v.tile;
  const cy = (v: View, y: number) => v.offY + (y + 0.5) * v.tile;

  function drawMap(state: RunState, v: View): void {
    const { grid } = state.map;

    // Every colour the floor can be, worked out once per draw rather than
    // eight hex round-trips per tile.
    const floor = floorPalette(palette, state.map.vein, state.map.theme);
    const at = (gx: number, gy: number) => grid.at(gx, gy);

    // Only what is on screen. The floor carries a dozen small rectangles per
    // tile now; drawing the whole map every frame would spend most of it on
    // rock nobody can see.
    const x0 = Math.max(0, Math.floor(-v.offX / v.tile));
    const y0 = Math.max(0, Math.floor(-v.offY / v.tile));
    const x1 = Math.min(grid.width, Math.ceil((cssWidth - v.offX) / v.tile) + 1);
    const y1 = Math.min(grid.height, Math.ceil((cssHeight - v.offY) / v.tile) + 1);

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const tile = grid.at(x, y);
        // Rock gets drawn too now, but only the band you could see from a
        // room — everything past it is the background, which is the same
        // rock a shade darker.
        if (tile === WALL && !isWallFace(at, x, y)) continue;
        ctx.fillStyle = floorColour(floor, tile, x, y);
        ctx.fillRect(
          v.offX + x * v.tile,
          v.offY + y * v.tile,
          Math.ceil(v.tile),
          Math.ceil(v.tile)
        );
      }
    }

    // Rubble, mineral, what a working left and the lit lip under a wall. All
    // here is a whole number of sub-tile pixels, so the floor is drawn on a
    // grid the same way the sprites are.
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        for (const d of tileDecals(floor, at, x, y)) {
          ctx.globalAlpha = d.alpha;
          ctx.fillStyle = d.colour;
          ctx.fillRect(
            v.offX + (x + d.x) * v.tile,
            v.offY + (y + d.y) * v.tile,
            Math.max(1, Math.ceil(d.w * v.tile)),
            Math.max(1, Math.ceil(d.h * v.tile))
          );
        }
        for (const d of livingDecals(floor, at, x, y, state.elapsed)) {
          ctx.globalAlpha = d.alpha;
          ctx.fillStyle = d.colour;
          ctx.fillRect(
            v.offX + (x + d.x) * v.tile,
            v.offY + (y + d.y) * v.tile,
            Math.max(1, Math.ceil(d.w * v.tile)),
            Math.max(1, Math.ceil(d.h * v.tile))
          );
        }
      }
    }
    ctx.globalAlpha = 1;

    // Entrance
    const e = state.map.entrance;
    // The way in: a hole in the floor with a lit lip, not a coloured block.
    // seamLit is a panel violet, and on stone it read as a UI element someone
    // had dropped on the map.
    ctx.fillStyle = palette.rockDeep;
    ctx.fillRect(
      cx(v, e.x) - v.tile * 0.32,
      cy(v, e.y) - v.tile * 0.32,
      v.tile * 0.64,
      v.tile * 0.64
    );
    ctx.fillStyle = floor.rockLit;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(
      cx(v, e.x) - v.tile * 0.32,
      cy(v, e.y) + v.tile * 0.22,
      v.tile * 0.64,
      v.tile * 0.1
    );
    ctx.globalAlpha = 1;
  }

  /** Shown on everything alive; dimmed while untouched. */
  function drawLifeBar(v: View, e: Entity, width: number, colour: string): void {
    const frac = Math.max(0, Math.min(1, e.life / e.stats.maxLife));
    const hurt = frac < 1;

    const w = v.tile * width;
    const h = Math.max(2, v.tile * 0.12);
    const x = cx(v, e.x) - w / 2;
    const y = cy(v, e.y) - v.tile * 0.72;

    ctx.globalAlpha = hurt ? 1 : 0.5;
    ctx.fillStyle = palette.void;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = hurt ? 1 : 0.45;
    ctx.fillStyle = colour;
    ctx.fillRect(x, y, w * frac, h);
    ctx.globalAlpha = 1;
  }

  /** Size hint per kind, so a Brute reads as bigger than a Grub. */
  function sizeOf(sprite: string): number {
    if (sprite === 'brute') return 0.42;
    if (sprite === 'stalker') return 0.26;
    if (sprite === 'grub') return 0.27;
    return 0.32;
  }

  function drawMonster(v: View, m: Entity): void {
    // Corpses shrink and fade rather than vanishing mid-frame.
    const fading = m.dead;
    const t = fading ? Math.min(1, m.deathAge / DEATH_FADE) : 0;
    if (fading && t >= 1) return;

    const r = v.tile * sizeOf(m.sprite) * (1 - t * 0.6);
    ctx.globalAlpha = 1 - t;
    ctx.beginPath();
    ctx.arc(cx(v, m.x), cy(v, m.y), r, 0, Math.PI * 2);
    ctx.fillStyle = m.hitFlash > 0 ? palette.chalk : spriteColour(palette, m.sprite);
    ctx.fill();

    // A short facing tick — crude, but it tells you which way it's going.
    if (!fading) {
      ctx.strokeStyle = palette.void;
      ctx.lineWidth = Math.max(1, v.tile * 0.08);
      ctx.beginPath();
      ctx.moveTo(cx(v, m.x), cy(v, m.y));
      ctx.lineTo(
        cx(v, m.x) + Math.cos(m.facing) * r,
        cy(v, m.y) + Math.sin(m.facing) * r
      );
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    if (!fading) {
      drawLifeBar(v, m, 0.7, palette.ember);
      // Pip marks a monster that shoots.
      if (m.skillId) {
        ctx.beginPath();
        ctx.arc(cx(v, m.x), cy(v, m.y) - v.tile * 0.55, v.tile * 0.11, 0, Math.PI * 2);
        ctx.fillStyle = palette.amethyst;
        ctx.fill();
      }
    }
  }

  /** Fire pixels as whole device pixels, so nothing lands half-lit. */
  function blocks(v: View, pixels: FirePixel[], type: string, fade: number): void {
    const shades = fireShades(palette, type);
    for (const p of pixels) {
      if (p.alpha <= 0) continue;
      ctx.globalAlpha = Math.min(1, Math.max(0, p.alpha * fade));
      ctx.fillStyle = shades[p.shade];
      const size = Math.max(1, Math.round(p.size * v.tile));
      ctx.fillRect(Math.round(cx(v, p.x)), Math.round(cy(v, p.y)), size, size);
    }
  }

  function drawVfx(v: View, state: RunState): void {
    for (const fx of state.vfx) {
      const t = Math.min(1, fx.age / fx.ttl);
      const colour = vfxColour(palette, fx.kind, fx.damageType);
      const from = fx.points[0];
      if (!from) continue;
      const to = fx.points[1] ?? from;

      ctx.globalAlpha = Math.max(0, 1 - t);
      ctx.strokeStyle = colour;
      ctx.fillStyle = colour;
      ctx.lineWidth = Math.max(1, v.tile * 0.1);

      if (fx.kind === 'blight_field') {
        // The second point IS the radius — see poisonDrops. Drawing anything
        // else here would be lying about what the sim poisoned.
        const radius = poisonFieldRadius(Math.hypot(to.x - from.x, to.y - from.y), t);
        const px = cx(v, from.x);
        const py = cy(v, from.y);

        // Pool, then a hard rim. The rim is the part that has to stay legible
        // as it grows, so it fades far slower than the fill.
        ctx.globalAlpha = Math.max(0, 0.22 * (1 - t));
        ctx.beginPath();
        ctx.arc(px, py, radius * v.tile, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = Math.max(0, 0.85 * (1 - t * 0.55));
        ctx.lineWidth = Math.max(1.5, v.tile * 0.07);
        ctx.beginPath();
        ctx.arc(px, py, radius * v.tile, 0, Math.PI * 2);
        ctx.stroke();

        for (const d of poisonDrops(from.x, from.y, radius, t)) {
          if (d.alpha <= 0) continue;
          ctx.globalAlpha = Math.min(1, d.alpha);
          ctx.beginPath();
          ctx.arc(cx(v, d.x), cy(v, d.y), Math.max(1, d.r * v.tile), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (fx.kind === 'burst') {
        // Second point carries the radius, same contract as the poison field.
        const radius = Math.hypot(to.x - from.x, to.y - from.y);
        // A scorch under the ring, so the blast leaves a footprint. Dark, not
        // tinted: a translucent flame-coloured disc just muddies the floor.
        ctx.globalAlpha = Math.max(0, 0.3 * (1 - t));
        ctx.fillStyle = palette.void;
        ctx.beginPath();
        ctx.arc(cx(v, from.x), cy(v, from.y), burstRadius(radius, t) * v.tile, 0, Math.PI * 2);
        ctx.fill();
        blocks(v, fireBurst(from, radius, t), fx.damageType, 1);
      } else if (fx.kind === 'slash') {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const sweep = Math.PI * 0.75;
        const start = angle - sweep / 2 + sweep * t;
        ctx.lineWidth = Math.max(2, v.tile * 0.18);
        ctx.beginPath();
        ctx.arc(cx(v, from.x), cy(v, from.y), v.tile * 0.95, start, start + sweep * 0.45);
        ctx.stroke();
      } else if (fx.kind === 'flame') {
        blocks(v, fireBolt(from, to, t), fx.damageType, 1 - t);
      } else if (fx.kind === 'bolt') {
        const travel = Math.min(1, t * 1.5);
        const tail = Math.max(0, travel - 0.3);
        const px = from.x + (to.x - from.x) * travel;
        const py = from.y + (to.y - from.y) * travel;
        ctx.beginPath();
        ctx.moveTo(cx(v, from.x + (to.x - from.x) * tail), cy(v, from.y + (to.y - from.y) * tail));
        ctx.lineTo(cx(v, px), cy(v, py));
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx(v, px), cy(v, py), v.tile * 0.16, 0, Math.PI * 2);
        ctx.fill();
      } else if (fx.points.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(cx(v, from.x), cy(v, from.y));
        for (const p of fx.points.slice(1)) ctx.lineTo(cx(v, p.x), cy(v, p.y));
        ctx.stroke();
      } else {
        blocks(v, fireSparks(from, t), fx.damageType, 1);
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawHero(v: View, hero: Entity, emerge: number): void {
    const r = v.tile * 0.38 * emerge;
    const x = cx(v, hero.x);
    const y = cy(v, hero.y) + v.tile * 0.8 * (1 - emerge);
    if (r < 0.5) return;

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = hero.hitFlash > 0 ? palette.ember : palette.quartz;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = palette.void;
    ctx.fill();

    drawLifeBar(v, hero, 1.1, palette.verdite);
  }

  /** Under the bodies: the field they are standing in, not a badge on them. */
  function drawAuras(state: RunState, v: View): void {
    for (const m of state.monsters) {
      if (m.dead || !m.aura) continue;
      const def = AURA_BY_ID[m.aura];
      if (!def) continue;
      const look = auraLook(palette, def);
      ctx.globalAlpha = look.alpha;
      ctx.fillStyle = look.colour;
      ctx.beginPath();
      ctx.arc(cx(v, m.x), cy(v, m.y), AURA.radius * v.tile, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = Math.min(1, look.alpha * 2.5);
      ctx.strokeStyle = look.colour;
      ctx.lineWidth = Math.max(1, v.tile * 0.04);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function drawFloater(v: View, f: Floater): void {
    const t = f.age / FLOATER_LIFE;
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.fillStyle = f.on === 'hero' ? palette.ember : f.crit ? palette.citrine : palette.chalk;
    ctx.font = `${f.crit ? 700 : 500} ${Math.max(9, v.tile * (f.crit ? 0.75 : 0.6))}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(f.text, cx(v, f.x), cy(v, f.y) - v.tile * (0.5 + t * 1.2));
    ctx.globalAlpha = 1;
  }

  function draw(state: RunState, emerge = 1): void {
    const v = viewFor(state);

    ctx.fillStyle = palette.void;
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    drawMap(state, v);
    drawAuras(state, v);

    for (const m of state.monsters) {
      if (!m.dead || m.deathAge < DEATH_FADE) drawMonster(v, m);
    }
    if (state.lampwright) drawMonster(v, state.lampwright);
    if (!state.hero.dead) drawHero(v, state.hero, emerge);
    drawVfx(v, state);
    for (const f of state.floaters) drawFloater(v, f);
  }

  function setZoom(next: number, on?: { x: number; y: number }): void {
    const was = zoom;
    zoom = clampZoom(next);
    if (!looking || !on || lastTile <= 0 || zoom === was || zoom <= ZOOM_MIN) return;
    // The point under the cursor stays under it — but only once a drag has
    // taken the camera; leaning in while following must not lose the hero.
    // Above fit the tile size is absolute, which is the whole conversion.
    const world = { x: at.x + on.x / lastTile, y: at.y + on.y / lastTile };
    const next2 = TILE_AT_1X * zoom;
    looking = { x: world.x - on.x / next2, y: world.y - on.y / next2 };
  }

  function panBy(dx: number, dy: number): void {
    if (lastTile <= 0) return;
    looking = { x: at.x - dx / lastTile, y: at.y - dy / lastTile };
  }

  const follow = (): void => {
    looking = null;
  };

  resize(cssWidth, cssHeight);
  return { resize, draw, setZoom, panBy, follow, destroy: () => canvas.remove() };
}
