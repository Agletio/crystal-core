/**
 * WHERE YOU ARE ON THE CLIMB, and where you may go. *"So when you inevitably do
 * fail you can manually go back a level or 2 and grind and then continue
 * later."* Nothing is ever taken away: a rung you have beaten is open for the
 * rest of that character's life.
 */
import { CHALLENGE, LADDER } from './data';
import type { Character } from './sim/character';

export interface Rung {
  zone: number; // index into LADDER.zones; `rung` is 1-based within it
  rung: number;
}

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

/** THE ARENA at the top of a zone: its LAST rung is a boss rather than a
 *  descent, so the climb's one gate is a fight. */
export function arenaAt(at: Rung): string | null {
  const zone = zoneAt(at.zone);
  return zone && at.rung === zone.rungs ? (zone.arena ?? null) : null;
}

/** A SPIKE rather than a step, never a zone's LAST rung — that is the boss's. */
export function isChallenge(zone: number, rung: number): boolean {
  const at = zoneAt(zone);
  if (!at || rung < 1 || rung >= at.rungs) return false;
  return rung % CHALLENGE.every === 0;
}

/** Every challenge floor in a zone, for whatever draws them. */
export const challengesIn = (zone: number): number[] =>
  Array.from({ length: zoneAt(zone)?.rungs ?? 0 }, (_, i) => i + 1).filter((r) =>
    isChallenge(zone, r)
  );

/** Cleared, and never un-cleared: re-grinding an old rung records nothing. */
export function takeRung(character: Character, at: Rung): void {
  const key = zoneAt(at.zone)?.id;
  if (!key || at.rung < 1) return;
  const was = climbed(character, at.zone);
  if (at.rung > was) character.climbed = { ...(character.climbed ?? {}), [key]: at.rung };
}

