/**
 * TALKING TO SOMEBODY IN THE CAMP. *"Then they can be in the camp and you can
 * just talk to them."* Clicking one puts up WHAT THEY ARE FOR as a list —
 * *"a menu that says like Dialogue option / Shop / Exit"* — because a counter
 * that opened only after the last line was one you reached by pressing Next
 * four times. The lines themselves come up in the bubble a map used, pinned
 * over the body the camp drew rather than over a tile.
 */
import { BOSS_KEY_BY_ID, LAMPWRIGHT, SMITH } from '../data';
import type { SceneBeat, SceneDef } from '../scenes';
import { giftWaiting } from '../game/crystals';
import { gaveKey, keyOwed } from '../game/scenes';
import { relicFor } from '../game/graft';
import type { GameState } from '../game/state';
import { openGraft } from './graft';
import { openShop } from './shop';
import { openSmith } from './smith';
import { owesFirstTool } from '../game/smith';
import { lampwrightWords, openMet } from './met';
import { note } from './history';
import { renderInventory } from './inventory';
import { FACE, portraitIcon } from './icons';
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

/** WHAT THEY ARE FOR, in the order you would ask for it: their words, their
 *  counter, the way out. Somebody with no counter still gets a list — one
 *  saying only Talk and Leave confuses nobody. */
function options(def: SceneDef): Array<{ id: string; said: string; go: () => void }> {
  const out = [{ id: 'talk', said: 'Talk', go: () => say(def) }];
  const wanted = relicFor(game, def.id);
  if (wanted) out.push({ id: 'bench', said: 'Give him what you found', go: () => bench(def) });
  else if (def.keeps === 'shop') out.push({ id: 'shop', said: 'Shop', go: counter });
  else if (def.keeps === 'tools') {
    // TWO VERBS, not one screen with a mode nobody can see: buying and
    // reforging are separate asks and the menu is where they are told apart.
    out.push({ id: 'shop', said: 'Shop', go: () => { closeParley(); openSmith('shop'); syncTalk(); } });
    out.push({ id: 'upgrade', said: 'Upgrade', go: () => { closeParley(); openSmith('upgrade'); syncTalk(); } });
  }
  out.push({ id: 'leave', said: 'Leave', go: closeParley });
  return out;
}

/** `at` is the person's own rectangle in the camp, in page pixels. */
export function openTalk(def: SceneDef, at: DOMRect): void {
  over = { x: at.left + at.width / 2, y: at.top };
  $('parley-name').textContent = def.name;
  const face = $('parley-face');
  face.replaceChildren();
  const portrait = portraitIcon(def.who, FACE.bubble);
  if (portrait) face.append(portrait);

  const list = $('parley-list');
  list.replaceChildren();
  for (const choice of options(def)) {
    const btn = document.createElement('button');
    btn.className = 'mini';
    btn.id = `parley-${choice.id}`; // what a harness names, not the wording
    btn.textContent = choice.said;
    btn.onclick = choice.go;
    list.append(btn);
  }
  $('parley').hidden = false;
  syncTalk();
}

export const isParleying = (): boolean => !$('parley').hidden;

export function closeParley(): void {
  $('parley').hidden = true;
}

/** Their lines, and then whatever the LINES lead to: a key or a gift is a
 *  scripted moment and stays on the end of them. */
function say(def: SceneDef): void {
  closeParley();
  startSpeech(def.who, def.name, wordsFor(def), () => offer(def));
  syncTalk();
}

function bench(def: SceneDef): void {
  const wanted = relicFor(game, def.id);
  if (!wanted) return;
  closeParley();
  openGraft(def, wanted);
  syncTalk();
}

function counter(): void {
  closeParley();
  openShop();
}

/** Pins whatever is on screen. Also on resize: the camp scales with the
 *  window, so the body moves under the bubble. */
export function syncTalk(): void {
  if (!over) return;
  for (const id of ['speech', 'parley', 'met-card', 'graft-card']) {
    const node = $(id);
    if (!node.hidden && !node.closest('[hidden]')) pin(node, over.x, over.y);
  }
}

export const isTalking = (): boolean => !$('speech').hidden;

/** WHETHER THEY WANT YOU. What the mark over their head is for: something to
 *  hand over, a key owed, or a bench you are carrying the relic for. A counter
 *  is NOT a want — every visit being a demand reads as a shop. */
export function wants(def: SceneDef): boolean {
  if (def.id === LAMPWRIGHT.scene) return giftWaiting(game) !== null;
  if (def.id === SMITH.scene) return owesFirstTool(game);
  if (def.gives) return keyOwed(game, def);
  return relicFor(game, def.id) !== null;
}

/** What the LINES lead to. At most one is ever true, so nothing chooses. */
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

  // THE FREE TOOL, at the end of the lines that promise it.
  if (def.id === SMITH.scene && owesFirstTool(game)) {
    openSmith('first');
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
