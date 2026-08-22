/**
 * THE CAMP — one drawn picture, things on it you click, and the hero standing
 * in it.
 *
 * Nothing here is a map. The scene is `SCENE_ART.camp`, everything is
 * positioned in that picture's OWN pixels, and one `scale` on the stage takes
 * the lot to whatever the window is — so a hotspot cannot drift off the thing
 * it sits on however the window is resized.
 *
 * The only moving parts are LIGHT and WIND, drawn on one canvas over the art:
 * the split and the fire breathe, and gusts blow across the grass. The user's
 * line is the whole spec — *"we don't need the characters to move around or
 * anything, we just need some motion so it feels alive"*.
 */
import {
  CAMP_ART,
  CAMP_GLOW,
  CAMP_HERO_SCALE,
  CAMP_HOTSPOTS,
  CAMP_SPOTS,
  CAMP_STAND,
  CAMP_WIND,
} from '../scenes/camp';
import type { Hotspot } from '../scenes/camp';
import { SCENE_ART } from '../render/generated-scene';
import { GENERATED } from '../render/generated-art';
import { heroSpriteFor } from '../sim/appearance';
import { RUN_SLOTS } from '../data';
import { folkMet } from '../game/scenes';
import { crystalIcon } from './icons';
import { showTooltip, hideTooltip } from './tooltip';
import { syncTalk } from './talk';
import type { GameState } from '../game/state';

const $ = (id: string) => document.getElementById(id)!;

let game: GameState;
let opens: Record<string, (spot: Hotspot, at: DOMRect) => void> = {};
let live = false;
let started = 0;

/** How far a window may be off the picture's own shape before the picture is
 *  let go of rather than pulled: past this it reads as squashed. */
const STRETCH = 1.3;

/** FILLS THE WINDOW, and the two axes are allowed to differ. Cover is not on:
 *  the bench is against the left edge and the shelf against the right, so a
 *  crop takes a verb off the screen. A 16:10 window is a 12% pull on a 16:9
 *  picture, which reads as a wider room; past `STRETCH` the excess axis is
 *  let go and the black comes back rather than the camp looking wrong. */
function fit(): void {
  const art = SCENE_ART[CAMP_ART];
  if (!art) return;
  const box = $('camp').getBoundingClientRect();
  const wide = (box.width || globalThis.innerWidth) / art.w;
  const tall = (box.height || globalThis.innerHeight) / art.h;
  const most = Math.min(wide, tall) * STRETCH;
  const style = $('camp-stage').style;
  style.setProperty('--camp-sx', String(Math.max(0.2, Math.min(wide, most))));
  style.setProperty('--camp-sy', String(Math.max(0.2, Math.min(tall, most))));
}

export function initCamp(
  state: GameState,
  screens: Record<string, (spot: Hotspot, at: DOMRect) => void>
): void {
  game = state;
  opens = screens;
  const art = SCENE_ART[CAMP_ART];
  const stage = $('camp-stage');
  if (art) {
    stage.style.width = `${art.w}px`;
    stage.style.height = `${art.h}px`;
    $('camp-art').style.backgroundImage = `url(${art.png})`;
    const canvas = $('camp-live') as HTMLCanvasElement;
    canvas.width = art.w;
    canvas.height = art.h;
  }

  for (const spot of CAMP_HOTSPOTS) mount(spot);
  globalThis.addEventListener('resize', () => {
    fit();
    syncTalk();
  });
  fit();
}

/** One button per rectangle. A hotspot is a BUTTON rather than a hit test on a
 *  canvas: a keyboard reaches it, a screen reader names it, and the hover is
 *  the game's own tooltip like everywhere else. */
function mount(spot: Hotspot, host = 'camp-hotspots'): void {
  const btn = document.createElement('button');
  btn.className = 'camp__hot';
  btn.id = `camp-${spot.id}`;
  btn.style.left = `${spot.x}px`;
  btn.style.top = `${spot.y}px`;
  btn.style.width = `${spot.w}px`;
  btn.style.height = `${spot.h}px`;
  btn.setAttribute('aria-label', spot.says);
  btn.onclick = () => {
    hideTooltip();
    opens[spot.opens]?.(spot, btn.getBoundingClientRect());
  };
  // Hover carries meaning, because this is a desktop game.
  btn.onpointerenter = (event) => showTooltip(says(spot), event.clientX, event.clientY);
  btn.onpointerleave = () => hideTooltip();
  $(host).append(btn);
}

/** A PERSON is a hotspot too, and theirs moves: it is wherever their body was
 *  drawn, which is a spot and the size of that body's own grid. */
function mountFolk(): void {
  const host = $('camp-folk');
  host.replaceChildren();
  folkMet(game).forEach((def, i) => {
    const grid = (GENERATED[def.who]?.grid ?? 32) * CAMP_HERO_SCALE;
    const at = CAMP_SPOTS[i % CAMP_SPOTS.length];
    mount(
      {
        id: `who-${def.id}`,
        x: at.x - grid / 2, y: at.y - grid, w: grid, h: grid,
        opens: 'room', room: def.id,
        says: `${def.name}. ${def.said}`,
      },
      'camp-folk'
    );
  });
}

/** What a socket says is what is IN it, which the table cannot know. */
function says(spot: Hotspot): string {
  if (spot.opens !== 'socket') return spot.says;
  const held = game.sockets[RUN_SLOTS[spot.slot ?? 0]?.id ?? ''];
  return held ? `${held.name}. Click to take it back.` : 'An empty socket. Click to choose a crystal.';
}

/** THE SOCKETS SHOW WHAT IS IN THEM, over the hollow the art drew. */
export function renderCamp(): void {
  mountFolk();
  const host = $('camp-crystals');
  host.replaceChildren();
  for (const spot of CAMP_HOTSPOTS) {
    if (spot.opens !== 'socket') continue;
    const held = game.sockets[RUN_SLOTS[spot.slot ?? 0]?.id ?? ''];
    if (!held) continue;
    const cell = document.createElement('div');
    cell.className = 'camp__crystal';
    cell.style.left = `${spot.x + spot.w / 2}px`;
    cell.style.top = `${spot.y + spot.h / 2}px`;
    cell.append(crystalIcon((held.meta.level as number) ?? 1, spot.w * 0.62, (held.meta.family as string) ?? 'normal'));
    host.append(cell);
  }
}

export const isCampOpen = (): boolean => !$('camp').hidden;

export function openCamp(): void {
  renderCamp();
  $('camp').hidden = false;
  fit();
  if (live) return;
  live = true;
  started = 0;
  requestAnimationFrame(frame);
}

export function closeCamp(): void {
  $('camp').hidden = true;
  live = false;
}

// --- what moves -------------------------------------------------------------

/** A gust: where it is across the grass, how fast, and how long it has left.
 *  Half a dozen at a time, so the field is never still and never busy. */
interface Gust {
  x: number;
  y: number;
  speed: number;
  len: number;
  life: number;
  of: number;
}
const gusts: Gust[] = [];
const GUSTS = 7;

/** Deterministic enough to be quiet, random enough not to read as a loop. */
let seed = 20260822;
const roll = (): number => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};

function blow(g: Gust): void {
  g.x = CAMP_WIND.x - roll() * 120;
  g.y = CAMP_WIND.y + roll() * CAMP_WIND.h;
  g.speed = 26 + roll() * 46;
  g.len = 10 + roll() * 26;
  g.of = 2.4 + roll() * 2.6;
  g.life = g.of;
}

function frame(now: number): void {
  if (!live) return;
  if (started === 0) started = now;
  const at = (now - started) / 1000;
  const canvas = $('camp-live') as HTMLCanvasElement;
  const ctx = canvas.getContext?.('2d') ?? null;
  // No 2d context in jsdom: the picture and every hotspot still stand, which
  // is the half a headless harness can see.
  if (ctx) draw(ctx, canvas, at);
  requestAnimationFrame(frame);
}

function draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, at: number): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // LIGHT, breathing. Added rather than painted, so it lifts what the art
  // already drew instead of laying a coloured sheet over it.
  ctx.globalCompositeOperation = 'lighter';
  for (const glow of CAMP_GLOW) {
    const swell = (1 + Math.sin((at / glow.period) * Math.PI * 2)) / 2;
    const cx = glow.x + glow.w / 2;
    const cy = glow.y + glow.h / 2;
    const r = Math.max(glow.w, glow.h) / 2;
    const paint = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    paint.addColorStop(0, tint(glow.hue, glow.depth * (0.45 + swell * 0.55)));
    paint.addColorStop(1, tint(glow.hue, 0));
    ctx.fillStyle = paint;
    ctx.fillRect(glow.x - r, glow.y - r, glow.w + r * 2, glow.h + r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';

  // WIND. Pale streaks drifting across the grass and fading at both ends, so
  // nothing pops into being: a gust is over before you have looked at it.
  const step = 1 / 60;
  if (gusts.length === 0) for (let i = 0; i < GUSTS; i++) gusts.push({ x: 0, y: 0, speed: 0, len: 0, life: 0, of: 1 }), blow(gusts[i]);
  for (const g of gusts) {
    g.x += g.speed * step;
    g.life -= step;
    if (g.life <= 0 || g.x > CAMP_WIND.x + CAMP_WIND.w + 40) blow(g);
    const fade = Math.sin((1 - g.life / g.of) * Math.PI);
    if (fade <= 0) continue;
    ctx.strokeStyle = `rgba(236,240,214,${(0.3 * fade).toFixed(3)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.lineTo(g.x + g.len, g.y - g.len * 0.16);
    ctx.stroke();
  }

  // Everybody you have MET, then the hero over them: he is the one you are
  // looking for, so nothing stands in front of him.
  const met = folkMet(game);
  met.forEach((who, i) => {
    const spot = CAMP_SPOTS[i % CAMP_SPOTS.length];
    body(ctx, who.who, spot.x, spot.y, at, i * 0.7);
  });
  body(ctx, heroSpriteFor(game.character), CAMP_STAND.x, CAMP_STAND.y, at, 0);
}

/** One body, standing, at its own idle cadence. Drawn from its FEET, which is
 *  what the spots are — a body pinned at its middle floats. */
function body(
  ctx: CanvasRenderingContext2D,
  sprite: string,
  fx: number,
  fy: number,
  at: number,
  offset: number
): void {
  const art = GENERATED[sprite];
  if (!art) return;
  const idle = art.states.idle ?? art.states.walk ?? [0];
  const which = idle[Math.floor((at + offset) * 2.2) % idle.length] ?? 0;
  const frames = art.frames[which];
  if (!frames) return;

  const s = CAMP_HERO_SCALE;
  const left = Math.round(fx - (art.grid * s) / 2);
  const top = Math.round(fy - art.grid * s);
  for (let y = 0; y < art.grid; y++) {
    const row = frames[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x++) {
      const hex = art.key[row[x]];
      if (!hex) continue;
      ctx.fillStyle = hex;
      ctx.fillRect(left + x * s, top + y * s, s, s);
    }
  }
}

/** A hex and an alpha, as the `rgba()` a gradient stop wants. */
function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha.toFixed(3)})`;
}
