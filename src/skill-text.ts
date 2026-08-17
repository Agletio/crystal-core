/**
 * WHAT A SKILL DOES FOR THIS CHARACTER, one fact a line. Here rather than in a
 * panel so the demo can hold what the hover says against what the sim asks —
 * and because a slot's numbers move with the tree, the trade and every piece
 * worn, which is exactly what a table's printed line cannot say.
 */
import { DAMAGE_TYPE_BY_ID, SKILL_BY_ID } from './data';
import { GRANT_BY_ID } from './sim/grants';
import { characterStats, damageDetail, treeGrants } from './sim/stats';
import { equippedSkill } from './sim/character';
import type { SkillDef } from './types';
import type { Character } from './sim/character';

const round = (n: number) => Math.round(n).toLocaleString();
const trim = (n: number) =>
  Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(n < 1 ? 2 : 1);

/** What the MAIN slot is worth, which is every damage number in the game. */
export function mainWorkings(character: Character): string[] {
  const detail = damageDetail(character);
  const stats = characterStats(character);
  const spell = detail.skill.tags.includes('spell');
  const type = DAMAGE_TYPE_BY_ID[detail.breakdown.baseType]?.name ?? detail.breakdown.baseType;
  const use = spell ? 'cast' : 'hit';
  return [
    detail.seconds > 0
      ? `${round(detail.perApplication)} ${type} damage over ${trim(detail.seconds)}s per ${use}`
      : `${round(detail.perApplication)} ${type} damage per ${use}`,
    `${trim(stats.attacksPerSecond)} ${spell ? 'casts' : 'attacks'} per second`,
    `${round(detail.perSecond)} damage per second`,
    `${Math.round(stats.critChance)}% critical chance for ×${(2 + stats.critMultiplier / 100).toFixed(2)}`,
    `${trim(stats.manaCost)} mana per use`,
    `${trim(stats.attackRange)} tile reach`,
  ];
}

/** A slot that is not the main one: what it GRANTS, and a mover's own two
 *  numbers read THROUGH the grants — off `params` a web that bought half the
 *  wait would say nothing about having done so. */
export function slotWorkings(skill: SkillDef, character: Character): string[] {
  const grants = treeGrants(character);
  const lines: string[] = [];
  const reach = skill.params?.distance;
  const wait = skill.params?.cooldown;
  if (typeof reach === 'number' && typeof wait === 'number') {
    const further = typeof grants.moveDistance === 'number' ? grants.moveDistance : 1;
    const sooner = typeof grants.moveCooldown === 'number' ? grants.moveCooldown : 1;
    lines.push(`${trim(reach * further)} tiles every ${trim(wait * sooner)}s, on its own`);
  }
  for (const [id, value] of Object.entries(skill.grants ?? {})) {
    const said = GRANT_BY_ID[id]?.say?.(value);
    if (said) lines.push(said);
  }
  return lines;
}

/** Either of the above, by which slot it is — the one seam a hover needs. */
export function skillWorkings(character: Character, slotId: string, mainSlot: string): string[] {
  const held = SKILL_BY_ID[equippedSkill(character, slotId) ?? ''];
  if (!held) return [];
  return slotId === mainSlot ? mainWorkings(character) : slotWorkings(held, character);
}
