/**
 * WHICH LEG IS LEADING, FRAME BY FRAME.  `feetread.mts <id> [state]`
 *
 * A stance's WIDTH says a foot is planted, never which foot — two poses with
 * the SAME leg forward measure identically to a real cycle, which is how a
 * broken walk passed a width check. So the feet are read as separate blobs:
 * in this three-quarter view the NEAR foot is the lower on screen and the
 * LEADING one is further along the travel. A walk alternates which leads; two
 * contacts leading with the same foot is a limp. The call is WEAK when both
 * feet sit at the same height — read it as confirming an eye, not replacing one.
 */
import { GENERATED } from '../../src/render/generated-art';

const [id, stateArg] = process.argv.slice(2);
const state = stateArg ?? 'walk';
const b = GENERATED[id] as { grid: number; frames: string[][]; states: Record<string, number[]> };
if (!b) throw new Error(`no body '${id}'`);

for (const [k, fi] of b.states[state].entries()) {
  const f = b.frames[fi];
  const N = b.grid;
  let low = -1;
  f.forEach((row, y) => { if ([...row].some((c) => c !== '.')) low = y; });
  const from = low - Math.round(N * 0.14); // shin and below: one blob a foot

  const seen = new Set<number>();
  const blobs: { x: number; y: number; n: number; x0: number; x1: number }[] = [];
  for (let y = from; y <= low; y++) for (let x = 0; x < N; x++) {
    if (f[y]?.[x] === '.' || f[y]?.[x] === undefined || seen.has(y * N + x)) continue;
    const stack = [y * N + x]; seen.add(y * N + x);
    let sx = 0, sy = 0, n = 0, x0 = N, x1 = -1;
    while (stack.length) {
      const p = stack.pop()!, py = Math.floor(p / N), px = p % N;
      sx += px; sy += py; n++; if (px < x0) x0 = px; if (px > x1) x1 = px;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]] as const) {
        const nx = px + dx, ny = py + dy, q = ny * N + nx;
        if (nx < 0 || nx >= N || ny < from || ny > low || seen.has(q)) continue;
        if (f[ny]?.[nx] === '.' || f[ny]?.[nx] === undefined) continue;
        seen.add(q); stack.push(q);
      }
    }
    if (n >= 6) blobs.push({ x: sx / n, y: sy / n, n, x0, x1 });
  }
  blobs.sort((a, z) => z.n - a.n);
  const feet = blobs.slice(0, 2).sort((a, z) => a.x - z.x);
  if (feet.length < 2) {
    console.log(`  frame ${k + 1}: ONE blob — feet together, or overlapping. Passing pose.`);
    continue;
  }
  const [back, front] = feet;
  const leading = front.y > back.y ? 'NEAR' : 'FAR'; // lower on screen is nearer
  console.log(
    `  frame ${k + 1}: feet at x ${back.x.toFixed(0)} and ${front.x.toFixed(0)}` +
    ` (${(front.x - back.x).toFixed(0)} apart), y ${back.y.toFixed(0)}/${front.y.toFixed(0)}` +
    ` — leading foot is the ${leading} one`
  );
}
