/**
 * WebGL renderer, built on PixiJS.
 *
 * Same Renderer interface as canvas2d — the sim can't tell them apart. This
 * one draws actual sprites with animation, batches on the GPU, and is what a
 * real art pass plugs into: replace makeSheet() in sprites.ts with a loader
 * and nothing in this file changes.
 *
 * Everything geometric lives inside a `world` container measured in TILE
 * units, and the camera is that container's transform. This is what makes
 * zooming and following cheap: the map is built once and then moved, rather
 * than 2,000 rectangles being redrawn at new pixel coordinates every frame.
 * Text is the exception — it sits in screen space so it stays crisp instead
 * of being scaled up into a blur.
 *
 * Construction is async (Pixi 8 initialises the GPU device asynchronously) and
 * can fail — no WebGL, headless, a hostile driver. It returns null in that
 * case and the caller falls back to canvas2d.
 */
import { Application, Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import { AURA, AURA_BY_ID } from '../data';
import { WALL } from '../sim/grid';
import { tileNoise } from '../noise';
import { ATTACK_POSE, DEATH_FADE } from '../sim/run';
import type { Entity, RunState } from '../sim/run';
import type { GameMap } from '../sim/grid';
import type { FirePixel, Palette, Renderer } from './renderer';
import {
  auraLook,
  burstRadius,
  clampOffset,
  fireBolt,
  frostShard,
  lightningArc,
  sweepRing,
  fireBurst,
  fireShades,
  fireSparks,
  clampZoom,
  floorColour,
  floorPalette,
  isWallFace,
  poisonDrops,
  poisonFieldRadius,
  livingDecals,
  PROPS,
  tileDecals,
  tileSize,
  toHexNumber,
  vfxColour,
  wangCorners,
  ZOOM_MIN,
} from './renderer';
import {
  ATTACK_FRAME,
  CELL,
  WALK_CYCLE,
  WALK_FRAMES,
  castsVisibly,
  generatedFrame,
  makeLookFrames,
  makeProp,
  makeSheet,
  makeTiles,
  rankedKey,
} from './sprites';
import { PROP_ART } from './generated-props';
import { GENERATED } from './generated-art';
import type { MonsterRank } from './bestiary';
import { CAST_POSES, POSE_IDS, SWING_POSES, WALK_POSES } from './pose';
import { SKILL_BY_ID } from '../data';
import { lookKey } from './look';
import type { PoseId } from './pose';

const FLOATER_LIFE = 1.1;

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
        // 256 into 87 device pixels at the default camera. Downscaling with
        // nearest drops rows and shimmers as a body moves; linear supersamples,
        // which is the whole reason to author above what the screen shows.
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
  /** A generated tileset, when a map names one. Under everything, and empty on
   *  every map that does not — which is every map a player ever runs. */
  const groundLayer = new Container();
  const mapLayer = new Graphics();
  // What the zone does rather than what it is: redrawn every frame, over the
  // map that was built once.
  const propLayer = new Graphics();
  // Under the bodies: an aura is a field on the floor, not a badge on a monster.
  const auraLayer = new Graphics();
  const vfxLayer = new Graphics();
  const entityLayer = new Container();
  const textLayer = new Container();

  world.addChild(groundLayer, mapLayer, propLayer, auraLayer, entityLayer, vfxLayer);
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

  /**
   * Hero textures per loadout. Built on demand and kept: gear changes rarely,
   * and rebuilding four 48px canvases is cheaper than carrying every
   * combination of twelve families and four slots up front.
   */
  const looks = new Map<string, Texture[]>();
  function looked(e: Entity): Texture[] | null {
    if (!e.look) return null;
    const key = lookKey(e.look);
    const held = looks.get(key);
    if (held) return held;
    const frames = makeLookFrames(palette, e.look);
    if (!frames) return null;
    const made = frames.map((canvas) => {
      const texture = Texture.from(canvas);
      texture.source.scaleMode = 'linear';
      return texture;
    });
    looks.set(key, made);
    return made;
  }

  /** How far through its own swing, 0 to 1. */
  const through = (e: Entity): number =>
    Math.max(0, Math.min(1, 1 - e.actionTimer / ATTACK_POSE));

  /** Casting is an attack with a SPELL, which both the doll and a generated
   *  body read — one asks for a pose and the other for an animation. */
  const casting = (e: Entity): boolean =>
    e.skillId ? (SKILL_BY_ID[e.skillId]?.tags.includes('spell') ?? false) : false;

  /** What the figure is doing, as a pose. */
  function poseOf(e: Entity, elapsed: number): PoseId {
    if (e.action === 'attack') {
      const swing = casting(e) ? CAST_POSES : SWING_POSES;
      return swing[Math.min(swing.length - 1, Math.floor(through(e) * swing.length))];
    }
    if (e.action !== 'move') return 'walk0';
    return WALK_POSES[Math.floor(elapsed * WALK_CYCLE) % WALK_POSES.length];
  }

  /** A creature's frames at its rank, falling back to the common ones. */
  function framesFor(e: Entity): Texture[] {
    return (
      texturesFor(e.sprite, e.rank) ??
      texturesFor(e.sprite, 'common') ??
      texturesFor('grub', 'common')!
    );
  }

  const sprites = new Map<number, Sprite>();
  const floaters: Text[] = [];

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

  const tilesets = new Map<string, Texture[][] | null>();
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

  /** A generated Wang set as textures, uploaded on first use like everything
   *  else. Null once, null for good: a name nothing draws is not an error. */
  function tilesFor(id: string): Texture[][] | null {
    const already = tilesets.get(id);
    if (already !== undefined) return already;
    const made =
      makeTiles(id)?.map((all) =>
        all.map((canvas) => {
          const texture = Texture.from(canvas);
          // NEAREST, where a body is linear: a tile is drawn at or above its
          // own size, so the sampling to protect is the enlargement rather
          // than the reduction, and linear is the blur pixel art is not.
          texture.source.scaleMode = 'nearest';
          return texture;
        })
      ) ?? null;
    tilesets.set(id, made);
    return made;
  }

  /**
   * The floor as generated art: one sprite per cell, indexed by which of its
   * four corners are floor. It REPLACES the zone's own rock and its decals —
   * a tileset is the whole surface, and masonry with the Fissure's flagstones
   * stamped over it is two floors at once.
   */
  function buildGround(map: GameMap): boolean {
    groundLayer.removeChildren().forEach((child) => child.destroy());
    const textures = map.ground ? tilesFor(map.ground) : null;
    if (!textures) return false;

    const { grid } = map;
    const at = (gx: number, gy: number) => grid.at(gx, gy);
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const mask = wangCorners(at, x, y);
        // A Wang set has ONE picture per corner combination, so an open floor
        // is that picture in every cell of it and reads as graph paper. Two
        // things break it up, and neither invents geometry: an ALTERNATE off a
        // second set of the same terrain, and — for the two UNIFORM masks,
        // which carry no direction at all — turning and mirroring. No other
        // mask may turn: rotating one makes a tile for a DIFFERENT mask.
        const alt = textures[mask];
        const sprite = new Sprite(alt[Math.floor(tileNoise(x, y, 59) * alt.length) % alt.length]);
        // One texture across exactly one tile, and a hair over to close seams.
        const size = 1.01 / alt[0].width;
        const spun = mask === 0 || mask === 15 ? Math.floor(tileNoise(x, y, 61) * 8) : 0;
        sprite.anchor.set(0.5);
        sprite.x = x + 0.5;
        sprite.y = y + 0.5;
        sprite.rotation = (spun % 4) * (Math.PI / 2);
        sprite.scale.set(spun >= 4 ? -size : size, size);
        groundLayer.addChild(sprite);
      }
    }
    // Furniture, over the ground it stands on. Anchored at the FOOT of its
    // tile rather than at the middle: a prop taller than one tile has to grow
    // upward out of the floor, or it looks like it is sinking into it.
    for (const prop of map.props) {
      const art = PROP_ART[prop.id];
      const canvas = art ? propTextures(prop.id) : null;
      if (!art || !canvas) continue;
      const sprite = new Sprite(canvas);
      sprite.anchor.set(0.5, 1);
      sprite.x = prop.x + 0.5;
      sprite.y = prop.y + 1;
      sprite.scale.set(art.tiles / canvas.width);
      groundLayer.addChild(sprite);
    }
    return true;
  }

  /** Built once per map, in tile units, then moved by the camera. */
  function buildMap(map: GameMap): void {
    const { grid } = map;
    mapLayer.clear();

    // A tileset is the WHOLE surface, so the zone's own rock and its decals
    // both stand down for one: masonry with the Fissure's flagstones stamped
    // over it is two floors at once.
    const generated = buildGround(map);
    const floor = floorPalette(palette, map.vein, map.theme);
    const at = (gx: number, gy: number) => grid.at(gx, gy);

    // Same grouping as the decals below: the floor's grain gives many tiles
    // the same colour, so one fill per tile is mostly wasted batches.
    const floors = new Map<string, number[][]>();
    for (let y = 0; y < grid.height && !generated; y++) {
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
    for (let y = 0; y < grid.height && !generated; y++) {
      for (let x = 0; x < grid.width; x++) {
        for (const d of tileDecals(floor, at, x, y)) {
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
    // grouped: there are a handful in a room, against ten thousand decals.
    for (const prop of map.props) {
      for (const d of PROPS[prop.id]?.(floor, prop.x, prop.y) ?? []) {
        mapLayer
          .rect(prop.x + d.x, prop.y + d.y, d.w, d.h)
          .fill({ color: toHexNumber(d.colour), alpha: d.alpha });
      }
    }

    // The way in: a hole in the floor with a lit lip, not a coloured block.
    // seamLit is a panel violet, and on stone it read as a UI element someone
    // had dropped on the map. Not over a generated floor, where the hole
    // belongs to the tileset and this reads as a slab dropped on it.
    const e = map.entrance;
    if (!generated) {
      mapLayer
        .rect(cx(e.x) - 0.32, cy(e.y) - 0.32, 0.64, 0.64)
        .fill(toHexNumber(palette.rockDeep));
      mapLayer
        .rect(cx(e.x) - 0.38, cy(e.y) - 0.38, 0.76, 0.76)
        .stroke({ width: 0.08, color: toHexNumber(floor.rockLit), alpha: 0.9 });
    }

    // What MOVES is the zone's too, so a generated floor has none of it.
    livingFloor = generated ? null : floor;
    builtMap = map;
  }

  function spriteFor(e: Entity): Sprite {
    let s = sprites.get(e.id);
    if (!s) {
      const frames = framesFor(e);
      s = new Sprite(frames[0]);
      s.anchor.set(0.5);
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
      return;
    }

    const s = spriteFor(e);
    // A layered figure has a frame per POSE; everything else has a walk cycle
    // that only advances while it is actually moving.
    const worn = looked(e);
    if (worn) {
      s.texture = worn[POSE_IDS.indexOf(poseOf(e, elapsed))] ?? worn[0];
    } else {
      const frames = framesFor(e);
      // A generated body has named STATES and picks among them off what it is
      // DOING — a melee swing and a cast are different animations, and which
      // one is showing is whether it has a skill to throw. A hand-drawn one
      // has the fixed walk-walk-swing it always had.
      const frame = GENERATED[e.sprite]
        ? generatedFrame(e.sprite, e.action, through(e), elapsed, e.skillId, e.facing, casting(e))
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
    s.alpha = (1 - fade) * (1 - sunk);
    s.rotation = fade * 1.2;

    // Lunge toward whatever it's hitting; recoil when hit.
    let lunge = 0;
    if (e.action === 'attack') lunge = 0.22 * (1 - through(e));
    if (e.action === 'hurt') lunge = -0.12;

    s.x = cx(e.x) + Math.cos(e.facing) * lunge;
    // Down into the hole, not simply away: a figure that only faded would read
    // as a bug rather than as a climb.
    s.y = cy(e.y) + Math.sin(e.facing) * lunge + sunk * 0.8;

    // A bob under the frames. The doll rises on its two PASS frames, so its
    // bob runs at half the frame rate or the two fight each other; a creature
    // has a frame per step and bobs on every one.
    if (e.action === 'move') {
      const beat = worn ? 0.5 : 1;
      s.y -= Math.abs(Math.sin((elapsed * WALK_CYCLE - 0.5) * beat * Math.PI)) * 0.05;
    }

    // Sprites are authored facing right; flip rather than rotate so they
    // never appear upside down.
    s.scale.x = Math.abs(s.scale.x) * (Math.cos(e.facing) < 0 ? -1 : 1);
    s.tint = e.hitFlash > 0 ? toHexNumber(palette.chalk) : 0xffffff;
  }

  function drawOverlays(state: RunState): void {
    vfxLayer.clear();
    // Keep hairlines visible however far out we're zoomed.
    const hair = Math.max(0.05, 1 / tile);

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
    // dimmed so a full room doesn't shout.
    const bar = (e: Entity, width: number, colour: string) => {
      if (e.dead) return;
      const frac = Math.max(0, Math.min(1, e.life / e.stats.maxLife));
      const hurt = frac < 1;
      const h = Math.max(2 / tile, 0.11);
      const bx = cx(e.x) - width / 2;
      const by = cy(e.y) - 0.75;

      vfxLayer.rect(bx, by, width, h).fill({
        color: toHexNumber(palette.void),
        alpha: hurt ? 1 : 0.5,
      });
      vfxLayer.rect(bx, by, width * frac, h).fill({
        color: toHexNumber(colour),
        alpha: hurt ? 1 : 0.45,
      });
    };
    for (const m of state.monsters) bar(m, 0.7, palette.ember);
    bar(state.hero, 1.1, palette.verdite);

    // A pip for a body that shoots and does not LOOK like it — see
    // `castsVisibly`, which is what a caster of its own is for.
    for (const m of state.monsters) {
      if (m.dead || !m.skillId || castsVisibly(m.sprite, m.skillId)) continue;
      vfxLayer
        .circle(cx(m.x), cy(m.y) - 0.55, 0.11)
        .fill(toHexNumber(palette.amethyst));
    }

    // Skill and impact effects. Each kind gets a different SHAPE, not just a
    // different colour — at melee range two lines are indistinguishable.
    for (const fx of state.vfx) {
      const t = Math.min(1, fx.age / fx.ttl);
      const colour = toHexNumber(vfxColour(palette, fx.kind, fx.damageType));
      const alpha = Math.max(0, 1 - t);
      const from = fx.points[0];
      if (!from) continue;
      const to = fx.points[1] ?? from;

      if (fx.kind === 'blight_field') {
        // The second point IS the radius — see poisonDrops. Drawing anything
        // else here would be lying about what the sim poisoned.
        const radius = poisonFieldRadius(Math.hypot(to.x - from.x, to.y - from.y), t);

        vfxLayer
          .circle(cx(from.x), cy(from.y), radius)
          .fill({ color: colour, alpha: Math.max(0, 0.22 * (1 - t)) });
        // The rim has to stay legible as the circle grows, so it outlives the
        // fill rather than fading with it.
        vfxLayer
          .circle(cx(from.x), cy(from.y), radius)
          .stroke({
            width: Math.max(hair, 0.07),
            color: colour,
            alpha: Math.max(0, 0.85 * (1 - t * 0.55)),
          });

        for (const d of poisonDrops(from.x, from.y, radius, t)) {
          if (d.alpha <= 0) continue;
          vfxLayer
            .circle(cx(d.x), cy(d.y), d.r)
            .fill({ color: colour, alpha: Math.min(1, d.alpha) });
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

      if (fx.points.length >= 2) {
        vfxLayer.moveTo(cx(from.x), cy(from.y));
        for (const p of fx.points.slice(1)) vfxLayer.lineTo(cx(p.x), cy(p.y));
        vfxLayer.stroke({ width: Math.max(hair, 0.09), color: colour, alpha });
      } else {
        blocks(fireSparks(from, t), fx.damageType, 1);
      }
    }
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
      label.style.fontSize = Math.max(10, Math.min(28, tile * (f.crit ? 0.75 : 0.6)));
      label.style.fill = toHexNumber(
        f.on === 'hero' ? palette.ember : f.crit ? palette.citrine : palette.chalk
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

  return { resize, draw, setZoom, panBy, follow, screenAt, destroy };
}
