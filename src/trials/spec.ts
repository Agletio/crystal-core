/**
 * The trials web is authored as CONTENT here and given coordinates by
 * `layout.ts`. It is a MAP, not a fan: WHEELS sit at fixed places and ROADS of
 * generic nodes run between them, so reaching the thing you want is a route you
 * worked out. A wheel's ring is ITS OWN — the Watch's is all rarer monsters,
 * the Vein's is all coin — and its major hangs off the ring FURTHEST from the
 * road, so half the ring is the price and which half is the decision.
 */
import type { Minor, Notable } from '../trees/spec';
import type { SkillNodeDef } from '../trees/node';

export interface TrialWheel {
  id: string;
  theme: string; // what its ring is called on the web
  blurb: string; // one line on the hub's card
  at: { x: number; y: number }; // where it sits on the map, in web units
  roads: string[]; // wheels (or CENTRE) a road runs to; naming it back is free
  minors: Minor[]; // the ring, specific to this wheel
  major: Notable; // the middle of it
}

export interface TrialSpec {
  prefix: string; // node ids start `${prefix}_`, and a save points at them
  /** What a ROAD node says. Generic on purpose: a road is the price of where it
   *  goes, and one worth walking for itself is one nobody plans around. */
  road: Minor[];
  wheels: TrialWheel[];
}

export interface BuiltTrials {
  spec: TrialSpec;
  nodes: SkillNodeDef[];
  regionOf: Record<string, string>;
}
