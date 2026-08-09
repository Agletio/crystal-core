/**
 * The damage breakdown, in words. Here rather than in the sheet so the demo can
 * check that the working shown reproduces the number shown.
 */
import type { DamagePart, DamageStep } from './sim/stats';

const round = (n: number) => Math.round(n).toString();

/** Every factor behind one damage type, in the order it was applied. */
export function damageWorkings(part: DamagePart, steps: DamageStep[]): string {
  const bits: string[] = [];
  if (part.base) bits.push(`${round(part.base)} base`);
  if (part.flat) {
    bits.push(`${part.flat > 0 ? '+' : ''}${round(part.flat)} flat`);
    // Beside the flat it weighs; last it would read as a factor on the pass.
    if (part.added !== 1) bits.push(`×${part.added.toFixed(2)} added`);
  }
  if (part.increased) bits.push(`+${round(part.increased)}% inc`);
  for (const m of part.more) bits.push(`×${(1 + m / 100).toFixed(2)} more`);
  for (const step of steps) bits.push(`×${step.value} ${step.label}`);
  return bits.join('  ');
}

/**
 * What a working comes to when you do what it says. The demo compares this
 * against the number printed beside it; nothing else calls it.
 */
export function readWorkings(text: string): number {
  let base = 0;
  let flat = 0;
  let added = 1;
  let increased = 0;
  let product = 1;

  for (const token of text.split(/\s{2,}/).filter(Boolean)) {
    const m = /^([+-]?[\d.]+)% inc$/.exec(token);
    const x = /^×([\d.]+) /.exec(token);
    if (/ base$/.test(token)) base = Number(token.split(' ')[0]);
    else if (/ flat$/.test(token)) flat = Number(token.split(' ')[0]);
    else if (/ added$/.test(token)) added = Number(x![1]);
    else if (m) increased = Number(m[1]);
    else if (x) product *= Number(x[1]);
  }
  return (base + flat * added) * (1 + increased / 100) * product;
}
