/**
 * A trade is authored as CONTENT here and given coordinates by `layout.ts`.
 *
 * Five spokes off one middle, each four nodes long and alternating travel with
 * something that matters: minor, notable, minor, notable. Twenty nodes, ten of
 * them notables, and a character has ten points — so five notables is the
 * CEILING rather than the average: a spoke you leave on a minor spent its last
 * point on travel to nowhere. What is decided is which five, and the outer
 * notable of a spoke costs its whole arm, so only two of those fit.
 */
import type { Minor, Notable } from '../trees/spec';
import type { SkillNodeDef } from '../trees/node';

export interface Spoke {
  id: string;
  theme: string; // what its two minors are called on the web
  minors: [Minor, Minor]; // one in front of each notable
  notables: [Notable, Notable]; // the reachable one, then the one that costs the arm
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
