/**
 * Turning a finished run into something the results overlay can display, and
 * banking what it earned.
 *
 * The overlay renders whatever rows it's handed and knows nothing about what
 * they mean. So a new stat — damage by type, time spent walking versus
 * fighting, largest hit taken — is a line in buildReport() and nothing else.
 * That was the point of asking for damage-taken up front: it proves the shape
 * holds more than one kind of thing.
 */
import { addItem } from './state';
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

/**
 * Banks a finished run into the game and describes what happened.
 *
 * Loot only transfers on a clear. Dying drops everything the run was
 * carrying, which is the entire reason the status matters.
 */
export function buildReport(game: GameState, run: RunState): RunReport {
  const cleared = run.status === 'cleared';
  const hadLoot = Object.values(run.loot.currency).some((n) => round(n) > 0);

  const banked: Record<string, number> = {};
  if (cleared) {
    for (const [id, amount] of Object.entries(run.loot.currency)) {
      const n = round(amount);
      if (n <= 0) continue;
      banked[id] = n;
      grant(game.wallet, id, n);
    }
    for (const item of run.loot.items) addItem(game, item);
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
    headline: cleared ? 'Map cleared' : 'You died',
    rows,
    banked,
    items: cleared ? run.loot.items : [],
    lostLoot: !cleared && hadLoot,
    xp: Math.round(run.xpGained),
    levelsGained,
  };
}

/** Loot rows for display, whether banked or lost. */
export function lootRows(run: RunState): ReportRow[] {
  return currencyRows(run.loot.currency);
}
