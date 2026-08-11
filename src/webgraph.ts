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

/** Open if it touches the centre or something you own. Distance is the price. */
export function canAllocateIn(
  nodes: Web,
  nodeId: string,
  allocated: readonly string[]
): boolean {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node || allocated.includes(nodeId)) return false;

  const near = neighboursIn(nodes, nodeId);
  if (near.has(CENTRE)) return true;
  return allocated.some((id) => near.has(id));
}

/**
 * Refused when it would strand something — a reachability question, not a
 * dependency one, since a node with two routes home survives losing either.
 */
export function canDeallocateIn(
  nodes: Web,
  nodeId: string,
  allocated: readonly string[]
): boolean {
  if (!allocated.includes(nodeId)) return false;

  const left = new Set(allocated.filter((id) => id !== nodeId));
  if (left.size === 0) return true;

  const seen = new Set<string>();
  const queue = [...left].filter((id) => neighboursIn(nodes, id).has(CENTRE));
  for (const id of queue) seen.add(id);

  while (queue.length) {
    const at = queue.pop()!;
    for (const next of neighboursIn(nodes, at)) {
      if (!left.has(next) || seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen.size === left.size;
}

/**
 * Re-walks an allocation with the game's own rule instead of trusting it, and
 * returns what could be kept. Anything that cannot be re-bought — its node is
 * gone, or its path home went through one that is — falls out, and the caller
 * refunds it. Order does not matter: the pass repeats until nothing more fits.
 */
export function replayWeb(nodes: Web, wanted: readonly string[], cap: number): string[] {
  const real = wanted.filter((id) => nodes.some((n) => n.id === id));
  const room = Math.min(cap, real.length);
  const kept: string[] = [];

  for (let added = true; added && kept.length < room; ) {
    added = false;
    for (const id of real) {
      if (kept.includes(id)) continue;
      if (!canAllocateIn(nodes, id, kept)) continue;
      kept.push(id);
      added = true;
      if (kept.length >= room) break;
    }
  }
  return kept;
}
