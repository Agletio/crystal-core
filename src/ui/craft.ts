/**
 * THE BENCH, and it SELECTS. Under the item is every line it could still take:
 * the tier, what the level's window would roll, and the shards it costs against
 * the shards you hold. The bench holds exactly one item; putting a second down
 * returns the first.
 *
 * A CRYSTAL is the one thing here that still rolls, and a Shard of Making is
 * what rolls it.
 */
import { Rng } from '../rng';
import { ModPool, freeSocket, hasOpenSlot, modCapacity, tierName, socketsOf } from '../mods';
import {
  addRange,
  choices,
  costOf,
  describeMod,
  describeSocket,
  placeMod,
  raiseMod,
  raises,
  rollCrystal,
  tierRank,
  whyNotChoose,
  whyNotRaise,
  windowRange,
} from '../crafting';
import type { Placed } from '../crafting';
import { ALL_MODS, CURRENCY_BY_ID, INSTABILITY, PROFESSION_BY_ID, SHARD_BY_ID } from '../data';
import { professionAt } from '../game/work';
import { statParts } from '../mod-text';
import { balance, spend } from '../economy';
import { craftItem, clearCraft, replaceItem, selectForCraft } from '../game/state';
import type { GameState } from '../game/state';
import { EQUIP_SLOTS } from '../data';
import { currencyIcon, gearIcon, itemIcon } from './icons';
import {
  consumeDrag,
  pressItem,
  renderInventory,
  setCurrencyHandler,
  setInventoryHandler,
} from './inventory';
import { note } from './history';
import { attachTooltip, hideTooltip } from './tooltip';
import { crystalFamily, rewardRows } from '../sim/crystal';
import { grantLines, grantSaid, itemCard, statLines } from './itemcard';
import { keywordLine } from './glossary';
import { crystalProgress } from '../game/crystals';
import { crystalsIn, socketed } from '../game/state';
import { CRYSTAL_SLOTS, FAMILY_BY_ID } from '../data';
import type { CurrencyDef, Item, ModEntry, RolledMod, Socket } from '../types';

const pool = new ModPool(ALL_MODS);
let seed = Math.floor(Math.random() * 1e9);
let rng = new Rng(seed);
let game: GameState;
let focused: number | null = null; // the socket the pick list is about
const opened = new Set<string>(); // shard groups unfolded in the pick list

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

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * THE ONE ROLL LEFT. A crystal's rules are its difficulty, so choosing them
 * would let a build take the cheapest danger for the richest payment.
 */
function roll(currency: CurrencyDef): void {
  const item = craftItem(game);
  if (!item) return;

  if (balance(game.wallet, currency.id) < 1) {
    note(`${currency.name} — none owned`, 'fail');
    render();
    return;
  }

  const result = rollCrystal(item, pool, rng);
  if (!result.ok) {
    // A refused roll costs nothing — the shard is only spent on a change.
    note(`${currency.name} — ${result.error}`, 'fail');
    render();
    return;
  }

  spend(game.wallet, { [currency.id]: 1 });
  note(currency.name, 'note');
  for (const entry of result.log) note(entry, 'add');
  // The item keeps its id, so it swaps back into the same socket and stays
  // selected.
  replaceItem(game, result.item);
  render();
  onChanged?.();
}

/** The one profession the bench reads, whatever the piece is made of. */
const benchLevel = (): number => professionAt(game, INSTABILITY.bench).level;
const held = (id: string): number => balance(game.wallet, id);
const plans = (): string[] => game.character.plans ?? [];

/** What a placement or a raise came to, said once: the line that landed and
 *  what it cost the socket, or the socket giving way. */
function landed(done: Placed, was: string): void {
  const socket = socketsOf(done.item)[done.socket];
  if (done.fractured) {
    note(`Socket ${done.socket + 1} fractured after gaining ${done.added} instability: ${was} was lost; the shards were spent`, 'fail');
  } else {
    const mod = done.item.mods.find((m) => m.socket === done.socket);
    note(`+ ${mod ? describeMod(mod) : was} · +${done.added}, ${describeSocket(socket)}`, 'add');
  }
  replaceItem(game, done.item);
  render();
  onChanged?.();
}

/** PUT A LINE ON, at its worst tier. Refuses before it spends, and says the number. */
function choose(entry: ModEntry): void {
  const item = craftItem(game);
  if (!item) return;
  const why = whyNotChoose(item, entry, benchLevel(), held, plans());
  if (why) {
    note(why, 'fail');
    return;
  }
  const { shard, n } = costOf(entry);
  spend(game.wallet, { [shard!]: n });
  landed(placeMod(item, entry, benchLevel(), rng), `T${entry.tier} ${entry.name}`);
}

/** RAISE A LINE a tier, in its own socket. */
function raise(mod: RolledMod): void {
  const item = craftItem(game);
  if (!item) return;
  const why = whyNotRaise(item, mod, benchLevel(), held, plans(), pool);
  if (why) {
    note(why, 'fail');
    return;
  }
  const { shard, n } = costOf({ defId: mod.defId, tier: mod.tier - 1 });
  spend(game.wallet, { [shard!]: n });
  landed(raiseMod(item, mod, benchLevel(), rng, pool), `T${mod.tier} ${mod.name}`);
}

function reseed(): void {
  seed = Math.floor(Math.random() * 1e9);
  rng = new Rng(seed);
  note(`Seed ${seed}`);
  render();
}

/** The socket the list opens on: the first empty live one, else the first held. */
function defaultSocket(item: Item): number | null {
  const free = freeSocket(item);
  if (free >= 0) return free;
  const held = item.mods.find((m) => m.socket !== undefined);
  return held?.socket ?? null;
}

function pickSocket(i: number): void {
  focused = i;
  render();
}

/** A held line in its socket: the stats, then the tier, the slot and the wear. */
function modRow(item: Item, mod: RolledMod, at: number): HTMLElement {
  const socket = socketsOf(item)[at];
  const row = el(at >= 0 ? 'button' : 'div', 'mod mod--socket');
  if (mod.chosen) row.classList.add('mod--chosen');
  if (at >= 0 && focused === at) row.classList.add('mod--focus');
  row.append(el('span', `dot dot--${facetOf(mod)}`));
  const b = el('div', 'mod__body');
  // The shared stat row, not a local format. This screen once built its own
  // text out of the raw stat KEY, so the one place you look hardest at an
  // item was the one place printing "+14 coldRes" — the exact leak the mods
  // check exists to catch, in the exact spot it does not look.
  const stats = el('div', 'mod__stats');
  stats.append(...statLines(mod), ...grantLines(mod));
  b.append(stats);
  const foot = el('div', 'mod__name', `T${mod.tier} ${mod.name} · ${mod.slot}`);
  if (socket) foot.append(wearMark(socket));
  b.append(foot);
  row.append(b);
  if (at >= 0) {
    row.id = socketRowId(at);
    row.onclick = () => pickSocket(at);
  }
  return row;
}

/** An empty or fractured socket, drawn where the line would be. */
function emptyRow(item: Item, at: number): HTMLElement {
  const socket = socketsOf(item)[at];
  const row = el('button', 'mod mod--socket mod--empty');
  if (socket.dead) row.classList.add('mod--dead');
  if (focused === at) row.classList.add('mod--focus');
  row.id = socketRowId(at);
  row.append(el('span', socket.dead ? 'dot dot--dead' : 'dot dot--hollow'));
  const b = el('div', 'mod__body');
  b.append(el('div', 'mod__stats mod__stats--empty', socket.dead ? 'Fractured' : 'Empty socket'));
  const foot = el('div', 'mod__name');
  const mark = wearMark(socket);
  mark.classList.add('wear--alone');
  foot.append(mark);
  b.append(foot);
  row.append(b);
  row.onclick = () => pickSocket(at);
  return row;
}

/** `9/22 instability`, the figure lit; a fractured socket in the hurt ink. */
function wearMark(socket: Socket): HTMLElement {
  const mark = el('span', socket.dead ? 'wear wear--dead' : 'wear');

  mark.append(el('span', 'wear__v', socket.dead ? 'fractured' : `${socket.wear}/${socket.cap}`));
  if (!socket.dead) mark.append(el('span', 'wear__k', 'instability'));
  return mark;
}

/** One socket's row, so a harness can click it by number. */
export const socketRowId = (at: number): string => `bench-socket-${at}`;

function renderItem(): void {
  const item = craftItem(game);

  const empty = $('craft-empty');
  const body = $('craft-item');
  empty.hidden = !!item;
  body.hidden = !item;
  $('craft-picks').hidden = !item || item.kind !== 'gear';
  ($('craft-return') as HTMLButtonElement).disabled = !item;

  if (!item) return;

  const worn = EQUIP_SLOTS.find((s) => game.character.equipment[s.id]?.id === item.id);
  $('item-name').textContent = item.name;
  // The ladder first: it is the whole of how much the item can hold, and the
  // only thing that moves it is finding a better base.
  $('item-meta').textContent =
    `${tierName(item)} · ilvl ${item.ilvl} · ` +
    `${item.mods.length}/${modCapacity(item)} ${item.kind === 'gear' ? 'sockets' : 'modifiers'}` +
    // A chosen line is live against something you are wearing, and the sheet
    // moves under you when it lands.
    (worn ? ` · worn, ${worn.name.toLowerCase()}` : '');

  // What this crystal is worth, right under its name — the mods below say
  // what makes it dangerous, this says what the danger buys.
  const multipliers = $('item-rewards');
  multipliers.replaceChildren();
  multipliers.hidden = item.kind !== 'crystal';
  if (item.kind === 'crystal') {
    for (const row of rewardRows(item)) {
      const chip = el('span', 'mult');
      chip.append(el('span', 'mult__k', row.label));
      chip.append(el('span', 'mult__v', row.value));
      multipliers.append(chip);
    }
  }

  const list = $('modlist');
  list.replaceChildren();

  // Implicits first and visibly separate — they're part of the base, not
  // something you rolled, and no craft can touch them.
  for (const imp of item.implicits) {
    const row = el('div', 'mod mod--implicit');
    row.append(el('span', 'dot dot--citrine'));
    const b = el('div', 'mod__body');
    const stats = el('div', 'mod__stats');
    stats.append(...statLines(imp), ...grantLines(imp));
    b.append(stats);
    b.append(
      el(
        'div',
        'mod__name',
        item.meta.grafted !== undefined ? "grafted implicit" : "base implicit"
      )
    );
    row.append(b);
    list.append(row);
  }

  // ONE ROW A SOCKET, empty ones included, and CLICKING ONE is what the pick
  // list is about: a held line's raise, an empty socket's every line.
  const sockets = socketsOf(item);
  if (item.kind === 'crystal') {
    for (const mod of item.mods) list.append(modRow(item, mod, -1));
    if (item.mods.length === 0) list.append(el('p', 'empty', modCapacity(item) > 0 ? 'No modifiers.' : "Level up this crystal to unlock a modifier slot."));
  } else {
    if (focused === null || focused >= sockets.length) focused = defaultSocket(item);
    sockets.forEach((socket, i) => {
      const mod = item.mods.find((m) => m.socket === i);
      list.append(mod ? modRow(item, mod, i) : emptyRow(item, i));
    });
    if (sockets.length === 0) list.append(el('p', 'empty', 'No sockets.'));
  }

  renderPicks(item);
}

/**
 * WHAT MAY GO INTO THE SOCKET YOU PICKED. A held line offers its RAISE; an
 * empty one offers every line the piece could still take, grouped under the
 * shard that buys it and folded shut until you open the group — *"so you're
 * not seeing 50000 mods"* — a folded group saying what it holds. A row you
 * cannot take is DIMMED rather than hidden, and carries the number that is
 * short.
 */
function renderPicks(item: Item): void {
  const host = $('craft-pick');
  host.replaceChildren();
  const line = $('craft-level');

  if (item.kind !== 'gear') {
    line.hidden = true;
    return;
  }

  const level = benchLevel();
  const who = PROFESSION_BY_ID[INSTABILITY.bench]?.name ?? 'Jewelling';
  const [lo, hi] = addRange(level);
  line.hidden = false;
  line.textContent = `${who} ${level} · new modifier: +${lo}–${hi} instability`;

  const at = focused ?? defaultSocket(item);
  const socket = at === null ? undefined : socketsOf(item)[at];
  if (at === null || !socket) {
    host.append(el('p', 'empty', "No sockets available."));
    return;
  }
  host.append(legend());
  if (socket.dead) {
    host.append(el('p', 'empty', `Socket ${at + 1} is fractured and cannot hold a modifier.`));
    return;
  }
  const held = item.mods.find((m) => m.socket === at);
  if (held) {
    host.append(el('div', 'slotgroup__label', `socket ${at + 1} · upgrade modifier`));
    const up = raises(item, pool).find((r) => r.mod === held);
    if (up) host.append(pickRow(item, up.entry, level, held));
    else host.append(el('p', 'empty', `T${held.tier} is the best tier for ${held.name}.`));
    return;
  }

  host.append(el('div', 'slotgroup__label', `socket ${at + 1} · add modifier`));
  const entries = [...choices(item, pool)].sort(
    (a, b) =>
      (costOf(a).shard ?? '').localeCompare(costOf(b).shard ?? '') ||
      a.slot.localeCompare(b.slot) ||
      a.defId.localeCompare(b.defId)
  );
  if (entries.length === 0) {
    host.append(el('p', 'empty', "No compatible modifiers available."));
    return;
  }
  let shard = '';
  for (const entry of entries) {
    const buys = costOf(entry).shard ?? '';
    if (buys !== shard) {
      shard = buys;
      host.append(shardHead(shard, entries.filter((e) => costOf(e).shard === shard)));
    }
    if (opened.has(shard)) host.append(pickRow(item, entry, level));
  }
}

/** What the columns are, said once over the list rather than on every row. */
function legend(): HTMLElement {
  const row = el('div', 'picklegend');
  row.append(el('span', 'craftpick__tier', 'tier'));
  row.append(el('span', 'craftpick__what', 'line'));
  row.append(el('span', 'craftpick__add', 'instability'));
  row.append(el('span', 'craftpick__cost', 'shards'));
  return row;
}

/** A shard's group head: a fold, the icon, the name, what you hold — and shut,
 *  the lines it buys, so a folded group is not a mystery. */
function shardHead(shard: string, holds: ModEntry[]): HTMLElement {
  const def = CURRENCY_BY_ID[shard];
  const open = opened.has(shard);
  const head = el('button', 'picklist__shard') as HTMLButtonElement;
  head.id = `bench-shard-${shard}`;
  head.append(el('span', 'picklist__fold', open ? '▾' : '▸'));
  if (def) head.append(currencyIcon(def, 16));
  head.append(el('span', 'picklist__name', def?.name ?? shard));
  head.append(el('span', 'picklist__held', String(balance(game.wallet, shard))));
  head.onclick = () => {
    if (open) opened.delete(shard);
    else opened.add(shard);
    render();
  };
  if (open) return head;
  const wrap = el('div');
  wrap.append(head);
  // WHAT THE FAMILY DOES, not a list of its names: folded shut, a run of
  // modifier names says nothing a player can act on.
  wrap.append(el('div', 'picklist__buys', `${holds.length} modifiers · ${SHARD_BY_ID[shard]?.does ?? ''}`));
  return wrap;
}

/** The stat line as the WINDOW would roll it, not the tier's whole range: the
 *  number a player acts on is the one they will get. Split rather than
 *  string-replaced, or a range whose figure appears twice comes out mangled.
 *  A LINE WHOSE WHOLE EFFECT IS A SWITCH has no stat to put a window round —
 *  +1 Projectile is a rung, not a range — so it says the switch instead. */
function windowed(entry: ModEntry, level: number, i = 0): { value: string; label: string } {
  const st = entry.stats[i];
  if (!st) return { value: '', label: grantSaid(entry).join(', ') };
  const [a, b] = windowRange(entry, level, i);
  const top = statParts({ ...st, value: b, tags: st.tags ?? [] });
  const low = statParts({ ...st, value: a, tags: st.tags ?? [] });
  return { value: a === b ? top.value : `${low.value}–${top.value.replace(/^\+/, '')}`, label: top.label };
}

/** One row: a placement of `entry`, or with `from` a raise of that line to it. */
function pickRow(item: Item, entry: ModEntry, level: number, from?: RolledMod): HTMLButtonElement {
  const why = from
    ? whyNotRaise(item, from, level, held, plans(), pool)
    : whyNotChoose(item, entry, level, held, plans());
  const { shard, n } = costOf(entry);
  const has = shard ? balance(game.wallet, shard) : 0;
  const [lo, hi] = addRange(level, tierRank(entry));
  const socket = socketsOf(item)[from ? from.socket ?? -1 : freeSocket(item)];

  const row = el('button', 'craftpick') as HTMLButtonElement;
  row.append(el('span', 'craftpick__tier', from ? `T${from.tier}→${entry.tier}` : `T${entry.tier}`));
  const what = windowed(entry, level);
  const said = el('span', 'craftpick__what');
  if (what.value) said.append(el('span', 'craftpick__v', what.value), ' ');
  said.append(what.label);
  row.append(said);
  const add = el('span', 'craftpick__add');
  add.append(el('span', 'craftpick__v', `+${lo}–${hi}`));
  row.append(add);
  const cost = el('span', 'craftpick__cost');
  if (shard) cost.append(currencyIcon(CURRENCY_BY_ID[shard]!, 14));
  cost.append(el('span', 'craftpick__n', `${n}`));
  if (has < n) cost.classList.add('craftpick__cost--short');
  row.append(cost);

  const name = SHARD_BY_ID[shard ?? '']?.name ?? 'shard';
  attachTooltip(row, () => pickCard(entry, level, from, socket, why, has));

  if (why) {
    // REFUSED, NEVER DISABLED: a disabled button raises no mouse event at all,
    // so the one row whose card has to say WHY was the one that never drew it.
    row.classList.add('craftpick--off');
    row.setAttribute('aria-disabled', 'true');
    row.setAttribute('aria-label', `${entry.name} tier ${entry.tier} — ${why}`);
    row.onclick = () => note(why, 'fail');
  } else if (from) {
    row.onclick = () => raise(from);
    row.setAttribute('aria-label', `Raise ${entry.name} to tier ${entry.tier} for ${n} ${name}`);
  } else {
    row.onclick = () => choose(entry);
    row.setAttribute('aria-label', `Add ${entry.name} tier ${entry.tier} for ${n} ${name}`);
  }
  return row;
}

/** THE CARD BEHIND A ROW: the line as it would roll, the shards against what
 *  you hold, the instability against the socket, and the one thing a click
 *  does — figures lit, keywords marked, and the refusal in its own ink. */
function pickCard(
  entry: ModEntry,
  level: number,
  from: RolledMod | undefined,
  socket: Socket | undefined,
  why: string | null,
  has: number
): HTMLElement {
  const { shard, n } = costOf(entry);
  const [lo, hi] = addRange(level, tierRank(entry));
  const card = el('div', 'tip__card tip__card--node');
  const head = el('div', 'tip__name', entry.name);
  head.append(el('span', `tip__state${why ? '' : ' tip__state--open'}`, from ? `T${from.tier} → T${entry.tier}` : `tier ${entry.tier}`));
  card.append(head);
  // WHY FIRST when there is a why: it is the question the hover was asking.
  if (why) card.append(el('div', 'tip__note tip__note--why', why));
  const lines = entry.stats.length === 0 ? [windowed(entry, level)] : entry.stats.map((_, i) => windowed(entry, level, i));
  for (const what of lines) {
    const row = el('div', 'rolled tip__body');
    if (what.value) row.append(el('span', 'rolled__v', what.value));
    row.append(keywordLine(what.label, 'rolled__k'));
    card.append(row);
  }
  const fact = (key: string, value: string, rest: string, tone = ''): void => {
    const row = el('div', 'tip__body tip__fact');
    row.append(el('span', 'tip__key', key));
    row.append(el('span', `rolled__v${tone}`, value));
    if (rest) row.append(el('span', 'rolled__k', ` ${rest}`));
    card.append(row);
  };
  const def = CURRENCY_BY_ID[shard ?? ''];
  fact('shards', `${n} ${def?.name ?? 'shard'}`, `· you hold ${has}`, has < n ? ' rolled__v--short' : '');
  fact('instability', `+${lo} to ${hi}`, socket ? `· socket at ${socket.dead ? 'fractured' : `${socket.wear} of ${socket.cap}`}` : '');
  if (socket && !socket.dead) {
    const room = socket.cap - socket.wear;
    const odds = hi <= room ? 'never' : lo > room ? 'always' : `${Math.round(((hi - room) / (hi - lo + 1)) * 100)}% chance`;
    fact(
      'fracture',
      odds,
      odds === 'never' ? "— safe at any roll" : odds === 'always' ? "— socket will be destroyed" : '',
      odds === 'never' ? '' : ' rolled__v--short'
    );
  }
  if (!why) {
    card.append(el('div', 'tip__note', from ? "— click to upgrade" : "— click to add"));
  }
  return card;
}

/** Id of one crystal's button beside the bench, so the guide can ring it. */
export const crystalSlotId = (itemId: string): string => `bench-${itemId}`;

/** Said in one place, because it is said twice: on a crystal, and under them. */
const WHY_SHUT = `Crystal crafting unlocks once you own all ${CRYSTAL_SLOTS.length} crystals.`;

/**
 * Every crystal you own, beside the bench. They are never carried, so the dock
 * cannot hand one over and this column is the only way one gets worked on.
 * Socketed ones are in here too: a socket is where a crystal LIVES, and taking
 * it out to add a modifier would cost the run it is already set up for.
 */
function renderCrystals(): void {
  const host = $('craft-crystals');
  host.replaceChildren();
  const grid = el('div', 'worn__grid');

  const worn = socketed(game);
  const all = [...worn, ...crystalsIn(game)];
  for (const item of all) {
    const family = FAMILY_BY_ID[crystalFamily(item)];
    const btn = el('button', 'wornslot') as HTMLButtonElement;
    btn.id = crystalSlotId(item.id);
    btn.append(itemIcon(item, 22));
    const body = el('span', 'wornslot__body');
    // The family, not the full name: the level is on the line under it, so
    // "Level 2 Demonic Crystal" spends the whole row saying it twice and then
    // runs out of room to say either.
    body.append(el('span', 'wornslot__name', `${family?.word || 'Normal'} Crystal`));
    body.append(
      el(
        'span',
        'wornslot__slot',
        `lv ${crystalProgress(item).level}${worn.includes(item) ? ' · socketed' : ''}`
      )
    );
    btn.append(body);
    if (item.id === game.craftId) btn.classList.add('wornslot--on');

    attachTooltip(btn, () => itemCard(item, ['click to open on the bench']));
    btn.setAttribute('aria-label', `Open on bench: ${item.name}`);
    btn.onclick = () => {
      if (!consumeDrag()) bench(item);
    };
    grid.append(btn);
  }

  if (all.length === 0) {
    grid.append(el('p', 'worn__hint', 'None yet.'));
  }
  host.append(grid);
}

/** Opens a worn piece on the bench. It never comes off to be worked on. */
function bench(item: Item): void {
  selectForCraft(game, item);
  focused = null;
  note(`Bench: ${item.name}`);
  render();
}

/**
 * What you are wearing, beside the bench. Improving worn gear otherwise meant
 * the sheet to take it off, the dock to bench it, and the sheet again to put
 * it back on — three screens to spend one shard.
 *
 * Empty slots are drawn too: they are where a dragged piece lands.
 */
function renderWorn(): void {
  const host = $('craft-worn');
  host.replaceChildren();
  const grid = el('div', 'worn__grid');

  // A TOOL HOLDS NO MODIFIER SLOT, so its square here would never take a
  // currency: the bench shows what can be crafted on and nothing else.
  for (const slot of EQUIP_SLOTS.filter((s) => s.group !== 'tool')) {
    const item = game.character.equipment[slot.id];
    const btn = el('button', 'wornslot') as HTMLButtonElement;
    btn.dataset.equip = slot.id;

    if (!item) {
      btn.classList.add('wornslot--bare');
      btn.append(el('span', 'wornslot__slot', slot.name));
      btn.disabled = true;
      btn.setAttribute('aria-label', `${slot.name} — empty`);
      grid.append(btn);
      continue;
    }

    btn.append(gearIcon((item.meta.art as string) ?? 'body', 22));
    const body = el('span', 'wornslot__body');
    body.append(el('span', 'wornslot__name', item.name));
    body.append(el('span', 'wornslot__slot', slot.name));
    btn.append(body);
    if (item.id === game.craftId) btn.classList.add('wornslot--on');

    attachTooltip(btn, () => itemCard(item, [`worn, ${slot.name.toLowerCase()}`, 'click to open on the bench']));
    btn.setAttribute('aria-label', `Open on bench: ${item.name}`);
    btn.onclick = () => {
      if (!consumeDrag()) bench(item);
    };
    btn.addEventListener('pointerdown', (e) =>
      pressItem(e as PointerEvent, btn, item, () => bench(item))
    );
    grid.append(btn);
  }
  host.append(grid);
}

export function render(): void {
  // Re-rendering removes whatever the cursor was over; a tooltip bound to a
  // detached element would otherwise sit there forever.
  hideTooltip();
  renderCrystals();
  renderWorn();
  renderItem();
  $('seed').textContent = String(seed);
  // A shard's count is what the pick list is read against, so the dock redraws
  // whenever the bench does.
  renderInventory();
}

/**
 * Clicking an inventory item opens it on the bench. It stays in the list,
 * highlighted — the selection is a reference, not a move.
 */
function itemHandler() {
  return {
    actionFor: (item: Item) => ({ label: 'Open on bench', run: () => bench(item) }),
    highlighted: (item: Item) => item.id === game.craftId,
  };
}

/**
 * What a shard in the dock does when you click it. A shard is a COST rather
 * than a thing you apply, so the click opens the bench where it is spent; the
 * crystal's own shard is the exception, and rolls a benched crystal outright.
 */
function currencyHandler() {
  return {
    actionFor: (currency: CurrencyDef) => {
      const item = craftItem(game);
      if (currency.crystal && item?.kind === 'crystal' && hasOpenSlot(item)) {
        return {
          label: `use on ${item.name}`,
          run: () => {
            openCraft();
            roll(currency);
          },
        };
      }
      return {
        label: 'open the bench',
        run: () => {
          openCraft();
          render();
        },
      };
    },
    blocked: (currency: CurrencyDef) => {
      if (!currency.crystal) return null;
      const item = craftItem(game);
      if (!item) return null;
      if (item.kind !== 'crystal') return "Use a Shard of Making on a crystal.";
      return hasOpenSlot(item) ? null : 'No open slot.';
    },
  };
}

/**
 * The bench is a popup over the map, not a page you leave for.
 *
 * A run keeps going behind it, so the crystal you're crafting can be paid for
 * by the map you're still clearing — and the dock stays uncovered, because
 * clicking something in it is how anything gets onto the bench at all, and
 * how every currency gets spent.
 */
let onClosed: (() => void) | null = null;
/** A craft can land on something you are wearing, and stats move when it does. */
let onChanged: (() => void) | null = null;

export function openCraft(): void {
  $('craft').hidden = false;
  setInventoryHandler(itemHandler());
  render();
}

export function closeCraft(): void {
  $('craft').hidden = true;
  hideTooltip();
  onClosed?.();
}

export const isCraftOpen = (): boolean => !$('craft').hidden;

/** Redraws if it is up, for an equip made somewhere else — the worn column moved. */
export function refreshCraft(): void {
  if (isCraftOpen()) render();
}

export function initCraft(state: GameState, closed: () => void, changed?: () => void): void {
  game = state;
  onClosed = closed;
  onChanged = changed ?? null;

  ($('reseed') as HTMLButtonElement).onclick = reseed;
  ($('craft-close') as HTMLButtonElement).onclick = closeCraft;
  ($('craft-return') as HTMLButtonElement).onclick = () => {
    const item = craftItem(game);
    if (!item) return;
    note(`Closed ${item.name}`);
    clearCraft(game);
    render();
  };

  setCurrencyHandler(currencyHandler());
  note(`Seed ${seed}`);
  render();
}
