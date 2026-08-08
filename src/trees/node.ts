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
}

export interface NodeChoice {
  id: string;
  name: string;
  description: string;
  grants?: Record<string, unknown>;
}

/** The skill itself, at the middle of its own web. Always allocated. */
export const CENTRE = 'centre';

export const stat = (
  s: string,
  form: StatForm,
  value: number,
  tags?: string[]
): NodeStat => ({ stat: s, form, value, ...(tags ? { tags } : {}) });
