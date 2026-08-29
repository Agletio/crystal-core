/**
 * A trade is authored as CONTENT here and given coordinates by `layout.ts`.
 * Five spokes: one minor, a GATE everybody on that spoke takes, then a fork
 * into two branches of minor, notable, minor, notable. Ten a spoke, fifty.
 *
 * EVERY NOTABLE SITS AT AN EVEN DEPTH, which is the whole geometry: points come
 * two at a time, so a grant is a minor and the notable behind it and the last
 * pair finishes a branch. SIX points against fifty — one branch whole, three
 * notables, and the fork is still a choice at the cap.
 */
import type { Minor, Notable } from '../trees/spec';
import type { SkillNodeDef } from '../trees/node';

export interface Branch {
  id: string;
  theme: string; // what its minors are called
  minors: [Minor, Minor];
  notables: [Notable, Notable]; // the branch's middle and its tip, each behind a minor
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
  prefix: string; // node ids start `${prefix}_`, and a save points at them
  skill: string; // THE SKILL HE COMES DOWN HOLDING; the Skills screen swaps it
  sprite?: string; // the generated body he is DRAWN as; omitted, the base man
  dualWields?: boolean; // DUAL WIELDING IS ONE TRADE'S PRIVILEGE: this grants it
  spokes: Spoke[]; // five; buildTrade refuses anything else
  needs: Record<string, string>; // grant -> the node it is useless without
}

export interface BuiltTrade {
  spec: TradeSpec;
  nodes: SkillNodeDef[];
  spokeOf: Record<string, string>;
}
