/**
 * The damage breakdown, in words. Here rather than in the sheet so the demo can
 * check that the working shown reproduces the number shown.
 */
import { AILMENT_OF_TYPE, DAMAGE_TYPE_BY_ID } from './data';
import type { CombatStats, DamagePart, DamageStep } from './sim/stats';

const round = (n: number) => Math.round(n).toString();
const trim = (n: number): string => String(Math.round(n * 100) / 100);

/** WHAT A DAMAGE TYPE LEAVES BEHIND at this build's numbers, as a HEAD and the
 *  facts under it. One fact a line and no sentences: a paragraph in a column
 *  four words wide is a wall nobody reads. `chance` is 0 for a type this build
 *  cannot apply, and the sheet leaves those out entirely. */
export interface AilmentReading {
  chance: number;
  head: string;
  facts: Array<[string, string]>;
}

export function ailmentReading(type: string, stats: CombatStats): AilmentReading | null {
  const def = AILMENT_OF_TYPE[type];
  if (!def) return null;

  const chance = Math.round(stats.ailmentChance?.[def.id] ?? def.chance);
  const dps = Math.round(stats.ailmentDps?.[def.id] ?? def.dps ?? 0);
  const facts: Array<[string, string]> = [];
  if (def.kind === 'chill') {
    facts.push(['Slow', `${def.slowPer}% per application`]);
    facts.push(['Frozen at', `${def.freezeAt} stacks, for ${def.freezeSeconds}s`]);
  } else if (def.kind === 'curse') {
    facts.push(['Damage on death', `${trim(def.burstShare ?? 0)}% of maximum life`]);
    facts.push(['Area of effect', `${trim(def.burstRadius ?? 0)} tiles`]);
  } else if (def.kind === 'exposure') {
    facts.push(['Damage taken', `+${def.takenPer}% per application`]);
  } else if (def.kind === 'shock') {
    facts.push(['DPS', String(dps)]);
    facts.push(['Arcs', `${Math.round((def.arcShare ?? 0) * 100)}% to ${def.arcTargets} nearby`]);
  } else {
    facts.push(['DPS', String(dps)]);
  }
  facts.push(['Duration', `${def.seconds}s`]);
  return { chance, head: `${def.name} Chance`, facts };
}

/** The same reading on ONE line, for a tooltip and for the demo's check. */
export function ailmentLine(type: string, stats: CombatStats): string {
  const read = ailmentReading(type, stats);
  const named = DAMAGE_TYPE_BY_ID[type]?.name ?? type;
  if (!read) return `${named}: no Ailment`;
  return `${read.head}: ${read.chance}%, ${read.facts.map(([k, v]) => `${k} ${v}`).join(', ')}`;
}

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
