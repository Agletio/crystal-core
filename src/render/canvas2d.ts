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
import type { RunState, Entity, Floater } from '../sim/run';
import type { Palette, Renderer } from './renderer';

const FLOATER_LIFE = 1.1;

interface View {
  tile: number;
  offX: number;
  offY: number;
}

export function createCanvasRenderer(
  canvas: HTMLCanvasElement,
  palette: Palette
): Renderer {
  const maybeCtx = canvas.getContext('2d');
  if (!maybeCtx) {
    // Headless (jsdom in smoke.mjs) has no 2D context. The sim is what's
    // under test there, so drawing degrades to a no-op instead of crashing
    // the page on boot.
    return { resize: () => {}, draw: () => {} };
  }
  // Rebound so the narrowing survives into the draw closures below.
  const ctx = maybeCtx;

  let cssWidth = canvas.clientWidth || 640;
  let cssHeight = canvas.clientHeight || 420;

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

  /** Whole map on screen at once — for an idle game you want to see the run,
   *  not chase it with a camera. */
  function viewFor(state: RunState): View {
    const { grid } = state.map;
    const tile = Math.min(cssWidth / grid.width, cssHeight / grid.height);
    return {
      tile,
      offX: (cssWidth - tile * grid.width) / 2,
      offY: (cssHeight - tile * grid.height) / 2,
    };
  }

  const cx = (v: View, x: number) => v.offX + (x + 0.5) * v.tile;
  const cy = (v: View, y: number) => v.offY + (y + 0.5) * v.tile;

  function drawMap(state: RunState, v: View): void {
    const { grid } = state.map;

    ctx.fillStyle = palette.matrix;
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.at(x, y) === WALL) continue;
        ctx.fillRect(
          v.offX + x * v.tile,
          v.offY + y * v.tile,
          Math.ceil(v.tile),
          Math.ceil(v.tile)
        );
      }
    }

    // Seam highlight on floor edges gives the map readable shape without
    // needing tilesets.
    ctx.strokeStyle = palette.seam;
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

  function drawLifeBar(v: View, e: Entity, width: number, colour: string): void {
    const frac = Math.max(0, Math.min(1, e.life / e.stats.maxLife));
    if (frac >= 1) return;

    const w = v.tile * width;
    const h = Math.max(2, v.tile * 0.12);
    const x = cx(v, e.x) - w / 2;
    const y = cy(v, e.y) - v.tile * 0.72;

    ctx.fillStyle = palette.void;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = colour;
    ctx.fillRect(x, y, w * frac, h);
  }

  function drawMonster(v: View, m: Entity): void {
    const r = v.tile * 0.3;
    ctx.beginPath();
    ctx.arc(cx(v, m.x), cy(v, m.y), r, 0, Math.PI * 2);
    ctx.fillStyle = m.hitFlash > 0 ? palette.chalk : palette.ember;
    ctx.fill();
    drawLifeBar(v, m, 0.7, palette.ember);
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
      if (!m.dead) drawMonster(v, m);
    }
    if (!state.hero.dead) drawHero(v, state.hero);
    for (const f of state.floaters) drawFloater(v, f);
  }

  resize(cssWidth, cssHeight);
  return { resize, draw };
}
