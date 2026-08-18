/**
 * WHAT A HERO IS HOLDING, pinned at the hand. Not the body: a trade's sprite
 * wears nothing. A weapon is one sprite over the body at a HAND, so every trade
 * holds every weapon for no generations — the picture is the item's own icon,
 * drawn upright with its grip in the middle, which is what makes it free. A
 * hand is authored PER FRAME, never off a formula: an overhead smash and a
 * backhand are not the same arc, and nothing in a body's frames says which.
 */
import type { Cel } from './sprites';
import { generatedBeat } from './sprites';

export interface HeldSpec {
  icon: string;
  grip: [number, number]; // where the hand grips it, a fraction of its own grid
  size: number; // tiles the whole grid covers; the body's is `Entity.scale`
  /** Radians facing EAST that hang its BUSINESS END DOWN: a sword is drawn
   *  blade-down and takes none, a mace head-UP and takes half a turn — which
   *  is what lets one hand table swing all of them. */
  turn: number;
  behind?: boolean;
}

/** By the base's `art` — a weapon's is its FAMILY, so one row covers a rung. */
export const HELD: Record<string, HeldSpec> = {
  bow: { icon: 'gear_bow', grip: [0.47, 0.5], size: 0.85, turn: 0 },
  sword: { icon: 'gear_sword', grip: [0.5, 0.28], size: 1.15, turn: 0.5 },
  dagger: { icon: 'gear_dagger', grip: [0.5, 0.3], size: 0.7, turn: 0.5 },
  mace: { icon: 'gear_mace', grip: [0.5, 0.7], size: 1.0, turn: Math.PI + 0.5 },
  wand: { icon: 'gear_wand', grip: [0.5, 0.55], size: 0.62, turn: Math.PI + 0.5 },
};

export interface Hand {
  x: number; // across the BODY's grid from the left, facing EAST
  y: number; // down the BODY's grid from the top
  turn: number; // added to the weapon's own rest angle, CLOCKWISE on screen
}

/** The fallback, and what idle and walk want. */
const REST: Hand = { x: 0.61, y: 0.51, turn: 0 };

export const HERO_HANDS: Record<string, Record<string, Hand[]>> = {
  alchemist: {
    attack: [ // an OVERHEAD SMASH: at the side, up behind, straight up, through
      { x: 0.68, y: 0.55, turn: 0.5 },
      { x: 0.76, y: 0.34, turn: 2.4 },
      { x: 0.66, y: 0.22, turn: 3.1 },
      { x: 0.55, y: 0.5, turn: -0.9 },
    ],
    cast: [ // an OVERARM THROW: cocked past the ear, slung down, hanging
      { x: 0.44, y: 0.34, turn: 1.6 },
      { x: 0.58, y: 0.28, turn: 0.4 },
      { x: 0.72, y: 0.4, turn: -1.1 },
      { x: 0.74, y: 0.52, turn: -1.5 },
      { x: 0.66, y: 0.56, turn: -0.4 },
    ],
  },
  aethermancer: {
    attack: [ // a BACKHAND: drawn across the chest, then thrown out and away
      { x: 0.44, y: 0.46, turn: 1.5 },
      { x: 0.52, y: 0.42, turn: 0.6 },
      { x: 0.68, y: 0.44, turn: -0.8 },
      { x: 0.76, y: 0.5, turn: -1.4 },
    ],
    cast: [
      { x: 0.46, y: 0.38, turn: 1.8 },
      { x: 0.56, y: 0.33, turn: 0.6 },
      { x: 0.7, y: 0.38, turn: -0.9 },
      { x: 0.75, y: 0.46, turn: -1.4 },
      { x: 0.68, y: 0.52, turn: -0.5 },
    ],
  },
};

/** The hand for the frame a body is showing. A BOW never takes one: it is held
 *  out and drawn, so an arm punching past it reads as the bow arm going with
 *  it, where a swept bow reads as a club. */
export function handAt(sprite: string, art: string, cel: Cel): Hand {
  if (art === 'bow') return REST;
  const beat = generatedBeat(sprite, cel);
  return HERO_HANDS[sprite]?.[beat.state]?.[beat.at] ?? REST;
}
