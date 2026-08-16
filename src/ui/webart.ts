/**
 * A stud on a web, as pixel art.
 *
 * A shape is rasterised once onto an odd-sided grid and emitted as one path of
 * whole cells, so whatever the zoom the silhouette is the same handful of
 * steps — pixel art rather than vector art that happens to be small. Shared by
 * the skill web and the trade web: two of these would be two looks.
 */

const NS = 'http://www.w3.org/2000/svg';

export function svgEl(tag: string, attrs: Record<string, string | number>): SVGElement {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

/** One horizontal run of lit cells. */
interface Span { y: number; lo: number; hi: number }

const GRIDS = new Map<string, Span[]>();

function raster(key: string, n: number, halfWidth: (row: number) => number): Span[] {
  const hit = GRIDS.get(key);
  if (hit) return hit;
  const centre = (n - 1) / 2;
  const out: Span[] = [];
  for (let y = 0; y < n; y++) {
    const w = halfWidth(y - centre);
    if (w < 0) continue;
    out.push({ y, lo: Math.round(centre - w), hi: Math.round(centre + w) });
  }
  GRIDS.set(key, out);
  return out;
}

export const disc = (n: number): Span[] =>
  raster(`d${n}`, n, (dy) => {
    const r = n / 2;
    const w = Math.sqrt(Math.max(0, r * r - dy * dy)) - 0.5;
    return w < 0 ? -1 : w;
  });

/** A pointed diamond: the cut stone a notable is bound with. */
export const lozenge = (n: number): Span[] =>
  raster(`l${n}`, n, (dy) => {
    const w = ((n - 1) / 2 - Math.abs(dy)) * 0.98 - 0.1;
    return w < 0 ? -1 : w;
  });

/** The whole grid: stamped under a disc its corners are four diagonal points. */
const square = (n: number): Span[] => raster(`s${n}`, n, () => (n - 1) / 2 - 0.1);

/** Spans → one path, in whole cells, centred on a point and sized to a radius.
 *  Three decimals because a trade web's units are TILES rather than pixels: at
 *  one, a stud a fifth of a unit across rounds away to nothing. */
function stamp(spans: Span[], n: number, cx: number, cy: number, r: number): string {
  const cell = (2 * r) / n;
  const x0 = cx - r;
  const y0 = cy - r;
  let d = '';
  for (const s of spans) {
    const x = x0 + s.lo * cell;
    const y = y0 + s.y * cell;
    const w = (s.hi - s.lo + 1) * cell;
    d += `M${x.toFixed(3)} ${y.toFixed(3)}h${w.toFixed(3)}v${cell.toFixed(3)}h${(-w).toFixed(3)}z`;
  }
  return d;
}

/** The upper-left corner of a shape, which is where the light comes from. */
function shine(spans: Span[], n: number): Span[] {
  const out: Span[] = [];
  for (const s of spans) {
    if (s.y < 1 || s.y > n * 0.42) continue;
    const wide = Math.max(0, Math.round((s.hi - s.lo) * 0.42));
    out.push({ y: s.y, lo: s.lo + 1, hi: s.lo + 1 + wide });
  }
  return out;
}

/** A stud: dark casing, stone, highlight. Returns the three paths in order. */
export function stud(
  spans: Span[],
  n: number,
  pos: { x: number; y: number },
  r: number,
  prefix: string
): SVGElement[] {
  const cell = (2 * r) / n;
  return [
    svgEl('path', { class: `${prefix}__rim`, d: stamp(spans, n, pos.x, pos.y, r + cell) }),
    svgEl('path', { class: `${prefix}__body`, d: stamp(spans, n, pos.x, pos.y, r) }),
    svgEl('path', { class: `${prefix}__lit`, d: stamp(shine(spans, n), n, pos.x, pos.y, r) }),
  ];
}

/**
 * The CENTRE of a web: a mounted boss rather than a bigger stud. Two metal
 * layers under a ringed stone — a diamond and the grid's own corners — make
 * an eight-pointed setting, and the caller lays its icon over the stone.
 */
export function mount(pos: { x: number; y: number }, r: number, prefix: string): SVGElement[] {
  const n = 21;
  const d = disc(n);
  return [
    svgEl('path', { class: `${prefix}__prong`, d: stamp(lozenge(n), n, pos.x, pos.y, r * 1.55) }),
    svgEl('path', { class: `${prefix}__prong`, d: stamp(square(n), n, pos.x, pos.y, r * 1.08) }),
    svgEl('path', { class: `${prefix}__rim`, d: stamp(d, n, pos.x, pos.y, r * 1.12) }),
    svgEl('path', { class: `${prefix}__body`, d: stamp(d, n, pos.x, pos.y, r * 0.94) }),
    // A glint toward the lamp rather than shine()'s wedge, which at hub size
    // reads as a slice cut out of the stone.
    svgEl('path', {
      class: `${prefix}__lit`,
      d: stamp(d, n, pos.x - r * 0.3, pos.y - r * 0.3, r * 0.22),
    }),
  ];
}
