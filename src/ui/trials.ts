/**
 * The Trials screen: the ladder on the left, the web on the right.
 *
 * A HUNDRED AND FIFTY-SIX nodes, so it ROAMS — built once at `BUILD` pixels per
 * unit with the camera a transform over the whole thing, exactly as the trade
 * and skill webs are. It opens FRAMED, because the shape of the web is the
 * decision: which four regions of twelve you can afford to walk.
 */
import { LADDER, THEME_BY_ID, TRIALS, TRIAL_POINTS } from '../data';
import {
  TRIALS_WEB,
  TRIAL_POINTS_MAX,
  trialPointsFor,
  trialsOpen,
  canAllocateTrial,
  canDeallocateTrial,
  neighboursOfTrial,
  trialNodes,
} from '../trials';
import { CENTRE } from '../trees/node';
import { WebFind } from './websearch';
import { allocateTrial, deallocateTrial, trialPointsLeft } from '../sim/character';
import { trialDone } from '../game/trials';
import { attachTooltip, hideTooltip } from './tooltip';
import { nodeCard } from './glossary';
import { chain, frame, mount, svgEl } from './webart';
import { BUILD, Camera } from './webcam';
import { nodeGlyph } from './webicons';
import type { GameState } from '../game/state';
import type { SkillNodeDef } from '../trees/node';

const $ = (id: string) => document.getElementById(id)!;

/** Framed once per opening, never per render: a fit while you are reading is
 *  the web jumping out from under the node you were about to take. */
let framed = false;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let game: GameState;
let onChanged: (() => void) | null = null;

const NODE_R = { minor: 0.23, notable: 0.37 };
const HUB_R = 0.56;
/** Room round the outermost node, so a stud's rim is never against the edge. */
const MARGIN = 0.7;

/** Stable id per node, the way the trade web mints one. */
export const trialNodeId = (nodeId: string): string => `trial-node-${nodeId}`;

// ---------------------------------------------------------------------------
// The ladder
// ---------------------------------------------------------------------------

/** In table order, done or not — the order IS the story, so a rung that is
 *  still open never hides the ones past it. */
function renderLadder(): void {
  const host = $('trials-ladder');
  host.replaceChildren();

  for (const trial of TRIALS) {
    const done = trialDone(game, trial.id);
    const row = el('div', `trialrow${done ? ' trialrow--done' : ''}`);
    const head = el('div', 'trialrow__head');
    head.append(el('span', 'trialrow__name', trial.name));
    head.append(
      el('span', 'trialrow__state', done ? `done — ${TRIAL_POINTS.perTrial} points` : 'open')
    );
    row.append(head);
    row.append(el('div', 'trialrow__detail', trial.detail));
    host.append(row);
  }
}

// ---------------------------------------------------------------------------
// The web
// ---------------------------------------------------------------------------

const cam = new Camera({
  svg: 'trials-web',
  wrap: 'trials-webwrap',
  home: 40,
  zoom: { min: 8, max: 120, step: 1.18 },
});

/** FINDING A NODE. Twelve regions is more than anybody scrolls through. */
const find = new WebFind({
  input: 'trials-find',
  svg: 'trials-web',
  nodes: () => trialNodes(),
  focus: (node) => {
    cam.panX = node.x;
    cam.panY = node.y;
    cam.scale = Math.max(cam.scale, BUILD);
    cam.apply();
  },
});

function renderWeb(): void {
  const svg = $('trials-web') as unknown as SVGSVGElement;
  svg.replaceChildren();

  const nodes = trialNodes();
  const allocated = game.character.trialAllocated ?? [];
  const taken = new Set(allocated);
  const spare = trialPointsLeft(game.character);

  const view = svgEl('g', { class: 'web__view' });
  const reach = Math.max(1, ...nodes.map((n) => Math.hypot(n.x, n.y))) + MARGIN;
  cam.origin = Math.ceil(reach * BUILD);
  svg.style.width = `${cam.origin * 2}px`;
  svg.style.height = `${cam.origin * 2}px`;

  const at = (n: { x: number; y: number }) => cam.place(n.x, n.y);
  const middle = cam.place(0, 0);
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // Edges first so studs sit on top of them, and trimmed to each end's rim: a
  // line drawn centre to centre shows through a dimmed node.
  type Seg = { a: { x: number; y: number }; b: { x: number; y: number }; live: boolean };
  const links: Seg[] = [];
  const drawn = new Set<string>();

  for (const node of nodes) {
    for (const other of neighboursOfTrial(node.id)) {
      const key = node.id < other ? `${node.id}|${other}` : `${other}|${node.id}`;
      if (drawn.has(key)) continue;
      drawn.add(key);

      const from = at(node);
      const far = byId.get(other);
      const to = other === CENTRE ? middle : far ? at(far) : null;
      if (!to) continue;

      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.max(1e-3, Math.hypot(dx, dy));
      const rFrom = NODE_R[node.kind] * BUILD;
      const rTo = (other === CENTRE ? HUB_R : NODE_R[far!.kind]) * BUILD;
      links.push({
        a: { x: from.x + (dx / len) * rFrom, y: from.y + (dy / len) * rFrom },
        b: { x: to.x - (dx / len) * rTo, y: to.y - (dy / len) * rTo },
        live: taken.has(node.id) && (other === CENTRE || taken.has(other)),
      });
    }
  }

  const casing = 0.16 * BUILD;
  for (const l of links) {
    for (const link of chain(l.a, l.b, casing * 0.5, `web__chain${l.live ? ' web__chain--on' : ''}`)) {
      view.append(link);
    }
  }

  const hub = svgEl('g', { class: 'web__centre' });
  for (const part of mount(middle, HUB_R * BUILD, 'web__hub')) hub.append(part);
  attachTooltip(
    hub,
    () =>
      'The Fissure, as you have made it.\n' +
      TRIALS_WEB.spec.wheels.map((w) => `${w.theme} — ${w.blurb}`).join('\n')
  );
  view.append(hub);

  for (const node of nodes) drawNode(view, node, taken, allocated, spare);
  svg.append(view);
  cam.apply();
  // Every node is new, so whatever the box holds is marked again.
  find.paint();
}

function drawNode(
  view: SVGElement,
  node: SkillNodeDef,
  taken: Set<string>,
  allocated: string[],
  spare: number
): void {
  const pos = cam.place(node.x, node.y);
  const r = NODE_R[node.kind] * BUILD;
  const owned = taken.has(node.id);
  const reachable = canAllocateTrial(node.id, allocated);
  const open = reachable && spare > 0;

  const group = svgEl('g', {
    class:
      'web__node' +
      (owned ? ' web__node--on' : '') +
      (node.kind === 'notable' ? ' web__node--notable' : '') +
      (open ? ' web__node--open' : '') +
      (!owned && !reachable ? ' web__node--locked' : ''),
    id: trialNodeId(node.id),
    tabindex: '0',
    role: 'button',
    'data-node': node.id,
  });
  for (const part of frame(node.kind, pos, r, 'web__node')) group.append(part);
  const glyphSize = r * 1.24;
  const glyph = nodeGlyph(node, glyphSize);
  glyph.setAttribute('x', (pos.x - glyphSize / 2).toFixed(2));
  glyph.setAttribute('y', (pos.y - Number(glyph.getAttribute('height')) / 2).toFixed(2));
  group.append(glyph);

  attachTooltip(group, () => {
    const state = owned
      ? canDeallocateTrial(node.id, allocated)
        ? 'allocated — click to refund'
        : 'allocated — refunding it would strand another node'
      : !reachable
        ? 'not connected to anything you own'
        : spare > 0
          ? 'available'
          : 'no trial points left';
    return nodeCard(node.name, state, [node.description]);
  });

  const act = () => {
    if (cam.dragged) return;
    // A node that asks something never allocates on the click itself: the
    // option IS the allocation, so there is no state where one is taken and
    // the other is not.
    if (node.choices?.length) {
      if (owned || open) openChoice(node, owned);
      return;
    }
    if (owned) deallocateTrial(game.character, node.id);
    else if (!allocateTrial(game.character, node.id)) return;
    render();
  };
  group.addEventListener('click', act);
  group.addEventListener('keydown', (e) => {
    const key = (e as KeyboardEvent).key;
    if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      act();
    }
  });
  view.append(group);
}

/**
 * The one node that ASKS something. A choice is free to change once taken —
 * two mutually exclusive nodes would tax finding out what a thing does.
 *
 * Placed by MEASURING the stud, which the trade web's header forbids at draw
 * time for a good reason: the modal decides its own height after the web draws.
 * By the time a node is clicked that has happened, so a box read here is a box
 * that has stopped moving.
 */
function openChoice(node: SkillNodeDef, owned: boolean): void {
  const host = $('trials-choice');
  const wrap = $('trials-webwrap');
  host.replaceChildren();
  host.hidden = false;

  const stud = document.getElementById(trialNodeId(node.id))?.getBoundingClientRect();
  const box = wrap.getBoundingClientRect();
  host.style.left = `${Math.round((stud?.right ?? box.left) - box.left + 8)}px`;
  host.style.top = `${Math.round((stud?.top ?? box.top) - box.top - 8)}px`;

  const pick = (id: string) => {
    if (!owned && !allocateTrial(game.character, node.id)) return;
    game.character.trialChoices = { ...(game.character.trialChoices ?? {}), [node.id]: id };
    host.hidden = true;
    render();
  };

  for (const choice of node.choices ?? []) {
    const taken = game.character.trialChoices?.[node.id] === choice.id;
    const row = el('button', `webmenu__row${taken ? ' webmenu__row--on' : ''}`);
    row.append(el('span', 'webmenu__name', choice.name));
    row.append(el('span', 'webmenu__desc', choice.description));
    (row as HTMLButtonElement).onclick = () => pick(choice.id);
    host.append(row);
  }

  if (owned && canDeallocateTrial(node.id, game.character.trialAllocated ?? [])) {
    const drop = el('button', 'webmenu__row webmenu__row--drop');
    drop.append(el('span', 'webmenu__name', 'Refund this node'));
    (drop as HTMLButtonElement).onclick = () => {
      deallocateTrial(game.character, node.id);
      host.hidden = true;
      render();
    };
    host.append(drop);
  }
}

const closeChoice = (): void => {
  $('trials-choice').hidden = true;
};

// ---------------------------------------------------------------------------

function render(): void {
  hideTooltip();
  closeChoice();

  const { character } = game;
  const earned = trialPointsFor(character.trials ?? [], character.climbed ?? {});
  const spent = (character.trialAllocated ?? []).length;
  // SHUT until the Fissure is whole. The ladder still shows, so what is coming
  // is legible from the first descent — it is the web that waits.
  const open = trialsOpen(character.climbed ?? {});
  const first = LADDER.zones[TRIAL_POINTS.freeZone];
  const cleared = Math.min(first.rungs, character.climbed?.[first.id] ?? 0);

  $('trials-sub').textContent = open
    ? `${spent}/${earned} points spent · ${TRIAL_POINTS_MAX} to earn · ` +
      `${trialNodes().length} nodes`
    : `Shut. ${cleared} of ${first.rungs} rungs of ${first.name} cleared`;
  $('trials-note').textContent = open
    ? `${TRIAL_POINTS.perTrial} points a trial and ${TRIAL_POINTS.perRung} a rung above the Fissure. ` +
      'Most nodes make a descent worse, and worse is what pays.'
    : `The web opens when the Fissure is whole. Trials done before then keep their ${TRIAL_POINTS.perTrial} points.`;

  $('trials-webwrap').hidden = !open;
  renderLadder();
  if (open) renderWeb();
  onChanged?.();
}

export function openTrials(): void {
  $('trials').hidden = false;
  find.clear();
  framed = false;
  render();
  // Opens on the MIDDLE at a size where a node can be read, not fitted: a
  // hundred and fifty-six of them fitted is a grey smear you zoom straight out
  // of, which is the same rule the skills web is under. Fit is a button.
  if (!framed) {
    cam.home();
    cam.apply();
    framed = true;
  }
}

export function closeTrials(): void {
  $('trials').hidden = true;
  hideTooltip();
}

export const isTrialsOpen = (): boolean => !$('trials').hidden;

export function initTrials(state: GameState, changed?: () => void): void {
  game = state;
  onChanged = changed ?? null;
  ($('trials-close') as HTMLButtonElement).onclick = closeTrials;
  ($('trials-fit') as HTMLButtonElement).onclick = () => {
    cam.fit(trialNodes(), 1.2);
    cam.apply();
  };
  cam.attach();
  find.attach();
}
