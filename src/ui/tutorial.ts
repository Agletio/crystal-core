/**
 * The guided opening.
 *
 * Runs from the very first click, not from the first clear. A new player who
 * is free to click anything clicks the wrong thing, and the wrong thing early
 * on is expensive — the whole point of the opening is that there is exactly
 * one lit button at a time and a card next to it saying why.
 *
 * The card is anchored to whatever it's pointing at rather than pinned to the
 * top of the page. It used to be a banner in the shell, which worked right up
 * until the bench became a popup: the banner ended up underneath the modal,
 * still describing a button the modal was covering.
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
 * site. The same tick repositions the card, which is what keeps it stuck to a
 * target that moved.
 */
import { balance } from '../economy';
import { benchItem } from '../game/state';
import type { GameState } from '../game/state';

const $ = (id: string) => document.getElementById(id)!;

/** What the shell knows that the game state doesn't. */
export interface GuideCtx {
  /** Which surface has focus: the bench popup, or the Fissure underneath. */
  view: 'bench' | 'run';
  /** True while a descent is actually in progress. */
  running: boolean;
  /** Topmost popup, so a step can point at the right close button. */
  top: string | null;
}

export interface TutorialStep {
  id: string;
  text: string;
  /** Element to point at. A function when it depends on what's on top. */
  target: string | ((ctx: GuideCtx) => string);
  /** Optional aside under the text — what this costs, or what to expect. */
  hint?: string;
  done(game: GameState, ctx: GuideCtx): boolean;
}

const has = (g: GameState, id: string) => balance(g.wallet, id) > 0;

/**
 * Id of a workshop recipe's button.
 *
 * Defined here rather than in the bench because the guide is the only reason
 * those buttons need identifying at all — pointing at the whole shelf and
 * saying "buy the Shard of Awakening" is exactly the ambiguity this rewrite
 * was meant to remove.
 */
export const recipeButtonId = (recipeId: string): string => `buy-${recipeId}`;

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'enter',
    text: 'This is the Fissure — the one place you go, always open and always free. Click Enter to descend.',
    hint: 'You fight automatically. Nothing to time.',
    target: 'run-launch',
    done: (g, ctx) => ctx.running || g.firstClearDone,
  },
  {
    id: 'watch',
    text: 'Clear it and something will be waiting at the exit. Loot only banks if you make it out.',
    hint: 'Nothing to click — watch.',
    target: 'run-stage',
    done: (g) => g.firstClearDone,
  },
  {
    id: 'to_bench',
    text: 'You came back with fragments and a wand. Open the Bench — everything you found is spent there.',
    target: 'open-bench',
    done: (_g, ctx) => ctx.view === 'bench',
  },
  {
    id: 'buy_awakening',
    text: 'Buy a Shard of Awakening from the Workshop. It fills every empty slot on an item at once.',
    hint: 'Costs 10 fragments.',
    target: recipeButtonId('make_shard_of_awakening'),
    done: (g) => has(g, 'shard_of_awakening'),
  },
  {
    id: 'select_weapon',
    text: 'Click your Ash Wand in the dock below to put it on the bench.',
    hint: 'The dock stays reachable under every popup.',
    target: 'inv-gear',
    done: (g) => benchItem(g)?.kind === 'gear',
  },
  {
    id: 'use_awakening',
    text: 'Now use the Shard of Awakening on it. The wand keeps its base stat; the empty slots fill with modifiers.',
    target: 'currencies',
    done: (g) => (benchItem(g)?.mods.length ?? 0) > 0,
  },
  {
    id: 'buy_chaos',
    text: 'Buy a Shard of Chaos. It re-rolls every modifier on an item — worth it when the ones you got are poor.',
    hint: 'Costs 12 fragments. Using it is your call.',
    target: recipeButtonId('make_shard_of_chaos'),
    done: (g) => has(g, 'shard_of_chaos'),
  },
  {
    id: 'equip',
    text: 'The wand is crafted. Open Character and put it in your weapon slot.',
    target: 'open-character',
    done: (g) => !!g.character.equipment.weapon,
  },
  {
    id: 'descend',
    text: 'That is the whole loop: descend, spend what drops, descend harder. Close this and go again — you can afford a crystal now, and it goes in the Fissure.',
    hint: 'A socketed crystal makes it deadlier, and pays for it.',
    target: (ctx) =>
      ctx.top === 'sheet'
        ? 'sheet-close'
        : ctx.top === 'bench'
          ? 'bench-close'
          : 'run-launch',
    done: (_g, ctx) => ctx.running,
  },
];

let game: GameState;
let context: () => GuideCtx = () => ({ view: 'run', running: false, top: null });
let highlighted: Element | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function clearHighlight(): void {
  highlighted?.classList.remove('guide-on');
  highlighted = null;
}

/**
 * Puts the card beside its target: under it if there's room, over it if not,
 * and clamped to the window either way. Runs every tick, because the target
 * moves — panels re-render, popups open, the dock reflows.
 */
function place(target: Element): void {
  const card = $('guide');
  const arrow = $('guide-arrow');
  const box = target.getBoundingClientRect();
  const size = card.getBoundingClientRect();
  const GAP = 14;

  const below = box.bottom + GAP + size.height <= globalThis.innerHeight - 8;
  const top = below ? box.bottom + GAP : Math.max(8, box.top - GAP - size.height);

  // Centred on the target, then pulled back inside the window.
  const wanted = box.left + box.width / 2 - size.width / 2;
  const left = Math.min(
    Math.max(8, wanted),
    globalThis.innerWidth - size.width - 8
  );

  card.style.top = `${Math.round(top)}px`;
  card.style.left = `${Math.round(left)}px`;

  // The arrow points back at the target's centre, clamped so it stays on the
  // card's edge when the card had to slide away.
  const tip = Math.min(Math.max(box.left + box.width / 2 - left, 16), size.width - 16);
  arrow.style.left = `${Math.round(tip - 6)}px`;
  arrow.style.top = below ? '-8px' : `${Math.round(size.height - 6)}px`;
  arrow.style.transform = below ? 'rotate(45deg)' : 'rotate(225deg)';
}

function paint(): void {
  const step = TUTORIAL_STEPS[game.tutorialStep ?? -1];
  const card = $('guide');

  if (!step) {
    card.hidden = true;
    clearHighlight();
    return;
  }

  const ctx = context();
  card.hidden = false;
  $('guide-text').textContent = step.text;
  $('guide-hint').textContent = step.hint ?? '';
  $('guide-step').textContent =
    `Step ${(game.tutorialStep ?? 0) + 1} of ${TUTORIAL_STEPS.length}`;

  const id = typeof step.target === 'function' ? step.target(ctx) : step.target;
  const target = document.getElementById(id);

  if (target !== highlighted) {
    clearHighlight();
    if (target) {
      target.classList.add('guide-on');
      highlighted = target;
    }
  }
  if (target) place(target);
}

/** Advance past every step already satisfied, then repaint. */
function tick(): void {
  if (game.tutorialStep === null) {
    paint();
    return;
  }

  const ctx = context();
  while (
    game.tutorialStep < TUTORIAL_STEPS.length &&
    TUTORIAL_STEPS[game.tutorialStep].done(game, ctx)
  ) {
    game.tutorialStep++;
  }
  if (game.tutorialStep >= TUTORIAL_STEPS.length) {
    game.tutorialStep = null;
    clearHighlight();
  }
  paint();
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

export function initTutorial(state: GameState, ctx: () => GuideCtx): void {
  game = state;
  context = ctx;

  ($('guide-skip') as HTMLButtonElement).onclick = stopTutorial;

  if (timer !== null) clearInterval(timer);
  timer = setInterval(tick, 250);
  paint();
}
