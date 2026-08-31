/**
 * Turning a finished run into rows the results overlay can display, and banking
 * what it earned. The overlay knows nothing about what the rows mean, so a new
 * stat is a line in buildReport() and nothing else.
 */
import { bagsFull, bankLoot, grantFirstClear } from './state';
import type { GameState } from './state';
import { advanceSocketed, spendSocketed } from './crystals';
import { advanceWork, professionAt, spendMeal } from './work';
import type { Finished } from './work';
import type { ModBurn } from './crystals';
import type { CrystalGain } from './crystals';
import { grant } from '../economy';
import { DAMAGE_TYPE_BY_ID, MAIN_SLOT, PROFESSION_BY_ID, SKILL_SLOTS } from '../data';
import { addXp, addSkillXp, equippedSkill } from '../sim/character';
import type { RunState } from '../sim/run';
import type { Item, RolledMod } from '../types';

export interface ReportRow {
  label: string;
  value: string;
  /** Draws attention: used for the things you actually lost. */
  bad?: boolean;
}

export interface RunReport {
  /** `left` is walking out mid-descent: it KEEPS the loot and buys no progress. */
  status: 'cleared' | 'died' | 'left';
  cleared: boolean;
  headline: string;
  rows: ReportRow[];
  /** Currency actually banked, already rounded. Empty when the run was lost. */
  banked: Record<string, number>;
  items: Item[];
  /** Crystals that gained a tier for being socketed through this. */
  levelled: CrystalGain[];
  /** Rolls that ran out on this descent. A dry crystal ends an Enter-chain. */
  burnt: ModBurn[];
  /** Jobs that came off a station while you were down there. */
  worked: Finished[];
  /** The meal that ran out on this descent, if one did. Ends an Enter-chain? No
   *  — a meal is a buff you replace, never a thing you cannot descend without. */
  eaten: RolledMod | null;
  /** True when there was loot and the hero died holding it. */
  lostLoot: boolean;
  /** Whether the bag is at or over its limit now this run has banked. */
  bagsFull: boolean;
  /** What the auto-sell filter turned into gold on the way up. */
  filtered: { sold: number; gold: number };
  xp: number;
  levelsGained: number;
}

const round = (n: number) => Math.max(0, Math.round(n));

function currencyRows(currency: Record<string, number>): ReportRow[] {
  return Object.entries(currency)
    .filter(([, n]) => round(n) > 0)
    .map(([id, n]) => ({ label: id, value: `+${round(n)}` }));
}

/** Loot comes home unless you DIED holding it, and that is only ever THIS
 *  descent: every clear before it banked as it happened. */
export function buildReport(game: GameState, run: RunState, left = false): RunReport {
  const cleared = run.status === 'cleared' && !left;
  const keeps = cleared || left;
  const hadLoot = Object.values(run.loot.currency).some((n) => round(n) > 0);

  const banked: Record<string, number> = {};
  let levelled: CrystalGain[] = [];
  let burnt: ModBurn[] = [];
  let worked: Finished[] = [];
  let eaten: RolledMod | null = null;
  let filtered = { kept: [] as Item[], sold: 0, gold: 0 };

  if (keeps) {
    for (const [id, amount] of Object.entries(run.loot.currency)) {
      const n = round(amount);
      if (n <= 0) continue;
      banked[id] = n;
      grant(game.wallet, id, n);
    }
    // Through the FILTER and into the bag. Nothing is refused here, so
    // capacity is a thing checked between runs rather than during one, and a
    // descent that overfills the bag by three is a bag reading 35/32.
    filtered = bankLoot(game, run.loot.items);
    if (filtered.gold > 0) banked.gold = (banked.gold ?? 0) + filtered.gold;
  }

  if (cleared) {
    game.clears = (game.clears ?? 0) + 1; // before `giftWaiting` is asked

    // The opening payout. Folded into the same banked/items shape so the
    // overlay shows it as loot rather than it appearing silently in the bag.
    const first = grantFirstClear(game);
    if (first) {
      banked.gold = (banked.gold ?? 0) + first.gold;
      for (const [id, n] of Object.entries(first.currency)) {
        banked[id] = (banked[id] ?? 0) + n;
      }
    }

    // Socketed only. A crystal in a bag is a crystal that was not used, and
    // this is what makes a socket spent on a fresh one cost something.
    levelled = advanceSocketed(game, run.set);
    burnt = spendSocketed(game);
    // THE STATIONS MOVE ON A CLEAR and on nothing else. A walk out keeps the
    // loot and buys no progress, and a job is progress.
    worked = advanceWork(game);
    // WHAT YOU ATE burns down on a clear too, off the same rule.
    eaten = spendMeal(game);
  }

  // XP is earned either way — you learned something on the way to dying.
  const xp = Math.round(run.xpGained);
  const levelsGained = addXp(game.character, xp);

  // EVERY equipped skill shares the same XP, over the slot table. Paid to the
  // main one alone, a mover's web sits at level 1 holding one point forever.
  // "Committing to one skill advances its tree" is about the MAIN slot, and
  // you only ever hold one mover and one passive.
  let skillLevels = 0;
  for (const slot of SKILL_SLOTS) {
    const held = equippedSkill(game.character, slot.id);
    if (!held) continue;
    const gained = addSkillXp(game.character, held, xp);
    if (slot.id === MAIN_SLOT) skillLevels = gained;
  }

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

  if (keeps && filtered.kept.length > 0) {
    rows.push({ label: 'into your bags', value: String(filtered.kept.length) });
  }
  // What the filter did, said in what it paid: a screen you set once and then
  // never open again must still report itself every single descent.
  if (filtered.sold > 0) {
    rows.push({ label: 'sold by the filter', value: `${filtered.sold} for ${filtered.gold} gold` });
  }
  for (const gain of levelled) {
    rows.push({ label: gain.crystal.name, value: `+${gain.levels} level` });
  }
  // WHAT RAN OUT — the whole point of a use is that you feel it end.
  for (const burn of burnt) {
    rows.push({ label: `${burn.crystal.name} · ${burn.name}`, value: 'used up' });
  }

  // WHAT CAME OFF A STATION while you were down there, said with the level it
  // bought: a job that finished silently is a job nobody knew was running.
  for (const done of worked) {
    const profession = PROFESSION_BY_ID[done.job.profession];
    rows.push({
      label: `${profession?.name ?? done.job.profession} · ${done.item.name}`,
      value: done.levels > 0
        ? `+${done.job.n}, level ${professionAt(game, done.job.profession).level}`
        : `+${done.job.n}`,
    });
  }

  if (eaten) rows.push({ label: eaten.name, value: 'eaten up', bad: true });

  // Damage taken, split by type — worst first and under its own name, because
  // a monster brings its own element now and a descent routinely shows three
  // of these. What you read off it is which resistance to go and find.
  const totalTaken = Object.values(run.damageTaken).reduce((n, v) => n + v, 0);
  if (run.blocked > 0) {
    rows.push({ label: 'hits blocked', value: String(run.blocked) });
  }
  if (totalTaken > 0) {
    rows.push({ label: 'damage taken', value: String(round(totalTaken)) });
    const split = Object.entries(run.damageTaken)
      .filter(([, amount]) => round(amount) > 0)
      .sort((a, b) => b[1] - a[1]);
    for (const [type, amount] of split) {
      rows.push({
        label: `  ${DAMAGE_TYPE_BY_ID[type]?.name ?? type}`,
        value: `${round(amount)}  (${Math.round((amount / totalTaken) * 100)}%)`,
      });
    }
  }

  return {
    status: left ? 'left' : cleared ? 'cleared' : 'died',
    cleared,
    headline: left ? 'Back at camp' : cleared ? 'Fissure cleared' : 'You died',
    rows,
    banked,
    items: keeps ? [...filtered.kept] : [],
    levelled,
    burnt,
    worked,
    eaten,
    lostLoot: !keeps && hadLoot,
    bagsFull: bagsFull(game),
    filtered: { sold: filtered.sold, gold: filtered.gold },
    xp: Math.round(run.xpGained),
    levelsGained,
  };
}

/** Loot rows for display, whether banked or lost. */
export function lootRows(run: RunState): ReportRow[] {
  return currencyRows(run.loot.currency);
}
