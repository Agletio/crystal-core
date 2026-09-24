/**
 * WHAT IS WRITTEN OVER A 3D DESCENT: life bars, the numbers a hit throws up,
 * the names under what is lying about and the marks of what a body is carrying
 * — on one 2D canvas over the WebGL one, at screen size whatever the zoom, so a
 * number is never blurred by the camera or hidden behind a wall.
 *
 * Every colour is the palette's and every rule the 2D renderer's own: a
 * critical lands oversized and settles, a tick wears its Ailment's colour, a
 * bar is framed and lit along its top.
 */
import type { Entity, RunState } from '../sim/run';
import { AILMENTS, AILMENT_BY_ID } from '../data';
import type { Palette } from '../render/renderer';
import { damageColour, floaterInk, lootBeam } from '../render/renderer';

const FLOATER_LIFE = 1.1; // the sim's own, as both 2D renderers keep it
const CRIT_POP = 0.16; // seconds a Critical lands oversized before it settles

export interface Anchor {
  /** CSS pixels of a world point, or null behind the camera. */
  screen(x: number, y: number, z: number): { x: number; y: number } | null;
  /** CSS pixels just over a body's head WHERE IT IS DRAWN — smoothed, lifted, kept clear of the rock —
   *  or null behind the camera: a bar at the sim's own point steps along at the sim's rate. */
  over(e: Entity): { x: number; y: number } | null;
}

export class Overlay {
  readonly canvas = document.createElement('canvas');
  private readonly ctx: CanvasRenderingContext2D | null;
  private w = 1;
  private h = 1;
  private ratio = 1;

  constructor(host: HTMLElement, private readonly palette: Palette) {
    this.canvas.className = 'stage__overlay';
    Object.assign(this.canvas.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });
    host.append(this.canvas);
    this.ctx = this.canvas.getContext('2d');
  }

  resize(w: number, h: number): void {
    this.ratio = Math.min(2, globalThis.devicePixelRatio || 1);
    this.w = w;
    this.h = h;
    this.canvas.width = Math.max(1, Math.round(w * this.ratio));
    this.canvas.height = Math.max(1, Math.round(h * this.ratio));
  }

  private face(): string {
    return getComputedStyle(document.documentElement).getPropertyValue('--body').trim() || 'serif';
  }

  draw(state: RunState, a: Anchor): void {
    const g = this.ctx;
    if (!g) return;
    g.setTransform(this.ratio, 0, 0, this.ratio, 0, 0);
    g.clearRect(0, 0, this.w, this.h);
    const p = this.palette;
    const face = this.face();

    // THE NAMES of what is lying about, ink with the rank in the edge.
    g.textAlign = 'center';
    g.textBaseline = 'top';
    g.font = `12px ${face}`;
    for (const drop of state.ground) {
      const at = a.screen(drop.x, 0, drop.y);
      if (!at) continue;
      const beam = lootBeam(p, drop.rank);
      g.globalAlpha = 0.62 + beam.lit * 0.38;
      g.lineWidth = 2.5;
      g.strokeStyle = beam.colour;
      g.fillStyle = p.void;
      g.strokeText(drop.item.name, at.x, at.y + 8);
      g.fillText(drop.item.name, at.x, at.y + 8);
    }
    g.globalAlpha = 1;

    // A BAR over everything alive, the hero's notched every hundred life.
    const bar = (e: Entity, colour: string, notch: boolean): void => {
      if (e.dead) return;
      const top = a.over(e);
      if (!top) return;
      const w = Math.max(34, Math.min(110, 30 * e.scale));
      const h = notch ? 6 : 5;
      const x = Math.round(top.x - w / 2);
      const y = Math.round(top.y - h);
      const frac = Math.max(0, Math.min(1, e.life / Math.max(1, e.stats.maxLife)));
      g.fillStyle = p.void;
      g.globalAlpha = 0.85;
      g.fillRect(x - 1, y - 1, w + 2, h + 2);
      g.globalAlpha = 0.4;
      g.fillStyle = colour;
      g.fillRect(x, y, w, h);
      g.globalAlpha = 1;
      g.fillRect(x, y, Math.round(w * frac), h);
      g.fillStyle = '#ffffff';
      g.globalAlpha = 0.28;
      g.fillRect(x, y, Math.round(w * frac), 1);
      g.globalAlpha = 1;
      if (notch) {
        g.fillStyle = p.void;
        for (let at = 100; at < e.stats.maxLife; at += 100) g.fillRect(x + Math.round((w * at) / e.stats.maxLife), y + (at % 1000 ? 1 : 0), at % 1000 ? 1 : 2, h - (at % 1000 ? 1 : 0));
      }
      // WHAT IS ON IT: a stone a kind of Ailment, its count beside it, over the bar.
      let dx = 0;
      for (const def of AILMENTS) {
        const stacks = e.ailments.reduce((n, ail) => n + (ail.id === def.id ? 1 : 0), 0);
        if (!stacks) continue;
        g.fillStyle = p.void;
        g.fillRect(x + dx - 1, y - 9, 8, 8);
        g.fillStyle = damageColour(p, def.type);
        g.fillRect(x + dx, y - 8, 6, 6);
        if (stacks > 1) {
          g.font = `9px ${face}`;
          g.textAlign = 'left';
          g.fillStyle = p.chalk;
          g.fillText(String(stacks), x + dx + 7, y - 10);
          dx += 8;
        }
        dx += 9;
      }
      g.textAlign = 'center';
    };
    for (const m of state.monsters) if (m !== state.boss) bar(m, p.ember, false);
    if (state.hero && !state.hero.dead) bar(state.hero, p.verdite, true);

    // THE NUMBERS, rising and fading, a critical oversized until it settles.
    g.textBaseline = 'middle';
    for (const f of state.floaters) {
      const t = f.age / FLOATER_LIFE;
      const at = a.screen(f.x, 1.6 + t * 1.3, f.y);
      if (!at) continue;
      const ticked = f.tick ? AILMENT_BY_ID[f.tick] : undefined;
      const px = f.crit ? 25 : ticked ? 12 : 17;
      const pop = f.crit && f.age < CRIT_POP ? 1 + 0.7 * (1 - f.age / CRIT_POP) : 1;
      const ink = floaterInk(p, f, ticked ? damageColour(p, ticked.type) : undefined);
      g.font = `${f.crit ? 'bold ' : ''}${Math.round(px * pop)}px ${face}`;
      g.globalAlpha = Math.max(0, 1 - t);
      g.lineWidth = Math.max(2, px * (f.crit ? 0.18 : 0.14));
      g.strokeStyle = ink.edge;
      g.fillStyle = ink.fill;
      g.strokeText(f.text, at.x, at.y);
      g.fillText(f.text, at.x, at.y);
    }
    g.globalAlpha = 1;
  }

  dispose(): void {
    this.canvas.remove();
  }
}
