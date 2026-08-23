/**
 * The trials web is authored as CONTENT here and given coordinates by
 * `layout.ts`. A REGION is a wedge of the circle: one gate off the middle, then
 * branches out of the gate, each a run of minors ending in a notable. REGION
 * COUNT IS OPEN — `buildTrade` throws on the wrong count because a trade has
 * five spokes forever, and this web GROWS instead, a region per kind of danger
 * anybody thinks of.
 */
import type { Minor, Notable } from '../trees/spec';
import type { SkillNodeDef } from '../trees/node';

/** A run of minors ending in a notable. The run IS the price of the notable. */
export interface TrialBranch {
  id: string;
  theme: string; // what its minors are called on the web
  minors: Minor[];
  notable: Notable;
}

export interface TrialRegion {
  id: string;
  theme: string;
  blurb: string; // one line on the hub's card: what walking it does to a descent
  gate: Notable; // the way in, and everything behind it is unreachable without it
  branches: TrialBranch[];
}

export interface TrialSpec {
  prefix: string; // node ids start `${prefix}_`, and a save points at them
  regions: TrialRegion[];
}

export interface BuiltTrials {
  spec: TrialSpec;
  nodes: SkillNodeDef[];
  regionOf: Record<string, string>;
}
