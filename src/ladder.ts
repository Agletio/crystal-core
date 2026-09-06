/**
 * WHERE YOU ARE ON THE CLIMB, and where you may go. Nothing is ever taken away:
 * a depth you have beaten is open for the rest of that character's life.
 */
import { CAMPAIGN_REWARD, LADDER, LAMPWRIGHT } from './data';
import type { Character } from './sim/character';
import type { BranchDef, MapTheme } from './types';

export interface Rung {
  zone: number; // index into LADDER.zones; `rung` is 1-based within it
  rung: number;
  branch?: string; // a SIDE ROOM off that depth, by its letter
}

/** A place rather than a depth: one area past the whole climb, at `PROVING`'s
 *  own floor, in the world you PICKED. */
export interface Proving {
  proving: true;
  influence: MapTheme;
  branch?: string; // a `PROVING.branches` id: its own world, and one bonus
}

/** WHERE A DESCENT GOES. Nothing else picks a fight. */
export type RunWhere = Rung | Proving;

export const isProving = (at: RunWhere | null | undefined): at is Proving =>
  !!at && 'proving' in at;

/** OPEN once the Lampwright has paid for the climb: sockets with nothing to put
 *  in them are a screen with no verb. */
export const provingOpen = (character: Character): boolean => !!character.paidCampaign;

export const zoneAt = (zone: number) => LADDER.zones[zone];

export const climbed = (character: Character, zone: number): number =>
  character.climbed?.[zoneAt(zone)?.id ?? ''] ?? 0;

/** OPEN once the one before it is climbed whole. The first always is. */
export function zoneOpen(character: Character, zone: number): boolean {
  if (zone <= 0) return true;
  const before = zoneAt(zone - 1);
  return !!before && climbed(character, zone - 1) >= before.rungs;
}

/** Everything cleared, plus the one past it. */
export function canEnter(character: Character, at: Rung): boolean {
  const zone = zoneAt(at.zone);
  if (!zone || !zoneOpen(character, at.zone)) return false;
  return at.rung >= 1 && at.rung <= Math.min(zone.rungs, climbed(character, at.zone) + 1);
}

/** The deepest thing you may enter: where the game puts you by default. */
export function furthest(character: Character): Rung {
  let best: Rung = { zone: 0, rung: 1 };
  LADDER.zones.forEach((zone, z) => {
    if (!zoneOpen(character, z)) return;
    best = { zone: z, rung: Math.min(zone.rungs, climbed(character, z) + 1) };
  });
  return best;
}

/** THE ARENA at the top of a zone: its LAST depth is a boss, so the climb's
 *  one gate is a fight. Never a BRANCH — a boss you could farm is not a gate. */
export function arenaAt(at: Rung): string | null {
  const zone = zoneAt(at.zone);
  if (at.branch) return null;
  return zone && at.rung === zone.rungs ? (zone.arena ?? null) : null;
}

/** WHAT HANGS OFF A DEPTH, and what one is CALLED: `3A`, derived. */
export const branchesAt = (zone: number, rung: number): BranchDef[] =>
  (zoneAt(zone)?.branches ?? []).filter((b) => b.at === rung);

export const branchLabel = (b: BranchDef): string => `${b.at}${b.letter}`;

export const branchAt = (at: Rung): BranchDef | null =>
  (at.branch && branchesAt(at.zone, at.rung).find((b) => b.letter === at.branch)) || null;

/** THE CAMPAIGN IS OVER when every zone is climbed whole, which is the three
 *  bosses. Nothing pays a crystal or a point before it. */
export const campaignDone = (character: Character): boolean =>
  LADDER.zones.every((zone, z) => climbed(character, z) >= zone.rungs);

export const campaignPrize = (): string =>
  `${CAMPAIGN_REWARD.crystals} crystal${CAMPAIGN_REWARD.crystals === 1 ? '' : 's'} ` +
  `and ${CAMPAIGN_REWARD.points} points`;

/** THE FINISH LINE, SAID BEFORE YOU GET THERE: where the last boss is and what
 *  he pays for it, on the screen the climb is picked from. */
export function campaignLine(character: Character): string {
  const last = LADDER.zones[LADDER.zones.length - 1];
  if (character.paidCampaign) return `The climb is finished, and ${LAMPWRIGHT.name} has paid for it.`;
  if (!campaignDone(character)) {
    return (
      `No crystal and no point is paid until the climb is whole. ` +
      `${last.name}, depth ${last.rungs}, is the last of it, and ` +
      `${LAMPWRIGHT.name} hands over ${campaignPrize()} for it.`
    );
  }
  return `The climb is finished. ${LAMPWRIGHT.name} is holding ${campaignPrize()} for you in the camp.`;
}

/** Cleared, and never un-cleared: re-grinding an old rung records nothing, and
 *  a BRANCH records nothing at all — advancing the line while you grind beside
 *  it is the one thing that would make a side room a step. */
export function takeRung(character: Character, at: Rung): void {
  const key = zoneAt(at.zone)?.id;
  if (!key || at.rung < 1 || at.branch) return;
  const was = climbed(character, at.zone);
  if (at.rung > was) character.climbed = { ...(character.climbed ?? {}), [key]: at.rung };
}

