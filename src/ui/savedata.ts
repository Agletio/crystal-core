/**
 * Three slots, and how to get a game out of the browser.
 *
 * The model is SELECT, then act: clicking a slot highlights it, and the three
 * verbs — Play now at the head, Save here and Delete at the foot — all act on
 * the selection. A box says who is in it and nothing else: name, trade, level.
 * The slot you are playing autosaves like the single save always did: a slot
 * is somewhere to KEEP a game, never somewhere to remember to save one.
 */
import {
  SLOTS,
  applySave,
  backupName,
  canSave,
  clearSave,
  copySlot,
  liveSlot,
  loadGame,
  peekSlot,
  readSave,
  saveGame,
  setLiveSlot,
} from '../game/save';
import type { Healed, Slot } from '../game/save';
import type { GameState } from '../game/state';
import { ask } from './confirm';

const $ = (id: string) => document.getElementById(id)!;

let game: GameState;
let onLoaded: ((healed: Healed) => void) | null = null;
let onFresh: (() => void) | null = null;
/** Straight-in: the slot is already loaded, but it may never have been asked
 *  which skill it swings, so playing one still has to put that question up. */
let onPlay: (() => void) | null = null;

/** The selection every verb acts on. The live slot until a click moves it. */
let picked: Slot = 1;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function say(message: string, bad = false): void {
  const host = $('save-note');
  host.textContent = message;
  host.classList.toggle('savenote--bad', bad);
}

/** Stable ids: the smoke test clicks these, and a slot is not a list index. */
const slotId = (slot: Slot, what: string) => `save-${what}-${slot}`;

async function loadSlot(slot: Slot): Promise<void> {
  const who = peekSlot(slot);
  if (!who) return;
  const yes = await ask({
    title: `Play ${who.name}?`,
    text: 'The game you are in keeps playing where it is. You come back to it by selecting it here.',
    confirm: 'Play',
  });
  if (!yes) return;

  const save = loadGame(slot);
  if (!save) {
    say('That slot cannot be read by this version.', true);
    render();
    return;
  }
  // The slot moves FIRST: everything after this writes to the game just loaded
  // rather than back over the one being left.
  setLiveSlot(slot);
  const healed = applySave(game, save);
  saveGame(game);
  closeSaveData();
  onLoaded?.(healed);
}

function newIn(slot: Slot): void {
  // Nothing is lost: the game being played is in its own slot and loading it
  // back is one click. That is the whole reason a new game is a slot's action.
  setLiveSlot(slot);
  clearSave(slot);
  // Out of the way first: what a new game puts up is the welcome, and it
  // should not land on top of the screen you started it from.
  closeSaveData();
  onFresh?.();
}

/** Play the selection: the live game is closed back into, a held slot is
 *  loaded (asking first), and an empty one starts a new game there. */
function playNow(): void {
  const slot = picked;
  if (slot === liveSlot()) {
    if (!peekSlot(slot)) return newIn(slot);
    closeSaveData();
    onPlay?.();
    return;
  }
  if (peekSlot(slot)) void loadSlot(slot);
  else newIn(slot);
}

/** Overwrite the selection with the game being played. */
async function saveHere(): Promise<void> {
  const slot = picked;
  if (slot === liveSlot()) {
    saveGame(game);
    say(`Saved just now, in slot ${slot}.`);
    render();
    return;
  }
  const held = peekSlot(slot);
  if (held) {
    const yes = await ask({
      title: `Save over ${held.name}?`,
      text: `Level ${held.level}. That game goes, and this one stands in its place.`,
      confirm: 'Save over it',
    });
    if (!yes) return;
  }
  // Written first, so what lands in the other slot is this second rather than
  // whatever the autosave timer last got round to.
  saveGame(game);
  copySlot(liveSlot(), slot);
  say(`Saved into slot ${slot}.`);
  render();
}

async function deleteSlot(): Promise<void> {
  const slot = picked;
  const held = peekSlot(slot);
  if (!held || slot === liveSlot()) return;
  const yes = await ask({
    title: `Delete ${held.name}?`,
    text: `Level ${held.level}. This one goes; the others stay.`,
    confirm: 'Delete',
  });
  if (!yes) return;
  clearSave(slot);
  say(`Slot ${slot} deleted.`);
  render();
}

function slotRow(slot: Slot, live: Slot): HTMLElement {
  const row = el('button', 'saveslot') as HTMLButtonElement;
  row.id = slotId(slot, 'row');
  const held = peekSlot(slot);
  row.classList.toggle('saveslot--live', slot === live);
  row.classList.toggle('saveslot--picked', slot === picked);

  const about = el('div', 'saveslot__who');
  about.append(el('span', 'saveslot__n', `Slot ${slot}`));
  about.append(el('span', 'saveslot__name', held ? held.name : 'Empty'));
  if (held) {
    about.append(
      el('span', 'saveslot__when', `${held.trade ?? 'no trade yet'} — level ${held.level}`)
    );
  }
  row.append(about);
  if (slot === live) row.append(el('span', 'saveslot__live', 'Playing here'));

  row.onclick = () => {
    picked = slot;
    render();
  };
  return row;
}

function render(): void {
  const host = $('save-where');
  host.replaceChildren();

  if (!canSave()) {
    $('save-here').toggleAttribute('disabled', true);
    $('save-delete').toggleAttribute('disabled', true);
    host.append(
      el(
        'p',
        'ask__text',
        'Nothing is being saved — this browser blocks storage, usually a ' +
          'private window. Download a backup before you close the tab.'
      )
    );
    return;
  }

  host.append(
    el(
      'p',
      'ask__text',
      'Three games, saved to this browser and nowhere else. The one you are ' +
        'playing writes itself every few seconds; select a slot, then Play ' +
        'now, Save here or Delete act on it.'
    )
  );

  const live = liveSlot();
  const rows = el('div', 'saveslots');
  for (const slot of SLOTS) rows.append(slotRow(slot, live));
  host.append(rows);

  // Deleting the slot you are standing in is a question nobody meant to ask,
  // and there is nothing in an empty one to delete.
  const canDelete = picked !== live && peekSlot(picked) !== null;
  ($('save-delete') as HTMLButtonElement).disabled = !canDelete;
  ($('save-here') as HTMLButtonElement).disabled = false;
}

function download(): void {
  saveGame(game);
  const blob = new Blob([JSON.stringify(game, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = backupName(game);
  link.click();
  URL.revokeObjectURL(url);
  say('Backup downloaded.');
}

/** A file lands in the LIVE slot, which is the one it is now being played in. */
async function restore(file: File): Promise<void> {
  const save = readSave(await file.text());
  if (!save) {
    say('That file is not a save this version can read.', true);
    return;
  }
  const healed = applySave(game, save);
  saveGame(game);
  say(`Loaded ${save.character.name}, level ${save.character.level}.`);
  render();
  onLoaded?.(healed);
}

/** `full` is the title's route in: the whole screen, with no Close to leave by. */
export function openSaveData(full = false): void {
  $('savedata').hidden = false;
  $('savedata').classList.toggle('modal--full', full);
  ($('save-close') as HTMLButtonElement).hidden = full;
  picked = liveSlot();
  say('');
  render();
}

export const closeSaveData = (): void => {
  $('savedata').hidden = true;
};

export const isSaveDataOpen = (): boolean => !$('savedata').hidden;

export function initSaveData(
  state: GameState,
  loaded: (healed: Healed) => void,
  fresh: () => void,
  play: () => void
): void {
  game = state;
  onLoaded = loaded;
  onFresh = fresh;
  onPlay = play;

  ($('save-close') as HTMLButtonElement).onclick = closeSaveData;
  ($('save-play') as HTMLButtonElement).onclick = playNow;
  ($('save-here') as HTMLButtonElement).onclick = () => void saveHere();
  ($('save-delete') as HTMLButtonElement).onclick = () => void deleteSlot();
  ($('save-download') as HTMLButtonElement).onclick = download;

  const file = $('save-file') as HTMLInputElement;
  ($('save-load') as HTMLButtonElement).onclick = () => file.click();
  file.onchange = () => {
    const chosen = file.files?.[0];
    // Cleared either way, so choosing the same file twice still fires.
    file.value = '';
    if (chosen) void restore(chosen);
  };
}
