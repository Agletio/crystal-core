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
    "Three good seams on the way here, and you walked past them all. Find me at camp. I will see you properly equipped.",
  idles: SMITH.idles,
  camp: { x: 214, y: 268 }, // by the anvil, which is his; the loom's foot was a worker's
  beats: SMITH.beats,
  keeps: 'tools',
  encounter: null,
};
