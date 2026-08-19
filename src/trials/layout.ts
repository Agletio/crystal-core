/**
 * Geometry for the trials web. Knows nothing about any modifier.
 *
 * Arms off the middle, three nodes each, ending in the notable — and however
 * many arms the spec carries, because this is the one web that grows. They
 * spread evenly round the circle, so adding one moves every other arm rather
 * than being wedged into a gap.
 *
 * Coordinates come out of a stable hash rather than a random number, so the web
 * is the same web on every machine: a save points at ids, and ids are positional.
 */
import { CENTRE } from '../trees/node';
import type { SkillNodeDef } from '../trees/node';
import type { BuiltTrials, TrialSpec } from './spec';

/** How far out each step along an arm sits. Three, so an arm is three nodes. */
const ARM_R = [1.5, 2.7, 3.9];
/** How far an arm may lean off straight by the time it reaches the tip. */
const BEND = 0.2;

const TAU = Math.PI * 2;

export const TRIAL_ARM_STEPS = ARM_R.length;

/** Stable 0..1 wobble. Perfect rows read as a diagram rather than a web. */
const jitter = (a: number, b: number, salt: number): number => {
  const h = Math.sin(a * 127.1 + b * 311.7 + salt * 74.7) * 43758.5453;
  return h - Math.floor(h);
};

export function buildTrials(spec: TrialSpec): BuiltTrials {
  if (spec.arms.length === 0) throw new Error('the trials web has no arms');

  const nodes: SkillNodeDef[] = [];
  const armOf: Record<string, string> = {};

  spec.arms.forEach((arm, a) => {
    const base = (a / spec.arms.length) * TAU - Math.PI / 2;
    const lean = (jitter(a, 0, 11) - 0.5) * 2 * BEND;
    let previous = CENTRE;

    for (let step = 0; step < TRIAL_ARM_STEPS; step++) {
      const tip = step === TRIAL_ARM_STEPS - 1;
      const minor = tip ? null : arm.minors[step];
      const id = tip ? arm.notable.id : `${spec.prefix}_${arm.id}_m${step}`;
      const along = (step + 1) / TRIAL_ARM_STEPS;
      const angle = base + lean * along + (jitter(a, step, 3) - 0.5) * 0.06;
      const reach = ARM_R[step] + (jitter(a, step, 4) - 0.5) * 0.2;

      nodes.push({
        id,
        name: tip ? arm.notable.name : arm.theme,
        description: tip ? arm.notable.description : minor!.text,
        kind: tip ? 'notable' : 'minor',
        x: Math.cos(angle) * reach,
        y: Math.sin(angle) * reach,
        links: [previous],
        ...(tip
          ? {
              ...(arm.notable.stats ? { stats: arm.notable.stats } : {}),
              ...(arm.notable.grants ? { grants: arm.notable.grants } : {}),
            }
          : { stats: minor!.stats ?? [] }),
      });
      armOf[id] = arm.id;
      previous = id;
    }
  });

  return { spec, nodes, armOf };
}
