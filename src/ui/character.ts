/**
 * The character sheet, as a modal — reference you consult while socketing a
 * crystal or crafting gear, which navigating to a screen would prevent.
 *
 * A filled slot takes the item off; an empty one lights up everything in the
 * DOCK that fits, which is where your gear already is. Worn items live here
 * rather than in the dock, which is safe because this screen shows them.
 */
import { DAMAGE_TYPES, DAMAGE_TYPE_BY_ID, DEFENCE, EQUIP_SLOTS, SKILLS } from '../data';
import { describeMod } from '../crafting';
import { characterStats, damageDetail } from '../sim/stats';
import { damageWorkings } from '../damage-text';
import { tagWord } from '../mod-text';
import { xpToNext } from '../sim/character';
import { fitsSlot, unequipItem } from '../game/state';
import { wear } from './wear';
import type { GameState } from '../game/state';
import { gearIcon } from './icons';
import { note } from './history';
import { attachTooltip, hideTooltip } from './tooltip';
import { slotButtonId } from './tutorial';
import { setInventoryHandler } from './inventory';
import type { EquipSlotDef, Item } from '../types';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let game: GameState;
/** Slot currently being filled. Drives what lights up in the dock. */
let picking: string | null = null;
/** Which stat row is unfolded. Only one, and it survives a redraw. */
let openStat: string | null = null;
let onChanged: (() => void) | null = null;
/** Hands the dock back to whatever is underneath when this closes. */
let onClosed: (() => void) | null = null;

function tooltip(item: Item): string {
  if (item.mods.length === 0) return `${item.name} — no modifiers`;
  const rating = item.armour ? [`Armour ${item.armour}`] : [];
  return [item.name, ...rating, ...item.mods.map((m) => describeMod(m))].join('\n');
}

function renderSlots(): void {
  const host = $('sheet-slots');
  host.replaceChildren();

  for (const slot of EQUIP_SLOTS) {
    const worn = game.character.equipment[slot.id];
    const cell = el('div', 'slotcell');
    cell.append(el('div', 'slotcell__label', slot.name));

    const btn = el('button', 'slotcell__btn') as HTMLButtonElement;
    // Stable id so the guided opening can point at one slot rather than the
    // grid. The demo asserts every step's target exists.
    btn.id = slotButtonId(slot.id);
    if (worn) {
      btn.append(gearIcon((worn.meta.art as string) ?? 'body', 30));
      const body = el('span', 'slotcell__body');
      body.append(el('span', 'slotcell__name', worn.name));
      body.append(
        el('span', 'slotcell__meta', `${worn.mods.length} mod${worn.mods.length === 1 ? '' : 's'}`)
      );
      btn.append(body);
      attachTooltip(btn, () => tooltip(worn));
      btn.classList.add('slotcell__btn--worn');
      btn.onclick = () => {
        // Taking something off is a net addition to the bag, so it can be
        // refused. Silently doing nothing would read as a broken button.
        if (!unequipItem(game, slot.id)) {
          note(`No room to carry ${worn.name} — your gear is full`, 'fail');
          return;
        }
        note(`Took off ${worn.name}`);
        picking = null;
        render();
      };
    } else {
      btn.append(
        el(
          'span',
          'slotcell__empty',
          picking === slot.id ? 'pick one below' : 'empty'
        )
      );
      btn.classList.toggle('slotcell__btn--picking', picking === slot.id);
      btn.onclick = () => {
        picking = picking === slot.id ? null : slot.id;
        render();
      };
    }
    cell.append(btn);
    host.append(cell);
  }
}

/**
 * What the dock does while the sheet is open. With no slot picked nothing is
 * actionable — a live-looking button that does nothing is worse than a dim one.
 */
function sheetHandler() {
  const slot: EquipSlotDef | undefined = EQUIP_SLOTS.find((s) => s.id === picking);
  return {
    actionFor: (item: Item) => {
      if (!slot || !fitsSlot(item, slot)) return null;
      return {
        label: `Wear as ${slot.name.toLowerCase()}`,
        run: () => {
          picking = null;
          wear(game, item, slot.id);
          render();
        },
      };
    },
    highlighted: (item: Item) => !!slot && fitsSlot(item, slot),
  };
}

/** Says what picking a slot did, since the answer is now outside this window. */
function renderPickHint(): void {
  const host = $('sheet-pick');
  const slot = EQUIP_SLOTS.find((s) => s.id === picking);
  host.hidden = !slot;
  if (!slot) return;

  const options = game.inventory.filter((i) => fitsSlot(i, slot));
  host.textContent =
    options.length === 0
      ? `Nothing you are carrying fits the ${slot.name.toLowerCase()} slot.`
      : `${options.length} in your dock fit${options.length === 1 ? 's' : ''} the ${slot.name.toLowerCase()} slot — they are lit up below.`;
}

const round = (n: number) => Math.round(n).toString();

/**
 * The damage number, taken apart. Every line here is derived from the same
 * pass the sim runs, so the sheet cannot describe a rule the fight does not
 * follow.
 */
function damagePanel(): HTMLElement {
  const detail = damageDetail(game.character);
  const { breakdown } = detail;
  const box = el('div', 'statdetail');
  const nameOf = (id: string) => DAMAGE_TYPE_BY_ID[id]?.name ?? id;

  for (const part of breakdown.parts) {
    const row = el('div', `dmgrow${part.total === 0 ? ' dmgrow--nil' : ''}`);
    row.append(el('span', 'dmgrow__n', part.total === 0 ? '0' : round(part.total)));
    row.append(el('span', 'dmgrow__t', nameOf(part.type)));
    row.append(
      el(
        'span',
        'dmgrow__how',
        part.total === 0
          ? `nothing tagged ${nameOf(part.type)} for it to scale`
          : damageWorkings(part, breakdown.steps)
      )
    );
    box.append(row);
  }

  const sum = el('p', 'dmgsum');
  const dealt = nameOf(breakdown.dealtAs);
  const mixed = breakdown.parts.some((p) => p.total > 0 && p.type !== breakdown.dealtAs);

  const line = (html: string) => {
    const p = el('div');
    // Written across source lines, read as one sentence. HTML collapses the
    // ragged whitespace on screen but textContent keeps it, and textContent is
    // what a screen reader says out loud.
    p.innerHTML = html.replace(/\s+/g, ' ').trim();
    sum.append(p);
  };
  const b = (t: string) => `<b>${t}</b>`;

  line(`All ${b(round(breakdown.total))} of it lands as ${b(dealt)}.`);
  // The question the tags invite and the numbers never answer on their own.
  if (mixed) {
    line(`A skill deals its own type whatever scaled it — the parts above are
          how much got through, not what you are hitting with.`);
  }
  // The question the breakdown cannot answer by itself: gear whose damage never
  // reaches a pass leaves no row, so equipping a mace to cast with looks like
  // the sheet ignoring you.
  if (detail.excluded.flat > 0) {
    const needs = detail.excluded.needs.map((t) => tagWord(t) ?? t).join(' and ');
    line(
      `${b(`+${round(detail.excluded.flat)}`)} flat damage on your gear needs
       ${b(needs)}, which ${detail.skill.name} is not — it is
       ${b(detail.skill.tags.join(', '))}.`
    );
  }
  if (detail.seconds > 0) {
    line(
      `Applied over ${b(`${detail.seconds}s`)}, up to ${b(String(detail.maxStacks))} stacks
       on one enemy. Damage over time is reduced by ${dealt} resistance and
       ${b('never by armour')}.`
    );
  } else {
    line(`One hit, reduced by ${dealt} resistance and then by armour.`);
  }
  box.append(sum);
  return box;
}

interface StatRow {
  key: string;
  value: string;
  /** Shown small beside the value: what the number is counted in. */
  unit?: string;
  why?: string;
  detail?: () => HTMLElement;
}

function renderStats(): void {
  const s = characterStats(game.character);
  const detail = damageDetail(game.character);
  const host = $('sheet-stats');
  host.replaceChildren();

  const cast = detail.skill.tags.includes('spell');
  const rows: StatRow[] = [
    { key: 'life', value: round(s.maxLife) },
    {
      key: 'damage',
      value: round(detail.perApplication),
      unit: detail.seconds > 0 ? 'per cast' : cast ? 'per cast' : 'per hit',
      detail: damagePanel,
    },
    {
      key: cast ? 'casts/sec' : 'attacks/sec',
      value: s.attacksPerSecond.toFixed(2),
      why: cast
        ? 'Cast speed. A spell is not made faster by a sharper sword.'
        : 'Attack speed, times the skill’s own rate.',
    },
    {
      key: 'damage/sec',
      value: round(detail.perSecond),
      why:
        detail.seconds > 0
          ? 'Sustained on ONE enemy, stacks and all. A cloud caught on a pack is worth several times this.'
          : 'Damage times rate. Before resistance, armour and crit.',
    },
    { key: 'crit chance', value: `${Math.round(s.critChance)}%` },
    {
      key: 'crit damage',
      value: `×${(2 + s.critMultiplier / 100).toFixed(2)}`,
      why: 'A crit doubles, and crit multiplier is added on top of that. Poison ticks roll it too.',
    },
    { key: 'move speed', value: s.moveSpeed.toFixed(1), unit: 'tiles/s' },
    // Armour shows points AND what they're worth — the whole reason it curves
    // on points rather than on hit size is that this number can be stated.
    {
      key: 'armour',
      value: `${Math.round(s.armour)} (${s.armourReduction.toFixed(0)}%)`,
      why: `Against hits only, capped at ${DEFENCE.armourCap}%. Damage over time goes straight through it.`,
    },
    { key: 'regen/sec', value: s.lifeRegen.toFixed(1) },
    { key: 'reach', value: s.attackRange.toFixed(1), unit: 'tiles' },
  ];

  for (const row of rows) {
    const node = row.detail
      ? (el('button', 'stat stat--open') as HTMLButtonElement)
      : el('div', 'stat');
    node.append(el('span', 'stat__k', row.key));
    const value = el('span', 'stat__v', row.value);
    if (row.unit) value.append(el('span', 'stat__unit', row.unit));
    node.append(value);
    if (row.why) attachTooltip(node, () => `${row.key}\n${row.why}`);

    if (row.detail) {
      node.classList.toggle('stat--on', openStat === row.key);
      (node as HTMLButtonElement).onclick = () => {
        openStat = openStat === row.key ? null : row.key;
        render();
      };
    }
    host.append(node);
    if (row.detail && openStat === row.key) host.append(row.detail());
  }

  // Resistances, grouped as they're resisted. Zeroes are shown too — an
  // unresisted type is exactly the thing you want to notice.
  const res = $('sheet-res');
  res.replaceChildren();
  for (const type of DAMAGE_TYPES) {
    const value = Math.round(s.resistances[type.id] ?? 0);
    const row = el('div', 'stat');
    row.append(el('span', 'stat__k', type.name.toLowerCase()));
    const cell = el('span', 'stat__v', `${value}%`);
    if (value >= DEFENCE.resistanceCap) cell.classList.add('stat__v--capped');
    else if (value === 0) cell.classList.add('stat__v--zero');
    row.append(cell);
    res.append(row);
  }

  const need = xpToNext(game.character.level);
  $('sheet-level').textContent = String(game.character.level);
  $('sheet-xp-text').textContent = `${game.character.xp} / ${need}`;
  ($('sheet-xp-fill') as HTMLElement).style.width =
    `${Math.min(100, (game.character.xp / need) * 100)}%`;
}

/**
 * What every number below is computed for. Damage without the skill beside it
 * is a number with no units, and the tree can have changed the type since you
 * picked it.
 */
function renderSkill(): void {
  const host = $('sheet-skill');
  host.replaceChildren();
  const detail = damageDetail(game.character);
  const dealt = DAMAGE_TYPE_BY_ID[detail.breakdown.dealtAs]?.name ?? detail.breakdown.dealtAs;

  host.append(el('div', 'skillline__name', detail.skill.name));
  host.append(
    el(
      'div',
      'skillline__how',
      detail.seconds > 0
        ? `${dealt} over ${detail.seconds}s per cast · ${detail.skill.tags.join(', ')}`
        : `${dealt} on hit · ${detail.skill.tags.join(', ')}`
    )
  );
}

function render(): void {
  hideTooltip();
  renderSkill();
  renderSlots();
  renderPickHint();
  renderStats();
  // The handler has to be re-registered on every render: it closes over
  // `picking`, so a stale one keeps lighting up the slot you already filled.
  // setInventoryHandler redraws the dock, so this covers that too.
  setInventoryHandler(sheetHandler());
  onChanged?.();
}

/** Redraws the sheet if it is up, for an equip that happened somewhere else. */
export function refreshCharacter(): void {
  if (isCharacterOpen()) render();
}

export function openCharacter(): void {
  picking = null;
  render();
  $('sheet').hidden = false;
}

export function closeCharacter(): void {
  $('sheet').hidden = true;
  picking = null;
  hideTooltip();
  onClosed?.();
}

/**
 * Which slot is waiting, if any. The guided opening needs it: picking a slot
 * moves the next thing to click OUT of this window and into the dock, and a
 * guide that cannot see that rings a slot while the gear sits switched off.
 */
export const pickingSlot = (): string | null => picking;

export function isCharacterOpen(): boolean {
  return !$('sheet').hidden;
}

/**
 * `changed` lets the views refresh derived readouts after an equip; `closed`
 * hands the dock back, because this screen now claims it while it is open.
 */
export function initCharacter(
  state: GameState,
  changed?: () => void,
  closed?: () => void
): void {
  game = state;
  onChanged = changed ?? null;
  onClosed = closed ?? null;

  ($('sheet-close') as HTMLButtonElement).onclick = closeCharacter;
  $('sheet').addEventListener('click', (event) => {
    // Click the backdrop to dismiss; clicks inside the card shouldn't.
    if (event.target === $('sheet')) closeCharacter();
  });
}
