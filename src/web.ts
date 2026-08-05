/**
 * Browser entry point. Owns the game state and wires the views to it.
 *
 * Two views behind tabs, one permanent inventory, and three modals. The
 * inventory sits outside the view switcher because every screen acts on it;
 * the character sheet, skills and history are modals because they're things
 * you open, read, and close — and all three need to be reachable from either
 * tab.
 */
import { createGame, resetGame } from './game/state';
import type { StartMode } from './game/state';
import { initInventory } from './ui/inventory';
import { initBench, onBenchShown } from './ui/bench';
import { initRun, onRunShown, refreshRunPanels, chooseFreeMap } from './ui/run';
import { initWelcome, maybeShowWelcome } from './ui/welcome';
import { initTutorial, stopTutorial } from './ui/tutorial';
import { initCharacter, openCharacter, closeCharacter, isCharacterOpen } from './ui/character';
import { initSkills, openSkills, closeSkills, isSkillsOpen } from './ui/skills';
import {
  initHistory,
  openHistory,
  closeHistory,
  isHistoryOpen,
  clearHistory,
  note,
} from './ui/history';

type ViewName = 'bench' | 'run';

const VIEWS: ViewName[] = ['bench', 'run'];

// Fresh by default. Judging whether the loop is engaging from a stocked
// inventory is judging the endgame at the start.
const game = createGame('fresh');
let current: ViewName = 'bench';

function show(view: ViewName): void {
  for (const name of VIEWS) {
    const panel = document.getElementById(`view-${name}`)!;
    const tab = document.getElementById(`tab-${name}`)!;
    const active = name === view;
    panel.hidden = !active;
    tab.classList.toggle('tab--on', active);
    tab.setAttribute('aria-selected', String(active));
  }
  current = view;
  if (view === 'run') onRunShown();
  else onBenchShown();
}

/** Wipe and re-render everything. Both buttons are dev tools. */
function restart(mode: StartMode): void {
  resetGame(game, mode);
  stopTutorial();
  clearHistory();
  note(mode === 'fresh' ? 'New game — two crystals and nothing else.' : 'Dev kit granted.');
  refreshRunPanels();
  show(mode === 'fresh' ? 'run' : current);
  maybeShowWelcome();
}

/** After choosing a skill: straight to the Fissure, nothing else to do first. */
function begin(): void {
  refreshRunPanels();
  show('run');
  chooseFreeMap();
}

for (const name of VIEWS) {
  document.getElementById(`tab-${name}`)!.addEventListener('click', () => show(name));
}

document.getElementById('open-character')!.addEventListener('click', openCharacter);
document.getElementById('open-skills')!.addEventListener('click', openSkills);
document.getElementById('open-history')!.addEventListener('click', openHistory);
document.getElementById('dev-fresh')!.addEventListener('click', () => restart('fresh'));
document.getElementById('dev-kit')!.addEventListener('click', () => restart('dev'));

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
initTutorial(game, () => current);

// A new player lands on the Fissure with a skill chosen; a stocked one lands
// on the bench, which is where a returning player wants to be.
if (game.onboarded) show('bench');
else show('run');
initWelcome(game, begin);
