/**
 * The run view: watch the character clear a map.
 *
 * Owns real time and nothing else. The sim advances in fixed TICK steps and
 * the renderer draws whatever state it finds, so pausing, speeding up, or a
 * janky frame can't change the outcome of a run — only how fast you watch it.
 */
import { Rng } from '../rng';
import { RunSim, TICK } from '../sim/run';
import type { RunEvent } from '../sim/run';
import { heroStats } from '../sim/stats';
import { starterLoadout } from '../sim/loadout';
import { makeCrystal } from '../economy';
import { createCanvasRenderer } from '../render/canvas2d';
import { readPalette } from '../render/renderer';
import type { Renderer } from '../render/renderer';
import { currentItem } from './bench';
import type { Item } from '../types';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let sim: RunSim | null = null;
let renderer: Renderer | null = null;
let playing = false;
let speed = 1;
let accumulator = 0;
let lastFrame = 0;
let seed = 0;
let log: Array<{ text: string; kind: string }> = [];
let crystalLabel = '—';
let gearLabel = '—';

/**
 * Builds the run from whatever is on the bench.
 *
 * A crystal on the bench becomes the map; a piece of gear becomes equipment,
 * replacing the starter item of the same base. Neither is a real inventory —
 * it's the cheapest wiring that lets you craft something and immediately see
 * what it does.
 */
function buildSim(): RunSim {
  seed = Math.floor(Math.random() * 1e9);
  const bench = currentItem();

  const crystal: Item = bench.kind === 'crystal' ? bench : makeCrystal(3);
  crystalLabel = `${crystal.name}${crystal.mods.length ? '' : ' (unmodded)'}`;

  const loadout = starterLoadout(new Rng(seed ^ 0x5f5f5f));
  if (bench.kind === 'gear') {
    const idx = loadout.findIndex((i) => i.base === bench.base);
    if (idx >= 0) loadout[idx] = bench;
    else loadout.push(bench);
    gearLabel = `starter + ${bench.name}`;
  } else {
    gearLabel = 'starter set';
  }

  const built = new RunSim(crystal, loadout, new Rng(seed));
  renderStatsPanel(loadout);
  return built;
}

function renderStatsPanel(loadout: Item[]): void {
  const s = heroStats(loadout);
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

  for (const [label, value] of rows) {
    const row = el('div', 'stat');
    row.append(el('span', 'stat__k', label));
    row.append(el('span', 'stat__v', value));
    host.append(row);
  }
}

function note(text: string, kind = 'note'): void {
  log.unshift({ text, kind });
  if (log.length > 60) log.length = 60;
}

function renderLog(): void {
  const host = $('run-log');
  host.replaceChildren();
  if (log.length === 0) {
    host.append(el('p', 'empty', 'Press Start to send the character in.'));
  }
  for (const entry of log) {
    host.append(el('div', `logline logline--${entry.kind}`, entry.text));
  }
}

function renderReadout(): void {
  if (!sim) return;
  const s = sim.state;

  $('run-elapsed').textContent = `${s.elapsed.toFixed(1)}s`;
  $('run-killed').textContent = `${s.killed}/${s.totalMonsters}`;
  $('run-seed').textContent = String(seed);
  $('run-source').textContent = `${crystalLabel} · ${gearLabel}`;

  const frac = Math.max(0, s.hero.life / s.hero.stats.maxLife);
  ($('run-hp-fill') as HTMLElement).style.width = `${frac * 100}%`;
  $('run-hp-text').textContent =
    `${Math.max(0, Math.round(s.hero.life))} / ${Math.round(s.hero.stats.maxLife)}`;

  const status = $('run-status');
  status.textContent =
    s.status === 'running' ? (playing ? 'running' : 'paused') : s.status;
  status.className = `run-status run-status--${s.status}`;
}

function absorbEvents(): void {
  if (!sim) return;
  let kills = 0;
  for (const e of sim.drainEvents() as RunEvent[]) {
    if (e.kind === 'kill') kills++;
    else if (e.kind === 'cleared') {
      note(`Cleared in ${e.seconds.toFixed(1)}s — ${e.killed} killed`, 'add');
      playing = false;
      setStartLabel();
    } else if (e.kind === 'died') {
      note(`Died at ${e.seconds.toFixed(1)}s — ${e.killed} killed`, 'fail');
      playing = false;
      setStartLabel();
    }
  }
  // Kills are summarised rather than logged one by one; fifty lines of
  // "killed a monster" is noise, not history.
  if (kills > 0) note(`+${kills} killed`, 'remove');
}

function frame(now: number): void {
  const dt = lastFrame === 0 ? 0 : Math.min(0.25, (now - lastFrame) / 1000);
  lastFrame = now;

  if (playing && sim && sim.state.status === 'running') {
    accumulator += dt * speed;
    let steps = 0;
    while (accumulator >= TICK && steps < 400) {
      sim.step(TICK);
      accumulator -= TICK;
      steps++;
    }
    absorbEvents();
    renderLog();
  }

  if (sim && renderer) renderer.draw(sim.state);
  renderReadout();
  requestAnimationFrame(frame);
}

function setStartLabel(): void {
  const btn = $('run-start') as HTMLButtonElement;
  const done = sim && sim.state.status !== 'running';
  btn.textContent = done ? 'Finished' : playing ? 'Pause' : 'Start';
  btn.disabled = !!done;
}

function newRun(): void {
  sim = buildSim();
  log = [];
  accumulator = 0;
  playing = true;
  note(`Seed ${seed} · ${sim.state.totalMonsters} monsters`, 'note');
  setStartLabel();
  renderLog();
  fitCanvas();
}

function fitCanvas(): void {
  const canvas = $('run-canvas') as HTMLCanvasElement;
  const box = canvas.parentElement!;
  const width = box.clientWidth;
  const height = Math.max(320, Math.round(width * 0.66));
  renderer?.resize(width, height);
}

export function initRun(): void {
  const canvas = $('run-canvas') as HTMLCanvasElement;
  renderer = createCanvasRenderer(canvas, readPalette(document.documentElement));

  ($('run-start') as HTMLButtonElement).onclick = () => {
    if (!sim || sim.state.status !== 'running') {
      newRun();
      return;
    }
    playing = !playing;
    setStartLabel();
  };

  ($('run-new') as HTMLButtonElement).onclick = () => newRun();

  for (const mult of [1, 2, 4]) {
    const btn = $(`run-speed-${mult}`) as HTMLButtonElement;
    btn.onclick = () => {
      speed = mult;
      for (const m of [1, 2, 4]) {
        $(`run-speed-${m}`).classList.toggle('chip--on', m === speed);
      }
    };
  }
  $('run-speed-1').classList.add('chip--on');

  globalThis.addEventListener('resize', fitCanvas);

  sim = buildSim();
  fitCanvas();
  renderLog();
  setStartLabel();
  // Paint once up front so the panel is populated before the first frame —
  // otherwise everything reads as placeholder text until you press Start.
  renderReadout();
  requestAnimationFrame(frame);
}

/** Called when the Run tab becomes visible — the canvas has no size while hidden. */
export function onRunShown(): void {
  fitCanvas();
  renderReadout();
}
