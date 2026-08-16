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

/** The image, as a nested SVG the caller positions. The GENERATED icon wins
 *  (`wn_*` in the icons table); the grid glyphs below are the fallback, built
 *  by hand rather than `gridIcon`, whose rounded height is 0 in a web
 *  measured in TILES. */
export function nodeGlyph(node: SkillNodeDef, size: number): SVGSVGElement {
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
