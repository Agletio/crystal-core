/**
 * Geometry for a skill web. Knows nothing about any modifier.
 *
 * A tree is three ways in and a ring of six, each holding a run of points; a
 * notable anybody would want and a branch off every ring node; and each branch
 * a run of CHAINS — a minor holding a range and the notable it opens — so
 * there is no cutting across to a notable.
 *
 * Coordinates come out of a stable hash rather than a random number, so a tree
 * is the same web on every machine and in every session — allocations in a save
 * point at ids, and ids are positional.
 */
import { CENTRE } from './node';
import type { SkillNodeDef } from './node';
import type { BuiltTree, TreeSpec } from './spec';

/** Three ways in, then a ring of six — one under each branch — and each holds
 *  a run of points rather than standing in a crowd of ones. */
const TRUNK = [
  { count: 3, r: 1.9, points: 3 },
  { count: 6, r: 3.3, points: 2 },
];
/** Trunk slots, in twelfths of the ring: a branch at every even one, a trunk
 *  notable at the odd one after it, both hung off the ring node before. */
const ANCHORS = [0, 2, 4, 6, 8, 10];
const SPUR_SLOTS = [1, 3, 5, 7, 9, 11];
const SPUR_R = [4.7];

const ENABLER_R = 5.0;
/** How far out each step along a twig goes: a minor that holds a run of points
 *  and the notable past it, so two steps is a twig. */
const TWIG_STEP = 1.9;
/** How wide a branch spreads, as a fraction of the circle. */
const BRANCH_ARC = 0.125;

const TAU = Math.PI * 2;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

/** THE SILHOUETTE, per tree: where the six branches hang, how the ways in
 *  turn, how a twig twists as it goes, and how the whole is stretched. The
 *  content is the same shape everywhere; only where it sits differs. */
interface Shape {
  anchors: number[]; // where each of the six branches hangs, in radians
  twist: number; // how far a twig turns off its branch as it goes out; `twists` is the same per branch
  twists?: number[];
  scale: [number, number];
  reach?: number[]; // how far each branch stands off the ring, as a share of the usual
  arc?: number; // how wide a branch's twigs fan, as a share of the usual
}
const even = (turn = 0, over = 1): number[] =>
  Array.from({ length: 6 }, (_, i) => -Math.PI / 2 + turn + (i / 6 - (1 - over) / 2) * TAU * over);
const SHAPES: Record<string, Shape> = {
  ring: { anchors: even(), twist: 0, scale: [1, 1] },
  cross: { anchors: [-Math.PI / 2 - 0.38, -Math.PI / 2 + 0.38, 0, Math.PI / 2 - 0.38, Math.PI / 2 + 0.38, Math.PI], twist: 0, scale: [1.2, 1], reach: [1.1, 1.1, 1.45, 1.1, 1.1, 1.45], arc: 0.5 }, // A blade: two arms straight up and down, four short at the sides.
  wide: { anchors: even(TAU / 12), twist: 0, scale: [1.65, 0.7], arc: 1.7 }, // A wave: everything low and wide, the twigs fanned flat.
  // A tall arrow: three branches up in a point, three down as fletching.
  arrow: { anchors: [-Math.PI / 2 - 0.55, -Math.PI / 2, -Math.PI / 2 + 0.55, Math.PI / 2 - 0.9, Math.PI / 2, Math.PI / 2 + 0.9], twist: 0, scale: [1.3, 1.2], reach: [0.95, 1.5, 0.95, 0.9, 1.05, 0.9], arc: 0.4 },
  spiral: { anchors: even(), twist: 0.55, scale: [1.05, 1.05], arc: 0.6 }, // A spiral: every twig turning the same way, hard.
  bolt: { anchors: even(TAU / 12), twists: [0.32, -0.32, 0.32, -0.32, 0.32, -0.32], twist: 0, scale: [1.45, 0.85], arc: 0.6 }, // A bolt: branches thrown alternately up and down along a wide zigzag.
  fan: { anchors: even(0, 0.74).map((a) => a - TAU * 0.13), twist: 0, scale: [1.2, 0.95] }, // A fan: everything in the upper three quarters, nothing underneath.
  bloom: { anchors: even(TAU / 12), twist: 0, scale: [1.1, 1.05], reach: [0.75, 0.75, 0.75, 0.75, 0.75, 0.75], arc: 2.1 }, // A bloom: short round petals, each twig fanned wide.
  wheel: { anchors: even(), twist: 0.8, scale: [1.05, 1.05], arc: 0.5 }, // A wheel: every twig running round rather than out.
  scatter: { anchors: even(0.2), twist: 0, twists: [0.2, -0.15, 0.3, -0.25, 0.1, -0.3], scale: [1.1, 1], reach: [1.35, 0.7, 1.2, 0.8, 1.3, 0.75], arc: 0.9 }, // A scatter: no two branches the same length.
  arch: { anchors: even(), twist: 0, scale: [1.35, 0.95], reach: [1.45, 1.2, 0.85, 0.8, 0.85, 1.2], arc: 0.6 }, // An arch: every branch over the top, the hub at the foot.
  vortex: { anchors: even(TAU / 12), twist: -0.9, scale: [1.25, 0.8], reach: [0.85, 0.85, 0.85, 0.85, 0.85, 0.85], arc: 0.45 }, // A vortex: a wheel turning the other way, pulled tight.
};
/** Each tree its own silhouette; a skill not named here is a ring. */
const SHAPE_OF: Record<string, string> = {
  strike: 'cross', shockwave: 'wide', fireball: 'spiral', rimespike: 'fan',
  blight: 'bloom', arc_lightning: 'bolt', lightning_arrow: 'arrow', ambush: 'wheel',
  blink: 'scatter', leap: 'arch', gale: 'vortex',
};

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

/**
 * How far a node's ART reaches from its own centre, in web units.
 *
 * NOT its radius: a frame is drawn 2.3 radii ACROSS, and a radius is
 * `NODE_R`/46 units, so a notable's picture reaches 0.63 where the number the
 * geometry used to keep apart was 0.92 for any pair. Two notables at 0.92
 * overlap by a third of a node, which is what put touching pictures on the
 * twigs. Two MINORS still want 0.92, so nothing that reads well moves.
 */
const ART_R = { minor: 0.38, notable: 0.63 };
/** Ground between two pictures, and between a picture and a line under it. */
const GAP = 0.16;
const LINE_GAP = 0.08;

const artR = (n: SkillNodeDef): number => (n.keystone ? ART_R.notable * 1.5 : ART_R[n.kind]); // a keystone is half again a notable
const apartFor = (a: SkillNodeDef, b: SkillNodeDef): number => artR(a) + artR(b) + GAP;

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

  for (let pass = 0; pass < 120; pass++) {
    let moved = false;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy);
        const want = apartFor(a, b);
        if (d >= want) continue;
        moved = true;
        // Straight away from each other, half the shortfall each, and never
        // toward the middle — the rings have to stay rings.
        const push = (want - Math.max(d, 1e-3)) / 2;
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
        const clear = artR(n) + LINE_GAP;
        if (d >= clear) continue;
        moved = true;
        const push = clear - Math.max(d, 1e-3);
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

  const nodes: SkillNodeDef[] = [];
  const links = new Map<string, string[]>();
  const join = (a: string, b: string) => {
    if (!links.has(a)) links.set(a, []);
    links.get(a)!.push(b);
  };

  // --- the trunk ------------------------------------------------------------
  const OUTER = TRUNK[1].count;
  for (let i = 0; i < OUTER; i++) join(trunkAt(2, i), trunkAt(2, (i + 1) % OUTER));
  for (let i = 0; i < TRUNK[0].count; i++) {
    join(trunkAt(1, i), CENTRE);
    join(trunkAt(2, (i * OUTER) / TRUNK[0].count), trunkAt(1, i));
  }

  const shape = SHAPES[SHAPE_OF[spec.skillId] ?? 'ring'];
  /** Slot angles in twelfths: an anchor's own at an even slot, midway to the next at an odd one. */
  const slotAngle = (slot: number): number => {
    const b = Math.floor(slot / 2);
    const a = shape.anchors[b % 6];
    if (slot % 2 === 0) return a;
    let next = shape.anchors[(b + 1) % 6];
    if (next < a) next += TAU;
    return (a + next) / 2;
  };
  for (let ring = 1; ring <= TRUNK.length; ring++) {
    const { count, r, points } = TRUNK[ring - 1];
    for (let i = 0; i < count; i++) {
      const angle = slotAngle((i * 2 * OUTER) / count) + (jitter(ring, i, 1) - 0.5) * 0.08;
      const reach = r + (jitter(ring, i, 2) - 0.5) * 0.3;
      const common = spec.common[(ring * 3 + i) % spec.common.length];
      // Named so a gate can name it: a way in by number, a ring node for the
      // branch it stands under.
      const name = ring === 1 ? `${spec.minorName} ${ROMAN[i]}` : `${spec.branches[i].theme} Way`;
      nodes.push({
        id: trunkAt(ring, i),
        name,
        description: common.text,
        kind: 'minor',
        points,
        x: Math.cos(angle) * reach,
        y: Math.sin(angle) * reach,
        links: links.get(trunkAt(ring, i)) ?? [],
        stats: common.stats ?? [],
        ...(common.grants ? { grants: common.grants } : {}), // a ring node's switch is its own, like an enabler's
      });
    }
  }

  // Six trunk notables, each off the ring node before it and open once that
  // node is full: worth having whatever you go on to build.
  SPUR_SLOTS.forEach((slot, spur) => {
    const notable = spec.trunkNotables[spur];
    const on = trunkAt(2, Math.floor(slot / 2));
    const angle = slotAngle(slot) + (jitter(spur, 0, 5) - 0.5) * 0.12;
    const reach = SPUR_R[0] + (jitter(spur, 0, 6) - 0.5) * 0.2;
    join(notable.id, on);
    nodes.push({
      id: notable.id,
      name: notable.name,
      description: notable.description,
      kind: 'notable',
      gate: { from: on, points: TRUNK[1].points },
      x: Math.cos(angle) * reach,
      y: Math.sin(angle) * reach,
      links: links.get(notable.id) ?? [],
      ...(notable.stats ? { stats: notable.stats } : {}),
      ...(notable.grants ? { grants: notable.grants } : {}),
      ...(notable.choices ? { choices: notable.choices } : {}),
      ...(notable.under ? { under: notable.under } : {}),
    });
  });

  // --- the branches ---------------------------------------------------------
  spec.branches.forEach((branch, b) => {
    const base = shape.anchors[b];
    const far = shape.reach?.[b] ?? 1;
    const twist = shape.twists?.[b] ?? shape.twist;
    const fanned = BRANCH_ARC * (shape.arc ?? 1);
    const on = trunkAt(2, ANCHORS[b] / 2);
    join(branch.enabler.id, on);
    nodes.push({
      id: branch.enabler.id,
      name: branch.enabler.name,
      description: branch.enabler.description,
      kind: 'notable',
      gate: { from: on, points: TRUNK[1].points },
      x: Math.cos(base) * ENABLER_R * far,
      y: Math.sin(base) * ENABLER_R * far,
      links: links.get(branch.enabler.id) ?? [],
      ...(branch.enabler.stats ? { stats: branch.enabler.stats } : {}), // dropped here, six enablers printed figures the sim never applied
      ...(branch.enabler.grants ? { grants: branch.enabler.grants } : {}),
      ...(branch.enabler.under ? { under: branch.enabler.under } : {}),
    });

    // Where each twig's minor ends up, so a fork can start from it. The
    // straight twigs are placed FIRST, so two forks may hang off one minor on
    // either side of it whichever order they are written in.
    const placed: Array<{ id: string; depth: number; angle: number }> = [];
    const order = branch.twigs.map((twig, t) => t).sort((a, b) => +!!branch.twigs[a].forkFrom - +!!branch.twigs[b].forkFrom);

    for (const t of order) {
      const twig = branch.twigs[t];
      // Twigs are aimed across the wedge in the order they are written, so a
      // fork from a twig further away than its neighbour has to sweep over
      // everything between the two to get where it is pointing.
      if (twig.forkFrom && Math.abs(twig.forkFrom.twig - t) !== 1) {
        throw new Error(
          `${spec.skillId}/${branch.id}: twig ${t} forks from ${twig.forkFrom.twig}, not its neighbour`
        );
      }
      // A fork grows off the other twig's MINOR, and opens once that minor
      // holds `at` points — never off a notable, which is a dead end. The
      // notable itself opens once its own minor is FULL, so what it costs is
      // the run of points in front of it, exactly as a chain of minors was.
      const parent = twig.forkFrom ? placed[twig.forkFrom.twig] : { id: branch.enabler.id, depth: 0, angle: base };
      const gate = twig.forkFrom
        ? { from: parent.id, points: Math.min(twig.forkFrom.at, branch.twigs[twig.forkFrom.twig].minors) }
        : null;
      // Each twig aims somewhere of its own inside the wedge, and drifts there
      // as it goes out, so a branch opens like a hand rather than a fan.
      const aim =
        base + (((t + 0.5) / branch.twigs.length - 0.5) * fanned + 0.012 * t) * TAU + twist;

      const minor = branch.minors[t % branch.minors.length];
      const minorId = branchId(branch.id, t, 0);
      const steps = [
        { id: minorId, last: false },
        { id: twig.notable.id, last: true },
      ];
      steps.forEach(({ id, last }, step) => {
        const depth = parent.depth + step + 1;
        const along = (step + 1) / steps.length;
        const angle =
          parent.angle +
          (aim - parent.angle) * along +
          (jitter(b, t * 9 + step, 3) - 0.5) * 0.045;
        const reach = (ENABLER_R + depth * TWIG_STEP) * far + (jitter(b, t * 9 + step, 4) - 0.5) * 0.35;

        join(id, step === 0 ? parent.id : minorId);

        nodes.push({
          id,
          name: last ? twig.notable.name : minor.name ?? `${branch.theme} ${ROMAN[t]}`,
          description: last ? twig.notable.description : minor.text,
          kind: last ? 'notable' : 'minor',
          x: Math.cos(angle) * reach,
          y: Math.sin(angle) * reach,
          links: links.get(id) ?? [],
          ...(last && twig.notable.keystone ? { keystone: true as const } : {}),
          ...(last && twig.notable.becomes ? { becomes: twig.notable.becomes } : {}),
          ...(last && twig.notable.under ? { under: twig.notable.under } : {}),
          ...(!last && minor.under ? { under: minor.under } : {}),
          ...(last && twig.notable.converts ? { converts: twig.notable.converts } : {}),
          ...(!last ? { points: twig.minors } : {}),
          ...(!last && gate ? { gate } : {}),
          ...(last && twig.minors > 1 ? { gate: { from: minorId, points: twig.minors } } : {}),
          ...(last
            ? {
                ...(twig.notable.stats ? { stats: twig.notable.stats } : {}),
                ...(twig.notable.grants ? { grants: twig.notable.grants } : {}),
                // A twig may ask a QUESTION too. Dropped here, a choice node on
                // a branch is a notable that silently grants nothing at all.
                ...(twig.notable.choices ? { choices: twig.notable.choices } : {}),
              }
            : {
                ...(minor.stats ? { stats: minor.stats } : {}),
                ...(minor.grants ? { grants: minor.grants } : {}),
              }),
        });
        if (step === 0) placed[t] = { id, depth, angle };
      });
    }
  });

  // Links are collected while the shape is worked out, so every node picks up
  // whatever named it after it was pushed.
  const built = spread(
    nodes.map((n) => ({ ...n, x: n.x * shape.scale[0], y: n.y * shape.scale[1], links: links.get(n.id) ?? [] })),
    links
  );

  return {
    spec,
    nodes: built,
    branchOf: Object.fromEntries(
      spec.branches.flatMap((branch) => [
        [branch.enabler.id, branch.id] as [string, string],
        ...branch.twigs.flatMap((twig, t) => [
          [twig.notable.id, branch.id] as [string, string],
          [branchId(branch.id, t, 0), branch.id] as [string, string],
        ]),
      ])
    ),
    enablers: Object.fromEntries(spec.branches.map((b) => [b.id, b.enabler.id])),
  };
}
