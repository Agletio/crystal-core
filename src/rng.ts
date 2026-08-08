/**
 * Seeded RNG. Everything random below the UI goes through one of these and
 * nothing calls Math.random(), so a seed replays a session exactly. mulberry32;
 * swap the core if you need more, but keep the surface identical.
 */
export class Rng {
  private state: number;

  constructor(seed: number = Date.now()) {
    // Force to uint32. A zero state is degenerate for this generator, so nudge
    // it off zero rather than silently producing a constant stream.
    this.state = (seed >>> 0) || 0x9e3779b9;
  }

  /** Raw float in [0, 1). Every other method is built on this one. */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Float in [lo, hi). */
  float(lo: number, hi: number): number {
    return lo + this.next() * (hi - lo);
  }

  /** Integer in [lo, hi] — inclusive both ends, which is how mod ranges read. */
  int(lo: number, hi: number): number {
    return Math.floor(this.float(lo, hi + 1));
  }

  /** True with probability p. p <= 0 is never, p >= 1 is always. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Uniform pick. Undefined on an empty list — callers treat that as "nothing fits". */
  pick<T>(items: readonly T[]): T | undefined {
    if (items.length === 0) return undefined;
    return items[this.int(0, items.length - 1)];
  }

  /** Non-positive weights are skipped, so zeroing one disables an entry. */
  weighted<T>(items: readonly T[], weightOf: (item: T) => number): T | undefined {
    let total = 0;
    for (const item of items) {
      const w = weightOf(item);
      if (w > 0) total += w;
    }
    if (total <= 0) return undefined;

    let roll = this.next() * total;
    for (const item of items) {
      const w = weightOf(item);
      if (w <= 0) continue;
      roll -= w;
      if (roll < 0) return item;
    }
    // Only reachable through floating-point drift on the last entry.
    return items[items.length - 1];
  }

  /** Fisher-Yates, returns a new array. */
  shuffle<T>(items: readonly T[]): T[] {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
}
