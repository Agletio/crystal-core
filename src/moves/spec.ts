/**
 * A movement web is authored as CONTENT here and given coordinates by
 * `layout.ts`. Three arms off one middle, three nodes each — minor, minor,
 * notable — and a budget smaller than the web, so what is decided is which
 * ARMS you walk and the arm is the price, exactly as a trade spoke is.
 *
 * Not a `TreeSpec`: `buildTree` wants six branches and six trunk notables and
 * throws rather than dropping the extras. What the three families share is
 * `webgraph.ts` for reach, refund and replay, and `webart.ts` for the studs.
 */
import type { Minor, Notable } from '../trees/spec';
import type { SkillNodeDef } from '../trees/node';

export interface Arm {
  id: string;
  theme: string; // what its two minors are called on the web
  minors: [Minor, Minor];
  notable: Notable; // one, at the tip: the arm is what it costs
}

export interface MoveSpec {
  skillId: string;
  prefix: string; // node ids start `${prefix}_`, and a save points at them
  arms: Arm[]; // three; buildMove refuses anything else
  needs: Record<string, string>; // grant -> the node it is useless without
}

export interface BuiltMove {
  spec: MoveSpec;
  nodes: SkillNodeDef[];
  armOf: Record<string, string>;
}
