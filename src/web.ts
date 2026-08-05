/**
 * Browser entry point. Owns the game state and wires the views to it.
 *
 * Two views behind tabs, one permanent inventory, and three modals. The
 * inventory sits outside the view switcher because every screen acts on it;
 * the character sheet, skills and history are modals because they're things
 * you open, read, and close — and all three need to be reachable from either
 * tab.
 */
import { createGame } from './game/state';
import { initInventory } from './ui/inventory';
import { initBench, onBenchShown } from './ui/bench';
import { initRun, onRunShown, refreshRunPanels } from './ui/run';
import { initCharacter, openCharacter, closeCharacter, isCharacterOpen } from './ui/character';
import { initSkills, openSkills, closeSkills, isSkillsOpen } from './ui/skills';
import { initHistory, openHistory, closeHistory, isHistoryOpen } from './ui/history';

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

document.getElementById('open-character')!.addEventListener('click', openCharacter);
document.getElementById('open-skills')!.addEventListener('click', openSkills);
document.getElementById('open-history')!.addEventListener('click', openHistory);

// Escape closes whatever is on top. Cheap, and the first thing anyone tries.
globalThis.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (isSkillsOpen()) closeSkills();
  else if (isCharacterOpen()) closeCharacter();
  else if (isHistoryOpen()) closeHistory();
});

initInventory(game);
initHistory();
// Equipping gear or spending a tree point changes derived stats, so the run
// view's readouts have to re-read after either.
initCharacter(game, refreshRunPanels);
initSkills(game, refreshRunPanels);
initBench(game);
initRun(game);
show('bench');
