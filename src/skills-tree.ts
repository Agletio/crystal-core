/**
 * Skill trees. A tree is a WEB: nodes name their neighbours, links run both
 * ways, and there are several routes to anything. Distance and gates are what
 * keep that from being a menu — every cross link is a shortcut past somebody's
 * distance, so anything strong carries a gate.
 *
 * `stats` are ordinary stat lines; `grants` are switches that CHANGE HOW THE
 * SKILL WORKS. See sim/skills.ts for the ones the delivery layer reads.
 */
import { buildTree } from './trees/layout';
import { FIREBALL_SPEC } from './trees/fireball';
import { CENTRE } from './trees/node';
import type { SkillNodeDef } from './trees/node';
import type { BuiltTree } from './trees/spec';

export { CENTRE } from './trees/node';
export type { NodeStat, SkillNodeDef } from './trees/node';

/** Thirty, whatever your level. A tree you can fill in is not a decision. */
export const MAX_TREE_POINTS = 30;

/** Every tree, built. The demo holds all of them to the same rules. */
export const BUILT_TREES: BuiltTree[] = [FIREBALL_SPEC].map(buildTree);

export const TREE_BY_SKILL: Record<string, BuiltTree> = Object.fromEntries(
  BUILT_TREES.map((t) => [t.spec.skillId, t])
);

export const SKILL_TREES: Record<string, SkillNodeDef[]> = Object.fromEntries(
  BUILT_TREES.map((t) => [t.spec.skillId, t.nodes])
);

export const treeFor = (skillId: string): SkillNodeDef[] => SKILL_TREES[skillId] ?? [];

export function nodeById(skillId: string, nodeId: string): SkillNodeDef | undefined {
  return treeFor(skillId).find((n) => n.id === nodeId);
}

/**
 * Every node's neighbours, both directions. Links are declared one-way; naming
 * both ends by hand is how a web ends up with one that only works left to right.
 */
const adjacency = new Map<string, Map<string, Set<string>>>();

export function neighboursOf(skillId: string, nodeId: string): Set<string> {
  let table = adjacency.get(skillId);
  if (!table) {
    table = new Map();
    const nodes = treeFor(skillId);
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
    adjacency.set(skillId, table);
  }
  return table.get(nodeId) ?? new Set();
}

/** Open if it touches the centre or something you own, and you are deep enough. */
export function canAllocate(
  skillId: string,
  nodeId: string,
  allocated: readonly string[]
): boolean {
  const node = nodeById(skillId, nodeId);
  if (!node || allocated.includes(nodeId)) return false;
  if (allocated.length < (node.gate ?? 0)) return false;

  const near = neighboursOf(skillId, nodeId);
  if (near.has(CENTRE)) return true;
  return allocated.some((id) => near.has(id));
}

/**
 * Refused when it would strand something — a reachability question, not a
 * dependency one, since a node with two routes home survives losing either.
 */
export function canDeallocate(
  skillId: string,
  nodeId: string,
  allocated: readonly string[]
): boolean {
  if (!allocated.includes(nodeId)) return false;

  const left = new Set(allocated.filter((id) => id !== nodeId));
  if (left.size === 0) return true;

  const seen = new Set<string>();
  const queue = [...left].filter((id) => neighboursOf(skillId, id).has(CENTRE));
  for (const id of queue) seen.add(id);

  while (queue.length) {
    const at = queue.pop()!;
    for (const next of neighboursOf(skillId, at)) {
      if (!left.has(next) || seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return seen.size === left.size;
}

/** Levels past the cap still arrive; they just stop buying tree points. */
export const treePointsFor = (level: number): number => Math.min(level, MAX_TREE_POINTS);
