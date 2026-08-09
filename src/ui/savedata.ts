/**
 * Where the save lives, and how to get it out.
 *
 * The hosted build has no account behind it, so this screen exists to say so
 * plainly — your progress is in THIS browser — and to hand you a file that
 * isn't.
 */
import { applySave, backupName, canSave, clearSave, readSave, saveGame, savedAt } from '../game/save';
import type { Healed } from '../game/save';
import type { GameState } from '../game/state';

const $ = (id: string) => document.getElementById(id)!;

let game: GameState;
let onLoaded: ((healed: Healed) => void) | null = null;

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
      'Saved to this browser every few seconds, and nowhere else. Another ' +
        'browser, another device, or clearing site data starts you over. ' +
        'A backup file is the way across.'
    )
  );
  host.append(el('p', 'savemeta', `Last saved ${when(savedAt())}.`));
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

export function initSaveData(state: GameState, loaded: (healed: Healed) => void): void {
  game = state;
  onLoaded = loaded;

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

  ($('save-wipe') as HTMLButtonElement).onclick = () => {
    clearSave();
    say('Save deleted. This game is still running — closing the tab loses it.');
    render();
  };

  $('savedata').addEventListener('click', (event) => {
    if (event.target === $('savedata')) closeSaveData();
  });
}
