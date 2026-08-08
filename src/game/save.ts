/**
 * The save: the whole game as JSON, in one localStorage key.
 *
 * No server sits behind the hosted build, so a save lives in the browser that
 * made it. `GameState` is plain data, so `version` is the entire compatibility
 * story — a save from another one is refused rather than half-read.
 */
import { SAVE_VERSION, createGame } from './state';
import type { GameState } from './state';

const KEY = 'crystal-core.save';
const STAMP = 'crystal-core.saved-at';

/** Private windows throw on the first WRITE, so the probe has to write. */
function store(): Storage | null {
  try {
    const s = globalThis.localStorage;
    s.setItem(`${KEY}.probe`, '1');
    s.removeItem(`${KEY}.probe`);
    return s;
  } catch {
    return null;
  }
}

export const canSave = (): boolean => store() !== null;

/** What was last written, so an unchanged game does not rewrite the key. */
let lastWritten: string | null = null;

export function saveGame(game: GameState): boolean {
  const s = store();
  if (!s) return false;
  const json = JSON.stringify(game);
  if (json === lastWritten) return true;
  try {
    s.setItem(KEY, json);
    s.setItem(STAMP, String(Date.now()));
    lastWritten = json;
    return true;
  } catch {
    return false; // quota; throwing would take the frame down with it
  }
}

/** When the save was last written, or null if there isn't one. */
export function savedAt(): number | null {
  const raw = store()?.getItem(STAMP);
  const n = raw === null || raw === undefined ? NaN : Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Shape is checked, not trusted: the text can be edited by hand. */
export function readSave(text: string): GameState | null {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object') return null;
  const save = data as Partial<GameState>;
  if (save.version !== SAVE_VERSION) return null;
  if (!Array.isArray(save.inventory) || !Array.isArray(save.stash)) return null;
  if (!save.character || typeof save.character !== 'object') return null;
  if (!save.wallet || typeof save.wallet !== 'object') return null;
  return save as GameState;
}

export function loadGame(): GameState | null {
  const raw = store()?.getItem(KEY);
  if (!raw) return null;
  const save = readSave(raw);
  if (save) lastWritten = raw;
  return save;
}

export function clearSave(): void {
  const s = store();
  if (!s) return;
  s.removeItem(KEY);
  s.removeItem(STAMP);
  lastWritten = null;
}

/**
 * IN PLACE: every screen captured the game object at init. Missing keys fall
 * back to a fresh game, so a save written before a field existed still opens.
 */
export function applySave(game: GameState, save: GameState): void {
  Object.assign(game, createGame('fresh'), save);
}

/** A file the player can keep. */
export function backupName(game: GameState): string {
  const who = (game.character.name || 'wanderer').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return `crystal-core-${who}-level-${game.character.level}.json`;
}

/**
 * Writes on a timer rather than on every mutation, and skips the write when
 * nothing changed — so no screen has to remember to announce that it touched
 * something.
 */
export function startAutosave(game: GameState, everyMs = 4000): void {
  const flush = () => saveGame(game);
  // At once, so a tab closed inside the first tick still leaves a save.
  flush();
  setInterval(flush, everyMs);
  // The tab going away is the one moment the timer is guaranteed to miss.
  globalThis.addEventListener?.('pagehide', flush);
  globalThis.addEventListener?.('visibilitychange', () => {
    if (globalThis.document?.visibilityState === 'hidden') flush();
  });
}
