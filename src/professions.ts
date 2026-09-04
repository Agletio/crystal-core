/**
 * WHAT A LEVEL BUYS, for the Professions page — *"click on a skill and get a
 * little breakdown of unlocks by level."* Every row is DERIVED from the table
 * that enforces it: `CRAFT.needs` for the tier a bench reaches, a tool's own
 * rungs for what a gatherer may carry. A page that disagrees with the game
 * cannot happen, and a new tier or rung writes its own line.
 */
import { CRAFT, PROFESSION, PROFESSION_BY_ID, TOOLS } from './data';

/** One step: the level, and what it opens. */
export interface Unlock {
  at: number;
  what: string;
}

/** Every step, in level order: a gatherer's off its tool, a maker's off tiers. */
export function unlocksFor(id: string): Unlock[] {
  const def = PROFESSION_BY_ID[id];
  if (!def) return [];
  const out: Unlock[] =
    def.kind === 'gather'
      ? TOOLS.filter((t) => t.skill === id).flatMap((tool) =>
          tool.rungs.map((rung, at) => ({
            at: rung.at,
            what: at === 0
              ? `${rung.name} — what everybody starts with`
              : `${rung.name}, taking +${rung.more} out of every node`,
          }))
        )
      : CRAFT.needs.map((at, tier) => ({
          at,
          what: `Tier ${tier + 1} bases, wanting ${CRAFT.each[tier]} of each of `
            + `${CRAFT.versions[tier]} world${CRAFT.versions[tier] === 1 ? '' : 's'}`
            + `${tier + 1 >= CRAFT.uniqueFrom ? " and a world's own material" : ''}`,
        }));
  return out.sort((a, b) => a.at - b.at);
}

/** The ladder in one line: what pays it, and where it tops out. */
export const saysProfession = (id: string): string => {
  const def = PROFESSION_BY_ID[id];
  if (!def) return '';
  const verb = def.kind === 'gather' ? 'Gathering' : 'Working';
  return `${verb} ${def.family} pays it. ${PROFESSION.maxLevel} is the top.`;
};
