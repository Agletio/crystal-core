/**
 * THE CLIMB, drawn as pips, inside the Fissure window. *"I want it to be
 * obvious as to your progression and what you've cleared so when you inevitably
 * do fail you can manually go back a level or 2 and grind and then continue
 * later."*
 *
 * One row per zone, one pip per rung, four states: cleared, the next one up,
 * shut, and the one you are pointed at. A cleared rung stays clickable for the
 * rest of that character's life, so going back two and grinding is one click.
 *
 * The pick lives HERE and not in the save: it is clamped against `canEnter` on
 * every read, so swapping character or reloading points you at the deepest
 * thing you may enter rather than at somebody else's rung.
 */
import { LADDER } from '../data';
import { THEME_BY_ID } from '../data';
import { canEnter, climbed, furthest, isChallenge, zoneAt, zoneOpen } from '../ladder';
import type { Rung } from '../ladder';
import type { Character } from '../sim/character';
import { attachTooltip } from './tooltip';

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let chosen: Rung | null = null;

/** Where the next descent goes. */
export function rungNow(character: Character): Rung {
  if (chosen && canEnter(character, chosen)) return chosen;
  return furthest(character);
}

export function pickRung(character: Character, at: Rung): boolean {
  if (!canEnter(character, at)) return false;
  chosen = at;
  return true;
}

/** Cleared everywhere, against every rung there is. */
export function climbTotals(character: Character): { done: number; all: number } {
  let done = 0;
  let all = 0;
  LADDER.zones.forEach((zone, z) => {
    done += Math.min(zone.rungs, climbed(character, z));
    all += zone.rungs;
  });
  return { done, all };
}

/** A rung named: what it IS, rather than which one anybody is pointed at. */
export const rungName = (at: Rung): string =>
  `${THEME_BY_ID[zoneAt(at.zone)?.theme ?? '']?.name ?? '?'}, rung ${at.rung}`;

/** What the Enter button says: the rung you are about to walk into. */
export const rungLabel = (character: Character): string => rungName(rungNow(character));

/** The report's line about the climb: what a clear opened, or where a death
 *  leaves you. The report is the one screen every descent ends on. */
export function climbLine(character: Character, at: Rung | null, cleared: boolean): string | null {
  const zone = at ? zoneAt(at.zone) : null;
  if (!at || !zone) return null;
  const name = THEME_BY_ID[zone.theme]?.name ?? zone.theme;
  const done = Math.min(zone.rungs, climbed(character, at.zone));
  if (!cleared) {
    return `${name}, rung ${at.rung}. ${done} of ${zone.rungs} cleared — drop back a rung or two and grind if you need to.`;
  }
  if (at.rung < zone.rungs) return `${name}, rung ${at.rung} cleared. Rung ${at.rung + 1} is open.`;
  const after = zoneAt(at.zone + 1);
  if (!after) return `${name}, rung ${at.rung} cleared. That is the whole climb.`;
  return `${name} is finished. ${THEME_BY_ID[after.theme]?.name ?? after.theme} is open.`;
}

/** What a shut zone is waiting on: the one below it, by name. */
const shutBy = (zone: number): string => {
  const before = zoneAt(zone - 1);
  return THEME_BY_ID[before?.theme ?? '']?.name ?? 'the zone below';
};

/** Seven rungs to a row, and 42 rungs is six rows exactly. Each row runs the
 *  opposite way to the one above, so the whole climb is ONE line that winds. */
const PER_ROW = 7;
const ROW_H = 34;
const PAD = 20;

interface Station {
  zone: number;
  rung: number;
  x: number; // percent across the card
  y: number; // pixels down it
}

/** Every rung on the climb, in order, placed on the winding seam. A ZONE
 *  always starts a new row, so its name has clear rock to stand on and the
 *  three stretches read as the three things they are. */
function stations(): Station[] {
  const out: Station[] = [];
  let i = 0;
  LADDER.zones.forEach((zone, z) => {
    if (i % PER_ROW !== 0) i += PER_ROW - (i % PER_ROW);
    for (let rung = 1; rung <= zone.rungs; rung++, i++) {
      const row = Math.floor(i / PER_ROW);
      const col = i % PER_ROW;
      const at = row % 2 === 0 ? col : PER_ROW - 1 - col;
      out.push({
        zone: z,
        rung,
        x: 8 + (at / (PER_ROW - 1)) * 84,
        // The wobble is what makes it a seam rather than a ruler.
        y: PAD + row * ROW_H + Math.sin(at * 1.15 + row * 2.1) * 5,
      });
    }
  });
  return out;
}

/** A smooth line through them: each pair meets at their midpoint, which is the
 *  cheapest curve that never overshoots a station. */
function seamPath(from: Station[], wide: number): string {
  if (from.length === 0) return '';
  const px = (s: Station) => (s.x / 100) * wide;
  let d = `M ${px(from[0]).toFixed(1)} ${from[0].y.toFixed(1)}`;
  for (let i = 1; i < from.length; i++) {
    const mid = { x: (px(from[i - 1]) + px(from[i])) / 2, y: (from[i - 1].y + from[i].y) / 2 };
    d += ` Q ${px(from[i - 1]).toFixed(1)} ${from[i - 1].y.toFixed(1)} ${mid.x.toFixed(1)} ${mid.y.toFixed(1)}`;
  }
  const last = from[from.length - 1];
  d += ` L ${px(last).toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

const svgEl = (tag: string, attrs: Record<string, string>): SVGElement => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
};

/**
 * THE CLIMB, drawn as the seam it is: one line winding down through 42 rungs,
 * a station on every one of them. The line behind you is LIT and the line ahead
 * is not, so how far you have come is the picture rather than a count.
 */
export function renderClimb(host: HTMLElement, character: Character, onPick: () => void): void {
  host.replaceChildren();
  const at = rungNow(character);
  const totals = climbTotals(character);

  host.append(el('p', 'panel__title', 'The climb'));
  const where = el('p', 'climb__where',
    `${rungLabel(character)} · ${totals.done} of ${totals.all} rungs cleared`);
  if (isChallenge(at.zone, at.rung)) {
    where.append(el('span', 'climb__spike', ' · a challenge floor'));
  }
  host.append(where);

  const all = stations();
  const high = PAD * 2 + Math.max(...all.map((s) => s.y - PAD)) ;
  const trail = el('div', 'climbseam');
  trail.style.height = `${high}px`;

  // The seam is drawn in a 100-wide space and STRETCHED across the card: a
  // curve pulled sideways still reads as a curve, and nothing here has to
  // measure an element the modal has not finished laying out.
  const svg = svgEl('svg', {
    class: 'climbseam__line',
    viewBox: `0 0 100 ${high}`,
    preserveAspectRatio: 'none',
  });
  // ONE STRETCH PER ZONE, so the break between them is visible: a zone opens
  // when the one below is whole, and a single unbroken line says otherwise.
  LADDER.zones.forEach((zone, z) => {
    const mine = all.filter((s) => s.zone === z);
    svg.append(svgEl('path', { class: 'climbseam__rock', d: seamPath(mine, 100) }));
    // Lit as far as this zone is CLEARED.
    const done = mine.filter((s) => s.rung <= Math.min(zone.rungs, climbed(character, z)));
    if (done.length > 0) {
      svg.append(svgEl('path', { class: 'climbseam__lit', d: seamPath(done, 100) }));
    }
  });
  trail.append(svg);

  for (const station of all) {
    const zone = LADDER.zones[station.zone];
    const theme = THEME_BY_ID[zone.theme];
    const here = { zone: station.zone, rung: station.rung };
    const can = canEnter(character, here);
    const open = zoneOpen(character, station.zone);
    const cleared = Math.min(zone.rungs, climbed(character, station.zone));
    const boss = station.rung === zone.rungs;

    const pip = el('button', 'pip', String(station.rung)) as HTMLButtonElement;
    pip.id = `climb-pip-${station.zone}-${station.rung}`;
    pip.style.left = `${station.x}%`;
    pip.style.top = `${station.y}px`;
    pip.classList.toggle('pip--spike', isChallenge(station.zone, station.rung));
    pip.classList.toggle('pip--boss', boss);
    pip.classList.toggle('pip--done', station.rung <= cleared);
    pip.classList.toggle('pip--next', can && station.rung > cleared);
    pip.classList.toggle('pip--shut', !can);
    pip.classList.toggle('pip--here', at.zone === station.zone && at.rung === station.rung);
    pip.disabled = !can;

    const what = boss
      ? ` The top of ${theme?.name ?? zone.theme}: a fight in an arena of its own.`
      : isChallenge(station.zone, station.rung)
        ? ' A challenge floor: the room fills with rares.'
        : '';
    attachTooltip(pip, () =>
      (!open
        ? `${theme?.name ?? zone.theme}, rung ${station.rung}. Shut until ${shutBy(station.zone)} is cleared whole.`
        : !can
          ? `${theme?.name ?? zone.theme}, rung ${station.rung}. Clear rung ${cleared + 1} first.`
          : station.rung <= cleared
            ? `${theme?.name ?? zone.theme}, rung ${station.rung}. Cleared. Go back and grind it any time.`
            : `${theme?.name ?? zone.theme}, rung ${station.rung}. The furthest you may go.`) + what
    );
    pip.onclick = () => {
      if (pickRung(character, here)) onPick();
    };
    trail.append(pip);

    // Where a ZONE begins, named on the seam itself: three rows of numbers
    // with nothing between them is a climb you cannot place yourself on.
    if (station.rung === 1) {
      const mark = el('span', `climbseam__zone${open ? '' : ' climbseam__zone--shut'}`,
        theme?.name ?? zone.theme);
      mark.id = `climb-zone-${station.zone}`;
      mark.style.left = `${station.x}%`;
      mark.style.top = `${station.y - 21}px`;
      mark.title = open ? '' : `Shut until ${shutBy(station.zone)} is cleared whole.`;
      trail.append(mark);
    }
  }

  host.append(trail);
}
