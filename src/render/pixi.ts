/**
 * WebGL renderer, built on PixiJS.
 *
 * Same Renderer interface as canvas2d, and the only one that draws sprites.
 *
 * Everything geometric lives inside a `world` container measured in TILE
 * units, and the camera is that container's transform: the map is built once
 * and then moved, rather than 2,000 rectangles being redrawn every frame. Text
 * is the exception — it sits in screen space so it stays crisp.
 *
 * Construction is async (Pixi 8 initialises the GPU device asynchronously) and
 * can fail — no WebGL, headless, a hostile driver. It returns null then, and
 * the caller falls back to canvas2d.
 */
import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { AURA, AURA_BY_ID,
  AILMENTS,
  AILMENT_BY_ID,
} from '../data';
import { ENTRANCE, EXIT, WALL, wangKey } from '../sim/grid';
import { tileNoise } from '../noise';
import { ATTACK_POSE, DEATH_FADE } from '../sim/run';
import type { Entity, RunState } from '../sim/run';
import type { GameMap } from '../sim/grid';
import type { FirePixel, Palette, Renderer } from './renderer';
import type { Cel } from './sprites';
import { HANDS_DRAWN, HELD, handAt } from './held';
import type { HandSlot } from './held';
import {
  ARROW_SPAN,
  arrowFlight,
  auraLook,
  ailmentMarks,
  damageColour,
  bossTelegraph,
  dazeMarks,
  burstRadius,
  clampOffset,
  fireBolt,
  frostShard,
  lightningArc,
  coneWedge,
  sweepRing,
  fireBurst,
  fireShades,
  fireSparks,
  clampZoom,
  floorColour,
  floorPalette,
  isWallFace,
  mix,
  poisonDrops,
  poisonFieldRadius,
  stormBolts,
  stormCloud,
  livingDecals,
  PROPS,
  tileDecals,
  tileSize,
  toHexNumber,
  vfxColour,
  ZOOM_MIN,
} from './renderer';
import {
  ATTACK_FRAME,
  CELL,
  WALK_CYCLE,
  WALK_FRAMES,
  animates,
  bodyFoot,
  bodyTop,
  generatedFrame,
  makeHeld,
  makeProp,
  makeSheet,
  makeVfx,
  rankedKey,
} from './sprites';
import { PROP_ART } from './generated-props';
import { ZONES } from './generated-tiles';
import {
  MOUTH_ART,
  COVER_ALPHA,
  COVER_DARK,
  COVER_SET,
  COVER_TINT,
  HUNG_PROPS,
  STAIN_ALPHA,
  STAIN_PROPS,
} from '../vignettes';
import { GENERATED } from './generated-art';
import type { MonsterRank } from './bestiary';
import { SKILL_BY_ID } from '../data';

/** How far past the grid the rock is drawn, so a chamber near the boundary
 *  does not end on a straight lit line with nothing past it. */
const EDGE = 4;

/** A corner's place in the base-three key, high to low. */
const PLACE = [27, 9, 3, 1];
const FLOATER_LIFE = 1.1;

/** How far down the cell UNDER a boundary the cut face reaches, measured off
 *  the set: only its last fifth is ground. Feet clear it; growth ends on it. */
const FACE_FOOT = 0.81;
const FOOT_DROP = FACE_FOOT - 0.5 + 0.09;
const FACE_HANG = 0.6;

export async function createPixiRenderer(
  host: HTMLElement,
  palette: Palette
): Promise<Renderer | null> {
  const sheet = makeSheet(palette);
  if (!sheet) return null;

  const textures = new Map<string, Texture[] | null>();

  /** Uploaded on first use, beside the canvases: an eager loop here would pay
   *  the boot cost the lazy sheet exists to avoid. */
  function texturesFor(sprite: string, rank: MonsterRank): Texture[] | null {
    const key = rankedKey(sprite, rank);
    const already = textures.get(key);
    if (already !== undefined) return already;

    const frames = sheet!.frames(sprite, rank);
    const made =
      frames?.map((canvas) => {
        const texture = Texture.from(canvas);
        // Linear, because a cell is ALWAYS bigger than the tile it lands in —
        // 256 into 87 device pixels at the default camera. Nearest drops rows
        // and shimmers as a body moves; linear supersamples, which is the whole
        // reason to author above what the screen shows.
        texture.source.scaleMode = 'linear';
        return texture;
      }) ?? null;
    textures.set(key, made);
    return made;
  }

  const app = new Application();
  try {
    await app.init({
      width: Math.max(1, host.clientWidth),
      height: Math.max(1, Math.round(host.clientWidth * 0.66)),
      // Solid rock, not void. The map is a place cut out of stone; a black
      // background made every chamber a slab floating in nothing.
      background: toHexNumber(palette.rockDeep),
      antialias: true,
      autoDensity: true,
      resolution: Math.min(globalThis.devicePixelRatio || 1, 2),
      preference: 'webgl',
    });
  } catch {
    return null;
  }

  app.canvas.id = 'run-canvas';
  app.canvas.setAttribute('aria-label', 'map view');
  (app.canvas as HTMLCanvasElement).style.display = 'block';
  (app.canvas as HTMLCanvasElement).style.width = '100%';
  host.replaceChildren(app.canvas as HTMLCanvasElement);

  // Pixi drives its own ticker by default; we draw explicitly from the run
  // loop so the sim stays the only clock that matters.
  app.ticker.stop();

  const world = new Container();
  /** The generated PROPS. Under everything, and empty on every map but a bare
   *  one — which is every map a player ever runs. */
  const groundLayer = new Container();
  // Rock and its growth, UNDER the bodies: over them it sheared off heads.
  const wallLayer = new Container();
  const mapLayer = new Graphics();
  // What the zone does rather than what it is: redrawn every frame, over the
  // map that was built once.
  const propLayer = new Graphics();
  // Under the bodies: an aura is a field on the floor, not a badge on a monster.
  const auraLayer = new Graphics();
  const vfxLayer = new Graphics();
  // A generated effect is a PICTURE, so it cannot be drawn into the blocks
  // layer beside the lightning that wraps it.
  /** Effect art that lies ON the floor, under everything standing on it. */
  const vfxGroundLayer = new Container();
  const vfxArtLayer = new Container();
  const entityLayer = new Container();
  const textLayer = new Container();

  world.addChild(
    groundLayer, wallLayer, mapLayer, propLayer, auraLayer, vfxGroundLayer,
    entityLayer, vfxLayer, vfxArtLayer
  );
  app.stage.addChild(world, textLayer);

  let builtMap: GameMap | null = null;
  let livingFloor: ReturnType<typeof floorPalette> | null = null;
  let zoom = 1;
  let tile = 1;
  /** Where the camera is pointed, in tiles. Null while it follows the hero. */
  let looking: { x: number; y: number } | null = null;
  /** What it centred on last, so a drag starts from where you are looking. */
  let at = { x: 0, y: 0 };
  let offX = 0;
  let offY = 0;

  /** How far through its own swing, 0 to 1. */
  const through = (e: Entity): number =>
    Math.max(0, Math.min(1, 1 - e.actionTimer / ATTACK_POSE));

  /** Casting is an attack with a SPELL, which both the doll and a generated
   *  body read — one asks for a pose and the other for an animation. */
  const casting = (e: Entity): boolean =>
    e.skillId ? (SKILL_BY_ID[e.skillId]?.tags.includes('spell') ?? false) : false;

  /** Everything a generated body needs to pick a frame, in one place. */
  const cel = (e: Entity, elapsed: number): Cel => ({
    action: e.action,
    through: through(e),
    elapsed,
    walked: e.walked,
    skill: e.skillId,
    facing: e.facing,
    spell: casting(e),
    dead: e.dead,
    dying: Math.min(1, e.deathAge / DEATH_FADE),
  });

  /** A creature's frames at its rank, falling back to the common ones. */
  function framesFor(e: Entity): Texture[] {
    return (
      texturesFor(e.sprite, e.rank) ??
      texturesFor(e.sprite, 'common') ??
      texturesFor('grub', 'common')!
    );
  }

  const sprites = new Map<number, Sprite>();
  /** One per HAND of an entity that holds something, keyed `id:slot`. Its own
   *  sprite rather than a child of the body, or it would inherit the body's
   *  mirroring twice. */
  const helds = new Map<string, Sprite>();
  const floaters: Text[] = [];
  const effectArt: Sprite[] = [];
  const groundArt: Sprite[] = [];
  let effectsDrawn = 0;
  let groundDrawn = 0;

  /**
   * A pooled sprite for one effect this frame. The vfx layer is redrawn every
   * frame, so a picture is HIDDEN when it is not wanted rather than torn down —
   * the same rule the floaters follow. `ground` puts it UNDER the bodies, which
   * is where a thing lying on the floor belongs: a pool drawn over them is a
   * lid on the fight.
   */
  function effectSprite(texture: Texture, span: number, ground = false): Sprite {
    const pool = ground ? groundArt : effectArt;
    const at = ground ? groundDrawn : effectsDrawn;
    let s = pool[at];
    if (!s) {
      s = new Sprite(texture);
      (ground ? vfxGroundLayer : vfxArtLayer).addChild(s);
      pool[at] = s;
    }
    if (ground) groundDrawn++;
    else effectsDrawn++;
    s.texture = texture;
    s.visible = true;
    s.rotation = 0;
    s.scale.set(span / (texture.width || CELL));
    return s;
  }

  /** The boss and what its phase looks like, worked out once a frame — three
   *  passes draw it and none of them may disagree about the beat. */
  let told: { on: Entity; look: NonNullable<ReturnType<typeof bossTelegraph>> } | null = null;

  // `screen`, never `width / resolution`: the renderer's own logical box, in
  // the CSS pixels the world container is positioned in. Halved by a device
  // ratio of 2, a map SMALLER than the view centred itself in a quarter of the
  // screen — invisible for a descent, which always overflows and clamps.
  const viewW = () => app.renderer.screen.width;
  const viewH = () => app.renderer.screen.height;

  /** World units are tiles, so a centre is just the tile plus a half. */
  const cx = (x: number) => x + 0.5;
  const cy = (y: number) => y + 0.5;

  /** Screen position, for things that live outside the world container. */
  const sx = (x: number) => offX + (x + 0.5) * tile;
  const sy = (y: number) => offY + (y + 0.5) * tile;

  /**
   * At zoom 1 the whole map is centred. Above that the camera sits on the
   * focus point and clamps to the map edges, so it never pans into the void.
   * The focus is the hero unless a drag has taken it — `looking` — and it is
   * clamped in TILES too, or a long drag banks up an offset that takes as many
   * drags to come back from as it took to build.
   */
  function camera(map: GameMap, focus?: { x: number; y: number }): void {
    const w = viewW();
    const h = viewH();
    const fit = Math.min(w / map.grid.width, h / map.grid.height);
    tile = tileSize(zoom, fit);

    const mapW = tile * map.grid.width;
    const mapH = tile * map.grid.height;

    if (looking) {
      looking.x = Math.max(0, Math.min(map.grid.width - 1, looking.x));
      looking.y = Math.max(0, Math.min(map.grid.height - 1, looking.y));
    }
    const on = looking ?? focus;
    at = on ?? at;

    if (zoom <= 1 || !on) {
      offX = (w - mapW) / 2;
      offY = (h - mapH) / 2;
    } else {
      offX = clampOffset(w / 2 - (on.x + 0.5) * tile, w, mapW);
      offY = clampOffset(h / 2 - (on.y + 0.5) * tile, h, mapH);
    }

    world.scale.set(tile);
    world.position.set(offX, offY);
  }

  const holds = new Map<string, Texture | null>();

  /** What a hand is holding, uploaded on first use like everything else. */
  function heldTexture(art: string): Texture | null {
    const already = holds.get(art);
    if (already !== undefined) return already;
    const canvas = makeHeld(art);
    const made = canvas ? Texture.from(canvas) : null;
    if (made) made.source.scaleMode = 'nearest';
    holds.set(art, made);
    return made;
  }

  const props = new Map<string, Texture | null>();

  /** A generated prop as a texture, uploaded on first use like everything else. */
  function propTextures(id: string): Texture | null {
    const already = props.get(id);
    if (already !== undefined) return already;
    const canvas = makeProp(id);
    const made = canvas ? Texture.from(canvas) : null;
    if (made) made.source.scaleMode = 'nearest';
    props.set(id, made);
    return made;
  }

  const effects = new Map<string, Texture | null>();

  /** A generated effect as a texture, uploaded on first use like the rest. */
  function vfxTexture(id: string): Texture | null {
    const already = effects.get(id);
    if (already !== undefined) return already;
    const canvas = makeVfx(id);
    const made = canvas ? Texture.from(canvas) : null;
    if (made) made.source.scaleMode = 'nearest';
    effects.set(id, made);
    return made;
  }

  /** Every sheet, sliced into one texture per tile. Decoding a data URI is
   *  ASYNC, so it happens here where the renderer is already being awaited —
   *  sliced on first use instead, the draw runs before the image has loaded
   *  and the whole floor is silently missing. */
  const zones = new Map<string, Texture[]>();
  for (const [id, set] of Object.entries(ZONES)) {
    const sheet = new Image();
    sheet.src = set.png;
    try {
      await sheet.decode();
    } catch {
      continue;
    }
    const canvas = document.createElement('canvas');
    canvas.width = sheet.width;
    canvas.height = sheet.height;
    const ink = canvas.getContext('2d');
    if (!ink) continue;
    ink.drawImage(sheet, 0, 0);
    const cut = (box: number[]): HTMLCanvasElement => {
      const one = document.createElement('canvas');
      one.width = box[2];
      one.height = box[3];
      one.getContext('2d')?.drawImage(canvas, box[0], box[1], box[2], box[3], 0, 0, box[2], box[3]);
      return one;
    };
    const made = set.tiles.map(({ box }) => cut(box));
    zones.set(
      id,
      made.map((one) => {
        const texture = Texture.from(one);
        // NEAREST: a tile is drawn at or above its own size, so what has to
        // survive is the enlargement.
        texture.source.scaleMode = 'nearest';
        return texture;
      })
    );
  }

  /**
   * A cell's four CORNERS in base three: 0 floor, 1 rock, 2 the cut face. A
   * corner is rock only where all four cells round it are, and it is the FACE
   * where the corner one row above is — which is what puts the cliff in the
   * cell BELOW the boundary and makes a wall two rows tall.
   */
  function cornerAt(grid: GameMap['grid'], cx: number, cy: number): number {
    const rock = (px: number, py: number): boolean =>
      grid.at(px - 1, py - 1) === WALL && grid.at(px, py - 1) === WALL &&
      grid.at(px - 1, py) === WALL && grid.at(px, py) === WALL;
    return rock(cx, cy) ? 1 : rock(cx, cy - 1) ? 2 : 0;
  }

  /**
   * The ground, and the props standing on it. A tileset is the WHOLE surface,
   * so the zone's own rock and decals stand down for one.
   */
  function buildProps(map: GameMap): void {
    groundLayer.removeChildren().forEach((child) => child.destroy());
    wallLayer.removeChildren().forEach((child) => child.destroy());
    if (!map.bare) return;

    const set = map.zone ? ZONES[map.zone] : null;
    const art = map.zone ? zones.get(map.zone) : null;
    if (set && art) {
      const { grid } = map;
      // The four wall-CONTINUATION tiles share their corners with a twin and
      // are told apart by what stands above or below them, so a tile is scored
      // rather than looked up: corners first, then each row it agrees with.
      // A set answers 21 of the 81 keys, so a cell whose corners it has no
      // picture for takes the NEAREST it does — the cut face is BETWEEN floor
      // and rock, so trading it for either is one step where trading floor for
      // rock is three. Without this a key nothing draws is a black hole.
      //
      // Building the missing keys out of QUADRANTS of the present ones was
      // tried and is REVERTED: a quadrant's picture is not decided by its own
      // corner, so a quarter taken for its corner value brings whatever else
      // was in that quarter with it — which put pale slivers of floor inside
      // solid rock. Measured against this fallback on the same view, the
      // composites are the worse of the two.
      const near = new Map<number, number>();
      const nearest = (key: number): number => {
        const found = near.get(key);
        if (found !== undefined) return found;
        const mine = PLACE.map((p) => Math.floor(key / p) % 3);
        let best = 0;
        let cost = Infinity;
        for (const tile of set.tiles) {
          let apart = 0;
          for (let c = 0; c < 4; c++) {
            const theirs = Math.floor(tile.key / PLACE[c]) % 3;
            apart += mine[c] === theirs ? 0 : mine[c] === 2 || theirs === 2 ? 1 : 3;
          }
          if (apart < cost) {
            cost = apart;
            best = tile.key;
          }
        }
        near.set(key, best);
        return best;
      };
      // `over` and `under` are the pattern's rows above and below the tile's
      // own two corner rows, and they are CORNER values — read as the cell's
      // tile type instead, the twins are picked at random, and what that shows
      // is the wall's lip tile repeating all the way down a face as a pale line
      // running up it.
      const pick = (x: number, y: number): Texture | null => {
        const key = nearest(wangKey(grid, x, y));
        const want = [
          cornerAt(grid, x, y - 1),
          cornerAt(grid, x + 1, y - 1),
          cornerAt(grid, x, y + 2),
          cornerAt(grid, x + 1, y + 2),
        ];
        let best = -1;
        let score = -Infinity;
        set.tiles.forEach((tile, i) => {
          if (tile.key !== key) return;
          let mine = 0;
          [tile.over[1], tile.over[2], tile.under[1], tile.under[2]].forEach((asked, k) => {
            if (asked !== 255) mine += asked === want[k] ? 2 : -3;
          });
          if (mine > score) {
            score = mine;
            best = i;
          }
        });
        return best < 0 ? null : art[best];
      };
      const size = 1.002 / set.grid;
      const rock = (x: number, y: number): boolean =>
        x < 0 || y < 0 || x >= grid.width || y >= grid.height || grid.at(x, y) === WALL;
      for (let y = -EDGE; y < grid.height + EDGE; y++) {
        for (let x = -EDGE; x < grid.width + EDGE; x++) {
          const texture = pick(x, y);
          if (!texture) continue;
          const sprite = new Sprite(texture);
          sprite.x = x;
          sprite.y = y;
          sprite.scale.set(size);
          (rock(x, y) ? wallLayer : groundLayer).addChild(sprite);
        }
      }
    }

    // COVER first, so furniture stands ON the rubble, and nearest LAST within
    // the furniture, or a hanging body is drawn inside its own rock. Anchored
    // at the FOOT of its tile rather than the middle: a prop taller than a tile
    // grows upward out of the floor rather than sinking into it.
    const cover = map.props.filter((p) => COVER_SET.has(p.id));
    const over = map.props.filter((p) => !COVER_SET.has(p.id)).sort((a, b) => a.y - b.y);
    for (const prop of [...cover, ...over]) {
      const art = PROP_ART[prop.id];
      const canvas = art ? propTextures(prop.id) : null;
      if (!art || !canvas) continue;
      const sprite = new Sprite(canvas);
      sprite.anchor.set(0.5, 1);
      sprite.x = prop.x + 0.5;
      sprite.y = prop.y + 1 + (HUNG_PROPS.has(prop.id) ? FACE_HANG : 0);
      sprite.scale.set(art.tiles / canvas.width);
      if (STAIN_PROPS.has(prop.id)) sprite.alpha = STAIN_ALPHA;
      // Five pictures over a whole floor is five pictures over a whole floor,
      // so each is shifted off its own colour and its own size a little.
      if (COVER_SET.has(prop.id)) {
        const roll = tileNoise(prop.x, prop.y, 62);
        const lit = COVER_DARK - COVER_TINT * roll;
        const warm = Math.round(lit * 255);
        const cool = Math.round(lit * (1 - 0.12 * tileNoise(prop.x, prop.y, 63)) * 255);
        sprite.tint = (warm << 16) | (warm << 8) | cool;
        sprite.scale.set(sprite.scale.x * (0.82 + roll * 0.36));
        sprite.alpha = COVER_ALPHA;
      }
      // What grows ON the rock rides the rock's own layer, drawn after its tiles.
      (map.grid.at(prop.x, prop.y) === WALL ? wallLayer : groundLayer).addChild(sprite);
    }

    // THE WAY DOWN, over the floor it is cut into and CENTRED on its tile
    // rather than stood on it: a hole is a thing the ground is missing, so it
    // has no foot to hang from the way a prop does.
    const mouthId = MOUTH_ART[map.theme];
    const mouthArt = mouthId ? PROP_ART[mouthId] : null;
    const mouthTex = mouthArt ? propTextures(mouthId) : null;
    if (mouthArt && mouthTex) {
      // A SCENE's exit IS its entrance, so the pair can be one tile.
      const holes = map.exit.x === map.entrance.x && map.exit.y === map.entrance.y ? [map.entrance] : [map.entrance, map.exit];
      for (const at of holes) {
        const sprite = new Sprite(mouthTex);
        sprite.anchor.set(0.5, 0.5);
        sprite.x = at.x + 0.5;
        sprite.y = at.y + 0.5;
        sprite.scale.set(mouthArt.tiles / mouthTex.width);
        groundLayer.addChild(sprite);
      }
    }
  }


  /** Built once per map, in tile units, then moved by the camera. */
  function buildMap(map: GameMap): void {
    const { grid } = map;
    mapLayer.clear();

    // A BARE map draws no ground at all — the room is black and holds only its
    // props. The zone's own rock keeps `rockDeep` behind it, because it draws
    // only the band you could see from a room and black behind THAT is a
    // chamber floating in nothing.
    const bare = !!map.bare;
    buildProps(map);
    // A hole reads by CONTRAST, and a generated ground is PALE where every
    // hand-drawn zone is dark — so the rim that stood out on stone is a white
    // box on sand. `mouth` keeps its shape and takes darker inks instead: the
    // three rings run mid, deep, then the void itself.
    const hole = {
      ...floorPalette(palette, map.vein, map.theme),
      glint: palette.rock,
      rockShade: palette.rockDeep,
      shade: palette.void,
    };
    app.renderer.background.color = bare ? 0x000000 : toHexNumber(palette.rockDeep);
    const floor = floorPalette(palette, map.vein, map.theme);
    const at = (gx: number, gy: number) => grid.at(gx, gy);

    // Same grouping as the decals below: the floor's grain gives many tiles
    // the same colour, so one fill per tile is mostly wasted batches.
    const floors = new Map<string, number[][]>();
    for (let y = 0; y < grid.height && !bare; y++) {
      for (let x = 0; x < grid.width; x++) {
        const tile = grid.at(x, y);
        // Rock gets drawn too now, but only the band you could see from a
        // room — everything past it is already this colour behind the map.
        if (tile === WALL && !isWallFace(at, x, y)) continue;
        const colour = floorColour(floor, tile, x, y);
        let rects = floors.get(colour);
        if (!rects) floors.set(colour, (rects = []));
        // Slight overdraw closes hairline seams between adjacent tiles.
        rects.push([x - 0.01, y - 0.01, 1.02, 1.02]);
      }
    }
    for (const [colour, rects] of floors) {
      for (const [rx, ry, rw, rh] of rects) mapLayer.rect(rx, ry, rw, rh);
      mapLayer.fill(toHexNumber(colour));
    }

    // Flagstones, rubble, mineral and the lit lip under a wall. Built once per
    // map alongside the floor, so the cost lands on entering a descent rather
    // than on every frame of one.
    //
    // Grouped by colour before drawing. Graphics batches whatever paths are
    // pending when fill() is called, so a fill PER RECTANGLE is ten thousand
    // batches and a third of a second of hitch on the click that starts a
    // run; there are only a handful of distinct decal colours, so grouping
    // turns that into a handful of fills.
    const batches = new Map<string, { colour: number; alpha: number; rects: number[][] }>();
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        // A bare map draws none of the zone's decals — except the two
        // LANDMARKS, which are how you find the way on and the way out.
        const tile = grid.at(x, y);
        if (bare && tile !== ENTRANCE && tile !== EXIT) continue;
            if (MOUTH_ART[map.theme] && (tile === ENTRANCE || tile === EXIT)) continue;
        for (const d of tileDecals(bare ? hole : floor, at, x, y)) {
          const key = `${d.colour}|${d.alpha}`;
          let batch = batches.get(key);
          if (!batch) {
            batch = { colour: toHexNumber(d.colour), alpha: d.alpha, rects: [] };
            batches.set(key, batch);
          }
          batch.rects.push([x + d.x, y + d.y, d.w, d.h]);
        }
      }
    }
    for (const batch of batches.values()) {
      for (const [rx, ry, rw, rh] of batch.rects) mapLayer.rect(rx, ry, rw, rh);
      mapLayer.fill({ color: batch.colour, alpha: batch.alpha });
    }

    // Authored furniture, over the grain of the tile it is standing on. Not
    // grouped: there are a handful in a room, against ten thousand decals. A
    // BARE map draws the generated pictures instead, and an id in both tables
    // would put a hand-drawn rectangle over one.
    for (const prop of bare ? [] : map.props) {
      for (const d of PROPS[prop.id]?.(floor, prop.x, prop.y) ?? []) {
        mapLayer
          .rect(prop.x + d.x, prop.y + d.y, d.w, d.h)
          .fill({ color: toHexNumber(d.colour), alpha: d.alpha });
      }
    }

    // The way in: a hole in the floor with a lit lip, not a coloured block.
    // seamLit is a panel violet, and on stone it read as a UI element someone
    // had dropped on the map. A bare map has no floor to cut it into.
    const e = map.entrance;
    if (!bare) {
      mapLayer
        .rect(cx(e.x) - 0.32, cy(e.y) - 0.32, 0.64, 0.64)
        .fill(toHexNumber(palette.rockDeep));
      mapLayer
        .rect(cx(e.x) - 0.38, cy(e.y) - 0.38, 0.76, 0.76)
        .stroke({ width: 0.08, color: toHexNumber(floor.rockLit), alpha: 0.9 });
    }

    // What MOVES is the zone's too, so a bare map has none of it.
    livingFloor = bare ? null : floor;
    builtMap = map;
  }

  /** Where on its own grid a body is PINNED. At the centre a sprite hangs half
   *  its height below the entity — 1.6 tiles for the Gaunt at `scale` 3.2,
   *  against the 0.9 radius the sim holds it inside the rock by — so it draws
   *  out over the void. A quarter tile proud of the foot, or the feet float. */
  const anchorY = (e: Entity): number => bodyFoot(e.sprite) - FOOT_DROP / Math.max(0.1, e.scale);

  function spriteFor(e: Entity): Sprite {
    let s = sprites.get(e.id);
    if (!s) {
      const frames = framesFor(e);
      s = new Sprite(frames[0]);
      s.anchor.set(0.5, anchorY(e));
      entityLayer.addChild(s);
      sprites.set(e.id, s);
    }
    return s;
  }

  function drawEntity(e: Entity, elapsed: number, sunk = 0): void {
    const fade = e.dead ? Math.min(1, e.deathAge / DEATH_FADE) : 0;
    if (e.dead && fade >= 1) {
      const stale = sprites.get(e.id);
      if (stale) {
        stale.destroy();
        sprites.delete(e.id);
      }
      for (const slot of HANDS_DRAWN) drop(e.id, slot);
      return;
    }

    const s = spriteFor(e);
    {
      const frames = framesFor(e);
      // A generated body has named STATES and picks among them off what it is
      // DOING — a melee swing and a cast are different animations, and which
      // one is showing is whether it has a skill to throw. A hand-drawn one
      // has the fixed walk-walk-swing it always had.
      const frame = GENERATED[e.sprite]
        ? generatedFrame(e.sprite, cel(e, elapsed))
        : e.action === 'attack'
          ? ATTACK_FRAME
          : e.action === 'move'
            ? Math.floor(elapsed * WALK_CYCLE) % WALK_FRAMES
            : 0;
      s.texture = frames[frame] ?? frames[0];
    }

    // One texture should cover roughly one tile of world, whatever grid it was
    // drawn at — a generated body is its own, not `CELL`.
    const scale = (1 / (s.texture.width || CELL)) * e.scale * (1 - fade * 0.5);
    s.scale.set(scale);

    // Crisp when MAGNIFIED, smooth when minified. Linear supersamples a body
    // drawn smaller than its own grid, which is nearly all of them; over one
    // drawn BIGGER it smears — the Gaunt is 3.2 tiles off a 96 sprite, so at
    // the default camera it lands at 2 screen pixels per art pixel and reads
    // as mush. Zooming in magnifies everything, and pixel art magnified wants
    // its pixels. The margin keeps it from flapping at exactly 1:1.
    const per = (e.scale * world.scale.x) / (s.texture.width || CELL);
    const want = per > 1.05 ? 'nearest' : 'linear';
    if (s.texture.source.scaleMode !== want) s.texture.source.scaleMode = want;
    s.alpha = (1 - fade) * (1 - sunk);
    s.rotation = fade * 1.2;

    // Lunge toward whatever it's hitting; recoil when hit. Only where there
    // are no FRAMES for it: over a real swing the transform is a second motion
    // fighting the first, and what it reads as is the model being shoved.
    let lunge = 0;
    if (e.action === 'attack' && !animates(e.sprite, cel(e, elapsed))) {
      lunge = 0.22 * (1 - through(e));
    }
    if (e.action === 'hurt') lunge = -0.12;

    s.x = cx(e.x) + Math.cos(e.facing) * lunge;
    // Down into the hole, not simply away: a figure that only faded would read
    // as a bug rather than as a climb.
    s.y = cy(e.y) + Math.sin(e.facing) * lunge + sunk * 0.8;

    // A bob under the frames, for a body with no walk of its own: a creature
    // has a frame per step and bobs on every one.
    if (e.action === 'move' && !animates(e.sprite, cel(e, elapsed))) {
      s.y -= Math.abs(Math.sin((elapsed * WALK_CYCLE - 0.5) * Math.PI)) * 0.05;
    }

    // Sprites are authored facing right; flip rather than rotate so they
    // never appear upside down.
    s.scale.x = Math.abs(s.scale.x) * (Math.cos(e.facing) < 0 ? -1 : 1);
    // A hit LIGHTENS what the phase made it: its own flat colour read as a
    // fourth phase, and burning stopped being tellable from dazed.
    const phaseTint = e === told?.on ? told.look.tint : null;
    s.tint =
      e.hitFlash > 0
        ? toHexNumber(phaseTint ? mix(phaseTint, palette.chalk, 0.65) : palette.chalk)
        : toHexNumber(phaseTint ?? '#ffffff');

    for (const slot of HANDS_DRAWN) drawHeld(e, slot, s, fade, sunk, elapsed);
  }

  const drop = (id: number, slot: HandSlot): void => {
    const stale = helds.get(`${id}:${slot}`);
    if (!stale) return;
    stale.destroy();
    helds.delete(`${id}:${slot}`);
  };

  /**
   * What is in one hand, pinned to the body it belongs to. It rides the SAME
   * anchor the body does, so a weapon cannot drift off a figure however the
   * camera moves, and it flips with the facing rather than rotating — the art
   * is authored facing east like everything else.
   */
  function drawHeld(
    e: Entity,
    slot: HandSlot,
    body: Sprite,
    fade: number,
    sunk: number,
    elapsed: number
  ): void {
    const art = slot === 'main' ? e.held : e.offhand;
    const texture = art ? heldTexture(art) : null;
    const spec = art ? HELD[art] : undefined;
    const key = `${e.id}:${slot}`;
    let h = helds.get(key);
    if (!texture || !spec) {
      drop(e.id, slot);
      return;
    }
    if (!h) {
      h = new Sprite(texture);
      // A BEHIND thing goes under its own body — a shield is on the arm you
      // cannot see, and nothing a body carries may occlude the body. The rest
      // go over it, off hand last, so a shield's own strap-arm covers nothing.
      const at = entityLayer.getChildIndex(body);
      entityLayer.addChildAt(h, spec.behind ? at : at + 1);
      helds.set(key, h);
    }
    h.texture = texture;
    h.anchor.set(spec.grip[0], spec.grip[1]);

    const facingEast = Math.cos(e.facing) >= 0;
    const hand = handAt(e.sprite, art ?? '', cel(e, elapsed));
    // Both in fractions of the BODY's grid, so one number moves a hand on
    // every trade at once — and the vertical one is measured off the same
    // anchor the body hangs from, or the two come apart as `scale` changes.
    const dx = (hand.x + (spec.reach ?? 0) - 0.5) * e.scale * (facingEast ? 1 : -1);
    const dy = (hand.y - anchorY(e)) * e.scale;
    h.x = body.x + dx;
    h.y = body.y + dy;

    const size = (1 / (texture.width || CELL)) * spec.size * (1 - fade * 0.5);
    h.scale.set(size);
    h.scale.x = Math.abs(h.scale.x) * (facingEast ? 1 : -1);
    h.rotation = (spec.turn + hand.turn) * (facingEast ? 1 : -1) + fade * 1.2;
    h.alpha = body.alpha;
    h.tint = body.tint;
    if (sunk > 0) h.y += sunk * 0.8;
  }

  /** Where the BOW is, not the shooter's tile. The sim's origin stays
   *  `use.user`: it is the ray pierce walks, so moving it would change what
   *  the shot HITS. `drawHeld`'s arithmetic, applied to the arrow. */
  function bowMuzzle(hero: Entity, elapsed: number, from: { x: number; y: number }): { x: number; y: number } {
    const spec = HELD.bow;
    if (!spec) return from;
    const hand = handAt(hero.sprite, 'bow', cel(hero, elapsed));
    const east = Math.cos(hero.facing) >= 0;
    return {
      x: from.x + (hand.x + (spec.reach ?? 0) - 0.5) * hero.scale * (east ? 1 : -1),
      y: from.y + (hand.y - anchorY(hero)) * hero.scale,
    };
  }

  function drawOverlays(state: RunState): void {
    vfxLayer.clear();
    effectsDrawn = 0;
    groundDrawn = 0;
    // Keep hairlines visible however far out we're zoomed.
    const hair = Math.max(0.05, 1 / tile);

    // DAZED: marks going round over its head, the one picture everybody
    // already reads as stunned. Over the body, because that is the point.
    if (told && told.look.swirl > 0) {
      const e = told.on;
      const colour = toHexNumber(told.look.colour);
      const head = e.scale * (anchorY(e) - bodyTop(e.sprite));
      for (const m of dazeMarks(head, e.scale, state.elapsed)) {
        vfxLayer
          .arc(cx(e.x) + m.x, cy(e.y) + m.y, m.r, m.from, m.to)
          .stroke({ color: colour, alpha: m.alpha * told.look.swirl, width: m.width, cap: 'round' });
      }
    }

    // WHAT IS ON A BODY. Over it, in the ailment's own damage colour, one
    // clutch of marks per ailment — so a burning thing looks burning without
    // anybody reading a number off a bar.
    for (const e of [state.hero, ...state.monsters]) {
      if (e.dead || e.ailments.length === 0) continue;
      const head = e.scale * (anchorY(e) - bodyTop(e.sprite));
      for (const def of AILMENTS) {
        const stacks = e.ailments.reduce((n, a) => n + (a.id === def.id ? 1 : 0), 0);
        if (stacks === 0) continue;
        const colour = toHexNumber(damageColour(palette, def.type));
        for (const m of ailmentMarks(def.id, stacks, head, e.scale, state.elapsed)) {
          vfxLayer.circle(cx(e.x) + m.x, cy(e.y) + m.y, m.r).fill({ color: colour, alpha: m.alpha });
        }
      }
    }

    /** Fire pixels, in world units. The layer is already scaled to tiles. */
    const blocks = (pixels: FirePixel[], type: string, fade: number) => {
      const shades = fireShades(palette, type);
      for (const p of pixels) {
        if (p.alpha <= 0) continue;
        vfxLayer.rect(cx(p.x), cy(p.y), p.size, p.size).fill({
          color: toHexNumber(shades[p.shade]),
          alpha: Math.min(1, Math.max(0, p.alpha * fade)),
        });
      }
    };

    // Life bars on everything alive, not just the wounded — the point is
    // seeing at a glance who is and isn't taking damage. Untouched bars are
    // dimmed so a full room doesn't shout. `notch` marks the scale every 100
    // life, heavier each 1000 — the hero's alone, or a pack is all stripes.
    const bar = (e: Entity, width: number, colour: string, notch = false) => {
      if (e.dead) return;
      const frac = Math.max(0, Math.min(1, e.life / e.stats.maxLife));
      const hurt = frac < 1;
      const h = Math.max(2 / tile, 0.11);
      const bx = cx(e.x) - width / 2;
      // Above the BODY's own head: a sprite spans `scale` tiles about the
      // anchor both this and the sprite read, and `bodyTop` is how far into
      // that the drawing starts.
      const by = cy(e.y) - e.scale * (anchorY(e) - bodyTop(e.sprite)) - h - 0.06;

      vfxLayer.rect(bx, by, width, h).fill({
        color: toHexNumber(palette.void),
        alpha: hurt ? 1 : 0.5,
      });
      vfxLayer.rect(bx, by, width * frac, h).fill({
        color: toHexNumber(colour),
        alpha: hurt ? 1 : 0.45,
      });
      // Lit along the top and shaded at the foot, so it reads as a vessel.
      vfxLayer.rect(bx, by, width * frac, h * 0.35).fill({
        color: 0xffffff,
        alpha: hurt ? 0.3 : 0.14,
      });
      vfxLayer.rect(bx, by + h * 0.75, width * frac, h * 0.25).fill({
        color: 0x000000,
        alpha: hurt ? 0.25 : 0.12,
      });
      if (!notch) return;
      for (let at = 100; at < e.stats.maxLife; at += 100) {
        const big = at % 1000 === 0;
        vfxLayer
          .rect(bx + width * (at / e.stats.maxLife) - hair / 2, big ? by : by + h * 0.35,
            big ? hair * 2 : hair, big ? h : h * 0.65)
          .fill({ color: toHexNumber(palette.void), alpha: 0.75 });
      }
    };
    for (const m of state.monsters) if (m !== state.boss) bar(m, 0.7, palette.ember);
    bar(state.hero, 1.1, palette.verdite, true);

    // Skill and impact effects. Each kind gets a different SHAPE, not just a
    // different colour — at melee range two lines are indistinguishable.
    for (const fx of state.vfx) {
      const t = Math.min(1, fx.age / fx.ttl);
      const colour = toHexNumber(vfxColour(palette, fx.kind, fx.damageType));
      const alpha = Math.max(0, 1 - t);
      const from = fx.points[0];
      if (!from) continue;
      const to = fx.points[1] ?? from;

      // POISON FALLS AND POOLS. The second point IS the radius — see
      // poisonDrops — so the pool is drawn to exactly what the sim poisoned.
      if (fx.kind === 'blight_field') {
        const radius = poisonFieldRadius(Math.hypot(to.x - from.x, to.y - from.y), t);
        const pool = vfxTexture('poison_pool');
        if (pool) {
          // Faint, because a cast lasts 10s at nearly one a second and up to
          // nine of these lie on top of each other: at any weight that reads
          // it stacks into a solid lid over the fight.
          const s = effectSprite(pool, radius * 2, true);
          s.anchor.set(0.5, 0.5);
          s.x = cx(from.x);
          s.y = cy(from.y);
          s.alpha = Math.max(0, 0.62 * (1 - t * t));
        }

        // Globs coming DOWN into it. Stretched along the fall and squashed as
        // they land, which is the whole of what makes it rain rather than
        // pictures blinking on over a puddle.
        const glob = vfxTexture('poison_drop');
        for (const d of poisonDrops(from.x, from.y, radius, t)) {
          if (d.alpha <= 0 || !glob) continue;
          const g = effectSprite(glob, d.r * 5);
          g.anchor.set(0.5, 1);
          g.scale.y *= 1 + (1 - d.fall) * 0.7;
          g.scale.x *= 1 - (1 - d.fall) * 0.25;
          g.x = cx(d.x);
          g.y = cy(d.y);
          g.alpha = Math.min(1, d.alpha);
        }
        continue;
      }

      if (fx.kind === 'burst') {
        // Second point carries the radius, same contract as the poison field.
        const radius = Math.hypot(to.x - from.x, to.y - from.y);
        // Dark, not tinted: a translucent flame-coloured disc muddies the floor.
        vfxLayer
          .circle(cx(from.x), cy(from.y), burstRadius(radius, t))
          .fill({ color: toHexNumber(palette.void), alpha: Math.max(0, 0.3 * (1 - t)) });
        blocks(fireBurst(from, radius, t), fx.damageType, 1);
        continue;
      }

      if (fx.kind === 'flame') {
        blocks(fireBolt(from, to, t), fx.damageType, 1 - t);
        continue;
      }

      if (fx.kind === 'arc') {
        blocks(lightningArc(from, to, t), fx.damageType, 1);
        continue;
      }

      if (fx.kind === 'sweep') {
        // Second point carries the radius, same contract as the burst.
        blocks(sweepRing(from, Math.hypot(to.x - from.x, to.y - from.y), t), fx.damageType, 1);
        continue;
      }

      // THREE points, and the last two are the wedge's own rim corners.
      if (fx.kind === 'wedge' && fx.points[2]) {
        blocks(coneWedge(from, to, fx.points[2], t), fx.damageType, 1);
        continue;
      }

      if (fx.kind === 'slash') {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const sweep = Math.PI * 0.75;
        const start = angle - sweep / 2 + sweep * t;
        const radius = 0.95;
        // arc() continues the current path, exactly like Canvas2D — without
        // moving to its start first it draws a line from the path origin out
        // to the arc, which reads as a stray beam fired at the map corner.
        vfxLayer
          .moveTo(cx(from.x) + Math.cos(start) * radius, cy(from.y) + Math.sin(start) * radius)
          .arc(cx(from.x), cy(from.y), radius, start, start + sweep * 0.45)
          .stroke({ width: Math.max(hair, 0.18), color: colour, alpha });
        continue;
      }

      if (fx.kind === 'bolt') {
        blocks(fireBolt(from, to, t), fx.damageType, 1);
        continue;
      }

      if (fx.kind === 'shard') {
        blocks(frostShard(from, to, t), fx.damageType, 1);
        continue;
      }

      // THE ARROW, and nothing wrapped round it: it is pinned by its HEAD,
      // which the import left at the right edge of its own frame, and mirrored
      // rather than turned over when it flies west — an arrow rotated past
      // vertical is an arrow lit from underneath.
      if (fx.kind === 'arrow') {
        const flight = arrowFlight(bowMuzzle(state.hero, state.elapsed, from), to, t);
        const texture = flight.alpha > 0 ? vfxTexture('arrow') : null;
        if (texture) {
          const s = effectSprite(texture, ARROW_SPAN);
          s.anchor.set(1, 0.5);
          s.rotation = flight.angle;
          s.scale.y *= Math.abs(flight.angle) > Math.PI / 2 ? -1 : 1;
          s.x = flight.x;
          s.y = flight.y;
          s.alpha = flight.alpha;
        }
        continue;
      }

      // THE STORM: a cloud a long way over what was hit, and bolts down out of
      // it. The first point is the VICTIM — the height is the drawing's.
      if (fx.kind === 'storm') {
        const cloud = stormCloud(from, t);
        const texture = cloud.alpha > 0 ? vfxTexture('storm') : null;
        if (texture) {
          const s = effectSprite(texture, cloud.span);
          s.anchor.set(0.5);
          s.x = cloud.x;
          s.y = cloud.y;
          s.alpha = cloud.alpha;
        }
        blocks(stormBolts(from, t), fx.damageType, 1);
        continue;
      }

      if (fx.points.length >= 2) {
        vfxLayer.moveTo(cx(from.x), cy(from.y));
        for (const p of fx.points.slice(1)) vfxLayer.lineTo(cx(p.x), cy(p.y));
        vfxLayer.stroke({ width: Math.max(hair, 0.09), color: colour, alpha });
      } else {
        blocks(fireSparks(from, t), fx.damageType, 1);
      }
    }
    for (let i = effectsDrawn; i < effectArt.length; i++) effectArt[i].visible = false;
    for (let i = groundDrawn; i < groundArt.length; i++) groundArt[i].visible = false;
  }

  /** Damage numbers live in screen space so zooming doesn't blur them. */
  function drawFloaters(state: RunState): void {
    state.floaters.forEach((f, i) => {
      let label = floaters[i];
      if (!label) {
        label = new Text({
          text: '',
          style: { fontFamily: 'monospace', fontSize: 16, fill: 0xffffff },
        });
        label.anchor.set(0.5);
        textLayer.addChild(label);
        floaters[i] = label;
      }
      const t = f.age / FLOATER_LIFE;
      label.visible = true;
      label.text = f.text;
      // A TICK is smaller and wears its ailment's colour, so a stream of them
      // reads as the poison working rather than as the swing landing.
      const ticked = f.tick ? AILMENT_BY_ID[f.tick] : undefined;
      const size = f.crit ? 0.75 : ticked ? 0.42 : 0.6;
      label.style.fontSize = Math.max(9, Math.min(28, tile * size));
      label.style.fill = toHexNumber(
        ticked
          ? damageColour(palette, ticked.type)
          : f.on === 'hero'
            ? palette.ember
            : f.crit
              ? palette.citrine
              : palette.chalk
      );
      label.alpha = Math.max(0, 1 - t);
      label.x = sx(f.x);
      label.y = sy(f.y) - tile * (0.5 + t * 1.2);
    });
    for (let i = state.floaters.length; i < floaters.length; i++) {
      floaters[i].visible = false;
    }
  }

  /**
   * The zone's moving parts. Only what is on screen: a whole map of tendrils
   * every frame is most of a frame spent on rock nobody can see.
   */
  function drawProps(state: RunState): void {
    propLayer.clear();
    const floor = livingFloor;
    if (!floor) return;
    const { grid } = state.map;
    const at = (gx: number, gy: number) => grid.at(gx, gy);
    const tile = world.scale.x;
    const x0 = Math.max(0, Math.floor(-world.position.x / tile));
    const y0 = Math.max(0, Math.floor(-world.position.y / tile));
    const x1 = Math.min(grid.width, Math.ceil((viewW() - world.position.x) / tile) + 1);
    const y1 = Math.min(grid.height, Math.ceil((viewH() - world.position.y) / tile) + 1);

    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        for (const d of livingDecals(floor, at, x, y, state.elapsed)) {
          propLayer
            .rect(x + d.x, y + d.y, d.w, d.h)
            .fill({ color: toHexNumber(d.colour), alpha: d.alpha });
        }
      }
    }
  }

  /** In tile units, like everything else in the world container. */
  function drawAuras(state: RunState): void {
    auraLayer.clear();
    // THE FALL, on the floor and under the bodies: it fills as its fuse burns
    // down, so how long you have left is the picture rather than a number.
    for (const ring of state.circles) {
      const gone = 1 - Math.max(0, ring.fuse) / Math.max(0.01, ring.of);
      const colour = toHexNumber(palette.ember);
      auraLayer.circle(ring.x, ring.y, ring.r).fill({ color: colour, alpha: 0.1 + gone * 0.28 });
      auraLayer.circle(ring.x, ring.y, ring.r * gone).fill({ color: colour, alpha: 0.22 });
      auraLayer.circle(ring.x, ring.y, ring.r).stroke({ color: colour, alpha: 0.9, width: 0.09 });
    }
    for (const m of state.monsters) {
      if (m.dead || !m.aura) continue;
      const def = AURA_BY_ID[m.aura];
      if (!def) continue;
      const look = auraLook(palette, def);
      const colour = toHexNumber(look.colour);
      auraLayer.circle(m.x, m.y, AURA.radius).fill({ color: colour, alpha: look.alpha });
      auraLayer
        .circle(m.x, m.y, AURA.radius)
        .stroke({ color: colour, alpha: Math.min(1, look.alpha * 2.5), width: 0.04 });
    }
  }

  function draw(state: RunState, emerge = 1): void {
    if (state.map !== builtMap) {
      // New run: drop every sprite, the ids belong to a dead sim.
      for (const s of sprites.values()) s.destroy();
      sprites.clear();
      buildMap(state.map);
    }

    const look = bossTelegraph(palette, state.phase, state.elapsed);
    const boss = state.boss;
    told = look && boss && !boss.dead ? { on: boss, look } : null;

    camera(state.map, state.hero);
    drawProps(state);
    drawAuras(state);

    for (const m of state.monsters) {
      if (!m.dead || m.deathAge < DEATH_FADE) drawEntity(m, state.elapsed);
    }
    // Never monsters and never in the monster list, so they are drawn apart.
    for (const f of state.folk) drawEntity(f, state.elapsed);
    if (!state.hero.dead) drawEntity(state.hero, state.elapsed, 1 - emerge);

    drawOverlays(state);
    drawFloaters(state);
    app.render();
  }

  function resize(width: number, height: number): void {
    app.renderer.resize(Math.max(1, width), Math.max(1, height));
    if (builtMap) camera(builtMap);
  }

  function setZoom(next: number, on?: { x: number; y: number }): void {
    const was = zoom;
    zoom = clampZoom(next);
    // Keep the world point under the cursor under the cursor — but only once
    // a DRAG has taken the camera. Leaning in while following the hero should
    // never be the thing that loses them.
    if (looking && on && tile > 0 && zoom !== was && zoom > ZOOM_MIN) {
      const world = { x: at.x + on.x / tile, y: at.y + on.y / tile };
      const fit = builtMap
        ? Math.min(viewW() / builtMap.grid.width, viewH() / builtMap.grid.height)
        : tile;
      const next2 = tileSize(zoom, fit);
      looking = { x: world.x - on.x / next2, y: world.y - on.y / next2 };
    }
    if (builtMap) camera(builtMap);
  }

  const screenAt = (v: { x: number; y: number }) => ({ x: sx(v.x), y: sy(v.y) });

  /** Point at a tile. Same state a drag writes, so `follow()` undoes it. */
  function lookAt(spot: { x: number; y: number }): void {
    looking = { x: spot.x, y: spot.y };
  }

  function panBy(dx: number, dy: number): void {
    if (tile <= 0) return;
    looking = { x: at.x - dx / tile, y: at.y - dy / tile };
    if (builtMap) camera(builtMap);
  }

  function follow(): void {
    looking = null;
    if (builtMap) camera(builtMap);
  }

  function destroy(): void {
    app.destroy(true, { children: true });
  }

  return { resize, draw, setZoom, panBy, lookAt, follow, screenAt, destroy };
}
