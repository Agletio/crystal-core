/**
 * THE CLIMB, inside the Fissure window. *"I want it to be obvious as to your
 * progression and what you've cleared so when you inevitably do fail you can
 * manually go back a level or 2 and grind and then continue later."*
 *
 * ONE ZONE AT A TIME, on a TAB — *"make it where its like actually map art of a
 * caven you're progressing down and do one zone at a time so only show fissure
 * and have different tabs for each zone"*. The zone's own generated cross-
 * section is the ground and the rungs descend across it, so where you are is a
 * place rather than a number. A cleared rung stays clickable for the rest of
 * that character's life, so going back two and grinding is one click.
 *
 * The pick lives HERE and not in the save: it is clamped against `canEnter` on
 * every read, so swapping character or reloading points you at the deepest
 * thing you may enter rather than at somebody else's rung.
 */
import { LADDER } from '../data';
import { campaignLine, canEnter, climbed, furthest, zoneAt, zoneOpen } from '../ladder';
import type { Rung } from '../ladder';
import { SCENE_ART } from '../render/generated-scene';
import type { Character } from '../sim/character';
import { attachTooltip } from './tooltip';

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let chosen: Rung | null = null;
/** The tab you are looking at, null until you click one: left alone it follows
 *  the rung you are pointed at, so a clear opens the zone above and shows it. */
let shown: number | null = null;

/** Where the next descent goes. */
export function rungNow(character: Character): Rung {
  if (chosen && canEnter(character, chosen)) return chosen;
  return furthest(character);
}

/** ADVANCE: forget the rung you picked, so the next descent takes the deepest
 *  one open. The clear that calls this has just recorded the rung, so
 *  `furthest` has already moved — there is no second idea of "next". */
export function advanceRung(): void {
  chosen = null;
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
  `${zoneAt(at.zone)?.name ?? '?'}, depth ${at.rung}`;

/** What the Enter button says: the rung you are about to walk into. */
export const rungLabel = (character: Character): string => rungName(rungNow(character));

/** The report's line about the climb: what a clear opened, or where a death
 *  leaves you. The report is the one screen every descent ends on. */
export function climbLine(character: Character, at: Rung | null, cleared: boolean): string | null {
  const zone = at ? zoneAt(at.zone) : null;
  if (!at || !zone) return null;
  const name = zone.name;
  const done = Math.min(zone.rungs, climbed(character, at.zone));
  if (!cleared) {
    return `${name}, depth ${at.rung}. ${done} of ${zone.rungs} cleared — drop back a depth or two and grind if you need to.`;
  }
  if (at.rung < zone.rungs) return `${name}, depth ${at.rung} cleared. Depth ${at.rung + 1} is open.`;
  const after = zoneAt(at.zone + 1);
  if (!after) return `${name}, depth ${at.rung} cleared. That is the whole climb.`;
  return `${name} is finished. ${after.name} is open.`;
}

/** What a shut zone is waiting on: the one below it, by name. */
const shutBy = (zone: number): string => {
  const before = zoneAt(zone - 1);
  return before?.name ?? 'the zone below';
};

interface Station {
  rung: number;
  x: number; // percent across the picture
  y: number; // percent down it
}

/** One zone's depths, laid down the picture the way the picture itself goes:
 *  top left to bottom right, with a wobble so it reads as a seam rather than a
 *  ruler. BOTH axes are percentages of the art, so a station cannot drift off
 *  the chamber it sits in whatever the card is doing. */
function stations(rungs: number): Station[] {
  const out: Station[] = [];
  for (let i = 0; i < rungs; i++) {
    const t = rungs === 1 ? 0 : i / (rungs - 1);
    out.push({ rung: i + 1, x: 7 + t * 86, y: 14 + t * 70 + Math.sin(i * 1.35) * 5 });
  }
  return out;
}

/** A smooth line through them: each pair meets at their midpoint, which is the
 *  cheapest curve that never overshoots a station. */
function seamPath(from: Station[]): string {
  if (from.length === 0) return '';
  let d = `M ${from[0].x.toFixed(1)} ${from[0].y.toFixed(1)}`;
  for (let i = 1; i < from.length; i++) {
    const mid = { x: (from[i - 1].x + from[i].x) / 2, y: (from[i - 1].y + from[i].y) / 2 };
    d += ` Q ${from[i - 1].x.toFixed(1)} ${from[i - 1].y.toFixed(1)} ${mid.x.toFixed(1)} ${mid.y.toFixed(1)}`;
  }
  const last = from[from.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

const svgEl = (tag: string, attrs: Record<string, string>): SVGElement => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
};

/** A tab per zone, shut ones included: three tabs is the whole shape of the
 *  climb, and a zone you cannot reach yet is worth knowing about. */
function tabs(host: HTMLElement, character: Character, at: number, redraw: () => void): void {
  const row = el('div', 'climbtabs');
  LADDER.zones.forEach((zone, z) => {
    const open = zoneOpen(character, z);
    const done = Math.min(zone.rungs, climbed(character, z));
    const tab = el('button', 'mini climbtab', zone.name) as HTMLButtonElement;
    tab.id = `climb-tab-${z}`;
    tab.classList.toggle('climbtab--on', z === at);
    tab.classList.toggle('climbtab--shut', !open);
    tab.disabled = !open;
    tab.append(el('span', 'climbtab__done', ` ${done}/${zone.rungs}`));
    attachTooltip(tab, () =>
      open
        ? `${zone.name}. ${done} of ${zone.rungs} depths cleared. ${zone.blurb}`
        : `${zone.name}. Shut until ${shutBy(z)} is cleared whole.`);
    tab.onclick = () => {
      shown = z;
      redraw();
    };
    row.append(tab);
  });
  host.append(row);
}

/**
 * THE CLIMB, drawn as the descent it is: one zone's cross-section, a seam
 * winding down it, and a station on every rung. The seam behind you is LIT and
 * the seam ahead is not, so how far you have come is the picture.
 */
export function renderClimb(host: HTMLElement, character: Character, onPick: () => void): void {
  host.replaceChildren();
  const at = rungNow(character);
  const totals = climbTotals(character);
  if (shown === null || !zoneOpen(character, shown)) shown = at.zone;
  const z = shown;
  const zone = LADDER.zones[z];

  host.append(el('p', 'panel__title', 'The climb'));
  host.append(el('p', 'climb__where',
    `${rungLabel(character)} · ${totals.done} of ${totals.all} depths cleared`));
  host.append(el('p', 'climb__prize', campaignLine(character)));
  tabs(host, character, z, () => renderClimb(host, character, onPick));

  const all = stations(zone.rungs);
  const cleared = Math.min(zone.rungs, climbed(character, z));
  const trail = el('div', 'climbseam');
  // The zone's own generated cross-section, or the bare panel until one is
  // drawn for it — a missing picture may not take the rungs with it.
  const art = zone.art ? SCENE_ART[zone.art] : null;
  if (art) trail.style.backgroundImage = `url(${art.png})`;

  const svg = svgEl('svg', {
    class: 'climbseam__line',
    viewBox: '0 0 100 100',
    preserveAspectRatio: 'none',
  });
  svg.append(svgEl('path', { class: 'climbseam__rock', d: seamPath(all) }));
  const done = all.filter((s) => s.rung <= cleared);
  if (done.length > 0) {
    svg.append(svgEl('path', { class: 'climbseam__lit', d: seamPath(done) }));
  }
  trail.append(svg);

  for (const station of all) {
    const here = { zone: z, rung: station.rung };
    const can = canEnter(character, here);
    const boss = station.rung === zone.rungs;

    const pip = el('button', 'pip', String(station.rung)) as HTMLButtonElement;
    pip.id = `climb-pip-${z}-${station.rung}`;
    pip.style.left = `${station.x}%`;
    pip.style.top = `${station.y}%`;
    pip.classList.toggle('pip--boss', boss);
    pip.classList.toggle('pip--done', station.rung <= cleared);
    pip.classList.toggle('pip--next', can && station.rung > cleared);
    pip.classList.toggle('pip--shut', !can);
    pip.classList.toggle('pip--here', at.zone === z && at.rung === station.rung);
    pip.disabled = !can;

    const last = boss && z === LADDER.zones.length - 1;
    const what = !boss
      ? ''
      : ` The top of ${zone.name}: a fight in an arena of its own.` +
        (last ? ' It is the end of the climb, and the whole of what pays for it.' : '');
    attachTooltip(pip, () =>
      (!can
        ? `${zone.name}, depth ${station.rung}. Clear depth ${cleared + 1} first.`
        : station.rung <= cleared
          ? `${zone.name}, depth ${station.rung}. Cleared. Go back and grind it any time.`
          : `${zone.name}, depth ${station.rung}. The furthest you may go.`) + what
    );
    pip.onclick = () => {
      if (pickRung(character, here)) onPick();
    };
    trail.append(pip);
  }

  host.append(trail);
}
