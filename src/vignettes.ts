/**
 * A VIGNETTE is a small authored arrangement of props — a hauling run, a place
 * somebody slept, an altar with its candles — placed as one thing.
 *
 * Furniture scattered a prop at a time reads as furniture scattered a prop at a
 * time: every piece is equally far from every other and nothing is anywhere for
 * a reason. A cluster says somebody DID something here, and the same eight
 * clusters dropped in different rooms read as a place rather than as a list.
 *
 * Offsets are tiles from the vignette's own top-left, and `w`/`h` is the room
 * it needs — two are never placed overlapping, so a cart is never inside an
 * altar. Nothing here knows which room it lands in; `dressRooms` in
 * `sim/grid.ts` does the placing and is the same for a scene and, later, for a
 * generated map.
 */
export interface Vignette {
  id: string;
  w: number;
  h: number;
  props: { id: string; x: number; y: number }[];
  /** Roughly how often it is picked against the others. */
  weight: number;
}

export const VIGNETTES: Vignette[] = [
  // --- the working, while it was still a working --------------------------
  {
    id: 'haulage',
    w: 4,
    h: 2,
    weight: 100,
    props: [
      { id: 'rail', x: 0, y: 0 },
      { id: 'rail', x: 1, y: 0 },
      { id: 'cart', x: 3, y: 0 },
      { id: 'spoil', x: 2, y: 1 },
    ],
  },
  {
    id: 'shoring',
    w: 3,
    h: 3,
    weight: 100,
    props: [
      { id: 'pitprop', x: 0, y: 0 },
      { id: 'pitprop', x: 0, y: 2 },
      { id: 'beam', x: 2, y: 1 },
      { id: 'spoil', x: 1, y: 2 },
    ],
  },
  {
    id: 'facespill',
    w: 3,
    h: 2,
    weight: 90,
    props: [
      { id: 'spoil', x: 0, y: 0 },
      { id: 'spoil', x: 1, y: 1 },
      { id: 'bucket', x: 2, y: 0 },
      { id: 'plank', x: 2, y: 1 },
    ],
  },
  {
    id: 'restpoint',
    w: 3,
    h: 2,
    weight: 80,
    props: [
      { id: 'candle', x: 1, y: 0 },
      { id: 'bucket', x: 0, y: 1 },
      { id: 'plank', x: 2, y: 1 },
      { id: 'bones', x: 2, y: 0 },
    ],
  },

  // --- and what has been using it since ------------------------------------
  {
    id: 'rite',
    w: 4,
    h: 4,
    weight: 55,
    props: [
      { id: 'altar', x: 1, y: 0 },
      { id: 'candle', x: 0, y: 1 },
      { id: 'candle', x: 3, y: 1 },
      { id: 'gore', x: 1, y: 2 },
      { id: 'skulls', x: 3, y: 3 },
    ],
  },
  {
    id: 'bindings',
    w: 3,
    h: 3,
    weight: 60,
    props: [
      { id: 'chains', x: 0, y: 1 },
      { id: 'skulls', x: 2, y: 0 },
      { id: 'gore', x: 1, y: 2 },
      { id: 'bones', x: 2, y: 2 },
    ],
  },
  {
    id: 'deadend',
    w: 3,
    h: 2,
    weight: 70,
    props: [
      { id: 'husk', x: 1, y: 0 },
      { id: 'gore', x: 0, y: 1 },
      { id: 'web', x: 2, y: 1 },
    ],
  },
  {
    id: 'webbed',
    w: 3,
    h: 2,
    weight: 65,
    props: [
      { id: 'web', x: 0, y: 0 },
      { id: 'web', x: 2, y: 1 },
      { id: 'bones', x: 1, y: 1 },
    ],
  },
];

export const VIGNETTE_BY_ID: Record<string, Vignette> = Object.fromEntries(
  VIGNETTES.map((v) => [v.id, v])
);
