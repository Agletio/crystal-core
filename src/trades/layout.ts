/**
 * Geometry for a trade web. Knows nothing about any modifier.
 *
 * Five spokes off the middle, four nodes each, alternating minor and notable.
 * No ring and no fork: a link sideways would let a build hop into a neighbour's
 * far notable without walking its arm, and the arm IS the price. Coordinates
 * come out of a stable hash rather than a random number, so a trade is the same
 * web on every machine — a save points at ids, and ids are positional.
 */
import { CENTRE } from '../trees/node';
import type { SkillNodeDef } from '../trees/node';
import type { BuiltTrade, TradeSpec } from './spec';

/** How far out each step along a spoke sits. Four, so a spoke is four nodes. */
const SPOKE_R = [1.5, 2.65, 3.8, 4.95];
/** How far a spoke may lean off straight by the time it reaches the tip. */
const BEND = 0.16;

const TAU = Math.PI * 2;

export const SPOKE_COUNT = 5;
export const SPOKE_STEPS = SPOKE_R.length;
export const TRADE_NODES = SPOKE_COUNT * SPOKE_STEPS;

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
    // Each spoke leans a different way as it goes out, so five arms read as a
    // web rather than as the spokes of a wheel.
    const lean = (jitter(s, 0, 11) - 0.5) * 2 * BEND;
    let previous = CENTRE;

    for (let step = 0; step < SPOKE_STEPS; step++) {
      const notable = step % 2 === 1 ? spoke.notables[(step - 1) / 2] : null;
      const minor = notable ? null : spoke.minors[step / 2];
      const id = notable ? notable.id : `${spec.prefix}_${spoke.id}_m${step / 2}`;
      const along = (step + 1) / SPOKE_STEPS;
      const angle = base + lean * along + (jitter(s, step, 3) - 0.5) * 0.05;
      const reach = SPOKE_R[step] + (jitter(s, step, 4) - 0.5) * 0.22;

      nodes.push({
        id,
        name: notable?.name ?? spoke.theme,
        description: notable?.description ?? minor!.text,
        kind: notable ? 'notable' : 'minor',
        x: Math.cos(angle) * reach,
        y: Math.sin(angle) * reach,
        links: [previous],
        ...(notable
          ? {
              ...(notable.stats ? { stats: notable.stats } : {}),
              ...(notable.grants ? { grants: notable.grants } : {}),
            }
          : { stats: minor!.stats ?? [] }),
      });
      spokeOf[id] = spoke.id;
      previous = id;
    }
  });

  return { spec, nodes, spokeOf };
}
