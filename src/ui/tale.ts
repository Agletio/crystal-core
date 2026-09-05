/**
 * A TALE — full-screen art with a caption under it, one panel a click, and the
 * camp nowhere on the glass. *"You return to the camp but it goes right into
 * this full screen image. You don't see the camp at all."*
 *
 * It is not a window. Windows stack, several are up at once and Escape closes
 * the top one; this covers everything and the only thing a press can do is
 * advance it, so it is above the window band and outside `SCREENS`.
 */
import { TALES } from '../data';
import type { TalePanel } from '../data';
import { SCENE_ART } from '../render/generated-scene';
import { takeHeard } from '../game/scenes';
import type { GameState } from '../game/state';

const $ = (id: string) => document.getElementById(id)!;

let panels: TalePanel[] = [];
let at = 0;
let after: (() => void) | null = null;

export const isTaleUp = (): boolean => !$('tale').hidden;

/** WHOSE STORY IS OWED. Told once: `takeHeard` is what the meeting queue reads,
 *  so the man after him is only down there once this has been watched. */
export function playTale(game: GameState, id: string, then: () => void): boolean {
  const held = TALES[id];
  if (!held?.length) {
    takeHeard(game, id);
    return false;
  }
  panels = held;
  at = 0;
  after = () => {
    takeHeard(game, id);
    then();
  };
  draw();
  $('tale').hidden = false;
  return true;
}

/** The whole interface: anywhere on the glass, or any key. */
export function stepTale(): void {
  if (!isTaleUp()) return;
  at += 1;
  if (at < panels.length) {
    draw();
    return;
  }
  $('tale').hidden = true;
  const done = after;
  after = null;
  done?.();
}

function draw(): void {
  const panel = panels[at];
  const art = panel ? SCENE_ART[panel.art] : undefined;
  const shot = $('tale-art') as HTMLImageElement;
  if (art) {
    shot.src = art.png;
    shot.width = art.w;
    shot.height = art.h;
  }
  shot.hidden = !art;
  $('tale-said').textContent = panel?.said ?? '';
  $('tale-count').textContent = `${at + 1} / ${panels.length}`;
}

export function initTale(): void {
  $('tale').addEventListener('click', stepTale);
}
