/**
 * The run view, in three states: choose a map, watch it, read the result.
 *
 * Owns real time and nothing else. The sim advances in fixed TICK steps and
 * the renderer draws whatever state it finds, so pausing, speeding up, or a
 * janky frame can't change the outcome of a run — only how fast you watch it.
 *
 * Running a crystal CONSUMES it, win or lose. That's what gives fragments a
 * purpose and stops a single good map being farmed forever.
 */
import { Rng } from '../rng';
import { RunSim, TICK } from '../sim/run';
import type { RunEvent, RunState } from '../sim/run';
import { characterStats } from '../sim/stats';
import { xpToNext } from '../sim/character';
import { describeMod } from '../crafting';
import { rewardRows } from '../sim/crystal';
import { SKILLS } from '../data';
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
let zoom = 1;
let chosen: Item | null = null;
// ---------------------------------------------------------------------------
// Phase
// ---------------------------------------------------------------------------

function setPhase(next: Phase): void {
  phase = next;
  $('run-menu').hidden = next !== 'menu';
  $('run-stagewrap').hidden = next === 'menu';
  $('run-results').hidden = next !== 'results';
  setInventoryHandler(runHandler());
}

/** Only crystals, and only while choosing — gear isn't shown here at all. */
function runHandler() {
  return {
    kinds: ['crystal'] as const,
    actionFor: (item: Item) => {
      if (phase !== 'menu' || item.kind !== 'crystal') return null;
      return {
        label: 'Choose map',
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

  const available = crystalsIn(game);
  const launch = $('run-launch') as HTMLButtonElement;

  if (available.length === 0) {
    host.append(
      el('p', 'empty', 'No crystals. Buy one on the bench — they cost fragments.')
    );
    launch.disabled = true;
    chosen = null;
    return;
  }

  if (chosen && !game.inventory.includes(chosen)) chosen = null;

  if (!chosen) {
    host.append(el('p', 'empty', 'Pick a crystal from your inventory below.'));
    launch.disabled = true;
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
    host.append(el('p', 'empty', 'Unmodified — craft it on the bench for a richer map.'));
  }
  for (const mod of chosen.mods) {
    host.append(el('div', 'chosen__mod', describeMod(mod)));
  }
  launch.disabled = false;
}

function renderSkills(): void {
  const host = $('run-skills');
  host.replaceChildren();

  for (const skill of SKILLS) {
    const btn = el('button', 'chip', skill.name) as HTMLButtonElement;
    btn.title = skill.description;
    if (skill.id === game.character.skillId) btn.classList.add('chip--on');
    btn.onclick = () => {
      game.character.skillId = skill.id;
      renderSkills();
      renderStatsPanel();
    };
    host.append(btn);
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

function launch(): void {
  if (!chosen) return;

  const crystal = chosen;
  // Consumed win or lose. The crystal is the entry fee.
  removeItem(game, crystal);
  chosen = null;

  seed = Math.floor(Math.random() * 1e9);
  sim = new RunSim(crystal, game.character, new Rng(seed));

  note(`${crystal.name} · seed ${seed} · ${sim.state.totalMonsters} monsters`);
  accumulator = 0;
  playing = true;

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
  const report = buildReport(game, sim.state);
  playing = false;
  renderResults(report, sim.state);
  setPhase('results');
  renderInventory();
}

function renderStatsPanel(): void {
  const s = characterStats(game.character);
  const host = $('run-stats');
  host.replaceChildren();

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

function renderReadout(): void {
  if (!sim) return;
  const s = sim.state;

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

  const again = el('button', 'mini', 'Choose another map') as HTMLButtonElement;
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

function fitCanvas(): void {
  const box = $('run-stage');
  const width = box.clientWidth;
  const height = Math.max(320, Math.round(width * 0.66));
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
  fitCanvas();
}

export function initRun(state: GameState): void {
  game = state;

  const stage = $('run-stage');
  const palette = readPalette(document.documentElement);
  renderer = createCanvasRenderer(stage, palette);
  void upgradeRenderer(stage, palette);

  ($('run-launch') as HTMLButtonElement).onclick = () => launch();

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

  renderSkills();
  renderStatsPanel();
  renderMenu();
  setZoom(1);
  setPhase('menu');
  requestAnimationFrame(frame);
}

/** Re-read derived stats — called after equipment changes on the sheet. */
export function refreshRunPanels(): void {
  renderStatsPanel();
  renderSkills();
  renderMenu();
}

/** Called when the Run tab becomes visible. */
export function onRunShown(): void {
  setInventoryHandler(runHandler());
  renderMenu();
  renderSkills();
  renderStatsPanel();
  fitCanvas();
}
