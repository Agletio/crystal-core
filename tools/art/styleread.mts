/**
 * WHAT SEPARATES ONE BODY'S DRAWING FROM ANOTHER'S.  `styleread.mts <id…>`
 *
 * "Match the style" is not an instruction anybody can act on. These are the
 * things that actually differ between a drawn sprite and a rendered one shrunk
 * down. LUMA RANGE is the root of the rest: big value steps and a dark contour
 * are both impossible inside a narrow one, so read it first.
 */
import { GENERATED } from '../../src/render/generated-art';

const luma = (h: string) => {
  const [r, g, b] = [1, 3, 5].map((o) => parseInt(h.slice(o, o + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

/** Measured off the shipped roster, and written up in `art/decisions/LIGHT.md`:
 *  the MASS is dark in every zone and only the light changes. */
const BANDS: Record<string, string> = {
  normal:    'The Shallows — median 17-33, brightest 50-89, chroma ~10 near-grey, warm',
  demonic:   'The Rot      — median 21-28, brightest 59-86, chroma ~20, warm',
  prismatic: 'The Prism    — median 19-26, brightest 72-109, chroma ~22, COOL',
  people:    'the camp     — median 17-45, brightest 65-146, lit by what they carry',
};
if (process.env.FAMILY) console.log(`  band: ${BANDS[process.env.FAMILY] ?? 'no such family'}`);

for (const id of process.argv.slice(2)) {
  const b = GENERATED[id] as { grid: number; frames: string[][]; key: Record<string, string> };
  if (!b) { console.log(`  ${id}: not in GENERATED`); continue; }
  const frames = b.frames;

  // CONTOUR: the share of edge pixels among the darkest inks. A drawn sprite
  // is outlined; a render fades out instead.
  let edge = 0, darkEdge = 0;
  const lumas = Object.values(b.key).map(luma);
  const darkest = [...lumas].sort((a, z) => a - z)[Math.floor(lumas.length * 0.25)];
  // CLUSTERS: mean run of one colour along a row. Chunky art runs long.
  let runs = 0, runPx = 0;
  // STEPS: mean luma jump between neighbouring inks.
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
  const inks = Object.values(b.key);
  let crowded = 0;
  for (let i = 0; i < inks.length; i++) for (let j = i + 1; j < inks.length; j++) {
    const a = [1, 3, 5].map((o) => parseInt(inks[i].slice(o, o + 2), 16));
    const z = [1, 3, 5].map((o) => parseInt(inks[j].slice(o, o + 2), 16));
    if (Math.abs(a[0] - z[0]) + Math.abs(a[1] - z[1]) + Math.abs(a[2] - z[2]) < 24) { crowded++; break; }
  }
  // Every shipped body spans 65-99 luma.
  const spread = [...lumas].sort((a, z) => a - z);
  // The MEDIAN of the pixels, not of the palette: where the body's mass sits.
  // A range can be right while the whole creature is lit far too brightly.
  const px: number[] = [];
  for (const f of frames) for (const row of f) for (const ch of row) {
    const hex = b.key[ch]; if (hex) px.push(luma(hex));
  }
  px.sort((a, z) => a - z);
  console.log(
    `  ${id.padEnd(15)} luma ${spread[0].toFixed(0).padStart(3)}-${spread[spread.length - 1].toFixed(0).padStart(3)}` +
    ` (range ${(spread[spread.length - 1] - spread[0]).toFixed(0).padStart(3)})` +
    `  median ${px[Math.floor(px.length / 2)].toFixed(0).padStart(3)}` +
    `   contour ${((darkEdge / Math.max(1, edge)) * 100).toFixed(0).padStart(3)}%` +
    `   clusters ${(runPx / Math.max(1, runs)).toFixed(1)}px` +
    `   step ${(stepSum / Math.max(1, steps)).toFixed(1)}` +
    `   ${inks.length} inks`
  );
}
