/**
 * WHAT SEPARATES ONE BODY'S DRAWING FROM ANOTHER'S.  `styleread.mts <id…>`
 *
 * "Match the style" is not an instruction anybody can act on. These are the
 * four things that actually differ between a drawn sprite and a rendered one
 * shrunk down, each a number an art director can aim at.
 */
import { GENERATED } from '../../src/render/generated-art';

const luma = (h: string) => {
  const [r, g, b] = [1, 3, 5].map((o) => parseInt(h.slice(o, o + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

for (const id of process.argv.slice(2)) {
  const b = GENERATED[id] as { grid: number; frames: string[][]; key: Record<string, string> };
  if (!b) { console.log(`  ${id}: not in GENERATED`); continue; }
  const frames = b.frames;

  // 1. CONTOUR: the share of edge pixels — ink with transparency beside it —
  //    that are among the darkest inks. A drawn sprite is outlined; a render
  //    fades out instead.
  let edge = 0, darkEdge = 0;
  const lumas = Object.values(b.key).map(luma);
  const darkest = [...lumas].sort((a, z) => a - z)[Math.floor(lumas.length * 0.25)];
  // 2. CLUSTERS: mean run of one colour along a row. Chunky art runs long.
  let runs = 0, runPx = 0;
  // 3. STEPS: mean luma jump between neighbouring different inks.
  let steps = 0, stepSum = 0;
  for (const f of frames) {
    f.forEach((row, y) => {
      let prev = '', run = 0;
      [...row].forEach((ch, x) => {
        const here = b.key[ch];
        if (here) {
          const near = [row[x - 1], row[x + 1], f[y - 1]?.[x], f[y + 1]?.[x]];
          if (near.some((n) => n === '.' || n === undefined)) {
            edge++;
            if (luma(here) <= darkest) darkEdge++;
          }
          const left = b.key[row[x - 1] ?? '.'];
          if (left && left !== here) { steps++; stepSum += Math.abs(luma(here) - luma(left)); }
        }
        if (ch === prev) run++;
        else { if (run) { runs++; runPx += run; } prev = ch; run = 1; }
      });
      if (run) { runs++; runPx += run; }
    });
  }
  // 4. INKS actually used, and how many are near-duplicates of another.
  const inks = Object.values(b.key);
  let crowded = 0;
  for (let i = 0; i < inks.length; i++) for (let j = i + 1; j < inks.length; j++) {
    const a = [1, 3, 5].map((o) => parseInt(inks[i].slice(o, o + 2), 16));
    const z = [1, 3, 5].map((o) => parseInt(inks[j].slice(o, o + 2), 16));
    if (Math.abs(a[0] - z[0]) + Math.abs(a[1] - z[1]) + Math.abs(a[2] - z[2]) < 24) { crowded++; break; }
  }
  console.log(
    `  ${id.padEnd(15)} contour ${((darkEdge / Math.max(1, edge)) * 100).toFixed(0).padStart(3)}% of its edge` +
    `   clusters ${(runPx / Math.max(1, runs)).toFixed(1)}px` +
    `   value step ${(stepSum / Math.max(1, steps)).toFixed(1)}` +
    `   ${inks.length} inks, ${crowded} near-duplicate`
  );
}
