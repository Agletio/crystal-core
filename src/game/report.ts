/**
 * Turning a finished run into rows the results overlay can display, and banking
 * what it earned. The overlay knows nothing about what the rows mean, so a new
 * stat is a line in buildReport() and nothing else.
 */
import { bankToHaul, grantFirstClear, haulFull } from './state';
import type { GameState } from './state';
import { advanceSocketed, claimQuests, lampwrightGift } from './crystals';
import type { CrystalGain } from './crystals';
import type { GiftPlace } from './state';
import { LAMPWRIGHT } from '../data';
import { grant } from '../economy';
import { addXp, addSkillXp } from '../sim/character';
import type { RunState } from '../sim/run';
import type { Item } from '../types';

export interface ReportRow {
  label: string;
  value: string;
  /** Draws attention: used for the things you actually lost. */
  bad?: boolean;
}

export interface RunReport {
  /** `left` is walking out mid-descent: it banks like a death, without one. */
  status: 'cleared' | 'died' | 'left';
  cleared: boolean;
  headline: string;
  rows: ReportRow[];
  /** Currency actually banked, already rounded. Empty when the run was lost. */
  banked: Record<string, number>;
  items: Item[];
  /** Handed to you rather than dropped, and put in the dock rather than the haul. */
  gifts: Gift[];
  /** Crystals that gained a tier for being socketed through this. */
  levelled: CrystalGain[];
  /** True when there was loot and the hero died holding it. */
  lostLoot: boolean;
  /** Whether the haul is at or over capacity now this run has banked. */
  haulFull: boolean;
  xp: number;
  levelsGained: number;
}

export interface Gift {
  item: Item;
  where: GiftPlace;
  /** Who handed it over. The Fissure, the Lampwright, or a quest by name. */
  from: string;
}

const round = (n: number) => Math.max(0, Math.round(n));

function currencyRows(currency: Record<string, number>): ReportRow[] {
  return Object.entries(currency)
    .filter(([, n]) => round(n) > 0)
    .map(([id, n]) => ({ label: id, value: `+${round(n)}` }));
}

/**
 * Loot only transfers on a CLEAR. Dying drops everything the run carried, and
 * so does walking out — but only for THIS descent: every clear before it
 * banked as it happened, and nothing reaches back for those.
 */
export function buildReport(game: GameState, run: RunState, left = false): RunReport {
  const cleared = run.status === 'cleared' && !left;
  const hadLoot = Object.values(run.loot.currency).some((n) => round(n) > 0);

  const banked: Record<string, number> = {};
  const gifts: Gift[] = [];
  let levelled: CrystalGain[] = [];

  if (cleared) {
    for (const [id, amount] of Object.entries(run.loot.currency)) {
      const n = round(amount);
      if (n <= 0) continue;
      banked[id] = n;
      grant(game.wallet, id, n);
    }
    // Whole, into the haul: the bags are yours to arrange and a run is not
    // allowed to fill them behind your back. Nothing is refused here, so
    // capacity is a thing checked between runs rather than during one.
    bankToHaul(game, run.loot.items);

    // The opening payout. Folded into the same banked/items shape so the
    // overlay shows it as loot rather than it appearing silently in the bag.
    const first = grantFirstClear(game);
    if (first) {
      banked.gold = (banked.gold ?? 0) + first.gold;
      for (const [id, n] of Object.entries(first.currency)) {
        banked[id] = (banked[id] ?? 0) + n;
      }
      gifts.push({ item: first.weapon, where: first.where, from: 'The Fissure' });
    }

    // Met down there, paid out up here: a meeting on a descent you die in is a
    // meeting, and the crystal was never in your hands.
    if (run.met) {
      const given = lampwrightGift(game);
      gifts.push({ item: given.crystal, where: given.where, from: LAMPWRIGHT.name });
    }

    // Socketed only. A crystal in a bag is a crystal that was not used, and
    // this is what makes a socket spent on a fresh one cost something.
    levelled = advanceSocketed(game, run.set);

    for (const { quest, crystal, where } of claimQuests(game, run.set)) {
      gifts.push({ item: crystal, where, from: quest.name });
    }
  }

  // XP is earned either way — you learned something on the way to dying.
  const xp = Math.round(run.xpGained);
  const levelsGained = addXp(game.character, xp);

  // The active skill shares the same XP. That's what makes committing to one
  // skill the thing that advances its tree.
  const skillLevels = addSkillXp(game.character, game.character.skillId, xp);

  const rows: ReportRow[] = [
    { label: 'time', value: `${run.elapsed.toFixed(1)}s` },
    { label: 'kills', value: `${run.killed} / ${run.totalMonsters}` },
    { label: 'xp', value: `+${Math.round(run.xpGained)}` },
  ];

  if (levelsGained > 0) {
    rows.push({ label: 'levels gained', value: `+${levelsGained}` });
  }
  if (skillLevels > 0) {
    rows.push({ label: 'skill levels', value: `+${skillLevels}` });
  }

  if (cleared && run.loot.items.length > 0) {
    rows.push({ label: 'sent to the haul', value: String(run.loot.items.length) });
  }
  for (const gain of levelled) {
    rows.push({ label: gain.crystal.name, value: `+${gain.tiers} tier` });
  }

  // Damage taken, split by type. Nothing reads this yet beyond the overlay —
  // it's here as the worked example of a diagnostic stat.
  const totalTaken = Object.values(run.damageTaken).reduce((n, v) => n + v, 0);
  if (totalTaken > 0) {
    rows.push({ label: 'damage taken', value: String(round(totalTaken)) });
    for (const [type, amount] of Object.entries(run.damageTaken)) {
      if (round(amount) <= 0) continue;
      rows.push({ label: `  ${type}`, value: String(round(amount)) });
    }
  }

  return {
    status: left ? 'left' : cleared ? 'cleared' : 'died',
    cleared,
    headline: left ? 'You walked out' : cleared ? 'Fissure cleared' : 'You died',
    rows,
    banked,
    items: cleared ? [...run.loot.items] : [],
    gifts,
    levelled,
    lostLoot: !cleared && hadLoot,
    haulFull: haulFull(game),
    xp: Math.round(run.xpGained),
    levelsGained,
  };
}

/** Loot rows for display, whether banked or lost. */
export function lootRows(run: RunState): ReportRow[] {
  return currencyRows(run.loot.currency);
}
