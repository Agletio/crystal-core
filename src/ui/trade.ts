/**
 * The Trade screen: the web you walk, and the one place you may become
 * something else.
 *
 * Twenty nodes fit on a screen, so unlike the skill web this one is drawn to
 * FIT and has no pan, no zoom and no Fit button. A map you scroll is what a
 * hundred nodes need; five spokes of four are a picture.
 *
 * A trade is chosen when the character is MADE — it is who you are, and the
 * body you are drawn as — so the picker here is the CHANGE, not the start. A
 * save from before that has none, and the character-select screen catches it.
 */
import { TRADE, TRADE as TRADE_RULES } from '../data';
import { GRANT_BY_ID } from '../sim/grants';
import {
  TRADES,
  TRADE_BY_ID,
  canAllocateTrade,
  canDeallocateTrade,
  neighboursOfTrade,
  tradeNodes,
  tradePointsFor,
  tradeSwitchCost,
} from '../trades';
import { CENTRE } from '../trees/node';
import { allocateTrade, deallocateTrade, takeUpTrade, tradePointsLeft } from '../sim/character';
import { attachTooltip, hideTooltip } from './tooltip';
import { nodeCard } from './glossary';
import { disc, lozenge, mount, stud, svgEl } from './webart';
import { ask } from './confirm';
import { note } from './history';
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
/** Whether the two cards are up. Forced open with no trade taken; otherwise it
 *  is a decision you made once, and leaving it on screen buries the web. */
let picking = false;

// Everything below is in WEB units, and the svg carries a viewBox that frames
// them. Nothing measures the element: the wrapper is inside a modal whose own
// height is decided after this draws, so a box read here is a box that has
// already moved by the time anyone looks at it.
const NODE_R = { minor: 0.19, notable: 0.32 };
const HUB_R = 0.52;
/** Room round the outermost node, so a stud's rim is never against the edge. */
const MARGIN = 0.7;

/** Every node's own line, printed from the GRANT rather than its prose, so
 *  what the sim does and what the card says cannot come apart. */
function saidBy(node: SkillNodeDef): string[] {
  return Object.entries(node.grants ?? {})
    .map(([key, value]) => GRANT_BY_ID[key]?.say?.(value) ?? null)
    .filter((s): s is string => s !== null);
}

// ---------------------------------------------------------------------------
// Picking one
// ---------------------------------------------------------------------------

function renderPicker(): void {
  const host = $('trade-pick');
  host.replaceChildren();

  const held = game.character.trade;
  for (const trade of TRADES) {
    if (held && held === trade.spec.id) continue;
    const card = el('button', 'catcard') as HTMLButtonElement;
    card.id = `trade-pick-${trade.spec.id}`;
    const head = el('span', 'catcard__head');
    head.append(el('span', 'catcard__name', trade.spec.name));
    card.append(head);
    card.append(el('span', 'catcard__blurb', trade.spec.blurb));
    // Nothing to spend is nothing to choose with: taking one up before a level
    // has paid for a point would be a decision made on no information at all.
    const earned = tradePointsFor(game.character.level);
    card.disabled = earned <= 0;
    card.append(
      el(
        'span',
        'catcard__count',
        earned > 0
          ? `${TRADE_RULES.maxPoints} points, half the web`
          : `not until level ${TRADE_RULES.levelsPerPoint}`
      )
    );
    card.onclick = () => choose(trade.spec.id);
    host.append(card);
  }
}

/** Taking one up. A swap refunds every point and costs gold; the first one is
 *  free, because nothing has been walked yet to pay for. */
async function choose(tradeId: string): Promise<void> {
  const { character } = game;
  const name = TRADE_BY_ID[tradeId]?.spec.name ?? tradeId;

  if (character.trade) {
    const cost = tradeSwitchCost(character.level);
    if (game.wallet.gold < cost) {
      note(`Taking up the ${name} costs ${cost} gold — you have ${game.wallet.gold}`, 'fail');
      return;
    }
    const yes = await ask({
      title: `Take up the ${name}?`,
      text: `${cost} gold, and all ${character.tradeAllocated.length} points you have spent come back.`,
      confirm: `Pay ${cost}`,
    });
    if (!yes) return;
    game.wallet.gold -= cost;
  }

  if (!takeUpTrade(character, tradeId)) return;
  note(`You take up the ${name}.`);
  picking = false;
  render();
}

// ---------------------------------------------------------------------------
// The web
// ---------------------------------------------------------------------------

function renderWeb(): void {
  const svg = $('trade-web') as unknown as SVGSVGElement;
  svg.replaceChildren();
  const tradeId = game.character.trade;
  if (!tradeId) return;

  const nodes = tradeNodes(tradeId);
  const allocated = game.character.tradeAllocated ?? [];
  const taken = new Set(allocated);
  const spare = tradePointsLeft(game.character);

  const reach = Math.max(1, ...nodes.map((n) => Math.hypot(n.x, n.y))) + MARGIN;
  svg.setAttribute('viewBox', `${-reach} ${-reach} ${reach * 2} ${reach * 2}`);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const at = (n: { x: number; y: number }) => ({ x: n.x, y: n.y });
  const middle = { x: 0, y: 0 };
  const byId = new Map(nodes.map((n) => [n.id, n]));

  // Edges first, so studs sit on top of them, and trimmed to each end's rim: a
  // line drawn centre to centre shows through a dimmed node.
  type Seg = { a: { x: number; y: number }; b: { x: number; y: number }; live: boolean };
  const links: Seg[] = [];
  const drawn = new Set<string>();

  for (const node of nodes) {
    for (const other of neighboursOfTrade(tradeId, node.id)) {
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
    svg.append(
      svgEl('line', {
        x1: l.a.x, y1: l.a.y, x2: l.b.x, y2: l.b.y,
        class: 'web__edge', 'stroke-width': casing,
      })
    );
  }
  for (const l of links) {
    svg.append(
      svgEl('line', {
        x1: l.a.x, y1: l.a.y, x2: l.b.x, y2: l.b.y,
        class: `web__edge--lit${l.live ? ' web__edge--on' : ''}`,
        'stroke-width': casing * (l.live ? 0.62 : 0.34),
        // Dashed over the solid casing, so a link reads as a run of chain.
        'stroke-dasharray': `${(casing * 1.2).toFixed(2)} ${(casing * 0.8).toFixed(2)}`,
      })
    );
  }

  const spec = TRADE_BY_ID[tradeId].spec;
  const hub = svgEl('g', { class: 'web__centre' });
  for (const part of mount(middle, HUB_R, 'web__hub')) hub.append(part);
  attachTooltip(hub, () => `${spec.name}\n${spec.blurb}`);
  svg.append(hub);

  for (const node of nodes) {
    const pos = at(node);
    const r = NODE_R[node.kind];
    const owned = taken.has(node.id);
    const reachable = canAllocateTrade(tradeId, node.id, allocated);
    const open = reachable && spare > 0;

    const group = svgEl('g', {
      class:
        'web__node' +
        (owned ? ' web__node--on' : '') +
        (node.kind === 'notable' ? ' web__node--notable' : '') +
        (open ? ' web__node--open' : '') +
        (!owned && !reachable ? ' web__node--locked' : ''),
      id: tradeNodeId(node.id),
      tabindex: '0',
      role: 'button',
      'data-node': node.id,
    });
    const grid = node.kind === 'notable' ? 13 : 9;
    for (const part of stud(node.kind === 'notable' ? lozenge(grid) : disc(grid), grid, pos, r, 'web__node')) {
      group.append(part);
    }

    attachTooltip(group, () => {
      const state = owned
        ? canDeallocateTrade(tradeId, node.id, allocated)
          ? 'allocated — click to refund'
          : 'allocated — refunding it would strand another node'
        : !reachable
          ? 'not connected to anything you own'
          : spare > 0
            ? 'available'
            : 'no points left';
      return nodeCard(node.name, state, [node.description, ...saidBy(node)]);
    });

    const act = () => {
      if (owned) deallocateTrade(game.character, node.id);
      else if (!allocateTrade(game.character, node.id)) return;
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
}

/** Stable id per node, so a tutorial step could ring one. */
export const tradeNodeId = (nodeId: string): string => `trade-node-${nodeId}`;

// ---------------------------------------------------------------------------

function render(): void {
  hideTooltip();

  const { character } = game;
  const earned = tradePointsFor(character.level);
  const chosen = character.trade ? TRADE_BY_ID[character.trade] : null;
  const nextAt = (Math.floor(character.level / TRADE.levelsPerPoint) + 1) * TRADE.levelsPerPoint;

  $('trade-modal-title').textContent = chosen ? chosen.spec.name : 'Trade';
  $('trade-sub').textContent = chosen
    ? `${character.tradeAllocated.length}/${earned} points spent` +
      (earned < TRADE.maxPoints
        ? ` · next at level ${nextAt} · ${TRADE.maxPoints} at level ${TRADE.maxPoints * TRADE.levelsPerPoint}`
        : ' · every point earned')
    : earned > 0
      ? `${earned} point${earned === 1 ? '' : 's'} waiting — choose what to be.`
      : `A trade is yours at level ${TRADE.levelsPerPoint}. You are ${character.level}.`;

  // Who you ARE is chosen when the character is made, so this screen is where
  // one is WALKED. Changing it is the exception, and it charges for being one.
  $('trade-placeholder').textContent = chosen
    ? 'You chose this when you came down here. Becoming something else costs.'
    : '';

  const open = picking || !chosen;
  $('trade-pick').hidden = !open;
  $('trade-webwrap').hidden = !chosen || open;

  const swap = $('trade-swap') as HTMLButtonElement;
  swap.hidden = !chosen;
  swap.textContent = open ? 'Never mind' : `Change trade — ${tradeSwitchCost(character.level)} gold`;
  swap.onclick = () => {
    picking = !picking;
    render();
  };

  if (open) renderPicker();
  else renderWeb();
  onChanged?.();
}

export function openTrade(): void {
  $('trade').hidden = false;
  picking = false;
  render();
}

export function closeTrade(): void {
  $('trade').hidden = true;
  hideTooltip();
}

export const isTradeOpen = (): boolean => !$('trade').hidden;

export function initTrade(state: GameState, changed?: () => void): void {
  game = state;
  onChanged = changed ?? null;

  ($('trade-close') as HTMLButtonElement).onclick = closeTrade;
}
