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
import { readFileSync, writeFileSync } from 'node:fs';
import { encodePng } from './png.mts';
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
  stamp(name, body);
}

/** A generated body's frames outrun what one edit can dress consistently, so a
 *  piece has to come off ONE frame and be re-stamped on the rest. Whether that
 *  is watchable is not a number: this draws the original row over the stamped
 *  row for a facing, and the answer is in looking at it. */
function stamp(name: string, { grid, dirs, frames, states }: Body): void {
  const per = Object.values(states).flat().length;
  const d = Math.min(2, dirs.length - 1);
  const run = Object.values(states).flat();
  const head = (rows: string[]) => {
    const { top, bottom, wide } = profile(rows, grid);
    const cut = top + Math.round(SLOTS.helm[1] * (bottom - top + 1));
    let sx = 0;
    let n = 0;
    for (let y = top; y < cut; y++) for (let x = 0; x < grid; x++) if (ink(rows, x, y)) { sx += x; n++; }
    return { top, cut, mid: n ? Math.round(sx / n) : Math.round(grid / 2), wide };
  };

  const source = frames[d * per + run[0]];
  const src = head(source);
  const S = 3;
  const OW = run.length * grid * S;
  const OH = 2 * grid * S;
  const out = new Uint8Array(OW * OH * 4);
  for (let i = 0; i < OW * OH; i++) out.set([26, 24, 30, 255], i * 4);
  const put = (row: number, col: number, x: number, y: number, lit: boolean) => {
    for (let sy = 0; sy < S; sy++)
      for (let sx = 0; sx < S; sx++) {
        const at = ((row * grid * S + y * S + sy) * OW + col * grid * S + x * S + sx) * 4;
        out.set(lit ? [200, 198, 192, 255] : [26, 24, 30, 255], at);
      }
  };
  run.forEach((f, col) => {
    const rows = frames[d * per + f];
    const to = head(rows);
    for (let y = 0; y < grid; y++) for (let x = 0; x < grid; x++) put(0, col, x, y, ink(rows, x, y));
    for (let y = to.cut; y < grid; y++) for (let x = 0; x < grid; x++) put(1, col, x, y, ink(rows, x, y));
    // Bottom of the cut band onto the neck, centred on this frame's own head.
    for (let y = src.top; y < src.cut; y++)
      for (let x = 0; x < grid; x++)
        if (ink(source, x, y)) {
          const tx = x - src.mid + to.mid;
          const ty = y - src.cut + to.cut;
          if (tx >= 0 && tx < grid && ty >= 0 && ty < grid) put(1, col, tx, ty, true);
        }
  });
  writeFileSync(`${name}-stamp.png`, encodePng(OW, OH, out));
  console.log(`  ${name}-stamp.png — ${dirs[d]}, drawn over the same frames re-headed`);
}
