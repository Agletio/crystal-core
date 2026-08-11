/**
 * The Fissure, in three states: prepare, descend, read the result. There is only
 * one place you go; crystals empower it rather than replacing it, so Enter is
 * never disabled and an empty set is a legitimate run.
 *
 * Owns real time and nothing else — the sim advances in fixed TICK steps, so a
 * janky frame changes how fast you watch a run, never its outcome. Sockets are
 * PERMANENT: a run reads them and never spends them.
 */
import { Rng } from '../rng';
import { RunSim, TICK } from '../sim/run';
import type { RunEvent, RunState } from '../sim/run';
import { characterStats } from '../sim/stats';
import { attributePointsLeft, xpToNext } from '../sim/character';
import { describeMod } from '../crafting';
import { compositionText, crystalFamily, farmingText, runSet, setRows } from '../sim/crystal';
import { FAMILY_BY_ID, LAMPWRIGHT, POTIONS, RUN_SLOTS, THEME_BY_ID } from '../data';
import { crystalsIn, haulFull, socketed, unsocket } from '../game/state';
import type { GameState } from '../game/state';
import { crystalProgress, giftWaiting } from '../game/crystals';
import { buildReport, lootRows } from '../game/report';
import type { RunReport } from '../game/report';
import { openHaul } from './haul';
import type { Waiting } from '../game/crystals';
import { openMet } from './met';
import { openCrystals } from './crystals';
import { isGuided } from './tutorial';
import { createCanvasRenderer } from '../render/canvas2d';
import { createPixiRenderer } from '../render/pixi';
import { ZOOM_STEP, clampZoom, defaultZoom, readPalette } from '../render/renderer';
import type { Palette, Renderer } from '../render/renderer';
import { renderInventory, setInventoryHandler } from './inventory';
import { keyFor, keyName } from './keys';
import { note } from './history';
import { badge } from './badge';
import type { Item } from '../types';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

export type Phase = 'menu' | 'running' | 'results';

/** Gear drops named in the report before it starts counting instead. */
const LOOT_ROWS = 6;

let game: GameState;
let sim: RunSim | null = null;
let renderer: Renderer | null = null;
let phase: Phase = 'menu';
let playing = false;
let accumulator = 0;
let lastFrame = 0;
let seed = 0;
/** Descents cleared without stopping. Reset by the click that starts the loop. */
let streak = 0;
/** Why the loop stopped, for the card that reports it. */
let halt: 'died' | 'full' | 'once' | 'left' | 'chose' | 'met' = 'once';
/** Armed mid-descent: finish this one, bank it, and do not go back down. */
let leaving = false;

/**
 * The handover between descents: down the hole at the exit, dark for the
 * moment the map is swapped, out of the entrance of the next one. Short,
 * because it plays twenty times in a session. Nothing in `src/sim` knows it
 * exists — this is the UI declining to tick for a moment while it draws.
 */
const HANDOVER = 1.2;
/** How much of it is going down. The rest is climbing out of the next one. */
const DESCEND = 0.45;
/** Seconds into the handover, or 0 when there is not one. */
let handover = 0;
/** The descent the handover is leaving, already built and already banked. */
let banked: RunReport | null = null;
/** Set to `banked` when the loop is stopping and the drop has still to play. */
let pending: RunReport | null = null;
/** Held while the Lampwright is being walked to, for `land()` afterwards. */
let greeted: RunReport | null = null;
/** What he is holding, until the hero reaches him and the panel opens. */
let greeting: Waiting | null = null;
/**
 * Close enough to see what's happening. Fit (1×) shows the whole Fissure, and
 * at that scale a monster is four pixels. Fit is one click away.
 */
const DEFAULT_ZOOM = 2;
let zoom = DEFAULT_ZOOM;

// ---------------------------------------------------------------------------
// Phase
// ---------------------------------------------------------------------------

function setPhase(next: Phase): void {
  phase = next;
  $('run-menu').hidden = next !== 'menu';
  $('run-stagewrap').hidden = next === 'menu';
  $('run-results').hidden = next !== 'results';
  syncViewportLock();
  setInventoryHandler(runHandler());
}

/**
 * The stage sizes itself to the frame, so the scroll container stops scrolling
 * while a map is up or the two fight over the height. It belongs to the run
 * view SHOWING A MAP: left on while you tabbed to the bench, it froze that
 * page with its items out of reach.
 */
export function syncViewportLock(): void {
  document.querySelector('.viewport')?.classList.toggle('viewport--locked', phase !== 'menu');
}

/** Which of the three states the Fissure is in. The guide branches on it. */
export const runPhase = (): Phase => phase;

/**
 * The panel is done. The descent it ended was already cleared and already
 * banked, so this is the report landing rather than the run resuming.
 */
export function metTaken(): void {
  sim?.takeGift();
  const report = greeted;
  greeted = null;
  greeting = null;
  if (report) land(report);
}

/** Called when the bench popup closes — the dock answers to the map again. */
export function onRunFocused(): void {
  setInventoryHandler(runHandler());
  refreshRunPanels();
}

/**
 * Nothing. Crystals are socketed from the collection, and the dock holds only
 * gear — which the Fissure has nothing of its own to do with, so the shell's
 * own actions (wear it, stash it) are what a click there means.
 */
function runHandler() {
  return {
    actionFor: () => null,
    highlighted: () => false,
  };
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

function renderMenu(): void {
  const grid = $('run-sockets');
  grid.replaceChildren();

  for (const slot of RUN_SLOTS) {
    const held = game.sockets[slot.id];
    const button = el('button', 'socket') as HTMLButtonElement;
    button.id = `run-socket-${slot.id}`;
    button.classList.toggle('socket--full', !!held);
    // An empty socket is the question "what goes in here", and the answer is
    // a screen, not a bag: crystals are compared before one of them goes in.
    button.onclick = () => {
      if (!held) return openCrystals();
      if (!unsocket(game, slot.id)) return;
      renderMenu();
      renderInventory();
    };

    if (held) {
      const family = FAMILY_BY_ID[crystalFamily(held)];
      button.append(el('div', 'socket__name', held.name));
      const world = el('div', `socket__family socket__family--${family.id}`, family.name);
      world.title = family.blurb;
      button.append(world);
      button.append(el('div', 'socket__mods', `${held.mods.length} modifiers`));
      // What being socketed is FOR, beyond the run: a crystal only levels
      // while it is in here, so the bar belongs where the choice is made.
      const grown = crystalProgress(held);
      const bar = el('div', 'grow');
      const fill = el('div', 'grow__fill');
      fill.style.width = `${Math.round(grown.fraction * 100)}%`;
      bar.append(fill);
      button.append(bar);
      button.append(
        el(
          'div',
          'socket__grow',
          grown.need === null
            ? `Level ${grown.level} — as far as it goes`
            : `${Math.floor(grown.xp)} / ${grown.need} to level ${grown.level + 1}`
        )
      );
      for (const mod of held.mods) button.append(el('div', 'chosen__mod', describeMod(mod)));
    } else {
      button.append(el('div', 'socket__empty', slot.name));
    }
    grid.append(button);
  }

  const host = $('run-selected');
  host.replaceChildren();

  const set = socketed(game);
  const chips = el('div', 'setrows');
  for (const row of setRows(set)) {
    const chip = el('span', 'mult');
    chip.append(el('span', 'mult__k', row.label));
    chip.append(el('span', 'mult__v', row.value));
    chips.append(chip);
  }
  host.append(chips);
  // What you will be fighting, before you commit to fighting it — and where,
  // since half of one world takes the rock as well as the packs.
  host.append(el('p', 'setcomp', compositionText(set)));
  const zone = THEME_BY_ID[runSet(set).theme];
  const where = el('p', 'setzone', zone.name);
  where.title = zone.blurb;
  where.append(el('span', 'setzone__blurb', ` — ${zone.blurb}`));
  host.append(where);

  // What the set is FOR. Every world pays in its own currency and no two are
  // comparable, so this is the difference between choosing and guessing.
  const farms = farmingText(set);
  if (farms) host.append(el('p', 'setcomp', farms));
  host.append(
    el(
      'p',
      'socket__hint',
      set.length > 0
        ? 'Sockets are permanent. Click one to take its crystal back.'
        : crystalsIn(game).length === 0
          ? 'No crystals yet. An empty Fissure is still a real descent.'
          : 'Click an empty socket to choose a crystal.'
    )
  );

  // The one thing that can shut the Fissure — and never a dead end, because
  // selling out of the haul needs no room anywhere.
  const blocked = haulFull(game);
  const launcher = $('run-launch') as HTMLButtonElement;
  launcher.disabled = blocked;
  launcher.classList.toggle('mini--off', blocked);
  $('run-blocked').textContent = blocked
    ? 'Your haul is full. Empty some of it before you go back down.'
    : '';
  ($('run-repeat') as HTMLInputElement).checked = game.autoRepeat;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

/**
 * Whether a cleared descent starts the next one by itself. Off during the
 * guided opening whatever the toggle says: its later steps are written
 * against a report that is still on screen.
 */
const looping = (): boolean => game.autoRepeat && !isGuided();

function launch(): void {
  // An empty set is a real descent, not a missing choice: the bare Fissure is
  // generated fresh each time and never taken from you, which is what makes
  // running out of crystals a setback rather than an end.
  const set = socketed(game);

  seed = Math.floor(Math.random() * 1e9);
  // Who you might meet is the player's business, not the set's: the chance
  // falls as the collection fills, and the sim is only told the number.
  sim = new RunSim(set, game.character, new Rng(seed), { potionThresholds: game.potions });

  note(
    `${set.length} socketed · power ${sim.set.power.toFixed(1)} · seed ${seed} · ` +
      `${sim.state.totalMonsters} monsters`
  );
  accumulator = 0;
  playing = true;
  lootSig = '';
  // A new map: a camera left pointed at a corner of the last one is a black
  // screen you have to work out how to escape.
  renderer?.follow();

  // Climbing out. From the menu that is the whole handover; out of a cleared
  // descent the drop has already played.
  if (handover === 0) handover = HANDOVER * DESCEND;

  setPhase('running');
  renderStatsPanel();
  renderFlasks();
  fitCanvas();
  setLeaveLabel();
  // Paint once up front rather than waiting for the first animation frame,
  // or everything reads as placeholder text until a frame lands.
  renderReadout();
  renderInventory();
}

/**
 * A run ended. Bank it, then decide whether there is another one. Capacity is
 * read HERE and never during a run, which is why the haul may end up over its
 * limit rather than a descent's drops being split.
 */
function finish(left = false): void {
  if (!sim) return;
  const report = buildReport(game, sim.state, left);
  playing = false;
  renderBadges(); // the level this descent bought has landed, so a point may have

  if (report.cleared) streak++;

  // AFTER the report, so the level and the crystal experience this descent
  // just bought both count towards the meeting it schedules.
  const waiting = report.cleared
    ? giftWaiting(game, {
        set: sim.state.set,
        elapsed: sim.state.elapsed,
        socketed: socketed(game),
      })
    : null;

  // Somebody at the mouth. Already banked, so it is a reason the loop stopped
  // rather than a new ending — same `land()`, same report. Arriving is what
  // puts the panel up, so what he holds waits here until the hero gets there.
  if (waiting && sim.greetAtExit()) {
    halt = 'met';
    greeted = report;
    greeting = waiting;
    absorbEvents();
    return;
  }

  halt = left
    ? 'left'
    : !report.cleared
      ? 'died'
      : report.haulFull
        ? 'full'
        : leaving && looping()
          ? 'chose'
          : 'once';

  // `leaving` is the only stop you choose while the fight is still on, so it
  // is checked here rather than at the launch: the descent you armed it during
  // still finishes and still banks.
  if (report.cleared && !report.haulFull && !leaving && looping()) {
    // Drop into the hole first. The next descent is built at the bottom of it.
    handover = 0.0001;
    banked = report;
    pending = null;
    return;
  }

  land(report);
}


function land(report: RunReport): void {
  if (!sim) return;
  handover = 0;
  pending = null;
  banked = null;
  renderResults(report, sim.state);
  setPhase('results');
  renderInventory();
  // Nothing to sort is the one case a grid of empty slots is wrong for.
  if (game.haul.length > 0) openHaul(haltLine(report));
}

/** 1 standing, 0 underground. Drives the sprite and the dark over it. */
function emergeNow(): number {
  if (handover === 0) return 1;
  const t = Math.min(1, handover / HANDOVER);
  return t < DESCEND ? 1 - t / DESCEND : Math.min(1, (t - DESCEND) / (1 - DESCEND));
}

/** What the haul screen says about why you are looking at it. */
function haltLine(report: RunReport): string {
  const runs = streak === 1 ? 'one descent' : `${streak} descents`;
  // Losing the descent you were standing in is the whole cost, and the thing
  // it is easiest to read as losing the lot — so say what is still yours.
  const kept =
    streak > 0
      ? `Everything ${runs} banked is here; only the one you were in is gone.`
      : game.haul.length > 0
        ? 'That descent banked nothing, but what was already here is still yours.'
        : 'A descent only pays if you finish it.';

  if (halt === 'met') return `${LAMPWRIGHT.name} walked you out. Cleared ${runs}.`;
  if (halt === 'left') return `You walked out. ${kept}`;
  if (halt === 'died') return `You died. ${kept}`;
  if (halt === 'full') return `The haul is full after ${runs}. Clear some of it to go again.`;
  if (halt === 'chose') return `Cleared ${runs}, and stopped where you asked.`;
  return `Cleared ${runs}.`;
}

function renderStatsPanel(): void {
  const s = characterStats(game.character);
  const host = $('run-stats');
  host.replaceChildren();
  $('run-menu-level').textContent = String(game.character.level);
  $('run-name').textContent = game.character.name;

  const rows: Array<[string, string]> = [
    ['life', Math.round(s.maxLife).toString()],
    ['damage', Math.round(s.damage).toString()],
    ['atk/sec', s.attacksPerSecond.toFixed(2)],
    ['crit', `${Math.round(s.critChance)}%`],
    ['move', s.moveSpeed.toFixed(1)],
    ['armour', Math.round(s.armour).toString()],
    ['regen/s', s.lifeRegen.toFixed(1)],
    ['mana', Math.round(s.maxMana).toString()],
    ['mana/s', s.manaRegen.toFixed(1)],
    ['cost', s.manaCost.toFixed(1)],
  ];

  for (const [k, v] of rows) {
    const row = el('div', 'stat');
    row.append(el('span', 'stat__k', k));
    row.append(el('span', 'stat__v', v));
    host.append(row);
  }
}

/**
 * What the run is carrying — redrawn only when it changes. This runs inside
 * the animation frame, and a signature of the rows is cheaper than rebuilding
 * the list sixty times a second for loot that moves every few kills.
 */
let lootSig = '';

function renderCarrying(): void {
  if (!sim) return;
  const rows = lootRows(sim.state);
  const items = sim.state.loot.items;
  const sig = rows.map((r) => `${r.label}${r.value}`).join('|') + `#${items.length}`;
  if (sig === lootSig) return;
  lootSig = sig;

  const host = $('run-loot');
  host.replaceChildren();

  if (rows.length === 0 && items.length === 0) {
    host.append(el('p', 'empty', 'Nothing yet.'));
    return;
  }
  for (const row of rows) {
    const line = el('div', 'lootline');
    line.append(el('span', 'lootline__k', row.label.replace(/_/g, ' ')));
    line.append(el('span', 'lootline__v', row.value));
    host.append(line);
  }
  // Capped, same as the report. Gear drops are uncapped by design, so a good
  // map turns a live readout into a list that outgrows the panel it lives in
  // — and the panel is beside the map, so it grows over the fight.
  const shown = items.slice(0, LOOT_ROWS);
  for (const item of shown) {
    const line = el('div', 'lootline');
    line.append(el('span', 'lootline__k', item.name));
    line.append(el('span', 'lootline__v', '+1'));
    host.append(line);
  }
  const rest = items.length - shown.length;
  if (rest > 0) {
    const line = el('div', 'lootline');
    line.append(el('span', 'lootline__k', `and ${rest} more`));
    line.append(el('span', 'lootline__v', `+${rest}`));
    host.append(line);
  }
}

/**
 * The flasks. The KEYS are the shortcut and these are the interface — a phone
 * has no number row, so a potion reachable only by keyboard is missing rather
 * than optional. `fires at` is the same threshold the sim's own policy reads,
 * so setting it here is setting what a headless run does.
 */
function renderFlasks(): void {
  const host = $('run-flasks');
  const live = sim && playing;
  host.replaceChildren();

  for (const potion of POTIONS) {
    const left = sim?.state.charges[potion.id] ?? potion.charges;
    const drinking = sim?.state.hero.effects.some((e) => e.id === potion.id) ?? false;
    const share = game.potions?.[potion.id] ?? potion.threshold;

    const row = el('div', `flask${drinking ? ' flask--live' : ''}`);
    const use = el('button', 'flask__use') as HTMLButtonElement;
    use.id = `flask-${potion.id}`;
    use.append(el('span', 'flask__key', keyName(keyFor(game, potion.binding))));
    use.append(el('span', 'flask__name', potion.name));
    use.append(el('span', 'flask__charges', `${left} / ${potion.charges}`));
    use.disabled = !live || !sim!.canDrink(potion.id);
    use.onclick = () => drinkPotion(potion.id);
    use.title = potion.blurb;
    row.append(use);

    const auto = el('div', 'flask__auto');
    for (const step of [-5, 5]) {
      const button = el('button', 'mini', step < 0 ? '−' : '+') as HTMLButtonElement;
      button.onclick = () => {
        const next = Math.max(0, Math.min(0.95, share + step / 100));
        game.potions = { ...(game.potions ?? {}), [potion.id]: next };
        renderFlasks();
      };
      if (step < 0) auto.append(button);
      else {
        auto.append(el('span', undefined, `${Math.round(share * 100)}%`));
        auto.append(button);
      }
    }
    auto.title = `Fires itself when ${potion.pool} falls to this share.`;
    row.append(auto);
    host.append(row);
  }
}

/** A press, from a key or from the button. The sim queues it for the next tick. */
function drinkPotion(id: string): void {
  if (!sim || !playing) return;
  sim.usePotion(id);
  renderFlasks();
}

function renderReadout(): void {
  if (!sim) return;
  const s = sim.state;

  renderCarrying();
  renderFlasks();

  $('run-elapsed').textContent = `${s.elapsed.toFixed(1)}s`;
  $('run-killed').textContent = `${s.killed}/${s.totalMonsters}`;
  $('run-seed').textContent = String(seed);
  $('run-xp-gained').textContent = String(Math.round(s.xpGained));

  const need = xpToNext(game.character.level);
  $('run-level').textContent = String(game.character.level);
  $('run-xp-text').textContent = `${game.character.xp} / ${need}`;
  ($('run-xp-fill') as HTMLElement).style.width =
    `${Math.min(100, (game.character.xp / need) * 100)}%`;

  const frac = Math.max(0, s.hero.life / s.hero.stats.maxLife);
  ($('run-hp-fill') as HTMLElement).style.width = `${frac * 100}%`;
  $('run-hp-text').textContent =
    `${Math.max(0, Math.round(s.hero.life))} / ${Math.round(s.hero.stats.maxLife)}`;

  const cost = s.hero.stats.manaCost;
  const spare = Math.max(0, s.hero.mana);
  const pool = Math.max(1, s.hero.stats.maxMana);
  ($('run-mana-fill') as HTMLElement).style.width = `${Math.min(100, (spare / pool) * 100)}%`;
  $('run-mana-text').textContent = `${Math.round(spare)} / ${Math.round(pool)}`;
  $('run-mana-cost').textContent = cost.toFixed(1);
  // Short of the cost is the state worth seeing: it is why the damage dropped.
  ($('run-mana-fill').parentElement as HTMLElement).classList.toggle('hp--dry', spare < cost);

  // A walked-out run is still 'running' to the sim — it was never finished —
  // so the chip reads the phase for that one case rather than the sim.
  const left = phase === 'results' && s.status === 'running';
  const status = $('run-status');
  status.textContent = left ? 'left' : s.status;
  status.className = `run-status run-status--${left ? 'died' : s.status}`;
}

/** The overlay. Rows come from the report, so a new stat needs nothing here. */
function renderResults(report: RunReport, run: RunState): void {
  const host = $('run-results');
  host.replaceChildren();

  const card = el('div', `resultcard resultcard--${report.status}`);
  card.append(el('h3', 'resultcard__head', report.headline));
  // The loop's own story, which the per-run rows cannot tell: this card is
  // shown once at the END of a streak, not after every descent in it.
  if (streak > 1 || halt !== 'once') {
    card.append(el('p', 'resultcard__sub', haltLine(report)));
  }

  // Two columns: what happened on the left, what you got on the right. As one
  // stacked column a good run — several stat rows and a handful of drops —
  // pushed the button that dismisses it off the bottom of the screen.
  const cols = el('div', 'resultcard__cols');

  const left = el('div');
  left.append(el('p', 'resultcard__sub', 'The descent'));
  const grid = el('div', 'resultgrid');
  for (const row of report.rows) {
    const r = el('div', `resultrow${row.bad ? ' resultrow--bad' : ''}`);
    r.append(el('span', 'resultrow__k', row.label));
    r.append(el('span', 'resultrow__v', row.value));
    grid.append(r);
  }
  left.append(grid);
  cols.append(left);

  const right = el('div');
  right.append(el('p', 'resultcard__sub', report.cleared ? 'Into the haul' : 'Loot lost'));
  const loot = el('div', 'lootlist');
  const rows = lootRows(run);

  if (rows.length === 0 && report.items.length === 0) {
    loot.append(el('p', 'empty', 'Nothing dropped.'));
  } else {
    for (const row of rows) {
      const r = el('div', `lootrow${report.cleared ? '' : ' lootrow--lost'}`);
      r.append(el('span', 'lootrow__k', row.label.replace(/_/g, ' ')));
      r.append(el('span', 'lootrow__v', row.value));
      loot.append(r);
    }
    // Gear drops are uncapped, and a good map can hand you a dozen. Listing
    // every one turns the report into a receipt you have to scroll; the tail
    // is a count, because the items themselves are already in your dock.
    const shown = report.items.slice(0, LOOT_ROWS);
    for (const item of shown) {
      const r = el('div', 'lootrow');
      r.append(el('span', 'lootrow__k', item.name));
      r.append(el('span', 'lootrow__v', '+1'));
      loot.append(r);
    }
    const rest = report.items.length - shown.length;
    if (rest > 0) {
      const r = el('div', 'lootrow');
      r.append(el('span', 'lootrow__k', `and ${rest} more`));
      r.append(el('span', 'lootrow__v', `+${rest}`));
      loot.append(r);
    }
  }
  right.append(loot);

  cols.append(right);
  card.append(cols);

  if (report.lostLoot) {
    card.append(
      el(
        'p',
        'resultcard__warn',
        report.status === 'left'
          ? 'You left holding it. A descent only pays if you finish it.'
          : 'You died holding it. Nothing was banked.'
      )
    );
  }

  const again = el('button', 'mini', 'Back to the Fissure') as HTMLButtonElement;
  // Stable id: the guided opening's last step points here while the report is
  // up, because this is the click that gets you back to Enter.
  again.id = 'run-again';
  again.onclick = () => {
    sim = null;
    setPhase('menu');
    renderMenu();
  };
  card.append(again);

  host.append(card);
}

function absorbEvents(): void {
  if (!sim) return;
  const at = sim.state.elapsed;

  // Kills aren't logged. Sixty "+1 killed" lines bury the three entries that
  // actually explain a run, and the kill count is already on screen.
  for (const e of sim.drainEvents() as RunEvent[]) {
    if (e.kind === 'finale') note(e.herald, 'note', at);
    else if (e.kind === 'met') note(e.said, 'add', at);
    else if (e.kind === 'cleared') {
      note(`Cleared in ${e.seconds.toFixed(1)}s — ${e.killed} killed`, 'add', at);
    } else if (e.kind === 'died') {
      note(`Died at ${e.seconds.toFixed(1)}s — ${e.killed} killed`, 'fail', at);
    }
  }
}

function frame(now: number): void {
  const dt = lastFrame === 0 ? 0 : Math.min(0.25, (now - lastFrame) / 1000);
  lastFrame = now;

  // The sim does not tick at all while this runs: you are climbing.
  if (handover > 0) {
    handover += dt;
    if (playing === false && handover >= HANDOVER * DESCEND) {
      // The bottom of the hole.
      if (pending) land(pending);
      else launch();
    }
    if (handover >= HANDOVER) handover = 0;
  }
  const emerge = emergeNow();
  $('run-fade').style.opacity = String(1 - emerge);

  // Over, and someone is standing there. Nothing ticks but the walk.
  if (greeting && sim && !sim.state.meeting) {
    accumulator += dt;
    let steps = 0;
    while (accumulator >= TICK && steps < 400) {
      sim.walkOut(TICK);
      accumulator -= TICK;
      steps++;
    }
    if (sim.state.meeting) openMet(greeting);
  }

  if (playing && handover === 0 && sim && sim.state.status === 'running') {
    // One pace, always. Speed multipliers were papering over combat that
    // will change as the character scales; tuning the real pace is the
    // honest fix.
    accumulator += dt;
    let steps = 0;
    while (accumulator >= TICK && steps < 400) {
      sim.step(TICK);
      accumulator -= TICK;
      steps++;
    }
    absorbEvents();

    if (sim.state.status !== 'running') {
      setLeaveLabel();
      finish();
    }
  }

  if (sim && renderer && phase !== 'menu') renderer.draw(sim.state, emerge);
  if (sim) renderReadout();
  requestAnimationFrame(frame);
}

/**
 * The gentle way out, and the only stop you can choose while the fight is on.
 * Nothing to arm when this descent was already the last one — with the loop
 * off, or with the haul about to shut the Fissure, it ends by itself.
 */
function setLeaveLabel(): void {
  const btn = $('run-leave') as HTMLButtonElement;
  const live = phase === 'running' && looping();
  btn.textContent = !live
    ? 'Last descent'
    : leaving
      ? 'Leaving after this one'
      : 'Leave after this run';
  btn.disabled = !live;
  btn.classList.toggle('mini--on', live && leaving);
}

/**
 * Once the player picks a zoom it is theirs and nothing moves it. Until then the
 * starting zoom is recomputed on every resize, so rotating a phone re-picks a
 * sane scale rather than keeping one that suited the old shape.
 */
let userZoomed = false;

/** Matches the `.flasks` margin, because they describe the same gap. */
const FLASK_GAP = 8;

function fitCanvas(): void {
  const box = $('run-stage');
  const width = box.clientWidth;
  // Below the stacking breakpoint the panels sit under the stage and the view
  // scrolls again, so there's no "space left over" to measure. Same number as
  // the media query, because they describe the same layout.
  const stacked = globalThis.innerWidth <= 900;
  const row = box.closest('.runcols') as HTMLElement | null;
  // The flasks sit UNDER the map inside the same box, so the canvas may not
  // have the whole row: taking it all pushes them off the bottom, where the
  // dock covers them and nothing can be clicked.
  const flasks = $('run-flasks').getBoundingClientRect().height;
  const reserve = flasks > 0 ? flasks + FLASK_GAP : 0;
  const available = !stacked && row ? row.clientHeight - 2 - reserve : 0;
  const height = available > 240 ? available : Math.max(320, Math.round(width * 0.66));
  renderer?.resize(width, height);

  // Now that the surface has a real size, pick the scale that fits it. At
  // startup the stage is still unmeasured, so this is the first honest chance.
  if (!userZoomed && width > 0) setZoom(defaultZoom(Math.min(width, height)));
}

function setZoom(next: number, at?: { x: number; y: number }): void {
  if (at) userZoomed = true;
  zoom = clampZoom(next);
  renderer?.setZoom(zoom, at);
}

/** Back on the hero, and following again. The one key the map has. */
export function centreCamera(): void {
  renderer?.follow();
}

/**
 * Start on canvas so something is on screen immediately, then hand over to
 * WebGL once Pixi has its device. If Pixi can't initialise — no WebGL, a
 * hostile driver, jsdom in the smoke test — canvas simply stays, and the page
 * is never blank.
 */
async function upgradeRenderer(host: HTMLElement, palette: Palette): Promise<void> {
  let pixi: Renderer | null = null;
  try {
    pixi = await createPixiRenderer(host, palette);
  } catch {
    pixi = null;
  }
  if (!pixi) return;
  renderer?.destroy();
  renderer = pixi;
  // The new renderer starts at its own default, so the zoom the UI is
  // currently claiming has to be handed over with it — otherwise the label
  // says 2× and the picture is fitted.
  pixi.setZoom(zoom);
  fitCanvas();
}

export function initRun(state: GameState): void {
  game = state;

  // Drawn from the very first paint, so the room they take is not something
  // the canvas discovers when a descent starts — and so the threshold is set
  // before you drop rather than during a fight.
  renderFlasks();

  const stage = $('run-stage');
  const palette = readPalette(document.documentElement);
  renderer = createCanvasRenderer(stage, palette);
  void upgradeRenderer(stage, palette);

  ($('run-launch') as HTMLButtonElement).onclick = () => {
    if (haulFull(game)) return;
    streak = 0;
    leaving = false;
    launch();
  };

  ($('run-repeat') as HTMLInputElement).onchange = (event) => {
    game.autoRepeat = (event.target as HTMLInputElement).checked;
    renderMenu();
  };

  ($('run-leave') as HTMLButtonElement).onclick = () => {
    if (phase !== 'running') return;
    leaving = !leaving;
    note(leaving ? 'Leaving after this descent.' : 'Staying down.');
    setLeaveLabel();
  };

  // The hard way out, and the only one that costs you something: this descent
  // banks nothing, exactly as dying in it would. Every clear before it already
  // banked as it happened, so it ends on the same card and the same haul.
  ($('run-abandon') as HTMLButtonElement).onclick = () => {
    if (!sim || phase !== 'running') return;
    // Walking over to him: already banked, so nothing to walk out of.
    if (greeting) return;
    // Mid-drop the descent is already over and banked, so this means "do not
    // go back down": the report lands at the bottom instead of a new map.
    if (handover > 0 && !playing && banked) {
      halt = 'chose';
      // Never a second report: building one banks the loot again.
      pending = banked;
      return;
    }
    finish(true);
  };


  // The only zoom, and it leans in on the CURSOR rather than the middle — the
  // same gesture the skill web has, because it is the same gesture.
  stage.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const box = stage.getBoundingClientRect();
      setZoom(event.deltaY < 0 ? zoom * ZOOM_STEP : zoom / ZOOM_STEP, {
        x: event.clientX - box.left - box.width / 2,
        y: event.clientY - box.top - box.height / 2,
      });
    },
    { passive: false }
  );

  // Drag to look somewhere else, which STOPS the camera following. It comes
  // back on the key, and on the next descent — a camera left pointed at a
  // corner of a map that no longer exists is a black screen.
  let from: { x: number; y: number } | null = null;
  let held: number | null = null;
  stage.addEventListener('pointerdown', (event) => {
    from = { x: event.clientX, y: event.clientY };
  });
  stage.addEventListener('pointermove', (event) => {
    if (!from) return;
    const dx = event.clientX - from.x;
    const dy = event.clientY - from.y;
    // A few pixels of slop, so a shaky click is still a click.
    if (held === null && Math.hypot(dx, dy) < 4) return;
    if (held === null) {
      held = event.pointerId;
      stage.setPointerCapture?.(event.pointerId);
      stage.classList.add('stage--drag');
    }
    renderer?.panBy(dx, dy);
    from = { x: event.clientX, y: event.clientY };
  });
  const release = () => {
    from = null;
    if (held !== null) stage.releasePointerCapture?.(held);
    held = null;
    stage.classList.remove('stage--drag');
  };
  stage.addEventListener('pointerup', release);
  stage.addEventListener('pointercancel', release);
  stage.addEventListener('pointerleave', release);

  globalThis.addEventListener('resize', fitCanvas);

  // Off the bindings table: a rebound key says what it is.
  $('run-camhint').textContent =
    `scroll to zoom · drag to look · ${keyName(keyFor(game, 'centre'))} to follow`;

  refreshRunPanels();
  setZoom(DEFAULT_ZOOM);
  setPhase('menu');
  requestAnimationFrame(frame);
}


/** Re-read derived stats — called after equipment changes on the sheet. */
/** A key press, from the shell's one listener. */
export function drinkFlask(id: string): void {
  drinkPotion(id);
}

export function refreshRunPanels(): void {
  renderStatsPanel();
  renderMenu();
  renderBadges();
}

/** What each screen is holding that has not been spent. One place, called
 *  after everything that could change one. */
function renderBadges(): void {
  badge('open-character', attributePointsLeft(game.character));
}

