/**
 * Browser entry point. Wires the two views together and nothing else.
 *
 * The bench is where you make things; the run is where you find out whether
 * they were worth making. Eventually the bench becomes a debug panel next to
 * the game, which is why they share a page and a bundle.
 */
import { initBench } from './ui/bench';
import { initRun, onRunShown } from './ui/run';

type ViewName = 'bench' | 'run';

const VIEWS: ViewName[] = ['bench', 'run'];

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
}

for (const name of VIEWS) {
  document.getElementById(`tab-${name}`)!.addEventListener('click', () => show(name));
}

initBench();
initRun();
show('bench');
