/**
 * The Smith, who is found at HIS OWN depth of the Fissure and is where every
 * tool comes from. Afterwards he stands in the camp with three things on
 * offer: his words, his counter, and a reforge.
 */
import { SMITH } from '../data';
import type { SceneDef } from '../scenes';

export const SMITHY: SceneDef = {
  id: SMITH.scene,
  who: SMITH.sprite,
  name: SMITH.name,
  theme: 'fissure', // the first world: the first world, where the first tool is owed
  rung: SMITH.rung,
  said: SMITH.seen,
  greets:
    'You walked past three seams to get here. Three. Come up and see me when you are done and I will put something in your hand that can take them.',
  idles: SMITH.idles,
  beats: SMITH.beats,
  keeps: 'tools',
  encounter: null,
};
