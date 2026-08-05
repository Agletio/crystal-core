/**
 * A* on the tile grid.
 *
 * Deliberately plain: a binary heap and 8-way movement. Repathing is rate
 * limited by the callers, and only entities near the hero path at all, so
 * this has never been the bottleneck. Replace it if that stops being true.
 */
import { Grid, WALL } from './grid';
import type { Vec2 } from './grid';

const DIRS: Array<[number, number, number]> = [
  [1, 0, 1],
  [-1, 0, 1],
  [0, 1, 1],
  [0, -1, 1],
  [1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [-1, -1, Math.SQRT2],
];

class MinHeap {
  private items: Array<{ key: number; cost: number }> = [];

  get size(): number {
    return this.items.length;
  }

  push(key: number, cost: number): void {
    this.items.push({ key, cost });
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].cost <= this.items[i].cost) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  pop(): number {
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let smallest = i;
        if (l < this.items.length && this.items[l].cost < this.items[smallest].cost) smallest = l;
        if (r < this.items.length && this.items[r].cost < this.items[smallest].cost) smallest = r;
        if (smallest === i) break;
        [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
        i = smallest;
      }
    }
    return top.key;
  }
}

/** Diagonals may not cut a wall corner — otherwise entities clip through. */
function canStep(grid: Grid, x: number, y: number, dx: number, dy: number): boolean {
  if (grid.at(x + dx, y + dy) === WALL) return false;
  if (dx !== 0 && dy !== 0) {
    if (grid.at(x + dx, y) === WALL || grid.at(x, y + dy) === WALL) return false;
  }
  return true;
}

/**
 * Tile path from `from` to `to`, excluding the starting tile.
 * Empty array means unreachable — callers treat that as "stand still".
 */
export function findPath(grid: Grid, from: Vec2, to: Vec2, maxNodes = 4000): Vec2[] {
  const sx = Math.round(from.x);
  const sy = Math.round(from.y);
  const gx = Math.round(to.x);
  const gy = Math.round(to.y);

  if (sx === gx && sy === gy) return [];
  if (grid.at(gx, gy) === WALL) return [];

  const { width } = grid;
  const key = (x: number, y: number) => y * width + x;
  const goal = key(gx, gy);

  const gScore = new Map<number, number>();
  const cameFrom = new Map<number, number>();
  const open = new MinHeap();
  const closed = new Set<number>();

  const h = (x: number, y: number) => Math.hypot(x - gx, y - gy);

  gScore.set(key(sx, sy), 0);
  open.push(key(sx, sy), h(sx, sy));

  let expanded = 0;
  while (open.size > 0 && expanded < maxNodes) {
    const current = open.pop();
    if (closed.has(current)) continue;
    closed.add(current);
    expanded++;

    if (current === goal) break;

    const cx = current % width;
    const cy = (current - cx) / width;
    const base = gScore.get(current)!;

    for (const [dx, dy, cost] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!grid.inBounds(nx, ny) || !canStep(grid, cx, cy, dx, dy)) continue;

      const nk = key(nx, ny);
      if (closed.has(nk)) continue;

      const tentative = base + cost;
      const known = gScore.get(nk);
      if (known !== undefined && known <= tentative) continue;

      gScore.set(nk, tentative);
      cameFrom.set(nk, current);
      open.push(nk, tentative + h(nx, ny));
    }
  }

  if (!cameFrom.has(goal) && goal !== key(sx, sy)) return [];

  const path: Vec2[] = [];
  let node = goal;
  const start = key(sx, sy);
  while (node !== start) {
    const x = node % width;
    path.push({ x, y: (node - x) / width });
    const prev = cameFrom.get(node);
    if (prev === undefined) return [];
    node = prev;
  }
  return path.reverse();
}
