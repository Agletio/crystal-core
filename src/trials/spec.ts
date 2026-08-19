/**
 * The trials web is authored as CONTENT here and given coordinates by
 * `layout.ts`. Arms off one middle, three nodes each — minor, minor, notable —
 * as a movement web is, because the same shape asks the same question: which
 * arms do you walk, and the arm is the price.
 *
 * ARM COUNT IS OPEN, which is the one difference from every other web here.
 * `buildTrade` and `buildMove` throw on the wrong count because a trade has
 * five spokes forever; this web GROWS, an arm per event that lands.
 */
import type { Minor, Notable } from '../trees/spec';
import type { SkillNodeDef } from '../trees/node';

export interface TrialArm {
  id: string;
  theme: string; // what its two minors are called on the web
  blurb: string; // one line on the hub's card: what walking it does to a descent
  minors: [Minor, Minor];
  notable: Notable; // one, at the tip: the arm is what it costs
}

export interface TrialSpec {
  prefix: string; // node ids start `${prefix}_`, and a save points at them
  arms: TrialArm[];
}

export interface BuiltTrials {
  spec: TrialSpec;
  nodes: SkillNodeDef[];
  armOf: Record<string, string>;
}
