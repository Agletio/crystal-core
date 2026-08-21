/**
 * A node's frame on a web: GENERATED art first, raster shapes as the fallback.
 *
 * `WEB_ART` holds the generated frames and chain segment as data URIs, drawn
 * as SVG <image> so one PNG serves every zoom — the webs' units differ by two
 * orders of magnitude and an <image> does not care. Where a piece is missing
 * the drawn shapes stand in: rasterised once onto an odd-sided grid, emitted
 * as one path of whole cells. Shared by the skill web and the trade web: two
 * of these would be two looks.
 */
import { WEB_ART } from '../render/generated-web';

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

/** A pointed diamond: the ornament's compass points. */
export const lozenge = (n: number): Span[] =>
  raster(`l${n}`, n, (dy) => {
    const w = ((n - 1) / 2 - Math.abs(dy)) * 0.98 - 0.1;
    return w < 0 ? -1 : w;
  });

/** A slim diamond: the same points drawn as ornament rather than as a slab. */
const spike = (n: number): Span[] =>
  raster(`k${n}`, n, (dy) => {
    const w = ((n - 1) / 2 - Math.abs(dy)) * 0.45 - 0.1;
    return w < 0 ? -1 : w;
  });

/** The whole grid: stamped under a disc its corners are four diagonal points. */
const square = (n: number): Span[] => raster(`s${n}`, n, () => (n - 1) / 2 - 0.1);

/** An annulus, two spans a row: the ring every frame is built on. */
function ring(n: number, t: number): Span[] {
  const key = `r${n}:${t}`;
  const hit = GRIDS.get(key);
  if (hit) return hit;
  const centre = (n - 1) / 2;
  const rOut = n / 2;
  const rIn = n / 2 - t;
  const out: Span[] = [];
  for (let y = 0; y < n; y++) {
    const dy = y - centre;
    const wOut = Math.sqrt(Math.max(0, rOut * rOut - dy * dy)) - 0.5;
    if (wOut < 0) continue;
    const lo = Math.round(centre - wOut);
    const hi = Math.round(centre + wOut);
    const wIn = Math.sqrt(Math.max(0, rIn * rIn - dy * dy)) - 0.5;
    if (wIn < 1) {
      out.push({ y, lo, hi });
      continue;
    }
    out.push({ y, lo, hi: Math.round(centre - wIn) - 1 });
    out.push({ y, lo: Math.round(centre + wIn) + 1, hi });
  }
  GRIDS.set(key, out);
  return out;
}

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

/**
 * A node's FRAME: a dark well under a metal ring, gold and ornamented for a
 * notable — points peeking from under the ring — and a plain band for a minor.
 * Which metal is the stylesheet's, off the group's own classes; the image
 * inside is the caller's.
 */
/** One generated picture, centred on a point and spanning `s` across. */
function art(id: string, cls: string, cx: number, cy: number, s: number): SVGElement | null {
  const piece = WEB_ART[id];
  if (!piece) return null;
  const h = (s * piece.h) / piece.w;
  return svgEl('image', {
    class: cls,
    href: piece.png,
    x: (cx - s / 2).toFixed(3),
    y: (cy - h / 2).toFixed(3),
    width: s.toFixed(3),
    height: h.toFixed(3),
    preserveAspectRatio: 'none',
  });
}

/** The STATE ring, on the node's own border. A glow filtered onto the picture
 *  takes the picture's silhouette, which is a different shape on every node and
 *  reads as art rather than as state; this is one circle at one radius, and the
 *  stylesheet colours it off the group's classes for all four webs at once. */
function halo(pos: { x: number; y: number }, r: number, prefix: string): SVGElement {
  return svgEl('circle', {
    class: `${prefix}__halo`,
    cx: pos.x.toFixed(3),
    cy: pos.y.toFixed(3),
    r: (r * 1.1).toFixed(3),
    'stroke-width': (r * 0.17).toFixed(3),
  });
}

export function frame(
  kind: 'minor' | 'notable',
  pos: { x: number; y: number },
  r: number,
  prefix: string
): SVGElement[] {
  const own = art(
    kind === 'notable' ? 'frame_notable' : 'frame_minor',
    `${prefix}__art`,
    pos.x,
    pos.y,
    r * 2.3
  );
  if (own) return [own, halo(pos, r, prefix)];
  const n = 17;
  const out: SVGElement[] = [];
  if (kind === 'notable') {
    // Slim points at the compass and the diagonals, peeking from under the
    // ring — ornament, not a slab behind it.
    out.push(
      svgEl('path', { class: `${prefix}__frame`, d: stamp(spike(n), n, pos.x, pos.y, r * 1.34) }),
      svgEl('path', { class: `${prefix}__frame`, d: stamp(square(n), n, pos.x, pos.y, r * 0.82) })
    );
  }
  out.push(
    svgEl('path', { class: `${prefix}__hole`, d: stamp(disc(n), n, pos.x, pos.y, r) }),
    svgEl('path', {
      class: `${prefix}__frame ${prefix}__ring`,
      d: stamp(ring(n, kind === 'notable' ? 2.4 : 2), n, pos.x, pos.y, r),
    }),
    halo(pos, r, prefix)
  );
  return out;
}

/**
 * The CENTRE of a web: a mounted boss rather than a bigger node. Two metal
 * layers under a ringed stone — a diamond and the grid's own corners — make
 * an eight-pointed setting, and the caller lays its icon over the stone.
 */
export function mount(pos: { x: number; y: number }, r: number, prefix: string): SVGElement[] {
  const own = art('frame_hub', `${prefix}__art`, pos.x, pos.y, r * 2.5);
  if (own) return [own];
  const n = 21;
  const d = disc(n);
  return [
    svgEl('path', { class: `${prefix}__prong`, d: stamp(lozenge(n), n, pos.x, pos.y, r * 1.55) }),
    svgEl('path', { class: `${prefix}__prong`, d: stamp(square(n), n, pos.x, pos.y, r * 1.08) }),
    svgEl('path', { class: `${prefix}__rim`, d: stamp(d, n, pos.x, pos.y, r * 1.12) }),
    svgEl('path', { class: `${prefix}__body`, d: stamp(d, n, pos.x, pos.y, r * 0.94) }),
    // A glint toward the lamp rather than a shine wedge, which at hub size
    // reads as a slice cut out of the stone.
    svgEl('path', {
      class: `${prefix}__lit`,
      d: stamp(d, n, pos.x - r * 0.3, pos.y - r * 0.3, r * 0.22),
    }),
  ];
}

/**
 * A CHAIN between two points. The generated segment is laid end to end along
 * the line as rotated <image>s; without it, oval links are drawn by hand,
 * every other one edge-on. `width` is the old stroke width, so both webs'
 * units work unchanged. The caller draws its dark casing first.
 */
export function chain(
  a: { x: number; y: number },
  b: { x: number; y: number },
  width: number,
  cls: string
): SVGElement[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-3) return [];
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const out: SVGElement[] = [];

  const piece = WEB_ART.chain;
  if (piece) {
    // Three links per segment; the run is divided evenly so no link is cut.
    const segLen = width * 5;
    const count = Math.max(1, Math.round(len / segLen));
    const step = len / count;
    const h = (step * piece.h) / piece.w;
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const cx = a.x + dx * t;
      const cy = a.y + dy * t;
      out.push(
        svgEl('image', {
          class: cls,
          href: piece.png,
          x: (cx - step / 2).toFixed(3),
          y: (cy - h / 2).toFixed(3),
          width: step.toFixed(3),
          height: h.toFixed(3),
          preserveAspectRatio: 'none',
          transform: `rotate(${angle.toFixed(1)} ${cx.toFixed(3)} ${cy.toFixed(3)})`,
        })
      );
    }
    return out;
  }

  const step = width * 2.1;
  const count = Math.max(1, Math.round(len / step));
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const cx = a.x + dx * t;
    const cy = a.y + dy * t;
    const flat = i % 2 === 1;
    out.push(
      svgEl('ellipse', {
        class: cls,
        cx: cx.toFixed(2),
        cy: cy.toFixed(2),
        rx: (step * 0.62).toFixed(2),
        ry: (width * (flat ? 0.28 : 0.75)).toFixed(2),
        'stroke-width': (width * 0.42).toFixed(2),
        transform: `rotate(${angle.toFixed(1)} ${cx.toFixed(2)} ${cy.toFixed(2)})`,
      })
    );
  }
  return out;
}
