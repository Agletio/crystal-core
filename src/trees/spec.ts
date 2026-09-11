/**
 * A tree is authored as CONTENT here and given coordinates by `layout.ts`.
 */
import type { NodeChoice, NodeFace, NodeStat, SkillNodeDef, StatConvert } from './node';

export interface Minor {
  name?: string; // a twig's minor is named, so a gate can say which one it means
  text: string;
  stats?: NodeStat[];
  grants?: Record<string, unknown>;
  under?: Record<string, NodeFace>; // per point, like the rest of it
}

export interface Notable {
  id: string;
  name: string;
  description: string;
  stats?: NodeStat[];
  grants?: Record<string, unknown>;
  choices?: NodeChoice[];
  keystone?: true; // one a tree, and only ever the last node of a twig
  becomes?: string; // a keystone's alone: the skill's own description while it is held
  under?: Record<string, NodeFace>;
  converts?: Record<string, StatConvert>; // a keystone's alone
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

export interface TreeSpec {
  skillId: string;
  prefix: string; // node ids start `${prefix}_`, and must never be reused
  minorName: string; // what an unnamed trunk minor is called
  common: Minor[];
  branches: Branch[]; // six; buildTree refuses anything else
  trunkNotables: Notable[]; // six
  /** Grant or stat -> the node it needs, which is also the branch it lives in. */
  needs: Record<string, string>;
}

/** A tree with its geometry worked out, plus what the demo holds it to. */
export interface BuiltTree {
  spec: TreeSpec;
  nodes: SkillNodeDef[];
  branchOf: Record<string, string>; // trunk nodes are absent
  enablers: Record<string, string>; // by branch id
}
