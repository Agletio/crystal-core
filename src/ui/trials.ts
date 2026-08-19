/**
 * The Trials screen: the ladder on the left, the web on the right.
 *
 * A dozen nodes fit on a screen, so like the trade web this one is drawn to FIT
 * and has no pan, no zoom and no Fit button. Everything below is in WEB units
 * and the svg carries a viewBox framing them; nothing measures the element
 * while DRAWING, because the modal's height is decided after this runs.
 */
import { TRIALS } from '../data';
import {
  TRIALS_WEB,
  TRIAL_POINTS_MAX,
  canAllocateTrial,
  canDeallocateTrial,
  neighboursOfTrial,
  trialNodes,
} from '../trials';
import { CENTRE } from '../trees/node';
import { allocateTrial, deallocateTrial, trialPointsLeft } from '../sim/character';
import { trialDone } from '../game/trials';
import { attachTooltip, hideTooltip } from './tooltip';
import { nodeCard } from './glossary';
import { chain, frame, mount, svgEl } from './webart';
import { nodeGlyph } from './webicons';
import type { GameState } from '../game/state';
import type { SkillNodeDef } from '../trees/node';

const $ = (id: string) => document.getElementById(id)!;

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
    head.append(el('span', 'trialrow__state', done ? 'done — one point' : 'open'));
    row.append(head);
    row.append(el('div', 'trialrow__detail', trial.detail));
    host.append(row);
  }
}

// ---------------------------------------------------------------------------
// The web
// ---------------------------------------------------------------------------

function renderWeb(): void {
  const svg = $('trials-web') as unknown as SVGSVGElement;
  svg.replaceChildren();

  const nodes = trialNodes();
  const allocated = game.character.trialAllocated ?? [];
  const taken = new Set(allocated);
  const spare = trialPointsLeft(game.character);

  const reach = Math.max(1, ...nodes.map((n) => Math.hypot(n.x, n.y))) + MARGIN;
  svg.setAttribute('viewBox', `${-reach} ${-reach} ${reach * 2} ${reach * 2}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const at = (n: { x: number; y: number }) => ({ x: n.x, y: n.y });
  const middle = { x: 0, y: 0 };
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
      const rFrom = NODE_R[node.kind];
      const rTo = other === CENTRE ? HUB_R : NODE_R[far!.kind];
      links.push({
        a: { x: from.x + (dx / len) * rFrom, y: from.y + (dy / len) * rFrom },
        b: { x: to.x - (dx / len) * rTo, y: to.y - (dy / len) * rTo },
        live: taken.has(node.id) && (other === CENTRE || taken.has(other)),
      });
    }
  }

  const casing = 0.16;
  for (const l of links) {
    for (const link of chain(l.a, l.b, casing * 0.5, `web__chain${l.live ? ' web__chain--on' : ''}`)) {
      svg.append(link);
    }
  }

  const hub = svgEl('g', { class: 'web__centre' });
  for (const part of mount(middle, HUB_R, 'web__hub')) hub.append(part);
  attachTooltip(
    hub,
    () =>
      'The Fissure, as you have made it.\n' +
      TRIALS_WEB.spec.arms.map((a) => `${a.theme} — ${a.blurb}`).join('\n')
  );
  svg.append(hub);

  for (const node of nodes) drawNode(svg, node, taken, allocated, spare);
}

function drawNode(
  svg: SVGSVGElement,
  node: SkillNodeDef,
  taken: Set<string>,
  allocated: string[],
  spare: number
): void {
  const pos = { x: node.x, y: node.y };
  const r = NODE_R[node.kind];
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
  svg.append(group);
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
  const earned = (character.trials ?? []).length;
  const spent = (character.trialAllocated ?? []).length;

  $('trials-sub').textContent =
    `${spent}/${earned} points spent · ${TRIAL_POINTS_MAX} trials in all`;
  // The bargain, said once where it is being made: every node here is a
  // downside, and the payment is the danger it adds.
  $('trials-note').textContent =
    earned > 0
      ? 'Every node makes a descent worse. Reward comes off danger, so worse is what pays.'
      : 'Points come from trials, never from levels. The ladder is on the left.';

  renderLadder();
  renderWeb();
  onChanged?.();
}

export function openTrials(): void {
  $('trials').hidden = false;
  render();
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
}
