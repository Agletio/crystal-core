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

/** Both hands, in the order they are drawn. `main` is `EQUIP_SLOTS`' weapon
 *  and `off` is its off hand, so a bow emptying the off hand empties this. */
export const HANDS_DRAWN = ['off', 'main'] as const;
export type HandSlot = (typeof HANDS_DRAWN)[number];

export interface HeldSpec {
  icon: string;
  grip: [number, number]; // where the hand grips it, a fraction of its own grid
  size: number; // tiles the whole grid covers; the body's is `Entity.scale`
  /** Radians facing EAST that hang its BUSINESS END DOWN: a sword is drawn
   *  blade-down and takes none, a mace head-UP and takes half a turn — which
   *  is what lets one hand table swing all of them. */
  turn: number;
  /** Which hand run it rides. `off` is the arm that does NOT strike — a bow
   *  and a shield both live there, where a sword is swung by the other. */
  track?: string;
  /** How far FORWARD of the hand it sits, in fractions of the body's grid. A
   *  bow is held out at arm's length; a shield is strapped at the arm. The
   *  hand is where the hand is, so this belongs to the weapon. */
  reach?: number;
}

/** By the base's `art` — a weapon's is its FAMILY, so one row covers a rung. */
export const HELD: Record<string, HeldSpec> = {
  bow: { icon: 'gear_bow', grip: [0.47, 0.5], size: 0.85, turn: 0, track: 'off', reach: 0.11 },
  sword: { icon: 'gear_sword', grip: [0.5, 0.28], size: 1.15, turn: 0.5 },
  dagger: { icon: 'gear_dagger', grip: [0.5, 0.3], size: 0.7, turn: 0.5 },
  mace: { icon: 'gear_mace', grip: [0.5, 0.7], size: 1.0, turn: Math.PI + 0.5 },
  wand: { icon: 'gear_wand', grip: [0.5, 0.55], size: 0.62, turn: Math.PI + 0.5 },
  shield: { icon: 'gear_shield', grip: [0.5, 0.45], size: 0.46, turn: 0, track: 'off', reach: -0.01 },
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
    attack: [ // an OVERHEAD SMASH: fist high, forward at the head, down, through
      { x: 0.72, y: 0.18, turn: -2.2 },
      { x: 0.72, y: 0.2, turn: -2.57 },
      { x: 0.72, y: 0.24, turn: -3.43 },
      { x: 0.74, y: 0.46, turn: -2.14 },
    ],
    // The LEAD hand, which is the one a bow lives in: it rides the body's
    // lean rather than the strike, so the bow stays braced while the other
    // arm goes past it.
    'attack/off': [
      { x: 0.42, y: 0.4, turn: 0.1 },
      { x: 0.4, y: 0.34, turn: 0.05 },
      { x: 0.41, y: 0.4, turn: -0.05 },
      { x: 0.5, y: 0.42, turn: -0.2 },
    ],
    cast: [ // an OVERARM THROW: cocked past the ear, slung down, hanging
      { x: 0.44, y: 0.34, turn: 1.6 },
      { x: 0.58, y: 0.28, turn: 0.4 },
      { x: 0.72, y: 0.4, turn: -1.1 },
      { x: 0.74, y: 0.52, turn: -1.5 },
      { x: 0.66, y: 0.56, turn: -0.4 },
    ],
    'cast/off': [
      { x: 0.4, y: 0.44, turn: 0.15 },
      { x: 0.42, y: 0.42, turn: 0.05 },
      { x: 0.46, y: 0.42, turn: -0.05 },
      { x: 0.48, y: 0.44, turn: -0.12 },
      { x: 0.44, y: 0.46, turn: 0 },
    ],
    walk: [
      { x: 0.67, y: 0.5, turn: -1.66 },
      { x: 0.69, y: 0.48, turn: -1.78 },
      { x: 0.7, y: 0.49, turn: -1.82 },
      { x: 0.69, y: 0.51, turn: -1.72 },
      { x: 0.67, y: 0.5, turn: -1.66 },
      { x: 0.66, y: 0.49, turn: -1.7 },
    ],
    'walk/off': [
      { x: 0.46, y: 0.46, turn: 0.1 },
      { x: 0.48, y: 0.44, turn: 0 },
      { x: 0.49, y: 0.45, turn: -0.1 },
      { x: 0.48, y: 0.47, turn: 0 },
      { x: 0.46, y: 0.46, turn: 0.1 },
      { x: 0.45, y: 0.45, turn: 0.05 },
    ],
    idle: [
      { x: 0.68, y: 0.46, turn: -1.54 },
      { x: 0.68, y: 0.52, turn: -1.95 },
    ],
    'idle/off': [
      { x: 0.47, y: 0.46, turn: 0 },
      { x: 0.47, y: 0.47, turn: 0.03 },
    ],
  },
  aethermancer: {
    attack: [ // a BACKHAND: coiled UP across the chest, then out to full stretch
      { x: 0.51, y: 0.57, turn: -3.07 },
      { x: 0.41, y: 0.5, turn: 2.43 },
      { x: 0.4, y: 0.5, turn: -3.04 },
      { x: 0.87, y: 0.42, turn: -2.22 },
    ],
    'attack/off': [
      { x: 0.48, y: 0.48, turn: 0.15 },
      { x: 0.4, y: 0.43, turn: 0.05 },
      { x: 0.39, y: 0.43, turn: 0 },
      { x: 0.54, y: 0.4, turn: -0.2 },
    ],
    cast: [
      { x: 0.46, y: 0.38, turn: 1.8 },
      { x: 0.56, y: 0.33, turn: 0.6 },
      { x: 0.7, y: 0.38, turn: -0.9 },
      { x: 0.75, y: 0.46, turn: -1.4 },
      { x: 0.68, y: 0.52, turn: -0.5 },
    ],
    'cast/off': [
      { x: 0.41, y: 0.45, turn: 0.15 },
      { x: 0.44, y: 0.43, turn: 0.05 },
      { x: 0.49, y: 0.43, turn: -0.05 },
      { x: 0.51, y: 0.45, turn: -0.12 },
      { x: 0.47, y: 0.47, turn: 0 },
    ],
    walk: [
      { x: 0.45, y: 0.61, turn: -2.2 },
      { x: 0.47, y: 0.59, turn: -2.3 },
      { x: 0.48, y: 0.6, turn: -2.34 },
      { x: 0.47, y: 0.62, turn: -2.24 },
      { x: 0.45, y: 0.61, turn: -2.2 },
      { x: 0.44, y: 0.6, turn: -2.24 },
    ],
    'walk/off': [
      { x: 0.47, y: 0.46, turn: 0.1 },
      { x: 0.49, y: 0.44, turn: 0 },
      { x: 0.5, y: 0.45, turn: -0.1 },
      { x: 0.49, y: 0.47, turn: 0 },
      { x: 0.47, y: 0.46, turn: 0.1 },
      { x: 0.46, y: 0.45, turn: 0.05 },
    ],
    idle: [
      { x: 0.46, y: 0.62, turn: -2.17 },
      { x: 0.46, y: 0.63, turn: -2.38 },
    ],
    'idle/off': [
      { x: 0.48, y: 0.46, turn: 0 },
      { x: 0.48, y: 0.47, turn: 0.03 },
    ],
  },
};

/** The hand for the frame a body is showing, on the track its weapon rides. */
export function handAt(sprite: string, art: string, cel: Cel): Hand {
  const track = HELD[art]?.track;
  const beat = generatedBeat(sprite, cel);
  const runs = HERO_HANDS[sprite];
  const own = track ? runs?.[`${beat.state}/${track}`] : runs?.[beat.state];
  return own?.[beat.at] ?? runs?.[beat.state]?.[beat.at] ?? REST;
}
