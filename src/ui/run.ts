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
import { characterStats, treeGrants, trialMod } from '../sim/stats';
import {
  attributePointsLeft,
  equippedSkill,
  mainSkillId,
  openSlots,
  spareTreePoints,
  tradePointsLeft,
  trialPointsLeft,
  weaponRefusal,
  xpToNext,
} from '../sim/character';
import { describeMod } from '../crafting';
import { compositionText, crystalFamily, farmingText, runSet, setRows } from '../sim/crystal';
import {
  BOSS_BY_ID,
  BOSS_KEYS,
  FAMILY_BY_ID,
  LAMPWRIGHT,
  POTIONS,
  BOSS_FIGHT,
  BOSS_SHOUTS,
  RUN_SLOTS,
  MAIN_SLOT,
  SKILL_BY_ID,
  SKILL_SLOTS,
  THEME_BY_ID,
} from '../data';
import { spend } from '../economy';
import { bagsFull, crystalsIn, socketed, unsocket } from '../game/state';
import type { GameState } from '../game/state';
import { crystalProgress } from '../game/crystals';
import { bossBeaten, folkMet, hasMet, takeBoss, takeMet } from '../game/scenes';
import { takeTrials } from '../game/trials';
import { SCENES, SCENE_BY_ID } from '../scenes';
import type { Hotspot } from '../scenes/camp';
import { initCamp, openCamp, closeCamp, isCampOpen, renderCamp } from './camp';
import { openTalk } from './talk';
import type { SceneDef } from '../scenes';
import { buildReport, lootRows } from '../game/report';
import type { RunReport } from '../game/report';
import { closeMet, isMetOpen } from './met';
import { closeGraft, isGraftOpen } from './graft';
import { anchor, endSpeech, speakingAt, speakingBeat, startSpeech, syncSpeech } from './speech';
import { openCrystals } from './crystals';
import { createCanvasRenderer } from '../render/canvas2d';
import { createPixiRenderer } from '../render/pixi';
import { ZOOM_STEP, clampZoom, defaultZoom, readPalette } from '../render/renderer';
import type { Palette, Renderer } from '../render/renderer';
import type { Vec2 } from '../sim/grid';
import { flaskIcon } from './flaskart';
import { potionReading, potionWorkings } from '../potion-text';
import { skillWorkings } from '../skill-text';
import { openInventory, renderInventory, setInventoryBase, setInventoryHandler } from './inventory';
import { keyFor, keyName } from './keys';
import { note } from './history';
import { badge } from './badge';
import { openCharacter } from './character';
import { openCraft } from './craft';
import { openStash } from './stash';
import { drawn, portraitIcon, skillIcon } from './icons';
import { itemIcon } from './icons';
import { itemCard } from './itemcard';
import { attachTooltip, hideTooltip } from './tooltip';
import { starvedMultiplier } from '../sim/grants';
import type { PotionDef } from '../data';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** `scene` is an authored room on screen: a map, so `mapfull` stays on and the
 *  rail stays up, but nothing is ticking and there is nothing to abandon. */
export type Phase = 'menu' | 'running' | 'results' | 'scene';

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
/** A boss whose key is armed, spent by the launch. UI state like `leaving`:
 *  what is SAVED is the room a spent key has already paid for. */
/** Whether the room being stood in is a REPEAT of a beaten boss: the speech
 *  played once, so a bought rematch goes straight to the fight. */
let revisit = false;

/** The handover: down the hole at the exit, dark for the moment the map is
 *  swapped, out of the entrance of whatever is at the bottom. Nothing in
 *  `src/sim` knows it exists — the UI declines to tick while it draws. */
const HANDOVER = 1.2;
/** How much of it is going down. The rest is climbing out of the next one. */
const DESCEND = 0.45;
/** Seconds into the handover, or 0 when there is not one. */
let handover = 0;
/** The descent the handover is leaving, already built and already banked. */
let banked: RunReport | null = null;
/** Set to `banked` when the loop is stopping and the drop has still to play. */
let pending: RunReport | null = null;
/** Held while the room is being crossed, for `land()` afterwards — the report
 *  and the STATE are the descent's, not the scene's, or the card that lands
 *  lists the loot of a room with nothing in it. */
/** What he is holding, until the hero reaches him and the panel opens. */
/** The room waiting at the bottom of the hole, until the drop has played. */
/** Set while the room was WALKED TO rather than scheduled: nothing was banked,
 *  so leaving it goes back to the Fissure instead of down a stair. */
let visiting = false;
/** The room you are standing in, and whether its beats have been started. */
let arrivedIn = '';
let spoke = false;
/** Close enough to see it. Fit (1×) makes a monster four pixels. */
/** How long a phase's shout stays up. */
const SHOUT_FOR = 1.9;
/** The look at what you called up, there and back. */
const ARRIVAL = 2.6;

/** How often somebody unmet is standing in a descent. They are found by walking
 *  past — no click, no stop — so this is the only thing that gates a meeting. */
const MEET_CHANCE = 0.5;
let arrival = 0;
const DEFAULT_ZOOM = 2;
let zoom = DEFAULT_ZOOM;

function setPhase(next: Phase): void {
  const was = phase;
  phase = next;
  // A scene and a descent are both a map with nothing else on screen, so from
  // outside they are indistinguishable by what is hidden. A harness needs to
  // be able to tell the two apart, and this is the only thing that says so.
  document.body.dataset.runPhase = next;
  // A room is a fraction of a descent's size, so the scale that frames one
  // leaves the other a postage stamp in the middle of the screen.
  if (was !== next) fitCanvas();
  // The crack is a window and closes when you go down it: a card offering the
  // way in, over a descent already under way, is a way in twice.
  if (next !== 'scene') closeFissure();
  if (next !== 'menu') closeCamp();
  $('run-stagewrap').hidden = next === 'menu';
  $('run-results').hidden = next !== 'results';
  syncViewportLock();
  setInventoryBase(runHandler());
}

/** The stage sizes itself to the frame, so the scroll container stops while a
 *  map is up. Left on while you tabbed to the bench it froze that page with its
 *  items out of reach. `mapfull` rides on the same answer. */
export function syncViewportLock(): void {
  // The CAMP is full-bleed too, so the menu is no exception any more: a picture
  // that fills the screen needs the shell over it and pointer-transparent.
  const showing = true;
  document.querySelector('.viewport')?.classList.toggle('viewport--locked', showing);
  document.body.classList.toggle('mapfull', showing);
  // The stage's box just changed shape, and nothing else will tell the
  // renderer: `fitCanvas` runs off resize, which a class does not fire.
  if (showing) fitCanvas();
}

/** Which of the four states the Fissure is in. */
export const runPhase = (): Phase => phase;

/** The last beat is done, whichever panel it was. The descent it ended was
 *  cleared and banked long before anyone spoke, so this is the report landing
 *  rather than the run resuming. */
export function sceneEnded(): void {
  // Both panels are the CAMP's now: nothing is ticking and nothing is banked,
  // so the whole of ending one is drawing the picture again.
  if (isCampOpen()) {
    renderCamp();
    renderInventory();
    return;
  }
  sim?.takeGift();
  if (visiting) {
    visiting = false;
    goHome();
  }
  renderInventory();
}

/** Escape, anywhere in a meeting: the rest of the lines are skipped and what
 *  is held is granted. Refusing a gift already yours would be worse. */
export function skipToGift(): void {
  endSpeech();
  if (isMetOpen()) closeMet();
  // His is not a gift: skipping it walks out still carrying the specimen,
  // which is what Keep it does, and he is owed the same room again.
  else if (isGraftOpen()) closeGraft();
}

/** Called when the bench popup closes — the dock answers to the map again. */
export function onRunFocused(): void {
  setInventoryBase(runHandler());
  setInventoryHandler(null);
  refreshRunPanels();
}

/** Nothing. Crystals are socketed from the collection and the dock holds only
 *  gear, so the shell's own actions are what a click there means. */
function runHandler() {
  return {
    actionFor: () => null,
    highlighted: () => false,
  };
}

// ---------------------------------------------------------------------------
// Menu
// ---------------------------------------------------------------------------

// --- the camp --------------------------------------------------------------
//
// A PICTURE rather than a map: `src/ui/camp.ts` owns everything on it and this
// only says what a hotspot OPENS. The rail still reaches every one of those
// screens. A SOCKET does what its socket on the Fissure card does, being the
// same socket; a PERSON is TALKED TO, where they are standing.
const OPENS: Record<Hotspot['opens'], (spot: Hotspot, at: DOMRect) => void> = {
  fissure: () => openFissure(),
  craft: () => openCraft(),
  stash: () => openStash(),
  character: () => openCharacter(),
  room: (spot, at) => {
    const def = SCENE_BY_ID[spot.room ?? ''];
    if (def) openTalk(def, at);
  },
  socket: (spot) => {
    const slot = RUN_SLOTS[spot.slot ?? 0];
    if (!slot) return;
    if (!game.sockets[slot.id]) return openCrystals();
    unsocket(game, slot.id);
    refreshRunPanels();
    renderInventory();
  },
};

export function openFissure(): void {
  renderMenu();
  $('run-menu').hidden = false;
}
export function closeFissure(): void {
  $('run-menu').hidden = true;
}
export const isFissureOpen = (): boolean => !$('run-menu').hidden;

/**
 * HOME. The camp is the ground the game stands on — every way out of a descent,
 * a room or a wipe comes back to it, and `menu` is the phase it is.
 */
export function goHome(): boolean {
  sim = null;
  setPhase('menu');
  banked = null;
  pending = null;
  handover = 0;
  leaving = false;
  streak = 0;
  refreshRunPanels();
  openCamp();
  setLeaveLabel();
  return true;
}

/** WHO IS ABOUT. Everybody you have found, and a button that TALKS to them —
 *  the same conversation clicking their body in the camp starts. A picture is
 *  easy to miss, so this is the readable way to the same thing. */
function renderFolk(): void {
  const host = $('run-folk');
  const met = folkMet(game);
  host.hidden = met.length === 0;
  host.replaceChildren();
  if (met.length === 0) return;

  host.append(el('p', 'panel__title', 'Who is about'));
  const row = el('div', 'folkrow');
  for (const def of met) {
    const button = el('button', 'mini folkbtn') as HTMLButtonElement;
    button.id = `run-visit-${def.id}`;
    const face = portraitIcon(def.who, 30);
    if (face) button.append(face);
    button.append(el('span', 'folkbtn__name', def.name));
    button.onclick = () => openTalk(def, button.getBoundingClientRect());
    attachTooltip(button, () => def.said);
    row.append(button);
  }
  host.append(row);
}

function renderMenu(): void {
  renderFolk();
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
  renderKeySocket(grid);

  const host = $('run-selected');
  host.replaceChildren();

  const set = socketed(game);
  const chips = el('div', 'setrows');
  const standing = trialMod(game.character);
  for (const row of setRows(set, standing)) {
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
  const farms = farmingText(set, standing);
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

  // The two things that can shut the Fissure, and neither is a dead end: gear
  // sells from anywhere, and a weapon is one click on the sheet.
  const why = bagsFull(game)
    ? 'Your bags are full. Sell or stash some of it before you go back down.'
    : weaponRefusal(game.character);
  const launcher = $('run-launch') as HTMLButtonElement;
  launcher.textContent = game.called
    ? `Face ${BOSS_BY_ID[game.called]?.name ?? game.called}`
    : 'Enter the Fissure';
  launcher.disabled = why !== null;
  launcher.classList.toggle('mini--off', why !== null);
  $('run-blocked').textContent = why ?? '';
}

/**
 * The FIFTH socket, under the four the crystals take. A key is SPENT the
 * moment it goes in — the same rule as socketing anywhere else being
 * permanent — and what it buys is the next entry: the Fissure opens onto the
 * boss instead of a descent. Hidden until a boss has been met, since a
 * keyhole to nowhere teaches nothing.
 */
function renderKeySocket(grid: HTMLElement): void {
  const key = BOSS_KEYS.find((k) => (game.wallet[k.id] ?? 0) > 0 && bossBeaten(game, k.boss));
  const armed = game.called ? BOSS_BY_ID[game.called] : null;
  if (!armed && !key) return;

  const button = el('button', 'socket socket--key') as HTMLButtonElement;
  button.id = 'run-socket-key';
  button.classList.toggle('socket--full', !!armed);
  if (armed) {
    button.append(el('div', 'socket__name', armed.name));
    button.append(el('div', 'socket__mods', `${armed.herald} Enter, and it is the fight.`));
    button.disabled = true;
  } else if (key) {
    const who = BOSS_BY_ID[key.boss];
    button.append(el('div', 'socket__name', `Set ${key.name} — ${game.wallet[key.id]} held`));
    button.append(el('div', 'socket__mods', `Spends the key. The next entry is ${who?.name ?? key.boss}.`));
    button.title = key.description;
    button.onclick = () => {
      if (!spend(game.wallet, { [key.id]: 1 })) return;
      game.called = key.boss;
      note(`${key.name} spent. ${who?.name ?? key.boss} is listening.`);
      renderMenu();
      renderInventory();
    };
  }
  grid.append(button);
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

/** Somebody unmet, sometimes: one at random out of everyone you have not found
 *  yet, at `MEET_CHANCE` a descent. Null once you have met them all. */
function whoIsDown(): { id: string; sprite: string } | undefined {
  const left = SCENES.filter((s) => !s.encounter && !hasMet(game, s.id));
  if (left.length === 0 || Math.random() > MEET_CHANCE) return undefined;
  const def = left[Math.floor(Math.random() * left.length)];
  return { id: def.id, sprite: def.who };
}

function launch(): void {
  // A socketed key opens the fight AT the door: the descent this entry would
  // have been is the fight, not a wait for one.
  if (game.called) {
    const den = SCENES.find((s) => s.encounter === game.called);
    if (den) {
      seed = Math.floor(Math.random() * 1e9);
      enterScene(den);
      return;
    }
  }

  // An empty set is a real descent, not a missing choice: the bare Fissure is
  // generated fresh each time and never taken from you, which is what makes
  // running out of crystals a setback rather than an end.
  const set = socketed(game);

  seed = Math.floor(Math.random() * 1e9);
  // WHO IS DOWN THERE. *"I want to encounter them randomly in the maps."*
  // Rolled HERE and not in the sim, off its own draw, so whether somebody is
  // waiting cannot move a single roll of the descent itself.
  sim = new RunSim(set, game.character, new Rng(seed), {
    potionThresholds: game.potions,
    beaten: game.bosses ?? [],
    meets: whoIsDown(),
  });

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

/** Trials pay at the CLEAR, on the same rule a boss is marked by, and every
 *  open one is asked. Says what was won: an unspent point is a wasted room. */
function payTrials(state: RunState): void {
  const won = takeTrials(game, {
    set: state.set,
    elapsed: state.elapsed,
    socketed: socketed(game),
    hoards: state.hoards.filter((h) => h.opened).length,
    welled: state.welled,
    bearers: state.bearers,
  });
  for (const trial of won) note(`${trial.name}. One trial point.`, 'add');
  if (won.length > 0) renderBadges();
}

/**
 * A run ended. Bank it, then decide whether there is another one. Capacity is
 * read HERE and never during a run, which is why the bag may end up over its
 * limit rather than a descent's drops being split.
 */
function finish(left = false): void {
  if (!sim) return;
  const report = buildReport(game, sim.state, left);
  playing = false;
  renderBadges(); // the level this descent bought has landed, so a point may have

  if (report.cleared) streak++;

  if (report.cleared) payTrials(sim.state);

  halt = left
    ? 'left'
    : !report.cleared
      ? 'died'
      : report.bagsFull
        ? 'full'
        : leaving
          ? 'chose'
          : 'once';

  // `leaving` is the only stop you choose while the fight is still on, so it
  // is checked here rather than at the launch: the descent you armed it during
  // still finishes and still banks.
  if (report.cleared && !report.bagsFull && !leaving) {
    // Drop into the hole first. The next descent is built at the bottom of it.
    handover = 0.0001;
    banked = report;
    pending = null;
    return;
  }

  land(report, sim.state);
}

/** Arriving. The lines come first, one at a time over his own head, and the
 *  last of them is the panel, which is where the gift is. `spoke` stops the
 *  frame after arriving from starting the whole thing again. */
/** ARRIVING AT A FIGHT. The body is called up FIRST, so the camera has
 *  something to cross to and it is standing there when you look rather than
 *  appearing out of the air once you have finished talking. A REMATCH skips
 *  the look, not the spawn. */
function beginArrival(): void {
  const boss = sim?.summonBoss();
  arrival = revisit || !boss ? 0 : ARRIVAL;
  if (arrival > 0 && boss) renderer?.lookAt(boss);
}

/** Halfway it comes back to the hero; at the end the room gets on with it. */
function stepArrival(dt: number): void {
  if (arrival <= 0) return;
  const was = arrival;
  arrival = Math.max(0, arrival - dt);
  if (was > ARRIVAL / 2 && arrival <= ARRIVAL / 2) renderer?.follow();
  if (arrival === 0 && sim?.state.meeting && !spoke) speak();
}

function speak(): void {
  spoke = true;
  const def = SCENE_BY_ID[arrivedIn];
  if (!def) return;
  // A room with something in it says its piece and then goes live; a quiet one
  // ends on the panel, which is where the gift is. A REMATCH skips the piece:
  // the speech was the first meeting's, and a key bought a fight.
  if (def.encounter) {
    if (revisit) {
      if (sim?.beginEncounter()) playing = true;
      absorbEvents();
      setLeaveLabel();
      return;
    }
    // YOUR line, not its: a boss room has nobody living in it to say one.
    startSpeech(game.character.name, game.character.name, def.beats ?? [], () => {
      if (sim?.beginEncounter()) playing = true;
      absorbEvents();
      setLeaveLabel();
    });
    return;
  }
}

/** The boss is down, or you are. A boss room is a DESCENT: its loot banks, its
 *  clear counts, and it lands on the report every other ending lands on. */
function endEncounter(): void {
  if (!sim) return;
  playing = false;
  const report = buildReport(game, sim.state, false);
  renderBadges();
  if (report.cleared) streak++;
  halt = report.cleared ? 'once' : 'died';

  const def = SCENE_BY_ID[arrivedIn];
  const state = sim.state;
  // Marked at the clear, so a room you died in is one you meet again. BEFORE
  // the trials are asked: the first rung is this boss being down.
  if (report.cleared && def?.encounter) takeBoss(game, def.encounter);
  if (report.cleared) payTrials(state);

  const after = report.cleared && !revisit ? (def?.after ?? []) : [];
  if (after.length === 0) return land(report, state);
  startSpeech(def!.who, def!.name, after, () => land(report, state));
}

/** Up out of the hole, into a room nobody generated. A `RunSim` like any other
 *  — the packs are what a scene leaves out — so both renderers draw it with no
 *  changes, and nothing ticks: the walk across is the whole of it. */
function enterScene(
  def: SceneDef,
  crowd: { sprite: string; at: Vec2 }[] = [],
  dressing: { id: string; x: number; y: number }[] = []
): void {
  visiting = false;
  // The key bought this room, and arriving is what it bought.
  if (def.encounter && game.called === def.encounter) game.called = null;
  // Standing in somebody's room is MEETING them, which is what puts them on
  // the list of people you can go back to and takes them off the schedule.
  if (!def.encounter) takeMet(game, def.id);
  revisit = def.encounter !== null && bossBeaten(game, def.encounter);
  arrivedIn = def.id;
  spoke = false;
  arrival = 0;
  banked = null;
  sim = new RunSim(socketed(game), game.character, new Rng(seed), { scene: def.id, crowd, dressing });
  playing = false;
  accumulator = 0;
  note(def.said, 'add');
  // A camera left pointed at a corner of the descent that just ended is a
  // black screen with no obvious way out of it.
  renderer?.follow();
  if (def.encounter) beginArrival();
  setPhase('scene');
  setLeaveLabel();
  fitCanvas();
  renderReadout();
}

/** The one terminus. `run` is the DESCENT's state — a scene has no loot. */
function land(report: RunReport, run: RunState): void {
  handover = 0;
  pending = null;
  banked = null;
  renderResults(report, run);
  setPhase('results');
  setLeaveLabel();
  renderInventory();
  // The bag is where a descent's loot now IS, unless it found nothing at all.
  if (report.items.length > 0) {
    openInventory();
    note(haltLine(report));
  }
}

/** 1 standing, 0 underground. Drives the sprite and the dark over it. */
function emergeNow(): number {
  if (handover === 0) return 1;
  const t = Math.min(1, handover / HANDOVER);
  return t < DESCEND ? 1 - t / DESCEND : Math.min(1, (t - DESCEND) / (1 - DESCEND));
}

/** Why the loop stopped, in one line on the log. */
function haltLine(report: RunReport): string {
  const runs = streak === 1 ? 'one descent' : `${streak} descents`;
  // Losing the descent you were standing in is the whole cost, and the thing
  // it is easiest to read as losing the lot — so say what is still yours.
  const kept =
    streak > 0
      ? `Everything ${runs} banked is yours; only the one you were in is gone.`
      : 'A descent only pays if you finish it.';

  if (halt === 'met') return `${LAMPWRIGHT.name} walked you out. Cleared ${runs}.`;
  if (halt === 'left') return `You walked out. ${kept}`;
  if (halt === 'died') return `You died. ${kept}`;
  if (halt === 'full') return `Your bags are full after ${runs}. Clear some of it to go again.`;
  if (halt === 'chose') return `Cleared ${runs}, and stopped where you asked.`;
  return `Cleared ${runs}.`;
}

/** The HUD's name. What a character IS lives on the sheet. */
function renderStatsPanel(): void {
  $('run-name').textContent = game.character.name;
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
  // Icons, not names: a good map turns a written list into something that
  // outgrows the panel, and a row of pictures does not. Hover is the name.
  if (items.length) {
    const grid = el('div', 'lootgrid');
    for (const item of items) {
      const cell = el('div', 'lootgrid__cell');
      const icon = itemIcon(item, 26);
      if (icon) cell.append(icon);
      attachTooltip(cell, () => itemCard(item));
      grid.append(cell);
    }
    host.append(grid);
  }
}

/**
 * The flasks. The KEYS are the shortcut and these are the interface, since a
 * threshold has to be settable by something. `fires at` is the same threshold
 * the sim's own policy reads, so setting it here is setting what a headless run
 * does.
 */
function renderFlasks(): void {
  const host = $('run-flasks');
  const live = sim && playing;
  host.replaceChildren();

  for (const potion of POTIONS) {
    const left = sim?.state.charges[potion.id] ?? potion.charges;
    const drinking = sim?.state.hero.effects.some((e) => e.id === potion.id) ?? false;
    const share = game.potions?.[potion.id] ?? potion.threshold;

    const row = el('div', `flask flask--${potion.pool}${drinking ? ' flask--live' : ''}`);
    const use = el('button', 'flask__use') as HTMLButtonElement;
    use.id = `flask-${potion.id}`;
    use.append(flaskIcon(left, potion.charges, 46, potion.pool));
    use.append(el('span', 'flask__key', keyName(keyFor(game, potion.binding))));
    use.dataset.at = String(left);
    use.disabled = !live || !sim!.canDrink(potion.id);
    use.onclick = () => drinkPotion(potion.id);
    attachTooltip(use, () => flaskSays(potion));
    row.append(use);

    const auto = el('div', 'flask__auto');
    for (const step of [-5, 5]) {
      const button = el('button', 'flask__step', step < 0 ? '\u2212' : '+') as HTMLButtonElement;
      button.onclick = () => {
        const next = Math.max(0, Math.min(0.95, share + step / 100));
        game.potions = { ...(game.potions ?? {}), [potion.id]: next };
        renderFlasks();
      };
      if (step < 0) auto.append(button);
      else {
        auto.append(el('span', 'flask__at', `${Math.round(share * 100)}%`));
        auto.append(button);
      }
    }
    attachTooltip(
      auto,
      () =>
        `Fires itself\nWhen your ${potion.pool} falls to this share — and a headless run obeys the same number.`
    );
    row.append(auto);
    host.append(row);
  }
}

/**
 * What THIS flask does for THIS character. Read live off the same grants the
 * sim reads, because the Alchemist moves the pour, the length, the charges and
 * three things you only get while one is running — a hover quoting the table
 * would be wrong for the build the trade exists to make.
 */
function flaskSays(potion: PotionDef): string {
  const stats = sim?.state.hero.stats ?? characterStats(game.character);
  const max = potion.pool === 'life' ? stats.maxLife : stats.maxMana;
  const left = sim?.state.charges[potion.id] ?? potion.charges;
  const reading = potionReading(potion, max, treeGrants(game.character));
  return [potion.name, ...potionWorkings(potion, reading, left)].join('\n');
}

/**
 * Per frame, and it must NOT rebuild. Rebuilt sixty times a second, a press
 * that straddled one landed on a node no longer in the document — which is why
 * the threshold buttons did nothing at all. Only what changes is touched.
 */
function syncFlasks(): void {
  const live = sim && playing;
  for (const potion of POTIONS) {
    const use = document.getElementById(`flask-${potion.id}`) as HTMLButtonElement | null;
    if (!use) continue;
    const left = sim?.state.charges[potion.id] ?? potion.charges;
    const drinking = sim?.state.hero.effects.some((e) => e.id === potion.id) ?? false;
    use.disabled = !live || !sim!.canDrink(potion.id);
    use.parentElement?.classList.toggle('flask--live', drinking);
    if (use.dataset.at !== String(left)) {
      use.dataset.at = String(left);
      use.querySelector('svg')?.replaceWith(flaskIcon(left, potion.charges, 46, potion.pool));
    }
  }
}

/** A press, from a key or from the button. The sim queues it for the next tick. */
function drinkPotion(id: string): void {
  if (!sim || !playing) return;
  sim.usePotion(id);
  syncFlasks();
}

/** Marks etched into a vessel at every 100 of the pool, heavier each 1000 —
 *  rebuilt only when the pool itself moves, since the marks are the SCALE. */
function syncTicks(host: HTMLElement, max: number): void {
  const key = String(Math.round(max));
  if (host.dataset.max === key) return;
  host.dataset.max = key;
  host.replaceChildren();
  for (let at = 100; at < max; at += 100) {
    const tick = el('div', `hp__tick${at % 1000 === 0 ? ' hp__tick--big' : ''}`);
    tick.style.left = `${(at / max) * 100}%`;
    host.append(tick);
  }
}

function renderReadout(): void {
  if (!sim) return;
  const s = sim.state;

  renderCarrying();
  syncFlasks();

  $('run-elapsed').textContent = `${s.elapsed.toFixed(1)}s`;
  $('run-killed').textContent = `${s.killed}/${s.totalMonsters}`;
  $('run-seed').textContent = String(seed);
  $('run-xp-gained').textContent = String(Math.round(s.xpGained));

  const need = xpToNext(game.character.level);
  $('run-level').textContent = String(game.character.level);
  $('run-xp-text').textContent = `${game.character.xp} / ${need}`;
  ($('run-xp-fill') as HTMLElement).style.width =
    `${Math.min(100, (game.character.xp / need) * 100)}%`;

  syncCooldowns();
  syncBossBar();
  syncDebuffs();

  const frac = Math.max(0, s.hero.life / s.hero.stats.maxLife);
  ($('run-hp-fill') as HTMLElement).style.width = `${frac * 100}%`;
  syncTicks($('run-hp-ticks'), s.hero.stats.maxLife);
  $('run-hp-text').textContent =
    `${Math.max(0, Math.round(s.hero.life))} / ${Math.round(s.hero.stats.maxLife)}`;

  const cost = s.hero.stats.manaCost;
  const spare = Math.max(0, s.hero.mana);
  const pool = Math.max(1, s.hero.stats.maxMana);
  ($('run-mana-fill') as HTMLElement).style.width = `${Math.min(100, (spare / pool) * 100)}%`;
  syncTicks($('run-mana-ticks'), pool);
  $('run-mana-text').textContent = `${Math.round(spare)} / ${Math.round(pool)}`;
  // Short of the cost is the state worth seeing: it is why the damage dropped.
  ($('run-mana-fill').parentElement as HTMLElement).classList.toggle('hp--dry', spare < cost);
  // And how often it has happened, since one starved cast is invisible and a
  // hundred of them is the whole descent.
  const starved = $('run-starved');
  starved.textContent = `${s.dryCasts} at ${Math.round(starvedMultiplier(treeGrants(game.character)) * 100)}%`;
  starved.classList.toggle('readout__v--bad', s.dryCasts > 0);

  // What a trade is doing to this descent, and only while it is doing it.
  $('run-warded-row').hidden = s.absorbed <= 0;
  $('run-warded').textContent = `${Math.round(s.absorbed)} damage`;
  $('run-overcharged-row').hidden = s.overcharges <= 0;
  $('run-overcharged').textContent = `${s.overcharges} of ${s.casts} casts`;

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
  right.append(el('p', 'resultcard__sub', report.cleared ? 'Into your bags' : 'Loot lost'));
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

  const again = el('button', 'mini', 'Back to camp') as HTMLButtonElement;
  again.id = 'run-again';
  again.onclick = () => goHome();
  card.append(again);

  host.append(card);
}

/** FOUND SOMEBODY, mid-descent: their one line into the log, and MET. Nothing
 *  stops. Marked here because the sim knows no `GameState`. */
function absorbMeeting(): void {
  const id = sim?.state.found;
  if (!id || hasMet(game, id)) return;
  const def = SCENE_BY_ID[id];
  takeMet(game, id);
  if (def?.greets) note(`${def.name}: ${def.greets}`, 'add', sim?.state.elapsed);
  renderBadges();
}

function absorbEvents(): void {
  if (!sim) return;
  absorbMeeting();
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

  // The sim does not tick at all while this runs: you are climbing.
  if (handover > 0) {
    handover += dt;
    if (playing === false && handover >= HANDOVER * DESCEND) {
      // The bottom of the hole: a report, a room, or the next descent. This
      // runs every frame of the climb out, so a room already entered says so.
      if (pending) land(pending, sim!.state);
      else if (phase !== 'scene') launch();
    }
    if (handover >= HANDOVER) handover = 0;
  }
  const emerge = emergeNow();
  $('run-fade').style.opacity = String(1 - emerge);

  // In the room, and someone is standing in it. Nothing ticks but the walk
  // across, and then whatever they are doing while they say a line.
  if (sim && phase === 'scene' && !playing) {
    accumulator += dt;
    let steps = 0;
    while (accumulator >= TICK && steps < 400) {
      if (sim.state.meeting) sim.perform(speakingAt(), speakingBeat()?.act, TICK);
      else sim.walkOut(TICK);
      accumulator -= TICK;
      steps++;
    }
    if (sim.state.meeting && !spoke && arrival <= 0) speak();
  }
  if (sim && phase === 'scene' && sim.state.folk[0] && renderer) {
    syncSpeech(renderer, sim.state.folk[0]);
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
      // A room that went live ends in its OWN terminus: through `finish` it
      // chains, and drops into a hole with no descent at the bottom of it.
      if (phase === 'scene') endEncounter();
      else finish();
    }
  }

  if (sim && renderer && phase !== 'menu') renderer.draw(sim.state, emerge);
  if (sim) renderReadout();
  stepArrival(dt);
  // After the draw: it anchors off where the camera just put the boss.
  syncShout(dt);
  requestAnimationFrame(frame);
}

/**
 * The gentle way out, and the only stop you can choose while the fight is on.
 * Nothing to arm when this descent was already the last one — with the loop
 * off, or with the bag about to shut the Fissure, it ends by itself.
 */
function setLeaveLabel(): void {
  const btn = $('run-leave') as HTMLButtonElement;
  // Neither means anything outside a descent, and a room with a fight in it is
  // the one you may not walk out of — leaving would be a way to skip a boss.
  const abandon = $('run-abandon') as HTMLButtonElement;
  abandon.disabled = phase !== 'running';
  const live = phase === 'running';
  // A room you WALKED to has a way back out of it, and it is this button: a
  // person with nothing to hand over would otherwise be a room with no exit.
  const back = phase === 'scene' && visiting;
  btn.textContent = back
    ? 'Go back'
    : !live
      ? 'Last descent'
      : leaving
        ? 'Leaving after this one'
        : 'Leave after this run';
  btn.disabled = !live && !back;
  btn.classList.toggle('mini--on', live && leaving);
}

/**
 * Once the player picks a zoom it is theirs and nothing moves it. Until then the
 * starting zoom is recomputed on every resize, so a resized window re-picks a
 * sane scale rather than keeping one that suited the old shape.
 */
let userZoomed = false;

/** Matches the `.flasks` margin, because they describe the same gap. */
const FLASK_GAP = 8;

/** How much closer a ROOM is framed than a descent. `clampZoom` still bounds
 *  it, so this asks rather than sets. */
const SCENE_ZOOM = 2;

function fitCanvas(): void {
  const box = $('run-stage');
  const width = box.clientWidth;
  const height = document.body.classList.contains('mapfull')
    ? // Full bleed, so the box IS the answer. Deriving it from `.runcols` the
      // way the framed layout does would measure the side panel: the stage is
      // fixed and has left that row entirely.
      box.clientHeight
    : framedHeight(box, width);
  renderer?.resize(width, height);

  // Now that the surface has a real size, pick the scale that fits it. At
  // startup the stage is still unmeasured, so this is the first honest chance.
  if (!userZoomed && width > 0) {
    setZoom(defaultZoom(Math.min(width, height)) * (phase === 'scene' ? SCENE_ZOOM : 1));
  }
}

/** The stage as a CELL: whatever the row has left once the panels have theirs. */
function framedHeight(box: HTMLElement, width: number): number {
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
  return available > 240 ? available : Math.max(320, Math.round(width * 0.66));
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

  ($('run-menu-close') as HTMLButtonElement).onclick = () => closeFissure();

  initCamp(game, OPENS);

  ($('run-launch') as HTMLButtonElement).onclick = () => {
    if (bagsFull(game)) return;
    streak = 0;
    leaving = false;
    launch();
  };

  ($('run-leave') as HTMLButtonElement).onclick = () => {
    if (visiting) return sceneEnded();
    if (phase !== 'running') return;
    leaving = !leaving;
    note(leaving ? 'Leaving after this descent.' : 'Staying down.');
    setLeaveLabel();
  };

  // The hard way out, and the only one that costs you something: this descent
  // banks nothing, exactly as dying in it would. Every clear before it already
  // banked as it happened, so it ends on the same card.
  ($('run-abandon') as HTMLButtonElement).onclick = () => {
    if (!sim || phase === 'scene') return;
    if (phase !== 'running') return;
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
  const release = (event?: PointerEvent) => {
    from = null;
    if (held !== null) stage.releasePointerCapture?.(held);
    held = null;
    stage.classList.remove('stage--drag');
  };
  stage.addEventListener('pointerup', (event) => release(event));
  stage.addEventListener('pointercancel', () => release());
  stage.addEventListener('pointerleave', () => {
    release();
    hideTooltip();
  });

  // A drawer under its own button. Closed by default, because a descent is
  // something you watch and the numbers are something you go and look at.
  const details = $('run-details') as HTMLButtonElement;
  details.onclick = () => {
    const panel = $('run-details-panel');
    panel.hidden = !panel.hidden;
    details.setAttribute('aria-expanded', String(!panel.hidden));
    details.classList.toggle('mini--on', !panel.hidden);
  };

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
  if (isCampOpen()) renderCamp();
  renderBadges();
  renderSkillIcons();
}

/** A WIPE replaces the game under this module, and what was held for the game
 *  that is gone would otherwise be held against the new one: a gift nobody is
 *  standing there to hand over refuses every Abandon for the rest of the run. */
export function forgetRun(): void {
  sim = null;
  banked = null;
  pending = null;
  handover = 0;
  playing = false;
  setPhase('menu');
}

/** THE ARENA, now the only room there is: the dev menu's way into the fight,
 *  with whatever a descent had half-finished dropped first. A person is not a
 *  room any more — you talk to them where they stand. */
export function enterRoomNow(id: string): boolean {
  const def = SCENE_BY_ID[id];
  if (!def?.plan) return false;
  banked = null;
  pending = null;
  handover = 0;
  leaving = false;
  streak = 0;
  enterScene(def);
  visiting = true;
  setLeaveLabel();
  return true;
}

/** What each screen is holding that has not been spent. One place, called
 *  after everything that could change one. */
/**
 * The three you are holding, under the xp bar. Hover says what it is; click
 * opens the sheet at that skill's own section, which is where its numbers are.
 */
function renderSkillIcons(): void {
  const host = $('run-skills');
  host.replaceChildren();

  // OPEN ones only: a slot the level has not reached is not part of your kit
  // yet, and the skills screen is where what is coming belongs.
  for (const slot of openSlots(game.character)) {
    const held = SKILL_BY_ID[equippedSkill(game.character, slot.id) ?? ''];
    const cell = el('button', `mini skillslot${held ? '' : ' skillslot--empty'}`) as HTMLButtonElement;
    cell.id = `run-skill-${slot.id}`;
    cell.append(held ? skillIcon(held.id, 34) : el('span', 'skillslot__none', slot.name[0]));
    // Built once and written per frame: a slot that rebuilt to count down
    // would throw away whatever the cursor was over.
    const cool = el('span', 'skillslot__cool');
    cool.id = `run-skill-cool-${slot.id}`;
    cell.append(cool);
    // What it does for THIS character, not what the table prints: a slot's
    // numbers move with the tree, the trade and every piece worn.
    attachTooltip(cell, () =>
      held
        ? [held.name, ...skillWorkings(game.character, slot.id, MAIN_SLOT)].join('\n')
        : `${slot.name}\n${slot.blurb}`
    );
    cell.onclick = () => openCharacter(slot.id);
    host.append(cell);
  }
}

/** The wait on a skill that has one, counted down on its own socket. Only the
 *  MOVEMENT slot has a cooldown today; the main slot's rate is its attack
 *  speed, which is a number on the sheet rather than a wait you watch. */
function syncCooldowns(): void {
  const wait = sim?.moverWait;
  for (const slot of SKILL_SLOTS) {
    const cell = document.getElementById(`run-skill-${slot.id}`);
    const face = document.getElementById(`run-skill-cool-${slot.id}`);
    if (!cell || !face) continue;
    const mine = slot.id === 'movement' && wait && wait.of > 0 && wait.left > 0.05;
    cell.classList.toggle('skillslot--waiting', !!mine);
    if (!mine) continue;
    face.style.setProperty('--cool', `${Math.min(100, (wait!.left / wait!.of) * 100)}%`);
    face.textContent = wait!.left.toFixed(1);
  }
}

/** What phase the shout on screen belongs to, and how long it has left. */
let shouted = '';
let shoutFor = 0;
/** How many phases have turned over, so the line varies without an rng. */
let turns = 0;

/** A phase turning over, thrown over its own head and gone. It says nothing
 *  you have to read: the phase is drawn on the body, and this is what makes
 *  you look at it. */
function syncShout(dt: number): void {
  const s = sim?.state;
  const boss = s?.boss;
  const now = s?.phase ?? '';
  const live = !!boss && !boss.dead && now !== '';
  if (live && now !== shouted) {
    const lines = BOSS_SHOUTS[now] ?? [];
    shouted = now;
    shoutFor = lines.length > 0 ? SHOUT_FOR : 0;
    if (lines.length > 0) $('run-shout-said').textContent = lines[turns++ % lines.length];
  }
  if (!live) {
    shouted = '';
    shoutFor = 0;
  }
  shoutFor = Math.max(0, shoutFor - dt);
  const host = $('run-shout');
  host.hidden = shoutFor <= 0;
  if (!host.hidden && renderer && boss) anchor(host, renderer, { x: boss.x, y: boss.y });
}

/** THE THING IN THE ROOM WITH YOU, across the top and named. A boss carries no
 *  bar over its own head: at `size` 5 that strip is tiny and a long way from
 *  where you are looking. */
function syncBossBar(): void {
  const host = $('run-boss');
  const boss = sim?.state.boss;
  const live = !!boss && !boss.dead;
  host.hidden = !live;
  if (!live || !boss) return;
  const def = BOSS_BY_ID[SCENE_BY_ID[arrivedIn]?.encounter ?? ''];
  const name = def?.name ?? 'The Answering';
  const label = $('run-boss-name');
  if (label.textContent !== name) label.textContent = name;
  const frac = Math.max(0, Math.min(1, boss.life / boss.stats.maxLife));
  $('run-boss-fill').style.width = `${(frac * 100).toFixed(1)}%`;
}

/** What is ON you, over the pools it is spoiling: a picture, the seconds left
 *  under it, and a hover that says what it does. Built when the SET of them
 *  changes and only counted down per frame, so a tooltip survives its box. */
function syncDebuffs(): void {
  const host = $('run-debuffs');
  const state = sim?.state;
  const on: { id: string; icon: string; name: string; says: string; left: number }[] = [];
  if (state) {
    const stun = state.hero.stun ?? 0;
    if (stun > 0) {
      on.push({
        id: 'stun',
        icon: 'dbf_stun',
        name: 'Stunned',
        says: 'Held where you stand. You cannot walk, and nothing you turn to will move you until it passes.',
        left: stun,
      });
    }
    if (state.marks > 0) {
      on.push({
        id: 'mark',
        icon: 'dbf_mark',
        name: `Marked ×${state.marks}`,
        says: `Every mark is ${Math.round(BOSS_FIGHT.markMore * 100)}% more damage taken, from anything. They fall off slowly once nothing is adding them — being caught by a Fall adds ${BOSS_FIGHT.markPerCatch}.`,
        left: state.marks,
      });
    }
  }

  if (host.dataset.on !== on.map((d) => d.id).join(',')) {
    host.dataset.on = on.map((d) => d.id).join(',');
    host.replaceChildren();
    for (const debuff of on) {
      const box = el('div', `debuff${debuff.id === 'mark' ? ' debuff--bad' : ''}`);
      box.id = `run-debuff-${debuff.id}`;
      const art = drawn(debuff.icon, 22) ?? el('span', '', '?');
      art.classList.add('debuff__art');
      box.append(art);
      box.append(el('span', 'debuff__left', ''));
      attachTooltip(box, () => `${debuff.name}\n${debuff.says}`);
      host.append(box);
    }
  }
  for (const debuff of on) {
    const left = document.getElementById(`run-debuff-${debuff.id}`)?.lastElementChild;
    if (left) {
      left.textContent = debuff.id === 'stun' ? `${debuff.left.toFixed(1)}s` : `×${debuff.left}`;
    }
  }
}

function renderBadges(): void {
  badge('open-character', attributePointsLeft(game.character));
  badge('open-skills', spareTreePoints(game.character, mainSkillId(game.character)));
  badge('open-trade', tradePointsLeft(game.character));
  badge('open-trials', trialPointsLeft(game.character));
}

