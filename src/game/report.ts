/**
 * Turning a finished run into rows the results overlay can display, and banking
 * what it earned. The overlay knows nothing about what the rows mean, so a new
 * stat is a line in buildReport() and nothing else.
 */
import { addItem, grantFirstClear } from './state';
import type { GameState } from './state';
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
  status: 'cleared' | 'died';
  cleared: boolean;
  headline: string;
  rows: ReportRow[];
  /** Currency actually banked, already rounded. Empty when the run was lost. */
  banked: Record<string, number>;
  items: Item[];
  /** Banked, but into the stash because the bag was full. */
  stashed: Item[];
  /** Earned and then lost: bag full, stash full. */
  dropped: Item[];
  /** True when there was loot and the hero died holding it. */
  lostLoot: boolean;
  xp: number;
  levelsGained: number;
}

const round = (n: number) => Math.max(0, Math.round(n));

function currencyRows(currency: Record<string, number>): ReportRow[] {
  return Object.entries(currency)
    .filter(([, n]) => round(n) > 0)
    .map(([id, n]) => ({ label: id, value: `+${round(n)}` }));
}

/** Loot only transfers on a CLEAR. Dying drops everything the run carried. */
export function buildReport(game: GameState, run: RunState): RunReport {
  const cleared = run.status === 'cleared';
  const hadLoot = Object.values(run.loot.currency).some((n) => round(n) > 0);

  const banked: Record<string, number> = {};
  const gifts: Item[] = [];
  const stashed: Item[] = [];
  const dropped: Item[] = [];

  if (cleared) {
    for (const [id, amount] of Object.entries(run.loot.currency)) {
      const n = round(amount);
      if (n <= 0) continue;
      banked[id] = n;
      grant(game.wallet, id, n);
    }
    // A full bag sends loot to the stash, and a full stash loses it. Both get
    // said out loud below — an item that silently fails to arrive reads as a
    // bug, and nothing would teach you that the fix is to clear some space.
    for (const item of run.loot.items) {
      const where = addItem(game, item);
      if (where === 'stashed') stashed.push(item);
      if (where === 'lost') dropped.push(item);
    }

    // The opening payout. Folded into the same banked/items shape so the
    // overlay shows it as loot rather than it appearing silently in the bag.
    const first = grantFirstClear(game);
    if (first) {
      banked.fragment = (banked.fragment ?? 0) + first.fragments;
      for (const [id, n] of Object.entries(first.currency)) {
        banked[id] = (banked[id] ?? 0) + n;
      }
      if (first.weapon) gifts.push(first.weapon);
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

  if (stashed.length > 0) {
    rows.push({ label: 'bag full — sent to stash', value: String(stashed.length) });
  }
  if (dropped.length > 0) {
    rows.push({ label: 'no room — left behind', value: String(dropped.length), bad: true });
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
    status: cleared ? 'cleared' : 'died',
    cleared,
    headline: cleared ? 'Fissure cleared' : 'You died',
    rows,
    banked,
    items: cleared ? [...run.loot.items, ...gifts] : [],
    stashed,
    dropped,
    lostLoot: !cleared && hadLoot,
    xp: Math.round(run.xpGained),
    levelsGained,
  };
}

/** Loot rows for display, whether banked or lost. */
export function lootRows(run: RunState): ReportRow[] {
  return currencyRows(run.loot.currency);
}
