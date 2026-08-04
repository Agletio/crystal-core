import { Rng } from './rng';
import { ModPool, fillState, slotCapacity, slotTypes, slotUsed } from './mods';
import { canApply, craft, describeMod } from './crafting';
import { ALL_MODS, CRYSTAL_TIERS, CURRENCIES } from './data';
import { makeCrystal, makeGear } from './economy';
import type { CurrencyDef, Item, RolledMod } from './types';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const pool = new ModPool(ALL_MODS);
let seed = Math.floor(Math.random() * 1e9);
let rng = new Rng(seed);
let item: Item = makeCrystal(3);
let log: Array<{ text: string; kind: 'add' | 'remove' | 'note' | 'fail' }> = [];
let focused: string | null = null;

const BENCH_ITEMS: Array<{ label: string; make: () => Item }> = [
  ...CRYSTAL_TIERS.map((t) => ({
    label: `Crystal T${t.tier}`,
    make: () => makeCrystal(t.tier),
  })),
  { label: 'Body Armour', make: () => makeGear('body_armour', 55, 'Runeplate') },
  { label: 'Ring', make: () => makeGear('ring', 40, 'Band of Ash') },
];

/** Facet colour by what the mod actually does. */
const TAG_COLOURS: Array<[string, string]> = [
  ['density', 'amethyst'],
  ['reward', 'citrine'],
  ['danger', 'ember'],
  ['layout', 'quartz'],
  ['damage', 'ember'],
  ['defence', 'quartz'],
  ['speed', 'verdite'],
  ['clear', 'verdite'],
  ['crit', 'citrine'],
  ['utility', 'verdite'],
];

function facetOf(mod: RolledMod): string {
  for (const [tag, colour] of TAG_COLOURS) {
    if (mod.tags.includes(tag)) return colour;
  }
  return 'quartz';
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function use(currency: CurrencyDef): void {
  const result = craft(item, currency, pool, rng);
  if (!result.ok) {
    log.unshift({ text: `${currency.name} — ${result.error}`, kind: 'fail' });
    render();
    return;
  }
  log.unshift({ text: currency.name, kind: 'note' });
  for (const entry of result.log) {
    const kind = entry.startsWith('-') ? 'remove' : 'add';
    log.unshift({ text: entry, kind });
  }
  item = result.item;
  render();
}

function loadBase(index: number): void {
  item = BENCH_ITEMS[index].make();
  focused = null;
  log.unshift({ text: `Loaded ${item.name}`, kind: 'note' });
  render();
}

function reseed(): void {
  seed = Math.floor(Math.random() * 1e9);
  rng = new Rng(seed);
  log.unshift({ text: `Seed ${seed}`, kind: 'note' });
  render();
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderBases(): void {
  const host = $('bases');
  host.replaceChildren();
  BENCH_ITEMS.forEach((base, i) => {
    const btn = el('button', 'chip', base.label) as HTMLButtonElement;
    if (base.label === item.name || item.name.startsWith(base.label)) {
      btn.classList.add('chip--on');
    }
    btn.onclick = () => loadBase(i);
    host.append(btn);
  });
}

function renderItem(): void {
  $('item-name').textContent = item.name;
  $('item-meta').textContent =
    `ilvl ${item.ilvl} · ${fillState(item)}` +
    (item.meta.corrupted ? ' · locked' : '');
  $('item-name').classList.toggle('locked', !!item.meta.corrupted);

  const host = $('sockets');
  host.replaceChildren();

  for (const slot of slotTypes(item)) {
    const group = el('div', 'slotgroup');
    const cap = slotCapacity(item, slot);
    group.append(el('div', 'slotgroup__label', `${slot} ${slotUsed(item, slot)}/${cap}`));

    const row = el('div', 'facets');
    const mods = item.mods.filter((m) => m.slot === slot);

    for (let i = 0; i < cap; i++) {
      const mod = mods[i];
      const facet = el('button', 'facet') as HTMLButtonElement;
      if (mod) {
        facet.classList.add('facet--set', `facet--${facetOf(mod)}`);
        facet.title = describeMod(mod);
        facet.setAttribute('aria-label', describeMod(mod));
        facet.onclick = () => {
          focused = focused === mod.entryId ? null : mod.entryId;
          render();
        };
        if (focused === mod.entryId) facet.classList.add('facet--focus');
        facet.append(el('span', 'facet__tier', `T${mod.tier}`));
      } else {
        facet.classList.add('facet--empty');
        facet.setAttribute('aria-label', `empty ${slot} slot`);
        facet.disabled = true;
      }
      row.append(facet);
    }
    group.append(row);
    host.append(group);
  }

  const list = $('modlist');
  list.replaceChildren();
  if (item.mods.length === 0) {
    list.append(el('p', 'empty', 'No modifiers. Use a currency to fill a slot.'));
  }
  for (const mod of item.mods) {
    const row = el('div', 'mod');
    if (focused === mod.entryId) row.classList.add('mod--focus');
    row.append(el('span', `dot dot--${facetOf(mod)}`));
    const body = el('div', 'mod__body');
    body.append(
      el(
        'div',
        'mod__stats',
        mod.stats
          .map((s) =>
            s.form === 'flat'
              ? `+${s.value} ${s.stat}`
              : `+${s.value}% ${s.form === 'inc' ? 'increased' : 'more'} ${s.stat}`
          )
          .join(', ')
      )
    );
    body.append(el('div', 'mod__name', `T${mod.tier} ${mod.name} · ${mod.slot}`));
    row.append(body);
    list.append(row);
  }
}

function renderCurrencies(): void {
  const host = $('currencies');
  host.replaceChildren();

  const classes = ['basic', 'uncommon', 'rare', 'exotic'] as const;
  for (const cls of classes) {
    const group = CURRENCIES.filter((c) => c.class === cls);
    if (group.length === 0) continue;
    host.append(el('div', 'shelf__label', cls));
    const grid = el('div', 'shelf');
    for (const currency of group) {
      const blocked = canApply(item, currency);
      const btn = el('button', `curr curr--${cls}`) as HTMLButtonElement;
      btn.append(el('span', 'curr__name', currency.name));
      btn.append(el('span', 'curr__desc', currency.description));
      if (blocked) {
        btn.disabled = true;
        btn.classList.add('curr--off');
        btn.append(el('span', 'curr__why', blocked));
      }
      btn.onclick = () => use(currency);
      grid.append(btn);
    }
    host.append(grid);
  }
}

function renderLog(): void {
  const host = $('log');
  host.replaceChildren();
  if (log.length === 0) {
    host.append(el('p', 'empty', 'Craft something and the history shows up here.'));
  }
  for (const entry of log.slice(0, 60)) {
    host.append(el('div', `logline logline--${entry.kind}`, entry.text));
  }
}

function render(): void {
  renderBases();
  renderItem();
  renderCurrencies();
  renderLog();
  $('seed').textContent = String(seed);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

($('reseed') as HTMLButtonElement).onclick = reseed;
($('clear') as HTMLButtonElement).onclick = () => {
  log = [];
  render();
};

log.unshift({ text: `Seed ${seed}`, kind: 'note' });
render();
