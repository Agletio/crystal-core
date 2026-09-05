/**
 * Geometry for a trade web. Knows nothing about any modifier.
 *
 * Five spokes off the middle. Each runs out as a STEM of ONE minor to a gate
 * notable, and there FORKS: two branches lean away by `SPLIT` and carry four
 * nodes each, alternating minor and notable. Ten a spoke, fifty in all.
 *
 * THE ALTERNATION IS LOAD-BEARING: a notable at every even step is what makes a
 * pair of points always buy one, which is how they are handed over.
 *
 * No ring and no cross-link. A link sideways would let a build hop into a
 * neighbour's far notable without walking its arm, and the arm IS the price —
 * which is the whole of what makes the stem worth putting in front of a fork.
 *
 * Coordinates come out of a stable hash rather than a random number, so a trade
 * is the same web on every machine: a save points at ids, and ids are positional.
 */
import { CENTRE } from '../trees/node';
import type { SkillNodeDef } from '../trees/node';
import type { BuiltTrade, TradeSpec } from './spec';

/** How far out the stem's minor and its gate sit. */
const STEM_R = [1.7, 3.2];
/** And the four nodes of a branch past it: minor, notable, minor, notable. */
const BRANCH_R = [4.5, 5.7, 6.9, 8.1];
/** How far a branch leans off the spoke's own line, in radians. */
const SPLIT = 0.34;
/** How far a spoke leans off straight by the time it reaches its gate. */
const BEND = 0.14;

const TAU = Math.PI * 2;

export const SPOKE_COUNT = 5;
export const STEM_STEPS = STEM_R.length;
export const BRANCH_STEPS = BRANCH_R.length;
/** Ten a spoke: a minor, a gate, and two branches of four. */
export const SPOKE_NODES = STEM_STEPS + BRANCH_STEPS * 2;
export const TRADE_NODES = SPOKE_COUNT * SPOKE_NODES;

/** Stable 0..1 wobble. Perfect rows read as a diagram rather than a web. */
const jitter = (a: number, b: number, salt: number): number => {
  const h = Math.sin(a * 127.1 + b * 311.7 + salt * 74.7) * 43758.5453;
  return h - Math.floor(h);
};

export function buildTrade(spec: TradeSpec): BuiltTrade {
  if (spec.spokes.length !== SPOKE_COUNT) {
    throw new Error(`${spec.id}: ${spec.spokes.length} spokes, need ${SPOKE_COUNT}`);
  }

  const nodes: SkillNodeDef[] = [];
  const spokeOf: Record<string, string> = {};

  spec.spokes.forEach((spoke, s) => {
    const base = (s / SPOKE_COUNT) * TAU - Math.PI / 2;
    const lean = (jitter(s, 0, 11) - 0.5) * 2 * BEND;
    let previous = CENTRE;

    const put = (
      id: string,
      name: string,
      description: string,
      kind: 'minor' | 'notable',
      angle: number,
      reach: number,
      from: string,
      extra: Partial<SkillNodeDef>
    ): string => {
      nodes.push({
        id,
        name,
        description,
        kind,
        x: Math.cos(angle) * reach,
        y: Math.sin(angle) * reach,
        links: [from],
        ...extra,
      });
      spokeOf[id] = spoke.id;
      return id;
    };

    // The stem: travel, travel, gate. Everyone on this spoke walks all three.
    for (let step = 0; step < STEM_STEPS; step++) {
      const gate = step === STEM_STEPS - 1;
      const minor = gate ? null : spoke.minors[step];
      const angle = base + lean * ((step + 1) / STEM_STEPS) + (jitter(s, step, 3) - 0.5) * 0.05;
      const reach = STEM_R[step] + (jitter(s, step, 4) - 0.5) * 0.18;
      previous = put(
        gate ? spoke.gate.id : `${spec.prefix}_${spoke.id}_m${step}`,
        gate ? spoke.gate.name : spoke.theme,
        gate ? spoke.gate.description : minor!.text,
        gate ? 'notable' : 'minor',
        angle,
        reach,
        previous,
        gate
          ? {
              ...(spoke.gate.stats ? { stats: spoke.gate.stats } : {}),
              ...(spoke.gate.grants ? { grants: spoke.gate.grants } : {}),
            }
          : { stats: minor!.stats ?? [] }
      );
    }

    // And the fork. Both branches hang off the gate, so the gate is what they
    // cost as well as what they are reached through.
    const gateId = previous;
    spoke.branches.forEach((branch, b) => {
      const away = base + lean + (b === 0 ? -SPLIT : SPLIT);
      let from = gateId;
      for (let step = 0; step < BRANCH_STEPS; step++) {
        // ODD steps are the notables, which is what puts one at every even
        // depth from the middle: minor, notable, minor, notable.
        const tip = step % 2 === 1;
        const notable = tip ? branch.notables[(step - 1) / 2] : null;
        const minor = tip ? null : branch.minors[step / 2];
        const angle = away + (jitter(s, step + b * 7, 5) - 0.5) * 0.05;
        const reach = BRANCH_R[step] + (jitter(s, step + b * 7, 6) - 0.5) * 0.2;
        from = put(
          tip ? notable!.id : `${spec.prefix}_${branch.id}_m${step}`,
          tip ? notable!.name : branch.theme,
          tip ? notable!.description : minor!.text,
          tip ? 'notable' : 'minor',
          angle,
          reach,
          from,
          tip
            ? {
                ...(notable!.stats ? { stats: notable!.stats } : {}),
                ...(notable!.grants ? { grants: notable!.grants } : {}),
              }
            : { stats: minor!.stats ?? [] }
        );
      }
    });
  });

  return { spec, nodes, spokeOf };
}
