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
import { xpToNext } from '../sim/character';
import { describeMod } from '../crafting';
import { compositionText, crystalFamily, setRows } from '../sim/crystal';
import { FAMILY_BY_ID, RUN_SLOTS } from '../data';
import { crystalsIn, haulFull, socketFor, socketItem, socketed, unsocket } from '../game/state';
import type { GameState } from '../game/state';
import { buildReport, lootRows } from '../game/report';
import type { RunReport } from '../game/report';
import { openHaul } from './haul';
import { isGuided } from './tutorial';
import { createCanvasRenderer } from '../render/canvas2d';
import { createPixiRenderer } from '../render/pixi';
import { ZOOM_MAX, ZOOM_MIN, clampZoom, defaultZoom, readPalette } from '../render/renderer';
import type { Palette, Renderer } from '../render/renderer';
import { renderInventory, setInventoryHandler } from './inventory';
import { note } from './history';
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
let halt: 'died' | 'full' | 'once' | 'left' | 'chose' = 'once';
/** Armed mid-descent: finish this one, bank it, and do not go back down. */
let leaving = false;
/**
 * Close enough to see what's happening.
 *
 * Fit (1×) shows the whole Fissure, which is useful for orienting and useless
 * for watching a fight — at that scale a monster is four pixels. Start where
 * the action is legible; Fit is one click away.
 */
const DEFAULT_ZOOM = 2;
let zoom = DEFAULT_ZOOM;

/** 2x where it fits, tighter only to keep the hero's reach on screen. */

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
 * The stage sizes itself to the frame, so the scroll container has to stop
 * scrolling while a map is up — otherwise the two fight over the height.
 *
 * It belongs to the run view SHOWING A MAP, not to the app. Left on while you
 * tabbed to the bench, it froze that page with its items out of reach.
 */
export function syncViewportLock(): void {
  document.querySelector('.viewport')?.classList.toggle('viewport--locked', phase !== 'menu');
}

/** Which of the three states the Fissure is in. The guide branches on it. */
export const runPhase = (): Phase => phase;

/** Called when the bench popup closes — the dock answers to the map again. */
export function onRunFocused(): void {
  setInventoryHandler(runHandler());
  renderMenu();
  renderStatsPanel();
}

/**
 * Only crystals, and only while choosing. Gear is still in the dock — it's
 * always in the dock — but there is nothing to do with a helmet here, so it
 * renders inert rather than pretending to be socketable.
 */
function runHandler() {
  return {
    actionFor: (item: Item) => {
      if (phase !== 'menu' || item.kind !== 'crystal') return null;
      const slot = socketFor(game, item);
      if (!slot) return null;
      return {
        label: 'Socket crystal',
        run: () => {
          socketItem(game, item, slot);
          renderMenu();
          renderInventory();
        },
      };
    },
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
    button.onclick = () => {
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
  // What you will be fighting, before you commit to fighting it.
  host.append(el('p', 'setcomp', compositionText(set)));
  host.append(
    el(
      'p',
      'socket__hint',
      set.length > 0
        ? 'Sockets are permanent. Click one to take its crystal back.'
        : crystalsIn(game).length === 0
          ? 'No crystals yet. An empty Fissure is still a real descent.'
          : 'Click a crystal in the dock to socket it.'
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
 * Whether a cleared descent starts the next one by itself.
 *
 * Off during the guided opening whatever the toggle says: the opening teaches
 * one descent, and its later steps are written against a report that is still
 * on screen. The loop begins once you have been shown the loop's parts.
 */
const looping = (): boolean => game.autoRepeat && !isGuided();

function launch(): void {
  // An empty set is a real descent, not a missing choice: the bare Fissure is
  // generated fresh each time and never taken from you, which is what makes
  // running out of crystals a setback rather than an end.
  const set = socketed(game);

  seed = Math.floor(Math.random() * 1e9);
  sim = new RunSim(set, game.character, new Rng(seed));

  note(
    `${set.length} socketed · power ${sim.set.power.toFixed(1)} · seed ${seed} · ` +
      `${sim.state.totalMonsters} monsters`
  );
  accumulator = 0;
  playing = true;
  lootSig = '';

  setPhase('running');
  renderStatsPanel();
  fitCanvas();
  setLeaveLabel();
  // Paint once up front rather than waiting for the first animation frame,
  // or everything reads as placeholder text until a frame lands.
  renderReadout();
  renderInventory();
}

/**
 * A run ended. Bank it, then decide whether there is another one.
 *
 * Capacity is read HERE, between runs, and never during one — which is why the
 * haul is allowed to end up over its limit rather than a descent's drops being
 * split or thrown away.
 */
function finish(left = false): void {
  if (!sim) return;
  const report = buildReport(game, sim.state, left);
  playing = false;

  if (report.cleared) streak++;
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
    launch();
    return;
  }

  renderResults(report, sim.state);
  setPhase('results');
  renderInventory();
  // The one terminus. Nothing to sort is the one case where a grid of empty
  // slots would be the wrong thing to put in front of you.
  if (game.haul.length > 0) openHaul(haltLine(report));
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
  ];

  for (const [k, v] of rows) {
    const row = el('div', 'stat');
    row.append(el('span', 'stat__k', k));
    row.append(el('span', 'stat__v', v));
    host.append(row);
  }
}

/**
 * What the run is currently carrying — redrawn only when it changes.
 *
 * This runs inside the animation frame, so rebuilding the list sixty times a
 * second for loot that moves every few kills would be pure waste. A signature
 * of the rows is cheaper than the DOM work it avoids.
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

function renderReadout(): void {
  if (!sim) return;
  const s = sim.state;

  renderCarrying();

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

  // Handed over rather than dropped, and it goes to the dock: the opening
  // tells you to click the wand there, so it must not read as hauled.
  if (report.gifts.length > 0) {
    right.append(el('p', 'resultcard__sub', 'The Fissure gave you'));
    const given = el('div', 'lootlist');
    for (const item of report.gifts) {
      const r = el('div', 'lootrow');
      r.append(el('span', 'lootrow__k', item.name));
      r.append(el('span', 'lootrow__v', 'in your bag'));
      given.append(r);
    }
    right.append(given);
  }
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

  if (playing && sim && sim.state.status === 'running') {
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

  if (sim && renderer && phase !== 'menu') renderer.draw(sim.state);
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

function fitCanvas(): void {
  const box = $('run-stage');
  const width = box.clientWidth;
  // Below the stacking breakpoint the panels sit under the stage and the view
  // scrolls again, so there's no "space left over" to measure. Same number as
  // the media query, because they describe the same layout.
  const stacked = globalThis.innerWidth <= 900;
  const row = box.closest('.runcols') as HTMLElement | null;
  const available = !stacked && row ? row.clientHeight - 2 : 0;
  const height = available > 240 ? available : Math.max(320, Math.round(width * 0.66));
  renderer?.resize(width, height);

  // Now that the surface has a real size, pick the scale that fits it. At
  // startup the stage is still unmeasured, so this is the first honest chance.
  if (!userZoomed && width > 0) setZoom(defaultZoom(Math.min(width, height)), false);
}

function setZoom(next: number, byUser = true): void {
  if (byUser) userZoomed = true;
  zoom = clampZoom(next);
  renderer?.setZoom(zoom);
  $('run-zoom-label').textContent = `${zoom.toFixed(1)}×`;
  ($('run-zoom-out') as HTMLButtonElement).disabled = zoom <= ZOOM_MIN;
  ($('run-zoom-in') as HTMLButtonElement).disabled = zoom >= ZOOM_MAX;
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
    finish(true);
  };


  // Zoom: buttons for discoverability, wheel because that's what anyone
  // watching a map will reach for first.
  ($('run-zoom-in') as HTMLButtonElement).onclick = () => setZoom(zoom + 0.5);
  ($('run-zoom-out') as HTMLButtonElement).onclick = () => setZoom(zoom - 0.5);
  ($('run-zoom-fit') as HTMLButtonElement).onclick = () => setZoom(1);

  stage.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      setZoom(zoom + (event.deltaY < 0 ? 0.35 : -0.35));
    },
    { passive: false }
  );

  globalThis.addEventListener('resize', fitCanvas);

  renderStatsPanel();
  renderMenu();
  setZoom(DEFAULT_ZOOM, false);
  setPhase('menu');
  requestAnimationFrame(frame);
}


/** Re-read derived stats — called after equipment changes on the sheet. */
export function refreshRunPanels(): void {
  renderStatsPanel();
  renderMenu();
}

