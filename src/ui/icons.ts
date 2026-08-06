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

  // Grows on three axes at once — size, facet count, and elongation — so two
  // adjacent tiers differ in silhouette and not only in colour. Colour alone
  // was doing nearly all the work, which fails the moment two crystals are
  // not side by side.
  //
  // The growth is deliberately gentle. A steeper ramp made a T6 fill the
  // whole 32-unit box, which left no room for the halo or the shards — so
  // the top of the ladder, the part that should look the most special, was
  // the part that turned into a coloured blob.
  const radius = 6.0 + t * 0.95;
  const sides = 3 + Math.min(5, t);
  const squash = 1.2 - t * 0.035;

  // A halo from mid tiers, brighter as it climbs, so the ladder is visible
  // across a full dock rather than only when comparing two.
  if (t >= 3) {
    shape(node, 'polygon', {
      points: polygon(16, 17, radius + 2, sides, squash),
      fill: colour,
      opacity: 0.1 + t * 0.025,
    });
  }

  shaded(node, `M${polygon(16, 17, radius, sides, squash).split(' ').join(' L')} Z`, colour);

  // A lit core, sharpening as the tier climbs. The shrinking fraction against
  // a growing radius holds it at roughly one absolute size while the stone
  // around it gets bigger, which is what reads as the stone getting denser
  // rather than merely larger.
  shape(node, 'polygon', {
    points: polygon(16, 16, radius * (0.52 - t * 0.035), sides, 1),
    fill: 'var(--chalk)',
    opacity: 0.32 + t * 0.06,
  });

  // Cleavage line — one hard edge catching the light, which is what makes a
  // faceted stone read as cut rather than moulded.
  shape(node, 'path', {
    d: `M16 ${17 - radius * squash} L${16 - radius * 0.5} ${17 + radius * 0.35}`,
    stroke: 'var(--chalk)',
    'stroke-width': 1.1,
    opacity: 0.45,
    fill: 'none',
  });

  // Floating shards for the top tiers, parked in the corners — the only part
  // of the box the halo never reaches, so they stay legible instead of
  // dissolving into it.
  if (t >= 5) {
    shape(node, 'polygon', { points: polygon(4.5, 5.5, 2.4, 3), fill: colour });
    shape(node, 'polygon', { points: polygon(27.5, 6.5, 2.1, 3), fill: colour });
  }
  if (t >= 6) {
    shape(node, 'polygon', { points: polygon(27, 27.5, 2.3, 3), fill: colour });
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

/**
 * Shading, applied to any silhouette.
 *
 * Every icon used to be a flat fill with one dot on it, which read as a
 * sticker rather than an object. Clipping a pale wedge and a dark wedge to
 * the shape gives it a light source — top-left — without anyone drawing two
 * more shapes per icon by hand. It is the same three tones everywhere, so a
 * set drawn months apart still looks like a set.
 */
let clipSeq = 0;
function shaded(node: SVGSVGElement, d: string, colour: string): void {
  const id = `cc-clip-${++clipSeq}`;
  const defs = document.createElementNS(NS, 'defs');
  const clip = document.createElementNS(NS, 'clipPath');
  clip.setAttribute('id', id);
  const mask = document.createElementNS(NS, 'path');
  mask.setAttribute('d', d);
  clip.append(mask);
  defs.append(clip);
  node.append(defs);

  shape(node, 'path', {
    d,
    fill: colour,
    stroke: 'var(--void)',
    'stroke-width': 1.6,
    'stroke-linejoin': 'round',
  });
  // Lit from the top-left, shadowed opposite. Clipped, so the wedges never
  // escape the silhouette and each icon keeps its own outline.
  shape(node, 'polygon', {
    points: '0,0 32,0 0,32',
    fill: 'var(--chalk)',
    opacity: 0.28,
    'clip-path': `url(#${id})`,
  });
  shape(node, 'polygon', {
    points: '32,32 32,6 6,32',
    fill: 'var(--void)',
    opacity: 0.3,
    'clip-path': `url(#${id})`,
  });
}

const CLASS_COLOURS: Record<string, string> = {
  basic: 'var(--dust)',
  uncommon: 'var(--verdite)',
  rare: 'var(--quartz)',
  exotic: 'var(--citrine)',
};

/**
 * Silhouette per currency, colour per class.
 *
 * These were one polygon with a side count driven by class, which meant all
 * five basic shards were the SAME shape in the SAME colour — the icon said
 * "a currency" and nothing else, so the dock was thirteen identical pebbles.
 *
 * Each shape now says what the thing DOES, because that is what you are
 * choosing between: a spike that grows for the one that adds, a cleft one for
 * the one that removes, a ring for a re-roll, a burst for the one that fills
 * everything at once. Class still drives colour, so rarity stays learnable at
 * a glance while function is learnable up close.
 */
const CURRENCY_SHAPES: Record<string, string> = {
  // Fills ONE empty slot — a single shard rising.
  shard_of_making: 'M16 3 L22 14 L19 27 L13 27 L10 14 Z',
  // Removes one — the same shard with a chunk taken out of its edge. The
  // second subpath winds the other way, which is what makes it a hole rather
  // than a second blob sitting on top.
  shard_of_unmaking: 'M16 3 L22 14 L19 27 L13 27 L10 14 Z M22 14 L15 17 L19 27 Z',
  // Re-rolls values — a ring, the shape of something going round again.
  shard_of_change:
    'M16 4 A12 12 0 1 1 15.9 4 Z M16 11 A5 5 0 1 0 16.1 11 Z',
  // Fills EVERY empty slot — one centre throwing out in all directions.
  shard_of_awakening:
    'M16 2 L19 12 L29 15 L19 18 L16 29 L13 18 L3 15 L13 12 Z',
  // Re-rolls everything — the burst, knocked off its axis.
  shard_of_chaos:
    'M16 2 L21 11 L30 11 L23 17 L27 27 L16 22 L7 28 L10 17 L2 12 L12 11 Z',
  // Guaranteed Density — a cluster, because density is a count of bodies.
  essence_of_the_swarm:
    'M11 8 A4 4 0 1 1 10.9 8 Z M22 11 A4 4 0 1 1 21.9 11 Z M15 21 A5 5 0 1 1 14.9 21 Z',
  // Guaranteed Reward — a stack of coins seen edge-on. One continuous
  // outline: over the top rim, down the side, back under the bottom. Two
  // overlapping subpaths punched a hole through the middle of it instead.
  essence_of_greed: 'M5 12 A11 4.5 0 0 1 27 12 L27 20 A11 4.5 0 0 1 5 20 Z',
  // Guaranteed Damage — the stone you sharpen on.
  whetstone_of_might: 'M7 20 L20 5 L26 10 L13 25 Z',
  // Guaranteed Speed — a drop leaning into its own motion. The speed lines
  // that used to trail it were open subpaths inside a FILLED path, so they
  // rendered as slabs; the lean carries the same idea and closes cleanly.
  oil_of_swiftness: 'M26 3 Q15 12 11 16 A8.5 8.5 0 1 0 22 25 Q26 15 26 3 Z',
  // Upgrades a tier — a chevron pointing up the ladder.
  sigil_of_refinement: 'M16 3 L27 14 L21 14 L21 27 L11 27 L11 14 L5 14 Z',
  // A slot beyond the limit — a hexagon with one facet outside it.
  sigil_of_excess:
    'M16 5 L25 10 L25 21 L16 26 L7 21 L7 10 Z M24 3 L29 6 L29 11 L24 8 Z',
  // Everything ±25% at random — a shape split down the middle.
  sigil_of_finality: 'M16 3 A13 13 0 1 1 15.9 3 Z M16 6 L16 26 L24 21 L24 11 Z',
  // Strips everything — a shard that has already come apart.
  shard_of_ruin:
    'M9 4 L15 14 L11 28 L5 16 Z M19 3 L27 13 L22 28 L15 15 Z',
  // Feedstock. Deliberately the plainest thing in the set.
  fragment: 'M16 7 L23 13 L20 24 L12 24 L9 13 Z',
};

export function currencyIcon(currency: CurrencyDef, size = 22): SVGSVGElement {
  const node = svg(size);
  const colour = CLASS_COLOURS[currency.class] ?? 'var(--dust)';
  const d =
    CURRENCY_SHAPES[currency.id] ??
    // An unknown currency still gets a shape rather than nothing, so adding
    // one to the table is a visual to-do rather than an invisible bug.
    `M${polygon(16, 16, 11, 5).split(' ').join(' L').replace('L', '')} Z`;
  shaded(node, d, colour);
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
      // Strike: a mace. The old blade-and-arc read as a pickaxe.
      shape(node, 'path', {
        d: 'M9 28 L20 17',
        stroke: 'var(--dust)',
        'stroke-width': 3.2,
        'stroke-linecap': 'round',
      });
      shape(node, 'path', {
        d: 'M17 13 L24 6 L28 10 L21 17 Z',
        fill: 'var(--quartz)',
        ...outline,
      });
      // Flanges, so it reads as blunt rather than bladed.
      shape(node, 'path', {
        d: 'M15 10 L20 4 L24 6 M22 19 L28 14 L26 10',
        fill: 'none',
        stroke: 'var(--quartz)',
        'stroke-width': 3,
        'stroke-linejoin': 'round',
      });
      shape(node, 'path', {
        d: 'M8 22 A16 16 0 0 1 22 26',
        fill: 'none',
        stroke: 'var(--chalk)',
        'stroke-width': 2.2,
        'stroke-linecap': 'round',
        opacity: 0.55,
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
