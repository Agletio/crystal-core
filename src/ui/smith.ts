/**
 * THE SMITH'S SCREEN: one list of four tools read two ways. Buying and
 * reforging are the same rows with a different verb on the end, so they share
 * a window rather than making two the player has to tell apart.
 */
import { MATERIALS, MATERIAL_FAMILY_BY_ID, PROFESSION_BY_ID, SMITH, TOOLS } from '../data';
import type { ToolDef } from '../data';
import { makeMaterial } from '../economy';
import { nextRung, upgradeTool, whyNotUpgrade } from '../game/forge';
import { TOOL_PRICE, buyTool, holdsTool, takeFirstTool, whyNotBuyTool } from '../game/smith';
import { professionAt } from '../game/work';
import { toolRung } from '../sim/character';
import type { GameState } from '../game/state';
import { drawn, itemIcon } from './icons';
import { note } from './history';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let game: GameState;
type Doing = 'first' | 'shop' | 'upgrade';
let doing: Doing = 'shop';
let onChanged: (() => void) | undefined;

export function initSmith(state: GameState, changed?: () => void): void {
  game = state;
  onChanged = changed;
  $('smith-close').onclick = closeSmith;
}

export const smithButtonId = (toolId: string): string => `smith-${doing}-${toolId}`;

/** One row of the ledger, drawn exactly as the anvil's is. */
function needRow(icon: Element | null, what: string, held: number, wanted: number): HTMLElement {
  const row = el('div', `forgeneed ${held >= wanted ? 'forgeneed--ok' : 'forgeneed--short'}`);
  if (icon) row.append(icon);
  row.append(el('span', 'forgeneed__what', what));
  row.append(el('span', 'forgeneed__n', `${Math.floor(held)} / ${wanted}`));
  return row;
}

function card(tool: ToolDef): HTMLElement {
  const owned = toolRung(game.character, tool.id);
  const who = PROFESSION_BY_ID[tool.skill]?.name ?? tool.skill;
  const wrap = el('div', `crystal crystal--t${owned + 1}`);

  const head = el('div', 'crystal__head');
  const icon = drawn(tool.icon, 26);
  if (icon) head.append(icon);
  const title = el('div', 'crystal__title');
  const family = MATERIAL_FAMILY_BY_ID[tool.family];
  title.append(el('div', 'crystal__name', doing === 'shop' ? tool.rungs[0].name : tool.rungs[owned].name));
  title.append(el('div', 'socket__family', `${who} · takes ${family?.raw ?? tool.family}`));
  head.append(title);
  wrap.append(head);

  // THE FREE ONE. His last line is "pick one and it is yours", so the choice is
  // the same four rows with nothing owed on them.
  if (doing === 'first') {
    const button = el('button', 'mini', `Take the ${tool.rungs[0].name.toLowerCase()}`) as HTMLButtonElement;
    button.id = `smith-first-${tool.id}`;
    button.onclick = () => {
      if (!takeFirstTool(game, tool)) return;
      note(`${SMITH.name} hands you ${tool.rungs[0].name}`);
      closeSmith();
      onChanged?.();
    };
    wrap.append(button);
    return wrap;
  }

  if (doing === 'shop') {
    const needs = el('div', 'forgeneeds');
    needs.append(needRow(null, 'gold', Math.floor(game.wallet.gold ?? 0), TOOL_PRICE));
    wrap.append(needs);
    const why = whyNotBuyTool(game, tool);
    const button = el('button', 'mini', why ?? `Buy for ${TOOL_PRICE} gold`) as HTMLButtonElement;
    button.id = `smith-shop-${tool.id}`;
    button.disabled = why !== null;
    button.onclick = () => {
      if (!buyTool(game, tool)) return;
      note(`Bought ${tool.rungs[0].name}`);
      render();
      onChanged?.();
    };
    wrap.append(button);
    return wrap;
  }

  const next = nextRung(game, tool);
  if (next) {
    const needs = el('div', 'forgeneeds');
    needs.append(needRow(null, `${who} level`, professionAt(game, tool.skill).level, next.at));
    needs.append(needRow(null, 'gold', Math.floor(game.wallet.gold ?? 0), next.gold));
    const eats = MATERIAL_FAMILY_BY_ID[tool.eats];
    const stacks = MATERIALS.filter((m) => m.family === tool.eats);
    const held = stacks.reduce((n, m) => n
      + (((game.materials ?? []).find((i) => i.base === m.id && i.meta.done)?.meta.n as number) ?? 0), 0);
    needs.append(needRow(itemIcon(makeMaterial(stacks[0], 1, true), 22),
      eats?.one.toLowerCase() ?? 'material', held, next.eats));
    wrap.append(needs);
    wrap.append(el('div', 'crystal__grow', `${next.name} takes +${next.more} out of every node`));
  }
  // A TOOL YOU ARE NOT CARRYING cannot be reforged: he works the one in your
  // hand, and saying so is better than a button that does nothing.
  const why = holdsTool(game, tool) ? whyNotUpgrade(game, tool) : 'You are not carrying one.';
  const button = el('button', 'mini', why ?? `Reforge into ${next?.name}`) as HTMLButtonElement;
  button.id = `smith-upgrade-${tool.id}`;
  button.disabled = why !== null;
  button.onclick = () => {
    const got = upgradeTool(game, tool);
    if (!got) return;
    note(`Reforged: ${got.name}`);
    render();
    onChanged?.();
  };
  wrap.append(button);
  return wrap;
}

function render(): void {
  $('smith-purse').textContent = `${Math.floor(game.wallet.gold ?? 0)} gold`;
  $('smith-what').textContent = doing === 'first' ? 'Yours, for nothing'
    : doing === 'shop' ? 'What he will sell you' : 'What he will make better';
  $('smith-hint').textContent = doing === 'first'
    ? 'One of them. The other three he will sell you.'
    : doing === 'shop'
      ? `Every tool is ${TOOL_PRICE} gold. What separates them is which family they open.`
      : 'He works the tool you are carrying, and a level is what opens the next one.';
  const host = $('smith-list');
  host.replaceChildren();
  for (const tool of TOOLS) host.append(card(tool));
}

export function openSmith(what: Doing): void {
  doing = what;
  $('smith-title').textContent =
    what === 'first' ? 'Pick one' : what === 'shop' ? 'The Smith' : 'Reforging';
  render();
  $('smith').hidden = false;
}

export const closeSmith = (): void => { $('smith').hidden = true; };
export const isSmithOpen = (): boolean => !$('smith').hidden;
