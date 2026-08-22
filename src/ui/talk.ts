/**
 * TALKING TO SOMEBODY IN THE CAMP. *"Then they can be in the camp and you can
 * just talk to them."* Their lines come up in the same bubble a map used,
 * pinned over the body the camp drew rather than over a tile, and what follows
 * the last one is whatever they are FOR — a gift, a key, or their bench.
 */
import { BOSS_KEY_BY_ID, LAMPWRIGHT } from '../data';
import type { SceneBeat, SceneDef } from '../scenes';
import { giftWaiting } from '../game/crystals';
import { gaveKey, keyOwed } from '../game/scenes';
import { relicFor } from '../game/graft';
import type { GameState } from '../game/state';
import { openGraft } from './graft';
import { lampwrightWords, openMet } from './met';
import { note } from './history';
import { renderInventory } from './inventory';
import { pin, startSpeech } from './speech';

const $ = (id: string) => document.getElementById(id)!;

let game: GameState;
/** Where their body is, so the bubble and the card after it share a spot. */
let over: { x: number; y: number } | null = null;

export function initTalk(state: GameState): void {
  game = state;
}

/** WHAT THEY SAY, which is what they WANT. Somebody with nothing on offer says
 *  one standing line instead: every visit being a demand reads as a shop. */
function wordsFor(def: SceneDef): SceneBeat[] {
  const owed = def.id === LAMPWRIGHT.scene ? giftWaiting(game) : null;
  if (owed) return lampwrightWords(owed).beats;
  if (def.id === LAMPWRIGHT.scene) return LAMPWRIGHT.again.beats;
  const wants = def.gives ? keyOwed(game, def) : relicFor(game, def.id) !== null;
  if (wants && def.beats?.length) return def.beats;
  return [{ said: def.idles ?? def.said }];
}

/** `at` is the person's own rectangle in the camp, in page pixels. */
export function openTalk(def: SceneDef, at: DOMRect): void {
  over = { x: at.left + at.width / 2, y: at.top };
  startSpeech(def.who, def.name, wordsFor(def), () => offer(def));
  syncTalk();
}

/** Pins whatever is on screen. Also on resize: the camp scales with the
 *  window, so the body moves under the bubble. */
export function syncTalk(): void {
  if (!over) return;
  for (const id of ['speech', 'met-card', 'graft-card']) {
    const node = $(id);
    if (!node.hidden && !node.closest('[hidden]')) pin(node, over.x, over.y);
  }
}

export const isTalking = (): boolean => !$('speech').hidden;

/** What they are FOR. At most one is ever true, so nothing chooses. */
function offer(def: SceneDef): void {
  // A KEY, once and in person. What it opens is the fifth socket's business.
  if (keyOwed(game, def)) {
    const key = BOSS_KEY_BY_ID[def.gives!];
    if (key) {
      game.wallet[key.id] = (game.wallet[key.id] ?? 0) + 1;
      game.given = [...(game.given ?? []), gaveKey(key.id)];
      note(`${def.name} hands you ${key.name}. It goes in the Fissure's fifth socket.`);
      renderInventory();
    }
    return;
  }

  // A BENCH, if you carry what they want. Nothing is spent until the button.
  const wanted = relicFor(game, def.id);
  if (wanted) {
    openGraft(def, wanted);
    syncTalk();
    return;
  }

  // WHATEVER IS OWED. One person owes anything, and this is the whole schedule.
  const waiting = def.id === LAMPWRIGHT.scene ? giftWaiting(game) : null;
  if (waiting) {
    openMet(waiting);
    syncTalk();
  }
}
