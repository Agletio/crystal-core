/**
 * Are you sure?
 *
 * One dialog, for the handful of buttons that throw away everything you own.
 * "New game" sat in the header two pixels from Dev kit with nothing between an
 * accidental click and a wiped save, and a wiped save is the one action in the
 * game with no way back — no currency undoes it and no run earns it back.
 *
 * Not window.confirm: that blocks the whole page, looks like the browser
 * rather than the game, and is suppressed outright in some embedded views —
 * which would turn a guard into a button that silently does nothing.
 */
const $ = (id: string) => document.getElementById(id)!;

let answer: ((ok: boolean) => void) | null = null;

/** Asks, and resolves true only if the dangerous button was chosen. */
export function ask(opts: {
  title: string;
  text: string;
  confirm: string;
}): Promise<boolean> {
  $('confirm-title').textContent = opts.title;
  $('confirm-text').textContent = opts.text;
  $('confirm-yes').textContent = opts.confirm;
  $('confirm').hidden = false;
  // Cancel takes focus, so Enter and Space — the two keys most likely to be
  // held down by whatever caused the misclick — back out rather than commit.
  ($('confirm-no') as HTMLButtonElement).focus();

  return new Promise((resolve) => {
    answer = resolve;
  });
}

export const isConfirmOpen = (): boolean => !$('confirm').hidden;

function close(ok: boolean): void {
  $('confirm').hidden = true;
  const resolve = answer;
  answer = null;
  resolve?.(ok);
}

/** Cancelling is what closing means, however you close it. */
export const cancelConfirm = (): void => close(false);

export function initConfirm(): void {
  ($('confirm-yes') as HTMLButtonElement).onclick = () => close(true);
  ($('confirm-no') as HTMLButtonElement).onclick = () => close(false);
  // Clicking the backdrop is a way out of every other popup here, and it can
  // only ever mean "no".
  $('confirm').addEventListener('click', (event) => {
    if (event.target === $('confirm')) close(false);
  });
}
