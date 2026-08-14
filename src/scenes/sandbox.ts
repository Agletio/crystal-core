/**
 * The sandbox: a cavern made of NOTHING the game itself draws. Nothing dies and
 * nothing ends it, so all it does is let the art be looked at. Dressed as THE
 * FISSURE — "a working somebody gave up on. Rotted props, webs, a candle still
 * going."
 *
 * Laid out like a DESCENT rather than like a room: chambers the size a
 * generated map cuts, joined in a ring by the same wandering corridor, a pack
 * in each. The hero walks the ring, so every body is met from a different side
 * on every lap and nothing has to be driven to be seen.
 */
import type { SceneDef, SceneDummy } from '../scenes';

/** A caster is its OWN body: a pip over the head of a thing that shoots is a
 *  label where a silhouette does it. Both are in `GENERATED` and nowhere else. */
const MELEE = 'skeleton';
const CASTER = 'revenant';
const HERO = 'delver';

/** Chambers the size `generateMap` cuts — 5-9 by 4-7 — spread out and joined
 *  in a RING, so what is between two of them is a tunnel rather than a step. */
const ROOMS = [
  { x: 4, y: 5, w: 8, h: 6 }, // 0, the entrance, left empty
  { x: 17, y: 3, w: 8, h: 6 },
  { x: 31, y: 6, w: 7, h: 5 },
  { x: 33, y: 17, w: 8, h: 6 },
  { x: 20, y: 21, w: 8, h: 6 },
  { x: 6, y: 18, w: 7, h: 6 },
];
const RING: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 0],
];

/** Whole tiles, as `roomCenter` rounds: a fraction leaves the hero short. */
const middle = (i: number) => ({
  x: ROOMS[i].x + Math.floor((ROOMS[i].w - 1) / 2),
  y: ROOMS[i].y + Math.floor((ROOMS[i].h - 1) / 2),
});

/** A PACK per chamber, off its middle. Melee follow and are seen walking the
 *  tunnels; a caster is `rooted`, so the layout survives first contact. */
const PACKS: { room: number; at: [number, number]; ability: string; of?: string }[] = [
  { room: 1, at: [-1, 0], ability: 'claws' },
  { room: 1, at: [1, 1], ability: 'claws' },
  { room: 2, at: [0, -1], ability: 'fire_bolt', of: CASTER },
  { room: 2, at: [1, 1], ability: 'emberbite' },
  { room: 3, at: [0, 0], ability: 'frost_bolt', of: CASTER },
  { room: 3, at: [2, 1], ability: 'claws' },
  { room: 4, at: [0, -1], ability: 'lightning_arc', of: CASTER },
  { room: 4, at: [2, 1], ability: 'claws' },
  { room: 5, at: [0, 0], ability: 'rimebite' },
];

/** A couple of things put exactly here; everything else is a VIGNETTE. */
const LEFT: { id: string; at: [number, number][] }[] = [
  { id: 'candle', at: [[5, 7]] },
  { id: 'web', at: [[17, 7]] },
];

export const SANDBOX: SceneDef = {
  id: 'sandbox',
  who: MELEE,
  name: 'Sandbox',
  theme: 'fissure', // whatever the generated ground does not cover
  ground: 'mineshaft',
  hero: { sprite: HERO, at: { x: 0, y: 0 }, scale: 1.5, speed: 0.5 },
  plan: {
    room: ROOMS[0],
    also: ROOMS.slice(1),
    joins: RING,
    cut: 'grown',
    entrance: middle(0),
    stands: middle(2), // nobody stands in this room; a scene wants the field
    patrol: ROOMS.map((_, i) => middle(i)),
    props: LEFT.flatMap((kind) => kind.at.map(([x, y]) => ({ id: kind.id, x, y }))),
    dress: 2, // and two arrangements scattered into each chamber besides
  },
  said: 'A room with nothing in it but the art.',
  encounter: null,
  dummies: PACKS.map(
    (p): SceneDummy => ({
      sprite: p.of ?? MELEE,
      at: { x: middle(p.room).x + p.at[0], y: middle(p.room).y + p.at[1] },
      scale: p.of ? 1.5 : 1.45,
      rooted: !!p.of,
      ability: p.ability,
    })
  ),
};
