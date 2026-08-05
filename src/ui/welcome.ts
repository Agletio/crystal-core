/**
 * First run: pick a skill, then straight into the Fissure.
 *
 * The old first thirty seconds were a crafting bench you had no currency for
 * and a map list you had two entries in. This asks the one question that
 * actually matters — how do you want to fight — and then puts you in a fight.
 *
 * Nothing to buy and nothing to read first. The bench can wait until you have
 * something to spend.
 */
import { SKILLS } from '../data';
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

  for (const skill of SKILLS) {
    const card = el('button', 'welcomecard') as HTMLButtonElement;
    card.append(skillIcon(skill.id, 52));
    card.append(el('span', 'welcomecard__name', skill.name));
    card.append(el('span', 'welcomecard__desc', skill.description));
    card.onclick = () => {
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
}
