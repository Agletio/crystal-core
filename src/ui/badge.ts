/**
 * A count on a header button, for a screen holding something to spend.
 *
 * A point nobody spends is a level that did nothing, and the screen that
 * spends one is behind a button that says nothing about it. Zero removes the
 * badge entirely — one reading 0 is a permanent nag — and the node carries a
 * class rather than an id, so nothing may point a tutorial step at it.
 */
export function badge(buttonId: string, count: number): void {
  const button = document.getElementById(buttonId);
  if (!button) return;

  const shown = button.querySelector('.tabbadge');
  if (count <= 0) {
    shown?.remove();
    return;
  }

  const node = shown ?? button.appendChild(document.createElement('span'));
  node.className = 'tabbadge';
  node.textContent = String(count);
}
