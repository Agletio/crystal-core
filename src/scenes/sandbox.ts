/**
 * The sandbox: a cavern made of NOTHING the game itself draws. Nothing dies and
 * nothing ends it, so all it does is let the art be looked at. Dressed as THE
 * FISSURE — "a working somebody gave up on."
 *
 * Laid out like a DESCENT: chambers the size a generated map cuts, joined by
 * the same wandering corridor, a pack in each. The hero walks a circuit, so
 * every body is met from a different side on every lap.
 */
import type { SceneDef, SceneDummy } from '../scenes';

const MELEE = 'skeleton';
const CASTER = 'revenant';
const HERO = 'delver';

/** Chambers the size `generateMap` cuts — 5-9 by 4-7 — with eight or more tiles
 *  of rock between any two, so what joins them is a TUNNEL rather than a step
 *  and the whole does not read as one cavern. */
const ROOMS = [
  { x: 4, y: 7, w: 8, h: 6 }, // 0, the entrance, left empty
  { x: 22, y: 4, w: 8, h: 6 },
  { x: 41, y: 8, w: 7, h: 5 },
  { x: 44, y: 23, w: 8, h: 6 },
  { x: 25, y: 28, w: 8, h: 6 },
  { x: 6, y: 24, w: 7, h: 6 },
  { x: 30, y: 17, w: 8, h: 5 }, // 6, the middle, reached across the ring
];
/** The ring, and two spurs through the middle: a loop with nothing inside it
 *  is a donut. */
const RING: [number, number][] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 0],
  [1, 6],
  [4, 6],
];
/** The circuit, by room: the walk out of the middle is the tunnel it came in
 *  by, from the other end. */
const PATROL = [0, 1, 2, 3, 4, 6, 5];

/** Whole tiles, as `roomCenter` rounds: a fraction leaves the hero short. */
const middle = (i: number) => ({
  x: ROOMS[i].x + Math.floor((ROOMS[i].w - 1) / 2),
  y: ROOMS[i].y + Math.floor((ROOMS[i].h - 1) / 2),
});

/** A PACK per chamber, off its middle. A caster is `rooted`, so the layout
 *  survives first contact. */
const PACKS: { room: number; at: [number, number]; ability: string; of?: string }[] = [
  { room: 1, at: [-1, 0], ability: 'claws' },
  { room: 1, at: [1, 1], ability: 'claws' },
  { room: 2, at: [0, -1], ability: 'fire_bolt', of: CASTER },
  { room: 2, at: [1, 1], ability: 'emberbite' },
  { room: 3, at: [0, 0], ability: 'frost_bolt', of: CASTER },
  { room: 3, at: [-2, 1], ability: 'claws' },
  { room: 4, at: [0, -1], ability: 'lightning_arc', of: CASTER },
  { room: 4, at: [2, 1], ability: 'claws' },
  { room: 5, at: [0, 0], ability: 'rimebite' },
  { room: 6, at: [-1, 0], ability: 'emberbite' },
  { room: 6, at: [1, 1], ability: 'claws' },
];

const LEFT: { id: string; at: [number, number][] }[] = [
  { id: 'candle', at: [[5, 9]] },
  { id: 'web', at: [[22, 7]] },
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
    patrol: PATROL.map(middle),
    props: LEFT.flatMap((kind) => kind.at.map(([x, y]) => ({ id: kind.id, x, y }))),
    dress: 3, // and three arrangements scattered into each chamber besides
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
