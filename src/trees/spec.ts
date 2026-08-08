/**
 * A tree is authored as CONTENT here and given coordinates by `layout.ts`.
 */
import type { NodeChoice, NodeStat, SkillNodeDef } from './node';

export interface Minor {
  text: string;
  stats?: NodeStat[];
  grants?: Record<string, unknown>;
}

export interface Notable {
  id: string;
  name: string;
  description: string;
  gate: number;
  stats?: NodeStat[];
  grants?: Record<string, unknown>;
  choices?: NodeChoice[];
}

/** A run of minors ending in a notable, which is a DEAD END — nothing past it. */
export interface Twig {
  minors: number;
  notable: Notable;
  forkFrom?: { twig: number; at: number }; // sprout off a twig, not the enabler
}

/** Everything behind `enabler` is unreachable until it is bought. */
export interface Branch {
  id: string;
  theme: string; // what its minors are called on the web
  enabler: Notable;
  twigs: Twig[];
  minors: Minor[];
}

/** Spent-point gates, shared so depth means the same thing in every tree. */
export const GATE = { enabler: 3, mid: 8, deep: 14, tip: 20 };

/** Trunk notable gates in spur order, alternating so the cheap ones spread. */
export const SPUR_GATES = [5, 11, 17, 7, 13, 21];

/** [spur, step] pairs one step apart, so the far node costs the same either way. */
export type Crossing = [[number, number], [number, number]];

export interface TreeSpec {
  skillId: string;
  prefix: string; // node ids start `${prefix}_`, and must never be reused
  minorName: string; // what an unnamed trunk minor is called
  common: Minor[];
  branches: Branch[]; // six; buildTree refuses anything else
  trunkNotables: Notable[]; // six
  crossings: Crossing[];
  /** Grant or stat -> the node it needs, which is also the branch it lives in. */
  needs: Record<string, string>;
}

/** A tree with its geometry worked out, plus what the demo holds it to. */
export interface BuiltTree {
  spec: TreeSpec;
  nodes: SkillNodeDef[];
  branchOf: Record<string, string>; // trunk nodes are absent
  crossings: Array<[string, string]>;
  enablers: Record<string, string>; // by branch id
}
