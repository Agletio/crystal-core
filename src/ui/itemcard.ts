/**
 * One item, drawn the way every screen draws it. The dock, the shop, the
 * stash, the shelf, the sheet and the bench each built their own string out of
 * the same four facts, so the game said an item six slightly different ways
 * and none could use colour. The split `statParts` makes is the point: the
 * rolled NUMBER is one colour and the modifier's name another.
 */
import { baseTier, fullUses, modCapacity, slotTypes, tierName } from '../mods';
import { statParts } from '../mod-text';
import { crystalFamily, rewardRows } from '../sim/crystal';
import { crystalProgress } from '../game/crystals';
import { FAMILY_BY_ID, GEAR_BASE_BY_ID, MOD_BY_ID, PERFECT, RELIC_BY_ID, UNIQUE_BY_ID } from '../data';
import { isPerfect } from '../economy';
import { GRANT_BY_ID } from '../sim/grants';
import { weaponSwing } from '../sim/stats';
import { glossaryOf, keywordLine } from './glossary';
import { itemIcon } from './icons';
import type { Item, RolledMod } from '../types';

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** A rolled value and the words around it, kept apart — and the words carry
 *  the keywords, since "increased" and "more" are the two that decide what a
 *  second copy of a line is worth. */
export function statLine(line: RolledMod['stats'][number]): HTMLElement {
  const { value, label } = statParts(line);
  const row = el('div', 'rolled');
  row.append(el('span', 'rolled__v', value));
  const words = keywordLine(label, 'rolled__k');
  row.append(words);
  return row;
}

/** Every stat on one modifier, one per line. */
export function statLines(mod: RolledMod): HTMLElement[] {
  return mod.stats.map(statLine);
}

/** What one modifier SWITCHES, in its own numbers, off the table by `defId` —
 *  the path `treeGrants` reads. A line whose whole effect is a grant, which is
 *  every forged one, says nothing at all without this. */
export function grantLines(mod: RolledMod): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const [id, value] of Object.entries(MOD_BY_ID[mod.defId]?.grants ?? {})) {
    const said = GRANT_BY_ID[id]?.say?.(value) ?? GRANT_BY_ID[id]?.what;
    if (said) out.push(keywordLine(said, 'tip__grant'));
  }
  return out;
}

/** One modifier: its stats, its switches, then the tier and family behind them. */
function modBlock(mod: RolledMod, named: boolean): HTMLElement {
  const block = el('div', 'tip__mod');
  for (const line of mod.stats) block.append(statLine(line));
  block.append(...grantLines(mod));
  if (named) {
    const foot = el('div', 'tip__modname', `T${mod.tier} ${mod.name}`);
    // WHAT IS LEFT OF IT, out of what it started with — the number a player
    // plans around, and the last descent has to read as the last one.
    if (mod.uses !== undefined) {
      const left = el('span', mod.uses <= 1 ? 'tip__uses tip__uses--last' : 'tip__uses',
        ` · ${mod.uses} of ${fullUses(mod)} descents left`);
      foot.append(left);
    }
    block.append(foot);
  }
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

  // The art beside the name: the same icon the slot shows, big enough to read.
  const head = el('div', 'tip__head');
  head.append(itemIcon(item, 36));
  const name = el('div', 'tip__name', item.name);
  if (unique) name.classList.add('tip__name--unique');
  if (isPerfect(item)) name.classList.add('tip__name--perfect');
  head.append(name);
  card.append(head);

  // A relic is not on any ladder: no tier, no item level and no capacity. What
  // it IS is the whole card, and the person who wants it is the rest.
  if (item.kind === 'relic') {
    const def = RELIC_BY_ID[item.base];
    card.append(el('div', 'tip__sub', 'Relic'));
    if (def) card.append(el('div', 'tip__flavour', def.flavour));
    for (const note of notes) card.append(el('div', 'tip__note', `— ${note}`));
    return card;
  }

  const facts = [tierName(item), `ilvl ${item.ilvl}`];
  if (item.kind === 'crystal') {
    facts[1] = FAMILY_BY_ID[crystalFamily(item)]?.name ?? 'Normal';
  }
  // A named piece holds nothing and never will, so a count out of zero is a
  // fact about a ladder it is not on.
  if (!unique) facts.push(`${item.mods.length}/${modCapacity(item)} modifiers`);
  card.append(el('div', 'tip__sub', facts.join(' · ')));

  // PERFECT. Said with its figure, because the whole of what it is is a number:
  // the base's own lines are 25% higher and nothing else about it differs.
  if (isPerfect(item)) {
    card.append(
      el('div', 'tip__perfect', `Perfect — ${Math.round(PERFECT.lift * 100)}% more from the base`)
    );
  }

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

  // The base, or what stands where it stood: a grafted line under a heading
  // reading "base" is a lie about where it came from.
  const hands = GEAR_BASE_BY_ID[item.base]?.hands ?? 1;
  const swings = item.damage ?? GEAR_BASE_BY_ID[item.base]?.damage ?? 0;
  if (item.armour || item.implicits.length > 0 || hands > 1 || swings > 0) {
    const base = group(item.meta.grafted !== undefined ? 'grafted' : 'base');
    // What it costs to hold, said where the rest of the base is said: an off
    // hand emptied by a weapon nobody told you was two-handed reads as a bug.
    if (hands > 1) {
      const row = el('div', 'rolled');
      row.append(el('span', 'rolled__v', String(hands)));
      row.append(el('span', 'rolled__k', 'Hands — your off hand stays empty'));
      base.append(row);
    }
    if (item.armour) {
      const row = el('div', 'rolled');
      row.append(el('span', 'rolled__v', String(item.armour)));
      row.append(el('span', 'rolled__k', 'Armour'));
      base.append(row);
    }
    // What it SWINGS for, before the implicits, because they act ON it.
    if (swings > 0) {
      const row = el('div', 'rolled');
      row.append(el('span', 'rolled__v', String(Math.round(weaponSwing(item)))));
      row.append(el('span', 'rolled__k', 'Physical Damage to Attacks'));
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

  // What the piece DOES, with ITS numbers in it — `say` off the item's own
  // grant bag rather than the table's generic sentence, which describes the
  // switch and no amount. And why it can never be crafted, which is otherwise
  // a currency refusing it for no reason the card gives.
  if (unique) {
    const box = group('it does this');
    const grants: string[] = [];
    for (const [id, value] of Object.entries(unique.grants ?? {})) {
      const said = GRANT_BY_ID[id]?.say?.(value) ?? GRANT_BY_ID[id]?.what;
      if (said) {
        grants.push(said);
        box.append(keywordLine(said, 'tip__grant'));
      }
    }
    box.append(el('div', 'tip__none', 'Fixed. Nothing at a bench can change it.'));
    card.append(box);
    // A named piece holds no modifiers, so there is room for the vocabulary.
    const glossary = glossaryOf(grants);
    if (glossary) card.append(glossary);
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
