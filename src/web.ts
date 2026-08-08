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
import { applySave, clearSave, healedAnything, loadGame, saveGame, startAutosave } from './game/save';
import type { Healed } from './game/save';
import { initInventory } from './ui/inventory';
import { initCraft, openCraft, closeCraft, isCraftOpen } from './ui/craft';
import { initShop, openShop, closeShop, isShopOpen } from './ui/shop';
import { initStash, openStash, closeStash, isStashOpen } from './ui/stash';
import { initRun, onRunFocused, refreshRunPanels, runPhase } from './ui/run';
import { initWelcome, maybeShowWelcome } from './ui/welcome';
import { ask, cancelConfirm, initConfirm, isConfirmOpen } from './ui/confirm';
import { initTutorial, startTutorial, stopTutorial } from './ui/tutorial';
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
import { initSaveData, openSaveData, closeSaveData, isSaveDataOpen } from './ui/savedata';

// Judging the loop from a stocked inventory is judging the endgame at the start.
const game = createGame('fresh');

// Before any screen reads it: they all capture this object at init, and the
// load fills it in place.
const restored = loadGame();
const healedOnBoot = restored ? applySave(game, restored) : null;

/** What a load had to drop, in words, or null when it dropped nothing. */
function healingNote(healed: Healed): string | null {
  if (!healedAnything(healed)) return null;
  const parts: string[] = [];
  if (healed.points > 0) parts.push(`${healed.points} tree points refunded`);
  if (healed.items > 0) parts.push(`${healed.items} items no longer exist`);
  if (healed.currencies > 0) parts.push(`${healed.currencies} currencies no longer exist`);
  if (healed.skill) parts.push('your skill was replaced');
  return `The game changed since you last played — ${parts.join(', ')}.`;
}

/** Wipe and re-render everything. Both buttons are dev tools. */
function restart(mode: StartMode): void {
  resetGame(game, mode);
  // The old save outlives the wipe otherwise, and the next reload undoes it.
  clearSave();
  saveGame(game);
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
document.getElementById('open-save')!.addEventListener('click', openSaveData);
// Both wipe the save, and both sit in a row you click all day. They ask first.
const guard = (id: string, title: string, mode: StartMode) =>
  document.getElementById(id)!.addEventListener('click', async () => {
    if (await ask({ title, text: 'You lose everything.', confirm: 'Wipe' })) restart(mode);
  });

guard('dev-fresh', 'Start a new game?', 'fresh');
guard('dev-kit', 'Restart with the dev kit?', 'dev');

// Escape closes whatever is on top. Cheap, and the first thing anyone tries.
globalThis.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  // Live during the opening too: closing a popup spends nothing and skips
  // nothing, and it is the only way out of one that has landed over the lit
  // control with its own Close switched off.
  // The question is on top of everything, and Escape can only answer it "no".
  if (isConfirmOpen()) cancelConfirm();
  else if (isSaveDataOpen()) closeSaveData();
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
// A loaded backup replaces everything, so every screen has to look again.
initSaveData(game, (healed) => {
  const said = healingNote(healed);
  if (said) note(said);
  refreshRunPanels();
  onRunFocused();
  maybeShowWelcome();
});
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
onRunFocused();

// The Fissure is home, and boot always lands there. Opening a screen over it
// belongs to the dev kit's stocked start: a restored save can be mid-opening,
// where a popup would cover the one control you are allowed to click.
initWelcome(game, begin);
startAutosave(game);

// After the history exists, so the line has somewhere to land.
const bootNote = healedOnBoot ? healingNote(healedOnBoot) : null;
if (bootNote) note(bootNote);
