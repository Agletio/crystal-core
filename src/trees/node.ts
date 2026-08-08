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
  /** Notables are drawn larger and are the reason to walk in a direction. */
  kind: 'minor' | 'notable';
  /** Web coordinates. Units are arbitrary — the view fits whatever it gets. */
  x: number;
  y: number;
  /** UNDIRECTED, so only one end need say so. CENTRE means "touches the skill". */
  links: string[];
  /** Points that must already be spent. Distance alone cannot gate a web. */
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
