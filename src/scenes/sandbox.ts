/**
 * The sandbox: one wide room made of NOTHING the game itself draws — generated
 * ground, furniture, a body to swing at and one to swing with. Nothing dies and
 * nothing ends it, so all it does is let the art be looked at. Dressed as THE
 * FISSURE, off that zone's line — "a working somebody gave up on. Rotted props,
 * webs, a candle still going" — and ragged, since a Wang set is corners.
 */
import type { SceneDef } from '../scenes';

const BODY = 'skeleton'; // both in `GENERATED`, and in no other table
const HERO = 'delver';

// Spread wide so the hero turns as it goes, and one of each thing a body DOES:
// a melee swing and a thrown bolt are different animations.
const STANDING = [
  { at: { x: 8, y: 6 }, ability: 'claws' },
  { at: { x: 13, y: 13 }, ability: 'claws' },
  { at: { x: 6, y: 14 }, ability: 'emberbite' },
  { at: { x: 14, y: 6 }, ability: 'fire_bolt' },
  { at: { x: 15, y: 11 }, ability: 'frost_bolt' },
  { at: { x: 11, y: 16 }, ability: 'lightning_arc' },
];

// What the working left, GROUPED: a prop every third tile is a warehouse.
const LEFT = [
  { id: 'pitprop', at: [{ x: 4, y: 4 }, { x: 4, y: 8 }, { x: 4, y: 12 }, { x: 26, y: 8 }] },
  { id: 'plank', at: [{ x: 7, y: 4 }, { x: 18, y: 18 }, { x: 25, y: 15 }] },
  { id: 'spoil', at: [{ x: 6, y: 5 }, { x: 12, y: 3 }, { x: 13, y: 3 }, { x: 21, y: 19 }] },
  { id: 'bucket', at: [{ x: 9, y: 12 }, { x: 19, y: 8 }] },
  { id: 'candle', at: [{ x: 3, y: 6 }, { x: 16, y: 11 }, { x: 27, y: 16 }] },
  { id: 'web', at: [{ x: 3, y: 19 }, { x: 27, y: 3 }, { x: 11, y: 19 }] },
];

export const SANDBOX: SceneDef = {
  id: 'sandbox',
  who: BODY,
  name: 'Sandbox',
  theme: 'fissure', // whatever the generated ground does not cover
  ground: 'mineshaft',
  hero: { sprite: HERO, at: { x: 0, y: 0 }, scale: 1.5 },
  plan: {
    room: { x: 2, y: 2, w: 26, h: 18 },
    entrance: { x: 5, y: 10 },
    stands: { x: 26, y: 3 }, // the only view of the body that is not mid-stride
    props: LEFT.flatMap((kind) => kind.at.map((p) => ({ id: kind.id, x: p.x, y: p.y }))),
  },
  said: 'A room with nothing in it but the art.',
  encounter: null,
  dummies: STANDING.map((s) => ({ sprite: BODY, ...s, scale: 1.45 })),
};
