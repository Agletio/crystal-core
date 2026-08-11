/**
 * The Skills screen: three depths, one question each.
 *
 *   1  what KIND of skill — spells, attacks, passives, movement
 *   2  which one
 *   3  its web
 *
 * It used to be a list beside a web, which meant every skill you owned and
 * every node of the one you were looking at were on screen at the same time.
 * That was survivable with ten nodes. At a hundred it is a wall, and the wall
 * is in the way of the only thing you came here to do, which is decide where
 * the next point goes. So: Back is how you go up, and the screen only ever
 * shows one level.
 *
 * The web is a MAP, not a diagram. It does not fit in the window and it is not
 * meant to — you scroll to zoom and drag to move, the same as any other map,
 * because a hundred nodes shrunk to fit are a hundred dots you cannot read.
 */
import { SKILL_BY_ID, SKILL_CATEGORIES, SKILL_SLOT_BY_ID, skillsInCategory } from '../data';
import { GRANT_BY_ID } from '../sim/grants';
import {
  CENTRE,
  MAX_TREE_POINTS,
  canAllocate,
  canDeallocate,
  neighboursOf,
  treeFor,
  treePointsFor,
} from '../skills-tree';
import { categoryIcon, skillIcon } from './icons';
import { disc, gem, stud, svgEl } from './webart';
import { skillCatId, skillNodeId, skillRowId } from './tutorial';
import { attachTooltip, hideTooltip } from './tooltip';
import type { SkillNodeDef } from '../skills-tree';
import { characterStats, convertedType, damageDetail, skillBase, treeGrants } from '../sim/stats';
import { addSkillXp, equipSkill, equippedSkill, mainSkillId, skillProgress, slotForSkill, xpToNext } from '../sim/character';
import { AILMENT_NAMES, DAMAGE_TYPE_BY_ID } from '../data';
import type { GameState } from '../game/state';
import type { SkillCategory, SkillDef } from '../types';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let game: GameState;
let onChanged: (() => void) | null = null;

/** Where you are. Null category means the top. */
let category: SkillCategory | null = null;
let viewing: string | null = null;

// --- the map view ----------------------------------------------------------
//
// One transform, in web units. `scale` is pixels per unit; `panX/panY` are the
// web coordinates sitting at the middle of the viewport. Keeping the pan in
// WEB units rather than pixels is what makes zooming about the cursor a
// two-line calculation instead of a matrix.

const NODE_R = { minor: 15, notable: 25 };
const HUB_R = 40;
const ZOOM = { min: 16, max: 140, step: 1.18 };

/**
 * Pixels per web unit when you first open a tree.
 *
 * Deliberately NOT fit-to-window. A hundred nodes squeezed into a 430px box
 * are a grey smear you cannot read a single name off — you would zoom in
 * immediately, so the screen may as well start where you were going. Fit is a
 * button for when you want to see the shape of the whole thing.
 */
const HOME_SCALE = 54;

let scale = HOME_SCALE;
let panX = 0;
let panY = 0;
/** Set while a drag is in progress, so the drag doesn't also count as a click. */
let dragged = false;

/**
 * The viewport, in pixels.
 *
 * Falls back to a nominal size when the element has none, which is the case in
 * every headless environment — jsdom reports zero for everything. Without it
 * the web simply refuses to draw there, and "the tree renders" becomes the one
 * thing the smoke test cannot check.
 */
function viewport(): { width: number; height: number } {
  const box = $('skills-web').getBoundingClientRect();
  return box.width > 0 && box.height > 0
    ? { width: box.width, height: box.height }
    : { width: 760, height: 430 };
}

/** Back to the middle, at a zoom where the names are readable. */
function home(): void {
  scale = HOME_SCALE;
  panX = 0;
  panY = 0;
}

/** Frames the whole web with a margin, whatever shape it is. */
function fit(): void {
  const nodes = viewing ? treeFor(viewing) : [];
  const box = viewport();
  if (nodes.length === 0) return;

  const reach = Math.max(...nodes.map((n) => Math.hypot(n.x, n.y))) + 0.9;
  panX = 0;
  panY = 0;
  scale = clamp(Math.min(box.width, box.height) / (reach * 2), ZOOM.min, ZOOM.max);
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ---------------------------------------------------------------------------
// The skill's own numbers
// ---------------------------------------------------------------------------

/**
 * The damage line, with the numbers that actually produced it.
 *
 * A tooltip that just lists tags is decoration. The point is being able to see
 * WHY your damage is what it is — which type is live, what the tree changed,
 * and whether crit is worth anything to you at all, which it is not once
 * Kindling has taken it away.
 */
function skillSummary(skill: SkillDef): string[] {
  const stats = characterStats(game.character);
  const progress = skillProgress(game.character, skill.id);
  const grants = treeGrants(game.character);
  const mine = skill.id === equippedSkill(game.character, slotForSkill(skill.id) ?? '');

  const converted = convertedType(skill, grants);
  const dealt = converted ?? skill.damageTypes[0] ?? 'physical';

  const lines = [
    `${skill.name} — level ${progress.level}`,
    skill.description,
    '',
    `tags: ${skill.tags.join(', ')}`,
    `base: ${Math.round(skillBase(skill, game.character.level))} ` +
      `${DAMAGE_TYPE_BY_ID[dealt]?.name ?? dealt}` +
      (converted ? ` (converted from ${skill.damageTypes.join(', ')})` : ''),
    `added damage: ${skill.addedEffectiveness}%, as its own type`,
  ];

  // Everything below is derived from what you are WEARING, which is only the
  // truth for the skill you actually have equipped.
  if (!mine) {
    lines.push('', 'Equip to see your numbers.');
    return lines;
  }

  // Through damageDetail, so this and the character sheet cannot disagree.
  // A lasting skill is worth its number over a duration, not per hit.
  const detail = damageDetail(game.character);
  lines.push(
    '',
    detail.seconds > 0
      ? `damage per cast: ${Math.round(detail.perApplication)} over ${detail.seconds}s`
      : `damage per hit: ${Math.round(detail.perApplication)}`,
    `rate: ${detail.rate.toFixed(2)}/s  →  ${Math.round(detail.perSecond)} dps`,
    grants.critAilment
      ? `crit: converted to ${AILMENT_NAMES[dealt] ?? 'a lasting wound'}`
      : `crit: ${Math.round(stats.critChance)}% for ${(
          2 + stats.critMultiplier / 100
        ).toFixed(2)}x`
  );

  if (converted) {
    const was = skill.damageTypes.map((t) => DAMAGE_TYPE_BY_ID[t]?.name ?? t).join(' and ');
    lines.push('', `${was} in this tree counts as ${DAMAGE_TYPE_BY_ID[dealt]?.name ?? dealt}.`);
  }
  return lines;
}

// ---------------------------------------------------------------------------
// Level 1 — categories
// ---------------------------------------------------------------------------

function renderCategories(): void {
  const host = $('skills-cats');
  host.replaceChildren();

  for (const cat of SKILL_CATEGORIES) {
    const skills = skillsInCategory(cat.id);
    const card = el('button', 'catcard') as HTMLButtonElement;
    card.id = skillCatId(cat.id);
    const head = el('span', 'catcard__head');
    head.append(categoryIcon(cat.id, 26));
    head.append(el('span', 'catcard__name', cat.name));
    card.append(head);
    card.append(el('span', 'catcard__blurb', cat.blurb));
    card.append(
      el(
        'span',
        'catcard__count',
        skills.length === 0 ? 'empty' : `${skills.length} available`
      )
    );
    // An empty shelf is still shown — it says where something is going to go.
    // Making it clickable would only ever open a blank list.
    card.disabled = skills.length === 0;
    card.onclick = () => {
      category = cat.id;
      viewing = null;
      render();
    };
    host.append(card);
  }
}

// ---------------------------------------------------------------------------
// Level 2 — the skills on a shelf
// ---------------------------------------------------------------------------

function renderSkillList(): void {
  const host = $('skills-list');
  host.replaceChildren();
  if (!category) return;

  for (const skill of skillsInCategory(category)) {
    const progress = skillProgress(game.character, skill.id);
    const spare = treePointsFor(progress.level) - progress.allocated.length;

    const btn = el('button', 'skillrow') as HTMLButtonElement;
    btn.id = skillRowId(skill.id);
    const head = el('span', 'skillrow__head');
    head.append(el('span', 'skillrow__name', skill.name));
    if (skill.id === equippedSkill(game.character, slotForSkill(skill.id) ?? '')) {
      head.append(el('span', 'skillrow__tag', 'equipped'));
    }
    btn.append(head);

    const web = treeFor(skill.id).length;
    btn.append(
      el(
        'span',
        'skillrow__meta',
        web === 0
          ? `level ${progress.level} · no web yet`
          : `level ${progress.level} · ${progress.allocated.length}/${MAX_TREE_POINTS} spent · ` +
            `${spare} unspent`
      )
    );

    btn.onclick = () => {
      viewing = skill.id;
      home();
      render();
      renderWeb();
    };
    host.append(btn);
  }
}

// ---------------------------------------------------------------------------
// Level 3 — the web
// ---------------------------------------------------------------------------

function renderHeader(): void {
  const skillId = viewing;
  if (!skillId) return;

  const skill = SKILL_BY_ID[skillId];
  const progress = skillProgress(game.character, skillId);
  const cap = treePointsFor(progress.level);

  $('skills-title').textContent = skill.name;
  $('skills-sub').textContent =
    `level ${progress.level} · ${progress.allocated.length}/${cap} points spent` +
    (cap < MAX_TREE_POINTS ? ` · ${MAX_TREE_POINTS} at level ${MAX_TREE_POINTS}` : '') +
    ` · ${progress.xp}/${xpToNext(progress.level)} xp`;

  const equip = $('skills-equip') as HTMLButtonElement;
  const slot = slotForSkill(skillId);
  const equipped = !!slot && equippedSkill(game.character, slot) === skillId;
  // Which of the three it goes in, said out loud: a skill that cannot displace
  // the one you are swinging is a skill nobody would guess is equippable.
  const where = slot ? SKILL_SLOT_BY_ID[slot]?.name.toLowerCase() : null;
  equip.textContent = equipped ? `Equipped — ${where}` : where ? `Equip as ${where}` : 'Equip';
  equip.disabled = equipped || !slot;
  equip.onclick = () => {
    equipSkill(game.character, skillId);
    render();
    renderWeb();
  };
}

/** Web coordinates → pixels inside the current viewport. */
function project(
  x: number,
  y: number,
  box: { width: number; height: number }
): { x: number; y: number } {
  return {
    x: box.width / 2 + (x - panX) * scale,
    y: box.height / 2 + (y - panY) * scale,
  };
}

/**
 * What the node adds to the skill's mana cost, in its own words. Printed from
 * the grant rather than written into every description, so the line and the
 * number the sim charges cannot come apart.
 */
function cost(node: SkillNodeDef): string {
  const value = node.grants?.manaMultiplier;
  if (value === undefined) return '';
  const said = GRANT_BY_ID.manaMultiplier?.say?.(value);
  return said ? `\n${said}.` : '';
}

function renderWeb(): void {
  const svg = $('skills-web') as unknown as SVGSVGElement;
  svg.replaceChildren();
  const skillId = viewing;
  if (!skillId) return;

  const box = viewport();
  const skill = SKILL_BY_ID[skillId];
  const progress = skillProgress(game.character, skillId);
  const nodes = treeFor(skillId);
  const spare = treePointsFor(progress.level) - progress.allocated.length;
  const taken = new Set(progress.allocated);

  const at = (n: SkillNodeDef) => project(n.x, n.y, box);
  const middle = project(0, 0, box);

  // Edges first, so nodes sit on top of them. Drawn once per pair — every link
  // is undirected, so drawing both ends would double every stroke and make the
  // whole web look twice as heavy as it is.
  const drawn = new Set<string>();
  const byId = new Map(nodes.map((n) => [n.id, n]));
  type Seg = { a: { x: number; y: number }; b: { x: number; y: number }; live: boolean };
  const links: Seg[] = [];

  for (const node of nodes) {
    for (const other of neighboursOf(skillId, node.id)) {
      const key = node.id < other ? `${node.id}|${other}` : `${other}|${node.id}`;
      if (drawn.has(key)) continue;
      drawn.add(key);

      const from = at(node);
      const other_ = byId.get(other);
      const to = other === CENTRE ? middle : other_ ? at(other_) : null;
      if (!to) continue;

      // Trimmed to each end's edge. A line drawn centre to centre runs under
      // the node, and a dimmed node lets it show through.
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.max(1e-3, Math.hypot(dx, dy));
      const rFrom = (NODE_R[node.kind] * scale) / 46;
      const rTo = other === CENTRE ? HUB_R * (scale / 46) : (NODE_R[other_!.kind] * scale) / 46;
      const a = { x: from.x + (dx / len) * rFrom, y: from.y + (dy / len) * rFrom };
      const b = { x: to.x - (dx / len) * rTo, y: to.y - (dy / len) * rTo };

      // A link reads as "live" only when both ends are yours — a lit edge into
      // a node you have not taken looks like a path you already own.
      const live =
        taken.has(node.id) && (other === CENTRE || taken.has(other));
      links.push({ a, b, live });
    }
  }

  // Casings first, then every chain: drawn interleaved, a later casing would
  // cut across an earlier chain wherever two links cross.
  const casing = Math.max(3, scale * 0.14);
  for (const l of links) {
    svg.append(
      svgEl('line', {
        x1: l.a.x, y1: l.a.y, x2: l.b.x, y2: l.b.y,
        class: 'web__edge', 'stroke-width': casing.toFixed(1),
      })
    );
  }
  for (const l of links) {
    svg.append(
      svgEl('line', {
        x1: l.a.x, y1: l.a.y, x2: l.b.x, y2: l.b.y,
        class: `web__edge--lit${l.live ? ' web__edge--on' : ''}`,
        'stroke-width': (casing * (l.live ? 0.62 : 0.34)).toFixed(1),
      })
    );
  }

  // The middle: the skill itself, and the tooltip explaining its numbers.
  const hub = svgEl('g', { class: 'web__centre' });
  const hubR = HUB_R * (scale / 46);
  for (const part of stud(gem(19), 19, middle, hubR, 'web__hub')) hub.append(part);
  const art = skillIcon(skillId, hubR * 1.25);
  art.setAttribute('x', String(middle.x - hubR * 0.62));
  art.setAttribute('y', String(middle.y - hubR * 0.62));
  art.setAttribute('width', String(hubR * 1.25));
  art.setAttribute('height', String(hubR * 1.25));
  hub.append(art);
  attachTooltip(hub, () => skillSummary(skill).join('\n'));
  svg.append(hub);

  for (const node of nodes) {
    const pos = at(node);
    const r = (NODE_R[node.kind] * scale) / 46;
    // Nothing gained by building DOM for a node three screens away.
    if (
      pos.x < -r * 2 || pos.y < -r * 2 ||
      pos.x > box.width + r * 2 || pos.y > box.height + r * 2
    ) {
      continue;
    }

    const owned = taken.has(node.id);
    const reachable = canAllocate(skillId, node.id, progress.allocated);
    const open = reachable && spare > 0;

    const group = svgEl('g', {
      class:
        'web__node' +
        (owned ? ' web__node--on' : '') +
        (node.kind === 'notable' ? ' web__node--notable' : '') +
        (open ? ' web__node--open' : '') +
        (!owned && !reachable ? ' web__node--locked' : ''),
      id: skillNodeId(node.id),
      tabindex: '0',
      role: 'button',
      'data-node': node.id,
      // A stud is a stack of paths with no centre of its own to read back.
      'data-x': pos.x.toFixed(1),
      'data-y': pos.y.toFixed(1),
    });
    const grid = node.kind === 'notable' ? 13 : 9;
    const spans = node.kind === 'notable' ? gem(grid) : disc(grid);
    for (const part of stud(spans, grid, pos, r, 'web__node')) group.append(part);

    attachTooltip(group, () => {
      const picked = node.choices?.find((c) => c.id === progress.choices?.[node.id]);
      const state = owned
        ? canDeallocate(skillId, node.id, progress.allocated)
          ? 'allocated — click to refund'
          : 'allocated — refunding it would strand another node'
        : !reachable
          ? 'not connected to anything you own'
          : spare > 0
            ? 'available'
            : 'no points left';
      const choice = node.choices
        ? `\n${picked ? `chosen: ${picked.name} — ${picked.description}` : 'click to choose'}`
        : '';
      return `${node.name}  (${state})\n${node.description}${cost(node)}${choice}`;
    });

    const act = () => {
      // A drag that ends over a node is a drag, not a click on the node.
      if (dragged) return;
      // A node that asks a question never answers it for you.
      if (node.choices && (owned || open)) {
        openChoice(node, pos, owned);
        return;
      }
      if (owned) {
        if (canDeallocate(skillId, node.id, progress.allocated)) {
          progress.allocated = progress.allocated.filter((id) => id !== node.id);
        }
      } else if (open) {
        progress.allocated.push(node.id);
      } else {
        return;
      }
      render();
      renderWeb();
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

/**
 * The menu a choice node opens over itself.
 *
 * A choice is free to change once taken. Two mutually exclusive nodes would
 * mean picking the wrong one first costs a point to undo, which is a tax on
 * finding out what a thing does rather than a decision about your build.
 */
function openChoice(node: SkillNodeDef, pos: { x: number; y: number }, owned: boolean): void {
  const host = $('skills-choice');
  const skillId = viewing!;
  const progress = skillProgress(game.character, skillId);
  host.replaceChildren();
  host.hidden = false;
  host.style.left = `${Math.round(pos.x + 18)}px`;
  host.style.top = `${Math.round(pos.y - 12)}px`;

  const pick = (id: string) => {
    progress.choices ??= {};
    progress.choices[node.id] = id;
    if (!owned) progress.allocated.push(node.id);
    host.hidden = true;
    render();
    renderWeb();
  };

  for (const choice of node.choices ?? []) {
    const chosen = progress.choices?.[node.id] === choice.id;
    const row = el('button', `webmenu__row${chosen ? ' webmenu__row--on' : ''}`);
    row.append(el('span', 'webmenu__name', choice.name));
    row.append(el('span', 'webmenu__desc', choice.description));
    (row as HTMLButtonElement).onclick = () => pick(choice.id);
    host.append(row);
  }

  if (owned && canDeallocate(skillId, node.id, progress.allocated)) {
    const drop = el('button', 'webmenu__row webmenu__row--drop');
    drop.append(el('span', 'webmenu__name', 'Refund this node'));
    (drop as HTMLButtonElement).onclick = () => {
      progress.allocated = progress.allocated.filter((id) => id !== node.id);
      delete progress.choices?.[node.id];
      host.hidden = true;
      render();
      renderWeb();
    };
    host.append(drop);
  }
}

const closeChoice = (): void => {
  $('skills-choice').hidden = true;
};

// ---------------------------------------------------------------------------

function render(): void {
  // Rebuilding destroys whatever the cursor was over, and a tooltip bound to a
  // removed node would hang around forever.
  hideTooltip();

  closeChoice();
  const depth = viewing ? 3 : category ? 2 : 1;
  $('skills-cats').hidden = depth !== 1;
  $('skills-list').hidden = depth !== 2;
  $('skills-detail').hidden = depth !== 3;
  ($('skills-back') as HTMLButtonElement).hidden = depth === 1;
  ($('skills-devlevel') as HTMLButtonElement).hidden = depth !== 3;

  $('skills-modal-title').textContent =
    depth === 1
      ? 'Skills'
      : depth === 2
        ? SKILL_CATEGORIES.find((c) => c.id === category)?.name ?? 'Skills'
        : SKILL_BY_ID[viewing!]?.name ?? 'Skills';

  if (depth === 1) renderCategories();
  if (depth === 2) renderSkillList();
  if (depth === 3) renderHeader();

  onChanged?.();
}

function back(): void {
  if (viewing) viewing = null;
  else category = null;
  render();
}

export function openSkills(): void {
  $('skills').hidden = false;
  render();
  // Measuring needs the element on screen, so the fit happens after the
  // unhide rather than before it.
  if (viewing) renderWeb();
}

export function closeSkills(): void {
  $('skills').hidden = true;
  hideTooltip();
}

export function isSkillsOpen(): boolean {
  return !$('skills').hidden;
}

/** Which shelf is showing and whose web is up, for a step walking you to a node. */
export const skillsDepth = (): { category: string | null; viewing: string | null } =>
  isSkillsOpen() ? { category, viewing } : { category: null, viewing: null };

/** Escape steps back one level, and only closes from the top. */
export function skillsEscape(): void {
  if (viewing || category) back();
  else closeSkills();
}

export function initSkills(state: GameState, changed?: () => void): void {
  game = state;
  onChanged = changed ?? null;

  ($('skills-close') as HTMLButtonElement).onclick = closeSkills;
  ($('skills-back') as HTMLButtonElement).onclick = back;
  ($('skills-fit') as HTMLButtonElement).onclick = () => {
    fit();
    renderWeb();
  };
  $('skills').addEventListener('click', (event) => {
    if (event.target === $('skills')) closeSkills();
  });

  const svg = $('skills-web');

  // Zoom about the cursor: the web point under the pointer has to stay under
  // the pointer, which is the whole difference between a map that zooms and
  // one that jumps.
  svg.addEventListener(
    'wheel',
    (event) => {
      const e = event as WheelEvent;
      e.preventDefault();
      const box = svg.getBoundingClientRect();
      const px = e.clientX - box.left - box.width / 2;
      const py = e.clientY - box.top - box.height / 2;

      const before = { x: panX + px / scale, y: panY + py / scale };
      scale = clamp(
        e.deltaY < 0 ? scale * ZOOM.step : scale / ZOOM.step,
        ZOOM.min,
        ZOOM.max
      );
      panX = before.x - px / scale;
      panY = before.y - py / scale;
      hideTooltip();
      closeChoice();
      renderWeb();
    },
    { passive: false }
  );

  let from: { x: number; y: number } | null = null;
  /**
   * The pointer is captured only once a DRAG has started, never on the press.
   *
   * A captured pointer sends its `pointerup` to the capturing element, and the
   * browser then dispatches `click` on the nearest ancestor the press and the
   * release have in common — the map itself. Capture from `pointerdown` and no
   * click ever reaches a node again, which is the only thing this screen is for.
   */
  let held: number | null = null;
  svg.addEventListener('pointerdown', (event) => {
    const e = event as PointerEvent;
    from = { x: e.clientX, y: e.clientY };
    dragged = false;
  });
  svg.addEventListener('pointermove', (event) => {
    if (!from) return;
    const e = event as PointerEvent;
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    // A few pixels of slop, so a click with a shaky hand is still a click.
    if (!dragged && Math.hypot(dx, dy) < 4) return;
    if (!dragged) {
      svg.classList.add('web--drag');
      svg.setPointerCapture?.(e.pointerId);
      held = e.pointerId;
    }
    dragged = true;
    closeChoice();
    panX -= dx / scale;
    panY -= dy / scale;
    from = { x: e.clientX, y: e.clientY };
    hideTooltip();
    renderWeb();
  });
  const release = () => {
    from = null;
    if (held !== null) svg.releasePointerCapture?.(held);
    held = null;
    svg.classList.remove('web--drag');
    // Cleared on the next frame: the click event that ends a drag has not
    // fired yet, and it is the one that must be ignored.
    requestAnimationFrame(() => {
      dragged = false;
    });
  };
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);
  svg.addEventListener('pointerleave', release);

  // Dev lever. Skills level from play, which is slow to test against — this
  // exists to make the tree reachable in seconds. Delete it once levelling
  // pace is something worth feeling.
  ($('skills-devlevel') as HTMLButtonElement).onclick = () => {
    if (!viewing) return;
    const progress = skillProgress(game.character, viewing);
    addSkillXp(game.character, viewing, xpToNext(progress.level));
    render();
    renderWeb();
  };
}
