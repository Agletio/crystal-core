/**
 * The camera over a web: scroll to zoom, drag to move. One implementation,
 * because the skills web and the trade web ask exactly the same question and
 * two copies of a camera is one copy that is wrong.
 *
 * TWO THINGS HERE ARE LOAD-BEARING and were learnt the hard way.
 *
 * The web is BUILT ONCE at `BUILD` pixels per unit and never rebuilt to move:
 * tearing down and re-creating six hundred elements per wheel tick is what made
 * a web of pixel art stutter. And the camera is a CSS transform on the SVG
 * ELEMENT, which the compositor moves without re-rastering — as the view
 * group's own `transform` attribute, the obvious way, every element re-rasters
 * per frame: 50ms against 17.
 */
import { hideTooltip } from './tooltip';

/** Pixels per web unit the art is BUILT at; node radii are written to match. */
export const BUILD = 46;

export interface CameraSpec {
  /** The `<svg>` that moves, and the box it moves inside. */
  svg: string;
  wrap: string;
  home: number; // pixels per unit on opening; NOT fit — that is a grey smear
  zoom: { min: number; max: number; step: number };
  moved?: () => void; // whenever the view moves, for anything anchored to it
}

const $ = (id: string) => document.getElementById(id)!;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

export class Camera {
  scale: number;
  panX = 0;
  panY = 0;
  /** Set while a drag is running, so the drag does not also count as a click. */
  dragged = false;
  origin = 0; // half the built canvas: a web about 0,0, shifted into the middle

  constructor(private readonly spec: CameraSpec) {
    this.scale = spec.home;
  }

  /** Off the WRAP, never the web — the web is a canvas moving under it. Falls
   *  back to a nominal size where the element reports none, which is every
   *  headless environment: without it "the tree renders" is unverifiable. */
  box(): { width: number; height: number } {
    const host = $(this.spec.wrap);
    return host.clientWidth > 0 && host.clientHeight > 0
      ? { width: host.clientWidth, height: host.clientHeight }
      : { width: 760, height: 430 };
  }

  home(): void {
    this.scale = this.spec.home;
    this.panX = 0;
    this.panY = 0;
  }

  /** Frames the web off its actual EXTENTS, centred on the middle of those
   *  rather than on 0,0 and a radius: arms that reach further one way than
   *  another are not a circle, and treating them as one clips the far side. */
  fit(nodes: { x: number; y: number }[], margin = 0.9): void {
    if (nodes.length === 0) return;
    const box = this.box();
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    // The middle counts: every web hangs off it, node there or not.
    const lo = { x: Math.min(0, ...xs) - margin, y: Math.min(0, ...ys) - margin };
    const hi = { x: Math.max(0, ...xs) + margin, y: Math.max(0, ...ys) + margin };

    this.panX = (lo.x + hi.x) / 2;
    this.panY = (lo.y + hi.y) / 2;
    this.scale = clamp(
      Math.min(box.width / (hi.x - lo.x), box.height / (hi.y - lo.y)),
      this.spec.zoom.min,
      this.spec.zoom.max
    );
  }

  /** Web coordinates → pixels inside the current viewport. */
  project(x: number, y: number): { x: number; y: number } {
    const box = this.box();
    return {
      x: box.width / 2 + (x - this.panX) * this.scale,
      y: box.height / 2 + (y - this.panY) * this.scale,
    };
  }

  /** Web coordinates → the built web's own space, which no camera touches. */
  place(x: number, y: number): { x: number; y: number } {
    return { x: x * BUILD + this.origin, y: y * BUILD + this.origin };
  }

  apply(): void {
    const box = this.box();
    const k = this.scale / BUILD;
    const tx = box.width / 2 - this.panX * this.scale - this.origin * k;
    const ty = box.height / 2 - this.panY * this.scale - this.origin * k;
    $(this.spec.svg).style.transform =
      `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${k.toFixed(4)})`;
  }

  /** Wheel and drag, wired once from a screen's `init`. */
  attach(): void {
    const svg = $(this.spec.svg);
    const { zoom } = this.spec;

    // Zoom about the POINTER, not the middle: the web coordinate under the
    // cursor is held still, which is the whole difference between a map that
    // zooms and one that jumps.
    svg.addEventListener(
      'wheel',
      (event) => {
        const e = event as WheelEvent;
        e.preventDefault();
        const rect = svg.getBoundingClientRect();
        const px = e.clientX - rect.left - rect.width / 2;
        const py = e.clientY - rect.top - rect.height / 2;

        const before = { x: this.panX + px / this.scale, y: this.panY + py / this.scale };
        this.scale = clamp(
          e.deltaY < 0 ? this.scale * zoom.step : this.scale / zoom.step,
          zoom.min,
          zoom.max
        );
        this.panX = before.x - px / this.scale;
        this.panY = before.y - py / this.scale;
        hideTooltip();
        this.spec.moved?.();
        this.apply();
      },
      { passive: false }
    );

    let from: { x: number; y: number } | null = null;
    // Captured once a DRAG starts, NEVER on the press: a captured pointer
    // sends its `pointerup` to the capturing element and the click lands on
    // the map, so capturing early means no click ever reaches a node again.
    let held: number | null = null;
    svg.addEventListener('pointerdown', (event) => {
      from = { x: (event as PointerEvent).clientX, y: (event as PointerEvent).clientY };
      this.dragged = false;
    });
    svg.addEventListener('pointermove', (event) => {
      if (!from) return;
      const e = event as PointerEvent;
      const dx = e.clientX - from.x;
      const dy = e.clientY - from.y;
      // A few pixels of slop, so a click with a shaky hand is still a click.
      if (!this.dragged && Math.hypot(dx, dy) < 4) return;
      if (!this.dragged) {
        svg.classList.add('web--drag');
        (svg as unknown as Element).setPointerCapture?.(e.pointerId);
        held = e.pointerId;
      }
      this.dragged = true;
      this.panX -= dx / this.scale;
      this.panY -= dy / this.scale;
      from = { x: e.clientX, y: e.clientY };
      hideTooltip();
      this.spec.moved?.();
      this.apply();
    });

    const release = () => {
      from = null;
      if (held !== null) (svg as unknown as Element).releasePointerCapture?.(held);
      held = null;
      svg.classList.remove('web--drag');
      // Cleared on the NEXT frame: the click that ends a drag has not fired
      // yet, and it is the one that must be ignored.
      requestAnimationFrame(() => {
        this.dragged = false;
      });
    };
    svg.addEventListener('pointerup', release);
    svg.addEventListener('pointercancel', release);
    svg.addEventListener('pointerleave', release);
  }
}
