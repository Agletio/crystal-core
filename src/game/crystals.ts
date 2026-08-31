/**
 * What owning crystals turns into over time: they level while socketed, and the
 * Lampwright hands over every one the campaign pays for.
 *
 * A crystal is never spent, so this is the only thing that changes one without
 * a currency being poured on it — which is why the level, the base, the name
 * and the capacity are all rewritten together.
 */
import {
  CAMPAIGN_REWARD,
  LADDER,
  CRYSTAL_LEVELS,
  CRYSTAL_XP,
  INTRO,
  LAMPWRIGHT,
  RUN_SLOTS,
  SKILL_BY_ID,
  crystalName,
} from '../data';
import { mainSkillId, pointsAvailable } from '../sim/character';
import { armForSkill, giveGift } from './state';
import type { GameState } from './state';
import { grant, makeCrystal } from '../economy';
import { crystalFamily } from '../sim/crystal';
import { campaignDone, campaignPrize, climbed } from '../ladder';
import type { RunSet } from '../sim/crystal';
import type { Item, RolledMod } from '../types';

/** Every crystal you own: socketed, or in the collection. */
export function ownedCrystals(game: GameState): Item[] {
  return [...Object.values(game.sockets ?? {}), ...(game.crystals ?? [])];
}

// --- the Lampwright ---------------------------------------------------------

/**
 * Everything owed at the mouth of a cleared descent. SCHEDULED off what has
 * been given, how many descents have been cleared and the clear itself — never
 * rolled, so a screen can quote it rather than describe it.
 */
export interface Waiting {
  weapon: boolean;
  crystal: boolean;
  /** The whole campaign's reward. He holds it until you come and take it. */
  campaign: boolean;
}

/** The ACTIVE skill at `INTRO.crystalSkillLevel` with every point of it spent:
 *  the level buys the points, the allocation spends them, and WHICH node they
 *  went on is the player's own decision. Nothing can dead-end on it. */
export function crystalEarned(game: GameState): boolean {
  const skillId = mainSkillId(game.character);
  const progress = game.character.skills?.[skillId];
  if (!progress || progress.level < INTRO.crystalSkillLevel) return false;
  return pointsAvailable(skillId, progress) === 0;
}

/** THE LAMPWRIGHT OWES THREE THINGS AND NO MORE: the weapon your skill wants,
 *  your FIRST crystal, and everything finishing the climb pays. **He is the
 *  person the campaign ends at**, so its reward is handed over in his scene. */
export function giftWaiting(game: GameState): Waiting | null {
  const given = game.given ?? [];
  const weapon = !given.includes('weapon');
  const crystal = !weapon && !given.includes('crystal') && crystalEarned(game);
  const campaign =
    !weapon && !crystal && !game.character.paidCampaign && campaignDone(game.character);
  if (!weapon && !crystal && !campaign) return null;
  return { weapon, crystal, campaign };
}

/** What the collection screen says about the next meeting. */
export function giftSchedule(game: GameState): string {
  const who = LAMPWRIGHT.name;
  const given = game.given ?? [];
  if (!given.includes('weapon')) {
    return `${who} owes you the weapon your skill wants. Find him below.`;
  }
  if (!given.includes('crystal')) {
    if (crystalEarned(game)) {
      return `${who} has one for you. Go and talk to him in the camp.`;
    }
    const skillId = mainSkillId(game.character);
    const name = SKILL_BY_ID[skillId]?.name ?? 'your skill';
    const progress = game.character.skills?.[skillId];
    const spare = progress ? pointsAvailable(skillId, progress) : 1;
    return (
      `${who} has your first crystal for you in the camp once ` +
      `${name} is level ${INTRO.crystalSkillLevel} with every one of its points spent. ` +
      `${name} is level ${progress?.level ?? 1}, with ${spare} unspent.`
    );
  }
  // NAMING WHAT IS LEFT: "somewhere below" is what a player cannot act on.
  if (game.character.paidCampaign) return `${who} has nothing else.`;
  if (campaignDone(game.character)) {
    return `${who} is holding ${campaignPrize()} for finishing the climb. Go and talk to him in the camp.`;
  }
  const left = LADDER.zones.filter((zone, z) => climbed(game.character, z) < zone.rungs);
  return (
    `${who} has ${campaignPrize()} for you once the climb is finished. ` +
    `${left.map((z) => z.name).join(', ')} still ${left.length === 1 ? 'stands' : 'stand'} ` +
    `between you and it.`
  );
}

/** Everything one meeting puts in your hands. Currency has no slot, and `says`
 *  is what was handed over that is not a thing you can hold at all. */
export interface Handover {
  items: Item[];
  currency: Record<string, number>;
  says: string[];
}

export function takeHandover(game: GameState, waiting: Waiting): Handover {
  const items: Item[] = [];
  const currency: Record<string, number> = {};
  const says: string[] = [];

  if (waiting.weapon) {
    const gift = armForSkill(game); // marks `given` itself
    if (gift) items.push(gift.item);
  }
  if (waiting.crystal) {
    game.given = [...(game.given ?? []), 'crystal'];
    const crystal = makeCrystal(LAMPWRIGHT.level, LAMPWRIGHT.family);
    // The one arranged roll in the game, and it rides on the crystal so the
    // shard behaves the same way everywhere else.
    crystal.meta.scripted = INTRO.scriptedMod;
    giveGift(game, crystal);
    grant(game.wallet, INTRO.scriptedCurrency, 1);
    currency[INTRO.scriptedCurrency] = 1;
    items.push(crystal);
  }
  if (waiting.campaign) {
    // The flag IS the Tallies: `trialPointsFor` reads it, so the Reckoning
    // fills the moment he lets go of them and never before.
    game.character.paidCampaign = true;
    for (let i = 0; i < CAMPAIGN_REWARD.crystals; i++) {
      const crystal = makeCrystal(1, 'normal');
      giveGift(game, crystal);
      items.push(crystal);
    }
    says.push(`${CAMPAIGN_REWARD.points} Tallies`);
  }
  return { items, currency, says };
}

// --- levelling --------------------------------------------------------------

export const crystalXp = (crystal: Item): number => Number(crystal.meta.xp) || 0;

/** The highest level that much experience has paid for. */
export function levelForXp(xp: number): number {
  let level = CRYSTAL_LEVELS[0].level;
  for (const def of CRYSTAL_LEVELS) {
    if (xp >= def.xp) level = def.level;
  }
  return level;
}

/** The level a crystal is standing at, whatever its stored fields say. */
export const crystalLevel = (crystal: Item): number =>
  Number(crystal.meta.level) || levelForXp(crystalXp(crystal));

export interface CrystalProgress {
  level: number;
  xp: number;
  /** Total needed for the next level, or null at the top. */
  need: number | null;
  /** 0–1 through the current level. 1 at the top. */
  fraction: number;
}

export function crystalProgress(crystal: Item): CrystalProgress {
  const xp = crystalXp(crystal);
  const level = crystalLevel(crystal);
  const at = CRYSTAL_LEVELS.find((t) => t.level === level);
  const next = CRYSTAL_LEVELS.find((t) => t.level === level + 1);
  if (!next) return { level, xp, need: null, fraction: 1 };
  const floor = at?.xp ?? 0;
  return {
    level,
    xp,
    need: next.xp,
    fraction: Math.max(0, Math.min(1, (xp - floor) / (next.xp - floor))),
  };
}

/** What one cleared descent pays every crystal that was socketed for it. */
export const xpForClear = (danger: number): number =>
  CRYSTAL_XP.perClear * (1 + Math.max(0, danger) / CRYSTAL_XP.perDanger);

/**
 * IN PLACE, and every derived field with it. Returns the levels gained, so a
 * crystal that jumped two rungs on one enormous run reports both.
 */
export function addCrystalXp(crystal: Item, xp: number): number {
  if (crystal.kind !== 'crystal') return 0;
  const was = crystalLevel(crystal);
  crystal.meta.xp = crystalXp(crystal) + xp;

  // Never down. A crystal whose stored xp is behind its level — one granted
  // before xp was tracked — climbs from where it stands.
  const now = levelForXp(crystalXp(crystal));
  if (now <= was) return 0;

  const def = CRYSTAL_LEVELS.find((t) => t.level === now)!;
  const family = crystalFamily(crystal);
  crystal.meta.level = now;
  crystal.base = `crystal_t${now}`;
  crystal.name = crystalName(now, family);
  crystal.tags = ['crystal', `level${now}`, family];
  // Capacity, which is the whole of what a level is. Nothing rolled is
  // touched: room is added above what is already on it.
  crystal.slots = { ...crystal.slots, mod: def.mods };
  return now - was;
}

export interface CrystalGain {
  crystal: Item;
  levels: number;
}

/** A roll that ran out on the descent just cleared. */
export interface ModBurn { crystal: Item; name: string }

/** WHAT A CLEAR SPENDS: one descent off every roll on every socketed crystal,
 *  dropped at zero. It is what makes four permanent sockets a live decision —
 *  the sockets do not move, what is on them runs out. A DEATH SPENDS NOTHING,
 *  because failing a rung already costs nothing but time. */
export function spendSocketed(game: GameState): ModBurn[] {
  const gone: ModBurn[] = [];
  for (const crystal of Object.values(game.sockets ?? {})) {
    const kept: RolledMod[] = [];
    for (const mod of crystal.mods) {
      if (mod.uses === undefined) {
        kept.push(mod);
      } else if (mod.uses > 1) {
        kept.push({ ...mod, uses: mod.uses - 1 });
      } else {
        gone.push({ crystal, name: mod.name });
      }
    }
    crystal.mods = kept;
  }
  return gone;
}

/** Only while SOCKETED: a socket spent on a fresh crystal is the whole cost. */
export function advanceSocketed(game: GameState, set: RunSet): CrystalGain[] {
  const xp = xpForClear(set.rewards.danger);
  const out: CrystalGain[] = [];
  for (const crystal of Object.values(game.sockets ?? {})) {
    const levels = addCrystalXp(crystal, xp);
    if (levels > 0) out.push({ crystal, levels });
  }
  return out;
}

// --- what a descent WAS -----------------------------------------------------

/** What one cleared descent WAS, for the Ledger to be counted off it. */
export interface QuestFacts {
  set: RunSet;
  /** Seconds it took. */
  elapsed: number;
  /** The crystals it was launched with, already paid their experience. */
  socketed: Item[];
  hoards?: number; // Hoards OPENED during it; absent for a caller with no run
  veins?: number; // Veins opened during it — a lock that pays currency
  welled?: number; // welled bodies put down during it
  wardens?: number; // Wardens put down during it
  bearers?: number; // Bearers put down during it
}

