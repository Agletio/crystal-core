/**
 * Hover tooltips, in place of native `title` — which the browser delays by about
 * a second and draws in the OS's colours. Appears on the first mouse-over,
 * follows the cursor, and flips near the edges.
 */
const $ = (id: string) => document.getElementById(id)!;

const OFFSET = 14;

let host: HTMLElement | null = null;

function element(): HTMLElement {
  if (!host) host = $('tooltip');
  return host;
}

function place(x: number, y: number): void {
  const tip = element();
  const box = tip.getBoundingClientRect();

  // Flip rather than clamp: a tooltip pinned to the edge covers the thing you
  // were pointing at.
  const left =
    x + OFFSET + box.width > globalThis.innerWidth ? x - OFFSET - box.width : x + OFFSET;
  const top =
    y + OFFSET + box.height > globalThis.innerHeight ? y - OFFSET - box.height : y + OFFSET;

  tip.style.left = `${Math.max(4, left)}px`;
  tip.style.top = `${Math.max(4, top)}px`;
}

export function showTooltip(text: string, x: number, y: number): void {
  const tip = element();
  tip.textContent = text;
  tip.hidden = false;
  place(x, y);
}

export function hideTooltip(): void {
  element().hidden = true;
}

/** `text` is a function so the content is read at hover time, never captured. */
export function attachTooltip(target: Element, text: () => string): void {
  const show = (event: Event) => {
    const mouse = event as MouseEvent;
    const rect = target.getBoundingClientRect();
    const x = mouse.clientX || rect.left + rect.width / 2;
    const y = mouse.clientY || rect.bottom;
    showTooltip(text(), x, y);
  };

  target.addEventListener('mouseenter', show);
  target.addEventListener('mousemove', show);
  target.addEventListener('focus', show);
  target.addEventListener('mouseleave', hideTooltip);
  target.addEventListener('blur', hideTooltip);
}
