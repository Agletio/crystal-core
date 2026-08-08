/**
 * Geometry for a skill web. Knows nothing about any modifier.
 *
 * A tree is two rings of common minors, six short spurs off the outer ring
 * ending in notables anybody would want, and six branches hanging off the
 * remaining outer slots. Every branch is a run of CHAINS: each node hangs off
 * exactly the one before it, so there is no cutting across to a notable.
 *
 * Coordinates come out of a stable hash rather than a random number, so a tree
 * is the same web on every machine and in every session — allocations in a save
 * point at ids, and ids are positional.
 */
import { CENTRE } from './node';
import type { SkillNodeDef } from './node';
import type { BuiltTree, TreeSpec } from './spec';

const TRUNK = [
  { count: 6, r: 1.35 },
  { count: 12, r: 2.7 },
];
/** Ways off the centre. Fewer than the ring holds, so ring one is a walk too. */
const TRUNK_WAYS_IN = 3;
/** Trunk slots a branch hangs off, and the ones a trunk spur grows from. */
const ANCHORS = [0, 2, 4, 6, 8, 10];
const SPUR_SLOTS = [1, 3, 5, 7, 9, 11];
const SPUR_R = [3.5, 4.4];

const ENABLER_R = 3.8;
/** How far out each step along a twig goes. */
const TWIG_STEP = 1.05;
/** How wide a branch spreads, as a fraction of the circle. */
const BRANCH_ARC = 0.125;

const TAU = Math.PI * 2;

/** How many branches and trunk notables a spec must supply. */
export const BRANCH_COUNT = ANCHORS.length;
export const SPUR_COUNT = SPUR_SLOTS.length;
/** Steps along a spur, the last of which is the notable. */
export const SPUR_STEPS = SPUR_R.length;
/** Nodes in the rings themselves, before any spur or branch. */
export const TRUNK_NODES = TRUNK.reduce((n, ring) => n + ring.count, 0);

/** Stable 0..1 wobble. Perfect rows read as a diagram rather than a web. */
const jitter = (a: number, b: number, salt: number): number => {
  const h = Math.sin(a * 127.1 + b * 311.7 + salt * 74.7) * 43758.5453;
  return h - Math.floor(h);
};

/** A node must sit this far from any other, and this far off any line it does
 * not end. The second is the larger: a line under a stud reads as a link to it. */
const APART = 0.92;
const CLEAR = 0.55;

/**
 * Push apart anything that ended up on top of something else.
 *
 * Twigs aim where they like and two of them can converge; the wobble that stops
 * the web looking like a diagram can close the last of the gap. A few passes of
 * shoving costs nothing and means no node is drawn under another one, and no
 * line is drawn under a node — which on screen is a link to somewhere it does
 * not go.
 */
function spread(nodes: SkillNodeDef[], links: Map<string, string[]>): SkillNodeDef[] {
  const at = new Map(nodes.map((n) => [n.id, n]));
  const edges: Array<[SkillNodeDef, SkillNodeDef]> = [];
  for (const [from, list] of links) {
    for (const to of list) {
      const a = at.get(from);
      const b = at.get(to);
      if (a && b) edges.push([a, b]);
    }
  }

  for (let pass = 0; pass < 60; pass++) {
    let moved = false;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        if (d >= APART) continue;
        moved = true;
        // Straight away from each other, half the shortfall each, and never
        // toward the middle — the rings have to stay rings.
        const push = (APART - Math.max(d, 1e-3)) / 2;
        const ux = d < 1e-3 ? 1 : dx / d;
        const uy = d < 1e-3 ? 0 : dy / d;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
      }
    }

    // Only the node gives way. Moving the line's ends instead would drag the
    // rings out of round to fix something growing off them.
    for (const n of nodes) {
      for (const [a, b] of edges) {
        if (a === n || b === n) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const span = dx * dx + dy * dy;
        if (span < 1e-9) continue;
        const t = Math.max(0, Math.min(1, ((n.x - a.x) * dx + (n.y - a.y) * dy) / span));
        const footX = a.x + t * dx;
        const footY = a.y + t * dy;
        const d = Math.hypot(n.x - footX, n.y - footY);
        if (d >= CLEAR) continue;
        moved = true;
        const push = CLEAR - Math.max(d, 1e-3);
        const len = Math.sqrt(span);
        const ux = d < 1e-3 ? -dy / len : (n.x - footX) / d;
        const uy = d < 1e-3 ? dx / len : (n.y - footY) / d;
        n.x += ux * push;
        n.y += uy * push;
      }
    }

    if (!moved) break;
  }
  return nodes;
}

export function buildTree(spec: TreeSpec): BuiltTree {
  if (spec.branches.length !== BRANCH_COUNT) {
    throw new Error(`${spec.skillId}: ${spec.branches.length} branches, need ${BRANCH_COUNT}`);
  }
  if (spec.trunkNotables.length !== SPUR_COUNT) {
    throw new Error(
      `${spec.skillId}: ${spec.trunkNotables.length} trunk notables, need ${SPUR_COUNT}`
    );
  }

  const trunkAt = (ring: number, i: number) => `${spec.prefix}_t${ring}s${i}`;
  const branchId = (b: string, row: number, i: number) => `${spec.prefix}_${b}_${row}_${i}`;
  const spurId = (spur: number, step: number) =>
    step === SPUR_R.length - 1
      ? spec.trunkNotables[spur].id
      : `${spec.prefix}_spur${spur}_${step}`;

  const nodes: SkillNodeDef[] = [];
  const links = new Map<string, string[]>();
  const join = (a: string, b: string) => {
    if (!links.has(a)) links.set(a, []);
    links.get(a)!.push(b);
  };

  // --- the trunk ------------------------------------------------------------
  for (let ring = 1; ring <= TRUNK.length; ring++) {
    const { count } = TRUNK[ring - 1];
    for (let i = 0; i < count; i++) join(trunkAt(ring, i), trunkAt(ring, (i + 1) % count));
  }
  for (let w = 0; w < TRUNK_WAYS_IN; w++) {
    join(trunkAt(1, Math.round((w / TRUNK_WAYS_IN) * TRUNK[0].count)), CENTRE);
  }
  // Turned half a gap off the ways in, so leaving ring one is a walk as well.
  for (let s = 0; s < TRUNK[0].count; s += 2) {
    const outer = Math.round(((s + 1) / TRUNK[0].count) * TRUNK[1].count);
    join(trunkAt(2, outer % TRUNK[1].count), trunkAt(1, s));
  }

  for (let ring = 1; ring <= TRUNK.length; ring++) {
    const { count, r } = TRUNK[ring - 1];
    for (let i = 0; i < count; i++) {
      const angle = ((i + (jitter(ring, i, 1) - 0.5) * 0.3) / count) * TAU - Math.PI / 2;
      const reach = r + (jitter(ring, i, 2) - 0.5) * 0.3;
      const common = spec.common[(ring * 3 + i) % spec.common.length];
      nodes.push({
        id: trunkAt(ring, i),
        name: spec.minorName,
        description: common.text,
        kind: 'minor',
        x: Math.cos(angle) * reach,
        y: Math.sin(angle) * reach,
        links: links.get(trunkAt(ring, i)) ?? [],
        stats: common.stats ?? [],
      });
    }
  }

  // Six short spurs off the trunk, each ending in a notable worth having
  // whatever you go on to build.
  SPUR_SLOTS.forEach((slot, spur) => {
    const base = (slot / TRUNK[1].count) * TAU - Math.PI / 2;
    for (let step = 0; step < SPUR_R.length; step++) {
      const last = step === SPUR_R.length - 1;
      const id = spurId(spur, step);
      const notable = last ? spec.trunkNotables[spur] : null;
      const common = spec.common[(spur * 2 + step) % spec.common.length];
      const angle = base + (jitter(spur, step, 5) - 0.5) * 0.12;
      const reach = SPUR_R[step] + (jitter(spur, step, 6) - 0.5) * 0.2;

      join(id, step === 0 ? trunkAt(2, slot) : spurId(spur, step - 1));
      nodes.push({
        id,
        name: notable?.name ?? spec.minorName,
        description: notable?.description ?? common.text,
        kind: notable ? 'notable' : 'minor',
        x: Math.cos(angle) * reach,
        y: Math.sin(angle) * reach,
        links: links.get(id) ?? [],
        ...(notable
          ? {
              ...(notable.stats ? { stats: notable.stats } : {}),
              ...(notable.grants ? { grants: notable.grants } : {}),
              ...(notable.choices ? { choices: notable.choices } : {}),
            }
          : { stats: common.stats ?? [] }),
      });
    }
  });

  // --- the branches ---------------------------------------------------------
  spec.branches.forEach((branch, b) => {
    const base = (ANCHORS[b] / TRUNK[1].count) * TAU - Math.PI / 2;
    join(branch.enabler.id, trunkAt(2, ANCHORS[b]));
    nodes.push({
      id: branch.enabler.id,
      name: branch.enabler.name,
      description: branch.enabler.description,
      kind: 'notable',
      x: Math.cos(base) * ENABLER_R,
      y: Math.sin(base) * ENABLER_R,
      links: links.get(branch.enabler.id) ?? [],
      ...(branch.enabler.grants ? { grants: branch.enabler.grants } : {}),
    });

    // Where each node of each twig ends up, so a fork can start from one.
    const placed: Array<Array<{ id: string; depth: number; angle: number }>> = [];
    let minorAt = 0;

    branch.twigs.forEach((twig, t) => {
      // Twigs are aimed across the wedge in the order they are written, so a
      // fork from a twig further away than its neighbour has to sweep over
      // everything between the two to get where it is pointing.
      if (twig.forkFrom && Math.abs(twig.forkFrom.twig - t) !== 1) {
        throw new Error(
          `${spec.skillId}/${branch.id}: twig ${t} forks from ${twig.forkFrom.twig}, not its neighbour`
        );
      }
      // Never off a twig's last node: that one is a notable, and a notable
      // with something growing out of it is no longer a dead end.
      const parent = twig.forkFrom
        ? placed[twig.forkFrom.twig][
            Math.min(twig.forkFrom.at, branch.twigs[twig.forkFrom.twig].minors - 1)
          ]
        : { id: branch.enabler.id, depth: 0, angle: base };
      // Each twig aims somewhere of its own inside the wedge, and drifts there
      // as it goes out, so a branch opens like a hand rather than a fan.
      const aim =
        base + (((t + 0.5) / branch.twigs.length - 0.5) * BRANCH_ARC + 0.012 * t) * TAU;

      const chain: Array<{ id: string; depth: number; angle: number }> = [];
      const length = twig.minors + 1;
      for (let step = 0; step < length; step++) {
        const last = step === length - 1;
        const id = last ? twig.notable.id : branchId(branch.id, t, step);
        const depth = parent.depth + step + 1;
        const along = (step + 1) / length;
        const angle =
          parent.angle +
          (aim - parent.angle) * along +
          (jitter(b, t * 9 + step, 3) - 0.5) * 0.045;
        const reach = ENABLER_R + depth * TWIG_STEP + (jitter(b, t * 9 + step, 4) - 0.5) * 0.35;

        join(id, step === 0 ? parent.id : chain[step - 1].id);
        const minor = branch.minors[minorAt++ % branch.minors.length];

        nodes.push({
          id,
          name: last ? twig.notable.name : branch.theme,
          description: last ? twig.notable.description : minor.text,
          kind: last ? 'notable' : 'minor',
          x: Math.cos(angle) * reach,
          y: Math.sin(angle) * reach,
          links: links.get(id) ?? [],
          ...(last
            ? {
                ...(twig.notable.stats ? { stats: twig.notable.stats } : {}),
                ...(twig.notable.grants ? { grants: twig.notable.grants } : {}),
              }
            : {
                ...(minor.stats ? { stats: minor.stats } : {}),
                ...(minor.grants ? { grants: minor.grants } : {}),
              }),
        });
        chain.push({ id, depth, angle });
      }
      placed.push(chain);
    });
  });

  // Links are collected while the shape is worked out, so every node picks up
  // whatever named it after it was pushed.
  const built = spread(nodes.map((n) => ({ ...n, links: links.get(n.id) ?? [] })), links);

  return {
    spec,
    nodes: built,
    branchOf: Object.fromEntries(
      spec.branches.flatMap((branch) => [
        [branch.enabler.id, branch.id] as [string, string],
        ...branch.twigs.flatMap((twig, t) => [
          [twig.notable.id, branch.id] as [string, string],
          ...Array.from(
            { length: twig.minors },
            (_, step) => [branchId(branch.id, t, step), branch.id] as [string, string]
          ),
        ]),
      ])
    ),
    enablers: Object.fromEntries(spec.branches.map((b) => [b.id, b.enabler.id])),
  };
}
