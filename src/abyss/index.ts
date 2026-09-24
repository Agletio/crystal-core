/**
 * THE ABYSS, the dev kit's door into a level built in three dimensions: one
 * Aethermancer with Arc Lightning and Blink, one hand-laid descent through a
 * cathedral into a lava rift, one Herald at the bottom of it.
 *
 * It is a SANDBOX over the real sim. The hero is dressed off the drop ladder
 * rather than taken from the save, nothing it finds is banked, and leaving puts
 * you back in the camp exactly as you left it. Over the page and under nothing:
 * while it is up it owns the keyboard, and the game behind it is held.
 */
import * as THREE from 'three';
import { MONSTER_BY_ID } from '../data';
import { TICK } from '../sim/run';
import type { Entity } from '../sim/run';
import { Cast } from './actors';
import { loadAssets } from '../gl/assets';
import type { Assets } from '../gl/assets';
import { flames } from '../gl/fire';
import { Director } from './fx';
import { Hud } from './hud';
import { CIRCLE, HERALD, ROOMS } from './level';
import { Lamps } from '../gl/lights';
import { Particles } from '../gl/particles';
import { shared } from '../gl/shaders';
import { Abyss, aethermancer } from './sim';
import { Stage } from '../gl/stage';
import { buildWorld } from './world';

const AREAS: Record<string, [string, string]> = {
  crypt: ['THE STAIR OF ASH', 'Where the faithful came down, and did not come up.'],
  gallery: ['THE OSSUARY GALLERY', 'Ten thousand saints, and not one of them resting.'],
  nave: ['THE WEEPING NAVE', 'The glass still bleeds for the god who left it.'],
  chapel: ['CHAPEL OF THE DROWNED SAINTS', 'They sealed the doors and prayed the water down.'],
  wound: ['THE WOUND', 'The rock opened here, and never closed.'],
  sanctum: ['SANCTUM OF THE PACT', 'Something was promised here. It has come to collect.'],
};

let up = false;
export const isAbyssOpen = (): boolean => up;

interface Session {
  run: Abyss;
  cast: Cast;
  fx: Director;
  was: Map<number, { x: number; y: number }>;
  acc: number;
  seen: Set<string>;
  ended: boolean;
  risen: boolean;
}

/** Into the Abyss. `leave` runs once the overlay is gone and the camp is yours again. */
export async function enterAbyss(name: string, leave: () => void): Promise<void> {
  if (up) return;
  up = true;
  const heldBefore = document.body.dataset.hold;
  document.body.dataset.hold = '1';

  const hud = new Hud({});
  document.body.append(hud.root);
  const stage = new Stage(hud.gl);
  const size = () => {
    const w = globalThis.innerWidth;
    const h = globalThis.innerHeight;
    stage.resize(w, h);
    hud.resize(w, h, Math.min(2, globalThis.devicePixelRatio || 1));
    motes.setScale(h * stage.renderer.getPixelRatio(), stage.camera.fov);
  };
  const motes = new Particles();

  let assets: Assets;
  try {
    assets = await loadAssets('abyss', ['world', 'actors', 'props', 'furniture'], stage.anisotropy, (what, share) => hud.loading(share, what));
  } catch (err) {
    hud.loading(0, `The Abyss would not open: ${(err as Error).message}`);
    await new Promise((go) => setTimeout(go, 2500));
    hud.dispose();
    stage.dispose();
    document.body.dataset.hold = heldBefore ?? '';
    if (!heldBefore) delete document.body.dataset.hold;
    up = false;
    leave();
    return;
  }
  for (const [slot, key] of [[0, 'arc'], [1, 'blink'], [2, 'life'], [3, 'mana']] as const) {
    const art = assets.icons[key];
    const el = hud.root.querySelectorAll<HTMLElement>('.abyss__slot')[slot];
    if (art && el) el.style.backgroundImage = `url(${art})`;
  }

  const s = shared();
  const world = buildWorld(assets, s, new THREE.Vector3(CIRCLE.x, 0, CIRCLE.y));
  stage.scene.add(world.group);
  const fire = flames(world.flames, s);
  stage.scene.add(fire);
  const lamps = new Lamps(stage.quality);
  lamps.use(world.lights);
  stage.scene.add(lamps.group, motes.group);
  stage.glowing.push(fire, motes.group, world.marks);
  size();

  let slow = 1; // a harness's slow motion, to catch a bolt that lives a quarter of a second
  let armed = 0; // …entered the moment the hero next casts
  let seed = (Math.random() * 1e9) | 0;
  let session: Session;
  const begin = (): Session => {
    const run = new Abyss(aethermancer(name, seed), seed);
    const cast = new Cast(assets, s, {
      swung: () => undefined,
      cast: (a) => {
        session?.fx.casting(a);
        if (armed) (slow = armed), (armed = 0);
      },
      died: (a) => session?.fx.fell(a),
      burnt: (a) => session?.fx.burn(a),
    });
    stage.scene.add(cast.group);
    const fx = new Director(stage, lamps, motes, cast, s, world);
    stage.scene.add(fx.group);
    stage.glowing.push(fx.group);
    return { run, cast, fx, was: new Map(), acc: 0, seen: new Set(), ended: false, risen: false };
  };
  const end = (): void => {
    stage.scene.remove(session.cast.group, session.fx.group);
    stage.glowing.splice(stage.glowing.indexOf(session.fx.group), 1);
    session.cast.dispose();
  };
  session = begin();
  hud.loaded();
  hud.announce('THE ABYSS', 'Walk down. Break the Pact.', 4);

  const keys = new Set<string>();
  let cursor = { x: globalThis.innerWidth / 2, y: globalThis.innerHeight / 2 };
  let casting = false;
  const tileAt = (px: number, py: number) => {
    const p = stage.ground(px, py);
    return p ? { x: p.x, y: p.z } : { x: session.run.sim.state.hero.x, y: session.run.sim.state.hero.y };
  };
  const push = (): void => {
    const { up: fwd, right } = stage.axes();
    let x = 0;
    let y = 0;
    if (keys.has('w')) (x += fwd.x), (y += fwd.y);
    if (keys.has('s')) (x -= fwd.x), (y -= fwd.y);
    if (keys.has('d')) (x += right.x), (y += right.y);
    if (keys.has('a')) (x -= right.x), (y -= right.y);
    session.run.sim.hold(x, y);
  };
  const onKey = (event: KeyboardEvent): void => {
    event.stopPropagation();
    if (event.metaKey || event.ctrlKey) return;
    const key = event.key.toLowerCase();
    const down = event.type === 'keydown';
    if (['w', 'a', 's', 'd'].includes(key)) {
      event.preventDefault();
      if (down) keys.add(key);
      else keys.delete(key);
      push();
      return;
    }
    if (!down) return;
    if (key === ' ') {
      event.preventDefault();
      session.run.sim.stepTo(tileAt(cursor.x, cursor.y));
    } else if (key === '1') session.run.sim.usePotion('flask_of_life');
    else if (key === '2') session.run.sim.usePotion('flask_of_mana');
    else if (key === 'escape') close();
  };
  const onMove = (e: PointerEvent) => (cursor = { x: e.clientX, y: e.clientY });
  const onDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    cursor = { x: e.clientX, y: e.clientY };
    casting = true;
    session.run.sim.castTo(tileAt(cursor.x, cursor.y));
  };
  const onUp = () => (casting = false);
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    stage.zoom(e.deltaY > 0 ? 1.1 : 1 / 1.1);
  };
  const onBlur = () => {
    keys.clear();
    casting = false;
    session.run.sim.hold(0, 0);
  };
  const noMenu = (e: Event) => e.preventDefault();
  globalThis.addEventListener('keydown', onKey, true);
  globalThis.addEventListener('keyup', onKey, true);
  globalThis.addEventListener('resize', size);
  globalThis.addEventListener('blur', onBlur);
  hud.root.addEventListener('pointermove', onMove);
  hud.root.addEventListener('pointerdown', onDown);
  globalThis.addEventListener('pointerup', onUp);
  hud.root.addEventListener('wheel', onWheel, { passive: false });
  hud.root.addEventListener('contextmenu', noMenu);

  let frameId = 0;
  let last = performance.now();
  const pace = { ms: 16, clock: -4000 }; // the first seconds compile shaders, and are never a frame rate
  const hero = new THREE.Vector3();
  const chest = new THREE.Vector3();

  const name2 = (e: Entity): string => (e === session.run.herald ? HERALD.name : (MONSTER_BY_ID[e.defId ?? '']?.name ?? 'Demon'));

  const tick = (now: number): void => {
    frameId = requestAnimationFrame(tick);
    const took = Math.max(0, now - last);
    const dt = Math.min(0.1, took / 1000) * slow; // a frame's stamp can land before the last one read
    last = now;
    pace.ms += (took - pace.ms) * 0.05;
    pace.clock += took;
    if (!stage.forced && pace.clock > 3000 && pace.ms > 28) {
      pace.clock = 0; // three seconds at under 36fps before anything else is given up
      const gave = stage.lighten();
      if (gave) console.info(`The Abyss gave up ${gave} for frame rate (${pace.ms.toFixed(0)}ms a frame).`);
    }
    const { run, cast, fx } = session;
    const state = run.sim.state;

    if (!session.ended) {
      if (casting) run.sim.castTo(tileAt(cursor.x, cursor.y));
      session.acc += dt;
      let steps = 0;
      while (session.acc >= TICK && steps < 8) {
        for (const e of [state.hero, ...state.monsters]) session.was.set(e.id, { x: e.x, y: e.y });
        run.step(TICK);
        session.acc -= TICK;
        steps++;
      }
      if (steps === 8) session.acc = 0;
    }
    const alpha = session.acc / TICK;
    for (const e of [state.hero, ...state.monsters]) {
      const w = session.was.get(e.id);
      if (w && Math.hypot(e.x - w.x, e.y - w.y) > 1.5) session.was.set(e.id, { x: e.x, y: e.y }); // a teleport, never a slide
    }

    cast.sync(state, session.was, alpha, dt, run.herald);
    const me = cast.of(state.hero.id);
    if (me) hero.copy(me.root.position);
    else hero.set(state.hero.x, 0, state.hero.y);
    stage.place(hero, dt, s.uTime.value === 0);
    s.uTime.value += dt;
    s.uHero.value.copy(me ? me.chest(chest) : hero);
    s.uCam.value.copy(stage.camera.position);

    if (run.phase === 'herald' && !session.risen) {
      session.risen = true;
      fx.erupt(new THREE.Vector3(CIRCLE.x, 0, CIRCLE.y));
      hud.announce(HERALD.name.toUpperCase(), 'The circle answers.', 4);
    }
    if (run.phase === 'open' && !session.seen.has('open')) {
      session.seen.add('open');
      hud.announce('THE PACT IS BROKEN', 'Step into the circle to leave.', 4.5);
    }
    fx.frame(state, dt, run.open);
    lamps.update(stage.focus, hero, s.uTime.value, dt);
    motes.update(dt);

    for (const [id, room] of Object.entries(ROOMS)) {
      if (session.seen.has(id)) continue;
      const h = state.hero;
      if (h.x >= room.x && h.x < room.x + room.w && h.y >= room.y && h.y < room.y + room.h && id !== 'crypt') {
        session.seen.add(id);
        hud.announce(...AREAS[id]);
      }
    }
    if (!session.seen.has('wound') && state.hero.x >= 55 && state.hero.x <= 65) {
      session.seen.add('wound');
      hud.announce(...AREAS.wound);
    }

    const g = stage.ground(cursor.x, cursor.y);
    let hover: Entity | null = null;
    if (g) {
      let far = 1.3;
      for (const m of state.monsters) {
        if (m.dead) continue;
        const d = Math.hypot(m.x - g.x, m.y - g.z);
        if (d < far) (far = d), (hover = m);
      }
    }
    if (hover) hud.hoverLife(hover.life / hover.stats.maxLife);
    const herald = run.herald && !run.herald.dead ? { name: HERALD.name, life: run.herald.life / run.herald.stats.maxLife } : null;
    const wait = run.sim.moverWait;
    const main = Math.max(0, Math.min(1, state.hero.cooldown / Math.max(0.05, 1 / Math.max(0.1, state.hero.stats.attacksPerSecond ?? 1))));
    hud.frame(state, stage, cast, dt, { main, mover: wait.left, moverOf: wait.of }, herald, hover ? name2(hover) : null);
    if (!session.ended && (run.phase === 'died' || run.phase === 'cleared')) finish(run.phase === 'cleared');
    stage.render(dt);
  };

  const finish = (won: boolean): void => {
    session.ended = true;
    const state = session.run.sim.state;
    const secs = Math.round(state.elapsed);
    const time = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    setTimeout(() => {
      hud.finish(
        won,
        won ? 'THE PACT IS BROKEN' : 'YOU HAVE DIED',
        won ? `${state.killed} slain in ${time}.` : `${state.killed} of ${state.totalMonsters} put down before the dark took you.`,
        [
          { label: won ? 'DESCEND AGAIN' : 'RISE AGAIN', go: restart },
          { label: 'RETURN TO CAMP', go: close },
        ]
      );
    }, won ? 1200 : 1800);
  };

  const restart = (): void => {
    end();
    seed = (Math.random() * 1e9) | 0;
    session = begin();
    const endEl = hud.root.querySelector<HTMLElement>('.abyss__end');
    if (endEl) (endEl.style.opacity = '0'), (endEl.style.pointerEvents = 'none');
    hud.announce('THE ABYSS', 'Walk down. Break the Pact.', 3.5);
  };

  const close = (): void => {
    cancelAnimationFrame(frameId);
    globalThis.removeEventListener('keydown', onKey, true);
    globalThis.removeEventListener('keyup', onKey, true);
    globalThis.removeEventListener('resize', size);
    globalThis.removeEventListener('blur', onBlur);
    globalThis.removeEventListener('pointerup', onUp);
    end();
    stage.dispose();
    hud.dispose();
    if (heldBefore === undefined) delete document.body.dataset.hold;
    else document.body.dataset.hold = heldBefore;
    up = false;
    leave();
  };
  hud.leave.onclick = close;
  (globalThis as Record<string, unknown>).__abyss = {
    get state() { return session.run.sim.state; },
    get phase() { return session.run.phase; },
    stage,
    close,
    project: (x: number, y: number, z: number) => stage.screen(new THREE.Vector3(x, y, z)),
    slow: (k: number) => (slow = k),
    slowOnCast: (k: number) => (armed = k),
    stats: () => ({ quality: stage.quality, calls: stage.renderer.info.render.calls, triangles: stage.renderer.info.render.triangles, bolts: session.fx.bolts.active }),
    probe: () => {
      const bad: string[] = [];
      stage.scene.traverse((o) => {
        if (o.matrixWorld.elements.some((v) => !Number.isFinite(v))) bad.push(`matrix ${o.type} ${o.name}`);
        const light = o as THREE.Light;
        if (light.isLight && !Number.isFinite(light.intensity)) bad.push(`light ${o.type}`);
      });
      const clocks = stage as unknown as Record<string, number>;
      return { flash: clocks.flash, hurt: stage.hurt, time: clocks.time, uTime: s.uTime.value, focus: stage.focus.toArray(), bad: bad.slice(0, 12), nBad: bad.length };
    },
  };
  frameId = requestAnimationFrame(tick);
}
