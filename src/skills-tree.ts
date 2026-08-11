/**
 * Skill trees. A tree is a WEB: nodes name their neighbours, links run both
 * ways, and there are several routes to anything. DISTANCE is the whole price:
 * a notable out on a twig costs the run of minors in front of it, and that is
 * the only thing keeping the web from being a menu.
 *
 * `stats` are ordinary stat lines; `grants` are switches that CHANGE HOW THE
 * SKILL WORKS. See sim/skills.ts for the ones the delivery layer reads.
 */
import { canAllocateIn, canDeallocateIn, neighboursIn, replayWeb } from './webgraph';
import { buildTree } from './trees/layout';
import { BLIGHT_SPEC } from './trees/blight';
import { FIREBALL_SPEC } from './trees/fireball';
import { STRIKE_SPEC } from './trees/strike';
import { CENTRE } from './trees/node';
import type { SkillNodeDef } from './trees/node';
import type { BuiltTree } from './trees/spec';

export { CENTRE } from './trees/node';
export type { NodeStat, SkillNodeDef } from './trees/node';

/** Thirty, whatever your level. A tree you can fill in is not a decision. */
export const MAX_TREE_POINTS = 30;

/** Every tree, built. The demo holds all of them to the same rules. */
export const BUILT_TREES: BuiltTree[] = [STRIKE_SPEC, FIREBALL_SPEC, BLIGHT_SPEC].map(buildTree);

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

/** How a web is walked lives in `webgraph.ts`, over any list of nodes: a trade
 *  tree asks the same three questions and two copies is one that is wrong. */
export const neighboursOf = (skillId: string, nodeId: string): Set<string> =>
  neighboursIn(treeFor(skillId), nodeId);

export const canAllocate = (
  skillId: string,
  nodeId: string,
  allocated: readonly string[]
): boolean => canAllocateIn(treeFor(skillId), nodeId, allocated);

export const canDeallocate = (
  skillId: string,
  nodeId: string,
  allocated: readonly string[]
): boolean => canDeallocateIn(treeFor(skillId), nodeId, allocated);

export const replayTreeNodes = (
  skillId: string,
  wanted: readonly string[],
  cap: number
): string[] => replayWeb(treeFor(skillId), wanted, cap);

/** Levels past the cap still arrive; they just stop buying tree points. */
export const treePointsFor = (level: number): number => Math.min(level, MAX_TREE_POINTS);

export const hasNotable = (skillId: string, allocated: readonly string[]): boolean =>
  allocated.some((id) => nodeById(skillId, id)?.kind === 'notable');

/**
 * The nodes to take, in order, to reach the nearest notable — empty once one is
 * allocated. Distance is the whole price, so the shortest route is the cheapest
 * one and its LENGTH is what a notable costs from where you are standing.
 */
export function pathToNotable(
  skillId: string,
  allocated: readonly string[]
): SkillNodeDef[] {
  if (hasNotable(skillId, allocated)) return [];

  const seen = new Set<string>(allocated);
  const queue: string[][] = [];
  for (const node of treeFor(skillId)) {
    if (!canAllocate(skillId, node.id, allocated)) continue;
    seen.add(node.id);
    queue.push([node.id]);
  }

  for (let i = 0; i < queue.length; i++) {
    const path = queue[i];
    const at = path[path.length - 1];
    if (nodeById(skillId, at)?.kind === 'notable') {
      return path.map((id) => nodeById(skillId, id)!);
    }
    for (const next of neighboursOf(skillId, at)) {
      if (next === CENTRE || seen.has(next)) continue;
      seen.add(next);
      queue.push([...path, next]);
    }
  }
  return [];
}
