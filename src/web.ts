/**
 * Browser entry point. Owns the game state and wires the screens to it.
 *
 * One screen and five popups. The map is the floor — it's where the game
 * happens and the thing you come back to after everything else — so it isn't
 * behind a tab at all. Crafting, the shop, the character sheet, skills and
 * history are things you open, use, and close over the top of it, and a run
 * keeps advancing underneath while you do.
 *
 * The inventory dock sits below all of it, uncovered by every popup, because
 * crafting works ON the dock — both the item and the currency come from it —
 * so covering it with the thing that needs it would be the one mistake this
 * layout can't afford.
 */
import { createGame, resetGame } from './game/state';
import type { StartMode } from './game/state';
import { initInventory } from './ui/inventory';
import { initCraft, openCraft, closeCraft, isCraftOpen } from './ui/craft';
import { initShop, openShop, closeShop, isShopOpen } from './ui/shop';
import { initRun, onRunFocused, refreshRunPanels, runPhase } from './ui/run';
import { initWelcome, maybeShowWelcome } from './ui/welcome';
import { initTutorial, startTutorial, stopTutorial } from './ui/tutorial';
import type { GuideCtx } from './ui/tutorial';
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

// Fresh by default. Judging whether the loop is engaging from a stocked
// inventory is judging the endgame at the start.
const game = createGame('fresh');

/** Wipe and re-render everything. Both buttons are dev tools. */
function restart(mode: StartMode): void {
  resetGame(game, mode);
  stopTutorial();
  clearHistory();
  note(mode === 'fresh' ? 'New game — two crystals and nothing else.' : 'Dev kit granted.');
  refreshRunPanels();
  // Same rule as booting: a stocked game has something to spend, a fresh one
  // has a map to run.
  if (mode === 'dev') openCraft();
  else {
    closeCraft();
    closeShop();
    onRunFocused();
  }
  maybeShowWelcome();
}

/**
 * After choosing a skill: straight to the Fissure, with the guide already
 * pointing at Enter.
 *
 * The opening used to start after the first clear, which left the first thing
 * anyone ever does — the descent itself — as the one unguided moment in the
 * game.
 */
function begin(): void {
  refreshRunPanels();
  onRunFocused();
  startTutorial();
}

document.getElementById('open-craft')!.addEventListener('click', openCraft);
document.getElementById('open-shop')!.addEventListener('click', openShop);
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
  else if (isShopOpen()) closeShop();
  else if (isCraftOpen()) closeCraft();
});

/**
 * Popups stop above the dock, and the dock's height depends on what's in it.
 * Measured rather than guessed: a hardcoded number would be wrong the first
 * time the wallet wrapped to two lines.
 */
const dock = document.querySelector('.dock') as HTMLElement;
function measureDock(): void {
  // Distance from the dock's top edge to the bottom of the window, not the
  // dock's own height — the shell's padding sits below it, and a popup that
  // stopped short by exactly that much would still clip the top row of slots.
  const gap = globalThis.innerHeight - dock.getBoundingClientRect().top;
  document.documentElement.style.setProperty('--dock-h', `${Math.max(0, Math.round(gap))}px`);
}
// ResizeObserver catches the dock growing a row; the resize listener covers
// environments without one, which includes the headless smoke test.
if (typeof ResizeObserver === 'function') new ResizeObserver(measureDock).observe(dock);
globalThis.addEventListener('resize', measureDock);
measureDock();

initInventory(game);
initHistory();
// Equipping gear or spending a tree point changes derived stats, so the map
// screen's readouts have to re-read after either.
initCharacter(game, refreshRunPanels);
initSkills(game, refreshRunPanels);
initCraft(game, onRunFocused);
initShop(game);
initRun(game);
/**
 * What the guide needs that the game state can't tell it: which surface has
 * focus, whether a descent is under way, and what's on top — so a step that
 * says "close this" can point at the right close button.
 */
function guideContext(): GuideCtx {
  const top = isSkillsOpen()
    ? 'skills'
    : isCharacterOpen()
      ? 'sheet'
      : isShopOpen()
        ? 'shop'
        : isCraftOpen()
          ? 'craft'
          : null;
  return { view: isCraftOpen() ? 'craft' : 'run', phase: runPhase(), top };
}

initTutorial(game, guideContext);

// A stocked game opens crafting, which is where a returning player wants to
// be; a new one has nothing to spend and lands on the map.
if (game.onboarded) openCraft();
else onRunFocused();
initWelcome(game, begin);
