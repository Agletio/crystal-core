/**
 * The sandbox: a BLANK room. Nothing dies and nothing ends it, so all it does
 * is let the art be looked at — and it draws no ground at all, because what
 * used to be here was a generated tileset and every rule for lighting, walling
 * and dropping off it, and the whole of that is deleted.
 *
 * The GEOMETRY survives, so there is a shape to build back into: chambers the
 * size a generated map cuts, joined by the same wandering corridor, a pack in
 * each, and the hero walking a circuit. So does every generated PROP. What is
 * gone is anything that drew the floor, the rock, the light or a drop.
 */
import type { SceneDef, SceneDummy } from '../scenes';

const MELEE = 'skeleton';
const CASTER = 'revenant';
const HERO = 'delver';

/** Chambers the size `generateMap` cuts, eight or more tiles of rock apart so
 *  what joins them is a TUNNEL rather than a step. */
const ROOMS = [
  { x: 4, y: 7, w: 8, h: 6 }, // 0, the entrance, and the one laid out by hand
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
/** The circuit, by room: out of the middle by the tunnel it came in. */
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

/**
 * THE SHRINE — the one chamber laid out tile by tile, and the reference for
 * what the scatter is meant to come to. A composition rather than a spread: a
 * slab against the north wall, light and a body hanging on the cut face over
 * it, what ran off it on the floor in front, and the leavings pushed out to
 * the edges where a room's leavings go. Nothing scatters in here (`plain`).
 */
const SHRINE: [string, number, number][] = [
  ['torch', 5, 6],
  ['hung', 7, 6],
  ['torch', 9, 6],
  ['candle', 5, 7],
  ['altar', 7, 7],
  ['candle', 9, 7],
  ['splash', 5, 8],
  ['skulls', 6, 8],
  ['gore', 8, 8],
  ['cairn', 10, 8],
  ['chains', 4, 9],
  ['splash', 9, 9],
  ['ribs', 4, 10],
  ['brazier', 11, 10],
  ['bones', 5, 11],
  ['cocoon', 10, 11],
  ['stub', 4, 11],
  ['spoil', 6, 12],
  ['fungus', 9, 12],
  ['roots', 13, 7],
];

export const SANDBOX: SceneDef = {
  id: 'sandbox',
  who: MELEE,
  name: 'Sandbox',
  theme: 'fissure', // what it is dressed as, once anything draws ground again
  bare: true, // no ground at all: the props, the bodies and black
  hero: { sprite: HERO, at: { x: 0, y: 0 }, scale: 1.5, speed: 0.5 },
  plan: {
    room: ROOMS[0],
    also: ROOMS.slice(1),
    joins: RING,
    cut: 'grown',
    entrance: middle(0),
    stands: middle(2), // nobody stands in this room; a scene wants the field
    patrol: PATROL.map(middle),
    busy: PACKS.map((p) => ({
      x: middle(p.room).x + p.at[0],
      y: middle(p.room).y + p.at[1],
    })),
    props: SHRINE.map(([id, x, y]) => ({ id, x, y })),
    plain: [ROOMS[0]],
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
