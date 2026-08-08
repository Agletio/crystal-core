/**
 * What a tree node is.
 *
 * Its own module so the trees and the rules that walk them can both import it
 * without importing each other — a tree that reaches back into the registry
 * it is being registered into is a cycle, and a cycle here fails at load time
 * rather than at a call site you can find.
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
  /** Notables are drawn larger and are the reason to walk in a direction. */
  kind: 'minor' | 'notable';
  /** Web coordinates. Units are arbitrary — the view fits whatever it gets. */
  x: number;
  y: number;
  /**
   * Neighbours, by id. Links are UNDIRECTED: naming a node here connects both
   * ways, so only one end has to say so. CENTRE means "touches the skill".
   */
  links: string[];
  /**
   * Points that must already be spent in this tree before this node will
   * open. Distance alone cannot gate a web — every cross link is a shortcut —
   * so anything strong says how deep into the tree it expects you to be.
   */
  gate?: number;
  stats?: NodeStat[];
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
