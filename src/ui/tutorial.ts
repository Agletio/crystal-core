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
  /**
   * Where the Fissure itself is: choosing, descending, or reading the report.
   *
   * The last one matters more than it looks. The report sits over the menu,
   * so "Enter" is hidden until you dismiss it — a step pointing at Enter from
   * there points at nothing.
   */
  phase: 'menu' | 'running' | 'results';
  /** Topmost popup, so a step can point at the right close button. */
  top: string | null;
}

export interface TutorialStep {
  id: string;
  /** A function when what to say depends on what's currently open. */
  text: string | ((ctx: GuideCtx) => string);
  /** Element to point at. A function when it depends on what's on top. */
  target: string | ((ctx: GuideCtx) => string);
  /**
   * Ring the target as well as pointing at it. Default true.
   *
   * False for steps with nothing to click. Ringing the stage put a border
   * around the whole viewport while the camera was zoomed somewhere inside
   * it, which reads as a frame around a random patch of rock.
   */
  ring?: boolean;
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

/** Id of an equipment slot's button on the character sheet. Same reason. */
export const slotButtonId = (slotId: string): string => `slot-${slotId}`;

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'enter',
    text: 'This is the Fissure — the one place you go, always open and always free. Click Enter to descend.',
    hint: 'You fight automatically. Nothing to time.',
    target: 'run-launch',
    done: (g, ctx) => ctx.phase !== 'menu' || g.firstClearDone,
  },
  {
    id: 'watch',
    text: 'You fight on your own. Clear it and something will be waiting at the exit — and everything you find only banks if you make it out.',
    hint: 'Nothing to click. What you are carrying shows here.',
    // Anchored beside the loot list rather than on the stage: there is
    // nothing to click, and a ring around the viewport of a zoomed-in camera
    // frames a random patch of rock rather than the fight.
    target: 'run-loot',
    ring: false,
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
  /**
   * One step, three targets.
   *
   * Equipping takes three clicks from inside the bench, and the first two are
   * only there because the bench is covering the button for the third. Split
   * into separate steps they'd read as busywork; as one step with a moving
   * target, the guide simply always points at the next click.
   */
  {
    id: 'equip',
    text: (ctx) =>
      ctx.view === 'bench'
        ? 'The wand is crafted. Close the Bench — the Character button is behind it.'
        : ctx.top === 'sheet'
          ? 'Click the Weapon slot, then pick the Ash Wand.'
          : 'Open Character and put the wand in your weapon slot.',
    target: (ctx) =>
      ctx.view === 'bench'
        ? 'bench-close'
        : ctx.top === 'sheet'
          ? slotButtonId('weapon')
          : 'open-character',
    done: (g) => !!g.character.equipment.weapon,
  },
  /**
   * Same moving-target trick as the equip step, and for the same reason: from
   * where you're standing when it fires, Enter is under a report, under a
   * character sheet, under a bench. It points at whatever is in the way.
   */
  {
    id: 'descend',
    text: (ctx) =>
      ctx.top === 'sheet'
        ? 'That is the loop. Close the sheet — you can afford a crystal now.'
        : ctx.top === 'bench'
          ? 'That is the loop. Close the Bench and head back down.'
          : ctx.phase === 'results'
            ? 'Your report from last time is still open. Head back to the Fissure.'
            : 'Descend again. Socket a crystal first if you have one — it makes the Fissure deadlier, and pays for it.',
    hint: 'Crystals are spent on entry, win or lose.',
    target: (ctx) =>
      ctx.top === 'sheet'
        ? 'sheet-close'
        : ctx.top === 'bench'
          ? 'bench-close'
          : ctx.phase === 'results'
            ? 'run-again'
            : 'run-launch',
    done: (_g, ctx) => ctx.phase === 'running',
  },
];

let game: GameState;
let context: () => GuideCtx = () => ({ view: 'run', phase: 'menu', top: null });
let highlighted: Element | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function clearHighlight(): void {
  highlighted?.classList.remove('guide-on');
  highlighted = null;
}

/** The scrollable box a target sits in, if any. */
function scroller(node: Element): HTMLElement | null {
  let el = node.parentElement;
  while (el && el !== document.body) {
    const overflow = getComputedStyle(el).overflowY;
    if ((overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight + 1) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

/**
 * Which way you'd have to scroll to see the target, if you can't.
 *
 * A card pinned to something below the fold went off the bottom of the window
 * with it, so the step vanished entirely and the only way to find out what to
 * do next was to scroll at random.
 */
function outOfView(target: Element): 'up' | 'down' | null {
  const box = target.getBoundingClientRect();
  // A display:none element measures 0x0 at the origin, which looks exactly
  // like "scrolled off the top" and isn't. Telling someone to scroll up to
  // reach a button that isn't rendered is worse than saying nothing.
  if (box.width === 0 && box.height === 0) return null;

  const box2 = scroller(target)?.getBoundingClientRect();
  const top = Math.max(0, box2?.top ?? 0);
  const bottom = Math.min(globalThis.innerHeight, box2?.bottom ?? globalThis.innerHeight);

  if (box.bottom <= top + 2) return 'up';
  if (box.top >= bottom - 2) return 'down';
  return null;
}

/**
 * Puts the card beside its target: under it if there's room, over it if not,
 * and clamped to the window either way. Runs every tick, because the target
 * moves — panels re-render, popups open, the dock reflows.
 */
function place(target: Element): void {
  const card = $('guide');
  const arrow = $('guide-arrow');
  const size = card.getBoundingClientRect();
  const GAP = 14;

  // When the target is scrolled out of its panel, anchor to the panel instead
  // and say which way to scroll. Following the target off-screen is how the
  // step managed to disappear completely.
  const away = outOfView(target);
  const anchor = away ? (scroller(target) ?? target) : target;
  const box = anchor.getBoundingClientRect();
  showScrollHint(away);

  // Below if it fits, inside if the target is a region big enough to hold it,
  // above otherwise. The middle case is what keeps the card off the health bar
  // during the descent: the loot panel has room to spare and the panels above
  // it are the ones you're being told to watch.
  const below = !away && box.bottom + GAP + size.height <= globalThis.innerHeight - 8;
  const inside = !below && box.height > size.height + GAP * 2;
  const raw = below
    ? box.bottom + GAP
    : inside
      ? // Hug the edge you're being sent towards, so the card and the scroll
        // it's asking for are in the same place.
        away === 'down'
        ? box.bottom - size.height - GAP
        : box.top + GAP
      : box.top - GAP - size.height;

  // Clamped last, so the card is on screen whatever the target was doing.
  const top = Math.min(Math.max(8, raw), globalThis.innerHeight - size.height - 8);

  // Centred on the anchor, then pulled back inside the window.
  const wanted = box.left + box.width / 2 - size.width / 2;
  const left = Math.min(
    Math.max(8, wanted),
    globalThis.innerWidth - size.width - 8
  );

  card.style.top = `${Math.round(top)}px`;
  card.style.left = `${Math.round(left)}px`;

  // The arrow points back at the target's centre, clamped so it stays on the
  // card's edge when the card had to slide away. Sitting inside the anchor,
  // there's nothing to point at.
  arrow.hidden = inside || !!away;
  const tip = Math.min(Math.max(box.left + box.width / 2 - left, 16), size.width - 16);
  arrow.style.left = `${Math.round(tip - 6)}px`;
  arrow.style.top = below ? '-8px' : `${Math.round(size.height - 6)}px`;
  arrow.style.transform = below ? 'rotate(45deg)' : 'rotate(225deg)';
}

function showScrollHint(away: 'up' | 'down' | null): void {
  const hint = $('guide-scroll');
  hint.hidden = away === null;
  if (!away) return;
  hint.classList.toggle('guide__scroll--up', away === 'up');
  $('guide-scroll-text').textContent =
    away === 'down' ? 'Scroll down to reach it' : 'Scroll up to reach it';
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
  $('guide-text').textContent =
    typeof step.text === 'function' ? step.text(ctx) : step.text;
  $('guide-hint').textContent = step.hint ?? '';
  $('guide-step').textContent =
    `Step ${(game.tutorialStep ?? 0) + 1} of ${TUTORIAL_STEPS.length}`;

  const id = typeof step.target === 'function' ? step.target(ctx) : step.target;
  const target = document.getElementById(id);
  const ring = step.ring !== false ? target : null;

  if (ring !== highlighted) {
    clearHighlight();
    if (ring) {
      ring.classList.add('guide-on');
      highlighted = ring;
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

/**
 * Ends it. Only a wipe calls this — there is no Skip.
 *
 * There was one, and it was a trap: waiting out a descent with nothing to
 * click, the obvious use for a button labelled Skip is "make this card go
 * away for now", and then the guide never came back for the part that
 * actually teaches you something. The opening is nine steps of exactly what
 * you were going to do anyway, so it isn't worth an escape hatch that only
 * fires by accident.
 */
export function stopTutorial(): void {
  game.tutorialStep = null;
  clearHighlight();
  $('guide').hidden = true;
}

export function initTutorial(state: GameState, ctx: () => GuideCtx): void {
  game = state;
  context = ctx;

  if (timer !== null) clearInterval(timer);
  timer = setInterval(tick, 250);
  paint();
}
