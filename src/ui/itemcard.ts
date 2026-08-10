/**
 * One item, drawn the way every screen draws it. The dock, the haul, the
 * stash, the shelf, the sheet and the bench each built their own string out of
 * the same four facts, so the game said an item six slightly different ways
 * and none could use colour. The split `statParts` makes is the point: the
 * rolled NUMBER is one colour and the modifier's name another.
 */
import { baseTier, modCapacity, slotTypes, tierName } from '../mods';
import { statParts } from '../mod-text';
import { crystalFamily, rewardRows } from '../sim/crystal';
import { crystalProgress } from '../game/crystals';
import { FAMILY_BY_ID, UNIQUE_BY_ID } from '../data';
import { GRANT_BY_ID } from '../sim/grants';
import type { Item, RolledMod } from '../types';

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** A rolled value and the words around it, kept apart. */
export function statLine(line: RolledMod['stats'][number]): HTMLElement {
  const { value, label } = statParts(line);
  const row = el('div', 'rolled');
  row.append(el('span', 'rolled__v', value));
  row.append(el('span', 'rolled__k', label));
  return row;
}

/** Every stat on one modifier, one per line. */
export function statLines(mod: RolledMod): HTMLElement[] {
  return mod.stats.map(statLine);
}

/** One modifier: its stats, then the tier and family that produced them. */
function modBlock(mod: RolledMod, named: boolean): HTMLElement {
  const block = el('div', 'tip__mod');
  for (const line of mod.stats) block.append(statLine(line));
  if (named) block.append(el('div', 'tip__modname', `T${mod.tier} ${mod.name}`));
  return block;
}

function group(label: string): HTMLElement {
  const box = el('div', 'tip__group');
  box.append(el('div', 'tip__label', label));
  return box;
}

/**
 * `notes` are the lines about what a CLICK does, or why it cannot — the one
 * thing that differs per screen, and the reason this takes them rather than
 * each screen appending to a string it built itself.
 */
export function itemCard(item: Item, notes: string[] = []): HTMLElement {
  const locked = item.meta.corrupted === true;
  const unique = UNIQUE_BY_ID[String(item.meta.unique)];
  const card = el(
    'div',
    `tip__card tip__card--t${baseTier(item)}` +
      (locked ? ' tip__card--locked' : '') +
      (unique ? ' tip__card--unique' : '')
  );

  const name = el('div', 'tip__name', item.name);
  if (unique) name.classList.add('tip__name--unique');
  card.append(name);

  const facts = [tierName(item), `ilvl ${item.ilvl}`];
  if (item.kind === 'crystal') {
    facts[1] = FAMILY_BY_ID[crystalFamily(item)]?.name ?? 'Normal';
  }
  // A named piece holds nothing and never will, so a count out of zero is a
  // fact about a ladder it is not on.
  if (!unique) facts.push(`${item.mods.length}/${modCapacity(item)} modifiers`);
  card.append(el('div', 'tip__sub', facts.join(' · ')));

  // Locked is the one state worth saying twice: the border carries it across
  // the screen, and the word carries it for anyone who has not learnt the
  // border yet.
  if (locked) card.append(el('div', 'tip__locked', 'Locked — nothing can change it'));

  // What a crystal is worth, in the same chips the Fissure and the bench draw.
  if (item.kind === 'crystal') {
    const chips = el('div', 'tip__chips');
    for (const row of rewardRows(item)) {
      const chip = el('span', 'mult');
      chip.append(el('span', 'mult__k', row.label));
      chip.append(el('span', 'mult__v', row.value));
      chips.append(chip);
    }
    card.append(chips);
  }

  // The base: what the piece IS before anything rolled on it, and nothing at
  // the bench can reach any of it.
  if (item.armour || item.implicits.length > 0) {
    const base = group('base');
    if (item.armour) {
      const row = el('div', 'rolled');
      row.append(el('span', 'rolled__v', String(item.armour)));
      row.append(el('span', 'rolled__k', 'Armour'));
      base.append(row);
    }
    for (const imp of item.implicits) base.append(modBlock(imp, false));
    card.append(base);
  }

  // Grouped by slot type, with a gap between groups. A crystal has one type
  // and naming it "mod" says nothing, so its modifiers go in unlabelled.
  const types = slotTypes(item).filter((t) => item.mods.some((m) => m.slot === t));
  for (const type of types) {
    const box = item.kind === 'crystal' ? el('div', 'tip__group') : group(type);
    for (const mod of item.mods.filter((m) => m.slot === type)) {
      box.append(modBlock(mod, true));
    }
    card.append(box);
  }

  // What the piece DOES, in the words the grant table already carries — and
  // why it can never be crafted, which is otherwise a currency refusing it for
  // no reason the card gives.
  if (unique) {
    const box = group('it does this');
    for (const id of Object.keys(unique.grants ?? {})) {
      const what = GRANT_BY_ID[id]?.what;
      if (what) box.append(el('div', 'tip__grant', what));
    }
    box.append(el('div', 'tip__none', 'Fixed. Nothing at a bench can change it.'));
    card.append(box);
    card.append(el('div', 'tip__flavour', unique.flavour));
  } else if (item.mods.length === 0) {
    card.append(el('div', 'tip__none', 'No modifiers'));
  }

  // How far it has levelled. Only a crystal has anywhere to go.
  if (item.kind === 'crystal') {
    const grown = crystalProgress(item);
    card.append(
      el(
        'div',
        'tip__note',
        grown.need === null
          ? 'As far as it levels'
          : `${Math.floor(grown.xp)} / ${grown.need} to level ${grown.level + 1}`
      )
    );
  }

  for (const note of notes) card.append(el('div', 'tip__note', `— ${note}`));
  return card;
}
