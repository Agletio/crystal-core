/**
 * The sandbox: one wide room with generated ground under it and generated
 * bodies standing on it, reachable from the dev kit and from nowhere a player
 * goes. A SCENE with monsters in it rather than a mode of its own — nothing
 * dies and nothing ends it, so the whole of what it does is let the art be
 * looked at. The room is large and ragged on purpose: a Wang tileset is
 * corners, and a rectangle with straight walls shows four of the sixteen.
 */
import type { SceneDef } from '../scenes';

const BODY = 'husk'; // in `GENERATED` rather than in `BEASTIARY`

/** Spread wide, so the hero walks between them and turns as it goes. */
const STANDING = [
  { x: 8, y: 6 },
  { x: 20, y: 5 },
  { x: 24, y: 12 },
  { x: 15, y: 15 },
  { x: 6, y: 14 },
  { x: 22, y: 17 },
];

export const SANDBOX: SceneDef = {
  id: 'sandbox',
  who: BODY,
  name: 'Sandbox',
  theme: 'fissure', // whatever the generated ground does not cover
  ground: 'mineshaft',
  plan: {
    room: { x: 2, y: 2, w: 26, h: 18 },
    entrance: { x: 5, y: 10 },
    stands: { x: 26, y: 3 }, // the only view of the body that is not mid-stride

    props: [],
  },
  said: 'A room with nothing in it but the art.',
  encounter: null,
  dummies: STANDING.map((at) => ({ sprite: BODY, at, scale: 1.1 })),
};
