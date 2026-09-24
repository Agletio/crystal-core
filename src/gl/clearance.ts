/**
 * WHERE A BODY IS DRAWN, when where it stands would put its width into rock.
 *
 * The sim keeps a body's CENTRE off rock and never its width, and it may not be
 * told otherwise: a step that minded the width measurably changed who kills
 * what. So the picture moves instead — a body within its own half-width of a
 * face, a boulder, a chest or a seam is drawn that much further out, off a
 * distance field sampled a quarter metre apart. The push is scaled by how
 * steeply the field climbs, so down the middle of a passage narrower than the
 * body, where the two faces pull equally, it is drawn where it stands rather
 * than shaken from wall to wall.
 */
export interface Edge {
  ax: number;
  az: number;
  bx: number;
  bz: number;
}
export interface Round {
  x: number;
  z: number;
  r: number;
}

const STEP = 0.25; // metres between samples
const REACH = 1.2; // metres past which nothing is near enough to matter
const MOST = 0.45; // the furthest a body is ever drawn from where it stands

export class Clearance {
  private readonly field: Float32Array;
  private readonly w: number;
  private readonly h: number;

  constructor(width: number, height: number, edges: Edge[], rounds: Round[]) {
    this.w = Math.ceil((width + 1) / STEP) + 1;
    this.h = Math.ceil((height + 1) / STEP) + 1;
    this.field = new Float32Array(this.w * this.h).fill(REACH);
    const bins = new Map<number, number[]>();
    const key = (i: number, j: number) => j * 4096 + i;
    edges.forEach((e, n) => {
      const i0 = Math.floor(Math.min(e.ax, e.bx) - REACH);
      const i1 = Math.floor(Math.max(e.ax, e.bx) + REACH);
      const j0 = Math.floor(Math.min(e.az, e.bz) - REACH);
      const j1 = Math.floor(Math.max(e.az, e.bz) + REACH);
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) (bins.get(key(i + 8, j + 8)) ?? bins.set(key(i + 8, j + 8), []).get(key(i + 8, j + 8))!).push(n);
    });
    for (let j = 0; j < this.h; j++) {
      for (let i = 0; i < this.w; i++) {
        const x = i * STEP - 1;
        const z = j * STEP - 1;
        let d = REACH;
        for (const n of bins.get(key(Math.floor(x) + 8, Math.floor(z) + 8)) ?? []) {
          const e = edges[n];
          const ex = e.bx - e.ax;
          const ez = e.bz - e.az;
          const u = Math.max(0, Math.min(1, ((x - e.ax) * ex + (z - e.az) * ez) / (ex * ex + ez * ez || 1e-9)));
          d = Math.min(d, Math.hypot(x - e.ax - ex * u, z - e.az - ez * u));
        }
        for (const r of rounds) {
          if (Math.abs(r.x - x) < REACH + r.r && Math.abs(r.z - z) < REACH + r.r) d = Math.min(d, Math.max(0, Math.hypot(x - r.x, z - r.z) - r.r));
        }
        this.field[j * this.w + i] = d;
      }
    }
  }

  /** The field between its samples. */
  private at(x: number, z: number): number {
    const fx = Math.max(0, Math.min(this.w - 1.001, (x + 1) / STEP));
    const fz = Math.max(0, Math.min(this.h - 1.001, (z + 1) / STEP));
    const i = Math.floor(fx);
    const j = Math.floor(fz);
    const tx = fx - i;
    const tz = fz - j;
    const f = this.field;
    const w = this.w;
    return (f[j * w + i] * (1 - tx) + f[j * w + i + 1] * tx) * (1 - tz) + (f[(j + 1) * w + i] * (1 - tx) + f[(j + 1) * w + i + 1] * tx) * tz;
  }

  /** Where to draw a body of half-width `r` that stands at (x, z). */
  place(x: number, z: number, r: number, out: { x: number; z: number }): { x: number; z: number } {
    out.x = x;
    out.z = z;
    const d = this.at(x, z);
    if (d >= r) return out;
    const h = STEP * 2;
    const gx = (this.at(x + h, z) - this.at(x - h, z)) / (2 * h);
    const gz = (this.at(x, z + h) - this.at(x, z - h)) / (2 * h);
    const steep = Math.hypot(gx, gz);
    if (steep < 1e-3) return out;
    const push = Math.min(MOST, r - d) * Math.min(1, steep);
    out.x += (gx / steep) * push;
    out.z += (gz / steep) * push;
    return out;
  }
}
