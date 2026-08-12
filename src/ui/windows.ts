/**
 * Which window is on top, and dragging one somewhere else.
 *
 * A drag is a DELTA on top of the position CSS gave the card — `--wx` / `--wy`
 * — so a window nobody moved sits where the layout put it, and a default that
 * changes still reaches one that has been dragged. Stacking is by recency: the
 * last card you touched is on top and is what Escape answers. The registry
 * comes off the table of screens in `src/web.ts`, so a screen is still four
 * places rather than five.
 */

/** The band, `Z_BASE + position in the stack`. Above the HUD, under the rail. */
const Z_BASE = 20;

/** How much of a dragged card must stay on screen. Its head is 46px tall. */
const MARGIN = 48;

interface Win {
  layer: HTMLElement; // the `.modal`, or the dock itself — carries the z-index
  card: HTMLElement; // what moves: the `.modal__card`, or the dock itself
}

const wins = new Map<string, Win>();
const order: string[] = [];

function restack(): void {
  order.forEach((id, i) => {
    const win = wins.get(id);
    if (win) win.layer.style.zIndex = String(Z_BASE + i);
  });
}

/** Touching a window puts it on top. Opening one is touching it. */
export function raiseWindow(id: string): void {
  const at = order.indexOf(id);
  if (at < 0 || at === order.length - 1) return;
  order.splice(at, 1);
  order.push(id);
  restack();
}

const named = new Map<Node, string>();

/** Every screen sets `hidden` to open, and opening one is touching it. Records
 *  rather than a sweep of what is open, which cannot tell which of two opened
 *  first — and `takeRecords`, because the callback is delivered on a microtask
 *  and Escape is pressed on the spot. */
const watcher = new MutationObserver((records) => drain(records));
function drain(records = watcher.takeRecords()): void {
  for (const record of records) {
    const id = named.get(record.target);
    if (id && !(record.target as HTMLElement).hidden) raiseWindow(id);
  }
}

/** The most recently raised window that is open, or null when none is. */
export function topWindow(): string | null {
  drain();
  for (let i = order.length - 1; i >= 0; i--) {
    if (!wins.get(order[i])?.layer.hidden) return order[i];
  }
  return null;
}

/** How far a card has been dragged from where the layout put it. */
export function windowOffset(card: HTMLElement): { x: number; y: number } {
  return {
    x: Number.parseFloat(card.style.getPropertyValue('--wx')) || 0,
    y: Number.parseFloat(card.style.getPropertyValue('--wy')) || 0,
  };
}

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

/** The home corner is read back out of the live box rather than remembered: a
 *  card grows with its contents, so a remembered one is wrong the first time
 *  the bench fills. */
function settle(card: HTMLElement, wantX: number, wantY: number): void {
  const off = windowOffset(card);
  const box = card.getBoundingClientRect();
  const homeX = box.left - off.x;
  const homeY = box.top - off.y;
  const x = clamp(wantX, MARGIN - homeX - box.width, globalThis.innerWidth - MARGIN - homeX);
  // Never above the top edge: a head dragged off the screen cannot be grabbed
  // back, and there is nothing else on a window that moves it.
  const y = clamp(wantY, -homeY, globalThis.innerHeight - MARGIN - homeY);
  card.style.setProperty('--wx', `${Math.round(x)}px`);
  card.style.setProperty('--wy', `${Math.round(y)}px`);
  card.classList.toggle('win--moved', Math.round(x) !== 0 || Math.round(y) !== 0);
}

function dragBy(head: HTMLElement, card: HTMLElement): void {
  head.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    // A control on the head is a control, not a handle.
    if ((event.target as HTMLElement).closest('button, input, a, select')) return;
    const off = windowOffset(card);
    const fromX = event.clientX;
    const fromY = event.clientY;
    event.preventDefault(); // or the title selects itself under the drag

    const move = (moved: PointerEvent) =>
      settle(card, off.x + moved.clientX - fromX, off.y + moved.clientY - fromY);
    const done = () => {
      globalThis.removeEventListener('pointermove', move);
      globalThis.removeEventListener('pointerup', done);
      globalThis.removeEventListener('pointercancel', done);
      document.body.classList.remove('windowdrag');
    };
    globalThis.addEventListener('pointermove', move);
    globalThis.addEventListener('pointerup', done);
    globalThis.addEventListener('pointercancel', done);
    document.body.classList.add('windowdrag');
  });
  head.addEventListener('dblclick', () => settle(card, 0, 0)); // the way back
}

function register(id: string, elId: string): void {
  const layer = document.getElementById(elId);
  if (!layer) return;
  const card = layer.querySelector<HTMLElement>('.modal__card') ?? layer;
  wins.set(id, { layer, card });
  named.set(layer, id);
  order.push(id);

  watcher.observe(layer, { attributes: true, attributeFilter: ['hidden'] });
  // Capture, so a handler that stops the event still raises the card it is on.
  card.addEventListener('pointerdown', () => raiseWindow(id), true);

  const head = card.querySelector<HTMLElement>('.modal__head, .dock__head');
  if (head) dragBy(head, card);
}

/** Screen id → the element that IS the window. */
export function initWindows(where: Record<string, string>): void {
  for (const [id, elId] of Object.entries(where)) register(id, elId);
  restack();
  // A window against an edge is off the screen after a shrink, and its head is
  // the only part of it that can be dragged back.
  globalThis.addEventListener('resize', () => {
    for (const win of wins.values()) {
      if (win.layer.hidden || !win.card.classList.contains('win--moved')) continue;
      const off = windowOffset(win.card);
      settle(win.card, off.x, off.y);
    }
  });
}
