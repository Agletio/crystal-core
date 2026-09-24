/**
 * THE ABYSS, PLAYED HEADLESS by the game's own policy — the hero nobody drives.
 * It is the proof that the transplant in `src/abyss/sim.ts` still reaches what
 * it reaches, and it is how the level's difficulty is read rather than guessed.
 *
 *   npx tsx tools/abyss/check.mts [seeds]
 *
 * Fails on a MECHANISM: a run that does not end, a Herald that never rises, a
 * body standing at the end. The clear time and the low-water mark are printed.
 */
import { Abyss, aethermancer } from '../../src/abyss/sim';
import { TICK } from '../../src/sim/run';

const seeds = Number(process.argv[2] ?? 4);
const band = process.env.BAND ? Number(process.env.BAND) : undefined;
const where = process.env.WHERE ? { zone: Number(process.env.WHERE.split(':')[0]), rung: Number(process.env.WHERE.split(':')[1]) } : undefined;
let failed = 0;
for (let seed = 1; seed <= seeds; seed++) {
  const run = new Abyss(aethermancer('Check', seed, band), seed, false, where);
  const s = run.sim.state;
  let low = 1;
  let t = 0;
  while (run.phase !== 'cleared' && run.phase !== 'died' && t < 900) {
    run.step(TICK);
    t += TICK;
    low = Math.min(low, s.hero.life / s.hero.stats.maxLife);
  }
  const standing = s.monsters.filter((m) => !m.dead).length;
  const ok = run.phase === 'cleared' ? run.herald !== null && standing === 0 : run.phase === 'died';
  if (!ok) failed++;
  console.log(
    `seed ${seed}: ${run.phase.padEnd(8)} ${t.toFixed(0).padStart(4)}s  killed ${s.killed}/${s.totalMonsters}` +
      `  low water ${(low * 100).toFixed(0)}%  herald ${run.herald ? (run.herald.dead ? 'down' : 'standing') : 'never rose'}` +
      `  casts ${s.casts}  blinks ${s.blinks}${ok ? '' : '  <- FAIL'}`
  );
}
if (failed) {
  console.error(`\n${failed} run(s) ended wrong`);
  process.exit(1);
}
