/**
 * The guided opening: one lit control at a time and a card beside it saying
 * why. The card is anchored to what it points at, not pinned to the shell, so
 * it follows targets inside popups.
 *
 * The ring is a suggestion, not a cage: only SPENDING is switched off, so a
 * step names the way back out of the wrong screen rather than refusing clicks.
 *
 * Steps are DATA with a `done` predicate, never a script of callbacks, so the
 * tutorial can never desynchronise — wander off and buy the shard early and the
 * step is already satisfied. Progress is checked on a timer rather than threaded
 * through six modules' renders, and the same tick repositions the card.
 */
import { balance } from "../economy";
import { qualityOf } from "../mods";
import { craftItem, gearKindOf, giftWeapon } from "../game/state";
import type { GameState } from "../game/state";
import type { Item } from "../types";

const $ = (id: string) => document.getElementById(id)!;

/** What the shell knows that the game state doesn't. */
export interface GuideCtx {
  /** Which surface has focus: the crafting popup, or the Fissure underneath. */
  view: "craft" | "run";
  /** Choosing, descending, or reading the report — which hides Enter. */
  phase: "menu" | "running" | "results";
  /** Topmost popup, so a step can point at the right close button. */
  top: string | null;
  /** The slot waiting to be filled: picking one moves the next click to the dock. */
  picking: string | null;
}

export interface TutorialStep {
  id: string;
  /** A function when what to say depends on what's currently open. */
  text: string | ((ctx: GuideCtx) => string);
  /** Element to point at. A function when it depends on the state. */
  target: string | ((ctx: GuideCtx, game: GameState) => string);
  /** Default true; false for steps with nothing to click. */
  ring?: boolean | ((ctx: GuideCtx) => boolean);
  /** Optional aside under the text — what this costs, or what to expect. */
  hint?: string;
  done(game: GameState, ctx: GuideCtx): boolean;
}

const has = (g: GameState, id: string) => balance(g.wallet, id) > 0;

/** Here rather than in the shop: the guide is the only reason they need ids. */
export const recipeButtonId = (recipeId: string): string => `buy-${recipeId}`;

/** Id of an equipment slot's button on the character sheet. Same reason. */
export const slotButtonId = (slotId: string): string => `slot-${slotId}`;

/** Id of one item's slot in the dock. Same reason again. */
export const dockSlotId = (itemId: string): string => `dock-${itemId}`;

const isWeapon = (i: Item) => i.kind === 'gear' && gearKindOf(i) === 'weapon';

/** A fallback, for a save written before the wand was marked. */
const anyWeapon = (g: GameState): Item | undefined =>
  g.inventory.find((i) => isWeapon(i) && qualityOf(i) === 'rough') ?? g.inventory.find(isWeapon);

/** The wand itself, if it is still in the dock to be clicked. */
const theWand = (g: GameState): string => {
  const gift = giftWeapon(g);
  const item = (gift && g.inventory.includes(gift) ? gift : undefined) ?? anyWeapon(g);
  return item ? dockSlotId(item.id) : slotButtonId('weapon');
};

/** Every popup's own way out, so a step can point at whichever one is up. */
const CLOSES: Record<string, string> = {
  stash: 'stash-close',
  shop: 'shop-close',
  sheet: 'sheet-close',
  skills: 'skills-close',
  history: 'history-close',
  save: 'save-close',
  craft: 'craft-close',
};

/**
 * Getting to a header button from wherever you are. The header sits UNDER every
 * popup, so pointing straight at "Shop" points at something you cannot click.
 * Returns the next click on the way: a close button, then the button itself.
 * With only spending locked, this is what walks you out of the wrong screen.
 */
function viaHeader(ctx: GuideCtx, button: string): string {
  if (ctx.top && CLOSES[ctx.top]) return CLOSES[ctx.top];
  if (ctx.view === 'craft') return CLOSES.craft;
  return button;
}

/** True when something is covering the header. */
const blocked = (ctx: GuideCtx): boolean =>
  ctx.top !== null || ctx.view === 'craft';

/** Text is the instruction; `hint` is a rule the screen cannot show. Nothing else. */
export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "enter",
    text: (ctx) => (blocked(ctx) ? "Close this — the Fissure is behind it." : "Enter the Fissure."),
    hint: "You fight on your own. Nothing to time.",
    target: (ctx) => viaHeader(ctx, "run-launch"),
    done: (g, ctx) => ctx.phase !== "menu" || g.firstClearDone,
  },
  {
    id: "watch",
    text: (ctx) =>
      ctx.phase === "running"
        ? blocked(ctx)
          ? "Close this and watch."
          : "Clear it."
        : blocked(ctx)
          ? "Close this and go again."
          : "That run ended early. Go again.",
    hint: "Loot only banks if you make it out.",
    // Beside the loot list rather than on the stage: a ring around the viewport
    // of a zoomed-in camera frames a random patch of rock rather than the fight.
    target: (ctx) =>
      ctx.phase === "running"
        ? viaHeader(ctx, "run-loot")
        : viaHeader(ctx, ctx.phase === "results" ? "run-again" : "run-launch"),
    // A reload loses the run in progress, and this step only ends on a clear —
    // so whenever nothing is running there has to be something lit, or the
    // step is one nobody can finish.
    ring: (ctx) => blocked(ctx) || ctx.phase !== "running",
    done: (g) => g.firstClearDone,
  },
  {
    id: "to_shop",
    text: (ctx) =>
      blocked(ctx) ? "Close this — the Shop is behind it." : "Open the Shop.",
    target: (ctx) => viaHeader(ctx, "open-shop"),
    done: (_g, ctx) => ctx.top === "shop" || has(_g, "shard_of_awakening"),
  },
  {
    id: "buy_seaming",
    text: (ctx) =>
      ctx.top === "shop"
        ? "Buy a Shard of Seaming."
        : blocked(ctx)
          ? "Close this to get back to the Shop."
          : "Open the Shop and buy a Shard of Seaming.",
    hint: "Your wand is Rough — it has no room for a modifier until this opens one.",
    target: (ctx) =>
      ctx.top === "shop"
        ? recipeButtonId("make_shard_of_seaming")
        : viaHeader(ctx, "open-shop"),
    done: (g) => has(g, "shard_of_seaming"),
  },
  {
    id: "select_weapon",
    text: (ctx) =>
      ctx.top === "shop"
        ? "Close the Shop."
        : ctx.view === "craft"
          ? "Click your Ash Wand in the dock."
          : blocked(ctx)
            ? "Close this and open Crafting."
            : "Open Crafting.",
    target: (ctx, g) =>
      ctx.top === "shop"
        ? "shop-close"
        : ctx.view === "craft"
          ? theWand(g)
          : viaHeader(ctx, "open-craft"),
    // THE wand. Every looser reading — any gear, any Rough weapon — let a first
    // run's drops satisfy this step, and with it the next one, which waits for
    // a modifier that was already there.
    done: (g) => craftItem(g)?.meta.firstClear === true,
  },
  {
    id: "use_seaming",
    text: "Click the Shard of Seaming.",
    target: "inv-currency",
    done: (g) => (craftItem(g)?.mods.length ?? 0) > 0,
  },
  {
    id: "buy_making",
    text: (ctx) =>
      ctx.top === "shop"
        ? "Buy a Shard of Making."
        : blocked(ctx)
          ? "Close this — the Shop is behind it."
          : "Back to the Shop.",
    hint: "A Seamed item holds two modifiers. Your wand is using one.",
    target: (ctx) =>
      ctx.top === "shop"
        ? recipeButtonId("make_shard_of_making")
        : viaHeader(ctx, "open-shop"),
    done: (g) => has(g, "shard_of_making"),
  },
  {
    id: "equip",
    text: (ctx) =>
      ctx.top === "sheet"
        ? ctx.picking
          ? "Click the Ash Wand in the dock."
          : "Click the Weapon slot."
        : blocked(ctx)
          ? "Close this and open Character."
          : "Open Character.",
    target: (ctx, g) =>
      ctx.top === "sheet"
        ? // Once a slot is picked the gear is what you click, and it is in the
          // dock — ringing the slot lights the button you just pressed.
          ctx.picking
          ? theWand(g)
          : slotButtonId("weapon")
        : viaHeader(ctx, "open-character"),
    done: (g) => !!g.character.equipment.weapon,
  },
  /** Enter is under a report, a sheet and a bench: point at whatever is in the way. */
  {
    id: "descend",
    text: (ctx) =>
      ctx.top === "sheet" || blocked(ctx)
        ? "Close this and go again."
        : ctx.phase === "results"
          ? "Back to the Fissure."
          : "Go again. Socket a crystal first if you have one.",
    hint: "A crystal makes the Fissure deadlier and pays for it. Spent on entry, win or lose.",
    target: (ctx) =>
      viaHeader(ctx, ctx.phase === "results" ? "run-again" : "run-launch"),
    done: (_g, ctx) => ctx.phase === "running",
  },
];

let game: GameState;
let context: () => GuideCtx = () => ({
  view: "run",
  phase: "menu",
  top: null,
  picking: null,
});
let highlighted: Element | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

function clearHighlight(): void {
  highlighted?.classList.remove("guide-on");
  highlighted = null;
}

/** The scrollable box a target sits in, if any. */
function scroller(node: Element): HTMLElement | null {
  let el = node.parentElement;
  while (el && el !== document.body) {
    const overflow = getComputedStyle(el).overflowY;
    if (
      (overflow === "auto" || overflow === "scroll") &&
      el.scrollHeight > el.clientHeight + 1
    ) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

/** Which way to scroll to reach the target — a card that follows one below the
 * fold goes off screen with it, taking the step with it. */
function outOfView(target: Element): "up" | "down" | null {
  const box = target.getBoundingClientRect();
  // A display:none element measures 0x0 at the origin, which looks exactly
  // like "scrolled off the top" and isn't. Telling someone to scroll up to
  // reach a button that isn't rendered is worse than saying nothing.
  if (box.width === 0 && box.height === 0) return null;

  const box2 = scroller(target)?.getBoundingClientRect();
  const top = Math.max(0, box2?.top ?? 0);
  const bottom = Math.min(
    globalThis.innerHeight,
    box2?.bottom ?? globalThis.innerHeight,
  );

  if (box.bottom <= top + 2) return "up";
  if (box.top >= bottom - 2) return "down";
  return null;
}

/** Matches the run view's stacking rule, which is what puts targets below the fold. */
const STACKED = 900;

/**
 * Parks the card over the dock when following the target would cover the map.
 * Only when stacked AND the target is off-screen; returns whether it took over.
 */
function parkOverDock(
  card: HTMLElement,
  arrow: HTMLElement,
  away: "up" | "down" | null,
): boolean {
  if (!away || globalThis.innerWidth > STACKED) return false;
  const dock = document.getElementById("dock");
  if (!dock) return false;

  const box = dock.getBoundingClientRect();
  const size = card.getBoundingClientRect();

  // Clearing the map beats centring on the dock. On a short screen the dock
  // sits high enough that a dock-centred card still clips the canvas, and the
  // whole point of moving was to stop covering the fight.
  const map =
    document.getElementById("run-canvas") ??
    document.getElementById("run-stage");
  const floor = map ? map.getBoundingClientRect().bottom + 8 : 0;

  const top = Math.min(
    Math.max(8, floor, box.top + (box.height - size.height) / 2),
    globalThis.innerHeight - size.height - 8,
  );
  card.style.top = `${Math.round(top)}px`;
  card.style.left = `${Math.round(Math.max(8, (globalThis.innerWidth - size.width) / 2))}px`;
  // Nothing to point at: the card is deliberately not beside its target.
  arrow.hidden = true;
  return true;
}

/** Beside the target, clamped to the window. Every tick, because targets move. */
function place(target: Element, coverable: boolean): void {
  const card = $("guide");
  const arrow = $("guide-arrow");
  const size = card.getBoundingClientRect();
  const GAP = 14;

  // When the target is scrolled out of its panel, anchor to the panel instead
  // and say which way to scroll. Following the target off-screen is how the
  // step managed to disappear completely.
  const away = outOfView(target);
  // Placed ABOVE, the card has to clear the target's caption too — the dock's
  // section labels sit outside the slot grid they name, so anchoring to the
  // grid alone put the card straight through the word "CURRENCY".
  const anchor = away
    ? (scroller(target) ?? target)
    : (target.closest('.dockcol') ?? target);
  const box = anchor.getBoundingClientRect();
  showScrollHint(away);

  // Stacked, the fallback of sitting INSIDE the scroller puts the card on the
  // fight. The dock is the one region worth covering instead.
  if (parkOverDock(card, arrow, away)) return;

  // Below if it fits, inside if the target is a region big enough to hold it,
  // above otherwise. `coverable` gates the middle case: sitting inside a target
  // is only acceptable when the step has nothing to click, or "click your wand
  // in the dock" ends up printed on top of the wand.
  const below =
    !away && box.bottom + GAP + size.height <= globalThis.innerHeight - 8;
  const inside = coverable && !below && box.height > size.height + GAP * 2;
  const raw = below
    ? box.bottom + GAP
    : inside
      ? // Hug the edge you're being sent towards, so the card and the scroll
        // it's asking for are in the same place.
        away === "down"
        ? box.bottom - size.height - GAP
        : box.top + GAP
      : box.top - GAP - size.height;

  // Clamped last, so the card is on screen whatever the target was doing.
  const top = Math.min(
    Math.max(8, raw),
    globalThis.innerHeight - size.height - 8,
  );

  // Centred on the anchor, then pulled back inside the window.
  const wanted = box.left + box.width / 2 - size.width / 2;
  const left = Math.min(
    Math.max(8, wanted),
    globalThis.innerWidth - size.width - 8,
  );

  card.style.top = `${Math.round(top)}px`;
  card.style.left = `${Math.round(left)}px`;

  // The arrow points back at the target's centre, clamped so it stays on the
  // card's edge when the card had to slide away. Sitting inside the anchor,
  // there's nothing to point at.
  arrow.hidden = inside || !!away;
  const tip = Math.min(
    Math.max(box.left + box.width / 2 - left, 16),
    size.width - 16,
  );
  arrow.style.left = `${Math.round(tip - 6)}px`;
  arrow.style.top = below ? "-8px" : `${Math.round(size.height - 6)}px`;
  arrow.style.transform = below ? "rotate(45deg)" : "rotate(225deg)";
}

function showScrollHint(away: "up" | "down" | null): void {
  const hint = $("guide-scroll");
  hint.hidden = away === null;
  if (!away) return;
  hint.classList.toggle("guide__scroll--up", away === "up");
  $("guide-scroll-text").textContent =
    away === "down" ? "Scroll down to reach it" : "Scroll up to reach it";
}

/**
 * The whole of the lockdown: the shop's shelves, the stash upgrade, and the
 * currency you spend from the dock. The opening hands out a fixed number of
 * fragments and asks for two specific purchases, and no wording recovers from
 * spending them elsewhere. Everything else is free or reversible.
 */
const SPENDS = ".buy, #inv-currency .slot";

/** In CSS rather than a flag threaded through six renders that know no tutorial. */
function setLock(on: boolean): void {
  document.body.classList.toggle("guided", on);
}

/** True while the guided opening owns the screen. */
export const isGuided = (): boolean => document.body.classList.contains("guided");

/**
 * The other half of the lock. `pointer-events: none` stops a mouse and a finger
 * but NOT a keyboard — a blocked button is still focusable and still fires on
 * Enter. `inert` covers both but cannot be undone on a descendant, so it cannot
 * wrap a subtree containing the target.
 *
 * Capture phase. Tabbing is still allowed; spending by keyboard is not.
 */
function guardKeys(event: KeyboardEvent): void {
  if (!isGuided()) return;
  if (event.key !== "Enter" && event.key !== " " && event.key !== "Spacebar") return;

  const target = event.target as Element | null;
  if (!target || !("closest" in target)) return;
  // Only what CSS switched off, or the keyboard would be the stricter half.
  if (!target.closest(SPENDS)) return;
  if (target.closest(".guide-on")) return;

  event.preventDefault();
  event.stopPropagation();
}

function paint(): void {
  const step = TUTORIAL_STEPS[game.tutorialStep ?? -1];
  const card = $("guide");

  if (!step) {
    card.hidden = true;
    setLock(false);
    clearHighlight();
    return;
  }
  setLock(true);

  const ctx = context();
  card.hidden = false;
  $("guide-text").textContent =
    typeof step.text === "function" ? step.text(ctx) : step.text;
  $("guide-hint").textContent = step.hint ?? "";
  $("guide-step").textContent =
    `Step ${(game.tutorialStep ?? 0) + 1} of ${TUTORIAL_STEPS.length}`;

  const id = typeof step.target === "function" ? step.target(ctx, game) : step.target;
  const target = document.getElementById(id);
  const wants = typeof step.ring === "function" ? step.ring(ctx) : step.ring !== false;
  const ring = wants ? target : null;

  if (ring !== highlighted) {
    clearHighlight();
    if (ring) {
      ring.classList.add("guide-on");
      highlighted = ring;
    }
  }
  if (target) place(target, !wants);
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
 * Ends it. Only a wipe calls this: there is no Skip, because during the descent
 * "make this card go away for now" is what a Skip button reads as, and the guide
 * would never come back for the steps that teach you something.
 */
export function stopTutorial(): void {
  game.tutorialStep = null;
  clearHighlight();
  setLock(false);
  $("guide").hidden = true;
}

export function initTutorial(state: GameState, ctx: () => GuideCtx): void {
  game = state;
  context = ctx;

  if (timer !== null) clearInterval(timer);
  timer = setInterval(tick, 250);
  document.addEventListener("keydown", guardKeys, true);
  paint();
}
