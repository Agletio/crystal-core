/**
 * A VIGNETTE is a small authored arrangement of props — a hauling run, a place
 * somebody slept, an altar with its candles — placed as one thing. Furniture
 * dropped a prop at a time reads as exactly that: every piece equally far from
 * every other, nothing anywhere for a reason. A cluster says somebody DID
 * something here.
 *
 * Offsets are tiles from its own top-left and `w`/`h` is the room it needs, so
 * two never overlap and a cart is never inside an altar. `dressRooms` in
 * `sim/grid.ts` does the placing, for a scene and later for a generated map.
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
    weight: 70,
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
    weight: 60,
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
    weight: 55,
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
    weight: 50,
    props: [
      { id: 'candle', x: 1, y: 0 },
      { id: 'bucket', x: 0, y: 1 },
      { id: 'plank', x: 2, y: 1 },
      { id: 'bones', x: 2, y: 0 },
    ],
  },
  {
    id: 'pillars',
    w: 3,
    h: 3,
    weight: 80,
    props: [
      { id: 'pillar', x: 0, y: 0 },
      { id: 'pillar', x: 2, y: 2 },
      { id: 'spoil', x: 1, y: 2 },
      { id: 'spoil', x: 2, y: 0 },
    ],
  },

  // --- and what has been using it since ------------------------------------
  {
    id: 'rite',
    w: 4,
    h: 4,
    weight: 110,
    props: [
      { id: 'altar', x: 1, y: 1 },
      { id: 'candle', x: 0, y: 0 },
      { id: 'candle', x: 3, y: 0 },
      { id: 'gore', x: 1, y: 2 },
      { id: 'splash', x: 2, y: 3 },
      { id: 'skulls', x: 3, y: 2 },
    ],
  },
  {
    id: 'pyre',
    w: 4,
    h: 3,
    weight: 95,
    props: [
      { id: 'brazier', x: 1, y: 1 },
      { id: 'cairn', x: 3, y: 0 },
      { id: 'gore', x: 0, y: 2 },
      { id: 'bones', x: 2, y: 2 },
      { id: 'stake', x: 3, y: 2 },
    ],
  },
  {
    // Three stains on touching tiles rather than one big one. A generated
    // picture of a wide stain comes back as an OBJECT — round, centred, edged
    // — where three overlapping small ones make an outline nobody drew.
    id: 'butchery',
    w: 4,
    h: 3,
    weight: 60,
    props: [
      { id: 'gore', x: 1, y: 1 },
      { id: 'gore', x: 2, y: 2 },
      { id: 'splash', x: 0, y: 0 },
      { id: 'ribs', x: 3, y: 1 },
      { id: 'cocoon', x: 0, y: 2 },
      { id: 'splash', x: 3, y: 2 },
    ],
  },
  {
    id: 'shrine',
    w: 3,
    h: 3,
    weight: 75,
    props: [
      { id: 'cairn', x: 1, y: 0 },
      { id: 'candle', x: 0, y: 1 },
      { id: 'candle', x: 2, y: 1 },
      { id: 'skulls', x: 1, y: 2 },
    ],
  },
  {
    id: 'bindings',
    w: 3,
    h: 3,
    weight: 70,
    props: [
      { id: 'chains', x: 0, y: 1 },
      { id: 'stake', x: 2, y: 0 },
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
      { id: 'ribs', x: 1, y: 0 },
      { id: 'gore', x: 0, y: 1 },
      { id: 'web', x: 2, y: 1 },
    ],
  },
  {
    id: 'larder',
    w: 3,
    h: 3,
    weight: 85,
    props: [
      { id: 'cocoon', x: 1, y: 0 },
      { id: 'cocoon', x: 0, y: 2 },
      { id: 'web', x: 2, y: 1 },
      { id: 'bones', x: 1, y: 2 },
    ],
  },
  {
    id: 'webbed',
    w: 3,
    h: 2,
    weight: 55,
    props: [
      { id: 'web', x: 0, y: 0 },
      { id: 'web', x: 2, y: 1 },
      { id: 'ribs', x: 1, y: 1 },
    ],
  },
];

export const VIGNETTE_BY_ID: Record<string, Vignette> = Object.fromEntries(
  VIGNETTES.map((v) => [v.id, v])
);

/**
 * And what the rock does on its own, which is the only thing SCATTERED at all.
 * Everything a person left is a `Vignette` or is placed by hand: a room's worth
 * of objects dropped one tile at a time reads as exactly that, which is what a
 * whole pass of fringe and open-floor scatter turned out to be.
 */
export interface Weighted {
  id: string;
  weight: number;
}

/** Three SHAPES, not three wordings: a run of cut face is the one place a
 *  single picture repeats within sight of itself. */
export const WALL_PROPS: Weighted[] = [
  { id: 'roots', weight: 100 },
  { id: 'roots_thin', weight: 70 },
];

/** And what a PERSON hung on one, placed by hand and never scattered: a lit
 *  torch on a wall nobody stands near is a bucket in the middle of a room. */
export const HUNG_PROPS = new Set([...WALL_PROPS.map((w) => w.id), 'torch', 'hung']);

/**
 * GROUND COVER — loose stone and dust under everything else, which is what
 * breaks up a set's one picture per corner combination.
 *
 * `COVER_RATE` is by how far the tile is from the ROCK, and that is the whole
 * of what makes it ground rather than confetti: debris DRIFTS at the foot of a
 * wall and thins to nothing in the open. One rate everywhere is uniform noise,
 * which is not texture — the same fault as one picture everywhere, from the
 * other side. It blocks nothing and furniture stands on it.
 */
export const COVER_PROPS: Weighted[] = [
  { id: 'grit', weight: 100 },
  { id: 'rubble', weight: 70 },
  { id: 'chips', weight: 60 },
  { id: 'cobbles', weight: 50 },
  { id: 'pebbles', weight: 30 },
  { id: 'tendrils', weight: 14 },
  { id: 'vines', weight: 10 },
];
export const COVER_RATE = [0.46, 0.2, 0.07, 0.025];
export const COVER_DARK = 0.86;
export const COVER_TINT = 0.28;
export const COVER_ALPHA = 0.88;
export const COVER_SET = new Set(COVER_PROPS.map((w) => w.id));

/**
 * What you cannot walk through. A slab of stone, a pit prop, a wrapped body, a
 * lit brazier and every piece of furniture somebody built are things you go
 * AROUND; a plank, a bone, a lantern, a stain and a cobweb are things you walk
 * over, and blocking those turns a floor into an obstacle course. It is a fact
 * about the OBJECT, so it is one list rather than a flag per table — the same
 * prop is solid wherever it is dropped.
 *
 * `Grid.solid` is where it lands, which is a second layer over the tiles: the
 * ground under an altar is still floor and every renderer keys off that.
 */
export const SOLID_PROPS = new Set([
  'altar',
  'cairn',
  'brazier',
  'pillar',
  'pitprop',
  'cart',
  'cocoon',
  'stake',
  'skulls',
  'bench',
  'shelf',
  'lampshelf',
  'lamprack',
  'slab',
  'plinth',
  'orrery',
  'gems_big',
  'gems_small',
]);

/** A mark IN the floor rather than a thing standing on it. The generator draws
 *  a stain with the shading of an object — domed, lit from one side — whatever
 *  the ask says, and at full strength that reads as a brown lump on the ground.
 *  Drawn back, it sinks into the stone and reads as what it is. */
export const STAIN_PROPS = new Set(['gore', 'splash', 'web']);
export const STAIN_ALPHA = 0.72;

/** What throws LIGHT, and how far. A candle, a wall torch and a bed of embers
 *  are the only warm things down here; the renderer's lightmap lifts its own
 *  dark toward `warm` around one, so a shrine with candles on it is lit by the
 *  candles rather than by a decision about that room. */
export const GLOW_PROPS: Record<string, { reach: number; lit: number }> = {
  candle: { reach: 2.4, lit: 0.55 },
  torch: { reach: 3.6, lit: 0.85 },
  brazier: { reach: 3.4, lit: 0.8 },
};

/** One of a table, off a roll already taken — the caller owns the rng, so a
 *  scene's fixed seed puts the same thing in the same place every time. */
export function weighted(from: Weighted[], roll: number): string {
  let left = roll * from.reduce((n, w) => n + w.weight, 0);
  return (from.find((w) => (left -= w.weight) < 0) ?? from[0]).id;
}
