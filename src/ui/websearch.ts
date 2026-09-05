/**
 * FINDING A NODE, in any web. Three webs ask the same question — where is the
 * node that does X — and all three tag their node groups `data-node`, so one
 * implementation reads every one of them; what differs is which nodes are
 * showing and how the camera moves, and both come in as callbacks.
 *
 * A search DIMS what does not match rather than hiding it: a web with holes in
 * it is a web whose shape you can no longer read, and the shape is the price.
 */
import type { SkillNodeDef } from '../skills-tree';

export interface FindSpec {
  /** The box, the web that carries the node groups, and what it is showing. */
  input: string;
  svg: string;
  nodes: () => SkillNodeDef[];
  /** Put the camera on one. Absent, a search only marks. */
  focus?: (node: SkillNodeDef) => void;
  /** Called after the marks change, for a screen that draws a count. */
  marked?: (hits: number, query: string) => void;
}

const $ = (id: string) => document.getElementById(id)!;

/** Every word a node says: a minor's description IS its stat line. */
export function nodeWords(node: SkillNodeDef): string {
  const choices = (node.choices ?? []).map((c) => `${c.name} ${c.description}`).join(' ');
  return `${node.name} ${node.description} ${choices} ${node.kind}`.toLowerCase();
}

/** Every word of the query has to appear, so two words narrow rather than widen. */
export function nodeMatches(node: SkillNodeDef, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const said = nodeWords(node);
  return words.every((word) => said.includes(word));
}

export class WebFind {
  private query = '';
  private at = 0;

  constructor(private readonly spec: FindSpec) {}

  hits(): SkillNodeDef[] {
    if (!this.query) return [];
    return this.spec.nodes().filter((node) => nodeMatches(node, this.query));
  }

  /** Marks the DOM as it stands; every screen calls it after a rebuild. */
  paint(): void {
    const svg = document.getElementById(this.spec.svg);
    if (!svg) return;
    const hit = new Set(this.hits().map((n) => n.id));
    svg.classList.toggle('web--finding', this.query !== '');
    for (const group of svg.querySelectorAll<SVGElement>('[data-node]')) {
      const mine = hit.has(group.getAttribute('data-node') ?? '');
      group.classList.toggle('web__node--hit', this.query !== '' && mine);
      group.classList.toggle('web__node--miss', this.query !== '' && !mine);
    }
    this.spec.marked?.(hit.size, this.query);
  }

  /** The next one round the ring: Enter walks a search with several answers. */
  private go(step: number): void {
    const found = this.hits();
    if (found.length === 0) return;
    this.at = ((this.at + step) % found.length + found.length) % found.length;
    this.spec.focus?.(found[this.at]);
  }

  attach(): void {
    const box = $(this.spec.input) as HTMLInputElement;
    box.value = '';
    box.oninput = () => {
      this.query = box.value.trim();
      this.at = -1;
      this.paint();
      this.go(1);
    };
    box.onkeydown = (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        this.go(event.shiftKey ? -1 : 1);
        return;
      }
      // A box with something in it eats Escape: the first press clears the
      // search and the second closes the screen, which is the order anybody
      // typing expects. Never swallowed when it is already empty.
      if (event.key === 'Escape' && box.value !== '') {
        event.stopPropagation();
        box.value = '';
        this.query = '';
        this.paint();
      }
    };
  }

  /** Opening a screen starts with the whole web: a filter left over from last
   *  time is a web that looks half-built. */
  clear(): void {
    const box = document.getElementById(this.spec.input) as HTMLInputElement | null;
    if (box) box.value = '';
    this.query = '';
    this.at = -1;
    this.paint();
  }
}
