/**
 * What a tree node is. Its own module so a tree and the rules that walk it can
 * both import it without a cycle through the registry.
 */
import type { StatForm } from '../types';

export interface NodeStat {
  stat: string;
  form: StatForm;
  value: number;
  tags?: string[];
}

export interface SkillNodeDef {
  id: string;
  name: string;
  description: string;
  kind: 'minor' | 'notable'; // notables are the reason to walk in a direction
  keystone?: true; // changes what the skill IS; the end of a line, and one a tree
  becomes?: string; // what the skill's own card says while this keystone is held
  points?: number; // how many points it holds; 1 unless said, and a minor may hold a RANGE
  gate?: { from: string; points: number }; // the link from `from` opens once it holds this many
  x: number; // web coordinates; units are arbitrary, the view fits what it gets
  y: number;
  /** UNDIRECTED, so only one end need say so. CENTRE means "touches the skill". */
  links: string[];
  stats?: NodeStat[];
  grants?: Record<string, unknown>;
  /**
   * A node that asks a question rather than just switching on. The answer is
   * free to change; two exclusive nodes would tax finding out what one does.
   */
  choices?: NodeChoice[];
  /** The face this node wears under a KEYSTONE, by keystone id: what it says
   *  and does once the skill is a different thing. */
  under?: Record<string, NodeFace>;
  /** A KEYSTONE's own: a stat any other node carries, read as another once
   *  this is held, and the words that change on its card. */
  converts?: Record<string, StatConvert>;
}

export interface NodeFace {
  description: string;
  stats?: NodeStat[];
  grants?: Record<string, unknown>;
}

export interface StatConvert {
  stat: string;
  tags?: string[];
  say: [string, string]; // the phrase on a card, and what it becomes
  flip?: true; // the value changes sign: increased Cast Speed is a NEGATIVE cooldown
  form?: StatForm; // the line's form changes too: flat Critical Damage read as increased Bleed Damage
}

export interface NodeChoice {
  id: string;
  name: string;
  description: string;
  grants?: Record<string, unknown>;
  stats?: NodeStat[]; // for a web whose content is stats rather than switches
}

/** The skill itself, at the middle of its own web. Always allocated. */
export const CENTRE = 'centre';

export const stat = (
  s: string,
  form: StatForm,
  value: number,
  tags?: string[]
): NodeStat => ({ stat: s, form, value, ...(tags ? { tags } : {}) });
