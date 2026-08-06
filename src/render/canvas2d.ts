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
import { WALL } from '../sim/grid';
import { DEATH_FADE } from '../sim/run';
import type { RunState, Entity, Floater } from '../sim/run';
import type { Palette, Renderer } from './renderer';
import {
  clampZoom,
  floorColour,
  poisonDrops,
  poisonFieldRadius,
  spriteColour,
  tileFleck,
  tileSize,
  veinColour,
  vfxColour,
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
      destroy: () => canvas.remove(),
    };
  }
  // Rebound so the narrowing survives into the draw closures below.
  const ctx = maybeCtx;

  let cssWidth = canvas.clientWidth || 640;
  let cssHeight = canvas.clientHeight || 420;
  let zoom = 1;

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

  /** Zoom 1 fits the whole map; above that it follows the hero, clamped. */
  function viewFor(state: RunState): View {
    const { grid } = state.map;
    const fit = Math.min(cssWidth / grid.width, cssHeight / grid.height);
    const tile = tileSize(zoom, fit);
    const mapW = tile * grid.width;
    const mapH = tile * grid.height;

    if (zoom <= 1) {
      return { tile, offX: (cssWidth - mapW) / 2, offY: (cssHeight - mapH) / 2 };
    }

    const hero = state.hero;
    let offX = cssWidth / 2 - (hero.x + 0.5) * tile;
    let offY = cssHeight / 2 - (hero.y + 0.5) * tile;
    offX = mapW <= cssWidth ? (cssWidth - mapW) / 2 : Math.min(0, Math.max(cssWidth - mapW, offX));
    offY = mapH <= cssHeight ? (cssHeight - mapH) / 2 : Math.min(0, Math.max(cssHeight - mapH, offY));
    return { tile, offX, offY };
  }

  const cx = (v: View, x: number) => v.offX + (x + 0.5) * v.tile;
  const cy = (v: View, y: number) => v.offY + (y + 0.5) * v.tile;

  function drawMap(state: RunState, v: View): void {
    const { grid } = state.map;

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const tile = grid.at(x, y);
        if (tile === WALL) continue;
        ctx.fillStyle = floorColour(palette, tile, x, y);
        ctx.fillRect(
          v.offX + x * v.tile,
          v.offY + y * v.tile,
          Math.ceil(v.tile),
          Math.ceil(v.tile)
        );
      }
    }

    // Mineral in the rock, in the socketed crystal's own colour. Drawn after
    // the floor so a fleck sits ON the stone rather than replacing a tile of
    // it, and before the wall edges so it never breaks the map's outline.
    ctx.fillStyle = veinColour(palette, state.map.vein);
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.at(x, y) === WALL) continue;
        const fleck = tileFleck(x, y);
        if (!fleck) continue;
        ctx.moveTo(v.offX + (fleck.x + fleck.r) * v.tile, v.offY + fleck.y * v.tile);
        ctx.arc(
          v.offX + fleck.x * v.tile,
          v.offY + fleck.y * v.tile,
          fleck.r * v.tile,
          0,
          Math.PI * 2
        );
      }
    }
    ctx.fill();
    ctx.globalAlpha = 1;

    // Bright edge where floor meets wall gives the map readable shape without
    // needing tilesets.
    ctx.strokeStyle = palette.floorLit;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.at(x, y) === WALL) continue;
        if (grid.at(x, y - 1) === WALL) {
          ctx.moveTo(v.offX + x * v.tile, v.offY + y * v.tile);
          ctx.lineTo(v.offX + (x + 1) * v.tile, v.offY + y * v.tile);
        }
        if (grid.at(x, y + 1) === WALL) {
          ctx.moveTo(v.offX + x * v.tile, v.offY + (y + 1) * v.tile);
          ctx.lineTo(v.offX + (x + 1) * v.tile, v.offY + (y + 1) * v.tile);
        }
        if (grid.at(x - 1, y) === WALL) {
          ctx.moveTo(v.offX + x * v.tile, v.offY + y * v.tile);
          ctx.lineTo(v.offX + x * v.tile, v.offY + (y + 1) * v.tile);
        }
        if (grid.at(x + 1, y) === WALL) {
          ctx.moveTo(v.offX + (x + 1) * v.tile, v.offY + y * v.tile);
          ctx.lineTo(v.offX + (x + 1) * v.tile, v.offY + (y + 1) * v.tile);
        }
      }
    }
    ctx.stroke();

    // Entrance
    const e = state.map.entrance;
    ctx.fillStyle = palette.seamLit;
    ctx.fillRect(
      cx(v, e.x) - v.tile * 0.3,
      cy(v, e.y) - v.tile * 0.3,
      v.tile * 0.6,
      v.tile * 0.6
    );

    // Exit — a slow pulse so your eye finds the goal.
    const x = state.map.exit;
    const pulse = 0.75 + 0.25 * Math.sin(state.elapsed * 3);
    ctx.save();
    ctx.translate(cx(v, x.x), cy(v, x.y));
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = palette.citrine;
    ctx.globalAlpha = pulse;
    const s = v.tile * 0.42;
    ctx.fillRect(-s, -s, s * 2, s * 2);
    ctx.restore();
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
      } else if (fx.kind === 'slash') {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const sweep = Math.PI * 0.75;
        const start = angle - sweep / 2 + sweep * t;
        ctx.lineWidth = Math.max(2, v.tile * 0.18);
        ctx.beginPath();
        ctx.arc(cx(v, from.x), cy(v, from.y), v.tile * 0.95, start, start + sweep * 0.45);
        ctx.stroke();
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
        ctx.beginPath();
        ctx.arc(cx(v, from.x), cy(v, from.y), v.tile * (0.18 + t * 0.3), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawHero(v: View, hero: Entity): void {
    const r = v.tile * 0.38;
    const x = cx(v, hero.x);
    const y = cy(v, hero.y);

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

  function drawFloater(v: View, f: Floater): void {
    const t = f.age / FLOATER_LIFE;
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.fillStyle = f.on === 'hero' ? palette.ember : f.crit ? palette.citrine : palette.chalk;
    ctx.font = `${f.crit ? 700 : 500} ${Math.max(9, v.tile * (f.crit ? 0.75 : 0.6))}px ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(f.text, cx(v, f.x), cy(v, f.y) - v.tile * (0.5 + t * 1.2));
    ctx.globalAlpha = 1;
  }

  function draw(state: RunState): void {
    const v = viewFor(state);

    ctx.fillStyle = palette.void;
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    drawMap(state, v);

    for (const m of state.monsters) {
      if (!m.dead || m.deathAge < DEATH_FADE) drawMonster(v, m);
    }
    if (!state.hero.dead) drawHero(v, state.hero);
    drawVfx(v, state);
    for (const f of state.floaters) drawFloater(v, f);
  }

  function setZoom(next: number): void {
    zoom = clampZoom(next);
  }

  resize(cssWidth, cssHeight);
  return { resize, draw, setZoom, destroy: () => canvas.remove() };
}
