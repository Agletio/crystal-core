/**
 * A line that says what just happened, and the one button that takes it back.
 *
 * Equipping is a single click that changes what you are wearing, so it has to
 * be visible and it has to be reversible. Undo rather than a question first:
 * the question would land on every deliberate equip to catch the rare one that
 * was not, and this lands only on the one that was not.
 */
const $ = (id: string) => document.getElementById(id)!;

/** Long enough to read a line and reach for it, short enough to stop nagging. */
const LIFE_MS = 7000;

export interface ToastAction {
  label: string;
  run: () => void;
}

let timer: ReturnType<typeof setTimeout> | null = null;

export function dismissToast(): void {
  if (timer) globalThis.clearTimeout(timer);
  timer = null;
  const host = $('toast');
  host.hidden = true;
  host.replaceChildren();
}

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** One at a time: a second equip replaces the first rather than stacking. */
export function toast(text: string, action?: ToastAction): void {
  dismissToast();
  const host = $('toast');
  host.append(el('span', 'toast__text', text));

  if (action) {
    const btn = el('button', 'toast__do', action.label) as HTMLButtonElement;
    btn.onclick = () => {
      dismissToast();
      action.run();
    };
    host.append(btn);
  }

  const close = el('button', 'toast__x', '×') as HTMLButtonElement;
  close.setAttribute('aria-label', 'dismiss');
  close.onclick = dismissToast;
  host.append(close);

  host.hidden = false;
  timer = globalThis.setTimeout(dismissToast, LIFE_MS);
}
