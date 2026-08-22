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

  LADDER.zones.forEach((zone, z) => {
    const theme = THEME_BY_ID[zone.theme];
    const open = zoneOpen(character, z);
    const done = Math.min(zone.rungs, climbed(character, z));

    const row = el('div', `climbrow${open ? '' : ' climbrow--shut'}`);
    row.id = `climb-zone-${z}`;
    row.append(el('span', 'climbrow__name', theme?.name ?? zone.theme));

    const pips = el('span', 'climbrow__pips');
    for (let rung = 1; rung <= zone.rungs; rung++) {
      const here = { zone: z, rung };
      const can = canEnter(character, here);
      const pip = el('button', 'pip', String(rung)) as HTMLButtonElement;
      pip.id = `climb-pip-${z}-${rung}`;
      // A SPIKE is marked before you walk into it: a rung that is suddenly four
      // times the fight, unannounced, reads as the game breaking.
      pip.classList.toggle('pip--spike', isChallenge(z, rung));
      pip.classList.toggle('pip--done', rung <= done);
      pip.classList.toggle('pip--next', can && rung > done);
      pip.classList.toggle('pip--shut', !can);
      pip.classList.toggle('pip--here', at.zone === z && at.rung === rung);
      pip.disabled = !can;
      const spike = isChallenge(z, rung) ? ' A challenge floor: the room fills with rares.' : '';
      attachTooltip(pip, () =>
        (!open
          ? `${theme?.name ?? zone.theme}, rung ${rung}. Shut until ${shutBy(z)} is cleared whole.`
          : !can
            ? `${theme?.name ?? zone.theme}, rung ${rung}. Clear rung ${done + 1} first.`
            : rung <= done
              ? `${theme?.name ?? zone.theme}, rung ${rung}. Cleared. Go back and grind it any time.`
              : `${theme?.name ?? zone.theme}, rung ${rung}. The furthest you may go.`) + spike
      );
      pip.onclick = () => {
        if (pickRung(character, here)) onPick();
      };
      pips.append(pip);
    }
    row.append(pips);

    // A shut zone says WHY on the row rather than under it. One line a zone is
    // what keeps the way in on screen beneath all three of them.
    row.append(
      el('span', 'climbrow__count', open ? `${done} / ${zone.rungs}` : `clear ${shutBy(z)}`)
    );
    host.append(row);
  });
}
