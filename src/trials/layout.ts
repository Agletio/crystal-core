/**
 * Geometry for the trials web: a MAP of wheels joined by roads.
 *
 * A ROAD is a straight run of generic nodes between two anchors. Anchors sit on
 * concentric rings and a road only ever joins one ring to the next, so two
 * roads can meet at an anchor and never cross in between — which is what keeps
 * a hundred and fifty nodes readable without anybody checking a picture.
 *
 * A WHEEL is a ring of minors about its anchor, linked into a cycle, entered
 * where the road arrives and holding its major at the middle — joined to the
 * ring at the point OPPOSITE the entrance, so half the ring is what the major
 * costs and which half is the decision.
 */
import { CENTRE } from '../trees/node';
import type { SkillNodeDef } from '../trees/node';
import type { BuiltTrials, TrialSpec } from './spec';

/** How far a wheel's ring stands off its anchor, and how many nodes are on it. */
const RING_R = 1.15;
/** Web units between road nodes. A road is at least two, or it is a link. */
const ROAD_STEP = 1.55;

const TAU = Math.PI * 2;

/** Stable 0..1 wobble. Perfect rows read as a diagram rather than a web. */
const jitter = (a: number, b: number, salt: number): number => {
  const h = Math.sin(a * 127.1 + b * 311.7 + salt * 74.7) * 43758.5453;
  return h - Math.floor(h);
};

export function buildTrials(spec: TrialSpec): BuiltTrials {
  if (spec.wheels.length === 0) throw new Error('the trials web has no wheels');

  const nodes: SkillNodeDef[] = [];
  const regionOf: Record<string, string> = {};
  const byId = new Map<string, SkillNodeDef>();

  const put = (node: SkillNodeDef, region: string): void => {
    if (byId.has(node.id)) throw new Error(`two trial nodes called ${node.id}`);
    byId.set(node.id, node);
    nodes.push(node);
    regionOf[node.id] = region;
  };

  const anchor = (id: string): { x: number; y: number } =>
    id === CENTRE ? { x: 0, y: 0 } : spec.wheels.find((w) => w.id === id)!.at;

  // --- the wheels ----------------------------------------------------------
  //
  // Built first, because a road has to know which ring node to arrive at.
  /** Wheel id -> its ring's node ids, in order round the circle. */
  const rings = new Map<string, string[]>();

  spec.wheels.forEach((wheel, w) => {
    const ring: string[] = [];
    const count = wheel.minors.length;
    wheel.minors.forEach((minor, i) => {
      const angle = (i / count) * TAU - Math.PI / 2 + (jitter(w, i, 5) - 0.5) * 0.05;
      const reach = RING_R + (jitter(w, i, 6) - 0.5) * 0.08;
      const id = `${spec.prefix}_${wheel.id}_r${i}`;
      put(
        {
          id,
          name: wheel.theme,
          description: minor.text,
          kind: 'minor',
          x: wheel.at.x + Math.cos(angle) * reach,
          y: wheel.at.y + Math.sin(angle) * reach,
          links: [],
          stats: minor.stats ?? [],
          ...(minor.grants ? { grants: minor.grants } : {}),
        },
        wheel.id
      );
      ring.push(id);
    });
    // The ring is a CYCLE, so a wheel is walked either way round.
    ring.forEach((id, i) => byId.get(id)!.links.push(ring[(i + 1) % count]));
    rings.set(wheel.id, ring);

    put(
      {
        id: wheel.major.id,
        name: wheel.major.name,
        description: wheel.major.description,
        kind: 'notable',
        x: wheel.at.x,
        y: wheel.at.y,
        links: [],
        ...(wheel.major.stats ? { stats: wheel.major.stats } : {}),
        ...(wheel.major.grants ? { grants: wheel.major.grants } : {}),
        ...(wheel.major.choices ? { choices: wheel.major.choices } : {}),
      },
      wheel.id
    );
  });

  // --- the roads -----------------------------------------------------------
  const laid = new Set<string>();

  for (const wheel of spec.wheels) {
    for (const other of wheel.roads) {
      const key = [wheel.id, other].sort().join('|');
      if (laid.has(key)) continue;
      laid.add(key);

      const from = anchor(other);
      const to = wheel.at;
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const span = Math.hypot(dx, dy);
      const count = Math.max(2, Math.round(span / ROAD_STEP) - 1);

      // Which node each end hands the road to: the ring node NEAREST it, so a
      // road arrives where it is pointing rather than at an arbitrary spoke.
      const nearest = (id: string, towards: { x: number; y: number }): string => {
        if (id === CENTRE) return CENTRE;
        const ring = rings.get(id)!;
        return ring.reduce((best, at) => {
          const node = byId.get(at)!;
          const pick = byId.get(best)!;
          return Math.hypot(node.x - towards.x, node.y - towards.y) <
            Math.hypot(pick.x - towards.x, pick.y - towards.y)
            ? at
            : best;
        }, ring[0]);
      };

      let previous = nearest(other, to);
      const walk: string[] = [];
      for (let i = 0; i < count; i++) {
        const along = (i + 1) / (count + 1);
        const salt = key.length + i;
        const off = (jitter(from.x + i, to.y, salt) - 0.5) * 0.5;
        const id = `${spec.prefix}_road_${key.replace('|', '_')}_${i}`;
        const line = spec.road[(salt + i * 3) % spec.road.length];
        put(
          {
            id,
            name: 'The Way There',
            description: line.text,
            kind: 'minor',
            // Pushed off the straight line, so a road reads as a road rather
            // than as a ruler laid between two things.
            x: from.x + dx * along - (dy / span) * off,
            y: from.y + dy * along + (dx / span) * off,
            links: [previous],
            stats: line.stats ?? [],
          },
          'road'
        );
        walk.push(id);
        previous = id;
      }
      // The far end joins back, which is what makes the map a web: every road
      // is walkable from either of the two things it joins.
      const landing = nearest(wheel.id, from);
      byId.get(landing)!.links.push(walk[walk.length - 1]);
    }
  }

  // --- the majors ----------------------------------------------------------
  //
  // Joined to the ring node FURTHEST from the roads that arrive, so no wheel
  // hands over its major on the way past.
  for (const wheel of spec.wheels) {
    const ring = rings.get(wheel.id)!;
    const doors = ring.filter((id) => byId.get(id)!.links.some((l) => l.includes('_road_')));
    const far = ring.reduce((best, id) => {
      const cost = (at: string) =>
        Math.min(...doors.map((d) => Math.abs(ring.indexOf(at) - ring.indexOf(d))));
      return cost(id) > cost(best) ? id : best;
    }, ring[0]);
    byId.get(wheel.major.id)!.links.push(far);
  }

  return { spec, nodes, regionOf };
}
