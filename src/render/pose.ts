/**
 * A piece of armour is ONE grid, authored against the neutral figure, and a
 * pose MOVES it: a whole-pixel shift per slot, so a body tweak takes all
 * forty-eight with it instead of stranding them on a torso that moved. A pose
 * cannot deform a piece, so no cloak billows mid-swing.
 */
export type PoseId =
  | 'walk0'
  | 'walk1'
  | 'walk2'
  | 'walk3'
  | 'attack0'
  | 'attack1'
  | 'cast0'
  | 'cast1';

export type LayerSlot = 'boots' | 'body' | 'gloves' | 'helmet' | 'weapon';

export const LAYER_ORDER: LayerSlot[] = ['boots', 'body', 'gloves', 'helmet', 'weapon'];

/** Contact, pass, contact, pass. Indexed by the renderer, never a boolean. */
export const WALK_POSES: PoseId[] = ['walk0', 'walk1', 'walk2', 'walk3'];
/** The strike lands on the first frame — the sim deals its damage the instant
 *  the pose starts — so what follows it is the follow-through, not a wind-up. */
export const SWING_POSES: PoseId[] = ['attack0', 'attack1'];
export const CAST_POSES: PoseId[] = ['cast0', 'cast1'];

export type Shift = readonly [number, number]; // whole pixels, or the grid slips

export interface Pose {
  all: Shift; // the lunge, the recoil: every layer and the figure
  boots: Shift; // rides the hips
  torso: Shift; // rides the chest, and the head with it
  hand: Shift; // where the grip lands, and the gloved hand with it
  swing: boolean; // weapons are drawn at rest and mid-swing, to stay on the grid
  /** Feet are the one thing a shift cannot fake, so boots have a grid each. */
  boot: number;
}

const CONTACT = { all: [0, 0], boots: [0, 0], torso: [0, 0], hand: [0, 0], swing: false } as const;
// A pass lifts the figure a pixel; the armour goes with it.
const PASS = { all: [0, 0], boots: [0, 0], torso: [0, -1], hand: [0, -1], swing: false } as const;

export const POSES: Record<PoseId, Pose> = {
  walk0: { ...CONTACT, boot: 0 },
  walk1: { ...PASS, boot: 1 },
  walk2: { ...CONTACT, boot: 3 },
  walk3: { ...PASS, boot: 2 },
  attack0: { all: [2, 0], boots: [0, 0], torso: [0, 0], hand: [0, 0], swing: true, boot: 0 },
  attack1: { all: [0, 0], boots: [0, 0], torso: [0, 0], hand: [0, 1], swing: true, boot: 3 },
  cast0: { all: [-2, 0], boots: [0, 0], torso: [0, 0], hand: [0, -5], swing: false, boot: 0 },
  cast1: { all: [-1, 0], boots: [0, 0], torso: [0, 0], hand: [0, -2], swing: false, boot: 3 },
};

export const POSE_IDS = Object.keys(POSES) as PoseId[];

/** Boots track the legs, weapon and glove the hand, everything else the chest. */
export function shiftFor(pose: Pose, slot: LayerSlot): Shift {
  const own =
    slot === 'boots' ? pose.boots : slot === 'weapon' || slot === 'gloves' ? pose.hand : pose.torso;
  return [pose.all[0] + own[0], pose.all[1] + own[1]];
}
