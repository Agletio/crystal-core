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
const EDGE = 12; // pixels of window a clamped bubble keeps around itself

let beats: SceneBeat[] = [];
let at = 0;
let done: (() => void) | null = null;
/** Where the speaker was when this line went up. FROZEN for the length of it:
 *  a bubble that slides about while somebody paces is a bubble you cannot
 *  click. The camera still moves it, which is what it is anchored for. */
let stood: { x: number; y: number } | null = null;

export const isSpeaking = (): boolean => !$('speech').hidden;

/** The beat on screen, so the caller can act it out. */
export const speakingBeat = (): SceneBeat | undefined => (isSpeaking() ? beats[at] : undefined);

function show(): void {
  const beat = beats[at];
  if (!beat) return finish();
  $('speech-said').textContent = beat.said;
  $('speech').hidden = false;
  stood = null;
}

/** Every line has been said, or somebody pressed Escape through the lot. */
function finish(): void {
  $('speech').hidden = true;
  beats = [];
  stood = null;
  const after = done;
  done = null;
  after?.();
}

/** Straight to the end. Escape is one press and it answers the whole thing. */
export function endSpeech(): void {
  if (isSpeaking()) finish();
}

export function startSpeech(
  who: string,
  name: string,
  script: SceneBeat[],
  after: () => void
): void {
  beats = script;
  at = 0;
  done = after;
  $('speech-name').textContent = name;
  const face = $('speech-face');
  face.replaceChildren();
  const portrait = portraitIcon(who, 52);
  if (portrait) face.append(portrait);
  show();
}

/** Anchors a fixed box over a tile. The renderer answers in pixels from the
 *  surface's own corner, so the surface's place on the page is added here. */
export function anchor(node: HTMLElement, renderer: Renderer, on: { x: number; y: number }): void {
  const box = document.getElementById('run-canvas')?.getBoundingClientRect();
  if (!box) return;
  const seen = renderer.screenAt({ x: on.x, y: on.y - ABOVE });
  // The transform hangs the card ABOVE the point, so a TALL one over somebody
  // standing near the top of the room is drawn off the screen entirely. A
  // bubble a few tiles off the speaker beats one nobody can read.
  const size = node.getBoundingClientRect();
  const x = box.left + seen.x;
  const y = box.top + seen.y;
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));
  node.style.setProperty(
    '--sx',
    `${Math.round(clamp(x, size.width / 2 + EDGE, globalThis.innerWidth - size.width / 2 - EDGE))}px`
  );
  node.style.setProperty(
    '--sy',
    `${Math.round(clamp(y, size.height + EDGE, globalThis.innerHeight - EDGE))}px`
  );
}

/** Per frame, for whatever is currently anchored to a body. */
export function syncSpeech(renderer: Renderer, on: { x: number; y: number }): void {
  stood ??= { x: on.x, y: on.y };
  if (isSpeaking()) anchor($('speech'), renderer, stood);
  if (!$('met').hidden) anchor($('met-card'), renderer, stood);
  if (!$('graft').hidden) anchor($('graft-card'), renderer, stood);
}

export function initSpeech(): void {
  // Only the button advances it: nothing about a box of words says it is one.
  $('speech-next').addEventListener('click', () => {
    at++;
    show();
  });
}
