/**
 * The Fissure, in three states: prepare, descend, read the result.
 *
 * There is only ever one place you go. A crystal isn't a destination, it's
 * something you socket to empower what's already down there — which is why
 * Enter is never disabled and an empty socket is a legitimate run rather than
 * an error state. That's the whole anti-stuck guarantee: no crystals is a
 * setback, never a dead end.
 *
 * Owns real time and nothing else. The sim advances in fixed TICK steps and
 * the renderer draws whatever state it finds, so pausing or a janky frame
 * can't change the outcome of a run — only how fast you watch it.
 *
 * A socketed crystal is CONSUMED, win or lose. That's what gives fragments a
 * purpose and stops one good crystal being farmed forever.
 */
import { Rng } from '../rng';
import { RunSim, TICK } from '../sim/run';
import type { RunEvent, RunState } from '../sim/run';
import { characterStats } from '../sim/stats';
import { xpToNext } from '../sim/character';
import { describeMod } from '../crafting';
import { rewardRows } from '../sim/crystal';
import { FREE_MAP } from '../data';
import { makeCrystal } from '../economy';
import { removeItem, crystalsIn } from '../game/state';
import type { GameState } from '../game/state';
import { buildReport, lootRows } from '../game/report';
import type { RunReport } from '../game/report';
import { createCanvasRenderer } from '../render/canvas2d';
import { createPixiRenderer } from '../render/pixi';
import { ZOOM_MAX, ZOOM_MIN, clampZoom, readPalette } from '../render/renderer';
import type { Palette, Renderer } from '../render/renderer';
import { renderInventory, setInventoryHandler } from './inventory';
import { note } from './history';
import { startTutorial } from './tutorial';
import type { Item } from '../types';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

type Phase = 'menu' | 'running' | 'results';

let game: GameState;
let sim: RunSim | null = null;
let renderer: Renderer | null = null;
let phase: Phase = 'menu';
let playing = false;
let accumulator = 0;
let lastFrame = 0;
let seed = 0;
/**
 * Close enough to see what's happening.
 *
 * Fit (1×) shows the whole Fissure, which is useful for orienting and useless
 * for watching a fight — at that scale a monster is four pixels. Start where
 * the action is legible; Fit is one click away.
 */
const DEFAULT_ZOOM = 2;
let zoom = DEFAULT_ZOOM;
/** What's in the socket. Null is a plain, unempowered descent. */
let chosen: Item | null = null;
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

/** Called when the bench popup closes — the dock answers to the map again. */
export function onRunFocused(): void {
  setInventoryHandler(runHandler());
  renderMenu();
  renderStatsPanel();
}

/**
 * Only crystals, and only while choosing. Gear is still in the dock — it's
 * always in the dock — but there is nothing to do with a helmet here, so it
 * renders inert rather than pretending to be a map.
 */
function runHandler() {
  return {
    actionFor: (item: Item) => {
      if (phase !== 'menu' || item.kind !== 'crystal') return null;
      return {
        label: 'Socket crystal',
        run: () => {
          chosen = item;
          renderMenu();
        },
      };
    },
    highlighted: (item: Item) => item === chosen,
  };
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

function renderMenu(): void {
  const host = $('run-selected');
  host.replaceChildren();

  const socket = $('run-socket');

  // A crystal can leave the inventory behind our back — spent on the bench,
  // or wiped by a restart. Socketing is a reference, not a reservation.
  if (chosen && !game.inventory.includes(chosen)) chosen = null;
  socket.classList.toggle('socket--full', chosen !== null);

  if (!chosen) {
    host.append(el('div', 'socket__empty', 'Empty socket'));
    host.append(
      el(
        'p',
        'socket__hint',
        crystalsIn(game).length === 0
          ? 'No crystals yet. Descend as you are — the Fissure pays little, but it pays.'
          : 'Click a crystal in the dock below to empower the Fissure.'
      )
    );
    return;
  }

  host.append(el('div', 'chosen__name', chosen.name));
  host.append(el('div', 'chosen__meta', `ilvl ${chosen.ilvl} · ${chosen.mods.length} modifiers`));

  const multipliers = el('div', 'mults');
  for (const row of rewardRows(chosen)) {
    const chip = el('span', 'mult');
    chip.append(el('span', 'mult__k', row.label));
    chip.append(el('span', 'mult__v', row.value));
    multipliers.append(chip);
  }
  host.append(multipliers);

  if (chosen.mods.length === 0) {
    host.append(el('p', 'empty', 'Unmodified — craft it on the bench for a richer descent.'));
  }
  for (const mod of chosen.mods) {
    host.append(el('div', 'chosen__mod', describeMod(mod)));
  }
  host.append(el('p', 'socket__hint', 'Click to take it back out.'));
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

function launch(): void {
  // An empty socket is a real descent, not a missing choice: the unempowered
  // Fissure is generated fresh each time and never taken from you, which is
  // what makes running out of crystals a setback rather than an end.
  const empowered = chosen !== null;
  const crystal = chosen ?? makeCrystal(FREE_MAP.tier);

  // A socketed crystal is consumed win or lose. It's the stake.
  if (empowered) removeItem(game, crystal);
  chosen = null;

  seed = Math.floor(Math.random() * 1e9);
  sim = new RunSim(
    crystal,
    game.character,
    new Rng(seed),
    empowered ? {} : { densityScale: FREE_MAP.densityScale }
  );

  note(`${crystal.name} · seed ${seed} · ${sim.state.totalMonsters} monsters`);
  accumulator = 0;
  playing = true;
  lootSig = '';

  setPhase('running');
  renderStatsPanel();
  fitCanvas();
  setStartLabel();
  // Paint once up front rather than waiting for the first animation frame,
  // or everything reads as placeholder text until a frame lands.
  renderReadout();
  renderInventory();
}

function finish(): void {
  if (!sim) return;
  const firstEver = !game.firstClearDone && sim.state.status === 'cleared';
  const report = buildReport(game, sim.state);
  playing = false;

  // The guided opening begins the moment you've actually cleared something,
  // so it teaches spending against loot you're holding rather than in the
  // abstract.
  if (firstEver) startTutorial();
  renderResults(report, sim.state);
  setPhase('results');
  renderInventory();
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
  for (const item of items) {
    const line = el('div', 'lootline');
    line.append(el('span', 'lootline__k', item.name));
    line.append(el('span', 'lootline__v', '+1'));
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

  const status = $('run-status');
  status.textContent = s.status === 'running' ? (playing ? 'running' : 'paused') : s.status;
  status.className = `run-status run-status--${s.status}`;
}

/** The overlay. Rows come from the report, so a new stat needs nothing here. */
function renderResults(report: RunReport, run: RunState): void {
  const host = $('run-results');
  host.replaceChildren();

  const card = el('div', `resultcard resultcard--${report.status}`);
  card.append(el('h3', 'resultcard__head', report.headline));

  const grid = el('div', 'resultgrid');
  for (const row of report.rows) {
    const r = el('div', `resultrow${row.bad ? ' resultrow--bad' : ''}`);
    r.append(el('span', 'resultrow__k', row.label));
    r.append(el('span', 'resultrow__v', row.value));
    grid.append(r);
  }
  card.append(grid);

  card.append(el('p', 'resultcard__sub', report.cleared ? 'Loot' : 'Loot lost'));
  const loot = el('div', 'lootlist');
  const rows = lootRows(run);

  if (rows.length === 0) {
    loot.append(el('p', 'empty', 'Nothing dropped.'));
  } else {
    for (const row of rows) {
      const r = el('div', `lootrow${report.cleared ? '' : ' lootrow--lost'}`);
      r.append(el('span', 'lootrow__k', row.label.replace(/_/g, ' ')));
      r.append(el('span', 'lootrow__v', row.value));
      loot.append(r);
    }
    for (const item of report.items) {
      const r = el('div', 'lootrow');
      r.append(el('span', 'lootrow__k', item.name));
      r.append(el('span', 'lootrow__v', '+1'));
      loot.append(r);
    }
  }
  card.append(loot);

  if (report.lostLoot) {
    card.append(
      el('p', 'resultcard__warn', 'You died holding it. Nothing was banked.')
    );
  }

  const again = el('button', 'mini', 'Back to the Fissure') as HTMLButtonElement;
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
      setStartLabel();
      finish();
    }
  }

  if (sim && renderer && phase !== 'menu') renderer.draw(sim.state);
  if (sim) renderReadout();
  requestAnimationFrame(frame);
}

function setStartLabel(): void {
  const btn = $('run-pause') as HTMLButtonElement;
  const done = !sim || sim.state.status !== 'running';
  btn.textContent = playing ? 'Pause' : 'Resume';
  btn.disabled = done;
}

/**
 * The stage takes the height the frame has left rather than an aspect ratio.
 * An aspect ratio is what made the run view taller than the window and grew a
 * scrollbar over it. Measured off the row, not the stage box, because the
 * canvas we're about to size is what's inside the box.
 */
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
}

function setZoom(next: number): void {
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

  ($('run-launch') as HTMLButtonElement).onclick = () => launch();

  // Clicking the socket empties it. Socketing is a reference into the
  // inventory, so taking it back out costs nothing.
  ($('run-socket') as HTMLButtonElement).onclick = () => {
    if (!chosen) return;
    chosen = null;
    renderMenu();
    renderInventory();
  };

  ($('run-pause') as HTMLButtonElement).onclick = () => {
    if (!sim || sim.state.status !== 'running') return;
    playing = !playing;
    setStartLabel();
  };

  ($('run-abandon') as HTMLButtonElement).onclick = () => {
    // The crystal is already spent, so this is a forfeit, not an undo.
    if (!sim) return;
    playing = false;
    sim = null;
    setPhase('menu');
    renderMenu();
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
  setZoom(DEFAULT_ZOOM);
  setPhase('menu');
  requestAnimationFrame(frame);
}


/** Re-read derived stats — called after equipment changes on the sheet. */
export function refreshRunPanels(): void {
  renderStatsPanel();
  renderMenu();
}

