/**
 * WHAT A LEVEL BUYS, for the Professions page — *"click on a skill and get a
 * little breakdown of unlocks by level."* Every row is DERIVED from the table
 * that enforces it: `CRAFT.needs` for the tier a bench reaches, a tool's own
 * rungs for what a gatherer may carry. A page that disagrees with the game
 * cannot happen, and a new tier or rung writes its own line.
 */
import { CRAFT, MOD_TIERS, PROFESSION, PROFESSION_BY_ID, SELECT, TOOLS } from './data';

/** One step: the level, and what it opens. */
export interface Unlock {
  at: number;
  what: string;
}

/** Every step, in level order: a gatherer's off its tool, a maker's off tiers. */
export function unlocksFor(id: string): Unlock[] {
  const def = PROFESSION_BY_ID[id];
  if (!def) return [];
  if (id === 'cooking') return [{ at: 1, what: 'Cook fish into meals. Higher Cooking levels improve their bonuses and the number of clears they last.' }];
  const out: Unlock[] =
    def.kind === 'gather'
      ? TOOLS.filter((t) => t.skill === id).flatMap((tool) =>
          tool.rungs.map((rung, at) => ({
            at: rung.at,
            what: at === 0
              ? `${rung.name} — starting tool`
              : `${rung.name} — +${rung.more} materials gathered per node`,
          }))
        )
      : CRAFT.needs.map((at, tier) => ({
          at,
          what: `Tier ${tier + 1} bases — requires ${CRAFT.each[tier]} processed materials from each of `
            + `${CRAFT.versions[tier]} world${CRAFT.versions[tier] === 1 ? '' : 's'}`
            + `${tier + 1 >= CRAFT.uniqueFrom ? " and a rare world material" : ''}`,
        }));
  if (id === 'jewelling') out.push(...SELECT.tierAt.map((at, rank) => ({
    at, what: `Craft modifier rank ${rank + 1} at the bench — T${MOD_TIERS - rank} for modifiers with seven tiers`,
  })));
  return out.sort((a, b) => a.at - b.at);
}

/** The ladder in one line: what pays it, and where it tops out. */
export const saysProfession = (id: string): string => {
  const def = PROFESSION_BY_ID[id];
  if (!def) return '';
  const earns = def.kind === 'gather' ? `Gathering ${def.family} earns XP.`
    : id === 'cooking' ? 'Cooking fish earns XP.'
    : id === 'jewelling' ? 'Processing gems, cutting rough shards and crafting bases that require Jewelling earn XP.'
    : 'Processing materials and crafting bases that require this profession earn XP.';
  return `${earns} Maximum level: ${PROFESSION.maxLevel}.`;
};
