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
import {
  SKILL_BY_ID,
  SKILL_CATEGORIES,
  SKILL_SLOTS,
  SKILL_SLOT_BY_ID,
  skillsInCategory,
} from '../data';
import { GRANT_BY_ID } from '../sim/grants';
import {
  CENTRE,
  blockedBy,
  pointCapFor,
  canAllocate,
  canDeallocate,
  neighboursOf,
  treeFor,
  treePointsFor,
} from '../skills-tree';
import { categoryIcon, skillIcon } from './icons';
import { chain, frame, mount, svgEl } from './webart';
import { bakedArt, nodeGlyph } from './webicons';
import { attachTooltip, hideTooltip } from './tooltip';
import { ask } from './confirm';
import { keywordLine, nodeCard } from './glossary';
import { slotWorkings } from '../skill-text';
import type { SkillNodeDef } from '../skills-tree';
import { characterStats, convertedType, damageDetail, skillBase, treeGrants } from '../sim/stats';
import { addSkillXp, equipSkill, equippedSkill, skillProgress, slotForSkill, xpToNext } from '../sim/character';
import { AILMENT_NAMES, DAMAGE_TYPE_BY_ID } from '../data';
import type { GameState } from '../game/state';
import type { SkillCategory, SkillDef } from '../types';

const $ = (id: string) => document.getElementById(id)!;

/** The three depths of this screen, each with a stable id. */
export const skillCatId = (categoryId: string): string => `skillcat-${categoryId}`;
export const skillRowId = (skillId: string): string => `skillrow-${skillId}`;
export const skillNodeId = (nodeId: string): string => `skillnode-${nodeId}`;
export const skillSlotCardId = (slotId: string): string => `skillslot-${slotId}`;

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
  // The WRAP, never the web: the web is a canvas that moves under this window.
  const host = $('skills-webwrap');
  return host.clientWidth > 0 && host.clientHeight > 0
    ? { width: host.clientWidth, height: host.clientHeight }
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

/** A shelf row's card, in the shape a tree node takes so the glossary comes
 *  with it. The only reading a WEBLESS skill has: the click equips it. */
function skillCard(skill: SkillDef): HTMLElement {
  const slot = slotForSkill(skill.id);
  const where = slot ? SKILL_SLOT_BY_ID[slot]?.name.toLowerCase() : '';
  const on = !!slot && equippedSkill(game.character, slot) === skill.id;
  return nodeCard(skill.name, on ? 'equipped' : where ? `${where} slot` : '', [
    skill.description,
    ...slotWorkings(skill, game.character),
  ]);
}

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

/**
 * What clicking a skill anywhere on this screen MEANS.
 *
 * One with a web opens it, since that is the decision the screen exists for.
 * One without — a passive — is EQUIPPED instead: "no web yet" is a promise
 * the game is not going to keep for a skill that will never have one, and a
 * dead end is worse than a verb. Displacing something asks first, because
 * swapping the skill you are holding is not what a click on a list means.
 */
async function open(skillId: string): Promise<void> {
  if (treeFor(skillId).length > 0) {
    category = SKILL_BY_ID[skillId]?.category ?? category;
    viewing = skillId;
    home();
    render();
    renderWeb();
    return;
  }

  const slot = slotForSkill(skillId);
  if (!slot) return;
  const held = SKILL_BY_ID[equippedSkill(game.character, slot) ?? ''];
  if (held?.id === skillId) return;
  if (
    held &&
    !(await ask({
      title: `Equip ${SKILL_BY_ID[skillId]?.name ?? skillId}?`,
      text: `${held.name} comes out of your ${SKILL_SLOT_BY_ID[slot]?.name.toLowerCase() ?? slot} slot.`,
      confirm: 'Equip',
    }))
  ) {
    return;
  }
  equipSkill(game.character, skillId);
  render();
}

/**
 * What you are HOLDING, over the shelves it came off. A filled slot goes
 * straight to that skill's web, which is the thing you opened this screen to
 * look at; an empty one goes to the shelf it accepts, which is the only place
 * something that fits it can be.
 */
function renderSlots(): void {
  const host = $('skills-slots');
  host.replaceChildren();

  for (const slot of SKILL_SLOTS) {
    const held = SKILL_BY_ID[equippedSkill(game.character, slot.id) ?? ''];
    const card = el('button', `slotcard${held ? '' : ' slotcard--empty'}`) as HTMLButtonElement;
    card.id = skillSlotCardId(slot.id);
    card.append(held ? skillIcon(held.id, 26) : categoryIcon(slot.accepts[0], 26));

    const what = el('span', 'slotcard__what');
    what.append(el('span', 'slotcard__slot', slot.name));
    what.append(el('span', 'slotcard__name', held?.name ?? 'empty'));
    card.append(what);
    attachTooltip(card, () => (held ? skillCard(held) : `${slot.name}\n${slot.blurb}`));

    // A filled one goes to its web; an empty one, and anything with no web to
    // go to, goes to the shelf this slot ACCEPTS.
    card.onclick = () => {
      if (held && treeFor(held.id).length > 0) return void open(held.id);
      category = (held ? SKILL_BY_ID[held.id]?.category : null) ?? slot.accepts[0] ?? null;
      viewing = null;
      render();
    };
    host.append(card);
  }
}

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
    const spare = treePointsFor(skill.id, progress.level) - progress.allocated.length;

    const btn = el('button', 'skillrow') as HTMLButtonElement;
    btn.id = skillRowId(skill.id);
    const head = el('span', 'skillrow__head');
    head.append(el('span', 'skillrow__name', skill.name));
    if (skill.id === equippedSkill(game.character, slotForSkill(skill.id) ?? '')) {
      head.append(el('span', 'skillrow__tag', 'equipped'));
    }
    btn.append(head);

    // A row with only a name on it is a choice made blind.
    btn.append(keywordLine(skill.description, 'skillrow__how'));

    const web = treeFor(skill.id).length;
    const cap = pointCapFor(skill.id);
    btn.append(
      el(
        'span',
        'skillrow__meta',
        web === 0
          ? `level ${progress.level} · no web — click to equip`
          : `level ${progress.level} · ${progress.allocated.length}/${cap} spent · ` +
            `${spare} unspent`
      )
    );
    attachTooltip(btn, () => skillCard(skill));

    btn.onclick = () => void open(skill.id);
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
  const cap = treePointsFor(skillId, progress.level);

  $('skills-title').textContent = skill.name;
  // The cap is the WEB's, so a nine-node movement web says 6 rather than 30.
  const most = pointCapFor(skillId);
  $('skills-sub').textContent =
    `level ${progress.level} · ${progress.allocated.length}/${cap} points spent` +
    (cap < most ? ` · ${most} at level ${most}` : '') +
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
 * The web is BUILT ONCE, at this many pixels per unit, and the camera is one
 * transform over it. Rebuilding it per wheel tick and per pointer move meant
 * tearing down and re-creating some six hundred elements a frame, which is
 * what made a web of pixel art stutter. `NODE_R` is already written at 46, so
 * a node built here is its own art's size.
 */
const BUILD = 46;

/** Half the built canvas: a web is drawn about 0,0 and an SVG clips to its own
 *  viewport, so it is shifted into the middle of one big enough to hold it. */
let origin = 0;

/** Web coordinates → the built web's own space, which no camera touches. */
const place = (x: number, y: number) => ({ x: x * BUILD + origin, y: y * BUILD + origin });

/** The camera: a CSS transform on the SVG ELEMENT, which the compositor moves
 *  without re-rastering. As the view group's own `transform` — the obvious
 *  way — every element re-rasters per frame: 50ms against 17. */
function applyView(): void {
  const box = viewport();
  const k = scale / BUILD;
  const tx = box.width / 2 - panX * scale - origin * k;
  const ty = box.height / 2 - panY * scale - origin * k;
  $('skills-web').style.transform =
    `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${k.toFixed(4)})`;
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
  return said ? `${said}.` : '';
}

function renderWeb(): void {
  const svg = $('skills-web') as unknown as SVGSVGElement;
  svg.replaceChildren();
  const skillId = viewing;
  if (!skillId) return;

  // Everything goes in ONE group, built in the web's own space; the camera is
  // that group's transform and nothing here is rebuilt to move it.
  const view = svgEl('g', { class: 'web__view' });
  const skill = SKILL_BY_ID[skillId];
  const nodesFor = treeFor(skillId);
  // Sized to what it holds: the furthest node, plus room for its own art.
  const reach =
    Math.max(1, ...nodesFor.map((n) => Math.max(Math.abs(n.x), Math.abs(n.y)))) + 1.4;
  origin = Math.ceil(reach * BUILD);
  svg.style.width = `${origin * 2}px`;
  svg.style.height = `${origin * 2}px`;
  const progress = skillProgress(game.character, skillId);
  const nodes = treeFor(skillId);
  const spare = treePointsFor(skillId, progress.level) - progress.allocated.length;
  const taken = new Set(progress.allocated);

  const at = (n: SkillNodeDef) => place(n.x, n.y);
  const middle = place(0, 0);

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
      const rFrom = (NODE_R[node.kind] * BUILD) / 46;
      const rTo = other === CENTRE ? HUB_R * (BUILD / 46) : (NODE_R[other_!.kind] * BUILD) / 46;
      const a = { x: from.x + (dx / len) * rFrom, y: from.y + (dy / len) * rFrom };
      const b = { x: to.x - (dx / len) * rTo, y: to.y - (dy / len) * rTo };

      // A link reads as "live" only when both ends are yours — a lit edge into
      // a node you have not taken looks like a path you already own.
      const live =
        taken.has(node.id) && (other === CENTRE || taken.has(other));
      links.push({ a, b, live });
    }
  }

  // The chain alone, straight onto the ground: a casing under it read as a
  // black box around every run of links.
  const casing = Math.max(3, BUILD * 0.14);
  for (const l of links) {
    for (const link of chain(l.a, l.b, casing * 0.5, `web__chain${l.live ? ' web__chain--on' : ''}`)) {
      view.append(link);
    }
  }

  // The middle: the skill itself, and the tooltip explaining its numbers.
  const hub = svgEl('g', { class: 'web__centre' });
  const hubR = HUB_R * (BUILD / 46);
  for (const part of mount(middle, hubR, 'web__hub')) hub.append(part);
  // Baked like the node glyphs: the middle is the biggest picture in the web
  // and would open the same seams.
  const art =
    bakedArt(`sk_${skillId}`, hubR * 1.25, 'web__node__img') ?? skillIcon(skillId, hubR * 1.25);
  art.setAttribute('x', String(middle.x - hubR * 0.62));
  art.setAttribute('y', String(middle.y - hubR * 0.62));
  art.setAttribute('width', String(hubR * 1.25));
  art.setAttribute('height', String(hubR * 1.25));
  hub.append(art);
  attachTooltip(hub, () => skillSummary(skill).join('\n'));
  view.append(hub);

  for (const node of nodes) {
    const pos = at(node);
    const r = (NODE_R[node.kind] * BUILD) / 46;
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
      // Where it sits in the WEB, which a camera never changes: a stud is a
      // stack of paths with no centre of its own to read back.
      'data-x': pos.x.toFixed(1),
      'data-y': pos.y.toFixed(1),
    });
    for (const part of frame(node.kind, pos, r, 'web__node')) group.append(part);
    const glyphSize = r * 1.24;
    const glyph = nodeGlyph(node, glyphSize);
    glyph.setAttribute('x', (pos.x - glyphSize / 2).toFixed(2));
    glyph.setAttribute('y', (pos.y - Number(glyph.getAttribute('height')) / 2).toFixed(2));
    group.append(glyph);

    attachTooltip(group, () => {
      const picked = node.choices?.find((c) => c.id === progress.choices?.[node.id]);
      // A refusal says WHO it clashes with and what the pair comes to: "cannot
      // be taken with Rupture" is a decision, where a dark node is a mystery.
      const clash = owned ? null : blockedBy(skillId, node.id, progress.allocated);
      const state = owned
        ? canDeallocate(skillId, node.id, progress.allocated)
          ? 'allocated — click to refund'
          : 'allocated — refunding it would strand another node'
        : clash
          ? `cannot be taken with ${clash.node.name} — ${clash.says}`
          : !reachable
            ? 'not connected to anything you own'
            : spare > 0
              ? 'available'
              : 'no points left';
      const choice = node.choices
        ? picked
          ? `Chosen: ${picked.name} — ${picked.description}`
          : 'Click to choose.'
        : '';
      return nodeCard(node.name, state, [node.description, cost(node), choice]);
    });

    const act = () => {
      // A drag that ends over a node is a drag, not a click on the node.
      if (dragged) return;
      // A node that asks a question never answers it for you.
      if (node.choices && (owned || open)) {
        openChoice(node, owned);
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
    view.append(group);
  }

  // Attached once it is whole, then aimed: a group built into the document is
  // a layout pass per element added to it.
  svg.append(view);
  applyView();
}

/**
 * The menu a choice node opens over itself.
 *
 * A choice is free to change once taken. Two mutually exclusive nodes would
 * mean picking the wrong one first costs a point to undo, which is a tax on
 * finding out what a thing does rather than a decision about your build.
 */
function openChoice(node: SkillNodeDef, owned: boolean): void {
  const host = $('skills-choice');
  const skillId = viewing!;
  const progress = skillProgress(game.character, skillId);
  host.replaceChildren();
  host.hidden = false;
  // Projected HERE rather than carried on the node: the web is built once, so
  // what a node knows about itself is where it sits in the web, not on screen.
  const pos = project(node.x, node.y, viewport());
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

  $('skills-slots').hidden = depth !== 1;

  if (depth === 1) {
    renderSlots();
    renderCategories();
  }
  if (depth === 2) renderSkillList();
  if (depth === 3) renderHeader();

  onChanged?.();
}

function back(): void {
  if (viewing) viewing = null;
  else category = null;
  render();
}

/** Always at the TOP. Where you were last time is not where you are going, and
 *  a screen that reopens three deep hides the two questions above it. */
export function openSkills(): void {
  $('skills').hidden = false;
  category = null;
  viewing = null;
  render();
}

export function closeSkills(): void {
  $('skills').hidden = true;
  hideTooltip();
}

export function isSkillsOpen(): boolean {
  return !$('skills').hidden;
}

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
    applyView();
  };

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
      applyView();
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
    applyView();
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
