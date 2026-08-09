/**
 * A piece of armour is ONE grid, authored against the neutral figure, and a
 * pose MOVES it: motion is the base figure's own art plus a whole-pixel shift
 * per slot, so a body tweak takes every piece with it rather than leaving
 * forty-eight hand-aligned to a torso that moved. A pose cannot deform a
 * piece, so no cloak billows mid-swing.
 */
export type PoseId = 'walk0' | 'walk1' | 'attack' | 'cast';

export type LayerSlot = 'boots' | 'body' | 'gloves' | 'helmet' | 'weapon';

/** Painted in this order, over the base figure. */
export const LAYER_ORDER: LayerSlot[] = ['boots', 'body', 'gloves', 'helmet', 'weapon'];

export type Shift = readonly [number, number]; // whole pixels, or the grid slips

export interface Pose {
  all: Shift; // the lunge, the recoil: every layer and the figure
  boots: Shift; // rides the hips
  torso: Shift; // rides the chest, and the head with it
  hand: Shift; // where the grip lands, and the gloved hand with it
  swing: boolean; // weapons are drawn at rest and mid-swing, to stay on the grid
}

export const POSES: Record<PoseId, Pose> = {
  walk0: { all: [0, 0], boots: [0, 0], torso: [0, 0], hand: [0, 0], swing: false },
  walk1: { all: [0, 0], boots: [0, 0], torso: [0, 1], hand: [0, 1], swing: false },
  attack: { all: [1, 0], boots: [0, 0], torso: [0, 1], hand: [0, 1], swing: true },
  cast: { all: [-1, 0], boots: [0, 0], torso: [0, 0], hand: [0, -3], swing: false },
};

export const POSE_IDS = Object.keys(POSES) as PoseId[];

/** Boots track the legs, weapon and glove the hand, everything else the chest. */
export function shiftFor(pose: Pose, slot: LayerSlot): Shift {
  const own =
    slot === 'boots' ? pose.boots : slot === 'weapon' || slot === 'gloves' ? pose.hand : pose.torso;
  return [pose.all[0] + own[0], pose.all[1] + own[1]];
}
