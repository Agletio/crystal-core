/**
 * Does a slot's BAND land on the same part of the body every frame?  `anchor.mts [sprite ...]`
 *
 * `layer.mts` cuts a piece out of a dressed frame at a fraction of that frame's
 * own extent, so a helm layer is everything above 0.24 of the body. That holds
 * only while the fraction keeps meaning "the neck" — an arm over the head
 * lengthens the extent, and a body lying flat has no vertical order at all. The
 * neck is read as the narrowest row of the top third, and what is being judged
 * is the SPREAD: a fixed distance off the real neck is calibration, and only a
 * range that MOVES is drift. A body holding a raised tool defeats the estimator
 * outright, so a wide spread wants the cut drawn on the frames and LOOKED at.
 */
import { readFileSync } from 'node:fs';
import { SLOTS } from './layer.mts';

const SRC = new URL('../../src/render/generated-art.ts', import.meta.url).pathname;

type Body = { grid: number; dirs: string[]; frames: string[][]; states: Record<string, number[]> };

/** Evaluated rather than imported: importing drags the renderer in behind it. */
function bodies(): Record<string, Body> {
  const src = readFileSync(SRC, 'utf8');
  const open = src.indexOf('{', src.indexOf('export const GENERATED'));
  return new Function(`return ${src.slice(open, src.lastIndexOf('};') + 1)}`)() as Record<string, Body>;
}

const ink = (rows: string[], x: number, y: number) => rows[y]?.[x] !== undefined && rows[y][x] !== '.';

/** Rows the body occupies, and how wide it is on each of them. */
function profile(rows: string[], grid: number): { top: number; bottom: number; wide: number[] } {
  let top = grid;
  let bottom = -1;
  const wide: number[] = [];
  for (let y = 0; y < grid; y++) {
    let n = 0;
    for (let x = 0; x < grid; x++) if (ink(rows, x, y)) n++;
    if (n) {
      if (y < top) top = y;
      bottom = y;
    }
    wide.push(n);
  }
  return { top, bottom, wide };
}

for (const name of process.argv.length > 2 ? process.argv.slice(2) : ['hewer']) {
  const body = bodies()[name];
  if (!body) {
    console.log(`${name}: not in GENERATED`);
    continue;
  }
  const { grid, dirs, frames, states } = body;
  const per = Object.values(states).flat().length;
  const cut = SLOTS.helm[1];
  console.log(`\n${name}  grid ${grid}  ${dirs.length} facings x ${per} frames  helm cut at ${cut}`);

  for (const [state, run] of Object.entries(states)) {
    const off: number[] = [];
    const tall: number[] = [];
    for (let d = 0; d < dirs.length; d++)
      for (const f of run) {
        const { top, bottom, wide } = profile(frames[d * per + f], grid);
        if (bottom < 0) continue;
        const span = bottom - top + 1;
        tall.push(span);
        // The neck: the narrowest row of the top third, which is a feature of
        // the drawing rather than of the bounding box.
        let neck = top + 1;
        for (let y = top + 2; y < top + Math.max(3, Math.floor(span / 3)); y++)
          if (wide[y] <= wide[neck]) neck = y;
        off.push(top + Math.round(cut * span) - neck);
      }
    const low = Math.min(...off);
    const high = Math.max(...off);
    console.log(
      `  ${state.padEnd(7)} cut sits ${String(low).padStart(3)} to ${String(high).padStart(3)} px ` +
        `off the neck over ${String(off.length).padStart(2)} frames — spread ${String(high - low).padStart(2)} px  ` +
        `(body ${Math.min(...tall)}-${Math.max(...tall)} px tall)`,
    );
  }
}
