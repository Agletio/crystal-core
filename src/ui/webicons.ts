/**
 * The small image inside a web node's frame, picked off what the node SAYS.
 *
 * A glyph is decoration keyed by the node's own words — name, description,
 * stat names, grant keys — so it cannot lie about a mechanic the tooltip does
 * not already state. Notables get the most specific match; a minor that
 * matches nothing gets a pebble, which is what "a little more generic" means.
 */
import type { SkillNodeDef } from '../skills-tree';
import { drawn } from './icons';
import { GENERATED_ICONS } from '../render/generated-icons';

const NS = 'http://www.w3.org/2000/svg';

const GLYPHS: Record<string, string[]> = {
  flame: [
    '.....#.....',
    '....##.....',
    '....###....',
    '...####....',
    '..##+###...',
    '..#+++##...',
    '.##++++##..',
    '.##++++##..',
    '..##++##...',
    '...####....',
  ],
  frost: [
    '.....#.....',
    '..#..#..#..',
    '...#.#.#...',
    '....###....',
    '.#########.',
    '....###....',
    '...#.#.#...',
    '..#..#..#..',
    '.....#.....',
    '...........',
  ],
  bolt: [
    '......##...',
    '.....##....',
    '....##.....',
    '...#####...',
    '......##...',
    '.....##....',
    '....##.....',
    '...##......',
    '..##.......',
    '...........',
  ],
  skull: [
    '...#####...',
    '..#######..',
    '..#+###+#..',
    '..#+###+#..',
    '..#######..',
    '...#####...',
    '...#.#.#...',
    '...........',
    '...........',
    '...........',
  ],
  star: [
    '.....#.....',
    '.....#.....',
    '..#..#..#..',
    '...#####...',
    '.#########.',
    '...#####...',
    '..#..#..#..',
    '.....#.....',
    '.....#.....',
    '...........',
  ],
  droplet: [
    '.....#.....',
    '....###....',
    '....###....',
    '...#####...',
    '..#######..',
    '..##+####..',
    '..##+####..',
    '...#####...',
    '....###....',
    '...........',
  ],
  heart: [
    '..##...##..',
    '.####.####.',
    '###########',
    '###########',
    '.#########.',
    '..#######..',
    '...#####...',
    '....###....',
    '.....#.....',
    '...........',
  ],
  arrow: [
    '.....#.....',
    '....###....',
    '...##.##...',
    '..##.#.##..',
    '.....#.....',
    '.....#.....',
    '.....#.....',
    '.....#.....',
    '....###....',
    '.....#.....',
  ],
  burst: [
    '....###....',
    '..##...##..',
    '.#..###..#.',
    '.#.#+++#.#.',
    '#..#+++#..#',
    '.#.#+++#.#.',
    '.#..###..#.',
    '..##...##..',
    '....###....',
    '...........',
  ],
  wing: [
    '...........',
    '.#.........',
    '.##........',
    '.###.......',
    '..####.....',
    '...#####...',
    '....######.',
    '..#####....',
    '.####......',
    '...........',
  ],
  shield: [
    '.#########.',
    '.#+++++++#.',
    '.#+#####+#.',
    '.#+#####+#.',
    '.#+#####+#.',
    '..#+###+#..',
    '..#+###+#..',
    '...#+#+#...',
    '....#+#....',
    '.....#.....',
  ],
  hourglass: [
    '.#########.',
    '..#.....#..',
    '...#...#...',
    '....#.#....',
    '.....#.....',
    '....#.#....',
    '...#...#...',
    '..#.....#..',
    '.#########.',
    '...........',
  ],
  orb: [
    '....###....',
    '..#######..',
    '.####+####.',
    '.###+++###.',
    '.####+####.',
    '..#######..',
    '....###....',
    '...........',
    '...........',
    '...........',
  ],
  sword: [
    '.....#.....',
    '....###....',
    '....###....',
    '....###....',
    '....###....',
    '....###....',
    '..#######..',
    '.....#.....',
    '....###....',
    '.....#.....',
  ],
  pebble: [
    '...........',
    '...........',
    '...........',
    '....###....',
    '...#####...',
    '...#####...',
    '....###....',
    '...........',
    '...........',
    '...........',
  ],
};

/** Most specific first: an element beats a delivery beats a plain number. */
const MATCH: [RegExp, string][] = [
  [/fire|burn|ember|cinder|ignit|scorch/, 'flame'],
  [/cold|frost|chill|freez|rime/, 'frost'],
  [/lightning|arc\b|shock|storm/, 'bolt'],
  [/poison|blight|toxi|venom|bleed|ailment/, 'skull'],
  [/crit/, 'star'],
  [/mana|thrift|clarity/, 'droplet'],
  [/life|vital/, 'heart'],
  [/projectile|arrow|volley|salvo|pierce/, 'arrow'],
  [/area|radius|splash|cloud|burst|nova|spread/, 'burst'],
  [/speed|haste|swift|quick/, 'wing'],
  [/armou?r|shield|ward|resist|defen/, 'shield'],
  [/duration|linger|lasting/, 'hourglass'],
  [/spell/, 'orb'],
  [/attack|damage|strike|blade|sword|force/, 'sword'],
];

export function glyphFor(node: SkillNodeDef): string {
  const words = [
    node.name,
    node.description,
    ...(node.stats ?? []).map((s) => s.stat),
    ...Object.keys(node.grants ?? {}),
    ...(node.choices ?? []).flatMap((c) => [c.name, ...Object.keys(c.grants ?? {})]),
  ]
    .join(' ')
    .toLowerCase();
  for (const [test, glyph] of MATCH) if (test.test(words)) return glyph;
  return node.kind === 'notable' ? 'sword' : 'pebble';
}

const baked = new Map<string, string | null>();

/**
 * A generated icon as a real BITMAP, rasterised once and kept.
 *
 * Drawn the ordinary way an icon is — a `<rect>` per run of pixels — one is
 * hundreds of separate shapes, and a WEB scales them by whatever the zoom
 * happens to be. At a fractional scale the seams between two runs stop
 * meeting and the ground shows through as black lines across the picture,
 * which come and go as you zoom; a run that rounds to nothing takes a stripe
 * of the picture with it. A bitmap has no seams to open.
 */
function bakedIcon(id: string): string | null {
  const held = baked.get(id);
  if (held !== undefined) return held;
  const art = GENERATED_ICONS[id];
  const canvas = art ? document.createElement('canvas') : null;
  // No 2d context in jsdom, where the paths below are drawn instead.
  const ctx = canvas?.getContext?.('2d') ?? null;
  let url: string | null = null;
  if (art && canvas && ctx) {
    const w = Math.max(...art.rows.map((r) => r.length));
    canvas.width = w;
    canvas.height = art.rows.length;
    const image = ctx.createImageData(w, art.rows.length);
    art.rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const hex = art.key[row[x]];
        if (!hex) continue;
        const at = (y * w + x) * 4;
        image.data[at] = parseInt(hex.slice(1, 3), 16);
        image.data[at + 1] = parseInt(hex.slice(3, 5), 16);
        image.data[at + 2] = parseInt(hex.slice(5, 7), 16);
        image.data[at + 3] = 255;
      }
    });
    ctx.putImageData(image, 0, 0);
    url = canvas.toDataURL('image/png');
  }
  baked.set(id, url);
  return url;
}

/** One generated icon as an `<image>` the caller positions, or nothing. */
export function bakedArt(id: string, size: number, cls: string): SVGElement | null {
  const url = bakedIcon(id);
  const art = GENERATED_ICONS[id];
  if (!url || !art) return null;
  const w = Math.max(...art.rows.map((r) => r.length));
  const img = document.createElementNS(NS, 'image');
  img.setAttribute('href', url);
  img.setAttribute('width', String(size));
  img.setAttribute('height', String((size * art.rows.length) / w));
  img.setAttribute('aria-hidden', 'true');
  img.classList.add(cls);
  return img;
}

/** The image, as an element the caller positions. The GENERATED icon wins
 *  (`wn_*` in the icons table); the grid glyphs below are the fallback, built
 *  by hand rather than `gridIcon`, whose rounded height is 0 in a web
 *  measured in TILES. */
export function nodeGlyph(node: SkillNodeDef, size: number): SVGElement {
  const picture = bakedArt(`wn_${glyphFor(node)}`, size, 'web__node__img');
  if (picture) return picture;
  const own = drawn(`wn_${glyphFor(node)}`, size);
  if (own) {
    own.classList.add('web__node__img');
    return own;
  }
  const rows = GLYPHS[glyphFor(node)];
  const span = Math.max(...rows.map((r) => r.length));
  const svg = document.createElementNS(NS, 'svg') as SVGSVGElement;
  svg.setAttribute('viewBox', `0 0 ${span} ${rows.length}`);
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String((size * rows.length) / span));
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('web__node__img');

  const runs: Record<string, string[]> = { '#': [], '+': [] };
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === '#' || c === '+') runs[c].push(`M${x} ${y}h1v1h-1z`);
    }
  });
  for (const [mark, cls] of [
    ['#', 'sicon__ink'],
    ['+', 'sicon__lit'],
  ] as const) {
    if (runs[mark].length === 0) continue;
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', runs[mark].join(''));
    path.setAttribute('class', cls);
    svg.append(path);
  }
  return svg;
}
