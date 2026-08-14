/**
 * The sandbox: a cavern made of NOTHING the game itself draws. Nothing dies and
 * nothing ends it, so all it does is let the art be looked at. Dressed as THE
 * FISSURE — "a working somebody gave up on. Rotted props, webs, a candle still
 * going."
 *
 * It is a SHOWCASE and laid out as one: the hero walks a CIRCUIT and the bodies
 * are posted around it, so both are met from every side.
 */
import type { SceneDef, SceneDummy } from '../scenes';

/** A caster is its OWN body: a pip over the head of a thing that shoots is a
 *  label where a silhouette does it. Both are in `GENERATED` and nowhere else. */
const MELEE = 'skeleton';
const CASTER = 'revenant';
const HERO = 'delver';

/** One of each thing a body DOES; a caster holds its ground, melee follows. */
const STANDING: (SceneDummy & { of: string })[] = [
  { of: MELEE, sprite: MELEE, at: { x: 12, y: 7 }, scale: 1.45, ability: 'claws' },
  { of: MELEE, sprite: MELEE, at: { x: 20, y: 16 }, scale: 1.45, ability: 'claws' },
  { of: MELEE, sprite: MELEE, at: { x: 9, y: 15 }, scale: 1.45, ability: 'emberbite' },
  { of: CASTER, sprite: CASTER, at: { x: 26, y: 6 }, scale: 1.5, rooted: true, ability: 'fire_bolt' },
  { of: CASTER, sprite: CASTER, at: { x: 26, y: 14 }, scale: 1.5, rooted: true, ability: 'frost_bolt' },
  { of: CASTER, sprite: CASTER, at: { x: 15, y: 20 }, scale: 1.5, rooted: true, ability: 'lightning_arc' },
];

/** Four overlapping lobes, so what is between them is a pinch, not a door. */
const CAVERN = { x: 3, y: 4, w: 17, h: 13 };
const LOBES = [
  { x: 15, y: 2, w: 14, h: 11 },
  { x: 17, y: 11, w: 13, h: 12 },
  { x: 6, y: 13, w: 13, h: 11 },
];

/** In order and round again, through the pinches: a lap passes every body. */
const CIRCUIT = [
  { x: 7, y: 8 },
  { x: 16, y: 6 },
  { x: 25, y: 9 },
  { x: 23, y: 18 },
  { x: 13, y: 19 },
  { x: 8, y: 14 },
];

// What the working left, GROUPED: a prop every third tile is a warehouse.
const LEFT = [
  { id: 'pitprop', at: [{ x: 5, y: 7 }, { x: 19, y: 4 }, { x: 11, y: 12 }, { x: 26, y: 11 }] },
  { id: 'plank', at: [{ x: 8, y: 6 }, { x: 21, y: 21 }, { x: 24, y: 16 }] },
  { id: 'spoil', at: [{ x: 6, y: 9 }, { x: 18, y: 8 }, { x: 19, y: 8 }, { x: 12, y: 21 }] },
  { id: 'bucket', at: [{ x: 10, y: 17 }, { x: 22, y: 8 }] },
  { id: 'candle', at: [{ x: 5, y: 11 }, { x: 17, y: 15 }, { x: 25, y: 20 }] },
  { id: 'web', at: [{ x: 8, y: 20 }, { x: 27, y: 4 }, { x: 14, y: 3 }] },
];

export const SANDBOX: SceneDef = {
  id: 'sandbox',
  who: MELEE,
  name: 'Sandbox',
  theme: 'fissure', // whatever the generated ground does not cover
  ground: 'mineshaft',
  hero: { sprite: HERO, at: { x: 0, y: 0 }, scale: 1.5 },
  plan: {
    room: CAVERN,
    also: LOBES,
    cut: 'grown',
    entrance: { x: 7, y: 9 },
    stands: { x: 26, y: 5 }, // the only view of a body that is not mid-stride
    patrol: CIRCUIT,
    props: LEFT.flatMap((kind) => kind.at.map((p) => ({ id: kind.id, x: p.x, y: p.y }))),
  },
  said: 'A room with nothing in it but the art.',
  encounter: null,
  dummies: STANDING.map(({ of: _of, ...d }) => d),
};
