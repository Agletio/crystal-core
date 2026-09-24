/**
 * THE ABYSS: one level laid by hand, where everything else in the game is
 * generated. A crypt stair, an ossuary gallery, the Weeping Nave, a chapel off
 * it, the Wound (a lava chasm with one bridge) and the Sanctum of the Pact,
 * whose summoning circle is the way out once its Herald is dead.
 *
 * A tile is a metre. The SIM reads the grid `build()` makes and nothing else;
 * the RENDERER reads the grounds, the props and the lights, which the sim never
 * sees. Every solid prop blocks the cells it names, so the two agree on where a
 * body can stand.
 */
import { ENTRANCE, EXIT, FLOOR, Grid, WALL } from '../sim/grid';
import type { GameMap, Room, Vec2 } from '../sim/grid';

export type Ground = 'rock' | 'flag' | 'crypt' | 'lava' | 'bridge';

export type PropKind =
  | 'column' | 'brazier' | 'candelabra' | 'candles' | 'skulls' | 'sarcophagus' | 'statue' | 'altar'
  | 'pew' | 'cage' | 'sconce' | 'rubble' | 'spikes' | 'chest' | 'arch' | 'throne' | 'banner';

export interface PropSpot {
  kind: PropKind;
  x: number;
  y: number;
  rot?: number; // radians about the vertical, 0 faces the camera's south
  size?: number; // on top of the kind's own height
  blocks?: [number, number][]; // cells a body may not enter
}

export type Foe = 'imp' | 'chanter' | 'hornfiend';

export interface PackSpot {
  foe: Foe;
  count: number;
  at: Vec2;
  spread: number;
  rank?: 'common' | 'magic' | 'rare';
  ability?: string; // a MONSTER_ABILITIES id, or the kind's own default
}

/** Where the floor is PAINTED: a decal is the renderer's alone. */
export interface Mark {
  kind: 'blood' | 'magma' | 'circle' | 'runner';
  x: number;
  y: number;
  size: number;
  rot?: number;
  length?: number; // a runner's, along x
}

export const WIDTH = 92;
export const HEIGHT = 44;

const grounds: Ground[] = new Array(WIDTH * HEIGHT).fill('rock');
const carve = (x: number, y: number, w: number, h: number, g: Ground): void => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) grounds[j * WIDTH + i] = g;
};

carve(4, 27, 10, 9, 'crypt'); // the Stair of Ash, where you come down
carve(14, 29, 14, 3, 'crypt'); // the ossuary gallery
for (const x of [16, 20, 24]) carve(x, 28, 2, 1, 'crypt'); // its bone niches
carve(28, 18, 26, 20, 'flag'); // the Weeping Nave
carve(31, 13, 2, 5, 'flag');
carve(27, 6, 12, 7, 'crypt'); // the Chapel of the Drowned Saints
carve(54, 16, 12, 24, 'lava'); // the Wound
carve(54, 26, 12, 4, 'bridge');
carve(66, 15, 22, 24, 'flag'); // the Sanctum of the Pact

export const GROUNDS: readonly Ground[] = grounds;
export const groundAt = (x: number, y: number): Ground =>
  x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT ? 'rock' : grounds[y * WIDTH + x];
export const walks = (g: Ground): boolean => g === 'flag' || g === 'crypt' || g === 'bridge';

export const ENTRY: Vec2 = { x: 8, y: 29 };
export const CIRCLE: Vec2 = { x: 77, y: 27 };
/** How near the circle the hero comes, with the sanctum dead, before the Herald rises. */
export const HERALD_WAKES = 11;

export const ROOMS: Record<string, Room> = {
  crypt: { x: 4, y: 27, w: 10, h: 9 },
  gallery: { x: 14, y: 29, w: 14, h: 3 },
  nave: { x: 28, y: 18, w: 26, h: 20 },
  chapel: { x: 27, y: 6, w: 12, h: 7 },
  sanctum: { x: 66, y: 15, w: 22, h: 24 },
};

const column = (x: number, y: number): PropSpot => ({ kind: 'column', x, y, blocks: [[x, y]] });
const candles = (x: number, y: number, rot = 0, size = 1): PropSpot => ({ kind: 'candles', x, y, rot, size });

export const PROPS: PropSpot[] = [
  // the Stair of Ash
  { kind: 'brazier', x: 12, y: 28, blocks: [[12, 28]] },
  { kind: 'rubble', x: 5.2, y: 34.4, rot: 0.6 },
  { kind: 'rubble', x: 12.6, y: 34.6, rot: 2.2, size: 0.8 },
  { kind: 'skulls', x: 5.4, y: 28.2, rot: 0.3 },
  { kind: 'sconce', x: 4.62, y: 31, rot: Math.PI / 2 },
  { kind: 'cage', x: 9.8, y: 34.8, rot: 0.4, blocks: [[10, 35]] },
  candles(10.6, 32.6, 0.2, 0.8),
  // the ossuary gallery
  { kind: 'skulls', x: 16.5, y: 28.3, rot: 0.1, size: 0.8 },
  candles(20.5, 28.4, 0.5, 0.7),
  { kind: 'skulls', x: 24.5, y: 28.3, rot: 2.9, size: 0.85 },
  { kind: 'sconce', x: 18.5, y: 28.62, rot: 0 },
  { kind: 'sconce', x: 22.5, y: 28.62, rot: 0 },
  { kind: 'sconce', x: 26.5, y: 28.62, rot: 0 },
  // the Weeping Nave
  column(32, 22), column(36, 22), column(40, 22), column(44, 22), column(48, 22),
  column(32, 33), column(36, 33), column(40, 33), column(44, 33), column(48, 33),
  { kind: 'banner', x: 36, y: 18.35, rot: 0, size: 1.2 },
  { kind: 'banner', x: 46, y: 18.35, rot: 0, size: 1.2 },
  { kind: 'candelabra', x: 29, y: 20, blocks: [[29, 20]] },
  { kind: 'candelabra', x: 29, y: 35, blocks: [[29, 35]] },
  { kind: 'candelabra', x: 38, y: 19, blocks: [[38, 19]] },
  { kind: 'candelabra', x: 43, y: 19, blocks: [[43, 19]] },
  { kind: 'altar', x: 40.5, y: 19.4, blocks: [[40, 19], [41, 19]] },
  candles(39.3, 20.4, 0.4, 0.8), candles(41.8, 20.3, 2.1, 0.8),
  { kind: 'pew', x: 34, y: 26.2, rot: 0, blocks: [[33, 26], [34, 26], [35, 26]] },
  { kind: 'pew', x: 46, y: 26.2, rot: 0.08, blocks: [[45, 26], [46, 26], [47, 26]] },
  { kind: 'pew', x: 34, y: 29.9, rot: Math.PI - 0.1, blocks: [[33, 30], [34, 30], [35, 30]] },
  { kind: 'rubble', x: 45.2, y: 30.5, rot: 1.2 },
  { kind: 'skulls', x: 50.3, y: 36.2, rot: 1.1 },
  { kind: 'cage', x: 52.4, y: 19.4, rot: 0.8, blocks: [[52, 19]] },
  { kind: 'cage', x: 52.4, y: 36.2, rot: 2.4, blocks: [[52, 36]] },
  { kind: 'brazier', x: 52, y: 24, blocks: [[52, 24]] },
  { kind: 'brazier', x: 52, y: 31, blocks: [[52, 31]] },
  { kind: 'arch', x: 31.5, y: 17.5, rot: 0, size: 1 },
  // the Chapel of the Drowned Saints
  { kind: 'sarcophagus', x: 30, y: 9, rot: Math.PI / 2, blocks: [[30, 8], [30, 9], [30, 10]] },
  { kind: 'sarcophagus', x: 35.5, y: 9, rot: Math.PI / 2, blocks: [[35, 8], [35, 9], [35, 10], [36, 9]] },
  { kind: 'chest', x: 33, y: 6.7, rot: 0, blocks: [[33, 6]] },
  { kind: 'statue', x: 27.8, y: 6.8, rot: 0.6, blocks: [[27, 6], [28, 6]] },
  { kind: 'statue', x: 38.2, y: 6.8, rot: -0.6, blocks: [[38, 6]] },
  candles(31.8, 7.2, 0.3), candles(34.4, 7.1, 2.6, 0.8), candles(29, 11.5, 1.2, 0.8), candles(37.2, 11.6, 4, 0.9),
  // the bridge heads
  { kind: 'spikes', x: 53.2, y: 24.9, rot: 0, size: 0.8 },
  { kind: 'spikes', x: 53.2, y: 31.1, rot: Math.PI, size: 0.8 },
  { kind: 'banner', x: 66.5, y: 25.3, rot: -Math.PI / 2 },
  { kind: 'banner', x: 66.5, y: 30.7, rot: -Math.PI / 2 },
  // the Sanctum of the Pact
  { kind: 'throne', x: 77, y: 16.6, size: 1.35, blocks: [[76, 16], [77, 16], [78, 16], [76, 17], [77, 17], [78, 17]] },
  { kind: 'statue', x: 67.4, y: 15.9, rot: 0.7, size: 1.2, blocks: [[67, 15], [67, 16], [68, 16]] },
  { kind: 'statue', x: 86.6, y: 15.9, rot: -0.7, size: 1.2, blocks: [[86, 15], [86, 16], [87, 16]] },
  { kind: 'banner', x: 71, y: 15.35, size: 1.25 },
  { kind: 'banner', x: 83, y: 15.35, size: 1.25 },
  { kind: 'brazier', x: 72, y: 22, blocks: [[72, 22]] },
  { kind: 'brazier', x: 82, y: 22, blocks: [[82, 22]] },
  { kind: 'brazier', x: 72, y: 32, blocks: [[72, 32]] },
  { kind: 'brazier', x: 82, y: 32, blocks: [[82, 32]] },
  { kind: 'altar', x: 77, y: 21, rot: 0, size: 0.9, blocks: [[76, 21], [77, 21], [78, 21]] },
  ...Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    return candles(CIRCLE.x + Math.cos(a) * 4.6, CIRCLE.y + Math.sin(a) * 4.6, a * 1.7, 0.75);
  }),
  { kind: 'skulls', x: 69, y: 36.5, rot: 0.4 },
  { kind: 'skulls', x: 85.5, y: 23, rot: 2.4, size: 0.9 },
  { kind: 'rubble', x: 86, y: 36.2, rot: 0.2 },
  { kind: 'cage', x: 68, y: 21.5, rot: 1.9, blocks: [[68, 21]] },
];

export const MARKS: Mark[] = [
  { kind: 'blood', x: 11, y: 33, size: 2.6, rot: 0.4 },
  { kind: 'blood', x: 22, y: 30.4, size: 1.8, rot: 2.1 },
  { kind: 'blood', x: 38, y: 29.2, size: 2.4, rot: 1.3 },
  { kind: 'blood', x: 71, y: 33.5, size: 2, rot: 4.1 },
  { kind: 'blood', x: 33, y: 10.5, size: 1.6, rot: 0.9 },
  { kind: 'runner', x: 28, y: 27.5, size: 2.2, length: 26 },
  { kind: 'magma', x: 51.2, y: 27.7, size: 3.2, rot: 0.3 },
  { kind: 'magma', x: 68.8, y: 23.5, size: 2.8, rot: 2.6 },
  { kind: 'magma', x: 68.6, y: 33, size: 2.6, rot: 4.4 },
  { kind: 'circle', x: CIRCLE.x, y: CIRCLE.y, size: 7.2 },
];

/** Rose window on the nave's north wall, and the chapel's lancets. */
export const WINDOWS: { x: number; y: number; width: number; height: number; base: number }[] = [
  { x: 41, y: 17.5, width: 5.2, height: 5.2, base: 2.6 },
  { x: 33, y: 5.5, width: 1.6, height: 3.4, base: 1.6 },
  { x: 77, y: 14.5, width: 3.2, height: 5.8, base: 3.6 },
];

export const PACKS: PackSpot[] = [
  { foe: 'imp', count: 3, at: { x: 11, y: 32.6 }, spread: 1.3 },
  { foe: 'imp', count: 4, at: { x: 20, y: 30 }, spread: 1.1 },
  { foe: 'chanter', count: 1, at: { x: 26.5, y: 30 }, spread: 0.4, ability: 'fire_bolt' },
  { foe: 'chanter', count: 2, at: { x: 33, y: 24.5 }, spread: 1.2, ability: 'fire_bolt' },
  { foe: 'imp', count: 3, at: { x: 31, y: 31 }, spread: 1.2 },
  { foe: 'hornfiend', count: 1, at: { x: 41, y: 28 }, spread: 0, rank: 'magic' },
  { foe: 'imp', count: 4, at: { x: 42.5, y: 29.5 }, spread: 1.8 },
  { foe: 'chanter', count: 2, at: { x: 49.5, y: 21 }, spread: 1.2, ability: 'fire_bolt' },
  { foe: 'chanter', count: 2, at: { x: 49, y: 35 }, spread: 1.2, ability: 'frost_bolt' },
  { foe: 'chanter', count: 3, at: { x: 33, y: 9.5 }, spread: 1.3, ability: 'fire_bolt' },
  { foe: 'imp', count: 5, at: { x: 64, y: 27.5 }, spread: 1.2 },
  { foe: 'chanter', count: 1, at: { x: 70, y: 19.5 }, spread: 0, ability: 'fire_bolt' },
  { foe: 'chanter', count: 1, at: { x: 84, y: 19.5 }, spread: 0, ability: 'lightning_arc' },
  { foe: 'imp', count: 5, at: { x: 72, y: 29 }, spread: 1.6 },
  { foe: 'hornfiend', count: 1, at: { x: 83, y: 30 }, spread: 0, rank: 'magic' },
];

/** What rises out of the circle, and what it is called. */
export const HERALD = {
  name: 'Vhal-Morrag, Herald of the Pact',
  boss: { foe: 'hornfiend' as Foe, rank: 'rare' as const, life: 3.2 },
  adds: { foe: 'imp' as Foe, count: 6 },
};

/** The sim's map. Lava and rock are both WALL to it; only the renderer tells them apart. */
export function build(): GameMap {
  const grid = new Grid(WIDTH, HEIGHT);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) grid.set(x, y, walks(groundAt(x, y)) ? FLOOR : WALL);
  }
  for (const prop of PROPS) {
    for (const [x, y] of prop.blocks ?? []) grid.solid[y * WIDTH + x] = 1;
  }
  grid.set(ENTRY.x, ENTRY.y, ENTRANCE);
  grid.set(CIRCLE.x, CIRCLE.y, EXIT);
  return {
    grid,
    rooms: Object.values(ROOMS),
    entrance: { ...ENTRY },
    exit: { ...CIRCLE },
    props: [],
    vein: 1,
    theme: 'demonic',
    bare: true,
    patches: [],
    plain: true,
  };
}
