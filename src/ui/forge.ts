/**
 * THE ANVIL: what you can MAKE, and exactly what it would take.
 *
 * Every base in the game is listed, craftable or not — *"a plan you cannot see
 * is a plan nobody makes."* A row you cannot afford says why in numbers, and
 * the window your level buys is printed on it, so the reason to level a
 * profession is on the screen rather than in a wiki.
 */
import {
  CRAFT,
  GEAR_BASES,
  MATERIAL_FAMILY_BY_ID,
  PROFESSION_BY_ID,
} from '../data';
import type { GearBase } from '../types';
import {
  craftBase,
  craftLevel,
  liftFor,
  perfectChanceAt,
  recipeFor,
  whyNotCraft,
} from '../game/forge';
import type { CraftPart, CraftRecipe } from '../game/forge';
import type { GameState } from '../game/state';
import { Rng } from '../rng';
import { itemIcon } from './icons';
import { itemCard } from './itemcard';
import { attachTooltip } from './tooltip';
import { note } from './history';
import { makeGear } from '../economy';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let game: GameState;
let onChanged: (() => void) | null = null;
let rng = new Rng(20260831);

/** One tab a SLOT, which is how a player looks for a piece. */
const KINDS = [
  { id: 'weapon', name: 'Weapons' },
  { id: 'shield', name: 'Off hand' },
  { id: 'helmet', name: 'Helmets' },
  { id: 'body', name: 'Body' },
  { id: 'gloves', name: 'Gloves' },
  { id: 'boots', name: 'Boots' },
  { id: 'ring', name: 'Rings' },
  { id: 'amulet', name: 'Amulets' },
];
let shown = KINDS[0].id;

export const forgeMakeId = (baseId: string): string => `forge-make-${baseId}`;
export const forgeTabId = (kind: string): string => `forge-tab-${kind}`;

function tabs(): void {
  const host = $('forge-tabs');
  host.replaceChildren();
  for (const kind of KINDS) {
    const tab = el('button', 'mini climbtab', kind.name) as HTMLButtonElement;
    tab.id = forgeTabId(kind.id);
    tab.classList.toggle('climbtab--on', kind.id === shown);
    tab.onclick = () => {
      shown = kind.id;
      render();
    };
    host.append(tab);
  }
}

/** WHAT ONE PART ASKS FOR, in numbers. A TIER is how many different world
 *  versions it demands, so the count of worlds is the whole of what a tier is
 *  and it has to be on the card. */
export function saysPart(part: CraftPart): string {
  const family = MATERIAL_FAMILY_BY_ID[PROFESSION_BY_ID[part.profession]?.family ?? ''];
  const one = family?.one ?? 'unit';
  const many = `${part.wants} ${one}${part.wants === 1 ? '' : 's'}`;
  return part.versions === 1 ? many : `${many} from each of ${part.versions} worlds`;
}

/** What it asks for, in the station's own words. */
function saysRecipe(recipe: CraftRecipe): string[] {
  const out = recipe.parts.map(
    (part) => `${PROFESSION_BY_ID[part.profession]?.name} ${part.level} · ${saysPart(part)}`
  );
  if (recipe.unique > 0) out.push(`${recipe.unique} of a world's own material`);
  return out;
}

/** THE WINDOW YOUR LEVEL BUYS, said as the two ends of it — the whole reason
 *  a profession level matters, and a number nowhere else says. */
function saysWindow(recipe: CraftRecipe, base: GearBase): string {
  const level = craftLevel(game, recipe);
  const share = base.armour ?? base.damage ?? 0;
  if (share <= 0) return `at level ${level}`;
  const lo = Math.ceil(share * liftFor(windowLow(level)));
  const hi = Math.ceil(share * liftFor(windowHigh(level)));
  const what = base.armour ? 'armour' : 'damage';
  return `${lo}–${hi} ${what} at level ${level}`;
}

const windowShare = (level: number): number =>
  Math.max(0, Math.min(1, (level - 1) / 98));
const windowWidth = (level: number): number =>
  CRAFT.widthAt1 + (CRAFT.widthAtTop - CRAFT.widthAt1) * windowShare(level);
const windowLow = (level: number): number => windowShare(level) * (1 - windowWidth(level));
const windowHigh = (level: number): number => windowLow(level) + windowWidth(level);

function baseCard(base: GearBase, recipe: CraftRecipe): HTMLElement {
  const card = el('div', `crystal crystal--t${recipe.tier}`);
  const preview = makeGear(base.id, base.ilvl ?? 1);

  const head = el('div', 'crystal__head');
  head.append(itemIcon(preview, 26));
  const title = el('div', 'crystal__title');
  title.append(el('div', 'crystal__name', base.name));
  title.append(el('div', 'socket__family', `Tier ${recipe.tier} · ${saysWindow(recipe, base)}`));
  head.append(title);
  attachTooltip(head, () => itemCard(preview));
  card.append(head);

  for (const line of saysRecipe(recipe)) card.append(el('div', 'chosen__mod', line));

  const level = craftLevel(game, recipe);
  const odds = Math.round(perfectChanceAt(level) * 100);
  if (odds > 0) card.append(el('div', 'crystal__grow', `${odds}% chance of a Perfect base`));

  const why = whyNotCraft(game, recipe);
  const button = el('button', 'mini', why ?? 'Make it') as HTMLButtonElement;
  button.id = forgeMakeId(base.id);
  button.disabled = why !== null;
  button.onclick = () => {
    const made = craftBase(game, recipe, rng);
    if (!made) return;
    note(`Made ${made.item.name}${made.perfect ? ' — Perfect' : ''}`);
    render();
    onChanged?.();
  };
  card.append(button);
  return card;
}

export function render(): void {
  if (!game) return;
  tabs();
  const host = $('forge-list');
  host.replaceChildren();

  const rows = GEAR_BASES.filter((b) => b.kind === shown)
    .map((base) => ({ base, recipe: recipeFor(base.id) }))
    .filter((row): row is { base: GearBase; recipe: CraftRecipe } => row.recipe !== null)
    .sort((a, b) => a.recipe.tier - b.recipe.tier || a.base.name.localeCompare(b.base.name));
  for (const row of rows) host.append(baseCard(row.base, row.recipe));
  if (rows.length === 0) host.append(el('p', 'empty', 'Nothing here is made at an anvil.'));

  const made = rows.filter((row) => whyNotCraft(game, row.recipe) === null).length;
  $('forge-count').textContent = `${made} of ${rows.length} you can make`;
  $('forge-note').textContent =
    'Materials decide what a piece IS. Every modifier on it is still the bench\'s, ' +
    'and the level you work at decides how well it comes out.';
}

export function openForge(): void {
  $('forge').hidden = false;
  render();
}

export function closeForge(): void {
  $('forge').hidden = true;
  onChanged?.();
}

export const isForgeOpen = (): boolean => !$('forge').hidden;

export function initForge(state: GameState, refresh: () => void): void {
  game = state;
  onChanged = refresh;
  rng = new Rng(Date.now() & 0x7fffffff);
  ($('forge-close') as HTMLButtonElement).onclick = closeForge;
}
