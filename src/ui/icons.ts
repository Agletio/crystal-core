/**
 * Little item icons, drawn as inline SVG.
 *
 * SVG rather than canvas because these live in the DOM next to text: they
 * scale with font size, inherit CSS colour where useful, and cost nothing to
 * re-render when a list redraws.
 *
 * Same deal as the creature sprites — procedural placeholders with a shape
 * that reads at a glance, not art. Crystals grow facets and points with tier
 * so a T6 is obviously worth more than a T1 without reading the label.
 * Replacing any of these with a real asset means swapping one function.
 */
import { CRYSTAL_TIERS } from '../data';
import type { CurrencyDef, Item } from '../types';

const NS = 'http://www.w3.org/2000/svg';

function svg(size = 26): SVGSVGElement {
  const node = document.createElementNS(NS, 'svg');
  node.setAttribute('viewBox', '0 0 32 32');
  node.setAttribute('width', String(size));
  node.setAttribute('height', String(size));
  node.setAttribute('aria-hidden', 'true');
  node.classList.add('icon');
  return node;
}

function shape(
  parent: SVGSVGElement,
  tag: string,
  attrs: Record<string, string | number>
): SVGElement {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  parent.append(node);
  return node;
}

/** Points of a regular polygon, optionally squashed, as an SVG points string. */
function polygon(cx: number, cy: number, r: number, sides: number, squash = 1): string {
  const pts: string[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r * squash).toFixed(2)}`);
  }
  return pts.join(' ');
}

const CRYSTAL_COLOURS = [
  'var(--dust)',
  'var(--quartz)',
  'var(--verdite)',
  'var(--amethyst)',
  'var(--citrine)',
  'var(--ember)',
];

/**
 * A gem that grows with tier: more facets, larger, and gaining a halo of
 * shards at the top end.
 */
export function crystalIcon(tier: number, size = 26): SVGSVGElement {
  const node = svg(size);
  const t = Math.max(1, Math.min(CRYSTAL_TIERS.length, tier));
  const colour = CRYSTAL_COLOURS[t - 1] ?? 'var(--amethyst)';

  const radius = 7 + t * 1.25;
  const sides = 4 + Math.min(4, t);

  // Outer glow appears from mid tiers, so the ladder reads at a glance.
  if (t >= 3) {
    shape(node, 'polygon', {
      points: polygon(16, 17, radius + 3, sides, 1.05),
      fill: colour,
      opacity: 0.16,
    });
  }

  shape(node, 'polygon', {
    points: polygon(16, 17, radius, sides, 1.05),
    fill: colour,
    stroke: 'var(--void)',
    'stroke-width': 1.5,
    'stroke-linejoin': 'round',
  });

  // Inner facet — a lighter core so it doesn't read as a flat blob.
  shape(node, 'polygon', {
    points: polygon(16, 16, radius * 0.45, sides, 1),
    fill: 'var(--chalk)',
    opacity: 0.55,
  });

  // Floating shards for the top tiers.
  if (t >= 5) {
    shape(node, 'polygon', { points: polygon(6, 8, 2.6, 3), fill: colour });
    shape(node, 'polygon', { points: polygon(26, 9, 2.2, 3), fill: colour });
  }
  return node;
}

/** Deliberately generic: a breastplate, a band, a fallback plate. */
export function gearIcon(base: string, size = 26): SVGSVGElement {
  const node = svg(size);

  if (base === 'ring') {
    shape(node, 'circle', {
      cx: 16,
      cy: 18,
      r: 8,
      fill: 'none',
      stroke: 'var(--quartz)',
      'stroke-width': 3.5,
    });
    shape(node, 'polygon', {
      points: polygon(16, 7, 4, 4),
      fill: 'var(--citrine)',
      stroke: 'var(--void)',
      'stroke-width': 1.2,
    });
    return node;
  }

  // Body armour: a plate with shoulders.
  shape(node, 'path', {
    d: 'M10 8 L16 6 L22 8 L23 18 Q16 27 9 18 Z',
    fill: 'var(--quartz)',
    stroke: 'var(--void)',
    'stroke-width': 1.5,
    'stroke-linejoin': 'round',
  });
  shape(node, 'path', {
    d: 'M16 8 L16 22',
    stroke: 'var(--void)',
    'stroke-width': 1.2,
    opacity: 0.55,
  });
  return node;
}

const CLASS_COLOURS: Record<string, string> = {
  basic: 'var(--dust)',
  uncommon: 'var(--verdite)',
  rare: 'var(--quartz)',
  exotic: 'var(--citrine)',
};

/** A jewel whose colour tracks the currency's class. */
export function currencyIcon(currency: CurrencyDef, size = 22): SVGSVGElement {
  const node = svg(size);
  const colour = CLASS_COLOURS[currency.class] ?? 'var(--dust)';
  const sides = currency.class === 'exotic' ? 8 : currency.class === 'rare' ? 6 : 5;

  shape(node, 'polygon', {
    points: polygon(16, 16, 10, sides),
    fill: colour,
    stroke: 'var(--void)',
    'stroke-width': 1.5,
    'stroke-linejoin': 'round',
  });
  shape(node, 'circle', { cx: 13, cy: 12.5, r: 2.4, fill: 'var(--chalk)', opacity: 0.6 });
  return node;
}

/** Whatever this item is, give me something to put next to its name. */
export function itemIcon(item: Item, size = 26): SVGSVGElement {
  if (item.kind === 'crystal') {
    return crystalIcon((item.meta.tier as number) ?? 1, size);
  }
  return gearIcon(item.base, size);
}
