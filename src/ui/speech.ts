/**
 * A bubble over the head of whoever is talking. Built once and UPDATED per
 * frame, never rebuilt: `renderFlasks` / `syncFlasks` is the precedent, and a
 * node replaced sixty times a second is a node a click lands on after it has
 * left the document. Where it hangs is `Renderer.screenAt`, asked every frame,
 * because the camera moves under it and a drag mid-sentence has to keep the
 * words on the speaker rather than where the speaker was.
 */
import type { SceneBeat } from '../scenes';
import type { Renderer } from '../render/renderer';
import { portraitIcon } from './icons';

const $ = (id: string) => document.getElementById(id)!;

/** How far above a body the bubble's point sits, in tiles. */
const ABOVE = 0.6;

let beats: SceneBeat[] = [];
let at = 0;
let done: (() => void) | null = null;

export const isSpeaking = (): boolean => !$('speech').hidden;

/** The beat on screen, so the caller can act it out. */
export const speakingBeat = (): SceneBeat | undefined => (isSpeaking() ? beats[at] : undefined);

function show(): void {
  const beat = beats[at];
  if (!beat) return finish();
  $('speech-said').textContent = beat.said;
  $('speech').hidden = false;
}

/** Every line has been said, or somebody pressed Escape through the lot. */
function finish(): void {
  $('speech').hidden = true;
  beats = [];
  const after = done;
  done = null;
  after?.();
}

/** Straight to the end. Escape is one press and it answers the whole thing. */
export function endSpeech(): void {
  if (isSpeaking()) finish();
}

export function startSpeech(who: string, script: SceneBeat[], after: () => void): void {
  beats = script;
  at = 0;
  done = after;
  const face = $('speech-face');
  face.replaceChildren();
  const portrait = portraitIcon(who, 34);
  if (portrait) face.append(portrait);
  show();
}

/** Anchors a fixed box over a tile. The renderer answers in pixels from the
 *  surface's own corner, so the surface's place on the page is added here. */
export function anchor(node: HTMLElement, renderer: Renderer, on: { x: number; y: number }): void {
  const box = document.getElementById('run-canvas')?.getBoundingClientRect();
  if (!box) return;
  const seen = renderer.screenAt({ x: on.x, y: on.y - ABOVE });
  node.style.setProperty('--sx', `${Math.round(box.left + seen.x)}px`);
  node.style.setProperty('--sy', `${Math.round(box.top + seen.y)}px`);
}

/** Per frame, for whatever is currently anchored to a body. */
export function syncSpeech(renderer: Renderer, on: { x: number; y: number }): void {
  if (isSpeaking()) anchor($('speech'), renderer, on);
  if (!$('met').hidden) anchor($('met-card'), renderer, on);
}

export function initSpeech(): void {
  const bubble = $('speech');
  bubble.addEventListener('click', () => {
    at++;
    show();
  });
  // A bubble is a control, so the key that presses a control presses it.
  bubble.addEventListener('keydown', (event) => {
    const key = (event as KeyboardEvent).key;
    if (key !== 'Enter' && key !== ' ') return;
    event.preventDefault();
    at++;
    show();
  });
}
