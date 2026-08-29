/**
 * A CHANGE MADE MID-DESCENT LANDS AT CAMP. Nothing is prevented — the click
 * works, the save takes it — but what you are FIGHTING with is fixed the moment
 * you go down, so the line says where the change went rather than refusing it.
 *
 * Four words and no button: it is an answer to something you just did, not a
 * question, and it takes itself away.
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
