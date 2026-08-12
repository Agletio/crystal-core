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
import { INTRO, POTIONS, SKILL_BY_ID } from "../data";
import { carryRoom, craftItem, crystalsIn, gearKindOf, giftWeapon, socketed } from "../game/state";
import type { GameState } from "../game/state";
import { crystalEarned, ownedCrystals } from "../game/crystals";
import { mainSkillId, pointsAvailable, skillProgress } from "../sim/character";
import { pathToNotable } from "../skills-tree";
import { modCapacity } from "../mods";
import { keyFor, keyName } from "./keys";
import { crystalMoveId } from "./crystals";
import { crystalSlotId } from "./craft";
import type { Item } from "../types";
import { unparkPanels } from './rail';

const $ = (id: string) => document.getElementById(id)!;

/** What the shell knows that the game state doesn't. */
export interface GuideCtx {
  /** Which surface has focus: the crafting popup, or the Fissure underneath. */
  view: "craft" | "run";
  /** Choosing, descending, in a room, or reading the report. Hides Enter. */
  phase: "menu" | "running" | "scene" | "results";
  /** Topmost popup, so a step can point at the right close button. */
  top: string | null;
  /** The slot waiting to be filled: picking one moves the next click to the dock. */
  picking: string | null;
  /** Whether the dock is up: a step pointing INTO it has to open it first. */
  dock: boolean;
  /** Which shelf the Skills screen is on, and whose web is up. Both null
   *  anywhere else, so a step can walk you all the way down to a node. */
  category: string | null;
  viewing: string | null;
}

export interface TutorialStep {
  id: string;
  /** A function when what to say depends on what's open, or on what you hold. */
  text: string | ((ctx: GuideCtx, game: GameState) => string);
  /** Element to point at. A function when it depends on the state. */
  target: string | ((ctx: GuideCtx, game: GameState) => string);
  /** Default true; false for steps with nothing to click. */
  ring?: boolean | ((ctx: GuideCtx) => boolean);
  /** Optional aside under the text — what this costs, or what to expect. A
   *  function when it names something the player can rebind. */
  hint?: string | ((ctx: GuideCtx, game: GameState) => string);
  /**
   * True while the step cannot be reached yet — a level away, a crystal that
   * has to grow. The card goes, the lockdown drops and nothing advances: the
   * opening is DORMANT rather than following you about with something you
   * cannot do. It comes back the moment this turns false.
   */
  waits?(game: GameState, ctx: GuideCtx): boolean;
  done(game: GameState, ctx: GuideCtx): boolean;
}

const has = (g: GameState, id: string) => balance(g.wallet, id) > 0;

/** The keys the flasks are on, as they are actually bound: a rebound key has
 *  to say what it is rather than what the table shipped. */
const flaskKeys = (g: GameState): string =>
  POTIONS.map((p) => keyName(keyFor(g, p.binding))).join(" and ");

/** Here rather than in the shop: the guide is the only reason they need ids. */
export const recipeButtonId = (recipeId: string): string => `buy-${recipeId}`;

/** Id of an equipment slot's button on the character sheet. Same reason. */
export const slotButtonId = (slotId: string): string => `slot-${slotId}`;

/** Id of one item's slot in the dock. Same reason again. */
export const dockSlotId = (itemId: string): string => `dock-${itemId}`;

/** The three depths of the Skills screen, for the same reason once more. */
export const skillCatId = (categoryId: string): string => `skillcat-${categoryId}`;
export const skillRowId = (skillId: string): string => `skillrow-${skillId}`;
export const skillNodeId = (nodeId: string): string => `skillnode-${nodeId}`;

const isWeapon = (i: Item) => i.kind === 'gear' && gearKindOf(i) === 'weapon';

/** A fallback, for a save written before the gift was marked. */
const anyWeapon = (g: GameState): Item | undefined =>
  g.inventory.find((i) => isWeapon(i) && i.mods.length === 0) ?? g.inventory.find(isWeapon);

const given = (g: GameState): Item | undefined => {
  const gift = giftWeapon(g);
  return (gift && g.inventory.includes(gift) ? gift : undefined) ?? anyWeapon(g);
};

/** The weapon in the dock, or the way in when the dock is shut. */
const theWeapon = (g: GameState, ctx: GuideCtx): string => {
  if (!ctx.dock) return 'open-inventory';
  const item = given(g);
  return item ? dockSlotId(item.id) : slotButtonId('weapon');
};

/** Its own name. The Lampwright hands over what the chosen skill swings, so a
 *  step naming one base is a step that lies to half the characters. */
const itsName = (g: GameState): string => given(g)?.name ?? 'weapon';

/** Whether Take what fits would do anything. Ringing a disabled button is a
 *  step with nothing to click, which the guide reports as being stuck. */
const takeable = (g: GameState): boolean =>
  g.haul.some((i) => carryRoom(g, i.kind) > 0);

/** The active skill's tree, and how far off a notable is from where it stands. */
const treeOf = (g: GameState) => {
  const skillId = mainSkillId(g.character);
  const progress = skillProgress(g.character, skillId);
  return { skillId, progress, path: pathToNotable(skillId, progress.allocated) };
};

/** Out of whatever covers the header, into Skills, down two shelves, then the
 *  WEB — which node to take is the decision the tree exists to hand over, and
 *  `.web__node--open` is what a free point makes clickable. Its WRAPPER, which
 *  clips: an outline on the svg inside is drawn where nobody sees it. */
function towardWeb(ctx: GuideCtx, g: GameState): string {
  if (ctx.top !== "skills") return viaHeader(ctx, "open-skills");
  const { skillId } = treeOf(g);
  const category = SKILL_BY_ID[skillId]?.category;
  if (!category) return "skills-close";
  if (ctx.viewing !== null && ctx.viewing !== skillId) return "skills-back";
  if (ctx.category !== null && ctx.category !== category) return "skills-back";
  if (ctx.category === null) return skillCatId(category);
  if (ctx.viewing === null) return skillRowId(skillId);
  return "skills-webwrap";
}

/** The crystal a modifier could go on, else the first one you hold. Socketed
 *  ones are in the bench's column too, which is where this points. */
const roomyCrystal = (g: GameState): Item | undefined => {
  const all = ownedCrystals(g);
  return all.find((c) => modCapacity(c) > c.mods.length) ?? all[0];
};

const theCrystal = (g: GameState): string => {
  const held = roomyCrystal(g);
  return held ? crystalSlotId(held.id) : "craft-crystals";
};

const theCrystalRow = (g: GameState): string => {
  const held = crystalsIn(g)[0];
  return held ? crystalMoveId(held.id) : "crystals-list";
};

/** Every popup's own way out, so a step can point at whichever one is up. */
const CLOSES: Record<string, string> = {
  haul: 'haul-close',
  stash: 'stash-close',
  shop: 'shop-close',
  sheet: 'sheet-close',
  skills: 'skills-close',
  trade: 'trade-close',
  history: 'history-close',
  save: 'save-close',
  craft: 'craft-close',
  crystals: 'crystals-close',
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
    hint: (_ctx, g) =>
      `You fight on your own — except the flasks. ${flaskKeys(g)}, ${POTIONS[0].charges} charges each a descent, ` +
      'and they fire themselves when you get low.',
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
  // The clear ends at the mouth, but the hero has a stride to walk first — so
  // this is reached BEFORE the panel is up, and may not end on the panel being
  // shut. It ends on the thing having been handed over.
  {
    id: "meet",
    text: (ctx) =>
      ctx.top === "met"
        ? "Take what they are holding."
        : "The way up came out somewhere else.",
    hint: "Everything you are ever given is handed over in person, on a run you finished.",
    target: (ctx) => (ctx.top === "met" ? "met-take" : viaHeader(ctx, "run-loot")),
    ring: (ctx) => ctx.top === "met" || ctx.phase !== "running",
    done: (g, ctx) => ctx.top !== "met" && (g.given ?? []).includes("weapon"),
  },
  {
    id: "take_haul",
    text: (ctx) =>
      ctx.top === "haul"
        ? "Take what fits."
        : blocked(ctx)
          ? "Close this — your loot is in the Haul."
          : "Your drops went to the Haul. Open it.",
    hint: "A cleared run banks there, never into your bags. Full haul, and the Fissure shuts until you clear it.",
    target: (ctx) => (ctx.top === "haul" ? "haul-take" : viaHeader(ctx, "open-haul")),
    done: (g) => g.haul.length === 0,
  },
  {
    id: "to_shop",
    text: (ctx) =>
      blocked(ctx) ? "Close this — the Shop is behind it." : "Open the Shop.",
    target: (ctx) => viaHeader(ctx, "open-shop"),
    done: (_g, ctx) => ctx.top === "shop" || has(_g, "shard_of_making"),
  },
  {
    id: "buy_making",
    text: (ctx) =>
      ctx.top === "shop"
        ? "Buy a Shard of Making."
        : blocked(ctx)
          ? "Close this to get back to the Shop."
          : "Open the Shop and buy a Shard of Making.",
    hint: "The only currency the shop sells. Everything else at the bench drops.",
    target: (ctx) =>
      ctx.top === "shop"
        ? recipeButtonId("make_shard_of_making")
        : viaHeader(ctx, "open-shop"),
    done: (g) => has(g, "shard_of_making"),
  },
  {
    id: "select_weapon",
    text: (ctx, g) =>
      ctx.top === "shop"
        ? "Close the Shop."
        : ctx.view === "craft"
          ? `Click your ${itsName(g)} in the dock.`
          : blocked(ctx)
            ? "Close this and open Crafting."
            : "Open Crafting.",
    target: (ctx, g) =>
      ctx.top === "shop"
        ? "shop-close"
        : ctx.view === "craft"
          ? theWeapon(g, ctx)
          : viaHeader(ctx, "open-craft"),
    // THE weapon. Every looser reading — any gear, any blank weapon — let a
    // first run's drops satisfy this step, and with it the next one.
    done: (g) => craftItem(g)?.meta.firstClear === true,
  },
  {
    id: "use_making",
    text: "Click the Shard of Making.",
    hint: "It is a tier 1 base: two modifiers, and nothing at the bench raises that. A bigger one is something you go and find.",
    target: "inv-currency",
    done: (g) => (craftItem(g)?.mods.length ?? 0) > 0,
  },
  {
    id: "equip",
    text: (ctx, g) =>
      ctx.top === "sheet"
        ? ctx.picking
          ? `Click the ${itsName(g)} in the dock.`
          : "Click the Weapon slot."
        : blocked(ctx)
          ? "Close this and open Character."
          : "Open Character.",
    target: (ctx, g) =>
      ctx.top === "sheet"
        ? // Once a slot is picked the gear is what you click, and it is in the
          // dock — ringing the slot lights the button you just pressed.
          ctx.picking
          ? theWeapon(g, ctx)
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
          : "Go again.",
    hint: "The Fissure is always open, and an empty set is a real descent.",
    target: (ctx) =>
      viaHeader(ctx, ctx.phase === "results" ? "run-again" : "run-launch"),
    done: (_g, ctx) => ctx.phase === "running",
  },
  // Sleeps between levels, and ends on `crystalEarned` itself — so the opening
  // cannot finish teaching and leave the crystal out of reach.
  {
    id: "spend_points",
    waits: (g) => treeOf(g).progress.level < INTRO.crystalSkillLevel,
    text: (ctx, g) => {
      if (ctx.top !== "skills") {
        return blocked(ctx) ? "Close this and open Skills." : "Open Skills.";
      }
      const { skillId, progress, path } = treeOf(g);
      const name = SKILL_BY_ID[skillId]?.name ?? "your skill";
      if (ctx.viewing !== skillId) return `Open ${name}.`;
      const spare = pointsAvailable(progress);
      const near = path[0] ? ` ${path[0].name} is ${path.length} away.` : "";
      return `Spend ${spare === 1 ? "your point" : `all ${spare} points`}.${near}`;
    },
    hint: "1 point every skill level, and a point spent is what the tree costs. The big nodes are the reason to walk in a direction and the run of small ones in front of one is its whole price — but which direction is yours. Nothing here is permanent: a node refunds when you click it again.",
    target: towardWeb,
    done: crystalEarned,
  },
  // Dormant until the clear that the notable bought puts someone at the mouth.
  {
    id: "meet_crystal",
    waits: (_g, ctx) => ctx.top !== "met",
    text: "Take what they are holding.",
    target: "met-take",
    // BOTH, and the panel half is not decoration: granting the crystal and
    // shutting the panel are a tick apart, and a step that ended on the grant
    // alone rang the next one's button underneath a popup that was still up.
    done: (g, ctx) => ctx.top !== "met" && (g.given ?? []).includes("crystal"),
  },
  {
    id: "socket",
    // A meeting ends a descent, and every ending opens the haul — so this step
    // is reached with a full one on top of it. Empty it rather than saying
    // "close this", which is the opposite of what step 4 taught.
    text: (ctx, g) =>
      ctx.top === "haul"
        ? takeable(g)
          ? "Take what fits — this run banked too."
          : "Nothing here fits. Close it and carry on."
        : ctx.top === "crystals"
          ? "Socket it."
          : blocked(ctx)
            ? "Close this and open Crystals."
            : "Open Crystals.",
    hint: "Four sockets, permanent. Their count is how long a descent is; what is rolled on them is the whole of how hard. This one is level 1 and holds 0 modifiers, so all it does yet is make the descent longer.",
    target: (ctx, g) =>
      ctx.top === "haul"
        ? takeable(g)
          ? "haul-take"
          : "haul-close"
        : ctx.top === "crystals"
          ? theCrystalRow(g)
          : viaHeader(ctx, "open-crystals"),
    done: (g) => socketed(g).length > 0,
  },
  // And dormant again until being used has bought that crystal a slot. The
  // craft is TRIGGERED by the level, never queued behind the meeting.
  {
    id: "bench_crystal",
    waits: (g) => !ownedCrystals(g).some((c) => modCapacity(c) > c.mods.length),
    text: (ctx, g) =>
      ctx.top === "haul"
        ? takeable(g)
          ? "Take what fits first."
          : "Nothing here fits. Close it and carry on."
        : ctx.view === "craft"
          ? "Click your crystal, beside the bench."
          : blocked(ctx)
            ? "Close this and open Crafting."
            : "Your crystal levelled and has room in it now. Open Crafting.",
    hint: "A crystal is never carried, so the column beside the bench is the only way one gets worked on — a socketed one is in there too.",
    target: (ctx, g) =>
      ctx.top === "haul"
        ? takeable(g)
          ? "haul-take"
          : "haul-close"
        : ctx.view === "craft"
          ? theCrystal(g)
          : viaHeader(ctx, "open-craft"),
    done: (g) => craftItem(g)?.kind === "crystal",
  },
  // The shard was handed over with the crystal, several descents ago. Spend it
  // elsewhere and the way back is the shop, which is what the first clear's
  // gold has been sitting there for.
  {
    id: "craft_crystal",
    text: (ctx, g) =>
      has(g, INTRO.scriptedCurrency)
        ? "Click the Shard of Making."
        : ctx.top === "shop"
          ? "Buy a Shard of Making."
          : blocked(ctx)
            ? "Close this — you need another Shard of Making."
            : "You spent your shard. Open the Shop.",
    hint: "One modifier. Every crystal modifier is a downside, and what the descent pays is derived from it.",
    target: (ctx, g) =>
      has(g, INTRO.scriptedCurrency)
        ? "inv-currency"
        : ctx.top === "shop"
          ? recipeButtonId("make_shard_of_making")
          : viaHeader(ctx, "open-shop"),
    done: (g) => (craftItem(g)?.mods.length ?? 0) > 0,
  },
];

let game: GameState;
let context: () => GuideCtx = () => ({
  view: "run",
  phase: "menu",
  top: null,
  picking: null,
  dock: true,
  category: null,
  viewing: null,
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
 * currency you spend from the dock. The opening hands out a fixed amount of
 * gold and asks for two specific purchases, and no wording recovers from
 * spending it elsewhere. Everything else is free or reversible.
 */
const SPENDS = ".buy, #inv-currency .slot";

/** In CSS rather than a flag threaded through six renders that know no tutorial. */
function setLock(on: boolean): void {
  document.body.classList.toggle("guided", on);
}

/**
 * Dormancy, said out loud. A hidden card means FINISHED to everything looking
 * in from outside, and an opening waiting for a level is not finished.
 */
function setWaiting(id: string | null): void {
  if (id === null) delete document.body.dataset.guideWaiting;
  else document.body.dataset.guideWaiting = id;
}

/** The step the opening is asleep on, or null. */
export const guideWaitingOn = (): string | null =>
  document.body.dataset.guideWaiting ?? null;

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
  const ctx = context();
  const dormant = step?.waits?.(game, ctx) === true;

  if (!step || dormant) {
    card.hidden = true;
    setLock(false);
    clearHighlight();
    setWaiting(dormant ? step.id : null);
    return;
  }
  setWaiting(null);
  setLock(true);

  card.hidden = false;
  $("guide-text").textContent =
    typeof step.text === "function" ? step.text(ctx, game) : step.text;
  $("guide-hint").textContent =
    typeof step.hint === "function" ? step.hint(ctx, game) : (step.hint ?? "");
  $("guide-step").textContent =
    `Step ${(game.tutorialStep ?? 0) + 1} of ${TUTORIAL_STEPS.length}`;

  const id = typeof step.target === "function" ? step.target(ctx, game) : step.target;
  // Parked panels hide most of what a step points at.
  unparkPanels();
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
  setWaiting(null);
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
