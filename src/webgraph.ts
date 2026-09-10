/**
 * The rules that walk a web, over any list of nodes.
 *
 * A skill tree and a trade tree are different content on the same shape: links
 * run both ways, the middle is always yours, and DISTANCE is the whole price.
 * Both ask the same three questions, so both ask them here — two copies of a
 * reachability rule is one copy that is wrong.
 */
import { CENTRE } from './trees/node';
import type { SkillNodeDef } from './trees/node';

type Web = readonly SkillNodeDef[];

/** Both directions: a link is declared one way and walked either way. */
const cache = new WeakMap<Web, Map<string, Set<string>>>();

export function neighboursIn(nodes: Web, nodeId: string): Set<string> {
  let table = cache.get(nodes);
  if (!table) {
    table = new Map();
    const add = (a: string, b: string) => {
      if (!table!.has(a)) table!.set(a, new Set());
      table!.get(a)!.add(b);
    };
    for (const node of nodes) {
      for (const other of node.links) {
        add(node.id, other);
        add(other, node.id);
      }
    }
    cache.set(nodes, table);
  }
  return table.get(nodeId) ?? new Set();
}

/** Points spent on one node: an id appears in `allocated` once per point. */
export const pointsIn = (allocated: readonly string[], id: string): number =>
  allocated.reduce((n, x) => n + (x === id ? 1 : 0), 0);

/** The list less ONE point of `id` — the last copy, so what is refunded is
 *  what was bought last. */
export const withoutOne = (allocated: readonly string[], id: string): string[] => {
  const at = allocated.lastIndexOf(id);
  return at < 0 ? [...allocated] : [...allocated.slice(0, at), ...allocated.slice(at + 1)];
};

/** A link is open unless one end GATES it on points in the other. */
function open(nodes: Web, a: string, b: string, allocated: readonly string[]): boolean {
  const gateOf = (id: string) => nodes.find((n) => n.id === id)?.gate;
  const ga = gateOf(a);
  if (ga && ga.from === b && pointsIn(allocated, b) < ga.points) return false;
  const gb = gateOf(b);
  if (gb && gb.from === a && pointsIn(allocated, a) < gb.points) return false;
  return true;
}

/** Open if it touches the centre or something you own through an open link,
 *  and it still has room: a node holds `points` of them, one unless said.
 *  Distance is the price. */
export function canAllocateIn(
  nodes: Web,
  nodeId: string,
  allocated: readonly string[]
): boolean {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return false;
  const held = pointsIn(allocated, nodeId);
  if (held >= (node.points ?? 1)) return false;
  if (held > 0) return true; // a second point sits where the first did

  const near = neighboursIn(nodes, nodeId);
  if (near.has(CENTRE)) return true;
  return [...near].some((id) => allocated.includes(id) && open(nodes, nodeId, id, allocated));
}

/** Refused when it would strand something — reachability, not dependency:
 *  a node with two routes home survives losing either. The last point comes
 *  off, and a gate shutting behind something owned refuses it. */
export function canDeallocateIn(
  nodes: Web,
  nodeId: string,
  allocated: readonly string[]
): boolean {
  if (!allocated.includes(nodeId)) return false;

  const left = withoutOne(allocated, nodeId);
  const own = new Set(left);
  if (own.size === 0) return true;

  const seen = new Set<string>();
  const queue = [...own].filter((id) => neighboursIn(nodes, id).has(CENTRE));
  for (const id of queue) seen.add(id);

  while (queue.length) {
    const here = queue.pop()!;
    for (const next of neighboursIn(nodes, here)) {
      if (!own.has(next) || seen.has(next) || !open(nodes, here, next, left)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen.size === own.size;
}

/** Re-walks an allocation with the game's own rule and returns what could be
 *  kept; what cannot be re-bought falls out and the caller refunds it. Order
 *  does not matter: the pass repeats until nothing more fits. */
export function replayWeb(
  nodes: Web,
  wanted: readonly string[],
  cap: number,
  allowed: (id: string, kept: readonly string[]) => boolean = () => true
): string[] {
  let pending = wanted.filter((id) => nodes.some((n) => n.id === id));
  const room = Math.min(cap, pending.length);
  const kept: string[] = [];

  for (let added = true; added && kept.length < room; ) {
    added = false;
    for (const id of [...pending]) {
      if (!canAllocateIn(nodes, id, kept) || !allowed(id, kept)) continue;
      kept.push(id);
      pending.splice(pending.indexOf(id), 1);
      added = true;
      if (kept.length >= room) break;
    }
  }
  return kept;
}
