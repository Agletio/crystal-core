/**
 * The skills modal: pick a skill, then spend its levels on its own web.
 *
 * Skills level by USE — the active skill shares whatever XP a run earns — so
 * the tree is what you get for committing to one, not something handed out
 * with character levels.
 *
 * The web is drawn as SVG: the skill in the centre, five inner nodes touching
 * it, five outer nodes hanging off those. Reaching an outer node means paying
 * for its inner one first, which is what makes it a tree rather than a menu.
 */
import { SKILLS, SKILL_BY_ID, DAMAGE_TYPE_BY_ID } from '../data';
import {
  canAllocate,
  canDeallocate,
  nodeById,
  treeFor,
} from '../skills-tree';
import { skillIcon } from './icons';
import { attachTooltip, hideTooltip } from './tooltip';
import type { SkillNodeDef } from '../skills-tree';
import { characterStats } from '../sim/stats';
import {
  addSkillXp,
  pointsAvailable,
  skillProgress,
  xpToNext,
} from '../sim/character';
import type { GameState } from '../game/state';
import type { SkillDef } from '../types';

const NS = 'http://www.w3.org/2000/svg';
const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function svgEl(tag: string, attrs: Record<string, string | number>): SVGElement {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

let game: GameState;
let viewing: string | null = null;
let onChanged: (() => void) | null = null;

// --- geometry --------------------------------------------------------------
const SIZE = 420;
const CENTRE = SIZE / 2;
const RING = { 1: 92, 2: 168 };

function positionOf(node: SkillNodeDef): { x: number; y: number } {
  const angle = node.angle * Math.PI * 2 - Math.PI / 2;
  const r = RING[node.ring];
  return { x: CENTRE + Math.cos(angle) * r, y: CENTRE + Math.sin(angle) * r };
}

/**
 * The damage line, with the numbers that actually produced it.
 *
 * A tooltip that just lists tags is decoration. The point is being able to
 * see WHY your damage is what it is — which types are live, what the tree
 * changed, and whether crit is worth anything yet.
 */
function skillSummary(skill: SkillDef): string[] {
  const stats = characterStats(game.character);
  const progress = skillProgress(game.character, skill.id);
  const grants = progress.allocated
    .flatMap((id) => treeFor(skill.id).filter((n) => n.id === id))
    .flatMap((n) => Object.entries(n.grants ?? {}));

  const converted = grants.find(([k]) => k === 'convertTo')?.[1] as string | undefined;
  const dealt = converted ?? skill.damageTypes[0] ?? 'physical';
  const dealtName = DAMAGE_TYPE_BY_ID[dealt]?.name ?? dealt;

  const lines = [
    `${skill.name} — level ${progress.level}`,
    skill.description,
    '',
    `tags: ${skill.tags.join(', ')}`,
    `deals: ${dealtName}${converted ? ` (converted from ${skill.damageTypes.join(', ')})` : ''}`,
    '',
    `damage per hit: ${Math.round(stats.damage)}`,
    `rate: ${stats.attacksPerSecond.toFixed(2)}/s  →  ${Math.round(
      stats.damage * stats.attacksPerSecond
    )} dps`,
    `crit: ${Math.round(stats.critChance)}% for ${(2 + stats.critMultiplier / 100).toFixed(
      2
    )}x`,
  ];

  if (converted) {
    lines.push(
      '',
      `Increases to ${skill.damageTypes.join('/')} still apply after conversion.`
    );
  }
  return lines;
}

// --- render ----------------------------------------------------------------

function renderSkillList(): void {
  const host = $('skills-list');
  host.replaceChildren();

  for (const skill of SKILLS) {
    const progress = skillProgress(game.character, skill.id);
    const active = skill.id === game.character.skillId;
    const open = skill.id === viewing;

    const btn = el('button', 'skillrow') as HTMLButtonElement;
    if (open) btn.classList.add('skillrow--on');

    const head = el('span', 'skillrow__head');
    head.append(el('span', 'skillrow__name', skill.name));
    if (active) head.append(el('span', 'skillrow__tag', 'equipped'));
    btn.append(head);

    const spare = pointsAvailable(progress);
    btn.append(
      el(
        'span',
        'skillrow__meta',
        `level ${progress.level} · ${spare} point${spare === 1 ? '' : 's'} unspent`
      )
    );

    btn.onclick = () => {
      viewing = skill.id;
      render();
    };
    host.append(btn);
  }
}

function renderTree(): void {
  const host = $('skills-tree');
  host.replaceChildren();
  const skillId = viewing;
  if (!skillId) return;

  const skill = SKILL_BY_ID[skillId];
  const progress = skillProgress(game.character, skillId);
  const nodes = treeFor(skillId);
  const spare = pointsAvailable(progress);

  const svg = svgEl('svg', {
    viewBox: `0 0 ${SIZE} ${SIZE}`,
    class: 'web',
    role: 'img',
  }) as SVGSVGElement;

  // Edges first, so nodes sit on top of them.
  for (const node of nodes) {
    const to = positionOf(node);
    const parent = node.requires ? nodes.find((n) => n.id === node.requires) : null;
    const from = parent ? positionOf(parent) : { x: CENTRE, y: CENTRE };
    const live = progress.allocated.includes(node.id);
    svg.append(
      svgEl('line', {
        x1: from.x, y1: from.y, x2: to.x, y2: to.y,
        class: `web__edge${live ? ' web__edge--on' : ''}`,
      })
    );
  }

  // Centre: the skill's own icon, and the tooltip explaining its numbers.
  const centre = svgEl('g', { class: 'web__centre' });
  centre.append(svgEl('circle', { cx: CENTRE, cy: CENTRE, r: 38, class: 'web__hub' }));

  // Nested SVG, so the icon keeps its own 32-unit coordinate space.
  const art = skillIcon(skillId, 48);
  art.setAttribute('x', String(CENTRE - 24));
  art.setAttribute('y', String(CENTRE - 24));
  art.setAttribute('width', '48');
  art.setAttribute('height', '48');
  centre.append(art);

  attachTooltip(centre, () => skillSummary(skill).join('\n'));
  svg.append(centre);

  for (const node of nodes) {
    const pos = positionOf(node);
    const taken = progress.allocated.includes(node.id);
    const open = canAllocate(skillId, node.id, progress.allocated) && spare > 0;

    const group = svgEl('g', {
      class:
        'web__node' +
        (taken ? ' web__node--on' : '') +
        (node.major ? ' web__node--major' : '') +
        (!taken && !open ? ' web__node--locked' : ''),
      tabindex: '0',
      role: 'button',
    });
    group.append(
      svgEl('circle', { cx: pos.x, cy: pos.y, r: node.major ? 26 : 17 })
    );

    attachTooltip(group, () => {
      const state = progress.allocated.includes(node.id)
        ? 'allocated'
        : canAllocate(skillId, node.id, progress.allocated)
          ? pointsAvailable(progress) > 0
            ? 'available'
            : 'no points left'
          : `requires ${nodeById(skillId, node.requires ?? '')?.name ?? 'the centre'}`;
      return `${node.name}  (${state})\n${node.description}`;
    });

    const act = () => {
      if (taken) {
        if (canDeallocate(skillId, node.id, progress.allocated)) {
          progress.allocated = progress.allocated.filter((id) => id !== node.id);
        }
      } else if (open) {
        progress.allocated.push(node.id);
      }
      render();
    };
    group.addEventListener('click', act);
    svg.append(group);
  }

  host.append(svg);

  // The legend carries the words; the web carries the shape.
  const legend = el('div', 'weblegend');
  for (const node of nodes) {
    const taken = progress.allocated.includes(node.id);
    const row = el('div', `weblegend__row${taken ? ' weblegend__row--on' : ''}`);
    row.append(
      el('span', `weblegend__dot${node.major ? ' weblegend__dot--major' : ''}`)
    );
    const body = el('span', 'weblegend__body');
    body.append(el('span', 'weblegend__name', node.name));
    body.append(el('span', 'weblegend__desc', node.description));
    row.append(body);
    legend.append(row);
  }
  host.append(legend);
}

function renderHeader(): void {
  const skillId = viewing;
  $('skills-detail').hidden = !skillId;
  if (!skillId) return;

  const skill = SKILL_BY_ID[skillId];
  const progress = skillProgress(game.character, skillId);

  $('skills-title').textContent = skill.name;
  $('skills-sub').textContent =
    `level ${progress.level} · ${pointsAvailable(progress)} unspent · ` +
    `${progress.xp}/${xpToNext(progress.level)} xp`;

  const equip = $('skills-equip') as HTMLButtonElement;
  const equipped = game.character.skillId === skillId;
  equip.textContent = equipped ? 'Equipped' : 'Equip';
  equip.disabled = equipped;
  equip.onclick = () => {
    game.character.skillId = skillId;
    render();
  };
}

function render(): void {
  // Rebuilding the tree destroys whatever the cursor was over, and a tooltip
  // bound to a removed node would hang around forever.
  hideTooltip();
  renderSkillList();
  renderHeader();
  renderTree();
  onChanged?.();
}

export function openSkills(): void {
  viewing = viewing ?? game.character.skillId;
  render();
  $('skills').hidden = false;
}

export function closeSkills(): void {
  $('skills').hidden = true;
}

export function isSkillsOpen(): boolean {
  return !$('skills').hidden;
}

export function initSkills(state: GameState, changed?: () => void): void {
  game = state;
  onChanged = changed ?? null;

  ($('skills-close') as HTMLButtonElement).onclick = closeSkills;
  $('skills').addEventListener('click', (event) => {
    if (event.target === $('skills')) closeSkills();
  });

  // Dev lever. Skills level from play, which is slow to test against — this
  // exists to make the tree reachable in seconds. Delete it once levelling
  // pace is something worth feeling.
  ($('skills-devlevel') as HTMLButtonElement).onclick = () => {
    if (!viewing) return;
    addSkillXp(game.character, viewing, xpToNext(skillProgress(game.character, viewing).level));
    render();
  };
}
