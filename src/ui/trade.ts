/**
 * The Trade screen: the web you walk, and the one place you may become
 * something else.
 *
 * FORTY-FIVE nodes no longer fit a card, so this roams: scroll to zoom, drag
 * to move, Fit to see the shape of it. Through `webcam.ts`, which the skills
 * web uses too — one camera, and it already knows why rebuilding per frame is
 * what made the other one stutter.
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
  tradeNextAt,
  tradePointsFor,
} from '../trades';
import { CENTRE } from '../trees/node';
import { allocateTrade, deallocateTrade, takeUpTrade, tradePointsLeft } from '../sim/character';
import { attachTooltip, hideTooltip } from './tooltip';
import { nodeCard } from './glossary';
import { chain, frame, mount, svgEl } from './webart';
import { BUILD, Camera } from './webcam';
import { nodeGlyph } from './webicons';
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
/** Cleared whenever the web goes away, so it is framed again on the way back. */
let framed = false;

/** In WEB UNITS; `BUILD` turns them into the pixels the art is drawn at. */
const NODE_R = { minor: 0.23, notable: 0.37 };
const HUB_R = 0.56;

/** Forty-five nodes no longer fit a card, so this web roams like the skills
 *  one — and through the SAME camera, or the two drift and one of them is the
 *  slow one. */
const cam = new Camera({
  svg: 'trade-web',
  wrap: 'trade-webwrap',
  home: 46,
  zoom: { min: 14, max: 130, step: 1.18 },
});

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
          ? `${TRADE_RULES.maxPoints} points, ${TRADE_RULES.pointsPerGrant} at a time`
          : `not until level ${TRADE_RULES.firstAt}`
      )
    );
    card.onclick = () => choose(trade.spec.id);
    host.append(card);
  }
}

/** Taking one up, and there is no taking it back: who you are is chosen when
 *  you come down here. The WALK still refunds a node at a time. */
async function choose(tradeId: string): Promise<void> {
  const { character } = game;
  const name = TRADE_BY_ID[tradeId]?.spec.name ?? tradeId;
  if (character.trade) return;

  const yes = await ask({
    title: `Take up the ${name}?`,
    text: 'This is who you are for the rest of this character. The points you spend on its web come back one at a time; the trade itself does not.',
    confirm: `Take it up`,
  });
  if (!yes) return;

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

  // ONE group, built in the web's own space at a fixed scale. The camera is a
  // transform over the whole thing and nothing here is rebuilt to move it —
  // rebuilding per wheel tick is what made the skills web stutter.
  const view = svgEl('g', { class: 'web__view' });
  const reach = Math.max(1, ...nodes.map((n) => Math.max(Math.abs(n.x), Math.abs(n.y)))) + 1.4;
  cam.origin = Math.ceil(reach * BUILD);
  svg.style.width = `${cam.origin * 2}px`;
  svg.style.height = `${cam.origin * 2}px`;

  const at = (n: { x: number; y: number }) => cam.place(n.x, n.y);
  const middle = cam.place(0, 0);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const rOf = (kind: 'minor' | 'notable') => NODE_R[kind] * BUILD;
  const hubR = HUB_R * BUILD;

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
      const rFrom = rOf(node.kind);
      const rTo = other === CENTRE ? hubR : rOf(far!.kind);
      links.push({
        a: { x: from.x + (dx / len) * rFrom, y: from.y + (dy / len) * rFrom },
        b: { x: to.x - (dx / len) * rTo, y: to.y - (dy / len) * rTo },
        live: taken.has(node.id) && (other === CENTRE || taken.has(other)),
      });
    }
  }

  const casing = Math.max(3, BUILD * 0.14);
  for (const l of links) {
    for (const link of chain(l.a, l.b, casing * 0.5, `web__chain${l.live ? ' web__chain--on' : ''}`)) {
      view.append(link);
    }
  }

  const spec = TRADE_BY_ID[tradeId].spec;
  const hub = svgEl('g', { class: 'web__centre' });
  for (const part of mount(middle, hubR, 'web__hub')) hub.append(part);
  attachTooltip(hub, () => `${spec.name}\n${spec.blurb}`);
  view.append(hub);

  for (const node of nodes) {
    const pos = at(node);
    const r = rOf(node.kind);
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
    for (const part of frame(node.kind, pos, r, 'web__node')) group.append(part);
    const glyphSize = r * 1.24;
    const glyph = nodeGlyph(node, glyphSize);
    glyph.setAttribute('x', (pos.x - glyphSize / 2).toFixed(2));
    glyph.setAttribute('y', (pos.y - Number(glyph.getAttribute('height')) / 2).toFixed(2));
    group.append(glyph);

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
      // A drag that ends over a node is not a click on it.
      if (cam.dragged) return;
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
    view.append(group);
  }

  svg.append(view);
  cam.apply();
}

/** Stable id per node, so a tutorial step could ring one. */
export const tradeNodeId = (nodeId: string): string => `trade-node-${nodeId}`;

// ---------------------------------------------------------------------------

function render(): void {
  hideTooltip();

  const { character } = game;
  const earned = tradePointsFor(character.level);
  const chosen = character.trade ? TRADE_BY_ID[character.trade] : null;
  const nextAt = tradeNextAt(character.level);

  $('trade-modal-title').textContent = chosen ? chosen.spec.name : 'Trade';
  $('trade-sub').textContent = chosen
    ? `${character.tradeAllocated.length}/${earned} points spent` +
      (nextAt !== null
        ? ` · ${TRADE.pointsPerGrant} more at level ${nextAt} · ${TRADE.maxPoints} in all`
        : ' · every point earned')
    : earned > 0
      ? `${earned} point${earned === 1 ? '' : 's'} waiting — choose what to be.`
      : `A trade is yours at level ${TRADE.firstAt}. You are ${character.level}.`;

  // Who you ARE is chosen once, so this screen is where one is WALKED.
  $('trade-placeholder').textContent = chosen
    ? 'You chose this when you came down here, and it does not change.'
    : '';

  const open = picking || !chosen;
  const showWeb = !!chosen && !open;
  $('trade-pick').hidden = !open;
  $('trade-webwrap').hidden = !showWeb;
  if (!showWeb) framed = false;

  if (open) renderPicker();
  else renderWeb();
  // Opens FRAMED, unlike the skills web. That one holds a hundred and sixteen
  // nodes and fitting them is a grey smear you would zoom straight out of;
  // forty-five fit and stay readable, and a web whose shape you cannot see is
  // a web nobody plans a route through.
  //
  // Framed HERE rather than in `openTrade`, and after the wrap is shown: a
  // hidden element measures nothing, so a fit before the render is a fit to a
  // guessed box — and taking a trade up reaches the web without opening the
  // screen at all.
  if (showWeb && !framed) {
    cam.fit(tradeNodes(character.trade!), 1.1);
    cam.apply();
    framed = true;
  }
  onChanged?.();
}

export function openTrade(): void {
  $('trade').hidden = false;
  picking = false;
  framed = false;
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
  ($('trade-fit') as HTMLButtonElement).onclick = () => {
    cam.fit(tradeNodes(game.character.trade));
    cam.apply();
  };
  cam.attach();
}
