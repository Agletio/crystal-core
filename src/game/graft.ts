/**
 * A graft: the Osteomancer writing a line no drop can roll over the one the
 * base came with. NOT a currency — a currency is carried to a bench, and every
 * one is reachable by the registries in `crafting.ts`, which clone straight
 * past `implicits` on purpose. This is carried to a man.
 *
 * The trade is the whole feature: what the base was FOR goes.
 */
import { FORGED, FORGED_BY_ID, RELIC_BY_ID } from '../data';
import type { ForgedDef } from '../data';
import { clone } from '../crafting';
import { gearKindOf, isUnique, relicsIn } from './state';
import type { GameState } from './state';
import type { Item, RolledMod } from '../types';

export const graftableKinds = (who?: string): string[] => [
  ...new Set(FORGED.filter((f) => who === undefined || f.who === who).flatMap((f) => f.kinds)),
];

/** Why this piece cannot be worked on HERE, or null. A unique's identity is
 *  all in `implicits`: graft over one and nothing can restore it. */
export function graftRefusal(item: Item, who?: string): string | null {
  if (item.kind !== 'gear') return 'nothing here is done to that';
  if (isUnique(item)) return 'a named piece is already what it is';
  const kind = gearKindOf(item);
  if (!kind || !graftableKinds(who).includes(kind)) return 'no use for that piece';
  return null;
}

/** What THIS person writes on this piece: the man who takes bodies has no
 *  opinion about a ring. */
export const forgedFor = (item: Item, who?: string): ForgedDef[] => {
  const kind = gearKindOf(item);
  if (!kind) return [];
  return FORGED.filter((f) => f.kinds.includes(kind) && (who === undefined || f.who === who));
};

function forgedLine(def: ForgedDef): RolledMod { // fixed: a bad roll is a gamble
  const tier = def.mod.tiers[def.mod.tiers.length - 1];
  return {
    entryId: `${def.mod.id}_forged`,
    defId: def.mod.id,
    group: 'implicit',
    slot: 'implicit',
    name: def.mod.name,
    tier: 0,
    tags: [...(def.mod.tags ?? []), 'implicit'],
    stats: tier.stats.map((s) => ({
      stat: s.stat,
      form: s.form,
      value: s.range[0],
      tags: s.tags ?? [],
    })),
  };
}

/**
 * The piece with its base line replaced. Pure, like `craft`. A second graft
 * replaces the first: the base's own line went the moment one landed, so
 * leaving a piece stuck on one choice makes a first graft unwalkbackable.
 */
export function graft(item: Item, forgedId: string): Item | null {
  const def = FORGED_BY_ID[forgedId];
  if (!def || graftRefusal(item)) return null;
  if (!forgedFor(item).includes(def)) return null;
  const out = clone(item);
  out.implicits = [forgedLine(def)];
  out.meta.grafted = forgedId;
  return out;
}

/** The relic this room is owed, or null. Holding one is the whole condition. */
export const relicFor = (game: GameState, sceneId: string): Item | null =>
  relicsIn(game).find((r) => RELIC_BY_ID[r.base]?.wants === sceneId) ?? null;

/** Spends the relic and writes the line, in place. */
export function spendRelic(game: GameState, relic: Item, item: Item, forgedId: string): Item | null {
  const made = graft(item, forgedId);
  if (!made) return null;
  const at = game.relics.indexOf(relic);
  if (at < 0) return null;
  game.relics.splice(at, 1);
  replaceGraft(game, item, made);
  return made;
}

function replaceGraft(game: GameState, was: Item, now: Item): void {
  const at = game.inventory.indexOf(was);
  if (at >= 0) {
    game.inventory[at] = now;
    return;
  }
  for (const [slot, worn] of Object.entries(game.character.equipment)) {
    if (worn === was) game.character.equipment[slot] = now;
  }
}
