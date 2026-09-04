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
  JEWEL_IMPLICITS,
  MATERIALS,
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
  uniqueFor,
  versionsFor,
  whyNotCraft,
} from '../game/forge';
import type { CraftPart, CraftRecipe } from '../game/forge';
import { collectWork, professionAt } from '../game/work';
import type { GameState } from '../game/state';
import { Rng } from '../rng';
import { itemIcon } from './icons';
import { itemCard } from './itemcard';
import { attachTooltip } from './tooltip';
import { note } from './history';
import { makeGear, makeMaterial } from '../economy';

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
/** THE FILTERS, beside the kind tabs: a tier, or only what you can make now.
 *  *"Filter down to like just t1 weapons or t2."* 0 is every tier. */
let tierShown = 0;
let makeableOnly = false;

export const forgeMakeId = (baseId: string): string => `forge-make-${baseId}`;
export const forgeTabId = (kind: string): string => `forge-tab-${kind}`;
export const forgeTierId = (tier: number): string => `forge-tier-${tier}`;

function filters(): void {
  const host = $('forge-filters');
  host.replaceChildren();
  for (const tier of [0, 1, 2, 3]) {
    const btn = el('button', 'mini climbtab', tier === 0 ? 'Every tier' : `Tier ${tier}`) as HTMLButtonElement;
    btn.id = forgeTierId(tier);
    btn.classList.toggle('climbtab--on', tier === tierShown);
    btn.onclick = () => {
      tierShown = tier;
      render();
    };
    host.append(btn);
  }
  const can = el('button', 'mini climbtab', 'Can make now') as HTMLButtonElement;
  can.id = 'forge-makeable';
  can.classList.toggle('climbtab--on', makeableOnly);
  can.onclick = () => {
    makeableOnly = !makeableOnly;
    render();
  };
  host.append(can);
}

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

/** THE WINDOW YOUR LEVEL BUYS, said as the two ends of it — the whole reason
 *  a profession level matters, and a number nowhere else says. */
function saysWindow(recipe: CraftRecipe, base: GearBase): string {
  const level = craftLevel(game, recipe);
  // The armour, the damage, or — on jewellery, where the implicit is the whole
  // of what the piece is FOR — the implicit's own first line.
  const line = base.implicit?.[0];
  const share = base.armour ?? base.damage ?? line?.range[0] ?? 0;
  const what = base.armour
    ? 'armour'
    : base.damage
      ? 'damage'
      : line
        ? `${line.form === 'inc' ? '% ' : ''}${STAT_WORD[line.stat] ?? line.stat}`
        : '';
  if (share <= 0) return `at level ${level}`;
  const lo = Math.ceil(share * liftFor(windowLow(level)));
  const hi = Math.ceil(share * liftFor(windowHigh(level)));
  return `${lo}–${hi} ${what} at level ${level}`;
}

/** What a jewellery implicit's stat is CALLED. Off the table, so a new one is
 *  a row and never a second word for the same thing. */
const STAT_WORD: Record<string, string> = Object.fromEntries(
  JEWEL_IMPLICITS.map((j) => [j.stat, j.name])
);

const windowShare = (level: number): number =>
  Math.max(0, Math.min(1, (level - 1) / 98));
const windowWidth = (level: number): number =>
  CRAFT.widthAt1 + (CRAFT.widthAtTop - CRAFT.widthAt1) * windowShare(level);
const windowLow = (level: number): number => windowShare(level) * (1 - windowWidth(level));
const windowHigh = (level: number): number => windowLow(level) + windowWidth(level);

/** One row of the NEEDS ledger: an icon, a name, and held against wanted as
 *  two numbers — lit when it is enough, dim when it is not. */
function needRow(icon: Element | null, what: string, held: number, wanted: number): HTMLElement {
  const row = el('div', `forgeneed ${held >= wanted ? 'forgeneed--ok' : 'forgeneed--short'}`);
  if (icon) row.append(icon);
  row.append(el('span', 'forgeneed__what', what));
  row.append(el('span', 'forgeneed__n', `${held} / ${wanted}`));
  return row;
}

/**
 * A CARD IS THREE BLOCKS — the piece, the LEVEL a profession must be at said
 * against the level you are, and the NEEDS ledger — then the button. *"Clean
 * up the actual boxes so it's clear what items are needed and what level is
 * required."*
 */
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

  const needs = el('div', 'forgeneeds');
  for (const part of recipe.parts) {
    const who = PROFESSION_BY_ID[part.profession];
    const at = professionAt(game, part.profession).level;
    needs.append(needRow(null, `${who?.name ?? part.profession} level`, at, part.level));
    const family = MATERIAL_FAMILY_BY_ID[who?.family ?? ''];
    const one = family?.one ?? 'unit';
    const ready = versionsFor(game, part);
    // The icon is a version you hold enough of, or the family's first: the
    // SHAPE says which stack, the numbers say whether it is enough.
    const shown = ready[0] ?? MATERIALS.find((m) => m.family === family?.id);
    const icon = shown ? itemIcon(makeMaterial(shown, 1, true), 22) : null;
    if (part.versions === 1) {
      const most = Math.max(0, ...MATERIALS.filter((m) => m.family === family?.id)
        .map((m) => (game.materials ?? []).find((i) => i.base === m.id && i.meta.done)?.meta.n as number ?? 0));
      needs.append(needRow(icon, `${one}s`, most, part.wants));
    } else {
      needs.append(needRow(icon, `worlds with ${part.wants} ${one}s`, ready.length, part.versions));
    }
  }
  // THE UNIVERSAL ROW: every recipe carries it, so it is a fact about the anvil
  // rather than a thing to notice on some cards and not others. Counted across
  // every world's, because any world's will do.
  if (recipe.gems > 0) {
    const cut = MATERIALS.filter((m) => m.family === 'gem');
    const held = cut.reduce((n, m) => n
      + (((game.materials ?? []).find((i) => i.base === m.id && i.meta.done)?.meta.n as number) ?? 0), 0);
    const shown = cut.find((m) => (game.materials ?? [])
      .some((i) => i.base === m.id && i.meta.done)) ?? cut[0];
    needs.append(needRow(shown ? itemIcon(makeMaterial(shown, 1, true), 22) : null,
      'cut stones', held, recipe.gems));
  }
  if (recipe.unique > 0) {
    const rare = uniqueFor(game);
    const held = rare ? ((game.materials ?? []).find((i) => i.base === rare.id)?.meta.n as number) ?? 0 : 0;
    const icon = rare ? itemIcon(makeMaterial(rare, 1), 22) : null;
    needs.append(needRow(icon, rare ? rare.name : "a world's own material", held, recipe.unique));
  }
  card.append(needs);

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
  for (const done of collectWork(game)) note(`${done.item.name} came off the station: +${done.job.n}`);
  tabs();
  filters();
  const host = $('forge-list');
  host.replaceChildren();

  const all = GEAR_BASES.filter((b) => b.kind === shown)
    .map((base) => ({ base, recipe: recipeFor(base.id) }))
    .filter((row): row is { base: GearBase; recipe: CraftRecipe } => row.recipe !== null)
    .sort((a, b) => a.recipe.tier - b.recipe.tier || a.base.name.localeCompare(b.base.name));
  const rows = all.filter(
    (row) => (tierShown === 0 || row.recipe.tier === tierShown)
      && (!makeableOnly || whyNotCraft(game, row.recipe) === null)
  );
  for (const row of rows) host.append(baseCard(row.base, row.recipe));
  if (rows.length === 0) {
    host.append(el('p', 'empty', all.length === 0
      ? 'Nothing here is made at an anvil.'
      : makeableOnly ? 'Nothing here you can make yet. The ledger on each card says what is short.' : 'Nothing at that tier here.'));
  }

  const made = all.filter((row) => whyNotCraft(game, row.recipe) === null).length;
  $('forge-count').textContent = `${made} of ${all.length} you can make`;
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
