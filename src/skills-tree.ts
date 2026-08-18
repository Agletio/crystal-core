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
import { GRANT_BY_ID } from './sim/grants';
import type { Changes } from './sim/grants';
import { interactionOf } from './trees/interactions';
import { buildTree } from './trees/layout';
import { ARC_LIGHTNING_SPEC } from './trees/arc_lightning';
import { BLIGHT_SPEC } from './trees/blight';
import { FIREBALL_SPEC } from './trees/fireball';
import { LIGHTNING_ARROW_SPEC } from './trees/lightning_arrow';
import { STRIKE_SPEC } from './trees/strike';
import { MOVE_POINTS, buildMove } from './moves/layout';
import { BLINK_MOVES } from './moves/blink';
import { LEAP_MOVES } from './moves/leap';
import { CENTRE } from './trees/node';
import type { SkillNodeDef } from './trees/node';
import type { BuiltTree } from './trees/spec';
import type { BuiltMove } from './moves/spec';

export { CENTRE } from './trees/node';
export type { NodeStat, SkillNodeDef } from './trees/node';

/** Thirty, whatever your level. A tree you can fill in is not a decision. */
export const MAX_TREE_POINTS = 30;

/** Every tree, built. The demo holds all of them to the same rules. */
export const BUILT_TREES: BuiltTree[] = [
  STRIKE_SPEC,
  FIREBALL_SPEC,
  BLIGHT_SPEC,
  ARC_LIGHTNING_SPEC,
  LIGHTNING_ARROW_SPEC,
].map(buildTree);

/** The movement webs: their own geometry and their own budget, but a web the
 *  screen walks exactly like a tree — `treeFor` is what every caller asks. */
export const MOVE_WEBS: BuiltMove[] = [BLINK_MOVES, LEAP_MOVES].map(buildMove);

export const SKILL_TREES: Record<string, SkillNodeDef[]> = Object.fromEntries([
  ...BUILT_TREES.map((t) => [t.spec.skillId, t.nodes] as const),
  ...MOVE_WEBS.map((m) => [m.spec.skillId, m.nodes] as const),
]);

const MOVE_SKILLS = new Set(MOVE_WEBS.map((m) => m.spec.skillId));

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
): boolean =>
  canAllocateIn(treeFor(skillId), nodeId, allocated) &&
  blockedBy(skillId, nodeId, allocated) === null;

/** Every class a node changes, its chosen option included. */
function classesOf(node: SkillNodeDef | undefined, chosen?: string): Changes[] {
  const bags = [
    node?.grants ?? {},
    ...(node?.choices ?? []).filter((c) => !chosen || c.id === chosen).map((c) => c.grants ?? {}),
  ];
  const out = new Set<Changes>();
  for (const bag of bags) {
    for (const id of Object.keys(bag)) {
      const cls = GRANT_BY_ID[id]?.changes;
      if (cls) out.add(cls);
    }
  }
  return [...out];
}

/**
 * The node already allocated that this one cannot be taken with, or null.
 *
 * A combination with no coherent answer is REFUSED and says why, because a
 * silently ignored point is a point spent on nothing. Nothing is blocked today
 * — every pair in `INTERACTIONS` composes — so this is the mechanism for when
 * one appears rather than a rule anybody is currently hitting.
 */
export function blockedBy(
  skillId: string,
  nodeId: string,
  allocated: readonly string[]
): { node: SkillNodeDef; says: string } | null {
  const mine = classesOf(nodeById(skillId, nodeId));
  if (mine.length === 0) return null;

  for (const id of allocated) {
    const held = nodeById(skillId, id);
    for (const theirs of classesOf(held)) {
      for (const own of mine) {
        const pair = interactionOf(own, theirs);
        if (pair?.blocked) return { node: held!, says: pair.says };
      }
    }
  }
  return null;
}

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

/** Levels past the cap still arrive; they just stop buying points. The cap is
 *  the WEB's rather than the game's — a nine-node movement web under a global
 *  30 is owned by level 9, which is what `MAX_TREE_POINTS` exists to stop. */
export const pointCapFor = (skillId: string): number =>
  MOVE_SKILLS.has(skillId) ? MOVE_POINTS : MAX_TREE_POINTS;

export const treePointsFor = (skillId: string, level: number): number =>
  Math.min(level, pointCapFor(skillId));

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
