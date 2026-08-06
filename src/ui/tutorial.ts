/**
 * The guided opening.
 *
 * Starts once the Fissure is first cleared, and walks through the loop the game
 * is actually about: buy a currency, craft your weapon with it, wear the
 * result, go again. Each step highlights the one thing to click and says why.
 *
 * Steps are DATA with a `done` predicate rather than a script of callbacks.
 * That means the tutorial can never desynchronise from the game: if you wander
 * off and buy the shard early, the step is already satisfied and it moves on.
 * A callback-driven version would sit there waiting for a click that already
 * happened.
 *
 * Progress is checked on a timer rather than threaded through every render in
 * six modules. It's a few predicate calls a second against plain objects —
 * cheaper than the wiring it replaces, and it can't be forgotten at a call
 * site.
 */
import { balance } from '../economy';
import { benchItem } from '../game/state';
import type { GameState } from '../game/state';

const $ = (id: string) => document.getElementById(id)!;

export interface TutorialStep {
  id: string;
  text: string;
  /** Element to draw attention to. */
  target: string;
  done(game: GameState, view: string): boolean;
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'to_bench',
    text: 'Good. Open the Bench — everything you found is spent there.',
    target: 'open-bench',
    done: (_g, view) => view === 'bench',
  },
  {
    id: 'buy_awakening',
    text: 'Buy a Shard of Awakening from the Workshop. It fills every empty slot at once.',
    target: 'workshop',
    done: (g) => balance(g.wallet, 'shard_of_awakening') > 0,
  },
  {
    id: 'select_weapon',
    text: 'Click your Ash Wand in the dock below to put it on the bench.',
    target: 'inv-gear',
    done: (g) => benchItem(g)?.kind === 'gear',
  },
  {
    id: 'use_awakening',
    text: 'Now use the Shard of Awakening on it. The base stat stays; the slots fill.',
    target: 'currencies',
    done: (g) => (benchItem(g)?.mods.length ?? 0) > 0,
  },
  {
    id: 'buy_chaos',
    text: 'Buy a Shard of Chaos. It re-rolls every modifier — your call whether to gamble.',
    target: 'workshop',
    done: (g) => balance(g.wallet, 'shard_of_chaos') > 0,
  },
  {
    id: 'equip',
    text: 'Open Character and put the wand in your weapon slot.',
    target: 'open-character',
    done: (g) => !!g.character.equipment.weapon,
  },
  {
    id: 'return',
    text: 'That is the loop. Close the Bench — you can afford a crystal now, and it goes in the Fissure.',
    target: 'bench-close',
    done: (_g, view) => view === 'run',
  },
];

let game: GameState;
let viewOf: () => string = () => 'bench';
let highlighted: Element | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function clearHighlight(): void {
  highlighted?.classList.remove('guide-on');
  highlighted = null;
}

function paint(): void {
  const step = TUTORIAL_STEPS[game.tutorialStep ?? -1];
  const banner = $('guide');

  if (!step) {
    banner.hidden = true;
    clearHighlight();
    return;
  }

  banner.hidden = false;
  $('guide-text').textContent = step.text;
  $('guide-step').textContent = `${(game.tutorialStep ?? 0) + 1} / ${TUTORIAL_STEPS.length}`;

  const target = document.getElementById(step.target);
  if (target === highlighted) return;
  clearHighlight();
  if (target) {
    target.classList.add('guide-on');
    highlighted = target;
  }
}

/** Advance past every step already satisfied, then repaint. */
function tick(): void {
  if (game.tutorialStep === null) {
    paint();
    return;
  }

  const view = viewOf();
  let moved = false;
  while (game.tutorialStep < TUTORIAL_STEPS.length && TUTORIAL_STEPS[game.tutorialStep].done(game, view)) {
    game.tutorialStep++;
    moved = true;
  }
  if (game.tutorialStep >= TUTORIAL_STEPS.length) {
    game.tutorialStep = null;
    clearHighlight();
  }
  if (moved || highlighted === null) paint();
}

export function startTutorial(): void {
  if (game.tutorialStep !== null) return;
  game.tutorialStep = 0;
  // Skip anything already true — you may have bought a shard on your own.
  tick();
}

export function stopTutorial(): void {
  game.tutorialStep = null;
  clearHighlight();
  $('guide').hidden = true;
}

export function initTutorial(state: GameState, currentView: () => string): void {
  game = state;
  viewOf = currentView;

  ($('guide-skip') as HTMLButtonElement).onclick = stopTutorial;

  if (timer !== null) clearInterval(timer);
  timer = setInterval(tick, 250);
  paint();
}
