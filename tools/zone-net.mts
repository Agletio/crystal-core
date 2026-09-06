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
const TOL = Number(process.argv[4] ?? 0.5);
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
    if (far > REACH) continue;
    found.push({ from: nodes[a].id, to: nodes[b].id, route, far });
  }
}

const through = (c: Cand): string | null => {
  for (const n of nodes) {
    if (n.id === c.from || n.id === c.to) continue;
    if (c.route.some(([x, y]) => Math.hypot(x - n.x, y - n.y) <= ON_ROUTE)) return n.id;
  }
  return null;
};

const kept = found.filter((c) => !through(c)).sort((a, b) => a.far - b.far);
console.log(`      links: [`);
for (const c of kept) {
  const pts = thin(c.route, TOL).map(([x, y]) => [Math.round(x), Math.round(y)]);
  console.log(`        { from: '${c.from}', to: '${c.to}', path: ${JSON.stringify(pts)} },`);
}
console.log(`      ],`);
console.error(`${found.length} pairs within ${REACH}%, ${kept.length} kept`);
const touched = new Set(kept.flatMap((c) => [c.from, c.to]));
const lonely = nodes.filter((n) => !touched.has(n.id) && depthOfId(n.id) === null);
if (lonely.length) console.error(`ALONE: ${lonely.map((n) => n.id).join(', ')}`);
