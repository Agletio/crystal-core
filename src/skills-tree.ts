/**
 * Skill trees.
 *
 * A tree is a WEB, not a hierarchy. Nodes name their neighbours and the links
 * run both ways, so there are usually several routes to anything and you pick
 * the one that pays for itself along the way. That is the whole reason to
 * spend a point on a node you do not want: it is standing between you and one
 * you do.
 *
 * Two things keep a web from collapsing into "take the five best nodes":
 *
 *   distance   a node far from the centre costs every node on the way there
 *   gate       a node that refuses to open until N points are already spent
 *
 * The second is what stops a wide web from being a menu. Without it, cross
 * links — the ones that make travel interesting — would also be shortcuts
 * straight to the payoff.
 *
 * A node has two channels:
 *
 *   stats   ordinary stat lines, exactly like a mod's
 *   grants  switches that CHANGE HOW THE SKILL WORKS
 *
 * The second is the point. Trees are meant to be transformative — most of
 * your numbers should come from gear, while the tree decides how you play.
 * "Crits burn instead of hitting harder" and "the projectile passes through"
 * are not expressible as stat lines, so they're grants the behaviour and the
 * damage resolution read.
 *
 * Same division as currencies: data says WHAT, a registry says HOW. See
 * sim/skills.ts for the grants the delivery layer understands.
 */
import { FIREBALL_TREE } from './trees/fireball';
import { CENTRE } from './trees/node';
import type { SkillNodeDef } from './trees/node';

export { CENTRE } from './trees/node';
export type { NodeStat, SkillNodeDef } from './trees/node';

/**
 * Thirty, whatever your level.
 *
 * A tree that keeps growing with level ends up fully allocated, and a fully
 * allocated tree is not a decision — it is a delay. The cap is what makes
 * "which twenty-five nodes" a question you answer rather than postpone.
 */
export const MAX_TREE_POINTS = 30;

export const SKILL_TREES: Record<string, SkillNodeDef[]> = {
  fireball: FIREBALL_TREE,
};

export const treeFor = (skillId: string): SkillNodeDef[] => SKILL_TREES[skillId] ?? [];

export function nodeById(skillId: string, nodeId: string): SkillNodeDef | undefined {
  return treeFor(skillId).find((n) => n.id === nodeId);
}

/**
 * Every node's neighbours, both directions, built once per tree.
 *
 * Links are declared one-way in the data because writing both ends by hand is
 * how a web ends up with a link that only works if you approach it from the
 * left. Cached because allocation asks for this on every hover of every node.
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

/**
 * Open if it touches something you already own, and you are deep enough in.
 *
 * "Touches the centre" counts, which is what gives every tree its first move.
 */
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
 * Refused when it would strand something.
 *
 * In a hierarchy that check is "does anything require this". In a web it is a
 * reachability question — a node with two routes home survives losing either
 * one — so this actually walks what would be left.
 */
export function canDeallocate(
  skillId: string,
  nodeId: string,
  allocated: readonly string[]
): boolean {
  if (!allocated.includes(nodeId)) return false;

  const left = new Set(allocated.filter((id) => id !== nodeId));
  if (left.size === 0) return true;

  // Flood out from the centre through what remains.
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

/**
 * Points spent, and the ceiling.
 *
 * Levels past the cap still arrive — they just stop buying tree points, which
 * is honest about what a level is worth rather than pretending the tree is
 * still growing.
 */
export const treePointsFor = (level: number): number => Math.min(level, MAX_TREE_POINTS);
