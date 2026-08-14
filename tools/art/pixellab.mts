/**
 * The ONLY module that knows PixelLab's API. Swapping generators costs this
 * file and nothing else, which is why the manifest speaks in our terms —
 * a grid, a size, inks — and the translation happens here.
 *
 * Written against https://api.pixellab.ai/v1/openapi.json, read rather than
 * guessed at. Auth is a bearer token in `PIXELLAB_API_KEY`.
 */
import { encodePng } from './png.mts';

const BASE = 'https://api.pixellab.ai/v1';

/** What a row asks for, in the game's terms rather than the API's. */
export type Ask = {
  description: string;
  /** Generated square, in pixels. The converter needs a multiple of the grid. */
  size: number;
  seed?: number;
  /** Forced palette. Handed over as an image, which is the only way it takes one. */
  inks?: string[];
};

/** Appended to every description, so a row carries only its SUBJECT. The limbs
 *  clause is for the ANIMATOR: `estimate-skeleton` must find joints. */
export const HOUSE_WORDS =
  ', gothic horror creature, gaunt and menacing, filthy and weathered, caked in' +
  ' dirt and dried blood, grim adult tone, never cute, never chibi, no modern' +
  ' clothing, no tools, no props, no text, in profile facing right, full body in' +
  ' frame, limbs clearly separated and visible, dark outline, no background,' +
  ' no ground shadow, lit from above and from the front right';

/** Flat and unlit: the rank's light is added at RUNTIME, and art arriving with
 *  a glow on it makes every rank look the same. */
export const HOUSE_STYLE = {
  outline: 'single color black outline',
  shading: 'flat shading',
  detail: 'low detail',
  // The map is drawn from above. The PROMPT owns the pose and keeps a body in
  // profile so the renderer can still mirror it; this owns only the camera.
  view: 'low top-down',
  // Sprites are authored facing +x and the renderer MIRRORS rather than rotates.
  direction: 'east',
  no_background: true,
  isometric: false,
} as const;

function key(): string {
  const found = process.env.PIXELLAB_API_KEY;
  if (!found) throw new Error('PIXELLAB_API_KEY is not set');
  return found;
}

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim();
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const n = Number.parseInt(full, 16);
  return Number.isNaN(n) ? [255, 255, 255] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The inks as a 1px-tall image, which is the shape `color_image` wants. */
function paletteImage(inks: string[]): string {
  const rgba = new Uint8Array(inks.length * 4);
  inks.forEach((ink, i) => {
    const [r, g, b] = rgb(ink);
    rgba[i * 4] = r;
    rgba[i * 4 + 1] = g;
    rgba[i * 4 + 2] = b;
    rgba[i * 4 + 3] = 255;
  });
  return encodePng(inks.length, 1, rgba).toString('base64');
}

async function call(path: string, body: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${key()}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    // 402 is the one worth naming: the free tier is spent, and every later row
    // in the manifest would fail the same way.
    const why = res.status === 402 ? 'out of credit' : text.slice(0, 300);
    throw new Error(`pixellab ${path} ${res.status}: ${why}`);
  }
  return JSON.parse(text) as Record<string, unknown>;
}

/** Credit left, in USD. A free tier's generations may not show here at all. */
export async function balance(): Promise<number> {
  const res = await fetch(`${BASE}/balance`, { headers: { authorization: `Bearer ${key()}` } });
  if (!res.ok) throw new Error(`pixellab /balance ${res.status}`);
  return ((await res.json()) as { usd: number }).usd;
}

export type Point = { x: number; y: number; label: string; z_index?: number };

/** Where the joints are in a drawing, so a pose can be written against them. */
export async function estimateSkeleton(png: Buffer): Promise<Point[]> {
  const res = await call('/estimate-skeleton', {
    image: { type: 'base64', base64: png.toString('base64') },
  });
  return res.keypoints as Point[];
}

/** Three poses in, three frames out — a 3-frame window, which is exactly
 *  `CREATURE_FRAMES`. Text-driven animation is locked to 64px, so this is the
 *  only road to a moving 256 sprite. */
export async function animateSkeleton(
  reference: Buffer,
  size: number,
  poses: Point[][],
  inks?: string[]
): Promise<Buffer[]> {
  if (poses.length !== 3) throw new Error(`animate wants 3 poses, got ${poses.length}`);
  const res = await call('/animate-with-skeleton', {
    view: HOUSE_STYLE.view,
    direction: HOUSE_STYLE.direction,
    image_size: { width: size, height: size },
    reference_image: { type: 'base64', base64: reference.toString('base64') },
    // `estimate-skeleton` hands back a fractional z_index and `animate` rejects
    // one — the two ends of the same API disagree, so the round happens here.
    skeleton_keypoints: poses.map((pose) =>
      pose.map((k) => ({ ...k, z_index: Math.round(k.z_index ?? 0) }))
    ),
    ...(inks?.length ? { color_image: { type: 'base64', base64: paletteImage(inks) } } : {}),
  });
  return (res.images as Array<{ base64: string }>).map((i) => Buffer.from(i.base64, 'base64'));
}

export const COMPASS = ['east', 'south-east', 'south', 'south-west', 'west', 'north-west', 'north', 'north-east'] as const;

/** The same body turned, rather than eight bodies that resemble each other —
 *  which is why it goes through `rotate` from one reference. It takes 128 and
 *  no more, whatever the spec says, so eight ways costs half the grid. */
export async function rotateTo(from: Buffer, size: number, to: string): Promise<Buffer> {
  const res = await call('/rotate', {
    image_size: { width: size, height: size },
    from_image: { type: 'base64', base64: from.toString('base64') },
    from_view: HOUSE_STYLE.view,
    to_view: HOUSE_STYLE.view,
    from_direction: HOUSE_STYLE.direction,
    to_direction: to,
  });
  const image = res.image as { base64?: string } | undefined;
  if (!image?.base64) throw new Error('pixellab returned no rotation');
  return Buffer.from(image.base64, 'base64');
}

/** One generation. Returns PNG bytes; nothing here decides what happens to them. */
export async function generate(ask: Ask): Promise<Buffer> {
  const body: Record<string, unknown> = {
    ...HOUSE_STYLE,
    description: ask.description + HOUSE_WORDS,
    image_size: { width: ask.size, height: ask.size },
    ...(ask.seed === undefined ? {} : { seed: ask.seed }),
    ...(ask.inks?.length
      ? { color_image: { type: 'base64', base64: paletteImage(ask.inks) } }
      : {}),
  };
  const res = await call('/generate-image-pixflux', body);
  const image = res.image as { base64?: string } | undefined;
  if (!image?.base64) throw new Error('pixellab returned no image');
  return Buffer.from(image.base64, 'base64');
}
