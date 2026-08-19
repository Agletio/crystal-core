/**
 * A trade is authored as CONTENT here and given coordinates by `layout.ts`.
 *
 * Five spokes, each a STEM that forks: two minors, a GATE notable everybody on
 * that spoke takes, then a choice of two branches of three. Nine a spoke,
 * forty-five in all. The forced half is the point: a spoke says what it IS
 * before it asks anything, and the customised half is where two builds on one
 * spoke stop looking alike. TEN POINTS against forty-five, UNCHANGED — more
 * nodes on one budget is more choice and never more power.
 */
import type { Minor, Notable } from '../trees/spec';
import type { SkillNodeDef } from '../trees/node';

export interface Branch {
  id: string;
  theme: string; // what its minors are called
  minors: [Minor, Minor];
  notable: Notable;
}

export interface Spoke {
  id: string;
  theme: string; // what the STEM's minors are called
  minors: [Minor, Minor];
  gate: Notable; // taken by everyone on this spoke, before it asks anything
  branches: [Branch, Branch];
}

export interface TradeSpec {
  id: string;
  name: string;
  blurb: string; // the rule it changes, in one line: what the picker shows
  lore: string; // who he IS, where the blurb is the rule he changes
  prefix: string; // node ids start `${prefix}_`, and a save points at them
  sprite?: string; // the generated body he is DRAWN as; omitted, the base man
  spokes: Spoke[]; // five; buildTrade refuses anything else
  needs: Record<string, string>; // grant -> the node it is useless without
}

export interface BuiltTrade {
  spec: TradeSpec;
  nodes: SkillNodeDef[];
  spokeOf: Record<string, string>;
}
