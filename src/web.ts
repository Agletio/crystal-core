/**
 * Browser entry point. Owns the game state and wires the screens to it.
 *
 * One screen and six popups: the map is the floor, and everything else opens
 * over it while a run keeps advancing underneath. The dock sits below all of
 * it, uncovered — crafting works ON the dock, so covering it is the one mistake
 * this layout cannot afford.
 */
import { createGame, resetGame, sellItem, slotFor, stashRoom, toStash } from './game/state';
import { canSell, sellPrice } from './economy';
import { onWearChanged, wear } from './ui/wear';
import { dismissToast } from './ui/toast';
import { EQUIP_SLOTS, POTIONS } from './data';
import type { StartMode } from './game/state';
import { applySave, clearSave, healedAnything, loadGame, saveGame, startAutosave } from './game/save';
import type { Healed } from './game/save';
import {
  closeInventory,
  initInventory,
  isInventoryOpen,
  openInventory,
  renderInventory,
  setItemActions,
} from './ui/inventory';
import { closeMenu, initMenu, isMenuOpen } from './ui/menu';
import { initCraft, openCraft, closeCraft, isCraftOpen, refreshCraft } from './ui/craft';
import { initShop, openShop, closeShop, isShopOpen, refreshShop } from './ui/shop';
import { initStash, openStash, closeStash, isStashOpen } from './ui/stash';
import { initHaul, openHaul, closeHaul, isHaulOpen } from './ui/haul';
import { initMet, isMetOpen } from './ui/met';
import { initSpeech, isSpeaking } from './ui/speech';
import { initCrystals, openCrystals, closeCrystals, isCrystalsOpen } from './ui/crystals';
import {
  centreCamera,
  drinkFlask,
  initRun,
  metTaken,
  onRunFocused,
  skipToGift,
  refreshRunPanels,
  runPhase,
} from './ui/run';
import { initWelcome, maybeShowWelcome } from './ui/welcome';
import { ask, cancelConfirm, initConfirm, isConfirmOpen } from './ui/confirm';
import { initTutorial, startTutorial, stopTutorial } from './ui/tutorial';
import type { GuideCtx } from './ui/tutorial';
import {
  initCharacter,
  refreshCharacter,
  openCharacter,
  closeCharacter,
  isCharacterOpen,
  pickingSlot,
} from './ui/character';
import {
  initSkills,
  openSkills,
  closeSkills,
  isSkillsOpen,
  skillsDepth,
  skillsEscape,
} from './ui/skills';
import { initTrade, openTrade, closeTrade, isTradeOpen } from './ui/trade';
import {
  initHistory,
  openHistory,
  closeHistory,
  isHistoryOpen,
  clearHistory,
  note,
} from './ui/history';
import { initSaveData, openSaveData, closeSaveData, isSaveDataOpen } from './ui/savedata';
import { initKeys } from './ui/keys';
import { dressRail, syncParkedPanels, toggleFullscreen, toggleParkedPanels } from './ui/rail';
import { initWindows, topWindow, windowOffset } from './ui/windows';

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
    closeHaul();
    closeCrystals();
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
document.getElementById('open-haul')!.addEventListener('click', () => openHaul());
document.getElementById('open-crystals')!.addEventListener('click', openCrystals);
document.getElementById('open-stash')!.addEventListener('click', openStash);
document.getElementById('open-inventory')!.addEventListener('click', openInventory);
document.getElementById('open-character')!.addEventListener('click', () => openCharacter());
document.getElementById('open-skills')!.addEventListener('click', openSkills);
document.getElementById('open-trade')!.addEventListener('click', openTrade);
document.getElementById('open-history')!.addEventListener('click', openHistory);
document.getElementById('open-save')!.addEventListener('click', openSaveData);
// The dev kit wipes what you are playing, and it sits in a row you click all
// day. A new game is a SLOT's action now, on the Save & Load screen.
const guard = (id: string, title: string, mode: StartMode) =>
  document.getElementById(id)!.addEventListener('click', async () => {
    if (await ask({ title, text: 'You lose everything.', confirm: 'Wipe' })) restart(mode);
  });

guard('dev-kit', 'Restart with the dev kit?', 'dev');

// Escape closes whatever is on top. Cheap, and the first thing anyone tries.
globalThis.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  // Live during the opening too: closing a popup spends nothing and skips
  // nothing, and it is the only way out of one that has landed over the lit
  // control with its own Close switched off.
  // The question is on top of everything, and Escape can only answer it "no".
  if (isConfirmOpen()) cancelConfirm();
  // The crystal is already granted by the time a panel is on screen, so Escape
  // takes it rather than refusing it — and from a line before the panel it
  // skips the rest of them and takes it anyway.
  else if (isSpeaking() || isMetOpen()) skipToGift();
  // The item menu is above every window, so it is what Escape is aimed at
  // while one is open — closing the window under it loses your place.
  else if (isMenuOpen()) closeMenu();
  else {
    // Below those three it is whichever window you touched last, since with
    // several open a fixed order closes one you are not looking at.
    const top = topWindow();
    // Skills is three deep, so Escape backs out a level, like Back.
    if (top === 'skills') skillsEscape();
    else if (top) SCREENS[top].close();
    // Last, so it never eats the press that was meant to close a window.
    else dismissToast();
  }
});

/** Measured, not guessed: a constant is wrong the first time the wallet wraps. */
const dock = document.querySelector('.dock') as HTMLElement;
function measureDock(): void {
  // To the bottom of the WINDOW, not the dock's own height: the shell's
  // padding sits below it, and a popup stopping short would clip the top row.
  // Closed it reserves nothing, or a hidden window would push every other one
  // up by the height of the space it is not occupying.
  // The dock's HOME, not wherever it has been dragged: reflowing every other
  // window each time somebody nudges this one is not what dragging asked for.
  const top = dock.getBoundingClientRect().top - windowOffset(dock).y;
  const gap = dock.hidden ? 0 : globalThis.innerHeight - top;
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
initSaveData(
  game,
  (healed) => {
    const said = healingNote(healed);
    if (said) note(said);
    syncParkedPanels();
    refreshRunPanels();
    onRunFocused();
    maybeShowWelcome();
  },
  // A new game in another slot. The slot has already moved, so `restart` is
  // wiping and writing the one being started rather than the one left behind.
  () => restart('fresh')
);
// Equipping gear or spending a tree point changes derived stats, so the map
// screen's readouts have to re-read after either.
initCharacter(game, refreshRunPanels, onRunFocused);
initSkills(game, refreshRunPanels);
// A trade node changes what the sim does, so the map's readouts re-read too.
initTrade(game, refreshRunPanels);
// A craft can land on a worn piece now, so the map's readouts re-read after one.
initCraft(game, onRunFocused, () => {
  refreshRunPanels();
  refreshCharacter();
});
initShop(game);
// Closing the stash hands the dock back to the map, same as crafting does.
initStash(game, onRunFocused);
// Taking things out of the haul is what unblocks Enter, so the map re-reads.
initHaul(game, () => {
  refreshRunPanels();
  refreshShop();
});
// Socketing from here changes the set the Fissure is holding, so the map re-reads.
initCrystals(game, refreshRunPanels);
// The crystal is in your hands the moment the panel closes, so the collection
// and the Fissure's own counts are both already out of date.
initMet(game, () => {
  metTaken();
  refreshRunPanels();
});
initRun(game);
initSpeech();
initMenu();

/**
 * What an item can do wherever you are standing. The dock's click belongs to
 * the open screen — it is what the opening teaches — so wearing a helmet you
 * just picked up used to mean walking to the sheet and picking its slot first.
 * These are offered beside that click rather than instead of it.
 */
setItemActions({
  extrasFor: (item) => {
    const out = [];
    const slotId = item.kind === 'gear' ? slotFor(game, item) : null;
    const slot = EQUIP_SLOTS.find((s) => s.id === slotId);
    if (slotId && slot) {
      const worn = game.character.equipment[slotId];
      out.push({
        label: worn ? `Wear as ${slot.name} (swap)` : `Wear as ${slot.name}`,
        run: () => wear(game, item, slotId),
      });
    }
    if (stashRoom(game) > 0) {
      out.push({
        label: 'Send to stash',
        menuOnly: true,
        run: () => {
          if (!toStash(game, item)) return;
          note(`Stashed ${item.name}`);
          renderInventory();
        },
      });
    } else {
      out.push({
        label: 'Send to stash',
        menuOnly: true,
        run: () => {},
        blocked: 'the stash is full',
      });
    }
    // Menu only, never the click: a sale is the one action here that cannot be
    // taken back, and the dock's click belongs to whatever screen is open.
    if (canSell(item)) {
      out.push({
        label: `Sell for ${sellPrice(item)} gold`,
        menuOnly: true,
        run: () => {
          const paid = sellItem(game, item);
          if (paid <= 0) return;
          note(`Sold ${item.name} for ${paid} gold`, 'add');
          renderInventory();
          refreshShop();
        },
      });
    }
    return out;
  },
  // Dragging onto a slot in the crafting window's worn column. A deliberate
  // drag onto the picture of a body is the one equip nobody does by accident.
  equipTo: (item, slotId) => wear(game, item, slotId),
});

// Every screen shows some part of what wearing something moved.
onWearChanged(() => {
  refreshRunPanels();
  refreshCharacter();
  refreshCraft();
  renderInventory();
});
/** What the guide needs that game state cannot tell it: focus, phase, and what's on top. */
function guideContext(): GuideCtx {
  // Every popup: the guide can only walk you out of one it knows you are in.
  const top = isMetOpen()
    ? 'met'
    : isSaveDataOpen()
      ? 'save'
    : isSkillsOpen()
      ? 'skills'
    : isTradeOpen()
      ? 'trade'
      : isCharacterOpen()
        ? 'sheet'
        : isHistoryOpen()
          ? 'history'
          : isCrystalsOpen()
            ? 'crystals'
            : isHaulOpen()
              ? 'haul'
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
    speaking: isSpeaking(),
    dock: isInventoryOpen(),
    ...skillsDepth(),
  };
}

// Every key in the game but Escape, which is the shell's own chain above.
// A binding is a table entry, so the screen that rebinds them is a screen.
/** Every screen is the same pair, so its key is a TOGGLE and this is a table
 *  rather than eleven near-identical handlers. */
/** `el` is the window: what gets dragged, raised, and closed by Escape. */
const SCREENS: Record<
  string,
  { el: string; open: () => void; close: () => void; isOpen: () => boolean }
> = {
  inventory: { el: 'dock', open: openInventory, close: closeInventory, isOpen: isInventoryOpen },
  character: {
    el: 'sheet',
    open: () => openCharacter(),
    close: closeCharacter,
    isOpen: isCharacterOpen,
  },
  skills: { el: 'skills', open: openSkills, close: closeSkills, isOpen: isSkillsOpen },
  trade: { el: 'trade', open: openTrade, close: closeTrade, isOpen: isTradeOpen },
  craft: { el: 'craft', open: openCraft, close: closeCraft, isOpen: isCraftOpen },
  shop: { el: 'shop', open: openShop, close: closeShop, isOpen: isShopOpen },
  haul: { el: 'haul', open: openHaul, close: closeHaul, isOpen: isHaulOpen },
  crystals: { el: 'crystals', open: openCrystals, close: closeCrystals, isOpen: isCrystalsOpen },
  stash: { el: 'stash', open: openStash, close: closeStash, isOpen: isStashOpen },
  history: { el: 'history', open: openHistory, close: closeHistory, isOpen: isHistoryOpen },
  save: { el: 'savedata', open: openSaveData, close: closeSaveData, isOpen: isSaveDataOpen },
};

initWindows(Object.fromEntries(Object.entries(SCREENS).map(([id, s]) => [id, s.el])));

initKeys(game, {
  centre: centreCamera,
  hide: () => toggleParkedPanels(),
  fullscreen: toggleFullscreen,
  ...Object.fromEntries(
    Object.entries(SCREENS).map(([id, s]) => [id, () => (s.isOpen() ? s.close() : s.open())])
  ),
  // One entry per potion, off the same table the flasks are drawn from.
  ...Object.fromEntries(POTIONS.map((p) => [p.binding, () => drinkFlask(p.id)])),
});

dressRail(game);

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
