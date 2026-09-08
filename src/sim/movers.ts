/**
 * WHAT A MOVER IS, AS NUMBERS. One reading off the skill and the grants, so the
 * sim behaves by exactly what the demo fingerprints — a notable that changes
 * nothing here changes nothing in a descent, and there is no second place a
 * mover switch could be read.
 *
 * A mover deals no damage and never will. What it hands over is the step, what
 * the step leaves behind, and a WINDOW after it.
 */
import { AFTER, MOVE } from '../data';
import type { SkillDef } from '../types';

/** What a Slow laid on the ground or on a body comes to. */
export interface MoverSlow {
  radius: number;
  slow: number;
  seconds: number;
}

export interface MoverGusts {
  most: number;
  speed: number; // % increased movement speed a charge is worth
  haste: number; // % increased attack and cast speed
  damage: number; // more damage, as a share
  guard: number; // less damage taken, as a share
  empty: number; // less damage taken while holding none
  heal: number; // share of life one dropping hands back
  mana: number; // share of the pool one dropping hands back
  back: number; // seconds until one comes back
  onKill: number; // chance a kill hands one back
  refill: number; // seconds untouched that fill them all, 0 for never
  keeps: boolean; // a hit takes none
}

export interface MoverReading {
  reach: number; // tiles one use carries you
  wait: number; // seconds between uses, before the worn Skill Cooldown line
  pressed: number; // what that wait is multiplied by when it fires in a fight
  mana: number; // share of the pool a use hands back
  heal: number; // share of life a landing hands back
  kite: number; // ground a step keeps from what pushed you, as a share of reach
  unhurt: boolean; // it fires on something being in reach rather than on a hit
  wake: MoverSlow | null; // what a step leaves where it LEFT
  tremor: MoverSlow | null; // what a landing leaves round it
  pin: MoverSlow | null; // what a landing does to the body under it
  after: { seconds: number; speed: number; damage: number; guard: number; life: number; mana: number };
  gusts: MoverGusts | null;
}

const num = (v: unknown, fallback = 0): number => (typeof v === 'number' ? v : fallback);

function slowOf(v: unknown, radius: number, slow: number, seconds: number): MoverSlow | null {
  const o = v as { radius?: unknown; slow?: unknown; seconds?: unknown } | undefined;
  if (typeof o?.slow !== 'number' || typeof o?.seconds !== 'number') return null;
  return {
    radius: (typeof o.radius === 'number' ? o.radius : 0) * radius,
    slow: Math.min(0.9, o.slow + slow),
    seconds: o.seconds + seconds,
  };
}

export function moverReading(
  skill: SkillDef | null,
  grants: Record<string, unknown>
): MoverReading | null {
  if (!skill) return null;
  const after = {
    seconds: AFTER.seconds + num(grants.afterStepLonger),
    speed: num(grants.afterStepSpeed),
    damage: num(grants.afterStepDamage),
    guard: num(grants.afterStepGuard),
    life: num((grants.afterStepRegen as { life?: unknown } | undefined)?.life),
    mana: num((grants.afterStepRegen as { mana?: unknown } | undefined)?.mana),
  };

  const gusts: MoverGusts | null =
    skill.behaviour !== 'gale'
      ? null
      : {
          most: num(skill.params?.gusts, 0) + num(grants.gustMax),
          // ANCHORED is the whole of what it costs: a hit takes none and every
          // charge is worth less, so keeping them is bought rather than given.
          speed: (num(skill.params?.speed, 0) + num(grants.gustSpeed))
            * num(grants.gustKeep, 1) * num(grants.gustKept, 1),
          haste: num(grants.gustHaste) * num(grants.gustKeep, 1) * num(grants.gustKept, 1),
          damage: num(grants.gustDamage) * num(grants.gustKeep, 1) * num(grants.gustKept, 1),
          guard: num(grants.gustGuard) * num(grants.gustKeep, 1) * num(grants.gustKept, 1),
          empty: num(grants.gustlessGuard),
          heal: num(grants.gustHeal),
          mana: num(grants.gustMana),
          back: num(skill.params?.back, 0) * num(grants.gustBack, 1),
          onKill: num(grants.gustOnKill),
          refill: num(grants.gustRefill),
          keeps: grants.gustKeep !== undefined,
        };

  return {
    reach: num(skill.params?.distance, 0) * num(grants.moveDistance, 1),
    wait: num(skill.params?.cooldown, 0) * num(grants.moveCooldown, 1),
    pressed: num(grants.pressedCooldown, 1),
    mana: num(grants.moveMana),
    heal: num(grants.moveHeal),
    kite: MOVE.kite * num(grants.kiteFurther, 1),
    unhurt: grants.kiteUnhurt === true,
    wake: slowOf(grants.blinkWake, num(grants.wakeRadius, 1), num(grants.wakeSlow), num(grants.wakeSeconds)),
    tremor: slowOf(
      grants.landingSlow,
      num(grants.landingRadius, 1),
      num(grants.landingMore),
      num(grants.landingSeconds)
    ),
    pin: slowOf(
      grants.landingPin,
      1,
      num(grants.pinSlow),
      num(grants.pinLonger)
    ),
    after,
    gusts,
  };
}
