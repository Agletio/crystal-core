/**
 * THE ABYSS'S HUD, its own and nothing of the shell's: two orbs of liquid —
 * blood and aether — painted live every frame with a surface that sloshes, the
 * skill sockets between them with their cooldown swept round, the flasks, the
 * Herald's bar, and an overlay canvas for the numbers a hit throws and the life
 * bar over anything hurt. Built ONCE and updated in place, like every HUD the
 * game has.
 */
import * as THREE from 'three';
import type { RunState } from '../sim/run';
import type { Cast } from './actors';
import type { Stage } from './stage';

export interface Icons {
  arc?: string;
  blink?: string;
  life?: string;
  mana?: string;
}

const STYLE = /* css */ `
.abyss { position: fixed; inset: 0; z-index: 400; background: #020203; overflow: hidden; cursor: crosshair; font-family: 'Cinzel', 'Trajan Pro', 'Palatino Linotype', 'Book Antiqua', Georgia, serif; color: #d9c9a3; user-select: none; }
.abyss canvas.abyss__gl { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.abyss canvas.abyss__ink { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.abyss__bar { position: absolute; left: 50%; bottom: 10px; transform: translateX(-50%); display: flex; align-items: flex-end; gap: 14px; pointer-events: none; }
.abyss__orb { position: relative; width: 150px; height: 150px; }
.abyss__orb canvas { width: 150px; height: 150px; display: block; filter: drop-shadow(0 6px 18px rgba(0,0,0,0.9)); }
.abyss__orb b { position: absolute; left: 0; right: 0; bottom: -2px; text-align: center; font-size: 13px; letter-spacing: 0.08em; color: #e8dcc0; text-shadow: 0 1px 3px #000, 0 0 8px #000; }
.abyss__belt { display: flex; gap: 8px; padding: 10px 16px 14px; margin-bottom: 18px; background: linear-gradient(180deg, rgba(20,16,14,0.92), rgba(8,6,6,0.96)); border: 1px solid #5a4630; border-top-color: #8a6c43; border-radius: 6px; box-shadow: 0 0 0 1px #000, inset 0 1px 0 rgba(255,220,160,0.12), 0 10px 30px rgba(0,0,0,0.85); }
.abyss__slot { position: relative; width: 58px; height: 58px; border: 1px solid #7d6440; border-radius: 4px; background: #0b0908 center / cover no-repeat; box-shadow: inset 0 0 12px rgba(0,0,0,0.9), 0 0 0 1px #000; overflow: hidden; }
.abyss__slot i { position: absolute; left: 3px; top: 1px; font-style: normal; font-size: 11px; color: #f3e2b8; text-shadow: 0 1px 2px #000, 0 0 4px #000; }
.abyss__slot u { position: absolute; right: 4px; bottom: 2px; text-decoration: none; font-size: 12px; color: #fff; text-shadow: 0 1px 2px #000; }
.abyss__slot canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.abyss__slot--gap { margin-left: 12px; }
.abyss__boss { position: absolute; left: 50%; top: 26px; transform: translateX(-50%); width: min(620px, 70vw); text-align: center; pointer-events: none; opacity: 0; transition: opacity 0.6s; }
.abyss__boss h2 { margin: 0 0 6px; font-size: 19px; font-weight: 600; letter-spacing: 0.12em; color: #f0c98a; text-shadow: 0 0 12px rgba(255,120,40,0.55), 0 2px 3px #000; }
.abyss__boss div { height: 14px; border: 1px solid #6e4a2a; background: #120606; box-shadow: 0 0 0 1px #000, 0 0 18px rgba(255,60,20,0.25); }
.abyss__boss div span { display: block; height: 100%; width: 100%; background: linear-gradient(180deg, #d9321e, #7a0c06); box-shadow: inset 0 1px 0 rgba(255,200,160,0.4); transition: width 0.12s; }
.abyss__target { position: absolute; left: 50%; top: 18px; transform: translateX(-50%); text-align: center; pointer-events: none; font-size: 15px; letter-spacing: 0.1em; opacity: 0; transition: opacity 0.25s; }
.abyss__target div { width: 260px; height: 8px; margin: 5px auto 0; background: #140707; border: 1px solid #4a3020; }
.abyss__target div span { display: block; height: 100%; background: #b3261e; }
.abyss__banner { position: absolute; left: 0; right: 0; top: 17%; text-align: center; pointer-events: none; opacity: 0; transition: opacity 1.2s; }
.abyss__banner h1 { margin: 0; font-size: 42px; font-weight: 600; letter-spacing: 0.22em; color: #e9d6ac; text-shadow: 0 0 22px rgba(0,0,0,1), 0 0 40px rgba(180,40,20,0.35), 0 3px 4px #000; }
.abyss__banner p { margin: 8px 0 0; font-size: 15px; font-style: italic; letter-spacing: 0.1em; color: #a89574; text-shadow: 0 2px 3px #000; }
.abyss__banner hr { width: 340px; margin: 12px auto 0; border: 0; height: 1px; background: linear-gradient(90deg, transparent, #9a7a48, transparent); }
.abyss__help { position: absolute; left: 16px; top: 14px; font-size: 12px; letter-spacing: 0.06em; color: #8f7f64; text-shadow: 0 1px 2px #000; pointer-events: none; line-height: 1.7; }
.abyss__leave { position: absolute; right: 16px; top: 14px; pointer-events: auto; font: inherit; font-size: 12px; letter-spacing: 0.12em; color: #d9c9a3; background: rgba(12,9,8,0.85); border: 1px solid #6a5234; padding: 7px 14px; cursor: pointer; }
.abyss__leave:hover { color: #fff; border-color: #b08850; }
.abyss__end { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; background: radial-gradient(ellipse at center, rgba(40,4,2,0.35), rgba(0,0,0,0.85)); opacity: 0; pointer-events: none; transition: opacity 1.4s; }
.abyss__end h1 { margin: 0; font-size: 64px; letter-spacing: 0.2em; font-weight: 600; color: #b8231a; text-shadow: 0 0 30px rgba(255,40,20,0.45), 0 4px 6px #000; }
.abyss__end--won h1 { color: #e8c27a; text-shadow: 0 0 30px rgba(255,170,60,0.4), 0 4px 6px #000; }
.abyss__end p { margin: 0; font-size: 17px; color: #d2bf98; font-style: italic; letter-spacing: 0.08em; text-shadow: 0 2px 4px #000; }
.abyss__end nav { display: flex; gap: 12px; margin-top: 10px; }
.abyss__end button { font: inherit; font-size: 14px; letter-spacing: 0.14em; color: #e8dcc0; background: rgba(16,12,10,0.95); border: 1px solid #7d6440; padding: 10px 20px; cursor: pointer; }
.abyss__end button:hover { border-color: #d0a868; color: #fff; }
.abyss__load { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; background: #030203; z-index: 2; transition: opacity 0.8s; }
.abyss__load h1 { margin: 0; font-size: 54px; letter-spacing: 0.34em; font-weight: 600; color: #cdb88e; text-shadow: 0 0 28px rgba(200,60,30,0.3); }
.abyss__load p { margin: 0; font-style: italic; color: #7d6d55; letter-spacing: 0.08em; }
.abyss__load div { width: 360px; height: 3px; background: #1a1210; }
.abyss__load div span { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #7a1c0c, #e0823a); transition: width 0.3s; }
`;

/** Liquid in a glass ball: a level, a surface that sloshes, a swirl inside, a highlight on the glass. */
function paintOrb(g: CanvasRenderingContext2D, px: number, fill: number, t: number, deep: string, bright: string, glow: string): void {
  const c = px / 2;
  const r = c * 0.86;
  g.clearRect(0, 0, px, px);
  g.save();
  g.beginPath();
  g.arc(c, c, r, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = '#050304';
  g.fillRect(0, 0, px, px);
  const level = c + r - fill * r * 2;
  const grad = g.createLinearGradient(0, level - 10, 0, c + r);
  grad.addColorStop(0, bright);
  grad.addColorStop(1, deep);
  g.fillStyle = grad;
  g.beginPath();
  g.moveTo(0, px);
  for (let x = 0; x <= px; x += 4) {
    const y = level + Math.sin(x * 0.045 + t * 2.1) * 3.2 + Math.sin(x * 0.11 - t * 3.3) * 1.6;
    g.lineTo(x, y);
  }
  g.lineTo(px, px);
  g.closePath();
  g.fill();
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 5; i++) {
    const a = t * (0.35 + i * 0.07) + i * 1.7;
    g.strokeStyle = glow;
    g.globalAlpha = 0.07;
    g.lineWidth = 10 + i * 3;
    g.beginPath();
    g.arc(c + Math.cos(a) * r * 0.25, c + r * 0.25 + Math.sin(a * 1.3) * r * 0.2, r * (0.35 + i * 0.1), a, a + 1.6);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.globalCompositeOperation = 'source-over';
  const shade = g.createRadialGradient(c, c, r * 0.4, c, c, r);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.75)');
  g.fillStyle = shade;
  g.fillRect(0, 0, px, px);
  g.restore();
  const shine = g.createRadialGradient(c - r * 0.35, c - r * 0.45, 2, c - r * 0.3, c - r * 0.4, r * 0.55);
  shine.addColorStop(0, 'rgba(255,255,255,0.42)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = shine;
  g.beginPath();
  g.arc(c, c, r, 0, Math.PI * 2);
  g.fill();
  const rim = g.createLinearGradient(0, 0, px, px);
  rim.addColorStop(0, '#b89660');
  rim.addColorStop(0.5, '#3a2a18');
  rim.addColorStop(1, '#8a6a3c');
  g.strokeStyle = rim;
  g.lineWidth = c * 0.16;
  g.beginPath();
  g.arc(c, c, r + c * 0.06, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.85)';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(c, c, r, 0, Math.PI * 2);
  g.stroke();
}

function sweep(g: CanvasRenderingContext2D, px: number, left: number): void {
  g.clearRect(0, 0, px, px);
  if (left <= 0) return;
  g.fillStyle = 'rgba(0,0,0,0.62)';
  g.beginPath();
  g.moveTo(px / 2, px / 2);
  g.arc(px / 2, px / 2, px, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left, false);
  g.closePath();
  g.fill();
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

export class Hud {
  readonly root = el('div', 'abyss');
  readonly gl = el('canvas', 'abyss__gl');
  private readonly ink = el('canvas', 'abyss__ink');
  private readonly inkG: CanvasRenderingContext2D;
  private readonly orbs: { g: CanvasRenderingContext2D; label: HTMLElement }[] = [];
  private readonly sweeps: CanvasRenderingContext2D[] = [];
  private readonly charges: HTMLElement[] = [];
  private readonly boss = el('div', 'abyss__boss');
  private readonly bossFill = el('span');
  private readonly target = el('div', 'abyss__target');
  private readonly targetName = el('span');
  private readonly targetFill = el('span');
  private readonly banner = el('div', 'abyss__banner');
  private readonly end = el('div', 'abyss__end');
  private readonly load = el('div', 'abyss__load');
  private readonly loadFill = el('span');
  private bannerFor = 0;
  private time = 0;
  readonly leave = el('button', 'abyss__leave', 'LEAVE THE ABYSS');

  constructor(icons: Icons) {
    const style = el('style');
    style.textContent = STYLE;
    this.root.append(style, this.gl, this.ink);
    this.inkG = this.ink.getContext('2d')!;
    const bar = el('div', 'abyss__bar');
    const orb = (label: string) => {
      const box = el('div', 'abyss__orb');
      const c = el('canvas');
      c.width = c.height = 300;
      const text = el('b', undefined, label);
      box.append(c, text);
      this.orbs.push({ g: c.getContext('2d')!, label: text });
      return box;
    };
    const belt = el('div', 'abyss__belt');
    const slot = (key: string, art: string | undefined, gap = false) => {
      const s = el('div', gap ? 'abyss__slot abyss__slot--gap' : 'abyss__slot');
      if (art) s.style.backgroundImage = `url(${art})`;
      const c = el('canvas');
      c.width = c.height = 116;
      const count = el('u');
      s.append(c, el('i', undefined, key), count);
      this.sweeps.push(c.getContext('2d')!);
      this.charges.push(count);
      belt.append(s);
    };
    slot('LMB', icons.arc);
    slot('SPACE', icons.blink);
    slot('1', icons.life, true);
    slot('2', icons.mana);
    bar.append(orb(''), belt, orb(''));
    this.boss.append(el('h2'), el('div'));
    this.boss.querySelector('div')!.append(this.bossFill);
    this.target.append(this.targetName, el('div'));
    this.target.querySelector('div')!.append(this.targetFill);
    this.banner.append(el('h1'), el('hr'), el('p'));
    const help = el('div', 'abyss__help');
    help.innerHTML = 'WASD — walk &nbsp;·&nbsp; LMB — Arc Lightning &nbsp;·&nbsp; SPACE — Blink<br>1 / 2 — flasks &nbsp;·&nbsp; wheel — zoom &nbsp;·&nbsp; ESC — leave';
    this.load.append(el('h1', undefined, 'THE ABYSS'), el('p', undefined, 'The Sanctum of the Pact'), el('div'));
    this.load.querySelector('div')!.append(this.loadFill);
    this.root.append(bar, this.boss, this.target, this.banner, help, this.leave, this.end, this.load);
  }

  loading(share: number, what: string): void {
    this.loadFill.style.width = `${Math.round(share * 100)}%`;
    (this.load.querySelector('p') as HTMLElement).textContent = what;
  }

  loaded(): void {
    this.load.style.opacity = '0';
    setTimeout(() => this.load.remove(), 900);
  }

  resize(w: number, h: number, ratio: number): void {
    this.ink.width = Math.round(w * ratio);
    this.ink.height = Math.round(h * ratio);
    this.inkG.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  announce(title: string, line: string, seconds = 4.5): void {
    (this.banner.querySelector('h1') as HTMLElement).textContent = title;
    (this.banner.querySelector('p') as HTMLElement).textContent = line;
    this.banner.style.opacity = '1';
    this.bannerFor = seconds;
  }

  finish(won: boolean, title: string, line: string, buttons: { label: string; go: () => void }[]): void {
    this.end.className = won ? 'abyss__end abyss__end--won' : 'abyss__end';
    this.end.replaceChildren(el('h1', undefined, title), el('p', undefined, line));
    const nav = el('nav');
    for (const b of buttons) {
      const btn = el('button', undefined, b.label);
      btn.onclick = b.go;
      nav.append(btn);
    }
    this.end.append(nav);
    this.banner.style.opacity = '0';
    this.bannerFor = 0;
    this.end.style.opacity = '1';
    this.end.style.pointerEvents = 'auto';
  }

  frame(state: RunState, stage: Stage, cast: Cast, dt: number, cooldown: { main: number; mover: number; moverOf: number }, herald: { name: string; life: number } | null, hover: string | null): void {
    this.time += dt;
    const hero = state.hero;
    const lifeShare = Math.max(0, hero.life / hero.stats.maxLife);
    const manaShare = Math.max(0, hero.mana / Math.max(1, hero.stats.maxMana));
    paintOrb(this.orbs[0].g, 300, lifeShare, this.time, '#3a0303', '#d0210f', 'rgba(255,90,60,1)');
    paintOrb(this.orbs[1].g, 300, manaShare, this.time + 3, '#03093a', '#2a5ae0', 'rgba(110,160,255,1)');
    const most = Math.round(hero.stats.maxLife);
    this.orbs[0].label.textContent = `${Math.min(most, Math.ceil(Math.max(0, hero.life)))} / ${most}`;
    this.orbs[1].label.textContent = `${Math.floor(Math.max(0, hero.mana))} / ${Math.round(hero.stats.maxMana)}`;
    sweep(this.sweeps[0], 116, cooldown.main);
    sweep(this.sweeps[1], 116, cooldown.moverOf > 0 ? cooldown.mover / cooldown.moverOf : 0);
    this.charges[0].textContent = '';
    this.charges[1].textContent = cooldown.mover > 0 ? cooldown.mover.toFixed(1) : '';
    this.charges[2].textContent = String(state.charges.flask_of_life ?? 0);
    this.charges[3].textContent = String(state.charges.flask_of_mana ?? 0);
    sweep(this.sweeps[2], 116, 0);
    sweep(this.sweeps[3], 116, 0);

    this.boss.style.opacity = herald ? '1' : '0';
    if (herald) {
      (this.boss.querySelector('h2') as HTMLElement).textContent = herald.name;
      this.bossFill.style.width = `${Math.max(0, herald.life) * 100}%`;
    }
    this.target.style.opacity = hover && !herald ? '1' : '0';
    if (hover) this.targetName.textContent = hover;

    if (this.bannerFor > 0) {
      this.bannerFor -= dt;
      if (this.bannerFor <= 0) this.banner.style.opacity = '0';
    }
    this.ink.style.display = 'block';
    this.paintInk(state, stage, cast);
  }

  hoverLife(share: number): void {
    this.targetFill.style.width = `${Math.max(0, share) * 100}%`;
  }

  private paintInk(state: RunState, stage: Stage, cast: Cast): void {
    const g = this.inkG;
    g.clearRect(0, 0, this.ink.width, this.ink.height);
    const at = new THREE.Vector3();
    for (const m of state.monsters) {
      if (m.dead || m.life >= m.stats.maxLife) continue;
      const a = cast.of(m.id);
      if (!a) continue;
      at.copy(a.root.position).setY(a.height * 1.08 + 0.15);
      const p = stage.screen(at);
      if (!p) continue;
      const w = m.rank === 'common' ? 46 : 64;
      g.fillStyle = 'rgba(0,0,0,0.75)';
      g.fillRect(p.x - w / 2 - 1, p.y - 1, w + 2, 6);
      g.fillStyle = m.rank === 'rare' ? '#e0a232' : m.rank === 'magic' ? '#5a82ff' : '#c42a1a';
      g.fillRect(p.x - w / 2, p.y, w * Math.max(0, m.life / m.stats.maxLife), 4);
    }
    g.textAlign = 'center';
    for (const f of state.floaters) {
      if (f.kind === 'note') continue;
      const rise = f.age * 1.6;
      at.set(f.x, 1.9 + rise, f.y);
      const p = stage.screen(at);
      if (!p) continue;
      const fade = Math.max(0, 1 - f.age / 1.1);
      const pop = f.age < 0.12 ? 1 + (0.12 - f.age) * 5 : 1;
      const size = (f.crit ? 28 : f.tick ? 14 : 20) * pop;
      g.font = `600 ${size}px 'Cinzel', Georgia, serif`;
      g.globalAlpha = fade;
      g.lineWidth = 4;
      g.strokeStyle = 'rgba(0,0,0,0.9)';
      const color = f.on === 'hero' ? (f.kind === 'heal' ? '#7fe07a' : f.kind === 'loot' || f.kind === 'gold' ? '#f0c060' : '#ff4a3a') : f.crit ? '#ffd24a' : '#f2ead8';
      g.strokeText(f.text, p.x, p.y);
      g.fillStyle = color;
      g.fillText(f.text, p.x, p.y);
    }
    g.globalAlpha = 1;
  }

  dispose(): void {
    this.root.remove();
  }
}
