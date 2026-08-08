/**
 * First run: one question — how do you want to fight — then straight into the
 * Fissure. The bench waits until you have something to spend.
 */
import { PLAYER_SKILLS } from '../data';
import { skillIcon } from './icons';
import type { GameState } from '../game/state';

const $ = (id: string) => document.getElementById(id)!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

let game: GameState;
let onChosen: (() => void) | null = null;

function render(): void {
  const host = $('welcome-skills');
  host.replaceChildren();

  // Yours only. Monsters have skills too, and offering a husk's fire bolt as
  // a starting choice would be offering a skill with no tree behind it.
  for (const skill of PLAYER_SKILLS) {
    const card = el('button', 'welcomecard') as HTMLButtonElement;
    card.append(skillIcon(skill.id, 52));
    card.append(el('span', 'welcomecard__name', skill.name));
    card.append(el('span', 'welcomecard__desc', skill.description));
    card.onclick = () => {
      // Fall back rather than block on an empty field — nobody should be
      // stopped at the door for not wanting to name themselves.
      const typed = ($('welcome-name') as HTMLInputElement).value.trim();
      game.character.name = typed.slice(0, 24) || 'Wanderer';
      game.character.skillId = skill.id;
      game.onboarded = true;
      $('welcome').hidden = true;
      onChosen?.();
    };
    host.append(card);
  }
}

/** Shows only on a game that hasn't chosen yet. */
export function initWelcome(state: GameState, chosen: () => void): void {
  game = state;
  onChosen = chosen;
  maybeShowWelcome();
}

export function maybeShowWelcome(): void {
  if (game.onboarded) {
    $('welcome').hidden = true;
    return;
  }
  render();
  $('welcome').hidden = false;
  ($('welcome-name') as HTMLInputElement).focus();
}
