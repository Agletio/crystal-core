/**
 * A ZONE'S NETWORK, DERIVED FROM ITS OWN PICTURE, as a `links:` block.
 *
 *   npx tsx tools/zone-net.mts <zone index> [reach] [tol]
 *
 * The NODES are authored; every link is WALKED with `cavepath`, so a line runs
 * along a level and climbs a ladder rather than cutting across the rock. Two
 * are joined when that walk is short (`reach`, percent of the picture) AND
 * NOTHING ELSE STANDS ON THE ROUTE — a link through a third node is that
 * node's two links said once. Depth is never asked about: *"it's fine to go up
 * a level… it doesn't have to always go up but it just can if it needs to."*
 */
import { LADDER } from '../src/data';
import { courseOf, depthOfId, mainId, sideRooms } from '../src/ladder';
import { readCave, shippedScene, thin, walkFrom, walked } from './cavepath.mts';

const z = Number(process.argv[2] ?? 0);
const REACH = Number(process.argv[3] ?? 26); // percent of the picture a link may walk
// A BRIDGE MAY BE LONGER THAN A LINK. An ordinary joint is short; one that
// exists because a quarter of the map would otherwise hang off nothing is
// whatever the cave costs.
const BRIDGE = REACH * 1.8;
const TOL = Number(process.argv[4] ?? 2.2); // a LINE, not a staircase of steps
const ON_ROUTE = 2.6; // percent: how near a route passes before it IS that node

const def = LADDER.zones[z];
const png = def.art ? shippedScene(def.art) : null;
if (!def || !png) throw new Error(`zone ${z} has no shipped picture`);
const cave = readCave(png);
const line = courseOf(def.path);

const nodes = [
  ...Array.from({ length: def.rungs }, (_, i) => ({
    id: mainId(i + 1),
    ...line.at(def.rungs === 1 ? 0 : i / (def.rungs - 1)),
  })),
  ...sideRooms(z).map((room) => ({ id: room.id, x: room.x, y: room.y })),
];
const spotOf = new Map(nodes.map((n) => [n.id, n]));

interface Cand { from: string; to: string; route: [number, number][]; far: number }
const found: Cand[] = [];
for (let a = 0; a < nodes.length; a++) {
  const out = walkFrom(cave, [nodes[a].x, nodes[a].y]);
  for (let b = a + 1; b < nodes.length; b++) {
    const da = depthOfId(nodes[a].id), db = depthOfId(nodes[b].id);
    if (da !== null && db !== null && Math.abs(da - db) === 1) continue;
    const { route } = out.routeTo([nodes[b].x, nodes[b].y]);
    if (route.length === 0) continue;
    const far = walked(route);
    if (far > BRIDGE) continue;
    found.push({ from: nodes[a].id, to: nodes[b].id, route, far });
  }
}

// A node counts as being ON a route only when the route reaches it PART WAY
// ALONG. Two rooms drawn a couple of percent apart otherwise make every route
// into their corner "pass through" one of them, and the pair that holds a
// quarter of the map onto the line is thrown away with the rest.
const VIA = 0.25;
const through = (c: Cand): string | null => {
  for (const n of nodes) {
    if (n.id === c.from || n.id === c.to) continue;
    const hit = c.route.findIndex(([x, y]) => Math.hypot(x - n.x, y - n.y) <= ON_ROUTE);
    if (hit < 0) continue;
    const along = hit / (c.route.length - 1 || 1);
    if (along > VIA && along < 1 - VIA) return n.id;
  }
  return null;
};

const near2 = found.filter((c) => !through(c)).sort((a, b) => a.far - b.far);
let kept = near2.filter((c) => c.far <= REACH);

const key = (a: string, b: string) => [a, b].sort().join('|');
const near = (c: Cand) => c.far;

// A SIDE ROOM TOUCHES ONE DEPTH, and a depth touches as many rooms as it
// likes. *"So make it where a single branch can only connect to 1 main line
// point. But a main line point can connect to multiple branch points."* Two
// depths hanging off one room is the same room said twice on the line.
const isMain = (id: string) => depthOfId(id) !== null;
const onLine = new Map<string, Cand>();
for (const c of kept) {
  const room = isMain(c.from) ? (isMain(c.to) ? null : c.to) : (isMain(c.to) ? c.from : null);
  if (!room) continue;
  const had = onLine.get(room);
  if (!had || near(c) < near(had)) onLine.set(room, c);
}
kept = kept.filter((c) => {
  const room = isMain(c.from) ? (isMain(c.to) ? null : c.to) : (isMain(c.to) ? c.from : null);
  return !room || onLine.get(room) === c;
});

const reaches = (list: Cand[]): Set<string> => {
  const touch = new Map<string, string[]>();
  for (const c of list) {
    touch.set(c.from, [...(touch.get(c.from) ?? []), c.to]);
    touch.set(c.to, [...(touch.get(c.to) ?? []), c.from]);
  }
  for (let d = 1; d < def.rungs; d++) {
    touch.set(mainId(d), [...(touch.get(mainId(d)) ?? []), mainId(d + 1)]);
    touch.set(mainId(d + 1), [...(touch.get(mainId(d + 1)) ?? []), mainId(d)]);
  }
  const seen = new Set([mainId(1)]);
  for (let pass = 0; pass < nodes.length; pass++) {
    let grew = false;
    for (const id of [...seen]) for (const n of touch.get(id) ?? []) {
      if (!seen.has(n)) { seen.add(n); grew = true; }
    }
    if (!grew) break;
  }
  return seen;
};
// NO TRIANGLE, AND SO NO FAN. Three rooms all joined to each other draw one
// line over another — *"the cross level, the long level and the sump form this
// weird overlapping triangle… cross level connects to the other two and long
// and sump are not connected"* — and a node fanning up to two that are
// themselves a step apart is the same picture. Drop the LONGEST of any three,
// again and again, and both faults go with it.
const spared = new Set<Cand>();
for (;;) {
  const has = new Map(kept.map((c) => [key(c.from, c.to), c]));
  const touch = new Map<string, string[]>();
  for (const c of kept) {
    touch.set(c.from, [...(touch.get(c.from) ?? []), c.to]);
    touch.set(c.to, [...(touch.get(c.to) ?? []), c.from]);
  }
  let worst: Cand | null = null;
  for (const c of kept) {
    for (const third of touch.get(c.from) ?? []) {
      if (third === c.to) continue;
      const other = has.get(key(c.to, third));
      if (!other) continue;
      const side = has.get(key(c.from, third))!;
      const longest = [c, other, side]
        .filter((e) => !spared.has(e)).sort((a, b) => near(b) - near(a))[0];
      if (longest && (!worst || near(longest) > near(worst))) worst = longest;
    }
  }
  if (!worst) break;
  // AND NEVER AT THE COST OF REACHING IT. The longest side of a triangle can
  // be the only thing holding a quarter of the map onto the line — measured,
  // cutting `plat`-`slope` took eight rooms off it — so a cut that strands
  // anything is refused and the edge is kept as it stands.
  const without = kept.filter((c) => c !== worst);
  if (reaches(without).size < reaches(kept).size) { spared.add(worst); continue; }
  kept = without;
}

// NOTHING IS STRANDED. Cutting triangles and holding a room to one depth can
// take a whole quarter of the map off the line, so the shortest candidate that
// joins an orphan back is put BACK — a room-to-room one first, since a second
// depth on a room is the rule this pass must not break.
const hasDepth = new Set(
  kept.filter((c) => isMain(c.from) !== isMain(c.to))
    .map((c) => (isMain(c.from) ? c.to : c.from))
);
for (let mend = 0; mend < nodes.length; mend++) {
  const seen = reaches(kept);
  if (nodes.every((n) => seen.has(n.id))) break;
  const bridges = near2
    .filter((c) => !kept.includes(c) && seen.has(c.from) !== seen.has(c.to))
    .filter((c) => {
      const room = isMain(c.from) ? (isMain(c.to) ? null : c.to) : (isMain(c.to) ? c.from : null);
      return !room || !hasDepth.has(room);
    })
    .sort((a, b) => (isMain(a.from) || isMain(a.to) ? 1 : 0) - (isMain(b.from) || isMain(b.to) ? 1 : 0)
      || near(a) - near(b));
  if (bridges.length === 0) break;
  const put = bridges[0];
  const room = isMain(put.from) ? (isMain(put.to) ? null : put.to) : (isMain(put.to) ? put.from : null);
  if (room) hasDepth.add(room);
  kept = [...kept, put];
}
const home = reaches(kept);

// A NODE STANDS WHERE ITS LINES MEET. Two routes into one room that share
// their last stretch draw one line over another all the way in — *"avoid where
// two lines pathing to the same point have to travel down an area overlapping
// to get to the point. Rather just move the point to where they first meet."*
// So the room is walked back up its own common tail to the fork.
const SHARED = 1.4; // percent of the picture worth moving for
const moved = new Map<string, { x: number; y: number }>();
for (const room of sideRooms(z)) {
  const ends = kept
    .filter((c) => c.from === room.id || c.to === room.id)
    .map((c) => (c.to === room.id ? c.route : [...c.route].reverse()));
  if (ends.length < 2) continue;
  let back = 0;
  for (;;) {
    const step = ends.map((r) => r[r.length - 1 - back]);
    if (step.some((p) => !p)) break;
    if (step.some((p) => Math.hypot(p[0] - step[0][0], p[1] - step[0][1]) > 0.6)) break;
    back++;
  }
  const fork = ends[0][ends[0].length - back];
  if (!fork || walked(ends[0].slice(ends[0].length - back)) < SHARED) continue;
  moved.set(room.id, { x: Math.round(fork[0]), y: Math.round(fork[1]) });
}
if (moved.size) {
  console.log(`      sides: [`);
  for (const room of sideRooms(z)) {
    const put = moved.get(room.id) ?? { x: room.x, y: room.y };
    console.log(`        { id: '${room.id}', name: '${room.name}', ` +
      `bonus: '${room.bonus}', x: ${put.x}, y: ${put.y} },`);
  }
  console.log(`      ],`);
  console.error(`MOVED to the fork: ${[...moved.keys()].join(', ')} — re-run to settle`);
}

console.log(`      links: [`);
for (const c of kept) {
  const pts = thin(c.route, TOL).map(([x, y]) => [Math.round(x), Math.round(y)]);
  console.log(`        { from: '${c.from}', to: '${c.to}', path: ${JSON.stringify(pts)} },`);
}
console.log(`      ],`);
console.error(`${near2.length} clear pairs under ${BRIDGE.toFixed(0)}%, ${kept.length} kept`);
const cut = nodes.filter((n) => !home.has(n.id));
if (cut.length) console.error(`STRANDED: ${cut.map((n) => n.id).join(', ')}`);
