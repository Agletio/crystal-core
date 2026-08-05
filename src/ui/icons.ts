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

/**
 * One silhouette per slot. Deliberately generic — the job is telling a helm
 * from a boot at a glance, not looking good.
 */
export function gearIcon(art: string, size = 26): SVGSVGElement {
  const node = svg(size);
  const steel = 'var(--quartz)';
  const outline = { stroke: 'var(--void)', 'stroke-width': 1.5, 'stroke-linejoin': 'round' };

  switch (art) {
    case 'weapon':
      shape(node, 'path', {
        d: 'M16 3 L19 9 L19 20 L13 20 L13 9 Z',
        fill: steel,
        ...outline,
      });
      shape(node, 'rect', { x: 9, y: 20, width: 14, height: 3, fill: 'var(--dust)', ...outline });
      shape(node, 'rect', { x: 15, y: 23, width: 2, height: 6, fill: 'var(--dust)' });
      break;

    case 'helmet':
      shape(node, 'path', {
        d: 'M8 20 Q8 7 16 7 Q24 7 24 20 L20 20 L20 14 L12 14 L12 20 Z',
        fill: steel,
        ...outline,
      });
      break;

    case 'gloves':
      shape(node, 'path', {
        d: 'M11 12 L11 8 L14 8 L14 12 L18 12 L18 7 L21 7 L21 18 Q16 25 11 18 Z',
        fill: steel,
        ...outline,
      });
      break;

    case 'boots':
      shape(node, 'path', {
        d: 'M12 6 L18 6 L18 18 L25 21 L25 26 L12 26 Z',
        fill: steel,
        ...outline,
      });
      break;

    case 'amulet':
      shape(node, 'path', {
        d: 'M9 8 Q16 16 23 8',
        fill: 'none',
        stroke: 'var(--dust)',
        'stroke-width': 2,
      });
      shape(node, 'polygon', {
        points: polygon(16, 19, 6, 6),
        fill: 'var(--citrine)',
        ...outline,
      });
      break;

    case 'ring':
      shape(node, 'circle', {
        cx: 16,
        cy: 18,
        r: 8,
        fill: 'none',
        stroke: steel,
        'stroke-width': 3.5,
      });
      shape(node, 'polygon', {
        points: polygon(16, 7, 4, 4),
        fill: 'var(--citrine)',
        stroke: 'var(--void)',
        'stroke-width': 1.2,
      });
      break;

    default:
      // Body armour: a plate with shoulders.
      shape(node, 'path', {
        d: 'M10 8 L16 6 L22 8 L23 18 Q16 27 9 18 Z',
        fill: steel,
        ...outline,
      });
      shape(node, 'path', {
        d: 'M16 8 L16 22',
        stroke: 'var(--void)',
        'stroke-width': 1.2,
        opacity: 0.55,
      });
  }
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

/**
 * Skill icons, for the middle of a tree.
 *
 * A word in a circle told you nothing you didn't already know from the list
 * you clicked. Same placeholder rules as everything else: a shape that reads
 * at a glance, swappable for real art one function later.
 */
export function skillIcon(skillId: string, size = 44): SVGSVGElement {
  const node = svg(size);
  const outline = { stroke: 'var(--void)', 'stroke-width': 1.5, 'stroke-linejoin': 'round' };

  switch (skillId) {
    case 'bolt': {
      // A fireball: hot core, trailing flame.
      shape(node, 'path', {
        d: 'M16 3 Q22 11 22 16 Q22 25 16 29 Q10 25 10 16 Q10 11 16 3 Z',
        fill: 'var(--ember)',
        ...outline,
      });
      shape(node, 'path', {
        d: 'M16 12 Q19 17 19 20 Q19 24 16 26 Q13 24 13 20 Q13 17 16 12 Z',
        fill: 'var(--citrine)',
      });
      break;
    }

    case 'blight': {
      // A dripping droplet, with a smaller one falling.
      shape(node, 'path', {
        d: 'M16 4 Q24 14 24 19 A8 8 0 0 1 8 19 Q8 14 16 4 Z',
        fill: 'var(--verdite)',
        ...outline,
      });
      shape(node, 'circle', { cx: 13, cy: 17, r: 2.6, fill: 'var(--chalk)', opacity: 0.5 });
      shape(node, 'path', {
        d: 'M16 27 Q18 29.5 18 30.5 A2 2 0 0 1 14 30.5 Q14 29.5 16 27 Z',
        fill: 'var(--verdite)',
      });
      break;
    }

    default: {
      // Strike: a blade and the arc it sweeps.
      shape(node, 'path', {
        d: 'M7 26 L20 7 L23 9 L11 28 Z',
        fill: 'var(--quartz)',
        ...outline,
      });
      shape(node, 'path', {
        d: 'M9 8 A15 15 0 0 1 26 20',
        fill: 'none',
        stroke: 'var(--chalk)',
        'stroke-width': 2.4,
        'stroke-linecap': 'round',
        opacity: 0.8,
      });
    }
  }
  return node;
}

/** Whatever this item is, give me something to put next to its name. */
export function itemIcon(item: Item, size = 26): SVGSVGElement {
  if (item.kind === 'crystal') {
    return crystalIcon((item.meta.tier as number) ?? 1, size);
  }
  return gearIcon((item.meta.art as string) ?? 'body', size);
}
