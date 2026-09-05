/**
 * A CHANGE MADE MID-DESCENT LANDS ON THE NEXT RUN. Nothing is prevented — the
 * click works, the save takes it — but what you are FIGHTING with is fixed the
 * moment you go down, so the line says WHEN the change lands rather than
 * refusing it. A few words and no button: it answers something you just did.
 */
const HELD = 2600;
let going: number | undefined;

export function warnAtCamp(): void {
  const box = document.getElementById('atcamp');
  if (!box) return;
  box.hidden = false;
  clearTimeout(going);
  going = window.setTimeout(() => {
    box.hidden = true;
  }, HELD);
}
