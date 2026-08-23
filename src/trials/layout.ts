/**
 * Geometry for the trials web. Knows nothing about any modifier.
 *
 * A REGION owns a WEDGE of the circle and every one of its nodes sits inside
 * it: the gate near the middle, then each branch on its own sub-angle with the
 * radius rising along it. A tree laid out that way cannot cross itself, which
 * is what lets the web grow to a hundred and fifty nodes without anybody
 * checking a picture — the only links that leave a branch are the RUNGS between
 * neighbouring branches of the same region, drawn at one radius.
 *
 * Coordinates come out of a stable hash rather than a random number, so the web
 * is the same web on every machine: a save points at ids, and ids are positional.
 */
import { CENTRE } from '../trees/node';
import type { SkillNodeDef } from '../trees/node';
import type { BuiltTrials, TrialSpec } from './spec';

/** The gate's own radius, and how far each step along a branch reaches. */
const GATE_R = 2.1;
const STEP_R = 1.25;
/** Radians between neighbouring branches of one region. Three branches span
 *  two of these, which has to stay inside a wedge however many regions there
 *  are — twelve regions is a wedge of 0.52. */
const SPREAD = 0.17;
/** Which step carries the RUNG across to the branch beside it: the second, so
 *  a rung is a shortcut you reach rather than one you start on. */
const RUNG_AT = 1;

const TAU = Math.PI * 2;

/** Stable 0..1 wobble. Perfect rows read as a diagram rather than a web. */
const jitter = (a: number, b: number, salt: number): number => {
  const h = Math.sin(a * 127.1 + b * 311.7 + salt * 74.7) * 43758.5453;
  return h - Math.floor(h);
};

export function buildTrials(spec: TrialSpec): BuiltTrials {
  if (spec.regions.length === 0) throw new Error('the trials web has no regions');

  const nodes: SkillNodeDef[] = [];
  const regionOf: Record<string, string> = {};
  const seen = new Set<string>();

  const put = (node: SkillNodeDef, region: string): void => {
    if (seen.has(node.id)) throw new Error(`two trial nodes called ${node.id}`);
    seen.add(node.id);
    nodes.push(node);
    regionOf[node.id] = region;
  };

  spec.regions.forEach((region, r) => {
    const base = (r / spec.regions.length) * TAU - Math.PI / 2;

    put(
      {
        id: region.gate.id,
        name: region.gate.name,
        description: region.gate.description,
        kind: 'notable',
        x: Math.cos(base) * GATE_R,
        y: Math.sin(base) * GATE_R,
        links: [CENTRE],
        ...(region.gate.stats ? { stats: region.gate.stats } : {}),
        ...(region.gate.grants ? { grants: region.gate.grants } : {}),
        ...(region.gate.choices ? { choices: region.gate.choices } : {}),
      },
      region.id
    );

    /** Each branch's node ids in order, so a rung can name the one beside it. */
    const along: string[][] = [];

    region.branches.forEach((branch, b) => {
      const lean = (b - (region.branches.length - 1) / 2) * SPREAD;
      const ids: string[] = [];
      let previous = region.gate.id;

      const steps = branch.minors.length + 1;
      for (let step = 0; step < steps; step++) {
        const tip = step === steps - 1;
        const minor = tip ? null : branch.minors[step];
        const id = tip ? branch.notable.id : `${spec.prefix}_${region.id}_${branch.id}${step}`;
        const angle = base + lean + (jitter(r, step + b * 7, 3) - 0.5) * 0.045;
        const reach = GATE_R + STEP_R * (step + 1) + (jitter(r, step + b * 13, 4) - 0.5) * 0.18;

        put(
          {
            id,
            name: tip ? branch.notable.name : branch.theme,
            description: tip ? branch.notable.description : minor!.text,
            kind: tip ? 'notable' : 'minor',
            x: Math.cos(angle) * reach,
            y: Math.sin(angle) * reach,
            links: [previous],
            ...(tip
              ? {
                  ...(branch.notable.stats ? { stats: branch.notable.stats } : {}),
                  ...(branch.notable.grants ? { grants: branch.notable.grants } : {}),
                  ...(branch.notable.choices ? { choices: branch.notable.choices } : {}),
                }
              : { stats: minor!.stats ?? [], ...(minor!.grants ? { grants: minor!.grants } : {}) }),
          },
          region.id
        );
        ids.push(id);
        previous = id;
      }
      along.push(ids);
    });

    // The RUNGS: one link across to the branch beside it, so a region is a web
    // rather than a fan and there is more than one way to reach its far side.
    for (let b = 1; b < along.length; b++) {
      const from = along[b][RUNG_AT];
      const to = along[b - 1][RUNG_AT];
      if (!from || !to) continue;
      nodes.find((n) => n.id === from)!.links.push(to);
    }
  });

  return { spec, nodes, regionOf };
}
