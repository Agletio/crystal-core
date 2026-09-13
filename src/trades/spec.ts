/**
 * A trade is authored as CONTENT here and given coordinates by `layout.ts`.
 * Five spokes: one minor, a GATE everybody on that spoke takes, then a fork
 * into two branches, each a run of minor-then-notable — ONE pair on a tree
 * whose notables are KEYSTONES, two on one not yet rebuilt that way.
 *
 * EVERY NOTABLE SITS AT AN EVEN DEPTH: points come two at a time, so a grant is
 * a minor and the notable behind it and the last pair finishes a branch.
 */
import type { Minor, Notable } from '../trees/spec';
import type { SkillNodeDef } from '../trees/node';

export interface Branch {
  id: string;
  theme: string; // what its minors are called
  minors: Minor[]; // one behind each notable
  notables: Notable[]; // one keystone, or a middle and a tip; `buildTrade` refuses any other count
}

/** Two keystones that do not work together: refused, and the card says why. */
export interface Clash {
  a: string;
  b: string;
  why: string;
}

export interface Spoke {
  id: string;
  theme: string; // what the STEM's minors are called
  minors: [Minor];
  gate: Notable; // taken by everyone on this spoke, before it asks anything
  branches: [Branch, Branch];
}

/** WHAT THE TRADE GIVES FOR NOTHING, before a point is spent. */
export interface TradeBase {
  short: string; // the line the cast hall picks on
  says?: string[]; // for a baseline no grant carries; quotes the sim's own tables

  grants?: Record<string, unknown>; // the web's middle prints these off `say`
}

export interface TradeSpec {
  id: string;
  name: string;
  blurb: string; // the rule it changes, in one line: what the picker shows
  lore: string; // who he IS, where the blurb is the rule he changes
  baseline: TradeBase;
  // 6 to 15 an attribute, 57 in all. Never in `Character.attributes`, which is
  // what a respec hands back: a trade's spread changes with the trade.
  attributes: Record<string, number>;
  prefix: string; // node ids start `${prefix}_`, and a save points at them
  skill: string; // THE SKILL HE COMES DOWN HOLDING; the Skills screen swaps it
  sprite?: string; // the generated body he is DRAWN as; omitted, the base man
  dualWields?: boolean; // DUAL WIELDING IS ONE TRADE'S PRIVILEGE: this grants it
  spokes: Spoke[]; // five; buildTrade refuses anything else
  needs: Record<string, string>; // grant -> the node it is useless without
  clashes?: Clash[]; // pairs that may never both be held
}

export interface BuiltTrade {
  spec: TradeSpec;
  nodes: SkillNodeDef[];
  spokeOf: Record<string, string>;
}
