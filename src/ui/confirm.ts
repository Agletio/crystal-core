/**
 * One dialog, for the buttons that throw away everything you own. Not
 * window.confirm: that blocks the page, looks like the browser, and is
 * suppressed in some embedded views — a guard that silently does nothing.
 */
const $ = (id: string) => document.getElementById(id)!;

let answer: ((ok: boolean) => void) | null = null;

/** Resolves true only if the dangerous button was chosen. */
export function ask(opts: {
  title: string;
  text: string;
  confirm: string;
}): Promise<boolean> {
  $('confirm-title').textContent = opts.title;
  $('confirm-text').textContent = opts.text;
  $('confirm-yes').textContent = opts.confirm;
  $('confirm').hidden = false;
  // Cancel takes focus, so Enter and Space back out rather than commit.
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
  // The backdrop closes every other popup here, and can only mean "no".
  $('confirm').addEventListener('click', (event) => {
    if (event.target === $('confirm')) close(false);
  });
}
