/**
 * First run, after the cast: your NAME, and then straight into the Fissure.
 * The trade brings a skill with it, so this is the one thing the cast hall
 * cannot answer.
 */
import { SKILL_BY_ID } from '../data';
import { TRADE_BY_ID } from '../trades';
import { equipSkill, mainSkillId } from '../sim/character';
import type { GameState } from '../game/state';

const $ = (id: string) => document.getElementById(id)!;

let game: GameState;
let onChosen: (() => void) | null = null;

/** Off the SLOT, so an old save reaching this screen holding something else is
 *  described rather than told. */
function arms(): string {
  const held = mainSkillId(game.character) ?? TRADE_BY_ID[game.character.trade ?? '']?.spec.skill;
  const skill = held ? SKILL_BY_ID[held] : undefined;
  return skill ? `You go down with ${skill.name}.` : 'You go down armed.';
}

function go(): void {
  // Fall back rather than block on an empty field — nobody should be stopped
  // at the door for not wanting to name themselves.
  const typed = ($('welcome-name') as HTMLInputElement).value.trim();
  game.character.name = typed.slice(0, 24) || 'Wanderer';
  const owed = TRADE_BY_ID[game.character.trade ?? '']?.spec.skill;
  if (!mainSkillId(game.character) && owed) equipSkill(game.character, owed);
  game.onboarded = true;
  $('welcome').hidden = true;
  onChosen?.();
}

/** Shows only on a game that hasn't chosen yet. */
export function initWelcome(state: GameState, chosen: () => void): void {
  game = state;
  onChosen = chosen;
  ($('welcome-go') as HTMLButtonElement).onclick = go;
  ($('welcome-name') as HTMLInputElement).onkeydown = (e) => {
    if (e.key === 'Enter') go();
  };
}

export function maybeShowWelcome(): void {
  if (game.onboarded) {
    $('welcome').hidden = true;
    return;
  }
  $('welcome-arms').textContent = arms();
  $('welcome').hidden = false;
  ($('welcome-name') as HTMLInputElement).focus();
}
