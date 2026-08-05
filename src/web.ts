/**
 * Browser entry point. Owns the game state and wires the views to it.
 *
 * The inventory sits outside the view switcher because it's the thing every
 * screen acts on — you pull a crystal out of it to run, put gear into the
 * bench, and watch it fill after a clear.
 */
import { createGame } from './game/state';
import { initInventory } from './ui/inventory';
import { initBench, onBenchShown } from './ui/bench';
import { initRun, onRunShown } from './ui/run';

type ViewName = 'bench' | 'run';

const VIEWS: ViewName[] = ['bench', 'run'];
const game = createGame();

function show(view: ViewName): void {
  for (const name of VIEWS) {
    const panel = document.getElementById(`view-${name}`)!;
    const tab = document.getElementById(`tab-${name}`)!;
    const active = name === view;
    panel.hidden = !active;
    tab.classList.toggle('tab--on', active);
    tab.setAttribute('aria-selected', String(active));
  }
  if (view === 'run') onRunShown();
  else onBenchShown();
}

for (const name of VIEWS) {
  document.getElementById(`tab-${name}`)!.addEventListener('click', () => show(name));
}

initInventory(game);
initBench(game);
initRun(game);
show('bench');
