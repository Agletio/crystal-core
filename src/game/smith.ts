/**
 * THE SMITH'S COUNTER, where every tool comes from: one free in his own scene,
 * the rest for gold. A tool is an ITEM, so nothing here mints one by hand —
 * `makeGear` off the rung's base, `addItem` where every other piece goes.
 */
import { SMITH, TOOLS, TOOL_BY_ID, toolBaseId } from '../data';
import type { ToolDef } from '../data';
import { makeGear } from '../economy';
import { addItem } from './state';
import type { GameState, Placement } from './state';

/** Flat and the same for all four: what separates them is which family. */
export const TOOL_PRICE = 250;

export const owesFirstTool = (game: GameState): boolean =>
  !(game.given ?? []).includes(SMITH.gave);

export function holdsTool(game: GameState, tool: ToolDef): boolean {
  const bases = tool.rungs.map((_, at) => toolBaseId(tool, at));
  if (game.inventory.some((i) => bases.includes(i.base))) return true;
  return Object.values(game.character.equipment).some((i) => i && bases.includes(i.base));
}

/** `lost` is the only answer meaning it never arrived. */
export function giveTool(game: GameState, tool: ToolDef): Placement {
  return addItem(game, makeGear(toolBaseId(tool, 0), 1));
}

export function takeFirstTool(game: GameState, tool: ToolDef): boolean {
  if (!owesFirstTool(game) || giveTool(game, tool) === 'lost') return false;
  game.given = [...(game.given ?? []), SMITH.gave];
  return true;
}

/** Why one cannot be bought, or null — in NUMBERS, like every refusal. */
export function whyNotBuyTool(game: GameState, tool: ToolDef): string | null {
  if (holdsTool(game, tool)) return `You are carrying a ${tool.name.toLowerCase()} already.`;
  const gold = Math.floor(game.wallet.gold ?? 0);
  if (gold < TOOL_PRICE) return `${TOOL_PRICE} gold needed, you have ${gold}.`;
  return null;
}

export function buyTool(game: GameState, tool: ToolDef): boolean {
  if (whyNotBuyTool(game, tool)) return false;
  if (giveTool(game, tool) === 'lost') return false;
  game.wallet.gold = (game.wallet.gold ?? 0) - TOOL_PRICE;
  return true;
}

export const toolsOnOffer = (): ToolDef[] => TOOLS.map((t) => TOOL_BY_ID[t.id]);
