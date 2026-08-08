/**
 * Browser entry point. Owns the game state and wires the screens to it.
 *
 * One screen and six popups: the map is the floor, and everything else opens
 * over it while a run keeps advancing underneath. The dock sits below all of
 * it, uncovered — crafting works ON the dock, so covering it is the one mistake
 * this layout cannot afford.
 */
import { createGame, resetGame } from './game/state';
import type { StartMode } from './game/state';
import { initInventory } from './ui/inventory';
import { initCraft, openCraft, closeCraft, isCraftOpen } from './ui/craft';
import { initShop, openShop, closeShop, isShopOpen } from './ui/shop';
import { initStash, openStash, closeStash, isStashOpen } from './ui/stash';
import { initRun, onRunFocused, refreshRunPanels, runPhase } from './ui/run';
import { initWelcome, maybeShowWelcome } from './ui/welcome';
import { ask, cancelConfirm, initConfirm, isConfirmOpen } from './ui/confirm';
import { initTutorial, isGuided, startTutorial, stopTutorial } from './ui/tutorial';
import type { GuideCtx } from './ui/tutorial';
import {
  initCharacter,
  openCharacter,
  closeCharacter,
  isCharacterOpen,
  pickingSlot,
} from './ui/character';
import { initSkills, openSkills, closeSkills, isSkillsOpen, skillsEscape } from './ui/skills';
import {
  initHistory,
  openHistory,
  closeHistory,
  isHistoryOpen,
  clearHistory,
  note,
} from './ui/history';

// Judging the loop from a stocked inventory is judging the endgame at the start.
const game = createGame('fresh');

/** Wipe and re-render everything. Both buttons are dev tools. */
function restart(mode: StartMode): void {
  resetGame(game, mode);
  stopTutorial();
  clearHistory();
  note(mode === 'fresh' ? 'New game — nothing but the Fissure.' : 'Dev kit granted.');
  refreshRunPanels();
  // Same rule as booting: a stocked game has something to spend, a fresh one
  // has a map to run.
  if (mode === 'dev') openCraft();
  else {
    closeCraft();
    closeShop();
    closeStash();
    onRunFocused();
  }
  maybeShowWelcome();
}

/** After choosing a skill: the Fissure, with the guide already pointing at Enter. */
function begin(guided: boolean): void {
  refreshRunPanels();
  onRunFocused();
  if (guided) startTutorial();
}

document.getElementById('open-craft')!.addEventListener('click', openCraft);
document.getElementById('open-shop')!.addEventListener('click', openShop);
document.getElementById('open-stash')!.addEventListener('click', openStash);
document.getElementById('open-character')!.addEventListener('click', openCharacter);
document.getElementById('open-skills')!.addEventListener('click', openSkills);
document.getElementById('open-history')!.addEventListener('click', openHistory);
// Both of these wipe the save, and both sit in a row of buttons you click all
// day. They ask first.
const guard = (id: string, title: string, mode: StartMode) =>
  document.getElementById(id)!.addEventListener('click', async () => {
    if (await ask({ title, text: 'You lose everything.', confirm: 'Wipe' })) restart(mode);
  });

guard('dev-fresh', 'Start a new game?', 'fresh');
guard('dev-kit', 'Restart with the dev kit?', 'dev');

// Escape closes whatever is on top. Cheap, and the first thing anyone tries.
globalThis.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  // Not while the opening runs: every other way out is switched off, and this
  // would be the same escape hatch by another door.
  if (isGuided()) return;
  // The question is on top of everything, and Escape can only answer it "no".
  if (isConfirmOpen()) cancelConfirm();
  // Skills is three deep, so Escape backs out a level, like Back.
  else if (isSkillsOpen()) skillsEscape();
  else if (isCharacterOpen()) closeCharacter();
  else if (isHistoryOpen()) closeHistory();
  else if (isStashOpen()) closeStash();
  else if (isShopOpen()) closeShop();
  else if (isCraftOpen()) closeCraft();
});

/** Measured, not guessed: a constant is wrong the first time the wallet wraps. */
const dock = document.querySelector('.dock') as HTMLElement;
function measureDock(): void {
  // To the bottom of the WINDOW, not the dock's own height: the shell's
  // padding sits below it, and a popup stopping short would clip the top row.
  const gap = globalThis.innerHeight - dock.getBoundingClientRect().top;
  document.documentElement.style.setProperty('--dock-h', `${Math.max(0, Math.round(gap))}px`);
}
// The resize listener covers environments with no ResizeObserver, like jsdom.
if (typeof ResizeObserver === 'function') new ResizeObserver(measureDock).observe(dock);
globalThis.addEventListener('resize', measureDock);
measureDock();

initInventory(game);
initHistory();
initConfirm();
// Equipping gear or spending a tree point changes derived stats, so the map
// screen's readouts have to re-read after either.
initCharacter(game, refreshRunPanels, onRunFocused);
initSkills(game, refreshRunPanels);
initCraft(game, onRunFocused);
initShop(game);
// Closing the stash hands the dock back to the map, same as crafting does.
initStash(game, onRunFocused);
initRun(game);
/** What the guide needs that game state cannot tell it: focus, phase, and what's on top. */
function guideContext(): GuideCtx {
  const top = isSkillsOpen()
    ? 'skills'
    : isCharacterOpen()
      ? 'sheet'
      : isStashOpen()
        ? 'stash'
        : isShopOpen()
          ? 'shop'
          : isCraftOpen()
            ? 'craft'
            : null;
  return {
    view: isCraftOpen() ? 'craft' : 'run',
    phase: runPhase(),
    top,
    picking: pickingSlot(),
  };
}

initTutorial(game, guideContext);

// A stocked game opens crafting, which is where a returning player wants to
// be; a new one has nothing to spend and lands on the map.
if (game.onboarded) openCraft();
else onRunFocused();
initWelcome(game, begin);
