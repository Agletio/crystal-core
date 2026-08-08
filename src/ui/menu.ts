/**
 * The item menu: every action a carried item has, in one list.
 *
 * The dock's click means ONE thing, decided by the screen you are on, so gear
 * is dead at the Fissure and means "bench" at the crafting window. The rest of
 * an item's actions live here, and no screen gives up the click it teaches.
 *
 * A menu rather than buttons in the tooltip: the tooltip is hover-driven, so a
 * button inside it needs the gap bridged without dismissing it, and touch has
 * no hover to drive it at all.
 */
const $ = (id: string) => document.getElementById(id)!;

const OFFSET = 6;

export interface ItemAction {
  label: string;
  run: () => void;
  /** Shown greyed with this reason instead of being clickable. */
  blocked?: string;
  /** Never the plain click: moving an item out of the bag must be asked for. */
  menuOnly?: boolean;
}

let host: HTMLElement | null = null;
let onClose: (() => void) | null = null;

const element = (): HTMLElement => (host ??= $('itemmenu'));

export function isMenuOpen(): boolean {
  return !element().hidden;
}

export function closeMenu(): void {
  const node = element();
  if (node.hidden) return;
  node.hidden = true;
  node.replaceChildren();
  const after = onClose;
  onClose = null;
  after?.();
}

function place(x: number, y: number): void {
  const node = element();
  const box = node.getBoundingClientRect();
  // Flip rather than clamp, the way the tooltip does: a menu pinned to the
  // edge covers the slot you opened it from.
  const left = x + box.width + OFFSET > globalThis.innerWidth ? x - box.width - OFFSET : x + OFFSET;
  const top = y + box.height + OFFSET > globalThis.innerHeight ? y - box.height - OFFSET : y + OFFSET;
  node.style.left = `${Math.max(4, left)}px`;
  node.style.top = `${Math.max(4, top)}px`;
}

/** Opens at a point. Everything that dismisses it is wired once, in initMenu. */
export function openMenu(
  x: number,
  y: number,
  title: string,
  actions: ItemAction[],
  closed?: () => void
): void {
  const node = element();
  node.replaceChildren();
  onClose = closed ?? null;

  const head = document.createElement('div');
  head.className = 'itemmenu__head';
  head.textContent = title;
  node.append(head);

  for (const action of actions) {
    const btn = document.createElement('button');
    btn.className = 'itemmenu__item';
    btn.textContent = action.label;
    if (action.blocked) {
      btn.disabled = true;
      btn.classList.add('itemmenu__item--off');
      const why = document.createElement('span');
      why.className = 'itemmenu__why';
      why.textContent = action.blocked;
      btn.append(why);
    } else {
      btn.onclick = () => {
        // Close FIRST: the action redraws the dock, and a menu still open over
        // slots that no longer exist is a menu pointing at nothing.
        closeMenu();
        action.run();
      };
    }
    node.append(btn);
  }

  node.hidden = false;
  place(x, y);
  (node.querySelector('.itemmenu__item:not(:disabled)') as HTMLElement | null)?.focus();
}

/** Wired once at boot. Every dismissal in one place. */
export function initMenu(): void {
  // Capture, so it runs before the click reaches whatever is underneath — a
  // click meant to dismiss must not also press the thing it landed on.
  document.addEventListener(
    'pointerdown',
    (event) => {
      if (!isMenuOpen()) return;
      if (!(event.target as Element | null)?.closest('#itemmenu')) closeMenu();
    },
    true
  );
  globalThis.addEventListener('resize', closeMenu);
  document.querySelector('.viewport')?.addEventListener('scroll', closeMenu);
}
