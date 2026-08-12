/**
 * Three slots, and how to get a game out of the browser.
 *
 * The hosted build has no account behind it, so this screen says so plainly —
 * your progress is in THIS browser — and hands you a file that is not. The
 * slot you are playing autosaves like the single save always did: a slot is
 * somewhere to KEEP a game, never somewhere to remember to save one.
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
  savedAt,
  setLiveSlot,
} from '../game/save';
import type { Healed, Slot } from '../game/save';
import type { GameState } from '../game/state';
import { ask } from './confirm';

const $ = (id: string) => document.getElementById(id)!;

let game: GameState;
let onLoaded: ((healed: Healed) => void) | null = null;
let onFresh: (() => void) | null = null;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** "just now", "12 minutes ago", "yesterday" — precision nobody needs, gone. */
function when(at: number | null): string {
  if (at === null) return 'not yet';
  const mins = Math.floor((Date.now() - at) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function say(message: string, bad = false): void {
  const host = $('save-note');
  host.textContent = message;
  host.classList.toggle('savenote--bad', bad);
}

/** Stable ids: the smoke test clicks these, and a slot is not a list index. */
const slotId = (slot: Slot, what: string) => `save-${what}-${slot}`;

function button(slot: Slot, what: string, label: string, go: () => void): HTMLElement {
  const node = el('button', 'mini', label) as HTMLButtonElement;
  node.id = slotId(slot, what);
  node.onclick = go;
  return node;
}

async function loadSlot(slot: Slot): Promise<void> {
  const who = peekSlot(slot);
  if (!who) return;
  const yes = await ask({
    title: `Load ${who.name}?`,
    text: 'This game keeps playing where it is. You come back to it by loading it.',
    confirm: 'Load',
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

async function copyInto(slot: Slot): Promise<void> {
  const held = peekSlot(slot);
  if (held) {
    const yes = await ask({
      title: `Copy over ${held.name}?`,
      text: `Level ${held.level}, saved ${when(held.at)}. It goes.`,
      confirm: 'Copy',
    });
    if (!yes) return;
  }
  // Written first, so what lands in the other slot is this second rather than
  // whatever the autosave timer last got round to.
  saveGame(game);
  copySlot(liveSlot(), slot);
  say(`Copied into slot ${slot}.`);
  render();
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

function slotRow(slot: Slot, live: Slot): HTMLElement {
  const row = el('div', 'saveslot');
  row.id = slotId(slot, 'row');
  const held = peekSlot(slot);
  const mine = slot === live;
  row.classList.toggle('saveslot--live', mine);

  const about = el('div', 'saveslot__who');
  about.append(el('span', 'saveslot__n', `Slot ${slot}`));
  about.append(
    el(
      'span',
      'saveslot__name',
      held ? `${held.name} — level ${held.level}` : 'Empty'
    )
  );
  about.append(el('span', 'saveslot__when', held ? `saved ${when(held.at)}` : ''));
  row.append(about);

  const acts = el('div', 'saveslot__acts');
  if (mine) acts.append(el('span', 'saveslot__live', 'Playing here'));
  else if (held) {
    acts.append(button(slot, 'copy', 'Copy here', () => void copyInto(slot)));
    acts.append(button(slot, 'load', 'Load', () => void loadSlot(slot)));
  } else {
    acts.append(button(slot, 'copy', 'Copy here', () => void copyInto(slot)));
    acts.append(button(slot, 'new', 'New game', () => newIn(slot)));
  }
  row.append(acts);
  return row;
}

function render(): void {
  const host = $('save-where');
  host.replaceChildren();

  if (!canSave()) {
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
        'playing writes itself every few seconds; another browser, another ' +
        'device, or clearing site data starts you over, and a backup file is ' +
        'the way across.'
    )
  );

  const live = liveSlot();
  const rows = el('div', 'saveslots');
  for (const slot of SLOTS) rows.append(slotRow(slot, live));
  host.append(rows);
  host.append(el('p', 'savemeta', `This one last saved ${when(savedAt())}.`));
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

export function openSaveData(): void {
  $('savedata').hidden = false;
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
  fresh: () => void
): void {
  game = state;
  onLoaded = loaded;
  onFresh = fresh;

  ($('save-close') as HTMLButtonElement).onclick = closeSaveData;
  ($('save-download') as HTMLButtonElement).onclick = download;

  const file = $('save-file') as HTMLInputElement;
  ($('save-load') as HTMLButtonElement).onclick = () => file.click();
  file.onchange = () => {
    const chosen = file.files?.[0];
    // Cleared either way, so choosing the same file twice still fires.
    file.value = '';
    if (chosen) void restore(chosen);
  };

  // Every slot, because the reason to press this is "get my game off this
  // machine" rather than "free up a row" — nothing here needs freeing.
  ($('save-wipe') as HTMLButtonElement).onclick = async () => {
    const yes = await ask({
      title: 'Delete all three saves?',
      text: 'Every slot in this browser goes. The game on screen keeps running until you close the tab.',
      confirm: 'Delete',
    });
    if (!yes) return;
    for (const slot of SLOTS) clearSave(slot);
    say('All three deleted. This game is still running — closing the tab loses it.');
    render();
  };

}
