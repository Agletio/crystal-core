/**
 * Skill trees. A tree is a WEB: nodes name their neighbours, links run both
 * ways, and there are several routes to anything. DISTANCE is the whole price:
 * a notable out on a twig costs the run of minors in front of it, and that is
 * the only thing keeping the web from being a menu.
 *
 * `stats` are ordinary stat lines; `grants` are switches that CHANGE HOW THE
 * SKILL WORKS. See sim/skills.ts for the ones the delivery layer reads.
 */
import { canAllocateIn, canDeallocateIn, neighboursIn, pointsIn, replayWeb } from './webgraph';
import { GRANT_BY_ID } from './sim/grants';
import type { Changes } from './sim/grants';
import { interactionOf } from './trees/interactions';
import { buildTree } from './trees/layout';
import { AMBUSH_SPEC } from './trees/ambush';
import { ARC_LIGHTNING_SPEC } from './trees/arc_lightning';
import { BLIGHT_SPEC } from './trees/blight';
import { FIREBALL_SPEC } from './trees/fireball';
import { LIGHTNING_ARROW_SPEC } from './trees/lightning_arrow';
import { RIMESPIKE_SPEC } from './trees/rimespike';
import { SHOCKWAVE_SPEC } from './trees/shockwave';
import { STRIKE_SPEC } from './trees/strike';
import { BLINK_TREE } from './moves/blink';
import { LEAP_TREE } from './moves/leap';
import { GALE_TREE } from './moves/gale';
import { CENTRE } from './trees/node';
import type { SkillNodeDef } from './trees/node';
import type { BuiltTree } from './trees/spec';

export { CENTRE } from './trees/node';
export type { NodeStat, SkillNodeDef } from './trees/node';

/** Thirty, whatever your level. A tree you can fill in is not a decision. */
export const MAX_TREE_POINTS = 30;

/** Every tree, built. The demo holds all of them to the same rules. */
export const BUILT_TREES: BuiltTree[] = [
  STRIKE_SPEC,
  SHOCKWAVE_SPEC,
  FIREBALL_SPEC,
  RIMESPIKE_SPEC,
  BLIGHT_SPEC,
  ARC_LIGHTNING_SPEC,
  LIGHTNING_ARROW_SPEC,
  AMBUSH_SPEC,
  // The movers are trees like any other: same six branches, same 30 points.
  // *"Movement skill trees should just function exactly like skills."*
  BLINK_TREE,
  LEAP_TREE,
  GALE_TREE,
].map(buildTree);

export const SKILL_TREES: Record<string, SkillNodeDef[]> = Object.fromEntries(
  BUILT_TREES.map((t) => [t.spec.skillId, t.nodes] as const)
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
): boolean =>
  canAllocateIn(treeFor(skillId), nodeId, allocated) &&
  blockedBy(skillId, nodeId, allocated) === null &&
  keystoneRefused(skillId, nodeId, allocated) === null;

/** ONE KEYSTONE A TREE. The keystone already held that refuses this one, or
 *  null — a node that is not a keystone is never refused here. */
export function keystoneRefused(
  skillId: string,
  nodeId: string,
  allocated: readonly string[]
): SkillNodeDef | null {
  const node = nodeById(skillId, nodeId);
  if (!node?.keystone) return null;
  for (const id of allocated) {
    const held = nodeById(skillId, id);
    if (held?.keystone && held.id !== nodeId) return held;
  }
  return null;
}

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
): string[] =>
  replayWeb(treeFor(skillId), wanted, cap, (id, kept) => keystoneRefused(skillId, id, kept) === null);

/** Levels past the cap still arrive; they just stop buying points. */
export const pointCapFor = (): number => MAX_TREE_POINTS;

export const treePointsFor = (skillId: string, level: number): number =>
  Math.min(level, MAX_TREE_POINTS);

export const hasNotable = (skillId: string, allocated: readonly string[]): boolean =>
  allocated.some((id) => nodeById(skillId, id)?.kind === 'notable');

/**
 * The points to buy, in order, from what is held to a node that satisfies
 * `goal` — one entry a POINT, so a gate that wants three in the minor before
 * it lists that minor three times. Cheapest by points, since distance is the
 * whole price and a gate is distance too. Empty when nothing qualifies.
 */
function routeFrom(
  skillId: string,
  allocated: readonly string[],
  goal: (node: SkillNodeDef) => boolean
): string[] {
  const nodes = treeFor(skillId);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const cost = new Map<string, number>();
  const prev = new Map<string, string | null>();
  const extra = new Map<string, number>(); // copies of the node before it a gate wants first
  const done = new Set<string>();
  const heldAfter = (id: string) => (allocated.includes(id) ? pointsIn(allocated, id) : 1);

  for (const id of [CENTRE, ...new Set(allocated)]) {
    cost.set(id, 0);
    prev.set(id, null);
  }
  for (;;) {
    let at: string | null = null;
    for (const [id, c] of cost) if (!done.has(id) && (at === null || c < cost.get(at)!)) at = id;
    if (at === null) return [];
    done.add(at);
    const node = byId.get(at);
    if (node && !allocated.includes(at) && goal(node)) {
      const route: string[] = [];
      for (let id: string | null = at; id && cost.get(id)! > 0; id = prev.get(id) ?? null) {
        route.unshift(id);
        const before = prev.get(id);
        if (before && before !== CENTRE) route.unshift(...Array(extra.get(id) ?? 0).fill(before));
      }
      return route;
    }
    const fromHere = byId.get(at);
    for (const next of neighboursOf(skillId, at)) {
      const n = byId.get(next);
      if (!n || done.has(next) || allocated.includes(next)) continue;
      if (fromHere?.gate?.from === next) continue; // this link opens from the other side
      const more = n.gate?.from === at ? Math.max(0, n.gate.points - heldAfter(at)) : 0;
      const c = cost.get(at)! + more + 1;
      if (c < (cost.get(next) ?? Infinity)) {
        cost.set(next, c);
        prev.set(next, at);
        extra.set(next, more);
      }
    }
  }
}

/** The points that reach one node, from the middle or from what is held. */
export const routeTo = (skillId: string, nodeId: string, allocated: readonly string[] = []): string[] =>
  routeFrom(skillId, allocated, (n) => n.id === nodeId);

/**
 * The nodes to take, in order, to reach the nearest notable — empty once one is
 * allocated. Its LENGTH is what a notable costs from where you are standing.
 */
export function pathToNotable(
  skillId: string,
  allocated: readonly string[]
): SkillNodeDef[] {
  if (hasNotable(skillId, allocated)) return [];
  return routeFrom(skillId, allocated, (n) => n.kind === 'notable').map((id) => nodeById(skillId, id)!);
}
